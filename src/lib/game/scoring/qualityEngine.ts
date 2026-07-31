/**
 * Pure, deterministic Game Dev Tycoon–inspired quality engine.
 *
 * Pipeline:
 *  1. Stage slider → time shares (10% base + 70% proportional)
 *  2. Generate Design / Technology points
 *  3. Quality factor (balance, priority, repetition, sequel, MMO…)
 *  4. Compatibility tables
 *  5. Bugs, size, platform tech, trends
 *  6. baseScore
 *  7. Compare to targetHighScore → hidden finalScore
 *  8. Four critic scores from hidden score
 *
 * Sales must use hiddenFinalScore, not the displayed critic average.
 */

import { getGenre, getPlatform, getTopic, topicGenreTier } from "../data";
import type {
  AudienceId,
  DevField,
  GameProject,
  GameSize,
  GenreId,
  MatchTier,
  ReleasedGame,
  StaffMember,
} from "../types";
import {
  BUG_RATIO_WEIGHT,
  COMPATIBILITY,
  CRITIC_BIASES,
  CRITIC_JITTER,
  DEFAULT_TOPIC_AUDIENCE,
  DEV_POINTS,
  EXPERTISE,
  FIELD_TECH_DESIGN,
  GENRE_TECH_DESIGN_RATIO,
  INITIAL_TARGET_HIGH_SCORE,
  QUALITY,
  SIZE_SCORE_MULTIPLIER,
  STAGE_FIELD_BASE_SHARE,
  STAGE_FIELD_PROPORTIONAL_SHARE,
  TARGET_SCORE,
  TREND,
  USE_MOVING_TARGET_SCORE,
} from "./config";
import { SeededRng, hashSeed } from "./rng";

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/* -------------------------------------------------------------------------- */
/* 1. Time shares                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Convert three stage sliders into time shares.
 * Each field: 0.10 + 0.70 * (slider / sum). If all zero → equal thirds.
 */
export function computeStageTimeShares(
  fields: DevField[],
  sliders: Record<DevField, number>,
): Record<DevField, number> {
  const active = fields.slice(0, 3);
  while (active.length < 3 && fields.length > active.length) {
    active.push(fields[active.length]!);
  }
  // pad with first field duplicates only for math; unique keys preferred
  const unique = [...new Set(active.length ? active : (["gameplay", "engine", "graphics"] as DevField[]))];
  while (unique.length < 3) {
    const pad = (["gameplay", "engine", "graphics", "story", "level"] as DevField[]).find(
      (f) => !unique.includes(f),
    );
    if (pad) unique.push(pad);
    else break;
  }

  const values = unique.map((f) => Math.max(0, sliders[f] ?? 0));
  const sum = values.reduce((a, b) => a + b, 0);
  const out: Partial<Record<DevField, number>> = {};

  if (sum <= 0) {
    const eq = 1 / unique.length;
    for (const f of unique) out[f] = eq;
  } else {
    for (let i = 0; i < unique.length; i++) {
      const f = unique[i]!;
      out[f] =
        STAGE_FIELD_BASE_SHARE +
        STAGE_FIELD_PROPORTIONAL_SHARE * (values[i]! / sum);
    }
  }
  return out as Record<DevField, number>;
}

/** Stage focus fields for a genre (always length 3 for scoring). */
export function stageFieldsFor(genreId: GenreId, stage: 1 | 2 | 3): DevField[] {
  const focus = [...getGenre(genreId).stageFocus[stage]];
  if (focus.length >= 3) return focus.slice(0, 3);
  const fillers: DevField[] = [
    "gameplay",
    "engine",
    "graphics",
    "story",
    "level",
    "sound",
    "world",
    "ai",
    "dialogue",
  ];
  for (const f of fillers) {
    if (!focus.includes(f)) focus.push(f);
    if (focus.length >= 3) break;
  }
  return focus.slice(0, 3);
}

/* -------------------------------------------------------------------------- */
/* 2. Point generation                                                        */
/* -------------------------------------------------------------------------- */

export interface PointGenInput {
  staff: StaffMember[];
  stage: 1 | 2 | 3;
  genreId: GenreId;
  sliders: Record<DevField, number>;
  size: GameSize;
  engineFeatures: string[];
  designBoost: number; // research %
  techBoost: number;
  seed: number;
}

