/**
 * Pieces shared by every mode.
 * Composition rules do NOT live here: each mode declares its own in modes/.
 *
 * @typedef {'tank'|'damage'|'support'} Role
 * @typedef {{key: string, name: string, role: Role}} Hero
 * @typedef {{name: string, roles: Role[]}} Entry a player and the roles they accept
 * @typedef {{player: string, role: Role, hero: Hero, locked: boolean}} Pick
 */

/** @type {Role[]} */
export const ROLES = ['tank', 'damage', 'support'];

export const ROLE_LABELS = { tank: 'Tank', damage: 'Damage', support: 'Support' };

/** Fisher-Yates on a copy. */
export function shuffle(xs) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];

export const countBy = (roles) => {
  const c = { tank: 0, damage: 0, support: 0 };
  for (const r of roles) if (r) c[r]++;
  return c;
};

/**
 * One accepted-role set per player. A player may accept 1, 2 or all 3 roles;
 * accepting none is the same as accepting all, which is what "random" means.
 * Tolerant on purpose: a bare role string, null, or junk all normalize cleanly.
 *
 * @param {(Role | Role[] | null | undefined)[]} allowed
 * @returns {Role[][]}
 */
export const normalizeAllowed = (allowed) =>
  (allowed ?? []).map((entry) => {
    const list = Array.isArray(entry) ? entry : entry == null ? [] : [entry];
    const clean = [...new Set(list.filter((r) => ROLES.includes(r)))];
    return clean.length ? clean : [...ROLES];
  });

/** Players who accept exactly one role, per role — the ones truly pinned. */
export const countPinned = (sets) => {
  const c = { tank: 0, damage: 0, support: 0 };
  for (const s of sets) if (s.length === 1) c[s[0]]++;
  return c;
};

/**
 * Every role assignment where player i takes a role from sets[i] and the whole
 * team satisfies `isValid`.
 *
 * Brute force over the cartesian product. With at most 6 players and 3 roles
 * that is 729 tuples, so it is instant, and unlike a greedy fill it is uniform
 * over legal teams and never paints itself into a corner.
 * ponytail: exhaustive. If maxPlayers ever passes ~12, switch to backtracking
 * with pruning on the running counts.
 *
 * @param {Role[][]} sets
 * @param {(counts: Record<Role, number>) => boolean} isValid
 * @param {number} limit stop after this many solutions (1 = "is it possible?")
 * @returns {Role[][]}
 */
export function findAssignments(sets, isValid, limit = Infinity) {
  const found = [];
  const current = [];

  const walk = (i) => {
    if (found.length >= limit) return;
    if (i === sets.length) {
      if (isValid(countBy(current))) found.push([...current]);
      return;
    }
    for (const role of sets[i]) {
      current.push(role);
      walk(i + 1);
      current.pop();
      if (found.length >= limit) return;
    }
  };

  walk(0);
  return found;
}
