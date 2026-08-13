# Retorno - Contratos e Valorizacao V2

**Data**: 03/07/2026  
**Projeto**: `D:\Projetos\rei-prancheta-app`  
**Save version final**: `11`

## O que foi alterado

- Atualizado `SAVE_VERSION_ATUAL` de `10` para `11`.
- Adicionados campos contratuais leves por jogador: `salarioDesejado`, `statusContrato`, `statusContratoLabel`, `satisfacaoContrato`, `ultimaRevisaoContratoDia` e `valorMercadoDinamico`.
- Criados helpers centrais: `normalizarEstadoContratoJogador`, `calcularStatusContratoJogador`, `calcularSalarioDesejadoJogador`, `revisarContratosElencoDia`, `atualizarResumoContratos` e `aplicarRenovacaoContratoJogador`.
- Migração passa a normalizar contratos de jogadores antigos em `elencoAtual`, `jogadores` e demais normalizações já existentes.
- Revisão diária de contratos aplica valorização gradual para jogadores com desempenho, evolução e moral alta.
- Contratos curtos geram status gerencial: `seguro`, `monitorar`, `urgente` e `pre-contrato`.
- Insatisfação contratual reduz levemente a moral quando o jogador está subvalorizado e com vínculo crítico.
- Renovação recalcula salário desejado, restaura satisfação e atualiza status.
- Promoção da base passa a entrar no elenco com contrato coerente e normalizado.
- `calcularValorPasse` agora usa `valorMercadoDinamico` quando disponível.
- Busca de mercado normaliza estado contratual antes de renderizar cards.
- Dashboard recebeu painel compacto `Situação Contratual`.
- `Meu Elenco` recebeu badge compacta de status e satisfação contratual.
- Mercado passou a mostrar salário desejado e status de contrato nos cards.
- Criado teste automatizado `tests/contracts_v2.test.js`.

## Arquivos mexidos

- `js/app.js`
- `index.html`
- `css/styles.css`
- `tests/contracts_v2.test.js`
- `tests/save_migration.test.js`
- `tests/player_development.test.js`
- `tests/squad_morale.test.js`
- `tests/scouting_board.test.js`
- `tests/infrastructure_v2.test.js`
- `tests/fan_media_v2.test.js`
- `tests/youth_academy_v2.test.js`
- `RETORNO_CONTRATOS_VALORIZACAO_V2.md`

## Testes executados

Comando executado:

```bash
node tests/save_migration.test.js && node tests/calendar_load.test.js && node tests/market_flow.test.js && node tests/pre_match_analysis.test.js && node tests/post_match_summary.test.js && node tests/player_development.test.js && node tests/squad_morale.test.js && node tests/scouting_board.test.js && node tests/infrastructure_v2.test.js && node tests/fan_media_v2.test.js && node tests/youth_academy_v2.test.js && node tests/contracts_v2.test.js
```

Resultado: todos passaram.

```text
save_migration.test.js passed
calendar_load.test.js passed
market_flow.test.js passed
pre_match_analysis.test.js passed
post_match_summary.test.js passed
player_development.test.js passed
squad_morale.test.js passed
scouting_board.test.js passed
infrastructure_v2.test.js passed
fan_media_v2.test.js passed
youth_academy_v2.test.js passed
contracts_v2.test.js passed
```

## Como evitou regressao

- A migracao v11 normaliza contratos junto com o jogador, sem tocar em calendario ou competicoes.
- O fluxo de mercado foi preservado; a renovacao existente apenas passa a chamar a normalizacao contratual.
- A valorizacao salarial e limitada por revisao e usa incrementos pequenos.
- O dashboard usa `contratosResumo` precomputado, sem getters que criem objetos no template.
- A promocao da base continua verificando duplicidade antes de inserir em `elencoAtual` e `jogadores`.
- A bateria completa das features anteriores foi revalidada junto com o teste novo.

## Riscos residuais

- Nao houve validacao visual em navegador; a validacao automatizada cobre regras, migracao e persistencia.
- O balanceamento exato de salario desejado pode precisar de ajuste apos temporadas simuladas.
- O sistema ainda nao implementa pre-contrato com outros clubes; por enquanto ele atua como leitura de risco gerencial.
