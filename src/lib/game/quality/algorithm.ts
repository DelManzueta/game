/**
 * ALGORITHM 2 — Quality + Reviews (separate from sales/marketing/platforms).
 * Concept Fit → Execution Quality → Reviews (once at release).
 */
import { clamp, stableUnit } from "../determinism";
import type { GenreCapacityTier } from "../contracts";

export const GENRE_CAPACITY_WEIGHTS: Record<1 | 2 | 3 | 4, readonly number[]> = {
  1: [1.0],
  2: [0.8, 0.2],
  3: [0.6, 0.3, 0.1],
  4: [0.4, 0.4, 0.1, 0.1],
};

export const DESIGN_DISCIPLINES = new Set([
  "story",
  "gameplay",
  "dialogues",
  "level_design",
  "world",
]);

export const TECHNOLOGY_DISCIPLINES = new Set(["engine", "ai", "graphics", "sound"]);

export function calculateConceptFit(
  selectedGenreCompatibilities: number[],
  genreCapacityTier: GenreCapacityTier | 1 | 2 | 3 | 4,
): number {
  const weights = GENRE_CAPACITY_WEIGHTS[genreCapacityTier];
  if (!weights) throw new Error("Invalid genre capacity tier.");
  if (selectedGenreCompatibilities.length !== weights.length) {
    throw new Error("Selected genre count does not match genre capacity tier.");
  }
  let score = 0;
  for (let i = 0; i < weights.length; i++) {
    score += clamp(selectedGenreCompatibilities[i]!, 0, 100) * weights[i]!;
  }
  return clamp(score, 0, 100);
}

export type DisciplineMetric = {
  discipline: string;
  group: string;
  importanceWeight: number;
  completedWorkRatio: number;
  actualFocus: number;
  targetFocus: number;
  capability: number;
  engineSupport: number;
};

export type QualityBalance = {
  workWeight: number;
  focusWeight: number;
  capabilityWeight: number;
  engineWeight: number;
  bugPenaltyPerSeverity: number;
  maximumBugPenalty: number;
  maximumPolishBonus: number;
};

export const DEFAULT_QUALITY_BALANCE: QualityBalance = {
  workWeight: 0.45,
  focusWeight: 0.2,
  capabilityWeight: 0.2,
  engineWeight: 0.15,
  bugPenaltyPerSeverity: 2,
  maximumBugPenalty: 30,
  maximumPolishBonus: 5,
};

export type QualityResult = {
  conceptFit: number;
  fieldScores: Record<string, number>;
  designQuality: number;
  technologyQuality: number;
  executionQuality: number;
  overallQuality: number;
  bugPenalty: number;
  polishBonus: number;
};

export type ReviewOutlet = {
  name: string;
  weight: number;
  bias: number;
  variance: number;
};

export const DEFAULT_OUTLETS: ReviewOutlet[] = [
  { name: "Pixel Weekly", weight: 1, bias: 0.5, variance: 2.2 },
  { name: "Joystick Journal", weight: 1.1, bias: -0.3, variance: 1.8 },
  { name: "Home Computer Monthly", weight: 0.95, bias: 0.2, variance: 2.0 },
  { name: "Arcade Digest", weight: 1, bias: -0.5, variance: 2.4 },
  { name: "Silicon Critic", weight: 1.05, bias: 0, variance: 1.6 },
];

export type ReviewResult = {
  calculatedOnDay: number;
  reviewCenter: number;
  outletScores: Record<string, number>;
  reviewAverage: number;
  label: string;
  reasonCodes: string[];
};

export function symmetricFocusAlignment(actualFocus: number, targetFocus: number): number {
  const actual = Math.max(0, actualFocus);
  const target = Math.max(0, targetFocus);
  const denominator = actual + target;
  if (denominator <= 0) return 1;
  return clamp(1 - Math.abs(actual - target) / denominator, 0, 1);
}

function weightedAverage(
  values: Record<string, number>,
  weights: Record<string, number>,
): number {
  let tw = 0;
  let sum = 0;
  for (const key of Object.keys(values)) {
    const w = weights[key] ?? 0;
    tw += w;
    sum += values[key]! * w;
  }
  return tw <= 0 ? 0 : sum / tw;
}

