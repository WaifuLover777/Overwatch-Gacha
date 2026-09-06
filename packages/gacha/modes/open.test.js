import test from 'node:test';
import assert from 'node:assert/strict';
import { assignRoles, maxPlayers, maxTanks } from './open.js';

const N = 1000;
const tanks = (roles) => roles.filter((r) => r === 'tank').length;

test('nunca pasa de 2 tanks, con cualquier número de jugadores', () => {
  for (let n = 1; n <= maxPlayers; n++) {
    for (let i = 0; i < N; i++) {
      assert.ok(tanks(assignRoles(n)) <= maxTanks, `${n} jugadores dieron más de ${maxTanks} tanks`);
    }
  }
});

test('damage y support no tienen tope: se llegan a ver 6 del mismo rol', () => {
  const llenos = new Set();
  for (let i = 0; i < 20000; i++) {
    const roles = assignRoles(6);
    for (const r of ['damage', 'support']) {
      if (roles.every((x) => x === r)) llenos.add(r);
    }
  }
  assert.deepEqual([...llenos].sort(), ['damage', 'support']);
});

test('salen composiciones con 0, 1 y 2 tanks', () => {
  const vistos = new Set();
  for (let i = 0; i < N; i++) vistos.add(tanks(assignRoles(6)));
  assert.deepEqual([...vistos].sort(), [0, 1, 2]);
});

test('la longitud sigue al número de jugadores y se corta en el máximo', () => {
  for (let n = 0; n <= 6; n++) assert.equal(assignRoles(n).length, n);
  assert.equal(assignRoles(50).length, maxPlayers);
  assert.equal(assignRoles(-3).length, 0);
});
