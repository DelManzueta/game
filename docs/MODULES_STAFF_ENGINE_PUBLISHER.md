# Modules: Staff AI · Engine Builder · Publisher Contracts

Mapped from the three Python expansion modules into Studio Empire.

## 1. Hiring & Employee AI
- Candidates: `refreshCandidates` / `generateStaff` (skill → salary)
- Hire: signing package, desk capacity from office
- Weekly: energy −5 while developing; ≤20 forced rest (+25, no points)
- Output: `generateWeekPoints` scales by energy; tired staff skip work
- UI: People → energy bars, monthly payroll, hire/fire/train

## 2. Custom Game Engine Builder
- Workshop: pick modules, purpose, architecture → build over weeks
- Released versions immutable; techBonus / designBonus on engine
- Boosts applied every development week as designBoost/techBoost
- UI: Engines → build progress, version bonuses

## 3. Publisher Contract Generator
- Board: `publishingBoard` offers (upfront, min score, royalty, genre/size)
- Sign: cash advance now; settle on release (royalties or 50% penalty)
- Freelance contracts remain for side cash/RP
- UI: More → Contracts

## Master loop (in-game)
Studio develop → stages/sliders → release → reviews/sales  
More → People / Engines / Contracts  
Market → calendar/charts · Systems → platforms  
