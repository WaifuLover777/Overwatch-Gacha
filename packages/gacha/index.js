/**
 * Mode registry and hero dealing.
 *
 * The seam is here: each module under modes/ decides WHICH roles come out (its
 * composition rules); `draw` only deals heroes without repeats. Adding a new
 * mode (Stadium, Mystery Heroes...) means one file in modes/ plus one line here.
 */
import { ROLES, shuffle } from './shared.js';
import * as roleQueue from './modes/role-queue.js';
import * as open from './modes/open.js';

export { ROLES, ROLE_LABELS } from './shared.js';

/** @typedef {typeof roleQueue | typeof open} Mode */

/** @type {Mode[]} */
export const MODE_LIST = [roleQueue, open];

export const MODES = Object.fromEntries(MODE_LIST.map((m) => [m.key, m]));

/** @param {string} key */
export function getMode(key) {
  const mode = MODES[key];
  if (!mode) throw new Error(`Unknown mode: ${key}`);
  return mode;
}

/**
 * A player is either a bare name or a name with a locked role.
 * Blank names are dropped; anything that is not a real role becomes "no preference".
 * @param {(string | {name?: string, role?: string|null})[]} players
 * @param {number} max
 * @returns {import('./shared.js').Entry[]}
 */
function normalizePlayers(players, max) {
  return (players ?? [])
    .map((p) => (typeof p === 'string' ? { name: p, role: null } : { name: p?.name, role: p?.role }))
    .map((e) => ({
      name: String(e.name ?? '').trim(),
      role: ROLES.includes(e.role) ? e.role : null,
    }))
    .filter((e) => e.name)
    .slice(0, max);
}

/**
 * Deals a different hero to each player, following the mode's rules.
 * Players who locked a role keep it; the rest are filled at random.
 *
 * @param {(string | {name?: string, role?: string|null})[]} players
 * @param {string} modeKey
 * @param {import('./shared.js').Hero[]} heroes full roster
 * @returns {import('./shared.js').Pick[]}
 */
export function draw(players, modeKey, heroes) {
  const mode = getMode(modeKey);

  const entries = normalizePlayers(players, mode.maxPlayers);
  if (entries.length === 0) throw new Error('Add at least one player.');

  const roles = mode.assignRoles(entries.map((e) => e.role));

  const pool = { tank: [], damage: [], support: [] };
  for (const h of heroes ?? []) if (pool[h?.role]) pool[h.role].push(h);

  for (const role of ROLES) {
    const need = roles.filter((r) => r === role).length;
    if (pool[role].length < need) {
      throw new Error(
        `Not enough ${role} heroes: ${pool[role].length} available, ${need} needed.`,
      );
    }
    // Shuffling and popping from the tail guarantees no hero repeats.
    pool[role] = shuffle(pool[role]);
  }

  return entries.map((entry, i) => ({
    player: entry.name,
    role: roles[i],
    hero: pool[roles[i]].pop(),
    locked: entry.role !== null,
  }));
}
