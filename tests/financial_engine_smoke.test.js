const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createScope() {
  const appStub = { directive() { return appStub; }, controller(name, fn) { appStub.controllerFn = fn; return appStub; } };
  function AudioContextStub() {}
  AudioContextStub.prototype.createOscillator = function() { return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; };
  AudioContextStub.prototype.createGain = function() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; };
  AudioContextStub.prototype.resume = function() {};
  const context = {
    angular: { module() { return appStub; }, copy(value) { return JSON.parse(JSON.stringify(value)); } },
    window: { AudioContext: AudioContextStub, webkitAudioContext: AudioContextStub, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, URL: { createObjectURL() { return 'blob:financial'; }, revokeObjectURL() {} } },
    document: { getElementById() { return null; }, createElement() { return { click() {}, setAttribute() {} }; }, body: { appendChild() {}, removeChild() {} } },
    alert() {}, confirm() { return true; }, console, Date, Math, setTimeout, clearTimeout, Blob: function Blob() {}
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
scope.dados.nomeTreinador = 'Teste Financeiro';
scope.iniciarNovoJogo(scope.clubes[0]);
scope.elencoAtual.slice(0, 11).forEach((jogador) => { jogador.emCampo = true; });

const orcamentoInicial = scope.clubeAtual.orcamento;
let partidasConcluidas = 0;
const saldoPorDia = [];
for (let i = 0; i < scope.calendarioGeral.length + 5 && scope.telaAtual !== 'cerimonia'; i += 1) {
  const jogo = scope.obterMeuJogoHoje();
  if (jogo) {
    scope.calcularResultadoRapido(jogo);
    scope.concluirPartida(jogo, 'rapido');
    partidasConcluidas += 1;
  } else {
    scope.avancarDiaLivre();
  }
  saldoPorDia.push(scope.clubeAtual.orcamento);
}

assert.ok(partidasConcluidas > 0, 'financial smoke should conclude real matches');
assert.ok(scope.diaAtual > 0, 'financial smoke should advance the calendar');
assert.ok(Array.isArray(scope.financasHistorico) && scope.financasHistorico.length > 0, 'real engine should record financial entries');
assert.ok(scope.financasHistorico.some((item) => item.descricao && item.descricao.indexOf('Pagamento de Sal') === 0), 'real engine should charge payroll');
assert.ok(scope.financasHistorico.some((item) => item.descricao && item.descricao.indexOf('Merchandising') === 0), 'real engine should record monthly commercial revenue');
assert.ok(scope.financasHistorico.some((item) => item.descricao && item.descricao.indexOf('Manuten') === 0), 'real engine should charge stadium maintenance');
assert.ok(Number.isFinite(scope.clubeAtual.orcamento), 'real engine should keep club budget finite');
assert.notStrictEqual(scope.clubeAtual.orcamento, orcamentoInicial, 'real engine should change budget through matches and daily finance');
assert.ok(saldoPorDia.length >= scope.calendarioGeral.length, 'financial smoke should cover the full season calendar');
assert.ok(scope.financasHistorico.filter((item) => item.tipo === 'despesa').length >= 10, 'full season should record recurring expenses');
assert.ok(scope.financasHistorico.filter((item) => item.tipo === 'receita').length >= 10, 'full season should record recurring revenues');
scope.financasHistorico.forEach((item) => assert.ok(Number.isFinite(item.valor), 'financial value must be numeric'));

console.log('financial_engine_smoke.test.js: ok');
