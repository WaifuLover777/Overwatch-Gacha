/**
 * Baja el roster y los retratos oficiales UNA VEZ; el resultado se commitea.
 * Así la app publicada no depende en runtime ni de esta API ni del CDN de Blizzard.
 *
 *   pnpm --filter web fetch-heroes
 *
 * Es idempotente: los retratos ya descargados se saltan (--force los vuelve a bajar).
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const API = 'https://overfast-api.tekrop.fr/heroes';
// Los PNG oficiales son 256x256 sin comprimir (~190 KB). En WebP bajan a ~18 KB,
// que para un Browser Source de OBS es la diferencia entre 8 MB y 1 MB de carga.
const WEBP_QUALITY = 82;

/**
 * Red de seguridad: si Blizzard saca un héroe y OverFast tarda en indexarlo,
 * añádelo aquí y vuelve a ejecutar. Formato: {key, name, role, portrait}
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
  if (!res.ok) throw new Error(`${API} respondió ${res.status} ${res.statusText}`);

  const raw = [...(await res.json()), ...EXTRA_HEROES];
  const seen = new Set();
  const heroes = raw.filter((h) => {
    if (!h?.key || !h?.name || !h?.portrait || !ROLES.has(h.role)) return false;
    if (seen.has(h.key)) return false; // EXTRA_HEROES gana si duplica: filtramos el segundo
    seen.add(h.key);
    return true;
  });

  if (heroes.length < 30) throw new Error(`Solo ${heroes.length} héroes válidos, la API debe estar rota.`);

  await mkdir(imgDir, { recursive: true });
  await mkdir(join(root, 'src'), { recursive: true });

  let bajados = 0;
  for (const h of heroes) {
    const file = join(imgDir, `${h.key}.webp`);
    if (!force && (await exists(file))) continue;
    const img = await fetch(h.portrait);
    if (!img.ok) throw new Error(`Retrato de ${h.name}: ${img.status}`);
    await sharp(Buffer.from(await img.arrayBuffer())).webp({ quality: WEBP_QUALITY }).toFile(file);
    bajados++;
  }

  const data = heroes
    .map(({ key, name, role }) => ({ key, name, role }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
  await writeFile(join(root, 'src', 'heroes.json'), JSON.stringify(data, null, 2) + '\n');

  const porRol = data.reduce((acc, h) => ({ ...acc, [h.role]: (acc[h.role] ?? 0) + 1 }), {});
  console.log(`${data.length} héroes (${JSON.stringify(porRol)}) · ${bajados} retratos nuevos`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
