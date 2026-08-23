const fs = require('fs');
const assert = require('assert');

const app = fs.readFileSync('js/app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const expectedRoles = [
  'Goleiro clássico', 'Goleiro-líbero', 'Lateral apoiador',
  'Lateral defensivo', 'Zagueiro construtor', 'Zagueiro marcador',
  'Volante marcador', 'Volante construtor', 'Meia criativo',
  'Meia de chegada', 'Atacante móvel', 'Homem de área'
];

expectedRoles.forEach(role => assert.ok(app.includes(role), `função tática ausente: ${role}`));
assert.ok(app.includes("jogador.funcaoTatica = 'Automática'"));
assert.ok(app.includes('$scope.obterImpactoFuncaoTatica'));
assert.ok(app.includes('$scope.obterPerfilFuncoesTaticas'));
assert.ok(app.includes('$scope.obterSugestaoSubstituicao'));
assert.ok(app.includes('$scope.aplicarSugestaoSubstituicao'));
assert.ok(html.includes('obterFuncoesTaticasJogador(jogador)'));
assert.ok(html.includes('tactical-role-select'));
assert.ok(html.includes('selected-player-role'));
assert.ok(html.includes('$event.stopPropagation()'));
assert.ok(html.includes('Aplicar sugestão'));

console.log('tactics_roles.test.js passed');
