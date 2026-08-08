# Studio Empire — Offices, Labs, AAA & Campus (Part 3)

**Status:** Design authority (player-facing rules).  
**Source:** Del — *Lifecycle-Driven Gameplay Flow · Part 3: Offices, Labs, AAA, and the Expanded Campus* (2026-08).  
**Build policy:** Capacity containers only — never free staff/research/engines. Labs and AAA stay dark until their checkpoints and proofs. Vertical scene = one full-size character.

Related:

- [PLATFORM_LIFECYCLE_FLOW.md](./PLATFORM_LIFECYCLE_FLOW.md) (Part 1)
- [COMPANY_SYSTEMS_FLOW.md](./COMPANY_SYSTEMS_FLOW.md) (Part 2)
- Full Campaign Progression Bible §2–§8, §36.2–36.7, Checkpoints 1–7
- Data: `src/lib/game/progression/offices.ts` (seats + transition gates already aligned)
- Flags: `officeFoundation` … `campusDirectors`

---

## Office progression rule

An office is a **capability-and-capacity container**, not a background swap.

It controls: HQ seats, roles, project sizes, concurrent activities, training level, research categories, fixed costs, management complexity, remote capacity, R&D/Hardware availability, AAA, live services, executive positions.

**Moving does not grant free employees, specialists, research, engines, quality, lab staff, or directors.** It creates capacity the player must fill and manage.

### Office transition lifecycle

Hidden → approaching requirements → foreshadowed → requirements visible → eligible → offer → review cost/ops → accept / decline / delay → timed transition → funds committed → complete atomically → archive old office → intro sequence for new.

- Decline does **not** delete the offer.  
- Player may stay forever under old limits.  
- Never force a move during active release, contract settlement, bankruptcy warning, or other unsafe states.

### Vertical office rule

**One full-size character** in the primary vertical scene (founder, selected employee, project lead, new hire welcome, or director report).

Everyone else remains full sim entities via roster, assignments, availability, activity, training, morale, energy, contribution, messages, reports, remote destinations.

Never simulate fewer people because they are off-screen.

---

## Ladder overview (total HQ seats)

| Tier | Name | HQ seats | Production hires (max) | Remote labs | Baseline staff RP/week (full, hired only) |
|------|------|----------|------------------------|-------------|------------------------------------------|
| 1 | Garage | **1** (founder) | 0 | — | 0 |
| 2 | First Office | **4** | 3 | — | ~3 (1 each × 3) |
| 3 | Upgraded Office | **5** | 4 | — | ~8 (2 each × 4) |
| 4 | Technology Park | **6** | 5 | 2 R&D + 2 HW *after construction* | ~20 (4 each × 5) |
| 5 | Expanded Campus | **8** | 5 + **R&D Dir** + **HW Dir** (role-locked) | 4 R&D + 4 HW *with directors* | Production group stays 6 total people (founder+5) |

Code already encodes seats/costs in `OFFICE_DEFINITIONS` / `TRANSITIONS`.

---

## Garage (Tier 1)

**Capacity:** 1 founder; no hires; no remote; one primary assignment.

**Available:** Small games, basic contracts, topic research, Game Reports, basic engines, basic licensing, founder self-study, early marketing when appropriate.

**Unavailable:** Hiring, payroll, employee training, Medium team projects, Large/AAA, labs, live services, directors.

**Purpose:** Teach full foundational loop (topic→genre→platform→engine→plan→dev→polish→release→reviews→sales/fans→report→next). Ends when company proves it can survive beyond one lucky hit.

---

## First Office (Tier 2) — Checkpoint 1 offer / Checkpoint 2 systems

### Eligibility (config-driven; company proof, not date alone)

| Gate | Initial tuning |
|------|----------------|
| Releases | ≥ 5 |
| Fans | ≥ 1,000 |
| Profit | ≥ 1 profitable title |
| Cash flow | Positive trailing OCF |
| Liquid cash | ~$1,000,000 |
| Move cost | ~$150,000 available |
| Insolvency | None unresolved |
| Earliest | ~ Campaign Year 3 |

(Implemented in CP1 offer machine.)

### Offer surfaces

