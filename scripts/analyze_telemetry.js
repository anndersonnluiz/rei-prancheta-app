const fs = require('fs');
const path = require('path');

const telemetryPath = 'telemetry_shots.csv';
if (!fs.existsSync(telemetryPath)) {
  console.error(`Arquivo ${telemetryPath} não encontrado. Execute simulate_matches.js primeiro.`);
  process.exit(1);
}

const lines = fs.readFileSync(telemetryPath, 'utf8').split('\n').filter(l => l.trim());
const header = lines[0].split(',');
const data = lines.slice(1);
const xgIndex = header.indexOf('xg');
const goalIndex = header.indexOf('goal');

// Parse by header to support both legacy and current telemetry schemas.
const zones = {};
const stats = {
  totalShots: 0,
  totalGoals: 0,
  byZone: {}
};

data.forEach((line, idx) => {
  const parts = line.split(',');
  if (parts.length < 11) return;
  
  const zona = parts[5].trim();
  const xg = parseFloat(parts[xgIndex].trim()) || 0;
  const goal = parseInt(parts[goalIndex].trim()) || 0;

  if (!zones[zona]) {
    zones[zona] = { shots: 0, goals: 0, xgSum: 0, xgList: [] };
  }

  zones[zona].shots++;
  zones[zona].goals += goal;
  zones[zona].xgSum += xg;
  zones[zona].xgList.push(xg);

  stats.totalShots++;
  stats.totalGoals += goal;
});

// Calcular estatísticas por zona
const results = [];
const zoneOrder = ['ATA', 'MEI', 'VOL', 'LAT', 'ZAG'];

zoneOrder.forEach(zona => {
  if (!zones[zona]) return;
  
  const z = zones[zona];
  const avgXg = z.xgSum / z.shots;
  const conversionRate = z.shots > 0 ? (z.goals / z.shots) : 0;
  const xgExpectedGoals = z.xgSum; // Total xG é soma de xGs individuais

  results.push({
    zona: zona,
    shots: z.shots,
    goals: z.goals,
    avgXg: avgXg.toFixed(4),
    totalXg: z.xgSum.toFixed(4),
    conversionRate: (conversionRate * 100).toFixed(2),
    efficiency: ((z.goals / z.xgSum) * 100).toFixed(2) // Goals vs Expected (xG)
  });
});

// Escrever CSV
const csvRows = ['zona,shots,goals,avgXg,totalXg,conversionRate%,efficiency%'];
results.forEach(r => {
  csvRows.push([r.zona, r.shots, r.goals, r.avgXg, r.totalXg, r.conversionRate, r.efficiency].join(','));
});

const csvContent = csvRows.join('\n');
fs.writeFileSync('zones_summary.csv', csvContent, 'utf8');

console.log('=== Telemetry Analysis ===');
console.log('Total shots:', stats.totalShots);
console.log('Total goals:', stats.totalGoals);
console.log('Overall conversion rate:', ((stats.totalGoals / stats.totalShots) * 100).toFixed(2) + '%');
console.log('');
console.log('By Zone:');
results.forEach(r => {
  console.log(`  ${r.zona}: ${r.shots} shots, ${r.goals} goals, xG avg=${r.avgXg}, conversion=${r.conversionRate}%, efficiency=${r.efficiency}%`);
});
console.log('');
console.log('Results written to zones_summary.csv');
