const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createScope() {
  const appStub = {
    directive() { return appStub; },
    controller(name, fn) { appStub.controllerFn = fn; return appStub; }
  };
  function AudioContextStub() {}
  AudioContextStub.prototype.createOscillator = function() {
    return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} };
  };
  AudioContextStub.prototype.createGain = function() {
    return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
  };
  AudioContextStub.prototype.resume = function() {};
  const context = {
    angular: { module() { return appStub; }, copy(value) { return JSON.parse(JSON.stringify(value)); } },
    window: {
      AudioContext: AudioContextStub,
      webkitAudioContext: AudioContextStub,
      localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
      URL: { createObjectURL() { return 'blob:smoke'; }, revokeObjectURL() {} }
    },
    document: { getElementById() { return null; }, createElement() { return { click() {}, setAttribute() {} }; }, body: { appendChild() {}, removeChild() {} } },
    alert() {}, confirm() { return true; }, console, Date, Math, setTimeout, clearTimeout,
    Blob: function Blob() {}
  };
  const appPath = path.join(__dirname, '..', 'js', 'app.js');
  vm.runInNewContext(fs.readFileSync(appPath, 'utf8'), context, { filename: appPath });
  const scope = {};
  appStub.controllerFn(scope, { get() { throw new Error('Unexpected HTTP request'); } }, function() {});
  return scope;
}

const scope = createScope();
scope.clubes = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'clubes.json'), 'utf8'));
scope.jogadores = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'jogadores.json'), 'utf8'));
scope.dados.nomeTreinador = 'Teste de Carreira';

const clube = scope.clubes[0];
scope.iniciarNovoJogo(clube);

assert.strictEqual(scope.telaAtual, 'dashboard');
assert.strictEqual(scope.clubeAtual.id, clube.id);
assert.strictEqual(scope.dados.anoAtual, 2024);
assert.ok(Array.isArray(scope.calendarioGeral) && scope.calendarioGeral.length > 0, 'career should generate a calendar');
assert.ok(Array.isArray(scope.elencoAtual) && scope.elencoAtual.length > 0, 'career should load a squad');
assert.ok(scope.clubeAtual.base && scope.clubeAtual.base.atletas.length === 8, 'career should initialize youth academy');
assert.ok(scope.clubeAtual.infraestrutura, 'career should initialize infrastructure');
assert.ok(scope.diretoriaStatus && scope.diretoriaStatus.objetivoAtual, 'career should initialize board objective');

const freeDay = scope.calendarioGeral.findIndex((dia, index) => {
  scope.diaAtual = index;
  return !scope.obterMeuJogoHoje();
});
assert.ok(freeDay >= 0, 'career should contain at least one rest day');
scope.diaAtual = freeDay;
const beforeDay = scope.diaAtual;
scope.avancarDiaLivre();
assert.strictEqual(scope.diaAtual, beforeDay + 1, 'free day should advance career by one day');

const save = scope.migrarSave({
  saveVersion: 1,
  nomeTreinador: scope.dados.nomeTreinador,
  clubeAtualId: scope.clubeAtual.id,
  elencoAtual: scope.elencoAtual,
  calendarioGeral: scope.calendarioGeral
});
assert.strictEqual(save.saveVersion, 11);
assert.strictEqual(save.clubeAtualId, clube.id);
assert.ok(Array.isArray(save.elencoAtual) && save.elencoAtual.length > 0);

console.log('career_smoke.test.js passed');
