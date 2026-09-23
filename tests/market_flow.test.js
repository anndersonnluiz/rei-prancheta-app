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

assert.strictEqual(typeof scope.registrarTransferenciaHistorico, 'function', 'transfer history helper should exist');
assert.strictEqual(typeof scope.registrarOuAtualizarProposta, 'function', 'proposal helper should exist');
assert.strictEqual(typeof scope.atualizarPropostasPendentes, 'function', 'proposal expiration helper should exist');
assert.ok(require('fs').readFileSync('js/app.js', 'utf8').includes('Pré-contrato efetivado'), 'pre-contract acceptance should notify the manager');
assert.ok(require('fs').readFileSync('js/app.js', 'utf8').includes('Salário abaixo da exigência do jogador.'), 'pre-contract rejection should have a reason');
assert.ok(require('fs').readFileSync('js/app.js', 'utf8').includes('clube_contraproposta'), 'club negotiation should support counteroffers');
assert.ok(require('fs').readFileSync('index.html', 'utf8').includes('O clube fez uma contraproposta'), 'counteroffer should be visible in the negotiation modal');

scope.dados = { anoAtual: 2026 };
scope.diaAtual = 4;
scope.calendarioGeral = [{ titulo: 'Dia 1' }, { titulo: 'Dia 2' }, { titulo: 'Dia 3' }, { titulo: 'Dia 4' }, { titulo: 'Dia 5' }];
scope.clubeAtual = { id: 1, nome: 'Meu Clube', divisao: 'A', reputacao: 95, orcamento: 100000000 };
scope.clubes = [scope.clubeAtual, { id: 2, nome: 'Outro Clube', divisao: 'B', reputacao: 70, orcamento: 30000000 }];

assert.strictEqual(typeof scope.obterPerfilClubeCpu, 'function', 'club market profile helper should exist');
assert.strictEqual(typeof scope.obterDiagnosticoNecessidadesClube, 'function', 'squad needs diagnostic helper should exist');
const perfilElite = scope.obterPerfilClubeCpu(scope.clubeAtual);
assert.strictEqual(perfilElite.nivelCompetitivo, 'elite', 'high reputation Serie A club should be classified as elite');
assert.ok(perfilElite.limiteInvestimentoVista > 0, 'club profile should expose a cash investment limit');
assert.deepStrictEqual(perfilElite, scope.obterPerfilClubeCpu(scope.clubeAtual), 'club profile should be deterministic for the same state');

scope.jogadores = [
  { id: 'perfil-goleiro', nome: 'Goleiro Teste', clubeId: 1, posicao: 'GOL', atributos: { reflexo: 74, posicionamento: 74, distribuicao: 74, fisico: 74 } }
];
const diagnostico = scope.obterDiagnosticoNecessidadesClube(scope.clubeAtual.id);
const diagnosticoGoleiros = diagnostico.setores.find((setor) => setor.posicao === 'GOL');
assert.strictEqual(diagnosticoGoleiros.quantidade, 1, 'diagnostic should count players by position');
assert.ok(diagnosticoGoleiros.deficitDisponibilidade > 0, 'diagnostic should identify a critical depth shortage');
assert.ok(diagnostico.prioridades.some((setor) => setor.posicao === 'GOL'), 'critical positions should be promoted to priorities');
assert.ok(diagnostico.resumo.length > 0, 'diagnostic should provide a human-readable summary');

const jogadorBase = { id: 7, nome: 'Meia Teste', clubeId: 2, emNegociacao: true, salario: 20000, anosContrato: 2 };
const jogadorElenco = { id: 7, nome: 'Meia Teste', clubeId: 1, emNegociacao: true, salario: 20000, anosContrato: 2 };
scope.jogadores = [jogadorBase];
scope.elencoAtual = [jogadorElenco];

scope.propostasPendentes = [{
  id: 'p1',
  tipo: 'compra',
  status: 'em_jogador',
  jogadorId: 7,
  jogadorNome: 'Meia Teste',
  clubeOrigemId: 2,
  clubeDestinoId: 1,
  diaCriacao: 1,
  validadeDias: 3
}];

