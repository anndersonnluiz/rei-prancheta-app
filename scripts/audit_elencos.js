const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const clubes = JSON.parse(fs.readFileSync(path.join(root, 'data', 'clubes.json'), 'utf8'));
const jogadores = JSON.parse(fs.readFileSync(path.join(root, 'data', 'jogadores.json'), 'utf8'));
const clubesValidos = new Set(clubes.map((clube) => String(clube.id)));
const ids = new Map();
const nomes = new Map();
const problemas = [];

const identidadesReaisProtegidas = new Set(['gerson|9', 'fabrício bruno|9', 'igor vinícius|18']);

for (const jogador of jogadores) {
  const id = String(jogador.id);
  const nome = String(jogador.nome || '').trim();
  if (ids.has(id)) problemas.push(`ID duplicado: ${id}`);
  ids.set(id, jogador);
  if (!clubesValidos.has(String(jogador.clubeId))) problemas.push(`Clube inválido: ${nome} (${jogador.clubeId})`);
  const nomeBase = nome.replace(/\s+\([^)]*\)/g, '').replace(/\s+\d+$/, '').trim();
  const chave = nomeBase.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!chave) problemas.push(`Jogador sem nome: ${id}`);
  if (!nomes.has(chave)) nomes.set(chave, []);
  nomes.get(chave).push(jogador);
}

let duplicidades = [...nomes.values()].filter((grupo) => new Set(grupo.map((jogador) => String(jogador.clubeId))).size > 1);
if (process.argv.includes('--fix')) {
  const clubePorId = new Map(clubes.map((clube) => [String(clube.id), clube]));
  const nomesUsados = new Set();
  for (const grupo of duplicidades) {
    // Remove qualquer sufixo gerado antes de escolher um nome canônico.
    const base = String(grupo[0].nome).replace(/\s+\([^)]*\)/g, '').replace(/\s+\d+$/, '').trim();
    const manter = grupo.filter((jogador) => identidadesReaisProtegidas.has(`${String(jogador.nome).replace(/\s+\([^)]*\)/g, '').toLocaleLowerCase('pt-BR')}|${jogador.clubeId}`));
    let primeiro = manter[0] || grupo.slice().sort((a, b) => Number(a.id) - Number(b.id))[0];
    for (const jogador of grupo) {
      const protegido = jogador === primeiro;
      if (protegido) {
        jogador.nome = base;
        nomesUsados.add(base.toLocaleLowerCase('pt-BR'));
        continue;
      }
      const clube = clubePorId.get(String(jogador.clubeId));
      const sufixo = clube ? clube.nome.replace(/[^a-zA-ZÀ-ÿ0-9]+/g, ' ').trim() : `Clube ${jogador.clubeId}`;
      const nomeComClube = `${base} (${sufixo})`;
      let nomeNovo = nomeComClube;
      let contador = 2;
      while (nomesUsados.has(nomeNovo.toLocaleLowerCase('pt-BR'))) nomeNovo = `${nomeComClube} ${contador++}`;
      jogador.nome = nomeNovo;
      jogador.origem = 'ficticio';
      nomesUsados.add(nomeNovo.toLocaleLowerCase('pt-BR'));
    }
  }
  fs.writeFileSync(path.join(root, 'data', 'jogadores.json'), `${JSON.stringify(jogadores, null, 2)}\n`);
  // Recalcula o inventário depois do saneamento para o relatório representar
  // o estado final, e não os nomes capturados antes da correção.
  const nomesFinais = new Map();
  jogadores.forEach((jogador) => {
    const chave = String(jogador.nome).replace(/\s+\([^)]*\)/g, '').replace(/\s+\d+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!nomesFinais.has(chave)) nomesFinais.set(chave, []);
    nomesFinais.get(chave).push(jogador);
  });
  duplicidades = [...nomesFinais.values()].filter((grupo) => grupo.length > 1);
  console.log('Correção aplicada: nomes fictícios compartilhados foram tornados únicos.');
}
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
