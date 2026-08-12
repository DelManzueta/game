import { hashSeed } from "../scoring/rng";
/**
 * Research pipeline state machine — observe → research → prototype → integrate → use → mature.
 */

import { RESEARCH } from "../data";
import { earlyResearchPenalty } from "./eras";
import { getTech, TECH_CATALOG } from "./catalog";
import type {
  CompanyTechState,
  ResearchPipelineState,
  TechLifecycleState,
} from "./types";

export function emptyResearchPipeline(): ResearchPipelineState {
  return { knowledge: {}, activePipelineJobs: [] };
}

export function ensureCompanyTech(
  pipe: ResearchPipelineState,
  techId: string,
  seed?: Partial<CompanyTechState>,
): ResearchPipelineState {
  if (pipe.knowledge[techId]) return pipe;
  return {
    ...pipe,
    knowledge: {
      ...pipe.knowledge,
      [techId]: {
        techId,
        state: "unknown",
        progress: 0,
        commercialUses: 0,
        maturity: 0,
        lastAdvancedWeek: 0,
        prototypeNotes: [],
        integrationComplete: false,
        failureKnowledge: 0,
        ...seed,
      },
    },
  };
}

/** Seed garage-era design features as production_ready (available from beginning). */
export function seedGarageTechPipeline(year: number): ResearchPipelineState {
  let pipe = emptyResearchPipeline();
  const starters = [
    "collectibles",
    "boss_encounters",
    "cheat_codes",
    "language_settings",
    "difficulty_selection",
    "pattern_ai",
  ];
  for (const id of starters) {
    pipe = ensureCompanyTech(pipe, id, {
      state: "production_ready",
      progress: 1,
      maturity: 0.35,
      integrationComplete: true,
      observedYear: year,
    });
  }
  // Observe early-era tech that is era-available
  for (const t of TECH_CATALOG) {
    if (year >= t.earliestYear && !pipe.knowledge[t.id]) {
      if (year >= t.normalYear - 2) {
        pipe = ensureCompanyTech(pipe, t.id, {
          state: year >= t.normalYear && t.requires.length === 0 ? "researchable" : "observed",
          observedYear: year,
        });
      }
    }
  }
  return pipe;
}

/**
 * RESEARCHABLE =
 * EraAvailable AND DependenciesComplete AND DepartmentQualified
 * AND RequiredPlatformExists AND CompanyHasUseCase
 * (Department / platform / use-case simplified for garage slice.)
 */
export function canBecomeResearchable(
  techId: string,
  opts: {
    year: number;
    pipe: ResearchPipelineState;
    researchedLegacy: string[];
    office: number;
    hasRnd?: boolean;
  },
): { ok: boolean; reason: string } {
  const def = getTech(techId);
  if (!def) {
    // Legacy studio research always researchable if in RESEARCH list
    const legacy = RESEARCH.find((r) => r.id === techId);
    if (!legacy) return { ok: false, reason: "Unknown technology." };
    if (legacy.minYear && opts.year < legacy.minYear) {
      return { ok: false, reason: `Not available until ${legacy.minYear}.` };
    }
    if (legacy.requires?.some((r) => !opts.researchedLegacy.includes(r))) {
      return { ok: false, reason: "Missing prerequisites." };
    }
    return { ok: true, reason: "Ready." };
  }

  if (opts.year < def.earliestYear) {
    return { ok: false, reason: `Too early — earliest ${def.earliestYear}.` };
  }
  for (const req of def.requires) {
    const k = opts.pipe.knowledge[req];
    const ready =
      opts.researchedLegacy.includes(req) ||
      (k &&
        ["production_ready", "first_commercial", "mature", "legacy"].includes(k.state));
    if (!ready) return { ok: false, reason: `Needs ${req} ready first.` };
  }
  if (def.era.startsWith("era9") || def.era.startsWith("era10")) {
    if (!opts.hasRnd && opts.office < 4) {
      return { ok: false, reason: "Needs advanced R&D facilities." };
    }
  }
  return { ok: true, reason: "Researchable." };
}

export function observeTech(
  pipe: ResearchPipelineState,
  techId: string,
  year: number,
  week: number,
): ResearchPipelineState {
  let next = ensureCompanyTech(pipe, techId);
  const cur = next.knowledge[techId]!;
  if (cur.state !== "unknown") return next;
  next = {
    ...next,
    knowledge: {
      ...next.knowledge,
      [techId]: {
        ...cur,
        state: "observed",
        observedYear: year,
        lastAdvancedWeek: week,
      },
    },
  };
  return next;
}

