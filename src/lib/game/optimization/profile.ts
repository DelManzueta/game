import { hashSeed } from "../scoring/rng";
/**
 * Runtime demand estimation & overall runtime health (weakest-axis capped).
 */

import type { GameSize, GenreId } from "../types";
import {
  ALL_AXES,
  genreAxisWeights,
  sizeComplexity,
  utilizationBand,
  utilizationToHealth,
} from "./budgets";
import type {
  AxisDemand,
  AxisUtilization,
  PerformanceAxis,
  PerformanceBudget,
  ProjectTechSpec,
  RuntimeProfile,
  ClassifiedBug,
} from "./types";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Estimate demand from project shape. Confidence rises with polish progress & tools.
 * Early ranges are wide — player never gets exact final performance day one.
 */
export function estimateDemand(opts: {
  size: GameSize;
  genreId: GenreId;
  stageProgress: number;
  polishProgress01: number;
  featureCount: number;
  engineTechBonus: number;
  engineStability: number;
  wantsOnline: boolean;
  openWorldish: boolean;
  techDebt: number;
}): AxisDemand {
  const sc = sizeComplexity(opts.size);
  const feat = 1 + opts.featureCount * 0.04;
  const eng = 1 - Math.min(0.25, opts.engineTechBonus / 80);
  const debt = 1 + opts.techDebt / 120;
  const scope = sc * feat * eng * debt;

  const base = {
    cpu: 0.45 * scope,
    gpu: 0.4 * scope,
    memory: 0.42 * scope,
    storage: 0.35 * sc * feat,
    io: 0.38 * scope,
    network: opts.wantsOnline ? 0.55 * scope : 0.08,
    battery: 0.3 * scope,
    thermal: 0.35 * scope,
    server: opts.wantsOnline ? 0.5 * scope : 0.05,
    input: 0.35 + (opts.genreId === "action" ? 0.2 : 0) * sc,
    loading: 0.4 * scope,
    stability: 0.3 + (1 - opts.engineStability) * 0.4 + opts.techDebt / 200,
  };

  if (opts.openWorldish) {
    base.cpu *= 1.25;
    base.memory *= 1.35;
    base.io *= 1.3;
    base.loading *= 1.2;
  }
  if (opts.genreId === "simulation" || opts.genreId === "strategy") {
    base.cpu *= 1.2;
    base.gpu *= 0.85;
  }
  if (opts.genreId === "action") {
    base.gpu *= 1.15;
    base.input *= 1.2;
  }
  if (opts.genreId === "casual") {
    base.cpu *= 0.75;
    base.gpu *= 0.7;
    base.memory *= 0.7;
    base.storage *= 0.65;
  }

  // Unfinished work increases instability / loading risk
  const unfinished = 1 + (1 - clamp01(opts.stageProgress)) * 0.15 + (1 - opts.polishProgress01) * 0.1;
  base.stability *= unfinished;
  base.loading *= unfinished;

  return base;
}

export function budgetAxisValue(budget: PerformanceBudget, axis: PerformanceAxis): number {
  switch (axis) {
    case "cpu":
      return budget.cpuFrameBudgetMs / 16.7;
    case "gpu":
      return budget.gpuFrameBudgetMs / 16.7;
    case "memory":
      return budget.memoryBudget;
    case "storage":
      return budget.storageBudget;
    case "io":
      return budget.ioBudget;
    case "network":
      return budget.networkBudget;
    case "battery":
      return budget.batteryTarget;
    case "thermal":
      return budget.thermalTarget;
    case "server":
      return budget.serverConcurrentUsers / 1000;
    case "input":
      return 1;
    case "loading":
      return 20 / Math.max(4, budget.loadingStartupSec);
    case "stability":
      return 1;
    default:
      return 1;
  }
}

export function buildRuntimeProfile(opts: {
  gameId: string;
  buildId: string;
  budget: PerformanceBudget;
  demand: AxisDemand;
  genreId: GenreId;
  size: GameSize;
  confidence: number;
  bugs: ClassifiedBug[];
  wantsOnline: boolean;
}): RuntimeProfile {
  const weights = genreAxisWeights(opts.genreId);
  const notes: string[] = [];
  const axes: AxisUtilization[] = [];

  for (const axis of ALL_AXES) {
    const demand = opts.demand[axis];
    const budget = Math.max(0.05, budgetAxisValue(opts.budget, axis));
    const utilization = demand / budget;
    const w = weights[axis] ?? 0.35;
    // Online-only axes low relevance offline
    let relevant = w >= 0.45;
    if ((axis === "network" || axis === "server") && !opts.wantsOnline) relevant = false;
    if ((axis === "battery" || axis === "thermal") && opts.budget.platformId === "pc") {
      relevant = w >= 0.8;
    }
    // Stability always relevant
    if (axis === "stability") relevant = true;

    const health = utilizationToHealth(utilization);
    // Open blockers tank stability health
    let h = health;
    if (axis === "stability") {
      const blockers = opts.bugs.filter((b) => b.discovered && !b.fixed && b.severity === "blocker");
      const crits = opts.bugs.filter((b) => b.discovered && !b.fixed && b.severity === "critical");
      if (blockers.length) h = Math.min(h, 0.1);
      else if (crits.length) h = Math.min(h, 0.35);
      else {
        const open = opts.bugs.filter((b) => b.discovered && !b.fixed);
        h = Math.min(h, 1 - Math.min(0.5, open.length * 0.04));
      }
    }

    axes.push({
      axis,
      demand,
      budget,
      utilization,
      health: h,
      band: utilizationBand(utilization),
      relevant,
    });

    if (relevant && utilization >= 1) {
      notes.push(`${axis.toUpperCase()} over budget (${Math.round(utilization * 100)}%).`);
    }
  }

  const relevant = axes.filter((a) => a.relevant);
  // Weighted geometric mean of relevant health
  let logSum = 0;
  let wSum = 0;
  for (const a of relevant) {
    const w = weights[a.axis] ?? 0.5;
    logSum += w * Math.log(Math.max(0.05, a.health));
    wSum += w;
  }
  const geo = wSum > 0 ? Math.exp(logSum / wSum) : 0.5;

  // Weakest critical axis cap (critical = high weight or stability/input for action)
  let weakest = relevant[0]!;
  for (const a of relevant) {
    if (a.health < weakest.health) weakest = a;
  }
  const overall = Math.min(geo, weakest.health + 0.08);

  const conf = clamp01(opts.confidence);
  const estimateRanges: RuntimeProfile["estimateRanges"] = {};
  for (const a of relevant) {
    const spread = (1 - conf) * 0.22;
    estimateRanges[a.axis] = {
      lo: Math.max(0, a.utilization - spread),
      hi: a.utilization + spread,
    };
  }

  if (overall < 0.5) {
    notes.unshift("Runtime health is weak — weakest axis is capping the build.");
  } else if (overall >= 0.85) {
    notes.unshift("Comfortable headroom on relevant axes.");
  }

  return {
    gameId: opts.gameId,
    platformId: opts.budget.platformId,
    buildId: opts.buildId,
    targetFps: opts.budget.targetFps,
    axes,
    overallHealth: clamp01(overall),
    weakestCriticalAxis: weakest.axis,
    weakestHealth: weakest.health,
    confidence: conf,
    estimateRanges,
    notes: notes.slice(0, 8),
  };
}

