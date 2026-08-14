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

// Simula as 38 rodadas de liga para todas as divisões e aplica os resultados à tabela.
let jogosDeLiga = 0;
scope.jogosCPU.forEach((rodada) => {
  rodada.forEach((jogo) => {
    const golsMandante = (Number(jogo.mandante.id) + Number(jogo.visitante.id)) % 3;
    const golsVisitante = Number(jogo.visitante.id) % 2;
    jogo.golsMandante = golsMandante;
    jogo.golsVisitante = golsVisitante;
    jogo.jogado = true;
    scope.atualizarTabela(jogo, jogo.divisao);
    jogosDeLiga++;
  });
});
scope.calendario.forEach((jogo) => {
  if (!jogo) return;
  jogo.golsMandante = 1;
  jogo.golsVisitante = 0;
  jogo.jogado = true;
  scope.atualizarTabela(jogo, scope.clubeAtual.divisao);
  jogosDeLiga++;
});
assert.strictEqual(jogosDeLiga, 1520, 'four divisions should complete 38 rounds with 20 clubs each');
['A', 'B', 'C', 'D'].forEach((divisao) => {
  const tabela = scope.ordenarTabela(divisao);
  assert.strictEqual(tabela.length, 20, 'division should contain 20 clubs');
  tabela.forEach((linha) => {
    assert.strictEqual(linha.vitorias + linha.empates + linha.derrotas, 38, 'each club should play 38 league matches');
  });
});

const anoAntesDaVirada = scope.dados.anoAtual;
scope.relatorioFimAno = null;
scope.atualizarTaticas = function() {};
scope.elencoAtual.forEach((jogador) => { jogador.anosContrato = 3; });
scope.executarViradaDeAno(false);
assert.strictEqual(scope.dados.anoAtual, anoAntesDaVirada + 1, 'season rollover should advance the year');
assert.ok(Array.isArray(scope.calendarioGeral) && scope.calendarioGeral.length > 0, 'season rollover should generate a new calendar');
assert.strictEqual(scope.diaAtual, 0, 'new season should start on day zero');
assert.strictEqual(scope.clubeAtual.id, clube.id, 'season rollover should preserve the managed club');
assert.ok(Array.isArray(scope.patrocinadoresDisponiveis) && scope.patrocinadoresDisponiveis.length === 3, 'season rollover should generate new sponsorship options');
assert.ok(scope.diretoriaStatus && scope.diretoriaStatus.objetivoAtual, 'new season should generate a board objective');
assert.ok(Array.isArray(scope.elencoAtual), 'season rollover should preserve a valid squad');

// Garante que a carreira consegue atravessar mais de uma temporada consecutiva.
for (let temporada = 0; temporada < 2; temporada++) {
  scope.elencoAtual.forEach((jogador) => { jogador.anosContrato = 3; });
  const anoAnterior = scope.dados.anoAtual;
  scope.executarViradaDeAno(false);
  assert.strictEqual(scope.dados.anoAtual, anoAnterior + 1, 'consecutive season rollover should advance the year');
  assert.ok(scope.calendarioGeral.length > 0, 'consecutive season rollover should create a calendar');
}

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
