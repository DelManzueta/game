/**
 * Publishing board — reach vs margin. Late Garage unlock.
 */
import type { GameSize, GenreId } from "../types";
import { SeededRng, hashSeed } from "../scoring/rng";
import {
  PUBLISHING_BOARD_SIZE,
  PUBLISHING_SEASON_WEEKS,
  PUBLISHING_REFRESH_COST,
  PUBLISHING_UNLOCK,
} from "./config";

export type PublishingDeal = {
  id: string;
  publisherId: string;
  publisherName: string;
  topicRequirement: string | null;
  genreRequirement: GenreId | null;
  platformRequirement: string | null;
  sizeRequirement: GameSize | null;
  minimumReviewScore: number;
  upfrontPayment: number;
  royaltyRate: number; // studio keeps this fraction
  penalty: number;
  awarenessMultiplier: number;
  fanMultiplier: number;
  reachMultiplier: number;
  offeredWeek: number;
  expirationWeek: number;
  description: string;
};

export type PublishingBoardState = {
  deals: PublishingDeal[];
  seasonStartWeek: number;
  refreshesUsedThisSeason: number;
  lastRefreshWeek: number;
};

const PUBLISHERS = [
  { id: "pixel_press", name: "Pixel Press", reach: 1.35, royalty: 0.42, upfront: 12000 },
  { id: "northwind", name: "Northwind Publishing", reach: 1.55, royalty: 0.38, upfront: 22000 },
  { id: "arcade_house", name: "Arcade House", reach: 1.25, royalty: 0.48, upfront: 8000 },
  { id: "blue_chip", name: "Blue Chip Games", reach: 1.7, royalty: 0.35, upfront: 35000 },
  { id: "hobbyist_dist", name: "Hobbyist Distro", reach: 1.15, royalty: 0.55, upfront: 4000 },
  { id: "vina", name: "Vina Games", reach: 1.4, royalty: 0.4, upfront: 18000 },
  { id: "microsanft", name: "Microsanft", reach: 1.65, royalty: 0.34, upfront: 40000 },
  { id: "nintendont", name: "Nintendon't", reach: 1.5, royalty: 0.4, upfront: 28000 },
];

const GENRES: GenreId[] = ["action", "adventure", "rpg", "simulation", "strategy", "casual"];
const SIZES: GameSize[] = ["small", "medium"];

export function publishingUnlocked(opts: {
  gamesPublished: number;
  fans: number;
  office?: number;
}): boolean {
  // Master progression: publishers only from Level 2 Tech Park
  if (opts.office != null && opts.office < 2) return false;
  return (
    opts.gamesPublished >= PUBLISHING_UNLOCK.minReleasedGames ||
    opts.fans >= PUBLISHING_UNLOCK.minFans ||
    (opts.office != null && opts.office >= 2)
  );
}

export function emptyPublishingBoard(week = 0): PublishingBoardState {
  return {
    deals: [],
    seasonStartWeek: week,
    refreshesUsedThisSeason: 0,
    lastRefreshWeek: -1,
  };
}

export function seasonIndex(week: number): number {
  return Math.floor(week / PUBLISHING_SEASON_WEEKS);
}

export function generatePublishingBoard(opts: {
  campaignSeed: number;
  week: number;
  year: number;
  fans: number;
  forceRefresh?: boolean;
}): PublishingBoardState {
  const season = seasonIndex(opts.week);
  const seed = hashSeed(opts.campaignSeed, "pub-board", season, opts.forceRefresh ? opts.week : 0);
  const rng = new SeededRng(seed);
  const deals: PublishingDeal[] = [];
  const used = new Set<string>();
  for (let i = 0; i < PUBLISHING_BOARD_SIZE; i++) {
    let pub = PUBLISHERS[rng.int(0, PUBLISHERS.length - 1)]!;
    let guard = 0;
    while (used.has(pub.id) && guard++ < 8) {
      pub = PUBLISHERS[rng.int(0, PUBLISHERS.length - 1)]!;
    }
    used.add(pub.id);
    const genre = rng.next() < 0.55 ? GENRES[rng.int(0, GENRES.length - 1)]! : null;
    const size = rng.next() < 0.4 ? SIZES[rng.int(0, SIZES.length - 1)]! : null;
    const minScore = 5 + rng.int(0, 2) + (pub.reach > 1.5 ? 1 : 0);
    const fanScale = 1 + Math.min(0.4, opts.fans / 100000);
    const upfront = Math.round(pub.upfront * (0.85 + rng.range(0, 0.35)) * fanScale);
    const royalty = clamp(pub.royalty + rng.range(-0.04, 0.04), 0.3, 0.6);
    deals.push({
      id: `deal_${season}_${pub.id}_${i}`,
      publisherId: pub.id,
      publisherName: pub.name,
      topicRequirement: null,
      genreRequirement: genre,
      platformRequirement: null,
      sizeRequirement: size,
      minimumReviewScore: minScore,
      upfrontPayment: upfront,
      royaltyRate: Math.round(royalty * 100) / 100,
      penalty: Math.round(upfront * 0.35),
      awarenessMultiplier: 1.15 + (pub.reach - 1) * 0.5,
      fanMultiplier: 1.1 + (pub.reach - 1) * 0.3,
      reachMultiplier: pub.reach * (0.95 + rng.range(0, 0.1)),
      offeredWeek: opts.week,
      expirationWeek: (season + 1) * PUBLISHING_SEASON_WEEKS,
      description: buildDesc(pub.name, genre, size, minScore, upfront, royalty),
    });
  }
  return {
    deals,
    seasonStartWeek: season * PUBLISHING_SEASON_WEEKS,
    refreshesUsedThisSeason: 0,
    lastRefreshWeek: opts.week,
  };
}

