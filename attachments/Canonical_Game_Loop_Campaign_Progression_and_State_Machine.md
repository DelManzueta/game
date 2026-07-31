# Canonical Game Loop, Campaign Progression, and State Machine

## Implementation Authority

Use this document as the authoritative gameplay spine for the current game.

It does not replace the deeper Research, Technology, Engine, Employee, Market, or Review specifications. It defines when those systems are allowed to act, which state owns each result, and how they connect into a complete playable campaign.

When another document or the current build conflicts with this one on project state, campaign progression, time, release order, sales timing, cancellation, or save behavior, this document wins.

Preserve all working campaign data. Do not redesign the final UI during this pass. Grok owns simulation architecture, code, persistence, calculations, tests, and temporary functional screens. ChatGPT/Codex will later create the final UI direction and visual assets after the loop is stable.

Do not copy Steam Workshop code, text, assets, names, or balance data. Reproduce the genre's proven gameplay structure through original, native systems. Keep unfinished or deferred systems behind explicit configuration and feature flags. Do not expose a button for a system that does not work.

---

## 1. Core Product Requirement

The game must first succeed as a complete studio-management loop:

```text
Create Company
→ Choose and Define a Game
→ Plan Production
→ Develop Through Three Meaningful Stages
→ Fix Bugs and Polish
→ Release or Cancel
→ Receive Reviews
→ Accumulate Weekly Sales
→ Analyze a Game Report
→ Gain Knowledge, Money, Fans, and Mastery
→ Improve the Studio
→ Make a Meaningfully Different Next Game
```

The advanced technology loop sits inside that spine:

```text
Discover
→ Research
→ Prototype
→ Integrate
→ Build
→ Learn
→ Maintain
→ Upgrade or Replace
```

Every step must create a decision. No major result may occur because a screen opened, a React component rendered, a tooltip appeared, or the player revisited a page.

The first implementation milestone is not complete when the Research and Engine screens work. It is complete when a player can create a campaign, release three games, learn from them, survive financially, and reload the campaign without changing any outcome.

---

## 2. Non-Negotiable Rules

1. Campaign, project, employee, engine, market, and financial state must be persistent and deterministic.
2. The founder is a distinct entity. The founder does not use hired-employee energy.
3. The founder can perform work but can only hold one primary work assignment at a time.
4. All six main genres are available at campaign start: Action, Adventure, RPG, Simulation, Strategy, and Casual.
5. Multi-Genre, advanced genre structures, and specialized genre capabilities are researched later.
6. A new campaign begins with exactly four discovered starting topics, chosen deterministically from the valid starting pool.
7. A generated working title may be used during development, but release is blocked until the player deliberately confirms a final title.
8. Development duration comes from required work and production capacity. It is never a cosmetic timer.
9. Game-speed controls change real-time playback speed only. They do not change required work, results, risk, sales, or simulation opportunity.
10. Every development stage must remain visible long enough for the player to understand progress, production, bugs, and staff contribution.
11. Stage transitions require a real state transition and player confirmation. They cannot be skipped by a fast render loop.
12. Development completion enters Pre-Release. It does not release the game.
13. Pre-Release must allow continued bug fixing, final naming, launch pricing, release, and cancellation.
14. Releasing with known bugs preserves those bugs in the released build.
15. A game cannot receive reviews or sales before the Release transaction succeeds.
16. Reviews may appear immediately after release, but sales may only appear as market time advances.
17. First-week sales appear only after seven full simulation days on the market.
18. Release automatically resumes simulation at the last nonzero game speed.
19. Canceling an unreleased game preserves spent money, elapsed time, mastery, research findings, and studio knowledge.
20. Canceling or deleting an unreleased project never erases unrelated campaign state.
21. The launch price is chosen before release. The first post-launch price change becomes eligible after 28 simulation days.
22. Price changes affect future demand only and are recorded in immutable price history.
23. A game is not automatically removed from sale after roughly 14 weeks.
24. Marketing affects awareness and demand. It does not directly improve production quality or review quality.
25. Researching technology does not silently install it into an engine.
26. Updating an engine never alters a released game or an active project silently.
27. React components and selectors may present calculations. They may not own authoritative simulation rules.
28. The normal UI never exposes debug values or hidden exact formulas.
29. Distant locked systems are not displayed as disabled clutter. Navigation and choices appear when they become meaningful.
30. All warnings must correspond to an actual calculation and a possible consequence.

---

## 3. Canonical Time, Work, and Speed Units

The current build mixes visual animation, calendar movement, and development completion. Replace that ambiguity with these canonical units.

### 3.1 Simulation time

```ts
type SimDay = number
type SimWeek = number
type SimYear = number

const DAYS_PER_WEEK = 7
const WEEKS_PER_YEAR = 52
```

The authoritative simulation advances in whole simulation days. Weekly systems settle after each complete seven-day market interval. A campaign year contains 52 weeks.

Daily systems include:

- Development work.
- Employee energy and recovery.
- Research work.
- Engine integration work.
- Bug fixing.
- Marketing execution.
- Office and contract work.

Weekly systems include:

- Sales settlement.
- Payroll and rent accrual.
- Platform and market movement.
- Rival planning and production.
- Fan and reputation change.
- Financial runway warnings.

### 3.2 Standard Work Units

Use one unit across game projects, research, engine work, reports, contracts, and maintenance.

```ts
type StandardWorkUnit = number
```

One Standard Work Unit is the expected output of one competent, rested, properly equipped employee during one standard workweek at neutral difficulty and 100 percent task fit.

All work requirements and capacity must use this unit. Do not compare arbitrary design points to employee skill points or raw calendar weeks.

```ts
dailyContribution =
  baseWeeklyCapacity / 7
  * taskSkillFit
  * masteryModifier
  * energyModifier
  * toolModifier
  * leadershipModifier
  * interruptionModifier
```

Each modifier must be bounded and inspectable in Analyst or debug modes. No multiplicative factor may reduce valid contribution to zero unless the employee is unavailable, the task is unsupported, or the project is explicitly blocked.

### 3.3 Founder contribution

The founder has:

- Skills.
- Mastery.
- Task fit.
- One primary assignment.
- A weekly work-capacity value.

The founder does not have:

- Employee energy depletion.
- Employee recovery cycles.
- Sick leave generated by the employee-energy system.
- Burnout generated by that same system.

Future leadership attention may constrain the founder, but it must be a separate system. Until that system exists, the founder contributes stable capacity while assigned.

### 3.4 Playback speed

```ts
type PlaybackSpeed = 0 | 1 | 2 | 3

type PlaybackConfig = {
  realMillisecondsPerSimDay: Record<Exclude<PlaybackSpeed, 0>, number>
}
```

Recommended initial tuning:

