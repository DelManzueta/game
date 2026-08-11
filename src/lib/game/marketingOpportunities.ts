/**
 * Garage marketing opportunity state machine (Foundation Lock).
 * Max 2 opportunities generated per campaign year; year after a double year is dark.
 * Dark year depends on generated count, not purchases.
 * Choice sets and week slots are seeded-random so campaigns feel different.
 */
import { hashSeed, SeededRng } from "./scoring/rng";

export type MarketingChoice = {
  id: string;
  label: string;
  cost: number;
  hypeGain: number;
  marketingPoints: number;
  /** Short player-facing effect line */
  blurb?: string;
};

export type MarketingOpportunity = {
  id: string;
  yearIndex: number;
  weekOffered: number;
  choices: MarketingChoice[];
  selectedChoiceId: string | null;
  status: "scheduled" | "offered" | "resolved" | "expired" | "deferred";
  /** True when offer is due but UI was blocked; survives save/load. */
  duePending?: boolean;
  eventSeed: number;
  headline?: string;
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

/** Full catalog — each opportunity draws a seeded subset so options feel fresh. */
const MARKETING_CATALOG: MarketingChoice[] = [
  { id: "zine", label: "Local zine ad", cost: 800, hypeGain: 4, marketingPoints: 1, blurb: "Cheap ink, small reach" },
  { id: "flyer", label: "Flyer run", cost: 1_500, hypeGain: 6, marketingPoints: 2, blurb: "Garage staples" },
  { id: "bbs", label: "BBS shout-out", cost: 600, hypeGain: 5, marketingPoints: 2, blurb: "Modem-era word of mouth" },
  { id: "demo_disk", label: "Demo disk mailer", cost: 2_800, hypeGain: 10, marketingPoints: 4, blurb: "Hands-on samples" },
  { id: "radio", label: "Late-night radio spot", cost: 4_500, hypeGain: 12, marketingPoints: 5, blurb: "Regional airtime" },
  { id: "college", label: "Campus club visit", cost: 1_200, hypeGain: 7, marketingPoints: 3, blurb: "Student buzz" },
  { id: "store_demo", label: "Electronics store demo", cost: 3_500, hypeGain: 11, marketingPoints: 4, blurb: "Weekend kiosk" },
  { id: "mag_half", label: "Half-page magazine ad", cost: 8_000, hypeGain: 18, marketingPoints: 7, blurb: "Print prestige" },
  { id: "mag_full", label: "Full-page magazine ad", cost: 14_000, hypeGain: 26, marketingPoints: 11, blurb: "Big ink spend" },
  { id: "preview_kit", label: "Press preview kit", cost: 5_500, hypeGain: 16, marketingPoints: 6, blurb: "Reviewer samples" },
  { id: "cover_bid", label: "Cover story bid", cost: 22_000, hypeGain: 34, marketingPoints: 16, blurb: "High risk, high hype" },
  { id: "convention", label: "Small convention booth", cost: 12_000, hypeGain: 24, marketingPoints: 12, blurb: "Floor traffic" },
  { id: "poster", label: "City poster campaign", cost: 6_000, hypeGain: 14, marketingPoints: 5, blurb: "Street-level presence" },
  { id: "arcade", label: "Arcade free-play night", cost: 3_200, hypeGain: 13, marketingPoints: 5, blurb: "Hands-on fun" },
  { id: "influencer", label: "Tape-trading influencer", cost: 2_000, hypeGain: 9, marketingPoints: 3, blurb: "Niche community push" },
  { id: "tv_late", label: "Late cable TV spot", cost: 18_000, hypeGain: 30, marketingPoints: 14, blurb: "Mass awareness" },
  { id: "charity", label: "Charity jam donation", cost: 2_500, hypeGain: 8, marketingPoints: 4, blurb: "Goodwill + mention" },
  { id: "contest", label: "Fan design contest", cost: 1_800, hypeGain: 10, marketingPoints: 4, blurb: "Engagement over spend" },
  { id: "bundle", label: "Retailer bundle deal", cost: 9_500, hypeGain: 20, marketingPoints: 9, blurb: "Shelf placement help" },
  { id: "guerrilla", label: "Guerrilla sticker raid", cost: 400, hypeGain: 5, marketingPoints: 1, blurb: "Cheap & cheeky" },
  { id: "newsletter", label: "Studio newsletter", cost: 900, hypeGain: 6, marketingPoints: 3, blurb: "Long-tail fans" },
  { id: "beta_invite", label: "Closed beta invites", cost: 1_100, hypeGain: 8, marketingPoints: 3, blurb: "Word of mouth" },
  { id: "merch_tease", label: "Teaser merch drop", cost: 4_000, hypeGain: 12, marketingPoints: 5, blurb: "Token shirts & pins" },
  { id: "billboard", label: "Highway billboard", cost: 16_000, hypeGain: 28, marketingPoints: 13, blurb: "Can't miss it" },
];

const HEADLINES = [
  "A local channel has spare airtime this month.",
  "A regional magazine opened last-minute ad slots.",
  "Fans are asking how they can support the studio.",
  "A retailer wants co-op promo materials.",
  "Trade show leftovers left cheap booth options.",
  "A zine editor offered a feature package.",
  "Campus clubs want a guest talk / demo night.",
  "A radio host is hunting indie game segments.",
];

/** Build 4–5 distinct options from seed (always includes a free/low path). */
export function choicesFor(eventSeed: number): MarketingChoice[] {
  const rng = new SeededRng(eventSeed >>> 0);
  const pool = [...MARKETING_CATALOG];
  // Fisher–Yates with seeded rng
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const tmp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = tmp;
  }
  const count = 4 + rng.int(0, 1); // 4 or 5 paid/varied options
  const picked = pool.slice(0, count);
  // Ensure spread of costs: sort by cost then re-shuffle lightly for display
  picked.sort((a, b) => a.cost - b.cost);
  // Always append free organic option last
  const free: MarketingChoice = {
    id: "organic",
    label: "Stay organic",
    cost: 0,
    hypeGain: 2 + rng.int(0, 2),
    marketingPoints: 0,
    blurb: "No spend — tiny word of mouth",
  };
  return [...picked, free];
}

