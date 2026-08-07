/**
 * Studio Empire — Zustand game store (Garage Vertical Slice).
 * Domain orchestration: campaign, project stages, release/cancel, save/load, knowledge.
 */
import { create } from "zustand";
import {
  GENRE_RESEARCH_MAP,
  OFFICE_INFO,
  PLATFORMS,
  RESEARCH,
  SAVE_KEY,
  SAVE_VERSION,
  SIZE_STATS,
  STAGE_FIELDS,
  START_YEAR,
  TOPICS,
  defaultSliders,
  getGenre,
  getPlatform,
} from "./data";
import { startingEngineFeatures } from "./content/engines";
import {
  evaluateProgression,
  initialUnlocks,
  migrateUnlocks,
} from "./progression/service";
import {
  computeReviews,
  computeSalesCurve,
  developWeek,
  evaluateCombo,
  formatCash,
  generateContracts,
  generateGameTitle,
  generateStaff,
  toReleased,
  uid,
  weekToDate,
} from "./simulation";
import { applyReleaseExperience, INITIAL_TARGET_HIGH_SCORE, USE_ALGORITHM_V2 } from "./scoring";
import { normalizeStageAllocations } from "./scoring/algorithmV2";
import { USE_MARKET_V2 } from "./scoring/marketFlag";
import { initMarket } from "./market/init";
import { tickMarket, migrateMarket } from "./market/tick";
import { competitionModifierFor, rivalToCompetitor } from "./market/competition";
import {
  defaultLaunchPrice,
  emptyKnowledge,
  seedFromString,
  type OutcomeTrace,
} from "./contracts";
import {
  applyCancelKnowledge,
  applyReportKnowledge,
  migrateKnowledge,
} from "./knowledge";
import {
  initReleasedCommercial,
  tickReleasedSales,
} from "./commercial/runtime";
import {
  startMarketingCampaign,
  getCampaignSpec,
  emptyMarketingState,
  advanceMarketing,
  CAMPAIGN_CATALOG,
} from "./commercial/marketing";
import { applyLedger, emptyLedger } from "./finance/ledger";
import {
  applyPlanStage,
  advanceProductionWeek,
  cancelProjectProduction,
  isReleaseReady,
  productionOpenSeverity,
} from "./production/bridge";
import {
  finalizeBuild,
  founderCapability,
  founderFromStaff,
} from "./production/algorithm";
import {
  calculateConceptFit,
  calculateQuality,
  calculateReviews,
  metricsFromProduction,
} from "./quality/algorithm";
import {
  getPlatformSpec,
  platformMarketState,
  snapshotPlatformWeek,
  weekToCampaignDay,
  canSelectPlatform,
} from "./platforms/lifecycle";
import { topicGenreCompatibility } from "./content/genreFit";
import {
  GARAGE_START_GENRES,
  GARAGE_START_PLATFORMS,
  GARAGE_START_TOPICS,
  isGaragePlatform,
} from "./content/garageSlice";
import { hashSeed } from "./scoring/rng";
import type {
  AudienceId,
  DevField,
  DevPhase,
  EngineDef,
  GameProject,
  GameSize,
  GameState,
  GenreId,
  ModalId,
  Notification,
  ResearchJob,
  ScreenId,
  Speed,
  StaffMember,
  UnlockState,
} from "./types";
import { findSave, parseSaveCandidate, removeAllSaves } from "./save";

function founder(): StaffMember {
  return {
    id: "founder",
    name: "You",
    design: 45,
    tech: 45,
    speed: 50,
    salary: 0,
    specialization: null,
    level: 1,
    xp: 0,
    fieldExperience: {},
    busy: false,
    energy: 100,
  };
}

function baseEngine(): EngineDef {
  return {
    id: "basic_engine",
    name: "Basic Engine 1.0",
    features: startingEngineFeatures(),
    designBonus: 0,
    techBonus: 0,
    cost: 0,
    weeks: 0,
  };
}

function emptyStageConfigs(): GameProject["stageConfigs"] {
  return { 1: {}, 2: {}, 3: {} };
}

function neutralStageSliders(stage: 1 | 2 | 3): Record<DevField, number> {
  const base = defaultSliders("action");
  for (const f of Object.keys(base) as DevField[]) base[f] = 40;
  for (const f of STAGE_FIELDS[stage]) base[f] = 50;
  return base;
}

function mergeSlidersFromConfigs(cfg: GameProject["stageConfigs"]): Record<DevField, number> {
  const s = defaultSliders("action");
  for (const f of Object.keys(s) as DevField[]) s[f] = 40;
  for (const stage of [1, 2, 3] as const) {
    for (const [f, v] of Object.entries(cfg[stage])) {
      s[f as DevField] = v;
    }
  }
  return s;
}

export function availableSizes(
  researched: string[],
  unlocks: Record<string, UnlockState>,
  opts?: { office?: number; staffCount?: number },
): GameSize[] {
  const sizes: GameSize[] = ["small"];
  const office = opts?.office ?? 1;
  const staffCount = opts?.staffCount ?? 1;
  const mediumReady =
    (researched.includes("medium_games") || unlocks.medium_games === "owned") &&
    office >= 2 &&
    staffCount >= 2;
  if (mediumReady) sizes.push("medium");
  if (
    (researched.includes("large_games") || unlocks.large_games === "owned") &&
    office >= 3 &&
    staffCount >= 3
  ) {
    sizes.push("large");
  }
  if (
    (researched.includes("aaa_games") || unlocks.aaa === "owned") &&
    office >= 3 &&
    staffCount >= 4
  ) {
    sizes.push("aaa");
  }
  return sizes;
}

export function hasSave(): boolean {
  try {
    return findSave(localStorage) != null;
  } catch {
    return false;
  }
}

function initialState(): GameState {
  return {
    version: SAVE_VERSION,
    phase: "menu",
    companyName: "",
    week: 0,
    year: START_YEAR,
    month: 1,
    cash: 70000,
    fans: 0,
    researchPoints: 0,
    hype: 0,
    office: 1,
    speed: 0,
    screen: "studio",
    modal: null,
    settings: {
      pirateMode: false,
      autosave: true,
      reducedMotion: false,
      infoMode: "classic",
      disableBankruptcy: false,
      forcePerfectScore: false,
      forceBadScore: false,
    },
    unlockedTopics: [...GARAGE_START_TOPICS],
    unlockedGenres: [...GARAGE_START_GENRES],
    unlockedPlatforms: [...GARAGE_START_PLATFORMS],
    researched: [],
    unlocks: initialUnlocks(),
    engines: [baseEngine()],
    staff: [founder()],
    currentProject: null,
    releasedGames: [],
    activeSales: [],
    contracts: [],
    activeContract: null,
    activeResearch: null,
    activeResearchJobs: [],
    researchQueue: [],
    notifications: [],
    lastReviewGameId: null,
    selectedGameId: null,
    pendingEvent: null,
    recentEventKeys: [],
    eventCooldowns: {},
    highScore: 0,
    targetHighScore: INITIAL_TARGET_HIGH_SCORE,
    previousHighBaseScore: 0,
    lastScoreBreakdown: null,
    totalRevenue: 0,
    gamesPublished: 0,
    piracyLossRate: 0.15,
    marketingLevel: 0,
    flags: {
      multiGenre: false,
      sequels: false,
      expansions: false,
      marketing: false,
      contracts: false,
      audience: false,
      rndLab: false,
      hardwareLab: false,
    },
    draft: null,
    lastComboKey: undefined,
    consecutiveSameCombo: 0,
    tutorialStep: 0,
    cheatsEnabled: false,
    dirty: false,
    lastSavedWeek: 0,
    campaignSeed: 1,
    market: null,
    knowledge: emptyKnowledge(),
    garageSlice: true,
    publishingBoard: null,
    activePublisherDealId: null,
    researchPointsFrac: 0,
    seriesRecords: {},
    ledger: emptyLedger(70000),
  };
}

function pushNote(
  state: GameState,
  text: string,
  tone: Notification["tone"] = "info",
): Notification[] {
  return [
    { id: uid("note"), text, tone, week: state.week, read: false },
    ...state.notifications,
  ].slice(0, 40);
}

function researchBoosts(researched: string[]) {
  let designBoost = 0;
  let techBoost = 0;
  let qa = false;
  let influencer = false;
  let liveOps = false;
  for (const id of researched) {
    const r = RESEARCH.find((x) => x.id === id);
    if (!r) continue;
    if (r.designBoost) designBoost += r.designBoost;
    if (r.techBoost) techBoost += r.techBoost;
    if (id.includes("qa") || id.includes("test")) qa = true;
    if (id.includes("market") || id.includes("influenc")) influencer = true;
    if (id.includes("live") || id.includes("online")) liveOps = true;
  }
  return { designBoost, techBoost, qa, influencer, liveOps };
}

