/**
 * Real Garage campaign traces — production algorithm + classic scoring + rent/sales ledger.
 * node --import tsx scripts/foundation-campaign-trace.mjs
 */
import { classicReviewScore, classicUnitsSold } from "../src/lib/game/classicGdt.ts";
import { emptyLedger } from "../src/lib/game/finance/ledger.ts";
import { applyCashTransaction } from "../src/lib/game/finance/transaction.ts";
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
  PHASE_POLISH,
  PHASE_FINALIZE_BUILD,
  PHASE_BUG_FIXING,
  PHASE_PLANNING,
} from "../src/lib/game/production/algorithm.ts";
import { hashSeed } from "../src/lib/game/scoring/rng.ts";

function runCampaign(label, seed, design, tech, level, sliderFlat) {
  const founder = founderFromStaff([{ design, tech, speed: 50, level, bugFixBonus: 0 }]);
  let state = createProductionState(`g-${label}`, String(seed), 0, "small");
  for (const stage of [1, 2, 3]) {
    state = { ...state, currentStage: stage, phase: PHASE_PLANNING };
    const discs = STAGE_DISCIPLINES[stage];
    const raw = Object.fromEntries(
      discs.map((d, i) => [d, sliderFlat ? 33 : 25 + (hashSeed(seed, stage, i, d) % 50)]),
    );
    state = planStage(state, {
      stage,
      rawIntent: raw,
      demand: defaultStageDemand(stage),
      size: "small",
    });
    let guard = 0;
    while (state.phase === "developing" && guard++ < 8000) {
      state = advanceDevelopmentDay(state, { day: state.asOfDay + 1, founder }).state;
    }
  }
  let guard = 0;
  while (state.phase === PHASE_POLISH && guard++ < 3000) {
    state = advancePolishDay(state, { day: state.asOfDay + 1, founder }).state;
  }
  if (state.phase === PHASE_FINALIZE_BUILD) state = finalizeBuild(state);
  guard = 0;
  while (state.phase === PHASE_BUG_FIXING && guard++ < 5000) {
    state = advanceBugFixingDay(state, { day: state.asOfDay + 1, founder }).state;
  }

  const openBugs = (state.bugs ?? []).filter((b) => (b.remainingWork ?? 0) > 0).length;
  const weeksProd = Math.ceil(state.asOfDay / 7);
  const designPts = Math.round(20 + design * 0.55 + (hashSeed(seed, "d") % 15));
  const techPts = Math.round(18 + tech * 0.55 + (hashSeed(seed, "t") % 12));
  const combo = label === "strong" ? 1.3 : label === "poor" ? 0.7 : 1.0;
  const hist0 = 35;
  const review = classicReviewScore({
    designPoints: designPts,
    techPoints: techPts,
    bugs: openBugs + (label === "poor" ? 12 : label === "average" ? 4 : 1),
    targetHighScore: hist0,
    comboMult: combo,
    size: "small",
    sliderMiss: sliderFlat ? 0.4 : 0.05,
  });
  const sales = classicUnitsSold({
    designPoints: designPts,
    techPoints: techPts,
    reviewScore: review.avg,
    size: "small",
    platformMarket: 1,
    comboMult: combo,
    hype: label === "strong" ? 40 : label === "poor" ? 0 : 12,
    fans: 0,
    marketingSpend: 0,
  });

  let cash = 75000;
  let ledger = emptyLedger(75000);
  const weekly = [];
  let fans = review.avg >= 8.5 ? 25 : review.avg >= 7 ? 10 : review.avg >= 5.5 ? 0 : -5;
  // Dev period rent
  for (let w = 1; w <= weeksProd; w++) {
    if (w % 4 === 0) {
      const t = applyCashTransaction(cash, ledger, {
        week: w,
        amount: -8000,
        category: "rent",
        label: "Monthly office rent",
        ref: `rent-w${w}`,
      });
      cash = t.cash;
      ledger = t.ledger;
    }
  }
  // Market weeks — release at weeksProd, sales start next week
  const marketWeeks = sales.weekly.length;
  for (let mi = 0; mi < marketWeeks; mi++) {
    const w = weeksProd + 1 + mi;
    if (w % 4 === 0) {
      const t = applyCashTransaction(cash, ledger, {
        week: w,
        amount: -8000,
        category: "rent",
        label: "Monthly office rent",
        ref: `rent-w${w}`,
      });
      cash = t.cash;
      ledger = t.ledger;
    }
    const units = sales.weekly[mi] ?? 0;
    const rev = units * sales.price * 0.85;
    const t = applyCashTransaction(cash, ledger, {
      week: w,
      amount: rev,
      category: "sales",
      label: "Weekly sales",
      ref: `sales-${label}-w${w}`,
    });
    cash = t.cash;
    ledger = t.ledger;
    const fanDelta = units * 0.04 * ((review.avg - 5.5) / 4.5);
    fans = Math.max(0, fans + fanDelta);
    if (mi < 4) {
      weekly.push({
        marketWeek: mi + 1,
        units,
        rev: Math.round(rev * 100) / 100,
        fanDelta: Math.round(fanDelta * 10) / 10,
        cash: Math.round(cash * 100) / 100,
        ledger: Math.round(ledger.balance * 100) / 100,
      });
    }
  }

  return {
    label,
    seed,
    weeksProd,
    designPts,
    techPts,
    bugs: openBugs + (label === "poor" ? 12 : label === "average" ? 4 : 1),
    review: review.avg,
    hist0,
    hist1: review.nextHistoricalAverage,
    reviewReactionFans: review.avg >= 8.5 ? 25 : review.avg >= 7 ? 10 : review.avg >= 5.5 ? 0 : -5,
    totalUnits: sales.totalUnits,
    weekly,
    finalFans: Math.round(fans),
    finalCash: Math.round(cash * 100) / 100,
    finalLedger: Math.round(ledger.balance * 100) / 100,
    cashEqualsLedger: Math.abs(cash - ledger.balance) < 0.02,
  };
}

const scenarios = [
  ["strong", 1001, 62, 58, 3, false],
  ["average", 2002, 48, 46, 2, false],
  ["poor", 3003, 38, 36, 1, true],
];

for (const args of scenarios) {
  const a = runCampaign(...args);
  const b = runCampaign(...args);
  const match = JSON.stringify(a) === JSON.stringify(b);
  console.log(JSON.stringify({ ...a, deterministicReplay: match }, null, 2));
}
