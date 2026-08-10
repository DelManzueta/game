# GDT Canon (Studio Empire)

Source: master reference — weeks/months/years, phase pacing, shelf decay, fans, reviews.

| Size | Phase weeks | Total dev | Shelf life |
|------|-------------|-----------|------------|
| Small | 1.33×3 | 4 | 12 |
| Medium | 2.66×3 | 8 | 24 |
| Large | 4×3 | 12 | 36 |
| AAA | 5.33×3 | 16 | 48 |

**Review:** `((T+D)/hist)×7×M_combo×M_plat − bugs×0.1` clamped 1–10  
**Hist:** `0.7×old + 0.3×points` floor 10  
**Weekly sales:** `Base × (score/10)^2.5 × (1−t/L)^2 × hype`  
**Fans:** `units×0.05×((score−5.5)/4.5)`  

Code: `gdtCanon.ts` · production SWU linear size factors · `classicGdt` shelf schedules