scope.atualizarPropostasPendentes();
assert.strictEqual(scope.propostasPendentes[0].status, 'expirada', 'old proposal should expire');
assert.strictEqual(scope.propostasPendentes[0].diasRestantes, 0, 'expired proposal should have zero days left');
assert.strictEqual(jogadorBase.emNegociacao, false, 'base player negotiation lock should be released');
assert.strictEqual(jogadorElenco.emNegociacao, false, 'squad player negotiation lock should be released');

scope.transferenciasHistorico = [];
const transferencia = {
  tipo: 'compra',
  jogadorId: 7,
  jogadorNome: 'Meia Teste',
  clubeOrigemId: 2,
  clubeDestinoId: 1,
  valor: 500000,
  entrada: 100000,
  parcelas: 4,
  intervaloDias: 30,
  luvas: 25000,
  opcaoCompra: 600000,
  salario: 30000,
  anosContrato: 3
};

const primeiroRegistro = scope.registrarTransferenciaHistorico(transferencia);
const segundoRegistro = scope.registrarTransferenciaHistorico(transferencia);
assert.strictEqual(primeiroRegistro, segundoRegistro, 'same transfer should reuse existing history item');
assert.strictEqual(scope.transferenciasHistorico.length, 1, 'same transfer should not be duplicated');
assert.strictEqual(scope.transferenciasHistoricoVisivel.length, 1, 'visible transfer history should be stable');
assert.strictEqual(primeiroRegistro.entrada, 100000, 'transfer history should preserve entry value');
assert.strictEqual(primeiroRegistro.parcelas, 4, 'transfer history should preserve installments');
assert.strictEqual(primeiroRegistro.luvas, 25000, 'transfer history should preserve signing bonus');

const proposta = scope.registrarOuAtualizarProposta({
  tipo: 'compra',
  status: 'em_clube',
  jogadorId: 7,
  jogadorNome: 'Meia Teste',
  clubeOrigemId: 2,
  clubeDestinoId: 1,
  valorOferta: 600000
});

scope.registrarOuAtualizarProposta({
  id: proposta.id,
  tipo: 'compra',
  status: 'clube_aceitou',
  jogadorId: 7,
  jogadorNome: 'Meia Teste',
  clubeOrigemId: 2,
  clubeDestinoId: 1,
  valorOferta: 600000
});

assert.strictEqual(scope.propostasPendentes.length, 2, 'proposal update should not create a duplicate item');
assert.strictEqual(scope.propostasPendentes[0].status, 'clube_aceitou', 'proposal should update status in place');

// A reserva selecionada por engano pode ser desmarcada sem virar uma
// substituição. Somente a troca efetiva titular -> reserva consome a janela.
const titularTeste = { id: 'titular-tatica', nome: 'Titular', emCampo: true, expulso: false, lesionado: false, suspenso: false, posX: 80, posY: 50 };
const reservaTeste = { id: 'reserva-tatica', nome: 'Reserva', emCampo: false, expulso: false, lesionado: false, suspenso: false, posX: 0, posY: 0 };
scope.elencoAtual = [titularTeste, reservaTeste];
scope.partidaEmAndamento = true;
scope.partidaPausada = true;
scope.substituicoesFeitas = 0;
scope.selecionarJogadorParaTatica(reservaTeste);
scope.moverJogador(reservaTeste.id, 'banco', 0, 0);
assert.strictEqual(scope.substituicoesFeitas, 0, 'returning an already benched player must not consume a substitution');
assert.notStrictEqual(reservaTeste.substituidoNaPartida, true, 'a benched player must not be marked as substituted');
scope.selecionarJogadorParaTatica(reservaTeste);
assert.strictEqual(scope.jogadorTaticaSelecionado, null, 'tapping the selected reserve again should cancel the selection');
scope.selecionarJogadorParaTatica(titularTeste);
scope.selecionarJogadorParaTatica(reservaTeste);
assert.strictEqual(scope.substituicoesFeitas, 1, 'an effective titular-to-reserve swap should consume one substitution');
assert.strictEqual(titularTeste.substituidoNaPartida, true, 'the player leaving the field should be marked as substituted');

console.log('market_flow.test.js passed');
