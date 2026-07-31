/**
 * Unit tests for the GDT-inspired quality engine.
 * Run: node --experimental-strip-types --test src/lib/game/__tests__/qualityEngine.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeBugRatio,
  computePlatformTechModifier,
  computeQualityFactor,
  computeStageTimeShares,
  computeTrendModifier,
  nextTargetHighScore,
  scoreProject,
  INITIAL_TARGET_HIGH_SCORE,
} from "../scoring/qualityEngine.ts";
import { QUALITY, SIZE_SCORE_MULTIPLIER } from "../scoring/config.ts";
import type { DevField, GameProject } from "../types.ts";

function baseProject(over: Partial<GameProject> = {}): GameProject {
  const sliders = {
    engine: 40,
    gameplay: 80,
    story: 70,
    dialogue: 60,
    level: 50,
    ai: 30,
    world: 70,
    graphics: 50,
    sound: 40,
  } as Record<DevField, number>;
  return {
    id: "g1",
    title: "Test RPG",
    topicId: "fantasy",
    genreId: "rpg",
    genre2Id: null,
    platformId: "pc",
    audience: "everyone",
    size: "medium",
    engineId: "basic_engine",
    stage: "done",
    stageProgress: 1,
    sliders,
    designPoints: 80,
    techPoints: 48,
    bugs: 2,
    hype: 10,
    marketingSpend: 0,
    weeksDev: 14,
    features: [],
    ...over,
  };
}

describe("stage time shares", () => {
  it("guarantees 10% + proportional 70%", () => {
    const fields: DevField[] = ["engine", "gameplay", "story"];
    const shares = computeStageTimeShares(fields, {
      engine: 100,
      gameplay: 0,
      story: 0,
      dialogue: 0,
      level: 0,
      ai: 0,
      world: 0,
      graphics: 0,
      sound: 0,
    });
    assert.ok(Math.abs(shares.engine - (0.1 + 0.7)) < 1e-9);
    assert.ok(Math.abs(shares.gameplay - 0.1) < 1e-9);
    assert.ok(Math.abs(shares.story - 0.1) < 1e-9);
  });

  it("divides equally when all zero", () => {
    const fields: DevField[] = ["engine", "gameplay", "story"];
    const shares = computeStageTimeShares(fields, {
      engine: 0,
      gameplay: 0,
      story: 0,
      dialogue: 0,
      level: 0,
      ai: 0,
      world: 0,
      graphics: 0,
      sound: 0,
    });
    assert.ok(Math.abs(shares.engine! - 1 / 3) < 1e-9);
  });
});

describe("perfect RPG", () => {
  it("scores high with design-heavy balance and good combo", () => {
    const design = 100;
    const tech = 60;
    const p = baseProject({ designPoints: design, techPoints: tech, bugs: 0 });
    const result = scoreProject({
      project: p,
      designPoints: design,
      techPoints: tech,
      bugs: 0,
      focusFieldShares: {
        story: 0.45,
        world: 0.42,
        dialogue: 0.4,
        gameplay: 0.35,
        engine: 0.15,
        ai: 0.1,
        level: 0.3,
        graphics: 0.25,
        sound: 0.2,
      },
      targetHighScore: INITIAL_TARGET_HIGH_SCORE,
      previousHighBaseScore: 0,
      office: 1,
      fans: 0,
      graphicsLevel: 1,
      specialistCount: 0,
      gameYearIndex: 1,
      matchesTrend: false,
      seed: 42,
    });
    assert.ok(result.balanceModifier >= 0, `balance mod ${result.balanceModifier}`);
    assert.ok(result.hiddenFinalScore >= 6, `score ${result.hiddenFinalScore}`);
    assert.equal(result.fourCriticScores.length, 4);
    assert.ok(result.bugRatio > 0.95);
  });
});

describe("badly balanced RPG", () => {
  it("applies balance penalty when tech-heavy", () => {
    const design = 40;
    const tech = 120;
    const q = computeQualityFactor({
      designPoints: design,
      techPoints: tech,
      genreId: "rpg",
      focusFieldShares: {
        engine: 0.5,
        ai: 0.5,
        gameplay: 0.1,
        story: 0.1,
        dialogue: 0.05,
        level: 0.1,
        world: 0.1,
        graphics: 0.1,
        sound: 0.1,
      },
      importantFields: ["story", "world", "dialogue", "gameplay"],
      unimportantFields: ["engine", "ai"],
      sameTopicGenreAsPrevious: false,
      isSequel: false,
      sequelWeeksSinceOriginal: null,
      sequelSameEngine: false,
      sequelImprovedEngine: false,
      isMmo: false,
      topicGenreTier: "great",
    });
    assert.equal(q.balanceModifier, QUALITY.balanceBad);
  });
});

describe("repeated topic/genre", () => {
  it("applies -0.40 quality", () => {
    const q = computeQualityFactor({
      designPoints: 80,
      techPoints: 50,
      genreId: "action",
      focusFieldShares: {
        engine: 0.4,
        gameplay: 0.4,
        level: 0.3,
        ai: 0.2,
        story: 0.1,
        dialogue: 0.05,
        world: 0.1,
        graphics: 0.2,
        sound: 0.1,
      },
      importantFields: ["engine", "gameplay", "level"],
      unimportantFields: ["dialogue"],
      sameTopicGenreAsPrevious: true,
      isSequel: false,
      sequelWeeksSinceOriginal: null,
      sequelSameEngine: false,
      sequelImprovedEngine: false,
      isMmo: false,
      topicGenreTier: "great",
    });
    assert.equal(q.repetitionModifier, QUALITY.sameTopicGenrePenalty);
  });
});

describe("premature sequel", () => {
  it("penalizes sequel within 40 weeks", () => {
    const q = computeQualityFactor({
      designPoints: 80,
      techPoints: 50,
      genreId: "action",
      focusFieldShares: {
        engine: 0.4,
        gameplay: 0.4,
        level: 0.3,
        ai: 0.2,
        story: 0.1,
        dialogue: 0.05,
        world: 0.1,
        graphics: 0.2,
        sound: 0.1,
      },
      importantFields: ["engine", "gameplay"],
      unimportantFields: [],
      sameTopicGenreAsPrevious: false,
      isSequel: true,
      sequelWeeksSinceOriginal: 10,
      sequelSameEngine: true,
      sequelImprovedEngine: false,
      isMmo: false,
      topicGenreTier: "good",
    });
    assert.ok(q.sequelModifier <= QUALITY.sequelTooSoonPenalty + QUALITY.sequelSameEnginePenalty);
  });
});

describe("improved sequel", () => {
  it("rewards improved engine on sequel", () => {
    const p = baseProject({
      isSequel: true,
      sequelOf: "old",
      engineId: "eng2",
      designPoints: 90,
      techPoints: 54,
      bugs: 1,
    });
    const result = scoreProject({
      project: p,
      designPoints: 90,
      techPoints: 54,
      bugs: 1,
      previousGame: {
        topicId: "fantasy",
        genreId: "rpg",
        weekReleased: 10,
        engineId: "eng1",
      },
      engines: [
        { id: "eng1", techBonus: 0, designBonus: 0 },
        { id: "eng2", techBonus: 8, designBonus: 5 },
      ],
      sequelWeeksSinceOriginal: 60,
      targetHighScore: 25,
      previousHighBaseScore: 22,
      office: 2,
      fans: 5000,
      graphicsLevel: 2,
      specialistCount: 1,
      gameYearIndex: 3,
      seed: 7,
    });
    assert.ok(result.sequelModifier >= QUALITY.sequelImprovedEngineBonus - 0.01);
  });
});

describe("bug-filled release", () => {
  it("lowers bugRatio and final score", () => {
    const clean = computeBugRatio(0, 100, 100);
    const dirty = computeBugRatio(80, 100, 100);
    assert.equal(clean, 1);
    assert.ok(dirty < 0.75);
    const p = baseProject({ bugs: 80, designPoints: 100, techPoints: 100 });
    const result = scoreProject({
      project: p,
      designPoints: 100,
      techPoints: 100,
      bugs: 80,
      targetHighScore: 20,
      previousHighBaseScore: 0,
      office: 1,
      fans: 0,
      graphicsLevel: 0,
      specialistCount: 0,
      gameYearIndex: 0,
      seed: 1,
    });
    assert.ok(result.bugRatio < 0.7);
  });
});

describe("underskilled AAA", () => {
  it("applies expertise penalty", () => {
    const p = baseProject({ size: "aaa", designPoints: 200, techPoints: 120 });
    const result = scoreProject({
      project: p,
      designPoints: 200,
      techPoints: 120,
      bugs: 5,
      targetHighScore: 40,
      previousHighBaseScore: 30,
      office: 3,
      fans: 200_000,
      graphicsLevel: 1,
      specialistCount: 0,
      gameYearIndex: 10,
      seed: 3,
    });
    assert.ok(result.expertiseModifier < 0.85);
  });
});

describe("multiplatform generation gap", () => {
  it("reduces platform tech modifier", () => {
    const mod = computePlatformTechModifier([2, 8]);
    assert.ok(mod < 1);
    assert.ok(Math.abs(mod - (1 - 6 / 20)) < 1e-9);
  });
});

describe("matching trend", () => {
  it("applies 1.2 trend modifier", () => {
    assert.equal(computeTrendModifier(true, false, "great"), 1.2);
    assert.equal(computeTrendModifier(false, false, "great"), 1.0);
  });
});

describe("target high score update", () => {
  it("raises target only on 9+ hits that beat high base", () => {
    const next = nextTargetHighScore({
      previousTarget: 20,
      previousHighBaseScore: 0,
      baseScore: 35,
      finalScore: 9.2,
      gameYearIndex: 2,
      isFirstQualifyingHit: true,
    });
    assert.ok(next > 20);

    const noUpdate = nextTargetHighScore({
      previousTarget: 40,
      previousHighBaseScore: 35,
      baseScore: 30,
      finalScore: 7,
      gameYearIndex: 5,
      isFirstQualifyingHit: false,
    });
    assert.equal(noUpdate, 40);
  });
});

describe("size multipliers", () => {
  it("uses GDT size divisors", () => {
    assert.equal(SIZE_SCORE_MULTIPLIER.small, 1.0);
    assert.equal(SIZE_SCORE_MULTIPLIER.aaa, 1.8);
  });
});
