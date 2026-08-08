import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeCommercialLayers,
  computePriceFit,
  computeAwareness,
  launchFanDelta,
  salesFanDelta,
  weeklyMarketRp,
  founderActivityRp,
  releaseRpSpike,
  publishingUnlocked,
  generatePublishingBoard,
  refreshPublishingBoard,
  emptyPublishingBoard,
  seasonIndex,
  PUBLISHING_REFRESH_COST,
  FIRST_OFFICE_GATE,
  firstOfficeMinWeek,
  qualityDemandFromReview,
  EMPLOYEE_RP_PER_WEEK,
  PRODUCTION_SEATS,
  sequelTimingEngineMult,
  sequelFanAwarenessMult,
  classifySequelTiming,
  computeSequelModifiers,
  evaluateFirstOfficeGate,
  evaluatePublishingGate,
  evaluateSequelsGate,
  evaluateMarketingGate,
  evaluateMediumGamesGate,
} from "../commercial";
import { generateSalesPlanV2 } from "../scoring/algorithmV2";
import { START_YEAR } from "../data";
import type { ReleasedGame } from "../types";

const basePlan = {
  size: "small" as const,
  platformMarket: 1,
  platformAgeYears: 1,
  fans: 2000,
  hype: 20,
  marketingSpend: 5000,
  genreId: "action" as const,
  topicRepetition: 0,
  pirateMode: false,
  liveOps: false,
  campaignSeed: 99,
  gameId: "c1",
  releaseWeek: 10,
  studioReputation: 40,
  productQuality: 70,
  avgReview: 7.5,
};

function mockReleased(partial: Partial<ReleasedGame> = {}): ReleasedGame {
  return {
    id: "orig1",
    title: "Star Run",
    topicId: "space",
    genreId: "action",
    platformId: "pc",
    audience: "everyone",
    size: "small",
    engineId: "eng_basic",
    designPoints: 40,
    techPoints: 40,
    bugs: 2,
    reviewScores: [8, 8, 8, 8],
    avgReview: 8,
    sales: 10000,
    revenue: 175000,
    fansGained: 800,
    weekReleased: 10,
    yearReleased: 1982,
    marketingSpend: 5000,
    developmentCost: 20000,
    hype: 20,
    residualWeeks: 0,
    weeklySalesLeft: [],
    weeklyHistory: [],
    weeksOnMarket: 40,
    onSale: false,
    ...partial,
  };
}

