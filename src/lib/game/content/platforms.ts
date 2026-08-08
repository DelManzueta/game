/** Canonical platform timeline — 4 decades, PC-only day one. */
import type { PlatformDef } from "../types";

/**
 * Decade map (campaign starts 1982):
 *  D1 1982–1989  8-bit / home micros — garage era
 *  D2 1990–1999  16-bit → early 3D
 *  D3 2000–2009  sixth/seventh gen + mobile seed
 *  D4 2010–2019  HD / hybrid
 *  D5 2020–2026  current + next-gen through present
 *
 * Day one: PC only (free). Nothing else auto-unlocks.
 * Consoles and micros appear by launch year and need a license click.
 */
export type PlatformDecade = 1 | 2 | 3 | 4 | 5;

/** Inclusive end of industry hardware timeline for Market / calendar UI. */
export const TIMELINE_END_YEAR = 2026;

export function platformDecade(year: number): PlatformDecade {
  if (year < 1990) return 1;
  if (year < 2000) return 2;
  if (year < 2010) return 3;
  if (year < 2020) return 4;
  return 5;
}

export function decadeLabel(d: PlatformDecade): string {
  switch (d) {
    case 1:
      return "1980s · Garage & 8-bit";
    case 2:
      return "1990s · 16-bit & 3D";
    case 3:
      return "2000s · Major studio gen";
    case 4:
      return "2010s · HD & hybrid";
    case 5:
      return "2020s · Current & next-gen";
  }
}

