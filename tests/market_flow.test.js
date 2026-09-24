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
assert.strictEqual(perfilElite.estrategiaCodigo, 'competir_por_titulos', 'elite club should prioritize title contention');
assert.ok(perfilElite.pesoEstrelas > perfilElite.pesoPotencial, 'title contender should prioritize ready-made stars');
assert.ok(perfilElite.objetivoTemporada.includes('títulos'), 'club profile should expose a seasonal objective');
assert.ok(perfilElite.limiteFolhaReceita > perfilElite.pesoCusto / 3, 'club profile should expose a payroll sustainability limit');
assert.ok(perfilElite.reservaOperacionalMeses >= 2, 'club profile should reserve operating cash');
assert.deepStrictEqual(perfilElite, scope.obterPerfilClubeCpu(scope.clubeAtual), 'club profile should be deterministic for the same state');

const perfilChapecoense = scope.obterPerfilClubeCpu({ id: 3, nome: 'Chapecoense', divisao: 'A', reputacao: 73, orcamento: 30000000 });
assert.strictEqual(perfilChapecoense.estrategiaCodigo, 'sobreviver_e_recompor', 'smaller Serie A club should prioritize survival and immediate needs');
assert.ok(perfilElite.alvoOverall > perfilChapecoense.alvoOverall, 'club reputation should raise the quality target');
assert.ok(perfilElite.poderAtracao > perfilChapecoense.poderAtracao, 'club reputation should raise market attraction');

const perfilFormador = scope.obterPerfilClubeCpu({ id: 4, nome: 'Base FC', divisao: 'D', reputacao: 55, orcamento: 1000000 });
assert.strictEqual(perfilFormador.estrategiaCodigo, 'formar_e_revender', 'lower division club should prioritize development and resale');
assert.ok(perfilFormador.pesoPotencial > perfilFormador.pesoEstrelas, 'development club should prioritize potential over stars');

assert.strictEqual(typeof scope.obterPerfilNegociacaoJogador, 'function', 'player negotiation profile helper should exist');
const perfilEstrelaJogador = scope.obterPerfilNegociacaoJogador({
  id: 'estrela-teste',
  nome: 'Estrela Teste',
  clubeId: 2,
  posicao: 'ATA',
  idade: 27,
  salario: 100000,
  salarioDesejado: 100000,
  potencial: 93,
  reputacaoIndividual: 'estrela_nacional',
  personalidade: 'ambicioso',
  atributos: { finalizacao: 90, passe: 90, marcacao: 90, velocidade: 90, fisico: 90 }
}, scope.clubeAtual);
assert.strictEqual(perfilEstrelaJogador.papelMinimo, 'importante', 'national star should demand an important squad role');
assert.ok(perfilEstrelaJogador.anosMinimos >= 2, 'national star should expect a multi-season contract');
assert.ok(perfilEstrelaJogador.luvasMinimas > 0, 'recognized player should negotiate signing bonuses');
assert.ok(perfilEstrelaJogador.salarioMinimo > 100000, 'recognized player should have an individual salary premium');

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

