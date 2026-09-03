const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const old = JSON.parse(fs.readFileSync(path.join(root, 'data', 'jogadores.json'), 'utf8'));
const source = JSON.parse(fs.readFileSync(path.join(root, 'data', 'elencos_fontes_2026.json'), 'utf8'));
const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+\([^)]*\)/g, '').replace(/[^a-z0-9]/g, '');
const byName = new Map();
for (const player of old) {
  const key = norm(player.nome);
  if (!byName.has(key)) byName.set(key, []);
  byName.get(key).push(player);
}
const report = { fonte: source.length, atuais: old.length, unicos: 0, ambiguos: 0, naoEncontrados: 0, exemplosAmbiguos: [], exemplosNovos: [], porDivisao: {} };
for (const row of source) {
  const matches = byName.get(norm(row.nome)) || [];
  if (matches.length === 1) report.unicos++;
  else if (matches.length > 1) {
    report.ambiguos++;
    if (report.exemplosAmbiguos.length < 30) report.exemplosAmbiguos.push({ fonte: row.nome, clube: row.club, registros: matches.map(p => ({ id: p.id, nome: p.nome, clubeId: p.clubeId, posicao: p.posicao, idade: p.idade })) });
  } else {
    report.naoEncontrados++;
    if (report.exemplosNovos.length < 30) report.exemplosNovos.push({ nome: row.nome, clube: row.club, posicao: row.posicao, idade: row.idade });
  }
  const divisao = row.clubId <= 20 ? 'A' : row.clubId <= 40 ? 'B' : 'C';
  report.porDivisao[divisao] = (report.porDivisao[divisao] || 0) + 1;
}
fs.writeFileSync(path.join(root, 'data', 'auditoria_importacao_elencos_2026.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
