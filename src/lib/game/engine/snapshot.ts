/**
 * Game–engine snapshot: frozen at project start (Part 3 §2, invariant 7).
 */

import type { GameSize, GenreId, StaffMember } from "../types";
import { evaluateEngineSuitability, computeIntegrationHealth } from "./suitability";
import type {
  EngineFamily,
  EngineVersion,
  EngineWorkshopState,
  GameEngineSnapshot,
} from "./types";

export function captureGameEngineSnapshot(opts: {
  gameId: string;
  engineVersionId: string;
  workshop: EngineWorkshopState;
  genreId: GenreId;
  size: GameSize;
  platformId: string;
  staff: StaffMember[];
  week: number;
  year: number;
  wantsOnline?: boolean;
}): GameEngineSnapshot | null {
  const version = opts.workshop.versions.find((v) => v.versionId === opts.engineVersionId || v.engineDefId === opts.engineVersionId);
  if (!version) return null;
  const family = opts.workshop.families.find((f) => f.familyId === version.familyId);
  if (!family) return null;

  const famXp = opts.workshop.familyFamiliarity[family.familyId] ?? 0.3;
  const suitability = evaluateEngineSuitability({
    version,
    family,
    genreId: opts.genreId,
    size: opts.size,
    platformId: opts.platformId,
    staff: opts.staff,
    familyFamiliarity: famXp,
    wantsOnline: opts.wantsOnline,
  });

  const integrationHealth = computeIntegrationHealth({
    version,
    featureCompletion: 0.5,
    engineStageEffort: 50,
    debt: version.technicalDebt,
  });

  return {
    gameId: opts.gameId,
    engineVersionId: version.versionId,
    familyId: family.familyId,
    label: version.label,
    selectedModules: version.modules.map((m) => m.moduleId),
    platformAdapters: version.platformAdapters.map((a) => a.adapterId),
    gameSpecificChanges: [],
    integrationHealth,
    implementationCompletion: 0,
    runtimeProfile: version.performance,
    inheritedDebt: version.technicalDebt,
    newlyCreatedDebt: 0,
    suitability,
    capturedWeek: opts.week,
    capturedYear: opts.year,
  };
}

export function findVersion(
  workshop: EngineWorkshopState,
  engineId: string,
): EngineVersion | undefined {
  return workshop.versions.find((v) => v.versionId === engineId || v.engineDefId === engineId);
}

export function findFamily(
  workshop: EngineWorkshopState,
  familyId: string,
): EngineFamily | undefined {
  return workshop.families.find((f) => f.familyId === familyId);
}
