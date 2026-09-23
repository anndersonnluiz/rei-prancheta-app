const { spawn } = require('child_process');
const path = require('path');
const clubes = require('../data/clubes.json');

const amostras = Math.max(1, Number(process.argv[2]) || 5);
const temporadasPorAmostra = Math.max(1, Number(process.argv[3]) || 3);
const modoGestao = process.argv[4] === 'managed' ? 'managed' : 'passive';
const divisoes = ['A', 'B', 'C', 'D'];
const clubesPorDivisao = divisoes.reduce((grupos, divisao) => {
  grupos[divisao] = clubes.filter((clube) => clube.divisao === divisao);
  return grupos;
}, {});

const tarefas = Array.from({ length: amostras }, (_, i) => {
  const divisao = divisoes[i % divisoes.length];
  const candidatos = clubesPorDivisao[divisao];
  const clube = candidatos[Math.floor(i / divisoes.length) % candidatos.length];
  return { indice: i, clube, divisao };
});

function executarCenario(tarefa) {
  return new Promise((resolve, reject) => {
    const processo = spawn(process.execPath, [path.join(__dirname, '..', 'tests', 'long_term_continuity.test.js')], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        TEST_CLUB: tarefa.clube.nome,
        TEST_SEASONS: String(temporadasPorAmostra),
        TEST_CPU_MANAGED: modoGestao === 'managed' ? '1' : '0'
      },
      windowsHide: true
    });
    let stdout = '';
    let stderr = '';
    processo.stdout.on('data', (chunk) => { stdout += chunk; });
    processo.stderr.on('data', (chunk) => { stderr += chunk; });
    processo.on('error', reject);
    processo.on('close', (codigo) => {
      if (codigo !== 0) {
        reject(new Error(stderr || stdout || ('Cenário encerrou com código ' + codigo)));
        return;
      }
      const linha = stdout.split(/\r?\n/).find((item) => item.includes('balance report:'));
      if (!linha) {
        reject(new Error('Relatório de balanceamento não encontrado na amostra ' + (tarefa.indice + 1)));
        return;
      }
      resolve(JSON.parse(linha.split('balance report: ')[1]));
    });
  });
}

async function executarAuditoria() {
  const resultados = new Array(tarefas.length);
  const limiteParalelo = Math.max(1, Math.min(tarefas.length, Number(process.env.AUDIT_CONCURRENCY) || 1));
  let proximaTarefa = 0;

  async function trabalhador() {
    while (true) {
      const indice = proximaTarefa;
      proximaTarefa += 1;
      if (indice >= tarefas.length) return;
      resultados[indice] = await executarCenario(tarefas[indice]);
      process.stdout.write('cenario_concluido ' + (indice + 1) + '/' + tarefas.length + ' ' + resultados[indice].clube + '\n');
    }
  }

  await Promise.all(Array.from({ length: limiteParalelo }, () => trabalhador()));
  return resultados;
}

function media(resultados, campo) {
  return resultados.reduce((total, item) => total + (Number(item[campo]) || 0), 0) / resultados.length;
}

function faixa(resultados, campo) {
  const valores = resultados.map((item) => Number(item[campo]) || 0);
  return { minimo: Math.min(...valores), maximo: Math.max(...valores) };
}

function resumirDivisao(resultados, divisao) {
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

executarAuditoria().then((resultados) => console.log(JSON.stringify({
  amostras,
  temporadasPorAmostra,
  temporadasMedidas: amostras * temporadasPorAmostra,
  modoGestao,
  clubesAvaliados: resultados.map((item) => item.clube),
  medias: {
    golsPorPartida: Number(media(resultados, 'golsPorPartida').toFixed(2)),
    cartoes: Number(media(resultados, 'cartoesAcumulados').toFixed(1)),
    lesoes: Number(media(resultados, 'lesoesObservadas').toFixed(1)),
    reputacaoInicial: Number(media(resultados, 'reputacaoInicial').toFixed(1)),
    reputacaoFinal: Number(media(resultados, 'reputacaoFinal').toFixed(1)),
    variacaoReputacao: Number((media(resultados, 'reputacaoFinal') - media(resultados, 'reputacaoInicial')).toFixed(1)),
    maiorFolha: Number(media(resultados, 'maiorFolha').toFixed(2)),
    menorOrcamento: Number(media(resultados, 'menorOrcamento').toFixed(2))
  },
  faixas: {
    golsPorPartida: faixa(resultados, 'golsPorPartida'),
    cartoes: faixa(resultados, 'cartoesAcumulados'),
    lesoes: faixa(resultados, 'lesoesObservadas'),
    reputacaoFinal: faixa(resultados, 'reputacaoFinal'),
    menorOrcamento: faixa(resultados, 'menorOrcamento')
  },
  porDivisao: divisoes.reduce((grupos, divisao) => {
    grupos[divisao] = resumirDivisao(resultados, divisao);
    return grupos;
  }, {})
}, null, 2))).catch((erro) => {
  process.stderr.write((erro && erro.stack) || String(erro));
  process.exitCode = 1;
});
