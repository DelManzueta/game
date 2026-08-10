/**
 * Classic GDT spine — aligned to the modular text-engine blueprint:
 *
 *   score_ratio = total_points / historical_average
 *   raw_score   = score_ratio * combo * 7.5 * sliderFit * bugFit
 *   final       = clamp(1..sizeMax)
 *   historical  = historical * 0.7 + total_points * 0.3
 *   units       = (T+D) * review^2.2 * 12 * size * platform
 *   net         = units * price * 0.85   (15% platform tax)
 *
 * Deterministic (no Math.random). Browser Studio Empire uses this at release.
 */

import { SIZE_STATS, getGenre, STAGE_FIELDS, REVIEWER_NAMES } from "./data";
import { topicGenreCompatibility } from "./content/genreFit";
import type { DevField, GameSize, GenreId } from "./types";
import { clamp } from "./scoring/qualityEngine";

/** Genre tech/design bias — blueprint Part 1 weights. */
export const GENRE_WEIGHTS: Record<
  GenreId,
  { techWeight: number; designWeight: number }
> = {
  action: { techWeight: 0.7, designWeight: 0.3 },
  adventure: { techWeight: 0.35, designWeight: 0.65 },
  rpg: { techWeight: 0.4, designWeight: 0.6 },
  simulation: { techWeight: 0.5, designWeight: 0.5 },
  strategy: { techWeight: 0.6, designWeight: 0.4 },
  casual: { techWeight: 0.1, designWeight: 0.9 },
};

/** Blueprint-style good topic lists (also backed by full topic×genre matrix). */
export const GENRE_BEST_TOPICS: Record<GenreId, string[]> = {
  action: ["space", "military", "cyberpunk", "zombie", "racing", "martial_arts"],
  adventure: ["fantasy", "mystery", "detective", "pirate", "time_travel"],
  rpg: ["fantasy", "medieval", "vampire", "cyberpunk", "dungeon"],
  simulation: ["city", "farming", "airplane", "hospital", "gamedev", "economy"],
  strategy: ["military", "medieval", "space", "politics", "warfare"],
  casual: ["sports", "music", "party", "puzzle", "school"],
};

/**
 * Ideal relative slider emphasis per phase field (0–1 within phase).
 * Action P1: Engine high, Story low — matching classic GDT + blueprint.
 */
export function idealPhaseSliders(
  genreId: GenreId,
  stage: 1 | 2 | 3,
): Partial<Record<DevField, number>> {
  const g = getGenre(genreId);
  const focus = new Set(g.stageFocus[stage] ?? []);
  const avoid = new Set(g.avoid ?? []);
  const fields = STAGE_FIELDS[stage];
  const out: Partial<Record<DevField, number>> = {};
  for (const f of fields) {
    if (avoid.has(f)) out[f] = 0.02;
    else if (focus.has(f)) out[f] = 1.0;
    else out[f] = 0.12;
  }
  const sum = Object.values(out).reduce((a, b) => a + (b ?? 0), 0) || 1;
  for (const f of fields) out[f] = (out[f] ?? 0) / sum;
  return out;
}

/** Topic×genre combo: blueprint 1.3 / 0.7 with soft matrix blend. */
export function classicComboMultiplier(topicId: string, genreId: GenreId): number {
  const compat = topicGenreCompatibility(topicId, genreId); // 0–100
  // Map: 100→1.30, 70→1.0, 40→0.75, 15→0.55
  const soft = clamp(0.4 + (compat / 100) * 0.9, 0.5, 1.3);
  const best = GENRE_BEST_TOPICS[genreId] ?? [];
  const id = topicId.toLowerCase().replace(/\s+/g, "_");
  if (best.some((b) => id.includes(b) || b.includes(id))) {
    return Math.max(soft, 1.25);
  }
  return soft;
}

/** 0 = perfect genre focus, 1 = completely flat/wrong. */
export function sliderDeviation(
  genreId: GenreId,
  stage: 1 | 2 | 3,
  sliders: Partial<Record<DevField, number>>,
): number {
  const ideal = idealPhaseSliders(genreId, stage);
  const fields = STAGE_FIELDS[stage];
  const raw = fields.map((f) => Math.max(0, sliders[f] ?? 0));
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  let dev = 0;
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i]!;
    const actual = raw[i]! / sum;
    const target = ideal[f] ?? 1 / fields.length;
    dev += Math.abs(actual - target);
  }
  return clamp(dev / 2, 0, 1);
}

