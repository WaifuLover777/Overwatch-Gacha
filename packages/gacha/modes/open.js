/**
 * Open Queue (6v6): máximo 2 Tanks, Damage y Support sin límite.
 * Módulo autónomo — no sabe nada de Role Queue.
 */
import { ROLES, pick, shuffle } from '../shared.js';

export const key = 'open';
export const label = 'Open Queue';
export const summary = '6 jugadores · máx. 2 tanks';
export const rules =
  'Máximo 2 Tanks; Damage y Support sin límite, y sin héroes repetidos. ' +
  'El juego no exige un mínimo de tanks, así que puede salir una comp con 0.';
export const maxPlayers = 6;
export const maxTanks = 2;

/**
 * @param {number} playerCount
 * @returns {import('../shared.js').Role[]}
 */
export function assignRoles(playerCount) {
  const n = Math.min(Math.max(0, playerCount), maxPlayers);
  const roles = [];
  let tanks = 0;
  for (let i = 0; i < n; i++) {
    const allowed = tanks < maxTanks ? ROLES : ROLES.filter((r) => r !== 'tank');
    const role = pick(allowed);
    if (role === 'tank') tanks++;
    roles.push(role);
  }
  // Los primeros huecos tienen más probabilidad de tank; barajar iguala a los jugadores.
  return shuffle(roles);
}
