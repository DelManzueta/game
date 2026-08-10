/**
 * Classic GDT spine — implements TYCOON-ENGINE CORE v2.1.0 (frozen).
 * See `tycoonEngine.ts` for the authoritative formulas.
 *
 *   Review  = (points / historical) × 7.0   [slider/bug damp only]
 *   Hist    = hist×0.7 + points×0.3
 *   Units   = points × review^2.3 × 15 × hype_mult × platform_share
 *   Net     = units × price × 0.85
 */

import { SIZE_STATS, getGenre, STAGE_FIELDS, REVIEWER_NAMES } from "./data";
import { topicGenreCompatibility } from "./content/genreFit";
import type { DevField, GameSize, GenreId } from "./types";
import { clamp } from "./scoring/qualityEngine";
import {
  tycoonComboMultiplier,
  tycoonReviewScore,
  tycoonUnitsSold,
  tycoonAudienceMultiplier,
  TYCOON_DEFAULTS,
  TYCOON_ENGINE_VERSION,
} from "./tycoonEngine";
import {
  gdtReviewScore,
  buildShelfSchedule,
  baseSalesPool,
  fansFromLifecycle,
  platformFitMult,
  SHELF_LIFE_WEEKS,
  UNIT_PRICE,
  GDT_CANON_VERSION,
} from "./gdtCanon";
export { GDT_CANON_VERSION, SHELF_LIFE_WEEKS };
export { TYCOON_ENGINE_VERSION, TYCOON_DEFAULTS };

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
  // Frozen v2.1 hard pairs first
  const hard = tycoonComboMultiplier(topicId, genreId);
  if (hard === 1.3 || hard === 0.7) return hard;
  // Soft matrix for everything else
  const compat = topicGenreCompatibility(topicId, genreId);
  return clamp(0.55 + (compat / 100) * 0.7, 0.55, 1.2);
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
  /** Moving market bar — historical_average (points scale). */
  targetHighScore: number;
  comboMult: number;
  size: GameSize;
  sliderMiss?: number;
  expertise?: number;
  audienceId?: import("./types").AudienceId;
}): {
  avg: number;
  scores: number[];
  basePoints: number;
  hidden: number;
  nextHistoricalAverage: number;
  criticReviews: { name: string; score: number; comment: string }[];
} {
  const design = Math.max(0, opts.designPoints);
  const tech = Math.max(0, opts.techPoints);
  const totalPoints = (design + tech) * (opts.expertise ?? 1);
  const maxScore = SIZE_STATS[opts.size]?.maxScore ?? 10;
  // GDT canon: Raw = (pts/hist)×7×combo×plat − bugs×0.1
  // Platform mult soft-default 1.0 here; store may pass via combo if needed
  const platMult = 1.0;
  const gdt = gdtReviewScore({
    designPoints: design * (opts.expertise ?? 1),
    techPoints: tech * (opts.expertise ?? 1),
    historicalAverage: opts.targetHighScore || TYCOON_DEFAULTS.historicalAveragePoints,
    comboMult: opts.comboMult,
    platformMult: platMult,
    bugs: opts.bugs,
    maxScore,
  });
  // Soft slider damp only (never inflate above canon)
  const sliderFit = clamp(1 - (opts.sliderMiss ?? 0) * 0.2, 0.85, 1);
  const hidden = clamp(Math.round(gdt.final * sliderFit * 10) / 10, 1, maxScore);
  const seed = Math.floor(totalPoints * 17 + opts.bugs * 3 + gdt.nextHistorical * 5);
  const scores = [0, 1, 2, 3].map((i) => {
    const j = (((seed + i * 41) % 100) / 100 - 0.5) * 0.7;
    return Math.round(clamp(hidden + j, 1, maxScore) * 10) / 10;
  });
  const avg =
    Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  return {
    avg,
    scores,
    basePoints: totalPoints,
    hidden,
    nextHistoricalAverage: gdt.nextHistorical,
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
  audienceId?: import("./types").AudienceId;
}): { totalUnits: number; weekly: number[]; price: number; gross: number; net: number } {
  // GDT canon shelf: Weekly(t) = BasePool × (score/10)^2.5 × (1−t/L)^2 × hype
  const pool = baseSalesPool({
    designPoints: opts.designPoints,
    techPoints: opts.techPoints,
    platformShare: Math.max(0.2, opts.platformMarket) * Math.max(0.7, opts.comboMult),
    size: opts.size,
  });
  const hypeMod = 1 + Math.min(1.5, Math.max(0, opts.hype ?? 0) / 100);
  const fanBoost = 1 + Math.min(0.6, (opts.fans ?? 0) / 100_000);
  const mktBoost = 1 + Math.min(0.35, (opts.marketingSpend ?? 0) / 120_000);
  const sched = buildShelfSchedule({
    basePool: pool * fanBoost * mktBoost,
    reviewScore: opts.reviewScore,
    size: opts.size,
    hypeModifier: hypeMod,
  });
  const price =
    opts.size === "small"
      ? UNIT_PRICE
      : opts.size === "medium"
        ? 19.99
        : opts.size === "large"
          ? 39.99
          : 59.99;
  const gross = sched.totalUnits * price;
  return {
    totalUnits: sched.totalUnits,
    weekly: sched.weekly,
    price,
    gross,
    net: gross * 0.85,
  };
}

/** Fans gained from a release (blueprint: units * 0.05 * score/10). */
export function classicFansFromRelease(units: number, reviewScore: number): number {
  // Canon: Units × 0.05 × ((score − 5.5) / 4.5) — can be negative
  return fansFromLifecycle(units, reviewScore);
}

/** Initial historical average for first game (blueprint: 30). */
export const CLASSIC_INITIAL_HISTORICAL = TYCOON_DEFAULTS.historicalAveragePoints; // 35.0 frozen

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
