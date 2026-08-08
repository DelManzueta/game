/**
 * Studio Empire — in-game engine development (Part 3).
 * Engine = capability & efficiency; team converts it into a game.
 */

import type { GameSize } from "../types";

/** Long-term technology lineage. */
export type EngineSupportState =
  | "prototype"
  | "alpha"
  | "beta"
  | "release_candidate"
  | "stable"
  | "lts"
  | "legacy"
  | "deprecated"
  | "sunset";

export type EnginePurpose =
  | "fast_2d"
  | "cinematic_narrative"
  | "high_speed_action"
  | "deep_simulation"
  | "open_world"
  | "competitive_multiplayer"
  | "persistent_online"
  | "portable_cross_platform"
  | "mobile_handheld"
  | "experimental_future";

export type ArchitectureStyle =
  | "monolithic"
  | "modular"
  | "platform_specific"
  | "portable"
  | "data_driven"
  | "hardcoded";

export type TargetLifespan =
  | "one_project"
  | "short_generation"
  | "multi_project"
  | "studio_foundation"
  | "licensed_commercial";

export type ModuleCategory =
  | "core_runtime"
  | "rendering"
  | "physics"
  | "animation"
  | "audio"
  | "ai"
  | "world"
  | "scripting"
  | "ui"
  | "networking"
  | "save_data"
  | "tools"
  | "build_deploy"
  | "quality_telemetry";

export type ModuleMaturity =
  | "prototype"
  | "early_production"
  | "mature"
  | "aging"
  | "legacy";

export type EngineDevPhase =
  | "requirements"
  | "architecture"
  | "core_runtime"
  | "primary_modules"
  | "content_tools"
  | "platform_adapters"
  | "integration"
  | "stabilization"
  | "released";

export type FeatureDepth = "minimal" | "standard" | "advanced" | "flagship";

/** Priority axes — limited points; cannot max everything. */
export type ArchitecturePriority =
  | "runtime_performance"
  | "development_speed"
  | "portability"
  | "stability"
  | "visual_ceiling"
  | "simulation_scale"
  | "networking_scale"
  | "maintainability"
  | "modularity"
  | "ease_of_use";

export interface EngineModuleDef {
  id: string;
  name: string;
  category: ModuleCategory;
  /** Research/component id link into ENGINE_COMPONENTS when applicable. */
  componentId?: string;
  /** Min industry year for availability. */
  minYear?: number;
  /** Base integration work units. */
  baseWork: number;
  /** Runtime demands 0–1. */
  cpuDemand: number;
  gpuDemand: number;
  memoryDemand: number;
  networkDemand: number;
  /** Hard prerequisites (module ids). */
  dependencies: string[];
  /** Soft conflicts — extra work, not hard blocks. */
  conflicts: string[];
  /** Which project sizes benefit most. */
  bestSizes: GameSize[];
  starting?: boolean;
  description: string;
}

export interface EngineFamily {
  familyId: string;
  name: string;
  ownerCompanyId: string;
  createdWeek: number;
  createdYear: number;
  architectureGeneration: number;
  reputation: number;
  sharedDebt: number;
  licensedExternally: boolean;
  supportPolicy: "active" | "lts_only" | "legacy_only" | "abandoned";
  /** Primary purpose chosen at family creation. */
  purpose: EnginePurpose;
  secondaryPurposes: EnginePurpose[];
  architecture: ArchitectureStyle;
  lifespan: TargetLifespan;
  priorities: Partial<Record<ArchitecturePriority, number>>;
}

export interface ModuleSnapshot {
  moduleId: string;
  versionLabel: string;
  maturity: ModuleMaturity;
  technicalDebt: number;
  knownDefects: number;
}

export interface PlatformAdapterSnapshot {
  adapterId: string;
  platformId: string;
  sdkVersion: string;
  maturity: ModuleMaturity;
  certificationState: "none" | "in_progress" | "certified" | "failed";
  performanceProfile: number;
  knownIssues: number;
  maintenanceCost: number;
}

