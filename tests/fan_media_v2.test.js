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

function jogador(id, clubeId, nome, posicao, overallBase) {
  return {
    id,
    clubeId,
    nome,
    posicao,
    idade: 24,
    condicaoFisica: 100,
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
  };
}

const { scope, storage } = createControllerHarness();

assert.strictEqual(typeof scope.criarContextoExternoPadrao, 'function', 'external context default helper should exist');
assert.strictEqual(typeof scope.registrarEventoTorcida, 'function', 'fan event helper should exist');
assert.strictEqual(typeof scope.registrarEventoImprensa, 'function', 'media event helper should exist');
assert.strictEqual(typeof scope.aplicarContextoExternoResultadoPartida, 'function', 'match result external context helper should exist');
assert.strictEqual(typeof scope.aplicarContextoExternoColetiva, 'function', 'press conference external context helper should exist');
assert.strictEqual(typeof scope.atualizarResumoContextoExterno, 'function', 'external context summary helper should exist');

const migrated = scope.migrarSave({ saveVersion: 8, calendarioGeral: [] });
assert.strictEqual(migrated.saveVersion, 11, 'legacy save should migrate to contracts save version');
assert.strictEqual(migrated.contextoExterno.torcida.humor, 65, 'legacy save should receive fan mood default');
assert.strictEqual(migrated.contextoExterno.imprensa.pressao, 40, 'legacy save should receive media pressure default');
assert.ok(Array.isArray(migrated.contextoExterno.torcida.historico));
assert.ok(Array.isArray(migrated.contextoExterno.imprensa.historico));

scope.clubeAtual = { id: 1, nome: 'Meu Clube', sigla: 'MEU', reputacao: 78, divisao: 'A', orcamento: 1000000, estadio: { capacidade: 30000 }, olheiros: [] };
scope.clubes = [scope.clubeAtual, { id: 2, nome: 'Rival', sigla: 'RIV', reputacao: 82, divisao: 'A', estadio: { capacidade: 40000 } }];
scope.elencoAtual = [jogador(10, 1, 'Titular', 'ATA', 75)];
scope.jogadores = scope.elencoAtual.slice();
scope.caixaEntrada = [];
scope.noticiasFeed = [];
scope.diaAtual = 0;
scope.calendarioGeral = [{ tipo: 'LIGA', titulo: 'Brasileirao - Rodada 1', rodadaLiga: 0 }];
scope.contextoExterno = scope.criarContextoExternoPadrao();
scope.atualizarResumoContextoExterno();

scope.registrarEventoTorcida({ id: 'fan_up', origem: 'teste', impacto: 100, titulo: 'Alta', detalhe: 'Teste' });
assert.strictEqual(scope.contextoExterno.torcida.humor, 100, 'fan mood should clamp to 100');
scope.registrarEventoTorcida({ id: 'fan_down', origem: 'teste', impacto: -150, titulo: 'Baixa', detalhe: 'Teste' });
assert.strictEqual(scope.contextoExterno.torcida.humor, 0, 'fan mood should clamp to 0');
scope.registrarEventoImprensa({ id: 'media_up', origem: 'teste', impacto: 100, titulo: 'Alta', detalhe: 'Teste' });
assert.strictEqual(scope.contextoExterno.imprensa.pressao, 100, 'media pressure should clamp to 100');
scope.registrarEventoImprensa({ id: 'media_down', origem: 'teste', impacto: -150, titulo: 'Baixa', detalhe: 'Teste' });
assert.strictEqual(scope.contextoExterno.imprensa.pressao, 0, 'media pressure should clamp to 0');

scope.contextoExterno = scope.criarContextoExternoPadrao();
for (let i = 0; i < 14; i++) {
  scope.registrarEventoTorcida({ id: 'fan_hist_' + i, origem: 'teste', impacto: 1, titulo: 'Evento ' + i, detalhe: 'Teste' });
  scope.registrarEventoImprensa({ id: 'media_hist_' + i, origem: 'teste', impacto: 1, titulo: 'Evento ' + i, detalhe: 'Teste' });
}
assert.strictEqual(scope.contextoExterno.torcida.historico.length, 12, 'fan history should be truncated');
assert.strictEqual(scope.contextoExterno.imprensa.historico.length, 12, 'media history should be truncated');

scope.contextoExterno = scope.criarContextoExternoPadrao();
scope.executarPartidaPreparada = function() {};
scope.responderColetiva({
  texto: 'Vamos mobilizar todo mundo.',
  efeito: 'motivacao',
  msg: 'Discurso mobilizador agradou arquibancada e reduziu ruido externo.',
  impactoTorcida: 3,
  impactoImprensa: -2,
  tagNarrativa: 'mobilizacao'
});
assert.ok(scope.contextoExterno.torcida.humor > 65, 'press conference response should improve fan mood');
assert.ok(scope.contextoExterno.imprensa.pressao < 40, 'press conference response should reduce media pressure');
assert.ok(scope.noticiasFeed.some((item) => item.tipo === 'imprensa'), 'press conference should add news feed item');

const humorAposColetiva = scope.contextoExterno.torcida.humor;
const pressaoAposColetiva = scope.contextoExterno.imprensa.pressao;
const vitoria = { mandante: scope.clubeAtual, visitante: scope.clubes[1], golsMandante: 2, golsVisitante: 0 };
scope.aplicarContextoExternoResultadoPartida(vitoria, 'rapido');
assert.ok(scope.contextoExterno.torcida.humor > humorAposColetiva, 'victory should improve fan mood');
assert.ok(scope.contextoExterno.imprensa.pressao <= pressaoAposColetiva, 'victory should not increase media pressure');

scope.diaAtual = 1;
scope.calendarioGeral.push({ tipo: 'LIGA', titulo: 'Brasileirao - Rodada 2', rodadaLiga: 1 });
const derrota = { mandante: scope.clubes[1], visitante: scope.clubeAtual, golsMandante: 3, golsVisitante: 0 };
const humorAntesDerrota = scope.contextoExterno.torcida.humor;
const pressaoAntesDerrota = scope.contextoExterno.imprensa.pressao;
scope.aplicarContextoExternoResultadoPartida(derrota, 'rapido');
assert.ok(scope.contextoExterno.torcida.humor < humorAntesDerrota, 'defeat should reduce fan mood');
assert.ok(scope.contextoExterno.imprensa.pressao > pressaoAntesDerrota, 'defeat should increase media pressure');

scope.atualizarResumoContextoExterno();
assert.strictEqual(scope.contextoExternoResumo.torcida.valor, scope.contextoExterno.torcida.humor, 'dashboard summary should mirror fan mood');
assert.strictEqual(scope.contextoExternoResumo.imprensa.valor, scope.contextoExterno.imprensa.pressao, 'dashboard summary should mirror media pressure');

scope.salvarJogoSilencioso();
const saved = JSON.parse(storage.value);
assert.strictEqual(saved.saveVersion, 11, 'save should persist contracts version');
assert.strictEqual(saved.contextoExterno.torcida.humor, scope.contextoExterno.torcida.humor, 'save should persist fan mood');
assert.strictEqual(saved.contextoExterno.imprensa.pressao, scope.contextoExterno.imprensa.pressao, 'save should persist media pressure');

console.log('fan_media_v2.test.js passed');
