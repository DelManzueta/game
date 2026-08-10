/**
 * Hardcore late-game sub-engines (Definitive v4.0):
 * 1. Console launch success/flop formula
 * 2. Dynamic reviewer quote pool
 * 3. MMO subscriber + server upkeep
 * 4. Development quality crisis table
 */

export const HARDCORE_VERSION = "4.0.0" as const;

// ── 1. Console design formula ───────────────────────────────────────────

/** Hardware tier base values for launch demand. */
export const HARDWARE_TIER_BASE: Record<string, number> = {
  retro: 120,
  optical: 280,
  silicon: 520,
  custom: 350,
  default: 250,
};

/**
 * Launch-week hardware units:
 * (fans / 4) × (tierBase / retailPrice)
 * Loss-leader (retail < mfg): ×2.5
 */
export function consoleLaunchWeekUnits(opts: {
  fans: number;
  retailPrice: number;
  unitMfgCost: number;
  tierBaseValue?: number;
  tierId?: string;
}): {
  units: number;
  lossLeader: boolean;
  unitLoss: number;
  cashDelta: number;
  marketShareHint: number;
} {
  const price = Math.max(1, opts.retailPrice);
  const tier =
    opts.tierBaseValue ??
    HARDWARE_TIER_BASE[opts.tierId ?? "default"] ??
    HARDWARE_TIER_BASE.default!;
  let units = Math.round((opts.fans / 4) * (tier / price));
  units = Math.max(50, units);
  const lossLeader = price < opts.unitMfgCost;
  if (lossLeader) units = Math.round(units * 2.5);
  const unitLoss = lossLeader ? opts.unitMfgCost - price : 0;
  const cashDelta = units * (price - opts.unitMfgCost);
  // crude share: scale units into 0.05–0.55
  const marketShareHint = Math.min(0.55, Math.max(0.05, units / 200_000));
  return { units, lossLeader, unitLoss, cashDelta, marketShareHint };
}

// ── 2. Reviewer quotes ──────────────────────────────────────────────────

export type QuoteTier = "excellent" | "mediocre" | "terrible";

export const REVIEWER_QUOTE_POOL = {
  All_Games_Beta: {
    excellent: "An absolute masterpiece. We will be playing this for months.",
    mediocre: "It has some neat ideas but feels uninspired and repetitive.",
    terrible: "A complete architectural trainwreck. Do not buy this game.",
  },
  Game_Hero: {
    excellent: "Incredible mechanics! This studio just redefined the genre.",
    mediocre: "A decent weekend experience. Safe, predictable, but functional.",
    terrible: "I'm more entertained by tracing the bugs than playing the game.",
  },
  Informer: {
    excellent: "A landmark release — tech and design finally in lockstep.",
    mediocre: "Good mechanics, but it lacks that final polish pass.",
    terrible: "Ships broken, ships boring, ships forgettable.",
  },
  Star_Games: {
    excellent: "Instant classic. Queue the awards chatter.",
    mediocre: "Solid weekend choice. Fun, but ultimately safe.",
    terrible: "Skip it. Even the trailer oversold this one.",
  },
} as const;

export type ReviewerId = keyof typeof REVIEWER_QUOTE_POOL;

export function quoteTier(score: number): QuoteTier {
  if (score >= 8.5) return "excellent";
  if (score >= 5.5) return "mediocre";
  return "terrible";
}

export function getReviewerQuotes(
  finalScore: number,
  outlets: ReviewerId[] = ["All_Games_Beta", "Game_Hero", "Informer", "Star_Games"],
): { outlet: string; quote: string; score: number }[] {
  const tier = quoteTier(finalScore);
  return outlets.map((id) => ({
    outlet: id.replace(/_/g, " "),
    quote: REVIEWER_QUOTE_POOL[id][tier],
    score: finalScore,
  }));
}

// ── 3. MMO lifecycle ────────────────────────────────────────────────────

export const MMO = {
  subPrice: 4.99,
  /** $150 per 1000 active subscribers / month */
  upkeepPerThousand: 150,
  /** months until population → 0 */
  lifeMonths: 48,
} as const;

export type MmoRuntime = {
  gameId: string;
  title: string;
  initialUnits: number;
  monthsOnMarket: number;
  active: boolean;
  lifetimeSubRevenue: number;
  lifetimeUpkeep: number;
};

