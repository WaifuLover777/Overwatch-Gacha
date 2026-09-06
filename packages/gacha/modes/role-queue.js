/**
 * Role Queue (5v5): fixed composition of 1 Tank / 2 Damage / 2 Support.
 * Self-contained module — it knows nothing about Open Queue.
 */
import { ROLES, ROLE_LABELS, countBy, normalizeLocked, shuffle } from '../shared.js';

export const key = 'role-queue';
export const label = 'Role Queue';
export const summary = '5 players · 1 tank / 2 dmg / 2 sup';
export const rules =
  'Fixed composition: 1 Tank, 2 Damage and 2 Support. No duplicate heroes. ' +
  'Lock a role on a player to force it; leave it unset and the roulette decides.';
export const maxPlayers = 5;

/**
 * Hard caps per role. They add up to maxPlayers, which is what makes 1-2-2 exact.
 * The UI reads this to grey out buttons without knowing the rules itself.
 */
export const caps = { tank: 1, damage: 2, support: 2 };

/** Scarcity order: with fewer than 5 players the tank is filled first. */
const PRIORITY = ['tank', 'damage', 'support', 'damage', 'support'];

/**
 * @param {(import('../shared.js').Role|null)[]} locked one entry per player; null = random
 * @returns {import('../shared.js').Role[]} one role per player, same order
 */
export function assignRoles(locked = []) {
  const slots = normalizeLocked(locked);
  const used = countBy(slots);

  for (const role of ROLES) {
    if (used[role] > caps[role]) {
      throw new Error(
        `Role Queue allows at most ${caps[role]} ${ROLE_LABELS[role]}, but ${used[role]} were locked.`,
      );
    }
  }

  // Fill the open slots in scarcity order, never going over a cap.
  const need = slots.filter((r) => !r).length;
  const free = [];
  for (const role of PRIORITY) {
    if (free.length === need) break;
    if (used[role] < caps[role]) {
      used[role]++;
      free.push(role);
    }
  }
  if (free.length < need) {
    throw new Error(`Role Queue only fits ${maxPlayers} players.`);
  }

  const bag = shuffle(free);
  return slots.map((r) => r ?? bag.pop());
}
