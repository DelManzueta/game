import {
  DEV_FIELDS,
  FIELD_TECH_WEIGHT,
  SIZE_STATS,
  getGenre,
  getPlatform,
  getTopic,
  matchScore,
  computeGenreFit,
  genreFitModifier,
  topicGenreTier,
} from "./data";
import {
  applyDevWeekExperience,
  generateWeekPoints,
  hashSeed,
  scoreProject,
  USE_ALGORITHM_V2,
  type ScoreBreakdown,
} from "./scoring";
import { scoreCriticsV2, generateSalesPlanV2, normalizeStageAllocations } from "./scoring/algorithmV2";
import { SeededRng } from "./scoring/rng";
import { STAGE_FIELDS } from "./data";

import type {
  AudienceId,
  DevField,
  DevPhase,
  GameProject,
  GameSize,
  GenreId,
  MatchTier,
  ReleasedGame,
  StaffMember,
} from "./types";

/**
 * Deterministic id from explicit identity parts only.
 * Callers MUST pass campaignSeed + entity/event keys — no process counters.
 */
export function uid(prefix = "id", ...parts: Array<string | number | boolean | null | undefined>) {
  if (parts.length === 0) {
    // Non-causal fallback: still pure for empty call within same process not required —
    // prefer always passing parts. Use fixed salt so empty calls don't depend on order.
    return `${prefix}_${hashSeed(prefix, "empty").toString(16)}`;
  }
  return `${prefix}_${hashSeed(prefix, ...parts).toString(16)}`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** @deprecated Prefer SeededRng — pure only when seedParts provided. */
export function rand(min: number, max: number, ...seedParts: Array<string | number>) {
  return min + (hashSeed("legacy-rand", min, max, ...seedParts) / 4294967296) * (max - min);
}

/** @deprecated Prefer seeded pick. */
export function pick<T>(arr: T[], ...seedParts: Array<string | number>): T {
  return arr[Math.floor((hashSeed("legacy-pick", arr.length, ...seedParts) / 4294967296) * arr.length)]!;
}

export function formatCash(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

export function formatFans(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

export function weekToDate(week: number, startYear: number) {
  const year = startYear + Math.floor(week / 48);
  const weekInYear = week % 48;
  const month = Math.floor(weekInYear / 4) + 1;
  const w = (weekInYear % 4) + 1;
  return { year, month, weekOfMonth: w };
}

export function evaluateCombo(opts: {
  topicId: string;
  genreId: GenreId;
  genre2Id?: GenreId | null;
  platformId: string;
  audience: AudienceId;
  analytics?: boolean;
  genres?: GenreId[];
  capacityTier?: 1 | 2 | 3 | 4;
}) {
  const genres: GenreId[] = opts.genres?.length
    ? opts.genres
    : opts.genre2Id
      ? [opts.genreId, opts.genre2Id]
      : [opts.genreId];
  const genreFit = computeGenreFit({
    topicId: opts.topicId,
    genres,
    capacityTier: opts.capacityTier,
  });
  const tg = topicGenreTier(opts.topicId, opts.genreId);
  const tg2 = opts.genre2Id ? topicGenreTier(opts.topicId, opts.genre2Id) : null;
  const platform = getPlatform(opts.platformId);
  const pg = platform.genreAffinity[opts.genreId] ?? "ok";
  const pa = platform.audienceAffinity[opts.audience] ?? "ok";

  let mult = genreFitModifier(genreFit) * matchScore(pg) * matchScore(pa);
  // normalize platform×audience around ~0.8*0.8
  mult = mult / 0.64;

  return {
    topicGenre: tg,
    topicGenre2: tg2,
    platformGenre: pg,
    platformAudience: pa,
    genreFit,
    multiplier: mult,
    label:
      mult >= 1.15
        ? "Excellent"
        : mult >= 1.05
          ? "Strong"
          : mult >= 0.95
            ? "Average"
            : mult >= 0.85
              ? "Weak"
              : "Risky",
  };
}

export function recommendedFocus(genreId: GenreId, stage: 1 | 2 | 3): DevField[] {
  return getGenre(genreId).stageFocus[stage];
}

/** @deprecated Prefer quality-engine priority; kept for UI hints. */
export function sliderQuality(project: GameProject, stage: 1 | 2 | 3): number {
  const genre = getGenre(project.genreId);
  const focus = new Set(genre.stageFocus[stage]);
  const avoid = new Set(genre.avoid);
  if (project.genre2Id) {
    const g2 = getGenre(project.genre2Id);
    for (const f of g2.stageFocus[stage]) focus.add(f);
  }

  let score = 1;
  let total = 0;
  let weightSum = 0;
  for (const f of DEV_FIELDS) {
    const v = project.sliders[f] ?? 40;
    total += v;
    weightSum += 1;
    if (focus.has(f)) {
      if (v >= 60) score += 0.04;
      else if (v < 30) score -= 0.05;
    }
    if (avoid.has(f) && v > 50) score -= 0.04;
  }
  const avg = total / weightSum;
  if (avg < 25 || avg > 85) score -= 0.03;
  return clamp(score, 0.7, 1.2);
}

export function teamPower(staff: StaffMember[]) {
  if (staff.length === 0) return { design: 40, tech: 40, speed: 1 };
  const design = staff.reduce((s, m) => s + m.design, 0) / staff.length;
  const tech = staff.reduce((s, m) => s + m.tech, 0) / staff.length;
  const speed = staff.reduce((s, m) => s + m.speed, 0) / staff.length;
  return { design, tech, speed: 0.7 + speed / 100 };
}

/**
 * One development week: GDT-style time shares + point generation.
 * Also returns staff with weekly experience applied (caller should store).
 */
export function developWeek(
  project: GameProject,
  staff: StaffMember[],
  extras: { designBoost: number; techBoost: number; qa: boolean },
): { project: GameProject; staff: StaffMember[]; stageJustFinished: boolean } {
  const phase = project.devPhase;
  if (
    phase === "STAGE_1_CONFIG" ||
    phase === "STAGE_2_CONFIG" ||
    phase === "STAGE_3_CONFIG" ||
    phase === "READY_TO_RELEASE" ||
    project.stage === "done"
  ) {
    return { project, staff, stageJustFinished: false };
  }

  const isPolish = phase === "POLISHING";
  const stage: 1 | 2 | 3 =
    phase === "STAGE_1_RUNNING"
      ? 1
      : phase === "STAGE_2_RUNNING"
        ? 2
        : phase === "STAGE_3_RUNNING"
          ? 3
          : 3;

  const seed = hashSeed(
    project.rngSeed ?? project.id,
    project.weeksDev,
    stage,
    project.designPoints,
    project.techPoints,
  );

  const gen = generateWeekPoints({
    staff,
    stage,
    genreId: project.genreId,
    sliders: project.sliders,
    size: project.size,
    engineFeatures: project.features,
    designBoost: extras.designBoost,
    techBoost: extras.techBoost,
    seed,
  });

  let designGain = gen.designGain;
  let techGain = gen.techGain;
  let bugs = project.bugs + gen.bugsGained;
  let progressRate = gen.progressRate;

  if (isPolish) {
    // Polish: slow point gains, active bug fixing (deterministic from project seed + team)
    designGain *= 0.2;
    techGain *= 0.2;
    progressRate = 0;
    const avgTech = staff.reduce((s, m) => s + m.tech, 0) / Math.max(1, staff.length);
    const avgSpeed = staff.reduce((s, m) => s + m.speed, 0) / Math.max(1, staff.length);
    const avgDesign = staff.reduce((s, m) => s + m.design, 0) / Math.max(1, staff.length);
    const polishRng = new SeededRng(
      hashSeed(seed, "polish-fix", project.bugs, extras.qa, Math.floor(avgTech)),
    );
    // Team skill drives real progress — was 1–3/week and felt broken on high bug counts
    let baseFix =
      2 +
      Math.floor(avgTech / 35) +
      Math.floor(avgSpeed / 45) +
      Math.floor(avgDesign / 80) +
      Math.min(3, staff.length - 1);
    if (extras.qa) baseFix += 2;
    // Slight variance ±1, and catch-up when bug pile is huge
    const variance = polishRng.int(0, 2);
    const backlogBoost = project.bugs >= 20 ? 3 : project.bugs >= 12 ? 2 : project.bugs >= 6 ? 1 : 0;
    const fix = Math.min(14, Math.max(2, baseFix + variance + backlogBoost));
    // Cancel any new bugs from generation, then apply fixes
    bugs = Math.max(0, project.bugs - fix);
  } else if (extras.qa && gen.bugsGained > 0) {
    const qaRng = new SeededRng(hashSeed(seed, "qa-mitigate", gen.bugsGained));
    if (qaRng.next() < 0.45) {
      bugs = Math.max(project.bugs, bugs - 1);
    }
  }

  let stageProgress = project.stageProgress + (isPolish ? 0 : progressRate);
  let nextPhase: DevPhase = phase;
  let nextStage: GameProject["stage"] = stage;
  let stageJustFinished = false;

  if (!isPolish && stageProgress >= 1) {
    stageProgress = 0;
    stageJustFinished = true;
    if (phase === "STAGE_1_RUNNING") {
      nextPhase = "STAGE_2_CONFIG";
      nextStage = 2;
    } else if (phase === "STAGE_2_RUNNING") {
      nextPhase = "STAGE_3_CONFIG";
      nextStage = 3;
    } else if (phase === "STAGE_3_RUNNING") {
      nextPhase = "POLISHING";
      nextStage = 3;
    }
  }

  const accum = { ...(project.stageShareAccum ?? {}) };
  if (!isPolish) {
    for (const [f, v] of Object.entries(gen.shares)) {
      accum[f as DevField] = (accum[f as DevField] ?? 0) + (v ?? 0);
    }
  }
  const samples = (project.stageShareSamples ?? 0) + (isPolish ? 0 : 1);

  const researchGain = isPolish ? 0.15 : 0.4 + staff.length * 0.15;

  const updated: GameProject = {
    ...project,
    stage: nextStage,
    stageProgress: nextPhase === "POLISHING" ? 1 : stageProgress,
    devPhase: nextPhase,
    designPoints: project.designPoints + designGain,
    techPoints: project.techPoints + techGain,
    researchEarned: (project.researchEarned ?? 0) + researchGain,
    bugs,
    weeksDev: project.weeksDev + 1,
    stageShareAccum: accum,
    stageShareSamples: samples,
  };

  const trained = applyDevWeekExperience(staff, {
    genreId: project.genreId,
    stage,
  });

  return { project: updated, staff: trained, stageJustFinished };
}

export interface ReviewContext {
  targetHighScore: number;
  previousHighBaseScore: number;
  office: number;
  fans: number;
  graphicsLevel: number;
  specialistCount: number;
  gameYearIndex: number;
  previousGame?: ReleasedGame | null;
  engines?: { id: string; techBonus: number; designBonus: number }[];
  matchesTrend?: boolean;
  strangeTrend?: boolean;
  isMmo?: boolean;
  multiPlatformTech?: number[];
  useMovingTarget?: boolean;
  /** Weeks between sequel and original (if known). */
  sequelWeeksSinceOriginal?: number | null;
  /** V2 fields */
  staff?: import("./types").StaffMember[];
  platformMarket?: number;
  platformTechCeiling?: number;
  reputation?: number;
  previousAvgReview?: number;
  designBoost?: number;
  techBoost?: number;
  campaignSeed?: number;
  week?: number;
}

/**
 * Full GDT-style review scoring. Returns critic scores + breakdown.
 * Sales must use `hiddenFinalScore`, not `avg`.
 */
export function computeReviews(
  project: GameProject,
  ctx: ReviewContext,
): {
  scores: number[];
  avg: number;
  quality: number;
  breakdown: ScoreBreakdown;
} {
  if (USE_ALGORITHM_V2) {
    return computeReviewsV2(project, ctx);
  }

  // Priority uses slider intent (what the player set), not diluted stage averages.
  // Stage-time shares still drive weekly Design/Tech point generation.
  const focusFieldShares: Partial<Record<DevField, number>> = {};
  const sliderSum =
    (["engine","gameplay","story","dialogue","level","ai","world","graphics","sound"] as DevField[])
      .reduce((a, f) => a + (project.sliders[f] || 0), 0) || 1;
  for (const f of ["engine","gameplay","story","dialogue","level","ai","world","graphics","sound"] as DevField[]) {
    focusFieldShares[f] = (project.sliders[f] || 0) / sliderSum;
  }

  // Patch sequel weeks into a synthetic previous if needed
  let previous = ctx.previousGame ?? null;
  if (project.isSequel && project.sequelOf && !previous) {
    previous = null;
  }

  const breakdown = scoreProject({
    project,
    designPoints: project.designPoints,
    techPoints: project.techPoints,
    bugs: project.bugs,
    focusFieldShares,
    previousGame: previous,
    engines: ctx.engines,
    targetHighScore: ctx.targetHighScore,
    previousHighBaseScore: ctx.previousHighBaseScore,
    office: ctx.office,
    fans: ctx.fans,
    graphicsLevel: ctx.graphicsLevel,
    specialistCount: ctx.specialistCount,
    gameYearIndex: ctx.gameYearIndex,
    matchesTrend: ctx.matchesTrend,
    strangeTrend: ctx.strangeTrend,
    isMmo: ctx.isMmo,
    multiPlatformTech: ctx.multiPlatformTech,
    useMovingTarget: ctx.useMovingTarget,
    sequelWeeksSinceOriginal: ctx.sequelWeeksSinceOriginal ?? null,
    seed: hashSeed(project.id, "review", project.designPoints, project.techPoints, project.bugs),
  });

  // Apply sequel timing penalty if we know weeks (scoreProject defaulted to 0)
  // Re-score path: if sequel too soon and not already penalized much — quality engine
  // already applies when isSequel; weeks default 0 means always "too soon" for sequels.
  // Fix: pass weeks via temporary mutation of breakdown if sequelWeeks provided and > 40
  // For accuracy, re-call with flags... handled in store by setting previousGame correctly.

  return {
    scores: breakdown.fourCriticScores,
    avg: breakdown.displayedAverage,
    quality: project.designPoints + project.techPoints,
    breakdown,
  };
}

/**
 * Sales use the **hidden** final score (not critic average).
 */

function computeReviewsV2(
  project: GameProject,
  ctx: ReviewContext,
): {
  scores: number[];
  avg: number;
  quality: number;
  breakdown: ScoreBreakdown;
  productQuality: number;
  criticReviews: { name: string; score: number; comment: string }[];
  qualityBreakdownV2: Record<string, number>;
} {
  const result = scoreCriticsV2({
    project,
    staff: ctx.staff ?? [],
    platformMarket: ctx.platformMarket ?? 1,
    platformTechCeiling: ctx.platformTechCeiling ?? 1,
    reputation: ctx.reputation ?? 50,
    previousAvgReview: ctx.previousAvgReview,
    designBoost: ctx.designBoost,
    techBoost: ctx.techBoost,
    campaignSeed: ctx.campaignSeed ?? hashSeed(project.id),
    week: ctx.week ?? 0,
  });
  const b = result.breakdown;
  // Adapt to ScoreBreakdown-shaped object for store compatibility
  const breakdown = {
    generatedTech: b.generatedTech,
    generatedDesign: b.generatedDesign,
    actualSliderShares: {},
    balanceDeviation: 1 - b.designTechBalance,
    balanceModifier: b.designTechBalance,
    priorityModifier: b.focusAlignment,
    repetitionModifier: 1,
    sequelModifier: 1,
    compatibilityModifiers: { topicGenre: b.conceptFit, platformGenre: 1, platformAudience: 1 },
    bugRatio: Math.max(0, 1 - b.bugPenalty / 40),
    trendModifier: 1,
    expertiseModifier: b.teamExecution,
    baseScore: b.productQuality,
    targetHighScore: 0,
    intermediateScore: b.finalQuality,
    hiddenFinalScore: Math.max(1, Math.min(10, b.productQuality / 10)),
    fourCriticScores: result.scores,
    displayedAverage: result.avg,
    nextTargetHighScore: 0,
    nextHighBaseScore: b.productQuality,
    qualityFactor: b.craftQuality,
  } as ScoreBreakdown;
  return {
    scores: result.scores,
    avg: result.avg,
    quality: b.productQuality,
    breakdown,
    productQuality: b.productQuality,
    criticReviews: result.reviews.map((r) => ({
      name: r.name,
      score: r.score,
      comment: r.comment,
    })),
    qualityBreakdownV2: {
      execution: b.execution,
      focusAlignment: b.focusAlignment,
      designTechBalance: b.designTechBalance,
      featureCoherence: b.featureCoherence,
      innovation: b.innovation,
      polish: b.polish,
      teamExecution: b.teamExecution,
      conceptFit: b.conceptFit,
      bugPenalty: b.bugPenalty,
      expectationModifier: b.expectationModifier,
      finalQuality: b.finalQuality,
      craftQuality: b.craftQuality,
      productQuality: b.productQuality,
    },
  };
}

export function computeSalesCurve(
  hiddenFinalScore: number,
  opts: {
    size: GameSize;
    platformMarket: number;
    fans: number;
    hype: number;
    marketingSpend: number;
    pirateMode: boolean;
    liveOps: boolean;
    comboMult: number;
    seed?: number;
    // V2
    productQuality?: number;
    avgReview?: number;
    hiddenAsQuality?: number;
    platformAgeYears?: number;
    genreId?: GenreId;
    topicRepetition?: number;
    campaignSeed?: number;
    gameId?: string;
    releaseWeek?: number;
    studioReputation?: number;
    launchPrice?: number;
    distributionType?: "self" | "publisher";
    publisherReachMult?: number;
    publisherAwarenessMult?: number;
    publisherRoyalty?: number;
    sequelFanAwarenessMult?: number;
    sequelCommercialMult?: number;
  },
): {
  weeks: number[];
  totalUnits: number;
  revenue: number;
  fansGained: number;
  history?: import("./types").WeeklySalePoint[];
  price?: number;
  layers?: import("./commercial").CommercialLayers;
  revenueShare?: number;
  distributionType?: "self" | "publisher";
  marketWeeks?: number;
} {
  if (USE_ALGORITHM_V2 && opts.campaignSeed != null && opts.gameId) {
    const plan = generateSalesPlanV2({
      productQuality: opts.productQuality ?? (opts.hiddenAsQuality ?? 50),
      avgReview: opts.avgReview ?? 5,
      size: opts.size,
      platformMarket: opts.platformMarket,
      platformAgeYears: opts.platformAgeYears ?? 0,
      fans: opts.fans,
      hype: opts.hype,
      marketingSpend: opts.marketingSpend,
      genreId: opts.genreId ?? "action",
      topicRepetition: opts.topicRepetition ?? 0,
      pirateMode: opts.pirateMode,
      liveOps: opts.liveOps,
      campaignSeed: opts.campaignSeed,
      gameId: opts.gameId,
      releaseWeek: opts.releaseWeek ?? 0,
      studioReputation: opts.studioReputation ?? 50,
      launchPrice: opts.launchPrice,
      distributionType: opts.distributionType,
      publisherReachMult: opts.publisherReachMult,
      publisherAwarenessMult: opts.publisherAwarenessMult,
      publisherRoyalty: opts.publisherRoyalty,
      sequelFanAwarenessMult: opts.sequelFanAwarenessMult,
      sequelCommercialMult: opts.sequelCommercialMult,
    });
    return {
      weeks: plan.weeks,
      totalUnits: plan.totalUnits,
      revenue: plan.revenue,
      fansGained: plan.fansGained,
      history: plan.history,
      price: plan.price,
      layers: plan.layers,
      revenueShare: plan.revenueShare,
      distributionType: plan.distributionType,
      marketWeeks: plan.marketWeeks,
    };
  }

  const size = SIZE_STATS[opts.size];
  const reviewFactor = Math.pow(clamp(hiddenFinalScore, 1, 10) / 10, 1.55);
  const fanBase = 800 + opts.fans * 0.08;
  const hypeBoost = 1 + opts.hype / 100 + opts.marketingSpend / 200000;
  const jitter = opts.seed != null ? 0.95 + ((opts.seed % 100) / 100) * 0.1 : rand(0.9, 1.1);
  const peak =
    fanBase *
    reviewFactor *
    size.salesMult *
    opts.platformMarket *
    hypeBoost *
    opts.comboMult *
    jitter;

  const duration = opts.liveOps ? 16 : 12;
  const weeks: number[] = [];
  let total = 0;
  for (let w = 0; w < duration; w++) {
    const decay = Math.pow(0.72, w);
    let units = peak * decay * (w === 0 ? 1.15 : 1);
    if (opts.pirateMode) units *= 0.78 - Math.min(0.2, w * 0.01);
    units = Math.max(0, Math.round(units));
    weeks.push(units);
    total += units;
  }
  const price =
    opts.size === "aaa" ? 60 : opts.size === "large" ? 50 : opts.size === "medium" ? 40 : 25;
  const revenue = total * price * 0.7;
  const fansGained = Math.round(total * (0.02 + hiddenFinalScore / 400));
  return { weeks, totalUnits: total, revenue, fansGained };
}

export function generateGameTitle(topic: string, genre: string): string {
  const topicName = getTopic(topic)?.name ?? "Unknown";
  const genreName = getGenre(genre as GenreId)?.name ?? "Game";
  const templates = [
    `${topicName} ${genreName}`,
    `${topicName} Legacy`,
    `Project ${topicName}`,
    `${topicName} Online`,
    `Chronicles of ${topicName}`,
    `${topicName} Force`,
    `Ultra ${topicName}`,
    `${topicName} Quest`,
    `The ${topicName} Effect`,
    `${topicName} Infinity`,
  ];
  return pick(templates);
}

/** Recent candidate names — avoid repetitive shortlists. */

const STAFF_FIRST = [
  "Alex", "Sam", "Jordan", "Riley", "Casey", "Morgan", "Quinn", "Avery",
  "Jamie", "Taylor", "Kai", "Nova", "Remy", "Sage", "Drew", "Parker",
  "Blake", "Cameron", "Devon", "Ellis", "Finley", "Harper", "Indigo", "Jules",
  "Kit", "Lane", "Marley", "Nico", "Oakley", "Phoenix", "Reed", "Shay",
  "Tatum", "Val", "Winter", "Zion", "Ari", "Bea", "Cory", "Dani",
];
const STAFF_LAST = [
  "Chen", "Okada", "Reyes", "Singh", "Novak", "Baker", "Ito", "Mensah",
  "Costa", "Nguyen", "Petrov", "Walsh", "Kim", "Hassan", "Berg", "Diaz",
  "Sato", "Moreau", "Kowalski", "Andersson", "Patel", "Okafor", "Silva", "Yamamoto",
  "Rossi", "Khan", "Fischer", "Larsson", "Nakamura", "Brooks", "Castillo", "Vogel",
];
const SPECS: Array<import("./types").DevField | null> = [
  "engine", "gameplay", "story", "graphics", "sound", "ai", "level", "world", "dialogue", null, null,
];

/**
 * Generate a hireable candidate.
 * @param levelBias relative strength (1 = typical first-office hire)
 * @param year industry year — later eras field stronger talent
 * @param opts.forceStar guarantee high-level surprise hire
 */
export function generateStaff(
  levelBias = 1,
  year = 1985,
  opts?: { forceStar?: boolean; seed?: number; candidateIndex?: number },
): StaffMember {
  const eraBoost = 1 + Math.max(0, year - 1979) * 0.008;
  const idx = opts?.candidateIndex ?? 0;
  // Pure: seed + index only. Same inputs → same candidate always.
  const rng = new SeededRng(
    opts?.seed ??
      hashSeed(
        "staff-v4",
        year,
        Math.round(levelBias * 1000),
        idx,
        opts?.forceStar ? 1 : 0,
      ),
  );
  const r = (a: number, b: number) => rng.range(a, b);
  const ri = (a: number, b: number) => rng.int(a, b);
  // ~12% chance of a higher-level "find" (or forced)
  // Spread archetypes by index so boards stay varied without Math.random()
  const archetype = opts?.forceStar ? 0 : idx % 5;
  const isStar = opts?.forceStar || archetype === 0 || rng.next() < 0.1;
  const isSolid = !isStar && (archetype === 1 || archetype === 2 || rng.next() < 0.35);
  let level = 1;
  if (isStar) level = Math.round(r(4, 8));
  else if (isSolid) level = Math.round(r(2, 4));
  else level = Math.round(r(1, 3));
  level = Math.max(1, Math.min(10, Math.round(level * Math.min(1.4, levelBias))));

  const baseMin = 38 + level * 3;
  const baseMax = 58 + level * 5;
  const starBump = isStar ? 12 : isSolid ? 5 : 0;
  let design = Math.round(r(baseMin, baseMax) * eraBoost + starBump + r(-4, 8));
  let tech = Math.round(r(baseMin, baseMax) * eraBoost + starBump + r(-4, 8));
  let speed = Math.round(r(baseMin + 2, baseMax + 4) * eraBoost + starBump * 0.6 + r(-3, 6));
  const standout = ri(0, 2);
  if (standout === 0) design = Math.min(98, design + Math.round(r(6, 14)));
  if (standout === 1) tech = Math.min(98, tech + Math.round(r(6, 14)));
  if (standout === 2) speed = Math.min(98, speed + Math.round(r(6, 14)));
  design = clamp(design, 32, 100);
  tech = clamp(tech, 32, 100);
  speed = clamp(speed, 35, 100);

  let salary = Math.round((design + tech + speed) * (22 + level * 4) + 800 + level * 400);
  if (isStar) salary = Math.round(salary * 1.35);
  salary = Math.min(salary, 1_800_000);

  // Names pure from seed + index (no global recent list).
  const fi = rng.int(0, STAFF_FIRST.length - 1);
  const li = rng.int(0, STAFF_LAST.length - 1);
  const name = `${STAFF_FIRST[fi]} ${STAFF_LAST[li]}`;

  const specialization = isStar || isSolid
    ? pick(SPECS.filter(Boolean) as import("./types").DevField[], opts?.seed ?? 0, idx, "spec-star")
    : pick(SPECS, opts?.seed ?? 0, idx, "spec");

  return {
    id: uid("staff", opts?.seed ?? hashSeed("staff-id", year, idx), idx, name),
    energy: 100,
    name,
    design,
    tech,
    speed,
    salary,
    specialization: specialization ?? null,
    level,
    xp: level > 1 ? level * 40 : 0,
    fieldExperience: {},
    busy: false,
    bugFixBonus: specialization === "engine" || specialization === "ai" ? 0.05 : 0,
  };
}

export function generateContracts(
  count: number,
  year: number,
  opts?: { campaignSeed?: number; week?: number },
): import("./types").ContractOffer[] {
  const list: import("./types").ContractOffer[] = [];
  const titles = [
    "Port classic title",
    "UI kit for publisher",
    "Arcade mini-game",
    "Advergame promo",
    "Engine middleware demo",
    "Serious games training module",
    "Mobile prototype",
    "Jam collab pack",
    "Museum interactive kiosk",
    "TV bumper pack",
    "Hardware launch demo",
    "Educational quiz engine",
    "Sports broadcast overlay",
    "Festival booth game",
  ];
  const n = Math.max(count, 1);
  const seed = opts?.campaignSeed ?? 1;
  const week = opts?.week ?? 0;
  for (let i = 0; i < n; i++) {
    const rng = new SeededRng(hashSeed(seed, "contract", year, week, i));
    const hard = 0.8 + (year - 1982) * 0.02;
    const designReq = Math.round(rng.range(18, 48) * hard);
    const techReq = Math.round(rng.range(18, 48) * hard);
    const title = titles[rng.int(0, titles.length - 1)]!;
    list.push({
      id: uid("contract", seed, year, week, i, title),
      title,
      description: `Client wants D${designReq}+ / T${techReq}+. Finish within the deadline for cash and RP.`,
      reward: Math.round(rng.range(9000, 32000) * hard),
      researchReward: Math.round(rng.range(10, 30)),
      weeks: Math.round(rng.range(4, 10)),
      progress: 0,
      designReq,
      techReq,
      active: false,
    });
  }
  return list;
}

export function toReleased(
  project: GameProject,
  reviews: { scores: number[]; avg: number; breakdown: ScoreBreakdown },
  sales: { weeks: number[]; totalUnits: number; revenue: number; fansGained: number },
  week: number,
  year: number,
): ReleasedGame {
  return {
    id: project.id,
    title: project.title,
    topicId: project.topicId,
    genreId: project.genreId,
    genre2Id: project.genre2Id,
    platformId: project.platformId,
    secondaryPlatformIds: project.secondaryPlatformIds,
    usedIllicitAssets: project.usedIllicitAssets,
    litigationDueWeek: project.litigationDueWeek ?? (project as { litigationDueWeek?: number }).litigationDueWeek,
    audience: project.audience,
    size: project.size,
    engineId: project.engineId,
    designPoints: project.designPoints,
    techPoints: project.techPoints,
    bugs: project.bugs,
    reviewScores: reviews.scores,
    avgReview: reviews.avg,
    sales: sales.totalUnits,
    revenue: 0,
    fansGained: sales.fansGained,
    weekReleased: week,
    yearReleased: year,
    marketingSpend: project.marketingSpend,
    developmentCost: project.developmentCost ?? 0,
    hype: project.hype,
    residualWeeks: sales.weeks.length,
    weeklySalesLeft: [...sales.weeks],
    weeklyHistory: [],
    isSequel: project.isSequel,
    isExpansion: project.isExpansion,
    sequelOf: project.sequelOf,
    seriesId: project.sequelOf ? `series_${project.sequelOf}` : undefined,
    sequelIndex: project.isSequel ? 2 : 1,
    hiddenFinalScore: reviews.breakdown.hiddenFinalScore,
    baseScore: reviews.breakdown.baseScore,
    weeksOnMarket: 0,
    onSale: true,
    reportDone: false,
    engineSnapshot: project.engineSnapshot ?? null,
  };
}

