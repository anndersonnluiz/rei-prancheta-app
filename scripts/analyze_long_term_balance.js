const { spawnSync } = require('child_process');
const clubes = require('../data/clubes.json');

const amostras = Math.max(1, Number(process.argv[2]) || 5);
const temporadasPorAmostra = Math.max(1, Number(process.argv[3]) || 3);
const modoGestao = process.argv[4] === 'managed' ? 'managed' : 'passive';
const resultados = [];
const divisoes = ['A', 'B', 'C', 'D'];
const clubesPorDivisao = divisoes.reduce((grupos, divisao) => {
  grupos[divisao] = clubes.filter((clube) => clube.divisao === divisao);
  return grupos;
}, {});

for (let i = 0; i < amostras; i += 1) {
  const divisao = divisoes[i % divisoes.length];
  const candidatos = clubesPorDivisao[divisao];
  const clube = candidatos[Math.floor(i / divisoes.length) % candidatos.length];
  const execucao = spawnSync(process.execPath, ['tests/long_term_continuity.test.js'], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, TEST_CLUB: clube.nome, TEST_SEASONS: String(temporadasPorAmostra), TEST_CPU_MANAGED: modoGestao === 'managed' ? '1' : '0' }
  });
  if (execucao.status !== 0) {
    process.stderr.write(execucao.stderr || execucao.stdout);
    process.exit(execucao.status || 1);
  }
  const linha = String(execucao.stdout || '').split(/\r?\n/).find((item) => item.includes('balance report:'));
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

function resumirDivisao(divisao) {
  const amostrasDivisao = resultados.filter((item) => item.divisaoInicial === divisao);
  if (amostrasDivisao.length === 0) return null;
  const mediaDivisao = (campo) => amostrasDivisao.reduce((total, item) => total + (Number(item[campo]) || 0), 0) / amostrasDivisao.length;
  const trajetorias = amostrasDivisao.flatMap((item) => Array.isArray(item.trajetoriaDivisoes) ? item.trajetoriaDivisoes : []);
  const transicoes = trajetorias.reduce((resultado, trajetoria) => {
    if (trajetoria.proximaDivisao < trajetoria.divisao) resultado.acessos += 1;
    else if (trajetoria.proximaDivisao > trajetoria.divisao) resultado.rebaixamentos += 1;
    else resultado.permanencias += 1;
    resultado.posicoes.push(Number(trajetoria.posicao) || 0);
    return resultado;
  }, { acessos: 0, rebaixamentos: 0, permanencias: 0, posicoes: [] });
  return {
    amostras: amostrasDivisao.length,
    clubes: amostrasDivisao.map((item) => item.clube),
    divisoesFinais: amostrasDivisao.reduce((contagem, item) => {
      contagem[item.divisaoFinal] = (contagem[item.divisaoFinal] || 0) + 1;
      return contagem;
    }, {}),
    golsPorPartida: Number(mediaDivisao('golsPorPartida').toFixed(2)),
    cartoes: Number(mediaDivisao('cartoesAcumulados').toFixed(1)),
    lesoes: Number(mediaDivisao('lesoesObservadas').toFixed(1)),
    reputacaoFinal: Number(mediaDivisao('reputacaoFinal').toFixed(1)),
    variacaoReputacao: Number((mediaDivisao('reputacaoFinal') - mediaDivisao('reputacaoInicial')).toFixed(1)),
    acessos: transicoes.acessos,
    rebaixamentos: transicoes.rebaixamentos,
    permanencias: transicoes.permanencias,
    posicaoMedia: transicoes.posicoes.length ? Number((transicoes.posicoes.reduce((total, posicao) => total + posicao, 0) / transicoes.posicoes.length).toFixed(1)) : null,
    maiorFolha: Number(mediaDivisao('maiorFolha').toFixed(2)),
    menorOrcamento: Number(mediaDivisao('menorOrcamento').toFixed(2))
  };
}

console.log(JSON.stringify({
  amostras,
  temporadasPorAmostra,
  temporadasMedidas: amostras * temporadasPorAmostra,
  modoGestao,
  clubesAvaliados: resultados.map((item) => item.clube),
  medias: {
    golsPorPartida: Number(media('golsPorPartida').toFixed(2)),
    cartoes: Number(media('cartoesAcumulados').toFixed(1)),
    lesoes: Number(media('lesoesObservadas').toFixed(1)),
    reputacaoInicial: Number(media('reputacaoInicial').toFixed(1)),
    reputacaoFinal: Number(media('reputacaoFinal').toFixed(1)),
    variacaoReputacao: Number((media('reputacaoFinal') - media('reputacaoInicial')).toFixed(1)),
    maiorFolha: Number(media('maiorFolha').toFixed(2)),
    menorOrcamento: Number(media('menorOrcamento').toFixed(2))
  },
  faixas: {
    golsPorPartida: faixa('golsPorPartida'),
    cartoes: faixa('cartoesAcumulados'),
    lesoes: faixa('lesoesObservadas'),
    reputacaoFinal: faixa('reputacaoFinal'),
    menorOrcamento: faixa('menorOrcamento')
  },
  porDivisao: divisoes.reduce((grupos, divisao) => {
    grupos[divisao] = resumirDivisao(divisao);
    return grupos;
  }, {})
}, null, 2));
