# Studio Empire — Lifecycle-Driven Company Systems (Part 2)

**Status:** Design authority (player-facing rules).  
**Source:** Del — *Lifecycle-Driven Gameplay Flow · Part 2: Hiring, Research, Engines, and Training* (2026-08).  
**Build policy:** Implement under checkpoint flags only. Garage must stay founder-only. No empty late-office training/R&D trees.

Related:

- [PLATFORM_LIFECYCLE_FLOW.md](./PLATFORM_LIFECYCLE_FLOW.md) (Part 1 — industry / platforms)
- [OFFICE_LABS_CAMPUS_FLOW.md](./OFFICE_LABS_CAMPUS_FLOW.md) (Part 3 — offices, labs, AAA, campus)
- Full Campaign Progression Bible §2–§5, §36.3–36.5, Checkpoint 2–4
- [CHECKPOINT_0_1_REPORT.md](./CHECKPOINT_0_1_REPORT.md)
- Flags: `firstOfficeEmployees`, `upgradedOffice`, `techParkLabs`, `campusDirectors`

---

## Core rule — the office is an active hub

The office is not a menu backdrop.

**“No Project”** means no active main game project only. Time and company systems still advance:

| Still running | Notes |
|---------------|--------|
| Released game sales | Residual / weekly sales |
| Platform installed bases | Industry clock |
| Industry events | News applies to sim |
| Candidate searches | After First Office |
| Employee training | After hiring |
| Research jobs | Capability clock |
| R&D / Hardware projects | Tech Park+ (later CP) |
| Payroll & overhead | Office tier rent + salaries |
| Energy recovery | Hired staff only; **founder excluded** |
| Live support work | Later live-service CP |
| Publisher deadlines | Commercial |

**Planning screens pause time by default.** Confirming a search / research / training / engine job **schedules** it; time resumes on return to the hub.

Later game = more parallel company activities.

---

## Hiring

### Hard garage lock (bible + this doc)

- Hiring **completely unavailable** in the garage.
- One founder seat only; no hidden menu, command, or early exploit.
- Unlock only when player **accepts First Office** (move complete / tier 2).

### First Office seats (total HQ = 4)

| Seat | Role |
|------|------|
| 1 | Founder (not an employee energy subject) |
| 2–4 | Production employees (max **3** hires) |

### Introduction sequence (gradual)

1. Enter office → learn operating expenses  
2. Identify empty production seat  
3. Guided candidate-search opportunity  
4. Choose search method + budget  
5. Search runs for sim time  
6. Deterministic candidate slate arrives  
7. Interview + offer  
8. Accept → **onboarding** (not full efficiency day one)

### Search methods (First Office)

| Method | Favors |
|--------|--------|
| **Complex Algorithms** | Tech, research, engine, AI, optimization |
| **Game Demo** | Balanced D/T, production, gameplay, completion experience |
| **Showreel** | Design, graphics, animation, story, world, dialogue, sound |

Method changes **probability distribution**, not a guarantee. Showreel can still yield a technical hire.

### Budget

Larger budget may improve: slate size, average experience, speed, geographic reach, estimate accuracy, specialist/lead chance, background verification.

**Must not** directly mint superior employees.

Results from: campaign seed, date, labor market, reputation, office tier, culture, method, budget, role, remote availability, salary competitiveness.

**No free reroll** of the same search.

### Search flow

Open seat → method → budget → optional preferred discipline → confirm → pay → wait duration → deterministic slate → review → interview → offer → accept/reject/negotiate → onboarding.

Player may develop games while recruiters work.

### Candidate fields

Design, Technology, Research, Speed, level, salary expectation, preferred/secondary disciplines, experience, potential range, personality, work preferences, leadership potential, remote preference, morale baseline, negotiation expectations.

Some fields start as **estimates**; interviews / better recruiting / reputation improve accuracy.

**Never** secretly replace a displayed candidate after offer.

### Slate expiration

Slate lasts a limited period. Candidates may accept elsewhere, withdraw, raise salary, stay, reject, or request another role.

**Reopening the same slate does not reroll.** New search = new event + new cost.

### Onboarding

New hire starts at roughly **55–80%** contribution depending on experience, Welcome Training, docs, leadership, personality fit, role familiarity, office tier, organization.

Ramps via work, Welcome Training, mentorship, milestones.

### Cohesion

