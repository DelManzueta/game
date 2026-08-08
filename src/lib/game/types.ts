/** Exactly six top-level genres (Phase One). Puzzle/horror/racing/etc. are topics. */
export type GenreId =
  | "action"
  | "adventure"
  | "rpg"
  | "simulation"
  | "strategy"
  | "casual";

/** Topic × genre compatibility ranks (authoritative). */
export type CompatibilityValue = 100 | 85 | 70 | 55 | 35 | 15;

export type AudienceId = "young" | "everyone" | "mature";
export type GameSize = "small" | "medium" | "large" | "aaa";

export type DevField =
  | "engine"
  | "gameplay"
  | "story"
  | "dialogue"
  | "level"
  | "ai"
  | "world"
  | "graphics"
  | "sound";

export type MatchTier = "great" | "good" | "ok" | "poor" | "bad";
export type OfficeTier = 1 | 2 | 3 | 4 | 5;
export type Speed = 0 | 1 | 2 | 4;

/** Development state machine */
export type DevPhase =
  | "STAGE_1_CONFIG"
  | "STAGE_1_RUNNING"
  | "STAGE_2_CONFIG"
  | "STAGE_2_RUNNING"
  | "STAGE_3_CONFIG"
  | "STAGE_3_RUNNING"
  | "POLISHING"
  | "READY_TO_RELEASE";

/** Alias: production pipeline stage (not genre capacity). */
export type ProductionStage = 1 | 2 | 3;

/** How many genres the project may select (unlock progression). */
export type GenreCapacityTier = 1 | 2 | 3 | 4;

export type ScreenId =
  | "studio"
  | "develop"
  | "games"
  | "research"
  | "staff"
  | "engines"
  | "platforms"
  | "finances"
  | "market"
  | "settings";

export type ModalId =
  | null
  | "newGame"
  | "reviews"
  | "pauseMenu"
  | "cheats"
  | "confirmMenu"
  | "event"
  | "report"
  | "loopGuide"
  | "notifications"
  | "officeOffer";

export type UnlockId =
  | "research"
  | "reports"
  | "engines"
  | "hiring"
  | "training"
  | "medium_games"
  | "publishing"
  | "audience"
  | "marketing"
  | "sequels"
  | "large_games"
  | "multi_genre"
  | "multi_platform"
  | "ports"
  | "advanced_marketing"
  | "rnd"
  | "aaa"
  | "post_release"
  | "online"
  | "mmo"
  | "hardware"
  | "consoles"
  | "contracts";

export type UnlockState =
  | "hidden"
  | "teased"
  | "discovered"
  | "researchable"
  | "owned";

export interface TopicDef {
  id: string;
  name: string;
  homeGenre: GenreId;
  source: "vanilla" | "expansion";
  /** All six genres — values from {100,85,70,55,35,15}, each used once. */
  compatibility: Record<GenreId, CompatibilityValue>;
  researchCost: number;
  startUnlocked?: boolean;
  pack?: "base" | "expansion";
}

export interface EngineComponentDef {
  id: string;
  name: string;
  category: string;
  starting: boolean;
  researchable: boolean;
  researchCost: number;
  requires?: string[];
  engineFeature?: string;
  designBoost?: number;
  techBoost?: number;
  /** Industry year before this component can be researched. */
  minYear?: number;
}

export interface GenreDef {
  id: GenreId;
  name: string;
  techBias: number;
  researchCost: number;
  startUnlocked?: boolean;
  stageFocus: Record<1 | 2 | 3, DevField[]>;
  avoid: DevField[];
}

export interface PlatformDef {
  id: string;
  name: string;
  short: string;
  year: number;
  /** Timeline era label from content brief. */
  era?: string;
  licenseCost: number;
  marketSize: number;
  techCeiling: number;
  genreAffinity: Partial<Record<GenreId, MatchTier>>;
  audienceAffinity: Partial<Record<AudienceId, MatchTier>>;
  startUnlocked?: boolean;
  isCustom?: boolean;
}

export interface ResearchItem {
  id: string;
  name: string;
  category: string;
  cost: number;
  description: string;
  requires?: string[];
  unlocksSize?: GameSize;
  unlocksMultiGenre?: boolean;
  unlocksSequel?: boolean;
  unlocksExpansion?: boolean;
  unlocksMarketing?: boolean;
  unlocksContracts?: boolean;
  unlocksAudience?: boolean;
  engineFeature?: string;
  designBoost?: number;
  techBoost?: number;
  pack?: "base" | "expansion";
  /** Weeks to complete once started */
  weeks?: number;
  /** Min industry year before visible */
  minYear?: number;
  /** Chain id for progressive versions */
  chain?: string;
  chainOrder?: number;
}

