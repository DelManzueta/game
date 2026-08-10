# Definitive Hardcore Engines v4.0

## 1. Console launch formula
`units = (fans/4) × (tierBase/retailPrice)` · min 50  
Loss-leader (retail < mfg): **×2.5** · cash = units × (retail − mfg)

## 2. Reviewer quotes
Score ≥8.5 excellent · ≥5.5 mediocre · else terrible  
Outlets: All Games Beta, Game Hero, Informer, Star Games

## 3. MMO monthly
Subs = init × (1 − months/48)  
Rev = subs × $4.99 · Upkeep = (subs/1000)×$150  
Dead server when rev < upkeep · `shutdownMmo(id)`

## 4. Quality crisis (Stage 1 start)
| Roll | Code | Effect |
|------|------|--------|
| 1–10 | EVT_LEAK | +40 hype · −15 RP |
| 11–20 | EVT_CRASH | +2 weeks |
| 21–30 | EVT_COPY | $45k or −1.5 score |
| 31–100 | EVT_CLEAN | none |

Code: `hardcoreEngines.ts` · IDE: `/neoncore-v40.html`
