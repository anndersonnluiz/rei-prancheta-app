const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const playersFile = path.join(root, 'data', 'jogadores.json');
const report = JSON.parse(fs.readFileSync(path.join(root, 'data', 'relatorio_resolucao_elencos_2026.json'), 'utf8'));
const players = JSON.parse(fs.readFileSync(playersFile, 'utf8'));
const backup = path.join(root, 'data', `jogadores.json.backup-${Date.now()}`);
fs.copyFileSync(playersFile, backup);
let applied = 0;
for (const item of report.seguros) {
  const current = players.find(p => String(p.id) === String(item.atual.id));
  if (!current) continue;
  current.clubeId = item.fonte.clubId;
  current.posicao = item.fonte.posicao;
  if (item.fonte.idade != null) current.idade = item.fonte.idade;
  current.origem = 'confirmado_fonte_2026';
  applied++;
}
fs.writeFileSync(playersFile, JSON.stringify(players, null, 2) + '\n');
console.log(JSON.stringify({ applied, backup }, null, 2));
