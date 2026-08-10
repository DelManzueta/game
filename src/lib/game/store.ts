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
  MAX_HIRE_BUDGET,
  STAGE_FIELDS,
  START_YEAR,
  TOPICS,
  defaultSliders,
  getGenre,
  getPlatform,
} from "./data";
import { startingEngineFeatures } from "./content/engines";
import {
  createGarageWorkshop,
  startEngineBuild,
  tickEngineBuild,
  ensureWorkshopFromEngines,
  versionToEngineDef,
  captureGameEngineSnapshot,
  SELECTABLE_MODULES,
  type EngineWorkshopState,
  type EnginePurpose,
  type ArchitectureStyle,
  type TargetLifespan,
} from "./engine";
import {
  createProjectTechSpec,
  refreshProjectProfile,
  classifyAllBugs,
  evaluateReleaseReadiness,
  applyOptimizationWeek,
  applyTechnicalReviewToScore,
  type ProjectTechSpec,
} from "./optimization";
import {
  seedGarageTechPipeline,
  tickResearchPipeline,
  beginTechResearch,
  syncLegacyResearched,
  recordCommercialUse,
  tryMarkResearchable,
  observeTech,
  getTech,
  computeEffectiveImportance,
  createProductPricing,
  lockPricingAtRelease,
  getDifficulty,
  applyStartingCash,
  maybeSpawnDecisionEvent,
  type DifficultyPreset,
  type ProjectPillar,
  type ResearchPipelineState,
  TECH_CATALOG,
} from "./research";
import { createHardwareProject, type HardwarePurpose } from "./hardware";
import {
  evaluateProgression,
  initialUnlocks,
  migrateUnlocks,
} from "./progression/service";
import {
  createStudioProgression,
  migrateStudioProgression,
  tickOfficeOffers,
  tickActiveMove,
  tickTenure,
  acceptFirstOfficeMove,
  deferFirstOfficeOffer,
  firstOfficeOfferView,
  isFeatureEnabled,
} from "./progression";
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
import {
  applyReleaseExperience,
  applyDevWeekExperience,
  INITIAL_TARGET_HIGH_SCORE,
  USE_ALGORITHM_V2,
  generateWeekPoints,
} from "./scoring";
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
  evaluatePublisherDeal,
  tickPublishingBoard,
  refreshPublishingBoard,
  generatePublishingBoard,
  publishingUnlocked,
  type PublishingDeal,
} from "./commercial/publishing";
import {
  classicComboMultiplier,
  classicReviewScore,
  classicUnitsSold,
  classicFansFromRelease,
  sliderDeviation,
  CLASSIC_INITIAL_HISTORICAL,
} from "./classicGdt";
import {
  runAllocationEngine,
  staffPoolStats,
  FEATURE_INJECTION_DB,
} from "./gdtAllocation";
import {
  applyWeeklyFatigue,
  weeklyOutputModifier,
  settlePublisherContract,
  availablePublisherOffers,
  techDebtPenaltyMultiplier,
  techDebtPenaltyPercent,
  ENGINE_REFACTOR,
  PUBLISHER_MATRIX,
  type PublisherOffer,
} from "./tycoonOps34";
import {
  ACCESSORY_CATEGORIES,
  createHardwareProduct,
  processHardwareWeek,
  processHardwareWeekWithFab,
  createWorkbenchProduct,
  setupCostCheck,
  type AccessoryCategoryId,
  type HardwareProduct,
} from "./hardwareMerch";
import {
  FRANCHISE_LICENSES,
  STREAMER_TIERS,
  purchaseLicense,
  streamerHypeGain,
  canHostConvention,
  conventionOutcome,
  ipShipModifiers,
  applyIpRoyalty,
  streamerHypeDecay,
  emptyIp,
  type ConventionFocus,
} from "./netflixEdition";
import {
  consoleLaunchWeekUnits,
  getReviewerQuotes,
  processMmoMonth,
  rollQualityCrisis,
  type MmoRuntime,
} from "./hardcoreEngines";
import {
  NEON_STORE,
  emptyStorefront,
  canLaunchStorefront,
  monthlyPlatformRoyalties,
  playerStoreKeepRate,
  titleLooksInfringing,
  rollInfringementLitigation,
  BUILTIN_PACKS,
  installPack,
  type ContentPack,
} from "./digitalStorefront";
import {
  isGaragePhaseOne,
  lateSystemAllowed,
  PHASE_ONE_MARKETING_PER_YEAR,
  marketingYearIndex,
} from "./phaseOne";
import {
  emptyMarketingOpportunityState,
  ensureYearOpportunities,
  resolveMarketingOpportunity,
} from "./marketingOpportunities";
import { applyCashTransaction, moneyRound } from "./finance/transaction";
import {
  canAdvanceOffice,
  normalizeOfficeLevel,
  stageForOffice,
  sizesForOffice,
  PROGRESSION_STAGES,
} from "./progressionStages";
import {
  HIGH_DENSITY,
  canOfferHighDensity,
  isHighDensity,
  clutterTax,
  staffCapForOffice,
  RECRUIT,
  BENCH_CATEGORIES,
  type BenchCategoryId,
} from "./officeWorkbench";

import { tycoonHypeDecay, tycoonStaffEnergyTick, TYCOON_DEFAULTS } from "./tycoonEngine";
import {
  competitorRelease,
  rollDevelopmentCrisis,
  combinedMarketShare,
  multiPlatformTimePenaltyWeeks,
  CRUNCH,
  RIVAL_GENRE_SATURATION,
  buildSaveMatrix,
  TYCOON_EXTENDED_VERSION,
} from "./tycoonExtended";
import {
  isAwardsNight,
  resolveAnnualAwards,
  applyPatchMath,
  canPatchTitle,
  canBuildDlc,
  dlcUnitsSold,
  DLC,
  PATCH,
  HARDWARE_TIERS,
  HARDWARE_UNLOCK,
  FIRST_PARTY_SYNERGY,
  startConsoleDev,
  tickPlayerConsole,
  hardwareUnlocked,
  type HardwareTierId,
  type EligibleTitle,
} from "./tycoonLateMarket";
import {
  processShipmentPiracy,
  clampHistoricalAverage,
  intCash,
  intFans,
  isBankrupt,
  DRM_TIERS,
  type DrmTier,
  HISTORICAL_AVERAGE_FLOOR,
} from "./tycoonPiracy";
import {
  rollLitigation,
  ILLICIT_TECH_BOOST,
  buildPostMortem,
  insightMultiplier,
  POST_MORTEM,
  consoleRdCost,
  MEDIA_DRIVES,
  GPU_PARTS,
  type MediaDriveId,
  type GpuPartId,
  type PostMortemRecord,
} from "./tycoonRiskAnalytics";
import {
  T_ENGINE,
  applyTEngineBugMitigation,
  tEngineReviewBonus,
  genreExpMultiplier,
  incrementGenreExp,
  genreLevel,
  buildHistoryEntry,
  formatTelemetryBlock,
  parseCheatCommand,
  type GameHistoryEntry,
} from "./workshopMods";
import {
  startMarketingCampaign,
  getCampaignSpec,
  emptyMarketingState,
  studioCampaignHype,
  advanceMarketing,
} from "./commercial/marketing";
import { applyLedger, emptyLedger } from "./finance/ledger";
import {
  computeWeeklyLearnByDoing,
  flushResearchPoints,
  releaseRpSpike,
} from "./commercial/rp";
import {
  TRAINING_COURSES,
  getTrainingCourse,
  startTrainingOnMember,
  tickStaffTraining,
} from "./training";
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
  ReleasedGame,
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
  return createGarageWorkshop({
    companyId: "player",
    week: 0,
    year: START_YEAR,
  }).engineDef;
}

function garageWorkshop(): EngineWorkshopState {
  return createGarageWorkshop({
    companyId: "player",
    week: 0,
    year: START_YEAR,
  }).workshop;
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
  opts?: { office?: number; staffCount?: number; officeSubTier?: number },
): GameSize[] {
  const office = opts?.office ?? 1;
  const staffCount = opts?.staffCount ?? 1;
  // Foundation Lock: Garage (office 1) is small games only.
  if (office <= 1) return ["small"];
  const byOffice = new Set(sizesForOffice(office));
  const sizes: GameSize[] = ["small"];
  if (
    byOffice.has("medium") &&
    (researched.includes("medium_games") ||
      unlocks.medium_games === "owned" ||
      office >= 2) &&
    staffCount >= 1
  ) {
    sizes.push("medium");
  }
  // High-Density early large is quarantined from Phase One product surface.
  if (
    byOffice.has("large") &&
    (researched.includes("large_games") || unlocks.large_games === "owned") &&
    staffCount >= 2
  ) {
    sizes.push("large");
  }
  if (
    byOffice.has("aaa") &&
    (researched.includes("aaa_games") || unlocks.aaa === "owned") &&
    staffCount >= 3
  ) {
    sizes.push("aaa");
  }
  return sizes;
}


function countMarketingInYear(state: GameState, yearIndex: number): number {
  return (state.ledger?.entries ?? []).filter(
    (e) =>
      e.category === "marketing" &&
      marketingYearIndex(e.week) === yearIndex &&
      e.amount < 0,
  ).length;
}

/** Garage Phase One: ≤2 marketing spends/year; year after a 2-spend year is closed. */
function canPurchaseMarketing(state: GameState): string | null {
  if (!isGaragePhaseOne(state)) return null;
  const y = marketingYearIndex(state.week);
  if (countMarketingInYear(state, y - 1) >= PHASE_ONE_MARKETING_PER_YEAR) {
    return "Marketing dark year — last year used both opportunities.";
  }
  if (countMarketingInYear(state, y) >= PHASE_ONE_MARKETING_PER_YEAR) {
    return "Already used both marketing opportunities this year.";
  }
  return null;
}


/** Apply cash+ledger atomically on a draft state. */
function commitTxn(
  next: GameState,
  entry: {
    week: number;
    amount: number;
    category: import("./finance/ledger").LedgerCategory;
    label: string;
    ref: string;
    gameId?: string;
  },
): GameState {
  const txn = applyCashTransaction(next.cash, next.ledger, entry);
  if (!txn.applied) return next;
  return { ...next, cash: txn.cash, ledger: txn.ledger };
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
    cash: TYCOON_DEFAULTS.cash,
    fans: 0,
    researchPoints: 0,
    researchPipeline: seedGarageTechPipeline(START_YEAR),
    difficulty: getDifficulty("standard"),
    hardwareProjects: [],
    hype: 0,
    office: 1,
    speed: 1,
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
      noBugsMode: false,
      fastResearchMode: false,
      showAllHints: false,
      noVacationMode: false,
    },
    unlockedTopics: [...GARAGE_START_TOPICS],
    unlockedGenres: [...GARAGE_START_GENRES],
    unlockedPlatforms: [...GARAGE_START_PLATFORMS],
    researched: [],
    unlocks: initialUnlocks(),
    engines: [baseEngine()],
    engineWorkshop: garageWorkshop(),
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
    targetHighScore: CLASSIC_INITIAL_HISTORICAL,
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
    cheatLog: [],
    dirty: false,
    lastSavedWeek: 0,
    campaignSeed: 1,
    market: null,
    knowledge: emptyKnowledge(),
    garageSlice: true,
    publishingBoard: null,
    activePublisherDealId: null,
    unlockedDrm: ["None"],
    postMortems: [],
    genreExp: { action: 0, adventure: 0, rpg: 0, simulation: 0, strategy: 0, casual: 0 },
    gameHistoryLedger: [],
    hardwareProducts: [],
    hiringBoard: null,
    hiringBoardRefresh: 0,
    officeReminderYears: {},
    officeEnteredYear: START_YEAR,
    officeEnteredMonth: 1,
    officeSubTier: 2.0,
    activeIpLicense: emptyIp(),
    streamerHypeWeeksLeft: 0,
    ipRoyaltyGameIds: [],
    activeMmos: [],
    digitalStorefront: emptyStorefront(),
    marketingOpportunities: undefined,
    installedPacks: [],
    infringementDue: [],
    knownCombos: {},
    playerConsoles: [],
    lastAwardsYear: 0,
    lastRivalReleaseWeek: 0,
    rivalRotateIndex: 0,
    rivalGenrePressure: {},
    researchPointsFrac: 0,
    seriesRecords: {},
    ledger: emptyLedger(TYCOON_DEFAULTS.cash),
    progression: createStudioProgression("classic_35"),
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

type EventDef = {
  key: string;
  title: string;
  body: string;
  cd: number;
  choices: Array<{
    label: string;
    effect: string;
    apply: (s: GameState) => void;
  }>;
};

const EVENT_POOL: EventDef[] = [
  {
    key: "trade_mag",
    title: "Trade magazine",
    body: "A trade magazine is compiling an indie studio feature. How do you respond?",
    cd: 40,
    choices: [
      { label: "Full press kit + interview", effect: "−$1,200 · +hype · +fans", apply: (s) => { s.hype += 14; s.fans += 40; s.cash -= 1200; } },
      { label: "Send a press kit", effect: "−$500 · +hype", apply: (s) => { s.hype += 10; s.cash -= 500; } },
      { label: "One-paragraph blurb only", effect: "+small hype free", apply: (s) => { s.hype += 5; } },
      { label: "Stay quiet", effect: "tiny organic buzz", apply: (s) => { s.hype += 2; } },
      { label: "Trade favor for coverage", effect: "−RP · +hype", apply: (s) => { s.researchPoints = Math.max(0, s.researchPoints - 3); s.hype += 11; } },
    ],
  },
  {
    key: "hardware_short",
    title: "Hardware shortage",
    body: "Component prices spike industry-wide. Absorb the cost or adapt?",
    cd: 52,
    choices: [
      { label: "Pay full premium", effect: "−$3,000 · keep pace", apply: (s) => { s.cash -= 3000; } },
      { label: "Buy refurbished parts", effect: "−$1,200 · slight delay risk", apply: (s) => { s.cash -= 1200; s.hype = Math.max(0, s.hype - 1); } },
      { label: "Wait it out", effect: "−hype, save cash", apply: (s) => { s.hype = Math.max(0, s.hype - 4); } },
      { label: "Crowdsource spares", effect: "−$400 · +fans", apply: (s) => { s.cash -= 400; s.fans += 50; } },
      { label: "Redesign around shortage", effect: "+RP effort · −cash small", apply: (s) => { s.cash -= 600; s.researchPoints += 4; } },
    ],
  },
  {
    key: "fan_club",
    title: "Fan club forms",
    body: "Enthusiasts want to organize around your last title.",
    cd: 44,
    choices: [
      { label: "Sponsor them fully", effect: "−$1,000 · +fans · +hype", apply: (s) => { s.fans += 280; s.cash -= 1000; s.hype += 6; } },
      { label: "Seed a starter kit", effect: "−$350 · +fans", apply: (s) => { s.fans += 150; s.cash -= 350; } },
      { label: "Send merch files only", effect: "+fans free", apply: (s) => { s.fans += 90; } },
      { label: "Host a Q&A night", effect: "−$200 · +hype · +RP", apply: (s) => { s.cash -= 200; s.hype += 5; s.researchPoints += 2; s.fans += 60; } },
      { label: "Ignore politely", effect: "no change", apply: () => {} },
    ],
  },
  {
    key: "dev_meetup",
    title: "Dev meetup",
    body: "Local developers invite you to share tips — or stay heads-down shipping.",
    cd: 36,
    choices: [
      { label: "Keynote the night", effect: "+RP · +hype · −$150", apply: (s) => { s.researchPoints += 8; s.hype += 6; s.cash -= 150; } },
      { label: "Speak & network", effect: "+RP · +hype", apply: (s) => { s.researchPoints += 6; s.hype += 4; } },
      { label: "Send a short talk tape", effect: "+small RP", apply: (s) => { s.researchPoints += 3; } },
      { label: "Skip — ship instead", effect: "focus · tiny RP", apply: (s) => { s.researchPoints += 1; } },
      { label: "Hire a recruiter booth", effect: "−$900 · future hire bias", apply: (s) => { s.cash -= 900; s.hype += 3; s.researchPoints += 2; } },
    ],
  },
  {
    key: "magazine_ad_offer",
    title: "Magazine ad slot",
    body: "A leftover ad page is available at a discount this week only.",
    cd: 48,
    choices: [
      { label: "Buy the full page", effect: "−$4,000 · +hype", apply: (s) => { s.cash -= 4000; s.hype += 14; } },
      { label: "Split a half page", effect: "−$2,200 · +hype", apply: (s) => { s.cash -= 2200; s.hype += 9; } },
      { label: "Classifieds only", effect: "−$600 · +small hype", apply: (s) => { s.cash -= 600; s.hype += 4; } },
      { label: "Trade a review copy", effect: "−0 cash · +hype · +RP risk", apply: (s) => { s.hype += 7; s.researchPoints += 1; } },
      { label: "Pass", effect: "no change", apply: () => {} },
    ],
  },
  {
    key: "bb_reviewer",
    title: "Bulletin board reviewer",
    body: "A popular sysop offers to feature your next game — for a favor.",
    cd: 42,
    choices: [
      { label: "Pay for a banner week", effect: "−$1,800 · +hype · +fans", apply: (s) => { s.cash -= 1800; s.hype += 12; s.fans += 80; } },
      { label: "Offer exclusive demo", effect: "+hype · +fans free", apply: (s) => { s.hype += 8; s.fans += 55; } },
      { label: "Co-write a tip sheet", effect: "+RP · +small hype", apply: (s) => { s.researchPoints += 5; s.hype += 4; } },
      { label: "Decline", effect: "no change", apply: () => {} },
      { label: "Counter with interview", effect: "−$400 · +hype", apply: (s) => { s.cash -= 400; s.hype += 9; } },
    ],
  },
  {
    key: "power_outage",
    title: "Neighborhood outage",
    body: "Storms knock power for half the week. How do you adapt?",
    cd: 60,
    choices: [
      { label: "Rent a generator", effect: "−$900 · keep working", apply: (s) => { s.cash -= 900; } },
      { label: "Work from a cafe", effect: "−$120 · +tiny hype", apply: (s) => { s.cash -= 120; s.hype += 2; } },
      { label: "Take a forced rest", effect: "+RP reflection · −hype", apply: (s) => { s.researchPoints += 3; s.hype = Math.max(0, s.hype - 2); } },
      { label: "Paper design only", effect: "+design focus · free", apply: (s) => { s.researchPoints += 2; } },
      { label: "Ignore and lose time", effect: "no cash · −small hype", apply: (s) => { s.hype = Math.max(0, s.hype - 3); } },
    ],
  },
  {
    key: "angel_call",
    title: "Curious angel investor",
    body: "Someone with deep pockets wants a chat about “optional” capital.",
    cd: 70,
    choices: [
      { label: "Take a small note", effect: "+$12,000 · −future freedom feel", apply: (s) => { s.cash += 12000; s.hype += 2; } },
      { label: "Ask for advice only", effect: "+RP · free", apply: (s) => { s.researchPoints += 6; } },
      { label: "Pitch hard for more", effect: "50/50 vibe · +$6k · +hype", apply: (s) => { s.cash += 6000; s.hype += 5; } },
      { label: "Politely pass", effect: "independence", apply: () => {} },
      { label: "Show a prototype", effect: "−$300 · +hype · +RP", apply: (s) => { s.cash -= 300; s.hype += 7; s.researchPoints += 3; } },
    ],
  },
  {
    key: "rival_taunt",
    title: "Rival studio taunt",
    body: "A rival brags about their next launch in the trades.",
    cd: 46,
    choices: [
      { label: "Ignore them", effect: "focus", apply: () => {} },
      { label: "Quiet counter-ad", effect: "−$2,500 · +hype", apply: (s) => { s.cash -= 2500; s.hype += 10; } },
      { label: "Double down on craft", effect: "+RP", apply: (s) => { s.researchPoints += 7; } },
      { label: "Friendly collab feeler", effect: "−$500 · +fans", apply: (s) => { s.cash -= 500; s.fans += 70; s.hype += 3; } },
      { label: "Leak a teaser", effect: "+hype · free", apply: (s) => { s.hype += 8; } },
    ],
  },
  {
    key: "community_bug_report",
    title: "Community bug report",
    body: "Players found an edge-case crash in an older build floating online.",
    cd: 50,
    choices: [
      { label: "Hotfix & thank publicly", effect: "−$400 · +fans · +hype", apply: (s) => { s.cash -= 400; s.fans += 90; s.hype += 5; } },
      { label: "Quiet patch only", effect: "−$150 · +small fans", apply: (s) => { s.cash -= 150; s.fans += 30; } },
      { label: "Pay a bug bounty", effect: "−$800 · +RP · +fans", apply: (s) => { s.cash -= 800; s.researchPoints += 4; s.fans += 110; } },
      { label: "Ask them to repro steps", effect: "+RP free", apply: (s) => { s.researchPoints += 2; } },
      { label: "Shrug it off", effect: "−hype", apply: (s) => { s.hype = Math.max(0, s.hype - 5); } },
    ],
  },
  {
    key: "family_visit",
    title: "Family drops by",
    body: "Relatives want a garage tour and to “see the computer games.”",
    cd: 55,
    choices: [
      { label: "Host a mini demo day", effect: "−$100 · +hype · +fans", apply: (s) => { s.cash -= 100; s.hype += 4; s.fans += 25; } },
      { label: "Quick tour then back to work", effect: "tiny hype", apply: (s) => { s.hype += 1; } },
      { label: "Ask them to playtest", effect: "+RP · free", apply: (s) => { s.researchPoints += 3; s.fans += 15; } },
      { label: "Reschedule", effect: "no change", apply: () => {} },
      { label: "Record a family reaction clip", effect: "+hype free", apply: (s) => { s.hype += 6; } },
    ],
  },
  {
    key: "shareware_offer",
    title: "Shareware distributor",
    body: "A disk catalog wants to list your games for a cut of future mail orders.",
    cd: 58,
    choices: [
      { label: "Sign a trial listing", effect: "−$700 · +hype · +fans", apply: (s) => { s.cash -= 700; s.hype += 9; s.fans += 100; } },
      { label: "Send one title only", effect: "−$250 · +hype", apply: (s) => { s.cash -= 250; s.hype += 5; s.fans += 40; } },
      { label: "Negotiate better terms", effect: "−time · +RP · +small hype", apply: (s) => { s.researchPoints += 2; s.hype += 3; } },
      { label: "Decline", effect: "no change", apply: () => {} },
      { label: "Ask them to feature a demo", effect: "−$100 · +fans", apply: (s) => { s.cash -= 100; s.fans += 60; s.hype += 4; } },
    ],
  },
];

