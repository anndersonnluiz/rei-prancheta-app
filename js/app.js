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
    $scope.telaAtual = 'loading'; 
    $scope.dados = { nomeTreinador: '', anoAtual: 2024 };

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
    
    // Variáveis da Partida Ao Vivo
    $scope.partidaAoVivo = null;
    $scope.minutoAtual = 0;
    $scope.narracao = [];
    $scope.partidaEmAndamento = false;

    // FASE 12: ESTILO DE JOGO
    $scope.taticas = {
        mentalidade: 'Equilibrado',
        foco: 'Misto',
        marcacao: 'Recuada'
    };

    // FASE 11 / 13: INICIALIZAR VARIÁVEIS EXTRAS (Retrocompatibilidade)
    $scope.verificarVariaveisExtras = function() {
        if ($scope.elencoAtual) {
            $scope.elencoAtual.forEach(function(jogador) {
                if (jogador.condicaoFisica === undefined) jogador.condicaoFisica = 100;
                if (jogador.cartoesAmarelos === undefined) jogador.cartoesAmarelos = 0;
                if (jogador.lesionado === undefined) jogador.lesionado = false;
                if (jogador.diasLesao === undefined) jogador.diasLesao = 0;
                if (jogador.suspenso === undefined) jogador.suspenso = false;
            });
        }
        if ($scope.clubeAtual && $scope.clubeAtual.estadio) {
            if ($scope.clubeAtual.estadio.obraEmAndamento === undefined) {
                $scope.clubeAtual.estadio.obraEmAndamento = false;
                $scope.clubeAtual.estadio.rodadasRestantesObra = 0;
                $scope.clubeAtual.estadio.capacidadeOriginal = $scope.clubeAtual.estadio.capacidade;
            }
            if ($scope.clubeAtual.olheiros === undefined) {
                $scope.clubeAtual.olheiros = []; // FASE 14
            }
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
        
        if (tipo === 'imprensa' || tipo === 'transferencia' || tipo === 'trofeu') {
            msgObj.lida = true; // Notícias não apitam notificação
            $scope.noticiasFeed.unshift(msgObj);
        } else {
            $scope.caixaEntrada.unshift(msgObj);
        }
    };

    $scope.marcarMensagemLida = function(msg) {
        msg.lida = true;
    };

    $scope.abrirMensagem = function(msg) {
        $scope.mensagemAberta = msg;
        $scope.marcarMensagemLida(msg);
    };

    // FASE 20: Responder Propostas da IA
    $scope.responderProposta = function(msg, aceitar) {
        var jogadorAlvo = $scope.elencoAtual.find(function(j) { return j.id === msg.jogadorOfertaId; });
        if (!jogadorAlvo) return; // Jogador já não existe mais no elenco (vendido?)

        if (aceitar) {
            $scope.clubeAtual.orcamento += msg.valorOferta;
            $scope.financasHistorico.unshift({
                tipo: 'receita',
                descricao: 'Venda de Jogador: ' + jogadorAlvo.nome,
                valor: msg.valorOferta,
                data: new Date().toLocaleDateString('pt-BR')
            });
            
            // Remover do elencoAtual e colocar na IA
            jogadorAlvo.clubeId = "vendido_ia"; // Fictício
            jogadorAlvo.emCampo = false;
            var idx = $scope.elencoAtual.findIndex(function(j) { return j.id === jogadorAlvo.id; });
            if (idx > -1) $scope.elencoAtual.splice(idx, 1);
            
            msg.conteudo += '\n\n✅ VOCÊ ACEITOU A PROPOSTA. Jogador foi vendido.';
        } else {
            jogadorAlvo.emNegociacao = false;
            msg.conteudo += '\n\n❌ VOCÊ RECUSOU A PROPOSTA. Jogador fica no elenco.';
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
        $scope.selecionarClube(clube.id);
        $scope.financasHistorico = []; // FASE 9: Inicializa o histórico zerado
        
        if ($scope.jogadores) {
            $scope.jogadores.forEach(function(j) { 
                j.golsTemporada = 0; 
                if (!j.anosContrato) j.anosContrato = Math.floor(Math.random() * 3) + 1;
            });
        }

        $scope.patrocinioAtual = null;
        $scope.gerarPatrocinadores(); // Gera as opções de patrocínio inicial

        $scope.gerarMetaDiretoria();

        $scope.caixaEntrada.unshift({
            id: 'msg_janela_inicio',
            remetente: 'Federação',
            assunto: 'Janela de Transferências ABERTA!',
            mensagem: 'O período de transferências acaba de começar! Os clubes estão livres para comprar e vender atletas. A janela fechará na rodada 15 do calendário.',
            lida: false,
            tipo: 'info',
            data: new Date().toLocaleDateString('pt-BR')
        });
        $scope.mensagensNaoLidas++;

        $scope.gerarCalendario(); // Gera o calendário do zero
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
        var ligIdx = 0;
        var copaFase = 0;
        var libSulaFase = 0;
        
        // Novo Layout: 38 Ligas, 12 Copas do Brasil, 14 Continentais
        var masterLayout = [
            'L', 'C_ida', 'L', 'LibSul_G', 'C_volta', 'L', 'L', 'C_ida', 'L', 'LibSul_G', 'C_volta', 'L', 
            'L', 'C_ida', 'L', 'LibSul_G', 'C_volta', 'L', 'L', 'C_ida', 'L', 'LibSul_G', 'C_volta', 'L', 
            'L', 'LibSul_G', 'L', 'LibSul_G', 'L', 'C_ida', 'L', 'LibSul_ida', 'C_volta', 'L', 'LibSul_volta', 'L', 
            'L', 'LibSul_ida', 'L', 'LibSul_volta', 'L', 'LibSul_ida', 'L', 'LibSul_volta', 'L', 'LibSul_ida', 'L', 'LibSul_volta', 
            'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'
        ];
        
        for(var i=0; i<masterLayout.length; i++) {
            var tipo = masterLayout[i];
            if (tipo === 'L') {
                if (ligIdx < 38) {
                    $scope.calendarioGeral.push({ dia: i, tipo: 'LIGA', titulo: 'Brasileirão - Rodada ' + (ligIdx + 1), rodadaLiga: ligIdx });
                    ligIdx++;
                } else {
                    $scope.calendarioGeral.push({ dia: i, tipo: 'TREINO', titulo: 'Treino Livre', rodadaLiga: null });
                }
            } else if (tipo === 'C_ida') {
                var nomeFase = ["1ª Fase", "Dezesseis-avos", "Oitavas", "Quartas", "Semifinal", "Final"][copaFase];
                if (nomeFase) $scope.calendarioGeral.push({ dia: i, tipo: 'COPA', titulo: 'Copa do Brasil - ' + nomeFase + ' (Ida)', fase: copaFase, perna: 'ida' });
            } else if (tipo === 'C_volta') {
                var nomeFase = ["1ª Fase", "Dezesseis-avos", "Oitavas", "Quartas", "Semifinal", "Final"][copaFase];
                if (nomeFase) {
                    $scope.calendarioGeral.push({ dia: i, tipo: 'COPA', titulo: 'Copa do Brasil - ' + nomeFase + ' (Volta)', fase: copaFase, perna: 'volta' });
                    copaFase++;
                }
            } else if (tipo === 'LibSul_G') {
                $scope.calendarioGeral.push({ dia: i, tipo: 'CONTINENTAL', titulo: 'Competições Continentais - Fase de Grupos (' + (libSulaFase + 1) + 'ª Rodada)', fase: libSulaFase, perna: 'ida' });
                libSulaFase++;
            } else if (tipo === 'LibSul_ida') {
                var nomeFase = ["Oitavas", "Quartas", "Semifinal", "Final"][libSulaFase - 6];
                if (nomeFase) $scope.calendarioGeral.push({ dia: i, tipo: 'CONTINENTAL', titulo: 'Competições Continentais - ' + nomeFase + ' (Ida)', fase: libSulaFase, perna: 'ida' });
            } else if (tipo === 'LibSul_volta') {
                var nomeFase = ["Oitavas", "Quartas", "Semifinal", "Final"][libSulaFase - 6];
                if (nomeFase) {
                    $scope.calendarioGeral.push({ dia: i, tipo: 'CONTINENTAL', titulo: 'Competições Continentais - ' + nomeFase + ' (Volta)', fase: libSulaFase, perna: 'volta' });
                    libSulaFase++;
                }
            }
        }
        
        $scope.diaAtual = 0;
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
                var golsM = diaObj.perna === 'ida' ? ch.golsIdaTime1 : ch.golsVoltaTime2;
                var golsV = diaObj.perna === 'ida' ? ch.golsIdaTime2 : ch.golsVoltaTime1;
                
                if (!diaObj._meuJogoProxy) diaObj._meuJogoProxy = { éCopa: true, isGrupo: false };
                diaObj._meuJogoProxy.chaveCopa = ch;
                diaObj._meuJogoProxy.perna = diaObj.perna;
                diaObj._meuJogoProxy.mandante = mandante;
                diaObj._meuJogoProxy.visitante = visitante;
                diaObj._meuJogoProxy.golsMandante = golsM !== undefined ? golsM : 0;
                diaObj._meuJogoProxy.golsVisitante = golsV !== undefined ? golsV : 0;
                diaObj._meuJogoProxy.jogado = (golsM !== undefined);
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
                    var golsM = diaObj.perna === 'ida' ? ch.golsIdaTime1 : ch.golsVoltaTime2;
                    var golsV = diaObj.perna === 'ida' ? ch.golsIdaTime2 : ch.golsVoltaTime1;
                    
                    if (!diaObj._meuJogoProxy) diaObj._meuJogoProxy = { éCopa: true, isGrupo: false };
                    diaObj._meuJogoProxy.chaveCopa = ch;
                    diaObj._meuJogoProxy.perna = diaObj.perna;
                    diaObj._meuJogoProxy.mandante = mandante;
                    diaObj._meuJogoProxy.visitante = visitante;
                    diaObj._meuJogoProxy.golsMandante = golsM !== undefined ? golsM : 0;
                    diaObj._meuJogoProxy.golsVisitante = golsV !== undefined ? golsV : 0;
                    diaObj._meuJogoProxy.jogado = (golsM !== undefined && golsM !== null && ch.jogadoIda !== undefined && ch.jogadoVolta !== undefined && (diaObj.perna === 'ida' ? ch.jogadoIda : ch.jogadoVolta));
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

        // Descanso do elenco
        if ($scope.elencoAtual) {
            $scope.elencoAtual.forEach(function(j) {
                if (j.condicaoFisica < 100 && !j.lesionado) {
                    j.condicaoFisica += 15;
                    if (j.condicaoFisica > 100) j.condicaoFisica = 100;
                }
            });
        }
        
        $scope.concluirPartida(null);
    };

    // FASE 6: MOTOR DE JOGO
    $scope.prepararPartida = function(modo) {
        var emCampo = $scope.elencoAtual.filter(function(j) { return j.emCampo; });
        if (emCampo.length !== 11) {
            alert("⚠️ Escalação Incompleta! Você precisa de exatos 11 jogadores escalados na Prancheta Tática para jogar.");
            return;
        }
        
        var partida = $scope.obterMeuJogoHoje();
        if (!partida) {
            alert("Você não tem jogo hoje!");
            return;
        }

        // FASE 17: COLETIVA DE IMPRENSA ANTES DE JOGOS IMPORTANTES
        if (!$scope.coletivaRespondida) {
            var eClassicoOuDecisivo = ($scope.calendarioGeral[$scope.diaAtual].tipo === 'COPA') || (partida.mandante.reputacao >= 80 && partida.visitante.reputacao >= 80);
            if (eClassicoOuDecisivo) {
                $scope.iniciarColetiva(partida, modo);
                return;
            }
        }
        $scope.coletivaRespondida = false; // Reset para a próxima rodada

        if (modo === 'rapido') {
            $scope.calcularResultadoRapido(partida);
            $scope.concluirPartida(partida);
            $scope.mudarTela('dashboard');
            
            $timeout(function() {
                alert("Fim de Jogo! \n\n" + partida.mandante.nome + " " + partida.golsMandante + " x " + partida.golsVisitante + " " + partida.visitante.nome);
            }, 100);
        } else {
            $scope.iniciarPartidaCompleta(partida);
        }
    };

    $scope.calcularForcaTime = function() {
        var forcaTime = 0;
        var emCampo = $scope.elencoAtual.filter(function(j) { return j.emCampo; });
        emCampo.forEach(function(j) { 
            var penalty = 1;
            if (j.moral !== undefined && j.moral < 50) {
                penalty = 0.8 + ((j.moral / 50) * 0.2); // Moral 0 = 80% do overall. Moral 50 = 100%.
            }
            forcaTime += ($scope.calcularOverall(j) * penalty); 
        });
        return forcaTime / 11;
    };

    $scope.gerarGols = function(forcaBase) {
        var chanceBase = forcaBase / 100; // ex: 75 de overall = 0.75
        var gols = 0;
        for(var i=0; i<6; i++) {
            if (Math.random() < (chanceBase * 0.35)) gols++;
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
        var forcaAdv = adversario.reputacao - 10;

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

        $scope.estatisticas = {
            posseMandante: 50,
            posseVisitante: 50,
            chutesMandante: 0,
            chutesVisitante: 0,
            publico: Math.floor(partida.mandante.estadio.capacidade * ocupacao)
        };
        $scope.estatisticas.renda = $scope.estatisticas.publico * preco;

        $scope.substituicoesFeitas = 0;
        $scope.partidaPausada = false;
        $scope.intervaloJaAconteceu = false;
        $scope.forcaMandanteAoVivo = $scope.calcularForcaTime();
        $scope.forcaVisitanteAoVivo = partida.visitante.reputacao - 10;

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
            $scope.concluirPartida($scope.partidaAoVivo);
            return;
        }

        $timeout(function() {
            if ($scope.partidaPausada) return;

            $scope.minutoAtual += 2; 
            
            var forcaUsuario = $scope.forcaMandanteAoVivo;
            var forcaAdv = $scope.forcaVisitanteAoVivo;
            
            // FASE 8: Atualizar Posse
            var basePosseM = (forcaUsuario / (forcaUsuario + forcaAdv)) * 100;
            
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
            var multiplicadorCansaco = ($scope.taticas.marcacao === 'Pressão Alta') ? 1.5 : 1.0;
            
            jogadoresEmCampo.forEach(function(j) {
                var queda = (2.0 - (j.atributos.fisico / 100)) * multiplicadorCansaco; 
                j.condicaoFisica -= queda;
                if (j.condicaoFisica < 0) j.condicaoFisica = 0;
                
                if (j.condicaoFisica < 60) {
                    var chanceLesao = (60 - j.condicaoFisica) * 0.00015; // Reduzido drasticamente para evitar excesso de machucados
                    if (Math.random() < chanceLesao) {
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

            if (Math.random() < 0.08) { 
                var forcaAtaqueMandante = forcaUsuario;
                var forcaDefesaMandante = forcaUsuario;

                // FASE 12: Mentalidade Tática
                if ($scope.taticas.mentalidade === 'Retranca') {
                    forcaAtaqueMandante *= 0.8;
                    forcaDefesaMandante *= 1.2;
                } else if ($scope.taticas.mentalidade === 'Ofensivo') {
                    forcaAtaqueMandante *= 1.2;
                    forcaDefesaMandante *= 0.8;
                }

                var atacaMandante = Math.random() > 0.5;
                if (atacaMandante) {
                    $scope.estatisticas.chutesMandante++;
                    var zona = $scope.aleatorizarZona();
                    var chanceType = $scope.aleatorizarTipoChance();
                    var atacante = $scope.obterJogadorAleatorio($scope.partidaAoVivo.mandante.id, ['ATA','MEI','VOL','LAT']);
                    var goleiroAdv = $scope.obterJogadorAleatorio($scope.partidaAoVivo.visitante.id, ['GOL']);
                    var finalAtt = atacante && atacante.atributos ? atacante.atributos.finalizacao : 75;
                    var reflexoAdv = goleiroAdv && goleiroAdv.atributos ? goleiroAdv.atributos.reflexo : 75;
                    var xg = $scope.calcularXG(forcaAtaqueMandante, forcaDefesaMandante, zona, finalAtt, reflexoAdv, chanceType);
                    var isGoal = (Math.random() < xg);

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
                            reflexo_oponente: reflexoAdv,
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
                    } else {
                        $scope.tocarSom('chute');
                        var narracaoChute = $scope.minutoAtual + "' - ";
                        if (chanceType === 'PENALTY') narracaoChute += "Penalti desperdiçado!";
                        else if (chanceType === 'CORNER') narracaoChute += "Escanteio desperdiçado!";
                        else if (chanceType === 'DIRECT_FK') narracaoChute += "Falta direta na trave!";
                        else narracaoChute += "Uuuuh! Chute perigoso do " + $scope.partidaAoVivo.mandante.sigla + " quase entra.";
                        $scope.narracao.unshift(narracaoChute);
                    }
                } else {
                    $scope.estatisticas.chutesVisitante++;
                    var zonaV = $scope.aleatorizarZona();
                    var chanceTypeV = $scope.aleatorizarTipoChance();
                    var atacanteV = $scope.obterJogadorAleatorio($scope.partidaAoVivo.visitante.id, ['ATA','MEI','VOL','LAT']);
                    var goleiroMand = $scope.obterJogadorAleatorio($scope.partidaAoVivo.mandante.id, ['GOL']);
                    var finalAttV = atacanteV && atacanteV.atributos ? atacanteV.atributos.finalizacao : 75;
                    var reflexoMand = goleiroMand && goleiroMand.atributos ? goleiroMand.atributos.reflexo : 75;
                    var xgV = $scope.calcularXG(forcaAdv, forcaDefesaMandante, zonaV, finalAttV, reflexoMand, chanceTypeV);
                    var isGoalV = (Math.random() < xgV);

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
                            reflexo_oponente: reflexoMand,
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
                    } else {
                        $scope.tocarSom('chute');
                        var narracaoVisitante = $scope.minutoAtual + "' - ";
                        if (chanceTypeV === 'PENALTY') narracaoVisitante += "Penalti desperdiçado!";
                        else if (chanceTypeV === 'CORNER') narracaoVisitante += "Escanteio desperdiçado!";
                        else if (chanceTypeV === 'DIRECT_FK') narracaoVisitante += "Falta direta na trave!";
                        else narracaoVisitante += "Defesa espetacular do goleiro do " + $scope.partidaAoVivo.mandante.sigla + "!";
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

    $scope.concluirPartida = function(partida) {
        var hoje = $scope.calendarioGeral[$scope.diaAtual];
        
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
                } catch (e) {
                    // Falha silenciosa para não quebrar a conclusão da partida
                }
            }
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
        
        $scope.diaAtual++;
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

            // FASE 11: Recuperação e Punições
            j.condicaoFisica += 30;
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
                    var nivelDM = $scope.clubeAtual.nivelMedico || 1;
                    var recuperacaoExtra = 0;
                    if (nivelDM === 2 && Math.random() < 0.3) recuperacaoExtra = 1;
                    if (nivelDM === 3 && Math.random() < 0.6) recuperacaoExtra = 1;

                    j.diasLesao -= (1 + recuperacaoExtra);
                    if (j.diasLesao <= 0) {
                        j.lesionado = false;
                        j.diasLesao = 0;
                    }
                }
            } else if (!partida && Math.random() < 0.015) { // 1.5% de chance de lesão no treino
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
        if ($scope.diaAtual > 0 && $scope.diaAtual % 5 === 0) {
            var folha = $scope.calcularFolhaSalarial();
            $scope.clubeAtual.orcamento -= folha;
            $scope.financasHistorico.unshift({
                tipo: 'despesa',
                descricao: 'Pagamento de Salários (Mensal - Dia ' + $scope.diaAtual + ')',
                valor: folha,
                data: new Date().toLocaleDateString('pt-BR')
            });

            var baseVendaCamisas = $scope.clubeAtual.reputacao * 25000; // Representa as vendas mensais
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
        }

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

        // FASE 13: Fechamento do Mês Financeiro (a cada 4 datas)
        if ($scope.diaAtual > 0 && $scope.diaAtual % 4 === 0) {

            // Custo de Manutenção do Estádio
            var valorManutencao = $scope.clubeAtual.estadio.capacidade * 20;
            $scope.clubeAtual.orcamento -= valorManutencao;
            $scope.financasHistorico.unshift({
                tipo: 'despesa',
                descricao: 'Manutenção do Estádio Mensal',
                valor: valorManutencao,
                data: new Date().toLocaleDateString('pt-BR')
            });
        }

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

        $scope.simularMercadoCPU();

        // Notificações de Janela
        if ($scope.diaAtual === 35) {
            $scope.caixaEntrada.unshift({
                id: 'msg_janela_' + Date.now(),
                remetente: 'Federação',
                assunto: 'Janela de Transferências ABERTA!',
                mensagem: 'O período de transferências acaba de começar! Os clubes estão livres para comprar e vender atletas. A janela fechará na rodada 45 do calendário.',
                lida: false,
                tipo: 'info',
                data: new Date().toLocaleDateString('pt-BR')
            });
            $scope.mensagensNaoLidas++;
        } else if ($scope.diaAtual === 13 || $scope.diaAtual === 43) {
            $scope.caixaEntrada.unshift({
                id: 'msg_janela_' + Date.now(),
                remetente: 'Federação',
                assunto: 'Janela fechando em breve!',
                mensagem: 'Atenção! Faltam apenas mais 2 rodadas para o fechamento definitivo do mercado de transferências. Acelere as suas negociações pendentes.',
                lida: false,
                tipo: 'info',
                data: new Date().toLocaleDateString('pt-BR')
            });
            $scope.mensagensNaoLidas++;
        } else if ($scope.diaAtual === 16 || $scope.diaAtual === 46) {
            $scope.caixaEntrada.unshift({
                id: 'msg_janela_' + Date.now(),
                remetente: 'Federação',
                assunto: 'Janela de Transferências FECHADA!',
                mensagem: 'O período de contratações se encerrou. As equipes não podem mais comprar nem vender novos atletas até a próxima abertura do mercado.',
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

    $scope.calcularXG = function(forcaAtaque, forcaDefesa, zona, finalizacao, reflexo, chanceType) {
        var zonaMultipliers = { 'ATA':1.0, 'MEI':0.6, 'VOL':0.25, 'LAT':0.15, 'ZAG':0.05, 'INDEFINIDO':0.08 };
        var zm = zonaMultipliers[zona] || 0.08;
        var adv = forcaAtaque / Math.max(1, forcaDefesa);
        var base = 1.5 * adv * zm; // increased base to compensate per-player modifiers

        // Player-level modifiers (defaults if not provided)
        finalizacao = (typeof finalizacao === 'number') ? finalizacao : 75;
        reflexo = (typeof reflexo === 'number') ? reflexo : 75;

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

        var xg = base * shooterBoost * (1 - goalieReduction);
        return Math.max(0.005, Math.min(0.6, xg));
    };

    $scope.calcularPlacarAleatorioCPU = function(mandante, visitante, aplicaCasa) {
        // Usa xG por finalização em vez de "chanceM" direta e incorpora média de atributos dos jogadores
        var forcaM = mandante.reputacao + (aplicaCasa ? 10 : 0);
        var forcaV = visitante.reputacao;
        var diff = forcaM - forcaV;
        var bias = 0.5 + (diff / (forcaM + forcaV)) * 0.35;
        bias = Math.max(0.05, Math.min(0.95, bias));

        function mediaAtributoTime(clubeId, atributo, posFilter) {
            if (!$scope.jogadores) return 75;
            var jTime = $scope.jogadores.filter(function(j) { return j.clubeId === clubeId && j.atributos; });
            if (posFilter && posFilter.length > 0) jTime = jTime.filter(function(j) { return posFilter.indexOf(j.posicao) !== -1; });
            if (!jTime || jTime.length === 0) return 75;
            var soma = jTime.reduce(function(s, j) { return s + (j.atributos[atributo] || 75); }, 0);
            return Math.round(soma / jTime.length);
        }

        var avgFinalM = mediaAtributoTime(mandante.id, 'finalizacao', ['ATA','MEI','VOL','LAT']);
        var avgReflexoM = mediaAtributoTime(mandante.id, 'reflexo', ['GOL']);
        var avgFinalV = mediaAtributoTime(visitante.id, 'finalizacao', ['ATA','MEI','VOL','LAT']);
        var avgReflexoV = mediaAtributoTime(visitante.id, 'reflexo', ['GOL']);

        var gM = 0, gV = 0;
        var eventos = Math.floor(Math.random() * 6) + 4; // 4..9 eventos (aumentado para gerar mais finalizações)
        for (var i = 0; i < eventos; i++) {
            if (Math.random() < 0.9) { // chance de gerar uma finalização (mais chutes por partida)
                var atacanteEhMandante = Math.random() < bias;
                if (atacanteEhMandante) {
                    var zona = $scope.aleatorizarZona();
                    var chanceType = $scope.aleatorizarTipoChance();
                    var xg = $scope.calcularXG(forcaM, forcaV, zona, avgFinalM, avgReflexoV, chanceType);
                    if (Math.random() < xg) gM++;
                } else {
                    var zona2 = $scope.aleatorizarZona();
                    var chanceType2 = $scope.aleatorizarTipoChance();
                    var xg2 = $scope.calcularXG(forcaV, forcaM, zona2, avgFinalV, avgReflexoM, chanceType2);
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
                else ch.vencedor = Math.random() > 0.5 ? ch.time1 : ch.time2; // Penaltis simulados rápido
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
        // FASE 19: Evolução de Atributos e Regressão de Idade
        $scope.jogadores.forEach(function(j) {
            j.idade++;
            var isUserPlayer = (j.clubeId === $scope.clubeAtual.id);
            var pontosOuro = isUserPlayer ? ((j.golsTemporada || 0) > 10 ? 2 : 1) : 1;
            if (subiu && isUserPlayer) pontosOuro++;

            if (j.idade <= 24) {
                // Evolução
                var chanceEvolucao = Math.random();
                if (chanceEvolucao > 0.4) {
                    var chaves = Object.keys(j.atributos);
                    for(var k=0; k<pontosOuro; k++) {
                        var attrAlvo = chaves[Math.floor(Math.random() * chaves.length)];
                        j.atributos[attrAlvo] += Math.floor(Math.random() * 3) + 1; // ganha de 1 a 3 pontos no atributo
                        if (j.atributos[attrAlvo] > 99) j.atributos[attrAlvo] = 99;
                    }
                }
            } else if (j.idade >= 32) {
                // Regressão
                if (Math.random() > 0.3) {
                    j.atributos.fisico -= Math.floor(Math.random() * 3) + 1;
                    if (j.atributos.velocidade) j.atributos.velocidade -= Math.floor(Math.random() * 3) + 1;
                    if (j.atributos.fisico < 10) j.atributos.fisico = 10;
                    if (j.atributos.velocidade < 10) j.atributos.velocidade = 10;
                }
            }
        });

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
            meuDesempenhoCopa: copaFaseAlcance
        };
        
        $scope.telaAtual = 'cerimonia';
    };

    $scope.avancarAposCerimonia = function() {
        if ($scope.relatorioFimAno.demitido) {
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

        var clubesDisponiveis = $scope.clubes.filter(function(c) {
            return c.reputacao <= repMaxima && c.id !== $scope.clubeAtual.id;
        });

        clubesDisponiveis.sort(function() { return 0.5 - Math.random(); });
        $scope.propostasEmprego = clubesDisponiveis.slice(0, 4); // Oferece até 4 clubes
    };

    $scope.aceitarProposta = function(clubeId) {
        $scope.selecionarClube(clubeId);
        $scope.executarViradaDeAno(true);
    };

    $scope.executarViradaDeAno = function(trocouDeClube) {
        var divs = ["A", "B", "C", "D"];
        var classificados = {};
        divs.forEach(function(d) { classificados[d] = $scope.ordenarTabela(d); });
        
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

                // Progressão e Regressão
                if (j.idade <= 23 && (j.partidasJogadas || 0) >= 10) {
                    // Evolui um pouco se for jovem e jogou
                    j.passe = Math.min(100, j.passe + 1);
                    j.chute = Math.min(100, j.chute + 1);
                    j.fisico = Math.min(100, j.fisico + 1);
                    j.defesa = Math.min(100, j.defesa + 1);
                } else if (j.idade >= 33) {
                    // Regride fisicamente se for velho
                    j.velocidade = Math.max(10, j.velocidade - 2);
                    j.fisico = Math.max(10, j.fisico - 1);
                }

                if (j.anosContrato) j.anosContrato--;
                if (!j.anosContrato || j.anosContrato <= 0) {
                    dispensados.push(j.nome);
                    j.clubeId = 'mercado';
                    j.emCampo = false;
                }
            });
            
            $scope.elencoAtual = $scope.elencoAtual.filter(function(j) { return j.anosContrato > 0; });
            if (dispensados.length > 0) {
                alert("Os seguintes jogadores ficaram sem contrato e deixaram o clube: " + dispensados.join(", "));
                $scope.atualizarTaticas();
            }
        }
        
        if ($scope.jogadores) {
            $scope.jogadores.forEach(function(j) { 
                j.idade++; 
                j.golsTemporada = 0;
                j.partidasJogadas = 0; // Reset
                if (!j.anosContrato || j.anosContrato <= 0) j.anosContrato = Math.floor(Math.random() * 3) + 1; 
                
                // Progressão simplificada para CPU (aleatória leve para jovens, nerf pra velhos)
                if (j.idade <= 23 && j.clubeId !== 'mercado' && Math.random() > 0.5) {
                    j.passe = Math.min(100, j.passe + 1);
                    j.chute = Math.min(100, j.chute + 1);
                } else if (j.idade >= 33) {
                    j.velocidade = Math.max(10, j.velocidade - 2);
                }
            });
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
        $scope.patrocinioAtual = null; // Renovar patrocínios todo ano
        $scope.gerarPatrocinadores();
        
        $scope.gerarCalendario();
        $scope.gerarMetaDiretoria();

        $scope.caixaEntrada.unshift({
            id: 'msg_janela_inicio_ano_' + $scope.dados.anoAtual,
            remetente: 'Federação',
            assunto: 'Janela de Transferências ABERTA!',
            mensagem: 'O período de transferências acaba de começar! Os clubes estão livres para comprar e vender atletas. A janela fechará na rodada 15 do calendário.',
            lida: false,
            tipo: 'info',
            data: new Date().toLocaleDateString('pt-BR')
        });
        $scope.mensagensNaoLidas++;

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
        return folha;
    };

    // FASE 17: GERAÇÃO DE PATROCINADORES MASTER
    $scope.gerarPatrocinadores = function() {
        if (!$scope.clubeAtual) return;
        var base = $scope.clubeAtual.reputacao * 500000;
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
        } else {
            $scope.existeSave = false;
            $scope.saveInfo = null;
        }
    };

    $scope.salvarJogoSilencioso = function() {
        if (!$scope.clubeAtual) return;
        var saveObj = {
            nomeTreinador: $scope.dados.nomeTreinador,
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
            jogosCPU: $scope.jogosCPU,
            tabelas: $scope.tabelas,
            taticas: $scope.taticas,
            configFinanceira: $scope.configFinanceira,
            clubeAtualInfo: $scope.clubeAtual, // Adicionado para persistir o estado do estadio modificado
            dataSave: new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            telemetriaHistorico: $scope.telemetriaHistorico || []
        };
        window.localStorage.setItem('reiDaPranchetaSave', JSON.stringify(saveObj));
        $scope.checarSaveExistente(); 
    };

    $scope.salvarJogo = function() {
        $scope.salvarJogoSilencioso();
        alert('Jogo salvo com sucesso!');
    };

    // Exportar telemetria da partida atual como CSV para download
    $scope.exportTelemetriaPartida = function() {
        if (!$scope.partidaAoVivo || !$scope.partidaAoVivo.telemetriaShots || $scope.partidaAoVivo.telemetriaShots.length === 0) {
            alert('Nenhuma telemetria disponível nesta partida.');
            return;
        }

        var rows = ['minuto,time,zona,xg,finalizacao,reflexo_oponente,shooterId,shooterNome,goal'];
        $scope.partidaAoVivo.telemetriaShots.forEach(function(s) {
            rows.push([s.minuto, s.time, s.zona, s.xg, s.finalizacao, s.reflexo_oponente, s.shooterId, '"' + (s.shooterNome || '') + '"', s.result === 'GOL' ? 1 : 0].join(','));
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
        $scope.dados.nomeTreinador = $scope.saveInfo.nomeTreinador;
        $scope.dados.anoAtual = $scope.saveInfo.anoAtual || 2024;
        $scope.caixaEntrada = $scope.saveInfo.caixaEntrada || [];
        $scope.noticiasFeed = $scope.saveInfo.noticiasFeed || [];
        $scope.patrocinioAtual = $scope.saveInfo.patrocinioAtual || null;
        $scope.clubeAtual = $scope.clubes.find(function(c) { return c.id === $scope.saveInfo.clubeAtualId; });
        if (!$scope.patrocinioAtual) $scope.gerarPatrocinadores();
        $scope.elencoAtual = $scope.saveInfo.elencoAtual;
        
        // Recupera dados Financeiros
        if ($scope.saveInfo.orcamentoAtual) {
            $scope.clubeAtual.orcamento = $scope.saveInfo.orcamentoAtual;
        }
        $scope.financasHistorico = $scope.saveInfo.financasHistorico || [];

        // Recupera dados do calendário
        $scope.calendario = $scope.saveInfo.calendario || [];
        $scope.rodadaAtual = $scope.saveInfo.rodadaAtual || 0;
        $scope.diaAtual = $scope.saveInfo.diaAtual || 0;
        
        if ($scope.saveInfo.calendarioGeral) {
            $scope.calendarioGeral = $scope.saveInfo.calendarioGeral;
        }
        if ($scope.saveInfo.copaBrasil) {
            $scope.copaBrasil = $scope.saveInfo.copaBrasil;
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

        if ($scope.saveInfo.clubeAtualInfo) {
            $scope.clubeAtual.estadio = $scope.saveInfo.clubeAtualInfo.estadio;
            $scope.clubeAtual.orcamento = $scope.saveInfo.clubeAtualInfo.orcamento;
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
                    { texto: "Vamos entrar com muita raça e impor nosso jogo.", efeito: 'motivacao', msg: 'O treinador passou confiança e a equipe vai mais motivada para o grande jogo.' },
                    { texto: "O adversário é forte, viemos para jogar por uma bola.", efeito: 'defensivo', msg: 'A torcida e parte da mídia criticaram a postura excessivamente cautelosa nas palavras do treinador.' },
                    { texto: "Somos amplamente favoritos e vamos provar isso em campo.", efeito: 'arrogante', msg: 'Treinador exala confiança e assume todo o favoritismo. Promessa de um time totalmente ofensivo hoje!' }
                ]
            },
            {
                pergunta: "Mister, como está a preparação tática para enfrentar o " + adversario + " nesta partida decisiva?",
                opcoes: [
                    { texto: "Nossa estratégia é clara: atacar desde o primeiro minuto.", efeito: 'arrogante', msg: 'Treinador promete um time super agressivo. A torcida adora, mas a defesa pode ficar exposta.' },
                    { texto: "Fizemos ajustes finos, os jogadores sabem o que fazer.", efeito: 'motivacao', msg: 'Discurso equilibrado e focado. O elenco se sente preparado e blindado contra a pressão.' },
                    { texto: "Vamos montar um ferrolho atrás e buscar o contra-ataque.", efeito: 'defensivo', msg: 'A imprensa esportiva detonou o estilo retranqueiro prometido pelo professor.' }
                ]
            },
            {
                pergunta: "A torcida do " + adversario + " está muito confiante. O que você tem a dizer para os seus torcedores?",
                opcoes: [
                    { texto: "Eles têm razão em temer o nosso elenco.", efeito: 'arrogante', msg: 'Resposta polêmica! Treinador incendeia o clima do jogo chamando a responsabilidade.' },
                    { texto: "Respeitamos o adversário, será um jogo de xadrez.", efeito: 'defensivo', msg: 'Treinador esfria os ânimos com uma declaração conservadora e respeitosa.' },
                    { texto: "Vamos lutar por cada palmo do gramado por nossa torcida!", efeito: 'motivacao', msg: 'As palavras inflamaram a torcida e os jogadores, que prometem deixar sangue em campo!' }
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
        $scope.adicionarMensagem('Imprensa', 'Repercussão', opcao.msg, false, 'imprensa');
        $scope.coletivaRespondida = true;
        $scope.prepararPartida($scope.modoPartidaPendente);
    };

    // FASE 14: SISTEMA DE OLHEIROS E WONDERKIDS
    $scope.contratarOlheiro = function() {
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
                    reflexo: baseAttr + Math.floor(Math.random() * 20)
                },
                potencial: 85 + Math.floor(Math.random() * 11) // Potencial entre 85 e 95
            };
            
            // FASE 11 compatibility
            j.condicaoFisica = 100; j.cartoesAmarelos = 0; j.lesionado = false; j.diasLesao = 0; j.suspenso = false; j.emCampo = false;
            
            novosJogadores.push(j);
        }
        olheiro.relatorio = novosJogadores;
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
        $scope.salvarJogoSilencioso();
    };

    $scope.mudarTela = function(novaTela) {
        if ($scope.partidaEmAndamento && !$scope.partidaPausada) {
            alert("Aguarde o fim da partida!");
            return;
        }
        $scope.telaAtual = novaTela;
        if (novaTela === 'mercado') {
            $scope.atualizarMercado();
        }
    };

    $scope.selecionarClube = function(clubeId) {
        $scope.clubeAtual = $scope.clubes.find(function(c) { return c.id === clubeId; });
        $scope.elencoAtual = angular.copy($scope.jogadores.filter(function(j) { return j.clubeId === clubeId; }));
        $scope.elencoAtual.forEach(function(j) {
            j.emCampo = false; j.posX = 0; j.posY = 0;
        });
        $scope.formacaoEscolhida = '4-3-3'; // Default para o seletor
        $scope.verificarVariaveisExtras(); // FASE 13: Garante que o estádio foi inicializado
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
            return $scope.calcularOverall(b) - $scope.calcularOverall(a);
        });
        
        posicoes.forEach(function(slot) {
            // Procura o melhor da posição que não esteja machucado/suspenso e nem expulso
            var jogador = banco.find(function(j) { return !j.emCampo && !j.expulso && j.posicao === slot.pos && !j.lesionado && !j.suspenso; });
            if (!jogador) {
                // Se não achar, pega o melhor geral disponível (improviso)
                jogador = banco.find(function(j) { return !j.emCampo && !j.expulso && !j.lesionado && !j.suspenso; });
            }
            if (jogador) {
                jogador.emCampo = true;
                jogador.posX = slot.x;
                jogador.posY = slot.y;
            }
        });
    };

    $scope.moverJogador = function(jogadorId, areaTipo, posX, posY) {
        var jogador = $scope.elencoAtual.find(function(j) { return j.id === jogadorId; });
        if (jogador && !jogador.expulso && !jogador.lesionado && !jogador.suspenso) {
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
                    jogadorSobreposto.emCampo = false;
                    
                    if (!jogador.emCampo && $scope.partidaEmAndamento && $scope.partidaPausada) {
                        if ($scope.substituicoesFeitas >= 5) {
                            alert("Limite de 5 substituições atingido!");
                            jogadorSobreposto.emCampo = true; // Desfaz
                            return;
                        }
                        $scope.substituicoesFeitas++;
                    }
                    
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
                jogador.emCampo = false;
            }
        } else if (jogador && jogador.expulso) {
            alert("Este jogador foi expulso e não pode voltar pro campo!");
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
    $scope.obterJogadorAleatorio = function(clubeId, posicoes) {
        if (!$scope.jogadores) return null;
        var elenco = [];
        if ($scope.clubeAtual && clubeId === $scope.clubeAtual.id) {
            elenco = $scope.elencoAtual || [];
        } else {
            elenco = $scope.jogadores.filter(function(j) { return j.clubeId === clubeId; });
        }

        var candidatos = elenco.filter(function(j) {
            if (!j) return false;
            if (j.lesionado || j.expulso) return false;
            if (!posicoes || posicoes.length === 0) return true;
            return posicoes.indexOf(j.posicao) !== -1;
        });

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
        if (jogador.posicao === 'GOL') base = (attr.reflexo * 2 + attr.fisico + attr.passe) / 4;
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
        var rodadaLiga = $scope.calendarioGeral[$scope.diaAtual].rodadaLiga;
        // Se a rodadaLiga não existe (Copa, etc), a gente aproxima pelo diaAtual
        var dia = $scope.diaAtual;
        // Janela Início do Ano: Dias 0 a 15
        // Janela Meio do Ano: Dias 35 a 45
        return (dia >= 0 && dia <= 15) || (dia >= 35 && dia <= 45);
    };

    $scope.filtroBusca = {
        nome: '',
        posicao: 'TODOS',
        divisao: 'TODOS',
        contrato: 'TODOS'
    };
    $scope.resultadosBuscaMercado = [];

    $scope.atualizarMercado = function() {
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
        return (jogador.salario || 0) * 100;
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
        
        $scope.ofertaValores = {
            clube: $scope.calcularValorPasse(jogador),
            salario: jogador.salario || 10000,
            anos: "1",
            clubeAceita: 0
        };

        if ($scope.tipoNegociacao === 'compra' && jogador.clubeId !== 'mercado') {
            $scope.estadoNegociacao = 'proposta_clube';
        } else {
            $scope.estadoNegociacao = 'proposta_jogador';
        }
    };

    $scope.fecharNegociacao = function() {
        $scope.negociacaoAtiva = false;
        $scope.jogadorNegociacao = null;
    };

    $scope.enviarPropostaClube = function(oferta) {
        var valorPasse = $scope.calcularValorPasse($scope.jogadorNegociacao);
        var margemAceitacao = valorPasse * 0.85;

        if (oferta >= margemAceitacao) {
            $scope.ofertaValores.clubeAceita = oferta;
            $scope.estadoNegociacao = 'proposta_jogador';
        } else {
            $scope.estadoNegociacao = 'rejeitado';
            $scope.motivoRejeicao = "A diretoria do clube rejeitou sua oferta. Eles não aceitariam menos de " + $scope.formatarMoeda(margemAceitacao) + ".";
        }
    };

    $scope.enviarPropostaJogador = function(salario, anos) {
        var salarioBase = $scope.jogadorNegociacao.salario || 10000;
        var margemAceitacao = salarioBase * 0.9;

        if (salario >= margemAceitacao) {
            $scope.estadoNegociacao = 'sucesso';
            $scope.motivoRejeicao = $scope.tipoNegociacao === 'compra' ? "O jogador aceitou sua oferta de salário e assinou o contrato!" : "Renovação concluída com sucesso!";
            $scope.concluirTransferencia($scope.jogadorNegociacao, salario, anos, $scope.ofertaValores.clubeAceita);
        } else {
            $scope.estadoNegociacao = 'rejeitado';
            $scope.motivoRejeicao = "O jogador e seu agente recusaram a oferta salarial. Eles esperavam algo na casa de " + $scope.formatarMoeda(salarioBase) + ".";
        }
    };

    $scope.concluirTransferencia = function(jogador, salario, anos, valorPagoClube) {
        if ($scope.tipoNegociacao === 'compra') {
            if (valorPagoClube > 0) {
                $scope.clubeAtual.orcamento -= valorPagoClube;
                $scope.registrarTransacao("Compra do passe: " + jogador.nome, valorPagoClube, 'despesa');
            }
            
            var novoJogador = angular.copy(jogador);
            novoJogador.clubeId = $scope.clubeAtual.id;
            novoJogador.emCampo = false;
            novoJogador.condicaoFisica = 100;
            novoJogador.cartoesAmarelos = 0;
            novoJogador.lesionado = false;
            novoJogador.diasLesao = 0;
            novoJogador.suspenso = false;
            novoJogador.salario = salario;
            novoJogador.anosContrato = parseInt(anos);
            
            $scope.elencoAtual.push(novoJogador);
            $scope.atualizarMercado();
            $scope.salvarJogoSilencioso();
            $scope.adicionarMensagem('Diretoria', 'Contratação Concluída', jogador.nome + ' foi contratado e assinou por ' + anos + ' temporada(s)!', false, 'transferencia');
        } else {
            jogador.salario = salario;
            jogador.anosContrato = parseInt(anos);
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
            
            $scope.elencoAtual = $scope.elencoAtual.filter(function(j) { return j.id !== jogador.id; });
            $scope.salvarJogoSilencioso();
        }
    };

    $scope.simularMercadoCPU = function() {
        if (!$scope.isJanelaTransferenciaAberta()) return;

        // 1. Propostas pelo seu jogador (Apenas 5% de chance agora por dia de janela)
        if (Math.random() < 0.05 && $scope.elencoAtual.length > 15) { 
            var jAlvo = $scope.elencoAtual[Math.floor(Math.random() * $scope.elencoAtual.length)];
            if (jAlvo.emCampo === false && !jAlvo.emNegociacao) {
                var possiveisClubes = $scope.clubes.filter(function(c) { return c.id !== $scope.clubeAtual.id && (c.divisao === 'A' || c.divisao === 'B'); });
                if (possiveisClubes.length > 0) {
                    var clubeComprador = possiveisClubes[Math.floor(Math.random() * possiveisClubes.length)];
                    var valorOferta = Math.floor($scope.calcularValorPasse(jAlvo) * (0.8 + Math.random() * 0.7)); 
                    
                    jAlvo.emNegociacao = true;
                    $scope.caixaEntrada.unshift({
                        id: 'msg_' + Date.now(),
                        remetente: clubeComprador.nome,
                        assunto: 'Proposta de Transferência: ' + jAlvo.nome,
                        mensagem: 'O ' + clubeComprador.nome + ' gostaria de contratar o ' + jAlvo.nome + '. Eles oferecem ' + $scope.formatarMoeda(valorOferta) + ' à vista.',
                        lida: false,
                        tipo: 'oferta_compra',
                        data: new Date().toLocaleDateString('pt-BR'),
                        jogadorOfertaId: jAlvo.id,
                        valorOferta: valorOferta
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
            var livresBons = $scope.jogadores.filter(function(j) { return j.clubeId === 'mercado' && $scope.calcularOverall(j) > 70; });
            if (livresBons.length > 0) {
                var contratacao = livresBons[Math.floor(Math.random() * livresBons.length)];
                contratacao.clubeId = cComprador.id;
                contratacao.anosContrato = 2;

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
    };

    $scope.melhorarDM = function(nivel, custo) {
        if ($scope.clubeAtual.orcamento >= custo) {
            if (confirm("Deseja gastar " + $scope.formatarMoeda(custo) + " para melhorar o Departamento Médico para o Nível " + nivel + "?")) {
                $scope.clubeAtual.orcamento -= custo;
                $scope.clubeAtual.nivelMedico = nivel;
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

    $scope.obterNomeClube = function(clubeId) {
        if (!clubeId || clubeId === 'mercado') return 'LIVRE NO MERCADO';
        if (!$scope.clubes) return 'Desconhecido';
        var c = $scope.clubes.find(function(cl) { return cl.id == clubeId; });
        return c ? c.nome : 'Desconhecido';
    };

    $scope.carregarDados();
});
