const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
  window: { AudioContext: AudioContextStub, webkitAudioContext: AudioContextStub, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} } },
  document: {}, alert() {}, confirm() { return true; }, console, Date, Math, setTimeout, clearTimeout
};
const appPath = path.join(__dirname, '..', 'js', 'app.js');
vm.runInNewContext(fs.readFileSync(appPath, 'utf8'), context, { filename: appPath });
const scope = {};
appStub.controllerFn(scope, { get() { throw new Error('Unexpected HTTP request'); } }, function() {});

assert.strictEqual(scope.validarSaveImportado(null), false);
assert.strictEqual(scope.validarSaveImportado([]), false);
assert.strictEqual(scope.validarSaveImportado({ clubeAtualId: 1 }), false);
assert.strictEqual(scope.validarSaveImportado({ elencoAtual: [] }), false);
assert.strictEqual(scope.validarSaveImportado({ clubeAtualId: 1, elencoAtual: [] }), true);
assert.strictEqual(scope.validarSaveImportado({ clubeAtualId: 'clube', elencoAtual: [{ id: 1 }] }), true);

console.log('save_import_validation.test.js passed');
