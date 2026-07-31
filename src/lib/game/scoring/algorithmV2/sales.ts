/**
 * Algorithm V2 sales — layered commercial model.
 * marketPotential × qualityDemand × awareness × hype × priceFit × distribution × lifecycle
 * Marketing ≠ quality. Deterministic from seed + inputs.
 *
 * Shelf life: size-banded months (score scales within band).
 */
import type { GameSize, GenreId } from "../../types";
import { SeededRng, hashSeed } from "../rng";
import { SALES, marketWeeksOnSale } from "./config";
import {
  computeCommercialLayers,
  type CommercialLayers,
  type DistributionType,
  fanLaunchFloor,
} from "../../commercial";
import { REFERENCE_PRICE } from "../../commercial/config";

export type WeeklySalesRecordV2 = {
  week: number;
  units: number;
  revenue: number;
  activePlayers: number;
  awareness: number;
  playerSentiment: number;
  platformMomentum: number;
  competitionModifier: number;
  seasonalModifier: number;
  hypeFactor?: number;
  priceFit?: number;
  salesPhase?: string;
};

export type SalesPlanV2 = {
  weeks: number[];
  history: WeeklySalesRecordV2[];
  totalUnits: number;
  revenue: number;
  fansGained: number;
  price: number;
  marketWeeks: number;
  layers: CommercialLayers;
  revenueShare: number;
  distributionType: DistributionType;
};

