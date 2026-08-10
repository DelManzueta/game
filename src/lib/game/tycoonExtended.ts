/**
 * TYCOON-ENGINE EXTENDED MODULES v2.2.0 — frozen production.
 * Modules 7–9: rivals, crunch/crisis, multi-platform ports.
 * Module 10 save matrix helpers (browser save remains primary).
 */

import type { GenreId } from "./types";
import { hashSeed } from "./scoring/rng";

export const TYCOON_EXTENDED_VERSION = "2.2.0" as const;

// ── Module 7: Competitor AI ─────────────────────────────────────────────────

export type TycoonRivalProfile = {
  id: string;
  name: string;
  preferred_genre: GenreId;
  tech_focus: number;
  design_focus: number;
  market_aggression: number;
};

export const TYCOON_RIVALS: TycoonRivalProfile[] = [
  {
    id: "A_1",
    name: "ByteBlaze Studios",
    preferred_genre: "action",
    tech_focus: 0.8,
    design_focus: 0.2,
    market_aggression: 1.15,
  },
  {
    id: "A_2",
    name: "Mirage RPG Collective",
    preferred_genre: "rpg",
    tech_focus: 0.3,
    design_focus: 0.7,
    market_aggression: 1.0,
  },
  {
    id: "A_3",
    name: "MacroFun Casuals",
    preferred_genre: "casual",
    tech_focus: 0.1,
    design_focus: 0.9,
    market_aggression: 1.3,
  },
];

export type RivalReleaseResult = {
  rivalId: string;
  rivalName: string;
  genreId: GenreId;
  totalPoints: number;
  nextHistorical: number;
  title: string;
  note: string;
};

/** Spec 7.2 — every 6 weeks one rival ships. */
export function competitorRelease(opts: {
  campaignSeed: number;
  week: number;
  year: number;
  historicalAverage: number;
  rivalIndex: number; // 0..2 rotating
}): RivalReleaseResult {
  const profile = TYCOON_RIVALS[opts.rivalIndex % TYCOON_RIVALS.length]!;
  const seed = hashSeed(opts.campaignSeed, "rival-rel", opts.week, profile.id);
  const base = 25 + (seed % 21); // RANDOM_INT(25,45)
  // Year offset: campaign year from 1982
  const yearIndex = Math.max(0, opts.year - 1982);
  const totalPoints =
    base * profile.market_aggression * (1.0 + yearIndex * 0.15);
  const nextHistorical =
    opts.historicalAverage * 0.85 + totalPoints * 0.15;
  const title = `${profile.name.split(" ")[0]} ${profile.preferred_genre} '${String(opts.year).slice(2)}`;
  return {
    rivalId: profile.id,
    rivalName: profile.name,
    genreId: profile.preferred_genre,
    totalPoints: Math.round(totalPoints * 10) / 10,
    nextHistorical: Math.round(nextHistorical * 100) / 100,
    title,
    note: `${profile.name} released "${title}" (${Math.round(totalPoints)} pts). Industry bar → ${nextHistorical.toFixed(1)}.`,
  };
}

/** Spec 7.2.3 — same genre on sale → 22% unit cut for remaining shelf. */
export const RIVAL_GENRE_SATURATION = 0.78; // keep 78% of weekly units

// ── Module 8: Crunch & Crisis ───────────────────────────────────────────────

export const CRUNCH = {
  pointsMult: 1.45,
  energyDrain: 18,
  crisisChanceBonus: 35, // +35% absolute to crisis band
} as const;

export type CrisisCode =
  | "CRISIS_01"
  | "CRISIS_02"
  | "CRISIS_03"
  | "CRISIS_04"
  | "CRISIS_05";

export type CrisisOutcome = {
  code: CrisisCode;
  name: string;
  roll: number;
  /** Mutations applied by caller */
  rpDelta: number;
  hypeDelta: number;
  bugsDelta: number;
  reviewPenalty: number;
  extraWeeks: number;
  chargeRentNow: boolean;
  designGenMultWeeks: number; // flu: 2 weeks at 0.5
  designGenMult: number;
  note: string;
};

/**
 * Spec 8.2 — every 2 weeks while developing.
 * Baseline: roll 1-100. With crunch, treat roll as roll - 35 (more crises).
 * Or: if crunch, force into crisis bands more often by remapping.
 */
