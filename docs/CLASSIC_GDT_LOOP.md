# Classic GDT loop (Studio Empire spine)

Aligned to the modular text-engine blueprint (points / historical average / combo / sales).

## Formulas

```
score_ratio = (design + tech) / historical_average
raw_score   = score_ratio × combo × 7.5 × sliderFit × bugFit
final       = clamp(1 … sizeMax)     # small max 7.5
historical  = historical × 0.7 + total_points × 0.3   # after each release

units       = (design + tech) × review^2.2 × 12 × size × platform × combo
net         = units × price × 0.85   # 15% platform tax
fans        = units × 0.05 × (review / 10)
```

## Player loop

1. Topic / Genre / Platform / Audience  
2. Phase sliders (match genre focus — flat sliders hurt)  
3. Develop weeks → Design + Tech points  
4. Release → reviews + unit plan + historical bar rises  
5. Weekly sales graph from plan  

## Expansion modules (data already in game)

| Blueprint | Studio Empire |
|-----------|----------------|
| Office ladder | `OFFICE_INFO` + progression offers |
| Research nodes | `RESEARCH` + tech pipeline |
| Reviewer quotes | `REVIEWER_QUOTES` in `classicGdt.ts` |
| Engine builder | Engines workshop |
| Staff | Staff screen + design/tech skills |

Implementation: `src/lib/game/classicGdt.ts` (release path in `store.ts`).
