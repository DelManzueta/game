/**
 * Garage Phase One — progressive content exposure.
 * Full catalogs live in topics/platforms; this gates what a new campaign starts with.
 * Campaign opens in 1979: early home computers + pre-crash consoles only.
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
 * Early platforms the garage can eventually reach (not all day-one unlocked).
 * Availability still requires year + license (except PC + Itara start kit).
 */
export const GARAGE_PLATFORM_IDS = ["pc", "itara", "commodore", "arcade", "tes", "master_v"] as const;

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

/** 1979 garage: home computer + mature Itara console. TES arrives 1985. */
export const GARAGE_START_PLATFORMS = ["pc", "commodore"] as const;

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
