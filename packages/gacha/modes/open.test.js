import test from 'node:test';
import assert from 'node:assert/strict';
import { assignRoles, canAssign, maxPlayers, maxTanks } from './open.js';
import { ROLES, countBy } from '../shared.js';

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

test('a single accepted role is honoured, in its own slot', () => {
  for (let i = 0; i < N; i++) {
    const roles = assignRoles([null, 'tank', null, 'support', null, null]);
    assert.equal(roles[1], 'tank');
    assert.equal(roles[3], 'support');
    assert.ok(tanks(roles) <= maxTanks);
  }
});

test('a player never gets a role they did not accept', () => {
  const sets = [['tank', 'damage'], ['support'], null, ['damage', 'support'], ['tank'], null];
  for (let i = 0; i < N; i++) {
    const roles = assignRoles(sets);
    roles.forEach((role, i) => {
      const accepted = sets[i] ?? ROLES;
      assert.ok(accepted.includes(role), `player ${i} got ${role}, accepts ${accepted}`);
    });
    assert.ok(tanks(roles) <= maxTanks);
  }
});

test('accepting two roles really produces both over many draws', () => {
  const seen = new Set();
  for (let i = 0; i < N; i++) seen.add(assignRoles([['tank', 'damage'], null, null, null, null, null])[0]);
  assert.deepEqual([...seen].sort(), ['damage', 'tank']);
});

test('the tank cap still holds when everyone is willing to tank', () => {
  const willing = Array(6).fill(['tank', 'damage']);
  for (let i = 0; i < N; i++) assert.ok(tanks(assignRoles(willing)) <= maxTanks);
});

test('two pinned tanks leave no room for a third', () => {
  for (let i = 0; i < N; i++) {
    const roles = assignRoles(['tank', 'tank', null, null, null, null]);
    assert.equal(tanks(roles), maxTanks);
  }
});

test('three players pinned to tank is rejected by name', () => {
  assert.throws(
    () => assignRoles(['tank', 'tank', 'tank', null, null, null]),
    /locked to Tank: 3 chosen, 2 allowed/,
  );
});

test('pinning every slot returns exactly what was asked', () => {
  const pinned = ['damage', 'damage', 'support', 'support', 'support', 'tank'];
  assert.deepEqual(assignRoles(pinned), pinned);
});

test('junk in the accepted list is treated as no preference', () => {
  for (let i = 0; i < 200; i++) {
    const roles = assignRoles(['healer', undefined, '', 0, null, ['dps']]);
    assert.equal(roles.length, 6);
    assert.ok(tanks(roles) <= maxTanks);
  }
});

test('canAssign agrees with assignRoles, always', () => {
  const roleOptions = [null, ['tank'], ['damage'], ['support'], ['tank', 'support'], ['tank', 'damage']];
  for (let i = 0; i < 400; i++) {
    const sets = Array.from(
      { length: 6 },
      () => roleOptions[Math.floor(Math.random() * roleOptions.length)],
    );
    if (canAssign(sets)) {
      assert.doesNotThrow(() => assignRoles(sets), `canAssign said yes for ${JSON.stringify(sets)}`);
    } else {
      assert.throws(() => assignRoles(sets), `canAssign said no for ${JSON.stringify(sets)}`);
    }
  }
});
