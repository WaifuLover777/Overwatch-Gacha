import test from 'node:test';
import assert from 'node:assert/strict';
import { assignRoles, caps, maxPlayers } from './role-queue.js';
import { countBy } from '../shared.js';

const N = 1000;
const free = (n) => Array(n).fill(null);

test('5 players give exactly 1 tank / 2 damage / 2 support', () => {
  for (let i = 0; i < N; i++) {
    assert.deepEqual(countBy(assignRoles(free(5))), { tank: 1, damage: 2, support: 2 });
  }
});

test('scarcity order: the tank always lands with 1..3 players', () => {
  for (let n = 1; n <= 3; n++) {
    for (let i = 0; i < N; i++) {
      assert.equal(countBy(assignRoles(free(n))).tank, 1, `${n} players without a tank`);
    }
  }
});

test('length follows the player count', () => {
  for (let n = 0; n <= 5; n++) assert.equal(assignRoles(free(n)).length, n);
});

test('a locked role is always honoured, in its own slot', () => {
  for (let i = 0; i < N; i++) {
    const roles = assignRoles(['support', null, 'tank', null, null]);
    assert.equal(roles[0], 'support');
    assert.equal(roles[2], 'tank');
    assert.deepEqual(countBy(roles), { tank: 1, damage: 2, support: 2 });
  }
});

test('locks never break the 1-2-2 composition', () => {
  const cases = [
    ['tank', null, null, null, null],
    [null, 'damage', 'damage', null, null],
    ['support', 'support', null, null, null],
    ['tank', 'damage', 'support', 'damage', 'support'],
  ];
  for (const locked of cases) {
    for (let i = 0; i < 200; i++) {
      assert.deepEqual(countBy(assignRoles(locked)), { tank: 1, damage: 2, support: 2 }, String(locked));
    }
  }
});

test('locks over a cap are rejected with a useful message', () => {
  assert.throws(() => assignRoles(['tank', 'tank', null, null, null]), /at most 1 Tank, but 2/);
  assert.throws(() => assignRoles(['damage', 'damage', 'damage', null, null]), /at most 2 Damage, but 3/);
  assert.throws(() => assignRoles(['support', 'support', 'support', null, null]), /at most 2 Support, but 3/);
});

test('garbage in the locked list is treated as no preference', () => {
  for (let i = 0; i < 200; i++) {
    assert.deepEqual(
      countBy(assignRoles(['healer', undefined, '', 0, null])),
      { tank: 1, damage: 2, support: 2 },
    );
  }
});

test('caps add up to maxPlayers, which is what makes the comp exact', () => {
  assert.equal(Object.values(caps).reduce((a, b) => a + b, 0), maxPlayers);
});

test('role order varies between draws', () => {
  const seen = new Set();
  for (let i = 0; i < N; i++) seen.add(assignRoles(free(5)).join('/'));
  assert.ok(seen.size > 5, `only ${seen.size} distinct orders`);
});
