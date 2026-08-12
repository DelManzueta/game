/**
 * Bridge ProductionState ↔ GameProject DevPhase for the live store.
 */
import type { GameProject, StaffMember } from "../types";
import {
  createProductionState,
  planStage,
  advanceDevelopmentDay,
  advancePolishDay,
  advanceBugFixingDay,
  finalizeBuild,
  cancelProduction,
  rawIntentFromSliders,
  defaultStageDemand,
  founderFromStaff,
  openBugsCount,
  openBugsSeveritySum,
  DISCIPLINE_TO_FIELD,
  PHASE_PLANNING,
  PHASE_DEVELOPING,
  PHASE_POLISH,
  PHASE_FINALIZE_BUILD,
  PHASE_BUG_FIXING,
  PHASE_RELEASE_READY,
  PHASE_CANCELLED,
  type ProductionState,
  type ProductionTick,
  type FounderProfile,
} from "./algorithm";
import { DEFAULT_PRODUCTION_BALANCE } from "./algorithm";

export { openBugsCount, openBugsSeveritySum };

export function ensureProduction(
  project: GameProject,
  campaignSeed: string | number,
  day: number,
): ProductionState {
  if (project.production) {
    const p = project.production as ProductionState & { polishRequired?: number; size?: string };
    if (p.size == null || p.polishRequired == null) {
      const bal = DEFAULT_PRODUCTION_BALANCE;
      const size = p.size ?? project.size ?? "small";
      const sf = bal.sizeSwuFactor[size] ?? 1;
      return {
        ...p,
        size,
        polishRequired: p.polishRequired ?? Math.round(bal.polishRequiredWork * (0.55 + 0.45 * sf)),
      };
    }
    return project.production;
  }
  return createProductionState(project.id, campaignSeed, day, project.size);
}

export function phaseToDevPhase(prod: ProductionState): GameProject["devPhase"] {
  if (prod.phase === PHASE_CANCELLED) return "STAGE_1_CONFIG";
  if (prod.phase === PHASE_RELEASE_READY) return "READY_TO_RELEASE";
  if (prod.phase === PHASE_POLISH || prod.phase === PHASE_FINALIZE_BUILD || prod.phase === PHASE_BUG_FIXING) {
    return "POLISHING";
  }
  if (prod.phase === PHASE_DEVELOPING) {
    return prod.currentStage === 1
      ? "STAGE_1_RUNNING"
      : prod.currentStage === 2
        ? "STAGE_2_RUNNING"
        : "STAGE_3_RUNNING";
  }
  // planning
  return prod.currentStage === 1
    ? "STAGE_1_CONFIG"
    : prod.currentStage === 2
      ? "STAGE_2_CONFIG"
      : "STAGE_3_CONFIG";
}

export function applyPlanStage(
  project: GameProject,
  campaignSeed: string | number,
  day: number,
  stage: 1 | 2 | 3,
  demand?: Record<string, number>,
): { project: GameProject; error?: string } {
  try {
    let prod = ensureProduction(project, campaignSeed, day);
    // Align current stage
    prod = { ...prod, currentStage: stage, phase: PHASE_PLANNING, asOfDay: day };
    prod = planStage(prod, {
      stage,
      rawIntent: rawIntentFromSliders(stage, project.sliders as Record<string, number>),
      demand: demand ?? defaultStageDemand(stage),
      size: project.size,
    });
    return {
      project: {
        ...project,
        production: prod,
        devPhase: phaseToDevPhase(prod),
        stage,
        stageConfigs: {
          ...project.stageConfigs,
          [stage]: { ...project.sliders },
        },
      },
    };
  } catch (e) {
    return {
      project,
      error: e instanceof Error ? e.message : "Could not plan stage",
    };
  }
}

/**
 * Advance one calendar week (= 7 domain days) of production.
 * Returns cash cost sum and updated project.
 */