function applyUnlockNotes(next: GameState): GameState {
  const { unlocks, notes } = evaluateProgression(next);
  next.unlocks = unlocks;
  for (const n of notes) {
    next.notifications = pushNote(next, n, "good");
  }
  return next;
}

function tryFireEvent(next: GameState): GameState {
  // Deterministic-ish events from campaign seed + week
  const roll = hashSeed(next.campaignSeed, next.week, "event") % 100;
  if (roll > 12) return next;
  const pool: Array<{
    key: string;
    title: string;
    body: string;
    cd: number;
    apply: (s: GameState) => void;
  }> = [
    {
      key: "trade_mag",
      title: "Trade magazine",
      body: "A trade magazine covers indie studios. Hype rises.",
      cd: 24,
      apply: (s) => {
        s.hype += 8;
      },
    },
    {
      key: "hardware_short",
      title: "Hardware shortage",
      body: "Component prices spike. Unexpected costs this week.",
      cd: 36,
      apply: (s) => {
        s.cash -= 2000;
      },
    },
    {
      key: "fan_club",
      title: "Fan club forms",
      body: "Enthusiasts start a club around your last title.",
      cd: 30,
      apply: (s) => {
        s.fans += 120;
      },
    },
    {
      key: "dev_meetup",
      title: "Dev meetup",
      body: "Local developers share tips. Small research boost.",
      cd: 20,
      apply: (s) => {
        s.researchPoints += 4;
      },
    },
  ];
  const eligible = pool.filter((e) => {
    const until = next.eventCooldowns[e.key] ?? 0;
    if (next.week < until) return false;
    if (next.recentEventKeys[0] === e.key) return false;
    return true;
  });
  if (!eligible.length) return next;
  const idx = hashSeed(next.campaignSeed, next.week, "eventpick") % eligible.length;
  const ev = eligible[idx]!;
  ev.apply(next);
  next.eventCooldowns = { ...next.eventCooldowns, [ev.key]: next.week + ev.cd };
  next.recentEventKeys = [ev.key, ...next.recentEventKeys].slice(0, 8);
  next.notifications = pushNote(next, `${ev.title}: ${ev.body}`, "info");
  return next;
}

