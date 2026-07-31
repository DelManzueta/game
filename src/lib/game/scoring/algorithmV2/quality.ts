/**
 * Algorithm V2 — craft quality + concept fit.
 * productQuality is independent of previous high scores.
 */
import type { AudienceId, DevField, GameProject, GameSize, GenreId, StaffMember } from "../../types";
import { computeGenreFit, genreFitModifier } from "../../content/genreFit";
import { STAGE_FIELDS } from "../../data";
import { SeededRng, hashSeed } from "../rng";
import {
  BUG_WEIGHTS,
  CONCEPT_FIT_RANGE,
  CONCEPT_WEIGHTS,
  CRAFT_WEIGHTS,
  DEFAULT_TOPIC_PROFILE,
  DISCIPLINE_MIX,
  EXECUTION_TARGET,
  GENRE_DEMAND,
  GENRE_PRIORITIES,
  STAGE_EFFORT_TOTAL,
  TOPIC_PROFILES,
  WORK_FACTORS,
  type TopicProfile,
} from "./config";

export type QualityBreakdownV2 = {
  execution: number;
  focusAlignment: number;
  designTechBalance: number;
  featureCoherence: number;
  innovation: number;
  polish: number;
  teamExecution: number;
  conceptFit: number;
  bugPenalty: number;
  expectationModifier: number;
  finalQuality: number;
  /** 0–1 craft before concept */
  craftQuality: number;
  productQuality: number;
  generatedDesign: number;
  generatedTech: number;
  weightedBugs: number;
  stageTotals: Record<1 | 2 | 3, number>;
  algorithm: "v2";
};

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Normalize three stage sliders to sum STAGE_EFFORT_TOTAL. */
export function normalizeStageAllocations(
  fields: DevField[],
  sliders: Record<DevField, number>,
): Record<DevField, number> {
  const raw = fields.map((f) => Math.max(0, sliders[f] ?? 0));
  const sum = raw.reduce((a, b) => a + b, 0);
  const out = {} as Record<DevField, number>;
  if (sum <= 0) {
    const each = STAGE_EFFORT_TOTAL / fields.length;
    for (const f of fields) out[f] = each;
    return out;
  }
  let assigned = 0;
  fields.forEach((f, i) => {
    if (i === fields.length - 1) {
      out[f] = STAGE_EFFORT_TOTAL - assigned;
    } else {
      const v = Math.round((raw[i]! / sum) * STAGE_EFFORT_TOTAL);
      out[f] = v;
      assigned += v;
    }
  });
  return out;
}

export function stageAllocationTotal(alloc: Record<string, number>): number {
  return Object.values(alloc).reduce((a, b) => a + b, 0);
}

function cosineSimilarity(a: TopicProfile, b: TopicProfile): number {
  const keys = Object.keys(a) as (keyof TopicProfile)[];
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const k of keys) {
    dot += a[k] * b[k];
    na += a[k] * a[k];
    nb += b[k] * b[k];
  }
  if (na === 0 || nb === 0) return 0.5;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function audienceFit(genre: GenreId, audience: AudienceId): number {
  const maturity = GENRE_DEMAND[genre].maturity;
  const casual = GENRE_DEMAND[genre].casualAccessibility;
  if (audience === "young") return clamp(0.75 + casual * 0.25 - maturity * 0.15, 0.55, 1);
  if (audience === "mature") return clamp(0.7 + maturity * 0.3, 0.55, 1);
  return 0.85;
}

function platformGenreFit(platformMarket: number, techCeiling: number, genre: GenreId): number {
  const techNeed = GENRE_PRIORITIES[genre].engine + GENRE_PRIORITIES[genre].graphics;
  const fit = 0.75 + platformMarket * 0.12 + techCeiling * 0.08 - Math.max(0, techNeed - 0.8) * 0.05;
  return clamp(fit, 0.6, 1);
}

