const fs = require('fs');
const path = require('path');

const clubesPath = path.join(__dirname, '..', 'data', 'clubes.json');
const clubes = JSON.parse(fs.readFileSync(clubesPath, 'utf8'));
const jogadores = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'jogadores.json'), 'utf8'));
const clubs = clubes.filter(c => typeof c.reputacao === 'number');

// Telemetria (emulara export CSV após execução)
const telemetryRows = []; // per-shot rows
const matchSummaries = []; // per-match summary rows

function aleatorizarZona() {
  var r = Math.random();
  if (r < 0.45) return 'ATA';
  if (r < 0.70) return 'MEI';
  if (r < 0.82) return 'VOL';
  if (r < 0.92) return 'LAT';
  return 'ZAG';
}

function aleatorizarTipoChance() {
  var r = Math.random();
  if (r < 0.02) return 'PENALTY';
  if (r < 0.06) return 'CORNER';
  if (r < 0.09) return 'DIRECT_FK';
  return 'NORMAL';
}

function calcularXGPorTipoChance(chanceType) {
  var baseXG = {
    'PENALTY': 0.75,
    'CORNER': 0.06,
    'DIRECT_FK': 0.08,
    'NORMAL': 0.0
  };
  return baseXG[chanceType] || 0.0;
}

function calcularReducaoPosicionamentoGoleiro(zona, posicionamento) {
  posicionamento = (typeof posicionamento === 'number') ? posicionamento : 75;
  if (zona !== 'VOL' && zona !== 'LAT') return 0;
  return Math.max(0, Math.min(0.15, (posicionamento - 60) * 0.003));
}

function calcularModificadorBolaParada(chanceType, atributoBolaParada) {
  if (!chanceType || chanceType === 'NORMAL') return 1;
  atributoBolaParada = (typeof atributoBolaParada === 'number') ? atributoBolaParada : 75;
  return 1 + Math.max(-0.18, Math.min(0.24, (atributoBolaParada - 75) * 0.008));
}

function sortearTaticaCPU() {
  var r = Math.random();
  var mentalidade = r < 0.25 ? 'Retranca' : (r < 0.55 ? 'Ofensivo' : 'Equilibrado');
  var f = Math.random();
  var foco = f < 0.34 ? 'Pelo Meio' : (f < 0.68 ? 'Pelas Pontas' : 'Misto');
  var m = Math.random();
  var marcacao = m < 0.35 ? 'Pressao Alta' : 'Recuada';
  return { mentalidade: mentalidade, foco: foco, marcacao: marcacao };
}

function calcularModificadorAtaqueTatica(tatica) {
  if (!tatica) return 1;
  if (tatica.mentalidade === 'Retranca') return 0.88;
  if (tatica.mentalidade === 'Ofensivo') return 1.10;
  return 1;
}

function calcularModificadorDefesaTatica(tatica) {
  if (!tatica) return 1;
  if (tatica.mentalidade === 'Retranca') return 1.08;
  if (tatica.mentalidade === 'Ofensivo') return 0.92;
  return 1;
}

function calcularModificadorZonaPorTatica(tatica, zona, chanceType) {
  if (!tatica) return 1;
  var mod = 1;
  if (tatica.foco === 'Pelo Meio') {
    if (zona === 'MEI' || zona === 'VOL') mod *= 1.06;
    if (zona === 'LAT') mod *= 0.94;
  } else if (tatica.foco === 'Pelas Pontas') {
    if (zona === 'LAT' || chanceType === 'CORNER') mod *= 1.08;
    if (zona === 'VOL') mod *= 0.95;
  }
  if (tatica.marcacao === 'Pressao Alta' && zona === 'ATA') mod *= 1.03;
  return mod;
}

function calcularFatorFadiga(condicaoFisica) {
  condicaoFisica = (typeof condicaoFisica === 'number') ? condicaoFisica : 100;
  return Math.max(0.55, Math.min(1, condicaoFisica / 100));
}

function aplicarFadigaAtributo(valor, condicaoFisica) {
  valor = (typeof valor === 'number') ? valor : 75;
  return Math.round(valor * calcularFatorFadiga(condicaoFisica));
}

