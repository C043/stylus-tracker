# AGENTS.md — Stylus Tracker

Self-hosted, mobile-first **PWA** that tracks turntable stylus wear and tells the user
**how many more records they can safely play before replacing the stylus**.

Read this whole file before writing code. It is the source of truth for product rules,
architecture and conventions. If code and this file disagree, ask, then update one of them.

> **⚠️ Agents must never commit.** Do not run `git commit`, `git push`, `git tag`, merge,
> rebase, amend or any other command that writes git history, even if a step below says
> "commit" or a tool or hook suggests it. Leave all changes in the working tree for the
> maintainer to review and commit. Staging (`git add`) is fine only if asked. When a unit of
> work is done, stop and summarise what changed and what to put in the commit message.
> Enforced for Claude Code by `.claude/hooks/block-git-writes.sh` (PreToolUse hook).

---

## 1. Development process — TDD is mandatory

This project is developed **test-first (red → green → refactor)**. No exceptions for
domain logic.

1. **Red** — write a failing test that describes the next small behaviour. Run it, see it fail
   for the right reason.
2. **Green** — write the minimum code to make it pass.
3. **Refactor** — clean up with all tests green.
4. Stop after each small step so the maintainer can commit it (agents never commit, see top).
   A change set should never contain production code without the test that drove it.

Rules:

- Domain logic (`src/lib/domain/**`) is pure TypeScript with **no I/O and no Date.now()**;
  "today" is always passed in as an argument so tests are deterministic. Target ~100% coverage.
- Every bug fix starts with a test that reproduces the bug.
- Server code (form actions, `+page.server.ts`, repositories) is tested against an
  **in-memory SQLite** DB (`new Database(':memory:')` + Drizzle migrations), never the real DB file.
- Svelte components get component tests (`*.svelte.spec.ts`, run in a real browser via
  `vitest-browser-svelte`) for any non-trivial interaction or state.
- Critical user flows get a Playwright e2e test (`*.e2e.ts`): add turntable, add stylus
  (incl. backdated), log full/half play, see remaining count change, replace stylus.
- Don't skip or delete failing tests to get green. Fix the code or explain why the test is wrong.

Commands:

| Command                      | What                                            |
| ---------------------------- | ----------------------------------------------- |
| `npm run test:unit`          | Vitest in watch mode (use during TDD)           |
| `npm run test:unit -- --run` | Single unit/component run                       |
| `npm run test:e2e`           | Playwright e2e                                  |
| `npm test`                   | Everything (must pass before handing work back) |
| `npm run check`              | svelte-check / TypeScript                       |
| `npm run lint` / `format`    | Prettier + ESLint                               |

Test file conventions (configured in `vite.config.ts`):

- `src/**/*.spec.ts` → Node "server" project (domain + server)
- `src/**/*.svelte.spec.ts` → browser "client" project (components)
- `src/**/*.e2e.ts` → Playwright

---

## 2. Tech stack (chosen)

| Concern   | Choice                                                                               |
| --------- | ------------------------------------------------------------------------------------ |
| Framework | **SvelteKit 3 + Svelte 5 (runes mode)**, TypeScript                                  |
| Server    | `@sveltejs/adapter-node` (one Node process)                                          |
| Database  | **SQLite** via `better-sqlite3` + **Drizzle ORM** / drizzle-kit migrations           |
| Styling   | **Tailwind CSS 4** + CSS custom-property design tokens (`src/routes/layout.css`)     |
| PWA       | SvelteKit built-in **`src/service-worker/index.ts`** + `static/manifest.webmanifest` |
| Fonts     | Self-hosted via `@fontsource` (works offline, no Google CDN)                         |
| Tests     | Vitest (node + browser projects), vitest-browser-svelte, Playwright                  |
| Deploy    | Docker image + `docker-compose.yml`, DB in a mounted volume (`/data`)                |

Why: lightest bundle for phones, one container + one DB file for easy self-hosting and backups,
and Svelte transitions make the vinyl animations cheap.

