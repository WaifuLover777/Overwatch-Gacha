# OW Gacha

Hero roulette for Overwatch streams and friend groups: type the names, hit GACHA,
and everyone gets a hero — **following the game's real composition rules**.

| Mode | Players | Constraint |
|---|---|---|
| **Role Queue** | 5 | exactly 1 Tank / 2 Damage / 2 Support |
| **Open Queue** (6v6) | 6 | at most 2 Tanks; Damage and Support uncapped |

No duplicate heroes in either mode (the game's hero limit).
With fewer players, Role Queue fills in scarcity order — the tank first.

> Open Queue sets no minimum on tanks, so a draw can come up with 0.
> That is the actual rule of the game.

## Locking a role

Each player row has three buttons — Tank, Damage, Support. Press one and that player is
**locked** to that role; the roulette only picks their hero. Press it again to go back to
random. Leave every button off and the whole team is rolled.

Locks are checked against the mode's rules before anything spins, so two locked tanks in
Role Queue is a clear error rather than a broken draw. Locked results carry an outlined
`LOCKED` badge, so nobody mistakes a choice for a roll.

## Structure

A monorepo with two independent projects: they share a `git log` and the draw logic,
nothing else. Each has its own deploy filtered by `paths:`, so touching one does not
redeploy the other.

```
packages/gacha/           draw logic   <- the only shared piece
  shared.js               roles, shuffle, helpers
  modes/role-queue.js     Role Queue rules  + its tests
  modes/open.js           Open Queue rules  + its tests
  index.js                mode registry and hero dealing

apps/web/                 the app      -> GitHub Pages
  src/views/role-queue.js  \  one view per mode, each with its own URL
  src/views/open.js        /
  src/team-picker.js      the widget both views mount with their mode
  src/main.js             hash router

apps/api/                 skeleton, no features -> Cloudflare Workers
```

**Each mode is an independent module.** `modes/role-queue.js` and `modes/open.js` know
nothing about each other: each declares its own `maxPlayers`, its rules and its
`assignRoles`. `index.js` only registers them and deals heroes without repeats. Adding a
new mode (Stadium, Mystery Heroes…) means one file in `modes/`, one line in `index.js`,
and its view.

Each mode is also its own screen, with its own URL:

| Route | Mode |
|---|---|
| `#/role-queue` | Role Queue (default) |
| `#/open` | Open Queue |

Player names and role locks are stored separately per mode, so they never clobber each
other. For OBS, point the Browser Source straight at `…/#/open` and it starts in that mode.

The published app **makes no request outside its own origin** (verified: 56 requests, 0
external). The roster and all 53 portraits are committed, so it depends on neither the
OverFast API nor Blizzard's CDN: if either goes down, the roulette keeps working.

That is not the same as working without internet. The page loads from GitHub Pages like
any other, and **it does not work by opening `dist/index.html` directly**: Chrome blocks
ES modules over `file://` because of CORS. To run it locally you need to serve it
(`pnpm preview`).

## Requirements

Node 20+ (tested on 22) · pnpm 9+

## Usage

```bash
pnpm install
pnpm fetch-heroes    # first time only, or when a new hero ships
pnpm dev             # http://localhost:5173
pnpm test            # draw rules
pnpm build
```

`pnpm fetch-heroes` pulls the roster from [OverFast API](https://overfast-api.tekrop.fr)
and the official portraits into `apps/web/public/heroes/`, converting them to WebP
(190 KB PNG → 18 KB each). It is idempotent; `--force` re-downloads. If Blizzard ships a
hero and OverFast is slow to index it, there is an `EXTRA_HEROES` array at the top of the
script to add it by hand.

## License

The **code** is [MIT](LICENSE).

The **hero portraits** in `apps/web/public/heroes/` are not: they are Blizzard
Entertainment's work and remain theirs. They are included as fan content and their use
here is strictly **non-commercial** — no ads, no sales, no donations tied to the project.
If you reuse this repo, that restriction travels with those files.

---

Original idea: [@hatunemiku_7855](https://x.com/hatunemiku_7855/status/2096537727428710786).
Overwatch is a trademark of Blizzard Entertainment; this is a fan project with no
affiliation with or endorsement by Blizzard.
