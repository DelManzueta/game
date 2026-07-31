/**
 * Deterministic weekly sales — ALGORITHM 1 (integrated).
 * Begins at Reviews. Never recalculates quality or reviews.
 * Concept Fit → … → Reviews → Market Demand → Weekly Sales → Fans/Knowledge
 */
import { hashSeed } from "../scoring/rng";
import { SeededRng } from "../scoring/rng";

export function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

/** Deterministic variance 0.94–1.06 from campaign seed + game + week. */
export function stableWeeklyVariance(
  campaignSeed: string | number,
  gameId: string,
  marketWeek: number,
): number {
  const seed = hashSeed(campaignSeed, gameId, "sales", marketWeek);
  return new SeededRng(seed).range(0.94, 1.06);
}

/** Reviews (0–100 scale) → quality demand. Weak games still sell some. */
export function boundedReviewCurve(reviewAverage: number): number {
  const score = clamp(reviewAverage, 0, 100) / 100;
  return 0.05 + 0.95 * Math.pow(score, 1.35);
}

/** Fans → awareness points with diminishing returns. Never touches quality. */
export function diminishingFanAwareness(
  fanCount: number,
  fanScale = 25_000,
  maximumPoints = 45,
): number {
  const fans = Math.max(0, fanCount);
  return maximumPoints * (1 - Math.exp(-fans / fanScale));
}

/** Title lifecycle (not platform lifecycle). No forced 14-week delist. */
export function titleLifecycleFactor(weeksOnMarket: number): number {
  const week = Math.max(0, weeksOnMarket);
  if (week <= 1) return 1.3;
  if (week <= 4) return 1.1;
  if (week <= 11) return 1.0;
  return Math.max(0.1, 0.85 * Math.exp(-0.08 * (week - 11)));
}

export function titleLifecyclePhase(weeksOnMarket: number): string {
  const week = Math.max(0, weeksOnMarket);
  if (week <= 1) return "launch_window";
  if (week <= 4) return "growth";
  if (week <= 11) return "mature_sales";
  return "long_tail";
}

export function priceFit(price: number, referencePrice: number): number {
  if (referencePrice <= 0) return 1;
  const ratio = Math.max(0, price) / referencePrice;
  if (ratio <= 1) return Math.min(1.15, 1 + (1 - ratio) * 0.3);
  return clamp(Math.exp(-2 * (ratio - 1)), 0.25, 1);
}

export type TitleStatus = "pre_release" | "released" | "dormant" | "delisted";

export type SalesInput = {
  campaignSeed: string | number;
  gameId: string;
  marketDays: number;
  weeksOnMarket: number;
  titleStatus: TitleStatus;
  platformInstalledBase: number;
  platformLifecycle: number;
  platformAvailability: number;
  audienceDemand: number;
  topicDemand: number;
  genreDemand: number;
  platformGenreFit: number;
  competitionModifier: number;
  trendModifier: number;
  /** Review average on 0–100 scale (convert from 0–10 with ×10). */
  reviewAverage: number;
  organicAwarenessPoints: number;
  fanCount: number;
  marketingAwarenessPoints: number;
  publisherAwarenessPoints?: number;
  mediaAwarenessPoints?: number;
  eventAwarenessPoints?: number;
  hype?: number;
  distributionMultiplier?: number;
  reachMultiplier?: number;
  price?: number;
  referencePrice?: number;
  platformFeeRate?: number;
  publisherCutRate?: number;
  lowDemandWeeks?: number;
  dormantAfterLowDemandWeeks?: number;
  dormantUnitThreshold?: number;
  marketCapacityRate?: number;
};

export type WeeklySalesResult = {
  eligibleForSales: boolean;
  marketWeek: number;
  lifecyclePhase: string;
  marketPotential: number;
  qualityDemand: number;
  rawAwarenessPoints: number;
  awarenessFactor: number;
  fanAwarenessPoints: number;
  hypeFactor: number;
  priceFactor: number;
  titleLifecycleFactor: number;
  seededVariance: number;
  expectedUnitsBeforeVariance: number;
  unitsSold: number;
  grossRevenue: number;
  platformFee: number;
  publisherCut: number;
  developerRevenue: number;
  nextTitleStatus: TitleStatus;
  nextLowDemandWeeks: number;
};

