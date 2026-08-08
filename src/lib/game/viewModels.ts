/**
 * Read-only presentation selectors for Garage UI.
 * No simulation, no mutations — domain owns behavior.
 */
import type { GameProject, GameState, ReleasedGame } from "./types";
import { formatCash, formatFans } from "./simulation";
import { getGenre, getPlatform, getTopic, OFFICE_INFO, STAGE_FIELDS } from "./data";
import { FIELD_LABELS } from "./data";
import {
  firstOfficeOfferView,
  isFeatureEnabled,
  migrateStudioProgression,
  type ProofResult,
} from "./progression";

export type PhaseLabel = {
  code: string;
  title: string;
  hint: string;
  primaryAction: string | null;
  needsPlayerInput: boolean;
};

export function projectPhaseLabel(p: GameProject | null | undefined): PhaseLabel {
  if (!p) {
    return {
      code: "idle",
      title: "Garage idle",
      hint: "No active project. Start a new game when ready.",
      primaryAction: "Develop New Game",
      needsPlayerInput: true,
    };
  }
  const phase = p.devPhase;
  if (phase === "STAGE_1_CONFIG") {
    return {
      code: phase,
      title: "Stage 1 — Plan",
      hint: "Allocate Story, Engine, Gameplay. Confirm to begin development.",
      primaryAction: "Confirm Stage 1",
      needsPlayerInput: true,
    };
  }
  if (phase === "STAGE_1_RUNNING") {
    return {
      code: phase,
      title: "Stage 1 — Developing",
      hint: "Time is advancing. Work fills toward demand.",
      primaryAction: null,
      needsPlayerInput: false,
    };
  }
  if (phase === "STAGE_2_CONFIG") {
    return {
      code: phase,
      title: "Stage 2 — Plan",
      hint: "Stage 1 complete. Configure Dialogues, AI, Level Design.",
      primaryAction: "Confirm Stage 2",
      needsPlayerInput: true,
    };
  }
  if (phase === "STAGE_2_RUNNING") {
    return {
      code: phase,
      title: "Stage 2 — Developing",
      hint: "Time is advancing.",
      primaryAction: null,
      needsPlayerInput: false,
    };
  }
  if (phase === "STAGE_3_CONFIG") {
    return {
      code: phase,
      title: "Stage 3 — Plan",
      hint: "Configure World, Graphics, Sound.",
      primaryAction: "Confirm Stage 3",
      needsPlayerInput: true,
    };
  }
  if (phase === "STAGE_3_RUNNING") {
    return {
      code: phase,
      title: "Stage 3 — Developing",
      hint: "Final production stage.",
      primaryAction: null,
      needsPlayerInput: false,
    };
  }
  if (phase === "POLISHING") {
    const prod = p.production?.phase;
    if (prod === "bug_fixing") {
      return {
        code: phase,
        title: "Bug fixing",
        hint: "Work on bugs consumes a week. Clear issues before release.",
        primaryAction: "Work on bugs (1 week)",
        needsPlayerInput: true,
      };
    }
    return {
      code: phase,
      title: "Polish",
      hint: "Polish and fix bugs, then enter Pre-Release.",
      primaryAction: "Work on bugs · Pre-Release",
      needsPlayerInput: true,
    };
  }
  if (phase === "READY_TO_RELEASE") {
    return {
      code: phase,
      title: "Pre-Release",
      hint: "Set final title and price. Reviews appear only after Release.",
      primaryAction: "Release Game",
      needsPlayerInput: true,
    };
  }
  return {
    code: String(phase),
    title: String(phase).replace(/_/g, " "),
    hint: "",
    primaryAction: null,
    needsPlayerInput: false,
  };
}

export function calendarLabel(s: Pick<GameState, "year" | "month" | "week">): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = months[Math.max(0, Math.min(11, (s.month || 1) - 1))] ?? `M${s.month}`;
  return `${m} ${s.year} · W${(s.week % 4) + 1}`;
}

