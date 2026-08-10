/**
 * ALGORITHM 1 — Production simulation & bug fixing (domain-only).
 * productionStage = 1|2|3 only. Never called from React render.
 */
import { clamp, stableUnit } from "../determinism";

/** Algorithm discipline ids (map to DevField at UI boundary). */
export type Discipline =
  | "story"
  | "engine"
  | "gameplay"
  | "dialogues"
  | "ai"
  | "level_design"
  | "world"
  | "graphics"
  | "sound";

export const DISCIPLINES: readonly Discipline[] = [
  "story",
  "engine",
  "gameplay",
  "dialogues",
  "ai",
  "level_design",
  "world",
  "graphics",
  "sound",
] as const;

export const STAGE_DISCIPLINES: Record<1 | 2 | 3, readonly Discipline[]> = {
  1: ["story", "engine", "gameplay"],
  2: ["dialogues", "ai", "level_design"],
  3: ["world", "graphics", "sound"],
};

/** Map algorithm discipline ↔ existing DevField */
export const DISCIPLINE_TO_FIELD: Record<Discipline, string> = {
  story: "story",
  engine: "engine",
  gameplay: "gameplay",
  dialogues: "dialogue",
  ai: "ai",
  level_design: "level",
  world: "world",
  graphics: "graphics",
  sound: "sound",
};

export const FIELD_TO_DISCIPLINE: Record<string, Discipline> = {
  story: "story",
  engine: "engine",
  gameplay: "gameplay",
  dialogue: "dialogues",
  ai: "ai",
  level: "level_design",
  world: "world",
  graphics: "graphics",
  sound: "sound",
};

export const PHASE_PLANNING = "planning";
export const PHASE_DEVELOPING = "developing";
export const PHASE_POLISH = "polish";
export const PHASE_FINALIZE_BUILD = "finalize_build";
export const PHASE_BUG_FIXING = "bug_fixing";
export const PHASE_RELEASE_READY = "release_ready";
export const PHASE_CANCELLED = "cancelled";

export type ProductionPhase =
  | typeof PHASE_PLANNING
  | typeof PHASE_DEVELOPING
  | typeof PHASE_POLISH
  | typeof PHASE_FINALIZE_BUILD
  | typeof PHASE_BUG_FIXING
  | typeof PHASE_RELEASE_READY
  | typeof PHASE_CANCELLED;

export type FounderProfile = {
  skills: Record<string, number>;
  mastery: Record<string, number>;
  /** Team QA / training bonus — speeds bug clearing (0–0.5+). */
  bugFixBonus?: number;
};


export function founderCapability(founder: FounderProfile, discipline: string): number {
  const skill = clamp(founder.skills[discipline] ?? 0, 0, 100);
  const mastery = clamp(founder.mastery[discipline] ?? 0, 0, 100);
  // Garage founder is competent, not elite — skill growth matters.
  return clamp(0.42 + 0.38 * (skill / 100) + 0.2 * (mastery / 100), 0.35, 0.95);
}

export type ProductionBalance = {
  stageBaseSwu: Record<1 | 2 | 3, number>;
  dailyWorkUnits: number;
  dailyCashCost: number;
  scopeSwuMultiplier: number;
  scopeCostMultiplier: number;
  scopeBugMultiplier: number;
  mismatchSwuMultiplier: number;
  mismatchCostMultiplier: number;
  lowSkillBugMultiplier: number;
  bugProbabilityPerWorkUnit: number;
  bugFixWorkPerSeverity: number;
  bugFixWorkPerDay: number;
  bugFixDailyCost: number;
  polishRequiredWork: number;
  polishWorkPerDay: number;
  polishDailyCost: number;
  sizeSwuFactor: Record<string, number>;
  /** Multiplier on bug spawn rate by size (small ships cleaner / fewer). */
  sizeBugFactor: Record<string, number>;
};

