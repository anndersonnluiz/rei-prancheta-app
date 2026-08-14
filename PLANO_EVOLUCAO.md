# Plano de evolução — Rei da Prancheta

Este plano organiza as próximas entregas depois da estabilização. Cada fase deve manter `npm run check` e `npm test` passando.

## Fase 1 — Fundação técnica

- Testar importação de save inválido e corrompido.
- Simular múltiplas temporadas consecutivas.
- Corrigir textos com codificação quebrada.
- Manter baseline de telemetria antes de alterar parâmetros.

Saída: três temporadas simuladas sem perda de estado, erro de calendário ou inconsistência de save.

## Fase 2 — Histórico e identidade do treinador

- Criar `historicoTreinador` com clubes, períodos, partidas, vitórias, títulos, acessos e rebaixamentos.
- Registrar demissões, propostas recebidas e temporadas concluídas.
- Criar tela de trajetória do treinador.
- Preservar o histórico em saves exportados e migrados.

Saída: trocar de clube ou concluir uma temporada preserva a trajetória completa.

## Fase 3 — Comissão técnica e staff

Ordem de implementação:

1. Modelo de staff e migração de save.
2. Contratação, demissão, salários e contratos.
3. Efeitos pequenos e mensuráveis.
4. Mensagens e eventos.
5. Testes de persistência e impacto.

Primeiros profissionais:

- auxiliar técnico: escalação automática e análise;
- preparador físico: desgaste e recuperação;
- médico: duração das lesões;
- analista: análise pré-jogo;
- olheiro-chefe: qualidade dos relatórios.

Saída: cada profissional tem custo, efeito limitado, persistência e teste automatizado.

## Fase 4 — Tática com feedback

- Ampliar instruções de linha defensiva, pressão e transição.
- Registrar a tática usada na partida.
- Relacionar tática com posse, chances, fadiga e vulnerabilidade.
- Mostrar no pós-jogo o que funcionou e falhou.
- Testar estratégias dominantes.

Saída: táticas diferentes geram perfis distinguíveis sem uma dominar todos os cenários.

## Fase 5 — Mercado e base

Implementar nesta ordem:

1. Empréstimos.
2. Pré-contratos.
3. Concorrência de outros clubes.
4. Agentes e exigências dos jogadores.
5. Potencial estimado da base.
6. Categorias sub-17 e sub-20.
7. Desenvolvimento por minutos e empréstimo.

Saída: um jovem pode ser descoberto, desenvolvido, emprestado, retornar e disputar espaço no elenco.

## Fase 6 — Balanceamento e economia

- Simular ao menos 100 temporadas headless.
- Medir gols, mando, lesões, cartões, empates e evolução.
- Medir inflação salarial e valores de mercado.
- Medir receitas por divisão.
- Detectar clubes ricos demais ou insolventes.
- Revisar premiações, patrocínios e bilheteria.

Saída: nenhuma divisão, estratégia ou receita domina o sistema sem contrapartida.

## Fase 7 — Polimento de produto

- Melhorar linha do tempo e mapa de finalizações.
- Criar resumo pós-jogo explicando causas do resultado.
- Variar mensagens e eventos.
- Revisar foco de teclado, contraste e labels.
- Revisar todas as telas em mobile.
- Adicionar múltiplos slots de save e backup automático opcional.

Saída: o jogador entende o estado do clube, o resultado da partida e o próximo objetivo sem documentação externa.

## Fase 8 — Modularização gradual

Extrair sem alterar comportamento, nesta ordem:

1. Utilitários puros.
2. Save e migração.
3. Calendário e competições.
4. Mercado e contratos.
5. Motor de partida.
6. Controller de interface.

Não fazer migração ampla de framework durante essas etapas.

## Releases sugeridos

- **0.2:** fundação técnica, histórico do treinador e múltiplos saves.
- **0.3:** comissão técnica inicial.
- **0.4:** tática com feedback e pós-jogo analítico.
- **0.5:** empréstimos, pré-contratos e base aprofundada.
- **0.6:** balanceamento econômico e simulação de longo prazo.
- **1.0:** polimento visual, acessibilidade, documentação e distribuição.
