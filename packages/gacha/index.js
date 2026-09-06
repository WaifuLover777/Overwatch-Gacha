/**
 * Registro de modos y reparto de héroes.
 *
 * El seam es este: cada módulo de modes/ decide QUÉ roles salen (sus reglas de
 * composición); `draw` solo reparte héroes sin repetir. Añadir un modo nuevo
 * (Stadium, Mystery Heroes...) es crear un archivo en modes/ y registrarlo aquí.
 */
import { ROLES, shuffle } from './shared.js';
import * as roleQueue from './modes/role-queue.js';
import * as open from './modes/open.js';

export { ROLES, ROLE_LABELS } from './shared.js';

/** @typedef {typeof roleQueue | typeof open} Mode */

/** @type {Mode[]} */
export const MODE_LIST = [roleQueue, open];

export const MODES = Object.fromEntries(MODE_LIST.map((m) => [m.key, m]));

/** @param {string} key */
export function getMode(key) {
  const mode = MODES[key];
  if (!mode) throw new Error(`Modo desconocido: ${key}`);
  return mode;
}

/**
 * Reparte un héroe distinto a cada jugador según las reglas del modo.
 * @param {string[]} players nombres; los vacíos se descartan y se recorta al máximo del modo
 * @param {string} modeKey
 * @param {import('./shared.js').Hero[]} heroes roster completo
 * @returns {import('./shared.js').Pick[]}
 */
export function draw(players, modeKey, heroes) {
  const mode = getMode(modeKey);

  const names = (players ?? [])
    .map((p) => String(p ?? '').trim())
    .filter(Boolean)
    .slice(0, mode.maxPlayers);
  if (names.length === 0) throw new Error('Hace falta al menos un jugador.');

  const roles = mode.assignRoles(names.length);

  const pool = { tank: [], damage: [], support: [] };
  for (const h of heroes ?? []) if (pool[h?.role]) pool[h.role].push(h);

  for (const role of ROLES) {
    const need = roles.filter((r) => r === role).length;
    if (pool[role].length < need) {
      throw new Error(
        `Faltan héroes de rol ${role}: hay ${pool[role].length} y hacen falta ${need}.`,
      );
    }
    // Barajar y sacar por la cola garantiza que no se repita ninguno.
    pool[role] = shuffle(pool[role]);
  }

  return names.map((player, i) => ({ player, role: roles[i], hero: pool[roles[i]].pop() }));
}
