/**
 * Core engine module catalog — dependencies, conflicts, runtime demands.
 * Links into ENGINE_COMPONENTS research where applicable.
 */

import type { EngineModuleDef } from "./types";

export const ENGINE_MODULES: EngineModuleDef[] = [
  {
    id: "core_loop",
    name: "Core Runtime Loop",
    category: "core_runtime",
    baseWork: 80,
    cpuDemand: 0.15,
    gpuDemand: 0,
    memoryDemand: 0.1,
    networkDemand: 0,
    dependencies: [],
    conflicts: [],
    bestSizes: ["small", "medium", "large", "aaa"],
    starting: true,
    description: "Main loop, timing, memory, file access, error handling.",
  },
  {
    id: "sprite_2d",
    name: "2D Sprite Rendering",
    category: "rendering",
    componentId: "basic_2d_v1",
    baseWork: 60,
    cpuDemand: 0.1,
    gpuDemand: 0.2,
    memoryDemand: 0.15,
    networkDemand: 0,
    dependencies: ["core_loop"],
    conflicts: [],
    bestSizes: ["small", "medium"],
    starting: true,
    description: "Basic 2D sprite and tile rendering.",
  },
  {
    id: "gfx_2d_v2",
    name: "2D Graphics V2",
    category: "rendering",
    componentId: "2d_v2",
    baseWork: 90,
    cpuDemand: 0.12,
    gpuDemand: 0.28,
    memoryDemand: 0.18,
    networkDemand: 0,
    dependencies: ["sprite_2d"],
    conflicts: [],
    bestSizes: ["small", "medium", "large"],
    description: "Improved palettes, layers, and sprite throughput.",
  },
  {
    id: "gfx_3d_v1",
    name: "3D Graphics V1",
    category: "rendering",
    componentId: "3d_v1",
    minYear: 1993,
    baseWork: 180,
    cpuDemand: 0.25,
    gpuDemand: 0.55,
    memoryDemand: 0.4,
    networkDemand: 0,
    dependencies: ["core_loop", "gfx_2d_v2"],
    conflicts: ["hardcoded_pipeline"],
    bestSizes: ["medium", "large", "aaa"],
    description: "Polygon renderer and materials foundation.",
  },
  {
    id: "audio_mono",
    name: "Mono Audio",
    category: "audio",
    componentId: "mono_sound",
    baseWork: 50,
    cpuDemand: 0.05,
    gpuDemand: 0,
    memoryDemand: 0.08,
    networkDemand: 0,
    dependencies: ["core_loop"],
    conflicts: [],
    bestSizes: ["small", "medium", "large", "aaa"],
    description: "Basic sound and music playback.",
  },
  {
    id: "audio_stereo",
    name: "Stereo Audio",
    category: "audio",
    componentId: "stereo_sound",
    baseWork: 70,
    cpuDemand: 0.08,
    gpuDemand: 0,
    memoryDemand: 0.1,
    networkDemand: 0,
    dependencies: ["audio_mono"],
    conflicts: [],
    bestSizes: ["small", "medium", "large", "aaa"],
    description: "Stereo mixing and music channels.",
  },
  {
    id: "save_local",
    name: "Local Save System",
    category: "save_data",
    componentId: "save_game",
    baseWork: 75,
    cpuDemand: 0.05,
    gpuDemand: 0,
    memoryDemand: 0.1,
    networkDemand: 0,
    dependencies: ["core_loop"],
    conflicts: [],
    bestSizes: ["small", "medium", "large", "aaa"],
    description: "Local save slots and corruption recovery basics.",
  },
  {
    id: "net_local",
    name: "Local Multiplayer",
    category: "networking",
    componentId: "multiplayer",
    baseWork: 120,
    cpuDemand: 0.15,
    gpuDemand: 0,
    memoryDemand: 0.12,
    networkDemand: 0.2,
    dependencies: ["core_loop", "save_local"],
    conflicts: ["anti_cheat_auth"],
    bestSizes: ["medium", "large", "aaa"],
    description: "Split-screen / local networked play.",
  },
  {
    id: "net_online",
    name: "Online Play",
    category: "networking",
    componentId: "online_play",
    minYear: 1999,
    baseWork: 220,
    cpuDemand: 0.25,
    gpuDemand: 0,
    memoryDemand: 0.2,
    networkDemand: 0.65,
    dependencies: ["net_local"],
    conflicts: ["destructible_world"],
    bestSizes: ["large", "aaa"],
    description: "Client-server play, matchmaking foundation.",
  },
  {
    id: "ai_basic",
    name: "Behavior AI",
    category: "ai",
    componentId: "better_ai",
    baseWork: 100,
    cpuDemand: 0.2,
    gpuDemand: 0,
    memoryDemand: 0.12,
    networkDemand: 0,
    dependencies: ["core_loop"],
    conflicts: [],
    bestSizes: ["medium", "large", "aaa"],
    description: "State machines and simple pathfinding.",
  },
  {
    id: "ai_advanced",
    name: "Advanced AI",
    category: "ai",
    componentId: "advanced_ai",
    minYear: 2004,
    baseWork: 160,
    cpuDemand: 0.35,
    gpuDemand: 0,
    memoryDemand: 0.2,
    networkDemand: 0,
    dependencies: ["ai_basic"],
    conflicts: [],
    bestSizes: ["large", "aaa"],
    description: "Behavior trees, tactical reasoning, group coordination.",
  },
  {
    id: "world_stream",
    name: "World Streaming",
    category: "world",
    componentId: "open_world",
    minYear: 2001,
    baseWork: 240,
    cpuDemand: 0.3,
    gpuDemand: 0.25,
    memoryDemand: 0.55,
    networkDemand: 0.1,
    dependencies: ["core_loop", "save_local"],
    conflicts: ["physical_media_tight"],
    bestSizes: ["large", "aaa"],
    description: "Async loading, partitioning, LOD foundations.",
  },
  {
    id: "level_editor",
    name: "Level Editor",
    category: "tools",
    componentId: "level_editor",
    baseWork: 140,
    cpuDemand: 0.05,
    gpuDemand: 0.1,
    memoryDemand: 0.15,
    networkDemand: 0,
    dependencies: ["core_loop", "sprite_2d"],
    conflicts: [],
    bestSizes: ["medium", "large", "aaa"],
    description: "Content tools — iteration speed, not game quality itself.",
  },
  {
    id: "dialogue_tools",
    name: "Dialogue Tools",
    category: "tools",
    componentId: "dialogue_tree",
    baseWork: 110,
    cpuDemand: 0.04,
    gpuDemand: 0,
    memoryDemand: 0.08,
    networkDemand: 0,
    dependencies: ["core_loop"],
    conflicts: [],
    bestSizes: ["medium", "large", "aaa"],
    description: "Branch visualization, localization hooks, validation.",
  },
  {
    id: "mod_support",
    name: "Mod Support",
    category: "scripting",
    componentId: "mod_support",
    minYear: 2001,
    baseWork: 130,
    cpuDemand: 0.1,
    gpuDemand: 0,
    memoryDemand: 0.15,
    networkDemand: 0,
    dependencies: ["save_local", "level_editor"],
    conflicts: ["console_security_strict"],
    bestSizes: ["medium", "large", "aaa"],
    description: "Data-driven hooks for community content.",
  },
  {
    id: "physics_basic",
    name: "Collision & Movement",
    category: "physics",
    baseWork: 95,
    cpuDemand: 0.22,
    gpuDemand: 0,
    memoryDemand: 0.12,
    networkDemand: 0,
    dependencies: ["core_loop"],
    conflicts: [],
    bestSizes: ["small", "medium", "large", "aaa"],
    description: "Collision detection and character movement.",
  },
  {
    id: "ui_framework",
    name: "UI Framework",
    category: "ui",
    componentId: "better_ux",
    baseWork: 70,
    cpuDemand: 0.06,
    gpuDemand: 0.08,
    memoryDemand: 0.1,
    networkDemand: 0,
    dependencies: ["core_loop"],
    conflicts: [],
    bestSizes: ["small", "medium", "large", "aaa"],
    description: "Menus, HUD, remapping, localization shell.",
  },
  {
    id: "build_pipeline",
    name: "Build Pipeline",
    category: "build_deploy",
    baseWork: 100,
    cpuDemand: 0.02,
    gpuDemand: 0,
    memoryDemand: 0.05,
    networkDemand: 0,
    dependencies: ["core_loop"],
    conflicts: [],
    bestSizes: ["large", "aaa"],
    description: "Asset processing, multi-platform compile, patch gen.",
  },
  {
    id: "telemetry",
    name: "Crash & Telemetry",
    category: "quality_telemetry",
    baseWork: 85,
    cpuDemand: 0.05,
    gpuDemand: 0,
    memoryDemand: 0.06,
    networkDemand: 0.15,
    dependencies: ["core_loop"],
    conflicts: [],
    bestSizes: ["large", "aaa"],
    description: "Crash reporting, automated tests hooks, logging.",
  },
  // Soft conflict markers (virtual — not selectable, used in conflict graph)
  {
    id: "hardcoded_pipeline",
    name: "Hardcoded Pipeline (legacy)",
    category: "core_runtime",
    baseWork: 0,
    cpuDemand: 0,
    gpuDemand: 0,
    memoryDemand: 0,
    networkDemand: 0,
    dependencies: [],
    conflicts: [],
    bestSizes: ["small"],
    description: "Marker for hardcoded arch conflict with modular 3D.",
  },
  {
    id: "anti_cheat_auth",
    name: "Authoritative Anti-Cheat",
    category: "networking",
    baseWork: 0,
    cpuDemand: 0,
    gpuDemand: 0,
    memoryDemand: 0,
    networkDemand: 0,
    dependencies: [],
    conflicts: [],
    bestSizes: ["aaa"],
    description: "Conflicts with pure peer-to-peer local net designs.",
  },
  {
    id: "destructible_world",
    name: "Destructible Worlds",
    category: "world",
    baseWork: 0,
    cpuDemand: 0,
    gpuDemand: 0,
    memoryDemand: 0,
    networkDemand: 0,
    dependencies: [],
    conflicts: [],
    bestSizes: ["aaa"],
    description: "Hard for deterministic multiplayer.",
  },
  {
    id: "physical_media_tight",
    name: "Physical Media Limits",
    category: "build_deploy",
    baseWork: 0,
    cpuDemand: 0,
    gpuDemand: 0,
    memoryDemand: 0,
    networkDemand: 0,
    dependencies: [],
    conflicts: [],
    bestSizes: ["medium", "large"],
    description: "Streaming vs disc size tension.",
  },
  {
    id: "console_security_strict",
    name: "Strict Console Security",
    category: "build_deploy",
    baseWork: 0,
    cpuDemand: 0,
    gpuDemand: 0,
    memoryDemand: 0,
    networkDemand: 0,
    dependencies: [],
    conflicts: [],
    bestSizes: ["large", "aaa"],
    description: "UGC / mods vs certification security.",
  },
];

