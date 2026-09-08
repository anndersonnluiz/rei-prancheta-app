const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('js/app.js', 'utf8');

assert.ok(app.includes('j.expulso === true'), 'expulsão precisa ser contada explicitamente');
assert.ok(app.includes('Math.max(0, 11 - qtdExpulsos)'), 'formação deve respeitar jogadores expulsos');
assert.ok(app.includes('elencoElegivelParaReorganizacao'), 'mudança de formação deve ter elenco elegível próprio');
assert.ok(app.includes('j.emCampo && !j.expulso'), 'reorganização em jogo não pode usar expulsos');
assert.ok(app.includes('!j.expulso && !j.lesionado'), 'sugestão de substituição deve excluir indisponíveis');
assert.ok(app.includes('substituicoesFeitas >= 5'), 'substituição deve respeitar limite');
assert.ok(app.includes('j.lesionado = true'), 'fluxo de lesão deve manter estado persistente');
assert.ok(app.includes('j.diasLesao -= (1 + recuperacaoExtra)'), 'recuperação deve reduzir dias de lesão');

console.log('match_state_regressions.test.js passed');
