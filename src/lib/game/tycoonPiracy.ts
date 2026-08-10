/**
 * TYCOON-ENGINE Module 16 — Piracy & copy protection (v2.3.1 ops).
 * Module 15 — edge-case clamps (integer cash/fans, hist floor, bankruptcy halt).
 */

export const TYCOON_OPS_VERSION = "2.3.1" as const;

export type DrmTier =
  | "None"
  | "Basic Serial Crack Key"
  | "Server Digital Handshake"
  | "Always-Online Matrix DRM";

export const DRM_TIERS: {
  id: DrmTier;
  label: string;
  mitigation: number;
  rpUnlock: number;
  note: string;
}[] = [
  { id: "None", label: "No DRM", mitigation: 0, rpUnlock: 0, note: "Max piracy exposure" },
  {
    id: "Basic Serial Crack Key",
    label: "Serial keys",
    mitigation: 0.25,
    rpUnlock: 20,
    note: "Light protection",
  },
  {
    id: "Server Digital Handshake",
    label: "Online check",
    mitigation: 0.6,
    rpUnlock: 80,
    note: "Strong, mild friction",
  },
  {
    id: "Always-Online Matrix DRM",
    label: "Always-online",
    mitigation: 0.95,
    rpUnlock: 200,
    note: "Near-sealed; fan backlash",
  },
];

/** Module 16 — theft rate from fans + DRM. */
export function calculatePiracyLossRate(
  currentFans: number,
  selectedDrm: DrmTier,
  pirateModeEnabled: boolean,
): number {
  if (!pirateModeEnabled) {
    // Soft ambient piracy even without "pirate era" campaign flag
    const soft = Math.min(0.12, (currentFans / 500_000) * 0.08);
    const mit = DRM_TIERS.find((d) => d.id === selectedDrm)?.mitigation ?? 0;
    return Math.max(0.01, soft * (1 - mit));
  }
  const base = Math.min(0.65, (currentFans / 500_000) * 0.2);
  const mit = DRM_TIERS.find((d) => d.id === selectedDrm)?.mitigation ?? 0;
  return Math.max(0.02, base * (1 - mit));
}

export function processShipmentPiracy(opts: {
  originalUnits: number;
  drm: DrmTier;
  fans: number;
  pirateMode: boolean;
}): {
  legitUnits: number;
  lostUnits: number;
  theftRate: number;
  fanBacklash: number;
  note: string;
} {
  const theftRate = calculatePiracyLossRate(opts.fans, opts.drm, opts.pirateMode);
  const lostUnits = Math.floor(opts.originalUnits * theftRate);
  const legitUnits = Math.max(0, opts.originalUnits - lostUnits);
  let fanBacklash = 0;
  if (opts.drm === "Always-Online Matrix DRM") {
    fanBacklash = Math.floor(legitUnits * 0.05);
  }
  const note = `Piracy: −${lostUnits.toLocaleString()} units (${(theftRate * 100).toFixed(1)}% theft)${
    fanBacklash ? ` · DRM backlash −${fanBacklash.toLocaleString()} fans` : ""
  }.`;
  return { legitUnits, lostUnits, theftRate, fanBacklash, note };
}

// ── Module 15 edge cases ────────────────────────────────────────────────────

export const HISTORICAL_AVERAGE_FLOOR = 10.0;

export function clampHistoricalAverage(n: number): number {
  return Math.max(HISTORICAL_AVERAGE_FLOOR, n);
}

/** Whole dollars for ledger views (no fractional cents). */
export function intCash(n: number): number {
  return Math.round(n);
}

export function intFans(n: number): number {
  return Math.max(0, Math.floor(n));
}

export function isBankrupt(cash: number, disableBankruptcy: boolean): boolean {
  if (disableBankruptcy) return false;
  return cash < 0;
}
