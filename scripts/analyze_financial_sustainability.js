const fs = require('fs');
const path = require('path');

const clubs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'clubes.json'), 'utf8'));
const players = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'jogadores.json'), 'utf8'));

const byDivision = {};
for (const club of clubs) {
  const squad = players.filter((player) => String(player.clubeId) === String(club.id));
  const payroll = squad.reduce((total, player) => total + (Number(player.salario) || 0), 0);
  const capacity = Number(club.estadio && club.estadio.capacidade) || 20000;
  const reputation = Number(club.reputacao) || 50;
  const ticketRevenue = capacity * 0.65 * 80 * 19;
  const commercialRevenue = reputation * 25000 * 12;
  const sponsorshipRevenue = reputation * 500000 * 12;
  const maintenance = capacity * 20 * 12;
  const annualPayroll = payroll * 12;
  const annualResult = ticketRevenue + commercialRevenue + sponsorshipRevenue - maintenance - annualPayroll;
  const item = {
    id: club.id,
    nome: club.nome,
    divisao: club.divisao,
    orcamentoInicial: Number(club.orcamento) || 0,
    folhaMensal: payroll,
    receitasEstimadas: Math.round(ticketRevenue + commercialRevenue + sponsorshipRevenue),
    custosEstimados: Math.round(maintenance + annualPayroll),
    resultadoAnualEstimado: Math.round(annualResult),
    caixaAposUmAno: Math.round((Number(club.orcamento) || 0) + annualResult)
  };
  if (!byDivision[club.divisao]) byDivision[club.divisao] = [];
  byDivision[club.divisao].push(item);
}

const summary = Object.fromEntries(Object.entries(byDivision).map(([division, items]) => {
  const insolvent = items.filter((item) => item.caixaAposUmAno < 0).length;
  return [division, {
    clubes: items.length,
    folhaMensalMedia: Math.round(items.reduce((sum, item) => sum + item.folhaMensal, 0) / items.length),
    resultadoAnualMedio: Math.round(items.reduce((sum, item) => sum + item.resultadoAnualEstimado, 0) / items.length),
    caixaMedioAposUmAno: Math.round(items.reduce((sum, item) => sum + item.caixaAposUmAno, 0) / items.length),
    clubesInsolventesAposUmAno: insolvent,
    piorCenario: items.slice().sort((a, b) => a.caixaAposUmAno - b.caixaAposUmAno)[0]
  }];
}));

const report = { generatedAt: new Date().toISOString(), assumptions: { occupancy: 0.65, ticketPrice: 80, leagueHomeMatches: 19, months: 12 }, summary };
console.log(JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(__dirname, '..', 'financial_sustainability_report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