export const DEFAULT_PRODUCTION_BALANCE: ProductionBalance = {
  // Small ~2 months stages+polish; AAA ~10–13 months production (bugs extra).
  stageBaseSwu: { 1: 2200, 2: 2400, 3: 2300 },
  dailyWorkUnits: 200,
  dailyCashCost: 70,
  scopeSwuMultiplier: 0.2,
  scopeCostMultiplier: 0.35,
  scopeBugMultiplier: 0.5,
  mismatchSwuMultiplier: 0.15,
  mismatchCostMultiplier: 0.2,
  lowSkillBugMultiplier: 0.8,
  bugProbabilityPerWorkUnit: 0.00042,
  bugFixWorkPerSeverity: 95,
  bugFixWorkPerDay: 115,
  bugFixDailyCost: 60,
  polishRequiredWork: 380,
  polishWorkPerDay: 140,
  polishDailyCost: 55,
  // SWU scale by size — AAA lands ~11 months pure production.
  sizeSwuFactor: { small: 1, medium: 2.15, large: 3.9, aaa: 7.4 },
  // Small: light bug load so first garage ship ≈ 2 months total; AAA bugs extra.
  sizeBugFactor: { small: 0.62, medium: 1, large: 1.15, aaa: 1.35 },
};


export function normalizedDistribution(
  values: Record<string, number>,
  expectedKeys: readonly string[],
): Record<string, number> {
  const keys = new Set(expectedKeys);
  const got = new Set(Object.keys(values));
  if (keys.size !== got.size || [...keys].some((k) => !got.has(k))) {
    throw new Error(`Expected keys ${expectedKeys.join(",")}, received ${[...got].join(",")}`);
  }
  const cleaned: Record<string, number> = {};
  let total = 0;
  for (const key of expectedKeys) {
    const value = Number(values[key]);
    if (value < 0) throw new Error(`Negative allocation is invalid: ${key}`);
    cleaned[key] = value;
    total += value;
  }
  if (total <= 0) throw new Error("At least one allocation must be greater than zero.");
  const out: Record<string, number> = {};
  for (const key of expectedKeys) out[key] = cleaned[key]! / total;
  return out;
}

export function distributionFit(
  actual: Record<string, number>,
  target: Record<string, number>,
): number {
  let distance = 0;
  for (const key of Object.keys(target)) {
    distance += Math.abs((actual[key] ?? 0) - (target[key] ?? 0));
  }
  return clamp(1 - distance * 0.5, 0, 1);
}

export type StagePlan = {
  stage: 1 | 2 | 3;
  rawIntent: Record<string, number>;
  allocation: Record<string, number>;
  demand: Record<string, number>;
  demandFit: number;
  scopePressure: number;
  requiredSwu: Record<string, number>;
};

export type StageProgress = {
  stage: 1 | 2 | 3;
  plan: StagePlan;
  workDone: Record<string, number>;
};

export type ProductionBug = {
  bugId: string;
  discipline: string;
  severity: number;
  discoveredOnDay: number;
  remainingWork: number;
  sourceStage: number;
};

export function bugFixed(bug: ProductionBug): boolean {
  return bug.remainingWork <= 0;
}

export type CandidateBuild = {
  candidateId: string;
  finalizedOnDay: number;
  completedStages: StageProgress[];
  bugs: ProductionBug[];
  polishProgress: number;
};

export type ProductionTick = {
  day: number;
  mode: string;
  cashCost: number;
  workApplied: Record<string, number>;
  createdBugIds: string[];
  fixedBugIds: string[];
  completedStage: number | null;
  phaseAfter: ProductionPhase | string;
};

export type ProductionState = {
  gameId: string;
  campaignSeed: string;
  asOfDay: number;
  phase: ProductionPhase;
  currentStage: 1 | 2 | 3;
  /** Project size for SWU / polish / bug scaling. */
  size: string;
  activeProgress: StageProgress | null;
  completedStages: StageProgress[];
  bugs: ProductionBug[];
  polishProgress: number;
  /** Size-scaled polish target. */
  polishRequired: number;
  candidateBuild: CandidateBuild | null;
  history: ProductionTick[];
};

export function createProductionState(
  gameId: string,
  campaignSeed: string | number,
  asOfDay = 0,
  size = "small",
): ProductionState {
  const bal = DEFAULT_PRODUCTION_BALANCE;
  const sf = bal.sizeSwuFactor[size] ?? 1;
  return {
    gameId,
    campaignSeed: String(campaignSeed),
    asOfDay,
    phase: PHASE_PLANNING,
    currentStage: 1,
    size,
    activeProgress: null,
    completedStages: [],
    bugs: [],
    polishProgress: 0,
    polishRequired: Math.round(bal.polishRequiredWork * (0.55 + 0.45 * sf)),
    candidateBuild: null,
    history: [],
  };
}