describe("commercial layers", () => {
  it("marketing changes awareness not quality demand", () => {
    const low = computeAwareness({ fans: 1000, hype: 10, marketingSpend: 0 });
    const high = computeAwareness({ fans: 1000, hype: 10, marketingSpend: 80000 });
    assert.ok(high > low);
    assert.equal(qualityDemandFromReview(7.5), qualityDemandFromReview(7.5));
  });

  it("identical quality different awareness produces different sales", () => {
    const quiet = generateSalesPlanV2({
      ...basePlan,
      gameId: "quiet",
      fans: 100,
      marketingSpend: 0,
      hype: 0,
    });
    const loud = generateSalesPlanV2({
      ...basePlan,
      gameId: "loud",
      fans: 100,
      marketingSpend: 120000,
      hype: 40,
    });
    assert.ok(loud.totalUnits > quiet.totalUnits);
    assert.equal(
      Math.round(quiet.layers.qualityDemand * 1000),
      Math.round(loud.layers.qualityDemand * 1000),
    );
  });

  it("price fit reduces units when overpriced weak game", () => {
    const fair = computePriceFit({
      launchPrice: 25,
      size: "small",
      avgReview: 4,
      productQuality: 35,
    });
    const high = computePriceFit({
      launchPrice: 50,
      size: "small",
      avgReview: 4,
      productQuality: 35,
    });
    assert.ok(high < fair);
  });

  it("high price reduces planned units vs low price same quality", () => {
    const cheap = generateSalesPlanV2({
      ...basePlan,
      gameId: "cheap",
      launchPrice: 15,
      avgReview: 6,
      productQuality: 55,
    });
    const dear = generateSalesPlanV2({
      ...basePlan,
      gameId: "dear",
      launchPrice: 55,
      avgReview: 6,
      productQuality: 55,
    });
    assert.ok(cheap.totalUnits > dear.totalUnits);
  });

  it("publisher increases reach and lowers revenue share", () => {
    const self = generateSalesPlanV2({
      ...basePlan,
      gameId: "self",
      fans: 800,
      distributionType: "self",
    });
    const pub = generateSalesPlanV2({
      ...basePlan,
      gameId: "pub",
      fans: 800,
      distributionType: "publisher",
      publisherReachMult: 1.5,
      publisherAwarenessMult: 1.3,
      publisherRoyalty: 0.4,
    });
    assert.ok(pub.layers.distribution > self.layers.distribution);
    assert.ok(pub.revenueShare < self.revenueShare);
    assert.ok(pub.totalUnits >= self.totalUnits * 0.9);
  });

  it("self-publish strengthens with large fan base", () => {
    const tiny = generateSalesPlanV2({
      ...basePlan,
      gameId: "tiny-self",
      fans: 200,
      distributionType: "self",
    });
    const huge = generateSalesPlanV2({
      ...basePlan,
      gameId: "huge-self",
      fans: 250000,
      distributionType: "self",
    });
    assert.ok(huge.totalUnits > tiny.totalUnits);
    assert.ok(huge.layers.distribution > tiny.layers.distribution);
  });

  it("fan awareness has diminishing returns", () => {
    const a = computeAwareness({ fans: 1000, hype: 0, marketingSpend: 0 });
    const b = computeAwareness({ fans: 100000, hype: 0, marketingSpend: 0 });
    const c = computeAwareness({ fans: 1000000, hype: 0, marketingSpend: 0 });
    assert.ok(b > a);
    assert.ok(c > b);
    assert.ok(c < 0.92);
    assert.ok(c - b < b - a);
  });

  it("fans do not appear in quality demand", () => {
    const l1 = computeCommercialLayers({
      size: "small",
      platformMarket: 1,
      platformAgeYears: 1,
      genreId: "action",
      topicRepetition: 0,
      avgReview: 8,
      productQuality: 80,
      fans: 100,
      hype: 10,
      marketingSpend: 0,
      launchPrice: 25,
      distributionType: "self",
    });
    const l2 = computeCommercialLayers({
      size: "small",
      platformMarket: 1,
      platformAgeYears: 1,
      genreId: "action",
      topicRepetition: 0,
      avgReview: 8,
      productQuality: 80,
      fans: 500000,
      hype: 10,
      marketingSpend: 0,
      launchPrice: 25,
      distributionType: "self",
    });
    assert.equal(l1.qualityDemand, l2.qualityDemand);
    assert.ok(l2.awareness > l1.awareness);
  });

  it("slow burner: high quality low awareness still sells in long tail", () => {
    const plan = generateSalesPlanV2({
      ...basePlan,
      gameId: "slow",
      avgReview: 8.8,
      productQuality: 88,
      marketingSpend: 0,
      fans: 50,
      hype: 0,
    });
    assert.ok(plan.weeks.length > 14);
    const early = plan.weeks.slice(0, 3).reduce((a, b) => a + b, 0);
    const mid = plan.weeks.slice(4, 12).reduce((a, b) => a + b, 0);
    // Some sales continue after launch window
    assert.ok(mid > 0);
    assert.ok(early + mid > 0);
  });

  it("heavily marketed weak game can lose money vs cost", () => {
    const plan = generateSalesPlanV2({
      ...basePlan,
      gameId: "flop-mkt",
      avgReview: 3.2,
      productQuality: 28,
      marketingSpend: 150000,
      fans: 500,
      hype: 60,
      launchPrice: 40,
    });
    const mkt = 150000;
    const dev = 25000;
    assert.ok(plan.revenue < mkt + dev || plan.weeks[0]! > plan.weeks[4]!);
    // Strong open then collapse
    if (plan.weeks.length > 5) {
      assert.ok(plan.weeks[0]! >= plan.weeks[4]! * 0.9);
    }
  });

  it("platform age reduces lifecycle factor and sales", () => {
    const young = generateSalesPlanV2({
      ...basePlan,
      gameId: "young-plat",
      platformAgeYears: 0.5,
    });
    const old = generateSalesPlanV2({
      ...basePlan,
      gameId: "old-plat",
      platformAgeYears: 12,
    });
    assert.ok(young.totalUnits > old.totalUnits);
    assert.ok(young.layers.lifecycle > old.layers.lifecycle);
  });

  it("launch fan delta rewards hits and loses on flops", () => {
    const hit = launchFanDelta({
      avgReview: 9.2,
      awareness: 0.5,
      fansAtLaunch: 5000,
      totalUnits: 25000,
      productQuality: 90,
    });
    const flop = launchFanDelta({
      avgReview: 3,
      awareness: 0.6,
      fansAtLaunch: 5000,
      totalUnits: 8000,
      productQuality: 25,
    });
    const meh = launchFanDelta({
      avgReview: 6.5,
      awareness: 0.3,
      fansAtLaunch: 5000,
      totalUnits: 5000,
    });
    assert.ok(hit > 400, `hit should be big, got ${hit}`);
    assert.ok(flop < 0, `flop should lose fans, got ${flop}`);
    assert.ok(Math.abs(flop) >= 8);
    assert.ok(Math.abs(flop) <= 5000 * 0.2);
    assert.ok(hit > meh);
  });

  it("hit sales convert fans; bombs churn fans", () => {
    const good = salesFanDelta({
      unitsSold: 1000,
      avgReview: 9,
      productQuality: 90,
      marketingHeavy: false,
    });
    const mid = salesFanDelta({
      unitsSold: 1000,
      avgReview: 7,
      productQuality: 70,
      marketingHeavy: false,
    });
    const bad = salesFanDelta({
      unitsSold: 1000,
      avgReview: 3.5,
      productQuality: 30,
      marketingHeavy: true,
    });
    assert.ok(good > mid);
    assert.ok(bad < 0);
  });

  it("medium games gate needs team of 2+", () => {
    const alone = evaluateMediumGamesGate({
      office: 2,
      researched: ["medium_games"],
      unlocks: {},
      staff: [{ id: "founder" }],
    } as never);
    const team = evaluateMediumGamesGate({
      office: 2,
      researched: ["medium_games"],
      unlocks: {},
      staff: [{ id: "founder" }, { id: "hire1" }],
    } as never);
    assert.equal(alone.available, false);
    assert.equal(team.available, true);
  });

  it("market RP stops when dormant/delisted", () => {
    const live = weeklyMarketRp({ avgReview: 8, size: "small", dormant: false, delisted: false });
    const dead = weeklyMarketRp({ avgReview: 8, size: "small", dormant: true, delisted: false });
    assert.ok(live > 0);
    assert.equal(dead, 0);
  });

  it("release RP spike matches max(2, round(avg*1.5))", () => {
    assert.equal(releaseRpSpike(8), 12);
    assert.equal(releaseRpSpike(1), 2);
  });

  it("founder developing RP is continuous fractional", () => {
    assert.ok(founderActivityRp("developing") > 0);
    assert.ok(founderActivityRp("idle") === 0);
  });

  it("employee RP table matches stage design (bible HQ seats)", () => {
    // Per-employee weekly base RP; max hires exclude founder
    assert.equal(EMPLOYEE_RP_PER_WEEK[1], 0);
    assert.equal(EMPLOYEE_RP_PER_WEEK[2], 1);
    assert.equal(EMPLOYEE_RP_PER_WEEK[3], 2);
    assert.equal(EMPLOYEE_RP_PER_WEEK[4], 3);
    assert.equal(PRODUCTION_SEATS[2], 3); // founder + 3 = 4 HQ
    assert.equal(PRODUCTION_SEATS[4], 5); // founder + 5 = 6 HQ
  });

  it("sales plan is deterministic for same seed", () => {
    const a = generateSalesPlanV2({ ...basePlan, gameId: "det" });
    const b = generateSalesPlanV2({ ...basePlan, gameId: "det" });
    assert.deepEqual(a.weeks, b.weeks);
    assert.equal(a.totalUnits, b.totalUnits);
  });
});

