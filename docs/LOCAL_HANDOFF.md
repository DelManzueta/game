# Studio Empire — Complete Local Handoff

**Authoritative as of `main`.**  
**Purpose:** Everything you need to own this project offline — where files live, how systems connect, how to run on Windows and Mac, what is locked vs safe to change.

This document is the offline ownership map. Read it before editing code.

---

## 1. Product law (do not violate)

Sources: `docs/PRODUCT_CONSTITUTION.md`, `docs/FOUNDATIONAL_CORE.md`, `docs/FOUNDATION_LOCK_V1.md`, `docs/PHASE_ONE_FINAL.md`, `docs/GARAGE_LOOP_FLOW.md`.

- One continuous core game. Platforms, research, engines, training, hardware, live services are **native** systems — never framed as DLC / expansion / mod.
- Core loop is inviolable: Market → concept → stages 1→2→3 → polish → price → release → reviews → weekly sales → report/knowledge → next game.
- **Quality ≠ marketing.** Awareness never rewrites critic scores or product quality.
- **Determinism is sacred.** Reviews, completed sales weeks, ledger entries, `OutcomeTrace`, and entity IDs freeze on first computation. Save/load and re-export must produce identical results.
- Phase One = founder-only garage (`office <= 1`). Late systems are dark via `isGaragePhaseOne` + `lateSystemAllowed` + feature flags.
- Cash mutations only through `applyCashTransaction` (atomic with ledger). Invariant: `cash === ledger.balance` after settlement.
- No empty `uid(...)` calls. Every ID is `campaignSeed + stable entity/event parts`.
- Schema version **6** (`studio-empire-save-v6`). Prior keys remain in `ALL_SAVE_KEYS` for migration.

### Non-goals for Phase One (do not implement now)

- Office interior / seats / employees / recruitment boards
- Hardware / workbench / consoles / merch
- Publishers as active content (board may exist but is gated)
- Netflix / streamers / conventions / digital storefront / litigation
- High-density bay / mid-dev crisis events
- Content-pack install framing

---

## 2. Run locally (Windows + Mac + Linux)

Repo: https://github.com/DelManzueta/game

### Same workflow on every platform

```bash
git clone https://github.com/DelManzueta/game.git
cd game
git pull origin main
rm -rf node_modules
npm install
npm run dev
```

Open **http://localhost:8080**

### Platform notes

| | Windows | Mac |
|---|---|---|
| Start | `start.cmd` **or** `npm run dev` | `npm run dev` (or `sh startup.sh`) |
| Shell | PowerShell / CMD / Git Bash | Terminal |
| Node | 20+ recommended | 20+ recommended |

**Windows tip:** Prefer `start.cmd` or `npm run dev`. Do not rely on `startup.sh` alone in Git Bash — it backgrounds the server and can look like “nothing happened.” Leave the terminal open while the server runs.

**Native bindings:** `package.json` `optionalDependencies` includes Rolldown, Tailwind Oxide, and LightningCSS for:

- `darwin-arm64` / `darwin-x64`
- `win32-x64-msvc` / `win32-arm64-msvc`
- linux gnu/musl variants

If install fails with “Cannot find native binding”:

```bash
rm -rf node_modules
npm install
```

If still broken after a dirty lockfile:

```bash
git restore package-lock.json
rm -rf node_modules
npm install
```

### Useful scripts

```bash
npm run typecheck
npm run test
npm run lint
npm run build
npm run format
```

Dev server binds `0.0.0.0:8080` (see `package.json` → `"dev"`).

---

## 3. Top-level layout

```text
game/
├── package.json / package-lock.json / vite.config.ts / tsconfig.json
├── startup.sh              # POSIX restart contract
├── start.cmd               # Windows one-click start
├── AGENTS.md               # Grok Build sandbox contract (not product code)
├── docs/                   # Design locks + module docs ← start here
├── public/art/             # Room art, platform art, UI icons
├── src/
│   ├── routes/             # TanStack Router (index → GameApp)
│   ├── components/
│   │   ├── game/           # Live shell — GameApp.tsx is the main view
│   │   ├── ui/             # Modal, Button, glass/hud primitives
│   │   └── mockups/        # Design experiments only (not live)
│   └── lib/
│       ├── game/           # ★ ENTIRE SIMULATION + DOMAIN ★
│       ├── auth/           # Better-auth + PGLite (mostly dormant single-player)
│       └── db.ts
├── server/                 # Minimal PWA middleware
├── scripts/                # migrate, campaign traces, browser smoke
└── migrations/             # SQL (auth schema)
```

**Entry path:** `src/routes/index.tsx` → `<GameApp />`.

All domain mutations go through `useGame` (Zustand). React never calls production/quality/scoring algorithms directly; it reads view-models and dispatches store actions.

---

## 4. Simulation architecture (`src/lib/game/`)

The store is the orchestrator. Everything else is pure or nearly pure.

