/**
 * Office offer state machine + Garage → First Office proofs.
 * Bible §4 + §5.4. Calculations stay outside UI.
 */
import type { GameState } from "../types";
import { WEEKS_PER_YEAR } from "../data";
import { campaignYearFromWeeks } from "./campaign";
import { officeDef, transitionFor } from "./offices";
import type {
  OfferId,
  OfficeOfferRecord,
  ProgressionOfferState,
  StudioProgressionState,
  StudioTierId,
  TransitionGate,
} from "./types";
import { isFeatureEnabled } from "./featureFlags";

export type ProofResult = { id: string; label: string; met: boolean; detail: string };

export function emptyOffer(offerId: OfferId, gate: TransitionGate): OfficeOfferRecord {
  const dest = officeDef(gate.toTier);
  return {
    offerId,
    state: "hidden",
    moveCost: gate.moveCost,
    liquidCashGate: gate.liquidCashGate,
    weeklyOverheadAfter: dest.weeklyOverhead,
    hqSeatsAfter: dest.hqSeatsTotal,
    constructionWeeks: gate.constructionWeeks,
    minRunwayWeeks: gate.minRunwayWeeks,
    discoveredWeek: null,
    offeredWeek: null,
    reminderWeeks: [],
    reminderDueWeeks: [],
    acceptedWeek: null,
    completedWeek: null,
  };
}

/** Trailing N-week operating cash flow from ledger (sales + contracts − costs). */
export function trailingOperatingCashFlow(
  state: GameState,
  weeks: number,
): number {
  const ledger = state.ledger;
  if (!ledger?.entries?.length) {
    // Fallback: recent revenue proxy when ledger thin
    return state.totalRevenue > 0 && state.cash > 50_000 ? 1 : 0;
  }
  const minWeek = state.week - weeks;
  let sum = 0;
  for (const e of ledger.entries) {
    if (e.week < minWeek) continue;
    if (
      e.category === "sales" ||
      e.category === "contract" ||
      e.category === "publisher" ||
      e.category === "payroll" ||
      e.category === "rent" ||
      e.category === "marketing" ||
      e.category === "research" ||
      e.category === "development"
    ) {
      sum += e.amount;
    }
  }
  return sum;
}

export function hasProfitableReleasedTitle(state: GameState): boolean {
  return (state.releasedGames ?? []).some((g) => {
    const rev = g.revenue ?? 0;
    const cost = g.developmentCost ?? 0;
    if (cost > 0) return rev > cost;
    return rev > 5_000;
  });
}

export function evaluateFirstOfficeProofs(state: GameState): ProofResult[] {
  const cy = campaignYearFromWeeks(state.week, WEEKS_PER_YEAR);
  const ocf = trailingOperatingCashFlow(state, 13);
  return [
    {
      id: "releases_5",
      label: "5 released games",
      met: state.gamesPublished >= 5,
      detail: `${state.gamesPublished} / 5`,
    },
    {
      id: "fans_1000",
      label: "1,000 fans",
      met: state.fans >= 1_000,
      detail: `${state.fans.toLocaleString()} / 1,000`,
    },
    {
      id: "profitable_title",
      label: "One profitable title",
      met: hasProfitableReleasedTitle(state),
      detail: hasProfitableReleasedTitle(state) ? "Met" : "Ship a game that pays for itself",
    },
    {
      id: "trailing_ocf_13w",
      label: "Positive 13-week operating cash flow",
      met: ocf > 0,
      detail: ocf > 0 ? `+${Math.round(ocf).toLocaleString()}` : "Need positive ops cash flow",
    },
    {
      id: "earliest_y3",
      label: "Campaign year 3+",
      met: cy >= 3,
      detail: `Year ${cy} (need 3+)`,
    },
  ];
}

export function runwayWeeksAfterMove(
  cash: number,
  moveCost: number,
  weeklyBurnAfter: number,
  trailingWeeklyIncome: number,
): number {
  const cashAfter = cash - moveCost;
  if (cashAfter < 0) return 0;
  const netBurn = weeklyBurnAfter - Math.max(0, trailingWeeklyIncome);
  // Profitable ops after move → treat runway as effectively unlimited for gate purposes
  if (netBurn <= 0) return 10_000;
  return cashAfter / netBurn;
}

