/**
 * TYCOON-ENGINE LATE MARKET v2.3.0 — Golden Master end-game modules.
 * 11 Awards · 12 Patches/DLC · 13 Hardware manufacturing
 */

import type { GameSize, GenreId, ReleasedGame } from "./types";
import { hashSeed } from "./scoring/rng";
import { consoleLaunchWeekUnits, HARDWARE_TIER_BASE } from "./hardcoreEngines";

export const TYCOON_LATE_VERSION = "2.3.0" as const;

// ── Module 11: G3 Awards ────────────────────────────────────────────────────

export const AWARD_CATALOG = {
  Game_of_the_Year: { fan_reward: 50_000, rp_bonus: 100, label: "Game of the Year" },
  Best_Tech_Award: { fan_reward: 20_000, rp_bonus: 50, label: "Best Tech" },
  Best_Design_Award: { fan_reward: 20_000, rp_bonus: 50, label: "Best Design" },
  Worst_Game_Flop: { fan_reward: -15_000, rp_bonus: 10, label: "Worst Game Flop" },
} as const;

export type AwardId = keyof typeof AWARD_CATALOG;

export type AwardResult = {
  awardId: AwardId;
  label: string;
  winnerTitle: string;
  winnerId: string | null;
  isPlayer: boolean;
  fanDelta: number;
  rpDelta: number;
  /** GOTY sales surge for player only */
  cashDelta: number;
  note: string;
};

export type EligibleTitle = {
  id: string;
  title: string;
  avgReview: number;
  techPoints: number;
  designPoints: number;
  sales: number;
  isPlayer: boolean;
  yearReleased: number;
};

/** Dec week 4 of each year (month 12, week-of-month 4) ≈ week where month===12 && week%4===0 */
export function isAwardsNight(year: number, month: number, weekOfMonth: number): boolean {
  return month === 12 && weekOfMonth === 4;
}

export function resolveAnnualAwards(opts: {
  year: number;
  titles: EligibleTitle[];
}): AwardResult[] {
  const pool = opts.titles.filter((t) => t.yearReleased === opts.year || t.yearReleased === opts.year - 0);
  // All titles released in calendar year (and last 12 months approximation: same year)
  const yearPool = opts.titles.filter((t) => t.yearReleased >= opts.year - 1 && t.yearReleased <= opts.year);
  const list = yearPool.length ? yearPool : opts.titles;
  if (!list.length) return [];

  const byReview = [...list].sort((a, b) => b.avgReview - a.avgReview || b.sales - a.sales);
  const byTech = [...list].sort((a, b) => b.techPoints - a.techPoints);
  const byDesign = [...list].sort((a, b) => b.designPoints - a.designPoints);
  const byWorst = [...list].sort((a, b) => a.avgReview - b.avgReview);

  const pick = (awardId: AwardId, t: EligibleTitle | undefined): AwardResult | null => {
    if (!t) return null;
    const cat = AWARD_CATALOG[awardId];
    let cashDelta = 0;
    if (awardId === "Game_of_the_Year" && t.isPlayer) {
      // Award Revenue = Original Units × 0.25 × $9.99 × 0.85
      cashDelta = t.sales * 0.25 * 9.99 * 0.85;
    }
    // Flop only hurts player if they win it
    const fan =
      awardId === "Worst_Game_Flop" && !t.isPlayer
        ? 0
        : t.isPlayer
          ? cat.fan_reward
          : 0;
    const rp = t.isPlayer ? cat.rp_bonus : 0;
    return {
      awardId,
      label: cat.label,
      winnerTitle: t.title,
      winnerId: t.isPlayer ? t.id : null,
      isPlayer: t.isPlayer,
      fanDelta: fan,
      rpDelta: rp,
      cashDelta: Math.round(cashDelta),
      note: t.isPlayer
        ? `🏆 ${cat.label}: "${t.title}"! ${fan >= 0 ? `+${fan.toLocaleString()} fans` : `${fan.toLocaleString()} fans`}${cashDelta ? ` · +$${Math.round(cashDelta).toLocaleString()} surge` : ""}.`
        : `${cat.label}: ${t.title} (industry).`,
    };
  };

  return [
    pick("Game_of_the_Year", byReview[0]),
    pick("Best_Tech_Award", byTech[0]),
    pick("Best_Design_Award", byDesign[0]),
    pick("Worst_Game_Flop", byWorst[0]),
  ].filter(Boolean) as AwardResult[];
}