- Pause: no simulation ticks.
- 1x: approximately one simulation day per real second.
- 2x: approximately two simulation days per real second.
- 3x: approximately four simulation days per real second.

The exact presentation rate is configurable. The resulting simulation state must be identical at every speed for the same seed and commands.

Opening a planning screen, release confirmation, consequential event, or stage transition pauses the simulation. Closing a non-blocking information screen does not change speed. After release, resume the last nonzero speed automatically.

---

## 4. Campaign Creation and Identity

Campaign creation must collect and persist:

```ts
type CampaignSetup = {
  playerName: string
  companyName: string
  founderAppearanceId: string
  campaignSeed: string
  difficulty: "relaxed" | "standard" | "challenging" | "expert"
  informationMode: "standard" | "assisted" | "analyst"
  campaignLengthYears: 30 | 40 | 60
  ruleset: "standard" | "pirate"
}
```

Requirements:

- Player Name and Company Name are separate fields and separate save properties.
- Neither may be silently copied into the other.
- Appearance is cosmetic and cannot affect simulation results.
- A blank seed generates one once and persists it.
- Campaign length changes timeline pacing, not fundamental rules.
- Difficulty changes configured pressure, tolerance, and information. It cannot secretly change unrelated UI behavior.
- Information Mode affects visibility and estimates, not results.
- Pirate Mode is a separate ruleset with piracy, DRM, and company-financing consequences. It must remain disabled until its complete ruleset exists.
- Every campaign with debug or cheat use persists a `cheatsEnabled` label permanently.

### 4.1 Starting state

The default campaign begins with:

- The founder working alone in a garage.
- One functional starter development toolkit or imported starter engine.
- All six main genres available.
- Four deterministic starting topics from the eligible early pool.
- Small games only.
- One platform choice from the active opening market set, subject to license affordability.
- One active production assignment at a time.
- Basic development, game history, finances, research discovery, save, and settings access.
- No visible R&D Lab, Hardware Lab, AAA, MMO, custom console, publishing empire, or other distant systems.

Starting topics must be selected by the campaign seed before the campaign screen renders. Reopening campaign creation or rerendering the topic selector cannot reroll them.

---

## 5. Campaign Timeline and Era Progression

The game supports 30, 40, and 60-year campaigns. Use one authored reference timeline and scale it. Do not maintain three contradictory calendars.

```ts
type TimelineEvent = {
  id: string
  referenceWeek40Year: number
  category: "platform" | "technology" | "market" | "tutorial" | "endgame"
  revealLeadWeeks: number
  eligibility?: EligibilityRule[]
}
```

For non-tutorial industry events:

```ts
scaledWeek = round(referenceWeek40Year * campaignLengthYears / 40)
```

The opening tutorial and first-office opportunity must not become painfully slow in a 60-year campaign. Author tutorial and initial progression milestones separately, with bounded opening windows. After the opening phase, the industry timeline scales normally.

Date progression may make a system historically possible, but it does not grant the studio the capability automatically. Major progression requires both industry availability and studio eligibility.

### 5.1 Progression phases

| Phase | Studio state | Core new decisions | Default eligibility |
| --- | --- | --- | --- |
| Garage | Founder only | Topics, genres, small games, contracts, starter research | Campaign start |
| Small Office | First hires | Hiring, training, team assignments, better contracts, custom engines | At least 3 released games, sustainable cash, minimum reputation, opening window reached |
| Established Studio | Multiple specialists | Medium games, publishing deals, stronger marketing, simultaneous support work | Office capacity used effectively, at least 8 released games, staff and financial thresholds |
| R&D Era | Dedicated research capability | Advanced technology, prototypes, architecture, major engine projects | Industry window, research record, suitable office, and studio capability |
| AAA and Post-Release Era | Large productions | AAA planning, larger teams, patches, deeper launch management | Proven large-game execution, strong finances, staffing, engine readiness |
| Hardware Era | Platform strategy | Hardware research, custom console planning, platform ecosystem | Late industry window, R&D maturity, extreme capital requirement |
| Endgame | Industry leader or survivor | Major projects, final valuation, awards, legacy decisions | Campaign timeline and studio state |
| Endless | Continuation | Continue without campaign victory pressure | Player chooses Continue after campaign completion |

All numeric thresholds belong in data configuration. The table defines dependency shape, not hardcoded React conditions.

An office opportunity is an offer, not an automatic move. The player may remain in an older office, accepting its staffing, concurrency, and equipment limits.

---

## 6. Progressive Disclosure

The interface must be derived from unlocked capabilities.

```ts
type CapabilityId =
  | "develop_game"
  | "contract_work"
  | "research"
  | "custom_engine"
  | "hire_staff"
  | "train_staff"
  | "marketing"
  | "publishing"
  | "post_release_support"
  | "rd_lab"
  | "hardware_lab"
  | "aaa"
  | "custom_console"
  | "endgame"
```

Rules:

- Navigation displays only capabilities with an unlocked purpose.
- A newly available capability arrives through a contextual event or tutorial.
- Do not show distant pages as greyed-out promises in the garage.
- Locked content cannot be reached through a URL, modal, keyboard shortcut, old save path, or another screen.
- A feature flag can disable unfinished content even if progression would otherwise unlock it.
- A capability becomes visible only when its screen and core actions work.

---

## 7. Authoritative Project State Machine

Use one project state machine for every game. Do not infer lifecycle from which modal is open.

```ts
type GameProjectState =
  | "draft"
  | "preproduction"
  | "stage1_planning"
  | "stage1_active"
  | "stage2_planning"
  | "stage2_active"
  | "stage3_planning"
  | "stage3_active"
  | "polish"
  | "pre_release"
  | "released"
  | "dormant"
  | "delisted"
  | "archived"
  | "cancelled"
```

`paused` is not a project state. It is a campaign playback state. A project may also carry blocking reasons without changing its lifecycle state.

### 7.1 Allowed transitions

