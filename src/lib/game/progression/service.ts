import type { GameState, ScreenId, UnlockState } from "../types";

const STARTING_OWNED = new Set(["research", "engines"]);

/** Fresh campaign unlock map — research + engines owned; rest hidden. */
export function initialUnlocks(): Record<string, UnlockState> {
  const u: Record<string, UnlockState> = {
    research: "owned",
    reports: "hidden",
    engines: "owned",
    hiring: "hidden",
    training: "hidden",
    medium_games: "hidden",
    publishing: "hidden",
    audience: "hidden",
    marketing: "hidden",
    sequels: "hidden",
    large_games: "hidden",
    multi_genre: "hidden",
    multi_platform: "hidden",
    ports: "hidden",
    advanced_marketing: "hidden",
    rnd: "hidden",
    aaa: "hidden",
    post_release: "hidden",
    online: "hidden",
    mmo: "hidden",
    hardware: "hidden",
    consoles: "hidden",
    contracts: "hidden",
    market: "hidden",
  };
  return u;
}

export function isOwned(state: GameState, id: string): boolean {
  const s = state.unlocks?.[id];
  return s === "owned" || (STARTING_OWNED.has(id) && !state.unlocks);
}

/** Evaluate progression after meaningful events (release, office, etc.). */
export function evaluateProgression(state: GameState): {
  unlocks: Record<string, UnlockState>;
  notes: string[];
} {
  const unlocks = { ...(state.unlocks ?? initialUnlocks()) };
  const notes: string[] = [];
  const own = (id: string, reason: string) => {
    if (unlocks[id] !== "owned") {
      unlocks[id] = "owned";
      notes.push(reason);
    }
  };
  const discover = (id: string) => {
    if (unlocks[id] === "hidden" || !unlocks[id]) unlocks[id] = "discovered";
  };

  // Always reinforce garage systems
  own("research", "Research desk is open.");
  own("engines", "Engine workshop available in the garage.");

  // After first release: reports, market, contracts, publishing board
  if (state.gamesPublished >= 1) {
    own("market", "Market overview unlocked — watch sales, platforms, and rivals.");
    own("reports", "Game Reports unlocked — review what you learned.");
    own("contracts", "Contract board open under Money — slow refresh, 5 offers.");
    own("publishing", "Publishing board open — reach vs margin deals.");
  }
  if (state.fans >= 500) {
    own("publishing", "Publishing board open — fan base qualifies.");
  }

  // Office 2+: hiring
  if (state.office >= 2) {
    own("hiring", "Hiring unlocked with your new office.");
    own("training", "Staff training is available.");
  }
  // Medium path: office + team (2+) + research — research alone is not enough
  if (state.office >= 2 && state.staff.length >= 2) {
    discover("medium_games");
  }
  if (
    state.researched.includes("medium_games") &&
    state.office >= 2 &&
    state.staff.length >= 2
  ) {
    own("medium_games", "Medium games unlocked — office, team, and research ready.");
  } else if (state.researched.includes("medium_games") && state.staff.length < 2) {
    discover("medium_games");
    // keep not owned until team exists
  }
  // Audience / marketing
  if (state.gamesPublished >= 4 || state.fans >= 5000) {
    discover("audience");
    discover("marketing");
  }
  if (state.flags.audience || state.researched.some((r) => r.includes("audience"))) {
    own("audience", "Target audiences unlocked.");
  }
  if (state.flags.marketing) own("marketing", "Marketing unlocked.");
  // Sequels: after 2 releases OR research / flag
  if (state.gamesPublished >= 2) {
    discover("sequels");
    own("sequels", "Sequels unlocked — ship a follow-up from Games → Released.");
  }
  if (state.flags.sequels || state.researched.includes("sequels") || state.researched.includes("series_continuity")) {
    own("sequels", "Sequels unlocked (Series Continuity).");
  }

  // Large
  if (state.office >= 3 && state.fans >= 100000) {
    discover("large_games");
  }
  if (state.researched.includes("large_games")) own("large_games", "Large Games available.");
  if (state.flags.multiGenre) own("multi_genre", "Multi-genre unlocked.");

  return { unlocks, notes };
}

export function visibleScreens(state: GameState): ScreenId[] {
  const u = state.unlocks ?? initialUnlocks();
  // Garage day-one: studio, develop, engines, staff (founder), research, platforms, finances, settings
  const base: ScreenId[] = [
    "studio",
    "develop",
    "engines",
    "staff",
    "research",
    "platforms",
    "finances",
    "settings",
  ];
  if (u.reports === "owned" || state.gamesPublished > 0) {
    base.splice(2, 0, "games");
  }
  if (u.market === "owned" || state.gamesPublished >= 1) {
    // before settings
    const si = base.indexOf("settings");
    base.splice(si, 0, "market");
  }
  return [...new Set(base)];
}

/** Tech visibility: only owned + researchable next in chain + 1-2 teased */
export function isTechVisible(
  item: { id: string; requires?: string[]; minYear?: number; chain?: string; chainOrder?: number },
  state: GameState,
): "hidden" | "teased" | "available" | "owned" {
  if (state.researched.includes(item.id)) return "owned";
  if (item.minYear && state.year < item.minYear - 2) return "hidden";
  if (item.minYear && state.year < item.minYear) return "teased";
  if (item.requires?.some((r) => !state.researched.includes(r))) {
    const missing = item.requires.filter((r) => !state.researched.includes(r));
    if (missing.length === 1) return "teased";
    return "hidden";
  }
  if (item.chain && item.chainOrder && item.chainOrder > 1) {
    // available only if lower orders done — simplified: if requires met
  }
  return "available";
}

export function migrateUnlocks(raw: Partial<GameState>): Record<string, UnlockState> {
  const base = initialUnlocks();
  if (raw.unlocks && typeof raw.unlocks === "object") {
    return { ...base, ...raw.unlocks, engines: "owned", research: "owned" };
  }
  base.research = "owned";
  base.engines = "owned";
  if ((raw.gamesPublished ?? 0) >= 1) {
    base.reports = "owned";
    base.contracts = "owned";
    base.market = "owned";
  }
  if ((raw.gamesPublished ?? 0) >= 2) base.sequels = "owned";
  if ((raw.office ?? 1) >= 2) {
    base.hiring = "owned";
    base.training = "owned";
  }
  if (raw.flags?.marketing) base.marketing = "owned";
  if (raw.flags?.audience) base.audience = "owned";
  if (raw.flags?.sequels) base.sequels = "owned";
  if (raw.flags?.multiGenre) base.multi_genre = "owned";
  if (raw.flags?.contracts) base.contracts = "owned";
  if (
    (raw.researched ?? []).includes("medium_games") &&
    (raw.office ?? 1) >= 2 &&
    ((raw.staff as { length?: number } | undefined)?.length ?? 1) >= 2
  ) {
    base.medium_games = "owned";
  }
  if ((raw.researched ?? []).includes("large_games") && (raw.office ?? 1) >= 3) {
    base.large_games = "owned";
  }
  return base;
}
