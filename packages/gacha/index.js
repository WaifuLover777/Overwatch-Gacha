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
 * A player is a bare name, or a name with the roles they accept. `roles` may
 * hold 1, 2 or all 3; empty or absent means any role, which is the random case.
 * `role` (singular) is still accepted as shorthand for a single-role list.
 * Blank names are dropped.
 *
 * @param {(string | {name?: string, role?: string|null, roles?: string[]})[]} players
 * @param {number} max
 * @returns {import('./shared.js').Entry[]}
 */
function normalizePlayers(players, max) {
  return (players ?? [])
    .map((p) => (typeof p === 'string' ? { name: p } : p ?? {}))
    .map((p) => {
      const list = Array.isArray(p.roles) ? p.roles : p.role != null ? [p.role] : [];
      return {
        name: String(p.name ?? '').trim(),
        roles: [...new Set(list.filter((r) => ROLES.includes(r)))],
      };
    })
    .filter((e) => e.name)
    .slice(0, max);
}

/**
 * Deals a different hero to each player, following the mode's rules.
 * Each player gets one of the roles they accept; the mode decides which.
 *
 * @param {(string | {name?: string, role?: string|null, roles?: string[]})[]} players
 * @param {string} modeKey
 * @param {import('./shared.js').Hero[]} heroes full roster
 * @returns {import('./shared.js').Pick[]}
 */
export function draw(players, modeKey, heroes) {
  const mode = getMode(modeKey);

  const entries = normalizePlayers(players, mode.maxPlayers);
  if (entries.length === 0) throw new Error('Add at least one player.');

  const roles = mode.assignRoles(entries.map((e) => e.roles));

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
    // Only a single accepted role is a real lock. With 2 the roulette still chose.
    locked: entry.roles.length === 1,
  }));
}

/**
 * Could these accepted-role sets produce a legal team? The UI asks before
 * offering a button, so an impossible pick is never clickable.
 *
 * @param {(string | string[] | null)[]} allowed one entry per player
 * @param {string} modeKey
 */
export const canAssign = (allowed, modeKey) => getMode(modeKey).canAssign(allowed);