| From | To | Required command and guard | Required side effects |
| --- | --- | --- | --- |
| Draft | Preproduction | Confirm concept; required fields valid | Freeze concept revision, create planning snapshot |
| Draft | Cancelled | Cancel draft | Record optional draft history; no production cost |
| Preproduction | Stage 1 Planning | Engine/toolkit selected; platform compatible; scope feasible or risks accepted | Create stage budgets and production plan |
| Preproduction | Cancelled | Cancel project | Preserve planning cost and discoveries |
| Stage 1 Planning | Stage 1 Active | Confirm Stage 1 allocation | Resume chosen speed and begin work |
| Stage 1 Active | Stage 2 Planning | Stage 1 required work complete | Persist outcomes, pause, present Stage 2 decision |
| Stage 2 Planning | Stage 2 Active | Confirm Stage 2 allocation | Resume and begin work |
| Stage 2 Active | Stage 3 Planning | Stage 2 required work complete | Persist outcomes, pause, present Stage 3 decision |
| Stage 3 Planning | Stage 3 Active | Confirm Stage 3 allocation | Resume and begin work |
| Stage 3 Active | Polish | Stage 3 required work complete | Stop feature expansion by default; expose bugs and incomplete work |
| Polish | Pre-Release | Player chooses Finalize Build | Create immutable candidate-build snapshot |
| Pre-Release | Polish | Continue Development | Reopen only permitted polish, optimization, and bug work; invalidate candidate build |
| Pre-Release | Released | Confirm Release; release checklist passes | Atomic release transaction |
| Pre-Release | Cancelled | Confirm Cancel Project | Preserve costs, learning, history, and unreleased status |
| Released | Dormant | Sales remain negligible; no active support or marketing | Keep listing and history; reduce update frequency |
| Dormant | Released | Demand, update, discount, platform event, or renewed marketing restores meaningful activity | Resume active weekly settlement |
| Released/Dormant | Delisted | Player delists, all supported platforms become unavailable, or contract forces removal | Stop future new sales; preserve all history |
| Released/Dormant/Delisted | Archived | No active work or unresolved accounting | Historical read-only record |

Invalid transitions must return a typed failure and must not partially mutate state.

### 7.2 Cancellation semantics

The player-facing action may say `Delete Game` while the project is unreleased, but the domain command is `cancelProject`.

Cancellation preserves:

- Elapsed calendar time.
- All money already spent.
- Employee and founder mastery legitimately earned.
- Studio knowledge and research findings.
- Engine work already completed.
- Recorded bugs, lessons, and production history.
- A cancelled-project entry in company history.

Cancellation removes:

- The possibility of release from that project instance.
- Future sales, reviews, fans, and market presence for that project.
- Unspent reserved budget.

It does not erase campaign, company, employees, engines, technology, platform history, or prior games.

---

## 8. Game Concept and Preproduction

The project-creation flow must collect only currently meaningful choices.

```ts
type GameConcept = {
  projectId: string
  workingTitle: string
  finalTitle?: string
  titleConfirmed: boolean
  topicId: string
  primaryGenreId: string
  secondaryGenreId?: string
  targetAudienceId?: string
  gameSize: "small" | "medium" | "large" | "aaa"
  platformIds: string[]
  engineVersionId: string
  sequelToGameId?: string
  publisherDealId?: string
  pillarFeatureIds: string[]
  supportingFeatureIds: string[]
  marketingPlanId?: string
}
```

### 8.1 Naming

- A generated working title is visibly labeled `Working Title`.
- The player may replace it at any time before candidate-build finalization.
- The project does not lose quality merely because a temporary title exists during production.
- Release is blocked until `titleConfirmed === true` and the final title is nonblank.
- Duplicate titles require explicit confirmation and may create market-confusion consequences only if that system exists.

### 8.2 Genres and topics

- Action, Adventure, RPG, Simulation, Strategy, and Casual are available immediately.
- Starting with only two main genres is incorrect.
- Multi-Genre is a later research capability.
- Subgenres and advanced genre structures may unlock through research and studio knowledge.
- The four starting topics are discovered, not the only topics that exist.
- Additional topics become discoverable and researchable through configured sources.
- Hidden future topics cannot appear in selectors, search, reports, or debug-free APIs.

### 8.3 Compatibility analysis

Before production confirmation, validate:

- Engine capabilities.
- Platform support.
- Feature dependencies.
- Performance budget.
- Team mastery.
- Scope pressure.
- Estimated work range.
- Known technical debt exposure.

If a required capability is missing, offer only real resolutions:

- Upgrade the engine before starting.
- Integrate technology before starting.
- Reduce scope.
- Remove or replace the feature.
- Change platform.
- Change engine.
- Cancel planning.

Starting with a known unsupported feature requires an explicit rule and risk path. It cannot be accepted through a generic warning that has no calculation.

---

## 9. Scope, Capacity, and Required Work

Every selected feature declares its work in Standard Work Units by discipline and development stage.

```ts
type FeatureWorkProfile = {
  featureId: string
  primaryStage: 1 | 2 | 3
  work: {
    engine: number
    gameplay: number
    storyQuests: number
    dialogue: number
    levelDesign: number
    artificialIntelligence: number
    worldDesign: number
    graphics: number
    sound: number
    testing: number
    optimization: number
  }
  capabilityRequirements: CapabilityRequirement[]
}
```

```ts
totalRequiredWork =
  baseWorkByGameSize
  + selectedFeatureWork
  + platformBuildWork
  + engineIntegrationWorkAssignedToProject
  + noveltyOverhead
  + coordinationOverhead
  + technicalDebtInteractionWork
```

Feature count never directly increases quality. Features create work, identity, capabilities, risk, and possible value. Their quality depends on completion, integration, coherence, mastery, and execution.

### 9.1 Scope pressure

```ts
scopePressure = estimatedRequiredWork / estimatedAvailableCapacity
```

Use ranges before production because experimental technology, weak mastery, and poor documentation create uncertainty.

Scope pressure may create:

- Delay.
- Overtime decisions.
- Bugs.
- Cut features.
- Incomplete features.
- Reduced polish.
- Increased cost.

It does not apply an unexplained review penalty.

### 9.2 Starting-game duration target

Under standard difficulty, a founder-only small game using the starter toolkit should generally require 28 to 42 simulation weeks from confirmed production to candidate build, depending on scope, skill fit, bugs, and choices.

Under normal non-cheat conditions, the first game should not complete in approximately 14 weeks and no development stage should regularly finish in roughly two weeks.

This is a tuning target, not a cosmetic clamp. Reach it through honest work requirements and capacity. Later mastery and better tools may shorten comparable work, while larger scope expands it.

---

## 10. Three-Stage Development

The established stages remain:

### Stage 1

- Engine.
- Gameplay.
- Story and Quests.

### Stage 2

- Dialogue.
- Level Design.
- Artificial Intelligence.

### Stage 3

- World Design.
- Graphics.
- Sound.

At each planning transition, the player distributes 100 focus points among the three stage disciplines.

```ts
type StageAllocation = {
  projectId: string
  stage: 1 | 2 | 3
  allocations: Record<string, number>
  total: 100
}
```

The allocation sets production priority and staff attention. It is not a direct score entry. A high allocation cannot create quality if the selected engine, features, employees, or time cannot support the work.

Each game concept generates demand weights for the nine disciplines based on:

- Topic.
- Primary and secondary genre.
- Audience.
- Pillars.
- Supporting features.
- Platforms.
- Engine requirements.
- Prior studio knowledge.

The player sees qualitative or estimated consequences according to Information Mode. The exact hidden target is never shown in Standard mode.

