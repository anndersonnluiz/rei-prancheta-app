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
  const context = { angular: { module() { return appStub; }, copy(value) { return JSON.parse(JSON.stringify(value)); } }, window: { AudioContext: AudioContextStub, webkitAudioContext: AudioContextStub, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, URL: { createObjectURL() { return 'blob:long'; }, revokeObjectURL() {} } }, document: { getElementById() { return null; }, createElement() { return { click() {}, setAttribute() {} }; }, body: { appendChild() {}, removeChild() {} } }, alert() {}, confirm() { return true; }, console, Date, Math, setTimeout, clearTimeout, Blob: function Blob() {} };
  const appPath = path.join(__dirname, '..', 'js', 'app.js');
  vm.runInNewContext(fs.readFileSync(appPath, 'utf8'), context, { filename: appPath });
  const scope = {};
  let timerReady = false;
  appStub.controllerFn(scope, { get() { throw new Error('Unexpected HTTP request'); } }, function(callback) { if (timerReady && typeof callback === 'function') callback(); });
  timerReady = true;
  return scope;
}

const scope = createScope();
scope.clubes = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'clubes.json'), 'utf8'));
scope.jogadores = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'jogadores.json'), 'utf8'));
scope.dados.nomeTreinador = 'Stress de Continuidade';
scope.iniciarNovoJogo(scope.clubes[0]);
scope.assinarPatrocinio(scope.patrocinadoresDisponiveis[1]);
scope.atualizarTaticas = function() {};

const anosIniciais = scope.dados.anoAtual;
let partidas = 0;
let gols = 0;
let posseAcumulada = 0;
let partidasComPosse = 0;
let maiorFolha = 0;
let menorOrcamento = Infinity;
let cartoes = 0;
let lesoes = 0;
for (let temporada = 0; temporada < 3; temporada += 1) {
  scope.elencoAtual.slice(0, 11).forEach((jogador) => { jogador.emCampo = true; jogador.anosContrato = 3; });
  for (let dia = 0; dia < scope.calendarioGeral.length && scope.telaAtual !== 'cerimonia'; dia += 1) {
    const jogo = scope.obterMeuJogoHoje();
    if (jogo) {
      scope.calcularResultadoRapido(jogo);
      scope.concluirPartida(jogo, 'rapido');
      partidas += 1;
      gols += (jogo.golsMandante || 0) + (jogo.golsVisitante || 0);
      if (scope.estatisticas && Number.isFinite(scope.estatisticas.posseMandante)) {
        posseAcumulada += scope.estatisticas.posseMandante;
        partidasComPosse += 1;
      }
      cartoes += scope.elencoAtual.reduce((total, jogador) => total + (jogador.cartoesAmarelos || 0), 0);
    } else {
      scope.avancarDiaLivre();
    }
    maiorFolha = Math.max(maiorFolha, scope.calcularFolhaSalarial());
    menorOrcamento = Math.min(menorOrcamento, scope.clubeAtual.orcamento);
    lesoes += scope.elencoAtual.filter((jogador) => jogador.lesionado).length;
  }
  assert.strictEqual(scope.telaAtual, 'cerimonia', 'season should reach ceremony');
  assert.ok(Number.isFinite(scope.clubeAtual.orcamento), 'budget should remain finite after season');
  assert.ok(scope.elencoAtual.length > 0, 'squad should remain available after season');
  scope.executarViradaDeAno(false);
  assert.strictEqual(scope.telaAtual, 'dashboard', 'new season should return to dashboard');
  assert.ok(scope.calendarioGeral.length > 0, 'new season should have a calendar');
  assert.ok(scope.financasHistorico.length > 0, 'financial history should persist across seasons');
}

assert.strictEqual(scope.dados.anoAtual, anosIniciais + 3, 'three seasons should advance the year');
assert.ok(partidas > 30, 'long-term stress should conclude matches');
assert.ok(gols >= partidas, 'long-term stress should produce goals');
assert.ok(partidasComPosse >= 0 && partidasComPosse <= partidas, 'possession metric count should remain bounded');
if (partidasComPosse > 0) assert.ok(posseAcumulada / partidasComPosse > 35 && posseAcumulada / partidasComPosse < 65, 'average home possession should remain plausible');
assert.ok(Number.isFinite(maiorFolha) && Number.isFinite(menorOrcamento), 'financial metrics should remain finite');
assert.ok(cartoes >= 0 && lesoes >= 0, 'disciplinary and injury metrics should remain valid');
assert.ok(scope.historicoTreinador.filter((item) => item.tipo === 'temporada').length >= 3, 'career history should retain all seasons');
scope.elencoAtual.forEach((jogador) => assert.ok(jogador.clubeId === scope.clubeAtual.id, 'squad player should remain linked to managed club'));
console.log('long_term_continuity.test.js passed:', partidas, 'partidas,', gols, 'gols, posse mandante media', (posseAcumulada / partidas).toFixed(1) + '%');
