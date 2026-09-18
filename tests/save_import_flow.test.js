const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createHarness() {
  const storage = {
    reiDaPranchetaSave: JSON.stringify({ clubeAtualId: 1, elencoAtual: [{ id: 10 }] }),
    reiDaPranchetaSaveSlots: JSON.stringify({ 0: { clubeAtualId: 1, elencoAtual: [{ id: 10 }] }, 2: { clubeAtualId: 2, elencoAtual: [{ id: 20 }] } })
  };
  const alerts = [];
  let reloads = 0;
  const appStub = { directive() { return appStub; }, controller(name, fn) { appStub.controllerFn = fn; return appStub; } };
  function AudioContextStub() {}
  AudioContextStub.prototype.createOscillator = function() { return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; };
  AudioContextStub.prototype.createGain = function() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; };
  AudioContextStub.prototype.resume = function() {};
  function FileReaderStub() {}
  FileReaderStub.prototype.readAsText = function(file) {
    this.onload({ target: { result: file.content } });
  };
  const context = {
    angular: { module() { return appStub; }, copy(value) { return JSON.parse(JSON.stringify(value)); } },
    window: {
      AudioContext: AudioContextStub,
      webkitAudioContext: AudioContextStub,
      confirm() { return true; },
      location: { reload() { reloads += 1; } },
      localStorage: {
        getItem(key) { return storage[key] === undefined ? null : storage[key]; },
        setItem(key, value) { storage[key] = String(value); },
        removeItem(key) { delete storage[key]; }
      }
    },
    document: {},
    FileReader: FileReaderStub,
    alert(message) { alerts.push(message); },
    confirm() { return true; },
    console,
    Date,
    Math,
    setTimeout,
    clearTimeout
  };
  const appPath = path.join(__dirname, '..', 'js', 'app.js');
  vm.runInNewContext(fs.readFileSync(appPath, 'utf8'), context, { filename: appPath });
  const scope = {};
  appStub.controllerFn(scope, { get() { throw new Error('Unexpected HTTP request'); } }, function() {});
  return { scope, storage, alerts, get reloads() { return reloads; } };
}

const harness = createHarness();
harness.scope.slotSaveAtual = 2;
const importado = { clubeAtualId: 3, elencoAtual: [{ id: 30 }], saveVersion: 11 };
const input = { value: 'arquivo.json', files: [{ content: JSON.stringify(importado) }] };
harness.scope.selecionarArquivoSave(input);

assert.strictEqual(harness.reloads, 1, 'a valid import should reload the game');
assert.strictEqual(JSON.parse(harness.storage.reiDaPranchetaSave).clubeAtualId, 3, 'import should replace the current save');
assert.strictEqual(JSON.parse(harness.storage.reiDaPranchetaSaveSlots)['2'].clubeAtualId, 3, 'import should replace the active slot');
assert.strictEqual(JSON.parse(harness.storage.reiDaPranchetaBackupAntesImportacao).save.clubeAtualId, 1, 'import should preserve the previous save locally');
assert.strictEqual(input.value, '', 'file input should reset after import');

const blocked = createHarness();
blocked.scope.partidaEmAndamento = true;
blocked.scope.selecionarArquivoSave({ value: 'arquivo.json', files: [{ content: JSON.stringify(importado) }] });
assert.strictEqual(blocked.reloads, 0, 'import should be blocked during a live match');
assert.ok(blocked.alerts.some((message) => message.indexOf('Finalize a partida') >= 0), 'blocked import should explain why it was refused');

console.log('save_import_flow.test.js passed');