4 HQ seats; founder + 3 hires; payroll; hiring cost; higher overhead; basic training; energy/morale; Medium path; move cost; runway estimate. Accept or delay.

### Capacity & systems introduced

Candidate search, hiring, payroll, records, Welcome/books/practice, assignments, energy/fatigue/morale/vacation/burnout, cohesion, Medium research, basic Medium publishing, general staff RP, improved contracts, basic marketing.

### Gameplay purpose

Solo designer → **manager**: who to hire, salaries, discipline assignment, train vs produce, rest, expansion pace, fixed-cost survival. New hires below full effectiveness until onboarded.

### Staff RP

~1 RP per fully active hired production employee per week; max ~3. Founder RP separate by activity. Vacation / full training / leave / deep onboarding → not full weekly RP.

---

## Upgraded Office (Tier 3) — Checkpoint 3

### Eligibility (initial)

- All 4 HQ seats filled  
- ≥ 4 releases **since** First Office move  
- Cohesion ~≥ 70%  
- Management Fundamentals complete  
- ≥ 52 weeks tenure in First Office  
- ~$5M liquid; ~$500k upgrade  
- No insolvency / unpaid payroll crisis  

Same recognizable office after internal upgrade — **not** a new city location.

### Capacity

5 HQ (founder + 4 production). No permanent labs. 1 main project + **one auxiliary** when staff separately assigned (engine, research, training, report, port, patch, contract, prototype). Opening an auxiliary **screen does not create free labor**.

### Systems introduced

5th seat, Training Center, formal courses, mentorship, career plans, cross/retrain, team leads, leadership, discipline specialism, sequels/franchise, multi-genre, Medium self-publish, Large research, publisher Large prototypes, larger marketing, conventions, improved engine concurrency.

### Purpose

Build a **deliberate team**: specialists vs generalists, leads, mentors, retrain, prepare Large + future lab specialist.

### Staff RP

~2 RP per active hired production employee; max ~8/week. Founder separate.

---

## Technology Park (Tier 4) — Checkpoint 4+

### Eligibility (initial)

- All 5 seats filled  
- ≥ 12 total releases  
- ≥ 3 profitable Medium+  
- ≥ 1 trained discipline specialist  
- Positive trailing **52-week** operating profit  
- ≥ 104 weeks in Upgraded Office  
- ~$16M liquid; ~$8M move  
- Post-move runway sufficient  
- No insolvency  

Year alone does **not** grant Tech Park.

### Move safety

Finish atomic action → pause incompatible work → reserve cost → preserve staff/assignments/games/engines/research/contracts/history → create 6-seat state → new expenses → resume compatible work → intro.

### Capacity

6 HQ (founder + 5 production). Lab slots **potential** after construction: up to 2 remote R&D + 2 remote Hardware. Remote lab staff **do not** consume HQ production seats.

### Systems introduced

Reliable Large production, AAA path, advanced publishing/marketing, Design/Tech Specialist certs, R&D/Hardware construction paths, remote lab employees, advanced engines/online/QA/planning.

### Staff RP

~4 RP per active hired production employee; max ~20/week. Founder and remote lab employees **excluded** from production RP (labs make lab knowledge/work instead).

### Leadership bottleneck (intentional)

No dedicated director seats yet. Each lab needs a **qualified HQ acting lead** who splits capacity: production vs lab leadership/reviews/planning/risk/supervision.

Acting lab lead ≠ full production seat. Running 6-person AAA + two major labs may overcommit — show shortage **before** confirm; if proceed: slower work, coordination loss, bad estimates, defects, fatigue, leadership strain, milestone risk.

Player responses: pause lab at safe milestone, cut lab budget, delay game, fewer on game, hire remote lab staff, serialize major projects, wait for campus, accept risk.

---

## R&D Lab (not free on park entry)

### Prerequisites

1. Technology Park  
2. **Design Specialist** (initial tuning): L7-equivalent; Design ≥700; Research ≥400; ≥2 successful Medium+; Leadership Cert 1 for acting lead; ~100 RP; ~$5M; configured training time  
3. Founder may qualify (then cannot give full production)  

### Unlock flow