/** Refresh tech profile on a project from current production state. */
export function refreshProjectProfile(
  tech: ProjectTechSpec,
  opts: {
    gameId: string;
    size: GameSize;
    genreId: GenreId;
    stageProgress: number;
    polishProgress01: number;
    featureCount: number;
    engineTechBonus: number;
    engineStability: number;
    wantsOnline: boolean;
    openWorldish: boolean;
    bugs: ClassifiedBug[];
    week: number;
  },
): ProjectTechSpec {
  const demand = estimateDemand({
    size: opts.size,
    genreId: opts.genreId,
    stageProgress: opts.stageProgress,
    polishProgress01: opts.polishProgress01,
    featureCount: opts.featureCount,
    engineTechBonus: opts.engineTechBonus,
    engineStability: opts.engineStability,
    wantsOnline: opts.wantsOnline,
    openWorldish: opts.openWorldish,
    techDebt: tech.technicalDebt,
  });

  const budget =
    tech.budgets.find((b) => b.platformId === tech.leadPlatformId) ?? tech.budgets[0]!;

  const confidence = clamp01(
    0.25 + opts.polishProgress01 * 0.35 + opts.stageProgress * 0.25 + (opts.week > 20 ? 0.1 : 0),
  );

  const profile = buildRuntimeProfile({
    gameId: opts.gameId,
    buildId: `${opts.gameId}:b${opts.week}`,
    budget,
    demand,
    genreId: opts.genreId,
    size: opts.size,
    confidence,
    bugs: opts.bugs,
    wantsOnline: opts.wantsOnline,
  });

  // Auto-suggest optimization tasks for over-budget relevant axes
  const tasks = [...tech.tasks];
  for (const ax of profile.axes) {
    if (!ax.relevant || ax.utilization < 0.95) continue;
    const exists = tasks.some(
      (t) => t.affectedAxis === ax.axis && t.state !== "done" && t.state !== "cancelled",
    );
    if (exists) continue;
    tasks.push(suggestTaskForAxis(ax.axis, ax.utilization, tech.leadPlatformId));
  }

  return { ...tech, profile, tasks };
}

function suggestTaskForAxis(
  axis: PerformanceAxis,
  utilization: number,
  platformId: string,
): import("./types").OptimizationTask {
  const over = utilization >= 1.15;
  const type =
    over && utilization >= 1.25
      ? ("quality_compromise" as const)
      : utilization >= 1
        ? ("engineering" as const)
        : ("content" as const);
  const labels: Record<PerformanceAxis, string> = {
    cpu: "Reduce CPU simulation load",
    gpu: "GPU pass optimization",
    memory: "Memory streaming pass",
    storage: "Install-size trim",
    io: "Async loading / bundling",
    network: "State compression & relevance",
    battery: "Power-aware frame cap",
    thermal: "Sustained thermal profile",
    server: "Server capacity plan",
    input: "Input latency pass",
    loading: "Load-time pass",
    stability: "Crash & soak hardening",
  };
  return {
    taskId: `opt_${axis}_${hashSeed("opt", axis).toString(16).slice(0, 7)}`,
    type,
    affectedAxis: axis,
    affectedPlatforms: [platformId],
    severity: over ? 4 : 2,
    estimatedWork: over ? 120 : 70,
    completedWork: 0,
    requiredSpecialty: axis === "gpu" ? "rendering" : axis === "network" ? "network" : "systems",
    expectedImprovement: over ? 0.22 : 0.12,
    qualityTradeoff: type === "quality_compromise" ? 0.08 : 0.01,
    regressionRisk: type === "engineering" ? 0.15 : 0.1,
    debtChange: type === "engineering" ? -4 : 2,
    state: "discovered",
    label: labels[axis],
    description: `${axis} utilization ~${Math.round(utilization * 100)}%. ${type.replace(/_/g, " ")} recommended.`,
  };
}
