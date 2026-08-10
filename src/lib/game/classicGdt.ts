/**
 * Classic Game Dev Tycoon core loop (legible, deterministic).
 *
 * Review ≈ (design+tech) / targetHighScore × combo × sizeCap
 * Units  ≈ (design+tech) × review² × k × size × platform
 *
 * Source inspiration: classic GDT phase sliders + topic/genre combos.
 * This is the simple spine — layered systems must not replace it with
 * free 10s or dozen-unit sales.
 */

import { SIZE_STATS, getGenre, STAGE_FIELDS } from "./data";
import { topicGenreCompatibility } from "./content/genreFit";
import type { DevField, GameSize, GenreId } from "./types";
import { clamp } from "./scoring/qualityEngine";

/** Genre tech/design bias (Action tech-heavy, RPG design-heavy). */
export const GENRE_WEIGHTS: Record<
  GenreId,
  { techWeight: number; designWeight: number }
> = {
  action: { techWeight: 0.7, designWeight: 0.3 },
  adventure: { techWeight: 0.35, designWeight: 0.65 },
  rpg: { techWeight: 0.4, designWeight: 0.6 },
  simulation: { techWeight: 0.55, designWeight: 0.45 },
  strategy: { techWeight: 0.6, designWeight: 0.4 },
  casual: { techWeight: 0.35, designWeight: 0.65 },
};

/**
 * Ideal relative slider emphasis per phase field (0–1 within phase).
 * Action P1: Engine high, Story low — matching classic GDT guides.
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
    else out[f] = 0.12; // non-focus fields should be de-emphasized
  }
  // Normalize to sum ~1 for display
  const sum = Object.values(out).reduce((a, b) => a + (b ?? 0), 0) || 1;
  for (const f of fields) out[f] = (out[f] ?? 0) / sum;
  return out;
}

/** Topic×genre → sales/review combo multiplier (~0.55–1.25). */
export function classicComboMultiplier(topicId: string, genreId: GenreId): number {
  const compat = topicGenreCompatibility(topicId, genreId); // 0–100
  // 100 → 1.22, 85 → 1.12, 70 → 1.0, 55 → 0.88, 35 → 0.72, 15 → 0.55
  return clamp(0.45 + (compat / 100) * 0.8, 0.5, 1.25);
}

/** Deviation of player sliders from genre ideal (0 = perfect, 1 = all wrong). */
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
  return clamp(dev / 2, 0, 1); // max ~1 when completely inverted
}

/**
 * Classic review from accumulated points.
 * Score = (points / target) * combo * (1 - bugHit) * (1 - flatSliderHit), clamped to size max.
 */
export function classicReviewScore(opts: {
  designPoints: number;
  techPoints: number;
  bugs: number;
  targetHighScore: number;
  comboMult: number;
  size: GameSize;
  /** 0–1: how much player ignored ideal sliders across development */
  sliderMiss?: number;
  /** Solo garage first games: soft expertise dampener 0.85–1 */
  expertise?: number;
}): { avg: number; scores: number[]; basePoints: number; hidden: number } {
  const design = Math.max(0, opts.designPoints);
  const tech = Math.max(0, opts.techPoints);
  const points = design + tech;
  // GDT size divisor (same spine as qualityEngine)
  const sizeDiv =
    opts.size === "aaa" ? 1.8 : opts.size === "large" ? 1.4 : opts.size === "medium" ? 1.2 : 1.0;
  const bugRatio = clamp(1 - opts.bugs / 50, 0.4, 1);
  // Flat equal sliders (never steered) hurt priority — matches GDT "important fields"
  const priority = clamp(1.05 - (opts.sliderMiss ?? 0) * 0.95, 0.48, 1.15);
  const qualityFactor = priority * bugRatio;
  // baseScore = ((T+D)/(2*sizeDiv)) * quality * combo
  const baseScore =
    ((tech + design) / (2 * sizeDiv)) * qualityFactor * opts.comboMult;
  const target = Math.max(1, opts.targetHighScore);
  const expertise = opts.expertise ?? 1;
  const maxScore = SIZE_STATS[opts.size]?.maxScore ?? 10;
  // Score = 10 * (baseScore / market target) — classic moving-target GDT
  let hidden = clamp(10 * (baseScore / target), 1, 10) * expertise;
  hidden = clamp(hidden, 1, maxScore);
  const seed = Math.floor(points * 17 + opts.bugs * 3 + baseScore * 10) % 1000;
  const scores = [0, 1, 2, 3].map((i) => {
    const j = (((seed + i * 37) % 100) / 100 - 0.5) * 1.1;
    return Math.round(clamp(hidden + j, 1, maxScore) * 10) / 10;
  });
  const avg =
    Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  return { avg, scores, basePoints: baseScore, hidden };
}

/**
 * Classic unit sales (Google guide spine):
 * BaseUnits = (Tech + Design) × Review² × 15 × size × platform × combo
 * Gross = units × price; platform tax ~15–30%.
 */
export function classicUnitsSold(opts: {
  designPoints: number;
  techPoints: number;
  reviewScore: number; // 1–10
  size: GameSize;
  platformMarket: number; // ~0.5–1.5
  comboMult: number;
  marketingSpend?: number;
  fans?: number;
  hype?: number;
}): { totalUnits: number; weekly: number[]; price: number; gross: number; net: number } {
  const points = Math.max(1, opts.designPoints + opts.techPoints);
  const review = clamp(opts.reviewScore, 1, 10);
  const size = SIZE_STATS[opts.size];
  const fanBoost = 1 + Math.min(1.5, (opts.fans ?? 0) / 50_000);
  const hypeBoost = 1 + Math.min(0.8, (opts.hype ?? 0) / 120);
  const mktBoost = 1 + Math.min(0.6, (opts.marketingSpend ?? 0) / 80_000);
  const base =
    points *
    Math.pow(review, 2) *
    9 *
    size.salesMult *
    Math.max(0.35, opts.platformMarket) *
    opts.comboMult *
    fanBoost *
    hypeBoost *
    mktBoost;
  const totalUnits = Math.max(0, Math.floor(base));
  // 12-week curve: front-loaded classic shelf
  const weights = [0.22, 0.16, 0.12, 0.1, 0.08, 0.07, 0.06, 0.05, 0.04, 0.04, 0.03, 0.03];
  const weekly = weights.map((w) => Math.floor(totalUnits * w));
  // fix rounding residual on week 1
  const sum = weekly.reduce((a, b) => a + b, 0);
  if (weekly[0] != null) weekly[0] += Math.max(0, totalUnits - sum);
  const price =
    opts.size === "small" ? 9.99 : opts.size === "medium" ? 19.99 : opts.size === "large" ? 39.99 : 59.99;
  const gross = totalUnits * price;
  const net = gross * 0.75; // ~25% platform tax (guide used 15%; modern stores ~30%)
  return { totalUnits, weekly, price, gross, net };
}

/** Expected points band for a garage small game (solo, ~8 weeks). */
export const GARAGE_SMALL_POINT_BAND = { weak: 35, ok: 70, strong: 110 };
