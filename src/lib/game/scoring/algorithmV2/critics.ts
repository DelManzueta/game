/**
 * Four persistent critics — product quality first, then affinity + small seeded noise.
 * Hype/marketing never affect critic scores.
 */
import type { GenreId } from "../../types";
import { SeededRng, hashSeed } from "../rng";
import { EXPECTATION_CAP } from "./config";
import {
  computeCraftAndQuality,
  pickReviewComment,
  type QualityBreakdownV2,
} from "./quality";
import type { GameProject, StaffMember } from "../../types";

export type CriticProfile = {
  id: string;
  name: string;
  genreBias: Partial<Record<GenreId, number>>; // -5..+5
  innovationPref: number;
  technicalPref: number;
  narrativePref: number;
  bugTolerance: number; // higher = less penalty
};

export const CRITICS: CriticProfile[] = [
  {
    id: "gamesradar_like",
    name: "Pulse Games",
    genreBias: { action: 2, adventure: 1, casual: -1 },
    innovationPref: 0.5,
    technicalPref: 1.2,
    narrativePref: 0.3,
    bugTolerance: 0.9,
  },
  {
    id: "story_focus",
    name: "Narrative Weekly",
    genreBias: { adventure: 2.5, rpg: 2, action: 1, simulation: -1, strategy: -0.5 },
    innovationPref: 0.8,
    technicalPref: 0.4,
    narrativePref: 2.0,
    bugTolerance: 1.0,
  },
  {
    id: "hardcore",
    name: "Silicon Critic",
    genreBias: { strategy: 2, simulation: 1.5, rpg: 1, casual: -2 },
    innovationPref: 1.2,
    technicalPref: 1.8,
    narrativePref: 0.6,
    bugTolerance: 0.65,
  },
  {
    id: "populist",
    name: "Weekend Play",
    genreBias: { casual: 2, action: 1.5, simulation: 1, strategy: -1 },
    innovationPref: 0.4,
    technicalPref: 0.6,
    narrativePref: 0.5,
    bugTolerance: 1.15,
  },
];

export type CriticReviewV2 = {
  criticId: string;
  name: string;
  score: number; // 1–10, may be 11 rarely
  comment: string;
  affinity: number;
  variation: number;
};

export type ReviewResultV2 = {
  productQuality: number;
  breakdown: QualityBreakdownV2;
  reviews: CriticReviewV2[];
  scores: number[];
  avg: number;
  /** Map to 1–10 for sales conversion helpers */
  avgOutOf10: number;
};

export function scoreCriticsV2(opts: {
  project: GameProject;
  staff: StaffMember[];
  platformMarket: number;
  platformTechCeiling: number;
  reputation?: number;
  previousAvgReview?: number;
  designBoost?: number;
  techBoost?: number;
  campaignSeed: number;
  week: number;
}): ReviewResultV2 {
  const seed = hashSeed(opts.campaignSeed, opts.project.id, "review-v2", opts.week);
  const breakdown = computeCraftAndQuality({
    project: opts.project,
    staff: opts.staff,
    platformMarket: opts.platformMarket,
    platformTechCeiling: opts.platformTechCeiling,
    reputation: opts.reputation,
    previousAvgReview: opts.previousAvgReview,
    designBoost: opts.designBoost,
    techBoost: opts.techBoost,
    seed,
  });

  const reviews: CriticReviewV2[] = [];
  for (const critic of CRITICS) {
    const crng = new SeededRng(hashSeed(seed, critic.id));
    const genreBias = critic.genreBias[opts.project.genreId] ?? 0;
    const innov = (breakdown.innovation - 0.5) * critic.innovationPref * 4;
    const tech =
      (breakdown.execution * 0.5 + breakdown.designTechBalance * 0.5 - 0.5) *
      critic.technicalPref *
      3;
    const narr =
      (breakdown.focusAlignment - 0.5) * critic.narrativePref * 2.5;
    const affinity = genreBias + innov + tech + narr;
    const bugHit =
      (breakdown.bugPenalty / critic.bugTolerance) * 0.35;
    const variation = crng.jitter(2.2); // small
    const expectation = clampExpect(breakdown.expectationModifier);

    // productQuality is 1–100 → map toward 1–10 scale then adjust
    let score =
      breakdown.productQuality / 10 +
      affinity * 0.15 +
      expectation * 0.08 +
      variation * 0.15 -
      bugHit * 0.12;

    // Rare 11 for exceptional + aligned critic
    if (
      breakdown.productQuality >= 92 &&
      breakdown.polish >= 0.85 &&
      affinity > 3 &&
      crng.next() < 0.08
    ) {
      score = 11;
    } else {
      score = Math.round(clamp(score, 1, 10) * 10) / 10;
      score = clamp(score, 1, 10);
    }

    reviews.push({
      criticId: critic.id,
      name: critic.name,
      score,
      comment: pickReviewComment(breakdown, opts.project.genreId, crng),
      affinity,
      variation,
    });
  }

  const scores = reviews.map((r) => r.score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return {
    productQuality: breakdown.productQuality,
    breakdown,
    reviews,
    scores,
    avg: Math.round(avg * 10) / 10,
    avgOutOf10: Math.min(10, avg),
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function clampExpect(n: number) {
  return clamp(n, -EXPECTATION_CAP, EXPECTATION_CAP);
}