export function planStage(
  state: ProductionState,
  opts: {
    stage: 1 | 2 | 3;
    rawIntent: Record<string, number>;
    demand: Record<string, number>;
    balance?: ProductionBalance;
    size?: string;
  },
): ProductionState {
  const balance = opts.balance ?? DEFAULT_PRODUCTION_BALANCE;
  if (state.phase !== PHASE_PLANNING) {
    throw new Error("A stage can only be planned from planning phase.");
  }
  if (opts.stage !== state.currentStage) {
    throw new Error(`Expected stage ${state.currentStage}, received ${opts.stage}`);
  }
  const disciplines = STAGE_DISCIPLINES[opts.stage];
  for (const d of disciplines) {
    if (opts.rawIntent[d] == null) {
      throw new Error(`Stage ${opts.stage} requires discipline ${d}`);
    }
    const v = opts.rawIntent[d]!;
    if (v < 0 || v > 100) throw new Error(`Raw intent must be 0–100: ${d}`);
  }
  const allocation = normalizedDistribution(
    Object.fromEntries(disciplines.map((d) => [d, opts.rawIntent[d]!])),
    disciplines,
  );
  const demand = normalizedDistribution(
    Object.fromEntries(disciplines.map((d) => [d, opts.demand[d] ?? 1])),
    disciplines,
  );
  const rawTotal = disciplines.reduce((s, d) => s + Number(opts.rawIntent[d]), 0);
  const scopePressure = Math.max(0, rawTotal / 100 - 1);
  const demandFit = distributionFit(allocation, demand);
  const sizeFactor = balance.sizeSwuFactor[opts.size ?? "small"] ?? 1;
  const totalRequired =
    balance.stageBaseSwu[opts.stage] *
    sizeFactor *
    (1 + balance.scopeSwuMultiplier * scopePressure) *
    (1 + balance.mismatchSwuMultiplier * (1 - demandFit));
  const requiredSwu: Record<string, number> = {};
  for (const d of disciplines) requiredSwu[d] = totalRequired * demand[d]!;

  const plan: StagePlan = {
    stage: opts.stage,
    rawIntent: { ...opts.rawIntent },
    allocation,
    demand,
    demandFit,
    scopePressure,
    requiredSwu,
  };
  const progress: StageProgress = {
    stage: opts.stage,
    plan,
    workDone: Object.fromEntries(disciplines.map((d) => [d, 0])),
  };
  const size = opts.size ?? state.size ?? "small";
  const sf = balance.sizeSwuFactor[size] ?? 1;
  const polishRequired = Math.round(balance.polishRequiredWork * (0.55 + 0.45 * sf));
  return {
    ...state,
    size,
    polishRequired,
    phase: PHASE_DEVELOPING,
    activeProgress: progress,
  };
}

function stageComplete(progress: StageProgress): boolean {
  const discs = STAGE_DISCIPLINES[progress.stage];
  return discs.every(
    (d) => (progress.workDone[d] ?? 0) >= (progress.plan.requiredSwu[d] ?? 0),
  );
}

function activeBugs(bugs: ProductionBug[]): ProductionBug[] {
  return bugs.filter((b) => !bugFixed(b));
}

