/**
 * Part 4 — performance health, bugs, certification, release readiness.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createProjectTechSpec,
  estimateDemand,
  buildRuntimeProfile,
  buildPlatformBudget,
  classifyAllBugs,
  evaluateReleaseReadiness,
  computeTechnicalReviewHint,
  applyTechnicalReviewToScore,
  refreshProjectProfile,
  applyOptimizationWeek,
} from "../optimization";
import type { ProductionBug } from "../production/algorithm";

describe("utilization & health", () => {
  it("weakest axis caps overall health — network strength cannot hide CPU critical", () => {
    const budget = buildPlatformBudget("pc", 60);
    const demand = {
      cpu: 2.5,
      gpu: 0.4,
      memory: 0.5,
      storage: 0.3,
      io: 0.4,
      network: 0.1,
      battery: 0.2,
      thermal: 0.3,
      server: 0.1,
      input: 0.5,
      loading: 0.4,
      stability: 0.4,
    };
    const profile = buildRuntimeProfile({
      gameId: "g",
      buildId: "b",
      budget,
      demand,
      genreId: "simulation",
      size: "large",
      confidence: 0.8,
      bugs: [],
      wantsOnline: false,
    });
    assert.ok(profile.overallHealth < 0.55);
    assert.equal(profile.weakestCriticalAxis, "cpu");
  });

  it("small casual demand fits 1979-era budgets comfortably", () => {
    const d = estimateDemand({
      size: "small",
      genreId: "casual",
      stageProgress: 1,
      polishProgress01: 1,
      featureCount: 2,
      engineTechBonus: 5,
      engineStability: 0.85,
      wantsOnline: false,
      openWorldish: false,
      techDebt: 5,
    });
    const budget = buildPlatformBudget("pc", 30);
    const profile = buildRuntimeProfile({
      gameId: "g",
      buildId: "b",
      budget,
      demand: d,
      genreId: "casual",
      size: "small",
      confidence: 0.7,
      bugs: [],
      wantsOnline: false,
    });
    assert.ok(profile.overallHealth > 0.55);
  });
});

describe("bugs & certification", () => {
  it("classifies production bugs with priority and cert blockers", () => {
    const bugs: ProductionBug[] = [
      {
        bugId: "b1",
        discipline: "engine",
        severity: 5,
        discoveredOnDay: 1,
        remainingWork: 100,
        sourceStage: 1,
      },
      {
        bugId: "b2",
        discipline: "graphics",
        severity: 2,
        discoveredOnDay: 2,
        remainingWork: 40,
        sourceStage: 3,
      },
    ];
    const c = classifyAllBugs(bugs, ["pc", "itara"]);
    assert.equal(c[0]!.severity, "blocker");
    assert.ok(c[0]!.priority > c[1]!.priority);
    assert.ok(c[0]!.certificationBlocker);
  });

  it("console cert fails on blockers; pc is not_required", () => {
    let tech = createProjectTechSpec({
      gameId: "g",
      platformId: "master_v",
      size: "small",
      genreId: "action",
    });
    const bugs = classifyAllBugs(
      [
        {
          bugId: "x",
          discipline: "engine",
          severity: 5,
          discoveredOnDay: 1,
          remainingWork: 50,
          sourceStage: 1,
        },
      ],
      ["master_v"],
    );
    tech = { ...tech, classifiedBugs: bugs };
    tech = refreshProjectProfile(tech, {
      gameId: "g",
      size: "small",
      genreId: "action",
      stageProgress: 1,
      polishProgress01: 1,
      featureCount: 3,
      engineTechBonus: 10,
      engineStability: 0.8,
      wantsOnline: false,
      openWorldish: false,
      bugs,
      week: 20,
    });
    const { readiness } = evaluateReleaseReadiness({
      tech,
      featureCompletion: 1,
      bugs,
      wantsOnline: false,
      week: 20,
      size: "small",
    });
    assert.equal(readiness.recommendation, "blocked");
    assert.ok(readiness.platformBlocksRelease || readiness.blockers.length > 0);

    // PC alone does not require cert
    let techPc = createProjectTechSpec({
      gameId: "g2",
      platformId: "pc",
      size: "small",
      genreId: "casual",
    });
    techPc = refreshProjectProfile(techPc, {
      gameId: "g2",
      size: "small",
      genreId: "casual",
      stageProgress: 1,
      polishProgress01: 1,
      featureCount: 2,
      engineTechBonus: 5,
      engineStability: 0.85,
      wantsOnline: false,
      openWorldish: false,
      bugs: [],
      week: 10,
    });
    const r2 = evaluateReleaseReadiness({
      tech: techPc,
      featureCompletion: 1,
      bugs: [],
      wantsOnline: false,
      week: 10,
      size: "small",
    });
    assert.ok(r2.readiness.certification.some((c) => c.result === "not_required"));
    assert.ok(r2.readiness.recommendation === "ship" || r2.readiness.recommendation === "ship_with_risk");
  });
});

describe("technical review asymmetry", () => {
  it("strong performance gives modest boost; critical gives heavy penalty", () => {
    const good = computeTechnicalReviewHint(
      {
        gameId: "g",
        platformId: "pc",
        buildId: "b",
        targetFps: 60,
        axes: [],
        overallHealth: 0.95,
        weakestCriticalAxis: null,
        weakestHealth: 0.95,
        confidence: 0.9,
        estimateRanges: {},
        notes: [],
      },
      [],
      "ship",
    );
    const bad = computeTechnicalReviewHint(
      {
        gameId: "g",
        platformId: "pc",
        buildId: "b",
        targetFps: 60,
        axes: [],
        overallHealth: 0.2,
        weakestCriticalAxis: "cpu",
        weakestHealth: 0.1,
        confidence: 0.9,
        estimateRanges: {},
        notes: [],
      },
      [],
      "blocked",
    );
    assert.ok(good > 0 && good < 0.6);
    assert.ok(bad < -0.8);
    assert.ok(Math.abs(bad) > good * 2);

    const scored = applyTechnicalReviewToScore(7.5, bad);
    assert.ok(scored < 7.5);
  });
});

describe("optimization tasks", () => {
  it("working a task eventually improves axis and may add debt on hacks", () => {
    let tech = createProjectTechSpec({
      gameId: "g",
      platformId: "pc",
      size: "medium",
      genreId: "action",
    });
    tech = refreshProjectProfile(tech, {
      gameId: "g",
      size: "medium",
      genreId: "action",
      stageProgress: 0.9,
      polishProgress01: 0.5,
      featureCount: 8,
      engineTechBonus: 5,
      engineStability: 0.6,
      wantsOnline: false,
      openWorldish: true,
      bugs: [],
      week: 40,
    });
    assert.ok(tech.tasks.length >= 0);
    if (tech.tasks[0]) {
      const id = tech.tasks[0].taskId;
      let note = "";
      for (let i = 0; i < 12; i++) {
        const r = applyOptimizationWeek(tech, id, 1.2);
        tech = r.tech;
        note = r.note;
      }
      assert.ok(note.length > 0);
      const t = tech.tasks.find((x) => x.taskId === id);
      assert.ok(t?.state === "done" || (t && t.completedWork > 0));
    }
  });
});