Park → qualify employee → Design Specialist training → R&D proposal → cost/ops review → approve/delay → assign construction → complete → assign acting lead → set budget → hire ≤2 remote R&D → first portfolio.

**Room ≠ free staff or free research.**

### Remote R&D employees

Full employee records (skills, level, research, salary, energy, morale, training, personality, goals, specialism, assignments, history, relationships, leave/fire/poach). Not full-size vertical-office characters.

### Work types

1. **Foundational research** — new capability / scientific maturity  
2. **Prototype** — succeed / partial / more reqs / revise / fail with knowledge  
3. **Engine transfer** — successful prototype → future engine version (never mutate shipped engines in place)  
4. **Major project** — AAA Production, Advanced QA, Global Launch Ops, Internet Infrastructure, Persistent Servers, MMO Architecture, Digital Distribution, Engine Licensing, Studio Storefront, Hardware Architecture, future production tech  

### Portfolio

Primary project + optional background theme; weekly budget; risk posture (Conservative / Balanced / Experimental); acting-lead allocation; remote assignments. Funding helps with diminishing returns; money ≠ instant finish.

### Idle lab

Limited lab RP, slow maturity, technical-debt analysis, reduce unknowns, mentor, telemetry study, prep prototypes. Still costs money; **not** unlimited free RP.

### Project sunset

Complete / cancel / supersede / abandon / convert to engine-transfer / replace branch. Results stay in knowledge archive. Lab itself does not sunset; portfolio changes.

---

## Hardware Lab (after R&D)

### Prerequisites

R&D Lab exists → complete **Hardware Architecture** major research → **Technology Specialist** (L7-eq; Tech ≥700; Research ≥400; ≥2 Medium+; Leadership Cert 1; ~100 RP; ~$5M; training time).

### Unlock flow

Park → R&D built → Hardware Architecture → Tech Specialist → proposal → costs → construction → acting Hardware Lead → ≤2 remote Hardware → component/architecture work.

### Work domain (not a second R&D bar)

Components, CPU/GPU architecture, memory/storage, input, network, dev kits, platform prototypes, reliability, thermal/power, manufacturing, supply risk, unit cost, revisions, game-specific opt, custom platforms, successors, support, retirement.

**R&D** = discoveries & software capabilities.  
**Hardware** = physical constraints, mfg, reliability, cost, compatibility, ecosystems.

---

## AAA games

AAA = **production class**, not genre/topic/platform/MMO synonym, not free on park entry.

### Proof (config-driven, visible)

Large completion; strong quality; successful milestones; team size; bug/stability; commercial viability; not a tiny contract exploit.

Proof → reveals **AAA Production** R&D → complete R&D → unlocks AAA preproduction (**does not** auto-start a game).

### Production flow

Concept → market/franchise analysis → greenlight → preproduction → budget → staffing → engine/platform plan → milestones → full production → internal reviews → advanced QA → certification → marketing → launch prep → release → postlaunch → long-tail or live-service decision.

Needs: qualified project lead, milestones, large capacity, advanced QA, cash, runway, marketing, cert, risk. R&D/Hardware/contractors/publishers support; **not free production seats**.

### AAA vs MMO

| | AAA | MMO |
|--|-----|-----|
| Means | Scale & investment | Persistent online architecture |

Combinations allowed (AAA SP, AAA MP, AAA MMORPG, Large MMO, smaller persistent, AAA live-service, traditional AAA without service).

**Never** list MMO next to Action/RPG/Strategy as a genre chip.

---

## Expanded Campus (Tier 5) — Checkpoint 7

### Tenure gate (fixed)

**Exactly 12 full campaign years** of Technology Park tenure from **move complete**.

Does **not** reset on: save/load, pause, speed, lab build, staff changes, temp close division, project start/stop.

**No Level-7 graphics-card gate.**

### Additional financial (initial)

No insolvency; no unpaid lab debt; ~$100M liquid; ~$50M expansion; ≥104 weeks post-expansion runway; can fund payroll + lab budgets. Delay allowed forever.

### Capacity

8 HQ: founder + 5 production + **R&D Director** + **Hardware Director** (role-locked; not ordinary hires).