export interface EngineDef {
  id: string;
  name: string;
  features: string[];
  designBonus: number;
  techBonus: number;
  cost: number;
  weeks: number;
  custom?: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  design: number;
  tech: number;
  speed: number;
  salary: number;
  specialization?: DevField | null;
  level: number;
  xp: number;
  fieldExperience?: Partial<Record<DevField, number>>;
  busy: boolean;
  energy: number;
  /** Active training enrollment (in-game weeks). */
  training?: {
    courseId: string;
    weeksLeft: number;
    totalWeeks: number;
  } | null;
  /** Permanent QA boost from training / specialty (0–0.5). */
  bugFixBonus?: number;
}

export interface StageSliderSet {
  engine?: number;
  gameplay?: number;
  story?: number;
  dialogue?: number;
  level?: number;
  ai?: number;
  world?: number;
  graphics?: number;
  sound?: number;
}

export interface GameProject {
  id: string;
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
  /** Part 2: project pillar reshapes production priorities. */
  pillar?: import("./research/types").ProjectPillar;
  /** Part 2: per-product pricing (immutable snapshot at release). */
  pricing?: import("./research/types").ProductPricing | null;
  /** Legacy numeric stage for scoring helpers */
  stage: 1 | 2 | 3 | "done";
  stageProgress: number;
  devPhase: DevPhase;
  /** Per-stage confirmed slider values (only 3 fields each). */
  stageConfigs: {
    1: Record<string, number>;
    2: Record<string, number>;
    3: Record<string, number>;
  };
  /** Working sliders for the CURRENT config stage (editable). */
  sliders: Record<DevField, number>;
  designPoints: number;
  techPoints: number;
  researchEarned: number;
  bugs: number;
  hype: number;
  marketingSpend: number;
  developmentCost: number;
  weeksDev: number;
  features: string[];
  stageShareAccum?: Partial<Record<DevField, number>>;
  stageShareSamples?: number;
  rngSeed?: number;
  hiddenScore?: number;
  /** Player-set launch price (applied at release). */
  launchPrice?: number;
  /** True when project was cancelled (for knowledge only). */
  cancelled?: boolean;
  /** Publishing deal id accepted for this project (optional). */
  publisherDealId?: string | null;
  distributionType?: "self" | "publisher";
  /** ALGORITHM 1 production state machine (persisted). */
  production?: import("./production/algorithm").ProductionState;
  /** Quality calculated after candidate build (not reviews). */
  qualityResult?: import("./quality/algorithm").QualityResult;
  /**
   * Immutable engine snapshot captured at project start (Part 3).
   * Later engine upgrades never rewrite this game's historical data.
   */
  engineSnapshot?: import("./engine/types").GameEngineSnapshot | null;
  /** Part 4 — performance budgets, bugs class, certification, readiness. */
  techSpec?: import("./optimization/types").ProjectTechSpec | null;
  /** Part 2: effective field importance snapshot at project start. */
  fieldImportance?: Partial<Record<DevField, number>> | null;
}

export interface WeeklySalePoint {
  week: number;
  units: number;
  revenue: number;
  activePlayers?: number;
  awareness?: number;
  playerSentiment?: number;
  platformMomentum?: number;
  competitionModifier?: number;
  seasonalModifier?: number;
}

export interface ReleasedGame {
  id: string;
  title: string;
  topicId: string;
  genreId: GenreId;
  genre2Id?: GenreId | null;
  platformId: string;
  audience: AudienceId;
  size: GameSize;
  engineId: string;
  designPoints: number;
  techPoints: number;
  bugs: number;
  reviewScores: number[];
  avgReview: number;
  sales: number;
  revenue: number;
  fansGained: number;
  weekReleased: number;
  yearReleased: number;
  marketingSpend: number;
  developmentCost: number;
  hype: number;
  residualWeeks: number;
  weeklySalesLeft: number[];
  /** Full history for charts */
  weeklyHistory: WeeklySalePoint[];
  isSequel?: boolean;
  isExpansion?: boolean;
  /** Parent title id when this is a sequel. */
  sequelOf?: string;
  seriesId?: string;
  sequelIndex?: number;
  hiddenFinalScore?: number;

