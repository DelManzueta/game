# Studio Empire — Checkpoint 0 + 1 Build Report

**Date:** 2026-08-07  
**Authority:** Full Campaign Progression Bible v1.0  
**Status:** STOP for Del’s review — do not start Checkpoint 2 without sign-off

---

## 1. Exact scope completed

### Checkpoint 0 — Protect the existing Garage
- Feature flags for all later checkpoints (`firstOfficeEmployees` … `verticalUxPass` = **false**)
- Garage loop untouched (develop / release / sales / research / contracts)
- Founder remains a distinct entity with **no employee-energy drain**
- UI still consumes view-models / dispatches commands only

### Checkpoint 1 — Progression & office foundation
- Campaign modes `classic_35` / `legacy_50` + dual-clock industry year mapping
- `StudioProgressionState` (schema v1) on `GameState`
- Data-driven office ladder **1 → 4 → 5 → 6 → 8 total HQ seats**
- HQ seat model (founder seat role-locked)
- Office offer state machine: hidden → discovered → eligible → offered → deferred → accepted → completed
- Garage → First Office only (proofs, liquid cash, runway, construction)
- Move transaction: reserve funds → construction weeks → atomic capacity change
- Ledger entry for move deposit (`category: "office"`)
- Save migration from legacy `office` field
- Player-facing office goal card + **Office offer modal** (accept / decide later)
- Cheat pack `office_ready` seeds bible proofs and opens offer

**Not built (correctly dark):** hiring, energy, training, Tier 3+, labs, AAA, MMO, campus, directors.

---

## 2. Files added / changed

### Added
| Path | Role |
|------|------|
| `src/lib/game/progression/types.ts` | Domain types |
| `src/lib/game/progression/featureFlags.ts` | CP flags |
| `src/lib/game/progression/campaign.ts` | Modes + industry clock |
| `src/lib/game/progression/offices.ts` | Office defs + transitions |
| `src/lib/game/progression/seats.ts` | HQ seats |
| `src/lib/game/progression/offers.ts` | Proofs + offer machine |
| `src/lib/game/progression/move.ts` | Accept / defer / complete |
| `src/lib/game/progression/factory.ts` | Create + migrate |
| `src/lib/game/progression/index.ts` | Barrel |
| `src/lib/game/__tests__/progressionCp01.test.ts` | §36.1–36.2 domain tests |
| `docs/CHECKPOINT_0_1_REPORT.md` | This report |

### Changed
| Path | Change |
|------|--------|
| `src/lib/game/store.ts` | progression init/load/tick/accept/defer; office_ready cheat |
| `src/lib/game/viewModels.ts` | `officeGoal` from progression proofs |
| `src/lib/game/types.ts` | `modal: "officeOffer"`; `progression?` |
| `src/lib/game/data.ts` | `OFFICE_INFO` bible capacities / costs |
| `src/lib/game/commercial/config.ts` | `FIRST_OFFICE_GATE`, seats, RP tables |
| `src/lib/game/commercial/gates.ts` | First-office gate (safe releasedGames) |
| `src/components/game/GameApp.tsx` | Goal card + `OfficeOfferModal` |
| `src/lib/game/__tests__/commercial.test.ts` | Bible constants (1k fans, $150k move, seats) |
| Art / `roomArt.ts` / `USER_ART_MAP.md` | User HQ photos (prior turn) |

---

## 3. State / schema changes

```ts
GameState.progression?: StudioProgressionState
// schemaVersion, campaign, studioTier, tenureWeeks, techParkTenureWeeks,
// hqSeats[], offers{}, activeMove, flags{}

ModalId += "officeOffer"
SAVE_VERSION remains 5 (progression optional; migrated on load)
```

Legacy saves without `progression` map `office` → tier and mark first_office completed if `office >= 2`.

---

## 4. Commands / events added

| Command | Effect |
|---------|--------|
| `acceptOfficeOffer()` | Runway + cash checks; reserve $150k; start 2w construction |
| `deferOfficeOffer()` | Freeze economics; state `deferred`; reopen anytime |
| `upgradeOffice()` | Routes to accept path when `officeFoundation` on |
| Weekly tick | `tickTenure` → `tickActiveMove` → `tickOfficeOffers`; auto-modal once when newly offered |

