const fs = require('fs');

const telemetryPath = 'telemetry_shots.csv';
if (!fs.existsSync(telemetryPath)) {
  console.error(`Arquivo ${telemetryPath} não encontrado.`);
  process.exit(1);
}

const lines = fs.readFileSync(telemetryPath, 'utf8').split('\n').filter(l => l.trim());
const header = lines[0].split(',');
const data = lines.slice(1);
const chanceTypeIndex = header.indexOf('chanceType');
const xgIndex = header.indexOf('xg');
const goalIndex = header.indexOf('goal');

// Parse by header to support both legacy and current telemetry schemas.
const chancetypes = {};
const stats = {
  totalShots: 0,
  totalGoals: 0,
  byChanceType: {}
};

data.forEach((line, idx) => {
  const parts = line.split(',');
  if (parts.length < 11) return;
  
  const chanceType = chanceTypeIndex >= 0 ? parts[chanceTypeIndex].trim() : 'NORMAL';
  const xg = parseFloat(parts[xgIndex].trim()) || 0;
  const goal = parseInt(parts[goalIndex].trim()) || 0;

  if (!chancetypes[chanceType]) {
    chancetypes[chanceType] = { shots: 0, goals: 0, xgSum: 0 };
  }

  chancetypes[chanceType].shots++;
  chancetypes[chanceType].goals += goal;
  chancetypes[chanceType].xgSum += xg;

  stats.totalShots++;
  stats.totalGoals += goal;
});

// Calcular estatísticas por tipo de chance
const results = [];
const typeOrder = ['PENALTY', 'CORNER', 'DIRECT_FK', 'NORMAL'];

typeOrder.forEach(type => {
  if (!chancetypes[type]) return;
  
  const c = chancetypes[type];
  const avgXg = c.xgSum / c.shots;
  const conversionRate = c.shots > 0 ? (c.goals / c.shots) : 0;

  results.push({
    chanceType: type,
    shots: c.shots,
    goals: c.goals,
    percentage: ((c.shots / stats.totalShots) * 100).toFixed(2),
    avgXg: avgXg.toFixed(4),
    totalXg: c.xgSum.toFixed(4),
    conversionRate: (conversionRate * 100).toFixed(2),
    efficiency: c.xgSum > 0 ? ((c.goals / c.xgSum) * 100).toFixed(2) : '0.00'
  });
});

console.log('=== Chance Types Analysis ===');
console.log('Total shots:', stats.totalShots);
console.log('Total goals:', stats.totalGoals);
console.log('');
console.log('By Chance Type:');
results.forEach(r => {
  console.log(`  ${r.chanceType}: ${r.shots} shots (${r.percentage}%), ${r.goals} goals, xG avg=${r.avgXg}, conversion=${r.conversionRate}%, efficiency=${r.efficiency}%`);
});
console.log('');

// Expected vs Actual by type
console.log('Set-Piece Impact:');
typeOrder.forEach(type => {
  if (!chancetypes[type]) return;
  const c = chancetypes[type];
  const expectedGoals = c.xgSum;
  const actualGoals = c.goals;
  const diff = actualGoals - expectedGoals;
  console.log(`  ${type}: Expected ${expectedGoals.toFixed(0)} goals, got ${actualGoals} (${diff > 0 ? '+' : ''}${diff.toFixed(0)})`);
});
