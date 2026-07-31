import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { STAGE_FIELDS, WEEKS_PER_MONTH, defaultSliders } from "../data";
import {
  normalizeStageAllocations,
  stageAllocationTotal,
  computeCraftAndQuality,
  scoreCriticsV2,
  generateSalesPlanV2,
  marketWeeksOnSale,
  MARKET_LONGEVITY_MONTHS,
} from "../scoring/algorithmV2";
import type { GameProject, StaffMember } from "../types";

function baseProject(over: Partial<GameProject> = {}): GameProject {
  const sliders = defaultSliders("action");
  const s1 = normalizeStageAllocations(STAGE_FIELDS[1], { ...sliders, engine: 50, gameplay: 35, story: 15 });
  const s2 = normalizeStageAllocations(STAGE_FIELDS[2], { ...sliders, dialogue: 20, level: 40, ai: 40 });
  const s3 = normalizeStageAllocations(STAGE_FIELDS[3], { ...sliders, world: 20, graphics: 50, sound: 30 });
  return {
    id: "game_test",
    title: "Test Game",
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
    designPoints: 40,
    techPoints: 55,
    researchEarned: 5,
    bugs: 3,
    hype: 10,
    marketingSpend: 0,
    developmentCost: 20000,
    weeksDev: 8,
    features: ["Basic Save"],
    rngSeed: 42,
    ...over,
  };
}

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
    energy: 90,
    fieldExperience: { gameplay: 20, engine: 15 },
  },
];

