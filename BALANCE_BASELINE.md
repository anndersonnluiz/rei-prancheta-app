# Baseline de balanceamento

Data da medição: 14/08/2026

## Amostra

- 20.000 partidas CPU contra CPU.
- Clubes e jogadores carregados dos arquivos atuais em `data/`.
- Motor utilizado: `scripts/simulate_matches.js`.
- Telemetria analisada com `scripts/analyze_telemetry.js`.

## Resultados

| Métrica | Resultado |
|---|---:|
| Gols por partida | 1,89 |
| Gols do mandante | 1,07 |
| Gols do visitante | 0,82 |
| Vitórias do mandante | 42,70% |
| Vitórias do visitante | 30,04% |
| Empates | 27,27% |
| Finalizações registradas | 117.471 |
| Gols registrados na telemetria | 37.872 |
| Conversão geral de finalizações | 32,24% |

## Leitura inicial

- O mando de campo tem impacto perceptível e precisa ser acompanhado em simulações por competição.
- A média de gols está baixa para um futebol de alta variância, mas ainda não é suficiente para afirmar que há problema: a amostra mistura clubes e não representa uma temporada com tabela.
- A eficiência agregada por zona ficou próxima de 100% do xG, indicando que a conversão do motor está coerente com o valor esperado.
- A maior concentração de gols ocorre na zona `ATA`, como esperado.
- Esta medição ainda não é uma simulação de temporada: não mede classificação, evolução, finanças, contratos ou virada de ano.

## Próximo experimento

A simulação de temporada foi incorporada à auditoria de continuidade. Antes de alterar parâmetros de balanceamento, a próxima rodada deve ampliar a amostra para várias dezenas de temporadas e comparar a distribuição de resultados por divisão.

## Auditoria exploratória de continuidade

Data da medição: 23/09/2026

A ferramenta `scripts/analyze_long_term_balance.js` passou a distribuir as amostras entre as Séries A, B, C e D, registrando a divisão de entrada e a divisão após três temporadas. A rodada exploratória executou oito cenários, dois clubes por divisão, usando o calendário e o motor real do jogo.

| Divisão inicial | Clubes avaliados | Gols por partida | Cartões acumulados | Lesões observadas | Divisões finais observadas |
|---|---|---:|---:|---:|---|
| A | Flamengo, Palmeiras | 2,13 | 569,0 | 41 | A, B |
| B | Fortaleza, Sport | 1,73 | 554,5 | 72 | C, D |
| C | Figueirense, Paysandu | 1,72 | 470,0 | 68 | D |
| D | São José-RS, Caldense | 1,56 | 537,5 | 26 | D |

Esta rodada confirma que a hierarquia inicial de orçamento e folha está coerente e que existe mobilidade entre divisões. Ela ainda não é uma base estatística definitiva: dois clubes por divisão não representam uma temporada completa. O próximo experimento deve ampliar a amostra para várias dezenas de temporadas antes de alterar gols, lesões, cartões, evolução ou receitas.

## Campanha estendida com clube passivo

Data da medição: 23/09/2026

Foram executados 36 cenários de três temporadas, totalizando 108 temporadas observadas: nove clubes iniciais por divisão. O clube selecionado jogou suas partidas, mas não recebeu decisões automáticas de contratação, renovação ou ajuste de elenco; os demais jogos foram simulados pelo motor da CPU.

| Divisão inicial | Cenários | Gols por partida | Cartões acumulados | Lesões observadas | Folha máxima média | Orçamento mínimo médio |
|---|---:|---:|---:|---:|---:|---:|
| A | 9 | 2,01 | 537,3 | 57,3 | R$ 3.472.544 | R$ 330.277.778 |
| B | 9 | 1,79 | 493,3 | 56,4 | R$ 1.533.333 | R$ 172.564.444 |
| C | 9 | 1,66 | 497,3 | 62,9 | R$ 1.666.667 | R$ 78.573.333 |
| D | 9 | 1,68 | 552,6 | 43,6 | R$ 1.331.522 | R$ 40.400.000 |

### Decisão após a campanha

- A produção de gols diminui de forma geral conforme a divisão, sem uma inversão grave entre A e D.
- Os orçamentos mantêm a hierarquia esperada: A > B > C > D.
- A queda recorrente dos clubes acompanhados não pode ser atribuída somente ao motor de partidas: o grupo acompanhado não toma decisões de mercado nem de elenco.
- Não alterar ainda gols, lesões, cartões, evolução ou receitas com base neste grupo. A próxima medição deve comparar este grupo passivo com um grupo em que o clube também receba a gestão automática da CPU.

## Auditoria ampliada de continuidade

Data da medição: 23/09/2026

Foram executados 20 cenários de cinco temporadas, totalizando 100 temporadas observadas: cinco clubes iniciais por divisão. O clube selecionado permaneceu em modo humano passivo, sem contratação, renovação ou ajuste automático do próprio elenco; os demais clubes continuaram recebendo a dinâmica de mercado da CPU.