/** Blueprint Part 3 — score-banded critic quotes. */
export const REVIEWER_QUOTES: {
  min: number;
  max: number;
  lines: string[];
}[] = [
  {
    min: 9.0,
    max: 10,
    lines: [
      "An absolute masterpiece. We will be playing this for years.",
      "A brilliant subversion of the genre. Instant classic.",
      "Every system sings. This is why we cover games.",
      "Sets a new bar for the category — essential.",
    ],
  },
  {
    min: 7.5,
    max: 8.9,
    lines: [
      "Strong craft with only a few rough edges.",
      "Confident design — nearly great.",
      "Players will remember this one fondly.",
    ],
  },
  {
    min: 6.0,
    max: 7.4,
    lines: [
      "Good mechanics, but it feels like it lacks that final polish.",
      "A solid weekend choice. Fun, but ultimately safe.",
      "Competent work that never quite soars.",
    ],
  },
  {
    min: 4.0,
    max: 5.9,
    lines: [
      "Ideas fight each other more than they cooperate.",
      "A rocky ride — flashes of fun buried under friction.",
      "Needs another development cycle.",
    ],
  },
  {
    min: 1.0,
    max: 3.9,
    lines: [
      "A disaster of mismatched design decisions. Pass on this.",
      "I found more entertainment counting the bugs than playing.",
      "Hard to recommend even at a discount.",
    ],
  },
];

export function quoteForScore(score: number, salt: number): string {
  const band =
    REVIEWER_QUOTES.find((b) => score >= b.min && score <= b.max) ??
    REVIEWER_QUOTES[REVIEWER_QUOTES.length - 1]!;
  return band.lines[Math.abs(salt) % band.lines.length]!;
}

export function criticReviewsForScores(
  scores: number[],
  seed: number,
): { name: string; score: number; comment: string }[] {
  const names = REVIEWER_NAMES.length
    ? REVIEWER_NAMES
    : ["All-Games Beta", "Game Hero", "Informer", "Star Games", "BitCritic"];
  return scores.map((sc, i) => ({
    name: names[i % names.length]!,
    score: sc,
    comment: quoteForScore(sc, seed + i * 17 + Math.floor(sc * 10)),
  }));
}

/**
 * Blueprint review math:
 *   score_ratio = total_points / historical_average
 *   raw = score_ratio * combo * 7.5 * sliderFit * bugFit * expertise
 */
export function classicReviewScore(opts: {
  designPoints: number;
  techPoints: number;
  bugs: number;
  /** Moving market bar — blueprint historical_average (points scale). */
  targetHighScore: number;
  comboMult: number;
  size: GameSize;
  sliderMiss?: number;
  expertise?: number;
}): {
  avg: number;
  scores: number[];
  basePoints: number;
  hidden: number;
  /** Next historical average after this release. */
  nextHistoricalAverage: number;
  criticReviews: { name: string; score: number; comment: string }[];
} {
  const design = Math.max(0, opts.designPoints);
  const tech = Math.max(0, opts.techPoints);
  const totalPoints = design + tech;
  const historical = Math.max(12, opts.targetHighScore || 30);

  // Slider fit: flat equal sliders → ~0.55–0.7; focused → ~0.95–1.1
  const sliderFit = clamp(1.12 - (opts.sliderMiss ?? 0) * 0.85, 0.5, 1.15);
  const bugFit = clamp(1 - opts.bugs / 55, 0.45, 1);
  const expertise = opts.expertise ?? 1;

  const scoreRatio = totalPoints / historical;
  let raw =
    scoreRatio * opts.comboMult * 7.5 * sliderFit * bugFit * expertise;

  // Mild size pressure (small games still cap via maxScore)
  if (opts.size === "medium") raw *= 0.98;
  if (opts.size === "large") raw *= 0.95;
  if (opts.size === "aaa") raw *= 0.92;

  const maxScore = SIZE_STATS[opts.size]?.maxScore ?? 10;
  const hidden = clamp(Math.round(raw * 10) / 10, 1, maxScore);

  const seed = Math.floor(totalPoints * 17 + opts.bugs * 3 + historical * 5);
  const scores = [0, 1, 2, 3].map((i) => {
    const j = (((seed + i * 41) % 100) / 100 - 0.5) * 1.0;
    return Math.round(clamp(hidden + j, 1, maxScore) * 10) / 10;
  });
  const avg =
    Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;

  // Blueprint: historical_average = hist * 0.7 + total_points * 0.3
  const nextHistoricalAverage = historical * 0.7 + totalPoints * 0.3;

  return {
    avg,
    scores,
    basePoints: totalPoints,
    hidden,
    nextHistoricalAverage,
    criticReviews: criticReviewsForScores(scores, seed),
  };
}