function aplicarFadigaAtributoGoleiro(valor, condicaoFisica) {
  valor = (typeof valor === 'number') ? valor : 75;
  var perda = 1 - calcularFatorFadiga(condicaoFisica);
  return Math.round(valor * (1 - perda * 0.35));
}

function condicaoPorEvento(evt, totalEventos) {
  var minutoAproximado = ((evt + 1) / Math.max(1, totalEventos)) * 90;
  return Math.max(55, Math.round(100 - minutoAproximado * 0.5));
}

function calcularXG(forcaAtaque, forcaDefesa, zona, finalizacao, reflexo, chanceType, posicionamento, atributoBolaParada) {
  var zonaMultipliers = { 'ATA':1.0, 'MEI':0.6, 'VOL':0.25, 'LAT':0.15, 'ZAG':0.05, 'INDEFINIDO':0.08 };
  var zm = zonaMultipliers[zona] || 0.08;
  var adv = forcaAtaque / Math.max(1, forcaDefesa);
  var base = 1.42 * adv * zm;

  finalizacao = (typeof finalizacao === 'number') ? finalizacao : 75;
  reflexo = (typeof reflexo === 'number') ? reflexo : 75;
  posicionamento = (typeof posicionamento === 'number') ? posicionamento : 75;

  // Chance type base xG (overrides zone-based if set-piece)
  if (chanceType && chanceType !== 'NORMAL') {
    var baseXGType = calcularXGPorTipoChance(chanceType);
    if (baseXGType > 0) {
      base = baseXGType;
    }
  }

  var shooterBoost = 1 + Math.max(-0.4, Math.min(0.8, (finalizacao - 75) * 0.012));
  var goalieReduction = Math.max(0, Math.min(0.85, reflexo * 0.006));
  var positioningReduction = calcularReducaoPosicionamentoGoleiro(zona, posicionamento);
  var setPieceBoost = calcularModificadorBolaParada(chanceType, atributoBolaParada);

  var xg = base * shooterBoost * setPieceBoost * (1 - goalieReduction) * (1 - positioningReduction);
  return Math.max(0.005, Math.min(0.6, xg));
}

function mediaAtributoTime(jogadoresList, clubeId, atributo, posFilter) {
  var jTime = jogadoresList.filter(function(j) { return j.clubeId === clubeId && j.atributos; });
  if (posFilter && posFilter.length > 0) jTime = jTime.filter(function(j) { return posFilter.indexOf(j.posicao) !== -1; });
  if (!jTime || jTime.length === 0) return 75;
  jTime = jTime.sort(function(a, b) { return calcularOverall(b) - calcularOverall(a); }).slice(0, obterLimiteProfundidadePorPosicao(posFilter));
  var soma = jTime.reduce(function(s, j) { return s + (j.atributos[atributo] || 75); }, 0);
  return Math.round(soma / jTime.length);
}

function obterLimiteProfundidadePorPosicao(posFilter) {
  if (!posFilter || posFilter.length === 0) return 11;
  if (posFilter.length === 1 && posFilter[0] === 'GOL') return 1;
  if (posFilter.indexOf('ATA') !== -1 && posFilter.indexOf('MEI') !== -1) return 7;
  return Math.min(8, Math.max(3, posFilter.length * 2));
}

function calcularOverall(jogador) {
  var attr = jogador.atributos || {};
  if (jogador.posicao === 'GOL') {
    var posicionamento = (typeof attr.posicionamento === 'number') ? attr.posicionamento : attr.reflexo;
    var distribuicao = (typeof attr.distribuicao === 'number') ? attr.distribuicao : attr.passe;
    return (attr.reflexo * 2 + posicionamento + distribuicao + attr.fisico) / 5;
  }
  return ((attr.finalizacao || 75) + (attr.passe || 75) + (attr.marcacao || 75) + (attr.velocidade || 75) + (attr.fisico || 75)) / 5;
}

