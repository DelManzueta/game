/**
 * Phase-weighted feature allocation (GDT allocation engine).
 * Features inject baseline T/D into a phase; overload vs staff → bugs.
 */

import type { GenreId, GameSize } from "./types";
import { STAGE_FIELDS } from "./data";
import { idealPhaseSliders } from "./classicGdt";

export type FeaturePhase = 1 | 2 | 3;

export type FeatureInjection = {
  id: string;
  name: string;
  phase: FeaturePhase;
  added_tech: number;
  added_design: number;
  cost: number;
  /** Research unlock key (if gated) */
  researchKey?: string;
};

/** Feature Injection Database (original SE fiction IDs). */
export const FEATURE_INJECTION_DB: Record<string, FeatureInjection> = {
  Stereo_Sound: {
    id: "Stereo_Sound",
    name: "Stereo Sound",
    phase: 3,
    added_tech: 12,
    added_design: 5,
    cost: 8000,
    researchKey: "stereo_sound",
  },
  Branching_Story: {
    id: "Branching_Story",
    name: "Branching Story",
    phase: 1,
    added_tech: 2,
    added_design: 28,
    cost: 15000,
    researchKey: "branching_story",
  },
  Advanced_AI: {
    id: "Advanced_AI",
    name: "Advanced AI",
    phase: 2,
    added_tech: 22,
    added_design: 6,
    cost: 25000,
    researchKey: "advanced_ai",
  },
  Open_World_System: {
    id: "Open_World_System",
    name: "Open World System",
    phase: 3,
    added_tech: 45,
    added_design: 45,
    cost: 120000,
    researchKey: "open_world",
  },
};

/** Genre ideal slider profiles 0–1 (phase keys match STAGE_FIELDS loosely). */
export const GENRE_PHASE_PROFILES: Partial<
  Record<
    GenreId,
    {
      p1: Record<string, number>;
      p2: Record<string, number>;
      p3: Record<string, number>;
    }
  >
> = {
  action: {
    p1: { engine: 1.0, gameplay: 0.8, story: 0.0 },
    p2: { dialogues: 0.0, level: 0.8, ai: 1.0 },
    p3: { world: 0.0, graphics: 1.0, sound: 0.8 },
  },
  rpg: {
    p1: { engine: 0.4, gameplay: 1.0, story: 1.0 },
    p2: { dialogues: 1.0, level: 0.8, ai: 0.4 },
    p3: { world: 1.0, graphics: 0.8, sound: 0.4 },
  },
  simulation: {
    p1: { engine: 0.7, gameplay: 1.0, story: 0.3 },
    p2: { dialogues: 0.2, level: 1.0, ai: 0.7 },
    p3: { world: 0.8, graphics: 0.6, sound: 0.5 },
  },
  casual: {
    p1: { engine: 0.3, gameplay: 1.0, story: 0.5 },
    p2: { dialogues: 0.4, level: 0.6, ai: 0.2 },
    p3: { world: 0.3, graphics: 0.9, sound: 1.0 },
  },
  adventure: {
    p1: { engine: 0.5, gameplay: 0.7, story: 1.0 },
    p2: { dialogues: 1.0, level: 0.7, ai: 0.3 },
    p3: { world: 0.9, graphics: 0.8, sound: 0.6 },
  },
  strategy: {
    p1: { engine: 0.8, gameplay: 1.0, story: 0.2 },
    p2: { dialogues: 0.1, level: 0.9, ai: 1.0 },
    p3: { world: 0.7, graphics: 0.5, sound: 0.4 },
  },
};

export type PhaseOutput = {
  tech: number;
  design: number;
  bugs: number;
  efficiency: number;
  featureTech: number;
  featureDesign: number;
  bottleneck: boolean;
};

export type AllocationResult = {
  tech: number;
  design: number;
  bugs: number;
  byPhase: PhaseOutput[];
  totalFeatureCost: number;
  notes: string[];
};

function phaseKey(stage: 1 | 2 | 3): "p1" | "p2" | "p3" {
  return stage === 1 ? "p1" : stage === 2 ? "p2" : "p3";
}

/** Map feature string ids from project to injection rows. */
export function resolveFeatures(featureIds: string[]): FeatureInjection[] {
  const out: FeatureInjection[] = [];
  for (const raw of featureIds) {
    const key = raw.replace(/\s+/g, "_");
    const hit =
      FEATURE_INJECTION_DB[key] ||
      FEATURE_INJECTION_DB[raw] ||
      Object.values(FEATURE_INJECTION_DB).find(
        (f) =>
          f.id.toLowerCase() === raw.toLowerCase() ||
          f.name.toLowerCase() === raw.toLowerCase() ||
          f.researchKey === raw,
      );
    if (hit) out.push(hit);
    else {
      // Generic researched tag → light phase-3 tech inject
      out.push({
        id: raw,
        name: raw,
        phase: 3,
        added_tech: 6,
        added_design: 4,
        cost: 0,
      });
    }
  }
  return out;
}