// A reputação dos clubes deve reagir ao contexto esportivo e financeiro da
// temporada, sem transformar a divisão inicial em um destino permanente.
scope.dados.anoAtual = 2026;
scope.clubes = [
  { id: 'rep-campeao', nome: 'Campeão FC', divisao: 'A', reputacao: 50, orcamento: 180000000 },
  { id: 'rep-promovido', nome: 'Promovido FC', divisao: 'B', reputacao: 50, orcamento: 45000000 },
  { id: 'rep-rebaixado', nome: 'Rebaixado FC', divisao: 'A', reputacao: 70, orcamento: 1000000 }
];
scope.jogadores = [];
const linhaVazia = (id) => ({ clube: { id, nome: `Clube ${id}`, divisao: 'A', reputacao: 50, orcamento: 10000000 }, pontos: 15, jogos: 10 });
const tabelaAReputacao = [
  { clube: scope.clubes[0], pontos: 30, jogos: 10 },
  ...Array.from({ length: 18 }, (_, indice) => linhaVazia(`a-${indice}`)),
  { clube: scope.clubes[2], pontos: 4, jogos: 10 }
];
const tabelaBReputacao = [
  { clube: scope.clubes[1], pontos: 27, jogos: 10 },
  ...Array.from({ length: 19 }, (_, indice) => linhaVazia(`b-${indice}`))
];
scope.ordenarTabela = (divisao) => divisao === 'A' ? tabelaAReputacao : (divisao === 'B' ? tabelaBReputacao : []);
scope.copaBrasil = { chaves: [[{ vencedor: { id: 'rep-promovido' } }]] };
scope.historicoReputacaoClubes = [];
scope._reputacaoClubesTemporadaAplicada = null;
const reputacoesAntes = scope.clubes.map((clube) => clube.reputacao);
const alteracoesReputacao = scope.atualizarReputacaoClubesTemporada();
assert.ok(scope.clubes[0].reputacao > reputacoesAntes[0], 'a title contender should gain reputation');
assert.ok(scope.clubes[1].reputacao > reputacoesAntes[1], 'a promoted club and cup champion should gain reputation');
assert.ok(scope.clubes[2].reputacao < reputacoesAntes[2], 'a relegated club with weak results should lose reputation');
assert.ok(alteracoesReputacao.find((item) => item.clubeId === 'rep-promovido').componentes.movimento > 0, 'promotion should be recorded as a positive reputation component');
assert.ok(alteracoesReputacao.find((item) => item.clubeId === 'rep-rebaixado').componentes.movimento < 0, 'relegation should be recorded as a negative reputation component');
assert.strictEqual(scope.historicoReputacaoClubes[0].clubesAvaliados, 3, 'reputation history should record the number of evaluated clubs');
assert.strictEqual(scope.atualizarReputacaoClubesTemporada(), false, 'reputation should be applied once per season');
const resumoReputacao = scope.obterResumoReputacaoClube(scope.clubes[1]);
assert.strictEqual(resumoReputacao.tendencia, 'ascendente', 'reputation summary should expose the current trend');
assert.ok(resumoReputacao.fatores.some((fator) => fator.chave === 'movimento' && fator.valor > 0), 'reputation summary should explain promotion impact');
assert.ok(resumoReputacao.impacto.poderAtracao > 0, 'reputation summary should expose market attraction impact');

// A continuidade da CPU deve renovar atletas estruturais antes do vencimento,
// recompor uma carência mínima e jamais alterar o elenco do clube humano.
scope.dados = { anoAtual: 2026 };
scope.diaAtual = 7;
const clubeHumanoContinuidade = { id: 'humano-continuidade', nome: 'Meu Clube', divisao: 'A', reputacao: 80, orcamento: 50000000 };
const clubeCpuContinuidade = { id: 'cpu-continuidade', nome: 'CPU FC', divisao: 'C', reputacao: 60, orcamento: 20000000 };
scope.clubeAtual = clubeHumanoContinuidade;
scope.clubes = [clubeHumanoContinuidade, clubeCpuContinuidade];
scope.transferenciasHistorico = [];
scope.propostasPendentes = [];
scope.caixaEntrada = [];
const atributosContinuidade = { reflexo: 78, posicionamento: 78, distribuicao: 78, finalizacao: 78, passe: 78, marcacao: 78, velocidade: 78, fisico: 78 };
const goleiroCpuExpirando = {
  id: 'cpu-goleiro-expirando', nome: 'Goleiro CPU', clubeId: clubeCpuContinuidade.id, posicao: 'GOL',
  idade: 25, salario: 20000, salarioDesejado: 20000, anosContrato: 0, potencial: 80,
  atributos: atributosContinuidade, papelElenco: 'titular'
};
const atacanteCpu = {
  id: 'cpu-atacante', nome: 'Atacante CPU', clubeId: clubeCpuContinuidade.id, posicao: 'ATA',
  idade: 24, salario: 18000, salarioDesejado: 18000, anosContrato: 2, potencial: 76,
  atributos: atributosContinuidade
};
const goleiroLivre = {
  id: 'cpu-goleiro-livre', nome: 'Goleiro Livre', clubeId: 'mercado', posicao: 'GOL',
  idade: 22, salario: 15000, salarioDesejado: 15000, anosContrato: 0, potencial: 78,
  atributos: atributosContinuidade
};
const jogadorHumanoExpirando = {
  id: 'humano-contrato', nome: 'Humano Expirando', clubeId: clubeHumanoContinuidade.id, posicao: 'MEI',
  idade: 27, salario: 25000, salarioDesejado: 25000, anosContrato: 0, potencial: 75,
  atributos: atributosContinuidade
};
scope.jogadores = [goleiroCpuExpirando, atacanteCpu, goleiroLivre, jogadorHumanoExpirando];
assert.strictEqual(typeof scope.garantirContinuidadeElencoCPU, 'function', 'CPU continuity helper should exist');
const relatorioContinuidade = scope.garantirContinuidadeElencoCPU(clubeCpuContinuidade, { motivo: 'teste', forcar: true, maxContratacoes: 1 });
assert.ok(relatorioContinuidade.renovados.some((item) => item.id === goleiroCpuExpirando.id), 'CPU should renew an expiring structural player');
assert.strictEqual(goleiroCpuExpirando.anosContrato, 2, 'CPU renewal should create a new multi-season contract');
assert.ok(relatorioContinuidade.contratados.some((item) => item.id === goleiroLivre.id), 'CPU should fill a critical position from the free market');
assert.strictEqual(goleiroLivre.clubeId, clubeCpuContinuidade.id, 'free player should join the CPU club');
assert.strictEqual(jogadorHumanoExpirando.anosContrato, 0, 'continuity automation must not alter the human club');
assert.strictEqual(scope.garantirContinuidadeElencoCPU(clubeHumanoContinuidade, { motivo: 'teste', forcar: true }).ignorado, true, 'human club should be excluded from CPU continuity');

