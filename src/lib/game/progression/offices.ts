/**
 * Data-driven office ladder — bible §2.
 * Capacity numbers are TOTAL HQ seats including the founder.
 */
import type { OfficeDefinition, StudioTierId, TransitionGate } from "./types";

export const OFFICE_DEFINITIONS: Record<StudioTierId, OfficeDefinition> = {
  1: {
    tier: 1,
    id: "garage",
    name: "Founder Garage",
    hqSeatsTotal: 1,
    remoteLabSlots: { rnd: 0, hardware: 0 },
    weeklyOverhead: 0,
    primaryProjects: 1,
    backgroundKey: "garage",
  },
  2: {
    tier: 2,
    id: "first_office",
    name: "First Office",
    hqSeatsTotal: 4, // founder + 3 production
    remoteLabSlots: { rnd: 0, hardware: 0 },
    weeklyOverhead: 2_000,
    primaryProjects: 1,
    backgroundKey: "office",
  },
  3: {
    tier: 3,
    id: "upgraded_office",
    name: "Upgraded Office",
    hqSeatsTotal: 5, // founder + 4 production
    remoteLabSlots: { rnd: 0, hardware: 0 },
    weeklyOverhead: 5_000,
    primaryProjects: 1,
    backgroundKey: "studio",
  },
  4: {
    tier: 4,
    id: "tech_park",
    name: "Technology Park",
    hqSeatsTotal: 6, // founder + 5 production
    remoteLabSlots: { rnd: 2, hardware: 2 },
    weeklyOverhead: 15_000,
    primaryProjects: 1,
    backgroundKey: "empire",
  },
  5: {
    tier: 5,
    id: "expanded_campus",
    name: "Expanded Technology Campus",
    hqSeatsTotal: 8, // founder + 5 + R&D Director + Hardware Director
    remoteLabSlots: { rnd: 4, hardware: 4 },
    weeklyOverhead: 40_000,
    primaryProjects: 1,
    backgroundKey: "empire",
  },
};

/** Bible §4.3 default progression values (initial tuning). */
export const TRANSITIONS: TransitionGate[] = [
  {
    fromTier: 1,
    toTier: 2,
    offerId: "first_office",
    proofIds: [
      "releases_5",
      "fans_1000",
      "profitable_title",
      "trailing_ocf_13w",
      "earliest_y3",
    ],
    liquidCashGate: 1_000_000,
    moveCost: 150_000,
    minTenureWeeks: 0,
    earliestCampaignYear: 3,
    minRunwayWeeks: 26,
    constructionWeeks: 2,
  },
  {
    fromTier: 2,
    toTier: 3,
    offerId: "upgraded_office",
    proofIds: ["hq_full", "releases_since_move_4", "cohesion_70", "mgmt_fundamentals"],
    liquidCashGate: 5_000_000,
    moveCost: 500_000,
    minTenureWeeks: 52,
    earliestCampaignYear: 8,
    minRunwayWeeks: 39,
    constructionWeeks: 4,
  },
  {
    fromTier: 3,
    toTier: 4,
    offerId: "tech_park",
    proofIds: ["hq_full", "releases_12", "medium_profit_3", "discipline_specialist", "profit_52w"],
    liquidCashGate: 16_000_000,
    moveCost: 8_000_000,
    minTenureWeeks: 104,
    earliestCampaignYear: 13,
    minRunwayWeeks: 52,
    constructionWeeks: 8,
  },
  {
    fromTier: 4,
    toTier: 5,
    offerId: "expanded_campus",
    proofIds: ["no_insolvency", "no_lab_debt", "tech_park_12y"],
    liquidCashGate: 100_000_000,
    moveCost: 50_000_000,
    minTenureWeeks: 12 * 48, // 12 campaign years
    earliestCampaignYear: 1, // gated only by 12y tenure + cash
    minRunwayWeeks: 104,
    constructionWeeks: 12,
  },
];

export function officeDef(tier: StudioTierId): OfficeDefinition {
  return OFFICE_DEFINITIONS[tier];
}

export function transitionFor(from: StudioTierId): TransitionGate | undefined {
  return TRANSITIONS.find((t) => t.fromTier === from);
}

/** Map bible studio tier → legacy office field used by existing sim (1–4). */
export function legacyOfficeFromTier(tier: StudioTierId): 1 | 2 | 3 | 4 {
  if (tier <= 1) return 1;
  if (tier === 2) return 2;
  if (tier === 3) return 3;
  return 4; // tech park + campus share late-game office art until campus art split
}

export function studioTierFromLegacyOffice(office: number): StudioTierId {
  if (office <= 1) return 1;
  if (office === 2) return 2;
  if (office === 3) return 3;
  return 4;
}
