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

const scope = createControllerScope();

assert.strictEqual(typeof scope.migrarSave, 'function', 'migrarSave should exist');

const libertadores = { grupos: [{ nome: 'A', times: [] }], mataMata: [] };
const sulAmericana = { grupos: [{ nome: 'B', times: [] }], mataMata: [] };
const jogadorLinha = {
  id: 10,
  nome: 'Meia Antigo',
  posicao: 'MEI',
  atributos: {
    finalizacao: 82,
    passe: 77,
    marcacao: 55,
    velocidade: 73,
    fisico: 70,
    penalti: 91
  }
};
const goleiro = {
  id: 1,
  nome: 'Goleiro Antigo',
  posicao: 'GOL',
  atributos: {
    reflexo: 88,
    passe: 62,
    fisico: 79
  }
};

scope.jogadores = [
  {
    id: 99,
    nome: 'Base Antiga',
    posicao: 'ATA',
    atributos: {
      finalizacao: 80,
      passe: 60,
      fisico: 75
    }
  }
];

const oldSave = {
  nomeTreinador: 'Professor Legado',
  clubeAtualId: 123,
  calendarioGeral: [
    { tipo: 'LIGA', titulo: 'Brasileirao - Rodada 1', rodadaLiga: 0 },
    { tipo: 'CONTINENTAL', titulo: 'Libertadores - Grupo', fase: 0 }
  ],
  elencoAtual: [goleiro, jogadorLinha],
  libertadores,
  sulAmericana,
  ultimoResumoPartida: undefined
};

const migrated = scope.migrarSave(oldSave);

assert.strictEqual(migrated.saveVersion, 5, 'legacy save should be upgraded to current save version');
assert.ok(typeof migrated.savedAt === 'string' && migrated.savedAt.length > 0, 'migration should stamp savedAt for old saves');
assert.ok(Array.isArray(migrated.telemetriaHistorico), 'legacy save should receive telemetry history array');
assert.strictEqual(migrated.telemetriaHistorico.length, 0, 'legacy telemetry history should start empty');
assert.ok(Array.isArray(migrated.transferenciasHistorico), 'legacy save should receive transfer history array');
assert.strictEqual(migrated.transferenciasHistorico.length, 0, 'legacy transfer history should start empty');
assert.ok(Array.isArray(migrated.propostasPendentes), 'legacy save should receive pending proposals array');
assert.strictEqual(migrated.propostasPendentes.length, 0, 'legacy pending proposals should start empty');
assert.strictEqual(migrated.ultimoResumoPartida, null, 'missing last tactical summary should become null');
assert.ok(Array.isArray(migrated.relatorioEvolucao), 'legacy save should receive evolution report array');
assert.strictEqual(migrated.relatorioEvolucao.length, 0, 'legacy evolution report should start empty');
assert.strictEqual(migrated.ultimoDiaEvolucao, 0, 'legacy save should receive last evolution day');
assert.strictEqual(migrated.filtroCalendario, 'TODOS', 'calendar filter should reset to stable default');
assert.strictEqual(migrated.calendarioFiltrado, undefined, 'derived filtered calendar should not be persisted by migration');
assert.strictEqual(migrated.proximosEventosOffsets, undefined, 'derived upcoming offsets should not be persisted by migration');
assert.strictEqual(migrated.libertadores, libertadores, 'existing Libertadores data should be preserved');
assert.strictEqual(migrated.sulAmericana, sulAmericana, 'existing Sul-Americana data should be preserved');

const migratedGoleiro = migrated.elencoAtual[0];
assert.strictEqual(migratedGoleiro.condicaoFisica, 100);
assert.strictEqual(migratedGoleiro.cartoesAmarelos, 0);
assert.strictEqual(migratedGoleiro.lesionado, false);
assert.strictEqual(migratedGoleiro.diasLesao, 0);
assert.strictEqual(migratedGoleiro.suspenso, false);
assert.strictEqual(migratedGoleiro.substituidoNaPartida, false);
assert.ok(typeof migratedGoleiro.potencial === 'number', 'goalkeeper should receive potential');
assert.strictEqual(migratedGoleiro.xpTemporada, 0);
assert.strictEqual(migratedGoleiro.jogosTemporada, 0);
assert.strictEqual(migratedGoleiro.minutosTemporada, 0);
assert.strictEqual(migratedGoleiro.evolucaoTemporada, 0);
assert.ok(Array.isArray(migratedGoleiro.historicoEvolucao), 'goalkeeper should receive evolution history');
assert.strictEqual(migratedGoleiro.atributos.posicionamento, 88, 'goalkeeper positioning should fall back to reflexo');
assert.strictEqual(migratedGoleiro.atributos.distribuicao, 62, 'goalkeeper distribution should fall back to passe');

const migratedLinha = migrated.elencoAtual[1];
assert.strictEqual(migratedLinha.atributos.penalti, 91, 'existing penalty attribute must not be overwritten');
assert.strictEqual(migratedLinha.atributos.escanteio, 77, 'corner attribute should fall back to passe');
assert.strictEqual(migratedLinha.atributos.cobrador, 80, 'free-kick taker should fall back to finalizacao/passe average');

assert.strictEqual(scope.jogadores[0].atributos.penalti, 80, 'base players should also be migrated');
assert.strictEqual(scope.jogadores[0].atributos.escanteio, 60, 'base player corner fallback should use passe');
assert.strictEqual(scope.jogadores[0].atributos.cobrador, 70, 'base player taker fallback should use average');

const snapshot = JSON.stringify(migrated);
const migratedAgain = scope.migrarSave(migrated);
assert.strictEqual(migratedAgain, migrated, 'migration should mutate and return the same save object');
assert.strictEqual(JSON.stringify(migratedAgain), snapshot, 'migration should be idempotent');

console.log('save_migration.test.js passed');
