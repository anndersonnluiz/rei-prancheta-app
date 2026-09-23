const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createHarness() {
  const storage = {};
  const appStub = { directive() { return appStub; }, controller(name, fn) { appStub.controllerFn = fn; return appStub; } };
  function AudioContextStub() {}
  AudioContextStub.prototype.createOscillator = function() { return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; };
  AudioContextStub.prototype.createGain = function() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; };
  AudioContextStub.prototype.resume = function() {};
  const context = {
    angular: { module() { return appStub; }, copy(value) { return JSON.parse(JSON.stringify(value)); } },
    window: {
      AudioContext: AudioContextStub,
      webkitAudioContext: AudioContextStub,
      URL: { createObjectURL() { return 'blob:division'; }, revokeObjectURL() {} },
      localStorage: {
        getItem(key) { return storage[key] === undefined ? null : storage[key]; },
        setItem(key, value) { storage[key] = String(value); },
        removeItem(key) { delete storage[key]; }
      }
    },
    document: { getElementById() { return null; }, createElement() { return { click() {}, setAttribute() {} }; }, body: { appendChild() {}, removeChild() {} } },
    alert() {}, confirm() { return true; }, console, Date, Math, setTimeout, clearTimeout,
    Blob: function Blob() {}
  };
  const appPath = path.join(__dirname, '..', 'js', 'app.js');
  vm.runInNewContext(fs.readFileSync(appPath, 'utf8'), context, { filename: appPath });
  const scope = {};
  appStub.controllerFn(scope, { get() { throw new Error('Unexpected HTTP request'); } }, function() {});
  return { scope, storage };
}

const harness = createHarness();
const scope = harness.scope;
scope.clubes = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'clubes.json'), 'utf8'));
scope.jogadores = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'jogadores.json'), 'utf8'));
scope.dados.nomeTreinador = 'Persistencia de Divisoes';
scope.iniciarNovoJogo(scope.clubes.find((clube) => clube.nome === 'Flamengo'));

const palmeiras = scope.clubes.find((clube) => clube.nome === 'Palmeiras');
const fortaleza = scope.clubes.find((clube) => clube.nome === 'Fortaleza');
palmeiras.divisao = 'B';
fortaleza.divisao = 'A';
scope.salvarJogoSilencioso();

const save = JSON.parse(harness.storage.reiDaPranchetaSave);
assert.strictEqual(save.divisoesClubes[palmeiras.id], 'B', 'save should persist the relegated club division');
assert.strictEqual(save.divisoesClubes[fortaleza.id], 'A', 'save should persist the promoted club division');

scope.clubes.forEach((clube) => { clube.divisao = clube.nome === 'Palmeiras' ? 'A' : (clube.nome === 'Fortaleza' ? 'B' : clube.divisao); });
scope.saveInfo = save;
scope.carregarJogo();
assert.strictEqual(scope.clubes.find((clube) => clube.nome === 'Palmeiras').divisao, 'B', 'load should restore the relegated club division');
assert.strictEqual(scope.clubes.find((clube) => clube.nome === 'Fortaleza').divisao, 'A', 'load should restore the promoted club division');

const saveAntigo = {
  saveVersion: 11,
  clubeAtualId: 1,
  elencoAtual: [],
  tabelas: { A: [], B: [{ clube: { id: palmeiras.id } }] }
};
const migrado = scope.migrarSave(saveAntigo);
assert.strictEqual(migrado.divisoesClubes[palmeiras.id], 'B', 'old saves should infer divisions from saved tables');

console.log('season_division_persistence.test.js passed');
