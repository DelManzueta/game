/**
 * TYCOON-ENGINE CORE v2.1.0 — frozen production spine.
 * Source: SYSTEM ARCHITECTURE SPECIFICATION (stateless / OO).
 * Studio Empire implements this in the browser; do not silently drift formulas.
 *
 * Total points come from multi-week development (not one RANDOM 30–50),
 * but all post-production gates match the frozen math exactly.
 */

import type { AudienceId, GameSize, GenreId } from "./types";
import { clamp } from "./scoring/qualityEngine";
import { HISTORICAL_AVERAGE_FLOOR } from "./tycoonPiracy";

export const TYCOON_ENGINE_VERSION = "2.1.0" as const;

/** Module 1 — default global state numbers */
export const TYCOON_DEFAULTS = {
  cash: 75_000,
  monthlyRentGarage: 8_000,
  historicalAveragePoints: 35.0,
  hype: 0,
  fans: 0,
  engine: { name: "Default Text Core", tech_mult: 1.0, design_mult: 1.0 },
  ownedLicenses: ["pc"] as const,
} as const;

/** Module 3.1 — hard platform lifecycle (ids map to catalog) */
export const TYCOON_PLATFORMS = {
  pc: {
    name: "PC",
    license_cost: 0,
    market_share: 1.0,
    target_audience: "Everyone" as const,
    lifespan_weeks: 9999,
  },
  tes: {
    name: "TES",
    license_cost: 80_000,
    market_share: 1.4,
    target_audience: "Kids" as const,
    lifespan_weeks: 192,
  },
  gameling: {
    name: "Gameling",
    license_cost: 50_000,
    market_share: 1.2,
    target_audience: "Kids" as const,
    lifespan_weeks: 240,
  },
  playsystem: {
    name: "Playsystem",
    license_cost: 150_000,
    market_share: 1.8,
    target_audience: "Mature" as const,
    lifespan_weeks: 288,
  },
} as const;

/** Module 3.2 — engine component mults (compile by product) */
export const TYCOON_ENGINE_PARTS: Record<
  string,
  { rp_cost: number; cash_cost: number; tech_mod: number; design_mod: number }
> = {
  "2D Graphics V2": { rp_cost: 20, cash_cost: 15_000, tech_mod: 1.15, design_mod: 1.05 },
  "3D Graphics V1": { rp_cost: 50, cash_cost: 40_000, tech_mod: 1.35, design_mod: 1.1 },
  "Stereo Sound": { rp_cost: 15, cash_cost: 8_000, tech_mod: 1.05, design_mod: 1.1 },
  "Linear Physics": { rp_cost: 30, cash_cost: 20_000, tech_mod: 1.25, design_mod: 1.0 },
  "Basic AI": { rp_cost: 25, cash_cost: 12_000, tech_mod: 1.15, design_mod: 1.05 },
};

/** Module 3.3 — marketing tiers */
export const TYCOON_MARKETING = {
  tier_1: { name: "Raw Dev Blog Post", cost: 2_000, min_hype: 5, max_hype: 12 },
  tier_2: { name: "Gaming Magazine Ad", cost: 15_000, min_hype: 20, max_hype: 45 },
  tier_3: { name: "G3 Convention Booth", cost: 65_000, min_hype: 60, max_hype: 130 },
} as const;

// ── Module 2.1 multipliers ──────────────────────────────────────────────────

/** Canonical good pairs from frozen spec + soft fallback for other combos. */
export function tycoonComboMultiplier(topicId: string, genreId: GenreId): number {
  const t = topicId.toLowerCase().replace(/[\s-]+/g, "_");
  const g = genreId;
  // Hard gates (spec 2.1)
  if (g === "action" && (t.includes("sci") || t.includes("space") || t.includes("cyber"))) return 1.3;
  if (g === "simulation" && (t.includes("city") || t.includes("life") || t.includes("economy")))
    return 1.3;
  if (g === "casual" && (t.includes("casual") || t.includes("party") || t.includes("puzzle")))
    return 1.3;
  if (g === "rpg" && (t.includes("fantasy") || t.includes("medieval") || t.includes("dungeon")))
    return 1.3;
  // Hard miss: Action+Casual-ish topics already handled elsewhere — default soft bad
  if (g === "action" && (t.includes("farm") || t.includes("dating") || t.includes("school")))
    return 0.7;
  if (g === "simulation" && (t.includes("zombie") || t.includes("horror"))) return 0.7;
  // Neutral band for everything else (spec binary is harsh; keep playable)
  return 0.95;
}

export function tycoonAudienceMultiplier(audience: AudienceId | string): number {
  const a = String(audience).toLowerCase();
  if (a === "everyone" || a === "young" || a === "kids" || a === "children") return 1.2;
  return 0.8; // Mature etc.
}