export const PLATFORMS: PlatformDef[] = [
  // ── Decade 1: 1982–1989 ──────────────────────────────────────────
  {
    id: "pc",
    name: "PC",
    short: "PC",
    year: 1982,
    era: "1980-1984",
    licenseCost: 0,
    marketSize: 0.85,
    techCeiling: 1.2,
    startUnlocked: true,
    genreAffinity: { action: "good", adventure: "good", rpg: "great", simulation: "great", strategy: "great", casual: "good" },
    audienceAffinity: { young: "good", everyone: "great", mature: "ok" },
  },
  {
    id: "commodore",
    name: "G64",
    short: "G64",
    year: 1982,
    era: "1980-1984",
    licenseCost: 2500,
    marketSize: 1.05,
    techCeiling: 0.72,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "good", rpg: "good", simulation: "ok", strategy: "ok", casual: "great" },
    audienceAffinity: { young: "good", everyone: "great", mature: "ok" },
  },
  {
    id: "arcade",
    name: "Arcade Cabinet",
    short: "ARC",
    year: 1984,
    era: "1980-1984",
    licenseCost: 15000,
    marketSize: 0.9,
    techCeiling: 0.8,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "poor", rpg: "poor", simulation: "ok", strategy: "poor", casual: "great" },
    audienceAffinity: { young: "great", everyone: "good", mature: "ok" },
  },
  {
    id: "itara_5200",
    name: "Itara 5200",
    short: "I52",
    year: 1984,
    era: "1980-1984",
    licenseCost: 10000,
    marketSize: 0.5,
    techCeiling: 0.62,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "good", rpg: "ok", simulation: "ok", strategy: "poor", casual: "good" },
    audienceAffinity: { young: "good", everyone: "good", mature: "ok" },
  },
  {
    id: "tes",
    name: "TES",
    short: "TES",
    year: 1985,
    era: "1985-1989",
    licenseCost: 22000,
    marketSize: 1.15,
    techCeiling: 0.78,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "good", rpg: "good", simulation: "ok", strategy: "poor", casual: "great" },
    audienceAffinity: { young: "great", everyone: "great", mature: "ok" },
  },
  {
    id: "master_v",
    name: "Master V",
    short: "MV",
    year: 1986,
    era: "1985-1989",
    licenseCost: 18000,
    marketSize: 0.85,
    techCeiling: 0.76,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "good", rpg: "good", simulation: "ok", strategy: "poor", casual: "great" },
    audienceAffinity: { young: "good", everyone: "great", mature: "ok" },
  },
  {
    id: "itara_backflash",
    name: "Itara Backflash",
    short: "IBF",
    year: 1986,
    era: "1985-1989",
    licenseCost: 12000,
    marketSize: 0.45,
    techCeiling: 0.7,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "good", rpg: "good", simulation: "ok", strategy: "poor", casual: "great" },
    audienceAffinity: { young: "good", everyone: "great", mature: "ok" },
  },
  {
    id: "vena_oasis",
    name: "Vena Oasis",
    short: "VO",
    year: 1987,
    era: "1985-1989",
    licenseCost: 28000,
    marketSize: 0.9,
    techCeiling: 0.84,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "good", rpg: "good", simulation: "ok", strategy: "poor", casual: "great" },
    audienceAffinity: { young: "good", everyone: "great", mature: "ok" },
  },
  {
    id: "grapintosh",
    name: "Grapintosh",
    short: "GRP",
    year: 1987,
    era: "1985-1989",
    licenseCost: 4000,
    marketSize: 0.5,
    techCeiling: 0.95,
    startUnlocked: false,
    genreAffinity: { action: "good", adventure: "good", rpg: "great", simulation: "great", strategy: "great", casual: "good" },
    audienceAffinity: { young: "good", everyone: "great", mature: "ok" },
  },
  {
    id: "vena_gear",
    name: "Vena Gear",
    short: "VG",
    year: 1988,
    era: "1985-1989",
    licenseCost: 30000,
    marketSize: 0.75,
    techCeiling: 0.84,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "good", rpg: "good", simulation: "ok", strategy: "poor", casual: "great" },
    audienceAffinity: { young: "good", everyone: "great", mature: "ok" },
  },
  {
    id: "gameling",
    name: "Gameling",
    short: "GL",
    year: 1989,
    era: "1985-1989",
    licenseCost: 25000,
    marketSize: 1.05,
    techCeiling: 0.72,
    startUnlocked: false,
    genreAffinity: { action: "good", adventure: "good", rpg: "great", simulation: "ok", strategy: "good", casual: "great" },
    audienceAffinity: { young: "great", everyone: "great", mature: "ok" },
  },
  {
    id: "vena_genesis_x",
    name: "Vena Genesis X",
    short: "VGX",
    year: 1989,
    era: "1985-1989",
    licenseCost: 38000,
    marketSize: 1.05,
    techCeiling: 0.92,
    startUnlocked: false,
    genreAffinity: {
      action: "great", adventure: "good", rpg: "good", simulation: "ok", strategy: "poor", casual: "great",
    },
    audienceAffinity: { young: "great", everyone: "great", mature: "ok" },
  },
  {
    id: "grmac",
    name: "grMac",
    short: "gM",
    year: 1989,
    era: "1985-1989",
    licenseCost: 5000,
    marketSize: 0.55,
    techCeiling: 1.0,
    startUnlocked: false,
    genreAffinity: { action: "good", adventure: "good", rpg: "great", simulation: "great", strategy: "great", casual: "good" },
    audienceAffinity: { young: "good", everyone: "great", mature: "ok" },
  },

  // ── Decade 2: 1990–1999 ──────────────────────────────────────────
  {
    id: "super_tes",
    name: "Super TES",
    short: "STES",
    year: 1990,
    era: "1990-1994",
    licenseCost: 48000,
    marketSize: 1.2,
    techCeiling: 0.98,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "good", rpg: "great", simulation: "ok", strategy: "poor", casual: "great" },
    audienceAffinity: { young: "great", everyone: "great", mature: "ok" },
  },
  {
    id: "playsystem",
    name: "Playsystem",
    short: "PS",
    year: 1995,
    era: "1990-1994",
    licenseCost: 85000,
    marketSize: 1.3,
    techCeiling: 1.08,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "great", rpg: "great", simulation: "good", strategy: "ok", casual: "ok" },
    audienceAffinity: { young: "good", everyone: "great", mature: "good" },
  },
  {
    id: "tes_64",
    name: "TES 64",
    short: "T64",
    year: 1996,
    era: "1995-1999",
    licenseCost: 90000,
    marketSize: 1.05,
    techCeiling: 1.12,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "good", rpg: "good", simulation: "ok", strategy: "poor", casual: "good" },
    audienceAffinity: { young: "great", everyone: "great", mature: "ok" },
  },
  {
    id: "game_sphere",
    name: "Game Sphere",
    short: "GSp",
    year: 1998,
    era: "1995-1999",
    licenseCost: 90000,
    marketSize: 0.95,
    techCeiling: 1.1,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "good", rpg: "good", simulation: "ok", strategy: "ok", casual: "great" },
    audienceAffinity: { young: "great", everyone: "great", mature: "ok" },
  },
  {
    id: "gameling_color",
    name: "Gameling Color",
    short: "GLC",
    year: 1998,
    era: "1995-1999",
    licenseCost: 40000,
    marketSize: 0.95,
    techCeiling: 0.88,
    startUnlocked: false,
    genreAffinity: { action: "good", adventure: "good", rpg: "great", simulation: "ok", strategy: "good", casual: "great" },
    audienceAffinity: { young: "great", everyone: "great", mature: "ok" },
  },
  {
    id: "dreamvast",
    name: "DreamVast",
    short: "DV",
    year: 1999,
    era: "1995-1999",
    licenseCost: 100000,
    marketSize: 0.75,
    techCeiling: 1.15,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "great", rpg: "good", simulation: "ok", strategy: "ok", casual: "good" },
    audienceAffinity: { young: "good", everyone: "great", mature: "ok" },
  },

  // ── Decade 3: 2000–2009 ──────────────────────────────────────────
  {
    id: "playsystem_2",
    name: "Playsystem 2",
    short: "PS2",
    year: 2000,
    era: "2000-2004",
    licenseCost: 120000,
    marketSize: 1.45,
    techCeiling: 1.22,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "great", rpg: "great", simulation: "good", strategy: "ok", casual: "good" },
    audienceAffinity: { young: "great", everyone: "great", mature: "good" },
  },
  {
    id: "mbox",
    name: "mBox",
    short: "mB",
    year: 2001,
    era: "2000-2004",
    licenseCost: 140000,
    marketSize: 1.15,
    techCeiling: 1.2,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "good", rpg: "good", simulation: "ok", strategy: "ok", casual: "ok" },
    audienceAffinity: { young: "good", everyone: "great", mature: "great" },
  },
  {
    id: "gs",
    name: "GS",
    short: "GS",
    year: 2001,
    era: "2000-2004",
    licenseCost: 95000,
    marketSize: 1.0,
    techCeiling: 1.05,
    startUnlocked: false,
    genreAffinity: { action: "good", adventure: "good", rpg: "great", simulation: "ok", strategy: "good", casual: "great" },
    audienceAffinity: { young: "great", everyone: "great", mature: "ok" },
  },
  {
    id: "3gs",
    name: "3GS",
    short: "3GS",
    year: 2003,
    era: "2000-2004",
    licenseCost: 85000,
    marketSize: 0.85,
    techCeiling: 1.0,
    startUnlocked: false,
    genreAffinity: { action: "good", adventure: "good", rpg: "great", simulation: "ok", strategy: "good", casual: "great" },
    audienceAffinity: { young: "great", everyone: "great", mature: "ok" },
  },
  {
    id: "2gs",
    name: "2GS",
    short: "2GS",
    year: 2004,
    era: "2000-2004",
    licenseCost: 70000,
    marketSize: 0.8,
    techCeiling: 0.95,
    startUnlocked: false,
    genreAffinity: { action: "good", adventure: "good", rpg: "good", simulation: "ok", strategy: "ok", casual: "great" },
    audienceAffinity: { young: "great", everyone: "great", mature: "ok" },
  },
  {
    id: "playsystem_2_slim",
    name: "Playsystem 2 Slim",
    short: "PS2S",
    year: 2004,
    era: "2000-2004",
    licenseCost: 70000,
    marketSize: 1.15,
    techCeiling: 1.18,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "great", rpg: "great", simulation: "good", strategy: "ok", casual: "good" },
    audienceAffinity: { young: "great", everyone: "great", mature: "good" },
  },
  {
    id: "pps",
    name: "PPS",
    short: "PPS",
    year: 2005,
    era: "2005-2009",
    licenseCost: 100000,
    marketSize: 1.1,
    techCeiling: 1.12,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "good", rpg: "great", simulation: "ok", strategy: "ok", casual: "good" },
    audienceAffinity: { young: "great", everyone: "great", mature: "ok" },
  },
  {
    id: "mbox_360",
    name: "mBox 360",
    short: "m360",
    year: 2005,
    era: "2005-2009",
    licenseCost: 170000,
    marketSize: 1.3,
    techCeiling: 1.28,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "good", rpg: "good", simulation: "ok", strategy: "ok", casual: "ok" },
    audienceAffinity: { young: "good", everyone: "great", mature: "great" },
  },
  {
    id: "nuu",
    name: "Nuu",
    short: "Nuu",
    year: 2006,
    era: "2005-2009",
    licenseCost: 110000,
    marketSize: 1.35,
    techCeiling: 1.15,
    startUnlocked: false,
    genreAffinity: { action: "good", adventure: "good", rpg: "ok", simulation: "good", strategy: "ok", casual: "great" },
    audienceAffinity: { young: "great", everyone: "great", mature: "ok" },
  },
  {
    id: "playsystem_3",
    name: "Playsystem 3",
    short: "PS3",
    year: 2006,
    era: "2005-2009",
    licenseCost: 200000,
    marketSize: 1.25,
    techCeiling: 1.35,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "great", rpg: "great", simulation: "good", strategy: "ok", casual: "ok" },
    audienceAffinity: { young: "good", everyone: "great", mature: "good" },
  },
  {
    id: "wuu",
    name: "Wuu",
    short: "Wuu",
    year: 2006,
    era: "2005-2009",
    licenseCost: 100000,
    marketSize: 1.3,
    techCeiling: 1.12,
    startUnlocked: false,
    genreAffinity: { action: "good", adventure: "good", rpg: "ok", simulation: "good", strategy: "ok", casual: "great" },
    audienceAffinity: { young: "great", everyone: "great", mature: "ok" },
  },
  {
    id: "saga_nova",
    name: "SAGA Nova",
    short: "SNova",
    year: 2007,
    era: "2005-2009",
    licenseCost: 95000,
    marketSize: 0.55,
    techCeiling: 1.25,
    startUnlocked: false,
    genreAffinity: {
      action: "great", adventure: "good", rpg: "good", simulation: "ok", strategy: "ok", casual: "good",
    },
    audienceAffinity: { young: "great", everyone: "good", mature: "ok" },
  },
  {
    id: "grphone",
    name: "grPhone",
    short: "gPh",
    year: 2007,
    era: "2005-2009",
    licenseCost: 50000,
    marketSize: 1.25,
    techCeiling: 1.05,
    startUnlocked: false,
    genreAffinity: { action: "good", adventure: "good", rpg: "ok", simulation: "ok", strategy: "ok", casual: "great" },
    audienceAffinity: { young: "great", everyone: "great", mature: "ok" },
  },

  // ── Decade 4: 2010–2021 ──────────────────────────────────────────
  {
    id: "mbox_360_slim",
    name: "mBox 360 Slim",
    short: "m360S",
    year: 2010,
    era: "2010-2014",
    licenseCost: 120000,
    marketSize: 1.15,
    techCeiling: 1.26,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "good", rpg: "good", simulation: "ok", strategy: "ok", casual: "ok" },
    audienceAffinity: { young: "good", everyone: "great", mature: "great" },
  },
  {
    id: "grpad",
    name: "grPad",
    short: "gPad",
    year: 2010,
    era: "2010-2014",
    licenseCost: 90000,
    marketSize: 1.35,
    techCeiling: 1.08,
    startUnlocked: false,
    genreAffinity: { action: "ok", adventure: "good", rpg: "ok", simulation: "good", strategy: "ok", casual: "great" },
    audienceAffinity: { young: "great", everyone: "great", mature: "ok" },
  },
  {
    id: "viva_playsystem",
    name: "Viva Playsystem",
    short: "VPS",
    year: 2012,
    era: "2010-2014",
    licenseCost: 60000,
    marketSize: 0.65,
    techCeiling: 1.1,
    startUnlocked: false,
    genreAffinity: { action: "good", adventure: "great", rpg: "good", simulation: "ok", strategy: "ok", casual: "great" },
    audienceAffinity: { young: "great", everyone: "good", mature: "ok" },
  },
  {
    id: "mpad",
    name: "mPad",
    short: "mPad",
    year: 2012,
    era: "2010-2014",
    licenseCost: 95000,
    marketSize: 1.15,
    techCeiling: 1.1,
    startUnlocked: false,
    genreAffinity: { action: "ok", adventure: "good", rpg: "ok", simulation: "good", strategy: "ok", casual: "great" },
    audienceAffinity: { young: "great", everyone: "great", mature: "ok" },
  },
  {
    id: "oya",
    name: "OYA",
    short: "OYA",
    year: 2013,
    era: "2010-2014",
    licenseCost: 40000,
    marketSize: 0.35,
    techCeiling: 1.05,
    startUnlocked: false,
    genreAffinity: { action: "good", adventure: "good", rpg: "ok", simulation: "ok", strategy: "ok", casual: "great" },
    audienceAffinity: { young: "good", everyone: "good", mature: "ok" },
  },
  {
    id: "saga_blitz",
    name: "SAGA Blitz",
    short: "SBlitz",
    year: 2013,
    era: "2010-2014",
    licenseCost: 160000,
    marketSize: 0.95,
    techCeiling: 1.32,
    startUnlocked: false,
    genreAffinity: {
      action: "great", adventure: "great", rpg: "good", simulation: "ok", strategy: "ok", casual: "good",
    },
    audienceAffinity: { young: "great", everyone: "great", mature: "ok" },
  },
  {
    id: "mbox_one",
    name: "mBox One",
    short: "mOne",
    year: 2013,
    era: "2010-2014",
    licenseCost: 210000,
    marketSize: 1.2,
    techCeiling: 1.35,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "good", rpg: "good", simulation: "ok", strategy: "ok", casual: "ok" },
    audienceAffinity: { young: "good", everyone: "great", mature: "great" },
  },
  {
    id: "playsystem_4",
    name: "Playsystem 4",
    short: "PS4",
    year: 2013,
    era: "2010-2014",
    licenseCost: 220000,
    marketSize: 1.4,
    techCeiling: 1.38,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "great", rpg: "great", simulation: "good", strategy: "ok", casual: "ok" },
    audienceAffinity: { young: "great", everyone: "great", mature: "good" },
  },
  {
    id: "vena_edge",
    name: "Vena Edge",
    short: "VEdge",
    year: 2014,
    era: "2010-2014",
    licenseCost: 175000,
    marketSize: 1.0,
    techCeiling: 1.34,
    startUnlocked: false,
    genreAffinity: {
      action: "great", adventure: "great", rpg: "good", simulation: "ok", strategy: "ok", casual: "good",
    },
    audienceAffinity: { young: "great", everyone: "good", mature: "good" },
  },
  {
    id: "swap",
    name: "Swap",
    short: "Swap",
    year: 2017,
    era: "2015-2019",
    licenseCost: 150000,
    marketSize: 1.4,
    techCeiling: 1.3,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "great", rpg: "great", simulation: "good", strategy: "ok", casual: "great" },
    audienceAffinity: { young: "great", everyone: "great", mature: "ok" },
  },
  {
    id: "saga_apex",
    name: "SAGA Apex",
    short: "SApex",
    year: 2019,
    era: "2015-2019",
    licenseCost: 220000,
    marketSize: 1.25,
    techCeiling: 1.48,
    startUnlocked: false,
    genreAffinity: {
      action: "great", adventure: "great", rpg: "great", simulation: "good", strategy: "ok", casual: "good",
    },
    audienceAffinity: { young: "great", everyone: "great", mature: "good" },
  },
  {
    id: "mbox_next",
    name: "mBox Next",
    short: "mNext",
    year: 2020,
    era: "2020-Present",
    licenseCost: 250000,
    marketSize: 1.25,
    techCeiling: 1.55,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "good", rpg: "good", simulation: "ok", strategy: "ok", casual: "ok" },
    audienceAffinity: { young: "good", everyone: "great", mature: "great" },
  },
  {
    id: "playsystem_5",
    name: "Playsystem 5",
    short: "PS5",
    year: 2020,
    era: "2020-Present",
    licenseCost: 260000,
    marketSize: 1.4,
    techCeiling: 1.58,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "great", rpg: "great", simulation: "good", strategy: "ok", casual: "ok" },
    audienceAffinity: { young: "great", everyone: "great", mature: "good" },
  },
  {
    id: "vena_echo",
    name: "Vena Echo",
    short: "VEcho",
    year: 2021,
    era: "2020-Present",
    licenseCost: 240000,
    marketSize: 0.75,
    techCeiling: 1.58,
    startUnlocked: false,
    genreAffinity: {
      action: "good", adventure: "great", rpg: "great", simulation: "good", strategy: "ok", casual: "good",
    },
    audienceAffinity: { young: "good", everyone: "great", mature: "good" },
  },
  {
    id: "holo_box",
    name: "Holo Box",
    short: "Holo",
    year: 2021,
    era: "2020-Present",
    licenseCost: 280000,
    marketSize: 0.55,
    techCeiling: 1.6,
    startUnlocked: false,
    genreAffinity: { action: "great", adventure: "great", rpg: "good", simulation: "ok", strategy: "ok", casual: "good" },
    audienceAffinity: { young: "great", everyone: "good", mature: "ok" },
  },

  // ── 2022–2026 mid-cycle & next-gen window ─────────────────────
  {
    id: "swap_oled",
    name: "Swap OLED",
    short: "SwapO",
    year: 2022,
    era: "2017-2025",
    licenseCost: 120000,
    marketSize: 1.2,
    techCeiling: 1.34,
    startUnlocked: false,
    genreAffinity: {
      action: "great", adventure: "great", rpg: "great", simulation: "good", strategy: "ok", casual: "great",
    },
    audienceAffinity: { young: "great", everyone: "great", mature: "ok" },
  },
  {
    id: "cloud_play",
    name: "CloudPlay",
    short: "Cloud",
    year: 2022,
    era: "2020-Present",
    licenseCost: 45000,
    marketSize: 0.85,
    techCeiling: 1.45,
    startUnlocked: false,
    genreAffinity: {
      action: "good", adventure: "good", rpg: "good", simulation: "great", strategy: "great", casual: "great",
    },
    audienceAffinity: { young: "good", everyone: "great", mature: "good" },
  },
  {
    id: "mbox_next_s",
    name: "mBox Next S",
    short: "mNextS",
    year: 2023,
    era: "2020-Present",
    licenseCost: 200000,
    marketSize: 1.05,
    techCeiling: 1.52,
    startUnlocked: false,
    genreAffinity: {
      action: "great", adventure: "good", rpg: "good", simulation: "ok", strategy: "ok", casual: "good",
    },
    audienceAffinity: { young: "good", everyone: "great", mature: "great" },
  },
  {
    id: "vena_flux",
    name: "Vena Flux",
    short: "VFlux",
    year: 2023,
    era: "2020-Present",
    licenseCost: 260000,
    marketSize: 0.8,
    techCeiling: 1.62,
    startUnlocked: false,
    genreAffinity: {
      action: "great", adventure: "great", rpg: "great", simulation: "good", strategy: "ok", casual: "good",
    },
    audienceAffinity: { young: "good", everyone: "great", mature: "good" },
  },
  {
    id: "playsystem_5_pro",
    name: "Playsystem 5 Pro",
    short: "PS5P",
    year: 2024,
    era: "2020-Present",
    licenseCost: 280000,
    marketSize: 1.15,
    techCeiling: 1.68,
    startUnlocked: false,
    genreAffinity: {
      action: "great", adventure: "great", rpg: "great", simulation: "good", strategy: "ok", casual: "ok",
    },
    audienceAffinity: { young: "great", everyone: "great", mature: "good" },
  },
  {
    id: "swap_2",
    name: "Swap 2",
    short: "Swap2",
    year: 2025,
    era: "2025-Present",
    licenseCost: 180000,
    marketSize: 1.3,
    techCeiling: 1.55,
    startUnlocked: false,
    genreAffinity: {
      action: "great", adventure: "great", rpg: "great", simulation: "good", strategy: "ok", casual: "great",
    },
    audienceAffinity: { young: "great", everyone: "great", mature: "ok" },
  },
  {
    id: "holo_sphere",
    name: "Holo Sphere",
    short: "HoloS",
    year: 2025,
    era: "2025-Present",
    licenseCost: 350000,
    marketSize: 0.5,
    techCeiling: 1.8,
    startUnlocked: false,
    genreAffinity: {
      action: "great", adventure: "great", rpg: "good", simulation: "ok", strategy: "ok", casual: "good",
    },
    audienceAffinity: { young: "great", everyone: "good", mature: "ok" },
  },
  {
    id: "playsystem_6",
    name: "Playsystem 6",
    short: "PS6",
    year: 2026,
    era: "2026-Present",
    licenseCost: 320000,
    marketSize: 1.5,
    techCeiling: 1.75,
    startUnlocked: false,
    genreAffinity: {
      action: "great", adventure: "great", rpg: "great", simulation: "good", strategy: "ok", casual: "ok",
    },
    audienceAffinity: { young: "great", everyone: "great", mature: "good" },
  },
  {
    id: "mbox_future",
    name: "mBox Future",
    short: "mFut",
    year: 2026,
    era: "2026-Present",
    licenseCost: 300000,
    marketSize: 1.35,
    techCeiling: 1.72,
    startUnlocked: false,
    genreAffinity: {
      action: "great", adventure: "good", rpg: "good", simulation: "ok", strategy: "ok", casual: "ok",
    },
    audienceAffinity: { young: "good", everyone: "great", mature: "great" },
  },
];

