/**
 * Netflix Edition — original IP licenses, streamer marketing, studio conventions.
 * Franchise names are Studio Empire fiction (not real Netflix IPs).
 */

export const NETFLIX_EDITION_VERSION = "3.8.0" as const;

export type FranchiseLicense = {
  id: string;
  name: string;
  /** Upfront rights cost */
  cost: number;
  /** Preferred topic id or free-text tag for match */
  topicFit: string;
  /** Preferred genre id */
  genreFit: string;
  blurb: string;
};

/** Fiction-only packages — distinct from real streaming IPs */
export const FRANCHISE_LICENSES: FranchiseLicense[] = [
  {
    id: "echo_chamber",
    name: "Echo Chamber",
    cost: 50_000,
    topicFit: "sci-fi",
    genreFit: "action",
    blurb: "80s small-town sci-fi thriller rights package",
  },
  {
    id: "nightshade_prep",
    name: "Nightshade Prep",
    cost: 35_000,
    topicFit: "city",
    genreFit: "adventure",
    blurb: "Gothic academy mystery rights package",
  },
  {
    id: "orbital_heist",
    name: "Orbital Heist",
    cost: 75_000,
    topicFit: "sci-fi",
    genreFit: "simulation",
    blurb: "Premium space-crime limited series package",
  },
  {
    id: "clear",
    name: "None (clear)",
    cost: 0,
    topicFit: "",
    genreFit: "",
    blurb: "No royalty obligations",
  },
];

export const IP_MATCH = {
  hypeMult: 1.4,
  reviewBoost: 1.5,
  mismatchHypeMult: 0.9,
  mismatchReview: -0.5,
  royaltyRate: 0.15, // 15% of net after platform cut
} as const;

export type StreamerTier = {
  id: string;
  name: string;
  cost: number;
  minHype: number;
  maxHype: number;
  /** Extra weekly hype decay while streamer hype is active */
  decayBoost: number;
};

export const STREAMER_TIERS: StreamerTier[] = [
  {
    id: "indie",
    name: "Indie Streamer Playthrough",
    cost: 8_000,
    minHype: 12,
    maxHype: 28,
    decayBoost: 0.08,
  },
  {
    id: "mega",
    name: "Mega Streamer Sponsorship",
    cost: 45_000,
    minHype: 40,
    maxHype: 90,
    decayBoost: 0.14,
  },
];

export type ConventionFocus = "showcase" | "hands_on" | "influencer_night" | "hardware";

export const CONVENTION_FOCI: Record<
  ConventionFocus,
  { label: string; fanMult: number; hypeMult: number; costMult: number }
> = {
  showcase: { label: "Main Stage Showcase", fanMult: 1.2, hypeMult: 1.1, costMult: 1.0 },
  hands_on: { label: "Hands-On Floor", fanMult: 1.0, hypeMult: 1.35, costMult: 1.15 },
  influencer_night: { label: "Creator Night", fanMult: 1.45, hypeMult: 1.5, costMult: 1.3 },
  hardware: { label: "Hardware Pavilion", fanMult: 0.9, hypeMult: 1.0, costMult: 1.4 },
};

export const CONVENTION = {
  baseCost: 85_000,
  minFans: 100_000,
  minOffice: 3,
  defaultTicket: 49,
  capacityBase: 2_500,
} as const;

export type ActiveIpState = {
  licenseId: string;
  name: string;
  topicFit: string;
  genreFit: string;
  royaltyRate: number;
};

export function emptyIp(): ActiveIpState {
  return {
    licenseId: "clear",
    name: "None",
    topicFit: "",
    genreFit: "",
    royaltyRate: 0,
  };
}

export function purchaseLicense(
  id: string,
  cash: number,
): { ok: true; state: ActiveIpState; cost: number } | { ok: false; error: string } {
  const lic = FRANCHISE_LICENSES.find((l) => l.id === id);
  if (!lic) return { ok: false, error: "Unknown license package." };
  if (lic.id === "clear") {
    return { ok: true, state: emptyIp(), cost: 0 };
  }
  if (cash < lic.cost) return { ok: false, error: `Need $${lic.cost.toLocaleString()} for rights.` };
  return {
    ok: true,
    cost: lic.cost,
    state: {
      licenseId: lic.id,
      name: lic.name,
      topicFit: lic.topicFit,
      genreFit: lic.genreFit,
      royaltyRate: IP_MATCH.royaltyRate,
    },
  };
}

