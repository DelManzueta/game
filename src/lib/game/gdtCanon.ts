/**
 * GDT CANON — master reference formulas (Studio Empire binding).
 * Time: 1 week atomic · 4 weeks/month · 12 months/year (48 weeks).
 * Do not drift these without an explicit balance revision.
 */

import type { GameSize, GenreId } from "./types";

export const GDT_CANON_VERSION = "1.0.0" as const;

export const WEEKS_PER_MONTH = 4;
export const MONTHS_PER_YEAR = 12;
export const WEEKS_PER_YEAR = 48;

/** Phase duration (weeks) per size — three equal phases. */
export const PHASE_WEEKS: Record<GameSize, number> = {
  small: 4 / 3, // 1.33…
  medium: 8 / 3, // 2.66…
  large: 4,
  aaa: 16 / 3, // 5.33…
};

export const TOTAL_DEV_WEEKS: Record<GameSize, number> = {
  small: 4,
  medium: 8,
  large: 12,
  aaa: 16,
};

/** Market shelf life (weeks) by size. */
export const SHELF_LIFE_WEEKS: Record<GameSize, number> = {
  small: 12,
  medium: 24,
  large: 36,
  aaa: 48,
};

export const HISTORICAL_FLOOR = 10;
export const UNIT_PRICE = 9.99;
export const PLATFORM_TAX = 0.15;

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Weekly Sales(t) = BasePool × (Review/10)^2.5 × (1 − t/Lifespan)^2 × HypeMod
 * t is 0-indexed week on market.
 */
export function weeklySalesAt(
  basePool: number,
  reviewScore: number,
  weekIndex: number,
  lifespan: number,
  hypeModifier: number,
): number {
  const scoreTerm = Math.pow(clamp(reviewScore, 1, 10) / 10, 2.5);
  const life = Math.max(1, lifespan);
  const t = Math.max(0, weekIndex);
  const decay = Math.pow(Math.max(0, 1 - t / life), 2);
  const hype = Math.max(0.05, hypeModifier);
  return Math.max(0, Math.floor(basePool * scoreTerm * decay * hype));
}

/** Build full weekly unit schedule for a release. */
export function buildShelfSchedule(opts: {
  basePool: number;
  reviewScore: number;
  size: GameSize;
  hypeModifier?: number;
}): { weekly: number[]; totalUnits: number; lifespan: number } {
  const lifespan = SHELF_LIFE_WEEKS[opts.size] ?? 12;
  const hype = opts.hypeModifier ?? 1;
  const weekly: number[] = [];
  let total = 0;
  for (let t = 0; t < lifespan; t++) {
    const u = weeklySalesAt(opts.basePool, opts.reviewScore, t, lifespan, hype);
    weekly.push(u);
    total += u;
  }
  return { weekly, totalUnits: total, lifespan };
}

/**
 * Base sales pool from development points (feeds decay schedule).
 * Tuned so garage small ~few thousand units at mid scores.
 */
export function baseSalesPool(opts: {
  designPoints: number;
  techPoints: number;
  platformShare: number;
  size: GameSize;
}): number {
  const pts = Math.max(1, opts.designPoints + opts.techPoints);
  const sizeBoost =
    opts.size === "small" ? 1 : opts.size === "medium" ? 1.35 : opts.size === "large" ? 1.7 : 2.1;
  return pts * 18 * Math.max(0.2, opts.platformShare) * sizeBoost;
}

/**
 * Fans Gained/Lost = Units × 0.05 × ((Review − 5.5) / 4.5)
 */
export function fansFromLifecycle(unitsSold: number, reviewScore: number): number {
  const factor = (clamp(reviewScore, 1, 10) - 5.5) / 4.5;
  return Math.floor(unitsSold * 0.05 * factor);
}

/**
 * Raw Score = ((T+D)/Hist) × 7.0 × M_combo × M_plat
 * Final = Clamp(Round(Raw − Bugs×0.1), 1, 10)
 */
export function gdtReviewScore(opts: {
  designPoints: number;
  techPoints: number;
  historicalAverage: number;
  comboMult: number;
  platformMult: number;
  bugs: number;
  maxScore?: number;
}): { final: number; raw: number; nextHistorical: number; totalPoints: number } {
  const totalPoints = Math.max(0, opts.designPoints + opts.techPoints);
  const hist = Math.max(HISTORICAL_FLOOR, opts.historicalAverage);
  const raw =
    (totalPoints / hist) * 7.0 * opts.comboMult * Math.max(0.5, opts.platformMult) -
    opts.bugs * 0.1;
  const max = opts.maxScore ?? 10;
  const final = clamp(round1(raw), 1, max);
  const nextHistorical = Math.max(HISTORICAL_FLOOR, hist * 0.7 + totalPoints * 0.3);
  return { final, raw, nextHistorical, totalPoints };
}

