import type { GenreId } from "../types";
import type { RivalProject } from "./types";

export type CompetitorRef = {
  id: string;
  genreId: GenreId;
  platformId: string;
  topicId: string;
  size: string;
  releaseWeek: number;
  awareness: number;
  avgReview: number;
  marketingSpend: number;
  isPlayer?: boolean;
};

/** Overlap 0–1 between two releases. */
export function releaseOverlap(a: CompetitorRef, b: CompetitorRef): number {
  const genreSim = a.genreId === b.genreId ? 1 : 0.15;
  const platformSim = a.platformId === b.platformId ? 1 : 0.25;
  const topicSim = a.topicId === b.topicId ? 1 : 0.2;
  const sizeSim = a.size === b.size ? 0.8 : 0.4;
  // audience proxy via size/genre
  const audience = genreSim * 0.6 + sizeSim * 0.4;
  return (
    genreSim * 0.3 +
    audience * 0.25 +
    platformSim * 0.2 +
    topicSim * 0.15 +
    sizeSim * 0.1
  );
}

/** Window weight: full within 4 weeks, fades to 0 by ~12 weeks. */
export function windowWeight(weekA: number, weekB: number): number {
  const gap = Math.abs(weekA - weekB);
  if (gap <= 4) return 1;
  if (gap >= 12) return 0;
  return 1 - (gap - 4) / 8;
}

/**
 * Attraction-share competition modifier for a game in a week.
 * Returns ~0.55–1.12 (lower = more competition).
 */
export function competitionModifierFor(
  self: CompetitorRef,
  others: CompetitorRef[],
  week: number,
): number {
  let pressure = 0;
  const selfAppeal =
    (0.3 + self.awareness) *
    (0.4 + self.avgReview / 15) *
    (1 + self.marketingSpend / 200000);

  for (const o of others) {
    if (o.id === self.id) continue;
    const w = windowWeight(week, o.releaseWeek);
    if (w <= 0) continue;
    const ov = releaseOverlap(self, o);
    if (ov < 0.35) continue;
    const appeal =
      (0.3 + o.awareness) *
      (0.4 + o.avgReview / 15) *
      (1 + o.marketingSpend / 200000);
    pressure += ov * w * appeal;
  }

  const outside = 1.15;
  const share = selfAppeal / (outside + selfAppeal + pressure);
  // Map share to modifier: alone ~1.05, crowded ~0.6
  const mod = 0.55 + share * 0.9;
  return Math.max(0.5, Math.min(1.15, mod));
}

export function rivalToCompetitor(p: RivalProject): CompetitorRef {
  return {
    id: p.id,
    genreId: p.genreId,
    platformId: p.platformId,
    topicId: p.topicId,
    size: p.size,
    releaseWeek: p.releasedWeek ?? p.plannedReleaseWeek,
    awareness: Math.min(0.9, 0.15 + p.marketingSpend / 80000 + p.avgReview / 30),
    avgReview: p.avgReview || 5,
    marketingSpend: p.marketingSpend,
  };
}
