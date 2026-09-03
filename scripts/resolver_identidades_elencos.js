const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const old = JSON.parse(fs.readFileSync(path.join(root, 'data', 'jogadores.json'), 'utf8'));
const source = JSON.parse(fs.readFileSync(path.join(root, 'data', 'elencos_fontes_2026.json'), 'utf8'));
const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+\([^)]*\)/g, '').replace(/[^a-z0-9]/g, '');
const byName = new Map();
for (const p of old) { const k = norm(p.nome); if (!byName.has(k)) byName.set(k, []); byName.get(k).push(p); }
const result = { seguros: [], ambiguos: [], pendentes: [], rejeitados: [] };
for (const row of source) {
  const candidates = (byName.get(norm(row.nome)) || []).filter(p => row.idade == null || Math.abs(Number(p.idade) - Number(row.idade)) <= 1);
  const samePosition = candidates.filter(p => p.posicao === row.posicao);
  if (samePosition.length === 1) result.seguros.push({ fonte: row, atual: samePosition[0] });
  else if (samePosition.length > 1 || candidates.length > 1) result.ambiguos.push({ fonte: row, candidatos: candidates });
  else if (candidates.length === 1) result.rejeitados.push({ fonte: row, candidato: candidates[0], motivo: 'posição divergente' });
  else result.pendentes.push(row);
}
const file = path.join(root, 'data', 'relatorio_resolucao_elencos_2026.json');
fs.writeFileSync(file, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ seguros: result.seguros.length, ambiguos: result.ambiguos.length, pendentes: result.pendentes.length, rejeitados: result.rejeitados.length, arquivo: file }, null, 2));
