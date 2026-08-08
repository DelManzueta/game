/**
 * Move / renovation transactions — bible §4.1.
 * Money reserved on accept; capacity changes only on completion.
 */
import type { GameState, Notification } from "../types";
import { applyLedger } from "../finance/ledger";
import { officeDef, legacyOfficeFromTier, transitionFor } from "./offices";
import { canAffordMove } from "./offers";
import type {
  MoveTransaction,
  OfficeOfferRecord,
  StudioProgressionState,
  StudioTierId,
} from "./types";
import { buildHqSeats } from "./seats";

export type MoveCommandResult =
  | { ok: true; state: GameState; progression: StudioProgressionState; message: string }
  | { ok: false; error: string };

function note(
  state: GameState,
  text: string,
  tone: Notification["tone"] = "info",
): Notification {
  return {
    id: `n-move-${state.week}-${state.notifications.length}`,
    week: state.week,
    text,
    tone,
    read: false,
  };
}

function withNote(
  state: GameState,
  text: string,
  tone: Notification["tone"] = "info",
): GameState {
  return {
    ...state,
    notifications: [note(state, text, tone), ...state.notifications].slice(0, 40),
  };
}

/** Accept first-office offer: reserve funds, start construction. */
export function acceptFirstOfficeMove(
  state: GameState,
  prog: StudioProgressionState,
): MoveCommandResult {
  if (prog.studioTier !== 1) return { ok: false, error: "Already left the garage." };
  if (prog.activeMove) return { ok: false, error: "A move is already in progress." };

  const offer = prog.offers.first_office;
  if (!offer) return { ok: false, error: "No office offer." };
  if (offer.state !== "offered" && offer.state !== "deferred" && offer.state !== "eligible") {
    return { ok: false, error: "Office offer is not available." };
  }
  if (state.cash < offer.liquidCashGate) {
    return { ok: false, error: `Need $${offer.liquidCashGate.toLocaleString()} liquid cash.` };
  }
  if (state.cash < offer.moveCost) {
    return { ok: false, error: `Need $${offer.moveCost.toLocaleString()} for the move.` };
  }

  // Runway gate (bible §4.2) — cash alone is not enough
  const gate = transitionFor(1);
  if (gate) {
    const burn =
      officeDef(2).weeklyOverhead + state.staff.reduce((s, m) => s + (m.salary || 0), 0);
    const afford = canAffordMove(state, gate, burn);
    if (!afford.ok) {
      if (state.cash < gate.liquidCashGate) {
        return {
          ok: false,
          error: `Need $${gate.liquidCashGate.toLocaleString()} liquid cash.`,
        };
      }
      return {
        ok: false,
        error: `Need ~${gate.minRunwayWeeks} weeks runway after move (have ~${Math.floor(afford.runway)}).`,
      };
    }
  }

  const cost = offer.moveCost;
  const completesWeek = state.week + Math.max(1, offer.constructionWeeks);
  const move: MoveTransaction = {
    offerId: "first_office",
    fromTier: 1,
    toTier: 2,
    status: "constructing",
    costPaid: cost,
    startedWeek: state.week,
    completesWeek,
  };

  let next: GameState = {
    ...state,
    cash: state.cash - cost,
    dirty: true,
  };
  next.ledger = applyLedger(next.ledger, {
    week: state.week,
    amount: -cost,
    category: "office",
    label: "First office move deposit",
    ref: `move-first_office-${state.week}`,
  });
  next = withNote(
    next,
    `Move reserved ($${cost.toLocaleString()}). Keys hand over in ${offer.constructionWeeks} week(s).`,
    "info",
  );

  const nextOffer: OfficeOfferRecord = {
    ...offer,
    state: "accepted",
    acceptedWeek: state.week,
  };
  const nextProg: StudioProgressionState = {
    ...prog,
    offers: { ...prog.offers, first_office: nextOffer },
    activeMove: move,
  };

  return {
    ok: true,
    state: next,
    progression: nextProg,
    message: "Move started.",
  };
}

/** Decline / decide later — offer remains, economics do not reroll. */
export function deferFirstOfficeOffer(
  state: GameState,
  prog: StudioProgressionState,
): MoveCommandResult {
  const offer = prog.offers.first_office;
  if (!offer) return { ok: false, error: "No office offer." };
  if (offer.state === "completed" || offer.state === "accepted") {
    return { ok: false, error: "Move already in progress or done." };
  }
  const nextOffer: OfficeOfferRecord = {
    ...offer,
    state: "deferred",
  };
  return {
    ok: true,
    state: withNote(state, "Office offer saved — reopen anytime from the studio.", "info"),
    progression: {
      ...prog,
      offers: { ...prog.offers, first_office: nextOffer },
    },
    message: "Deferred.",
  };
}

/** Weekly: complete construction when due. */
export function tickActiveMove(
  state: GameState,
  prog: StudioProgressionState,
): { state: GameState; progression: StudioProgressionState } {
  const move = prog.activeMove;
  if (!move || move.status !== "constructing") {
    return { state, progression: prog };
  }
  if (state.week < move.completesWeek) {
    return { state, progression: prog };
  }

  const toTier = move.toTier as StudioTierId;
  const def = officeDef(toTier);
  let next: GameState = {
    ...state,
    office: legacyOfficeFromTier(toTier),
    dirty: true,
  };
  next = withNote(
    next,
    `Welcome to ${def.name}. ${def.hqSeatsTotal} HQ seats total (founder included). Hiring unlocks with the next checkpoint.`,
    "good",
  );

  const offer = prog.offers[move.offerId];
  const nextProg: StudioProgressionState = {
    ...prog,
    studioTier: toTier,
    tenureWeeks: 0,
    hqSeats: buildHqSeats(toTier, "founder"),
    activeMove: null,
    offers: {
      ...prog.offers,
      [move.offerId]: offer
        ? { ...offer, state: "completed", completedWeek: state.week }
        : offer,
    },
  };

  return { state: next, progression: nextProg };
}

/** Increment tenure counters each week (no active construction). */
export function tickTenure(prog: StudioProgressionState): StudioProgressionState {
  if (prog.activeMove?.status === "constructing") return prog;
  return {
    ...prog,
    tenureWeeks: prog.tenureWeeks + 1,
    techParkTenureWeeks:
      prog.studioTier === 4 ? prog.techParkTenureWeeks + 1 : prog.techParkTenureWeeks,
  };
}
