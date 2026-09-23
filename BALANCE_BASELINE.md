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
