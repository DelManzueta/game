/**
 * Part 3 — engine hierarchy, immutability, work formula, suitability.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createGarageWorkshop,
  startEngineBuild,
  tickEngineBuild,
  captureGameEngineSnapshot,
  resolveWithDependencies,
  missingDependencies,
  activeConflicts,
  computeRequiredEngineWork,
  evaluateEngineSuitability,
  SELECTABLE_MODULES,
} from "../engine";
import type { StaffMember } from "../types";

const founder: StaffMember = {
  id: "founder",
  name: "Founder",
  design: 50,
  tech: 60,
  speed: 55,
  salary: 0,
  specialization: "engine",
  level: 2,
  xp: 0,
  busy: false,
  energy: 100,
};

describe("engine modules graph", () => {
  it("resolves transitive dependencies", () => {
    const resolved = resolveWithDependencies(["gfx_3d_v1"]);
    assert.ok(resolved.includes("core_loop"));
    assert.ok(resolved.includes("sprite_2d"));
    assert.ok(resolved.includes("gfx_2d_v2"));
    assert.deepEqual(missingDependencies(resolved), []);
  });

  it("detects soft conflicts without hard-blocking", () => {
    const conflicts = activeConflicts(["net_local", "anti_cheat_auth"]);
    assert.ok(Array.isArray(conflicts));
  });
});

describe("work formula", () => {
  it("scales with secondary goals, platforms, and experimental purpose", () => {
    const small = computeRequiredEngineWork({
      purpose: "fast_2d",
      secondaryPurposes: [],
      architecture: "monolithic",
      lifespan: "one_project",
      moduleIds: ["core_loop", "sprite_2d"],
      platformCount: 1,
      targetSizes: ["small"],
      technicalDebt: 0,
    });
    const big = computeRequiredEngineWork({
      purpose: "experimental_future",
      secondaryPurposes: ["open_world", "persistent_online"],
      architecture: "portable",
      lifespan: "licensed_commercial",
      moduleIds: SELECTABLE_MODULES.filter((m) => m.baseWork > 0)
        .map((m) => m.id)
        .slice(0, 12),
      platformCount: 4,
      targetSizes: ["aaa"],
      technicalDebt: 40,
      novelty: 1.45,
    });
    assert.ok(big.requiredWork > small.requiredWork * 2);
  });
});

describe("garage workshop + immutability", () => {
  it("starts with immutable Basic Engine 1.0", () => {
    const { workshop, engineDef } = createGarageWorkshop({
      companyId: "player",
      week: 0,
      year: 1979,
    });
    assert.equal(engineDef.id, "basic_engine");
    assert.equal(workshop.versions[0]!.immutable, true);
    assert.equal(workshop.versions[0]!.status, "stable");
    assert.equal(workshop.activeBuild, null);
  });

  it("build progresses and releases a new immutable version", () => {
    let { workshop } = createGarageWorkshop({ companyId: "p", week: 0, year: 1979 });
    const start = startEngineBuild({
      workshop,
      name: "Forge",
      purpose: "fast_2d",
      secondaryPurposes: [],
      architecture: "modular",
      lifespan: "multi_project",
      priorities: { development_speed: 4, stability: 3, maintainability: 3, modularity: 2 },
      moduleIds: ["core_loop", "sprite_2d", "audio_mono", "save_local"],
      targetPlatforms: ["pc"],
      targetSizes: ["small"],
      staff: [founder],
      week: 10,
      year: 1979,
      companyId: "p",
      cash: 500_000,
    });
    assert.equal(start.ok, true);
    if (!start.ok) return;
    workshop = start.workshop;
    assert.ok(workshop.activeBuild);

    let released = null as ReturnType<typeof tickEngineBuild>["released"];
    for (let i = 0; i < 80 && !released; i++) {
      const t = tickEngineBuild(workshop, [founder], 10 + i, 1979);
      workshop = t.workshop;
      released = t.released;
    }
    assert.ok(released);
    assert.equal(released!.immutable, true);
    assert.equal(workshop.activeBuild, null);
    const basic = workshop.versions.find((v) => v.versionId === "basic_engine");
    assert.equal(basic?.label, "Basic Engine 1.0");
    assert.ok(basic?.modules.map((m) => m.moduleId).includes("sprite_2d"));
  });

  it("game snapshot freezes multi-axis suitability", () => {
    const { workshop } = createGarageWorkshop({ companyId: "p", week: 0, year: 1979 });
    const snap = captureGameEngineSnapshot({
      gameId: "g1",
      engineVersionId: "basic_engine",
      workshop,
      genreId: "action",
      size: "small",
      platformId: "pc",
      staff: [founder],
      week: 5,
      year: 1979,
    });
    assert.ok(snap);
    assert.ok(snap!.suitability.overall > 0.3);
    assert.ok(snap!.suitability.platform > 0);
    assert.ok(snap!.suitability.team > 0);
    assert.ok(Array.isArray(snap!.suitability.notes));
  });
});

describe("suitability multi-axis", () => {
  it("AAA on garage engine is weaker scale than small casual", () => {
    const { workshop } = createGarageWorkshop({ companyId: "p", week: 0, year: 1979 });
    const v = workshop.versions[0]!;
    const f = workshop.families[0]!;
    const small = evaluateEngineSuitability({
      version: v,
      family: f,
      genreId: "casual",
      size: "small",
      platformId: "pc",
      staff: [founder],
      familyFamiliarity: 0.6,
    });
    const aaa = evaluateEngineSuitability({
      version: v,
      family: f,
      genreId: "action",
      size: "aaa",
      platformId: "pc",
      staff: [founder],
      familyFamiliarity: 0.2,
      wantsOnline: true,
    });
    assert.ok(small.scale > aaa.scale);
    assert.ok(
      aaa.notes.some((n) => /AAA|online|overengineer|infrastructure|familiarity/i.test(n)),
    );
  });
});
