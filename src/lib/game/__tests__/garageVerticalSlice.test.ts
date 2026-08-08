/**
 * First real garage vertical slice: small game stages → polish → release-ready,
 * with progress bars advancing and learn-by-doing RP accruing.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyPlanStage,
  advanceProductionWeek,
  overallProjectProgress,
  isReleaseReady,
} from "../production/bridge";
import type { GameProject, StaffMember } from "../types";
import { defaultSliders, START_YEAR, SIZE_STATS } from "../data";
import { computeWeeklyLearnByDoing, flushResearchPoints } from "../commercial/rp";

function founder(): StaffMember {
  return {
    id: "founder",
    name: "You",
    design: 55,
    tech: 52,
    speed: 58,
    salary: 0,
    specialization: null,
    level: 2,
    xp: 40,
    fieldExperience: {},
    busy: false,
    energy: 100,
    bugFixBonus: 0,
  };
}

function makeSmallProject(): GameProject {
  return {
    id: "slice-1",
    title: "Garage Quest",
    topicId: "fantasy",
    genreId: "action",
    genre2Id: null,
    platformId: "pc",
    audience: "everyone",
    size: "small",
    engineId: "basic",
    features: [],
    stage: 1,
    stageProgress: 0,
    weeksDev: 0,
    bugs: 0,
    marketingSpend: 0,
    developmentCost: SIZE_STATS.small.cost,
    sliders: defaultSliders("action"),
    stageConfigs: {},
    researchEarned: 0,
    devPhase: "STAGE_1_CONFIG",
  } as GameProject;
}

describe("garage vertical slice — first real small game", () => {
  it("runs small project to release-ready in ~2 in-game months production", () => {
    let project = makeSmallProject();
    const staff = [founder()];
    const seed = "vertical-slice-1979";
    let day = 0;
    let week = 0;
    let year = START_YEAR;
    let researchPoints = 0;
    let researchPointsFrac = 0;
    const progressSamples: number[] = [];

    for (const stage of [1, 2, 3] as const) {
      const planned = applyPlanStage(project, seed, day, stage);
      assert.ok(!planned.error, planned.error);
      project = planned.project;
      assert.ok(
        project.devPhase.includes("RUNNING"),
        `stage ${stage} should be running, got ${project.devPhase}`,
      );

      let guard = 0;
      while (
        project.devPhase.includes("RUNNING") &&
        guard++ < 40
      ) {
        const before = overallProjectProgress(project);
        const adv = advanceProductionWeek(project, {
          campaignSeed: seed,
          staff,
          startDay: project.production?.asOfDay ?? day,
        });
        project = adv.project;
        day = project.production?.asOfDay ?? day + 7;
        week += 1;
        if (week % 4 === 0) year = START_YEAR + Math.floor(week / 48);
        // learn-by-doing while developing
        const mock = {
          currentProject: project,
          activeResearch: null,
          contracts: [],
          staff,
          office: 1,
          activeSales: [],
          researchPoints,
          researchPointsFrac,
        };
        researchPointsFrac += computeWeeklyLearnByDoing(mock as never);
        const f = flushResearchPoints({ researchPoints, researchPointsFrac });
        researchPoints = f.researchPoints;
        researchPointsFrac = f.researchPointsFrac;
        const after = overallProjectProgress(project);
        progressSamples.push(after);
        assert.ok(after + 0.001 >= before * 0.95 || adv.stageJustFinished, "progress generally advances");
      }
      assert.ok(guard < 40, `stage ${stage} completed`);
    }

    // polish + bugs
    let guard = 0;
    while (!isReleaseReady(project) && guard++ < 30) {
      const adv = advanceProductionWeek(project, {
        campaignSeed: seed,
        staff,
        startDay: project.production?.asOfDay ?? day,
      });
      project = adv.project;
      day = project.production?.asOfDay ?? day + 7;
      week += 1;
      progressSamples.push(overallProjectProgress(project));
    }

    console.log("SLICE RESULT", {
      week,
      year,
      months: week / 4,
      phase: project.devPhase,
      bugs: project.bugs,
      researchPoints,
      progressLast: progressSamples[progressSamples.length - 1],
      weeksDev: project.weeksDev,
    });

    assert.ok(isReleaseReady(project), "release ready");
    assert.equal(overallProjectProgress(project), 1);
    // ~2 months production target for small (allow bugs overhead up to ~4 mo total)
    assert.ok(week >= 6 && week <= 18, `weeks ${week} not in 6–18`);
    assert.ok(researchPoints >= 1 || researchPointsFrac > 0, "learn-by-doing accrued");
    // progress bar was not stuck at 0 the whole time
    assert.ok(progressSamples.some((p) => p > 0.2));
    assert.ok(progressSamples.some((p) => p > 0.5));
  });
});
