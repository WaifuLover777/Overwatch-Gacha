/**
 * Downloads the roster and the official portraits ONCE; the result is committed.
 * That way the published app depends on neither this API nor Blizzard's CDN at runtime.
 *
 *   pnpm --filter web fetch-heroes
 *
 * Idempotent: portraits already on disk are skipped (--force re-downloads them).
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const API = 'https://overfast-api.tekrop.fr/heroes';
// The official PNGs are uncompressed 256x256 (~190 KB). As WebP they drop to ~18 KB,
// which for an OBS Browser Source is the difference between an 8 MB and a 1 MB load.
const WEBP_QUALITY = 82;

/**
 * Safety net: if Blizzard ships a hero and OverFast is slow to index it, add it
 * here and re-run. Shape: {key, name, role, portrait}
 * @type {{key: string, name: string, role: 'tank'|'damage'|'support', portrait: string}[]}
 */
const EXTRA_HEROES = [];

const ROLES = new Set(['tank', 'damage', 'support']);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imgDir = join(root, 'public', 'heroes');
const force = process.argv.includes('--force');

const exists = (p) => access(p).then(() => true, () => false);

async function main() {
  const res = await fetch(API);
  if (!res.ok) throw new Error(`${API} answered ${res.status} ${res.statusText}`);

  const raw = [...(await res.json()), ...EXTRA_HEROES];
  const seen = new Set();
  const heroes = raw.filter((h) => {
    if (!h?.key || !h?.name || !h?.portrait || !ROLES.has(h.role)) return false;
    if (seen.has(h.key)) return false; // first entry wins on duplicates
    seen.add(h.key);
    return true;
  });

  if (heroes.length < 30) throw new Error(`Only ${heroes.length} valid heroes; the API must be broken.`);

  await mkdir(imgDir, { recursive: true });
  await mkdir(join(root, 'src'), { recursive: true });

  let downloaded = 0;
  for (const h of heroes) {
    const file = join(imgDir, `${h.key}.webp`);
    if (!force && (await exists(file))) continue;
    const img = await fetch(h.portrait);
    if (!img.ok) throw new Error(`Portrait for ${h.name}: ${img.status}`);
    await sharp(Buffer.from(await img.arrayBuffer())).webp({ quality: WEBP_QUALITY }).toFile(file);
    downloaded++;
  }

  const data = heroes
    .map(({ key, name, role }) => ({ key, name, role }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
  await writeFile(join(root, 'src', 'heroes.json'), JSON.stringify(data, null, 2) + '\n');

  const byRole = data.reduce((acc, h) => ({ ...acc, [h.role]: (acc[h.role] ?? 0) + 1 }), {});
  console.log(`${data.length} heroes (${JSON.stringify(byRole)}) · ${downloaded} new portraits`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