export function tycoonHypeMultiplier(currentHype: number): number {
  return 1.0 + Math.max(0, currentHype) / 100.0;
}

// ── Module 2.2 / 2.3 / 2.4 / 2.5 ────────────────────────────────────────────

/**
 * Final review (spec 2.3). Slider/bug fit are Studio Empire extensions that
 * only damp — they never raise above the frozen raw path.
 */
export function tycoonReviewScore(opts: {
  totalPoints: number;
  historicalAverage: number;
  /** 0–1 miss; damps only */
  sliderMiss?: number;
  bugs?: number;
  sizeMax?: number;
}): {
  final: number;
  raw: number;
  scoreRatio: number;
  nextHistorical: number;
} {
  const hist = Math.max(HISTORICAL_AVERAGE_FLOOR, opts.historicalAverage || TYCOON_DEFAULTS.historicalAveragePoints);
  const points = Math.max(0, opts.totalPoints);
  const scoreRatio = points / hist;
  // Spec: Raw = Score Ratio × 7.0
  let raw = scoreRatio * 7.0;
  // Soft damp only (never inflate)
  const sliderFit = clamp(1.0 - (opts.sliderMiss ?? 0) * 0.35, 0.65, 1);
  const bugFit = clamp(1 - (opts.bugs ?? 0) / 80, 0.7, 1);
  raw *= sliderFit * bugFit;
  const max = opts.sizeMax ?? 10;
  const final = clamp(Math.round(raw * 10) / 10, 1.0, max);
  // Spec 2.4 trailing average
  const nextHistorical = Math.max(HISTORICAL_AVERAGE_FLOOR, hist * 0.7 + points * 0.3);
  return { final, raw, scoreRatio, nextHistorical };
}

/**
 * Market revenue curve (spec 2.5).
 * Units = ROUND(TotalPoints × Review^2.3 × 15 × HypeMult × PlatformShare)
 * Gross = Units × 9.99 (small); Net = Gross × 0.85
 */
export function tycoonUnitsSold(opts: {
  totalPoints: number;
  reviewScore: number;
  hype: number;
  platformMarketShare: number;
  /** Optional size price override; default 9.99 */
  unitPrice?: number;
}): {
  totalUnits: number;
  weekly: number[];
  price: number;
  gross: number;
  net: number;
  hypeMult: number;
} {
  const points = Math.max(1, opts.totalPoints);
  const review = clamp(opts.reviewScore, 1, 10);
  const hypeMult = tycoonHypeMultiplier(opts.hype);
  const share = Math.max(0.05, opts.platformMarketShare);
  const totalUnits = Math.max(
    0,
    Math.round(points * Math.pow(review, 2.3) * 15 * hypeMult * share),
  );
  const weights = [0.22, 0.16, 0.12, 0.1, 0.08, 0.07, 0.06, 0.05, 0.04, 0.04, 0.03, 0.03];
  const weekly = weights.map((w) => Math.floor(totalUnits * w));
  const sum = weekly.reduce((a, b) => a + b, 0);
  if (weekly[0] != null) weekly[0] += Math.max(0, totalUnits - sum);
  const price = opts.unitPrice ?? 9.99;
  const gross = totalUnits * price;
  const net = gross * 0.85;
  return { totalUnits, weekly, price, gross, net, hypeMult };
}

/** Spec Module 4 step 2 — integer 12% hype decay */
export function tycoonHypeDecay(currentHype: number): number {
  if (currentHype <= 0) return 0;
  const decay = Math.max(1, Math.floor(currentHype * 0.12));
  return Math.max(0, currentHype - decay);
}

/** Spec Module 4 step 3 — staff energy */
export function tycoonStaffEnergyTick(energy: number, working: boolean): number {
  if (!working) return Math.min(100, energy + 8);
  if (energy > 20) return Math.max(0, energy - 5);
  return Math.min(100, energy + 25);
}

/** Compile engine part mults (product of selected parts). */
export function compileTycoonEngine(partKeys: string[]): {
  tech_mult: number;
  design_mult: number;
  rp_cost: number;
  cash_cost: number;
} {
  let tech = 1;
  let design = 1;
  let rp = 0;
  let cash = 0;
  for (const k of partKeys) {
    const p = TYCOON_ENGINE_PARTS[k];
    if (!p) continue;
    tech *= p.tech_mod;
    design *= p.design_mod;
    rp += p.rp_cost;
    cash += p.cash_cost;
  }
  return {
    tech_mult: Math.round(tech * 100) / 100,
    design_mult: Math.round(design * 100) / 100,
    rp_cost: rp,
    cash_cost: cash,
  };
}

/** Deterministic base points band for a week of solo garage work (seeded). */
export function tycoonWeekBasePoints(seed: number): number {
  // Spec RANDOM_INT(30,50) for full project — weekly slice ~6–12
  return 6 + (Math.abs(seed) % 7);
}
