/**
 * Open Queue (6v6): at most 2 Tanks, Damage and Support uncapped.
 * Self-contained module — it knows nothing about Role Queue.
 */
import { ROLES, countBy, normalizeLocked, pick, shuffle } from '../shared.js';

export const key = 'open';
export const label = 'Open Queue';
export const summary = '6 players · max 2 tanks';
export const rules =
  'At most 2 Tanks; Damage and Support are uncapped, and no duplicate heroes. ' +
  'The game sets no minimum on tanks, so a comp with 0 can come up. ' +
  'Lock a role on a player to force it; leave it unset and the roulette decides.';
export const maxPlayers = 6;
export const maxTanks = 2;

/**
 * Hard caps per role, the same shape Role Queue exposes, so the UI can grey out
 * buttons without knowing either mode's rules. Damage and Support are uncapped;
 * maxPlayers is the honest ceiling, since a team cannot hold more than that.
 */
export const caps = { tank: maxTanks, damage: maxPlayers, support: maxPlayers };

/**
 * @param {(import('../shared.js').Role|null)[]} locked one entry per player; null = random
 * @returns {import('../shared.js').Role[]} one role per player, same order
 */
export function assignRoles(locked = []) {
  const slots = normalizeLocked(locked);
  let tanks = countBy(slots).tank;

  if (tanks > maxTanks) {
    throw new Error(`Open Queue allows at most ${maxTanks} Tanks, but ${tanks} were locked.`);
  }

  const need = slots.filter((r) => !r).length;
  const free = [];
  for (let i = 0; i < need; i++) {
    const allowed = tanks < maxTanks ? ROLES : ROLES.filter((r) => r !== 'tank');
    const role = pick(allowed);
    if (role === 'tank') tanks++;
    free.push(role);
  }

  // Earlier draws are likelier to be tanks; shuffling levels it across players.
  const bag = shuffle(free);
  return slots.map((r) => r ?? bag.pop());
}
