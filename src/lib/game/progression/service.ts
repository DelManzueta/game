import type { GameState, ScreenId, UnlockState } from "../types";

const STARTING_OWNED = new Set(["research"]);

/** Fresh campaign unlock map — only Research owned; rest hidden. */
export function initialUnlocks(): Record<string, UnlockState> {
  const u: Record<string, UnlockState> = {
    research: "owned",
    reports: "hidden",
    engines: "hidden",
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
  return s === "owned" || STARTING_OWNED.has(id) && !state.unlocks;
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

  // After first release: reports
  if (state.gamesPublished >= 1) {
    own("market", "Market overview unlocked — watch platforms and rivals.");
    own("reports", "Game Reports unlocked — review what you learned.");
  }
  // After 2 releases: contracts
  if (state.gamesPublished >= 2) {
    own("contracts", "Contract work is available for emergency cash.");
  }
  // After 3 releases: engines path
  if (state.gamesPublished >= 3) {
    own("engines", "Custom engines can now be researched and built.");
  }
  // Office 2+: hiring
  if (state.office >= 2) {
    own("hiring", "Hiring unlocked with your new office.");
    own("training", "Staff training is available.");
  }
  // Medium path
  if (state.office >= 2 && state.staff.length >= 2 && state.engines.some((e) => e.custom)) {
    discover("medium_games");
    if (state.researched.includes("medium_games")) own("medium_games", "Medium games researched.");
  }
  if (state.researched.includes("medium_games")) {
    own("medium_games", "Medium Games available.");
    own("publishing", "Publishing deals unlocked.");
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
  // Sequels
  if (state.releasedGames.some((g) => g.avgReview >= 8)) {
    discover("sequels");
    if (state.flags.sequels || state.researched.includes("sequels")) {
      own("sequels", "Sequels unlocked.");
    }
  }
  // Large
  if (state.office >= 3 && state.fans >= 100000) {
    discover("large_games");
  }
  if (state.researched.includes("large_games")) own("large_games", "Large Games available.");
  if (state.flags.multiGenre) own("multi_genre", "Multi-genre unlocked.");

  // Late systems stay hidden unless explicitly owned via cheats/research
  return { unlocks, notes };
}

export function visibleScreens(state: GameState): ScreenId[] {
  const base: ScreenId[] = ["studio", "develop", "settings"];
  const u = state.unlocks ?? initialUnlocks();
  if (u.reports === "owned" || state.gamesPublished > 0) base.splice(2, 0, "games");
  if (u.research === "owned" || (state.researched?.length ?? 0) >= 0) {
    // research always available once campaign started (spec: already unlocked)
    if (!base.includes("research")) base.splice(-1, 0, "research");
  }
  if (u.hiring === "owned" || state.office >= 2) base.splice(-1, 0, "staff");
  if (u.engines === "owned" || state.engines.some((e) => e.custom) || state.gamesPublished >= 3) {
    if (!base.includes("engines")) base.splice(-1, 0, "engines");
  }
  base.splice(-1, 0, "platforms");
  base.splice(-1, 0, "finances");
  if (u.market === "owned" || state.gamesPublished >= 1) {
    if (!base.includes("market")) base.splice(-1, 0, "market");
  }

  // unique preserve order
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
    // if only one req missing and close, tease
    const missing = item.requires.filter((r) => !state.researched.includes(r));
    if (missing.length === 1) return "teased";
    return "hidden";
  }
  // chain: hide if previous in chain not owned
  if (item.chain && item.chainOrder && item.chainOrder > 1) {
    // available only if lower orders done — simplified: if requires met
  }
  return "available";
}

export function migrateUnlocks(raw: Partial<GameState>): Record<string, UnlockState> {
  const base = initialUnlocks();
  if (raw.unlocks && typeof raw.unlocks === "object") {
    return { ...base, ...raw.unlocks };
  }
  // Infer from old save
  base.research = "owned";
  if ((raw.gamesPublished ?? 0) >= 1) base.reports = "owned";
  if ((raw.gamesPublished ?? 0) >= 2) base.contracts = "owned";
  if ((raw.gamesPublished ?? 0) >= 3) base.engines = "owned";
  if ((raw.office ?? 1) >= 2) {
    base.hiring = "owned";
    base.training = "owned";
  }
  if (raw.flags?.marketing) base.marketing = "owned";
  if (raw.flags?.audience) base.audience = "owned";
  if (raw.flags?.sequels) base.sequels = "owned";
  if (raw.flags?.multiGenre) base.multi_genre = "owned";
  if (raw.flags?.contracts) base.contracts = "owned";
  if ((raw.researched ?? []).includes("medium_games")) base.medium_games = "owned";
  if ((raw.researched ?? []).includes("large_games")) base.large_games = "owned";
  return base;
}
