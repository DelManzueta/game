/**
 * Foundation Lock — Garage Phase One authority.
 * Late systems stay dark; feature flags remain authoritative after Garage.
 */
import type { GameState } from "./types";
import { FEATURE_FLAGS, isFeatureEnabled, type FeatureFlagId } from "./progression/featureFlags";

/** Founder-only garage campaign (office tier 1). */
export function isGaragePhaseOne(state: Pick<GameState, "office">): boolean {
  return (state.office ?? 1) <= 1;
}

const SYSTEM_FLAG: Partial<Record<string, FeatureFlagId>> = {
  netflixEdition: "netflixEdition",
  streamerMarketing: "streamerMarketing",
  studioConventions: "studioConventions",
  digitalStorefront: "digitalStorefront",
  hardwareMerch: "hardwareMerch",
  playerConsoles: "endgameBusinesses",
  mmoLifecycle: "liveServices",
  qualityCrisisEvents: "qualityCrisisEvents",
  awardsG3: "endgameBusinesses",
  ipLitigation: "netflixEdition",
  highDensityBay: "techParkLabs",
  publishers: "officeFoundation", // still gated by garage separately
};

export type LateSystem =
  | "netflixEdition"
  | "streamerMarketing"
  | "studioConventions"
  | "digitalStorefront"
  | "hardwareMerch"
  | "playerConsoles"
  | "mmoLifecycle"
  | "qualityCrisisEvents"
  | "awardsG3"
  | "ipLitigation"
  | "highDensityBay"
  | "publishers";

/** Systems never active in Garage; after Garage still require feature flags. */
export function lateSystemAllowed(
  state: Pick<GameState, "office">,
  system: LateSystem,
): boolean {
  if (isGaragePhaseOne(state)) return false;
  const flag = SYSTEM_FLAG[system];
  if (flag && !isFeatureEnabled(flag)) return false;
  // publishers: office foundation only, still needs non-garage
  if (system === "publishers") return !isGaragePhaseOne(state);
  return true;
}

export const PHASE_ONE_MARKETING_PER_YEAR = 2;

export function marketingYearIndex(week: number, weeksPerYear = 48): number {
  return Math.floor(Math.max(0, week) / weeksPerYear);
}

void FEATURE_FLAGS;
