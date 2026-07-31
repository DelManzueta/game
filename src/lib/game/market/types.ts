import type { GenreId, GameSize } from "../types";

export type RivalStrategy =
  | "boutique"
  | "tech_specialist"
  | "narrative"
  | "mass_market"
  | "trend_chaser"
  | "innovator"
  | "franchise_factory"
  | "platform_loyalist"
  | "budget"
  | "prestige";

export type RivalStatus = "active" | "struggling" | "bankrupt";

export type RivalProjectPhase =
  | "planning"
  | "stage_1"
  | "stage_2"
  | "stage_3"
  | "polishing"
  | "announced"
  | "released"
  | "on_sale"
  | "off_market"
  | "cancelled";

export type PlatformLifecycle =
  | "rumored"
  | "announced"
  | "launch"
  | "growth"
  | "mature"
  | "decline"
  | "discontinued";

export type MarketTrendSubject =
  | { kind: "genre"; id: GenreId }
  | { kind: "topic"; id: string };

export interface MarketTrend {
  key: string;
  kind: "genre" | "topic";
  subjectId: string;
  momentum: number; // ~0.72–1.35 around 1.0 baseline
  publicAwareness: number;
  saturation: number; // 0–1
  startedWeek: number;
  lastChangeWeek: number;
  cause: string;
}

export interface PlatformMarketState {
  id: string;
  name: string;
  short: string;
  launchYear: number;
  launchWeek: number;
  hardwareQuality: number;
  price: number;
  licenseCost: number;
  marketSizeBase: number;
  installedBase: number;
  activeUsers: number;
  brandStrength: number;
  momentum: number;
  catalogStrength: number;
  exclusiveStrength: number;
  lifecycle: PlatformLifecycle;
  techCeiling: number;
}

export interface RivalProject {
  id: string;
  studioId: string;
  title: string;
  topicId: string;
  genreId: GenreId;
  platformId: string;
  size: GameSize;
  phase: RivalProjectPhase;
  weeksInPhase: number;
  weeksPlanned: number;
  plannedReleaseWeek: number;
  announcedWeek: number | null;
  releasedWeek: number | null;
  /** Abstract production quality 1–100 */
  craftQuality: number;
  productQuality: number;
  bugs: number;
  avgReview: number;
  reviewScores: number[];
  marketingSpend: number;
  developmentCost: number;
  weeklySalesLeft: number[];
  weeklyHistory: { week: number; units: number; revenue: number; competitionModifier?: number }[];
  sales: number;
  revenue: number;
  onSale: boolean;
  competitionModifier: number;
  announced: boolean;
}

export interface RivalStudio {
  id: string;
  name: string;
  foundedWeek: number;
  status: RivalStatus;
  cash: number;
  reputation: number;
  fanBase: number;
  riskTolerance: number;
  trendResponsiveness: number;
  innovationPreference: number;
  qualityPreference: number;
  franchisePreference: number;
  strategy: RivalStrategy;
  disciplineCap: Record<string, number>;
  genreBeliefs: Partial<Record<GenreId, number>>;
  platformLoyalties: Record<string, number>;
  activeProject: RivalProject | null;
  releaseHistory: string[];
  weeksSinceProject: number;
}

export interface IndustryNewsItem {
  id: string;
  week: number;
  category: string;
  headline: string;
  body: string;
  causeEntityIds: string[];
}

export interface CalendarEntry {
  id: string;
  week: number;
  kind: "player_release" | "rival_release" | "rival_announce" | "platform" | "news";
  title: string;
  detail: string;
  entityId?: string;
  public: boolean;
}

export interface WeeklyMarketSnapshot {
  week: number;
  genreMomentum: Partial<Record<GenreId, number>>;
  competitionByGameId: Record<string, number>;
  activeReleaseCount: number;
}

export interface MarketState {
  version: number;
  initialized: boolean;
  rivals: RivalStudio[];
  platforms: PlatformMarketState[];
  trends: MarketTrend[];
  news: IndustryNewsItem[];
  calendar: CalendarEntry[];
  fatigue: Record<string, number>; // concept key → load
  lastSnapshot: WeeklyMarketSnapshot | null;
  rivalGamesOnSale: RivalProject[];
  rngCounters: {
    rival: number;
    trend: number;
    platform: number;
    news: number;
  };
}