### 10.1 Stage completion

A stage completes only when its required work threshold is satisfied or when the player accepts a deliberate incomplete-stage consequence offered by the system.

On completion:

1. Persist every contribution and generated outcome.
2. Stop daily work on that stage.
3. Pause campaign playback.
4. Enter the next planning state.
5. Present completed work, unresolved risks, new bugs, staff state, and the next decision.

React animations may interpolate visible progress but cannot write progress.

### 10.2 Visible weekly development

During an active stage, the player must be able to observe:

- Current simulation week.
- Required work and broad completion estimate.
- Discipline progress.
- Staff contributions.
- Known bugs.
- Energy for hired employees only.
- Scope or compatibility warnings.
- Feature completion and risk.
- Design and technology output where still used.

Progress must update in understandable increments. Do not hide two weeks of work behind a single instant animation.

---

## 11. Founder and Employee Work Rules

### 11.1 Founder

The founder:

- Exists in `founderState`, not as a normal `employeeState` record with a special label.
- Contributes to projects, research, reports, contracts, or engines when assigned.
- Has skills and mastery.
- Can be reassigned with normal switching costs where applicable.
- Cannot work on multiple primary assignments simultaneously.
- Does not consume or regenerate employee energy.

### 11.2 Hired employees

Hired employees may have:

- Energy.
- Fatigue.
- Recovery.
- Morale.
- Burnout risk.
- Salary.
- Training.
- Specialization.
- Task assignment.

Employee contribution must fall as energy falls. Recovery consumes calendar opportunity. The founder exclusion must be enforced in the domain calculation, not hidden in the UI.

### 11.3 Concurrency

Garage:

- One primary studio project at a time.
- Released-game sales and market simulation continue in the background.
- The founder may perform a Game Report instead of new development, not simultaneously.

Later offices:

- Concurrency comes from office capacity, team structure, leadership, and equipment.
- Supporting a released game consumes a real assignment slot or staff capacity.
- No studio receives unlimited simultaneous projects because multiple screens exist.

---

## 12. Bugs, Polish, and Candidate Builds

Bugs are persistent production entities.

```ts
type BugRecord = {
  id: string
  projectId: string
  platformBuildId?: string
  sourceType: "feature" | "engine" | "integration" | "platform" | "debt" | "regression"
  sourceId: string
  severity: "minor" | "major" | "critical"
  discovered: boolean
  introducedDay: SimDay
  fixedDay?: SimDay
  deterministicKey: string
}
```

The build may contain undiscovered bugs. The player only sees known bugs unless the selected Information Mode or cheat setting says otherwise.

### 12.1 Polish state

After Stage 3:

- Normal feature expansion stops by default.
- Employees continue testing, fixing bugs, optimizing builds, and completing permitted incomplete work.
- The player decides how long to continue.
- Each additional week costs money and delays launch.
- Delaying may improve the build but can create market-window or financial consequences.

`Finalize Build` creates a candidate-build snapshot. It does not release the game.

### 12.2 Candidate build

The candidate build freezes:

- Engine version.
- Feature versions and completion.
- Platform-build state.
- Known and unknown bugs.
- Performance state.
- Production quality inputs.
- Project costs to date.

Returning to Polish invalidates the candidate build and requires a new snapshot before release.

---

## 13. Pre-Release State

Pre-Release must present a functional checklist:

- Final title confirmed.
- Launch platforms confirmed.
- Platform build status.
- Known bug count and severity.
- Performance warnings.
- Feature completion warnings.
- Launch price.
- Publisher requirements where applicable.
- Release action.
- Continue Development action.
- Cancel Project action.

The player may:

1. Release the candidate build.
2. Return to Polish and spend more time fixing it.
3. Cancel the unreleased project.

The player may not:

- Receive sales while deciding.
- Receive reviews while deciding.
- Change the engine version silently.
- Ignore a blank or unconfirmed final title.
- Leave a release modal in a state where calendar time advances behind it.

---

## 14. Atomic Release Transaction

Release must be one domain transaction.

```ts
releaseGame({
  projectId,
  candidateBuildId,
  confirmedFinalTitle,
  launchPrice,
  commandId
})
```

Validate before mutation:

- Project is in Pre-Release.
- Candidate build still exists and is current.
- Final title is confirmed.
- Price is valid for the selected platforms and ruleset.
- Required publisher conditions are either satisfied or explicitly breached.
- No previous release transaction exists for the command or project.

On success, atomically:

1. Create the immutable released-game record.
2. Lock the exact engine and platform-build versions.
3. Persist launch price as the first price-history record.
4. Set `releasedAtDay`.
5. Create market listings.
6. Schedule deterministic review processing.
7. Schedule the first sales settlement for seven days after release.
8. Move the project to Released.
9. Create ledger entries for launch costs.
10. Restore the last nonzero playback speed.

On failure, none of these side effects may remain.

Repeated clicks, network retries, or restored UI state must be idempotent through `commandId` and the project release record.

---

## 15. Review Order and Review Ownership

Reviews are created only after release succeeds.

The first implementation may reveal reviews immediately after the Release transaction. This is acceptable because the user did not object to immediate reviews. The architecture must still support a short deterministic review delay later.

Review quality may use:

- Production execution.
- Genre/topic/audience fit.
- Pillar fulfillment.
- Feature outcomes.
- Coherence.
- Performance.
- Platform-build quality.
- Known and unknown launch bugs.
- Engine reliability.
- Team execution.
- Studio expectations and historical baseline.
- Legitimate deterministic reviewer variance.

Review quality may not use:

- Marketing spend as a quality bonus.
- Sales that have not occurred.
- UI navigation.
- Random values generated at render time.
- The launch price as a direct quality score.

Price may influence a separate value-for-money sentiment factor if the review model explicitly supports it. It cannot rewrite production quality.

Each review explanation must trace to actual results. Do not double-count the same factor inside feature effectiveness, aggregate coherence, and final quality without an explicit normalization layer.

---

## 16. Weekly Sales and Market Life

Sales begin after release and settle over completed market intervals.

```ts
type SalesInterval = {
  gameId: string
  startDay: SimDay
  endDay: SimDay
  platformSales: Record<string, number>
  grossRevenue: number
  platformFees: number
  publisherShare: number
  refunds: number
  netRevenue: number
  priceByPlatform: Record<string, number>
  demandFactorsSnapshotId: string
}
```

### 16.1 Required sequence

```text
Release Confirmed
→ Review Processing
→ Market Time Advances
→ Seven Full Days Complete
→ First Sales Interval Settles
→ First-Week Sales Become Visible
```

No lifetime units, first-week units, sales revenue, or sales chart points may be prepopulated from future intervals.

### 16.2 Demand model

Use a separated demand calculation:

```ts
weeklyUnitDemand =
  addressablePlatformAudience
  * awarenessRate
  * qualityConversion
  * genreTopicDemand
  * audienceFit
  * priceElasticity
  * competitionPressure
  * wordOfMouth
  * gameAgeCurve
  * platformMomentum
  * availabilityModifier
```

Apply bounded functions and normalization. No single nonzero factor should accidentally erase the entire market unless the product is truly unavailable.

Marketing changes awareness. Reviews and player sentiment change conversion and word of mouth. Platform state changes addressable audience. Price changes elasticity. These layers must remain separate for reports and debugging.

### 16.3 Pricing

- The player chooses launch price in Pre-Release.
- Price must be validated against configurable platform and market norms.
- A weak, overpriced game should convert poorly.
- A strong game may sustain a higher price.
- A lower price may improve unit demand while reducing revenue per unit.
- The first manual price change is allowed after 28 full days on sale.
- After any price change, enforce a default 28-day cooldown.
- Price history is immutable.
- A change applies from its effective day forward.
- Prior intervals are never recalculated.
- Repeated price toggling cannot refresh launch awareness or reroll demand.

### 16.4 Long-tail sales

Do not force a game Off Market after 14 weeks.

A released game may move to Dormant when sales are negligible, but its listing remains. Dormant games use lower-frequency simulation optimization while preserving exact accounting. A discount, platform event, update, marketing action, or trend change may make a dormant game active again.

A game becomes Delisted only when:

- The player deliberately delists it.
- Every supported platform becomes commercially unavailable under configured rules.
- A publisher contract or legal event requires removal.
- A specific game system creates a legitimate removal decision.

Age reduces demand but does not erase the historical record or impose an arbitrary end date.

---

## 17. Post-Release Decisions

The initial playable slice must support:

- Weekly sales.
- Price changes after eligibility.
- Game Reports.
- Delisting.
- Basic patches for launch bugs.

Patch work must:

- Consume staff or founder capacity.
- Consume time and money.
- Target specific bugs or performance problems.
- Create a new released build version.
- Affect future sentiment, refunds, and sales.
- Never rewrite original reviews or past sales.

Advanced updates, DLC, expansions, live-service systems, and MMOs remain deferred until their own specifications exist.

---

## 18. Game Reports and Knowledge

A Game Report is a real studio assignment, not an instant button reward.

Eligibility:

- The game has been released.
- At least one full sales interval exists.
- The studio has a founder or employee available to perform the analysis.

The report consumes Standard Work Units. Garage founders must choose between analyzing the last game and immediately starting the next primary assignment.

Reports evaluate stored production and market snapshots. They may discover:

- Topic and genre compatibility.
- Audience fit.
- Stage allocation strengths and weaknesses.
- Pillar fulfillment.
- Feature overload.
- Engine limitations.
- Technology mastery problems.
- Platform-performance problems.
- Bug sources.
- Price effects.
- Competition effects.
- Marketing awareness.
- Word-of-mouth behavior.

A finding must be based on a real factor with sufficient evidence. If evidence is weak, return an inconclusive finding rather than invented slider advice.

Completed findings become persistent studio knowledge. Repeating the same report may improve confidence only when new evidence exists. It cannot be farmed for unlimited research or mastery.

---

## 19. Contracts and Publishing in the Campaign Spine

The detailed economy specification may expand these systems later, but the campaign state machine must reserve their real place now.

### 19.1 Contract work

Contracts are early-game survival projects with:

- Required work by discipline.
- Deadline.
- Payment.
- Partial or failure rules.
- Skill and mastery gains.
- Opportunity cost.

```ts
type ContractState =
  | "offered"
  | "accepted"
  | "active"
  | "completed"
  | "failed"
  | "declined"
  | "expired"
```

In the garage, an active contract occupies the founder's primary assignment and blocks active game development. Contract results must be deterministic and use the same work-unit model.

### 19.2 Publishing deals

Publishing deals may specify:

- Topic, genre, audience, size, platform, or release window.
- Advance payment.
- Marketing support.
- Royalty split.
- Minimum quality or review expectation.
- Deadline.
- Penalties.
- Rights or sequel restrictions.

The deal must attach to the project before production confirmation. Release validation checks its requirements. Breaching a deal creates actual financial, reputation, or relationship consequences.

Do not build a full negotiation simulator in the first slice. Do not omit the data relationship and project-state guard.

---

## 20. Research and Engine Connection

The project spine uses the deeper Research and Engine systems under these rules:

1. Discovery makes a technology visible when eligible.
2. Research creates knowledge and maturity.
3. Research alone does not modify an engine.
4. Integration is a separate work project.
5. Successful integration creates a new engine version.
6. A game selects one exact eligible engine version in Preproduction.
7. The selected version remains fixed throughout production unless the player performs an explicit supported migration.
8. Active projects cannot migrate silently.
9. Released games retain their exact engine and platform-build versions forever.
10. Research, integration, and maintenance use Standard Work Units and the same calendar.

The starter toolkit or imported engine must support the baseline features necessary for a first game. It should have clear limits that later make custom-engine work attractive.

Main genres are not Research purchases. Research may unlock:

- Multi-Genre.
- Subgenres.
- Advanced genre mechanics.
- New topics.
- Audience targeting.
- New game sizes.
- Marketing methods.
- Engine technologies.
- Studio capabilities.

---

## 21. Offices, Capacity, and Studio Progression

An office is a capability and capacity container.

```ts
type OfficeDefinition = {
  id: string
  tier: "garage" | "small" | "established" | "advanced" | "campus"
  purchaseOrMoveCost: number
  weeklyRent: number
  employeeCapacity: number
  teamCapacity: number
  equipmentSlots: number
  projectConcurrency: number
  capabilityUnlocks: CapabilityId[]
  eligibility: EligibilityRule[]
}
```

The Upgrade Office action must show:

- Cost.
- New weekly overhead.
- Employee capacity.
- Project capacity.
- New capabilities.
- Eligibility failures.
- Cash remaining and runway estimate.

Moving office preserves the full campaign and creates ledger entries. It does not silently grant employees, research, engine mastery, or production quality.

Office eligibility comes from campaign timing plus studio accomplishments. Date alone is insufficient. Cash alone is insufficient.

---

## 22. Economy and Ledger

All money movement writes an immutable ledger entry.

```ts
type LedgerEntry = {
  id: string
  campaignId: string
  day: SimDay
  category:
    | "game_sales"
    | "refund"
    | "platform_fee"
    | "publisher_advance"
    | "publisher_share"
    | "development"
    | "research"
    | "engine"
    | "marketing"
    | "payroll"
    | "rent"
    | "office_move"
    | "contract_payment"
    | "contract_penalty"
    | "support"
    | "financing"
  amount: number
  entityId?: string
  deterministicKey?: string
}
```

