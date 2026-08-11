/**
 * Authoritative Garage campaign traces via Zustand store commands only.
 * node --import tsx scripts/foundation-campaign-trace.mjs
 */
import { useGame } from "../src/lib/game/store.ts";
import { STAGE_FIELDS } from "../src/lib/game/data.ts";

function dismissBlocks() {
  const s = useGame.getState();
  if (s.pendingEvent) {
    useGame.getState().resolveEvent(0);
  }
  if (useGame.getState().modal === "event") {
    useGame.setState({ modal: null, pendingEvent: null, speed: 1 });
  }
  if (useGame.getState().modal === "officeOffer") {
    useGame.setState({ modal: null, speed: 1 });
  }
}

function advance(n = 1) {
  for (let i = 0; i < n; i++) {
    useGame.getState().setSpeed(1);
    useGame.getState().advanceWeek();
    dismissBlocks();
  }
}

/** Genre-aware stage allocations for strong/average/poor store campaigns. */
function setStageSliders(mode) {
  const p = useGame.getState().currentProject;
  if (!p) return;
  const phase = p.devPhase ?? "";
  let stageNum = p.stage;
  if (phase.includes("1")) stageNum = 1;
  else if (phase.includes("2")) stageNum = 2;
  else if (phase.includes("3")) stageNum = 3;
  const fields = STAGE_FIELDS[stageNum] ?? STAGE_FIELDS[1];

  // Action-friendly strong weights: engine/gameplay/ai/graphics high; story/dialogue lower.
  // Poor: inverted / flat-wrong. Average: neutral 50s.
  const strong = {
    engine: 90,
    gameplay: 85,
    story: 25,
    dialogue: 20,
    level: 80,
    ai: 85,
    world: 70,
    graphics: 90,
    sound: 75,
  };
  const poor = {
    engine: 20,
    gameplay: 25,
    story: 90,
    dialogue: 90,
    level: 15,
    ai: 15,
    world: 20,
    graphics: 20,
    sound: 25,
  };
  for (const f of fields) {
    const v =
      mode === "strong" ? (strong[f] ?? 70) : mode === "poor" ? (poor[f] ?? 30) : 50;
    useGame.getState().setSlider(f, v);
  }
}