| Improves | Decreases |
|----------|-----------|
| Shared success, stable assignments, mentorship, Welcome Training, fair leadership, reasonable schedules, personality fit, time together | Rapid hire churn, missed payroll, crunch, cancel, reassignment, bad management, unfair pay, ignored career goals, burnout, leadership vacancy |

Affects: coordination loss, estimation, bugs, rework, milestone reliability, morale, knowledge sharing.

**Does not** rewrite topic×genre concept fit.

### Employee career lifecycle

Candidate → negotiation → onboarding → junior → developing → established → specialist/generalist → senior → lead candidate → project lead/mentor/specialist → director candidate (eligible) → leave/fire/retire/stay.

History preserved across retrain and promotion (skills, level, relationships, morale, projects, training, specializations, salary history, familiarity).

### Hiring evolution by office

| Tier | Methods |
|------|---------|
| First Office | Algorithms, Game Demo, Showreel; general production |
| Upgraded | Discipline-targeted, referrals, junior, experienced, team-lead |
| Tech Park | Global remote, specialist/senior creative & technical, R&D/Hardware recruiting, leadership assessment |
| Campus | Executive, R&D/Hardware director, internal promotion, acquisition hire, high specialist contracts |

Early methods stay available but weaken for senior/exec roles.

---

## Research

### Research Points (studio resource)

Sources: developing, hard bugs, Game Reports, employee Research, completed projects, R&D/Hardware, supported live games, market discovery.

Belong to the studio unless lab-bound.

### Research types

1. Topic  
2. Platform support  
3. Engine technology  
4. Production (QA, scheduling, PM, collab)  
5. Business (publish, marketing, distribution, analytics, monetization)  
6. Online (accounts, matchmaking, servers, live ops, subs, persistent worlds)  
7. R&D major projects (AAA, engine licensing, digital distribution, infrastructure)  
8. Hardware (architecture, components, kits, manufacturing, revisions, successors)

### Research availability states

`Hidden → Foreshadowed → Visible but locked → Available → In progress → Completed → Integrated (where applicable) → Superseded → Legacy`

Locked items show the **next meaningful missing requirement**. Do not dump the entire future tree early.

### Prerequisites (any combination)

Industry era, prior research, office tier, company level, qualified employee/spec, game size proof, successful project, engine version, lab, cash, RP, calendar time, platform kit, mastery.

### Topic flow

Unknown → discover (research, news, employees, publishers, market, reports, R&D, era) → spend RP → unlock for concepts.

Unlock does **not** reveal full genre/audience fit — learned via release, reports, market, hires, related research, rivals.

Topics never permanently die; popularity cycles.

### Technology flow (multi-step)

Era ready → foreshadowed → visible → prereqs → spend cash/RP → employee/team researches → complete → **engine integration available** → build/upgrade engine → feature selectable on projects → mastery by shipping.

**Research does not silently inject features into every engine.**

---

## Engines

### Creation

Player chooses: name, platforms, graphics/audio/gameplay/AI/world/UI/save/network/tools/testing/accessibility + researched components.

Each feature affects: build time/cost, design options, complexity, staff needs, bug risk, platform fit, maintenance, upgrade difficulty.

**Max features ≠ automatically best engine.**

### Versioning (immutable after ship)

1. Engine family created  
2. v1 constructed  
3. Games ship on v1  
4. New tech researched  
5. v2 forked from v1 (prior knowledge reduces integration)  
6. v1 stays attached to old releases  
7. New games may use v2  
8. v1 becomes legacy  

Never edit a shipped version in place.

### Mastery

Gained by: develop, fix bugs, optimize platforms, ports, support, docs, training, reports.

Improves: speed, estimation, bug detection, platform opt, reliability, onboarding, porting.

Does not erase all risk on huge projects.

### Technology sunset

Old feature remains on old engines and shipped games; leaves recommended list; legacy filter access; prior mastery eases successor integration; still needs research + engine work for new version.

Pixel-art / deliberate retro must not be auto-punished for avoiding newest render path. Evaluate scope, art direction, audience, platform, genre, era, execution.

---

## Training

### Introduction

Garage: founder learns by work + limited self-study.  
Full employee training only after hiring exists.

Gradual reveal: Welcome → books → practice → formal courses → mentorship → specialization → cross-train → retrain → specialist cert → executive prep.

### Foundational stats (4)

Design · Technology · Research · Speed.

**Leadership is not a fifth universal stat** — separate competency from management training, milestones, reports, mentoring, planning, successes/failures, estimation, conflict work.

### Categories

