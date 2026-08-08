/**
 * Create engine families, versions, garage starter, and build projects.
 * Released versions are immutable snapshots.
 */

import type { EngineDef, GameSize } from "../types";
import {
  startingModuleIds,
  resolveWithDependencies,
  missingDependencies,
  activeConflicts,
  moduleById,
} from "./modules";
import {
  computeRequiredEngineWork,
  teamWeeklyEngineCapacity,
  estimateWeeks,
  clampPriorityPoints,
} from "./work";
import type {
  ArchitectureStyle,
  EngineBuildProject,
  EngineFamily,
  EnginePurpose,
  EngineVersion,
  EngineWorkshopState,
  ModuleSnapshot,
  ArchitecturePriority,
  TargetLifespan,
  ModuleMaturity,
} from "./types";

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyWorkshop(): EngineWorkshopState {
  return {
    families: [],
    versions: [],
    activeBuild: null,
    familyFamiliarity: {},
    moduleFamiliarity: {},
  };
}

/** Day-one garage engine — mature enough for small 2D, not a quality cheat. */
export function createGarageWorkshop(opts: {
  companyId: string;
  week: number;
  year: number;
}): { workshop: EngineWorkshopState; engineDef: EngineDef } {
  const familyId = "fam_workbench";
  const versionId = "basic_engine";
  const modules = startingModuleIds();

  const family: EngineFamily = {
    familyId,
    name: "Workbench",
    ownerCompanyId: opts.companyId,
    createdWeek: opts.week,
    createdYear: opts.year,
    architectureGeneration: 1,
    reputation: 10,
    sharedDebt: 5,
    licensedExternally: false,
    supportPolicy: "active",
    purpose: "fast_2d",
    secondaryPurposes: [],
    architecture: "monolithic",
    lifespan: "one_project",
    priorities: {
      development_speed: 4,
      ease_of_use: 3,
      stability: 3,
      runtime_performance: 2,
    },
  };

  const version = finalizeVersionFromModules({
    versionId,
    familyId,
    major: 1,
    minor: 0,
    patch: 0,
    label: "Basic Engine 1.0",
    modules,
    platforms: ["pc", "itara"],
    sizes: ["small", "medium"],
    week: opts.week,
    year: opts.year,
    status: "stable",
    custom: false,
    technicalDebt: 8,
    cost: 0,
    weeksToBuild: 0,
  });

  const workshop: EngineWorkshopState = {
    families: [family],
    versions: [version],
    activeBuild: null,
    familyFamiliarity: { [familyId]: 0.55 },
    moduleFamiliarity: Object.fromEntries(modules.map((id) => [id, 0.5])),
  };

  return { workshop, engineDef: versionToEngineDef(version) };
}

export function versionToEngineDef(v: EngineVersion): EngineDef {
  return {
    id: v.engineDefId,
    name: v.label,
    features: [...v.features],
    designBonus: v.designBonus,
    techBonus: v.techBonus,
    cost: v.cost,
    weeks: v.weeksToBuild,
    custom: v.custom,
  };
}