export function advanceDevelopmentDay(
  state: ProductionState,
  opts: {
    day: number;
    founder: FounderProfile;
    balance?: ProductionBalance;
  },
): { state: ProductionState; tick: ProductionTick } {
  const balance = opts.balance ?? DEFAULT_PRODUCTION_BALANCE;
  if (state.phase !== PHASE_DEVELOPING) {
    throw new Error("Project is not currently developing.");
  }
  if (opts.day !== state.asOfDay + 1) {
    throw new Error("Development days must advance exactly once and in order.");
  }
  if (!state.activeProgress) throw new Error("Developing project has no active progress.");

  const progress = state.activeProgress;
  const plan = progress.plan;
  const workDone = { ...progress.workDone };
  const bugs = [...state.bugs];
  const workApplied: Record<string, number> = {};
  const createdBugIds: string[] = [];

  const dailyCost =
    balance.dailyCashCost *
    (1 + balance.scopeCostMultiplier * plan.scopePressure) *
    (1 + balance.mismatchCostMultiplier * (1 - plan.demandFit));

  for (const discipline of STAGE_DISCIPLINES[progress.stage]) {
    workApplied[discipline] = 0;
  }

  // Pass 1 — allocated focus work
  let leftover = 0;
  for (const discipline of STAGE_DISCIPLINES[progress.stage]) {
    const capability = founderCapability(opts.founder, discipline);
    const intended = balance.dailyWorkUnits * (plan.allocation[discipline] ?? 0) * capability;
    const previous = workDone[discipline] ?? 0;
    const room = Math.max(0, (plan.requiredSwu[discipline] ?? 0) - previous);
    const applied = Math.min(room, intended);
    workDone[discipline] = previous + applied;
    workApplied[discipline] = applied;
    leftover += intended - applied;
  }

  // Pass 2 — redistributes leftover so unbalanced sliders don't stall the stage
  // (focus still shapes quality via allocation/demandFit; progress stays smooth)
  if (leftover > 0.01) {
    const incomplete = STAGE_DISCIPLINES[progress.stage].filter((d) => {
      const req = plan.requiredSwu[d] ?? 0;
      return (workDone[d] ?? 0) < req - 0.001;
    });
    if (incomplete.length) {
      // Prefer remaining need weight so bottlenecks clear
      let needSum = 0;
      const needs: Record<string, number> = {};
      for (const d of incomplete) {
        const n = Math.max(0, (plan.requiredSwu[d] ?? 0) - (workDone[d] ?? 0));
        needs[d] = n;
        needSum += n;
      }
      let pool = leftover;
      for (const d of incomplete) {
        if (pool <= 0 || needSum <= 0) break;
        const capability = founderCapability(opts.founder, d);
        const share = (needs[d]! / needSum) * leftover * (0.85 + 0.15 * capability);
        const applied = Math.min(pool, needs[d]!, share);
        workDone[d] = (workDone[d] ?? 0) + applied;
        workApplied[d] = (workApplied[d] ?? 0) + applied;
        pool -= applied;
      }
      // Any remainder: dump into first incomplete with room
      if (pool > 0.01) {
        for (const d of incomplete) {
          const room = Math.max(0, (plan.requiredSwu[d] ?? 0) - (workDone[d] ?? 0));
          if (room <= 0) continue;
          const applied = Math.min(pool, room);
          workDone[d] = (workDone[d] ?? 0) + applied;
          workApplied[d] = (workApplied[d] ?? 0) + applied;
          pool -= applied;
          if (pool <= 0.01) break;
        }
      }
    }
  }

  for (const discipline of STAGE_DISCIPLINES[progress.stage]) {
    const capability = founderCapability(opts.founder, discipline);
    const applied = workApplied[discipline] ?? 0;
    if (applied <= 0) continue;

    let bugProbability =
      balance.bugProbabilityPerWorkUnit *
      applied *
      (balance.sizeBugFactor[state.size] ?? 1) *
      (1 + balance.scopeBugMultiplier * plan.scopePressure) *
      (1 + balance.lowSkillBugMultiplier * (1 - capability));
    bugProbability = clamp(bugProbability, 0, 0.5);

    const bugRoll = stableUnit(
      state.campaignSeed,
      state.gameId,
      "production_bug",
      progress.stage,
      opts.day,
      discipline,
    );
    if (bugRoll < bugProbability) {
      const severityRoll = stableUnit(
        state.campaignSeed,
        state.gameId,
        "bug_severity",
        progress.stage,
        opts.day,
        discipline,
      );
      const severity = 1 + Math.floor(severityRoll * 5);
      const bugId = `${state.gameId}:${progress.stage}:${opts.day}:${discipline}`;
      if (!bugs.some((b) => b.bugId === bugId)) {
        bugs.push({
          bugId,
          discipline,
          severity,
          discoveredOnDay: opts.day,
          remainingWork: severity * balance.bugFixWorkPerSeverity,
          sourceStage: progress.stage,
        });
        createdBugIds.push(bugId);
      }
    }
  }

  const updatedProgress: StageProgress = { ...progress, workDone };
  let completedStage: number | null = null;
  let nextPhase: ProductionPhase = PHASE_DEVELOPING;
  let nextStage = state.currentStage;
  let nextActive: StageProgress | null = updatedProgress;
  let completedStages = state.completedStages;

  if (stageComplete(updatedProgress)) {
    completedStage = progress.stage;
    completedStages = [...completedStages, updatedProgress];
    if (progress.stage < 3) {
      nextStage = (progress.stage + 1) as 1 | 2 | 3;
      nextPhase = PHASE_PLANNING;
      nextActive = null;
    } else {
      nextStage = 3;
      nextPhase = PHASE_POLISH;
      nextActive = null;
    }
  }

  const tick: ProductionTick = {
    day: opts.day,
    mode: "development",
    cashCost: dailyCost,
    workApplied,
    createdBugIds,
    fixedBugIds: [],
    completedStage,
    phaseAfter: nextPhase,
  };

  return {
    state: {
      ...state,
      asOfDay: opts.day,
      phase: nextPhase,
      currentStage: nextStage,
      activeProgress: nextActive,
      completedStages,
      bugs,
      history: [...state.history, tick],
    },
    tick,
  };
}

