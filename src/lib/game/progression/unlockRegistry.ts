/**
 * Declarative system unlock registry — continuous core progression.
 * States: hidden → teased → discovered → researchable → owned
 * Never time-only or cash-only for major systems.
 * Feature flags keep distant checkpoints dark until their CP ships.
 */
import type { GameState, UnlockState } from "../types";
import { START_YEAR } from "../data";
import type { FeatureFlagId } from "./featureFlags";
import { isFeatureEnabled } from "./featureFlags";
import { campaignYearFromWeeks } from "./campaign";
import { WEEKS_PER_YEAR } from "../data";

export type UnlockCondition =
  | { type: "min_releases"; n: number }
  | { type: "min_fans"; n: number }
  | { type: "min_office"; n: number }
  | { type: "min_staff"; n: number }
  | { type: "min_industry_year"; year: number }
  | { type: "min_campaign_year"; n: number }
  | { type: "researched"; id: string }
  | { type: "any_researched"; ids: string[] }
  | { type: "flag"; key: keyof GameState["flags"] }
  | { type: "unlock_owned"; id: string }
  | { type: "feature"; id: FeatureFlagId }
  | { type: "profitable_title" }
  | { type: "any"; of: UnlockCondition[] }
  | { type: "all"; of: UnlockCondition[] };

export type SystemUnlockDef = {
  id: string;
  label: string;
  /** Brief player-facing reason when unlocked. */
  ownNote: string;
  /** Checkpoint gate — if false, never leaves hidden. */
  feature?: FeatureFlagId;
  /** Foreshadow: player hears about it. */
  teaseWhen?: UnlockCondition;
  /** Visible as locked with requirements. */
  discoverWhen?: UnlockCondition;
  /** Can research / start the unlock path. */
  researchableWhen?: UnlockCondition;
  /** Fully usable. */
  ownWhen: UnlockCondition;
  /** Owned at campaign start. */
  startOwned?: boolean;
};

const RANK: Record<UnlockState, number> = {
  hidden: 0,
  teased: 1,
  discovered: 2,
  researchable: 3,
  owned: 4,
};

export function hasProfitableTitle(state: GameState): boolean {
  return (state.releasedGames ?? []).some((g) => {
    const rev = g.revenue ?? 0;
    const cost = g.developmentCost ?? 0;
    if (cost > 0) return rev > cost;
    return rev > 5_000;
  });
}

export function evalCondition(c: UnlockCondition, state: GameState): boolean {
  switch (c.type) {
    case "min_releases":
      return state.gamesPublished >= c.n;
    case "min_fans":
      return state.fans >= c.n;
    case "min_office":
      return state.office >= c.n;
    case "min_staff":
      return state.staff.length >= c.n;
    case "min_industry_year":
      return state.year > c.year || (state.year === c.year && state.month >= 1);
    case "min_campaign_year":
      return campaignYearFromWeeks(state.week, WEEKS_PER_YEAR) >= c.n;
    case "researched":
      return state.researched.includes(c.id);
    case "any_researched":
      return c.ids.some((id) => state.researched.includes(id));
    case "flag":
      return Boolean(state.flags?.[c.key]);
    case "unlock_owned":
      return state.unlocks?.[c.id] === "owned";
    case "feature":
      return isFeatureEnabled(c.id);
    case "profitable_title":
      return hasProfitableTitle(state);
    case "any":
      return c.of.some((x) => evalCondition(x, state));
    case "all":
      return c.of.every((x) => evalCondition(x, state));
    default:
      return false;
  }
}

/**
 * Core continuous arc unlocks.
 * Late systems (rnd, aaa, online, hardware…) require their feature flag
 * so they stay dark until their checkpoint is enabled — still core content.
 */