export function tryMarkResearchable(
  pipe: ResearchPipelineState,
  techId: string,
  opts: Parameters<typeof canBecomeResearchable>[1],
): ResearchPipelineState {
  const next = ensureCompanyTech(pipe, techId);
  const cur = next.knowledge[techId]!;
  if (cur.state !== "observed" && cur.state !== "unknown") return next;
  const check = canBecomeResearchable(techId, opts);
  if (!check.ok) return next;
  return {
    ...next,
    knowledge: {
      ...next.knowledge,
      [techId]: { ...cur, state: "researchable", lastAdvancedWeek: opts.year },
    },
  };
}

/** Start research phase (after RP spent). Design-only may skip to production_ready faster. */
export function beginTechResearch(
  pipe: ResearchPipelineState,
  techId: string,
  year: number,
  week: number,
): { pipe: ResearchPipelineState; weeks: number; costMult: number; error?: string } {
  const def = getTech(techId);
  let next = ensureCompanyTech(pipe, techId);
  const cur = next.knowledge[techId]!;

  if (def?.isDesignOnly && def.researchWeeks === 0) {
    return {
      pipe: {
        ...next,
        knowledge: {
          ...next.knowledge,
          [techId]: {
            ...cur,
            state: "production_ready",
            progress: 1,
            integrationComplete: true,
            maturity: 0.4,
            lastAdvancedWeek: week,
          },
        },
      },
      weeks: 0,
      costMult: 1,
    };
  }

  if (cur.state !== "researchable" && cur.state !== "observed" && cur.state !== "unknown") {
    if (cur.state === "production_ready" || cur.state === "mature") {
      return { pipe: next, weeks: 0, costMult: 1, error: "Already ready." };
    }
  }

  const normalYear = def?.normalYear ?? year;
  const earliest = def?.earliestYear ?? year;
  const pen = earlyResearchPenalty(year, normalYear, earliest);
  const weeks = Math.max(1, Math.round((def?.researchWeeks ?? 3) * pen.weeksMult));

  next = {
    ...next,
    knowledge: {
      ...next.knowledge,
      [techId]: {
        ...cur,
        state: "researching",
        progress: 0,
        lastAdvancedWeek: week,
      },
    },
    activePipelineJobs: [
      ...next.activePipelineJobs.filter((j) => j.techId !== techId),
      { techId, phase: "researching", weeksLeft: weeks, totalWeeks: weeks },
    ],
  };
  return { pipe: next, weeks, costMult: pen.costMult };
}

/** Tick pipeline jobs one week. */
export function tickResearchPipeline(
  pipe: ResearchPipelineState,
  week: number,
): { pipe: ResearchPipelineState; notes: string[] } {
  const notes: string[] = [];
  const knowledge = { ...pipe.knowledge };
  const jobs: ResearchPipelineState["activePipelineJobs"] = [];

  for (const job of pipe.activePipelineJobs) {
    const left = job.weeksLeft - 1;
    const def = getTech(job.techId);
    const cur = knowledge[job.techId];
    if (!cur) continue;

    if (left > 0) {
      jobs.push({ ...job, weeksLeft: left });
      knowledge[job.techId] = {
        ...cur,
        progress: 1 - left / Math.max(1, job.totalWeeks),
        lastAdvancedWeek: week,
      };
      continue;
    }

    if (job.phase === "researching") {
      // Partial success still advances to prototype
      const risk = def?.prototypeRisk ?? 0.15;
      const limited = (hashSeed("research-risk", risk, "limited") / 4294967296) < risk * 0.35;
      knowledge[job.techId] = {
        ...cur,
        state: "prototype",
        progress: 1,
        prototypeNotes: limited
          ? ["Prototype works with limitations — expect integration pain."]
          : ["Prototype demonstrates the approach."],
        failureKnowledge: limited ? cur.failureKnowledge + 0.1 : cur.failureKnowledge,
        lastAdvancedWeek: week,
      };
      notes.push(`${def?.name ?? job.techId}: research complete → prototype.`);
      if (def?.isDesignOnly) {
        knowledge[job.techId] = {
          ...knowledge[job.techId]!,
          state: "production_ready",
          integrationComplete: true,
          maturity: 0.3,
        };
        notes.push(`${def.name}: design feature ready for production.`);
      } else {
        const iw = Math.max(1, Math.round((def?.integrationWork ?? 40) / 25));
        jobs.push({
          techId: job.techId,
          phase: "engine_integration",
          weeksLeft: iw,
          totalWeeks: iw,
        });
        knowledge[job.techId] = {
          ...knowledge[job.techId]!,
          state: "engine_integration",
          progress: 0,
        };
      }
    } else if (job.phase === "engine_integration") {
      knowledge[job.techId] = {
        ...cur,
        state: "production_ready",
        progress: 1,
        integrationComplete: true,
        maturity: 0.25,
        lastAdvancedWeek: week,
      };
      notes.push(`${def?.name ?? job.techId}: engine integration complete — production ready.`);
    } else if (job.phase === "prototype") {
      knowledge[job.techId] = {
        ...cur,
        state: "engine_integration",
        progress: 0,
        lastAdvancedWeek: week,
      };
      const iw = Math.max(1, Math.round((def?.integrationWork ?? 40) / 25));
      jobs.push({
        techId: job.techId,
        phase: "engine_integration",
        weeksLeft: iw,
        totalWeeks: iw,
      });
    }
  }

  return { pipe: { knowledge, activePipelineJobs: jobs }, notes };
}

