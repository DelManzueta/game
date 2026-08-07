# Phase One Content Pass — Implementation Record

## Canonical catalogs (single source)

| Catalog | Count | Module |
|--------|------:|--------|
| Topics | **132** | [`src/lib/game/content/topics.ts`](../src/lib/game/content/topics.ts) |
| Top-level genres | **6** | [`src/lib/game/data.ts`](../src/lib/game/data.ts) `GENRES` |
| Platforms (timeline) | **40** | [`src/lib/game/content/platforms.ts`](../src/lib/game/content/platforms.ts) |
| Custom Console | 1 (separate) | same file `CUSTOM_CONSOLE` |
| Engine components | **27** (1 start + 26 researchable) | [`src/lib/game/content/engines.ts`](../src/lib/game/content/engines.ts) |

## Compatibility

- Each topic has ranks across all six genres using values `{100, 85, 70, 55, 35, 15}` exactly once.
- Home genre is always **100**.
- Weighted GenreFit uses `GENRE_CAPACITY_WEIGHTS`:
  - Tier 1: `[1.0]`
  - Tier 2: `[0.80, 0.20]`
  - Tier 3: `[0.60, 0.30, 0.10]`
  - Tier 4: `[0.45, 0.30, 0.15, 0.10]`
- Quality modifier: `0.70 + (GenreFit/100) × 0.40`
- Math lives in [`genreFit.ts`](../src/lib/game/content/genreFit.ts); UI does not re-implement.

## Progressive exposure (Garage)

| Slot | Start values |
|------|----------------|
| Topics | Space, Fantasy, Racing, Dungeon (4) |
| Genres | Action, Adventure |
| Platforms | PC, Commodore, TES |
| Engine | Basic 2D Graphics V1 |

Remaining topics unlock via research from the full 132 catalog. Platforms unlock by timeline year + license.

## Office unlock (Garage → Small Office)

Configured on `OFFICE_INFO[1]`:

- Fans: 25,000  
- Games released: 5
- Cash on hand: $1,000,000
- Earliest move: Year 2, Month 10
- Move cost: $1,000,000

UI shows progress + **Move to Office** when met. Employees / office interior not built.

## Save schema

- `SAVE_VERSION` / `SCHEMA_VERSION` = **5**
- Key: `studio-empire-save-v5` (loads v4/v3/v2/v1 if present)

## Validation

`npm run test:scoring` includes `contentCatalog.test.ts` (counts, normalizations, Military 92.5, Fantasy 97, engine list).