export function mmoActiveSubscribers(initialUnits: number, monthsOnMarket: number): number {
  const factor = Math.max(0, 1 - monthsOnMarket / MMO.lifeMonths);
  return Math.max(0, Math.floor(initialUnits * factor));
}

export function mmoMonthlyEconomics(opts: {
  initialUnits: number;
  monthsOnMarket: number;
}): {
  subscribers: number;
  subRevenue: number;
  upkeep: number;
  net: number;
  deadServer: boolean;
} {
  const subscribers = mmoActiveSubscribers(opts.initialUnits, opts.monthsOnMarket);
  const subRevenue = subscribers * MMO.subPrice;
  const upkeep = (subscribers / 1000) * MMO.upkeepPerThousand;
  const net = subRevenue - upkeep;
  return {
    subscribers,
    subRevenue,
    upkeep,
    net,
    deadServer: subscribers > 0 && subRevenue < upkeep,
  };
}

export function processMmoMonth(
  mmos: MmoRuntime[],
): { mmos: MmoRuntime[]; cashDelta: number; notes: string[] } {
  let cash = 0;
  const notes: string[] = [];
  const next: MmoRuntime[] = [];
  for (const m of mmos) {
    if (!m.active) {
      next.push(m);
      continue;
    }
    const months = m.monthsOnMarket + 1;
    const eco = mmoMonthlyEconomics({
      initialUnits: m.initialUnits,
      monthsOnMarket: months,
    });
    cash += eco.net;
    const updated: MmoRuntime = {
      ...m,
      monthsOnMarket: months,
      lifetimeSubRevenue: m.lifetimeSubRevenue + eco.subRevenue,
      lifetimeUpkeep: m.lifetimeUpkeep + eco.upkeep,
      active: eco.subscribers > 0,
    };
    if (eco.deadServer) {
      notes.push(
        `MMO "${m.title}" servers underwater: +$${eco.subRevenue.toFixed(0)} subs vs −$${eco.upkeep.toFixed(0)} upkeep.`,
      );
    } else if (!updated.active) {
      notes.push(`MMO "${m.title}" population hit zero — auto-shutdown.`);
    }
    next.push(updated);
  }
  return { mmos: next, cashDelta: cash, notes };
}

// ── 4. Quality crisis table ─────────────────────────────────────────────

export type CrisisCode = "EVT_LEAK" | "EVT_CRASH" | "EVT_COPY" | "EVT_CLEAN";

export type QualityCrisis = {
  code: CrisisCode;
  title: string;
  hypeDelta: number;
  rpDelta: number;
  extraWeeks: number;
  cashDelta: number;
  /** If player refuses settlement on EVT_COPY */
  scorePenaltyIfSkip?: number;
  note: string;
};

/**
 * Roll 1–100. Deterministic when rng supplied.
 * 1–10 LEAK · 11–20 CRASH · 21–30 COPY · 31–100 CLEAN
 */
export function rollQualityCrisis(rng: () => number = Math.random): QualityCrisis {
  const roll = Math.floor(rng() * 100) + 1;
  if (roll <= 10) {
    return {
      code: "EVT_LEAK",
      title: "Graphics Assets Leaked",
      hypeDelta: 40,
      rpDelta: -15,
      extraWeeks: 0,
      cashDelta: 0,
      note: "Assets hit the net — +40 hype, −15 RP for security overhauls.",
    };
  }
  if (roll <= 20) {
    return {
      code: "EVT_CRASH",
      title: "Main Backup Server Crash",
      hypeDelta: 0,
      rpDelta: 0,
      extraWeeks: 2,
      cashDelta: 0,
      note: "Backup crash — +2 weeks compile slip (extra rent).",
    };
  }
  if (roll <= 30) {
    return {
      code: "EVT_COPY",
      title: "Patent Infringement Scare",
      hypeDelta: 0,
      rpDelta: 0,
      extraWeeks: 0,
      cashDelta: -45_000,
      scorePenaltyIfSkip: 1.5,
      note: "Legal scare — pay $45k settlement or take −1.5 final score.",
    };
  }
  return {
    code: "EVT_CLEAN",
    title: "Stable Compilation Unit",
    hypeDelta: 0,
    rpDelta: 0,
    extraWeeks: 0,
    cashDelta: 0,
    note: "Clean build — no crisis side effects.",
  };
}