export function canAffordMove(
  state: GameState,
  gate: TransitionGate,
  weeklyBurnAfter: number,
): { ok: boolean; runway: number; cashAfter: number } {
  const trailingIncome =
    state.week > 0 ? Math.max(0, trailingOperatingCashFlow(state, 13) / 13) : 0;
  const runway = runwayWeeksAfterMove(
    state.cash,
    gate.moveCost,
    weeklyBurnAfter,
    trailingIncome,
  );
  const cashAfter = state.cash - gate.moveCost;
  const liquidOk = state.cash >= gate.liquidCashGate;
  const costOk = state.cash >= gate.moveCost;
  const runwayOk = runway >= gate.minRunwayWeeks;
  return {
    ok: liquidOk && costOk && runwayOk && cashAfter >= 0,
    runway,
    cashAfter,
  };
}

function setOfferState(
  offer: OfficeOfferRecord,
  state: ProgressionOfferState,
  week: number,
): OfficeOfferRecord {
  const next = { ...offer, state };
  if (state === "discovered" && offer.discoveredWeek == null) next.discoveredWeek = week;
  if (state === "offered" && offer.offeredWeek == null) next.offeredWeek = week;
  if (state === "accepted") next.acceptedWeek = week;
  if (state === "completed") next.completedWeek = week;
  if (state === "deferred") {
    // remain available; keep offered economics
    next.state = "deferred";
  }
  return next;
}

/**
 * Advance offer machine for Garage → First Office only (CP1).
 * Later transitions stay hidden until their feature flags.
 */
export function tickOfficeOffers(
  state: GameState,
  prog: StudioProgressionState,
): StudioProgressionState {
  if (!isFeatureEnabled("officeFoundation")) return prog;
  if (prog.studioTier !== 1) return prog;
  if (prog.activeMove) return prog;

  const gate = transitionFor(1);
  if (!gate) return prog;

  let offer = prog.offers.first_office ?? emptyOffer("first_office", gate);
  // Freeze economics once offered
  if (offer.state === "hidden" || offer.state === "discovered" || offer.state === "eligible") {
    offer = {
      ...offer,
      moveCost: gate.moveCost,
      liquidCashGate: gate.liquidCashGate,
      weeklyOverheadAfter: officeDef(2).weeklyOverhead,
      hqSeatsAfter: officeDef(2).hqSeatsTotal,
      constructionWeeks: gate.constructionWeeks,
      minRunwayWeeks: gate.minRunwayWeeks,
    };
  }

  if (offer.state === "completed" || offer.state === "accepted") {
    return { ...prog, offers: { ...prog.offers, first_office: offer } };
  }

  const proofs = evaluateFirstOfficeProofs(state);
  const proofsMet = proofs.every((p) => p.met);
  const tenureOk = prog.tenureWeeks >= gate.minTenureWeeks;

  if (!proofsMet || !tenureOk) {
    if (offer.state === "hidden" && state.gamesPublished >= 2) {
      offer = setOfferState(offer, "discovered", state.week);
    }
    return { ...prog, offers: { ...prog.offers, first_office: offer } };
  }

  // Eligible
  if (offer.state === "hidden" || offer.state === "discovered") {
    offer = setOfferState(offer, "eligible", state.week);
  }

  // Auto-surface as offered when eligible. Deferred stays deferred (reminders separate).
  if (offer.state === "eligible") {
    const midDev =
      state.currentProject &&
      (state.currentProject.devPhase.includes("RUNNING") ||
        state.currentProject.devPhase.includes("CONFIG") ||
        state.currentProject.devPhase === "POLISHING");
    if (!midDev) {
      offer = setOfferState(offer, "offered", state.week);
    }
  }
  // deferred: keep deferred; store tick fires ≤2 reminders/year

  return { ...prog, offers: { ...prog.offers, first_office: offer } };
}

export function firstOfficeOfferView(state: GameState, prog: StudioProgressionState) {
  const gate = transitionFor(1)!;
  const offer = prog.offers.first_office ?? emptyOffer("first_office", gate);
  const proofs = evaluateFirstOfficeProofs(state);
  const burn = officeDef(2).weeklyOverhead + state.staff.reduce((s, m) => s + (m.salary || 0), 0);
  const afford = canAffordMove(state, gate, burn);
  return {
    offer,
    gate,
    proofs,
    proofsMet: proofs.every((p) => p.met),
    afford,
    dest: officeDef(2),
    from: officeDef(1),
  };
}

export function isFirstOfficeReady(state: GameState, prog: StudioProgressionState): boolean {
  const v = firstOfficeOfferView(state, prog);
  return (
    (v.offer.state === "offered" || v.offer.state === "deferred" || v.offer.state === "eligible") &&
    v.proofsMet &&
    v.afford.ok &&
    prog.studioTier === 1
  );
}
