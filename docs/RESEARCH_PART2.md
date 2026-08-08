# Research, Features, Topics, Events, Pricing, Difficulty, Hardware (Part 2)

## Foundational rule

Research is a **pipeline**, not a purchase menu.

```
Unknown → Observed → Researchable → Researching → Prototype
  → Engine integration → Production ready → First commercial use
  → Mature → Legacy → Deprecated → Sunset
```

Researching proves understanding. Shipping well still needs people, time, integration, budgets, and QA.

## Modules

| Path | Role |
|------|------|
| `research/catalog.ts` | Reclassified 22+ features (design vs engine vs legal) |
| `research/lifecycle.ts` | Company tech knowledge state machine |
| `research/importance.ts` | Genre base × topic tags × project pillar |
| `research/pricing.ts` | Per-product immutable pricing |
| `research/difficulty.ts` | Creative / Standard / Executive knobs only |
| `research/events.ts` | Decision events with tradeoffs |
| `hardware/` | Proprietary hardware with **bottlenecked** axes |

## What difficulty may / may not change

**May:** cash, forecasts, competition, wages, cert strictness, event severity, estimate noise.

**Must not:** topic–genre meaning, tech physics, which fields matter for a well-designed game.

## Pricing

Price is per release, frozen at ship. It moves demand/value — **not** review quality formulas.

## Hardware

Components unlock by era. Platform capability = **min of relevant axes**, never an average of CPU+GPU+RAM.

## Continuous loop

Industry → observe tech → research → prototype → integrate → staff learn → ship → QA/optimize → mature → platforms advance → legacy/replace.
