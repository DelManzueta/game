import type { GameState, ScreenId, UnlockState } from "../types";
import {
  SYSTEM_UNLOCKS,
  evaluateAllSystemUnlocks,
  describeUnlockRequirements,
  resolveUnlockState,
  getSystemUnlockDef,
} from "./unlockRegistry";
import { isFeatureEnabled } from "./featureFlags";

const STARTING_OWNED = new Set(["research", "engines"]);

/** Fresh campaign unlock map — research + engines owned; rest from registry defaults. */
export function initialUnlocks(): Record<string, UnlockState> {
  const u: Record<string, UnlockState> = {};
  for (const def of SYSTEM_UNLOCKS) {
    u[def.id] = def.startOwned ? "owned" : "hidden";
  }
  return u;
}

export function isOwned(state: GameState, id: string): boolean {
  const s = state.unlocks?.[id];
  return s === "owned" || (STARTING_OWNED.has(id) && !state.unlocks);
}

/** Whether a system is at least visible (teased+) for UI chrome. */
export function isUnlockVisible(state: GameState, id: string): boolean {
  const s = state.unlocks?.[id];
  return s === "teased" || s === "discovered" || s === "researchable" || s === "owned";
}

/** Whether the player can act on the system. */
export function isUnlockOwned(state: GameState, id: string): boolean {
  return isOwned(state, id);
}

/**
 * Evaluate progression after meaningful events (release, office move, hire, research).
 * Uses declarative registry: hidden → teased → discovered → researchable → owned.
 */
export function evaluateProgression(state: GameState): {
  unlocks: Record<string, UnlockState>;
  notes: string[];
} {
  const base = { ...(state.unlocks ?? initialUnlocks()) };
  // Ensure all registry ids exist
  for (const def of SYSTEM_UNLOCKS) {
    if (!base[def.id]) base[def.id] = def.startOwned ? "owned" : "hidden";
  }
  const { unlocks, notes } = evaluateAllSystemUnlocks({ ...state, unlocks: base });

  // Always reinforce garage systems
  unlocks.research = "owned";
  unlocks.engines = "owned";

  return { unlocks, notes };
}

export function visibleScreens(state: GameState): ScreenId[] {
  const u = state.unlocks ?? initialUnlocks();
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
    const si = base.indexOf("settings");
    base.splice(si, 0, "market");
  }
  // Late systems: only add screens when owned and checkpoint live
  if (u.rnd === "owned" && isFeatureEnabled("techParkLabs")) {
    // future: labs screen id
  }
  return [...new Set(base)];
}

/** Tech / research catalog visibility: owned + researchable next + teased. */
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
  // Studio research for gated sizes: respect system unlock researchable state
  if (item.id === "medium_games") {
    const s = state.unlocks?.medium_games;
    if (s === "hidden") return "hidden";
    if (s === "teased") return "teased";
    if (s === "owned") return "owned";
    // discovered / researchable → available
    return "available";
  }
  if (item.id === "large_games") {
    const s = state.unlocks?.large_games;
    if (!s || s === "hidden") return "hidden";
    if (s === "teased") return "teased";
    if (s === "owned") return "owned";
    return "available";
  }
  if (item.id === "aaa_games") {
    const s = state.unlocks?.aaa;
    if (!s || s === "hidden") return "hidden";
    if (s === "teased") return "teased";
    if (s === "owned") return "owned";
    return "available";
  }
  return "available";
}

export function migrateUnlocks(raw: Partial<GameState>): Record<string, UnlockState> {
  const base = initialUnlocks();
  if (raw.unlocks && typeof raw.unlocks === "object") {
    Object.assign(base, raw.unlocks);
  }
  base.research = "owned";
  base.engines = "owned";

  // Re-evaluate from migrated stats so mid-campaign saves pick up new registry
  const pseudo = {
    ...raw,
    unlocks: base,
    gamesPublished: raw.gamesPublished ?? 0,
    fans: raw.fans ?? 0,
    office: raw.office ?? 1,
    staff: raw.staff ?? [{ id: "founder" }],
    researched: raw.researched ?? [],
    flags: raw.flags ?? {
      multiGenre: false,
      sequels: false,
      expansions: false,
      marketing: false,
      contracts: false,
      audience: false,
      rndLab: false,
      hardwareLab: false,
    },
    year: raw.year ?? 1979,
    month: raw.month ?? 1,
    week: raw.week ?? 0,
    releasedGames: raw.releasedGames ?? [],
  } as GameState;

  const { unlocks } = evaluateAllSystemUnlocks(pseudo);
  unlocks.research = "owned";
  unlocks.engines = "owned";
  return unlocks;
}

export { describeUnlockRequirements, getSystemUnlockDef, resolveUnlockState, SYSTEM_UNLOCKS };
