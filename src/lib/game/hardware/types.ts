/**
 * Proprietary hardware development scaffold (Part 2 §§12–14).
 * Bottlenecked axes — never average component tech into one score.
 */

export type HardwarePurpose =
  | "family_console"
  | "enthusiast_console"
  | "portable"
  | "dev_computer"
  | "subscription_platform"
  | "spatial"
  | "cloud_terminal";

export type HardwareAxis =
  | "compute"
  | "graphics"
  | "memory"
  | "storage"
  | "networking"
  | "input"
  | "portability"
  | "reliability";

export type HardwarePhase =
  | "market_research"
  | "purpose"
  | "architecture"
  | "components"
  | "os_plan"
  | "prototype"
  | "devkit"
  | "engine_support"
  | "manufacturing"
  | "certification"
  | "marketing"
  | "launch"
  | "revision"
  | "successor"
  | "sunset";

export interface HardwareComponent {
  id: string;
  name: string;
  category: string;
  eraMinYear: number;
  axes: Partial<Record<HardwareAxis, number>>;
  unitCost: number;
  powerDraw: number;
  heat: number;
}

export interface HardwareProject {
  id: string;
  name: string;
  purpose: HardwarePurpose;
  phase: HardwarePhase;
  components: string[];
  /** Bottlenecked capabilities 0–1+. */
  axes: Record<HardwareAxis, number>;
  bomCost: number;
  msrp: number;
  prototypeComplete: boolean;
  manufacturingReady: boolean;
  supportUntilYear: number | null;
  weekStarted: number;
}

export const HARDWARE_COMPONENT_POOL: HardwareComponent[] = [
  {
    id: "cpu_8bit",
    name: "8-bit CPU",
    category: "cpu",
    eraMinYear: 1979,
    axes: { compute: 0.25, reliability: 0.8 },
    unitCost: 12,
    powerDraw: 0.3,
    heat: 0.2,
  },
  {
    id: "cpu_16bit",
    name: "16-bit CPU",
    category: "cpu",
    eraMinYear: 1985,
    axes: { compute: 0.45, reliability: 0.75 },
    unitCost: 28,
    powerDraw: 0.45,
    heat: 0.35,
  },
  {
    id: "cpu_32bit",
    name: "32-bit CPU",
    category: "cpu",
    eraMinYear: 1993,
    axes: { compute: 0.7, reliability: 0.7 },
    unitCost: 55,
    powerDraw: 0.7,
    heat: 0.55,
  },
  {
    id: "gpu_sprite",
    name: "Sprite GPU",
    category: "gpu",
    eraMinYear: 1980,
    axes: { graphics: 0.3 },
    unitCost: 18,
    powerDraw: 0.25,
    heat: 0.2,
  },
  {
    id: "gpu_poly",
    name: "Polygon GPU",
    category: "gpu",
    eraMinYear: 1994,
    axes: { graphics: 0.65 },
    unitCost: 70,
    powerDraw: 0.8,
    heat: 0.7,
  },
  {
    id: "mem_low",
    name: "Low system memory",
    category: "memory",
    eraMinYear: 1979,
    axes: { memory: 0.25 },
    unitCost: 8,
    powerDraw: 0.1,
    heat: 0.05,
  },
  {
    id: "mem_high",
    name: "Expanded memory",
    category: "memory",
    eraMinYear: 1990,
    axes: { memory: 0.7 },
    unitCost: 40,
    powerDraw: 0.2,
    heat: 0.1,
  },
  {
    id: "storage_cart",
    name: "Cartridge storage",
    category: "storage",
    eraMinYear: 1979,
    axes: { storage: 0.3, reliability: 0.85 },
    unitCost: 15,
    powerDraw: 0.05,
    heat: 0.02,
  },
  {
    id: "storage_disc",
    name: "Optical disc",
    category: "storage",
    eraMinYear: 1992,
    axes: { storage: 0.75, reliability: 0.65 },
    unitCost: 35,
    powerDraw: 0.35,
    heat: 0.25,
  },
  {
    id: "net_none",
    name: "Offline only",
    category: "network",
    eraMinYear: 1979,
    axes: { networking: 0.05 },
    unitCost: 0,
    powerDraw: 0,
    heat: 0,
  },
  {
    id: "net_modem",
    name: "Modem networking",
    category: "network",
    eraMinYear: 1994,
    axes: { networking: 0.45 },
    unitCost: 25,
    powerDraw: 0.2,
    heat: 0.1,
  },
  {
    id: "battery_pack",
    name: "Portable battery",
    category: "power",
    eraMinYear: 1989,
    axes: { portability: 0.8, reliability: 0.6 },
    unitCost: 22,
    powerDraw: 0,
    heat: 0.15,
  },
];

/** Bottleneck score = min of relevant axes (not average). */
export function computeHardwareAxes(componentIds: string[]): Record<HardwareAxis, number> {
  const axes: Record<HardwareAxis, number> = {
    compute: 0.1,
    graphics: 0.1,
    memory: 0.1,
    storage: 0.1,
    networking: 0.05,
    input: 0.5,
    portability: 0.2,
    reliability: 0.5,
  };
  for (const id of componentIds) {
    const c = HARDWARE_COMPONENT_POOL.find((x) => x.id === id);
    if (!c) continue;
    for (const [k, v] of Object.entries(c.axes)) {
      const key = k as HardwareAxis;
      axes[key] = Math.max(axes[key], v ?? 0);
    }
  }
  return axes;
}

export function hardwareBottleneck(
  axes: Record<HardwareAxis, number>,
  relevant: HardwareAxis[],
): { axis: HardwareAxis; value: number } {
  let worst: HardwareAxis = relevant[0] ?? "compute";
  let val = axes[worst] ?? 1;
  for (const a of relevant) {
    if ((axes[a] ?? 0) < val) {
      worst = a;
      val = axes[a] ?? 0;
    }
  }
  return { axis: worst, value: val };
}

export function createHardwareProject(opts: {
  name: string;
  purpose: HardwarePurpose;
  components: string[];
  week: number;
}): HardwareProject {
  const axes = computeHardwareAxes(opts.components);
  const bom = opts.components.reduce((s, id) => {
    const c = HARDWARE_COMPONENT_POOL.find((x) => x.id === id);
    return s + (c?.unitCost ?? 0);
  }, 0);
  return {
    id: `hw_${opts.week}_${Math.random().toString(36).slice(2, 7)}`,
    name: opts.name,
    purpose: opts.purpose,
    phase: "architecture",
    components: opts.components,
    axes,
    bomCost: bom,
    msrp: Math.round(bom * 2.4 + 40),
    prototypeComplete: false,
    manufacturingReady: false,
    supportUntilYear: null,
    weekStarted: opts.week,
  };
}