export function calculateWeeklySales(sales: SalesInput): WeeklySalesResult {
  const phase = titleLifecyclePhase(sales.weeksOnMarket);
  const titleFactor = titleLifecycleFactor(sales.weeksOnMarket);
  const fanAwareness = diminishingFanAwareness(sales.fanCount);

  const rawAwareness = Math.max(
    0,
    sales.organicAwarenessPoints +
      fanAwareness +
      sales.marketingAwarenessPoints +
      (sales.publisherAwarenessPoints ?? 0) +
      (sales.mediaAwarenessPoints ?? 0) +
      (sales.eventAwarenessPoints ?? 0),
  );

  const awarenessFactor = clamp(1 - Math.exp(-rawAwareness / 120), 0, 1);
  const qualityDemand = boundedReviewCurve(sales.reviewAverage);
  const hypeFactor = 0.8 + 0.7 * (clamp(sales.hype ?? 0, 0, 100) / 100);
  const priceFactor = priceFit(sales.price ?? 29.99, sales.referencePrice ?? 29.99);

  const marketPotential =
    Math.max(0, sales.platformInstalledBase) *
    Math.max(0, sales.marketCapacityRate ?? 0.0025) *
    clamp(sales.platformLifecycle, 0, 1) *
    clamp(sales.platformAvailability, 0, 1) *
    clamp(sales.audienceDemand, 0, 1) *
    clamp(sales.topicDemand, 0, 1) *
    clamp(sales.genreDemand, 0, 1) *
    clamp(sales.platformGenreFit, 0, 1) *
    Math.max(0, sales.competitionModifier) *
    Math.max(0, sales.trendModifier);

  const eligible =
    sales.marketDays >= 7 &&
    sales.titleStatus !== "pre_release" &&
    sales.titleStatus !== "dormant" &&
    sales.titleStatus !== "delisted";

  let expectedUnits = 0;
  let variance = 1;
  let unitsSold = 0;

  if (eligible) {
    expectedUnits =
      marketPotential *
      qualityDemand *
      awarenessFactor *
      hypeFactor *
      priceFactor *
      Math.max(0, sales.distributionMultiplier ?? 1) *
      Math.max(0, sales.reachMultiplier ?? 1) *
      titleFactor;

    variance = stableWeeklyVariance(
      sales.campaignSeed,
      sales.gameId,
      sales.weeksOnMarket,
    );
    unitsSold = Math.max(0, Math.floor(expectedUnits * variance));
  }

  const price = Math.max(0, sales.price ?? 29.99);
  const grossRevenue = unitsSold * price;
  const platformFee = grossRevenue * clamp(sales.platformFeeRate ?? 0, 0, 1);
  const revenueAfterPlatform = grossRevenue - platformFee;
  const publisherCut =
    revenueAfterPlatform * clamp(sales.publisherCutRate ?? 0, 0, 1);
  const developerRevenue = Math.max(0, revenueAfterPlatform - publisherCut);

  const lowDemand = sales.lowDemandWeeks ?? 0;
  const threshold = sales.dormantUnitThreshold ?? 0;
  const dormantAfter = sales.dormantAfterLowDemandWeeks ?? 6;

  let nextLowDemandWeeks = lowDemand;
  let nextStatus: TitleStatus = sales.titleStatus;

  if (!eligible) {
    nextLowDemandWeeks = lowDemand;
    nextStatus = sales.titleStatus;
  } else if (unitsSold <= threshold) {
    nextLowDemandWeeks = lowDemand + 1;
    nextStatus =
      nextLowDemandWeeks >= dormantAfter ? "dormant" : sales.titleStatus;
  } else {
    nextLowDemandWeeks = 0;
    nextStatus = sales.titleStatus;
  }

  return {
    eligibleForSales: eligible,
    marketWeek: sales.weeksOnMarket,
    lifecyclePhase: phase,
    marketPotential,
    qualityDemand,
    rawAwarenessPoints: rawAwareness,
    awarenessFactor,
    fanAwarenessPoints: fanAwareness,
    hypeFactor,
    priceFactor,
    titleLifecycleFactor: titleFactor,
    seededVariance: variance,
    expectedUnitsBeforeVariance: expectedUnits,
    unitsSold,
    grossRevenue,
    platformFee,
    publisherCut,
    developerRevenue,
    nextTitleStatus: nextStatus,
    nextLowDemandWeeks,
  };
}

/** Convert game avgReview 0–10 → algorithm 0–100. */
export function reviewToHundred(avgReview: number): number {
  return clamp(avgReview, 0, 10) * 10;
}
