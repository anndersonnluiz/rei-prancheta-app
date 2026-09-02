const assert = require('assert');
const fs = require('fs');
const path = require('path');

const jogadores = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'jogadores.json'), 'utf8'));
const clubes = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'clubes.json'), 'utf8'));
const clubeIds = new Set(clubes.map((clube) => String(clube.id)));

assert.strictEqual(new Set(jogadores.map((jogador) => String(jogador.id))).size, jogadores.length, 'player IDs must be globally unique');
jogadores.forEach((jogador) => {
  assert.ok(jogador.nome && jogador.nome.trim(), `player ${jogador.id} should have a name`);
  assert.ok(clubeIds.has(String(jogador.clubeId)), `${jogador.nome} should reference an existing club`);
});

const realIdentity = (nome, clubeId) => jogadores.filter((jogador) => jogador.nome === nome && jogador.clubeId === clubeId && jogador.origem !== 'ficticio');
assert.strictEqual(realIdentity('Gerson', 9).length, 1, 'Gerson should have one Cruzeiro identity');
assert.strictEqual(realIdentity('Fabrício Bruno', 9).length, 1, 'Fabrício Bruno should have one Cruzeiro identity');
assert.strictEqual(realIdentity('Igor Vinícius', 18).length, 1, 'Igor Vinícius should have one Santos identity');
const app = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
assert.ok(app.includes('obterNomeUnicoGeradoInterno'), 'generated players should use a global unique-name allocator');
assert.ok(app.includes("origem: 'ficticio'") || app.includes('origem = \'ficticio\''), 'generated identities should be classifiable as fictitious');

console.log('roster_identity.test.js passed');
