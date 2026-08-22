const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const clubes = JSON.parse(fs.readFileSync(path.join(root, 'data', 'clubes.json'), 'utf8'));
const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const mapping = {};
const pattern = /'([^']+)': \['([^']+)', '([^']+)'\]/g;
let match;
while ((match = pattern.exec(app))) mapping[match[1]] = [match[2], match[3]];

assert.strictEqual(Object.keys(mapping).length, clubes.length, 'every club should have one logo mapping');
clubes.forEach((clube) => {
  assert.ok(mapping[clube.nome], `${clube.nome} should have a logo mapping`);
  const logoPath = path.join(root, 'assets', 'clubes', mapping[clube.nome][0], mapping[clube.nome][1]);
  assert.ok(fs.existsSync(logoPath), `${clube.nome} logo should exist at ${logoPath}`);
});

console.log('club_logos.test.js passed');