export function finalizeVersionFromModules(opts: {
  versionId: string;
  familyId: string;
  major: number;
  minor: number;
  patch: number;
  label: string;
  modules: string[];
  platforms: string[];
  sizes: GameSize[];
  week: number;
  year: number;
  status: EngineVersion["status"];
  custom: boolean;
  technicalDebt: number;
  cost: number;
  weeksToBuild: number;
}): EngineVersion {
  const resolved = resolveWithDependencies(opts.modules);
  const snapshots: ModuleSnapshot[] = resolved.map((id) => {
    const m = moduleById(id);
    const maturity: ModuleMaturity =
      opts.status === "stable" || opts.status === "lts"
        ? "mature"
        : opts.status === "beta" || opts.status === "release_candidate"
          ? "early_production"
          : "prototype";
    return {
      moduleId: id,
      versionLabel: `${opts.major}.${opts.minor}`,
      maturity,
      technicalDebt: opts.technicalDebt / Math.max(1, resolved.length),
      knownDefects: opts.status === "stable" ? 0 : opts.status === "beta" ? 2 : 4,
    };
  });

  const features = resolved
    .map((id) => moduleById(id)?.name ?? id)
    .filter(Boolean);

  const designBonus = Math.min(25, resolved.filter((id) => {
    const c = moduleById(id)?.category;
    return c === "tools" || c === "ui" || c === "scripting";
  }).length * 2);

  const techBonus = Math.min(35, resolved.filter((id) => {
    const c = moduleById(id)?.category;
    return c === "rendering" || c === "physics" || c === "ai" || c === "networking" || c === "world";
  }).length * 3 + (opts.status === "stable" ? 2 : 0));

  const stability =
    opts.status === "stable" || opts.status === "lts"
      ? 0.82
      : opts.status === "release_candidate"
        ? 0.7
        : opts.status === "beta"
          ? 0.55
          : 0.35;

  const toolMods = resolved.filter((id) => moduleById(id)?.category === "tools").length;
  const port =
    opts.platforms.length >= 3 ? 0.75 : opts.platforms.length === 2 ? 0.6 : 0.45;

  return {
    versionId: opts.versionId,
    familyId: opts.familyId,
    major: opts.major,
    minor: opts.minor,
    patch: opts.patch,
    label: opts.label,
    status: opts.status,
    releaseWeek: opts.week,
    releaseYear: opts.year,
    supportedProjectSizes: opts.sizes,
    supportedPlatforms: opts.platforms,
    modules: snapshots,
    platformAdapters: opts.platforms.map((p) => ({
      adapterId: `adp_${opts.versionId}_${p}`,
      platformId: p,
      sdkVersion: "1.0",
      maturity: opts.status === "stable" ? "mature" : "early_production",
      certificationState: opts.status === "stable" ? "certified" : "in_progress",
      performanceProfile: stability,
      knownIssues: 0,
      maintenanceCost: 1,
    })),
    stability,
    maintainability: clamp01(0.75 - opts.technicalDebt / 200),
    portability: port,
    performance: clamp01(0.7 + (opts.status === "stable" ? 0.1 : 0) - opts.technicalDebt / 250),
    toolQuality: clamp01(0.4 + toolMods * 0.15),
    knownIssues:
      opts.status === "stable"
        ? []
        : ["Integration edge cases remain", "Docs incomplete"],
    technicalDebt: opts.technicalDebt,
    immutable: true,
    engineDefId: opts.versionId,
    features,
    designBonus,
    techBonus,
    cost: opts.cost,
    weeksToBuild: opts.weeksToBuild,
    custom: opts.custom,
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function startEngineBuild(opts: {
  workshop: EngineWorkshopState;
  name: string;
  purpose: EnginePurpose;
  secondaryPurposes?: EnginePurpose[];
  architecture: ArchitectureStyle;
  lifespan: TargetLifespan;
  priorities: Partial<Record<ArchitecturePriority, number>>;
  moduleIds: string[];
  targetPlatforms: string[];
  targetSizes: GameSize[];
  /** New family vs bump existing. */
  familyId?: string;
  bump?: "patch" | "minor" | "major";
  staff: import("../types").StaffMember[];
  week: number;
  year: number;
  companyId: string;
  cash: number;
}): { ok: true; workshop: EngineWorkshopState; cost: number; project: EngineBuildProject } | { ok: false; error: string } {
  if (opts.workshop.activeBuild) {
    return { ok: false, error: "Already building an engine version." };
  }

  const modules = resolveWithDependencies(
    opts.moduleIds.length ? opts.moduleIds : startingModuleIds(),
  );
  const missing = missingDependencies(modules);
  // resolveWithDependencies should clear missing — assert empty
  if (missing.length) {
    return { ok: false, error: `Missing dependencies: ${missing.join(", ")}` };
  }

  const conflicts = activeConflicts(modules);
  const priorities = clampPriorityPoints(opts.priorities);

  let family = opts.familyId
    ? opts.workshop.families.find((f) => f.familyId === opts.familyId)
    : undefined;

  let major = 1;
  let minor = 0;
  let patch = 0;
  let familyId = family?.familyId;

  if (family && opts.bump) {
    const latest = opts.workshop.versions
      .filter((v) => v.familyId === family!.familyId)
      .sort((a, b) => b.major - a.major || b.minor - a.minor || b.patch - a.patch)[0];
    if (latest) {
      if (opts.bump === "patch") {
        major = latest.major;
        minor = latest.minor;
        patch = latest.patch + 1;
      } else if (opts.bump === "minor") {
        major = latest.major;
        minor = latest.minor + 1;
        patch = 0;
      } else {
        major = latest.major + 1;
        minor = 0;
        patch = 0;
      }
    }
  } else if (!family) {
    familyId = uid("fam");
    family = {
      familyId,
      name: opts.name.trim() || "Studio Engine",
      ownerCompanyId: opts.companyId,
      createdWeek: opts.week,
      createdYear: opts.year,
      architectureGeneration: opts.architecture === "modular" || opts.architecture === "portable" ? 2 : 1,
      reputation: 5,
      sharedDebt: 0,
      licensedExternally: false,
      supportPolicy: "active",
      purpose: opts.purpose,
      secondaryPurposes: opts.secondaryPurposes ?? [],
      architecture: opts.architecture,
      lifespan: opts.lifespan,
      priorities,
    };
  } else {
    familyId = family.familyId;
    const latest = opts.workshop.versions
      .filter((v) => v.familyId === family!.familyId)
      .sort((a, b) => b.major - a.major || b.minor - a.minor || b.patch - a.patch)[0];
    major = latest ? latest.major : 1;
    minor = latest ? latest.minor + 1 : 0;
    patch = 0;
  }

  const famXp = opts.workshop.familyFamiliarity[familyId!] ?? 0;
  const { requiredWork } = computeRequiredEngineWork({
    purpose: opts.purpose,
    secondaryPurposes: opts.secondaryPurposes ?? [],
    architecture: opts.architecture,
    lifespan: opts.lifespan,
    moduleIds: modules,
    platformCount: Math.max(1, opts.targetPlatforms.length),
    targetSizes: opts.targetSizes.length ? opts.targetSizes : ["small"],
    technicalDebt: family?.sharedDebt ?? 0,
    priorFamilyExperience: famXp,
    novelty: opts.bump === "major" ? 1.35 : opts.bump === "minor" ? 1.1 : 1,
  });

  const toolQuality = modules.some((id) => moduleById(id)?.category === "tools") ? 0.7 : 0.4;
  const modXp =
    modules.reduce((s, id) => s + (opts.workshop.moduleFamiliarity[id] ?? 0.2), 0) /
    Math.max(1, modules.length);

  const weeklyCapacity = teamWeeklyEngineCapacity(opts.staff, [], {
    familyFamiliarity: famXp,
    moduleFamiliarity: modXp,
    toolQuality,
  });

  const weeksEstimate = estimateWeeks(requiredWork, weeklyCapacity);
  const cost = Math.round(
    12000 +
      modules.length * 4500 +
      (opts.secondaryPurposes?.length ?? 0) * 3000 +
      Math.max(0, opts.targetPlatforms.length - 1) * 2500 +
      (opts.bump === "major" ? 15000 : opts.bump === "minor" ? 6000 : 0),
  );

  if (opts.cash < cost) {
    return { ok: false, error: `Need $${cost.toLocaleString()} to start engine work.` };
  }

  const labelBase = (opts.name.trim() || family?.name || "Engine").replace(/\s+\d+(\.\d+)*$/, "");
  const project: EngineBuildProject = {
    projectId: uid("engproj"),
    familyId: familyId!,
    major,
    minor,
    patch,
    name: `${labelBase} ${major}.${minor}${patch ? `.${patch}` : ""}`,
    phase: "requirements",
    phaseProgress: 0,
    overallProgress: 0,
    selectedModuleIds: modules,
    targetPlatforms: opts.targetPlatforms.length ? opts.targetPlatforms : ["pc"],
    targetSizes: opts.targetSizes.length ? opts.targetSizes : ["small"],
    purpose: opts.purpose,
    secondaryPurposes: opts.secondaryPurposes ?? [],
    architecture: opts.architecture,
    lifespan: opts.lifespan,
    priorities,
    requiredWork,
    completedWork: 0,
    weeklyCapacity,
    technicalDebt: (family?.sharedDebt ?? 0) * 0.3 + conflicts.length * 8,
    costPaid: cost,
    weeksElapsed: 0,
    weeksEstimate,
    assignedStaffIds: [],
    blockers: [],
    missingDependencies: [],
    conflicts,
    startedWeek: opts.week,
  };

  const families = opts.workshop.families.some((f) => f.familyId === familyId)
    ? opts.workshop.families
    : [...opts.workshop.families, family!];

  return {
    ok: true,
    cost,
    project,
    workshop: {
      ...opts.workshop,
      families,
      activeBuild: project,
    },
  };
}

/** Apply one week of engine R&D. Returns released version when complete. */
export function tickEngineBuild(
  workshop: EngineWorkshopState,
  staff: import("../types").StaffMember[],
  week: number,
  year: number,
): {
  workshop: EngineWorkshopState;
  released?: EngineVersion;
  engineDef?: EngineDef;
  note?: string;
} {
  const build = workshop.activeBuild;
  if (!build) return { workshop };

  const famXp = workshop.familyFamiliarity[build.familyId] ?? 0.2;
  const modXp =
    build.selectedModuleIds.reduce((s, id) => s + (workshop.moduleFamiliarity[id] ?? 0.2), 0) /
    Math.max(1, build.selectedModuleIds.length);
  const toolQuality = build.selectedModuleIds.some((id) => moduleById(id)?.category === "tools")
    ? 0.75
    : 0.4;

  const capacity = teamWeeklyEngineCapacity(staff, build.assignedStaffIds, {
    familyFamiliarity: famXp,
    moduleFamiliarity: modXp,
    toolQuality,
  });

  // Architecture rush debt: low maintainability priority → debt accrual
  const maintPriority = build.priorities.maintainability ?? 1;
  const debtGain = maintPriority < 2 ? 1.5 : maintPriority < 3 ? 0.6 : 0.15;
  // Conflict work tax
  const conflictTax = 1 + build.conflicts.length * 0.04;

  const workDone = capacity / conflictTax;
  const completedWork = build.completedWork + workDone;
  const overallProgress = Math.min(1, completedWork / Math.max(1, build.requiredWork));
  const weeksElapsed = build.weeksElapsed + 1;

  // Phase by overall progress bands
  let phase = build.phase;
  if (overallProgress >= 1) phase = "stabilization";
  else if (overallProgress >= 0.88) phase = "stabilization";
  else if (overallProgress >= 0.75) phase = "integration";
  else if (overallProgress >= 0.62) phase = "platform_adapters";
  else if (overallProgress >= 0.5) phase = "content_tools";
  else if (overallProgress >= 0.32) phase = "primary_modules";
  else if (overallProgress >= 0.18) phase = "core_runtime";
  else if (overallProgress >= 0.08) phase = "architecture";
  else phase = "requirements";

  if (overallProgress >= 1 && weeksElapsed >= 2) {
    // Release immutable version
    const versionId = uid("eng");
    const version = finalizeVersionFromModules({
      versionId,
      familyId: build.familyId,
      major: build.major,
      minor: build.minor,
      patch: build.patch,
      label: build.name,
      modules: build.selectedModuleIds,
      platforms: build.targetPlatforms,
      sizes: build.targetSizes,
      week,
      year,
      status: build.technicalDebt > 45 ? "beta" : "stable",
      custom: true,
      technicalDebt: Math.round(build.technicalDebt + debtGain * weeksElapsed),
      cost: build.costPaid,
      weeksToBuild: weeksElapsed,
    });

    // Familiarity gains
    const familyFamiliarity = {
      ...workshop.familyFamiliarity,
      [build.familyId]: Math.min(1, famXp + 0.08),
    };
    const moduleFamiliarity = { ...workshop.moduleFamiliarity };
    for (const id of build.selectedModuleIds) {
      moduleFamiliarity[id] = Math.min(1, (moduleFamiliarity[id] ?? 0.2) + 0.05);
    }

    // Shared debt on family
    const families = workshop.families.map((f) =>
      f.familyId === build.familyId
        ? { ...f, sharedDebt: Math.round(f.sharedDebt * 0.85 + version.technicalDebt * 0.15), reputation: f.reputation + 3 }
        : f,
    );

    return {
      workshop: {
        ...workshop,
        families,
        versions: [...workshop.versions, version],
        activeBuild: null,
        familyFamiliarity,
        moduleFamiliarity,
      },
      released: version,
      engineDef: versionToEngineDef(version),
      note: `Engine "${version.label}" released (${version.status}). Version is now immutable.`,
    };
  }

  const updated: EngineBuildProject = {
    ...build,
    phase,
    phaseProgress: overallProgress,
    overallProgress,
    completedWork,
    weeklyCapacity: capacity,
    weeksElapsed,
    technicalDebt: build.technicalDebt + debtGain,
    weeksEstimate: estimateWeeks(build.requiredWork - completedWork, capacity) + weeksElapsed,
  };

  return {
    workshop: { ...workshop, activeBuild: updated },
  };
}

/** Migrate legacy engines[] into workshop if workshop empty. */
export function ensureWorkshopFromEngines(
  engines: EngineDef[],
  existing: EngineWorkshopState | null | undefined,
  companyId: string,
  week: number,
  year: number,
): EngineWorkshopState {
  if (existing && existing.versions.length > 0) return existing;
  if (!engines.length) {
    return createGarageWorkshop({ companyId, week, year }).workshop;
  }
  const garage = createGarageWorkshop({ companyId, week, year });
  const extra = engines.filter((e) => e.id !== "basic_engine" && e.id !== garage.engineDef.id);
  let workshop = garage.workshop;
  for (const e of extra) {
    const version = finalizeVersionFromModules({
      versionId: e.id,
      familyId: garage.workshop.families[0]!.familyId,
      major: 1,
      minor: workshop.versions.length,
      patch: 0,
      label: e.name,
      modules: startingModuleIds(),
      platforms: ["pc"],
      sizes: ["small", "medium"],
      week,
      year,
      status: "stable",
      custom: !!e.custom,
      technicalDebt: 12,
      cost: e.cost,
      weeksToBuild: e.weeks,
    });
    version.features = e.features.length ? e.features : version.features;
    version.designBonus = e.designBonus;
    version.techBonus = e.techBonus;
    workshop = {
      ...workshop,
      versions: [...workshop.versions, version],
    };
  }
  return workshop;
}
