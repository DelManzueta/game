/**
 * Authoritative Garage campaign traces — real store commands only.
 * node --import tsx scripts/foundation-campaign-trace.mjs
 */
// Minimal localStorage for Node so export/importSave use real load path
if (typeof globalThis.localStorage === "undefined") {
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(String(k), String(v)); },
    removeItem: (k) => { mem.delete(String(k)); },
    clear: () => { mem.clear(); },
    key: (i) => [...mem.keys()][i] ?? null,
    get length() { return mem.size; },
  };
}

import { useGame } from "../src/lib/game/store.ts";
import { STAGE_FIELDS } from "../src/lib/game/data.ts";

function must(err, label) {
  if (err) throw new Error(`${label}: ${err}`);
}

function dismissSoft() {
  const s = useGame.getState();
  if (s.pendingEvent) {
    // Prefer free / first choice
    useGame.getState().resolveEvent(0);
  }
  if (useGame.getState().modal === "event" && !useGame.getState().pendingEvent) {
    useGame.setState({ modal: null, speed: 1 });
  }
  if (useGame.getState().modal === "officeOffer") {
    // Keep deferred offer available; close modal without accepting
    useGame.setState({ modal: null, speed: 1 });
  }
}

function advance(n = 1) {
  for (let i = 0; i < n; i++) {
    useGame.getState().setSpeed(1);
    const err = useGame.getState().advanceWeek();
    if (err) throw new Error(`advanceWeek: ${err}`);
    dismissSoft();
  }
}

function setStageSliders(mode) {
  const p = useGame.getState().currentProject;
  if (!p) throw new Error("no project for sliders");
  const phase = p.devPhase ?? "";
  let stageNum = 1;
  if (phase.includes("2")) stageNum = 2;
  else if (phase.includes("3")) stageNum = 3;
  else if (p.stage) stageNum = p.stage;
  const fields = STAGE_FIELDS[stageNum] ?? STAGE_FIELDS[1];
  // Action strong: engine/gameplay/ai/graphics high
  const strong = {
    engine: 95, gameplay: 90, story: 15,
    dialogue: 10, level: 85, ai: 90,
    world: 70, graphics: 95, sound: 80,
  };
  const poor = {
    engine: 10, gameplay: 15, story: 95,
    dialogue: 95, level: 10, ai: 10,
    world: 15, graphics: 10, sound: 15,
  };
  for (const f of fields) {
    const v = mode === "strong" ? (strong[f] ?? 75)
      : mode === "poor" ? (poor[f] ?? 20)
      : 50;
    useGame.getState().setSlider(f, v);
  }
}

function runStages(mode) {
  for (let stage = 1; stage <= 3; stage++) {
    let guard = 0;
    while (guard++ < 120) {
      const p = useGame.getState().currentProject;
      if (!p) throw new Error("project lost mid-stage");
      if (p.devPhase?.includes("CONFIG")) {
        setStageSliders(mode);
        must(useGame.getState().confirmStage(), "confirmStage");
        dismissSoft();
      } else if (
        p.devPhase === "POLISHING" ||
        p.production?.phase === "bug_fixing" ||
        p.production?.phase === "polish" ||
        p.devPhase === "READY_TO_RELEASE"
      ) {
        break;
      } else {
        advance(1);
      }
      const ph = useGame.getState().currentProject?.devPhase;
      if (ph === "STAGE_2_CONFIG" && stage === 1) break;
      if (ph === "STAGE_3_CONFIG" && stage === 2) break;
      if (ph === "POLISHING" || ph === "READY_TO_RELEASE") break;
    }
  }
}

