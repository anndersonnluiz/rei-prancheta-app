# Roadmap — Rei da Prancheta

Este documento organiza a evolução do simulador depois da rodada de estabilização. A regra é concluir e validar uma etapa antes de iniciar a próxima.

## Estado atual

- Protótipo jogável com carreira, calendário, partidas, elenco, táticas, mercado, finanças, base, infraestrutura, contratos, torcida e imprensa.
- Save local com migração de versões.
- Suíte automatizada com 12 arquivos de teste; todos passando em 13/08/2026.
- Layout responsivo com rolagem própria na barra lateral.
- Próximo risco principal: regras funcionando isoladamente, mas ainda sem cobertura automatizada do fluxo completo no navegador.

## Ordem de prioridade

### Etapa 1 — Fluxo de carreira e qualidade de vida

Objetivo: garantir que uma carreira completa possa ser jogada sem bloqueios.

- [ ] Testar manualmente início de carreira, partida, save, recarga e avanço de dia.
- [ ] Testar contratação, renovação, promoção da base e virada de temporada.
- [ ] Adicionar exportação/importação manual do save em JSON.
- [ ] Revisar mensagens de erro e confirmações de ações irreversíveis.
- [ ] Registrar bugs encontrados em `BUGS.md`, com reprodução e prioridade.

Critério de saída: jogar uma temporada completa, salvar/recarregar e continuar sem perda de estado.

### Etapa 2 — Testes de integração no navegador

Objetivo: cobrir a integração entre interface, dados JSON e localStorage.

- [ ] Escolher uma ferramenta de browser test compatível com o ambiente.
- [ ] Criar teste de carregamento inicial.
- [ ] Criar teste de início de jogo e seleção de clube.
- [ ] Criar teste de save e reload.
- [ ] Criar teste de navegação entre telas principais.
- [ ] Criar teste de responsividade básica da barra lateral.

Critério de saída: os fluxos críticos passam em execução automatizada, além dos testes unitários atuais.

### Etapa 3 — Balanceamento do simulador

Objetivo: medir e ajustar o comportamento de várias temporadas.

- [ ] Criar simulação headless de temporadas completas.
- [ ] Medir distribuição de gols, empates, cartões, lesões e mando de campo.
- [ ] Comparar xG com gols e finalizações.
- [ ] Medir progressão de jogadores e inflação de salários/mercado.
- [ ] Verificar sustentabilidade financeira dos clubes.
- [ ] Registrar parâmetros alterados e motivo de cada ajuste.

Critério de saída: não haver comportamento dominante ou espiral claramente injusta em temporadas simuladas.

### Etapa 4 — Organização interna do código

Objetivo: reduzir o risco de manutenção sem alterar o comportamento do jogo.

- [ ] Extrair utilitários puros de cálculo.
- [ ] Separar o motor de partida do controller AngularJS.
- [ ] Separar save/migração em módulo próprio.
- [ ] Separar calendário e competições.
- [ ] Manter testes de regressão a cada extração.

Critério de saída: cada módulo extraído ter responsabilidade clara e testes associados.

### Etapa 5 — Novas funcionalidades

Só iniciar depois das etapas anteriores. A primeira candidata recomendada é exportação/importação de save, por reduzir risco para o jogador e facilitar testes. Depois disso, as opções devem ser priorizadas pelo impacto na carreira:

1. Mais profundidade de staff e comissão técnica.
2. Melhor mercado de trabalho e propostas de clubes.
3. Eventos de temporada e objetivos narrativos.
4. Melhorias de apresentação da partida.
5. Múltiplos slots de save.

## Regra de trabalho

Cada mudança deve incluir:

1. descrição curta do comportamento esperado;
2. teste automatizado ou roteiro manual reproduzível;
3. validação de `npm run check` e `npm test`;
4. atualização deste roadmap quando uma etapa for concluída.

