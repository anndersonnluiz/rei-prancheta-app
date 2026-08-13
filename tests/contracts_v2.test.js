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
    moral: 70,
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

assert.strictEqual(typeof scope.normalizarEstadoContratoJogador, 'function', 'contract normalization helper should exist');
assert.strictEqual(typeof scope.calcularStatusContratoJogador, 'function', 'contract status helper should exist');
assert.strictEqual(typeof scope.calcularSalarioDesejadoJogador, 'function', 'desired salary helper should exist');
assert.strictEqual(typeof scope.revisarContratosElencoDia, 'function', 'daily contract review helper should exist');
assert.strictEqual(typeof scope.atualizarResumoContratos, 'function', 'contract summary helper should exist');
assert.strictEqual(typeof scope.aplicarRenovacaoContratoJogador, 'function', 'contract renewal helper should exist');

const legado = jogador(1, 1, 'Legado', 'MEI', 76, { salario: 15000, anosContrato: 1 });
const migrated = scope.migrarSave({ saveVersion: 10, calendarioGeral: [], elencoAtual: [legado], jogadores: [jogador(2, 2, 'Global', 'ATA', 72)] });
assert.strictEqual(migrated.saveVersion, 11, 'legacy save should migrate to contracts save version');
assert.ok(migrated.elencoAtual[0].salarioDesejado >= migrated.elencoAtual[0].salario, 'legacy player should receive desired salary');
assert.strictEqual(migrated.elencoAtual[0].statusContrato, 'urgente', 'one-year contract should be urgent');
assert.ok(typeof migrated.elencoAtual[0].satisfacaoContrato === 'number', 'legacy player should receive contract satisfaction');
assert.ok(typeof migrated.elencoAtual[0].valorMercadoDinamico === 'number', 'legacy player should receive dynamic market value');

assert.strictEqual(scope.calcularStatusContratoJogador({ anosContrato: 3 }), 'seguro');
assert.strictEqual(scope.calcularStatusContratoJogador({ anosContrato: 2 }), 'monitorar');
assert.strictEqual(scope.calcularStatusContratoJogador({ anosContrato: 1 }), 'urgente');
assert.strictEqual(scope.calcularStatusContratoJogador({ anosContrato: 0 }), 'pre-contrato');

const valorizado = jogador(10, 1, 'Valorizado', 'ATA', 82, {
  salario: 12000,
  anosContrato: 1,
  moral: 92,
  jogosTemporada: 28,
  minutosTemporada: 2300,
  evolucaoTemporada: 4
});
scope.clubeAtual = { id: 1, nome: 'Meu Clube', sigla: 'MEU', reputacao: 78, divisao: 'A', orcamento: 1000000, estadio: { capacidade: 30000 }, olheiros: [] };
scope.clubes = [scope.clubeAtual];
scope.elencoAtual = [valorizado];
scope.jogadores = [valorizado];
scope.caixaEntrada = [];
scope.noticiasFeed = [];
scope.diaAtual = 10;
scope.calendarioGeral = [{ tipo: 'TREINO', titulo: 'Treino Livre' }];
scope.verificarVariaveisExtras();

const salarioDesejadoAntes = valorizado.salarioDesejado;
scope.revisarContratosElencoDia();
assert.ok(valorizado.salarioDesejado > salarioDesejadoAntes, 'contract review should increase desired salary for valued player');
assert.ok(valorizado.salarioDesejado <= Math.ceil(salarioDesejadoAntes * 1.08), 'desired salary increase should stay gradual');
assert.strictEqual(valorizado.statusContrato, 'urgente', 'short contract should remain urgent');
assert.ok(valorizado.satisfacaoContrato < 70, 'underpaid important player should lose contract satisfaction');

scope.aplicarRenovacaoContratoJogador(valorizado, valorizado.salarioDesejado, 3);
assert.strictEqual(valorizado.anosContrato, 3, 'renewal should update years');
assert.strictEqual(valorizado.statusContrato, 'seguro', 'renewal should restore secure status');
assert.ok(valorizado.satisfacaoContrato >= 85, 'renewal should restore contract satisfaction');

scope.clubeAtual.base = scope.criarBasePadrao();
const atletaBase = scope.gerarAtletaBase('contrato', 0);
scope.clubeAtual.base.atletas = [atletaBase];
scope.atualizarResumoBase();
const promovido = scope.promoverAtletaBase(atletaBase.id);
assert.ok(promovido.salario > 0, 'promoted youth should receive non-zero salary');
assert.ok(promovido.anosContrato >= 2, 'promoted youth should receive coherent initial contract');
assert.ok(promovido.salarioDesejado >= promovido.salario, 'promoted youth should be contract-normalized');
assert.ok(['seguro', 'monitorar', 'urgente', 'pre-contrato'].indexOf(promovido.statusContrato) !== -1, 'promoted youth should have contract status');

scope.salvarJogoSilencioso();
const saved = JSON.parse(storage.value);
assert.strictEqual(saved.saveVersion, 11, 'save should persist contracts version');
assert.ok(saved.elencoAtual[0].salarioDesejado !== undefined, 'save should persist desired salary');
assert.ok(saved.elencoAtual[0].statusContrato, 'save should persist contract status');
assert.ok(saved.elencoAtual[0].valorMercadoDinamico !== undefined, 'save should persist dynamic market value');

console.log('contracts_v2.test.js passed');