function releaseProject(next: GameState, project: GameProject): GameState {
  // Idempotent: already released
  if (next.releasedGames.some((g) => g.id === project.id && g.reviewResult)) {
    next.currentProject = null;
    next.modal = "reviews";
    next.lastReviewGameId = project.id;
    return next;
  }
  if (project.cancelled || project.production?.phase === "cancelled") {
    next.notifications = pushNote(next, "Cancelled projects cannot be released.", "bad");
    return next;
  }
  // Prefer production release-ready when production sim was used
  if (project.production && project.production.phase !== "release_ready") {
    if (project.production.phase === "finalize_build") {
      project = {
        ...project,
        production: finalizeBuild(project.production),
      };
    }
    if (project.production && project.production.phase !== "release_ready") {
      next.notifications = pushNote(
        next,
        "Build is not release-ready yet (finish polish / bugs).",
        "warn",
      );
      return next;
    }
  }

  const boosts = researchBoosts(next.researched);
  const merged = mergeSlidersFromConfigs(project.stageConfigs);
  const scored: GameProject = {
    ...project,
    sliders: merged,
    stage: "done",
    stageProgress: 1,
  };

  const combo = evaluateCombo({
    topicId: scored.topicId,
    genreId: scored.genreId,
    genre2Id: scored.genre2Id,
    platformId: scored.platformId,
    audience: scored.audience,
  });
  let comboMult = combo.multiplier;
  const comboKey = `${scored.topicId}:${scored.genreId}`;
  if (next.lastComboKey === comboKey) {
    next.consecutiveSameCombo += 1;
    comboMult *= Math.max(0.85, 1 - next.consecutiveSameCombo * 0.04);
  } else {
    next.consecutiveSameCombo = 0;
    next.lastComboKey = comboKey;
  }

  const prev =
    (scored.sequelOf
      ? next.releasedGames.find((g) => g.id === scored.sequelOf)
      : null) ?? null;
  let sequelWeeks: number | null = null;
  if (scored.isSequel && prev) sequelWeeks = Math.max(0, next.week - prev.weekReleased);

  const graphicsLevel = next.researched.filter((id) => {
    const r = RESEARCH.find((x) => x.id === id);
    return r && (r.category === "Graphics" || id.includes("graphic") || id.includes("3d"));
  }).length;

  const platform = getPlatform(scored.platformId);
  const topicRep = next.releasedGames.filter((g) => g.topicId === scored.topicId).length;

  // --- ALGORITHM 2: quality + reviews (no marketing/price/platform inputs) ---
  const genresOrdered = [scored.genreId, scored.genre2Id].filter(Boolean) as string[];
  const capacityTier = Math.min(4, Math.max(1, genresOrdered.length)) as 1 | 2 | 3 | 4;
  const compat = genresOrdered.map((g) =>
    topicGenreCompatibility(scored.topicId, g as import("./types").GenreId),
  );
  // pad tier mismatch: if only 1 genre use tier 1
  const tier = genresOrdered.length as 1 | 2 | 3 | 4;
  const conceptFit = calculateConceptFit(
    compat.length ? compat : [topicGenreCompatibility(scored.topicId, scored.genreId)],
    (compat.length || 1) as 1 | 2 | 3 | 4,
  );

  let qualityResult = scored.qualityResult;
  let reviewResult = undefined as import("./quality/algorithm").ReviewResult | undefined;
  let reviews: ReturnType<typeof computeReviews>;
  let productQuality: number;
  let hidden: number;

  if (scored.production?.candidateBuild || scored.production?.completedStages?.length) {
    const founder = founderFromStaff(next.staff);
    const eng = next.engines.find((e) => e.id === scored.engineId);
    const installed = new Set(eng?.features ?? []);
    const metrics = metricsFromProduction({
      completedStages: scored.production.completedStages,
      founderCapability: (d) => founderCapability(founder, d),
      engineSupportFor: (d) => {
        // Research alone does not install — only engine features count
        if (d === "graphics") {
          if ([...installed].some((f) => /3d/i.test(f))) return 1;
          if ([...installed].some((f) => /2d/i.test(f))) return 0.85;
          return 0.55;
        }
        if (d === "sound") {
          if ([...installed].some((f) => /surround/i.test(f))) return 1;
          if ([...installed].some((f) => /stereo/i.test(f))) return 0.85;
          if ([...installed].some((f) => /mono|sound/i.test(f))) return 0.7;
          return 0.5;
        }
        if (d === "ai") {
          return [...installed].some((f) => /ai/i.test(f)) ? 0.95 : 0.55;
        }
        if (d === "engine") return installed.size ? 0.8 + Math.min(0.2, installed.size * 0.02) : 0.55;
        return 0.7;
      },
    });
    const unfixed = productionOpenSeverity(scored);
    const polishRatio =
      scored.production.polishProgress /
      Math.max(1, 300);
    qualityResult = calculateQuality({
      conceptFit,
      metrics: metrics.length
        ? metrics
        : [
            {
              discipline: "gameplay",
              group: "design",
              importanceWeight: 1,
              completedWorkRatio: 0.8,
              actualFocus: 0.33,
              targetFocus: 0.33,
              capability: 0.75,
              engineSupport: 0.7,
            },
          ],
      unfixedBugSeverity: unfixed,
      polishRatio,
    });
    const releaseDay = weekToCampaignDay(next.week);
    reviewResult = calculateReviews({
      campaignSeed: next.campaignSeed,
      gameId: scored.id,
      releaseDay,
      quality: qualityResult,
    });
    // Map 0–100 → existing 0–10 review UI
    const outletEntries = Object.entries(reviewResult.outletScores);
    const scores = outletEntries.map(([, s]) => Math.round((s / 10) * 10) / 10);
    const avg = reviewResult.reviewAverage / 10;
    productQuality = qualityResult.overallQuality;
    hidden = avg;
    reviews = {
      scores: scores.length ? scores : [avg, avg, avg, avg, avg],
      avg,
      breakdown: {
        baseScore: qualityResult.overallQuality,
        techFactor: qualityResult.technologyQuality / 100,
        designFactor: qualityResult.designQuality / 100,
        bugRatio: qualityResult.bugPenalty / 30,
        hypeBonus: 0,
        sequelMod: 1,
        mmoPenalty: 1,
        trendBonus: 1,
        qualityFactor: qualityResult.executionQuality / 100,
        targetHighScore: next.targetHighScore ?? 10,
        hiddenFinalScore: hidden,
      },
      nextHighBaseScore: qualityResult.overallQuality,
      criticReviews: outletEntries.map(([name, s]) => ({
        name,
        score: s / 10,
        comment: `${reviewResult!.label}: ${reviewResult!.reasonCodes.join(", ") || "solid work"}`,
      })),
      qualityBreakdownV2: {
        design: qualityResult.designQuality,
        tech: qualityResult.technologyQuality,
        execution: qualityResult.executionQuality,
        concept: qualityResult.conceptFit,
        overall: qualityResult.overallQuality,
      },
      productQuality,
      quality: productQuality,
    } as unknown as ReturnType<typeof computeReviews>;
  } else {
    // Legacy path without production sim
    reviews = computeReviews(scored, {
      targetHighScore: next.targetHighScore ?? INITIAL_TARGET_HIGH_SCORE,
      previousHighBaseScore: next.previousHighBaseScore ?? 0,
      office: next.office,
      fans: next.fans,
      graphicsLevel,
      specialistCount: next.staff.filter((m) => m.specialization || m.level >= 5).length,
      gameYearIndex: Math.max(0, next.year - START_YEAR),
      previousGame: prev,
      engines: next.engines,
      matchesTrend: false,
      strangeTrend: false,
      isMmo: scored.features.some((f) => /mmo/i.test(f)),
      sequelWeeksSinceOriginal: sequelWeeks,
      staff: next.staff,
      platformMarket: platform.marketSize,
      platformTechCeiling: platform.techCeiling,
      reputation: Math.min(100, 30 + next.gamesPublished * 3 + next.highScore * 4),
      previousAvgReview: prev?.avgReview ?? next.highScore,
      designBoost: boosts.designBoost,
      techBoost: boosts.techBoost,
      campaignSeed: next.campaignSeed,
      week: next.week,
    });
    hidden = reviews.breakdown.hiddenFinalScore;
    productQuality =
      (reviews as { productQuality?: number }).productQuality ?? hidden * 10;
  }

  // QA score force cheats
  if (next.settings.forcePerfectScore) {
    reviews.scores = reviews.scores.map(() => 10);
    reviews.avg = 10;
    productQuality = 98;
    hidden = 9.8;
  } else if (next.settings.forceBadScore) {
    reviews.scores = reviews.scores.map(() => 2);
    reviews.avg = 2;
    productQuality = 22;
    hidden = 2.2;
  }

  // ALGORITHM 3 platform market at release day
  const releaseDay = weekToCampaignDay(next.week);
  const pSpec = getPlatformSpec(scored.platformId);
  const pMarket = platformMarketState(pSpec, {
    day: releaseDay,
    audienceId: scored.audience,
  });
  const platformSnap = snapshotPlatformWeek(pMarket);
  const platformMarket =
    pMarket.lifecycleFactor * Math.max(0.35, platform.marketSize);
  const platformAgeYears = Math.max(0, (releaseDay - pSpec.launchDay) / (48 * 7));

  const sales = computeSalesCurve(hidden, {
    size: scored.size,
    platformMarket,
    fans: next.fans,
    hype: scored.hype + next.hype,
    marketingSpend: scored.marketingSpend * (boosts.influencer ? 1.35 : 1),
    pirateMode: next.settings.pirateMode,
    liveOps: boosts.liveOps,
    comboMult,
    seed: hashSeed(next.campaignSeed, scored.id, "sales-seed", next.week),
    productQuality,
    avgReview: reviews.avg,
    hiddenAsQuality: productQuality,
    platformAgeYears,
    genreId: scored.genreId,
    topicRepetition: topicRep,
    campaignSeed: next.campaignSeed,
    gameId: scored.id,
    releaseWeek: next.week,
    studioReputation: Math.min(100, 30 + next.gamesPublished * 3 + next.highScore * 4),
    launchPrice: project.launchPrice ?? defaultLaunchPrice(scored.size),
  });

  const released = toReleased(
    scored,
    { scores: reviews.scores, avg: reviews.avg, breakdown: reviews.breakdown },
    sales,
    next.week,
    next.year,
  );

  const v2 = reviews as {
    criticReviews?: { name: string; score: number; comment: string }[];
    qualityBreakdownV2?: Record<string, number>;
    productQuality?: number;
  };
  if (v2.criticReviews) {
    released.criticReviews = v2.criticReviews;
    released.reviewComments = v2.criticReviews.map((c) => c.comment);
  }
  if (v2.qualityBreakdownV2) released.qualityBreakdownV2 = v2.qualityBreakdownV2;
  if (v2.productQuality != null) released.productQuality = v2.productQuality;
  if (qualityResult) released.qualityResult = qualityResult;
  if (reviewResult) released.reviewResult = reviewResult;
  released.platformSnapshotAtRelease = platformSnap;
  // Use live platform lifecycle for commercial snapshot
  if (released.salesSnapshot) {
    released.salesSnapshot = {
      ...released.salesSnapshot,
      platformInstalledBase: platformSnap.installedBase,
      platformLifecycle: platformSnap.lifecycleFactor,
      platformFeeRate: platformSnap.platformFeeRate,
      audienceDemand: platformSnap.audienceDemand,
    };
  }

  const price =
    project.launchPrice ?? sales.price ?? defaultLaunchPrice(scored.size);
  released.launchPrice = price;

  // First-week sales apply only after ≥1 market week (7 days) — not at release instant.
  const planUnits =
    sales.history && sales.history.length
      ? sales.history.map((h) => h.units)
      : [...released.weeklySalesLeft];
  if (sales.history && sales.history.length) {
    released.weeklySalesLeft = sales.history.map((h) => h.units);
  }
  released.weeklyHistory = [];
  released.sales = 0;
  released.revenue = 0;
  released.weeksOnMarket = 0;
  released.residualWeeks = released.weeklySalesLeft.length;
  released.onSale = true;

  released.outcomeTrace = {
    campaignSeed: next.campaignSeed,
    projectSeed: scored.rngSeed ?? 0,
    releaseWeek: next.week,
    productQuality: released.productQuality ?? productQuality,
    reviewScores: [...reviews.scores],
    avgReview: reviews.avg,
    hiddenFinalScore: hidden,
    weeklySalesPlan: planUnits,
    knowledgeKeys: [],
    algorithm: "v2",
  } satisfies OutcomeTrace;

  // Live weekly sales + marketing init (reviews already frozen above)
  const commercial = initReleasedCommercial({
    released,
    state: next,
    marketingSpend: scored.marketingSpend,
    influencerBoost: boosts.influencer,
    platformMarket: Math.max(0.35, platformMarket),
    platformAgeYears,
    platformLifecycle: platformSnap.lifecycleFactor,
    installedBase: platformSnap.installedBase,
    topicRep,
    comboMult,
    distType: "self",
    royalty: 0.7,
    planUnits,
    productQuality,
    avgReview: reviews.avg,
  });
  Object.assign(released, commercial.released);
  if (qualityResult) released.qualityResult = qualityResult;
  if (reviewResult) released.reviewResult = reviewResult;
  released.platformSnapshotAtRelease = platformSnap;
  if (released.salesSnapshot) {
    released.salesSnapshot = {
      ...released.salesSnapshot,
      platformInstalledBase: platformSnap.installedBase,
      platformLifecycle: platformSnap.lifecycleFactor,
      platformFeeRate: platformSnap.platformFeeRate,
      audienceDemand: platformSnap.audienceDemand,
    };
  }
  next.fans = Math.max(0, next.fans + commercial.fansDelta);
  if (commercial.notification) {
    next.notifications = pushNote(
      next,
      commercial.notification.text,
      commercial.notification.tone,
    );
  }

  // No cash from sales at release — reviews first; sales start next week tick
  next.releasedGames = [released, ...next.releasedGames];
  next.activeSales = [released, ...next.activeSales.filter((g) => g.onSale)];
  next.gamesPublished += 1;

  if (USE_MARKET_V2) {
    const m = next.market ?? initMarket(next.campaignSeed, next.week);
    const competitors = [
      ...m.rivalGamesOnSale.map(rivalToCompetitor),
      ...next.activeSales.map((g) => ({
        id: g.id,
        genreId: g.genreId,
        platformId: g.platformId,
        topicId: g.topicId,
        size: g.size,
        releaseWeek: g.weekReleased,
        awareness: Math.min(0.95, 0.2 + g.marketingSpend / 100000 + g.avgReview / 25),
        avgReview: g.avgReview,
        marketingSpend: g.marketingSpend,
        isPlayer: true as const,
      })),
    ];
    // competition snapshot at release is recorded for later ticks; no first-week unit rewrite
    void competitionModifierFor(
      {
        id: released.id,
        genreId: released.genreId,
        platformId: released.platformId,
        topicId: released.topicId,
        size: released.size,
        releaseWeek: released.weekReleased,
        awareness: Math.min(0.95, 0.25 + released.marketingSpend / 80000),
        avgReview: released.avgReview,
        marketingSpend: released.marketingSpend,
        isPlayer: true,
      },
      competitors,
      next.week,
    );
    const trends = m.trends.map((t) => {
      if (t.kind === "genre" && t.subjectId === released.genreId) {
        const lift = (released.avgReview / 10) * 0.035;
        return {
          ...t,
          momentum: Math.min(1.35, t.momentum + lift),
          saturation: Math.min(1, t.saturation + 0.03),
          lastChangeWeek: next.week,
          cause: "player_release",
        };
      }
      return t;
    });
    next.market = {
      ...m,
      trends,
      calendar: [
        {
          id: `cal_player_${released.id}`,
          week: next.week,
          kind: "player_release" as const,
          title: released.title,
          detail: `Your release · ${released.avgReview.toFixed(1)}`,
          entityId: released.id,
          public: true,
        },
        ...m.calendar,
      ].slice(0, 80),
      news: [
        {
          id: `news_player_${released.id}`,
          week: next.week,
          category: "release",
          headline: `${next.companyName} releases ${released.title}`,
          body: `Critics average ${released.avgReview.toFixed(1)}. Sales start next week.`,
          causeEntityIds: [released.id],
        },
        ...m.news,
      ].slice(0, 40),
    };
  }

  next.highScore = Math.max(next.highScore, reviews.avg);
  next.targetHighScore = reviews.breakdown.nextTargetHighScore;
  next.previousHighBaseScore = reviews.breakdown.nextHighBaseScore;
  next.lastScoreBreakdown = {
    baseScore: reviews.breakdown.baseScore,
    hiddenFinalScore: reviews.breakdown.hiddenFinalScore,
    targetHighScore: reviews.breakdown.targetHighScore,
    qualityFactor: reviews.breakdown.qualityFactor,
    bugRatio: reviews.breakdown.bugRatio,
  };
  next.researchPoints += 5 + hidden * 1.5 + (scored.researchEarned ?? 0) * 0.1;
  next.hype = Math.max(0, next.hype * 0.5 + hidden);
  next.currentProject = null;
  next.lastReviewGameId = released.id;
  next.selectedGameId = released.id;
  next.modal = "reviews";
  next.screen = "games";
  next.speed = 0;
  next.staff = applyReleaseExperience(next.staff, hidden);
  next.notifications = pushNote(
    next,
    `"${released.title}" released — avg ${reviews.avg}/10`,
    reviews.avg >= 7 ? "good" : reviews.avg >= 5 ? "info" : "warn",
  );
  next = applyUnlockNotes(next);
  next.dirty = true;
  return next;
}

