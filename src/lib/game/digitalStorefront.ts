/**
 * End-game Digital Storefront Platform (NeonStore) + IP infringement + mod packs.
 * v4.8.0
 */

export const PLATFORM_VERSION = "4.8.0" as const;

export const NEON_STORE = {
  name: "NeonStore",
  launchCost: 2_500_000,
  minCash: 10_000_000,
  minOffice: 3,
  /** Own titles: 0% store cut (keep full developer share of price) */
  ownCut: 1.0,
  /** Third-party store baseline keep rate (85% of gross after... we model keep) */
  defaultKeep: 0.85,
  rivalRoyaltyRate: 0.3,
  unitPrice: 9.99,
  rivalUnitsMin: 500,
  rivalUnitsMax: 2500,
} as const;

export type DigitalStorefront = {
  active: boolean;
  name: string;
  launchedWeek: number;
  lifetimeRivalRoyalties: number;
  lastMonthRoyalties: number;
  rivalTitlesHosted: number;
};

export function emptyStorefront(): DigitalStorefront {
  return {
    active: false,
    name: NEON_STORE.name,
    launchedWeek: -1,
    lifetimeRivalRoyalties: 0,
    lastMonthRoyalties: 0,
    rivalTitlesHosted: 0,
  };
}

export function canLaunchStorefront(opts: {
  office: number;
  cash: number;
  alreadyActive?: boolean;
}): { ok: true } | { ok: false; error: string } {
  if (opts.alreadyActive) return { ok: false, error: "NeonStore already online." };
  if (opts.office < NEON_STORE.minOffice) {
    return { ok: false, error: "Need Level 3+ office for a digital storefront." };
  }
  if (opts.cash < NEON_STORE.minCash) {
    return {
      ok: false,
      error: `Need $${NEON_STORE.minCash.toLocaleString()} liquid before launching.`,
    };
  }
  if (opts.cash < NEON_STORE.launchCost) {
    return {
      ok: false,
      error: `Need $${NEON_STORE.launchCost.toLocaleString()} to deploy NeonStore.`,
    };
  }
  return { ok: true };
}

/** Monthly rival AI units on your store × price × 30%. */
export function monthlyPlatformRoyalties(
  fans: number,
  rng: () => number = Math.random,
): { units: number; revenue: number } {
  const base =
    Math.floor(rng() * (NEON_STORE.rivalUnitsMax - NEON_STORE.rivalUnitsMin + 1)) +
    NEON_STORE.rivalUnitsMin;
  const fanScale = Math.max(1, fans / 100_000);
  const units = Math.round(base * fanScale);
  const revenue = units * NEON_STORE.unitPrice * NEON_STORE.rivalRoyaltyRate;
  return { units, revenue };
}

/** Keep rate for player retail sales. */
export function playerStoreKeepRate(hasOwnStorefront: boolean): number {
  return hasOwnStorefront ? NEON_STORE.ownCut : NEON_STORE.defaultKeep;
}

// ── IP infringement (post-launch) ───────────────────────────────────────

export const BANNED_TRADEMARK_FRAGMENTS = [
  "stranger things",
  "wednesday",
  "netflix",
  "mario",
  "zelda",
  "pokemon",
  "pokemon",
  "call of duty",
  "fortnite",
  "minecraft",
  "gta",
  "grand theft",
  "halo",
  "sonic",
] as const;

export type LitigationOutcome = {
  code: "Cease_And_Desist" | "Out_Of_Court_Settlement" | "Clean";
  penaltyCash: number;
  salesHalted: boolean;
  msg: string;
};

export function titleLooksInfringing(title: string, hasLicensedIp: boolean): boolean {
  if (hasLicensedIp) return false;
  const t = title.toLowerCase();
  return BANNED_TRADEMARK_FRAGMENTS.some((f) => t.includes(f));
}

/** Roll litigation 2 weeks post-launch when infringing. */
export function rollInfringementLitigation(
  rng: () => number = Math.random,
): LitigationOutcome {
  // 50/50 C&D vs settlement (per matrix simplified)
  if (rng() < 0.5) {
    return {
      code: "Cease_And_Desist",
      penaltyCash: 0,
      salesHalted: true,
      msg: "Cease & Desist — forced market pull!",
    };
  }
  return {
    code: "Out_Of_Court_Settlement",
    penaltyCash: 150_000,
    salesHalted: false,
    msg: "Out-of-court settlement — $150,000 fee paid.",
  };
}

// ── Modding API / content packs ─────────────────────────────────────────

export type ContentPack = {
  id: string;
  name: string;
  version: string;
  /** Additive topics */
  topics?: string[];
  genres?: string[];
  /** RP / cash granted once on install */
  grantRp?: number;
  grantCash?: number;
  /** Review soft boost while installed */
  reviewBoost?: number;
  validated: boolean;
  installedWeek?: number;
};

export const BUILTIN_PACKS: ContentPack[] = [
  {
    id: "pack_arcade_revival",
    name: "Arcade Revival Pack",
    version: "1.0.0",
    topics: ["arcade", "retro"],
    grantRp: 15,
    reviewBoost: 0.1,
    validated: true,
  },
  {
    id: "pack_space_ops",
    name: "Orbital Ops Expansion",
    version: "1.0.0",
    topics: ["space", "military"],
    genres: ["simulation"],
    grantCash: 25_000,
    validated: true,
  },
  {
    id: "pack_community_chaos",
    name: "Community Chaos (unsigned)",
    version: "0.9.0-beta",
    topics: ["chaos"],
    grantRp: 40,
    reviewBoost: -0.3,
    validated: false,
  },
];

export function validatePack(pack: ContentPack): { ok: true } | { ok: false; error: string } {
  if (!pack.id || !pack.name || !pack.version) {
    return { ok: false, error: "Pack missing id/name/version." };
  }
  if (!pack.validated) {
    return { ok: false, error: "Pack failed validation — unsigned or corrupt." };
  }
  return { ok: true };
}

export function installPack(
  pack: ContentPack,
  already: string[],
): { ok: true; grantRp: number; grantCash: number } | { ok: false; error: string } {
  if (already.includes(pack.id)) return { ok: false, error: "Pack already installed." };
  const v = validatePack(pack);
  if (!v.ok) return v;
  return {
    ok: true,
    grantRp: pack.grantRp ?? 0,
    grantCash: pack.grantCash ?? 0,
  };
}
