# Studio Empire

Deterministic browser game-dev tycoon. Current shippable product: **Garage Phase One** (founder-only loop).

## Quick start (Windows & Mac)

```bash
git clone https://github.com/DelManzueta/game.git
cd game
npm install
npm run dev
```

Open **http://localhost:8080**

- **Windows:** `start.cmd` or `npm run dev`
- **Mac / Linux:** `npm run dev`

## Offline ownership docs

| Doc | What it is |
|-----|------------|
| **[docs/LOCAL_HANDOFF.md](./docs/LOCAL_HANDOFF.md)** | Full architecture map — where everything lives, how systems connect, Phase One rules, what is safe to edit |
| [docs/FOUNDATION_LOCK_V1.md](./docs/FOUNDATION_LOCK_V1.md) | Sealed simulation invariants |
| [docs/GARAGE_LOOP_FLOW.md](./docs/GARAGE_LOOP_FLOW.md) | Mandatory player loop |
| [docs/PHASE_ONE_FINAL.md](./docs/PHASE_ONE_FINAL.md) | Presentation build notes |
| [docs/PRODUCT_CONSTITUTION.md](./docs/PRODUCT_CONSTITUTION.md) | Product north star |

Start with **LOCAL_HANDOFF.md** if you are taking ownership offline.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server on `:8080` |
| `npm run typecheck` | TypeScript |
| `npm run test` | Tests |
| `npm run lint` | ESLint |
| `npm run build` | Production build |

Simulation is authoritative. UI dispatches store commands only. Late systems stay quarantined during Phase One.