| Divisão inicial | Clubes avaliados | Gols por partida | Cartões acumulados | Lesões observadas | Reputação final média | Variação de divisão observada |
|---|---|---:|---:|---:|---:|---|
| A | Flamengo, Palmeiras, São Paulo, Corinthians, Atlético-MG | 2,04 | 1.011,8 | 82,2 | 90,4 | 1 acesso, 9 rebaixamentos, 15 permanências |
| B | Fortaleza, Sport, América-MG, Atlético-GO, Juventude | 1,72 | 924,4 | 87,0 | 82,6 | 0 acessos, 6 rebaixamentos, 19 permanências |
| C | Figueirense, Paysandu, Itabaiana, Anápolis, Santa Cruz | 1,70 | 993,4 | 87,6 | 57,6 | 0 acessos, 5 rebaixamentos, 20 permanências |
| D | São José-RS, Caldense, Campinense, Treze, Brasil de Pelotas | 1,62 | 866,0 | 68,8 | 44,0 | 1 acesso, 1 rebaixamento, 23 permanências |

### Leitura da amostra

- A média geral ficou em 1,77 gol por partida, com faixa de 1,52 a 2,18 entre os cenários.
- A reputação média permaneceu estável: 68,8 no início contra 68,7 ao fim, com faixa final de 37 a 98.
- A hierarquia de caixa continuou coerente, mas os clubes acompanhados de A, B e C caíram com frequência acima do esperado quando ficaram sem gestão própria.
- Todos os cinco clubes de C terminaram em D nesta rodada. Isso é um sinal de investigação sobre força inicial, renovação e gestão do elenco, não uma autorização para aumentar gols ou reduzir lesões sem separar o efeito da gestão passiva.

### Decisão técnica

Esta rodada cumpre a medição mínima de 100 temporadas, mas ainda não é uma calibração final. Antes de mexer no motor esportivo, o próximo experimento deve repetir a mesma amostra com gestão automática também para o clube acompanhado, comparando os dois grupos. Só os desvios que persistirem nos dois modos poderão justificar ajuste de gols, lesões, cartões, evolução ou receitas.

## Comparação de gestão automática

Data da medição: 23/09/2026

Foi executada uma rodada curta com oito clubes, duas amostras por divisão, uma temporada por clube, ativando a gestão automática também para o clube acompanhado.

| Modo | Temporadas | Gols por partida | Reputação inicial média | Reputação final média | Queda entre clubes acompanhados |
|---|---:|---:|---:|---:|---:|
| Humano passivo | 100 | 1,77 | 68,8 | 68,7 | Alta em A, B e C ao longo de cinco temporadas |
| Gestão automática | 8 | 1,94 | 70,1 | 73,4 | 0 em A e 0 em C na rodada curta |

### Conclusão operacional

- A queda observada na campanha passiva é explicada principalmente pela ausência de contratações, vendas e renovações do clube acompanhado.
- A gestão automática consegue preservar ou elevar a reputação no curto prazo e mantém os clubes de A e C em suas divisões nesta amostra.
- A média de gols não apresenta um desvio que justifique calibração imediata; a diferença entre 1,77 e 1,94 está associada a amostras, clubes e quantidade de temporadas diferentes.
- Não foram alterados gols, lesões, cartões, evolução ou receitas. A próxima calibração deve começar pelas decisões de gestão e pela profundidade do elenco, sempre com nova validação de longo prazo.

## Continuidade de contratos e elenco da CPU

Data da implementação: 23/09/2026

O ciclo de virada foi reforçado antes de qualquer nova calibração esportiva:

- contratos dos clubes controlados pela CPU agora são reduzidos na virada de temporada;
- atletas estruturais, titulares, jogadores importantes e jovens com potencial entram em uma fila de renovação antes do vencimento;
- a renovação respeita folha salarial, reserva operacional, caixa e compromissos parcelados do clube;
- contratos vencidos que não cabem no orçamento são liberados de forma explícita, em vez de receberem uma duração aleatória;
- carências críticas de posição são recompostas com jogadores livres, limitadas pela profundidade mínima e pelo padrão de qualidade da divisão;
- o clube humano permanece fora desse ciclo e continua sob decisão exclusiva do jogador.

### Validação executada

- `market_flow.test.js`: passou, cobrindo renovação de atleta estrutural, reposição de goleiro livre e isolamento do clube humano;
- `season_division_persistence.test.js`: passou;
- `transfer_finance.test.js`: passou;
- `long_term_continuity.test.js` com 1 temporada: passou;
- `long_term_continuity.test.js` com 3 temporadas: passou, com 132 partidas e 276 gols no cenário executado;
- `npm run check` e `git diff --check`: passaram.

Esta etapa corrige a continuidade gerencial sem calibrar gols, lesões, cartões, evolução ou receitas. A próxima medição longa deve comparar novamente os grupos passivo e gerido, agora com contratos realmente envelhecendo e elencos sendo recompostos por posição.
