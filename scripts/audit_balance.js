const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const players = JSON.parse(fs.readFileSync(path.join(root, 'data', 'jogadores.json'), 'utf8'));
const clubs = JSON.parse(fs.readFileSync(path.join(root, 'data', 'clubes.json'), 'utf8'));
const clubById = new Map(clubs.map((club) => [String(club.id), club]));

function overall(player) {
  const a = player.atributos || {};
  if (player.posicao === 'GOL') {
    return Math.round(((Number(a.reflexo) || 75) * 2 + (Number(a.posicionamento) || Number(a.reflexo) || 75) + (Number(a.distribuicao) || Number(a.passe) || 75) + (Number(a.fisico) || 75)) / 5);
  }
  return Math.round(([a.finalizacao, a.passe, a.marcacao, a.velocidade, a.fisico].reduce((sum, value) => sum + (Number(value) || 75), 0)) / 5);
}

const groups = new Map();
const signatures = new Map();
for (const player of players) {
  const club = clubById.get(String(player.clubeId));
  if (!club) continue;
  const row = groups.get(club.id) || { club, count: 0, total: 0, over90: 0, max: 0 };
  const rating = overall(player);
  row.count += 1;
  row.total += rating;
  row.over90 += rating >= 90 ? 1 : 0;
  row.max = Math.max(row.max, rating);
  groups.set(club.id, row);
  const a = player.atributos || {};
  const signature = `${club.id}|${['finalizacao', 'passe', 'marcacao', 'velocidade', 'fisico'].map((key) => a[key]).join('|')}`;
  const list = signatures.get(signature) || [];
  list.push(player);
  signatures.set(signature, list);
}

const alerts = [...groups.values()].filter((row) => row.over90 >= 5 || (row.count >= 20 && row.total / row.count >= 84)).map((row) => ({
  clube: row.club.nome,
  divisao: row.club.divisao,
  jogadores: row.count,
  mediaOverall: Number((row.total / row.count).toFixed(1)),
  maiorOverall: row.max,
  acimaDe90: row.over90
}));
const repeatedAttributeBlocks = [...signatures.values()].filter((list) => list.length >= 5).map((list) => ({
  quantidade: list.length,
  assinatura: ['finalizacao', 'passe', 'marcacao', 'velocidade', 'fisico'].map((key) => list[0].atributos?.[key]),
  jogadores: list.slice(0, 8).map((player) => `${player.nome}#${player.id}`)
}));

const report = { jogadores: players.length, clubesAuditados: groups.size, alertasClubes: alerts, blocosDeAtributosRepetidos: repeatedAttributeBlocks };
console.log(JSON.stringify(report, null, 2));
if (alerts.length || repeatedAttributeBlocks.length) process.exitCode = 1;