  baseScore?: number;
  weeksOnMarket: number;
  onSale: boolean;
  reportDone?: boolean;
  reviewComments?: string[];
  criticReviews?: CriticReviewStored[];
  productQuality?: number;
  qualityBreakdownV2?: Record<string, number>;
  /** Frozen at release — load must not recompute. */
  outcomeTrace?: import("./contracts").OutcomeTrace;
  launchPrice?: number;
  /** Part 2: immutable per-product pricing snapshot. */
  pricing?: import("./research/types").ProductPricing | null;
  /** Commercial spine (Phase commercial build). */
  distributionType?: "self" | "publisher";
  publisherId?: string | null;
  publisherRoyalty?: number;
  awarenessAtLaunch?: number;
  hypeAtLaunch?: number;
  fanBaseAtLaunch?: number;
  salesPhase?: import("./commercial/config").SalesPhase;
  dormant?: boolean;
  delisted?: boolean;
  lowSalesStreak?: number;
  marketWeeksPlanned?: number;
  commercialExplain?: {
    marketPotential: string;
    qualityDemand: string;
    awareness: string;
    hype: string;
    priceFit: string;
    distribution: string;
    lifecycle: string;
  };
  fanHistory?: { week: number; delta: number; reason: string }[];
  /**
   * Live weekly sales engine (v3). When set, residual weeks use calculateWeeklySales
   * instead of consuming precomputed weeklySalesLeft.
   */
  salesEngine?: "plan_v2" | "weekly_v3";
  /** Frozen commercial inputs for live weekly sales (set at release). */
  salesSnapshot?: {
    platformInstalledBase: number;
    platformLifecycle: number;
    platformAvailability: number;
    audienceDemand: number;
    topicDemand: number;
    genreDemand: number;
    platformGenreFit: number;
    competitionModifier: number;
    trendModifier: number;
    organicAwarenessPoints: number;
    publisherAwarenessPoints: number;
    distributionMultiplier: number;
    referencePrice: number;
    platformFeeRate: number;
    /** 1 - studio royalty share when published. */
    publisherCutRate: number;
    marketCapacityRate: number;
  };
  /** Per-title marketing state (campaigns, awareness, hype). */
  marketingState?: import("./commercial/marketing").MarketingState;
  /** Immutable weekly results from live sales engine. */
  weeklySalesResults?: import("./commercial/weeklySales").WeeklySalesResult[];
  marketDays?: number;
  /** ALGORITHM 2 frozen quality + reviews (never re-roll). */
  qualityResult?: import("./quality/algorithm").QualityResult;
  reviewResult?: import("./quality/algorithm").ReviewResult;
  /** ALGORITHM 3 platform snapshot at release. */
  platformSnapshotAtRelease?: import("./platforms/lifecycle").PlatformWeekSnapshot;
  /** Frozen engine snapshot from development (Part 3 immutability). */
  engineSnapshot?: import("./engine/types").GameEngineSnapshot | null;
}


export interface ContractOffer {
  id: string;
  title: string;
  description: string;
  reward: number;
  researchReward: number;
  weeks: number;
  progress: number;
  designReq: number;
  techReq: number;
  active: boolean;
}

export interface GameEvent {
  id: string;
  title: string;
  body: string;
  choices?: { label: string; effect: string }[];
  /** Part 2 decision event id when from research/events catalog. */
  decisionDefId?: string;
  decisionChoices?: import("./research/types").DecisionEventChoice[];
}

export interface Notification {
  id: string;
  text: string;
  tone: "info" | "good" | "warn" | "bad";
  week: number;
  /** False until player opens the inbox. */
  read?: boolean;
}

export interface ResearchJob {
  id: string;
  kind: "tech" | "topic";
  targetId: string;
  name: string;
  weeksLeft: number;
  totalWeeks: number;
  /** Staff member currently running this job. */
  assigneeId?: string;
  assigneeName?: string;
  /** Design/tech or a DevField the job prefers. */
  focusField?: DevField | "design" | "tech";
}

export interface GameSettings {
  pirateMode: boolean;
  autosave: boolean;
  reducedMotion: boolean;
  infoMode: "classic" | "assisted" | "analyst";
  disableBankruptcy: boolean;
  /** QA: force 10.0 reviews on next releases (toggle). */
  forcePerfectScore?: boolean;
  /** QA: force ~2.0 reviews on next releases (toggle). */
  forceBadScore?: boolean;
  /** CheatMod: no bugs during development */
  noBugsMode?: boolean;
  /** CheatMod: research completes almost instantly */
  fastResearchMode?: boolean;
  /** CheatMod: show all hints / analyst density */
  showAllHints?: boolean;
  /** CheatMod: staff never need vacation */
  noVacationMode?: boolean;
}