function headlineFor(eventSeed: number): string {
  const rng = new SeededRng((eventSeed ^ 0x9e3779b9) >>> 0);
  return HEADLINES[rng.int(0, HEADLINES.length - 1)]!;
}

/**
 * Seeded irregular week slots inside a year (not fixed week 8/28).
 * Returns 0, 1, or 2 distinct weeks in [yearStart+4, yearStart+44].
 */
export function yearOpportunitySlots(
  campaignSeed: number,
  yearIndex: number,
): number[] {
  const yearStart = yearIndex * 48;
  const rng = new SeededRng(hashSeed(campaignSeed, "mkt-slots", yearIndex));
  // Normal non-dark years: exactly 1 or 2 (never zero). Dark years handled by ensureYearOpportunities.
  const roll = rng.next();
  const n = roll > 0.55 ? 2 : 1;

  const slots: number[] = [];
  let guard = 0;
  while (slots.length < n && guard++ < 40) {
    // Prefer mid-year windows but jitter hard
    const w = yearStart + 4 + rng.int(0, 40);
    if (!slots.some((s) => Math.abs(s - w) < 8)) slots.push(w);
  }
  return slots.sort((a, b) => a - b);
}

function promoteDue(
  opportunities: MarketingOpportunity[],
  week: number,
): MarketingOpportunity[] {
  return opportunities.map((o) => {
    if (o.status === "scheduled" && week >= o.weekOffered) {
      return { ...o, status: "offered" as const, duePending: true };
    }
    if (o.status === "deferred" && week >= o.weekOffered) {
      return { ...o, status: "offered" as const, duePending: true };
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

  // Only schedule once we have visited this year (lazy) — use seeded slots
  const slots = yearOpportunitySlots(campaignSeed, y);
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
      headline: headlineFor(eventSeed),
    });
  }

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

/** Player chose "Not now" or UI was blocked — keep recoverable. */
export function deferMarketingOpportunity(
  state: MarketingOpportunityState,
  opportunityId: string,
): MarketingOpportunityState {
  return {
    ...state,
    opportunities: state.opportunities.map((o) =>
      o.id === opportunityId && (o.status === "offered" || o.status === "deferred")
        ? { ...o, status: "deferred" as const, duePending: true }
        : o,
    ),
  };
}

/** Clear duePending after the offer has been shown as a modal. */
export function markMarketingOpportunitySurfaced(
  state: MarketingOpportunityState,
  opportunityId: string,
): MarketingOpportunityState {
  return {
    ...state,
    opportunities: state.opportunities.map((o) =>
      o.id === opportunityId ? { ...o, duePending: false } : o,
    ),
  };
}