export function calculateQuality(opts: {
  conceptFit: number;
  metrics: DisciplineMetric[];
  unfixedBugSeverity: number;
  polishRatio: number;
  balance?: QualityBalance;
}): QualityResult {
  const balance = opts.balance ?? DEFAULT_QUALITY_BALANCE;
  if (!opts.metrics.length) throw new Error("At least one discipline metric is required.");

  const fieldScores: Record<string, number> = {};
  const importance: Record<string, number> = {};

  for (const metric of opts.metrics) {
    const work = clamp(metric.completedWorkRatio, 0, 1);
    const focusFit = symmetricFocusAlignment(metric.actualFocus, metric.targetFocus);
    const capability = clamp(metric.capability, 0, 1);
    const engineSupport = clamp(metric.engineSupport, 0, 1);
    const score =
      100 *
      (balance.workWeight * work +
        balance.focusWeight * focusFit +
        balance.capabilityWeight * capability +
        balance.engineWeight * engineSupport);
    fieldScores[metric.discipline] = clamp(score, 0, 100);
    importance[metric.discipline] = Math.max(0, metric.importanceWeight);
  }

  const designValues: Record<string, number> = {};
  const designWeights: Record<string, number> = {};
  const techValues: Record<string, number> = {};
  const techWeights: Record<string, number> = {};
  for (const key of Object.keys(fieldScores)) {
    if (DESIGN_DISCIPLINES.has(key)) {
      designValues[key] = fieldScores[key]!;
      designWeights[key] = importance[key]!;
    }
    if (TECHNOLOGY_DISCIPLINES.has(key)) {
      techValues[key] = fieldScores[key]!;
      techWeights[key] = importance[key]!;
    }
  }

  const designQuality = weightedAverage(designValues, designWeights);
  const technologyQuality = weightedAverage(techValues, techWeights);
  let executionQuality = weightedAverage(fieldScores, importance);

  const bugPenalty = Math.min(
    balance.maximumBugPenalty,
    Math.max(0, opts.unfixedBugSeverity) * balance.bugPenaltyPerSeverity,
  );
  const polishBonus = balance.maximumPolishBonus * clamp(opts.polishRatio, 0, 1);
  executionQuality = clamp(executionQuality - bugPenalty + polishBonus, 0, 100);

  const overallQuality = clamp(
    designQuality * 0.4 + technologyQuality * 0.3 + executionQuality * 0.3,
    0,
    100,
  );

  return {
    conceptFit: clamp(opts.conceptFit, 0, 100),
    fieldScores,
    designQuality,
    technologyQuality,
    executionQuality,
    overallQuality,
    bugPenalty,
    polishBonus,
  };
}

export function reviewLabel(score: number): string {
  if (score >= 95) return "masterpiece";
  if (score >= 85) return "great";
  if (score >= 75) return "good";
  if (score >= 60) return "mixed";
  if (score >= 40) return "poor";
  return "disastrous";
}

export function calculateReviews(opts: {
  campaignSeed: string | number;
  gameId: string;
  releaseDay: number;
  quality: QualityResult;
  outlets?: ReviewOutlet[];
}): ReviewResult {
  const outlets = opts.outlets ?? DEFAULT_OUTLETS;
  if (!outlets.length) throw new Error("At least one review outlet is required.");

  const reviewCenter = clamp(
    opts.quality.overallQuality * 0.7 +
      opts.quality.conceptFit * 0.2 +
      opts.quality.executionQuality * 0.1,
    0,
    100,
  );

  const outletScores: Record<string, number> = {};
  let totalWeight = 0;
  let weightedTotal = 0;

  for (const outlet of outlets) {
    if (outlet.weight <= 0) throw new Error("Review outlet weight must be positive.");
    const noise =
      (stableUnit(
        opts.campaignSeed,
        opts.gameId,
        "review",
        opts.releaseDay,
        outlet.name,
      ) *
        2 -
        1) *
      outlet.variance;
    const score = clamp(reviewCenter + outlet.bias + noise, 0, 100);
    outletScores[outlet.name] = score;
    totalWeight += outlet.weight;
    weightedTotal += score * outlet.weight;
  }

  const reviewAverage = totalWeight > 0 ? weightedTotal / totalWeight : reviewCenter;
  const reasons: string[] = [];
  if (opts.quality.conceptFit >= 85) reasons.push("strong_concept_fit");
  else if (opts.quality.conceptFit < 60) reasons.push("weak_concept_fit");
  if (opts.quality.designQuality >= 85) reasons.push("strong_design");
  else if (opts.quality.designQuality < 60) reasons.push("weak_design");
  if (opts.quality.technologyQuality >= 85) reasons.push("strong_technology");
  else if (opts.quality.technologyQuality < 60) reasons.push("weak_technology");
  if (opts.quality.bugPenalty > 0) reasons.push("unfixed_bugs");
  if (opts.quality.polishBonus >= 3) reasons.push("polished");

  return {
    calculatedOnDay: opts.releaseDay,
    reviewCenter,
    outletScores,
    reviewAverage,
    label: reviewLabel(reviewAverage),
    reasonCodes: reasons,
  };
}

/** Build discipline metrics from production candidate + founder/engine. */
export function metricsFromProduction(opts: {
  completedStages: {
    stage: number;
    plan: {
      allocation: Record<string, number>;
      demand: Record<string, number>;
      requiredSwu: Record<string, number>;
    };
    workDone: Record<string, number>;
  }[];
  founderCapability: (d: string) => number;
  /** Installed engine features boost tech disciplines only. */
  engineSupportFor: (d: string) => number;
}): DisciplineMetric[] {
  const metrics: DisciplineMetric[] = [];
  for (const stage of opts.completedStages) {
    for (const d of Object.keys(stage.plan.requiredSwu)) {
      const req = stage.plan.requiredSwu[d] ?? 1;
      const done = stage.workDone[d] ?? 0;
      const group = DESIGN_DISCIPLINES.has(d) ? "design" : "technology";
      metrics.push({
        discipline: d,
        group,
        importanceWeight: stage.plan.demand[d] ?? 1,
        completedWorkRatio: req > 0 ? clamp(done / req, 0, 1) : 1,
        actualFocus: stage.plan.allocation[d] ?? 0,
        targetFocus: stage.plan.demand[d] ?? 0,
        capability: opts.founderCapability(d),
        engineSupport: opts.engineSupportFor(d),
      });
    }
  }
  return metrics;
}
