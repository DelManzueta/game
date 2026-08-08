/**
 * External market factors — genre waves, trade shows, creators, media partnerships.
 * Inspired by classic GDT trade-show / trend loops and Netflix GDT-style
 * licensed topics + streamer promo — reimplemented as original Studio Empire fiction.
 */
import type { GenreId } from "../types";

export type GenreWave = {
  id: string;
  yearStart: number;
  yearEnd: number;
  label: string;
  /** Multipliers applied to genre trend momentum (centered on 1). */
  hot: Partial<Record<GenreId, number>>;
  cold?: Partial<Record<GenreId, number>>;
};

/** Long arc of what the public is hungry for by era. */
export const GENRE_WAVES: GenreWave[] = [
  {
    id: "arcade_boom",
    yearStart: 1979,
    yearEnd: 1987,
    label: "Arcade & living-room action boom",
    hot: { action: 1.18, casual: 1.1 },
    cold: { simulation: 0.9, strategy: 0.92 },
  },
  {
    id: "adventure_home",
    yearStart: 1986,
    yearEnd: 1992,
    label: "Narrative adventure on home computers",
    hot: { adventure: 1.16, rpg: 1.08 },
    cold: { casual: 0.94 },
  },
  {
    id: "rpg_console",
    yearStart: 1990,
    yearEnd: 1998,
    label: "Console RPG golden age",
    hot: { rpg: 1.2, adventure: 1.1 },
    cold: { strategy: 0.93 },
  },
  {
    id: "sim_strategy_pc",
    yearStart: 1993,
    yearEnd: 2001,
    label: "PC sim & strategy renaissance",
    hot: { simulation: 1.18, strategy: 1.16 },
    cold: { casual: 0.95 },
  },
  {
    id: "action_3d",
    yearStart: 1996,
    yearEnd: 2005,
    label: "3D action mainstream",
    hot: { action: 1.22, adventure: 1.08 },
    cold: { strategy: 0.92 },
  },
  {
    id: "online_casual",
    yearStart: 2004,
    yearEnd: 2012,
    label: "Online & casual wave",
    hot: { casual: 1.2, action: 1.08, rpg: 1.1 },
  },
  {
    id: "prestige_story",
    yearStart: 2010,
    yearEnd: 2018,
    label: "Prestige story-driven games",
    hot: { adventure: 1.18, rpg: 1.14 },
    cold: { casual: 0.96 },
  },
  {
    id: "live_service_mix",
    yearStart: 2016,
    yearEnd: 2026,
    label: "Live services & hybrid hits",
    hot: { action: 1.14, casual: 1.12, rpg: 1.1, simulation: 1.08 },
  },
];

export function activeGenreWaves(year: number): GenreWave[] {
  return GENRE_WAVES.filter((w) => year >= w.yearStart && year <= w.yearEnd);
}

/** Combined per-genre multiplier from all active waves (multiplicative). */
export function genreWaveMultiplier(year: number): Record<GenreId, number> {
  const base: Record<GenreId, number> = {
    action: 1,
    adventure: 1,
    rpg: 1,
    simulation: 1,
    strategy: 1,
    casual: 1,
  };
  for (const w of activeGenreWaves(year)) {
    for (const [g, m] of Object.entries(w.hot)) {
      const k = g as GenreId;
      base[k] *= m ?? 1;
    }
    if (w.cold) {
      for (const [g, m] of Object.entries(w.cold)) {
        const k = g as GenreId;
        base[k] *= m ?? 1;
      }
    }
  }
  // clamp
  for (const g of Object.keys(base) as GenreId[]) {
    base[g] = Math.max(0.82, Math.min(1.32, base[g]!));
  }
  return base;
}

export type CreatorDef = {
  id: string;
  name: string;
  handle: string;
  minYear: number;
  /** Preferred genres for bonus */
  genres: GenreId[];
  /** Preferred topic ids (optional) */
  topics?: string[];
  cost: number;
  /** Added marketing reach mult when booked on a release */
  reachBoost: number;
  hypeBoost: number;
  fanBoost: number;
  bio: string;
};

