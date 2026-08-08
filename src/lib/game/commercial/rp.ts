/**
 * Research Points — learn-by-doing + market + employees.
 * Build grind still contributes via project.researchEarned; this module awards
 * RP from everything *around* production.
 */
import type { GameSize, GameState, OfficeTier } from "../types";
import {
  MARKET_RP,
  FOUNDER_RP_PER_WEEK,
  EMPLOYEE_RP_PER_WEEK,
  releaseRpSpike,
} from "./config";

export type FounderActivity =
  | "idle"
  | "developing"
  | "researching"
  | "reporting"
  | "contract"
  | "training"
  | "operations";

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
    case "training":
      return FOUNDER_RP_PER_WEEK.training;
    case "operations":
      return FOUNDER_RP_PER_WEEK.operations;
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
  return per * Math.max(0, opts.productionEmployeeCount);
}

/** Sum learn-by-doing RP for one in-game week. */
export function computeWeeklyLearnByDoing(state: GameState): number {
  let rp = 0;

  // Studio operations always — living company, not menus
  rp += founderActivityRp("operations");

  // Active production (light — main build also accrues researchEarned)
  if (state.currentProject && state.currentProject.devPhase.includes("RUNNING")) {
    rp += founderActivityRp("developing");
  } else if (state.currentProject?.devPhase === "POLISHING") {
    rp += founderActivityRp("developing") * 0.7;
  }

  // Research job
  if (state.activeResearch) {
    rp += founderActivityRp("researching");
  }

  // Contracts
  if ((state.contracts ?? []).some((c) => (c as { active?: boolean }).active || (c as { progress?: number }).progress)) {
    rp += founderActivityRp("contract");
  }

  // Training
  if (state.staff.some((m) => m.training && m.training.weeksLeft > 0)) {
    rp += founderActivityRp("training");
  }

  // Employees (not founder)
  const hired = state.staff.filter((m) => m.id !== "founder").length;
  const office = Math.min(5, Math.max(1, state.office)) as OfficeTier;
  rp += employeeWeeklyRp({ office, productionEmployeeCount: hired });

  // Passive market learning from titles still selling
  for (const g of state.activeSales ?? []) {
    if (!g.onSale) continue;
    rp += weeklyMarketRp({
      avgReview: g.avgReview ?? 5,
      size: g.size,
      dormant: Boolean(g.dormant),
      delisted: Boolean(g.delisted),
    });
  }

  return rp;
}

/** Flush fractional RP into whole points. */
export function flushResearchPoints(state: {
  researchPoints: number;
  researchPointsFrac?: number;
}): { researchPoints: number; researchPointsFrac: number; gained: number } {
  let whole = state.researchPoints;
  let frac = state.researchPointsFrac ?? 0;
  const before = whole;
  while (frac >= 1) {
    whole += 1;
    frac -= 1;
  }
  return { researchPoints: whole, researchPointsFrac: frac, gained: whole - before };
}

export { releaseRpSpike };
