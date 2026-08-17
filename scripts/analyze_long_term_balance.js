const { spawnSync } = require('child_process');

const amostras = Number(process.argv[2]) || 5;
const resultados = [];

for (let i = 0; i < amostras; i += 1) {
  const execucao = spawnSync(process.execPath, ['tests/long_term_continuity.test.js'], { encoding: 'utf8' });
  if (execucao.status !== 0) {
    process.stderr.write(execucao.stderr || execucao.stdout);
    process.exit(execucao.status || 1);
  }
  const linha = execucao.stdout.split(/\r?\n/).find((item) => item.includes('balance report:'));
  if (!linha) throw new Error('Relatório de balanceamento não encontrado na amostra ' + (i + 1));
  resultados.push(JSON.parse(linha.split('balance report: ')[1]));
}

function media(campo) {
  return resultados.reduce((total, item) => total + (Number(item[campo]) || 0), 0) / resultados.length;
}

function faixa(campo) {
  const valores = resultados.map((item) => Number(item[campo]) || 0);
  return { minimo: Math.min(...valores), maximo: Math.max(...valores) };
}

console.log(JSON.stringify({
  amostras,
  temporadasPorAmostra: 3,
  medias: {
    golsPorPartida: Number(media('golsPorPartida').toFixed(2)),
    cartoes: Number(media('cartoesAcumulados').toFixed(1)),
    lesoes: Number(media('lesoesObservadas').toFixed(1)),
    maiorFolha: Number(media('maiorFolha').toFixed(2)),
    menorOrcamento: Number(media('menorOrcamento').toFixed(2))
  },
  faixas: {
    golsPorPartida: faixa('golsPorPartida'),
    cartoes: faixa('cartoesAcumulados'),
    lesoes: faixa('lesoesObservadas'),
    menorOrcamento: faixa('menorOrcamento')
  }
}, null, 2));
