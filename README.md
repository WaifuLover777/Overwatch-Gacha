# OW Gacha

Ruleta de héroes de Overwatch para streams y partidas con amigos: metes los nombres,
le das a GACHA y a cada uno le toca un héroe — **respetando las reglas reales de
composición del juego**.

| Modo | Jugadores | Restricción |
|---|---|---|
| **Role Queue** | 5 | exactamente 1 Tank / 2 Damage / 2 Support |
| **Open Queue** (6v6) | 6 | máximo 2 Tanks; Damage y Support sin límite |

En ambos, sin héroes repetidos en el equipo (hero limit del juego).
Con menos jugadores, Role Queue reparte en orden de escasez (el tank primero).

> Open Queue no exige mínimo de tanks, así que una tirada puede salir con 0.
> Es la regla real del juego.

## Estructura

Monorepo con dos proyectos independientes: comparten `git log` y la lógica de sorteo,
nada más. Cada uno tiene su deploy filtrado por `paths:`, así tocar uno no redespliega
el otro.

```
packages/gacha/           lógica de sorteo   ← lo único compartido
  shared.js               roles, shuffle
  modes/role-queue.js     reglas de Role Queue  + sus tests
  modes/open.js           reglas de Open Queue  + sus tests
  index.js                registro de modos y reparto de héroes

apps/web/                 la app             → GitHub Pages
  src/views/role-queue.js  \  una vista por modo, cada una con su URL
  src/views/open.js        /
  src/team-picker.js      el widget que ambas montan con su modo
  src/main.js             router por hash

apps/api/                 esqueleto, sin features → Cloudflare Workers
```

**Cada modo es un módulo independiente.** `modes/role-queue.js` y `modes/open.js` no
se conocen entre sí: cada uno declara su `maxPlayers`, sus reglas y su `assignRoles`.
`index.js` solo los registra y reparte los héroes sin repetir. Añadir un modo nuevo
(Stadium, Mystery Heroes…) es crear un archivo en `modes/`, registrarlo en `index.js`
y añadir su vista.

Cada modo es también su propia pantalla, con URL propia:

| Ruta | Modo |
|---|---|
| `#/role-queue` | Role Queue (por defecto) |
| `#/open` | Open Queue |

Los nombres de jugador se guardan por separado en cada modo, así no se pisan.
Para OBS puedes apuntar el Browser Source directamente a `…/#/open` y arranca en
ese modo.

La app publicada **no hace ninguna petición fuera de su propio origen** (verificado: 56
peticiones, 0 externas). El roster y los 53 retratos van commiteados, así que no depende
de la API de OverFast ni del CDN de Blizzard: si cualquiera de los dos se cae, la ruleta
sigue funcionando.

Eso no es lo mismo que funcionar sin internet. La página se carga desde GitHub Pages como
cualquier otra, y **no funciona abriendo `dist/index.html` a pelo**: Chrome bloquea los
módulos ES sobre `file://` por CORS. Para usarla en local hace falta servirla
(`pnpm preview`).

## Requisitos

Node 20+ (probado en 22) · pnpm 9+

## Uso

```bash
pnpm install
pnpm fetch-heroes    # solo la primera vez, o cuando salga héroe nuevo
pnpm dev             # http://localhost:5173
pnpm test            # reglas de sorteo
pnpm build
```

`pnpm fetch-heroes` baja el roster de [OverFast API](https://overfast-api.tekrop.fr)
y los retratos oficiales a `apps/web/public/heroes/`. Es idempotente; `--force` los
vuelve a bajar. Si Blizzard saca un héroe y OverFast tarda en indexarlo, hay un array
`EXTRA_HEROES` al principio del script para meterlo a mano.

## Publicar

1. `git init && gh repo create`, push a `main`.
2. Settings → Pages → **Source: GitHub Actions**.

El workflow `deploy-web` corre los tests antes de desplegar. `deploy-api` está
desactivado (solo manual) hasta que la API tenga algo dentro — ver
[apps/api/README.md](apps/api/README.md).

## Licencia

El **código** está bajo [MIT](LICENSE).

Los **retratos de héroes** de `apps/web/public/heroes/` no lo están: son obra de Blizzard
Entertainment y siguen siendo suyos. Se incluyen como contenido de fans y su uso aquí es
estrictamente **no comercial** — sin anuncios, sin venta, sin donaciones atadas al proyecto.
Si reutilizas el repo, esa restricción viaja con esos archivos.

---

Idea original: [@hatunemiku_7855](https://x.com/hatunemiku_7855/status/2096537727428710786).
Overwatch es marca registrada de Blizzard Entertainment; este es un proyecto de fans sin
afiliación ni respaldo de Blizzard.
