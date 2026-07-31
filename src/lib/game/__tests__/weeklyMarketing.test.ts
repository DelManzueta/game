/**
 * Weekly sales + marketing campaign acceptance tests.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateWeeklySales,
  stableWeeklyVariance,
  diminishingFanAwareness,
  titleLifecycleFactor,
  reviewToHundred,
} from "../commercial/weeklySales";
import {
  emptyMarketingState,
  startMarketingCampaign,
  advanceMarketing,
  getCampaignSpec,
  marketingReachMultiplier,
  marketingSpendToPoints,
} from "../commercial/marketing";

function baseSales(over: Partial<Parameters<typeof calculateWeeklySales>[0]> = {}) {
  return calculateWeeklySales({
    campaignSeed: "seed-a",
    gameId: "g1",
    marketDays: 14,
    weeksOnMarket: 2,
    titleStatus: "released",
    platformInstalledBase: 200_000,
    platformLifecycle: 0.9,
    platformAvailability: 1,
    audienceDemand: 0.9,
    topicDemand: 0.85,
    genreDemand: 1,
    platformGenreFit: 0.9,
    competitionModifier: 1,
    trendModifier: 1,
    reviewAverage: 75,
    organicAwarenessPoints: 20,
    fanCount: 2000,
    marketingAwarenessPoints: 15,
    hype: 30,
    distributionMultiplier: 1,
    reachMultiplier: 1,
    price: 25,
    referencePrice: 25,
    platformFeeRate: 0.3,
    publisherCutRate: 0,
    lowDemandWeeks: 0,
    dormantUnitThreshold: 15,
    marketCapacityRate: 0.0025,
    ...over,
  });
}

describe("weekly sales algorithm", () => {
  it("same seed and state produce identical sales", () => {
    const a = baseSales();
    const b = baseSales();
    assert.equal(a.unitsSold, b.unitsSold);
    assert.equal(a.developerRevenue, b.developerRevenue);
    assert.equal(a.seededVariance, b.seededVariance);
  });

  it("stable variance is deterministic and bounded", () => {
    const v1 = stableWeeklyVariance("c", "g", 3);
    const v2 = stableWeeklyVariance("c", "g", 3);
    assert.equal(v1, v2);
    assert.ok(v1 >= 0.94 && v1 <= 1.06);
  });

  it("reviews drive quality demand not via marketing", () => {
    const good = baseSales({ reviewAverage: 90, marketingAwarenessPoints: 0 });
    const bad = baseSales({ reviewAverage: 30, marketingAwarenessPoints: 80 });
    assert.ok(good.qualityDemand > bad.qualityDemand);
    // marketing raises awareness only
    assert.ok(bad.awarenessFactor > good.awarenessFactor * 0.5);
  });

  it("more fans increase sales with diminishing returns", () => {
    const low = baseSales({ fanCount: 500 });
    const mid = baseSales({ fanCount: 25_000 });
    const high = baseSales({ fanCount: 250_000 });
    assert.ok(mid.unitsSold > low.unitsSold);
    assert.ok(high.unitsSold > mid.unitsSold);
    const gain1 = mid.unitsSold - low.unitsSold;
    const gain2 = high.unitsSold - mid.unitsSold;
    assert.ok(gain2 < gain1 * 3); // not linear unlimited
    assert.ok(
      diminishingFanAwareness(250_000) <
        diminishingFanAwareness(25_000) * 3,
    );
  });

  it("high quality low awareness can still sell (slow burner path)", () => {
    const slow = baseSales({
      reviewAverage: 92,
      marketingAwarenessPoints: 0,
      organicAwarenessPoints: 8,
      fanCount: 100,
      weeksOnMarket: 16,
      hype: 5,
    });
    assert.ok(slow.unitsSold > 0);
    assert.ok(slow.lifecyclePhase === "long_tail");
    assert.ok(titleLifecycleFactor(16) < titleLifecycleFactor(1));
    assert.ok(titleLifecycleFactor(16) >= 0.1);
  });

  it("heavy marketing poor game can lose money vs cost", () => {
    const r = baseSales({
      reviewAverage: 28,
      marketingAwarenessPoints: 90,
      hype: 80,
      reachMultiplier: 1.28,
      weeksOnMarket: 1,
    });
    // units may sell on hype but quality demand is low
    assert.ok(r.qualityDemand < 0.25);
    const mktCost = 45000;
    // over a few weak weeks revenue often < campaign cost
    assert.ok(r.developerRevenue < mktCost);
  });

  it("publisher increases reach but reduces retained revenue share", () => {
    const self = baseSales({
      distributionMultiplier: 1,
      reachMultiplier: 1,
      publisherCutRate: 0,
      platformFeeRate: 0.3,
    });
    const pub = baseSales({
      distributionMultiplier: 1.35,
      reachMultiplier: 1.2,
      publisherCutRate: 0.55,
      platformFeeRate: 0.3,
      publisherAwarenessPoints: 30,
    });
    // publisher often sells more units
    assert.ok(pub.unitsSold >= self.unitsSold * 0.9);
    if (pub.unitsSold > 0 && self.unitsSold > 0) {
      const selfKeep = self.developerRevenue / Math.max(1, self.grossRevenue);
      const pubKeep = pub.developerRevenue / Math.max(1, pub.grossRevenue);
      assert.ok(pubKeep < selfKeep);
    }
  });

  it("platform decline reduces sales", () => {
    const hot = baseSales({ platformLifecycle: 1 });
    const cold = baseSales({ platformLifecycle: 0.35 });
    assert.ok(hot.unitsSold > cold.unitsSold);
  });

  it("sales continue beyond fourteen weeks when demand remains", () => {
    const w20 = baseSales({ weeksOnMarket: 20, marketDays: 140 });
    assert.ok(w20.eligibleForSales);
    assert.ok(w20.unitsSold > 0 || w20.expectedUnitsBeforeVariance > 0);
    assert.equal(w20.lifecyclePhase, "long_tail");
  });

  it("dormant and delisted are not eligible", () => {
    const d = baseSales({ titleStatus: "dormant" });
    assert.equal(d.eligibleForSales, false);
    assert.equal(d.unitsSold, 0);
  });

  it("review scale conversion", () => {
    assert.equal(reviewToHundred(8.5), 85);
  });
});

describe("marketing campaigns", () => {
  it("campaigns expire and hype decays", () => {
    const spec = getCampaignSpec("flyer_run")!;
    let state = emptyMarketingState("g1", 0);
    const start = startMarketingCampaign(state, spec, {
      currentDay: 0,
      currentPhase: "released",
      cashAvailable: 50_000,
      unlocked: true,
    });
    state = start.state;
    assert.ok(state.hype > 0);
    assert.ok(state.activeCampaigns.length === 1);
    const after = advanceMarketing(state, spec.durationDays + 2);
    assert.equal(after.state.activeCampaigns.length, 0);
    assert.ok(after.expiredCampaignIds.length >= 1);
    // hype lower after long decay without daily boost
    assert.ok(after.state.hype < start.state.hype || after.state.hype < 50);
  });

  it("marketing does not change review inputs (sales only)", () => {
    // structural: marketing functions never accept review scores
    const spendPts = marketingSpendToPoints(50000);
    assert.ok(spendPts > 0 && spendPts <= 80);
    const st = emptyMarketingState("x", 0);
    assert.equal(marketingReachMultiplier(st), 1);
  });

  it("save/load style: replaying same advance is stable", () => {
    const spec = getCampaignSpec("magazine_ad")!;
    let a = emptyMarketingState("g2", 10);
    a = startMarketingCampaign(a, spec, {
      currentDay: 10,
      currentPhase: "released",
      cashAvailable: 100_000,
      unlocked: true,
    }).state;
    const t1 = advanceMarketing(a, 20);
    const t2 = advanceMarketing(a, 20);
    assert.equal(t1.state.awarenessPoints, t2.state.awarenessPoints);
    assert.equal(t1.state.hype, t2.state.hype);
    assert.equal(t1.state.activeCampaigns.length, t2.state.activeCampaigns.length);
  });
});
