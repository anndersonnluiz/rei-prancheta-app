const fs = require('fs');
const path = require('path');

const players = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'jogadores.json'), 'utf8'));
const clubs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'clubes.json'), 'utf8'));
const divisionByClub = Object.fromEntries(clubs.map((club) => [String(club.id), club.divisao]));
const groups = {};
const values = [];

for (const player of players) {
  const division = player.divisao || divisionByClub[String(player.clubeId)] || (player.clubeId === 'mercado' ? 'mercado' : 'sem-divisao');
  const salary = Number(player.salario) || 0;
  const years = Number(player.anosContrato) || 0;
  const marketValue = Number(player.valorMercadoDinamico) || salary * 100;
  if (!groups[division]) groups[division] = { players: 0, salary: 0, minSalary: Infinity, maxSalary: 0, marketValue: 0, shortContracts: 0 };
  const group = groups[division];
  group.players++;
  group.salary += salary;
  group.marketValue += marketValue;
  group.minSalary = Math.min(group.minSalary, salary);
  group.maxSalary = Math.max(group.maxSalary, salary);
  if (years > 0 && years <= 1) group.shortContracts++;
  values.push({ salary, marketValue });
}

function median(items, key) {
  const sorted = items.map((item) => item[key]).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
}

const report = {
  generatedAt: new Date().toISOString(),
  players: players.length,
  salaryMedian: median(values, 'salary'),
  marketValueMedian: median(values, 'marketValue'),
  byDivision: Object.fromEntries(Object.entries(groups).map(([division, group]) => [division, {
    players: group.players,
    averageSalary: Math.round(group.salary / group.players),
    minSalary: group.minSalary,
    maxSalary: group.maxSalary,
    averageMarketValue: Math.round(group.marketValue / group.players),
    shortContracts: group.shortContracts
  }]))
};

console.log(JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(__dirname, '..', 'market_balance_report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
