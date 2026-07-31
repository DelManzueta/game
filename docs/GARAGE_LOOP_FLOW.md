# Studio Empire — Garage Phase Game Loop

Authoritative player loop for the founder-only Garage vertical slice.

## Status (phase complete)

| Deliverable | Status |
|---|---|
| Frozen contracts (schema v3, OutcomeTrace, knowledge) | Done |
| `productionStage` vs `genreCapacityTier` naming | Done |
| Focus allocation (normalize to 100) | Done |
| Deterministic outcome trace | Done |
| Garage content slice (~12 topics, 3 platforms, 6 genres) | Done |
| Layered scoring pipeline | Done |
| Bounded expectations (no secret next-game punish) | Done |
| Game Reports + persistent knowledge | Done |
| Policy tests harness | Done (`garagePolicy.test.ts`) |
| Garage UI shell + Pre-Release + Cancel | Done |

**Success criteria proven in store integration:** three games, knowledge inheritance, no stage advance without confirm, reviews on release / sales after ≥1 week, cancel path, founder energy always 100, save/load identity for reviews & sales plan.

## Player loop (mandatory sequence)

```mermaid
flowchart TD
  A[Campaign create] --> B[Plan game]
  B --> B1[Topic · Genre · Platform]
  B1 --> B2[Audience when unlocked]
  B2 --> C1[Stage 1 Config]
  C1 --> D1[Stage 1 Develop]
  D1 --> C2[Stage 2 Config]
  C2 --> D2[Stage 2 Develop]
  D2 --> C3[Stage 3 Config]
  C3 --> D3[Stage 3 Develop]
  D3 --> E[Polish / bug fix]
  E --> F[Pre-Release]
  F --> F1[Final title + price]
  F1 --> G{Release or Cancel}
  G -->|Release| H[Reviews]
  G -->|Cancel| K[Knowledge retained · costs sunk]
  H --> I[Weekly sales long-tail]
  I --> J[Game Report]
  J --> L[Persistent knowledge]
  L --> B
  K --> B

  classDef player fill:#2f6fed,color:#fff,stroke:none
  classDef auto fill:#ebe9e2,color:#1c1f26,stroke:#b8b4a8
  classDef decision fill:#c98512,color:#fff,stroke:none
  class C1,C2,C3,F1,G player
  class D1,D2,D3,E,H,I,J auto
  class G decision
```

**Rules**

- Simulation **never** picks stage sliders or advances a stage without player confirm.
- Pre-Release is required: title + launch price before Release.
- Reviews appear only on release; first sales apply on the next market week.
- OutcomeTrace freezes quality, reviews, and sales plan — load never re-rolls.
- Cancel sinks cost but still records a knowledge lesson.
- Founder has no energy meter (always available).
- Price does not change product quality — only revenue.
- Hits raise opportunity/scrutiny, not a secret quality penalty on the next title.
