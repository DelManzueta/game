/**
 * Authoritative Garage campaign traces via Zustand store commands only.
 * node --import tsx scripts/foundation-campaign-trace.mjs
 */
import { useGame } from "../src/lib/game/store.ts";
import { STAGE_FIELDS } from "../src/lib/game/data.ts";

function dismissBlocks() {
  const s = useGame.getState();
  if (s.pendingEvent) {
    // prefer "pass" / cheapest choice when marketing
    useGame.getState().resolveEvent(0);
  }
  if (useGame.getState().modal === "event") {
    useGame.setState({ modal: null, pendingEvent: null, speed: 1 });
  }
}

function advance(n = 1) {
  for (let i = 0; i < n; i++) {
    useGame.getState().setSpeed(1);
    const err = useGame.getState().advanceWeek();
    dismissBlocks();
    // polish path
    const p = useGame.getState().currentProject;
    if (p?.devPhase === "POLISHING" || p?.production?.phase === "bug_fixing") {
      useGame.getState().workPolishWeek();
      dismissBlocks();
    }
  }
}

function setStageSliders(mode) {
  const p = useGame.getState().currentProject;
  if (!p) return;
  const fields = STAGE_FIELDS[p.stage] ?? STAGE_FIELDS[1];
  for (const f of fields) {
    const v =
      mode === "strong" ? (f.includes("game") || f === "engine" || f === "graphics" ? 80 : 40)
      : mode === "poor" ? 33
      : 50;
    useGame.getState().setSlider(f, v);
  }
}

function runScenario(label, company, mode) {
  useGame.getState().newGame(company, false, "standard");
  // Ensure garage topics usable for scripted campaigns
  useGame.setState({
    unlockedTopics: ["space", "fantasy", "racing", "dungeon", "comedy", "military"],
    unlockedGenres: ["action", "adventure", "rpg", "simulation", "strategy", "casual"],
    unlockedPlatforms: ["pc", "itara_5200"],
  });
  const seed = useGame.getState().campaignSeed;
  const histBefore = useGame.getState().targetHighScore;

  const startErr = useGame.getState().startProject({
    title: `${label} Title`,
    topicId: mode === "poor" ? "comedy" : mode === "average" ? "racing" : "space",
    genreId: mode === "poor" ? "strategy" : "action",
    platformId: "pc",
    size: "small",
    audience: "everyone",
  });
  if (startErr) throw new Error(String(startErr));

  const projectId = useGame.getState().currentProject?.id;
  const projectSeed = useGame.getState().currentProject?.rngSeed;
  const cashAfterStart = useGame.getState().cash;
  const ledgerAfterStart = useGame.getState().ledger?.balance;

  // Stage 1-3
  for (let stage = 1; stage <= 3; stage++) {
    let guard = 0;
    while (guard++ < 80) {
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
        p.production?.phase === "finalize_build"
      ) {
        break;
      } else if (p.devPhase === "READY_TO_RELEASE") {
        break;
      } else {
        advance(1);
      }
      if (useGame.getState().currentProject?.stage !== stage && stage < 3) {
        // advanced
      }
      const ph = useGame.getState().currentProject?.devPhase;
      if (ph === "STAGE_2_CONFIG" && stage === 1) break;
      if (ph === "STAGE_3_CONFIG" && stage === 2) break;
      if (ph === "POLISHING" || ph === "READY_TO_RELEASE") break;
    }
  }

  // Polish to ready
  let guard = 0;
  while (guard++ < 40) {
    const p = useGame.getState().currentProject;
    if (!p) break;
    if (p.devPhase === "READY_TO_RELEASE" || p.production?.phase === "release_ready") break;
    if (p.devPhase === "POLISHING" || p.production?.phase === "bug_fixing" || p.production?.phase === "polish") {
      useGame.getState().workPolishWeek();
      dismissBlocks();
    } else {
      advance(1);
    }
  }

  useGame.getState().enterPreRelease();
  dismissBlocks();
  const p = useGame.getState().currentProject;
  const designPts = p?.designPoints ?? p?.production?.completedStages?.length;
  const techPts = p?.techPoints;
  const bugs = p?.bugs ?? 0;
  const weekBeforeRelease = useGame.getState().week;
  const cashBeforeRelease = useGame.getState().cash;

  const relErr = useGame.getState().releaseGame();
  dismissBlocks();
  const afterRel = useGame.getState();
  const released = afterRel.releasedGames[0];
  const histAfter = afterRel.targetHighScore;
  const cashReleaseDay = afterRel.cash;
  const salesWeek0 = released?.sales ?? 0;

  // Midpoint serialize
  const mid = JSON.parse(JSON.stringify({
    week: afterRel.week,
    cash: afterRel.cash,
    ledger: afterRel.ledger,
    releasedGames: afterRel.releasedGames,
    targetHighScore: afterRel.targetHighScore,
    fans: afterRel.fans,
    campaignSeed: afterRel.campaignSeed,
  }));

  // Shelf weeks
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
  const recon = (useGame.getState().ledger?.entries ?? []).filter((e) => e.label === "Balance reconciliation");

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
    cashEqualsLedger: Math.abs(Math.round(useGame.getState().cash*100) - Math.round((useGame.getState().ledger?.balance ?? 0)*100)) <= 1,
    noReconciliation: recon.length === 0,
    fansGainedAtRelease: released?.fansGained,
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
  // Replay from same company name (deterministic seed from name)
  const b = runScenario(label, company, mode);
  const match =
    a.seed === b.seed &&
    a.avgReview === b.avgReview &&
    a.finalCash === b.finalCash &&
    a.histAfter === b.histAfter &&
    JSON.stringify(a.weekly) === JSON.stringify(b.weekly);
  console.log(JSON.stringify({ ...a, deterministicReplay: match }, null, 2));
}
