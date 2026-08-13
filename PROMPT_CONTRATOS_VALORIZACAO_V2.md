# PROMPT PARA OUTRO AGENT - CONTRATOS E VALORIZACAO V2

**Data**: 03/07/2026  
**Projeto**: `D:\Projetos\rei-prancheta-app`  
**Stack**: AngularJS 1.x + HTML/CSS + Node.js  
**Save version atual**: `10`  
**Objetivo desta etapa**: evoluir o sistema de **contratos, renovação, valorização e risco contratual** para tornar a gestão do elenco mais realista, aproveitando o que já existe de mercado, moral, diretoria, base e finanças.

---

## 1. Contexto real do projeto hoje

O projeto já tem uma boa base para contratos:

### Estrutura atual

- jogadores já têm `salario`
- jogadores já têm `anosContrato`
- existe renovação de contrato no fluxo de mercado
- existe expiração de vínculo ao fim da temporada em [js/app.js](D:\Projetos\rei-prancheta-app\js\app.js:4837)

### Mercado

- já existe negociação com clube e jogador
- já existe histórico de transferências
- já existem propostas pendentes e continuação de negociação

### Outras peças conectadas

- moral do jogador
- ambiente do elenco
- diretoria
- torcida e imprensa
- categorias de base

Hoje, porém, os contratos ainda estão rasos:

- não existe urgência real de renovar
- não existe valorização clara por desempenho
- não existe risco contratual gradual antes do jogador sair
- não existe leitura gerencial de vencimentos próximos

---

## 2. Escopo desta etapa

Implementar **Contratos e Valorização V2** com foco em:

1. criar estado contratual mais rico por jogador
2. refletir valorização e insatisfação salarial
3. dar visibilidade a contratos críticos
4. integrar isso ao elenco, mercado, diretoria e dashboard

Sem transformar o sistema em uma simulação jurídica pesada.

---

## 3. Objetivo do sistema

Criar um ciclo contratual mais vivo:

- jogadores se valorizam com desempenho
- jogadores importantes pressionam por renovação melhor
- contratos curtos geram risco visível
- o usuário passa a gerenciar vencimentos e folha com mais critério

Tudo com impacto controlado e sem quebrar o fluxo de mercado atual.

---

## 4. Modelo recomendado

Adicionar campos leves e compatíveis ao jogador, por exemplo:

```javascript
{
  salarioDesejado: 50000,
  statusContrato: 'seguro',
  satisfacaoContrato: 72,
  ultimaRevisaoContratoDia: 0,
  valorMercadoDinamico: 3500000
}
```

### Regras dos campos

- `salarioDesejado`: referência dinâmica de negociação
- `statusContrato`: leitura derivada para UI
- `satisfacaoContrato`: 0-100
- `ultimaRevisaoContratoDia`: evita recalcular demais
- `valorMercadoDinamico`: camada opcional por cima do valor atual calculado

### Status contratuais sugeridos

- `seguro`
- `monitorar`
- `urgente`
- `pre-contrato`

---

## 5. Regras de negócio

### 5.1 Valorização por desempenho

Jogadores devem ter aumento gradual de exigência salarial quando:

- jogam muito
- evoluem bem
- têm moral alta
- entregam temporada forte

Diretriz:

- valorização leve e incremental
- não dobrar salário em poucos dias

### 5.2 Insatisfação contratual

Criar insatisfação quando:

- contrato está acabando
- jogador importante recebe pouco para o nível atual
- reserva valorizado fica sem renovação por muito tempo

Efeito esperado:

- queda pequena de moral
- talvez pequena pressão no ambiente se houver vários casos

### 5.3 Status de risco

Transformar `anosContrato` em leitura gerencial:

- `3+ anos`: seguro
- `2 anos`: monitorar
- `1 ano`: urgente
- `fim imediato` ou equivalente: pré-contrato / saída iminente

### 5.4 Renovação

Ao renovar:

- recalcular `salarioDesejado`
- restaurar parte da `satisfacaoContrato`
- atualizar status

### 5.5 Jogadores da base promovidos

Jogadores promovidos da base devem entrar com contrato inicial coerente:

- salário baixo mas não nulo
- anos de contrato padrão
- estado contratual já normalizado

---

## 6. Integrações recomendadas

### 6.1 Meu Elenco

Adicionar leitura visual melhor para contrato:

- status contratual
- talvez badge de risco
- coluna continua compacta

### 6.2 Dashboard

Adicionar bloco compacto de contratos, algo como:

- `Contratos do Elenco`
- número de vínculos urgentes
- maior caso crítico

Tudo precomputado.

### 6.3 Mercado

A busca já tem filtro de contrato. Manter isso e enriquecer:

- destacar alvos em fim de contrato
- talvez valor de oportunidade

### 6.4 Diretoria

Opcional e recomendado:

- muitos contratos urgentes podem gerar observação leve da diretoria

### 6.5 Torcida e imprensa