export const SYSTEM_UNLOCKS: SystemUnlockDef[] = [
  {
    id: "research",
    label: "Research desk",
    ownNote: "Research desk is open.",
    startOwned: true,
    ownWhen: { type: "all", of: [] },
  },
  {
    id: "engines",
    label: "Engine workshop",
    ownNote: "Engine workshop available in the garage.",
    startOwned: true,
    ownWhen: { type: "all", of: [] },
  },
  {
    id: "market",
    label: "Market overview",
    ownNote: "Market overview unlocked — watch sales, platforms, and rivals.",
    discoverWhen: { type: "min_releases", n: 1 },
    ownWhen: { type: "min_releases", n: 1 },
  },
  {
    id: "reports",
    label: "Game Reports",
    ownNote: "Game Reports unlocked — review what you learned.",
    discoverWhen: { type: "min_releases", n: 1 },
    ownWhen: { type: "min_releases", n: 1 },
  },
  {
    id: "contracts",
    label: "Contract board",
    ownNote: "Contract board open under Money — slow refresh, 5 offers.",
    teaseWhen: { type: "min_releases", n: 1 },
    discoverWhen: { type: "min_releases", n: 1 },
    ownWhen: {
      type: "any",
      of: [
        { type: "min_releases", n: 1 },
        { type: "flag", key: "contracts" },
        { type: "researched", id: "contracts" },
      ],
    },
  },
  {
    id: "publishing",
    label: "Publishing board",
    ownNote: "Publishing board open — reach vs margin deals.",
    teaseWhen: { type: "min_releases", n: 1 },
    discoverWhen: {
      type: "any",
      of: [
        { type: "min_releases", n: 1 },
        { type: "min_fans", n: 250 },
      ],
    },
    ownWhen: {
      type: "any",
      of: [
        { type: "min_releases", n: 1 },
        { type: "min_fans", n: 500 },
      ],
    },
  },
  {
    id: "hiring",
    label: "Hiring",
    ownNote: "Hiring unlocked with your new office.",
    feature: "firstOfficeEmployees",
    teaseWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 1 },
        { type: "min_releases", n: 3 },
      ],
    },
    discoverWhen: {
      type: "any",
      of: [
        { type: "min_office", n: 2 },
        {
          type: "all",
          of: [
            { type: "min_releases", n: 5 },
            { type: "min_fans", n: 1000 },
          ],
        },
      ],
    },
    ownWhen: { type: "min_office", n: 2 },
  },
  {
    id: "training",
    label: "Staff training",
    ownNote: "Staff training is available.",
    feature: "firstOfficeEmployees",
    teaseWhen: { type: "min_office", n: 2 },
    discoverWhen: { type: "min_office", n: 2 },
    ownWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 2 },
        { type: "min_staff", n: 2 },
      ],
    },
  },
  {
    id: "medium_games",
    label: "Medium games",
    ownNote: "Medium games unlocked — office, team, and research ready.",
    feature: "firstOfficeEmployees",
    teaseWhen: { type: "min_office", n: 2 },
    discoverWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 2 },
        { type: "min_staff", n: 2 },
      ],
    },
    researchableWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 2 },
        { type: "min_staff", n: 2 },
      ],
    },
    ownWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 2 },
        { type: "min_staff", n: 2 },
        { type: "researched", id: "medium_games" },
      ],
    },
  },
  {
    id: "audience",
    label: "Target audiences",
    ownNote: "Target audiences unlocked.",
    teaseWhen: { type: "min_releases", n: 2 },
    discoverWhen: {
      type: "any",
      of: [
        { type: "min_releases", n: 4 },
        { type: "min_fans", n: 5_000 },
      ],
    },
    researchableWhen: {
      type: "any",
      of: [
        { type: "min_releases", n: 4 },
        { type: "min_fans", n: 5_000 },
      ],
    },
    ownWhen: {
      type: "any",
      of: [
        { type: "flag", key: "audience" },
        { type: "researched", id: "target_audience" },
        { type: "any_researched", ids: ["target_audience", "audience"] },
      ],
    },
  },
  {
    id: "marketing",
    label: "Marketing",
    ownNote: "Marketing unlocked.",
    teaseWhen: { type: "min_releases", n: 2 },
    discoverWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 2 },
        {
          type: "any",
          of: [
            { type: "min_releases", n: 4 },
            { type: "min_fans", n: 5_000 },
          ],
        },
      ],
    },
    researchableWhen: { type: "min_office", n: 2 },
    ownWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 2 },
        {
          type: "any",
          of: [
            { type: "flag", key: "marketing" },
            { type: "researched", id: "marketing" },
          ],
        },
        // Industry year: roughly campaign year 4 → START_YEAR+3
        { type: "min_industry_year", year: START_YEAR + 3 },
      ],
    },
  },
  {
    id: "sequels",
    label: "Sequels",
    ownNote: "Sequels unlocked — ship a follow-up from Games → Released.",
    teaseWhen: { type: "min_releases", n: 1 },
    discoverWhen: { type: "min_releases", n: 2 },
    researchableWhen: { type: "min_releases", n: 1 },
    ownWhen: {
      type: "any",
      of: [
        { type: "min_releases", n: 2 },
        { type: "flag", key: "sequels" },
        { type: "researched", id: "sequels" },
        { type: "researched", id: "series_continuity" },
      ],
    },
  },
  {
    id: "large_games",
    label: "Large games",
    ownNote: "Large games available.",
    feature: "upgradedOffice",
    teaseWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 2 },
        { type: "min_fans", n: 25_000 },
      ],
    },
    discoverWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 3 },
        { type: "min_fans", n: 100_000 },
      ],
    },
    researchableWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 3 },
        { type: "min_fans", n: 50_000 },
      ],
    },
    ownWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 3 },
        { type: "min_staff", n: 3 },
        { type: "researched", id: "large_games" },
      ],
    },
  },
  {
    id: "multi_genre",
    label: "Multi-genre",
    ownNote: "Multi-genre unlocked.",
    teaseWhen: { type: "min_office", n: 2 },
    discoverWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 2 },
        { type: "min_releases", n: 6 },
      ],
    },
    researchableWhen: { type: "min_office", n: 2 },
    ownWhen: {
      type: "any",
      of: [
        { type: "flag", key: "multiGenre" },
        { type: "researched", id: "multi_genre" },
      ],
    },
  },
  {
    id: "multi_platform",
    label: "Multi-platform development",
    ownNote: "Multi-platform projects unlocked.",
    teaseWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 2 },
        { type: "min_releases", n: 3 },
      ],
    },
    discoverWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 2 },
        { type: "min_releases", n: 5 },
      ],
    },
    ownWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 2 },
        { type: "min_releases", n: 5 },
        {
          type: "any",
          of: [
            { type: "min_fans", n: 10_000 },
            { type: "researched", id: "multi_platform" },
          ],
        },
      ],
    },
  },
  {
    id: "ports",
    label: "Ports",
    ownNote: "Port projects unlocked.",
    teaseWhen: { type: "min_releases", n: 3 },
    discoverWhen: {
      type: "all",
      of: [
        { type: "min_releases", n: 5 },
        { type: "min_office", n: 2 },
      ],
    },
    ownWhen: {
      type: "all",
      of: [
        { type: "min_releases", n: 5 },
        { type: "min_office", n: 2 },
        { type: "unlock_owned", id: "multi_platform" },
      ],
    },
  },
  {
    id: "advanced_marketing",
    label: "Advanced marketing",
    ownNote: "Advanced marketing campaigns unlocked.",
    teaseWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 2 },
        { type: "unlock_owned", id: "marketing" },
      ],
    },
    discoverWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 3 },
        { type: "unlock_owned", id: "marketing" },
      ],
    },
    ownWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 3 },
        { type: "unlock_owned", id: "marketing" },
        { type: "min_fans", n: 50_000 },
      ],
    },
  },
  {
    id: "post_release",
    label: "Post-release support",
    ownNote: "Post-release support tools unlocked.",
    teaseWhen: { type: "min_releases", n: 2 },
    discoverWhen: { type: "min_releases", n: 4 },
    ownWhen: {
      type: "all",
      of: [
        { type: "min_releases", n: 4 },
        { type: "min_office", n: 2 },
      ],
    },
  },
  {
    id: "rnd",
    label: "R&D lab",
    ownNote: "R&D division unlocked.",
    feature: "techParkLabs",
    teaseWhen: { type: "min_office", n: 3 },
    discoverWhen: { type: "min_office", n: 4 },
    ownWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 4 },
        {
          type: "any",
          of: [
            { type: "flag", key: "rndLab" },
            { type: "min_staff", n: 4 },
          ],
        },
      ],
    },
  },
  {
    id: "hardware",
    label: "Hardware lab",
    ownNote: "Hardware lab unlocked.",
    feature: "techParkLabs",
    teaseWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 4 },
        { type: "unlock_owned", id: "rnd" },
      ],
    },
    discoverWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 4 },
        { type: "unlock_owned", id: "rnd" },
      ],
    },
    ownWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 4 },
        { type: "flag", key: "hardwareLab" },
      ],
    },
  },
  {
    id: "consoles",
    label: "Custom consoles",
    ownNote: "Custom console projects unlocked.",
    feature: "endgameBusinesses",
    teaseWhen: { type: "unlock_owned", id: "hardware" },
    discoverWhen: {
      type: "all",
      of: [
        { type: "unlock_owned", id: "hardware" },
        { type: "min_office", n: 5 },
      ],
    },
    ownWhen: {
      type: "all",
      of: [
        { type: "unlock_owned", id: "hardware" },
        { type: "min_office", n: 5 },
      ],
    },
  },
  {
    id: "aaa",
    label: "AAA production",
    ownNote: "AAA production class unlocked.",
    feature: "aaa",
    teaseWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 3 },
        { type: "min_fans", n: 200_000 },
      ],
    },
    discoverWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 4 },
        { type: "min_fans", n: 500_000 },
      ],
    },
    researchableWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 4 },
        { type: "min_industry_year", year: 2005 },
      ],
    },
    ownWhen: {
      type: "all",
      of: [
        { type: "min_office", n: 4 },
        { type: "min_staff", n: 5 },
        { type: "min_industry_year", year: 2005 },
        { type: "researched", id: "aaa_games" },
      ],
    },
  },
  {
    id: "online",
    label: "Online services",
    ownNote: "Online service operations unlocked.",
    feature: "liveServices",
    teaseWhen: {
      type: "all",
      of: [
        { type: "min_industry_year", year: 1999 },
        { type: "min_office", n: 3 },
      ],
    },
    discoverWhen: {
      type: "all",
      of: [
        { type: "min_industry_year", year: 2002 },
        { type: "min_office", n: 4 },
      ],
    },
    ownWhen: {
      type: "all",
      of: [
        { type: "min_industry_year", year: 2004 },
        { type: "min_office", n: 4 },
        { type: "min_releases", n: 10 },
      ],
    },
  },
  {
    id: "mmo",
    label: "MMO / live worlds",
    ownNote: "MMO and live-world production unlocked.",
    feature: "liveServices",
    teaseWhen: { type: "unlock_owned", id: "online" },
    discoverWhen: {
      type: "all",
      of: [
        { type: "unlock_owned", id: "online" },
        { type: "min_fans", n: 250_000 },
      ],
    },
    ownWhen: {
      type: "all",
      of: [
        { type: "unlock_owned", id: "online" },
        { type: "min_office", n: 5 },
        { type: "min_fans", n: 500_000 },
      ],
    },
  },
];

