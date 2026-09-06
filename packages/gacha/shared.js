/**
 * Piezas comunes a todos los modos.
 * Las reglas de composición NO viven aquí: cada modo las define en modes/.
 *
 * @typedef {'tank'|'damage'|'support'} Role
 * @typedef {{key: string, name: string, role: Role}} Hero
 * @typedef {{player: string, role: Role, hero: Hero}} Pick
 */

/** @type {Role[]} */
export const ROLES = ['tank', 'damage', 'support'];

export const ROLE_LABELS = { tank: 'Tank', damage: 'Damage', support: 'Support' };

/** Fisher-Yates sobre una copia. */
export function shuffle(xs) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];
