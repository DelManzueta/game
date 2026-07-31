/**
 * Layered commercial calculation — pure, deterministic.
 * marketPotential × qualityDemand × awareness × hype × priceFit × distribution × lifecycle
 */
import type { AudienceId, GameSize, GenreId } from "../types";
import {
  fanAwarenessBoost,
  qualityDemandFromReview,
  REFERENCE_PRICE,
  SELF_PUBLISH_SHARE,
  DEFAULT_PUBLISHER_SHARE,
} from "./config";

export type DistributionType = "self" | "publisher";

export type CommercialLayers = {
  marketPotential: number;
  qualityDemand: number;
  awareness: number;
  hypeFactor: number;
  priceFit: number;
  distribution: number;
  lifecycle: number;
  /** Studio share of unit revenue (0–1). */
  revenueShare: number;
  explain: {
    marketPotential: string;
    qualityDemand: string;
    awareness: string;
    hype: string;
    priceFit: string;
    distribution: string;
    lifecycle: string;
  };
};

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Price elasticity: higher price → fewer units; weak games punished harder when overpriced. */
export function computePriceFit(opts: {
  launchPrice: number;
  size: GameSize;
  avgReview: number;
  productQuality: number;
}): number {
  const ref = REFERENCE_PRICE[opts.size] ?? 25;
  const ratio = opts.launchPrice / Math.max(1, ref);
  // Quality softens overpricing; weak games get crushed when expensive
  const quality = clamp(opts.avgReview / 10, 0.15, 1);
  const pq = clamp(opts.productQuality / 100, 0.15, 1);
  const qualityCushion = 0.55 + quality * 0.3 + pq * 0.15;
  // elasticity ~1.15 base, higher when quality is low
  const elasticity = 1.05 + (1 - qualityCushion) * 0.55;
  let fit = Math.pow(1 / Math.max(0.35, ratio), elasticity);
  // underpricing boosts units but softens past 0.55× ref
  if (ratio < 0.85) fit *= 1 + (0.85 - ratio) * 0.35;
  if (ratio > 1.4 && opts.avgReview < 6) fit *= 0.72;
  return clamp(fit, 0.35, 1.55);
}

/** Awareness from organic + fans + marketing + publisher — NOT quality. Capped, diminishing. */
export function computeAwareness(opts: {
  fans: number;
  hype: number;
  marketingSpend: number;
  publisherAwarenessMult?: number;
  mediaBoost?: number;
}): number {
  const organic = 0.1;
  const fan = fanAwarenessBoost(opts.fans);
  // diminishing marketing: first $20k strong, then soft
  const m = opts.marketingSpend;
  const mkt = clamp(0.35 * (1 - Math.exp(-m / 45000)), 0, 0.42);
  const hypeA = clamp(opts.hype / 220, 0, 0.22);
  const pub = (opts.publisherAwarenessMult ?? 1) - 1; // e.g. 1.35 → +0.35
  const media = opts.mediaBoost ?? 0;
  const raw = organic + fan + mkt + hypeA + clamp(pub, 0, 0.4) + media;
  // diminishing total awareness
  return clamp(1 - Math.exp(-raw * 1.15), 0.08, 0.92);
}

/** Short-term launch energy factor (decays outside the plan separately). */
export function computeHypeFactor(hype: number, weekIndex: number): number {
  const base = 1 + clamp(hype / 100, 0, 0.55);
  // Hype front-loads first ~6 weeks
  const window = Math.exp(-weekIndex / 5.5);
  return clamp(1 + (base - 1) * window, 0.85, 1.6);
}

export function computeLifecycleFactor(platformAgeYears: number, weekIndex: number, marketWeeks: number): number {
  const age = clamp(1.08 - platformAgeYears * 0.045, 0.42, 1.12);
  // Soft late-shelf fade
  const progress = weekIndex / Math.max(1, marketWeeks);
  const late = progress > 0.85 ? 1 - (progress - 0.85) * 1.8 : 1;
  return clamp(age * late, 0.25, 1.15);
}