function polishTo(mode) {
  // strong: full polish; average: partial; poor: minimal — leave bugs
  const limit = mode === "strong" ? 50 : mode === "average" ? 8 : 0;
  let guard = 0;
  while (guard++ < limit) {
    const p = useGame.getState().currentProject;
    if (!p) break;
    if (p.devPhase === "READY_TO_RELEASE" || p.production?.phase === "release_ready") break;
    if (
      p.devPhase === "POLISHING" ||
      p.production?.phase === "bug_fixing" ||
      p.production?.phase === "polish"
    ) {
      must(useGame.getState().workPolishWeek(), "workPolishWeek");
      dismissSoft();
    } else {
      advance(1);
    }
  }
  // Enter pre-release legitimately (work polish weeks as needed)
  let g = 0;
  while (g++ < 60) {
    const p = useGame.getState().currentProject;
    if (!p) break;
    if (p.devPhase === "READY_TO_RELEASE" || p.production?.phase === "release_ready") break;
    const err = useGame.getState().enterPreRelease?.();
    if (!err) break;
    // Still polishing / bugs — one more polish settlement week
    const werr = useGame.getState().workPolishWeek?.();
    if (werr) advance(1);
    dismissSoft();
  }
}

function snapshotCausal(label) {
  const s = useGame.getState();
  const g = s.releasedGames[0];
  return {
    label,
    seed: s.campaignSeed,
    week: s.week,
    cash: s.cash,
    ledger: s.ledger?.balance,
    fans: s.fans,
    designPts: g?.designPoints ?? s.currentProject?.designPoints,
    techPts: g?.techPoints ?? s.currentProject?.techPoints,
    bugs: g?.bugs ?? s.currentProject?.bugs,
    avgReview: g?.avgReview,
    hist: s.targetHighScore,
    sales: g?.sales,
    revenue: g?.revenue,
    fansGained: g?.fansGained,
  };
}