Opcional:

- renovação de ídolo ou saída polêmica pode gerar notícia simples

---

## 7. UI esperada

### 7.1 Meu Elenco

Na tabela atual:

- manter coluna de contrato
- adicionar uma badge pequena de status contratual
- talvez tooltip ou texto curto

### 7.2 Dashboard

Adicionar painel compacto:

- `Situação Contratual`
- urgentes
- monitorados
- atleta mais crítico

### 7.3 Mercado da Bola

Sem refazer tudo, apenas melhorar a leitura para:

- jogadores em fim de contrato
- exigência salarial estimada ou atual

---

## 8. Helpers recomendados

Criar helpers centrais, por exemplo:

- `normalizarEstadoContratoJogador(...)`
- `calcularStatusContratoJogador(...)`
- `calcularSalarioDesejadoJogador(...)`
- `revisarContratosElencoDia()`
- `atualizarResumoContratos()`

Evitar lógica espalhada por muitos lugares.

---

## 9. Balanceamento

### Diretrizes

- mudanças graduais
- sem explosão de salários
- sem quebrar orçamento em uma rodada

### Faixa sugerida

- valorização salarial periódica pequena, ex.: 1% a 6% em revisões relevantes
- satisfação contratual ajustada em passos moderados

### Importante

Este sistema deve enriquecer gestão e pressão, não inviabilizar o jogo.

---

## 10. Persistência e migração

### Obrigatório

Subir `SAVE_VERSION_ATUAL` de `10` para `11`.

### Adicionar no save

Não precisa criar um grande objeto global se o estado puder viver em cada jogador, mas a migração deve:

- normalizar jogadores do elenco
- normalizar jogadores globais quando necessário
- inicializar novos campos contratuais com defaults seguros

### Defaults sugeridos por jogador

```javascript
salarioDesejado: salario || 10000,
statusContrato: 'seguro',
satisfacaoContrato: 70,
ultimaRevisaoContratoDia: 0
```

### Regras

- migração idempotente
- não tocar em calendário
- não quebrar save/load das features recentes

---

## 11. Testes obrigatórios

Criar um teste novo:

- `tests/contracts_v2.test.js`

Cobrir pelo menos:

1. migração de save legado para v11
2. defaults contratuais em jogadores antigos
3. cálculo de status contratual
4. revisão de salário desejado após valorização
5. renovação restaura situação contratual
6. promoção da base já entra normalizada contratualmente
7. save persiste os novos campos

### Revalidar bateria

Rodar:

```bash
node tests/save_migration.test.js
node tests/calendar_load.test.js
node tests/market_flow.test.js
node tests/pre_match_analysis.test.js
node tests/post_match_summary.test.js
node tests/player_development.test.js
node tests/squad_morale.test.js
node tests/scouting_board.test.js
node tests/infrastructure_v2.test.js
node tests/fan_media_v2.test.js
node tests/youth_academy_v2.test.js
node tests/contracts_v2.test.js
```

---

## 12. Critérios de aceitação manual

Validar manualmente:

1. elenco
- contratos urgentes aparecem com leitura clara

2. renovação
- renovar jogador crítico melhora o status

3. save/load
- salvar
- voltar ao menu
- carregar novamente
- estados contratuais permanecem corretos

4. promoção da base
- jovem promovido já entra com contrato coerente

5. dashboard
- painel contratual aparece sem travar digest

6. navegação
- `Visão Geral`, `Meu Elenco`, `Mercado da Bola`, `Categorias de Base`, `Finanças`
- sem vazamento de conteúdo
- sem `infdig`

---

## 13. Guardrails obrigatórios

### Não repetir bugs anteriores

1. **Não criar getters no template que retornam arrays/objetos novos**

2. **Não atualizar `$scope` dentro de funções renderizadas**

3. **Não quebrar o fluxo atual de mercado**

4. **Não duplicar jogadores ao promover da base**

5. **Não tornar salários explosivos**

6. **Não fazer refatoração ampla do modal de negociação**
- enriquecer incrementalmente

### Regra prática

- usar resumos precomputados
- normalizar contratos junto com jogador
- efeitos conservadores
- integração mínima necessária

---

## 14. Entrega esperada

Ao terminar:

1. implementar no código
2. rodar os testes listados
3. informar resultados
4. gerar um arquivo:

`D:\Projetos\rei-prancheta-app\RETORNO_CONTRATOS_VALORIZACAO_V2.md`

Esse retorno deve conter:

- o que foi alterado
- arquivos mexidos
- testes executados e resultado
- riscos residuais
- como evitou regressão

---

## 15. Resumo executivo da tarefa

Implementar **Contratos e Valorização V2** com:

- status contratual por jogador
- salário desejado dinâmico
- pressão por renovação
- leitura compacta no elenco e no dashboard
- integração com mercado, base, diretoria e notícias
- save `v11`

Tudo de forma incremental, estável para AngularJS e sem regressão nas features já entregues.
