/**
 * Studio Empire — shared game data hub.
 * Canonical catalogs live in content/; this file re-exports + holds balance helpers.
 */
import type {
  AudienceId,
  DevField,
  GenreDef,
  GenreId,
  MatchTier,
  PlatformDef,
  ResearchItem,
  TopicDef,
} from "./types";
import { TOPICS as CANONICAL_TOPICS } from "./content/topics";
import { PLATFORMS as CANONICAL_PLATFORMS, CUSTOM_CONSOLE } from "./content/platforms";
import {
  ENGINE_COMPONENTS,
  STARTING_ENGINE_COMPONENT_ID,
  startingEngineFeatures,
} from "./content/engines";
import {
  topicGenreTier as contentTopicGenreTier,
  topicGenreCompatibility,
  computeGenreFit,
  genreFitModifier,
} from "./content/genreFit";

export const START_YEAR = 1982;
export const WEEKS_PER_MONTH = 4;
export const WEEKS_PER_YEAR = 48;
export const SAVE_KEY = "studio-empire-save-v5";
export const SAVE_VERSION = 5;

export const STAGE_FIELDS: Record<1 | 2 | 3, DevField[]> = {
  1: ["engine", "gameplay", "story"],
  2: ["dialogue", "level", "ai"],
  3: ["world", "graphics", "sound"],
};

export const DEV_FIELDS: DevField[] = [
  "engine",
  "gameplay",
  "story",
  "dialogue",
  "level",
  "ai",
  "world",
  "graphics",
  "sound",
];

export const FIELD_LABELS: Record<DevField, string> = {
  engine: "Engine",
  gameplay: "Gameplay",
  story: "Story / Quests",
  dialogue: "Dialogues",
  level: "Level Design",
  ai: "A.I.",
  world: "World Design",
  graphics: "Graphics",
  sound: "Sound",
};

export const FIELD_TECH_WEIGHT: Record<DevField, number> = {
  engine: 0.8,
  gameplay: 0.2,
  story: 0.2,
  dialogue: 0.1,
  level: 0.6,
  ai: 0.8,
  world: 0.4,
  graphics: 0.5,
  sound: 0.4,
};

export const SIZE_STATS = {
  small: {
    label: "Small",
    cost: 10000,
    weeks: 6,
    maxScore: 7.5,
    staffSlots: 1,
    salesMult: 0.48,
    pointsMult: 0.7,
  },
  medium: {
    label: "Medium",
    cost: 50000,
    weeks: 12,
    maxScore: 9,
    staffSlots: 3,
    salesMult: 0.9,
    pointsMult: 1,
  },
  large: {
    label: "Large",
    cost: 200000,
    weeks: 24,
    maxScore: 9.6,
    staffSlots: 6,
    salesMult: 1.35,
    pointsMult: 1.45,
  },
  aaa: {
    label: "AAA",
    cost: 950000,
    weeks: 40,
    maxScore: 10,
    staffSlots: 10,
    salesMult: 1.9,
    pointsMult: 2.1,
  },
} as const;

export const AUDIENCES: { id: AudienceId; name: string }[] = [
  { id: "young", name: "Young" },
  { id: "everyone", name: "Everyone" },
  { id: "mature", name: "Mature" },
];

/** Canonical 132 topics — single source of truth. */
export const TOPICS: TopicDef[] = CANONICAL_TOPICS;

/** Exactly six top-level genres — all free at campaign start (no genre research). */
export const GENRES: GenreDef[] = [
  {
    id: "action",
    name: "Action",
    techBias: 1.8,
    researchCost: 0,
    startUnlocked: true,
    stageFocus: {
      1: ["engine", "gameplay"],
      2: ["level", "ai"],
      3: ["graphics", "sound"],
    },
    avoid: ["dialogue"],
  },
  {
    id: "adventure",
    name: "Adventure",
    techBias: 0.4,
    researchCost: 0,
    startUnlocked: true,
    stageFocus: {
      1: ["story", "gameplay"],
      2: ["dialogue", "level"],
      3: ["world", "sound"],
    },
    avoid: ["ai"],
  },
  {
    id: "rpg",
    name: "RPG",
    techBias: 0.6,
    researchCost: 0,
    startUnlocked: true,
    stageFocus: {
      1: ["story", "gameplay"],
      2: ["dialogue", "level"],
      3: ["world", "graphics"],
    },
    avoid: [],
  },
  {
    id: "simulation",
    name: "Simulation",
    techBias: 1.6,
    researchCost: 0,
    startUnlocked: true,
    stageFocus: {
      1: ["engine", "gameplay"],
      2: ["ai", "level"],
      3: ["world", "graphics"],
    },
    avoid: ["dialogue"],
  },
  {
    id: "strategy",
    name: "Strategy",
    techBias: 1.4,
    researchCost: 0,
    startUnlocked: true,
    stageFocus: {
      1: ["engine", "gameplay"],
      2: ["ai", "level"],
      3: ["world", "sound"],
    },
    avoid: ["dialogue"],
  },
  {
    id: "casual",
    name: "Casual",
    techBias: 0.5,
    researchCost: 0,
    startUnlocked: true,
    stageFocus: {
      1: ["gameplay", "story"],
      2: ["level", "sound"],
      3: ["graphics", "sound"],
    },
    avoid: ["dialogue", "story"],
  },
];

