import test from 'node:test';
import assert from 'node:assert/strict';
import { assignRoles, maxPlayers, maxTanks } from './open.js';
import { countBy } from '../shared.js';

const N = 1000;
const free = (n) => Array(n).fill(null);
const tanks = (roles) => countBy(roles).tank;

test('never more than 2 tanks, at any player count', () => {
  for (let n = 1; n <= maxPlayers; n++) {
    for (let i = 0; i < N; i++) {
      assert.ok(tanks(assignRoles(free(n))) <= maxTanks, `${n} players produced too many tanks`);
    }
  }
});

test('damage and support are uncapped: all 6 of one role do come up', () => {
  const seen = new Set();
  for (let i = 0; i < 20000; i++) {
    const roles = assignRoles(free(6));
    for (const r of ['damage', 'support']) if (roles.every((x) => x === r)) seen.add(r);
  }
  assert.deepEqual([...seen].sort(), ['damage', 'support']);
});

test('comps with 0, 1 and 2 tanks all appear', () => {
  const seen = new Set();
  for (let i = 0; i < N; i++) seen.add(tanks(assignRoles(free(6))));
  assert.deepEqual([...seen].sort(), [0, 1, 2]);
});

test('length follows the player count', () => {
  for (let n = 0; n <= 6; n++) assert.equal(assignRoles(free(n)).length, n);
});

test('a locked role is always honoured, in its own slot', () => {
  for (let i = 0; i < N; i++) {
    const roles = assignRoles([null, 'tank', null, 'support', null, null]);
    assert.equal(roles[1], 'tank');
    assert.equal(roles[3], 'support');
    assert.ok(tanks(roles) <= maxTanks);
  }
});

test('two locked tanks leave no room for a third', () => {
  for (let i = 0; i < N; i++) {
    const roles = assignRoles(['tank', 'tank', null, null, null, null]);
    assert.equal(tanks(roles), maxTanks);
  }
});

test('three locked tanks are rejected with a useful message', () => {
  assert.throws(() => assignRoles(['tank', 'tank', 'tank', null, null, null]), /at most 2 Tanks, but 3/);
});

test('locking every slot returns exactly what was asked', () => {
  const locked = ['damage', 'damage', 'support', 'support', 'support', 'tank'];
  assert.deepEqual(assignRoles(locked), locked);
});

test('garbage in the locked list is treated as no preference', () => {
  for (let i = 0; i < 200; i++) {
    const roles = assignRoles(['healer', undefined, '', 0, null, 'dps']);
    assert.equal(roles.length, 6);
    assert.ok(tanks(roles) <= maxTanks);
  }
});
