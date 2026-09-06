/**
 * Role Queue (5v5): fixed composition of 1 Tank / 2 Damage / 2 Support.
 * Self-contained module — it knows nothing about Open Queue.
 */
import {
  ROLES,
  ROLE_LABELS,
  countPinned,
  findAssignments,
  normalizeAllowed,
  pick,
} from '../shared.js';

export const key = 'role-queue';
export const label = 'Role Queue';
export const summary = '5 players · 1 tank / 2 dmg / 2 sup';
export const rules =
  'Fixed composition: 1 Tank, 2 Damage and 2 Support. No duplicate heroes. ' +
  'Mark the roles a player is willing to take and the roulette picks among them; ' +
  'mark none (the dice) and any role is fair game.';
export const maxPlayers = 5;

/**
 * Hard caps per role, and the only rule this mode has.
 *
 * They add up to maxPlayers, so a full team of 5 can only be 1 / 2 / 2 — the
 * exact composition falls out of the caps instead of being imposed on top.
 * That matters below 5: a trio is free to roll 2 Damage and a Support with no
 * tank, exactly as they could pick in game. An earlier version forced a
 * "tank first" order here, which made every short roster deterministic (one
 * player was always the tank, two were always tank + damage).
 */
export const caps = { tank: 1, damage: 2, support: 2 };

const describeCaps = () =>
  ROLES.map((r) => `${caps[r]} ${ROLE_LABELS[r]}`).join(', ');

const isValid = (counts) => ROLES.every((r) => counts[r] <= caps[r]);

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
      `Those role picks cannot make a legal ${label} team (at most ${describeCaps()}).`,
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
