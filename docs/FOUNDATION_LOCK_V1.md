# Foundation Lock v1

**Branch:** `grok/foundation-lock-v1`  
**Authority:** React/Zustand Studio Empire only (no IDE/HTML/Python product surface).

## Clock
- Writable authority: absolute **`week`** (campaign week).
- **year / month** derived via `weekToDate(week, START_YEAR)`.
- One settlement path: `tick()` / `advanceWeek()` / `workPolishWeek()` → same weekly tick.

## Scoring
- Classic GDT spine (`classicReviewScore` / store release path).
- Hist: `old×0.7 + points×0.3` once per finalized release.
- Marketing / IP / streamers **must not** add critic points (IP review boost removed).

## Sales
- Authoritative: classic_gdt weekly shelf plan on the released title.
- No projected lifetime fans or royalties at release.
- Release day cash = 0; first sales after market weeks tick.
- No permanent 5-unit floor in storefront processor.

## Currency
- **Still dollar floats** with `moneyRound` (2dp) at transaction boundary.
- Full integer-cents migration **deferred** (would require save v7 + full rewrite).
- `applyCashTransaction`: duplicate `ref` blocks cash **and** ledger.

## Phase One quarantine
Hidden and non-ticking in Garage (`office <= 1`): Netflix IP reviews boost, streamers, conventions, NeonStore, hardware merch, consoles, MMO, quality crisis, G3 awards, trademark litigation.

## Marketing
- ≤2 purchases per campaign year in Garage.
- Year after a 2-purchase year is dark.

## Office
- Garage: **small only**.
- First-office proofs remain CP01 multi-proof path (`progression/offers.ts`).