| Module | Responsibility |
|--------|----------------|
| **`store.ts`** | Zustand store = `GameState` + actions. Owns tick, project lifecycle, save/load, all command handlers. |
| **`types.ts`** | Canonical types: `GameState`, `GameProject`, `ReleasedGame`, genres, fields, office tiers, speed, unlocks. |
| **`contracts.ts`** | Schema v6 keys, scoring pipeline order, `OutcomeTrace`, genre capacity weights. |
| **`phaseOne.ts`** | Quarantine authority: `isGaragePhaseOne`, `lateSystemAllowed`. |
| **`determinism.ts`** | Pure RNG / stable units. Never `Math.random` for game logic. |
| **`data.ts`** | Balance helpers + re-exports from `content/`. `START_YEAR`, week constants, size stats. |
| **`content/`** | Canonical catalogs (topics, platforms, engines, genre fit, garage slice, art maps). |
| **`production/`** | Development pipeline: stage work units, bugs, polish. Pure. |
| **`quality/`** | Concept fit → execution quality → reviews. Marketing never touches this. |
| **`scoring/`** | GDT-inspired + V2 pipeline, experience, critics, sales plan, `SeededRng`. |
| **`finance/`** | `applyCashTransaction` + ledger. Atomic money. |
| **`market/`** | Rivals, platforms, trends (present, gated). |
| **`commercial/`** | Weekly sales runtime, marketing, publishing board, fans, sequels. |
| **`knowledge.ts`** | Persistent flywheel from reports + cancels. |
| **`save.ts`** | localStorage multi-slot + parse boundary + migrations. |
| **`progression/`** | Unlock registry, feature flags, office ladder, offers, seats. |
| **`viewModels.ts`** | Pure derived UI data (library rows, phase labels, charts). |
| **`simulation.ts`** | High-level helpers bridging store ↔ scoring/production. |
| **`marketingOpportunities.ts`** | Scheduled opportunity windows (resolve-once). |
| Late modules (`tycoon*`, `hardware*`, `netflixEdition`, `officeWorkbench`, `optimization/`, `engine/`, `research/`, `training`) | Exist and tested, **quarantined** in Phase One. |

### Quarantine flow

```ts
isGaragePhaseOne(state)          // office <= 1
lateSystemAllowed(state, system) // false in garage; later still needs flags
```

Blocked in garage UI **and** commands: publishers board ticks, recruitment, hardware, Netflix, streamers, conventions, NeonStore, illicit/litigation, mid-dev crises, content-pack install.

---

## 5. Mandatory Garage player loop

From `docs/GARAGE_LOOP_FLOW.md` + store actions:

1. **New Game** (`newGame`) → `campaignSeed`, founder, basic engine, garage content, speed=0 (paused).
2. **Plan** (`startProject`) → Topic + Genre (+ Platform, Audience when unlocked).
3. **Stage 1 config** → allocate focus (normalize to 100) → `confirmStage`.
4. **Stage 1 running** → weeks advance production (work units, bugs, design/tech).
5. Repeat for Stage 2 and Stage 3.
6. **Polish / bug fix**.
7. **Pre-release** → final title + launch price (required).
8. **Release or Cancel**
   - Release freezes `OutcomeTrace`, critics, sales plan. Reviews appear. First sales next market week.
   - Cancel sinks costs; knowledge lesson still recorded.
9. **Weekly sales** long-tail.
10. **Game Report** → knowledge applied.
11. Research / next concept. Founder energy always available (no meter).

### Rules enforced in store

- Simulation never auto-advances a stage or picks sliders.
- Price does not affect quality — only revenue.
- Hits raise opportunity/scrutiny, never a secret quality penalty on the next title.
- `OutcomeTrace` freezes quality/reviews/sales plan; load never re-rolls.
- Clock: writable `week`; year/month derived.

---

## 6. UI layer

- **`src/components/game/GameApp.tsx`** — main shell (large monolith view).
- Room-first garage presentation; styles in `src/styles.css`.
- Dock: Garage · Library (post-ship) · Lab · More.
- Develop desk shows real Design/Tech/Bugs; DRM/crunch/ports hidden in garage.
- Primitives: `src/components/ui/primitives.tsx`.
- View models keep pure derivation out of the big component.
- Mockups under `src/components/mockups/` are experiments only.
- Art: `public/art/` + `content/platformArt.ts` / roomArt / genreArt.

---

## 7. Determinism and identity

- Campaign seed is set once at `newGame` and threaded everywhere.
- Stable RNG helpers live under `scoring/rng.ts` and `determinism.ts`.
- Used for sales variance, rivals, events, IDs.
- `OutcomeTrace` on released games freezes quality/reviews/sales plan so reloads are bit-identical.
- Ledger refs make cash transactions idempotent.

Never introduce `Math.random`, wall-clock time for game logic, or empty identity factories.

---

## 8. Save system

- Key: `studio-empire-save-v6` (+ multi-slot helpers).
- `ALL_SAVE_KEYS` covers v6→v1.
- Parse boundary on load/import (`save.ts`).
- Migrations live in store + save + knowledge/market helpers.
- JSON export under Developer tools still works.

