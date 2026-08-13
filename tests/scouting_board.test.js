const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createControllerHarness() {
  const appStub = {
    directive() {
      return appStub;
    },
    controller(name, fn) {
      appStub.controllerFn = fn;
      return appStub;
    }
  };

  function AudioContextStub() {}
  AudioContextStub.prototype.createOscillator = function() {
    return {
      type: 'sine',
      frequency: {
        setValueAtTime() {},
        exponentialRampToValueAtTime() {}
      },
      connect() {},
      start() {},
      stop() {}
    };
  };
  AudioContextStub.prototype.createGain = function() {
    return {
      gain: {
        setValueAtTime() {},
        linearRampToValueAtTime() {},
        exponentialRampToValueAtTime() {}
      },
      connect() {}
    };
  };
  AudioContextStub.prototype.resume = function() {};

  const storage = { value: null };
  const context = {
    angular: {
      module() {
        return appStub;
      },
      copy(value) {
        return JSON.parse(JSON.stringify(value));
      }
    },
    window: {
      AudioContext: AudioContextStub,
      webkitAudioContext: AudioContextStub,
      localStorage: {
        getItem() { return storage.value; },
        setItem(key, value) { storage.value = value; },
        removeItem() { storage.value = null; }
      }
    },
    alert() {},
    confirm() { return true; },
    console,
    Date,
    Math,
    setTimeout,
    clearTimeout
  };

  const appPath = path.join(__dirname, '..', 'js', 'app.js');
  const code = fs.readFileSync(appPath, 'utf8');
  vm.runInNewContext(code, context, { filename: appPath });

  assert.strictEqual(typeof appStub.controllerFn, 'function', 'DashboardController should be registered');
  const scope = {};
  const httpStub = { get() { throw new Error('Unexpected HTTP request during unit test'); } };
  const timeoutStub = function() {};
  appStub.controllerFn(scope, httpStub, timeoutStub);
  return { scope, storage };
}

function jogador(id, clubeId, nome, posicao, overallBase, extra) {
  return Object.assign({
    id,
    clubeId,
    nome,
    posicao,
    idade: 24,
    salario: 20000,
    anosContrato: 2,
    condicaoFisica: 100,
    emCampo: false,
    lesionado: false,
    suspenso: false,
    atributos: {
      finalizacao: overallBase,
      passe: overallBase,
      marcacao: overallBase,
      velocidade: overallBase,
      fisico: overallBase,
      reflexo: overallBase,
      posicionamento: overallBase,
      distribuicao: overallBase,
      penalti: overallBase,
      escanteio: overallBase,
      cobrador: overallBase
    }
  }, extra || {});
}

const { scope, storage } = createControllerHarness();

assert.strictEqual(typeof scope.criarScoutingPadrao, 'function', 'scouting default helper should exist');
assert.strictEqual(typeof scope.adicionarShortlistScouting, 'function', 'shortlist add helper should exist');
assert.strictEqual(typeof scope.removerShortlistScouting, 'function', 'shortlist remove helper should exist');
assert.strictEqual(typeof scope.registrarHistoricoRelatorioScouting, 'function', 'scouting report history helper should exist');
assert.strictEqual(typeof scope.atualizarDiretoriaStatus, 'function', 'board status helper should exist');
assert.strictEqual(typeof scope.avaliarDiretoriaPeriodica, 'function', 'periodic board review helper should exist');

const legacySave = scope.migrarSave({
  saveVersion: 6,
  calendarioGeral: [],
  clubeAtualInfo: { id: 1, nome: 'Legado FC', estadio: { capacidade: 30000 }, orcamento: 1000000 }
});

assert.strictEqual(legacySave.saveVersion, 11, 'legacy save should migrate to contracts save version');
assert.ok(legacySave.clubeAtualInfo.scouting, 'legacy club should receive scouting state');
assert.ok(Array.isArray(legacySave.clubeAtualInfo.scouting.shortlist), 'scouting shortlist should be an array');
assert.ok(Array.isArray(legacySave.clubeAtualInfo.scouting.historicoRelatorios), 'scouting report history should be an array');
assert.strictEqual(legacySave.clubeAtualInfo.scouting.ultimoRelatorioDia, 0);
assert.strictEqual(legacySave.diretoriaStatus.status, 'no_trilho', 'legacy save should receive board status default');
assert.strictEqual(legacySave.diretoriaStatus.progressoLabel, 'Aguardando inicio da temporada');
assert.ok(legacySave.clubeAtualInfo.infraestrutura, 'legacy save should receive infrastructure state');
assert.strictEqual(legacySave.contextoExterno.torcida.humor, 65, 'legacy save should receive fan mood default');
assert.ok(legacySave.clubeAtualInfo.base, 'legacy save should receive youth academy state');

scope.clubeAtual = {
  id: 1,
  nome: 'Meu Clube',
  sigla: 'MEU',
  reputacao: 78,
  divisao: 'A',
  orcamento: 3000000,
  estadio: { capacidade: 30000 },
  metaDescricao: 'Classificar para Competicao Continental (Top 6)',
  metaTipo: 'continental',
  olheiros: []
};
scope.clubes = [scope.clubeAtual, { id: 2, nome: 'Rival', divisao: 'A' }];
scope.elencoAtual = [jogador(10, 1, 'Atacante Atual', 'ATA', 72)];
scope.jogadores = scope.elencoAtual.concat([jogador(20, 'mercado', 'Garoto Observado', 'ATA', 68, { idade: 18, potencial: 84 })]);
scope.diaAtual = 8;
scope.calendarioGeral = [{ titulo: 'Dia 1' }];
scope.verificarVariaveisExtras();

