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
    idade: 20,
    salario: 20000,
    anosContrato: 2,
    condicaoFisica: 80,
    emCampo: true,
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

assert.strictEqual(typeof scope.criarInfraestruturaPadrao, 'function', 'infrastructure default helper should exist');
assert.strictEqual(typeof scope.normalizarInfraestruturaClube, 'function', 'infrastructure normalization helper should exist');
assert.strictEqual(typeof scope.iniciarUpgradeInfraestrutura, 'function', 'infrastructure upgrade helper should exist');
assert.strictEqual(typeof scope.processarInfraestruturaDia, 'function', 'infrastructure daily processing helper should exist');
assert.strictEqual(typeof scope.calcularFatorRecuperacaoInfraestrutura, 'function', 'infrastructure recovery factor helper should exist');
assert.strictEqual(typeof scope.calcularMultiplicadorComercialInfraestrutura, 'function', 'infrastructure commercial factor helper should exist');

const legacy = scope.migrarSave({
  saveVersion: 7,
  calendarioGeral: [],
  clubeAtualInfo: {
    id: 1,
    nome: 'Legado FC',
    orcamento: 1000000,
    nivelMedico: 2,
    estadio: {
      nome: 'Arena Legado',
      capacidade: 30000,
      obraEmAndamento: true,
      rodadasRestantesObra: 2
    }
  }
});

assert.strictEqual(legacy.saveVersion, 11, 'legacy save should migrate to contracts save version');
assert.ok(legacy.clubeAtualInfo.infraestrutura, 'legacy club should receive infrastructure state');
assert.strictEqual(legacy.clubeAtualInfo.infraestrutura.centroTreinamento.nivel, 1);
assert.strictEqual(legacy.clubeAtualInfo.infraestrutura.departamentoMedico.nivel, 2, 'legacy medical level should migrate into infrastructure');
assert.strictEqual(legacy.clubeAtualInfo.nivelMedico, 2, 'legacy medical mirror should remain compatible');
assert.strictEqual(legacy.clubeAtualInfo.infraestrutura.estadio.nivelConforto, 1);
assert.strictEqual(legacy.contextoExterno.imprensa.pressao, 40, 'legacy save should receive media pressure default');
assert.ok(legacy.clubeAtualInfo.base, 'legacy save should receive youth academy state');

scope.clubeAtual = {
  id: 1,
  nome: 'Meu Clube',
  sigla: 'MEU',
  reputacao: 78,
  divisao: 'A',
  orcamento: 30000000,
  nivelMedico: 2,
  estadio: { nome: 'Arena', capacidade: 30000, obraEmAndamento: false, rodadasRestantesObra: 0 },
  olheiros: []
};
scope.clubes = [scope.clubeAtual];
scope.elencoAtual = [jogador(10, 1, 'Jovem', 'MEI', 70, { xpTemporada: 40, potencial: 82 })];
scope.jogadores = scope.elencoAtual.slice();
scope.financasHistorico = [];
scope.caixaEntrada = [];
scope.diaAtual = 0;
scope.calendarioGeral = [{ tipo: 'TREINO', titulo: 'Treino Livre' }];
scope.configFinanceira = { precoIngresso: 80, marketingAtivo: 0 };
scope.verificarVariaveisExtras();

assert.strictEqual(scope.clubeAtual.infraestrutura.departamentoMedico.nivel, 2, 'normalization should sync legacy medical level');
assert.strictEqual(scope.clubeAtual.nivelMedico, 2, 'legacy medical level should stay mirrored');
assert.ok(Array.isArray(scope.infraestruturaResumo.cards), 'infrastructure dashboard summary should be precomputed');

const recoveryBase = scope.calcularFatorRecuperacaoInfraestrutura();
const commercialBase = scope.calcularMultiplicadorComercialInfraestrutura();
const recuperacaoDiariaBase = scope.calcularRecuperacaoFisicaDiaria(false, 1);

const upgrade = scope.iniciarUpgradeInfraestrutura('centroTreinamento');
assert.ok(upgrade, 'training center upgrade should start');
assert.strictEqual(scope.clubeAtual.infraestrutura.centroTreinamento.obraEmAndamento, true);
assert.ok(scope.clubeAtual.infraestrutura.centroTreinamento.diasRestantes > 0, 'upgrade should have duration');
const budgetAfterUpgrade = scope.clubeAtual.orcamento;
const duplicate = scope.iniciarUpgradeInfraestrutura('centroTreinamento');
assert.strictEqual(duplicate, null, 'same area should not start a duplicate upgrade');
assert.strictEqual(scope.clubeAtual.orcamento, budgetAfterUpgrade, 'duplicate upgrade should not charge budget');

while (scope.clubeAtual.infraestrutura.centroTreinamento.obraEmAndamento) {
  scope.processarInfraestruturaDia();
}

assert.strictEqual(scope.clubeAtual.infraestrutura.centroTreinamento.nivel, 2, 'upgrade should increase training center level');
assert.ok(scope.calcularFatorRecuperacaoInfraestrutura() > recoveryBase, 'training center level should improve recovery factor');
assert.ok(scope.calcularFatorRecuperacaoInfraestrutura() <= 1.1, 'recovery factor should stay conservative');

scope.clubeAtual.infraestrutura.comercial.nivel = 2;
scope.atualizarResumoInfraestrutura();
assert.ok(scope.calcularMultiplicadorComercialInfraestrutura() > commercialBase, 'commercial level should increase revenue factor');
assert.ok(scope.calcularMultiplicadorComercialInfraestrutura() <= 1.15, 'commercial revenue factor should stay conservative');

const recuperacaoNivel2 = scope.calcularRecuperacaoFisicaDiaria(false, 1);
assert.ok(recuperacaoNivel2 > recuperacaoDiariaBase, 'daily recovery should include training center bonus');

scope.salvarJogoSilencioso();
const saved = JSON.parse(storage.value);
assert.strictEqual(saved.saveVersion, 11, 'save should persist contracts version');
assert.strictEqual(saved.clubeAtualInfo.infraestrutura.centroTreinamento.nivel, 2, 'save should persist infrastructure levels');
assert.strictEqual(saved.clubeAtualInfo.infraestrutura.comercial.nivel, 2, 'save should persist commercial level');
assert.strictEqual(saved.clubeAtualInfo.nivelMedico, saved.clubeAtualInfo.infraestrutura.departamentoMedico.nivel, 'save should keep medical mirror compatible');
assert.strictEqual(saved.contextoExterno.torcida.humor, scope.contextoExterno.torcida.humor, 'save should persist fan mood');
assert.ok(saved.clubeAtualInfo.base, 'save should persist youth academy state');

console.log('infrastructure_v2.test.js passed');