---

## 9. Content catalogs (Garage start set)

- Topics: full catalog in `content/topics.ts`; garage starts with a verified slice (`garageSlice.ts`).
- Genres: six top-level (`action | adventure | rpg | simulation | strategy | casual`).
- Platforms: multi-decade catalog; garage starts with a small unlocked set (PC + early systems).
- Engines: Basic 2D start + researchable components.
- Compatibility / capacity weights live in contracts + genre-fit content.

Adding content: pure data in `content/`, keep algorithms pure, extend tests under `__tests__/contentCatalog.test.ts`.

---

## 10. Testing and verification

```bash
npm run typecheck
npm run test
npm run lint
npm run build
```

Key tests under `src/lib/game/__tests__/`:

- `garagePolicy.test.ts`, `garageVerticalSlice.test.ts`, `garageIntegrity.test.ts`
- `foundationLock.test.ts`, `foundationStore.test.ts`
- `save.test.ts`, `phaseOneUi.test.ts`
- scoring / quality / production / market / commercial suites

Campaign trace helper:

```bash
node --import tsx scripts/foundation-campaign-trace.mjs
```

Policy tests assert: three-game knowledge inheritance, no stage advance without confirm, reviews only on release, cancel path, founder availability, save identity.

---

## 11. How modules connect

```text
GameApp (React)
  ↓ useGame selectors + actions
store.ts
  ├─ phaseOne.isGaragePhaseOne / lateSystemAllowed   → quarantine
  ├─ production/bridge + algorithm                   → stage work, bugs, polish
  ├─ quality + scoring/*                             → conceptFit → quality → reviews → sales plan
  ├─ finance/transaction + ledger                    → every cash change
  ├─ commercial/runtime + marketing                  → weekly sales + opportunities
  ├─ market/tick                                     → rivals / platform state
  ├─ knowledge                                       → report / cancel lessons
  ├─ determinism + uid                               → randomness & IDs
  ├─ save.ts + contracts                             → persist / migrate
  └─ progression/featureFlags + unlockRegistry       → progressive disclosure
```

---

## 12. What to touch vs leave alone

### Safe / intended for local iteration now

- UI polish inside `GameApp` + primitives + styles
- Content additions inside the garage slice (topics, art, copy)
- View-model helpers, chart polish, report presentation
- Docs that clarify the locked loop
- Test coverage for garage policy

### Do not touch without a new foundation lock

- Production algorithm, quality algorithm, scoring pipeline order
- `applyCashTransaction`, stable RNG, schema v6 contracts
- Stage state machine, `OutcomeTrace` freeze rules
- Enabling any late system while `isGaragePhaseOne` is true
- Changing “confirm before advance” rules

---

## 13. Daily work mental model

1. Pull `main` → `npm install` → `npm run dev` → localhost:8080.
2. New Game → play one full garage cycle (plan → 3 stages → polish → price → release → sales → report).
3. Confirm reload does not re-roll reviews/sales.
4. Any new feature: first ask “does this fire while office === 1?” If yes, it must be pure garage or explicitly gated.
5. Cash always goes through `applyCashTransaction` with a unique `ref`.
6. Randomness always goes through the deterministic helpers with campaign seed + entity identity.

---

## 14. Reference docs (read in this order)

1. `docs/FOUNDATION_LOCK_V1.md` — sealed invariants
2. `docs/PHASE_ONE_FINAL.md` + `docs/GARAGE_LOOP_FLOW.md` — player journey
3. `docs/PRODUCT_CONSTITUTION.md` + `docs/FOUNDATIONAL_CORE.md` — north star
4. `docs/PHASE_ONE_CONTENT.md` — catalog counts and start set
5. `docs/CLASSIC_GDT_LOOP.md` + scoring docs — formulas
6. `docs/PROGRESSION_ARCHITECTURE.md` / `PROGRESSION_UNLOCKS.md` — what comes after garage (do not implement yet)
7. Module docs (`ENGINE_PART3`, `RESEARCH_PART2`, `PLATFORM_LIFECYCLE_FLOW`, etc.) for when gates open later

---

## 15. Branches (context)

| Branch | Meaning |
|--------|---------|
| `main` | Current playable product (Phase One + polish + platform bindings) |
| `grok/foundation-lock-v1` | Sealed simulation lock (`eb4e12e`) — do not rewrite |
| `grok/phase-one-final` | Presentation build from the seal |
| `codex/phase-a-foundation` | Stale — do not merge |

---

## 16. Ownership summary

The garage product is shippable. The simulation is deterministic and quarantined. The UI is the primary surface for polish. Late-game systems exist in code but stay dark until a deliberate unlock pass.

**Beating heart of the loop:** `src/lib/game/store.ts` around `newGame` / `startProject` / `confirmStage` / `releaseGame`, plus `production/bridge.ts`.

You own this offline. You do not need this chat to work on it.
