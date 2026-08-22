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

function jogador(id, clubeId, posicao, overallBase, extra) {
  return Object.assign({
    id,
    clubeId,
    nome: 'Jogador ' + id,
    posicao,
    idade: 24,
    moral: 100,
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
  }, extra || {});
}

function montarTitulares(clubeId, overallBase) {
  const posicoes = ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'VOL', 'MEI', 'MEI', 'ATA', 'ATA'];
  return posicoes.map((posicao, index) => jogador(clubeId * 100 + index, clubeId, posicao, overallBase));
}

const { scope, storage } = createControllerHarness();

assert.strictEqual(typeof scope.criarAmbienteElencoPadrao, 'function', 'squad environment default helper should exist');
assert.strictEqual(typeof scope.registrarEventoAmbiente, 'function', 'squad environment event helper should exist');
assert.strictEqual(typeof scope.aplicarAmbienteResultadoPartida, 'function', 'match result environment helper should exist');
assert.strictEqual(typeof scope.calcularFatorAmbiente, 'function', 'environment performance factor helper should exist');

assert.strictEqual(scope.ambienteElenco.valor, 70, 'new controller should start with stable squad environment default');
assert.strictEqual(scope.ambienteElenco.tendencia, 'estavel');
assert.ok(Array.isArray(scope.ambienteElenco.eventos), 'default environment events should be an array');
assert.strictEqual(scope.ambienteElenco.eventos.length, 0, 'default environment events should start empty');
assert.strictEqual(scope.ambienteElencoResumo.valor, 70, 'dashboard summary should be precomputed');

const migrated = scope.migrarSave({ saveVersion: 5, calendarioGeral: [] });
assert.strictEqual(migrated.saveVersion, 11, 'legacy save should migrate to contracts save version');
assert.strictEqual(migrated.ambienteElenco.valor, 70);
assert.strictEqual(migrated.ambienteElenco.tendencia, 'estavel');
assert.strictEqual(migrated.ambienteElenco.ultimaAtualizacaoDia, 0);
assert.ok(Array.isArray(migrated.ambienteElenco.eventos));
assert.strictEqual(migrated.ambienteElenco.eventos.length, 0);
assert.strictEqual(migrated.diretoriaStatus.status, 'no_trilho');
assert.strictEqual(migrated.contextoExterno.torcida.humor, 65);

scope.ambienteElenco = scope.criarAmbienteElencoPadrao();
scope.ambienteElenco.valor = 98;
scope.registrarEventoAmbiente({ id: 'clamp_up', tipo: 'resultado', impacto: 10, titulo: 'Alta', detalhe: 'Teste' });
assert.strictEqual(scope.ambienteElenco.valor, 100, 'environment value should clamp to 100');
scope.registrarEventoAmbiente({ id: 'clamp_down', tipo: 'resultado', impacto: -150, titulo: 'Baixa', detalhe: 'Teste' });
assert.strictEqual(scope.ambienteElenco.valor, 0, 'environment value should clamp to 0');

scope.ambienteElenco = scope.criarAmbienteElencoPadrao();
for (let i = 0; i < 14; i++) {
  scope.registrarEventoAmbiente({ id: 'hist_' + i, tipo: 'resultado', impacto: 1, titulo: 'Evento ' + i, detalhe: 'Teste' });
}
assert.strictEqual(scope.ambienteElenco.eventos.length, 12, 'environment history should be truncated');
assert.strictEqual(scope.ambienteElenco.eventos[0].id, 'hist_13', 'most recent environment event should stay first');

assert.ok(scope.calcularFatorAmbiente(90) > 1, 'great environment should slightly improve performance');
assert.ok(scope.calcularFatorAmbiente(20) < 1, 'bad environment should slightly reduce performance');
assert.ok(scope.calcularFatorAmbiente(100) <= 1.03, 'positive factor should stay conservative');
assert.ok(scope.calcularFatorAmbiente(0) >= 0.96, 'negative factor should stay conservative');

const meuTime = { id: 1, nome: 'Meu Clube', sigla: 'MEU', reputacao: 78, divisao: 'A', estadio: { capacidade: 30000 } };
const rival = { id: 2, nome: 'Rival FC', sigla: 'RIV', reputacao: 80, divisao: 'A', estadio: { capacidade: 40000 } };
scope.clubeAtual = meuTime;
scope.clubes = [meuTime, rival];
scope.diaAtual = 0;
scope.calendarioGeral = [{ tipo: 'LIGA', titulo: 'Brasileirao - Rodada 1', rodadaLiga: 0 }];
scope.calendario = [{ mandante: meuTime, visitante: rival }];
scope.elencoAtual = montarTitulares(meuTime.id, 70);
scope.jogadores = scope.elencoAtual.concat(montarTitulares(rival.id, 70));
scope.ambienteElenco = scope.criarAmbienteElencoPadrao();
scope.atualizarAmbienteElencoResumo();

