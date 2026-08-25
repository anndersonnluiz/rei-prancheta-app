/**
 * app.js
 * Módulo principal da aplicação Rei da Prancheta
 */

var app = angular.module('ReiDaPranchetaApp', []);

// DIRETIVAS PARA DRAG & DROP HTML5
app.directive('draggablePlayer', function() {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            element[0].setAttribute('draggable', true);
            element[0].addEventListener('dragstart', function(e) {
                if (scope.jogadorBloqueadoParaEntrar && scope.jogadorBloqueadoParaEntrar(scope.jogador)) {
                    e.preventDefault();
                    return false;
                }
                e.dataTransfer.setData('jogadorId', scope.jogador.id);
                e.dataTransfer.effectAllowed = 'move';
                element[0].classList.add('dragging');
            });
            element[0].addEventListener('dragend', function(e) {
                element[0].classList.remove('dragging');
            });
        }
    };
});

app.directive('droppableArea', function() {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            element[0].addEventListener('dragover', function(e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
            element[0].addEventListener('drop', function(e) {
                e.preventDefault();
                var jogadorId = parseInt(e.dataTransfer.getData('jogadorId'));
                var areaTipo = attrs.droppableArea;
                var posX = 0, posY = 0;
                if (areaTipo === 'campo') {
                    var rect = element[0].getBoundingClientRect();
                    posX = ((e.clientX - rect.left) / rect.width) * 100;
                    posY = ((e.clientY - rect.top) / rect.height) * 100;
                }
                scope.$apply(function() {
                    scope.moverJogador(jogadorId, areaTipo, posX, posY);
                });
            });
        }
    };
});

// CONTROLLER PRINCIPAL
app.controller('DashboardController', function($scope, $http, $timeout) {
    
    $scope.clubes = [];
    $scope.jogadores = [];
    $scope.clubeAtual = null;
    $scope.elencoAtual = [];
    var ordemPosicoes = { GOL: 1, LAT: 2, ZAG: 3, VOL: 4, MEI: 5, ATA: 6 };
    $scope.ordemPosicaoJogador = function(jogador) {
        return ordemPosicoes[jogador && jogador.posicao] || 99;
    };
    $scope.filtroPosicaoElenco = 'TODOS';
    $scope.filtrarJogadorPorPosicao = function(jogador) {
        return !$scope.filtroPosicaoElenco || $scope.filtroPosicaoElenco === 'TODOS' || jogador.posicao === $scope.filtroPosicaoElenco;
    };
    $scope.telaAtual = 'loading'; 
    $scope.dados = { nomeTreinador: '', anoAtual: 2024 };
    $scope.historicoTreinador = [];
    $scope.historicoPartidas = [];
    $scope.historicoDecisoesGestao = [];
    $scope.registrarDecisaoGestao = function(tipo, descricao) {
        $scope.historicoDecisoesGestao = Array.isArray($scope.historicoDecisoesGestao) ? $scope.historicoDecisoesGestao : [];
        $scope.historicoDecisoesGestao.unshift({ tipo: tipo, descricao: descricao, temporada: $scope.dados && $scope.dados.anoAtual, dia: $scope.diaAtual || 0 });
        $scope.historicoDecisoesGestao = $scope.historicoDecisoesGestao.slice(0, 30);
    };
    $scope.historicoPartidasFiltro = 'TODAS';
    $scope.filtroCarreira = 'geral';
    $scope.menuGrupos = { inicio: true, competicoes: false, clube: false, gestao: false, carreira: false, sistema: false };
    $scope.menuMobileAberto = false;
    $scope.alternarMenuMobile = function() { $scope.menuMobileAberto = !$scope.menuMobileAberto; };
    $scope.alternarGrupoMenu = function(grupo) {
        if (!$scope.menuGrupos.hasOwnProperty(grupo)) return false;
        $scope.menuGrupos[grupo] = !$scope.menuGrupos[grupo];
        return $scope.menuGrupos[grupo];
    };
    $scope.definirFiltroCarreira = function(filtro) {
        if (['geral', 'temporadas', 'clubes'].indexOf(filtro) === -1) return false;
        $scope.filtroCarreira = filtro;
        return true;
    };
    $scope.partidaHistoricoAberta = null;
    $scope.alternarDetalhesPartidaHistorico = function(partida) {
        $scope.partidaHistoricoAberta = $scope.partidaHistoricoAberta === partida ? null : partida;
    };
    $scope.obterResumoHistoricoPartidas = function() {
        var partidas = Array.isArray($scope.historicoPartidas) ? $scope.historicoPartidas : [];
        var resumo = { jogos: partidas.length, vitorias: 0, empates: 0, derrotas: 0, golsMarcados: 0, golsSofridos: 0, xgTotal: 0, xgPartidas: 0 };
        partidas.forEach(function(partida) {
            var resultado = partida.placar && partida.placar.resultadoMeuTime;
            if (resultado === 'Vitoria') resumo.vitorias++;
            else if (resultado === 'Empate') resumo.empates++;
            else if (resultado === 'Derrota') resumo.derrotas++;
            var meuTimeMandante = partida.mandante && $scope.clubeAtual && partida.mandante.id === $scope.clubeAtual.id;
            if (partida.placar) {
                resumo.golsMarcados += Number(meuTimeMandante ? partida.placar.mandante : partida.placar.visitante) || 0;
                resumo.golsSofridos += Number(meuTimeMandante ? partida.placar.visitante : partida.placar.mandante) || 0;
            }
            if (partida.xg) {
                resumo.xgTotal += (Number(partida.xg.mandante) || 0) + (Number(partida.xg.visitante) || 0);
                resumo.xgPartidas++;
            }
        });
        resumo.mediaXg = resumo.xgPartidas ? (resumo.xgTotal / resumo.xgPartidas).toFixed(2) : '0.00';
        return resumo;
    };
    $scope.obterResumoPorTemporada = function() {
        var grupos = {};
        (Array.isArray($scope.historicoPartidas) ? $scope.historicoPartidas : []).forEach(function(partida) {
            var temporada = partida.temporada || 'Não identificada';
            if (!grupos[temporada]) grupos[temporada] = { temporada: temporada, jogos: 0, vitorias: 0, empates: 0, derrotas: 0, gols: 0, sofridos: 0, xgTotal: 0, xgPartidas: 0 };
            var grupo = grupos[temporada];
            grupo.jogos++;
            if (partida.placar && partida.placar.resultadoMeuTime === 'Vitoria') grupo.vitorias++;
            else if (partida.placar && partida.placar.resultadoMeuTime === 'Empate') grupo.empates++;
            else if (partida.placar && partida.placar.resultadoMeuTime === 'Derrota') grupo.derrotas++;
            var mandante = partida.mandante && $scope.clubeAtual && partida.mandante.id === $scope.clubeAtual.id;
            if (partida.placar) { grupo.gols += Number(mandante ? partida.placar.mandante : partida.placar.visitante) || 0; grupo.sofridos += Number(mandante ? partida.placar.visitante : partida.placar.mandante) || 0; }
            if (partida.xg) { grupo.xgTotal += (Number(partida.xg.mandante) || 0) + (Number(partida.xg.visitante) || 0); grupo.xgPartidas++; }
        });
        return Object.keys(grupos).sort().reverse().map(function(chave) {
            var grupo = grupos[chave];
            grupo.mediaXg = grupo.xgPartidas ? (grupo.xgTotal / grupo.xgPartidas).toFixed(2) : '0.00';
            return grupo;
        });
    };
    $scope.obterTendenciaCarreira = function() {
        var temporadas = $scope.obterResumoPorTemporada();
        if (temporadas.length < 2) return { classe: 'base', titulo: 'Base inicial', detalhe: 'Mais uma temporada será necessária para medir a evolução.' };
        var atual = temporadas[0];
        var anterior = temporadas[1];
        var aproveitamentoAtual = atual.jogos ? (atual.vitorias * 3 + atual.empates) / (atual.jogos * 3) : 0;
        var aproveitamentoAnterior = anterior.jogos ? (anterior.vitorias * 3 + anterior.empates) / (anterior.jogos * 3) : 0;
        var delta = aproveitamentoAtual - aproveitamentoAnterior;
        var deltaXg = Number(atual.mediaXg) - Number(anterior.mediaXg);
        if (delta >= 0.08 || deltaXg >= 0.25) return { classe: 'alta', titulo: 'Desempenho em evolução', detalhe: 'A campanha recente mostra avanço em relação à temporada anterior.' };
        if (delta <= -0.08 || deltaXg <= -0.25) return { classe: 'baixa', titulo: 'Desempenho em queda', detalhe: 'A campanha recente pede atenção e revisão das decisões.' };
        return { classe: 'estavel', titulo: 'Desempenho estável', detalhe: 'Os indicadores permanecem próximos da temporada anterior.' };
    };
    $scope.obterRecomendacoesCarreira = function() {
        var resumo = $scope.obterResumoHistoricoPartidas();
        var tendencia = $scope.obterTendenciaCarreira();
        var recomendacoes = [];
        if (resumo.jogos === 0) return [{ titulo: 'Construa sua base de dados', detalhe: 'Finalize partidas para receber recomendações personalizadas.', tipo: 'base' }];
        if (resumo.golsSofridos > resumo.golsMarcados) recomendacoes.push({ titulo: 'Reforce a proteção defensiva', detalhe: 'O time sofreu mais gols do que marcou no histórico recente.', tipo: 'defesa' });
        if (resumo.mediaXg < 1.2) recomendacoes.push({ titulo: 'Aumente a criação de chances', detalhe: 'A média de xG está baixa; avalie mentalidade, foco de passes e qualidade do elenco.', tipo: 'ataque' });
        if (tendencia.classe === 'baixa') recomendacoes.push({ titulo: 'Revise a estratégia', detalhe: 'A tendência de queda indica necessidade de ajustes antes da próxima temporada.', tipo: 'alerta' });
        if (recomendacoes.length === 0) recomendacoes.push({ titulo: 'Mantenha o planejamento', detalhe: 'Os indicadores estão equilibrados; priorize continuidade e evolução gradual.', tipo: 'manter' });
        return recomendacoes;
    };
    $scope.aplicarRecomendacaoComoMeta = function(recomendacao) {
        if (!recomendacao || !$scope.clubeAtual) return false;
        var tipo = recomendacao.tipo === 'defesa' ? 'elenco' : (recomendacao.tipo === 'ataque' ? 'desempenho' : 'temporada');
        $scope.clubeAtual.metaTipo = tipo;
        $scope.clubeAtual.metaDescricao = recomendacao.titulo;
        $scope.diretoriaStatus = normalizarDiretoriaStatusInterno($scope.diretoriaStatus);
        $scope.diretoriaStatus.tipoObjetivo = tipo;
        $scope.diretoriaStatus.objetivoAtual = recomendacao.titulo;
        $scope.registrarDecisaoGestao('meta', 'Meta definida: ' + recomendacao.titulo + '.');
        $scope.diretoriaStatus.ultimaObservacao = recomendacao.detalhe;
        $scope.diretoriaStatus.progressoLabel = 'Prioridade definida pelo treinador';
        if ($scope.salvarJogoSilencioso) $scope.salvarJogoSilencioso();
        return true;
    };
    $scope.obterProgressoMetaCarreira = function() {
        var meta = $scope.diretoriaStatus && $scope.diretoriaStatus.objetivoAtual;
        if (!meta) return { percentual: 0, label: 'Nenhuma meta definida' };
        var resumo = $scope.obterResumoHistoricoPartidas();
        var percentual = 50;
        if (($scope.diretoriaStatus.tipoObjetivo || '') === 'elenco') {
            percentual = resumo.golsMarcados >= resumo.golsSofridos ? 100 : Math.max(0, Math.round((resumo.golsMarcados / Math.max(1, resumo.golsSofridos)) * 100));
        } else if (($scope.diretoriaStatus.tipoObjetivo || '') === 'desempenho') {
            percentual = Math.min(100, Math.round((Number(resumo.mediaXg) / 1.5) * 100));
        } else {
            var tendencia = $scope.obterTendenciaCarreira();
            percentual = tendencia.classe === 'alta' ? 100 : (tendencia.classe === 'baixa' ? 25 : 65);
        }
        return { percentual: percentual, label: percentual >= 80 ? 'Meta no caminho certo' : (percentual >= 50 ? 'Meta em acompanhamento' : 'Meta em risco') };
    };
    $scope.obterAvaliacaoDiretoriaCarreira = function() {
        var progresso = $scope.obterProgressoMetaCarreira();
        if (!$scope.diretoriaStatus || !$scope.diretoriaStatus.objetivoAtual) return { classe: 'sem-meta', titulo: 'Sem avaliação ativa', detalhe: 'Defina uma meta para receber a avaliação da diretoria.' };
        if (progresso.percentual >= 100) return { classe: 'excelente', titulo: 'Superou as expectativas', detalhe: 'A diretoria reconhece o avanço alcançado nesta prioridade.' };
        if (progresso.percentual >= 80) return { classe: 'cumprida', titulo: 'Meta cumprida', detalhe: 'O trabalho está alinhado com o que foi planejado.' };
        if (progresso.percentual >= 50) return { classe: 'acompanhamento', titulo: 'Dentro do esperado', detalhe: 'A diretoria recomenda manter o foco e acelerar a evolução.' };
        return { classe: 'risco', titulo: 'Abaixo do esperado', detalhe: 'A prioridade entrou em risco e exige reação imediata.' };
    };
    $scope.registrarAvaliacaoDiretoriaCarreira = function() {
        if (!$scope.diretoriaStatus || !$scope.diretoriaStatus.objetivoAtual) return false;
        $scope.diretoriaStatus = normalizarDiretoriaStatusInterno($scope.diretoriaStatus);
        var temporada = $scope.dados && $scope.dados.anoAtual ? $scope.dados.anoAtual : 'Não identificada';
        var existente = $scope.diretoriaStatus.historicoAvaliacoes.some(function(item) { return item.origem === 'carreira' && item.temporada === temporada; });
        if (existente) return false;
        var progresso = $scope.obterProgressoMetaCarreira();
        var avaliacao = $scope.obterAvaliacaoDiretoriaCarreira();
        $scope.diretoriaStatus.historicoAvaliacoes.unshift({ origem: 'carreira', temporada: temporada, objetivo: $scope.diretoriaStatus.objetivoAtual, percentual: progresso.percentual, resultado: avaliacao.titulo, dia: $scope.diaAtual || 0 });
        $scope.diretoriaStatus.historicoAvaliacoes = $scope.diretoriaStatus.historicoAvaliacoes.slice(0, 10);
        var confianca = $scope.obterConfiancaDiretoria();
        if ($scope.adicionarMensagem) {
            var tituloMensagem = confianca.percentual >= 75 ? 'Comunicado público de apoio' : (confianca.percentual >= 50 ? 'Reunião de alinhamento' : 'Reunião emergencial da diretoria');
            var detalheMensagem = confianca.percentual >= 75 ? 'A diretoria confirmou publicamente a confiança no trabalho da comissão.' : (confianca.percentual >= 50 ? 'A diretoria quer alinhar prioridades para a sequência da temporada.' : 'A diretoria convocou uma conversa para cobrar reação imediata.');
            $scope.adicionarMensagem('Diretoria', tituloMensagem, detalheMensagem + ' ' + avaliacao.detalhe + ' Confiança atual: ' + confianca.percentual + '%.', false, 'diretoria');
        }
        if ($scope.registrarEventoAmbiente) {
            var impacto = confianca.percentual >= 75 ? 1 : (confianca.percentual < 50 ? -1 : 0);
            if (impacto !== 0) {
                $scope.registrarEventoAmbiente({
                    id: 'amb_diretoria_' + temporada,
                    chave: 'diretoria|' + temporada,
                    dia: $scope.diaAtual || 0,
                    tipo: 'diretoria',
                    impacto: impacto,
                    titulo: impacto > 0 ? 'Comunicado público anima o elenco' : 'Reunião emergencial pressiona o elenco',
                    detalhe: impacto > 0 ? 'O respaldo público da diretoria elevou a confiança do ambiente.' : 'A cobrança em reunião aumentou a tensão no ambiente.'
                });
            }
        }
        if ($scope.salvarJogoSilencioso) $scope.salvarJogoSilencioso();
        return true;
    };
    $scope.obterConfiancaDiretoria = function() {
        var historico = ($scope.diretoriaStatus && Array.isArray($scope.diretoriaStatus.historicoAvaliacoes)) ? $scope.diretoriaStatus.historicoAvaliacoes.filter(function(item) { return item.origem === 'carreira'; }) : [];
        var confianca = 60 + (Number($scope.diretoriaStatus && $scope.diretoriaStatus.bonusConfianca) || 0);
        historico.slice(0, 5).forEach(function(item) {
            if (item.percentual >= 100) confianca += 8;
            else if (item.percentual >= 80) confianca += 5;
            else if (item.percentual < 50) confianca -= 8;
            else confianca += 1;
        });
        confianca = Math.max(0, Math.min(100, confianca));
        return { percentual: confianca, label: confianca >= 75 ? 'Alta confiança' : (confianca >= 50 ? 'Confiança moderada' : 'Confiança em risco') };
    };
    $scope.obterMargemPlanejamentoDiretoria = function() {
        var confianca = $scope.obterConfiancaDiretoria().percentual;
        if (confianca >= 75) return { classe: 'longa', titulo: 'Margem para projeto de longo prazo', detalhe: 'A diretoria aceita investir em base, infraestrutura e evolução gradual.' };
        if (confianca >= 50) return { classe: 'moderada', titulo: 'Planejamento com acompanhamento', detalhe: 'Projetos estruturais são possíveis, mas precisam mostrar progresso.' };
        return { classe: 'curta', titulo: 'Foco em resultado imediato', detalhe: 'A diretoria exige reação antes de ampliar projetos de longo prazo.' };
    };
    $scope.obterOrientacaoInvestimentoEstrutural = function() {
        var margem = $scope.obterMargemPlanejamentoDiretoria();
        if (margem.classe === 'longa') return { classe: 'favoravel', titulo: 'Momento favorável para investir', detalhe: 'A confiança atual dá espaço para evoluir instalações e categorias de base.' };
        if (margem.classe === 'moderada') return { classe: 'cautela', titulo: 'Invista com cautela', detalhe: 'Escolha melhorias com retorno claro e preserve uma reserva de orçamento.' };
        return { classe: 'prioridade', titulo: 'Priorize o resultado antes do investimento', detalhe: 'Projetos estruturais continuam disponíveis, mas a diretoria espera reação esportiva primeiro.' };
    };
    $scope.obterOrientacaoCategoriasBase = function() {
        var margem = $scope.obterMargemPlanejamentoDiretoria();
        if (margem.classe === 'longa') return { classe: 'promover', titulo: 'Ambiente para formar e promover', detalhe: 'A confiança permite dar minutos a jovens e acelerar a integração de promessas.' };
        if (margem.classe === 'moderada') return { classe: 'emprestar', titulo: 'Desenvolva com minutos controlados', detalhe: 'Priorize empréstimos bem escolhidos para jovens que precisam jogar.' };
        return { classe: 'proteger', titulo: 'Proteja o desenvolvimento', detalhe: 'Mantenha os jovens em evolução e evite expor atletas sem maturidade ao peso dos resultados.' };
    };
    $scope.obterOrientacaoMercadoDiretoria = function() {
        var confianca = $scope.obterConfiancaDiretoria().percentual;
        var orcamento = $scope.clubeAtual ? Number($scope.clubeAtual.orcamento) || 0 : 0;
        if (confianca >= 75 && orcamento >= 50000000) return { classe: 'investir', titulo: 'Janela para reforçar o elenco', detalhe: 'A diretoria apoia investimentos, desde que a contratação resolva uma carência clara.' };
        if (confianca >= 50) return { classe: 'negociar', titulo: 'Negocie com disciplina', detalhe: 'Priorize oportunidades, empréstimos e contratos sustentáveis.' };
        return { classe: 'preservar', titulo: 'Preserve o caixa', detalhe: 'Evite compromissos longos e priorize vendas estratégicas ou soluções internas.' };
    };
    $scope.obterOrientacaoFinanceiraDiretoria = function() {
        var confianca = $scope.obterConfiancaDiretoria().percentual;
        var orcamento = $scope.clubeAtual ? Number($scope.clubeAtual.orcamento) || 0 : 0;
        if (confianca >= 75 && orcamento >= 100000000) return { classe: 'investir', titulo: 'Capacidade para investir', detalhe: 'Há confiança e caixa para financiar melhorias sem comprometer a operação.' };
        if (confianca >= 50 && orcamento >= 30000000) return { classe: 'equilibrar', titulo: 'Equilibre crescimento e reserva', detalhe: 'Mantenha uma reserva e escolha investimentos com retorno previsível.' };
        return { classe: 'economizar', titulo: 'Priorize liquidez', detalhe: 'Evite gastos não essenciais e preserve caixa para salários e compromissos.' };
    };
    $scope.obterEstrategiaClube = function() {
        return {
            confianca: $scope.obterConfiancaDiretoria(),
            planejamento: $scope.obterMargemPlanejamentoDiretoria(),
            base: $scope.obterOrientacaoCategoriasBase(),
            mercado: $scope.obterOrientacaoMercadoDiretoria(),
            financas: $scope.obterOrientacaoFinanceiraDiretoria()
        };
    };
    $scope.definirPrioridadeEstrategica = function(prioridade) {
        var permitidas = ['planejamento', 'base', 'mercado', 'financas'];
        if (permitidas.indexOf(prioridade) === -1) return false;
        $scope.diretoriaStatus = normalizarDiretoriaStatusInterno($scope.diretoriaStatus);
        $scope.diretoriaStatus.prioridadeEstrategica = prioridade;
        $scope.registrarDecisaoGestao('prioridade', 'Prioridade estratégica definida: ' + prioridade + '.');
        if ($scope.salvarJogoSilencioso) $scope.salvarJogoSilencioso();
        return true;
    };
    $scope.obterFocoEstrategicoAtual = function() {
        var estrategia = $scope.obterEstrategiaClube();
        var prioridade = ($scope.diretoriaStatus && $scope.diretoriaStatus.prioridadeEstrategica) || 'planejamento';
        var foco = estrategia[prioridade] || estrategia.planejamento;
        return { prioridade: prioridade, titulo: foco.titulo, detalhe: foco.detalhe };
    };
    $scope.obterAlertaFocoEstrategico = function() {
        var foco = $scope.obterFocoEstrategicoAtual().prioridade;
        if (foco === 'base') {
            var carencias = $scope.obterResumoNecessidadesBase().carencias;
            if (carencias.length > 0) return { classe: 'alerta', titulo: 'Carência para resolver', detalhe: 'Priorize a posição: ' + carencias.map(function(item) { return item.label; }).join(', ') + '.' };
            return { classe: 'ok', titulo: 'Base sem carência crítica', detalhe: 'Mantenha o acompanhamento e o desenvolvimento dos jovens.' };
        }
        if (foco === 'financas') {
            var orcamento = $scope.clubeAtual ? Number($scope.clubeAtual.orcamento) || 0 : 0;
            if (orcamento < 30000000) return { classe: 'alerta', titulo: 'Caixa exige atenção', detalhe: 'Evite novas despesas e preserve recursos para salários e compromissos.' };
            return { classe: 'ok', titulo: 'Caixa sob controle', detalhe: 'Há espaço para planejar sem comprometer a operação.' };
        }
        if (foco === 'mercado') return { classe: 'info', titulo: 'Revise as oportunidades', detalhe: 'Compare carências, exigências dos jogadores e impacto na folha antes de negociar.' };
        var obras = $scope.infraestruturaResumo && $scope.infraestruturaResumo.obras ? $scope.infraestruturaResumo.obras.length : 0;
        return obras > 0 ? { classe: 'info', titulo: 'Obra em andamento', detalhe: 'Acompanhe os prazos antes de iniciar um novo projeto estrutural.' } : { classe: 'ok', titulo: 'Infraestrutura disponível', detalhe: 'Escolha a próxima melhoria conforme o retorno esperado.' };
    };
    $scope.irParaFocoEstrategico = function() {
        var destino = { base: 'base', mercado: 'mercado', financas: 'financas', planejamento: 'medico' }[$scope.obterFocoEstrategicoAtual().prioridade] || 'dashboard';
        $scope.mudarTela(destino);
        return destino;
    };
    $scope.obterHistoricoPartidasFiltrado = function() {
        var lista = Array.isArray($scope.historicoPartidas) ? $scope.historicoPartidas : [];
        var filtro = $scope.historicoPartidasFiltro || 'TODAS';
        if (filtro === 'TODAS') return lista;
        return lista.filter(function(partida) {
            if (filtro === 'VITORIAS' || filtro === 'EMPATES' || filtro === 'DERROTAS') {
                return (partida.placar && partida.placar.resultadoMeuTime || '').toUpperCase() === filtro.slice(0, -1) ||
                    (filtro === 'VITORIAS' && partida.placar.resultadoMeuTime === 'Vitoria') ||
                    (filtro === 'EMPATES' && partida.placar.resultadoMeuTime === 'Empate') ||
                    (filtro === 'DERROTAS' && partida.placar.resultadoMeuTime === 'Derrota');
            }
            if (filtro === 'COMPLETAS') return partida.origem === 'completo';
            if (filtro === 'RAPIDAS') return partida.origem === 'rapido';
            return true;
        });
    };
    $scope.mudancaClubePendente = null;
    $scope.staffClube = [];
    $scope.emprestimosAtivos = [];
    $scope.historicoFinanceiroMensal = {};

    function criarStaffPadrao() {
        return [
            { id: 'auxiliar', cargo: 'Auxiliar Técnico', nome: 'Vaga disponível', nivel: 1, salario: 0, contratado: false, efeito: 'Escalação e análise' },
            { id: 'preparador', cargo: 'Preparador Físico', nome: 'Vaga disponível', nivel: 1, salario: 0, contratado: false, efeito: 'Recuperação e desgaste' },
            { id: 'medico', cargo: 'Médico do Clube', nome: 'Vaga disponível', nivel: 1, salario: 0, contratado: false, efeito: 'Tratamento de lesões' },
            { id: 'analista', cargo: 'Analista de Desempenho', nome: 'Vaga disponível', nivel: 1, salario: 0, contratado: false, efeito: 'Relatório pré-jogo' }
        ];
    }

    function normalizarStaff(staff) {
        var base = criarStaffPadrao();
        if (!Array.isArray(staff)) return base;
        return base.map(function(vaga) {
            var salvo = staff.find(function(item) { return item && item.id === vaga.id; });
            return salvo ? Object.assign(vaga, salvo) : vaga;
        });
    }
    var SAVE_VERSION_ATUAL = 11;

    // FASE 21: Efeitos Sonoros
    $scope.somAtivado = true;
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    $scope.alternarSom = function() {
        $scope.somAtivado = !$scope.somAtivado;
    };

    $scope.tocarSom = function(tipo) {
        if (!$scope.somAtivado) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        var osc = audioCtx.createOscillator();
        var gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        if (tipo === 'apito') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1500, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1800, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.6);
        } else if (tipo === 'gol') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.5);
            gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.6, audioCtx.currentTime + 0.5);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 2.0);
            osc.start();
            osc.stop(audioCtx.currentTime + 2.0);
        } else if (tipo === 'chute') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(100, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        }
    };
    $scope.existeSave = false;
    $scope.saveInfo = null;

    // FASE 17: CAIXA DE MENSAGENS E CALENDÁRIO
    $scope.caixaEntrada = [];
    $scope.patrocinioAtual = null;

    // FASE 6: CALENDÁRIO E JOGOS
    $scope.calendario = [];
    $scope.rodadaAtual = 0;
    $scope.filtroCalendario = 'TODOS';
    $scope.calendarioFiltrado = [];
    $scope.proximosEventosOffsets = [0, 1, 2, 3, 4];
    $scope.definirFiltroCalendario = function(filtro) {
        $scope.filtroCalendario = filtro || 'TODOS';
        $scope.atualizarCalendarioFiltrado();
    };
    $scope.isFiltroCalendarioAtivo = function(filtro) {
        return ($scope.filtroCalendario || 'TODOS') === filtro;
    };
    
    // Variáveis da Partida Ao Vivo
    $scope.partidaAoVivo = null;
    $scope.minutoAtual = 0;
    $scope.narracao = [];
    $scope.partidaEmAndamento = false;

    $scope.preJogo = {
        visivel: false,
        modo: null,
        partida: null,
        analise: null,
        telaAnterior: 'dashboard'
    };

    $scope.posJogo = {
        disponivel: false,
        resumo: null
    };

    $scope.relatorioEvolucao = [];
    $scope.relatorioEvolucaoVisivel = [];
    $scope.ultimoDiaEvolucao = 0;
    $scope.ambienteElenco = criarAmbienteElencoPadrao();
    $scope.ambienteElencoResumo = criarResumoAmbienteElenco($scope.ambienteElenco);
    $scope.diretoriaStatus = criarDiretoriaStatusPadrao();
    $scope.infraestruturaResumo = criarResumoInfraestrutura(null);
    $scope.contextoExterno = criarContextoExternoPadrao();
    $scope.contextoExternoResumo = criarResumoContextoExterno($scope.contextoExterno);
    $scope.preparacaoTemporada = {
        fase: 'pre-temporada',
        inicioDia: 0,
        fimDia: 10,
        concluida: false,
        foco: 'equilibrio',
        entrosamentoGeral: 50,
        entrosamentoSetores: { defesa: 50, meio: 50, ataque: 50 },
        amistosoRealizado: false,
        ultimoAmistoso: null,
        ultimoTreinoDia: -1,
        historico: []
    };
    $scope.estadosOperacionaisClubes = {};

    function normalizarPreparacaoTemporada(preparacao) {
        var base = preparacao || {};
        var resultado = {
            fase: base.concluida ? 'temporada' : (base.fase || 'pre-temporada'),
            inicioDia: typeof base.inicioDia === 'number' ? base.inicioDia : 0,
            fimDia: typeof base.fimDia === 'number' ? base.fimDia : 10,
            concluida: !!base.concluida,
            foco: ['equilibrio', 'fisico', 'tatico', 'tecnico'].indexOf(base.foco) !== -1 ? base.foco : 'equilibrio',
            entrosamentoGeral: Math.max(0, Math.min(100, Number(base.entrosamentoGeral) || 50)),
            entrosamentoSetores: angular.copy(base.entrosamentoSetores || {}),
            amistosoRealizado: !!base.amistosoRealizado,
            ultimoAmistoso: base.ultimoAmistoso && typeof base.ultimoAmistoso === 'object' ? {
                adversario: base.ultimoAmistoso.adversario || '',
                placar: base.ultimoAmistoso.placar || '',
                dia: typeof base.ultimoAmistoso.dia === 'number' ? base.ultimoAmistoso.dia : 0
            } : null,
            ultimoTreinoDia: typeof base.ultimoTreinoDia === 'number' ? base.ultimoTreinoDia : -1,
            ultimoTreinoIndividualDia: typeof base.ultimoTreinoIndividualDia === 'number' ? base.ultimoTreinoIndividualDia : -1,
            historico: Array.isArray(base.historico) ? base.historico.slice(0, 30) : []
        };
        ['defesa', 'meio', 'ataque'].forEach(function(setor) {
            resultado.entrosamentoSetores[setor] = Math.max(0, Math.min(100, Number(resultado.entrosamentoSetores[setor]) || resultado.entrosamentoGeral));
        });
        return resultado;
    }

    function atualizarResumoPreparacao() {
        $scope.preparacaoTemporada = normalizarPreparacaoTemporada($scope.preparacaoTemporada);
        return $scope.preparacaoTemporada;
    }

    $scope.obterFatorEntrosamento = function() {
        var preparacao = atualizarResumoPreparacao();
        return 0.94 + (preparacao.entrosamentoGeral / 100) * 0.12;
    };

    $scope.obterSetorJogador = function(jogador) {
        var posicao = jogador && jogador.posicao;
        if (posicao === 'GOL' || posicao === 'ZAG' || posicao === 'LAT') return 'defesa';
        if (posicao === 'VOL' || posicao === 'MEI') return 'meio';
        return 'ataque';
    };

    $scope.obterFatorEntrosamentoSetor = function(jogador) {
        var preparacao = atualizarResumoPreparacao();
        var setor = $scope.obterSetorJogador(jogador);
        var valor = preparacao.entrosamentoSetores[setor] || preparacao.entrosamentoGeral;
        return 0.96 + (valor / 100) * 0.08;
    };

    $scope.obterAvaliacaoPreTemporada = function() {
        var elenco = Array.isArray($scope.elencoAtual) ? $scope.elencoAtual : [];
        var porPosicao = { GOL: 0, LAT: 0, ZAG: 0, VOL: 0, MEI: 0, ATA: 0 };
        var soma = 0;
        elenco.forEach(function(jogador) {
            var posicao = jogador.posicao || 'MEI';
            porPosicao[posicao] = (porPosicao[posicao] || 0) + 1;
            soma += Number($scope.calcularOverall ? $scope.calcularOverall(jogador) : calcularOverallBaseJogador(jogador)) || 0;
        });
        var media = elenco.length ? Math.round(soma / elenco.length) : 0;
        var alertas = [];
        if ((porPosicao.GOL || 0) < 2) alertas.push('Falta um goleiro de rotação');
        if ((porPosicao.ZAG || 0) < 3) alertas.push('Defesa central curta');
        if ((porPosicao.MEI || 0) + (porPosicao.VOL || 0) < 5) alertas.push('Poucas opções no meio-campo');
        if ((porPosicao.ATA || 0) < 3) alertas.push('Poucas opções de ataque');
        return {
            mediaOverall: media,
            tamanhoElenco: elenco.length,
            profundidade: elenco.length >= 22 ? 'Boa' : (elenco.length >= 18 ? 'Atenção' : 'Crítica'),
            alertas: alertas,
            recomendacao: alertas.length > 0 ? 'Resolver carências antes da sequência de jogos.' : 'Elenco equilibrado para iniciar a temporada.'
        };
    };

    $scope.definirFocoPreparacao = function(foco) {
        if (['equilibrio', 'fisico', 'tatico', 'tecnico'].indexOf(foco) === -1) return false;
        atualizarResumoPreparacao().foco = foco;
        $scope.salvarJogoSilencioso();
        return true;
    };

    $scope.atualizarFasePreparacao = function() {
        var preparacao = atualizarResumoPreparacao();
        if (preparacao.concluida) return preparacao;
        var primeiroJogoOficial = null;
        if (Array.isArray($scope.calendarioGeral) && typeof $scope.obterMeuJogoNoDia === 'function') {
            for (var dia = 0; dia < $scope.calendarioGeral.length; dia++) {
                var compromisso = $scope.obterMeuJogoNoDia(dia);
                if (compromisso && ['LIGA', 'COPA', 'CONTINENTAL'].indexOf(compromisso.tipo) !== -1) {
                    primeiroJogoOficial = dia;
                    break;
                }
            }
        }
        var deveEncerrar = primeiroJogoOficial !== null
            ? $scope.diaAtual >= primeiroJogoOficial
            : $scope.diaAtual > preparacao.fimDia;
        if (!deveEncerrar) return preparacao;
        preparacao.concluida = true;
        preparacao.fase = 'temporada';
        var referencia = primeiroJogoOficial !== null ? ' antes do primeiro compromisso oficial' : '';
        $scope.adicionarMensagem('Comissão Técnica', 'Pré-temporada encerrada', 'O período inicial de preparação terminou' + referencia + '. O elenco inicia a temporada com entrosamento ' + preparacao.entrosamentoGeral + '/100.', false, 'ambiente');
        return preparacao;
    };

    $scope.aplicarTreinamento = function(tipo) {
        var tipos = {
            recuperacao: { nome: 'Recuperação', geral: 1, setor: null, fisico: 3, moral: 1 },
            fisico: { nome: 'Treino físico', geral: 2, setor: null, fisico: -6, moral: 0 },
            tatico: { nome: 'Treino tático', geral: 3, setor: 'meio', fisico: -3, moral: 1 },
            tecnico: { nome: 'Treino técnico', geral: 2, setor: 'ataque', fisico: -2, moral: 1 },
            defensivo: { nome: 'Treino defensivo', geral: 2, setor: 'defesa', fisico: -2, moral: 1 }
        };
        var config = tipos[tipo];
        var preparacao = atualizarResumoPreparacao();
        if (!config || preparacao.ultimoTreinoDia === $scope.diaAtual || ($scope.obterMeuJogoHoje && $scope.obterMeuJogoHoje())) return false;
        preparacao.ultimoTreinoDia = $scope.diaAtual;
        preparacao.entrosamentoGeral = Math.min(100, preparacao.entrosamentoGeral + config.geral + (preparacao.foco === tipo ? 2 : 0));
        if (config.setor) preparacao.entrosamentoSetores[config.setor] = Math.min(100, preparacao.entrosamentoSetores[config.setor] + config.geral + 2);
        ($scope.elencoAtual || []).forEach(function(jogador) {
            normalizarJogadorSalvo(jogador);
            jogador.condicaoFisica = Math.max(35, Math.min(100, (Number(jogador.condicaoFisica) || 100) + config.fisico));
            jogador.moral = Math.max(0, Math.min(100, (Number(jogador.moral) || 70) + config.moral));
            var focoCompativel = jogador.desenvolvimentoFoco === tipo;
            jogador.xpTemporada = Math.min(100, (jogador.xpTemporada || 0) + config.geral + (focoCompativel ? 2 : 0));
        });
        preparacao.historico.unshift({ dia: $scope.diaAtual, tipo: tipo, nome: config.nome, foco: preparacao.foco });
        preparacao.historico = preparacao.historico.slice(0, 30);
        $scope.salvarJogoSilencioso();
        return true;
    };

    $scope.aplicarTreinoIndividual = function(jogador) {
        var preparacao = atualizarResumoPreparacao();
        if (!jogador || preparacao.ultimoTreinoIndividualDia === $scope.diaAtual || ($scope.obterMeuJogoHoje && $scope.obterMeuJogoHoje()) || jogador.lesionado) return false;
        normalizarJogadorSalvo(jogador);
        preparacao.ultimoTreinoIndividualDia = $scope.diaAtual;
        var auxiliar = ($scope.staffClube || []).find(function(item) { return item.id === 'auxiliar' && item.contratado; });
        var analista = ($scope.staffClube || []).find(function(item) { return item.id === 'analista' && item.contratado; });
        var preparador = ($scope.staffClube || []).find(function(item) { return item.id === 'preparador' && item.contratado; });
        var bonusXp = (auxiliar ? 1 : 0) + (analista ? 1 : 0) + ($scope.calcularBonusDesenvolvimentoInfraestrutura() >= 2 ? 1 : 0);
        var desgaste = preparador ? 1 : 2;
        jogador.xpTemporada = Math.min(100, (jogador.xpTemporada || 0) + 6 + bonusXp);
        jogador.condicaoFisica = Math.max(35, (Number(jogador.condicaoFisica) || 100) - desgaste);
        jogador.moral = Math.min(100, (Number(jogador.moral) || 70) + 1);
        $scope.adicionarMensagem('Comissão Técnica', 'Treino individual concluído', jogador.nome + ' treinou com foco ' + (jogador.desenvolvimentoFoco || 'equilibrado') + ' e recebeu 6 XP de desenvolvimento.', false, 'ambiente');
        $scope.salvarJogoSilencioso();
        return true;
    };

    $scope.simularAmistosoPreTemporada = function() {
        var preparacao = atualizarResumoPreparacao();
        if (preparacao.concluida || preparacao.amistosoRealizado || ($scope.obterMeuJogoHoje && $scope.obterMeuJogoHoje())) return false;
        var candidatos = ($scope.clubes || []).filter(function(clube) { return clube.id !== ($scope.clubeAtual && $scope.clubeAtual.id); });
        if (candidatos.length === 0) return false;
        var adversario = candidatos[Math.floor(Math.random() * candidatos.length)];
        var forcaMeuTime = $scope.calcularForcaTime ? $scope.calcularForcaTime() : 70;
        var forcaAdversario = $scope.calcularForcaElencoPreJogo(adversario, false);
        var golsMeu = $scope.gerarGols ? $scope.gerarGols(forcaMeuTime) : 0;
        var golsAdversario = $scope.gerarGols ? $scope.gerarGols(forcaAdversario) : 0;
        preparacao.amistosoRealizado = true;
        preparacao.entrosamentoGeral = Math.min(100, preparacao.entrosamentoGeral + 4);
        ['defesa', 'meio', 'ataque'].forEach(function(setor) { preparacao.entrosamentoSetores[setor] = Math.min(100, preparacao.entrosamentoSetores[setor] + 3); });
        ($scope.elencoAtual || []).forEach(function(jogador) { jogador.condicaoFisica = Math.max(40, (Number(jogador.condicaoFisica) || 100) - 4); });
        preparacao.ultimoAmistoso = { adversario: adversario.nome, placar: golsMeu + ' x ' + golsAdversario, dia: $scope.diaAtual };
        var resultadoAmistoso = golsMeu > golsAdversario ? 'venceu' : (golsMeu < golsAdversario ? 'perdeu' : 'empatou');
        $scope.adicionarMensagem('Comissão Técnica', 'Relatório do amistoso', 'O ' + $scope.clubeAtual.nome + ' ' + resultadoAmistoso + ' por ' + golsMeu + ' x ' + golsAdversario + ' contra ' + adversario.nome + '. O grupo ganhou entrosamento, mas acumulou desgaste.', false, 'ambiente');
        $scope.salvarJogoSilencioso();
        $scope.preparacaoTemporada = preparacao;
        return true;
    };

    function capturarEstadoOperacionalClube(clubeId) {
        if (!clubeId) return;
        $scope.estadosOperacionaisClubes = $scope.estadosOperacionaisClubes || {};
        $scope.estadosOperacionaisClubes[clubeId] = angular.copy({
            staffClube: $scope.staffClube || criarStaffPadrao(),
            financasHistorico: $scope.financasHistorico || [],
            historicoFinanceiroMensal: $scope.historicoFinanceiroMensal || {},
            caixaEntrada: $scope.caixaEntrada || [],
            ambienteElenco: $scope.ambienteElenco || criarAmbienteElencoPadrao(),
            contextoExterno: $scope.contextoExterno || criarContextoExternoPadrao(),
            preparacaoTemporada: $scope.preparacaoTemporada || normalizarPreparacaoTemporada(),
            diretoriaStatus: $scope.diretoriaStatus || criarDiretoriaStatusPadrao(),
            patrocinioAtual: $scope.patrocinioAtual || null,
            propostasPendentes: $scope.propostasPendentes || [],
            ultimoResumoPartida: $scope.ultimoResumoPartida || null
        });
    }

    function restaurarEstadoOperacionalClube(clubeId) {
        var estado = $scope.estadosOperacionaisClubes && $scope.estadosOperacionaisClubes[clubeId];
        if (!estado) return false;
        $scope.staffClube = normalizarStaff(angular.copy(estado.staffClube));
        $scope.financasHistorico = angular.copy(estado.financasHistorico || []);
        $scope.historicoFinanceiroMensal = angular.copy(estado.historicoFinanceiroMensal || {});
        $scope.caixaEntrada = angular.copy(estado.caixaEntrada || []);
        $scope.ambienteElenco = normalizarAmbienteElencoInterno(angular.copy(estado.ambienteElenco || criarAmbienteElencoPadrao()));
        $scope.contextoExterno = normalizarContextoExternoInterno(angular.copy(estado.contextoExterno || criarContextoExternoPadrao()));
        $scope.preparacaoTemporada = normalizarPreparacaoTemporada(angular.copy(estado.preparacaoTemporada));
        $scope.diretoriaStatus = normalizarDiretoriaStatusInterno(angular.copy(estado.diretoriaStatus || criarDiretoriaStatusPadrao()));
        $scope.patrocinioAtual = angular.copy(estado.patrocinioAtual || null);
        $scope.propostasPendentes = angular.copy(estado.propostasPendentes || []);
        $scope.ultimoResumoPartida = angular.copy(estado.ultimoResumoPartida || null);
        $scope.atualizarAmbienteElencoResumo();
        $scope.atualizarResumoContextoExterno();
        return true;
    }
    $scope.baseResumo = criarResumoBase(null);
    $scope.contratosResumo = criarResumoContratos([]);

    // FASE 12: ESTILO DE JOGO
    $scope.taticas = {
        mentalidade: 'Equilibrado',
        foco: 'Misto',
        marcacao: 'Recuada'
    };

    var funcoesTaticasPorPosicao = {
        GOL: ['Automática', 'Goleiro clássico', 'Goleiro-líbero'],
        LAT: ['Automática', 'Lateral apoiador', 'Lateral defensivo'],
        ZAG: ['Automática', 'Zagueiro construtor', 'Zagueiro marcador'],
        VOL: ['Automática', 'Volante marcador', 'Volante construtor'],
        MEI: ['Automática', 'Meia criativo', 'Meia de chegada'],
        ATA: ['Automática', 'Atacante móvel', 'Homem de área']
    };

    $scope.obterFuncoesTaticasJogador = function(jogador) {
        return funcoesTaticasPorPosicao[jogador && jogador.posicao] || ['Automática'];
    };

    $scope.definirFuncaoTaticaJogador = function(jogador, funcao) {
        if (!jogador) return;
        var funcoes = $scope.obterFuncoesTaticasJogador(jogador);
        jogador.funcaoTatica = funcoes.indexOf(funcao) >= 0 ? funcao : 'Automática';
        if ($scope.salvarJogoSilencioso) $scope.salvarJogoSilencioso();
    };

    $scope.obterImpactoFuncaoTatica = function(jogador) {
        var funcao = jogador && jogador.funcaoTatica;
        var impacto = { ataque: 0, defesa: 0, posse: 0 };
        if (!jogador || !funcao || funcao === 'Automática') return impacto;
        switch (funcao) {
            case 'Goleiro clássico': impacto.defesa = 1.5; break;
            case 'Goleiro-líbero': impacto.defesa = 0.5; impacto.posse = 1.2; break;
            case 'Lateral apoiador': impacto.ataque = 1.3; impacto.posse = 0.5; break;
            case 'Lateral defensivo': impacto.defesa = 1.3; break;
            case 'Zagueiro construtor': impacto.defesa = 0.6; impacto.posse = 1.1; break;
            case 'Zagueiro marcador': impacto.defesa = 1.4; break;
            case 'Volante marcador': impacto.defesa = 1.4; impacto.ataque = -0.3; break;
            case 'Volante construtor': impacto.posse = 1.4; impacto.ataque = 0.5; break;
            case 'Meia criativo': impacto.ataque = 1.5; impacto.posse = 1.1; break;
            case 'Meia de chegada': impacto.ataque = 1.7; break;
            case 'Atacante móvel': impacto.ataque = 1.5; impacto.posse = 0.5; break;
            case 'Homem de área': impacto.ataque = 2; break;
        }
        return impacto;
    };

    $scope.obterPerfilFuncoesTaticas = function(jogadores) {
        var perfil = { ataque: 0, defesa: 0, posse: 0, jogadores: 0 };
        (jogadores || []).forEach(function(jogador) {
            if (!jogador || jogador.expulso || jogador.lesionado || jogador.substituidoNaPartida) return;
            var impacto = $scope.obterImpactoFuncaoTatica(jogador);
            perfil.ataque += impacto.ataque;
            perfil.defesa += impacto.defesa;
            perfil.posse += impacto.posse;
            perfil.jogadores++;
        });
        if (!perfil.jogadores) return perfil;
        perfil.ataque /= perfil.jogadores;
        perfil.defesa /= perfil.jogadores;
        perfil.posse /= perfil.jogadores;
        return perfil;
    };

    function valorNumericoOuPadrao(valor, padrao) {
        return (typeof valor === 'number') ? valor : padrao;
    }

    function obterChaveNumericaJogador(jogador) {
        var id = jogador && jogador.id !== undefined ? jogador.id : 0;
        if (typeof id === 'number') return id;
        var texto = String(id);
        var soma = 0;
        for (var i = 0; i < texto.length; i++) soma += texto.charCodeAt(i) * (i + 1);
        return soma;
    }

    function calcularOverallBaseJogador(jogador) {
        if (!jogador || !jogador.atributos) return 70;
        var attr = jogador.atributos;
        if (jogador.posicao === 'GOL') {
            var reflexo = valorNumericoOuPadrao(attr.reflexo, 75);
            var posicionamento = valorNumericoOuPadrao(attr.posicionamento, reflexo);
            var distribuicao = valorNumericoOuPadrao(attr.distribuicao, valorNumericoOuPadrao(attr.passe, 75));
            var fisicoGol = valorNumericoOuPadrao(attr.fisico, 75);
            return Math.round((reflexo * 2 + posicionamento + distribuicao + fisicoGol) / 5);
        }
        return Math.round((
            valorNumericoOuPadrao(attr.finalizacao, 75) +
            valorNumericoOuPadrao(attr.passe, 75) +
            valorNumericoOuPadrao(attr.marcacao, 75) +
            valorNumericoOuPadrao(attr.velocidade, 75) +
            valorNumericoOuPadrao(attr.fisico, 75)
        ) / 5);
    }

    function calcularPotencialDeterministico(jogador) {
        var overall = calcularOverallBaseJogador(jogador);
        var idade = valorNumericoOuPadrao(jogador && jogador.idade, 24);
        var chave = obterChaveNumericaJogador(jogador);
        var bonus = 0;

        if (idade <= 21) bonus = 8 + ((chave * 7 + idade * 3) % 11);
        else if (idade <= 25) bonus = 4 + ((chave * 7 + idade * 3) % 9);
        else if (idade <= 29) bonus = ((chave * 7 + idade * 3) % 7);
        else bonus = -Math.min(3, ((chave * 5 + idade) % 4));

        return Math.max(10, Math.min(99, overall + bonus));
    }

    function normalizarJogadorSalvo(jogador) {
        if (!jogador) return;
        if (!jogador.atributos) jogador.atributos = {};

        var attr = jogador.atributos;
        var finalizacao = valorNumericoOuPadrao(attr.finalizacao, 75);
        var passe = valorNumericoOuPadrao(attr.passe, 75);

        if (jogador.condicaoFisica === undefined) jogador.condicaoFisica = 100;
        if (jogador.cartoesAmarelos === undefined) jogador.cartoesAmarelos = 0;
        if (jogador.lesionado === undefined) jogador.lesionado = false;
        if (jogador.diasLesao === undefined) jogador.diasLesao = 0;
        if (jogador.suspenso === undefined) jogador.suspenso = false;
        if (jogador.substituidoNaPartida === undefined) jogador.substituidoNaPartida = false;
        if (!jogador.funcaoTatica) jogador.funcaoTatica = 'Automática';
        // Jogadores já existentes preservam a força atual; recém-chegados recebem
        // adaptação explícita para que a contratação tenha impacto gradual.
        if (jogador.adaptacaoClube === undefined || jogador.adaptacaoClube === null) jogador.adaptacaoClube = 100;
        jogador.adaptacaoClube = Math.max(0, Math.min(100, Number(jogador.adaptacaoClube) || 0));
        if (jogador.diasNoClube === undefined) jogador.diasNoClube = 0;

        if (jogador.potencial === undefined || jogador.potencial === null) jogador.potencial = calcularPotencialDeterministico(jogador);
        if (jogador.xpTemporada === undefined) jogador.xpTemporada = 0;
        if (jogador.jogosTemporada === undefined) jogador.jogosTemporada = 0;
        if (jogador.minutosTemporada === undefined) jogador.minutosTemporada = 0;
        if (jogador.evolucaoTemporada === undefined) jogador.evolucaoTemporada = 0;
        if (!Array.isArray(jogador.historicoEvolucao)) jogador.historicoEvolucao = [];
        var focosDesenvolvimento = ['equilibrado', 'fisico', 'tecnico', 'tatico', 'defensivo'];
        if (focosDesenvolvimento.indexOf(jogador.desenvolvimentoFoco) < 0) jogador.desenvolvimentoFoco = 'equilibrado';

        if (jogador.posicao === 'GOL') {
            if (attr.posicionamento === undefined) attr.posicionamento = valorNumericoOuPadrao(attr.reflexo, 75);
            if (attr.distribuicao === undefined) attr.distribuicao = passe;
        }

        if (attr.penalti === undefined) attr.penalti = finalizacao;
        if (attr.escanteio === undefined) attr.escanteio = passe;
        if (attr.cobrador === undefined) attr.cobrador = Math.round((finalizacao + passe) / 2);
        atualizarStatusHumorJogador(jogador);
        normalizarEstadoContratoJogadorInterno(jogador);
    }

    function normalizarListaJogadoresSalvos(jogadores) {
        if (!Array.isArray(jogadores)) return;
        jogadores.forEach(function(jogador) {
            normalizarJogadorSalvo(jogador);
        });
    }

    function calcularStatusContratoJogadorInterno(jogador) {
        var anos = jogador && jogador.anosContrato !== undefined ? parseInt(jogador.anosContrato, 10) : 0;
        if (!anos || anos <= 0) return 'pre-contrato';
        if (anos <= 1) return 'urgente';
        if (anos === 2) return 'monitorar';
        return 'seguro';
    }

    function obterLabelStatusContrato(status) {
        if (status === 'pre-contrato') return 'Pre-contrato';
        if (status === 'urgente') return 'Urgente';
        if (status === 'monitorar') return 'Monitorar';
        return 'Seguro';
    }

    function calcularSalarioDesejadoJogadorInterno(jogador) {
        if (!jogador) return 10000;
        var salarioAtual = parseFloat(jogador.salario) || 10000;
        var overall = calcularOverallBaseJogador(jogador);
        var potencial = valorNumericoOuPadrao(jogador.potencial, overall);
        var jogos = parseInt(jogador.jogosTemporada, 10) || 0;
        var minutos = parseInt(jogador.minutosTemporada, 10) || 0;
        var evolucao = parseInt(jogador.evolucaoTemporada, 10) || 0;
        var moral = typeof jogador.moral === 'number' ? jogador.moral : 70;
        var baseTecnica = Math.round(overall * overall * 4);
        var fator = 1;
        if (potencial >= 84) fator += 0.08;
        if (jogos >= 20 || minutos >= 1800) fator += 0.06;
        if (evolucao >= 3) fator += 0.04;
        if (moral >= 85) fator += 0.03;
        return Math.max(salarioAtual, Math.round(baseTecnica * fator));
    }

    function calcularSalarioMercadoInterno(jogador) {
        if (!jogador) return 10000;
        var overall = calcularOverallBaseJogador(jogador);
        var idade = valorNumericoOuPadrao(jogador.idade, 24);
        var clubeJogador = ($scope.clubes || []).find(function(c) { return c.id == jogador.clubeId; });
        var divisao = jogador.divisao || (clubeJogador && clubeJogador.divisao) || '';
        var fatorDivisao = { A: 1.18, B: 0.92, C: 0.72, D: 0.55 }[divisao] || 0.8;
        var fatorIdade = idade <= 21 ? 0.82 : (idade <= 25 ? 1.0 : (idade <= 29 ? 1.08 : (idade >= 33 ? 0.82 : 0.98)));
        var fatorPotencial = 1 + Math.max(0, (Number(jogador.potencial) || overall) - overall) * 0.006;
        return Math.max(10000, Math.round((overall * overall * 18 * fatorDivisao * fatorIdade * fatorPotencial) / 100) * 100);
    }

    function calcularSatisfacaoContratoJogadorInterno(jogador, salarioDesejado) {
        var salarioAtual = parseFloat(jogador && jogador.salario) || 10000;
        salarioDesejado = parseFloat(salarioDesejado) || salarioAtual;
        var status = calcularStatusContratoJogadorInterno(jogador);
        var satisfacao = 82;
        var razao = salarioDesejado > 0 ? salarioAtual / salarioDesejado : 1;
        if (razao < 0.6) satisfacao -= 28;
        else if (razao < 0.8) satisfacao -= 18;
        else if (razao < 0.95) satisfacao -= 8;
        if (status === 'monitorar') satisfacao -= 6;
        if (status === 'urgente') satisfacao -= 18;
        if (status === 'pre-contrato') satisfacao -= 32;
        return limitarNumero(Math.round(satisfacao), 0, 100);
    }

    function normalizarEstadoContratoJogadorInterno(jogador) {
        if (!jogador) return null;
        if (!jogador.salario) jogador.salario = 10000;
        if (!jogador.anosContrato && jogador.anosContrato !== 0) jogador.anosContrato = 1;
        var desejadoCalculado = calcularSalarioDesejadoJogadorInterno(jogador);
        if (jogador.salarioDesejado === undefined || jogador.salarioDesejado === null) jogador.salarioDesejado = desejadoCalculado;
        else jogador.salarioDesejado = Math.max(parseFloat(jogador.salarioDesejado) || desejadoCalculado, parseFloat(jogador.salario) || 10000);
        if (!jogador.salarioPersonalizado && [60000, 10000, 2000].indexOf(Number(jogador.salario)) !== -1) {
            var salarioVariavel = calcularSalarioMercadoInterno(jogador);
            jogador.salario = salarioVariavel;
            jogador.salarioDesejado = calcularSalarioDesejadoJogadorInterno(jogador);
        }
        jogador.statusContrato = calcularStatusContratoJogadorInterno(jogador);
        jogador.statusContratoLabel = obterLabelStatusContrato(jogador.statusContrato);
        jogador.satisfacaoContrato = calcularSatisfacaoContratoJogadorInterno(jogador, jogador.salarioDesejado);
        if (jogador.ultimaRevisaoContratoDia === undefined) jogador.ultimaRevisaoContratoDia = 0;
        jogador.valorMercadoDinamico = calcularValorMercadoJogadorInterno(jogador);
        return jogador;
    }

    function calcularValorMercadoJogadorInterno(jogador) {
        if (!jogador) return 0;
        var overall = calcularOverallBaseJogador(jogador);
        var potencial = Math.max(overall, valorNumericoOuPadrao(jogador.potencial, overall));
        var idade = valorNumericoOuPadrao(jogador.idade, 24);
        var idadeFator = idade <= 21 ? 1.25 : (idade <= 23 ? 1.18 : (idade <= 27 ? 1.05 : (idade >= 32 ? 0.7 : 0.92)));
        var clubeJogador = ($scope.clubes || []).find(function(c) { return c.id == jogador.clubeId; });
        var divisao = jogador.divisao || (clubeJogador && clubeJogador.divisao) || '';
        var fatorDivisao = { A: 1.25, B: 1.0, C: 0.78, D: 0.62 }[divisao] || 0.85;
        var fatorPotencial = 1 + Math.max(0, potencial - overall) * 0.018;
        var fatorContrato = jogador.anosContrato >= 3 ? 1.12 : (jogador.anosContrato <= 1 ? 0.72 : 1);
        var valorBase = Math.pow(Math.max(35, overall), 3) * 8;
        return Math.max(0, Math.round((valorBase * idadeFator * fatorDivisao * fatorPotencial * fatorContrato) / 100000) * 100000);
    }

    function criarResumoContratos(jogadores) {
        jogadores = Array.isArray(jogadores) ? jogadores : [];
        var criticos = jogadores.filter(function(j) { return j && (j.statusContrato === 'urgente' || j.statusContrato === 'pre-contrato'); });
        var monitorados = jogadores.filter(function(j) { return j && j.statusContrato === 'monitorar'; });
        var maisCritico = criticos.slice().sort(function(a, b) {
            if ((a.anosContrato || 0) !== (b.anosContrato || 0)) return (a.anosContrato || 0) - (b.anosContrato || 0);
            return (b.valorMercadoDinamico || 0) - (a.valorMercadoDinamico || 0);
        })[0] || null;
        return {
            urgentes: criticos.length,
            monitorados: monitorados.length,
            seguros: jogadores.filter(function(j) { return j && j.statusContrato === 'seguro'; }).length,
            casoCritico: maisCritico,
            folhaDesejada: jogadores.reduce(function(total, j) { return total + (parseFloat(j && j.salarioDesejado) || 0); }, 0)
        };
    }

    $scope.normalizarEstadoContratoJogador = function(jogador) {
        return normalizarEstadoContratoJogadorInterno(jogador);
    };

    $scope.calcularValorMercadoJogador = function(jogador) {
        return calcularValorMercadoJogadorInterno(jogador);
    };

    $scope.calcularStatusContratoJogador = function(jogador) {
        return calcularStatusContratoJogadorInterno(jogador);
    };

    $scope.calcularSalarioDesejadoJogador = function(jogador) {
        return calcularSalarioDesejadoJogadorInterno(jogador);
    };

    $scope.atualizarResumoContratos = function() {
        ($scope.elencoAtual || []).forEach(function(jogador) { normalizarEstadoContratoJogadorInterno(jogador); });
        $scope.contratosResumo = criarResumoContratos($scope.elencoAtual || []);
        return $scope.contratosResumo;
    };

    $scope.aplicarRenovacaoContratoJogador = function(jogador, salario, anos) {
        if (!jogador) return null;
        jogador.salario = parseFloat(salario) || jogador.salario || 10000;
        jogador.anosContrato = parseInt(anos, 10) || jogador.anosContrato || 1;
        jogador.salarioDesejado = Math.max(jogador.salario, calcularSalarioDesejadoJogadorInterno(jogador));
        jogador.satisfacaoContrato = 90;
        jogador.ultimaRevisaoContratoDia = $scope.diaAtual || 0;
        jogador.statusContrato = calcularStatusContratoJogadorInterno(jogador);
        jogador.statusContratoLabel = obterLabelStatusContrato(jogador.statusContrato);
        jogador.valorMercadoDinamico = calcularValorMercadoJogadorInterno(jogador);
        $scope.atualizarResumoContratos();
        jogador.satisfacaoContrato = 90;
        return jogador;
    };

    $scope.abrirRenovacaoGeral = function() {
        var elegiveis = ($scope.elencoAtual || []).filter(function(jogador) {
            normalizarEstadoContratoJogadorInterno(jogador);
            return jogador && (jogador.anosContrato || 0) <= 1 && !jogador.emNegociacao;
        }).map(function(jogador) {
            var salarioAtual = parseFloat(jogador.salario) || 0;
            var salarioProposto = Math.max(salarioAtual, Math.ceil((calcularSalarioDesejadoJogadorInterno(jogador) || salarioAtual) / 100) * 100);
            return { jogador: jogador, salarioAtual: salarioAtual, salarioProposto: salarioProposto, anos: 2, aumento: salarioProposto - salarioAtual };
        });
        $scope.renovacaoGeral = {
            aberta: true,
            itens: elegiveis,
            custoAtual: elegiveis.reduce(function(total, item) { return total + item.salarioAtual; }, 0),
            custoNovo: elegiveis.reduce(function(total, item) { return total + item.salarioProposto; }, 0)
        };
    };

    $scope.fecharRenovacaoGeral = function() { $scope.renovacaoGeral = { aberta: false, itens: [] }; };

    $scope.confirmarRenovacaoGeral = function() {
        if (!$scope.renovacaoGeral || !$scope.renovacaoGeral.itens.length) return;
        $scope.renovacaoGeral.itens.forEach(function(item) {
            $scope.aplicarRenovacaoContratoJogador(item.jogador, item.salarioProposto, item.anos);
        });
        $scope.adicionarMensagem('Diretoria', 'Renovações do elenco concluídas', $scope.renovacaoGeral.itens.length + ' contrato(s) foram renovados em lote. Nova folha mensal: ' + $scope.formatarMoeda($scope.renovacaoGeral.custoNovo) + '.', false, 'diretoria');
        if ($scope.salvarJogoSilencioso) $scope.salvarJogoSilencioso();
        $scope.fecharRenovacaoGeral();
    };

    $scope.revisarContratosElencoDia = function() {
        var dia = typeof $scope.diaAtual === 'number' ? $scope.diaAtual : 0;
        var revisados = [];
        ($scope.elencoAtual || []).forEach(function(jogador) {
            normalizarEstadoContratoJogadorInterno(jogador);
            if (jogador.ultimaRevisaoContratoDia === dia) return;
            var desejadoAtual = parseFloat(jogador.salarioDesejado) || calcularSalarioDesejadoJogadorInterno(jogador);
            var alvo = calcularSalarioDesejadoJogadorInterno(jogador);
            var overall = calcularOverallBaseJogador(jogador);
            var incremento = 0;
            if (alvo > desejadoAtual) incremento = Math.min(0.06, Math.max(0.01, (alvo - desejadoAtual) / Math.max(desejadoAtual, 1) * 0.35));
            if ((jogador.jogosTemporada || 0) >= 20 || (jogador.evolucaoTemporada || 0) >= 3 || overall >= 80) incremento = Math.max(incremento, 0.03);
            if (incremento > 0) jogador.salarioDesejado = Math.ceil(desejadoAtual * (1 + incremento));
            jogador.statusContrato = calcularStatusContratoJogadorInterno(jogador);
            jogador.statusContratoLabel = obterLabelStatusContrato(jogador.statusContrato);
            jogador.satisfacaoContrato = calcularSatisfacaoContratoJogadorInterno(jogador, jogador.salarioDesejado);
            jogador.valorMercadoDinamico = calcularValorMercadoJogadorInterno(jogador);
            jogador.ultimaRevisaoContratoDia = dia;
            if (jogador.satisfacaoContrato < 50 && jogador.moral !== undefined) jogador.moral = Math.max(0, jogador.moral - 1);
            revisados.push(jogador);
        });
        $scope.atualizarResumoContratos();
        if ($scope.contratosResumo.urgentes >= 3 && $scope.registrarEventoAmbiente) {
            $scope.registrarEventoAmbiente({ id: 'amb_contratos_' + dia, chave: 'contratos|' + dia, dia: dia, tipo: 'diretoria', impacto: -1, titulo: 'Contratos pressionam elenco', detalhe: 'Muitos vinculos curtos aumentaram a tensao interna.' });
        }
        return revisados;
    };

    function limitarNumero(valor, minimo, maximo) {
        valor = (typeof valor === 'number' && isFinite(valor)) ? valor : minimo;
        return Math.max(minimo, Math.min(maximo, valor));
    }

    function normalizarValorAmbiente(valor, padrao) {
        var numero = parseInt(valor, 10);
        if (typeof numero !== 'number' || !isFinite(numero)) numero = padrao;
        return limitarNumero(numero, 0, 100);
    }

    function criarAmbienteElencoPadrao() {
        return {
            valor: 70,
            tendencia: 'estavel',
            ultimaAtualizacaoDia: 0,
            eventos: []
        };
    }

    function calcularTendenciaAmbiente(eventos) {
        var recentes = Array.isArray(eventos) ? eventos.slice(0, 3) : [];
        var saldo = recentes.reduce(function(total, evento) {
            return total + (parseInt(evento.impacto, 10) || 0);
        }, 0);
        if (saldo > 1) return 'subindo';
        if (saldo < -1) return 'caindo';
        return 'estavel';
    }

    function normalizarEventoAmbiente(evento, indice) {
        evento = evento || {};
        var impacto = parseInt(evento.impacto, 10) || 0;
        var id = evento.id || evento.chave || ('amb_legacy_' + indice);
        return {
            id: id,
            chave: evento.chave || id,
            dia: (typeof evento.dia === 'number') ? evento.dia : 0,
            tipo: evento.tipo || 'geral',
            impacto: impacto,
            titulo: evento.titulo || 'Ambiente atualizado',
            detalhe: evento.detalhe || '',
            valorAntes: (typeof evento.valorAntes === 'number') ? evento.valorAntes : null,
            valorDepois: (typeof evento.valorDepois === 'number') ? evento.valorDepois : null
        };
    }

    function normalizarAmbienteElencoInterno(ambiente) {
        var base = ambiente || criarAmbienteElencoPadrao();
        base.valor = normalizarValorAmbiente(base.valor, 70);
        base.eventos = Array.isArray(base.eventos) ? base.eventos.map(normalizarEventoAmbiente).slice(0, 12) : [];
        base.ultimaAtualizacaoDia = (typeof base.ultimaAtualizacaoDia === 'number') ? base.ultimaAtualizacaoDia : 0;
        base.tendencia = calcularTendenciaAmbiente(base.eventos);
        return base;
    }

    function criarResumoAmbienteElenco(ambiente) {
        ambiente = normalizarAmbienteElencoInterno(ambiente);
        var ultimoEvento = ambiente.eventos[0] || null;
        var tendenciaLabel = ambiente.tendencia === 'subindo' ? 'Subindo' : (ambiente.tendencia === 'caindo' ? 'Caindo' : 'Estavel');
        var classe = ambiente.valor >= 80 ? 'alta' : (ambiente.valor >= 55 ? 'estavel' : 'baixa');
        return {
            valor: ambiente.valor,
            tendencia: ambiente.tendencia,
            tendenciaLabel: tendenciaLabel,
            classe: classe,
            titulo: ambiente.valor >= 80 ? 'Vestiario confiante' : (ambiente.valor >= 55 ? 'Ambiente controlado' : 'Ambiente pressionado'),
            detalhe: ultimoEvento ? ultimoEvento.detalhe : 'Sem eventos recentes no ambiente do elenco.',
            ultimoEventoTitulo: ultimoEvento ? ultimoEvento.titulo : 'Sem eventos recentes',
            ultimoEventoDetalhe: ultimoEvento ? ultimoEvento.detalhe : 'O grupo inicia em estado estavel.',
            fatorPercentual: Math.round(($scope.calcularFatorAmbiente ? $scope.calcularFatorAmbiente(ambiente.valor) : 1) * 100)
        };
    }

    function atualizarStatusHumorJogador(jogador) {
        if (!jogador) return null;
        var moral = (typeof jogador.moral === 'number') ? jogador.moral : 100;
        if (moral >= 80) {
            jogador.statusHumor = 'Confiante';
            jogador.statusHumorClasse = 'mood-confiante';
        } else if (moral < 50) {
            jogador.statusHumor = 'Insatisfeito';
            jogador.statusHumorClasse = 'mood-insatisfeito';
        } else {
            jogador.statusHumor = 'Neutro';
            jogador.statusHumorClasse = 'mood-neutro';
        }
        return jogador.statusHumor;
    }

    function clubeEhAtual(clubeId) {
        return $scope.clubeAtual && clubeId !== undefined && clubeId !== null && String(clubeId) === String($scope.clubeAtual.id);
    }

    function resultadoUsuarioNaPartida(partida) {
        if (!partida || !$scope.clubeAtual || partida.golsMandante === undefined || partida.golsVisitante === undefined) return null;
        var usuarioMandante = partida.mandante && clubeEhAtual(partida.mandante.id);
        var usuarioVisitante = partida.visitante && clubeEhAtual(partida.visitante.id);
        if (!usuarioMandante && !usuarioVisitante) return null;
        var golsUsuario = usuarioMandante ? partida.golsMandante : partida.golsVisitante;
        var golsAdversario = usuarioMandante ? partida.golsVisitante : partida.golsMandante;
        var saldo = golsUsuario - golsAdversario;
        if (saldo > 0) return 'vitoria';
        if (saldo < 0) return 'derrota';
        return 'empate';
    }

    function obterUltimosResultadosUsuario(partidaAtual) {
        var resultados = [];
        var diaAtual = (typeof $scope.diaAtual === 'number') ? $scope.diaAtual : 0;
        for (var i = diaAtual; i >= 0 && resultados.length < 3; i--) {
            var jogo = (i === diaAtual && partidaAtual) ? partidaAtual : ($scope.obterMeuJogoNoDia ? $scope.obterMeuJogoNoDia(i) : null);
            var resultado = resultadoUsuarioNaPartida(jogo);
            if (resultado && resultado !== 'empate') resultados.push(resultado);
        }
        return resultados;
    }

    $scope.criarAmbienteElencoPadrao = function() {
        return criarAmbienteElencoPadrao();
    };

    $scope.normalizarAmbienteElenco = function(ambiente) {
        return normalizarAmbienteElencoInterno(ambiente);
    };

    $scope.atualizarAmbienteElencoResumo = function() {
        $scope.ambienteElenco = normalizarAmbienteElencoInterno($scope.ambienteElenco);
        $scope.ambienteElencoResumo = criarResumoAmbienteElenco($scope.ambienteElenco);
        return $scope.ambienteElencoResumo;
    };

    $scope.calcularFatorAmbiente = function(valor) {
        valor = normalizarValorAmbiente(valor, 70);
        if (valor >= 85) return 1.02;
        if (valor >= 70) return 1.01;
        if (valor >= 50) return 1;
        if (valor >= 35) return 0.98;
        return 0.97;
    };

    $scope.registrarEventoAmbiente = function(dados) {
        if (!dados) return null;
        var impacto = parseInt(dados.impacto, 10) || 0;
        if (impacto === 0) return null;

        $scope.ambienteElenco = normalizarAmbienteElencoInterno($scope.ambienteElenco);
        var chave = dados.chave || dados.id || null;
        if (chave) {
            var existente = $scope.ambienteElenco.eventos.find(function(evento) {
                return evento.chave === chave || evento.id === chave;
            });
            if (existente) return existente;
        }

        var valorAntes = $scope.ambienteElenco.valor;
        var valorDepois = limitarNumero(valorAntes + impacto, 0, 100);
        var id = dados.id || chave || ('amb_' + Date.now() + '_' + Math.floor(Math.random() * 1000000));
        var evento = {
            id: id,
            chave: chave || id,
            dia: (typeof dados.dia === 'number') ? dados.dia : ($scope.diaAtual || 0),
            tipo: dados.tipo || 'geral',
            impacto: impacto,
            titulo: dados.titulo || 'Ambiente atualizado',
            detalhe: dados.detalhe || '',
            valorAntes: valorAntes,
            valorDepois: valorDepois
        };

        $scope.ambienteElenco.valor = valorDepois;
        $scope.ambienteElenco.ultimaAtualizacaoDia = evento.dia;
        $scope.ambienteElenco.eventos.unshift(evento);
        $scope.ambienteElenco.eventos = $scope.ambienteElenco.eventos.slice(0, 12);
        $scope.ambienteElenco.tendencia = calcularTendenciaAmbiente($scope.ambienteElenco.eventos);
        $scope.atualizarAmbienteElencoResumo();

        if (Math.abs(impacto) >= 3 && typeof $scope.adicionarMensagem === 'function') {
            $scope.adicionarMensagem('Comissao Tecnica', 'Ambiente do Elenco: ' + evento.titulo, evento.detalhe, false, 'ambiente');
        }

        return evento;
    };

    $scope.aplicarAmbienteResultadoPartida = function(partida, origem) {
        var resultado = resultadoUsuarioNaPartida(partida);
        if (!resultado || resultado === 'empate') return null;

        var dia = (typeof $scope.diaAtual === 'number') ? $scope.diaAtual : 0;
        var diaCalendario = $scope.calendarioGeral && $scope.calendarioGeral[dia] ? $scope.calendarioGeral[dia] : null;
        var decisivo = !!(diaCalendario && $scope.isDiaDecisivoCalendario && $scope.isDiaDecisivoCalendario(diaCalendario));
        if (!decisivo && partida && partida.mandante && partida.visitante) {
            decisivo = partida.mandante.reputacao >= 80 && partida.visitante.reputacao >= 80;
        }

        var impacto = resultado === 'vitoria' ? 2 : -2;
        if (decisivo) impacto += resultado === 'vitoria' ? 1 : -1;

        var chave = ['resultado', dia, partida.mandante && partida.mandante.id, partida.visitante && partida.visitante.id, partida.golsMandante, partida.golsVisitante].join('|');
        var evento = $scope.registrarEventoAmbiente({
            id: 'amb_' + chave.replace(/[^a-zA-Z0-9_\-]/g, '_'),
            chave: chave,
            dia: dia,
            tipo: 'resultado',
            impacto: impacto,
            titulo: resultado === 'vitoria' ? (decisivo ? 'Vitoria importante' : 'Vitoria fortalece o grupo') : (decisivo ? 'Derrota pesada' : 'Derrota sentida'),
            detalhe: resultado === 'vitoria' ? 'O elenco reagiu bem ao resultado positivo.' : 'O grupo sentiu o resultado negativo e precisa de resposta.'
        });

        if (evento) $scope.aplicarAmbienteSequenciaResultados(partida);
        return evento;
    };

    $scope.aplicarAmbienteSequenciaResultados = function(partidaAtual) {
        var resultados = obterUltimosResultadosUsuario(partidaAtual);
        if (resultados.length < 3) return null;
        var dia = (typeof $scope.diaAtual === 'number') ? $scope.diaAtual : 0;
        if (resultados.every(function(r) { return r === 'vitoria'; })) {
            return $scope.registrarEventoAmbiente({
                id: 'amb_seq_pos_' + dia,
                chave: 'sequencia|positiva|' + dia,
                dia: dia,
                tipo: 'resultado',
                impacto: 3,
                titulo: 'Sequencia positiva',
                detalhe: 'A boa fase recente aumentou a confianca coletiva.'
            });
        }
        if (resultados.every(function(r) { return r === 'derrota'; })) {
            return $scope.registrarEventoAmbiente({
                id: 'amb_seq_neg_' + dia,
                chave: 'sequencia|negativa|' + dia,
                dia: dia,
                tipo: 'resultado',
                impacto: -3,
                titulo: 'Sequencia negativa',
                detalhe: 'A sequencia ruim comecou a pesar no vestiario.'
            });
        }
        return null;
    };

    $scope.aplicarAmbienteRotacaoElenco = function() {
        var insatisfeitos = ($scope.elencoAtual || []).filter(function(j) {
            return j && !j.lesionado && !j.emCampo && (j.rodadasNoBanco || 0) > 3 && $scope.calcularOverall && $scope.calcularOverall(j) >= 76;
        });
        if (insatisfeitos.length < 3) return null;
        var dia = (typeof $scope.diaAtual === 'number') ? $scope.diaAtual : 0;
        return $scope.registrarEventoAmbiente({
            id: 'amb_rotacao_' + dia,
            chave: 'rotacao|' + dia + '|' + insatisfeitos.length,
            dia: dia,
            tipo: 'rotacao',
            impacto: -2,
            titulo: 'Reservas importantes insatisfeitos',
            detalhe: insatisfeitos.length + ' jogadores relevantes demonstram desconforto com poucos minutos.'
        });
    };

    $scope.aplicarAmbienteLesoesElenco = function() {
        var lesionados = ($scope.elencoAtual || []).filter(function(j) { return j && j.lesionado; });
        if (lesionados.length < 3) return null;
        var dia = (typeof $scope.diaAtual === 'number') ? $scope.diaAtual : 0;
        return $scope.registrarEventoAmbiente({
            id: 'amb_lesoes_' + dia,
            chave: 'lesoes|' + dia + '|' + lesionados.length,
            dia: dia,
            tipo: 'lesao',
            impacto: lesionados.length >= 5 ? -3 : -2,
            titulo: 'Departamento medico cheio',
            detalhe: lesionados.length + ' atletas estao lesionados, o que afeta a confianca do grupo.'
        });
    };

    $scope.aplicarAmbienteTransferencia = function(transferencia) {
        if (!transferencia || !$scope.clubeAtual) return null;
        var jogador = ($scope.elencoAtual || []).find(function(j) { return String(j.id) === String(transferencia.jogadorId); }) ||
            (($scope.jogadores || []).find(function(j) { return String(j.id) === String(transferencia.jogadorId); }));
        var overall = jogador ? calcularOverallBaseJogador(jogador) : 70;
        var impacto = 0;
        var titulo = '';
        var detalhe = '';

        if ((transferencia.tipo === 'compra' || transferencia.tipo === 'contratacao') && clubeEhAtual(transferencia.clubeDestinoId)) {
            impacto = overall >= 74 ? 2 : 1;
            titulo = 'Reforco apresentado';
            detalhe = 'A chegada de ' + transferencia.jogadorNome + ' trouxe energia nova ao elenco.';
        } else if (transferencia.tipo === 'venda' && clubeEhAtual(transferencia.clubeOrigemId)) {
            impacto = overall >= 76 ? -3 : -2;
            titulo = 'Saida sentida no elenco';
            detalhe = 'A venda de ' + transferencia.jogadorNome + ' gerou impacto no vestiario.';
        }

        if (impacto === 0) return null;
        if (clubeEhAtual(transferencia.clubeDestinoId) && $scope.registrarEventoTorcida) {
            $scope.registrarEventoTorcida({ id: 'fan_mercado_' + transferencia.chave.replace(/[^a-zA-Z0-9_\-]/g, '_'), chave: 'mercado|torcida|' + transferencia.chave, dia: transferencia.dia, origem: 'mercado', impacto: 1, titulo: 'Reforco anima a torcida', detalhe: 'A chegada de ' + transferencia.jogadorNome + ' teve boa recepcao nas arquibancadas.' });
        } else if (clubeEhAtual(transferencia.clubeOrigemId) && $scope.registrarEventoTorcida) {
            $scope.registrarEventoTorcida({ id: 'fan_venda_' + transferencia.chave.replace(/[^a-zA-Z0-9_\-]/g, '_'), chave: 'mercado|venda|' + transferencia.chave, dia: transferencia.dia, origem: 'mercado', impacto: -1, titulo: 'Venda divide opinioes', detalhe: 'A saida de ' + transferencia.jogadorNome + ' gerou debate entre os torcedores.' });
        }
        return $scope.registrarEventoAmbiente({
            id: 'amb_mercado_' + transferencia.chave.replace(/[^a-zA-Z0-9_\-]/g, '_'),
            chave: 'mercado|' + transferencia.chave,
            dia: transferencia.dia,
            tipo: 'mercado',
            impacto: impacto,
            titulo: titulo,
            detalhe: detalhe
        });
    };

    $scope.atualizarStatusHumorJogador = function(jogador) {
        return atualizarStatusHumorJogador(jogador);
    };

    $scope.atualizarStatusHumorElenco = function() {
        ($scope.elencoAtual || []).forEach(function(jogador) {
            atualizarStatusHumorJogador(jogador);
        });
    };

    function criarContextoExternoPadrao() {
        return {
            torcida: {
                humor: 65,
                tendencia: 'estavel',
                ultimaAtualizacaoDia: 0,
                historico: []
            },
            imprensa: {
                pressao: 40,
                tendencia: 'estavel',
                ultimaAtualizacaoDia: 0,
                historico: []
            }
        };
    }

    function normalizarEventoContextoExterno(evento, indice) {
        evento = evento || {};
        var id = evento.id || evento.chave || ('ctx_legacy_' + indice);
        return {
            id: id,
            chave: evento.chave || id,
            dia: (typeof evento.dia === 'number') ? evento.dia : 0,
            origem: evento.origem || 'geral',
            impacto: parseInt(evento.impacto, 10) || 0,
            titulo: evento.titulo || 'Contexto externo atualizado',
            detalhe: evento.detalhe || ''
        };
    }

    function normalizarContextoExternoInterno(contexto) {
        var base = contexto || criarContextoExternoPadrao();
        if (!base.torcida) base.torcida = criarContextoExternoPadrao().torcida;
        if (!base.imprensa) base.imprensa = criarContextoExternoPadrao().imprensa;

        base.torcida.humor = normalizarValorAmbiente(base.torcida.humor, 65);
        base.torcida.historico = Array.isArray(base.torcida.historico) ? base.torcida.historico.map(normalizarEventoContextoExterno).slice(0, 12) : [];
        base.torcida.tendencia = calcularTendenciaAmbiente(base.torcida.historico);
        base.torcida.ultimaAtualizacaoDia = (typeof base.torcida.ultimaAtualizacaoDia === 'number') ? base.torcida.ultimaAtualizacaoDia : 0;

        base.imprensa.pressao = normalizarValorAmbiente(base.imprensa.pressao, 40);
        base.imprensa.historico = Array.isArray(base.imprensa.historico) ? base.imprensa.historico.map(normalizarEventoContextoExterno).slice(0, 12) : [];
        base.imprensa.tendencia = calcularTendenciaAmbiente(base.imprensa.historico);
        base.imprensa.ultimaAtualizacaoDia = (typeof base.imprensa.ultimaAtualizacaoDia === 'number') ? base.imprensa.ultimaAtualizacaoDia : 0;
        return base;
    }

    function obterLabelTendenciaContexto(tendencia) {
        if (tendencia === 'subindo') return 'Subindo';
        if (tendencia === 'caindo') return 'Caindo';
        return 'Estavel';
    }

    function criarResumoContextoExterno(contexto) {
        contexto = normalizarContextoExternoInterno(contexto);
        var ultimoTorcida = contexto.torcida.historico[0] || null;
        var ultimoImprensa = contexto.imprensa.historico[0] || null;
        return {
            torcida: {
                valor: contexto.torcida.humor,
                tendencia: contexto.torcida.tendencia,
                tendenciaLabel: obterLabelTendenciaContexto(contexto.torcida.tendencia),
                classe: contexto.torcida.humor >= 75 ? 'alta' : (contexto.torcida.humor >= 45 ? 'estavel' : 'baixa'),
                ultimaLeitura: ultimoTorcida ? ultimoTorcida.detalhe : 'A torcida ainda observa o inicio do trabalho.'
            },
            imprensa: {
                valor: contexto.imprensa.pressao,
                tendencia: contexto.imprensa.tendencia,
                tendenciaLabel: obterLabelTendenciaContexto(contexto.imprensa.tendencia),
                classe: contexto.imprensa.pressao >= 70 ? 'alta' : (contexto.imprensa.pressao >= 35 ? 'estavel' : 'baixa'),
                ultimaLeitura: ultimoImprensa ? ultimoImprensa.detalhe : 'A imprensa ainda nao criou uma narrativa dominante.'
            },
            ultimaLeitura: ultimoImprensa ? ultimoImprensa.detalhe : (ultimoTorcida ? ultimoTorcida.detalhe : 'Clima externo estavel no entorno do clube.')
        };
    }

    function adicionarNoticiaContexto(tipo, titulo, detalhe, id) {
        if (!$scope.noticiasFeed) $scope.noticiasFeed = [];
        if (id && $scope.noticiasFeed.some(function(n) { return n.id === id; })) return;
        var dataAtual = $scope.calendarioGeral && $scope.calendarioGeral[$scope.diaAtual] ? $scope.calendarioGeral[$scope.diaAtual].titulo : new Date().toLocaleDateString('pt-BR');
        $scope.noticiasFeed.unshift({
            id: id || ('ctx_news_' + Date.now() + '_' + Math.floor(Math.random() * 1000000)),
            remetente: tipo === 'torcida' ? 'Torcida' : 'Imprensa',
            titulo: titulo,
            conteudo: detalhe,
            dataStr: dataAtual,
            lida: true,
            tipo: tipo
        });
        $scope.noticiasFeed = $scope.noticiasFeed.slice(0, 30);
    }

    $scope.criarContextoExternoPadrao = function() {
        return criarContextoExternoPadrao();
    };

    $scope.normalizarContextoExterno = function(contexto) {
        return normalizarContextoExternoInterno(contexto);
    };

    $scope.atualizarResumoContextoExterno = function() {
        $scope.contextoExterno = normalizarContextoExternoInterno($scope.contextoExterno);
        $scope.contextoExternoResumo = criarResumoContextoExterno($scope.contextoExterno);
        return $scope.contextoExternoResumo;
    };

    $scope.registrarEventoTorcida = function(dados) {
        if (!dados) return null;
        var impacto = parseInt(dados.impacto, 10) || 0;
        if (impacto === 0) return null;
        $scope.contextoExterno = normalizarContextoExternoInterno($scope.contextoExterno);
        var chave = dados.chave || dados.id || null;
        if (chave && $scope.contextoExterno.torcida.historico.some(function(e) { return e.chave === chave || e.id === chave; })) return null;

        var evento = normalizarEventoContextoExterno({
            id: dados.id,
            chave: chave,
            dia: (typeof dados.dia === 'number') ? dados.dia : ($scope.diaAtual || 0),
            origem: dados.origem || 'geral',
            impacto: impacto,
            titulo: dados.titulo || 'Torcida reage',
            detalhe: dados.detalhe || ''
        }, 0);
        $scope.contextoExterno.torcida.humor = limitarNumero($scope.contextoExterno.torcida.humor + impacto, 0, 100);
        $scope.contextoExterno.torcida.ultimaAtualizacaoDia = evento.dia;
        $scope.contextoExterno.torcida.historico.unshift(evento);
        $scope.contextoExterno.torcida.historico = $scope.contextoExterno.torcida.historico.slice(0, 12);
        $scope.contextoExterno.torcida.tendencia = calcularTendenciaAmbiente($scope.contextoExterno.torcida.historico);
        $scope.atualizarResumoContextoExterno();
        if (Math.abs(impacto) >= 2) adicionarNoticiaContexto('torcida', evento.titulo, evento.detalhe, 'news_' + evento.chave);
        if (($scope.contextoExterno.torcida.humor >= 85 || $scope.contextoExterno.torcida.humor <= 30) && $scope.registrarEventoAmbiente) {
            $scope.registrarEventoAmbiente({ id: 'amb_torcida_' + evento.id, chave: 'torcida|' + evento.chave, dia: evento.dia, tipo: 'diretoria', impacto: $scope.contextoExterno.torcida.humor >= 85 ? 1 : -1, titulo: 'Pressao da torcida', detalhe: evento.detalhe });
        }
        return evento;
    };

    $scope.registrarEventoImprensa = function(dados) {
        if (!dados) return null;
        var impacto = parseInt(dados.impacto, 10) || 0;
        if (impacto === 0) return null;
        $scope.contextoExterno = normalizarContextoExternoInterno($scope.contextoExterno);
        var chave = dados.chave || dados.id || null;
        if (chave && $scope.contextoExterno.imprensa.historico.some(function(e) { return e.chave === chave || e.id === chave; })) return null;

        var evento = normalizarEventoContextoExterno({
            id: dados.id,
            chave: chave,
            dia: (typeof dados.dia === 'number') ? dados.dia : ($scope.diaAtual || 0),
            origem: dados.origem || 'geral',
            impacto: impacto,
            titulo: dados.titulo || 'Imprensa repercute',
            detalhe: dados.detalhe || ''
        }, 0);
        $scope.contextoExterno.imprensa.pressao = limitarNumero($scope.contextoExterno.imprensa.pressao + impacto, 0, 100);
        $scope.contextoExterno.imprensa.ultimaAtualizacaoDia = evento.dia;
        $scope.contextoExterno.imprensa.historico.unshift(evento);
        $scope.contextoExterno.imprensa.historico = $scope.contextoExterno.imprensa.historico.slice(0, 12);
        $scope.contextoExterno.imprensa.tendencia = calcularTendenciaAmbiente($scope.contextoExterno.imprensa.historico);
        $scope.atualizarResumoContextoExterno();
        if (Math.abs(impacto) >= 2) adicionarNoticiaContexto('imprensa', evento.titulo, evento.detalhe, 'news_' + evento.chave);
        if ($scope.contextoExterno.imprensa.pressao >= 80 && $scope.registrarEventoAmbiente) {
            $scope.registrarEventoAmbiente({ id: 'amb_imprensa_' + evento.id, chave: 'imprensa|' + evento.chave, dia: evento.dia, tipo: 'diretoria', impacto: -1, titulo: 'Pressao da imprensa', detalhe: evento.detalhe });
        }
        return evento;
    };

    $scope.aplicarContextoExternoColetiva = function(opcao) {
        if (!opcao) return;
        var dia = (typeof $scope.diaAtual === 'number') ? $scope.diaAtual : 0;
        var tag = opcao.tagNarrativa || opcao.efeito || 'coletiva';
        var impactoTorcida = opcao.impactoTorcida;
        var impactoImprensa = opcao.impactoImprensa;
        if (impactoTorcida === undefined) impactoTorcida = opcao.efeito === 'motivacao' ? 2 : (opcao.efeito === 'arrogante' ? 1 : -1);
        if (impactoImprensa === undefined) impactoImprensa = opcao.efeito === 'motivacao' ? -1 : (opcao.efeito === 'arrogante' ? 3 : 2);
        $scope.registrarEventoTorcida({ id: 'fan_coletiva_' + dia + '_' + tag, chave: 'coletiva|torcida|' + dia + '|' + tag, dia: dia, origem: 'coletiva', impacto: impactoTorcida, titulo: 'Torcida reage a coletiva', detalhe: opcao.msg || 'A coletiva mexeu com a arquibancada.' });
        $scope.registrarEventoImprensa({ id: 'media_coletiva_' + dia + '_' + tag, chave: 'coletiva|imprensa|' + dia + '|' + tag, dia: dia, origem: 'coletiva', impacto: impactoImprensa, titulo: 'Coletiva repercute na imprensa', detalhe: opcao.msg || 'A entrevista pautou o noticiario esportivo.' });
    };

    $scope.aplicarContextoExternoResultadoPartida = function(partida, origem) {
        var resultado = resultadoUsuarioNaPartida(partida);
        if (!resultado || resultado === 'empate') return null;
        var dia = (typeof $scope.diaAtual === 'number') ? $scope.diaAtual : 0;
        var diaCalendario = $scope.calendarioGeral && $scope.calendarioGeral[dia] ? $scope.calendarioGeral[dia] : null;
        var jogoGrande = !!(diaCalendario && $scope.isDiaDecisivoCalendario && $scope.isDiaDecisivoCalendario(diaCalendario));
        if (!jogoGrande && partida && partida.mandante && partida.visitante) jogoGrande = partida.mandante.reputacao >= 80 && partida.visitante.reputacao >= 80;
        var statusDiretoria = $scope.diretoriaStatus && $scope.diretoriaStatus.status;
        var impactoTorcida = resultado === 'vitoria' ? 3 : -3;
        var impactoImprensa = resultado === 'vitoria' ? -2 : 3;
        if (jogoGrande) {
            impactoTorcida += resultado === 'vitoria' ? 1 : -2;
            impactoImprensa += resultado === 'vitoria' ? -1 : 2;
        }
        if (statusDiretoria === 'acima_do_esperado') impactoTorcida += 1;
        if (statusDiretoria === 'critico') impactoImprensa += 1;
        var chave = ['resultado_ctx', dia, partida.mandante && partida.mandante.id, partida.visitante && partida.visitante.id, partida.golsMandante, partida.golsVisitante].join('|');
        $scope.registrarEventoTorcida({ id: 'fan_' + chave.replace(/[^a-zA-Z0-9_\-]/g, '_'), chave: 'torcida|' + chave, dia: dia, origem: 'resultado', impacto: impactoTorcida, titulo: resultado === 'vitoria' ? 'Torcida empolgada' : 'Derrota sentida', detalhe: resultado === 'vitoria' ? 'A arquibancada comprou a boa resposta em campo.' : 'A derrota gerou impaciencia entre os torcedores.' });
        $scope.registrarEventoImprensa({ id: 'media_' + chave.replace(/[^a-zA-Z0-9_\-]/g, '_'), chave: 'imprensa|' + chave, dia: dia, origem: 'resultado', impacto: impactoImprensa, titulo: resultado === 'vitoria' ? 'Pressao externa alivia' : 'Imprensa aumenta cobranca', detalhe: resultado === 'vitoria' ? 'O resultado positivo reduziu o ruido no entorno.' : 'A imprensa passou a cobrar respostas mais contundentes.' });
        return true;
    };

    function criarScoutingPadrao() {
        return {
            shortlist: [],
            historicoRelatorios: [],
            ultimoRelatorioDia: 0
        };
    }

    function normalizarFaixaValorScouting(faixaValor, valorBase) {
        valorBase = parseFloat(valorBase) || 0;
        var min = faixaValor && faixaValor.min !== undefined ? parseFloat(faixaValor.min) : Math.max(0, Math.floor(valorBase * 0.85));
        var max = faixaValor && faixaValor.max !== undefined ? parseFloat(faixaValor.max) : Math.max(min, Math.ceil(valorBase * 1.15));
        if (max < min) max = min;
        return { min: min, max: max };
    }

    function normalizarItemScouting(item) {
        if (!item) return null;
        var jogadorId = item.jogadorId !== undefined ? item.jogadorId : item.id;
        var valorBase = item.valorBase || item.valor || item.valorEstimado || item.salario || 0;
        var id = item.id !== undefined ? String(item.id) : ('scout_player_' + jogadorId);
        return {
            id: id,
            jogadorId: jogadorId,
            nome: item.nome || 'Jogador observado',
            idade: parseInt(item.idade, 10) || 18,
            posicao: item.posicao || '-',
            pais: item.pais || 'BRA',
            potencialEstimado: normalizarValorAmbiente(item.potencialEstimado !== undefined ? item.potencialEstimado : item.potencial, 70),
            overallEstimado: normalizarValorAmbiente(item.overallEstimado !== undefined ? item.overallEstimado : calcularOverallBaseJogador(item), 70),
            confiancaRelatorio: limitarNumero(parseInt(item.confiancaRelatorio, 10) || 50, 50, 95),
            faixaValor: normalizarFaixaValorScouting(item.faixaValor, valorBase),
            origemMissao: item.origemMissao || item.tipoMissao || 'BASE',
            observacao: item.observacao || 'Relatorio em acompanhamento.',
            disponibilidade: item.disponibilidade || 'curto-prazo',
            salario: parseFloat(item.salario) || 0,
            anosContrato: parseInt(item.anosContrato, 10) || null
        };
    }

    function normalizarRelatorioScouting(relatorio, indice) {
        relatorio = relatorio || {};
        var id = relatorio.id || ('scout_report_legacy_' + indice);
        return {
            id: id,
            dia: (typeof relatorio.dia === 'number') ? relatorio.dia : 0,
            origemMissao: relatorio.origemMissao || 'BASE',
            olheiroNome: relatorio.olheiroNome || 'Olheiro',
            jogadores: Array.isArray(relatorio.jogadores) ? relatorio.jogadores.map(normalizarItemScouting).filter(Boolean) : []
        };
    }

    function normalizarScoutingClube(clube) {
        if (!clube) return criarScoutingPadrao();
        var scouting = clube.scouting || criarScoutingPadrao();
        scouting.shortlist = Array.isArray(scouting.shortlist) ? scouting.shortlist.map(normalizarItemScouting).filter(Boolean).slice(0, 30) : [];
        scouting.historicoRelatorios = Array.isArray(scouting.historicoRelatorios) ? scouting.historicoRelatorios.map(normalizarRelatorioScouting).slice(0, 10) : [];
        scouting.ultimoRelatorioDia = (typeof scouting.ultimoRelatorioDia === 'number') ? scouting.ultimoRelatorioDia : 0;
        clube.scouting = scouting;
        return clube;
    }

    function isJogadorNaShortlistInterno(item) {
        if (!$scope.clubeAtual || !item) return false;
        normalizarScoutingClube($scope.clubeAtual);
        var jogadorId = item.jogadorId !== undefined ? item.jogadorId : item.id;
        return $scope.clubeAtual.scouting.shortlist.some(function(observado) {
            return String(observado.jogadorId) === String(jogadorId) || String(observado.id) === String(item.id);
        });
    }

    function atualizarFlagsShortlistRelatorios() {
        if (!$scope.clubeAtual || !$scope.clubeAtual.olheiros) return;
        normalizarScoutingClube($scope.clubeAtual);
        $scope.clubeAtual.olheiros.forEach(function(olheiro) {
            (olheiro.relatorio || []).forEach(function(jogador, index) {
                if (!jogador) return;
                if (jogador && jogador.confiancaRelatorio === undefined) {
                    $scope.criarItemRelatorioScouting(jogador, olheiro.tipoMissao, index);
                }
                jogador.observado = isJogadorNaShortlistInterno(jogador);
            });
        });
    }

    $scope.criarScoutingPadrao = function() {
        return criarScoutingPadrao();
    };

    $scope.criarItemRelatorioScouting = function(jogador, origemMissao, indice) {
        if (!jogador) return null;
        normalizarJogadorSalvo(jogador);
        var chave = obterChaveNumericaJogador(jogador) + ((indice || 0) * 17) + (($scope.diaAtual || 0) * 3);
        var confianca = 50 + (chave % 46);
        var erroMax = Math.max(1, Math.round((100 - confianca) / 9));
        var erroOverall = (chave % (erroMax * 2 + 1)) - erroMax;
        var erroPotencial = ((chave * 3) % (erroMax * 2 + 1)) - erroMax;
        var overallReal = calcularOverallBaseJogador(jogador);
        var potencialReal = valorNumericoOuPadrao(jogador.potencial, calcularPotencialDeterministico(jogador));
        var valorReal = $scope.calcularValorPasse ? $scope.calcularValorPasse(jogador) : overallReal * 10000;
        var margem = 0.08 + ((95 - confianca) / 100);
        var paisesSul = ['ARG', 'URU', 'COL', 'CHI', 'PAR'];

        jogador.origemMissao = origemMissao || 'BASE';
        jogador.confiancaRelatorio = confianca;
        jogador.overallEstimado = limitarNumero(overallReal + erroOverall, 1, 99);
        jogador.potencialEstimado = limitarNumero(potencialReal + erroPotencial, 1, 99);
        jogador.faixaValor = {
            min: Math.max(0, Math.floor(valorReal * (1 - margem))),
            max: Math.max(0, Math.ceil(valorReal * (1 + margem)))
        };
        jogador.pais = origemMissao === 'SUL-AMERICANO' ? paisesSul[chave % paisesSul.length] : 'BRA';
        jogador.observacao = jogador.posicao === 'ATA' ? 'Atacante com margem para evoluir.' : (jogador.posicao === 'GOL' ? 'Goleiro monitorado pela equipe de analise.' : 'Perfil interessante para acompanhamento.');
        jogador.disponibilidade = origemMissao === 'INTERIOR' ? 'curto-prazo' : 'observacao';
        jogador.observado = isJogadorNaShortlistInterno(jogador);
        return jogador;
    };

    $scope.registrarHistoricoRelatorioScouting = function(relatorio) {
        if (!$scope.clubeAtual || !relatorio) return null;
        normalizarScoutingClube($scope.clubeAtual);
        var item = normalizarRelatorioScouting(relatorio, 0);
        var existente = $scope.clubeAtual.scouting.historicoRelatorios.find(function(r) { return r.id === item.id; });
        if (existente) return existente;
        $scope.clubeAtual.scouting.historicoRelatorios.unshift(item);
        $scope.clubeAtual.scouting.historicoRelatorios = $scope.clubeAtual.scouting.historicoRelatorios.slice(0, 10);
        $scope.clubeAtual.scouting.ultimoRelatorioDia = item.dia;
        return item;
    };

    $scope.adicionarShortlistScouting = function(item) {
        if (!$scope.clubeAtual || !item) return null;
        normalizarScoutingClube($scope.clubeAtual);
        var observado = normalizarItemScouting(item);
        var existente = $scope.clubeAtual.scouting.shortlist.find(function(s) {
            return String(s.jogadorId) === String(observado.jogadorId) || String(s.id) === String(observado.id);
        });
        if (existente) return existente;
        $scope.clubeAtual.scouting.shortlist.unshift(observado);
        $scope.clubeAtual.scouting.shortlist = $scope.clubeAtual.scouting.shortlist.slice(0, 30);
        atualizarFlagsShortlistRelatorios();
        return observado;
    };

    $scope.removerShortlistScouting = function(id) {
        if (!$scope.clubeAtual) return;
        normalizarScoutingClube($scope.clubeAtual);
        $scope.clubeAtual.scouting.shortlist = $scope.clubeAtual.scouting.shortlist.filter(function(item) {
            return String(item.id) !== String(id) && String(item.jogadorId) !== String(id);
        });
        atualizarFlagsShortlistRelatorios();
    };

    $scope.isJogadorNaShortlist = function(item) {
        return isJogadorNaShortlistInterno(item);
    };

    function criarDiretoriaStatusPadrao() {
        return {
            objetivoAtual: '',
            tipoObjetivo: '',
            progressoLabel: 'Aguardando inicio da temporada',
            status: 'no_trilho',
            statusLabel: 'No trilho',
            statusClasse: 'board-ok',
            ultimaAvaliacaoDia: 0,
            ultimaObservacao: 'A diretoria aguarda os primeiros resultados da temporada.',
            bonusConfianca: 0,
            prioridadeEstrategica: '',
            prioridadeTemporada: '',
            briefingInicialConcluido: false,
            planoAtual: null,
            metasTemporada: [],
            ultimaReacaoMetasDia: 0,
            historicoAvaliacoes: []
        };
    }

    function normalizarDiretoriaStatusInterno(status) {
        var base = status || criarDiretoriaStatusPadrao();
        base.objetivoAtual = base.objetivoAtual || '';
        base.tipoObjetivo = base.tipoObjetivo || '';
        base.progressoLabel = base.progressoLabel || 'Aguardando inicio da temporada';
        base.status = base.status || 'no_trilho';
        base.statusLabel = base.statusLabel || obterLabelStatusDiretoria(base.status);
        base.statusClasse = base.statusClasse || obterClasseStatusDiretoria(base.status);
        base.ultimaAvaliacaoDia = (typeof base.ultimaAvaliacaoDia === 'number') ? base.ultimaAvaliacaoDia : 0;
        base.ultimaObservacao = base.ultimaObservacao || 'A diretoria aguarda os primeiros resultados da temporada.';
        base.bonusConfianca = Math.max(-10, Math.min(10, Number(base.bonusConfianca) || 0));
        base.prioridadeEstrategica = base.prioridadeEstrategica || '';
        base.prioridadeTemporada = base.prioridadeTemporada || '';
        base.briefingInicialConcluido = !!base.briefingInicialConcluido;
        base.planoAtual = base.planoAtual && typeof base.planoAtual === 'object' ? base.planoAtual : null;
        base.metasTemporada = Array.isArray(base.metasTemporada) ? base.metasTemporada : [];
        base.ultimaReacaoMetasDia = typeof base.ultimaReacaoMetasDia === 'number' ? base.ultimaReacaoMetasDia : 0;
        base.historicoAvaliacoes = Array.isArray(base.historicoAvaliacoes) ? base.historicoAvaliacoes.slice(0, 10) : [];
        return base;
    }

    function obterAlvoMetaDiretoria(tipo) {
        if (tipo === 'titulo') return 1;
        if (tipo === 'continental') return 6;
        if (tipo === 'acesso') return 4;
        if (tipo === 'top10') return 10;
        if (tipo === 'sobreviver') return 16;
        return 10;
    }

    function obterLabelStatusDiretoria(status) {
        if (status === 'acima_do_esperado') return 'Acima do esperado';
        if (status === 'em_risco') return 'Em risco';
        if (status === 'critico') return 'Critico';
        return 'No trilho';
    }

    function obterClasseStatusDiretoria(status) {
        if (status === 'acima_do_esperado') return 'board-great';
        if (status === 'em_risco') return 'board-risk';
        if (status === 'critico') return 'board-critical';
        return 'board-ok';
    }

    function obterObservacaoDiretoria(status) {
        if (status === 'acima_do_esperado') return 'O trabalho supera as expectativas iniciais.';
        if (status === 'em_risco') return 'A diretoria ve risco e espera reacao nas proximas rodadas.';
        if (status === 'critico') return 'A pressao interna aumentou; a meta esta distante.';
        return 'A campanha segue dentro do plano tracado.';
    }

    $scope.atualizarDiretoriaStatus = function() {
        $scope.diretoriaStatus = normalizarDiretoriaStatusInterno($scope.diretoriaStatus);
        if (!$scope.clubeAtual) return $scope.diretoriaStatus;

        var tipo = $scope.clubeAtual.metaTipo || $scope.diretoriaStatus.tipoObjetivo || '';
        var objetivo = $scope.clubeAtual.metaDescricao || $scope.diretoriaStatus.objetivoAtual || '';
        $scope.diretoriaStatus.tipoObjetivo = tipo;
        $scope.diretoriaStatus.objetivoAtual = objetivo;

        var tabela = $scope.ordenarTabela ? $scope.ordenarTabela($scope.clubeAtual.divisao) : [];
        var indice = tabela.findIndex(function(item) { return item.clube && item.clube.id === $scope.clubeAtual.id; });
        if (indice < 0) {
            $scope.diretoriaStatus.progressoLabel = 'Aguardando inicio da temporada';
            $scope.diretoriaStatus.status = 'no_trilho';
        } else {
            var posicao = indice + 1;
            var alvo = obterAlvoMetaDiretoria(tipo);
            var distancia = posicao - alvo;
            if (distancia <= -2) $scope.diretoriaStatus.status = 'acima_do_esperado';
            else if (distancia <= 0) $scope.diretoriaStatus.status = 'no_trilho';
            else if (distancia <= 3) $scope.diretoriaStatus.status = 'em_risco';
            else $scope.diretoriaStatus.status = 'critico';

            if (posicao === 1) $scope.diretoriaStatus.progressoLabel = 'Lider do campeonato';
            else if (distancia <= 0) $scope.diretoriaStatus.progressoLabel = posicao + 'º lugar, dentro da meta';
            else $scope.diretoriaStatus.progressoLabel = posicao + 'º lugar, ' + distancia + ' posicao(oes) abaixo da meta';
        }

        $scope.diretoriaStatus.statusLabel = obterLabelStatusDiretoria($scope.diretoriaStatus.status);
        $scope.diretoriaStatus.statusClasse = obterClasseStatusDiretoria($scope.diretoriaStatus.status);
        $scope.diretoriaStatus.ultimaObservacao = obterObservacaoDiretoria($scope.diretoriaStatus.status);
        var metas = $scope.diretoriaStatus.metasTemporada || [];
        var resumo = $scope.obterResumoGerencialTemporada ? $scope.obterResumoGerencialTemporada($scope.dados.anoAtual, $scope.clubeAtual.id) : null;
        metas.forEach(function(meta) {
            var progresso = 0;
            var label = 'Aguardando indicadores';
            if (meta.tipo === 'esportiva') {
                var alvo = obterAlvoMetaDiretoria(tipo) || 20;
                progresso = indice >= 0 ? Math.max(0, Math.min(100, Math.round(((alvo + 5 - indice - 1) / (alvo + 5)) * 100))) : 0;
                label = indice >= 0 ? progresso + '% da expectativa esportiva' : 'Aguardando classificação';
            } else if (meta.tipo === 'financeira') {
                var caixa = Number($scope.clubeAtual.orcamento) || 0;
                progresso = caixa >= 100000000 ? 100 : (caixa >= 30000000 ? 75 : (caixa > 0 ? 45 : 0));
                label = progresso + '% de sustentabilidade financeira';
            } else if (meta.tipo === 'desenvolvimento') {
                var evolucoes = (Array.isArray($scope.relatorioEvolucao) ? $scope.relatorioEvolucao : []).filter(function(item) { return item.temporada === $scope.dados.anoAtual; }).length;
                progresso = Math.min(100, evolucoes * 20);
                label = evolucoes + ' evolução(ões) registrada(s)';
            } else if (meta.tipo === 'mercado') {
                var carencias = $scope.obterResumoNecessidadesBase ? $scope.obterResumoNecessidadesBase().carencias.length : 0;
                progresso = carencias === 0 ? 100 : Math.max(25, 100 - carencias * 15);
                label = carencias === 0 ? 'Carências principais cobertas' : carencias + ' carência(s) para avaliar';
            }
            meta.progresso = progresso;
            meta.progressoLabel = label;
        });
        return $scope.diretoriaStatus;
    };

    $scope.avaliarDiretoriaPeriodica = function() {
        if (!$scope.clubeAtual) return null;
        var dia = (typeof $scope.diaAtual === 'number') ? $scope.diaAtual : 0;
        $scope.diretoriaStatus = normalizarDiretoriaStatusInterno($scope.diretoriaStatus);
        if (dia < 8 || $scope.diretoriaStatus.ultimaAvaliacaoDia === dia || (dia - ($scope.diretoriaStatus.ultimaAvaliacaoDia || 0)) < 8) return null;

        var status = $scope.atualizarDiretoriaStatus();
        var avaliacao = {
            id: 'dir_' + dia,
            dia: dia,
            status: status.status,
            statusLabel: status.statusLabel,
            progressoLabel: status.progressoLabel,
            observacao: status.ultimaObservacao
        };

        $scope.diretoriaStatus.ultimaAvaliacaoDia = dia;
        $scope.diretoriaStatus.historicoAvaliacoes.unshift(avaliacao);
        $scope.diretoriaStatus.historicoAvaliacoes = $scope.diretoriaStatus.historicoAvaliacoes.slice(0, 10);

        var metas = $scope.diretoriaStatus.metasTemporada || [];
        var metaCritica = metas.reduce(function(pior, meta) { return !pior || meta.progresso < pior.progresso ? meta : pior; }, null);
        if (metaCritica && dia - $scope.diretoriaStatus.ultimaReacaoMetasDia >= 16) {
            var impactoConfianca = metaCritica.progresso >= 75 ? 1 : (metaCritica.progresso < 45 ? -1 : 0);
            var narrativa = $scope.dados && $scope.dados.reputacaoNarrativa;
            if (narrativa && narrativa.respeito >= 70 && impactoConfianca < 0) impactoConfianca = 0;
            if (narrativa && narrativa.respeito <= 30 && impactoConfianca > 0) impactoConfianca = 0;
            var reacao = metaCritica.progresso >= 75 ? 'A diretoria reconhece o avanço em ' + metaCritica.tipo + ' e espera consistência.' : (metaCritica.progresso >= 45 ? 'A diretoria acompanha ' + metaCritica.tipo + ' com atenção e recomenda ajustes graduais.' : 'A diretoria solicita uma reação no eixo de ' + metaCritica.tipo + ' antes da próxima avaliação.');
            $scope.diretoriaStatus.ultimaReacaoMetasDia = dia;
            $scope.diretoriaStatus.bonusConfianca = Math.max(-10, Math.min(10, ($scope.diretoriaStatus.bonusConfianca || 0) + impactoConfianca));
            if ($scope.registrarEventoAmbiente && impactoConfianca !== 0) {
                $scope.registrarEventoAmbiente({ id: 'amb_meta_' + dia, chave: 'meta_diretoria|' + dia, dia: dia, tipo: 'diretoria', impacto: impactoConfianca, titulo: impactoConfianca > 0 ? 'Metas avançam' : 'Metas pressionam o elenco', detalhe: impactoConfianca > 0 ? 'O progresso reconhecido pela diretoria trouxe confiança ao grupo.' : 'A cobrança por uma meta atrasada aumentou a tensão interna.' });
            }
            $scope.adicionarMensagem('Diretoria', 'Acompanhamento das metas', reacao + ' ' + metaCritica.progressoLabel, false, 'diretoria');
        }

        if (typeof $scope.adicionarMensagem === 'function') {
            $scope.adicionarMensagem('Diretoria', 'Avaliacao parcial da temporada', avaliacao.observacao + ' ' + avaliacao.progressoLabel + '.', false, 'diretoria');
        }
        if (status.status === 'acima_do_esperado') {
            $scope.dados.reputacaoTreinador = Math.min(5, (($scope.dados.reputacaoTreinador || 3) + 0.1));
            if ($scope.registrarEventoAmbiente) $scope.registrarEventoAmbiente({ id: 'amb_dir_pos_' + dia, chave: 'diretoria|positiva|' + dia, dia: dia, tipo: 'diretoria', impacto: 1, titulo: 'Diretoria satisfeita', detalhe: 'A avaliacao positiva reforcou a confianca no trabalho.' });
            if ($scope.registrarEventoTorcida) $scope.registrarEventoTorcida({ id: 'fan_dir_pos_' + dia, chave: 'diretoria|torcida|positiva|' + dia, dia: dia, origem: 'diretoria', impacto: 1, titulo: 'Torcida compra a campanha', detalhe: 'A boa avaliacao da diretoria fortaleceu a confianca externa.' });
            if ($scope.registrarEventoImprensa) $scope.registrarEventoImprensa({ id: 'media_dir_pos_' + dia, chave: 'diretoria|imprensa|positiva|' + dia, dia: dia, origem: 'diretoria', impacto: -1, titulo: 'Pressao alivia', detalhe: 'Com a meta sob controle, o noticiario ficou menos pesado.' });
        } else if (status.status === 'critico') {
            if ($scope.registrarEventoAmbiente) $scope.registrarEventoAmbiente({ id: 'amb_dir_neg_' + dia, chave: 'diretoria|critica|' + dia, dia: dia, tipo: 'diretoria', impacto: -1, titulo: 'Pressao da diretoria', detalhe: 'A cobranca interna aumentou pela distancia da meta.' });
            if ($scope.registrarEventoTorcida) $scope.registrarEventoTorcida({ id: 'fan_dir_neg_' + dia, chave: 'diretoria|torcida|critica|' + dia, dia: dia, origem: 'diretoria', impacto: -1, titulo: 'Torcida impaciente', detalhe: 'A distancia da meta aumentou a impaciencia no entorno.' });
            if ($scope.registrarEventoImprensa) $scope.registrarEventoImprensa({ id: 'media_dir_neg_' + dia, chave: 'diretoria|imprensa|critica|' + dia, dia: dia, origem: 'diretoria', impacto: 2, titulo: 'Imprensa pressiona', detalhe: 'A campanha abaixo da meta virou pauta recorrente.' });
        }
        return avaliacao;
    };

    function criarInfraestruturaPadrao() {
        return {
            centroTreinamento: { nivel: 1, obraEmAndamento: false, diasRestantes: 0 },
            departamentoMedico: { nivel: 1, obraEmAndamento: false, diasRestantes: 0 },
            comercial: { nivel: 1, obraEmAndamento: false, diasRestantes: 0 },
            estadio: { nivelConforto: 1, obraEmAndamento: false, diasRestantes: 0 },
            ultimoResumoDia: 0
        };
    }

    function copiarAreaInfraestrutura(area, padrao, campoNivel) {
        area = area || {};
        var nivelCampo = campoNivel || 'nivel';
        area[nivelCampo] = limitarNumero(parseInt(area[nivelCampo], 10) || padrao[nivelCampo] || 1, 1, 3);
        area.obraEmAndamento = !!area.obraEmAndamento;
        area.diasRestantes = Math.max(0, parseInt(area.diasRestantes, 10) || 0);
        if (area.obraEmAndamento && area.diasRestantes <= 0) area.diasRestantes = 1;
        return area;
    }

    function normalizarInfraestruturaClubeInterno(clube) {
        if (!clube) return null;
        var padrao = criarInfraestruturaPadrao();
        var infra = clube.infraestrutura || {};
        var nivelMedicoLegado = parseInt(clube.nivelMedico, 10) || (infra.departamentoMedico && infra.departamentoMedico.nivel) || 1;

        infra.centroTreinamento = copiarAreaInfraestrutura(infra.centroTreinamento, padrao.centroTreinamento, 'nivel');
        infra.departamentoMedico = copiarAreaInfraestrutura(infra.departamentoMedico || { nivel: nivelMedicoLegado }, padrao.departamentoMedico, 'nivel');
        if (!infra.departamentoMedico.nivel || infra.departamentoMedico.nivel === 1) {
            infra.departamentoMedico.nivel = limitarNumero(nivelMedicoLegado, 1, 3);
        }
        infra.comercial = copiarAreaInfraestrutura(infra.comercial, padrao.comercial, 'nivel');
        infra.estadio = copiarAreaInfraestrutura(infra.estadio, padrao.estadio, 'nivelConforto');
        infra.ultimoResumoDia = (typeof infra.ultimoResumoDia === 'number') ? infra.ultimoResumoDia : 0;
        clube.infraestrutura = infra;
        clube.nivelMedico = infra.departamentoMedico.nivel;

        if (!clube.estadio) clube.estadio = { nome: 'Estadio', capacidade: 20000 };
        if (clube.estadio.obraEmAndamento === undefined) clube.estadio.obraEmAndamento = false;
        if (clube.estadio.rodadasRestantesObra === undefined) clube.estadio.rodadasRestantesObra = 0;
        return clube;
    }

    function obterConfigUpgradeInfraestrutura(area) {
        var configs = {
            centroTreinamento: { nome: 'Centro de Treinamento', campoNivel: 'nivel', custos: [0, 5000000, 12000000], duracoes: [0, 3, 5] },
            departamentoMedico: { nome: 'Departamento Medico', campoNivel: 'nivel', custos: [0, 5000000, 15000000], duracoes: [0, 3, 5] },
            comercial: { nome: 'Comercial', campoNivel: 'nivel', custos: [0, 3000000, 8000000], duracoes: [0, 3, 4] },
            estadio: { nome: 'Conforto do Estadio', campoNivel: 'nivelConforto', custos: [0, 4000000, 10000000], duracoes: [0, 4, 6] }
        };
        return configs[area] || null;
    }

    function criarResumoInfraestrutura(clube) {
        if (!clube || !clube.infraestrutura) {
            return { cards: [], obras: [], receitaComercialBonus: 0, recuperacaoBonus: 0 };
        }
        normalizarInfraestruturaClubeInterno(clube);
        var infra = clube.infraestrutura;
        function montarCard(area, titulo, nivel, beneficio, emObra, diasRestantes) {
            var config = obterConfigUpgradeInfraestrutura(area);
            var proximoNivel = nivel < 3 ? nivel + 1 : null;
            return {
                id: area,
                titulo: titulo,
                nivel: nivel,
                beneficio: beneficio,
                emObra: emObra,
                diasRestantes: diasRestantes,
                proximoNivel: proximoNivel,
                proximoCusto: proximoNivel && config ? config.custos[proximoNivel] : 0,
                proximoDias: proximoNivel && config ? config.duracoes[proximoNivel] : 0
            };
        }

        var cards = [
            montarCard('centroTreinamento', 'Centro de Treinamento', infra.centroTreinamento.nivel, 'Recuperacao +' + Math.round(($scope.calcularFatorRecuperacaoInfraestrutura ? ($scope.calcularFatorRecuperacaoInfraestrutura() - 1) : 0) * 100) + '%', infra.centroTreinamento.obraEmAndamento, infra.centroTreinamento.diasRestantes),
            montarCard('departamentoMedico', 'Departamento Medico', infra.departamentoMedico.nivel, 'Lesoes e recuperacao medica', infra.departamentoMedico.obraEmAndamento, infra.departamentoMedico.diasRestantes),
            montarCard('comercial', 'Comercial', infra.comercial.nivel, 'Receitas +' + Math.round(($scope.calcularMultiplicadorComercialInfraestrutura ? ($scope.calcularMultiplicadorComercialInfraestrutura() - 1) : 0) * 100) + '%', infra.comercial.obraEmAndamento, infra.comercial.diasRestantes),
            montarCard('estadio', 'Conforto do Estadio', infra.estadio.nivelConforto, 'Ocupacao e experiencia', infra.estadio.obraEmAndamento, infra.estadio.diasRestantes)
        ];
        return {
            cards: cards,
            obras: cards.filter(function(card) { return card.emObra; }),
            receitaComercialBonus: Math.round(($scope.calcularMultiplicadorComercialInfraestrutura ? ($scope.calcularMultiplicadorComercialInfraestrutura() - 1) : 0) * 100),
            recuperacaoBonus: Math.round(($scope.calcularFatorRecuperacaoInfraestrutura ? ($scope.calcularFatorRecuperacaoInfraestrutura() - 1) : 0) * 100),
            ultimoResumoDia: infra.ultimoResumoDia || 0
        };
    }

    $scope.criarInfraestruturaPadrao = function() {
        return criarInfraestruturaPadrao();
    };

    $scope.normalizarInfraestruturaClube = function(clube) {
        return normalizarInfraestruturaClubeInterno(clube || $scope.clubeAtual);
    };

    $scope.atualizarResumoInfraestrutura = function() {
        if ($scope.clubeAtual) normalizarInfraestruturaClubeInterno($scope.clubeAtual);
        $scope.infraestruturaResumo = criarResumoInfraestrutura($scope.clubeAtual);
        return $scope.infraestruturaResumo;
    };

    $scope.calcularFatorRecuperacaoInfraestrutura = function() {
        if (!$scope.clubeAtual) return 1;
        normalizarInfraestruturaClubeInterno($scope.clubeAtual);
        var nivel = $scope.clubeAtual.infraestrutura.centroTreinamento.nivel;
        if (nivel >= 3) return 1.1;
        if (nivel >= 2) return 1.05;
        return 1;
    };

    $scope.calcularMultiplicadorComercialInfraestrutura = function() {
        if (!$scope.clubeAtual) return 1;
        normalizarInfraestruturaClubeInterno($scope.clubeAtual);
        var nivel = $scope.clubeAtual.infraestrutura.comercial.nivel;
        if (nivel >= 3) return 1.15;
        if (nivel >= 2) return 1.08;
        return 1;
    };

    $scope.calcularMultiplicadorOcupacaoInfraestrutura = function() {
        if (!$scope.clubeAtual) return 1;
        normalizarInfraestruturaClubeInterno($scope.clubeAtual);
        var nivel = $scope.clubeAtual.infraestrutura.estadio.nivelConforto;
        if (nivel >= 3) return 1.08;
        if (nivel >= 2) return 1.04;
        return 1;
    };

    $scope.calcularBonusDesenvolvimentoInfraestrutura = function() {
        if (!$scope.clubeAtual) return 0;
        normalizarInfraestruturaClubeInterno($scope.clubeAtual);
        var nivel = $scope.clubeAtual.infraestrutura.centroTreinamento.nivel;
        if (nivel >= 3) return 4;
        if (nivel >= 2) return 2;
        return 0;
    };

    $scope.iniciarUpgradeInfraestrutura = function(area) {
        if (!$scope.clubeAtual) return null;
        normalizarInfraestruturaClubeInterno($scope.clubeAtual);
        var config = obterConfigUpgradeInfraestrutura(area);
        if (!config) return null;
        var dadosArea = $scope.clubeAtual.infraestrutura[area];
        var campoNivel = config.campoNivel;
        var nivelAtual = dadosArea[campoNivel] || 1;
        if (dadosArea.obraEmAndamento || nivelAtual >= 3) return null;
        var proximoNivel = nivelAtual + 1;
        var custo = config.custos[proximoNivel] || 0;
        if (($scope.clubeAtual.orcamento || 0) < custo) return null;

        $scope.clubeAtual.orcamento -= custo;
        dadosArea.obraEmAndamento = true;
        dadosArea.diasRestantes = config.duracoes[proximoNivel] || 3;
        dadosArea.nivelAlvo = proximoNivel;
        $scope.financasHistorico = Array.isArray($scope.financasHistorico) ? $scope.financasHistorico : [];
        $scope.financasHistorico.unshift({
            tipo: 'despesa',
            descricao: 'Obra de Infraestrutura: ' + config.nome + ' Nivel ' + proximoNivel,
            valor: custo,
            data: new Date().toLocaleDateString('pt-BR')
        });
        $scope.atualizarResumoInfraestrutura();
        if ($scope.salvarJogoSilencioso) $scope.salvarJogoSilencioso();
        return { area: area, proximoNivel: proximoNivel, custo: custo, diasRestantes: dadosArea.diasRestantes };
    };

    $scope.processarInfraestruturaDia = function() {
        if (!$scope.clubeAtual) return [];
        normalizarInfraestruturaClubeInterno($scope.clubeAtual);
        var concluidas = [];
        ['centroTreinamento', 'departamentoMedico', 'comercial', 'estadio'].forEach(function(area) {
            var config = obterConfigUpgradeInfraestrutura(area);
            var dadosArea = $scope.clubeAtual.infraestrutura[area];
            if (!config || !dadosArea || !dadosArea.obraEmAndamento) return;
            dadosArea.diasRestantes = Math.max(0, (dadosArea.diasRestantes || 0) - 1);
            if (dadosArea.diasRestantes <= 0) {
                var campoNivel = config.campoNivel;
                dadosArea[campoNivel] = limitarNumero(dadosArea.nivelAlvo || ((dadosArea[campoNivel] || 1) + 1), 1, 3);
                dadosArea.obraEmAndamento = false;
                dadosArea.diasRestantes = 0;
                delete dadosArea.nivelAlvo;
                if (area === 'departamentoMedico') $scope.clubeAtual.nivelMedico = dadosArea.nivel;
                concluidas.push({ area: area, nome: config.nome, nivel: dadosArea[campoNivel] });
                if (typeof $scope.adicionarMensagem === 'function') {
                    $scope.adicionarMensagem('Infraestrutura', config.nome + ' concluido', 'A obra foi concluida e chegou ao nivel ' + dadosArea[campoNivel] + '.', false, 'infraestrutura');
                }
                if ($scope.registrarEventoAmbiente) {
                    $scope.registrarEventoAmbiente({ id: 'amb_infra_' + area + '_' + ($scope.diaAtual || 0), chave: 'infra|' + area + '|' + ($scope.diaAtual || 0), dia: $scope.diaAtual || 0, tipo: 'diretoria', impacto: 1, titulo: 'Infraestrutura evoluiu', detalhe: config.nome + ' foi melhorado e animou o ambiente interno.' });
                }
                if ($scope.registrarEventoTorcida) {
                    $scope.registrarEventoTorcida({ id: 'fan_infra_' + area + '_' + ($scope.diaAtual || 0), chave: 'infra|torcida|' + area + '|' + ($scope.diaAtual || 0), dia: $scope.diaAtual || 0, origem: 'infraestrutura', impacto: 1, titulo: 'Obra agrada a torcida', detalhe: 'A conclusao de ' + config.nome + ' reforcou a percepcao de crescimento do clube.' });
                }
            }
        });
        $scope.atualizarResumoInfraestrutura();
        return concluidas;
    };

    function criarBasePadrao() {
        return {
            atletas: [],
            ultimoCicloDia: 0,
            ultimoGeracaoDia: 0,
            resumo: {
                total: 0,
                promessas: 0,
                melhorJovem: null
            }
        };
    }

    function classificarStatusBaseInterno(potencial) {
        potencial = parseInt(potencial, 10) || 60;
        if (potencial >= 84) return 'joia';
        if (potencial >= 74) return 'promissor';
        return 'comum';
    }

    function obterNomeAtletaBase(chave) {
        var nomes = ['Joao', 'Pedro', 'Lucas', 'Matheus', 'Gabriel', 'Rafael', 'Caio', 'Bruno', 'Felipe', 'Marcos'];
        var sobrenomes = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Lima', 'Almeida', 'Rocha', 'Barbosa'];
        return nomes[chave % nomes.length] + ' ' + sobrenomes[(chave * 3) % sobrenomes.length];
    }

    function normalizarAtletaBase(atleta, clubeId) {
        if (!atleta) return null;
        if (!atleta.id) atleta.id = 'base_' + (clubeId || 'clube') + '_' + obterChaveNumericaJogador(atleta);
        atleta.clubeId = clubeId;
        atleta.idade = limitarNumero(parseInt(atleta.idade, 10) || 17, 16, 20);
        atleta.categoriaBase = atleta.idade <= 17 ? 'Sub-17' : 'Sub-20';
        atleta.moral = normalizarValorAmbiente(atleta.moral, 70);
        if (!atleta.atributos) atleta.atributos = {};
        normalizarJogadorSalvo(atleta);
        atleta.potencial = limitarNumero(parseInt(atleta.potencial, 10) || calcularPotencialDeterministico(atleta), 50, 95);
        atleta.xpTemporada = parseInt(atleta.xpTemporada, 10) || 0;
        atleta.evolucaoTemporada = parseInt(atleta.evolucaoTemporada, 10) || 0;
        atleta.statusBase = classificarStatusBaseInterno(atleta.potencial);
        atleta.overallAtual = calcularOverallBaseJogador(atleta);
        atleta.emCampo = false;
        atleta.lesionado = !!atleta.lesionado;
        atleta.suspenso = !!atleta.suspenso;
        return atleta;
    }

    function criarResumoBase(clube) {
        if (!clube || !clube.base) {
            return { total: 0, promessas: 0, joias: 0, sub17: 0, sub20: 0, melhorJovem: null, atletasVisiveis: [] };
        }
        var atletas = Array.isArray(clube.base.atletas) ? clube.base.atletas : [];
        var visiveis = atletas.slice().sort(function(a, b) {
            if ((b.potencial || 0) !== (a.potencial || 0)) return (b.potencial || 0) - (a.potencial || 0);
            return (b.overallAtual || 0) - (a.overallAtual || 0);
        });
        var promessas = atletas.filter(function(a) { return a.statusBase === 'promissor' || a.statusBase === 'joia'; }).length;
        var joias = atletas.filter(function(a) { return a.statusBase === 'joia'; }).length;
        return {
            total: atletas.length,
            promessas: promessas,
            joias: joias,
            sub17: atletas.filter(function(a) { return a.categoriaBase === 'Sub-17'; }).length,
            sub20: atletas.filter(function(a) { return a.categoriaBase === 'Sub-20'; }).length,
            melhorJovem: visiveis[0] || null,
            atletasVisiveis: visiveis
        };
    }

    function normalizarBaseClubeInterno(clube) {
        if (!clube) return null;
        var base = clube.base || criarBasePadrao();
        base.atletas = Array.isArray(base.atletas) ? base.atletas.map(function(atleta) { return normalizarAtletaBase(atleta, clube.id); }).filter(Boolean).slice(0, 30) : [];
        base.ultimoCicloDia = (typeof base.ultimoCicloDia === 'number') ? base.ultimoCicloDia : 0;
        base.ultimoGeracaoDia = (typeof base.ultimoGeracaoDia === 'number') ? base.ultimoGeracaoDia : 0;
        clube.base = base;
        $scope.atualizarResumoBase(clube);
        return clube;
    }

    $scope.criarBasePadrao = function() {
        return criarBasePadrao();
    };

    $scope.classificarStatusBase = function(potencial) {
        return classificarStatusBaseInterno(potencial);
    };

    $scope.obterStatusPromocaoBase = function(atleta) {
        if (!atleta) return { elegivel: false, texto: 'Atleta indisponível' };
        var categoria = atleta.categoriaBase || (atleta.idade <= 17 ? 'Sub-17' : 'Sub-20');
        var overall = atleta.overallAtual || calcularOverallBaseJogador(atleta);
        var quantidadePosicao = ($scope.elencoAtual || []).filter(function(jogador) { return jogador.posicao === atleta.posicao; }).length;
        if (quantidadePosicao >= 5 && overall < 80) return { elegivel: false, texto: 'Elenco cheio nesta posição' };
        if (categoria === 'Sub-17' && atleta.idade < 17 && (atleta.potencial || 0) < 84) return { elegivel: false, texto: 'Desenvolver no Sub-17' };
        if (overall < 50 && (atleta.potencial || 0) < 78) return { elegivel: false, texto: 'Aguardando evolução' };
        return { elegivel: true, texto: categoria === 'Sub-17' ? 'Promoção acelerada' : 'Pronto para o profissional' };
    };

    $scope.obterResumoNecessidadesBase = function() {
        var posicoes = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
        var labels = { GOL: 'goleiro', ZAG: 'zaga', LAT: 'lateral', VOL: 'volante', MEI: 'meia', ATA: 'ataque' };
        var resumo = posicoes.map(function(posicao) {
            var quantidade = ($scope.elencoAtual || []).filter(function(jogador) { return jogador.posicao === posicao; }).length;
            return { posicao: posicao, label: labels[posicao], quantidade: quantidade, estado: quantidade < 2 ? 'carência' : (quantidade >= 5 ? 'saturada' : 'equilibrada') };
        });
        return { carencias: resumo.filter(function(item) { return item.estado === 'carência'; }), saturadas: resumo.filter(function(item) { return item.estado === 'saturada'; }), todas: resumo };
    };

    $scope.obterSugestoesPromocaoBase = function() {
        var necessidades = $scope.obterResumoNecessidadesBase().carencias;
        var atletas = ($scope.baseResumo && $scope.baseResumo.atletasVisiveis) || [];
        var orientacao = $scope.obterOrientacaoCategoriasBase();
        return necessidades.map(function(necessidade) {
            var candidatos = atletas.filter(function(atleta) {
                return atleta.posicao === necessidade.posicao && $scope.obterStatusPromocaoBase(atleta).elegivel;
            }).sort(function(a, b) {
                return ((b.overallAtual || 0) + (b.potencial || 0) * 0.2) - ((a.overallAtual || 0) + (a.potencial || 0) * 0.2);
            });
            return { posicao: necessidade.posicao, label: necessidade.label, atleta: candidatos[0] || null, orientacao: orientacao.classe === 'emprestar' ? 'Priorizar minutos por empréstimo' : (orientacao.classe === 'proteger' ? 'Promover apenas se houver necessidade' : 'Boa oportunidade de integração') };
        }).filter(function(item) { return !!item.atleta; });
    };

    $scope.promoverSugestaoBase = function(sugestao) {
        if (!sugestao || !sugestao.atleta) return null;
        var status = $scope.obterStatusPromocaoBase(sugestao.atleta);
        if (!status.elegivel) return null;
        return $scope.promoverAtletaBase(sugestao.atleta.id);
    };

    $scope.obterRelatorioAdaptacaoJovens = function() {
        return ($scope.elencoAtual || []).filter(function(jogador) { return !!jogador.categoriaOrigem; }).map(function(jogador) {
            var minutos = jogador.minutosTemporada || 0;
            var recomendacao = minutos < 450 ? 'Receber mais minutos' : (minutos >= 1200 ? 'Permanecer no elenco' : 'Monitorar adaptação');
            if (minutos < 180 && (jogador.moral || 0) < 60) recomendacao = 'Considerar empréstimo';
            return { jogador: jogador, minutos: minutos, jogos: jogador.jogosTemporada || 0, xp: jogador.xpTemporada || 0, evolucao: jogador.evolucaoTemporada || 0, moral: jogador.moral || 0, recomendacao: recomendacao };
        });
    };

    $scope.normalizarBaseClube = function(clube) {
        return normalizarBaseClubeInterno(clube || $scope.clubeAtual);
    };

    $scope.atualizarResumoBase = function(clube) {
        var alvo = clube || $scope.clubeAtual;
        if (!alvo) {
            $scope.baseResumo = criarResumoBase(null);
            return $scope.baseResumo;
        }
        if (!alvo.base) alvo.base = criarBasePadrao();
        alvo.base.resumo = criarResumoBase(alvo);
        if (alvo === $scope.clubeAtual) $scope.baseResumo = alvo.base.resumo;
        return alvo.base.resumo;
    };

    $scope.gerarAtletaBase = function(origem, indice) {
        var clubeId = $scope.clubeAtual && $scope.clubeAtual.id !== undefined ? $scope.clubeAtual.id : 'clube';
        var dia = typeof $scope.diaAtual === 'number' ? $scope.diaAtual : 0;
        var seq = indice || 0;
        var chave = (dia + 1) * 37 + seq * 19 + String(clubeId).length * 11;
        var posicoes = ['GOL', 'LAT', 'ZAG', 'VOL', 'MEI', 'ATA'];
        var posicao = posicoes[chave % posicoes.length];
        var idade = 16 + (chave % 4);
        var overallBase = 45 + (chave % 18);
        var potencial = 60 + ((chave * 7) % 31);
        if ((chave % 11) === 0) potencial = Math.min(90, potencial + 6);
        var atleta = {
            id: 'base_' + clubeId + '_' + dia + '_' + seq + '_' + (origem || 'geracao'),
            nome: obterNomeAtletaBase(chave),
            idade: idade,
            posicao: posicao,
            clubeId: clubeId,
            moral: 70,
            potencial: potencial,
            xpTemporada: 0,
            evolucaoTemporada: 0,
            atributos: {
                finalizacao: overallBase,
                passe: Math.max(30, overallBase - 2 + (chave % 5)),
                marcacao: Math.max(25, overallBase - 8 + (chave % 7)),
                velocidade: Math.min(75, overallBase + 4 + (chave % 6)),
                fisico: Math.max(35, overallBase - 3 + (chave % 5)),
                reflexo: posicao === 'GOL' ? overallBase + 5 : 30,
                posicionamento: posicao === 'GOL' ? overallBase : 35,
                distribuicao: posicao === 'GOL' ? overallBase - 2 : 40,
                penalti: overallBase,
                escanteio: overallBase - 2,
                cobrador: overallBase - 1
            }
        };
        return normalizarAtletaBase(atleta, clubeId);
    };

    $scope.gerarAtletasBase = function(quantidade, origem) {
        if (!$scope.clubeAtual) return [];
        normalizarBaseClubeInterno($scope.clubeAtual);
        var novos = [];
        for (var i = 0; i < quantidade; i++) {
            var atleta = $scope.gerarAtletaBase(origem || 'ciclo', ($scope.clubeAtual.base.atletas.length + i));
            if (!$scope.clubeAtual.base.atletas.some(function(a) { return a.id === atleta.id; })) {
                $scope.clubeAtual.base.atletas.push(atleta);
                novos.push(atleta);
            }
        }
        $scope.clubeAtual.base.atletas = $scope.clubeAtual.base.atletas.slice(0, 30);
        $scope.clubeAtual.base.ultimoGeracaoDia = $scope.diaAtual || 0;
        $scope.atualizarResumoBase();
        return novos;
    };

    $scope.processarBaseDia = function() {
        if (!$scope.clubeAtual) return [];
        normalizarBaseClubeInterno($scope.clubeAtual);
        var dia = $scope.diaAtual || 0;
        var novos = [];
        if (dia > 0 && dia - ($scope.clubeAtual.base.ultimoGeracaoDia || 0) >= 45 && $scope.clubeAtual.base.atletas.length < 24) {
            novos = $scope.gerarAtletasBase(1 + (dia % 3), 'ciclo');
        }
        if (dia > 0 && dia - ($scope.clubeAtual.base.ultimoCicloDia || 0) >= 30) {
            var bonusCT = $scope.calcularBonusDesenvolvimentoInfraestrutura ? $scope.calcularBonusDesenvolvimentoInfraestrutura() : 0;
            $scope.clubeAtual.base.atletas.forEach(function(atleta) {
                var overallAntes = calcularOverallBaseJogador(atleta);
                var categoria = atleta.categoriaBase || (atleta.idade <= 17 ? 'Sub-17' : 'Sub-20');
                var ganho = categoria === 'Sub-17' ? 1 : (dia % 2);
                if (categoria === 'Sub-20' && atleta.moral >= 75) ganho += 1;
                if (bonusCT >= 4 && atleta.potencial - overallAntes > 5) ganho += 1;
                if (ganho > 0 && overallAntes < atleta.potencial) {
                    var atributos = obterAtributosDesenvolvimentoPorFoco(atleta);
                    var atributo = atributos[obterChaveNumericaJogador(atleta) % atributos.length];
                    atleta.atributos[atributo] = Math.min(99, atleta.atributos[atributo] + ganho);
                    atleta.xpTemporada = (atleta.xpTemporada || 0) + (categoria === 'Sub-20' ? ganho * 2 : ganho);
                    if (calcularOverallBaseJogador(atleta) > atleta.potencial) atleta.atributos[atributo] -= ganho;
                    else atleta.evolucaoTemporada = (atleta.evolucaoTemporada || 0) + (calcularOverallBaseJogador(atleta) - overallAntes);
                }
                normalizarAtletaBase(atleta, $scope.clubeAtual.id);
            });
            $scope.clubeAtual.base.ultimoCicloDia = dia;
        }
        $scope.atualizarResumoBase();
        return novos;
    };

    $scope.promoverAtletaBase = function(atletaId) {
        if (!$scope.clubeAtual) return null;
        normalizarBaseClubeInterno($scope.clubeAtual);
        var idx = $scope.clubeAtual.base.atletas.findIndex(function(a) { return String(a.id) === String(atletaId); });
        if (idx < 0) return null;
        var atleta = normalizarAtletaBase($scope.clubeAtual.base.atletas[idx], $scope.clubeAtual.id);
        var promovido = angular.copy(atleta);
        promovido.categoriaOrigem = atleta.categoriaBase || (atleta.idade <= 17 ? 'Sub-17' : 'Sub-20');
        promovido.promovidoEm = $scope.dados.anoAtual || 2024;
        promovido.emCampo = false;
        promovido.condicaoFisica = 100;
        promovido.cartoesAmarelos = 0;
        promovido.lesionado = false;
        promovido.diasLesao = 0;
        promovido.suspenso = false;
        promovido.substituidoNaPartida = false;
        promovido.salario = promovido.salario || 5000;
        promovido.anosContrato = Math.max(3, parseInt(promovido.anosContrato, 10) || 3);
        normalizarJogadorSalvo(promovido);
        $scope.clubeAtual.base.atletas.splice(idx, 1);
        if (!$scope.elencoAtual.some(function(j) { return String(j.id) === String(promovido.id); })) $scope.elencoAtual.push(promovido);
        if (!$scope.jogadores.some(function(j) { return String(j.id) === String(promovido.id); })) $scope.jogadores.push(angular.copy(promovido));
        $scope.atualizarResumoBase();
        if (promovido.statusBase === 'joia' && $scope.registrarEventoTorcida) {
            $scope.registrarEventoTorcida({ id: 'fan_base_' + promovido.id, chave: 'base|promocao|' + promovido.id, dia: $scope.diaAtual || 0, origem: 'base', impacto: 2, titulo: 'Joia promovida', detalhe: promovido.nome + ' subiu da base e animou a torcida.' });
        }
        if (typeof $scope.adicionarMensagem === 'function') {
            var promocaoAcelerada = promovido.categoriaOrigem === 'Sub-17';
            var assuntoPromocao = promocaoAcelerada ? 'Promoção acelerada ao profissional' : 'Integração planejada ao profissional';
            var textoPromocao = promocaoAcelerada ? promovido.nome + ' foi promovido antes do ciclo ideal do Sub-17. A comissão deve controlar seus minutos e adaptação.' : promovido.nome + ' concluiu o ciclo Sub-20 e foi integrado ao elenco principal.';
            $scope.adicionarMensagem('Categorias de Base', assuntoPromocao, textoPromocao, false, 'base');
        }
        if ($scope.salvarJogoSilencioso) $scope.salvarJogoSilencioso();
        return promovido;
    };

    $scope.dispensarAtletaBase = function(atletaId) {
        if (!$scope.clubeAtual) return;
        normalizarBaseClubeInterno($scope.clubeAtual);
        $scope.clubeAtual.base.atletas = $scope.clubeAtual.base.atletas.filter(function(a) { return String(a.id) !== String(atletaId); });
        $scope.atualizarResumoBase();
        if ($scope.salvarJogoSilencioso) $scope.salvarJogoSilencioso();
    };

    // FASE 11 / 13: INICIALIZAR VARIÁVEIS EXTRAS (Retrocompatibilidade)
    $scope.verificarVariaveisExtras = function() {
        if ($scope.elencoAtual) {
            $scope.elencoAtual.forEach(function(jogador) {
                normalizarJogadorSalvo(jogador);
            });
        }
        normalizarListaJogadoresSalvos($scope.jogadores);
        if ($scope.clubeAtual && $scope.clubeAtual.estadio) {
            if ($scope.clubeAtual.estadio.obraEmAndamento === undefined) {
                $scope.clubeAtual.estadio.obraEmAndamento = false;
                $scope.clubeAtual.estadio.rodadasRestantesObra = 0;
                $scope.clubeAtual.estadio.capacidadeOriginal = $scope.clubeAtual.estadio.capacidade;
            }
            if ($scope.clubeAtual.olheiros === undefined) {
                $scope.clubeAtual.olheiros = []; // FASE 14
            }
            normalizarScoutingClube($scope.clubeAtual);
            normalizarInfraestruturaClubeInterno($scope.clubeAtual);
            normalizarBaseClubeInterno($scope.clubeAtual);
        }
        if ($scope.caixaEntrada === undefined) {
            $scope.caixaEntrada = [];
        }
        if ($scope.noticiasFeed === undefined) {
            $scope.noticiasFeed = [];
        }
        if ($scope.configFinanceira === undefined) {
            $scope.configFinanceira = { precoIngresso: 80, marketingAtivo: 0 };
        }
        if (!Array.isArray($scope.transferenciasHistorico)) {
            $scope.transferenciasHistorico = [];
        }
        if (!Array.isArray($scope.propostasPendentes)) {
            $scope.propostasPendentes = [];
        }
        if (!Array.isArray($scope.relatorioEvolucao)) {
            $scope.relatorioEvolucao = [];
        }
        if (!Array.isArray($scope.relatorioEvolucaoVisivel)) {
            $scope.relatorioEvolucaoVisivel = [];
        }
        if ($scope.ultimoDiaEvolucao === undefined) {
            $scope.ultimoDiaEvolucao = 0;
        }
        if ($scope.atualizarRelatorioEvolucaoVisivel) {
            $scope.atualizarRelatorioEvolucaoVisivel();
        }
        $scope.atualizarAmbienteElencoResumo();
        $scope.atualizarStatusHumorElenco();
        if (!$scope.mercadoUI) {
            $scope.mercadoUI = { aba: 'busca' };
        }
        $scope.diretoriaStatus = normalizarDiretoriaStatusInterno($scope.diretoriaStatus);
        if ($scope.atualizarDiretoriaStatus) $scope.atualizarDiretoriaStatus();
        if ($scope.atualizarResumoInfraestrutura) $scope.atualizarResumoInfraestrutura();
        if ($scope.atualizarResumoContextoExterno) $scope.atualizarResumoContextoExterno();
        if ($scope.atualizarResumoBase) $scope.atualizarResumoBase();
        if ($scope.atualizarResumoContratos) $scope.atualizarResumoContratos();
        atualizarFlagsShortlistRelatorios();
    };

    $scope.iniciarCampanhaMarketing = function() {
        if ($scope.clubeAtual.orcamento >= 1500000) {
            $scope.clubeAtual.orcamento -= 1500000;
            $scope.configFinanceira.marketingAtivo += 30; // 30 dias de marketing ativo
            $scope.financasHistorico.unshift({
                tipo: 'despesa',
                descricao: 'Investimento em Campanha de Marketing',
                valor: 1500000,
                data: new Date().toLocaleDateString('pt-BR')
            });
            alert('Campanha de Marketing ativada com sucesso! Vendas de camisa aumentarão nos próximos meses.');
        } else {
            alert('Você não tem fundos suficientes (R$ 1.500.000) para esta campanha.');
        }
    };

    // HELPER: Busca a cor primária de um time pelo ID, sempre da fonte atualizada
    $scope.corDoTime = function(time, indice) {
        if (!time) return '#1e3c72';
        var idx = indice || 0;
        // Busca primeiro na lista global de clubes (dados mais atuais)
        if ($scope.clubes) {
            var clubeDb = $scope.clubes.find(function(c) { return c.id === time.id; });
            if (clubeDb && clubeDb.cores && clubeDb.cores[idx]) {
                return clubeDb.cores[idx];
            }
        }
        // Fallback: usa o que vier no próprio objeto
        if (time.cores && time.cores[idx]) return time.cores[idx];
        return '#1e3c72';
    };

    // Função global de E-mails / Notícias (FASE 17)
    $scope.adicionarMensagem = function(remetente, titulo, conteudo, lida, tipo) {
        if (!$scope.caixaEntrada) $scope.caixaEntrada = [];
        if (!$scope.noticiasFeed) $scope.noticiasFeed = [];
        
        var dataAtual = $scope.calendarioGeral && $scope.calendarioGeral[$scope.diaAtual] 
                        ? $scope.calendarioGeral[$scope.diaAtual].titulo 
                        : new Date().toLocaleDateString('pt-BR');
                        
        var msgObj = {
            id: Date.now() + Math.random(),
            remetente: remetente,
            titulo: titulo,
            conteudo: conteudo,
            dataStr: dataAtual,
            lida: lida || false,
            tipo: tipo || 'geral'
        };
        
        if (tipo === 'imprensa' || tipo === 'torcida' || tipo === 'transferencia' || tipo === 'trofeu') {
            msgObj.lida = true; // Notícias não apitam notificação
            $scope.noticiasFeed.unshift(msgObj);
            $scope.noticiasFeed = $scope.noticiasFeed.slice(0, 30);
        } else {
            $scope.caixaEntrada.unshift(msgObj);
        }
    };

    // Camada narrativa do mundo: acontecimentos são gerados a partir do estado
    // real da carreira e entram no mesmo feed das mensagens, evitando notícias
    // desconectadas do que aconteceu em campo.
    function obterPosicaoTabelaNarrativa(clube) {
        if (!clube || !$scope.tabelas || !$scope.tabelas[clube.divisao]) return null;
        var lista = $scope.tabelas[clube.divisao];
        var item = lista.find(function(linha) { return linha.clube && linha.clube.id === clube.id; });
        return item ? lista.indexOf(item) + 1 : null;
    }

    $scope.obterNarrativaPreJogo = function(partida) {
        if (!partida) return { manchete: '', falas: [] };
        var adversario = partida.mandante && partida.mandante.id === ($scope.clubeAtual && $scope.clubeAtual.id) ? partida.visitante : partida.mandante;
        var posicao = obterPosicaoTabelaNarrativa($scope.clubeAtual);
        var posicaoRival = obterPosicaoTabelaNarrativa(adversario);
        var falas = [];
        var rivalidade = $scope.obterRivalidadeNarrativa ? $scope.obterRivalidadeNarrativa($scope.clubeAtual, adversario) : null;
        if (posicao && posicao <= 4) falas.push({ autor: 'Imprensa', texto: 'A campanha coloca o ' + $scope.clubeAtual.nome + ' entre os candidatos a uma temporada especial.' });
        else if (posicao && posicao >= 17) falas.push({ autor: 'Imprensa', texto: 'A pressão aumentou: o ' + $scope.clubeAtual.nome + ' precisa reagir na tabela.' });
        if (adversario && posicaoRival && posicao && Math.abs(posicaoRival - posicao) <= 3) {
            falas.push({ autor: 'Treinador adversário', texto: 'Será um confronto direto e não vamos aceitar que o rival controle o ritmo.' });
        } else if (adversario) {
            falas.push({ autor: 'Comissão técnica', texto: 'Respeitamos o ' + adversario.nome + ', mas temos condições de competir.' });
        }
        return {
            manchete: rivalidade && rivalidade.titulo ? rivalidade.titulo : (adversario ? 'Clima esquenta antes de ' + $scope.clubeAtual.nome + ' x ' + adversario.nome : 'Expectativa para o próximo compromisso'),
            falas: falas,
            confrontoDireto: !!(posicao && posicaoRival && Math.abs(posicaoRival - posicao) <= 3),
            rivalidade: rivalidade
        };
    };

    $scope.obterRivalidadeNarrativa = function(clube, adversario) {
        if (!clube || !adversario) return null;
        var jogos = ($scope.historicoPartidas || []).filter(function(partida) {
            return partida && ((partida.mandante && partida.mandante.id === clube.id && partida.visitante && partida.visitante.id === adversario.id) || (partida.mandante && partida.mandante.id === adversario.id && partida.visitante && partida.visitante.id === clube.id));
        });
        if (!jogos.length) return null;
        var ultimos = jogos.slice(0, 5);
        var vitoriasClube = ultimos.filter(function(partida) {
            var mandanteClube = partida.mandante && partida.mandante.id === clube.id;
            var golsClube = mandanteClube ? partida.golsMandante : partida.golsVisitante;
            var golsRival = mandanteClube ? partida.golsVisitante : partida.golsMandante;
            return golsClube > golsRival;
        }).length;
        var derrotasClube = ultimos.filter(function(partida) {
            var mandanteClube = partida.mandante && partida.mandante.id === clube.id;
            var golsClube = mandanteClube ? partida.golsMandante : partida.golsVisitante;
            var golsRival = mandanteClube ? partida.golsVisitante : partida.golsMandante;
            return golsClube < golsRival;
        }).length;
        if (derrotasClube >= 3) return { tipo: 'revanche', titulo: 'Jogo da revanche contra ' + adversario.nome, detalhe: 'O adversário venceu ' + derrotasClube + ' dos últimos ' + ultimos.length + ' encontros.' };
        if (vitoriasClube >= 3) return { tipo: 'hegemonia', titulo: 'Duelo pela hegemonia contra ' + adversario.nome, detalhe: 'O ' + clube.nome + ' venceu ' + vitoriasClube + ' dos últimos ' + ultimos.length + ' confrontos.' };
        return { tipo: 'historico', titulo: 'Confronto de histórico equilibrado', detalhe: 'Os últimos encontros entre os clubes foram marcados pelo equilíbrio.' };
    };

    $scope.iniciarEntrevistaJogador = function() {
        var candidatos = ($scope.elencoAtual || []).filter(function(jogador) { return !jogador.lesionado && !jogador.suspenso; });
        if (!candidatos.length) return null;
        var jogador = candidatos[(Number($scope.diaAtual) || 0) % candidatos.length];
        $scope.entrevistaJogador = {
            jogador: jogador,
            pergunta: jogador.rodadasNoBanco > 2 ? jogador.nome + ' pediu uma conversa para falar sobre seus minutos.' : jogador.nome + ' quer saber se terá oportunidade na próxima partida.',
            opcoes: [
                { texto: 'Prometer uma oportunidade', efeito: 'oportunidade' },
                { texto: 'Explicar que todos terão de competir', efeito: 'competicao' },
                { texto: 'Pedir paciência e foco nos treinos', efeito: 'paciencia' }
            ]
        };
        return $scope.entrevistaJogador;
    };

    $scope.responderEntrevistaJogador = function(opcao) {
        if (!$scope.entrevistaJogador || !opcao) return false;
        var jogador = $scope.entrevistaJogador.jogador;
        jogador.moral = Math.max(0, Math.min(100, (Number(jogador.moral) || 70) + (opcao.efeito === 'oportunidade' ? 4 : (opcao.efeito === 'competicao' ? 1 : -1))));
        jogador.satisfacaoContrato = Math.max(0, Math.min(100, (Number(jogador.satisfacaoContrato) || 70) + (opcao.efeito === 'oportunidade' ? 2 : 0)));
        if (opcao.efeito === 'oportunidade') jogador.promessaMinutosDia = $scope.diaAtual || 0;
        $scope.registrarEventoAmbiente({ id: 'entrevista_' + ($scope.diaAtual || 0) + '_' + jogador.id, chave: 'entrevista|' + ($scope.diaAtual || 0) + '|' + jogador.id, tipo: 'vestiario', impacto: opcao.efeito === 'paciencia' ? -1 : 1, titulo: 'Conversa com ' + jogador.nome, detalhe: 'A comissão técnica conversou sobre espaço e expectativas para a sequência.' });
        $scope.adicionarMensagem('Comissão Técnica', 'Conversa com jogador', jogador.nome + ' recebeu uma resposta sobre suas oportunidades no elenco.', true, 'ambiente');
        $scope.entrevistaJogador = null;
        return true;
    };

    $scope.processarPromessasEAgentes = function() {
        var dia = Number($scope.diaAtual) || 0;
        if (dia === 0 || dia % 7 !== 0) return [];
        var eventos = [];
        ($scope.elencoAtual || []).forEach(function(jogador) {
            if (jogador.promessaMinutosDia !== undefined && dia - jogador.promessaMinutosDia >= 14 && (jogador.minutosTemporada || 0) < 90) {
                jogador.satisfacaoContrato = Math.max(0, (Number(jogador.satisfacaoContrato) || 70) - 6);
                jogador.moral = Math.max(0, (Number(jogador.moral) || 70) - 4);
                delete jogador.promessaMinutosDia;
                eventos.push({ tipo: 'promessa', jogador: jogador });
            } else if ((jogador.anosContrato || 2) <= 1 && dia % 14 === 0) {
                jogador.satisfacaoContrato = Math.max(0, (Number(jogador.satisfacaoContrato) || 70) - 2);
                eventos.push({ tipo: 'agente', jogador: jogador });
            }
        });
        eventos.forEach(function(evento) {
            if (evento.tipo === 'promessa') {
                $scope.adicionarMensagem('Empresário de ' + evento.jogador.nome, 'Promessa de minutos não cumprida', 'O representante afirma que ' + evento.jogador.nome + ' esperava mais oportunidades e avaliará os próximos jogos antes de discutir o futuro.', false, 'ambiente');
            } else {
                $scope.adicionarMensagem('Empresário de ' + evento.jogador.nome, 'Situação contratual em análise', 'O representante de ' + evento.jogador.nome + ' pediu uma definição sobre a renovação e admite ouvir outros clubes.', false, 'transferencia');
            }
        });
        return eventos;
    };

    $scope.gerarNoticiarioDia = function(diaObj, partida) {
        if (!diaObj) return [];
        var chave = 'mundo_' + ($scope.diaAtual || 0) + '_' + (diaObj.titulo || diaObj.tipo);
        var noticias = [];
        var rivais = ($scope.clubes || []).filter(function(clube) { return !$scope.clubeAtual || clube.id !== $scope.clubeAtual.id; });
        if (partida && partida.golsMandante !== undefined) {
            var adversario = partida.mandante && partida.mandante.id === ($scope.clubeAtual && $scope.clubeAtual.id) ? partida.visitante : partida.mandante;
            var meuMandante = partida.mandante && partida.mandante.id === ($scope.clubeAtual && $scope.clubeAtual.id);
            var golsMeu = meuMandante ? partida.golsMandante : partida.golsVisitante;
            var golsAdversario = meuMandante ? partida.golsVisitante : partida.golsMandante;
            var venceu = golsMeu > golsAdversario;
            var empatou = golsMeu === golsAdversario;
            noticias.push({ titulo: venceu ? 'Vitória muda o ambiente' : (empatou ? 'Empate mantém a disputa aberta' : 'Derrota aumenta a cobrança'), detalhe: $scope.clubeAtual.nome + ' ' + golsMeu + ' x ' + golsAdversario + ' ' + (adversario ? adversario.nome : '') + '. ' + (venceu ? 'A torcida ganhou confiança.' : 'A imprensa espera uma resposta no próximo jogo.'), tipo: venceu ? 'torcida' : 'imprensa' });
        }
        if (rivais.length && (($scope.diaAtual || 0) % 3 === 0)) {
            var rival = rivais[($scope.diaAtual || 0) % rivais.length];
            noticias.push({ titulo: 'Movimentação no mercado', detalhe: rival.nome + ' monitora reforços para a sequência da temporada e movimenta os bastidores.', tipo: 'transferencia' });
        }
        noticias.forEach(function(noticia, indice) {
            $scope.adicionarMensagem(noticia.tipo === 'torcida' ? 'Torcida' : noticia.tipo === 'transferencia' ? 'Mercado da Bola' : 'Imprensa', noticia.titulo, noticia.detalhe, true, noticia.tipo);
        });
        return noticias;
    };

    $scope.gerarRumoresMercadoDia = function() {
        var dia = Number($scope.diaAtual) || 0;
        if (dia === 0 || dia % 4 !== 0 || !$scope.jogadores || !$scope.clubes || !$scope.clubes.length) return [];
        var clubesAtivos = $scope.clubes.filter(function(clube) { return !$scope.clubeAtual || clube.id !== $scope.clubeAtual.id; });
        var jogadoresDisponiveis = $scope.jogadores.filter(function(jogador) {
            return jogador && jogador.nome && jogador.clubeId && jogador.clubeId !== ($scope.clubeAtual && $scope.clubeAtual.id) && !jogador.emNegociacao;
        });
        if (!clubesAtivos.length || !jogadoresDisponiveis.length) return [];
        var clubeDestino = clubesAtivos[dia % clubesAtivos.length];
        var jogador = jogadoresDisponiveis[dia % jogadoresDisponiveis.length];
        var confianca = dia % 3 === 0 ? 'alta' : (dia % 2 === 0 ? 'média' : 'baixa');
        var id = 'rumor_' + dia + '_' + clubeDestino.id + '_' + jogador.id;
        if (($scope.noticiasFeed || []).some(function(item) { return item.id === id; })) return [];
        var noticia = {
            id: id,
            remetente: 'Mercado da Bola',
            titulo: 'Especulação: ' + clubeDestino.nome + ' acompanha ' + jogador.nome,
            conteudo: 'O ' + clubeDestino.nome + ' avalia uma investida por ' + jogador.nome + '. Confiabilidade do rumor: ' + confianca + '. Nada foi confirmado pelos clubes.',
            dataStr: $scope.calendarioGeral && $scope.calendarioGeral[dia] ? $scope.calendarioGeral[dia].titulo : 'Dia ' + dia,
            lida: true,
            tipo: 'transferencia',
            subtipo: 'rumor',
            confianca: confianca,
            diaCriacao: dia,
            jogadorId: jogador.id,
            clubeDestinoId: clubeDestino.id
        };
        $scope.noticiasFeed = $scope.noticiasFeed || [];
        $scope.noticiasFeed.unshift(noticia);
        $scope.noticiasFeed = $scope.noticiasFeed.slice(0, 30);
        return [noticia];
    };

    $scope.processarRumoresMercadoDia = function() {
        var dia = Number($scope.diaAtual) || 0;
        var janelaAberta = !$scope.janelaTransferencias || $scope.janelaTransferencias.aberta !== false;
        if (!janelaAberta || !$scope.noticiasFeed) return [];
        var confirmados = [];
        $scope.noticiasFeed.forEach(function(rumor) {
            if (rumor.subtipo !== 'rumor' || rumor.confirmado || dia - (rumor.diaCriacao || dia) < 4) return;
            var chance = rumor.confianca === 'alta' ? 0.55 : (rumor.confianca === 'média' ? 0.3 : 0.12);
            if (Math.random() > chance) return;
            var jogador = ($scope.jogadores || []).find(function(item) { return item.id === rumor.jogadorId; });
            var destino = ($scope.clubes || []).find(function(item) { return item.id === rumor.clubeDestinoId; });
            if (!jogador || !destino || jogador.clubeId === destino.id) return;
            var clubeOrigemId = jogador.clubeId;
            rumor.confirmado = true;
            rumor.subtipo = 'confirmado';
            jogador.clubeId = destino.id;
            jogador.emNegociacao = false;
            var valorTransferencia = $scope.calcularValorMercadoJogadorInterno ? $scope.calcularValorMercadoJogadorInterno(jogador) : Math.max(250000, (Number(jogador.overall) || 70) * 50000);
            destino.orcamento = Math.max(0, (Number(destino.orcamento) || 0) - valorTransferencia);
            rumor.valorTransferencia = valorTransferencia;
            rumor.titulo = 'Confirmado: ' + jogador.nome + ' acerta com ' + destino.nome;
            rumor.conteudo = 'A negociação foi concluída. ' + jogador.nome + ' deixa o ' + (($scope.clubes || []).find(function(item) { return item.id === jogador.clubeId; }) || {}).nome + ' e passa a defender o ' + destino.nome + '.';
            confirmados.push(rumor);
            if (!$scope.transferenciasHistorico) $scope.transferenciasHistorico = [];
            $scope.transferenciasHistorico.unshift({ tipo: 'cpu', jogadorId: jogador.id, jogadorNome: jogador.nome, clubeOrigemId: clubeOrigemId, clubeDestinoId: destino.id, clubeDestinoNome: destino.nome, valor: valorTransferencia, dia: dia, confirmadoPor: 'rumor' });
            $scope.transferenciasHistorico = $scope.transferenciasHistorico.slice(0, 100);
        });
        return confirmados;
    };

    $scope.processarMudancaTreinadorCpu = function() {
        var dia = Number($scope.diaAtual) || 0;
        if (dia === 0 || dia % 20 !== 0 || !$scope.clubes) return false;
        var candidatos = $scope.clubes.filter(function(clube) { return !$scope.clubeAtual || clube.id !== $scope.clubeAtual.id; });
        if (!candidatos.length) return false;
        var clube = candidatos[dia % candidatos.length];
        clube.treinadorNome = ['Rafael Monteiro', 'Eduardo Nascimento', 'Marcelo Valença', 'João Pires'][dia % 4];
        clube.treinadorReputacao = Math.max(1, Math.min(5, Math.round((Number(clube.reputacao) || 50) / 20)));
        $scope.adicionarMensagem('Mercado do Futebol', 'Troca de treinador', clube.nome + ' anunciou ' + clube.treinadorNome + ' como novo treinador para reagir na temporada.', true, 'transferencia');
        return true;
    };

    $scope.mundoFutebolFiltro = 'todos';
    $scope.filtrarNoticiaMundo = function(item) {
        var filtro = $scope.mundoFutebolFiltro || 'todos';
        if (filtro === 'todos') return true;
        if (filtro === 'rumores') return item.subtipo === 'rumor';
        if (filtro === 'transferencias') return item.tipo === 'transferencia';
        if (filtro === 'imprensa') return item.tipo === 'imprensa' || item.tipo === 'torcida';
        return true;
    };

    $scope.obterMovimentacoesMundo = function() {
        return ($scope.transferenciasHistorico || []).filter(function(item) { return item.tipo === 'cpu'; }).slice(0, 20);
    };

    $scope.processarDinamicaClubesCpu = function() {
        var dia = Number($scope.diaAtual) || 0;
        if (dia === 0 || dia % 7 !== 0) return [];
        var eventos = [];
        var clubesCpu = ($scope.clubes || []).filter(function(clube) { return !$scope.clubeAtual || clube.id !== $scope.clubeAtual.id; });
        clubesCpu.forEach(function(clube, indice) {
            if (indice % 5 !== dia % 5) return;
            var elencoClube = ($scope.jogadores || []).filter(function(jogador) { return jogador.clubeId === clube.id; });
            if (!elencoClube.length) return;
            var jogador = elencoClube[(dia + indice) % elencoClube.length];
            if ((jogador.anosContrato || 2) <= 1) {
                jogador.anosContrato = 2;
                jogador.salario = Math.round((Number(jogador.salario) || 10000) * 1.08 / 100) * 100;
                eventos.push({ tipo: 'renovacao', clube: clube, jogador: jogador });
            } else if ((Number(clube.orcamento) || 0) < 1000000) {
                eventos.push({ tipo: 'crise', clube: clube });
            }
        });
        eventos.forEach(function(evento) {
            if (evento.tipo === 'renovacao') {
                $scope.adicionarMensagem('Mercado do Futebol', 'Renovação importante', evento.clube.nome + ' renovou com ' + evento.jogador.nome + ' e afastou o interesse de outros clubes.', true, 'transferencia');
            } else {
                $scope.adicionarMensagem('Mercado do Futebol', 'Crise financeira', evento.clube.nome + ' enfrenta dificuldades financeiras e deverá reduzir investimentos no elenco.', true, 'imprensa');
            }
        });
        return eventos;
    };

    $scope.gerarNarrativaCompeticaoDia = function() {
        var dia = Number($scope.diaAtual) || 0;
        if (dia === 0 || dia % 5 !== 0 || !$scope.tabelas) return [];
        var eventos = [];
        ['A', 'B', 'C', 'D'].forEach(function(divisao) {
            var tabela = $scope.tabelas[divisao] || [];
            if (!tabela.length) return;
            var lider = tabela[0] && tabela[0].clube;
            var lanterna = tabela[tabela.length - 1] && tabela[tabela.length - 1].clube;
            if (lider) eventos.push({ titulo: 'Briga pelo topo da Série ' + divisao, detalhe: lider.nome + ' assumiu protagonismo na competição e começa a ser tratado como candidato ao título.', tipo: 'imprensa' });
            if (lanterna) eventos.push({ titulo: 'Alerta na parte de baixo da tabela', detalhe: lanterna.nome + ' precisa reagir para não terminar a rodada em situação delicada na Série ' + divisao + '.', tipo: 'torcida' });
        });
        eventos.slice(0, 2).forEach(function(evento, indice) {
            $scope.adicionarMensagem(indice === 0 ? 'Imprensa' : 'Torcida', evento.titulo, evento.detalhe, true, evento.tipo);
        });
        return eventos;
    };

    $scope.aplicarPressaoNarrativaCompeticao = function() {
        var clube = $scope.clubeAtual;
        var posicao = obterPosicaoTabelaNarrativa(clube);
        if (!clube || !posicao) return null;
        var dia = Number($scope.diaAtual) || 0;
        var emZonaBaixa = posicao >= 17;
        var emZonaAlta = posicao <= 4;
        if (!emZonaBaixa && !emZonaAlta) return null;
        var chave = 'competicao_pressao|' + dia + '|' + clube.id + '|' + posicao;
        if (emZonaAlta) {
            $scope.registrarEventoTorcida({ id: chave + '|torcida', chave: chave + '|torcida', origem: 'competicao', impacto: 1, titulo: 'Torcida empolgada', detalhe: 'A boa posição do ' + clube.nome + ' aumenta a confiança da arquibancada.' });
            $scope.registrarEventoAmbiente({ id: chave + '|ambiente', chave: chave + '|ambiente', tipo: 'competicao', impacto: 1, titulo: 'Elenco confiante', detalhe: 'A disputa na parte alta fortalece o ambiente do grupo.' });
        } else {
            $scope.registrarEventoImprensa({ id: chave + '|imprensa', chave: chave + '|imprensa', origem: 'competicao', impacto: 2, titulo: 'Pressão pela reação', detalhe: 'A posição do ' + clube.nome + ' virou assunto recorrente e exige resposta rápida.' });
            $scope.registrarEventoAmbiente({ id: chave + '|ambiente', chave: chave + '|ambiente', tipo: 'competicao', impacto: -1, titulo: 'Elenco pressionado', detalhe: 'A luta contra o rebaixamento pesa no ambiente do grupo.' });
        }
        return { posicao: posicao, zona: emZonaAlta ? 'alta' : 'baixa' };
    };

    $scope.gerarDeclaracaoPosJogo = function(partida) {
        if (!partida || partida.golsMandante === undefined || !$scope.clubeAtual) return null;
        var meuMandante = partida.mandante && partida.mandante.id === $scope.clubeAtual.id;
        var golsMeu = meuMandante ? partida.golsMandante : partida.golsVisitante;
        var golsRival = meuMandante ? partida.golsVisitante : partida.golsMandante;
        var rival = meuMandante ? partida.visitante : partida.mandante;
        var venceu = golsMeu > golsRival;
        var empatou = golsMeu === golsRival;
        var destaque = ($scope.elencoAtual || []).filter(function(jogador) { return jogador.emCampo && !jogador.lesionado; })[0];
        var texto = venceu ? 'O grupo mostrou personalidade e mereceu a vitória.' : (empatou ? 'Precisamos ajustar detalhes, mas seguimos competitivos.' : 'A derrota dói, mas vamos trabalhar para reagir no próximo compromisso.');
        $scope.atualizarReputacaoNarrativa(venceu ? 'motivacao' : (empatou ? 'equilibrio' : 'defensivo'), 'pós-jogo');
        if (destaque) texto = destaque.nome + ' falou após o jogo: "' + texto + '"';
        $scope.adicionarMensagem(venceu ? 'Capitão do elenco' : 'Comissão Técnica', venceu ? 'Vestiário em festa' : (empatou ? 'Elenco mantém a confiança' : 'Reação no vestiário'), texto + ' O resultado foi ' + golsMeu + ' x ' + golsRival + ' contra ' + (rival ? rival.nome : 'o adversário') + '.', true, venceu ? 'torcida' : 'imprensa');
        return texto;
    };

    $scope.atualizarReputacaoNarrativa = function(efeito, origem) {
        $scope.dados = $scope.dados || {};
        var reputacao = $scope.dados.reputacaoNarrativa || { confianca: 50, respeito: 50, vestiario: 50, estilo: 'em construção', historico: [] };
        var delta = efeito === 'motivacao' ? { confianca: 2, respeito: 1, vestiario: 3 } : (efeito === 'arrogante' ? { confianca: 1, respeito: -2, vestiario: -1 } : { confianca: 0, respeito: 1, vestiario: 1 });
        reputacao.confianca = Math.max(0, Math.min(100, reputacao.confianca + delta.confianca));
        reputacao.respeito = Math.max(0, Math.min(100, reputacao.respeito + delta.respeito));
        reputacao.vestiario = Math.max(0, Math.min(100, reputacao.vestiario + delta.vestiario));
        reputacao.estilo = reputacao.respeito >= 70 ? 'respeitado' : (reputacao.respeito <= 30 ? 'provocador' : 'equilibrado');
        reputacao.historico.unshift({ dia: $scope.diaAtual || 0, origem: origem || 'declaração', efeito: efeito, confianca: reputacao.confianca, respeito: reputacao.respeito, vestiario: reputacao.vestiario });
        reputacao.historico = reputacao.historico.slice(0, 20);
        $scope.dados.reputacaoNarrativa = reputacao;
        return reputacao;
    };

    $scope.marcarMensagemLida = function(msg) {
        msg.lida = true;
    };

    $scope.abrirMensagem = function(msg) {
        $scope.mensagemAberta = msg;
        $scope.marcarMensagemLida(msg);
    };
    $scope.responderEventoDiretoria = function(msg, postura) {
        if (!msg || msg.tipo !== 'diretoria' || msg.respondida) return false;
        var textos = {
            apoio: 'O treinador respondeu reforçando confiança no elenco.',
            cobranca: 'O treinador respondeu cobrando reação imediata do grupo.',
            paciencia: 'O treinador pediu paciência e tempo para consolidar o trabalho.'
        };
        msg.respondida = true;
        msg.respostaTreinador = textos[postura] || textos.paciencia;
        $scope.registrarDecisaoGestao('diretoria', msg.respostaTreinador);
        $scope.diretoriaStatus = normalizarDiretoriaStatusInterno($scope.diretoriaStatus);
        $scope.diretoriaStatus.bonusConfianca = Math.max(-10, Math.min(10, ($scope.diretoriaStatus.bonusConfianca || 0) + (postura === 'apoio' ? 2 : (postura === 'cobranca' ? -2 : 0))));
        if ($scope.registrarEventoAmbiente) {
            var impacto = postura === 'apoio' ? 1 : (postura === 'cobranca' ? -1 : 0);
            if (impacto !== 0) $scope.registrarEventoAmbiente({ id: 'amb_resposta_' + msg.id, chave: 'resposta_diretoria|' + msg.id, dia: $scope.diaAtual || 0, tipo: 'diretoria', impacto: impacto, titulo: postura === 'apoio' ? 'Treinador protege o elenco' : 'Treinador aumenta a cobrança', detalhe: msg.respostaTreinador });
        }
        if ($scope.salvarJogoSilencioso) $scope.salvarJogoSilencioso();
        return true;
    };

    // FASE 20: Responder Propostas da IA
    $scope.responderProposta = function(msg, aceitar) {
        var jogadorAlvo = $scope.elencoAtual.find(function(j) { return j.id === msg.jogadorOfertaId; });
        if (!jogadorAlvo) return; // Jogador já não existe mais no elenco (vendido?)
        var campoResposta = msg.conteudo !== undefined ? 'conteudo' : 'mensagem';
        var clubeCompradorId = msg.clubeCompradorId || msg.clubeDestinoId || 'vendido_ia';
        var clubeCompradorNome = msg.remetente || 'Clube interessado';

        if (aceitar) {
            if (jogadorAlvo.emCampo) {
                alert('Este jogador está escalado. Retire-o da equipe titular antes de concluir a venda.');
                return;
            }
            $scope.clubeAtual.orcamento += msg.valorOferta;
            $scope.financasHistorico.unshift({
                tipo: 'receita',
                descricao: 'Venda de Jogador: ' + jogadorAlvo.nome,
                valor: msg.valorOferta,
                data: new Date().toLocaleDateString('pt-BR')
            });

            $scope.registrarTransferenciaHistorico({
                tipo: 'venda',
                jogadorId: jogadorAlvo.id,
                jogadorNome: jogadorAlvo.nome,
                clubeOrigemId: $scope.clubeAtual.id,
                clubeOrigemNome: $scope.clubeAtual.nome,
                clubeDestinoId: clubeCompradorId,
                clubeDestinoNome: clubeCompradorNome,
                valor: msg.valorOferta,
                salario: jogadorAlvo.salario,
                anosContrato: jogadorAlvo.anosContrato
            });
            $scope.registrarOuAtualizarProposta({
                id: msg.propostaPendenteId,
                tipo: 'venda',
                status: 'aceita',
                jogadorId: jogadorAlvo.id,
                jogadorNome: jogadorAlvo.nome,
                clubeOrigemId: $scope.clubeAtual.id,
                clubeDestinoId: clubeCompradorId,
                clubeDestinoNome: clubeCompradorNome,
                valorOferta: msg.valorOferta
            });
            
            // Remover do elencoAtual e colocar na IA
            jogadorAlvo.clubeId = clubeCompradorId;
            jogadorAlvo.emCampo = false;
            jogadorAlvo.emNegociacao = false;
            var jogadorBase = ($scope.jogadores || []).find(function(j) { return j.id === jogadorAlvo.id; });
            if (jogadorBase) {
                jogadorBase.clubeId = clubeCompradorId;
                jogadorBase.emCampo = false;
                jogadorBase.emNegociacao = false;
            }
            var idx = $scope.elencoAtual.findIndex(function(j) { return j.id === jogadorAlvo.id; });
            if (idx > -1) $scope.elencoAtual.splice(idx, 1);
            
            msg[campoResposta] = (msg[campoResposta] || '') + '\n\n✅ VOCÊ ACEITOU A PROPOSTA. Jogador foi vendido.';
        } else {
            jogadorAlvo.emNegociacao = false;
            $scope.registrarOuAtualizarProposta({
                id: msg.propostaPendenteId,
                tipo: 'venda',
                status: 'recusada',
                jogadorId: jogadorAlvo.id,
                jogadorNome: jogadorAlvo.nome,
                clubeOrigemId: $scope.clubeAtual.id,
                clubeDestinoId: clubeCompradorId,
                clubeDestinoNome: clubeCompradorNome,
                valorOferta: msg.valorOferta
            });
            msg[campoResposta] = (msg[campoResposta] || '') + '\n\n❌ VOCÊ RECUSOU A PROPOSTA. Jogador fica no elenco.';
        }
        
        msg.respondida = true;
        $scope.salvarJogoSilencioso();
    };

    $scope.qtdMensagensNaoLidas = function() {
        if (!$scope.caixaEntrada) return 0;
        return $scope.caixaEntrada.filter(function(m) { return !m.lida; }).length;
    };

    $scope.carregarDados = function() {
        $timeout(function() {
            $http.get('data/clubes.json').then(function(response) {
                $scope.clubes = response.data;
                return $http.get('data/jogadores.json');
            }).then(function(response) {
                $scope.jogadores = response.data;
                $scope.checarSaveExistente();
                $scope.telaAtual = 'menu_inicial';
            }).catch(function(error) {
                alert("Erro ao carregar dados.");
            });
        }, 800);
    };

    $scope.iniciarNovoJogo = function(clube) {
        if (!$scope.dados.nomeTreinador || $scope.dados.nomeTreinador.trim() === '') {
            $scope.dados.nomeTreinador = 'Treinador(a)';
        }
        $scope.dados.anoAtual = 2024;
        $scope.staffClube = criarStaffPadrao();
        $scope.emprestimosAtivos = [];
        $scope.historicoFinanceiroMensal = {};
        $scope.historicoTreinador = [{
            tipo: 'inicio', clubeId: clube.id, clubeNome: clube.nome,
            divisao: clube.divisao, temporada: $scope.dados.anoAtual,
            descricao: 'Início da carreira no ' + clube.nome
        }];
        $scope.selecionarClube(clube.id);
        $scope.financasHistorico = []; // FASE 9: Inicializa o histórico zerado
        $scope.transferenciasHistorico = [];
        $scope.transferenciasHistoricoVisivel = [];
        $scope.propostasPendentes = [];
        $scope.relatorioEvolucao = [];
        $scope.relatorioEvolucaoVisivel = [];
        $scope.ultimoDiaEvolucao = 0;
        $scope.ambienteElenco = criarAmbienteElencoPadrao();
        $scope.atualizarAmbienteElencoResumo();
        $scope.clubeAtual.scouting = criarScoutingPadrao();
        $scope.clubeAtual.infraestrutura = criarInfraestruturaPadrao();
        $scope.clubeAtual.nivelMedico = 1;
        $scope.atualizarResumoInfraestrutura();
        $scope.clubeAtual.base = criarBasePadrao();
        $scope.gerarAtletasBase(8, 'inicial');
        $scope.diretoriaStatus = criarDiretoriaStatusPadrao();
        $scope.contextoExterno = criarContextoExternoPadrao();
        $scope.atualizarResumoContextoExterno();
        $scope.preparacaoTemporada = normalizarPreparacaoTemporada();
        $scope.mercadoUI = { aba: 'busca' };
        $scope.propostaNegociacaoAtualId = null;
        
        if ($scope.jogadores) {
            $scope.jogadores.forEach(function(j) { 
                normalizarJogadorSalvo(j);
                j.golsTemporada = 0; 
                j.xpTemporada = 0;
                j.jogosTemporada = 0;
                j.minutosTemporada = 0;
                j.evolucaoTemporada = 0;
                j.historicoEvolucao = [];
                if (!j.anosContrato) j.anosContrato = Math.floor(Math.random() * 3) + 1;
                normalizarEstadoContratoJogadorInterno(j);
            });
        }
        normalizarListaJogadoresSalvos($scope.elencoAtual);

        $scope.patrocinioAtual = null;
        $scope.gerarPatrocinadores(); // Gera as opções de patrocínio inicial

        $scope.gerarMetaDiretoria();

        $scope.caixaEntrada.unshift({
            id: 'msg_janela_inicio',
            remetente: 'Federação',
            assunto: 'Janela de Transferências ABERTA!',
            mensagem: 'O período de transferências acaba de começar! Os clubes estão livres para comprar e vender atletas durante a janela inicial da temporada.',
            lida: false,
            tipo: 'info',
            data: new Date().toLocaleDateString('pt-BR')
        });
        $scope.mensagensNaoLidas++;

        $scope.gerarCalendario(); // Gera o calendário do zero
        if ($scope.atualizarResumoJanelaMercado) $scope.atualizarResumoJanelaMercado();
        $scope.mudarTela('dashboard');
    };

    // FASE 15: MASTER CALENDAR (Round Robin)
    function gerarRoundRobin(times) {
        var rodadas = [];
        var n = times.length;
        var fixo = times[0];
        var giram = times.slice(1);
        
        // 1o Turno
        for (var r = 0; r < n - 1; r++) {
            var jogosRodada = [];
            // Alternar mando do time fixo para equilibrar
            if (r % 2 === 0) {
                jogosRodada.push({ mandante: fixo, visitante: giram[0] });
            } else {
                jogosRodada.push({ mandante: giram[0], visitante: fixo });
            }
            
            for (var i = 1; i < n / 2; i++) {
                if (i % 2 === 0) {
                    jogosRodada.push({ mandante: giram[i], visitante: giram[n - 1 - i] });
                } else {
                    jogosRodada.push({ mandante: giram[n - 1 - i], visitante: giram[i] });
                }
            }
            rodadas.push(jogosRodada);
            // Rotacionar
            giram.push(giram.shift());
        }
        
        // 2o Turno (inverte mandos)
        var segundoTurno = [];
        for (var r = 0; r < n - 1; r++) {
            var jogosOriginais = rodadas[r];
            var jogosNovos = jogosOriginais.map(function(j) { return { mandante: j.visitante, visitante: j.mandante }; });
            segundoTurno.push(jogosNovos);
        }
        
        return rodadas.concat(segundoTurno);
    }

    $scope.gerarCopaDoBrasil = function() {
        var pote1 = []; // 32 times
        var pote2 = []; // 32 times
        
        var serieA = $scope.clubes.filter(function(c) { return c.divisao === 'A'; });
        var serieB = $scope.clubes.filter(function(c) { return c.divisao === 'B'; });
        var serieC = $scope.clubes.filter(function(c) { return c.divisao === 'C'; });
        var serieD = $scope.clubes.filter(function(c) { return c.divisao === 'D'; });
        
        pote1 = serieA.concat(serieB.slice(0, 12));
        var restoB = serieB.slice(12);
        
        var escolhidosD = [];
        if ($scope.clubeAtual.divisao === 'D') {
            escolhidosD.push($scope.clubeAtual);
            var outrosD = serieD.filter(function(c) { return c.id !== $scope.clubeAtual.id; });
            outrosD.sort(function() { return 0.5 - Math.random(); });
            escolhidosD = escolhidosD.concat(outrosD.slice(0, 3));
        } else {
            var outrosD = serieD.slice();
            outrosD.sort(function() { return 0.5 - Math.random(); });
            escolhidosD = outrosD.slice(0, 4);
        }
        
        pote2 = restoB.concat(serieC).concat(escolhidosD);

        pote1.sort(function() { return 0.5 - Math.random(); });
        pote2.sort(function() { return 0.5 - Math.random(); });

        var confrontos = [];
        for(var i=0; i<32; i++) {
            confrontos.push({
                time1: pote1[i],
                time2: pote2[i],
                golsIda1: 0, golsIda2: 0, golsVolta1: 0, golsVolta2: 0,
                jogadoIda: false, jogadoVolta: false, vencedor: null
            });
        }

        $scope.copaBrasil = {
            faseAtual: 0,
            chaves: [confrontos]
        };
    };

    // FASE 22: Competições Continentais
    $scope.gerarCompeticoesContinentais = function() {
        var estrangeiros = [
            { id: 901, nome: "Boca Juniors", sigla: "BOC", pais: "ARG", reputacao: 85, divisao: "EXT", cores: ["#004b87", "#f3a900"] },
            { id: 902, nome: "River Plate", sigla: "RIV", pais: "ARG", reputacao: 86, divisao: "EXT", cores: ["#ffffff", "#ff0000"] },
            { id: 903, nome: "Peñarol", sigla: "PEN", pais: "URU", reputacao: 78, divisao: "EXT", cores: ["#ffcc00", "#000000"] },
            { id: 904, nome: "Nacional", sigla: "NAC", pais: "URU", reputacao: 77, divisao: "EXT", cores: ["#ffffff", "#0000ff"] },
            { id: 905, nome: "Colo-Colo", sigla: "COL", pais: "CHI", reputacao: 75, divisao: "EXT", cores: ["#ffffff", "#000000"] },
            { id: 906, nome: "Olimpia", sigla: "OLI", pais: "PAR", reputacao: 76, divisao: "EXT", cores: ["#ffffff", "#000000"] },
            { id: 907, nome: "LDU Quito", sigla: "LDU", pais: "ECU", reputacao: 74, divisao: "EXT", cores: ["#ffffff", "#ff0000"] },
            { id: 908, nome: "Atlético Nacional", sigla: "ATN", pais: "COL", reputacao: 75, divisao: "EXT", cores: ["#008000", "#ffffff"] },
            { id: 909, nome: "Independiente", sigla: "IND", pais: "ARG", reputacao: 80, divisao: "EXT", cores: ["#ff0000", "#ffffff"] },
            { id: 910, nome: "Racing", sigla: "RAC", pais: "ARG", reputacao: 79, divisao: "EXT", cores: ["#75aadb", "#ffffff"] },
            { id: 911, nome: "San Lorenzo", sigla: "SLO", pais: "ARG", reputacao: 77, divisao: "EXT", cores: ["#000080", "#ff0000"] },
            { id: 912, nome: "Cerro Porteño", sigla: "CER", pais: "PAR", reputacao: 74, divisao: "EXT", cores: ["#ff0000", "#0000ff"] },
            { id: 913, nome: "Universidad Católica", sigla: "UCA", pais: "CHI", reputacao: 72, divisao: "EXT", cores: ["#ffffff", "#0000ff"] },
            { id: 914, nome: "Universidad de Chile", sigla: "UCH", pais: "CHI", reputacao: 73, divisao: "EXT", cores: ["#0000ff", "#ff0000"] },
            { id: 915, nome: "Millonarios", sigla: "MIL", pais: "COL", reputacao: 72, divisao: "EXT", cores: ["#0000ff", "#ffffff"] },
            { id: 916, nome: "Indep. del Valle", sigla: "IDV", pais: "ECU", reputacao: 75, divisao: "EXT", cores: ["#000000", "#0000ff"] },
            { id: 917, nome: "Estudiantes", sigla: "EST", pais: "ARG", reputacao: 78, divisao: "EXT", cores: ["#ff0000", "#ffffff"] },
            { id: 918, nome: "Emelec", sigla: "EME", pais: "ECU", reputacao: 70, divisao: "EXT", cores: ["#0000ff", "#ffffff"] },
            { id: 919, nome: "Barcelona SC", sigla: "BSC", pais: "ECU", reputacao: 71, divisao: "EXT", cores: ["#ffff00", "#ff0000"] },
            { id: 920, nome: "América de Cali", sigla: "AME", pais: "COL", reputacao: 72, divisao: "EXT", cores: ["#ff0000", "#ffffff"] },
            { id: 921, nome: "Defensa y Justicia", sigla: "DYJ", pais: "ARG", reputacao: 74, divisao: "EXT", cores: ["#ffff00", "#008000"] },
            { id: 922, nome: "Rosario Central", sigla: "ROS", pais: "ARG", reputacao: 73, divisao: "EXT", cores: ["#ffff00", "#0000ff"] },
            { id: 923, nome: "Velez Sarsfield", sigla: "VEL", pais: "ARG", reputacao: 75, divisao: "EXT", cores: ["#ffffff", "#0000ff"] },
            { id: 924, nome: "Libertad", sigla: "LIB", pais: "PAR", reputacao: 72, divisao: "EXT", cores: ["#ffffff", "#000000"] },
            { id: 925, nome: "Deportivo Cali", sigla: "DCA", pais: "COL", reputacao: 70, divisao: "EXT", cores: ["#008000", "#ffffff"] },
            { id: 926, nome: "Junior Barranquilla", sigla: "JUN", pais: "COL", reputacao: 71, divisao: "EXT", cores: ["#ff0000", "#ffffff"] },
            { id: 927, nome: "Alianza Lima", sigla: "ALI", pais: "PER", reputacao: 68, divisao: "EXT", cores: ["#000080", "#ffffff"] },
            { id: 928, nome: "Universitario", sigla: "UNI", pais: "PER", reputacao: 69, divisao: "EXT", cores: ["#ffffcc", "#800000"] },
            { id: 929, nome: "Sporting Cristal", sigla: "SCR", pais: "PER", reputacao: 68, divisao: "EXT", cores: ["#00bfff", "#ffffff"] },
            { id: 930, nome: "Bolívar", sigla: "BOL", pais: "BOL", reputacao: 67, divisao: "EXT", cores: ["#00bfff", "#ffffff"] },
            { id: 931, nome: "The Strongest", sigla: "STR", pais: "BOL", reputacao: 66, divisao: "EXT", cores: ["#ffff00", "#000000"] },
            { id: 932, nome: "Peñarol (B)", sigla: "PNB", pais: "URU", reputacao: 65, divisao: "EXT", cores: ["#ffcc00", "#000000"] },
            { id: 933, nome: "Caracas", sigla: "CAR", pais: "VEN", reputacao: 64, divisao: "EXT", cores: ["#ff0000", "#000000"] },
            { id: 934, nome: "Dep. Táchira", sigla: "TAC", pais: "VEN", reputacao: 63, divisao: "EXT", cores: ["#ffff00", "#000000"] }
        ];

        var classificadosBrLib = [];
        var classificadosBrSula = [];
        
        if ($scope.classificadosAnoAnterior && $scope.classificadosAnoAnterior.length >= 12) {
            var libCount = 0;
            // O campeão da Copa do Brasil entra na Libertadores
            if ($scope.campeaoCopaAnoAnterior) {
                classificadosBrLib.push($scope.campeaoCopaAnoAnterior);
                libCount++;
            }
            
            // Pega os top da Série A até dar 6 vagas (G6)
            for (var i = 0; i < $scope.classificadosAnoAnterior.length; i++) {
                var c = $scope.classificadosAnoAnterior[i];
                if (!classificadosBrLib.find(function(x) { return x.id === c.id; })) {
                    if (classificadosBrLib.length < 6) {
                        classificadosBrLib.push(c);
                    } else if (classificadosBrSula.length < 6) {
                        classificadosBrSula.push(c);
                    }
                }
            }
        } else {
            // Se for o primeiro ano (2024), seleciona times fortes aleatórios da Série A atual
            var serieAAtual = $scope.clubes.filter(function(c) { return c.divisao === 'A'; });
            serieAAtual.sort(function(a, b) { return b.reputacao - a.reputacao; });
            classificadosBrLib = serieAAtual.slice(0, 6);
            classificadosBrSula = serieAAtual.slice(6, 12);
        }

        estrangeiros.sort(function() { return 0.5 - Math.random(); });
        
        // Função auxiliar para gerar 6 rodadas de grupo (4 times)
        function gerarJogosGrupo(times) {
            var r1 = [{m: times[0], v: times[1]}, {m: times[2], v: times[3]}];
            var r2 = [{m: times[1], v: times[2]}, {m: times[3], v: times[0]}];
            var r3 = [{m: times[0], v: times[2]}, {m: times[1], v: times[3]}];
            var r4 = [{m: times[2], v: times[0]}, {m: times[3], v: times[1]}];
            var r5 = [{m: times[2], v: times[1]}, {m: times[0], v: times[3]}];
            var r6 = [{m: times[1], v: times[0]}, {m: times[3], v: times[2]}];
            
            var rodadas = [r1, r2, r3, r4, r5, r6];
            return rodadas.map(function(r) {
                return r.map(function(jogo) {
                    return {
                        time1: jogo.m, time2: jogo.v,
                        golsIda1: 0, golsIda2: 0,
                        jogadoIda: false, vencedor: null
                    };
                });
            });
        }

        function criarTabelaGrupo(times) {
            return times.map(function(t) {
                return { clube: t, pontos: 0, vitorias: 0, empates: 0, derrotas: 0, golsPro: 0, golsContra: 0, saldo: 0 };
            });
        }

        // LIBERTADORES (Fase de Grupos)
        var poteLib = classificadosBrLib.concat(estrangeiros.slice(0, 26));
        poteLib.sort(function() { return 0.5 - Math.random(); });
        var gruposLib = [];
        for(var i=0; i<8; i++) {
            var timesGrupo = [poteLib[i*4], poteLib[i*4+1], poteLib[i*4+2], poteLib[i*4+3]];
            gruposLib.push({
                nome: "Grupo " + String.fromCharCode(65 + i),
                times: timesGrupo,
                tabela: criarTabelaGrupo(timesGrupo),
                rodadas: gerarJogosGrupo(timesGrupo)
            });
        }
        $scope.libertadores = { grupos: gruposLib, chaves: [] };

        // SUL-AMERICANA (Fase de Grupos)
        var poteSula = classificadosBrSula.concat(estrangeiros.slice(8, 34)); 
        poteSula.sort(function() { return 0.5 - Math.random(); });
        var gruposSula = [];
        for(var i=0; i<8; i++) {
            var timesGrupo = [poteSula[i*4], poteSula[i*4+1], poteSula[i*4+2], poteSula[i*4+3]];
            gruposSula.push({
                nome: "Grupo " + String.fromCharCode(65 + i),
                times: timesGrupo,
                tabela: criarTabelaGrupo(timesGrupo),
                rodadas: gerarJogosGrupo(timesGrupo)
            });
        }
        $scope.sulAmericana = { grupos: gruposSula, chaves: [] };
    };

    $scope.gerarCalendario = function() {
        $scope.tabelas = { "A": [], "B": [], "C": [], "D": [] };
        $scope.clubes.forEach(function(c) {
            $scope.tabelas[c.divisao].push({
                clube: c, pontos: 0, vitorias: 0, empates: 0, derrotas: 0, golsPro: 0, golsContra: 0, saldo: 0
            });
        });

        $scope.calendario = []; // Jogos Liga do Player
        $scope.jogosCPU = []; // Jogos Liga das 4 divisões por rodada
        for (var i = 0; i < 38; i++) { $scope.jogosCPU.push([]); }

        ["A", "B", "C", "D"].forEach(function(div) {
            var clubesDivisao = $scope.clubes.filter(function(c) { return c.divisao === div; });
            var rodadasDiv = gerarRoundRobin(clubesDivisao);
            
            for (var r = 0; r < 38; r++) {
                var jogosDessaRodada = rodadasDiv[r];
                jogosDessaRodada.forEach(function(jogo) {
                    if (jogo.mandante.id === $scope.clubeAtual.id || jogo.visitante.id === $scope.clubeAtual.id) {
                        $scope.calendario[r] = {
                            rodada: r + 1,
                            mandante: jogo.mandante,
                            visitante: jogo.visitante,
                            jogado: false,
                            golsMandante: 0,
                            golsVisitante: 0
                        };
                    } else {
                        $scope.jogosCPU[r].push({
                            mandante: jogo.mandante,
                            visitante: jogo.visitante,
                            jogado: false,
                            golsMandante: 0,
                            golsVisitante: 0,
                            divisao: div
                        });
                    }
                });
            }
        });
        
        $scope.gerarCopaDoBrasil();
        $scope.gerarCompeticoesContinentais();

        $scope.calendarioGeral = [];
        // Janela real de preparação antes de qualquer compromisso oficial.
        // Os índices dos jogos oficiais são deslocados, mas a ordem das competições permanece intacta.
        var diasPreTemporada = 7;
        for (var preDia = 0; preDia < diasPreTemporada; preDia++) {
            $scope.calendarioGeral.push({
                dia: preDia,
                tipo: 'PRE_TEMPORADA',
                titulo: preDia === 0 ? 'Início da pré-temporada' : 'Pré-temporada - Dia de preparação',
                fase: 'pre-temporada',
                preparacao: true
            });
        }
        var ligIdx = 0;
        var copaFase = 0;
        var libSulaFase = 0;
        
        // Novo Layout: 38 Ligas, 12 Copas do Brasil, 14 Continentais
        var masterLayout = [
            'L', 'C_ida', 'L', 'LibSul_G', 'C_volta', 'L', 'L', 'C_ida', 'L', 'LibSul_G', 'C_volta', 'L', 
            'L', 'C_ida', 'L', 'LibSul_G', 'C_volta', 'L', 'L', 'C_ida', 'L', 'LibSul_G', 'C_volta', 'L', 
            'L', 'LibSul_G', 'L', 'LibSul_G', 'L', 'C_ida', 'L', 'LibSul_ida', 'C_volta', 'L', 'LibSul_volta', 'L', 
            'L', 'LibSul_ida', 'L', 'LibSul_volta', 'L', 'LibSul_ida', 'L', 'LibSul_volta', 'L', 'LibSul_ida', 'L', 'LibSul_volta', 
            'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'C_ida', 'C_volta'
        ];
        
        for(var i=0; i<masterLayout.length; i++) {
            var tipo = masterLayout[i];
            if (tipo === 'L') {
                if (ligIdx < 38) {
                    $scope.calendarioGeral.push({ dia: i + diasPreTemporada, tipo: 'LIGA', titulo: 'Brasileirão - Rodada ' + (ligIdx + 1), rodadaLiga: ligIdx });
                    ligIdx++;
                } else {
                    $scope.calendarioGeral.push({ dia: i + diasPreTemporada, tipo: 'TREINO', titulo: 'Treino Livre', rodadaLiga: null });
                }
            } else if (tipo === 'C_ida') {
                var nomeFase = ["1ª Fase", "Dezesseis-avos", "Oitavas", "Quartas", "Semifinal", "Final"][copaFase];
                if (nomeFase) $scope.calendarioGeral.push({ dia: i + diasPreTemporada, tipo: 'COPA', titulo: 'Copa do Brasil - ' + nomeFase + ' (Ida)', fase: copaFase, perna: 'ida' });
            } else if (tipo === 'C_volta') {
                var nomeFase = ["1ª Fase", "Dezesseis-avos", "Oitavas", "Quartas", "Semifinal", "Final"][copaFase];
                if (nomeFase) {
                    $scope.calendarioGeral.push({ dia: i + diasPreTemporada, tipo: 'COPA', titulo: 'Copa do Brasil - ' + nomeFase + ' (Volta)', fase: copaFase, perna: 'volta' });
                    copaFase++;
                }
            } else if (tipo === 'LibSul_G') {
                $scope.calendarioGeral.push({ dia: i + diasPreTemporada, tipo: 'CONTINENTAL', titulo: 'Competições Continentais - Fase de Grupos (' + (libSulaFase + 1) + 'ª Rodada)', fase: libSulaFase, perna: 'ida' });
                libSulaFase++;
            } else if (tipo === 'LibSul_ida') {
                var nomeFase = ["Oitavas", "Quartas", "Semifinal", "Final"][libSulaFase - 6];
                if (nomeFase) $scope.calendarioGeral.push({ dia: i + diasPreTemporada, tipo: 'CONTINENTAL', titulo: 'Competições Continentais - ' + nomeFase + ' (Ida)', fase: libSulaFase, perna: 'ida' });
            } else if (tipo === 'LibSul_volta') {
                var nomeFase = ["Oitavas", "Quartas", "Semifinal", "Final"][libSulaFase - 6];
                if (nomeFase) {
                    $scope.calendarioGeral.push({ dia: i + diasPreTemporada, tipo: 'CONTINENTAL', titulo: 'Competições Continentais - ' + nomeFase + ' (Volta)', fase: libSulaFase, perna: 'volta' });
                    libSulaFase++;
                }
            }
        }
        
        $scope.normalizarCalendarioGeral();
        $scope.atualizarCalendarioFiltrado();
        $scope.diaAtual = 0;
        if ($scope.atualizarResumoJanelaMercado) $scope.atualizarResumoJanelaMercado();
    };

    $scope.normalizarCalendarioGeral = function() {
        if (!$scope.calendarioGeral || !$scope.calendarioGeral.length) return;

        var eventosCopa = $scope.calendarioGeral.filter(function(dia) { return dia.tipo === 'COPA'; });
        var temFinalCopa = eventosCopa.some(function(dia) { return dia.fase === 5; });
        if (temFinalCopa || eventosCopa.length !== 10 || $scope.calendarioGeral.length < 2) return;

        var penultimoIndice = $scope.calendarioGeral.length - 2;
        var ultimoIndice = $scope.calendarioGeral.length - 1;
        var penultimo = $scope.calendarioGeral[penultimoIndice];
        var ultimo = $scope.calendarioGeral[ultimoIndice];
        if (!penultimo || !ultimo || penultimo.tipo !== 'TREINO' || ultimo.tipo !== 'TREINO') return;

        $scope.calendarioGeral[penultimoIndice] = {
            dia: penultimoIndice,
            tipo: 'COPA',
            titulo: 'Copa do Brasil - Final (Ida)',
            fase: 5,
            perna: 'ida'
        };
        $scope.calendarioGeral[ultimoIndice] = {
            dia: ultimoIndice,
            tipo: 'COPA',
            titulo: 'Copa do Brasil - Final (Volta)',
            fase: 5,
            perna: 'volta'
        };
    };

    $scope.obterIndiceRodadaLiga = function(numeroRodada) {
        if (!$scope.calendarioGeral) return null;
        var rodadaLiga = numeroRodada - 1;
        for (var i = 0; i < $scope.calendarioGeral.length; i++) {
            var dia = $scope.calendarioGeral[i];
            if (dia && dia.tipo === 'LIGA' && dia.rodadaLiga >= rodadaLiga) return i;
        }
        return null;
    };

    $scope.obterJanelasTransferencia = function() {
        var totalDias = $scope.calendarioGeral ? $scope.calendarioGeral.length : 0;
        if (!totalDias) return [];

        var inicioMeioAno = $scope.obterIndiceRodadaLiga(18);
        if (inicioMeioAno === null) inicioMeioAno = Math.floor(totalDias * 0.55);

        return [
            { id: 'inicio', inicio: 0, fim: Math.min(15, totalDias - 1), nome: 'inicio da temporada' },
            { id: 'meio', inicio: inicioMeioAno, fim: Math.min(inicioMeioAno + 10, totalDias - 1), nome: 'meio da temporada' }
        ];
    };

    $scope.obterJanelaTransferenciaAtual = function(diaIndice) {
        var dia = (typeof diaIndice === 'number') ? diaIndice : $scope.diaAtual;
        var janelas = $scope.obterJanelasTransferencia();
        for (var i = 0; i < janelas.length; i++) {
            if (dia >= janelas[i].inicio && dia <= janelas[i].fim) return janelas[i];
        }
        return null;
    };

    $scope.isJanelaTransferenciaAbertaNoDia = function(diaIndice) {
        return !!$scope.obterJanelaTransferenciaAtual(diaIndice);
    };

    $scope.obterEventoJanelaTransferencia = function(diaIndice) {
        var dia = (typeof diaIndice === 'number') ? diaIndice : $scope.diaAtual;
        var janelas = $scope.obterJanelasTransferencia();
        for (var i = 0; i < janelas.length; i++) {
            var janela = janelas[i];
            if (dia === janela.inicio && janela.inicio > 0) return { tipo: 'abertura', janela: janela };
            if (dia === janela.fim - 2) return { tipo: 'aviso', janela: janela };
            if (dia === janela.fim + 1) return { tipo: 'fechamento', janela: janela };
        }
        return null;
    };

    $scope.isFechamentoFinanceiro = function(diaIndice) {
        var dia = (typeof diaIndice === 'number') ? diaIndice : $scope.diaAtual;
        return dia > 0 && dia % 5 === 0;
    };

    $scope.obterMesFinanceiro = function(diaIndice) {
        var dia = (typeof diaIndice === 'number') ? diaIndice : $scope.diaAtual;
        return Math.max(1, Math.ceil(dia / 5));
    };

    $scope.obterLabelTipoCalendario = function(dia) {
        if (!dia) return 'Evento';
        if (dia.tipo === 'LIGA') return 'Brasileirao';
        if (dia.tipo === 'COPA') return 'Copa do Brasil';
        if (dia.tipo === 'CONTINENTAL') return 'Continental';
        if (dia.tipo === 'TREINO') return 'Treino';
        return dia.tipo;
    };

    $scope.obterCorTipoCalendario = function(dia) {
        if (!dia) return '#95a5a6';
        if (dia.tipo === 'LIGA') return 'var(--br-green)';
        if (dia.tipo === 'COPA') return '#f39c12';
        if (dia.tipo === 'CONTINENTAL') return 'var(--br-blue)';
        if (dia.tipo === 'TREINO') return '#7f8c8d';
        return '#95a5a6';
    };

    $scope.isDiaDecisivoCalendario = function(dia) {
        if (!dia) return false;
        if (dia.tipo === 'COPA' && dia.fase >= 3) return true;
        if (dia.tipo === 'CONTINENTAL' && dia.fase >= 6) return true;
        return false;
    };

    $scope.calcularCargaCalendario = function(diaIndice) {
        diaIndice = (typeof diaIndice === 'number') ? diaIndice : $scope.diaAtual;

        var janelaDias = 5;
        var inicio = Math.max(0, diaIndice - janelaDias);
        var jogosUltimos5 = 0;
        var jogosDecisivosUltimos5 = 0;
        var jogosContinentaisUltimos5 = 0;

        for (var i = inicio; i < diaIndice; i++) {
            var dia = $scope.calendarioGeral ? $scope.calendarioGeral[i] : null;
            var teveJogo = !!($scope.obterMeuJogoNoDia && $scope.obterMeuJogoNoDia(i));
            if (!dia || !teveJogo) continue;

            if (dia.tipo === 'LIGA' || dia.tipo === 'COPA' || dia.tipo === 'CONTINENTAL') {
                jogosUltimos5++;
                if (dia.tipo === 'CONTINENTAL') jogosContinentaisUltimos5++;
                if ($scope.isDiaDecisivoCalendario(dia)) jogosDecisivosUltimos5++;
            }
        }

        var elencoDisponivel = ($scope.elencoAtual || []).filter(function(j) {
            return j && !j.lesionado && !j.suspenso;
        });
        var somaCondicao = 0;
        elencoDisponivel.forEach(function(j) {
            somaCondicao += (typeof j.condicaoFisica === 'number') ? j.condicaoFisica : 100;
        });
        var condicaoMediaElenco = elencoDisponivel.length > 0 ? Math.round(somaCondicao / elencoDisponivel.length) : 100;

        var profundidadeDisponivel = elencoDisponivel.length;
        var penalidadeCondicao = Math.max(0, (100 - condicaoMediaElenco) * 0.8);
        var penalidadeProfundidade = profundidadeDisponivel < 18 ? (18 - profundidadeDisponivel) * 2 : 0;
        var bonusProfundidade = profundidadeDisponivel > 18 ? Math.min(10, (profundidadeDisponivel - 18) * 1.5) : 0;

        var indiceCarga = jogosUltimos5 * 16 + jogosDecisivosUltimos5 * 10 + jogosContinentaisUltimos5 * 7 + penalidadeCondicao + penalidadeProfundidade - bonusProfundidade;
        indiceCarga = Math.round(Math.max(0, Math.min(100, indiceCarga)));

        var nivel = 'BAIXA';
        if (indiceCarga >= 75) nivel = 'CRITICA';
        else if (indiceCarga >= 55) nivel = 'ALTA';
        else if (indiceCarga >= 30) nivel = 'MEDIA';

        return {
            diasAnalisados: diaIndice - inicio,
            jogosUltimos5: jogosUltimos5,
            jogosDecisivosUltimos5: jogosDecisivosUltimos5,
            jogosContinentaisUltimos5: jogosContinentaisUltimos5,
            condicaoMediaElenco: condicaoMediaElenco,
            profundidadeDisponivel: profundidadeDisponivel,
            indiceCarga: indiceCarga,
            nivel: nivel,
            multiplicadorLesao: 1 + (indiceCarga / 100) * 0.9,
            fatorRecuperacao: Math.max(0.8, 1 - (indiceCarga / 500))
        };
    };

    $scope.calcularRecuperacaoFisicaDiaria = function(partida, diaIndice) {
        var base = partida ? 28 : 32;
        var minimo = partida ? 20 : 24;
        var carga = $scope.calcularCargaCalendario(diaIndice);
        var bonusPreparador = 1;
        var preparador = ($scope.staffClube || []).find(function(item) { return item.id === 'preparador' && item.contratado; });
        if (preparador) bonusPreparador += Math.min(0.08, (preparador.nivel || 1) * 0.02);
        return Math.max(minimo, Math.round(base * (carga.fatorRecuperacao || 1) * $scope.calcularFatorRecuperacaoInfraestrutura() * bonusPreparador));
    };

    $scope.calcularQuedaFisicaPorTick = function(jogador, multiplicadorCansaco) {
        var fisico = jogador && jogador.atributos && typeof jogador.atributos.fisico === 'number' ? jogador.atributos.fisico : 75;
        var multiplicador = multiplicadorCansaco || 1;
        var base = 0.72 + (Math.max(0, 100 - fisico) / 250);
        return Math.max(0.55, base * multiplicador);
    };

    $scope.calcularChanceLesaoPorFadiga = function(condicaoFisica, cargaCalendario) {
        condicaoFisica = (typeof condicaoFisica === 'number') ? condicaoFisica : 100;
        if (condicaoFisica >= 60) return 0;

        var multiplicador = cargaCalendario && cargaCalendario.multiplicadorLesao ? cargaCalendario.multiplicadorLesao : 1;
        var fatorMedico = 1;
        if ($scope.clubeAtual) {
            normalizarInfraestruturaClubeInterno($scope.clubeAtual);
            fatorMedico = Math.max(0.85, 1 - (($scope.clubeAtual.infraestrutura.departamentoMedico.nivel - 1) * 0.06));
        }
        return Math.min(0.02, (60 - condicaoFisica) * 0.00015 * multiplicador * fatorMedico);
    };

    $scope.calcularChanceLesaoTreino = function(cargaCalendario) {
        var multiplicador = cargaCalendario && cargaCalendario.multiplicadorLesao ? cargaCalendario.multiplicadorLesao : 1;
        var fatorTreino = $scope.clubeAtual ? Math.max(0.9, 1 - (($scope.clubeAtual.infraestrutura && $scope.clubeAtual.infraestrutura.centroTreinamento ? $scope.clubeAtual.infraestrutura.centroTreinamento.nivel : 1) - 1) * 0.04) : 1;
        var bonusMedico = ($scope.staffClube || []).some(function(item) { return item.id === 'medico' && item.contratado; }) ? 0.94 : 1;
        return Math.min(0.05, 0.015 * multiplicador * fatorTreino * bonusMedico);
    };

    $scope.obterAlertaCargaCalendario = function() {
        if (!$scope.calendarioGeral || !$scope.calendarioGeral[$scope.diaAtual]) return null;

        var assinaturaElenco = 'sem-elenco';
        if ($scope.elencoAtual && $scope.elencoAtual.length) {
            var somaCondicao = 0;
            var indisponiveis = 0;
            $scope.elencoAtual.forEach(function(j) {
                somaCondicao += Math.round(j.condicaoFisica || 100);
                if (j.lesionado || j.suspenso) indisponiveis++;
            });
            assinaturaElenco = $scope.elencoAtual.length + '-' + somaCondicao + '-' + indisponiveis;
        }
        var cacheKey = $scope.diaAtual + '|' + assinaturaElenco;
        if ($scope._alertaCargaCalendarioCacheKey === cacheKey) return $scope._alertaCargaCalendarioCache;

        var dia = $scope.calendarioGeral[$scope.diaAtual];
        var temJogoHoje = !!($scope.obterMeuJogoHoje && $scope.obterMeuJogoHoje());
        var jogoDecisivo = temJogoHoje && $scope.isDiaDecisivoCalendario(dia);
        var carga = $scope.calcularCargaCalendario($scope.diaAtual);

        if (!jogoDecisivo && carga.indiceCarga < 55) {
            $scope._alertaCargaCalendarioCacheKey = cacheKey;
            $scope._alertaCargaCalendarioCache = null;
            return null;
        }

        var titulo = jogoDecisivo ? 'Jogo decisivo com carga acumulada' : 'Sequencia pesada no calendario';
        var mensagem = 'Carga ' + carga.nivel + ' (' + carga.indiceCarga + '/100): ' + carga.jogosUltimos5 + ' jogo(s) nos ultimos 5 dias, condicao media do elenco em ' + carga.condicaoMediaElenco + '% e ' + carga.profundidadeDisponivel + ' atletas disponiveis.';

        if (jogoDecisivo && carga.indiceCarga >= 55) {
            mensagem += ' Considere rodar o elenco e poupar jogadores mais cansados.';
        } else if (jogoDecisivo) {
            mensagem += ' O calendario esta controlado, mas a partida exige atencao maxima.';
        } else {
            mensagem += ' A recuperacao fisica sera menor enquanto a sequencia seguir pesada.';
        }

        $scope._alertaCargaCalendarioCacheKey = cacheKey;
        $scope._alertaCargaCalendarioCache = {
            titulo: titulo,
            mensagem: mensagem,
            nivel: carga.nivel,
            carga: carga,
            decisivo: jogoDecisivo
        };
        return $scope._alertaCargaCalendarioCache;
    };

    $scope.obterStatusDiaCalendario = function(indice) {
        indice = parseInt(indice, 10);
        if (indice === $scope.diaAtual) return 'HOJE';
        if (indice < $scope.diaAtual) return 'CONCLUIDO';
        return 'PROXIMO';
    };

    $scope.deveMostrarDiaCalendario = function(dia, indice) {
        var filtro = $scope.filtroCalendario || 'TODOS';
        indice = parseInt(indice, 10);
        if (filtro === 'TODOS') return true;
        if (filtro === 'JOGOS') return !!$scope.obterMeuJogoNoDia(indice);
        if (filtro === 'LIVRES') return !$scope.obterMeuJogoNoDia(indice);
        if (filtro === 'MERCADO') return $scope.isJanelaTransferenciaAbertaNoDia(indice);
        if (filtro === 'FINANCEIRO') return $scope.isFechamentoFinanceiro(indice);
        return dia && dia.tipo === filtro;
    };

    $scope.atualizarCalendarioFiltrado = function() {
        if (!$scope.calendarioGeral) {
            $scope.calendarioFiltrado = [];
            return $scope.calendarioFiltrado;
        }
        var dias = [];
        for (var i = 0; i < $scope.calendarioGeral.length; i++) {
            var dia = $scope.calendarioGeral[i];
            if ($scope.deveMostrarDiaCalendario(dia, i)) {
                dias.push({ indice: i, dia: dia });
            }
        }
        $scope.calendarioFiltrado = dias;
        return $scope.calendarioFiltrado;
    };

    $scope.obterDiasCalendarioFiltrados = function() {
        if (!$scope.calendarioFiltrado || !$scope.calendarioFiltrado.length) {
            return $scope.atualizarCalendarioFiltrado();
        }
        return $scope.calendarioFiltrado;
    };

    $scope.obterTextoJanelaCalendario = function(indice) {
        var janela = $scope.obterJanelaTransferenciaAtual(parseInt(indice, 10));
        if (!janela) return '';
        return 'Janela aberta ate Dia ' + (janela.fim + 1);
    };

    // FASE 15: MASTER CALENDAR
    $scope.obterMeuJogoHoje = function() {
        return $scope.obterMeuJogoNoDia($scope.diaAtual);
    };

    $scope.obterMeuJogoNoDia = function(indice) {
        var diaObj = $scope.calendarioGeral[indice];
        if (!diaObj) return null;

        if (diaObj.tipo === 'LIGA') {
            return $scope.calendario[diaObj.rodadaLiga];
        } else if (diaObj.tipo === 'COPA') {
            if (!$scope.copaBrasil || !$scope.copaBrasil.chaves[diaObj.fase]) return null;
            var meusJogos = $scope.copaBrasil.chaves[diaObj.fase].filter(function(c) {
                return c.time1.id === $scope.clubeAtual.id || c.time2.id === $scope.clubeAtual.id;
            });
            if (meusJogos.length > 0) {
                var ch = meusJogos[0];
                var mandante = diaObj.perna === 'ida' ? ch.time1 : ch.time2;
                var visitante = diaObj.perna === 'ida' ? ch.time2 : ch.time1;
                var golsM = diaObj.perna === 'ida' ? ch.golsIda1 : ch.golsVolta2;
                var golsV = diaObj.perna === 'ida' ? ch.golsIda2 : ch.golsVolta1;
                var jogoJaFoiDisputado = diaObj.perna === 'ida' ? ch.jogadoIda : ch.jogadoVolta;
                
                if (!diaObj._meuJogoProxy) diaObj._meuJogoProxy = { éCopa: true, isGrupo: false };
                diaObj._meuJogoProxy.chaveCopa = ch;
                diaObj._meuJogoProxy.perna = diaObj.perna;
                diaObj._meuJogoProxy.mandante = mandante;
                diaObj._meuJogoProxy.visitante = visitante;
                diaObj._meuJogoProxy.golsMandante = golsM !== undefined ? golsM : 0;
                diaObj._meuJogoProxy.golsVisitante = golsV !== undefined ? golsV : 0;
                diaObj._meuJogoProxy.jogado = !!jogoJaFoiDisputado;
                return diaObj._meuJogoProxy;
            }
        } else if (diaObj.tipo === 'CONTINENTAL') {
            var meusJogos = [];
            var chOuJogo = null;
            var eGrupo = (diaObj.fase < 6);

            if (eGrupo) {
                // Procurar nos Grupos
                var procurarNosGrupos = function(comp) {
                    if (!comp || !comp.grupos) return null;
                    for (var i = 0; i < comp.grupos.length; i++) {
                        var rodada = comp.grupos[i].rodadas[diaObj.fase];
                        var jogoDoClube = rodada.find(function(j) { return j.time1.id === $scope.clubeAtual.id || j.time2.id === $scope.clubeAtual.id; });
                        if (jogoDoClube) {
                            return { jogo: jogoDoClube, grupo: comp.grupos[i] };
                        }
                    }
                    return null;
                };

                var resLib = procurarNosGrupos($scope.libertadores);
                var resSul = procurarNosGrupos($scope.sulAmericana);
                var resEncontrado = resLib || resSul;
                
                if (resEncontrado) {
                    var jg = resEncontrado.jogo;
                    if (!diaObj._meuJogoProxy) diaObj._meuJogoProxy = { éCopa: true, isGrupo: true };
                    diaObj._meuJogoProxy.chaveCopa = jg;
                    diaObj._meuJogoProxy.grupoObj = resEncontrado.grupo;
                    diaObj._meuJogoProxy.perna = 'ida'; // Só para reaproveitar lógica de renderização
                    diaObj._meuJogoProxy.mandante = jg.time1;
                    diaObj._meuJogoProxy.visitante = jg.time2;
                    diaObj._meuJogoProxy.golsMandante = jg.golsIda1 !== undefined ? jg.golsIda1 : 0;
                    diaObj._meuJogoProxy.golsVisitante = jg.golsIda2 !== undefined ? jg.golsIda2 : 0;
                    diaObj._meuJogoProxy.jogado = jg.jogadoIda;
                    return diaObj._meuJogoProxy;
                }
            } else {
                // Procurar no Mata-Mata (fase 6, 7, 8, 9 correspondem a Oitavas, Quartas, Semi, Final)
                var indiceMataMata = diaObj.fase - 6;
                var meusJogosLib = $scope.libertadores && $scope.libertadores.chaves[indiceMataMata] ? $scope.libertadores.chaves[indiceMataMata].filter(function(c) {
                    return c.time1.id === $scope.clubeAtual.id || c.time2.id === $scope.clubeAtual.id;
                }) : [];
                var meusJogosSula = $scope.sulAmericana && $scope.sulAmericana.chaves[indiceMataMata] ? $scope.sulAmericana.chaves[indiceMataMata].filter(function(c) {
                    return c.time1.id === $scope.clubeAtual.id || c.time2.id === $scope.clubeAtual.id;
                }) : [];
                
                meusJogos = meusJogosLib.length > 0 ? meusJogosLib : meusJogosSula;
                if (meusJogos.length > 0) {
                    var ch = meusJogos[0];
                    var mandante = diaObj.perna === 'ida' ? ch.time1 : ch.time2;
                    var visitante = diaObj.perna === 'ida' ? ch.time2 : ch.time1;
                    var golsM = diaObj.perna === 'ida' ? ch.golsIda1 : ch.golsVolta2;
                    var golsV = diaObj.perna === 'ida' ? ch.golsIda2 : ch.golsVolta1;
                    var jogoJaFoiDisputado = diaObj.perna === 'ida' ? ch.jogadoIda : ch.jogadoVolta;
                    
                    if (!diaObj._meuJogoProxy) diaObj._meuJogoProxy = { éCopa: true, isGrupo: false };
                    diaObj._meuJogoProxy.chaveCopa = ch;
                    diaObj._meuJogoProxy.perna = diaObj.perna;
                    diaObj._meuJogoProxy.mandante = mandante;
                    diaObj._meuJogoProxy.visitante = visitante;
                    diaObj._meuJogoProxy.golsMandante = golsM !== undefined ? golsM : 0;
                    diaObj._meuJogoProxy.golsVisitante = golsV !== undefined ? golsV : 0;
                    diaObj._meuJogoProxy.jogado = !!jogoJaFoiDisputado;
                    return diaObj._meuJogoProxy;
                }
            }
        }
        return null;
    };

    $scope.obterJogoDeHoje = function() {
        return $scope.obterMeuJogoNoDia($scope.diaAtual);
    };

    // FASE 6: Avançar 1 dia quando o clube não tiver jogo (Recuperação de Fadiga FASE 17)
    $scope.avancarDiaLivre = function() {
        if ($scope.obterMeuJogoHoje()) {
            alert("Você tem um jogo hoje! Não pode avançar o dia sem jogar.");
            return;
        }

        $scope.concluirPartida(null);
    };

    function resumirTimePreJogo(time) {
        return {
            id: time && time.id !== undefined ? time.id : null,
            nome: time && time.nome ? time.nome : 'Time indefinido',
            sigla: time && time.sigla ? time.sigla : '---',
            reputacao: time && typeof time.reputacao === 'number' ? time.reputacao : 70,
            divisao: time && time.divisao ? time.divisao : null
        };
    }

    function obterNumeroPreJogo(valor, padrao) {
        return (typeof valor === 'number' && isFinite(valor)) ? valor : padrao;
    }

    function calcularOverallPreJogo(jogador) {
        if (!jogador || !jogador.atributos) return 70;
        var attr = jogador.atributos;
        if (jogador.posicao === 'GOL') {
            var reflexo = obterNumeroPreJogo(attr.reflexo, 75);
            var posicionamento = obterNumeroPreJogo(attr.posicionamento, reflexo);
            var distribuicao = obterNumeroPreJogo(attr.distribuicao, obterNumeroPreJogo(attr.passe, 75));
            var fisicoGol = obterNumeroPreJogo(attr.fisico, 75);
            return Math.round((reflexo * 2 + posicionamento + distribuicao + fisicoGol) / 5);
        }
        var finalizacao = obterNumeroPreJogo(attr.finalizacao, 75);
        var passe = obterNumeroPreJogo(attr.passe, 75);
        var marcacao = obterNumeroPreJogo(attr.marcacao, 75);
        var velocidade = obterNumeroPreJogo(attr.velocidade, 75);
        var fisico = obterNumeroPreJogo(attr.fisico, 75);
        return Math.round((finalizacao + passe + marcacao + velocidade + fisico) / 5);
    }

    function obterElencoPreJogo(clube) {
        if (!clube) return [];
        if ($scope.clubeAtual && clube.id === $scope.clubeAtual.id) {
            return ($scope.elencoAtual || []).slice();
        }
        return ($scope.jogadores || []).filter(function(j) {
            return j && j.clubeId === clube.id;
        });
    }

    function obterJogadoresDisponiveisPreJogo(elenco) {
        return (elenco || []).filter(function(j) {
            return j && !j.lesionado && !j.suspenso && !j.expulso;
        });
    }

    function ordenarPorOverallPreJogo(jogadores) {
        return (jogadores || []).slice().sort(function(a, b) {
            return calcularOverallPreJogo(b) - calcularOverallPreJogo(a);
        });
    }

    function calcularCondicaoMediaPreJogo(elenco) {
        var disponiveis = obterJogadoresDisponiveisPreJogo(elenco);
        if (disponiveis.length === 0) return elenco && elenco.length > 0 ? 0 : 100;

        var soma = 0;
        disponiveis.forEach(function(j) {
            soma += obterNumeroPreJogo(j.condicaoFisica, 100);
        });
        return Math.round(soma / disponiveis.length);
    }

    function calcularIndisponiveisPreJogo(elenco) {
        var total = 0;
        (elenco || []).forEach(function(j) {
            if (j && (j.lesionado || j.suspenso)) total++;
        });
        return total;
    }

    function isPressaoAltaPreJogo(marcacao) {
        return marcacao === 'Pressão Alta' || marcacao === 'Pressao Alta';
    }

    function normalizarNivelCargaPreJogo(carga) {
        return carga && carga.nivel ? carga.nivel : 'BAIXA';
    }

    function calcularRiscoFisicoPreJogo(condicaoMedia, indisponiveis, carga) {
        var nivel = normalizarNivelCargaPreJogo(carga);
        if (condicaoMedia < 65 || nivel === 'ALTA' || nivel === 'CRITICA' || indisponiveis >= 4) return 'Alto';
        if (condicaoMedia < 80 || nivel === 'MEDIA' || indisponiveis >= 2) return 'Medio';
        return 'Baixo';
    }

    function montarRecomendacoesPreJogo(analiseBase, carga) {
        var recomendacoes = [];
        var nivelCarga = normalizarNivelCargaPreJogo(carga);
        var indiceCarga = carga && typeof carga.indiceCarga === 'number' ? carga.indiceCarga : 0;

        if (analiseBase.condicaoMedia < 70) {
            recomendacoes.push({ tipo: 'fisico', texto: 'Elenco cansado: considere rotacao e poupar titulares abaixo de 70%.' });
        } else if (nivelCarga === 'ALTA' || nivelCarga === 'CRITICA') {
            recomendacoes.push({ tipo: 'fisico', texto: 'Sequencia pesada no calendario: monitore fadiga e risco de lesao.' });
        } else {
            recomendacoes.push({ tipo: 'fisico', texto: 'Condicao fisica controlada para manter o plano inicial.' });
        }

        if (analiseBase.diferencaForca <= -5) {
            recomendacoes.push({ tipo: 'tatica', texto: 'Adversario mais forte: uma postura cautelosa pode reduzir espacos e controlar riscos.' });
        } else if (analiseBase.diferencaForca >= 8) {
            recomendacoes.push({ tipo: 'tatica', texto: 'Seu time chega mais forte: da para pressionar e buscar postura ofensiva.' });
        } else {
            recomendacoes.push({ tipo: 'tatica', texto: 'Confronto equilibrado: ajuste mentalidade conforme mando e momento fisico.' });
        }

        if (isPressaoAltaPreJogo(analiseBase.taticasAtuais.marcacao) && (analiseBase.condicaoMedia < 78 || indiceCarga >= 45)) {
            recomendacoes.push({ tipo: 'fisico', texto: 'Pressao alta com elenco desgastado aumenta fadiga; tenha substituicoes planejadas.' });
        }

        if (analiseBase.indisponiveis >= 2) {
            recomendacoes.push({ tipo: 'elenco', texto: 'Ha muitos indisponiveis: revise a escalacao antes de confirmar.' });
        } else if (analiseBase.indisponiveis > 0) {
            recomendacoes.push({ tipo: 'elenco', texto: 'Existe indisponivel no elenco: confirme se o banco cobre a posicao.' });
        }

        if (recomendacoes.length < 2) {
            recomendacoes.push({ tipo: 'jogo', texto: 'Use o pre-jogo para confirmar plano, mando e encaixes principais.' });
        }

        return recomendacoes.slice(0, 4);
    }

    $scope.calcularForcaElencoPreJogo = function(clube, preferirEscalacao) {
        var elenco = obterElencoPreJogo(clube);
        var candidatos = obterJogadoresDisponiveisPreJogo(elenco);
        var jogadoresBase = [];

        if (preferirEscalacao) {
            jogadoresBase = candidatos.filter(function(j) { return j.emCampo; });
        }
        if (jogadoresBase.length === 0) {
            jogadoresBase = ordenarPorOverallPreJogo(candidatos).slice(0, 11);
        }
        if (jogadoresBase.length === 0) {
            var reputacao = clube && typeof clube.reputacao === 'number' ? clube.reputacao : 70;
            if (clube && clubeEhAtual(clube.id)) reputacao *= $scope.calcularFatorAmbiente($scope.ambienteElenco && $scope.ambienteElenco.valor);
            return Math.round(reputacao);
        }

        var soma = 0;
        jogadoresBase.forEach(function(j) {
            var overall = calcularOverallPreJogo(j);
            var impactoFuncao = $scope.obterImpactoFuncaoTatica ? $scope.obterImpactoFuncaoTatica(j) : { ataque: 0, defesa: 0, posse: 0 };
            var fatorFadiga = ($scope.clubeAtual && clube && clube.id === $scope.clubeAtual.id) ? $scope.calcularFatorFadiga(j.condicaoFisica) : 1;
            var fatorMoral = (typeof j.moral === 'number' && j.moral < 50) ? (0.8 + ((j.moral / 50) * 0.2)) : 1;
            soma += (overall + ((impactoFuncao.ataque + impactoFuncao.defesa + impactoFuncao.posse) / 3)) * fatorFadiga * fatorMoral * $scope.obterFatorEntrosamentoSetor(j);
        });
        var media = soma / jogadoresBase.length;
        if (clube && clubeEhAtual(clube.id)) media *= $scope.calcularFatorAmbiente($scope.ambienteElenco && $scope.ambienteElenco.valor);
        return Math.round(media);
    };

    $scope.obterJogadoresChavePreJogo = function(clube) {
        return ordenarPorOverallPreJogo(obterJogadoresDisponiveisPreJogo(obterElencoPreJogo(clube))).slice(0, 3).map(function(j, index) {
            return {
                id: j.id !== undefined ? j.id : ((clube && clube.id !== undefined ? clube.id : 'time') + '_chave_' + index),
                nome: j.nome || 'Jogador sem nome',
                posicao: j.posicao || '-',
                overall: calcularOverallPreJogo(j)
            };
        });
    };

    $scope.montarAnalisePreJogo = function(partida, modo) {
        var clubeAtual = $scope.clubeAtual || {};
        var mandante = partida && partida.mandante ? partida.mandante : {};
        var visitante = partida && partida.visitante ? partida.visitante : {};
        var usuarioMandante = mandante && clubeAtual && mandante.id === clubeAtual.id;
        var adversario = usuarioMandante ? visitante : mandante;
        var calendarioDia = $scope.calendarioGeral && $scope.calendarioGeral[$scope.diaAtual] ? $scope.calendarioGeral[$scope.diaAtual] : null;
        var elencoMeuTime = obterElencoPreJogo(clubeAtual);
        var carga = $scope.calcularCargaCalendario ? $scope.calcularCargaCalendario($scope.diaAtual) : { nivel: 'BAIXA', indiceCarga: 0 };
        var forcaMeuTime = $scope.calcularForcaElencoPreJogo(clubeAtual, true);
        var forcaAdversario = $scope.calcularForcaElencoPreJogo(adversario, false);
        var condicaoMedia = calcularCondicaoMediaPreJogo(elencoMeuTime);
        var indisponiveis = calcularIndisponiveisPreJogo(elencoMeuTime);
        var diferencaForca = forcaMeuTime - forcaAdversario;
        var taticasAtuais = {
            mentalidade: $scope.taticas && $scope.taticas.mentalidade ? $scope.taticas.mentalidade : 'Equilibrado',
            foco: $scope.taticas && $scope.taticas.foco ? $scope.taticas.foco : 'Misto',
            marcacao: $scope.taticas && $scope.taticas.marcacao ? $scope.taticas.marcacao : 'Recuada'
        };

        var analise = {
            modo: modo === 'rapido' ? 'rapido' : 'completo',
            modoLabel: modo === 'rapido' ? 'Resultado rapido' : 'Partida 3D',
            clubeAtualId: $scope.clubeAtual && $scope.clubeAtual.id,
            competicao: calendarioDia && calendarioDia.titulo ? calendarioDia.titulo : 'Partida',
            dia: (typeof $scope.diaAtual === 'number' ? $scope.diaAtual : 0) + 1,
            mandante: resumirTimePreJogo(mandante),
            visitante: resumirTimePreJogo(visitante),
            meuTime: resumirTimePreJogo(clubeAtual),
            adversario: resumirTimePreJogo(adversario),
            mando: usuarioMandante ? 'Mandante' : 'Visitante',
            forcaMeuTime: forcaMeuTime,
            forcaAdversario: forcaAdversario,
            diferencaForca: diferencaForca,
            riscoFisico: calcularRiscoFisicoPreJogo(condicaoMedia, indisponiveis, carga),
            condicaoMedia: condicaoMedia,
            indisponiveis: indisponiveis,
            cargaCalendario: {
                nivel: normalizarNivelCargaPreJogo(carga),
                indiceCarga: carga && typeof carga.indiceCarga === 'number' ? carga.indiceCarga : 0
            },
            taticasAtuais: taticasAtuais,
            recomendacoes: [],
            jogadoresChaveAdversario: $scope.obterJogadoresChavePreJogo(adversario)
        };
        var analista = ($scope.staffClube || []).find(function(item) { return item.id === 'analista' && item.contratado; });
        analise.analistaAtivo = !!analista;
        analise.confiancaAnalise = analista ? Math.min(95, 70 + (analista.nivel || 1) * 8) : 60;
        if (analista) analise.recomendacoes.push({ tipo: 'analise', texto: 'Relatório do analista disponível com ' + analise.confiancaAnalise + '% de confiança.' });

        if (diferencaForca <= -5) {
            analise.statusConfronto = 'Adversario mais forte';
            analise.statusClasse = 'danger';
        } else if (diferencaForca >= 8) {
            analise.statusConfronto = 'Seu time e favorito';
            analise.statusClasse = 'success';
        } else {
            analise.statusConfronto = 'Confronto equilibrado';
            analise.statusClasse = 'balanced';
        }

        analise.recomendacoes = montarRecomendacoesPreJogo(analise, carga);
        return analise;
    };

    $scope.abrirPreJogo = function(modo) {
        var partida = $scope.obterMeuJogoHoje();
        if (!partida) {
            alert("Você não tem jogo hoje!");
            return;
        }

        // A preparação termina antes do primeiro compromisso oficial, nunca depois de uma rodada.
        $scope.atualizarFasePreparacao();

        var emCampo = ($scope.elencoAtual || []).filter(function(j) { return j.emCampo; });
        if (emCampo.length !== 11) {
            alert("⚠️ Escalação Incompleta! Você precisa de exatos 11 jogadores escalados na Prancheta Tática para jogar.");
            return;
        }

        var modoNormalizado = modo === 'rapido' ? 'rapido' : 'completo';
        $scope.preJogo = {
            visivel: true,
            modo: modoNormalizado,
            partida: partida,
            analise: $scope.montarAnalisePreJogo(partida, modoNormalizado),
            telaAnterior: $scope.telaAtual || 'dashboard'
        };
        $scope.preJogo.analise.narrativa = $scope.obterNarrativaPreJogo(partida);
        $scope.telaAtual = 'pre_jogo';
    };

    $scope.fecharPreJogo = function() {
        var telaAnterior = $scope.preJogo && $scope.preJogo.telaAnterior ? $scope.preJogo.telaAnterior : 'dashboard';
        $scope.preJogo = {
            visivel: false,
            modo: null,
            partida: null,
            analise: null,
            telaAnterior: 'dashboard'
        };
        $scope.telaAtual = telaAnterior === 'pre_jogo' ? 'dashboard' : telaAnterior;
    };

    $scope.ajustarTaticasPreJogo = function() {
        if ($scope.preJogo && $scope.preJogo.partida) {
            $scope.preJogo.visivel = false;
            $scope.preJogo.telaAnterior = 'dashboard';
        }
        $scope.mudarTela('taticas');
    };

    $scope.voltarAoPreJogo = function() {
        if (!$scope.preJogo || !$scope.preJogo.partida) {
            alert("Nenhuma partida preparada.");
            $scope.mudarTela('dashboard');
            return;
        }

        var partidaHoje = $scope.obterMeuJogoHoje();
        if (!partidaHoje || partidaHoje.jogado) {
            alert("A partida preparada não está mais disponível.");
            $scope.preJogo = {
                visivel: false,
                modo: null,
                partida: null,
                analise: null,
                telaAnterior: 'dashboard'
            };
            $scope.mudarTela('dashboard');
            return;
        }

        var emCampo = ($scope.elencoAtual || []).filter(function(j) { return j.emCampo; });
        if (emCampo.length !== 11) {
            alert("Escalação incompleta: você precisa de exatos 11 jogadores escalados para voltar ao pré-jogo.");
            return;
        }

        var modo = $scope.preJogo.modo || 'completo';
        var narrativaPreservada = $scope.preJogo.analise && $scope.preJogo.analise.narrativa;
        $scope.preJogo.partida = partidaHoje;
        $scope.preJogo.analise = $scope.montarAnalisePreJogo(partidaHoje, modo);
        $scope.preJogo.analise.narrativa = narrativaPreservada || $scope.obterNarrativaPreJogo(partidaHoje);
        $scope.preJogo.visivel = true;
        $scope.preJogo.telaAnterior = 'dashboard';
        $scope.telaAtual = 'pre_jogo';
    };

    $scope.confirmarPreJogo = function() {
        if (!$scope.preJogo || !$scope.preJogo.partida) {
            alert("Nenhuma partida preparada.");
            $scope.fecharPreJogo();
            return;
        }
        var partida = $scope.preJogo.partida;
        var modo = $scope.preJogo.modo || 'completo';
        $scope.preJogo = {
            visivel: false,
            modo: null,
            partida: null,
            analise: null,
            telaAnterior: 'dashboard'
        };
        $scope.executarPartidaPreparada(partida, modo);
    };

    // FASE 6: MOTOR DE JOGO
    $scope.executarPartidaPreparada = function(partida, modo) {
        if (!partida) {
            alert("Você não tem jogo hoje!");
            $scope.fecharPreJogo();
            return;
        }

        // FASE 17: COLETIVA DE IMPRENSA ANTES DE JOGOS IMPORTANTES
        if (!$scope.coletivaRespondida) {
            var diaCalendario = $scope.calendarioGeral && $scope.calendarioGeral[$scope.diaAtual] ? $scope.calendarioGeral[$scope.diaAtual] : null;
            var eClassicoOuDecisivo = (diaCalendario && diaCalendario.tipo === 'COPA') || (partida.mandante.reputacao >= 80 && partida.visitante.reputacao >= 80);
            if (eClassicoOuDecisivo) {
                $scope.iniciarColetiva(partida, modo);
                return;
            }
        }
        $scope.coletivaRespondida = false; // Reset para a próxima rodada

        if (modo === 'rapido') {
            $scope.calcularResultadoRapido(partida);
            $scope.finalizarPartidaUsuario(partida, 'rapido');
        } else {
            $scope.iniciarPartidaCompleta(partida);
        }
    };

    $scope.prepararPartida = function(modo) {
        $scope.abrirPreJogo(modo);
    };

    $scope.calcularForcaTime = function() {
        var forcaTime = 0;
        var emCampo = $scope.elencoAtual.filter(function(j) { return j.emCampo; });
        emCampo.forEach(function(j) { 
            var penalty = 1;
            if (j.moral !== undefined && j.moral < 50) {
                penalty = 0.8 + ((j.moral / 50) * 0.2); // Moral 0 = 80% do overall. Moral 50 = 100%.
            }
            var fatorFadiga = $scope.calcularFatorFadiga(j.condicaoFisica);
            var adaptacao = j.adaptacaoClube === undefined ? 100 : Number(j.adaptacaoClube);
            var fatorAdaptacao = 0.94 + (Math.max(0, Math.min(100, isNaN(adaptacao) ? 100 : adaptacao)) / 100) * 0.06;
            var impactoFuncao = $scope.obterImpactoFuncaoTatica ? $scope.obterImpactoFuncaoTatica(j) : { ataque: 0, defesa: 0, posse: 0 };
            forcaTime += (($scope.calcularOverall(j) + ((impactoFuncao.ataque + impactoFuncao.defesa + impactoFuncao.posse) / 3)) * penalty * fatorFadiga * fatorAdaptacao * $scope.obterFatorEntrosamentoSetor(j));
        });
        return (forcaTime / 11) * $scope.calcularFatorAmbiente($scope.ambienteElenco && $scope.ambienteElenco.valor) * $scope.obterFatorEntrosamento();
    };

    $scope.calcularFatorFadiga = function(condicaoFisica) {
        condicaoFisica = (typeof condicaoFisica === 'number') ? condicaoFisica : 100;
        return Math.max(0.55, Math.min(1, condicaoFisica / 100));
    };

    $scope.aplicarFadigaAtributo = function(valor, condicaoFisica) {
        valor = (typeof valor === 'number') ? valor : 75;
        return Math.round(valor * $scope.calcularFatorFadiga(condicaoFisica));
    };

    $scope.aplicarFadigaAtributoGoleiro = function(valor, condicaoFisica) {
        valor = (typeof valor === 'number') ? valor : 75;
        var perda = 1 - $scope.calcularFatorFadiga(condicaoFisica);
        return Math.round(valor * (1 - perda * 0.35));
    };

    $scope.gerarGols = function(forcaBase) {
        var chanceBase = forcaBase / 100; // ex: 75 de overall = 0.75
        var gols = 0;
        for(var i=0; i<6; i++) {
            if (Math.random() < (chanceBase * 0.42)) gols++;
        }
        return gols;
    };

    // FASE 16: Sistema de Artilharia
    $scope.escolherMarcadorGol = function(elenco) {
        if (!elenco || elenco.length === 0) return null;
        var atacantes = elenco.filter(function(j) { return j.posicao === 'ATA'; });
        var meias = elenco.filter(function(j) { return j.posicao === 'MEI'; });
        
        var r = Math.random();
        if (r < 0.6 && atacantes.length > 0) {
            return atacantes[Math.floor(Math.random() * atacantes.length)];
        } else if (r < 0.9 && meias.length > 0) {
            return meias[Math.floor(Math.random() * meias.length)];
        } else {
            return elenco[Math.floor(Math.random() * elenco.length)];
        }
    };

    $scope.registrarGolsNaDB = function(clubeId, quantidade, elencoRestrito) {
        if (quantidade <= 0) return;
        var elenco = elencoRestrito || $scope.jogadores.filter(function(j) { return j.clubeId === clubeId; });
        for (var i = 0; i < quantidade; i++) {
            var jSelecionado = $scope.escolherMarcadorGol(elenco);
            if (jSelecionado) {
                if (!jSelecionado.golsTemporada) jSelecionado.golsTemporada = 0;
                jSelecionado.golsTemporada++;
            }
        }
    };

    $scope.calcularResultadoRapido = function(partida) {
        var forcaUsuario = $scope.calcularForcaTime();
        var userIsMandante = partida.mandante.id === $scope.clubeAtual.id;
        var adversario = userIsMandante ? partida.visitante : partida.mandante;
        var forcaAdv = $scope.calcularForcaElencoPreJogo(adversario, false);

        var golsUser = $scope.gerarGols(forcaUsuario);
        var golsAdv = $scope.gerarGols(forcaAdv);

        if (userIsMandante) {
            partida.golsMandante = golsUser;
            partida.golsVisitante = golsAdv;
        } else {
            partida.golsMandante = golsAdv;
            partida.golsVisitante = golsUser;
        }
        
        var emCampo = $scope.elencoAtual.filter(function(j) { return j.emCampo; });
        
        if (userIsMandante) {
            $scope.registrarGolsNaDB(partida.mandante.id, partida.golsMandante, emCampo);
            $scope.registrarGolsNaDB(partida.visitante.id, partida.golsVisitante, null);
        } else {
            $scope.registrarGolsNaDB(partida.visitante.id, partida.golsVisitante, emCampo);
            $scope.registrarGolsNaDB(partida.mandante.id, partida.golsMandante, null);
        }

        var preco = ($scope.configFinanceira && $scope.configFinanceira.precoIngresso) ? parseInt($scope.configFinanceira.precoIngresso) : 80;
        var ocupacao = 0.5 + Math.random() * 0.5;
        if (preco == 40) ocupacao = 0.85 + Math.random() * 0.15;
        else if (preco == 150) ocupacao = 0.4 + Math.random() * 0.3;
        if (partida.mandante && $scope.clubeAtual && partida.mandante.id === $scope.clubeAtual.id) {
            ocupacao = Math.min(1, ocupacao * $scope.calcularMultiplicadorOcupacaoInfraestrutura());
        }
        
        var publico = partida.mandante.estadio ? Math.floor(partida.mandante.estadio.capacidade * ocupacao) : 20000;
        $scope.estatisticas = {
            publico: publico,
            renda: publico * preco
        };

        // FASE 18: Lógica de Cartões no Modo Rápido
        var titulares = emCampo;
        if (titulares.length > 0) {
            var totalEventosCartao = Math.floor(Math.random() * 5); // 0 a 4 eventos de cartão
            for (var i = 0; i < totalEventosCartao; i++) {
                var jAlvo = titulares[Math.floor(Math.random() * titulares.length)];
                if (!jAlvo.expulso) {
                    if (Math.random() > 0.1) { // 90% chance de ser amarelo
                        jAlvo.cartoesAmarelos = (jAlvo.cartoesAmarelos || 0) + 1;
                        if (jAlvo.cartoesAmarelos >= 3) {
                            jAlvo.cartoesAmarelos = 0;
                            jAlvo.suspenso = true;
                            jAlvo.acabouDeSerSuspenso = true;
                            jAlvo.expulso = true;
                            jAlvo.emCampo = false;
                        }
                    } else { // 10% de chance de vermelho direto
                        jAlvo.suspenso = true;
                        jAlvo.acabouDeSerSuspenso = true;
                        jAlvo.expulso = true;
                        jAlvo.emCampo = false;
                    }
                }
            }
        }
    };

    $scope.iniciarPartidaCompleta = function(partida) {
        $scope.partidaAoVivo = partida;
        partida.golsMandante = 0;
        partida.golsVisitante = 0;
        $scope.minutoAtual = 0;
        // Telemetria de chutes/xG desta partida
        $scope.partidaAoVivo.telemetriaShots = [];
        
        // FASE 8: Estatísticas e Lógica
        var preco = ($scope.configFinanceira && $scope.configFinanceira.precoIngresso) ? parseInt($scope.configFinanceira.precoIngresso) : 80;
        var ocupacao = 0.5 + Math.random() * 0.5;
        if (preco == 40) ocupacao = 0.85 + Math.random() * 0.15;
        else if (preco == 150) ocupacao = 0.4 + Math.random() * 0.3;
        if (partida.mandante && $scope.clubeAtual && partida.mandante.id === $scope.clubeAtual.id) {
            ocupacao = Math.min(1, ocupacao * $scope.calcularMultiplicadorOcupacaoInfraestrutura());
        }

        $scope.estatisticas = {
            posseMandante: 50,
            posseVisitante: 50,
            chutesMandante: 0,
            chutesVisitante: 0,
            publico: Math.floor(partida.mandante.estadio.capacidade * ocupacao)
        };
        $scope.estatisticas.renda = $scope.estatisticas.publico * preco;

        $scope.substituicoesFeitas = 0;
        $scope.pausasTaticasFeitas = 0;
        $scope.lesoesNaPartida = 0;
        $scope.elencoAtual.forEach(function(j) { j.substituidoNaPartida = false; });
        $scope.partidaPausada = false;
        $scope.intervaloJaAconteceu = false;
        var forcaMeuTimeAoVivo = $scope.calcularForcaTime();
        var adversarioAoVivo = partida.mandante.id === $scope.clubeAtual.id ? partida.visitante : partida.mandante;
        var forcaAdversarioAoVivo = $scope.calcularForcaElencoPreJogo(adversarioAoVivo, false);
        if (partida.mandante.id === $scope.clubeAtual.id) {
            $scope.forcaMandanteAoVivo = forcaMeuTimeAoVivo;
            $scope.forcaVisitanteAoVivo = forcaAdversarioAoVivo;
        } else {
            $scope.forcaMandanteAoVivo = forcaAdversarioAoVivo;
            $scope.forcaVisitanteAoVivo = forcaMeuTimeAoVivo;
        }

        $scope.tocarSom('apito');
        $scope.narracao = ["O árbitro apita e a bola está rolando! Público presente: " + $scope.estatisticas.publico.toLocaleString('pt-BR')];
        $scope.telaAtual = 'partida'; 
        $scope.partidaEmAndamento = true;
        
        $scope.rodarMinuto();
    };

    $scope.retomarPartida = function() {
        if ($scope.partidaEmAndamento) {
            $scope.partidaPausada = false;
            $scope.telaAtual = 'partida';
            $scope.forcaMandanteAoVivo = $scope.calcularForcaTime();
            $scope.rodarMinuto();
        }
    };

    $scope.pausarPartidaManualmente = function() {
        if (!$scope.partidaEmAndamento || $scope.partidaPausada) return false;
        $scope.partidaPausada = true;
        $scope.pausasTaticasFeitas = ($scope.pausasTaticasFeitas || 0) + 1;
        $scope.narracao.unshift($scope.minutoAtual + "' - Jogo pausado pelo treinador para ajustes táticos.");
        return true;
    };
    $scope.obterResumoPausaTatica = function() {
        var elenco = Array.isArray($scope.elencoAtual) ? $scope.elencoAtual : [];
        var impedidos = elenco.filter(function(jogador) {
            return jogador && (jogador.expulso || jogador.lesionado || jogador.suspenso || jogador.substituidoNaPartida);
        });
        return {
            feitas: $scope.substituicoesFeitas || 0,
            restantes: Math.max(0, 5 - ($scope.substituicoesFeitas || 0)),
            impedidos: impedidos
        };
    };
    $scope.obterSugestaoSubstituicao = function() {
        if (!$scope.partidaPausada || ($scope.substituicoesFeitas || 0) >= 5) return null;
        var emCampo = ($scope.elencoAtual || []).filter(function(j) { return j.emCampo && !j.expulso && !j.lesionado; });
        var banco = ($scope.elencoAtual || []).filter(function(j) { return !j.emCampo && !$scope.jogadorBloqueadoParaEntrar(j); });
        var cansado = emCampo.slice().sort(function(a, b) { return (a.condicaoFisica || 100) - (b.condicaoFisica || 100); })[0];
        if (!cansado || (cansado.condicaoFisica || 100) > 62) return null;
        var reserva = banco.filter(function(j) { return j.posicao === cansado.posicao; }).sort(function(a, b) { return $scope.calcularOverall(b) - $scope.calcularOverall(a); })[0];
        if (!reserva) reserva = banco.slice().sort(function(a, b) { return $scope.calcularOverall(b) - $scope.calcularOverall(a); })[0];
        if (!reserva) return null;
        return { sai: cansado, entra: reserva, motivo: cansado.lesionado ? 'indisponibilidade médica' : 'desgaste físico' };
    };
    $scope.aplicarSugestaoSubstituicao = function() {
        var sugestao = $scope.obterSugestaoSubstituicao();
        if (!sugestao) return false;
        var posX = sugestao.sai.posX;
        var posY = sugestao.sai.posY;
        sugestao.sai.emCampo = false;
        $scope.marcarSubstituidoNaPartida(sugestao.sai);
        sugestao.entra.emCampo = true;
        sugestao.entra.posX = posX;
        sugestao.entra.posY = posY;
        $scope.substituicoesFeitas = ($scope.substituicoesFeitas || 0) + 1;
        $scope.narracao.unshift($scope.minutoAtual + "' - 🔄 Substituição sugerida: " + sugestao.entra.nome + " entra no lugar de " + sugestao.sai.nome + ".");
        $scope.forcaMandanteAoVivo = $scope.calcularForcaTime();
        return true;
    };
    $scope.obterStatusTaticaJogador = function(jogador) {
        if (!jogador) return { classe: 'disponivel', label: 'Disponível' };
        if (jogador.expulso) return { classe: 'expulso', label: 'Expulso' };
        if (jogador.lesionado) return { classe: 'lesionado', label: 'Lesionado' };
        if (jogador.suspenso) return { classe: 'suspenso', label: 'Suspenso' };
        if (jogador.substituidoNaPartida) return { classe: 'utilizado', label: 'Já utilizado' };
        return { classe: 'disponivel', label: 'Disponível' };
    };

    $scope.rodarMinuto = function() {
        if ($scope.partidaPausada) return;

        if ($scope.minutoAtual >= 45 && !$scope.intervaloJaAconteceu) {
            $scope.intervaloJaAconteceu = true;
            $scope.partidaPausada = true;
            $scope.tocarSom('apito');
            $scope.narracao.unshift($scope.minutoAtual + "' - Fim do primeiro tempo! As equipes vão para o vestiário.");
            return;
        }

        if ($scope.minutoAtual >= 90) {
            $scope.tocarSom('apito');
            $scope.narracao.unshift("Fim de papo! O árbitro encerra a partida!");
            $scope.partidaEmAndamento = false;
            $scope.finalizarPartidaUsuario($scope.partidaAoVivo, 'completo');
            return;
        }

        $timeout(function() {
            if ($scope.partidaPausada) return;

            $scope.minutoAtual += 2; 
            
            var userTeamIsMandante = $scope.partidaAoVivo.mandante.id === $scope.clubeAtual.id;
            var forcaMandante = $scope.forcaMandanteAoVivo;
            var forcaVisitante = $scope.forcaVisitanteAoVivo;
            var forcaUsuario = userTeamIsMandante ? forcaMandante : forcaVisitante;
            var forcaAdv = userTeamIsMandante ? forcaVisitante : forcaMandante;
            var perfilTaticoUsuario = $scope.obterPerfilFuncoesTaticas($scope.elencoAtual.filter(function(j) { return j.emCampo; }));
            
            // FASE 8: Atualizar Posse
            var basePosseM = (forcaUsuario / (forcaUsuario + forcaAdv)) * 100;
            if (userTeamIsMandante) basePosseM += perfilTaticoUsuario.posse;
            else basePosseM -= perfilTaticoUsuario.posse;
            
            // FASE 12: Marcação Pressão
            if ($scope.taticas.marcacao === 'Pressão Alta') {
                basePosseM += 5; 
            }
            
            $scope.estatisticas.posseMandante = Math.round(basePosseM + (Math.random() * 10 - 5));
            if ($scope.estatisticas.posseMandante > 100) $scope.estatisticas.posseMandante = 100;
            if ($scope.estatisticas.posseMandante < 0) $scope.estatisticas.posseMandante = 0;
            $scope.estatisticas.posseVisitante = 100 - $scope.estatisticas.posseMandante;

            // FASE 11 e 12: Estamina e Lesões
            var jogadoresEmCampo = $scope.elencoAtual.filter(function(j) { return j.emCampo && !j.expulso && !j.lesionado; });
            var multiplicadorCansaco = ($scope.taticas.marcacao === 'Pressão Alta') ? 1.25 : 1.0;
            var cargaCalendarioPartida = $scope.calcularCargaCalendario($scope.diaAtual);
            if ($scope.isDiaDecisivoCalendario($scope.calendarioGeral[$scope.diaAtual])) {
                cargaCalendarioPartida.multiplicadorLesao = Math.min(2.2, cargaCalendarioPartida.multiplicadorLesao * 1.08);
            }
            
            jogadoresEmCampo.forEach(function(j) {
                var queda = $scope.calcularQuedaFisicaPorTick(j, multiplicadorCansaco);
                j.condicaoFisica -= queda;
                if (j.condicaoFisica < 0) j.condicaoFisica = 0;
                
                if (j.condicaoFisica < 60 && ($scope.lesoesNaPartida || 0) < 2) {
                    var chanceLesao = $scope.calcularChanceLesaoPorFadiga(j.condicaoFisica, cargaCalendarioPartida);
                    if (Math.random() < chanceLesao) {
                        $scope.lesoesNaPartida = ($scope.lesoesNaPartida || 0) + 1;
                        j.lesionado = true;
                        j.diasLesao = Math.floor(Math.random() * 4) + 1; 
                        j.acabouDeSerLesionado = true;
                        j.emCampo = false; 
                        $scope.narracao.unshift($scope.minutoAtual + "' - 🚑 LESÃO! " + j.nome + " sentiu e não tem condições de continuar.");
                        $scope.partidaPausada = true;
                        $scope.forcaMandanteAoVivo = $scope.calcularForcaTime();
                    }
                }
            });

            if (!$scope.partidaPausada) {
                $scope.forcaMandanteAoVivo = $scope.calcularForcaTime();
                forcaUsuario = $scope.forcaMandanteAoVivo;
            }

            // FASE 8 / FASE 11: Cartões e Suspensões
            var chanceCartao = Math.random() * 100;
            if (chanceCartao > 98.5 && !$scope.partidaPausada) { 
                var userTeamIsMandante = ($scope.partidaAoVivo.mandante.id === $scope.clubeAtual.id);
                var timeExpulso = "";
                if (chanceCartao > 99.25 && userTeamIsMandante || chanceCartao <= 99.25 && !userTeamIsMandante) {
                    var jogadoresDisponiveis = $scope.elencoAtual.filter(function(j) { return j.emCampo && !j.expulso; });
                    if (jogadoresDisponiveis.length > 0) {
                        var jogadorAlvo = jogadoresDisponiveis[Math.floor(Math.random() * jogadoresDisponiveis.length)];
                        
                        if (Math.random() > 0.05) { // 95% de chance de ser apenas amarelo
                            jogadorAlvo.cartoesAmarelos++;
                            if (jogadorAlvo.cartoesAmarelos >= 3) {
                                jogadorAlvo.cartoesAmarelos = 0;
                                jogadorAlvo.suspenso = true;
                                jogadorAlvo.acabouDeSerSuspenso = true;
                                jogadorAlvo.emCampo = false;
                                jogadorAlvo.expulso = true;
                                $scope.narracao.unshift($scope.minutoAtual + "' - 🟥 EXPULSO! " + jogadorAlvo.nome + " tomou o 3º amarelo acumulado e está fora.");
                                $scope.partidaPausada = true;
                            } else {
                                $scope.narracao.unshift($scope.minutoAtual + "' - 🟨 CARTÃO AMARELO para " + jogadorAlvo.nome + ".");
                            }
                        } else {
                            jogadorAlvo.emCampo = false;
                            jogadorAlvo.expulso = true;
                            jogadorAlvo.suspenso = true;
                            jogadorAlvo.acabouDeSerSuspenso = true;
                            timeExpulso = $scope.clubeAtual.sigla;
                            $scope.narracao.unshift($scope.minutoAtual + "' - 🟥 CARTÃO VERMELHO DIRETO! " + jogadorAlvo.nome + " foi expulso!");
                            $scope.partidaPausada = true; 
                        }
                        $scope.forcaMandanteAoVivo = $scope.calcularForcaTime();
                    }
                } else {
                    timeExpulso = userTeamIsMandante ? $scope.partidaAoVivo.visitante.sigla : $scope.partidaAoVivo.mandante.sigla;
                    if (Math.random() > 0.05) { // 95% de chance de ser apenas amarelo para o rival também
                        $scope.narracao.unshift($scope.minutoAtual + "' - 🟨 CARTÃO AMARELO para o " + timeExpulso + ".");
                    } else {
                        $scope.narracao.unshift($scope.minutoAtual + "' - 🟥 CARTÃO VERMELHO para o " + timeExpulso + "!");
                        if (!userTeamIsMandante) $scope.forcaMandanteAoVivo *= 0.9;
                        else $scope.forcaVisitanteAoVivo *= 0.9;
                    }
                }
                if ($scope.partidaPausada) return;
            }

            if (Math.random() < $scope.calcularChanceEventoTatico()) {
                var forcaAtaqueMandante = forcaMandante;
                var forcaDefesaMandante = forcaMandante;

                if (userTeamIsMandante) {
                    forcaAtaqueMandante *= 1 + (perfilTaticoUsuario.ataque / 100);
                    forcaDefesaMandante *= 1 + (perfilTaticoUsuario.defesa / 100);
                }

                // FASE 12: Mentalidade Tática
                if ($scope.taticas.mentalidade === 'Retranca') {
                    forcaAtaqueMandante *= 0.8;
                    forcaDefesaMandante *= 1.2;
                } else if ($scope.taticas.mentalidade === 'Ofensivo') {
                    forcaAtaqueMandante *= 1.2;
                    forcaDefesaMandante *= 0.8;
                }

                var atacaMandante = Math.random() < $scope.calcularBiasAtaqueMandante();
                if (atacaMandante) {
                    $scope.estatisticas.chutesMandante++;
                    var zona = $scope.aleatorizarZonaTatica('mandante');
                    var chanceType = $scope.aleatorizarTipoChance();
                    var atacante = $scope.obterJogadorAleatorio($scope.partidaAoVivo.mandante.id, ['ATA','MEI','VOL','LAT']);
                    var goleiroAdv = $scope.obterJogadorAleatorio($scope.partidaAoVivo.visitante.id, ['GOL']);
                    var finalAttBase = atacante && atacante.atributos ? atacante.atributos.finalizacao : 75;
                    var reflexoAdvBase = goleiroAdv && goleiroAdv.atributos ? goleiroAdv.atributos.reflexo : 75;
                    var finalAtt = $scope.aplicarFadigaAtributo(finalAttBase, atacante ? atacante.condicaoFisica : 100);
                    var reflexoAdv = $scope.aplicarFadigaAtributoGoleiro(reflexoAdvBase, goleiroAdv ? goleiroAdv.condicaoFisica : 100);
                    var posicionamentoAdv = goleiroAdv && goleiroAdv.atributos ? goleiroAdv.atributos.posicionamento : 75;
                    var bolaParadaAtt = $scope.obterAtributoBolaParada(atacante, chanceType);
                    var xg = $scope.calcularXG(forcaAtaqueMandante, forcaDefesaMandante, zona, finalAtt, reflexoAdv, chanceType, posicionamentoAdv, bolaParadaAtt);
                    xg = Math.max(0.005, Math.min(0.6, xg * $scope.calcularModificadorTaticoXG('mandante', zona, chanceType)));
                    var isGoal = (Math.random() < xg);
                    $scope.registrarUltimaChanceXG('mandante', xg, chanceType, zona, isGoal, atacante);

                    // Registrar telemetria do chute
                    if ($scope.partidaAoVivo) {
                        if (!$scope.partidaAoVivo.telemetriaShots) $scope.partidaAoVivo.telemetriaShots = [];
                        $scope.partidaAoVivo.telemetriaShots.push({
                            minuto: $scope.minutoAtual,
                            time: 'mandante',
                            zona: zona,
                            chanceType: chanceType,
                            xg: parseFloat(xg.toFixed(4)),
                            finalizacao: finalAtt,
                            finalizacao_base: finalAttBase,
                            condicao_atacante: atacante ? Math.round(atacante.condicaoFisica || 100) : 100,
                            bola_parada: bolaParadaAtt,
                            reflexo_oponente: reflexoAdv,
                            reflexo_base_oponente: reflexoAdvBase,
                            condicao_goleiro_oponente: goleiroAdv ? Math.round(goleiroAdv.condicaoFisica || 100) : 100,
                            posicionamento_oponente: posicionamentoAdv,
                            shooterId: atacante ? atacante.id : null,
                            shooterNome: atacante ? atacante.nome : null,
                            goalieId: goleiroAdv ? goleiroAdv.id : null,
                            result: isGoal ? 'GOL' : 'NAO'
                        });
                    }

                    if (isGoal) {
                        $scope.partidaAoVivo.golsMandante++;
                        $scope.tocarSom('gol');
                        var emCampo = $scope.elencoAtual.filter(function(j) { return j.emCampo; });
                        var jogadorGol = $scope.escolherMarcadorGol(emCampo);
                        if (jogadorGol) {
                            if (!jogadorGol.golsTemporada) jogadorGol.golsTemporada = 0;
                            jogadorGol.golsTemporada++;
                            $scope.narracao.unshift($scope.minutoAtual + "' - ⚽ GOOOOOOOL! Do " + $scope.partidaAoVivo.mandante.sigla + "! Golaço de " + jogadorGol.nome + "!");
                        } else {
                            $scope.narracao.unshift($scope.minutoAtual + "' - ⚽ GOOOOOOOL! Do " + $scope.partidaAoVivo.mandante.sigla + "!");
                        }
                        if ($scope.narracao.length > 0) $scope.narracao.shift();
                        $scope.narracao.unshift($scope.minutoAtual + "' - " + $scope.gerarNarracaoChute(true, xg, chanceType, zona, atacante || jogadorGol, goleiroAdv, $scope.partidaAoVivo.mandante.sigla));
                    } else {
                        $scope.tocarSom('chute');
                        var narracaoChute = $scope.minutoAtual + "' - ";
                        if (chanceType === 'PENALTY') narracaoChute += "Penalti desperdiçado!";
                        else if (chanceType === 'CORNER') narracaoChute += "Escanteio desperdiçado!";
                        else if (chanceType === 'DIRECT_FK') narracaoChute += "Falta direta na trave!";
                        else narracaoChute += "Uuuuh! Chute perigoso do " + $scope.partidaAoVivo.mandante.sigla + " quase entra.";
                        narracaoChute = $scope.minutoAtual + "' - " + $scope.gerarNarracaoChute(false, xg, chanceType, zona, atacante, goleiroAdv, $scope.partidaAoVivo.mandante.sigla);
                        $scope.narracao.unshift(narracaoChute);
                    }
                } else {
                    $scope.estatisticas.chutesVisitante++;
                    var zonaV = $scope.aleatorizarZonaTatica('visitante');
                    var chanceTypeV = $scope.aleatorizarTipoChance();
                    var atacanteV = $scope.obterJogadorAleatorio($scope.partidaAoVivo.visitante.id, ['ATA','MEI','VOL','LAT']);
                    var goleiroMand = $scope.obterJogadorAleatorio($scope.partidaAoVivo.mandante.id, ['GOL']);
                    var finalAttVBase = atacanteV && atacanteV.atributos ? atacanteV.atributos.finalizacao : 75;
                    var reflexoMandBase = goleiroMand && goleiroMand.atributos ? goleiroMand.atributos.reflexo : 75;
                    var finalAttV = $scope.aplicarFadigaAtributo(finalAttVBase, atacanteV ? atacanteV.condicaoFisica : 100);
                    var reflexoMand = $scope.aplicarFadigaAtributoGoleiro(reflexoMandBase, goleiroMand ? goleiroMand.condicaoFisica : 100);
                    var posicionamentoMand = goleiroMand && goleiroMand.atributos ? goleiroMand.atributos.posicionamento : 75;
                    var bolaParadaAttV = $scope.obterAtributoBolaParada(atacanteV, chanceTypeV);
                    var forcaAtaqueVisitante = forcaVisitante;
                    var forcaDefesaVisitante = forcaMandante;
                    if (!userTeamIsMandante) {
                        forcaAtaqueVisitante *= 1 + (perfilTaticoUsuario.ataque / 100);
                        forcaDefesaVisitante *= 1 + (perfilTaticoUsuario.defesa / 100);
                    }
                    var xgV = $scope.calcularXG(forcaAtaqueVisitante, forcaDefesaVisitante, zonaV, finalAttV, reflexoMand, chanceTypeV, posicionamentoMand, bolaParadaAttV);
                    xgV = Math.max(0.005, Math.min(0.6, xgV * $scope.calcularModificadorTaticoXG('visitante', zonaV, chanceTypeV)));
                    var isGoalV = (Math.random() < xgV);
                    $scope.registrarUltimaChanceXG('visitante', xgV, chanceTypeV, zonaV, isGoalV, atacanteV);

                    // Registrar telemetria do chute visitante
                    if ($scope.partidaAoVivo) {
                        if (!$scope.partidaAoVivo.telemetriaShots) $scope.partidaAoVivo.telemetriaShots = [];
                        $scope.partidaAoVivo.telemetriaShots.push({
                            minuto: $scope.minutoAtual,
                            time: 'visitante',
                            zona: zonaV,
                            chanceType: chanceTypeV,
                            xg: parseFloat(xgV.toFixed(4)),
                            finalizacao: finalAttV,
                            finalizacao_base: finalAttVBase,
                            condicao_atacante: atacanteV ? Math.round(atacanteV.condicaoFisica || 100) : 100,
                            bola_parada: bolaParadaAttV,
                            reflexo_oponente: reflexoMand,
                            reflexo_base_oponente: reflexoMandBase,
                            condicao_goleiro_oponente: goleiroMand ? Math.round(goleiroMand.condicaoFisica || 100) : 100,
                            posicionamento_oponente: posicionamentoMand,
                            shooterId: atacanteV ? atacanteV.id : null,
                            shooterNome: atacanteV ? atacanteV.nome : null,
                            goalieId: goleiroMand ? goleiroMand.id : null,
                            result: isGoalV ? 'GOL' : 'NAO'
                        });
                    }

                    if (isGoalV) {
                        $scope.partidaAoVivo.golsVisitante++;
                        $scope.tocarSom('gol');
                        var jogadorGolAdv = $scope.escolherMarcadorGol($scope.jogadores.filter(function(j) { return j.clubeId === $scope.partidaAoVivo.visitante.id; }));
                        if (jogadorGolAdv) {
                            if (!jogadorGolAdv.golsTemporada) jogadorGolAdv.golsTemporada = 0;
                            jogadorGolAdv.golsTemporada++;
                            $scope.narracao.unshift($scope.minutoAtual + "' - ⚽ GOOOOOOOL! Do " + $scope.partidaAoVivo.visitante.sigla + " marcado por " + jogadorGolAdv.nome + "!");
                        } else {
                            $scope.narracao.unshift($scope.minutoAtual + "' - ⚽ GOOOOOOOL! Do " + $scope.partidaAoVivo.visitante.sigla + "!");
                        }
                        if ($scope.narracao.length > 0) $scope.narracao.shift();
                        $scope.narracao.unshift($scope.minutoAtual + "' - " + $scope.gerarNarracaoChute(true, xgV, chanceTypeV, zonaV, atacanteV || jogadorGolAdv, goleiroMand, $scope.partidaAoVivo.visitante.sigla));
                    } else {
                        $scope.tocarSom('chute');
                        var narracaoVisitante = $scope.minutoAtual + "' - ";
                        if (chanceTypeV === 'PENALTY') narracaoVisitante += "Penalti desperdiçado!";
                        else if (chanceTypeV === 'CORNER') narracaoVisitante += "Escanteio desperdiçado!";
                        else if (chanceTypeV === 'DIRECT_FK') narracaoVisitante += "Falta direta na trave!";
                        else narracaoVisitante += "Defesa espetacular do goleiro do " + $scope.partidaAoVivo.mandante.sigla + "!";
                        narracaoVisitante = $scope.minutoAtual + "' - " + $scope.gerarNarracaoChute(false, xgV, chanceTypeV, zonaV, atacanteV, goleiroMand, $scope.partidaAoVivo.visitante.sigla);
                        $scope.narracao.unshift(narracaoVisitante);
                    }
                }
            }
            
            $scope.rodarMinuto();
        }, 300); 
    };

    // FASE 16: Cheat para testar o final da temporada
    $scope.simularRestoTemporada = function() {
        if (!confirm("Isso vai simular todos os jogos restantes de forma rápida. Pode levar alguns segundos. Tem certeza?")) return;
        
        $scope.telaAtual = 'loading';
        setTimeout(function() {
            while ($scope.diaAtual < $scope.calendarioGeral.length) {
                var jogo = $scope.obterMeuJogoHoje();
                if (jogo) {
                    $scope.calcularResultadoRapido(jogo);
                }
                $scope.concluirPartida(jogo || null);
                
                // Parar o loop de simulação caso tenha chegado na cerimônia
                if ($scope.telaAtual === 'cerimonia') break;
            }
            $scope.$apply();
        }, 100);
    };

    $scope.gerarResumoTaticoPartida = function(partida) {
        if (!partida || !partida.telemetriaShots || partida.telemetriaShots.length === 0) return null;
        var resumo = {
            mandante: partida.mandante ? partida.mandante.nome : '',
            visitante: partida.visitante ? partida.visitante.nome : '',
            placar: (partida.golsMandante || 0) + ' x ' + (partida.golsVisitante || 0),
            totalShots: partida.telemetriaShots.length,
            totalGoals: 0,
            totalXg: 0,
            xgMandante: 0,
            xgVisitante: 0,
            byZone: {},
            byType: {},
            taticas: angular.copy($scope.taticas || {})
        };

        partida.telemetriaShots.forEach(function(s) {
            var xg = parseFloat(s.xg) || 0;
            var goal = s.result === 'GOL' ? 1 : 0;
            resumo.totalXg += xg;
            resumo.totalGoals += goal;
            if (s.time === 'mandante') resumo.xgMandante += xg;
            else resumo.xgVisitante += xg;

            var zona = s.zona || 'INDEFINIDO';
            if (!resumo.byZone[zona]) resumo.byZone[zona] = { shots: 0, goals: 0, xg: 0 };
            resumo.byZone[zona].shots++;
            resumo.byZone[zona].goals += goal;
            resumo.byZone[zona].xg += xg;

            var tipo = s.chanceType || 'NORMAL';
            if (!resumo.byType[tipo]) resumo.byType[tipo] = { shots: 0, goals: 0, xg: 0 };
            resumo.byType[tipo].shots++;
            resumo.byType[tipo].goals += goal;
            resumo.byType[tipo].xg += xg;
        });

        function melhorEntrada(map) {
            var melhor = null;
            Object.keys(map).forEach(function(k) {
                if (!melhor || map[k].xg > melhor.xg) melhor = { nome: k, shots: map[k].shots, goals: map[k].goals, xg: parseFloat(map[k].xg.toFixed(2)) };
            });
            return melhor;
        }

        resumo.totalXg = parseFloat(resumo.totalXg.toFixed(2));
        resumo.xgMandante = parseFloat(resumo.xgMandante.toFixed(2));
        resumo.xgVisitante = parseFloat(resumo.xgVisitante.toFixed(2));
        resumo.eficiencia = resumo.totalXg > 0 ? Math.round((resumo.totalGoals / resumo.totalXg) * 100) : 0;
        resumo.zonaPrincipal = melhorEntrada(resumo.byZone);
        resumo.tipoPrincipal = melhorEntrada(resumo.byType);
        return resumo;
    };

    function numeroPosJogo(valor, padrao) {
        return (typeof valor === 'number' && isFinite(valor)) ? valor : padrao;
    }

    function arredondarPosJogo(valor) {
        return parseFloat((numeroPosJogo(valor, 0)).toFixed(2));
    }

    function calcularOverallPosJogo(jogador) {
        if (!jogador || !jogador.atributos) return 70;
        var attr = jogador.atributos;
        if (jogador.posicao === 'GOL') {
            var reflexo = numeroPosJogo(attr.reflexo, 75);
            var posicionamento = numeroPosJogo(attr.posicionamento, reflexo);
            var distribuicao = numeroPosJogo(attr.distribuicao, numeroPosJogo(attr.passe, 75));
            var fisicoGol = numeroPosJogo(attr.fisico, 75);
            return Math.round((reflexo * 2 + posicionamento + distribuicao + fisicoGol) / 5);
        }
        return Math.round((
            numeroPosJogo(attr.finalizacao, 75) +
            numeroPosJogo(attr.passe, 75) +
            numeroPosJogo(attr.marcacao, 75) +
            numeroPosJogo(attr.velocidade, 75) +
            numeroPosJogo(attr.fisico, 75)
        ) / 5);
    }

    function obterJogadorResumoPosJogo(jogadorId) {
        var jogadorElenco = ($scope.elencoAtual || []).find(function(j) { return j && j.id == jogadorId; });
        if (jogadorElenco) return jogadorElenco;
        return ($scope.jogadores || []).find(function(j) { return j && j.id == jogadorId; }) || null;
    }

    function obterLadoMeuTimePosJogo(partida) {
        if (!partida || !$scope.clubeAtual) return 'mandante';
        return partida.mandante && partida.mandante.id === $scope.clubeAtual.id ? 'mandante' : 'visitante';
    }

    function calcularResultadoMeuTimePosJogo(partida) {
        var meuLado = obterLadoMeuTimePosJogo(partida);
        var golsMeuTime = meuLado === 'mandante' ? numeroPosJogo(partida.golsMandante, 0) : numeroPosJogo(partida.golsVisitante, 0);
        var golsAdversario = meuLado === 'mandante' ? numeroPosJogo(partida.golsVisitante, 0) : numeroPosJogo(partida.golsMandante, 0);
        if (golsMeuTime > golsAdversario) return 'Vitoria';
        if (golsMeuTime < golsAdversario) return 'Derrota';
        return 'Empate';
    }

    function montarEstatisticasPosJogo(partida, telemetria) {
        var stats = $scope.estatisticas || {};
        var golsMandante = numeroPosJogo(partida.golsMandante, 0);
        var golsVisitante = numeroPosJogo(partida.golsVisitante, 0);
        var chutesMandanteTelemetria = 0;
        var chutesVisitanteTelemetria = 0;

        (telemetria || []).forEach(function(chute) {
            if (chute.time === 'mandante') chutesMandanteTelemetria++;
            else if (chute.time === 'visitante') chutesVisitanteTelemetria++;
        });

        var chutesMandante = numeroPosJogo(stats.chutesMandante, chutesMandanteTelemetria || Math.max(4, golsMandante * 3 + 4));
        var chutesVisitante = numeroPosJogo(stats.chutesVisitante, chutesVisitanteTelemetria || Math.max(4, golsVisitante * 3 + 4));
        var posseMandante = numeroPosJogo(stats.posseMandante, null);
        var posseVisitante = numeroPosJogo(stats.posseVisitante, null);

        if (posseMandante === null || posseVisitante === null) {
            var totalPressao = Math.max(1, chutesMandante + chutesVisitante + golsMandante + golsVisitante);
            posseMandante = Math.round(((chutesMandante + golsMandante) / totalPressao) * 100);
            posseMandante = Math.max(35, Math.min(65, posseMandante));
            posseVisitante = 100 - posseMandante;
        }

        return {
            posseMandante: posseMandante,
            posseVisitante: posseVisitante,
            chutesMandante: chutesMandante,
            chutesVisitante: chutesVisitante,
            publico: numeroPosJogo(stats.publico, 0),
            renda: numeroPosJogo(stats.renda, 0)
        };
    }

    function montarXgEZonasPosJogo(partida, telemetria, estatisticas) {
        var golsMandante = numeroPosJogo(partida.golsMandante, 0);
        var golsVisitante = numeroPosJogo(partida.golsVisitante, 0);
        var xgMandante = 0;
        var xgVisitante = 0;
        var zonasMap = {};

        (telemetria || []).forEach(function(chute) {
            var valorXg = parseFloat(chute.xg) || 0;
            if (chute.time === 'mandante') xgMandante += valorXg;
            else if (chute.time === 'visitante') xgVisitante += valorXg;

            var zona = chute.zona || 'INDEFINIDO';
            if (!zonasMap[zona]) zonasMap[zona] = { zona: zona, chutes: 0, gols: 0, xg: 0, barra: 0 };
            zonasMap[zona].chutes++;
            zonasMap[zona].gols += chute.result === 'GOL' ? 1 : 0;
            zonasMap[zona].xg += valorXg;
        });

        if (!telemetria || telemetria.length === 0) {
            xgMandante = Math.max(0.25, golsMandante * 0.75 + estatisticas.chutesMandante * 0.06);
            xgVisitante = Math.max(0.25, golsVisitante * 0.75 + estatisticas.chutesVisitante * 0.06);
            zonasMap['Sem telemetria'] = {
                zona: 'Sem telemetria',
                chutes: estatisticas.chutesMandante + estatisticas.chutesVisitante,
                gols: golsMandante + golsVisitante,
                xg: xgMandante + xgVisitante,
                barra: 100
            };
        }

        var zonas = Object.keys(zonasMap).map(function(zona) {
            zonasMap[zona].xg = arredondarPosJogo(zonasMap[zona].xg);
            return zonasMap[zona];
        }).sort(function(a, b) {
            return b.xg - a.xg;
        });

        var maiorXgZona = zonas.reduce(function(maior, zona) {
            return Math.max(maior, zona.xg);
        }, 0);
        zonas.forEach(function(zona) {
            zona.barra = maiorXgZona > 0 ? Math.max(8, Math.round((zona.xg / maiorXgZona) * 100)) : 8;
        });

        xgMandante = arredondarPosJogo(xgMandante);
        xgVisitante = arredondarPosJogo(xgVisitante);
        var total = arredondarPosJogo(xgMandante + xgVisitante);

        return {
            xg: {
                mandante: xgMandante,
                visitante: xgVisitante,
                total: total,
                eficienciaMandante: xgMandante > 0 ? Math.round((golsMandante / xgMandante) * 100) : 0,
                eficienciaVisitante: xgVisitante > 0 ? Math.round((golsVisitante / xgVisitante) * 100) : 0
            },
            zonas: zonas
        };
    }

    function montarDestaquesPosJogo(partida, telemetria, resumoXg) {
        var meuLado = obterLadoMeuTimePosJogo(partida);
        var agregados = {};
        var destaques = [];

        function adicionarDestaque(item) {
            if (!item || item.id === undefined) return;
            if (destaques.some(function(d) { return d.id == item.id; })) return;
            destaques.push(item);
        }

        (telemetria || []).forEach(function(chute) {
            if (chute.time === meuLado && chute.shooterId !== undefined && chute.shooterId !== null) {
                if (!agregados[chute.shooterId]) {
                    var jogador = obterJogadorResumoPosJogo(chute.shooterId);
                    agregados[chute.shooterId] = {
                        id: chute.shooterId,
                        nome: chute.shooterNome || (jogador ? jogador.nome : 'Jogador'),
                        posicao: jogador ? jogador.posicao : '-',
                        chutes: 0,
                        gols: 0,
                        xg: 0
                    };
                }
                agregados[chute.shooterId].chutes++;
                agregados[chute.shooterId].gols += chute.result === 'GOL' ? 1 : 0;
                agregados[chute.shooterId].xg += parseFloat(chute.xg) || 0;
            }

            if (chute.time !== meuLado && chute.result !== 'GOL' && chute.goalieId !== undefined && chute.goalieId !== null) {
                if (!agregados['g_' + chute.goalieId]) {
                    var goleiro = obterJogadorResumoPosJogo(chute.goalieId);
                    agregados['g_' + chute.goalieId] = {
                        id: chute.goalieId,
                        nome: goleiro ? goleiro.nome : 'Goleiro',
                        posicao: goleiro ? goleiro.posicao : 'GOL',
                        defesas: 0,
                        goleiro: true
                    };
                }
                agregados['g_' + chute.goalieId].defesas++;
            }
        });

        Object.keys(agregados).map(function(chave) {
            return agregados[chave];
        }).sort(function(a, b) {
            var notaA = (a.gols || 0) * 3 + (a.xg || 0) + (a.defesas || 0) * 1.2 + (a.chutes || 0) * 0.2;
            var notaB = (b.gols || 0) * 3 + (b.xg || 0) + (b.defesas || 0) * 1.2 + (b.chutes || 0) * 0.2;
            return notaB - notaA;
        }).forEach(function(item) {
            if (item.goleiro) {
                adicionarDestaque({
                    id: item.id,
                    nome: item.nome,
                    posicao: item.posicao,
                    motivo: 'Fez ' + item.defesas + ' defesa(s) em chances adversarias.',
                    nota: Math.min(10, arredondarPosJogo(7 + item.defesas * 0.5))
                });
            } else {
                adicionarDestaque({
                    id: item.id,
                    nome: item.nome,
                    posicao: item.posicao,
                    motivo: 'Participou das principais chances: ' + item.gols + ' gol(s), ' + item.chutes + ' finalizacao(oes).',
                    nota: Math.min(10, arredondarPosJogo(7 + item.gols * 0.7 + item.xg * 0.4))
                });
            }
        });

        if (destaques.length < 3) {
            ($scope.elencoAtual || []).slice().sort(function(a, b) {
                return calcularOverallPosJogo(b) - calcularOverallPosJogo(a);
            }).forEach(function(jogador) {
                if (destaques.length >= 3) return;
                adicionarDestaque({
                    id: jogador.id,
                    nome: jogador.nome,
                    posicao: jogador.posicao,
                    motivo: 'Boa base tecnica no elenco para sustentar o resultado.',
                    nota: Math.min(10, arredondarPosJogo(6.5 + (calcularOverallPosJogo(jogador) - 70) / 20))
                });
            });
        }

        return destaques.slice(0, 3);
    }

    function montarImpactoFisicoPosJogo() {
        var disponiveis = ($scope.elencoAtual || []).filter(function(j) {
            return j && !j.lesionado && !j.suspenso;
        });
        var soma = 0;
        disponiveis.forEach(function(j) {
            soma += numeroPosJogo(j.condicaoFisica, 100);
        });
        var condicaoMedia = disponiveis.length > 0 ? Math.round(soma / disponiveis.length) : 0;
        var atletasCansados = ($scope.elencoAtual || []).filter(function(j) {
            return j && numeroPosJogo(j.condicaoFisica, 100) < 60;
        }).length;
        var mensagem = 'Elenco terminou em condicao controlada.';
        if (condicaoMedia < 65 || atletasCansados >= 4) mensagem = 'Jogo deixou desgaste alto; considere rotacao no proximo compromisso.';
        else if (condicaoMedia < 78 || atletasCansados > 0) mensagem = 'Ha desgaste relevante em parte do elenco; monitore titulares cansados.';

        return {
            condicaoMedia: condicaoMedia,
            atletasCansados: atletasCansados,
            mensagem: mensagem
        };
    }

    function montarOcorrenciasPosJogo() {
        var ocorrencias = [];
        ($scope.elencoAtual || []).forEach(function(j) {
            if (!j) return;
            if (j.acabouDeSerLesionado) {
                ocorrencias.push({
                    tipo: 'lesao',
                    texto: j.nome + ' saiu lesionado e deve ficar fora por ' + (j.diasLesao || 1) + ' dia(s).'
                });
            }
            if (j.acabouDeSerSuspenso) {
                ocorrencias.push({
                    tipo: 'suspensao',
                    texto: j.nome + ' recebeu suspensao e desfalca o proximo jogo.'
                });
            }
        });
        return ocorrencias;
    }

    function montarLeituraTaticaPosJogo(resumo, resumoTatico) {
        var taticas = $scope.taticas || { mentalidade: 'Equilibrado', foco: 'Misto', marcacao: 'Recuada' };
        var leitura = 'Plano equilibrado, com ajustes finos para o proximo compromisso.';
        if (taticas.marcacao === 'Pressão Alta' && resumo.impactoFisico.condicaoMedia < 75) {
            leitura = 'A pressao alta aumentou a agressividade, mas tambem elevou o desgaste fisico do elenco.';
        } else if (resumo.xg.mandante > resumo.xg.visitante + 0.4) {
            leitura = 'O plano gerou volume ofensivo superior e boas entradas no terco final.';
        } else if (resumo.xg.visitante > resumo.xg.mandante + 0.4) {
            leitura = 'O adversario encontrou espacos; vale revisar protecao defensiva e transicoes.';
        } else if (taticas.mentalidade === 'Ofensivo') {
            leitura = 'Postura ofensiva manteve o time ativo, mas o jogo ficou relativamente equilibrado em chances.';
        }

        return {
            mentalidade: taticas.mentalidade || 'Equilibrado',
            foco: taticas.foco || 'Misto',
            marcacao: taticas.marcacao || 'Recuada',
            leitura: leitura,
            zonaPrincipal: resumoTatico && resumoTatico.zonaPrincipal ? resumoTatico.zonaPrincipal.nome : null,
            tipoPrincipal: resumoTatico && resumoTatico.tipoPrincipal ? resumoTatico.tipoPrincipal.nome : null
        };
    }

    function montarManchetePosJogo(partida, resultadoMeuTime) {
        var meuClube = $scope.clubeAtual || {};
        var adversario = partida.mandante && meuClube.id === partida.mandante.id ? partida.visitante : partida.mandante;
        var nomeMeuTime = meuClube.nome || 'Seu time';
        var nomeAdversario = adversario && adversario.nome ? adversario.nome : 'adversario';
        if (resultadoMeuTime === 'Vitoria') {
            return {
                titulo: nomeMeuTime + ' vence e ganha moral',
                texto: 'Resultado positivo contra ' + nomeAdversario + ' reforca o trabalho da comissao tecnica.'
            };
        }
        if (resultadoMeuTime === 'Derrota') {
            return {
                titulo: nomeMeuTime + ' tropeça e liga alerta',
                texto: 'A derrota para ' + nomeAdversario + ' aumenta a importancia dos ajustes para a proxima rodada.'
            };
        }
        return {
            titulo: nomeMeuTime + ' empata em jogo de detalhes',
            texto: 'O empate com ' + nomeAdversario + ' deixa pontos de melhoria claros para a sequencia.'
        };
    }

    $scope.montarResumoPosJogo = function(partida, origem) {
        partida = partida || { mandante: {}, visitante: {}, golsMandante: 0, golsVisitante: 0 };
        var telemetria = Array.isArray(partida.telemetriaShots) ? partida.telemetriaShots : [];
        var estatisticas = montarEstatisticasPosJogo(partida, telemetria);
        var xgEZonas = montarXgEZonasPosJogo(partida, telemetria, estatisticas);
        var calendarioDia = $scope.calendarioGeral && $scope.calendarioGeral[$scope.diaAtual] ? $scope.calendarioGeral[$scope.diaAtual] : null;
        var resultadoMeuTime = calcularResultadoMeuTimePosJogo(partida);
        var resumoTatico = telemetria.length > 0 ? $scope.gerarResumoTaticoPartida(partida) : null;
        var resumo = {
            origem: origem === 'rapido' ? 'rapido' : 'completo',
            temporada: $scope.dados && $scope.dados.anoAtual ? $scope.dados.anoAtual : 'Não identificada',
            competicao: calendarioDia && calendarioDia.titulo ? calendarioDia.titulo : 'Partida',
            dia: (typeof $scope.diaAtual === 'number' ? $scope.diaAtual : 0) + 1,
            mandante: resumirTimePreJogo(partida.mandante),
            visitante: resumirTimePreJogo(partida.visitante),
            placar: {
                mandante: numeroPosJogo(partida.golsMandante, 0),
                visitante: numeroPosJogo(partida.golsVisitante, 0),
                resultadoMeuTime: resultadoMeuTime
            },
            estatisticas: estatisticas,
            xg: xgEZonas.xg,
            zonas: xgEZonas.zonas,
            destaques: [],
            impactoFisico: montarImpactoFisicoPosJogo(),
            ocorrencias: montarOcorrenciasPosJogo(),
            taticas: null,
            gestao: {
                substituicoes: origem === 'rapido' ? 0 : ($scope.substituicoesFeitas || 0),
                pausasTaticas: origem === 'rapido' ? 0 : ($scope.pausasTaticasFeitas || 0),
                resumo: origem === 'rapido' ? 'Partida resolvida pelo resultado rápido.' : (($scope.substituicoesFeitas || 0) > 0 ? 'As substituições foram registradas na gestão da partida.' : 'Nenhuma substituição foi registrada.')
            },
            manchete: null
        };

        resumo.destaques = montarDestaquesPosJogo(partida, telemetria, resumo.xg);
        resumo.taticas = montarLeituraTaticaPosJogo(resumo, resumoTatico);
        resumo.manchete = montarManchetePosJogo(partida, resultadoMeuTime);
        return resumo;
    };

    function sincronizarJogadorBaseDesenvolvimento(jogadorElenco) {
        if (!jogadorElenco || !$scope.jogadores) return;
        var jogadorBase = $scope.jogadores.find(function(j) { return j && j.id == jogadorElenco.id; });
        if (!jogadorBase || jogadorBase === jogadorElenco) return;
        jogadorBase.potencial = jogadorElenco.potencial;
        jogadorBase.xpTemporada = jogadorElenco.xpTemporada;
        jogadorBase.jogosTemporada = jogadorElenco.jogosTemporada;
        jogadorBase.minutosTemporada = jogadorElenco.minutosTemporada;
        jogadorBase.evolucaoTemporada = jogadorElenco.evolucaoTemporada;
        jogadorBase.historicoEvolucao = angular.copy(jogadorElenco.historicoEvolucao || []);
        if (jogadorBase.atributos && jogadorElenco.atributos) {
            Object.keys(jogadorElenco.atributos).forEach(function(attr) {
                jogadorBase.atributos[attr] = jogadorElenco.atributos[attr];
            });
        }
    }

    function obterAtributosDesenvolvimento(jogador) {
        if (!jogador || jogador.posicao === 'GOL') return ['reflexo', 'posicionamento', 'distribuicao', 'fisico'];
        if (jogador.posicao === 'ATA') return ['finalizacao', 'velocidade', 'passe', 'fisico'];
        if (jogador.posicao === 'MEI' || jogador.posicao === 'VOL') return ['passe', 'marcacao', 'finalizacao', 'fisico'];
        if (jogador.posicao === 'ZAG' || jogador.posicao === 'LAT') return ['marcacao', 'fisico', 'velocidade', 'passe'];
        return ['passe', 'fisico', 'velocidade', 'marcacao'];
    }

    function obterAtributosDesenvolvimentoPorFoco(jogador) {
        var foco = jogador && jogador.desenvolvimentoFoco ? jogador.desenvolvimentoFoco : 'equilibrado';
        if (foco === 'fisico') return ['fisico', 'velocidade'];
        if (foco === 'tecnico') return jogador && jogador.posicao === 'GOL' ? ['distribuicao', 'reflexo'] : ['passe', 'finalizacao'];
        if (foco === 'defensivo') return jogador && jogador.posicao === 'GOL' ? ['reflexo', 'posicionamento'] : ['marcacao', 'posicionamento'];
        if (foco === 'tatico') return ['posicionamento', 'passe'];
        return obterAtributosDesenvolvimento(jogador);
    }

    $scope.opcoesDesenvolvimento = [
        { id: 'equilibrado', label: 'Equilibrado' }, { id: 'fisico', label: 'Físico' },
        { id: 'tecnico', label: 'Técnico' }, { id: 'tatico', label: 'Tático' },
        { id: 'defensivo', label: 'Defensivo' }
    ];

    $scope.definirFocoDesenvolvimento = function(jogador, foco) {
        if (!jogador || !$scope.opcoesDesenvolvimento.some(function(item) { return item.id === foco; })) return false;
        jogador.desenvolvimentoFoco = foco;
        normalizarJogadorSalvo(jogador);
        if (typeof $scope.salvarJogoSilencioso === 'function') $scope.salvarJogoSilencioso();
        return true;
    };

    function criarRelatorioEvolucao(jogador, overallAntes, overallDepois, mudancas, motivo, fatores) {
        var sequencia = ($scope.relatorioEvolucao ? $scope.relatorioEvolucao.length : 0) + (jogador.historicoEvolucao ? jogador.historicoEvolucao.length : 0) + 1;
        return {
            id: 'evo_' + (jogador.id !== undefined ? jogador.id : 'sem_id') + '_' + ($scope.diaAtual || 0) + '_' + sequencia,
            jogadorId: jogador.id,
            nome: jogador.nome,
            idade: jogador.idade,
            posicao: jogador.posicao,
            overallAntes: overallAntes,
            overallDepois: overallDepois,
            mudancas: mudancas,
            foco: jogador.desenvolvimentoFoco || 'equilibrado',
            fatores: fatores || [],
            motivo: motivo
        };
    }

    $scope.atualizarRelatorioEvolucaoVisivel = function() {
        $scope.relatorioEvolucao = Array.isArray($scope.relatorioEvolucao) ? $scope.relatorioEvolucao : [];
        $scope.relatorioEvolucaoVisivel = $scope.relatorioEvolucao.slice(0, 5);
        return $scope.relatorioEvolucaoVisivel;
    };

    $scope.registrarXpPartida = function(partida, origem) {
        if (!partida || partida._xpRegistrado) return;
        partida._xpRegistrado = true;

        var meuLado = obterLadoMeuTimePosJogo(partida);
        var resultado = calcularResultadoMeuTimePosJogo(partida);
        var xpPorJogador = {};
        var jogadoresEmCampo = ($scope.elencoAtual || []).filter(function(j) {
            return j && j.emCampo;
        });

        jogadoresEmCampo.forEach(function(jogador) {
            normalizarJogadorSalvo(jogador);
            var xp = 2;
            if (resultado === 'Vitoria') xp += 2;
            else if (resultado === 'Empate') xp += 1;
            xpPorJogador[jogador.id] = xp;
            jogador.jogosTemporada = (jogador.jogosTemporada || 0) + 1;
            jogador.minutosTemporada = (jogador.minutosTemporada || 0) + 90;
        });

        (partida.telemetriaShots || []).forEach(function(chute) {
            if (chute.time !== meuLado || chute.shooterId === undefined || chute.shooterId === null) return;
            if (xpPorJogador[chute.shooterId] === undefined) xpPorJogador[chute.shooterId] = 0;
            xpPorJogador[chute.shooterId] += 1;
            if (chute.result === 'GOL') xpPorJogador[chute.shooterId] += 2;
        });

        jogadoresEmCampo.forEach(function(jogador) {
            var xpFinal = xpPorJogador[jogador.id] || 0;
            if (jogador.idade < 23) xpFinal *= 1.25;
            if (jogador.categoriaOrigem === 'Sub-17') xpFinal *= 1.05;
            if (jogador.categoriaOrigem === 'Sub-20') xpFinal *= 1.12;
            xpFinal *= (1 + ($scope.calcularBonusDesenvolvimentoInfraestrutura() / 100));
            var impactoFuncao = $scope.obterImpactoFuncaoTatica ? $scope.obterImpactoFuncaoTatica(jogador) : null;
            if (impactoFuncao && (impactoFuncao.ataque || impactoFuncao.defesa || impactoFuncao.posse)) xpFinal += 1;
            if (jogador.acabouDeSerLesionado || jogador.lesionado) xpFinal *= 0.5;
            xpFinal = Math.min(8, Math.max(0, Math.round(xpFinal)));
            jogador.xpTemporada = (jogador.xpTemporada || 0) + xpFinal;
            jogador.adaptacaoClube = Math.min(100, (jogador.adaptacaoClube || 0) + 4);
            jogador.diasNoClube = (jogador.diasNoClube || 0) + 1;
            sincronizarJogadorBaseDesenvolvimento(jogador);
        });
    };

    $scope.aplicarEvolucaoElenco = function(motivo) {
        $scope.relatorioEvolucao = Array.isArray($scope.relatorioEvolucao) ? $scope.relatorioEvolucao : [];
        var novosRelatorios = [];
        var motivoCiclo = motivo || 'Ciclo de desenvolvimento';

        ($scope.elencoAtual || []).forEach(function(jogador) {
            normalizarJogadorSalvo(jogador);
            var focoFuncao = jogador.funcaoTatica && jogador.funcaoTatica !== 'Automática' ? jogador.funcaoTatica : null;
            var overallAntes = calcularOverallBaseJogador(jogador);
            var mudancas = [];
            var idade = valorNumericoOuPadrao(jogador.idade, 24);
            var ciclosXp = Math.floor((jogador.xpTemporada || 0) / 20);
            var limiteGanho = idade <= 21 ? 2 : (idade <= 29 ? 1 : 0);
            var ganhoPermitido = Math.min(limiteGanho, ciclosXp);

            if (ganhoPermitido > 0 && overallAntes < jogador.potencial && !jogador.lesionado) {
                var atributos = obterAtributosDesenvolvimentoPorFoco(jogador);
                if (focoFuncao && jogador.posicao === 'GOL' && focoFuncao.toLowerCase().indexOf('distrib') >= 0) atributos = ['distribuicao', 'passe', 'reflexo'];
                if (focoFuncao && jogador.posicao !== 'GOL' && focoFuncao.toLowerCase().indexOf('marc') >= 0) atributos = ['marcacao', 'posicionamento', 'fisico'];
                var inicio = obterChaveNumericaJogador(jogador) % atributos.length;
                var aplicados = 0;
                for (var i = 0; i < atributos.length && aplicados < ganhoPermitido; i++) {
                    var atributo = atributos[(inicio + i) % atributos.length];
                    if (!jogador.atributos || jogador.atributos[atributo] === undefined) continue;
                    var antes = jogador.atributos[atributo];
                    jogador.atributos[atributo] = Math.min(99, antes + 1);
                    if (calcularOverallBaseJogador(jogador) > jogador.potencial) {
                        jogador.atributos[atributo] = antes;
                        continue;
                    }
                    if (jogador.atributos[atributo] !== antes) {
                        mudancas.push({ atributo: atributo, antes: antes, depois: jogador.atributos[atributo] });
                        aplicados++;
                    }
                }
                if (aplicados > 0) jogador.xpTemporada = Math.max(0, (jogador.xpTemporada || 0) - aplicados * 20);
            }

            var deveRegredir = idade >= 34 || (idade >= 31 && ((jogador.minutosTemporada || 0) < 450 || valorNumericoOuPadrao(jogador.condicaoFisica, 100) < 65));
            if (deveRegredir) {
                ['fisico', 'velocidade'].forEach(function(atributo) {
                    if (!jogador.atributos || jogador.atributos[atributo] === undefined) return;
                    var antes = jogador.atributos[atributo];
                    var queda = idade >= 34 ? 1 : 0;
                    if (queda <= 0) return;
                    jogador.atributos[atributo] = Math.max(10, antes - queda);
                    if (jogador.atributos[atributo] !== antes) mudancas.push({ atributo: atributo, antes: antes, depois: jogador.atributos[atributo] });
                });
            }

            if (jogador.lesionado && (jogador.diasLesao || 0) >= 15 && jogador.atributos && jogador.atributos.fisico !== undefined) {
                var fisicoAntes = jogador.atributos.fisico;
                jogador.atributos.fisico = Math.max(10, fisicoAntes - 1);
                if (jogador.atributos.fisico !== fisicoAntes) mudancas.push({ atributo: 'fisico', antes: fisicoAntes, depois: jogador.atributos.fisico });
            }

            var overallDepois = calcularOverallBaseJogador(jogador);
            var delta = overallDepois - overallAntes;
            if (mudancas.length > 0 || delta !== 0) {
                jogador.evolucaoTemporada = (jogador.evolucaoTemporada || 0) + delta;
                var fatores = [];
                if ((jogador.xpTemporada || 0) >= 20) fatores.push('XP acumulado');
                if (idade <= 21) fatores.push('idade de desenvolvimento');
                if ((jogador.minutosTemporada || 0) >= 450) fatores.push('minutos em campo');
                if ((jogador.moral || 0) >= 80) fatores.push('moral alta');
                if ((jogador.potencial || 0) > overallAntes) fatores.push('potencial disponível');
                if (focoFuncao) fatores.push('função tática: ' + focoFuncao);
                if ((jogador.adaptacaoClube || 100) < 100) fatores.push('adaptação ao clube em andamento');
                if (jogador.lesionado) fatores.push('lesão');
                var relatorio = criarRelatorioEvolucao(jogador, overallAntes, overallDepois, mudancas, motivoCiclo, fatores);
                jogador.historicoEvolucao.unshift(relatorio);
                jogador.historicoEvolucao = jogador.historicoEvolucao.slice(0, 10);
                novosRelatorios.push(relatorio);
                sincronizarJogadorBaseDesenvolvimento(jogador);
            }
        });

        for (var r = novosRelatorios.length - 1; r >= 0; r--) {
            $scope.relatorioEvolucao.unshift(novosRelatorios[r]);
        }
        $scope.relatorioEvolucao = $scope.relatorioEvolucao.slice(0, 50);
        $scope.atualizarRelatorioEvolucaoVisivel();
        $scope.ultimoDiaEvolucao = $scope.diaAtual || 0;
        var evolucoesPositivas = novosRelatorios.filter(function(relatorio) { return relatorio.overallDepois > relatorio.overallAntes; }).length;
        var evolucoesNegativas = novosRelatorios.filter(function(relatorio) { return relatorio.overallDepois < relatorio.overallAntes; }).length;
        if (evolucoesPositivas > evolucoesNegativas && evolucoesPositivas >= 2) {
            $scope.registrarEventoAmbiente({
                id: 'amb_dev_' + ($scope.diaAtual || 0),
                chave: 'desenvolvimento|' + ($scope.diaAtual || 0),
                dia: $scope.diaAtual || 0,
                tipo: 'desenvolvimento',
                impacto: 2,
                titulo: 'Elenco em evolucao',
                detalhe: 'O ciclo de desenvolvimento trouxe sinais positivos para o grupo.'
            });
        }
        return novosRelatorios;
    };

    $scope.finalizarPartidaUsuario = function(partida, origem) {
        $scope.registrarXpPartida(partida, origem);
        var resumo = $scope.montarResumoPosJogo(partida, origem);
        $scope.historicoPartidas = Array.isArray($scope.historicoPartidas) ? $scope.historicoPartidas : [];
        $scope.historicoPartidas.unshift(angular.copy(resumo));
        $scope.partidaEmAndamento = false;
        $scope.partidaPausada = false;
        if (partida && partida.telemetriaShots && partida.telemetriaShots.length > 0) {
            $scope.ultimoResumoPartida = $scope.gerarResumoTaticoPartida(partida);
        }
        $scope.concluirPartida(partida, origem);
        $scope.posJogo = {
            disponivel: true,
            resumo: resumo
        };
        $scope.telaAtual = 'pos_jogo';
    };

    $scope.fecharPosJogo = function() {
        $scope.posJogo = {
            disponivel: false,
            resumo: null
        };
        $scope.mudarTela('dashboard');
    };

    $scope.concluirPartida = function(partida, origem) {
        var hoje = $scope.calendarioGeral[$scope.diaAtual];
        var orcamentoAntesDoDia = $scope.clubeAtual ? ($scope.clubeAtual.orcamento || 0) : 0;
        
        if (partida) {
            partida.jogado = true;
            if (partida.éCopa) {
                if (partida.perna === 'ida') {
                    partida.chaveCopa.golsIda1 = partida.mandante === partida.chaveCopa.time1 ? partida.golsMandante : partida.golsVisitante;
                    partida.chaveCopa.golsIda2 = partida.mandante === partida.chaveCopa.time2 ? partida.golsMandante : partida.golsVisitante;
                    partida.chaveCopa.jogadoIda = true;
                } else {
                    partida.chaveCopa.golsVolta1 = partida.mandante === partida.chaveCopa.time1 ? partida.golsMandante : partida.golsVisitante;
                    partida.chaveCopa.golsVolta2 = partida.mandante === partida.chaveCopa.time2 ? partida.golsMandante : partida.golsVisitante;
                    partida.chaveCopa.jogadoVolta = true;
                }
            } else {
                $scope.atualizarTabela(partida, $scope.clubeAtual.divisao);
            }

            // Persistir telemetria da partida no histórico local para salvar/analise
            if (partida.telemetriaShots && partida.telemetriaShots.length > 0) {
                $scope.telemetriaHistorico = $scope.telemetriaHistorico || [];
                try {
                    var matchKey = (partida.mandante && partida.visitante) ? (partida.mandante.id + '-' + partida.visitante.id + '-' + ($scope.diaAtual || Date.now())) : ('match-' + Date.now());
                    $scope.telemetriaHistorico.push({ matchKey: matchKey, homeId: partida.mandante ? partida.mandante.id : null, awayId: partida.visitante ? partida.visitante.id : null, shots: partida.telemetriaShots });
                    $scope.ultimoResumoPartida = $scope.gerarResumoTaticoPartida(partida);
                } catch (e) {
                    // Falha silenciosa para não quebrar a conclusão da partida
                }
            }
            $scope.aplicarAmbienteResultadoPartida(partida, origem);
            $scope.aplicarContextoExternoResultadoPartida(partida, origem);
        }
        
        // FASE 15: Simular CPU
        if (hoje.tipo === 'LIGA') {
            if ($scope.jogosCPU && $scope.jogosCPU[hoje.rodadaLiga]) {
                $scope.simularJogosCPU($scope.jogosCPU[hoje.rodadaLiga]);
            }
        } else if (hoje.tipo === 'COPA') {
            $scope.simularFaseCopaCPU(hoje);
        } else if (hoje.tipo === 'CONTINENTAL') {
            $scope.simularFaseContinentalCPU(hoje);
        }
        $scope.gerarNoticiarioDia(hoje, partida);
        $scope.gerarDeclaracaoPosJogo(partida);
        $scope.gerarRumoresMercadoDia();
        $scope.processarRumoresMercadoDia();
        $scope.processarMudancaTreinadorCpu();
        $scope.processarDinamicaClubesCpu();
        $scope.gerarNarrativaCompeticaoDia();
        $scope.aplicarPressaoNarrativaCompeticao();
        $scope.processarPromessasEAgentes();
        
        var cargaCalendarioRecuperacao = $scope.calcularCargaCalendario($scope.diaAtual + 1);
        var recuperacaoFisicaDia = $scope.calcularRecuperacaoFisicaDiaria(!!partida, $scope.diaAtual + 1);

        $scope.diaAtual++;
        $scope.atualizarFasePreparacao();
        $scope.processarEmprestimosDia();
        $scope.atualizarPropostasPendentes();
        $scope.atualizarResumoJanelaMercado();
        $scope.elencoAtual.forEach(function(j) { 
            j.expulso = false; 
            if (j.moral === undefined) j.moral = 100;

            if (partida && j.emCampo) {
                j.partidasJogadas = (j.partidasJogadas || 0) + 1;
                j.moral = Math.min(100, j.moral + 5); // Jogou, recupera moral
                j.rodadasNoBanco = 0;
            } else if (partida && !j.emCampo && !j.lesionado) {
                j.rodadasNoBanco = (j.rodadasNoBanco || 0) + 1;
                var ov = $scope.calcularOverall(j);
                if (ov > 75 && j.rodadasNoBanco > 3) {
                    // Craque insatisfeito no banco
                    j.moral = Math.max(0, j.moral - 10);
                } else if (j.rodadasNoBanco > 5) {
                    // Jogador normal no banco
                    j.moral = Math.max(0, j.moral - 5);
                }
            }
            atualizarStatusHumorJogador(j);

            // FASE 11: Recuperação e Punições
            j.condicaoFisica += recuperacaoFisicaDia;
            if (j.condicaoFisica > 100) j.condicaoFisica = 100;
            
            if (j.suspenso && !j.acabouDeSerSuspenso) {
                j.suspenso = false; // Cumpriu suspensão nessa rodada
            }
            if (j.acabouDeSerSuspenso) {
                j.acabouDeSerSuspenso = false; // Tira a flag pra próxima rodada ele cumprir
            }

            if (j.lesionado) {
                if (j.acabouDeSerLesionado) {
                    j.acabouDeSerLesionado = false;
                } else {
                    normalizarInfraestruturaClubeInterno($scope.clubeAtual);
                    var nivelDM = ($scope.clubeAtual.infraestrutura && $scope.clubeAtual.infraestrutura.departamentoMedico.nivel) || $scope.clubeAtual.nivelMedico || 1;
                    var recuperacaoExtra = 0;
                    if (nivelDM === 2 && Math.random() < 0.3) recuperacaoExtra = 1;
                    if (nivelDM === 3 && Math.random() < 0.6) recuperacaoExtra = 1;
                    var medicoStaff = ($scope.staffClube || []).find(function(item) { return item.id === 'medico' && item.contratado; });
                    if (medicoStaff && Math.random() < Math.min(0.35, 0.15 + (medicoStaff.nivel || 1) * 0.05)) recuperacaoExtra = 1;

                    j.diasLesao -= (1 + recuperacaoExtra);
                    if (j.diasLesao <= 0) {
                        j.lesionado = false;
                        j.diasLesao = 0;
                    }
                }
            } else if (!partida && Math.random() < $scope.calcularChanceLesaoTreino(cargaCalendarioRecuperacao)) {
                j.lesionado = true;
                j.acabouDeSerLesionado = true;
                j.diasLesao = Math.floor(Math.random() * 5) + 2; // de 2 a 6 dias de lesão
                $scope.caixaEntrada.unshift({
                    id: 'msg_lesao_' + Date.now() + Math.random(),
                    remetente: 'Departamento Médico',
                    assunto: 'Lesão no Treinamento: ' + j.nome,
                    mensagem: 'Infelizmente o jogador ' + j.nome + ' sofreu uma lesão durante o treino tático de hoje e ficará no departamento médico por ' + j.diasLesao + ' dias.',
                    lida: false,
                    tipo: 'info',
                    data: new Date().toLocaleDateString('pt-BR')
                });
            }
        });
        if (partida) $scope.aplicarAmbienteRotacaoElenco();
        $scope.aplicarAmbienteLesoesElenco();
        $scope.atualizarStatusHumorElenco();

        var diasDesdeUltimaEvolucao = $scope.diaAtual - ($scope.ultimoDiaEvolucao || 0);
        if ($scope.diaAtual > 0 && diasDesdeUltimaEvolucao >= 30) {
            $scope.aplicarEvolucaoElenco('Ciclo mensal de desenvolvimento');
        }
        
        // FASE 9: FINANÇAS
        // 1. Receita de Bilheteria (apenas quando é mandante)
        var lucroBilheteria = $scope.estatisticas ? $scope.estatisticas.renda : 0;
        if (partida && partida.mandante && partida.mandante.id === $scope.clubeAtual.id && lucroBilheteria > 0) {
            $scope.clubeAtual.orcamento += lucroBilheteria;
            $scope.financasHistorico.unshift({
                tipo: 'receita',
                descricao: 'Bilheteria (' + hoje.titulo + ')',
                valor: lucroBilheteria,
                data: new Date().toLocaleDateString('pt-BR')
            });
        }
        
        // FASE 17: Pagamento de Patrocínio por Partida
        if ($scope.patrocinioAtual && $scope.patrocinioAtual.bonusPorVitoria > 0) {
            if (partida && partida.golsMandante !== undefined && partida.golsVisitante !== undefined) {
                var vitoria = (partida.mandante.id === $scope.clubeAtual.id && partida.golsMandante > partida.golsVisitante) || 
                              (partida.visitante.id === $scope.clubeAtual.id && partida.golsVisitante > partida.golsMandante);
                if (vitoria) {
                    $scope.clubeAtual.orcamento += $scope.patrocinioAtual.bonusPorVitoria;
                    $scope.financasHistorico.unshift({ data: hoje.titulo, tipo: 'receita', descricao: 'Bônus de Patrocínio (Vitória)', valor: $scope.patrocinioAtual.bonusPorVitoria });
                }
            }
        }
        
        // 2. Pagamento de Salários e Receitas Mensais (A cada 5 dias - Mensal)
        if ($scope.isFechamentoFinanceiro($scope.diaAtual)) {
            var mesFinanceiro = $scope.obterMesFinanceiro($scope.diaAtual);
            var folha = $scope.calcularFolhaSalarial();
            $scope.clubeAtual.orcamento -= folha;
            $scope.financasHistorico.unshift({
                tipo: 'despesa',
                descricao: 'Pagamento de Salários (Mês ' + mesFinanceiro + ')',
                valor: folha,
                data: new Date().toLocaleDateString('pt-BR')
            });

            var baseVendaCamisas = $scope.clubeAtual.reputacao * 25000 * $scope.calcularMultiplicadorComercialInfraestrutura(); // Representa as vendas mensais
            if ($scope.configFinanceira && $scope.configFinanceira.marketingAtivo > 0) {
                baseVendaCamisas *= 1.5; // +50% de bônus
                $scope.configFinanceira.marketingAtivo -= 5;
                if ($scope.configFinanceira.marketingAtivo < 0) $scope.configFinanceira.marketingAtivo = 0;
            }
            $scope.clubeAtual.orcamento += baseVendaCamisas;
            $scope.financasHistorico.unshift({
                tipo: 'receita',
                descricao: 'Merchandising e Venda de Camisas (Mensal)' + ($scope.configFinanceira && $scope.configFinanceira.marketingAtivo > 0 ? ' [Marketing Ativo]' : ''),
                valor: baseVendaCamisas,
                data: new Date().toLocaleDateString('pt-BR')
            });

            // Direitos de transmissao: receita recorrente proporcional ao nivel da competicao.
            // O valor e mensal e intencionalmente menor nas divisoes inferiores para preservar a progressao.
            var cotasTransmissaoPorDivisao = { A: 8000000, B: 2500000, C: 1200000, D: 600000 };
            var cotaTransmissao = cotasTransmissaoPorDivisao[$scope.clubeAtual.divisao] || 600000;
            $scope.clubeAtual.orcamento += cotaTransmissao;
            $scope.financasHistorico.unshift({
                tipo: 'receita',
                descricao: 'Cota de Transmissao (Mensal)',
                valor: cotaTransmissao,
                data: new Date().toLocaleDateString('pt-BR')
            });

            var valorManutencao = $scope.clubeAtual.estadio.capacidade * 20;
            $scope.clubeAtual.orcamento -= valorManutencao;
            $scope.financasHistorico.unshift({
                tipo: 'despesa',
                descricao: 'Manutenção do Estádio (Mês ' + mesFinanceiro + ')',
                valor: valorManutencao,
                data: new Date().toLocaleDateString('pt-BR')
            });
        }

        $scope.verificarAlertasFinanceiros();
        $scope.historicoFinanceiroMensal = $scope.historicoFinanceiroMensal || {};
        var mesHistorico = $scope.obterMesFinanceiro($scope.diaAtual);
        if (!$scope.historicoFinanceiroMensal[mesHistorico]) {
            $scope.historicoFinanceiroMensal[mesHistorico] = { mes: mesHistorico, saldo: 0, entradas: 0, saidas: 0 };
        }
        var variacaoFinanceira = ($scope.clubeAtual.orcamento || 0) - orcamentoAntesDoDia;
        $scope.historicoFinanceiroMensal[mesHistorico].saldo += variacaoFinanceira;
        if (variacaoFinanceira >= 0) $scope.historicoFinanceiroMensal[mesHistorico].entradas += variacaoFinanceira;
        else $scope.historicoFinanceiroMensal[mesHistorico].saidas += Math.abs(variacaoFinanceira);

        // FASE 13: Andamento de Obras no Estádio
        if ($scope.clubeAtual.estadio.obraEmAndamento) {
            $scope.clubeAtual.estadio.rodadasRestantesObra--;
            if ($scope.clubeAtual.estadio.rodadasRestantesObra <= 0) {
                $scope.clubeAtual.estadio.obraEmAndamento = false;
                $scope.clubeAtual.estadio.capacidade += 5000;
                $scope.clubeAtual.estadio.rodadasRestantesObra = 0;
                $scope.adicionarMensagem('Engenharia', 'Estádio Ampliado', 'As obras de expansão terminaram! Capacidade ampliada em 5.000 lugares.', false, 'estadio');
            }
        }
        $scope.processarInfraestruturaDia();
        $scope.processarBaseDia();
        $scope.revisarContratosElencoDia();

        // FASE 14: Progressão dos Olheiros e Validade de Relatórios
        if ($scope.clubeAtual.olheiros) {
            $scope.clubeAtual.olheiros.forEach(function(olheiro) {
                if (olheiro.validadeRelatorio > 0) {
                    olheiro.validadeRelatorio--;
                    if (olheiro.validadeRelatorio <= 0) {
                        olheiro.relatorio = [];
                    }
                }
                
                if (olheiro.emMissao && olheiro.rodadasRestantes > 0) {
                    olheiro.rodadasRestantes--;
                    if (olheiro.rodadasRestantes <= 0) {
                        $scope.gerarRelatorioOlheiro(olheiro);
                        olheiro.validadeRelatorio = 1;
                    }
                }
            });
        }
        $scope.avaliarDiretoriaPeriodica();

        $scope.simularMercadoCPU();

        // Notificações de Janela
        var eventoJanela = $scope.obterEventoJanelaTransferencia($scope.diaAtual);
        if (eventoJanela) {
            var assuntoJanela = '';
            var mensagemJanela = '';
            if (eventoJanela.tipo === 'abertura') {
                assuntoJanela = 'Janela de Transferências ABERTA!';
                mensagemJanela = 'O período de transferências de ' + eventoJanela.janela.nome + ' acaba de começar. A janela ficará aberta até o dia ' + (eventoJanela.janela.fim + 1) + ' do calendário.';
            } else if (eventoJanela.tipo === 'aviso') {
                assuntoJanela = 'Janela fechando em breve!';
                mensagemJanela = 'Atenção! Faltam apenas mais 2 dias de calendário para o fechamento definitivo do mercado de transferências.';
            } else if (eventoJanela.tipo === 'fechamento') {
                assuntoJanela = 'Janela de Transferências FECHADA!';
                mensagemJanela = 'O período de contratações se encerrou. As equipes não podem mais comprar nem vender novos atletas até a próxima abertura do mercado.';
            }

            $scope.caixaEntrada.unshift({
                id: 'msg_janela_' + Date.now(),
                remetente: 'Federação',
                assunto: assuntoJanela,
                mensagem: mensagemJanela,
                lida: false,
                tipo: 'info',
                data: new Date().toLocaleDateString('pt-BR')
            });
            $scope.mensagensNaoLidas++;
        }

        // FASE 15/16: Virada de Temporada
        if ($scope.diaAtual >= $scope.calendarioGeral.length) {
            $scope.prepararCerimonia();
            return;
        }

        $scope.salvarJogoSilencioso();
    };

    // FASE 15/16: Low-Res Engine & Tabelas & Artilharia
    // helpers xG
    $scope.aleatorizarZona = function() {
        var r = Math.random();
        if (r < 0.45) return 'ATA';
        if (r < 0.70) return 'MEI';
        if (r < 0.82) return 'VOL';
        if (r < 0.92) return 'LAT';
        return 'ZAG';
    };

    $scope.calcularChanceEventoTatico = function() {
        var chance = 0.08;
        if ($scope.taticas.mentalidade === 'Retranca') chance *= 0.88;
        else if ($scope.taticas.mentalidade === 'Ofensivo') chance *= 1.12;
        if ($scope.taticas.marcacao === 'Pressão Alta') chance *= 1.08;
        return Math.max(0.04, Math.min(0.13, chance));
    };

    $scope.calcularBiasAtaqueMandante = function() {
        var bias = 0.5;
        if ($scope.taticas.mentalidade === 'Retranca') bias -= 0.08;
        else if ($scope.taticas.mentalidade === 'Ofensivo') bias += 0.08;
        if ($scope.taticas.marcacao === 'Pressão Alta') bias += 0.04;
        if ($scope.taticas.marcacao === 'Recuada') bias -= 0.03;
        return Math.max(0.25, Math.min(0.75, bias));
    };

    $scope.aleatorizarZonaTatica = function(timeAtacante) {
        var zona = $scope.aleatorizarZona();
        if (timeAtacante !== 'mandante') return zona;
        var r = Math.random();
        if ($scope.taticas.foco === 'Pelo Meio') {
            if (r < 0.18) return 'MEI';
            if (r < 0.30) return 'VOL';
        } else if ($scope.taticas.foco === 'Pelas Pontas') {
            if (r < 0.22) return 'LAT';
            if (r < 0.34) return 'ATA';
        }
        return zona;
    };

    $scope.calcularModificadorTaticoXG = function(timeAtacante, zona, chanceType) {
        if (timeAtacante !== 'mandante') {
            if ($scope.taticas.mentalidade === 'Ofensivo') return 1.08;
            if ($scope.taticas.mentalidade === 'Retranca') return 0.92;
            return 1;
        }

        var mod = 1;
        if ($scope.taticas.foco === 'Pelo Meio') {
            if (zona === 'MEI' || zona === 'VOL') mod *= 1.08;
            if (zona === 'LAT') mod *= 0.92;
        } else if ($scope.taticas.foco === 'Pelas Pontas') {
            if (zona === 'LAT' || chanceType === 'CORNER') mod *= 1.10;
            if (zona === 'VOL') mod *= 0.93;
        }
        if ($scope.taticas.marcacao === 'Pressão Alta' && zona === 'ATA') mod *= 1.04;
        return mod;
    };

    $scope.sortearTaticaCPU = function() {
        var r = Math.random();
        var mentalidade = r < 0.25 ? 'Retranca' : (r < 0.55 ? 'Ofensivo' : 'Equilibrado');
        var f = Math.random();
        var foco = f < 0.34 ? 'Pelo Meio' : (f < 0.68 ? 'Pelas Pontas' : 'Misto');
        var m = Math.random();
        var marcacao = m < 0.35 ? 'Pressão Alta' : 'Recuada';
        return { mentalidade: mentalidade, foco: foco, marcacao: marcacao };
    };

    $scope.calcularModificadorAtaqueTatica = function(tatica) {
        if (!tatica) return 1;
        if (tatica.mentalidade === 'Retranca') return 0.88;
        if (tatica.mentalidade === 'Ofensivo') return 1.10;
        return 1;
    };

    $scope.calcularModificadorDefesaTatica = function(tatica) {
        if (!tatica) return 1;
        if (tatica.mentalidade === 'Retranca') return 1.08;
        if (tatica.mentalidade === 'Ofensivo') return 0.92;
        return 1;
    };

    $scope.calcularModificadorZonaPorTatica = function(tatica, zona, chanceType) {
        if (!tatica) return 1;
        var mod = 1;
        if (tatica.foco === 'Pelo Meio') {
            if (zona === 'MEI' || zona === 'VOL') mod *= 1.06;
            if (zona === 'LAT') mod *= 0.94;
        } else if (tatica.foco === 'Pelas Pontas') {
            if (zona === 'LAT' || chanceType === 'CORNER') mod *= 1.08;
            if (zona === 'VOL') mod *= 0.95;
        }
        if (tatica.marcacao === 'Pressão Alta' && zona === 'ATA') mod *= 1.03;
        return mod;
    };

    // Gera tipo de chance aleatório com probabilidades realistas
    $scope.aleatorizarTipoChance = function() {
        var r = Math.random();
        if (r < 0.02) return 'PENALTY';      // 2% de chances
        if (r < 0.06) return 'CORNER';       // 4% de escanteios
        if (r < 0.09) return 'DIRECT_FK';    // 3% de faltas diretas
        return 'NORMAL';                      // 91% chutes normais
    };

    // xG base por tipo de chance
    $scope.calcularXGPorTipoChance = function(chanceType) {
        var baseXG = {
            'PENALTY': 0.75,
            'CORNER': 0.06,
            'DIRECT_FK': 0.08,
            'NORMAL': 0.0
        };
        return baseXG[chanceType] || 0.0;
    };

    $scope.obterAtributoBolaParada = function(jogador, chanceType) {
        if (!jogador || !jogador.atributos) return 75;
        if (chanceType === 'PENALTY') return jogador.atributos.penalti || jogador.atributos.finalizacao || 75;
        if (chanceType === 'CORNER') return jogador.atributos.escanteio || jogador.atributos.passe || 75;
        if (chanceType === 'DIRECT_FK') return jogador.atributos.cobrador || Math.round(((jogador.atributos.finalizacao || 75) + (jogador.atributos.passe || 75)) / 2);
        return 75;
    };

    $scope.calcularModificadorBolaParada = function(chanceType, atributoBolaParada) {
        if (!chanceType || chanceType === 'NORMAL') return 1;
        atributoBolaParada = (typeof atributoBolaParada === 'number') ? atributoBolaParada : 75;
        return 1 + Math.max(-0.18, Math.min(0.24, (atributoBolaParada - 75) * 0.008));
    };

    $scope.calcularReducaoPosicionamentoGoleiro = function(zona, posicionamento) {
        posicionamento = (typeof posicionamento === 'number') ? posicionamento : 75;
        if (zona !== 'VOL' && zona !== 'LAT') return 0;
        return Math.max(0, Math.min(0.15, (posicionamento - 60) * 0.003));
    };

    $scope.gerarNarracaoChute = function(isGoal, xg, chanceType, zona, atacante, goleiro, siglaAtacante) {
        if (chanceType === 'PENALTY') return isGoal ? "Penalti convertido por " + siglaAtacante + "!" : "Penalti desperdicado!";
        if (chanceType === 'CORNER') return isGoal ? "Escanteio vira gol do " + siglaAtacante + "!" : "Escanteio afastado pela defesa!";
        if (chanceType === 'DIRECT_FK') return isGoal ? "Falta direta perfeita do " + siglaAtacante + "!" : "Falta direta defendida!";
        if (isGoal && xg < 0.05) return "Gol improvavel do " + siglaAtacante + "!";
        if (!isGoal && xg > 0.4) return "Grande chance desperdicada pelo " + siglaAtacante + "!";
        if (!isGoal && goleiro && goleiro.atributos && goleiro.atributos.reflexo >= 90) return "Defesa espetacular de " + goleiro.nome + "!";
        if (!isGoal && goleiro && goleiro.atributos && goleiro.atributos.posicionamento >= 85 && (zona === 'VOL' || zona === 'LAT')) return goleiro.nome + " estava muito bem posicionado!";
        return isGoal ? "GOOOOOOOL! Do " + siglaAtacante + "!" : "Uuuuh! Chute perigoso do " + siglaAtacante + " quase entra.";
    };

    $scope.registrarUltimaChanceXG = function(time, xg, chanceType, zona, isGoal, atacante) {
        if (!$scope.partidaAoVivo) return;
        $scope.partidaAoVivo.ultimaChanceXG = {
            time: time,
            xg: parseFloat(xg.toFixed(4)),
            chanceType: chanceType || 'NORMAL',
            zona: zona,
            result: isGoal ? 'GOL' : 'NAO',
            jogador: atacante ? atacante.nome : null
        };
    };

    $scope.calcularXG = function(forcaAtaque, forcaDefesa, zona, finalizacao, reflexo, chanceType, posicionamento, atributoBolaParada) {
        var zonaMultipliers = { 'ATA':1.0, 'MEI':0.6, 'VOL':0.25, 'LAT':0.15, 'ZAG':0.05, 'INDEFINIDO':0.08 };
        var zm = zonaMultipliers[zona] || 0.08;
        var adv = forcaAtaque / Math.max(1, forcaDefesa);
        var base = 1.42 * adv * zm; // calibrated for top-XI/depth and fatigue modifiers

        // Player-level modifiers (defaults if not provided)
        finalizacao = (typeof finalizacao === 'number') ? finalizacao : 75;
        reflexo = (typeof reflexo === 'number') ? reflexo : 75;
        posicionamento = (typeof posicionamento === 'number') ? posicionamento : 75;

        // Chance type base xG (overrides zone-based if set-piece)
        if (chanceType && chanceType !== 'NORMAL') {
            var baseXGType = $scope.calcularXGPorTipoChance(chanceType);
            if (baseXGType > 0) {
                base = baseXGType; // Use set-piece xG base directly
            }
        }

        // Shooter: small boost per finalizacao above/below baseline (clamped)
        var shooterBoost = 1 + Math.max(-0.4, Math.min(0.8, (finalizacao - 75) * 0.012));
        // Goalkeeper: reduces effective xG (clamped to avoid full nullification) — reduced impact
        var goalieReduction = Math.max(0, Math.min(0.85, reflexo * 0.006));
        var positioningReduction = $scope.calcularReducaoPosicionamentoGoleiro(zona, posicionamento);
        var setPieceBoost = $scope.calcularModificadorBolaParada(chanceType, atributoBolaParada);

        var xg = base * shooterBoost * setPieceBoost * (1 - goalieReduction) * (1 - positioningReduction);
        return Math.max(0.005, Math.min(0.6, xg));
    };

    $scope.calcularPlacarAleatorioCPU = function(mandante, visitante, aplicaCasa) {
        // Usa xG por finalização em vez de "chanceM" direta e incorpora média de atributos dos jogadores
        var forcaM = mandante.reputacao + (aplicaCasa ? 10 : 0);
        var forcaV = visitante.reputacao;
        var taticaM = $scope.sortearTaticaCPU();
        var taticaV = $scope.sortearTaticaCPU();
        var ataqueM = forcaM * $scope.calcularModificadorAtaqueTatica(taticaM);
        var defesaM = forcaM * $scope.calcularModificadorDefesaTatica(taticaM);
        var ataqueV = forcaV * $scope.calcularModificadorAtaqueTatica(taticaV);
        var defesaV = forcaV * $scope.calcularModificadorDefesaTatica(taticaV);
        var diff = forcaM - forcaV;
        var bias = 0.5 + (diff / (forcaM + forcaV)) * 0.35;
        bias = Math.max(0.05, Math.min(0.95, bias));

        function mediaAtributoTime(clubeId, atributo, posFilter) {
            if (!$scope.jogadores) return 75;
            var jTime = $scope.jogadores.filter(function(j) { return j.clubeId === clubeId && j.atributos && !j.lesionado && !j.suspenso; });
            if (posFilter && posFilter.length > 0) jTime = jTime.filter(function(j) { return posFilter.indexOf(j.posicao) !== -1; });
            if (!jTime || jTime.length === 0) return 75;
            jTime = jTime.sort(function(a, b) { return $scope.calcularOverall(b) - $scope.calcularOverall(a); }).slice(0, $scope.obterLimiteProfundidadePorPosicao(posFilter));
            var soma = jTime.reduce(function(s, j) { return s + (j.atributos[atributo] || 75); }, 0);
            return Math.round(soma / jTime.length);
        }

        var avgFinalM = mediaAtributoTime(mandante.id, 'finalizacao', ['ATA','MEI','VOL','LAT']);
        var avgReflexoM = mediaAtributoTime(mandante.id, 'reflexo', ['GOL']);
        var avgPosicionamentoM = mediaAtributoTime(mandante.id, 'posicionamento', ['GOL']);
        var avgPenaltiM = mediaAtributoTime(mandante.id, 'penalti', ['ATA','MEI','VOL','LAT']);
        var avgEscanteioM = mediaAtributoTime(mandante.id, 'escanteio', ['ATA','MEI','VOL','LAT']);
        var avgCobradorM = mediaAtributoTime(mandante.id, 'cobrador', ['ATA','MEI','VOL','LAT']);
        var avgFinalV = mediaAtributoTime(visitante.id, 'finalizacao', ['ATA','MEI','VOL','LAT']);
        var avgReflexoV = mediaAtributoTime(visitante.id, 'reflexo', ['GOL']);
        var avgPosicionamentoV = mediaAtributoTime(visitante.id, 'posicionamento', ['GOL']);
        var avgPenaltiV = mediaAtributoTime(visitante.id, 'penalti', ['ATA','MEI','VOL','LAT']);
        var avgEscanteioV = mediaAtributoTime(visitante.id, 'escanteio', ['ATA','MEI','VOL','LAT']);
        var avgCobradorV = mediaAtributoTime(visitante.id, 'cobrador', ['ATA','MEI','VOL','LAT']);

        var gM = 0, gV = 0;
        var eventos = Math.floor(Math.random() * 6) + 4; // 4..9 eventos (aumentado para gerar mais finalizações)
        for (var i = 0; i < eventos; i++) {
            if (Math.random() < 0.9) { // chance de gerar uma finalização (mais chutes por partida)
                var atacanteEhMandante = Math.random() < bias;
                if (atacanteEhMandante) {
                    var zona = $scope.aleatorizarZona();
                    var chanceType = $scope.aleatorizarTipoChance();
                    var bolaParadaM = chanceType === 'PENALTY' ? avgPenaltiM : (chanceType === 'CORNER' ? avgEscanteioM : (chanceType === 'DIRECT_FK' ? avgCobradorM : 75));
                    var xg = $scope.calcularXG(ataqueM, defesaV, zona, avgFinalM, avgReflexoV, chanceType, avgPosicionamentoV, bolaParadaM);
                    xg = Math.max(0.005, Math.min(0.6, xg * $scope.calcularModificadorZonaPorTatica(taticaM, zona, chanceType)));
                    if (Math.random() < xg) gM++;
                } else {
                    var zona2 = $scope.aleatorizarZona();
                    var chanceType2 = $scope.aleatorizarTipoChance();
                    var bolaParadaV = chanceType2 === 'PENALTY' ? avgPenaltiV : (chanceType2 === 'CORNER' ? avgEscanteioV : (chanceType2 === 'DIRECT_FK' ? avgCobradorV : 75));
                    var xg2 = $scope.calcularXG(ataqueV, defesaM, zona2, avgFinalV, avgReflexoM, chanceType2, avgPosicionamentoM, bolaParadaV);
                    xg2 = Math.max(0.005, Math.min(0.6, xg2 * $scope.calcularModificadorZonaPorTatica(taticaV, zona2, chanceType2)));
                    if (Math.random() < xg2) gV++;
                }
            }
        }

        $scope.registrarGolsNaDB(mandante.id, gM, null);
        $scope.registrarGolsNaDB(visitante.id, gV, null);
        return { golsMandante: gM, golsVisitante: gV };
    };

    $scope.simularJogosCPU = function(jogosDaRodada) {
        jogosDaRodada.forEach(function(jogo) {
            var res = $scope.calcularPlacarAleatorioCPU(jogo.mandante, jogo.visitante, true);
            jogo.golsMandante = res.golsMandante;
            jogo.golsVisitante = res.golsVisitante;
            jogo.jogado = true;
            $scope.atualizarTabela(jogo, jogo.divisao);
        });
    };

    $scope.simularFaseCopaCPU = function(hoje) {
        if (!$scope.copaBrasil.chaves[hoje.fase]) return;
        var confrontos = $scope.copaBrasil.chaves[hoje.fase];
        
        confrontos.forEach(function(ch) {
            var ehDoPlayer = (ch.time1.id === $scope.clubeAtual.id || ch.time2.id === $scope.clubeAtual.id);
            
            if (hoje.perna === 'ida') {
                if (!ehDoPlayer) {
                    var res = $scope.calcularPlacarAleatorioCPU(ch.time1, ch.time2, true);
                    ch.golsIda1 = res.golsMandante;
                    ch.golsIda2 = res.golsVisitante;
                    ch.jogadoIda = true;
                }
            } else {
                if (!ehDoPlayer) {
                    var res = $scope.calcularPlacarAleatorioCPU(ch.time2, ch.time1, true);
                    ch.golsVolta2 = res.golsMandante;
                    ch.golsVolta1 = res.golsVisitante;
                    ch.jogadoVolta = true;
                }
                var agg1 = ch.golsIda1 + ch.golsVolta1;
                var agg2 = ch.golsIda2 + ch.golsVolta2;
                if (agg1 > agg2) ch.vencedor = ch.time1;
                else if (agg2 > agg1) ch.vencedor = ch.time2;
                else {
                    var vencedorPenaltis = Math.random() > 0.5 ? ch.time1 : ch.time2;
                    var golsPenaltis1 = vencedorPenaltis === ch.time1 ? 5 : 4;
                    var golsPenaltis2 = vencedorPenaltis === ch.time2 ? 5 : 4;
                    ch.vencedor = vencedorPenaltis;
                    ch.metodoDesempate = 'penaltis';
                    ch.placarPenaltis = golsPenaltis1 + ' x ' + golsPenaltis2;
                    if (ch.time1.id === $scope.clubeAtual.id || ch.time2.id === $scope.clubeAtual.id) {
                        $scope.adicionarMensagem('Federação', 'Copa do Brasil decidida nos pênaltis', ch.time1.nome + ' e ' + ch.time2.nome + ' empataram em ' + agg1 + ' x ' + agg2 + ' no agregado. Disputa de pênaltis: ' + ch.time1.sigla + ' ' + ch.placarPenaltis + ' ' + ch.time2.sigla + '.', false, 'competicao');
                    }
                }
            }
        });

        if (hoje.perna === 'volta') {
            var vencedores = confrontos.map(function(c) { return c.vencedor; });
            if (vencedores.length > 1) {
                var proxFase = [];
                for (var i=0; i<vencedores.length; i+=2) {
                    proxFase.push({
                        time1: vencedores[i], time2: vencedores[i+1],
                        golsIda1: 0, golsIda2: 0, golsVolta1: 0, golsVolta2: 0,
                        jogadoIda: false, jogadoVolta: false, vencedor: null
                    });
                }
                $scope.copaBrasil.chaves.push(proxFase);
            } else {
                var campeao = vencedores[0];
                if (campeao.id === $scope.clubeAtual.id) {
                    $scope.adicionarMensagem('Federação', 'CAMPEÃO!', 'Você conquistou a Copa do Brasil!', false, 'trofeu');
                    $scope.clubeAtual.orcamento += 70000000;
                } else {
                    alert("O campeão da Copa do Brasil foi o " + campeao.nome + "!");
                }
            }
        }
    };

    $scope.simularFaseContinentalCPU = function(hoje) {
        var eGrupo = (hoje.fase < 6);

        function simularGrupos(comp) {
            if (!comp || !comp.grupos) return;
            comp.grupos.forEach(function(grupo) {
                var rodada = grupo.rodadas[hoje.fase];
                rodada.forEach(function(jg) {
                    var ehDoPlayer = (jg.time1.id === $scope.clubeAtual.id || jg.time2.id === $scope.clubeAtual.id);
                    if (!ehDoPlayer && !jg.jogadoIda) {
                        var res = $scope.calcularPlacarAleatorioCPU(jg.time1, jg.time2, true);
                        jg.golsIda1 = res.golsMandante;
                        jg.golsIda2 = res.golsVisitante;
                        jg.jogadoIda = true;
                    }
                    if (jg.jogadoIda) {
                        $scope.atualizarTabelaGrupo(jg, grupo.tabela);
                    }
                });
            });

            // Se for a última rodada da fase de grupos, montar as oitavas!
            if (hoje.fase === 5) {
                var classificados = [];
                comp.grupos.forEach(function(grupo) {
                    grupo.tabela.sort(function(a, b) {
                        if (b.pontos !== a.pontos) return b.pontos - a.pontos;
                        if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
                        return b.saldo - a.saldo;
                    });
                    // Pega o 1º e o 2º colocados
                    classificados.push({ time: grupo.tabela[0].clube, pos: 1 });
                    classificados.push({ time: grupo.tabela[1].clube, pos: 2 });
                });

                // Sorteio: 1ºs contra 2ºs
                var pote1 = classificados.filter(function(c) { return c.pos === 1; }).map(function(c) { return c.time; });
                var pote2 = classificados.filter(function(c) { return c.pos === 2; }).map(function(c) { return c.time; });
                pote1.sort(function() { return 0.5 - Math.random(); });
                pote2.sort(function() { return 0.5 - Math.random(); });

                var chavesOitavas = [];
                for (var i = 0; i < 8; i++) {
                    chavesOitavas.push({
                        time1: pote1[i], time2: pote2[i],
                        golsIda1: 0, golsIda2: 0, golsVolta1: 0, golsVolta2: 0,
                        jogadoIda: false, jogadoVolta: false, vencedor: null
                    });
                }
                comp.chaves.push(chavesOitavas);
            }
        }

        function simularMataMata(comp, indiceMataMata, mensagemCampeao, premio) {
            if (!comp || !comp.chaves[indiceMataMata]) return;
            var confrontos = comp.chaves[indiceMataMata];
            confrontos.forEach(function(ch) {
                var ehDoPlayer = (ch.time1.id === $scope.clubeAtual.id || ch.time2.id === $scope.clubeAtual.id);
                if (hoje.perna === 'ida') {
                    if (!ehDoPlayer) {
                        var res = $scope.calcularPlacarAleatorioCPU(ch.time1, ch.time2, true);
                        ch.golsIda1 = res.golsMandante;
                        ch.golsIda2 = res.golsVisitante;
                        ch.jogadoIda = true;
                    }
                } else {
                    if (!ehDoPlayer) {
                        var res = $scope.calcularPlacarAleatorioCPU(ch.time2, ch.time1, true);
                        ch.golsVolta2 = res.golsMandante;
                        ch.golsVolta1 = res.golsVisitante;
                        ch.jogadoVolta = true;
                    }
                    var agg1 = ch.golsIda1 + ch.golsVolta1;
                    var agg2 = ch.golsIda2 + ch.golsVolta2;
                    if (agg1 > agg2) ch.vencedor = ch.time1;
                    else if (agg2 > agg1) ch.vencedor = ch.time2;
                    else ch.vencedor = Math.random() > 0.5 ? ch.time1 : ch.time2;
                }
            });

            if (hoje.perna === 'volta') {
                var vencedores = confrontos.map(function(c) { return c.vencedor; });
                if (vencedores.length > 1) {
                    var proxFase = [];
                    for (var i = 0; i < vencedores.length; i += 2) {
                        proxFase.push({
                            time1: vencedores[i], time2: vencedores[i+1],
                            golsIda1: 0, golsIda2: 0, golsVolta1: 0, golsVolta2: 0,
                            jogadoIda: false, jogadoVolta: false, vencedor: null
                        });
                    }
                    comp.chaves.push(proxFase);
                } else {
                    var campeao = vencedores[0];
                    if (campeao.id === $scope.clubeAtual.id) {
                        $scope.adicionarMensagem('CONMEBOL', mensagemCampeao.titulo, mensagemCampeao.corpo, false, 'trofeu');
                        $scope.clubeAtual.orcamento += premio;
                    } else {
                        alert("O campeão foi o " + campeao.nome + "!");
                    }
                }
            }
        }

        if (eGrupo) {
            simularGrupos($scope.libertadores);
            simularGrupos($scope.sulAmericana);
        } else {
            var indiceMataMata = hoje.fase - 6;
            simularMataMata($scope.libertadores, indiceMataMata, { titulo: 'GLÓRIA ETERNA!', corpo: 'A AMÉRICA É SUA! Você conquistou a Copa Libertadores da América!' }, 120000000);
            simularMataMata($scope.sulAmericana, indiceMataMata, { titulo: 'CAMPEÃO DA SUL-AMERICANA!', corpo: 'Você venceu a Grande Conquista da Sul-Americana!' }, 35000000);
        }
    };

    $scope.atualizarTabelaGrupo = function(jogo, tabela) {
        var tabM = tabela.find(function(t) { return t.clube.id === jogo.time1.id; });
        var tabV = tabela.find(function(t) { return t.clube.id === jogo.time2.id; });
        if (!tabM || !tabV) return;

        tabM.golsPro += jogo.golsIda1;
        tabM.golsContra += jogo.golsIda2;
        tabM.saldo = tabM.golsPro - tabM.golsContra;
        
        tabV.golsPro += jogo.golsIda2;
        tabV.golsContra += jogo.golsIda1;
        tabV.saldo = tabV.golsPro - tabV.golsContra;
        
        if (jogo.golsIda1 > jogo.golsIda2) {
            tabM.pontos += 3;
            tabM.vitorias++;
            tabV.derrotas++;
        } else if (jogo.golsIda1 < jogo.golsIda2) {
            tabV.pontos += 3;
            tabV.vitorias++;
            tabM.derrotas++;
        } else {
            tabM.pontos += 1;
            tabV.pontos += 1;
            tabM.empates++;
            tabV.empates++;
        }
    };

    $scope.atualizarTabela = function(jogo, divisao) {
        var tabM = $scope.tabelas[divisao].find(function(t) { return t.clube.id === jogo.mandante.id; });
        var tabV = $scope.tabelas[divisao].find(function(t) { return t.clube.id === jogo.visitante.id; });
        
        tabM.golsPro += jogo.golsMandante;
        tabM.golsContra += jogo.golsVisitante;
        tabM.saldo = tabM.golsPro - tabM.golsContra;
        
        tabV.golsPro += jogo.golsVisitante;
        tabV.golsContra += jogo.golsMandante;
        tabV.saldo = tabV.golsPro - tabV.golsContra;
        
        if (jogo.golsMandante > jogo.golsVisitante) {
            tabM.pontos += 3;
            tabM.vitorias++;
            tabV.derrotas++;
        } else if (jogo.golsMandante < jogo.golsVisitante) {
            tabV.pontos += 3;
            tabV.vitorias++;
            tabM.derrotas++;
        } else {
            tabM.pontos += 1;
            tabV.pontos += 1;
            tabM.empates++;
            tabV.empates++;
        }
    };

    $scope.ordenarTabela = function(divisao) {
        if (!$scope.tabelas || !$scope.tabelas[divisao]) return [];
        return $scope.tabelas[divisao].sort(function(a, b) {
            if (b.pontos !== a.pontos) return b.pontos - a.pontos;
            if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
            return b.saldo - a.saldo;
        });
    };

    $scope.obterResumoGerencialTemporada = function(temporada, clubeId) {
        var partidas = (Array.isArray($scope.historicoPartidas) ? $scope.historicoPartidas : []).filter(function(partida) {
            var clubeRegistrado = partida.clubeId || partida.clubeAtualId;
            var clubeParticipou = clubeRegistrado === clubeId || (partida.mandante && partida.mandante.id === clubeId) || (partida.visitante && partida.visitante.id === clubeId);
            return String(partida.temporada || '') === String(temporada) && (!clubeId || clubeParticipou);
        });
        var resumo = { jogos: partidas.length, vitorias: 0, empates: 0, derrotas: 0, golsMarcados: 0, golsSofridos: 0, xgMedio: 0, aproveitamento: 0, evolucoes: 0, decisoes: 0 };
        partidas.forEach(function(partida) {
            var resultado = partida.placar && partida.placar.resultadoMeuTime;
            if (resultado === 'Vitoria') resumo.vitorias++;
            else if (resultado === 'Empate') resumo.empates++;
            else if (resultado === 'Derrota') resumo.derrotas++;
            resumo.golsMarcados += Number(partida.placar && partida.placar.meuTime) || 0;
            resumo.golsSofridos += Number(partida.placar && partida.placar.adversario) || 0;
            resumo.xgMedio += Number(partida.xg && (partida.xg.meuTime || partida.xg.favor)) || 0;
        });
        resumo.xgMedio = resumo.jogos ? Math.round((resumo.xgMedio / resumo.jogos) * 100) / 100 : 0;
        resumo.aproveitamento = resumo.jogos ? Math.round(((resumo.vitorias * 3 + resumo.empates) / (resumo.jogos * 3)) * 100) : 0;
        resumo.evolucoes = (Array.isArray($scope.relatorioEvolucao) ? $scope.relatorioEvolucao : []).filter(function(item) { return item.temporada === temporada; }).length;
        resumo.decisoes = (Array.isArray($scope.historicoDecisoesGestao) ? $scope.historicoDecisoesGestao : []).filter(function(item) { return String(item.temporada) === String(temporada); }).length;
        return resumo;
    };
    $scope.obterEvolucaoCarreira = function() {
        var temporadas = (Array.isArray($scope.historicoTreinador) ? $scope.historicoTreinador : []).filter(function(item) { return item.tipo === 'temporada'; });
        if (temporadas.length < 2) return { disponivel: false, detalhe: 'Mais uma temporada encerrada será necessária para comparar a evolução.' };
        var atual = temporadas[0], anterior = temporadas[1];
        var deltaVitorias = (atual.vitorias || 0) - (anterior.vitorias || 0);
        var deltaConfianca = (atual.confiancaDiretoria || 0) - (anterior.confiancaDiretoria || 0);
        var deltaAmbiente = (atual.ambienteElenco || 0) - (anterior.ambienteElenco || 0);
        return { disponivel: true, atual: atual.temporada, anterior: anterior.temporada, deltaVitorias: deltaVitorias, deltaConfianca: deltaConfianca, deltaAmbiente: deltaAmbiente, tendencia: deltaVitorias > 0 || deltaConfianca > 0 ? 'Evolução positiva' : (deltaVitorias < 0 || deltaConfianca < 0 ? 'Pontos de atenção' : 'Desempenho estável') };
    };
    $scope.obterResumoCarreira = function() {
        var temporadas = (Array.isArray($scope.historicoTreinador) ? $scope.historicoTreinador : []).filter(function(item) { return item.tipo === 'temporada'; });
        var resumo = { temporadas: temporadas.length, partidas: 0, vitorias: 0, empates: 0, derrotas: 0, conquistas: 0, confiancaMedia: null, ambienteMedio: null };
        var confiancas = [], ambientes = [];
        temporadas.forEach(function(item) {
            resumo.partidas += (item.vitorias || 0) + (item.empates || 0) + (item.derrotas || 0);
            resumo.vitorias += item.vitorias || 0;
            resumo.empates += item.empates || 0;
            resumo.derrotas += item.derrotas || 0;
            resumo.conquistas += Array.isArray(item.conquistas) ? item.conquistas.length : 0;
            if (typeof item.confiancaDiretoria === 'number') confiancas.push(item.confiancaDiretoria);
            if (typeof item.ambienteElenco === 'number') ambientes.push(item.ambienteElenco);
        });
        resumo.confiancaMedia = confiancas.length ? Math.round(confiancas.reduce(function(a, b) { return a + b; }, 0) / confiancas.length) : null;
        resumo.ambienteMedio = ambientes.length ? Math.round(ambientes.reduce(function(a, b) { return a + b; }, 0) / ambientes.length) : null;
        return resumo;
    };
    $scope.obterResumoCarreiraPorClube = function() {
        var grupos = {};
        (Array.isArray($scope.historicoTreinador) ? $scope.historicoTreinador : []).filter(function(item) { return item.tipo === 'temporada'; }).forEach(function(item) {
            var chave = item.clubeId || item.clubeNome || 'clube_desconhecido';
            if (!grupos[chave]) grupos[chave] = { clubeId: item.clubeId, clubeNome: item.clubeNome || 'Clube não identificado', temporadas: 0, partidas: 0, vitorias: 0, empates: 0, derrotas: 0, conquistas: 0 };
            var grupo = grupos[chave];
            grupo.temporadas++;
            grupo.vitorias += item.vitorias || 0;
            grupo.empates += item.empates || 0;
            grupo.derrotas += item.derrotas || 0;
            grupo.partidas += (item.vitorias || 0) + (item.empates || 0) + (item.derrotas || 0);
            grupo.conquistas += Array.isArray(item.conquistas) ? item.conquistas.length : 0;
        });
        return Object.keys(grupos).map(function(chave) { return grupos[chave]; }).sort(function(a, b) { return b.temporadas - a.temporadas || b.vitorias - a.vitorias; });
    };
    $scope.obterPlanoProximaTemporada = function(resumo, posicao, divisao) {
        if (posicao >= 17 && divisao !== 'D') return { prioridade: 'planejamento', titulo: 'Reagir no resultado esportivo', detalhe: 'Reforce a comissão e estabilize o desempenho antes de assumir novos compromissos.' };
        if (resumo && resumo.golsSofridos > resumo.golsMarcados) return { prioridade: 'mercado', titulo: 'Corrigir o equilíbrio do elenco', detalhe: 'A defesa sofreu mais do que o ataque produziu. Mapeie reforços e soluções internas para a próxima janela.' };
        if (resumo && resumo.aproveitamento < 50) return { prioridade: 'planejamento', titulo: 'Revisar o plano de jogo', detalhe: 'O aproveitamento pede ajustes de escalação, treinamento e gestão do elenco.' };
        if (resumo && resumo.evolucoes < 3) return { prioridade: 'base', titulo: 'Acelerar o desenvolvimento', detalhe: 'A próxima temporada pode aproveitar melhor a base e criar uma rotação de jovens.' };
        return { prioridade: 'financas', titulo: 'Consolidar o crescimento', detalhe: 'Mantenha o desempenho e use o orçamento com disciplina para sustentar a evolução.' };
    };

    // FASE 16: Balanço da Diretoria e Cerimônia
    $scope.prepararCerimonia = function() {
        var classificadosA = $scope.ordenarTabela("A");
        var campeaoSerieA = classificadosA[0].clube;
        var rebaixadosA = classificadosA.slice(16, 20).map(function(t) { return t.clube; });
        var classB = $scope.ordenarTabela("B");
        var promovidosB = classB.slice(0, 4).map(function(t) { return t.clube; });
        
        var campeaoCopa = null;
        var ultimaFaseCopa = $scope.copaBrasil.chaves[$scope.copaBrasil.chaves.length - 1];
        if (ultimaFaseCopa && ultimaFaseCopa.length > 0 && ultimaFaseCopa[0].vencedor) {
            campeaoCopa = ultimaFaseCopa[0].vencedor;
        }
        
        var artilheiro = null;
        var maxGols = 0;
        $scope.jogadores.forEach(function(j) {
            if ((j.golsTemporada || 0) > maxGols) {
                maxGols = j.golsTemporada;
                artilheiro = j;
            }
        });
        
        var msgDiretoria = "";
        var statusDiretoria = "";
        var demitido = false;
        var posicaoTabela = $scope.ordenarTabela($scope.clubeAtual.divisao).findIndex(function(t) { return t.clube.id === $scope.clubeAtual.id; }) + 1;
        
        var nomesFases = ["1ª Fase", "2ª Fase", "Oitavas de Final", "Quartas de Final", "Semifinal", "Final", "Campeão"];
        var copaFaseAlcance = "Não participou";
        if ($scope.copaBrasil && $scope.copaBrasil.chaves) {
            for (var i = 0; i < $scope.copaBrasil.chaves.length; i++) {
                var jogouFase = $scope.copaBrasil.chaves[i].find(function(c) {
                    return c.time1.id === $scope.clubeAtual.id || c.time2.id === $scope.clubeAtual.id;
                });
                if (jogouFase) {
                    copaFaseAlcance = "Eliminado na " + nomesFases[i];
                    if (i === $scope.copaBrasil.chaves.length - 1 && jogouFase.vencedor && jogouFase.vencedor.id === $scope.clubeAtual.id) {
                        copaFaseAlcance = "🏆 Campeão da Copa do Brasil";
                    } else if (i === $scope.copaBrasil.chaves.length - 1 && jogouFase.vencedor && jogouFase.vencedor.id !== $scope.clubeAtual.id) {
                        copaFaseAlcance = "🥈 Vice-Campeão (Final)";
                    }
                }
            }
        }

        var metaTabela = 10;
        if ($scope.clubeAtual.reputacao >= 85) metaTabela = 4;
        else if ($scope.clubeAtual.reputacao >= 70) metaTabela = 10;
        else if ($scope.clubeAtual.reputacao >= 50) metaTabela = 15;
        else metaTabela = 20;

        var subiu = false;
        var desceu = false;
        if (posicaoTabela <= 4 && $scope.clubeAtual.divisao !== 'A') subiu = true;
        if (posicaoTabela >= 17 && $scope.clubeAtual.divisao !== 'D') desceu = true;

        if (desceu) {
            statusDiretoria = "Demitido"; msgDiretoria = "O rebaixamento é inaceitável. Você está demitido."; demitido = true;
        } else if (subiu) {
            statusDiretoria = "Aprovado"; msgDiretoria = "Um acesso histórico! Seu trabalho foi fenomenal e o orçamento foi dobrado para o ano que vem.";
        } else {
            if (posicaoTabela <= metaTabela) {
                statusDiretoria = "Aprovado"; msgDiretoria = "Temporada sólida, cumprimos nossos objetivos.";
            } else {
                if ($scope.clubeAtual.reputacao >= 70) {
                    statusDiretoria = "Demitido"; msgDiretoria = "Sua campanha ficou muito abaixo da meta do clube. Você está fora."; demitido = true;
                } else {
                    statusDiretoria = "Aviso"; msgDiretoria = "Foi por pouco, mas esperamos melhoras ano que vem.";
                }
            }
        }
        if ($scope.ultimoDiaEvolucao !== $scope.diaAtual) {
            $scope.aplicarEvolucaoElenco('Fechamento da temporada');
        }

        var resumoGerencial = $scope.obterResumoGerencialTemporada($scope.dados.anoAtual, $scope.clubeAtual && $scope.clubeAtual.id);
        var planoProximaTemporada = $scope.obterPlanoProximaTemporada(resumoGerencial, posicaoTabela, $scope.clubeAtual.divisao);
        var confiancaFinal = $scope.obterConfiancaDiretoria ? $scope.obterConfiancaDiretoria() : null;
        var ambienteFinal = $scope.ambienteElencoResumo || ($scope.atualizarAmbienteElencoResumo ? $scope.atualizarAmbienteElencoResumo() : null);
        $scope.relatorioFimAno = {
            campeaoSerieA: campeaoSerieA,
            rebaixadosA: rebaixadosA,
            promovidosB: promovidosB,
            campeaoCopa: campeaoCopa,
            artilheiro: artilheiro,
            msgDiretoria: msgDiretoria,
            statusDiretoria: statusDiretoria,
            demitido: demitido,
            meuDesempenhoLiga: posicaoTabela + "º Lugar (Série " + $scope.clubeAtual.divisao + ")",
            meuDesempenhoCopa: copaFaseAlcance,
            resumoGerencial: resumoGerencial,
            planoProximaTemporada: planoProximaTemporada,
            confiancaDiretoria: confiancaFinal ? confiancaFinal.percentual : null,
            margemPlanejamento: $scope.obterMargemPlanejamentoDiretoria ? $scope.obterMargemPlanejamentoDiretoria().percentual : null,
            ambienteElenco: ambienteFinal ? ambienteFinal.valor : null,
            metasTemporada: angular.copy(($scope.diretoriaStatus && $scope.diretoriaStatus.metasTemporada) || [])
        };
        
        $scope.telaAtual = 'cerimonia';
    };

    $scope.avancarAposCerimonia = function() {
        var relatorio = $scope.relatorioFimAno || {};
        if (!relatorio.resumoGerencial || !relatorio.statusDiretoria) {
            $scope.prepararCerimonia();
            return;
        }
        if (relatorio.demitido) {
            if (!$scope.dados.reputacaoTreinador) $scope.dados.reputacaoTreinador = 3;
            $scope.dados.reputacaoTreinador--;
            if ($scope.dados.reputacaoTreinador < 1) $scope.dados.reputacaoTreinador = 1;
            $scope.prepararMercadoTrabalho();
        } else {
            $scope.executarViradaDeAno(false);
        }
    };

    // FASE 16: Mercado de Trabalho
    $scope.prepararMercadoTrabalho = function() {
        $scope.telaAtual = 'mercado_trabalho';
        var repMaxima = 40;
        if ($scope.dados.reputacaoTreinador === 2) repMaxima = 60;
        if ($scope.dados.reputacaoTreinador === 3) repMaxima = 75;
        if ($scope.dados.reputacaoTreinador === 4) repMaxima = 85;
        if ($scope.dados.reputacaoTreinador >= 5) repMaxima = 100;
        var narrativa = $scope.dados.reputacaoNarrativa || { respeito: 50, confianca: 50 };
        repMaxima += Math.round(((narrativa.respeito || 50) - 50) / 10) + Math.round(((narrativa.confianca || 50) - 50) / 20);
        repMaxima = Math.max(30, Math.min(100, repMaxima));
        $scope.reputacaoNarrativaLabel = narrativa.respeito >= 70 ? 'Treinador respeitado' : (narrativa.respeito <= 30 ? 'Treinador polêmico' : 'Treinador equilibrado');

        var clubesDisponiveis = $scope.clubes.filter(function(c) {
            return c.reputacao <= repMaxima && c.id !== $scope.clubeAtual.id;
        });

        clubesDisponiveis.sort(function() { return 0.5 - Math.random(); });
        $scope.propostasEmprego = clubesDisponiveis.slice(0, 4); // Oferece até 4 clubes
    };

    $scope.aceitarProposta = function(clubeId) {
        var clubeAnterior = $scope.clubeAtual;
        var novoClube = $scope.clubes.find(function(clube) { return clube.id === clubeId; });
        if (!novoClube || (clubeAnterior && novoClube.id === clubeAnterior.id)) return;
        capturarEstadoOperacionalClube(clubeAnterior && clubeAnterior.id);
        $scope.mudancaClubePendente = {
            clubeAnteriorId: clubeAnterior && clubeAnterior.id,
            clubeAnteriorNome: clubeAnterior && clubeAnterior.nome,
            clubeAnteriorDivisao: clubeAnterior && clubeAnterior.divisao,
            clubeNovoId: novoClube && novoClube.id,
            clubeNovoNome: novoClube && novoClube.nome,
            clubeNovoDivisao: novoClube && novoClube.divisao,
            reputacao: $scope.dados.reputacaoTreinador || 3
        };
        $scope.selecionarClube(clubeId);
        // A comissão e o restante da gestão pertencem ao clube assumido.
        if (!restaurarEstadoOperacionalClube(clubeId)) $scope.staffClube = criarStaffPadrao();
        $scope.executarViradaDeAno(true);
    };

    $scope.executarViradaDeAno = function(trocouDeClube) {
        var mudancaClube = $scope.mudancaClubePendente;
        var clubeAntesDaVirada = trocouDeClube && mudancaClube ? $scope.clubes.find(function(clube) { return clube.id === mudancaClube.clubeAnteriorId; }) : $scope.clubeAtual;
        var temporadaEncerrada = $scope.dados.anoAtual;
        var estadoNovoRestaurado = trocouDeClube && !!($scope.estadosOperacionaisClubes && $scope.estadosOperacionaisClubes[$scope.clubeAtual && $scope.clubeAtual.id]);
        var divs = ["A", "B", "C", "D"];
        var classificados = {};
        divs.forEach(function(d) { classificados[d] = $scope.ordenarTabela(d); });
        var tabelaClubeAntesDaVirada = clubeAntesDaVirada && classificados[clubeAntesDaVirada.divisao] ?
            classificados[clubeAntesDaVirada.divisao].find(function(t) { return t.clube.id === clubeAntesDaVirada.id; }) : null;
        var posicaoTemporada = tabelaClubeAntesDaVirada ? classificados[clubeAntesDaVirada.divisao].findIndex(function(t) { return t.clube.id === clubeAntesDaVirada.id; }) + 1 : null;
        var conquistasTemporada = [];
        if (posicaoTemporada === 1) conquistasTemporada.push('Campeão da Série ' + clubeAntesDaVirada.divisao);
        if (clubeAntesDaVirada.divisao !== 'A' && posicaoTemporada && posicaoTemporada <= 4) conquistasTemporada.push('Acesso para a Série ' + String.fromCharCode(clubeAntesDaVirada.divisao.charCodeAt(0) - 1));
        if (clubeAntesDaVirada.divisao !== 'D' && posicaoTemporada && posicaoTemporada >= 17) conquistasTemporada.push('Rebaixamento para a Série ' + String.fromCharCode(clubeAntesDaVirada.divisao.charCodeAt(0) + 1));
        if ($scope.relatorioFimAno && $scope.relatorioFimAno.campeaoCopa && $scope.relatorioFimAno.campeaoCopa.id === clubeAntesDaVirada.id) conquistasTemporada.push('Campeão da Copa do Brasil');
        if ($scope.relatorioFimAno && $scope.relatorioFimAno.demitido) conquistasTemporada.push('Demitido ao fim da temporada');
        
        // Salva os classificados para as competições continentais
        $scope.classificadosAnoAnterior = classificados["A"].map(function(t) { return t.clube; });
        if ($scope.relatorioFimAno && $scope.relatorioFimAno.campeaoCopa) {
            $scope.campeaoCopaAnoAnterior = $scope.relatorioFimAno.campeaoCopa;
        }

        for(var i = 16; i < 20; i++) classificados["A"][i].clube.divisao = "B";
        for(var i = 0; i < 4; i++) classificados["B"][i].clube.divisao = "A";
        for(var i = 16; i < 20; i++) classificados["B"][i].clube.divisao = "C";
        for(var i = 0; i < 4; i++) classificados["C"][i].clube.divisao = "B";
        for(var i = 16; i < 20; i++) classificados["C"][i].clube.divisao = "D";
        for(var i = 0; i < 4; i++) classificados["D"][i].clube.divisao = "C";
        
        if ($scope.elencoAtual) {
            var dispensados = [];
            $scope.elencoAtual.forEach(function(j) { 
                j.idade++; 

                if (j.anosContrato) j.anosContrato--;
                if (!j.anosContrato || j.anosContrato <= 0) {
                    dispensados.push(j.nome);
                    j.clubeId = 'mercado';
                    j.emCampo = false;
                }

                j.xpTemporada = 0;
                j.jogosTemporada = 0;
                j.minutosTemporada = 0;
                j.evolucaoTemporada = 0;
                sincronizarJogadorBaseDesenvolvimento(j);
            });
            
            $scope.elencoAtual = $scope.elencoAtual.filter(function(j) { return j.anosContrato > 0; });
            if (dispensados.length > 0) {
                alert("Os seguintes jogadores ficaram sem contrato e deixaram o clube: " + dispensados.join(", "));
                if (typeof $scope.atualizarTaticas === 'function') $scope.atualizarTaticas();
            }
        }
        
        if ($scope.jogadores) {
            $scope.jogadores.forEach(function(j) { 
                j.idade++; 
                j.golsTemporada = 0;
                j.partidasJogadas = 0; // Reset
                j.xpTemporada = 0;
                j.jogosTemporada = 0;
                j.minutosTemporada = 0;
                j.evolucaoTemporada = 0;
                var temPreContrato = ($scope.propostasPendentes || []).some(function(proposta) { return proposta.tipo === 'pre_contrato' && proposta.jogadorId === j.id && proposta.status === 'em_jogador'; });
                if ((!j.anosContrato || j.anosContrato <= 0) && !temPreContrato) j.anosContrato = Math.floor(Math.random() * 3) + 1; 
            });
        }
        $scope.processarPreContratos();
        if (trocouDeClube && $scope.clubeAtual) {
            // A virada ajusta contratos no cadastro global; reconstrói o elenco ativo
            // para não manter a lista do clube anterior ou uma lista vazia.
            $scope.selecionarClube($scope.clubeAtual.id);
        }

        if (!trocouDeClube) {
            if (!$scope.dados.reputacaoTreinador) $scope.dados.reputacaoTreinador = 3;
            
            // FASE 5: Avaliar Meta da Diretoria
            $scope.avaliarMetaDiretoria(classificados);

            // Premiações
            var pos = classificados[$scope.clubeAtual.divisao].findIndex(function(t) { return t.clube.id === $scope.clubeAtual.id; });
            var premio = 0;
            if ($scope.clubeAtual.divisao === 'A') premio = (20 - pos) * 2000000;
            if ($scope.clubeAtual.divisao === 'B') premio = (20 - pos) * 500000;
            if ($scope.clubeAtual.divisao === 'C') premio = (20 - pos) * 100000;
            if ($scope.clubeAtual.divisao === 'D') premio = (20 - pos) * 20000;
            
            $scope.clubeAtual.orcamento += premio;
        }

        $scope.dados.anoAtual++;
        if (!Array.isArray($scope.historicoTreinador)) $scope.historicoTreinador = [];
        var eventoHistorico = {
            tipo: trocouDeClube ? 'mudanca_clube' : 'temporada',
            clubeId: clubeAntesDaVirada && clubeAntesDaVirada.id,
            clubeNome: clubeAntesDaVirada && clubeAntesDaVirada.nome,
            divisao: clubeAntesDaVirada && clubeAntesDaVirada.divisao,
            temporada: temporadaEncerrada,
            posicao: posicaoTemporada,
            pontos: tabelaClubeAntesDaVirada ? tabelaClubeAntesDaVirada.pontos : 0,
            vitorias: tabelaClubeAntesDaVirada ? tabelaClubeAntesDaVirada.vitorias : 0,
            empates: tabelaClubeAntesDaVirada ? tabelaClubeAntesDaVirada.empates : 0,
            derrotas: tabelaClubeAntesDaVirada ? tabelaClubeAntesDaVirada.derrotas : 0,
            saldo: tabelaClubeAntesDaVirada ? tabelaClubeAntesDaVirada.saldo : 0,
            conquistas: conquistasTemporada,
            confiancaDiretoria: $scope.relatorioFimAno && $scope.relatorioFimAno.confiancaDiretoria,
            ambienteElenco: $scope.relatorioFimAno && $scope.relatorioFimAno.ambienteElenco,
            aproveitamento: $scope.relatorioFimAno && $scope.relatorioFimAno.resumoGerencial && $scope.relatorioFimAno.resumoGerencial.aproveitamento,
            descricao: trocouDeClube ? 'Mudança de clube após a temporada ' + temporadaEncerrada : 'Temporada ' + temporadaEncerrada + ' concluída'
        };
        if (trocouDeClube && mudancaClube) {
            eventoHistorico.clubeAnteriorId = mudancaClube.clubeAnteriorId;
            eventoHistorico.clubeAnteriorNome = mudancaClube.clubeAnteriorNome;
            eventoHistorico.clubeAnteriorDivisao = mudancaClube.clubeAnteriorDivisao;
            eventoHistorico.clubeNovoId = mudancaClube.clubeNovoId;
            eventoHistorico.clubeNovoNome = mudancaClube.clubeNovoNome;
            eventoHistorico.clubeNovoDivisao = mudancaClube.clubeNovoDivisao;
            eventoHistorico.reputacaoTreinador = mudancaClube.reputacao;
            eventoHistorico.descricao = mudancaClube.clubeAnteriorNome + ' → ' + mudancaClube.clubeNovoNome;
        }
        $scope.historicoTreinador.unshift(eventoHistorico);
        $scope.historicoTreinador = $scope.historicoTreinador.slice(0, 30);
        if (trocouDeClube && !estadoNovoRestaurado) {
            $scope.financasHistorico = [];
            $scope.historicoFinanceiroMensal = {};
            $scope.caixaEntrada = [];
            $scope.ambienteElenco = criarAmbienteElencoPadrao();
            $scope.atualizarAmbienteElencoResumo();
            $scope.contextoExterno = criarContextoExternoPadrao();
            $scope.atualizarResumoContextoExterno();
            $scope.preparacaoTemporada = normalizarPreparacaoTemporada();
            $scope.diretoriaStatus = criarDiretoriaStatusPadrao();
            $scope.ultimoResumoPartida = null;
            $scope.staffClube = criarStaffPadrao();
            $scope.patrocinioAtual = null;
            $scope.propostasPendentes = [];
            $scope.caixaEntrada.unshift({
                id: 'msg_boas_vindas_' + $scope.dados.anoAtual + '_' + $scope.clubeAtual.id,
                remetente: 'Diretoria',
                assunto: 'Bem-vindo ao ' + $scope.clubeAtual.nome,
                mensagem: 'A nova temporada começa agora. A diretoria deseja um bom trabalho e espera conhecer suas prioridades para o clube.',
                lida: false,
                tipo: 'diretoria',
                data: new Date().toLocaleDateString('pt-BR')
            });
            $scope.mensagensNaoLidas = 1;
        }
        $scope.mudancaClubePendente = null;
        $scope.patrocinioAtual = null; // Renovar patrocínios todo ano
        $scope.gerarPatrocinadores();
        
        $scope.gerarCalendario();
        $scope.gerarMetaDiretoria();
        if ($scope.relatorioFimAno && $scope.relatorioFimAno.planoProximaTemporada) {
            $scope.diretoriaStatus = normalizarDiretoriaStatusInterno($scope.diretoriaStatus);
            $scope.diretoriaStatus.planoAtual = angular.copy($scope.relatorioFimAno.planoProximaTemporada);
        }

        $scope.caixaEntrada.unshift({
            id: 'msg_janela_inicio_ano_' + $scope.dados.anoAtual,
            remetente: 'Federação',
            assunto: 'Janela de Transferências ABERTA!',
            mensagem: 'O período de transferências acaba de começar! Os clubes estão livres para comprar e vender atletas durante a janela inicial da temporada.',
            lida: false,
            tipo: 'info',
            data: new Date().toLocaleDateString('pt-BR')
        });
        $scope.mensagensNaoLidas++;
        if ($scope.diretoriaStatus.planoAtual) {
            $scope.caixaEntrada.unshift({
                id: 'msg_plano_diretoria_' + $scope.dados.anoAtual,
                remetente: 'Diretoria', assunto: 'Briefing da nova temporada',
                mensagem: $scope.diretoriaStatus.planoAtual.titulo + '. ' + $scope.diretoriaStatus.planoAtual.detalhe,
                lida: false, tipo: 'diretoria', data: new Date().toLocaleDateString('pt-BR')
            });
            $scope.mensagensNaoLidas++;
        }

        $scope.mudarTela('dashboard');
        $scope.salvarJogoSilencioso();
    };

    // FASE 5: Objetivos da Diretoria
    $scope.gerarMetaDiretoria = function() {
        if (!$scope.clubeAtual) return;
        var r = $scope.clubeAtual.reputacao;
        var div = $scope.clubeAtual.divisao;
        
        if (div === 'A') {
            if (r >= 4) { $scope.clubeAtual.metaDescricao = "Lutar pelo Título"; $scope.clubeAtual.metaTipo = "titulo"; }
            else if (r === 3) { $scope.clubeAtual.metaDescricao = "Classificar para Competição Continental (Top 6)"; $scope.clubeAtual.metaTipo = "continental"; }
            else { $scope.clubeAtual.metaDescricao = "Evitar o Rebaixamento"; $scope.clubeAtual.metaTipo = "sobreviver"; }
        } else {
            if (r >= 4) { $scope.clubeAtual.metaDescricao = "Garantir o Acesso (Top 4)"; $scope.clubeAtual.metaTipo = "acesso"; }
            else if (r === 3) { $scope.clubeAtual.metaDescricao = "Terminar na metade de cima da tabela (Top 10)"; $scope.clubeAtual.metaTipo = "top10"; }
            else { $scope.clubeAtual.metaDescricao = "Evitar o Rebaixamento"; $scope.clubeAtual.metaTipo = "sobreviver"; }
        }
        $scope.diretoriaStatus = normalizarDiretoriaStatusInterno($scope.diretoriaStatus);
        $scope.diretoriaStatus.objetivoAtual = $scope.clubeAtual.metaDescricao;
        $scope.diretoriaStatus.tipoObjetivo = $scope.clubeAtual.metaTipo;
        $scope.diretoriaStatus.metasTemporada = [
            { tipo: 'esportiva', titulo: $scope.clubeAtual.metaDescricao, detalhe: 'Cumprir a expectativa de desempenho na competição nacional.', status: 'principal', progresso: 0 },
            { tipo: 'financeira', titulo: 'Manter a operação sustentável', detalhe: 'Preservar caixa para salários, compromissos e oportunidades da temporada.', status: 'acompanhar', progresso: 0 },
            { tipo: 'desenvolvimento', titulo: 'Evoluir o elenco', detalhe: 'Registrar evolução e aproveitar melhor os atletas em desenvolvimento.', status: 'acompanhar', progresso: 0 },
            { tipo: 'mercado', titulo: 'Qualificar o planejamento de mercado', detalhe: 'Resolver carências sem comprometer a saúde financeira do clube.', status: 'acompanhar', progresso: 0 }
        ];
        $scope.atualizarDiretoriaStatus();
    };

    $scope.confirmarPrioridadeTemporada = function(tipo) {
        var metas = $scope.diretoriaStatus && $scope.diretoriaStatus.metasTemporada;
        if (!Array.isArray(metas) || !metas.some(function(meta) { return meta.tipo === tipo; })) return false;
        $scope.diretoriaStatus = normalizarDiretoriaStatusInterno($scope.diretoriaStatus);
        $scope.diretoriaStatus.prioridadeTemporada = tipo;
        $scope.diretoriaStatus.briefingInicialConcluido = true;
        metas.forEach(function(meta) { meta.status = meta.tipo === tipo ? 'principal' : 'acompanhar'; });
        var metaEscolhida = metas.find(function(meta) { return meta.tipo === tipo; });
        $scope.diretoriaStatus.ultimaObservacao = 'A diretoria colocou ' + metaEscolhida.tipo + ' como prioridade da temporada.';
        $scope.registrarDecisaoGestao('briefing_temporada', 'Prioridade definida para a temporada: ' + metaEscolhida.titulo + '.');
        $scope.adicionarMensagem('Diretoria', 'Prioridade da temporada confirmada', 'A diretoria registrou "' + metaEscolhida.titulo + '" como prioridade principal. A meta esportiva continua sendo ' + $scope.diretoriaStatus.objetivoAtual + '.', false, 'diretoria');
        $scope.salvarJogoSilencioso();
        return true;
    };

    $scope.avaliarMetaDiretoria = function(classificados) {
        var pos = classificados[$scope.clubeAtual.divisao].findIndex(function(t) { return t.clube.id === $scope.clubeAtual.id; }) + 1;
        var metaCumprida = false;
        var meta = $scope.clubeAtual.metaTipo;

        if (meta === 'titulo' && pos === 1) metaCumprida = true;
        else if (meta === 'continental' && pos <= 6) metaCumprida = true;
        else if (meta === 'acesso' && pos <= 4) metaCumprida = true;
        else if (meta === 'top10' && pos <= 10) metaCumprida = true;
        else if (meta === 'sobreviver' && pos <= 16) metaCumprida = true;

        if (metaCumprida) {
            alert("🎯 Você atingiu a Meta da Diretoria: " + $scope.clubeAtual.metaDescricao + "! Como recompensa, recebeu R$ 2.000.000 e sua reputação aumentou.");
            $scope.clubeAtual.orcamento += 2000000;
            $scope.financasHistorico.unshift({
                tipo: 'receita', descricao: 'Bônus Meta Atingida', valor: 2000000, data: new Date().toLocaleDateString('pt-BR')
            });
            $scope.dados.reputacaoTreinador = Math.min(5, $scope.dados.reputacaoTreinador + 1);
        } else {
            alert("❌ Você falhou na Meta da Diretoria: " + $scope.clubeAtual.metaDescricao + ". Sua reputação como treinador diminuiu.");
            $scope.dados.reputacaoTreinador = Math.max(1, $scope.dados.reputacaoTreinador - 1);
        }
    };

    // FASE 13: Expandir Estádio
    $scope.expandirEstadio = function() {
        var custoExpansao = 5000000;
        if ($scope.clubeAtual.orcamento < custoExpansao) {
            $scope.adicionarMensagem('Diretoria', 'Orçamento Insuficiente', 'Não temos verba para a expansão do estádio agora. Custo: ' + $scope.formatarMoeda(custoExpansao), false, 'dinheiro');
            return;
        }
        if ($scope.clubeAtual.estadio.obraEmAndamento) {
            $scope.adicionarMensagem('Engenharia', 'Obra em Andamento', 'Já estamos reformando o estádio!', false, 'estadio');
            return;
        }
        if (confirm("Deseja investir " + $scope.formatarMoeda(custoExpansao) + " para expandir o estádio em 5.000 lugares? A obra levará 3 rodadas para ser concluída.")) {
            $scope.clubeAtual.orcamento -= custoExpansao;
            $scope.clubeAtual.estadio.obraEmAndamento = true;
            $scope.clubeAtual.estadio.rodadasRestantesObra = 3;
            
            $scope.financasHistorico.unshift({
                tipo: 'despesa',
                descricao: 'Expansão do Estádio (Sinal)',
                valor: custoExpansao,
                data: new Date().toLocaleDateString('pt-BR')
            });
            $scope.salvarJogoSilencioso();
        }
    };

    $scope.calcularFolhaSalarial = function() {
        var folha = 0;
        if ($scope.elencoAtual) {
            $scope.elencoAtual.forEach(function(j) { folha += (j.salario || 0); });
        }
        // FASE 14: Salário dos Olheiros
        if ($scope.clubeAtual && $scope.clubeAtual.olheiros) {
            folha += ($scope.clubeAtual.olheiros.length * 15000);
        }
        ($scope.staffClube || []).forEach(function(item) {
            if (item.contratado) folha += (parseFloat(item.salario) || 0);
        });
        return folha;
    };

    $scope.calcularResumoFinanceiro = function() {
        var receitas = 0;
        var despesas = 0;
        ($scope.financasHistorico || []).forEach(function(item) {
            var valor = parseFloat(item.valor) || 0;
            if (item.tipo === 'receita') receitas += valor;
            if (item.tipo === 'despesa') despesas += valor;
        });
        var folha = $scope.calcularFolhaSalarial();
        var cotaPorDivisao = { A: 8000000, B: 2500000, C: 1200000, D: 600000 };
        var cota = cotaPorDivisao[$scope.clubeAtual && $scope.clubeAtual.divisao] || 600000;
        return {
            receitas: receitas,
            despesas: despesas,
            saldo: receitas - despesas,
            folhaMensal: folha,
            cotaTransmissaoMensal: cota,
            resultadoMensalEstimado: cota + (parseFloat($scope.clubeAtual && $scope.clubeAtual.reputacao) || 0) * 25000 - folha - (($scope.clubeAtual && $scope.clubeAtual.estadio && $scope.clubeAtual.estadio.capacidade) || 0) * 20
        };
    };

    $scope.obterAlertasFinanceiros = function() {
        var resumo = $scope.calcularResumoFinanceiro();
        var chaveCache = [resumo.cotaTransmissaoMensal, resumo.folhaMensal, resumo.resultadoMensalEstimado, $scope.clubeAtual && $scope.clubeAtual.orcamento].join('|');
        if ($scope.alertasFinanceirosCache && $scope.alertasFinanceirosCache.chave === chaveCache) return $scope.alertasFinanceirosCache.itens;
        var alertas = [];
        var receitaMensalBase = resumo.cotaTransmissaoMensal + ((parseFloat($scope.clubeAtual && $scope.clubeAtual.reputacao) || 0) * 25000);
        if (resumo.folhaMensal > receitaMensalBase * 0.7) {
            alertas.push({ nivel: 'atencao', titulo: 'Folha pressionada', texto: 'A folha salarial supera 70% da receita mensal recorrente.' });
        }
        if (resumo.resultadoMensalEstimado < 0) {
            alertas.push({ nivel: 'critico', titulo: 'Projeção negativa', texto: 'As despesas mensais projetadas estão acima das receitas recorrentes.' });
        }
        if (($scope.clubeAtual && $scope.clubeAtual.orcamento || 0) < resumo.folhaMensal * 2) {
            alertas.push({ nivel: 'critico', titulo: 'Caixa curto', texto: 'O caixa cobre menos de dois ciclos de folha salarial.' });
        }
        $scope.alertasFinanceirosCache = { chave: chaveCache, itens: alertas };
        return alertas;
    };

    $scope.verificarAlertasFinanceiros = function() {
        $scope.alertasFinanceirosAtivos = $scope.alertasFinanceirosAtivos || {};
        var atuais = {};
        $scope.obterAlertasFinanceiros().forEach(function(alerta) {
            atuais[alerta.titulo] = true;
            if (!$scope.alertasFinanceirosAtivos[alerta.titulo]) {
                $scope.caixaEntrada = $scope.caixaEntrada || [];
                $scope.caixaEntrada.unshift({
                    id: 'msg_financeiro_' + Date.now() + '_' + alerta.titulo,
                    remetente: 'Departamento Financeiro',
                    assunto: alerta.titulo,
                    mensagem: alerta.texto,
                    lida: false,
                    tipo: alerta.nivel === 'critico' ? 'alerta' : 'info',
                    data: new Date().toLocaleDateString('pt-BR')
                });
                $scope.mensagensNaoLidas = ($scope.mensagensNaoLidas || 0) + 1;
            }
        });
        $scope.alertasFinanceirosAtivos = atuais;
    };

    // FASE 17: GERAÇÃO DE PATROCINADORES MASTER
    $scope.gerarPatrocinadores = function() {
        if (!$scope.clubeAtual) return;
        normalizarInfraestruturaClubeInterno($scope.clubeAtual);
        var base = $scope.clubeAtual.reputacao * 500000 * $scope.calcularMultiplicadorComercialInfraestrutura();
        $scope.patrocinadoresDisponiveis = [
            { 
                id: 1, 
                nome: "ReiCola", 
                tipo: "Fixo Alto", 
                pagamentoFixo: base * 12, 
                bonusPorVitoria: 0, 
                descricao: "Pagamento imediato na assinatura. Sem bônus por vitória." 
            },
            { 
                id: 2, 
                nome: "TechBet", 
                tipo: "Equilibrado", 
                pagamentoFixo: base * 4, 
                bonusPorVitoria: (base * 8) / 38, 
                descricao: "Pequeno pagamento na assinatura. Bônus por cada vitória no calendário." 
            },
            { 
                id: 3, 
                nome: "Banco Rei", 
                tipo: "Variável Extremo", 
                pagamentoFixo: 0, 
                bonusPorVitoria: (base * 15) / 38, 
                descricao: "Nada garantido. O clube só recebe por cada partida vencida." 
            }
        ];
    };

    $scope.assinarPatrocinio = function(pat) {
        $scope.patrocinioAtual = pat;
        if (pat.pagamentoFixo > 0) {
            $scope.clubeAtual.orcamento += pat.pagamentoFixo;
            $scope.financasHistorico.unshift({ data: new Date().toLocaleDateString('pt-BR'), tipo: 'receita', descricao: 'Assinatura de Patrocínio: ' + pat.nome, valor: pat.pagamentoFixo });
        }
        $scope.adicionarMensagem('Departamento Financeiro', 'Novo Patrocínio Fechado', 'Assinamos um novo contrato master com a empresa ' + pat.nome + '!', false, 'dinheiro');
        $scope.salvarJogoSilencioso();
    };

    // LÓGICA DE SALVAR E CARREGAR
    $scope.checarSaveExistente = function() {
        var saveLocal = window.localStorage.getItem('reiDaPranchetaSave');
        if (saveLocal) {
            $scope.existeSave = true;
            $scope.saveInfo = JSON.parse(saveLocal);
            var slotsExistentes = {};
            try { slotsExistentes = JSON.parse(window.localStorage.getItem('reiDaPranchetaSaveSlots') || '{}'); } catch (e) { slotsExistentes = {}; }
            if (!slotsExistentes['0']) {
                slotsExistentes['0'] = $scope.saveInfo;
                window.localStorage.setItem('reiDaPranchetaSaveSlots', JSON.stringify(slotsExistentes));
            }
        } else {
            $scope.existeSave = false;
            $scope.saveInfo = null;
        }
    };

    $scope.migrarSave = function(saveInfo) {
        if (!saveInfo) return saveInfo;

        var version = saveInfo.saveVersion || 1;

        if (!saveInfo.savedAt) saveInfo.savedAt = new Date().toISOString();
        if (!Array.isArray(saveInfo.historicoTreinador)) saveInfo.historicoTreinador = [];
        if (!Array.isArray(saveInfo.historicoPartidas)) saveInfo.historicoPartidas = [];
        if (!Array.isArray(saveInfo.historicoDecisoesGestao)) saveInfo.historicoDecisoesGestao = [];
        if (!saveInfo.estadosOperacionaisClubes || typeof saveInfo.estadosOperacionaisClubes !== 'object') saveInfo.estadosOperacionaisClubes = {};
        if (!saveInfo.historicoFinanceiroMensal || typeof saveInfo.historicoFinanceiroMensal !== 'object') saveInfo.historicoFinanceiroMensal = {};
        saveInfo.staffClube = normalizarStaff(saveInfo.staffClube);
        if (!Array.isArray(saveInfo.emprestimosAtivos)) saveInfo.emprestimosAtivos = [];

        // v1 -> v2: calendario/continentais sao reconciliados apos aplicar no $scope.
        if (!Array.isArray(saveInfo.calendarioGeral)) saveInfo.calendarioGeral = [];

        // v2 -> v3: atributos, fadiga e telemetria adicionados ao modelo.
        normalizarListaJogadoresSalvos(saveInfo.elencoAtual);
        normalizarListaJogadoresSalvos(saveInfo.jogadores);
        normalizarListaJogadoresSalvos($scope.jogadores);
        if (!Array.isArray(saveInfo.telemetriaHistorico)) saveInfo.telemetriaHistorico = [];
        if (!Array.isArray(saveInfo.transferenciasHistorico)) saveInfo.transferenciasHistorico = [];
        if (!Array.isArray(saveInfo.propostasPendentes)) saveInfo.propostasPendentes = [];
        if (saveInfo.ultimoResumoPartida === undefined) saveInfo.ultimoResumoPartida = null;
        if (!Array.isArray(saveInfo.relatorioEvolucao)) saveInfo.relatorioEvolucao = [];
        if (saveInfo.ultimoDiaEvolucao === undefined) saveInfo.ultimoDiaEvolucao = 0;
        saveInfo.preparacaoTemporada = normalizarPreparacaoTemporada(saveInfo.preparacaoTemporada);
        saveInfo.ambienteElenco = normalizarAmbienteElencoInterno(saveInfo.ambienteElenco || criarAmbienteElencoPadrao());
        if (saveInfo.clubeAtualInfo) normalizarScoutingClube(saveInfo.clubeAtualInfo);
        if (saveInfo.clubeAtualInfo) normalizarInfraestruturaClubeInterno(saveInfo.clubeAtualInfo);
        if (saveInfo.clubeAtualInfo) normalizarBaseClubeInterno(saveInfo.clubeAtualInfo);
        saveInfo.diretoriaStatus = normalizarDiretoriaStatusInterno(saveInfo.diretoriaStatus || criarDiretoriaStatusPadrao());
        saveInfo.contextoExterno = normalizarContextoExternoInterno(saveInfo.contextoExterno || criarContextoExternoPadrao());

        // v3 -> v4: estado de UI derivado nao deve persistir no save.
        saveInfo.filtroCalendario = 'TODOS';
        delete saveInfo.calendarioFiltrado;
        delete saveInfo.proximosEventosOffsets;

        if (version < SAVE_VERSION_ATUAL || saveInfo.saveVersion !== SAVE_VERSION_ATUAL) {
            saveInfo.saveVersion = SAVE_VERSION_ATUAL;
        }

        return saveInfo;
    };

    $scope.salvarJogoSilencioso = function() {
        if (!$scope.clubeAtual) return;
        normalizarScoutingClube($scope.clubeAtual);
        normalizarInfraestruturaClubeInterno($scope.clubeAtual);
        normalizarBaseClubeInterno($scope.clubeAtual);
        $scope.atualizarResumoInfraestrutura();
        $scope.atualizarResumoBase();
        $scope.diretoriaStatus = normalizarDiretoriaStatusInterno($scope.diretoriaStatus);
        $scope.preparacaoTemporada = normalizarPreparacaoTemporada($scope.preparacaoTemporada);
        $scope.contextoExterno = normalizarContextoExternoInterno($scope.contextoExterno || criarContextoExternoPadrao());
        $scope.atualizarResumoContextoExterno();
        var saveObj = {
            saveVersion: SAVE_VERSION_ATUAL,
            savedAt: new Date().toISOString(),
            nomeTreinador: $scope.dados.nomeTreinador,
            historicoTreinador: $scope.historicoTreinador || [],
            historicoPartidas: $scope.historicoPartidas || [],
            historicoDecisoesGestao: $scope.historicoDecisoesGestao || [],
            estadosOperacionaisClubes: $scope.estadosOperacionaisClubes || {},
            preparacaoTemporada: $scope.preparacaoTemporada,
            historicoFinanceiroMensal: $scope.historicoFinanceiroMensal || {},
            staffClube: normalizarStaff($scope.staffClube),
            emprestimosAtivos: $scope.emprestimosAtivos || [],
            anoAtual: $scope.dados.anoAtual || 2024,
            caixaEntrada: $scope.caixaEntrada || [],
            noticiasFeed: $scope.noticiasFeed || [],
            patrocinioAtual: $scope.patrocinioAtual || null,
            clubeAtualId: $scope.clubeAtual.id,
            orcamentoAtual: $scope.clubeAtual.orcamento,
            financasHistorico: $scope.financasHistorico || [],
            elencoAtual: $scope.elencoAtual,
            calendario: $scope.calendario,
            rodadaAtual: $scope.rodadaAtual,
            diaAtual: $scope.diaAtual,
            calendarioGeral: $scope.calendarioGeral,
            copaBrasil: $scope.copaBrasil,
            libertadores: $scope.libertadores,
            sulAmericana: $scope.sulAmericana,
            jogosCPU: $scope.jogosCPU,
            tabelas: $scope.tabelas,
            taticas: $scope.taticas,
            configFinanceira: $scope.configFinanceira,
            clubeAtualInfo: $scope.clubeAtual, // Adicionado para persistir o estado do estadio modificado
            dataSave: new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            telemetriaHistorico: $scope.telemetriaHistorico || [],
            ultimoResumoPartida: $scope.ultimoResumoPartida || null,
            transferenciasHistorico: $scope.transferenciasHistorico || [],
            propostasPendentes: $scope.propostasPendentes || [],
            relatorioEvolucao: $scope.relatorioEvolucao || [],
            ultimoDiaEvolucao: $scope.ultimoDiaEvolucao || 0,
            ambienteElenco: normalizarAmbienteElencoInterno($scope.ambienteElenco || criarAmbienteElencoPadrao()),
            diretoriaStatus: normalizarDiretoriaStatusInterno($scope.diretoriaStatus || criarDiretoriaStatusPadrao()),
            contextoExterno: normalizarContextoExternoInterno($scope.contextoExterno || criarContextoExternoPadrao())
        };
        window.localStorage.setItem('reiDaPranchetaSave', JSON.stringify(saveObj));
        var slots = {};
        try { slots = JSON.parse(window.localStorage.getItem('reiDaPranchetaSaveSlots') || '{}'); } catch (e) { slots = {}; }
        slots[String($scope.slotSaveAtual || 0)] = saveObj;
        window.localStorage.setItem('reiDaPranchetaSaveSlots', JSON.stringify(slots));
        $scope.atualizarSlotsSaveVisiveis();
        $scope.checarSaveExistente(); 
    };

    $scope.slotSaveAtual = 0;
    $scope.slotsSaveVisiveis = null;
    $scope.slotsSaveCacheFonte = null;
    $scope.listarSlotsSave = function() {
        var fonteAtual = window.localStorage.getItem('reiDaPranchetaSaveSlots') || '{}';
        if (Array.isArray($scope.slotsSaveVisiveis) && $scope.slotsSaveCacheFonte === fonteAtual) return $scope.slotsSaveVisiveis;
        var slots = {};
        try { slots = JSON.parse(fonteAtual); } catch (e) { slots = {}; }
        $scope.slotsSaveVisiveis = [0, 1, 2, 3].map(function(indice) {
            var save = slots[String(indice)] || null;
            var clube = save && (save.clubeAtualInfo || {}).nome;
            return { id: indice, save: save, clubeNome: clube || (save ? 'Clube não identificado' : '') };
        });
        $scope.slotsSaveCacheFonte = fonteAtual;
        return $scope.slotsSaveVisiveis;
    };
    $scope.atualizarSlotsSaveVisiveis = function() {
        $scope.slotsSaveVisiveis = null;
        $scope.slotsSaveCacheFonte = null;
        return $scope.listarSlotsSave();
    };
    $scope.salvarNoSlot = function(indice) {
        var slot = parseInt(indice, 10) || 0;
        var existente = $scope.listarSlotsSave().find(function(item) { return item.id === slot && item.save; });
        if (existente && !confirm('Sobrescrever a carreira do Slot ' + (slot + 1) + '?')) return false;
        $scope.slotSaveAtual = slot;
        $scope.salvarJogoSilencioso();
        return true;
    };
    $scope.selecionarSlotSave = function(indice) { $scope.slotSaveAtual = parseInt(indice, 10) || 0; };
    $scope.carregarSlot = function(indice) {
        var slots = {};
        try { slots = JSON.parse(window.localStorage.getItem('reiDaPranchetaSaveSlots') || '{}'); } catch (e) { slots = {}; }
        var salvo = slots[String(parseInt(indice, 10) || 0)];
        if (!salvo) return false;
        $scope.slotSaveAtual = parseInt(indice, 10) || 0;
        $scope.saveInfo = salvo;
        $scope.carregarJogo();
        return true;
    };
    $scope.excluirSlot = function(indice) {
        var slot = parseInt(indice, 10) || 0;
        var existente = $scope.listarSlotsSave().find(function(item) { return item.id === slot && item.save; });
        if (!existente || !confirm('Excluir a carreira do Slot ' + (slot + 1) + '?')) return false;
        var slots = {};
        try { slots = JSON.parse(window.localStorage.getItem('reiDaPranchetaSaveSlots') || '{}'); } catch (e) { slots = {}; }
        delete slots[String(slot)];
        window.localStorage.setItem('reiDaPranchetaSaveSlots', JSON.stringify(slots));
        if (slot === 0) {
            window.localStorage.removeItem('reiDaPranchetaSave');
            $scope.existeSave = false;
            $scope.saveInfo = null;
        }
        if ($scope.slotSaveAtual === slot) $scope.slotSaveAtual = 0;
        return true;
    };

    $scope.salvarJogo = function() {
        var slot = $scope.slotSaveAtual || 0;
        var existente = $scope.listarSlotsSave().find(function(item) { return item.id === slot && item.save; });
        if (existente && !confirm('Sobrescrever a carreira do Slot ' + (slot + 1) + '?')) return false;
        $scope.salvarJogoSilencioso();
        alert('Jogo salvo com sucesso!');
        return true;
    };

    $scope.contratarStaff = function(vaga) {
        if (!vaga || vaga.contratado || !$scope.clubeAtual) return;
        var custo = 25000 * vaga.nivel;
        if (($scope.clubeAtual.orcamento || 0) < custo) {
            alert('Orçamento insuficiente para contratar este profissional.');
            return;
        }
        var nomesStaff = {
            auxiliar: 'Rafael Martins',
            preparador: 'Eduardo Lima',
            medico: 'Dr. Marcelo Nogueira',
            analista: 'Bruno Carvalho'
        };
        vaga.nome = nomesStaff[vaga.id] || 'Profissional da comissão';
        vaga.salario = custo;
        vaga.contratado = true;
        $scope.clubeAtual.orcamento -= custo;
        if ($scope.salvarJogoSilencioso) $scope.salvarJogoSilencioso();
    };

    $scope.emprestarJogador = function(jogador, clubeDestinoId, duracaoDias, valorOpcaoCompra) {
        if (!jogador || !$scope.clubeAtual || jogador.clubeId !== $scope.clubeAtual.id) return null;
        if (!clubeDestinoId || clubeDestinoId === $scope.clubeAtual.id) return null;
        if (($scope.emprestimosAtivos || []).some(function(item) { return item.jogadorId === jogador.id; })) return null;
        var destino = ($scope.clubes || []).find(function(clube) { return clube.id === clubeDestinoId; });
        if (!destino) return null;
        var emprestimo = {
            id: 'emprestimo_' + jogador.id + '_' + Date.now(), jogadorId: jogador.id,
            jogadorNome: jogador.nome, clubeOrigemId: $scope.clubeAtual.id,
            clubeDestinoId: destino.id, clubeDestinoNome: destino.nome,
            diasRestantes: Math.max(1, parseInt(duracaoDias, 10) || 30), status: 'ativo',
            opcaoCompra: Math.max(0, parseInt(valorOpcaoCompra, 10) || 0), jogos: 0, minutos: 0, gols: 0, evolucao: 0
        };
        jogador.clubeId = destino.id;
        var base = ($scope.jogadores || []).find(function(item) { return item.id === jogador.id; });
        if (base) base.clubeId = destino.id;
        $scope.emprestimosAtivos.push(emprestimo);
        $scope.elencoAtual = $scope.elencoAtual.filter(function(item) { return item.id !== jogador.id; });
        if ($scope.salvarJogoSilencioso) $scope.salvarJogoSilencioso();
        return emprestimo;
    };

    $scope.comprarJogadorEmprestado = function(emprestimo) {
        if (!emprestimo || emprestimo.status !== 'ativo' || !emprestimo.opcaoCompra || !$scope.clubeAtual) return false;
        if (($scope.clubeAtual.orcamento || 0) < emprestimo.opcaoCompra) {
            alert('Orçamento insuficiente para exercer a opção de compra.');
            return false;
        }
        var jogador = ($scope.jogadores || []).find(function(item) { return item.id === emprestimo.jogadorId; });
        if (!jogador) return false;
        $scope.clubeAtual.orcamento -= emprestimo.opcaoCompra;
        jogador.clubeId = $scope.clubeAtual.id;
        emprestimo.status = 'comprado';
        emprestimo.diasRestantes = 0;
        if (!$scope.elencoAtual.some(function(item) { return item.id === jogador.id; })) $scope.elencoAtual.push(angular.copy(jogador));
        $scope.emprestimosAtivos = ($scope.emprestimosAtivos || []).filter(function(item) { return item.id !== emprestimo.id; });
        if ($scope.salvarJogoSilencioso) $scope.salvarJogoSilencioso();
        return true;
    };

    $scope.solicitarEmprestimo = function() {
        var form = $scope.emprestimoForm || {};
        var jogador = ($scope.elencoAtual || []).find(function(item) { return String(item.id) === String(form.jogadorId); });
        var resultado = $scope.emprestarJogador(jogador, form.clubeDestinoId, form.duracaoDias, form.opcaoCompra);
        if (!resultado) {
            alert('Não foi possível criar o empréstimo. Verifique o jogador, o destino e a duração.');
            return;
        }
        $scope.emprestimoForm = {};
    };

    $scope.abrirEmprestimoJovem = function(jogador) {
        if (!jogador) return;
        var destino = ($scope.clubes || []).find(function(clube) { return clube.id !== $scope.clubeAtual.id; });
        $scope.emprestimoForm = { jogadorId: jogador.id, clubeDestinoId: destino ? destino.id : '', duracaoDias: 60, opcaoCompra: 0 };
        $scope.mudarTela('mercado');
    };

    $scope.processarEmprestimosDia = function() {
        var devolvidos = [];
        ($scope.emprestimosAtivos || []).forEach(function(emprestimo) {
            if (emprestimo.status !== 'ativo') return;
            if (emprestimo.diasRestantes % 7 === 0) {
                emprestimo.jogos++;
                emprestimo.minutos += 65 + (emprestimo.jogadorId % 26);
                if (emprestimo.jogadorId % 5 === 0) emprestimo.gols++;
                if (emprestimo.jogos % 4 === 0) {
                    emprestimo.evolucao++;
                    var jogadorEvolucao = ($scope.jogadores || []).find(function(item) { return item.id === emprestimo.jogadorId; });
                    if (jogadorEvolucao && jogadorEvolucao.atributos) {
                        var atributo = jogadorEvolucao.posicao === 'ATA' ? 'finalizacao' : (jogadorEvolucao.posicao === 'GOL' ? 'reflexo' : 'passe');
                        jogadorEvolucao.atributos[atributo] = Math.min(99, (jogadorEvolucao.atributos[atributo] || 75) + 1);
                    }
                }
            }
            emprestimo.diasRestantes = Math.max(0, (emprestimo.diasRestantes || 0) - 1);
            if (emprestimo.diasRestantes > 0) return;
            var jogador = ($scope.jogadores || []).find(function(item) { return item.id === emprestimo.jogadorId; });
            if (jogador) jogador.clubeId = emprestimo.clubeOrigemId;
            ($scope.elencoAtual || []).forEach(function(item) {
                if (item.id === emprestimo.jogadorId) item.clubeId = emprestimo.clubeOrigemId;
            });
            emprestimo.status = 'encerrado';
            devolvidos.push(emprestimo);
        });
        $scope.emprestimosAtivos = ($scope.emprestimosAtivos || []).filter(function(item) { return item.status === 'ativo'; });
        if (devolvidos.length && $scope.clubeAtual) {
            devolvidos.forEach(function(item) {
                var jogador = ($scope.jogadores || []).find(function(j) { return j.id === item.jogadorId; });
                if (jogador && jogador.clubeId === $scope.clubeAtual.id && !$scope.elencoAtual.some(function(j) { return j.id === jogador.id; })) $scope.elencoAtual.push(angular.copy(jogador));
            });
        }
        return devolvidos;
    };

    $scope.demitirStaff = function(vaga) {
        if (!vaga || !vaga.contratado) return;
        vaga.nome = 'Vaga disponível';
        vaga.salario = 0;
        vaga.contratado = false;
        if ($scope.salvarJogoSilencioso) $scope.salvarJogoSilencioso();
    };

    $scope.proporPreContrato = function(jogador, salarioOferta, anos) {
        if (!jogador || !$scope.clubeAtual) return null;
        if (jogador.clubeId === 'mercado' || jogador.clubeId === $scope.clubeAtual.id || (jogador.anosContrato || 0) > 1) {
            alert('Este jogador não está elegível para pré-contrato. A regra vale para atletas de outros clubes em fim de contrato.');
            return null;
        }
        var existente = ($scope.propostasPendentes || []).find(function(item) { return item.tipo === 'pre_contrato' && item.jogadorId === jogador.id && !statusPropostaFinal(item.status); });
        if (existente) {
            alert('Já existe uma proposta de pré-contrato para este jogador.');
            return existente;
        }
        var proposta = {
            id: 'precontrato_' + jogador.id + '_' + Date.now(), tipo: 'pre_contrato', status: 'em_jogador',
            jogadorId: jogador.id, jogadorNome: jogador.nome, clubeOrigemId: jogador.clubeId,
            clubeOrigemNome: $scope.obterNomeClube(jogador.clubeId), clubeDestinoId: $scope.clubeAtual.id,
            clubeDestinoNome: $scope.clubeAtual.nome, salarioOferta: parseFloat(salarioOferta) || jogador.salarioDesejado || jogador.salario || 10000,
            anosContrato: parseInt(anos, 10) || 2, temporadaAssinatura: ($scope.dados.anoAtual || 2024) + 1,
            diaCriacao: $scope.diaAtual || 0, diasRestantes: 999, validadeDias: 999
        };
        $scope.propostasPendentes = $scope.propostasPendentes || [];
        $scope.propostasPendentes.unshift(proposta);
        jogador.emNegociacao = true;
        $scope.salvarJogoSilencioso();
        $scope.adicionarMensagem('Diretoria', 'Pré-contrato enviado', 'A proposta por ' + jogador.nome + ' foi registrada e será avaliada no fim do vínculo atual.', false, 'transferencia');
        alert('Pré-contrato enviado para ' + jogador.nome + '. A resposta ficará na aba Propostas.');
        return proposta;
    };

    $scope.obterStatusPreContrato = function(jogador) {
        if (!jogador) return { elegivel: false, texto: 'Jogador indisponível' };
        if (jogador.clubeId === 'mercado') return { elegivel: false, texto: 'Jogador livre: negocie contrato normal' };
        if (jogador.clubeId === ($scope.clubeAtual && $scope.clubeAtual.id)) return { elegivel: false, texto: 'Seu jogador: use renovação' };
        if ((jogador.anosContrato || 0) > 1) return { elegivel: false, texto: 'Ainda possui contrato longo' };
        if (jogador.emNegociacao) return { elegivel: false, texto: 'Proposta já enviada' };
        return { elegivel: true, texto: 'Elegível no último ano de contrato' };
    };

    $scope.processarPreContratos = function() {
        var concluidos = [];
        var recusados = [];
        ($scope.propostasPendentes || []).forEach(function(proposta) {
            if (proposta.tipo !== 'pre_contrato' || proposta.status !== 'em_jogador') return;
            var jogador = ($scope.jogadores || []).find(function(item) { return item.id === proposta.jogadorId; });
            if (!jogador || (jogador.anosContrato || 0) > 0) return;
            // O pré-contrato parte do salário atual como piso; a exigência desejada
            // pode ser renegociada na virada, mas nunca aceitamos corte relevante.
            var salarioAtual = parseFloat(jogador.salario) || 10000;
            var salarioMinimo = Math.max(10000, Math.round(salarioAtual * 0.8));
            if ((parseFloat(proposta.salarioOferta) || 0) < salarioMinimo) {
                jogador.emNegociacao = false;
                proposta.status = 'recusada';
                proposta.diasRestantes = 0;
                proposta.motivo = 'Salário abaixo da exigência do jogador.';
                recusados.push({ jogador: jogador, proposta: proposta, salarioMinimo: salarioMinimo });
                return;
            }
            jogador.clubeId = proposta.clubeDestinoId;
            jogador.salario = proposta.salarioOferta;
            jogador.salarioDesejado = Math.max(jogador.salario, salarioMinimo);
            jogador.anosContrato = proposta.anosContrato;
            jogador.emNegociacao = false;
            proposta.status = 'aceita';
            proposta.diasRestantes = 0;
            concluidos.push(proposta);
            if ($scope.clubeAtual && proposta.clubeDestinoId === $scope.clubeAtual.id && !($scope.elencoAtual || []).some(function(item) { return item.id === jogador.id; })) {
                var novoAtleta = angular.copy(jogador);
                novoAtleta.emCampo = false;
                novoAtleta.substituidoNaPartida = false;
                novoAtleta.adaptacaoClube = 55;
                novoAtleta.diasNoClube = 0;
                normalizarJogadorSalvo(novoAtleta);
                $scope.elencoAtual.push(novoAtleta);
            }
        });
        if (concluidos.length) {
            $scope.propostasPendentes = ($scope.propostasPendentes || []).filter(function(item) { return item.status !== 'aceita' || item.tipo !== 'pre_contrato'; });
            concluidos.forEach(function(proposta) {
                $scope.adicionarMensagem('Diretoria', 'Pré-contrato efetivado', proposta.jogadorNome + ' assinou por ' + proposta.anosContrato + ' temporada(s) e se apresentará ao clube no início do novo ano.', false, 'transferencia');
            });
        }
        recusados.forEach(function(item) {
            $scope.adicionarMensagem('Diretoria', 'Pré-contrato recusado', item.jogador.nome + ' recusou a proposta porque o salário oferecido ficou abaixo de ' + $scope.formatarMoeda(item.salarioMinimo) + '.', false, 'transferencia');
        });
        return concluidos;
    };

    // Backup manual da carreira para permitir transporte entre navegadores/dispositivos.
    $scope.exportarSave = function() {
        if (!$scope.clubeAtual) {
            alert('Inicie uma carreira antes de exportar o save.');
            return;
        }
        $scope.salvarJogoSilencioso();
        var saveLocal = window.localStorage.getItem('reiDaPranchetaSave');
        if (!saveLocal) {
            alert('Não foi possível localizar o save atual.');
            return;
        }
        var blob = new Blob([saveLocal], { type: 'application/json;charset=utf-8' });
        var url = window.URL.createObjectURL(blob);
        var link = document.createElement('a');
        var nomeSeguro = String($scope.dados.nomeTreinador || 'treinador')
            .toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
        link.href = url;
        link.download = 'rei-da-prancheta-' + (nomeSeguro || 'treinador') + '.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    $scope.validarSaveImportado = function(saveImportado) {
        if (!saveImportado || typeof saveImportado !== 'object' || Array.isArray(saveImportado)) return false;
        return !!saveImportado.clubeAtualId && Array.isArray(saveImportado.elencoAtual);
    };

    $scope.selecionarArquivoSave = function(input) {
        var arquivo = input && input.files && input.files[0];
        if (!arquivo) return;
        var leitor = new FileReader();
        leitor.onload = function(evento) {
            try {
                var saveImportado = JSON.parse(evento.target.result);
                if (!$scope.validarSaveImportado(saveImportado)) throw new Error('estrutura');
                if (!window.confirm('Importar este save substituirá a carreira atual. Deseja continuar?')) return;
                saveImportado = $scope.migrarSave(saveImportado);
                window.localStorage.setItem('reiDaPranchetaSave', JSON.stringify(saveImportado));
                alert('Save importado com sucesso. O jogo será recarregado.');
                window.location.reload();
            } catch (erro) {
                alert('Arquivo de save inválido ou corrompido.');
            } finally {
                input.value = '';
            }
        };
        leitor.onerror = function() {
            input.value = '';
            alert('Não foi possível ler o arquivo de save.');
        };
        leitor.readAsText(arquivo, 'UTF-8');
    };

    $scope.abrirImportadorSave = function() {
        var input = document.getElementById('arquivo-save-input');
        if (input) input.click();
    };

    // Exportar telemetria da partida atual como CSV para download
    $scope.exportTelemetriaPartida = function() {
        if (!$scope.partidaAoVivo || !$scope.partidaAoVivo.telemetriaShots || $scope.partidaAoVivo.telemetriaShots.length === 0) {
            alert('Nenhuma telemetria disponível nesta partida.');
            return;
        }

        var rows = ['minuto,time,zona,chanceType,xg,finalizacao,finalizacao_base,condicao_atacante,bola_parada,reflexo_oponente,reflexo_base_oponente,condicao_goleiro_oponente,posicionamento_oponente,shooterId,shooterNome,goal'];
        $scope.partidaAoVivo.telemetriaShots.forEach(function(s) {
            rows.push([s.minuto, s.time, s.zona, s.chanceType || 'NORMAL', s.xg, s.finalizacao, s.finalizacao_base || s.finalizacao, s.condicao_atacante || 100, s.bola_parada || 75, s.reflexo_oponente, s.reflexo_base_oponente || s.reflexo_oponente, s.condicao_goleiro_oponente || 100, s.posicionamento_oponente || 75, s.shooterId, '"' + (s.shooterNome || '') + '"', s.result === 'GOL' ? 1 : 0].join(','));
        });

        var csv = rows.join('\n');
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var url = (window.URL || window.webkitURL).createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'telemetria_partida_' + ($scope.partidaAoVivo.mandante ? $scope.partidaAoVivo.mandante.sigla : 'M') + '_vs_' + ($scope.partidaAoVivo.visitante ? $scope.partidaAoVivo.visitante.sigla : 'V') + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        (window.URL || window.webkitURL).revokeObjectURL(url);
    };

    $scope.carregarJogo = function() {
        if (!$scope.saveInfo) return;
        $scope.saveInfo = $scope.migrarSave($scope.saveInfo);
        $scope.dados.nomeTreinador = $scope.saveInfo.nomeTreinador;
        $scope.historicoTreinador = Array.isArray($scope.saveInfo.historicoTreinador) ? $scope.saveInfo.historicoTreinador : [];
        $scope.historicoPartidas = Array.isArray($scope.saveInfo.historicoPartidas) ? $scope.saveInfo.historicoPartidas : [];
        $scope.historicoDecisoesGestao = Array.isArray($scope.saveInfo.historicoDecisoesGestao) ? $scope.saveInfo.historicoDecisoesGestao : [];
        $scope.estadosOperacionaisClubes = $scope.saveInfo.estadosOperacionaisClubes || {};
        $scope.historicoPartidasFiltro = 'TODAS';
        $scope.historicoFinanceiroMensal = $scope.saveInfo.historicoFinanceiroMensal || {};
        $scope.staffClube = normalizarStaff($scope.saveInfo.staffClube);
        $scope.emprestimosAtivos = Array.isArray($scope.saveInfo.emprestimosAtivos) ? $scope.saveInfo.emprestimosAtivos : [];
        $scope.dados.anoAtual = $scope.saveInfo.anoAtual || 2024;
        $scope.caixaEntrada = $scope.saveInfo.caixaEntrada || [];
        $scope.noticiasFeed = $scope.saveInfo.noticiasFeed || [];
        $scope.patrocinioAtual = $scope.saveInfo.patrocinioAtual || null;
        $scope.clubeAtual = $scope.clubes.find(function(c) { return c.id === $scope.saveInfo.clubeAtualId; });
        if (!$scope.patrocinioAtual) $scope.gerarPatrocinadores();
        $scope.elencoAtual = $scope.saveInfo.elencoAtual;
        if ($scope.elencoAtual && $scope.jogadores) {
            $scope.elencoAtual.forEach(function(jogadorElenco) {
                var jogadorBase = $scope.jogadores.find(function(j) { return j.id === jogadorElenco.id; });
                if (jogadorBase) {
                    jogadorBase.clubeId = $scope.clubeAtual.id;
                    jogadorBase.salario = jogadorElenco.salario;
                    jogadorBase.anosContrato = jogadorElenco.anosContrato;
                    jogadorBase.potencial = jogadorElenco.potencial;
                    jogadorBase.xpTemporada = jogadorElenco.xpTemporada;
                    jogadorBase.jogosTemporada = jogadorElenco.jogosTemporada;
                    jogadorBase.minutosTemporada = jogadorElenco.minutosTemporada;
                    jogadorBase.evolucaoTemporada = jogadorElenco.evolucaoTemporada;
                    jogadorBase.historicoEvolucao = angular.copy(jogadorElenco.historicoEvolucao || []);
                    jogadorBase.salarioDesejado = jogadorElenco.salarioDesejado;
                    jogadorBase.statusContrato = jogadorElenco.statusContrato;
                    jogadorBase.satisfacaoContrato = jogadorElenco.satisfacaoContrato;
                    jogadorBase.ultimaRevisaoContratoDia = jogadorElenco.ultimaRevisaoContratoDia;
                    jogadorBase.valorMercadoDinamico = jogadorElenco.valorMercadoDinamico;
                    if (jogadorElenco.atributos) jogadorBase.atributos = angular.copy(jogadorElenco.atributos);
                    normalizarEstadoContratoJogadorInterno(jogadorBase);
                }
            });
        }
        
        // Recupera dados Financeiros
        if ($scope.saveInfo.orcamentoAtual) {
            $scope.clubeAtual.orcamento = $scope.saveInfo.orcamentoAtual;
        }
        $scope.financasHistorico = $scope.saveInfo.financasHistorico || [];

        // Recupera dados do calendário
        $scope.calendario = $scope.saveInfo.calendario || [];
        $scope.rodadaAtual = $scope.saveInfo.rodadaAtual || 0;
        $scope.diaAtual = $scope.saveInfo.diaAtual || 0;
        $scope.filtroCalendario = $scope.saveInfo.filtroCalendario || 'TODOS';
        
        if ($scope.saveInfo.calendarioGeral) {
            $scope.calendarioGeral = $scope.saveInfo.calendarioGeral;
        }
        $scope.normalizarCalendarioGeral();
        $scope.atualizarCalendarioFiltrado();
        if ($scope.saveInfo.copaBrasil) {
            $scope.copaBrasil = $scope.saveInfo.copaBrasil;
        }
        if ($scope.saveInfo.libertadores) {
            $scope.libertadores = $scope.saveInfo.libertadores;
        }
        if ($scope.saveInfo.sulAmericana) {
            $scope.sulAmericana = $scope.saveInfo.sulAmericana;
        }
        if ((!$scope.libertadores || !$scope.sulAmericana) && $scope.calendarioGeral && $scope.calendarioGeral.some(function(d) { return d.tipo === 'CONTINENTAL'; })) {
            var libertadoresExistente = $scope.libertadores;
            var sulAmericanaExistente = $scope.sulAmericana;
            $scope.gerarCompeticoesContinentais();
            if (libertadoresExistente) $scope.libertadores = libertadoresExistente;
            if (sulAmericanaExistente) $scope.sulAmericana = sulAmericanaExistente;
        }
        
        if ($scope.saveInfo.jogosCPU) {
            $scope.jogosCPU = $scope.saveInfo.jogosCPU;
        }

        if ($scope.saveInfo.tabelas) {
            $scope.tabelas = $scope.saveInfo.tabelas;
        }
        
        if ($scope.saveInfo.taticas) {
            $scope.taticas = $scope.saveInfo.taticas;
        }
        if ($scope.saveInfo.configFinanceira) {
            $scope.configFinanceira = $scope.saveInfo.configFinanceira;
        }
        $scope.ultimoResumoPartida = $scope.saveInfo.ultimoResumoPartida || null;
        $scope.transferenciasHistorico = $scope.saveInfo.transferenciasHistorico || [];
        $scope.propostasPendentes = $scope.saveInfo.propostasPendentes || [];
        $scope.relatorioEvolucao = $scope.saveInfo.relatorioEvolucao || [];
        $scope.ultimoDiaEvolucao = $scope.saveInfo.ultimoDiaEvolucao || 0;
        $scope.ambienteElenco = normalizarAmbienteElencoInterno($scope.saveInfo.ambienteElenco || criarAmbienteElencoPadrao());
        $scope.preparacaoTemporada = normalizarPreparacaoTemporada($scope.saveInfo.preparacaoTemporada);
        $scope.diretoriaStatus = normalizarDiretoriaStatusInterno($scope.saveInfo.diretoriaStatus || criarDiretoriaStatusPadrao());
        $scope.contextoExterno = normalizarContextoExternoInterno($scope.saveInfo.contextoExterno || criarContextoExternoPadrao());
        $scope.atualizarAmbienteElencoResumo();
        $scope.atualizarResumoContextoExterno();
        if ($scope.atualizarRelatorioEvolucaoVisivel) $scope.atualizarRelatorioEvolucaoVisivel();
        if ($scope.atualizarPropostasPendentes) $scope.atualizarPropostasPendentes();
        if ($scope.atualizarHistoricoMercadoVisivel) $scope.atualizarHistoricoMercadoVisivel();
        if ($scope.atualizarResumoJanelaMercado) $scope.atualizarResumoJanelaMercado();

        if ($scope.saveInfo.clubeAtualInfo) {
            $scope.clubeAtual.estadio = $scope.saveInfo.clubeAtualInfo.estadio;
            $scope.clubeAtual.orcamento = $scope.saveInfo.clubeAtualInfo.orcamento;
            if ($scope.saveInfo.clubeAtualInfo.scouting) {
                $scope.clubeAtual.scouting = normalizarScoutingClube($scope.saveInfo.clubeAtualInfo).scouting;
            }
            if ($scope.saveInfo.clubeAtualInfo.infraestrutura) {
                $scope.clubeAtual.infraestrutura = normalizarInfraestruturaClubeInterno($scope.saveInfo.clubeAtualInfo).infraestrutura;
                $scope.clubeAtual.nivelMedico = $scope.clubeAtual.infraestrutura.departamentoMedico.nivel;
            }
            if ($scope.saveInfo.clubeAtualInfo.base) {
                $scope.clubeAtual.base = normalizarBaseClubeInterno($scope.saveInfo.clubeAtualInfo).base;
            }
        }
        
        $scope.verificarVariaveisExtras(); 

        $scope.mudarTela('dashboard');
    };

    $scope.apagarSave = function(event) {
        if (event) event.stopPropagation();
        if (confirm("Tem certeza que deseja apagar o seu jogo salvo para sempre?")) {
            window.localStorage.removeItem('reiDaPranchetaSave');
            $scope.checarSaveExistente();
        }
    };

    // FASE 17: FUNÇÕES DA COLETIVA DE IMPRENSA
    $scope.iniciarColetiva = function(partida, modo) {
        $scope.telaAtual = 'coletiva';
        $scope.modoPartidaPendente = modo;
        var adversario = partida.mandante.id === $scope.clubeAtual.id ? partida.visitante.nome : partida.mandante.nome;
        
        var poolColetivas = [
            {
                pergunta: "O jogo de hoje contra o " + adversario + " atrai muitos holofotes. Qual a postura que podemos esperar do seu time?",
                opcoes: [
                    { texto: "Vamos entrar com muita raça e impor nosso jogo.", efeito: 'motivacao', msg: 'O treinador passou confiança e a equipe vai mais motivada para o grande jogo.', impactoTorcida: 3, impactoImprensa: -1, tagNarrativa: 'confianca' },
                    { texto: "O adversário é forte, viemos para jogar por uma bola.", efeito: 'defensivo', msg: 'A torcida e parte da mídia criticaram a postura excessivamente cautelosa nas palavras do treinador.', impactoTorcida: -1, impactoImprensa: 2, tagNarrativa: 'cautela' },
                    { texto: "Somos amplamente favoritos e vamos provar isso em campo.", efeito: 'arrogante', msg: 'Treinador exala confiança e assume todo o favoritismo. Promessa de um time totalmente ofensivo hoje!', impactoTorcida: 1, impactoImprensa: 3, tagNarrativa: 'arrogancia' }
                ]
            },
            {
                pergunta: "Mister, como está a preparação tática para enfrentar o " + adversario + " nesta partida decisiva?",
                opcoes: [
                    { texto: "Nossa estratégia é clara: atacar desde o primeiro minuto.", efeito: 'arrogante', msg: 'Treinador promete um time super agressivo. A torcida adora, mas a defesa pode ficar exposta.', impactoTorcida: 2, impactoImprensa: 2, tagNarrativa: 'agressividade' },
                    { texto: "Fizemos ajustes finos, os jogadores sabem o que fazer.", efeito: 'motivacao', msg: 'Discurso equilibrado e focado. O elenco se sente preparado e blindado contra a pressão.', impactoTorcida: 2, impactoImprensa: -2, tagNarrativa: 'equilibrio' },
                    { texto: "Vamos montar um ferrolho atrás e buscar o contra-ataque.", efeito: 'defensivo', msg: 'A imprensa esportiva detonou o estilo retranqueiro prometido pelo professor.', impactoTorcida: -2, impactoImprensa: 3, tagNarrativa: 'retranca' }
                ]
            },
            {
                pergunta: "A torcida do " + adversario + " está muito confiante. O que você tem a dizer para os seus torcedores?",
                opcoes: [
                    { texto: "Eles têm razão em temer o nosso elenco.", efeito: 'arrogante', msg: 'Resposta polêmica! Treinador incendeia o clima do jogo chamando a responsabilidade.', impactoTorcida: 1, impactoImprensa: 3, tagNarrativa: 'provocacao' },
                    { texto: "Respeitamos o adversário, será um jogo de xadrez.", efeito: 'defensivo', msg: 'Treinador esfria os ânimos com uma declaração conservadora e respeitosa.', impactoTorcida: 0, impactoImprensa: -1, tagNarrativa: 'respeito' },
                    { texto: "Vamos lutar por cada palmo do gramado por nossa torcida!", efeito: 'motivacao', msg: 'As palavras inflamaram a torcida e os jogadores, que prometem deixar sangue em campo!', impactoTorcida: 3, impactoImprensa: -1, tagNarrativa: 'mobilizacao' }
                ]
            }
        ];

        var sorteio = poolColetivas[Math.floor(Math.random() * poolColetivas.length)];
        $scope.perguntaColetiva = sorteio.pergunta;
        $scope.opcoesColetiva = sorteio.opcoes;
    };

    $scope.responderColetiva = function(opcao) {
        if (!$scope.taticas) {
            $scope.taticas = { mentalidade: 'Equilibrado', foco: 'Misto', marcacao: 'Recuada' };
        }
        
        if (opcao.efeito === 'motivacao') {
            $scope.elencoAtual.forEach(function(j) { j.condicaoFisica += 5; if (j.condicaoFisica > 100) j.condicaoFisica = 100; });
        } else if (opcao.efeito === 'defensivo') {
            $scope.taticas.mentalidade = 'Defensivo';
        } else if (opcao.efeito === 'arrogante') {
            $scope.taticas.mentalidade = 'Ofensivo';
        }
        $scope.aplicarContextoExternoColetiva(opcao);
        $scope.atualizarReputacaoNarrativa(opcao.efeito, 'coletiva');
        $scope.adicionarMensagem('Imprensa', 'Repercussão', opcao.msg, false, 'imprensa');
        $scope.coletivaRespondida = true;
        $scope.executarPartidaPreparada($scope.obterMeuJogoHoje(), $scope.modoPartidaPendente);
    };

    // FASE 14: SISTEMA DE OLHEIROS E WONDERKIDS
    $scope.contratarOlheiro = function() {
        normalizarScoutingClube($scope.clubeAtual);
        if (!$scope.clubeAtual.olheiros) $scope.clubeAtual.olheiros = [];
        if ($scope.clubeAtual.orcamento < 50000) {
            alert("Orçamento insuficiente para contratar um olheiro (R$ 50.000).");
            return;
        }
        if ($scope.clubeAtual.olheiros.length >= 3) {
            alert("Você já atingiu o limite de 3 olheiros simultâneos.");
            return;
        }
        $scope.clubeAtual.orcamento -= 50000;
        $scope.clubeAtual.olheiros.push({
            id: 'olheiro_' + Date.now(),
            nome: 'Olheiro ' + ($scope.clubeAtual.olheiros.length + 1),
            emMissao: false,
            tipoMissao: null,
            rodadasRestantes: 0,
            relatorio: [],
            validadeRelatorio: 0
        });
        
        $scope.financasHistorico.unshift({
            tipo: 'despesa',
            descricao: 'Contratação de Olheiro',
            valor: 50000,
            data: new Date().toLocaleDateString('pt-BR')
        });
        $scope.salvarJogoSilencioso();
    };

    $scope.enviarOlheiro = function(olheiro, tipo) {
        normalizarScoutingClube($scope.clubeAtual);
        olheiro.emMissao = true;
        olheiro.tipoMissao = tipo;
        olheiro.rodadasRestantes = 3;
        olheiro.relatorio = [];
        olheiro.validadeRelatorio = 0;
        $scope.salvarJogoSilencioso();
    };

    $scope.gerarRelatorioOlheiro = function(olheiro) {
        var novosJogadores = [];
        var nomesBase = ["João", "Pedro", "Lucas", "Matheus", "Gabriel", "Thiago", "Felipe", "Marcos"];
        var sobrenomesBase = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira"];
        var nomesGringos = ["Juan", "Carlos", "Luis", "Jose", "Diego", "Miguel", "Alejandro", "Javier"];
        var sobrenomesGringos = ["Perez", "Gonzalez", "Rodriguez", "Fernandez", "Lopez", "Martinez", "Gomez", "Diaz"];
        var posicoes = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];

        for (var i = 0; i < 3; i++) {
            var isGringo = olheiro.tipoMissao === 'SUL-AMERICANO';
            var nomeRand = isGringo ? nomesGringos[Math.floor(Math.random() * nomesGringos.length)] : nomesBase[Math.floor(Math.random() * nomesBase.length)];
            var sobrenomeRand = isGringo ? sobrenomesGringos[Math.floor(Math.random() * sobrenomesGringos.length)] : sobrenomesBase[Math.floor(Math.random() * sobrenomesBase.length)];
            
            var posRand = posicoes[Math.floor(Math.random() * posicoes.length)];
            
            var baseAttr = (olheiro.tipoMissao === 'BASE') ? 30 : 45; // Base e Interior tem overall menor (30~50) ou (45~65)
            var idadeRand = (olheiro.tipoMissao === 'BASE') ? (Math.floor(Math.random() * 4) + 16) : (olheiro.tipoMissao === 'INTERIOR' ? (Math.floor(Math.random() * 5) + 22) : (Math.floor(Math.random() * 7) + 18));
            
            var j = {
                id: 'gen_' + Date.now() + '_' + i,
                clubeId: 'mercado', // Fica sem clube fixo do json
                nome: nomeRand + ' ' + sobrenomeRand,
                posicao: posRand,
                idade: idadeRand,
                salario: Math.floor(Math.random() * 20000) + 5000,
                atributos: {
                    finalizacao: baseAttr + Math.floor(Math.random() * 20),
                    passe: baseAttr + Math.floor(Math.random() * 20),
                    marcacao: baseAttr + Math.floor(Math.random() * 20),
                    velocidade: baseAttr + Math.floor(Math.random() * 20),
                    fisico: baseAttr + Math.floor(Math.random() * 20),
                    reflexo: baseAttr + Math.floor(Math.random() * 20),
                    posicionamento: baseAttr + Math.floor(Math.random() * 20),
                    distribuicao: baseAttr + Math.floor(Math.random() * 20),
                    penalti: baseAttr + Math.floor(Math.random() * 20),
                    escanteio: baseAttr + Math.floor(Math.random() * 20),
                    cobrador: baseAttr + Math.floor(Math.random() * 20)
                },
                potencial: 85 + Math.floor(Math.random() * 11) // Potencial entre 85 e 95
            };
            
            // FASE 11 compatibility
            j.condicaoFisica = 100; j.cartoesAmarelos = 0; j.lesionado = false; j.diasLesao = 0; j.suspenso = false; j.emCampo = false;
            
            novosJogadores.push($scope.criarItemRelatorioScouting(j, olheiro.tipoMissao, i));
        }
        olheiro.relatorio = novosJogadores;
        olheiro.emMissao = false;
        $scope.registrarHistoricoRelatorioScouting({
            id: 'scout_report_' + olheiro.id + '_' + ($scope.diaAtual || 0),
            dia: $scope.diaAtual || 0,
            origemMissao: olheiro.tipoMissao,
            olheiroNome: olheiro.nome,
            jogadores: novosJogadores
        });
        atualizarFlagsShortlistRelatorios();
    };

    $scope.comprarJoia = function(olheiro, jogador, index) {
        var valorMulta = $scope.calcularValorPasse(jogador) * 0.8; // Desconto de 20% para a oferta
        if ($scope.clubeAtual.orcamento < valorMulta) {
            alert("Orçamento insuficiente para contratar o jogador.");
            return;
        }
        
        $scope.clubeAtual.orcamento -= valorMulta;
        jogador.clubeId = $scope.clubeAtual.id;
        $scope.elencoAtual.push(jogador);
        $scope.registrarTransferenciaHistorico({
            tipo: 'compra',
            jogadorId: jogador.id,
            jogadorNome: jogador.nome,
            clubeOrigemId: 'mercado',
            clubeOrigemNome: 'Relatorio de olheiro',
            clubeDestinoId: $scope.clubeAtual.id,
            clubeDestinoNome: $scope.clubeAtual.nome,
            valor: valorMulta,
            salario: jogador.salario,
            anosContrato: jogador.anosContrato
        });
        
        $scope.financasHistorico.unshift({
            tipo: 'despesa',
            descricao: 'Contratação Olheiro: ' + jogador.nome,
            valor: valorMulta,
            data: new Date().toLocaleDateString('pt-BR')
        });
        
        olheiro.relatorio.splice(index, 1);
        
        // Se comprou todos os jogadores, o olheiro volta a ficar ocioso
        if (olheiro.relatorio.length === 0) {
            olheiro.emMissao = false;
            olheiro.validadeRelatorio = 0;
        }
        
        $scope.adicionarMensagem('Departamento de Futebol', 'Reforço Confirmado: ' + jogador.nome, 'O jogador ' + jogador.nome + ' assinou contrato conosco e já se apresentou ao elenco!', false, 'transferencia');
        $scope.removerShortlistScouting(jogador.id);
        $scope.salvarJogoSilencioso();
    };

    $scope.mudarTela = function(novaTela) {
        if ($scope.partidaEmAndamento && !$scope.partidaPausada) {
            alert("Aguarde o fim da partida!");
            return;
        }
        $scope.telaAtual = novaTela;
        $scope.menuMobileAberto = false;
        if (novaTela === 'mercado') {
            if (!$scope.mercadoUI || !$scope.mercadoUI.aba) $scope.mercadoUI = { aba: 'busca' };
            $scope.atualizarResumoJanelaMercado();
            $scope.atualizarPropostasPendentes();
            $scope.atualizarHistoricoMercadoVisivel();
            normalizarScoutingClube($scope.clubeAtual);
            atualizarFlagsShortlistRelatorios();
            $scope.atualizarMercado();
        }
        if (novaTela === 'calendario') {
            $scope.atualizarCalendarioFiltrado();
        }
        if (novaTela === 'dashboard') {
            $scope.atualizarDiretoriaStatus();
            $scope.atualizarResumoBase();
        }
        if (novaTela === 'base') {
            $scope.atualizarResumoBase();
        }
        if (novaTela === 'cerimonia' && (!$scope.relatorioFimAno || !$scope.relatorioFimAno.resumoGerencial)) {
            $scope.prepararCerimonia();
        }
    };
    $scope.voltarParaPartidaAoVivo = function() {
        if (!$scope.partidaEmAndamento) return false;
        $scope.telaAtual = 'partida';
        return true;
    };

    $scope.selecionarClube = function(clubeId) {
        $scope.clubeAtual = $scope.clubes.find(function(c) { return c.id === clubeId; });
        $scope.elencoAtual = angular.copy($scope.jogadores.filter(function(j) { return j.clubeId === clubeId; }));
        $scope.elencoAtual.forEach(function(j) {
            j.emCampo = false; j.posX = 0; j.posY = 0;
        });
        $scope.formacaoEscolhida = '4-3-3'; // Default para o seletor
        $scope.verificarVariaveisExtras(); // FASE 13: Garante que o estádio foi inicializado
        normalizarScoutingClube($scope.clubeAtual);
    };

    // FASE 7: FORMAÇÕES AUTOMÁTICAS
    $scope.aplicarFormacao = function(tipo) {
        // Tira todos de campo primeiro
        $scope.elencoAtual.forEach(function(j) { j.emCampo = false; });
        
        var posicoes = [];
        if (tipo === '4-3-3') {
            posicoes = [
                {x: 5, y: 50, pos: 'GOL'}, 
                {x: 25, y: 20, pos: 'LAT'}, 
                {x: 20, y: 40, pos: 'ZAG'}, 
                {x: 20, y: 60, pos: 'ZAG'}, 
                {x: 25, y: 80, pos: 'LAT'}, 
                {x: 45, y: 30, pos: 'VOL'}, 
                {x: 45, y: 70, pos: 'VOL'}, 
                {x: 55, y: 50, pos: 'MEI'}, 
                {x: 75, y: 20, pos: 'ATA'}, 
                {x: 85, y: 50, pos: 'ATA'}, 
                {x: 75, y: 80, pos: 'ATA'}  
            ];
        } else if (tipo === '4-4-2') {
            posicoes = [
                {x: 5, y: 50, pos: 'GOL'},
                {x: 25, y: 20, pos: 'LAT'},
                {x: 20, y: 40, pos: 'ZAG'},
                {x: 20, y: 60, pos: 'ZAG'},
                {x: 25, y: 80, pos: 'LAT'},
                {x: 45, y: 35, pos: 'VOL'},
                {x: 45, y: 65, pos: 'VOL'},
                {x: 60, y: 25, pos: 'MEI'},
                {x: 60, y: 75, pos: 'MEI'},
                {x: 80, y: 40, pos: 'ATA'},
                {x: 80, y: 60, pos: 'ATA'}
            ];
        } else if (tipo === '3-5-2') {
             posicoes = [
                {x: 5, y: 50, pos: 'GOL'},
                {x: 20, y: 30, pos: 'ZAG'},
                {x: 15, y: 50, pos: 'ZAG'},
                {x: 20, y: 70, pos: 'ZAG'},
                {x: 40, y: 15, pos: 'LAT'}, 
                {x: 45, y: 40, pos: 'VOL'},
                {x: 45, y: 60, pos: 'VOL'},
                {x: 40, y: 85, pos: 'LAT'}, 
                {x: 60, y: 50, pos: 'MEI'},
                {x: 80, y: 35, pos: 'ATA'},
                {x: 80, y: 65, pos: 'ATA'}
            ];
        }

        // Conta quantos jogadores foram expulsos nesta partida
        var qtdExpulsos = $scope.elencoAtual.filter(function(j) { return j.expulso; }).length;
        var vagasNoCampo = 11 - qtdExpulsos;

        // Se houver expulsos, removemos posições de atacantes/meias (as últimas do array)
        if (qtdExpulsos > 0) {
            posicoes = posicoes.slice(0, vagasNoCampo);
        }

        // Ordena o banco do melhor pro pior para escalar os melhores
        var banco = $scope.elencoAtual.slice().sort(function(a, b) {
            var auxiliar = ($scope.staffClube || []).find(function(item) { return item.id === 'auxiliar' && item.contratado; });
            var valorA = $scope.calcularOverall(a) + (auxiliar ? (a.moral || 100) * 0.015 : 0);
            var valorB = $scope.calcularOverall(b) + (auxiliar ? (b.moral || 100) * 0.015 : 0);
            return valorB - valorA;
        });
        
        posicoes.forEach(function(slot) {
            // Procura o melhor da posição que não esteja machucado/suspenso e nem expulso
            var jogador = banco.find(function(j) { return !j.emCampo && j.posicao === slot.pos && !$scope.jogadorBloqueadoParaEntrar(j); });
            if (!jogador) {
                // Se não achar, pega o melhor geral disponível (improviso)
                jogador = banco.find(function(j) { return !j.emCampo && !$scope.jogadorBloqueadoParaEntrar(j); });
            }
            if (jogador) {
                jogador.emCampo = true;
                jogador.posX = slot.x;
                jogador.posY = slot.y;
            }
        });
    };

    $scope.jogadorBloqueadoParaEntrar = function(jogador) {
        return !!(jogador && (jogador.expulso || jogador.lesionado || jogador.suspenso || ($scope.partidaEmAndamento && jogador.substituidoNaPartida)));
    };

    // Alternativa ao drag-and-drop para telas sensíveis ao toque.
    $scope.jogadorTaticaSelecionado = null;
    $scope.selecionarJogadorParaTatica = function(jogador) {
        if (!jogador || $scope.jogadorBloqueadoParaEntrar(jogador)) return false;
        $scope.jogadorTaticaSelecionado = jogador;
        return true;
    };
    $scope.colocarJogadorSelecionadoNoCampo = function(evento) {
        var jogador = $scope.jogadorTaticaSelecionado;
        if (!jogador) return false;
        var posX = 50;
        var posY = 50;
        if (evento && evento.currentTarget && evento.clientX !== undefined) {
            var rect = evento.currentTarget.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                posX = Math.max(3, Math.min(97, ((evento.clientX - rect.left) / rect.width) * 100));
                posY = Math.max(5, Math.min(95, ((evento.clientY - rect.top) / rect.height) * 100));
            }
        }
        $scope.moverJogador(jogador.id, 'campo', posX, posY);
        $scope.jogadorTaticaSelecionado = null;
        return true;
    };
    $scope.retirarJogadorSelecionadoDoCampo = function(jogador) {
        if (!jogador) return false;
        $scope.moverJogador(jogador.id, 'banco', 0, 0);
        $scope.jogadorTaticaSelecionado = null;
        return true;
    };

    $scope.marcarSubstituidoNaPartida = function(jogador) {
        if (jogador && $scope.partidaEmAndamento && $scope.partidaPausada && !jogador.expulso && !jogador.lesionado) {
            jogador.substituidoNaPartida = true;
        }
    };

    $scope.moverJogador = function(jogadorId, areaTipo, posX, posY) {
        var jogador = $scope.elencoAtual.find(function(j) { return j.id === jogadorId; });
        if (jogador && !$scope.jogadorBloqueadoParaEntrar(jogador)) {
            if (areaTipo === 'campo') {
                var jogadoresEmCampo = $scope.elencoAtual.filter(function(j) { return j.emCampo; });
                
                // LÓGICA DE SWAP (Substituição Direta)
                var jogadorSobreposto = null;
                jogadoresEmCampo.forEach(function(outroJogador) {
                    if (outroJogador.id !== jogadorId && !outroJogador.expulso) {
                        var distX = Math.abs(outroJogador.posX - posX);
                        var distY = Math.abs(outroJogador.posY - posY);
                        if (distX < 5 && distY < 8) { // Raio de aproximação (5% X, 8% Y)
                            jogadorSobreposto = outroJogador;
                        }
                    }
                });

                if (jogadorSobreposto) {
                    // Substituição! O jogador sobreposto vai pro banco.
                    if (!jogador.emCampo && $scope.partidaEmAndamento && $scope.partidaPausada) {
                        if ($scope.substituicoesFeitas >= 5) {
                            alert("Limite de 5 substituições atingido!");
                            return;
                        }
                        $scope.substituicoesFeitas++;
                        $scope.marcarSubstituidoNaPartida(jogadorSobreposto);
                    }

                    jogadorSobreposto.emCampo = false;
                    
                    jogador.emCampo = true;
                    jogador.posX = jogadorSobreposto.posX;
                    jogador.posY = jogadorSobreposto.posY;

                } else {
                    // Soltou num espaço vazio
                    if (!jogador.emCampo) {
                        if ($scope.partidaEmAndamento && $scope.partidaPausada) {
                            if ($scope.substituicoesFeitas >= 5) {
                                alert("Limite de 5 substituições atingido!");
                                return;
                            }
                            if (jogadoresEmCampo.length >= 11) {
                                alert("Você já tem 11 jogadores em campo! Solte o novo jogador em cima de quem vai sair para substituir diretamente.");
                                return;
                            }
                            $scope.substituicoesFeitas++;
                        } else if (jogadoresEmCampo.length >= 11) {
                            alert("Você já tem 11 jogadores em campo! Solte o novo jogador em cima de quem vai sair para substituir diretamente.");
                            return;
                        }
                    }
                    jogador.emCampo = true; 
                    jogador.posX = posX; 
                    jogador.posY = posY;
                }
            } else {
                $scope.marcarSubstituidoNaPartida(jogador);
                jogador.emCampo = false;
            }
        } else if (jogador && jogador.expulso) {
            alert("Este jogador foi expulso e não pode voltar pro campo!");
        } else if (jogador && jogador.lesionado) {
            alert("Este jogador está lesionado e não pode voltar pro campo!");
        } else if (jogador && jogador.suspenso) {
            alert("Este jogador está suspenso e não pode voltar pro campo!");
        } else if (jogador && jogador.substituidoNaPartida) {
            alert("Este jogador já foi substituído nesta partida e não pode voltar pro campo!");
        }
    };

    $scope.calcularZonaTatica = function(posX, posY) {
        if (posX < 12) return 'GOL';
        if (posX >= 12 && posX <= 45 && (posY < 25 || posY > 75)) return 'LAT';
        if (posX >= 12 && posX <= 35 && posY >= 25 && posY <= 75) return 'ZAG';
        if (posX > 35 && posX <= 55 && posY >= 25 && posY <= 75) return 'VOL';
        if (posX > 55 && posX <= 70) return 'MEI';
        if (posX > 70) return 'ATA';
        return 'INDEFINIDO';
    };

    // Retorna um jogador aleatório do time (prioriza elencoAtual quando for o clube do player)
    $scope.obterLimiteProfundidadePorPosicao = function(posicoes) {
        if (!posicoes || posicoes.length === 0) return 11;
        if (posicoes.length === 1 && posicoes[0] === 'GOL') return 1;
        if (posicoes.indexOf('ATA') !== -1 && posicoes.indexOf('MEI') !== -1) return 7;
        return Math.min(8, Math.max(3, posicoes.length * 2));
    };

    $scope.obterElencoElegivelParaMotor = function(clubeId, posicoes) {
        var elenco = [];
        if ($scope.clubeAtual && clubeId === $scope.clubeAtual.id) {
            elenco = $scope.elencoAtual || [];
            if ($scope.partidaEmAndamento) {
                elenco = elenco.filter(function(j) { return j.emCampo; });
            }
        } else {
            elenco = ($scope.jogadores || []).filter(function(j) { return j.clubeId === clubeId; });
        }

        var candidatos = elenco.filter(function(j) {
            if (!j || !j.atributos) return false;
            if (j.lesionado || j.expulso || j.suspenso) return false;
            if (!posicoes || posicoes.length === 0) return true;
            return posicoes.indexOf(j.posicao) !== -1;
        });

        if ($scope.clubeAtual && clubeId === $scope.clubeAtual.id && $scope.partidaEmAndamento) {
            return candidatos;
        }

        return candidatos.sort(function(a, b) {
            return $scope.calcularOverall(b) - $scope.calcularOverall(a);
        }).slice(0, $scope.obterLimiteProfundidadePorPosicao(posicoes));
    };

    $scope.obterJogadorAleatorio = function(clubeId, posicoes) {
        if (!$scope.jogadores) return null;
        var candidatos = $scope.obterElencoElegivelParaMotor(clubeId, posicoes);
        if (!candidatos || candidatos.length === 0) return null;
        return candidatos[Math.floor(Math.random() * candidatos.length)];
    };

    $scope.estaImprovisado = function(jogador) {
        if (!jogador.emCampo) return false;
        var zona = $scope.calcularZonaTatica(jogador.posX, jogador.posY);
        return jogador.posicao !== zona;
    };

    $scope.calcularOverall = function(jogador) {
        var attr = jogador.atributos;
        var base = 0;
        if (jogador.posicao === 'GOL') {
            var posicionamento = (typeof attr.posicionamento === 'number') ? attr.posicionamento : attr.reflexo;
            var distribuicao = (typeof attr.distribuicao === 'number') ? attr.distribuicao : attr.passe;
            base = (attr.reflexo * 2 + posicionamento + distribuicao + attr.fisico) / 5;
        }
        else base = (attr.finalizacao + attr.passe + attr.marcacao + attr.velocidade + attr.fisico) / 5;
        
        // FASE 12: Penalidade por Improviso
        if ($scope.estaImprovisado(jogador)) {
            base = base * 0.75;
        }
        return Math.round(base);
    };

    $scope.formatarMoeda = function(valor) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
    };

    // FASE 10: MERCADO DA BOLA
    $scope.isJanelaTransferenciaAberta = function() {
        if (!$scope.calendarioGeral || !$scope.calendarioGeral[$scope.diaAtual]) return false;
        return !!$scope.obterJanelaTransferenciaAtual($scope.diaAtual);
    };

    $scope.transferenciasHistorico = $scope.transferenciasHistorico || [];
    $scope.transferenciasHistoricoVisivel = [];
    $scope.propostasPendentes = $scope.propostasPendentes || [];
    $scope.mercadoUI = $scope.mercadoUI || { aba: 'busca' };
    $scope.propostaNegociacaoAtualId = null;
    $scope.resumoJanelaMercado = {
        aberta: false,
        titulo: 'Janela fechada',
        detalhe: 'Calendario ainda nao carregado.',
        diasRestantes: 0,
        proxima: ''
    };

    function criarIdMercado(prefixo) {
        return (prefixo || 'mercado') + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
    }

    function statusPropostaFinal(status) {
        return status === 'aceita' || status === 'recusada' || status === 'expirada';
    }

    function obterDataStrMercado() {
        if ($scope.calendarioGeral && $scope.calendarioGeral[$scope.diaAtual]) {
            return $scope.calendarioGeral[$scope.diaAtual].titulo;
        }
        return new Date().toLocaleDateString('pt-BR');
    }

    function obterNomeClubeMercado(clubeId) {
        if (!clubeId || clubeId === 'mercado') return 'Livre no mercado';
        if ($scope.clubeAtual && clubeId === $scope.clubeAtual.id) return $scope.clubeAtual.nome;
        var clube = ($scope.clubes || []).find(function(c) { return c.id == clubeId; });
        return clube ? clube.nome : 'Desconhecido';
    }

    function obterJogadorPorId(jogadorId) {
        var jogadorElenco = ($scope.elencoAtual || []).find(function(j) { return j.id == jogadorId; });
        if (jogadorElenco) return jogadorElenco;
        return ($scope.jogadores || []).find(function(j) { return j.id == jogadorId; }) || null;
    }

    function desbloquearJogadorNegociacao(jogadorId) {
        var jogadorElenco = ($scope.elencoAtual || []).find(function(j) { return j.id == jogadorId; });
        if (jogadorElenco) jogadorElenco.emNegociacao = false;
        var jogadorBase = ($scope.jogadores || []).find(function(j) { return j.id == jogadorId; });
        if (jogadorBase) jogadorBase.emNegociacao = false;
    }

    function montarChaveTransferencia(item) {
        return [
            item.tipo,
            item.jogadorId,
            item.dia,
            item.clubeOrigemId || '',
            item.clubeDestinoId || '',
            item.valor || 0,
            item.salario || 0,
            item.anosContrato || ''
        ].join('|');
    }

    function obterPropostaAberta(jogadorId, tipo) {
        return ($scope.propostasPendentes || []).find(function(proposta) {
            return proposta.jogadorId == jogadorId && proposta.tipo === tipo && !statusPropostaFinal(proposta.status);
        });
    }

    $scope.atualizarResumoJanelaMercado = function() {
        var diaAtual = (typeof $scope.diaAtual === 'number') ? $scope.diaAtual : 0;
        var janelaAtual = $scope.obterJanelaTransferenciaAtual(diaAtual);
        var janelas = $scope.obterJanelasTransferencia ? $scope.obterJanelasTransferencia() : [];

        if (janelaAtual) {
            var diasRestantes = Math.max(0, janelaAtual.fim - diaAtual + 1);
            $scope.resumoJanelaMercado = {
                aberta: true,
                titulo: 'Janela aberta',
                detalhe: 'Periodo de ' + janelaAtual.nome + ' em andamento.',
                diasRestantes: diasRestantes,
                proxima: diasRestantes === 1 ? 'Fecha ao fim deste dia.' : 'Fecha em ' + diasRestantes + ' dias.'
            };
            return;
        }

        var proximaJanela = null;
        for (var i = 0; i < janelas.length; i++) {
            if (janelas[i].inicio > diaAtual) {
                proximaJanela = janelas[i];
                break;
            }
        }

        $scope.resumoJanelaMercado = {
            aberta: false,
            titulo: 'Janela fechada',
            detalhe: 'Compras e vendas estao bloqueadas fora da janela.',
            diasRestantes: 0,
            proxima: proximaJanela ? 'Proxima janela: ' + proximaJanela.nome + ' em ' + (proximaJanela.inicio - diaAtual) + ' dias.' : 'Nao ha novas janelas nesta temporada.'
        };
    };

    $scope.atualizarHistoricoMercadoVisivel = function() {
        $scope.transferenciasHistorico = Array.isArray($scope.transferenciasHistorico) ? $scope.transferenciasHistorico : [];
        $scope.transferenciasHistoricoVisivel = $scope.transferenciasHistorico.slice(0, 50);
    };

    $scope.registrarTransferenciaHistorico = function(dados) {
        if (!dados || dados.jogadorId === undefined || dados.jogadorId === null) return null;
        $scope.transferenciasHistorico = Array.isArray($scope.transferenciasHistorico) ? $scope.transferenciasHistorico : [];

        var item = {
            id: dados.id || criarIdMercado('transf'),
            dia: (typeof dados.dia === 'number') ? dados.dia : ($scope.diaAtual || 0),
            temporada: dados.temporada || ($scope.dados && $scope.dados.anoAtual) || 2024,
            tipo: dados.tipo || 'compra',
            jogadorId: dados.jogadorId,
            jogadorNome: dados.jogadorNome || 'Jogador',
            clubeOrigemId: dados.clubeOrigemId || null,
            clubeOrigemNome: dados.clubeOrigemNome || obterNomeClubeMercado(dados.clubeOrigemId),
            clubeDestinoId: dados.clubeDestinoId || null,
            clubeDestinoNome: dados.clubeDestinoNome || obterNomeClubeMercado(dados.clubeDestinoId),
            valor: parseFloat(dados.valor) || 0,
            salario: parseFloat(dados.salario) || 0,
            anosContrato: parseInt(dados.anosContrato, 10) || null,
            dataStr: dados.dataStr || obterDataStrMercado()
        };
        item.chave = dados.chave || montarChaveTransferencia(item);

        var existente = $scope.transferenciasHistorico.find(function(transferencia) {
            return transferencia.chave === item.chave;
        });
        if (existente) return existente;

        $scope.transferenciasHistorico.unshift(item);
        $scope.atualizarHistoricoMercadoVisivel();
        if ($scope.aplicarAmbienteTransferencia) $scope.aplicarAmbienteTransferencia(item);
        return item;
    };

    $scope.registrarOuAtualizarProposta = function(dados) {
        if (!dados || dados.jogadorId === undefined || dados.jogadorId === null) return null;
        $scope.propostasPendentes = Array.isArray($scope.propostasPendentes) ? $scope.propostasPendentes : [];

        var proposta = dados.id ? $scope.propostasPendentes.find(function(p) { return p.id === dados.id; }) : obterPropostaAberta(dados.jogadorId, dados.tipo);
        if (!proposta) {
            proposta = {
                id: dados.id || criarIdMercado('prop'),
                diaCriacao: (typeof dados.diaCriacao === 'number') ? dados.diaCriacao : ($scope.diaAtual || 0),
                validadeDias: dados.validadeDias || 3
            };
            $scope.propostasPendentes.unshift(proposta);
        }

        proposta.tipo = dados.tipo || proposta.tipo || 'compra';
        proposta.status = dados.status || proposta.status || 'em_clube';
        proposta.jogadorId = dados.jogadorId;
        proposta.jogadorNome = dados.jogadorNome || proposta.jogadorNome || 'Jogador';
        proposta.clubeOrigemId = dados.clubeOrigemId !== undefined ? dados.clubeOrigemId : proposta.clubeOrigemId;
        proposta.clubeDestinoId = dados.clubeDestinoId !== undefined ? dados.clubeDestinoId : proposta.clubeDestinoId;
        proposta.clubeOrigemNome = dados.clubeOrigemNome || obterNomeClubeMercado(proposta.clubeOrigemId);
        proposta.clubeDestinoNome = dados.clubeDestinoNome || obterNomeClubeMercado(proposta.clubeDestinoId);
        proposta.valorOferta = dados.valorOferta !== undefined ? parseFloat(dados.valorOferta) || 0 : (proposta.valorOferta || 0);
        proposta.salarioOferta = dados.salarioOferta !== undefined ? parseFloat(dados.salarioOferta) || 0 : (proposta.salarioOferta || 0);
        proposta.anosContrato = dados.anosContrato !== undefined ? parseInt(dados.anosContrato, 10) || null : proposta.anosContrato;
        proposta.dataStr = dados.dataStr || proposta.dataStr || obterDataStrMercado();
        proposta.validadeDias = proposta.validadeDias || 3;

        if (statusPropostaFinal(proposta.status) && proposta.diaResposta === undefined) {
            proposta.diaResposta = $scope.diaAtual || 0;
        }

        $scope.atualizarPropostasPendentes();
        return proposta;
    };

    $scope.atualizarPropostasPendentes = function() {
        $scope.propostasPendentes = Array.isArray($scope.propostasPendentes) ? $scope.propostasPendentes : [];
        var diaAtual = (typeof $scope.diaAtual === 'number') ? $scope.diaAtual : 0;

        $scope.propostasPendentes.forEach(function(proposta) {
            if (typeof proposta.diaCriacao !== 'number') proposta.diaCriacao = diaAtual;
            proposta.validadeDias = proposta.validadeDias || 3;

            var idade = diaAtual - proposta.diaCriacao;
            proposta.diasRestantes = Math.max(0, proposta.validadeDias - idade);

            if (!statusPropostaFinal(proposta.status) && idade >= proposta.validadeDias) {
                proposta.status = 'expirada';
                proposta.diasRestantes = 0;
                proposta.diaResposta = diaAtual;
                desbloquearJogadorNegociacao(proposta.jogadorId);
            }
        });
    };

    $scope.definirAbaMercado = function(aba) {
        $scope.mercadoUI = $scope.mercadoUI || {};
        $scope.mercadoUI.aba = aba || 'busca';
        $scope.subTelaMercado = $scope.mercadoUI.aba;
        if ($scope.mercadoUI.aba === 'busca') $scope.atualizarMercado();
        if ($scope.mercadoUI.aba === 'historico') $scope.atualizarHistoricoMercadoVisivel();
    };

    $scope.isAbaMercado = function(aba) {
        return (($scope.mercadoUI && $scope.mercadoUI.aba) || 'busca') === aba;
    };

    $scope.obterStatusPropostaLabel = function(proposta) {
        if (!proposta) return '';
        if (proposta.status === 'em_clube') return proposta.tipo === 'venda' ? 'Aguardando sua resposta' : 'Aguardando clube';
        if (proposta.status === 'clube_aceitou') return 'Clube aceitou';
        if (proposta.status === 'em_jogador') return 'Aguardando jogador';
        if (proposta.status === 'aceita') return 'Aceita';
        if (proposta.status === 'recusada') return 'Recusada';
        if (proposta.status === 'expirada') return 'Expirada';
        return proposta.status;
    };

    $scope.obterClasseStatusProposta = function(proposta) {
        if (!proposta) return 'neutro';
        if (proposta.status === 'aceita') return 'sucesso';
        if (proposta.status === 'recusada' || proposta.status === 'expirada') return 'erro';
        if (proposta.status === 'clube_aceitou') return 'alerta';
        return 'neutro';
    };

    $scope.propostaPermiteContinuar = function(proposta) {
        return !!proposta && proposta.tipo !== 'venda' && !statusPropostaFinal(proposta.status);
    };

    $scope.cancelarPropostaPendente = function(proposta) {
        if (!proposta || statusPropostaFinal(proposta.status)) return;
        proposta.status = 'recusada';
        proposta.diaResposta = $scope.diaAtual || 0;
        proposta.diasRestantes = 0;
        desbloquearJogadorNegociacao(proposta.jogadorId);
        $scope.salvarJogoSilencioso();
    };

    $scope.continuarPropostaPendente = function(proposta) {
        if (!$scope.propostaPermiteContinuar(proposta)) return;
        var jogador = obterJogadorPorId(proposta.jogadorId);
        if (!jogador) {
            alert('Jogador nao encontrado para continuar a negociacao.');
            return;
        }

        $scope.jogadorNegociacao = jogador;
        $scope.tipoNegociacao = proposta.tipo;
        $scope.negociacaoAtiva = true;
        $scope.motivoRejeicao = '';
        $scope.propostaNegociacaoAtualId = proposta.id;
        $scope.ofertaValores = {
            clube: proposta.valorOferta || $scope.calcularValorPasse(jogador),
            salario: proposta.salarioOferta || jogador.salario || 10000,
            anos: String(proposta.anosContrato || jogador.anosContrato || 1),
            clubeAceita: proposta.status === 'clube_aceitou' ? (proposta.valorOferta || 0) : 0
        };
        $scope.estadoNegociacao = proposta.status === 'clube_aceitou' || proposta.status === 'em_jogador' ? 'proposta_jogador' : 'proposta_clube';
    };

    $scope.limparHistoricoTransferencias = function() {
        if (!confirm('Deseja limpar o historico de transferencias?')) return;
        $scope.transferenciasHistorico = [];
        $scope.atualizarHistoricoMercadoVisivel();
        $scope.salvarJogoSilencioso();
    };

    $scope.filtroBusca = {
        nome: '',
        posicao: 'TODOS',
        divisao: 'TODOS',
        contrato: 'TODOS'
    };
    $scope.resultadosBuscaMercado = [];

    $scope.atualizarMercado = function() {
        $scope.atualizarResumoJanelaMercado();
        $scope.atualizarPropostasPendentes();
        if (!$scope.jogadores || !$scope.elencoAtual) return;
        var idsNoElenco = $scope.elencoAtual.map(function(j) { return j.id; });
        
        var livres = $scope.jogadores.filter(function(j) {
            return j.clubeId === 'mercado' && idsNoElenco.indexOf(j.id) === -1;
        });

        livres.sort(function(a, b) { return $scope.calcularOverall(b) - $scope.calcularOverall(a); });
        
        $scope.resultadosBuscaMercado = livres.slice(0, 30); // Top 30 livres como destaques iniciais
    };

    $scope.buscarNoMercado = function() {
        if (!$scope.jogadores || !$scope.elencoAtual) return;
        var idsNoElenco = $scope.elencoAtual.map(function(j) { return j.id; });
        
        var buscaNome = $scope.filtroBusca.nome.toLowerCase();

        var disponiveis = $scope.jogadores.filter(function(j) {
            normalizarEstadoContratoJogadorInterno(j);
            if (idsNoElenco.indexOf(j.id) !== -1) return false;
            
            if (buscaNome && !j.nome.toLowerCase().includes(buscaNome)) return false;
            if ($scope.filtroBusca.posicao !== 'TODOS' && j.posicao !== $scope.filtroBusca.posicao) return false;
            
            if ($scope.filtroBusca.divisao !== 'TODOS') {
                if ($scope.filtroBusca.divisao === 'LIVRE' && j.clubeId !== 'mercado') return false;
                if ($scope.filtroBusca.divisao !== 'LIVRE') {
                    if (j.clubeId === 'mercado') return false;
                    var clubeDoJogador = $scope.clubes.find(function(c) { return c.id == j.clubeId; });
                    if (!clubeDoJogador || clubeDoJogador.divisao !== $scope.filtroBusca.divisao) return false;
                }
            }
            
            if ($scope.filtroBusca.contrato !== 'TODOS') {
                var anos = j.anosContrato || 0;
                if ($scope.filtroBusca.contrato === 'FIM' && anos > 1) return false;
                if ($scope.filtroBusca.contrato === 'LONGO' && anos <= 1) return false;
            }
            
            return true;
        });

        disponiveis.sort(function(a, b) { return $scope.calcularOverall(b) - $scope.calcularOverall(a); });
        $scope.resultadosBuscaMercado = disponiveis.slice(0, 50);
    };

    $scope.calcularValorPasse = function(jogador) {
        normalizarEstadoContratoJogadorInterno(jogador);
        return jogador && jogador.valorMercadoDinamico !== undefined ? jogador.valorMercadoDinamico : ((jogador.salario || 0) * 100);
    };

    $scope.iniciarNegociacao = function(jogador, ehRenovacao) {
        if (!$scope.isJanelaTransferenciaAberta() && !ehRenovacao) {
            alert("A Janela de Transferências está fechada! Só é possível negociar no início ou no meio do ano.");
            return;
        }
        $scope.jogadorNegociacao = jogador;
        $scope.tipoNegociacao = ehRenovacao ? 'renovacao' : 'compra';
        $scope.negociacaoAtiva = true;
        $scope.motivoRejeicao = "";
        var propostaAberta = obterPropostaAberta(jogador.id, $scope.tipoNegociacao);
        $scope.propostaNegociacaoAtualId = propostaAberta ? propostaAberta.id : null;
        
        $scope.ofertaValores = {
            clube: propostaAberta && propostaAberta.valorOferta ? propostaAberta.valorOferta : $scope.calcularValorPasse(jogador),
            salario: propostaAberta && propostaAberta.salarioOferta ? propostaAberta.salarioOferta : jogador.salarioDesejado || jogador.salario || 10000,
            anos: String((propostaAberta && propostaAberta.anosContrato) || 1),
            clubeAceita: propostaAberta && propostaAberta.status === 'clube_aceitou' ? propostaAberta.valorOferta : 0
        };

        if (propostaAberta && propostaAberta.status === 'clube_contraproposta') {
            $scope.estadoNegociacao = 'contraproposta_clube';
            $scope.ofertaValores.clubeContraproposta = propostaAberta.valorContraproposta || propostaAberta.valorOferta;
        } else if (propostaAberta && (propostaAberta.status === 'clube_aceitou' || propostaAberta.status === 'em_jogador')) {
            $scope.estadoNegociacao = 'proposta_jogador';
        } else if ($scope.tipoNegociacao === 'compra' && jogador.clubeId !== 'mercado') {
            $scope.estadoNegociacao = 'proposta_clube';
        } else {
            $scope.estadoNegociacao = 'proposta_jogador';
        }
    };

    $scope.fecharNegociacao = function() {
        $scope.negociacaoAtiva = false;
        $scope.jogadorNegociacao = null;
        $scope.propostaNegociacaoAtualId = null;
    };

    $scope.enviarPropostaClube = function(oferta) {
        var valorPasse = $scope.calcularValorPasse($scope.jogadorNegociacao);
        var margemAceitacao = valorPasse * 0.85;
        var proposta = $scope.registrarOuAtualizarProposta({
            id: $scope.propostaNegociacaoAtualId,
            tipo: 'compra',
            status: 'em_clube',
            jogadorId: $scope.jogadorNegociacao.id,
            jogadorNome: $scope.jogadorNegociacao.nome,
            clubeOrigemId: $scope.jogadorNegociacao.clubeId,
            clubeDestinoId: $scope.clubeAtual.id,
            valorOferta: oferta
        });
        $scope.propostaNegociacaoAtualId = proposta ? proposta.id : null;

        if (oferta >= margemAceitacao) {
            $scope.ofertaValores.clubeAceita = oferta;
            $scope.estadoNegociacao = 'proposta_jogador';
            $scope.jogadorNegociacao.emNegociacao = true;
            var propostaAceitaClube = $scope.registrarOuAtualizarProposta({
                id: $scope.propostaNegociacaoAtualId,
                tipo: 'compra',
                status: 'clube_aceitou',
                jogadorId: $scope.jogadorNegociacao.id,
                jogadorNome: $scope.jogadorNegociacao.nome,
                clubeOrigemId: $scope.jogadorNegociacao.clubeId,
                clubeDestinoId: $scope.clubeAtual.id,
                valorOferta: oferta
            });
            var concorrentes = ($scope.clubes || []).filter(function(clube) {
                return clube.id !== $scope.clubeAtual.id && clube.id !== $scope.jogadorNegociacao.clubeId;
            });
            if (concorrentes.length > 0 && Math.random() < 0.35) {
                var concorrente = concorrentes[Math.floor(Math.random() * concorrentes.length)];
                propostaAceitaClube.concorrencia = {
                    clubeId: concorrente.id,
                    clubeNome: concorrente.nome,
                    salarioOferta: Math.round((parseFloat($scope.jogadorNegociacao.salario || 10000) * (1.05 + Math.random() * 0.2)) / 100) * 100,
                    criadaNoDia: $scope.diaAtual || 0
                };
                $scope.motivoRejeicao = 'Outro clube entrou na disputa: ' + concorrente.nome + '. O jogador vai comparar as propostas.';
            }
        } else if (oferta >= valorPasse * 0.65) {
            var contraproposta = Math.ceil(Math.max(margemAceitacao, valorPasse * 0.95) / 100000) * 100000;
            proposta.status = 'clube_contraproposta';
            proposta.valorContraproposta = contraproposta;
            proposta.valorOferta = oferta;
            $scope.ofertaValores.clubeContraproposta = contraproposta;
            $scope.estadoNegociacao = 'contraproposta_clube';
            $scope.motivoRejeicao = 'O clube considerou sua oferta, mas pediu um ajuste no valor do passe.';
        } else {
            $scope.estadoNegociacao = 'rejeitado';
            $scope.motivoRejeicao = "A diretoria do clube rejeitou sua oferta. Eles não aceitariam menos de " + $scope.formatarMoeda(margemAceitacao) + ".";
            $scope.registrarOuAtualizarProposta({
                id: $scope.propostaNegociacaoAtualId,
                tipo: 'compra',
                status: 'recusada',
                jogadorId: $scope.jogadorNegociacao.id,
                jogadorNome: $scope.jogadorNegociacao.nome,
                clubeOrigemId: $scope.jogadorNegociacao.clubeId,
                clubeDestinoId: $scope.clubeAtual.id,
                valorOferta: oferta
            });
            desbloquearJogadorNegociacao($scope.jogadorNegociacao.id);
        }
    };

    $scope.aceitarContrapropostaClube = function() {
        var proposta = ($scope.propostasPendentes || []).find(function(item) { return item.id === $scope.propostaNegociacaoAtualId; });
        if (!proposta || !proposta.valorContraproposta) return false;
        var valor = proposta.valorContraproposta;
        proposta.status = 'clube_aceitou';
        proposta.valorOferta = valor;
        $scope.ofertaValores.clubeAceita = valor;
        $scope.jogadorNegociacao.emNegociacao = true;
        $scope.estadoNegociacao = 'proposta_jogador';
        return true;
    };

    $scope.recusarContrapropostaClube = function() {
        var proposta = ($scope.propostasPendentes || []).find(function(item) { return item.id === $scope.propostaNegociacaoAtualId; });
        if (proposta) proposta.status = 'recusada';
        if ($scope.jogadorNegociacao) desbloquearJogadorNegociacao($scope.jogadorNegociacao.id);
        $scope.estadoNegociacao = 'rejeitado';
        $scope.motivoRejeicao = 'Você recusou a contraproposta do clube.';
        return true;
    };

    $scope.enviarPropostaJogador = function(salario, anos) {
        normalizarEstadoContratoJogadorInterno($scope.jogadorNegociacao);
        var salarioBase = $scope.jogadorNegociacao.salarioDesejado || $scope.jogadorNegociacao.salario || 10000;
        var reputacaoClube = parseFloat($scope.clubeAtual && $scope.clubeAtual.reputacao) || 70;
        var bonusDivisao = { A: 0.96, B: 1, C: 1.04, D: 1.08 };
        var fatorExigencia = bonusDivisao[$scope.clubeAtual && $scope.clubeAtual.divisao] || 1;
        if (reputacaoClube >= 85) fatorExigencia -= 0.04;
        else if (reputacaoClube < 65) fatorExigencia += 0.04;
        var margemAceitacao = salarioBase * fatorExigencia;
        var origemId = $scope.tipoNegociacao === 'renovacao' ? $scope.clubeAtual.id : $scope.jogadorNegociacao.clubeId;
        var proposta = $scope.registrarOuAtualizarProposta({
            id: $scope.propostaNegociacaoAtualId,
            tipo: $scope.tipoNegociacao,
            status: 'em_jogador',
            jogadorId: $scope.jogadorNegociacao.id,
            jogadorNome: $scope.jogadorNegociacao.nome,
            clubeOrigemId: origemId,
            clubeDestinoId: $scope.clubeAtual.id,
            valorOferta: $scope.ofertaValores.clubeAceita || 0,
            salarioOferta: salario,
            anosContrato: anos,
            exigenciasJogador: {
                salarioMinimo: Math.round(margemAceitacao),
                anosMinimos: 1,
                fatorDivisao: fatorExigencia
            }
        });
        $scope.propostaNegociacaoAtualId = proposta ? proposta.id : null;

        var salarioMinimoComConcorrencia = margemAceitacao;
        var propostaAtual = ($scope.propostasPendentes || []).find(function(item) { return item.id === $scope.propostaNegociacaoAtualId; });
        if (propostaAtual && propostaAtual.concorrencia) {
            salarioMinimoComConcorrencia = Math.max(salarioMinimoComConcorrencia, propostaAtual.concorrencia.salarioOferta);
        }
        var anosOferecidos = parseInt(anos, 10) || 0;
        var contratoAdequado = anosOferecidos >= 1;
        if (salario >= salarioMinimoComConcorrencia && contratoAdequado) {
            $scope.estadoNegociacao = 'sucesso';
            $scope.motivoRejeicao = $scope.tipoNegociacao === 'compra' ? "O jogador aceitou sua oferta de salário e assinou o contrato!" : "Renovação concluída com sucesso!";
            $scope.registrarOuAtualizarProposta({
                id: $scope.propostaNegociacaoAtualId,
                tipo: $scope.tipoNegociacao,
                status: 'aceita',
                jogadorId: $scope.jogadorNegociacao.id,
                jogadorNome: $scope.jogadorNegociacao.nome,
                clubeOrigemId: origemId,
                clubeDestinoId: $scope.clubeAtual.id,
                valorOferta: $scope.ofertaValores.clubeAceita || 0,
                salarioOferta: salario,
                anosContrato: anos
            });
            $scope.concluirTransferencia($scope.jogadorNegociacao, salario, anos, $scope.ofertaValores.clubeAceita);
        } else {
            $scope.estadoNegociacao = 'rejeitado';
            $scope.motivoRejeicao = !contratoAdequado ? "O jogador exige pelo menos 1 ano de contrato." : "O jogador e seu agente recusaram a oferta. Para este clube, eles esperavam algo na casa de " + $scope.formatarMoeda(salarioMinimoComConcorrencia) + ".";
            $scope.registrarOuAtualizarProposta({
                id: $scope.propostaNegociacaoAtualId,
                tipo: $scope.tipoNegociacao,
                status: 'recusada',
                jogadorId: $scope.jogadorNegociacao.id,
                jogadorNome: $scope.jogadorNegociacao.nome,
                clubeOrigemId: origemId,
                clubeDestinoId: $scope.clubeAtual.id,
                valorOferta: $scope.ofertaValores.clubeAceita || 0,
                salarioOferta: salario,
                anosContrato: anos
            });
            desbloquearJogadorNegociacao($scope.jogadorNegociacao.id);
        }
    };

    var resumoExigenciasJogadorCache = { chave: null, valor: null };
    $scope.obterResumoExigenciasJogador = function() {
        var jogador = $scope.jogadorNegociacao;
        if (!jogador) return null;
        var salarioBase = parseFloat(jogador.salarioDesejado || jogador.salario || 10000);
        var reputacaoClube = parseFloat($scope.clubeAtual && $scope.clubeAtual.reputacao) || 70;
        var bonusDivisao = { A: 0.96, B: 1, C: 1.04, D: 1.08 };
        var fator = bonusDivisao[$scope.clubeAtual && $scope.clubeAtual.divisao] || 1;
        if (reputacaoClube >= 85) fator -= 0.04;
        else if (reputacaoClube < 65) fator += 0.04;
        var proposta = ($scope.propostasPendentes || []).find(function(item) { return item.id === $scope.propostaNegociacaoAtualId; });
        var concorrencia = proposta && proposta.concorrencia ? proposta.concorrencia : null;
        var chave = [jogador.id, salarioBase, reputacaoClube, $scope.clubeAtual && $scope.clubeAtual.divisao, $scope.propostaNegociacaoAtualId, concorrencia && concorrencia.clubeNome, concorrencia && concorrencia.salarioOferta, concorrencia && concorrencia.criadaNoDia].join('|');
        if (resumoExigenciasJogadorCache.chave === chave) return resumoExigenciasJogadorCache.valor;
        resumoExigenciasJogadorCache = {
            chave: chave,
            valor: { salarioMinimo: salarioBase * fator, anosMinimos: 1, concorrencia: concorrencia }
        };
        return resumoExigenciasJogadorCache.valor;
    };

    $scope.concluirTransferencia = function(jogador, salario, anos, valorPagoClube) {
        if ($scope.tipoNegociacao === 'compra') {
            var clubeOrigemId = jogador.clubeId;
            var clubeOrigemNome = obterNomeClubeMercado(clubeOrigemId);
            valorPagoClube = parseFloat(valorPagoClube) || 0;
            salario = parseFloat(salario) || jogador.salario || 10000;
            anos = parseInt(anos, 10) || 1;

            if (valorPagoClube > 0 && $scope.clubeAtual.orcamento < valorPagoClube) {
                $scope.estadoNegociacao = 'rejeitado';
                $scope.motivoRejeicao = "Orçamento insuficiente para concluir a contratação.";
                return;
            }

            if (valorPagoClube > 0) {
                $scope.clubeAtual.orcamento -= valorPagoClube;
                $scope.financasHistorico = $scope.financasHistorico || [];
                $scope.financasHistorico.unshift({
                    data: new Date().toLocaleDateString('pt-BR'),
                    tipo: 'despesa',
                    descricao: "Compra do passe: " + jogador.nome,
                    valor: parseFloat(valorPagoClube) || 0
                });
            }
            
            var jogadorBase = ($scope.jogadores || []).find(function(j) { return j.id === jogador.id; });
            if (jogadorBase) {
                jogadorBase.clubeId = $scope.clubeAtual.id;
                jogadorBase.salario = salario;
                jogadorBase.anosContrato = anos;
                jogadorBase.emCampo = false;
                jogadorBase.condicaoFisica = 100;
                jogadorBase.cartoesAmarelos = 0;
                jogadorBase.lesionado = false;
                jogadorBase.diasLesao = 0;
                jogadorBase.suspenso = false;
                jogadorBase.substituidoNaPartida = false;
                jogadorBase.emNegociacao = false;
                $scope.aplicarRenovacaoContratoJogador(jogadorBase, salario, anos);
            }

            var novoJogador = angular.copy(jogadorBase || jogador);
            novoJogador.clubeId = $scope.clubeAtual.id;
            novoJogador.emCampo = false;
            novoJogador.adaptacaoClube = 55;
            novoJogador.diasNoClube = 0;
            novoJogador.condicaoFisica = 100;
            novoJogador.cartoesAmarelos = 0;
            novoJogador.lesionado = false;
            novoJogador.diasLesao = 0;
            novoJogador.suspenso = false;
            novoJogador.substituidoNaPartida = false;
            novoJogador.salario = salario;
            novoJogador.anosContrato = anos;
            novoJogador.emNegociacao = false;
            $scope.aplicarRenovacaoContratoJogador(novoJogador, salario, anos);
            
            var idxElenco = $scope.elencoAtual.findIndex(function(j) { return j.id === novoJogador.id; });
            if (idxElenco >= 0) $scope.elencoAtual[idxElenco] = novoJogador;
            else $scope.elencoAtual.push(novoJogador);

            $scope.registrarTransferenciaHistorico({
                tipo: 'compra',
                jogadorId: novoJogador.id,
                jogadorNome: novoJogador.nome,
                clubeOrigemId: clubeOrigemId,
                clubeOrigemNome: clubeOrigemNome,
                clubeDestinoId: $scope.clubeAtual.id,
                clubeDestinoNome: $scope.clubeAtual.nome,
                valor: valorPagoClube,
                salario: salario,
                anosContrato: anos
            });

            $scope.resultadosBuscaMercado = ($scope.resultadosBuscaMercado || []).filter(function(j) { return j.id !== novoJogador.id; });
            $scope.atualizarMercado();
            $scope.salvarJogoSilencioso();
            $scope.adicionarMensagem('Diretoria', 'Contratação Concluída', jogador.nome + ' foi contratado e assinou por ' + anos + ' temporada(s)!', false, 'transferencia');
        } else {
            jogador.salario = parseFloat(salario) || jogador.salario;
            jogador.anosContrato = parseInt(anos, 10) || jogador.anosContrato || 1;
            jogador.emNegociacao = false;
            $scope.aplicarRenovacaoContratoJogador(jogador, jogador.salario, jogador.anosContrato);
            var jogadorRenovadoBase = ($scope.jogadores || []).find(function(j) { return j.id === jogador.id; });
            if (jogadorRenovadoBase) {
                jogadorRenovadoBase.salario = jogador.salario;
                jogadorRenovadoBase.anosContrato = jogador.anosContrato;
                jogadorRenovadoBase.emNegociacao = false;
                $scope.aplicarRenovacaoContratoJogador(jogadorRenovadoBase, jogador.salario, jogador.anosContrato);
            }
            $scope.registrarTransferenciaHistorico({
                tipo: 'renovacao',
                jogadorId: jogador.id,
                jogadorNome: jogador.nome,
                clubeOrigemId: $scope.clubeAtual.id,
                clubeOrigemNome: $scope.clubeAtual.nome,
                clubeDestinoId: $scope.clubeAtual.id,
                clubeDestinoNome: $scope.clubeAtual.nome,
                valor: 0,
                salario: jogador.salario,
                anosContrato: jogador.anosContrato
            });
            $scope.salvarJogoSilencioso();
            $scope.adicionarMensagem('Diretoria', 'Renovação Concluída', jogador.nome + ' renovou contrato por ' + anos + ' temporada(s)!', false, 'transferencia');
        }
    };

    $scope.venderJogador = function(jogador) {
        if (!$scope.isJanelaTransferenciaAberta()) {
            alert("A Janela de Transferências está fechada! Você não pode vender jogadores agora.");
            return;
        }
        if (jogador.emCampo) {
            alert("Você não pode vender um jogador escalado no time titular. Coloque-o no banco primeiro.");
            return;
        }
        if ($scope.elencoAtual.length <= 11) {
            alert("Seu elenco é muito pequeno para vender jogadores!");
            return;
        }
        
        var valorPasse = $scope.calcularValorPasse(jogador);
        var valorVenda = Math.floor(valorPasse * 0.5); 
        
        if (confirm("Deseja vender " + jogador.nome + " por " + $scope.formatarMoeda(valorVenda) + "?")) {
            $scope.clubeAtual.orcamento += valorVenda;
            $scope.financasHistorico.unshift({
                tipo: 'receita',
                descricao: 'Venda: ' + jogador.nome,
                valor: valorVenda,
                data: new Date().toLocaleDateString('pt-BR')
            });

            $scope.registrarTransferenciaHistorico({
                tipo: 'venda',
                jogadorId: jogador.id,
                jogadorNome: jogador.nome,
                clubeOrigemId: $scope.clubeAtual.id,
                clubeOrigemNome: $scope.clubeAtual.nome,
                clubeDestinoId: 'mercado',
                clubeDestinoNome: 'Livre no mercado',
                valor: valorVenda,
                salario: jogador.salario,
                anosContrato: jogador.anosContrato
            });

            var jogadorBaseVenda = ($scope.jogadores || []).find(function(j) { return j.id === jogador.id; });
            if (jogadorBaseVenda) {
                jogadorBaseVenda.clubeId = 'mercado';
                jogadorBaseVenda.emCampo = false;
                jogadorBaseVenda.emNegociacao = false;
            }
            jogador.clubeId = 'mercado';
            jogador.emNegociacao = false;
            
            $scope.elencoAtual = $scope.elencoAtual.filter(function(j) { return j.id !== jogador.id; });
            $scope.atualizarMercado();
            $scope.salvarJogoSilencioso();
        }
    };

    $scope.simularMercadoCPU = function() {
        if (!$scope.isJanelaTransferenciaAberta()) return;

        // Limite operacional: a CPU precisa liberar excesso antes de continuar comprando.
        ($scope.clubes || []).filter(function(clube) { return clube.id !== $scope.clubeAtual.id; }).forEach(function(clube) {
            var elencoCPU = ($scope.jogadores || []).filter(function(j) { return j.clubeId === clube.id; });
            if (elencoCPU.length > 30) {
                elencoCPU.sort(function(a, b) { return $scope.calcularOverall(a) - $scope.calcularOverall(b); });
                var dispensadoCPU = elencoCPU[0];
                dispensadoCPU.clubeId = 'mercado';
                dispensadoCPU.anosContrato = 0;
                $scope.registrarTransferenciaHistorico({ tipo: 'cpu_liberacao', jogadorId: dispensadoCPU.id, jogadorNome: dispensadoCPU.nome, clubeOrigemId: clube.id, clubeOrigemNome: clube.nome, clubeDestinoId: 'mercado', clubeDestinoNome: 'Mercado Livre', valor: 0, salario: dispensadoCPU.salario, anosContrato: 0 });
            }
            if (elencoCPU.length > 18 && Math.random() < 0.04) {
                var candidatosVendaCPU = elencoCPU.filter(function(jogador) {
                    var repeticaoPosicao = elencoCPU.filter(function(item) { return item.posicao === jogador.posicao; }).length;
                    return repeticaoPosicao > 2 && !jogador.emCampo;
                }).sort(function(a, b) { return (b.salario || 0) - (a.salario || 0); });
                var vendaCPU = candidatosVendaCPU[0];
                if (vendaCPU) {
                    var receitaVendaCPU = Math.floor($scope.calcularValorPasse(vendaCPU) * 0.75);
                    clube.orcamento = (clube.orcamento || 0) + receitaVendaCPU;
                    vendaCPU.clubeId = 'mercado';
                    vendaCPU.anosContrato = 0;
                    $scope.registrarTransferenciaHistorico({ tipo: 'cpu_venda_estrategica', jogadorId: vendaCPU.id, jogadorNome: vendaCPU.nome, clubeOrigemId: clube.id, clubeOrigemNome: clube.nome, clubeDestinoId: 'mercado', clubeDestinoNome: 'Mercado Livre', valor: receitaVendaCPU, salario: vendaCPU.salario, anosContrato: 0 });
                }
            }
        });

        // 1. Propostas pelo seu jogador (Apenas 5% de chance agora por dia de janela)
        if (Math.random() < 0.05 && $scope.elencoAtual.length > 15) { 
            var jAlvo = $scope.elencoAtual[Math.floor(Math.random() * $scope.elencoAtual.length)];
            if (!jAlvo.emNegociacao) {
                var possiveisClubes = $scope.clubes.filter(function(c) { return c.id !== $scope.clubeAtual.id && (c.divisao === 'A' || c.divisao === 'B'); });
                if (possiveisClubes.length > 0) {
                    var clubeComprador = possiveisClubes[Math.floor(Math.random() * possiveisClubes.length)];
                    var valorOferta = Math.floor($scope.calcularValorPasse(jAlvo) * (0.8 + Math.random() * 0.7)); 
                    
                    jAlvo.emNegociacao = true;
                    var propostaRecebida = $scope.registrarOuAtualizarProposta({
                        tipo: 'venda',
                        status: 'em_clube',
                        jogadorId: jAlvo.id,
                        jogadorNome: jAlvo.nome,
                        clubeOrigemId: $scope.clubeAtual.id,
                        clubeDestinoId: clubeComprador.id,
                        clubeDestinoNome: clubeComprador.nome,
                        valorOferta: valorOferta
                    });
                    $scope.caixaEntrada.unshift({
                        id: 'msg_' + Date.now(),
                        remetente: clubeComprador.nome,
                        assunto: 'Proposta de Transferência: ' + jAlvo.nome,
                        mensagem: 'O ' + clubeComprador.nome + ' gostaria de contratar o ' + jAlvo.nome + '. Eles oferecem ' + $scope.formatarMoeda(valorOferta) + ' à vista.',
                        lida: false,
                        tipo: 'oferta_compra',
                        data: new Date().toLocaleDateString('pt-BR'),
                        jogadorOfertaId: jAlvo.id,
                        valorOferta: valorOferta,
                        clubeCompradorId: clubeComprador.id,
                        propostaPendenteId: propostaRecebida ? propostaRecebida.id : null
                    });
                    $scope.mensagensNaoLidas++;
                }
            }
        }

        // 2. Transferências entre a CPU
        if (Math.random() < 0.20 && $scope.jogadores) { // 20% de chance de rolar uma transação da CPU no dia
            var clubesComGrana = $scope.clubes.filter(function(c) { return c.id !== $scope.clubeAtual.id && (c.divisao === 'A' || c.divisao === 'B'); });
            if (clubesComGrana.length === 0) return;
            var cComprador = clubesComGrana[Math.floor(Math.random() * clubesComGrana.length)];

            // Escolher um jogador Livre no Mercado e bom (> 70)
            var livresBons = $scope.jogadores.filter(function(j) {
                if (j.clubeId !== 'mercado' || $scope.calcularOverall(j) <= 70) return false;
                var mediaPosicao = $scope.jogadores.filter(function(item) { return item.clubeId === cComprador.id && item.posicao === j.posicao; }).reduce(function(total, item, _, lista) { return total + ($scope.calcularOverall(item) / lista.length); }, 0);
                return $scope.calcularOverall(j) >= Math.max(70, mediaPosicao + 1);
            });
            if (livresBons.length > 0) {
                var contratacao = livresBons[Math.floor(Math.random() * livresBons.length)];
                var tamanhoElencoComprador = $scope.jogadores.filter(function(j) { return j.clubeId === cComprador.id; }).length;
                if (tamanhoElencoComprador >= 30) return;
                var clubeOrigemCPU = contratacao.clubeId;
                contratacao.clubeId = cComprador.id;
                contratacao.anosContrato = 2;
                $scope.registrarTransferenciaHistorico({
                    tipo: 'cpu',
                    jogadorId: contratacao.id,
                    jogadorNome: contratacao.nome,
                    clubeOrigemId: clubeOrigemCPU,
                    clubeOrigemNome: obterNomeClubeMercado(clubeOrigemCPU),
                    clubeDestinoId: cComprador.id,
                    clubeDestinoNome: cComprador.nome,
                    valor: 0,
                    salario: contratacao.salario,
                    anosContrato: contratacao.anosContrato
                });

                $scope.caixaEntrada.unshift({
                    id: 'msg_m_' + Date.now(),
                    remetente: 'Mercado News',
                    assunto: 'Movimentação no Mercado!',
                    mensagem: 'BOMBA: O ' + cComprador.nome + ' acaba de anunciar a contratação do jogador livre ' + contratacao.nome + '!',
                    lida: false,
                    tipo: 'info',
                    data: new Date().toLocaleDateString('pt-BR')
                });
                $scope.mensagensNaoLidas++;
            }
        }

        // 3. Disputa entre clubes da CPU por jogadores de elenco.
        if (Math.random() < 0.08 && $scope.jogadores) {
            var clubesAtivos = $scope.clubes.filter(function(c) { return c.id !== $scope.clubeAtual.id && c.orcamento > 0; });
            if (clubesAtivos.length > 0) {
                var compradorCPU = clubesAtivos[Math.floor(Math.random() * clubesAtivos.length)];
                var necessidadesCPU = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'].map(function(posicao) {
                    var quantidade = $scope.jogadores.filter(function(j) { return j.clubeId === compradorCPU.id && j.posicao === posicao; }).length;
                    return { posicao: posicao, necessidade: Math.max(0, 2 - quantidade) };
                });
                var maiorNecessidade = Math.max.apply(null, necessidadesCPU.map(function(item) { return item.necessidade; }));
                var posicoesPrioritarias = necessidadesCPU.filter(function(item) { return item.necessidade === maiorNecessidade; }).map(function(item) { return item.posicao; });
                var mediaPorPosicaoCPU = {};
                posicoesPrioritarias.forEach(function(posicao) {
                    var jogadoresPosicao = $scope.jogadores.filter(function(j) { return j.clubeId === compradorCPU.id && j.posicao === posicao; });
                    mediaPorPosicaoCPU[posicao] = jogadoresPosicao.length > 0 ? jogadoresPosicao.reduce(function(total, item) { return total + $scope.calcularOverall(item); }, 0) / jogadoresPosicao.length : 70;
                });
                var alvosCPU = $scope.jogadores.filter(function(j) {
                    return j.clubeId !== 'mercado' && j.clubeId !== $scope.clubeAtual.id && j.clubeId !== compradorCPU.id && $scope.calcularOverall(j) >= Math.max(72, (mediaPorPosicaoCPU[j.posicao] || 70) + 1) && !j.lesionado && !j.emNegociacao && posicoesPrioritarias.indexOf(j.posicao) >= 0;
                });
                if (alvosCPU.length === 0) alvosCPU = $scope.jogadores.filter(function(j) { return j.clubeId !== 'mercado' && j.clubeId !== $scope.clubeAtual.id && j.clubeId !== compradorCPU.id && $scope.calcularOverall(j) >= 72 && !j.lesionado && !j.emNegociacao; });
                if (alvosCPU.length > 0) {
                    var atletaCPU = alvosCPU[Math.floor(Math.random() * alvosCPU.length)];
                    var vendedorCPU = $scope.clubes.find(function(c) { return c.id === atletaCPU.clubeId; });
                }
                if (vendedorCPU && compradorCPU) {
                    if ($scope.jogadores.filter(function(j) { return j.clubeId === compradorCPU.id; }).length >= 30) return;
                    var valorCPU = Math.floor($scope.calcularValorPasse(atletaCPU) * (0.9 + Math.random() * 0.35));
                    if ((compradorCPU.orcamento || 0) >= valorCPU) {
                        compradorCPU.orcamento -= valorCPU;
                        vendedorCPU.orcamento = (vendedorCPU.orcamento || 0) + valorCPU;
                        atletaCPU.clubeId = compradorCPU.id;
                        atletaCPU.anosContrato = 2;
                        $scope.registrarTransferenciaHistorico({ tipo: 'cpu', jogadorId: atletaCPU.id, jogadorNome: atletaCPU.nome, clubeOrigemId: vendedorCPU.id, clubeOrigemNome: vendedorCPU.nome, clubeDestinoId: compradorCPU.id, clubeDestinoNome: compradorCPU.nome, valor: valorCPU, salario: atletaCPU.salario, anosContrato: 2 });
                    }
                }
            }
        }
    };

    $scope.melhorarDM = function(nivel, custo) {
        if ($scope.clubeAtual.orcamento >= custo) {
            if (confirm("Deseja gastar " + $scope.formatarMoeda(custo) + " para melhorar o Departamento Médico para o Nível " + nivel + "?")) {
                $scope.clubeAtual.orcamento -= custo;
                normalizarInfraestruturaClubeInterno($scope.clubeAtual);
                $scope.clubeAtual.nivelMedico = nivel;
                $scope.clubeAtual.infraestrutura.departamentoMedico.nivel = nivel;
                $scope.clubeAtual.infraestrutura.departamentoMedico.obraEmAndamento = false;
                $scope.clubeAtual.infraestrutura.departamentoMedico.diasRestantes = 0;
                $scope.atualizarResumoInfraestrutura();
                $scope.financasHistorico.unshift({
                    tipo: 'despesa',
                    descricao: 'Melhoria: DM Nível ' + nivel,
                    valor: custo,
                    data: new Date().toLocaleDateString('pt-BR')
                });
                $scope.salvarJogoSilencioso();
                alert("Parabéns! Seu Departamento Médico foi atualizado com sucesso.");
            }
        } else {
            alert("Orçamento insuficiente! Você precisa de " + $scope.formatarMoeda(custo) + ".");
        }
    };

    var logosClubes = {
        'Atlético-MG': ['Serie A', 'atletico_mg.png'], 'Athletico-PR': ['Serie A', 'atletico_pr.png'],
        'Bahia': ['Serie A', 'bahia.png'], 'Botafogo': ['Serie A', 'botafogo.png'], 'Chapecoense': ['Serie A', 'chapecoense.png'],
        'Corinthians': ['Serie A', 'corinthians.png'], 'Coritiba': ['Serie A', 'coritiba.png'], 'Cruzeiro': ['Serie A', 'cruzeiro.png'],
        'Flamengo': ['Serie A', 'flamengo.png'], 'Fluminense': ['Serie A', 'fluminense.png'], 'Grêmio': ['Serie A', 'gremio.png'],
        'Internacional': ['Serie A', 'internacional.png'], 'Mirassol': ['Serie A', 'mirassol.png'], 'Palmeiras': ['Serie A', 'palmeiras.png'],
        'Red Bull Bragantino': ['Serie A', 'redbull_bragantino.png'], 'Remo': ['Serie A', 'remo.png'], 'Santos': ['Serie A', 'santos.png'],
        'São Paulo': ['Serie A', 'são_paulo.png'], 'Vasco': ['Serie A', 'vasco.png'], 'Vitória': ['Serie A', 'vitoria.png'],
        'América-MG': ['Serie B', 'america_mg.png'], 'Atlético-GO': ['Serie B', 'atletico_go.png'], 'Athletic Club': ['Serie B', 'atlhetic.png'],
        'Avaí': ['Serie B', 'avai.png'], 'Botafogo-SP': ['Serie B', 'botafogo_sp.png'], 'Ceará': ['Serie B', 'ceara.png'], 'CRB': ['Serie B', 'crb.png'],
        'Criciúma': ['Serie B', 'criciuma.png'], 'Cuiabá': ['Serie B', 'cuiaba.png'], 'Fortaleza': ['Serie B', 'fortaleza.png'], 'Goiás': ['Serie B', 'goias.png'],
        'Juventude': ['Serie B', 'juventude.png'], 'Londrina': ['Serie B', 'londrina.png'], 'Náutico': ['Serie B', 'nautico.png'],
        'Novorizontino': ['Serie B', 'novorizontino.png'], 'Operário-PR': ['Serie B', 'operario.png'], 'Ponte Preta': ['Serie B', 'ponte_preta.png'],
        'São Bernardo': ['Serie B', 'sao_bernardo.png'], 'Sport': ['Serie B', 'sport.png'], 'Vila Nova': ['Serie B', 'vila_nova.png'],
        'Amazonas': ['Serie C', 'amazonas.png'], 'Anápolis': ['Serie C', 'anapolis.png'], 'Barra-SC': ['Serie C', 'barra.png'],
        'Botafogo-PB': ['Serie C', 'botafogo_pb.png'], 'Brusque': ['Serie C', 'brusque.png'], 'Caxias': ['Serie C', 'caxias.png'],
        'Confiança': ['Serie C', 'confianca.png'], 'Ferroviária': ['Serie C', 'ferroviaria.png'], 'Figueirense': ['Serie C', 'figueirense.png'],
        'Floresta': ['Serie C', 'floresta.png'], 'Guarani': ['Serie C', 'guarani.png'], 'Inter de Limeira': ['Serie C', 'inter_limeira.png'],
        'Itabaiana': ['Serie C', 'itabaiana.png'], 'Ituano': ['Serie C', 'itauano.png'], 'Maranhão': ['Serie C', 'maranhao.png'],
        'Maringá': ['Serie C', 'maringa.png'], 'Paysandu': ['Serie C', 'paysandu.png'], 'Santa Cruz': ['Serie C', 'santa_cruz.png'],
        'Volta Redonda': ['Serie C', 'volta_redonda.png'], 'Ypiranga-RS': ['Serie C', 'ypiranga.png'],
        'ASA': ['Serie D', 'asa.webp'], 'Atlético-AC': ['Serie D', 'atletico_ac.png'], 'Bangu': ['Serie D', 'bangu.png'],
        'Brasil de Pelotas': ['Serie D', 'brasil_pelotas.png'], 'Caldense': ['Serie D', 'caldense.png'], 'Campinense': ['Serie D', 'campinense.png'],
        'Cianorte': ['Serie D', 'cia_norte.png'], 'Joinville': ['Serie D', 'joinville.png'], 'Moto Club': ['Serie D', 'moto_club.png'],
        'Nacional-AM': ['Serie D', 'nacional_am.png'], 'Portuguesa-RJ': ['Serie D', 'portuguesa_rj.png'], 'Retrô': ['Serie D', 'retro.png'],
        'Rio Branco-AC': ['Serie D', 'rio_branco_ac.png'], 'Santo André': ['Serie D', 'santo_andre.png'], 'São José-RS': ['Serie D', 'sao_jose_rs.png'],
        'Sergipe': ['Serie D', 'sergipe.png'], 'Sousa': ['Serie D', 'sousa.png'], 'Treze': ['Serie D', 'treze.png'], 'Tuna Luso': ['Serie D', 'tuna_luso.png'],
        'XV de Piracicaba': ['Serie D', 'xv_piracicaba.png']
    };

    $scope.obterLogoClube = function(clubeOuId) {
        var clube = typeof clubeOuId === 'object' ? clubeOuId : ($scope.clubes || []).find(function(item) { return String(item.id) === String(clubeOuId); });
        if (!clube || !logosClubes[clube.nome]) return null;
        return encodeURI('assets/clubes/' + logosClubes[clube.nome][0] + '/' + logosClubes[clube.nome][1]);
    };

    $scope.obterNomeClube = function(clubeId) {
        if (!clubeId || clubeId === 'mercado') return 'LIVRE NO MERCADO';
        if (!$scope.clubes) return 'Desconhecido';
        var c = $scope.clubes.find(function(cl) { return cl.id == clubeId; });
        return c ? c.nome : 'Desconhecido';
    };

    $scope.carregarDados();
});
