/**
 * Platform performance budgets & default tech targets by size/genre.
 */

import type { GameSize, GenreId } from "../types";
import type {
  PerformanceBudget,
  PerformanceAxis,
  TargetFps,
  GenreTechPriorities,
  ProjectTechSpec,
  ParityPolicy,
} from "./types";
import { FRAME_BUDGET_MS } from "./types";

/** Relative platform capacity (1.0 = 1979 PC baseline-ish for garage feel). */
const PLATFORM_CAPACITY: Record<
  string,
  {
    cpu: number;
    gpu: number;
    memory: number;
    storage: number;
    io: number;
    network: number;
    battery: number;
    thermal: number;
    server: number;
  }
> = {
  pc: { cpu: 1, gpu: 1, memory: 1, storage: 1.2, io: 1, network: 0.8, battery: 1, thermal: 1, server: 1 },
  itara: { cpu: 0.55, gpu: 0.45, memory: 0.4, storage: 0.5, io: 0.45, network: 0.2, battery: 1, thermal: 0.9, server: 0.2 },
  master_v: { cpu: 0.7, gpu: 0.65, memory: 0.55, storage: 0.6, io: 0.55, network: 0.25, battery: 1, thermal: 0.95, server: 0.25 },
  playsystem: { cpu: 1.1, gpu: 1.15, memory: 0.9, storage: 0.85, io: 0.9, network: 0.5, battery: 1, thermal: 1, server: 0.5 },
  mbox: { cpu: 1.3, gpu: 1.35, memory: 1.1, storage: 1, io: 1, network: 0.7, battery: 1, thermal: 1, server: 0.7 },
  swap: { cpu: 1.2, gpu: 1.1, memory: 1, storage: 0.95, io: 1, network: 0.85, battery: 0.55, thermal: 0.6, server: 0.8 },
  grphone: { cpu: 0.9, gpu: 0.85, memory: 0.7, storage: 0.6, io: 0.8, network: 0.9, battery: 0.45, thermal: 0.5, server: 0.9 },
  mpad: { cpu: 1, gpu: 0.95, memory: 0.85, storage: 0.75, io: 0.9, network: 0.85, battery: 0.5, thermal: 0.55, server: 0.85 },
};

function capacityFor(platformId: string) {
  return (
    PLATFORM_CAPACITY[platformId] ?? {
      cpu: 1,
      gpu: 1,
      memory: 0.9,
      storage: 0.9,
      io: 0.9,
      network: 0.6,
      battery: 1,
      thermal: 0.95,
      server: 0.6,
    }
  );
}

const SIZE_FPS: Record<GameSize, TargetFps> = {
  small: 30,
  medium: 30,
  large: 60,
  aaa: 60,
};

export function defaultTargetFps(size: GameSize, genreId: GenreId): TargetFps {
  if (genreId === "action" && (size === "large" || size === "aaa")) return 60;
  if (genreId === "casual") return 30;
  return SIZE_FPS[size] ?? 30;
}

export function buildPlatformBudget(
  platformId: string,
  targetFps: TargetFps,
): PerformanceBudget {
  const c = capacityFor(platformId);
  const frame = FRAME_BUDGET_MS[targetFps];
  return {
    platformId,
    targetFps,
    cpuFrameBudgetMs: frame * c.cpu,
    gpuFrameBudgetMs: frame * c.gpu,
    memoryBudget: c.memory,
    storageBudget: c.storage,
    ioBudget: c.io,
    networkBudget: c.network,
    batteryTarget: c.battery,
    thermalTarget: c.thermal,
    loadingStartupSec: platformId === "pc" ? 12 : 18,
    loadingTransitionSec: platformId.includes("phone") || platformId === "grphone" ? 4 : 6,
    serverConcurrentUsers: Math.round(1000 * c.server),
  };
}

/** Genre axis relevance weights (sum not required = 1). */
export function genreAxisWeights(genreId: GenreId): GenreTechPriorities {
  switch (genreId) {
    case "action":
      return { input: 1.2, cpu: 0.9, gpu: 1.1, stability: 0.9, loading: 0.7, memory: 0.7 };
    case "adventure":
      return { stability: 1.1, loading: 0.9, memory: 0.85, gpu: 0.7, io: 0.8, input: 0.5 };
    case "rpg":
      return { stability: 1.2, memory: 1, loading: 0.95, cpu: 0.85, io: 0.85 };
    case "simulation":
      return { cpu: 1.3, stability: 1.1, memory: 0.95, input: 0.5, gpu: 0.55 };
    case "strategy":
      return { cpu: 1.2, input: 0.85, memory: 0.9, network: 0.7, stability: 0.95 };
    case "casual":
      return { loading: 1.1, battery: 1, storage: 0.9, stability: 1, input: 0.75, memory: 0.7 };
    default:
      return { cpu: 0.8, gpu: 0.8, memory: 0.8, stability: 1 };
  }
}

export function sizeComplexity(size: GameSize): number {
  return { small: 0.7, medium: 1, large: 1.35, aaa: 1.75 }[size] ?? 1;
}

export function createProjectTechSpec(opts: {
  gameId: string;
  platformId: string;
  extraPlatforms?: string[];
  size: GameSize;
  genreId: GenreId;
  pillar?: ProjectTechSpec["pillar"];
  wantsOnline?: boolean;
  parityPolicy?: ParityPolicy;
}): ProjectTechSpec {
  const fps = defaultTargetFps(opts.size, opts.genreId);
  const platforms = [opts.platformId, ...(opts.extraPlatforms ?? [])].filter(
    (p, i, a) => a.indexOf(p) === i,
  );
  const budgets = platforms.map((p) => buildPlatformBudget(p, fps));
  return {
    targetFps: fps,
    parityPolicy: opts.parityPolicy ?? "visual",
    leadPlatformId: opts.platformId,
    platforms,
    pillar: opts.pillar ?? "default",
    budgets,
    profile: null,
    tasks: [],
    classifiedBugs: [],
    certifications: platforms.map((p) => ({
      platformId: p,
      result: p === "pc" ? ("not_required" as const) : ("pending" as const),
      attempts: 0,
      issues: [],
      lastCheckedWeek: 0,
      waiverNotes: [],
    })),
    readiness: null,
    technicalDebt: 0,
    crunchWeeksUsed: 0,
  };
}

export function utilizationBand(
  u: number,
): "comfortable" | "healthy" | "tight" | "over" | "critical" {
  if (u < 0.75) return "comfortable";
  if (u < 0.9) return "healthy";
  if (u < 1) return "tight";
  if (u < 1.15) return "over";
  return "critical";
}

export function utilizationToHealth(u: number): number {
  if (u < 0.75) return 1;
  if (u < 0.9) return 0.92;
  if (u < 1) return 0.78;
  if (u < 1.15) return 0.45;
  return Math.max(0.05, 0.35 - (u - 1.15) * 0.5);
}

export const ALL_AXES: PerformanceAxis[] = [
  "cpu",
  "gpu",
  "memory",
  "storage",
  "io",
  "network",
  "battery",
  "thermal",
  "server",
  "input",
  "loading",
  "stability",
];
