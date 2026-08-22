const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const clubesPath = path.join(root, 'data', 'clubes.json');
const jogadoresPath = path.join(root, 'data', 'jogadores.json');
const clubes = JSON.parse(fs.readFileSync(clubesPath, 'utf8'));
const jogadores = JSON.parse(fs.readFileSync(jogadoresPath, 'utf8'));

const firstNames = ['Arthur', 'Caio', 'Davi', 'Enzo', 'Heitor', 'Ian', 'João', 'Kaique', 'Luan', 'Miguel', 'Nicolas', 'Otávio', 'Rafael', 'Samuel', 'Theo', 'Vitor', 'Yago', 'Breno'];
const lastNames = ['Almeida', 'Barbosa', 'Cardoso', 'Castro', 'Dias', 'Duarte', 'Ferreira', 'Freitas', 'Gomes', 'Lima', 'Mendes', 'Moreira', 'Nogueira', 'Pereira', 'Ramos', 'Santos', 'Silva', 'Teixeira'];
const genericName = /^(Alex|Carlos|Diego|Fernando|Gabriel|Leonardo|Lucas|Marcelo|Marcos|Matheus|Pedro|Rafael|Rodrigo|Thiago|Bruno|Eduardo|Felipe|João|Gustavo|André|Paulo|Vinicius|Victor|William|Wesley|Ricardo|Daniel|Caio|Renato|Sérgio|Sergio) /;
const protectedNames = new Set([
  'Neymar Jr', 'Gabigol', 'Rony', 'João Paulo', 'Gabriel Brazão', 'João Schmidt', 'Lucas Veríssimo',
  'Cássio', 'Kaio Jorge', 'Matheus Pereira', 'Lucas Romero', 'Fabrício Bruno', 'Lucas Villalba',
  'Gustavo Gómez', 'Piquerez', 'Andreas Pereira', 'Jhon Arias', 'Vitor Roque', 'Marcelo Lomba',
  'Hugo Souza', 'Matheuzinho', 'André Carrillo', 'Rodrigo Garro', 'Yuri Alberto', 'Jesse Lingard',
  'Raniele', 'Hulk', 'Everson', 'Renan Lodi', 'Gustavo Scarpa', 'Bernard', 'Dudu', 'Reinier'
]);
const divisionBase = { A: 76, B: 69, C: 63, D: 57 };
const divisionSalaryFactor = { A: 70, B: 45, C: 28, D: 20 };
const positionBonus = { GOL: 0, LAT: 1, ZAG: 1, VOL: 2, MEI: 3, ATA: 3 };

function hash(value) {
  let result = 0;
  for (let i = 0; i < value.length; i += 1) result = (result * 31 + value.charCodeAt(i)) >>> 0;
  return result;
}

const clubById = new Map(clubes.map((club) => [club.id, club]));
const usedByClub = new Map();

for (const player of jogadores) {
  const club = clubById.get(player.clubeId);
  if (!club) continue;
  const clubPlayers = jogadores.filter((item) => item.clubeId === player.clubeId);
  const index = clubPlayers.findIndex((item) => item.id === player.id);
  const seed = hash(`${club.nome}:${player.id}`);
  const clubStrength = Math.round((Number(club.reputacao) || 50) / 20);
  const target = Math.max(45, Math.min(92, divisionBase[club.divisao] + clubStrength + (index % 7) - 3 + (positionBonus[player.posicao] || 0)));

  if (genericName.test(player.nome) && !protectedNames.has(player.nome) && !player.nomeFicticio) {
    let candidate = `${firstNames[seed % firstNames.length]} ${lastNames[(seed >>> 8) % lastNames.length]}`;
    const seen = usedByClub.get(player.clubeId) || new Set();
    let suffix = 2;
    while (seen.has(candidate)) candidate = `${firstNames[seed % firstNames.length]} ${lastNames[(seed >>> 8) % lastNames.length]} ${suffix++}`;
    player.nome = candidate;
    player.nomeFicticio = true;
    seen.add(candidate);
    usedByClub.set(player.clubeId, seen);
  }

  const ageFactor = player.idade <= 21 ? 2 : player.idade >= 32 ? -1 : 0;
  const jitter = (seed % 5) - 2;
  const value = Math.max(40, Math.min(96, target + ageFactor + jitter));
  if (!player.atributos) player.atributos = {};
  if (player.posicao === 'GOL') {
    player.atributos.reflexo = value + 2;
    player.atributos.posicionamento = value;
    player.atributos.distribuicao = value - 1;
    player.atributos.fisico = value;
  } else {
    player.atributos.finalizacao = value + (player.posicao === 'ATA' ? 2 : 0);
    player.atributos.passe = value + (player.posicao === 'MEI' || player.posicao === 'VOL' ? 2 : 0);
    player.atributos.marcacao = value + (['ZAG', 'VOL', 'LAT'].includes(player.posicao) ? 2 : 0);
    player.atributos.velocidade = value;
    player.atributos.fisico = value;
  }
  player.salario = Math.round((value * value * divisionSalaryFactor[club.divisao]) / 100) * 100;
  player.salarioDesejado = Math.round((player.salario * (1 + (player.idade <= 23 ? 0.12 : 0.04))) / 100) * 100;
  player.potencial = Math.max(value, Math.min(98, value + (player.idade <= 21 ? 8 : player.idade <= 25 ? 4 : 1)));
}

fs.writeFileSync(jogadoresPath, `${JSON.stringify(jogadores, null, 2)}\n`);
console.log(`Normalizados ${jogadores.length} jogadores de ${clubes.length} clubes.`);
