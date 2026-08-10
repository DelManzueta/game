# Foundation Lock v1 (corrected)

Branch: `grok/foundation-lock-v1`

## Authority
React/Zustand Studio Empire only. Experimental IDEs quarantined from product surface.

## Clock
Writable `week`; year/month derived. `workPolishWeek` → `advanceWeek` → `tick`.

## Economy
`applyCashTransaction` / `commitTxn` for rent, payroll, project start, publisher advances.
Invariant: `cash === ledger.balance` after settlement (reconciliation safety net).

## Scoring
Player `targetHighScore` updates only on player release. Rivals do not mutate it.
No IP review boost. No projected lifetime fans at release.

## Phase One
Garage: no publishers, Netflix, hardware, NeonStore, MMO, consoles, crises, awards.
Feature flags remain off after office 2 until explicitly enabled.

## Marketing
Persisted opportunity state machine (`marketingOpportunities.ts`): ≤2/year, dark year after doubles.

## First Office (CP01)
5 releases, 1k fans, profitable title, OCF, campaign year 3+, $1M liquid, $150k move, 4 HQ seats.