/** In-universe creators (Netflix GDT streamer idea, original cast). */
export const CREATORS: CreatorDef[] = [
  {
    id: "binja",
    name: "B1n-Ja",
    handle: "@binja",
    minYear: 2008,
    genres: ["action", "casual"],
    topics: ["sports", "racing", "football"],
    cost: 8000,
    reachBoost: 1.12,
    hypeBoost: 10,
    fanBoost: 180,
    bio: "High-energy sports & arcade streams.",
  },
  {
    id: "kopename",
    name: "KopeName",
    handle: "@kopename",
    minYear: 2009,
    genres: ["simulation", "strategy"],
    topics: ["space", "city", "airplane"],
    cost: 9000,
    reachBoost: 1.1,
    hypeBoost: 8,
    fanBoost: 150,
    bio: "Chill builders and space sims.",
  },
  {
    id: "breakoff",
    name: "Let's Break That Off",
    handle: "@breakoff",
    minYear: 2010,
    genres: ["simulation", "casual"],
    topics: ["city", "hospital", "farming"],
    cost: 7500,
    reachBoost: 1.08,
    hypeBoost: 9,
    fanBoost: 140,
    bio: "City builders and cozy systems.",
  },
  {
    id: "upset_geek",
    name: "The Upset Game Geek",
    handle: "@upsetgeek",
    minYear: 2007,
    genres: ["rpg", "adventure"],
    topics: ["fantasy", "medieval", "dungeon"],
    cost: 10000,
    reachBoost: 1.14,
    hypeBoost: 12,
    fanBoost: 220,
    bio: "Rant-reviews that still sell fantasy RPGs.",
  },
  {
    id: "sirdmv",
    name: "SirDMV",
    handle: "@sirdmv",
    minYear: 2011,
    genres: ["action", "adventure"],
    topics: ["assassin", "thief", "spy"],
    cost: 11000,
    reachBoost: 1.15,
    hypeBoost: 11,
    fanBoost: 200,
    bio: "Stealth and stylish action drops.",
  },
  {
    id: "blind_bill",
    name: "Blind Bill",
    handle: "@blindbill",
    minYear: 2008,
    genres: ["adventure", "rpg"],
    topics: ["aliens", "ufo", "space"],
    cost: 8500,
    reachBoost: 1.1,
    hypeBoost: 9,
    fanBoost: 160,
    bio: "Sci-fi blind playthroughs.",
  },
  {
    id: "cybervopp",
    name: "CyberVsOpp",
    handle: "@cybervopp",
    minYear: 2012,
    genres: ["action", "rpg"],
    topics: ["superheroes", "super_villain", "cyberpunk"],
    cost: 12000,
    reachBoost: 1.16,
    hypeBoost: 14,
    fanBoost: 240,
    bio: "Cape fights and chrome nights.",
  },
  {
    id: "champ_veg",
    name: "ChampionVeg",
    handle: "@champveg",
    minYear: 2010,
    genres: ["action", "adventure"],
    topics: ["police", "crime", "detective"],
    cost: 9000,
    reachBoost: 1.11,
    hypeBoost: 10,
    fanBoost: 170,
    bio: "Crime sagas and detective nights.",
  },
  {
    id: "hereisharu",
    name: "HereIsHaru",
    handle: "@hereisharu",
    minYear: 2013,
    genres: ["adventure", "casual"],
    topics: ["aliens", "ufo", "robots"],
    cost: 7000,
    reachBoost: 1.09,
    hypeBoost: 8,
    fanBoost: 130,
    bio: "Wholesome alien & robot stories.",
  },
  {
    id: "riff_spiff",
    name: "Riffing Spiff",
    handle: "@riffspiff",
    minYear: 2011,
    genres: ["adventure", "strategy"],
    topics: ["dystopian", "post_apocalyptic", "cyberpunk"],
    cost: 9500,
    reachBoost: 1.12,
    hypeBoost: 11,
    fanBoost: 190,
    bio: "Dystopian deep dives with comedy riffs.",
  },
];

export function creatorsAvailable(year: number): CreatorDef[] {
  return CREATORS.filter((c) => year >= c.minYear);
}

export function creatorFitBonus(
  creator: CreatorDef,
  genreId: GenreId,
  topicId: string,
): number {
  let m = 1;
  if (creator.genres.includes(genreId)) m *= 1.08;
  if (creator.topics?.includes(topicId)) m *= 1.1;
  return m;
}

/** Original media-partnership topics (licensed-topic fantasy without real IP). */
export const MEDIA_TOPICS: {
  id: string;
  name: string;
  homeGenre: GenreId;
  unlockYear: number;
  blurb: string;
}[] = [
  {
    id: "media_orange_block",
    name: "Orange Block (licensed)",
    homeGenre: "adventure",
    unlockYear: 2013,
    blurb: "Gritty ensemble drama license — strong mature adventure/RPG angle.",
  },
  {
    id: "media_squish_run",
    name: "Squish Run (licensed)",
    homeGenre: "action",
    unlockYear: 2021,
    blurb: "Viral survival spectacle license — action/casual spikes hard.",
  },
  {
    id: "media_crown_circuit",
    name: "Crown Circuit (licensed)",
    homeGenre: "simulation",
    unlockYear: 2016,
    blurb: "Period prestige license — simulation & strategy fans lean in.",
  },
  {
    id: "media_stranger_pixels",
    name: "Stranger Pixels (licensed)",
    homeGenre: "adventure",
    unlockYear: 2016,
    blurb: "Synth-horror kids-on-bikes license — adventure/action gold.",
  },
  {
    id: "media_witcher_ward",
    name: "Witcher Ward (licensed)",
    homeGenre: "rpg",
    unlockYear: 2019,
    blurb: "Monster-hunter prestige license — RPG first, adventure second.",
  },
];

export type TradeShowDef = {
  id: string;
  /** Month (1–12) — fires each year from startYear */
  month: number;
  startYear: number;
  endYear: number;
  name: string;
  body: string;
};

/** Recurring G3 Expo (classic GDT trade-show loop). */
export const TRADE_SHOWS: TradeShowDef[] = [
  {
    id: "g3_expo",
    month: 6,
    startYear: 1985,
    endYear: 2030,
    name: "G3 Expo booth",
    body:
      "The Global Game Gathering (G3) opens next week. A booth can juice awareness for your last release and the next pitch — " +
      "but bigger floor space costs real money, and empty booths look worse than no booth.",
  },
  {
    id: "winter_showcase",
    month: 1,
    startYear: 1998,
    endYear: 2030,
    name: "Winter Digital Showcase",
    body:
      "A online-first showcase is collecting trailer slots. Paying in gets algorithmic push; skipping keeps cash for polish.",
  },
];

export function tradeShowKey(showId: string, year: number): string {
  return `story:tradeshow_${showId}_${year}`;
}