/** Platform fit mult from market size / affinity proxy. */
export function platformFitMult(marketSize: number): number {
  return clamp(0.65 + marketSize * 0.35, 0.6, 1.35);
}

export const RESEARCH_REGISTRY: Record<
  string,
  { name: string; rp_cost: number; type: string }
> = {
  stereo_sound: { name: "Stereo Audio Matrix", rp_cost: 15, type: "Sound" },
  "3d_graphics_v1": { name: "3D Graphics V1", rp_cost: 40, type: "Graphics" },
  open_world: { name: "Open World System", rp_cost: 80, type: "Gameplay" },
};

/**
 * Production SWU targets so calendar weeks ≈ TOTAL_DEV_WEEKS
 * (assuming ~200 SWU/day × 7 ≈ 1400 SWU/week).
 */
export const CANON_PRODUCTION = {
  dailyWorkUnits: 200,
  /** Per-phase SWU at size factor 1 (≈1.33 weeks × 1400) */
  stageBaseSwu: { 1: 1860, 2: 1860, 3: 1860 },
  sizeSwuFactor: { small: 1, medium: 2, large: 3, aaa: 4 } as Record<string, number>,
  polishRequiredWork: 200,
  polishWorkPerDay: 200,
};


/** High-fidelity storefront row (trailing market). */
export type StorefrontTitle = {
  title: string;
  score: number;
  totalLifespan: number;
  remainingWeeks: number;
  salesPoolBase: number;
  accumulatedUnitsSold: number;
  price: number;
};

/**
 * Initial pool: rawPoints × review^2.4 × 18 × platformShare × hype
 * Weekly: (pool / L) × (1 − t/L)^2.2   min 5 units
 */
export function injectStorefrontRelease(opts: {
  title: string;
  size: GameSize;
  reviewScore: number;
  rawPoints: number;
  platformShare: number;
  currentHype: number;
  unitPrice?: number;
}): StorefrontTitle {
  const L = SHELF_LIFE_WEEKS[opts.size] ?? 12;
  const hypeM = 1 + Math.max(0, opts.currentHype) / 100;
  const pool =
    Math.max(1, opts.rawPoints) *
    Math.pow(clamp(opts.reviewScore, 1, 10), 2.4) *
    18 *
    Math.max(0.2, opts.platformShare) *
    hypeM;
  return {
    title: opts.title,
    score: opts.reviewScore,
    totalLifespan: L,
    remainingWeeks: L,
    salesPoolBase: pool,
    accumulatedUnitsSold: 0,
    price: opts.unitPrice ?? UNIT_PRICE,
  };
}

export function processStorefrontWeek(list: StorefrontTitle[]): {
  list: StorefrontTitle[];
  cashGain: number;
  fansChange: number;
  unitsThisWeek: number;
} {
  let cash = 0;
  let fans = 0;
  let units = 0;
  const next: StorefrontTitle[] = [];
  for (const game of list) {
    if (game.remainingWeeks <= 0) continue;
    const t = game.totalLifespan - game.remainingWeeks;
    const progress = t / Math.max(1, game.totalLifespan);
    const decay = Math.pow(Math.max(0, 1 - progress), 2.2);
    let weeklyUnits = Math.round((game.salesPoolBase / game.totalLifespan) * decay);
    weeklyUnits = Math.max(0, weeklyUnits); // Foundation Lock: weak titles may sell <5
    const g = {
      ...game,
      accumulatedUnitsSold: game.accumulatedUnitsSold + weeklyUnits,
      remainingWeeks: game.remainingWeeks - 1,
    };
    const gross = weeklyUnits * g.price;
    cash += gross * (1 - PLATFORM_TAX);
    fans += weeklyUnits * 0.03 * ((g.score - 5.0) / 5.0);
    units += weeklyUnits;
    if (g.remainingWeeks > 0) next.push(g);
  }
  return { list: next, cashGain: cash, fansChange: Math.round(fans), unitsThisWeek: units };
}
