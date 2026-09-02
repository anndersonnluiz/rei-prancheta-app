const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const clubes = JSON.parse(fs.readFileSync(path.join(root, 'data', 'clubes.json'), 'utf8'));
const jogadores = JSON.parse(fs.readFileSync(path.join(root, 'data', 'jogadores.json'), 'utf8'));
const clubesValidos = new Set(clubes.map((clube) => String(clube.id)));
const ids = new Map();
const nomes = new Map();
const problemas = [];

for (const jogador of jogadores) {
  const id = String(jogador.id);
  const nome = String(jogador.nome || '').trim();
  if (ids.has(id)) problemas.push(`ID duplicado: ${id}`);
  ids.set(id, jogador);
  if (!clubesValidos.has(String(jogador.clubeId))) problemas.push(`Clube inválido: ${nome} (${jogador.clubeId})`);
  const chave = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!chave) problemas.push(`Jogador sem nome: ${id}`);
  if (!nomes.has(chave)) nomes.set(chave, []);
  nomes.get(chave).push(jogador);
}

const duplicidades = [...nomes.values()].filter((grupo) => new Set(grupo.map((jogador) => String(jogador.clubeId))).size > 1);
const duplicidadesNaoFicticias = duplicidades.filter((grupo) => grupo.some((jogador) => jogador.origem !== 'ficticio'));
for (const grupo of duplicidadesNaoFicticias) {
  problemas.push(`Nome compartilhado sem classificação fictícia: ${grupo.map((jogador) => `${jogador.nome}#${jogador.id}@${jogador.clubeId}`).join(', ')}`);
}

console.log(JSON.stringify({
  clubes: clubes.length,
  jogadores: jogadores.length,
  idsUnicos: ids.size === jogadores.length,
  nomesCompartilhadosEntreClubes: duplicidades.length,
  compartilhamentosComRegistroNaoFicticio: duplicidadesNaoFicticias.length,
  problemas: problemas.length,
  amostraProblemas: problemas.slice(0, 20)
}, null, 2));

if (problemas.some((problema) => problema.startsWith('ID duplicado') || problema.startsWith('Clube inválido') || problema.startsWith('Jogador sem nome'))) {
  process.exitCode = 1;
}