export function generateSalesPlanV2(opts: {
  productQuality: number;
  avgReview: number;
  size: GameSize;
  platformMarket: number;
  platformAgeYears: number;
  fans: number;
  hype: number;
  marketingSpend: number;
  genreId: GenreId;
  topicRepetition: number;
  pirateMode: boolean;
  liveOps: boolean;
  campaignSeed: number;
  gameId: string;
  releaseWeek: number;
  studioReputation: number;
  /** Player-chosen price; defaults to size reference. */
  launchPrice?: number;
  distributionType?: DistributionType;
  publisherReachMult?: number;
  publisherAwarenessMult?: number;
  publisherRoyalty?: number;
  /** Sequel: awareness mult from original fans (does not raise quality). */
  sequelFanAwarenessMult?: number;
  /** Sequel: light commercial mult from timing/engine. */
  sequelCommercialMult?: number;
}): SalesPlanV2 {
  const seed = hashSeed(opts.campaignSeed, opts.gameId, "sales-v2", opts.releaseWeek);
  const rng = new SeededRng(seed);

  const price = opts.launchPrice ?? SALES.priceBySize[opts.size] ?? REFERENCE_PRICE[opts.size] ?? 25;
  const distributionType: DistributionType = opts.distributionType ?? "self";
  const weeksCount = marketWeeksOnSale(opts.size, opts.avgReview, opts.liveOps);
  const sequelFanA = opts.sequelFanAwarenessMult ?? 1;
  const sequelComm = opts.sequelCommercialMult ?? 1;

  const baseLayers = computeCommercialLayers({
    size: opts.size,
    platformMarket: opts.platformMarket * (0.9 + rng.range(0, 0.12)),
    platformAgeYears: opts.platformAgeYears,
    genreId: opts.genreId,
    topicRepetition: opts.topicRepetition,
    avgReview: opts.avgReview,
    productQuality: opts.productQuality,
    fans: opts.fans,
    hype: opts.hype,
    marketingSpend: opts.marketingSpend,
    launchPrice: price,
    distributionType,
    publisherReachMult: opts.publisherReachMult,
    publisherAwarenessMult: (opts.publisherAwarenessMult ?? 1) * sequelFanA,
    marketWeeks: weeksCount,
    weekIndex: 0,
  });

  const revenueShare = opts.publisherRoyalty ?? baseLayers.revenueShare;

  // Addressable pool from layered market potential × quality × awareness
  let remaining =
    baseLayers.marketPotential *
    baseLayers.qualityDemand *
    baseLayers.awareness *
    (0.5 + baseLayers.qualityDemand * 0.35);

  // Sentiment from reviews + quality (conversion only — not awareness)
  let sentiment = Math.max(
    0.1,
    Math.min(
      0.98,
      0.35 + (opts.avgReview / 10) * 0.45 + (opts.productQuality / 100) * 0.2,
    ),
  );

  let awareness = baseLayers.awareness;
  const mkt = opts.marketingSpend / 50000;

  const halfLifeWeeks = Math.max(
    4,
    weeksCount * (0.18 + sentiment * 0.22 + (opts.liveOps ? 0.06 : 0)),
  );
  const drainRate = Math.max(0.18, Math.min(0.55, 0.22 + 8 / weeksCount));

  const weeks: number[] = [];
  const history: WeeklySalesRecordV2[] = [];
  let total = 0;
  let platformMomentum = Math.max(0.45, Math.min(1.1, 1.05 - opts.platformAgeYears * 0.04));

  for (let w = 0; w < weeksCount; w++) {
    const layersW = computeCommercialLayers({
      size: opts.size,
      platformMarket: opts.platformMarket,
      platformAgeYears: opts.platformAgeYears,
      genreId: opts.genreId,
      topicRepetition: opts.topicRepetition,
      avgReview: opts.avgReview,
      productQuality: opts.productQuality,
      fans: opts.fans,
      hype: opts.hype,
      marketingSpend: opts.marketingSpend,
      launchPrice: price,
      distributionType,
      publisherReachMult: opts.publisherReachMult,
      publisherAwarenessMult: opts.publisherAwarenessMult,
      marketWeeks: weeksCount,
      weekIndex: w,
    });

    const seasonal = 1 + Math.sin((opts.releaseWeek + w) / 6) * 0.06;
    const competition = 0.88 + rng.range(0, 0.2);
    const trust = Math.max(0.55, Math.min(1.15, 0.7 + opts.studioReputation / 400));
    const wordOfMouth = Math.max(0.5, Math.min(1.35, 0.75 + sentiment * 0.5));
    const reviewConversion = Math.pow(Math.max(0.1, Math.min(1, opts.avgReview / 10)), 1.35);
    const conceptConversion = Math.max(0.2, Math.min(1, opts.productQuality / 100));

    const purchaseConversion =
      reviewConversion *
      conceptConversion *
      layersW.priceFit *
      trust *
      wordOfMouth;

    const discovery =
      w === 0
        ? 0.32 + awareness * 0.42 + layersW.hypeFactor * 0.08
        : 0.07 + sentiment * 0.07 + (1 - awareness) * 0.02;

    const visibilityDecay = Math.pow(0.5, w / halfLifeWeeks) * (opts.marketingSpend > 80000 ? 1.1 : 1);

    // Bad marketed games: strong open, collapse
    if (opts.avgReview < 5 && mkt > 0.8 && w >= 2) {
      sentiment = Math.max(0.12, sentiment * 0.84);
    }
    // Slow burner: great game low awareness grows
    if (opts.avgReview >= 8 && awareness < 0.35 && w >= 1 && w <= 10) {
      awareness = Math.min(0.72, awareness + 0.028);
      sentiment = Math.min(0.95, sentiment + 0.012);
    }

    const endFade =
      w > weeksCount * 0.9
        ? Math.max(0.12, 1 - (w - weeksCount * 0.9) / (weeksCount * 0.1 + 1))
        : 1;

    let unitsRaw =
      remaining *
      discovery *
      purchaseConversion *
      layersW.hypeFactor *
      layersW.distribution *
      platformMomentum *
      competition *
      seasonal *
      visibilityDecay *
      endFade *
      layersW.lifecycle *
      sequelComm *
      (opts.pirateMode ? 0.8 : 1);

    // Fan launch floor on week 0 only (diminishing, not every fan buys)
    if (w === 0) {
      unitsRaw = Math.max(unitsRaw, fanLaunchFloor(opts.fans) * layersW.qualityDemand);
    }

    const units = Math.max(0, Math.round(unitsRaw));
    remaining = Math.max(0, remaining - units * drainRate);
    total += units;
    const revenue = units * price * revenueShare;
    const activePlayers = Math.round(
      units * (0.4 + sentiment * 0.3) + (history[w - 1]?.activePlayers ?? 0) * 0.55,
    );

    weeks.push(units);
    history.push({
      week: opts.releaseWeek + w,
      units,
      revenue,
      activePlayers,
      awareness: Math.round(awareness * 1000) / 1000,
      playerSentiment: Math.round(sentiment * 1000) / 1000,
      platformMomentum: Math.round(platformMomentum * 1000) / 1000,
      competitionModifier: Math.round(competition * 1000) / 1000,
      seasonalModifier: Math.round(seasonal * 1000) / 1000,
      hypeFactor: Math.round(layersW.hypeFactor * 1000) / 1000,
      priceFit: Math.round(layersW.priceFit * 1000) / 1000,
      salesPhase: w <= 1 ? "launch" : w / weeksCount < 0.25 ? "growth" : w / weeksCount < 0.55 ? "mature" : "long_tail",
    });

    platformMomentum = Math.max(0.4, platformMomentum * 0.997);
  }

  const revenue = total * price * revenueShare;
  // Planned fan total used for reporting; actual fans use launch + weekly conversion
  const fansGained = Math.round(
    total * (0.012 + opts.avgReview / 550 + opts.productQuality / 9000) * (1 + awareness * 0.3),
  );

  return {
    weeks,
    history,
    totalUnits: total,
    revenue,
    fansGained,
    price,
    marketWeeks: weeksCount,
    layers: baseLayers,
    revenueShare,
    distributionType,
  };
}
