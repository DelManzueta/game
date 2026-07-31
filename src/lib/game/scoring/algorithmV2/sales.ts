/**
 * Algorithm V2 sales — awareness, conversion, momentum; marketing ≠ quality.
 * Fully deterministic from seed + inputs; weekly history is the source of truth.
 */
import type { GameSize, GenreId } from "../../types";
import { SeededRng, hashSeed } from "../rng";
import { SALES } from "./config";

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
};

export type SalesPlanV2 = {
  weeks: number[];
  history: WeeklySalesRecordV2[];
  totalUnits: number;
  revenue: number;
  fansGained: number;
  price: number;
};

export function generateSalesPlanV2(opts: {
  productQuality: number; // 1–100
  avgReview: number; // 1–10
  size: GameSize;
  platformMarket: number;
  platformAgeYears: number;
  fans: number;
  hype: number;
  marketingSpend: number;
  genreId: GenreId;
  topicRepetition: number; // 0+ times used recently
  pirateMode: boolean;
  liveOps: boolean;
  campaignSeed: number;
  gameId: string;
  releaseWeek: number;
  studioReputation: number;
}): SalesPlanV2 {
  const seed = hashSeed(opts.campaignSeed, opts.gameId, "sales-v2", opts.releaseWeek);
  const rng = new SeededRng(seed);

  const price = SALES.priceBySize[opts.size] ?? 25;
  const baseUsers =
    (SALES.basePlatformUsers[opts.size] ?? 50_000) * opts.platformMarket * (0.85 + rng.range(0, 0.15));

  // Addressable market
  const genreDemand =
    opts.genreId === "action" || opts.genreId === "casual"
      ? 1.08
      : opts.genreId === "strategy" || opts.genreId === "simulation"
        ? 0.92
        : 1;
  const fatigue = clamp(1 - opts.topicRepetition * 0.06, 0.7, 1);
  const addressable = baseUsers * genreDemand * fatigue * (0.9 + opts.fans / 200000);

  // Awareness from marketing + hype + fans (NOT quality)
  const mkt = opts.marketingSpend / 50000;
  let awareness = clamp(0.12 + mkt * 0.35 + opts.hype / 200 + opts.fans / 500000, 0.08, 0.95);

  // Sentiment from reviews + quality word of mouth
  let sentiment = clamp(
    0.35 + (opts.avgReview / 10) * 0.45 + (opts.productQuality / 100) * 0.2,
    0.1,
    0.98,
  );

  // Platform momentum by age
  let platformMomentum = clamp(1.05 - opts.platformAgeYears * 0.04, 0.45, 1.1);

  const weeksCount = opts.liveOps ? SALES.liveOpsWeeks : SALES.defaultWeeks;
  const weeks: number[] = [];
  const history: WeeklySalesRecordV2[] = [];
  let remaining = addressable * awareness * (0.55 + sentiment * 0.45);
  let total = 0;

  for (let w = 0; w < weeksCount; w++) {
    const seasonal = 1 + Math.sin((opts.releaseWeek + w) / 6) * 0.06;
    // competition: seeded dips
    const competition = 0.88 + rng.range(0, 0.2);

    const reviewConversion = Math.pow(clamp(opts.avgReview / 10, 0.1, 1), 1.35);
    const conceptConversion = clamp(opts.productQuality / 100, 0.2, 1);
    const priceFit = opts.size === "aaa" ? 0.85 : opts.size === "small" ? 1.05 : 1;
    const trust = clamp(0.7 + opts.studioReputation / 400, 0.55, 1.15);
    const wordOfMouth = clamp(0.75 + sentiment * 0.5, 0.5, 1.35);

    const purchaseConversion =
      reviewConversion * conceptConversion * priceFit * trust * wordOfMouth;

    // Discovery: marketing front-loads; quality sustains
    const discovery =
      w === 0
        ? 0.35 + awareness * 0.4
        : 0.12 + sentiment * 0.08 + (1 - awareness) * 0.03;

    const visibilityDecay = Math.pow(0.78 - (opts.marketingSpend > 80000 ? 0.04 : 0), w);

    // Bad marketed games: strong open, collapse via sentiment
    if (opts.avgReview < 5 && mkt > 0.8 && w >= 2) {
      sentiment = Math.max(0.15, sentiment * 0.85);
    }
    // Great low awareness: slow burn growth
    if (opts.avgReview >= 8 && awareness < 0.35 && w >= 1 && w <= 6) {
      awareness = Math.min(0.7, awareness + 0.04);
      sentiment = Math.min(0.95, sentiment + 0.02);
    }

    const unitsRaw =
      remaining *
      discovery *
      purchaseConversion *
      platformMomentum *
      competition *
      seasonal *
      visibilityDecay *
      (opts.pirateMode ? 0.8 : 1);

    const units = Math.max(0, Math.round(unitsRaw));
    remaining = Math.max(0, remaining - units * 0.55);
    total += units;
    const revenue = units * price * 0.7;
    const activePlayers = Math.round(units * (0.4 + sentiment * 0.3) + (history[w - 1]?.activePlayers ?? 0) * 0.55);

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
    });

    platformMomentum = Math.max(0.4, platformMomentum * 0.995);
  }

  const revenue = total * price * 0.7;
  const fansGained = Math.round(total * (0.015 + opts.avgReview / 500 + opts.productQuality / 8000));

  return { weeks, history, totalUnits: total, revenue, fansGained, price };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
