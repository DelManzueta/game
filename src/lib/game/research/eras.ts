import type { TechEraId } from "./types";

export interface TechEraDef {
  id: TechEraId;
  name: string;
  yearStart: number;
  yearEnd: number;
  focus: string;
}

export const TECH_ERAS: TechEraDef[] = [
  {
    id: "era1_foundational",
    name: "Foundational Software",
    yearStart: 1980,
    yearEnd: 1985,
    focus: "Efficient code, memory, short cycles",
  },
  {
    id: "era2_advanced_2d",
    name: "Advanced 2D & Home Consoles",
    yearStart: 1986,
    yearEnd: 1991,
    focus: "Sprites, cartridge limits, licensing",
  },
  {
    id: "era3_multimedia_3d",
    name: "Multimedia & Early 3D",
    yearStart: 1992,
    yearEnd: 1997,
    focus: "CD content, 3D, localization, loading",
  },
  {
    id: "era4_accelerated",
    name: "Accelerated 3D & Online Foundations",
    yearStart: 1998,
    yearEnd: 2003,
    focus: "GPU, networking, patches, certification",
  },
  {
    id: "era5_hd_digital",
    name: "HD Development & Digital Distribution",
    yearStart: 2004,
    yearEnd: 2009,
    focus: "Shaders, multicore, DLC, servers",
  },
  {
    id: "era6_live_ops",
    name: "Large Worlds & Live Operations",
    yearStart: 2010,
    yearEnd: 2015,
    focus: "Streaming, telemetry, mobile, retention",
  },
  {
    id: "era7_cross_platform",
    name: "Cross-Platform Ecosystems",
    yearStart: 2016,
    yearEnd: 2021,
    focus: "Cross-play, accessibility, anti-cheat",
  },
  {
    id: "era8_hybrid",
    name: "Hybrid Compute & Advanced Simulation",
    yearStart: 2022,
    yearEnd: 2030,
    focus: "Ray tracing, cloud, creator ecosystems",
  },
  {
    id: "era9_spatial",
    name: "Spatial & Holographic Computing",
    yearStart: 2031,
    yearEnd: 2040,
    focus: "Comfort, sensors, privacy, spatial perf",
  },
  {
    id: "era10_persistent",
    name: "Persistent Simulated Ecosystems",
    yearStart: 2041,
    yearEnd: 2050,
    focus: "Identity, ethics, decades-long services",
  },
];

export function eraForYear(year: number): TechEraDef {
  for (const e of TECH_ERAS) {
    if (year >= e.yearStart && year <= e.yearEnd) return e;
  }
  if (year < TECH_ERAS[0]!.yearStart) return TECH_ERAS[0]!;
  return TECH_ERAS[TECH_ERAS.length - 1]!;
}

/** Early research is possible but costlier/riskier before normalYear. */
export function earlyResearchPenalty(year: number, normalYear: number, earliestYear: number): {
  costMult: number;
  riskMult: number;
  weeksMult: number;
} {
  if (year >= normalYear) return { costMult: 1, riskMult: 1, weeksMult: 1 };
  if (year < earliestYear) return { costMult: 99, riskMult: 99, weeksMult: 99 };
  const t = (normalYear - year) / Math.max(1, normalYear - earliestYear);
  return {
    costMult: 1 + t * 1.4,
    riskMult: 1 + t * 1.2,
    weeksMult: 1 + t * 0.8,
  };
}