export function computeConceptFit(opts: {
  topicId: string;
  genreId: GenreId;
  genre2Id?: GenreId | null;
  genres?: GenreId[];
  audience: AudienceId;
  platformMarket: number;
  platformTechCeiling: number;
}): number {
  const genres: GenreId[] = opts.genres?.length
    ? opts.genres
    : opts.genre2Id
      ? [opts.genreId, opts.genre2Id]
      : [opts.genreId];
  // Authoritative Topic × ordered GenreFit (0–100) → modifier
  const gFit = computeGenreFit({ topicId: opts.topicId, genres });
  const topicGenre = genreFitModifier(gFit); // ~0.76–1.10
  const genreAud = audienceFit(opts.genreId, opts.audience);
  const genrePlat = platformGenreFit(opts.platformMarket, opts.platformTechCeiling, opts.genreId);
  const platAud = 0.8 + opts.platformMarket * 0.1;
  const raw =
    topicGenre * CONCEPT_WEIGHTS.topicGenre +
    genreAud * CONCEPT_WEIGHTS.genreAudience +
    genrePlat * CONCEPT_WEIGHTS.genrePlatform +
    platAud * CONCEPT_WEIGHTS.platformAudience;
  // Map into CONCEPT_FIT_RANGE
  const t = clamp((raw - 0.55) / 0.55, 0, 1);
  return CONCEPT_FIT_RANGE.min + t * (CONCEPT_FIT_RANGE.max - CONCEPT_FIT_RANGE.min);
}

function normalizePriorities(p: Record<DevField, number>): Record<DevField, number> {
  const sum = Object.values(p).reduce((a, b) => a + b, 0) || 1;
  const out = {} as Record<DevField, number>;
  for (const k of Object.keys(p) as DevField[]) out[k] = p[k]! / sum;
  return out;
}

/** Reconstruct effort shares from stage configs (already ~100 each stage). */
export function effortFromProject(project: GameProject): Record<DevField, number> {
  const effort = {} as Record<DevField, number>;
  for (const stage of [1, 2, 3] as const) {
    const fields = STAGE_FIELDS[stage];
    const cfg = project.stageConfigs?.[stage] ?? {};
    const normalized = normalizeStageAllocations(
      fields,
      { ...project.sliders, ...cfg } as Record<DevField, number>,
    );
    for (const f of fields) {
      effort[f] = (effort[f] ?? 0) + (normalized[f] ?? 0);
    }
  }
  return effort;
}

export function computeWorkOutput(opts: {
  project: GameProject;
  staff: StaffMember[];
  designBoost: number;
  techBoost: number;
  featureCount: number;
  seed: number;
}): { design: number; tech: number; executionRaw: number } {
  const rng = new SeededRng(opts.seed);
  const effort = effortFromProject(opts.project);
  let design = 0;
  let tech = 0;
  const team = opts.staff.length || 1;
  const workload = clamp(
    WORK_FACTORS.workloadMax - (team - 1) * 0.04,
    WORK_FACTORS.workloadMin,
    WORK_FACTORS.workloadMax,
  );
  const synergy = clamp(
    WORK_FACTORS.synergyMin + team * 0.03,
    WORK_FACTORS.synergyMin,
    WORK_FACTORS.synergyMax,
  );
  const tool = clamp(
    WORK_FACTORS.toolMin + opts.featureCount * 0.03 + opts.designBoost / 200 + opts.techBoost / 200,
    WORK_FACTORS.toolMin,
    WORK_FACTORS.toolMax,
  );

  for (const member of opts.staff) {
    const energy = clamp(
      WORK_FACTORS.energyMin + ((member.energy ?? 100) / 100) * (WORK_FACTORS.energyMax - WORK_FACTORS.energyMin),
      WORK_FACTORS.energyMin,
      WORK_FACTORS.energyMax,
    );
    for (const field of Object.keys(effort) as DevField[]) {
      const alloc = (effort[field] ?? 0) / STAGE_EFFORT_TOTAL; // 0–3-ish across stages
      if (alloc <= 0) continue;
      const mix = DISCIPLINE_MIX[field];
      const relevantSkill = mix.design * member.design + mix.tech * member.tech;
      const skillFit = WORK_FACTORS.skillBase + relevantSkill / WORK_FACTORS.skillDiv;
      const fieldXp = member.fieldExperience?.[field] ?? 0;
      const exp = clamp(
        WORK_FACTORS.expMin + (fieldXp / 100) * (WORK_FACTORS.expMax - WORK_FACTORS.expMin),
        WORK_FACTORS.expMin,
        WORK_FACTORS.expMax,
      );
      const base =
        alloc *
        skillFit *
        energy *
        exp *
        tool *
        workload *
        synergy *
        (1 + rng.jitter(0.04));
      // diminishing returns
      const effective = base / (1 + WORK_FACTORS.diminishingK * base * 10);
      design += effective * mix.design * 12;
      tech += effective * mix.tech * 12;
    }
  }

  // Also fold in accumulated design/tech points from development weeks (bridge V1 loop)
  design += opts.project.designPoints * 0.35;
  tech += opts.project.techPoints * 0.35;

  return { design, tech, executionRaw: design + tech };
}