// ── Module 12: Patches & DLC ────────────────────────────────────────────────

export const PATCH = {
  weeks: 1,
  rpCost: 10,
  bugsRemoved: 40,
  salesBoostIfLowScore: 0.05, // +5% weekly if was < 6.0
} as const;

export const DLC = {
  weeks: 2,
  price: 4.99,
  minSize: ["medium", "large", "aaa"] as GameSize[],
  /** DLC units = parentSales × (review/10) × 0.35 */
  unitsFactor: 0.35,
} as const;

export function canPatchTitle(g: ReleasedGame): boolean {
  return (g.bugs ?? 0) > 0 && !g.delisted;
}

export function applyPatchMath(g: ReleasedGame): {
  bugsAfter: number;
  salesBoost: number;
  note: string;
} {
  const removed = Math.min(PATCH.bugsRemoved, g.bugs ?? 0);
  const bugsAfter = Math.max(0, (g.bugs ?? 0) - removed);
  const salesBoost =
    g.avgReview < 6.0 && removed > 0 ? PATCH.salesBoostIfLowScore : 0;
  return {
    bugsAfter,
    salesBoost,
    note: `Patch shipped on "${g.title}": −${removed} bugs${salesBoost ? ", +5% weekly sales" : ""}.`,
  };
}

export function canBuildDlc(g: ReleasedGame): boolean {
  return (
    DLC.minSize.includes(g.size) &&
    (g.onSale || (g.weeksOnMarket ?? 0) > 0) &&
    !g.delisted &&
    !(g as { hasDlc?: boolean }).hasDlc
  );
}

export function dlcUnitsSold(parentSales: number, reviewScore: number): number {
  return Math.max(
    0,
    Math.floor(parentSales * (Math.min(10, Math.max(1, reviewScore)) / 10) * DLC.unitsFactor),
  );
}

// ── Module 13: Hardware manufacturing ───────────────────────────────────────

export type HardwareTierId = "tier_1" | "tier_2" | "tier_3";

export const HARDWARE_TIERS: Record<
  HardwareTierId,
  {
    name: string;
    dev_cost: number;
    rp_cost: number;
    base_market_share: number;
    mfgCost: number; // approx unit cost
  }
> = {
  tier_1: {
    name: "Retro Cartridge System",
    dev_cost: 5_000_000,
    rp_cost: 500,
    base_market_share: 0.4,
    mfgCost: 299,
  },
  tier_2: {
    name: "Optical Disc Multimedia Box",
    dev_cost: 12_000_000,
    rp_cost: 1_200,
    base_market_share: 1.1,
    mfgCost: 299,
  },
  tier_3: {
    name: "Silicon Cloud Matrix",
    dev_cost: 45_000_000,
    rp_cost: 3_500,
    base_market_share: 2.5,
    mfgCost: 299,
  },
};

export const HARDWARE_UNLOCK = {
  minOffice: 3, // Industry complex / upgraded office
  minCash: 15_000_000,
} as const;

export const FIRST_PARTY_SYNERGY = 1.15;


export type PlayerConsole = {
  id: string;
  tier: HardwareTierId;
  name: string;
  retailPrice: number;
  royaltyRate: number; // 0.10–0.30 third-party tax
  marketShare: number;
  launchedWeek: number;
  unitsSold: number;
  status: "developing" | "shipping";
  weeksLeft: number;
  /** Module 19 manufacturing unit cost */
  unitMfgCost?: number;
  mediaDrive?: string;
  gpuPart?: string;
};

