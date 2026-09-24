const fs = require('fs');
const path = require('path');
const vm = require('vm');

const clubes = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'clubes.json'), 'utf8'));
const jogadores = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'jogadores.json'), 'utf8'));
const partidasPorMando = Math.max(100, Number(process.argv[2]) || 500);
const paresNomes = [
  ['Flamengo', 'Palmeiras'],
  ['Flamengo', 'Cruzeiro'],
  ['Flamengo', 'Chapecoense'],
  ['Palmeiras', 'Cruzeiro'],
  ['Palmeiras', 'Chapecoense'],
  ['Cruzeiro', 'Chapecoense'],
  ['Flamengo', 'Figueirense']
];

function criarMathSeed(seedInicial) {
  let estado = (Number(seedInicial) >>> 0) || 1;
  const math = Object.create(Math);
  math.random = function() {
    estado = (estado * 1664525 + 1013904223) >>> 0;
    return estado / 4294967296;
  };
  return math;
}

function criarScope(seed) {
  const appStub = { directive() { return appStub; }, controller(name, fn) { appStub.controllerFn = fn; return appStub; } };
  function AudioContextStub() {}
  AudioContextStub.prototype.createOscillator = function() { return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; };
  AudioContextStub.prototype.createGain = function() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; };
  AudioContextStub.prototype.resume = function() {};
  const context = {
    angular: { module() { return appStub; }, copy(value) { return JSON.parse(JSON.stringify(value)); } },
    window: { AudioContext: AudioContextStub, webkitAudioContext: AudioContextStub, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, URL: { createObjectURL() { return 'blob:matchup'; }, revokeObjectURL() {} } },
    document: { getElementById() { return null; }, createElement() { return { click() {}, setAttribute() {} }; }, body: { appendChild() {}, removeChild() {} } },
    alert() {},
    confirm() { return true; },
    console,
    Date,
    Math: criarMathSeed(seed),
    setTimeout,
    clearTimeout,
    Blob: function Blob() {}
  };
  const appPath = path.join(__dirname, '..', 'js', 'app.js');
  vm.runInNewContext(fs.readFileSync(appPath, 'utf8'), context, { filename: appPath });
  let timerReady = false;
  const scope = {};
  appStub.controllerFn(scope, { get() { throw new Error('Unexpected HTTP request'); } }, function(callback) { if (timerReady && typeof callback === 'function') callback(); });
  timerReady = true;
  scope.clubes = clubes;
  scope.jogadores = JSON.parse(JSON.stringify(jogadores));
  scope.dados.nomeTreinador = 'Auditoria de Confrontos';
  scope.iniciarNovoJogo(clubes[0]);
  scope.clubeAtual = { id: '__auditoria_contexto_neutro__', nome: 'Auditoria neutra', reputacao: 50, divisao: 'A' };
  scope.partidaEmAndamento = false;
  scope.partidaAoVivo = null;
  return scope;
}

function encontrarClube(nome) {
  const clube = clubes.find((item) => item.nome === nome);
  if (!clube) throw new Error('Clube não encontrado: ' + nome);
  return clube;
}

function executarPar(scope, mandante, visitante) {
  const forcaMandante = scope.calcularForcaElencoPreJogo(mandante, false);
  const forcaVisitante = scope.calcularForcaElencoPreJogo(visitante, false);
  const acumulado = { jogos: 0, vitoriasMandante: 0, empates: 0, vitoriasVisitante: 0, golsMandante: 0, golsVisitante: 0 };
  for (let partida = 0; partida < partidasPorMando; partida += 1) {
    const golsMandante = scope.gerarGols(forcaMandante, forcaVisitante, 3);
    const golsVisitante = scope.gerarGols(forcaVisitante, forcaMandante, 0);
    acumulado.jogos += 1;
    acumulado.golsMandante += golsMandante;
    acumulado.golsVisitante += golsVisitante;
    if (golsMandante > golsVisitante) acumulado.vitoriasMandante += 1;
    else if (golsMandante < golsVisitante) acumulado.vitoriasVisitante += 1;
    else acumulado.empates += 1;
  }
  return {
    ...acumulado,
    forcaMandante,
    forcaVisitante,
    diferencaForca: forcaMandante - forcaVisitante,
    golsPorPartida: Number(((acumulado.golsMandante + acumulado.golsVisitante) / acumulado.jogos).toFixed(2)),
    taxaVitoriaMandante: Number((acumulado.vitoriasMandante / acumulado.jogos * 100).toFixed(1)),
    taxaEmpate: Number((acumulado.empates / acumulado.jogos * 100).toFixed(1)),
    taxaVitoriaVisitante: Number((acumulado.vitoriasVisitante / acumulado.jogos * 100).toFixed(1))
  };
}

const scope = criarScope(24092026);
const resultados = paresNomes.map(([nomeMandante, nomeVisitante]) => {
  const mandante = encontrarClube(nomeMandante);
  const visitante = encontrarClube(nomeVisitante);
  const ida = executarPar(scope, mandante, visitante);
  const volta = executarPar(scope, visitante, mandante);
  return {
    mandante: nomeMandante,
    visitante: nomeVisitante,
    forcaMandante: ida.forcaMandante,
    forcaVisitante: ida.forcaVisitante,
    diferencaForca: ida.diferencaForca,
    ida,
    volta: {
      mandante: volta.forcaMandante,
      visitante: volta.forcaVisitante,
      diferencaForca: volta.diferencaForca,
      jogos: volta.jogos,
      vitoriasMandante: volta.vitoriasMandante,
      empates: volta.empates,
      vitoriasVisitante: volta.vitoriasVisitante,
      golsMandante: volta.golsMandante,
      golsVisitante: volta.golsVisitante,
      golsPorPartida: volta.golsPorPartida,
      taxaVitoriaMandante: volta.taxaVitoriaMandante,
      taxaEmpate: volta.taxaEmpate,
      taxaVitoriaVisitante: volta.taxaVitoriaVisitante
    }
  };
});

console.log(JSON.stringify({ partidasPorMando, partidasTotais: partidasPorMando * 2 * resultados.length, resultados }, null, 2));