/** HUD clock — year first so 1979…2026 is always readable. */
export function calendarHudLabel(s: Pick<GameState, "year" | "month" | "week">): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = months[Math.max(0, Math.min(11, (s.month || 1) - 1))] ?? `M${s.month}`;
  return `${s.year} · ${m} · W${(s.week % 4) + 1}`;
}

export function weekToCalendarLabel(week: number, startYear = 1979): string {
  const year = startYear + Math.floor(week / 48);
  const weekInYear = week % 48;
  const month = Math.floor(weekInYear / 4) + 1;
  const w = (weekInYear % 4) + 1;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = months[Math.max(0, Math.min(11, month - 1))] ?? `M${month}`;
  return `${m} ${year} · W${w}`;
}

export function weekToYearMonth(week: number, startYear = 1979) {
  const year = startYear + Math.floor(week / 48);
  const weekInYear = week % 48;
  const month = Math.floor(weekInYear / 4) + 1;
  const weekOfMonth = (weekInYear % 4) + 1;
  return { year, month, weekOfMonth };
}

export function studioOverview(s: GameState) {
  const office = OFFICE_INFO[s.office];
  const phase = projectPhaseLabel(s.currentProject);
  const salesLive = s.activeSales.filter((g) => g.onSale && !g.dormant);
  const topSale = salesLive[0];
  return {
    companyName: s.companyName,
    officeName: office.name,
    calendar: calendarLabel(s),
    cash: s.cash,
    cashLabel: formatCash(s.cash),
    fans: s.fans,
    fansLabel: formatFans(s.fans),
    researchPoints: Math.floor(s.researchPoints),
    gamesPublished: s.gamesPublished,
    staffCount: s.staff.length,
    knowledgeCount: s.knowledge.entries.length,
    phase,
    projectTitle: s.currentProject?.title ?? null,
    projectMeta: s.currentProject
      ? `${getTopic(s.currentProject.topicId)?.name ?? "?"} · ${getGenre(s.currentProject.genreId).name} · ${getPlatform(s.currentProject.platformId)?.name ?? "?"}`
      : null,
    bugs: s.currentProject?.bugs ?? 0,
    stageProgress: s.currentProject?.stageProgress ?? 0,
    liveSalesCount: salesLive.length,
    topSale: topSale
      ? {
          title: topSale.title,
          units: topSale.sales,
          revenue: topSale.revenue,
          avgReview: topSale.avgReview,
          weeksOnMarket: topSale.weeksOnMarket,
          commercialExplain: explainSales(topSale),
        }
      : null,
    recentKnowledge: s.knowledge.entries.slice(0, 5),
    officeGoal: buildOfficeGoal(s),
  };
}

function buildOfficeGoal(s: GameState) {
  if (s.office !== 1) return null;
  const office = OFFICE_INFO[1];

  if (isFeatureEnabled("officeFoundation")) {
    const prog = migrateStudioProgression(s.progression, s.office);
    const v = firstOfficeOfferView(s, prog);
    const fansNeed = 1_000;
    const gamesNeed = 5;
    const cashNeed = v.offer.liquidCashGate;
    return {
      fansNeed,
      gamesNeed,
      cashNeed,
      moveCost: v.offer.moveCost,
      fansPct: Math.min(100, (s.fans / fansNeed) * 100),
      gamesPct: Math.min(100, (s.gamesPublished / gamesNeed) * 100),
      cashPct: Math.min(100, (s.cash / Math.max(1, cashNeed)) * 100),
      canMove: v.proofsMet && v.afford.ok,
      proofs: v.proofs as ProofResult[],
      offerState: v.offer.state,
      runway: v.afford.runway,
      seatsAfter: v.dest.hqSeatsTotal,
      constructionWeeks: v.offer.constructionWeeks,
      weeklyOverheadAfter: v.offer.weeklyOverheadAfter,
      activeMove: prog.activeMove,
    };
  }

  return {
    fansNeed: office.fanRequirement ?? 1_000,
    gamesNeed: office.gamesRequirement ?? 5,
    cashNeed: office.cashRequirement ?? 1_000_000,
    moveCost: office.upgradeCost,
    fansPct: Math.min(100, (s.fans / Math.max(1, office.fanRequirement ?? 1)) * 100),
    gamesPct: Math.min(
      100,
      (s.gamesPublished / Math.max(1, office.gamesRequirement ?? 1)) * 100,
    ),
    cashPct: Math.min(100, (s.cash / Math.max(1, office.cashRequirement ?? 1)) * 100),
    canMove:
      s.fans >= (office.fanRequirement ?? 0) &&
      s.gamesPublished >= (office.gamesRequirement ?? 0) &&
      s.cash >= Math.max(office.cashRequirement ?? 0, office.upgradeCost),
    proofs: [] as ProofResult[],
    offerState: "hidden" as const,
    runway: 0,
    seatsAfter: 4,
    constructionWeeks: 2,
    weeklyOverheadAfter: 2_000,
    activeMove: null,
  };
}

