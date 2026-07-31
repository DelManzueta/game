/**
 * Algorithms 1–3 behavioral tests: production, quality/reviews, platforms.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { stableUnit } from "../determinism";
import {
  createProductionState,
  planStage,
  advanceDevelopmentDay,
  advancePolishDay,
  finalizeBuild,
  advanceBugFixingDay,
  cancelProduction,
  normalizedDistribution,
  founderFromStaff,
  STAGE_DISCIPLINES,
  defaultStageDemand,
  PHASE_PLANNING,
  PHASE_POLISH,
  PHASE_RELEASE_READY,
  PHASE_CANCELLED,
  type ProductionState,
} from "../production/algorithm";
import {
  calculateConceptFit,
  calculateQuality,
  calculateReviews,
  GENRE_CAPACITY_WEIGHTS,
  metricsFromProduction,
} from "../quality/algorithm";
import {
  platformSpecFromDef,
  platformMarketState,
  canSelectPlatform,
  yearToLaunchDay,
  allPlatformSpecs,
  snapshotPlatformWeek,
} from "../platforms/lifecycle";
import { PLATFORMS, getPlatform } from "../data";
import { GENRE_CAPACITY_WEIGHTS as CONTRACT_WEIGHTS } from "../contracts";

const founder = founderFromStaff([
  { skills: { design: 60, tech: 55, speed: 50, research: 40 }, level: 3 },
]);

function planAndDevelopToComplete(stage: 1 | 2 | 3, seed = "camp", gameId = "g1") {
  let state = createProductionState(gameId, seed, 0);
  state = { ...state, currentStage: stage, phase: PHASE_PLANNING };
  const discs = STAGE_DISCIPLINES[stage];
  const rawIntent = Object.fromEntries(discs.map((d) => [d, 40]));
  state = planStage(state, {
    stage,
    rawIntent,
    demand: defaultStageDemand(stage),
  });
  let guard = 0;
  while (state.phase === "developing" && guard++ < 200) {
    const r = advanceDevelopmentDay(state, {
      day: state.asOfDay + 1,
      founder,
    });
    state = r.state;
  }
  return state;
}

describe("stableUnit determinism", () => {
  it("same parts → same float; different keys differ", () => {
    const a = stableUnit("c", "g", "bug", 1, 10, "engine");
    const b = stableUnit("c", "g", "bug", 1, 10, "engine");
    const c = stableUnit("c", "g", "bug", 1, 11, "engine");
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.ok(a >= 0 && a < 1);
  });
});

describe("production simulation", () => {
  it("normalizes raw allocations to 100%", () => {
    const n = normalizedDistribution({ story: 50, engine: 30, gameplay: 20 }, [
      "story",
      "engine",
      "gameplay",
    ]);
    const sum = Object.values(n).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9);
  });

  it("rejects invalid disciplines", () => {
    assert.throws(() =>
      normalizedDistribution({ story: 1, engine: 1 }, ["story", "engine", "gameplay"]),
    );
  });

  it("stage 1 completion pauses at stage 2 planning", () => {
    const s = planAndDevelopToComplete(1);
    assert.equal(s.phase, PHASE_PLANNING);
    assert.equal(s.currentStage, 2);
    assert.equal(s.completedStages.length, 1);
  });

  it("stage 2 completion pauses at stage 3 planning", () => {
    let s = planAndDevelopToComplete(1);
    s = planStage(s, {
      stage: 2,
      rawIntent: Object.fromEntries(STAGE_DISCIPLINES[2].map((d) => [d, 40])),
      demand: defaultStageDemand(2),
    });
    let guard = 0;
    while (s.phase === "developing" && guard++ < 200) {
      s = advanceDevelopmentDay(s, { day: s.asOfDay + 1, founder }).state;
    }
    assert.equal(s.phase, PHASE_PLANNING);
    assert.equal(s.currentStage, 3);
  });

  it("stage 3 completion enters polish", () => {
    let s = planAndDevelopToComplete(1, "s3", "g3");
    for (const stage of [2, 3] as const) {
      s = planStage(s, {
        stage,
        rawIntent: Object.fromEntries(STAGE_DISCIPLINES[stage].map((d) => [d, 40])),
        demand: defaultStageDemand(stage),
      });
      let guard = 0;
      while (s.phase === "developing" && guard++ < 200) {
        s = advanceDevelopmentDay(s, { day: s.asOfDay + 1, founder }).state;
      }
    }
    assert.equal(s.phase, PHASE_POLISH);
  });

  it("max intent increases scope pressure vs balanced", () => {
    let bloated = createProductionState("b", "seed", 0);
    bloated = planStage(bloated, {
      stage: 1,
      rawIntent: { story: 100, engine: 100, gameplay: 100 },
      demand: defaultStageDemand(1),
    });
    let focused = createProductionState("f", "seed", 0);
    focused = planStage(focused, {
      stage: 1,
      rawIntent: { story: 40, engine: 35, gameplay: 25 },
      demand: defaultStageDemand(1),
    });
    assert.ok(bloated.activeProgress!.plan.scopePressure > 0);
    assert.ok(
      bloated.activeProgress!.plan.scopePressure >
        focused.activeProgress!.plan.scopePressure,
    );
    const bReq = Object.values(bloated.activeProgress!.plan.requiredSwu).reduce(
      (a, b) => a + b,
      0,
    );
    const fReq = Object.values(focused.activeProgress!.plan.requiredSwu).reduce(
      (a, b) => a + b,
      0,
    );
    assert.ok(bReq > fReq);
  });

  it("identical seed produces identical work and bugs", () => {
    const run = (seed: string) => {
      let s = createProductionState("g", seed, 0);
      s = planStage(s, {
        stage: 1,
        rawIntent: { story: 50, engine: 30, gameplay: 20 },
        demand: defaultStageDemand(1),
      });
      for (let i = 0; i < 5; i++) {
        s = advanceDevelopmentDay(s, { day: s.asOfDay + 1, founder }).state;
      }
      return s;
    };
    const a = run("same");
    const b = run("same");
    assert.deepEqual(a.activeProgress?.workDone, b.activeProgress?.workDone);
    assert.deepEqual(
      a.bugs.map((x) => x.bugId),
      b.bugs.map((x) => x.bugId),
    );
  });

  it("bugs persist after JSON save/load", () => {
    let s = createProductionState("g", "bugseed", 0);
    s = planStage(s, {
      stage: 1,
      rawIntent: { story: 100, engine: 100, gameplay: 100 },
      demand: defaultStageDemand(1),
    });
    for (let i = 0; i < 40; i++) {
      if (s.phase !== "developing") break;
      s = advanceDevelopmentDay(s, { day: s.asOfDay + 1, founder }).state;
    }
    // inject a bug if RNG was unlucky
    if (!s.bugs.length) {
      s = {
        ...s,
        bugs: [
          {
            bugId: "g:1:1:engine",
            discipline: "engine",
            severity: 2,
            discoveredOnDay: 1,
            remainingWork: 200,
            sourceStage: 1,
          },
        ],
      };
    }
    const loaded = JSON.parse(JSON.stringify(s)) as ProductionState;
    assert.equal(loaded.bugs.length, s.bugs.length);
    assert.deepEqual(
      loaded.bugs.map((b) => b.bugId),
      s.bugs.map((b) => b.bugId),
    );
    assert.equal(loaded.bugs[0]!.remainingWork, s.bugs[0]!.remainingWork);
  });

  it("finalize creates candidate only; cancel blocks release path", () => {
    let s = planAndDevelopToComplete(1, "fin", "gf");
    for (const stage of [2, 3] as const) {
      s = planStage(s, {
        stage,
        rawIntent: Object.fromEntries(STAGE_DISCIPLINES[stage].map((d) => [d, 35])),
        demand: defaultStageDemand(stage),
      });
      let guard = 0;
      while (s.phase === "developing" && guard++ < 200) {
        s = advanceDevelopmentDay(s, { day: s.asOfDay + 1, founder }).state;
      }
    }
    assert.equal(s.phase, PHASE_POLISH);
    while (s.phase === PHASE_POLISH) {
      s = advancePolishDay(s, { day: s.asOfDay + 1, founder }).state;
    }
    assert.equal(s.phase, "finalize_build");
    s = finalizeBuild(s);
    assert.ok(s.candidateBuild);
    assert.ok(
      s.phase === PHASE_RELEASE_READY || s.phase === "bug_fixing",
    );
    // cancel before ready not allowed after release_ready
    if (s.phase === "bug_fixing") {
      const cancelled = cancelProduction({ ...s, phase: PHASE_POLISH });
      assert.equal(cancelled.phase, PHASE_CANCELLED);
    }
  });

  it("bug fixing consumes days and work", () => {
    let s = createProductionState("bf", "bf", 0);
    s = {
      ...s,
      phase: "bug_fixing",
      bugs: [
        {
          bugId: "b1",
          discipline: "engine",
          severity: 3,
          discoveredOnDay: 1,
          remainingWork: 200,
          sourceStage: 1,
        },
      ],
      asOfDay: 10,
    };
    const before = s.bugs[0]!.remainingWork;
    s = advanceBugFixingDay(s, { day: 11, founder }).state;
    assert.ok(s.bugs[0]!.remainingWork < before);
    assert.equal(s.asOfDay, 11);
  });
});

describe("quality and reviews", () => {
  it("concept fit uses exact genre order and tier weights", () => {
    assert.deepEqual([...GENRE_CAPACITY_WEIGHTS[1]], [1]);
    assert.deepEqual([...GENRE_CAPACITY_WEIGHTS[2]], [0.8, 0.2]);
    assert.deepEqual([...GENRE_CAPACITY_WEIGHTS[3]], [0.6, 0.3, 0.1]);
    assert.deepEqual([...GENRE_CAPACITY_WEIGHTS[4]], [0.4, 0.4, 0.1, 0.1]);
    assert.deepEqual([...CONTRACT_WEIGHTS[4]], [0.4, 0.4, 0.1, 0.1]);
    const ordered = calculateConceptFit([100, 15], 2);
    const reversed = calculateConceptFit([15, 100], 2);
    assert.ok(ordered > reversed);
    assert.equal(calculateConceptFit([100], 1), 100);
  });

  it("unfixed bugs reduce execution quality; polish helps", () => {
    const metrics = [
      {
        discipline: "gameplay",
        group: "design",
        importanceWeight: 1,
        completedWorkRatio: 1,
        actualFocus: 0.5,
        targetFocus: 0.5,
        capability: 0.9,
        engineSupport: 0.9,
      },
      {
        discipline: "engine",
        group: "technology",
        importanceWeight: 1,
        completedWorkRatio: 1,
        actualFocus: 0.5,
        targetFocus: 0.5,
        capability: 0.9,
        engineSupport: 0.9,
      },
    ];
    const clean = calculateQuality({
      conceptFit: 80,
      metrics,
      unfixedBugSeverity: 0,
      polishRatio: 1,
    });
    const buggy = calculateQuality({
      conceptFit: 80,
      metrics,
      unfixedBugSeverity: 10,
      polishRatio: 0,
    });
    assert.ok(clean.executionQuality > buggy.executionQuality);
    assert.ok(clean.overallQuality > buggy.overallQuality);
  });

  it("quality has no marketing/price/fans/platform fields", () => {
    const q = calculateQuality({
      conceptFit: 70,
      metrics: [
        {
          discipline: "story",
          group: "design",
          importanceWeight: 1,
          completedWorkRatio: 0.8,
          actualFocus: 0.3,
          targetFocus: 0.3,
          capability: 0.7,
          engineSupport: 0.6,
        },
      ],
      unfixedBugSeverity: 0,
      polishRatio: 0.5,
    });
    assert.ok(q.overallQuality > 0);
    assert.equal("marketing" in q, false);
  });

  it("reviews are deterministic and survive save/load", () => {
    const quality = calculateQuality({
      conceptFit: 85,
      metrics: [
        {
          discipline: "gameplay",
          group: "design",
          importanceWeight: 1,
          completedWorkRatio: 0.95,
          actualFocus: 0.4,
          targetFocus: 0.4,
          capability: 0.85,
          engineSupport: 0.8,
        },
        {
          discipline: "engine",
          group: "technology",
          importanceWeight: 1,
          completedWorkRatio: 0.9,
          actualFocus: 0.3,
          targetFocus: 0.3,
          capability: 0.8,
          engineSupport: 0.75,
        },
      ],
      unfixedBugSeverity: 2,
      polishRatio: 0.8,
    });
    const a = calculateReviews({
      campaignSeed: "camp",
      gameId: "g1",
      releaseDay: 100,
      quality,
    });
    const b = calculateReviews({
      campaignSeed: "camp",
      gameId: "g1",
      releaseDay: 100,
      quality,
    });
    assert.deepEqual(a.outletScores, b.outletScores);
    assert.equal(a.reviewAverage, b.reviewAverage);
    const loaded = JSON.parse(JSON.stringify(a));
    assert.deepEqual(loaded.outletScores, a.outletScores);
  });
});

describe("platform lifecycle", () => {
  it("PC and Commodore remain separate", () => {
    const ids = PLATFORMS.map((p) => p.id);
    assert.ok(ids.includes("pc"));
    assert.ok(ids.includes("commodore"));
    assert.equal(ids.filter((id) => id === "pc").length, 1);
    assert.equal(allPlatformSpecs().length, PLATFORMS.length);
  });

  it("prelaunch cannot release; grows then declines", () => {
    const pc = platformSpecFromDef(getPlatform("pc")!);
    const pre = platformMarketState(pc, { day: pc.launchDay - 1 });
    assert.equal(pre.lifecycle, "prelaunch");
    assert.equal(pre.canRelease, false);
    assert.equal(pre.installedBase, 0);

    const mid = platformMarketState(pc, {
      day: Math.floor((pc.launchDay + pc.peakDay) / 2),
    });
    const peak = platformMarketState(pc, { day: pc.peakDay });
    assert.ok(peak.installedBase >= mid.installedBase);
    assert.equal(peak.lifecycle, "active");

    const late = platformMarketState(pc, {
      day: pc.peakDay + pc.declineHalfLifeDays * 2,
    });
    assert.ok(late.installedBase < peak.installedBase);

    const legacy = platformMarketState(pc, {
      day: (pc.retirementDay ?? pc.peakDay + 1) + 10,
    });
    assert.equal(legacy.lifecycle, "legacy");
    assert.equal(legacy.isLegacy, true);
    // still in catalog and can sell if floor > 0
    assert.ok(legacy.canRelease || legacy.installedBase === 0);
  });

  it("platform values are deterministic; fee preserved", () => {
    const tes = platformSpecFromDef(getPlatform("tes")!);
    const a = platformMarketState(tes, { day: tes.peakDay, audienceId: "everyone" });
    const b = platformMarketState(tes, { day: tes.peakDay, audienceId: "everyone" });
    assert.deepEqual(a, b);
    assert.equal(a.platformFeeRate, tes.platformFeeRate);
    const snap = snapshotPlatformWeek(a);
    const loaded = JSON.parse(JSON.stringify(snap));
    assert.deepEqual(loaded, snap);
  });

  it("unlock gate separate from launch; new unlocks do not delete old", () => {
    const specs = allPlatformSpecs();
    const count = specs.length;
    assert.ok(count >= 40);
    const pc = platformMarketState(specs.find((s) => s.platformId === "pc")!, {
      day: yearToLaunchDay(1990),
    });
    assert.equal(canSelectPlatform(pc, false), false);
    assert.equal(canSelectPlatform(pc, true), pc.canRelease);
    assert.equal(allPlatformSpecs().length, count);
  });
});
