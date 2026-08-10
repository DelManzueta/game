/**
 * Garage marketing opportunity state machine (Foundation Lock).
 * Max 2 opportunities generated per campaign year; year after a double year is dark.
 * Dark year depends on generated count, not purchases.
 */
import { hashSeed } from "./scoring/rng";

export type MarketingChoice = {
  id: string;
  label: string;
  cost: number;
  hypeGain: number;
  marketingPoints: number;
};

export type MarketingOpportunity = {
  id: string;
  yearIndex: number;
  weekOffered: number;
  choices: MarketingChoice[];
  selectedChoiceId: string | null;
  status: "scheduled" | "offered" | "resolved" | "expired";
  eventSeed: number;
};

export type MarketingOpportunityState = {
  opportunities: MarketingOpportunity[];
  /** Year indices that *generated* 2 opportunities (next year dark). */
  doubleYears: number[];
  storedMarketingPoints: number;
};

export function emptyMarketingOpportunityState(): MarketingOpportunityState {
  return { opportunities: [], doubleYears: [], storedMarketingPoints: 0 };
}

export function campaignYearIndex(week: number, weeksPerYear = 48): number {
  return Math.floor(Math.max(0, week) / weeksPerYear);
}

function choicesFor(eventSeed: number): MarketingChoice[] {
  void eventSeed;
  return [
    { id: "low", label: "Flyer run", cost: 1_500, hypeGain: 6, marketingPoints: 2 },
    { id: "mid", label: "Magazine ad", cost: 8_000, hypeGain: 22, marketingPoints: 8 },
    { id: "high", label: "Demo push", cost: 15_000, hypeGain: 28, marketingPoints: 14 },
  ];
}

function promoteDue(
  opportunities: MarketingOpportunity[],
  week: number,
): MarketingOpportunity[] {
  return opportunities.map((o) => {
    if (o.status === "scheduled" && week >= o.weekOffered) {
      return { ...o, status: "offered" as const };
    }
    return o;
  });
}

/** Ensure yearly schedule exists (deterministic). Always promotes due offers first. */
export function ensureYearOpportunities(
  state: MarketingOpportunityState,
  week: number,
  campaignSeed: number,
): MarketingOpportunityState {
  // Always promote first — never early-return before promotion.
  let opportunities = promoteDue(state.opportunities, week);
  const y = campaignYearIndex(week);

  // Dark year: previous year generated two opportunities → this year zero
  if (y > 0 && state.doubleYears.includes(y - 1)) {
    return { ...state, opportunities };
  }

  const yearOps = opportunities.filter((o) => o.yearIndex === y);
  if (yearOps.length >= 2) {
    return { ...state, opportunities };
  }

  const yearStart = y * 48;
  const slots = [yearStart + 8, yearStart + 28];
  let doubleYears = [...state.doubleYears];

  for (const slot of slots) {
    if (opportunities.some((o) => o.yearIndex === y && o.weekOffered === slot)) continue;
    if (opportunities.filter((o) => o.yearIndex === y).length >= 2) break;
    const eventSeed = hashSeed(campaignSeed, "mkt-opp", y, slot);
    opportunities.push({
      id: `mkt-${y}-${slot}`,
      yearIndex: y,
      weekOffered: slot,
      choices: choicesFor(eventSeed),
      selectedChoiceId: null,
      status: week >= slot ? "offered" : "scheduled",
      eventSeed,
    });
  }

  // Mark double year once two are generated (not purchased)
  if (opportunities.filter((o) => o.yearIndex === y).length >= 2 && !doubleYears.includes(y)) {
    doubleYears = [...doubleYears, y];
  }

  opportunities = promoteDue(opportunities, week);
  return {
    opportunities,
    doubleYears,
    storedMarketingPoints: state.storedMarketingPoints,
  };
}

export function dueOpportunity(
  state: MarketingOpportunityState,
): MarketingOpportunity | null {
  return state.opportunities.find((o) => o.status === "offered") ?? null;
}

export function resolveMarketingOpportunity(
  state: MarketingOpportunityState,
  opportunityId: string,
  choiceId: string,
): { state: MarketingOpportunityState; choice: MarketingChoice } | { error: string } {
  const opp = state.opportunities.find((o) => o.id === opportunityId);
  if (!opp) return { error: "Unknown opportunity." };
  if (opp.status !== "offered") return { error: "Opportunity not available." };
  const choice = opp.choices.find((c) => c.id === choiceId);
  if (!choice) return { error: "Unknown choice." };
  const opportunities = state.opportunities.map((o) =>
    o.id === opportunityId
      ? { ...o, status: "resolved" as const, selectedChoiceId: choiceId }
      : o,
  );
  return {
    state: {
      opportunities,
      doubleYears: state.doubleYears,
      storedMarketingPoints: state.storedMarketingPoints + choice.marketingPoints,
    },
    choice,
  };
}
