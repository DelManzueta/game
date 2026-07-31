/**
 * Sequel timing, engine, and fan-awareness modifiers.
 * Quality and commercial both use light, bounded multipliers — no double-punish stack.
 */
import type { EngineDef, ReleasedGame } from "../types";

export type SequelTimingBand = "proper" | "early" | "premature";

export type SequelModifiers = {
  gapWeeks: number;
  timingBand: SequelTimingBand;
  sameEngine: boolean;
  newerEngine: boolean;
  /** Multiplier for quality / commercial (0.88–1.12). */
  timingEngineMult: number;
  /** Awareness mult from original fans only (does not raise quality). */
  fanAwarenessMult: number;
  /** Series reputation delta after this sequel ships (applied by store). */
  seriesRepHint: number;
  explain: string;
};

/** Spec: gap weeks between original release and sequel start/release. */
export function sequelGapWeeks(
  originalReleaseWeek: number,
  sequelWeek: number,
): number {
  return Math.max(0, sequelWeek - originalReleaseWeek);
}

export function classifySequelTiming(gapWeeks: number): SequelTimingBand {
  if (gapWeeks >= 40) return "proper";
  if (gapWeeks >= 20) return "early";
  return "premature";
}

/**
 * 40+ & newer engine → 1.12
 * 40+ & same engine → 1.05
 * 20–39 → 0.97
 * <20 → 0.88
 */
export function sequelTimingEngineMult(opts: {
  gapWeeks: number;
  sameEngine: boolean;
  newerEngine: boolean;
}): number {
  const band = classifySequelTiming(opts.gapWeeks);
  if (band === "proper") {
    if (opts.newerEngine && !opts.sameEngine) return 1.12;
    return 1.05;
  }
  if (band === "early") return 0.97;
  return 0.88;
}

/** Original fans increase sequel awareness only. */
export function sequelFanAwarenessMult(originalFansGained: number): number {
  return 1 + Math.min(0.25, Math.max(0, originalFansGained) / 40_000);
}

export function compareEngines(
  previousEngineId: string,
  currentEngineId: string,
  engines: EngineDef[],
): { sameEngine: boolean; newerEngine: boolean } {
  if (previousEngineId === currentEngineId) {
    return { sameEngine: true, newerEngine: false };
  }
  const prev = engines.find((e) => e.id === previousEngineId);
  const cur = engines.find((e) => e.id === currentEngineId);
  if (!prev || !cur) {
    return { sameEngine: false, newerEngine: previousEngineId !== currentEngineId };
  }
  const prevPower = prev.techBonus + prev.designBonus + (prev.features?.length ?? 0);
  const curPower = cur.techBonus + cur.designBonus + (cur.features?.length ?? 0);
  return {
    sameEngine: false,
    newerEngine: curPower > prevPower,
  };
}

export function computeSequelModifiers(opts: {
  original: ReleasedGame;
  sequelEngineId: string;
  engines: EngineDef[];
  sequelWeek: number;
}): SequelModifiers {
  const gapWeeks = sequelGapWeeks(opts.original.weekReleased, opts.sequelWeek);
  const eng = compareEngines(opts.original.engineId, opts.sequelEngineId, opts.engines);
  const timingEngineMult = sequelTimingEngineMult({
    gapWeeks,
    sameEngine: eng.sameEngine,
    newerEngine: eng.newerEngine,
  });
  const fanAwarenessMult = sequelFanAwarenessMult(
    opts.original.fansGained + (opts.original.fanBaseAtLaunch ?? 0) * 0.02,
  );
  const band = classifySequelTiming(gapWeeks);
  let seriesRepHint = 0;
  if (band === "proper") seriesRepHint = eng.newerEngine ? 8 : 4;
  else if (band === "early") seriesRepHint = -2;
  else seriesRepHint = -8;

  const engLabel = eng.sameEngine
    ? "same engine"
    : eng.newerEngine
      ? "newer engine"
      : "different engine";
  return {
    gapWeeks,
    timingBand: band,
    sameEngine: eng.sameEngine,
    newerEngine: eng.newerEngine,
    timingEngineMult,
    fanAwarenessMult,
    seriesRepHint,
    explain: `Sequel after ${gapWeeks} weeks (${band}, ${engLabel}) → quality/sales ×${timingEngineMult.toFixed(2)}; fan awareness ×${fanAwarenessMult.toFixed(2)}.`,
  };
}

export type SeriesRecord = {
  seriesId: string;
  rootGameId: string;
  titleStem: string;
  reputation: number; // 0–100
  releaseCount: number;
  lastReleaseWeek: number;
  lastAvgReview: number;
};

export function seriesIdFromRoot(rootGameId: string): string {
  return `series_${rootGameId}`;
}

export function applySeriesReputation(
  series: SeriesRecord | undefined,
  opts: {
    seriesId: string;
    rootGameId: string;
    titleStem: string;
    week: number;
    avgReview: number;
    repDelta: number;
  },
): SeriesRecord {
  const base: SeriesRecord = series ?? {
    seriesId: opts.seriesId,
    rootGameId: opts.rootGameId,
    titleStem: opts.titleStem,
    reputation: 50,
    releaseCount: 0,
    lastReleaseWeek: 0,
    lastAvgReview: 0,
  };
  const reviewNudge = (opts.avgReview - 6) * 3;
  return {
    ...base,
    reputation: Math.max(0, Math.min(100, base.reputation + opts.repDelta + reviewNudge)),
    releaseCount: base.releaseCount + 1,
    lastReleaseWeek: opts.week,
    lastAvgReview: opts.avgReview,
  };
}

/** Cancelled / missing original cannot start a sequel. */
export function canStartSequelFrom(original: ReleasedGame | undefined | null): string | null {
  if (!original) return "Original game not found.";
  if (original.delisted && (original as { cancelled?: boolean }).cancelled) {
    return "Cannot sequel a cancelled project.";
  }
  return null;
}