> Note: `@vite-pwa/sveltekit` does not support Kit 3 yet (peer dep `^2`). Use the native
> service worker. Revisit only if we need precache manifests beyond what `$service-worker` gives.

Conventions:

- Svelte 5 runes only (`$state`, `$derived`, `$props`). No legacy stores unless a lib needs them.
- Mutations go through **SvelteKit form actions** with progressive enhancement (`use:enhance`),
  so the app works even before JS loads. No separate REST API unless needed.
- Validate all form input on the server (keep a small hand-written validator or add `valibot`).
- Imports: relative within `src/lib`; `#lib/<path>.ts` subpath imports from routes (see `package.json#imports`).
- Single user, **no authentication** in the app. It's meant to run on a LAN or behind a
  reverse proxy that does auth (Authelia, Caddy basic auth, Tailscale…). Say so in the README.

---

## 3. Domain

### 3.1 Entities

```
Turntable 1 ──── * Stylus (exactly one active, the rest retired = history)
Stylus    1 ──── * Play
```

- **Turntable**: `id`, `name` (user nickname, e.g. "Living room"), `catalogId` (from catalog)
  **or** custom: `catalogId` null with free-text `brand`/`model`, `createdAt`.
  There is no separate `custom` flag; a null `catalogId` _is_ custom.
- **Stylus**: `id`, `turntableId`, `profile` (see 3.2), optional `cartridge` text (e.g.
  "Ortofon 2M Red", names the brand and model), optional `customLifespanHours` (overrides the
  profile), `installedOn` (local date `YYYY-MM-DD`), `createdOn` (local date the stylus was
  added to the app), `backfilledRecords` (int, frozen at creation, see 3.4), `retiredOn`
  (nullable). At most one stylus per turntable has `retiredOn` null, enforced by a partial
  unique index (`stylus_one_active_idx`).
- **Play**: `id`, `stylusId`, `kind` = `'full' | 'side'`, `playedAt` (ISO timestamp).

Plays are attached to the **stylus**, not the turntable, so replacing the stylus resets the count
and history stays correct.

### 3.2 Stylus profiles and lifespan

Lifespan in **playing hours**. The app uses the **conservative (low) value** as the "safe" limit.
These values live in `src/lib/domain/stylus-profiles.ts` and are covered by tests.

| Profile id        | Label                                      | Range (h) | Safe limit (h) |
| ----------------- | ------------------------------------------ | --------- | -------------- |
| `sapphire`        | Ceramic / sapphire (cheap red needle)      | 40–60     | 40             |
| `spherical`       | Spherical / conical (diamond)              | 300–500   | 300            |
| `elliptical`      | Elliptical, bonded                         | 300–500   | 300            |
| `nude-elliptical` | Elliptical, nude                           | 400–600   | 400            |
| `shibata`         | Shibata                                    | 500–1000  | 500            |
| `line-contact`    | Line contact / Fine line / Hyperelliptical | 600–1000  | 600            |
| `microline`       | MicroLine / Micro-Ridge                    | 800–1200  | 800            |
| `custom`          | Custom — user enters lifespan hours        | —         | user value     |

If the user doesn't know the profile, default to `spherical` (most common on budget decks).

### 3.3 Wear calculation (core algorithm)

Constants (user-adjustable later in settings, defaults below):

- `MINUTES_PER_SIDE = 20` (average LP side)
- full record = 2 sides, half record (`'side'`) = 1 side

```
usedSides      = backfilledRecords * 2 + Σ plays (full → 2, side → 1)
usedMinutes    = usedSides * MINUTES_PER_SIDE
limitMinutes   = safeLimitHours(profile or customLifespanHours) * 60
remainingSides = max(0, floor((limitMinutes - usedMinutes) / MINUTES_PER_SIDE))
remainingRecords  = floor(remainingSides / 2)        // shown big
extraSide         = remainingSides % 2 === 1         // shown as "+ 1 side"
wearPercent       = min(100, usedMinutes / limitMinutes * 100)
```

