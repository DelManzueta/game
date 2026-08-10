/**
 * Commercial runtime — wires weekly_v3 sales + marketing into release/tick.
 * Pure domain helpers; store calls these (no React).
 */
import type { GameState, ReleasedGame } from "../types";
import { defaultLaunchPrice } from "../contracts";
import { applyLedger } from "../finance/ledger";
import { applyIpRoyalty } from "../netflixEdition";
import {
  calculateWeeklySales,
  reviewToHundred,
  emptyMarketingState,
  advanceMarketing,
  marketingSpendToPoints,
  marketingReachMultiplier,
  launchFanDelta,
  salesFanDelta,
  weeklyMarketRp,
  salesPhaseFor,
  REFERENCE_PRICE,
  type WeeklySalesResult,
} from "./index";

/** Soft-cap runaway 90s fortunes: later decades stay winnable via fans/platforms not raw cash. */
function eraSalesDampener(year: number): number {
  if (year < 1988) return 1;
  if (year < 1992) return 0.82;
  if (year < 1996) return 0.68;
  if (year < 2000) return 0.72;
  if (year < 2008) return 0.78;
  return 0.85;
}

export function initReleasedCommercial(opts: {
  released: ReleasedGame;
  state: GameState;
  marketingSpend: number;
  influencerBoost?: boolean;
  platformMarket: number;
  platformAgeYears: number;
  platformLifecycle?: number;
  installedBase?: number;
  topicRep: number;
  comboMult: number;
  distType: "self" | "publisher";
  royalty: number;
  publisherAwarenessMult?: number;
  planUnits: number[];
  productQuality: number;
  avgReview: number;
}): {
  released: ReleasedGame;
  fansDelta: number;
  notification?: { text: string; tone: "good" | "bad" | "info" };
} {
  const {
    released: base,
    state,
    marketingSpend,
    influencerBoost,
    platformMarket,
    platformAgeYears,
    topicRep,
    comboMult,
    distType,
    royalty,
    planUnits,
    productQuality,
    avgReview,
  } = opts;

  const released: ReleasedGame = { ...base };
  // classic_gdt uses precomputed weekly plan (GDT-style units).
  // weekly_v3 kept for snapshot diagnostics but plan drives cash.
  released.salesEngine = "classic_gdt";
  released.weeklySalesResults = [];
  released.marketDays = 0;
  released.weeksOnMarket = 0;
  released.onSale = true;
  released.dormant = false;
  released.delisted = false;
  released.lowSalesStreak = 0;
  released.salesPhase = "launch";
  released.distributionType = distType;
  released.publisherRoyalty = royalty;
  released.fanBaseAtLaunch = state.fans;
  released.hypeAtLaunch = released.hype;
  released.fanHistory = [];
  released.marketWeeksPlanned = planUnits.length;

  const mktStart = emptyMarketingState(released.id, state.week * 7);
  mktStart.awarenessPoints = marketingSpendToPoints(
    marketingSpend * (influencerBoost ? 1.35 : 1),
  );
  mktStart.hype = Math.min(100, (released.hype + state.hype) * 0.85);
  released.marketingState = mktStart;
  released.awarenessAtLaunch = Math.min(
    0.92,
    0.08 + mktStart.awarenessPoints / 150,
  );

  const installedBase =
    opts.installedBase ??
    Math.round(Math.max(0.35, platformMarket) * 150_000);
  const platformLifecycle =
    opts.platformLifecycle ??
    Math.max(0.2, Math.min(1, 1.05 - platformAgeYears * 0.06));

  released.salesSnapshot = {
    platformInstalledBase: installedBase,
    platformLifecycle,
    platformAvailability: 1,
    audienceDemand: 0.85,
    topicDemand: Math.max(0.55, 1 - topicRep * 0.06),
    genreDemand:
      released.genreId === "action" || released.genreId === "casual"
        ? 1.05
        : released.genreId === "strategy" || released.genreId === "simulation"
          ? 0.9
          : 1,
    platformGenreFit: Math.min(1, Math.max(0.4, comboMult)),
    competitionModifier: 0.95,
    trendModifier: 1,
    organicAwarenessPoints: 58 + Math.min(36, state.gamesPublished * 4),
    publisherAwarenessPoints:
      distType === "publisher"
        ? 25 * ((opts.publisherAwarenessMult ?? 1.2) - 0.5)
        : 0,
    distributionMultiplier: distType === "publisher" ? 1.35 : 1,
    referencePrice: REFERENCE_PRICE[released.size] ?? 25,
    platformFeeRate: 0.3,
    publisherCutRate: distType === "publisher" ? Math.max(0, 1 - royalty) : 0,
    // ~0.55% of addressable base per week at full layers before lifecycle soft — garage hits feel
    marketCapacityRate: 0.012,
  };

  const planTotal = planUnits.reduce((a, b) => a + b, 0);
  const fansDelta = launchFanDelta({
    avgReview,
    awareness: released.awarenessAtLaunch,
    fansAtLaunch: state.fans,
    totalUnits: planTotal,
    productQuality,
  });
  released.fansGained = fansDelta;
  released.fanHistory = [
    { week: state.week, delta: fansDelta, reason: "launch_reaction" },
  ];

  let notification: { text: string; tone: "good" | "bad" | "info" } | undefined;
  if (fansDelta > 120) {
    notification = {
      text: `Fans love it — +${fansDelta.toLocaleString()} followers after reviews.`,
      tone: "good",
    };
  } else if (fansDelta < -5) {
    notification = {
      text: `Reviews hurt the brand — ${fansDelta.toLocaleString()} fans.`,
      tone: "bad",
    };
  }

  return { released, fansDelta, notification };
}

