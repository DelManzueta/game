/**
 * Engine project work formulas & employee capacity (Part 3 §§11–12).
 * Money buys staff/time/tools — not completed engineering work.
 */

import type { GameSize, StaffMember } from "../types";
import { moduleById, resolveWithDependencies, activeConflicts } from "./modules";
import type {
  ArchitectureStyle,
  EngineBuildProject,
  EnginePurpose,
  ArchitecturePriority,
  TargetLifespan,
} from "./types";

export const PRIORITY_BUDGET = 12;

const SIZE_SCOPE: Record<GameSize, number> = {
  small: 0.85,
  medium: 1.15,
  large: 1.55,
  aaa: 2.2,
};

const ARCH_MULT: Record<ArchitectureStyle, number> = {
  monolithic: 0.75,
  hardcoded: 0.7,
  modular: 1.15,
  portable: 1.25,
  data_driven: 1.3,
  platform_specific: 0.95,
};

const LIFESPAN_MULT: Record<TargetLifespan, number> = {
  one_project: 0.8,
  short_generation: 1.0,
  multi_project: 1.25,
  studio_foundation: 1.45,
  licensed_commercial: 1.6,
};

const PURPOSE_BASE: Record<EnginePurpose, number> = {
  fast_2d: 200,
  cinematic_narrative: 320,
  high_speed_action: 300,
  deep_simulation: 360,
  open_world: 420,
  competitive_multiplayer: 400,
  persistent_online: 520,
  portable_cross_platform: 380,
  mobile_handheld: 280,
  experimental_future: 450,
};

export function clampPriorityPoints(
  priorities: Partial<Record<ArchitecturePriority, number>>,
): Partial<Record<ArchitecturePriority, number>> {
  const keys = Object.keys(priorities) as ArchitecturePriority[];
  let sum = keys.reduce((s, k) => s + (priorities[k] ?? 0), 0);
  if (sum <= PRIORITY_BUDGET) return { ...priorities };
  const scale = PRIORITY_BUDGET / sum;
  const out: Partial<Record<ArchitecturePriority, number>> = {};
  for (const k of keys) out[k] = Math.round((priorities[k] ?? 0) * scale * 10) / 10;
  return out;
}

/**
 * Required Engine Work =
 * Base × Scope × ModuleComplexity × PlatformComplexity × Novelty
 * × DependencyComplexity × TechnicalDebt × QualityTarget
 */
export function computeRequiredEngineWork(opts: {
  purpose: EnginePurpose;
  secondaryPurposes: EnginePurpose[];
  architecture: ArchitectureStyle;
  lifespan: TargetLifespan;
  moduleIds: string[];
  platformCount: number;
  targetSizes: GameSize[];
  technicalDebt: number;
  qualityTarget?: number;
  novelty?: number;
  priorFamilyExperience?: number;
}): { requiredWork: number; breakdown: Record<string, number> } {
  const modules = resolveWithDependencies(opts.moduleIds);
  const moduleWork = modules.reduce((s, id) => s + (moduleById(id)?.baseWork ?? 40), 0);
  const base = PURPOSE_BASE[opts.purpose] + opts.secondaryPurposes.length * 55 + moduleWork * 0.35;

  const maxSize = opts.targetSizes.reduce(
    (m, s) => Math.max(m, SIZE_SCOPE[s] ?? 1),
    SIZE_SCOPE.small,
  );
  const scope = maxSize * (1 + opts.secondaryPurposes.length * 0.12);
  const moduleComplexity = 0.7 + modules.length * 0.06;
  const platformComplexity = 1 + Math.max(0, opts.platformCount - 1) * 0.18;
  const novelty = opts.novelty ?? (opts.purpose === "experimental_future" ? 1.45 : 1);
  const conflicts = activeConflicts(modules).length;
  const dependencyComplexity = 1 + conflicts * 0.08 + Math.max(0, modules.length - 4) * 0.03;
  const debt = 1 + Math.min(1.2, opts.technicalDebt / 100);
  const quality = opts.qualityTarget ?? 1;
  const experienceRelief = 1 - Math.min(0.35, (opts.priorFamilyExperience ?? 0) * 0.35);

  const arch = ARCH_MULT[opts.architecture];
  const life = LIFESPAN_MULT[opts.lifespan];

  const requiredWork = Math.round(
    base * scope * moduleComplexity * platformComplexity * novelty * dependencyComplexity * debt * quality * arch * life * experienceRelief,
  );

  return {
    requiredWork: Math.max(120, requiredWork),
    breakdown: {
      base: Math.round(base),
      scope,
      moduleComplexity,
      platformComplexity,
      novelty,
      dependencyComplexity,
      debt,
      arch,
      life,
      experienceRelief,
    },
  };
}

/**
 * Employee Contribution =
 * RelevantSkill × RoleFit × EngineFamiliarity × ModuleFamiliarity
 * × ToolQuality × Energy × Morale × Focus × Assignment%
 */
export function employeeEngineContribution(
  staff: StaffMember,
  opts: {
    familyFamiliarity: number;
    moduleFamiliarity: number;
    toolQuality: number;
    assignmentPct?: number;
  },
): number {
  const skill = (staff.tech * 0.7 + staff.speed * 0.3) / 100;
  const roleFit =
    staff.specialization === "engine" || staff.specialization === "graphics"
      ? 1.15
      : staff.specialization === "ai" || staff.specialization === "sound"
        ? 0.95
        : 0.85;
  const energy = Math.max(0.35, (staff.energy ?? 100) / 100);
  const morale = 0.9; // no separate morale field yet — neutral
  const focus = staff.busy && !staff.training ? 0.7 : staff.training ? 0.4 : 1;
  const assign = opts.assignmentPct ?? 1;
  const tools = 0.7 + opts.toolQuality * 0.3;
  const fam = 0.55 + opts.familyFamiliarity * 0.45;
  const mod = 0.6 + opts.moduleFamiliarity * 0.4;

  return Math.max(
    0.05,
    skill * roleFit * fam * mod * tools * energy * morale * focus * assign,
  );
}

export function teamWeeklyEngineCapacity(
  staff: StaffMember[],
  assignedIds: string[],
  opts: {
    familyFamiliarity: number;
    moduleFamiliarity: number;
    toolQuality: number;
  },
): number {
  const assigned =
    assignedIds.length > 0
      ? staff.filter((s) => assignedIds.includes(s.id))
      : staff.filter((s) => !s.training);

  if (assigned.length === 0) return 8; // founder fallback micro capacity

  let raw = 0;
  for (const s of assigned) {
    raw += employeeEngineContribution(s, opts) * 28; // weekly work units
  }

  // Team-size coordination overhead
  const n = assigned.length;
  const overhead = n <= 2 ? 1 : n <= 4 ? 0.92 : n <= 8 ? 0.82 : 0.72;
  // Leadership bonus if anyone is high-level tech
  const lead = assigned.some((s) => s.level >= 4 && s.tech >= 70) ? 1.08 : 1;

  return Math.max(6, raw * overhead * lead);
}

export function estimateWeeks(requiredWork: number, weeklyCapacity: number): number {
  return Math.max(2, Math.ceil(requiredWork / Math.max(1, weeklyCapacity)));
}

export function nextPhaseAfter(phase: EngineBuildProject["phase"]): EngineBuildProject["phase"] {
  const order = [
    "requirements",
    "architecture",
    "core_runtime",
    "primary_modules",
    "content_tools",
    "platform_adapters",
    "integration",
    "stabilization",
    "released",
  ] as const;
  const i = order.indexOf(phase);
  if (i < 0 || i >= order.length - 1) return "released";
  return order[i + 1]!;
}
