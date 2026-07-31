/**
 * Research Points sources — founder activity, release spike, passive market, employees.
 */
import type { GameSize, OfficeTier } from "../types";
import {
  MARKET_RP,
  FOUNDER_RP_PER_WEEK,
  EMPLOYEE_RP_PER_WEEK,
  releaseRpSpike,
} from "./config";

export type FounderActivity = "idle" | "developing" | "researching" | "reporting" | "contract";

export function founderActivityRp(activity: FounderActivity): number {
  switch (activity) {
    case "developing":
      return FOUNDER_RP_PER_WEEK.developing;
    case "researching":
      return FOUNDER_RP_PER_WEEK.researching;
    case "reporting":
      return FOUNDER_RP_PER_WEEK.reporting;
    case "contract":
      return FOUNDER_RP_PER_WEEK.contract;
    default:
      return 0;
  }
}

export function weeklyMarketRp(opts: {
  avgReview: number;
  size: GameSize;
  dormant: boolean;
  delisted: boolean;
}): number {
  if (opts.dormant || opts.delisted) return 0;
  const qualityFactor = Math.max(0.5, Math.min(1.4, opts.avgReview / 7));
  const sizeFactor = MARKET_RP.sizeFactor[opts.size] ?? 1;
  return MARKET_RP.base * qualityFactor * sizeFactor;
}

export function employeeWeeklyRp(opts: {
  office: OfficeTier;
  productionEmployeeCount: number;
}): number {
  const per = EMPLOYEE_RP_PER_WEEK[opts.office] ?? 0;
  // Cap seats by stage table; founder does not count as production employee for this pool
  return per * Math.max(0, opts.productionEmployeeCount);
}

export { releaseRpSpike };
