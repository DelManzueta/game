/**
 * Garage Vertical Slice policy harness.
 * Proves determinism, focus, polish cost, price≠quality, cancel, knowledge, save identity.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { STAGE_FIELDS, defaultSliders } from "../data";
import {
  normalizeStageAllocations,
  computeCraftAndQuality,
  scoreCriticsV2,
  generateSalesPlanV2,
} from "../scoring/algorithmV2";
import { hashSeed } from "../scoring/rng";
import { seedFromString, defaultLaunchPrice, emptyKnowledge, SCHEMA_VERSION } from "../contracts";
import {
  applyCancelKnowledge,
  applyReportKnowledge,
  buildReportInsights,
} from "../knowledge";
import {
  GARAGE_TOPIC_IDS,
  GARAGE_PLATFORM_IDS,
  GARAGE_GENRE_IDS,
  isGarageTopic,
  isGaragePlatform,
} from "../content/garageSlice";
import { developWeek } from "../simulation";
import type { GameProject, ReleasedGame, StaffMember } from "../types";

const staff: StaffMember[] = [
  {
    id: "founder",
    name: "You",
    design: 50,
    tech: 50,
    speed: 50,
    salary: 0,
    level: 2,
    xp: 20,
    busy: false,
    energy: 100,
    fieldExperience: { gameplay: 20, engine: 15, level: 10 },
  },
];

function focusedProject(over: Partial<GameProject> = {}): GameProject {
  const sliders = defaultSliders("action");
  // Action wants engine/gameplay/level/ai/graphics etc.
  const s1 = normalizeStageAllocations(STAGE_FIELDS[1], {
    ...sliders,
    engine: 55,
    gameplay: 40,
    story: 5,
  });
  const s2 = normalizeStageAllocations(STAGE_FIELDS[2], {
    ...sliders,
    dialogue: 10,
    level: 50,
    ai: 40,
  });
  const s3 = normalizeStageAllocations(STAGE_FIELDS[3], {
    ...sliders,
    world: 15,
    graphics: 55,
    sound: 30,
  });
  return {
    id: "game_focused",
    title: "Focused Action",
    topicId: "military",
    genreId: "action",
    platformId: "pc",
    audience: "everyone",
    size: "small",
    engineId: "basic",
    stage: 3,
    stageProgress: 1,
    devPhase: "POLISHING",
    stageConfigs: { 1: s1, 2: s2, 3: s3 },
    sliders: { ...sliders, ...s1, ...s2, ...s3 },
    designPoints: 48,
    techPoints: 52,
    researchEarned: 4,
    bugs: 3,
    hype: 12,
    marketingSpend: 0,
    developmentCost: 20000,
    weeksDev: 10,
    features: ["Basic Save"],
    rngSeed: 42,
    launchPrice: 25,
    ...over,
  };
}

function bloatedProject(): GameProject {
  // Max-everything intent that still normalizes, but wrong field emphasis for action
  const sliders = defaultSliders("action");
  const s1 = normalizeStageAllocations(STAGE_FIELDS[1], {
    ...sliders,
    engine: 100,
    gameplay: 100,
    story: 100,
  });
  const s2 = normalizeStageAllocations(STAGE_FIELDS[2], {
    ...sliders,
    dialogue: 100,
    level: 100,
    ai: 100,
  });
  const s3 = normalizeStageAllocations(STAGE_FIELDS[3], {
    ...sliders,
    world: 100,
    graphics: 100,
    sound: 100,
  });
  return focusedProject({
    id: "game_bloated",
    title: "Max Mess",
    stageConfigs: { 1: s1, 2: s2, 3: s3 },
    sliders: { ...sliders, ...s1, ...s2, ...s3 },
    designPoints: 40,
    techPoints: 40,
    bugs: 12,
    rngSeed: 99,
  });
}

function releasedFrom(
  p: GameProject,
  reviews: { scores: number[]; avg: number; productQuality: number },
): ReleasedGame {
  return {
    id: p.id,
    title: p.title,
    topicId: p.topicId,
    genreId: p.genreId,
    platformId: p.platformId,
    audience: p.audience,
    size: p.size,
    engineId: p.engineId,
    designPoints: p.designPoints,
    techPoints: p.techPoints,
    bugs: p.bugs,
    reviewScores: reviews.scores,
    avgReview: reviews.avg,
    sales: 0,
    revenue: 0,
    fansGained: 100,
    weekReleased: 12,
    yearReleased: 1985,
    marketingSpend: p.marketingSpend,
    developmentCost: p.developmentCost,
    hype: p.hype,
    residualWeeks: 20,
    weeklySalesLeft: [100, 80, 60],
    weeklyHistory: [],
    weeksOnMarket: 0,
    onSale: true,
    productQuality: reviews.productQuality,
    launchPrice: p.launchPrice ?? 25,
    outcomeTrace: {
      campaignSeed: 1,
      projectSeed: p.rngSeed ?? 0,
      releaseWeek: 12,
      productQuality: reviews.productQuality,
      reviewScores: reviews.scores,
      avgReview: reviews.avg,
      hiddenFinalScore: reviews.avg,
      weeklySalesPlan: [100, 80, 60],
      knowledgeKeys: [],
      algorithm: "v2",
    },
  };
}

describe("garage content slice", () => {
  it("exposes ~12 topics and early garage platforms", () => {
    assert.ok(GARAGE_TOPIC_IDS.length >= 8 && GARAGE_TOPIC_IDS.length <= 14);
    assert.equal(GARAGE_PLATFORM_IDS.length, 10);
    assert.equal(GARAGE_GENRE_IDS.length, 6);
    assert.ok(isGarageTopic("space"));
    assert.ok(isGaragePlatform("pc"));
    assert.ok(isGaragePlatform("itara"));
    assert.equal(isGarageTopic("mecha"), false);
  });

  it("schema version is 6", () => {
    assert.equal(SCHEMA_VERSION, 6);
  });

  it("campaign seed is deterministic from company name", () => {
    assert.equal(seedFromString("Garage Games|garage|0"), seedFromString("Garage Games|garage|0"));
    assert.notEqual(seedFromString("A"), seedFromString("B"));
  });
});

describe("garage policy: focus and craft", () => {
  it("focused single-genre allocation beats max-everything mess", () => {
    const good = focusedProject();
    const bad = bloatedProject();
    const qGood = computeCraftAndQuality({
      project: good,
      staff,
      platformMarket: 1,
      platformTechCeiling: 1,
      seed: 1,
    });
    const qBad = computeCraftAndQuality({
      project: bad,
      staff,
      platformMarket: 1,
      platformTechCeiling: 1,
      seed: 1,
    });
    assert.ok(
      qGood.productQuality > qBad.productQuality || qGood.focusAlignment > qBad.focusAlignment,
      `focused ${qGood.productQuality}/${qGood.focusAlignment} vs bloated ${qBad.productQuality}/${qBad.focusAlignment}`,
    );
  });

  it("stage allocations never total free max-everything", () => {
    const a = normalizeStageAllocations(STAGE_FIELDS[1], {
      engine: 100,
      gameplay: 100,
      story: 100,
    } as never);
    const total = Object.values(a).reduce((s, v) => s + (v ?? 0), 0);
    assert.equal(Math.round(total), 100);
  });

  it("polish has cost: bugs reduce quality", () => {
    const clean = computeCraftAndQuality({
      project: focusedProject({ bugs: 1 }),
      staff,
      platformMarket: 1,
      platformTechCeiling: 1,
      seed: 5,
    });
    const buggy = computeCraftAndQuality({
      project: focusedProject({ bugs: 28 }),
      staff,
      platformMarket: 1,
      platformTechCeiling: 1,
      seed: 5,
    });
    assert.ok(clean.productQuality > buggy.productQuality);
    assert.ok(buggy.bugPenalty > clean.bugPenalty);
  });

  it("price does not change product quality", () => {
    const a = computeCraftAndQuality({
      project: focusedProject({ launchPrice: 10 }),
      staff,
      platformMarket: 1,
      platformTechCeiling: 1,
      seed: 3,
    });
    const b = computeCraftAndQuality({
      project: focusedProject({ launchPrice: 60 }),
      staff,
      platformMarket: 1,
      platformTechCeiling: 1,
      seed: 3,
    });
    assert.equal(a.productQuality, b.productQuality);
  });

  it("default launch prices scale with size", () => {
    assert.ok(defaultLaunchPrice("small") < defaultLaunchPrice("medium"));
    assert.ok(defaultLaunchPrice("medium") < defaultLaunchPrice("large"));
  });
});

describe("garage policy: determinism", () => {
  it("identical seeds produce identical reviews", () => {
    const p = focusedProject();
    const opts = {
      project: p,
      staff,
      platformMarket: 1.1,
      platformTechCeiling: 1,
      campaignSeed: 12345,
      week: 10,
    };
    const a = scoreCriticsV2(opts);
    const b = scoreCriticsV2(opts);
    assert.deepEqual(a.scores, b.scores);
    assert.equal(a.avg, b.avg);
    assert.equal(a.productQuality, b.productQuality);
  });

  it("polish bug-fix is deterministic", () => {
    const base = focusedProject({
      devPhase: "POLISHING",
      stage: 3,
      stageProgress: 1,
      bugs: 10,
      weeksDev: 12,
      rngSeed: 777,
    });
    const a = developWeek(structuredClone(base), structuredClone(staff), {
      designBoost: 0,
      techBoost: 0,
      qa: false,
    });
    const b = developWeek(structuredClone(base), structuredClone(staff), {
      designBoost: 0,
      techBoost: 0,
      qa: false,
    });
    assert.equal(a.project.bugs, b.project.bugs);
    assert.equal(a.project.designPoints, b.project.designPoints);
  });

  it("sales plan is deterministic and long enough for slow-burn", () => {
    const plan = generateSalesPlanV2({
      productQuality: 82,
      avgReview: 8.1,
      size: "small",
      platformMarket: 1,
      platformAgeYears: 1,
      fans: 200,
      hype: 5,
      marketingSpend: 0,
      genreId: "action",
      topicRepetition: 0,
      pirateMode: false,
      liveOps: false,
      campaignSeed: 11,
      gameId: "slow1",
      releaseWeek: 4,
      studioReputation: 25,
    });
    const plan2 = generateSalesPlanV2({
      productQuality: 82,
      avgReview: 8.1,
      size: "small",
      platformMarket: 1,
      platformAgeYears: 1,
      fans: 200,
      hype: 5,
      marketingSpend: 0,
      genreId: "action",
      topicRepetition: 0,
      pirateMode: false,
      liveOps: false,
      campaignSeed: 11,
      gameId: "slow1",
      releaseWeek: 4,
      studioReputation: 25,
    });
    assert.deepEqual(plan.weeks, plan2.weeks);
    assert.ok(plan.weeks.length >= 8, "long-tail weeks expected");
    // tail can still produce units for quality games
    const late = plan.weeks.slice(4).reduce((s, u) => s + u, 0);
    assert.ok(late > 0, "slow-burner: late weeks still sell");
  });

  it("outcome trace identity survives JSON save/load", () => {
    const p = focusedProject();
    const reviews = scoreCriticsV2({
      project: p,
      staff,
      platformMarket: 1,
      platformTechCeiling: 1,
      campaignSeed: 9,
      week: 5,
    });
    const g = releasedFrom(p, {
      scores: reviews.scores,
      avg: reviews.avg,
      productQuality: reviews.productQuality,
    });
    const raw = JSON.stringify(g);
    const loaded = JSON.parse(raw) as ReleasedGame;
    assert.deepEqual(loaded.outcomeTrace, g.outcomeTrace);
    assert.deepEqual(loaded.reviewScores, g.reviewScores);
    assert.equal(loaded.avgReview, g.avgReview);
  });
});

describe("garage policy: cancel + knowledge", () => {
  it("cancel path records knowledge without reviews", () => {
    const k0 = emptyKnowledge();
    const k1 = applyCancelKnowledge(k0, {
      projectId: "p1",
      topicId: "space",
      genreId: "action",
      weeksDev: 6,
      week: 10,
    });
    assert.equal(k1.entries.length, 1);
    assert.equal(k1.entries[0]!.kind, "lesson");
    // idempotent
    const k2 = applyCancelKnowledge(k1, {
      projectId: "p1",
      topicId: "space",
      genreId: "action",
      weeksDev: 6,
      week: 10,
    });
    assert.equal(k2.entries.length, 1);
  });

  it("report knowledge persists combo stats across games", () => {
    const p = focusedProject({ bugs: 1 });
    const reviews = scoreCriticsV2({
      project: p,
      staff,
      platformMarket: 1,
      platformTechCeiling: 1,
      campaignSeed: 2,
      week: 8,
    });
    const g1 = releasedFrom(p, {
      scores: reviews.scores,
      avg: reviews.avg,
      productQuality: reviews.productQuality,
    });
    g1.sales = 5000;
    g1.revenue = 87500;
    g1.qualityBreakdownV2 = reviews.qualityBreakdownV2;

    const r1 = applyReportKnowledge(emptyKnowledge(), g1, 20);
    assert.ok(r1.newEntries.length >= 1);
    assert.ok(r1.rpBonus > 0);

    const g2 = { ...g1, id: "game_focused_2", sales: 3000, revenue: 50000 };
    const r2 = applyReportKnowledge(r1.knowledge, g2, 40);
    const comboKey = `military:action`;
    assert.ok(r2.knowledge.comboStats[comboKey]);
    assert.equal(r2.knowledge.comboStats[comboKey]!.plays, 2);

    // re-report same game adds nothing
    const r3 = applyReportKnowledge(r2.knowledge, g2, 41);
    assert.equal(r3.newEntries.length, 0);
  });

  it("buildReportInsights teaches from bugs and concept fit", () => {
    const g = releasedFrom(focusedProject({ bugs: 12 }), {
      scores: [4, 4.5, 3.5, 4],
      avg: 4,
      productQuality: 38,
    });
    g.qualityBreakdownV2 = { conceptFit: 0.5, designTechBalance: 0.6, focusAlignment: 0.5 };
    const entries = buildReportInsights(g, 15);
    assert.ok(entries.some((e) => e.kind === "weakness" || e.kind === "lesson"));
  });
});

describe("garage policy: project seed hashing", () => {
  it("project seed derives stably from campaign + design choices", () => {
    const a = hashSeed(100, 0, "space", "action", "pc", "project");
    const b = hashSeed(100, 0, "space", "action", "pc", "project");
    const c = hashSeed(100, 1, "space", "action", "pc", "project");
    assert.equal(a, b);
    assert.notEqual(a, c);
  });
});