export const CUSTOM_CONSOLE: PlatformDef = {
  id: "custom_console",
  name: "Custom Console",
  short: "CUS",
  year: 9999,
  era: "Custom",
  licenseCost: 0,
  marketSize: 0.8,
  techCeiling: 1.4,
  startUnlocked: false,
  isCustom: true,
  genreAffinity: { action: "good", adventure: "good", rpg: "good", simulation: "good", strategy: "good", casual: "good" },
  audienceAffinity: { young: "good", everyone: "great", mature: "good" },
};

export const PLATFORM_COUNT = PLATFORMS.length;

export function getPlatformDef(id: string): PlatformDef | undefined {
  if (id === CUSTOM_CONSOLE.id) return CUSTOM_CONSOLE;
  return PLATFORMS.find((p) => p.id === id);
}

/** True once calendar year has reached the platform's launch year. */
export function platformIsOnMarket(p: PlatformDef, year: number): boolean {
  return !p.isCustom && p.year <= year;
}

/**
 * Platforms the player may develop on:
 * must be unlocked (licensed / start kit) and already launched.
 * Free cost does NOT imply auto-owned.
 */
export function platformsAvailableInYear(year: number, unlocked: string[]): PlatformDef[] {
  return sortPlatformsForUi(
    PLATFORMS.filter((p) => !p.isCustom && p.year <= year && unlocked.includes(p.id)),
  );
}

