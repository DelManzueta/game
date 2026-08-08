# Studio Empire — Lifecycle-Driven Platform Flow (Part 1)

**Status:** Design authority (player-facing rules).  
**Source:** Del — *Lifecycle-Driven Gameplay Flow · Part 1: World and Platform Cycles* (2026-08).  
**Build policy:** Do not ship empty platform menus or fake late stages. Expand the real sim only; UI consumes stages.

Related:

- Full Campaign Progression Bible (office/company ladder)
- [CHECKPOINT_0_1_REPORT.md](./CHECKPOINT_0_1_REPORT.md)
- [COMPANY_SYSTEMS_FLOW.md](./COMPANY_SYSTEMS_FLOW.md) (**Part 2** — hiring, research, engines, training)
- [OFFICE_LABS_CAMPUS_FLOW.md](./OFFICE_LABS_CAMPUS_FLOW.md) (**Part 3** — offices, labs, AAA, campus)
- Algorithm 3 in `src/lib/game/platforms/lifecycle.ts`

---

## Core rule

Studio Empire must not feel like menus that suddenly appear.

Every platform (and later: tech, employees, offices, games, businesses) moves through a lifecycle. The player repeatedly:

1. Hears about something  
2. Prepares for it  
3. Unlocks / acquires it  
4. Invests in it  
5. Uses it  
6. Masters it  
7. Watches the industry move beyond it  
8. Replaces, retires, or preserves it  
9. Keeps complete history  

**Sunsetting limits future availability. It never erases past work.**

---

## The three progression clocks

| Clock | Owns | Does **not** auto-grant |
|-------|------|-------------------------|
| **Industry** | Platform announce/launch/decline/sunset, tech reveals, competitors, market trends | Offices, labs, AAA, staff |
| **Company** | Releases, cash, fans, office tenure, seats, labs built, directors | Platform existence |
| **Capability** | Research, engines, staff skills, platform mastery, online stack | Calendar year alone |

**Correct chain for a platform game:**

Industry announces → studio learns offer → player evaluates → license/devkit → research support → engine integrate → develop → certify → release → market decides.

No unlock skips the whole chain.

**Industry news is gameplay.** Events change sim state immediately; dismissing a message does not undo them. Messages explain; they do not cause.

---

## Platform stages (authoritative 11)

| # | Stage | Player / world effect (summary) |
|---|--------|----------------------------------|
| 1 | **Hidden** | Not in normal menus; cannot license/engine/project; optional rumor if intel high |
| 2 | **Announcement** | Known name/maker/window/position; watchlist; related research discoverable; not normal project target |
| 3 | **Market & tech reveal** | Traits affect sim (power, cost, audience, difficulty, BC, price, online…) — strategy after reading |
| 4 | **Prelaunch preparation** | Devkit/early license, architecture research, engine work, launch title, exclusivity risk |
| 5 | **Launch** | Installed base grows; normal licensing; cert; launch-window demand; forecasts → real data |
| 6 | **Growth** | Base rises; tools improve; audience data clarifies; early titles longer tails |
| 7 | **Maturity** | Large base, lower risk, heavy competition, higher expectations |
| 8 | **Decline** | Smaller base, fewer contracts, lower license price, niches remain |
| 9 | **Sunset announced** | Hard deadlines (submit/cert/mfg/store/online); in-dev games warned vs estimate |
| 10 | **Retirement** | No new targets/cert; sales tails continue; **no delete** of history |
| 11 | **Legacy** | Retro/remaster/BC/nostalgia paths later; mastery retained |

Several lifecycles **overlap** at once (e.g. PPS announced, GS launching, current mature, old declining, future hidden).

---

## Screenshot intent (reference, not assets)

| Images | Meaning |
|--------|---------|
| 1–2 | Future platform **announced** + second beat explaining **differentiation that changes gameplay** |
| 3 | **Different** platform **launching** while first still in prep — overlapping clocks |
| 4–9 | Player response: hire, research, engine, training |
| 10 | Late game: R&D as parallel division while games still sell |

---

## Current code map (gap)

| Desired | Today (`platforms/lifecycle.ts` + catalog) |
|---------|--------------------------------------------|
| 11 stages | **3 sim buckets:** `prelaunch` → `active` → `legacy` |
| Hidden vs announced | Mostly **year gate** + unlock list; no first-class hidden/announce |
| Tech reveal traits | Partial: marketSize, techCeiling, affinities — not full trait model |
| Prelaunch prep / devkit | Not modeled |
| Launch vs growth vs mature vs decline | **Curve** on installed base (launch→peak→half-life), not named stages |
| Sunset announcement | `sunsetDay` field exists; little player warning path |
| Retirement | `retirementDay` → legacy; `legacyReleaseAllowed` |
| History preserved | Yes — games/sales not deleted |
| Industry news → sim | `industryStories` has `announcePlatforms` / `launchPlatforms` / `boostPlatforms`; must stay **non-optional** on fire |
| Three clocks | CP1 office = company clock; industry stories + platform year = industry; research/engines = capability (partial) |

**Sales layers already use** `lifecycleFactor` / installed base from Algorithm 3 — real sim, not decoration.

---

## Implementation order (when authorized)

Do **not** fold this into Checkpoint 2 (employees) as a fake Platforms mega-menu.

Suggested slices:

1. **Domain stages** — expand `PlatformLifecycleStage` 11-way; map continuous base curve → named stage for UI/gates; keep history immutable.  
2. **Industry event bus** — fire announce/reveal/launch/sunset on industry clock; apply sim **before** inbox UI.  
3. **Catalog traits** — manufacturer, form factor, difficulty, audience tilt, online strength, BC flags (data-driven).  
4. **Garage-safe surface** — only show stages the garage can actually act on (PC + licensed contemporaries); no wall of grey future IDs.  
5. **Prep / cert / sunset warnings** — after capability systems (engines, licensing) are honest.  
6. **Legacy remaster paths** — late checkpoint only.

Feature flag candidate: `platformLifecycleV2` (off until slice 1–2 ship).

---

## Acceptance seeds (from this doc)

1. Announcing PPS does not launch PPS.  
2. GS can launch while PPS is still announced/prelaunch.  
3. Ignoring a launch message does not prevent launch.  
4. Prelaunch platforms are not normal create-game targets.  
5. Trait text for a platform must match sim modifiers.  
6. Retirement blocks new projects; does not delete released titles or mastery.  
7. Year alone never grants office/lab/AAA (company + capability still required).

---

## Explicit non-goals (anti-drift)

- No empty R&D / Hardware / AAA buttons justified by “platform era.”  
- No GDT cartoon art for platform chrome.  
- No silent wipe of engines, games, or ledger on platform change.  
- Do not rebuild garage loop while adding industry stages.