let candidatesCache: StaffMember[] = [];
let engineBuildWeeks = 0;
let pendingEngine: EngineDef | null = null;
let lastSaveAt = 0;

interface Actions {
  newGame: (companyName: string, pirateMode: boolean) => void;
  loadGame: () => boolean;
  saveGame: () => void;
  deleteSave: () => void;
  returnToMenu: () => void;
  resumeFromMenu: () => boolean;
  setSpeed: (s: Speed) => void;
  /** Advance exactly one market week (mobile-friendly; works while paused during RUNNING/POLISH). */
  advanceWeek: () => string | null;
  setScreen: (s: ScreenId) => void;
  setModal: (m: ModalId) => void;
  tick: () => void;
  startProject: (partial: {
    title: string;
    topicId: string;
    genreId: GenreId;
    genre2Id?: GenreId | null;
    platformId: string;
    audience: AudienceId;
    size: GameSize;
    engineId: string;
    isSequel?: boolean;
    sequelOf?: string;
    isExpansion?: boolean;
    marketingSpend?: number;
    features?: string[];
  }) => string | null;
  setSlider: (field: DevField, value: number) => void;
  confirmStage: () => string | null;
  beginPolishRelease: () => void;
  workPolishWeek: () => string | null;
  enterPreRelease: () => string | null;
  setLaunchPrice: (price: number) => void;
  setProjectTitle: (title: string) => void;
  releaseGame: () => string | null;
  cancelProject: () => string | null;
  autoBalanceSliders: () => void;
  startResearch: (id: string, kind?: "tech" | "topic") => string | null;
  researchItem: (id: string) => string | null;
  researchTopic: (id: string) => string | null;
  hireStaff: (candidate: StaffMember) => string | null;
  fireStaff: (id: string) => void;
  refreshCandidates: () => StaffMember[];
  getCandidates: () => StaffMember[];
  licensePlatform: (id: string) => string | null;
  upgradeOffice: () => string | null;
  buildEngine: (name: string, featureIds: string[]) => string | null;
  takeContract: (id: string) => string | null;
  dismissNotifications: () => void;
  /** Mark all inbox items read (does not delete). */
  markNotificationsRead: () => void;
  selectGame: (id: string | null) => void;
  completeReport: (id: string) => void;
  startTitleCampaign: (gameId: string, campaignId: string) => string | null;
  applyCheat: (cheat: string, arg?: string | number) => void;
  exportSave: () => string;
  importSave: (raw: string) => boolean;
}

function migrateProject(p: GameProject | null): GameProject | null {
  if (!p) return null;
  const any = p as GameProject & { devPhase?: DevPhase };
  if (!any.devPhase) {
    const st = p.stage === "done" ? 3 : (p.stage as 1 | 2 | 3);
    any.devPhase = st === 1 ? "STAGE_1_CONFIG" : st === 2 ? "STAGE_2_CONFIG" : "STAGE_3_CONFIG";
  }
  if (!any.stageConfigs) any.stageConfigs = emptyStageConfigs();
  if (any.researchEarned == null) any.researchEarned = 0;
  if (any.developmentCost == null) any.developmentCost = SIZE_STATS[p.size].cost;
  if (any.launchPrice == null) any.launchPrice = defaultLaunchPrice(p.size);
  return any;
}

function migrateReleased(g: GameState["releasedGames"][0]): GameState["releasedGames"][0] {
  return {
    ...g,
    weeklyHistory: g.weeklyHistory ?? [],
    developmentCost: g.developmentCost ?? SIZE_STATS[g.size].cost,
    weeksOnMarket: g.weeksOnMarket ?? Math.max(0, 12 - (g.weeklySalesLeft?.length ?? 0)),
    onSale: g.onSale ?? (g.weeklySalesLeft?.length ?? 0) > 0,
    reportDone: g.reportDone ?? false,
    launchPrice: g.launchPrice ?? defaultLaunchPrice(g.size),
    outcomeTrace: g.outcomeTrace,
  };
}

function readSaveRaw(): string | null {
  try {
    return findSave(localStorage)?.raw ?? null;
  } catch {
    return null;
  }
}