export function computeDistribution(opts: {
  type: DistributionType;
  publisherReachMult?: number;
  fans: number;
}): { mult: number; revenueShare: number } {
  if (opts.type === "publisher") {
    return {
      mult: opts.publisherReachMult ?? 1.45,
      revenueShare: DEFAULT_PUBLISHER_SHARE,
    };
  }
  // Self-publish: weak early fans hurt reach; strong fans approach publisher-like reach with better share
  const fanReach = 0.72 + Math.min(0.38, Math.log10(1 + opts.fans) / 12);
  return { mult: clamp(fanReach, 0.65, 1.12), revenueShare: SELF_PUBLISH_SHARE };
}

export function computeMarketPotential(opts: {
  size: GameSize;
  platformMarket: number;
  platformAgeYears: number;
  genreId: GenreId;
  topicRepetition: number;
  competitionModifier?: number;
  trendModifier?: number;
  audience?: AudienceId;
}): number {
  const baseBySize: Record<GameSize, number> = {
    small: 40_000,
    medium: 90_000,
    large: 180_000,
    aaa: 320_000,
  };
  const base = (baseBySize[opts.size] ?? 40_000) * opts.platformMarket;
  const genreDemand =
    opts.genreId === "action" || opts.genreId === "casual"
      ? 1.08
      : opts.genreId === "strategy" || opts.genreId === "simulation"
        ? 0.92
        : 1;
  const fatigue = clamp(1 - opts.topicRepetition * 0.06, 0.7, 1);
  const life = clamp(1.05 - opts.platformAgeYears * 0.04, 0.45, 1.1);
  const competition = opts.competitionModifier ?? 1;
  const trend = opts.trendModifier ?? 1;
  return Math.max(500, base * genreDemand * fatigue * life * competition * trend);
}

/** Full layer snapshot for reports and plan generation. */
export function computeCommercialLayers(opts: {
  size: GameSize;
  platformMarket: number;
  platformAgeYears: number;
  genreId: GenreId;
  topicRepetition: number;
  avgReview: number;
  productQuality: number;
  fans: number;
  hype: number;
  marketingSpend: number;
  launchPrice: number;
  distributionType: DistributionType;
  publisherReachMult?: number;
  publisherAwarenessMult?: number;
  competitionModifier?: number;
  trendModifier?: number;
  weekIndex?: number;
  marketWeeks?: number;
}): CommercialLayers {
  const marketPotential = computeMarketPotential(opts);
  const qualityDemand = qualityDemandFromReview(opts.avgReview);
  const awareness = computeAwareness({
    fans: opts.fans,
    hype: opts.hype,
    marketingSpend: opts.marketingSpend,
    publisherAwarenessMult: opts.publisherAwarenessMult,
  });
  const hypeFactor = computeHypeFactor(opts.hype, opts.weekIndex ?? 0);
  const priceFit = computePriceFit({
    launchPrice: opts.launchPrice,
    size: opts.size,
    avgReview: opts.avgReview,
    productQuality: opts.productQuality,
  });
  const dist = computeDistribution({
    type: opts.distributionType,
    publisherReachMult: opts.publisherReachMult,
    fans: opts.fans,
  });
  const lifecycle = computeLifecycleFactor(
    opts.platformAgeYears,
    opts.weekIndex ?? 0,
    opts.marketWeeks ?? 40,
  );

  return {
    marketPotential,
    qualityDemand,
    awareness,
    hypeFactor,
    priceFit,
    distribution: dist.mult,
    lifecycle,
    revenueShare: dist.revenueShare,
    explain: {
      marketPotential: `Platform reach ~${Math.round(marketPotential).toLocaleString()} relevant players.`,
      qualityDemand: `Review ${opts.avgReview.toFixed(1)} → demand factor ${qualityDemand.toFixed(2)}.`,
      awareness: `Awareness ${(awareness * 100).toFixed(0)}% from fans, marketing, and hype (not quality).`,
      hype: `Launch energy factor ${hypeFactor.toFixed(2)}.`,
      priceFit: `Price $${opts.launchPrice} fit ${priceFit.toFixed(2)} vs size baseline.`,
      distribution:
        opts.distributionType === "publisher"
          ? `Publisher reach ×${dist.mult.toFixed(2)}; studio keeps ${(dist.revenueShare * 100).toFixed(0)}%.`
          : `Self-publish reach ×${dist.mult.toFixed(2)}; studio keeps ${(dist.revenueShare * 100).toFixed(0)}%.`,
      lifecycle: `Platform age ${opts.platformAgeYears.toFixed(1)}y → lifecycle ${lifecycle.toFixed(2)}.`,
    },
  };
}
