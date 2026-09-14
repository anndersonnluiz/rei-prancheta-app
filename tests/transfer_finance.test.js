const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createScope() {
  const appStub = { directive() { return appStub; }, controller(name, fn) { appStub.controllerFn = fn; return appStub; } };
  const storage = {};
  const context = {
    angular: { module() { return appStub; }, copy(value) { return JSON.parse(JSON.stringify(value)); } },
    window: { localStorage: { getItem(key) { return storage[key] || null; }, setItem(key, value) { storage[key] = value; }, removeItem(key) { delete storage[key]; } }, URL: { createObjectURL() { return 'blob:test'; }, revokeObjectURL() {} }, AudioContext: function AudioContext() { this.state = 'suspended'; } },
    document: { getElementById() { return null; }, createElement() { return { click() {}, setAttribute() {} }; }, body: { appendChild() {}, removeChild() {} } },
    alert() {}, confirm() { return true; }, console, Date, Math, setTimeout, clearTimeout,
    Blob: function Blob() {}
  };
  const appPath = path.join(__dirname, '..', 'js', 'app.js');
  vm.runInNewContext(fs.readFileSync(appPath, 'utf8'), context, { filename: appPath });
  const scope = {};
  appStub.controllerFn(scope, { get() { throw new Error('Unexpected HTTP request'); } }, function() {});
  scope.__storage = storage;
  return scope;
}

const scope = createScope();
scope.clubes = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'clubes.json'), 'utf8'));
scope.jogadores = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'jogadores.json'), 'utf8'));
scope.iniciarNovoJogo(scope.clubes[0]);

const clubeHumano = scope.clubeAtual;
const clubeCpu = scope.clubes.find((clube) => clube.id !== clubeHumano.id);
const antes = clubeHumano.orcamento;
const compromisso = scope.criarParcelamentoTransferencia({
  valor: 900000,
  entrada: 100000,
  parcelas: 4,
  intervaloDias: 7,
  jogadorId: scope.elencoAtual[0].id,
  jogadorNome: scope.elencoAtual[0].nome,
  clubeCredorId: clubeCpu.id,
  clubeDevedorId: clubeHumano.id
});
assert.strictEqual(compromisso.valorRestante, 800000);
assert.strictEqual(compromisso.parcelasRestantes, 4);
assert.strictEqual(scope.obterExposicaoTransferencias(clubeHumano.id), 800000);

clubeCpu.reputacao = 41;
clubeCpu.bloqueioMercadoAteDia = 20;
scope.salvarJogoSilencioso();
const save = JSON.parse(scope.__storage.reiDaPranchetaSave);
assert.ok(Array.isArray(save.compromissosTransferencias), 'save should preserve transfer commitments');
assert.strictEqual(save.compromissosTransferencias[0].valorRestante, 800000);
assert.strictEqual(save.estadosFinanceirosClubes[clubeCpu.id].reputacao, 41);
assert.strictEqual(save.estadosFinanceirosClubes[clubeCpu.id].bloqueioMercadoAteDia, 20);

scope.diaAtual = 7;
clubeHumano.orcamento = antes;
scope.processarParcelasTransferenciasDia();
assert.strictEqual(compromisso.valorRestante, 600000, 'calendar should settle one installment');
assert.strictEqual(clubeHumano.orcamento, antes - 200000, 'installment should debit the current club');
console.log('transfer_finance.test.js passed');
