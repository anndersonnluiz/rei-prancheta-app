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

const { scope, storage } = createControllerHarness();

assert.strictEqual(typeof scope.criarBasePadrao, 'function', 'youth academy default helper should exist');
assert.strictEqual(typeof scope.normalizarBaseClube, 'function', 'youth academy normalization helper should exist');
assert.strictEqual(typeof scope.gerarAtletaBase, 'function', 'youth athlete generation helper should exist');
assert.strictEqual(typeof scope.atualizarResumoBase, 'function', 'youth academy summary helper should exist');
assert.strictEqual(typeof scope.promoverAtletaBase, 'function', 'youth promotion helper should exist');
assert.strictEqual(typeof scope.dispensarAtletaBase, 'function', 'youth dismissal helper should exist');
assert.strictEqual(typeof scope.classificarStatusBase, 'function', 'youth status helper should exist');

const migrated = scope.migrarSave({
  saveVersion: 9,
  calendarioGeral: [],
  clubeAtualInfo: {
    id: 1,
    nome: 'Legado FC',
    orcamento: 1000000,
    estadio: { capacidade: 30000 }
  }
});

assert.strictEqual(migrated.saveVersion, 11, 'legacy save should migrate to contracts save version');
assert.ok(migrated.clubeAtualInfo.base, 'legacy club should receive youth academy state');
assert.ok(Array.isArray(migrated.clubeAtualInfo.base.atletas), 'youth athletes should be an array');
assert.strictEqual(migrated.clubeAtualInfo.base.ultimoCicloDia, 0);
assert.strictEqual(migrated.clubeAtualInfo.base.ultimoGeracaoDia, 0);
assert.strictEqual(migrated.clubeAtualInfo.base.resumo.total, 0);

scope.clubeAtual = {
  id: 1,
  nome: 'Meu Clube',
  sigla: 'MEU',
  reputacao: 78,
  divisao: 'A',
  orcamento: 1000000,
  estadio: { capacidade: 30000 },
  infraestrutura: {
    centroTreinamento: { nivel: 2, obraEmAndamento: false, diasRestantes: 0 },
    departamentoMedico: { nivel: 1, obraEmAndamento: false, diasRestantes: 0 },
    comercial: { nivel: 1, obraEmAndamento: false, diasRestantes: 0 },
    estadio: { nivelConforto: 1 },
    ultimoResumoDia: 0
  },
  olheiros: []
};
scope.clubes = [scope.clubeAtual];
scope.elencoAtual = [];
scope.jogadores = [];
scope.caixaEntrada = [];
scope.noticiasFeed = [];
scope.diaAtual = 0;
scope.calendarioGeral = [{ tipo: 'TREINO', titulo: 'Treino Livre' }];
scope.verificarVariaveisExtras();

assert.ok(scope.clubeAtual.base, 'club should receive youth academy state during normalization');
assert.ok(Array.isArray(scope.baseResumo.atletasVisiveis), 'visible youth list should be precomputed');

const atleta = scope.gerarAtletaBase('teste', 0);
assert.ok(String(atleta.id).indexOf('base_') === 0, 'generated youth athlete should have stable base id');
assert.ok(atleta.idade >= 16 && atleta.idade <= 19, 'generated youth age should be in range');
assert.ok(atleta.potencial >= 60 && atleta.potencial <= 90, 'generated youth potential should be bounded');
assert.ok(['comum', 'promissor', 'joia'].indexOf(atleta.statusBase) !== -1, 'generated youth should have readable status');
assert.ok(atleta.atributos && typeof atleta.atributos.finalizacao === 'number', 'generated youth should have player-compatible attributes');

scope.clubeAtual.base.atletas = [atleta];
scope.atualizarResumoBase();
assert.strictEqual(scope.clubeAtual.base.resumo.total, 1, 'summary should count youth athletes');
assert.strictEqual(scope.baseResumo.total, 1, 'precomputed dashboard summary should mirror youth total');
assert.strictEqual(scope.baseResumo.atletasVisiveis.length, 1, 'visible youth list should be precomputed');

const promovido = scope.promoverAtletaBase(atleta.id);
assert.ok(promovido, 'promotion should return promoted player');
assert.strictEqual(scope.clubeAtual.base.atletas.length, 0, 'promotion should remove player from academy');
assert.ok(scope.elencoAtual.some((j) => j.id === atleta.id), 'promotion should add player to senior squad');
assert.ok(scope.jogadores.some((j) => j.id === atleta.id), 'promotion should sync player into global database');

const dispensado = scope.gerarAtletaBase('dispensa', 1);
scope.clubeAtual.base.atletas = [dispensado];
scope.atualizarResumoBase();
scope.dispensarAtletaBase(dispensado.id);
assert.strictEqual(scope.clubeAtual.base.atletas.length, 0, 'dismissal should remove player from academy');

scope.clubeAtual.base.atletas = [scope.gerarAtletaBase('save', 2)];
scope.atualizarResumoBase();
scope.salvarJogoSilencioso();
const saved = JSON.parse(storage.value);
assert.strictEqual(saved.saveVersion, 11, 'save should persist contracts version');
assert.strictEqual(saved.clubeAtualInfo.base.atletas.length, 1, 'save should persist youth academy athletes');
assert.strictEqual(saved.clubeAtualInfo.base.resumo.total, 1, 'save should persist youth academy summary');

console.log('youth_academy_v2.test.js passed');
