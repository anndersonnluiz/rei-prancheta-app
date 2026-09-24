const { spawn } = require('child_process');
const path = require('path');
const clubes = require('../data/clubes.json');

const temporadasPorAmostra = Math.max(1, Number(process.argv[2]) || 2);
const sementesPorClube = Math.max(1, Number(process.argv[3]) || 2);
const concorrencia = Math.max(1, Number(process.env.AUDIT_CONCURRENCY) || 1);
const nomesAlvo = ['Flamengo', 'Palmeiras', 'Cruzeiro', 'Chapecoense', 'Figueirense'];
const clubesAlvo = nomesAlvo.map((nome) => clubes.find((clube) => clube.nome === nome));

if (clubesAlvo.some((clube) => !clube)) {
  throw new Error('Clube alvo não encontrado nos dados-base');
}

function hashSeed(valor) {
  let hash = 2166136261;
  for (const caractere of valor) {
    hash ^= caractere.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}

const tarefas = clubesAlvo.flatMap((clube) => Array.from({ length: sementesPorClube }, (_, indice) => ({
  clube,
  repeticao: indice + 1,
  seed: hashSeed(clube.id + ':' + indice),
  modos: ['passive', 'managed']
}))).flatMap((tarefa) => tarefa.modos.map((modoGestao) => ({ ...tarefa, modoGestao })));

function executarCenario(tarefa) {
  return new Promise((resolve, reject) => {
    const processo = spawn(process.execPath, [path.join(__dirname, '..', 'tests', 'long_term_continuity.test.js')], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        TEST_CLUB: tarefa.clube.nome,
        TEST_SEASONS: String(temporadasPorAmostra),
        TEST_CPU_MANAGED: tarefa.modoGestao === 'managed' ? '1' : '0',
        TEST_SEED: String(tarefa.seed)
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
        reject(new Error('Relatório não encontrado para ' + tarefa.clube.nome + ' / ' + tarefa.modoGestao + ' / ' + tarefa.seed));
        return;
      }
      const relatorio = JSON.parse(linha.split('balance report: ')[1]);
      resolve({ ...relatorio, modoGestao: tarefa.modoGestao, repeticao: tarefa.repeticao });
    });
  });
}

function media(linhas, campo) {
  return linhas.reduce((total, linha) => total + (Number(linha[campo]) || 0), 0) / linhas.length;
}

function resumirForcaInicial(linhas) {
  const posicoes = ['GOL', 'LAT', 'ZAG', 'VOL', 'MEI', 'ATA'];
  const forcas = linhas.map((linha) => linha.forcaInicial).filter(Boolean);
  if (!forcas.length) return null;
  return {
    totalPreJogo: Number(media(forcas, 'totalPreJogo').toFixed(1)),
    porPosicao: posicoes.reduce((resumo, posicao) => {
      const dados = forcas.map((forca) => forca.porPosicao && forca.porPosicao[posicao]).filter(Boolean);
      resumo[posicao] = {
        profundidade: Number(media(dados, 'profundidade').toFixed(1)),
        melhorOverall: Number(media(dados, 'melhorOverall').toFixed(1)),
        mediaElenco: Number(media(dados, 'mediaElenco').toFixed(1)),
        mediaTitulares: Number(media(dados, 'mediaTitulares').toFixed(1))
      };
      return resumo;
    }, {})
  };
}

