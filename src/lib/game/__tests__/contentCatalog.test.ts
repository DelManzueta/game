import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TOPICS, GENRES, PLATFORMS, RESEARCH, CUSTOM_CONSOLE, ENGINE_COMPONENTS, STARTING_ENGINE_COMPONENT_ID } from "../data";
import {
  ENGINE_COMPONENT_COUNT,
  researchableEngineComponents,
  startingEngineFeatures,
} from "../content/engines";
import { PLATFORM_COUNT } from "../content/platforms";
import { TOPIC_COUNT } from "../content/topics";
import {
  computeGenreFit,
  genreFitModifier,
  topicGenreCompatibility,
  COMPATIBILITY_VALUES,
} from "../content/genreFit";
import { GENRE_CAPACITY_WEIGHTS } from "../contracts";
import type { GenreId } from "../types";

const SIX: GenreId[] = ["action", "adventure", "rpg", "simulation", "strategy", "casual"];
const VALS = new Set([100, 85, 70, 55, 35, 15]);

describe("content catalog validation", () => {
  it("has exactly 132 unique topics", () => {
    const ids = TOPICS.map((t) => t.id);
    const names = TOPICS.map((t) => t.name);
    assert.equal(TOPICS.length, 132);
    assert.equal(TOPIC_COUNT, 132);
    assert.equal(new Set(ids).size, 132);
    assert.equal(new Set(names).size, 132);
  });

  it("normalizes Motocross, Wizards, Post-Apocalyptic; no duplicate Assassin/Construction/Crime", () => {
    const names = TOPICS.map((t) => t.name);
    assert.ok(names.includes("Motocross"));
    assert.ok(!names.includes("Motorcross"));
    assert.ok(names.includes("Wizards"));
    assert.ok(!names.includes("Wizzards"));
    assert.ok(names.includes("Post-Apocalyptic"));
    assert.equal(names.filter((n) => n === "Assassin").length, 1);
    assert.equal(names.filter((n) => n === "Construction").length, 1);
    assert.equal(names.filter((n) => n === "Crime").length, 1);
  });

  it("exactly six top-level genres", () => {
    assert.equal(GENRES.length, 6);
    assert.deepEqual(GENRES.map((g) => g.id).sort(), [...SIX].sort());
  });

  it("every topic has home genre + six unique compatibility tiers", () => {
    for (const t of TOPICS) {
      assert.ok(SIX.includes(t.homeGenre), t.id);
      const vals = SIX.map((g) => t.compatibility[g]);
      assert.equal(vals.length, 6);
      assert.equal(new Set(vals).size, 6, `${t.id} duplicate ranks ${vals}`);
      for (const v of vals) assert.ok(VALS.has(v), `${t.id} bad val ${v}`);
      // home genre is rank 1 (100)
      assert.equal(t.compatibility[t.homeGenre], 100, t.id);
    }
  });

  it("50 fixed platforms include PC, Itara, and Commodore; Custom Console separate", () => {
    assert.ok(PLATFORMS.length >= 50);
    const ids = new Set(PLATFORMS.map((p) => p.id));
    assert.ok(ids.has("pc"));
    assert.ok(ids.has("itara_5200") || [...ids].some((id) => id.includes("itara")));
    assert.ok(ids.has("commodore"));
    assert.ok(CUSTOM_CONSOLE);
    assert.ok(!ids.has("custom_console"));
  });

  it("27 engine components: 1 starting Basic 2D V1 + 26 researchable", () => {
    assert.equal(ENGINE_COMPONENTS.length, 27);
    assert.equal(ENGINE_COMPONENT_COUNT, 27);
    const starts = ENGINE_COMPONENTS.filter((c) => c.starting);
    assert.equal(starts.length, 1);
    assert.equal(starts[0]!.id, STARTING_ENGINE_COMPONENT_ID);
    assert.equal(starts[0]!.name, "Basic 2D Graphics V1");
    assert.equal(researchableEngineComponents().length, 26);
    const names = ENGINE_COMPONENTS.map((c) => c.name);
    assert.ok(names.includes("Simple Cutscenes"));
    assert.ok(names.includes("Rich Backstory"));
    assert.ok(names.includes("Advanced AI"));
    assert.ok(!names.includes("Physics"));
    assert.ok(!names.includes("Voice Acting"));
    assert.deepEqual(startingEngineFeatures(), ["Basic 2D Graphics V1"]);
  });

  it("engine research items appear in RESEARCH without modded physics", () => {
    assert.ok(RESEARCH.some((r) => r.id === "simple_cutscenes"));
    assert.ok(RESEARCH.some((r) => r.id === "advanced_ai"));
    assert.ok(!RESEARCH.some((r) => r.id === "physics"));
  });
});

describe("genre fit calculation", () => {
  it("stage weights are exact", () => {
    assert.deepEqual([...GENRE_CAPACITY_WEIGHTS[1]], [1.0]);
    assert.deepEqual([...GENRE_CAPACITY_WEIGHTS[2]], [0.8, 0.2]);
    assert.deepEqual([...GENRE_CAPACITY_WEIGHTS[3]], [0.6, 0.3, 0.1]);
    assert.deepEqual([...GENRE_CAPACITY_WEIGHTS[4]], [0.4, 0.4, 0.1, 0.1]);
  });

  it("Military Action/Strategy/Simulation Stage3 = 92.5", () => {
    // 100*0.6 + 85*0.3 + 70*0.1 = 60+25.5+7 = 92.5
    const fit = computeGenreFit({
      topicId: "military",
      genres: ["action", "strategy", "simulation"],
      capacityTier: 3,
    });
    assert.equal(fit, 92.5);
  });

  it("Fantasy RPG+Adventure tier2 = 97", () => {
    // 100*0.8 + 85*0.2 = 80+17 = 97
    const fit = computeGenreFit({
      topicId: "fantasy",
      genres: ["rpg", "adventure"],
      capacityTier: 2,
    });
    assert.equal(fit, 97);
  });

  it("genreFitModifier maps 100→1.10 and 15→0.76", () => {
    assert.ok(Math.abs(genreFitModifier(100) - 1.1) < 1e-9);
    assert.ok(Math.abs(genreFitModifier(15) - 0.76) < 1e-9);
    assert.ok(Math.abs(genreFitModifier(70) - 0.98) < 1e-9);
  });

  it("compatibility values set is fixed", () => {
    assert.deepEqual([...COMPATIBILITY_VALUES], [100, 85, 70, 55, 35, 15]);
    assert.equal(topicGenreCompatibility("space", "adventure"), 100);
    assert.equal(topicGenreCompatibility("space", "action"), 85);
  });
});
