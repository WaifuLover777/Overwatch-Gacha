/**
 * Role Queue (5v5): fixed composition of 1 Tank / 2 Damage / 2 Support.
 * Self-contained module — it knows nothing about Open Queue.
 */
import {
  ROLES,
  ROLE_LABELS,
  countBy,
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
 * Hard caps per role. They add up to maxPlayers, which is what makes 1-2-2 exact.
 * The UI reads this to explain refusals without knowing the rules itself.
 */
export const caps = { tank: 1, damage: 2, support: 2 };

/** Scarcity order: with fewer than 5 players the tank is filled first. */
const PRIORITY = ['tank', 'damage', 'support', 'damage', 'support'];

/** The exact composition owed to `n` players. At n = 5 this is 1 / 2 / 2. */
const target = (n) => countBy(PRIORITY.slice(0, n));

const describe = (counts) =>
  ROLES.filter((r) => counts[r] > 0)
    .map((r) => `${counts[r]} ${ROLE_LABELS[r]}`)
    .join(' / ');

const isValid = (counts, n) => {
  const want = target(n);
  return ROLES.every((r) => counts[r] === want[r]);
};

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

  const options = findAssignments(sets, (c) => isValid(c, sets.length));
  if (!options.length) {
    throw new Error(
      `Those role picks cannot fill ${label}'s ${describe(target(sets.length))}.`,
    );
  }
  return pick(options);
}

/** Could these picks produce a legal team at all? Used to grey out buttons. */
export function canAssign(allowed = []) {
  const sets = normalizeAllowed(allowed);
  const pinned = countPinned(sets);
  if (ROLES.some((role) => pinned[role] > caps[role])) return false;
  return findAssignments(sets, (c) => isValid(c, sets.length), 1).length > 0;
}