| # | Category | Notes |
|---|----------|--------|
| 1 | Welcome Training | New hires; onboarding/engine/cohesion; little value after integrated; one-time per employee |
| 2 | Books | Cheap, short; junior-focused; diminishing returns for seniors |
| 3 | Practice | Jams/challenges; repeatable with cooldowns; multi-stat; team practice can raise cohesion; useless if never applied to real work |
| 4 | Formal courses | Cost time/money/RP; absence from production; larger gains; mostly one-time |
| 5 | Mentorship | Senior capacity tax; junior ramp; senior gets leadership/mentoring/RP/relationship; limited mentees; no toggle abuse |
| 6 | Specialization | Engine/Gameplay/Story/Dialogue/Level/AI/World/Graphics/Sound — improves fit for that discipline only |
| 7 | Cross-training | Secondary competence; softens mismatch; not equal to specialist |
| 8 | Retraining | Money/RP/time; temp loss of old bonus; ramp new; morale risk; **preserves identity & history** |

### Opportunity cost

Full-time training: no full production, no full milestone lead, no normal weekly staff RP; still paid; may delay project; morale +/- based on career plan fit.

### By office

| Tier | Training surface |
|------|------------------|
| Garage | Founder work + reports + limited self-study |
| First Office | Welcome, books, practice, D/T foundations, research methods, speed, Management Fundamentals |
| Upgraded | Training Center, formal, mentorship, career plans, cross/retrain, leadership, discipline specialism |
| Tech Park | Advanced specialism, Design/Tech Specialist cert, lab lead prep, senior lead, remote coordination |
| Campus | Executive, director prep, advanced management, global leadership, lab careers, succession |

### Sunset rules

One-time course vanishes for that employee after complete; cert replaced by next tier; practice stays with cooldown; beginner books stay but inefficient; obsolete tech course → successor; in-progress may finish; history permanent; **never strip earned stats** because a course aged out.

---

## Current code gap (honest)

| Area | Today | Target (this doc) |
|------|--------|-------------------|
| Garage hire lock | `hireStaff` + unlock; capacity 1 | Hard; no exploit path |
| Instant hire | Instant add + energy 100 | Search time, slate, offer, onboarding ramp |
| Search methods | Ad-hoc `generateStaff` | Algorithms / Demo / Showreel + budget |
| Cohesion | Not modeled | Full cohesion system |
| Founder energy | Already excluded in tick | Keep forever |
| Research states | Flat researched flags | Full HIDDEN→LEGACY machine |
| Engine versions | Custom engines exist; weak immutability story | Versioned family; no in-place edit post-ship |
| Training | Minimal / cheat-adjacent | Full categories gated by office |
| Hub parallel work | Week tick continues sales/payroll | Explicit: hub active while no project; planning pauses time |
| Flag `firstOfficeEmployees` | **false** | Enable only for CP2 build |

---

## Checkpoint mapping

| Checkpoint | Part 2 slice |
|------------|----------------|
| **CP2** First Office employees | Seats 2–4, search methods, budget, slate, offer, onboarding 55–80%, payroll, energy (non-founder), cohesion basics, Welcome + books + practice + Mgmt Fundamentals, weekly staff RP max 3 |
| **CP3** Upgraded Office | Training Center, formal/mentor/specialization/cross/retrain, 5th seat, career plans |
| **CP4** Tech Park | Advanced specialism, lab recruiting, remote search (not full labs fake) |
| **CP7** Campus | Director seats, executive search/promotion |
| Engines/research depth | Progressive across CPs; no silent feature inject |

---

## Acceptance seeds (Part 2)

1. Garage: zero hires; capacity 1 founder.  
2. First Office: max 3 hired production seats.  
3. Same search identity does not free-reroll slate.  
4. Offer does not swap candidate identity.  
5. New hire not 100% efficient day one.  
6. Founder never enters employee energy sim.  
7. Research complete ≠ auto-added to all engines.  
8. Engine v2 does not mutate shipped v1 games.  
9. Retrain preserves employee id and history.  
10. Planning UI pauses; confirmed jobs run in sim time.

---

## Anti-drift

- Do not rebuild garage loop for hiring UI.  
- Do not call founder an “employee.”  
- Do not unlock Training Center before Upgraded Office completion.  
- Do not expose full research tree day one.  
- Do not empty-button R&D/Hardware/AAA from this doc alone.  
- Do not proceed CP2 implementation until Del signs CP0+1.