export function computeCraftAndQuality(opts: {
  project: GameProject;
  staff: StaffMember[];
  designBoost?: number;
  techBoost?: number;
  platformMarket: number;
  platformTechCeiling: number;
  /** Studio reputation 0–100, optional expectation only ±cap */
  reputation?: number;
  previousAvgReview?: number;
  seed: number;
}): QualityBreakdownV2 {
  const project = opts.project;
  const seed = opts.seed;
  const work = computeWorkOutput({
    project,
    staff: opts.staff,
    designBoost: opts.designBoost ?? 0,
    techBoost: opts.techBoost ?? 0,
    featureCount: project.features?.length ?? 0,
    seed: hashSeed(seed, "work"),
  });

  const size = project.size as GameSize;
  const target = EXECUTION_TARGET[size] ?? EXECUTION_TARGET.small;
  const execution = clamp(work.executionRaw / target, 0, 1.15) / 1.15; // 0–1

  // Focus: allocation vs genre priorities
  const effort = effortFromProject(project);
  const pri = normalizePriorities(GENRE_PRIORITIES[project.genreId]);
  let focusScore = 0;
  let effortSum = 0;
  for (const f of Object.keys(pri) as DevField[]) {
    const e = effort[f] ?? 0;
    effortSum += e;
    focusScore += e * (pri[f] ?? 0);
  }
  const ideal = effortSum * Math.max(...Object.values(pri));
  const focusAlignment = clamp(focusScore / (ideal || 1), 0, 1);

  // Design/Tech balance vs genre tech bias
  const totalDT = work.design + work.tech || 1;
  const techFrac = work.tech / totalDT;
  const genreRatio =
    (GENRE_PRIORITIES[project.genreId].engine +
      GENRE_PRIORITIES[project.genreId].ai +
      GENRE_PRIORITIES[project.genreId].graphics) /
    (Object.values(GENRE_PRIORITIES[project.genreId]).reduce((a, b) => a + b, 0) || 1);
  const designTechBalance = clamp(1 - Math.abs(techFrac - genreRatio) * 1.4, 0, 1);

  const featureCount = project.features?.length ?? 0;
  const scopePenalty = featureCount > 6 ? (featureCount - 6) * 0.04 : 0;
  const featureCoherence = clamp(0.55 + Math.min(featureCount, 4) * 0.08 - scopePenalty, 0.25, 1);

  const innovation = clamp(0.4 + Math.min(featureCount, 5) * 0.06 + (work.executionRaw > target ? 0.1 : 0), 0, 1);

  // Bugs: map total bugs into minor/major/critical heuristically from count
  const bugs = project.bugs ?? 0;
  const critical = Math.floor(bugs / 12);
  const major = Math.floor((bugs % 12) / 4);
  const minor = bugs - critical * 12 - major * 4;
  const weightedBugs =
    minor * BUG_WEIGHTS.minor + major * BUG_WEIGHTS.major + critical * BUG_WEIGHTS.critical;
  // nonlinear polish
  const polish = clamp(1 - Math.pow(weightedBugs / 40, 1.25), 0, 1);

  const avgEnergy =
    opts.staff.reduce((s, m) => s + (m.energy ?? 100), 0) / (opts.staff.length || 1);
  const teamExecution = clamp(0.5 + avgEnergy / 250 + opts.staff.length * 0.04, 0.35, 1);

  const craftQuality =
    execution * CRAFT_WEIGHTS.execution +
    focusAlignment * CRAFT_WEIGHTS.focusAlignment +
    designTechBalance * CRAFT_WEIGHTS.designTechBalance +
    featureCoherence * CRAFT_WEIGHTS.featureCoherence +
    innovation * CRAFT_WEIGHTS.innovation +
    polish * CRAFT_WEIGHTS.polish +
    teamExecution * CRAFT_WEIGHTS.teamExecution;

  const conceptFit = computeConceptFit({
    topicId: project.topicId,
    genreId: project.genreId,
    audience: project.audience,
    platformMarket: opts.platformMarket,
    platformTechCeiling: opts.platformTechCeiling,
  });

  // productQuality 1–100 — NO comparison to previous best
  let productQuality = 100 * craftQuality * conceptFit;
  productQuality = clamp(productQuality, 1, 100);

  // Expectation: slight modifier only, never escalating mandatory bar
  const rep = opts.reputation ?? 50;
  const prev = opts.previousAvgReview ?? 5;
  let expectationModifier = 0;
  if (prev >= 8) expectationModifier = -Math.min(3, (prev - 7) * 1.2); // slightly harsher critics, not lower raw quality
  if (rep > 70) expectationModifier -= 1;
  if (rep < 30) expectationModifier += 1.5;
  expectationModifier = clamp(expectationModifier, -5, 5);

  // Bug penalty applied on critic path mostly; also mild on finalQuality display
  const bugPenalty = Math.min(25, Math.pow(weightedBugs / 8, 1.15) * 3);

  const finalQuality = clamp(productQuality - bugPenalty * 0.35, 1, 100);

  const stageTotals = {
    1: stageAllocationTotal(project.stageConfigs?.[1] ?? {}),
    2: stageAllocationTotal(project.stageConfigs?.[2] ?? {}),
    3: stageAllocationTotal(project.stageConfigs?.[3] ?? {}),
  } as Record<1 | 2 | 3, number>;

  return {
    execution,
    focusAlignment,
    designTechBalance,
    featureCoherence,
    innovation,
    polish,
    teamExecution,
    conceptFit,
    bugPenalty,
    expectationModifier,
    finalQuality,
    craftQuality,
    productQuality,
    generatedDesign: work.design,
    generatedTech: work.tech,
    weightedBugs,
    stageTotals,
    algorithm: "v2",
  };
}

