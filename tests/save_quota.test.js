const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createHarness(quotaBytes) {
  const storage = {};
  const appStub = {
    directive() { return appStub; },
    controller(name, fn) { appStub.controllerFn = fn; return appStub; }
  };
  function AudioContextStub() {}
  AudioContextStub.prototype.createOscillator = function() { return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; };
  AudioContextStub.prototype.createGain = function() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; };
  AudioContextStub.prototype.resume = function() {};

  function tamanhoStorageCom(chave, valor) {
    const totalExistente = Object.keys(storage).reduce(function(total, item) {
      return total + (item === chave ? String(valor).length : String(storage[item]).length);
    }, 0);
    return totalExistente + (storage[chave] === undefined ? String(valor).length : 0);
  }

  const context = {
    angular: { module() { return appStub; }, copy(value) { return JSON.parse(JSON.stringify(value)); } },
    window: {
      AudioContext: AudioContextStub,
      webkitAudioContext: AudioContextStub,
      localStorage: {
        getItem(key) { return storage[key] === undefined ? null : storage[key]; },
        setItem(key, value) {
          const texto = String(value);
          if (tamanhoStorageCom(key, texto) > quotaBytes) {
            const erro = new Error('Setting the value exceeded the quota');
            erro.name = 'QuotaExceededError';
            erro.code = 22;
            throw erro;
          }
          storage[key] = texto;
        },
        removeItem(key) { delete storage[key]; }
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
  vm.runInNewContext(fs.readFileSync(appPath, 'utf8'), context, { filename: appPath });
  const scope = {};
  appStub.controllerFn(scope, { get() { throw new Error('Unexpected HTTP request'); } }, function() {});
  return { scope, storage };
}

const { scope, storage } = createHarness(280000);
scope.clubeAtual = {
  id: 1,
  nome: 'Meu Clube',
  sigla: 'MEU',
  divisao: 'A',
  reputacao: 70,
  orcamento: 1000000,
  estadio: { capacidade: 30000 },
  infraestrutura: {},
  olheiros: [],
  base: { atletas: [], ultimoCicloDia: 0, ultimoGeracaoDia: 0, resumo: { total: 0, promessas: 0, melhorJovem: null } }
};
scope.clubes = [scope.clubeAtual];
scope.elencoAtual = [{ id: 1, nome: 'Atacante', clubeId: 1, posicao: 'ATA', idade: 25, atributos: { finalizacao: 70, velocidade: 70, passe: 60, fisico: 70 } }];
scope.jogadores = scope.elencoAtual;
scope.calendario = [];
scope.calendarioGeral = [];
scope.jogosCPU = [];
scope.tabelas = { A: [], B: [], C: [], D: [] };
scope.historicoPartidas = Array.from({ length: 300 }, function(_, index) {
  return { dia: index, observacao: 'x'.repeat(1000) };
});
scope.historicoTreinador = [];
scope.historicoDecisoesGestao = [];
scope.historicoReputacaoClubes = [];
scope.historicoFinanceiroMensal = {};
scope.financasHistorico = [];
scope.caixaEntrada = [];
scope.noticiasFeed = [];
scope.telemetriaHistorico = [];
scope.transferenciasHistorico = [];
scope.relatorioEvolucao = [];
scope.emprestimosAtivos = [];
scope.compromissosTransferencias = [];
scope.verificarVariaveisExtras();

const saveResultado = scope.salvarJogoSilencioso();
assert.strictEqual(saveResultado, true, 'save should fall back to compact history when quota is exceeded');
assert.strictEqual(scope.statusPersistenciaSave.sucesso, true);
assert.strictEqual(scope.statusPersistenciaSave.compacto, true);

const save = JSON.parse(storage.reiDaPranchetaSave);
assert.strictEqual(save.historicoPartidas.length, 120, 'compact save should keep the newest match history window');
const slots = JSON.parse(storage.reiDaPranchetaSaveSlots);
assert.strictEqual(slots['0'].__reiDaPranchetaSlotRef, 'reiDaPranchetaSave', 'slot 0 should reference the canonical save instead of duplicating it');
assert.strictEqual(scope.carregarSlot(0), true, 'referenced slot should load the canonical save');

console.log('save_quota.test.js passed');