describe("algorithm V2", () => {
  it("stage allocations total 100", () => {
    const a = normalizeStageAllocations(STAGE_FIELDS[1], {
      engine: 50,
      gameplay: 35,
      story: 15,
    } as never);
    assert.equal(stageAllocationTotal(a), 100);
  });

  it("cannot max every discipline in one stage", () => {
    const a = normalizeStageAllocations(STAGE_FIELDS[1], {
      engine: 100,
      gameplay: 100,
      story: 100,
    } as never);
    assert.equal(stageAllocationTotal(a), 100);
    assert.ok((a.engine ?? 0) < 100 || (a.gameplay ?? 0) < 100);
  });

  it("slider allocation changes quality predictably", () => {
    const good = baseProject();
    const badFocus = baseProject({
      stageConfigs: {
        1: normalizeStageAllocations(STAGE_FIELDS[1], { engine: 10, gameplay: 10, story: 80 } as never),
        2: normalizeStageAllocations(STAGE_FIELDS[2], { dialogue: 70, level: 15, ai: 15 } as never),
        3: normalizeStageAllocations(STAGE_FIELDS[3], { world: 70, graphics: 15, sound: 15 } as never),
      },
    });
    const qGood = computeCraftAndQuality({
      project: good,
      staff,
      platformMarket: 1,
      platformTechCeiling: 1,
      seed: 1,
    });
    const qBad = computeCraftAndQuality({
      project: badFocus,
      staff,
      platformMarket: 1,
      platformTechCeiling: 1,
      seed: 1,
    });
    assert.ok(
      qGood.focusAlignment > qBad.focusAlignment,
      `focus ${qGood.focusAlignment} vs ${qBad.focusAlignment}`,
    );
  });

  it("previous 10/10 does not lower product quality", () => {
    const p = baseProject();
    const a = computeCraftAndQuality({
      project: p,
      staff,
      platformMarket: 1,
      platformTechCeiling: 1,
      previousAvgReview: 5,
      seed: 9,
    });
    const b = computeCraftAndQuality({
      project: p,
      staff,
      platformMarket: 1,
      platformTechCeiling: 1,
      previousAvgReview: 10,
      seed: 9,
    });
    assert.equal(a.productQuality, b.productQuality);
  });

  it("bugs reduce polish", () => {
    const clean = computeCraftAndQuality({
      project: baseProject({ bugs: 1 }),
      staff,
      platformMarket: 1,
      platformTechCeiling: 1,
      seed: 2,
    });
    const buggy = computeCraftAndQuality({
      project: baseProject({ bugs: 24 }),
      staff,
      platformMarket: 1,
      platformTechCeiling: 1,
      seed: 2,
    });
    assert.ok(clean.polish > buggy.polish);
    assert.ok(buggy.bugPenalty > clean.bugPenalty);
  });

  it("identical seeds produce identical reviews", () => {
    const p = baseProject();
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

  it("marketing does not change product quality", () => {
    const p = baseProject({ marketingSpend: 0 });
    const q1 = computeCraftAndQuality({
      project: p,
      staff,
      platformMarket: 1,
      platformTechCeiling: 1,
      seed: 3,
    });
    const q2 = computeCraftAndQuality({
      project: baseProject({ marketingSpend: 200000 }),
      staff,
      platformMarket: 1,
      platformTechCeiling: 1,
      seed: 3,
    });
    assert.equal(q1.productQuality, q2.productQuality);
  });

  it("sales history matches weeks array and is deterministic", () => {
    const a = generateSalesPlanV2({
      productQuality: 78,
      avgReview: 7.5,
      size: "small",
      platformMarket: 1,
      platformAgeYears: 1,
      fans: 1000,
      hype: 20,
      marketingSpend: 5000,
      genreId: "action",
      topicRepetition: 0,
      pirateMode: false,
      liveOps: false,
      campaignSeed: 99,
      gameId: "g1",
      releaseWeek: 5,
      studioReputation: 40,
    });
    const b = generateSalesPlanV2({
      productQuality: 78,
      avgReview: 7.5,
      size: "small",
      platformMarket: 1,
      platformAgeYears: 1,
      fans: 1000,
      hype: 20,
      marketingSpend: 5000,
      genreId: "action",
      topicRepetition: 0,
      pirateMode: false,
      liveOps: false,
      campaignSeed: 99,
      gameId: "g1",
      releaseWeek: 5,
      studioReputation: 40,
    });
    assert.deepEqual(a.weeks, b.weeks);
    assert.equal(a.history.length, a.weeks.length);
    for (let i = 0; i < a.weeks.length; i++) {
      assert.equal(a.history[i]!.units, a.weeks[i]);
    }
  });

  it("high marketing low quality can front-load then decline", () => {
    const bad = generateSalesPlanV2({
      productQuality: 35,
      avgReview: 3.5,
      size: "medium",
      platformMarket: 1.2,
      platformAgeYears: 0,
      fans: 5000,
      hype: 40,
      marketingSpend: 150000,
      genreId: "action",
      topicRepetition: 0,
      pirateMode: false,
      liveOps: false,
      campaignSeed: 7,
      gameId: "badmkt",
      releaseWeek: 0,
      studioReputation: 30,
    });
    assert.ok(bad.weeks[0]! > bad.weeks[Math.min(5, bad.weeks.length - 1)]!);
  });

  it("review comments are non-empty", () => {
    const r = scoreCriticsV2({
      project: baseProject({ bugs: 18 }),
      staff,
      platformMarket: 1,
      platformTechCeiling: 1,
      campaignSeed: 1,
      week: 1,
    });
    for (const rev of r.reviews) {
      assert.ok(rev.comment.length > 10);
    }
  });

  it("market longevity matches size bands; better scores last longer", () => {
    assert.equal(
      marketWeeksOnSale("small", 2),
      MARKET_LONGEVITY_MONTHS.small.minMonths * WEEKS_PER_MONTH,
    );
    assert.equal(
      marketWeeksOnSale("small", 9.5),
      MARKET_LONGEVITY_MONTHS.small.maxMonths * WEEKS_PER_MONTH,
    );
    assert.equal(
      marketWeeksOnSale("medium", 2),
      MARKET_LONGEVITY_MONTHS.medium.minMonths * WEEKS_PER_MONTH,
    );
    assert.equal(
      marketWeeksOnSale("medium", 9.5),
      MARKET_LONGEVITY_MONTHS.medium.maxMonths * WEEKS_PER_MONTH,
    );
    assert.equal(
      marketWeeksOnSale("large", 2),
      MARKET_LONGEVITY_MONTHS.large.minMonths * WEEKS_PER_MONTH,
    );
    assert.equal(
      marketWeeksOnSale("large", 9.5),
      MARKET_LONGEVITY_MONTHS.large.maxMonths * WEEKS_PER_MONTH,
    );
    assert.equal(
      marketWeeksOnSale("aaa", 2),
      MARKET_LONGEVITY_MONTHS.aaa.minMonths * WEEKS_PER_MONTH,
    );
    assert.equal(
      marketWeeksOnSale("aaa", 9.5),
      MARKET_LONGEVITY_MONTHS.aaa.maxMonths * WEEKS_PER_MONTH,
    );

    assert.ok(marketWeeksOnSale("small", 8) > marketWeeksOnSale("small", 4));
    assert.ok(marketWeeksOnSale("medium", 8) > marketWeeksOnSale("medium", 5));
    assert.ok(marketWeeksOnSale("aaa", 9) > marketWeeksOnSale("large", 9));
    assert.ok(marketWeeksOnSale("large", 7) > marketWeeksOnSale("medium", 7));
  });

  it("sales plan length follows size + score market longevity", () => {
    const hit = generateSalesPlanV2({
      productQuality: 90,
      avgReview: 9,
      size: "aaa",
      platformMarket: 1,
      platformAgeYears: 1,
      fans: 5000,
      hype: 40,
      marketingSpend: 20000,
      genreId: "action",
      topicRepetition: 0,
      pirateMode: false,
      liveOps: false,
      campaignSeed: 1,
      gameId: "aaa-hit",
      releaseWeek: 0,
      studioReputation: 50,
    });
    const flop = generateSalesPlanV2({
      productQuality: 30,
      avgReview: 3,
      size: "small",
      platformMarket: 1,
      platformAgeYears: 1,
      fans: 100,
      hype: 5,
      marketingSpend: 0,
      genreId: "action",
      topicRepetition: 0,
      pirateMode: false,
      liveOps: false,
      campaignSeed: 1,
      gameId: "small-flop",
      releaseWeek: 0,
      studioReputation: 20,
    });
    assert.ok(hit.weeks.length >= 24 * WEEKS_PER_MONTH);
    assert.ok(hit.weeks.length <= 30 * WEEKS_PER_MONTH);
    assert.ok(flop.weeks.length >= 7 * WEEKS_PER_MONTH);
    assert.ok(flop.weeks.length <= 10 * WEEKS_PER_MONTH);
    assert.ok(hit.weeks.length > flop.weeks.length);
    const late = hit.weeks.slice(20).reduce((s, u) => s + u, 0);
    assert.ok(late > 0, "AAA hit should still sell after month 5");
  });

});
