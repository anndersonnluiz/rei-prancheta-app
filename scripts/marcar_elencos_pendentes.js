const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const jogadoresPath = path.join(root, 'data', 'jogadores.json');
const jogadores = JSON.parse(fs.readFileSync(jogadoresPath, 'utf8'));
let marcados = 0;

for (const jogador of jogadores) {
  if (!jogador.origem) {
    jogador.origem = 'a_revisar';
    marcados++;
  }
}

fs.writeFileSync(jogadoresPath, `${JSON.stringify(jogadores, null, 2)}\n`);
console.log(`Registros marcados para revisão factual: ${marcados}`);