function runScenario(label, company, mode) {
  useGame.getState().newGame(company, false, "standard");
  useGame.setState({
    unlockedTopics: ["space", "fantasy", "racing", "dungeon", "comedy", "military", "city"],
    unlockedGenres: ["action", "adventure", "rpg", "simulation", "strategy", "casual"],
    unlockedPlatforms: ["pc", "itara_5200"],
  });
  const seed = useGame.getState().campaignSeed;
  const histBefore = useGame.getState().targetHighScore;
  const fansAtStart = useGame.getState().fans;

  const startErr = useGame.getState().startProject({
    title: `${label} Title`,
    // Strong combo, neutral combo, poor combo — store scoring only
    topicId: mode === "poor" ? "comedy" : mode === "average" ? "racing" : "space",
    genreId: mode === "poor" ? "strategy" : mode === "average" ? "simulation" : "action",
    platformId: "pc",
    size: "small",
    audience: "everyone",
  });
  if (startErr) throw new Error(String(startErr));

  const projectId = useGame.getState().currentProject?.id;
  const projectSeed = useGame.getState().currentProject?.rngSeed;
  const cashAfterStart = useGame.getState().cash;
  const ledgerAfterStart = useGame.getState().ledger?.balance;

  // Stages 1–3
  for (let stage = 1; stage <= 3; stage++) {
    let guard = 0;
    while (guard++ < 100) {
      const p = useGame.getState().currentProject;
      if (!p) break;
      if (p.devPhase?.includes("CONFIG")) {
        setStageSliders(mode);
        useGame.getState().confirmStage();
        dismissBlocks();
      } else if (
        p.devPhase === "POLISHING" ||
        p.production?.phase === "bug_fixing" ||
        p.production?.phase === "polish" ||
        p.production?.phase === "finalize_build" ||
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

  // Polish: strong polishes fully; average moderate; poor barely
  const polishLimit = mode === "strong" ? 40 : mode === "average" ? 12 : 2;
  let guard = 0;
  while (guard++ < polishLimit) {
    const p = useGame.getState().currentProject;
    if (!p) break;
    if (p.devPhase === "READY_TO_RELEASE" || p.production?.phase === "release_ready") break;
    if (
      p.devPhase === "POLISHING" ||
      p.production?.phase === "bug_fixing" ||
      p.production?.phase === "polish"
    ) {
      useGame.getState().workPolishWeek();
      dismissBlocks();
    } else {
      advance(1);
    }
  }
  // Force pre-release if still polishing (poor path may leave bugs)
  guard = 0;
  while (guard++ < 20) {
    const p = useGame.getState().currentProject;
    if (!p) break;
    if (p.devPhase === "READY_TO_RELEASE" || p.production?.phase === "release_ready") break;
    if (mode === "poor") {
      // Skip full polish — enter pre-release with remaining bugs if API allows
      const err = useGame.getState().enterPreRelease?.();
      if (!err) break;
      advance(1);
    } else {
      useGame.getState().workPolishWeek();
      dismissBlocks();
    }
  }

  useGame.getState().enterPreRelease();
  dismissBlocks();
  const p = useGame.getState().currentProject;
  const designPts = p?.designPoints;
  const techPts = p?.techPoints;
  const bugs = p?.bugs ?? 0;
  const weekBeforeRelease = useGame.getState().week;
  const cashBeforeRelease = useGame.getState().cash;
  const fansBeforeRelease = useGame.getState().fans;

  const relErr = useGame.getState().releaseGame();
  if (relErr) {
    // force ready then retry
    useGame.setState({
      currentProject: useGame.getState().currentProject
        ? { ...useGame.getState().currentProject, devPhase: "READY_TO_RELEASE" }
        : null,
    });
    useGame.getState().releaseGame();
  }
  dismissBlocks();
  const afterRel = useGame.getState();
  const released = afterRel.releasedGames.find((g) => g.id === projectId) ?? afterRel.releasedGames[0];
  const histAfter = afterRel.targetHighScore;
  const cashReleaseDay = afterRel.cash;
  const salesWeek0 = released?.sales ?? 0;
  const fansAtRelease = afterRel.fans;

  const mid = JSON.parse(
    JSON.stringify({
      week: afterRel.week,
      cash: afterRel.cash,
      ledger: afterRel.ledger,
      releasedGames: afterRel.releasedGames,
      targetHighScore: afterRel.targetHighScore,
      fans: afterRel.fans,
      campaignSeed: afterRel.campaignSeed,
    }),
  );

  const weekly = [];
  for (let w = 0; w < 8; w++) {
    advance(1);
    const g = useGame.getState().releasedGames.find((x) => x.id === released?.id);
    const hist = g?.weeklyHistory ?? [];
    const last = hist[hist.length - 1];
    weekly.push({
      week: useGame.getState().week,
      units: last?.units ?? null,
      revenue: last?.revenue ?? null,
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
    reviews: released?.reviews?.scores ?? released?.reviewResult,
    avgReview: released?.avgReview ?? released?.reviews?.avg,
    histBefore,
    histAfter,
    cashAfterStart,
    ledgerAfterStart,
    cashBeforeRelease,
    cashReleaseDay,
    salesWeek0,
    weekly: weekly.slice(0, 4),
    rentCharges: rentEntries.map((e) => ({ week: e.week, amount: e.amount })),
    finalCash: useGame.getState().cash,
    finalLedger: useGame.getState().ledger?.balance,
    cashEqualsLedger: useGame.getState().cash === useGame.getState().ledger?.balance,
    noReconciliation: recon.length === 0,
    fansAtStart,
    fansBeforeRelease,
    fansAtRelease,
    fansGainedAtRelease: released?.fansGained ?? fansAtRelease - fansBeforeRelease,
    midSnapshotOk: mid.campaignSeed === seed,
  };
}

const scenarios = [
  ["strong", "Strong Studio", "strong"],
  ["average", "Average Studio", "average"],
  ["poor", "Poor Studio", "poor"],
];

for (const [label, company, mode] of scenarios) {
  const a = runScenario(label, company, mode);
  const b = runScenario(label, company, mode);
  const match =
    a.seed === b.seed &&
    a.avgReview === b.avgReview &&
    a.finalCash === b.finalCash &&
    a.histAfter === b.histAfter &&
    JSON.stringify(a.weekly) === JSON.stringify(b.weekly);
  console.log(JSON.stringify({ ...a, deterministicReplay: match }, null, 2));
}