/** Platforms that can be licensed this year (on market, not yet owned). */
export function platformsLicensableInYear(year: number, unlocked: string[]): PlatformDef[] {
  return sortPlatformsForUi(
    PLATFORMS.filter((p) => !p.isCustom && p.year <= year && !unlocked.includes(p.id)),
  );
}

/** Upcoming launches within N years (preview only). */
export function platformsUpcoming(year: number, withinYears = 3): PlatformDef[] {
  return sortPlatformsForUi(
    PLATFORMS.filter((p) => !p.isCustom && p.year > year && p.year <= year + withinYears),
  );
}

export function sortPlatformsForUi(list: PlatformDef[]): PlatformDef[] {
  return [...list].sort((a, b) => {
    if (a.id === "pc") return -1;
    if (b.id === "pc") return 1;
    if (a.year !== b.year) return a.year - b.year;
    return a.licenseCost - b.licenseCost;
  });
}

/** Full industry hardware timeline for Market calendar UI (through TIMELINE_END_YEAR). */
export function platformTimelineEntries(fromYear = 1977, toYear = TIMELINE_END_YEAR): PlatformDef[] {
  return sortPlatformsForUi(
    PLATFORMS.filter((p) => !p.isCustom && p.year >= fromYear && p.year <= toYear),
  );
}