function buildDesc(
  name: string,
  genre: GenreId | null,
  size: GameSize | null,
  minScore: number,
  upfront: number,
  royalty: number,
): string {
  const bits = [
    `${name} offers $${upfront.toLocaleString()} upfront.`,
    `You keep ${Math.round(royalty * 100)}% of sales.`,
    `Needs avg review ≥ ${minScore}.`,
  ];
  if (genre) bits.push(`Wants ${genre}.`);
  if (size) bits.push(`Prefers ${size} projects.`);
  return bits.join(" ");
}

export function refreshPublishingBoard(
  board: PublishingBoardState,
  opts: { campaignSeed: number; week: number; year: number; fans: number; cash: number },
): { board: PublishingBoardState; cash: number; error?: string } {
  const season = seasonIndex(opts.week);
  const boardSeason = seasonIndex(board.seasonStartWeek);
  if (season !== boardSeason) {
    // New season free board
    return {
      board: generatePublishingBoard({
        campaignSeed: opts.campaignSeed,
        week: opts.week,
        year: opts.year,
        fans: opts.fans,
      }),
      cash: opts.cash,
    };
  }
  if (board.refreshesUsedThisSeason >= 1) {
    return { board, cash: opts.cash, error: "Already refreshed this season." };
  }
  if (opts.cash < PUBLISHING_REFRESH_COST) {
    return { board, cash: opts.cash, error: `Need $${PUBLISHING_REFRESH_COST} to refresh.` };
  }
  const next = generatePublishingBoard({
    campaignSeed: opts.campaignSeed,
    week: opts.week,
    year: opts.year,
    fans: opts.fans,
    forceRefresh: true,
  });
  next.refreshesUsedThisSeason = 1;
  next.seasonStartWeek = board.seasonStartWeek;
  return { board: next, cash: opts.cash - PUBLISHING_REFRESH_COST };
}

/** Advance board at season boundaries (free new deals). */
export function tickPublishingBoard(
  board: PublishingBoardState | null | undefined,
  opts: { campaignSeed: number; week: number; year: number; fans: number; unlocked: boolean },
): PublishingBoardState | null {
  if (!opts.unlocked) return board ?? null;
  if (!board || board.deals.length === 0) {
    return generatePublishingBoard(opts);
  }
  if (seasonIndex(opts.week) > seasonIndex(board.seasonStartWeek)) {
    return generatePublishingBoard(opts);
  }
  // Expire old deals still showing past expiration
  const deals = board.deals.filter((d) => opts.week < d.expirationWeek);
  if (deals.length === 0) return generatePublishingBoard(opts);
  return { ...board, deals };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Settle active deal after reviews are known (blueprint Module 3). */
export function evaluatePublisherDeal(opts: {
  deal: PublishingDeal;
  avgReview: number;
  genreId: GenreId;
  size: GameSize;
  platformId: string;
  grossRevenue: number;
}): {
  met: boolean;
  cashDelta: number;
  note: string;
  royaltyPaid: number;
  penalty: number;
  requirementsMet: boolean;
} {
  const d = opts.deal;
  let requirementsMet = true;
  if (d.genreRequirement && d.genreRequirement !== opts.genreId) requirementsMet = false;
  if (d.sizeRequirement && d.sizeRequirement !== opts.size) requirementsMet = false;
  if (d.platformRequirement && d.platformRequirement !== opts.platformId) requirementsMet = false;

  const scoreMet = opts.avgReview + 1e-6 >= d.minimumReviewScore;
  const met = requirementsMet && scoreMet;

  if (met) {
    const royaltyPaid = opts.grossRevenue * d.royaltyRate;
    return {
      met: true,
      cashDelta: royaltyPaid,
      royaltyPaid,
      penalty: 0,
      requirementsMet,
      note: `${d.publisherName}: contract met (${opts.avgReview.toFixed(1)} ≥ ${d.minimumReviewScore}). Royalties ${Math.round(d.royaltyRate * 100)}%.`,
    };
  }

  const penalty = d.penalty > 0 ? d.penalty : Math.round(d.upfrontPayment * 0.5);
  return {
    met: false,
    cashDelta: -penalty,
    royaltyPaid: 0,
    penalty,
    requirementsMet,
    note: `${d.publisherName}: contract failed (need ${d.minimumReviewScore}+, got ${opts.avgReview.toFixed(1)}). Fine -$${penalty.toLocaleString()}.`,
  };
}

export { PUBLISHING_REFRESH_COST, PUBLISHING_SEASON_WEEKS };