export interface PointGenResult {
  designGain: number;
  techGain: number;
  shares: Record<DevField, number>;
  bugsGained: number;
  progressRate: number;
}

export function generateWeekPoints(input: PointGenInput): PointGenResult {
  const rng = new SeededRng(input.seed);
  const fields = stageFieldsFor(input.genreId, input.stage);
  const shares = computeStageTimeShares(fields, input.sliders);
  const sizeMult = DEV_POINTS.sizePoints[input.size];
  const teamSize = Math.max(1, input.staff.length);
  const workload = clamp(
    DEV_POINTS.workloadTeamDivisor / teamSize,
    0.55,
    1.2,
  );

  let designGain = 0;
  let techGain = 0;

  for (const member of input.staff) {
    const efficiency = clamp(
      0.5 + member.speed / 200 + member.level * 0.01,
      DEV_POINTS.efficiencyFloor,
      DEV_POINTS.efficiencyCeil,
    );
    for (const field of fields) {
      const share = shares[field] ?? 0;
      if (share <= 0) continue;
      const weights = FIELD_TECH_DESIGN[field];
      const fieldXp = member.fieldExperience?.[field] ?? 0;
      const fieldBonus = 1 + (fieldXp / 100) * DEV_POINTS.fieldXpBonusMax;
      const specBonus =
        member.specialization === field ? 1.12 : 1;
      const featureBonus =
        1 + Math.min(0.4, input.engineFeatures.length * DEV_POINTS.engineFeaturePerField);
      const randF = 1 + rng.jitter(DEV_POINTS.randomSpread);

      const base =
        DEV_POINTS.basePerEmployee *
        share *
        efficiency *
        workload *
        fieldBonus *
        specBonus *
        featureBonus *
        sizeMult *
        randF;

      designGain += base * weights.design * (member.design / 50) * (1 + input.designBoost / 100);
      techGain += base * weights.tech * (member.tech / 50) * (1 + input.techBoost / 100);
    }
  }

  // Mild pull toward genre T/D target so correct genres feel "on-theme"
  {
    const total = designGain + techGain;
    if (total > 0) {
      const ratio = GENRE_TECH_DESIGN_RATIO[input.genreId] ?? 1;
      const preferTechFrac = ratio / (1 + ratio);
      const blend = DEV_POINTS.genreRatioBlend;
      const targetTech = total * preferTechFrac;
      techGain = techGain * (1 - blend) + targetTech * blend;
      designGain = total - techGain;
    }
  }

  // Progress: faster with speed, slightly with team
  const avgSpeed =
    input.staff.reduce((s, m) => s + m.speed, 0) / teamSize;
  // Total calendar weeks target for the whole game; 3 stages share that budget.
  const weeksTarget =
    input.size === "aaa" ? 48 : input.size === "large" ? 28 : input.size === "medium" ? 14 : 6;
  const weeksPerStage = Math.max(1, weeksTarget / 3);
  // Speed only mildly affects duration so size.weeks stays meaningful.
  const progressRate =
    (1 / weeksPerStage) *
    (0.92 + avgSpeed / 400) *
    (0.97 + Math.min(0.12, Math.max(0, teamSize - 1) * 0.03));

  // Bugs: more when tech is weak relative to pace
  const qualityProxy = clamp((designGain + techGain) / (teamSize * 6), 0.3, 1.4);
  const bugChance =
    DEV_POINTS.bugBaseChance +
    DEV_POINTS.bugLowQualityExtra * (1.1 - qualityProxy);
  let bugsGained = 0;
  if (rng.next() < bugChance) bugsGained = 1;
  if (rng.next() < bugChance * 0.35) bugsGained += 1;

  return {
    designGain,
    techGain,
    shares,
    bugsGained,
    progressRate,
  };
}

/* -------------------------------------------------------------------------- */
/* Compatibility helpers                                                      */
/* -------------------------------------------------------------------------- */

export function tierToCompat(tier: MatchTier | undefined): number {
  return COMPATIBILITY[tier ?? "ok"];
}


