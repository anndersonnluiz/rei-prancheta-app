const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('js/app.js', 'utf8');

assert.ok(app.includes("ch.metodoDesempate = 'penaltis'"), 'Copa do Brasil should record penalty shootout tiebreaker');
assert.ok(app.includes('ch.placarPenaltis'), 'Copa do Brasil should persist penalty score');
assert.ok(app.includes('Copa do Brasil decidida nos pênaltis'), 'player should receive an explicit penalty shootout message');
assert.ok(app.includes('var agg1 = ch.golsIda1 + ch.golsVolta1'), 'knockout should compare the two-leg aggregate');

console.log('cup_tiebreaker.test.js passed');
