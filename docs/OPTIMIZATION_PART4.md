# Optimization, QA, Performance, Certification (Core design Part 4)

Implemented under `src/lib/game/optimization/`.

## Foundational rule

**Optimization does not make a bad design good.** It makes the intended game run on target hardware. Design, story, and concept scores stay separate from technical health.

## Systems

| System | Role |
|--------|------|
| **Performance budgets** | Per-platform CPU/GPU/memory/I/O/network/battery/thermal/server targets + FPS |
| **Utilization bands** | <0.75 comfortable · 0.75–0.9 healthy · 0.9–1 tight · 1–1.15 over · >1.15 critical |
| **Runtime health** | Weighted geometric mean of **relevant** axes, capped by weakest critical axis |
| **Estimates** | Ranges with confidence (never exact day-one knowledge) |
| **Optimization tasks** | Engineering / content / quality compromise / (emergency) — no magic “Optimize” button |
| **Bug classification** | Blocker → cosmetic, priority formula, cert/save/security flags |
| **Hidden defect risk** | Banded estimate — never exact undiscovered count |
| **Certification** | PC usually not required; consoles pass / waiver / fail |
| **Release readiness** | ship · ship_with_risk · hold · blocked |

## Player flow

1. New project creates a **tech spec** (FPS target, platform budgets).
2. During **Polish / Pre-Release**, profile refreshes from size, features, engine, bugs.
3. Over-budget axes spawn **optimization tasks** — work them weekly.
4. **Evaluate tech readiness** runs certification + gates.
5. **Platform fail blocks ship**; internal holds can be overridden with risk.
6. At release, **asymmetric technical review** adjusts scores modestly up / heavily down.

## Asymmetry (intentional)

Stable/performant games get a **small** review bonus. Technical disasters take a **large** penalty. Functioning is expected — not a substitute for design.

## Small-game rule

Garage / small projects use light machinery (simple budgets, optional tasks). AAA weights scale demand and QA pressure without requiring full enterprise UI.

## Tests

`src/lib/game/__tests__/optimizationPart4.test.ts`
