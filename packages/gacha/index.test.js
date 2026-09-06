import test from 'node:test';
import assert from 'node:assert/strict';
import { MODES, MODE_LIST, ROLES, draw, getMode } from './index.js';

/** Roster sintético: suficiente de cada rol para no chocar con el hero limit. */
const heroes = ROLES.flatMap((role) =>
  Array.from({ length: 15 }, (_, i) => ({ key: `${role}${i}`, name: `${role} ${i}`, role })),
);

const N = 500;
const names = (n) => Array.from({ length: n }, (_, i) => `p${i}`);

test('cada modo cumple el contrato que index espera', () => {
  for (const mode of MODE_LIST) {
    assert.equal(typeof mode.key, 'string');
    assert.equal(typeof mode.label, 'string');
    assert.equal(typeof mode.summary, 'string');
    assert.equal(typeof mode.rules, 'string');
    assert.ok(mode.maxPlayers >= 1);
    assert.equal(typeof mode.assignRoles, 'function');
    assert.equal(MODES[mode.key], mode);
    // Los roles que devuelve tienen que ser roles de verdad.
    for (const r of mode.assignRoles(mode.maxPlayers)) assert.ok(ROLES.includes(r));
  }
});

test('nunca se repite un héroe, en ningún modo', () => {
  for (const mode of MODE_LIST) {
    for (let i = 0; i < N; i++) {
      const keys = draw(names(mode.maxPlayers), mode.key, heroes).map((p) => p.hero.key);
      assert.equal(new Set(keys).size, keys.length, `héroe repetido en ${mode.key}`);
    }
  }
});

test('el héroe siempre corresponde al rol asignado', () => {
  for (const mode of MODE_LIST) {
    for (let i = 0; i < N; i++) {
      for (const p of draw(names(mode.maxPlayers), mode.key, heroes)) {
        assert.equal(p.hero.role, p.role);
      }
    }
  }
});

test('los jugadores salen en su orden y con su nombre', () => {
  const picks = draw(['Ana', 'Luis', 'Bea'], 'role-queue', heroes);
  assert.deepEqual(
    picks.map((p) => p.player),
    ['Ana', 'Luis', 'Bea'],
  );
});

test('descarta nombres vacíos y recorta al máximo de cada modo', () => {
  const picks = draw(['  ', 'ana', '', 'luis', null, undefined, '  bea '], 'role-queue', heroes);
  assert.deepEqual(
    picks.map((p) => p.player),
    ['ana', 'luis', 'bea'],
  );
  for (const mode of MODE_LIST) {
    assert.equal(draw(names(50), mode.key, heroes).length, mode.maxPlayers);
  }
});

test('la distribución no es degenerada', () => {
  const vistos = new Set();
  for (let i = 0; i < N; i++) for (const p of draw(names(5), 'role-queue', heroes)) vistos.add(p.hero.key);
  assert.ok(vistos.size > 30, `solo salieron ${vistos.size} héroes distintos`);
});

test('errores de entrada', () => {
  assert.throws(() => draw([], 'role-queue', heroes), /al menos un jugador/);
  assert.throws(() => draw(['  '], 'open', heroes), /al menos un jugador/);
  assert.throws(() => draw(['a'], 'quickplay', heroes), /Modo desconocido/);
  assert.throws(() => getMode('nope'), /Modo desconocido/);

  const sinTanks = heroes.filter((h) => h.role !== 'tank');
  assert.throws(() => draw(names(5), 'role-queue', sinTanks), /Faltan héroes de rol tank/);
});
