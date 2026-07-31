/**
 * Marketing campaigns — ALGORITHM 2 (integrated).
 * Affects awareness, hype, reach only — never quality/reviews/bugs/speed.
 */
import { hashSeed } from "../scoring/rng";

export type MarketingBalance = {
  awarenessDecayPerDay: number;
  hypeDecayPerDay: number;
  maximumAwarenessPoints: number;
  maximumHype: number;
};

export const DEFAULT_MARKETING_BALANCE: MarketingBalance = {
  awarenessDecayPerDay: 0.002,
  /** Per-day hype decay; week tick ≈ 7 days. */
  hypeDecayPerDay: 0.08,
  maximumAwarenessPoints: 1000,
  maximumHype: 100,
};

export type CampaignSpec = {
  campaignId: string;
  name: string;
  description: string;
  cost: number;
  /** Duration in market days (7 = 1 week). */
  durationDays: number;
  immediateAwarenessPoints: number;
  immediateHypePoints: number;
  dailyAwarenessPoints: number;
  dailyHypePoints: number;
  reachBonus: number;
  allowedPhases: readonly ("pre_release" | "released")[];
  requiredGate: string;
};

/** Garage → early office campaign catalog. */
export const CAMPAIGN_CATALOG: CampaignSpec[] = [
  {
    campaignId: "flyer_run",
    name: "Garage Flyer Run",
    description: "Cheap local buzz. Small awareness bump.",
    cost: 1500,
    durationDays: 14,
    immediateAwarenessPoints: 12,
    immediateHypePoints: 6,
    dailyAwarenessPoints: 0.8,
    dailyHypePoints: 0.15,
    reachBonus: 0.04,
    allowedPhases: ["pre_release", "released"],
    requiredGate: "marketing",
  },
  {
    campaignId: "magazine_ad",
    name: "Magazine Ad",
    description: "Trade press page. Steady awareness while live.",
    cost: 8000,
    durationDays: 28,
    immediateAwarenessPoints: 28,
    immediateHypePoints: 12,
    dailyAwarenessPoints: 1.4,
    dailyHypePoints: 0.25,
    reachBonus: 0.1,
    allowedPhases: ["pre_release", "released"],
    requiredGate: "marketing",
  },
  {
    campaignId: "demo_push",
    name: "Demo Push",
    description: "Playable snippets and booth time. Strong hype spike.",
    cost: 15000,
    durationDays: 21,
    immediateAwarenessPoints: 22,
    immediateHypePoints: 28,
    dailyAwarenessPoints: 1.1,
    dailyHypePoints: 0.55,
    reachBonus: 0.12,
    allowedPhases: ["pre_release", "released"],
    requiredGate: "marketing",
  },
  {
    campaignId: "influencer_blitz",
    name: "Influencer Blitz",
    description: "Heavy spend for reach. Can flop if the game is weak.",
    cost: 45000,
    durationDays: 21,
    immediateAwarenessPoints: 55,
    immediateHypePoints: 35,
    dailyAwarenessPoints: 2.2,
    dailyHypePoints: 0.7,
    reachBonus: 0.28,
    allowedPhases: ["pre_release", "released"],
    requiredGate: "advanced_marketing",
  },
];

export function getCampaignSpec(id: string): CampaignSpec | undefined {
  return CAMPAIGN_CATALOG.find((c) => c.campaignId === id);
}

export type CampaignInstance = {
  instanceId: string;
  campaignId: string;
  startedOn: number;
  endsOn: number;
  spec: CampaignSpec;
};

export type MarketingEvent = {
  eventType: string;
  day: number;
  campaignInstanceId: string;
  cost?: number;
};

export type MarketingState = {
  gameId: string;
  asOfDay: number;
  awarenessPoints: number;
  hype: number;
  activeCampaigns: CampaignInstance[];
  history: MarketingEvent[];
};

export function emptyMarketingState(gameId: string, asOfDay = 0): MarketingState {
  return {
    gameId,
    asOfDay,
    awarenessPoints: 0,
    hype: 0,
    activeCampaigns: [],
    history: [],
  };
}

export function marketingReachMultiplier(state: MarketingState): number {
  return (
    1 +
    state.activeCampaigns.reduce(
      (s, c) => s + Math.max(0, c.spec.reachBonus),
      0,
    )
  );
}

export type MarketingStartResult = {
  state: MarketingState;
  cashDelta: number;
  event: MarketingEvent;
};

