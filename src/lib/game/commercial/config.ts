/**
 * Commercial system constants — market potential, fans, RP, office, publishing.
 * Pure data; no React.
 */
import type { GameSize } from "../types";
import { WEEKS_PER_MONTH, WEEKS_PER_YEAR } from "../data";

/** First office gate (Garage → First Office). Bible §4.3. */
export const FIRST_OFFICE_GATE = {
  /** Campaign year 3 ≈ START_YEAR+2 (1979 → 1981) */
  minYear: 1981,
  minMonth: 10,
  minReleasedGames: 5,
  minFans: 1_000,
  minCashOnHand: 1_000_000,
  moveCost: 150_000,
  minRunwayWeeks: 26,
} as const;

/** Approximate week floor: 1981 M10 from START 1979. */
export function firstOfficeMinWeek(startYear = 1979): number {
  const years = FIRST_OFFICE_GATE.minYear - startYear;
  const months = FIRST_OFFICE_GATE.minMonth - 1;
  return years * WEEKS_PER_YEAR + months * WEEKS_PER_MONTH;
}

/** Fan awareness uses diminishing returns — not 1 fan = 1 sale. */
export function fanAwarenessBoost(fans: number): number {
  // soft log curve → ~0..0.35 contribution to awareness
  if (fans <= 0) return 0;
  return Math.min(0.35, Math.log10(1 + fans) / 20);
}

/** Launch demand floor from fans (units floor at week 1). */
export function fanLaunchFloor(fans: number): number {
  if (fans <= 0) return 0;
  // Diminishing: 500 fans ~ 40, 25k ~ 180, 1M ~ 420
  return Math.round(Math.min(500, 18 * Math.log10(1 + fans)));
}

/** Reference price by size (elasticity baseline). */
export const REFERENCE_PRICE: Record<GameSize, number> = {
  small: 25,
  medium: 40,
  large: 50,
  aaa: 60,
};

/** Studio revenue share when self-publishing. */
export const SELF_PUBLISH_SHARE = 0.7;

/** Publisher default royalty (studio keeps this fraction of unit revenue). */
export const DEFAULT_PUBLISHER_SHARE = 0.45;

/** Season length for publishing board refresh (days → weeks: 84 days / 7 = 12 weeks). */
export const PUBLISHING_SEASON_WEEKS = 12;
export const PUBLISHING_BOARD_SIZE = 3;
export const PUBLISHING_REFRESH_COST = 2000;

/** Publishing board unlock. */
export const PUBLISHING_UNLOCK = {
  minReleasedGames: 1,
  minFans: 500,
} as const;

/** Passive market RP once per market week while on sale / not dormant (learn-by-doing). */
export const MARKET_RP = {
  base: 0.55,
  sizeFactor: { small: 1.0, medium: 1.25, large: 1.5, aaa: 1.8 } as Record<GameSize, number>,
};

/**
 * Learn-by-doing: RP from activity outside pure SWU build grind.
 * Build still earns researchEarned on the project; this is extra studio learning.
 */
export const FOUNDER_RP_PER_WEEK = {
  developing: 0.12 * 7, // lighter on pure build — learn-by-doing covers the rest
  researching: 0.28 * 7,
  reporting: 0.22 * 7,
  contract: 0.18 * 7,
  /** Running studio ops: sales, platforms, inbox, office life */
  operations: 0.08 * 7,
  training: 0.2 * 7,
  licensing: 0.15 * 7,
} as const;

/** Release RP spike: max(2, round(avgReview × 1.5)). */
export function releaseRpSpike(avgReview: number): number {
  return Math.max(2, Math.round(avgReview * 1.5));
}

/** Employee production RP by office stage (production seats only). */
export const EMPLOYEE_RP_PER_WEEK: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0, // garage — founder learn-by-doing only
  2: 1.2,
  3: 2.2,
  4: 3.5,
  5: 4.5,
};

/** Max hired production employees (excludes founder). */
export const PRODUCTION_SEATS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0,
  2: 3,
  3: 4,
  4: 5,
  5: 5,
};

/** Sales phase by weeks on market vs shelf life. */
export type SalesPhase =
  | "pre_release"
  | "launch"
  | "growth"
  | "mature"
  | "long_tail"
  | "dormant"
  | "delisted";

/** Dormant when weekly units stay below floor for this many consecutive weeks. */
export const DORMANT_FLOOR_UNITS = 15;
export const DORMANT_STREAK_WEEKS = 10;

/** Quality demand curve: 9 >> 6, but 6 still sells with reach. */
export function qualityDemandFromReview(avgReview: number): number {
  const r = Math.max(1, Math.min(10, avgReview));
  // Soft power curve: 6→~0.48, 7.5→~0.68, 9→~0.90, 10→1.0
  return Math.pow(r / 10, 1.25);
}