/** Player-facing explanation of commercial outcome (no domain mutation). */
export function explainSales(g: ReleasedGame): string {
  const snap = g.salesSnapshot;
  const q = g.productQuality ?? g.avgReview * 10;
  const awareness = g.awarenessAtLaunch ?? g.marketingState?.awarenessPoints ?? 0.25;
  const parts: string[] = [];
  if (g.avgReview >= 8) parts.push("Strong reviews");
  else if (g.avgReview >= 6) parts.push("Mixed-positive reviews");
  else parts.push("Weak reviews");
  if (awareness < 0.25) parts.push("low awareness (slow start possible)");
  else if (awareness > 0.55) parts.push("high awareness");
  if (snap) {
    if (snap.platformLifecycle < 0.35) parts.push("platform past peak");
    if (g.commercialExplain?.priceFit?.includes("poor") || g.commercialExplain?.priceFit?.includes("low")) {
      parts.push("price pressure");
    }
  }
  if (q >= 75 && awareness < 0.3) {
    parts.push("quality without reach → slow burner");
  }
  if (q < 50 && awareness > 0.5) {
    parts.push("visibility without quality → opening then collapse risk");
  }
  if (g.weeksOnMarket >= 8 && g.onSale) parts.push("long-tail still active");
  if (g.dormant) parts.push("dormant on market");
  if (g.commercialExplain) {
    // Prefer frozen explanation strings when present
    return [
      g.commercialExplain.qualityDemand,
      g.commercialExplain.awareness,
      g.commercialExplain.lifecycle,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return parts.join(" · ");
}

export function stageFieldsForProject(p: GameProject): { field: string; label: string; value: number }[] {
  const stage =
    p.devPhase === "STAGE_1_CONFIG" || p.devPhase === "STAGE_1_RUNNING"
      ? 1
      : p.devPhase === "STAGE_2_CONFIG" || p.devPhase === "STAGE_2_RUNNING"
        ? 2
        : 3;
  return STAGE_FIELDS[stage as 1 | 2 | 3].map((f) => ({
    field: f,
    label: FIELD_LABELS[f],
    value: p.sliders[f] ?? 50,
  }));
}

export function libraryRows(games: ReleasedGame[]) {
  return games.map((g) => ({
    id: g.id,
    title: g.title,
    avgReview: g.avgReview,
    sales: g.sales,
    revenue: g.revenue,
    revenueLabel: formatCash(g.revenue),
    onSale: g.onSale,
    dormant: !!g.dormant,
    weeksOnMarket: g.weeksOnMarket,
    explain: explainSales(g),
    year: g.yearReleased,
    genre: getGenre(g.genreId).name,
    platform: getPlatform(g.platformId)?.name ?? g.platformId,
  }));
}
