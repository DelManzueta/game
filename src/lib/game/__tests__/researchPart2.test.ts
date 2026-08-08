/**
 * Part 2 — research pipeline, importance, pricing, difficulty, hardware bottlenecks.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  seedGarageTechPipeline,
  beginTechResearch,
  tickResearchPipeline,
  canBecomeResearchable,
  computeEffectiveImportance,
  tagsForTopic,
  priceResponse,
  createProductPricing,
  getDifficulty,
  applyStartingCash,
  getTech,
  TECH_CATALOG,
} from "../research";
import { computeHardwareAxes, hardwareBottleneck, createHardwareProject } from "../hardware";

describe("research pipeline", () => {
  it("garage starts with design features production-ready, not holograms", () => {
    const pipe = seedGarageTechPipeline(1979);
    assert.equal(pipe.knowledge.collectibles?.state, "production_ready");
    assert.ok(!pipe.knowledge.interactive_holograms || pipe.knowledge.interactive_holograms.state === "unknown");
  });

  it("holograms not researchable in 1994", () => {
    const pipe = seedGarageTechPipeline(1994);
    const check = canBecomeResearchable("basic_holograms", {
      year: 1994,
      pipe,
      researchedLegacy: [],
      office: 5,
      hasRnd: true,
    });
    assert.equal(check.ok, false);
  });

  it("research → prototype → integration path advances without erasing progress", () => {
    let pipe = seedGarageTechPipeline(1995);
    pipe = {
      ...pipe,
      knowledge: {
        ...pipe.knowledge,
        quick_save: {
          techId: "quick_save",
          state: "researchable",
          progress: 0,
          commercialUses: 0,
          maturity: 0,
          lastAdvancedWeek: 0,
          prototypeNotes: [],
          integrationComplete: false,
          failureKnowledge: 0,
        },
      },
    };
    const started = beginTechResearch(pipe, "quick_save", 1995, 10);
    assert.ok(!started.error);
    pipe = started.pipe;
    assert.equal(pipe.knowledge.quick_save?.state, "researching");
    // Drain weeks
    for (let w = 0; w < 40; w++) {
      const t = tickResearchPipeline(pipe, 10 + w);
      pipe = t.pipe;
    }
    const st = pipe.knowledge.quick_save?.state;
    assert.ok(
      st === "production_ready" || st === "engine_integration" || st === "prototype",
      `unexpected state ${st}`,
    );
  });
});

describe("topic importance", () => {
  it("tags reshape genre without replacing it", () => {
    const tags = tagsForTopic("politics");
    assert.ok(tags.includes("narrative_heavy"));
    const imp = computeEffectiveImportance({
      genreId: "action",
      topicId: "politics",
      pillar: "cinematic_narrative",
    });
    // Story should be elevated vs pure action base
    assert.ok(imp.story > 0.6);
    // Still has action-relevant fields
    assert.ok(imp.gameplay > 0.5);
  });

  it("military + competitive pillar raises gameplay/ai", () => {
    const imp = computeEffectiveImportance({
      genreId: "action",
      topicId: "military",
      pillar: "competitive_mastery",
    });
    assert.ok(imp.gameplay >= imp.story * 0.9);
  });
});

describe("pricing & difficulty", () => {
  it("price response is inverse and clamped; does not touch quality", () => {
    assert.ok(priceResponse(10, "small") > 1);
    assert.ok(priceResponse(40, "small") < 1);
    const p = createProductPricing({ size: "small", basePrice: 20, week: 5, year: 1980 });
    assert.equal(p.basePrice, 20);
    assert.equal(p.lockedAtWeek, 5);
  });

  it("difficulty adjusts cash only via multiplier", () => {
    const creative = getDifficulty("creative");
    const exec = getDifficulty("executive");
    assert.ok(applyStartingCash(100_000, creative) > applyStartingCash(100_000, exec));
    assert.ok(exec.certificationStrictness > creative.certificationStrictness);
  });
});

describe("hardware bottlenecks", () => {
  it("does not average weak CPU with strong GPU into excellence", () => {
    const axes = computeHardwareAxes(["gpu_poly", "cpu_8bit", "mem_low", "storage_cart"]);
    const bottleneck = hardwareBottleneck(axes, ["compute", "graphics", "memory"]);
    assert.ok(bottleneck.value < 0.5);
    assert.ok(bottleneck.axis === "compute" || bottleneck.axis === "memory");
    const proj = createHardwareProject({
      name: "Test Box",
      purpose: "family_console",
      components: ["cpu_8bit", "gpu_poly", "mem_low"],
      week: 1,
    });
    assert.ok(proj.bomCost > 0);
    assert.ok(proj.axes.graphics > proj.axes.compute);
  });
});

describe("catalog reclassification", () => {
  it("licensed music is business/legal not engine-only", () => {
    const t = getTech("licensed_music");
    assert.ok(t);
    assert.equal(t!.category, "business");
    assert.equal(t!.isDesignOnly, true);
    assert.ok(!t!.name.toLowerCase().includes("copywritten"));
  });

  it("superior AI is split into family, not one item", () => {
    assert.ok(getTech("pattern_ai"));
    assert.ok(getTech("pathfinding"));
    assert.ok(getTech("behavior_trees"));
    assert.equal(
      TECH_CATALOG.filter((x) => x.id === "superior_ai").length,
      0,
    );
  });
});
