/**
 * Pieces shared by every mode.
 * Composition rules do NOT live here: each mode declares its own in modes/.
 *
 * @typedef {'tank'|'damage'|'support'} Role
 * @typedef {{key: string, name: string, role: Role}} Hero
 * @typedef {{name: string, role: Role|null}} Entry a player, with an optional locked role
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

/** Anything that is not a real role becomes null (= no preference). */
export const normalizeLocked = (locked) =>
  (locked ?? []).map((r) => (ROLES.includes(r) ? r : null));

export const countBy = (roles) => {
  const c = { tank: 0, damage: 0, support: 0 };
  for (const r of roles) if (r) c[r]++;
  return c;
};
