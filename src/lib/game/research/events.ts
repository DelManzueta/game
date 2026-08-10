/**
 * Decision events — change decisions, not flavor text (Part 2 §9).
 */

import type { DecisionEventDef, PendingDecisionEvent } from "./types";
import { stableUnit } from "../determinism";

export const DECISION_EVENTS: DecisionEventDef[] = [
  {
    id: "launch_celebration",
    category: "studio",
    title: "Launch Celebration",
    body: "The team wants to celebrate a recent milestone. How do you mark it?",
    earliestYear: 1979,
    latestYear: 2050,
    cooldownWeeks: 96,
    minGames: 1,
    choices: [
      {
        id: "big",
        label: "Large celebration",
        summary: "High morale, high cost, short interruption",
        effects: { cash: -8000, morale: 18, hype: 4, weeksDelay: 1, note: "Party week — production dips." },
      },
      {
        id: "dinner",
        label: "Team dinner",
        summary: "Moderate morale, moderate cost",
        effects: { cash: -2500, morale: 10, hype: 1 },
      },
      {
        id: "skip",
        label: "Skip celebration",
        summary: "No cost; mixed morale",
        effects: { morale: -6, note: "Disciplined staff shrug; others feel snubbed." },
      },
      {
        id: "potluck",
        label: "Potluck lunch",
        summary: "Cheap morale bump",
        effects: { cash: -400, morale: 6, hype: 1 },
      },
      {
        id: "bonus_day",
        label: "Half-day bonus + pizza",
        summary: "Balanced spend",
        effects: { cash: -1200, morale: 12, hype: 2 },
      },
    ],
  },
  {
    id: "fan_visit",
    category: "community",
    title: "Fan Visit Request",
    body: "Dedicated fans want a studio tour. Great PR — or a security headache.",
    earliestYear: 1982,
    latestYear: 2050,
    cooldownWeeks: 144,
    minGames: 2,
    choices: [
      {
        id: "invite",
        label: "Invite fans in",
        summary: "Hype & loyalty; risk of leaks / lost time",
        effects: { hype: 8, fans: 120, weeksDelay: 1, reputation: 3, note: "Tour day. Keep prototypes covered." },
      },
      {
        id: "online",
        label: "Controlled online stream",
        summary: "Moderate hype, community work cost",
        effects: { cash: -1500, hype: 5, fans: 60 },
      },
      {
        id: "decline",
        label: "Decline politely",
        summary: "No interruption; possible disappointment",
        effects: { fans: -40, note: "Fans understand — mostly." },
      },
      {
        id: "signed_posters",
        label: "Mail signed posters instead",
        summary: "Cheap goodwill",
        effects: { cash: -300, fans: 50, hype: 3 },
      },
      {
        id: "ama",
        label: "Host a text AMA night",
        summary: "No travel, solid engagement",
        effects: { cash: -200, fans: 80, hype: 5 },
      },
    ],
  },
  {
    id: "equipment_failure",
    category: "hardware",
    title: "Equipment Failure",
    body: "Critical workstations failed. Cost and disruption scale with studio size.",
    earliestYear: 1979,
    latestYear: 2050,
    cooldownWeeks: 192,
    choices: [
      {
        id: "replace",
        label: "Full replacement",
        summary: "Expensive, fast recovery",
        effects: { cash: -12000, debt: -5, note: "New gear installed this week." },
      },
      {
        id: "repair",
        label: "Patch and repair",
        summary: "Cheaper, some delay and debt",
        effects: { cash: -4000, weeksDelay: 1, debt: 6 },
      },
      {
        id: "insurance",
        label: "File insurance claim",
        summary: "Lower cash hit; paperwork delay",
        effects: { cash: -1500, weeksDelay: 2, reputation: -1 },
      },
      {
        id: "borrow",
        label: "Borrow loaner machines",
        summary: "Low cash, small favor debt",
        effects: { cash: -500, debt: 3, weeksDelay: 1 },
      },
      {
        id: "night_shifts",
        label: "Share remaining PCs on shifts",
        summary: "No cash; morale hit",
        effects: { morale: -8, weeksDelay: 1 },
      },
    ],
  },
  {
    id: "industry_buzz",
    category: "industry",
    title: "Industry Trade Chatter",
    body: "Rivals are demoing a technique you have only heard about. Do you investigate?",
    earliestYear: 1985,
    latestYear: 2050,
    cooldownWeeks: 120,
    choices: [
      {
        id: "scout",
        label: "Send scouts / buy reports",
        summary: "Observe new tech sooner; cash cost",
        effects: { cash: -3000, note: "observe_tech_wave" },
      },
      {
        id: "ignore",
        label: "Stay the course",
        summary: "No cost; may lag discovery",
        effects: { note: "Focus on current roadmap." },
      },
      {
        id: "counter",
        label: "Public counter-demo",
        summary: "Hype if you have something; risk if you do not",
        effects: { cash: -5000, hype: 6, reputation: 2 },
      },
      {
        id: "notebook",
        label: "Write internal notes only",
        summary: "Quiet learning, no splash",
        effects: { note: "You file clippings for later." },
      },
      {
        id: "partner",
        label: "Partner with a uni lab",
        summary: "Cash for shared research access",
        effects: { cash: -2200, hype: 3, reputation: 2, note: "observe_tech_wave" },
      },
    ],
  },
  {
    id: "local_tv_spot",
    category: "community",
    title: "Local TV morning show",
    body: "A regional morning show wants a 3-minute segment on garage game makers.",
    earliestYear: 1980,
    latestYear: 2050,
    cooldownWeeks: 100,
    minGames: 1,
    choices: [
      { id: "go_live", label: "Go on air", summary: "High hype, some cash prep", effects: { cash: -1800, hype: 14, fans: 90 } },
      { id: "send_tape", label: "Send a polished tape", summary: "Moderate hype, lower cost", effects: { cash: -600, hype: 8, fans: 40 } },
      { id: "staff_only", label: "Send a friend to speak", summary: "Cheap, smaller impact", effects: { cash: -150, hype: 4, fans: 15 } },
      { id: "decline_tv", label: "Decline", summary: "Stay focused", effects: { note: "You keep the week clear." } },
      { id: "cohost", label: "Co-host a mini playtest", summary: "Hype + community", effects: { cash: -900, hype: 10, fans: 50, reputation: 2 } },
    ],
  },
  {
    id: "tooling_license",
    category: "studio",
    title: "Middleware license deal",
    body: "A tool vendor offers a temporary license package for indie studios.",
    earliestYear: 1983,
    latestYear: 2050,
    cooldownWeeks: 120,
    choices: [
      { id: "full_suite", label: "Buy the full suite", summary: "Expensive, strong insight", effects: { cash: -9000, note: "observe_tech_wave" } },
      { id: "trial", label: "90-day trial", summary: "Cheap trial access", effects: { cash: -1500, hype: 2 } },
      { id: "one_seat", label: "Single seat only", summary: "Minimal spend", effects: { cash: -700 } },
      { id: "pass_tools", label: "Build in-house instead", summary: "No cash", effects: { note: "You stick to your own tools." } },
      { id: "negotiate", label: "Negotiate better terms", summary: "Time for better price", effects: { cash: -500, reputation: 1, note: "observe_tech_wave" } },
    ],
  },
  {
    id: "charity_jam",
    category: "community",
    title: "Charity game jam invite",
    body: "A charity jam wants your logo — and maybe a tiny prototype.",
    earliestYear: 1979,
    latestYear: 2050,
    cooldownWeeks: 88,
    choices: [
      { id: "sponsor", label: "Sponsor + ship a micro demo", summary: "Cash + goodwill", effects: { cash: -2500, hype: 9, fans: 120, reputation: 4 } },
      { id: "logo_only", label: "Logo sponsorship only", summary: "Cheap goodwill", effects: { cash: -800, hype: 4, fans: 40, reputation: 2 } },
      { id: "mentor", label: "Mentor teams remotely", summary: "Reputation focus", effects: { reputation: 3, hype: 3, fans: 30 } },
      { id: "skip_jam", label: "Skip this year", summary: "No impact", effects: {} },
      { id: "donate_engines", label: "Donate old tools", summary: "Fans love it", effects: { cash: -300, fans: 80, hype: 5 } },
    ],
  },
  {
    id: "reviewer_embargo",
    category: "industry",
    title: "Reviewer embargo request",
    body: "A magazine wants early code under embargo. Great coverage — or a leak risk.",
    earliestYear: 1981,
    latestYear: 2050,
    cooldownWeeks: 110,
    minGames: 1,
    choices: [
      { id: "full_access", label: "Full build under embargo", summary: "High hype risk/reward", effects: { hype: 12, reputation: 2, note: "Fingers crossed they hold the date." } },
      { id: "trailer_only", label: "Trailer + screenshots only", summary: "Safer PR", effects: { cash: -400, hype: 7 } },
      { id: "paid_preview", label: "Paid sponsored preview", summary: "Cash for guaranteed ink", effects: { cash: -3500, hype: 15, fans: 60 } },
      { id: "refuse", label: "Refuse early access", summary: "Control the narrative", effects: { reputation: 1 } },
      { id: "multiple_outlets", label: "Seed three outlets", summary: "Broader but costly", effects: { cash: -2000, hype: 11, fans: 70 } },
    ],
  },
  {
    id: "warehouse_deal",
    category: "studio",
    title: "Surplus warehouse deal",
    body: "A closing shop offers bulk office furniture and spare CRTs.",
    earliestYear: 1979,
    latestYear: 2050,
    cooldownWeeks: 130,
    choices: [
      { id: "buy_lot", label: "Buy the whole lot", summary: "Big spend, studio comfort", effects: { cash: -4500, morale: 12, hype: 2 } },
      { id: "cherry_pick", label: "Cherry-pick monitors", summary: "Moderate spend", effects: { cash: -1200, morale: 5 } },
      { id: "one_desk", label: "One solid desk only", summary: "Minimal", effects: { cash: -350, morale: 2 } },
      { id: "pass_warehouse", label: "Pass", summary: "No change", effects: {} },
      { id: "resell", label: "Buy and flip extras", summary: "Cash gamble", effects: { cash: 800, morale: -2, note: "Some pieces were duds." } },
    ],
  },
];