/** Match score when shipping under an active license. */
export function ipShipModifiers(opts: {
  active: ActiveIpState | null | undefined;
  topicId: string;
  genreId: string;
}): {
  hypeMult: number;
  reviewBoost: number;
  licensed: boolean;
  matched: boolean;
  royaltyRate: number;
} {
  const a = opts.active;
  if (!a || a.licenseId === "clear" || !a.name || a.name === "None") {
    return {
      hypeMult: 1,
      reviewBoost: 0,
      licensed: false,
      matched: false,
      royaltyRate: 0,
    };
  }
  const topic = opts.topicId.toLowerCase();
  const genre = opts.genreId.toLowerCase();
  const topicOk =
    !a.topicFit ||
    topic === a.topicFit.toLowerCase() ||
    topic.includes(a.topicFit.toLowerCase());
  const genreOk =
    !a.genreFit ||
    genre === a.genreFit.toLowerCase() ||
    genre.includes(a.genreFit.toLowerCase());
  const matched = topicOk && genreOk;
  if (matched) {
    return {
      hypeMult: IP_MATCH.hypeMult,
      reviewBoost: IP_MATCH.reviewBoost,
      licensed: true,
      matched: true,
      royaltyRate: a.royaltyRate || IP_MATCH.royaltyRate,
    };
  }
  return {
    hypeMult: IP_MATCH.mismatchHypeMult,
    reviewBoost: IP_MATCH.mismatchReview,
    licensed: true,
    matched: false,
    royaltyRate: a.royaltyRate || IP_MATCH.royaltyRate,
  };
}

/** Streamer hype = roll + floor(sqrt(fans) * 0.15) */
export function streamerHypeGain(
  tier: StreamerTier,
  fans: number,
  rng: () => number,
): number {
  const base = Math.floor(rng() * (tier.maxHype - tier.minHype + 1)) + tier.minHype;
  const fanScale = Math.floor(Math.sqrt(Math.max(0, fans)) * 0.15);
  return base + fanScale;
}

export function canHostConvention(opts: { office: number; fans: number }): boolean {
  return opts.office >= CONVENTION.minOffice || opts.fans >= CONVENTION.minFans;
}

export function conventionOutcome(opts: {
  ticketPrice: number;
  focus: ConventionFocus;
  fans: number;
  hype: number;
  rng: () => number;
}): {
  cost: number;
  ticketRevenue: number;
  fansGained: number;
  hypeGained: number;
  attendance: number;
} {
  const focus = CONVENTION_FOCI[opts.focus];
  const cost = Math.round(CONVENTION.baseCost * focus.costMult);
  const priceFit = Math.max(0.35, Math.min(1.4, 1.1 - (opts.ticketPrice - 49) / 120));
  const demand =
    CONVENTION.capacityBase *
    (1 + Math.log10(Math.max(10, opts.fans)) / 5) *
    (1 + opts.hype / 200) *
    priceFit *
    (0.9 + opts.rng() * 0.2);
  const attendance = Math.max(200, Math.round(demand));
  const ticketRevenue = Math.round(attendance * opts.ticketPrice);
  const fansGained = Math.round(attendance * 0.12 * focus.fanMult);
  const hypeGained = Math.round(18 * focus.hypeMult + attendance / 400);
  return { cost, ticketRevenue, fansGained, hypeGained, attendance };
}

/** Apply IP royalty to a cash inflow (net after platform). Returns net kept. */
export function applyIpRoyalty(grossAfterPlatform: number, royaltyRate: number): number {
  if (royaltyRate <= 0) return grossAfterPlatform;
  return grossAfterPlatform * (1 - royaltyRate);
}

/** Faster hype decay when streamer boost is active (streamerHypeWeeksLeft > 0). */
export function streamerHypeDecay(hype: number, streamerWeeksLeft: number, baseDecay = 0.12): number {
  const extra = streamerWeeksLeft > 0 ? 0.1 : 0;
  return Math.max(0, Math.floor(hype * (1 - (baseDecay + extra))));
}
