/**
 * Rival planning, abstract production, release via shared quality concepts.
 */
import { STAGE_FIELDS, TOPICS, defaultSliders, getPlatform } from "../data";
import type { GameProject, GenreId, StaffMember } from "../types";
import { scoreCriticsV2, generateSalesPlanV2, normalizeStageAllocations } from "../scoring/algorithmV2";
import { hashSeed } from "../scoring/rng";
import type { MarketState, RivalProject, RivalStudio } from "./types";
import { marketRng, seededPick } from "./rng";
import { GENRES } from "./init";

const TITLES = [
  "Signal",
  "Horizon",
  "Circuit",
  "Ember",
  "Vault",
  "Drift",
  "Nova",
  "Shard",
  "Echo",
  "Pulse",
];

function syntheticStaff(studio: RivalStudio): StaffMember[] {
  const n = studio.strategy === "budget" ? 1 : studio.strategy === "mass_market" ? 3 : 2;
  const out: StaffMember[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: `${studio.id}_s${i}`,
      name: `Dev ${i}`,
      design: studio.disciplineCap.design ?? 45,
      tech: studio.disciplineCap.tech ?? 45,
      speed: studio.disciplineCap.speed ?? 45,
      salary: 0,
      level: 2 + Math.floor((studio.reputation ?? 0) / 25),
      xp: studio.reputation,
      busy: true,
      energy: 70 + (studio.qualityPreference * 20),
      fieldExperience: {},
    });
  }
  return out;
}

function pickConcept(
  studio: RivalStudio,
  market: MarketState,
  campaignSeed: number,
  week: number,
  counter: number,
): { topicId: string; genreId: GenreId; platformId: string; size: "small" | "medium" } {
  const rng = marketRng(campaignSeed, "rival_plan", counter, studio.id, week);
  const platforms = market.platforms.filter(
    (p) => p.lifecycle !== "discontinued" && p.lifecycle !== "rumored" && p.activeUsers > 0,
  );
  const platformId =
    platforms.length > 0
      ? platforms.sort(
          (a, b) =>
            (studio.platformLoyalties[b.id] ?? 0.3) * b.momentum -
            (studio.platformLoyalties[a.id] ?? 0.3) * a.momentum,
        )[0]!.id
      : "pc";

  // Score genres by belief * trend * (1-sat)
  let bestG: GenreId = "action";
  let best = -1;
  for (const g of GENRES) {
    const trend = market.trends.find((t) => t.key === `genre:${g}`);
    const mom = trend?.momentum ?? 1;
    const sat = trend?.saturation ?? 0;
    let score =
      (studio.genreBeliefs[g] ?? 0.4) * (0.5 + studio.trendResponsiveness * (mom - 1) * 2) * (1 - sat * 0.5);
    if (studio.strategy === "innovator") score *= 1.1 - sat;
    if (studio.strategy === "trend_chaser") score *= mom;
    score += rng.range(0, 0.15);
    if (score > best) {
      best = score;
      bestG = g;
    }
  }

  const topics = TOPICS.filter((t) => t.startUnlocked || t.researchCost < 40);
  const topic = seededPick(rng, topics.length ? topics : TOPICS);
  const size: "small" | "medium" =
    studio.cash > 200_000 && studio.reputation > 45 && rng.next() > 0.55 ? "medium" : "small";
  return { topicId: topic.id, genreId: bestG, platformId, size };
}

export function maybeStartRivalProject(
  studio: RivalStudio,
  market: MarketState,
  campaignSeed: number,
  week: number,
  counter: number,
): RivalStudio {
  if (studio.status === "bankrupt" || studio.activeProject) return studio;
  if (studio.cash < 25000) return { ...studio, weeksSinceProject: studio.weeksSinceProject + 1 };
  if (studio.weeksSinceProject < 4 + Math.floor((1 - studio.riskTolerance) * 6)) {
    return { ...studio, weeksSinceProject: studio.weeksSinceProject + 1 };
  }

  const rng = marketRng(campaignSeed, "rival_start", counter, studio.id, week);
  const concept = pickConcept(studio, market, campaignSeed, week, counter);
  const weeks =
    concept.size === "medium"
      ? 10 + rng.int(0, 6)
      : 6 + rng.int(0, 4);
  const cost = concept.size === "medium" ? 45000 : 18000;
  if (studio.cash < cost) return { ...studio, weeksSinceProject: studio.weeksSinceProject + 1 };

  const title = `${seededPick(rng, TITLES)} ${concept.genreId[0]!.toUpperCase()}${concept.genreId.slice(1)}`;
  const project: RivalProject = {
    id: `rp_${studio.id}_${week}_${counter}`,
    studioId: studio.id,
    title,
    topicId: concept.topicId,
    genreId: concept.genreId,
    platformId: concept.platformId,
    size: concept.size,
    phase: "planning",
    weeksInPhase: 0,
    weeksPlanned: weeks,
    plannedReleaseWeek: week + weeks,
    announcedWeek: null,
    releasedWeek: null,
    craftQuality: 0,
    productQuality: 0,
    bugs: 0,
    avgReview: 0,
    reviewScores: [],
    marketingSpend: Math.floor(studio.cash * 0.02 * studio.trendResponsiveness),
    developmentCost: cost,
    weeklySalesLeft: [],
    weeklyHistory: [],
    sales: 0,
    revenue: 0,
    onSale: false,
    competitionModifier: 1,
    announced: false,
  };

  return {
    ...studio,
    cash: studio.cash - cost - project.marketingSpend,
    activeProject: project,
    weeksSinceProject: 0,
  };
}