With directors: ~4 remote R&D + ~4 remote Hardware. Six-person production group intact (directors no longer tax production seats).

### Expansion flow

12y tenure → finance check → announce → review cost/overhead → accept/delay/decline → construction (compatible work continues) → complete atomically → two empty director seats → promote/recruit available.

**Construction does not create directors.** Vacant directors allowed.

### Director recruitment

Internal promotion (preserves knowledge, relationships, engine familiarity, history, morale, specialisms, leadership) — opens former production seat.  
External (stronger executive now; onboarding + less company familiarity).  
Succession planning path.

### R&D Director owns (recommendations; player final)

Proposals, portfolio plan, budget recs, risk, remote hire recs, assignments, prototype review, engine-transfer plan, knowledge retention, advanced online/production research, safe pause of majors. Reduces coordination loss; does not autoplay.

### Hardware Director owns

Roadmaps, components, prototypes, mfg risk, cost, reliability, kits, remote hire/assign, revisions, successors, retirement recs.

Excellent tech can still fail on price, launch slate, marketing, supply, dev support, audience mismatch, competition.

### Vacancies

Responsibilities remain; projects pause at safe checkpoints or suffer leadership cut; new top-tier work needing that director blocked; remote division below full expanded capacity; support/mfg obligations continue; promote/recruit/temp reassign. **Firing never deletes** research, hardware, mfg, or platform records.

### Purpose

Removes acting-lead bottleneck; adds executive-scale management: production + R&D + Hardware portfolios, directors, remotes, AAA, online, live services, subs, engine licensing, storefronts, owned platforms, generations, long-term support. Player runs an entertainment **and** technology company.

---

## Checkpoint mapping

| CP | Part 3 slice |
|----|----------------|
| **0** | Garage loop protected |
| **1** | Office foundation + FO offer/move (done; review stop) |
| **2** | First Office employees, RP table, manager fantasy |
| **3** | Upgraded Office + Training Center + 5th seat |
| **4** | Tech Park move + tenure + acting-lead bottleneck + lab construction paths |
| **5** | AAA Production R&D + full AAA pipeline |
| **6** | Persistent online (separate from AAA class) |
| **7** | 12y campus + directors + expanded remote |

---

## Code alignment snapshot

| Rule | `offices.ts` / progression |
|------|----------------------------|
| Seats 1→4→5→6→8 | `hqSeatsTotal` matches |
| FO $1M / $150k / CY3 | `TRANSITIONS[0]` matches |
| Upgrade $5M / $500k / 52w | `TRANSITIONS[1]` matches |
| Park $16M / $8M / 104w | `TRANSITIONS[2]` matches |
| Campus $100M / $50M / 12×48w | `TRANSITIONS[3]` matches |
| Remote slots 0/0 → 2/2 → 4/4 | `remoteLabSlots` matches |
| Labs on entry | **Not** auto-granted (flag + future construction) |
| Directors role-locked | Seat kinds in `seats.ts` for tier 5 |

---

## Acceptance seeds (Part 3)

1. Office move never free-hires or free-researches.  
2. Vertical scene shows ≤1 full-size character; off-screen staff still produce.  
3. FO/Upgraded/Park/Campus seat counts exact.  
4. Tech Park entry ≠ R&D lab operating.  
5. R&D before Hardware; Design Specialist before R&D; Tech Specialist + Hardware Architecture before Hardware lab.  
6. Acting lead capacity tax enforced and previewed.  
7. AAA not a genre; proof + R&D required.  
8. Campus tenure = 12 exact Tech Park years; no graphics-level gate.  
9. Director seats not fillable by normal production hire.  
10. Director loss does not wipe lab/platform history.

---

## Anti-drift

- Do not change 1→4→5→6→8 seats.  
- Do not grant labs on office entry.  
- Do not grant Hardware before R&D + Hardware Architecture + Tech Specialist.  
- Do not grant AAA on office entry.  
- Do not model MMO as a genre.  
- Do not require L7 GPU for campus.  
- Do not unlock Tier 5 before 12 Tech Park years.  
- Do not render multi full-size employees in home scene.  
- Do not fake empty R&D/Hardware/AAA buttons before loops work.
