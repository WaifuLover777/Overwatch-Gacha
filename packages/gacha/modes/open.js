/**
 * Open Queue (6v6): at most 2 Tanks, Damage and Support uncapped.
 * Self-contained module — it knows nothing about Role Queue.
 */
import { ROLES, ROLE_LABELS, countPinned, findAssignments, normalizeAllowed, pick } from '../shared.js';

export const key = 'open';
export const label = 'Open Queue';
export const summary = '6 players · max 2 tanks';
export const rules =
  'At most 2 Tanks; Damage and Support are uncapped, and no duplicate heroes. ' +
  'The game sets no minimum on tanks, so a comp with 0 can come up. ' +
  'Mark the roles a player is willing to take and the roulette picks among them; ' +
  'mark none (the dice) and any role is fair game.';
export const maxPlayers = 6;
export const maxTanks = 2;

/**
 * Hard caps per role, the same shape Role Queue exposes, so the UI can explain
 * refusals without knowing either mode's rules. Damage and Support are uncapped;
 * maxPlayers is the honest ceiling, since a team cannot hold more than that.
 */
export const caps = { tank: maxTanks, damage: maxPlayers, support: maxPlayers };

const isValid = (counts) => counts.tank <= maxTanks;

/**
 * @param {(import('../shared.js').Role|import('../shared.js').Role[]|null)[]} allowed
 *   one entry per player: the roles they accept. Empty or null = any role.
 * @returns {import('../shared.js').Role[]} one role per player, same order
 */
export function assignRoles(allowed = []) {
  const sets = normalizeAllowed(allowed);

  // Checked first because it gives a far more useful message than "no solution".
  const pinned = countPinned(sets);
  for (const role of ROLES) {
    if (pinned[role] > caps[role]) {
      throw new Error(
        `Too many players locked to ${ROLE_LABELS[role]}: ` +
          `${pinned[role]} chosen, ${caps[role]} allowed in ${label}.`,
      );
    }
  }

  const options = findAssignments(sets, isValid);
  if (!options.length) {
    throw new Error(
      `Those role picks cannot make a legal ${label} team (at most ${maxTanks} Tanks).`,
    );
  }
  return pick(options);
}

/** Could these picks produce a legal team at all? Used to grey out buttons. */
export function canAssign(allowed = []) {
  const sets = normalizeAllowed(allowed);
  const pinned = countPinned(sets);
  if (ROLES.some((role) => pinned[role] > caps[role])) return false;
  return findAssignments(sets, isValid, 1).length > 0;
}
