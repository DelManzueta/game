/**
 * First real systems test: duration, training, LBD, staff, hire cap, bugs, progress.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createProductionState,
  planStage,
  advanceDevelopmentDay,
  advancePolishDay,
  finalizeBuild,
  advanceBugFixingDay,
  founderFromStaff,
  STAGE_DISCIPLINES,
  defaultStageDemand,
  PHASE_PLANNING,
  PHASE_POLISH,
  PHASE_FINALIZE_BUILD,
  PHASE_BUG_FIXING,
  PHASE_RELEASE_READY,
} from "../production/algorithm";
import { overallProjectProgress } from "../production/bridge";
import { generateStaff } from "../simulation";
import { SIZE_STATS, MAX_HIRE_BUDGET } from "../data";
import {
  TRAINING_COURSES,
  startTrainingOnMember,
  tickStaffTraining,
  getTrainingCourse,
} from "../training";
import { computeWeeklyLearnByDoing, flushResearchPoints } from "../commercial/rp";
import { FOUNDER_RP_PER_WEEK, releaseRpSpike } from "../commercial/config";

function makeFounder(opts?: {
  design?: number;
  tech?: number;
  level?: number;
  bugFixBonus?: number;
}) {
  return founderFromStaff([
    {
      design: opts?.design ?? 52,
      tech: opts?.tech ?? 50,
      speed: 50,
      level: opts?.level ?? 2,
      bugFixBonus: opts?.bugFixBonus ?? 0,
    },
  ]);
}

function runFull(size: string, bugBonus = 0, seed = "finalize") {
  const founder = makeFounder({
    design: size === "aaa" ? 68 : 52,
    tech: size === "aaa" ? 66 : 50,
    level: size === "aaa" ? 5 : 2,
    bugFixBonus: bugBonus,
  });
  let state = createProductionState(`g-${size}`, seed, 0, size);
  for (const stage of [1, 2, 3] as const) {
    state = { ...state, currentStage: stage, phase: PHASE_PLANNING };
    const discs = STAGE_DISCIPLINES[stage];
    state = planStage(state, {
      stage,
      rawIntent: Object.fromEntries(discs.map((d) => [d, 40])),
      demand: defaultStageDemand(stage),
      size,
    });
    let guard = 0;
    while (state.phase === "developing" && guard++ < 5000) {
      state = advanceDevelopmentDay(state, { day: state.asOfDay + 1, founder }).state;
    }
  }
  let guard = 0;
  while (state.phase === PHASE_POLISH && guard++ < 2000) {
    state = advancePolishDay(state, { day: state.asOfDay + 1, founder }).state;
  }
  if (state.phase === PHASE_FINALIZE_BUILD) {
    state = finalizeBuild(state);
  }
  const daysAtReleaseProd = state.asOfDay;
  const bugsAtPolish = state.bugs.length;
  guard = 0;
  while (state.phase === PHASE_BUG_FIXING && guard++ < 5000) {
    state = advanceBugFixingDay(state, { day: state.asOfDay + 1, founder }).state;
  }
  const daysTotal = state.asOfDay;
  return {
    size,
    phase: state.phase,
    daysProd: daysAtReleaseProd,
    weeksProd: Math.ceil(daysAtReleaseProd / 7),
    monthsProd: Math.round((daysAtReleaseProd / 7 / 4) * 100) / 100,
    daysTotal,
    weeksTotal: Math.ceil(daysTotal / 7),
    monthsTotal: Math.round((daysTotal / 7 / 4) * 100) / 100,
    bugDays: daysTotal - daysAtReleaseProd,
    bugsCreated: bugsAtPolish,
    openAtEnd: state.bugs.filter((b) => b.remainingWork > 0).length,
    completedStages: state.completedStages.length,
  };
}

describe("finalize systems — duration", () => {
  it("small ~2 months production; AAA 10–13 months production (bugs extra)", () => {
    const small = runFull("small", 0, "dur-small");
    const aaa = runFull("aaa", 0, "dur-aaa");
    console.log("DURATION", { small, aaa });
    assert.equal(small.phase, PHASE_RELEASE_READY);
    assert.equal(aaa.phase, PHASE_RELEASE_READY);
    assert.ok(
      small.weeksProd >= 6 && small.weeksProd <= 12,
      `small prod weeks ${small.weeksProd} not in 6–12`,
    );
    assert.ok(
      aaa.weeksProd >= 36 && aaa.weeksProd <= 56,
      `aaa prod weeks ${aaa.weeksProd} not in 36–56`,
    );
    assert.ok(aaa.weeksProd > small.weeksProd * 3);
  });
});

describe("finalize systems — training", () => {
  it("Bug Squashing permanently raises stats and bugFixBonus", () => {
    const member = generateStaff(1.3, 1985);
    const course = getTrainingCourse("bug_squashing")!;
    const before = {
      d: member.design,
      t: member.tech,
      b: member.bugFixBonus ?? 0,
    };
    const started = startTrainingOnMember(member, course);
    assert.notEqual(typeof started, "string");
    let staff = [started as typeof member];
    for (let w = 0; w < course.weeks; w++) {
      staff = tickStaffTraining(staff).staff;
    }
    const after = staff[0]!;
    assert.ok(after.design >= before.d + course.design);
    assert.ok(after.tech >= before.t + course.tech);
    assert.ok((after.bugFixBonus ?? 0) >= before.b + course.bugFixBonus - 0.001);
    assert.equal(after.training, null);
    assert.equal(after.busy, false);
    assert.ok(TRAINING_COURSES.length >= 4);
  });

  it("QA training reduces bug-fix days for same bug set", () => {
    const noTrain = runFull("small", 0, "train-same");
    const withTrain = runFull("small", 0.12, "train-same");
    console.log("TRAIN BUG DAYS", {
      noTrain: noTrain.bugDays,
      withTrain: withTrain.bugDays,
      bugs: noTrain.bugsCreated,
    });
    assert.equal(noTrain.bugsCreated, withTrain.bugsCreated);
    if (noTrain.bugDays > 0) {
      assert.ok(
        withTrain.bugDays <= Math.floor(noTrain.bugDays * 0.9),
        `expected clear cut: ${withTrain.bugDays} vs ${noTrain.bugDays}`,
      );
    }
  });
});

describe("finalize systems — staff & hire budget", () => {
  it("candidates are strong, varied, and under $2M", () => {
    const names = new Set<string>();
    const designs: number[] = [];
    let stars = 0;
    for (let i = 0; i < 50; i++) {
      const m = generateStaff(1.1 + (i % 5) * 0.05, 1979 + (i % 10), {
        forceStar: i % 9 === 0,
      });
      names.add(m.name);
      designs.push(m.design);
      if (m.level >= 4) stars++;
      assert.ok(m.salary <= MAX_HIRE_BUDGET);
      assert.ok(m.design >= 32);
      assert.ok(m.tech >= 32);
    }
    const avgDesign = designs.reduce((a, b) => a + b, 0) / designs.length;
    assert.ok(names.size >= 40);
    assert.ok(avgDesign >= 45);
    assert.ok(stars >= 3);
    assert.equal(MAX_HIRE_BUDGET, 2_000_000);
  });
});

describe("finalize systems — learn by doing", () => {
  it("awards RP from ops/research/training/sales outside pure build", () => {
    const mock = {
      currentProject: null,
      activeResearch: { id: "r1" },
      contracts: [],
      staff: [
        { id: "founder", training: null },
        {
          id: "s1",
          training: { courseId: "speed_lab", weeksLeft: 1, totalWeeks: 1 },
        },
      ],
      office: 1 as const,
      activeSales: [
        {
          onSale: true,
          avgReview: 7.2,
          size: "small" as const,
          dormant: false,
          delisted: false,
        },
      ],
      researchPoints: 0,
      researchPointsFrac: 0,
    };
    const weekly = computeWeeklyLearnByDoing(mock as never);
    assert.ok(weekly > FOUNDER_RP_PER_WEEK.operations);
    assert.ok(weekly >= FOUNDER_RP_PER_WEEK.researching);
    let whole = 0;
    let frac = 0;
    for (let w = 0; w < 20; w++) {
      frac += weekly;
      const f = flushResearchPoints({ researchPoints: whole, researchPointsFrac: frac });
      whole = f.researchPoints;
      frac = f.researchPointsFrac;
    }
    assert.ok(whole >= 10);
    assert.ok(releaseRpSpike(8) >= 10);
  });
});

describe("finalize systems — catalog + progress bar", () => {
  it("SIZE_STATS and overall progress match targets", () => {
    assert.equal(SIZE_STATS.small.weeks, 8);
    assert.equal(SIZE_STATS.aaa.weeks, 44);
    const fakeProject = {
      stageProgress: 0.5,
      production: {
        phase: "developing",
        completedStages: [{}],
        activeProgress: {
          plan: { requiredSwu: { story: 100, engine: 100, gameplay: 100 } },
          workDone: { story: 50, engine: 50, gameplay: 50 },
        },
        polishProgress: 0,
        polishRequired: 360,
        bugs: [],
      },
    };
    const prog = overallProjectProgress(fakeProject as never);
    assert.ok(prog > 0.3 && prog < 0.6);
  });
});