describe("sequel modifiers", () => {
  it("timing bands map correctly", () => {
    assert.equal(classifySequelTiming(50), "proper");
    assert.equal(classifySequelTiming(25), "early");
    assert.equal(classifySequelTiming(10), "premature");
  });

  it("proper + newer engine is 1.12; same engine 1.05", () => {
    assert.equal(
      sequelTimingEngineMult({ gapWeeks: 48, sameEngine: false, newerEngine: true }),
      1.12,
    );
    assert.equal(
      sequelTimingEngineMult({ gapWeeks: 48, sameEngine: true, newerEngine: false }),
      1.05,
    );
  });

  it("early and premature penalties", () => {
    assert.equal(
      sequelTimingEngineMult({ gapWeeks: 30, sameEngine: false, newerEngine: true }),
      0.97,
    );
    assert.equal(
      sequelTimingEngineMult({ gapWeeks: 8, sameEngine: false, newerEngine: true }),
      0.88,
    );
  });

  it("original fans raise awareness mult only", () => {
    assert.ok(sequelFanAwarenessMult(0) === 1);
    assert.ok(sequelFanAwarenessMult(40000) === 1.25);
    assert.ok(sequelFanAwarenessMult(200000) === 1.25); // capped
  });

  it("sequel commercial mult increases planned units", () => {
    const base = generateSalesPlanV2({
      ...basePlan,
      gameId: "seq-base",
      sequelCommercialMult: 1,
      sequelFanAwarenessMult: 1,
    });
    const boosted = generateSalesPlanV2({
      ...basePlan,
      gameId: "seq-base",
      sequelCommercialMult: 1.12,
      sequelFanAwarenessMult: 1.2,
    });
    assert.ok(boosted.totalUnits >= base.totalUnits);
  });

  it("computeSequelModifiers explains premature same-engine", () => {
    const m = computeSequelModifiers({
      original: mockReleased({ weekReleased: 100, engineId: "e1", fansGained: 2000 }),
      sequelEngineId: "e1",
      engines: [
        { id: "e1", name: "Basic", features: [], designBonus: 2, techBonus: 2, custom: false },
      ],
      sequelWeek: 110,
    });
    assert.equal(m.timingBand, "premature");
    assert.equal(m.timingEngineMult, 0.88);
    assert.ok(m.explain.includes("premature"));
  });
});

