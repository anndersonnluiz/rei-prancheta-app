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
assert.ok(html.includes('overflow-x: auto'), 'wide tables should have local horizontal scrolling');
assert.ok(html.includes('historicoFinanceiroMensal'), 'monthly finance table should be present');

console.log('responsive_layout.test.js passed');
