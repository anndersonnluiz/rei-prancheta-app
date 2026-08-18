const assert = require('assert');
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'styles.css'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.ok(css.includes('@media (max-width: 900px)'), 'responsive layout should define tablet breakpoint');
assert.ok(css.includes('@media (max-width: 560px)'), 'responsive layout should define mobile breakpoint');
assert.ok(css.includes('.sidebar { position: relative; width: 100%'), 'mobile sidebar should return to document flow');
assert.ok(css.includes('.main-content { margin-left: 0; max-width: 100%'), 'mobile content should use full width');
assert.ok(css.includes('overflow-x: hidden'), 'page should prevent accidental horizontal overflow');
assert.ok(css.includes('focus-visible'), 'interactive controls should expose visible keyboard focus');
assert.ok(css.includes('prefers-reduced-motion'), 'interface should respect reduced-motion preference');
assert.ok(css.includes('prefers-contrast: more'), 'interface should support increased contrast preference');
assert.ok(css.includes('.scoreboard .team-color'), 'live match scoreboard should have responsive team sizing');
assert.ok(css.includes('.commentary-box {\n        height: min(42vh, 300px)'), 'live commentary should adapt to short screens');
assert.ok(css.includes('@media (max-width: 420px)'), 'live match should have a compact phone breakpoint');
assert.ok(css.includes('.tactics-layout {\n        height: auto;\n        flex-direction: column;'), 'tactics should stack on narrower screens');
assert.ok(css.includes('.bench-list {\n        max-height: 280px;'), 'bench list should remain scrollable on tablets');
assert.ok(css.includes('.pitch-container {\n        min-height: 390px;'), 'pitch should preserve a usable mobile touch area');
assert.ok(css.includes('min-height: 44px;'), 'mobile controls should meet a comfortable touch target');
assert.ok(css.includes('touch-action: manipulation;'), 'mobile controls should avoid delayed touch activation');
assert.ok(css.includes('border-width: 2px'), 'alerts should have a non-color visual distinction');
assert.ok(html.includes('overflow-x: auto'), 'wide tables should have local horizontal scrolling');
assert.ok(html.includes('historicoFinanceiroMensal'), 'monthly finance table should be present');
assert.ok(html.includes('skip-link'), 'page should provide a skip link');
assert.ok(html.includes('id="conteudo-principal"'), 'main content should have a keyboard target');
assert.ok(html.includes('aria-label="Navegação principal do clube"'), 'main navigation should be labelled');
assert.ok(html.includes('aria-live="polite"'), 'messages should announce updates to assistive technology');
assert.ok(html.includes('selecionarJogadorParaTatica(jogador)'), 'tactics should offer tap selection for players');
assert.ok(html.includes('colocarJogadorSelecionadoNoCampo()'), 'tactics should offer tap placement on the pitch');
assert.ok(html.includes('retirarJogadorSelecionadoDoCampo(jogador)'), 'tactics should offer tap removal from the pitch');
assert.ok(html.includes('pausarPartidaManualmente()'), 'live match should expose a manual tactical pause');
assert.ok(html.includes('obterResumoPausaTatica().restantes'), 'tactical pause should show remaining substitutions');
assert.ok(html.includes('obterResumoPausaTatica().impedidos'), 'tactical pause should show unavailable players');

console.log('responsive_layout.test.js passed');
