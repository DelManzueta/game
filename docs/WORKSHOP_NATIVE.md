# Workshop-native modules (v2.5.0)

Mechanical cores inspired by Steam Workshop expansion themes — **original Studio Empire systems**, not ports of Workshop files / UltimateLib.

## A — T-Engine Modular Framework
More → Engines → **Attach T-Engine** ($500k + 150 RP)
- −50% bugs at scoring
- +0.5 review if 3D graphics path active

## B — Genre expertise
Every ship +1 genre EXP. Level = 1 + floor(EXP/5).  
Production points × (1 + level×0.05). UI under Engines panel.

## C — Expansion platforms
Licensable when year reached: Super TES, Vena Genesis X, mBox 360, Playsystem 3, **Pip-Phone** (new). Costs/shares tuned toward workshop-style mid/late ceiling.

## D — Telemetry ledger
Each ship appends `gameHistoryLedger`. Post-mortem shows ROI, profit, rival pressure note.

## E — EXECUTE_CHEAT
CheatMod modal command line:
- `/money_boost` +$5M
- `/rp_max` RP=999
- `/instafans` fans×5
- `/bug_wipe` bugs=0

Code: `workshopMods.ts`
