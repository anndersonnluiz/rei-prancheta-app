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

function buildElenco(conditions) {
  return conditions.map((condicaoFisica, index) => ({
    id: index + 1,
    nome: 'Jogador ' + (index + 1),
    posicao: index === 0 ? 'GOL' : 'MEI',
    condicaoFisica,
    lesionado: false,
    suspenso: false,
    atributos: {
      reflexo: 75,
      posicionamento: 75,
      distribuicao: 75,
      fisico: 75,
      finalizacao: 75,
      passe: 75,
      marcacao: 75,
      velocidade: 75
    }
  }));
}

const scope = createControllerScope();

scope.calendarioGeral = [
  { tipo: 'TREINO', titulo: 'Treino Livre' },
  { tipo: 'LIGA', titulo: 'Brasileirao - Rodada 1' },
  { tipo: 'CONTINENTAL', titulo: 'Libertadores - Grupo', fase: 2 },
  { tipo: 'TREINO', titulo: 'Treino Livre' },
  { tipo: 'COPA', titulo: 'Copa do Brasil - Quartas', fase: 3 },
  { tipo: 'TREINO', titulo: 'Treino Livre' },
  { tipo: 'COPA', titulo: 'Copa do Brasil - Semifinal', fase: 4 }
];

const diasComJogo = { 1: true, 2: true, 4: true, 6: true };
scope.obterMeuJogoNoDia = function(indice) {
  return diasComJogo[indice] ? { mandante: { id: 'A' }, visitante: { id: 'B' } } : null;
};
scope.obterMeuJogoHoje = function() {
  return scope.obterMeuJogoNoDia(scope.diaAtual);
};
scope.elencoAtual = buildElenco([55, 60, 65, 70]);
scope.diaAtual = 6;

assert.strictEqual(typeof scope.calcularCargaCalendario, 'function', 'calcularCargaCalendario should exist');
assert.strictEqual(typeof scope.calcularRecuperacaoFisicaDiaria, 'function', 'calcularRecuperacaoFisicaDiaria should exist');
assert.strictEqual(typeof scope.calcularQuedaFisicaPorTick, 'function', 'calcularQuedaFisicaPorTick should exist');
assert.strictEqual(typeof scope.calcularChanceLesaoPorFadiga, 'function', 'calcularChanceLesaoPorFadiga should exist');
assert.strictEqual(typeof scope.obterAlertaCargaCalendario, 'function', 'obterAlertaCargaCalendario should exist');
assert.strictEqual(typeof scope.definirFiltroCalendario, 'function', 'definirFiltroCalendario should exist');
assert.strictEqual(typeof scope.obterDiasCalendarioFiltrados, 'function', 'obterDiasCalendarioFiltrados should exist');

const carga = scope.calcularCargaCalendario(6);
assert.strictEqual(carga.jogosUltimos5, 3);
assert.strictEqual(carga.jogosContinentaisUltimos5, 1);
assert.strictEqual(carga.jogosDecisivosUltimos5, 1);
assert.strictEqual(carga.condicaoMediaElenco, 63);
assert.strictEqual(carga.nivel, 'CRITICA');
assert.ok(carga.indiceCarga >= 70, 'calendar load should be high for 3 games in 5 days and low squad condition');
assert.ok(carga.multiplicadorLesao > 1.5, 'injury multiplier should rise under critical load');
assert.ok(carga.fatorRecuperacao < 1, 'recovery factor should drop under critical load');
assert.ok(carga.fatorRecuperacao >= 0.78, 'calendar overload should not collapse recovery into a fatigue spiral');

const recuperacaoPosJogo = scope.calcularRecuperacaoFisicaDiaria(true, 6);
assert.ok(recuperacaoPosJogo < 28, 'post-match recovery should still be reduced by calendar overload');
assert.ok(recuperacaoPosJogo >= 20, 'recovery reduction should not collapse fitness recovery entirely');

const recuperacaoDiaLivre = scope.calcularRecuperacaoFisicaDiaria(false, 6);
assert.ok(recuperacaoDiaLivre >= recuperacaoPosJogo, 'rest days should recover at least as much as post-match days');

const quedaNormal = scope.calcularQuedaFisicaPorTick({ atributos: { fisico: 75 } }, 1);
const desgastePartidaCheia = quedaNormal * 45;
assert.ok(quedaNormal < 1, 'per-tick fatigue should allow a fit starter to survive a normal match sequence');
assert.ok(desgastePartidaCheia - recuperacaoPosJogo < 18, 'one congested match should not make an average starter unusable immediately');

const chanceNormal = scope.calcularChanceLesaoPorFadiga(50, { multiplicadorLesao: 1 });
const chanceSobrecarga = scope.calcularChanceLesaoPorFadiga(50, carga);
assert.ok(chanceSobrecarga > chanceNormal, 'calendar overload should increase injury risk for tired players');

const alerta = scope.obterAlertaCargaCalendario();
assert.ok(alerta, 'dashboard should expose an alert for overloaded decisive match days');
assert.strictEqual(alerta.nivel, 'CRITICA');
assert.strictEqual(scope.obterAlertaCargaCalendario(), alerta, 'calendar load alert should be memoized during a stable digest state');

function filteredIndices() {
  return JSON.stringify(scope.obterDiasCalendarioFiltrados().map(function(item) { return item.indice; }));
}

scope.definirFiltroCalendario('TODOS');
assert.strictEqual(scope.obterDiasCalendarioFiltrados().length, 7, 'all calendar days should be returned by default');

scope.definirFiltroCalendario('JOGOS');
assert.strictEqual(filteredIndices(), '[1,2,4,6]', 'JOGOS filter should return only player match days');

scope.definirFiltroCalendario('LIVRES');
assert.strictEqual(filteredIndices(), '[0,3,5]', 'LIVRES filter should return only days without player matches');

scope.definirFiltroCalendario('COPA');
assert.strictEqual(filteredIndices(), '[4,6]', 'COPA filter should return Copa do Brasil days');

scope.definirFiltroCalendario('FINANCEIRO');
assert.strictEqual(filteredIndices(), '[5]', 'FINANCEIRO filter should return financial closing days');

console.log('calendar_load.test.js passed');