export function dualGenreCompat(
  topicId: string,
  primary: GenreId,
  secondary: GenreId | null | undefined,
): { tier: MatchTier; value: number } {
  const t1 = topicGenreTier(topicId, primary);
  const v1 = tierToCompat(t1);
  if (!secondary) return { tier: t1, value: v1 };
  const t2 = topicGenreTier(topicId, secondary);
  const v2 = tierToCompat(t2);
  const value = (v1 * 2 + v2) / 3;
  // representative tier for debug
  const tier =
    value >= 0.95 ? "great" : value >= 0.85 ? "good" : value >= 0.75 ? "ok" : value >= 0.65 ? "poor" : "bad";
  return { tier, value };
}

/** Simple topic×audience heuristics (data-driven table). */
export const TOPIC_AUDIENCE: Record<string, Partial<Record<AudienceId, MatchTier>>> = {
  space: { young: "good", everyone: "great", mature: "good" },
  fantasy: { young: "great", everyone: "great", mature: "good" },
  racing: { young: "great", everyone: "good", mature: "ok" },
  dungeon: { young: "ok", everyone: "good", mature: "great" },
  military: { young: "poor", everyone: "ok", mature: "great" },
  comedy: { young: "good", everyone: "great", mature: "ok" },
  zombies: { young: "poor", everyone: "ok", mature: "great" },
  romance: { young: "ok", everyone: "good", mature: "great" },
  school: { young: "great", everyone: "good", mature: "poor" },
  horror: { young: "bad", everyone: "ok", mature: "great" },
  cats: { young: "great", everyone: "great", mature: "ok" },
  business: { young: "poor", everyone: "ok", mature: "great" },
};

export function topicAudienceTier(topicId: string, audience: AudienceId): MatchTier {
  return TOPIC_AUDIENCE[topicId]?.[audience] ?? DEFAULT_TOPIC_AUDIENCE[audience];
}

/* -------------------------------------------------------------------------- */
/* Quality factor                                                             */
/* -------------------------------------------------------------------------- */

export interface QualityFactorInput {
  designPoints: number;
  techPoints: number;
  genreId: GenreId;
  genre2Id?: GenreId | null;
  /** Per-stage average time shares for focus fields (0–1). */
  focusFieldShares: Record<DevField, number>;
  importantFields: DevField[];
  unimportantFields: DevField[];
  sameTopicGenreAsPrevious: boolean;
  isSequel: boolean;
  sequelWeeksSinceOriginal: number | null;
  sequelSameEngine: boolean;
  sequelImprovedEngine: boolean;
  isMmo: boolean;
  topicGenreTier: MatchTier;
}

export interface QualityFactorResult {
  qualityFactor: number;
  balanceDeviation: number;
  balanceModifier: number;
  priorityModifier: number;
  repetitionModifier: number;
  sequelModifier: number;
  mmoModifier: number;
}