export function getSystemUnlockDef(id: string): SystemUnlockDef | undefined {
  return SYSTEM_UNLOCKS.find((u) => u.id === id);
}

function maxState(a: UnlockState, b: UnlockState): UnlockState {
  return RANK[a] >= RANK[b] ? a : b;
}

/**
 * Resolve one system unlock for the current state.
 * Never downgrades from owned (except migration rebuild).
 */
/** Systems that may soft-unlock before their full checkpoint is implemented. */
const SOFT_PRE_CHECKPOINT = new Set(["hiring", "training", "medium_games", "post_release"]);

export function resolveUnlockState(
  def: SystemUnlockDef,
  state: GameState,
  current?: UnlockState,
): UnlockState {
  if (def.startOwned) return "owned";

  if (def.feature && !isFeatureEnabled(def.feature) && !SOFT_PRE_CHECKPOINT.has(def.id)) {
    return current === "owned" ? "owned" : "hidden";
  }

  let next: UnlockState = "hidden";

  if (def.teaseWhen && evalCondition(def.teaseWhen, state)) next = maxState(next, "teased");
  if (def.discoverWhen && evalCondition(def.discoverWhen, state)) next = maxState(next, "discovered");
  if (def.researchableWhen && evalCondition(def.researchableWhen, state)) {
    next = maxState(next, "researchable");
  }
  // ownWhen with empty all is always true
  if (evalCondition(def.ownWhen, state)) next = "owned";

  // Never downgrade owned
  if (current === "owned") return "owned";
  if (current && RANK[current] > RANK[next]) return current;
  return next;
}

