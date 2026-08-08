/**
 * Part 4 — Optimization, QA, Performance, Certification, Release-readiness.
 * Optimization preserves intended quality; it does not create design quality.
 */

import type { GameSize, GenreId } from "../types";

export type PerformanceAxis =
  | "cpu"
  | "gpu"
  | "memory"
  | "storage"
  | "io"
  | "network"
  | "battery"
  | "thermal"
  | "server"
  | "input"
  | "loading"
  | "stability";

export type TargetFps = 30 | 40 | 60 | 90 | 120;

export type OptimizationTaskType =
  | "engineering"
  | "content"
  | "quality_compromise"
  | "emergency_hack";

export type OptimizationTaskState =
  | "discovered"
  | "queued"
  | "in_progress"
  | "done"
  | "deferred"
  | "cancelled";

export type BugSeverity = "blocker" | "critical" | "major" | "minor" | "cosmetic";
export type BugCategory =
  | "crash"
  | "save"
  | "quest"
  | "performance"
  | "network"
  | "ui"
  | "audio"
  | "graphics"
  | "security"
  | "certification"
  | "other";

export type CertificationResult = "pass" | "pass_with_waivers" | "fail" | "not_required" | "pending";

export type ParityPolicy = "strict" | "visual" | "tailored" | "cloud_companion";

/** ms frame budgets by FPS target. */
export const FRAME_BUDGET_MS: Record<TargetFps, number> = {
  30: 33.3,
  40: 25,
  60: 16.7,
  90: 11.1,
  120: 8.3,
};

export interface PerformanceBudget {
  platformId: string;
  targetFps: TargetFps;
  cpuFrameBudgetMs: number;
  gpuFrameBudgetMs: number;
  /** Relative 0–1 capacity units. */
  memoryBudget: number;
  storageBudget: number;
  ioBudget: number;
  networkBudget: number;
  batteryTarget: number;
  thermalTarget: number;
  loadingStartupSec: number;
  loadingTransitionSec: number;
  serverConcurrentUsers: number;
}

export interface AxisDemand {
  cpu: number;
  gpu: number;
  memory: number;
  storage: number;
  io: number;
  network: number;
  battery: number;
  thermal: number;
  server: number;
  input: number;
  loading: number;
  stability: number;
}

export interface AxisUtilization {
  axis: PerformanceAxis;
  demand: number;
  budget: number;
  utilization: number;
  health: number;
  band: "comfortable" | "healthy" | "tight" | "over" | "critical";
  relevant: boolean;
}

export interface RuntimeProfile {
  gameId: string;
  platformId: string;
  buildId: string;
  targetFps: TargetFps;
  axes: AxisUtilization[];
  overallHealth: number;
  weakestCriticalAxis: PerformanceAxis | null;
  weakestHealth: number;
  confidence: number;
  estimateRanges: Partial<Record<PerformanceAxis, { lo: number; hi: number }>>;
  notes: string[];
}

export interface OptimizationTask {
  taskId: string;
  type: OptimizationTaskType;
  affectedAxis: PerformanceAxis;
  affectedPlatforms: string[];
  severity: number;
  estimatedWork: number;
  completedWork: number;
  requiredSpecialty: string;
  expectedImprovement: number;
  qualityTradeoff: number;
  regressionRisk: number;
  debtChange: number;
  state: OptimizationTaskState;
  label: string;
  description: string;
}

export interface ClassifiedBug {
  bugId: string;
  category: BugCategory;
  severity: BugSeverity;
  exposure: number;
  affectedPlatforms: string[];
  discovered: boolean;
  fixed: boolean;
  verified: boolean;
  remainingWork: number;
  regressionRisk: number;
  certificationBlocker: boolean;
  saveRisk: boolean;
  securityRisk: boolean;
  priority: number;
  discipline?: string;
  sourceStage?: number;
}

export interface CertificationState {
  platformId: string;
  result: CertificationResult;
  attempts: number;
  issues: string[];
  lastCheckedWeek: number;
  waiverNotes: string[];
}

export interface ReleaseReadiness {
  buildId: string;
  featureCompletion: number;
  performanceOk: boolean;
  stabilityOk: boolean;
  blockers: string[];
  warnings: string[];
  certification: CertificationState[];
  localizationOk: boolean;
  accessibilityOk: boolean;
  serverReady: boolean;
  recommendation: "ship" | "ship_with_risk" | "hold" | "blocked";
  recommendationReason: string;
  technicalReviewHint: number;
  canOverrideInternal: boolean;
  platformBlocksRelease: boolean;
}

export interface ProjectTechSpec {
  targetFps: TargetFps;
  parityPolicy: ParityPolicy;
  leadPlatformId: string;
  platforms: string[];
  /** Pillar weights for relevant axes. */
  pillar:
    | "competitive"
    | "cinematic"
    | "living_world"
    | "deep_simulation"
    | "social"
    | "tech_showcase"
    | "accessible_fun"
    | "default";
  budgets: PerformanceBudget[];
  profile: RuntimeProfile | null;
  tasks: OptimizationTask[];
  classifiedBugs: ClassifiedBug[];
  certifications: CertificationState[];
  readiness: ReleaseReadiness | null;
  technicalDebt: number;
  crunchWeeksUsed: number;
}

export const AXIS_LABEL: Record<PerformanceAxis, string> = {
  cpu: "CPU",
  gpu: "GPU",
  memory: "Memory",
  storage: "Storage",
  io: "I/O & Loading",
  network: "Network",
  battery: "Battery",
  thermal: "Thermals",
  server: "Servers",
  input: "Input",
  loading: "Load times",
  stability: "Stability",
};

export const SEVERITY_RANK: Record<BugSeverity, number> = {
  blocker: 5,
  critical: 4,
  major: 3,
  minor: 2,
  cosmetic: 1,
};

export type GenreTechPriorities = Partial<Record<PerformanceAxis, number>>;