export function startMarketingCampaign(
  state: MarketingState,
  spec: CampaignSpec,
  opts: {
    currentDay: number;
    currentPhase: "pre_release" | "released";
    cashAvailable: number;
    unlocked: boolean;
    balance?: MarketingBalance;
  },
): MarketingStartResult {
  const balance = opts.balance ?? DEFAULT_MARKETING_BALANCE;
  if (!opts.unlocked) {
    throw new Error(`Marketing campaign is locked: ${spec.campaignId}`);
  }
  if (opts.currentDay !== state.asOfDay) {
    throw new Error("Advance marketing state to the current day first.");
  }
  if (!spec.allowedPhases.includes(opts.currentPhase)) {
    throw new Error(`Campaign is not valid during phase: ${opts.currentPhase}`);
  }
  if (spec.durationDays <= 0) {
    throw new Error("Campaign duration must be positive.");
  }
  if (opts.cashAvailable < spec.cost) {
    throw new Error("Insufficient cash for marketing campaign.");
  }

  const instanceId = hashSeed(
    state.gameId,
    spec.campaignId,
    opts.currentDay,
    state.history.length,
  )
    .toString(16)
    .padStart(8, "0")
    .slice(0, 16);

  const instance: CampaignInstance = {
    instanceId,
    campaignId: spec.campaignId,
    startedOn: opts.currentDay,
    endsOn: opts.currentDay + spec.durationDays,
    spec,
  };

  const event: MarketingEvent = {
    eventType: "campaign_started",
    day: opts.currentDay,
    campaignInstanceId: instanceId,
    cost: spec.cost,
  };

  const newState: MarketingState = {
    ...state,
    awarenessPoints: Math.min(
      balance.maximumAwarenessPoints,
      state.awarenessPoints + Math.max(0, spec.immediateAwarenessPoints),
    ),
    hype: Math.max(
      0,
      Math.min(
        balance.maximumHype,
        state.hype + Math.max(0, spec.immediateHypePoints),
      ),
    ),
    activeCampaigns: [...state.activeCampaigns, instance],
    history: [...state.history, event],
  };

  return { state: newState, cashDelta: -spec.cost, event };
}

export type MarketingTickResult = {
  state: MarketingState;
  reachMultiplier: number;
  expiredCampaignIds: string[];
};

/** Advance marketing day-by-day with decay and campaign effects. */
export function advanceMarketing(
  state: MarketingState,
  toDay: number,
  balance: MarketingBalance = DEFAULT_MARKETING_BALANCE,
): MarketingTickResult {
  if (toDay < state.asOfDay) {
    throw new Error("Cannot move marketing state backward.");
  }

  let awareness = state.awarenessPoints;
  let hype = state.hype;
  let active = [...state.activeCampaigns];
  const history = [...state.history];
  const expiredIds: string[] = [];

  for (let day = state.asOfDay + 1; day <= toDay; day++) {
    awareness *= Math.exp(-Math.max(0, balance.awarenessDecayPerDay));
    hype *= Math.exp(-Math.max(0, balance.hypeDecayPerDay));

    for (const campaign of active) {
      if (campaign.startedOn <= day && day < campaign.endsOn) {
        awareness += Math.max(0, campaign.spec.dailyAwarenessPoints);
        hype += Math.max(0, campaign.spec.dailyHypePoints);
      }
    }

    const stillActive: CampaignInstance[] = [];
    for (const campaign of active) {
      if (day >= campaign.endsOn) {
        expiredIds.push(campaign.instanceId);
        history.push({
          eventType: "campaign_expired",
          day,
          campaignInstanceId: campaign.instanceId,
        });
      } else {
        stillActive.push(campaign);
      }
    }
    active = stillActive;

    awareness = Math.min(
      balance.maximumAwarenessPoints,
      Math.max(0, awareness),
    );
    hype = Math.min(balance.maximumHype, Math.max(0, hype));
  }

  const newState: MarketingState = {
    ...state,
    asOfDay: toDay,
    awarenessPoints: awareness,
    hype,
    activeCampaigns: active,
    history,
  };

  return {
    state: newState,
    reachMultiplier: marketingReachMultiplier(newState),
    expiredCampaignIds: expiredIds,
  };
}

/** Convert one-time marketingSpend at release into organic starting points. */
export function marketingSpendToPoints(spend: number): number {
  if (spend <= 0) return 0;
  // Diminishing: $50k ≈ 40 pts, $5k ≈ 12
  return Math.min(80, 55 * (1 - Math.exp(-spend / 40000)));
}