const observado = scope.criarItemRelatorioScouting(scope.jogadores[1], 'BASE', 0);
assert.ok(observado.confiancaRelatorio >= 50 && observado.confiancaRelatorio <= 95, 'report confidence should be bounded');
assert.ok(typeof observado.overallEstimado === 'number', 'report should expose estimated overall');
assert.ok(typeof observado.potencialEstimado === 'number', 'report should expose estimated potential');
assert.ok(observado.faixaValor.min <= observado.faixaValor.max, 'report should expose a value range');

const primeiroShortlist = scope.adicionarShortlistScouting(observado);
const segundoShortlist = scope.adicionarShortlistScouting(observado);
assert.strictEqual(primeiroShortlist.id, segundoShortlist.id, 'same scouted player should not duplicate in shortlist');
assert.strictEqual(scope.clubeAtual.scouting.shortlist.length, 1, 'shortlist should contain only one item');
scope.removerShortlistScouting(observado.id);
assert.strictEqual(scope.clubeAtual.scouting.shortlist.length, 0, 'shortlist remove should delete item');

for (let i = 0; i < 12; i++) {
  scope.registrarHistoricoRelatorioScouting({ id: 'rel_' + i, dia: i, origemMissao: 'BASE', jogadores: [Object.assign({}, observado, { id: 'p_' + i })] });
}
assert.strictEqual(scope.clubeAtual.scouting.historicoRelatorios.length, 10, 'scouting report history should be truncated');
assert.strictEqual(scope.clubeAtual.scouting.historicoRelatorios[0].id, 'rel_11', 'most recent report should stay first');

scope.tabelas = {
  A: [
    { clube: { id: 2, nome: 'Rival' }, pontos: 31, vitorias: 10, saldo: 18 },
    { clube: scope.clubeAtual, pontos: 27, vitorias: 8, saldo: 10 },
    { clube: { id: 3, nome: 'Outro' }, pontos: 20, vitorias: 6, saldo: 2 }
  ]
};
scope.atualizarDiretoriaStatus();
assert.strictEqual(scope.diretoriaStatus.status, 'acima_do_esperado', 'top 2 for continental target should be above expectations');
assert.ok(/2/.test(scope.diretoriaStatus.progressoLabel), 'progress label should mention current position');

scope.tabelas.A = [
  { clube: { id: 2, nome: 'Rival' }, pontos: 31, vitorias: 10, saldo: 18 },
  { clube: { id: 3, nome: 'Outro' }, pontos: 29, vitorias: 9, saldo: 12 },
  { clube: { id: 4, nome: 'Outro 2' }, pontos: 25, vitorias: 7, saldo: 8 },
  { clube: { id: 5, nome: 'Outro 3' }, pontos: 24, vitorias: 7, saldo: 7 },
  { clube: { id: 6, nome: 'Outro 4' }, pontos: 23, vitorias: 7, saldo: 5 },
  { clube: { id: 7, nome: 'Outro 5' }, pontos: 22, vitorias: 6, saldo: 4 },
  { clube: { id: 8, nome: 'Outro 6' }, pontos: 21, vitorias: 6, saldo: 3 },
  { clube: { id: 9, nome: 'Outro 7' }, pontos: 20, vitorias: 6, saldo: 2 },
  { clube: { id: 10, nome: 'Outro 8' }, pontos: 19, vitorias: 5, saldo: 1 },
  { clube: scope.clubeAtual, pontos: 14, vitorias: 4, saldo: -5 }
];
scope.atualizarDiretoriaStatus();
assert.strictEqual(scope.diretoriaStatus.status, 'critico', '10th for continental target should be critical');

const primeiraAvaliacao = scope.avaliarDiretoriaPeriodica();
const segundaAvaliacao = scope.avaliarDiretoriaPeriodica();
assert.ok(primeiraAvaliacao, 'periodic board review should be generated when due');
assert.strictEqual(segundaAvaliacao, null, 'periodic board review should not duplicate on same day');
assert.strictEqual(scope.diretoriaStatus.historicoAvaliacoes.length, 1, 'only one board review should be stored for the same day');

scope.adicionarShortlistScouting(observado);
scope.salvarJogoSilencioso();
const saved = JSON.parse(storage.value);
assert.strictEqual(saved.saveVersion, 11, 'save should persist contracts version');
assert.strictEqual(saved.clubeAtualInfo.scouting.shortlist.length, 1, 'save should persist scouting shortlist');
assert.strictEqual(saved.diretoriaStatus.status, scope.diretoriaStatus.status, 'save should persist board status');
assert.ok(saved.clubeAtualInfo.infraestrutura, 'save should persist infrastructure state');
assert.strictEqual(saved.contextoExterno.imprensa.pressao, scope.contextoExterno.imprensa.pressao, 'save should persist media pressure');
assert.ok(saved.clubeAtualInfo.base, 'save should persist youth academy state');

console.log('scouting_board.test.js passed');
