/**
 * Native workshop-inspired systems (original Studio Empire fiction).
 * Inspired by community expansion themes — not a port of Steam Workshop files.
 * Modules A–E: T-Engine · Genre EXP · Platforms · Telemetry · Cheat commands
 */

import type { GenreId } from "./types";

export const WORKSHOP_NATIVE_VERSION = "2.5.0" as const;

// ── Module A: T-Engine Modular Framework ────────────────────────────────────

export const T_ENGINE = {
  cashCost: 500_000,
  rpCost: 150,
  stabilityBonus: 0.25, // +25% stability points
  bugReduction: 0.5, // −50% bugs at scoring
  reviewBonusIf3d: 0.5, // +0.5 review when 3D graphics features present
} as const;

export function applyTEngineBugMitigation(bugs: number, hasTEngine: boolean): number {
  if (!hasTEngine) return bugs;
  return Math.max(0, Math.floor(bugs * (1 - T_ENGINE.bugReduction)));
}

export function tEngineStabilityPoints(baseTech: number, hasTEngine: boolean): number {
  if (!hasTEngine) return 0;
  return Math.floor(baseTech * T_ENGINE.stabilityBonus);
}

export function tEngineReviewBonus(hasTEngine: boolean, has3d: boolean): number {
  if (!hasTEngine || !has3d) return 0;
  return T_ENGINE.reviewBonusIf3d;
}

// ── Module B: Genre EXP ─────────────────────────────────────────────────────

export type GenreExpMap = Partial<Record<GenreId, number>>;

export function genreLevel(expPoints: number): number {
  // Level 1 at 0–4 ships, L2 at 5–9, …
  return 1 + Math.floor(Math.max(0, expPoints) / 5);
}

export function genreExpMultiplier(expPoints: number): number {
  const lvl = genreLevel(expPoints);
  return 1 + lvl * 0.05;
}

export function incrementGenreExp(map: GenreExpMap, genre: GenreId): GenreExpMap {
  return { ...map, [genre]: (map[genre] ?? 0) + 1 };
}

// ── Module C: Workshop platforms (original names) ───────────────────────────
// Absolute calendar years (campaign starts 1982).

export const WORKSHOP_PLATFORM_SPECS = [
  {
    id: "super_tes",
    name: "Super TES",
    short: "STES",
    year: 1990,
    licenseCost: 120_000,
    marketSize: 1.5,
    techCeiling: 1.05,
    audience: "everyone" as const,
  },
  {
    id: "vena_gen",
    name: "Vena Genesis",
    short: "VGEN",
    year: 1989,
    licenseCost: 100_000,
    marketSize: 1.3,
    techCeiling: 1.0,
    audience: "young" as const,
  },
  {
    id: "mbox_360",
    name: "mBox 360",
    short: "MBX",
    year: 2005,
    licenseCost: 250_000,
    marketSize: 2.1,
    techCeiling: 1.45,
    audience: "mature" as const,
  },
  {
    id: "play_3",
    name: "Playsystem 3",
    short: "PS3",
    year: 2006,
    licenseCost: 300_000,
    marketSize: 2.2,
    techCeiling: 1.5,
    audience: "mature" as const,
  },
  {
    id: "pip_phone",
    name: "Pip-Phone",
    short: "PIP",
    year: 2007,
    licenseCost: 40_000,
    marketSize: 2.5,
    techCeiling: 0.95,
    audience: "everyone" as const,
  },
] as const;

// ── Module D: Telemetry ledger ──────────────────────────────────────────────

export type GameHistoryEntry = {
  gameId: string;
  title: string;
  week: number;
  year: number;
  genreId: GenreId;
  topicId: string;
  platformId: string;
  avgReview: number;
  designPoints: number;
  techPoints: number;
  developmentCost: number;
  marketingSpend: number;
  grossRevenue: number;
  netRevenue: number;
  unitsSold: number;
  profit: number;
  roiPct: number;
  rivalPressureNote: string;
};

export function buildHistoryEntry(opts: {
  gameId: string;
  title: string;
  week: number;
  year: number;
  genreId: GenreId;
  topicId: string;
  platformId: string;
  avgReview: number;
  designPoints: number;
  techPoints: number;
  developmentCost: number;
  marketingSpend: number;
  unitsSold: number;
  unitPrice: number;
  rivalGenrePressure?: boolean;
}): GameHistoryEntry {
  const gross = Math.round(opts.unitsSold * opts.unitPrice);
  const net = Math.round(gross * 0.85);
  const overhead = Math.round(opts.developmentCost + opts.marketingSpend);
  const profit = net - overhead;
  const denom = Math.max(1, overhead);
  const roiPct = Math.round((net / denom) * 1000) / 10;
  return {
    gameId: opts.gameId,
    title: opts.title,
    week: opts.week,
    year: opts.year,
    genreId: opts.genreId,
    topicId: opts.topicId,
    platformId: opts.platformId,
    avgReview: opts.avgReview,
    designPoints: Math.round(opts.designPoints),
    techPoints: Math.round(opts.techPoints),
    developmentCost: Math.round(opts.developmentCost),
    marketingSpend: Math.round(opts.marketingSpend),
    grossRevenue: gross,
    netRevenue: net,
    unitsSold: Math.round(opts.unitsSold),
    profit,
    roiPct,
    rivalPressureNote: opts.rivalGenrePressure
      ? "Rival genre saturation cut shelf (−22%)"
      : "No rival genre pressure at ship",
  };
}

export function formatTelemetryBlock(e: GameHistoryEntry): string {
  return [
    `Telemetry · ${e.title}`,
    `Score ${e.avgReview}/10 · ${e.unitsSold.toLocaleString()} units`,
    `Gross $${e.grossRevenue.toLocaleString()} · Net $${e.netRevenue.toLocaleString()}`,
    `Dev+Mkt $${(e.developmentCost + e.marketingSpend).toLocaleString()} · Profit $${e.profit.toLocaleString()}`,
    `ROI ${e.roiPct}% · ${e.rivalPressureNote}`,
    `Points D${e.designPoints} / T${e.techPoints}`,
  ].join("\n");
}

// ── Module E: Cheat command parser ──────────────────────────────────────────

export type ParsedCheat =
  | { kind: "money_boost" }
  | { kind: "rp_max" }
  | { kind: "instafans" }
  | { kind: "bug_wipe" }
  | { kind: "unknown"; raw: string };

export function parseCheatCommand(raw: string): ParsedCheat {
  const t = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (t === "/money_boost" || t === "money_boost" || t === "/money") return { kind: "money_boost" };
  if (t === "/rp_max" || t === "rp_max") return { kind: "rp_max" };
  if (t === "/instafans" || t === "instafans") return { kind: "instafans" };
  if (t === "/bug_wipe" || t === "bug_wipe") return { kind: "bug_wipe" };
  return { kind: "unknown", raw };
}