function calcularPlacarAleatorioCPU(mandante, visitante, aplicaCasa) {
  const forcaM = mandante.reputacao + (aplicaCasa ? 10 : 0);
  const forcaV = visitante.reputacao;
  const taticaM = sortearTaticaCPU();
  const taticaV = sortearTaticaCPU();
  const ataqueM = forcaM * calcularModificadorAtaqueTatica(taticaM);
  const defesaM = forcaM * calcularModificadorDefesaTatica(taticaM);
  const ataqueV = forcaV * calcularModificadorAtaqueTatica(taticaV);
  const defesaV = forcaV * calcularModificadorDefesaTatica(taticaV);
  const diff = forcaM - forcaV;
  let bias = 0.5 + (diff / (forcaM + forcaV)) * 0.35;
  bias = Math.max(0.05, Math.min(0.95, bias));

  const avgFinalM = mediaAtributoTime(jogadores, mandante.id, 'finalizacao', ['ATA','MEI','VOL','LAT']);
  const avgReflexoM = mediaAtributoTime(jogadores, mandante.id, 'reflexo', ['GOL']);
  const avgPosicionamentoM = mediaAtributoTime(jogadores, mandante.id, 'posicionamento', ['GOL']);
  const avgPenaltiM = mediaAtributoTime(jogadores, mandante.id, 'penalti', ['ATA','MEI','VOL','LAT']);
  const avgEscanteioM = mediaAtributoTime(jogadores, mandante.id, 'escanteio', ['ATA','MEI','VOL','LAT']);
  const avgCobradorM = mediaAtributoTime(jogadores, mandante.id, 'cobrador', ['ATA','MEI','VOL','LAT']);
  const avgFinalV = mediaAtributoTime(jogadores, visitante.id, 'finalizacao', ['ATA','MEI','VOL','LAT']);
  const avgReflexoV = mediaAtributoTime(jogadores, visitante.id, 'reflexo', ['GOL']);
  const avgPosicionamentoV = mediaAtributoTime(jogadores, visitante.id, 'posicionamento', ['GOL']);
  const avgPenaltiV = mediaAtributoTime(jogadores, visitante.id, 'penalti', ['ATA','MEI','VOL','LAT']);
  const avgEscanteioV = mediaAtributoTime(jogadores, visitante.id, 'escanteio', ['ATA','MEI','VOL','LAT']);
  const avgCobradorV = mediaAtributoTime(jogadores, visitante.id, 'cobrador', ['ATA','MEI','VOL','LAT']);

  let gM = 0, gV = 0;
  const eventos = Math.floor(Math.random() * 6) + 4; // 4..9
  for (let evt = 0; evt < eventos; evt++) {
    if (Math.random() < 0.9) {
      var atacanteEhMandante = Math.random() < bias;
      if (atacanteEhMandante) {
        var zona = aleatorizarZona();
        var chanceType = aleatorizarTipoChance();
        var condicao = condicaoPorEvento(evt, eventos);
        var finalEfetiva = aplicarFadigaAtributo(avgFinalM, condicao);
        var reflexoEfetivo = aplicarFadigaAtributoGoleiro(avgReflexoV, condicao);
        var bolaParadaM = chanceType === 'PENALTY' ? avgPenaltiM : (chanceType === 'CORNER' ? avgEscanteioM : (chanceType === 'DIRECT_FK' ? avgCobradorM : 75));
        var xg = calcularXG(ataqueM, defesaV, zona, finalEfetiva, reflexoEfetivo, chanceType, avgPosicionamentoV, bolaParadaM);
        xg = Math.max(0.005, Math.min(0.6, xg * calcularModificadorZonaPorTatica(taticaM, zona, chanceType)));
        var isGoal = (Math.random() < xg);
        telemetryRows.push([/*matchId*/ mandante.id + '-' + visitante.id, mandante.id, visitante.id, evt, 'mandante', zona, chanceType, xg.toFixed(4), finalEfetiva, avgFinalM, condicao, bolaParadaM, reflexoEfetivo, avgReflexoV, condicao, avgPosicionamentoV, isGoal ? 1 : 0].join(','));
        if (isGoal) gM++;
      } else {
        var zona2 = aleatorizarZona();
        var chanceType2 = aleatorizarTipoChance();
        var condicao2 = condicaoPorEvento(evt, eventos);
        var finalEfetiva2 = aplicarFadigaAtributo(avgFinalV, condicao2);
        var reflexoEfetivo2 = aplicarFadigaAtributoGoleiro(avgReflexoM, condicao2);
        var bolaParadaV = chanceType2 === 'PENALTY' ? avgPenaltiV : (chanceType2 === 'CORNER' ? avgEscanteioV : (chanceType2 === 'DIRECT_FK' ? avgCobradorV : 75));
        var xg2 = calcularXG(ataqueV, defesaM, zona2, finalEfetiva2, reflexoEfetivo2, chanceType2, avgPosicionamentoM, bolaParadaV);
        xg2 = Math.max(0.005, Math.min(0.6, xg2 * calcularModificadorZonaPorTatica(taticaV, zona2, chanceType2)));
        var isGoal2 = (Math.random() < xg2);
        telemetryRows.push([mandante.id + '-' + visitante.id, mandante.id, visitante.id, evt, 'visitante', zona2, chanceType2, xg2.toFixed(4), finalEfetiva2, avgFinalV, condicao2, bolaParadaV, reflexoEfetivo2, avgReflexoM, condicao2, avgPosicionamentoM, isGoal2 ? 1 : 0].join(','));
        if (isGoal2) gV++;
      }
    }
  }

  matchSummaries.push([mandante.id + '-' + visitante.id, mandante.id, visitante.id, gM, gV].join(','));
  return { golsMandante: gM, golsVisitante: gV };
}