export function computeQualityFactor(input: QualityFactorInput): QualityFactorResult {
  let qualityFactor = QUALITY.start;
  let balanceModifier = 0;
  let priorityModifier = 0;
  let repetitionModifier = 0;
  let sequelModifier = 0;
  let mmoModifier = 0;

  const targetRatio = GENRE_TECH_DESIGN_RATIO[input.genreId] ?? 1;
  const tech = input.techPoints;
  const design = input.designPoints;
  const denom = Math.max(tech, design, 1);
  const balanceDeviation = (design * targetRatio - tech) / denom;

  if (tech + design >= QUALITY.balanceMinPoints) {
    const abs = Math.abs(balanceDeviation);
    if (abs <= QUALITY.balanceThresholdGood) balanceModifier = QUALITY.balanceGood;
    else if (abs <= QUALITY.balanceThresholdOk) balanceModifier = 0;
    else balanceModifier = QUALITY.balanceBad;
  }

  // Slider priority: interpret shares relative to the max share so both
  // 3-field stage shares and 9-field slider normalizations work.
  const allShareVals = [
    ...input.importantFields,
    ...input.unimportantFields,
  ].map((f) => input.focusFieldShares[f] ?? 0);
  const maxShare = Math.max(0.0001, ...allShareVals);
  const rel = (f: string) => (input.focusFieldShares[f as DevField] ?? 0) / maxShare;

  const impRels = input.importantFields.map((f) => rel(f));
  const highImp = impRels.filter((s) => s >= QUALITY.importantShareHigh).length;
  const lowImp = impRels.filter((s) => s <= QUALITY.importantShareLow).length;
  if (highImp >= 2) priorityModifier += QUALITY.importantTwoPlusBonus;
  else if (highImp === 1) priorityModifier += QUALITY.importantOneBonus;
  else priorityModifier += QUALITY.importantNonePenalty;
  priorityModifier += lowImp * QUALITY.importantLowEachPenalty;

  const unimpHigh = input.unimportantFields.filter((f) => rel(f) >= QUALITY.importantShareHigh).length;
  if (unimpHigh >= 2) priorityModifier += QUALITY.unimportantTwoPlusPenalty;

  if (input.isMmo) {
    // Double slider-priority penalties for MMOs
    if (priorityModifier < 0) priorityModifier *= QUALITY.mmoSliderPenaltyScale;
    if (input.topicGenreTier !== "great" && input.topicGenreTier !== "good") {
      mmoModifier = QUALITY.mmoBadMatchPenalty;
    }
  }

  if (input.sameTopicGenreAsPrevious) {
    repetitionModifier = QUALITY.sameTopicGenrePenalty;
  }

  if (input.isSequel) {
    const weeks = input.sequelWeeksSinceOriginal;
    if (weeks != null && weeks < 20) {
      sequelModifier += QUALITY.sequelTooSoonPenalty;
    } else if (weeks != null && weeks < 40) {
      sequelModifier += QUALITY.sequelEarlyPenalty ?? -0.08;
    } else if (weeks != null && weeks >= 40) {
      sequelModifier += QUALITY.sequelProperBonus ?? 0.08;
    }
    if (input.sequelSameEngine) sequelModifier += QUALITY.sequelSameEnginePenalty;
    if (input.sequelImprovedEngine) sequelModifier += QUALITY.sequelImprovedEngineBonus;
  }

  qualityFactor +=
    balanceModifier + priorityModifier + repetitionModifier + sequelModifier + mmoModifier;

  return {
    qualityFactor: clamp(qualityFactor, 0.2, 2.0),
    balanceDeviation,
    balanceModifier,
    priorityModifier,
    repetitionModifier,
    sequelModifier,
    mmoModifier,
  };
}

/* -------------------------------------------------------------------------- */
/* Bugs / platform / trend                                                    */
/* -------------------------------------------------------------------------- */

export function computeBugRatio(bugs: number, tech: number, design: number): number {
  const bugPercentage = clamp((100 / Math.max(1, tech + design)) * bugs, 0, 100);
  return 1 - (BUG_RATIO_WEIGHT * bugPercentage) / 100;
}

export function computePlatformTechModifier(platformTechLevels: number[]): number {
  // Ignore empty / single; PC generation gaps handled by caller filtering PC
  if (platformTechLevels.length < 2) return 1;
  const highest = Math.max(...platformTechLevels);
  const lowest = Math.min(...platformTechLevels);
  return clamp(1 - (highest - lowest) / 20, 0.5, 1);
}

export function computeTrendModifier(
  matchesTrend: boolean,
  strangeTrend: boolean,
  topicGenreTier: MatchTier,
): number {
  if (strangeTrend) return TREND.strange[topicGenreTier];
  return matchesTrend ? TREND.match : TREND.none;
}

/* -------------------------------------------------------------------------- */
/* Expertise                                                                  */
/* -------------------------------------------------------------------------- */

export interface ExpertiseInput {
  size: GameSize;
  office: number;
  fans: number;
  graphicsLevel: number;
  specialistCount: number;
}

