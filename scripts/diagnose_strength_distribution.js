const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createScope() {
  const appStub = {
    directive() { return appStub; },
    controller(name, fn) { appStub.controllerFn = fn; return appStub; }
  };
  function AudioContextStub() {}
  AudioContextStub.prototype.createOscillator = function() {
    return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} };
  };
  AudioContextStub.prototype.createGain = function() {
    return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
  };
  AudioContextStub.prototype.resume = function() {};

  const context = {
    angular: {
      module() { return appStub; },
      copy(value) { return JSON.parse(JSON.stringify(value)); }
    },
    window: {
      AudioContext: AudioContextStub,
      webkitAudioContext: AudioContextStub,
      localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
      URL: { createObjectURL() { return 'blob:diagnostic'; }, revokeObjectURL() {} }
    },
    document: {
      getElementById() { return null; },
      createElement() { return { click() {}, setAttribute() {} }; },
      body: { appendChild() {}, removeChild() {} }
    },
    alert() {},
    confirm() { return true; },
    console,
    Date,
    Math,
    setTimeout,
    clearTimeout,
    Blob: function Blob() {}
  };
  const appPath = path.join(__dirname, '..', 'js', 'app.js');
  vm.runInNewContext(fs.readFileSync(appPath, 'utf8'), context, { filename: appPath });
  const scope = {};
  let timerReady = false;
  appStub.controllerFn(scope, { get() { throw new Error('Unexpected HTTP request'); } }, function(callback) {
    if (timerReady && typeof callback === 'function') callback();
  });
  timerReady = true;
  return scope;
}

const scope = createScope();
scope.clubes = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'clubes.json'), 'utf8'));
scope.jogadores = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'jogadores.json'), 'utf8'));
const clubeInicial = scope.clubes.find((clube) => clube.nome === 'Flamengo') || scope.clubes[0];
assert.ok(clubeInicial, 'there should be an initial club');
scope.dados.nomeTreinador = 'Diagnóstico de força';
scope.iniciarNovoJogo(clubeInicial);
scope.aplicarFormacao('4-3-3');
const forcaFlamengoEscalada = scope.calcularForcaTime();

function round(value) {
  return Number(Number(value || 0).toFixed(2));
}

function jogadoresDoClube(clube) {
  if (scope.clubeAtual && scope.clubeAtual.id === clube.id) return scope.elencoAtual || [];
  return (scope.jogadores || []).filter((jogador) => jogador && jogador.clubeId === clube.id);
}

function onzeBalanceado(elenco) {
  const ordenados = elenco.slice().sort((a, b) => scope.calcularOverall(b) - scope.calcularOverall(a));
  const vagas = ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'VOL', 'MEI', 'ATA', 'ATA', 'ATA'];
  const usados = new Set();
  const selecionados = [];
  vagas.forEach((posicao) => {
    const indice = ordenados.findIndex((jogador, index) => !usados.has(index) && jogador.posicao === posicao);
    if (indice >= 0) {
      usados.add(indice);
      selecionados.push(ordenados[indice]);
    }
  });
  ordenados.forEach((jogador, indice) => {
    if (selecionados.length < 11 && !usados.has(indice)) selecionados.push(jogador);
  });
  return selecionados.slice(0, 11);
}

const linhas = scope.clubes
  .filter((clube) => clube.divisao === 'A')
  .map((clube) => {
    const elenco = jogadoresDoClube(clube).filter((jogador) => !jogador.lesionado && !jogador.suspenso && !jogador.expulso);
    const onze = onzeBalanceado(elenco);
    const mediaOnze = onze.reduce((soma, jogador) => soma + scope.calcularOverall(jogador), 0) / Math.max(1, onze.length);
    const forca = scope.calcularForcaElencoPreJogo(clube, false);
    return {
      clube: clube.nome,
      reputacao: clube.reputacao,
      jogadores: elenco.length,
      mediaOnze: round(mediaOnze),
      melhorOverall: onze.length ? scope.calcularOverall(onze[0]) : 0,
      forcaPreJogo: forca,
      diferencaParaFlamengo: null,
      posicoesOnze: onze.reduce((mapa, jogador) => {
        mapa[jogador.posicao] = (mapa[jogador.posicao] || 0) + 1;
        return mapa;
      }, {})
    };
  });

const forcaFlamengo = linhas.find((linha) => linha.clube === 'Flamengo').forcaPreJogo;
linhas.forEach((linha) => { linha.diferencaParaFlamengo = linha.forcaPreJogo - forcaFlamengo; });
linhas.sort((a, b) => b.forcaPreJogo - a.forcaPreJogo || b.mediaOnze - a.mediaOnze);

console.log('strength_distribution:', JSON.stringify({
  divisao: 'A',
  clubes: linhas,
  resumo: {
    forcaFlamengo,
    forcaFlamengoEscalada,
    mediaForca: round(linhas.reduce((soma, linha) => soma + linha.forcaPreJogo, 0) / linhas.length),
    menorForca: linhas[linhas.length - 1].forcaPreJogo,
    maiorForca: linhas[0].forcaPreJogo,
    amplitude: linhas[0].forcaPreJogo - linhas[linhas.length - 1].forcaPreJogo
  }
}, null, 2));