export function advancePolishDay(
  state: ProductionState,
  opts: {
    day: number;
    founder: FounderProfile;
    balance?: ProductionBalance;
  },
): { state: ProductionState; tick: ProductionTick } {
  const balance = opts.balance ?? DEFAULT_PRODUCTION_BALANCE;
  if (state.phase !== PHASE_POLISH) throw new Error("Project is not currently in polish.");
  if (opts.day !== state.asOfDay + 1) {
    throw new Error("Polish days must advance exactly once and in order.");
  }
  const relevant = ["gameplay", "level_design", "graphics", "sound"] as const;
  const avgCap =
    relevant.reduce((s, d) => s + founderCapability(opts.founder, d), 0) / relevant.length;
  const work = balance.polishWorkPerDay * avgCap;
  const polishNeed = state.polishRequired ?? balance.polishRequiredWork;
  const updatedProgress = Math.min(polishNeed, state.polishProgress + work);
  const nextPhase: ProductionPhase =
    updatedProgress >= polishNeed ? PHASE_FINALIZE_BUILD : PHASE_POLISH;

  const tick: ProductionTick = {
    day: opts.day,
    mode: "polish",
    cashCost: balance.polishDailyCost,
    workApplied: { polish: work },
    createdBugIds: [],
    fixedBugIds: [],
    completedStage: null,
    phaseAfter: nextPhase,
  };
  return {
    state: {
      ...state,
      asOfDay: opts.day,
      phase: nextPhase,
      polishProgress: updatedProgress,
      history: [...state.history, tick],
    },
    tick,
  };
}

export function finalizeBuild(state: ProductionState): ProductionState {
  if (state.phase !== PHASE_FINALIZE_BUILD) {
    throw new Error("Build is not ready to be finalized.");
  }
  const candidate: CandidateBuild = {
    candidateId: `${state.gameId}:candidate:${state.asOfDay}`,
    finalizedOnDay: state.asOfDay,
    completedStages: state.completedStages,
    bugs: state.bugs,
    polishProgress: state.polishProgress,
  };
  const nextPhase: ProductionPhase = activeBugs(state.bugs).length
    ? PHASE_BUG_FIXING
    : PHASE_RELEASE_READY;
  return { ...state, phase: nextPhase, candidateBuild: candidate };
}