export const SELECTABLE_MODULES = ENGINE_MODULES.filter(
  (m) => m.baseWork > 0 && !m.id.startsWith("hardcoded") && m.id !== "anti_cheat_auth",
);

export function moduleById(id: string): EngineModuleDef | undefined {
  return ENGINE_MODULES.find((m) => m.id === id);
}

export function startingModuleIds(): string[] {
  return ENGINE_MODULES.filter((m) => m.starting).map((m) => m.id);
}

/** Expand transitive dependencies; return missing ids relative to selected. */
export function missingDependencies(selected: string[]): string[] {
  const set = new Set(selected);
  const missing = new Set<string>();
  const visit = (id: string) => {
    const m = moduleById(id);
    if (!m) return;
    for (const dep of m.dependencies) {
      if (!set.has(dep)) {
        missing.add(dep);
        visit(dep);
      }
    }
  };
  for (const id of selected) visit(id);
  return [...missing];
}

/** Soft conflicts present among selection. */
export function activeConflicts(selected: string[]): string[] {
  const set = new Set(selected);
  const out: string[] = [];
  for (const id of selected) {
    const m = moduleById(id);
    if (!m) continue;
    for (const c of m.conflicts) {
      if (set.has(c) || selected.some((s) => moduleById(s)?.conflicts.includes(id))) {
        const key = [id, c].sort().join("↔");
        if (!out.includes(key)) out.push(key);
      }
    }
  }
  return out;
}

/** Auto-include missing deps so a build can start cleanly. */
export function resolveWithDependencies(selected: string[]): string[] {
  const set = new Set(selected);
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of [...set]) {
      const m = moduleById(id);
      if (!m) continue;
      for (const dep of m.dependencies) {
        if (!set.has(dep)) {
          set.add(dep);
          changed = true;
        }
      }
    }
  }
  return [...set];
}
