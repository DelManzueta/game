/**
 * Persistent knowledge from Game Reports — the garage flywheel.
 */
import type { ReleasedGame } from "./types";
import type { CampaignKnowledge, KnowledgeEntry } from "./contracts";
import { emptyKnowledge } from "./contracts";
import { getGenre, getPlatform, getTopic } from "./data";

export function migrateKnowledge(raw: unknown): CampaignKnowledge {
  if (!raw || typeof raw !== "object") return emptyKnowledge();
  const k = raw as CampaignKnowledge;
  return {
    entries: Array.isArray(k.entries) ? k.entries : [],
    comboStats: k.comboStats && typeof k.comboStats === "object" ? k.comboStats : {},
    lessonsSeen: Array.isArray(k.lessonsSeen) ? k.lessonsSeen : [],
  };
}

function comboKey(g: ReleasedGame): string {
  return `${g.topicId}:${g.genreId}${g.genre2Id ? `+${g.genre2Id}` : ""}`;
}

/** Build teachable insights from a released game (idempotent per game). */
export function buildReportInsights(
  game: ReleasedGame,
  week: number,
): KnowledgeEntry[] {
  const topic = getTopic(game.topicId)?.name ?? game.topicId;
  const genre = getGenre(game.genreId).name;
  const platform = getPlatform(game.platformId).name;
  const keyBase = `game:${game.id}`;
  const entries: KnowledgeEntry[] = [];
  const avg = game.avgReview;
  const bugs = game.bugs;
  const quality = game.productQuality ?? avg * 10;
  const bd = game.qualityBreakdownV2;

  entries.push({
    key: `${keyBase}:combo`,
    kind: "combo",
    label: `${topic} / ${genre}`,
    detail: `Average review ${avg.toFixed(1)}. Quality ~${quality.toFixed(0)}. Platform: ${platform}.`,
    confidence: Math.min(1, 0.45 + avg / 20),
    sourceGameId: game.id,
    weekLearned: week,
  });

  if (bugs >= 8) {
    entries.push({
      key: `${keyBase}:bugs`,
      kind: "weakness",
      label: "Bug debt hurt reception",
      detail: `Shipped with ${bugs} bugs. Polish longer next time for this size.`,
      confidence: 0.85,
      sourceGameId: game.id,
      weekLearned: week,
    });
  } else if (bugs <= 2 && avg >= 7) {
    entries.push({
      key: `${keyBase}:polish`,
      kind: "strength",
      label: "Clean ship paid off",
      detail: "Low bug count supported strong critic scores.",
      confidence: 0.75,
      sourceGameId: game.id,
      weekLearned: week,
    });
  }

  if (bd) {
    if ((bd.conceptFit ?? 1) < 0.72) {
      entries.push({
        key: `${keyBase}:concept`,
        kind: "lesson",
        label: "Concept fit was weak",
        detail: "Topic, genre, audience, or platform alignment limited the ceiling.",
        confidence: 0.8,
        sourceGameId: game.id,
        weekLearned: week,
      });
    }
    if ((bd.designTechBalance ?? 1) < 0.75) {
      entries.push({
        key: `${keyBase}:balance`,
        kind: "lesson",
        label: "Design/Tech balance was off",
        detail: "Stage focus did not match genre priorities.",
        confidence: 0.78,
        sourceGameId: game.id,
        weekLearned: week,
      });
    }
    if ((bd.focusAlignment ?? 1) > 0.9 && avg >= 7) {
      entries.push({
        key: `${keyBase}:focus`,
        kind: "strength",
        label: "Focused allocations worked",
        detail: "Stage emphasis matched what the genre needed.",
        confidence: 0.72,
        sourceGameId: game.id,
        weekLearned: week,
      });
    }
  }

  if (game.sales > 0 && avg >= 7.5 && game.marketingSpend < 5000) {
    entries.push({
      key: `${keyBase}:slowburn`,
      kind: "platform",
      label: "Quality carried sales",
      detail: "Strong product with modest marketing still moved units over time.",
      confidence: 0.65,
      sourceGameId: game.id,
      weekLearned: week,
    });
  }

  if (avg < 5) {
    entries.push({
      key: `${keyBase}:flop`,
      kind: "lesson",
      label: "Critics rejected this approach",
      detail: "Avoid repeating the same weak combo until you change focus or polish.",
      confidence: 0.9,
      sourceGameId: game.id,
      weekLearned: week,
    });
  }

  return entries;
}

/** Merge report insights into campaign knowledge (no duplicates by key). */
export function applyReportKnowledge(
  knowledge: CampaignKnowledge,
  game: ReleasedGame,
  week: number,
): { knowledge: CampaignKnowledge; newEntries: KnowledgeEntry[]; rpBonus: number } {
  const insights = buildReportInsights(game, week);
  const existing = new Set(knowledge.entries.map((e) => e.key));
  const newEntries = insights.filter((e) => !existing.has(e.key));
  const combo = comboKey(game);
  const prev = knowledge.comboStats[combo] ?? {
    plays: 0,
    bestAvg: 0,
    totalRevenue: 0,
    lastWeek: 0,
  };
  const comboStats = {
    ...knowledge.comboStats,
    [combo]: {
      plays: prev.plays + 1,
      bestAvg: Math.max(prev.bestAvg, game.avgReview),
      totalRevenue: prev.totalRevenue + game.revenue,
      lastWeek: week,
    },
  };
  const lessonsSeen = [
    ...knowledge.lessonsSeen,
    ...newEntries.filter((e) => e.kind === "lesson").map((e) => e.key),
  ];
  // RP scales with new lessons, not spam re-reports
  const rpBonus = 3 + newEntries.length * 2;
  return {
    knowledge: {
      entries: [...newEntries, ...knowledge.entries].slice(0, 80),
      comboStats,
      lessonsSeen: [...new Set(lessonsSeen)].slice(0, 60),
    },
    newEntries,
    rpBonus,
  };
}

/** Knowledge retained when a project is cancelled (no reviews). */
export function applyCancelKnowledge(
  knowledge: CampaignKnowledge,
  opts: {
    projectId: string;
    topicId: string;
    genreId: string;
    weeksDev: number;
    week: number;
  },
): CampaignKnowledge {
  const key = `cancel:${opts.projectId}`;
  if (knowledge.entries.some((e) => e.key === key)) return knowledge;
  const entry: KnowledgeEntry = {
    key,
    kind: "lesson",
    label: "Cancelled project still taught something",
    detail: `Spent ${opts.weeksDev} weeks on ${opts.topicId}/${opts.genreId}. Costs sunk; combo not repeated blindly.`,
    confidence: 0.4,
    sourceGameId: opts.projectId,
    weekLearned: opts.week,
  };
  return {
    ...knowledge,
    entries: [entry, ...knowledge.entries].slice(0, 80),
  };
}
