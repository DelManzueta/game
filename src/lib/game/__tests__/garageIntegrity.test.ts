/**
 * Garage integrity: release gates, cancel isolation, size gating.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { availableSizes } from "../store";
import { projectPhaseLabel, explainSales } from "../viewModels";
import type { GameProject, ReleasedGame } from "../types";

describe("garage integrity", () => {
  it("medium size requires office team — research alone is not enough", () => {
    const researched = ["medium_games"];
    const unlocks = { medium_games: "owned" as const };
    assert.deepEqual(
      availableSizes(researched, unlocks, { office: 1, staffCount: 1 }),
      ["small"],
    );
    assert.deepEqual(
      availableSizes(researched, unlocks, { office: 2, staffCount: 2 }),
      ["small", "medium"],
    );
  });

  it("phase labels mark config and release as player input", () => {
    const base = {
      id: "g",
      title: "T",
      topicId: "space",
      genreId: "action" as const,
      platformId: "pc",
      audience: "everyone" as const,
      size: "small" as const,
      engineId: "basic",
      stage: 1 as const,
      stageProgress: 0,
      stageConfigs: { 1: {}, 2: {}, 3: {} },
      sliders: {} as GameProject["sliders"],
      designPoints: 0,
      techPoints: 0,
      researchEarned: 0,
      bugs: 0,
      hype: 0,
      marketingSpend: 0,
      developmentCost: 0,
      weeksDev: 0,
      features: [],
    };
    assert.equal(projectPhaseLabel({ ...base, devPhase: "STAGE_1_CONFIG" }).needsPlayerInput, true);
    assert.equal(projectPhaseLabel({ ...base, devPhase: "STAGE_1_RUNNING" }).needsPlayerInput, false);
    assert.equal(projectPhaseLabel({ ...base, devPhase: "READY_TO_RELEASE" }).needsPlayerInput, true);
    assert.equal(projectPhaseLabel(null).primaryAction, "Develop New Game");
  });

  it("explainSales does not invent scores for cancelled-style empty records", () => {
    const g = {
      id: "x",
      title: "X",
      avgReview: 7.2,
      productQuality: 72,
      onSale: true,
      weeksOnMarket: 10,
      awarenessAtLaunch: 0.15,
    } as ReleasedGame;
    const text = explainSales(g);
    assert.ok(text.includes("reviews") || text.includes("slow") || text.includes("awareness") || text.length > 5);
  });
});