No free employees on move completion. Staff list unchanged (founder only).

---

## 5. Config values (bible §4.3 initial tuning)

| Transition | Proofs | Liquid | Cost | Tenure | Runway | Build |
|------------|--------|--------|------|--------|--------|-------|
| Garage → FO | 5 releases, 1k fans, profitable title, +13w OCF, CY3+ | $1,000,000 | $150,000 | 0 | 26w | 2w |

HQ seats: Garage **1**, First Office **4**, Upgraded **5**, Tech Park **6**, Campus **8**.

---

## 6. Save migration behavior

1. `loadGame` always injects `migrateStudioProgression(data.progression, data.office)`.
2. Missing blob → create from legacy office tier.
3. Existing blob → merge schema + flags.
4. Active construction / deferred offers survive save/load via progression blob.

---

## 7. Automated tests

```text
progressionCp01.test.ts     15 pass
commercial + garageIntegrity + save  (with CP1)  59 pass (suite batch)
```

Covered: campaign modes, dual clock, seat ladder, proofs, cash-without-proof, proof-without-cash, defer freeze, accept reserve once, complete → 4 seats no free hire, date-alone never grants tier, migration.

---

## 8. Manual player path tested (browser)

1. New Campaign → garage with bible **Office goal** proofs (1k fans / 5 games / $1M + full checklist).
2. Menu → Cheats → **Office-ready pack** → all proofs ✓ + offer modal.
3. **Decide later** → card becomes “Office offer ready” + **View office offer**.
4. **Accept move** → cash $1.20M → $1.05M; “Move in progress / keys week N”.
5. Advance ~2+ weeks → construction completes; office goal card gone; capacity tier 2 (no free staff).
6. Console: no uncaught errors on path.
7. Mobile 390×844: garage goal card readable.

Screenshots: `screenshots/cp01-*.png`.

---

## 9. Screenshots (changed player-facing states)

| File | State |
|------|--------|
| `screenshots/cp01-garage-proofs.png` | Fresh garage + proof list |
| `screenshots/cp01-cheats.png` | CheatMod |
| `screenshots/cp01-office-offer.png` | Offer modal (capacity / cost / runway) |
| `screenshots/cp01-deferred.png` | After decide later |
| `screenshots/cp01-after-accept.png` | Move in progress |
| `screenshots/cp01-tier2.png` | Post-construction garage home |
| `screenshots/cp01-mobile.png` | Mobile viewport |

---

## 10. Known limitations

- Hiring / staff UI still locked (Checkpoint 2) — intentional.
- Later office offers (Tier 3–5) defined in data but not tick-evaluated.
- Runway formula uses trailing 13-week ledger OCF; thin ledgers use revenue proxy.
- Pre-existing garage content catalog platform-count drift (test suite historical) not changed.
- Event system can pop during construction weeks (existing garage events).
- Production build not re-verified this turn (dev path + domain tests verified).

---

## 11. Authoritative calculations outside UI

**Confirmed.** `GameApp` / `OfficeOfferModal` only read `studioOverview` / offer view and call `acceptOfficeOffer` / `deferOfficeOffer`. Proofs, affordability, runway, and seat capacity live in `src/lib/game/progression/*`.

---

## 12. Founder outside employee-energy logic

**Confirmed.** Tick still forces founder energy 100; hire path requires office ≥ 2 / unlock; move adds no employee records.

---

## 13. No future checkpoint faked

**Confirmed.** Feature flags for CP2–10 are **false**. No empty R&D / Hardware / AAA / MMO / Campus destinations. Offer modal text states hiring unlocks at next checkpoint.

---

## 14. STOP for Del’s review

Checkpoint 0 + 1 complete per bible stop conditions:

- Garage path intact with flags.
- Real garage save can earn, defer, accept, save during construction, and complete first-office transition **without fake employees**.

**Awaiting Del sign-off before Checkpoint 2 (First Office employees).**