/**
 * Blueprint sales:
 *   units = (T+D) * review^2.2 * 12 * sizeMult * platform * combo * soft boosts
 *   tax = 15% (blueprint) — we keep 15% for classic spine net
 */
export function classicUnitsSold(opts: {
  designPoints: number;
  techPoints: number;
  reviewScore: number;
  size: GameSize;
  platformMarket: number;
  comboMult: number;
  marketingSpend?: number;
  fans?: number;
  hype?: number;
}): { totalUnits: number; weekly: number[]; price: number; gross: number; net: number } {
  const points = Math.max(1, opts.designPoints + opts.techPoints);
  const review = clamp(opts.reviewScore, 1, 10);
  const size = SIZE_STATS[opts.size];
  const fanBoost = 1 + Math.min(1.2, (opts.fans ?? 0) / 60_000);
  // Blueprint: hype_mult = 1 + current_hype / 100
  const hypeBoost = 1 + Math.min(1.5, Math.max(0, opts.hype ?? 0) / 100);
  const mktBoost = 1 + Math.min(0.5, (opts.marketingSpend ?? 0) / 100_000);

  const base =
    points *
    Math.pow(review, 2.2) *
    12 *
    size.salesMult *
    Math.max(0.4, opts.platformMarket) *
    opts.comboMult *
    fanBoost *
    hypeBoost *
    mktBoost;

  const totalUnits = Math.max(0, Math.floor(base));
  const weights = [0.22, 0.16, 0.12, 0.1, 0.08, 0.07, 0.06, 0.05, 0.04, 0.04, 0.03, 0.03];
  const weekly = weights.map((w) => Math.floor(totalUnits * w));
  const sum = weekly.reduce((a, b) => a + b, 0);
  if (weekly[0] != null) weekly[0] += Math.max(0, totalUnits - sum);

  const price =
    opts.size === "small"
      ? 9.99
      : opts.size === "medium"
        ? 19.99
        : opts.size === "large"
          ? 39.99
          : 59.99;
  const gross = totalUnits * price;
  const net = gross * 0.85; // 15% platform tax per blueprint
  return { totalUnits, weekly, price, gross, net };
}

/** Fans gained from a release (blueprint: units * 0.05 * score/10). */
export function classicFansFromRelease(units: number, reviewScore: number): number {
  return Math.max(0, Math.floor(units * 0.05 * (clamp(reviewScore, 1, 10) / 10)));
}

/** Initial historical average for first game (blueprint: 30). */
export const CLASSIC_INITIAL_HISTORICAL = 30;

/** Expected points band for garage small (solo). */
export const GARAGE_SMALL_POINT_BAND = { weak: 20, ok: 40, strong: 70 };

/**
 * Office ladder (blueprint Part 2) — mapped to our office tiers.
 * Rent charged monthly when office >= 2 (garage free for learnability).
 */
export const OFFICE_BLUEPRINT = [
  {
    stage: 1,
    name: "The Garage",
    unlockCost: 0,
    monthlyRent: 0,
    maxStaff: 1,
    sizes: ["small"] as GameSize[],
  },
  {
    stage: 2,
    name: "Tech Park Office",
    unlockCost: 120_000,
    monthlyRent: 8_000,
    maxStaff: 5,
    sizes: ["small", "medium"] as GameSize[],
  },
  {
    stage: 3,
    name: "Industry Complex",
    unlockCost: 850_000,
    monthlyRent: 25_000,
    maxStaff: 7,
    sizes: ["small", "medium", "large"] as GameSize[],
  },
  {
    stage: 4,
    name: "Mega Campus",
    unlockCost: 8_000_000,
    monthlyRent: 80_000,
    maxStaff: 12,
    sizes: ["small", "medium", "large", "aaa"] as GameSize[],
  },
] as const;
