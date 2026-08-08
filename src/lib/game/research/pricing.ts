/**
 * Per-product pricing — never one global company price (Part 2 §10).
 * Price affects demand/value, not review quality formulas.
 */

import type { GameSize } from "../types";
import type { ProductPricing } from "./types";

const REFERENCE_PRICE: Record<GameSize, number> = {
  small: 15,
  medium: 30,
  large: 50,
  aaa: 60,
};

export function referencePrice(size: GameSize): number {
  return REFERENCE_PRICE[size] ?? 25;
}

export function createProductPricing(opts: {
  size: GameSize;
  basePrice: number;
  week: number;
  year: number;
  deluxe?: boolean;
  physical?: boolean;
  launchDiscount?: number;
}): ProductPricing {
  const base = Math.max(5, Math.min(100, Math.round(opts.basePrice)));
  return {
    basePrice: base,
    deluxePrice: opts.deluxe ? Math.round(base * 1.4) : null,
    digitalPrice: base,
    physicalPrice: opts.physical ? Math.round(base * 1.15) : null,
    launchDiscount: Math.max(0, Math.min(0.5, opts.launchDiscount ?? 0)),
    regionMult: 1,
    platformMult: 1,
    lockedAtWeek: opts.week,
    lockedAtYear: opts.year,
  };
}

/**
 * Price response = reference / selected, clamped.
 * Lower price → higher demand, lower revenue/unit. Does not change game quality.
 */
export function priceResponse(selectedPrice: number, size: GameSize): number {
  const ref = referencePrice(size);
  const raw = ref / Math.max(1, selectedPrice);
  // Elasticity band
  return Math.max(0.45, Math.min(1.85, raw));
}

export function lockPricingAtRelease(
  existing: ProductPricing | null | undefined,
  size: GameSize,
  launchPrice: number,
  week: number,
  year: number,
): ProductPricing {
  if (existing && existing.lockedAtWeek >= 0 && existing.basePrice > 0) {
    return { ...existing, basePrice: launchPrice, digitalPrice: launchPrice };
  }
  return createProductPricing({ size, basePrice: launchPrice, week, year });
}