export function tickReleasedSales(
  state: GameState,
  pushNote: (
    s: GameState,
    text: string,
    tone: "info" | "good" | "warn" | "bad",
  ) => GameState["notifications"],
): GameState {
  if (!state.activeSales.length) return state;
  const next = { ...state };
  const still: ReleasedGame[] = [];

  for (const g of next.activeSales) {
    if (!g.onSale || g.delisted || g.dormant) {
      if (g.dormant || g.delisted) {
        next.releasedGames = next.releasedGames.map((rg) =>
          rg.id === g.id ? { ...rg, ...g, onSale: false } : rg,
        );
      }
      continue;
    }

    const useLive = g.salesEngine === "weekly_v3" && g.salesSnapshot != null;
    let units = 0;
    let rev = 0;
    const nextG: ReleasedGame = {
      ...g,
      marketDays: (g.marketDays ?? g.weeksOnMarket * 7) + 7,
      weeklySalesLeft: [...(g.weeklySalesLeft ?? [])],
    };

    if (g.marketingState) {
      try {
        const mTick = advanceMarketing(g.marketingState, nextG.marketDays!);
        nextG.marketingState = mTick.state;
        if (mTick.expiredCampaignIds.length) {
          next.notifications = pushNote(
            next,
            `Marketing campaign ended on "${g.title}".`,
            "info",
          );
        }
      } catch {
        /* keep */
      }
    }

    if (useLive && nextG.salesSnapshot) {
      const snap = nextG.salesSnapshot;
      const mkt = nextG.marketingState;
      const reach = mkt ? marketingReachMultiplier(mkt) : 1;
      const mktAwareness =
        (mkt?.awarenessPoints ?? 0) + marketingSpendToPoints(g.marketingSpend);
      const result: WeeklySalesResult = calculateWeeklySales({
        campaignSeed: next.campaignSeed,
        gameId: g.id,
        marketDays: nextG.marketDays!,
        weeksOnMarket: g.weeksOnMarket,
        titleStatus: g.delisted ? "delisted" : g.dormant ? "dormant" : "released",
        platformInstalledBase: snap.platformInstalledBase,
        platformLifecycle: snap.platformLifecycle,
        platformAvailability: snap.platformAvailability,
        audienceDemand: snap.audienceDemand,
        topicDemand: snap.topicDemand,
        genreDemand: snap.genreDemand,
        platformGenreFit: snap.platformGenreFit,
        competitionModifier: snap.competitionModifier,
        trendModifier: snap.trendModifier,
        reviewAverage: reviewToHundred(g.avgReview),
        organicAwarenessPoints: snap.organicAwarenessPoints,
        fanCount: next.fans,
        marketingAwarenessPoints: mktAwareness,
        publisherAwarenessPoints: snap.publisherAwarenessPoints,
        hype: mkt?.hype ?? g.hypeAtLaunch ?? g.hype,
        distributionMultiplier: snap.distributionMultiplier,
        reachMultiplier: reach,
        price: g.launchPrice ?? defaultLaunchPrice(g.size),
        referencePrice: snap.referencePrice,
        platformFeeRate: snap.platformFeeRate,
        publisherCutRate: snap.publisherCutRate,
        lowDemandWeeks: g.lowSalesStreak ?? 0,
        dormantAfterLowDemandWeeks: 6,
        dormantUnitThreshold: 15,
        marketCapacityRate: snap.marketCapacityRate,
      });

      units = Math.floor(result.unitsSold * eraSalesDampener(next.year));
      rev = result.developerRevenue * (units / Math.max(1, result.unitsSold));
      nextG.weeklySalesResults = [...(g.weeklySalesResults ?? []), result].slice(
        -200,
      );
      nextG.lowSalesStreak = result.nextLowDemandWeeks;
      if (result.nextTitleStatus === "dormant") {
        nextG.dormant = true;
        nextG.onSale = false;
        nextG.salesPhase = "dormant";
      } else {
        nextG.salesPhase =
          result.lifecyclePhase === "launch_window"
            ? "launch"
            : result.lifecyclePhase === "growth"
              ? "growth"
              : result.lifecyclePhase === "mature_sales"
                ? "mature"
                : "long_tail";
      }
      if (nextG.weeklySalesLeft.length > 0) nextG.weeklySalesLeft.shift();
    } else {
      const planUnits = nextG.weeklySalesLeft.shift();
      if (planUnits == null) {
        const done: ReleasedGame = {
          ...g,
          onSale: false,
          residualWeeks: 0,
          dormant: true,
          salesPhase: "dormant",
        };
        still.push(done);
        next.releasedGames = next.releasedGames.map((rg) =>
          rg.id === done.id ? { ...rg, ...done } : rg,
        );
        continue;
      }
      units = Math.floor(planUnits * eraSalesDampener(next.year));
      const price = g.launchPrice ?? defaultLaunchPrice(g.size);
      const share = g.publisherRoyalty ?? 0.7;
      rev = units * price * share;
      if (units <= 15) {
        nextG.lowSalesStreak = (g.lowSalesStreak ?? 0) + 1;
        if (nextG.lowSalesStreak >= 6) {
          nextG.dormant = true;
          nextG.onSale = false;
          nextG.salesPhase = "dormant";
        }
      } else {
        nextG.lowSalesStreak = 0;
      }
    }

    const hist = [
      ...(nextG.weeklyHistory ?? []),
      {
        week: next.week,
        units,
        revenue: rev,
        awareness:
          nextG.marketingState?.awarenessPoints != null
            ? Math.min(1, nextG.marketingState.awarenessPoints / 120)
            : g.awarenessAtLaunch,
      },
    ];

    const fanDelta = salesFanDelta({
      unitsSold: units,
      avgReview: g.avgReview,
      productQuality: g.productQuality ?? g.avgReview * 10,
      marketingHeavy:
        g.marketingSpend > 40000 || (g.marketingState?.history?.length ?? 0) > 2,
    });
    if (fanDelta !== 0) next.fans = Math.max(0, next.fans + fanDelta);

    const mrp = weeklyMarketRp({
      avgReview: g.avgReview,
      size: g.size,
      dormant: !!nextG.dormant,
      delisted: !!g.delisted,
    });
    next.researchPointsFrac = (next.researchPointsFrac ?? 0) + mrp;

    const phase =
      nextG.salesPhase ??
      salesPhaseFor({
        weeksOnMarket: g.weeksOnMarket + 1,
        marketWeeks: g.marketWeeksPlanned ?? 40,
        onSale: nextG.onSale !== false && !nextG.dormant,
        delisted: g.delisted,
        dormant: !!nextG.dormant,
        lowSalesStreak: nextG.lowSalesStreak ?? 0,
      });

    const fanHistory = [
      ...(g.fanHistory ?? []),
      ...(fanDelta
        ? [{ week: next.week, delta: fanDelta, reason: "weekly_conversion" as const }]
        : []),
    ].slice(-40);

    const updated: ReleasedGame = {
      ...nextG,
      sales: g.sales + units,
      revenue: g.revenue + rev,
      fansGained: g.fansGained + fanDelta,
      weeksOnMarket: g.weeksOnMarket + 1,
      residualWeeks: nextG.weeklySalesLeft?.length ?? 0,
      weeklyHistory: hist,
      onSale: !nextG.dormant && !g.delisted,
      salesPhase: phase,
      fanHistory,
    };

    // Netflix Edition — 15% ongoing royalty on licensed titles
    const royaltyRate =
      (g as { ipRoyaltyRate?: number }).ipRoyaltyRate ??
      ((next.ipRoyaltyGameIds ?? []).includes(g.id) ? 0.15 : 0);
    let netRev = rev;
    if (royaltyRate > 0 && rev > 0) {
      netRev = applyIpRoyalty(rev, royaltyRate);
      const cut = rev - netRev;
      next.ledger = applyLedger(next.ledger, {
        week: next.week,
        amount: -cut,
        category: "other",
        label: `IP royalty (${Math.round(royaltyRate * 100)}%): ${g.title}`,
        gameId: g.id,
        ref: `ip-royalty-${g.id}-w${g.weeksOnMarket}`,
      });
    }
    next.cash += netRev;
    next.totalRevenue += netRev;
    if (netRev !== 0) {
      next.ledger = applyLedger(next.ledger, {
        week: next.week,
        amount: netRev,
        category: "sales",
        label: `Sales: ${g.title}`,
        gameId: g.id,
        ref: `sales-${g.id}-w${g.weeksOnMarket}`,
      });
    }
    still.push(updated);
    next.releasedGames = next.releasedGames.map((rg) =>
      rg.id === updated.id ? { ...rg, ...updated } : rg,
    );
  }

  next.activeSales = still.filter((g) => g.onSale && !g.dormant && !g.delisted);
  return next;
}

import { evaluateCombo } from "../simulation";
// evaluateCombo re-export removed — not needed
void evaluateCombo;
