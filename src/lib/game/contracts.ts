/**
 * Frozen data contracts for Garage Vertical Slice.
 * Authoritative naming: productionStage ≠ genreCapacityTier.
 */

/** Production development stage (the 3-phase, 9-field pipeline). */
export type ProductionStage = 1 | 2 | 3;

/** How many genres a project may carry (capacity unlock tier). */
export type GenreCapacityTier = 1 | 2 | 3 | 4;

export const SCHEMA_VERSION = 4;
export const SAVE_KEY_V3 = "studio-empire-save-v4";
export const SAVE_KEY_V4 = "studio-empire-save-v4";

export const GENRE_CAPACITY_WEIGHTS: Record<GenreCapacityTier, readonly number[]> = {
  1: [1.0],
  2: [0.8, 0.2],
  3: [0.6, 0.3, 0.1],
  4: [0.45, 0.3, 0.15, 0.1],
} as const;

/** Layered scoring pipeline order (for reports + tests). */
export const SCORING_PIPELINE = [
  "conceptFit",
  "productionDemand",
  "executionQuality",
  "reviews",
  "marketDemand",
  "weeklySales",
  "knowledge",
] as const;

export type ScoringLayer = (typeof SCORING_PIPELINE)[number];

/** Immutable outcome snapshot attached at release — never re-rolled on load. */
export type OutcomeTrace = {
  campaignSeed: number;
  projectSeed: number;
  releaseWeek: number;
  productQuality: number;
  reviewScores: number[];
  avgReview: number;
  hiddenFinalScore: number;
  weeklySalesPlan: number[];
  knowledgeKeys: string[];
  algorithm: "v2";
};

export type KnowledgeEntry = {
  key: string;
  kind: "combo" | "platform" | "lesson" | "weakness" | "strength";
  label: string;
  detail: string;
  confidence: number;
  sourceGameId: string;
  weekLearned: number;
};

export type CampaignKnowledge = {
  entries: KnowledgeEntry[];
  comboStats: Record<
    string,
    { plays: number; bestAvg: number; totalRevenue: number; lastWeek: number }
  >;
  lessonsSeen: string[];
};

export function emptyKnowledge(): CampaignKnowledge {
  return { entries: [], comboStats: {}, lessonsSeen: [] };
}

/** Deterministic seed from string (company name etc.). */
export function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) >>> 0;
}

export function defaultLaunchPrice(size: "small" | "medium" | "large" | "aaa"): number {
  if (size === "aaa") return 60;
  if (size === "large") return 50;
  if (size === "medium") return 40;
  return 25;
}
