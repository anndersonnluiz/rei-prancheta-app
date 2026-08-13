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

function jogador(id, clubeId, nome, posicao, idade, overallBase, extra) {
  return Object.assign({
    id,
    clubeId,
    nome,
    posicao,
    idade,
    condicaoFisica: 90,
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

function overall(j) {
  const a = j.atributos;
  if (j.posicao === 'GOL') return Math.round((a.reflexo * 2 + a.posicionamento + a.distribuicao + a.fisico) / 5);
  return Math.round((a.finalizacao + a.passe + a.marcacao + a.velocidade + a.fisico) / 5);
}

const { scope, storage } = createControllerHarness();

assert.strictEqual(typeof scope.registrarXpPartida, 'function', 'registrarXpPartida should exist');
assert.strictEqual(typeof scope.aplicarEvolucaoElenco, 'function', 'aplicarEvolucaoElenco should exist');
assert.strictEqual(typeof scope.atualizarRelatorioEvolucaoVisivel, 'function', 'atualizarRelatorioEvolucaoVisivel should exist');

const meuTime = { id: 1, nome: 'Meu Clube', sigla: 'MEU', reputacao: 78, divisao: 'A', estadio: { capacidade: 30000 }, orcamento: 1000000 };
const rival = { id: 2, nome: 'Rival FC', sigla: 'RIV', reputacao: 80, divisao: 'A', estadio: { capacidade: 40000 } };
const jovem = jogador(11, 1, 'Jovem Meia', 'MEI', 20, 70, { emCampo: true, potencial: 82 });
const adulto = jogador(12, 1, 'Adulto Atacante', 'ATA', 26, 76, { emCampo: true });
const veterano = jogador(13, 1, 'Veterano Lateral', 'LAT', 35, 78, { emCampo: true, xpTemporada: 0, condicaoFisica: 55 });
const banco = jogador(14, 1, 'Reserva', 'ZAG', 24, 72, { emCampo: false });

scope.clubeAtual = meuTime;
scope.clubes = [meuTime, rival];
scope.diaAtual = 0;
scope.calendarioGeral = [{ tipo: 'LIGA', titulo: 'Brasileirao - Rodada 1', rodadaLiga: 0 }];
scope.calendario = [{ mandante: meuTime, visitante: rival }];
scope.tabelas = { A: [{ clube: meuTime, pontos: 0, vitorias: 0, empates: 0, derrotas: 0, golsPro: 0, golsContra: 0, saldo: 0 }, { clube: rival, pontos: 0, vitorias: 0, empates: 0, derrotas: 0, golsPro: 0, golsContra: 0, saldo: 0 }], B: [], C: [], D: [] };
scope.taticas = { mentalidade: 'Equilibrado', foco: 'Misto', marcacao: 'Recuada' };
scope.elencoAtual = [jovem, adulto, veterano, banco];
scope.jogadores = scope.elencoAtual.concat([jogador(21, 2, 'Rival 1', 'ATA', 25, 78)]);
scope.financasHistorico = [];
scope.transferenciasHistorico = [];
scope.propostasPendentes = [];
scope.verificarVariaveisExtras();

const migratedSave = scope.migrarSave({
  saveVersion: 1,
  elencoAtual: [jogador(31, 1, 'Legado', 'ATA', 19, 65)],
  jogadores: [jogador(32, 2, 'Legado CPU', 'GOL', 34, 74)],
  calendarioGeral: []
});
assert.strictEqual(migratedSave.saveVersion, 11, 'legacy saves should migrate to contracts save version');
assert.ok(migratedSave.elencoAtual[0].potencial >= overall(migratedSave.elencoAtual[0]), 'migration should add deterministic potential');
assert.strictEqual(migratedSave.elencoAtual[0].xpTemporada, 0);
assert.strictEqual(migratedSave.elencoAtual[0].jogosTemporada, 0);
assert.strictEqual(migratedSave.elencoAtual[0].minutosTemporada, 0);
assert.strictEqual(migratedSave.elencoAtual[0].evolucaoTemporada, 0);
assert.ok(Array.isArray(migratedSave.elencoAtual[0].historicoEvolucao), 'migration should add evolution history');
assert.ok(Array.isArray(migratedSave.relatorioEvolucao), 'migration should add global evolution report');
assert.strictEqual(migratedSave.ambienteElenco.valor, 70, 'migration should add squad environment default');
assert.strictEqual(migratedSave.diretoriaStatus.status, 'no_trilho', 'migration should add board status default');

const potentialSnapshot = migratedSave.elencoAtual[0].potencial;
scope.migrarSave(migratedSave);
assert.strictEqual(migratedSave.elencoAtual[0].potencial, potentialSnapshot, 'migration should be deterministic and idempotent');

const partida = {
  mandante: meuTime,
  visitante: rival,
  golsMandante: 2,
  golsVisitante: 1,
  telemetriaShots: [
    { time: 'mandante', result: 'GOL', shooterId: jovem.id, shooterNome: jovem.nome, xg: 0.4, zona: 'ATA' },
    { time: 'mandante', result: 'NAO', shooterId: jovem.id, shooterNome: jovem.nome, xg: 0.2, zona: 'MEI' },
    { time: 'mandante', result: 'GOL', shooterId: adulto.id, shooterNome: adulto.nome, xg: 0.5, zona: 'ATA' }
  ]
};

scope.registrarXpPartida(partida, 'completo');
assert.strictEqual(jovem.jogosTemporada, 1, 'players on field should receive match count');
assert.strictEqual(jovem.minutosTemporada, 90, 'players on field should receive minutes');
assert.ok(jovem.xpTemporada > adulto.xpTemporada, 'young player with goal/chances should receive more XP');
assert.ok(jovem.xpTemporada <= 8, 'XP per match should be capped');
assert.strictEqual(banco.jogosTemporada, 0, 'bench players should not receive match count');

jovem.xpTemporada = 60;
const jovemOverallAntes = overall(jovem);
const jovemFinalizacaoAntes = jovem.atributos.finalizacao;
scope.aplicarEvolucaoElenco('Teste mensal');
assert.ok(overall(jovem) >= jovemOverallAntes, 'young player with XP should not regress');
assert.ok(jovem.atributos.finalizacao >= jovemFinalizacaoAntes || jovem.atributos.passe > 70 || jovem.atributos.fisico > 70, 'young player should improve a relevant attribute');
assert.ok(overall(jovem) <= jovem.potencial, 'young player should not pass potential in one cycle');
assert.ok(jovem.atributos.finalizacao <= 99 && jovem.atributos.passe <= 99, 'attributes should cap at 99');

const veteranFisicoAntes = veterano.atributos.fisico;
const veteranVelAntes = veterano.atributos.velocidade;
scope.aplicarEvolucaoElenco('Teste veterano');
assert.ok(veterano.atributos.fisico <= veteranFisicoAntes, 'veteran should have controlled physical regression');
assert.ok(veterano.atributos.velocidade <= veteranVelAntes, 'veteran should have controlled speed regression');
assert.ok(veterano.atributos.fisico >= 10 && veterano.atributos.velocidade >= 10, 'regression should preserve minimum attributes');

assert.ok(Array.isArray(scope.relatorioEvolucao), 'evolution report should exist');
assert.ok(scope.relatorioEvolucao.length > 0, 'evolution should generate report items');
assert.ok(Array.isArray(scope.relatorioEvolucaoVisivel), 'visible evolution report should exist');
assert.ok(scope.relatorioEvolucaoVisivel.length <= 5, 'visible evolution report should be compact');
assert.ok(scope.relatorioEvolucaoVisivel[0].mudancas.length > 0, 'report items should include attribute changes');

scope.relatorioEvolucao = [{ id: 'rel_1', jogadorId: jovem.id, nome: jovem.nome, idade: jovem.idade, posicao: jovem.posicao, overallAntes: 70, overallDepois: 71, mudancas: [{ atributo: 'passe', antes: 70, depois: 71 }], motivo: 'Teste' }];
scope.atualizarRelatorioEvolucaoVisivel();
scope.salvarJogoSilencioso();
const saved = JSON.parse(storage.value);
assert.strictEqual(saved.saveVersion, 11, 'save should persist contracts version');
assert.ok(saved.elencoAtual[0].potencial !== undefined, 'save should persist player potential');
assert.ok(saved.elencoAtual[0].xpTemporada !== undefined, 'save should persist player XP');
assert.ok(saved.elencoAtual[0].minutosTemporada !== undefined, 'save should persist player minutes');
assert.deepStrictEqual(saved.relatorioEvolucao, scope.relatorioEvolucao, 'save should persist evolution report');
assert.strictEqual(saved.ambienteElenco.valor, scope.ambienteElenco.valor, 'save should persist squad environment');
assert.strictEqual(saved.diretoriaStatus.status, scope.diretoriaStatus.status, 'save should persist board status');
assert.ok(saved.clubeAtualInfo.infraestrutura, 'save should persist infrastructure state');
assert.strictEqual(saved.contextoExterno.torcida.humor, scope.contextoExterno.torcida.humor, 'save should persist external context');
assert.ok(saved.clubeAtualInfo.base, 'save should persist youth academy state');

console.log('player_development.test.js passed');
