/**
 * Topic × ordered-genre fit with genre-capacity tier weights.
 * productionStage ≠ genreCapacityTier — only the latter uses these weights.
 */
import { GENRE_CAPACITY_WEIGHTS, type GenreCapacityTier } from "../contracts";
import type { CompatibilityValue, GenreId } from "../types";
import { getTopicDef } from "./topics";

export const COMPATIBILITY_VALUES: CompatibilityValue[] = [100, 85, 70, 55, 35, 15];

/** Map numeric rank → legacy MatchTier for UI labels. */
export function compatibilityToTier(
  v: number,
): "great" | "good" | "ok" | "poor" | "bad" {
  if (v >= 100) return "great";
  if (v >= 85) return "good";
  if (v >= 70) return "ok";
  if (v >= 55) return "poor";
  return "bad";
}

/** Raw 0–100 compatibility for one topic × genre. */
export function topicGenreCompatibility(topicId: string, genreId: GenreId): CompatibilityValue {
  const t = getTopicDef(topicId);
  if (!t) return 55;
  return t.compatibility[genreId] ?? 55;
}

/**
 * Weighted GenreFit (0–100) from ordered genres and capacity tier.
 * Only includes as many genres as the tier allows.
 */
export function computeGenreFit(opts: {
  topicId: string;
  genres: GenreId[];
  capacityTier?: GenreCapacityTier;
}): number {
  const tier: GenreCapacityTier = opts.capacityTier ?? (
    opts.genres.length <= 1 ? 1 : opts.genres.length === 2 ? 2 : opts.genres.length === 3 ? 3 : 4
  );
  const weights = GENRE_CAPACITY_WEIGHTS[tier];
  const genres = opts.genres.slice(0, weights.length);
  // reject empty
  if (!genres.length) return 55;
  let sum = 0;
  for (let i = 0; i < genres.length; i++) {
    const w = weights[i] ?? 0;
    sum += topicGenreCompatibility(opts.topicId, genres[i]!) * w;
  }
  // weights already sum to 1 → result is 0–100 GenreFit
  return sum;
}

/**
 * Multiplier into quality pipeline.
 * GenreFit 100 → 1.10, 70 → 0.98, 15 → 0.76
 */
export function genreFitModifier(genreFit: number): number {
  return 0.7 + (genreFit / 100) * 0.4;
}

/** Legacy MatchTier for one pair (for evaluateCombo UI). */
export function topicGenreTier(
  topicId: string,
  genreId: GenreId,
): "great" | "good" | "ok" | "poor" | "bad" {
  return compatibilityToTier(topicGenreCompatibility(topicId, genreId));
}