// O caminho público de mercado deve acionar a mesma continuidade usada na
// virada: uma revisão de janela precisa renovar e recompor a CPU por posição,
// sem tocar no elenco humano.
const cpuFlowScope = createControllerScope();
const clubeHumanoFluxo = { id: 'humano-fluxo', nome: 'Humano Fluxo', divisao: 'A', reputacao: 85, orcamento: 50000000 };
const clubeCpuFluxo = { id: 'cpu-fluxo', nome: 'CPU Fluxo', divisao: 'C', reputacao: 60, orcamento: 20000000 };
const atributosFluxo = { reflexo: 78, posicionamento: 78, distribuicao: 78, finalizacao: 78, passe: 78, marcacao: 78, velocidade: 78, fisico: 78 };
const goleiroFluxo = { id: 'fluxo-goleiro', nome: 'Goleiro Fluxo', clubeId: clubeCpuFluxo.id, posicao: 'GOL', idade: 24, salario: 18000, salarioDesejado: 18000, anosContrato: 0, potencial: 80, atributos: atributosFluxo, papelElenco: 'titular' };
const livreFluxo = { id: 'fluxo-livre', nome: 'Goleiro Livre Fluxo', clubeId: 'mercado', posicao: 'GOL', idade: 22, salario: 14000, salarioDesejado: 14000, anosContrato: 0, potencial: 78, atributos: atributosFluxo };
cpuFlowScope.clubeAtual = clubeHumanoFluxo;
cpuFlowScope.clubes = [clubeHumanoFluxo, clubeCpuFluxo];
cpuFlowScope.jogadores = [goleiroFluxo, livreFluxo];
cpuFlowScope.elencoAtual = [];
cpuFlowScope.diaAtual = 14;
cpuFlowScope.calendarioGeral = Array.from({ length: 15 }, (_, indice) => ({ titulo: 'Dia ' + indice, tipo: 'TREINO' }));
cpuFlowScope.transferenciasHistorico = [];
cpuFlowScope.transferenciasHistoricoVisivel = [];
cpuFlowScope.propostasPendentes = [];
cpuFlowScope.caixaEntrada = [];
cpuFlowScope.mensagensNaoLidas = 0;
cpuFlowScope.emprestimosAtivos = [];
cpuFlowScope.simularMercadoCPU();
assert.strictEqual(goleiroFluxo.anosContrato, 2, 'public CPU market flow should renew an expiring structural player');
assert.strictEqual(livreFluxo.clubeId, clubeCpuFluxo.id, 'public CPU market flow should fill a critical positional need');
assert.strictEqual(cpuFlowScope.elencoAtual.length, 0, 'public CPU market flow must not mutate the human squad');

console.log('market_flow.test.js passed');
