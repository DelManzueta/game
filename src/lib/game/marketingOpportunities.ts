/**
 * Garage marketing opportunity state machine (Foundation Lock).
 * Max 2 opportunities per campaign year; year after a double-year is dark.
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
  /** Year indices that received 2 opportunities (next year is dark). */
  doubleYears: number[];
  storedMarketingPoints: number;
};

export function emptyMarketingOpportunityState(): MarketingOpportunityState {
  return { opportunities: [], doubleYears: [], storedMarketingPoints: 0 };
}

export function campaignYearIndex(week: number, weeksPerYear = 48): number {
  return Math.floor(Math.max(0, week) / weeksPerYear);
}

function choicesFor(seed: number): MarketingChoice[] {
  const tiers = [
    { id: "low", label: "Flyer run", cost: 1_500, hypeGain: 6, marketingPoints: 2 },
    { id: "mid", label: "Magazine ad", cost: 8_000, hypeGain: 22, marketingPoints: 8 },
    { id: "high", label: "Demo push", cost: 15_000, hypeGain: 28, marketingPoints: 14 },
  ];
  // Stable order; seed only for future variance hooks
  void seed;
  return tiers;
}

/** Ensure yearly schedule exists (deterministic). */
export function ensureYearOpportunities(
  state: MarketingOpportunityState,
  week: number,
  campaignSeed: number,
): MarketingOpportunityState {
  const y = campaignYearIndex(week);
  if (state.doubleYears.includes(y - 1)) {
    // dark year — no new ops
    return state;
  }
  const existing = state.opportunities.filter((o) => o.yearIndex === y);
  if (existing.length >= 2) return state;
  if (existing.length === 1 && state.doubleYears.includes(y)) return state;

  // Schedule at week offsets 8 and 28 within the year when empty
  const yearStart = y * 48;
  const slots = [yearStart + 8, yearStart + 28];
  const next = { ...state, opportunities: [...state.opportunities] };
  for (const slot of slots) {
    if (next.opportunities.some((o) => o.yearIndex === y && o.weekOffered === slot)) continue;
    if (next.opportunities.filter((o) => o.yearIndex === y).length >= 2) break;
    const eventSeed = hashSeed(campaignSeed, "mkt-opp", y, slot);
    next.opportunities.push({
      id: `mkt-${y}-${slot}`,
      yearIndex: y,
      weekOffered: slot,
      choices: choicesFor(eventSeed),
      selectedChoiceId: null,
      status: week >= slot ? "offered" : "scheduled",
      eventSeed,
    });
  }
  // promote scheduled
  next.opportunities = next.opportunities.map((o) =>
    o.status === "scheduled" && week >= o.weekOffered ? { ...o, status: "offered" as const } : o,
  );
  return next;
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
  const resolvedThisYear = opportunities.filter(
    (o) => o.yearIndex === opp.yearIndex && o.status === "resolved",
  ).length;
  const doubleYears =
    resolvedThisYear >= 2 && !state.doubleYears.includes(opp.yearIndex)
      ? [...state.doubleYears, opp.yearIndex]
      : state.doubleYears;
  return {
    state: {
      opportunities,
      doubleYears,
      storedMarketingPoints: state.storedMarketingPoints + choice.marketingPoints,
    },
    choice,
  };
}
