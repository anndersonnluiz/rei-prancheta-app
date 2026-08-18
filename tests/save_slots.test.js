const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createHarness(initialStorage, confirmResult) {
  const storage = Object.assign({}, initialStorage);
  const appStub = {
    directive() { return appStub; },
    controller(name, fn) { appStub.controllerFn = fn; return appStub; }
  };
  function AudioContextStub() {}
  AudioContextStub.prototype.createOscillator = function() { return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; };
  AudioContextStub.prototype.createGain = function() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; };
  AudioContextStub.prototype.resume = function() {};
  const context = {
    angular: { module() { return appStub; }, copy(value) { return JSON.parse(JSON.stringify(value)); } },
    window: { AudioContext: AudioContextStub, webkitAudioContext: AudioContextStub, localStorage: {
      getItem(key) { return storage[key] === undefined ? null : storage[key]; },
      setItem(key, value) { storage[key] = String(value); },
      removeItem(key) { delete storage[key]; }
    } },
    alert() {}, confirm() { return confirmResult; }, console, Date, Math, setTimeout, clearTimeout
  };
  const appPath = path.join(__dirname, '..', 'js', 'app.js');
  vm.runInNewContext(fs.readFileSync(appPath, 'utf8'), context, { filename: appPath });
  const scope = {};
  appStub.controllerFn(scope, { get() { throw new Error('Unexpected HTTP request'); } }, function() {});
  return { scope, storage };
}

const primeiro = { clubeAtualId: 1, elencoAtual: [{ id: 10 }] };
const segundo = { clubeAtualId: 2, elencoAtual: [{ id: 20 }] };
const { scope, storage } = createHarness({
  reiDaPranchetaSaveSlots: JSON.stringify({ 0: primeiro, 2: segundo })
}, true);

assert.strictEqual(JSON.stringify(scope.listarSlotsSave().map(slot => !!slot.save)), JSON.stringify([true, false, true, false]));
assert.strictEqual(scope.carregarSlot(2), true);
assert.strictEqual(scope.slotSaveAtual, 2);
assert.strictEqual(scope.saveInfo.clubeAtualId, segundo.clubeAtualId);
assert.strictEqual(scope.saveInfo.elencoAtual[0].id, segundo.elencoAtual[0].id);
assert.strictEqual(scope.carregarSlot(3), false);

let saves = 0;
scope.salvarJogoSilencioso = function() { saves++; };
assert.strictEqual(scope.salvarNoSlot(1), true);
assert.strictEqual(scope.slotSaveAtual, 1);
assert.strictEqual(saves, 1);
assert.strictEqual(scope.excluirSlot(1), false);

const removable = createHarness({
  reiDaPranchetaSave: JSON.stringify(primeiro),
  reiDaPranchetaSaveSlots: JSON.stringify({ 0: primeiro, 2: segundo })
}, true);
removable.scope.checarSaveExistente();
assert.strictEqual(removable.scope.excluirSlot(2), true);
assert.strictEqual(removable.scope.listarSlotsSave()[2].save, null);
assert.strictEqual(removable.storage.reiDaPranchetaSave, JSON.stringify(primeiro));
assert.strictEqual(removable.scope.excluirSlot(0), true);
assert.strictEqual(removable.storage.reiDaPranchetaSave, undefined);
assert.strictEqual(removable.scope.existeSave, false);

const bloqueado = createHarness({
  reiDaPranchetaSaveSlots: JSON.stringify({ 0: primeiro })
}, false);
bloqueado.scope.salvarJogoSilencioso = function() { throw new Error('save should not happen after cancellation'); };
assert.strictEqual(bloqueado.scope.salvarNoSlot(0), false);
assert.strictEqual(bloqueado.scope.slotSaveAtual, 0);

const legacy = createHarness({ reiDaPranchetaSave: JSON.stringify(primeiro) }, true);
legacy.scope.checarSaveExistente();
const migratedSlots = JSON.parse(legacy.storage.reiDaPranchetaSaveSlots);
assert.strictEqual(migratedSlots['0'].clubeAtualId, primeiro.clubeAtualId);
assert.strictEqual(migratedSlots['0'].elencoAtual[0].id, primeiro.elencoAtual[0].id);

console.log('save_slots.test.js passed');