function tryFireEvent(next: GameState): GameState {
  // Never stack events — unfinished decisions must be resolved first
  if (next.pendingEvent) return next;
  // Don't interrupt critical modals mid-decision
  if (
    next.modal === "reviews" ||
    next.modal === "report" ||
    next.modal === "newGame" ||
    next.modal === "event" ||
    next.modal === "officeOffer"
  ) {
    return next;
  }

  // Never interrupt active development stage work — only between projects or polish/idle
  const phase = next.currentProject?.devPhase ?? "";
  if (
    phase.includes("RUNNING") ||
    phase.includes("CONFIG") ||
    phase === "POLISHING"
  ) {
    return next;
  }

  // Global pacing with seeded jitter so gaps feel irregular (10–22 weeks)
  const lastAny = next.eventCooldowns["__any_event__"] ?? -999;
  const minGap =
    10 + (hashSeed(next.campaignSeed, "evt-gap", lastAny) % 13); // 10..22
  if (next.week - lastAny < minGap) return next;

  // Irregular chance: threshold 1–4% of weeks (seeded), not a fixed clock
  const chancePct = 1 + (hashSeed(next.campaignSeed, next.week, "evt-chance") % 4);
  const roll = hashSeed(next.campaignSeed, next.week, "event") % 100;
  if (roll >= chancePct) return next;

  const eligible = EVENT_POOL.filter((e) => {
    const until = next.eventCooldowns[e.key] ?? 0;
    if (next.week < until) return false;
    // Avoid recent repeats (last 3)
    if (next.recentEventKeys.slice(0, 3).includes(e.key)) return false;
    return true;
  });
  if (!eligible.length) return next;

  // Weighted-ish pick: scramble with two hashes so order isn't pool-order bias
  const scramble = [...eligible].sort(
    (a, b) =>
      hashSeed(next.campaignSeed, next.week, "ep", a.key) -
      hashSeed(next.campaignSeed, next.week, "ep", b.key),
  );
  const idx =
    hashSeed(next.campaignSeed, next.week, "eventpick") % scramble.length;
  const ev = scramble[idx]!;
  // Per-event cooldown jitter ±8 weeks so the same story doesn't rhythm-match
  const cdJitter = (hashSeed(next.campaignSeed, ev.key, next.week, "cdj") % 17) - 8;
  const cd = Math.max(28, ev.cd + cdJitter);
  next.eventCooldowns = {
    ...next.eventCooldowns,
    [ev.key]: next.week + cd,
    __any_event__: next.week,
  };
  next.recentEventKeys = [ev.key, ...next.recentEventKeys].slice(0, 8);
  next.pendingEvent = {
    id: ev.key,
    title: ev.title,
    body: ev.body,
    choices: ev.choices.map((c) => ({ label: c.label, effect: c.effect })),
  };
  next.modal = "event";
  next.speed = 0;
  next.notifications = pushNote(next, `Decision: ${ev.title}`, "info");
  return next;
}

