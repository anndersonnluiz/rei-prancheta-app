const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const testsDir = path.join(root, 'tests');
const tests = fs.readdirSync(testsDir)
  .filter((file) => file.endsWith('.test.js'))
  .sort();

let failed = 0;
for (const file of tests) {
  const result = spawnSync(process.execPath, [path.join(testsDir, file)], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit'
  });
  if (result.status !== 0) failed++;
}

console.log(`\nTestes: ${tests.length - failed} passaram, ${failed} falharam.`);
process.exitCode = failed ? 1 : 0;