export interface GameState {
  version: number;
  phase: "menu" | "playing" | "gameover";
  companyName: string;
  week: number;
  year: number;
  month: number;
  cash: number;
  fans: number;
  researchPoints: number;
  hype: number;
  office: OfficeTier;
  speed: Speed;
  /** In-game screen (not modal). */
  screen: ScreenId;
  modal: ModalId;
  settings: GameSettings;
  unlockedTopics: string[];
  unlockedGenres: GenreId[];
  unlockedPlatforms: string[];
  researched: string[];
  /** Progressive system unlocks */
  unlocks: Record<string, UnlockState>;
  engines: EngineDef[];
  /**
   * Full engine workshop (families, immutable versions, active build).
   * engines[] remains the scoring/UI bridge derived from versions.
   */
  engineWorkshop?: import("./engine/types").EngineWorkshopState;
  staff: StaffMember[];
  currentProject: GameProject | null;
  releasedGames: ReleasedGame[];
  activeSales: ReleasedGame[];
  contracts: ContractOffer[];
  activeContract: ContractOffer | null;
  /** @deprecated Prefer activeResearchJobs — kept in sync as jobs[0] for older UI. */
  activeResearch: ResearchJob | null;
  /** Concurrent research jobs (one per free specialist when team exists). */
  activeResearchJobs: ResearchJob[];
  /** Paid research waiting for a free specialist. */
  researchQueue: ResearchJob[];
  notifications: Notification[];
  lastReviewGameId: string | null;
  selectedGameId: string | null;
  pendingEvent: GameEvent | null;
  /** Event anti-spam */
  recentEventKeys: string[];
  eventCooldowns: Record<string, number>;
  highScore: number;
  targetHighScore: number;
  previousHighBaseScore: number;
  lastScoreBreakdown?: {
    baseScore: number;
    hiddenFinalScore: number;
    targetHighScore: number;
    qualityFactor: number;
    bugRatio: number;
  } | null;
  totalRevenue: number;
  gamesPublished: number;
  piracyLossRate: number;
  marketingLevel: number;
  flags: {
    multiGenre: boolean;
    sequels: boolean;
    expansions: boolean;
    marketing: boolean;
    contracts: boolean;
    audience: boolean;
    rndLab: boolean;
    hardwareLab: boolean;
  };
  /** External market buffs (trade shows, creators, waves). */
  external?: {
    marketingMult: number;
    marketingUntilWeek: number;
    bookedCreatorId: string | null;
    creatorUntilWeek: number;
    mediaTopicsUnlocked: string[];
  };
  draft?: Partial<GameProject> | null;
  lastComboKey?: string;
  consecutiveSameCombo: number;
  tutorialStep: number;
  cheatsEnabled: boolean;
  /** Append-only cheat audit (CheatMod). */
  cheatLog?: { week: number; action: string; detail?: string }[];
  dirty: boolean;
  lastSavedWeek: number;
  /** Deterministic campaign seed for scoring/sales. */
  campaignSeed: number;
  /** Dynamic market V2 state (rivals, platforms, trends). */
  market: import("./market/types").MarketState | null;
  /** Persistent knowledge flywheel from reports / cancels. */
  knowledge: import("./contracts").CampaignKnowledge;
  /** Garage slice mode: restrict content to verified small set. */
  garageSlice: boolean;
  /** Publishing board (late garage). Null until unlocked. */
  publishingBoard?: import("./commercial/publishing").PublishingBoardState | null;
  /** Active deal id accepted for current / next project. */
  activePublisherDealId?: string | null;
  /** Fractional RP accumulator (founder activity + market). */
  researchPointsFrac?: number;
  /** Part 2: research lifecycle pipeline (not a purchase menu). */
  researchPipeline?: import("./research/types").ResearchPipelineState;
  /** Part 2: campaign difficulty (economy/uncertainty only). */
  difficulty?: import("./research/types").DifficultyConfig;
  /** Part 2: proprietary hardware projects (bottlenecked axes). */
  hardwareProjects?: import("./hardware/types").HardwareProject[];
  /** Series franchise reputation map. */
  seriesRecords?: Record<string, import("./commercial/sequels").SeriesRecord>;
  /** Append-only finance ledger (mirrors cash). */
  ledger?: import("./finance/ledger").FinanceLedger;
  /**
   * Authoritative studio progression (bible Checkpoint 1+).
   * Optional on legacy saves — migrated on load.
   */
  progression?: import("./progression/types").StudioProgressionState;
}


export type CriticReviewStored = {
  name: string;
  score: number;
  comment: string;
};


export type { UnlockId as ProgressionUnlockId };