function applyEventChoice(state: GameState, choiceIndex: number): GameState {
  const pe = state.pendingEvent;
  if (!pe) return state;

  // Marketing opportunity events: choice 0 = Not now (dismiss, keep offered for later idle)
  const mktId = (pe as { marketingOpportunityId?: string }).marketingOpportunityId;
  if (mktId && state.marketingOpportunities) {
    const offset = (pe as { marketingChoiceOffset?: number }).marketingChoiceOffset ?? 0;
    if (offset > 0 && choiceIndex < offset) {
      return {
        ...state,
        pendingEvent: null,
        modal: null,
        speed: 1,
        dirty: true,
        notifications: pushNote(state, "Marketing deferred — available again when idle.", "info"),
      };
    }
    const due = state.marketingOpportunities.opportunities.find((o) => o.id === mktId);
    const mapped = Math.max(0, choiceIndex - offset);
    const choice = due?.choices[mapped] ?? due?.choices[0];
    if (due && choice && due.status === "offered") {
      const res = resolveMarketingOpportunity(state.marketingOpportunities, mktId, choice.id);
      if ("error" in res) {
        return { ...state, pendingEvent: null, modal: null, speed: 1 };
      }
      if (state.cash < res.choice.cost) {
        return {
          ...state,
          pendingEvent: null,
          modal: null,
          speed: 1,
          notifications: pushNote(state, `Need $${res.choice.cost.toLocaleString()} for ${res.choice.label}.`, "warn"),
        };
      }
      const txn = applyCashTransaction(state.cash, state.ledger, {
        week: state.week,
        amount: -res.choice.cost,
        category: "marketing",
        label: res.choice.label,
        ref: `mkt-opp-${mktId}-${choice.id}`,
      });
      if (!txn.applied) {
        return { ...state, pendingEvent: null, modal: null, speed: 1 };
      }
      return {
        ...state,
        cash: txn.cash,
        ledger: txn.ledger,
        hype: Math.min(150, state.hype + res.choice.hypeGain),
        marketingOpportunities: res.state,
        pendingEvent: null,
        modal: null,
        dirty: true,
        speed: 1,
        notifications: pushNote(
          state,
          `${res.choice.label}: +${res.choice.hypeGain} hype, +${res.choice.marketingPoints} marketing points.`,
          "good",
        ),
      };
    }
  }

  // Part 2 decision catalog
  if (pe.decisionChoices && pe.decisionChoices.length) {
    const choice = pe.decisionChoices[choiceIndex] ?? pe.decisionChoices[0];
    let next: GameState = {
      ...state,
      pendingEvent: null,
      modal: null,
      dirty: true,
      speed: 1,
      flags: { ...state.flags },
    };
    if (choice) {
      const e = choice.effects;
      if (e.cash) {
        next = commitTxn(next, {
          week: next.week,
          amount: e.cash,
          category: "other",
          label: `${pe.title}: ${choice.label}`,
          ref: `evt-${pe.decisionDefId}-${choice.id}-w${next.week}`,
        });
      }
      if (e.hype) next.hype = Math.max(0, next.hype + e.hype);
      if (e.fans) next.fans = Math.max(0, next.fans + e.fans);
      if (e.note === "observe_tech_wave" && next.researchPipeline) {
        let pipe = next.researchPipeline;
        for (const t of TECH_CATALOG) {
          if (next.year >= t.earliestYear) {
            pipe = observeTech(pipe, t.id, next.year, next.week);
          }
        }
        next.researchPipeline = pipe;
      }
      next.notifications = pushNote(
        next,
        `${pe.title} — ${choice.label}${e.note ? `: ${e.note}` : ""}`,
        e.cash && e.cash < -5000 ? "warn" : "info",
      );
    }
    return next;
  }

  const def = EVENT_POOL.find((e) => e.key === pe.id);
  const choice = def?.choices[choiceIndex] ?? def?.choices[0];
  let next: GameState = {
    ...state,
    pendingEvent: null,
    modal: null,
    dirty: true,
    speed: 1,
    flags: { ...state.flags },
  };
  if (choice) {
    const cashBefore = next.cash;
    choice.apply(next);
    const delta = moneyRound(next.cash - cashBefore);
    // Revert raw cash mutate; re-apply atomically with ledger
    next.cash = cashBefore;
    if (Math.abs(delta) > 0.001) {
      next = commitTxn(next, {
        week: next.week,
        amount: delta,
        category: "other",
        label: `${pe.title}: ${choice.label}`,
        ref: `evt-pool-${pe.id}-${choiceIndex}-w${next.week}`,
      });
    }
    next.notifications = pushNote(
      next,
      `${pe.title} — ${choice.label}`,
      "info",
    );
  } else {
    next.notifications = pushNote(next, `${pe.title} dismissed.`, "info");
  }
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

  // Part 4: platform certification can hard-block; recompute readiness
  project = withTechReadiness(project, next);
  const readiness = project.techSpec?.readiness;
  if (readiness?.platformBlocksRelease) {
    next.currentProject = project;
    next.notifications = pushNote(
      next,
      readiness.blockers[0] ?? "Platform certification failed — cannot ship.",
      "bad",
    );
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
  let scored: GameProject = {
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
  const reviewResult = undefined as import("./quality/algorithm").ReviewResult | undefined;
  let reviews: ReturnType<typeof computeReviews>;
  let productQuality: number;
  let hidden: number;
  const miss =
    (sliderDeviation(scored.genreId, 1, scored.sliders) +
      sliderDeviation(scored.genreId, 2, scored.sliders) +
      sliderDeviation(scored.genreId, 3, scored.sliders)) /
    3;

  // ── Phase-weighted feature allocation (bottlenecks → bugs) ──────────────
  {
    const pool = staffPoolStats(next.staff);
    const alloc = runAllocationEngine({
      genreId: scored.genreId,
      featureIds: scored.features ?? [],
      stage1: (scored.sliders ?? {}) as Record<string, number>,
      stage2: (scored.sliders ?? {}) as Record<string, number>,
      stage3: (scored.sliders ?? {}) as Record<string, number>,
      staffTech: pool.tech,
      staffDesign: pool.design,
    });
    // Feature baseline points fold into totals; bottleneck bugs stack
    scored = {
      ...scored,
      designPoints: scored.designPoints + alloc.design * 0.55,
      techPoints: scored.techPoints + alloc.tech * 0.55,
      bugs: scored.bugs + alloc.bugs,
    };
    if (alloc.notes.length) {
      next.notifications = pushNote(next, alloc.notes[0]!, "warn");
    }
    (scored as { allocationNote?: string }).allocationNote = alloc.notes.join(" · ");
  }

  // ── Classic GDT spine (Python blueprint math) ───────────────────────────
  // score = (points / historical) * combo * 7.5 * sliderFit * bugFit
  // historical := hist*0.7 + points*0.3 after each release
  {
    const combo = classicComboMultiplier(scored.topicId, scored.genreId);
    const hist =
      next.targetHighScore && next.targetHighScore > 5
        ? next.targetHighScore
        : CLASSIC_INITIAL_HISTORICAL;
    const platFit = Math.max(0.6, Math.min(1.35, 0.65 + (platform?.marketSize ?? 0.8) * 0.35));
    const classic = classicReviewScore({
      designPoints: scored.designPoints,
      techPoints: scored.techPoints,
      bugs: (() => {
        const raw = scored.bugs + (scored.production ? productionOpenSeverity(scored) : 0);
        const eng = next.engines.find((e) => e.id === scored.engineId);
        return applyTEngineBugMitigation(raw, !!eng?.tEngineFramework);
      })(),
      targetHighScore: hist,
      comboMult: combo * platFit,
      size: scored.size,
      sliderMiss: miss,
      expertise: next.office <= 1 ? 0.94 : 1,
      audienceId: scored.audience,
    });
    {
      const eng = next.engines.find((e) => e.id === scored.engineId);
      const has3d =
        next.researched.some((id) => id.includes("3d") || id.includes("graphic")) ||
        (eng?.features ?? []).some((f) => /3d|graphic/i.test(f));
      const teBonus = tEngineReviewBonus(!!eng?.tEngineFramework, has3d);
      hidden = Math.max(
        1,
        Math.min(
          10,
          classic.hidden - (scored.crisisReviewPenalty ?? 0) + teBonus,
        ),
      );
    }
    productQuality = hidden * 10;
    reviews = {
      scores: classic.scores.map((sc) =>
        Math.max(1, Math.round((sc - (scored.crisisReviewPenalty ?? 0)) * 10) / 10),
      ),
      avg: Math.max(1, Math.round((classic.avg - (scored.crisisReviewPenalty ?? 0)) * 10) / 10),
      quality: classic.basePoints,
      breakdown: {
        generatedTech: scored.techPoints,
        generatedDesign: scored.designPoints,
        balanceModifier: 1,
        priorityModifier: 1 - miss,
        bugRatio: Math.max(0, 1 - scored.bugs / 40),
        baseScore: classic.basePoints,
        targetHighScore: hist,
        hiddenFinalScore: classic.hidden,
        qualityFactor: 1 - miss,
        hypeBonus: 0,
        sequelMod: 1,
        mmoPenalty: 1,
        trendBonus: combo,
        nextTargetHighScore: classic.nextHistoricalAverage,
        nextHighBaseScore: classic.basePoints,
      },
      nextHighBaseScore: classic.basePoints,
      nextTargetHighScore: classic.nextHistoricalAverage,
      criticReviews: classic.criticReviews,
      productQuality,
    } as unknown as ReturnType<typeof computeReviews>;

    // Dynamic reviewer quotes (Definitive 4.0)
    {
      const quotes = getReviewerQuotes(reviews.avg);
      reviews = {
        ...reviews,
        criticReviews: quotes.map((q) => ({
          name: q.outlet,
          score: q.score,
          comment: q.quote,
        })),
      } as typeof reviews;
    }

    // Netflix Edition quarantined (Foundation Lock): never mutates critic scores.
    // Commercial IP effects only when late systems allowed.
    if (lateSystemAllowed(next, "netflixEdition") && next.activeIpLicense) {
      const ipm = ipShipModifiers({
        active: next.activeIpLicense,
        topicId: scored.topicId,
        genreId: scored.genreId,
      });
      if (ipm.licensed) {
        (scored as { ipLicensed?: boolean; ipMatched?: boolean; ipRoyaltyRate?: number; ipHypeMult?: number }).ipLicensed =
          true;
        (scored as { ipMatched?: boolean }).ipMatched = ipm.matched;
        (scored as { ipRoyaltyRate?: number }).ipRoyaltyRate = ipm.royaltyRate;
        (scored as { ipHypeMult?: number }).ipHypeMult = ipm.hypeMult;
        // Awareness only — never review points
        if (ipm.matched) {
          next.hype = Math.round(next.hype * ipm.hypeMult);
          next.notifications = pushNote(
            next,
            `Franchise awareness: ${next.activeIpLicense?.name} — ${ipm.hypeMult}× hype (no review boost).`,
            "good",
          );
        }
      }
    }

    // Optional diagnostics from production metrics (UI only; does not override score)
    if (scored.production?.completedStages?.length) {
      try {
        const founder = founderFromStaff(next.staff);
        const eng = next.engines.find((e) => e.id === scored.engineId);
        const installed = new Set(eng?.features ?? []);
        const metrics = metricsFromProduction({
          completedStages: scored.production.completedStages,
          founderCapability: (d) => founderCapability(founder, d),
          engineSupportFor: (d) => {
            if (d === "graphics") {
              if ([...installed].some((f) => /3d/i.test(f))) return 1;
              if ([...installed].some((f) => /2d/i.test(f))) return 0.85;
              return 0.55;
            }
            return 0.65;
          },
        });
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
                  capability: 0.55,
                  engineSupport: 0.65,
                },
              ],
          unfixedBugSeverity: productionOpenSeverity(scored),
          polishRatio: scored.production.polishProgress / Math.max(1, 300),
        });
      } catch {
        /* diagnostics optional */
      }
    }
  }

  // Size ceiling — small games cannot review as AAA masterpieces
  {
    const cap = SIZE_STATS[scored.size]?.maxScore ?? 10;
    if (reviews.avg > cap) {
      const scale = cap / Math.max(0.1, reviews.avg);
      reviews.avg = Math.round(cap * 10) / 10;
      reviews.scores = reviews.scores.map((x) =>
        Math.max(1, Math.min(cap, Math.round(x * scale * 10) / 10)),
      );
    }
    // Soft floor: finishing a game with zero investment still shouldn't auto-10
    // (production path already penalizes flat alloc; this is a belt-and-suspenders)
    if (!next.settings.forcePerfectScore && reviews.avg >= cap - 0.05) {
      const allEqual =
        reviews.scores.length > 1 &&
        reviews.scores.every((x) => Math.abs(x - reviews.scores[0]!) < 0.15);
      // leave as-is; size cap handles small
      void allEqual;
    }
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

  // Part 4: asymmetric technical review component (does not create design quality)
  if (!next.settings.forcePerfectScore && !next.settings.forceBadScore) {
    const techHint = readiness?.technicalReviewHint ?? 0;
    if (techHint !== 0) {
      reviews.avg = applyTechnicalReviewToScore(reviews.avg, techHint);
      reviews.scores = reviews.scores.map((s) =>
        Math.max(1, Math.min(10, Math.round((s + techHint * 0.85) * 10) / 10)),
      );
    }
  }

  // ALGORITHM 3 platform market at release day
  const releaseDay = weekToCampaignDay(next.week);
  const pSpec = getPlatformSpec(scored.platformId);
  const pMarket = platformMarketState(pSpec, {
    day: releaseDay,
    audienceId: scored.audience,
  });
  const platformSnap = snapshotPlatformWeek(pMarket);
  let platformMarket =
    pMarket.lifecycleFactor * Math.max(0.35, platform.marketSize);
  // Module 13 first-party: use live console share, $0 license already
  const ownHw = (next.playerConsoles ?? []).find((c) => c.id === scored.platformId);
  if (ownHw?.status === "shipping") {
    platformMarket = Math.max(platformMarket, ownHw.marketShare);
  }
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

  // Classic GDT unit plan — overrides microscopic weekly_v3 plans for shelf totals
  {
    // Module 9 — multi-platform combined share
    const secIds = scored.secondaryPlatformIds ?? [];
    const secShares = secIds.map((id) => {
      try {
        const sp = getPlatformSpec(id);
        const sm = platformMarketState(sp, { day: releaseDay, audienceId: scored.audience });
        return sm.lifecycleFactor * Math.max(0.35, getPlatform(id)?.marketSize ?? 0.5);
      } catch {
        return 0.3;
      }
    });
    const multiShare = combinedMarketShare(Math.max(0.15, platformMarket), secShares);
    let classicSales = classicUnitsSold({
      designPoints: scored.designPoints,
      techPoints: scored.techPoints,
      reviewScore: Math.max(1, reviews.avg - (scored.crisisReviewPenalty ?? 0)),
      size: scored.size,
      platformMarket: multiShare,
      comboMult: classicComboMultiplier(scored.topicId, scored.genreId) *
        ((scored as { ipHypeMult?: number }).ipHypeMult ?? 1),
      marketingSpend: scored.marketingSpend,
      fans: next.fans,
      hype: scored.hype + next.hype,
    });
    // Module 7 — if rival pressure on this genre, cut shelf 22%
    const pressUntil = next.rivalGenrePressure?.[scored.genreId] ?? 0;
    if (pressUntil > next.week) {
      classicSales = {
        ...classicSales,
        totalUnits: Math.floor(classicSales.totalUnits * RIVAL_GENRE_SATURATION),
        weekly: classicSales.weekly.map((u) => Math.floor(u * RIVAL_GENRE_SATURATION)),
        net: classicSales.net * RIVAL_GENRE_SATURATION,
        gross: classicSales.gross * RIVAL_GENRE_SATURATION,
      };
    }
    // Module 16 — piracy / DRM
    {
      const drm = (scored.drmTier ?? "None") as DrmTier;
      const pir = processShipmentPiracy({
        originalUnits: classicSales.totalUnits,
        drm,
        fans: next.fans,
        pirateMode: !!next.settings.pirateMode,
      });
      const ratio = classicSales.totalUnits > 0 ? pir.legitUnits / classicSales.totalUnits : 1;
      classicSales = {
        ...classicSales,
        totalUnits: pir.legitUnits,
        weekly: classicSales.weekly.map((u) => Math.floor(u * ratio)),
        net: classicSales.net * ratio,
        gross: classicSales.gross * ratio,
      };
      next.piracyLossRate = pir.theftRate;
      if (pir.lostUnits > 0) {
        next.notifications = pushNote(next, pir.note, "warn");
      }
      if (pir.fanBacklash > 0) {
        next.fans = intFans(next.fans - pir.fanBacklash);
      }
    }
    // Module 17 — schedule IP check 2 weeks post-launch if illicit assets
    if (scored.usedIllicitAssets) {
      // stamped on released via toReleased fields - set on scored for toReleased
      (scored as { litigationDueWeek?: number }).litigationDueWeek = next.week + 2;
    }

    sales.totalUnits = classicSales.totalUnits;
    sales.revenue = classicSales.net;
    sales.price = classicSales.price;
    sales.weeks = classicSales.weekly;
    sales.history = classicSales.weekly.map((units, i) => ({
      week: i + 1,
      units,
      revenue: units * classicSales.price * 0.75,
    }));
  }

  // Module 21 — Ops publisher: freeze terms + review obligation only.
  // NO projected lifetime royalties at release. Weekly share applies later.
  if (next.activePublisherDealId && PUBLISHER_MATRIX.some((p) => p.id === next.activePublisherDealId)) {
    const offer = PUBLISHER_MATRIX.find((p) => p.id === next.activePublisherDealId)!;
    const met = reviews.avg + 1e-6 >= offer.reqScore;
    if (!met) {
      const penalty = Math.round(offer.advancePay * 0.6);
      next = commitTxn(next, {
        week: next.week,
        amount: -penalty,
        category: "publisher",
        label: `Publisher breach: ${offer.company}`,
        ref: `ops-breach-${offer.id}-${scored.id}`,
      });
      next.notifications = pushNote(
        next,
        `${offer.company}: missed ${offer.reqScore}+ (got ${reviews.avg.toFixed(1)}). Fine ${penalty}.`,
        "bad",
      );
    } else {
      next.notifications = pushNote(
        next,
        `${offer.company}: score met. Weekly revenue share ${Math.round(offer.royaltyCut * 100)}% applies on sales.`,
        "good",
      );
    }
    // Freeze deal onto scored for commercial snapshot; do not clear until freeze applied below
    (scored as { publisherContractSnapshot?: object }).publisherContractSnapshot = {
      source: "ops_matrix",
      id: offer.id,
      company: offer.company,
      royaltyCut: offer.royaltyCut,
      reqScore: offer.reqScore,
    };
  }


  const released = toReleased(
    scored,
    { scores: reviews.scores, avg: reviews.avg, breakdown: reviews.breakdown },
    sales,
    next.week,
    next.year,
  );
  // Freeze ops publisher distribution before any clear of active deal id
  const snap = (scored as { publisherContractSnapshot?: { source: string; id: string; company: string; royaltyCut: number } }).publisherContractSnapshot;
  if (snap) {
    released.distributionType = "publisher";
    released.publisherId = snap.id;
    released.publisherRoyalty = 1 - snap.royaltyCut; // studio keep rate
    (released as { publisherContractSnapshot?: object }).publisherContractSnapshot = snap;
    next.activePublisherDealId = null;
  }

    if (scored.usedIllicitAssets) {
      released.litigationDueWeek = next.week + 2;
      released.usedIllicitAssets = true;
    }
    released.sliderMissAtShip = miss;

  // Module 22 — engine tech debt uses++
  {
    const eid = scored.engineId;
    next.engines = next.engines.map((e) =>
      e.id === eid
        ? { ...e, gamesShippedCount: (e.gamesShippedCount ?? 0) + 1 }
        : e,
    );
  }

  // Workshop Module B — genre EXP
  next.genreExp = incrementGenreExp(next.genreExp ?? {}, scored.genreId);
  const gLvl = genreLevel(next.genreExp[scored.genreId] ?? 0);
  next.notifications = pushNote(
    next,
    `${scored.genreId.toUpperCase()} expertise → Lv${gLvl} (${next.genreExp[scored.genreId]} ships).`,
    "info",
  );

  // Workshop Module D — history ledger
  {
    const press = (next.rivalGenrePressure?.[scored.genreId] ?? 0) > next.week;
    const entry = buildHistoryEntry({
      gameId: released.id,
      title: released.title,
      week: next.week,
      year: next.year,
      genreId: scored.genreId,
      topicId: scored.topicId,
      platformId: scored.platformId,
      avgReview: reviews.avg,
      designPoints: scored.designPoints,
      techPoints: scored.techPoints,
      developmentCost: scored.developmentCost ?? 0,
      marketingSpend: scored.marketingSpend ?? 0,
      unitsSold: sales.totalUnits ?? 0,
      unitPrice: sales.price ?? 9.99,
      rivalGenrePressure: press,
    });
    // classicSales may be block-scoped — use sales object
    next.gameHistoryLedger = [...(next.gameHistoryLedger ?? []), entry].slice(-80);
    released.telemetry = entry;
  }

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
  released.pricing = lockPricingAtRelease(
    scored.pricing,
    scored.size,
    price,
    next.week,
    next.year,
  );
  // Part 2: first commercial use matures tech pipeline
  next.researchPipeline = recordCommercialUse(
    next.researchPipeline ?? seedGarageTechPipeline(next.year),
    scored.features ?? [],
    next.week,
  );

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
  let distType: "self" | "publisher" = "self";
  let royalty = 0.7;
  if (next.activePublisherDealId && next.publishingBoard) {
    const deal = next.publishingBoard.deals.find((d) => d.id === next.activePublisherDealId);
    if (deal) {
      distType = "publisher";
      royalty = deal.royaltyRate;
      released.distributionType = "publisher";
      released.publisherId = deal.publisherId;
      released.publisherRoyalty = deal.royaltyRate;
    }
  }
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
    distType,
    royalty,
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
  {
    // Foundation Lock: no projected lifetime fans at release.
    // Small bounded review-reaction only (independent of shelf plan units).
    const reaction =
      reviews.avg >= 8.5 ? 25 : reviews.avg >= 7 ? 10 : reviews.avg >= 5.5 ? 0 : -5;
    next.fans = Math.max(0, next.fans + reaction);
  }
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
  if ((scored as { ipRoyaltyRate?: number }).ipRoyaltyRate) {
    next.ipRoyaltyGameIds = [
      released.id,
      ...(next.ipRoyaltyGameIds ?? []).filter((id) => id !== released.id),
    ];
    (released as { ipRoyaltyRate?: number }).ipRoyaltyRate = (
      scored as { ipRoyaltyRate?: number }
    ).ipRoyaltyRate;
    (released as { ipLicensed?: boolean }).ipLicensed = true;
  }
  // IP infringement schedule — quarantined in Garage
  if (lateSystemAllowed(next, "ipLitigation")) {
    const licensed = !!(next.activeIpLicense && next.activeIpLicense.licenseId !== "clear");
    if (titleLooksInfringing(released.title, licensed)) {
      next.infringementDue = [
        ...(next.infringementDue ?? []),
        { gameId: released.id, dueWeek: next.week + 2, title: released.title },
      ];
      next.notifications = pushNote(
        next,
        `Legal watch: "${released.title}" may infringe — review in 2 weeks.`,
        "warn",
      );
    }
  }

  // MMO lifecycle registration — quarantined in Garage
  if (lateSystemAllowed(next, "mmoLifecycle")) {
    const mmoOwned =
      next.researched.includes("mmo") ||
      next.researched.includes("mmo_games") ||
      next.unlocks.mmo === "owned" ||
      !!(scored as { isMmo?: boolean }).isMmo;
    if (mmoOwned && (scored.size === "large" || scored.size === "aaa" || !!(scored as { isMmo?: boolean }).isMmo)) {
      const planTotal = (released.weeklySalesLeft ?? []).reduce((a, b) => a + b, 0);
      const mmo: MmoRuntime = {
        gameId: released.id,
        title: released.title,
        initialUnits: Math.max(2000, planTotal || Math.floor(released.avgReview * 8000)),
        monthsOnMarket: 0,
        active: true,
        lifetimeSubRevenue: 0,
        lifetimeUpkeep: 0,
      };
      next.activeMmos = [mmo, ...(next.activeMmos ?? [])];
      next.notifications = pushNote(
        next,
        `MMO servers online for "${released.title}" — monthly subs $4.99 vs upkeep.`,
        "info",
      );
    }
  }
  
  // Publisher: score/obligation check only — no projected lifetime royalty cash.
  if (next.activePublisherDealId && next.publishingBoard) {
    const deal = next.publishingBoard.deals.find((d) => d.id === next.activePublisherDealId);
    if (deal) {
      const result = evaluatePublisherDeal({
        deal,
        avgReview: reviews.avg,
        genreId: scored.genreId,
        size: scored.size,
        platformId: scored.platformId,
        grossRevenue: 0,
      });
      if (result.cashDelta !== 0) {
        const txn = applyCashTransaction(next.cash, next.ledger, {
          week: next.week,
          amount: result.cashDelta,
          category: result.met ? "publisher" : "other",
          label: result.met
            ? `Publisher contract met: ${deal.publisherName}`
            : `Publisher penalty: ${deal.publisherName}`,
          gameId: scored.id,
          ref: `pub-${deal.id}-${scored.id}`,
        });
        next.cash = txn.cash;
        next.ledger = txn.ledger;
      }
      next.notifications = pushNote(next, result.note, result.met ? "good" : "bad");
      released.distributionType = "publisher";
      released.publisherId = deal.publisherId;
      released.publisherRoyalty = deal.royaltyRate;
    }
    next.activePublisherDealId = null;
  }

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
  {
    const br = reviews.breakdown as {
      nextTargetHighScore?: number;
      nextHighBaseScore?: number;
    };
    const nextHist =
      (reviews as { nextTargetHighScore?: number }).nextTargetHighScore ??
      br.nextTargetHighScore ??
      next.targetHighScore;
    next.targetHighScore = clampHistoricalAverage(nextHist);
    next.previousHighBaseScore =
      br.nextHighBaseScore ??
      (reviews as { nextHighBaseScore?: number }).nextHighBaseScore ??
      scored.designPoints + scored.techPoints;
  }
  next.lastScoreBreakdown = {
    baseScore: reviews.breakdown.baseScore,
    hiddenFinalScore: reviews.breakdown.hiddenFinalScore,
    targetHighScore: reviews.breakdown.targetHighScore,
    qualityFactor: reviews.breakdown.qualityFactor,
    bugRatio: reviews.breakdown.bugRatio,
  };
  next.researchPoints +=
    5 +
    hidden * 1.5 +
    (scored.researchEarned ?? 0) * 0.12 +
    releaseRpSpike(reviews.avg);
  next.hype = Math.max(0, Math.min(20, hidden * 0.4)); // launch burns hype pool
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

let lastSaveAt = 0;

interface Actions {
  newGame: (companyName: string, pirateMode: boolean, difficulty?: DifficultyPreset) => void;
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
    pillar?: ProjectPillar;
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
  acceptPublisherDeal: (id: string) => string | null;
  refreshPublisherBoard: () => string | null;
  clearPublisherDeal: () => void;
  fireStaff: (id: string) => void;
  refreshCandidates: () => StaffMember[];
  getCandidates: () => StaffMember[];
  /** Enroll staff in a training course (requires training unlock). */
  trainStaff: (staffId: string, courseId: string) => string | null;
  getTrainingCourses: () => typeof TRAINING_COURSES;
  licensePlatform: (id: string) => string | null;
  upgradeOffice: () => string | null;
  /** Accept first-office move (bible offer path). */
  acceptOfficeOffer: () => string | null;
  /** Defer first-office offer — remains available, economics frozen. */
  deferOfficeOffer: () => string | null;
  buildEngine: (name: string, featureIds: string[]) => string | null;
  /** Part 4: work a specific optimization task for one week. */
  runOptimizationTask: (taskId: string) => string | null;
  /** Part 4: recompute release readiness / cert. */
  evaluateTechReadiness: () => string | null;
  setProjectPillar: (pillar: ProjectPillar) => void;
  startTechPipeline: (techId: string) => string | null;
  resolveDecisionEvent: (choiceId: string) => void;
  startHardwareProject: (name: string, purpose: HardwarePurpose, componentIds: string[]) => string | null;
  /** Start a full engine version build (Part 3 workshop). */
  startEngineVersion: (opts: {
    name: string;
    purpose?: EnginePurpose;
    architecture?: ArchitectureStyle;
    lifespan?: TargetLifespan;
    moduleIds?: string[];
    targetPlatforms?: string[];
    targetSizes?: GameSize[];
    familyId?: string;
    bump?: "patch" | "minor" | "major";
  }) => string | null;
  takeContract: (id: string) => string | null;
  dismissNotifications: () => void;
  /** Mark all inbox items read (does not delete). */
  markNotificationsRead: () => void;
  selectGame: (id: string | null) => void;
  completeReport: (id: string) => void;
  startTitleCampaign: (gameId: string, campaignId: string) => string | null;
  resolveMarketingChoice: (opportunityId: string, choiceId: string) => string | null;
  runStudioMarketing: (campaignId: string) => string | null;
  toggleCrunchMode: () => string | null;
  setSecondaryPlatforms: (ids: string[]) => string | null;
  exportSaveMatrix: () => string;
  issuePatch: (gameId: string) => string | null;
  buildDlc: (gameId: string) => string | null;
  startPlayerConsole: (tier: HardwareTierId, name?: string) => string | null;
  setConsolePricing: (id: string, retailPrice: number, royaltyRate: number) => string | null;
  setProjectDrm: (drm: DrmTier) => string | null;
  unlockDrm: (drm: DrmTier) => string | null;
  toggleIllicitAssets: () => string | null;
  runPostMortem: (gameId: string) => string | null;
  refactorEngine: (engineId?: string) => string | null;
  sendStaffOnVacation: (staffId: string) => string | null;
  signOpsPublisher: (publisherId: string) => string | null;
  renovateHighDensity: () => string | null;
  launchWorkbenchAccessory: (
    categoryId: BenchCategoryId,
    name: string,
    retailPrice: number,
  ) => string | null;
  runRecruitCampaign: (tier: "local" | "headhunter") => string | null;
  licenseFranchise: (licenseId: string) => string | null;
  runStreamerCampaign: (tierId: string) => string | null;
  hostStudioConvention: (
    ticketPrice: number,
    focus: ConventionFocus,
  ) => string | null;
  shutdownMmo: (gameId: string) => string | null;
  launchDigitalStorefront: (name?: string) => string | null;
  installContentPack: (packId: string) => string | null;
  acceptCopySettlement: () => string | null;
  refuseCopySettlement: () => string | null;
  launchAccessory: (
    categoryId: AccessoryCategoryId,
    name: string,
    retailPrice: number,
  ) => string | null;
  attachTEngineFramework: (engineId: string) => string | null;
  executeCheatCommand: (raw: string) => string | null;
  startConfiguredConsole: (
    media: MediaDriveId,
    gpu: GpuPartId,
    name?: string,
    retailPrice?: number,
  ) => string | null;
  applyCheat: (cheat: string, arg?: string | number) => void;
  resolveEvent: (choiceIndex: number) => void;
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


/** Part 4: attach/update tech profile + classified bugs + readiness on a project. */
function withTechReadiness(project: GameProject, state: GameState): GameProject {
  const wantsOnline = project.features.some((f) => /online|multiplayer/i.test(f));
  const openWorldish = project.features.some((f) => /open world|streaming/i.test(f));
  let tech =
    project.techSpec ??
    createProjectTechSpec({
      gameId: project.id,
      platformId: project.platformId,
      size: project.size,
      genreId: project.genreId,
      wantsOnline,
    });

  const prodBugs = project.production?.bugs ?? [];
  const classified = classifyAllBugs(prodBugs, tech.platforms);
  tech = { ...tech, classifiedBugs: classified };

  const stageProgress =
    project.stage === "done"
      ? 1
      : ((Number(project.stage) - 1) + (project.stageProgress ?? 0) / 100) / 3;
  const polishNeed = project.production?.polishRequired ?? 380;
  const polishProgress01 = Math.min(
    1,
    (project.production?.polishProgress ?? 0) / Math.max(1, polishNeed),
  );
  const engStab = project.engineSnapshot?.integrationHealth ?? 0.7;
  const engTech = project.techPoints ?? 0;

  tech = refreshProjectProfile(tech, {
    gameId: project.id,
    size: project.size,
    genreId: project.genreId,
    stageProgress,
    polishProgress01,
    featureCount: project.features.length,
    engineTechBonus: engTech,
    engineStability: engStab,
    wantsOnline,
    openWorldish,
    bugs: classified,
    week: state.week,
  });

  const featureCompletion =
    project.production?.phase === "release_ready"
      ? 1
      : Math.min(1, 0.55 + stageProgress * 0.35 + polishProgress01 * 0.15);

  const { readiness, tech: tech2 } = evaluateReleaseReadiness({
    tech,
    featureCompletion,
    bugs: classified,
    wantsOnline,
    week: state.week,
    size: project.size,
  });

  return {
    ...project,
    bugs: classified.filter((b) => !b.fixed).length,
    techSpec: { ...tech2, readiness },
  };
}

export const useGame = create<GameState & Actions>((set, get) => ({
  ...initialState(),

  newGame: (companyName, pirateMode, difficultyPreset = "standard") => {
    const s = initialState();
    s.phase = "playing";
    s.companyName = companyName.trim() || "Garage Games";
    s.settings.pirateMode = pirateMode;
    s.difficulty = getDifficulty(difficultyPreset);
    s.cash = applyStartingCash(s.cash, s.difficulty);
    s.researchPipeline = seedGarageTechPipeline(START_YEAR);
    s.hardwareProjects = [];
    s.speed = 1;
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
    s.progression = createStudioProgression("classic_35");
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
      const migratedProgression = migrateStudioProgression(
        data.progression,
        Number(data.office) || 1,
      );
      const staff = (data.staff ?? base.staff).map((m) => ({
        ...m,
        energy: m.id === "founder" ? 100 : (m.energy ?? 100),
        fieldExperience: m.fieldExperience ?? {},
      }));
      const engines = (data.engines as EngineDef[] | undefined) ?? base.engines;
      const engineWorkshop = ensureWorkshopFromEngines(
        engines,
        data.engineWorkshop as EngineWorkshopState | null | undefined,
        "player",
        Number(data.week) || 0,
        Number(data.year) || START_YEAR,
      );
      set({
        ...base,
        ...data,
        engines,
        engineWorkshop,
        version: SAVE_VERSION,
        phase: "playing",
        modal:
          data.pendingEvent != null
            ? "event"
            : data.modal === "reviews" || data.modal === "report" || data.modal === "officeOffer"
              ? (data.modal as GameState["modal"])
              : null,
        pendingEvent: data.pendingEvent ?? null,
        screen: (data.screen as ScreenId) ?? "studio",
        speed: data.pendingEvent != null ? 0 : 1,
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
        progression: migratedProgression,
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
      // Preserve pendingEvent + event modal so mid-decision saves do not kill the event system
      const modalToStore =
        state.pendingEvent != null
          ? "event"
          : state.modal === "reviews" || state.modal === "report"
            ? state.modal
            : null;
      const payload = {
        ...state,
        version: SAVE_VERSION,
        modal: modalToStore,
        speed: 0,
        dirty: false,
        lastSavedWeek: state.week,
        pendingEvent: state.pendingEvent,
        eventCooldowns: state.eventCooldowns,
        recentEventKeys: state.recentEventKeys,
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
    // Always allow the player to choose Play; tick() still holds during CONFIG / events.
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
    const prev = state.speed || 1;
    set({ speed: prev > 0 ? prev : 1 });
    get().tick();
    // Stay on Play after a manual week advance unless an event modal needs attention.
    const after = get();
    if (after.pendingEvent) set({ speed: 0, modal: "event" });
    else set({ speed: prev > 0 ? prev : 1 });
    return null;
  },

  setScreen: (s) => set({ screen: s, modal: null }),
  setModal: (m) => set({ modal: m }),

  tick: () => {
    const state = get();
    if (state.phase !== "playing" || state.speed === 0) return;
    // Module 15 — do not auto-advance while insolvent
    if (isBankrupt(state.cash, !!state.settings.disableBankruptcy) && state.cash < 0) {
      set({ speed: 0 });
      return;
    }
    // Open decision must be resolved before time advances (and after save/load)
    if (state.pendingEvent) {
      if (state.modal !== "event") set({ modal: "event", speed: 0 });
      else set({ speed: 0 });
      return;
    }

    const p0 = state.currentProject;
    if (
      p0 &&
      (p0.devPhase === "STAGE_1_CONFIG" ||
        p0.devPhase === "STAGE_2_CONFIG" ||
        p0.devPhase === "STAGE_3_CONFIG" ||
        p0.devPhase === "READY_TO_RELEASE")
    ) {
      // Hold the week until desk decision — keep speed preference (default Play).
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
    if (isGaragePhaseOne(next)) {
      const mkt = ensureYearOpportunities(
        next.marketingOpportunities ?? emptyMarketingOpportunityState(),
        next.week,
        next.campaignSeed,
      );
      next.marketingOpportunities = mkt;
      // Soft offer: notify once when an opportunity becomes due — never spam-pause gameplay.
      // Player can open it from notifications / wait; only surface modal if idle (no project).
      const due = mkt.opportunities.find((o) => o.status === "offered");
      const notifiedKey = due ? `mkt-notified-${due.id}` : "";
      if (
        due &&
        !(next.eventCooldowns[notifiedKey] != null) &&
        !next.pendingEvent &&
        next.modal == null &&
        !next.currentProject
      ) {
        next.eventCooldowns = { ...next.eventCooldowns, [notifiedKey]: next.week };
        const head = due.headline ?? "A marketing window opened.";
        next.pendingEvent = {
          id: due.id,
          title: "Marketing opportunity",
          body: `${head}\n\nPick a channel — or wait.`,
          choices: [
            { label: "Not now", effect: "Keep offer · no spend" },
            ...due.choices.map((c) => ({
              label: c.label,
              effect:
                c.cost <= 0
                  ? `Free · +${c.hypeGain} hype${c.blurb ? ` · ${c.blurb}` : ""}`
                  : `$${c.cost.toLocaleString()} · +${c.hypeGain} hype · +${c.marketingPoints} mkt${
                      c.blurb ? ` · ${c.blurb}` : ""
                    }`,
            })),
          ],
        };
        (next.pendingEvent as { marketingOpportunityId?: string }).marketingOpportunityId = due.id;
        (next.pendingEvent as { marketingChoiceOffset?: number }).marketingChoiceOffset = 1;
        next.modal = "event";
        next.speed = 0;
      } else if (due && !(next.eventCooldowns[notifiedKey] != null) && next.currentProject) {
        next.eventCooldowns = { ...next.eventCooldowns, [notifiedKey]: next.week };
        next.notifications = pushNote(
          next,
          `Marketing option available after you ship — check next idle week.`,
          "info",
        );
      }
    }

    // Progression tenure + office offers + move completion (CP1)
    if (isFeatureEnabled("officeFoundation")) {
      let prog = migrateStudioProgression(next.progression, next.office);
      prog = tickTenure(prog);
      const moved = tickActiveMove(next, prog);
      next = moved.state;
      prog = moved.progression;
      prog = tickOfficeOffers(next, prog);
      next.progression = prog;
      // Surface first-office offer modal once when newly offered
      const fo = prog.offers.first_office;
      if (
        fo?.state === "offered" &&
        fo.offeredWeek === next.week &&
        next.modal !== "officeOffer" &&
        !next.pendingEvent
      ) {
        next.modal = "officeOffer";
        next.speed = 0;
      }
      // Deferred FO reminders: exactly 2 windows per campaign year until accepted
      if (
        fo &&
        (fo.state === "deferred" || fo.state === "offered") &&
        prog.studioTier === 1 &&
        !next.pendingEvent &&
        next.modal !== "event" &&
        next.modal !== "reviews" &&
        next.modal !== "officeOffer"
      ) {
        const y = Math.floor(next.week / 48);
        const yearStart = y * 48;
        const windows = [yearStart + 16, yearStart + 40];
        const reminders = fo.reminderWeeks ?? [];
        const yearReminders = reminders.filter((w) => Math.floor(w / 48) === y);
        if (
          yearReminders.length < 2 &&
          windows.includes(next.week) &&
          !reminders.includes(next.week)
        ) {
          next.progression = {
            ...prog,
            offers: {
              ...prog.offers,
              first_office: {
                ...fo,
                reminderWeeks: [...reminders, next.week],
              },
            },
          };
          next.modal = "officeOffer";
          next.speed = 0;
          next.notifications = pushNote(
            next,
            "Reminder: First Office offer still available (terms unchanged).",
            "info",
          );
        }
      }
    }

    const payroll = next.staff.reduce((s, m) => s + m.salary, 0);
    if (payroll > 0) {
      next = commitTxn(next, {
        week: next.week,
        amount: -(payroll / 4),
        category: "payroll",
        label: "Weekly payroll",
        ref: `payroll-w${next.week}`,
      });
    }
    if (date.weekOfMonth === 1) {
      const rent =
          (next.office === 2 && isHighDensity(next.officeSubTier)
            ? HIGH_DENSITY.rent
            : OFFICE_INFO[next.office as 1 | 2 | 3 | 4 | 5].rent) +
          clutterTax((next.hardwareProducts ?? []).filter((h) => (h.fabWeeksLeft ?? 0) <= 0 || h.workbenchMode).length);
      if (rent > 0) {
        next = commitTxn(next, {
          week: next.week,
          amount: -rent,
          category: "rent",
          label: "Monthly office rent",
          ref: `rent-w${next.week}`,
        });
      }
    }

    // Staff energy + Module 20 burnout fatigue
    next.staff = next.staff.map((m) => {
      if (next.settings.noVacationMode) {
        return { ...m, energy: 100, fatigue: 0, workStatus: "Active" as const };
      }
      const crunch = !!next.currentProject?.crunchMode;
      const working = !!next.currentProject && (m.busy || m.id === "founder");
      const status = (m.workStatus ?? "Active") as "Active" | "Vacation";
      let fatigue = m.fatigue ?? Math.max(0, 100 - (m.energy ?? 100));
      // Map vacation force when not working optional rest
      if (!working && status === "Active" && fatigue > 60 && !crunch) {
        // light rest if idle
        fatigue = Math.max(0, fatigue - 8);
      }
      const burn = applyWeeklyFatigue({
        fatigue,
        status,
        crunchActive: crunch && working,
        name: m.name,
      });
      if (burn.note) {
        next.notifications = pushNote(next, burn.note, "warn");
      }
      // keep energy roughly inverse for legacy UI
      const energy =
        burn.status === "Vacation"
          ? Math.min(40, m.energy ?? 40)
          : Math.max(0, 100 - burn.fatigue);
      return {
        ...m,
        fatigue: burn.fatigue,
        workStatus: burn.status,
        energy,
        busy: burn.status === "Vacation" ? false : m.busy,
      };
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

    // Part 3 engine workshop tick — capacity-based progress, immutable release
    if (next.engineWorkshop?.activeBuild) {
      const tick = tickEngineBuild(
        next.engineWorkshop,
        next.staff,
        next.week,
        next.year,
      );
      next.engineWorkshop = tick.workshop;
      if (tick.engineDef && tick.released) {
        next.engines = [...next.engines.filter((e) => e.id !== tick.engineDef!.id), tick.engineDef];
        next.notifications = pushNote(
          next,
          tick.note ?? `Engine "${tick.engineDef.name}" is ready.`,
          "good",
        );
      }
    }

    if (next.activeResearch) {
      const job = { ...next.activeResearch, weeksLeft: next.activeResearch.weeksLeft - (next.settings.fastResearchMode ? 99 : 1) };
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
          // Part 2: research complete ≠ ship-ready; advance pipeline / sync
          let pipe = next.researchPipeline ?? seedGarageTechPipeline(next.year);
          pipe = syncLegacyResearched(pipe, next.researched, next.week);
          const ticked = tickResearchPipeline(pipe, next.week);
          next.researchPipeline = ticked.pipe;
          for (const n of ticked.notes) {
            next.notifications = pushNote(next, n, "info");
          }
        } else {
          if (!next.unlockedTopics.includes(job.targetId)) {
            next.unlockedTopics = [...next.unlockedTopics, job.targetId];
          }
          next.notifications = pushNote(next, `Topic unlocked: ${job.name}`, "good");
        }
        next.activeResearch = null;
        next = applyUnlockNotes(next);
      } else {
        next.activeResearch = job;
      }
    }

    // Staff training weeks
    {
      const tr = tickStaffTraining(next.staff);
      next.staff = tr.staff;
      for (const c of tr.completed) {
        next.notifications = pushNote(
          next,
          `${c.name} finished ${c.course} (${c.gains}).`,
          "good",
        );
        next.researchPointsFrac = (next.researchPointsFrac ?? 0) + 0.6;
      }
    }

    // Part 2: research pipeline tick (prototype → integration → production ready)
    {
      let pipe = next.researchPipeline ?? seedGarageTechPipeline(next.year);
      pipe = syncLegacyResearched(pipe, next.researched, next.week);
      // Observe era-appropriate tech gradually
      if (next.week % 12 === 0) {
        for (const t of TECH_CATALOG) {
          if (next.year >= t.earliestYear && next.year >= t.normalYear - 3) {
            pipe = observeTech(pipe, t.id, next.year, next.week);
            pipe = tryMarkResearchable(pipe, t.id, {
              year: next.year,
              pipe,
              researchedLegacy: next.researched,
              office: next.office,
              hasRnd: next.flags.rndLab,
            });
          }
        }
      }
      const ticked = tickResearchPipeline(pipe, next.week);
      next.researchPipeline = ticked.pipe;
      for (const n of ticked.notes.slice(0, 2)) {
        next.notifications = pushNote(next, n, "info");
      }
    }

    // Part 2: decision events — idle weeks only, low rate (see maybeSpawnDecisionEvent)
    if (
      !next.pendingEvent &&
      next.modal == null &&
      !next.currentProject &&
      (next.eventCooldowns["__any_event__"] ?? -999) <= next.week - 20
    ) {
      const pending = maybeSpawnDecisionEvent({
        year: next.year,
        week: next.week,
        gamesPublished: next.gamesPublished,
        office: next.office,
        cooldowns: next.eventCooldowns,
        campaignSeed: next.campaignSeed,
        hasProject: false,
        eventSeverity: Math.min(0.55, next.difficulty?.eventSeverity ?? 1) * 0.45,
      });
      if (pending) {
        next.pendingEvent = {
          id: uid("evt"),
          title: pending.title,
          body: pending.body,
          decisionDefId: pending.defId,
          decisionChoices: pending.choices,
          choices: pending.choices.map((c) => ({
            label: c.label,
            effect: c.summary,
          })),
        };
        next.modal = "event";
        next.eventCooldowns = {
          ...next.eventCooldowns,
          [pending.defId]: next.week + 36,
          __any_event__: next.week,
        };
        next.speed = 0;
      }
    }

    // Learn-by-doing RP (ops, sales, research, training — not only build grind)
    {
      const weekly = computeWeeklyLearnByDoing(next);
      next.researchPointsFrac = (next.researchPointsFrac ?? 0) + weekly;
      const flushed = flushResearchPoints(next);
      next.researchPoints = flushed.researchPoints;
      next.researchPointsFrac = flushed.researchPointsFrac;
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
      // Accrue classic GDT design/tech points + field XP while stages run
      if (adv.ticks.length > 0) {
        const stage =
          typeof next.currentProject.stage === "number" ? next.currentProject.stage : 3;
        const stageN = (stage === 1 || stage === 2 || stage === 3 ? stage : 3) as 1 | 2 | 3;
        const isPolish =
          next.currentProject.devPhase === "POLISHING" ||
          next.currentProject.production?.phase === "polish" ||
          next.currentProject.production?.phase === "bug_fixing";
        if (!isPolish && (stageN === 1 || stageN === 2 || stageN === 3)) {
          const eng =
            next.engines.find((e) => e.id === next.currentProject!.engineId) ??
            next.engines[0];
          // Custom engine builder boosts (tech/design mult as % boosts)
          const designBoost = Math.min(40, (eng?.designBonus ?? 0) * 1.2);
          const techBoost = Math.min(45, (eng?.techBonus ?? 0) * 1.2);
          const gen = generateWeekPoints({
            staff: next.staff,
            stage: stageN,
            genreId: next.currentProject.genreId,
            sliders: next.currentProject.sliders,
            size: next.currentProject.size,
            engineFeatures: next.currentProject.features ?? eng?.features ?? [],
            designBoost,
            techBoost,
            seed: hashSeed(
              next.campaignSeed,
              next.currentProject.id,
              "pts",
              next.week,
              stageN,
            ),
          });
          let dGain = gen.designGain;
          let tGain = gen.techGain;
          if (next.currentProject.crunchMode) {
            dGain *= CRUNCH.pointsMult;
            tGain *= CRUNCH.pointsMult;
          }
          // Module 13 first-party synergy
          if (
            next.playerConsoles?.some(
              (c) =>
                c.status === "shipping" &&
                (c.id === next.currentProject!.platformId ||
                  next.currentProject!.platformId.startsWith("console_")),
            )
          ) {
            dGain *= FIRST_PARTY_SYNERGY;
            tGain *= FIRST_PARTY_SYNERGY;
          }
          if ((next.currentProject.fluWeeksLeft ?? 0) > 0) {
            dGain *= 0.5;
          }
          if (next.currentProject.usedIllicitAssets) {
            tGain *= ILLICIT_TECH_BOOST;
          }
          // Module 18 insight by genre post-mortems
          {
            const im = insightMultiplier(next.postMortems ?? [], next.currentProject.genreId);
            dGain *= im;
            tGain *= im;
          }
          // Workshop Module B — genre expertise
          {
            const ge = genreExpMultiplier(next.genreExp?.[next.currentProject.genreId] ?? 0);
            dGain *= ge;
            tGain *= ge;
          }
          // Module 22 — tech debt only after First Office (garage engines do not "fail" post-ship)
          if (!isGaragePhaseOne(next)) {
            const eng =
              next.engines.find((e) => e.id === next.currentProject!.engineId) ??
              next.engines[0];
            if (eng) {
              const td = techDebtPenaltyMultiplier({
                gamesShippedCount: eng.gamesShippedCount ?? 0,
                chronologicalAgeYears: eng.chronologicalAgeYears ?? 0,
              });
              dGain *= td;
              tGain *= td;
            }
          }
          // Module 20 — staff output modifiers
          {
            let mod = 0;
            let n = 0;
            for (const m of next.staff) {
              mod += weeklyOutputModifier({
                status: (m.workStatus ?? "Active") as "Active" | "Vacation",
                fatigue: m.fatigue ?? 0,
              });
              n++;
            }
            const avg = n ? mod / n : 1;
            dGain *= avg;
            tGain *= avg;
          }
          next.currentProject = {
            ...next.currentProject,
            designPoints: next.currentProject.designPoints + dGain,
            techPoints: next.currentProject.techPoints + tGain,
            researchEarned:
              (next.currentProject.researchEarned ?? 0) + 0.45 + next.staff.length * 0.12,
            fluWeeksLeft: Math.max(0, (next.currentProject.fluWeeksLeft ?? 0) - 1),
          };
        } else {
          next.currentProject = {
            ...next.currentProject,
            researchEarned:
              (next.currentProject.researchEarned ?? 0) + 0.2 + next.staff.length * 0.08,
          };
        }
        next.staff = applyDevWeekExperience(next.staff, {
          genreId: next.currentProject.genreId,
          stage: stageN,
        });
      }
      if (next.settings.noBugsMode && next.currentProject) {
        next.currentProject = { ...next.currentProject, bugs: 0 };
      }
      if (adv.cashCost > 0) {
        const t = applyCashTransaction(next.cash, next.ledger, {
          week: next.week,
          amount: -adv.cashCost,
          category: "development",
          label: `Development: ${adv.project.title}`,
          gameId: adv.project.id,
          ref: `dev-${adv.project.id}-w${next.week}`,
        });
        if (t.applied) {
          next = { ...next, cash: t.cash, ledger: t.ledger };
        }
      }
      next.staff = next.staff.map((m) =>
        m.id === "founder" ? { ...m, energy: 100 } : m,
      );
      if (adv.stageJustFinished && next.currentProject) {
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
      if (next.currentProject?.devPhase === "READY_TO_RELEASE") {
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

    // Module 8 — development crises: OFF in Garage Phase One.
    // Later offices: rare soft note only (no modal pause, no forced engine fail).
    if (
      !isGaragePhaseOne(next) &&
      lateSystemAllowed(next, "qualityCrisisEvents") &&
      next.currentProject &&
      next.currentProject.devPhase.includes("RUNNING") &&
      next.week % 12 === 0 &&
      next.currentProject.lastCrisisWeek !== next.week
    ) {
      const crisis = rollDevelopmentCrisis({
        campaignSeed: next.campaignSeed,
        week: next.week,
        projectId: next.currentProject.id,
        crunch: !!next.currentProject.crunchMode,
      });
      // Soft only: small bug tick, no review penalty, no modal, no rent charge
      if (crisis.code !== "CRISIS_05" && crisis.bugsDelta > 0) {
        next.currentProject = {
          ...next.currentProject,
          lastCrisisWeek: next.week,
          bugs: next.currentProject.bugs + Math.min(2, crisis.bugsDelta),
        };
        next.notifications = pushNote(
          next,
          `Minor hiccup: ${crisis.name}. Keep shipping.`,
          "info",
        );
      } else if (next.currentProject) {
        next.currentProject = { ...next.currentProject, lastCrisisWeek: next.week };
      }
    }

    // Module 7 — rival release every 6 weeks
    {
      const last = next.lastRivalReleaseWeek ?? 0;
      if (next.week - last >= 6 && next.week > 0) {
        const idx = next.rivalRotateIndex ?? 0;
        const rel = competitorRelease({
          campaignSeed: next.campaignSeed,
          week: next.week,
          year: next.year,
          historicalAverage: next.targetHighScore ?? 35,
          rivalIndex: idx,
        });
        // Foundation Lock: rival releases never mutate player scoring target.
        next.lastRivalReleaseWeek = next.week;
        next.rivalRotateIndex = (idx + 1) % 3;
        // Genre saturation 8 weeks
        next.rivalGenrePressure = {
          ...(next.rivalGenrePressure ?? {}),
          [rel.genreId]: next.week + 8,
        };
        next.notifications = pushNote(next, rel.note, "info");
        // Module 13 — third-party royalty if they ship on our hardware (abstract share of rival)
        const shippingHw = (next.playerConsoles ?? []).filter((c) => c.status === "shipping");
        if (shippingHw.length) {
          const c0 = shippingHw[0]!;
          const rivalGross = rel.totalPoints * 800; // abstract
          const cut = rivalGross * c0.royaltyRate;
          next.cash += cut;
          next.ledger = applyLedger(next.ledger, {
            week: next.week,
            amount: cut,
            category: "sales",
            label: `${c0.name} third-party royalty`,
            ref: `royalty-${rel.rivalId}-w${next.week}`,
          });
          next.notifications = pushNote(
            next,
            `${c0.name} royalty from industry release: +${formatCash(cut)}.`,
            "good",
          );
        }
        if (next.market) {
          next.market = {
            ...next.market,
            news: [
              {
                id: `rival_${rel.rivalId}_${next.week}`,
                week: next.week,
                category: "rival",
                headline: `${rel.rivalName} ships "${rel.title}"`,
                body: rel.note,
                causeEntityIds: [rel.rivalId],
              },
              ...(next.market.news ?? []),
            ].slice(0, 40),
            calendar: [
              {
                id: `cal_rival_${next.week}`,
                week: next.week,
                kind: "rival_release" as const,
                title: rel.title,
                detail: rel.note,
                entityId: rel.rivalId,
                public: true,
              },
              ...(next.market.calendar ?? []),
            ].slice(0, 80),
          };
        }
      }
      // Expire genre pressure
      if (next.rivalGenrePressure) {
        const press = { ...next.rivalGenrePressure };
        for (const g of Object.keys(press)) {
          if ((press as Record<string, number>)[g]! <= next.week) {
            delete (press as Record<string, number>)[g];
          }
        }
        next.rivalGenrePressure = press;
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

    // Publisher board (Module 3) — season refresh when unlocked
    {
      const unlocked =
        publishingUnlocked({
          gamesPublished: next.gamesPublished,
          fans: next.fans,
          office: next.office,
        }) ||
        next.unlocks.publishing === "owned" ||
        next.gamesPublished >= 2;
      next.publishingBoard = tickPublishingBoard(next.publishingBoard, {
        campaignSeed: next.campaignSeed,
        week: next.week,
        year: next.year,
        fans: next.fans,
        unlocked,
      });
    }

    next = tryFireEvent(next);
    // Netflix Edition — streamer hype decays faster
    if (
      lateSystemAllowed(next, "streamerMarketing") &&
      (next.streamerHypeWeeksLeft ?? 0) > 0
    ) {
      next.hype = streamerHypeDecay(next.hype, next.streamerHypeWeeksLeft ?? 0);
      next.streamerHypeWeeksLeft = Math.max(0, (next.streamerHypeWeeksLeft ?? 0) - 1);
    } else {
      next.hype = tycoonHypeDecay(next.hype); // v2.1 Module 4
    }


    // Trademark infringement (banned names without license) — quarantined in Garage
    if (lateSystemAllowed(next, "ipLitigation") && (next.infringementDue ?? []).length) {
      const due = next.infringementDue ?? [];
      const remain = [];
      for (const item of due) {
        if (next.week < item.dueWeek) {
          remain.push(item);
          continue;
        }
        const lit = rollInfringementLitigation(() => hashSeed(next.campaignSeed, "litigation", item.gameId, next.week) / 4294967296);
        let sales = [...next.activeSales];
        let games = [...next.releasedGames];
        if (lit.salesHalted) {
          sales = sales
            .map((g) =>
              g.id === item.gameId
                ? { ...g, onSale: false, dormant: true, weeklySalesLeft: [] }
                : g,
            )
            .filter((g) => g.onSale && !g.dormant);
          games = games.map((g) =>
            g.id === item.gameId
              ? { ...g, onSale: false, dormant: true, weeklySalesLeft: [] }
              : g,
          );
        }
        if (lit.penaltyCash > 0) {
          next.cash -= lit.penaltyCash;
          next.ledger = applyLedger(next.ledger, {
            week: next.week,
            amount: -lit.penaltyCash,
            category: "other",
            label: `IP settlement: ${item.title}`,
            ref: `tm-lit-${item.gameId}`,
          });
        }
        next.activeSales = sales;
        next.releasedGames = games;
        next.notifications = pushNote(next, `"${item.title}" — ${lit.msg}`, lit.salesHalted ? "bad" : "warn");
      }
      next.infringementDue = remain;
    }

    // Module 17 — IP litigation 2 weeks post-launch
    {
      let sales = [...next.activeSales];
      let games = [...next.releasedGames];
      for (const g of games) {
        if (
          g.usedIllicitAssets &&
          !g.litigationResolved &&
          g.litigationDueWeek != null &&
          next.week >= g.litigationDueWeek
        ) {
          const lit = rollLitigation({
            campaignSeed: next.campaignSeed,
            week: next.week,
            gameId: g.id,
            usedIllicitAssets: true,
          });
          const patched = {
            ...g,
            litigationResolved: true,
            onSale: lit.salesHalted ? false : g.onSale,
            dormant: lit.salesHalted ? true : g.dormant,
            weeklySalesLeft: lit.salesHalted ? [] : g.weeklySalesLeft,
          };
          games = games.map((x) => (x.id === g.id ? patched : x));
          sales = sales
            .map((x) => (x.id === g.id ? patched : x))
            .filter((x) => x.onSale && !x.dormant);
          if (lit.penaltyCash > 0) {
            next.cash -= lit.penaltyCash;
            next.ledger = applyLedger(next.ledger, {
              week: next.week,
              amount: -lit.penaltyCash,
              category: "other",
              label: `Litigation: ${g.title}`,
              gameId: g.id,
              ref: `lit-${g.id}`,
            });
          }
          // Notification only — never pause the campaign with a post-ship "engine/IP fail" modal
          next.notifications = pushNote(next, lit.note, lit.salesHalted ? "bad" : "warn");
        }
      }
      next.releasedGames = games;
      next.activeSales = sales;
    // Module 23 — physical merch weekly shelves
    if (
      lateSystemAllowed(next, "hardwareMerch") &&
      (next.hardwareProducts ?? []).length
    ) {
      const hw = processHardwareWeek(next.hardwareProducts ?? []);
      next.hardwareProducts = hw.products;
      if (hw.cashDelta !== 0) {
        next.cash += hw.cashDelta;
        next.ledger = applyLedger(next.ledger, {
          week: next.week,
          amount: hw.cashDelta,
          category: "sales",
          label: `Hardware margins (${hw.units} units)`,
          ref: `hw-sales-w${next.week}`,
        });
      }
      if (hw.fansDelta) next.fans = Math.max(0, next.fans + hw.fansDelta);
    }

    }

    // Module 11 — Annual G3 Awards (Dec week 4)
    {
      const wom = ((next.week - 1) % 4) + 1;
      if (
        isAwardsNight(next.year, next.month, wom) &&
        next.lastAwardsYear !== next.year
      ) {
        const titles: EligibleTitle[] = (next.releasedGames ?? []).map((g) => ({
          id: g.id,
          title: g.title,
          avgReview: g.avgReview,
          techPoints: g.techPoints,
          designPoints: g.designPoints,
          sales: g.sales,
          isPlayer: true,
          yearReleased: g.yearReleased ?? next.year,
        }));
        // Light rival synthetic entries so awards aren't empty early
        if (lateSystemAllowed(next, "awardsG3") && titles.length) {
          const awards = resolveAnnualAwards({ year: next.year, titles });
          next.lastAwardsYear = next.year;
          let fanGain = 0;
          let rpGain = 0;
          let cashGain = 0;
          for (const a of awards) {
            fanGain += a.fanDelta;
            rpGain += a.rpDelta;
            cashGain += a.cashDelta;
            if (a.isPlayer || a.awardId === "Game_of_the_Year") {
              next.notifications = pushNote(next, a.note, a.fanDelta < 0 ? "bad" : "good");
            }
          }
          next.fans = Math.max(0, next.fans + fanGain);
          next.researchPoints += rpGain;
          next.cash += cashGain;
          if (cashGain > 0) {
            next.ledger = applyLedger(next.ledger, {
              week: next.week,
              amount: cashGain,
              category: "sales",
              label: "G3 Awards sales surge",
              ref: `awards-${next.year}`,
            });
          }
          next.pendingEvent = {
            id: `g3_${next.year}`,
            title: `G3 Awards ${next.year}`,
            body: awards.map((a) => a.note).join("\n") || "Quiet awards season.",
          };
          next.modal = "event";
          next.speed = 0;
        }
      }
    }

    // NeonStore monthly rival royalties — quarantined in Garage / flag off
    if (
      lateSystemAllowed(next, "digitalStorefront") &&
      ((next.week - 1) % 4) === 0 &&
      next.digitalStorefront?.active
    ) {
      const roy = monthlyPlatformRoyalties(next.fans, () =>
        hashSeed(next.campaignSeed, "store-royalty", next.week) / 4294967296,
      );
      next.cash += roy.revenue;
      next.digitalStorefront = {
        ...next.digitalStorefront,
        lastMonthRoyalties: roy.revenue,
        lifetimeRivalRoyalties:
          (next.digitalStorefront.lifetimeRivalRoyalties ?? 0) + roy.revenue,
        rivalTitlesHosted: (next.digitalStorefront.rivalTitlesHosted ?? 0) + 1,
      };
      next.ledger = applyLedger(next.ledger, {
        week: next.week,
        amount: roy.revenue,
        category: "sales",
        label: `${next.digitalStorefront.name} rival royalties (${roy.units} units)`,
        ref: `store-royalty-w${next.week}`,
      });
      if (roy.revenue > 500) {
        next.notifications = pushNote(
          next,
          `${next.digitalStorefront.name}: +${formatCash(roy.revenue)} third-party cut.`,
          "good",
        );
      }
    }

    // MMO monthly economics — quarantined in Garage
    if (
      lateSystemAllowed(next, "mmoLifecycle") &&
      ((next.week - 1) % 4) === 0 &&
      (next.activeMmos ?? []).some((m) => m.active)
    ) {
      const mmo = processMmoMonth(next.activeMmos ?? []);
      next.activeMmos = mmo.mmos;
      if (mmo.cashDelta !== 0) {
        next.cash += mmo.cashDelta;
        next.ledger = applyLedger(next.ledger, {
          week: next.week,
          amount: mmo.cashDelta,
          category: mmo.cashDelta >= 0 ? "sales" : "other",
          label: "MMO subs / server upkeep",
          ref: `mmo-month-w${next.week}`,
        });
      }
      for (const n of mmo.notes) {
        next.notifications = pushNote(next, n, "warn");
      }
    }

    // Module 13 — player console tick — quarantined in Garage
    if (lateSystemAllowed(next, "playerConsoles") && next.playerConsoles?.length) {
      const updated = [];
      for (const c of next.playerConsoles) {
        const r = tickPlayerConsole(c, next.week, next.fans);
        updated.push(r.console);
        if (r.cashDelta !== 0) {
          next.cash += r.cashDelta;
          if (Math.abs(r.cashDelta) > 100) {
            next.ledger = applyLedger(next.ledger, {
              week: next.week,
              amount: r.cashDelta,
              category: r.cashDelta >= 0 ? "sales" : "other",
              label: `${c.name} hardware`,
              ref: `hw-${c.id}-w${next.week}`,
            });
          }
        }
        if (r.note) next.notifications = pushNote(next, r.note, "good");
      }
      next.playerConsoles = updated;
    }


    // Module 15 — bankruptcy halt (no further auto-advance)
    next.cash = moneyRound(next.cash);
    next.fans = intFans(next.fans);

    if (isBankrupt(next.cash, !!next.settings.disableBankruptcy)) {
      next.speed = 0;
      if (next.cash < -5000 && !next.currentProject && next.activeSales.length === 0) {
        next.phase = "gameover";
        next.notifications = pushNote(
          next,
          "[GAME OVER] Your company has defaulted on debts. Load a save to continue.",
          "bad",
        );
      } else if (next.cash < 0) {
        next.notifications = pushNote(
          next,
          "Cash below $0 — timeline paused. Earn sales or load a backup.",
          "bad",
        );
      }
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
      officeSubTier: state.officeSubTier,
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

    // Part 3: freeze engine snapshot at project start (immutable for this game)
    const workshop =
      state.engineWorkshop ??
      ensureWorkshopFromEngines(state.engines, null, "player", state.week, state.year);
    const wantsOnline = project.features.some((f) => /online|multiplayer/i.test(f));
    project.engineSnapshot = captureGameEngineSnapshot({
      gameId: project.id,
      engineVersionId: engine.id,
      workshop,
      genreId: project.genreId,
      size: project.size,
      platformId: project.platformId,
      staff: state.staff,
      week: state.week,
      year: state.year,
      wantsOnline,
    });
    // Part 4: preproduction tech targets (FPS, budgets, cert placeholders)
    project.techSpec = createProjectTechSpec({
      gameId: project.id,
      platformId: project.platformId,
      size: project.size,
      genreId: project.genreId,
      wantsOnline,
    });
    // Part 2: pillar + effective production importance (topic tags reshape genre)
    const pillar = (partial.pillar ?? state.draft?.pillar ?? "default") as ProjectPillar;
    project.pillar = pillar;
    project.fieldImportance = computeEffectiveImportance({
      genreId: project.genreId,
      topicId: project.topicId,
      pillar,
    });
    project.pricing = createProductPricing({
      size: project.size,
      basePrice: project.launchPrice ?? 25,
      week: state.week,
      year: state.year,
    });

    {
    const txn = applyCashTransaction(state.cash, state.ledger, {
      week: state.week,
      amount: -cost,
      category: "development",
      label: `Start project: ${project.title}`,
      ref: `dev-start-${project.id}`,
    });
    if (!txn.applied) return "Project start already charged.";
    set({
      cash: txn.cash,
      ledger: txn.ledger,
      currentProject: project,
      engineWorkshop: workshop,
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
    }
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
    let project = planned.project;
    const cash = state.cash;
    let notes = pushNote(state, `Stage ${stageNum} started.`, "info");
    let modal: GameState["modal"] = null;
    let pendingEvent: GameState["pendingEvent"] = state.pendingEvent;

    // Quality crisis — quarantined in Garage Phase One (Foundation Lock)
    if (
      lateSystemAllowed(state, "qualityCrisisEvents") &&
      stageNum === 1 &&
      !(project as { qualityCrisisRolled?: boolean }).qualityCrisisRolled
    ) {
      const crisis = rollQualityCrisis(
        () => hashSeed(state.campaignSeed, project.id, "quality-crisis", state.week) / 4294967296,
      );
      (project as { qualityCrisisRolled?: boolean }).qualityCrisisRolled = true;
      if (crisis.code !== "EVT_CLEAN") {
        if (crisis.hypeDelta) {
          // applied on state below
        }
        if (crisis.rpDelta) {
          // researchPoints adjust
        }
        if (crisis.extraWeeks) {
          project = {
            ...project,
            weeksDev: (project.weeksDev ?? 0) - crisis.extraWeeks,
          };
        }
        if (crisis.code === "EVT_COPY") {
          (project as { pendingCopyCrisis?: boolean }).pendingCopyCrisis = true;
          pendingEvent = {
            id: `crisis_${crisis.code}_${state.week}`,
            title: crisis.title,
            body: `${crisis.note} Use More → accept/refuse settlement ($45k vs −1.5 score).`,
          };
          modal = "event";
        } else {
          pendingEvent = {
            id: `crisis_${crisis.code}_${state.week}`,
            title: crisis.title,
            body: crisis.note,
          };
          modal = "event";
        }
        notes = pushNote({ ...state, notifications: notes }, crisis.note, "warn");
        set({
          cash: cash + crisis.cashDelta,
          researchPoints: Math.max(0, state.researchPoints + crisis.rpDelta),
          hype: Math.max(0, state.hype + crisis.hypeDelta),
          currentProject: project,
          speed: crisis.code === "EVT_COPY" ? 0 : 1,
          screen: "develop",
          dirty: true,
          notifications: notes,
          modal,
          pendingEvent,
          ledger:
            crisis.cashDelta !== 0
              ? applyLedger(state.ledger, {
                  week: state.week,
                  amount: crisis.cashDelta,
                  category: "other",
                  label: crisis.title,
                  ref: `qcrisis-${crisis.code}-w${state.week}`,
                })
              : state.ledger,
        });
        return null;
      }
    }

    set({
      currentProject: project,
      speed: 1,
      screen: "develop",
      dirty: true,
      notifications: notes,
    });
    return null;
  },

  beginPolishRelease: () => {},

  workPolishWeek: () => {
    const state = get();
    const p = state.currentProject;
    if (!p) return "No project.";
    if (
      p.devPhase !== "POLISHING" &&
      p.production?.phase !== "bug_fixing" &&
      p.production?.phase !== "polish" &&
      p.production?.phase !== "finalize_build"
    ) {
      return "Only available during polish / bug-fix.";
    }
    // Foundation Lock: same weekly settlement as advanceWeek (rent/sales/etc).
    // Production polish progress is applied inside tick() for active projects.
    return get().advanceWeek();
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

    // Part 4: refresh performance profile + release readiness / certification
    proj = withTechReadiness(proj, state);

    const rec = proj.techSpec?.readiness?.recommendation;
    const note =
      rec === "blocked"
        ? "Pre-Release blocked by certification or blockers — see tech gates."
        : rec === "hold"
          ? "Pre-Release: tech recommends holding. Set title/price or keep fixing."
          : "Pre-Release: set final title and price.";

    set({
      currentProject: { ...proj, devPhase: "READY_TO_RELEASE" },
      speed: 0,
      dirty: true,
      notifications: pushNote(state, note, rec === "blocked" ? "warn" : "info"),
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
    const catalogTech = getTech(id);
    if (!item && !catalogTech) return "Unknown research.";
    if (state.researched.includes(id)) return "Already researched.";
    if (item?.requires?.some((r) => !state.researched.includes(r))) return "Missing prerequisites.";
    if (item?.minYear && state.year < item.minYear) return `Available from ${item.minYear}.`;
    if (catalogTech && state.year < catalogTech.earliestYear) {
      return `Too early — earliest ${catalogTech.earliestYear}.`;
    }

    let pipe = state.researchPipeline ?? seedGarageTechPipeline(state.year);
    pipe = syncLegacyResearched(pipe, state.researched, state.week);

    if (catalogTech) {
      const check = tryMarkResearchable(pipe, id, {
        year: state.year,
        pipe,
        researchedLegacy: state.researched,
        office: state.office,
        hasRnd: state.flags.rndLab,
      });
      pipe = check;
      const started = beginTechResearch(pipe, id, state.year, state.week);
      if (started.error) return started.error;
      pipe = started.pipe;
      const cost = Math.ceil((catalogTech.researchRp || item?.cost || 20) * started.costMult);
      if (state.researchPoints < cost) return "Not enough RP.";
      if (catalogTech.researchCash > 0 && state.cash < catalogTech.researchCash) {
        return `Needs $${catalogTech.researchCash.toLocaleString()} cash.`;
      }
      const weeks = started.weeks || item?.weeks || 2;
      // Design-only instant path
      if (weeks === 0) {
        set({
          researchPoints: state.researchPoints - cost,
          cash: state.cash - (catalogTech.researchCash || 0),
          researched: [...state.researched, id],
          researchPipeline: pipe,
          dirty: true,
          notifications: pushNote(state, `${catalogTech.name} ready for production (design feature).`, "good"),
        });
        return null;
      }
      set({
        researchPoints: state.researchPoints - cost,
        cash: state.cash - (catalogTech.researchCash || 0),
        researchPipeline: pipe,
        activeResearch: {
          id: uid("job"),
          kind: "tech",
          targetId: id,
          name: catalogTech.name,
          weeksLeft: weeks,
          totalWeeks: weeks,
        },
        dirty: true,
        notifications: pushNote(
          state,
          `Researching: ${catalogTech.name} (${weeks}w) — pipeline, not a shop purchase.`,
          "info",
        ),
      });
      return null;
    }

    if (!item) return "Unknown research.";
    if (state.researchPoints < item.cost) return "Not enough RP.";
    const weeks = item.weeks ?? Math.max(2, Math.ceil(item.cost / 25));
    set({
      researchPoints: state.researchPoints - item.cost,
      researchPipeline: pipe,
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
    const cap = staffCapForOffice({
      office: state.office,
      officeSubTier: state.officeSubTier,
      baseCapacity: OFFICE_INFO[state.office as 1 | 2 | 3 | 4 | 5].capacity,
    });
    if (state.staff.length >= cap) return "No desk space.";
    // Signing package: 1× annual salary equivalent, hard cap $2M
    const packageCost = Math.min(Math.max(candidate.salary, 1), MAX_HIRE_BUDGET);
    if (packageCost > MAX_HIRE_BUDGET) return "Exceeds $2M hire budget.";
    if (state.cash < packageCost) return `Need ${packageCost.toLocaleString()} for signing.`;
    const starNote =
      candidate.level >= 5
        ? ` Unexpected talent — Lv ${candidate.level}.`
        : "";
    let next: GameState = {
      ...state,
      cash: state.cash - packageCost,
      staff: [...state.staff, { ...candidate, energy: 100, training: null }],
      dirty: true,
      notifications: pushNote(
        state,
        `Hired ${candidate.name} (Lv ${candidate.level}).${starNote}`,
        candidate.level >= 5 ? "good" : "info",
      ),
      researchPointsFrac: (state.researchPointsFrac ?? 0) + 0.4, // learn-by-doing: recruiting
    };
    next.ledger = applyLedger(next.ledger, {
      week: next.week,
      amount: -packageCost,
      category: "payroll",
      label: `Signing: ${candidate.name}`,
      ref: `hire-${candidate.id}`,
    });
    next = applyUnlockNotes(next);
    set(next);
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
    const state = get();
    const y = state.year;
    const refresh = (state.hiringBoardRefresh ?? 0) + 1;
    const bias = 1 + Math.min(1.2, (y - 1979) * 0.015);
    const board = Array.from({ length: 5 }, (_, i) =>
      generateStaff(
        bias + (hashSeed(state.campaignSeed, "hire-bias", refresh, i) / 4294967296) * 0.35,
        y,
        {
          forceStar: i === 0 && hashSeed(state.campaignSeed, "hire-star", refresh) / 4294967296 < 0.2,
          seed: hashSeed(state.campaignSeed, "hire", refresh, i),
          candidateIndex: i,
        },
      ),
    );
    // Guarantee at least one above-average candidate (still pure via seed)
    if (!board.some((c) => c.level >= 3)) {
      board[0] = generateStaff(bias + 0.5, y, {
        forceStar: true,
        seed: hashSeed(state.campaignSeed, "hire-star-force", refresh),
        candidateIndex: 0,
      });
    }
    set({ hiringBoard: board, hiringBoardRefresh: refresh, dirty: true });
    return board;
  },
  getCandidates: () => {
    const state = get();
    if (state.hiringBoard?.length) return state.hiringBoard;
    // First view generates refresh 1 without mutating if empty path — generate & persist
    const y = state.year;
    const refresh = 1;
    const board = Array.from({ length: 5 }, (_, i) =>
      generateStaff(1.1, y, {
        seed: hashSeed(state.campaignSeed, "hire", refresh, i),
        candidateIndex: i,
      }),
    );
    set({ hiringBoard: board, hiringBoardRefresh: refresh });
    return board;
  },

  getTrainingCourses: () => TRAINING_COURSES,

  trainStaff: (staffId, courseId) => {
    const state = get();
    if (state.unlocks.training !== "owned" && state.office < 2) {
      return "Training locked — unlocks after First Office.";
    }
    const course = getTrainingCourse(courseId);
    if (!course) return "Unknown course.";
    const member = state.staff.find((m) => m.id === staffId);
    if (!member) return "Staff not found.";
    if (state.cash < course.cashCost) return "Not enough cash.";
    if (state.researchPoints < course.rpCost) return "Not enough RP.";
    const result = startTrainingOnMember(member, course);
    if (typeof result === "string") return result;
    const next: GameState = {
      ...state,
      cash: state.cash - course.cashCost,
      researchPoints: state.researchPoints - course.rpCost,
      staff: state.staff.map((m) => (m.id === staffId ? result : m)),
      dirty: true,
      notifications: pushNote(
        state,
        `${member.name} started ${course.name} (${course.weeks}w).`,
        "info",
      ),
    };
    next.ledger = applyLedger(next.ledger, {
      week: next.week,
      amount: -course.cashCost,
      category: "research",
      label: `Training: ${course.name}`,
      ref: `train-${staffId}-${courseId}-${next.week}`,
    });
    set(next);
    return null;
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
    // Prefer progression offer path when foundation flag is on (garage → first only)
    if (isFeatureEnabled("officeFoundation") && normalizeOfficeLevel(get().office) === 1) {
      return get().acceptOfficeOffer();
    }
    const state = get();
    const check = canAdvanceOffice({
      office: state.office,
      cash: state.cash,
      staffCount: state.staff.length,
      staff: state.staff,
      officeEnteredYear: state.officeEnteredYear ?? state.year,
      officeEnteredMonth: state.officeEnteredMonth ?? state.month,
      currentYear: state.year,
      currentMonth: state.month,
    });
    if (!check.ok) return check.error;
    const stage = stageForOffice(check.next);
    let next: GameState = {
      ...state,
      cash: state.cash - check.cost,
      office: check.next,
      officeEnteredYear: state.year,
      officeEnteredMonth: state.month,
      dirty: true,
      notifications: pushNote(
        state,
        `Moved into ${stage.name}. Rent ${formatCash(stage.rent)}/mo · seats ${stage.staffMax} · sizes: ${stage.allowedSizes.join(", ")}.`,
        "good",
      ),
    };
    if (check.cost > 0) {
      next.ledger = applyLedger(next.ledger, {
        week: next.week,
        amount: -check.cost,
        category: "other",
        label: `Office move: ${stage.name}`,
        ref: `office-${check.next}-y${state.year}`,
      });
    }
    // Unlock notes by level
    if (check.next === 2) {
      next.unlocks = { ...next.unlocks, hiring: "owned", training: "owned", publishing: "owned" };
      next.notifications = pushNote(next, "Staff hiring, training, and publisher deals unlocked.", "info");
    }
    if (check.next === 3) {
      next.unlocks = { ...next.unlocks, marketing: next.unlocks.marketing ?? "owned" };
      next.notifications = pushNote(next, "Mega-complex: marketing + accessory factory online.", "info");
    }
    if (check.next === 4) {
      next.unlocks = { ...next.unlocks, aaa: next.unlocks.aaa ?? "available", hardware_lab: "owned" };
      next.notifications = pushNote(next, "R&D Lab online — AAA and console manufacturing path open.", "info");
    }
    next = applyUnlockNotes(next);
    set(next);
    return null;
  },

  acceptOfficeOffer: () => {
    const state = get();
    const prog = migrateStudioProgression(state.progression, state.office);
    const result = acceptFirstOfficeMove(state, prog);
    if (!result.ok) return result.error;
    const next: GameState = applyUnlockNotes({
      ...result.state,
      progression: result.progression,
      modal: null,
    });
    set(next);
    return null;
  },

  deferOfficeOffer: () => {
    const state = get();
    const prog = migrateStudioProgression(state.progression, state.office);
    const result = deferFirstOfficeOffer(state, prog);
    if (!result.ok) return result.error;
    set({ ...result.state, progression: result.progression, modal: null });
    return null;
  },

  buildEngine: (name, featureIds) => {
    // Bridge: map legacy feature-id list → module build
    return get().startEngineVersion({
      name,
      moduleIds: featureIds.length
        ? featureIds
            .map((fid) => SELECTABLE_MODULES.find((m) => m.componentId === fid || m.id === fid)?.id)
            .filter((x): x is string => !!x)
        : undefined,
      purpose: "fast_2d",
      architecture: "modular",
      lifespan: "multi_project",
      targetPlatforms: get().unlockedPlatforms.slice(0, 2),
      targetSizes: ["small", "medium"],
    });
  },

  startEngineVersion: (opts) => {
    const state = get();
    if (state.unlocks.engines !== "owned" && state.gamesPublished < 1) {
      return "Engines locked — ship a title or unlock the workshop.";
    }
    const workshop =
      state.engineWorkshop ??
      ensureWorkshopFromEngines(
        state.engines,
        null,
        "player",
        state.week,
        state.year,
      );
    const result = startEngineBuild({
      workshop,
      name: opts.name,
      purpose: opts.purpose ?? "fast_2d",
      secondaryPurposes: [],
      architecture: opts.architecture ?? "modular",
      lifespan: opts.lifespan ?? "multi_project",
      priorities: {
        development_speed: 3,
        stability: 3,
        maintainability: 2,
        runtime_performance: 2,
        modularity: 2,
      },
      moduleIds: opts.moduleIds ?? [],
      targetPlatforms: opts.targetPlatforms ?? state.unlockedPlatforms.slice(0, 2),
      targetSizes: opts.targetSizes ?? ["small", "medium"],
      familyId: opts.familyId,
      bump: opts.bump,
      staff: state.staff,
      week: state.week,
      year: state.year,
      companyId: "player",
      cash: state.cash,
    });
    if (!result.ok) return result.error;
    set({
      cash: state.cash - result.cost,
      engineWorkshop: result.workshop,
      dirty: true,
      notifications: pushNote(
        state,
        `Engine project started: ${result.project.name} (~${result.project.weeksEstimate}w, ${formatCash(result.cost)}).`,
        "info",
      ),
    });
    return null;
  },


  runOptimizationTask: (taskId) => {
    const state = get();
    const p = state.currentProject;
    if (!p?.techSpec) return "No tech profile on this project.";
    if (p.devPhase !== "POLISHING" && p.devPhase !== "READY_TO_RELEASE") {
      return "Optimization runs during polish / pre-release.";
    }
    const power =
      state.staff.reduce((s, m) => s + m.tech / 100 + (m.specialization === "engine" ? 0.3 : 0), 0) /
      Math.max(1, state.staff.length);
    const { tech, note, qualityHit } = applyOptimizationWeek(p.techSpec, taskId, power);
    let project: GameProject = { ...p, techSpec: tech };
    if (qualityHit > 0) {
      project = {
        ...project,
        designPoints: Math.max(0, project.designPoints - qualityHit * 8),
        techPoints: Math.max(0, project.techPoints - qualityHit * 4),
      };
    }
    project = withTechReadiness(project, state);
    set({
      currentProject: project,
      dirty: true,
      notifications: pushNote(state, note, "info"),
    });
    return null;
  },

  evaluateTechReadiness: () => {
    const state = get();
    const p = state.currentProject;
    if (!p) return "No project.";
    const project = withTechReadiness(p, state);
    const r = project.techSpec?.readiness;
    set({
      currentProject: project,
      dirty: true,
      notifications: pushNote(
        state,
        r
          ? `Tech readiness: ${r.recommendation.replace(/_/g, " ")} — ${r.recommendationReason}`
          : "Tech profile updated.",
        r?.recommendation === "blocked" ? "warn" : "info",
      ),
    });
    return null;
  },


  acceptPublisherDeal: (id) => {
    const state = get();
    if (isGaragePhaseOne(state) || !lateSystemAllowed(state, "publishers")) {
      return "Publishing locked during Garage Phase One.";
    }
    const unlocked =
      publishingUnlocked({
        gamesPublished: state.gamesPublished,
        fans: state.fans,
        office: state.office,
      }) ||
      state.unlocks.publishing === "owned" ||
      state.gamesPublished >= 2;
    if (!unlocked) return "Publishing board locked — ship more games or grow fans.";
    const board = state.publishingBoard;
    if (!board?.deals?.length) return "No publisher offers right now.";
    const deal = board.deals.find((d) => d.id === id);
    if (!deal) return "Unknown deal.";
    if (state.week >= deal.expirationWeek) return "That offer expired.";
    // Upfront cash (covers development risk)
    const txn = applyCashTransaction(state.cash, state.ledger, {
      week: state.week,
      amount: deal.upfrontPayment,
      category: "publisher",
      label: `Publisher advance: ${deal.publisherName}`,
      ref: `pub-advance-${deal.id}`,
    });
    if (!txn.applied) return "Advance already recorded.";
    set({
      cash: txn.cash,
      ledger: txn.ledger,
      activePublisherDealId: deal.id,
      dirty: true,
      notifications: pushNote(
        state,
        `${deal.publisherName} signed: +${formatCash(deal.upfrontPayment)} advance. Hit ${deal.minimumReviewScore}+ reviews.`,
        "good",
      ),
    });
    return null;
  },

  refreshPublisherBoard: () => {
    const state = get();
    if (isGaragePhaseOne(state) || !lateSystemAllowed(state, "publishers")) {
      return "Publishing locked during Garage Phase One.";
    }
    const board = state.publishingBoard ?? generatePublishingBoard({
      campaignSeed: state.campaignSeed,
      week: state.week,
      year: state.year,
      fans: state.fans,
    });
    const res = refreshPublishingBoard(board, {
      campaignSeed: state.campaignSeed,
      week: state.week,
      year: state.year,
      fans: state.fans,
      cash: state.cash,
    });
    if (res.error) return res.error;
    set({ publishingBoard: res.board, cash: res.cash, dirty: true });
    return null;
  },

  clearPublisherDeal: () => set({ activePublisherDealId: null, dirty: true }),

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



  toggleCrunchMode: () => {
    const state = get();
    const p = state.currentProject;
    if (!p) return "No active project.";
    if (!p.devPhase.includes("RUNNING") && !p.devPhase.includes("CONFIG") && p.devPhase !== "POLISHING") {
      return "Crunch only during development.";
    }
    const on = !p.crunchMode;
    set({
      currentProject: { ...p, crunchMode: on },
      dirty: true,
      notifications: pushNote(
        state,
        on
          ? "Crunch ON — +45% points, −18 energy/wk, crisis risk up."
          : "Crunch OFF — sustainable pace.",
        on ? "warn" : "info",
      ),
    });
    return null;
  },

  setSecondaryPlatforms: (ids) => {
    const state = get();
    const p = state.currentProject;
    if (!p) return "No active project.";
    const uniq = [...new Set(ids.filter((id) => id && id !== p.platformId))].slice(0, 2);
    for (const id of uniq) {
      if (!state.unlockedPlatforms.includes(id)) {
        return `License ${id} first under Systems.`;
      }
    }
    // Dev kit fee for new secondary (60% of license) — charge delta
    let fee = 0;
    const prev = new Set(p.secondaryPlatformIds ?? []);
    for (const id of uniq) {
      if (prev.has(id)) continue;
      const plat = getPlatform(id);
      if (plat) fee += plat.licenseCost * 0.6;
    }
    if (fee > 0 && state.cash < fee) return `Need ${formatCash(fee)} multi-platform kits.`;
    const weeksExtra = multiPlatformTimePenaltyWeeks(uniq.length);
    let nextP: typeof p = { ...p, secondaryPlatformIds: uniq };
    if (weeksExtra > 0 && nextP.production) {
      nextP = {
        ...nextP,
        production: {
          ...nextP.production,
          polishRequired: (nextP.production.polishRequired ?? 0) + weeksExtra * 70,
        },
      };
    }
    set({
      cash: state.cash - fee,
      currentProject: nextP,
      dirty: true,
      notifications: pushNote(
        state,
        uniq.length
          ? `Multi-platform: ${uniq.join(", ")} (+${weeksExtra}w${fee ? `, −${formatCash(fee)}` : ""}).`
          : "Secondary platforms cleared.",
        "info",
      ),
      ledger:
        fee > 0
          ? applyLedger(state.ledger, {
              week: state.week,
              amount: -fee,
              category: "other",
              label: "Multi-platform kits",
              ref: `mp-kit-${p.id}`,
            })
          : state.ledger,
    });
    return null;
  },


  issuePatch: (gameId) => {
    const state = get();
    const g = state.releasedGames.find((x) => x.id === gameId);
    if (!g) return "Game not found.";
    if (!canPatchTitle(g)) return "Nothing to patch (no bugs or delisted).";
    if (state.researchPoints < PATCH.rpCost) return `Need ${PATCH.rpCost} RP.`;
    const math = applyPatchMath(g);
    const patch = {
      bugs: math.bugsAfter,
      patchSalesBoost: (g.patchSalesBoost ?? 0) + math.salesBoost,
    };
    // Boost remaining weekly sales left
    const weekly = (g.weeklySalesLeft ?? []).map((u) =>
      Math.floor(u * (1 + math.salesBoost)),
    );
    set({
      researchPoints: state.researchPoints - PATCH.rpCost,
      releasedGames: state.releasedGames.map((x) =>
        x.id === gameId ? { ...x, ...patch, weeklySalesLeft: weekly.length ? weekly : x.weeklySalesLeft } : x,
      ),
      activeSales: state.activeSales.map((x) =>
        x.id === gameId ? { ...x, ...patch, weeklySalesLeft: weekly.length ? weekly : x.weeklySalesLeft } : x,
      ),
      dirty: true,
      notifications: pushNote(state, math.note, "good"),
    });
    return null;
  },

  buildDlc: (gameId) => {
    const state = get();
    const g = state.releasedGames.find((x) => x.id === gameId);
    if (!g) return "Game not found.";
    if (!canBuildDlc(g)) {
      return "DLC needs Medium+ title still on shelves, once per game.";
    }
    // Instant resolve after "2 weeks" abstracted as immediate for UX; cost is time opportunity - charge small cash
    const units = dlcUnitsSold(g.sales, g.avgReview);
    const revenue = units * DLC.price * 0.85;
    set({
      cash: state.cash + revenue,
      releasedGames: state.releasedGames.map((x) =>
        x.id === gameId
          ? {
              ...x,
              hasDlc: true,
              dlcRevenue: (x.dlcRevenue ?? 0) + revenue,
              // shelf life extension: add 4 weeks residual if empty
              weeklySalesLeft: [
                ...(x.weeklySalesLeft ?? []),
                ...Array.from({ length: 4 }, () => Math.max(10, Math.floor(units / 8))),
              ],
              onSale: true,
              dormant: false,
            }
          : x,
      ),
      activeSales: (() => {
        const updated = state.releasedGames
          .map((x) =>
            x.id === gameId
              ? {
                  ...x,
                  hasDlc: true,
                  dlcRevenue: (x.dlcRevenue ?? 0) + revenue,
                  weeklySalesLeft: [
                    ...(x.weeklySalesLeft ?? []),
                    ...Array.from({ length: 4 }, () => Math.max(10, Math.floor(units / 8))),
                  ],
                  onSale: true,
                  dormant: false,
                }
              : x,
          )
          .filter((x) => x.onSale && !x.dormant);
        return updated;
      })(),
      dirty: true,
      notifications: pushNote(
        state,
        `DLC for "${g.title}": ${units.toLocaleString()} packs · +${formatCash(revenue)}.`,
        "good",
      ),
      ledger: applyLedger(state.ledger, {
        week: state.week,
        amount: revenue,
        category: "sales",
        label: `DLC: ${g.title}`,
        gameId,
        ref: `dlc-${gameId}`,
      }),
    });
    return null;
  },

  startPlayerConsole: (tier, name) => {
    const state = get();
    if (!hardwareUnlocked(state.office, state.cash, state.flags.hardwareLab)) {
      return `Need office ${HARDWARE_UNLOCK.minOffice}+ and serious capital (≈$${HARDWARE_UNLOCK.minCash.toLocaleString()}).`;
    }
    const t = HARDWARE_TIERS[tier];
    if (state.cash < t.dev_cost) return `Need ${formatCash(t.dev_cost)}.`;
    if (state.researchPoints < t.rp_cost) return `Need ${t.rp_cost} RP.`;
    if ((state.playerConsoles ?? []).some((c) => c.status === "developing")) {
      return "Already developing a console.";
    }
    const started = startConsoleDev({
      tier,
      customName: name,
      week: state.week,
      seed: hashSeed(state.campaignSeed, "console", state.week, tier),
    });
    // Register as platform for first-party shipping
    const platId = started.console.id;
    set({
      cash: state.cash - started.cost,
      researchPoints: state.researchPoints - started.rp,
      playerConsoles: [...(state.playerConsoles ?? []), started.console],
      unlockedPlatforms: state.unlockedPlatforms.includes(platId)
        ? state.unlockedPlatforms
        : [...state.unlockedPlatforms, platId],
      flags: { ...state.flags, hardwareLab: true },
      dirty: true,
      notifications: pushNote(
        state,
        `Hardware program: ${started.console.name} (${started.console.weeksLeft}w, −${formatCash(started.cost)}).`,
        "info",
      ),
      ledger: applyLedger(state.ledger, {
        week: state.week,
        amount: -started.cost,
        category: "other",
        label: `Console R&D: ${started.console.name}`,
        ref: `console-${platId}`,
      }),
    });
    return null;
  },


  setProjectDrm: (drm) => {
    const state = get();
    const p = state.currentProject;
    if (!p) return "No active project.";
    const unlocked = state.unlockedDrm ?? ["None"];
    if (!unlocked.includes(drm) && drm !== "None") {
      return "Research/unlock that DRM tier first.";
    }
    set({
      currentProject: { ...p, drmTier: drm },
      dirty: true,
      notifications: pushNote(state, `DRM set: ${drm}`, "info"),
    });
    return null;
  },


  toggleIllicitAssets: () => {
    const state = get();
    const p = state.currentProject;
    if (!p) return "No active project.";
    const on = !p.usedIllicitAssets;
    set({
      currentProject: { ...p, usedIllicitAssets: on },
      dirty: true,
      notifications: pushNote(
        state,
        on
          ? "Illicit assets ON — +30% tech, $0 kits, litigation risk after launch."
          : "Illicit assets OFF — clean pipeline.",
        on ? "warn" : "info",
      ),
    });
    return null;
  },

  runPostMortem: (gameId) => {
    const state = get();
    const g = state.releasedGames.find((x) => x.id === gameId);
    if (!g) return "Game not found.";
    if (g.onSale && (g.weeklySalesLeft?.length ?? 0) > 0) {
      return "Wait until the title leaves shelves (or shelf empties).";
    }
    if (g.postMortemDone) return "Post-mortem already filed.";
    if (state.researchPoints < POST_MORTEM.rpCost) return `Need ${POST_MORTEM.rpCost} RP.`;
    const pm = buildPostMortem({
      gameId: g.id,
      title: g.title,
      topicId: g.topicId,
      genreId: g.genreId,
      sliderMiss: g.sliderMissAtShip ?? 0.25,
      week: state.week,
    });
    const key = `${g.topicId}:${g.genreId}`;
    set({
      researchPoints: state.researchPoints - POST_MORTEM.rpCost,
      postMortems: [...(state.postMortems ?? []), pm],
      knownCombos: { ...(state.knownCombos ?? {}), [key]: pm.matchLabel },
      releasedGames: state.releasedGames.map((x) =>
        x.id === gameId ? { ...x, postMortemDone: true } : x,
      ),
      dirty: true,
      notifications: pushNote(
        state,
        `Post-mortem "${g.title}": ${pm.matchLabel} (${pm.comboMult}x) · sliders ${pm.sliderVerdict}.`,
        "good",
      ),
    });
    // Telemetry print
    const hist = (get().gameHistoryLedger ?? []).find((h) => h.gameId === gameId);
    if (hist) {
      set({
        pendingEvent: {
          id: `telem_${gameId}`,
          title: "Post-mortem telemetry",
          body: formatTelemetryBlock(hist),
        },
        modal: "event",
        speed: 0,
      });
    }
    return null;
  },

  refactorEngine: (engineId?: string) => {
    const state = get();
    const id = engineId ?? state.engines[0]?.id;
    const eng = state.engines.find((e) => e.id === id);
    if (!eng) return "No engine.";
    if (state.cash < ENGINE_REFACTOR.cash) return `Need ${formatCash(ENGINE_REFACTOR.cash)}.`;
    if (state.researchPoints < ENGINE_REFACTOR.rp) return `Need ${ENGINE_REFACTOR.rp} RP.`;
    set({
      cash: state.cash - ENGINE_REFACTOR.cash,
      researchPoints: state.researchPoints - ENGINE_REFACTOR.rp,
      week: state.week, // week cost applied by caller advance optional
      engines: state.engines.map((e) =>
        e.id === eng.id
          ? { ...e, gamesShippedCount: 0, chronologicalAgeYears: 0 }
          : e,
      ),
      dirty: true,
      notifications: pushNote(
        state,
        `Refactored "${eng.name}" — tech debt cleared (−${formatCash(ENGINE_REFACTOR.cash)}, −${ENGINE_REFACTOR.rp} RP).`,
        "good",
      ),
      ledger: applyLedger(state.ledger, {
        week: state.week,
        amount: -ENGINE_REFACTOR.cash,
        category: "research",
        label: "Engine refactor",
        ref: `refactor-${eng.id}-${state.week}`,
      }),
    });
    return null;
  },

  sendStaffOnVacation: (staffId: string) => {
    const state = get();
    const m = state.staff.find((x) => x.id === staffId);
    if (!m) return "Unknown staff.";
    if (m.workStatus === "Vacation") return "Already on leave.";
    set({
      staff: state.staff.map((x) =>
        x.id === staffId
          ? { ...x, workStatus: "Vacation" as const, busy: false }
          : x,
      ),
      dirty: true,
      notifications: pushNote(state, `${m.name} granted rest leave.`, "info"),
    });
    return null;
  },

  signOpsPublisher: (publisherId: string) => {
    const state = get();
    if (isGaragePhaseOne(state) || !lateSystemAllowed(state, "publishers")) {
      return "Publishing locked during Garage Phase One.";
    }
    const offer = PUBLISHER_MATRIX.find((p) => p.id === publisherId);
    if (!offer) return "Unknown publisher.";
    if (state.fans < offer.minFans) return `Need ${offer.minFans.toLocaleString()} fans.`;
    if (state.activePublisherDealId) return "Already bound to a publisher deal.";
    const txn = applyCashTransaction(state.cash, state.ledger, {
      week: state.week,
      amount: offer.advancePay,
      category: "publisher",
      label: `Publisher advance: ${offer.company}`,
      ref: `ops-pub-${offer.id}`,
    });
    if (!txn.applied) return "Advance already recorded.";
    set({
      cash: txn.cash,
      ledger: txn.ledger,
      activePublisherDealId: offer.id,
      dirty: true,
      notifications: pushNote(
        state,
        `${offer.company} advance +${formatCash(offer.advancePay)}. Hit ${offer.reqScore}+ or pay 60% breach fine.`,
        "good",
      ),
    });
    return null;
  },

  renovateHighDensity: () => {
    const state = get();
    if (state.office !== 2) return "High-Density Bay is a Tech Park (Level 2) renovation.";
    if (isHighDensity(state.officeSubTier)) return "Already renovated to High-Density Bay.";
    if (state.cash < HIGH_DENSITY.cashCost) return `Need ${formatCash(HIGH_DENSITY.cashCost)}.`;
    set({
      cash: state.cash - HIGH_DENSITY.cashCost,
      officeSubTier: 2.5,
      dirty: true,
      notifications: pushNote(
        state,
        `High-Density Bay online — seats ${HIGH_DENSITY.staffMax}, rent ${formatCash(HIGH_DENSITY.rent)}/mo, workbench unlocked.`,
        "good",
      ),
      ledger: applyLedger(state.ledger, {
        week: state.week,
        amount: -HIGH_DENSITY.cashCost,
        category: "other",
        label: "High-Density Bay renovation",
        ref: `hd-reno-w${state.week}`,
      }),
      unlocks: { ...state.unlocks, hiring: "owned" },
    });
    return null;
  },


  shutdownMmo: (gameId) => {
    const state = get();
    const list = state.activeMmos ?? [];
    const m = list.find((x) => x.gameId === gameId);
    if (!m) return "MMO not found.";
    if (!m.active) return "Servers already offline.";
    set({
      activeMmos: list.map((x) =>
        x.gameId === gameId ? { ...x, active: false } : x,
      ),
      dirty: true,
      notifications: pushNote(state, `MMO servers shut down: ${m.title}.`, "warn"),
    });
    return null;
  },

  acceptCopySettlement: () => {
    const state = get();
    const p = state.currentProject;
    if (!p || !(p as { pendingCopyCrisis?: boolean }).pendingCopyCrisis) {
      return "No patent scare pending.";
    }
    if (state.cash < 45000) return "Need $45,000 for settlement.";
    set({
      cash: state.cash - 45000,
      currentProject: {
        ...p,
        pendingCopyCrisis: false,
      } as typeof p,
      dirty: true,
      notifications: pushNote(state, "Paid $45k patent settlement — score safe.", "info"),
      ledger: applyLedger(state.ledger, {
        week: state.week,
        amount: -45000,
        category: "other",
        label: "Patent settlement",
        ref: `copy-settle-w${state.week}`,
      }),
    });
    return null;
  },

  refuseCopySettlement: () => {
    const state = get();
    const p = state.currentProject;
    if (!p || !(p as { pendingCopyCrisis?: boolean }).pendingCopyCrisis) {
      return "No patent scare pending.";
    }
    set({
      currentProject: {
        ...p,
        pendingCopyCrisis: false,
        crisisReviewPenalty: (p.crisisReviewPenalty ?? 0) + 1.5,
      } as typeof p,
      dirty: true,
      notifications: pushNote(
        state,
        "Refused settlement — final score −1.5 when you ship.",
        "warn",
      ),
    });
    return null;
  },

  launchDigitalStorefront: (name) => {
    const state = get();
    if (!lateSystemAllowed(state, "digitalStorefront")) return "Locked until after Garage Phase One.";
    const store = state.digitalStorefront ?? emptyStorefront();
    const check = canLaunchStorefront({
      office: state.office,
      cash: state.cash,
      alreadyActive: store.active,
    });
    if (!check.ok) return check.error;
    const storeName = (name?.trim() || NEON_STORE.name).slice(0, 32);
    set({
      cash: state.cash - NEON_STORE.launchCost,
      digitalStorefront: {
        ...store,
        active: true,
        name: storeName,
        launchedWeek: state.week,
      },
      dirty: true,
      notifications: pushNote(
        state,
        `${storeName} live — 0% cut on your titles, 30% on rival digital sales. −${formatCash(NEON_STORE.launchCost)}.`,
        "good",
      ),
      ledger: applyLedger(state.ledger, {
        week: state.week,
        amount: -NEON_STORE.launchCost,
        category: "other",
        label: `${storeName} platform launch`,
        ref: `neonstore-w${state.week}`,
      }),
    });
    return null;
  },

  installContentPack: (packId) => {
    const state = get();
    const pack = BUILTIN_PACKS.find((p) => p.id === packId);
    if (!pack) return "Unknown content pack.";
    const res = installPack(pack, state.installedPacks ?? []);
    if (!res.ok) return res.error;
    const topics = new Set(state.unlockedTopics);
    for (const t of pack.topics ?? []) topics.add(t);
    const genres = new Set(state.unlockedGenres as string[]);
    for (const g of pack.genres ?? []) genres.add(g);
    set({
      cash: state.cash + res.grantCash,
      researchPoints: state.researchPoints + res.grantRp,
      unlockedTopics: [...topics],
      unlockedGenres: [...genres] as typeof state.unlockedGenres,
      installedPacks: [...(state.installedPacks ?? []), pack.id],
      dirty: true,
      notifications: pushNote(state, `Installed pack: ${pack.name} v${pack.version}.`, "good"),
    });
    return null;
  },

  licenseFranchise: (licenseId) => {
    const state = get();
    if (!lateSystemAllowed(state, "netflixEdition")) return "Locked until after Garage Phase One.";
    const res = purchaseLicense(licenseId, state.cash);
    if (!res.ok) return res.error;
    set({
      cash: state.cash - res.cost,
      activeIpLicense: res.state,
      dirty: true,
      notifications: pushNote(
        state,
        res.state.licenseId === "clear"
          ? "Franchise license cleared — no royalty obligations."
          : `IP rights locked: ${res.state.name} (−${formatCash(res.cost)}). Match theme for 1.4× hype & +1.5 score; 15% royalty.`,
        res.state.licenseId === "clear" ? "info" : "good",
      ),
      ledger:
        res.cost > 0
          ? applyLedger(state.ledger, {
              week: state.week,
              amount: -res.cost,
              category: "marketing",
              label: `IP license: ${res.state.name}`,
              ref: `ip-${res.state.licenseId}-w${state.week}`,
            })
          : state.ledger,
    });
    return null;
  },

  runStreamerCampaign: (tierId) => {
    const state = get();
    if (!lateSystemAllowed(state, "streamerMarketing")) return "Locked until after Garage Phase One.";
    const tier = STREAMER_TIERS.find((t) => t.id === tierId);
    if (!tier) return "Unknown streamer tier.";
    if (state.cash < tier.cost) return `Need ${formatCash(tier.cost)}.`;
    const rng = () => hashSeed(state.campaignSeed, "streamer", tierId, state.week) / 4294967296;
    const gain = streamerHypeGain(tier, state.fans, rng);
    set({
      cash: state.cash - tier.cost,
      hype: state.hype + gain,
      streamerHypeWeeksLeft: Math.max(state.streamerHypeWeeksLeft ?? 0, tier.id === "mega" ? 6 : 4),
      dirty: true,
      notifications: pushNote(
        state,
        `${tier.name}: +${gain} hype (fan-scaled). Fast decay window open.`,
        "good",
      ),
      ledger: applyLedger(state.ledger, {
        week: state.week,
        amount: -tier.cost,
        category: "marketing",
        label: tier.name,
        ref: `stream-${tier.id}-w${state.week}`,
      }),
    });
    return null;
  },

  hostStudioConvention: (ticketPrice, focus) => {
    const state = get();
    if (!lateSystemAllowed(state, "studioConventions")) return "Locked until after Garage Phase One.";
    if (!canHostConvention({ office: state.office, fans: state.fans })) {
      return "Need Level 3 office or 100,000 fans to host a studio convention.";
    }
    if (!Number.isFinite(ticketPrice) || ticketPrice < 5) return "Ticket price must be ≥ $5.";
    const rng = () => hashSeed(state.campaignSeed, "convention", focus, state.week) / 4294967296;
    const out = conventionOutcome({
      ticketPrice,
      focus,
      fans: state.fans,
      hype: state.hype,
      rng,
    });
    if (state.cash < out.cost) return `Need ${formatCash(out.cost)} to host.`;
    const net = out.ticketRevenue - out.cost;
    set({
      cash: state.cash + net,
      fans: state.fans + out.fansGained,
      hype: state.hype + out.hypeGained,
      dirty: true,
      notifications: pushNote(
        state,
        `Studio Con: ${out.attendance.toLocaleString()} guests · net ${formatCash(net)} · +${out.fansGained.toLocaleString()} fans · +${out.hypeGained} hype.`,
        "good",
      ),
      ledger: applyLedger(
        applyLedger(state.ledger, {
          week: state.week,
          amount: -out.cost,
          category: "marketing",
          label: "Studio convention ops",
          ref: `con-cost-w${state.week}`,
        }),
        {
          week: state.week,
          amount: out.ticketRevenue,
          category: "sales",
          label: "Convention tickets",
          ref: `con-tix-w${state.week}`,
        },
      ),
    });
    return null;
  },

  launchWorkbenchAccessory: (categoryId, name, retailPrice) => {
    const state = get();
    if (state.office < 2) return "Need Tech Park office.";
    if (state.office === 2 && !isHighDensity(state.officeSubTier)) {
      return "Renovate to High-Density Bay (L2.5) first.";
    }
    if (!(categoryId in BENCH_CATEGORIES)) return "Unknown bench category.";
    if (!Number.isFinite(retailPrice) || retailPrice <= 0) return "Retail must be > 0.";
    const cat = BENCH_CATEGORIES[categoryId as BenchCategoryId];
    if (state.cash < cat.setupCost) return `Need ${formatCash(cat.setupCost)}.`;
    if (state.researchPoints < cat.rpCost) return `Need ${cat.rpCost} RP.`;
    const product = createWorkbenchProduct({
      id: uid("hwb"),
      name,
      categoryId: categoryId as BenchCategoryId,
      retailPrice,
      fans: state.fans,
    });
    set({
      cash: state.cash - cat.setupCost,
      researchPoints: state.researchPoints - cat.rpCost,
      hardwareProducts: [product, ...(state.hardwareProducts ?? [])],
      dirty: true,
      notifications: pushNote(
        state,
        `Workbench fab: "${product.name}" — ${HIGH_DENSITY.fabWeeks}w hand assembly · +${formatCash(HIGH_DENSITY.clutterTaxPerLine)}/mo clutter.`,
        "info",
      ),
      ledger: applyLedger(state.ledger, {
        week: state.week,
        amount: -cat.setupCost,
        category: "research",
        label: `Workbench setup: ${cat.label}`,
        ref: `bench-${product.id}`,
      }),
    });
    return null;
  },

  runRecruitCampaign: (tier) => {
    const state = get();
    const cfg = tier === "headhunter" ? RECRUIT.headhunter : RECRUIT.local;
    if (tier === "headhunter" && state.office === 2 && !isHighDensity(state.officeSubTier)) {
      return "Headhunter requires High-Density Bay (L2.5).";
    }
    if (tier === "headhunter" && state.office < 2) return "Headhunter needs Tech Park+.";
    if (state.cash < cfg.cost) return `Need ${formatCash(cfg.cost)}.`;
    const refresh = get().refreshCandidates;
    if (typeof refresh === "function") refresh();
    set({
      cash: get().cash - cfg.cost,
      dirty: true,
      notifications: pushNote(
        get(),
        `${cfg.label} campaign (−${formatCash(cfg.cost)}). Check People for applicants.`,
        "info",
      ),
      ledger: applyLedger(get().ledger, {
        week: get().week,
        amount: -cfg.cost,
        category: "other",
        label: cfg.label,
        ref: `recruit-${tier}-w${get().week}`,
      }),
    });
    return null;
  },

  launchAccessory: (categoryId, name, retailPrice) => {
    const state = get();
    if (!lateSystemAllowed(state, "hardwareMerch")) {
      return "Hardware accessories locked during Garage Phase One.";
    }
    if (!(categoryId in ACCESSORY_CATEGORIES)) return "Unknown accessory category.";
    if (!Number.isFinite(retailPrice) || retailPrice <= 0) return "Retail price must be > 0.";
    const err = setupCostCheck(categoryId, state.cash, state.researchPoints);
    if (err) return err;
    const cat = ACCESSORY_CATEGORIES[categoryId];
    const product = createHardwareProduct({
      id: uid("hw"),
      name,
      categoryId,
      retailPrice,
      fans: state.fans,
    });
    set({
      cash: state.cash - cat.setupCost,
      researchPoints: state.researchPoints - cat.rpCost,
      hardwareProducts: [product, ...(state.hardwareProducts ?? [])],
      dirty: true,
      notifications: pushNote(
        state,
        product.lossLeader
          ? `Factory: "${product.name}" loss-leader shipping 16w. −${formatCash(cat.setupCost)}.`
          : `Factory: "${product.name}" shipping 16w. −${formatCash(cat.setupCost)}.`,
        product.lossLeader ? "warn" : "good",
      ),
      ledger: applyLedger(state.ledger, {
        week: state.week,
        amount: -cat.setupCost,
        category: "research",
        label: `Accessory setup: ${cat.label}`,
        ref: `hw-setup-${product.id}`,
      }),
    });
    return null;
  },

  attachTEngineFramework: (engineId) => {
    const state = get();
    const eng = state.engines.find((e) => e.id === engineId);
    if (!eng) return "Engine not found.";
    if (eng.tEngineFramework) return "T-Engine already attached.";
    if (state.cash < T_ENGINE.cashCost) return `Need ${formatCash(T_ENGINE.cashCost)}.`;
    if (state.researchPoints < T_ENGINE.rpCost) return `Need ${T_ENGINE.rpCost} RP.`;
    set({
      cash: state.cash - T_ENGINE.cashCost,
      researchPoints: state.researchPoints - T_ENGINE.rpCost,
      engines: state.engines.map((e) =>
        e.id === engineId
          ? {
              ...e,
              tEngineFramework: true,
              name: e.name.includes("T-Engine") ? e.name : `${e.name} · T-Engine`,
              techBonus: e.techBonus + 5,
            }
          : e,
      ),
      dirty: true,
      notifications: pushNote(
        state,
        `T-Engine Modular Framework on "${eng.name}" (−${formatCash(T_ENGINE.cashCost)}, −${T_ENGINE.rpCost} RP).`,
        "good",
      ),
      ledger: applyLedger(state.ledger, {
        week: state.week,
        amount: -T_ENGINE.cashCost,
        category: "research",
        label: "T-Engine Modular Framework",
        ref: `tengine-${engineId}`,
      }),
    });
    return null;
  },

  executeCheatCommand: (raw) => {
    const parsed = parseCheatCommand(raw);
    if (parsed.kind === "unknown") return `Unknown command: ${raw}`;
    const map: Record<string, string> = {
      money_boost: "money_boost",
      rp_max: "rp_max",
      instafans: "instafans",
      bug_wipe: "bug_wipe",
    };
    get().applyCheat(map[parsed.kind]!);
    return null;
  },

  startConfiguredConsole: (media, gpu, name, retailPrice) => {
    const state = get();
    if (!hardwareUnlocked(state.office, state.cash, state.flags.hardwareLab)) {
      return "Hardware lab locked — need larger office / capital.";
    }
    const rd = consoleRdCost(media, gpu);
    if (state.cash < rd.cash) return `Need ${formatCash(rd.cash)} R&D.`;
    if (state.researchPoints < rd.rp) return `Need ${rd.rp} RP.`;
    if ((state.playerConsoles ?? []).some((c) => c.status === "developing")) {
      return "Already developing a console.";
    }
    const seed = hashSeed(state.campaignSeed, "cfg-console", state.week, media, gpu);
    const id = `console_cfg_${seed.toString(16).slice(0, 6)}`;
    const mfg = rd.unitCost;
    const price = Math.max(199, Math.min(599, retailPrice ?? Math.ceil(mfg * 1.4)));
    const console = {
      id,
      tier: "tier_1" as const,
      name: name?.trim() || `${MEDIA_DRIVES[media].name} / ${GPU_PARTS[gpu].name}`,
      retailPrice: price,
      royaltyRate: 0.2,
      marketShare: 0.15 * rd.shareMod,
      launchedWeek: -1,
      unitsSold: 0,
      status: "developing" as const,
      weeksLeft: 28 + Math.floor(rd.shareMod * 8),
      unitMfgCost: mfg,
      mediaDrive: media,
      gpuPart: gpu,
    };
    set({
      cash: state.cash - rd.cash,
      researchPoints: state.researchPoints - rd.rp,
      playerConsoles: [...(state.playerConsoles ?? []), console],
      unlockedPlatforms: state.unlockedPlatforms.includes(id)
        ? state.unlockedPlatforms
        : [...state.unlockedPlatforms, id],
      flags: { ...state.flags, hardwareLab: true },
      dirty: true,
      notifications: pushNote(
        state,
        `Console R&D: ${console.name} · unit cost $${mfg.toFixed(2)} · ${console.weeksLeft}w · −${formatCash(rd.cash)}.`,
        "info",
      ),
      ledger: applyLedger(state.ledger, {
        week: state.week,
        amount: -rd.cash,
        category: "other",
        label: `Console components: ${console.name}`,
        ref: `cfg-${id}`,
      }),
    });
    return null;
  },

  unlockDrm: (drm) => {
    const state = get();
    const tier = DRM_TIERS.find((d) => d.id === drm);
    if (!tier) return "Unknown DRM.";
    if ((state.unlockedDrm ?? []).includes(drm)) return "Already unlocked.";
    if (state.researchPoints < tier.rpUnlock) return `Need ${tier.rpUnlock} RP.`;
    set({
      researchPoints: state.researchPoints - tier.rpUnlock,
      unlockedDrm: [...(state.unlockedDrm ?? ["None"]), drm],
      dirty: true,
      notifications: pushNote(state, `Unlocked DRM: ${tier.label}`, "good"),
    });
    return null;
  },

  setConsolePricing: (id, retailPrice, royaltyRate) => {
    const state = get();
    const price = Math.max(199, Math.min(599, retailPrice));
    const roy = Math.max(0.1, Math.min(0.3, royaltyRate));
    set({
      playerConsoles: (state.playerConsoles ?? []).map((c) =>
        c.id === id ? { ...c, retailPrice: price, royaltyRate: roy } : c,
      ),
      dirty: true,
    });
    return null;
  },

  exportSaveMatrix: () => {
    const state = get();
    return JSON.stringify(
      buildSaveMatrix({
        year: state.year,
        month: state.month,
        week: state.week,
        cash: state.cash,
        fans: state.fans,
        researchPoints: state.researchPoints,
        targetHighScore: state.targetHighScore,
        hype: state.hype,
        unlockedPlatforms: state.unlockedPlatforms,
        engines: state.engines,
        staff: state.staff,
      }),
      null,
      2,
    );
  },

  resolveMarketingChoice: (opportunityId, choiceId) => {
    const state = get();
    const mkt0 = state.marketingOpportunities ?? emptyMarketingOpportunityState();
    const res = resolveMarketingOpportunity(mkt0, opportunityId, choiceId);
    if ("error" in res) return res.error;
    if (state.cash < res.choice.cost) return `Need $${res.choice.cost.toLocaleString()}.`;
    const txn = applyCashTransaction(state.cash, state.ledger, {
      week: state.week,
      amount: -res.choice.cost,
      category: "marketing",
      label: res.choice.label,
      ref: `mkt-opp-${opportunityId}-${choiceId}`,
    });
    if (!txn.applied) return "Already resolved.";
    set({
      cash: txn.cash,
      ledger: txn.ledger,
      hype: Math.min(150, state.hype + res.choice.hypeGain),
      marketingOpportunities: res.state,
      pendingEvent: null,
      modal: null,
      dirty: true,
      notifications: pushNote(
        state,
        `${res.choice.label}: +${res.choice.hypeGain} hype, +${res.choice.marketingPoints} marketing points.`,
        "good",
      ),
    });
    return null;
  },

  runStudioMarketing: (campaignId) => {
    const state = get();
    const unlocked =
      state.unlocks.marketing === "owned" ||
      state.flags.marketing ||
      state.researched.includes("marketing") ||
      state.gamesPublished >= 1 ||
      state.currentProject != null;
    if (!unlocked) {
      return "Marketing opens after you start or ship a game (or research Marketing 101).";
    }
    const cap = canPurchaseMarketing(state);
    if (cap) return cap;
    // Streamer / convention-style advanced spam blocked in Garage
    if (
      isGaragePhaseOne(state) &&
      (campaignId === "g3_booth" || campaignId === "influencer_blitz")
    ) {
      return "Advanced marketing locked during Garage Phase One.";
    }
    const seed = hashSeed(state.campaignSeed, "studio-mkt", campaignId, state.week);
    const pack = studioCampaignHype(campaignId, seed);
    if (!pack) return "Unknown campaign.";
    const advanced =
      campaignId === "g3_booth" || campaignId === "influencer_blitz";
    if (
      advanced &&
      state.unlocks.advanced_marketing !== "owned" &&
      state.office < 2 &&
      state.gamesPublished < 3
    ) {
      return "Advanced campaigns need more studio presence.";
    }
    if (state.cash < pack.cost) return `Need ${pack.cost.toLocaleString()} cash.`;
    const txn = applyCashTransaction(state.cash, state.ledger, {
      week: state.week,
      amount: -pack.cost,
      category: "marketing",
      label: pack.name,
      ref: `studio-mkt-${campaignId}-w${state.week}-${countMarketingInYear(state, marketingYearIndex(state.week))}`,
    });
    if (!txn.applied) return "Marketing purchase already recorded this week.";
    const next: GameState = {
      ...state,
      cash: txn.cash,
      ledger: txn.ledger,
      hype: Math.min(150, state.hype + pack.hypeGain),
      dirty: true,
      notifications: pushNote(
        state,
        `${pack.name}: +${pack.hypeGain} hype (studio total ${Math.min(150, state.hype + pack.hypeGain)}).`,
        "good",
      ),
    };
    // Fold into active project spend so release sales see it
    if (next.currentProject) {
      next.currentProject = {
        ...next.currentProject,
        marketingSpend: (next.currentProject.marketingSpend ?? 0) + pack.cost,
        hype: (next.currentProject.hype ?? 0) + pack.hypeGain,
      };
    }
    set(next);
    return null;
  },

  startTitleCampaign: (gameId, campaignId) => {
    const state = get();
    const g = state.releasedGames.find((x) => x.id === gameId);
    if (!g) return "Game not found.";
    if (g.delisted || g.dormant) return "Title is not actively marketable.";
    const mcap = canPurchaseMarketing(state);
    if (mcap) return mcap;
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

  setProjectPillar: (pillar) => {
    const state = get();
    const p = state.currentProject;
    if (p) {
      const fieldImportance = computeEffectiveImportance({
        genreId: p.genreId,
        topicId: p.topicId,
        pillar,
      });
      set({ currentProject: { ...p, pillar, fieldImportance }, dirty: true });
      return;
    }
    if (state.draft) {
      set({ draft: { ...state.draft, pillar }, dirty: true });
    }
  },

  startTechPipeline: (techId) => get().startResearch(techId, "tech"),

  resolveDecisionEvent: (choiceId) => {
    const pe = get().pendingEvent;
    if (!pe?.decisionChoices) {
      get().resolveEvent(0);
      return;
    }
    const idx = pe.decisionChoices.findIndex((c) => c.id === choiceId);
    get().resolveEvent(idx >= 0 ? idx : 0);
  },

  startHardwareProject: (name, purpose, componentIds) => {
    const state = get();
    if (state.office < 3 && !state.flags.hardwareLab) {
      return "Need a larger studio or hardware lab for proprietary hardware.";
    }
    if (state.year < 1985) return "Too early for in-house hardware programs.";
    const proj = createHardwareProject({
      name,
      purpose,
      components: componentIds,
      week: state.week,
    });
    const cost = proj.bomCost * 400 + 50000;
    if (state.cash < cost) return `Needs $${cost.toLocaleString()} to fund architecture.`;
    set({
      cash: state.cash - cost,
      hardwareProjects: [...(state.hardwareProjects ?? []), proj],
      dirty: true,
      notifications: pushNote(
        state,
        `Hardware project "${proj.name}" started. Performance is bottlenecked — not averaged.`,
        "info",
      ),
    });
    return null;
  },

  resolveEvent: (choiceIndex) => {
    const state = get();
    if (!state.pendingEvent) return;
    set(applyEventChoice(state, choiceIndex));
  },

  applyCheat: (cheat, arg) => {
    const state = get();
    const logEntry = (action: string, detail?: string) =>
      [{ week: get().week, action, detail }, ...(get().cheatLog ?? [])].slice(0, 80);

    const next: GameState = {
      ...state,
      cheatsEnabled: true,
      dirty: true,
      settings: { ...state.settings },
      staff: state.staff.map((m) => ({ ...m })),
      unlockedTopics: [...state.unlockedTopics],
      unlockedPlatforms: [...state.unlockedPlatforms],
      unlockedGenres: [...state.unlockedGenres],
      researched: [...state.researched],
      flags: { ...state.flags },
      unlocks: { ...state.unlocks },
      cheatLog: state.cheatLog ?? [],
    };

    const ledgerCash = (amount: number, label: string) => {
      next.cash += amount;
      next.ledger = applyLedger(next.ledger, {
        week: next.week,
        amount,
        category: "cheat",
        label,
        ref: `cheat-${label}-${next.week}-${Date.now()}`,
      });
    };

    const DREAM = [
      "Ava Chen", "Marcus Cole", "Sofia Reyes", "Jin Park", "Nora Blake",
      "Eli Vargas", "Priya Nair", "Theo Lang", "Mira Okonkwo", "Sam Okada",
      "Lena Frost", "Owen Hart", "Yuri Volkov", "Amara Diallo",
    ];

    const fillTeam = (tier: "dream" | "b") => {
      const cap = OFFICE_INFO[next.office].capacity;
      const design = tier === "dream" ? 95 : 70;
      const tech = tier === "dream" ? 95 : 70;
      const speed = tier === "dream" ? 90 : 65;
      const salary = tier === "dream" ? 4000 : 2200;
      let added = 0;
      while (next.staff.length < cap) {
        const name = DREAM[next.staff.length % DREAM.length]!;
        next.staff.push({
          id: uid("staff"),
          name: tier === "dream" ? `${name} ★` : name,
          design,
          tech,
          speed,
          salary,
          level: tier === "dream" ? 7 : 4,
          xp: 0,
          busy: false,
          energy: 100,
          specialization: null,
        });
        added++;
      }
      next.staff = next.staff.map((m) =>
        m.id === "founder" || m.name === "You"
          ? m
          : {
              ...m,
              design: Math.max(m.design, design),
              tech: Math.max(m.tech, tech),
              speed: Math.max(m.speed, speed),
              energy: 100,
            },
      );
      next.notifications = [
        {
          id: uid("note"),
          text: added
            ? `CheatMod: hired ${added} ${tier === "dream" ? "1337" : "B-Team"} staff.`
            : `CheatMod: team full (cap ${cap}); stats boosted.`,
          tone: "warn" as const,
          week: next.week,
          read: false,
        },
        ...next.notifications,
      ].slice(0, 40);
    };

    switch (cheat) {
      case "money_boost":
        ledgerCash(5_000_000, "EXECUTE_CHEAT /money_boost");
        break;
      case "rp_max":
        next.researchPoints = 999;
        break;
      case "instafans":
        next.fans = Math.max(0, Math.floor(next.fans * 5));
        break;
      case "bug_wipe":
        if (next.currentProject) next.currentProject = { ...next.currentProject, bugs: 0 };
        break;
      case "cash":
      case "cash_100k":
        ledgerCash(Number(arg) || 100_000, "Cheat +100k");
        break;
      case "cash_10k":
        ledgerCash(10_000, "Cheat +10k");
        break;
      case "cash_1m":
        ledgerCash(1_000_000, "Cheat +1M");
        break;
      case "cash_10m":
        ledgerCash(10_000_000, "Cheat +10M");
        break;
      case "cash_100m":
        ledgerCash(100_000_000, "Cheat +100M");
        break;
      case "cash_1b":
        ledgerCash(1_000_000_000, "Cheat +1B");
        break;
      case "set_cash": {
        const v = Number(arg);
        if (Number.isFinite(v) && v >= 0) {
          const delta = Math.floor(v) - next.cash;
          ledgerCash(delta, "Cheat set cash");
        }
        break;
      }
      case "fans":
        next.fans += Number(arg) || 10_000;
        break;
      case "fans_1m":
        next.fans += 1_000_000;
        break;
      case "fans_10m":
        next.fans += 10_000_000;
        break;
      case "fans_100m":
        next.fans += 100_000_000;
        break;
      case "set_fans": {
        const v = Number(arg);
        if (Number.isFinite(v) && v >= 0) next.fans = Math.floor(v);
        break;
      }
      case "rp":
      case "rp_100":
        next.researchPoints += Number(arg) || 100;
        break;
      case "hype":
      case "hype_10":
        next.hype = Math.min(200, next.hype + (Number(arg) || 10));
        break;
      case "hype_50":
        next.hype = Math.min(200, next.hype + 50);
        break;
      case "hype_100":
        next.hype = Math.min(200, next.hype + 100);
        break;
      case "bugs":
        if (next.currentProject) next.currentProject = { ...next.currentProject, bugs: 0 };
        break;
      case "add_bugs":
        if (next.currentProject) {
          next.currentProject = {
            ...next.currentProject,
            bugs: (next.currentProject.bugs ?? 0) + (Number(arg) || 5),
          };
        }
        break;
      case "design_10":
      case "add_design":
        if (next.currentProject) {
          next.currentProject = {
            ...next.currentProject,
            designPoints: (next.currentProject.designPoints ?? 0) + (Number(arg) || 10),
          };
        }
        break;
      case "design_100":
        if (next.currentProject) {
          next.currentProject = {
            ...next.currentProject,
            designPoints: (next.currentProject.designPoints ?? 0) + 100,
          };
        }
        break;
      case "tech_10":
      case "add_tech":
        if (next.currentProject) {
          next.currentProject = {
            ...next.currentProject,
            techPoints: (next.currentProject.techPoints ?? 0) + (Number(arg) || 10),
          };
        }
        break;
      case "tech_100":
        if (next.currentProject) {
          next.currentProject = {
            ...next.currentProject,
            techPoints: (next.currentProject.techPoints ?? 0) + 100,
          };
        }
        break;
      case "max_points":
        if (next.currentProject) {
          next.currentProject = {
            ...next.currentProject,
            designPoints: (next.currentProject.designPoints ?? 0) + 200,
            techPoints: (next.currentProject.techPoints ?? 0) + 200,
            bugs: 0,
          };
        }
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
          next.activeResearchJobs = [];
        }
        break;
      case "finish_stage":
        if (next.currentProject) {
          // Soft advance: mark ready-ish via high progress fields if present
          const p = next.currentProject as GameProject & {
            stageProgress?: number;
            devPhase?: string;
            bugs?: number;
          };
          next.currentProject = {
            ...p,
            bugs: 0,
            designPoints: (p.designPoints ?? 0) + 40,
            techPoints: (p.techPoints ?? 0) + 40,
            stageProgress: 1,
          } as typeof next.currentProject;
          next.speed = 0;
        }
        break;
      case "force_release_ready":
        if (next.currentProject) {
          next.currentProject = {
            ...next.currentProject,
            bugs: 0,
            designPoints: Math.max(next.currentProject.designPoints ?? 0, 120),
            techPoints: Math.max(next.currentProject.techPoints ?? 0, 120),
          };
          next.speed = 0;
        }
        break;
      case "toggle_perfect_score":
      case "perfect_scores":
        next.settings.forcePerfectScore = !next.settings.forcePerfectScore;
        next.settings.forceBadScore = false;
        break;
      case "toggle_bad_score":
        next.settings.forceBadScore = !next.settings.forceBadScore;
        next.settings.forcePerfectScore = false;
        break;
      case "no_bugs_mode":
        next.settings.noBugsMode = !next.settings.noBugsMode;
        if (next.settings.noBugsMode && next.currentProject) {
          next.currentProject = { ...next.currentProject, bugs: 0 };
        }
        break;
      case "fast_research_mode":
        next.settings.fastResearchMode = !next.settings.fastResearchMode;
        break;
      case "show_all_hints":
        next.settings.showAllHints = !next.settings.showAllHints;
        if (next.settings.showAllHints) next.settings.infoMode = "analyst";
        break;
      case "no_vacation":
        next.settings.noVacationMode = !next.settings.noVacationMode;
        next.staff = next.staff.map((m) => ({ ...m, energy: 100 }));
        break;
      case "dream_team":
        if (next.office < 2) next.office = 2;
        fillTeam("dream");
        next.unlocks = { ...next.unlocks, hiring: "owned", training: "owned" };
        break;
      case "b_team":
        if (next.office < 2) next.office = 2;
        fillTeam("b");
        next.unlocks = { ...next.unlocks, hiring: "owned", training: "owned" };
        break;
      case "pro_developer":
        next.staff = next.staff.map((m, i) =>
          i === 0 || m.id === "founder" || m.name === "You"
            ? { ...m, design: 100, tech: 100, speed: 100, energy: 100, level: Math.max(m.level, 8) }
            : m,
        );
        break;
      case "office_ready":
        // Bible garage gate: 5 releases, 1k fans, profitable title, Y3+, $1M liquid
        next.fans = Math.max(next.fans, 1_000);
        next.cash = Math.max(next.cash, 1_200_000);
        next.gamesPublished = Math.max(next.gamesPublished, 5);
        next.totalRevenue = Math.max(next.totalRevenue ?? 0, 250_000);
        next.week = Math.max(next.week, 96); // campaign year 3
        {
          const d = weekToDate(next.week, START_YEAR);
          next.year = d.year;
          next.month = d.month;
        }
        // Seed a profitable released title if none exist (for proof evaluation)
        if (!(next.releasedGames ?? []).some((g) => (g.revenue ?? 0) > 5_000)) {
          const stubId = uid("rel");
          const stub: ReleasedGame = {
            id: stubId,
            title: "Garage Hit",
            topicId: "military",
            genreId: "action",
            platformId: "pc",
            audience: "everyone",
            size: "small",
            engineId: "basic",
            designPoints: 80,
            techPoints: 80,
            bugs: 0,
            reviewScores: [7.5, 7.5, 7.5, 7.5],
            avgReview: 7.5,
            sales: 12_000,
            revenue: 180_000,
            fansGained: 400,
            weekReleased: Math.max(0, next.week - 20),
            yearReleased: next.year,
            marketingSpend: 0,
            developmentCost: 20_000,
            hype: 20,
            residualWeeks: 8,
            weeklySalesLeft: [],
            weeklyHistory: [],
            weeksOnMarket: 20,
            onSale: true,
            dormant: false,
            productQuality: 75,
          };
          next.releasedGames = [stub, ...next.releasedGames];
        }
        // Positive trailing OCF via ledger sales
        next.ledger = applyLedger(next.ledger, {
          week: next.week - 2,
          amount: 40_000,
          category: "sales",
          label: "Office-ready pack sales seed",
          ref: `office-ready-sales-${next.week}`,
        });
        // Re-evaluate progression offer after seeding
        if (isFeatureEnabled("officeFoundation")) {
          let prog = migrateStudioProgression(next.progression, next.office);
          prog = tickOfficeOffers(next, prog);
          next.progression = prog;
          const fo = prog.offers.first_office;
          if (fo && (fo.state === "offered" || fo.state === "eligible" || fo.state === "deferred")) {
            next.modal = "officeOffer";
            next.speed = 0;
          }
        }
        break;
      case "move_to_final_level":
        next.office = 4 as typeof next.office;
        next.cash = Math.max(next.cash, 5_000_000);
        next.fans = Math.max(next.fans, 250_000);
        next.gamesPublished = Math.max(next.gamesPublished, 12);
        next.researchPoints = Math.max(next.researchPoints, 200);
        next.unlockedTopics = TOPICS.map((t) => t.id);
        next.unlockedGenres = [
          "action",
          "adventure",
          "rpg",
          "simulation",
          "strategy",
          "casual",
        ] as GenreId[];
        next.unlockedPlatforms = PLATFORMS.map((p) => p.id);
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
        next.week = Math.max(next.week, 48 * 10);
        {
          const d = weekToDate(next.week, START_YEAR);
          next.year = d.year;
          next.month = d.month;
        }
        break;
      case "set_office": {
        const o = Math.min(4, Math.max(1, Number(arg) || 2));
        next.office = o as typeof next.office;
        break;
      }
      case "sequels":
        next.flags = { ...next.flags, sequels: true };
        next.unlocks = { ...next.unlocks, sequels: "owned" };
        break;
      case "add_aaa":
        next.researched = Array.from(
          new Set([...next.researched, ...RESEARCH.filter((r) => /large|aaa|medium/i.test(r.id) || /large|aaa|medium/i.test(r.name)).map((r) => r.id)]),
        );
        if (next.office < 3) next.office = 3 as typeof next.office;
        next.flags = { ...next.flags, rndLab: true };
        break;
      case "add_all_topics":
      case "unlock_topics":
        next.unlockedTopics = TOPICS.map((t) => t.id);
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
      case "unlock_platforms":
        next.unlockedPlatforms = PLATFORMS.map((p) => p.id);
        break;
      case "unlock_research":
        next.researched = RESEARCH.map((r) => r.id);
        break;
      case "no_bankruptcy":
        next.settings.disableBankruptcy = !next.settings.disableBankruptcy;
        break;
      case "set_year": {
        const y = Math.floor(Number(arg) || next.year);
        if (y >= START_YEAR && y <= 2030) {
          next.week = Math.max(0, (y - START_YEAR) * 48 + Math.min(47, (next.month - 1) * 4));
          const d = weekToDate(next.week, START_YEAR);
          next.year = d.year;
          next.month = d.month;
        }
        break;
      }
      case "advance_time": {
        const weeks = Math.min(96, Number(arg) || 48);
        next.cheatLog = logEntry(cheat, `+${weeks}w`);
        set(next);
        for (let i = 0; i < weeks; i++) {
          get().tick();
        }
        set({
          ...get(),
          cheatsEnabled: true,
          dirty: true,
          cheatLog: logEntry(cheat, `+${weeks}w done`),
        });
        return;
      }
      case "random_trend": {
        // Cheat-only: isolated from normal campaign determinism via cheat log week salt
        const g = (["action", "adventure", "rpg", "simulation", "strategy", "casual"] as const)[
          Math.floor((hashSeed(next.campaignSeed, "cheat-trend-g", next.week, next.cheatLog?.length ?? 0) / 4294967296) * 6)
        ]!;
        const topic = TOPICS[Math.floor((hashSeed(next.campaignSeed, "cheat-trend-t", next.week, next.cheatLog?.length ?? 0) / 4294967296) * TOPICS.length)];
        next.hype = Math.min(200, next.hype + 25);
        next.notifications = [
          {
            id: uid("note"),
            text: `CheatMod trend: ${topic?.name ?? "?"} ${g} is surging.`,
            tone: "warn" as const,
            week: next.week,
            read: false,
          },
          ...next.notifications,
        ].slice(0, 40);
        break;
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
      case "info_classic":
        next.settings.infoMode = "classic";
        break;
      case "info_assisted":
        next.settings.infoMode = "assisted";
        break;
      case "info_analyst":
        next.settings.infoMode = "analyst";
        break;
      case "reveal_seed":
        next.notifications = [
          {
            id: uid("note"),
            text: `Campaign seed: ${next.campaignSeed}`,
            tone: "info" as const,
            week: next.week,
            read: false,
          },
          ...next.notifications,
        ].slice(0, 40);
        break;
      default:
        break;
    }

    next.cheatLog = logEntry(cheat, arg !== undefined ? String(arg) : undefined);
    set(next);
  },

  exportSave: () => {
    const state = get();
    // Full campaign JSON — portable across browsers / devices
    const payload = {
      ...state,
      version: SAVE_VERSION,
      modal: state.pendingEvent != null ? "event" : null,
      speed: 0 as const,
      dirty: false,
      lastSavedWeek: state.week,
      pendingEvent: state.pendingEvent,
      eventCooldowns: state.eventCooldowns,
      recentEventKeys: state.recentEventKeys,
    };
    return JSON.stringify(payload, null, 2);
  },

  importSave: (raw) => {
    try {
      const text = String(raw ?? "").trim();
      if (!text) return false;
      const data = parseSaveCandidate(text);
      if (!data) return false;
      // Normalize into our save key format so loadGame can read it
      const normalized = JSON.stringify({
        ...(data as object),
        version: SAVE_VERSION,
      });
      localStorage.setItem(SAVE_KEY, normalized);
      const ok = get().loadGame();
      if (ok) {
        const st = get();
        set({
          dirty: false,
          notifications: [
            {
              id: uid("note"),
              text: "Campaign loaded from JSON save.",
              tone: "good" as const,
              week: st.week,
              read: false,
            },
            ...st.notifications,
          ].slice(0, 40),
        });
      }
      return ok;
    } catch {
      return false;
    }
  },
}));
