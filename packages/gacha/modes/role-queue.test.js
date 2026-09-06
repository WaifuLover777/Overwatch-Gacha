import test from 'node:test';
import assert from 'node:assert/strict';
import { assignRoles, maxPlayers } from './role-queue.js';

const N = 1000;
const tally = (roles) => {
  const c = { tank: 0, damage: 0, support: 0 };
  for (const r of roles) c[r]++;
  return c;
};

test('con 5 jugadores da exactamente 1 tank / 2 damage / 2 support', () => {
  for (let i = 0; i < N; i++) {
    assert.deepEqual(tally(assignRoles(5)), { tank: 1, damage: 2, support: 2 });
  }
});

test('reparte en orden de escasez: el tank cae siempre con 1..3 jugadores', () => {
  for (let n = 1; n <= 3; n++) {
    for (let i = 0; i < N; i++) {
      assert.equal(tally(assignRoles(n)).tank, 1, `${n} jugadores sin tank`);
    }
  }
});

test('la longitud sigue al número de jugadores y se corta en el máximo', () => {
  for (let n = 0; n <= 5; n++) assert.equal(assignRoles(n).length, n);
  assert.equal(assignRoles(50).length, maxPlayers);
  assert.equal(assignRoles(-3).length, 0);
});

test('el orden de los roles varía entre tiradas', () => {
  const vistos = new Set();
  for (let i = 0; i < N; i++) vistos.add(assignRoles(5).join('/'));
  assert.ok(vistos.size > 5, `solo ${vistos.size} órdenes distintos`);
});
