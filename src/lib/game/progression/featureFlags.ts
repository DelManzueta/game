/**
 * Checkpoint feature flags — later systems stay dark until their checkpoint.
 * UI and domain must check these before exposing distant systems.
 * Authoritative: Studio Empire Full Campaign Progression Bible §37.
 */
export const FEATURE_FLAGS = {
  /** Checkpoint 0 — existing garage loop (always on). */
  garage: true,
  /** Checkpoint 1 — office ladder + offer/move (this build). */
  officeFoundation: true,
  /** Checkpoint 2 — hiring, energy, payroll, cohesion. */
  firstOfficeEmployees: false,
  /** Checkpoint 3 — upgraded office + training center. */
  upgradedOffice: false,
  /** Checkpoint 4 — technology park + labs. */
  techParkLabs: false,
  /** Checkpoint 5 — AAA production class. */
  aaa: false,
  /** Checkpoint 6 — MMO / live services. */
  liveServices: false,
  /** Checkpoint 7 — expanded campus + directors. */
  campusDirectors: false,
  /** Checkpoint 8 — subscriptions, storefront, hardware ecosystem. */
  endgameBusinesses: false,
  /** Checkpoint 9 — 2030–2050 + Endless. */
  futureEndless: false,
  /** Checkpoint 10 — final vertical UX. */
  verticalUxPass: false,
  /** Quarantined until post–Phase One (Foundation Lock). */
  netflixEdition: false,
  streamerMarketing: false,
  studioConventions: false,
  digitalStorefront: false,
  hardwareMerch: false,
  qualityCrisisEvents: false,
} as const;

export type FeatureFlagId = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(id: FeatureFlagId): boolean {
  return FEATURE_FLAGS[id] === true;
}