Current Cash equals the sum of starting capital and ledger entries. Lifetime Revenue includes qualifying gross revenue and remains distinct from current Cash. Profit by game uses attributable revenue and cost records.

The Finances screen is a projection of the ledger. It cannot maintain its own totals.

---

## 23. Insolvency, Bankruptcy, and Recovery

Campaign failure requires a state machine, not an unexpected game-over modal.

```ts
type CampaignFinancialState =
  | "solvent"
  | "warning"
  | "insolvent"
  | "recovery"
  | "bankrupt"
```

### 23.1 Warning

Enter Warning when projected runway falls below a configured number of weeks. Show the actual causes:

- Payroll.
- Rent.
- Active project burn.
- Debt service.
- Weak sales.
- Upcoming contract obligations.

### 23.2 Insolvency

Enter Insolvent when cash breaches the configured credit floor or mandatory obligations cannot be paid.

Pause the campaign and offer only eligible recovery actions, such as:

- Accept available contract work.
- Cancel or reduce active project scope.
- Delay optional research or engine work.
- Move to a cheaper valid office when allowed.
- Take an available difficulty/ruleset-specific bailout or loan.
- Sell company shares only when the complete applicable financing or Pirate Mode system exists.

Recovery choices create lasting costs. They are not free resets.

### 23.3 Bankruptcy

Bankruptcy occurs when no valid recovery action remains or a recovery deadline expires.

On bankruptcy:

- Preserve the final save and company history.
- Show the actual financial causes.
- Allow restart from a deliberate checkpoint only if the campaign rules support it.
- Allow a new campaign.
- Do not silently erase or overwrite the failed campaign.

---

## 24. Rivals and Market Events

The market may continue using persistent rivals, but it must not delay the first playable studio loop.

Every rival headline, announcement, and release must refer to persistent state:

```ts
type RivalProject = {
  id: string
  studioId: string
  conceptSeed: string
  state: "planning" | "production" | "announced" | "released" | "cancelled"
  announcedDay?: SimDay
  plannedReleaseWindow?: [SimDay, SimDay]
  releasedGameId?: string
}
```

Rivals may influence competition, trends, platform momentum, and public knowledge. They cannot access the player's hidden plans. Their UI labels must reflect their actual persistent state.

The initial vertical slice may use a limited abstract rival model, provided that:

- It uses time, money, capability, and project constraints.
- It cannot use future technology.
- Its announcements and releases remain linked.
- It is deterministic.
- It cannot reroll when the Market screen opens.

---

## 25. Campaign Completion and Endless Mode

At the configured final campaign week, do not abruptly stop active projects.

Enter `campaign_completion_pending` and:

1. Allow the current simulation day to settle.
2. Freeze new era progression.
3. Present campaign results based on stored history.
4. Calculate valuation, profitability, reputation, fans, awards, technology leadership, game legacy, survival, and other configured score categories.
5. Preserve every released and cancelled game.
6. Offer End Campaign or Continue in Endless Mode.

Endless Mode:

- Removes the fixed victory deadline.
- Preserves all systems and history.
- Continues deterministic market simulation.
- Retains the original campaign-length label and completion score.
- Does not retroactively change the completed campaign result.

Full awards, achievements, and late-game legacy presentation may be implemented later, but completion and continuation state must be reserved now.

---

## 26. Save, Load, and Determinism

Persist at minimum:

- Campaign setup and rules.
- Campaign day, last nonzero speed, and playback state.
- Founder state.
- Employee state.
- Office state.
- Capabilities and feature flags.
- Project state and stage progress.
- Work contributions.
- Stage allocations.
- Bugs.
- Candidate builds.
- Released games and build versions.
- Reviews.
- Sales intervals.
- Price history.
- Reports and knowledge.
- Research and technology state.
- Engines and integrations.
- Platforms and market state.
- Rivals and rival projects.
- Contracts and publishing deals.
- Ledger entries.
- Financial warnings and recovery state.
- Processed command IDs.
- Deterministic event keys.
- Cheats-enabled state.

Use event-specific keys:

```ts
seededValue(
  campaignSeed,
  systemId,
  entityId,
  occurrenceId,
  simulationDay,
  decisionType
)
```

`occurrenceId` is required. Entity, week, and decision type alone may collide when the same entity makes two similar decisions during one week.

Requirements:

- Saving and loading cannot reroll reviews, bugs, research setbacks, integration failures, sales, rival events, or applicants.
- UI render order cannot affect simulation.
- Batched catch-up simulation must produce the same result as day-by-day simulation.
- Command handling must be idempotent.
- Save migrations are versioned and tested.

---

## 27. Current-Save Migration

Migrate current campaigns without retroactively rewriting history.

### 27.1 Campaign identity

- Preserve Company Name.
- If Player Name is missing, prompt once on load before continuing and persist it separately.
- Preserve seed, difficulty, money, time, and company history.

### 27.2 Founder

- Convert the current player character into `founderState`.
- Preserve skills, mastery, and legitimate progress.
- Remove founder employee-energy state.
- Do not convert missing energy into a bonus.

### 27.3 Projects and games

- Map active projects to the nearest valid project state.
- Preserve completed development work.
- Do not auto-release a project during migration.
- A completed but unreleased project enters Pre-Release with a generated candidate build.
- Preserve released reviews and sales exactly.
- Do not remove games that were forced Off Market by the old 14-week rule; preserve historical status and provide a migration flag for optional relisting only if platform state permits it.

### 27.4 Engines and research

- Preserve Research availability.
- Preserve owned technology.
- Convert current engines into imported immutable versions.
- Preserve released-game engine references.
- Do not silently install researched technology.

### 27.5 Finances

- Preserve current cash.
- Import existing totals as audited opening ledger balances when detailed historical entries do not exist.
- Do not fabricate transaction-level history.

Every migration must be repeat-safe and produce a migration report in debug logs.

---

## 28. System Ownership and Separation

Authoritative calculations belong to domain services or pure simulation modules.

| Concern | Authoritative owner | UI responsibility |
| --- | --- | --- |
| Calendar and playback | SimulationClock | Display time and issue speed commands |
| Project transitions | ProjectLifecycleService | Show allowed actions and transition failures |
| Required work | ProductionPlanningService | Show estimates and risk labels |
| Daily contributions | WorkSimulationService | Animate persisted progress |
| Founder rules | FounderService | Display assignment and skill state |
| Employee energy | EmployeeSimulationService | Display employee-only energy |
| Bugs | QualitySimulationService | Show discovered bugs and fix commands |
| Candidate build | BuildFinalizationService | Show checklist |
| Release | ReleaseService | Collect confirmation and price |
| Reviews | ReviewSimulationService | Reveal stored reviews |
| Sales | SalesSimulationService | Chart settled intervals |
| Pricing | PricingService | Validate and submit price changes |
| Reports | KnowledgeReportService | Present stored findings |
| Research | ResearchService | Show visibility and progress |
| Engines | EngineService | Show versions and compatibility |
| Market/platforms | MarketSimulationService | Present known state |
| Rivals | RivalSimulationService | Present public rival state |
| Finance | LedgerService | Aggregate and chart ledger projections |
| Unlocks | ProgressionService | Render unlocked navigation only |
| Save/load | PersistenceService | Request save/load and display status |