export function computeExpertiseModifier(input: ExpertiseInput): number {
  let mod = 1;
  if (input.size === "small" && input.office > 1) {
    mod *= EXPERTISE.smallAfterGarage;
  }
  if (input.size === "medium" && input.fans < EXPERTISE.mediumFanThreshold) {
    mod *= EXPERTISE.mediumLowFans;
  }
  if (input.size === "large") {
    const missing = Math.max(0, EXPERTISE.largeGraphicsRequired - input.graphicsLevel);
    mod -= Math.min(EXPERTISE.largeGraphicsMaxPenalty, missing * EXPERTISE.largeGraphicsPerLevel);
  }
  if (input.size === "aaa") {
    const missingG = Math.max(0, EXPERTISE.aaaGraphicsRequired - input.graphicsLevel);
    mod -= Math.min(EXPERTISE.largeGraphicsMaxPenalty, missingG * EXPERTISE.largeGraphicsPerLevel);
    const missingS = Math.max(0, EXPERTISE.aaaSpecialistsRequired - input.specialistCount);
    mod -= Math.min(
      EXPERTISE.aaaSpecialistMaxPenalty,
      missingS * EXPERTISE.aaaSpecialistPerMissing,
    );
  }
  return clamp(mod, 0.4, 1.15);
}

/* -------------------------------------------------------------------------- */
/* Target high score                                                          */
/* -------------------------------------------------------------------------- */

export function yearModifierForTarget(gameYearIndex: number): number {
  // gameYearIndex = years since start (0 = first year)
  if (gameYearIndex <= TARGET_SCORE.yearEarlyCutoff) return TARGET_SCORE.yearModEarly;
  if (gameYearIndex <= TARGET_SCORE.yearMidCutoff) return TARGET_SCORE.yearModMid;
  return TARGET_SCORE.yearModLate;
}

/**
 * Compute next targetHighScore after a release (only call when eligible).
 * Returns the new target — does not mutate.
 */
export function nextTargetHighScore(opts: {
  previousTarget: number;
  previousHighBaseScore: number;
  baseScore: number;
  finalScore: number;
  gameYearIndex: number;
  isFirstQualifyingHit: boolean;
}): number {
  if (!USE_MOVING_TARGET_SCORE) return opts.previousTarget;
  if (opts.finalScore < TARGET_SCORE.updateMinFinalScore) return opts.previousTarget;
  if (opts.baseScore <= opts.previousHighBaseScore && !opts.isFirstQualifyingHit) {
    return opts.previousTarget;
  }

  const ym = yearModifierForTarget(opts.gameYearIndex);

  if (opts.isFirstQualifyingHit || opts.previousHighBaseScore <= 0) {
    return (
      INITIAL_TARGET_HIGH_SCORE +
      Math.max(opts.baseScore - INITIAL_TARGET_HIGH_SCORE, TARGET_SCORE.firstHitMinDelta) * ym
    );
  }

  const highScoreDelta = Math.min(
    Math.max(
      opts.baseScore - opts.previousHighBaseScore,
      opts.previousTarget * TARGET_SCORE.laterMinFracOfTarget,
    ),
    opts.previousHighBaseScore * TARGET_SCORE.laterMaxFracOfPrev,
  );

  return opts.previousHighBaseScore + highScoreDelta * ym;
}

/* -------------------------------------------------------------------------- */
/* Full score pipeline                                                        */
/* -------------------------------------------------------------------------- */

export interface ScoreProjectInput {
  project: GameProject;
  designPoints: number;
  techPoints: number;
  bugs: number;
  /** Accumulated focus shares for priority (field → avg share). */
  focusFieldShares?: Partial<Record<DevField, number>>;
  previousGame?: Pick<ReleasedGame, "topicId" | "genreId" | "weekReleased" | "engineId"> | null;
  engines?: { id: string; techBonus: number; designBonus: number }[];
  targetHighScore: number;
  previousHighBaseScore: number;
  office: number;
  fans: number;
  graphicsLevel: number;
  specialistCount: number;
  gameYearIndex: number;
  matchesTrend?: boolean;
  strangeTrend?: boolean;
  isMmo?: boolean;
  /** Extra platforms for multi-gen gap (tech ceiling 0–10 scale). PC ignored. */
  multiPlatformTech?: number[];
  seed?: number;
  useMovingTarget?: boolean;
  /** Weeks between original and sequel; null = unknown (no timing penalty). */
  sequelWeeksSinceOriginal?: number | null;
}

