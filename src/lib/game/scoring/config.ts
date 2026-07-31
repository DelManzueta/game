/**
 * All balancing constants for the GDT-inspired quality engine.
 * Numbers live here — not scattered through gameplay code.
 *
 * Reference: reverse-engineered GDT review pipeline + Greenheart confirmation
 * that past super-hits raise market expectations (target high score).
 * Forum: https://forum.greenheartgames.com/t/req-game-review-algorithm/9214
 */

import type { DevField, GenreId, MatchTier } from "../types";

/** When true, reviews compare baseScore against a moving targetHighScore (original GDT). */
export const USE_MOVING_TARGET_SCORE = true;

/** Initial market expectation for baseScore → maps ~to a mid review early game. */
export const INITIAL_TARGET_HIGH_SCORE = 20;

/** Guaranteed time share per stage field before proportional split. */
export const STAGE_FIELD_BASE_SHARE = 0.1;

/** Remaining share of a stage divided by slider weights. */
export const STAGE_FIELD_PROPORTIONAL_SHARE = 0.7;

/** Field → technology weight (rest is design). */
export const FIELD_TECH_DESIGN: Record<DevField, { tech: number; design: number }> = {
  engine: { tech: 0.8, design: 0.2 },
  gameplay: { tech: 0.2, design: 0.8 },
  story: { tech: 0.2, design: 0.8 },
  dialogue: { tech: 0.1, design: 0.9 },
  level: { tech: 0.6, design: 0.4 },
  ai: { tech: 0.8, design: 0.2 },
  world: { tech: 0.4, design: 0.6 },
  graphics: { tech: 0.5, design: 0.5 },
  sound: { tech: 0.4, design: 0.6 },
};

/** Preferred Technology / Design ratio by genre (GDT table). */
export const GENRE_TECH_DESIGN_RATIO: Record<GenreId, number> = {
  action: 1.8,
  adventure: 0.4,
  rpg: 0.6,
  simulation: 1.6,
  strategy: 1.4,
  casual: 0.5,
};

/** Compatibility multipliers (+++ … ---). */
export const COMPATIBILITY: Record<MatchTier, number> = {
  great: 1.0, // excellent +++
  good: 0.9, // ++
  ok: 0.8, // +
  poor: 0.7, // --
  bad: 0.6, // ---
};

/** Divisors used in baseScore for game size. */
export const SIZE_SCORE_MULTIPLIER = {
  small: 1.0,
  medium: 1.2,
  large: 1.4,
  aaa: 1.8,
} as const;

/** Sales/units size factor (separate from score divisor). */
export const SIZE_SALES_MULTIPLIER = {
  small: 0.55,
  medium: 1.0,
  large: 1.55,
  aaa: 2.4,
} as const;

/** Quality-factor tuning. */
export const QUALITY = {
  start: 1,
  balanceGood: 0.1,
  balanceBad: -0.1,
  balanceThresholdGood: 0.25,
  balanceThresholdOk: 0.5,
  /** Skip balance check if tech+design below this. */
  balanceMinPoints: 30,
  /** Important field share threshold (of stage time). */
  importantShareHigh: 0.4,
  importantShareLow: 0.2,
  importantTwoPlusBonus: 0.2,
  importantOneBonus: 0.1,
  importantNonePenalty: -0.15,
  importantLowEachPenalty: -0.15,
  unimportantTwoPlusPenalty: -0.2,
  sameTopicGenrePenalty: -0.4,
  sequelTooSoonWeeks: 40,
  sequelTooSoonPenalty: -0.4,
  sequelSameEnginePenalty: -0.1,
  sequelImprovedEngineBonus: 0.2,
  mmoBadMatchPenalty: -0.15,
  mmoSliderPenaltyScale: 2,
} as const;

/** Bug ratio: bugRatio = 1 - 0.8 * bugPercent/100 */
export const BUG_RATIO_WEIGHT = 0.8;

/** Trend multipliers. */
export const TREND = {
  match: 1.2,
  none: 1.0,
  /** "Strange combination" trend: worse matchups score higher. */
  strange: {
    great: 0.85,
    good: 1.1,
    ok: 1.2,
    poor: 1.4,
    bad: 1.4,
  } as Record<MatchTier, number>,
} as const;

/** Expertise modifiers. */
export const EXPERTISE = {
  smallAfterGarage: 0.9,
  mediumLowFans: 0.9,
  mediumFanThreshold: 100_000,
  largeGraphicsPerLevel: 0.1,
  largeGraphicsMaxPenalty: 0.3,
  largeGraphicsRequired: 3,
  aaaGraphicsRequired: 5,
  aaaSpecialistPerMissing: 0.06,
  aaaSpecialistMaxPenalty: 0.18,
  aaaSpecialistsRequired: 3,
} as const;

/** Moving target high-score update rules. */
export const TARGET_SCORE = {
  yearModEarly: 1.15, // year <= 6 (in-game years from start)
  yearModMid: 1.2, // year <= 23
  yearModLate: 1.1,
  yearEarlyCutoff: 6,
  yearMidCutoff: 23,
  firstHitMinDelta: 2,
  laterMinFracOfTarget: 0.1,
  laterMaxFracOfPrev: 0.2,
  updateMinFinalScore: 9,
} as const;

/** Critic biases (persistent personality offsets on 1–10 scale). */
export const CRITIC_BIASES = [-0.35, -0.1, 0.05, 0.25] as const;
export const CRITIC_JITTER = 0.55;

/** Point generation knobs (weekly develop). */
export const DEV_POINTS = {
  /**
   * Base points scale per employee per full stage-week.
   * Tuned so a garage founder shipping a solid small game lands ~6–8 critics
   * against the initial targetHighScore of 20 (GDT early-game feel).
   */
  basePerEmployee: 5.4,
  efficiencyFloor: 0.6,
  efficiencyCeil: 1.2,
  workloadTeamDivisor: 3.2,
  fieldXpBonusMax: 0.35,
  engineFeaturePerField: 0.1,
  /** Mild pull of weekly points toward genre T/D target (0–1). */
  genreRatioBlend: 0.28,
  sizePoints: { small: 1.0, medium: 1.12, large: 1.3, aaa: 1.5 } as const,
  randomSpread: 0.06,
  bugBaseChance: 0.08,
  bugQaReduction: 0.07,
  bugLowQualityExtra: 0.12,
} as const;

/** Staff experience while developing (slow growth). */
export const EXPERIENCE = {
  /** XP per staff per development week. */
  xpPerDevWeek: 2.2,
  /** Bonus XP when focusing on specialized field. */
  specializationBonus: 0.8,
  /** Field experience gain per week on worked fields. */
  fieldXpPerWeek: 1.1,
  fieldXpCap: 100,
  /** Level curve: xpToLevel = base + level * perLevel (slow). */
  xpBase: 50,
  xpPerLevel: 35,
  /** Stat gains on level-up (capped at 100). */
  designOnLevel: 1,
  techOnLevel: 1,
  speedOnLevel: 1,
  /** Occasional second point every N levels. */
  bonusStatEveryLevels: 5,
  /** Release XP (small, on top of weekly). */
  xpOnReleaseBase: 6,
  xpOnReleasePerScore: 1.2,
  maxStat: 100,
  maxLevel: 40,
} as const;

/** Topic × audience defaults when not in table. */
export const DEFAULT_TOPIC_AUDIENCE: Record<"young" | "everyone" | "mature", MatchTier> = {
  young: "ok",
  everyone: "good",
  mature: "ok",
};
