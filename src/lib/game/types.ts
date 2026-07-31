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
export type OfficeTier = 1 | 2 | 3 | 4;
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
  | "loopGuide";

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
}

export interface Notification {
  id: string;
  text: string;
  tone: "info" | "good" | "warn" | "bad";
  week: number;
}

export interface ResearchJob {
  id: string;
  kind: "tech" | "topic";
  targetId: string;
  name: string;
  weeksLeft: number;
  totalWeeks: number;
}

export interface GameSettings {
  pirateMode: boolean;
  autosave: boolean;
  reducedMotion: boolean;
  infoMode: "classic" | "assisted" | "analyst";
  disableBankruptcy: boolean;
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
  staff: StaffMember[];
  currentProject: GameProject | null;
  releasedGames: ReleasedGame[];
  activeSales: ReleasedGame[];
  contracts: ContractOffer[];
  activeContract: ContractOffer | null;
  activeResearch: ResearchJob | null;
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
  draft?: Partial<GameProject> | null;
  lastComboKey?: string;
  consecutiveSameCombo: number;
  tutorialStep: number;
  cheatsEnabled: boolean;
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
}


export type CriticReviewStored = {
  name: string;
  score: number;
  comment: string;
};


export type { UnlockId as ProgressionUnlockId };