export function hardwareUnlocked(office: number, cash: number, flag?: boolean): boolean {
  return flag || (office >= HARDWARE_UNLOCK.minOffice && cash >= HARDWARE_UNLOCK.minCash * 0.5);
  // soft gate: half cash to see lab; full cost on start
}

export function startConsoleDev(opts: {
  tier: HardwareTierId;
  customName?: string;
  week: number;
  seed: number;
}): { console: PlayerConsole; cost: number; rp: number } {
  const t = HARDWARE_TIERS[opts.tier];
  const id = `console_${opts.tier}_${opts.seed.toString(16).slice(0, 6)}`;
  return {
    cost: t.dev_cost,
    rp: t.rp_cost,
    console: {
      id,
      tier: opts.tier,
      name: opts.customName?.trim() || t.name,
      retailPrice: 299,
      royaltyRate: 0.2,
      marketShare: t.base_market_share * 0.15, // ramp from soft launch
      launchedWeek: -1,
      unitsSold: 0,
      status: "developing",
      weeksLeft: opts.tier === "tier_1" ? 24 : opts.tier === "tier_2" ? 40 : 60,
    },
  };
}

/** Weekly console sales + share growth; loss-leader if price < mfg. */
export function tickPlayerConsole(
  c: PlayerConsole,
  week: number,
  fans = 0,
): { console: PlayerConsole; cashDelta: number; note?: string } {
  if (c.status === "developing") {
    const left = c.weeksLeft - 1;
    if (left <= 0) {
      const mfg = c.unitMfgCost ?? HARDWARE_TIERS[c.tier].mfgCost;
      const tierBase =
        c.tier === "tier_1"
          ? HARDWARE_TIER_BASE.retro
          : c.tier === "tier_2"
            ? HARDWARE_TIER_BASE.optical
            : HARDWARE_TIER_BASE.silicon;
      const launch = consoleLaunchWeekUnits({
        fans,
        retailPrice: c.retailPrice,
        unitMfgCost: mfg,
        tierBaseValue: tierBase ?? HARDWARE_TIER_BASE.default,
      });
      return {
        console: {
          ...c,
          status: "shipping",
          weeksLeft: 0,
          launchedWeek: week,
          marketShare: Math.max(
            HARDWARE_TIERS[c.tier].base_market_share * 0.25,
            launch.marketShareHint,
          ),
          unitsSold: launch.units,
        },
        cashDelta: launch.cashDelta,
        note: launch.lossLeader
          ? `${c.name} launches LOSS-LEADER: ${launch.units.toLocaleString()} boxes · 2.5× demand · ${launch.cashDelta < 0 ? "cash bleed" : "ok"}.`
          : `${c.name} launches: ${launch.units.toLocaleString()} week-1 boxes · share ~${(launch.marketShareHint * 100).toFixed(1)}%.`,
      };
    }
    return { console: { ...c, weeksLeft: left }, cashDelta: 0 };
  }

  const mfg = c.unitMfgCost ?? HARDWARE_TIERS[c.tier].mfgCost;
  const lossLeader = c.retailPrice < mfg;
  const shareGrowth = lossLeader ? 1.5 : 1.0;
  const baseUnits = Math.floor(
    800 * c.marketShare * (1 + (hashSeed(week, c.id) % 40) / 100) * shareGrowth,
  );
  const margin = c.retailPrice - mfg;
  const cashDelta = baseUnits * margin;
  const nextShare = Math.min(
    HARDWARE_TIERS[c.tier].base_market_share * 1.2,
    c.marketShare * (1 + 0.02 * shareGrowth),
  );
  return {
    console: {
      ...c,
      unitsSold: c.unitsSold + baseUnits,
      marketShare: nextShare,
    },
    cashDelta,
  };
}

export function rivalRoyaltyOnPlayerHardware(
  rivalGross: number,
  royaltyRate: number,
): number {
  return Math.max(0, rivalGross * royaltyRate);
}
