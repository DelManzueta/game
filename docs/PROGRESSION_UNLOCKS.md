# Progression unlock mechanics (refined)

**Status:** Live domain  
**Authority:** [FOUNDATIONAL_CORE.md](./FOUNDATIONAL_CORE.md) + unlock registry  

## Model

Every system capability uses:

`hidden → teased → discovered → researchable → owned`

| State | Player meaning |
|-------|----------------|
| hidden | Not shown |
| teased | Foreshadowed (industry / office path) |
| discovered | Visible as locked with requirements |
| researchable | Can start the research / unlock path |
| owned | Fully usable |

## Source of truth

| Piece | Path |
|-------|------|
| Declarative defs | `src/lib/game/progression/unlockRegistry.ts` |
| Evaluate + migrate | `src/lib/game/progression/service.ts` |
| Commercial checklists | `src/lib/game/commercial/gates.ts` |
| Office offer ladder | `src/lib/game/progression/offers.ts` |
| Checkpoint darkness | `src/lib/game/progression/featureFlags.ts` |

UI and store **must not** invent ad-hoc year/cash-only unlocks for major systems.

## Multi-condition law

Major unlocks require **several** of:

- Office / studio tier  
- Releases / fans / profitable title  
- Research completed  
- Team size  
- Industry year (when historically required)  
- Prior system owned (ports → multi-platform, MMO → online)

**Never** calendar alone. **Never** cash alone.

## Soft pre-checkpoint systems

While later checkpoints are dark, these may still soft-unlock so the continuous arc does not hard-stop after First Office:

- `hiring`, `training`, `medium_games`, `post_release`

R&D, hardware, AAA, online, MMO stay **hidden** until their feature flags flip — they remain **core** content, not expansion packs.

## Continuous arc mapping

| Arc step | Unlock / gate |
|----------|----------------|
| Garage | research, engines owned; PC+Itara |
| First releases | market, reports, contracts, publishing |
| First office | hiring, training; medium researchable |
| Established | sequels, audience, marketing, multi_genre, ports path |
| Upgraded office | large_games |
| Tech park | rnd, hardware (flag), aaa path |
| Online empire | online, mmo (flag) |
| Campus / endgame | consoles, directors (flag) |

## API for UI

```ts
evaluateProgression(state)           // apply after release / hire / move / research
isOwned(state, id)
isUnlockVisible(state, id)
describeUnlockRequirements(id, state)
isTechVisible(researchItem, state)
evaluateAllGates(state)              // checklist view-models
```
