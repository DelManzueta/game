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
  hypeDecayPerDay: 0.018,  // ~12%/week continuous
  maximumAwarenessPoints: 1000,
  maximumHype: 150,
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
/** Blueprint Module 4 tiers + garage extras. Costs/hype match terminal tycoon. */
export const CAMPAIGN_CATALOG: CampaignSpec[] = [
  {
    campaignId: "dev_blog",
    name: "Raw Dev Blog Post",
    description: "Free-ish DIY buzz. Small hype stack before launch.",
    cost: 2000,
    durationDays: 14,
    immediateAwarenessPoints: 10,
    immediateHypePoints: 8, // ~5–12 band midpoint +
    dailyAwarenessPoints: 0.5,
    dailyHypePoints: 0.1,
    reachBonus: 0.03,
    allowedPhases: ["pre_release", "released"],
    requiredGate: "marketing",
  },
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
    name: "Gaming Magazine Ad",
    description: "Trade press page. Solid pre-launch heat.",
    cost: 15000,
    durationDays: 28,
    immediateAwarenessPoints: 30,
    immediateHypePoints: 32, // ~20–45
    dailyAwarenessPoints: 1.4,
    dailyHypePoints: 0.3,
    reachBonus: 0.12,
    allowedPhases: ["pre_release", "released"],
    requiredGate: "marketing",
  },
  {
    campaignId: "demo_push",
    name: "Demo Push",
    description: "Playable snippets. Strong hype spike.",
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
    campaignId: "g3_booth",
    name: "G3 Convention Booth",
    description: "Big-show floor presence. Massive launch-week multiplier.",
    cost: 65000,
    durationDays: 21,
    immediateAwarenessPoints: 70,
    immediateHypePoints: 95, // ~60–130 clamped to max 100
    dailyAwarenessPoints: 2.5,
    dailyHypePoints: 0.8,
    reachBonus: 0.35,
    allowedPhases: ["pre_release", "released"],
    requiredGate: "advanced_marketing",
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

/** Studio-level campaign (no released title yet) — blueprint Module 4. */
export function studioCampaignHype(campaignId: string, seed: number): {
  cost: number;
  hypeGain: number;
  name: string;
} | null {
  const spec = getCampaignSpec(campaignId);
  if (!spec) return null;
  // Deterministic band from min/max implied by immediateHype ± variance
  const base = spec.immediateHypePoints;
  const jitter = ((seed % 7) - 3); // -3..+3
  return {
    cost: spec.cost,
    hypeGain: Math.max(1, base + jitter),
    name: spec.name,
  };
}

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