export interface ScoreBreakdown {
  generatedTech: number;
  generatedDesign: number;
  actualSliderShares: Partial<Record<DevField, number>>;
  balanceDeviation: number;
  balanceModifier: number;
  priorityModifier: number;
  repetitionModifier: number;
  sequelModifier: number;
  mmoModifier: number;
  qualityFactor: number;
  compatibilityModifiers: {
    topicGenre: number;
    topicAudience: number;
    platformGenre: number;
    platformAudience: number;
    combinedTopicGenre: number;
  };
  bugRatio: number;
  platformTechModifier: number;
  trendModifier: number;
  expertiseModifier: number;
  sizeMultiplier: number;
  baseScore: number;
  targetHighScore: number;
  intermediateScore: number;
  hiddenFinalScore: number;
  fourCriticScores: number[];
  displayedAverage: number;
  /** Next target after this release (if update rules fire). */
  nextTargetHighScore: number;
  /** Next previousHighBaseScore store. */
  nextHighBaseScore: number;
}

export function scoreProject(input: ScoreProjectInput): ScoreBreakdown {
  const p = input.project;
  const tech = input.techPoints;
  const design = input.designPoints;
  const genre = getGenre(p.genreId);
  const platform = getPlatform(p.platformId);

  const important = new Set<DevField>();
  for (const s of [1, 2, 3] as const) {
    for (const f of genre.stageFocus[s]) important.add(f);
  }
  if (p.genre2Id) {
    const g2 = getGenre(p.genre2Id);
    for (const s of [1, 2, 3] as const) {
      for (const f of g2.stageFocus[s]) important.add(f);
    }
  }
  const importantFields = [...important];
  const allFields: DevField[] = [
    "engine",
    "gameplay",
    "story",
    "dialogue",
    "level",
    "ai",
    "world",
    "graphics",
    "sound",
  ];
  const unimportantFields = allFields.filter((f) => !important.has(f));

  // Normalize slider shares for priority (across all sliders as proxy if not provided)
  const shares: Record<DevField, number> = {
    engine: 0,
    gameplay: 0,
    story: 0,
    dialogue: 0,
    level: 0,
    ai: 0,
    world: 0,
    graphics: 0,
    sound: 0,
  };
  if (input.focusFieldShares) {
    for (const f of allFields) shares[f] = input.focusFieldShares[f] ?? 0;
  } else {
    const sum = allFields.reduce((a, f) => a + (p.sliders[f] || 0), 0) || 1;
    for (const f of allFields) shares[f] = (p.sliders[f] || 0) / sum;
  }

  const sameTopicGenre =
    !!input.previousGame &&
    input.previousGame.topicId === p.topicId &&
    input.previousGame.genreId === p.genreId;

  let sequelWeeks: number | null = input.sequelWeeksSinceOriginal ?? null;
  let sequelSameEngine = false;
  let sequelImprovedEngine = false;
  if (p.isSequel && input.previousGame) {
    sequelSameEngine = input.previousGame.engineId === p.engineId;
    if (input.engines) {
      const prevE = input.engines.find((e) => e.id === input.previousGame!.engineId);
      const curE = input.engines.find((e) => e.id === p.engineId);
      if (prevE && curE) {
        sequelImprovedEngine =
          curE.techBonus + curE.designBonus > prevE.techBonus + prevE.designBonus;
        sequelSameEngine = prevE.id === curE.id;
      }
    }
  }

  const dual = dualGenreCompat(p.topicId, p.genreId, p.genre2Id);
  const tgTier = dual.tier;

  const qf = computeQualityFactor({
    designPoints: design,
    techPoints: tech,
    genreId: p.genreId,
    genre2Id: p.genre2Id,
    focusFieldShares: shares,
    importantFields,
    unimportantFields,
    sameTopicGenreAsPrevious: sameTopicGenre,
    isSequel: !!p.isSequel,
    sequelWeeksSinceOriginal: sequelWeeks,
    sequelSameEngine,
    sequelImprovedEngine,
    isMmo: !!input.isMmo,
    topicGenreTier: tgTier,
  });

  const topicAudience = tierToCompat(topicAudienceTier(p.topicId, p.audience));
  const platformGenre = tierToCompat(platform.genreAffinity[p.genreId]);
  const platformAudience = tierToCompat(platform.audienceAffinity[p.audience]);

  const bugRatio = computeBugRatio(input.bugs, tech, design);
  const platformTechModifier = computePlatformTechModifier(input.multiPlatformTech ?? []);
  const trendModifier = computeTrendModifier(
    !!input.matchesTrend,
    !!input.strangeTrend,
    tgTier,
  );
  const expertiseModifier = computeExpertiseModifier({
    size: p.size,
    office: input.office,
    fans: input.fans,
    graphicsLevel: input.graphicsLevel,
    specialistCount: input.specialistCount,
  });

  const sizeMultiplier = SIZE_SCORE_MULTIPLIER[p.size];

  // baseScore formula (GDT-style)
  // Note: topic×audience and platform×genre are the two compatibility factors
  // used in the documented core formula; we also fold platform×audience lightly.
  const baseScore =
    ((tech + design) / (2 * sizeMultiplier)) *
    qf.qualityFactor *
    topicAudience *
    platformGenre *
    bugRatio *
    platformTechModifier *
    trendModifier *
    // mild extra: topic-genre combined & platform-audience
    (0.5 + 0.5 * dual.value) *
    (0.85 + 0.15 * platformAudience);

  const useMoving = input.useMovingTarget ?? USE_MOVING_TARGET_SCORE;
  const target = Math.max(1, input.targetHighScore || INITIAL_TARGET_HIGH_SCORE);

  let intermediateScore: number;
  let hiddenFinalScore: number;

  if (useMoving) {
    intermediateScore = baseScore / target;
    hiddenFinalScore = clamp(10 * intermediateScore, 1, 10) * expertiseModifier;
  } else {
    // Hybrid fallback: soft curve without harsh moving target
    intermediateScore = baseScore / INITIAL_TARGET_HIGH_SCORE;
    hiddenFinalScore =
      clamp(1 + Math.log2(1 + baseScore) * 1.8, 1, 10) * expertiseModifier;
  }
  hiddenFinalScore = clamp(hiddenFinalScore, 1, 10);

  const rng = new SeededRng(
    input.seed ??
      hashSeed(p.id, p.title, design, tech, input.bugs, target, p.topicId, p.genreId),
  );

  const fourCriticScores = CRITIC_BIASES.map((bias) => {
    const raw = hiddenFinalScore + bias + rng.jitter(CRITIC_JITTER);
    return clamp(Math.round(raw), 1, 10);
  });

  const displayedAverage =
    Math.round((fourCriticScores.reduce((a, b) => a + b, 0) / fourCriticScores.length) * 10) /
    10;

  const isFirstQualifying =
    input.previousHighBaseScore <= 0 && hiddenFinalScore >= TARGET_SCORE.updateMinFinalScore;

  const nextTarget = nextTargetHighScore({
    previousTarget: target,
    previousHighBaseScore: input.previousHighBaseScore,
    baseScore,
    finalScore: hiddenFinalScore,
    gameYearIndex: input.gameYearIndex,
    isFirstQualifyingHit: isFirstQualifying,
  });

  const nextHighBase =
    hiddenFinalScore >= TARGET_SCORE.updateMinFinalScore && baseScore > input.previousHighBaseScore
      ? baseScore
      : input.previousHighBaseScore;

  return {
    generatedTech: tech,
    generatedDesign: design,
    actualSliderShares: shares,
    balanceDeviation: qf.balanceDeviation,
    balanceModifier: qf.balanceModifier,
    priorityModifier: qf.priorityModifier,
    repetitionModifier: qf.repetitionModifier,
    sequelModifier: qf.sequelModifier,
    mmoModifier: qf.mmoModifier,
    qualityFactor: qf.qualityFactor,
    compatibilityModifiers: {
      topicGenre: dual.value,
      topicAudience,
      platformGenre,
      platformAudience,
      combinedTopicGenre: dual.value,
    },
    bugRatio,
    platformTechModifier,
    trendModifier,
    expertiseModifier,
    sizeMultiplier,
    baseScore,
    targetHighScore: target,
    intermediateScore,
    hiddenFinalScore,
    fourCriticScores,
    displayedAverage,
    nextTargetHighScore: nextTarget,
    nextHighBaseScore: nextHighBase,
  };
}

/** Convenience: sequel weeks between original release and now. */
export function weeksBetween(a: number, b: number) {
  return Math.abs(b - a);
}

export { INITIAL_TARGET_HIGH_SCORE, USE_MOVING_TARGET_SCORE };
