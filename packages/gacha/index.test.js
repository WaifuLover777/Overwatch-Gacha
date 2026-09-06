import test from 'node:test';
import assert from 'node:assert/strict';
import { MODES, MODE_LIST, ROLES, draw, getMode } from './index.js';

/** Synthetic roster: enough of every role to never hit the hero limit. */
const heroes = ROLES.flatMap((role) =>
  Array.from({ length: 15 }, (_, i) => ({ key: `${role}${i}`, name: `${role} ${i}`, role })),
);

const N = 500;
const names = (n) => Array.from({ length: n }, (_, i) => `p${i}`);

test('every mode satisfies the contract index expects', () => {
  for (const mode of MODE_LIST) {
    assert.equal(typeof mode.key, 'string');
    assert.equal(typeof mode.label, 'string');
    assert.equal(typeof mode.summary, 'string');
    assert.equal(typeof mode.rules, 'string');
    assert.ok(mode.maxPlayers >= 1);
    assert.equal(typeof mode.assignRoles, 'function');
    assert.equal(MODES[mode.key], mode);
    // assignRoles takes one slot per player and returns a real role for each.
    const roles = mode.assignRoles(Array(mode.maxPlayers).fill(null));
    assert.equal(roles.length, mode.maxPlayers);
    for (const r of roles) assert.ok(ROLES.includes(r));
  }
});

test('no hero is ever repeated, in any mode', () => {
  for (const mode of MODE_LIST) {
    for (let i = 0; i < N; i++) {
      const keys = draw(names(mode.maxPlayers), mode.key, heroes).map((p) => p.hero.key);
      assert.equal(new Set(keys).size, keys.length, `repeated hero in ${mode.key}`);
    }
  }
});

test('the hero always matches the assigned role', () => {
  for (const mode of MODE_LIST) {
    for (let i = 0; i < N; i++) {
      for (const p of draw(names(mode.maxPlayers), mode.key, heroes)) {
        assert.equal(p.hero.role, p.role);
      }
    }
  }
});

test('players keep their order and their name', () => {
  const picks = draw(['Ana', 'Luis', 'Bea'], 'role-queue', heroes);
  assert.deepEqual(picks.map((p) => p.player), ['Ana', 'Luis', 'Bea']);
});

test('a player can be a bare string or an object with a locked role', () => {
  for (let i = 0; i < N; i++) {
    const picks = draw(
      [{ name: 'Ana', role: 'tank' }, 'Luis', { name: 'Bea', role: 'support' }, 'Dani', 'Eva'],
      'role-queue',
      heroes,
    );
    assert.equal(picks[0].role, 'tank');
    assert.equal(picks[0].hero.role, 'tank');
    assert.equal(picks[2].role, 'support');
    assert.equal(picks[2].hero.role, 'support');
  }
});

test('picks report whether the role was locked or rolled', () => {
  const picks = draw([{ name: 'Ana', role: 'tank' }, 'Luis'], 'open', heroes);
  assert.equal(picks[0].locked, true);
  assert.equal(picks[1].locked, false);
});

test('an object with no role behaves like a bare name', () => {
  const picks = draw([{ name: 'Ana' }, { name: 'Luis', role: null }], 'open', heroes);
  assert.deepEqual(picks.map((p) => p.player), ['Ana', 'Luis']);
  assert.deepEqual(picks.map((p) => p.locked), [false, false]);
});

test('impossible locks bubble up from the mode', () => {
  assert.throws(
    () => draw([{ name: 'a', role: 'tank' }, { name: 'b', role: 'tank' }, 'c'], 'role-queue', heroes),
    /at most 1 Tank, but 2/,
  );
  assert.throws(
    () =>
      draw(
        [
          { name: 'a', role: 'tank' },
          { name: 'b', role: 'tank' },
          { name: 'c', role: 'tank' },
          'd',
        ],
        'open',
        heroes,
      ),
    /at most 2 Tanks, but 3/,
  );
});

test('blank names are dropped and the list is cut to the mode maximum', () => {
  const picks = draw(['  ', 'ana', '', 'luis', null, undefined, '  bea '], 'role-queue', heroes);
  assert.deepEqual(picks.map((p) => p.player), ['ana', 'luis', 'bea']);
  for (const mode of MODE_LIST) {
    assert.equal(draw(names(50), mode.key, heroes).length, mode.maxPlayers);
  }
});

test('a blank name drops its locked role with it', () => {
  // Two locked tanks, but one has no name: it must not count against the cap.
  const picks = draw(
    [{ name: '', role: 'tank' }, { name: 'Ana', role: 'tank' }, 'Luis', 'Bea', 'Dani', 'Eva'],
    'role-queue',
    heroes,
  );
  assert.deepEqual(picks.map((p) => p.player), ['Ana', 'Luis', 'Bea', 'Dani', 'Eva']);
  assert.equal(picks[0].role, 'tank');
});

test('the distribution is not degenerate', () => {
  const seen = new Set();
  for (let i = 0; i < N; i++) for (const p of draw(names(5), 'role-queue', heroes)) seen.add(p.hero.key);
  assert.ok(seen.size > 30, `only ${seen.size} distinct heroes came up`);
});

test('input errors', () => {
  assert.throws(() => draw([], 'role-queue', heroes), /at least one player/);
  assert.throws(() => draw(['  '], 'open', heroes), /at least one player/);
  assert.throws(() => draw(['a'], 'quickplay', heroes), /Unknown mode/);
  assert.throws(() => getMode('nope'), /Unknown mode/);

  const noTanks = heroes.filter((h) => h.role !== 'tank');
  assert.throws(() => draw(names(5), 'role-queue', noTanks), /Not enough tank heroes/);
});