export function advanceBugFixingDay(
  state: ProductionState,
  opts: {
    day: number;
    founder: FounderProfile;
    balance?: ProductionBalance;
  },
): { state: ProductionState; tick: ProductionTick } {
  const balance = opts.balance ?? DEFAULT_PRODUCTION_BALANCE;
  if (state.phase !== PHASE_BUG_FIXING) {
    throw new Error("Project is not currently fixing bugs.");
  }
  if (opts.day !== state.asOfDay + 1) {
    throw new Error("Bug-fixing days must advance exactly once and in order.");
  }

  const bugs = [...state.bugs];
  const active = activeBugs(state.bugs).sort(
    (a, b) =>
      b.severity - a.severity ||
      a.discoveredOnDay - b.discoveredOnDay ||
      a.bugId.localeCompare(b.bugId),
  );

  if (!active.length) {
    const tick: ProductionTick = {
      day: opts.day,
      mode: "bug_fixing",
      cashCost: 0,
      workApplied: {},
      createdBugIds: [],
      fixedBugIds: [],
      completedStage: null,
      phaseAfter: PHASE_RELEASE_READY,
    };
    return {
      state: {
        ...state,
        asOfDay: opts.day,
        phase: PHASE_RELEASE_READY,
        history: [...state.history, tick],
      },
      tick,
    };
  }

  const avgCap =
    active.reduce((s, b) => s + founderCapability(opts.founder, b.discipline), 0) /
    active.length;
  // Training / QA: each 0.1 bugFixBonus ≈ +20% clear rate (stacks, capped).
  const qaMult = 1 + Math.min(1.2, (opts.founder.bugFixBonus ?? 0) * 2);
  let capacity = balance.bugFixWorkPerDay * avgCap * qaMult;

  const fixedBugIds: string[] = [];
  const workApplied: Record<string, number> = {};

  for (const bug of active) {
    if (capacity <= 0) break;
    const amount = Math.min(capacity, bug.remainingWork);
    capacity -= amount;
    workApplied[bug.bugId] = amount;
    const idx = bugs.findIndex((b) => b.bugId === bug.bugId);
    const updated = { ...bug, remainingWork: bug.remainingWork - amount };
    bugs[idx] = updated;
    if (bugFixed(updated)) fixedBugIds.push(updated.bugId);
  }

  const nextPhase: ProductionPhase = activeBugs(bugs).length
    ? PHASE_BUG_FIXING
    : PHASE_RELEASE_READY;

  const tick: ProductionTick = {
    day: opts.day,
    mode: "bug_fixing",
    cashCost: balance.bugFixDailyCost,
    workApplied,
    createdBugIds: [],
    fixedBugIds,
    completedStage: null,
    phaseAfter: nextPhase,
  };
  return {
    state: {
      ...state,
      asOfDay: opts.day,
      phase: nextPhase,
      bugs,
      history: [...state.history, tick],
    },
    tick,
  };
}

export function cancelProduction(state: ProductionState): ProductionState {
  if (state.phase === PHASE_RELEASE_READY || state.phase === PHASE_CANCELLED) {
    throw new Error("This project can no longer be cancelled.");
  }
  return { ...state, phase: PHASE_CANCELLED };
}

/** Default equal demand for a stage. */
export function defaultStageDemand(stage: 1 | 2 | 3): Record<string, number> {
  const discs = STAGE_DISCIPLINES[stage];
  return Object.fromEntries(discs.map((d) => [d, 1]));
}

/** Raw intent from UI sliders (DevField 0–100). */
export function rawIntentFromSliders(
  stage: 1 | 2 | 3,
  sliders: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of STAGE_DISCIPLINES[stage]) {
    const field = DISCIPLINE_TO_FIELD[d];
    out[d] = clamp(sliders[field] ?? 50, 0, 100);
  }
  return out;
}

export function openBugsCount(state: ProductionState): number {
  return activeBugs(state.bugs).length;
}

export function openBugsSeveritySum(state: ProductionState): number {
  return activeBugs(state.bugs).reduce((s, b) => s + b.severity, 0);
}

export function founderFromStaff(staff: {
  skills?: { design?: number; tech?: number; speed?: number; research?: number };
  design?: number;
  tech?: number;
  speed?: number;
  fieldExperience?: Record<string, number>;
  level?: number;
  bugFixBonus?: number;
}[]): FounderProfile {
  const members = staff.length ? staff : [{}];
  let design = 0;
  let tech = 0;
  let level = 0;
  let qaBonus = 0;
  const fe: Record<string, number> = {};
  for (const m of members) {
    design += m.skills?.design ?? m.design ?? 40;
    tech += m.skills?.tech ?? m.tech ?? 40;
    level += (m.level ?? 1) * 8;
    qaBonus += m.bugFixBonus ?? 0;
    for (const [k, v] of Object.entries(m.fieldExperience ?? {})) {
      fe[k] = (fe[k] ?? 0) + (v as number);
    }
  }
  const n = members.length;
  design /= n;
  tech /= n;
  level /= n;
  qaBonus = Math.min(0.45, qaBonus);
  const skills: Record<string, number> = {};
  const mastery: Record<string, number> = {};
  for (const d of DISCIPLINES) {
    const isDesign = ["story", "gameplay", "dialogues", "level_design", "world"].includes(d);
    skills[d] = clamp((isDesign ? design : tech) + level * 0.3 + qaBonus * 20, 0, 100);
    const field = DISCIPLINE_TO_FIELD[d];
    mastery[d] = clamp((fe[field] ?? 0) * 0.08 + level * 0.5 + qaBonus * 15, 0, 100);
  }
  return { skills, mastery, bugFixBonus: qaBonus };
}
