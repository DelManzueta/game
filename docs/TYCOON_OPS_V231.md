# TYCOON OPS v2.3.1 — UI / edges / piracy

## Module 14 — UI
**Studio Empire browser app is the production UI.**  
The single-file `game.html` sample is a mini demo only; do not replace the full game with it.

## Module 15 — Edge cases
- Cash/fans stored as whole numbers after each week
- `targetHighScore` (historical average) **never below 10**
- Cash **< $0** pauses the clock; deep debt + no revenue → game over

## Module 16 — Piracy & DRM
Desk → **DRM / copy protection**
| Tier | Mitigation | Unlock |
|------|------------|--------|
| None | 0% | free |
| Serial keys | 25% | 20 RP |
| Online check | 60% | 80 RP |
| Always-online | 95% | 200 RP |

Theft rate scales with fans. Always-online costs **5% of legit buyers as fans**.

Code: `tycoonPiracy.ts`