function resumirConfrontos(linhas, nomeClube) {
  const confrontos = linhas.flatMap((linha) => linha.confrontosDiretos || []);
  return Object.values(confrontos.reduce((resumo, confronto) => {
    const souMandante = confronto.mandante === nomeClube;
    const adversario = souMandante ? confronto.visitante : confronto.mandante;
    const meusGols = souMandante ? confronto.golsMandante : confronto.golsVisitante;
    const golsAdversario = souMandante ? confronto.golsVisitante : confronto.golsMandante;
    const minhaForca = souMandante ? confronto.forcaMandante : confronto.forcaVisitante;
    const forcaAdversario = souMandante ? confronto.forcaVisitante : confronto.forcaMandante;
    const chave = adversario;
    if (!resumo[chave]) resumo[chave] = { adversario, jogos: 0, vitorias: 0, empates: 0, derrotas: 0, golsMarcados: 0, golsSofridos: 0, diferencaForcaMedia: 0 };
    const item = resumo[chave];
    item.jogos += 1;
    item.golsMarcados += meusGols;
    item.golsSofridos += golsAdversario;
    item.diferencaForcaMedia += minhaForca - forcaAdversario;
    if (meusGols > golsAdversario) item.vitorias += 1;
    else if (meusGols < golsAdversario) item.derrotas += 1;
    else item.empates += 1;
    return resumo;
  }, {})).map((item) => ({
    ...item,
    diferencaForcaMedia: Number((item.diferencaForcaMedia / item.jogos).toFixed(1))
  }));
}

function resumoModo(linhas, nomeClube) {
  const trajetorias = linhas.flatMap((linha) => linha.trajetoriaDivisoes || []);
  const divisoesFinais = linhas.reduce((resultado, linha) => {
    resultado[linha.divisaoFinal] = (resultado[linha.divisaoFinal] || 0) + 1;
    return resultado;
  }, {});
  return {
    observacoes: linhas.length,
    temporadas: linhas.length * temporadasPorAmostra,
    golsPorPartida: Number(media(linhas, 'golsPorPartida').toFixed(2)),
    reputacaoInicial: Number(media(linhas, 'reputacaoInicial').toFixed(1)),
    reputacaoFinal: Number(media(linhas, 'reputacaoFinal').toFixed(1)),
    variacaoReputacao: Number((media(linhas, 'reputacaoFinal') - media(linhas, 'reputacaoInicial')).toFixed(1)),
    posicaoMedia: trajetorias.length ? Number((media(trajetorias, 'posicao')).toFixed(1)) : null,
    divisoesFinais,
    sementes: linhas.map((linha) => linha.seed),
    forcaInicial: resumirForcaInicial(linhas),
    confrontosDiretos: resumirConfrontos(linhas, nomeClube)
  };
}

async function executarAuditoria() {
  const resultados = [];
  let proximaTarefa = 0;
  async function trabalhador() {
    while (true) {
      const indice = proximaTarefa;
      proximaTarefa += 1;
      if (indice >= tarefas.length) return;
      const resultado = await executarCenario(tarefas[indice]);
      resultados.push(resultado);
      process.stdout.write('cenario_concluido ' + resultados.length + '/' + tarefas.length + ' ' + resultado.clube + ' ' + resultado.modoGestao + ' seed=' + resultado.seed + '\n');
    }
  }
  await Promise.all(Array.from({ length: Math.min(concorrencia, tarefas.length) }, () => trabalhador()));
  return resultados;
}

executarAuditoria().then((resultados) => {
  const porClube = clubesAlvo.reduce((saida, clube) => {
    const linhasClube = resultados.filter((linha) => linha.clube === clube.nome);
    saida[clube.nome] = {
      divisaoInicial: clube.divisao,
      reputacaoInicialBase: clube.reputacao,
      managed: resumoModo(linhasClube.filter((linha) => linha.modoGestao === 'managed'), clube.nome),
      passive: resumoModo(linhasClube.filter((linha) => linha.modoGestao === 'passive'), clube.nome)
    };
    return saida;
  }, {});
  console.log(JSON.stringify({
    clubes: nomesAlvo,
    temporadasPorAmostra,
    sementesPorClube,
    temporadasMedidas: tarefas.length * temporadasPorAmostra,
    porClube
  }, null, 2));
}).catch((erro) => {
  process.stderr.write((erro && erro.stack) || String(erro));
  process.exitCode = 1;
});
