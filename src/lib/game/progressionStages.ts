/**
 * Four-stage office progression (GDT-style master matrix).
 * Level 1 Garage → 2 Tech Park → 3 Mega-Complex → 4 R&D Lab
 */

import type { GameSize } from "./types";

export const PROGRESSION_VERSION = "1.0.0" as const;

export type OfficeLevel = 1 | 2 | 3 | 4;

export type ProgressionStage = {
  level: OfficeLevel;
  name: string;
  cashReq: number;
  /** If true, cashReq is paid on move; else liquid gate only. */
  cashIsPayment: boolean;
  rent: number;
  staffMax: number;
  allowedSizes: GameSize[];
  /** Years at previous level before move (0 = none). */
  minYearsAtPrevious: number;
  minStaffTotal: number;
  /** Need a specialist (level ≥ 5 or specialization set) for R&D. */
  needLabDirector: boolean;
  description: string;
  unlocks: string[];
};

export const PROGRESSION_STAGES: Record<OfficeLevel, ProgressionStage> = {
  1: {
    level: 1,
    name: "Garage",
    cashReq: 0,
    cashIsPayment: false,
    rent: 8_000,
    staffMax: 1,
    allowedSizes: ["small"],
    minYearsAtPrevious: 0,
    minStaffTotal: 1,
    needLabDirector: false,
    description: "One founder. Small games only. Self-publish.",
    unlocks: [
      "Custom engines after 2 ships",
      "Post-mortems after first shelf exit",
      "No publisher deals yet",
    ],
  },
  2: {
    level: 2,
    name: "Professional Tech Park",
    cashReq: 180_000,
    cashIsPayment: false,
    rent: 25_000,
    staffMax: 5,
    allowedSizes: ["small", "medium"],
    minYearsAtPrevious: 0,
    minStaffTotal: 1,
    needLabDirector: false,
    description: "Hire up to 4 staff. Medium games. Publishers. Training.",
    unlocks: [
      "Staff recruitment & training",
      "Publisher contracts",
      "Medium games (with engine gate)",
    ],
  },
  3: {
    level: 3,
    name: "Industry Mega-Complex",
    cashReq: 1_000_000,
    cashIsPayment: false,
    rent: 80_000,
    staffMax: 7,
    allowedSizes: ["small", "medium", "large"],
    minYearsAtPrevious: 4,
    minStaffTotal: 3, // player + 2 employees
    needLabDirector: false,
    description: "Large games, marketing, peripherals lab.",
    unlocks: [
      "Large games research",
      "Marketing campaigns",
      "Hardware accessories",
      "Path to R&D lab",
    ],
  },
  4: {
    level: 4,
    name: "R&D Laboratory",
    cashReq: 5_000_000,
    cashIsPayment: true,
    rent: 150_000,
    staffMax: 7,
    allowedSizes: ["small", "medium", "large", "aaa"],
    minYearsAtPrevious: 0,
    minStaffTotal: 3,
    needLabDirector: true,
    description: "AAA, own consoles, MMO loop, platform monopoly.",
    unlocks: [
      "AAA format",
      "Console manufacturing",
      "MMO lifecycle",
      "Third-party royalties",
    ],
  },
};

/** Map legacy office 5 → 4. */
export function normalizeOfficeLevel(office: number): OfficeLevel {
  if (office <= 1) return 1;
  if (office === 2) return 2;
  if (office === 3) return 3;
  return 4;
}

export function stageForOffice(office: number): ProgressionStage {
  return PROGRESSION_STAGES[normalizeOfficeLevel(office)];
}

export function yearsAtOffice(opts: {
  officeEnteredYear: number;
  officeEnteredMonth?: number;
  currentYear: number;
  currentMonth?: number;
}): number {
  const y = opts.currentYear - opts.officeEnteredYear;
  const m = (opts.currentMonth ?? 1) - (opts.officeEnteredMonth ?? 1);
  return Math.max(0, y + m / 12);
}

export function hasLabDirector(
  staff: Array<{ id: string; level: number; specialization?: string | null }>,
): boolean {
  return staff.some(
    (m) =>
      m.id !== "founder" &&
      (m.level >= 5 ||
        /lead|director|specialist|lab/i.test(m.specialization ?? "")),
  );
}

export type MoveCheck =
  | { ok: true; cost: number; next: OfficeLevel }
  | { ok: false; error: string };

export function canAdvanceOffice(opts: {
  office: number;
  cash: number;
  staffCount: number;
  staff: Array<{ id: string; level: number; specialization?: string | null }>;
  officeEnteredYear: number;
  officeEnteredMonth?: number;
  currentYear: number;
  currentMonth?: number;
}): MoveCheck {
  const level = normalizeOfficeLevel(opts.office);
  if (level >= 4) return { ok: false, error: "Already at R&D Laboratory (max)." };

  const next = (level + 1) as OfficeLevel;
  const stage = PROGRESSION_STAGES[next];

  if (opts.cash < stage.cashReq) {
    return {
      ok: false,
      error: `Need $${stage.cashReq.toLocaleString()} liquid${stage.cashIsPayment ? " (paid on move)" : ""}.`,
    };
  }
  if (opts.staffCount < stage.minStaffTotal) {
    return {
      ok: false,
      error: `Need at least ${stage.minStaffTotal} people on staff (have ${opts.staffCount}).`,
    };
  }
  if (stage.minYearsAtPrevious > 0) {
    const yrs = yearsAtOffice({
      officeEnteredYear: opts.officeEnteredYear,
      officeEnteredMonth: opts.officeEnteredMonth,
      currentYear: opts.currentYear,
      currentMonth: opts.currentMonth,
    });
    if (yrs < stage.minYearsAtPrevious) {
      return {
        ok: false,
        error: `Need ${stage.minYearsAtPrevious} years at current office (have ~${yrs.toFixed(1)}).`,
      };
    }
  }
  if (stage.needLabDirector && !hasLabDirector(opts.staff)) {
    return {
      ok: false,
      error: "Need a Level 5+ specialist as Lab Director.",
    };
  }

  return {
    ok: true,
    cost: stage.cashIsPayment ? stage.cashReq : 0,
    next,
  };
}

/** Sizes allowed purely by office level (research may still gate medium/large/aaa). */
export function sizesForOffice(office: number): GameSize[] {
  return [...stageForOffice(office).allowedSizes];
}
