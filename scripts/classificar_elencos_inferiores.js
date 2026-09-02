const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const clubes = JSON.parse(fs.readFileSync(path.join(root, 'data', 'clubes.json'), 'utf8'));
const jogadoresPath = path.join(root, 'data', 'jogadores.json');
const jogadores = JSON.parse(fs.readFileSync(jogadoresPath, 'utf8'));
const divisaoPorClube = new Map(clubes.map((clube) => [String(clube.id), clube.divisao]));
let classificados = 0;

for (const jogador of jogadores) {
  if (!jogador.origem && ['C', 'D'].includes(divisaoPorClube.get(String(jogador.clubeId)))) {
    jogador.origem = 'ficticio';
    classificados++;
  }
}

fs.writeFileSync(jogadoresPath, `${JSON.stringify(jogadores, null, 2)}\n`);
console.log(`Registros classificados como fictícios: ${classificados}`);
