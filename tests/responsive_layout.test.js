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
assert.ok(html.includes('overflow-x: auto'), 'wide tables should have local horizontal scrolling');
assert.ok(html.includes('historicoFinanceiroMensal'), 'monthly finance table should be present');
assert.ok(html.includes('skip-link'), 'page should provide a skip link');
assert.ok(html.includes('id="conteudo-principal"'), 'main content should have a keyboard target');

console.log('responsive_layout.test.js passed');
