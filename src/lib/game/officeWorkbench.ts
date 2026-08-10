/**
 * Module 23.5 — High-Density Office Peripheral Workbench (Level 2.5)
 * Early accessories at Tech Park with clutter tax + manual 6-week fab.
 */

export const WORKBENCH_VERSION = "3.7.0" as const;

/** Office sub-tier: 2.0 base Tech Park · 2.5 High-Density Bay */
export type OfficeSubTier = 2.0 | 2.5;

export const HIGH_DENSITY = {
  cashCost: 120_000,
  minCashToOffer: 450_000,
  staffMax: 6,
  rent: 42_000,
  clutterTaxPerLine: 1_500,
  fabWeeks: 6,
  shelfWeeks: 12,
} as const;

export const RECRUIT = {
  local: { cost: 15_000, minStat: 15, maxStat: 35, label: "Local Job Ad" },
  headhunter: {
    cost: 40_000,
    minStat: 55,
    maxStat: 85,
    label: "Headhunter Premium",
    requiresHighDensity: true,
  },
} as const;

export type BenchCategoryId = "apparel" | "arcade_stick" | "gamepad";

export type BenchCategory = {
  id: BenchCategoryId;
  label: string;
  setupCost: number;
  rpCost: number;
  unitCost: number;
};

export const BENCH_CATEGORIES: Record<BenchCategoryId, BenchCategory> = {
  apparel: {
    id: "apparel",
    label: "Studio Apparel",
    setupCost: 12_000,
    rpCost: 20,
    unitCost: 2.5,
  },
  arcade_stick: {
    id: "arcade_stick",
    label: "Arcade Joystick",
    setupCost: 65_000,
    rpCost: 50,
    unitCost: 11.5,
  },
  gamepad: {
    id: "gamepad",
    label: "Pro Gamepad",
    setupCost: 85_000,
    rpCost: 60,
    unitCost: 14,
  },
};

export function isHighDensity(officeSubTier?: number | null): boolean {
  return (officeSubTier ?? 2) >= 2.5;
}

export function canOfferHighDensity(opts: {
  office: number;
  officeSubTier?: number;
  cash: number;
}): boolean {
  return (
    opts.office === 2 &&
    !isHighDensity(opts.officeSubTier) &&
    opts.cash >= HIGH_DENSITY.minCashToOffer
  );
}

export function clutterTax(activeHardwareLines: number): number {
  return activeHardwareLines * HIGH_DENSITY.clutterTaxPerLine;
}

/** Effective monthly rent at L2 / L2.5 + clutter. */
export function techParkMonthlyBurn(opts: {
  office: number;
  officeSubTier?: number;
  baseRent: number;
  payroll: number;
  activeHardwareLines: number;
}): number {
  let rent = opts.baseRent;
  if (opts.office === 2 && isHighDensity(opts.officeSubTier)) {
    rent = HIGH_DENSITY.rent;
  }
  return rent + opts.payroll + clutterTax(opts.activeHardwareLines);
}

export function staffCapForOffice(opts: {
  office: number;
  officeSubTier?: number;
  baseCapacity: number;
}): number {
  if (opts.office === 2 && isHighDensity(opts.officeSubTier)) {
    return HIGH_DENSITY.staffMax;
  }
  return opts.baseCapacity;
}

/** Large games at L2.5 only: +2 weeks lag. */
export function largeGameExtraWeeks(office: number, officeSubTier?: number): number {
  if (office === 2 && isHighDensity(officeSubTier)) return 2;
  return 0;
}