export interface EngineVersion {
  versionId: string;
  familyId: string;
  major: number;
  minor: number;
  patch: number;
  /** Display label e.g. "Forge 3.2". */
  label: string;
  status: EngineSupportState;
  releaseWeek: number;
  releaseYear: number;
  supportedProjectSizes: GameSize[];
  supportedPlatforms: string[];
  modules: ModuleSnapshot[];
  platformAdapters: PlatformAdapterSnapshot[];
  stability: number;
  maintainability: number;
  portability: number;
  performance: number;
  toolQuality: number;
  knownIssues: string[];
  technicalDebt: number;
  /** Immutable once released (status past release_candidate with a freeze). */
  immutable: boolean;
  /** Legacy EngineDef bridge id (same as versionId for custom). */
  engineDefId: string;
  /** Feature strings for scoring / project features list. */
  features: string[];
  designBonus: number;
  techBonus: number;
  cost: number;
  weeksToBuild: number;
  custom: boolean;
}

/** Active engine R&D project (mutable until release). */
export interface EngineBuildProject {
  projectId: string;
  familyId: string;
  /** Target version numbers. */
  major: number;
  minor: number;
  patch: number;
  name: string;
  phase: EngineDevPhase;
  phaseProgress: number;
  overallProgress: number;
  selectedModuleIds: string[];
  targetPlatforms: string[];
  targetSizes: GameSize[];
  purpose: EnginePurpose;
  secondaryPurposes: EnginePurpose[];
  architecture: ArchitectureStyle;
  lifespan: TargetLifespan;
  priorities: Partial<Record<ArchitecturePriority, number>>;
  requiredWork: number;
  completedWork: number;
  weeklyCapacity: number;
  technicalDebt: number;
  costPaid: number;
  weeksElapsed: number;
  weeksEstimate: number;
  assignedStaffIds: string[];
  blockers: string[];
  missingDependencies: string[];
  conflicts: string[];
  startedWeek: number;
}

/** Frozen at game project start — later engine upgrades do not rewrite this. */
export interface GameEngineSnapshot {
  gameId: string;
  engineVersionId: string;
  familyId: string;
  label: string;
  selectedModules: string[];
  platformAdapters: string[];
  gameSpecificChanges: string[];
  integrationHealth: number;
  implementationCompletion: number;
  runtimeProfile: number;
  inheritedDebt: number;
  newlyCreatedDebt: number;
  suitability: EngineSuitability;
  capturedWeek: number;
  capturedYear: number;
}

export interface EngineSuitability {
  gameplay: number;
  platform: number;
  scale: number;
  performance: number;
  tools: number;
  team: number;
  online: number;
  longTermSupport: number;
  /** Weighted summary for UI — never the only signal. */
  overall: number;
  notes: string[];
}

export interface EngineWorkshopState {
  families: EngineFamily[];
  versions: EngineVersion[];
  /** At most one active engine build. */
  activeBuild: EngineBuildProject | null;
  /** Staff familiarity familyId → 0–1. */
  familyFamiliarity: Record<string, number>;
  /** Module familiarity moduleId → 0–1. */
  moduleFamiliarity: Record<string, number>;
}

export const ENGINE_DEV_PHASE_ORDER: EngineDevPhase[] = [
  "requirements",
  "architecture",
  "core_runtime",
  "primary_modules",
  "content_tools",
  "platform_adapters",
  "integration",
  "stabilization",
  "released",
];

export const PHASE_WEIGHT: Record<EngineDevPhase, number> = {
  requirements: 0.06,
  architecture: 0.1,
  core_runtime: 0.14,
  primary_modules: 0.22,
  content_tools: 0.12,
  platform_adapters: 0.12,
  integration: 0.12,
  stabilization: 0.12,
  released: 0,
};

export const SUPPORT_STATE_LABEL: Record<EngineSupportState, string> = {
  prototype: "Prototype",
  alpha: "Alpha",
  beta: "Beta",
  release_candidate: "Release Candidate",
  stable: "Stable",
  lts: "Long-Term Support",
  legacy: "Legacy",
  deprecated: "Deprecated",
  sunset: "Sunset",
};

export const PURPOSE_LABEL: Record<EnginePurpose, string> = {
  fast_2d: "Fast 2D production",
  cinematic_narrative: "Cinematic narrative",
  high_speed_action: "High-speed action",
  deep_simulation: "Deep simulations",
  open_world: "Large open worlds",
  competitive_multiplayer: "Competitive multiplayer",
  persistent_online: "Persistent online worlds",
  portable_cross_platform: "Portable cross-platform",
  mobile_handheld: "Mobile & handheld",
  experimental_future: "Experimental future",
};

export const ARCH_LABEL: Record<ArchitectureStyle, string> = {
  monolithic: "Monolithic",
  modular: "Modular",
  platform_specific: "Platform-specific",
  portable: "Portable",
  data_driven: "Data-driven",
  hardcoded: "Hardcoded",
};
