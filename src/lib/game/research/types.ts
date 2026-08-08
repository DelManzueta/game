/**
 * Part 2 — Research lifecycle, features, topics, pricing, difficulty, hardware hooks.
 * Research is a pipeline, not a purchase menu.
 */

import type { DevField, GameSize, GenreId } from "../types";

/** Full research lifecycle (Part 2 §1). */
export type TechLifecycleState =
  | "unknown"
  | "observed"
  | "researchable"
  | "researching"
  | "prototype"
  | "engine_integration"
  | "production_ready"
  | "first_commercial"
  | "mature"
  | "legacy"
  | "deprecated"
  | "sunset";

export type TechCategory =
  | "studio"
  | "game_design"
  | "narrative"
  | "rendering"
  | "audio"
  | "ai"
  | "simulation"
  | "networking"
  | "tools"
  | "localization"
  | "save_system"
  | "business"
  | "optimization"
  | "spatial"
  | "engine"
  | "platform"
  | "other";

export type TechEraId =
  | "era1_foundational" // 1980–85
  | "era2_advanced_2d" // 1986–91
  | "era3_multimedia_3d" // 1992–97
  | "era4_accelerated" // 1998–2003
  | "era5_hd_digital" // 2004–09
  | "era6_live_ops" // 2010–15
  | "era7_cross_platform" // 2016–21
  | "era8_hybrid" // 2022–30
  | "era9_spatial" // 2031–40
  | "era10_persistent"; // 2041–50

export type TopicTag =
  | "narrative_heavy"
  | "systems_heavy"
  | "simulation_heavy"
  | "spectacle_heavy"
  | "tactical"
  | "social"
  | "competitive"
  | "sandbox"
  | "cozy"
  | "horror";

export type ProjectPillar =
  | "cinematic_narrative"
  | "competitive_mastery"
  | "living_world"
  | "technical_showcase"
  | "accessible_fun"
  | "deep_simulation"
  | "social_experience"
  | "default";

export type DifficultyPreset = "creative" | "standard" | "executive" | "custom";

export interface TechRuntimeDemand {
  cpu: number;
  gpu: number;
  memory: number;
  storage: number;
  io: number;
  network: number;
  battery: number;
  thermal: number;
}

export interface TechDef {
  id: string;
  name: string;
  category: TechCategory;
  description: string;
  era: TechEraId;
  tags: string[];
  /** Discovery windows (calendar year). */
  earliestYear: number;
  normalYear: number;
  latestYear: number;
  requires: string[];
  /** Research costs (when researchable). */
  researchRp: number;
  researchCash: number;
  researchWeeks: number;
  prototypeRisk: number;
  integrationWork: number;
  productionWork: number;
  runtime: TechRuntimeDemand;
  maintenance: number;
  debtGeneration: number;
  /** Genre relevance 0–1. */
  genreRelevance: Partial<Record<GenreId, number>>;
  sizeFit: Partial<Record<GameSize, number>>;
  /** Maps to legacy RESEARCH / engine component ids when applicable. */
  legacyResearchId?: string;
  /** Feature string added to games when selected. */
  featureKey?: string;
  /** Not engine tech — design/business/legal. */
  isDesignOnly?: boolean;
  specialistField?: DevField | "design" | "tech";
}

export interface CompanyTechState {
  techId: string;
  state: TechLifecycleState;
  progress: number;
  commercialUses: number;
  maturity: number;
  lastAdvancedWeek: number;
  prototypeNotes: string[];
  integrationComplete: boolean;
  observedYear?: number;
  failureKnowledge: number;
}

export interface ResearchPipelineState {
  /** Per-tech company knowledge. Missing = unknown until observed. */
  knowledge: Record<string, CompanyTechState>;
  /** Active prototype / integration jobs (beyond simple ResearchJob weeks). */
  activePipelineJobs: {
    techId: string;
    phase: "researching" | "prototype" | "engine_integration";
    weeksLeft: number;
    totalWeeks: number;
  }[];
}

export interface GenrePhaseWeights {
  engine: number;
  gameplay: number;
  story: number;
  dialogue: number;
  level: number;
  ai: number;
  world: number;
  graphics: number;
  sound: number;
}

export interface ProductPricing {
  basePrice: number;
  deluxePrice: number | null;
  digitalPrice: number;
  physicalPrice: number | null;
  launchDiscount: number;
  regionMult: number;
  platformMult: number;
  /** Frozen at release — never rewritten by later global settings. */
  lockedAtWeek: number;
  lockedAtYear: number;
}

export interface DifficultyConfig {
  preset: DifficultyPreset;
  startingCashMult: number;
  forecastAccuracy: number;
  competitorStrength: number;
  marketVolatility: number;
  wagePressure: number;
  employeeExpectations: number;
  publisherQuality: number;
  certificationStrictness: number;
  fanForgiveness: number;
  bankruptcyAssistance: number;
  eventSeverity: number;
  techEstimateUncertainty: number;
  /** Never changes design meaning — only these knobs. */
}

export interface DecisionEventChoice {
  id: string;
  label: string;
  summary: string;
  effects: {
    cash?: number;
    morale?: number;
    hype?: number;
    fans?: number;
    weeksDelay?: number;
    reputation?: number;
    debt?: number;
    note?: string;
  };
}

export interface DecisionEventDef {
  id: string;
  category: string;
  title: string;
  body: string;
  earliestYear: number;
  latestYear: number;
  cooldownWeeks: number;
  minGames?: number;
  minOffice?: number;
  requiresProject?: boolean;
  choices: DecisionEventChoice[];
}

export interface PendingDecisionEvent {
  defId: string;
  title: string;
  body: string;
  choices: DecisionEventChoice[];
  week: number;
}
