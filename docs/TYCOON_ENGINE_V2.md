# TYCOON-ENGINE CORE v2.1.0 — Studio Empire binding

**Status:** Frozen production spine  
**Code:** `src/lib/game/tycoonEngine.ts` + `classicGdt.ts` release path

## State (Module 1)
| Spec | Game field |
|------|------------|
| cash 75_000 | `cash` start |
| monthly_rent 8000 | `OFFICE_INFO[1].rent` |
| historical_average 35 | `targetHighScore` |
| current_hype | `hype` |
| owned_licenses | `unlockedPlatforms` |

## Math (Module 2)
```
COMBO ∈ {1.3, 0.7, ~0.95}   // hard pairs + soft
Review = clamp(round((points/hist)×7.0), 1..sizeMax)  // slider/bug damp only
hist'  = hist×0.7 + points×0.3
Units  = round(points × review^2.3 × 15 × (1+hype/100) × platform_share)
Net    = units × price × 0.85
```

## Tick (Module 4)
1. week++  
2. hype -= max(1, floor(hype×0.12))  
3. staff energy −5 or rest +25  
4. month end: rent + payroll  
5. year end: calendar++  

## Save
Browser local save already freezes campaign seed, scores, sales plans, pending events.  
No separate LLM text save protocol needed — use in-game **Save campaign**.

## Interaction (Module 5)
Player-driven: Studio command strip + dock. Clock advances only when speed > 0 or player acts.