Status:

| Status    | Condition           | UI                                          |
| --------- | ------------------- | ------------------------------------------- |
| `good`    | wear < 75 %         | warm green/amber needle                     |
| `soon`    | 75 % ≤ wear < 100 % | amber, "order a replacement"                |
| `replace` | wear ≥ 100 %        | red, "replace now, you're damaging records" |

Put this in `src/lib/domain/wear.ts` as a pure function, e.g.
`computeWear({ profile, customLifespanHours, backfilledRecords, plays, minutesPerSide })`.

Edge cases to test: zero plays; exactly at the limit; over the limit (never negative);
odd number of sides; custom lifespan; sapphire (tiny limit); retired stylus.

### 3.4 Backdated stylus (backfill rule)

When a stylus is added with `installedOn` **before today**, assume **one full record played per
day** from `installedOn` up to (not including) the day it's added to the app:

```
backfilledRecords = max(0, calendarDaysBetween(installedOn, createdOn))
```

- Installed today → 0. Installed 3 days ago → 3 (that day, and the 2 days after it).
  Today's plays get logged by hand.
- `installedOn` in the future → validation error.
- The value is **computed once at creation and stored**. It must not keep growing; after the
  stylus is added, only plays the user logs count.
- If the user later edits `installedOn`, recompute against the original `createdOn`.
- Use **local calendar dates** (`YYYY-MM-DD`), not timestamps, so DST/timezones don't add or
  lose a day. Test across a DST boundary and month/year boundaries.
- Show the estimate in the UI ("~42 records estimated since 12 Sep") so the user can tell.

### 3.5 Replacing a stylus

"Replace stylus" retires the active one (`retiredOn = today`) and creates a new active stylus
(pre-filled with the previous profile/cartridge). History view lists past styli with total sides
played.

---

## 4. Turntable catalog

When adding a turntable the user picks from a **visual select of famous brands → models with
images**, or **Custom**.

- Catalog data: `src/lib/catalog/turntables.ts` (static, typed, tested for unique ids and that
  every image exists).
- Images: `static/turntables/<brand-slug>/<model-slug>.webp` (~600px wide, transparent or
  neutral background, optimised). Missing image → fall back to `static/turntables/_placeholder.svg`.
- **Custom** option uses `static/turntables/custom-red-stylus.svg`: the cheap red ceramic
  needle found on suitcase players. It's an in-joke, keep it.
- Each catalog model may suggest a default stylus (`defaultStylus: { cartridge, profile }`)
  to pre-fill the stylus form. The user can always change it.
- **Image licensing**: use only images we're allowed to redistribute (own photos, CC-licensed
  from Wikimedia Commons with attribution in `static/turntables/CREDITS.md`, or original
  illustrations). Don't hotlink or scrape manufacturer sites.

---

## 5. Look & feel — vintage, woody, vinyl

Feel: a 1970s hi-fi cabinet. Walnut veneer, brushed aluminium, cream labels, amber VU meters,
spinning records. Slick, not kitsch.

Design tokens are in `src/routes/layout.css` (`@theme`). Use the tokens, don't hard-code hex values.

- **Palette**: walnut/rosewood browns (backgrounds), brushed aluminium (cards, knobs),
  cream/ivory (text, record labels), amber/orange VU glow (accent), oxblood red (danger),
  black vinyl.
- **Type**: `Fraunces` (display/headings, soft retro serif), `IBM Plex Mono` (numbers,
  counters, meter readouts). Both self-hosted.
- **Textures**: subtle wood grain (CSS gradients or a small tiled WebP, < 30 KB), grain/noise
  overlay, soft inner shadows like recessed panels.
