/**
 * Deterministic market bootstrap from campaign seed.
 */
import type { GenreId } from "../types";
import { PLATFORMS, START_YEAR, TOPICS } from "../data";
import type {
  MarketState,
  MarketTrend,
  PlatformMarketState,
  RivalStudio,
  RivalStrategy,
} from "./types";
import { marketRng, seededPick } from "./rng";

const STRATEGIES: RivalStrategy[] = [
  "boutique",
  "tech_specialist",
  "narrative",
  "mass_market",
  "trend_chaser",
  "innovator",
  "franchise_factory",
  "platform_loyalist",
  "budget",
  "prestige",
];

const RIVAL_NAMES = [
  "ByteForge",
  "Northline Interactive",
  "PixelHarbor",
  "Aether Works",
  "Copper Lamp Studios",
  "Red Circuit Games",
  "Lumen Soft",
  "Cascade Play",
  "Iron Lotus",
  "Quiet Sun Games",
  "Vector Nest",
  "Mothlight Entertainment",
];

const GENRES: GenreId[] = [
  "action",
  "adventure",
  "rpg",
  "simulation",
  "strategy",
  "casual",
];

export function emptyMarketState(): MarketState {
  return {
    version: 1,
    initialized: false,
    rivals: [],
    platforms: [],
    trends: [],
    news: [],
    calendar: [],
    fatigue: {},
    lastSnapshot: null,
    rivalGamesOnSale: [],
    rngCounters: { rival: 0, trend: 0, platform: 0, news: 0 },
  };
}

export function initMarket(campaignSeed: number, startWeek = 0): MarketState {
  const rng = marketRng(campaignSeed, "init", 0);
  const rivals: RivalStudio[] = [];
  const names = [...RIVAL_NAMES];
  // shuffle names deterministically
  for (let i = names.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [names[i], names[j]] = [names[j]!, names[i]!];
  }

  for (let i = 0; i < 6; i++) {
    const strategy = STRATEGIES[i % STRATEGIES.length]!;
    const genreBeliefs: Partial<Record<GenreId, number>> = {};
    for (const g of GENRES) genreBeliefs[g] = 0.4 + rng.range(0, 0.4);
    // identity bias
    if (strategy === "narrative") {
      genreBeliefs.adventure = 0.9;
      genreBeliefs.rpg = 0.85;
    }
    if (strategy === "tech_specialist") {
      genreBeliefs.simulation = 0.85;
      genreBeliefs.strategy = 0.8;
    }
    if (strategy === "mass_market" || strategy === "budget") {
      genreBeliefs.casual = 0.9;
      genreBeliefs.action = 0.8;
    }
    if (strategy === "prestige") {
      genreBeliefs.rpg = 0.85;
      genreBeliefs.adventure = 0.8;
    }

    rivals.push({
      id: `rival_${i}`,
      name: names[i] ?? `Studio ${i}`,
      foundedWeek: startWeek - rng.int(20, 200),
      status: "active",
      cash: 80_000 + rng.int(0, 200_000),
      reputation: 25 + rng.int(0, 40),
      fanBase: rng.int(500, 12000),
      riskTolerance: rng.range(0.2, 0.9),
      trendResponsiveness: strategy === "trend_chaser" ? 0.9 : rng.range(0.2, 0.7),
      innovationPreference: strategy === "innovator" ? 0.9 : rng.range(0.2, 0.7),
      qualityPreference: strategy === "prestige" || strategy === "boutique" ? 0.85 : rng.range(0.35, 0.75),
      franchisePreference: strategy === "franchise_factory" ? 0.9 : rng.range(0.2, 0.6),
      strategy,
      disciplineCap: {
        design: 40 + rng.int(0, 30),
        tech: 40 + rng.int(0, 30),
        speed: 40 + rng.int(0, 25),
      },
      genreBeliefs,
      platformLoyalties: { pc: 0.7 + rng.range(0, 0.3) },
      activeProject: null,
      releaseHistory: [],
      weeksSinceProject: rng.int(0, 8),
    });
  }

  // Era platforms at start (START_YEAR) — max 4 active
  const early = PLATFORMS.filter((p) => p.year <= START_YEAR + 2).slice(0, 4);
  const platforms: PlatformMarketState[] = early.map((p, idx) => {
    const pr = marketRng(campaignSeed, "platform", idx, p.id);
    const lead = pr.range(0.85, 1.2);
    return {
      id: p.id,
      name: p.name,
      short: p.short,
      launchYear: p.year,
      launchWeek: Math.max(0, (p.year - START_YEAR) * 48),
      hardwareQuality: 0.5 + p.techCeiling * 0.3 + pr.range(0, 0.15),
      price: 200 + pr.int(0, 150),
      licenseCost: p.licenseCost,
      marketSizeBase: p.marketSize,
      installedBase: p.year <= START_YEAR ? 200_000 * p.marketSize * lead : 0,
      activeUsers: p.year <= START_YEAR ? 160_000 * p.marketSize * lead : 0,
      brandStrength: 0.4 + pr.range(0, 0.4),
      momentum: lead,
      catalogStrength: 0.3 + pr.range(0, 0.3),
      exclusiveStrength: pr.range(0.1, 0.35),
      lifecycle: p.year < START_YEAR ? "mature" : p.year === START_YEAR ? "growth" : "announced",
      techCeiling: p.techCeiling,
    };
  });

  const trends: MarketTrend[] = GENRES.map((g, i) => ({
    key: `genre:${g}`,
    kind: "genre" as const,
    subjectId: g,
    momentum: 0.92 + marketRng(campaignSeed, "trend", i).range(0, 0.16),
    publicAwareness: 0.3 + marketRng(campaignSeed, "trendA", i).range(0, 0.3),
    saturation: marketRng(campaignSeed, "trendS", i).range(0, 0.15),
    startedWeek: 0,
    lastChangeWeek: 0,
    cause: "baseline",
  }));

  // A few topic trends
  for (const t of TOPICS.filter((x) => x.startUnlocked).slice(0, 4)) {
    const i = trends.length;
    trends.push({
      key: `topic:${t.id}`,
      kind: "topic",
      subjectId: t.id,
      momentum: 0.95 + marketRng(campaignSeed, "topicT", i).range(0, 0.1),
      publicAwareness: 0.25,
      saturation: 0.05,
      startedWeek: 0,
      lastChangeWeek: 0,
      cause: "baseline",
    });
  }

  return {
    version: 1,
    initialized: true,
    rivals,
    platforms,
    trends,
    news: [
      {
        id: `news_boot_${campaignSeed}`,
        week: 0,
        category: "industry",
        headline: "A new generation of garage developers enters the market",
        body: "Analysts note six active mid-tier studios competing for early platform attention.",
        causeEntityIds: rivals.map((r) => r.id),
      },
    ],
    calendar: platforms
      .filter((p) => p.lifecycle === "announced" || p.lifecycle === "growth")
      .map((p) => ({
        id: `cal_plat_${p.id}`,
        week: p.launchWeek,
        kind: "platform" as const,
        title: `${p.name} ${p.lifecycle === "announced" ? "launch window" : "active"}`,
        detail: `Lifecycle: ${p.lifecycle}`,
        entityId: p.id,
        public: true,
      })),
    fatigue: {},
    lastSnapshot: null,
    rivalGamesOnSale: [],
    rngCounters: { rival: 1, trend: 1, platform: 1, news: 1 },
  };
}

export { GENRES };