/** @deprecated use topicGenreCompatibility / computeGenreFit — kept as tier map for legacy UI. */
export const TOPIC_GENRE: Record<string, Partial<Record<GenreId, MatchTier>>> = Object.fromEntries(
  TOPICS.map((t) => [
    t.id,
    Object.fromEntries(
      (Object.entries(t.compatibility) as [GenreId, number][]).map(([g, v]) => [
        g,
        contentTopicGenreTier(t.id, g),
      ]),
    ),
  ]),
);

/** Canonical 40 platforms (Custom Console separate). */
export const PLATFORMS: PlatformDef[] = CANONICAL_PLATFORMS;
export { CUSTOM_CONSOLE, ENGINE_COMPONENTS, STARTING_ENGINE_COMPONENT_ID, startingEngineFeatures };
export { topicGenreCompatibility, computeGenreFit, genreFitModifier, contentTopicGenreTier as topicGenreTierFromContent };

/** Studio + size research (non-engine). No genre unlock research — all 6 genres free. */
const STUDIO_RESEARCH: ResearchItem[] = [
  { id: "medium_games", name: "Medium Games", category: "Studio", cost: 80, description: "Larger projects. Requires first office and a hired teammate before you can start one.", unlocksSize: "medium", weeks: 4 },
  { id: "large_games", name: "Large Games", category: "Studio", cost: 200, description: "Ambitious multi-year productions.", unlocksSize: "large", requires: ["medium_games"], weeks: 6 },
  { id: "aaa_games", name: "AAA Production", category: "Studio", cost: 500, description: "Blockbuster scale.", unlocksSize: "aaa", requires: ["large_games"], weeks: 8, minYear: 2005 },
  { id: "target_audience", name: "Target Audience", category: "Studio", cost: 45, description: "Market to Young, Everyone, or Mature.", unlocksAudience: true },
  { id: "marketing", name: "Marketing 101", category: "Studio", cost: 60, description: "Spend on hype before release.", unlocksMarketing: true },
  { id: "contracts", name: "Contract Work", category: "Studio", cost: 50, description: "Take freelance contracts for cash & RP.", unlocksContracts: true },
  { id: "sequels", name: "Series Continuity", category: "Production", cost: 100, description: "Sequels after past hits (~15 RP). Unlocks sequel projects early.", unlocksSequel: true, weeks: 3 },
  { id: "series_continuity", name: "Series Continuity (legacy)", category: "Production", cost: 15, description: "Alias research node for continuity.", unlocksSequel: true, weeks: 2, requires: ["sequels"] },
  { id: "multi_genre", name: "Multi-Genre", category: "Production", cost: 160, description: "Combine genres on one title (capacity tier 2+).", unlocksMultiGenre: true },
];

function engineResearchItems(): ResearchItem[] {
  return ENGINE_COMPONENTS.filter((c) => c.researchable).map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    cost: c.researchCost,
    description: `Engine component: ${c.name}. Assemble in Engines workshop.`,
    requires: c.requires,
    engineFeature: c.engineFeature ?? c.name,
    designBoost: c.category.includes("Story") || c.category === "Dialogue" || c.category === "Gameplay" ? 3 : undefined,
    techBoost: c.category === "Graphics" || c.category === "Engine" || c.category.includes("Intelligence") ? 3 : undefined,
    weeks: 2,
  }));
}

export const RESEARCH: ResearchItem[] = [...STUDIO_RESEARCH, ...engineResearchItems()];