export const useGame = create<GameState & Actions>((set, get) => ({
  ...initialState(),

  newGame: (companyName, pirateMode) => {
    const s = initialState();
    s.phase = "playing";
    s.companyName = companyName.trim() || "Garage Games";
    s.settings.pirateMode = pirateMode;
    s.speed = 0;
    s.screen = "studio";
    s.garageSlice = true;
    s.unlockedTopics = [...GARAGE_START_TOPICS];
    s.unlockedGenres = [...GARAGE_START_GENRES];
    s.unlockedPlatforms = [...GARAGE_START_PLATFORMS];
    s.knowledge = emptyKnowledge();
    s.notifications = [
      {
        id: uid("note"),
        text: `Welcome to ${s.companyName}. Create a game — you choose every development stage.`,
        tone: "info",
        week: 0,
      },
    ];
    s.dirty = true;
    s.campaignSeed = seedFromString(`${s.companyName}|garage|${pirateMode ? 1 : 0}`);
    if (USE_MARKET_V2) s.market = initMarket(s.campaignSeed, 0);
    set(s);
  },

  loadGame: () => {
    try {
      const raw = readSaveRaw();
      if (!raw) return false;
      const parsed = parseSaveCandidate(raw);
      if (!parsed) return false;
      const data = parsed as Partial<GameState>;
      const base = initialState();
      const staff = (data.staff ?? base.staff).map((m) => ({
        ...m,
        energy: m.id === "founder" ? 100 : (m.energy ?? 100),
        fieldExperience: m.fieldExperience ?? {},
      }));
      set({
        ...base,
        ...data,
        version: SAVE_VERSION,
        phase: "playing",
        modal: null,
        screen: (data.screen as ScreenId) ?? "studio",
        speed: 0,
        staff,
        currentProject: migrateProject(data.currentProject ?? null),
        releasedGames: (data.releasedGames ?? []).map(migrateReleased),
        activeSales: (data.activeSales ?? []).map(migrateReleased),
        unlocks: migrateUnlocks(data),
        activeResearch: data.activeResearch ?? null,
        recentEventKeys: data.recentEventKeys ?? [],
        eventCooldowns: data.eventCooldowns ?? {},
        cheatsEnabled: data.cheatsEnabled ?? false,
        campaignSeed: data.campaignSeed ?? 1,
        market: USE_MARKET_V2
          ? migrateMarket(data.market, data.campaignSeed ?? 1)
          : data.market ?? null,
        knowledge: migrateKnowledge((data as GameState).knowledge),
        garageSlice: (data as GameState).garageSlice ?? true,
        dirty: false,
        settings: {
          ...base.settings,
          ...(data.settings ?? {}),
          infoMode: data.settings?.infoMode ?? "classic",
        },
      });
      return true;
    } catch {
      return false;
    }
  },

  saveGame: () => {
    const state = get();
    try {
      const payload = {
        ...state,
        version: SAVE_VERSION,
        modal: null,
        speed: 0,
        dirty: false,
        lastSavedWeek: state.week,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      lastSaveAt = Date.now();
      set({ dirty: false, lastSavedWeek: state.week });
    } catch {
      /* ignore quota */
    }
  },

  deleteSave: () => {
    try {
      removeAllSaves(localStorage);
    } catch {
      /* */
    }
    set({ ...initialState() });
  },

  returnToMenu: () => {
    get().saveGame();
    set({ phase: "menu", modal: null, speed: 0 });
  },

  resumeFromMenu: () => get().loadGame(),

  setSpeed: (s) => {
    const p = get().currentProject;
    if (
      p &&
      (p.devPhase === "STAGE_1_CONFIG" ||
        p.devPhase === "STAGE_2_CONFIG" ||
        p.devPhase === "STAGE_3_CONFIG" ||
        p.devPhase === "READY_TO_RELEASE") &&
      s > 0
    ) {
      return;
    }
    set({ speed: s });
  },

  advanceWeek: () => {
    const state = get();
    if (state.phase !== "playing") return "Not in a campaign.";
    const p = state.currentProject;
    if (
      p &&
      (p.devPhase === "STAGE_1_CONFIG" ||
        p.devPhase === "STAGE_2_CONFIG" ||
        p.devPhase === "STAGE_3_CONFIG" ||
        p.devPhase === "READY_TO_RELEASE")
    ) {
      return "Decide on the desk first, then advance time.";
    }
    const prev = state.speed;
    set({ speed: 1 });
    get().tick();
    const after = get();
    if (
      after.currentProject &&
      (after.currentProject.devPhase.includes("CONFIG") ||
        after.currentProject.devPhase === "READY_TO_RELEASE" ||
        after.currentProject.devPhase === "POLISHING")
    ) {
      // Keep paused at decision points; polish can still advance via button
      if (
        after.currentProject.devPhase.includes("CONFIG") ||
        after.currentProject.devPhase === "READY_TO_RELEASE"
      ) {
        set({ speed: 0 });
      } else if (prev === 0) {
        set({ speed: 0 });
      }
    } else if (prev === 0) {
      set({ speed: 0 });
    }
    return null;
  },

  setScreen: (s) => set({ screen: s, modal: null }),
  setModal: (m) => set({ modal: m }),

  tick: () => {
    const state = get();
    if (state.phase !== "playing" || state.speed === 0) return;

    const p0 = state.currentProject;
    if (
      p0 &&
      (p0.devPhase === "STAGE_1_CONFIG" ||
        p0.devPhase === "STAGE_2_CONFIG" ||
        p0.devPhase === "STAGE_3_CONFIG" ||
        p0.devPhase === "READY_TO_RELEASE")
    ) {
      set({ speed: 0 });
      return;
    }

    let next: GameState = {
      ...state,
      flags: { ...state.flags },
      unlocks: { ...state.unlocks },
      eventCooldowns: { ...state.eventCooldowns },
      knowledge: state.knowledge,
    };
    const date = weekToDate(next.week + 1, START_YEAR);
    next.week += 1;
    next.year = date.year;
    next.month = date.month;
    next.dirty = true;

    const payroll = next.staff.reduce((s, m) => s + m.salary, 0);
    next.cash -= payroll / 4;
    if (date.weekOfMonth === 1) {
      const rent = OFFICE_INFO[next.office].rent;
      if (rent > 0) next.cash -= rent;
    }

    // Founder never drains energy
    next.staff = next.staff.map((m) => {
      if (m.id === "founder") return { ...m, energy: 100 };
      let energy = m.energy ?? 100;
      if (next.currentProject && next.currentProject.devPhase.includes("RUNNING")) {
        energy = Math.max(10, energy - 3);
      } else if (next.currentProject?.devPhase === "POLISHING") {
        energy = Math.max(15, energy - 2);
      } else {
        energy = Math.min(100, energy + 5);
      }
      return { ...m, energy };
    });

    for (const plat of PLATFORMS) {
      if (plat.isCustom) continue;
      if (
        plat.year === next.year &&
        date.month === 1 &&
        date.weekOfMonth === 1 &&
        !next.unlockedPlatforms.includes(plat.id) &&
        plat.licenseCost > 0
      ) {
        next.notifications = pushNote(
          next,
          `${plat.name} hits the market. License it under Platforms.`,
          "info",
        );
      }
    }

    if (pendingEngine && engineBuildWeeks > 0) {
      engineBuildWeeks -= 1;
      if (engineBuildWeeks <= 0 && pendingEngine) {
        next.engines = [...next.engines, pendingEngine];
        next.notifications = pushNote(next, `Engine "${pendingEngine.name}" is ready.`, "good");
        pendingEngine = null;
      }
    }

    if (next.activeResearch) {
      const job = { ...next.activeResearch, weeksLeft: next.activeResearch.weeksLeft - 1 };
      if (job.weeksLeft <= 0) {
        if (job.kind === "tech") {
          const item = RESEARCH.find((r) => r.id === job.targetId);
          next.researched = [...next.researched, job.targetId];
          if (item) {
            const unlockedGenres = [...next.unlockedGenres];
            const g = GENRE_RESEARCH_MAP[item.id];
            if (g && !unlockedGenres.includes(g)) unlockedGenres.push(g);
            next.unlockedGenres = unlockedGenres;
            if (item.unlocksAudience) next.flags.audience = true;
            if (item.unlocksMarketing) next.flags.marketing = true;
            if (item.unlocksContracts) next.flags.contracts = true;
            if (item.unlocksSequel) next.flags.sequels = true;
            if (item.unlocksMultiGenre) next.flags.multiGenre = true;
            if (item.unlocksExpansion) next.flags.expansions = true;
          }
          next.notifications = pushNote(next, `Research complete: ${job.name}`, "good");
        } else {
          if (!next.unlockedTopics.includes(job.targetId)) {
            next.unlockedTopics = [...next.unlockedTopics, job.targetId];
          }
          next.notifications = pushNote(next, `Topic unlocked: ${job.name}`, "good");
        }
        next.activeResearch = null;
      } else {
        next.activeResearch = job;
      }
    }

    // Development week — ALGORITHM 1 production sim (7 domain days)
    if (next.currentProject) {
      const day = weekToCampaignDay(next.week);
      const adv = advanceProductionWeek(next.currentProject, {
        campaignSeed: next.campaignSeed,
        staff: next.staff,
        startDay: next.currentProject.production?.asOfDay ?? day,
      });
      next.currentProject = adv.project;
      if (adv.cashCost > 0) {
        next.cash -= adv.cashCost;
        next.ledger = applyLedger(next.ledger, {
          week: next.week,
          amount: -adv.cashCost,
          category: "development",
          label: `Development: ${adv.project.title}`,
          gameId: adv.project.id,
          ref: `dev-${adv.project.id}-w${next.week}`,
        });
      }
      next.staff = next.staff.map((m) =>
        m.id === "founder" ? { ...m, energy: 100 } : m,
      );
      if (adv.stageJustFinished) {
        next.speed = 0;
        const ph = next.currentProject.devPhase;
        if (ph === "STAGE_2_CONFIG" || ph === "STAGE_3_CONFIG") {
          next.currentProject = {
            ...next.currentProject,
            sliders: neutralStageSliders(ph === "STAGE_2_CONFIG" ? 2 : 3),
          };
          next.notifications = pushNote(
            next,
            `Stage complete. Configure Stage ${ph === "STAGE_2_CONFIG" ? 2 : 3}.`,
            "info",
          );
        } else if (ph === "POLISHING") {
          next.notifications = pushNote(
            next,
            "Stage 3 complete — polish, then Pre-Release when release-ready.",
            "good",
          );
        }
      }
      if (next.currentProject.devPhase === "READY_TO_RELEASE") {
        next.speed = 0;
        next.notifications = pushNote(
          next,
          "Build is release-ready. Set title & price, then Release.",
          "good",
        );
      }
    }

    // Residual sales — weekly_v3 live calc or legacy plan queue
    next = tickReleasedSales(next, (s, text, tone) => pushNote(s, text, tone));
    // sync notifications if tickReleasedSales returned new array via pushNote pattern
    // tickReleasedSales mutates via spread; re-read still needed

    if (USE_MARKET_V2 && next.market) {
      const tick = tickMarket({
        market: next.market,
        week: next.week,
        year: next.year,
        campaignSeed: next.campaignSeed,
        playerGamesOnSale: next.activeSales,
      });
      next.market = tick.market;
      for (const note of tick.notifications) {
        next.notifications = pushNote(next, note, "info");
      }
    }

    // Contracts progress
    if (next.activeContract) {
      const c = { ...next.activeContract, progress: next.activeContract.progress + 1 };
      if (c.progress >= c.weeks) {
        next.cash += c.reward;
        next.researchPoints += c.researchReward;
        next.notifications = pushNote(next, `Contract complete: +${formatCash(c.reward)}`, "good");
        next.activeContract = null;
        next.contracts = generateContracts(3, next.year);
      } else {
        next.activeContract = c;
      }
    } else if (next.week % 8 === 0 && (next.unlocks.contracts === "owned" || next.flags.contracts)) {
      next.contracts = generateContracts(3, next.year);
    }

    next = tryFireEvent(next);
    next.hype = Math.max(0, next.hype * 0.98);

    if (
      !next.settings.disableBankruptcy &&
      next.cash < -5000 &&
      !next.currentProject &&
      next.activeSales.length === 0
    ) {
      next.phase = "gameover";
      next.speed = 0;
      next.notifications = pushNote(next, "Bankrupt. The studio shuts its doors.", "bad");
    }

    set(next);
    if (next.settings.autosave && Date.now() - lastSaveAt > 20000) {
      get().saveGame();
    }
  },

  startProject: (partial) => {
    const state = get();
    if (state.currentProject) return "Already developing a game.";
    if (!state.unlockedTopics.includes(partial.topicId)) return "Topic locked.";
    // Only unlocked topics (start 4 + researched) — full catalog progressive.
    if (!state.unlockedGenres.includes(partial.genreId)) return "Genre locked.";
    if (partial.genre2Id && state.unlocks.multi_genre !== "owned" && !state.flags.multiGenre) {
      return "Multi-genre locked.";
    }
    if (!state.unlockedPlatforms.includes(partial.platformId)) return "Platform not licensed.";
    const plat = PLATFORMS.find((x) => x.id === partial.platformId);
    if (!plat) return "Unknown platform.";
    if (plat.year > state.year) return "Platform not yet available.";
    const sizes = availableSizes(state.researched, state.unlocks, {
      office: state.office,
      staffCount: state.staff.length,
    });
    if (!sizes.includes(partial.size)) return "Game size locked — research it first.";
    const cost = SIZE_STATS[partial.size].cost + (partial.marketingSpend ?? 0);
    if (state.cash < cost) return `Need ${formatCash(cost)}.`;

    const engine = state.engines.find((e) => e.id === partial.engineId) ?? state.engines[0]!;
    const features = [...engine.features, ...(partial.features ?? [])];
    const sliders = neutralStageSliders(1);
    const projectSeed = hashSeed(
      state.campaignSeed,
      state.gamesPublished,
      partial.topicId,
      partial.genreId,
      partial.platformId,
      "project",
    );
    const project: GameProject = {
      id: `game_${projectSeed.toString(36)}`,
      title: partial.title || generateGameTitle(partial.topicId, partial.genreId),
      topicId: partial.topicId,
      genreId: partial.genreId,
      genre2Id: partial.genre2Id ?? null,
      platformId: partial.platformId,
      audience:
        state.unlocks.audience === "owned" || state.flags.audience
          ? partial.audience
          : "everyone",
      size: partial.size,
      engineId: engine.id,
      isSequel: partial.isSequel,
      sequelOf: partial.sequelOf,
      isExpansion: partial.isExpansion,
      stage: 1,
      stageProgress: 0,
      devPhase: "STAGE_1_CONFIG",
      stageConfigs: emptyStageConfigs(),
      sliders,
      designPoints: engine.designBonus,
      techPoints: engine.techBonus,
      researchEarned: 0,
      bugs: 0,
      hype: state.hype * 0.3,
      marketingSpend: partial.marketingSpend ?? 0,
      developmentCost: cost,
      weeksDev: 0,
      features,
      stageShareAccum: {},
      stageShareSamples: 0,
      rngSeed: projectSeed,
      launchPrice: defaultLaunchPrice(partial.size),
    };

    set({
      cash: state.cash - cost,
      currentProject: project,
      speed: 0,
      screen: "develop",
      modal: null,
      dirty: true,
      notifications: pushNote(
        state,
        `Project created: ${project.title}. Configure Stage 1 to begin.`,
        "info",
      ),
    });
    return null;
  },

  setSlider: (field, value) => {
    const p = get().currentProject;
    if (!p) return;
    if (
      p.devPhase !== "STAGE_1_CONFIG" &&
      p.devPhase !== "STAGE_2_CONFIG" &&
      p.devPhase !== "STAGE_3_CONFIG"
    ) {
      return;
    }
    set({
      currentProject: {
        ...p,
        sliders: { ...p.sliders, [field]: Math.round(value) },
      },
      dirty: true,
    });
  },

  confirmStage: () => {
    const state = get();
    const p = state.currentProject;
    if (!p) return "No project.";
    const phase = p.devPhase;
    let stageNum: 1 | 2 | 3 | null = null;
    if (phase === "STAGE_1_CONFIG") stageNum = 1;
    else if (phase === "STAGE_2_CONFIG") stageNum = 2;
    else if (phase === "STAGE_3_CONFIG") stageNum = 3;
    else return "Nothing to confirm.";

    const fields = STAGE_FIELDS[stageNum];
    const normalized = normalizeStageAllocations(fields, p.sliders);
    const withSliders = {
      ...p,
      sliders: { ...p.sliders, ...normalized } as Record<DevField, number>,
    };
    const day = weekToCampaignDay(state.week);
    const planned = applyPlanStage(
      withSliders,
      state.campaignSeed,
      day,
      stageNum,
    );
    if (planned.error) return planned.error;
    set({
      currentProject: planned.project,
      speed: 1,
      screen: "develop",
      dirty: true,
      notifications: pushNote(state, `Stage ${stageNum} started.`, "info"),
    });
    return null;
  },

  beginPolishRelease: () => {},

  workPolishWeek: () => {
    const state = get();
    const p = state.currentProject;
    if (!p) return "No project.";
    if (p.devPhase !== "POLISHING" && p.production?.phase !== "bug_fixing" && p.production?.phase !== "polish" && p.production?.phase !== "finalize_build") {
      return "Only available during polish / bug-fix.";
    }
    const w = state.week + 1;
    const d = weekToDate(w, START_YEAR);
    const day = weekToCampaignDay(state.week);
    const adv = advanceProductionWeek(p, {
      campaignSeed: state.campaignSeed,
      staff: state.staff,
      startDay: p.production?.asOfDay ?? day,
    });
    const next: GameState = {
      ...state,
      week: w,
      year: d.year,
      month: d.month,
      currentProject: adv.project,
      dirty: true,
    };
    if (adv.cashCost > 0) {
      next.cash -= adv.cashCost;
      next.ledger = applyLedger(next.ledger, {
        week: w,
        amount: -adv.cashCost,
        category: "development",
        label: `Polish/QA: ${p.title}`,
        gameId: p.id,
        ref: `polish-${p.id}-w${w}`,
      });
    }
    next.staff = next.staff.map((m) =>
      m.id === "founder" ? { ...m, energy: 100 } : m,
    );
    set(next);
    return null;
  },

  enterPreRelease: () => {
    const state = get();
    const p = state.currentProject;
    if (!p) return "No project.";
    // Allow entering pre-release from polish path; release still needs ready
    if (
      p.devPhase !== "POLISHING" &&
      p.devPhase !== "READY_TO_RELEASE" &&
      p.production?.phase !== "release_ready"
    ) {
      return "Finish development first.";
    }
    // If still polishing, try advance until ready or keep polishing
    let proj = p;
    if (proj.production && proj.production.phase !== "release_ready") {
      if (proj.production.phase === "finalize_build") {
        proj = {
          ...proj,
          production: finalizeBuild(proj.production),
          devPhase: "POLISHING",
        };
      }
      if (proj.production?.phase === "release_ready") {
        proj = { ...proj, devPhase: "READY_TO_RELEASE" };
      } else if (proj.production?.phase === "bug_fixing") {
        return "Fix remaining bugs (Work on bugs) before Pre-Release.";
      } else if (proj.production?.phase === "polish") {
        return "Keep polishing until the build is finalized.";
      }
    }
    set({
      currentProject: { ...proj, devPhase: "READY_TO_RELEASE" },
      speed: 0,
      dirty: true,
      notifications: pushNote(state, "Pre-Release: set final title and price.", "info"),
    });
    return null;
  },

  setLaunchPrice: (price) => {
    const p = get().currentProject;
    if (!p) return;
    if (p.devPhase !== "READY_TO_RELEASE" && p.devPhase !== "POLISHING") return;
    set({
      currentProject: { ...p, launchPrice: Math.max(5, Math.min(80, Math.round(price))) },
      dirty: true,
    });
  },

  setProjectTitle: (title) => {
    const p = get().currentProject;
    if (!p) return;
    if (p.devPhase !== "READY_TO_RELEASE" && p.devPhase !== "POLISHING") return;
    const t = title.trim().slice(0, 40);
    if (!t) return;
    set({ currentProject: { ...p, title: t }, dirty: true });
  },

  releaseGame: () => {
    const state = get();
    const p = state.currentProject;
    if (!p) return "No project.";
    if (state.releasedGames.some((g) => g.id === p.id)) {
      return "Already released.";
    }
    if (p.cancelled || p.production?.phase === "cancelled") {
      return "Cancelled projects cannot be released.";
    }
    if (p.production && p.production.phase !== "release_ready") {
      if (p.production.phase === "finalize_build") {
        /* allow releaseProject to finalize */
      } else if (p.production.phase === "bug_fixing" || p.production.phase === "polish") {
        return "Finish polish and bug-fix first.";
      }
    }
    if (p.devPhase === "POLISHING") {
      return "Enter Pre-Release first — set final title and price.";
    }
    if (p.devPhase !== "READY_TO_RELEASE") {
      return "Finish all stages first.";
    }
    if (!p.title.trim()) return "Set a final title.";
    if (!p.launchPrice) {
      p.launchPrice = defaultLaunchPrice(p.size);
    }
    const next = releaseProject({ ...state }, { ...p });
    set({
      ...next,
      dirty: true,
    });
    return null;
  },

  cancelProject: () => {
    const state = get();
    const p = state.currentProject;
    if (!p) return "No project.";
    if (p.production?.phase === "release_ready") {
      return "This project can no longer be cancelled.";
    }
    const cancelled = cancelProjectProduction(p);
    const knowledge = applyCancelKnowledge(state.knowledge, {
      projectId: p.id,
      topicId: p.topicId,
      genreId: p.genreId,
      weeksDev: p.weeksDev,
      week: state.week,
    });
    set({
      currentProject: null,
      knowledge,
      speed: 0,
      screen: "studio",
      dirty: true,
      notifications: pushNote(
        state,
        `Cancelled "${p.title}". No reviews or sales. Lessons kept.`,
        "warn",
      ),
    });
    void cancelled;
    return null;
  },

  autoBalanceSliders: () => {
    const state = get();
    if (state.settings.infoMode === "classic") return;
    const p = state.currentProject;
    if (!p) return;
    if (
      p.devPhase !== "STAGE_1_CONFIG" &&
      p.devPhase !== "STAGE_2_CONFIG" &&
      p.devPhase !== "STAGE_3_CONFIG"
    ) {
      return;
    }
    const stage =
      p.devPhase === "STAGE_1_CONFIG" ? 1 : p.devPhase === "STAGE_2_CONFIG" ? 2 : 3;
    const sliders = { ...p.sliders };
    const focus = getGenre(p.genreId).stageFocus[stage];
    for (const f of STAGE_FIELDS[stage]) sliders[f] = 40;
    for (const f of focus) {
      if (STAGE_FIELDS[stage].includes(f)) sliders[f] = 85;
    }
    set({ currentProject: { ...p, sliders }, dirty: true });
  },

  startResearch: (id, kind = "tech") => {
    const state = get();
    if (state.activeResearch) return "Research already in progress.";
    if (kind === "topic") {
      const topic = TOPICS.find((t) => t.id === id);
      if (!topic) return "Unknown topic.";
      if (state.unlockedTopics.includes(id)) return "Already unlocked.";
      // Full 132-topic catalog is progressive: any topic may be researched once visible.
      if (state.researchPoints < topic.researchCost) return "Not enough RP.";
      const weeks = 2;
      set({
        researchPoints: state.researchPoints - topic.researchCost,
        activeResearch: {
          id: uid("job"),
          kind: "topic",
          targetId: id,
          name: topic.name,
          weeksLeft: weeks,
          totalWeeks: weeks,
        },
        dirty: true,
        notifications: pushNote(state, `Researching topic: ${topic.name} (${weeks}w)`, "info"),
      });
      return null;
    }
    const item = RESEARCH.find((r) => r.id === id);
    if (!item) return "Unknown research.";
    if (state.researched.includes(id)) return "Already researched.";
    if (item.requires?.some((r) => !state.researched.includes(r))) return "Missing prerequisites.";
    if (state.researchPoints < item.cost) return "Not enough RP.";
    const weeks = item.weeks ?? Math.max(2, Math.ceil(item.cost / 25));
    set({
      researchPoints: state.researchPoints - item.cost,
      activeResearch: {
        id: uid("job"),
        kind: "tech",
        targetId: id,
        name: item.name,
        weeksLeft: weeks,
        totalWeeks: weeks,
      },
      dirty: true,
      notifications: pushNote(state, `Researching: ${item.name} (${weeks}w)`, "info"),
    });
    return null;
  },

  researchItem: (id) => get().startResearch(id, "tech"),
  researchTopic: (id) => get().startResearch(id, "topic"),

  hireStaff: (candidate) => {
    const state = get();
    if (state.unlocks.hiring !== "owned" && state.office < 2) return "Hiring locked.";
    const cap = OFFICE_INFO[state.office].capacity;
    if (state.staff.length >= cap) return "No desk space.";
    if (state.cash < candidate.salary * 2) return "Need cash for signing.";
    set({
      cash: state.cash - candidate.salary,
      staff: [...state.staff, { ...candidate, energy: 100 }],
      dirty: true,
      notifications: pushNote(state, `Hired ${candidate.name}.`, "good"),
    });
    return null;
  },

  fireStaff: (id) => {
    if (id === "founder") return;
    const state = get();
    set({
      staff: state.staff.filter((m) => m.id !== id),
      dirty: true,
    });
  },

  refreshCandidates: () => {
    candidatesCache = Array.from({ length: 4 }, () => generateStaff(1 + Math.random()));
    return candidatesCache;
  },
  getCandidates: () => {
    if (!candidatesCache.length) candidatesCache = Array.from({ length: 4 }, () => generateStaff(1));
    return candidatesCache;
  },

  licensePlatform: (id) => {
    const state = get();
    if (state.unlockedPlatforms.includes(id)) return "Already licensed.";
    const plat = getPlatform(id);
    if (!plat) return "Unknown platform.";
    if (state.year < plat.year) return "Not released yet.";
    if (state.cash < plat.licenseCost) return `Need ${formatCash(plat.licenseCost)}.`;
    set({
      cash: state.cash - plat.licenseCost,
      unlockedPlatforms: [...state.unlockedPlatforms, id],
      dirty: true,
      notifications: pushNote(state, `Licensed ${plat.name}.`, "good"),
    });
    return null;
  },

  upgradeOffice: () => {
    const state = get();
    const info = OFFICE_INFO[state.office];
    if (state.office >= 4) return "Already max office.";
    // Garage → Small Office requires fans, releases, cash, and move cost.
    if (state.office === 1) {
      const fansNeed = info.fanRequirement ?? 25000;
      const gamesNeed = info.gamesRequirement ?? 3;
      const cashNeed = info.cashRequirement ?? 300000;
      if (state.fans < fansNeed) return `Need ${fansNeed.toLocaleString()} fans (have ${state.fans.toLocaleString()}).`;
      if (state.gamesPublished < gamesNeed) return `Need ${gamesNeed} released games.`;
      if (state.cash < cashNeed) return `Need ${formatCash(cashNeed)} on hand.`;
    }
    if (state.cash < info.upgradeCost) return `Need ${formatCash(info.upgradeCost)} for the move.`;
    const nextOffice = (state.office + 1) as 1 | 2 | 3 | 4;
    let next: GameState = {
      ...state,
      cash: state.cash - info.upgradeCost,
      office: nextOffice,
      dirty: true,
      notifications: pushNote(
        state,
        nextOffice === 2
          ? `Moved into ${OFFICE_INFO[nextOffice].name}. Garage phase complete — staff systems unlock later.`
          : `Moved to ${OFFICE_INFO[nextOffice].name}.`,
        "good",
      ),
    };
    next = applyUnlockNotes(next);
    set(next);
    return null;
  },

  buildEngine: (name, featureIds) => {
    const state = get();
    if (state.unlocks.engines !== "owned" && state.gamesPublished < 3) {
      return "Engines locked.";
    }
    if (pendingEngine) return "Already building an engine.";
    const cost = 15000 + featureIds.length * 5000;
    if (state.cash < cost) return `Need ${formatCash(cost)}.`;
    pendingEngine = {
      id: uid("eng"),
      name: name.trim() || "Custom Engine",
      features: featureIds,
      designBonus: featureIds.length * 2,
      techBonus: featureIds.length * 3,
      cost,
      weeks: 4 + featureIds.length,
      custom: true,
    };
    engineBuildWeeks = pendingEngine.weeks;
    set({
      cash: state.cash - cost,
      dirty: true,
      notifications: pushNote(state, `Building ${pendingEngine.name} (${engineBuildWeeks}w)…`, "info"),
    });
    return null;
  },

  takeContract: (id) => {
    const state = get();
    if (state.unlocks.contracts !== "owned" && !state.flags.contracts) {
      return "Contracts not unlocked.";
    }
    if (state.activeContract) return "Already on a contract.";
    const c = state.contracts.find((x) => x.id === id);
    if (!c) return "Unknown contract.";
    set({
      activeContract: { ...c, active: true, progress: 0 },
      dirty: true,
      notifications: pushNote(state, `Accepted contract: ${c.title}`, "info"),
    });
    return null;
  },

  dismissNotifications: () => set({ notifications: [] }),
  markNotificationsRead: () => {
    const state = get();
    if (!state.notifications.some((n) => !n.read)) return;
    set({
      notifications: state.notifications.map((n) =>
        n.read ? n : { ...n, read: true },
      ),
    });
  },
  selectGame: (id) => set({ selectedGameId: id }),

  completeReport: (id) => {
    const state = get();
    const g = state.releasedGames.find((x) => x.id === id);
    if (!g) return;
    if (g.reportDone) {
      set({ modal: "report", selectedGameId: id });
      return;
    }
    if (state.unlocks.reports !== "owned" && state.gamesPublished < 1) return;
    const { knowledge, newEntries, rpBonus } = applyReportKnowledge(
      state.knowledge,
      g,
      state.week,
    );
    // Freeze knowledge keys on outcome trace
    const releasedGames = state.releasedGames.map((x) => {
      if (x.id !== id) return x;
      const trace = x.outcomeTrace
        ? { ...x.outcomeTrace, knowledgeKeys: newEntries.map((e) => e.key) }
        : x.outcomeTrace;
      return { ...x, reportDone: true, outcomeTrace: trace };
    });
    set({
      releasedGames,
      knowledge,
      researchPoints: state.researchPoints + rpBonus,
      dirty: true,
      modal: "report",
      selectedGameId: id,
      notifications: pushNote(
        state,
        `Report filed for ${g.title}. ${newEntries.length} insight(s), +${rpBonus} RP.`,
        "good",
      ),
    });
  },

  startTitleCampaign: (gameId, campaignId) => {
    const state = get();
    const g = state.releasedGames.find((x) => x.id === gameId);
    if (!g) return "Game not found.";
    if (g.delisted || g.dormant) return "Title is not actively marketable.";
    const spec = getCampaignSpec(campaignId);
    if (!spec) return "Unknown campaign.";
    const unlocked =
      state.unlocks.marketing === "owned" ||
      state.flags.marketing ||
      state.researched.includes("marketing") ||
      (spec.requiredGate === "marketing" && state.gamesPublished >= 1) ||
      (spec.requiredGate === "advanced_marketing" &&
        (state.unlocks.advanced_marketing === "owned" || state.office >= 2));
    const garageOk = campaignId === "flyer_run" && state.gamesPublished >= 1;
    if (!unlocked && !garageOk) {
      return "Marketing locked — research Marketing 101 or ship a game first.";
    }
    const day = g.marketDays ?? g.weeksOnMarket * 7;
    let mkt = g.marketingState ?? emptyMarketingState(g.id, day);
    if (mkt.asOfDay < day) {
      mkt = advanceMarketing(mkt, day).state;
    } else if (mkt.asOfDay > day) {
      mkt = { ...mkt, asOfDay: day };
    }
    try {
      const result = startMarketingCampaign(mkt, spec, {
        currentDay: day,
        currentPhase: "released",
        cashAvailable: state.cash,
        unlocked: true,
      });
      const cash = state.cash + result.cashDelta;
      const ledger = applyLedger(state.ledger, {
        week: state.week,
        amount: result.cashDelta,
        category: "marketing",
        label: `${spec.name} on ${g.title}`,
        gameId: g.id,
        ref: `mkt-${result.event.campaignInstanceId}`,
      });
      const patch = {
        marketingState: result.state,
        marketingSpend: g.marketingSpend + spec.cost,
      };
      set({
        cash,
        ledger,
        releasedGames: state.releasedGames.map((x) =>
          x.id === gameId ? { ...x, ...patch } : x,
        ),
        activeSales: state.activeSales.map((x) =>
          x.id === gameId ? { ...x, ...patch } : x,
        ),
        dirty: true,
        notifications: pushNote(
          state,
          `Started ${spec.name} on "${g.title}" (−$${spec.cost.toLocaleString()}).`,
          "info",
        ),
      });
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Could not start campaign.";
    }
  },

  applyCheat: (cheat, arg) => {
    const state = get();
    let next: GameState = {
      ...state,
      cheatsEnabled: true,
      dirty: true,
    };
    switch (cheat) {
      case "cash":
      case "cash_100k":
        next.cash += Number(arg) || 100_000;
        next.ledger = applyLedger(next.ledger, {
          week: next.week,
          amount: Number(arg) || 100_000,
          category: "cheat",
          label: "Cheat cash",
          ref: `cheat-cash-${next.week}-${Date.now()}`,
        });
        break;
      case "cash_10k":
        next.cash += 10_000;
        next.ledger = applyLedger(next.ledger, {
          week: next.week,
          amount: 10_000,
          category: "cheat",
          label: "Cheat +10k",
          ref: `cheat-10k-${next.week}-${Date.now()}`,
        });
        break;
      case "cash_1m":
        next.cash += 1_000_000;
        next.ledger = applyLedger(next.ledger, {
          week: next.week,
          amount: 1_000_000,
          category: "cheat",
          label: "Cheat +1M",
          ref: `cheat-1m-${next.week}-${Date.now()}`,
        });
        break;
      case "fans":
        next.fans += Number(arg) || 10000;
        break;
      case "rp":
        next.researchPoints += Number(arg) || 50;
        break;
      case "bugs":
        if (next.currentProject) next.currentProject = { ...next.currentProject, bugs: 0 };
        break;
      case "energy":
        next.staff = next.staff.map((m) => ({ ...m, energy: 100 }));
        break;
      case "finish_research":
        if (next.activeResearch) {
          const job = next.activeResearch;
          if (job.kind === "tech") next.researched = [...next.researched, job.targetId];
          else if (!next.unlockedTopics.includes(job.targetId)) {
            next.unlockedTopics = [...next.unlockedTopics, job.targetId];
          }
          next.activeResearch = null;
        }
        break;
      case "toggle_perfect_score":
        next.settings = {
          ...next.settings,
          forcePerfectScore: !next.settings.forcePerfectScore,
          forceBadScore: false,
        };
        break;
      case "toggle_bad_score":
        next.settings = {
          ...next.settings,
          forceBadScore: !next.settings.forceBadScore,
          forcePerfectScore: false,
        };
        break;
      case "office_ready":
        next.fans = Math.max(next.fans, 25_000);
        next.cash = Math.max(next.cash, 1_000_000);
        next.gamesPublished = Math.max(next.gamesPublished, 5);
        next.week = Math.max(next.week, 84);
        {
          const d = weekToDate(next.week, START_YEAR);
          next.year = d.year;
          next.month = d.month;
        }
        break;
      case "sequels":
        next.flags = { ...next.flags, sequels: true };
        next.unlocks = { ...next.unlocks, sequels: "owned" };
        break;
      case "unlock_era":
      case "unlock_all":
        next.unlockedTopics = TOPICS.map((t) => t.id);
        next.unlockedGenres = [
          "action",
          "adventure",
          "rpg",
          "simulation",
          "strategy",
          "casual",
        ] as GenreId[];
        next.unlockedPlatforms = PLATFORMS.filter(
          (p) => !next.garageSlice || isGaragePlatform(p.id),
        ).map((p) => p.id);
        next.researched = RESEARCH.map((r) => r.id);
        next.flags = {
          multiGenre: true,
          sequels: true,
          expansions: true,
          marketing: true,
          contracts: true,
          audience: true,
          rndLab: true,
          hardwareLab: true,
        };
        for (const k of Object.keys(next.unlocks)) next.unlocks[k] = "owned";
        break;
      case "no_bankruptcy":
        next.settings = { ...next.settings, disableBankruptcy: true };
        break;
      case "advance_time": {
        const weeks = Number(arg) || 48;
        for (let i = 0; i < weeks; i++) {
          set(next);
          get().tick();
          next = get();
        }
        return;
      }
      case "unlock_topic":
        if (typeof arg === "string" && !next.unlockedTopics.includes(arg)) {
          next.unlockedTopics = [...next.unlockedTopics, arg];
        }
        break;
      case "unlock_tech":
        if (typeof arg === "string" && !next.researched.includes(arg)) {
          next.researched = [...next.researched, arg];
        }
        break;
      default:
        break;
    }
    set(next);
  },

  exportSave: () => {
    const state = get();
    return JSON.stringify({ ...state, modal: null, speed: 0, version: SAVE_VERSION });
  },

  importSave: (raw) => {
    try {
      const data = parseSaveCandidate(raw);
      if (!data) return false;
      localStorage.setItem(SAVE_KEY, raw);
      return get().loadGame();
    } catch {
      return false;
    }
  },
}));
