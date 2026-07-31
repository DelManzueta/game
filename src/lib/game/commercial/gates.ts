/**
 * Unified system gate evaluation.
 * available = date AND prerequisites AND resources AND studio capacity (where relevant).
 * Time alone or money alone never unlocks major systems.
 */
import type { GameState, UnlockState } from "../types";
import { FIRST_OFFICE_GATE, firstOfficeMinWeek } from "./config";
import { publishingUnlocked } from "./publishing";
import { START_YEAR } from "../data";

export type GateRequirement = {
  id: string;
  label: string;
  met: boolean;
  detail: string;
};

export type SystemGateResult = {
  systemId: string;
  available: boolean;
  locked: boolean;
  requirements: GateRequirement[];
  summary: string;
};

function req(
  id: string,
  label: string,
  met: boolean,
  detail: string,
): GateRequirement {
  return { id, label, met, detail };
}

/** First office: calendar floor + fans + releases + cash + move cost. */
export function evaluateFirstOfficeGate(state: GameState): SystemGateResult {
  const minWeek = firstOfficeMinWeek(START_YEAR);
  const requirements: GateRequirement[] = [
    req(
      "calendar",
      "Calendar floor",
      state.week >= minWeek,
      `Year ${FIRST_OFFICE_GATE.minYear} Month ${FIRST_OFFICE_GATE.minMonth}+ (week ${minWeek}+)`,
    ),
    req(
      "releases",
      "Released games",
      state.gamesPublished >= FIRST_OFFICE_GATE.minReleasedGames,
      `${state.gamesPublished} / ${FIRST_OFFICE_GATE.minReleasedGames}`,
    ),
    req(
      "fans",
      "Fans",
      state.fans >= FIRST_OFFICE_GATE.minFans,
      `${state.fans.toLocaleString()} / ${FIRST_OFFICE_GATE.minFans.toLocaleString()}`,
    ),
    req(
      "cash",
      "Cash on hand",
      state.cash >= FIRST_OFFICE_GATE.minCashOnHand,
      `Need $${FIRST_OFFICE_GATE.minCashOnHand.toLocaleString()}`,
    ),
    req(
      "move_cost",
      "Move cost",
      state.cash >= FIRST_OFFICE_GATE.moveCost,
      `$${FIRST_OFFICE_GATE.moveCost.toLocaleString()} paid on move`,
    ),
  ];
  const available = requirements.every((r) => r.met) && state.office === 1;
  return {
    systemId: "first_office",
    available,
    locked: state.office === 1 && !available,
    requirements,
    summary: available
      ? "Ready to leave the garage."
      : "Office needs time, fans, releases, and cash together.",
  };
}

/** Publishing board: 1 release OR 500 fans (not money/time alone). */
export function evaluatePublishingGate(state: GameState): SystemGateResult {
  const byRelease = state.gamesPublished >= 1;
  const byFans = state.fans >= 500;
  const requirements: GateRequirement[] = [
    req("releases", "1 released game", byRelease, `${state.gamesPublished} releases`),
    req("fans", "500 fans (alt)", byFans, `${state.fans} fans`),
  ];
  const available = publishingUnlocked({
    gamesPublished: state.gamesPublished,
    fans: state.fans,
  });
  return {
    systemId: "publishing",
    available,
    locked: !available,
    requirements,
    summary: available
      ? "Publishing board open — self-publish still available."
      : "Ship one game or reach 500 fans.",
  };
}

/** Sequels: 2 releases OR Series Continuity / sequels research. */
export function evaluateSequelsGate(state: GameState): SystemGateResult {
  const byReleases = state.gamesPublished >= 2;
  const byResearch =
    state.researched.includes("sequels") ||
    state.researched.includes("series_continuity") ||
    state.flags.sequels ||
    state.unlocks.sequels === "owned";
  const requirements: GateRequirement[] = [
    req("releases", "2 released games", byReleases, `${state.gamesPublished} / 2`),
    req(
      "research",
      "Series Continuity research (alt)",
      byResearch && !byReleases ? true : state.researched.includes("sequels") || state.researched.includes("series_continuity"),
      "Research OR 2 releases",
    ),
  ];
  const available = byReleases || byResearch;
  return {
    systemId: "sequels",
    available,
    locked: !available,
    requirements,
    summary: available
      ? "Sequels available from Games → Released."
      : "Need 2 releases or Series Continuity research.",
  };
}

/** Marketing full screen: Year 4 + first office + marketing research + cash buffer. Locked in garage. */
export function evaluateMarketingGate(state: GameState): SystemGateResult {
  const yearOk = state.year > 1985 || (state.year === 1985 && state.month >= 5);
  const officeOk = state.office >= 2;
  const researchOk =
    state.flags.marketing ||
    state.researched.includes("marketing") ||
    state.unlocks.marketing === "owned";
  const requirements: GateRequirement[] = [
    req("calendar", "Year 4+ (anchor)", yearOk, `Year ${state.year} M${state.month}`),
    req("office", "First office", officeOk, `Office tier ${state.office}`),
    req("research", "Marketing researched", researchOk, "Research Marketing 101"),
  ];
  // Garage: marketing spend slider may unlock earlier as basic; full campaigns stay locked
  const available = yearOk && officeOk && researchOk;
  return {
    systemId: "marketing_campaigns",
    available,
    locked: !available,
    requirements,
    summary: available
      ? "Marketing campaigns available."
      : "Full marketing campaigns need office + research + time.",
  };
}

/** Medium games: office + research + team (founder + hire) — never cash alone. */
export function evaluateMediumGamesGate(state: GameState): SystemGateResult {
  const officeOk = state.office >= 2;
  const researchOk =
    state.researched.includes("medium_games") || state.unlocks.medium_games === "owned";
  const teamOk = state.staff.length >= 2;
  const requirements: GateRequirement[] = [
    req("office", "First office", officeOk, `Office tier ${state.office}`),
    req("research", "Medium Games research", researchOk, "Research Medium Games"),
    req("team", "Team (2+ people)", teamOk, `${state.staff.length} staff — hire at least one`),
  ];
  const available = officeOk && researchOk && teamOk;
  return {
    systemId: "medium_games",
    available,
    locked: !available,
    requirements,
    summary: available
      ? "Medium games unlocked."
      : "Needs office move, Medium research, and a hired teammate.",
  };
}

export function evaluateAllGates(state: GameState): SystemGateResult[] {
  return [
    evaluateFirstOfficeGate(state),
    evaluatePublishingGate(state),
    evaluateSequelsGate(state),
    evaluateMarketingGate(state),
    evaluateMediumGamesGate(state),
  ];
}

/** Map gate results into unlock discover/own hints (non-destructive). */
export function applyGateUnlockHints(
  unlocks: Record<string, UnlockState>,
  state: GameState,
): Record<string, UnlockState> {
  const next = { ...unlocks };
  const set = (id: string, v: UnlockState) => {
    const cur = next[id];
    if (cur === "owned") return;
    if (v === "owned") next[id] = "owned";
    else if (v === "discovered") next[id] = "discovered";
  };
  if (evaluatePublishingGate(state).available) set("publishing", "owned");
  if (evaluateSequelsGate(state).available) set("sequels", "owned");
  if (evaluateMarketingGate(state).available) set("marketing", "owned");
  if (evaluateMediumGamesGate(state).available) set("medium_games", "owned");
  if (state.office >= 3 && state.fans >= 100000) set("large_games", "discovered");
  if (state.office >= 2) {
    set("hiring", "owned");
    set("training", "owned");
  }
  return next;
}
