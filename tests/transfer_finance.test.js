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

scope.tipoNegociacao = 'compra';
scope.ofertaValores = { clube: 900000, entrada: 100000, parcelas: 4, intervaloDias: 7, luvas: 50000, salario: 10000 };
const impacto = scope.obterImpactoFinanceiroNegociacao();
assert.strictEqual(impacto.entrada, 100000, 'preview should use only the negotiated entry as immediate transfer cost');
assert.strictEqual(impacto.luvas, 50000, 'preview should include signing bonuses in immediate cost');
assert.strictEqual(impacto.compromissoRestante, 800000, 'preview should expose the future transfer commitment');
assert.strictEqual(impacto.parcelaMedia, 200000, 'preview should calculate the average installment');
assert.ok(scope.obterTetoOfertaTransferencia(scope.elencoAtual[0]) >= 900000, 'offer slider should allow values above current cash when using installments');

const bonusJogadorHumano = scope.elencoAtual[0];
bonusJogadorHumano.bonusPorJogo = 2000;
clubeHumano.orcamento = 1000;
const bonusPagoHumano = scope.processarBonusContratualPartida([bonusJogadorHumano], 'Empate', { telemetriaShots: [] });
assert.strictEqual(bonusPagoHumano, 1000, 'human club should pay only the available cash when a bonus is due');
assert.strictEqual(bonusJogadorHumano.bonusRecebidosTemporada, 1000, 'player should record only the paid bonus amount');
assert.strictEqual(bonusJogadorHumano.bonusContratuaisPendentes, 1000, 'unpaid human bonus should remain pending');

clubeCpu.reputacao = 41;
clubeCpu.bloqueioMercadoAteDia = 20;
const cpuElenco = scope.jogadores.filter((jogador) => jogador.clubeId === clubeCpu.id);
cpuElenco.forEach((jogador) => { jogador.bonusPorJogo = 1000; jogador.bonusVitoria = 500; });
const cpuAntes = clubeCpu.orcamento;
const cpuPago = scope.processarBonusContratualCPU(clubeCpu, 'Vitoria', 1);
assert.ok(cpuPago >= 16500, 'CPU match should settle appearance and win bonuses');
assert.strictEqual(clubeCpu.orcamento, cpuAntes - cpuPago, 'CPU contract bonuses should debit its budget');
assert.strictEqual(clubeCpu.bonusContratuaisTemporada, cpuPago, 'CPU bonus ledger should record settled payments');
clubeCpu.bonusContratuaisPendentes = 2500;

const clubeDestinoEmprestimo = scope.clubes.find((clube) => clube.id !== clubeHumano.id && clube.id !== clubeCpu.id);
const jogadorEmprestadoCpu = cpuElenco[0];
const emprestimoCpu = { id: 'loan_cpu_test', jogadorId: jogadorEmprestadoCpu.id, clubeOrigemId: clubeCpu.id, clubeDestinoId: clubeDestinoEmprestimo.id, clubeDestinoNome: clubeDestinoEmprestimo.nome, diasRestantes: 1, jogos: 10, minutos: 700, gols: 2, evolucao: 2, status: 'ativo', cpu: true, opcaoCompra: 500000, opcaoCompraEntrada: 125000, opcaoCompraParcelas: 3, opcaoCompraIntervaloDias: 30 };
jogadorEmprestadoCpu.clubeId = clubeDestinoEmprestimo.id;
scope.emprestimosAtivos.push(emprestimoCpu);
scope.processarEmprestimosDia();
assert.strictEqual(emprestimoCpu.status, 'comprado', 'CPU should exercise a successful loan purchase option');
assert.strictEqual(jogadorEmprestadoCpu.clubeId, clubeDestinoEmprestimo.id, 'purchased loan player should remain with the destination club');
assert.ok(scope.compromissosTransferencias.some((item) => item.jogadorId === jogadorEmprestadoCpu.id), 'CPU loan purchase should create future installments');
scope.salvarJogoSilencioso();
const save = JSON.parse(scope.__storage.reiDaPranchetaSave);
assert.ok(Array.isArray(save.compromissosTransferencias), 'save should preserve transfer commitments');
assert.strictEqual(save.compromissosTransferencias[0].valorRestante, 800000);
assert.strictEqual(save.estadosFinanceirosClubes[clubeCpu.id].reputacao, 41);
assert.strictEqual(save.estadosFinanceirosClubes[clubeCpu.id].bloqueioMercadoAteDia, 20);
assert.strictEqual(save.estadosFinanceirosClubes[clubeCpu.id].bonusContratuaisTemporada, cpuPago);
assert.strictEqual(save.estadosFinanceirosClubes[clubeCpu.id].bonusContratuaisPendentes, 2500);

scope.diaAtual = 7;
clubeHumano.orcamento = antes;
scope.processarParcelasTransferenciasDia();
assert.strictEqual(compromisso.valorRestante, 600000, 'calendar should settle one installment');
assert.strictEqual(clubeHumano.orcamento, antes - 200000, 'installment should debit the current club');
console.log('transfer_finance.test.js passed');
