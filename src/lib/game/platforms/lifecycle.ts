/**
 * ALGORITHM 3 — Platform lifecycle as markets.
 * Does not hardcode catalog — maps from canonical PlatformDef.
 * Platforms are never deleted; legacy remains.
 */
import { clamp } from "../determinism";
import type { PlatformDef } from "../types";
import { PLATFORMS, getPlatform } from "../data";
import { START_YEAR, WEEKS_PER_YEAR } from "../data";

export const PLATFORM_PRELAUNCH = "prelaunch";
export const PLATFORM_ACTIVE = "active";
export const PLATFORM_LEGACY = "legacy";

export type PlatformSpec = {
  platformId: string;
  name: string;
  launchDay: number;
  peakDay: number;
  retirementDay: number | null;
  launchInstalledBase: number;
  peakInstalledBase: number;
  legacyFloor: number;
  declineHalfLifeDays: number;
  platformFeeRate: number;
  marketSizeMultiplier: number;
  audienceMultipliers: Record<string, number>;
  legacyReleaseAllowed: boolean;
  sunsetDay: number | null;
  unlockGateId: string | null;
};

export type PlatformMarketState = {
  platformId: string;
  day: number;
  lifecycle: typeof PLATFORM_PRELAUNCH | typeof PLATFORM_ACTIVE | typeof PLATFORM_LEGACY;
  marketAvailable: boolean;
  canRelease: boolean;
  isLegacy: boolean;
  installedBase: number;
  lifecycleFactor: number;
  marketCapacity: number;
  audienceDemand: number;
  platformFeeRate: number;
};

/** Campaign day from week (week 0 = day 0). */
export function weekToCampaignDay(week: number): number {
  return Math.max(0, week) * 7;
}

export function yearToLaunchDay(year: number, startYear = START_YEAR): number {
  return Math.max(0, year - startYear) * WEEKS_PER_YEAR * 7;
}

/**
 * Derive PlatformSpec from canonical catalog entry.
 * Peak ~4 years after launch; retirement ~12 years; half-life ~5 years.
 */
export function platformSpecFromDef(p: PlatformDef, startYear = START_YEAR): PlatformSpec {
  const launchDay = yearToLaunchDay(p.year, startYear);
  const peakDay = launchDay + 4 * WEEKS_PER_YEAR * 7;
  const retirementDay = launchDay + 12 * WEEKS_PER_YEAR * 7;
  const peakBase = Math.round(80_000 + p.marketSize * 220_000);
  const launchBase = Math.round(peakBase * 0.18);
  const legacyFloor = Math.round(peakBase * 0.08);

  const audienceMultipliers: Record<string, number> = {};
  if (p.audienceAffinity) {
    for (const [k, v] of Object.entries(p.audienceAffinity)) {
      const map: Record<string, number> = {
        great: 1.1,
        good: 1.0,
        ok: 0.85,
        poor: 0.65,
        bad: 0.45,
      };
      audienceMultipliers[k] = map[v] ?? 1;
    }
  }

  return {
    platformId: p.id,
    name: p.name,
    launchDay,
    peakDay,
    retirementDay,
    launchInstalledBase: launchBase,
    peakInstalledBase: peakBase,
    legacyFloor,
    declineHalfLifeDays: 5 * WEEKS_PER_YEAR * 7,
    platformFeeRate: p.licenseCost > 0 ? 0.3 : 0.25,
    marketSizeMultiplier: Math.max(0.4, p.marketSize),
    audienceMultipliers,
    legacyReleaseAllowed: true,
    sunsetDay: null,
    unlockGateId: p.startUnlocked ? null : `platform_${p.id}`,
  };
}

export function validatePlatformSpec(spec: PlatformSpec): void {
  if (spec.peakDay <= spec.launchDay) throw new Error("Peak day must occur after launch day.");
  if (spec.retirementDay != null && spec.retirementDay < spec.peakDay) {
    throw new Error("Retirement day cannot occur before platform peak.");
  }
  if (spec.sunsetDay != null && spec.retirementDay != null && spec.sunsetDay < spec.retirementDay) {
    throw new Error("Sunset day cannot occur before retirement.");
  }
  if (spec.launchInstalledBase < 0) throw new Error("Launch installed base cannot be negative.");
  if (spec.peakInstalledBase < spec.launchInstalledBase) {
    throw new Error("Peak installed base cannot be below launch installed base.");
  }
  if (spec.legacyFloor < 0) throw new Error("Legacy floor cannot be negative.");
  if (spec.legacyFloor > spec.peakInstalledBase) {
    throw new Error("Legacy floor cannot exceed peak installed base.");
  }
  if (spec.declineHalfLifeDays <= 0) throw new Error("Decline half-life must be positive.");
  if (spec.platformFeeRate < 0 || spec.platformFeeRate > 1) {
    throw new Error("Platform fee rate must be between 0 and 1.");
  }
}

