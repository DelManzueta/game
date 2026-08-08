/**
 * Garage Phase One — progressive content exposure.
 * Full catalogs live in topics/platforms; this gates what a new campaign starts with.
 */
import { GENRES, PLATFORMS, TOPICS } from "../data";
import type { GenreId } from "../types";

/** Topics researchable in early garage (subset of 132). */
export const GARAGE_TOPIC_IDS = [
  "space",
  "fantasy",
  "racing",
  "dungeon",
  "military",
  "detective",
  "pirate",
  "business",
  "sports",
  "zombies",
  "comedy",
  "history",
] as const;

/**
 * Decade-1 platforms the garage can eventually reach (not day-one unlocked).
 * Availability still requires year + license (except PC).
 */
export const GARAGE_PLATFORM_IDS = [
  "pc",
  "commodore",
  "arcade",
  "itara_5200",
  "tes",
  "master_v",
  "vena_oasis",
  "vena_genesis_x",
  "gameling",
  "super_tes",
] as const;

export const GARAGE_GENRE_IDS: GenreId[] = [
  "action",
  "adventure",
  "rpg",
  "simulation",
  "strategy",
  "casual",
];

export const GARAGE_START_TOPICS = ["space", "fantasy", "racing", "dungeon"] as const;
export const GARAGE_START_GENRES: GenreId[] = [
  "action",
  "adventure",
  "rpg",
  "simulation",
  "strategy",
  "casual",
];

/** Day one: PC only. No Commodore, Atari, or Arcade until their years. */
export const GARAGE_START_PLATFORMS = ["pc"] as const;

export function garageTopics() {
  return TOPICS.filter((t) => (GARAGE_TOPIC_IDS as readonly string[]).includes(t.id));
}

export function garagePlatforms() {
  return PLATFORMS.filter((p) => (GARAGE_PLATFORM_IDS as readonly string[]).includes(p.id));
}

export function garageGenres() {
  return GENRES.filter((g) => GARAGE_GENRE_IDS.includes(g.id));
}

export function isGarageTopic(id: string): boolean {
  return (GARAGE_TOPIC_IDS as readonly string[]).includes(id);
}

export function isGaragePlatform(id: string): boolean {
  return (GARAGE_PLATFORM_IDS as readonly string[]).includes(id);
}
