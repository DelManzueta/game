/**
 * TYCOON-ENGINE v2.4.0 — Risk & Analytics (Modules 17–19)
 * IP litigation · Post-mortems · Console component configurator
 */

import type { GenreId, GameSize } from "./types";
import { hashSeed } from "./scoring/rng";
import { classicComboMultiplier } from "./classicGdt";

export const TYCOON_RISK_VERSION = "2.4.0" as const;

// ── Module 17: IP / Litigation ──────────────────────────────────────────────

export type LitigationOutcome =
  | "Cease_And_Desist"
  | "Out_Of_Court_Settlement"
  | "Punitive_Damages"
  | "Clean_Escape";

export type LitigationResult = {
  outcome: LitigationOutcome;
  roll: number;
  penaltyCash: number;
  salesHalted: boolean;
  note: string;
};

/** Illicit asset path: +30% tech, $0 license shortcut — then 2w post-launch roll. */
export const ILLICIT_TECH_BOOST = 1.3;

export function rollLitigation(opts: {
  campaignSeed: number;
  week: number;
  gameId: string;
  usedIllicitAssets: boolean;
}): LitigationResult {
  // Clean projects rarely get sued (soft ambient 5% only if illicit)
  if (!opts.usedIllicitAssets) {
    return {
      outcome: "Clean_Escape",
      roll: 100,
      penaltyCash: 0,
      salesHalted: false,
      note: "No IP claims filed.",
    };
  }
  const seed = hashSeed(opts.campaignSeed, "litigate", opts.week, opts.gameId);
  const roll = 1 + (seed % 100);
  if (roll <= 25) {
    return {
      outcome: "Cease_And_Desist",
      roll,
      penaltyCash: 0,
      salesHalted: true,
      note: "Cease & desist — sales halted. Title pulled from shelves.",
    };
  }
  if (roll <= 55) {
    return {
      outcome: "Out_Of_Court_Settlement",
      roll,
      penaltyCash: 50_000,
      salesHalted: false,
      note: "Out-of-court settlement — −$50,000. Sales continue.",
    };
  }
  if (roll <= 80) {
    return {
      outcome: "Punitive_Damages",
      roll,
      penaltyCash: 250_000,
      salesHalted: true,
      note: "Punitive damages — −$250,000 and sales halted.",
    };
  }
  return {
    outcome: "Clean_Escape",
    roll,
    penaltyCash: 0,
    salesHalted: false,
    note: "Clean escape — litigation threat dissolved.",
  };
}

// ── Module 18: Post-mortem ──────────────────────────────────────────────────

export const POST_MORTEM = { weeks: 1, rpCost: 5 } as const;

export type MatchLabel = "Great Match" | "Good Match" | "Bad Match";

export type PostMortemRecord = {
  id: string;
  gameId: string;
  title: string;
  topicId: string;
  genreId: GenreId;
  comboMult: number;
  matchLabel: MatchLabel;
  sliderVerdict: "Ideal band" | "Near ideal" | "Deviated";
  sliderMiss: number;
  week: number;
};

export function matchLabelFromCombo(combo: number): MatchLabel {
  if (combo >= 1.2) return "Great Match";
  if (combo >= 0.9) return "Good Match";
  return "Bad Match";
}

export function sliderVerdict(miss: number): PostMortemRecord["sliderVerdict"] {
  if (miss <= 0.12) return "Ideal band";
  if (miss <= 0.28) return "Near ideal";
  return "Deviated";
}

export function buildPostMortem(opts: {
  gameId: string;
  title: string;
  topicId: string;
  genreId: GenreId;
  sliderMiss: number;
  week: number;
}): PostMortemRecord {
  const combo = classicComboMultiplier(opts.topicId, opts.genreId);
  return {
    id: `pm_${opts.gameId}`,
    gameId: opts.gameId,
    title: opts.title,
    topicId: opts.topicId,
    genreId: opts.genreId,
    comboMult: Math.round(combo * 100) / 100,
    matchLabel: matchLabelFromCombo(combo),
    sliderVerdict: sliderVerdict(opts.sliderMiss),
    sliderMiss: Math.round(opts.sliderMiss * 100) / 100,
    week: opts.week,
  };
}

/** Insight = 1 + matchingGenrePostMortems × 0.03, cap 1.15 */
export function insightMultiplier(
  postMortems: PostMortemRecord[],
  genreId: GenreId,
): number {
  const n = postMortems.filter((p) => p.genreId === genreId).length;
  return Math.min(1.15, 1 + n * 0.03);
}

// ── Module 19: Console component configurator ───────────────────────────────

export type MediaDriveId = "Cartridge_Slot" | "High_Speed_CD" | "Blue_Laser_Disc";
export type GpuPartId = "8_Bit_Blitter" | "16_Bit_Copper" | "3D_Geometry_Pipe";

export type HwPart = {
  id: string;
  name: string;
  cost: number;
  rp: number;
  unit_cost: number;
  market_share_mod: number;
};

export const MEDIA_DRIVES: Record<MediaDriveId, HwPart> = {
  Cartridge_Slot: {
    id: "Cartridge_Slot",
    name: "Cartridge Slot",
    cost: 100_000,
    rp: 40,
    unit_cost: 5,
    market_share_mod: 0.8,
  },
  High_Speed_CD: {
    id: "High_Speed_CD",
    name: "High-Speed CD",
    cost: 750_000,
    rp: 150,
    unit_cost: 1.5,
    market_share_mod: 1.2,
  },
  Blue_Laser_Disc: {
    id: "Blue_Laser_Disc",
    name: "Blue Laser Disc",
    cost: 4_000_000,
    rp: 600,
    unit_cost: 12,
    market_share_mod: 2.0,
  },
};

export const GPU_PARTS: Record<GpuPartId, HwPart> = {
  "8_Bit_Blitter": {
    id: "8_Bit_Blitter",
    name: "8-Bit Blitter",
    cost: 50_000,
    rp: 20,
    unit_cost: 3.5,
    market_share_mod: 0.5,
  },
  "16_Bit_Copper": {
    id: "16_Bit_Copper",
    name: "16-Bit Copper",
    cost: 300_000,
    rp: 90,
    unit_cost: 8,
    market_share_mod: 1.0,
  },
  "3D_Geometry_Pipe": {
    id: "3D_Geometry_Pipe",
    name: "3D Geometry Pipe",
    cost: 6_500_000,
    rp: 900,
    unit_cost: 45,
    market_share_mod: 2.4,
  },
};

export const ASSEMBLY_OVERHEAD = 15;

export function consoleUnitCost(media: MediaDriveId, gpu: GpuPartId): number {
  return MEDIA_DRIVES[media].unit_cost + GPU_PARTS[gpu].unit_cost + ASSEMBLY_OVERHEAD;
}

export function consoleRdCost(media: MediaDriveId, gpu: GpuPartId): {
  cash: number;
  rp: number;
  shareMod: number;
  unitCost: number;
} {
  const m = MEDIA_DRIVES[media];
  const g = GPU_PARTS[gpu];
  return {
    cash: m.cost + g.cost,
    rp: m.rp + g.rp,
    shareMod: m.market_share_mod * g.market_share_mod,
    unitCost: consoleUnitCost(media, gpu),
  };
}