function buildAbstractProject(studio: RivalStudio, rp: RivalProject, campaignSeed: number): GameProject {
  const focusBias = studio.qualityPreference;
  const s1raw = {
    engine: 30 + focusBias * 20,
    gameplay: 40 + focusBias * 15,
    story: 30,
  };
  const s2raw = { dialogue: 25, level: 40, ai: 35 };
  const s3raw = { world: 30, graphics: 40, sound: 30 };
  // innovators push odd fields
  if (studio.innovationPreference > 0.7) {
    s2raw.ai += 15;
    s1raw.engine += 10;
  }
  if (studio.strategy === "narrative") {
    s1raw.story += 25;
    s2raw.dialogue += 20;
  }
  const s1 = normalizeStageAllocations(STAGE_FIELDS[1], s1raw as never);
  const s2 = normalizeStageAllocations(STAGE_FIELDS[2], s2raw as never);
  const s3 = normalizeStageAllocations(STAGE_FIELDS[3], s3raw as never);
  const sliders = { ...defaultSliders(rp.genreId), ...s1, ...s2, ...s3 };
  const designPoints = 25 + (studio.disciplineCap.design ?? 40) * 0.5 + studio.qualityPreference * 20;
  const techPoints = 25 + (studio.disciplineCap.tech ?? 40) * 0.5 + studio.innovationPreference * 15;
  const bugs = Math.max(0, Math.round(8 - studio.qualityPreference * 6 + (1 - focusBias) * 5));

  return {
    id: rp.id,
    title: rp.title,
    topicId: rp.topicId,
    genreId: rp.genreId,
    platformId: rp.platformId,
    audience: "everyone",
    size: rp.size,
    engineId: "basic_engine",
    stage: 3,
    stageProgress: 1,
    devPhase: "POLISHING",
    stageConfigs: { 1: s1, 2: s2, 3: s3 },
    sliders,
    designPoints,
    techPoints,
    researchEarned: 0,
    bugs,
    hype: studio.reputation * 0.3,
    marketingSpend: rp.marketingSpend,
    developmentCost: rp.developmentCost,
    weeksDev: rp.weeksPlanned,
    features: studio.innovationPreference > 0.7 ? ["Experimental AI"] : [],
    rngSeed: hashSeed(campaignSeed, rp.id),
  };
}