export function evaluateAllSystemUnlocks(state: GameState): {
  unlocks: Record<string, UnlockState>;
  notes: string[];
  transitions: Array<{ id: string; from: UnlockState; to: UnlockState }>;
} {
  const prev = { ...(state.unlocks ?? {}) };
  const unlocks: Record<string, UnlockState> = { ...prev };
  const notes: string[] = [];
  const transitions: Array<{ id: string; from: UnlockState; to: UnlockState }> = [];

  // Two-pass so dependent unlocks (ports → multi_platform) can see mid-pass owns
  for (let pass = 0; pass < 2; pass++) {
    const snap: GameState = { ...state, unlocks: { ...unlocks } };
    for (const def of SYSTEM_UNLOCKS) {
      const current = (unlocks[def.id] ?? "hidden") as UnlockState;
      const to = resolveUnlockState(def, snap, current);
      unlocks[def.id] = to;
    }
  }

  // Notes / transitions vs *pre-evaluation* state only (never mid-pass noise)
  for (const def of SYSTEM_UNLOCKS) {
    const from = (prev[def.id] ?? "hidden") as UnlockState;
    const to = (unlocks[def.id] ?? "hidden") as UnlockState;
    if (from !== to) {
      transitions.push({ id: def.id, from, to });
      if (to === "owned" && from !== "owned") notes.push(def.ownNote);
    }
  }

  return { unlocks, notes, transitions };
}