export function maybeSpawnDecisionEvent(opts: {
  year: number;
  week: number;
  gamesPublished: number;
  office: number;
  cooldowns: Record<string, number>;
  campaignSeed: number | string;
  hasProject: boolean;
  eventSeverity: number;
}): PendingDecisionEvent | null {
  // ~1% base chance per idle week (severity further reduces). Never spam mid-project.
  const roll = stableUnit(opts.campaignSeed, opts.week, "decision_event_spawn");
  const chance = 0.012 * opts.eventSeverity;
  if (roll > chance) return null;
  if (opts.hasProject) return null;

  const eligible = DECISION_EVENTS.filter((e) => {
    if (opts.year < e.earliestYear || opts.year > e.latestYear) return false;
    if (e.minGames && opts.gamesPublished < e.minGames) return false;
    if (e.minOffice && opts.office < e.minOffice) return false;
    if (e.requiresProject && !opts.hasProject) return false;
    const last = opts.cooldowns[e.id] ?? -9999;
    if (opts.week - last < e.cooldownWeeks) return false;
    return true;
  });
  if (!eligible.length) return null;

  const pick = Math.floor(
    stableUnit(opts.campaignSeed, opts.week, "decision_event_pick") * eligible.length,
  );
  const def = eligible[Math.min(eligible.length - 1, pick)]!;

  // Scale cash costs with office
  const scale = 0.6 + opts.office * 0.35;
  const choices = def.choices.map((c) => ({
    ...c,
    effects: {
      ...c.effects,
      cash: c.effects.cash != null ? Math.round(c.effects.cash * scale * opts.eventSeverity) : undefined,
    },
  }));

  return {
    defId: def.id,
    title: def.title,
    body: def.body,
    choices,
    week: opts.week,
  };
}