/** Evidence-based comment from breakdown. */
export function pickReviewComment(
  breakdown: QualityBreakdownV2,
  genreId: GenreId,
  rng: SeededRng,
): string {
  const options: { when: boolean; text: string }[] = [
    {
      when: breakdown.focusAlignment >= 0.75,
      text: "Excellent focus on the disciplines this genre rewards.",
    },
    {
      when: breakdown.focusAlignment < 0.45,
      text: "Players of this genre may find key systems underdeveloped.",
    },
    {
      when: breakdown.polish < 0.5,
      text: "A strong concept was undermined by major launch bugs.",
    },
    {
      when: breakdown.polish >= 0.85 && breakdown.execution >= 0.7,
      text: "Tight polish elevates otherwise familiar design.",
    },
    {
      when: breakdown.designTechBalance < 0.45,
      text: "The design/technology mix felt off for the genre.",
    },
    {
      when: breakdown.featureCoherence < 0.5,
      text: "The engine struggled with the project’s ambitious feature set.",
    },
    {
      when: breakdown.featureCoherence >= 0.75,
      text: "Selected features support the fantasy well.",
    },
    {
      when: breakdown.conceptFit >= 1.02,
      text: "Topic and genre reinforce each other effectively.",
    },
    {
      when: breakdown.conceptFit <= 0.92,
      text: "The concept is a tough sell for this genre’s audience.",
    },
    {
      when: breakdown.execution >= 0.8 && genreId === "action",
      text: "Excellent gameplay carried an otherwise conventional release.",
    },
    {
      when: breakdown.innovation >= 0.7,
      text: "Fresh ideas give the package a distinctive edge.",
    },
  ];
  const valid = options.filter((o) => o.when);
  if (!valid.length) return "A competent release with few surprises.";
  return valid[rng.int(0, valid.length - 1)]!.text;
}
