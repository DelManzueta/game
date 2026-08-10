/**
 * Module 23 — Hardware Accessories & Physical Merchandise
 * Setup fees · unit cost · retail margin · 16-week shelf · loss-leader fans
 */

export const MERCH_VERSION = "3.5.0" as const;

export type AccessoryCategoryId = "apparel" | "gamepad" | "vr_visor";

export type AccessoryCategory = {
  id: AccessoryCategoryId;
  label: string;
  setupCost: number;
  rpCost: number;
  unitCost: number;
  /** Base adoption before fan scaling */
  baseVolume: number;
};

export const ACCESSORY_CATEGORIES: Record<AccessoryCategoryId, AccessoryCategory> = {
  apparel: {
    id: "apparel",
    label: "Branded Apparel",
    setupCost: 12_000,
    rpCost: 20,
    unitCost: 2.5,
    baseVolume: 800,
  },
  gamepad: {
    id: "gamepad",
    label: "Pro Gamepad",
    setupCost: 85_000,
    rpCost: 60,
    unitCost: 14,
    baseVolume: 500,
  },
  vr_visor: {
    id: "vr_visor",
    label: "Premium VR Visor",
    setupCost: 450_000,
    rpCost: 200,
    unitCost: 110,
    baseVolume: 220,
  },
};

export const HARDWARE_SHELF_WEEKS = 16;

export type HardwareProduct = {
  id: string;
  name: string;
  categoryId: AccessoryCategoryId;
  categoryLabel: string;
  retailPrice: number;
  unitCost: number;
  remainingWeeks: number;
  totalLifespan: number;
  weeklyDistributionPoolBase: number;
  unitsSold: number;
  marginEarned: number;
  lossLeader: boolean;
};

/** Market adoption pool at launch. */
export function hardwareLaunchVolume(opts: {
  category: AccessoryCategory;
  fans: number;
  retailPrice: number;
}): { totalPool: number; lossLeader: boolean } {
  let pool = Math.round(opts.category.baseVolume + opts.fans * 0.45);
  const lossLeader = opts.retailPrice < opts.category.unitCost;
  if (lossLeader) pool = Math.round(pool * 1.8);
  return { totalPool: Math.max(16, pool), lossLeader };
}

export function createHardwareProduct(opts: {
  id: string;
  name: string;
  categoryId: AccessoryCategoryId;
  retailPrice: number;
  fans: number;
}): HardwareProduct {
  const cat = ACCESSORY_CATEGORIES[opts.categoryId];
  const { totalPool, lossLeader } = hardwareLaunchVolume({
    category: cat,
    fans: opts.fans,
    retailPrice: opts.retailPrice,
  });
  return {
    id: opts.id,
    name: opts.name.trim() || cat.label,
    categoryId: cat.id,
    categoryLabel: cat.label,
    retailPrice: opts.retailPrice,
    unitCost: cat.unitCost,
    remainingWeeks: HARDWARE_SHELF_WEEKS,
    totalLifespan: HARDWARE_SHELF_WEEKS,
    weeklyDistributionPoolBase: Math.max(1, Math.round(totalPool / HARDWARE_SHELF_WEEKS)),
    unitsSold: 0,
    marginEarned: 0,
    lossLeader,
  };
}

/**
 * Weekly hardware decay: (weeksLeft/L)^1.8 × weekly base
 * Cash += units × (retail − unitCost)  [can be negative]
 * Fans: profit SKU +1%/unit · loss-leader +5%/unit
 */
export function processHardwareWeek(products: HardwareProduct[]): {
  products: HardwareProduct[];
  cashDelta: number;
  fansDelta: number;
  units: number;
} {
  let cash = 0;
  let fans = 0;
  let units = 0;
  const next: HardwareProduct[] = [];

  for (const hw of products) {
    if (hw.remainingWeeks <= 0) continue;
    const decay = Math.pow(hw.remainingWeeks / hw.totalLifespan, 1.8);
    let weekly = Math.round(hw.weeklyDistributionPoolBase * decay);
    weekly = Math.max(1, weekly);
    const margin = weekly * (hw.retailPrice - hw.unitCost);
    cash += margin;
    units += weekly;
    fans += Math.round(weekly * (hw.lossLeader ? 0.05 : 0.01));
    const updated: HardwareProduct = {
      ...hw,
      remainingWeeks: hw.remainingWeeks - 1,
      unitsSold: hw.unitsSold + weekly,
      marginEarned: hw.marginEarned + margin,
    };
    if (updated.remainingWeeks > 0) next.push(updated);
  }

  return { products: next, cashDelta: cash, fansDelta: fans, units };
}

export function setupCostCheck(
  categoryId: AccessoryCategoryId,
  cash: number,
  rp: number,
): string | null {
  const c = ACCESSORY_CATEGORIES[categoryId];
  if (cash < c.setupCost) return `Need $${c.setupCost.toLocaleString()} setup.`;
  if (rp < c.rpCost) return `Need ${c.rpCost} RP.`;
  return null;
}