export function progressRivalProject(
  studio: RivalStudio,
  market: MarketState,
  campaignSeed: number,
  week: number,
  counter: number,
): { studio: RivalStudio; news: MarketState["news"]; released?: RivalProject } {
  if (!studio.activeProject) return { studio, news: [] };
  let rp = { ...studio.activeProject, weeksInPhase: studio.activeProject.weeksInPhase + 1 };
  const news: MarketState["news"] = [];
  const rng = marketRng(campaignSeed, "rival_prod", counter, rp.id, week);

  const advance = (next: RivalProject["phase"], minWeeks: number) => {
    if (rp.weeksInPhase >= minWeeks) {
      rp = { ...rp, phase: next, weeksInPhase: 0 };
    }
  };

  switch (rp.phase) {
    case "planning":
      advance("stage_1", 1);
      break;
    case "stage_1":
      advance("stage_2", Math.max(1, Math.floor(rp.weeksPlanned * 0.25)));
      break;
    case "stage_2":
      advance("stage_3", Math.max(1, Math.floor(rp.weeksPlanned * 0.25)));
      break;
    case "stage_3":
      advance("polishing", Math.max(1, Math.floor(rp.weeksPlanned * 0.25)));
      break;
    case "polishing": {
      // announce mid polish sometimes
      if (!rp.announced && rp.weeksInPhase >= 1 && rng.next() < 0.7) {
        rp = { ...rp, announced: true, announcedWeek: week, phase: "announced" };
        news.push({
          id: `news_ann_${rp.id}`,
          week,
          category: "announce",
          headline: `${studio.name} announces ${rp.title}`,
          body: `A ${rp.genreId} title is expected around week ${rp.plannedReleaseWeek}.`,
          causeEntityIds: [studio.id, rp.id],
        });
      } else if (rp.weeksInPhase >= Math.max(1, Math.floor(rp.weeksPlanned * 0.2))) {
        rp = { ...rp, phase: "announced", weeksInPhase: 0, announced: true, announcedWeek: rp.announcedWeek ?? week };
      }
      break;
    }
    case "announced": {
      // delay chance
      if (rng.next() < 0.08 * (1 - studio.qualityPreference)) {
        rp = { ...rp, plannedReleaseWeek: rp.plannedReleaseWeek + 2 };
        news.push({
          id: `news_delay_${rp.id}_${week}`,
          week,
          category: "delay",
          headline: `${rp.title} delayed`,
          body: `${studio.name} pushes the release back two weeks.`,
          causeEntityIds: [studio.id, rp.id],
        });
      }
      if (week >= rp.plannedReleaseWeek) {
        // RELEASE with shared quality model
        const project = buildAbstractProject(studio, rp, campaignSeed);
        const staff = syntheticStaff(studio);
        const plat = market.platforms.find((p) => p.id === rp.platformId);
        const reviews = scoreCriticsV2({
          project,
          staff,
          platformMarket: plat?.marketSizeBase ?? 1,
          platformTechCeiling: plat?.techCeiling ?? 1,
          reputation: studio.reputation,
          previousAvgReview: studio.reputation / 10,
          campaignSeed,
          week,
        });
        const sales = generateSalesPlanV2({
          productQuality: reviews.productQuality,
          avgReview: reviews.avg,
          size: rp.size,
          platformMarket: (plat?.activeUsers ?? 100000) / 200000,
          platformAgeYears: Math.max(0, (week / 48) - 0),
          fans: studio.fanBase,
          hype: studio.reputation * 0.4,
          marketingSpend: rp.marketingSpend,
          genreId: rp.genreId,
          topicRepetition: 0,
          pirateMode: false,
          liveOps: false,
          campaignSeed,
          gameId: rp.id,
          releaseWeek: week,
          studioReputation: studio.reputation,
        });
        rp = {
          ...rp,
          phase: "on_sale",
          releasedWeek: week,
          productQuality: reviews.productQuality,
          craftQuality: reviews.breakdown.craftQuality,
          bugs: project.bugs,
          avgReview: reviews.avg,
          reviewScores: reviews.scores,
          weeklySalesLeft: sales.weeks.slice(1),
          weeklyHistory: sales.history[0] ? [sales.history[0]] : [],
          sales: sales.weeks[0] ?? 0,
          revenue: (sales.weeks[0] ?? 0) * (sales.price ?? 25) * 0.7,
          onSale: true,
          competitionModifier: 1,
        };
        // first week cash later with competition adjustment in tick
        news.push({
          id: `news_rel_${rp.id}`,
          week,
          category: "release",
          headline: `${studio.name} ships ${rp.title}`,
          body: `Critics average ${reviews.avg.toFixed(1)}. Early sales underway.`,
          causeEntityIds: [studio.id, rp.id],
        });
        const nextStudio: RivalStudio = {
          ...studio,
          activeProject: null,
          releaseHistory: [...studio.releaseHistory, rp.id],
          reputation: Math.min(100, studio.reputation + (reviews.avg - 5) * 2),
          fanBase: studio.fanBase + Math.round(reviews.avg * 40),
          cash: studio.cash + rp.revenue,
          weeksSinceProject: 0,
        };
        // learn genre
        const beliefs = { ...studio.genreBeliefs };
        const old = beliefs[rp.genreId] ?? 0.5;
        beliefs[rp.genreId] = old * 0.85 + (reviews.avg / 10) * 0.15;
        nextStudio.genreBeliefs = beliefs;
        return { studio: nextStudio, news, released: rp };
      }
      break;
    }
    default:
      break;
  }

  return { studio: { ...studio, activeProject: rp }, news };
}
