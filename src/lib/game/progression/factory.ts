/**
 * Fresh StudioProgressionState + migration from legacy saves.
 */
import { FEATURE_FLAGS } from "./featureFlags";
import { campaignConfigFor } from "./campaign";
import { buildHqSeats } from "./seats";
import { studioTierFromLegacyOffice } from "./offices";
import {
  PROGRESSION_SCHEMA_VERSION,
  type CampaignMode,
  type StudioProgressionState,
} from "./types";

export function createStudioProgression(
  mode: CampaignMode = "classic_35",
): StudioProgressionState {
  return {
    schemaVersion: PROGRESSION_SCHEMA_VERSION,
    campaign: campaignConfigFor(mode),
    studioTier: 1,
    tenureWeeks: 0,
    techParkTenureWeeks: 0,
    hqSeats: buildHqSeats(1),
    offers: {},
    activeMove: null,
    flags: { ...FEATURE_FLAGS },
  };
}

/** Migrate legacy GameState.office → progression blob. */
export function migrateStudioProgression(
  raw: unknown,
  legacyOffice = 1,
): StudioProgressionState {
  if (raw && typeof raw === "object" && (raw as StudioProgressionState).schemaVersion) {
    const p = raw as StudioProgressionState;
    return {
      ...createStudioProgression(p.campaign?.mode ?? "classic_35"),
      ...p,
      schemaVersion: PROGRESSION_SCHEMA_VERSION,
      hqSeats: p.hqSeats?.length ? p.hqSeats : buildHqSeats(p.studioTier ?? 1),
      offers: p.offers ?? {},
      flags: { ...FEATURE_FLAGS, ...(p.flags ?? {}) },
    };
  }
  const tier = studioTierFromLegacyOffice(legacyOffice);
  const base = createStudioProgression("classic_35");
  return {
    ...base,
    studioTier: tier,
    hqSeats: buildHqSeats(tier),
    // If already past garage, mark first office completed
    offers:
      tier >= 2
        ? {
            first_office: {
              offerId: "first_office",
              state: "completed",
              moveCost: 150_000,
              liquidCashGate: 1_000_000,
              weeklyOverheadAfter: 2_000,
              hqSeatsAfter: 4,
              constructionWeeks: 2,
              minRunwayWeeks: 26,
              discoveredWeek: 0,
              offeredWeek: 0,
              acceptedWeek: 0,
              completedWeek: 0,
            },
          }
        : {},
  };
}
