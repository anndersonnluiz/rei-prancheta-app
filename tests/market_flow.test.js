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

scope.dados = { anoAtual: 2026 };
scope.diaAtual = 4;
scope.calendarioGeral = [{ titulo: 'Dia 1' }, { titulo: 'Dia 2' }, { titulo: 'Dia 3' }, { titulo: 'Dia 4' }, { titulo: 'Dia 5' }];
scope.clubeAtual = { id: 1, nome: 'Meu Clube', orcamento: 1000000 };
scope.clubes = [scope.clubeAtual, { id: 2, nome: 'Outro Clube' }];

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
  salario: 30000,
  anosContrato: 3
};

const primeiroRegistro = scope.registrarTransferenciaHistorico(transferencia);
const segundoRegistro = scope.registrarTransferenciaHistorico(transferencia);
assert.strictEqual(primeiroRegistro, segundoRegistro, 'same transfer should reuse existing history item');
assert.strictEqual(scope.transferenciasHistorico.length, 1, 'same transfer should not be duplicated');
assert.strictEqual(scope.transferenciasHistoricoVisivel.length, 1, 'visible transfer history should be stable');

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

console.log('market_flow.test.js passed');