React components must use read-only view models and dispatch commands. A selector may calculate display formatting or aggregate persisted values. It may not advance time, roll randomness, create sales, determine reviews, change cash, drain energy, or transition projects.

---

## 29. Steam-Parity Classification

Do not treat every original mechanic as sacred, and do not accidentally omit the genre's essential progression.

### 29.1 Required foundational parity

- Garage-to-studio progression.
- Game concept selection.
- Main genres and discoverable topics.
- Three development stages.
- Research and custom engines.
- Hiring, training, and staff specialization.
- Contracts as early financial support.
- Publishing deals.
- Marketing and hype.
- Sequels and game history.
- Game Reports and learned knowledge.
- Multi-platform development.
- Offices and later labs.
- Financial failure pressure.
- Campaign completion.

### 29.2 Intentional redesigns

- Separate founder model with no employee energy.
- Persistent technology discovery and maturity.
- Explicit engine integration and immutable versions.
- Capability-based features and project pillars.
- Platform-specific builds and performance budgets.
- Technical debt and maintenance.
- Persistent rivals and market state.
- Explicit Pre-Release state.
- Release or Cancel decision.
- Manual launch pricing and controlled post-launch price changes.
- Long-tail sales instead of a short fixed market life.
- Basic post-launch patches.
- Deterministic event ownership and deeper reports.

### 29.3 Deferred but reserved

- Full employee culture and leadership depth.
- Full publisher negotiation.
- Advanced press and convention systems.
- Franchises, remakes, expansions, and franchise fatigue.
- R&D Lab projects beyond the initial technology slice.
- Hardware Lab.
- Custom consoles.
- AAA production depth.
- MMO and live-service architecture.
- Engine licensing.
- Mod marketplaces.
- Patent, espionage, acquisition, and vendor-negotiation systems.
- Full Pirate Mode.
- Full awards and achievement system.

Deferred systems must remain hidden behind configuration. Their required identifiers and state relationships may be reserved, but fake buttons and empty screens must not ship.

---

## 30. First True Vertical Slice

Implement this sequence before expanding the deeper employee or technology documents.

### Slice A: Campaign and first game

1. Create a campaign with Player Name and Company Name.
2. Persist 30, 40, or 60-year mode, seed, difficulty, and Information Mode.
3. Start in the garage with six main genres and four deterministic topics.
4. Create a small single-platform game using the starter toolkit.
5. Use a visible working title but require final naming before release.
6. Complete compatibility analysis.
7. Confirm Stage 1 allocation.
8. Advance meaningful daily work for a multi-week stage.
9. Pause at Stage 2 planning.
10. Repeat for Stage 2 and Stage 3.
11. Enter Polish and fix known bugs over real time.
12. Enter Pre-Release.
13. Set launch price.
14. Release or Cancel.
15. On release, resume time automatically.
16. Reveal deterministic reviews after release.
17. Settle first-week sales only after seven days.
18. Continue weekly sales beyond 14 weeks when demand remains.
19. Create a Game Report using a real assignment.
20. Gain persistent knowledge and mastery.

### Slice B: Second game and meaningful learning

1. Use learned knowledge to create a different second game.
2. Research one new topic, audience capability, or feature.
3. If technology is involved, require explicit engine integration before selection.
4. Use a different price or scope strategy.
5. Confirm that prior released game sales continue in the background.
6. Allow the first game's price to change only after 28 days.
7. Confirm the second game's results explain actual differences.

### Slice C: Third game and studio pressure

1. Introduce a real financial or capacity tradeoff.
2. Offer a contract, office move, hire, or engine investment based on eligibility.
3. Create and release a third game.
4. Save during development, Pre-Release, and active sales.
5. Reload each save and produce identical results.
6. Verify the campaign now supports a repeatable, non-identical loop.

Only after all three slices work should implementation expand into the full Employee, Team, Leadership, and Studio Culture specification.

---

## 31. Acceptance Tests

### Campaign and identity

1. Player Name and Company Name persist separately.
2. Founder appearance does not change calculations.
3. The same seed produces the same four starting topics.
4. Rerendering or reopening setup does not reroll topics.
5. Campaign length accepts only 30, 40, or 60 years.
6. Information Mode changes visibility but not results.
7. Distant capabilities are absent from garage navigation.
8. Disabled feature-flag systems cannot be accessed through direct routes.

### Game creation

9. All six main genres are available from campaign start.
10. Multi-Genre remains unavailable until researched.
11. A working title is clearly temporary.
12. Release is blocked until the final title is confirmed.
13. A blank title cannot release.
14. Platform and engine incompatibility produce a real blocked state or explicit resolution.
15. Unsupported features cannot be selected silently.

### Development and timing

16. Required work uses Standard Work Units.
17. Daily contribution is independent of UI frame rate.
18. The default founder-only first game generally requires 28 to 42 weeks.
19. A default first-game stage does not normally complete in roughly two weeks.
20. Stage 1 completion pauses at Stage 2 Planning.
21. Stage 2 completion pauses at Stage 3 Planning.
22. Stage 3 completion enters Polish, not Released.
23. Each stage allocation totals 100.
24. Game speed changes wall-clock rate but not required work.
25. Identical commands at 1x and 3x produce identical project results.
26. React rerenders cannot add progress.

### Founder and employees

27. Founder energy does not deplete.
28. Founder energy does not regenerate because it does not exist.
29. Founder contribution still uses skills and mastery.
30. Founder cannot hold two primary assignments.
31. Hired-employee energy still depletes and recovers.
32. Employee departure does not remove studio knowledge.

### Bugs and Pre-Release

33. Bugs persist across save and reload.
34. Known and unknown bugs remain distinct.
35. Bug fixing consumes work and calendar time.
36. Finalize Build creates a candidate build but no market listing.
37. Returning to Polish invalidates the old candidate build.
38. Pre-Release shows known bugs and valid actions.
39. Releasing with bugs preserves them in the release build.
40. Canceling the project creates no reviews or sales.
41. Canceling preserves spent cost, mastery, research, and history.

### Release, reviews, and sales