/** Empty — genres are free; kept for save migration only. */
export const GENRE_RESEARCH_MAP: Record<string, GenreId> = {};

export const STAFF_FIRST = [
  "Alex", "Sam", "Jordan", "Riley", "Casey", "Morgan", "Quinn", "Avery",
  "Jamie", "Taylor", "Drew", "Reese", "Skyler", "Cameron", "Parker", "Logan",
  "Kai", "Nova", "Remy", "Sage",
];
export const STAFF_LAST = [
  "Chen", "Okada", "Reyes", "Singh", "Novak", "Baker", "Ito", "Mensah",
  "Costa", "Nguyen", "Petrov", "Walsh", "Kim", "Hassan", "Berg", "Diaz",
];

export const REVIEWER_NAMES = [
  "PixelPulse", "CtrlAltElite", "GameBound Weekly", "Joystick Journal", "BitCritic",
];

export const OFFICE_INFO = {
  1: {
    name: "Garage",
    rent: 0,
    capacity: 1,
    upgradeCost: 1_000_000,
    fanRequirement: 25_000,
    gamesRequirement: 5,
    cashRequirement: 1_000_000,
    /** Earliest calendar: Year 2 Month 10 (pacing floor only). */
    minYear: 1983,
    minMonth: 10,
  },
  2: { name: "Small Office", rent: 2000, capacity: 4, upgradeCost: 1_200_000, fanRequirement: 0, gamesRequirement: 0, cashRequirement: 0 },
  3: { name: "Downtown Studio", rent: 8000, capacity: 8, upgradeCost: 5_000_000, fanRequirement: 0, gamesRequirement: 0, cashRequirement: 0 },
  4: { name: "HQ Campus", rent: 25000, capacity: 14, upgradeCost: 0, fanRequirement: 0, gamesRequirement: 0, cashRequirement: 0 },
} as const;

/** Map compatibility rank / MatchTier → 0.6–1.0 product space. */
export function matchScore(tier: MatchTier | undefined | number): number {
  if (typeof tier === "number") {
    return 0.7 + (tier / 100) * 0.4;
  }
  switch (tier) {
    case "great":
      return 1.0;
    case "good":
      return 0.9;
    case "ok":
      return 0.8;
    case "poor":
      return 0.7;
    case "bad":
      return 0.6;
    default:
      return 0.8;
  }
}

export function getTopic(id: string) {
  return TOPICS.find((t) => t.id === id);
}
export function getGenre(id: GenreId) {
  return GENRES.find((g) => g.id === id)!;
}
export function getPlatform(id: string) {
  if (id === CUSTOM_CONSOLE.id) return CUSTOM_CONSOLE;
  return PLATFORMS.find((p) => p.id === id)!;
}

export function defaultSliders(genreId: GenreId): Record<DevField, number> {
  const g = getGenre(genreId);
  const base: Record<DevField, number> = {
    engine: 40,
    gameplay: 40,
    story: 40,
    dialogue: 40,
    level: 40,
    ai: 40,
    world: 40,
    graphics: 40,
    sound: 40,
  };
  for (const f of g.stageFocus[1]) base[f] = 80;
  for (const f of g.stageFocus[2]) base[f] = Math.max(base[f], 70);
  for (const f of g.stageFocus[3]) base[f] = Math.max(base[f], 65);
  for (const f of g.avoid) base[f] = 15;
  return base;
}

export function topicGenreTier(topicId: string, genreId: GenreId): MatchTier {
  return contentTopicGenreTier(topicId, genreId);
}

/** Base size cost scaled by platform tech/market (and small license friction). */
export function projectDevelopmentCost(
  size: keyof typeof SIZE_STATS,
  platformId: string,
  marketingSpend = 0,
): number {
  const base = SIZE_STATS[size].cost;
  const p = getPlatform(platformId);
  if (!p) return base + marketingSpend;
  const mult = 0.72 + p.techCeiling * 0.38 + p.marketSize * 0.12;
  const platformFriction = Math.round(p.licenseCost * 0.04);
  return Math.round(base * mult) + platformFriction + marketingSpend;
}

/** Human-readable platform cost multiplier for UI. */
export function platformCostMultiplier(platformId: string): number {
  const p = getPlatform(platformId);
  if (!p) return 1;
  return Math.round((0.72 + p.techCeiling * 0.38 + p.marketSize * 0.12) * 100) / 100;
}
