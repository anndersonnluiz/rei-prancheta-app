const assert = require('assert');
const fs = require('fs');
const path = require('path');

const clubes = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'clubes.json'), 'utf8'));
const jogadores = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'jogadores.json'), 'utf8'));
const porDivisao = clubes.reduce((grupos, clube) => {
  grupos[clube.divisao] = (grupos[clube.divisao] || 0) + 1;
  return grupos;
}, {});

['A', 'B', 'C', 'D'].forEach((divisao) => assert.strictEqual(porDivisao[divisao], 20, `division ${divisao} should have 20 clubs`));
assert.strictEqual(new Set(clubes.map((clube) => clube.nome)).size, clubes.length, 'club names should be unique');
clubes.forEach((item) => {
  const elenco = jogadores.filter((jogador) => jogador.clubeId === item.id);
  assert.strictEqual(elenco.length, 18, `${item.nome} should have 18 players`);
  assert.strictEqual(new Set(elenco.map((jogador) => jogador.nome)).size, elenco.length, `${item.nome} should not duplicate players internally`);
});

const clube = (nome) => clubes.find((item) => item.nome === nome);
assert.strictEqual(clube('Chapecoense').divisao, 'A');
assert.strictEqual(clube('Mirassol').divisao, 'A');
assert.strictEqual(clube('Ceará').divisao, 'B');
assert.strictEqual(clube('Remo').divisao, 'A');
assert.strictEqual(clube('Red Bull Bragantino').divisao, 'A');
assert.strictEqual(clube('Athletic Club').divisao, 'B');
assert.strictEqual(clube('Joinville').divisao, 'D');
assert.strictEqual(clube('Inter de Limeira').divisao, 'C');
assert.strictEqual(clube('Cuiabá').divisao, 'B');

const santos2026 = jogadores.filter((jogador) => jogador.clubeId === 18).map((jogador) => jogador.nome);
['Neymar Jr', 'Gabigol', 'Rony', 'João Paulo'].forEach((nome) => assert.ok(santos2026.includes(nome), `Santos should include ${nome}`));

const cruzeiro2026 = jogadores.filter((jogador) => jogador.clubeId === 9).map((jogador) => jogador.nome);
['Cássio', 'Kaio Jorge', 'Matheus Pereira', 'Lucas Romero'].forEach((nome) => assert.ok(cruzeiro2026.includes(nome), `Cruzeiro should include ${nome}`));
assert.ok(!jogadores.some((jogador) => jogador.clubeId === 1 && jogador.nome === 'Gabigol'), 'Gabigol should not remain at Flamengo in 2026');

console.log('club_data_2026.test.js passed');
