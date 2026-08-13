# Rei da Prancheta

Simulador de futebol e gestão de clube executado diretamente no navegador.

## Executar localmente

1. Instale o Node.js (versão 18 ou superior recomendada).
2. Na raiz do projeto, execute `npm install`.
3. Sirva a pasta por um servidor HTTP local. Por exemplo, com Python:

   `python -m http.server 8000`

4. Abra `http://localhost:8000` no navegador.

Abrir o `index.html` diretamente pelo sistema de arquivos pode bloquear o carregamento dos arquivos JSON por política do navegador.

## Verificações

`npm run check` valida a sintaxe do motor principal.

`npm test` executa todos os testes de regras, migração de saves, calendário, partidas, mercado, contratos, infraestrutura, torcida, scouting, moral e categorias de base.

## Estrutura

- `index.html`: telas e componentes da interface.
- `js/app.js`: controller, regras de negócio e motor de simulação.
- `data/`: clubes e jogadores.
- `css/`: estilos.
- `tests/`: testes automatizados executáveis com Node.js.
- `scripts/`: ferramentas de teste e análise de telemetria.

## Estado dos dados

O jogo usa `localStorage` para o save do navegador. Para preservar uma carreira, use o botão **Salvar Jogo** antes de limpar os dados do site. Ainda não há sincronização em nuvem nem múltiplos slots de save.

## Limites atuais

O projeto está em estabilização. A suíte automatizada cobre as regras principais, mas a validação visual e o teste de fluxo completo no navegador ainda devem ser feitos antes de uma distribuição pública.