export function advanceProductionWeek(
  project: GameProject,
  opts: {
    campaignSeed: string | number;
    staff: StaffMember[];
    startDay: number;
  },
): {
  project: GameProject;
  cashCost: number;
  ticks: ProductionTick[];
  stageJustFinished: boolean;
  bugsOpen: number;
} {
  let prod = ensureProduction(project, opts.campaignSeed, opts.startDay);
  // Sync asOfDay if needed (allow resume)
  if (prod.asOfDay > opts.startDay) {
    /* keep */
  } else if (prod.asOfDay < opts.startDay) {
    prod = { ...prod, asOfDay: opts.startDay };
  }

  const founder: FounderProfile = founderFromStaff(opts.staff);
  let cashCost = 0;
  const ticks: ProductionTick[] = [];
  let stageJustFinished = false;
  let day = prod.asOfDay;

  for (let i = 0; i < 7; i++) {
    if (prod.phase === PHASE_RELEASE_READY || prod.phase === PHASE_CANCELLED) break;

    // Auto-finalize when polish complete
    if (prod.phase === PHASE_FINALIZE_BUILD) {
      prod = finalizeBuild(prod);
      continue;
    }

    day = prod.asOfDay + 1;
    try {
      if (prod.phase === PHASE_DEVELOPING) {
        const r = advanceDevelopmentDay(prod, { day, founder });
        prod = r.state;
        cashCost += r.tick.cashCost;
        ticks.push(r.tick);
        if (r.tick.completedStage != null) {
          stageJustFinished = true;
          // Stop the week here so polish is player-controlled (no auto ship-clean).
          break;
        }
      } else if (prod.phase === PHASE_POLISH) {
        const r = advancePolishDay(prod, { day, founder });
        prod = r.state;
        cashCost += r.tick.cashCost;
        ticks.push(r.tick);
      } else if (prod.phase === PHASE_BUG_FIXING) {
        const r = advanceBugFixingDay(prod, { day, founder });
        prod = r.state;
        cashCost += r.tick.cashCost;
        ticks.push(r.tick);
      } else {
        // planning — wait for player
        break;
      }
    } catch {
      break;
    }
  }

  const bugs = openBugsCount(prod);
  let stageProgress = 0;
  if (prod.activeProgress && prod.phase === PHASE_DEVELOPING) {
    stageProgress = averageProgress(prod);
  } else if (prod.phase === PHASE_POLISH) {
    const need = prod.polishRequired || DEFAULT_PRODUCTION_BALANCE.polishRequiredWork;
    stageProgress = prod.polishProgress / need;
  } else if (prod.phase === PHASE_BUG_FIXING) {
    const total = prod.bugs.reduce((s, b) => s + Math.max(b.remainingWork, 0) + (b.remainingWork <= 0 ? 0 : 0), 0);
    const open = prod.bugs.filter((b) => b.remainingWork > 0);
    if (!open.length) stageProgress = 1;
    else {
      const rem = open.reduce((s, b) => s + b.remainingWork, 0);
      const sev = open.reduce((s, b) => s + b.severity * DEFAULT_PRODUCTION_BALANCE.bugFixWorkPerSeverity, 0);
      stageProgress = sev > 0 ? clamp01(1 - rem / sev) : 0;
    }
  } else if (prod.phase === PHASE_RELEASE_READY || prod.phase === PHASE_FINALIZE_BUILD) {
    stageProgress = 1;
  } else {
    // planning / cancelled — reset bar for next stage
    stageProgress = 0;
  }

  return {
    project: {
      ...project,
      production: prod,
      devPhase: phaseToDevPhase(prod),
      bugs,
      weeksDev: project.weeksDev + (ticks.length > 0 ? 1 : 0),
      stageProgress,
      stage:
        prod.phase === PHASE_POLISH ||
        prod.phase === PHASE_BUG_FIXING ||
        prod.phase === PHASE_FINALIZE_BUILD ||
        prod.phase === PHASE_RELEASE_READY
          ? 3
          : prod.currentStage,
    },
    cashCost,
    ticks,
    stageJustFinished,
    bugsOpen: bugs,
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function averageProgress(prod: ProductionState): number {
  const p = prod.activeProgress;
  if (!p) return 0;
  const keys = Object.keys(p.plan.requiredSwu);
  if (!keys.length) return 0;
  let s = 0;
  for (const k of keys) {
    const req = p.plan.requiredSwu[k] ?? 1;
    s += Math.min(1, (p.workDone[k] ?? 0) / req);
  }
  return s / keys.length;
}

/** Per-discipline progress for UI (0–1). */
export function disciplineProgress(project: GameProject): {
  discipline: string;
  field: string;
  label: string;
  ratio: number;
  done: number;
  required: number;
}[] {
  const p = project.production?.activeProgress;
  if (!p) return [];
  return Object.keys(p.plan.requiredSwu).map((d) => {
    const required = p.plan.requiredSwu[d] ?? 1;
    const done = p.workDone[d] ?? 0;
    return {
      discipline: d,
      field: DISCIPLINE_TO_FIELD[d as keyof typeof DISCIPLINE_TO_FIELD] ?? d,
      label: d.replace(/_/g, " "),
      ratio: required > 0 ? Math.min(1, done / required) : 1,
      done,
      required,
    };
  });
}

export function cancelProjectProduction(project: GameProject): GameProject {
  if (!project.production) return { ...project, cancelled: true };
  try {
    return {
      ...project,
      production: cancelProduction(project.production),
      cancelled: true,
    };
  } catch {
    return { ...project, cancelled: true };
  }
}

export function productionOpenSeverity(project: GameProject): number {
  if (!project.production) return Math.max(0, project.bugs);
  return openBugsSeveritySum(project.production);
}

export function isReleaseReady(project: GameProject): boolean {
  if (project.production) return project.production.phase === PHASE_RELEASE_READY;
  return project.devPhase === "READY_TO_RELEASE";
}

/** Full project pipeline progress 0–1 for smooth UI bars (stages + polish + bugs). */
export function overallProjectProgress(project: GameProject): number {
  const prod = project.production;
  if (!prod) return Math.max(0, Math.min(1, project.stageProgress || 0)) * 0.33;
  if (prod.phase === PHASE_CANCELLED) return 0;
  if (prod.phase === PHASE_RELEASE_READY) return 1;

  const stageW = 0.72;
  const polishW = 0.18;
  const bugW = 0.1;
  const completed = prod.completedStages.length;
  let stagePart = completed / 3;
  if (prod.phase === PHASE_DEVELOPING && prod.activeProgress) {
    const keys = Object.keys(prod.activeProgress.plan.requiredSwu);
    let s = 0;
    for (const k of keys) {
      const req = prod.activeProgress.plan.requiredSwu[k] ?? 1;
      s += Math.min(1, (prod.activeProgress.workDone[k] ?? 0) / req);
    }
    const local = keys.length ? s / keys.length : 0;
    stagePart = (completed + local) / 3;
  }

  let polishPart = 0;
  if (
    prod.phase === PHASE_POLISH ||
    prod.phase === PHASE_FINALIZE_BUILD ||
    prod.phase === PHASE_BUG_FIXING
  ) {
    const need = prod.polishRequired || DEFAULT_PRODUCTION_BALANCE.polishRequiredWork;
    polishPart = Math.min(1, need > 0 ? prod.polishProgress / need : 1);
  }

  let bugPart = 0;
  if (prod.phase === PHASE_BUG_FIXING) {
    const open = prod.bugs.filter((b) => b.remainingWork > 0);
    if (!open.length) bugPart = 1;
    else {
      const rem = open.reduce((s, b) => s + b.remainingWork, 0);
      const total = open.reduce(
        (s, b) => s + b.severity * DEFAULT_PRODUCTION_BALANCE.bugFixWorkPerSeverity,
        0,
      );
      bugPart = total > 0 ? Math.max(0, 1 - rem / total) : 0;
    }
  }

  return Math.max(0, Math.min(1, stagePart * stageW + polishPart * polishW + bugPart * bugW));
}
