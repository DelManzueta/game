/**
 * Progression domain types — Full Campaign Progression Bible.
 * Total HQ seats: 1 → 4 → 5 → 6 → 8 (founder included).
 */

export type CampaignMode = "classic_35" | "legacy_50";

/** Bible studio tiers (not legacy office 1–4 shorthand alone). */
export type StudioTierId = 1 | 2 | 3 | 4 | 5;

export type ProgressionOfferState =
  | "hidden"
  | "discovered"
  | "eligible"
  | "offered"
  | "accepted"
  | "completed"
  | "deferred";

export type OfferId = "first_office" | "upgraded_office" | "tech_park" | "expanded_campus";

export interface CampaignConfig {
  mode: CampaignMode;
  /** Scored campaign length in campaign years. */
  campaignYears: number;
  /** Authored industry end year before score. */
  industryEndYear: number;
  /** Simulation start industry year. */
  industryStartYear: number;
}

export interface HqSeat {
  index: number;
  /** Founder seat is never a hired employee. */
  kind: "founder" | "production" | "rnd_director" | "hardware_director";
  /** Employee id when filled (never "founder" as employee id reuse for energy). */
  occupantId: string | null;
  roleLocked: boolean;
}

export interface OfficeDefinition {
  tier: StudioTierId;
  id: string;
  name: string;
  /** Total HQ seats including founder. */
  hqSeatsTotal: number;
  /** Remote lab slots (R&D / Hardware) — 0 until Tech Park. */
  remoteLabSlots: { rnd: number; hardware: number };
  /** Weekly fixed overhead (rent/ops). */
  weeklyOverhead: number;
  /** Normal concurrent primary game projects. */
  primaryProjects: number;
  backgroundKey: string;
}

export interface TransitionGate {
  fromTier: StudioTierId;
  toTier: StudioTierId;
  offerId: OfferId;
  /** Non-financial capability checks (ids resolved in offers.ts). */
  proofIds: string[];
  liquidCashGate: number;
  moveCost: number;
  /** Minimum weeks spent in fromTier before offer can open. */
  minTenureWeeks: number;
  /** Earliest campaign year (1-based) for offer window open. */
  earliestCampaignYear: number;
  /** Minimum runway weeks after move (bible §4.2). */
  minRunwayWeeks: number;
  constructionWeeks: number;
}

export interface OfficeOfferRecord {
  offerId: OfferId;
  state: ProgressionOfferState;
  /** Frozen snapshot when first offered — does not reroll. */
  moveCost: number;
  liquidCashGate: number;
  weeklyOverheadAfter: number;
  hqSeatsAfter: number;
  constructionWeeks: number;
  minRunwayWeeks: number;
  discoveredWeek: number | null;
  offeredWeek: number | null;
  /** Weeks when a deferred reminder was shown (max 2 per campaign year). */
  reminderWeeks?: number[];
  acceptedWeek: number | null;
  completedWeek: number | null;
}

export interface MoveTransaction {
  offerId: OfferId;
  fromTier: StudioTierId;
  toTier: StudioTierId;
  status: "reserved" | "constructing" | "completed" | "cancelled";
  costPaid: number;
  startedWeek: number;
  completesWeek: number;
}

export interface StudioProgressionState {
  schemaVersion: number;
  campaign: CampaignConfig;
  /** Authoritative studio tier (1 garage … 5 campus). */
  studioTier: StudioTierId;
  /** Weeks spent at current tier (for tenure gates). */
  tenureWeeks: number;
  /** Weeks spent specifically at Technology Park (tier 4) for 12-year campus gate. */
  techParkTenureWeeks: number;
  hqSeats: HqSeat[];
  offers: Partial<Record<OfferId, OfficeOfferRecord>>;
  activeMove: MoveTransaction | null;
  /** Feature flags snapshot at campaign start (for save stability). */
  flags: Record<string, boolean>;
}

export const PROGRESSION_SCHEMA_VERSION = 1;
