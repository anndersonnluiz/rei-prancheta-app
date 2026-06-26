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
  const attrs = {
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
  };
  return Object.assign({
    id,
    clubeId,
    nome: 'Jogador ' + id,
    posicao,
    condicaoFisica,
    emCampo: false,
    lesionado: false,
    suspenso: false,
    atributos: attrs
  }, extra || {});
}

function montarElenco(clubeId, overallBase, condicaoFisica) {
  const posicoes = ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'VOL', 'MEI', 'MEI', 'ATA', 'ATA'];
  return posicoes.map((posicao, index) => jogador(clubeId * 100 + index, clubeId, posicao, overallBase, condicaoFisica, { emCampo: true }));
}

const scope = createControllerScope();

assert.strictEqual(typeof scope.montarAnalisePreJogo, 'function', 'montarAnalisePreJogo should exist');

const meuTime = { id: 1, nome: 'Meu Clube', sigla: 'MEU', reputacao: 78, divisao: 'A', estadio: { capacidade: 30000 } };
const adversarioForte = { id: 2, nome: 'Rival Forte', sigla: 'RIV', reputacao: 90, divisao: 'A', estadio: { capacidade: 40000 } };
const partida = { mandante: meuTime, visitante: adversarioForte, jogado: false };

scope.clubeAtual = meuTime;
scope.clubes = [meuTime, adversarioForte];
scope.diaAtual = 0;
scope.calendarioGeral = [{ tipo: 'LIGA', titulo: 'Brasileirao - Rodada 1', rodadaLiga: 0 }];
scope.calendario = [partida];
scope.taticas = { mentalidade: 'Ofensivo', foco: 'Pelas Pontas', marcacao: 'Pressao Alta' };
scope.elencoAtual = montarElenco(meuTime.id, 70, 62);
scope.elencoAtual.push(jogador(199, meuTime.id, 'ATA', 72, 50, { lesionado: true }));
scope.elencoAtual.push(jogador(198, meuTime.id, 'ZAG', 68, 80, { suspenso: true }));
scope.jogadores = scope.elencoAtual.concat(montarElenco(adversarioForte.id, 92, 100));

const analise = scope.montarAnalisePreJogo(partida, 'completo');

assert.strictEqual(analise.modo, 'completo');
assert.strictEqual(analise.competicao, 'Brasileirao - Rodada 1');
assert.strictEqual(analise.dia, 1);
assert.strictEqual(analise.meuTime.id, meuTime.id);
assert.strictEqual(analise.adversario.id, adversarioForte.id);
assert.strictEqual(analise.mando, 'Mandante');
assert.ok(typeof analise.forcaMeuTime === 'number', 'own team strength should be numeric');
assert.ok(typeof analise.forcaAdversario === 'number', 'opponent strength should be numeric');
assert.ok(analise.forcaAdversario > analise.forcaMeuTime, 'strong opponent should be rated above tired weaker lineup');
assert.strictEqual(analise.condicaoMedia, 62);
assert.strictEqual(analise.indisponiveis, 2);
assert.strictEqual(analise.taticasAtuais.mentalidade, scope.taticas.mentalidade);
assert.strictEqual(analise.taticasAtuais.foco, scope.taticas.foco);
assert.strictEqual(analise.taticasAtuais.marcacao, scope.taticas.marcacao);
assert.ok(Array.isArray(analise.jogadoresChaveAdversario), 'opponent key players should be an array');
assert.strictEqual(analise.jogadoresChaveAdversario.length, 3);
assert.ok(Array.isArray(analise.recomendacoes), 'recommendations should be an array');
assert.ok(analise.recomendacoes.length >= 2 && analise.recomendacoes.length <= 4, 'analysis should expose 2 to 4 recommendations');
assert.ok(
  analise.recomendacoes.some((rec) => rec.tipo === 'fisico' && /cansado|rotacao|poupar/i.test(rec.texto)),
  'tired squad should generate a physical recommendation'
);
assert.ok(
  analise.recomendacoes.some((rec) => rec.tipo === 'tatica' && /cautela|cautelosa|defensiva/i.test(rec.texto)),
  'stronger opponent should generate a cautionary tactical recommendation'
);

const adversarioSemDados = { id: 99, nome: 'Sem Dados FC', sigla: 'SDF', reputacao: 65 };
scope.elencoAtual = [];
scope.jogadores = [];
scope.taticas = null;

const analiseSemDados = scope.montarAnalisePreJogo({ mandante: adversarioSemDados, visitante: meuTime }, 'rapido');
assert.strictEqual(analiseSemDados.modo, 'rapido');
assert.strictEqual(analiseSemDados.meuTime.id, meuTime.id);
assert.strictEqual(analiseSemDados.adversario.id, adversarioSemDados.id);
assert.strictEqual(analiseSemDados.mando, 'Visitante');
assert.ok(Number.isFinite(analiseSemDados.forcaMeuTime), 'analysis should tolerate missing own squad data');
assert.ok(Number.isFinite(analiseSemDados.forcaAdversario), 'analysis should tolerate missing opponent player data');
assert.ok(Array.isArray(analiseSemDados.jogadoresChaveAdversario), 'missing opponent players should still return an array');
assert.ok(Array.isArray(analiseSemDados.recomendacoes), 'missing data should still return recommendations');

const flowScope = createControllerScope();
flowScope.clubeAtual = meuTime;
flowScope.clubes = [meuTime, adversarioForte];
flowScope.diaAtual = 0;
flowScope.calendarioGeral = [{ tipo: 'LIGA', titulo: 'Brasileirao - Rodada 1', rodadaLiga: 0 }];
flowScope.calendario = [partida];
flowScope.taticas = { mentalidade: 'Equilibrado', foco: 'Misto', marcacao: 'Recuada' };
flowScope.elencoAtual = montarElenco(meuTime.id, 75, 92);
flowScope.jogadores = flowScope.elencoAtual.concat(montarElenco(adversarioForte.id, 80, 100));
flowScope.telaAtual = 'dashboard';

flowScope.abrirPreJogo('rapido');
assert.strictEqual(flowScope.telaAtual, 'pre_jogo', 'open pre-match should navigate to pre-match screen');
assert.strictEqual(flowScope.preJogo.modo, 'rapido');
assert.ok(flowScope.preJogo.partida, 'pre-match should keep prepared match');

flowScope.ajustarTaticasPreJogo();
assert.strictEqual(flowScope.telaAtual, 'taticas', 'adjust tactics should navigate to tactics screen');
assert.strictEqual(flowScope.preJogo.visivel, false, 'pre-match should be hidden while tactics are open');
assert.ok(flowScope.preJogo.partida, 'prepared match should remain pending while adjusting tactics');

flowScope.taticas = { mentalidade: 'Ofensivo', foco: 'Pelas Pontas', marcacao: 'Pressao Alta' };
flowScope.voltarAoPreJogo();
assert.strictEqual(flowScope.telaAtual, 'pre_jogo', 'return action should navigate back to pre-match');
assert.strictEqual(flowScope.preJogo.visivel, true, 'pre-match should be visible again');
assert.strictEqual(flowScope.preJogo.analise.taticasAtuais.mentalidade, 'Ofensivo', 'analysis should refresh after tactics changes');

console.log('pre_match_analysis.test.js passed');