function runScenario(label, company, mode) {
  must(useGame.getState().newGame(company, false, "standard") ?? null, "newGame");
  // Legitimate garage content only — no injected unlocks
  const seed = useGame.getState().campaignSeed;
  const histBefore = useGame.getState().targetHighScore;
  const topics = useGame.getState().unlockedTopics;
  const genres = useGame.getState().unlockedGenres;
  if (!topics.length || !genres.length) throw new Error("no garage topics/genres");

  // Pick legitimate combos from unlocked sets
  const topicId =
    mode === "poor"
      ? (topics.includes("comedy") ? "comedy" : topics[topics.length - 1])
      : mode === "average"
        ? (topics.includes("racing") ? "racing" : topics[0])
        : (topics.includes("space") ? "space" : topics[0]);
  const genreId =
    mode === "poor"
      ? (genres.includes("strategy") ? "strategy" : genres[genres.length - 1])
      : mode === "average"
        ? (genres.includes("simulation") ? "simulation" : genres[0])
        : (genres.includes("action") ? "action" : genres[0]);

  must(
    useGame.getState().startProject({
      title: `${label} Title`,
      topicId,
      genreId,
      platformId: useGame.getState().unlockedPlatforms[0] ?? "pc",
      size: "small",
      audience: "everyone",
    }),
    "startProject",
  );

  const projectId = useGame.getState().currentProject?.id;
  const projectSeed = useGame.getState().currentProject?.rngSeed;
  const cashAfterStart = useGame.getState().cash;

  runStages(mode);
  polishTo(mode);

  const errPre = useGame.getState().enterPreRelease?.();
  // ignore if already ready
  dismissSoft();

  const p = useGame.getState().currentProject;
  if (!p) throw new Error("no project before release");
  const designPts = p.designPoints;
  const techPts = p.techPoints;
  const bugs = p.bugs ?? 0;
  const weekBeforeRelease = useGame.getState().week;
  const cashBeforeRelease = useGame.getState().cash;
  const fansBeforeRelease = useGame.getState().fans;

  // Midpoint: full export via real save path
  const midRaw = useGame.getState().exportSave();
  if (!midRaw || midRaw.length < 100) throw new Error("exportSave empty");

  must(useGame.getState().releaseGame(), "releaseGame");
  dismissSoft();

  const afterRel = useGame.getState();
  const released = afterRel.releasedGames.find((g) => g.id === projectId) ?? afterRel.releasedGames[0];
  const salesWeek0 = released?.sales ?? 0;
  const fansAtRelease = afterRel.fans;
  const fansGainedAtRelease = released?.fansGained ?? 0;

  // Midpoint reload: import through real load path
  useGame.getState().newGame("tmp-reload", false, "standard");
  const okLoad = useGame.getState().importSave(midRaw);
  if (!okLoad) throw new Error("importSave failed at midpoint");
  // Finish after reload: if still in project, release
  if (useGame.getState().currentProject) {
    const cp = useGame.getState().currentProject;
    if (cp.devPhase !== "READY_TO_RELEASE") {
      useGame.getState().enterPreRelease?.();
    }
    useGame.getState().releaseGame();
    dismissSoft();
  }

  const weekly = [];
  for (let w = 0; w < 6; w++) {
    advance(1);
    const g = useGame.getState().releasedGames.find((x) => x.id === released?.id)
      ?? useGame.getState().releasedGames[0];
    const hist = g?.weeklyHistory ?? [];
    const last = hist[hist.length - 1];
    weekly.push({
      week: useGame.getState().week,
      units: last?.units ?? 0,
      revenue: last?.revenue ?? 0,
      fans: useGame.getState().fans,
      cash: useGame.getState().cash,
      ledger: useGame.getState().ledger?.balance,
    });
  }

  const rentEntries = (useGame.getState().ledger?.entries ?? []).filter((e) => e.category === "rent");
  const recon = (useGame.getState().ledger?.entries ?? []).filter(
    (e) => e.label === "Balance reconciliation",
  );

  return {
    label,
    seed,
    projectId,
    projectSeed,
    weekBeforeRelease,
    designPts,
    techPts,
    bugs,
    reviews: released?.reviews?.scores ?? released?.reviewScores,
    avgReview: released?.avgReview,
    histBefore,
    histAfter: useGame.getState().targetHighScore,
    cashAfterStart,
    cashBeforeRelease,
    cashReleaseDay: afterRel.cash,
    salesWeek0,
    fansBeforeRelease,
    fansAtRelease,
    fansGainedAtRelease,
    weekly,
    rentCharges: rentEntries.map((e) => ({ week: e.week, amount: e.amount })),
    finalCash: useGame.getState().cash,
    finalLedger: useGame.getState().ledger?.balance,
    cashEqualsLedger: useGame.getState().cash === useGame.getState().ledger?.balance,
    noReconciliation: recon.length === 0,
    midReloadOk: true,
    causal: snapshotCausal(label),
  };
}

const scenarios = [
  ["strong", "Strong Studio FL", "strong"],
  ["average", "Average Studio FL", "average"],
  ["poor", "Poor Studio FL", "poor"],
];

const results = [];
for (const [label, company, mode] of scenarios) {
  const a = runScenario(label, company, mode);
  const b = runScenario(label, company, mode);
  const match =
    a.seed === b.seed &&
    a.avgReview === b.avgReview &&
    a.finalCash === b.finalCash &&
    a.bugs === b.bugs &&
    a.designPts === b.designPts &&
    a.techPts === b.techPts &&
    JSON.stringify(a.weekly) === JSON.stringify(b.weekly);
  const out = { ...a, deterministicReplay: match };
  results.push(out);
  console.log(JSON.stringify(out, null, 2));
}

// Diversity check
const reviews = results.map((r) => r.avgReview);
const bugs = results.map((r) => r.bugs);
const strong = results.find((r) => r.label === "strong");
const poor = results.find((r) => r.label === "poor");
console.log(JSON.stringify({
  diversity: {
    reviewSpread: Math.max(...reviews) - Math.min(...reviews),
    strongReview: strong?.avgReview,
    poorReview: poor?.avgReview,
    poorBugs: poor?.bugs,
    strongBugs: strong?.bugs,
  },
}, null, 2));