42. Release is atomic and idempotent.
43. Repeated Release clicks create one released game.
44. A game cannot receive a review before release.
45. A game cannot receive sales before release.
46. Release resumes the prior nonzero playback speed.
47. Reviews do not use marketing as a quality bonus.
48. First-week sales remain absent before seven full days.
49. First-week sales appear after the first complete interval.
50. Sales intervals never overlap or duplicate.
51. Lifetime units equal the sum of settled intervals.
52. Current cash changes through ledger entries only.
53. A game is not forced Off Market after 14 weeks.
54. Dormant games preserve listings and history.

### Pricing and post-release

55. Launch price persists in immutable history.
56. Price cannot change during the first 28 days.
57. A valid later price change affects only future intervals.
58. Prior sales remain unchanged after a price change.
59. Price-change cooldown prevents rapid toggling.
60. A price change cannot reroll reviews.
61. A patch consumes real capacity and creates a new released build version.
62. A patch does not rewrite launch reviews or prior sales.

### Reports and knowledge

63. A Game Report requires at least one sales interval.
64. A Game Report consumes a real assignment.
65. Report findings correspond to stored production or market factors.
66. Insufficient evidence creates an inconclusive finding.
67. Repeating a report cannot farm unlimited knowledge.
68. Learned knowledge survives save and load.

### Engines, offices, and progression

69. Research does not change an engine.
70. Integration creates a new engine version.
71. Active projects do not migrate engine versions silently.
72. Released games retain exact engine versions.
73. Date alone does not unlock a major studio phase.
74. Accomplishments alone do not unlock historically unavailable technology.
75. Office movement validates cost and eligibility.
76. Office movement preserves campaign state.
77. Office capability comes from office data, not a UI button.

### Finance and failure

78. Ledger aggregation equals displayed current cash.
79. Lifetime Revenue remains separate from cash.
80. Financial warning identifies actual cost drivers.
81. Insolvency pauses for valid recovery decisions.
82. Recovery creates lasting cost or constraint.
83. Bankruptcy preserves the failed campaign history.

### Determinism and migration

84. Save and load cannot reroll starting topics.
85. Save and load cannot reroll bugs.
86. Save and load cannot reroll reviews.
87. Save and load cannot reroll sales.
88. Save and load cannot reroll rival announcements.
89. Day-by-day and batched catch-up simulation match.
90. Duplicate commands are idempotent.
91. Founder migration preserves skills and removes employee energy.
92. Completed unreleased projects migrate to Pre-Release, not Released.
93. Existing released reviews and sales remain unchanged.
94. Existing engines migrate without disappearing.
95. Existing Research remains available.

### Three-game behavioral proof

96. The first game completes the full loop without developer intervention.
97. The second game can use knowledge gained from the first.
98. The first game continues sales while the second is developed.
99. The third game introduces a meaningful financial, staffing, engine, or office tradeoff.
100. Three identical-seed campaigns with identical commands produce identical histories.
101. A different valid strategy can produce a different but understandable outcome.
102. The player can continue after the third game without entering a dead or empty state.

---

## 32. Balance Harness for the First Three Games

Create a headless scenario:

```ts
simulateOpeningCampaign({
  campaignSeed,
  campaignLengthYears,
  difficulty,
  informationMode,
  strategyPolicy,
  releasedGameTarget: 3
})
```

Test at least these policies:

- Focused genre specialist.
- Feature maximizer.
- Minimal polish.
- Heavy polish.
- High launch price.
- Low launch price.
- Research-first.
- Cash-conservative contract worker.
- Early engine investment.
- Cancel a troubled second game.

Measure:

- Development weeks per game.
- Stage duration.
- Bugs at candidate build and release.
- Review distribution.
- First-week and 12-week sales.
- Long-tail activity.
- Cash runway.
- Profit.
- Fans.
- Knowledge gained.
- Mastery gained.
- Idle time.
- Bankruptcy rate.
- Number and cause of blocked decisions.

No policy should dominate every seed and difficulty. The harness must prove that a focused small game can outperform a bloated game, new technology is not always optimal, polish has opportunity cost, and pricing changes revenue through demand rather than score manipulation.

---

## 33. Implementation Order

Implement in this order:

1. Inventory current state ownership and document every existing mutation path.
2. Add canonical time, Standard Work Units, and deterministic command processing.
3. Separate founder state from employee state.
4. Add campaign identity and migration.
5. Implement the project state machine and typed transitions.
6. Move development progress into authoritative daily simulation.
7. Normalize Stage 1, 2, and 3 planning and completion.
8. Implement Polish, candidate builds, and Pre-Release.
9. Implement atomic Release and Cancel.
10. Correct review order.
11. Correct weekly sales order and long-tail lifecycle.
12. Add launch price and post-launch price history.
13. Add Game Report work and persistent knowledge.
14. Connect ledger-backed finances and recovery states.
15. Connect progression gates and capability-based navigation.
16. Migrate current saves.
17. Run the first-three-games harness across seed samples.
18. Only then expand employee, culture, marketing, publishing, and late-game depth.

Do not patch each issue only in the current React screen. When current logic is embedded in a component, extract it into the correct domain owner and leave the component consuming a view model.

---

## 34. Required Delivery Report from Grok

After implementing this pass, report:

- Files changed.
- State machines added or changed.
- Authoritative owner of every project transition.
- Time and work-unit implementation.
- Founder and employee separation.
- Release transaction behavior.
- Review and sales ordering.
- Pricing behavior.
- Game Report behavior.
- Progression and office gates connected.
- Ledger and insolvency behavior connected.
- Save migrations added.
- Feature flags added.
- Tests added and their results.
- Balance-harness results for all opening strategies.
- Any React components that still contain gameplay calculations.
- Any non-deterministic calls that remain.
- Any empty or fake UI action still exposed.
- Any contradiction that prevents compliance.
- Any deferred system whose data contract must change later.

Do not report only that the UI changed. Demonstrate the complete state transitions for one released game, one cancelled game, one price change, one report, and one save/reload run.

---

## 35. Completion Definition

This document is implemented only when the following loop is playable without developer intervention:

```text
Start in Garage
→ Make a Deliberate Game Concept
→ Watch Meaningful Multi-Week Development
→ Make Three Stage Decisions
→ Observe Founder and Employee Rules Correctly
→ Polish or Accept Risk
→ Confirm Final Title and Price
→ Release or Cancel
→ Resume Time Automatically
→ Receive Reviews After Release
→ Receive Sales Only After Market Time Passes
→ Continue Beyond a 14-Week Artificial Limit
→ Produce an Evidence-Based Report
→ Use Knowledge and Resources on the Next Game
→ Survive or Fail for Understandable Reasons
→ Save and Reload Without Rerolling Anything
```

Do not continue into full culture simulation, hardware manufacturing, engine licensing, MMOs, live-service infrastructure, or final UI production until this loop is stable, deterministic, and demonstrably fun across the first three games.
