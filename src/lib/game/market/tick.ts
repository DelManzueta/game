/**
 * Weekly market simulation tick — fixed order, deterministic.
 */
import type { GenreId, ReleasedGame } from "../types";
import type { MarketState, RivalProject, WeeklyMarketSnapshot } from "./types";
import { initMarket } from "./init";
import { marketRng } from "./rng";
import { competitionModifierFor, rivalToCompetitor, type CompetitorRef } from "./competition";
import { maybeStartRivalProject, progressRivalProject } from "./rivals";

export type PlayerSaleContext = {
  games: ReleasedGame[];
};

export type MarketTickResult = {
  market: MarketState;
  /** competition modifier by player game id for this week */
  playerCompetition: Record<string, number>;
  /** platform active user factor by platform id (for sales) */
  platformActiveFactor: Record<string, number>;
  /** genre momentum for sales */
  genreMomentum: Partial<Record<GenreId, number>>;
  notifications: string[];
};

function ensureMarket(market: MarketState | null | undefined, seed: number): MarketState {
  if (market?.initialized) return market;
  return initMarket(seed, 0);
}

export function tickMarket(opts: {
  market: MarketState | null | undefined;
  campaignSeed: number;
  week: number;
  year: number;
  playerGamesOnSale: ReleasedGame[];
  playerReleasedThisWeek?: ReleasedGame | null;
}): MarketTickResult {
  let market = ensureMarket(opts.market, opts.campaignSeed);
  const notifications: string[] = [];
  const seed = opts.campaignSeed;
  let cRival = market.rngCounters.rival;
  let cTrend = market.rngCounters.trend;
  let cPlat = market.rngCounters.platform;
  let cNews = market.rngCounters.news;

  // 1–2 platforms
  market = {
    ...market,
    platforms: market.platforms.map((p) => {
      const ageWeeks = opts.week - p.launchWeek;
      let lifecycle = p.lifecycle;
      let active = p.activeUsers;
      let installed = p.installedBase;
      let momentum = p.momentum;
      if (lifecycle === "announced" && opts.week >= p.launchWeek) {
        lifecycle = "launch";
        active = Math.max(active, 40_000 * p.marketSizeBase);
        installed = Math.max(installed, active);
        market.news = [
          {
            id: `news_launch_${p.id}_${opts.week}`,
            week: opts.week,
            category: "platform",
            headline: `${p.name} launches`,
            body: `Early adopters drive initial hardware sales.`,
            causeEntityIds: [p.id],
          },
          ...market.news,
        ].slice(0, 40);
      } else if (lifecycle === "launch" && ageWeeks > 24) lifecycle = "growth";
      else if (lifecycle === "growth" && ageWeeks > 96) lifecycle = "mature";
      else if (lifecycle === "mature" && ageWeeks > 200) lifecycle = "decline";
      else if (lifecycle === "decline" && ageWeeks > 320) lifecycle = "discontinued";

      const rng = marketRng(seed, "plat_tick", cPlat++, p.id, opts.week);
      if (lifecycle === "discontinued") {
        active *= 0.97;
      } else if (lifecycle !== "rumored" && lifecycle !== "announced") {
        const adopt = Math.max(0, 1 - ageWeeks / 400) * momentum * (0.008 + rng.range(0, 0.004));
        const newUsers = (500_000 * p.marketSizeBase - installed) * adopt;
        installed += Math.max(0, newUsers);
        const churn = active * (lifecycle === "decline" ? 0.02 : 0.008);
        active = Math.max(0, active + newUsers * 0.85 - churn);
        momentum = momentum * 0.995 + (active / (installed + 1)) * 0.01;
      }
      return {
        ...p,
        lifecycle,
        activeUsers: active,
        installedBase: installed,
        momentum: Math.max(0.4, Math.min(1.4, momentum)),
      };
    }),
  };

  // 3 rival progress + planning
  const newReleases: RivalProject[] = [];
  const rivals = market.rivals.map((studio) => {
    if (studio.status === "bankrupt") return studio;
    let s = studio;
    // finances burn
    s = { ...s, cash: s.cash - 800 };
    if (s.cash < 0) {
      s = { ...s, status: s.cash < -30000 ? "bankrupt" : "struggling" };
      if (s.status === "bankrupt") {
        market.news = [
          {
            id: `news_br_${s.id}_${opts.week}`,
            week: opts.week,
            category: "studio",
            headline: `${s.name} closes its doors`,
            body: "Financial pressure ends the studio's run.",
            causeEntityIds: [s.id],
          },
          ...market.news,
        ].slice(0, 40);
        notifications.push(`${s.name} went bankrupt.`);
      }
    }
    const prog = progressRivalProject(s, market, seed, opts.week, cRival++);
    s = prog.studio;
    if (prog.news.length) market.news = [...prog.news, ...market.news].slice(0, 40);
    if (prog.released) newReleases.push(prog.released);
    s = maybeStartRivalProject(s, market, seed, opts.week, cRival++);
    return s;
  });
  market = { ...market, rivals };

  // Add new releases to on-sale
  let rivalOnSale = [
    ...newReleases,
    ...market.rivalGamesOnSale.filter((g) => g.onSale),
  ];

  // Calendar entries for public announces/releases
  const calendarAdds = [];
  for (const r of newReleases) {
    calendarAdds.push({
      id: `cal_rel_${r.id}`,
      week: opts.week,
      kind: "rival_release" as const,
      title: r.title,
      detail: `Released · avg ${r.avgReview.toFixed(1)}`,
      entityId: r.id,
      public: true,
    });
  }
  for (const s of rivals) {
    const p = s.activeProject;
    if (p?.announced && p.announcedWeek === opts.week) {
      calendarAdds.push({
        id: `cal_ann_${p.id}`,
        week: p.plannedReleaseWeek,
        kind: "rival_announce" as const,
        title: p.title,
        detail: `Announced by ${s.name}`,
        entityId: p.id,
        public: true,
      });
    }
  }
  if (opts.playerReleasedThisWeek) {
    calendarAdds.push({
      id: `cal_player_${opts.playerReleasedThisWeek.id}`,
      week: opts.week,
      kind: "player_release" as const,
      title: opts.playerReleasedThisWeek.title,
      detail: `Your release · ${opts.playerReleasedThisWeek.avgReview.toFixed(1)}`,
      entityId: opts.playerReleasedThisWeek.id,
      public: true,
    });
  }

  // 5 build competition set
  const competitors: CompetitorRef[] = [
    ...rivalOnSale.map(rivalToCompetitor),
    ...opts.playerGamesOnSale.map((g) => ({
      id: g.id,
      genreId: g.genreId,
      platformId: g.platformId,
      topicId: g.topicId,
      size: g.size,
      releaseWeek: g.weekReleased,
      awareness: Math.min(0.95, 0.2 + g.marketingSpend / 100000 + g.avgReview / 25 + g.hype / 200),
      avgReview: g.avgReview,
      marketingSpend: g.marketingSpend,
      isPlayer: true,
    })),
  ];
  if (opts.playerReleasedThisWeek) {
    const g = opts.playerReleasedThisWeek;
    if (!competitors.some((c) => c.id === g.id)) {
      competitors.push({
        id: g.id,
        genreId: g.genreId,
        platformId: g.platformId,
        topicId: g.topicId,
        size: g.size,
        releaseWeek: g.weekReleased,
        awareness: Math.min(0.95, 0.25 + g.marketingSpend / 80000),
        avgReview: g.avgReview,
        marketingSpend: g.marketingSpend,
        isPlayer: true,
      });
    }
  }

  const competitionByGameId: Record<string, number> = {};
  for (const c of competitors) {
    competitionByGameId[c.id] = competitionModifierFor(c, competitors, opts.week);
  }

  // 6 rival weekly sales with competition
  rivalOnSale = rivalOnSale.map((g) => {
    if (!g.onSale || g.weeklySalesLeft.length === 0) {
      return { ...g, onSale: false };
    }
    const unitsBase = g.weeklySalesLeft[0] ?? 0;
    const mod = competitionByGameId[g.id] ?? 1;
    const units = Math.max(0, Math.round(unitsBase * mod));
    const price = g.size === "medium" ? 40 : 25;
    const rev = units * price * 0.7;
    // pay studio
    const studioIdx = rivals.findIndex((s) => s.id === g.studioId);
    if (studioIdx >= 0) {
      rivals[studioIdx] = {
        ...rivals[studioIdx]!,
        cash: rivals[studioIdx]!.cash + rev,
        fanBase: rivals[studioIdx]!.fanBase + Math.round(units * 0.01),
      };
    }
    return {
      ...g,
      weeklySalesLeft: g.weeklySalesLeft.slice(1),
      sales: g.sales + units,
      revenue: g.revenue + rev,
      competitionModifier: mod,
      weeklyHistory: [
        ...g.weeklyHistory,
        { week: opts.week, units, revenue: rev, competitionModifier: mod },
      ],
      onSale: g.weeklySalesLeft.length > 1,
    };
  });
  market = { ...market, rivals, rivalGamesOnSale: rivalOnSale.filter((g) => g.onSale) };

  // 8 trends + fatigue
  const trends = market.trends.map((t) => {
    const rng = marketRng(seed, "trend_tick", cTrend++, t.key, opts.week);
    let momentum = t.momentum;
    let saturation = t.saturation;
    // releases influence
    const releases = [
      ...newReleases.filter((r) =>
        t.kind === "genre" ? r.genreId === t.subjectId : r.topicId === t.subjectId,
      ),
      ...(opts.playerReleasedThisWeek &&
      ((t.kind === "genre" && opts.playerReleasedThisWeek.genreId === t.subjectId) ||
        (t.kind === "topic" && opts.playerReleasedThisWeek.topicId === t.subjectId))
        ? [opts.playerReleasedThisWeek]
        : []),
    ];
    for (const r of releases) {
      const quality =
        "productQuality" in r && typeof r.productQuality === "number"
          ? r.productQuality
          : (r as ReleasedGame).avgReview * 10;
      const salesProxy =
        "sales" in r ? (r as { sales: number }).sales : (r as ReleasedGame).sales;
      const influence = (quality / 100) * 0.04 + Math.min(0.03, salesProxy / 500000);
      // marketing-only boost limited: use review as proxy for quality-led influence
      momentum += influence;
      saturation += 0.04;
    }
    // on-sale density saturation
    const similarOnSale = competitors.filter((c) =>
      t.kind === "genre" ? c.genreId === t.subjectId : c.topicId === t.subjectId,
    ).length;
    if (similarOnSale >= 3) saturation += 0.02;
    // mean reversion + small noise
    momentum += (1 - momentum) * 0.02 + rng.jitter(0.01);
    saturation = Math.max(0, saturation * 0.985 - 0.005);
    momentum = Math.max(0.72, Math.min(1.35, momentum));
    return {
      ...t,
      momentum,
      saturation: Math.min(1, saturation),
      lastChangeWeek: releases.length ? opts.week : t.lastChangeWeek,
      cause: releases.length ? "release_influence" : t.cause,
      publicAwareness: Math.min(1, t.publicAwareness + (releases.length ? 0.05 : 0)),
    };
  });

  // fatigue keys
  const fatigue = { ...market.fatigue };
  for (const c of competitors) {
    const key = `${c.genreId}:${c.topicId}`;
    fatigue[key] = (fatigue[key] ?? 0) * 0.96 + 0.08 * (c.awareness || 0.2);
  }
  for (const k of Object.keys(fatigue)) {
    fatigue[k] = Math.max(0, (fatigue[k] ?? 0) * 0.99);
  }

  // genre momentum map
  const genreMomentum: Partial<Record<GenreId, number>> = {};
  for (const t of trends) {
    if (t.kind === "genre") genreMomentum[t.subjectId as GenreId] = t.momentum * (1 - t.saturation * 0.25);
  }

  // player competition map
  const playerCompetition: Record<string, number> = {};
  for (const g of opts.playerGamesOnSale) {
    playerCompetition[g.id] = competitionByGameId[g.id] ?? 1;
  }
  if (opts.playerReleasedThisWeek) {
    playerCompetition[opts.playerReleasedThisWeek.id] =
      competitionByGameId[opts.playerReleasedThisWeek.id] ?? 1;
  }

  // platform factors
  const platformActiveFactor: Record<string, number> = {};
  for (const p of market.platforms) {
    platformActiveFactor[p.id] = Math.max(0.3, Math.min(1.6, p.activeUsers / 150_000));
  }

  // news: trend breakout
  for (const t of trends) {
    if (t.kind === "genre" && t.momentum > 1.2 && t.lastChangeWeek === opts.week) {
      market.news = [
        {
          id: `news_trend_${t.subjectId}_${opts.week}`,
          week: opts.week,
          category: "trend",
          headline: `${t.subjectId} games gain momentum`,
          body: `Market interest is rising after recent high-profile releases.`,
          causeEntityIds: [t.key],
        },
        ...market.news,
      ].slice(0, 40);
    }
    if (t.saturation > 0.55 && t.lastChangeWeek === opts.week) {
      market.news = [
        {
          id: `news_sat_${t.subjectId}_${opts.week}`,
          week: opts.week,
          category: "saturation",
          headline: `${t.subjectId} market looks crowded`,
          body: `Too many similar titles may be exhausting audience appetite.`,
          causeEntityIds: [t.key],
        },
        ...market.news,
      ].slice(0, 40);
    }
  }

  const snapshot: WeeklyMarketSnapshot = {
    week: opts.week,
    genreMomentum,
    competitionByGameId,
    activeReleaseCount: competitors.length,
  };

  market = {
    ...market,
    trends,
    fatigue,
    lastSnapshot: snapshot,
    calendar: [...calendarAdds, ...market.calendar].slice(0, 80),
    news: market.news.slice(0, 40),
    rngCounters: { rival: cRival, trend: cTrend, platform: cPlat, news: cNews },
  };

  return {
    market,
    playerCompetition,
    platformActiveFactor,
    genreMomentum,
    notifications,
  };
}

export function migrateMarket(raw: unknown, campaignSeed: number): MarketState {
  if (raw && typeof raw === "object" && (raw as MarketState).initialized) {
    return raw as MarketState;
  }
  return initMarket(campaignSeed, 0);
}
