/**
 * Foundation Lock — Garage Phase One authority.
 * Late systems stay dark and must not tick while office is still Garage.
 */
import type { GameState } from "./types";
import { FEATURE_FLAGS, isFeatureEnabled } from "./progression/featureFlags";

/** Founder-only garage campaign (office tier 1). */
export function isGaragePhaseOne(state: Pick<GameState, "office">): boolean {
  return (state.office ?? 1) <= 1;
}

/** Systems that must not run or appear during Garage Phase One. */
export const PHASE_ONE_QUARANTINE = {
  netflixEdition: false,
  streamerMarketing: false,
  studioConventions: false,
  digitalStorefront: false,
  hardwareMerch: false,
  playerConsoles: false,
  mmoLifecycle: false,
  qualityCrisisEvents: false,
  awardsG3: false,
  ipLitigation: false,
  highDensityBay: false,
  /** Unlimited marketing spam — replaced by yearly opportunity cap. */
  unlimitedMarketing: false,
} as const;

export function lateSystemAllowed(
  state: Pick<GameState, "office">,
  system: keyof typeof PHASE_ONE_QUARANTINE,
): boolean {
  if (isGaragePhaseOne(state)) return false;
  if (system === "digitalStorefront" || system === "playerConsoles" || system === "mmoLifecycle") {
    return isFeatureEnabled("endgameBusinesses");
  }
  if (system === "hardwareMerch") {
    return isFeatureEnabled("endgameBusinesses") || isFeatureEnabled("techParkLabs");
  }
  void FEATURE_FLAGS;
  return !isGaragePhaseOne(state);
}

/** Max marketing campaign purchases per campaign year in Phase One. */
export const PHASE_ONE_MARKETING_PER_YEAR = 2;

export function marketingYearIndex(week: number, weeksPerYear = 48): number {
  return Math.floor(Math.max(0, week) / weeksPerYear);
}
