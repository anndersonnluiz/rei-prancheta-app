const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createControllerScope() {
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
        getItem() { return null; },
        setItem() {},
        removeItem() {}
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
  return scope;
}

function jogador(id, clubeId, posicao, overallBase, condicaoFisica, extra) {
  return Object.assign({
    id,
    clubeId,
    nome: 'Jogador ' + id,
    posicao,
    condicaoFisica,
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

function montarElenco(clubeId) {
  const posicoes = ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'VOL', 'MEI', 'MEI', 'ATA', 'ATA'];
  return posicoes.map((posicao, index) => jogador(clubeId * 100 + index, clubeId, posicao, 76 + index, 82 - index, { emCampo: true }));
}

const scope = createControllerScope();

assert.strictEqual(typeof scope.montarResumoPosJogo, 'function', 'montarResumoPosJogo should exist');
assert.strictEqual(typeof scope.fecharPosJogo, 'function', 'fecharPosJogo should exist');

const meuTime = { id: 1, nome: 'Meu Clube', sigla: 'MEU', reputacao: 78, divisao: 'A', estadio: { capacidade: 30000 } };
const rival = { id: 2, nome: 'Rival FC', sigla: 'RIV', reputacao: 82, divisao: 'A', estadio: { capacidade: 40000 } };

scope.clubeAtual = meuTime;
scope.clubes = [meuTime, rival];
scope.diaAtual = 2;
scope.calendarioGeral = [
  { tipo: 'TREINO', titulo: 'Treino Livre' },
  { tipo: 'TREINO', titulo: 'Treino Livre' },
  { tipo: 'LIGA', titulo: 'Brasileirao - Rodada 2', rodadaLiga: 1 }
];
scope.taticas = { mentalidade: 'Ofensivo', foco: 'Pelas Pontas', marcacao: 'Pressão Alta' };
scope.elencoAtual = montarElenco(meuTime.id);
scope.elencoAtual[2].lesionado = true;
scope.elencoAtual[2].acabouDeSerLesionado = true;
scope.elencoAtual[2].diasLesao = 3;
scope.elencoAtual[4].suspenso = true;
scope.elencoAtual[4].acabouDeSerSuspenso = true;
scope.elencoAtual[8].condicaoFisica = 52;
scope.elencoAtual[9].condicaoFisica = 48;
scope.jogadores = scope.elencoAtual.concat(montarElenco(rival.id));
scope.estatisticas = {
  posseMandante: 54,
  posseVisitante: 46,
  chutesMandante: 8,
  chutesVisitante: 5,
  publico: 38200,
  renda: 1230000
};

const partidaCompleta = {
  mandante: meuTime,
  visitante: rival,
  golsMandante: 2,
  golsVisitante: 1,
  telemetriaShots: [
    { time: 'mandante', zona: 'ATA', xg: 0.4, result: 'GOL', shooterId: scope.elencoAtual[9].id, shooterNome: scope.elencoAtual[9].nome },
    { time: 'mandante', zona: 'MEI', xg: 0.3, result: 'NAO', shooterId: scope.elencoAtual[8].id, shooterNome: scope.elencoAtual[8].nome },
    { time: 'visitante', zona: 'ATA', xg: 0.5, result: 'GOL', shooterId: 201, shooterNome: 'Rival 1', goalieId: scope.elencoAtual[0].id },
    { time: 'visitante', zona: 'LAT', xg: 0.2, result: 'NAO', shooterId: 202, shooterNome: 'Rival 2', goalieId: scope.elencoAtual[0].id }
  ]
};

const resumoCompleto = scope.montarResumoPosJogo(partidaCompleta, 'completo');

assert.strictEqual(resumoCompleto.origem, 'completo');
assert.strictEqual(resumoCompleto.competicao, 'Brasileirao - Rodada 2');
assert.strictEqual(resumoCompleto.dia, 3);
assert.strictEqual(resumoCompleto.placar.resultadoMeuTime, 'Vitoria');
assert.strictEqual(resumoCompleto.estatisticas.posseMandante, 54);
assert.strictEqual(resumoCompleto.estatisticas.chutesMandante, 8);
assert.strictEqual(resumoCompleto.xg.mandante, 0.7);
assert.strictEqual(resumoCompleto.xg.visitante, 0.7);
assert.strictEqual(resumoCompleto.xg.total, 1.4);
assert.strictEqual(resumoCompleto.xg.eficienciaMandante, 286);
assert.strictEqual(resumoCompleto.xg.eficienciaVisitante, 143);
assert.ok(resumoCompleto.zonas.some((zona) => zona.zona === 'ATA' && zona.chutes === 2 && zona.gols === 2), 'zones should aggregate xG telemetry');
assert.ok(Array.isArray(resumoCompleto.destaques), 'highlights should be an array');
assert.ok(resumoCompleto.destaques.length > 0, 'highlights should not be empty');
assert.ok(resumoCompleto.destaques.every((item) => item.id !== undefined && item.nome && item.motivo), 'highlights should be stable objects');
assert.ok(resumoCompleto.ocorrencias.some((item) => item.tipo === 'lesao' && /Jogador/.test(item.texto)), 'recent injuries should be reported');
assert.ok(resumoCompleto.ocorrencias.some((item) => item.tipo === 'suspensao' && /Jogador/.test(item.texto)), 'recent suspensions should be reported');
assert.ok(resumoCompleto.impactoFisico.atletasCansados >= 2, 'tired players should be counted');
assert.ok(resumoCompleto.taticas.leitura.length > 0, 'tactical reading should be present');
assert.ok(resumoCompleto.manchete.titulo.length > 0, 'headline title should be present');

const partidaRapida = {
  mandante: rival,
  visitante: meuTime,
  golsMandante: 0,
  golsVisitante: 0
};
scope.estatisticas = { publico: 12000, renda: 960000 };

const resumoRapido = scope.montarResumoPosJogo(partidaRapida, 'rapido');
assert.strictEqual(resumoRapido.origem, 'rapido');
assert.strictEqual(resumoRapido.placar.resultadoMeuTime, 'Empate');
assert.ok(Number.isFinite(resumoRapido.xg.mandante), 'fallback xG should be numeric without telemetry');
assert.ok(Number.isFinite(resumoRapido.xg.visitante), 'fallback xG should be numeric without telemetry');
assert.ok(Array.isArray(resumoRapido.zonas), 'fallback zones should be an array');
assert.ok(Array.isArray(resumoRapido.destaques), 'fallback highlights should be an array');

scope.telaAtual = 'pos_jogo';
scope.posJogo = { disponivel: true, resumo: resumoCompleto };
scope.fecharPosJogo();
assert.strictEqual(scope.telaAtual, 'dashboard', 'closing post-match should return to dashboard');
assert.strictEqual(scope.posJogo.disponivel, false, 'closing post-match should clear visual availability');
assert.strictEqual(scope.posJogo.resumo, null, 'closing post-match should clear visual summary');

console.log('post_match_summary.test.js passed');