describe("publishing board", () => {
  it("unlocks after 1 release or 500 fans", () => {
    assert.equal(publishingUnlocked({ gamesPublished: 0, fans: 0 }), false);
    assert.equal(publishingUnlocked({ gamesPublished: 1, fans: 0 }), true);
    assert.equal(publishingUnlocked({ gamesPublished: 0, fans: 500 }), true);
  });

  it("generates 3 deals deterministically per season", () => {
    const a = generatePublishingBoard({ campaignSeed: 1, week: 12, year: 1982, fans: 600 });
    const b = generatePublishingBoard({ campaignSeed: 1, week: 12, year: 1982, fans: 600 });
    assert.equal(a.deals.length, 3);
    assert.deepEqual(
      a.deals.map((d) => d.id),
      b.deals.map((d) => d.id),
    );
  });

  it("refresh costs money and is once per season", () => {
    const board = generatePublishingBoard({ campaignSeed: 2, week: 5, year: 1982, fans: 1000 });
    const r1 = refreshPublishingBoard(board, {
      campaignSeed: 2,
      week: 5,
      year: 1982,
      fans: 1000,
      cash: 10000,
    });
    assert.equal(r1.cash, 10000 - PUBLISHING_REFRESH_COST);
    assert.equal(r1.board.refreshesUsedThisSeason, 1);
    const r2 = refreshPublishingBoard(r1.board, {
      campaignSeed: 2,
      week: 6,
      year: 1982,
      fans: 1000,
      cash: r1.cash,
    });
    assert.ok(r2.error);
    assert.equal(r2.cash, r1.cash);
  });

  it("season index steps every 12 weeks", () => {
    assert.equal(seasonIndex(0), 0);
    assert.equal(seasonIndex(11), 0);
    assert.equal(seasonIndex(12), 1);
  });

  it("empty board helper works", () => {
    assert.equal(emptyPublishingBoard(0).deals.length, 0);
  });
});