function sampleTwoDifferent(arr) {
  const a = Math.floor(Math.random() * arr.length);
  let b = Math.floor(Math.random() * arr.length);
  while (b === a) b = Math.floor(Math.random() * arr.length);
  return [arr[a], arr[b]];
}

const requestedMatches = Number.parseInt(process.argv[2], 10);
const N = Number.isFinite(requestedMatches) && requestedMatches > 0 ? requestedMatches : 5000;
const stats = {
  matches: N,
  homeWins: 0,
  awayWins: 0,
  draws: 0,
  goalsHome: 0,
  goalsAway: 0,
  goalsPerMatchCounts: {},
  avgGoalsPerMatch: 0,
  avgGoalsHome: 0,
  avgGoalsAway: 0
};

for (let i = 0; i < N; i++) {
  const [m, v] = sampleTwoDifferent(clubs);
  const res = calcularPlacarAleatorioCPU(m, v, true);
  const gh = res.golsMandante;
  const ga = res.golsVisitante;
  stats.goalsHome += gh;
  stats.goalsAway += ga;
  const total = gh + ga;
  stats.goalsPerMatchCounts[total] = (stats.goalsPerMatchCounts[total] || 0) + 1;
  if (gh > ga) stats.homeWins++;
  else if (gh < ga) stats.awayWins++;
  else stats.draws++;
}

// Escrever telemetria em CSV
try {
  const hdr = 'matchKey,homeId,awayId,eventIndex,team,zona,chanceType,xg,finalizacao,finalizacao_base,condicao_atacante,bola_parada,reflexo,reflexo_base,condicao_goleiro,posicionamento,goal\n';
  fs.writeFileSync('telemetry_shots.csv', hdr + telemetryRows.join('\n'), 'utf8');
  const hdr2 = 'matchKey,homeId,awayId,goalsHome,goalsAway\n';
  fs.writeFileSync('match_summaries.csv', hdr2 + matchSummaries.join('\n'), 'utf8');
  console.log('Telemetry written to telemetry_shots.csv and match_summaries.csv');
} catch (e) {
  console.error('Failed to write telemetry:', e);
}

stats.avgGoalsHome = stats.goalsHome / N;
stats.avgGoalsAway = stats.goalsAway / N;
stats.avgGoalsPerMatch = (stats.goalsHome + stats.goalsAway) / N;

console.log(JSON.stringify(stats, null, 2));
