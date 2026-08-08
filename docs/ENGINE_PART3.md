# Engine development (Core design Part 3)

Implemented under `src/lib/game/engine/`.

## Hierarchy

| Object | Role |
|--------|------|
| **Engine family** | Long-term lineage (purpose, architecture, shared debt, reputation) |
| **Engine version** | Immutable release (modules, adapters, stability, features) |
| **Module** | Capability unit with deps, conflicts, runtime demand |
| **Platform adapter** | Version ↔ platform binding |
| **Game–engine snapshot** | Frozen at project start; later upgrades never rewrite it |

## Player loop

1. **Engine Workshop** screen — browse families/versions; start a version build.
2. Choose purpose, architecture, modules (deps auto-resolved; soft conflicts add work).
3. Weekly tick applies **team capacity** (skill × familiarity × tools × energy) to required work.
4. On completion, version is **immutable** and added to `engines[]` for project selection.
5. **New game** captures `engineSnapshot` (multi-axis suitability + debt) on the project.

## Invariants (enforced)

1. Research ≠ integration ≠ game implementation (modules unlock capability only).
2. Released versions are immutable.
3. Existing games keep historical snapshots.
4. Suitability is multi-axis (gameplay / platform / scale / performance / tools / team / online / support) — not one green number.
5. Technical debt slows future work first; reviews only via player-facing bugs/perf.
6. Money buys staff/time — not free completed engineering.

## Garage start

- Family **Workbench**, version **Basic Engine 1.0** (stable, monolithic, fast_2d).
- Modules: core runtime + 2D sprites.
- Suitable for small projects; weak for AAA / online.

## API surface

- `startEngineVersion` / `buildEngine` (store)
- `tickEngineBuild` on weekly tick
- `captureGameEngineSnapshot` on `startProject`
- Tests: `src/lib/game/__tests__/enginePart3.test.ts`
