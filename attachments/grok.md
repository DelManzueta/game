Yeah. I figured out the core. Game Dev Tycoon does not use one simple “good combination = good review” calculation. It runs the game through a scoring pipeline:

1. Generate Design and Technology points.
2. Evaluate slider priorities and the Tech/Design balance.
3. Apply topic, genre, audience, platform, bugs, sequel, trend, and technology modifiers.
4. Compare the result against the player’s evolving target score.
5. Convert one hidden final score into four reviewer scores.
6. Use the hidden score, market size, fans, hype, and platform reach to determine sales.

The controversial part is that the quality target is primarily based on the player’s previous best games. The developers confirmed that the market gradually adjusts to the player’s past performance rather than following only a fixed time-based difficulty curve. [Greenheart Games explanation](https://forum.greenheartgames.com/t/req-game-review-algorithm/9214)

## Core formulas

### 1. Development sliders

Each development stage contains three fields. Every field always receives 10% of the stage, while the remaining 70% is divided according to the sliders:

```ts
timeShare =
  0.10 +
  0.70 * (sliderValue / sumOfThreeSliderValues)
```

If all three sliders are zero, divide the stage equally.

| Field        | Technology | Design |
| ------------ | ---------: | -----: |
| Engine       |        80% |    20% |
| Gameplay     |        20% |    80% |
| Story/Quests |        20% |    80% |
| Dialogues    |        10% |    90% |
| Level Design |        60% |    40% |
| AI           |        80% |    20% |
| World Design |        40% |    60% |
| Graphics     |        50% |    50% |
| Sound        |        40% |    60% |

Generated points should be affected by:

* Assigned employee’s Technology and Design stats
* Time allocated
* Employee efficiency and workload
* Experience in that field
* Engine features assigned to that field
* Game size
* A small seeded random variation

### 2. Genre Tech/Design targets

| Genre      | Target T/D ratio |
| ---------- | ---------------: |
| Action     |              1.8 |
| Adventure  |              0.4 |
| RPG        |              0.6 |
| Simulation |              1.6 |
| Strategy   |              1.4 |
| Casual     |              0.5 |

Calculate balance deviation:

```ts
balanceDeviation =
  (designPoints * targetRatio - technologyPoints) /
  Math.max(technologyPoints, designPoints)
```

Quality adjustment:

```ts
if (technologyPoints + designPoints < 30) {
  balanceModifier = 0
} else if (Math.abs(balanceDeviation) <= 0.25) {
  balanceModifier = 0.10
} else if (Math.abs(balanceDeviation) <= 0.50) {
  balanceModifier = 0
} else {
  balanceModifier = -0.10
}
```

This formula is documented in the reverse-engineered review algorithm. [Review algorithm reference](https://gamedevtycoon.fandom.com/wiki/Review_Algorithm/1.4.4)

### 3. Quality factor

Start at:

```ts
qualityFactor = 1
```

Then modify it:

* Correct T/D balance: `+0.10`
* Two or more important fields receive at least 40%: `+0.20`
* Only one important field receives at least 40%: `+0.10`
* No important fields receive enough time: `-0.15`
* Important field receives 20% or less: `-0.15` each
* Two or more unimportant fields receive at least 40%: `-0.20`
* Same topic and genre as previous game: `-0.40`
* Sequel released within 40 weeks: `-0.40`
* Sequel using same engine: `-0.10`
* Sequel using a technologically improved engine: `+0.20`
* MMO without an excellent topic/genre match: `-0.15`

Double the slider-priority penalties for MMOs.

### 4. Compatibility values

Use data tables rather than hard-coding this logic:

```ts
const compatibility = {
  excellent: 1.00, // +++
  good:      0.90, // ++
  okay:      0.80, // +
  bad:       0.70, // --
  terrible:  0.60  // ---
}
```

Important relationships:

* Topic × Genre
* Topic × Audience
* Platform × Genre
* Platform × Audience

For dual genres:

```ts
combinedCompatibility =
  (primaryGenreCompatibility * 2 + secondaryGenreCompatibility) / 3
```

### 5. Bugs

```ts
bugPercentage = clamp(
  (100 / (technologyPoints + designPoints)) * bugs,
  0,
  100
)

bugRatio = 1 - (0.8 * bugPercentage / 100)
```

Zero bugs produces `bugRatio = 1`.

### 6. Game-size normalization

```ts
const sizeMultiplier = {
  small: 1.0,
  medium: 1.2,
  large: 1.4,
  aaa: 1.8
}
```

### 7. Platform technology difference

For multiplatform games:

```ts
platformTechModifier =
  1 - ((highestPlatformTech - lowestPlatformTech) / 20)
```

PC should be ignored when calculating generation differences.

### 8. Trends

Normal trend:

```ts
trendModifier = matchesCurrentTrend ? 1.2 : 1.0
```

The original “strange combination” trend behaved roughly like this:

```ts
const strangeComboTrend = {
  excellent: 0.85,
  good: 1.10,
  okay: 1.20,
  bad: 1.40,
  terrible: 1.40
}
```

### 9. Base game score

This is the heart of the original algorithm:

```ts
baseScore =
  ((technologyPoints + designPoints) /
    (2 * sizeMultiplier)) *
  qualityFactor *
  topicAudienceCompatibility *
  platformGenreCompatibility *
  bugRatio *
  platformTechModifier *
  trendModifier
```

A current reverse-engineering walkthrough documents this exact pipeline. [Detailed 1.7.8 breakdown](https://www.reddit.com/r/GameDevTycoon/comments/1oged1p/simpleish_guide_for_178_expanded_part_2/)

### 10. Compare against expectations

```ts
intermediateScore = baseScore / targetHighScore

finalScore = clamp(
  10 * intermediateScore,
  1,
  10
) * expertiseModifier
```

Expertise penalties:

* Small game after leaving garage: `0.90`
* Medium game with fewer than 100,000 fans: `0.90`
* Large game below graphics level 3: subtract `0.10` per missing level, maximum `0.30`
* AAA game below graphics level 5: same penalty
* AAA game without three appropriate specialists: subtract `0.06` per missing specialist, maximum `0.18`

### 11. Moving target score

Initial target:

```ts
targetHighScore = 20
```

After the first qualifying hit:

```ts
yearModifier =
  year <= 6  ? 1.15 :
  year <= 23 ? 1.20 :
               1.10

targetHighScore =
  20 + Math.max(baseScore - 20, 2) * yearModifier
```

Later high scores:

```ts
highScoreDelta = Math.min(
  Math.max(
    baseScore - previousHighScore,
    targetHighScore * 0.10
  ),
  previousHighScore * 0.20
)

targetHighScore =
  previousHighScore + highScoreDelta * yearModifier
```

Only update this when:

```ts
finalScore >= 9 && baseScore > previousHighScore
```

This is what creates Game Dev Tycoon’s weird behavior where one enormous hit raises expectations for future releases.

## Paste this into Grok

```text
Implement a pure, deterministic, independently testable game-quality engine for our Game Dev Tycoon-inspired project.

Do not change the UI yet. Build the scoring system as a standalone module with seeded randomness and unit tests.

The scoring pipeline must be:

1. Convert each development stage’s three sliders into actual time shares.
   - Every field receives a guaranteed 10%.
   - Divide the remaining 70% proportionally between the three slider values.
   - If all sliders are zero, divide the stage equally.

2. Generate Technology and Design points per employee assignment.
   - Engine: 80% Tech / 20% Design
   - Gameplay: 20% Tech / 80% Design
   - Story/Quests: 20% Tech / 80% Design
   - Dialogues: 10% Tech / 90% Design
   - Level Design: 60% Tech / 40% Design
   - AI: 80% Tech / 20% Design
   - World Design: 40% Tech / 60% Design
   - Graphics: 50% Tech / 50% Design
   - Sound: 40% Tech / 60% Design

   Point generation must consider employee stats, time share, efficiency,
   workload, field experience, enabled engine features, game size and a
   small seeded random factor.

3. Store genre definitions as data. Initial target Tech/Design ratios:
   Action 1.8, Adventure 0.4, RPG 0.6, Simulation 1.6,
   Strategy 1.4 and Casual 0.5.

4. Calculate balance deviation:
   deviation = (design * targetRatio - technology) /
               max(technology, design)

   If Tech + Design is below 30, skip this check.
   Otherwise:
   abs(deviation) <= 0.25: qualityFactor += 0.10
   abs(deviation) <= 0.50: no change
   otherwise: qualityFactor -= 0.10

5. Quality factor begins at 1. Apply data-driven slider-priority,
   repeated-combination, sequel, engine, specialist and MMO modifiers.

6. Compatibility must be stored in external data tables:
   excellent 1.00, good 0.90, okay 0.80, bad 0.70, terrible 0.60.

   Evaluate:
   topic × genre
   topic × audience
   platform × genre
   platform × audience

   Dual genres use:
   (primary * 2 + secondary) / 3

7. Calculate bug ratio:
   bugPercent = clamp(100 / (tech + design) * bugs, 0, 100)
   bugRatio = 1 - 0.8 * bugPercent / 100

8. Game-size divisors:
   small 1.0, medium 1.2, large 1.4, AAA 1.8.

9. Calculate the base score:
   baseScore =
     ((tech + design) / (2 * sizeMultiplier)) *
     qualityFactor *
     topicAudienceCompatibility *
     platformGenreCompatibility *
     bugRatio *
     platformTechModifier *
     trendModifier

10. Compare baseScore with a targetHighScore:
    intermediateScore = baseScore / targetHighScore
    finalScore = clamp(10 * intermediateScore, 1, 10)
    finalScore *= expertiseModifier

11. Initial targetHighScore is 20. Update it only when finalScore >= 9
    and the current baseScore beats the stored high score.

12. Produce four visible critic scores from the hidden finalScore.
    Each critic should have a persistent bias and small seeded variation.
    Round each result to an integer from 1 to 10. Sales must use the hidden
    finalScore, not the displayed average.

13. Every scoring result must return a complete debug breakdown:
    generatedTech
    generatedDesign
    actualSliderShares
    balanceDeviation
    balanceModifier
    priorityModifier
    repetitionModifier
    sequelModifier
    compatibilityModifiers
    bugRatio
    trendModifier
    expertiseModifier
    baseScore
    targetHighScore
    intermediateScore
    hiddenFinalScore
    fourCriticScores

14. Write unit tests for:
    perfect RPG
    badly balanced RPG
    repeated topic/genre
    premature sequel
    improved sequel
    bug-filled release
    underskilled AAA game
    multiplatform generation gap
    matching trend
    target-high-score update

Keep all balancing values in configuration files. Do not scatter unexplained
numbers through the implementation. Use descriptive names and document every
formula.
```

One recommendation: reproduce the original target-score system first, but keep it behind a configuration flag. We’ll probably want a better hybrid system afterward because the original encourages deliberately holding back. Send me Grok’s current scoring/game-development files next, and I’ll map this directly onto its existing structure.
I dug through the Steam Workshop. The strongest direction is to combine the transparency of TAG, the progression of Learn By Doing, and the living market from the major overhaul mods.

Several popular mods are old or currently incompatible, so we should rebuild their ideas natively—not depend on or copy their code.

## Best ideas worth incorporating

| Mod                                                                                                        |       Evidence of player interest | What we should build                                                                                                         |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------: | ---------------------------------------------------------------------------------------------------------------------------- |
| [Percentager](https://steamcommunity.com/sharedfiles/filedetails/?id=296240946)                            |                 ~192K subscribers | Exact slider percentages, predicted Design/Tech balance, and warnings when priorities conflict with the genre                |
| [Learn By Doing](https://steamcommunity.com/sharedfiles/filedetails/?id=554790111)                         |                 ~125K subscribers | Employees improve the skills they actually use, with diminishing returns and specialization                                  |
| [TAG Mod](https://steamcommunity.com/sharedfiles/filedetails/?id=1527391789)                               |                 ~113K subscribers | Modern UI, dark mode, finance graphs, visible staff energy, game-history cards, better reports, fewer unnecessary animations |
| [Advanced Development Helper](https://steamcommunity.com/sharedfiles/filedetails/?id=3615001665)           | ~9.5K subscribers since late 2025 | Optional development advice, color-coded priorities, analytical recommendations, and clear percentages                       |
| [Game Stats](https://steamcommunity.com/sharedfiles/filedetails/?id=3551934488)                            |                 ~7.6K subscribers | Track topic, genre and engine usage to explain repetition penalties and player history                                       |
| [All The Consoles – Definitive Edition](https://steamcommunity.com/sharedfiles/filedetails/?id=1392206657) |          ~14K current subscribers | Dynamic platforms, ports, remasters, industry events, rival studios, market-share effects and alternate outcomes             |
| [Top and Flops](https://steamcommunity.com/sharedfiles/filedetails/?id=3291115942)                         |         ~8.4K current subscribers | Random industry events, longer campaigns, platform successes/flops and configurable content packs                            |
| [Platform Randomiser](https://steamcommunity.com/sharedfiles/filedetails/?id=296802750)                    |            Strong Workshop rating | Seeded alternate history: platforms can unexpectedly succeed, fail or survive longer                                         |
| [Hit Games Change Market Share](https://steamcommunity.com/sharedfiles/filedetails/?id=301369478)          |                  ~28K subscribers | A major exclusive should increase its platform’s install base and attract competitors                                        |
| [CompetitorMod](https://steamcommunity.com/sharedfiles/filedetails/?id=298039002)                          |                  ~30K subscribers | Actual competing studios, charts, rival releases and changing market positions                                               |
| [VacationTime](https://steamcommunity.com/sharedfiles/filedetails/?id=374718430)                           |                  ~25K subscribers | Visible burnout forecasts and “send everyone on vacation” controls                                                           |

## The version I would build

### 1. Development Intelligence

Make the hidden algorithm understandable without solving the game automatically.

Show:

* Exact focus percentages
* Estimated Design/Tech ratio range
* Genre priority indicators
* Staff workload and overload
* Feature conflicts
* Topic/genre/engine usage counts
* Repetition-risk indicator
* Expected audience fit
* “Why?” tooltips for every warning

Offer three information modes:

* **Classic:** mostly hidden
* **Assisted:** warnings and approximate predictions
* **Analyst:** exact percentages and detailed breakdowns

That preserves discovery for players who enjoy it while supporting people who want to optimize.

### 2. Learn-by-doing employees

Employees should develop through work instead of primarily through training menus.

For every contribution:

```text
XP gained =
    contribution amount
  × task relevance
  × difficulty multiplier
  × mentorship multiplier
  × fatigue multiplier
```

Examples:

* Gameplay and AI increase technical skill.
* Story and dialogue increase design skill.
* Marketing increases business/marketing skill.
* Debugging increases QA skill.
* Leading projects increases management.
* Working outside a specialty grants slower general XP.

Use diminishing returns above high skill levels. Employees can also acquire traits such as:

* Engine Specialist
* Narrative Designer
* Optimization Expert
* Crunch Resistant
* Difficult Collaborator
* Mentor
* Platform Specialist

### 3. A living platform market

This is the biggest improvement over ordinary Game Dev Tycoon clones.

Every platform should possess:

```text
installBase
momentum
audienceComposition
developmentCost
royaltyRate
hardwarePower
publisherSupport
gameLibraryStrength
playerTrust
yearsActive
```

Market share changes each month according to:

```text
marketGrowth =
    baselineGrowth
  + recentExclusiveImpact
  + libraryStrength
  + marketingMomentum
  + hardwareAppeal
  + randomIndustryPressure
  - agingPenalty
  - pricePenalty
  - competitorPressure
```

A hit exclusive boosts its platform, but use caps and gradual decay so a single game cannot permanently dominate the market.

Use seeded alternate history. A platform inspired by a famous historical failure might become successful in one campaign. This greatly improves replayability.

### 4. Rival studios

Give competitors the same underlying rules as the player.

Each rival should have:

* Genre and audience preferences
* Quality level
* Budget strategy
* Risk tolerance
* Technology specialties
* Platform relationships
* Recognizable franchises
* Financial health

Competitors release games, purchase licenses, suffer failures, build fan bases and respond to trends. They should not receive arbitrary revenue or magically perfect games.

The player sees:

* Weekly sales rankings
* Market-share charts
* Upcoming rival releases
* Awards
* Studio-value leaderboard
* Genre saturation
* Public reputation

### 5. Post-release game lifecycle

A game shouldn’t become irrelevant immediately after launch.

Allow:

* Patches
* Free updates
* Expansion packs
* Cosmetic DLC
* Major paid DLC
* Ports
* Definitive editions
* Remasters
* Remakes
* Sequels
* Bundles
* Licensing the IP to another studio

DLC success should depend on the original game’s active audience, quality, price, timing and player goodwill. Aggressive monetization may create short-term revenue but damage reputation.

### 6. Industry-event engine

Build events as data rather than hardcoded sequences:

```json
{
  "id": "component_shortage",
  "conditions": {
    "yearMin": 18,
    "platformType": "console"
  },
  "durationMonths": [8, 18],
  "effects": {
    "hardwareSales": -0.25,
    "developmentCost": 0.12
  },
  "choices": [
    {
      "label": "Delay the release",
      "effects": {
        "quality": 0.05,
        "hype": -0.10
      }
    },
    {
      "label": "Ship as planned",
      "effects": {
        "cost": 0.15,
        "reputationRisk": 0.10
      }
    }
  ]
}
```

Potential events include:

* Hardware shortages
* Economic recessions
* Platform price cuts
* Storefront policy changes
* Subscription-service growth
* New graphics breakthroughs
* Piracy waves
* Review controversies
* Labor disputes
* Publisher bankruptcies
* Surprise genre trends
* Rival studio scandals

## What not to copy

Avoid immediately adding hundreds of consoles, topics and research items. The large expansion mods prove players want variety, but too much content creates menu clutter instead of depth.

Also avoid:

* Contractors directly purchasing Design/Tech points
* Competitors with fake unlimited money
* A single hit permanently controlling the market
* Exact optimal sliders being displayed automatically
* Excessive pop-ups
* A full stock-market simulator in the first version
* Multiplayer before the single-player simulation is stable

## Paste this into Grok

```text
Extend our Game Dev Tycoon-inspired project with a native “Community Expansion” feature set. Do not copy Steam Workshop code, text, assets, names, balance values, or proprietary content. Reimplement only the high-level gameplay concepts.

PRIORITY 1 — DEVELOPMENT INTELLIGENCE

Add three information modes:

1. Classic:
   - Hidden formulas
   - General post-game reports only

2. Assisted:
   - Exact focus percentages
   - Color-coded genre priorities
   - Approximate Design/Tech prediction
   - Workload and feature-conflict warnings
   - Repetition-risk warnings

3. Analyst:
   - Detailed expected output ranges
   - Staff contribution estimates
   - Audience-fit breakdown
   - Previous topic/genre/engine usage
   - Explanation tooltips showing why each modifier applies

The interface must explain mechanics but must not automatically select the optimal configuration.

PRIORITY 2 — LEARN BY DOING

Employees earn XP from their actual contributions.

Implement skills:
- Design
- Technology
- Writing
- Art
- Audio
- QA
- Marketing
- Management

XP formula:

xp =
  contribution
  * taskRelevance
  * taskDifficulty
  * mentorshipModifier
  * fatigueModifier
  * diminishingReturnsModifier

High-skilled employees progress more slowly.
Tasks outside an employee’s specialty grant reduced XP.
Employees can gain traits from repeated behavior.
Training remains available but is supplementary.

PRIORITY 3 — DYNAMIC PLATFORM MARKET

Each platform has:
- installBase
- momentum
- audienceComposition
- developmentCost
- royaltyRate
- hardwarePower
- publisherSupport
- libraryStrength
- playerTrust
- launchDate
- expectedRetirementDate

Update market share monthly.
Successful exclusives and ports affect platform momentum.
Effects must be capped and decay gradually.
Platform outcomes must use seeded randomness so campaigns produce alternate histories.
Include a setting that controls historical predictability.

PRIORITY 4 — RIVAL STUDIOS

Create simulated competitors with:
- specialties
- budgets
- risk tolerance
- franchises
- platform preferences
- reputation
- staff ability
- financial health

Rivals must develop and sell games using the same major simulation rules as the player.
They can follow trends, release competing games, suffer failures, change strategy and leave the market.
Add sales rankings, award results, market charts and studio leaderboards.

PRIORITY 5 — POST-RELEASE MANAGEMENT

Support:
- patches
- free updates
- paid DLC
- expansion packs
- ports
- remasters
- remakes
- sequels
- bundles
- IP licensing

Results depend on:
- original quality
- active players
- fan sentiment
- price
- release timing
- content quality
- franchise fatigue
- platform audience

Aggressive monetization can increase immediate revenue while reducing player trust.

PRIORITY 6 — EVENT SYSTEM

Implement events from external JSON data.
Events require:
- conditions
- probability
- duration
- immediate effects
- monthly effects
- player choices
- follow-up events
- localization keys

Include economic, technological, cultural, staffing, platform and competitor events.

ARCHITECTURE

Separate the simulation into:
- development simulation
- employee progression
- review calculation
- sales simulation
- platform market
- rival studio simulation
- post-release lifecycle
- event engine
- finance system
- UI presentation

All balancing constants must live in configuration files.
All randomness must use a saved campaign seed.
Save files must include a schema version and migrations.
Add deterministic simulation tests.
Add developer debug panels showing the calculation breakdown.
Do not expose debug information during normal Classic-mode play.

Build Priority 1 first and preserve the existing playable loop.
Then implement Priority 2 and Priority 3 behind feature flags.
Return:
1. architecture changes,
2. data schemas,
3. implementation order,
4. migration risks,
5. tests,
6. code changes.
```

If we implement only three of these initially, I’d choose development intelligence, learn-by-doing staff, and the dynamic platform/rival market. Together, those would make the project feel more like a genuine sequel than a reskin.
Exactly. The missing piece is a controlled progression system. The player should begin with a stripped-down game-development loop, then gradually unlock staff, engines, audiences, marketing, publishers, larger games, specializations, R&D, online games, and hardware.

The original game broadly follows garage → office/staff → publishing and larger games → R&D → hardware/console creation. Medium-game research also introduces publishing deals, while specialist progression opens the late-game labs. [Game Dev Tycoon overview](https://en.wikipedia.org/wiki/Game_Dev_Tycoon), [publishing-deal explanation](https://forum.greenheartgames.com/t/unlocking-publishing-deals/1645), [community unlock reference](https://steamcommunity.com/sharedfiles/filedetails/?id=216784744)

Here’s the full Grok-ready progression specification. The exact money, fan, and year requirements below are my recommended balance, not values that must blindly copy the original.

```text
Add a complete campaign-progression, onboarding and progressive-disclosure system to our Game Dev Tycoon-inspired game.

This must integrate with the scoring algorithm, staff progression, dynamic platform market, rival studios and post-release systems already specified.

Do not expose every mechanic, upgrade, technology, game size and department at the beginning.

The player should begin with a simple garage-development loop. More complicated systems should be revealed gradually as the studio becomes successful.

Before changing code:

1. Inspect the existing project structure.
2. Identify the current game loop, research system, save format and UI navigation.
3. Preserve any functioning development and scoring systems.
4. Implement progression through configuration-driven unlock definitions.
5. Do not hardcode unlock checks directly inside UI components.
6. Return the architecture plan before making broad UI changes.

==================================================
CORE PLAYER EXPERIENCE
==================================================

The complete recurring gameplay loop is:

1. Review the current game market.
2. Select a new project.
3. Choose the game’s topic, genre and platform.
4. Later choose audience, size, secondary genre and multiple platforms.
5. Select an existing engine.
6. Assign available staff.
7. Configure the three development stages.
8. Respond to development events.
9. Fix bugs and polish the game.
10. Release the game.
11. Receive critic reviews.
12. Track weekly sales, revenue, fans and reputation.
13. Create a game report.
14. Research technology, train staff or perform contract work.
15. Reinvest earnings into engines, employees, offices, marketing and departments.
16. Develop another game using what the player learned.

The loop grows more complicated over time, but the basic act of making a game must always remain recognizable.

==================================================
FIRST-TIME CAMPAIGN SETUP
==================================================

At the beginning, ask the player to choose:

- Founder name
- Studio name
- Founder appearance
- Campaign seed
- Campaign length
- Difficulty
- Information mode

Information modes:

CLASSIC
- Compatibility information is discovered through game reports.
- Exact formulas remain hidden.
- Slider guidance uses general descriptions.
- No predicted review score.

ASSISTED
- Display exact slider percentages.
- Show approximate Design/Technology output.
- Show workload and compatibility warnings.
- Do not automatically select optimal choices.

ANALYST
- Display detailed estimated output ranges.
- Show known compatibility modifiers.
- Show staff contribution estimates.
- Show repetition and franchise-fatigue warnings.
- Still do not predict an exact final review score.

Information mode and economic difficulty must be separate settings.

==================================================
PHASE 1: THE GARAGE
==================================================

Recommended duration:
- Approximately the first 30–45 minutes
- Around 5–10 released games
- Adjustable through campaign speed

Starting resources:

- One founder
- Approximately $70,000 starting cash
- No employees
- No office expenses
- One free starting platform
- Four randomly selected starting topics
- Five foundational genres
- Small games only
- Basic graphics
- Basic sound
- No custom engine
- No target audience
- No marketing
- No sequels
- No publishing deals
- No staff management
- No multiple platforms
- No post-release content

Starting actions visible in the interface:

- Develop New Game
- View Game History
- View Finances
- Save
- Settings

Do not show disabled buttons for AAA games, MMOs, consoles, R&D labs or other distant features. Those systems should not appear in the interface yet.

FIRST GAME WALKTHROUGH

When the player selects Develop New Game for the first time:

1. Enter a game title.
2. Choose one of four starting topics.
3. Choose one of the foundational genres.
4. Select the starting platform.
5. Begin development.

Do not show audience, game size, engine selection or advanced options yet.

DEVELOPMENT STAGE 1

Show:

- Engine
- Gameplay
- Story/Quests

Explain that raising one area reduces the time available to the others.

Do not explain the exact ideal settings.

DEVELOPMENT STAGE 2

Show:

- Dialogues
- Level Design
- Artificial Intelligence

DEVELOPMENT STAGE 3

Show:

- World Design
- Graphics
- Sound

During development:

- Technology points appear.
- Design points appear.
- Research points occasionally appear.
- Bugs accumulate.
- The player sees the founder working through the stages.
- Development speed depends on skill, workload and enabled features.

POLISHING

After the third stage:

- Development continues briefly.
- Bugs can be removed.
- Technology and Design points can still increase slowly.
- The player decides when to finish.

For the first game, explain:

“Releasing with bugs can reduce reviews and player trust. Additional polishing costs time but may improve the result.”

RELEASE

After release:

- Four critics review the game.
- Each produces a score from 1–10.
- Weekly sales begin.
- Money, fans and market position update.
- The game remains on sale for multiple weeks.
- Sales decline gradually rather than ending immediately.

AFTER THE FIRST RELEASE

Unlock:

- Game Reports
- Research Points display
- Basic research menu
- One additional topic research option

The post-game report should reveal only information learned from that specific game:

- Whether the topic and genre worked well together
- Whether the platform suited the genre
- Whether the slider balance was reasonable
- Whether the game had too many bugs
- Whether a development field appeared especially important

Do not reveal the complete compatibility table.

Each report expands the player’s knowledge database.

==================================================
EARLY GARAGE PROGRESSION
==================================================

After approximately two released games:

Reveal:

- Contract Work

Contracts provide:

- Emergency cash
- Research points
- Small staff/founder experience gains
- Deadlines and failure penalties

Contracts should act as a recovery system for players who cannot afford another game.

After approximately three games and one completed report:

Reveal:

- Research New Topic
- Improved Graphics research
- Basic Sound research
- Custom Engine research

Recommended requirement for Custom Engines:

- Three released games
- At least one completed report
- 50 research points

CUSTOM ENGINE FLOW

After Custom Engine research is completed:

1. The player names the engine.
2. The player selects researched technologies.
3. Every selected technology increases engine cost.
4. Building the engine takes time.
5. The engine can be selected during future projects.
6. New technologies are not automatically added to old engines.
7. The player must create a newer engine to use newly researched components.

The first engine should introduce:

- Improved 2D Graphics
- Basic Save System
- Basic Sound
- Simple Gameplay Feature

Do not display advanced graphics, online play, open worlds, VR or other future technology.

GARAGE EXIT

Recommended office eligibility:

- At least five games released
- At least one game scoring 8 or higher OR a specified fan milestone
- At least $1 million in cash

When eligible, reveal an office opportunity through an event.

The player may decline.

If declined:

- The offer remains available.
- It should not permanently disappear.
- The player can continue releasing small games.
- The game should explain that staff and medium games require expansion.

==================================================
PHASE 2: SMALL STUDIO
==================================================

Moving into the first office unlocks:

- Hiring
- Employees
- Salaries
- Staff energy
- Training
- Vacations
- Team assignments
- Medium-game research eligibility
- Publishing-deal eligibility
- More expensive monthly operating costs

The player initially has room for approximately four people including the founder.

HIRING WALKTHROUGH

The player chooses:

- Search budget
- Desired skill focus
- Candidate experience level

Candidates have:

- Design
- Technology
- Research
- Speed
- Salary
- Traits
- Hidden growth potential
- Genre or platform experience

Do not reveal every hidden trait immediately. Some traits become known after working with the employee.

STAFF ASSIGNMENT

Once employees are available, development screens add:

- Employee assignment per development field
- Workload percentage
- Energy
- Expected contribution range
- Specialization indicator
- Overload warning

An employee can work on multiple areas, but exceeding reasonable workload causes:

- Lower efficiency
- More bugs
- Faster energy loss
- Reduced morale
- Possible burnout

LEARN BY DOING

Employees gain experience from their actual work:

- Engine and AI improve Technology.
- Story and Dialogues improve Design and Writing.
- Graphics improves Art.
- Sound improves Audio.
- Debugging improves QA.
- Project leadership improves Management.
- Research improves Research ability.

Training supplements actual experience but does not replace it.

MEDIUM GAMES

Recommended reveal conditions:

- First office reached
- At least two developers
- At least one custom engine
- Several completed small games

Medium Games appear as a research item only after those conditions are close to being satisfied.

Researching Medium Games unlocks:

- Medium project size
- More feature capacity
- Longer development
- Higher development costs
- Publishing deals
- More complex staff assignments

The new-game screen must continue to show Small and Medium only. Large and AAA must remain hidden.

PUBLISHING DEALS

Publishing deals should be introduced as a way for a small company to reach a larger audience.

Each deal specifies:

- Required topic
- Required genre
- Required audience, if unlocked
- Required platform
- Minimum review score
- Advance payment
- Royalty percentage
- Publisher marketing strength
- Failure penalty

Publishing provides market reach and fans but takes most revenue.

The intended progression is:

1. Use publishers to release early medium games.
2. Build a larger fan base.
3. Improve the team and engine.
4. Eventually self-publish medium games.

TARGET AUDIENCE

Target Audience should unlock during the early studio phase through a market-research event.

Available audiences:

- Young
- Everyone
- Mature

Before it is researched, games use Everyone as an invisible default.

Once unlocked:

- Audience becomes a visible project choice.
- Topic × Audience compatibility applies.
- Platform × Audience compatibility applies.
- Game reports begin analyzing audience fit.

BASIC MARKETING

Marketing should be revealed only after the player has:

- Built a moderate fan base, or
- Started a medium game, or
- Received a publisher-related tutorial

Initial marketing options:

- Social announcement
- Magazine advertisement
- Small campaign

Later marketing options remain hidden.

SEQUELS

Recommended reveal conditions:

- At least one game scoring 8 or higher
- The game has been off the market for a reasonable period
- The player has created multiple original titles

When Sequels are researched:

- Existing games can become franchises.
- The player selects a previous game as the parent title.
- The sequel inherits franchise awareness.
- Releasing it too quickly creates fatigue.
- Reusing the same engine can create a technology penalty.
- A meaningfully improved engine can grant a bonus.

Do not reveal remasters, remakes or expansions yet.

==================================================
PHASE 3: ESTABLISHED STUDIO
==================================================

Recommended entry requirements:

- Four employees
- Approximately 100,000–150,000 fans
- Successful medium game
- Strong cash reserve
- Sufficient campaign year or industry era

This phase unlocks a larger office with room for approximately six or seven people.

New systems:

- Large Games
- Multi-Genre
- Multi-Platform
- Advanced marketing
- Convention booths
- Staff specializations
- Franchise management
- Rival charts
- Platform market-share analytics
- Ports
- Patches and free updates

LARGE GAMES

Recommended research requirements:

- Four or more developers
- At least one successful medium game
- Approximately 150,000 fans
- Modern custom engine
- Larger office

Large games:

- Require substantially more development time.
- Have higher feature capacity.
- Require broader staff coverage.
- Carry larger financial risk.
- Produce more hype.
- Support advanced post-release options.
- Should perform poorly if made by an undersized or inexperienced team.

MULTI-GENRE

Reveal after the player has:

- Created games in at least three genres
- Completed multiple reports
- Reached the larger studio

Multi-Genre allows:

- Primary genre
- Secondary genre

The primary genre controls approximately two-thirds of compatibility and slider expectations. The secondary genre controls approximately one-third.

MULTI-PLATFORM

Reveal after the player has:

- Purchased several platform licenses
- Released successful games on multiple platforms
- Researched platform optimization

Multi-platform development adds:

- Additional licensing costs
- Optimization workload
- Potential generation-gap penalties
- Larger market reach
- Platform-specific bugs
- Possible staggered releases

PORTS

Ports should unlock separately from simultaneous multi-platform development.

A port:

- Starts from an existing released game
- Costs less than developing a new game
- Depends on platform-generation compatibility
- Can introduce new bugs
- Reaches a new audience
- Can revive sales
- May damage reputation if poorly optimized

ADVANCED MARKETING

Reveal:

- Large campaign
- Demo
- Trailer
- Convention booth
- Press interviews
- Influencer previews
- Platform promotion deals

Marketing increases hype but cannot turn a terrible game into a permanent success.

Excessive hype creates higher expectations.

RIVAL STUDIOS

Rivals should exist in the background from the start, but detailed rival information unlocks here.

Show:

- Weekly sales chart
- Top games
- Major rival releases
- Studio rankings
- Genre saturation
- Platform market share
- Award nominations

Do not simulate rivals as cosmetic random announcements. They should release games using the same major market and quality rules as the player.

==================================================
PHASE 4: TECHNOLOGY PARK AND R&D
==================================================

Recommended requirements:

- Large office
- Successful large game
- Experienced staff
- At least one Design Specialist
- Significant cash reserve

R&D LAB

Once eligible, reveal the R&D department as a physical office expansion.

The R&D Lab conducts long-term projects while the main team continues developing games.

Possible R&D projects:

- Advanced graphics
- Improved AI
- Online services
- Digital distribution
- Advanced optimization
- MMO technology
- Procedural generation
- Motion controls
- Cloud saves
- Subscription services
- Advanced engine licensing
- Major marketing campaigns
- AAA production methods

Do not display all projects immediately.

Each project has its own reveal conditions.

Example:

Online Services is hidden until:
- The industry reaches an online-capable era.
- The player has released several games on connected platforms.
- The player owns the R&D Lab.

MMO remains hidden until:
- Online Services is researched.
- The studio has successfully created a large online game.
- Server technology becomes available.

AAA GAMES

Recommended reveal requirements:

- At least one Large game with an average review of 9 or higher
- Full main development team
- Multiple specialists
- Advanced engine
- Large cash reserve
- R&D Lab

AAA development requires:

- Pre-production
- Large development budget
- Multiple specialists
- Significant marketing
- Long production time
- Advanced graphics
- QA coverage
- Management capacity

AAA games should not simply be “Large Games with a bigger multiplier.”

Add:

- Pre-production decisions
- Production milestones
- Delay options
- Scope management
- Feature cuts
- Crunch risk
- Marketing commitments
- Public expectations

POST-RELEASE MANAGEMENT

Unlock post-release actions gradually:

Early studio:
- Bug patch

Established studio:
- Free update
- Port

R&D phase:
- Paid DLC
- Expansion
- Definitive edition
- Remaster
- Remake

A game retains:

- Active players
- Lifetime sales
- Player sentiment
- Review reputation
- Franchise strength
- Update history
- Monetization sentiment
- Platform distribution

DLC and expansions depend on the active audience of the original game.

MMO GAMES

MMOs require:

- Online technology
- Server infrastructure
- Large or AAA production capability
- Ongoing support team
- Significant cash reserve

After release, MMOs generate:

- Monthly server costs
- Active subscribers or active players
- Support workload
- Content demands
- Expansion opportunities
- Community sentiment

An abandoned MMO should decline quickly.

==================================================
PHASE 5: HARDWARE AND PLATFORM OWNERSHIP
==================================================

Recommended requirements:

- R&D Lab
- Technology Specialist
- Hardware research
- Major cash reserve
- Strong studio reputation
- Large fan base

HARDWARE LAB

The Hardware Lab should be a separate department.

Initial projects:

- Hardware research
- Development kit
- Prototype components
- Operating system
- Controller technology

After completing foundational projects, unlock custom platform development.

CUSTOM CONSOLE DEVELOPMENT

Console creation should include:

- Console name
- Hardware power
- Manufacturing cost
- Retail price
- Target audience
- Controller features
- Storage
- Online capabilities
- Developer friendliness
- Launch window
- Launch titles
- Marketing budget

The player must decide between:

- Expensive powerful hardware
- Affordable mass-market hardware
- Specialist audience hardware
- High royalty revenue
- Developer-friendly low royalties

Console success depends on:

- Price
- Hardware appeal
- Marketing
- Launch games
- Existing studio reputation
- Rival platforms
- Third-party support
- Manufacturing capacity
- Player trust

A successful exclusive game can increase the console’s momentum, but the effect must be capped and decay gradually.

The player may:

- Release first-party exclusives
- License development kits
- Negotiate third-party games
- Reduce platform royalties
- Fund rival studios
- Update hardware
- Discontinue an unsuccessful console

==================================================
PHASE 6: LEGACY AND ENDGAME
==================================================

The standard campaign should conclude after a configurable number of in-game years.

The campaign ending should not delete the save.

Offer:

- Final studio score
- Continue in Endless Mode
- Start New Campaign
- Start New Game Plus
- Export campaign statistics

Final score categories:

- Total revenue
- Company value
- Lifetime game sales
- Number of fans
- Highest-rated game
- Most successful franchise
- Awards
- Staff development
- Technology leadership
- Platform market share
- Player trust
- Rival position
- Historical impact

Endless mode continues with:

- Procedurally generated platforms
- New competitors
- New technologies
- Industry events
- Franchise aging
- Platform generations
- Economic changes
- Staff retirement
- New employee generations

==================================================
PROGRESSIVE DISCLOSURE SYSTEM
==================================================

Every unlockable system must use this state machine:

HIDDEN
- Completely absent from the normal interface.
- No disabled button.
- No visible research card.
- No detailed tooltip.

TEASED
- Mentioned through news, events or generic UI language.
- The exact feature may remain unnamed.
- Example: “Developers are beginning to experiment with networked games.”

DISCOVERED
- The feature name becomes visible.
- The player receives an explanation.
- Its requirements can now be inspected.

RESEARCHABLE
- All mandatory prerequisites are satisfied.
- The player can spend research points and money.

RESEARCHING
- The research project is currently active.

OWNED
- Research is complete.
- The technology can now be used.

IN_ENGINE
- The technology has been installed in a custom engine.

MASTERED
- The technology has gained sufficient experience to reveal an advanced version.

Use this basic unlock structure:

{
  "id": "online_play",
  "category": "engine_feature",
  "state": "hidden",
  "revealConditions": {
    "minimumEra": 4,
    "releasedGames": 12,
    "requiresAnyPlatformTag": ["online_capable"]
  },
  "unlockConditions": {
    "research": ["network_foundations"],
    "officeLevel": 3
  },
  "researchCost": 80,
  "moneyCost": 500000,
  "engineStage": "gameplay",
  "effects": {
    "technologyPotential": 12,
    "developmentCost": 0.08,
    "bugRisk": 0.05
  }
}

All unlock conditions must be evaluated by a ProgressionService.

UI components should ask the ProgressionService which items are visible. UI components must not independently decide whether an item is unlocked.

==================================================
TECHNOLOGY REVEAL RULES
==================================================

Never display an entire linear upgrade chain.

If the player owns 2D Graphics V1:

- V2 may eventually become visible.
- V3, V4 and later versions remain hidden.

When V2 is researched:

- V3 can become teased once era and mastery conditions approach.
- Only the next relevant upgrade appears.

Use this system for:

- Graphics
- Sound
- AI
- Save systems
- Dialogue systems
- World simulation
- Online features
- Optimization
- Development tools
- Physics
- Input technology
- Platform hardware

Future technologies should be introduced through industry news before becoming researchable.

Example:

1. News announces the rise of 3D accelerator technology.
2. “3D Graphics” enters TEASED state.
3. The player reaches the required era and graphics experience.
4. 3D Graphics V1 enters DISCOVERED state.
5. The player satisfies prerequisites.
6. It becomes RESEARCHABLE.
7. Research completes.
8. The player builds a new engine containing 3D Graphics.
9. Games using it generate mastery.
10. Mastery and industry progress eventually reveal V2.

Technology must not become active merely because it was researched. It must be installed in a compatible custom engine.

==================================================
RESEARCH-SCREEN RULES
==================================================

The research screen should show:

- Researchable items
- Recently discovered items
- A small number of near-future teased items
- Owned technologies
- Legacy technologies in a collapsible section

It should not show hundreds of locked entries.

Maximum suggested visible items per category:

- 3–5 immediately available
- 1–2 teased
- Unlimited owned items inside collapsible sections

If several technologies unlock simultaneously:

- Group them into one notification.
- Do not interrupt the player with repeated pop-ups.
- Add a “New Research Available” indicator.

==================================================
PROGRESSION TRIGGERS
==================================================

Support these trigger types:

- In-game date
- Industry era
- Number of released games
- Game review threshold
- Lifetime sales
- Fan count
- Cash balance
- Office level
- Staff count
- Staff level
- Staff specialization
- Completed research
- Technology mastery
- Number of completed reports
- Genres used
- Platforms used
- Successful franchise
- Successful game size
- Rival or market event

Use a combination of time and accomplishments.

Do not unlock major systems purely because the player waited.

Do not permanently block progression because the player missed one specific event.

Every major feature needs at least one recoverable progression path.

==================================================
MARKET AND PLATFORM PROGRESSION
==================================================

Platforms should be announced before release.

Platform lifecycle:

1. Rumored
2. Announced
3. Development kits available
4. Released
5. Growth
6. Market peak
7. Decline
8. Retirement announced
9. Retired

Before release:

- Show limited public specifications.
- Allow early license purchase where appropriate.
- Do not reveal exact future market share.

After release:

- Market share changes monthly.
- Audience composition becomes clearer through market reports.
- Rival releases affect momentum.
- Successful exclusives affect momentum.
- Platform age eventually causes decline.

Retired platforms:

- Cannot receive new standard releases.
- Existing games may continue selling briefly.
- Can later support retro ports, remasters or collections.

==================================================
PLAYER GUIDANCE
==================================================

Tutorial guidance should respond to player behavior.

Examples:

After a low review:
- Suggest creating a game report.

After releasing with many bugs:
- Explain polishing and patches.

After employee overload:
- Explain workload and assignments.

After repeated topic/genre use:
- Explain market fatigue without revealing the exact penalty.

After running low on cash:
- Suggest contract work or publishing deals.

After a successful game:
- Introduce sequels or franchise planning when eligible.

After building new technology:
- Remind the player that a new custom engine is required.

After a platform enters decline:
- Warn the player before starting an expensive exclusive.

Do not automatically correct the player’s choices.

==================================================
BANKRUPTCY AND RECOVERY
==================================================

Financial failure should be dangerous but understandable.

Recovery options:

- Contract work
- Publishing deals
- Reduce marketing
- Cancel a project
- Delay office expansion
- Sell engine licenses
- Take a limited emergency loan
- Lay off staff with reputation consequences
- Sell or license an IP
- Accept acquisition in late-game failure

Bankruptcy warning stages:

1. Cash-flow warning
2. Severe financial warning
3. Emergency funding offer
4. Final deadline
5. Bankruptcy or acquisition outcome

The game must explain:

- Monthly expenses
- Staff salaries
- Office costs
- Development spending
- Marketing commitments
- Expected remaining runway

==================================================
SAVE DATA
==================================================

Save progression state for:

- Unlock states
- Completed research
- Research in progress
- Technology mastery
- Office level
- Department availability
- Tutorial completion
- Game-report discoveries
- Compatibility knowledge
- Industry era
- Platform lifecycle
- Staff progression
- Franchise history
- Rival history
- Campaign seed
- Campaign configuration
- Save schema version

Add save migrations whenever progression fields change.

==================================================
REQUIRED ARCHITECTURE
==================================================

Create or preserve these modules:

ProgressionService
- Evaluates all reveal and unlock conditions.
- Changes progression states.
- Emits unlock events.

UnlockRegistry
- Loads definitions from configuration.
- Validates prerequisite references.
- Detects circular dependencies.

ResearchService
- Starts and completes research.
- Handles costs and duration.

KnowledgeService
- Stores discoveries from game reports.
- Controls compatibility information shown to the player.

TutorialDirector
- Selects contextual tutorials.
- Prevents repeated tutorials.

NotificationQueue
- Groups unlock notifications.
- Prevents pop-up flooding.

EraService
- Tracks industry eras and time-based technology availability.

SaveMigrationService
- Migrates old campaign saves.

The simulation must remain independent of React, Vue or other UI components.

==================================================
AUTOMATED TESTS
==================================================

Write deterministic tests for:

1. A new campaign exposes only starting systems.
2. Future technologies do not appear in the UI payload.
3. The first release unlocks game reports.
4. Reports add only knowledge earned from that game.
5. Custom engines remain hidden until early prerequisites are met.
6. Researching technology does not add it to an existing engine.
7. Office eligibility triggers correctly.
8. Declining an office does not permanently remove the opportunity.
9. Staff systems appear only after moving offices.
10. Medium Games unlock Publishing Deals.
11. Large Games remain hidden during the small-studio phase.
12. Sequels require an eligible previous game.
13. Premature sequels receive the appropriate penalty.
14. R&D requires the proper studio and specialist conditions.
15. MMO remains hidden until online prerequisites are completed.
16. Hardware Lab requires technology specialization.
17. AAA remains unavailable until a successful Large game.
18. Linear technologies reveal only the next version.
19. Multiple simultaneous unlocks create one grouped notification.
20. No progression path contains a circular prerequisite.
21. Every mandatory campaign system has a reachable path.
22. Save and reload preserve all unlock states.
23. Old saves migrate without unlocking everything.
24. Campaign seeds produce deterministic market progression.
25. Endless Mode begins without resetting the studio.

==================================================
IMPLEMENTATION ORDER
==================================================

Implement in this order:

1. Progression state machine
2. Configuration-driven unlock registry
3. Save-data support and migrations
4. Starting garage restrictions
5. First-game tutorial
6. Game reports and knowledge discovery
7. Custom engine progression
8. Office, hiring and training
9. Medium games and publishing deals
10. Audience, marketing and sequels
11. Large studio and Large games
12. Multi-genre and multi-platform
13. Rival and market information
14. R&D Lab
15. AAA and post-release systems
16. Online technology and MMOs
17. Hardware Lab and custom consoles
18. Campaign ending and Endless Mode
19. Balance pass
20. Full deterministic progression tests

Build each major phase behind a feature flag.

After each phase:

- Verify that existing saves still load.
- Verify the standard game-development loop still works.
- Verify future features are not leaking into the interface.
- Provide the files changed.
- Provide tests executed.
- Explain any incomplete systems.

The player should always understand the next immediate goal, but should never see the entire future technology tree from the beginning.
```

The most important design decision is that unlocks should depend on both industry progress and player accomplishment. That prevents someone from sitting idle until every upgrade appears, while also preventing a struggling player from becoming permanently stuck.
One important correction before we proceed:

“Simpler UI” does NOT mean a plain admin dashboard, generic SaaS cards, or a basic Game Dev Tycoon clone.

Until we design and build the full isometric studio, I want a polished 2D interface that feels like a premium modern management game.

2D VISUAL DIRECTION

Use a sophisticated dark interface with:

- Deep charcoal and near-black backgrounds
- Warm off-white primary text
- One strong electric accent color
- Secondary colors reserved for money, warnings, research, Design and Technology
- Thin borders, controlled shadows and subtle surface layering
- Strong typography and clear information hierarchy
- Large editorial numbers for cash, fans, score and sales
- Tasteful charts, timelines, status indicators and animated progress
- Custom game-style icons instead of generic business-dashboard icons
- Smooth, restrained transitions
- No excessive glassmorphism
- No bubbly mobile-app styling
- No fake 3D office
- No generic Bootstrap/admin-template appearance

It should feel like an actual strategy/tycoon game, not accounting software.

LAYOUT

Use a reusable game shell:

Top status bar:
- Studio name
- Current date and campaign year
- Cash
- Monthly expenses
- Fans
- Research points
- Current industry era
- Speed controls and pause

Left navigation:
- Studio
- Develop
- Games
- Staff
- Research
- Market
- Finances

Only display navigation sections that have been unlocked. Do not show distant features as permanently disabled menu items.

Contextual bottom action dock:
- Develop New Game
- Create Report
- Research
- Contract Work
- Train Staff
- Manage Current Project

The actions in this dock must change according to the player’s current situation and progression.

DASHBOARD

The main Studio screen should feel like a command center rather than a collection of equally sized cards.

Give it a strong visual hierarchy:

1. Large primary panel for the current project or immediate next action
2. Compact studio-status strip showing cash runway, reputation and staff energy
3. Market Pulse showing trending genres, platforms and major industry news
4. Recent Games section with cover art, critic score, sales and current status
5. Staff strip with portraits, energy, workload, specialties and active assignments
6. A clear contextual objective showing what the player is working toward next

The screen should immediately answer:

- What am I currently doing?
- What needs my attention?
- How is the studio performing?
- What can I do next?
- What am I close to unlocking?

GAME DEVELOPMENT SCREEN

This should be the visual centerpiece of the 2D version.

Use:

- A horizontal production timeline
- Three clearly separated development stages
- Large, satisfying focus sliders
- Staff portraits directly attached to assignments
- Animated Design, Technology, Research and Bug counters
- Workload rings or bars
- Feature chips
- Stage progress
- Contextual warnings
- Expandable “Why?” explanations
- A visible estimated Design/Technology balance when the selected information mode allows it

Do not bury development inside forms and dropdowns. It should feel active and tactile even though it is entirely 2D.

VISUAL PROGRESSION

The interface should subtly evolve with the industry:

- Early era: restrained pixel-grid and terminal-inspired accents
- 1990s: sharper colors and early multimedia styling
- 2000s: cleaner digital production aesthetic
- Modern era: denser analytics, richer motion and advanced market visualization

Do not rebuild the layout every era. Change accent graphics, textures, icon treatments and small visual details while preserving usability.

The growing studio should also affect the dashboard:

- Garage: sparse, personal and slightly improvised
- Small studio: structured team-management interface
- Established studio: more analytics and production controls
- AAA studio: dense but organized command-center presentation

ARCHITECTURE REQUIREMENT

Build the 2D interface from modular panels and shared design tokens. Keep the central studio/project visualization replaceable so we can later introduce an isometric studio without rewriting the navigation, data flow or simulation screens.

For now, the 2D UI must be treated as a polished production interface, not a temporary placeholder.

Before implementing the complete UI, create the design system and show the following screens for visual approval:

1. Garage dashboard
2. Active game-development screen
3. Small-studio dashboard with employees
4. Research screen showing progressive disclosure
5. Market/platform screen

Use realistic game data in the mockups. Do not show empty wireframes or generic placeholder cards.
Pause here. The architecture direction is approved, but the current five UI mockups are rejected.

Do not begin implementing the shell yet.

The interface still looks like a polished SaaS/admin dashboard. Dark colors and gaming terminology do not change the underlying problem: too many cards, panels, numbers, charts and navigation elements competing simultaneously.

I do not want the existing mockups “cleaned up.” Redesign the visual concept.

NEW CORE DIRECTION

Create a flat 2D management-game interface built around visual representation rather than dashboard panels.

Use:

- Minimal stylized 2D figures for the founder and employees
- Character portraits only when additional detail is needed
- Illustrated desks, computers, workstations, blueprints and platform silhouettes
- Small custom icons for Design, Technology, Bugs, Research, Energy and Cash
- Information attached directly to the figure or object it describes
- One dominant gameplay visualization per screen
- Contextual drawers and overlays instead of permanently visible panels
- Restrained animation that makes the studio feel alive

This is not an isometric room and not a fake 3D office. Use a flat, frontal or side-view 2D composition with a mature editorial/vector style.

Do not make it childish, bubbly, mobile-game-like or cartoonish.

SHOW INSTEAD OF LISTING

Whenever possible, represent game state visually:

- Employee energy: posture, expression and a small energy arc
- Workload: activity around the person or workstation
- Bugs: small bug indicators emerging from the active project
- Design and Technology: distinct visual particles or counters flowing into the game
- Research: blueprints, prototypes and discoveries appearing on a workbench
- Studio growth: more desks, employees and equipment appearing naturally
- Platform momentum: device silhouettes supported by audience figures or simple momentum trails
- Current project: cover art or a game cartridge/disc/package evolving during production

Do not turn every piece of information into a card.

LAYOUT RULES

Each screen should contain:

- One dominant visual area occupying approximately 65–75% of the screen
- No more than one secondary information panel
- A very slim top strip containing only date, cash and time controls
- A minimal unlocked-navigation icon rail or small dock
- Labels appearing on hover or selection
- Contextual actions appearing only when relevant
- Deeper statistics inside optional drawers

Avoid:

- Card grids
- KPI rows
- Equal-sized panels
- Permanent market charts
- Large navigation menus
- Multiple competing progress bars
- Excessive numerical detail
- “Command center” or analytics-dashboard layouts
- Generic Lucide-style business icons
- Empty decorative panels

REVISED SCREEN CONCEPTS

1. GARAGE STUDIO VIEW

This is not a dashboard.

Show a large flat 2D garage workspace with the founder at a desk. The desk, computer, project, research notes and exit/upgrade area can act as interactive objects.

The current activity should dominate the scene.

Only show:

- Date
- Cash
- Time controls
- One immediate objective
- One main contextual action

Game history, finances, reports and research should open as focused overlays or drawers.

2. ACTIVE DEVELOPMENT

Make the project itself the centerpiece.

Show:

- Large evolving game cover or project visual
- Three-stage production path
- Founder/staff figures connected directly to their assignments
- Only the current stage’s sliders
- Design, Technology and Bugs appearing visually during development
- Staff workload attached to each figure
- One expandable explanation area when Assisted or Analyst mode allows it

Do not display all three stages as separate dashboard panels.

3. SMALL STUDIO

Show the actual team as four stylized 2D figures at workstations.

Status should be embedded around the people:

- Energy beside the figure
- Specialty represented by one symbol
- Current task shown at the workstation
- Workload warning attached to the affected employee

Selecting a figure opens their full profile in one side drawer.

Do not create four employee cards plus multiple production panels.

4. RESEARCH

Use a visual research workbench or blueprint board.

Show only:

- 3–5 currently researchable inventions as illustrated objects
- One or two teased discoveries as partially obscured silhouettes or incomplete blueprints
- The active research project
- Owned technology inside a separate archive drawer

Do not use a full research tree or a grid of rectangular research cards.

5. MARKET

Use a large horizontal platform-lifecycle visualization with recognizable fictional device silhouettes.

Represent:

- Platform growth and decline visually
- Audience size with compact groups of figures or proportional marks
- Genre heat with a small number of symbols
- Upcoming platform launches along the timeline

Detailed charts should appear only after selecting a platform or opening Market Analysis.

FIRST REVISION CHECKPOINT

Do not rebuild all five screens yet.

Create only one revised Garage Studio View first. It must demonstrate:

- The new 2D figure/object visual language
- Reduced interface chrome
- Information attached to the scene
- One dominant composition
- Minimal cards and statistics
- A clear playable action

Keep the live simulation unchanged.

Once that single screen is visually approved, apply its visual language to Active Development, Small Studio, Research and Market.
This is moving in a better visual direction. Do not redesign it again or return to the dark dashboard concept.

However, the build is still missing the actual Game Dev Tycoon gameplay loop. Right now it appears to create and develop games automatically without waiting for my development decisions.

The game must never choose my development sliders or advance through stages without my input.

DEVELOPMENT FLOW

Replace the current development behavior with this mandatory sequence:

1. Project Setup
2. Stage 1 Configuration
3. Stage 1 Development
4. Stage 2 Configuration
5. Stage 2 Development
6. Stage 3 Configuration
7. Stage 3 Development
8. Polishing
9. Release
10. Reviews and Weekly Sales

When I click Develop:

* Create the project but pause time.
* Open Stage 1 before any development begins.
* Require me to set the three Stage 1 sliders.
* Do not automatically select optimal values.
* Development begins only after I confirm the stage.
* When Stage 1 finishes, pause automatically and open Stage 2.
* Repeat this process for Stage 3.
* After Stage 3, enter a separate polishing phase.
* Let me decide when to finish and release the game.

STAGE SLIDERS

Only display the current stage’s three sliders.

Stage 1:

* Engine
* Gameplay
* Story/Quests

Stage 2:

* Dialogues
* Level Design
* Artificial Intelligence

Stage 3:

* World Design
* Graphics
* Sound

Do not show all nine sliders simultaneously.

The screenshot currently says Stage 3/3 while showing every slider. That is not a real stage system. Previous stages should appear as completed points on the production timeline, but their sliders should no longer be editable.

The selected values must be stored on the project and passed into the existing quality/scoring system. They cannot be decorative controls.

Remove automatic balancing as the default behavior. If Auto-balance remains available in Assisted or Analyst information mode, it must be an optional button that I deliberately select. It must never run automatically.

ACTIVE DEVELOPMENT VIEW

Development should remain visible while time progresses.

Show:

* Current project title
* Current development stage
* Stage progress
* Overall project progress
* Design points
* Technology points
* Research points earned
* Current bugs
* Founder or assigned employees actively working
* Enabled features for the current stage
* Workload or efficiency
* A visible pause state when the next decision is required

Design, Technology, Research and Bugs should increase visibly while the project is being built.

SEPARATE GAME SCREENS

Do not place the entire game inside one page or one long modal.

Use the current bottom navigation as real view switching, similar to Game Dev Tycoon. Each major system should open its own focused screen or tabbed interface:

* Studio
* Develop
* Games
* Research
* Staff
* Engines
* Platforms
* Finances
* Settings

Only show sections that are unlocked.

The garage remains the main Studio view. Selecting another section should switch to that section instead of stacking more content over the garage.

Use modals only for short decisions and confirmations. Large systems such as Research, Game History and Finances should have dedicated screens.

RESEARCH

Research is already unlocked in the current campaign. Do not hide it, reset it or make me unlock it again.

The Research screen must not be one long list containing every category. Separate it into tabs:

* Topics
* Technologies
* Engine Features
* Studio
* Completed

Only show a tab when that category has been discovered.

Inside each tab:

* Show researchable items first.
* Show the active research project.
* Show only one or two teased future discoveries.
* Move owned research into the Completed tab.
* Do not display the entire future technology tree.
* Preserve the player’s existing research points and completed research.

Research must take time. Spending points should begin a research job rather than instantly granting every item.

GAMES AND SALES

Add a dedicated Games screen with tabs:

* In Development
* On Sale
* Released
* Reports

Selecting a released game must show:

* Four critic review scores
* Average review score
* Weekly units sold
* Weekly revenue
* Development cost
* Marketing cost
* Total revenue
* Current profit or loss
* Lifetime sales
* Fans gained
* Number of weeks on the market

Add a real weekly sales line graph.

The graph must use stored weekly sales history from the simulation, not placeholder values. Sales should rise or fall based on the game’s quality, hype, platform market share, competition and age. They should decline gradually over multiple weeks.

Allow multiple released games to remain on sale simultaneously.

POST-RELEASE LOOP

After release:

1. Display four individual critic reviews.
2. Begin the first sales week.
3. Add the game to the On Sale tab.
4. Update sales each week.
5. Update cash and fans.
6. Allow a Game Report after the game has released.
7. Record discoveries from the report.
8. Eventually remove the game from sale while preserving its complete history.

The player should see the relationship between development choices, reviews and sales.

GAME EVENTS

Fix the repeated event spam visible in the screenshots. The same “Hardware shortage” or fan-club event should not appear repeatedly within a short period.

Events need:

* Unique IDs
* Cooldowns
* Eligibility conditions
* A record of recently shown events
* Protection against consecutive duplicates

IMPLEMENTATION REQUIREMENT

Use a proper development state machine:

PROJECT_SETUP
STAGE_1_CONFIG
STAGE_1_RUNNING
STAGE_2_CONFIG
STAGE_2_RUNNING
STAGE_3_CONFIG
STAGE_3_RUNNING
POLISHING
RELEASE_REVIEWS
ON_SALE
OFF_MARKET

Time must pause during every CONFIG state.

The simulation cannot enter a RUNNING state until the player confirms that stage’s sliders.

Do not work on late-game systems yet. First make this core loop genuinely playable:

Create game → choose sliders for each stage → watch development → polish → release → receive reviews → watch weekly sales → create report → research improvements → create another game.

Keep the current visual direction and bottom navigation. This revision is primarily about adding the missing game mechanics, screen separation and player control.
ADDITIONAL REQUIRED FIXES

NAVIGATION IS CURRENTLY BROKEN

Several visible buttons do not work. I cannot reliably return to the main menu.

Every visible button must perform its intended action. Do not leave decorative or placeholder controls in the playable build.

Required navigation:

* A persistent Pause/Menu button during gameplay
* Resume Game
* Save Game
* Load Game
* Settings
* Cheats
* Return to Main Menu
* Quit Campaign

Returning to the main menu must ask for confirmation if there are unsaved changes. From the main menu, I must be able to resume or load the campaign normally.

Back buttons, bottom navigation and tabs must return to the correct previous screen. They cannot close the interface, restart the campaign or lead to a dead end.

CHEAT OPTIONS

Add an actual Cheats section accessible from the in-game Pause/Menu screen.

Include:

* Add cash
* Add fans
* Add research points
* Remove bugs
* Refill staff energy
* Instantly complete current research
* Unlock a selected topic
* Unlock a selected technology
* Unlock a selected game system
* Unlock all currently era-eligible content
* Unlock everything
* Disable bankruptcy
* Advance the industry date or era

“Unlock currently era-eligible content” and “Unlock everything” must be separate options.

Cheats must update the real simulation state, not only the displayed values. Cheat usage must persist after saving and loading. Clearly mark the campaign as Cheats Enabled so it cannot be confused with a normal campaign.

PROGRESSIVE SYSTEM UNLOCKS

A normal campaign must not begin with every game system available.

Major systems must unlock as the studio and industry progress, including:

* Game Reports
* Research
* Custom Engines
* Hiring
* Training
* Medium Games
* Publishing Deals
* Target Audiences
* Marketing
* Sequels
* Large Games
* Multi-Genre
* Multi-Platform
* Ports
* Advanced Marketing
* R&D
* AAA Development
* Post-release Content
* Online Games
* MMOs
* Hardware Development
* Custom Consoles

Before a system is unlocked:

* Its navigation tab should normally remain hidden.
* Its actions must not appear.
* The player cannot use it through another screen.
* Future systems may only be teased through appropriate news or events.

When a system unlocks:

* Show one grouped notification.
* Explain what unlocked and why.
* Add its navigation or contextual action.
* Preserve the unlock in the save.

The current campaign already has Research unlocked, so do not remove it from this save. These restrictions apply correctly to new campaigns and according to saved progression.

TECHNOLOGY PROGRESSION

Technologies must also appear gradually with industry eras and player accomplishments.

Do not expose the complete graphics, sound, AI, engine or online technology chains at the beginning.

Examples:

* Start with only era-appropriate basic technology.
* Show only the next relevant upgrade.
* Later versions remain completely hidden.
* Announce emerging technology through industry news.
* Make it discoverable only when its era approaches.
* Require research before ownership.
* Require installation in a new compatible engine before it affects games.
* Use games made with that technology to build mastery and reveal its next version.

Reaching a later year alone must not unlock everything. Major technologies should require both:

* Industry or platform progress
* Player accomplishments, research or mastery

All system and technology visibility must come from ProgressionService. Individual screens must not contain their own hard-coded unlock logic.

ACCEPTANCE TESTS

Before calling this revision complete, verify:

1. Every visible button works.
2. I can return to the main menu and resume my save.
3. All bottom-navigation destinations open correctly.
4. Cheats are accessible and modify actual game state.
5. Cheat state survives save and reload.
6. A fresh campaign begins with only starting systems.
7. Systems appear as the player progresses.
8. Future technology remains hidden.
9. Only the next eligible technology version becomes visible.
10. Researching technology does not automatically add it to an existing engine.
11. My existing save retains Research and previously earned progression.
12. Waiting without accomplishing anything does not unlock every major system.

Do not continue into late-game feature development until navigation, cheats, development stages, sales and progression unlocks are all functional.
NEXT REFINEMENT: QUALITY, REVIEWS AND SALES ALGORITHM V1

Keep the existing `qualityEngine.ts`, but refactor its inputs and output breakdown around this specification.

Do not recreate Game Dev Tycoon’s exact scoring formula. In particular, do not require every new game to outperform the studio’s previous best game to receive strong reviews. Past success may create expectations, but success must never secretly make the next game worse.

CORE PRINCIPLES

* Player decisions must materially affect results.
* Every score must be explainable after release.
* Some information may remain undiscovered, but the underlying calculation must remain consistent.
* Poor results should identify actual weaknesses.
* Randomness adds variation, not arbitrary failure.
* All calculations must be deterministic from the campaign seed.
* Saving and reloading cannot reroll reviews or sales.
* Raw quality, critic reception and commercial success must be separate calculations.

==================================================

1. STAGE EFFORT AND SLIDERS
   ==================================================

Each development stage has exactly 100 effort points.

The three sliders divide those 100 points. They are not three independent bonuses.

Example:

* Engine: 50
* Gameplay: 35
* Story/Quests: 15

Increasing one slider must reduce the available effort for the others.

Store every confirmed stage configuration on the project:

```ts
type StageAllocation = {
  stage: 1 | 2 | 3
  allocations: Record<DisciplineId, number>
  assignedStaffIds: string[]
  selectedFeatureIds: string[]
  confirmedAtWeek: number
}
```

Only the active stage can be configured. Once confirmed, its settings cannot silently change.

Recommended Design/Technology contribution ratios:

```ts
const disciplineMix = {
  engine:          { design: 0.20, tech: 0.80 },
  gameplay:        { design: 0.60, tech: 0.40 },
  storyQuests:     { design: 0.90, tech: 0.10 },

  dialogues:       { design: 0.90, tech: 0.10 },
  levelDesign:     { design: 0.65, tech: 0.35 },
  artificialIntel: { design: 0.20, tech: 0.80 },

  worldDesign:     { design: 0.80, tech: 0.20 },
  graphics:        { design: 0.40, tech: 0.60 },
  sound:           { design: 0.50, tech: 0.50 }
}
```

These ratios belong in configuration, not inside React components.

==================================================
2. WORK PRODUCTION
==================

For each assigned employee and discipline:

```ts
effectiveWork =
  allocatedEffort
  * skillFit
  * energyFactor
  * experienceFactor
  * toolFactor
  * workloadFactor
  * teamSynergy
```

Suggested ranges:

```ts
skillFit        = 0.55 + relevantSkill / 220
energyFactor    = 0.65 to 1.05
experienceFactor = 0.85 to 1.15
toolFactor      = 0.90 to 1.20
workloadFactor  = 0.55 to 1.00
teamSynergy     = 0.90 to 1.10
```

Use diminishing returns. A highly skilled employee should be meaningfully better, but one elite employee must not generate unlimited output.

Employees gain discipline XP while producing work, not only when the game releases.

Low experience with a newly researched feature should:

* Increase development time
* Increase bug generation
* Slightly reduce feature effectiveness
* Generate feature mastery through use

==================================================
3. GENRE PRIORITIES
===================

Every genre has a configuration-driven priority vector for the nine disciplines.

Example for Action:

```ts
{
  engine: 0.25,
  gameplay: 0.50,
  storyQuests: 0.25,

  dialogues: 0.10,
  levelDesign: 0.40,
  artificialIntel: 0.50,

  worldDesign: 0.15,
  graphics: 0.50,
  sound: 0.35
}
```

The player should not receive this exact numerical vector automatically.

KnowledgeService gradually reveals qualitative information:

* “Gameplay appears essential.”
* “Story seems less important.”
* “Players expected stronger artificial intelligence.”

Assisted and Analyst modes may provide more precise guidance. Standard mode should still provide understandable feedback without exposing the formula.

==================================================
4. CONCEPT FIT
==============

Avoid one arbitrary hard-coded Topic × Genre table.

Give topics descriptive attributes such as:

```ts
type TopicProfile = {
  actionPotential: number
  narrativePotential: number
  strategicDepth: number
  simulationPotential: number
  explorationPotential: number
  socialPotential: number
  casualAccessibility: number
  maturity: number
}
```

Genres have corresponding demand profiles.

Calculate Topic × Genre compatibility from the similarity between those profiles. Hand-authored overrides may exist for exceptional combinations, but should not define the entire system.

```ts
conceptFit =
  topicGenreFit      * 0.45 +
  genreAudienceFit   * 0.25 +
  genrePlatformFit   * 0.20 +
  platformAudienceFit * 0.10
```

Bad concept fit should create a disadvantage, not make a technically excellent game automatically score 1/10.

Recommended final concept modifier range:

```ts
0.88 to 1.06
```

==================================================
5. CRAFT QUALITY
================

Calculate these independent components from 0 to 1:

* Execution: Did the team produce enough quality work for the selected size and era?
* Focus: Did slider allocation match the genre’s needs?
* Design/Technology Balance: Did the final output suit the genre?
* Feature Coherence: Did selected features support the game concept?
* Innovation: Did the game introduce meaningful improvements?
* Polish: Were bugs removed and features completed?
* Team Execution: Were employees appropriately assigned and managed?

Suggested formula:

```ts
craftQuality =
  execution          * 0.32 +
  focusAlignment     * 0.20 +
  designTechBalance  * 0.10 +
  featureCoherence   * 0.12 +
  innovation         * 0.08 +
  polish             * 0.12 +
  teamExecution      * 0.06
```

Then:

```ts
productQuality =
  100
  * craftQuality
  * conceptFit
```

Clamp to `1–100` before reviewer variation.

Do not compare `productQuality` to the studio’s previous record.

The era and game size determine the amount of work expected, but they do not secretly lower the result because the player previously made a hit.

==================================================
6. FEATURES AND SCOPE
=====================

Every engine or gameplay feature must define:

* Work required
* Relevant development stage
* Design/Technology output
* Bug risk
* Genre affinities
* Platform requirements
* Minimum engine compatibility
* Mastery level
* Development cost

Adding every available feature should not always be optimal.

Over-scoping creates:

* Additional development time
* Higher workload
* More bugs
* Incomplete-feature risk
* Reduced polish if the project is rushed

A well-executed focused game can outperform a bloated game.

==================================================
7. BUGS AND POLISHING
=====================

Track bugs by severity:

* Minor
* Major
* Critical

Recommended weighted bug total:

```ts
weightedBugs =
  minorBugs +
  majorBugs * 3 +
  criticalBugs * 8
```

Bug penalties should be nonlinear. The first few minor bugs cause limited damage, while major and critical bugs become increasingly dangerous.

Polishing must allow the player to:

* Continue fixing bugs
* Improve incomplete features
* Delay release
* Release immediately
* Cancel or cut an incomplete feature when permitted

Reviewers must mention instability when bugs materially affected their score.

==================================================
8. CRITIC REVIEWS
=================

First calculate objective product quality. Then generate four individual reviews from persistent critic profiles.

Each critic has:

* Genre preferences
* Innovation preference
* Technical preference
* Narrative preference
* Tolerance for bugs
* Small deterministic variation

```ts
criticScore =
  productQuality
  + criticAffinity
  + expectationModifier
  + seededVariation
  - weightedBugPenalty
```

Rules:

* Normal random variation should remain small.
* Hype and marketing must not improve critic quality scores.
* Studio reputation can create an expectation modifier capped around ±5 points.
* A previous hit may increase expectations slightly, but never impose an escalating quality requirement.
* A rare 11/10 is allowed only for an exceptional game and a strongly aligned critic.
* Each review includes one evidence-based positive or negative observation.

Examples:

* “Excellent gameplay carried an otherwise conventional release.”
* “The engine struggled with the project’s ambitious feature set.”
* “A strong concept was undermined by major launch bugs.”
* “Players of this genre may find the dialogue underdeveloped.”

Store the complete review calculation and breakdown.

==================================================
9. WEEKLY SALES
===============

Sales must not be calculated as `review score × fixed multiplier`.

First calculate the addressable market:

```ts
addressableMarket =
  platformActiveUsers
  * targetAudienceReach
  * genreDemand
  * regionalAvailability
```

For multi-platform games, account for audience overlap instead of simply adding every platform’s entire user base.

Commercial demand depends on:

* Addressable market
* Awareness
* Critic reception
* Player sentiment
* Price
* Platform momentum
* Platform age
* Genre popularity
* Topic fatigue
* Competition
* Studio reputation
* Franchise strength
* Marketing
* Seasonal demand
* Distribution
* Game age

Marketing affects awareness, not underlying product quality.

A heavily marketed bad game may sell strongly at launch and then collapse through poor word of mouth.

A great game with weak marketing may open slowly and grow through player sentiment.

Suggested weekly structure:

```ts
weeklySales =
  remainingDemand
  * discoveryRate
  * purchaseConversion
  * platformMomentum
  * competitionModifier
  * seasonalModifier
  * visibilityDecay
```

Where:

```ts
purchaseConversion =
  reviewConversion
  * conceptConversion
  * priceFit
  * playerTrust
  * wordOfMouth
```

The sales system should support:

* Front-loaded blockbusters
* Slow-burning hits
* Cult games
* Marketing-driven launch collapses
* Seasonal boosts
* Competition from rival releases
* Long tails
* Platform decline
* Updates reviving interest later

A large installed platform base provides opportunity, but an aging platform should also lose momentum. Online or social features may partially offset late-platform decline when the platform has enough active users.

Store every week:

```ts
type WeeklySalesRecord = {
  week: number
  units: number
  revenue: number
  activePlayers: number
  awareness: number
  playerSentiment: number
  platformMomentum: number
  competitionModifier: number
  seasonalModifier: number
}
```

The sales graph must render this stored history.

==================================================
10. DIFFICULTY AND INFORMATION MODES
====================================

Difficulty should affect:

* Financial pressure
* Competitor strength
* Market volatility
* Staff costs
* Mistake tolerance
* Bankruptcy recovery

Difficulty must not secretly make identical games receive irrationally worse reviews.

Information mode controls what the player can see:

Standard:

* Qualitative feedback
* Discovered compatibility knowledge
* No exact formulas

Assisted:

* Directional slider guidance
* Workload warnings
* Estimated strengths and weaknesses

Analyst:

* Estimated ranges
* Deeper post-release breakdowns
* More precise market projections

Cheats remain separate from difficulty and information mode.

==================================================
11. EXPLANATION PAYLOAD
=======================

Every released game should retain an internal breakdown:

```ts
type QualityBreakdown = {
  execution: number
  focusAlignment: number
  designTechBalance: number
  featureCoherence: number
  innovation: number
  polish: number
  teamExecution: number
  conceptFit: number
  bugPenalty: number
  expectationModifier: number
  finalQuality: number
}
```

The UI only reveals fields permitted by KnowledgeService and the selected information mode.

Game Reports convert hidden calculation details into permanent player knowledge. They do not generate random conclusions disconnected from the actual game.

==================================================
12. REQUIRED TESTS
==================

Verify:

1. Slider values always total 100 within each stage.
2. The game cannot develop a stage before the player confirms it.
3. Changing meaningful slider allocation changes quality predictably.
4. Maximum sliders cannot be selected for every discipline.
5. Selected features affect work, bugs and quality.
6. Employee skill and assignment affect production.
7. Employees gain XP during development.
8. A previous 10/10 does not automatically weaken the next game.
9. Marketing affects awareness and sales but not product quality.
10. A buggy high-quality game receives an understandable penalty.
11. A great low-awareness game can become a slow-burning success.
12. A bad heavily marketed game can open strongly and decline rapidly.
13. Platform installed base and lifecycle both affect sales.
14. Competition and seasonality affect the correct sales weeks.
15. Identical seeds and decisions produce identical results.
16. Save/reload cannot reroll reviews or weekly sales.
17. Every review comment corresponds to a real scoring factor.
18. The sales graph exactly matches stored weekly history.
19. Game Reports reveal facts calculated from that game.
20. No single modifier can independently guarantee a perfect score.

Implement this behind an `algorithmV2` feature flag. Preserve the current scoring pipeline until deterministic comparison tests are available.
NEXT REFINEMENT: DYNAMIC MARKET AND RIVAL STUDIOS V1

Build this behind a `marketV2` feature flag.

The market cannot be a collection of random trend bonuses. It must be persistent simulation state driven by audience demand, platform competition, rival releases and player actions.

A hit game should affect the industry. A crowded release window should matter. Rival studios should develop recognizable identities and strategies. Different campaign seeds should create different industry histories.

Do not implement acquisitions, stock trading, custom hardware or publisher management yet. First build the core competitive market.

==================================================

1. CORE PRINCIPLES
   ==================================================

* The player and rivals participate in the same market.
* Rivals cannot see the player’s hidden sliders, quality score or future decisions.
* Rival games must use the same underlying quality concepts as player games.
* Competitors must obey era, technology, platform and financial restrictions.
* Trends evolve gradually rather than changing randomly every week.
* Competition is strongest between similar games targeting overlapping audiences.
* A successful player game can create or accelerate a trend.
* Too many similar releases can saturate and eventually collapse a trend.
* Platform winners must vary by campaign seed.
* Market randomness must remain deterministic.
* Save/reload cannot reroll rival decisions, platform adoption or trends.
* Difficulty may improve rival planning, but cannot secretly grant rival games fake review scores.
* Market information shown to the player depends on progression and information mode.

==================================================
2. SERVICE ARCHITECTURE
=======================

Create simulation services independent of React:

```ts
MarketSimulationService
AudienceDemandService
TrendService
RivalStudioService
RivalProjectService
PlatformMarketService
ReleaseCalendarService
CompetitionService
IndustryNewsService
```

Responsibilities:

```ts
MarketSimulationService
```

* Executes the ordered weekly market tick.
* Coordinates releases, sales, trends, rivals and platforms.
* Produces one deterministic weekly market result.

```ts
AudienceDemandService
```

* Maintains demand across audience segments.
* Calculates genre, topic, price and platform preferences.
* Provides addressable demand to the sales algorithm.

```ts
TrendService
```

* Tracks gradual genre, topic and feature momentum.
* Tracks market saturation and recovery.
* Processes breakout-game influence and industry shocks.

```ts
RivalStudioService
```

* Owns persistent rival companies.
* Manages strategy, finances, capabilities, reputation and project selection.

```ts
RivalProjectService
```

* Progresses rival games through planning, production, delays and release.
* Produces abstract development results without simulating every employee tick.

```ts
PlatformMarketService
```

* Tracks platform launches, pricing, active users, installed base, momentum and decline.

```ts
ReleaseCalendarService
```

* Tracks announced and released games.
* Calculates release-window crowding.

```ts
CompetitionService
```

* Measures the real audience overlap between games currently competing for attention.

```ts
IndustryNewsService
```

* Converts meaningful simulation changes into news.
* It must report consequences of state changes instead of inventing disconnected flavor text.

ProgressionService remains authoritative for which market tools, technologies and screens are visible to the player.

==================================================
3. AGGREGATE AUDIENCE SEGMENTS
==============================

Do not simulate millions of individual customers.

Use aggregate audience cohorts:

```ts
type AudienceSegment = {
  id: string
  population: number
  disposableIncome: number
  priceSensitivity: number
  noveltyPreference: number
  qualitySensitivity: number
  criticSensitivity: number
  wordOfMouthSensitivity: number
  technologyAdoption: number
  franchiseLoyalty: number
  platformLoyalty: Record<PlatformId, number>
  genrePreferences: Record<GenreId, number>
  topicPreferences: Record<TopicAttributeId, number>
}
```

Initial segment examples:

* Family
* Casual
* Core
* Enthusiast
* Strategy/Simulation
* Narrative
* Social/Online

These are market-demand cohorts, not replacements for selectable target audiences such as Young, Everyone and Mature.

Selectable target audience determines which cohorts the game attempts to reach.

Each cohort should respond differently:

* Enthusiasts adopt new hardware sooner.
* Family audiences are more price-sensitive.
* Core audiences care strongly about reviews and genre execution.
* Casual audiences respond more heavily to awareness and accessibility.
* Narrative audiences respond to story, dialogue and franchise strength.
* Social audiences place greater value on multiplayer and active communities.

==================================================
4. BASE MARKET INTEREST
=======================

For each genre, topic profile, audience and platform combination:

```ts
marketInterest =
  baseAudienceDemand
  * eraAffinity
  * trendModifier
  * seasonModifier
  * supplyGapModifier
  * fatigueModifier
  * platformAudienceFit
```

Suggested modifier limits:

```ts
eraAffinity       = 0.75 to 1.25
trendModifier     = 0.72 to 1.35
seasonModifier    = 0.85 to 1.20
supplyGapModifier = 0.90 to 1.12
fatigueModifier   = 0.72 to 1.05
```

No single trend should double sales by itself.

A strong game in an unpopular genre can still succeed. A weak game in a trending genre may receive initial attention but should not automatically become a hit.

==================================================
5. DYNAMIC TRENDS
=================

Trends must be continuous values, not binary `popular/unpopular` flags.

```ts
type MarketTrend = {
  subjectId: GenreId | TopicAttributeId | FeatureId
  momentum: number
  publicAwareness: number
  saturation: number
  startedWeek: number
  lastMeaningfulChangeWeek: number
  causes: TrendCause[]
}
```

Weekly trend movement:

```ts
nextMomentum =
  currentMomentum
  + breakoutInfluence
  + culturalEventInfluence
  + underservedDemandInfluence
  - saturationPressure
  - meanReversion
  + seededMinorVariation
```

Rules:

* Minor random variation stays small.
* Momentum changes gradually.
* Most trends last several months.
* Major trends may last several years.
* Trends eventually return toward baseline.
* High-quality hits influence trends more than low-quality games.
* High sales caused only by marketing should have limited genre influence.
* Several similar successes can create a boom.
* Excessive imitation increases saturation.
* Several disappointing releases can accelerate a trend’s decline.
* A groundbreaking player game can create a new market direction.

The player should be able to become a trendsetter, not merely react to trends selected by the simulation.

==================================================
6. TOPIC AND GENRE FATIGUE
==========================

Track fatigue from recent games with overlapping concepts:

```ts
fatigueLoad =
  sum(
    releaseAwareness
    * conceptSimilarity
    * audienceOverlap
    * exponentialTimeDecay
  )
```

Concept similarity should consider:

* Genre
* Secondary genre
* Topic attributes
* Target audience
* Major features
* Platform
* Franchise similarity

Fatigue must recover over time.

Do not make every repeated genre release automatically bad. Distinguish:

* Healthy demand
* Crowded market
* Temporary saturation
* Long-term fatigue

A genuinely innovative or exceptional game may partially bypass fatigue.

A mediocre imitation released into a saturated market should be heavily exposed to it.

==================================================
7. COMPETING RELEASES
=====================

Competition must be calculated from actual overlap rather than the total number of games released that week.

```ts
releaseOverlap =
  genreSimilarity       * 0.30 +
  audienceOverlap       * 0.25 +
  platformOverlap       * 0.20 +
  conceptSimilarity     * 0.15 +
  priceCategoryOverlap  * 0.10
```

Give the strongest competitive pressure to games released within approximately four weeks of one another.

Competition gradually weakens as the release gap increases.

When several games compete for the same audience:

```ts
commercialAppeal =
  awareness
  * purchaseConversion
  * audienceFit
  * platformAvailability
  * releaseVisibility
```

Then divide the available attention using an attraction-share model:

```ts
attentionShare =
  commercialAppeal
  / (outsideOption + sum(allCompetingAppeal))
```

This must feed the `competitionModifier` used by weekly sales.

Important behavior:

* Two unrelated games should have limited direct competition.
* Two similar games on the same platform should compete strongly.
* A major blockbuster may reduce the visibility of smaller overlapping games.
* Smaller games may avoid some pressure through strong niches.
* A delayed release may escape a crowded window.
* Multiple strong games can expand overall genre interest while still competing for launch-week attention.

==================================================
8. PERSISTENT RIVAL STUDIOS
===========================

Generate approximately 8–15 persistent competitors depending on campaign length and industry era.

Each company requires:

```ts
type RivalStudio = {
  id: string
  name: string
  foundedWeek: number
  status: "active" | "struggling" | "bankrupt" | "acquired"
  cash: number
  reputation: number
  fanBase: number
  riskTolerance: number
  trendResponsiveness: number
  innovationPreference: number
  qualityPreference: number
  franchisePreference: number
  platformLoyalties: Record<PlatformId, number>
  disciplineCapabilities: Record<DisciplineId, number>
  knownTechnologies: TechnologyId[]
  ownedTechnologies: TechnologyId[]
  franchises: RivalFranchise[]
  strategyProfile: RivalStrategyProfile
  activeProjects: RivalProject[]
  releaseHistory: GameId[]
}
```

Possible strategic identities:

* Small creative boutique
* Technology specialist
* Narrative studio
* Mass-market publisher
* Trend chaser
* Experimental innovator
* Franchise factory
* Platform loyalist
* Budget developer
* Prestige studio

These identities influence behavior but do not permanently lock a company into one genre.

A narrative studio may attempt action games. It simply begins with different strengths, risks and preferences.

Studios should evolve:

* Successful releases improve reputation and finances.
* Repeated failures create financial pressure.
* Teams gain genre and technology experience.
* Studios build franchises.
* Studios may change strategy after poor results.
* Studios can grow, shrink or close.
* New companies can enter the market.
* Later systems may allow acquisition, subsidiaries and publishing relationships.

==================================================
9. RIVAL PROJECT SELECTION
==========================

Rivals should evaluate several candidate game concepts before selecting one.

```ts
projectUtility =
  demandOpportunity       * strategyWeight.demand +
  capabilityFit           * strategyWeight.capability +
  studioIdentityFit       * strategyWeight.identity +
  franchiseValue          * strategyWeight.franchise +
  platformOpportunity     * strategyWeight.platform +
  releaseWindowOpportunity * strategyWeight.schedule +
  portfolioDiversity      * strategyWeight.diversity +
  financialSafety         * strategyWeight.safety
  - developmentRisk
  - saturationRisk
  - technologyRisk
```

Each rival has different weights.

A trend chaser values current demand heavily. An innovator values novelty and underserved demand. A franchise studio values existing IP strength.

Rivals must make decisions using imperfect forecasts.

They may:

* Misread a trend
* Underestimate competition
* Over-scope a game
* Release too early
* Delay a troubled game
* Cancel a failing project
* Produce an unexpected masterpiece
* Produce a commercial failure despite competent work

They cannot:

* Read the player’s unannounced project
* Instantly counter the player’s selected concept
* Use technologies that are not era-eligible
* Ignore their finances
* Finish projects instantly
* Receive arbitrary quality bonuses because they are NPCs

==================================================
10. RIVAL DEVELOPMENT
=====================

Rival projects should have real production states:

```ts
PLANNING
PREPRODUCTION
STAGE_1
STAGE_2
STAGE_3
POLISHING
ANNOUNCED
RELEASED
ON_SALE
OFF_MARKET
CANCELLED
```

Store planned and actual release dates.

Rivals do not need individual employee-level simulation. Use an abstract production calculation based on:

* Studio discipline capabilities
* Project focus choices
* Experience
* Technology familiarity
* Scope
* Budget
* Development duration
* Workload
* Innovation
* Team coherence
* Bugs
* Polishing time

At release, convert this production history into the same core `QualityBreakdown` structure used for the player.

Do not give competitors a separate fake review generator.

Rival games should be able to earn poor, average, excellent and exceptional reviews through the same quality logic.

==================================================
11. RIVAL LEARNING
==================

Competitors should update beliefs after releases:

```ts
newBelief =
  oldBelief * retentionRate
  + observedOutcome * learningRate
```

Learning must be gradual.

Rivals may learn:

* Which genres match their capabilities
* Which audiences buy their games
* Which platforms perform well for them
* Which features repeatedly cause scope problems
* Whether a franchise is gaining or losing strength
* Whether a trend is becoming saturated

Trend chasers should react faster but risk entering too late.

Conservative studios should react slower but make fewer extreme mistakes.

Rivals cannot learn the player’s exact formula or slider values.

==================================================
12. PLATFORM MARKET SIMULATION
==============================

Each platform requires:

```ts
type PlatformMarketState = {
  id: string
  manufacturerId: string
  announcedWeek: number
  launchWeek: number
  expectedEndWeek: number
  actualEndWeek?: number
  hardwareQuality: number
  price: number
  licensingCost: number
  royaltyRate: number
  developmentDifficulty: number
  audienceProfile: Record<AudienceSegmentId, number>
  installedBase: number
  activeUsers: number
  brandStrength: number
  momentum: number
  catalogStrength: number
  exclusiveStrength: number
  thirdPartySupport: number
  technologyCapabilities: TechnologyId[]
  lifecycleState:
    | "rumored"
    | "announced"
    | "launch"
    | "growth"
    | "mature"
    | "decline"
    | "discontinued"
}
```

Installed base and active users must remain separate.

A discontinued platform may retain a large historical installed base while its active audience steadily declines.

Platform perceived value:

```ts
perceivedPlatformValue =
  hardwareQuality      * 0.18 +
  priceFit             * 0.12 +
  catalogStrength      * 0.22 +
  exclusiveStrength    * 0.16 +
  brandStrength        * 0.12 +
  expectedSupport      * 0.10 +
  audienceFit          * 0.10
```

Weekly platform movement:

```ts
newUsers =
  remainingAddressableAudience
  * adoptionRate
  * perceivedPlatformValue
  * seasonalModifier
  * availabilityModifier

activeUsers =
  previousActiveUsers
  + newUsers
  - churnedUsers
```

Catalog strength and installed base should reinforce one another through diminishing network effects.

Do not let a small early advantage guarantee permanent dominance.

Possible campaign outcomes:

* The expected market leader dominates.
* Two major platforms remain competitive.
* A technically weaker platform wins through price and games.
* A strong launch collapses from weak software support.
* A smaller platform survives through exclusives.
* An unexpected platform becomes the generation leader.

==================================================
13. GAMES MUST AFFECT PLATFORM SUCCESS
======================================

Successful games must influence their platforms.

Effects depend on:

* Game quality
* Sales
* Exclusivity
* Franchise strength
* Platform audience fit
* Platform lifecycle stage
* Marketing
* Whether the game attracts new audience segments

A major exclusive should have more platform influence than a multiplatform release.

Do not directly convert game sales into identical console sales.

Use:

```ts
platformLift =
  gameCulturalImpact
  * exclusivityFactor
  * hardwareConversionPotential
  * underservedAudienceReach
  * lifecycleOpportunity
```

A “system seller” should be rare and emerge from exceptional circumstances.

==================================================
14. PLATFORM AND TECHNOLOGY PROGRESSION
=======================================

Platforms and technologies must respect the ProgressionService.

For a normal campaign:

* Future platforms remain hidden until rumor or announcement states.
* Development licensing becomes available only when appropriate.
* New hardware capabilities create future technology opportunities.
* A new platform does not automatically grant the player every related technology.
* Technologies must still be discovered, researched, owned and installed in a compatible engine.
* Rivals obey equivalent era restrictions.
* Older platforms gradually lose active users.
* Platforms may remain commercially viable late in life if their installed base and audience remain strong.

Campaign seed may affect platform performance, but it should not move advanced hardware into an impossible era.

==================================================
15. RELEASE CALENDAR
====================

Create a dedicated release calendar containing:

* Player games
* Announced rival games
* Known platform launches
* Major industry events
* Expected release windows
* Delays
* Recently released games

Do not expose secret rival projects.

Rival projects become visible based on:

* Announcement strategy
* Studio reputation
* Marketing campaign
* Development progress
* Leaks or industry events

Release dates may be:

* Exact
* Estimated month
* Broad quarter
* Unknown

The calendar should visually communicate market crowding.

Analyst mode may estimate audience overlap. Standard mode should use qualitative wording such as:

* “Quiet release window”
* “Moderate competition”
* “Crowded action market”
* “Major competing release expected”

==================================================
16. ANNOUNCEMENTS AND HYPE
==========================

Announcements affect awareness but also create expectations.

Early announcements:

* Provide more time to accumulate awareness.
* Risk hype decay.
* Give rivals time to react.
* Create disappointment when final quality misses expectations.
* Increase damage from delays.

Late announcements:

* Offer less awareness-building time.
* Reduce expectation risk.
* Give rivals less time to react.

Rivals choose announcement timing according to strategy and confidence.

This system can later connect to a player marketing campaign. For V1, rivals and industry news should still use the underlying announcement data.

==================================================
17. INDUSTRY NEWS
=================

News must be generated from meaningful simulation changes.

Examples:

* A rival announces a new game.
* A major release is delayed.
* A platform passes an active-user milestone.
* A platform loses third-party support.
* A breakout game increases interest in a genre.
* Too many similar releases create saturation.
* A rival studio enters financial trouble.
* A platform announces discontinuation.
* A new technology begins appearing in commercial games.
* The player’s game becomes a trendsetter.
* A competitor establishes a major franchise.

Each news item requires:

```ts
type IndustryNewsItem = {
  id: string
  week: number
  category: string
  causeEntityIds: string[]
  publicEffects: MarketEffect[]
  hiddenEffects?: MarketEffect[]
  expiresWeek?: number
}
```

News should not secretly apply unrelated bonuses.

If a headline says strategy games are gaining momentum, the recorded trend state must show that movement and its actual cause.

Reuse the event cooldown and duplicate-protection system already requested.

==================================================
18. WEEKLY SIMULATION ORDER
===========================

Use a fixed update order:

```ts
1. Advance industry calendar
2. Process platform launches, adoption and churn
3. Progress player and rival development
4. Resolve announcements, delays and releases
5. Build the active competition sets
6. Calculate weekly sales for every on-sale game
7. Update player sentiment and word of mouth
8. Update genre/topic trends and fatigue
9. Update studio finances and reputation
10. Generate consequence-based industry news
11. Make scheduled rival planning decisions
12. Persist the complete weekly market snapshot
```

All games on sale during the same week must use the same market snapshot.

Do not calculate the player first and then allow rivals to use a different version of the market.

==================================================
19. PLAYER-FACING MARKET SCREENS
================================

Use focused screens and tabs, not dashboard cards.

Market screen tabs:

* Overview
* Platforms
* Release Calendar
* Trends
* Competitors

Progressive disclosure:

* Platforms are available wherever platform selection becomes necessary.
* The full Market screen unlocks later.
* Release Calendar unlocks after market research or a comparable progression milestone.
* Trends unlock after reports or market-analysis research.
* Competitor intelligence unlocks separately.
* Hidden systems do not appear as disabled tabs.

Overview should show only:

* Current major industry movement
* One or two important trends
* Upcoming known releases
* Platform momentum
* Relevant warning for the player’s current project

Platforms should show:

* Fictional hardware silhouettes
* Lifecycle
* Active users
* Audience fit
* Licensing cost
* Market momentum
* Known technical capabilities

Release Calendar should be the primary visualization, not a table of dozens of numbers.

Competitors should use studio logos, recent releases, specialties and visible reputation. Do not expose their internal AI attributes.

==================================================
20. INFORMATION MODES
=====================

Standard:

* Qualitative trend direction
* Public platform statistics
* Announced rival projects
* Basic release-window warnings
* No exact market formula

Assisted:

* Estimated audience fit
* Stronger saturation warnings
* Approximate competition level
* Platform lifecycle guidance

Analyst:

* Estimated demand ranges
* Market-overlap percentages
* Trend history
* Audience-segment estimates
* Rival performance breakdowns from publicly available information

Cheats/debug:

* Inspect true trend values
* Reveal all rival projects
* Force platform momentum
* Trigger or clear saturation
* Display deterministic calculation breakdowns

Debug information must not appear in normal Analyst mode.

==================================================
21. DIFFICULTY
==============

Difficulty may affect:

* Rival forecast accuracy
* Rival financial reserves
* Rival willingness to delay weak games
* Speed of rival learning
* Market volatility
* Player access to recovery mechanisms

Difficulty cannot:

* Give rivals impossible technologies
* Allow rivals to ignore development time
* Raise rival review scores after calculation
* Reduce player reviews without cause
* Make competitors automatically counter every player project
* Give rivals access to hidden player decisions

==================================================
22. DETERMINISM AND SAVES
=========================

Use separate seeded random streams:

```ts
platformRng
rivalStrategyRng
rivalProductionRng
trendRng
marketShockRng
reviewRng
eventRng
```

Use keyed deterministic values where possible:

```ts
seededValue(campaignSeed, entityId, week, decisionType)
```

Do not rely on array iteration order for random results.

Store:

* Rival decisions
* Project histories
* Platform histories
* Trend causes
* Weekly market snapshots
* Released-game competition sets
* News history
* RNG stream positions when necessary

Changing UI render order must never change the simulation.

==================================================
23. PERFORMANCE
===============

Do not fully simulate every rival employee or individual consumer.

Use:

* Aggregate audience cohorts
* Abstract rival production
* Weekly market ticks
* Monthly rival strategy planning
* Cached similarity calculations
* Stored competition sets
* Historical data compression for very old weeks

Keep exact weekly history for games currently on sale.

Older market history may be summarized monthly after the relevant games leave the market.

==================================================
24. FIRST IMPLEMENTATION SLICE
==============================

Do not attempt every system in this document simultaneously.

Implement this vertical slice first:

1. Six persistent rival studios
2. Four or fewer era-appropriate active platforms
3. Rival project planning and release dates
4. Genre momentum
5. Topic/genre fatigue
6. Release-window competition
7. Rival review scores using the shared quality model
8. Rival weekly sales
9. Player sales affected by real rival competition
10. Release Calendar screen
11. Basic Platforms screen
12. Consequence-based industry news
13. Full deterministic save/load support

Exclude for now:

* Acquisitions
* Subsidiaries
* Stock market
* Player-owned hardware
* Publisher negotiations
* Awards
* Patents
* DLC strategy
* MMOs
* Subscriptions

==================================================
25. ACCEPTANCE TESTS
====================

Verify:

1. Identical seeds produce identical rival studios and market histories.
2. Different seeds produce meaningfully different platform and competitor outcomes.
3. Save/reload does not change rival decisions.
4. Rivals cannot use future technology.
5. Rivals cannot inspect unannounced player projects.
6. Competitors require time and money to develop games.
7. Rival quality uses the shared scoring concepts.
8. Rival review scores are not arbitrarily boosted.
9. Similar simultaneous releases compete more strongly than unrelated games.
10. Delaying a game can reduce release-window competition.
11. Trends change gradually.
12. A successful player game can increase a genre trend.
13. Excessive similar releases create saturation.
14. Fatigue recovers after the market receives fewer similar games.
15. A strong non-trending game can succeed.
16. A poor trending game can fail after its initial awareness advantage.
17. Platform installed base and active users remain separate.
18. Discontinued platforms gradually lose active users.
19. Strong games can improve platform momentum.
20. A platform with an early lead is not guaranteed permanent victory.
21. Rivals can grow, struggle and close.
22. Rival studios develop recognizable strategies without becoming predictable clones.
23. Industry news corresponds to real simulation state.
24. Unannounced rival projects do not appear on the calendar.
25. The player and rivals use the same weekly market snapshot.
26. Competition values stored in weekly sales match the sales graph.
27. Difficulty improves rival decisions without changing objective scoring.
28. Normal campaigns hide future platforms and technologies.
29. Existing saves migrate without losing player games, sales or research.
30. No market result changes because a React component rerendered.

Do not replace `algorithmV2`. This market system supplies external demand, platform, trend and competition inputs to it.

The division must remain:

```ts
QualityEngine
→ Determines how good the finished product is

ReviewService
→ Determines how critics interpret that product

MarketSimulationService
→ Determines the competitive environment

SalesService
→ Determines how the product performs commercially
```

A good game, a well-reviewed game and a commercially successful game are related, but they are not the same calculation.
The research supports this direction:

Agent-based modeling works best when persistent agents follow bounded rules and broader market behavior emerges from their interaction. It also emphasizes validation and reproducibility, which is why the rivals use stored decisions and separate seeded streams. Agent-based modeling guidelines
Platform competition depends on hardware quality, installed base, consumer expectations and the feedback loop between users and available software. Harvard platform-competition study
Video-game publishers demonstrably avoid crowded release windows, and direct niche competition can make even a one-week delay commercially valuable. Strategic Timing of Entry
Major games can increase hardware adoption, supporting the rare “system seller” behavior without making every exclusive automatically boost its platform. Superstar software and hardware sales
A large installed base can sustain software demand later in a platform’s lifecycle, especially with online functionality, which supports separating active users, lifecycle momentum and historical installed base. Platform lifecycle study
Existing tycoon games also demonstrate the replay value of randomly populated simulated markets, variable platform success, exclusives, NPC developers and declining platform-user counts. Software Inc., Mad Games Tycoon 2 update history

The next piece after this should be the engine, feature, and technology mastery system, because that connects research progression to actual development choices instead of technology being another unlock checklist.
NEXT REFINEMENT: ENGINE, FEATURE, TECHNOLOGY AND MASTERY FOUNDATION V1

Build this behind a single `developmentFoundationV2` feature flag.

Do not treat technologies as collectible bonuses or a linear list of progressively larger numbers. A technology must move through discovery, research, production integration and mastery before it delivers its full benefit.

This system must create several legitimate studio strategies:

* Adopt experimental technology and accept higher risk.
* Use proven technology for reliable development.
* Specialize an engine around particular genres or platforms.
* Maintain an older engine with high team mastery.
* Rebuild an engine for future flexibility.
* License or adopt external technology later.
* Intentionally accept technical debt to meet a deadline.
* Invest in tools, documentation and architecture for long-term efficiency.

The newest technology must not automatically be the best choice for every project.

Do not replace `algorithmV2` or `marketV2`. This system supplies production, feature, innovation, compatibility and mastery inputs to them.

```ts
ProgressionService
→ Controls visibility and system access

TechnologyDiscoveryService
→ Controls what the studio knows exists

ResearchService
→ Converts knowledge into researched technology

EngineArchitectureService
→ Creates engines from compatible modules

EngineIntegrationService
→ Installs researched technology into engine versions

MasteryService
→ Tracks employee, team and studio experience

TechnicalDebtService
→ Tracks shortcuts, coupling and maintenance pressure

FeaturePlanningService
→ Connects engine capabilities to game features

QualityEngine
→ Evaluates the resulting game

MarketSimulationService
→ Evaluates the external market

SalesService
→ Calculates commercial performance
```

ProgressionService remains the only authority for whether Research, Custom Engines or later technology systems are visible.

The existing campaign already has Research unlocked. Preserve that state.

==================================================

1. FOUR SEPARATE TECHNOLOGY QUESTIONS
   ==================================================

For every technology, the game must answer four independent questions:

1. Does the studio know the technology exists?
2. Has the studio researched it?
3. Has it been integrated into a compatible engine?
4. Does the team know how to use it effectively?

These cannot be collapsed into one boolean.

Example:

```ts
type StudioTechnologyState = {
  technologyId: TechnologyId

  visibility:
    | "hidden"
    | "rumored"
    | "discovered"
    | "researchable"

  researchMaturity:
    | "unresearched"
    | "feasibility"
    | "prototyped"
    | "productionReady"
    | "stabilized"

  researchProgress: number
  firstDiscoveredWeek?: number
  firstResearchedWeek?: number

  installedEngineVersionIds: EngineVersionId[]
  studioMastery: number
  productionUses: number
  successfulUses: number

  discoverySources: DiscoverySource[]
  researchHistory: ResearchHistoryEntry[]
}
```

Researching a technology must never silently add it to an existing engine.

Integrating it into an engine must never instantly give every employee mastery.

Using it in one game must never automatically perfect it.

==================================================
2. TECHNOLOGY DEFINITIONS
=========================

Technologies are configuration-driven capability definitions.

```ts
type TechnologyDefinition = {
  id: TechnologyId
  familyId: TechnologyFamilyId
  versionOrder: number

  name: string
  description: string

  category:
    | "graphics"
    | "audio"
    | "artificialIntelligence"
    | "physics"
    | "gameplaySystems"
    | "tools"
    | "contentPipeline"
    | "networking"
    | "platformSupport"
    | "storage"
    | "input"
    | "production"

  prerequisites: TechnologyRequirement[]
  industryRequirements: IndustryRequirement[]
  platformRequirements: PlatformRequirement[]
  accomplishmentRequirements: AccomplishmentRequirement[]

  capabilitiesGranted: CapabilityId[]
  capabilityImprovements: CapabilityModifier[]

  researchWork: number
  prototypeWork: number
  integrationWork: number
  stabilizationWork: number

  baseCost: number
  integrationRisk: number
  bugRisk: number
  performanceCost: PerformanceCost
  portability: number
  maintainability: number

  emergenceWindow: {
    earliestWeek: number
    expectedWeek: number
    latestWeek: number
  }

  tags: string[]
}
```

A technology should grant a specific capability or improve an existing one.

Bad definition:

```ts
Graphics V4
+40 technology points
```

Better definition:

```ts
{
  name: "Hardware Transform Pipeline",
  capabilitiesGranted: [
    "larger_3d_scenes",
    "dynamic_camera_systems"
  ],
  capabilityImprovements: [
    {
      capabilityId: "real_time_3d_rendering",
      throughput: 0.22
    }
  ],
  platformRequirements: [
    {
      capabilityId: "accelerated_3d_support",
      minimum: 0.65
    }
  ],
  integrationRisk: 0.35,
  performanceCost: {
    cpu: 12,
    gpu: 28,
    memory: 16,
    storage: 8
  }
}
```

Technology versions must not be a universal ladder where every new version replaces everything before it.

Some technologies should:

* Replace older approaches.
* Extend an existing approach.
* Compete with an alternative approach.
* Specialize in performance.
* Specialize in fidelity.
* Specialize in portability.
* Require a different engine architecture.

==================================================
3. TECHNOLOGY FAMILIES AND VISIBILITY
=====================================

Technology progression should use a directed graph, not one enormous visible tree.

```ts
type TechnologyFamily = {
  id: TechnologyFamilyId
  category: TechnologyCategory
  technologies: TechnologyId[]
  competingFamilyIds?: TechnologyFamilyId[]
}
```

Only reveal:

* Technologies the studio owns.
* Currently researchable technologies.
* The next relevant version in a known family.
* Rumored future technology when industry conditions justify it.

Do not display five future versions as locked cards.

If the player owns version 2:

* Version 3 may appear when it becomes relevant.
* Versions 4 through 8 remain completely hidden.
* A competing branch may appear after discovery.
* An obsolete branch may remain available if it has a legitimate niche.

Visibility must come from TechnologyDiscoveryService through ProgressionService.

React components may not determine visibility from the year.

==================================================
4. INDUSTRY EMERGENCE
=====================

Technologies should emerge within plausible windows, but exact timing may vary by campaign seed.

```ts
emergenceWeek =
  expectedWeek
  + seededEraVariation
  + platformAcceleration
  + industryInvestment
  + breakthroughInfluence
```

Limit variation so impossible chronology cannot occur.

Technology emergence may be influenced by:

* New platform capabilities.
* Rival research.
* Successful games demonstrating demand.
* Broader industry investment.
* Player accomplishments.
* Related technology maturity.
* Deterministic industry events.

Emergence does not automatically make the technology researchable.

Suggested public lifecycle:

```ts
HIDDEN
→ RUMORED
→ DEMONSTRATED
→ RESEARCHABLE
→ INDUSTRY_STANDARD
→ MATURE
→ LEGACY
```

These are industry states, not player ownership states.

News may say:

* “Researchers demonstrate early real-time 3D techniques.”
* “New hardware is expected to support larger game worlds.”
* “Several studios are experimenting with online score tracking.”
* “Digital audio tools are entering commercial production.”

News must be generated from actual technology state changes.

==================================================
5. PLAYER ELIGIBILITY
=====================

A date alone cannot unlock major technology.

Use hard prerequisites and an eligibility score.

```ts
technologyEligibility =
  industryReadiness      * 0.30 +
  platformReadiness      * 0.20 +
  prerequisiteCompletion * 0.20 +
  studioCapability       * 0.15 +
  relevantMastery        * 0.10 +
  accomplishmentProgress * 0.05
```

Hard requirements may include:

* Required predecessor technology.
* Required platform capability.
* Research system unlocked.
* Required laboratory or staff capability.
* Required engine architecture.
* At least one completed game using the previous technology.
* A minimum amount of relevant production experience.

The accomplishment requirement should not always demand a successful game.

Failed experiments and flawed releases still generate knowledge.

However, repeatedly clicking Research without applying the technology must not reveal the complete chain.

==================================================
6. RESEARCH PROJECTS
====================

Research must be an actual project with staffing, cost, time and uncertainty.

```ts
type ResearchProject = {
  id: ResearchProjectId
  technologyId: TechnologyId

  goal:
    | "feasibility"
    | "prototype"
    | "productionize"
    | "stabilize"

  status:
    | "planned"
    | "active"
    | "paused"
    | "blocked"
    | "completed"
    | "cancelled"

  assignedStaffIds: EmployeeId[]
  workRequired: number
  completedWork: number
  accumulatedCost: number

  confidence: number
  unresolvedProblems: ResearchProblem[]
  findings: ResearchFinding[]

  startedWeek: number
  estimatedCompletionRange: WeekRange
  completedWeek?: number
}
```

Research progress:

```ts
researchWork =
  assignedResearchEffort
  * relevantSkill
  * equipmentFactor
  * prerequisiteKnowledge
  * teamCoordination
  * researchLeadership
  * fatigueFactor
  * diminishingReturns
```

Research uncertainty should affect forecasts and problems encountered, not randomly delete progress.

An unsuccessful prototype should still produce:

* Partial knowledge.
* Better future estimates.
* Reduced uncertainty.
* Possible discovery of an incompatibility.
* Some employee and studio mastery.

Cancelling or pausing research preserves completed knowledge.

==================================================
7. RESEARCH MATURITY
====================

Use maturity stages so “researched” does not automatically mean “safe.”

Feasibility:

* Confirms the concept is possible.
* Reveals major requirements.
* Provides better estimates.
* Cannot be installed in a commercial engine.

Prototype:

* Produces a working experimental implementation.
* Can be tested internally.
* Has high integration and bug risk.
* May support an experimental game project on harder difficulties.

Production Ready:

* Can be installed in a compatible engine.
* Has defined dependencies.
* Has acceptable reliability.
* Still begins with low mastery.

Stabilized:

* Reduces bug and integration risk.
* Improves documentation.
* Improves employee onboarding.
* Requires additional research or repeated production use.

The player may choose to adopt a prototype early, but the danger must be explicit.

==================================================
8. ENGINE ARCHITECTURE
======================

An engine must be a persistent technical asset, not a named bucket of researched checkboxes.

```ts
type GameEngine = {
  id: EngineId
  name: string
  createdWeek: number

  identity: EngineIdentity
  designGoals: EngineDesignGoal[]
  currentVersionId: EngineVersionId
  versionHistory: EngineVersionId[]

  studioKnowledge: number
  documentationQuality: number
  toolingQuality: number
  architectureQuality: number

  status:
    | "active"
    | "maintenance"
    | "legacy"
    | "retired"
}
```

Each engine version is immutable once used by a released game.

```ts
type EngineVersion = {
  id: EngineVersionId
  engineId: EngineId

  version: {
    major: number
    minor: number
    patch: number
  }

  parentVersionId?: EngineVersionId
  branchName?: string

  moduleIds: EngineModuleInstanceId[]
  capabilitySnapshot: CapabilitySnapshot
  compatibilitySnapshot: CompatibilitySnapshot

  stability: number
  maintainability: number
  extensibility: number
  portability: number
  performanceEfficiency: number

  technicalDebt: TechnicalDebtState
  knownIssues: EngineIssue[]

  releasedWeek: number
  lockedByProjectIds: ProjectId[]
}
```

A released game always records its exact engine version.

Changing the current engine later cannot alter the quality, bugs or compatibility of an already released game.

==================================================
9. ENGINE MODULES
=================

Possible modules include:

* Runtime Core
* Graphics
* Audio
* Physics
* Artificial Intelligence
* Gameplay/Scripting
* Input
* Content and Asset Pipeline
* Development Tools
* Platform Abstraction
* Networking
* Storage and Streaming
* User Interface
* Build and Testing Tools

Do not show modules before they become era appropriate.

```ts
type EngineModuleInstance = {
  id: EngineModuleInstanceId
  moduleType: EngineModuleType
  engineVersionId: EngineVersionId

  installedTechnologyIds: TechnologyId[]
  capabilities: CapabilityId[]

  quality: number
  stability: number
  maintainability: number
  integrationQuality: number

  cpuCost: number
  gpuCost: number
  memoryCost: number
  storageCost: number
  networkCost: number

  coupling: Record<EngineModuleInstanceId, number>
  supportedPlatformIds: PlatformId[]
  mastery: number
  technicalDebt: number
}
```

Module coupling matters.

Highly coupled engines may:

* Be faster to build initially.
* Be harder to upgrade.
* Generate more regressions.
* Require more work when replacing a core module.
* Accumulate technical debt faster.

Modular engines may:

* Require more initial design effort.
* Support cleaner upgrades.
* Improve portability.
* Allow modules to be replaced more safely.
* Require stronger tools and architecture skills.

Neither architecture should always be superior.

==================================================
10. ENGINE DESIGN GOALS
=======================

When creating an engine, the player chooses priorities.

Possible goals:

* Fast Development
* Visual Fidelity
* Simulation Depth
* Large Worlds
* Online Scale
* Low Hardware Requirements
* Cross-Platform Portability
* Rapid Content Production
* Modularity
* Long-Term Maintainability
* Experimental Technology
* Accessibility and Broad Hardware Support

Do not implement these as free bonus cards.

The player divides an architecture budget:

```ts
type EngineDesignAllocation = {
  performance: number
  fidelity: number
  portability: number
  extensibility: number
  tooling: number
  maintainability: number
}
```

Values must total 100.

Architecture choices should affect:

* Initial development work.
* Technology compatibility.
* Future upgrade cost.
* Performance headroom.
* Feature implementation speed.
* Technical debt growth.
* Platform porting.
* Team onboarding.
* Bug regression risk.

No engine should maximize every category.

==================================================
11. ENGINE VERSIONING
=====================

Support three upgrade scopes.

Patch version:

* Fixes bugs.
* Improves stability.
* Reduces limited technical debt.
* Adds no major capability.
* Has low migration cost.

Minor version:

* Adds compatible technologies or tools.
* Improves existing modules.
* Requires validation.
* Has moderate migration cost.

Major version:

* Replaces major modules or architecture.
* Supports significant new capabilities.
* May drop old platforms.
* Requires substantial migration and retraining.
* Can reduce deep technical debt.
* Has high initial instability.

```ts
upgradeRisk =
  changeSurface
  * moduleCoupling
  * technologyNovelty
  * platformCount
  * projectMigrationPressure
  * inverseTeamMastery
  * inverseTestCoverage
```

Upgrading an engine during an active game project must be an explicit decision.

Offer:

* Remain on current version.
* Migrate now.
* Finish the game and upgrade afterward.
* Branch the engine.
* Cancel the engine upgrade.

Never silently migrate an active project.

==================================================
12. PROJECT-SPECIFIC PLATFORM BUILDS
====================================

A multiplatform game should not be one identical build copied to every system.

```ts
type ProjectPlatformBuild = {
  projectId: ProjectId
  platformId: PlatformId
  engineVersionId: EngineVersionId

  enabledCapabilityIds: CapabilityId[]
  reducedCapabilityIds: CapabilityId[]
  unsupportedCapabilityIds: CapabilityId[]

  cpuLoad: number
  gpuLoad: number
  memoryLoad: number
  storageLoad: number
  networkLoad: number

  optimizationWork: number
  portingWork: number
  platformBugs: BugState
  certificationRisk: number

  performanceHeadroom: number
  finalPerformanceQuality: number
}
```

A platform may require:

* Reduced visual complexity.
* Lower simulation density.
* Smaller maps.
* Different control support.
* Different storage behavior.
* Additional optimization.
* A separate networking implementation.
* Feature removal.

The player chooses whether to:

* Design around the weakest platform.
* Create platform-specific profiles.
* Remove a platform.
* Delay one platform’s release.
* Accept lower performance.
* Assign more optimization work.

Multi-platform must increase opportunity and workload.

==================================================
13. PERFORMANCE BUDGETS
=======================

Every platform provides abstract production budgets:

```ts
type PlatformPerformanceBudget = {
  cpu: number
  gpu: number
  memory: number
  storage: number
  network: number
  inputComplexity: number
}
```

Every engine capability and game feature consumes some budget.

```ts
performancePressure =
  usedBudget
  / effectiveAvailableBudget
```

Recommended behavior:

```ts
pressure < 0.80
→ Healthy headroom

0.80 to 1.00
→ Optimization recommended

1.00 to 1.15
→ Performance problems likely

above 1.15
→ Severe cuts, delays or instability required
```

Employee skill, engine efficiency and optimization work may improve effective capacity.

They cannot make platform limits irrelevant.

Standard mode should describe this qualitatively:

* “Comfortable performance headroom”
* “Optimization may be required”
* “This platform is limiting several features”
* “Severe performance risk”

Analyst and debug modes may show estimates or exact values.

==================================================
14. TECHNOLOGY INTEGRATION
==========================

Research completion creates an integration option.

It does not alter an engine automatically.

```ts
type EngineIntegrationProject = {
  id: EngineIntegrationProjectId
  engineId: EngineId
  sourceVersionId: EngineVersionId
  targetVersionId: EngineVersionId

  technologyIds: TechnologyId[]
  affectedModuleIds: EngineModuleInstanceId[]

  assignedStaffIds: EmployeeId[]
  estimatedWorkRange: NumericRange
  completedWork: number

  incompatibilities: IntegrationConflict[]
  regressionRisks: RegressionRisk[]
  newTechnicalDebt: number

  status:
    | "planned"
    | "active"
    | "testing"
    | "completed"
    | "cancelled"
}
```

Integration effort:

```ts
integrationWork =
  baseTechnologyIntegration
  * architectureMismatch
  * moduleCoupling
  * platformBreadth
  * technologyNovelty
  * inverseToolingQuality
  * inverseTeamMastery
```

Technology combinations may be:

* Compatible.
* Compatible with additional work.
* Compatible with reduced effectiveness.
* Mutually exclusive.
* Dependent on another module.
* Unsupported on specific platforms.

Do not define every possible technology pair manually.

Use capability requirements, architecture tags, dependencies and performance budgets. Reserve explicit overrides for exceptional cases.

==================================================
15. GAME FEATURES ARE NOT TECHNOLOGIES
======================================

Maintain a strict separation.

Technology:

* A technical method or production capability.
* Researched by the studio.
* Installed into an engine.

Engine capability:

* What the engine can technically support.

Game feature:

* What the player chooses to build into a specific game.

Example:

```ts
Technology:
Real-Time Network Synchronization

Engine capability:
Synchronized Multiplayer Sessions

Game feature:
Four-Player Cooperative Campaign
```

Another example:

```ts
Technology:
Dynamic Audio Mixing

Engine capability:
Real-Time Layered Audio

Game feature:
Adaptive Combat Soundtrack
```

This separation prevents research from becoming a direct quality bonus.

==================================================
16. FEATURE DEFINITIONS
=======================

```ts
type GameFeatureDefinition = {
  id: FeatureId
  name: string
  category: FeatureCategory

  requiredCapabilities: CapabilityRequirement[]
  optionalCapabilities: CapabilityModifier[]
  requiredTechnologies?: TechnologyId[]

  requiredStage: 1 | 2 | 3
  designWork: number
  technologyWork: number
  polishWork: number

  performanceCost: PerformanceCost
  bugRisk: number
  integrationComplexity: number

  genreAffinityTags: string[]
  audienceAffinityTags: string[]
  conceptTags: string[]

  dependencyFeatureIds: FeatureId[]
  conflictTags: string[]
  synergyTags: string[]

  noveltyPotential: number
  minimumGameSize?: GameSize
}
```

Features should interact through descriptive tags instead of one giant hard-coded compatibility matrix.

Examples:

* `systemic`
* `narrative`
* `social`
* `competitive`
* `simulation`
* `exploration`
* `accessibility`
* `procedural`
* `cinematic`
* `persistent`
* `userGenerated`
* `online`

==================================================
17. FEATURE ROLES AND GAME IDENTITY
===================================

During pre-production, the player identifies feature roles.

```ts
type SelectedGameFeature = {
  featureId: FeatureId

  role:
    | "pillar"
    | "supporting"
    | "standard"
    | "experimental"

  ambition:
    | "minimal"
    | "standard"
    | "ambitious"
    | "flagship"

  targetCompleteness: number
  assignedStaffIds: EmployeeId[]
}
```

Pillar features define the game’s identity.

Recommended limits:

* Small game: 1 pillar
* Medium game: 1–2 pillars
* Large game: 2–3 pillars
* AAA game: 2–4 pillars

The player may exceed these recommendations, but the scope consequences must be real.

Reviewers and players should care more about the execution of declared pillars.

A game promising revolutionary multiplayer should be punished more heavily for weak multiplayer than a primarily narrative game containing a modest optional multiplayer mode.

==================================================
18. FEATURE COHERENCE
=====================

Feature coherence should measure whether the selected features support the game’s intended experience.

```ts
featureCoherence =
  pillarAlignment        * 0.35 +
  supportingAlignment    * 0.20 +
  genreAlignment         * 0.20 +
  audienceAlignment      * 0.10 +
  dependencyCompletion   * 0.10 +
  contradictionAvoidance * 0.05
```

Do not reward feature quantity.

A focused game with six well-integrated features may outperform a game containing twenty disconnected features.

Examples of coherent combinations:

* Stealth AI + nonlinear levels + sound propagation.
* Branching dialogue + relationship simulation + consequence tracking.
* Vehicle physics + track editor + competitive multiplayer.
* Procedural generation + survival systems + exploration tools.

Examples of potential conflict:

* Highly cinematic pacing with constant unscripted interruption.
* Deep simulation combined with insufficient interface support.
* Competitive online play without adequate networking or anti-cheat support.
* Large open worlds without streaming or navigation technology.

Conflicts should usually create additional work or reduced effectiveness rather than arbitrary score penalties.

==================================================
19. FEATURE EFFECTIVENESS
=========================

```ts
featureEffectiveness =
  implementationQuality
  * engineCapabilityFit
  * completion
  * teamMastery
  * featureCoherence
  * performanceQuality
  * platformCompatibility
```

Innovation affects the potential ceiling and market response, but experimental technology also increases execution risk.

A partially completed flagship feature should be more damaging than a partially completed minor feature.

Store the complete feature outcome:

```ts
type FeatureOutcome = {
  featureId: FeatureId
  role: FeatureRole

  implementationQuality: number
  engineCapabilityFit: number
  completion: number
  teamMastery: number
  coherence: number
  performanceQuality: number
  finalEffectiveness: number

  generatedBugs: BugState
  causedDelays: number
  masteryGained: number
  explanationFactors: ExplanationFactor[]
}
```

==================================================
20. SCOPE AND COMPLEXITY
========================

Calculate project capacity:

```ts
effectiveProjectCapacity =
  baseCapacityByGameSize
  * staffCapacity
  * managementQuality
  * engineTooling
  * teamExperience
  * scheduleFactor
```

Calculate scope:

```ts
projectScope =
  featureWork
  + platformWork
  + contentWork
  + technologyNoveltyWork
  + integrationWork
  + productionOverhead
```

Scope pressure:

```ts
scopePressure =
  projectScope
  / effectiveProjectCapacity
```

Suggested behavior:

```ts
below 0.85
→ Comfortable

0.85 to 1.00
→ Manageable

1.00 to 1.20
→ Over-scoped

above 1.20
→ Severe completion and polish risk
```

Do not apply one flat penalty.

Over-scoping should create specific consequences:

* Development delays.
* Incomplete features.
* Employee overload.
* Increased bugs.
* Reduced testing.
* Reduced polish.
* Higher technical debt.
* Greater chance that weak features damage coherence.

==================================================
21. FEATURE CUTTING
===================

Allow features to be cut during development.

When cutting a feature:

* Completed work is not refunded.
* Remaining work is removed.
* Some created assets or code may be reusable.
* Dependencies must be reevaluated.
* Coherence may improve or worsen.
* Technical debt may remain if removal is rushed.
* Marketing promises may create expectation damage.
* Team mastery from completed work remains.

Offer:

* Cut cleanly.
* Disable for launch.
* Delay to a later update.
* Reduce ambition.
* Keep and delay the game.
* Keep and release incomplete.

This becomes especially important once post-release content is implemented.

==================================================
22. MASTERY LAYERS
==================

Track mastery at four levels.

Individual familiarity:

* How well one employee understands a technology, module or feature.

Team familiarity:

* How experienced the current assigned group is together.

Studio knowledge:

* Knowledge retained through documentation, tools and completed work.

Module maturity:

* How proven this specific engine implementation is.

```ts
type MasteryState = {
  individual: Record<EmployeeId, number>
  team: Record<TeamId, number>
  studio: number
  module: number
}
```

Mastery must use diminishing returns.

```ts
masteryGain =
  relevantWork
  * challengeFit
  * feedbackQuality
  * mentorshipFactor
  * documentationFactor
  * noveltyFactor
  * diminishingReturn
```

Suggested qualitative ranges:

```ts
0–19   Unfamiliar
20–39  Learning
40–59  Competent
60–79  Experienced
80–94  Expert
95–100 Mastered
```

Do not expose exact values in Standard mode unless earned through analysis tools.

==================================================
23. LEARNING FROM SUCCESS AND FAILURE
=====================================

Employees gain mastery while working, not only after release.

Different activities create different knowledge:

* Research creates conceptual knowledge.
* Prototyping creates experimental familiarity.
* Integration creates engine knowledge.
* Production creates implementation mastery.
* Testing creates reliability knowledge.
* Released games create real-world validation.
* Post-release bug fixes create diagnostic knowledge.

Failed work still teaches, but less efficiently than successful, well-reviewed implementation.

```ts
validatedMasteryGain =
  productionMasteryGain
  * validationQuality
```

Validation quality may come from:

* Internal testing.
* Successful engine integration.
* Stable release.
* Player telemetry.
* Post-release reports.
* Repeated production use.

A disastrous release should not award the same mastery as a stable success, but it should not award zero.

==================================================
24. EMPLOYEE DEPARTURE AND KNOWLEDGE RETENTION
==============================================

When an experienced employee leaves:

* Their individual mastery leaves with them.
* Studio knowledge remains.
* Well-documented engines retain more practical knowledge.
* Poorly documented systems suffer a larger familiarity loss.
* Teams with multiple experts have better knowledge retention.
* Tools and automated tests reduce dependency on one employee.

```ts
retainedKnowledge =
  studioKnowledge
  * (
      documentationQuality * 0.35 +
      toolingQuality       * 0.25 +
      teamRedundancy       * 0.25 +
      architectureQuality  * 0.15
    )
```

Do not create sudden arbitrary engine destruction when an employee leaves.

Instead, show concrete effects:

* Longer onboarding.
* Less accurate estimates.
* Higher maintenance risk.
* Reduced integration speed.

==================================================
25. MENTORSHIP AND ONBOARDING
=============================

Experienced employees should help others learn.

Mentorship has a cost:

* Mentor produces less direct work.
* Junior employee learns faster.
* Team knowledge becomes less concentrated.
* Documentation may improve.
* Future projects become less risky.

Do not let one expert instantly teach an entire company.

Mentorship effectiveness depends on:

* Mentor mastery.
* Communication skill.
* Time assigned.
* Learner aptitude.
* Shared project work.
* Documentation and tools.
* Team workload.

==================================================
26. TECHNICAL DEBT
==================

Technical debt must represent stored causes, not one invisible penalty.

```ts
type TechnicalDebtState = {
  integrationDebt: number
  architectureDebt: number
  portabilityDebt: number
  toolingDebt: number
  testDebt: number
  documentationDebt: number
  legacyDebt: number

  sources: TechnicalDebtSource[]
  affectedModuleIds: EngineModuleInstanceId[]
  createdWeek: number
  lastServicedWeek?: number
}
```

Debt may be created by:

* Rushed integration.
* Excessively coupled modules.
* Skipping tests.
* Supporting too many platforms through special-case code.
* Installing incompatible technology.
* Repeatedly extending an old architecture.
* Cutting features poorly.
* Upgrading during active production.
* Losing critical employees without knowledge transfer.
* Shipping prototype-level technology.
* Ignoring known engine problems.

Technical debt should not directly subtract review points.

It creates operational consequences:

* Slower future development.
* More regressions.
* Less accurate estimates.
* Higher integration cost.
* More platform-specific bugs.
* Reduced engine reliability.
* Higher maintenance expenses.

==================================================
27. TECHNICAL DEBT INTEREST
===========================

Debt becomes expensive when the affected area changes.

```ts
debtInterest =
  debtPrincipal
  * moduleCoupling
  * changeFrequency
  * technologyObsolescence
  * platformBreadth
```

An untouched legacy module may create limited weekly cost.

A heavily modified, tightly coupled core module should create substantial cost.

This prevents debt from behaving like a passive tax while preserving its long-term danger.

The player may intentionally accept debt to meet a deadline.

Choices may include:

* Ship Fast
* Balanced Development
* Architecture First

These policies affect work allocation and debt generation. They are not difficulty settings.

==================================================
28. REFACTORING AND ENGINE MAINTENANCE
======================================

Allow maintenance projects:

* Fix Known Issues
* Improve Test Coverage
* Improve Documentation
* Improve Tooling
* Decouple Modules
* Optimize Performance
* Remove Legacy Platform Support
* Replace a Module
* Major Engine Refactor

Refactoring should have measurable value.

```ts
refactorValueEstimate =
  expectedFutureDebtInterestReduction
  + expectedBugReduction
  + expectedIntegrationSavings
  + expectedPortingSavings
  - refactorCost
  - scheduleOpportunityCost
```

Standard mode may show:

* “This engine is becoming difficult to maintain.”
* “The graphics module is responsible for most regressions.”
* “Dropping support for the oldest platform would simplify future upgrades.”

Analyst mode may show estimated ranges.

==================================================
29. ENGINE AGING
================

An engine must not degrade simply because time passes.

Instead, track its gap relative to:

* Current platforms.
* Current production expectations.
* Emerging technologies.
* Audience expectations.
* Rival capabilities.
* Supported game scope.

A mature older engine may remain excellent for:

* Smaller games.
* Specific genres.
* Low-end platforms.
* Rapid sequels.
* Highly specialized production.

Eventually, architectural constraints may limit its ceiling.

This creates a gradual decision to maintain, branch, rebuild or retire the engine.

==================================================
30. FRONTIER POSITION
=====================

Each technology use has a frontier position:

```ts
type TechnologyFrontierPosition =
  | "experimental"
  | "earlyAdopter"
  | "current"
  | "mature"
  | "legacy"
```

Experimental:

* High innovation potential.
* High research and integration risk.
* Limited mastery.
* Possible platform limitations.
* Strong industry impact if successful.

Early Adopter:

* Meaningful novelty.
* Moderate risk.
* Limited market familiarity.

Current:

* Balanced risk and market value.
* Broad platform support.

Mature:

* High reliability.
* Strong mastery.
* Lower innovation.
* Efficient production.

Legacy:

* Low novelty.
* Possible compatibility problems.
* May remain valuable in niches.

Innovation should depend on what the technology enables in the game, not merely its frontier label.

Using an experimental renderer for a simple text strategy game should not create automatic innovation.

==================================================
31. PROJECT DEVELOPMENT FLOW
============================

Pre-production:

1. Select concept.
2. Declare game pillars.
3. Select platforms.
4. Select an existing engine or eligible toolkit.
5. Run compatibility analysis.
6. Select features.
7. Review scope and performance risks.
8. Confirm the production plan.

Compatibility analysis must identify:

* Supported features.
* Missing capabilities.
* Experimental capabilities.
* Platform limitations.
* Mastery concerns.
* Performance pressure.
* Estimated engine work.
* Technical debt exposure.

If a required capability is missing, offer:

* Upgrade the engine first.
* Integrate technology during the project.
* Reduce feature ambition.
* Remove the feature.
* Change platforms.
* Select another engine.
* Cancel planning.

Integrating major technology during an active game should be possible but risky.

==================================================
32. DEVELOPMENT STAGE CONNECTION
================================

Feature work must flow into the established three-stage development system.

Stage 1:

* Engine
* Gameplay
* Story/Quests

Stage 2:

* Dialogue
* Level Design
* Artificial Intelligence

Stage 3:

* World Design
* Graphics
* Sound

Each selected feature declares its primary stage and possible supporting stages.

Example:

```ts
Dynamic Weather
primaryStage: 3
supportingWork:
  engine: 20
  artificialIntelligence: 10
  worldDesign: 35
  graphics: 25
  sound: 10
```

The player should see which features are consuming stage capacity.

A game cannot reach Stage 3 and reveal that an earlier engine dependency was never implemented. Missing prerequisites must be caught during planning or Stage 1.

==================================================
33. GAME REPORTS AND KNOWLEDGE
==============================

Game Reports should evaluate actual production outcomes.

Possible findings:

* “The team lacked experience with the new networking technology.”
* “Strong engine tooling improved development speed.”
* “The graphics module exceeded the target platform’s capabilities.”
* “The project included more features than the team could polish.”
* “High mastery allowed the studio to use older technology effectively.”
* “Most launch bugs originated in the newly replaced AI module.”
* “The engine’s portability reduced multiplatform development work.”
* “The game’s declared pillar received insufficient production effort.”

Reports convert hidden factors into permanent player knowledge.

They cannot invent random slider advice.

==================================================
34. RESEARCH AND ENGINE UI
==========================

Research screen tabs:

* Available
* Active
* Completed
* Technology Families
* Archive

Hide tabs that have no unlocked purpose.

Each technology card should answer:

* What does this enable?
* Why is it available?
* What prerequisites remain?
* What is the estimated research range?
* Is it experimental or established?
* What engine modules can use it?
* Which known platforms support it?

Engine screen tabs:

* Overview
* Capabilities
* Modules
* Compatibility
* Technical Health
* Version History

The Overview must show:

* Engine identity.
* Current version.
* Best-supported game types.
* Supported platforms.
* Strongest capabilities.
* Major limitations.
* Stability.
* Team familiarity.
* One important maintenance warning.

Do not turn the screen into a wall of progress bars.

==================================================
35. PLAYER-FACING RISK LANGUAGE
===============================

Risk must be understandable before confirmation.

Use consistent labels:

```ts
Proven
Familiar
Experimental
Overloaded
Unsupported
Legacy
High Maintenance
Platform Limited
```

Example confirmation:

```text
This project uses two experimental technologies.

Expected consequences:
• Development estimates will be less accurate.
• Bug generation is likely to increase.
• The assigned team has limited networking experience.
• The oldest selected platform cannot support the full feature set.

Potential benefit:
• Successful implementation may produce significant innovation.
• The studio will gain valuable networking mastery.
```

The player does not need the exact formula to understand the decision.

==================================================
36. INFORMATION MODES
=====================

Standard:

* Qualitative technology maturity.
* Compatibility labels.
* Broad completion estimates.
* Major scope and debt warnings.
* Discovered knowledge only.

Assisted:

* Estimated work ranges.
* Directional mastery guidance.
* Feature dependency warnings.
* Suggested engine alternatives.
* More precise performance risk.

Analyst:

* Component-level estimates.
* Technical debt breakdowns.
* Performance budget ranges.
* Mastery ranges.
* Estimated refactoring value.
* Historical engine comparisons.

Cheats/debug:

* Reveal all technology.
* Complete research.
* Set research maturity.
* Set mastery values.
* Integrate technology instantly.
* Remove technical debt.
* Reveal exact compatibility calculations.
* Force technology emergence.
* Inspect deterministic random keys.

Debug data must not appear in Analyst mode.

Cheat use must persist and retain the campaign’s Cheats Enabled label.

==================================================
37. RIVAL TECHNOLOGY BEHAVIOR
=============================

Rivals use the same conceptual restrictions through an abstract model.

Rivals require:

* Technology discovery.
* Research or licensing.
* Compatible engine capability.
* Production experience.
* Platform compatibility.
* Time and money.

Rival strategies may differ:

* Frontier research leader.
* Reliable mature-technology studio.
* Platform specialist.
* Engine licensor.
* Tools and efficiency specialist.
* Fast follower.
* Low-cost legacy developer.

Rivals cannot:

* Instantly receive every new technology.
* Use technology before its industry window.
* Ignore engine compatibility.
* Gain perfect mastery automatically.
* Release experimental technology without risk.
* See the player’s hidden engine plans.

A rival breakthrough may accelerate public discovery but does not give the technology directly to the player.

==================================================
38. MARKET AND REVIEW CONNECTION
================================

This system supplies these outputs to `algorithmV2`:

```ts
type DevelopmentFoundationOutput = {
  executionCapacity: number
  featureOutcomes: FeatureOutcome[]
  featureCoherence: number
  technologyInnovation: number
  performanceQuality: number
  platformBuildQuality: Record<PlatformId, number>
  engineReliability: number
  teamExecution: number
  productionCompleteness: number
  bugState: BugState
}
```

Marketing does not affect these values.

Market effects may include:

* Frontier technology attracting enthusiasts.
* Mature technology improving reliability.
* Unsupported platform features reducing conversion.
* Exceptional technology use creating a trend.
* Poor experimental implementation hurting player sentiment.
* Strong engine tools enabling faster sequels.
* Platform-exclusive technical showcases improving platform momentum.

Technology novelty must not directly guarantee good reviews.

Execution determines whether novelty succeeds.

==================================================
39. SAVE AND DETERMINISM
========================

Persist:

* Technology visibility.
* Discovery sources.
* Research progress.
* Research findings.
* Engine versions.
* Module states.
* Integration projects.
* Technical debt sources.
* Mastery values.
* Project platform builds.
* Feature outcomes.
* Engine upgrade history.
* Deterministic event keys.

Use keyed deterministic values:

```ts
seededValue(
  campaignSeed,
  entityId,
  week,
  decisionType
)
```

Research setbacks, integration problems and technology emergence cannot reroll after saving and loading.

UI render order cannot affect simulation results.

==================================================
40. EXISTING SAVE MIGRATION
===========================

For existing campaigns:

* Preserve the Research unlock.
* Preserve owned technologies.
* Preserve existing engines.
* Preserve released games.
* Preserve active projects.
* Preserve sales and review history.

Convert old engines into imported engine versions.

```ts
legacyImported: true
```

Infer:

* Capabilities from previously selected engine features.
* Stable maturity for repeatedly used technology.
* Reasonable studio mastery from release history.
* Moderate documentation and architecture values.
* Zero or limited technical debt unless existing data indicates problems.

Do not retroactively alter released review scores.

Do not remove previously available Research from the current save.

==================================================
41. BALANCE GUARDRAILS
======================

The system must avoid these dominant strategies:

* Always install every technology.
* Always use the newest technology.
* Never upgrade the original engine.
* Rebuild the entire engine every year.
* Select every available feature.
* Support every platform.
* Assign one expert to every technical task.
* Ignore testing and refactor immediately after release.
* Accumulate unlimited debt without consequence.
* Avoid all risk and still dominate innovation.
* Research everything without producing games.
* Grind mastery through meaningless repeated actions.

Use diminishing returns, opportunity costs and actual project constraints.

==================================================
42. HEADLESS BALANCE HARNESS
============================

Create a non-UI simulation harness.

```ts
simulateDevelopmentStrategy({
  campaignSeed,
  difficulty,
  studioProfile,
  strategyPolicy,
  years
})
```

Test policies:

* Always Newest Technology
* Mature Technology Specialist
* Universal Multiplatform Engine
* Single-Platform Specialist
* Feature Maximizer
* Focused Feature Strategy
* Never Refactor
* Frequent Rebuild
* Heavy Research
* Minimal Research
* Aggressive Technical Debt
* Architecture First

Measure:

* Average quality.
* Review distribution.
* Development time.
* Bug rate.
* Research spending.
* Engine spending.
* Technical debt.
* Number of delayed releases.
* Platform coverage.
* Profit.
* Innovation.
* Bankruptcy rate.

Across a large seed sample, no policy should dominate every era, difficulty and studio profile.

The system should produce understandable strengths and weaknesses for every strategy.

==================================================
43. REQUIRED BEHAVIORAL SCENARIOS
=================================

Scenario A: Proven specialist

A studio uses a mature, highly mastered engine for a genre it knows well.

Expected:

* Accurate estimates.
* Efficient development.
* Low bugs.
* Limited technology innovation.
* Competitive quality.

Scenario B: Frontier gamble

A studio installs prototype technology into a new engine.

Expected:

* Wider estimates.
* More integration work.
* Higher bug risk.
* Strong innovation potential.
* Significant mastery gain.
* No guaranteed success.

Scenario C: Aging engine

A studio repeatedly extends an older, tightly coupled engine.

Expected:

* Early projects remain efficient.
* Upgrade work gradually becomes expensive.
* Regression risk increases.
* Refactoring or rebuilding eventually becomes attractive.

Scenario D: Overbuilt universal engine

A studio tries to support every platform and capability.

Expected:

* High engine cost.
* High testing burden.
* Good market reach.
* Reduced specialization.
* Increased portability debt if rushed.

Scenario E: Focused small game

A small team uses a limited but stable engine and selects one strong pillar.

Expected:

* Manageable scope.
* Strong coherence.
* Potential to outperform a bloated larger project.
* Lower maximum technical spectacle.

Scenario F: Expert departure

The primary engine expert leaves a poorly documented studio.

Expected:

* Engine continues functioning.
* Maintenance estimates worsen.
* Integration speed decreases.
* Existing studio knowledge remains partially available.
* No arbitrary engine destruction.

==================================================
44. FIRST IMPLEMENTATION SLICE
==============================

Do not implement the entire document simultaneously.

Build this vertical slice first:

1. Four technology families.
2. Three versions per family, with only eligible versions visible.
3. Technology visibility states.
4. Research projects with persistent progress.
5. Feasibility, Prototype and Production Ready maturity.
6. One persistent custom engine.
7. Graphics, AI, Audio, Tools and Platform modules.
8. Explicit technology integration.
9. Engine major, minor and patch versions.
10. Individual and studio mastery.
11. Feature capability requirements.
12. Pillar and supporting feature roles.
13. Scope pressure.
14. Platform performance budgets.
15. Project-specific platform builds.
16. Technical debt sources.
17. Engine maintenance projects.
18. Research and Engine screens.
19. Game Report findings from actual outcomes.
20. Full deterministic save/load.
21. Existing-save migration.
22. Headless balance scenarios.

Exclude for now:

* Selling engine licenses.
* External commercial engines.
* Patent lawsuits.
* Technology espionage.
* Acquisitions.
* Custom consoles.
* Hardware manufacturing.
* Mod marketplaces.
* Open-source engines.
* Engine royalties.
* Middleware vendor negotiations.
* Live-service infrastructure.
* MMO server architecture.

==================================================
45. ACCEPTANCE TESTS
====================

Verify:

1. Future technology remains completely hidden.
2. Only the next eligible family version becomes visible.
3. Date progression alone does not unlock the complete chain.
4. Research progress survives save and reload.
5. Cancelling research preserves completed knowledge.
6. A failed prototype still provides useful findings.
7. Researching technology does not modify an engine.
8. Technology cannot affect a game until integrated.
9. Integration requires time, staff and compatible architecture.
10. Installing technology creates a new engine version.
11. Released games retain their exact engine version.
12. Updating an engine does not alter released games.
13. Active projects cannot migrate engine versions silently.
14. Employees gain mastery during relevant work.
15. Mastery has diminishing returns.
16. Prototype technology has higher risk than stabilized technology.
17. Mature technology remains useful.
18. New technology does not guarantee better reviews.
19. Engine design allocations total 100.
20. No engine can maximize every design goal.
21. Engine architecture affects future upgrade cost.
22. Module coupling affects regression and maintenance work.
23. Technical debt records its actual sources.
24. Debt creates future operational costs rather than an unexplained review penalty.
25. Refactoring reduces the correct debt sources.
26. Untouched debt creates less cost than debt in frequently modified modules.
27. Feature selection checks engine capabilities.
28. Unsupported features cannot be selected without an explicit resolution.
29. Pillar features influence game identity and feedback.
30. Feature quantity does not automatically improve quality.
31. Scope pressure creates delays, bugs or incomplete work.
32. Cutting a feature updates dependencies and scope.
33. Platform builds track separate performance and bugs.
34. A weak platform can limit or alter a game.
35. Supporting another platform increases real workload.
36. Performance optimization improves the relevant platform build.
37. Employee departure removes individual mastery but not all studio knowledge.
38. Documentation improves knowledge retention.
39. Mentorship improves learning while consuming mentor time.
40. Game Reports correspond to actual production outcomes.
41. Rivals obey technology-era restrictions.
42. Rivals cannot use technology without compatible capabilities.
43. Identical decisions and seeds produce identical outcomes.
44. Saving and loading cannot reroll research or integration problems.
45. Existing saves retain Research.
46. Existing games retain their original reviews.
47. Existing engines migrate without disappearing.
48. Cheats modify actual technology and mastery state.
49. Cheat changes survive reload.
50. Normal UI never exposes debug calculations.
51. React rerenders cannot affect engine simulation.
52. Always choosing the newest technology is not universally optimal.
53. Always selecting every feature is not universally optimal.
54. Focused games can outperform bloated games.
55. Old engines remain viable until their constraints matter.
56. A studio can become known for a specialized engine strategy.
57. Every warning describes a real calculation.
58. Every visible Research and Engine button works.
59. Hidden systems cannot be accessed through another screen.
60. Research, engine, feature, quality and market calculations remain separate.

Do not continue into engine licensing, custom hardware, MMOs or live-service systems until this vertical slice is playable, deterministic and balanced.

The critical gameplay loop is:

```ts
Discover
→ Research
→ Prototype
→ Integrate
→ Build
→ Learn
→ Maintain
→ Upgrade or Replace
```

Every step must create a decision.

The research behind this direction is strong:

* NASA’s Technology Readiness Level framework separates early research, proof of concept, component testing and operational readiness. That supports separating discovery, prototypes and production readiness instead of using a single Researched flag. [NASA Technology Readiness Levels](https://www.nasa.gov/directorates/somd/space-communications-navigation-program/technology-readiness-levels/)
* Modern engines have real feature and platform compatibility constraints. Epic’s documentation shows that major rendering features depend on specific rendering paths, APIs and hardware capabilities. [Epic rendering compatibility documentation](https://dev.epicgames.com/documentation/unreal-engine/supported-features-by-rendering-path-for-desktop-with-unreal-engine)
* Empirical software-architecture research found that tightly coupled components create disproportionately high maintenance and defect-related costs. That supports module coupling, debt interest and refactoring as actual production mechanics. [Technical debt and system architecture](https://www.hbs.edu/ris/Publication%20Files/2016-JSS%20Technical%20Debt_d793c712-5160-4aa9-8761-781b444cc75f.pdf)
* Software-development learning research found a decreasing exponential learning relationship, supporting rapid early gains followed by diminishing returns rather than unlimited linear XP. [Empirical software learning-curve study](https://doi.org/10.1016/j.ejor.2005.07.029)
* Mad Games Tycoon 2 already demonstrates that engine and gameplay features can gain experience, but this design pushes the idea further by separating employee familiarity, studio knowledge, module maturity and production validation. [Official update history](https://store.steampowered.com/oldnews/?appgroupname=Mad+Games+Tycoon+2&appids=1342330&feed=steam_community_announcements)
* Software Inc.’s current development notes emphasize gradually introducing systems while continuing to deepen the core software-development loop. That supports progressive disclosure and focused implementation slices instead of exposing the whole simulation immediately. [Software Inc. official development site](https://softwareinc.coredumping.com/)

The next refinement after this should be the complete employee, team, leadership and studio-culture simulation. That system will determine who performs the work, how teams develop specialties, how burnout and mentorship operate, and why two studios using the same engine can produce radically different games.
Use the following as a correction pass on the current game. Preserve the underlying campaign and all working systems. Do not redesign the UI yet, because ChatGPT/Codex will create the final visual assets and UI direction after the simulation reaches a stable, playable state.

The screenshots supplied represent the current build and must be treated as evidence of its actual behavior. Compare these corrections against the current implementation, not against assumptions from the design documents.

CURRENT PRIORITY

Focus on correcting gameplay flow, simulation timing, state transitions and missing player decisions. Do not spend time polishing the current visual design beyond fixing usability problems that obstruct play.

1. CAMPAIGN SETUP

* Add a Player Name field separate from Company Name.
* Persist both values in the campaign save.
* The current New Campaign screen may remain temporarily, but it is not the final design.
* Main genres should be available from the beginning. Do not begin with only two genres unless the selected campaign rules explicitly require that.
* Keep the four-option topic selector if it represents the currently discovered topic choices.
* Reconsider the automatic random title.
* A project must not silently receive a consequence-free generic title.
* Require the player to deliberately name the game before production is confirmed.
* If placeholder titles are allowed, make the status explicit and require resolution before release.

2. TOOLTIPS

The current development tooltip obstructs the interface and remains visible too long.

Correct it so that:

* It does not cover the primary controls or development information.
* It disappears promptly after pointer exit.
* Only one tooltip can be active at a time.
* It has a short exit delay, approximately 100–200 milliseconds.
* It can reposition itself when insufficient space exists.
* It must never become stuck onscreen after the associated element loses focus.
* Touch behavior must allow dismissal by tapping elsewhere.

3. DEVELOPMENT TIMING

Development currently moves through Stage 1, Stage 2 and Stage 3 too quickly. The simulation visually appears nearly instantaneous, even when weeks are technically passing.

Development must feel like an actual production period.

* Stage duration must be based on project workload and available production capacity.
* Do not use an arbitrary fixed duration of roughly two weeks per stage.
* Small starting games must generally take considerably longer than the current implementation.
* Fourteen weeks from development through the end of the sales lifecycle is far too short.
* Stage progression must produce visible weekly changes.
* Progress should move in understandable increments rather than jumping immediately between stages.
* The player must have enough time to observe staff production, generated design and technology points, bugs, fatigue and project risks.
* Game speed controls may accelerate animation and simulation time, but they must not reduce the underlying amount of work required.

Use the existing workload, scope, employee skill, tooling, feature and engine systems to calculate duration. Do not create a separate cosmetic progress timer.

4. PLAYER CHARACTER ENERGY

The founder/player character must not use the hired-employee energy system.

* Hired employees may have energy, fatigue, burnout and recovery.
* The player-controlled founder must not become unavailable because of an employee energy meter.
* Remove the founder from employee energy depletion and recovery calculations.
* Preserve the founder’s contribution to production.
* If founder limitations are needed later, they must come from a separate leadership or attention-capacity system, not employee energy.

Audit every employee-related calculation so the founder is excluded where appropriate.

5. BUG FIXING BEFORE RELEASE

The current flow reaches Finish and Release while showing outstanding bugs but does not give the player a proper opportunity to fix them.

Replace this with a pre-release completion state.

When normal development work ends:

* Stop automatic production-stage advancement.
* Show remaining bugs and their known severity.
* Allow the player to continue fixing bugs.
* Allow the player to release with known bugs.
* Allow the player to cancel/delete the unreleased game.
* Do not automatically release the game.

Bug fixing must consume real simulation time and staff work. Releasing with bugs must preserve those bugs in the released build and influence reviews, player sentiment, refunds, sales and post-release support.

6. RELEASE OR DELETE DECISION

After development, the player must choose between releasing the game and deleting/canceling it.

Release:

* Confirms the launch price.
* Locks the launch build and its engine version.
* Begins review processing.
* Begins market availability.
* Automatically resumes time after release.
* The player should not need to press Play manually after confirming release.

Delete/cancel:

* The game is never published.
* No reviews or sales are generated.
* Development money and elapsed time remain spent.
* Staff and studio knowledge gained during development remain.
* Research, mastery and valid discoveries remain.
* The unreleased project is retained in historical records as canceled or unreleased.
* Do not delete the company, campaign, research, employee progress or other unrelated state.

7. RELEASE PRICE

Add price selection to the pre-release process.

* The player chooses the launch price before confirming release.
* Price must influence demand relative to game quality, audience expectations, platform norms, company reputation and market conditions.
* A high-quality game may sustain a higher price.
* An overpriced weak game should reduce conversion and may harm sentiment.
* A lower price may increase unit sales but reduce revenue per unit.
* Price must not directly alter review quality.

Permit the player to change the price after the first month on sale.

* Enforce a minimum interval between price changes.
* Price changes affect future sales only.
* Do not rewrite prior sales.
* Track pricing history.
* Price cuts and increases must have understandable market consequences.
* Avoid allowing repeated price toggling to exploit demand calculations.

8. REVIEWS AND SALES ORDER

The current release sequence presents information in the wrong order.

Required order:

1. Development ends.
2. Player enters pre-release.
3. Player fixes bugs, selects price and decides whether to release or delete.
4. Player confirms release.
5. The released game becomes available.
6. Reviews are generated or revealed according to the intended review timing.
7. Sales accumulate only as simulation time advances.
8. First-week sales appear only after the first sales week has completed.

Do not show first-week sales before the game has been released.

Do not prepopulate lifetime sales, revenue or first-week units from a future state.

If reviews remain immediate for now, that is acceptable, provided that they occur only after Release is confirmed. The game must already exist on the market before any sales are recorded.

9. SALES LIFECYCLE

The current approximately 14-week market life for a small game is too short.

Replace the fixed lifecycle with a demand curve driven by:

* Review reception.
* Player sentiment.
* Platform installed base and active users.
* Platform fit.
* Genre and topic demand.
* Competition.
* Marketing awareness.
* Company reputation and fans.
* Launch price and later price adjustments.
* Post-launch bugs.
* Word of mouth.
* Game age.
* Platform decline or discontinuation.

A game may eventually fall to negligible weekly sales, but it should not automatically disappear after an arbitrary short period. Older games may continue producing small long-tail sales where appropriate.

The report screenshot showing Space Quest with 14 recorded weeks and then Off Market should not be treated as the desired default lifecycle.

10. GAME REPORTS

The existing report screen correctly attempts to show:

* Review averages.
* Publication scores.
* Lifetime units.
* Revenue.
* Development cost.
* Marketing cost.
* Profit.
* Fans gained.
* Weeks on market.
* Status.
* Weekly sales curve.
* Knowledge recorded.

Preserve those categories, but make every value originate from the actual simulation.

Reports must not become available before the relevant information exists. Reports should explain real results, including:

* Why the game sold strongly or weakly.
* Whether price helped or hurt conversion.
* Whether bugs harmed reception.
* Whether the platform was growing or declining.
* Whether genre momentum affected demand.
* Whether features, engine capability and team mastery affected quality.
* Whether competition affected visibility or sales.

11. MARKET SYSTEM

The screenshots show these Market tabs:

* Overview
* Platforms
* Calendar
* Trends
* Competitors

Keep this structure temporarily because it represents useful simulation categories.

However, all displayed content must come from real shared state.

Overview:

* Industry movement must reflect actual genre or audience momentum.
* Competing-title counts must match the real release calendar.
* Headlines must be generated from real announcements, releases, technology events and market movement.
* Upcoming/Recent must update consistently and must not display stale or duplicated entries without a legitimate reason.

Platforms:

* Active users, installed base, catalog share, license price and momentum must update through the platform simulation.
* Distinguish discontinued hardware from hardware that still has active users.
* A discontinued platform may retain a shrinking market instead of instantly becoming irrelevant.
* Platform momentum must affect sales potential without directly determining game quality.

Calendar:

* Show only publicly known announcements and releases.
* Secret rival projects must remain hidden until announced.
* Announcement dates and release dates must correspond to the same persistent rival project.
* Do not generate disconnected fake headlines that have no underlying project.

Trends:

* Genre momentum must be calculated from actual releases, sales, audience behavior and deterministic industry events.
* Labels such as Rising, Steady and Declining must correspond to calculated momentum.
* “Room to grow” must have a defined simulation meaning.
* Trends must not reshuffle from UI rendering or page navigation.

Competitors:

* Each competitor must have a persistent studio identity, strategy, reputation, fans, projects and release history.
* “Between projects” and “developing an unannounced project” must correspond to real rival state.
* Rivals must not receive universal Rep 100 by default.
* Rival reputation should develop from actual historical performance.
* Rival fans must change based on releases and market behavior.
* Rival archetypes should shape decisions without guaranteeing outcomes.

12. FINANCES

The current Finances screen is too sparse. It currently shows only Cash, Lifetime Revenue, Payroll and Rent.

Do not prioritize its visual redesign yet, but ensure the underlying finance ledger records:

* Game sales revenue.
* Platform licensing costs.
* Development expenses.
* Research expenses.
* Engine expenses.
* Marketing expenses.
* Payroll.
* Rent and facilities.
* Refunds where applicable.
* Post-release support costs.
* Price changes and revenue effects.
* Weekly and monthly cash flow.
* Profit or loss by game.

Lifetime Revenue must reflect actual accumulated revenue and remain separate from current Cash.

The final UI for this screen will be redesigned later by ChatGPT/Codex.

13. SETTINGS AND OFFICE UPGRADE

The current Settings screen is temporary scaffolding.

Keep Save Game and Pause Menu functional.

For Upgrade Office:

* Do not leave it as a contextless button that only removes money.
* It must validate affordability.
* It must explain what the next office enables.
* It must preserve the existing campaign.
* It must not silently alter unrelated systems.
* Any staffing, research, capacity or facility benefits must come from the office system.

The final Settings UI will also be redesigned later.

14. CURRENT UI AND VISUAL OWNERSHIP

Do not treat the existing white cards, blue pills, bottom navigation, typography, spacing, charts or page layouts as the final art direction.

For now:

* Preserve basic navigability.
* Fix obstructive tooltips.
* Fix inaccessible controls.
* Fix overflowing or clipped content.
* Keep the interface readable enough to test systems.
* Do not spend significant implementation time creating a polished design system.

ChatGPT/Codex will be used to create:

* Final visual direction.
* UI layouts and screen hierarchy.
* Icons.
* Game logos and branding.
* Character and employee portraits.
* Office environments.
* Platform and hardware imagery.
* Game cover art.
* Marketing artwork.
* Event illustrations.
* Charts and data-presentation direction.
* Other visual assets.

Grok should concentrate on:

* Simulation architecture.
* Deterministic state.
* Gameplay rules.
* Save/load.
* Correct calculations.
* Screen functionality.
* Data contracts needed by the future UI.

Build the interface so presentation can later be replaced without rewriting simulation logic. React components must consume view models or selectors and must not contain authoritative gameplay calculations.

15. IMPLEMENTATION REQUIREMENTS

Before changing code:

* Locate the current campaign, project, development-stage, employee-energy, bug, release, review, sales, market, rival and finance logic.
* Identify the authoritative state transition for each.
* Do not patch symptoms only in React.
* Do not use arbitrary year checks or UI-specific timers.
* Preserve existing saves through migration where necessary.
* Preserve deterministic results.
* Do not allow page navigation, rerendering or reopening a modal to reroll outcomes.

Add or update tests verifying:

1. Player name and company name persist separately.
2. Founder energy does not deplete.
3. Employee energy still functions.
4. Development stages require calculated work and meaningful time.
5. Game speed changes time rate but not required work.
6. Bugs can be fixed before release.
7. Releasing with bugs preserves them.
8. A game cannot generate sales before release.
9. First-week sales appear only after a completed market week.
10. Deleting an unreleased game preserves knowledge and spent costs.
11. Release automatically resumes simulation.
12. Launch price persists.
13. Price changes become available after one month.
14. Price changes affect only future sales.
15. Games are not automatically removed after approximately 14 weeks.
16. Market headlines correspond to persistent events.
17. Rival announcements and releases reference the same projects.
18. Platform metrics come from authoritative platform state.
19. Reports use actual financial and sales history.
20. Save/load cannot reroll reviews, sales, research or rival events.

Implement this as a focused correction pass. Do not expand into the full employee, culture or engine redesign yet. After completing it, report:

* Files changed.
* Systems corrected.
* Save migrations added.
* Tests added.
* Any rules that remain temporary.
* Any UI components that still contain simulation logic.
* Any blockers or contradictions found in the existing architecture.
I reviewed the current Steam version, the design/algorithm material, the research-and-engine document, your correction brief, and the screenshots of the current build.

The blunt answer: we are not missing more simulation depth. We are missing the connective structure that turns those systems into Game Dev Tycoon.

The documents are currently designing a deeper sequel while the build still lacks portions of the original game’s basic loop.

The Steam baseline

The current Steam release is 1.7.9, updated October 10, 2025. The core remains the garage-to-studio progression: develop games, learn through reports, research technology, build engines, hire/train staff, move offices, unlock labs, and complete major late-game projects. [Steam page](https://store.steampowered.com/app/239820/Game_Dev_Tycoon/), [current Steam news](https://steamcommunity.com/app/239820/allnews/)

The Steam version also specifically added multi-platform development, company expertise, post-release reports, and editing a title before release. [Greenheart’s Steam-version announcement](https://www.greenheartgames.com/2013/08/22/game-dev-tycoon-is-coming-to-steam-on-august-29th/)

Pirate Mode is not merely “harder sales.” It adds piracy, DRM research, and company-share mechanics. [Greenheart v1.6 announcement](https://www.greenheartgames.com/blog/)

Netflix-only licensed topics and content creators should not be counted as missing Steam parity unless we deliberately add them later. [Steam news explaining the Netflix additions](https://steamcommunity.com/app/239820/allnews/)

## What is already strong

Do not rewrite these systems:

* Research visibility and maturity states.
* Technology families and prerequisites.
* Explicit engine integration.
* Persistent engine versions.
* Module compatibility and architecture.
* Feature pillars and coherence.
* Scope pressure.
* Technical debt with identifiable causes.
* Individual, team, studio, and module mastery.
* Separate platform builds.
* Deterministic simulation and save migration.
* Rival technology restrictions.
* Headless balance testing.
* Information modes and debug separation.

The research/engine document is much more sophisticated than the original game.

## What is missing

| System                   | Coverage now                  | What is still missing                                                                                                                                                                                                                                                        |
| ------------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Campaign identity        | Partial                       | Separate player/company identity, founder data model, starting choices, campaign goal and campaign completion rules.                                                                                                                                                         |
| Campaign progression     | Weak                          | One authoritative era timeline connecting platforms, offices, game sizes, staff capacity, research, labs, events and endgame.                                                                                                                                                |
| First-game loop          | Incomplete                    | A complete campaign → project → stages → polish → release → reviews → sales → report → next project loop.                                                                                                                                                                    |
| Game definition          | Partial                       | Audience, single/multi-genre, multi-platform, sequel/IP selection, publisher, marketing plan, launch window and later game sizes.                                                                                                                                            |
| Development work         | Partial                       | Work units, staff assignments, workload, overwork, energy, specialization, feature ownership, stage duration and visible weekly progress.                                                                                                                                    |
| Founder rules            | Contradictory                 | Founder must be a distinct entity, not an employee with energy. Current mastery/staff types do not clearly enforce that.                                                                                                                                                     |
| Pre-release              | Missing                       | Bug-fixing period, release/delete decision, title confirmation, launch price, platform-build readiness and known-risk summary.                                                                                                                                               |
| Reviews                  | Partial                       | Review timing, reviewer expectations, historical quality baseline, review variance, delayed reviews and explanations without double-counting inputs.                                                                                                                         |
| Sales                    | Partial                       | Launch-week sequencing, demand curve, long tail, price elasticity, refunds, discounts, competition, piracy and post-launch sentiment.                                                                                                                                        |
| Post-release support     | Mostly missing                | Patches, bug fixes, updates, price history, support staffing, abandoned games and post-launch technical debt.                                                                                                                                                                |
| Game Reports             | Good concept, incomplete loop | Cost/time to produce reports, who creates them, knowledge discovery, permanent hints and failed/inconclusive findings.                                                                                                                                                       |
| Offices                  | Placeholder                   | Move conditions, rent, capacity, renovation, equipment, simultaneous work limits and what every office actually unlocks.                                                                                                                                                     |
| Employees                | Major gap                     | Hiring search, applicant quality, salary, training, specialization, vacations, morale, burnout, firing, onboarding, team assignment and leadership.                                                                                                                          |
| Contracts                | Missing                       | Contract work, deadlines, required output, penalties, research gains and early-game survival value.                                                                                                                                                                          |
| Publishing deals         | Missing                       | Minimum scores, required topic/genre/platform/audience, advances, royalties, penalties, fan exposure and contract negotiation. Publishing deals are an important part of Steam progression. [Greenheart’s official guidance](https://steamcommunity.com/app/239820/allnews/) |
| Marketing and hype       | Major gap                     | Campaign types, interviews, conventions/G3, hype decay, promises, audience targeting, press response and marketing mistakes.                                                                                                                                                 |
| Franchises and IP        | Missing                       | Sequels, time-between-release penalties, franchise fatigue, spiritual successors, remakes, expansions and reusable technology/assets.                                                                                                                                        |
| Random events            | Missing                       | Interviews, scams, hardware failures, sponsorships, ethical decisions, bailout choices and employee-related events.                                                                                                                                                          |
| Pirate Mode              | Incorrectly simplified        | DRM research, piracy levels, company shares, investor consequences and recovery strategies.                                                                                                                                                                                  |
| Bankruptcy               | Missing                       | Debt thresholds, warnings, emergency contracts, bailouts, share sales, failure and restart/checkpoint behavior.                                                                                                                                                              |
| Late game                | Deferred                      | AAA, MMO, expansions, R&D Lab, Hardware Lab, custom consoles, Grid, own convention and industry projects. Deferring is fine, but they need a roadmap contract.                                                                                                               |
| Endgame                  | Missing                       | Campaign score, awards, historical recap, continuation mode, records, achievements and final company valuation.                                                                                                                                                              |
| Tutorials/knowledge      | Partial                       | Progressive teaching, notification priority, discovered-versus-hidden information and contextual explanations.                                                                                                                                                               |
| Accessibility/QoL        | Missing spec                  | Tooltip rules, keyboard/touch handling, pause behavior, speed controls, confirmation safety and responsive screen behavior.                                                                                                                                                  |
| Mod/content architecture | Missing                       | Data-driven topics, genres, platforms, events, reviewers, companies and eras. Steam supports Workshop/modding, though matching that is optional.                                                                                                                             |

## The largest document problem

Section 44 calls the research/engine work a “vertical slice,” but it is not actually vertical.

It contains 22 interconnected technology systems while stopping before the complete player loop. That is a subsystem implementation tranche.

The first real vertical slice should be:

```text
Create campaign
→ Name and define a game
→ Develop through three meaningful stages
→ Assign work and generate bugs
→ Polish or release with bugs
→ Set price and release
→ Receive reviews
→ Advance through weekly sales
→ Produce a game report
→ Gain knowledge/research
→ Start a meaningfully different second game
→ Save and reload without changing the result
```

Until that works, module coupling, mentorship, engine frontier states and rival research strategies cannot prove that the game itself is fun.

## Problems inside the formulas

Several formulas still need normalization before implementation:

* `featureEffectiveness` multiplies seven factors. One low value can nearly erase the entire feature. It also risks counting coherence, performance and compatibility again later in `algorithmV2`.
* `featureCoherence` exists both as a project result and inside individual feature effectiveness. The aggregate relationship is undefined.
* Scope and capacity do not share a declared unit. We need one canonical unit such as “standard work-hours” or “production points.”
* Mastery gains are not time-scaled or bounded mathematically, even though the document requires diminishing returns.
* Technical debt needs individual debt records. The current state type mixes multiple sources/modules with one `createdWeek`.
* `retainedKnowledge` conflicts with the statement that studio knowledge already remains when an employee leaves.
* The deterministic key needs an occurrence or event ID. Two decisions of the same type for the same entity in the same week could collide.
* Rivals are described as obeying equivalent restrictions, but equivalence is not testable until their abstract work, money, mastery and risk budgets are defined.
* Platform performance budgets are required but not given canonical units or conversion rules.
* There is no single rule defining how development speed, calendar speed and game-speed controls interact.

## Current contradictions to settle

1. Main genres unlocked at the beginning versus the current Research screen selling Action, RPG, Simulation, Strategy and others.

   My recommendation: unlock the primary genres immediately. Research unlocks multi-genre, hybrid structures, subgenres and advanced genre capabilities.

2. Automatic title versus mandatory naming.

   Allow a temporary working title during production, but require an intentional final title before release. No consequence-free random title.

3. Campaign lengths.

   The documents mention 30/40/60-year campaigns, while the Steam progression was built around a defined historical timeline. We need one normalized era schedule that stretches proportionally with campaign length.

4. Standard versus Pirate Mode.

   Pirate Mode needs its own ruleset, not a simple demand penalty checkbox.

5. Manual pricing.

   This is an enhancement beyond the original game. It therefore needs a full pricing model, platform price norms, elasticity, discounts, refunds and anti-exploit cooldowns.

6. Persistent competitors.

   This is also considerably beyond the original loop. It is valuable, but it should not be completed before contracts, publishing, staff and release flow.

## What should be written next

Do not move directly into the giant employee/culture document yet.

The next document should be:

**Canonical Game Loop, Campaign Progression and State Machine**

It must establish:

1. Every project state and allowed transition.
2. The complete early-game loop.
3. Calendar/work/speed units.
4. Office and era progression.
5. Unlock dependencies.
6. Release, reviews, sales and report sequencing.
7. Failure, cancellation, bankruptcy and recovery.
8. Which Steam systems are required for parity, intentionally redesigned or deferred.
9. The authoritative owner of every calculation.
10. Acceptance tests covering the first three released games.

After that, the correct order is:

1. Employee, team, leadership and culture.
2. Economy, contracts, publishing and bankruptcy.
3. Marketing, press, hype and conventions.
4. Franchises, sequels and post-release support.
5. Late-game labs, AAA, MMO and custom hardware.
6. Endgame, achievements, continuation and mod/content architecture.

The core conclusion is simple: the project has enough advanced simulation. What it needs now is a canonical playable spine connecting all of it.
Canonical Game Loop, Campaign Progression, and State Machine

Implementation Authority

Use this document as the authoritative gameplay spine for the current game.

It does not replace the deeper Research, Technology, Engine, Employee, Market, or Review specifications. It defines when those systems are allowed to act, which state owns each result, and how they connect into a complete playable campaign.

When another document or the current build conflicts with this one on project state, campaign progression, time, release order, sales timing, cancellation, or save behavior, this document wins.

Preserve all working campaign data. Do not redesign the final UI during this pass. Grok owns simulation architecture, code, persistence, calculations, tests, and temporary functional screens. ChatGPT/Codex will later create the final UI direction and visual assets after the loop is stable.

Do not copy Steam Workshop code, text, assets, names, or balance data. Reproduce the genre's proven gameplay structure through original, native systems. Keep unfinished or deferred systems behind explicit configuration and feature flags. Do not expose a button for a system that does not work.

1. Core Product Requirement

The game must first succeed as a complete studio-management loop:

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

The advanced technology loop sits inside that spine:

Discover
→ Research
→ Prototype
→ Integrate
→ Build
→ Learn
→ Maintain
→ Upgrade or Replace

Every step must create a decision. No major result may occur because a screen opened, a React component rendered, a tooltip appeared, or the player revisited a page.

The first implementation milestone is not complete when the Research and Engine screens work. It is complete when a player can create a campaign, release three games, learn from them, survive financially, and reload the campaign without changing any outcome.

2. Non-Negotiable Rules

Campaign, project, employee, engine, market, and financial state must be persistent and deterministic.

The founder is a distinct entity. The founder does not use hired-employee energy.

The founder can perform work but can only hold one primary work assignment at a time.

All six main genres are available at campaign start: Action, Adventure, RPG, Simulation, Strategy, and Casual.

Multi-Genre, advanced genre structures, and specialized genre capabilities are researched later.

A new campaign begins with exactly four discovered starting topics, chosen deterministically from the valid starting pool.

A generated working title may be used during development, but release is blocked until the player deliberately confirms a final title.

Development duration comes from required work and production capacity. It is never a cosmetic timer.

Game-speed controls change real-time playback speed only. They do not change required work, results, risk, sales, or simulation opportunity.

Every development stage must remain visible long enough for the player to understand progress, production, bugs, and staff contribution.

Stage transitions require a real state transition and player confirmation. They cannot be skipped by a fast render loop.

Development completion enters Pre-Release. It does not release the game.

Pre-Release must allow continued bug fixing, final naming, launch pricing, release, and cancellation.

Releasing with known bugs preserves those bugs in the released build.

A game cannot receive reviews or sales before the Release transaction succeeds.

Reviews may appear immediately after release, but sales may only appear as market time advances.

First-week sales appear only after seven full simulation days on the market.

Release automatically resumes simulation at the last nonzero game speed.

Canceling an unreleased game preserves spent money, elapsed time, mastery, research findings, and studio knowledge.

Canceling or deleting an unreleased project never erases unrelated campaign state.

The launch price is chosen before release. The first post-launch price change becomes eligible after 28 simulation days.

Price changes affect future demand only and are recorded in immutable price history.

A game is not automatically removed from sale after roughly 14 weeks.

Marketing affects awareness and demand. It does not directly improve production quality or review quality.

Researching technology does not silently install it into an engine.

Updating an engine never alters a released game or an active project silently.

React components and selectors may present calculations. They may not own authoritative simulation rules.

The normal UI never exposes debug values or hidden exact formulas.

Distant locked systems are not displayed as disabled clutter. Navigation and choices appear when they become meaningful.

All warnings must correspond to an actual calculation and a possible consequence.

3. Canonical Time, Work, and Speed Units

The current build mixes visual animation, calendar movement, and development completion. Replace that ambiguity with these canonical units.

3.1 Simulation time

type SimDay = number
type SimWeek = number
type SimYear = number

const DAYS_PER_WEEK = 7
const WEEKS_PER_YEAR = 52

The authoritative simulation advances in whole simulation days. Weekly systems settle after each complete seven-day market interval. A campaign year contains 52 weeks.

Daily systems include:

Development work.

Employee energy and recovery.

Research work.

Engine integration work.

Bug fixing.

Marketing execution.

Office and contract work.

Weekly systems include:

Sales settlement.

Payroll and rent accrual.

Platform and market movement.

Rival planning and production.

Fan and reputation change.

Financial runway warnings.

3.2 Standard Work Units

Use one unit across game projects, research, engine work, reports, contracts, and maintenance.

type StandardWorkUnit = number

One Standard Work Unit is the expected output of one competent, rested, properly equipped employee during one standard workweek at neutral difficulty and 100 percent task fit.

All work requirements and capacity must use this unit. Do not compare arbitrary design points to employee skill points or raw calendar weeks.

dailyContribution =
  baseWeeklyCapacity / 7
  * taskSkillFit
  * masteryModifier
  * energyModifier
  * toolModifier
  * leadershipModifier
  * interruptionModifier

Each modifier must be bounded and inspectable in Analyst or debug modes. No multiplicative factor may reduce valid contribution to zero unless the employee is unavailable, the task is unsupported, or the project is explicitly blocked.

3.3 Founder contribution

The founder has:

Skills.

Mastery.

Task fit.

One primary assignment.

A weekly work-capacity value.

The founder does not have:

Employee energy depletion.

Employee recovery cycles.

Sick leave generated by the employee-energy system.

Burnout generated by that same system.

Future leadership attention may constrain the founder, but it must be a separate system. Until that system exists, the founder contributes stable capacity while assigned.

3.4 Playback speed

type PlaybackSpeed = 0 | 1 | 2 | 3

type PlaybackConfig = {
  realMillisecondsPerSimDay: Record<Exclude<PlaybackSpeed, 0>, number>
}

Recommended initial tuning:

Pause: no simulation ticks.

1x: approximately one simulation day per real second.

2x: approximately two simulation days per real second.

3x: approximately four simulation days per real second.

The exact presentation rate is configurable. The resulting simulation state must be identical at every speed for the same seed and commands.

Opening a planning screen, release confirmation, consequential event, or stage transition pauses the simulation. Closing a non-blocking information screen does not change speed. After release, resume the last nonzero speed automatically.

4. Campaign Creation and Identity

Campaign creation must collect and persist:

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

Requirements:

Player Name and Company Name are separate fields and separate save properties.

Neither may be silently copied into the other.

Appearance is cosmetic and cannot affect simulation results.

A blank seed generates one once and persists it.

Campaign length changes timeline pacing, not fundamental rules.

Difficulty changes configured pressure, tolerance, and information. It cannot secretly change unrelated UI behavior.

Information Mode affects visibility and estimates, not results.

Pirate Mode is a separate ruleset with piracy, DRM, and company-financing consequences. It must remain disabled until its complete ruleset exists.

Every campaign with debug or cheat use persists a cheatsEnabled label permanently.

4.1 Starting state

The default campaign begins with:

The founder working alone in a garage.

One functional starter development toolkit or imported starter engine.

All six main genres available.

Four deterministic starting topics from the eligible early pool.

Small games only.

One platform choice from the active opening market set, subject to license affordability.

One active production assignment at a time.

Basic development, game history, finances, research discovery, save, and settings access.

No visible R&D Lab, Hardware Lab, AAA, MMO, custom console, publishing empire, or other distant systems.

Starting topics must be selected by the campaign seed before the campaign screen renders. Reopening campaign creation or rerendering the topic selector cannot reroll them.

5. Campaign Timeline and Era Progression

The game supports 30, 40, and 60-year campaigns. Use one authored reference timeline and scale it. Do not maintain three contradictory calendars.

type TimelineEvent = {
  id: string
  referenceWeek40Year: number
  category: "platform" | "technology" | "market" | "tutorial" | "endgame"
  revealLeadWeeks: number
  eligibility?: EligibilityRule[]
}

For non-tutorial industry events:

scaledWeek = round(referenceWeek40Year * campaignLengthYears / 40)

The opening tutorial and first-office opportunity must not become painfully slow in a 60-year campaign. Author tutorial and initial progression milestones separately, with bounded opening windows. After the opening phase, the industry timeline scales normally.

Date progression may make a system historically possible, but it does not grant the studio the capability automatically. Major progression requires both industry availability and studio eligibility.

5.1 Progression phases

Phase

Studio state

Core new decisions

Default eligibility

Garage

Founder only

Topics, genres, small games, contracts, starter research

Campaign start

Small Office

First hires

Hiring, training, team assignments, better contracts, custom engines

At least 3 released games, sustainable cash, minimum reputation, opening window reached

Established Studio

Multiple specialists

Medium games, publishing deals, stronger marketing, simultaneous support work

Office capacity used effectively, at least 8 released games, staff and financial thresholds

R&D Era

Dedicated research capability

Advanced technology, prototypes, architecture, major engine projects

Industry window, research record, suitable office, and studio capability

AAA and Post-Release Era

Large productions

AAA planning, larger teams, patches, deeper launch management

Proven large-game execution, strong finances, staffing, engine readiness

Hardware Era

Platform strategy

Hardware research, custom console planning, platform ecosystem

Late industry window, R&D maturity, extreme capital requirement

Endgame

Industry leader or survivor

Major projects, final valuation, awards, legacy decisions

Campaign timeline and studio state

Endless

Continuation

Continue without campaign victory pressure

Player chooses Continue after campaign completion

All numeric thresholds belong in data configuration. The table defines dependency shape, not hardcoded React conditions.

An office opportunity is an offer, not an automatic move. The player may remain in an older office, accepting its staffing, concurrency, and equipment limits.

6. Progressive Disclosure

The interface must be derived from unlocked capabilities.

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

Rules:

Navigation displays only capabilities with an unlocked purpose.

A newly available capability arrives through a contextual event or tutorial.

Do not show distant pages as greyed-out promises in the garage.

Locked content cannot be reached through a URL, modal, keyboard shortcut, old save path, or another screen.

A feature flag can disable unfinished content even if progression would otherwise unlock it.

A capability becomes visible only when its screen and core actions work.

7. Authoritative Project State Machine

Use one project state machine for every game. Do not infer lifecycle from which modal is open.

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

paused is not a project state. It is a campaign playback state. A project may also carry blocking reasons without changing its lifecycle state.

7.1 Allowed transitions

From

To

Required command and guard

Required side effects

Draft

Preproduction

Confirm concept; required fields valid

Freeze concept revision, create planning snapshot

Draft

Cancelled

Cancel draft

Record optional draft history; no production cost

Preproduction

Stage 1 Planning

Engine/toolkit selected; platform compatible; scope feasible or risks accepted

Create stage budgets and production plan

Preproduction

Cancelled

Cancel project

Preserve planning cost and discoveries

Stage 1 Planning

Stage 1 Active

Confirm Stage 1 allocation

Resume chosen speed and begin work

Stage 1 Active

Stage 2 Planning

Stage 1 required work complete

Persist outcomes, pause, present Stage 2 decision

Stage 2 Planning

Stage 2 Active

Confirm Stage 2 allocation

Resume and begin work

Stage 2 Active

Stage 3 Planning

Stage 2 required work complete

Persist outcomes, pause, present Stage 3 decision

Stage 3 Planning

Stage 3 Active

Confirm Stage 3 allocation

Resume and begin work

Stage 3 Active

Polish

Stage 3 required work complete

Stop feature expansion by default; expose bugs and incomplete work

Polish

Pre-Release

Player chooses Finalize Build

Create immutable candidate-build snapshot

Pre-Release

Polish

Continue Development

Reopen only permitted polish, optimization, and bug work; invalidate candidate build

Pre-Release

Released

Confirm Release; release checklist passes

Atomic release transaction

Pre-Release

Cancelled

Confirm Cancel Project

Preserve costs, learning, history, and unreleased status

Released

Dormant

Sales remain negligible; no active support or marketing

Keep listing and history; reduce update frequency

Dormant

Released

Demand, update, discount, platform event, or renewed marketing restores meaningful activity

Resume active weekly settlement

Released/Dormant

Delisted

Player delists, all supported platforms become unavailable, or contract forces removal

Stop future new sales; preserve all history

Released/Dormant/Delisted

Archived

No active work or unresolved accounting

Historical read-only record

Invalid transitions must return a typed failure and must not partially mutate state.

7.2 Cancellation semantics

The player-facing action may say Delete Game while the project is unreleased, but the domain command is cancelProject.

Cancellation preserves:

Elapsed calendar time.

All money already spent.

Employee and founder mastery legitimately earned.

Studio knowledge and research findings.

Engine work already completed.

Recorded bugs, lessons, and production history.

A cancelled-project entry in company history.

Cancellation removes:

The possibility of release from that project instance.

Future sales, reviews, fans, and market presence for that project.

Unspent reserved budget.

It does not erase campaign, company, employees, engines, technology, platform history, or prior games.

8. Game Concept and Preproduction

The project-creation flow must collect only currently meaningful choices.

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

8.1 Naming

A generated working title is visibly labeled Working Title.

The player may replace it at any time before candidate-build finalization.

The project does not lose quality merely because a temporary title exists during production.

Release is blocked until titleConfirmed === true and the final title is nonblank.

Duplicate titles require explicit confirmation and may create market-confusion consequences only if that system exists.

8.2 Genres and topics

Action, Adventure, RPG, Simulation, Strategy, and Casual are available immediately.

Starting with only two main genres is incorrect.

Multi-Genre is a later research capability.

Subgenres and advanced genre structures may unlock through research and studio knowledge.

The four starting topics are discovered, not the only topics that exist.

Additional topics become discoverable and researchable through configured sources.

Hidden future topics cannot appear in selectors, search, reports, or debug-free APIs.

8.3 Compatibility analysis

Before production confirmation, validate:

Engine capabilities.

Platform support.

Feature dependencies.

Performance budget.

Team mastery.

Scope pressure.

Estimated work range.

Known technical debt exposure.

If a required capability is missing, offer only real resolutions:

Upgrade the engine before starting.

Integrate technology before starting.

Reduce scope.

Remove or replace the feature.

Change platform.

Change engine.

Cancel planning.

Starting with a known unsupported feature requires an explicit rule and risk path. It cannot be accepted through a generic warning that has no calculation.

9. Scope, Capacity, and Required Work

Every selected feature declares its work in Standard Work Units by discipline and development stage.

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

totalRequiredWork =
  baseWorkByGameSize
  + selectedFeatureWork
  + platformBuildWork
  + engineIntegrationWorkAssignedToProject
  + noveltyOverhead
  + coordinationOverhead
  + technicalDebtInteractionWork

Feature count never directly increases quality. Features create work, identity, capabilities, risk, and possible value. Their quality depends on completion, integration, coherence, mastery, and execution.

9.1 Scope pressure

scopePressure = estimatedRequiredWork / estimatedAvailableCapacity

Use ranges before production because experimental technology, weak mastery, and poor documentation create uncertainty.

Scope pressure may create:

Delay.

Overtime decisions.

Bugs.

Cut features.

Incomplete features.

Reduced polish.

Increased cost.

It does not apply an unexplained review penalty.

9.2 Starting-game duration target

Under standard difficulty, a founder-only small game using the starter toolkit should generally require 28 to 42 simulation weeks from confirmed production to candidate build, depending on scope, skill fit, bugs, and choices.

Under normal non-cheat conditions, the first game should not complete in approximately 14 weeks and no development stage should regularly finish in roughly two weeks.

This is a tuning target, not a cosmetic clamp. Reach it through honest work requirements and capacity. Later mastery and better tools may shorten comparable work, while larger scope expands it.

10. Three-Stage Development

The established stages remain:

Stage 1

Engine.

Gameplay.

Story and Quests.

Stage 2

Dialogue.

Level Design.

Artificial Intelligence.

Stage 3

World Design.

Graphics.

Sound.

At each planning transition, the player distributes 100 focus points among the three stage disciplines.

type StageAllocation = {
  projectId: string
  stage: 1 | 2 | 3
  allocations: Record<string, number>
  total: 100
}

The allocation sets production priority and staff attention. It is not a direct score entry. A high allocation cannot create quality if the selected engine, features, employees, or time cannot support the work.

Each game concept generates demand weights for the nine disciplines based on:

Topic.

Primary and secondary genre.

Audience.

Pillars.

Supporting features.

Platforms.

Engine requirements.

Prior studio knowledge.

The player sees qualitative or estimated consequences according to Information Mode. The exact hidden target is never shown in Standard mode.

10.1 Stage completion

A stage completes only when its required work threshold is satisfied or when the player accepts a deliberate incomplete-stage consequence offered by the system.

On completion:

Persist every contribution and generated outcome.

Stop daily work on that stage.

Pause campaign playback.

Enter the next planning state.

Present completed work, unresolved risks, new bugs, staff state, and the next decision.

React animations may interpolate visible progress but cannot write progress.

10.2 Visible weekly development

During an active stage, the player must be able to observe:

Current simulation week.

Required work and broad completion estimate.

Discipline progress.

Staff contributions.

Known bugs.

Energy for hired employees only.

Scope or compatibility warnings.

Feature completion and risk.

Design and technology output where still used.

Progress must update in understandable increments. Do not hide two weeks of work behind a single instant animation.

11. Founder and Employee Work Rules

11.1 Founder

The founder:

Exists in founderState, not as a normal employeeState record with a special label.

Contributes to projects, research, reports, contracts, or engines when assigned.

Has skills and mastery.

Can be reassigned with normal switching costs where applicable.

Cannot work on multiple primary assignments simultaneously.

Does not consume or regenerate employee energy.

11.2 Hired employees

Hired employees may have:

Energy.

Fatigue.

Recovery.

Morale.

Burnout risk.

Salary.

Training.

Specialization.

Task assignment.

Employee contribution must fall as energy falls. Recovery consumes calendar opportunity. The founder exclusion must be enforced in the domain calculation, not hidden in the UI.

11.3 Concurrency

Garage:

One primary studio project at a time.

Released-game sales and market simulation continue in the background.

The founder may perform a Game Report instead of new development, not simultaneously.

Later offices:

Concurrency comes from office capacity, team structure, leadership, and equipment.

Supporting a released game consumes a real assignment slot or staff capacity.

No studio receives unlimited simultaneous projects because multiple screens exist.

12. Bugs, Polish, and Candidate Builds

Bugs are persistent production entities.

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

The build may contain undiscovered bugs. The player only sees known bugs unless the selected Information Mode or cheat setting says otherwise.

12.1 Polish state

After Stage 3:

Normal feature expansion stops by default.

Employees continue testing, fixing bugs, optimizing builds, and completing permitted incomplete work.

The player decides how long to continue.

Each additional week costs money and delays launch.

Delaying may improve the build but can create market-window or financial consequences.

Finalize Build creates a candidate-build snapshot. It does not release the game.

12.2 Candidate build

The candidate build freezes:

Engine version.

Feature versions and completion.

Platform-build state.

Known and unknown bugs.

Performance state.

Production quality inputs.

Project costs to date.

Returning to Polish invalidates the candidate build and requires a new snapshot before release.

13. Pre-Release State

Pre-Release must present a functional checklist:

Final title confirmed.

Launch platforms confirmed.

Platform build status.

Known bug count and severity.

Performance warnings.

Feature completion warnings.

Launch price.

Publisher requirements where applicable.

Release action.

Continue Development action.

Cancel Project action.

The player may:

Release the candidate build.

Return to Polish and spend more time fixing it.

Cancel the unreleased project.

The player may not:

Receive sales while deciding.

Receive reviews while deciding.

Change the engine version silently.

Ignore a blank or unconfirmed final title.

Leave a release modal in a state where calendar time advances behind it.

14. Atomic Release Transaction

Release must be one domain transaction.

releaseGame({
  projectId,
  candidateBuildId,
  confirmedFinalTitle,
  launchPrice,
  commandId
})

Validate before mutation:

Project is in Pre-Release.

Candidate build still exists and is current.

Final title is confirmed.

Price is valid for the selected platforms and ruleset.

Required publisher conditions are either satisfied or explicitly breached.

No previous release transaction exists for the command or project.

On success, atomically:

Create the immutable released-game record.

Lock the exact engine and platform-build versions.

Persist launch price as the first price-history record.

Set releasedAtDay.

Create market listings.

Schedule deterministic review processing.

Schedule the first sales settlement for seven days after release.

Move the project to Released.

Create ledger entries for launch costs.

Restore the last nonzero playback speed.

On failure, none of these side effects may remain.

Repeated clicks, network retries, or restored UI state must be idempotent through commandId and the project release record.

15. Review Order and Review Ownership

Reviews are created only after release succeeds.

The first implementation may reveal reviews immediately after the Release transaction. This is acceptable because the user did not object to immediate reviews. The architecture must still support a short deterministic review delay later.

Review quality may use:

Production execution.

Genre/topic/audience fit.

Pillar fulfillment.

Feature outcomes.

Coherence.

Performance.

Platform-build quality.

Known and unknown launch bugs.

Engine reliability.

Team execution.

Studio expectations and historical baseline.

Legitimate deterministic reviewer variance.

Review quality may not use:

Marketing spend as a quality bonus.

Sales that have not occurred.

UI navigation.

Random values generated at render time.

The launch price as a direct quality score.

Price may influence a separate value-for-money sentiment factor if the review model explicitly supports it. It cannot rewrite production quality.

Each review explanation must trace to actual results. Do not double-count the same factor inside feature effectiveness, aggregate coherence, and final quality without an explicit normalization layer.

16. Weekly Sales and Market Life

Sales begin after release and settle over completed market intervals.

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

16.1 Required sequence

Release Confirmed
→ Review Processing
→ Market Time Advances
→ Seven Full Days Complete
→ First Sales Interval Settles
→ First-Week Sales Become Visible

No lifetime units, first-week units, sales revenue, or sales chart points may be prepopulated from future intervals.

16.2 Demand model

Use a separated demand calculation:

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

Apply bounded functions and normalization. No single nonzero factor should accidentally erase the entire market unless the product is truly unavailable.

Marketing changes awareness. Reviews and player sentiment change conversion and word of mouth. Platform state changes addressable audience. Price changes elasticity. These layers must remain separate for reports and debugging.

16.3 Pricing

The player chooses launch price in Pre-Release.

Price must be validated against configurable platform and market norms.

A weak, overpriced game should convert poorly.

A strong game may sustain a higher price.

A lower price may improve unit demand while reducing revenue per unit.

The first manual price change is allowed after 28 full days on sale.

After any price change, enforce a default 28-day cooldown.

Price history is immutable.

A change applies from its effective day forward.

Prior intervals are never recalculated.

Repeated price toggling cannot refresh launch awareness or reroll demand.

16.4 Long-tail sales

Do not force a game Off Market after 14 weeks.

A released game may move to Dormant when sales are negligible, but its listing remains. Dormant games use lower-frequency simulation optimization while preserving exact accounting. A discount, platform event, update, marketing action, or trend change may make a dormant game active again.

A game becomes Delisted only when:

The player deliberately delists it.

Every supported platform becomes commercially unavailable under configured rules.

A publisher contract or legal event requires removal.

A specific game system creates a legitimate removal decision.

Age reduces demand but does not erase the historical record or impose an arbitrary end date.

17. Post-Release Decisions

The initial playable slice must support:

Weekly sales.

Price changes after eligibility.

Game Reports.

Delisting.

Basic patches for launch bugs.

Patch work must:

Consume staff or founder capacity.

Consume time and money.

Target specific bugs or performance problems.

Create a new released build version.

Affect future sentiment, refunds, and sales.

Never rewrite original reviews or past sales.

Advanced updates, DLC, expansions, live-service systems, and MMOs remain deferred until their own specifications exist.

18. Game Reports and Knowledge

A Game Report is a real studio assignment, not an instant button reward.

Eligibility:

The game has been released.

At least one full sales interval exists.

The studio has a founder or employee available to perform the analysis.

The report consumes Standard Work Units. Garage founders must choose between analyzing the last game and immediately starting the next primary assignment.

Reports evaluate stored production and market snapshots. They may discover:

Topic and genre compatibility.

Audience fit.

Stage allocation strengths and weaknesses.

Pillar fulfillment.

Feature overload.

Engine limitations.

Technology mastery problems.

Platform-performance problems.

Bug sources.

Price effects.

Competition effects.

Marketing awareness.

Word-of-mouth behavior.

A finding must be based on a real factor with sufficient evidence. If evidence is weak, return an inconclusive finding rather than invented slider advice.

Completed findings become persistent studio knowledge. Repeating the same report may improve confidence only when new evidence exists. It cannot be farmed for unlimited research or mastery.

19. Contracts and Publishing in the Campaign Spine

The detailed economy specification may expand these systems later, but the campaign state machine must reserve their real place now.

19.1 Contract work

Contracts are early-game survival projects with:

Required work by discipline.

Deadline.

Payment.

Partial or failure rules.

Skill and mastery gains.

Opportunity cost.

type ContractState =
  | "offered"
  | "accepted"
  | "active"
  | "completed"
  | "failed"
  | "declined"
  | "expired"

In the garage, an active contract occupies the founder's primary assignment and blocks active game development. Contract results must be deterministic and use the same work-unit model.

19.2 Publishing deals

Publishing deals may specify:

Topic, genre, audience, size, platform, or release window.

Advance payment.

Marketing support.

Royalty split.

Minimum quality or review expectation.

Deadline.

Penalties.

Rights or sequel restrictions.

The deal must attach to the project before production confirmation. Release validation checks its requirements. Breaching a deal creates actual financial, reputation, or relationship consequences.

Do not build a full negotiation simulator in the first slice. Do not omit the data relationship and project-state guard.

20. Research and Engine Connection

The project spine uses the deeper Research and Engine systems under these rules:

Discovery makes a technology visible when eligible.

Research creates knowledge and maturity.

Research alone does not modify an engine.

Integration is a separate work project.

Successful integration creates a new engine version.

A game selects one exact eligible engine version in Preproduction.

The selected version remains fixed throughout production unless the player performs an explicit supported migration.

Active projects cannot migrate silently.

Released games retain their exact engine and platform-build versions forever.

Research, integration, and maintenance use Standard Work Units and the same calendar.

The starter toolkit or imported engine must support the baseline features necessary for a first game. It should have clear limits that later make custom-engine work attractive.

Main genres are not Research purchases. Research may unlock:

Multi-Genre.

Subgenres.

Advanced genre mechanics.

New topics.

Audience targeting.

New game sizes.

Marketing methods.

Engine technologies.

Studio capabilities.

21. Offices, Capacity, and Studio Progression

An office is a capability and capacity container.

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

The Upgrade Office action must show:

Cost.

New weekly overhead.

Employee capacity.

Project capacity.

New capabilities.

Eligibility failures.

Cash remaining and runway estimate.

Moving office preserves the full campaign and creates ledger entries. It does not silently grant employees, research, engine mastery, or production quality.

Office eligibility comes from campaign timing plus studio accomplishments. Date alone is insufficient. Cash alone is insufficient.

22. Economy and Ledger

All money movement writes an immutable ledger entry.

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

Current Cash equals the sum of starting capital and ledger entries. Lifetime Revenue includes qualifying gross revenue and remains distinct from current Cash. Profit by game uses attributable revenue and cost records.

The Finances screen is a projection of the ledger. It cannot maintain its own totals.

23. Insolvency, Bankruptcy, and Recovery

Campaign failure requires a state machine, not an unexpected game-over modal.

type CampaignFinancialState =
  | "solvent"
  | "warning"
  | "insolvent"
  | "recovery"
  | "bankrupt"

23.1 Warning

Enter Warning when projected runway falls below a configured number of weeks. Show the actual causes:

Payroll.

Rent.

Active project burn.

Debt service.

Weak sales.

Upcoming contract obligations.

23.2 Insolvency

Enter Insolvent when cash breaches the configured credit floor or mandatory obligations cannot be paid.

Pause the campaign and offer only eligible recovery actions, such as:

Accept available contract work.

Cancel or reduce active project scope.

Delay optional research or engine work.

Move to a cheaper valid office when allowed.

Take an available difficulty/ruleset-specific bailout or loan.

Sell company shares only when the complete applicable financing or Pirate Mode system exists.

Recovery choices create lasting costs. They are not free resets.

23.3 Bankruptcy

Bankruptcy occurs when no valid recovery action remains or a recovery deadline expires.

On bankruptcy:

Preserve the final save and company history.

Show the actual financial causes.

Allow restart from a deliberate checkpoint only if the campaign rules support it.

Allow a new campaign.

Do not silently erase or overwrite the failed campaign.

24. Rivals and Market Events

The market may continue using persistent rivals, but it must not delay the first playable studio loop.

Every rival headline, announcement, and release must refer to persistent state:

type RivalProject = {
  id: string
  studioId: string
  conceptSeed: string
  state: "planning" | "production" | "announced" | "released" | "cancelled"
  announcedDay?: SimDay
  plannedReleaseWindow?: [SimDay, SimDay]
  releasedGameId?: string
}

Rivals may influence competition, trends, platform momentum, and public knowledge. They cannot access the player's hidden plans. Their UI labels must reflect their actual persistent state.

The initial vertical slice may use a limited abstract rival model, provided that:

It uses time, money, capability, and project constraints.

It cannot use future technology.

Its announcements and releases remain linked.

It is deterministic.

It cannot reroll when the Market screen opens.

25. Campaign Completion and Endless Mode

At the configured final campaign week, do not abruptly stop active projects.

Enter campaign_completion_pending and:

Allow the current simulation day to settle.

Freeze new era progression.

Present campaign results based on stored history.

Calculate valuation, profitability, reputation, fans, awards, technology leadership, game legacy, survival, and other configured score categories.

Preserve every released and cancelled game.

Offer End Campaign or Continue in Endless Mode.

Endless Mode:

Removes the fixed victory deadline.

Preserves all systems and history.

Continues deterministic market simulation.

Retains the original campaign-length label and completion score.

Does not retroactively change the completed campaign result.

Full awards, achievements, and late-game legacy presentation may be implemented later, but completion and continuation state must be reserved now.

26. Save, Load, and Determinism

Persist at minimum:

Campaign setup and rules.

Campaign day, last nonzero speed, and playback state.

Founder state.

Employee state.

Office state.

Capabilities and feature flags.

Project state and stage progress.

Work contributions.

Stage allocations.

Bugs.

Candidate builds.

Released games and build versions.

Reviews.

Sales intervals.

Price history.

Reports and knowledge.

Research and technology state.

Engines and integrations.

Platforms and market state.

Rivals and rival projects.

Contracts and publishing deals.

Ledger entries.

Financial warnings and recovery state.

Processed command IDs.

Deterministic event keys.

Cheats-enabled state.

Use event-specific keys:

seededValue(
  campaignSeed,
  systemId,
  entityId,
  occurrenceId,
  simulationDay,
  decisionType
)

occurrenceId is required. Entity, week, and decision type alone may collide when the same entity makes two similar decisions during one week.

Requirements:

Saving and loading cannot reroll reviews, bugs, research setbacks, integration failures, sales, rival events, or applicants.

UI render order cannot affect simulation.

Batched catch-up simulation must produce the same result as day-by-day simulation.

Command handling must be idempotent.

Save migrations are versioned and tested.

27. Current-Save Migration

Migrate current campaigns without retroactively rewriting history.

27.1 Campaign identity

Preserve Company Name.

If Player Name is missing, prompt once on load before continuing and persist it separately.

Preserve seed, difficulty, money, time, and company history.

27.2 Founder

Convert the current player character into founderState.

Preserve skills, mastery, and legitimate progress.

Remove founder employee-energy state.

Do not convert missing energy into a bonus.

27.3 Projects and games

Map active projects to the nearest valid project state.

Preserve completed development work.

Do not auto-release a project during migration.

A completed but unreleased project enters Pre-Release with a generated candidate build.

Preserve released reviews and sales exactly.

Do not remove games that were forced Off Market by the old 14-week rule; preserve historical status and provide a migration flag for optional relisting only if platform state permits it.

27.4 Engines and research

Preserve Research availability.

Preserve owned technology.

Convert current engines into imported immutable versions.

Preserve released-game engine references.

Do not silently install researched technology.

27.5 Finances

Preserve current cash.

Import existing totals as audited opening ledger balances when detailed historical entries do not exist.

Do not fabricate transaction-level history.

Every migration must be repeat-safe and produce a migration report in debug logs.

28. System Ownership and Separation

Authoritative calculations belong to domain services or pure simulation modules.

Concern

Authoritative owner

UI responsibility

Calendar and playback

SimulationClock

Display time and issue speed commands

Project transitions

ProjectLifecycleService

Show allowed actions and transition failures

Required work

ProductionPlanningService

Show estimates and risk labels

Daily contributions

WorkSimulationService

Animate persisted progress

Founder rules

FounderService

Display assignment and skill state

Employee energy

EmployeeSimulationService

Display employee-only energy

Bugs

QualitySimulationService

Show discovered bugs and fix commands

Candidate build

BuildFinalizationService

Show checklist

Release

ReleaseService

Collect confirmation and price

Reviews

ReviewSimulationService

Reveal stored reviews

Sales

SalesSimulationService

Chart settled intervals

Pricing

PricingService

Validate and submit price changes

Reports

KnowledgeReportService

Present stored findings

Research

ResearchService

Show visibility and progress

Engines

EngineService

Show versions and compatibility

Market/platforms

MarketSimulationService

Present known state

Rivals

RivalSimulationService

Present public rival state

Finance

LedgerService

Aggregate and chart ledger projections

Unlocks

ProgressionService

Render unlocked navigation only

Save/load

PersistenceService

Request save/load and display status

React components must use read-only view models and dispatch commands. A selector may calculate display formatting or aggregate persisted values. It may not advance time, roll randomness, create sales, determine reviews, change cash, drain energy, or transition projects.

29. Steam-Parity Classification

Do not treat every original mechanic as sacred, and do not accidentally omit the genre's essential progression.

29.1 Required foundational parity

Garage-to-studio progression.

Game concept selection.

Main genres and discoverable topics.

Three development stages.

Research and custom engines.

Hiring, training, and staff specialization.

Contracts as early financial support.

Publishing deals.

Marketing and hype.

Sequels and game history.

Game Reports and learned knowledge.

Multi-platform development.

Offices and later labs.

Financial failure pressure.

Campaign completion.

29.2 Intentional redesigns

Separate founder model with no employee energy.

Persistent technology discovery and maturity.

Explicit engine integration and immutable versions.

Capability-based features and project pillars.

Platform-specific builds and performance budgets.

Technical debt and maintenance.

Persistent rivals and market state.

Explicit Pre-Release state.

Release or Cancel decision.

Manual launch pricing and controlled post-launch price changes.

Long-tail sales instead of a short fixed market life.

Basic post-launch patches.

Deterministic event ownership and deeper reports.

29.3 Deferred but reserved

Full employee culture and leadership depth.

Full publisher negotiation.

Advanced press and convention systems.

Franchises, remakes, expansions, and franchise fatigue.

R&D Lab projects beyond the initial technology slice.

Hardware Lab.

Custom consoles.

AAA production depth.

MMO and live-service architecture.

Engine licensing.

Mod marketplaces.

Patent, espionage, acquisition, and vendor-negotiation systems.

Full Pirate Mode.

Full awards and achievement system.

Deferred systems must remain hidden behind configuration. Their required identifiers and state relationships may be reserved, but fake buttons and empty screens must not ship.

30. First True Vertical Slice

Implement this sequence before expanding the deeper employee or technology documents.

Slice A: Campaign and first game

Create a campaign with Player Name and Company Name.

Persist 30, 40, or 60-year mode, seed, difficulty, and Information Mode.

Start in the garage with six main genres and four deterministic topics.

Create a small single-platform game using the starter toolkit.

Use a visible working title but require final naming before release.

Complete compatibility analysis.

Confirm Stage 1 allocation.

Advance meaningful daily work for a multi-week stage.

Pause at Stage 2 planning.

Repeat for Stage 2 and Stage 3.

Enter Polish and fix known bugs over real time.

Enter Pre-Release.

Set launch price.

Release or Cancel.

On release, resume time automatically.

Reveal deterministic reviews after release.

Settle first-week sales only after seven days.

Continue weekly sales beyond 14 weeks when demand remains.

Create a Game Report using a real assignment.

Gain persistent knowledge and mastery.

Slice B: Second game and meaningful learning

Use learned knowledge to create a different second game.

Research one new topic, audience capability, or feature.

If technology is involved, require explicit engine integration before selection.

Use a different price or scope strategy.

Confirm that prior released game sales continue in the background.

Allow the first game's price to change only after 28 days.

Confirm the second game's results explain actual differences.

Slice C: Third game and studio pressure

Introduce a real financial or capacity tradeoff.

Offer a contract, office move, hire, or engine investment based on eligibility.

Create and release a third game.

Save during development, Pre-Release, and active sales.

Reload each save and produce identical results.

Verify the campaign now supports a repeatable, non-identical loop.

Only after all three slices work should implementation expand into the full Employee, Team, Leadership, and Studio Culture specification.

31. Acceptance Tests

Campaign and identity

Player Name and Company Name persist separately.

Founder appearance does not change calculations.

The same seed produces the same four starting topics.

Rerendering or reopening setup does not reroll topics.

Campaign length accepts only 30, 40, or 60 years.

Information Mode changes visibility but not results.

Distant capabilities are absent from garage navigation.

Disabled feature-flag systems cannot be accessed through direct routes.

Game creation

All six main genres are available from campaign start.

Multi-Genre remains unavailable until researched.

A working title is clearly temporary.

Release is blocked until the final title is confirmed.

A blank title cannot release.

Platform and engine incompatibility produce a real blocked state or explicit resolution.

Unsupported features cannot be selected silently.

Development and timing

Required work uses Standard Work Units.

Daily contribution is independent of UI frame rate.

The default founder-only first game generally requires 28 to 42 weeks.

A default first-game stage does not normally complete in roughly two weeks.

Stage 1 completion pauses at Stage 2 Planning.

Stage 2 completion pauses at Stage 3 Planning.

Stage 3 completion enters Polish, not Released.

Each stage allocation totals 100.

Game speed changes wall-clock rate but not required work.

Identical commands at 1x and 3x produce identical project results.

React rerenders cannot add progress.

Founder and employees

Founder energy does not deplete.

Founder energy does not regenerate because it does not exist.

Founder contribution still uses skills and mastery.

Founder cannot hold two primary assignments.

Hired-employee energy still depletes and recovers.

Employee departure does not remove studio knowledge.

Bugs and Pre-Release

Bugs persist across save and reload.

Known and unknown bugs remain distinct.

Bug fixing consumes work and calendar time.

Finalize Build creates a candidate build but no market listing.

Returning to Polish invalidates the old candidate build.

Pre-Release shows known bugs and valid actions.

Releasing with bugs preserves them in the release build.

Canceling the project creates no reviews or sales.

Canceling preserves spent cost, mastery, research, and history.

Release, reviews, and sales

Release is atomic and idempotent.

Repeated Release clicks create one released game.

A game cannot receive a review before release.

A game cannot receive sales before release.

Release resumes the prior nonzero playback speed.

Reviews do not use marketing as a quality bonus.

First-week sales remain absent before seven full days.

First-week sales appear after the first complete interval.

Sales intervals never overlap or duplicate.

Lifetime units equal the sum of settled intervals.

Current cash changes through ledger entries only.

A game is not forced Off Market after 14 weeks.

Dormant games preserve listings and history.

Pricing and post-release

Launch price persists in immutable history.

Price cannot change during the first 28 days.

A valid later price change affects only future intervals.

Prior sales remain unchanged after a price change.

Price-change cooldown prevents rapid toggling.

A price change cannot reroll reviews.

A patch consumes real capacity and creates a new released build version.

A patch does not rewrite launch reviews or prior sales.

Reports and knowledge

A Game Report requires at least one sales interval.

A Game Report consumes a real assignment.

Report findings correspond to stored production or market factors.

Insufficient evidence creates an inconclusive finding.

Repeating a report cannot farm unlimited knowledge.

Learned knowledge survives save and load.

Engines, offices, and progression

Research does not change an engine.

Integration creates a new engine version.

Active projects do not migrate engine versions silently.

Released games retain exact engine versions.

Date alone does not unlock a major studio phase.

Accomplishments alone do not unlock historically unavailable technology.

Office movement validates cost and eligibility.

Office movement preserves campaign state.

Office capability comes from office data, not a UI button.

Finance and failure

Ledger aggregation equals displayed current cash.

Lifetime Revenue remains separate from cash.

Financial warning identifies actual cost drivers.

Insolvency pauses for valid recovery decisions.

Recovery creates lasting cost or constraint.

Bankruptcy preserves the failed campaign history.

Determinism and migration

Save and load cannot reroll starting topics.

Save and load cannot reroll bugs.

Save and load cannot reroll reviews.

Save and load cannot reroll sales.

Save and load cannot reroll rival announcements.

Day-by-day and batched catch-up simulation match.

Duplicate commands are idempotent.

Founder migration preserves skills and removes employee energy.

Completed unreleased projects migrate to Pre-Release, not Released.

Existing released reviews and sales remain unchanged.

Existing engines migrate without disappearing.

Existing Research remains available.

Three-game behavioral proof

The first game completes the full loop without developer intervention.

The second game can use knowledge gained from the first.

The first game continues sales while the second is developed.

The third game introduces a meaningful financial, staffing, engine, or office tradeoff.

Three identical-seed campaigns with identical commands produce identical histories.

A different valid strategy can produce a different but understandable outcome.

The player can continue after the third game without entering a dead or empty state.

32. Balance Harness for the First Three Games

Create a headless scenario:

simulateOpeningCampaign({
  campaignSeed,
  campaignLengthYears,
  difficulty,
  informationMode,
  strategyPolicy,
  releasedGameTarget: 3
})

Test at least these policies:

Focused genre specialist.

Feature maximizer.

Minimal polish.

Heavy polish.

High launch price.

Low launch price.

Research-first.

Cash-conservative contract worker.

Early engine investment.

Cancel a troubled second game.

Measure:

Development weeks per game.

Stage duration.

Bugs at candidate build and release.

Review distribution.

First-week and 12-week sales.

Long-tail activity.

Cash runway.

Profit.

Fans.

Knowledge gained.

Mastery gained.

Idle time.

Bankruptcy rate.

Number and cause of blocked decisions.

No policy should dominate every seed and difficulty. The harness must prove that a focused small game can outperform a bloated game, new technology is not always optimal, polish has opportunity cost, and pricing changes revenue through demand rather than score manipulation.

33. Implementation Order

Implement in this order:

Inventory current state ownership and document every existing mutation path.

Add canonical time, Standard Work Units, and deterministic command processing.

Separate founder state from employee state.

Add campaign identity and migration.

Implement the project state machine and typed transitions.

Move development progress into authoritative daily simulation.

Normalize Stage 1, 2, and 3 planning and completion.

Implement Polish, candidate builds, and Pre-Release.

Implement atomic Release and Cancel.

Correct review order.

Correct weekly sales order and long-tail lifecycle.

Add launch price and post-launch price history.

Add Game Report work and persistent knowledge.

Connect ledger-backed finances and recovery states.

Connect progression gates and capability-based navigation.

Migrate current saves.

Run the first-three-games harness across seed samples.

Only then expand employee, culture, marketing, publishing, and late-game depth.

Do not patch each issue only in the current React screen. When current logic is embedded in a component, extract it into the correct domain owner and leave the component consuming a view model.

34. Required Delivery Report from Grok

After implementing this pass, report:

Files changed.

State machines added or changed.

Authoritative owner of every project transition.

Time and work-unit implementation.

Founder and employee separation.

Release transaction behavior.

Review and sales ordering.

Pricing behavior.

Game Report behavior.

Progression and office gates connected.

Ledger and insolvency behavior connected.

Save migrations added.

Feature flags added.

Tests added and their results.

Balance-harness results for all opening strategies.

Any React components that still contain gameplay calculations.

Any non-deterministic calls that remain.

Any empty or fake UI action still exposed.

Any contradiction that prevents compliance.

Any deferred system whose data contract must change later.

Do not report only that the UI changed. Demonstrate the complete state transitions for one released game, one cancelled game, one price change, one report, and one save/reload run.

35. Completion Definition

This document is implemented only when the following loop is playable without developer intervention:

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

Do not continue into full culture simulation, hardware manufacturing, engine licensing, MMOs, live-service infrastructure, or final UI production until this loop is stable, deterministic, and demonstrably fun across the first three games.