/** First commercial use → maturity gains on repeat. */
export function recordCommercialUse(
  pipe: ResearchPipelineState,
  featureKeys: string[],
  week: number,
): ResearchPipelineState {
  const knowledge = { ...pipe.knowledge };
  for (const t of TECH_CATALOG) {
    if (!t.featureKey || !featureKeys.includes(t.featureKey)) continue;
    const cur = knowledge[t.id];
    if (!cur || !cur.integrationComplete && cur.state !== "production_ready" && cur.state !== "first_commercial" && cur.state !== "mature") {
      continue;
    }
    const uses = cur.commercialUses + 1;
    let state: TechLifecycleState = cur.state;
    if (uses === 1) state = "first_commercial";
    else if (uses >= 3) state = "mature";
    knowledge[t.id] = {
      ...cur,
      commercialUses: uses,
      state,
      maturity: Math.min(1, cur.maturity + (uses === 1 ? 0.15 : 0.1)),
      lastAdvancedWeek: week,
    };
  }
  return { ...pipe, knowledge };
}

/** Sync legacy researched[] ids into pipeline as production_ready. */
export function syncLegacyResearched(
  pipe: ResearchPipelineState,
  researched: string[],
  week: number,
): ResearchPipelineState {
  let next = pipe;
  for (const id of researched) {
    const tech = TECH_CATALOG.find((t) => t.id === id || t.legacyResearchId === id);
    const techId = tech?.id ?? id;
    next = ensureCompanyTech(next, techId);
    const cur = next.knowledge[techId]!;
    if (
      ["production_ready", "first_commercial", "mature", "legacy"].includes(cur.state)
    ) {
      continue;
    }
    next = {
      ...next,
      knowledge: {
        ...next.knowledge,
        [techId]: {
          ...cur,
          state: "production_ready",
          progress: 1,
          integrationComplete: true,
          maturity: Math.max(cur.maturity, 0.3),
          lastAdvancedWeek: week,
        },
      },
    };
  }
  return next;
}

export function productionReadyFeatures(pipe: ResearchPipelineState): string[] {
  const out: string[] = [];
  for (const t of TECH_CATALOG) {
    const k = pipe.knowledge[t.id];
    if (!k || !t.featureKey) continue;
    if (
      ["production_ready", "first_commercial", "mature", "legacy"].includes(k.state)
    ) {
      out.push(t.featureKey);
    }
  }
  return out;
}

export function listVisibleTech(
  pipe: ResearchPipelineState,
  year: number,
): { def: (typeof TECH_CATALOG)[0]; state: CompanyTechState }[] {
  const rows: { def: (typeof TECH_CATALOG)[0]; state: CompanyTechState }[] = [];
  for (const def of TECH_CATALOG) {
    const k = pipe.knowledge[def.id];
    if (!k || k.state === "unknown") {
      if (year >= def.earliestYear && year >= def.normalYear - 5) {
        // show as observed placeholder
        rows.push({
          def,
          state: {
            techId: def.id,
            state: year >= def.normalYear ? "researchable" : "observed",
            progress: 0,
            commercialUses: 0,
            maturity: 0,
            lastAdvancedWeek: 0,
            prototypeNotes: [],
            integrationComplete: false,
            failureKnowledge: 0,
            observedYear: year,
          },
        });
      }
      continue;
    }
    if (!k) continue;
    rows.push({ def, state: k });
  }
  return rows;
}