/** Player-facing requirements list for a locked system. */
export function describeUnlockRequirements(
  id: string,
  state: GameState,
): Array<{ label: string; met: boolean }> {
  const def = getSystemUnlockDef(id);
  if (!def) return [];
  const own = def.ownWhen;
  return flattenConditions(own).map((c) => ({
    label: conditionLabel(c),
    met: evalCondition(c, state),
  }));
}

function flattenConditions(c: UnlockCondition): UnlockCondition[] {
  if (c.type === "all") return c.of.flatMap(flattenConditions);
  if (c.type === "any") return c.of; // show alternatives as-is
  return [c];
}

function conditionLabel(c: UnlockCondition): string {
  switch (c.type) {
    case "min_releases":
      return `${c.n}+ released games`;
    case "min_fans":
      return `${c.n.toLocaleString()}+ fans`;
    case "min_office":
      return c.n <= 1 ? "Garage" : c.n === 2 ? "First office" : c.n === 3 ? "Upgraded office" : c.n === 4 ? "Technology park" : "Expanded campus";
    case "min_staff":
      return `Team of ${c.n}+`;
    case "min_industry_year":
      return `Industry year ${c.year}+`;
    case "min_campaign_year":
      return `Campaign year ${c.n}+`;
    case "researched":
      return `Research: ${c.id}`;
    case "any_researched":
      return `Research one of: ${c.ids.join(", ")}`;
    case "flag":
      return `Capability: ${String(c.key)}`;
    case "unlock_owned":
      return `Unlock: ${c.id}`;
    case "feature":
      return `System available`;
    case "profitable_title":
      return "One profitable title";
    case "any":
      return "Any of several paths";
    case "all":
      return "All requirements";
    default:
      return "Requirement";
  }
}
