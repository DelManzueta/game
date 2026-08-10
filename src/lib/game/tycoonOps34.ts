/**
 * Modules 20–22 — Studio Empire ops matrix v3.4
 * Burnout · Publisher contracts · Tech debt
 */

export const OPS_VERSION = "3.4.0" as const;

// ── Module 20: Burnout ──────────────────────────────────────────────────────

export type StaffWorkStatus = "Active" | "Vacation";

export const FATIGUE = {
  crunch: 12,
  standard: 3,
  vacation: -20,
  max: 100,
} as const;

export function weeklyFatigueDelta(opts: {
  status: StaffWorkStatus;
  crunchActive: boolean;
}): number {
  if (opts.status === "Vacation") return FATIGUE.vacation;
  return opts.crunchActive ? FATIGUE.crunch : FATIGUE.standard;
}

export function applyWeeklyFatigue(opts: {
  fatigue: number;
  status: StaffWorkStatus;
  crunchActive: boolean;
  name?: string;
}): { fatigue: number; status: StaffWorkStatus; note?: string } {
  let fatigue = opts.fatigue;
  let status = opts.status;
  let note: string | undefined;

  if (status === "Vacation") {
    fatigue = Math.max(0, fatigue + FATIGUE.vacation);
    if (fatigue === 0) {
      status = "Active";
      note = `[STAFF RECOVERY] ${opts.name ?? "Worker"} cleared burnout and returned.`;
    }
  } else {
    const strain = opts.crunchActive ? FATIGUE.crunch : FATIGUE.standard;
    fatigue = Math.min(FATIGUE.max, fatigue + strain);
    if (fatigue >= FATIGUE.max) {
      status = "Vacation";
      note = `[EXHAUSTION] ${opts.name ?? "Worker"} forced into paid vacation.`;
    }
  }
  return { fatigue, status, note };
}

/** Output modifier from fatigue/status. */
export function weeklyOutputModifier(opts: {
  status: StaffWorkStatus;
  fatigue: number;
}): number {
  if (opts.status === "Vacation") return 0;
  if (opts.fatigue > 75) return 0.45;
  if (opts.fatigue > 40) return 0.8;
  return 1;
}

// ── Module 21: Publishers ───────────────────────────────────────────────────

export type PublisherOffer = {
  id: string;
  company: string;
  minFans: number;
  reqScore: number;
  advancePay: number;
  royaltyCut: number; // studio share of gross when successful
};

/** Canonical houses (original fiction names where needed). */
export const PUBLISHER_MATRIX: PublisherOffer[] = [
  {
    id: "vina_games",
    company: "Vina Games",
    minFans: 0,
    reqScore: 6.5,
    advancePay: 45_000,
    royaltyCut: 0.22,
  },
  {
    id: "electronic_arts",
    company: "Electronic Arts",
    minFans: 25_000,
    reqScore: 7.5,
    advancePay: 180_000,
    royaltyCut: 0.15,
  },
  {
    id: "nintendont",
    company: "Nintendont",
    minFans: 100_000,
    reqScore: 8.5,
    advancePay: 600_000,
    royaltyCut: 0.08,
  },
];

export function availablePublisherOffers(fans: number): PublisherOffer[] {
  return PUBLISHER_MATRIX.filter((p) => fans >= p.minFans);
}

/**
 * Net Studio Royalty Inflow:
 * success: Gross × royalty_cut
 * fail: −(advance × 0.60)
 */
export function settlePublisherContract(opts: {
  grossRevenue: number;
  finalScore: number;
  reqScore: number;
  advancePay: number;
  royaltyCut: number;
}): { inflow: number; met: boolean; note: string } {
  if (opts.finalScore >= opts.reqScore) {
    const inflow = opts.grossRevenue * opts.royaltyCut;
    return {
      inflow,
      met: true,
      note: `Contract met (${opts.finalScore} ≥ ${opts.reqScore}). Royalty +$${Math.round(inflow).toLocaleString()}.`,
    };
  }
  const fine = Math.round(opts.advancePay * 0.6);
  return {
    inflow: -fine,
    met: false,
    note: `Contract failed (${opts.finalScore} < ${opts.reqScore}). Breach fine −$${fine.toLocaleString()}.`,
  };
}

// ── Module 22: Tech debt ────────────────────────────────────────────────────

export function techDebtPenaltyMultiplier(opts: {
  gamesShippedCount: number;
  chronologicalAgeYears: number;
}): number {
  const pen =
    opts.gamesShippedCount * 0.06 + opts.chronologicalAgeYears * 0.08;
  // Multiplier on points: 1 − pen, floor at 0.4 (max 60% penalty)
  return Math.max(0.4, 1 - pen);
}

export function techDebtPenaltyPercent(opts: {
  gamesShippedCount: number;
  chronologicalAgeYears: number;
}): number {
  const m = techDebtPenaltyMultiplier(opts);
  return Math.round((1 - m) * 100);
}

export const ENGINE_REFACTOR = {
  cash: 25_000,
  rp: 20,
  weeks: 1,
} as const;