const forcaNeutra = scope.calcularForcaTime();
scope.ambienteElenco.valor = 90;
scope.atualizarAmbienteElencoResumo();
assert.ok(scope.calcularForcaTime() > forcaNeutra, 'team strength should include conservative environment factor');

const partidaVitoria = { mandante: meuTime, visitante: rival, golsMandante: 2, golsVisitante: 0 };
scope.ambienteElenco = scope.criarAmbienteElencoPadrao();
const valorInicial = scope.ambienteElenco.valor;
scope.aplicarAmbienteResultadoPartida(partidaVitoria, 'rapido');
assert.ok(scope.ambienteElenco.valor > valorInicial, 'victory should improve squad environment');
const valorAposVitoria = scope.ambienteElenco.valor;
scope.aplicarAmbienteResultadoPartida(partidaVitoria, 'completo');
assert.strictEqual(scope.ambienteElenco.valor, valorAposVitoria, 'same match result should not affect environment twice across different flows');

scope.diaAtual = 1;
scope.calendarioGeral.push({ tipo: 'LIGA', titulo: 'Brasileirao - Rodada 2', rodadaLiga: 1 });
const partidaDerrota = { mandante: rival, visitante: meuTime, golsMandante: 3, golsVisitante: 1 };
scope.aplicarAmbienteResultadoPartida(partidaDerrota, 'rapido');
assert.ok(scope.ambienteElenco.valor < valorAposVitoria, 'defeat should reduce squad environment');

scope.elencoAtual[0].moral = 88;
scope.elencoAtual[1].moral = 48;
scope.atualizarStatusHumorElenco();
assert.strictEqual(scope.elencoAtual[0].statusHumor, 'Confiante');
assert.strictEqual(scope.elencoAtual[1].statusHumor, 'Insatisfeito');

scope.obterMeuJogoHoje = function() { return null; };
scope.diaAtual = 3;
scope.preparacaoTemporada.entrosamentoSetores.defesa = 50;
const entrosamentoAntes = scope.preparacaoTemporada.entrosamentoSetores.defesa;
assert.strictEqual(scope.aplicarTreinamento('defensivo'), true, 'defensive training should be available on a rest day');
assert.ok(scope.preparacaoTemporada.entrosamentoSetores.defesa > entrosamentoAntes, 'sector training should improve the matching sector chemistry');
assert.strictEqual(scope.aplicarTreinamento('tecnico'), false, 'only one training should be allowed per day');
scope.preparacaoTemporada.concluida = false;
assert.strictEqual(scope.simularAmistosoPreTemporada(), true, 'pre-season friendly should be playable on a rest day');
assert.ok(scope.preparacaoTemporada.ultimoAmistoso, 'friendly should produce a report');
scope.diaAtual = 11;
scope.atualizarFasePreparacao();
assert.strictEqual(scope.preparacaoTemporada.concluida, true, 'pre-season should close after its preparation window');
assert.strictEqual(scope.preparacaoTemporada.fase, 'temporada', 'season phase should advance after pre-season');

scope.gerarMetaDiretoria();
assert.strictEqual(scope.confirmarPrioridadeTemporada('financeira'), true, 'board briefing should accept a valid seasonal priority');
assert.strictEqual(scope.diretoriaStatus.prioridadeTemporada, 'financeira', 'board should persist the chosen seasonal priority');
assert.strictEqual(scope.diretoriaStatus.briefingInicialConcluido, true, 'board briefing should be marked complete');
const avaliacaoPreTemporada = scope.obterAvaliacaoPreTemporada();
assert.ok(avaliacaoPreTemporada.mediaOverall > 0, 'pre-season assessment should calculate squad average overall');
assert.ok(Array.isArray(avaliacaoPreTemporada.alertas), 'pre-season assessment should report squad gaps');

scope.salvarJogoSilencioso();
const saved = JSON.parse(storage.value);
assert.strictEqual(saved.saveVersion, 11, 'save should persist contracts version');
assert.strictEqual(saved.ambienteElenco.valor, scope.ambienteElenco.valor, 'save should persist squad environment value');
assert.strictEqual(saved.ambienteElenco.tendencia, scope.ambienteElenco.tendencia, 'save should persist squad environment trend');
assert.strictEqual(saved.ambienteElenco.eventos.length, scope.ambienteElenco.eventos.length, 'save should persist squad environment event history');

console.log('squad_morale.test.js passed');