export function rollDevelopmentCrisis(opts: {
  campaignSeed: number;
  week: number;
  projectId: string;
  crunch: boolean;
}): CrisisOutcome {
  const seed = hashSeed(opts.campaignSeed, "crisis", opts.week, opts.projectId);
  let roll = 1 + (seed % 100);
  // Crunch: +35% crisis risk → shift roll down (lower = worse)
  if (opts.crunch) {
    roll = Math.max(1, roll - CRUNCH.crisisChanceBonus);
  }

  if (roll <= 15) {
    return {
      code: "CRISIS_01",
      name: "Source Code Leak",
      roll,
      rpDelta: -15,
      hypeDelta: -20,
      bugsDelta: 0,
      reviewPenalty: 0,
      extraWeeks: 0,
      chargeRentNow: false,
      designGenMultWeeks: 0,
      designGenMult: 1,
      note: "Source code leak — −15 RP, −20 hype.",
    };
  }
  if (roll <= 30) {
    return {
      code: "CRISIS_02",
      name: "Game Engine Bug Fest",
      roll,
      rpDelta: 0,
      hypeDelta: 0,
      bugsDelta: 30,
      reviewPenalty: 1.5,
      extraWeeks: 0,
      chargeRentNow: false,
      designGenMultWeeks: 0,
      designGenMult: 1,
      note: "Engine bug fest — +30 bugs, −1.5 review penalty at ship.",
    };
  }
  if (roll <= 45) {
    return {
      code: "CRISIS_03",
      name: "Asset Over-Scope",
      roll,
      rpDelta: 0,
      hypeDelta: 0,
      bugsDelta: 0,
      reviewPenalty: 0,
      extraWeeks: 2,
      chargeRentNow: true,
      designGenMultWeeks: 0,
      designGenMult: 1,
      note: "Asset over-scope — +2 weeks, monthly rent charged now.",
    };
  }
  if (roll <= 60) {
    return {
      code: "CRISIS_04",
      name: "Key Developer Flu",
      roll,
      rpDelta: 0,
      hypeDelta: 0,
      bugsDelta: 0,
      reviewPenalty: 0,
      extraWeeks: 0,
      chargeRentNow: false,
      designGenMultWeeks: 2,
      designGenMult: 0.5,
      note: "Key developer flu — design points −50% for 2 weeks.",
    };
  }
  return {
    code: "CRISIS_05",
    name: "Clean Compilation",
    roll,
    rpDelta: 0,
    hypeDelta: 0,
    bugsDelta: 0,
    reviewPenalty: 0,
    extraWeeks: 0,
    chargeRentNow: false,
    designGenMultWeeks: 0,
    designGenMult: 1,
    note: "Clean compilation — no issues this cycle.",
  };
}

// ── Module 9: Multi-platform ────────────────────────────────────────────────

/** Spec 9.1 — secondary licenses at 60% kit cost (if not already owned). */
export function multiPlatformDevKitFee(
  primaryLicenseCost: number,
  secondaryLicenseCosts: number[],
): number {
  return (
    primaryLicenseCost +
    secondaryLicenseCosts.reduce((s, c) => s + c * 0.6, 0)
  );
}

/** Spec 9.1 — +1 week per secondary platform. */
export function multiPlatformTimePenaltyWeeks(secondaryCount: number): number {
  return Math.max(0, Math.min(2, secondaryCount)); // max 3 platforms total → 2 secondary
}

/**
 * Spec 9.2 — Combined Market Share =
 * Primary + Σ(Secondary × 0.45)
 */
export function combinedMarketShare(
  primaryShare: number,
  secondaryShares: number[],
): number {
  return (
    Math.max(0, primaryShare) +
    secondaryShares.reduce((s, sh) => s + Math.max(0, sh) * 0.45, 0)
  );
}

// ── Module 10: Save matrix ──────────────────────────────────────────────────

export type TycoonSaveMatrix = {
  v: string;
  yr: number;
  mo: number;
  wk: number;
  csh: number;
  fan: number;
  rp: number;
  avg: number;
  hyp: number;
  lic: string[];
  eng: { n: string; t_m: number; d_m: number };
  stf: { n: string; t: number; d: number; e: number; s: number }[];
};

export function buildSaveMatrix(state: {
  year: number;
  month: number;
  week: number;
  cash: number;
  fans: number;
  researchPoints: number;
  targetHighScore: number;
  hype: number;
  unlockedPlatforms: string[];
  engines: { name: string; techBonus?: number; designBonus?: number }[];
  staff: { name: string; tech: number; design: number; energy: number; salary: number }[];
}): TycoonSaveMatrix {
  const eng = state.engines[0];
  return {
    v: TYCOON_EXTENDED_VERSION,
    yr: state.year,
    mo: state.month,
    wk: state.week,
    csh: Math.round(state.cash * 100) / 100,
    fan: state.fans,
    rp: Math.floor(state.researchPoints),
    avg: Math.round(state.targetHighScore * 10) / 10,
    hyp: Math.round(state.hype),
    lic: [...state.unlockedPlatforms],
    eng: {
      n: eng?.name ?? "Default Text Core",
      t_m: 1 + (eng?.techBonus ?? 0) / 100,
      d_m: 1 + (eng?.designBonus ?? 0) / 100,
    },
    stf: state.staff.map((m) => ({
      n: m.name,
      t: m.tech,
      d: m.design,
      e: Math.round(m.energy ?? 100),
      s: m.salary,
    })),
  };
}
