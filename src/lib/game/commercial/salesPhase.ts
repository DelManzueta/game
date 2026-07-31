/**
 * Commercial lifecycle phase for a released title.
 */
import type { SalesPhase } from "./config";
import { DORMANT_FLOOR_UNITS, DORMANT_STREAK_WEEKS } from "./config";

export function salesPhaseFor(opts: {
  weeksOnMarket: number;
  marketWeeks: number;
  onSale: boolean;
  delisted?: boolean;
  dormant?: boolean;
  lowSalesStreak?: number;
}): SalesPhase {
  if (opts.delisted) return "delisted";
  if (opts.dormant) return "dormant";
  if (!opts.onSale && (opts.lowSalesStreak ?? 0) >= DORMANT_STREAK_WEEKS) return "dormant";
  if (opts.weeksOnMarket <= 0) return "pre_release";
  if (opts.weeksOnMarket <= 2) return "launch";
  const t = opts.weeksOnMarket / Math.max(1, opts.marketWeeks);
  if (t < 0.25) return "growth";
  if (t < 0.55) return "mature";
  if (opts.onSale) return "long_tail";
  return "dormant";
}

export function updateLowSalesStreak(prev: number, units: number): number {
  if (units < DORMANT_FLOOR_UNITS) return prev + 1;
  return 0;
}

export function shouldBecomeDormant(streak: number, residualLeft: number): boolean {
  return residualLeft <= 0 || streak >= DORMANT_STREAK_WEEKS;
}

export type { SalesPhase };
