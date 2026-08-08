# Studio Empire — Progression & UI Architecture

Status: **Partial live** — unlock registry + CP0/CP1 office ladder wired; later CPs flag-dark.  
Preserves: scoring engine, develop-week sim, experience, existing store loop.

See [PROGRESSION_UNLOCKS.md](./PROGRESSION_UNLOCKS.md) for the live unlock state machine.

---

## 1. Current inventory (inspected)

| Area | Location | Notes |
|------|----------|--------|
| Game loop | `store.ts` tick / startProject / release | Week tick, payroll, develop, sales residual |
| Scoring | `scoring/qualityEngine.ts` | GDT pipeline, target high score, 4 critics |
| Experience | `scoring/experience.ts` | Weekly field XP + release bonus |
| Research | `data.ts` RESEARCH + store.researchItem | Flat flags, not progressive disclosure |
| Unlock flags | `GameState.flags` | multiGenre, sequels, marketing, etc. |
| Save | localStorage `studio-empire-save-v1` | Partial state blob, weak migrations |
| UI | `GameApp.tsx` (~1.2k lines) | Isometric GDT cream theme — to be replaced |
| Navigation | Modal-driven | No left nav shell yet |

**Keep intact:** quality engine, developWeek point gen, sales from hidden score, XP-while-developing.

**Replace later:** flat unlock flags → ProgressionService; modal soup → shell + panels; cream isometric → dark premium 2D.

---

## 2. Target architecture (simulation independent of React)

```
src/lib/game/
  progression/
    types.ts              # UnlockState, UnlockDef, CampaignConfig
    unlockRegistry.ts     # load + validate config, cycle detection
    progressionService.ts # evaluate reveal/unlock, emit events
    researchService.ts    # start/complete research jobs
    knowledgeService.ts   # report discoveries (compat knowledge)
    eraService.ts         # industry eras + date gates
    tutorialDirector.ts   # contextual tips, once-only
    notificationQueue.ts  # grouped unlock banners
    saveMigration.ts      # schema version bumps
  config/
    unlocks/*.json        # or TS modules of UnlockDef[]
    campaignPresets.ts    # 30/40/60 yr, difficulty, info mode
  scoring/                # KEEP
  simulation.ts           # KEEP core; call progression hooks from store
  store.ts                # thin orchestrator over services
```

### Unlock state machine

`HIDDEN → TEASED → DISCOVERED → RESEARCHABLE → RESEARCHING → OWNED → IN_ENGINE → MASTERED`

UI never checks year/cash/games itself. It only consumes:

```ts
progression.getNavSections()
progression.getDockActions()
progression.getResearchCatalog() // filtered by visibility
progression.getAvailableProjectOptions()
```

### Campaign config (new game)

- founderName, studioName, appearanceId  
- seed (deterministic market/rivals)  
- lengthYears: 30 | 40 | 60  
- difficulty: easy | normal | hard  
- infoMode: classic | assisted | analyst  
- feature flags per phase for staged rollout  

### Save additions (migrate v1 → v2)

```ts
progression: Record<UnlockId, UnlockState>
knowledge: { topicGenre: ..., platformGenre: ..., ... }
tutorialDone: string[]
campaign: CampaignConfig
industryEra: number
mastery: Record<techId, number>
schemaVersion: number
```

### Phase feature flags (build order)

1. `prog.garage` — starting restrictions + first tutorial  
2. `prog.reports` — knowledge service  
3. `prog.engines` — custom engines  
4. `prog.office` — hire/staff  
5. `prog.medium` — medium + publishing  
6. `prog.large` — large + multi  
7. `prog.rnd` — R&D  
8. `prog.aaa` — AAA + post-release  
9. `prog.hardware` — console lab  
10. `prog.endgame` — score / endless  

---

## 3. UI architecture (premium 2D, replaceable studio viz)

```
src/components/game/
  shell/
    GameShell.tsx       # top bar + left nav + dock
    TopStatusBar.tsx
    LeftNav.tsx         # only unlocked sections
    ActionDock.tsx      # contextual
  screens/
    StudioDashboard.tsx
    DevelopScreen.tsx
    GamesScreen.tsx
    StaffScreen.tsx
    ResearchScreen.tsx
    MarketScreen.tsx
    FinancesScreen.tsx
  panels/               # modular cards
  studio-viz/
    StudioViz2D.tsx     # current production viz (swappable later for isometric)
  design/
    tokens via styles.css @theme
```

**Visual system:** deep charcoal, warm off-white type, single electric accent (cyan-lime electric), semantic Design/Tech/Research/Cash/Warn colors, editorial numerals, thin borders, no glassmorphism, no isometric for now.

**Era theming:** CSS data-era attribute changes accent texture/grid only; layout stays stable.

---

## 4. Implementation order (after mockup approval)

1. Design tokens + shell (from approved mockups)  
2. Progression types + registry + service (garage unlocks only)  
3. Save v2 + migration  
4. Restrict new game to garage payload  
5. First-game walkthrough  
6. Wire knowledge reports  
7. …phases behind flags  

Automated tests from the brief land under `src/lib/game/__tests__/progression*.test.ts`.

---

## 5. Explicit non-goals for this milestone

- Full R&D / MMO / Hardware / AAA simulation  
- Isometric studio  
- Replacing quality engine formulas  