function smoothstep(value: number): number {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

export function platformMarketState(
  spec: PlatformSpec,
  opts: { day: number; audienceId?: string | null },
): PlatformMarketState {
  validatePlatformSpec(spec);
  const day = opts.day;

  if (day < spec.launchDay) {
    return {
      platformId: spec.platformId,
      day,
      lifecycle: PLATFORM_PRELAUNCH,
      marketAvailable: false,
      canRelease: false,
      isLegacy: false,
      installedBase: 0,
      lifecycleFactor: 0,
      marketCapacity: 0,
      audienceDemand: 0,
      platformFeeRate: spec.platformFeeRate,
    };
  }

  let installedBase: number;
  if (day <= spec.peakDay) {
    const elapsed = day - spec.launchDay;
    const duration = Math.max(1, spec.peakDay - spec.launchDay);
    const growthRatio = smoothstep(elapsed / duration);
    installedBase = Math.round(
      spec.launchInstalledBase +
        (spec.peakInstalledBase - spec.launchInstalledBase) * growthRatio,
    );
  } else {
    const daysAfterPeak = day - spec.peakDay;
    const declineFactor = Math.exp(
      (-Math.log(2) * daysAfterPeak) / spec.declineHalfLifeDays,
    );
    installedBase = Math.round(
      spec.legacyFloor +
        (spec.peakInstalledBase - spec.legacyFloor) * declineFactor,
    );
  }

  if (spec.sunsetDay != null && day >= spec.sunsetDay) installedBase = 0;
  installedBase = Math.max(0, installedBase);

  const retired = spec.retirementDay != null && day >= spec.retirementDay;
  const lifecycle = retired ? PLATFORM_LEGACY : PLATFORM_ACTIVE;
  const lifecycleFactor = clamp(installedBase / Math.max(spec.peakInstalledBase, 1), 0, 1);

  let audienceDemand = 1;
  if (opts.audienceId) {
    audienceDemand = clamp(spec.audienceMultipliers[opts.audienceId] ?? 1, 0, 1.2);
  }

  const canRelease =
    installedBase > 0 && (!retired || spec.legacyReleaseAllowed);

  return {
    platformId: spec.platformId,
    day,
    lifecycle,
    marketAvailable: true,
    canRelease,
    isLegacy: retired,
    installedBase,
    lifecycleFactor,
    marketCapacity: installedBase * Math.max(0, spec.marketSizeMultiplier),
    audienceDemand,
    platformFeeRate: spec.platformFeeRate,
  };
}

export function canSelectPlatform(
  market: PlatformMarketState,
  progressionGateUnlocked: boolean,
): boolean {
  return progressionGateUnlocked && market.marketAvailable && market.canRelease;
}

export function getPlatformSpec(platformId: string): PlatformSpec {
  const def = getPlatform(platformId) ?? PLATFORMS[0]!;
  return platformSpecFromDef(def);
}

export function allPlatformSpecs(): PlatformSpec[] {
  return PLATFORMS.map((p) => platformSpecFromDef(p));
}

/** Snapshot frozen into weekly sales / released game. */
export type PlatformWeekSnapshot = {
  platformId: string;
  day: number;
  installedBase: number;
  lifecycleFactor: number;
  lifecycle: string;
  marketCapacity: number;
  audienceDemand: number;
  platformFeeRate: number;
  isLegacy: boolean;
};

export function snapshotPlatformWeek(
  market: PlatformMarketState,
): PlatformWeekSnapshot {
  return {
    platformId: market.platformId,
    day: market.day,
    installedBase: market.installedBase,
    lifecycleFactor: market.lifecycleFactor,
    lifecycle: market.lifecycle,
    marketCapacity: market.marketCapacity,
    audienceDemand: market.audienceDemand,
    platformFeeRate: market.platformFeeRate,
    isLegacy: market.isLegacy,
  };
}
