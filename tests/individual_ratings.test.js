const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const players = JSON.parse(fs.readFileSync(path.join(root, 'data', 'jogadores.json'), 'utf8'));
const references = JSON.parse(fs.readFileSync(path.join(root, 'data', 'avaliacoes_individuais_2026.json'), 'utf8'));
const normalize = (value) => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

for (const reference of references) {
  const player = players.find((item) => String(item.clubeId) === String(reference.clubeId) && normalize(item.nome) === normalize(reference.nome));
  if (!player) throw new Error(`Avaliação sem jogador correspondente: ${reference.nome} (${reference.clubeId})`);
  const attributes = player.atributos || {};
  const actual = player.posicao === 'GOL'
    ? Math.round(((Number(attributes.reflexo) || 75) * 2 + (Number(attributes.posicionamento) || 75) + (Number(attributes.distribuicao) || 75) + (Number(attributes.fisico) || 75)) / 5)
    : Math.round([attributes.finalizacao, attributes.passe, attributes.marcacao, attributes.velocidade, attributes.fisico].reduce((sum, value) => sum + (Number(value) || 75), 0) / 5);
  if (Math.abs(actual - reference.overall) > 1) throw new Error(`Overall divergente para ${reference.nome}: ${actual} != ${reference.overall}`);
  if (player.reputacaoIndividual !== reference.reputacao) throw new Error(`Reputação divergente para ${reference.nome}`);
}

const byId = new Map();
for (const player of players) {
  const key = `${player.nome}|${player.idade}|${player.posicao}|${player.clubeId}`;
  if (byId.has(key)) throw new Error(`Identidade duplicada: ${key}`);
  byId.set(key, player);
}

console.log(`individual_ratings.test.js passed (${references.length} avaliações protegidas)`);
