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

/** First office: bible proofs + liquid cash + move cost (not calendar alone). */
export function evaluateFirstOfficeGate(state: GameState): SystemGateResult {
  const minWeek = firstOfficeMinWeek(START_YEAR);
  const released = state.releasedGames ?? [];
  const profitable = released.some((g) => (g.revenue ?? 0) > (g.developmentCost ?? 5_000));
  const requirements: GateRequirement[] = [
    req(
      "campaign_year",
      "Campaign year 3+",
      state.week >= minWeek,
      `Week ${state.week} / ${minWeek}`,
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
      "profitable",
      "One profitable title",
      profitable,
      profitable ? "Met" : "Need a title that pays for itself",
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
      : "Office needs releases, fans, a profitable title, year 3+, and cash together.",
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

/** Marketing full screen: industry year START+3 + first office + marketing research. Locked in garage. */
export function evaluateMarketingGate(state: GameState): SystemGateResult {
  const yearAnchor = START_YEAR + 3;
  const yearOk = state.year > yearAnchor || (state.year === yearAnchor && state.month >= 1);
  const officeOk = state.office >= 2;
  const researchOk =
    state.flags.marketing ||
    state.researched.includes("marketing") ||
    state.unlocks.marketing === "owned";
  const requirements: GateRequirement[] = [
    req("calendar", `Industry year ${yearAnchor}+`, yearOk, `Year ${state.year} M${state.month}`),
    req("office", "First office", officeOk, `Office tier ${state.office}`),
    req("research", "Marketing researched", researchOk, "Research Marketing 101"),
  ];
  const available = yearOk && officeOk && researchOk;
  return {
    systemId: "marketing_campaigns",
    available,
    locked: !available,
    requirements,
    summary: available
      ? "Marketing campaigns available."
      : "Full marketing campaigns need office + research + calendar.",
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

/** Large games: upgraded office + research + team of 3. */
export function evaluateLargeGamesGate(state: GameState): SystemGateResult {
  const officeOk = state.office >= 3;
  const researchOk =
    state.researched.includes("large_games") || state.unlocks.large_games === "owned";
  const teamOk = state.staff.length >= 3;
  const fanOk = state.fans >= 100_000;
  const requirements: GateRequirement[] = [
    req("office", "Upgraded office", officeOk, `Office tier ${state.office}`),
    req("fans", "100k fans (path)", fanOk, `${state.fans.toLocaleString()} fans`),
    req("research", "Large Games research", researchOk, "Research Large Games"),
    req("team", "Team (3+)", teamOk, `${state.staff.length} staff`),
  ];
  const available = officeOk && researchOk && teamOk;
  return {
    systemId: "large_games",
    available,
    locked: !available,
    requirements,
    summary: available
      ? "Large games unlocked."
      : "Needs upgraded office, Large research, and a larger team.",
  };
}

/** AAA: tech park + research + year 2005 + staff 5 — multi-condition only. */
export function evaluateAaaGate(state: GameState): SystemGateResult {
  const officeOk = state.office >= 4;
  const researchOk =
    state.researched.includes("aaa_games") || state.unlocks.aaa === "owned";
  const teamOk = state.staff.length >= 5;
  const yearOk = state.year >= 2005;
  const requirements: GateRequirement[] = [
    req("office", "Technology park", officeOk, `Office tier ${state.office}`),
    req("calendar", "Year 2005+", yearOk, `Year ${state.year}`),
    req("research", "AAA Production research", researchOk, "Research AAA Production"),
    req("team", "Team (5+)", teamOk, `${state.staff.length} staff`),
  ];
  const available = officeOk && researchOk && teamOk && yearOk;
  return {
    systemId: "aaa",
    available,
    locked: !available,
    requirements,
    summary: available
      ? "AAA production unlocked."
      : "AAA needs tech park, 2005+, research, and a large team.",
  };
}

/** Hiring: first office only (garage hard-locked). */
export function evaluateHiringGate(state: GameState): SystemGateResult {
  const officeOk = state.office >= 2;
  const requirements: GateRequirement[] = [
    req("office", "First office", officeOk, state.office === 1 ? "Still in garage" : `Office tier ${state.office}`),
  ];
  return {
    systemId: "hiring",
    available: officeOk,
    locked: !officeOk,
    requirements,
    summary: officeOk
      ? "Hiring open — fill HQ seats deliberately."
      : "Hiring is unavailable in the garage.",
  };
}

export function evaluateAllGates(state: GameState): SystemGateResult[] {
  return [
    evaluateFirstOfficeGate(state),
    evaluatePublishingGate(state),
    evaluateSequelsGate(state),
    evaluateMarketingGate(state),
    evaluateMediumGamesGate(state),
    evaluateLargeGamesGate(state),
    evaluateAaaGate(state),
    evaluateHiringGate(state),
  ];
}

/**
 * Map gate results into unlock hints (non-destructive).
 * Prefer evaluateProgression / unlockRegistry as the authoritative path;
 * this remains for commercial UI checklists.
 */
export function applyGateUnlockHints(
  unlocks: Record<string, UnlockState>,
  state: GameState,
): Record<string, UnlockState> {
  const next = { ...unlocks };
  const rank: Record<UnlockState, number> = {
    hidden: 0,
    teased: 1,
    discovered: 2,
    researchable: 3,
    owned: 4,
  };
  const set = (id: string, v: UnlockState) => {
    const cur = (next[id] ?? "hidden") as UnlockState;
    if (rank[v] > rank[cur]) next[id] = v;
  };
  if (evaluatePublishingGate(state).available) set("publishing", "owned");
  else if (state.gamesPublished >= 1 || state.fans >= 250) set("publishing", "discovered");

  if (evaluateSequelsGate(state).available) set("sequels", "owned");
  else if (state.gamesPublished >= 1) set("sequels", "teased");

  if (evaluateMarketingGate(state).available) set("marketing", "owned");
  else if (state.office >= 2) set("marketing", "researchable");

  if (evaluateMediumGamesGate(state).available) set("medium_games", "owned");
  else if (state.office >= 2 && state.staff.length >= 2) set("medium_games", "researchable");
  else if (state.office >= 2) set("medium_games", "teased");

  if (evaluateLargeGamesGate(state).available) set("large_games", "owned");
  else if (state.office >= 3 && state.fans >= 100_000) set("large_games", "discovered");
  else if (state.office >= 2 && state.fans >= 25_000) set("large_games", "teased");

  if (evaluateAaaGate(state).available) set("aaa", "owned");
  else if (state.office >= 4 && state.fans >= 500_000) set("aaa", "discovered");

  if (evaluateHiringGate(state).available) {
    set("hiring", "owned");
    if (state.staff.length >= 2) set("training", "owned");
    else set("training", "discovered");
  }
  return next;
}
