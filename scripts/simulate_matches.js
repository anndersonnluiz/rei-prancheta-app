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

function calcularXG(forcaAtaque, forcaDefesa, zona, finalizacao, reflexo, chanceType) {
  var zonaMultipliers = { 'ATA':1.0, 'MEI':0.6, 'VOL':0.25, 'LAT':0.15, 'ZAG':0.05, 'INDEFINIDO':0.08 };
  var zm = zonaMultipliers[zona] || 0.08;
  var adv = forcaAtaque / Math.max(1, forcaDefesa);
  var base = 1.5 * adv * zm;

  finalizacao = (typeof finalizacao === 'number') ? finalizacao : 75;
  reflexo = (typeof reflexo === 'number') ? reflexo : 75;

  // Chance type base xG (overrides zone-based if set-piece)
  if (chanceType && chanceType !== 'NORMAL') {
    var baseXGType = calcularXGPorTipoChance(chanceType);
    if (baseXGType > 0) {
      base = baseXGType;
    }
  }

  var shooterBoost = 1 + Math.max(-0.4, Math.min(0.8, (finalizacao - 75) * 0.012));
  var goalieReduction = Math.max(0, Math.min(0.85, reflexo * 0.006));

  var xg = base * shooterBoost * (1 - goalieReduction);
  return Math.max(0.005, Math.min(0.6, xg));
}

function mediaAtributoTime(jogadoresList, clubeId, atributo, posFilter) {
  var jTime = jogadoresList.filter(function(j) { return j.clubeId === clubeId && j.atributos; });
  if (posFilter && posFilter.length > 0) jTime = jTime.filter(function(j) { return posFilter.indexOf(j.posicao) !== -1; });
  if (!jTime || jTime.length === 0) return 75;
  var soma = jTime.reduce(function(s, j) { return s + (j.atributos[atributo] || 75); }, 0);
  return Math.round(soma / jTime.length);
}

function calcularPlacarAleatorioCPU(mandante, visitante, aplicaCasa) {
  const forcaM = mandante.reputacao + (aplicaCasa ? 10 : 0);
  const forcaV = visitante.reputacao;
  const diff = forcaM - forcaV;
  let bias = 0.5 + (diff / (forcaM + forcaV)) * 0.35;
  bias = Math.max(0.05, Math.min(0.95, bias));

  const avgFinalM = mediaAtributoTime(jogadores, mandante.id, 'finalizacao', ['ATA','MEI','VOL','LAT']);
  const avgReflexoM = mediaAtributoTime(jogadores, mandante.id, 'reflexo', ['GOL']);
  const avgFinalV = mediaAtributoTime(jogadores, visitante.id, 'finalizacao', ['ATA','MEI','VOL','LAT']);
  const avgReflexoV = mediaAtributoTime(jogadores, visitante.id, 'reflexo', ['GOL']);

  let gM = 0, gV = 0;
  const eventos = Math.floor(Math.random() * 6) + 4; // 4..9
  for (let evt = 0; evt < eventos; evt++) {
    if (Math.random() < 0.9) {
      var atacanteEhMandante = Math.random() < bias;
      if (atacanteEhMandante) {
        var zona = aleatorizarZona();
        var chanceType = aleatorizarTipoChance();
        var xg = calcularXG(forcaM, forcaV, zona, avgFinalM, avgReflexoV, chanceType);
        var isGoal = (Math.random() < xg);
        telemetryRows.push([/*matchId*/ mandante.id + '-' + visitante.id, mandante.id, visitante.id, evt, 'mandante', zona, chanceType, xg.toFixed(4), avgFinalM, avgReflexoV, isGoal ? 1 : 0].join(','));
        if (isGoal) gM++;
      } else {
        var zona2 = aleatorizarZona();
        var chanceType2 = aleatorizarTipoChance();
        var xg2 = calcularXG(forcaV, forcaM, zona2, avgFinalV, avgReflexoM, chanceType2);
        var isGoal2 = (Math.random() < xg2);
        telemetryRows.push([mandante.id + '-' + visitante.id, mandante.id, visitante.id, evt, 'visitante', zona2, chanceType2, xg2.toFixed(4), avgFinalV, avgReflexoM, isGoal2 ? 1 : 0].join(','));
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

const N = 5000;
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
  const hdr = 'matchKey,homeId,awayId,eventIndex,team,zona,chanceType,xg,finalizacao,reflexo,goal\n';
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