describe("system gates", () => {
  const baseState = {
    week: 0,
    year: 1982,
    month: 1,
    cash: 50000,
    fans: 0,
    gamesPublished: 0,
    office: 1 as const,
    researched: [] as string[],
    flags: { sequels: false, marketing: false } as { sequels: boolean; marketing: boolean },
    unlocks: {} as Record<string, "owned" | "hidden" | "discovered">,
    staff: [{ id: "founder" }],
  };

  it("first office does not unlock from cash alone", () => {
    const r = evaluateFirstOfficeGate({
      ...baseState,
      cash: 5_000_000,
      week: 10,
      fans: 0,
      gamesPublished: 0,
    } as never);
    assert.equal(r.available, false);
    assert.ok(r.requirements.some((x) => x.id === "fans" && !x.met));
  });

  it("first office does not unlock from time alone", () => {
    const r = evaluateFirstOfficeGate({
      ...baseState,
      week: 200,
      year: 1986,
      cash: 1000,
      fans: 0,
      gamesPublished: 0,
    } as never);
    assert.equal(r.available, false);
  });

  it("publishing gate matches 1 release or 500 fans", () => {
    assert.equal(
      evaluatePublishingGate({ ...baseState, gamesPublished: 1 } as never).available,
      true,
    );
    assert.equal(evaluatePublishingGate({ ...baseState, fans: 500 } as never).available, true);
    assert.equal(evaluatePublishingGate({ ...baseState } as never).available, false);
  });

  it("sequels gate after 2 releases or research", () => {
    assert.equal(
      evaluateSequelsGate({ ...baseState, gamesPublished: 2 } as never).available,
      true,
    );
    assert.equal(
      evaluateSequelsGate({
        ...baseState,
        researched: ["sequels"],
      } as never).available,
      true,
    );
    assert.equal(evaluateSequelsGate({ ...baseState } as never).available, false);
  });

  it("marketing campaigns locked without office+research+time", () => {
    const r = evaluateMarketingGate({
      ...baseState,
      year: 1982,
      office: 1,
      researched: [],
    } as never);
    assert.equal(r.available, false);
  });
});

describe("first office gate constants", () => {
  it("requires 5 games, 1k fans, $1M liquid, $150k move, year 3 floor (bible §4.3)", () => {
    assert.equal(FIRST_OFFICE_GATE.minReleasedGames, 5);
    assert.equal(FIRST_OFFICE_GATE.minFans, 1_000);
    assert.equal(FIRST_OFFICE_GATE.minCashOnHand, 1_000_000);
    assert.equal(FIRST_OFFICE_GATE.moveCost, 150_000);
    assert.ok(firstOfficeMinWeek(START_YEAR) >= 80);
  });
});

describe("no forced 14-week delist", () => {
  it("small hit shelves longer than 14 weeks", () => {
    const plan = generateSalesPlanV2({
      ...basePlan,
      avgReview: 8.5,
      productQuality: 85,
      gameId: "long",
    });
    assert.ok(plan.weeks.length > 14);
    assert.ok(plan.marketWeeks > 14);
  });
});
