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
    cooldownWeeks: 48,
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
    ],
  },
  {
    id: "fan_visit",
    category: "community",
    title: "Fan Visit Request",
    body: "Dedicated fans want a studio tour. Great PR — or a security headache.",
    earliestYear: 1982,
    latestYear: 2050,
    cooldownWeeks: 72,
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
    ],
  },
  {
    id: "equipment_failure",
    category: "hardware",
    title: "Equipment Failure",
    body: "Critical workstations failed. Cost and disruption scale with studio size.",
    earliestYear: 1979,
    latestYear: 2050,
    cooldownWeeks: 96,
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
    ],
  },
  {
    id: "industry_buzz",
    category: "industry",
    title: "Industry Trade Chatter",
    body: "Rivals are demoing a technique you have only heard about. Do you investigate?",
    earliestYear: 1985,
    latestYear: 2050,
    cooldownWeeks: 60,
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
  // ~4% base chance per week, scaled by severity (creative lower, executive higher)
  const roll = stableUnit(opts.campaignSeed, opts.week, "decision_event_spawn");
  const chance = 0.035 * opts.eventSeverity;
  if (roll > chance) return null;

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
