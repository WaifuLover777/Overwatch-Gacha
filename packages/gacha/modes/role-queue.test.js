import test from 'node:test';
import assert from 'node:assert/strict';
import { assignRoles, canAssign, caps, maxPlayers } from './role-queue.js';
import { ROLES, countBy } from '../shared.js';

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

test('a single accepted role is honoured, in its own slot', () => {
  for (let i = 0; i < N; i++) {
    const roles = assignRoles(['support', null, 'tank', null, null]);
    assert.equal(roles[0], 'support');
    assert.equal(roles[2], 'tank');
    assert.deepEqual(countBy(roles), { tank: 1, damage: 2, support: 2 });
  }
});

test('a player never gets a role they did not accept', () => {
  const sets = [['tank', 'support'], ['damage'], ['damage', 'support'], null, ['support', 'tank']];
  for (let i = 0; i < N; i++) {
    const roles = assignRoles(sets);
    roles.forEach((role, i) => {
      const accepted = sets[i] ?? ROLES;
      assert.ok(accepted.includes(role), `player ${i} got ${role}, accepts ${accepted}`);
    });
    assert.deepEqual(countBy(roles), { tank: 1, damage: 2, support: 2 });
  }
});

test('accepting two roles really produces both over many draws', () => {
  const seen = new Set();
  for (let i = 0; i < N; i++) seen.add(assignRoles([['tank', 'support'], null, null, null, null])[0]);
  assert.deepEqual([...seen].sort(), ['support', 'tank']);
});

test('accepting all three is the same as accepting none', () => {
  for (let i = 0; i < 200; i++) {
    const roles = assignRoles([[...ROLES], [...ROLES], [...ROLES], [...ROLES], [...ROLES]]);
    assert.deepEqual(countBy(roles), { tank: 1, damage: 2, support: 2 });
  }
});

test('composition holds whatever the accepted sets look like', () => {
  const cases = [
    ['tank', null, null, null, null],
    [null, 'damage', 'damage', null, null],
    [['support', 'damage'], ['support', 'damage'], null, null, null],
    [['tank', 'damage'], ['tank', 'support'], ['damage', 'support'], null, null],
    ['tank', 'damage', 'support', 'damage', 'support'],
  ];
  for (const sets of cases) {
    for (let i = 0; i < 200; i++) {
      assert.deepEqual(countBy(assignRoles(sets)), { tank: 1, damage: 2, support: 2 }, String(sets));
    }
  }
});

test('too many players pinned to one role is rejected by name', () => {
  assert.throws(() => assignRoles(['tank', 'tank', null, null, null]), /locked to Tank: 2 chosen, 1 allowed/);
  assert.throws(() => assignRoles(['damage', 'damage', 'damage', null, null]), /locked to Damage: 3 chosen, 2 allowed/);
  assert.throws(() => assignRoles(['support', 'support', 'support', null, null]), /locked to Support: 3 chosen, 2 allowed/);
});

test('flexible sets that still cannot fill the comp are rejected', () => {
  // Nobody will tank, so 1 Tank can never be met.
  const noTanks = Array(5).fill(['damage', 'support']);
  assert.throws(() => assignRoles(noTanks), /cannot fill Role Queue's 1 Tank \/ 2 Damage \/ 2 Support/);
});

test('junk in the accepted list is treated as no preference', () => {
  for (let i = 0; i < 200; i++) {
    assert.deepEqual(countBy(assignRoles(['healer', undefined, '', 0, null])), {
      tank: 1,
      damage: 2,
      support: 2,
    });
    assert.deepEqual(countBy(assignRoles([['healer', 'dps'], [], null, null, null])), {
      tank: 1,
      damage: 2,
      support: 2,
    });
  }
});

test('canAssign agrees with assignRoles, always', () => {
  const roleOptions = [null, ['tank'], ['damage'], ['support'], ['tank', 'damage'], ['damage', 'support']];
  for (let i = 0; i < 400; i++) {
    const sets = Array.from(
      { length: 5 },
      () => roleOptions[Math.floor(Math.random() * roleOptions.length)],
    );
    const possible = canAssign(sets);
    if (possible) {
      assert.doesNotThrow(() => assignRoles(sets), `canAssign said yes for ${JSON.stringify(sets)}`);
    } else {
      assert.throws(() => assignRoles(sets), `canAssign said no for ${JSON.stringify(sets)}`);
    }
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
