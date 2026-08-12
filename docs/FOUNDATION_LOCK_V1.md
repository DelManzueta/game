# Foundation Lock v1 — sealed

Branch: `grok/foundation-lock-v1`
Status: **ready for Codex final build handoff**

## Authority
React/Zustand Studio Empire only. Experimental HTML/Python/NEONCORE IDEs quarantined from the product surface (may remain under `public/` / `scripts/` as non-authoritative archives).

## Clock
Writable `week`; year/month derived. Polish → `advanceWeek` → settlement `tick`.

## Economy
`applyCashTransaction` / `commitTxn` for rent, payroll, project start, publisher advances, and all cash mutations.
Invariant: `cash === ledger.balance` after settlement. No reconciliation safety-net entries.

## Scoring
Player `targetHighScore` / historical average updates only on **player** release. Rivals do not mutate the player target.
No projected lifetime fans or publisher cash at release. Weekly fans and publisher shares use **actual** weekly sales.

## Phase One (Garage)
Blocked in UI **and** commands while `isGaragePhaseOne`:
- publishers / publishing board ticks
- recruitment / candidate boards
- hardware / workbench / consoles
- Netflix / streamers / conventions / NeonStore
- illicit assets / litigation
- mid-dev crisis events
- content-pack install

Marketing may influence awareness/sales only — never critic quality.

## Marketing
Persisted opportunity state machine (`marketingOpportunities.ts`): scheduled windows, dark-year history, resolve-once.

## Identity / determinism
No empty `uid("prefix")` calls. IDs = campaign seed + stable event/entity parts.
Candidate boards derive from persisted seed + board ordinal + index.
Save/load and mid-run export/import replay produce identical IDs and outcomes.

## Save keys
- Schema version **6** (`studio-empire-save-v6`)
- `ALL_SAVE_KEYS` in `contracts.ts` (v6→v1) = `SAVE_KEYS` in `save.ts`
- Zod `parseSaveCandidate` boundary on load/import
- Multi-slot keys + legacy single-key discovery via `findSave` / `removeAllSaves`

## First Office (CP01)
Gates unchanged: 5 releases, 1k fans, profitable title, OCF, campaign year 3+, liquid cash, move cost, HQ seats.

## Ops absorbed from Codex phase-a (without merging that branch)
- `startup.sh` resolves package.json root (workspace vs nested layout)
- `.gitignore` covers deploy artifacts (`.output/`, `.wrangler/`, …)
- `ALL_SAVE_KEYS` centralized and **used** (not dead export)

**Do not merge** draft PR `fix/phase-a-foundation` — it is based on a Jul 31 export, regresses schema to v5, and is incomplete.

## Verification (green at seal)
```text
npm ci
npm ls
npm run typecheck
npm test          # 256 pass
npm run lint      # 0 errors
npm run build
git diff --check
node --import tsx scripts/foundation-campaign-trace.mjs
```

## Out of scope (Codex owns next)
Employees, later offices, hardware, Netflix, storefronts, conventions, UI redesign, new algorithms.
