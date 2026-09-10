/**
 * Where the draw happens.
 *
 * With VITE_API_URL set the server draws (apps/api, same packages/gacha); unset —
 * which is what the GitHub Pages build ships — the browser draws and the page
 * still makes no request outside its own origin.
 */
import { draw } from '@ow-gacha/gacha';

const API = import.meta.env.VITE_API_URL;

/**
 * @param {{name: string, roles: string[]}[]} players
 * @param {string} modeKey
 * @param {import('@ow-gacha/gacha').Hero[]} heroes local roster, for the fallback
 */
export async function drawPicks(players, modeKey, heroes) {
  if (API) {
    try {
      const res = await fetch(`${API}/api/draw`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ players, mode: modeKey }),
      });
      if (res.ok) return await res.json();
    } catch {
      /* offline, CORS, DNS: the local draw below covers it */
    }
  }

  // Also the path for a rejected draw (400): both sides run the same rules, so
  // this throws the very message the API answered with.
  return draw(players, modeKey, heroes);
}
