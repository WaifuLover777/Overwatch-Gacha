/**
 * Role Queue (5v5): composición fija 1 Tank / 2 Damage / 2 Support.
 * Módulo autónomo — no sabe nada de Open Queue.
 */
import { shuffle } from '../shared.js';

export const key = 'role-queue';
export const label = 'Role Queue';
export const summary = '5 jugadores · 1 tank / 2 dmg / 2 sup';
export const rules =
  'Composición fija: 1 Tank, 2 Damage y 2 Support. Sin héroes repetidos.';
export const maxPlayers = 5;

/** En orden de escasez: con menos de 5 jugadores se garantiza el tank primero. */
const COMPOSITION = ['tank', 'damage', 'support', 'damage', 'support'];

/**
 * @param {number} playerCount
 * @returns {import('../shared.js').Role[]}
 */
export function assignRoles(playerCount) {
  return shuffle(COMPOSITION.slice(0, Math.max(0, playerCount)));
}