- **Signature components**:
  - **Remaining-records gauge**: a vinyl record whose grooves "fill up" with wear, or an analog
    VU-meter needle swinging from good → replace. The big number is the remaining records.
  - **Log play buttons**: two large tactile buttons, "Full record" / "One side", styled like
    hi-fi piano-key switches, with haptic feedback (`navigator.vibrate`) and a spin animation.
  - Turntable cards: platter image on wood plinth, with the status needle.
- **Motion**: Svelte transitions; record spin on log. Respect `prefers-reduced-motion`.
- **Mobile first**: bottom tab bar, thumb-reachable primary actions, 16px gutters, safe-area
  insets (`env(safe-area-inset-*)`), minimum 44px tap targets. Dark wood theme is the default.
  Optional light "maple" theme later.
- Accessibility: AA contrast on wood backgrounds (check it), the gauge must have a text
  equivalent, all buttons labelled.

---

## 6. PWA

- `static/manifest.webmanifest`: name, short_name, `display: standalone`, portrait,
  theme/background colours from tokens, icons 192/512 + maskable (TODO: design icon, a record
  label with a stylus).
- `src/service-worker/index.ts`: precache build + static files; network-first for navigations/data
  with cache fallback; offline page. Logging a play offline is a later feature (queue + sync).
- Must pass Lighthouse PWA installability on Android Chrome and iOS Safari (add
  `apple-touch-icon`, `apple-mobile-web-app-capable` meta).

---

## 7. Project layout

```
src/
  lib/
    domain/          # pure logic: wear.ts, backfill.ts, stylus-profiles.ts, dates.ts (+ .spec.ts)
    catalog/         # turntables.ts (+ .spec.ts)
    components/      # Svelte UI components (+ .svelte.spec.ts)
    server/
      db/            # Drizzle schema, client
      repositories/  # DB access, tested against in-memory SQLite
  routes/            # pages, +page.server.ts loaders & form actions
  service-worker.ts
static/
  manifest.webmanifest
  turntables/        # catalog images, _placeholder.svg, custom-red-stylus.svg
drizzle/             # generated migrations (tracked in git; maintainer commits them)
```

---

## 8. Self-hosting

- **Hard requirement: hosting is exactly one command, `docker compose up -d`.** No manual
  migrations, seeding, `.env` editing or extra containers. Every change must keep this true
  (an e2e/CI check should build the image and hit `/`).
- That command builds the image (compose `build: .`), serves on port `3000`, and stores SQLite
  at `/data/stylus-tracker.db` (named volume `stylus-data`). Optional overrides: `PORT`, `ORIGIN`.
- Migrations run automatically at boot (`openDatabase()` in `src/lib/server/db/client.ts`,
  reading `drizzle/`, called via the `init` hook in `src/hooks.server.ts`). Schema changes = edit `schema.ts` → `npm run db:generate` → leave the generated SQL for the maintainer to commit.
  Never rely on `db:push` outside local hacking.
- Env: `DATABASE_URL` (path to SQLite file), `PORT`, and `ORIGIN` (optional, pins the public URL;
  unset, any address works, see `server.js`).
- The container runs `node server.js`, not `node build`. It reports the real protocol to Kit
  (`X-Forwarded-Proto`, else `http`) so CSRF passes on a LAN IP and behind a proxy. Don't
  default `ORIGIN` to a fixed URL; that breaks form POSTs from phones.
- `npm run test:docker` checks all of the above against the real image; keep it green.
- Backups = copy the `.db` file (WAL mode on, so use `sqlite3 .backup` or stop the container).

---

## 9. Roadmap (build in this order, TDD each)

1. Domain: stylus profiles → wear calculation → backfill/date utils. _(pure, fully tested)_
2. DB schema + migrations + repositories (in-memory SQLite tests).
3. Design tokens, layout, bottom nav, fonts.
4. Add turntable (catalog picker + custom) → add stylus (incl. backdated) → dashboard with gauge.
5. Log full / half play, undo last play.
6. Replace stylus + history.
7. PWA manifest, icons, service worker, offline page.
8. Docker + README. Then later: settings (minutes per side), export/import JSON, offline play queue.
