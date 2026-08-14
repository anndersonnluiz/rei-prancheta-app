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

Criar uma simulação de temporada que use as rodadas do calendário, aplique os resultados às tabelas e processe os eventos de fim de temporada. Só depois dessa etapa devem ser alterados parâmetros de balanceamento.