/**
 * Single-phase output (EngineMathMatrix.calculatePhaseOutput).
 * sliders: 0–100 field weights for this phase.
 */
export function calculatePhaseOutput(opts: {
  genreId: GenreId;
  stage: 1 | 2 | 3;
  sliders: Record<string, number>;
  features: FeatureInjection[];
  staffTech: number;
  staffDesign: number;
}): PhaseOutput {
  const profile = GENRE_PHASE_PROFILES[opts.genreId] ?? GENRE_PHASE_PROFILES.action!;
  const ideal = profile[phaseKey(opts.stage)];
  const phaseFeatures = opts.features.filter((f) => f.phase === opts.stage);

  let pTech = 0;
  let pDesign = 0;
  for (const f of phaseFeatures) {
    pTech += f.added_tech;
    pDesign += f.added_design;
  }

  // Deviation vs ideal for fields present in STAGE_FIELDS
  const fields = STAGE_FIELDS[opts.stage];
  let devSum = 0;
  let n = 0;
  for (const f of fields) {
    const idealV = ideal[f] ?? ideal[f === "level" ? "level_design" : f] ?? 0.5;
    const sliderV = (opts.sliders[f] ?? 50) / 100;
    devSum += Math.abs(sliderV - idealV);
    n++;
  }
  const efficiency = Math.max(0.2, 1.0 - (devSum / Math.max(1, n)) * 0.9);

  const engineW = (opts.sliders.engine ?? opts.sliders.graphics ?? 50) / 100;
  const designW =
    (opts.sliders.gameplay ?? opts.sliders.story ?? opts.sliders.level ?? 50) / 100;

  const tech =
    (opts.staffTech * engineW + pTech) * efficiency;
  const design =
    (opts.staffDesign * designW + pDesign) * efficiency;

  const workloadRatio =
    (pTech + pDesign) / (opts.staffTech + opts.staffDesign + 1);
  let bugs = 0;
  let bottleneck = false;
  if (workloadRatio > 0.6) {
    bugs = Math.floor((workloadRatio - 0.6) * 45);
    bottleneck = true;
  }
  // Bad stage focus injects ship bugs even without heavy feature load
  // (Garage titles rarely hit feature bottlenecks.)
  if (efficiency < 0.72) {
    bugs += Math.max(1, Math.floor((0.72 - efficiency) * 48));
  }
  // Extreme miss: invert focus hard → more defects at score time
  if (efficiency < 0.45) {
    bugs += Math.floor((0.45 - efficiency) * 30);
  }

  return {
    tech: Math.round(tech),
    design: Math.round(design),
    bugs,
    efficiency,
    featureTech: pTech,
    featureDesign: pDesign,
    bottleneck,
  };
}

/** Full 3-phase allocation for a project at score time. */
export function runAllocationEngine(opts: {
  genreId: GenreId;
  featureIds: string[];
  stage1: Record<string, number>;
  stage2: Record<string, number>;
  stage3: Record<string, number>;
  staffTech: number;
  staffDesign: number;
}): AllocationResult {
  const features = resolveFeatures(opts.featureIds);
  const stages: Array<1 | 2 | 3> = [1, 2, 3];
  const sliders = [opts.stage1, opts.stage2, opts.stage3];
  const byPhase: PhaseOutput[] = [];
  let tech = 0;
  let design = 0;
  let bugs = 0;
  const notes: string[] = [];

  for (let i = 0; i < 3; i++) {
    const out = calculatePhaseOutput({
      genreId: opts.genreId,
      stage: stages[i]!,
      sliders: sliders[i]!,
      features,
      staffTech: opts.staffTech,
      staffDesign: opts.staffDesign,
    });
    byPhase.push(out);
    tech += out.tech;
    design += out.design;
    bugs += out.bugs;
    if (out.bottleneck) {
      notes.push(
        `Phase ${stages[i]} bottleneck: feature load vs staff → +${out.bugs} bugs`,
      );
    }
  }

  const totalFeatureCost = features.reduce((s, f) => s + f.cost, 0);
  return { tech, design, bugs, byPhase, totalFeatureCost, notes };
}

/** Staff aggregate tech/design from roster (founder baseline if empty). */
export function staffPoolStats(
  staff: Array<{ tech: number; design: number; energy?: number }>,
): { tech: number; design: number } {
  if (!staff.length) return { tech: 35, design: 35 };
  let tech = 0;
  let design = 0;
  for (const m of staff) {
    const e = Math.max(0.35, (m.energy ?? 100) / 100);
    tech += m.tech * e * 0.35;
    design += m.design * e * 0.35;
  }
  return {
    tech: Math.max(20, Math.round(tech)),
    design: Math.max(20, Math.round(design)),
  };
}

export { idealPhaseSliders };
