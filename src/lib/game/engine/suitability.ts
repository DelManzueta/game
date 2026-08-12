/**
 * Multi-axis engine suitability for a game project (Part 3 §19).
 * Never collapse to a single green number as the only signal.
 */

import type { GameSize, GenreId, StaffMember } from "../types";
import { moduleById } from "./modules";
import type {
  EngineSuitability,
  EngineVersion,
  EngineFamily,
  EnginePurpose,
} from "./types";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

const GENRE_PURPOSE_FIT: Record<GenreId, Partial<Record<EnginePurpose, number>>> = {
  action: { high_speed_action: 1, open_world: 0.75, portable_cross_platform: 0.7, fast_2d: 0.65 },
  adventure: { cinematic_narrative: 1, fast_2d: 0.75, open_world: 0.7 },
  rpg: { open_world: 0.95, cinematic_narrative: 0.85, deep_simulation: 0.7 },
  simulation: { deep_simulation: 1, open_world: 0.7, experimental_future: 0.65 },
  strategy: { deep_simulation: 0.9, competitive_multiplayer: 0.75, fast_2d: 0.7 },
  casual: { fast_2d: 1, mobile_handheld: 0.95, portable_cross_platform: 0.8 },
};

export function evaluateEngineSuitability(opts: {
  version: EngineVersion;
  family: EngineFamily;
  genreId: GenreId;
  size: GameSize;
  platformId: string;
  staff: StaffMember[];
  familyFamiliarity: number;
  wantsOnline?: boolean;
}): EngineSuitability {
  const { version: v, family: f } = opts;
  const notes: string[] = [];
  const modules = v.modules.map((m) => m.moduleId);

  // Gameplay — purpose × genre
  const fitMap = GENRE_PURPOSE_FIT[opts.genreId] ?? {};
  let gameplay = fitMap[f.purpose] ?? 0.55;
  for (const sec of f.secondaryPurposes) {
    gameplay = Math.max(gameplay, (fitMap[sec] ?? 0.45) * 0.9);
  }
  if (modules.includes("ai_basic") && (opts.genreId === "action" || opts.genreId === "strategy")) {
    gameplay += 0.05;
  }
  gameplay = clamp01(gameplay);

  // Platform
  const hasAdapter =
    v.supportedPlatforms.includes(opts.platformId) ||
    v.platformAdapters.some((a) => a.platformId === opts.platformId);
  let platform = hasAdapter ? 0.75 + v.portability * 0.2 : 0.35 + v.portability * 0.4;
  if (!hasAdapter) notes.push(`No dedicated adapter for ${opts.platformId} — expect extra port work.`);
  platform = clamp01(platform);

  // Scale
  const sizeOk = v.supportedProjectSizes.includes(opts.size);
  let scale = sizeOk ? 0.8 : 0.4;
  if (opts.size === "aaa" && !modules.includes("build_pipeline")) {
    scale -= 0.15;
    notes.push("AAA without a build pipeline — infrastructure risk.");
  }
  if (opts.size === "small" && v.modules.length > 10) {
    scale -= 0.1;
    notes.push("Heavy engine scope for a small game — overengineering risk.");
  }
  scale = clamp01(scale);

  // Performance
  const demand =
    modules.reduce((s, id) => {
      const m = moduleById(id);
      return s + (m ? m.cpuDemand + m.gpuDemand + m.memoryDemand : 0);
    }, 0) / Math.max(1, modules.length);
  let performance = clamp01(v.performance * 0.7 + (1 - Math.min(1, demand)) * 0.3);
  if (v.technicalDebt > 40) {
    performance -= 0.08;
    notes.push("Technical debt may show up as frame spikes and long loads.");
  }
  performance = clamp01(performance);

  // Tools
  const hasTools = modules.some((id) => moduleById(id)?.category === "tools");
  const tools = clamp01(v.toolQuality * (hasTools ? 1 : 0.55));
  if (!hasTools && (opts.size === "large" || opts.size === "aaa")) {
    notes.push("Weak content tools for this scale — iteration will suffer.");
  }

  // Team
  const engStaff = opts.staff.filter(
    (s) => s.specialization === "engine" || s.specialization === "graphics" || s.tech >= 55,
  );
  let team = clamp01(0.4 + opts.familyFamiliarity * 0.4 + Math.min(0.25, engStaff.length * 0.08));
  if (opts.familyFamiliarity < 0.25 && f.purpose === "experimental_future") {
    notes.push("Low team familiarity with an experimental engine — estimates are unreliable.");
    team -= 0.1;
  }
  team = clamp01(team);

  // Online
  let online = 0.35;
  if (modules.includes("net_online")) online = 0.85;
  else if (modules.includes("net_local")) online = 0.55;
  if (opts.wantsOnline && online < 0.7) notes.push("Online features requested but engine networking is thin.");
  online = clamp01(online);

  // Long-term support
  const statusBoost: Record<string, number> = {
    stable: 0.9,
    lts: 0.95,
    beta: 0.55,
    alpha: 0.35,
    prototype: 0.25,
    release_candidate: 0.7,
    legacy: 0.5,
    deprecated: 0.3,
    sunset: 0.15,
  };
  const longTermSupport = clamp01(
    (statusBoost[v.status] ?? 0.5) * 0.7 + v.maintainability * 0.3 - v.technicalDebt / 200,
  );
  if (v.status === "legacy" || v.status === "deprecated") {
    notes.push("Engine support state is not ideal for new flagship work.");
  }

  const overall = clamp01(
    gameplay * 0.18 +
      platform * 0.14 +
      scale * 0.14 +
      performance * 0.12 +
      tools * 0.1 +
      team * 0.14 +
      online * 0.08 +
      longTermSupport * 0.1,
  );

  if (overall >= 0.75) notes.unshift("Strong overall fit — still check each category.");
  else if (overall < 0.45) notes.unshift("Weak fit — consider another version or more integration effort.");

  return {
    gameplay,
    platform,
    scale,
    performance,
    tools,
    team,
    online,
    longTermSupport,
    overall,
    notes: notes.slice(0, 6),
  };
}

/** Integration health for in-game engine work (Part 3 §24). */
export function computeIntegrationHealth(opts: {
  version: EngineVersion;
  featureCompletion: number;
  engineStageEffort: number;
  debt: number;
}): number {
  const base = opts.version.stability * 0.35 + opts.version.maintainability * 0.2;
  const completion = Math.min(1, opts.featureCompletion);
  const effort = Math.min(1, opts.engineStageEffort / 100);
  const debtPenalty = Math.min(0.35, opts.debt / 150);
  return clamp01(base + completion * 0.25 + effort * 0.25 - debtPenalty);
}
