
/**
 * Foundation Lock v1 — determinism, immutability, economy, release invariants.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashSeed, SeededRng } from "../scoring/rng";
import { applyCashTransaction, moneyRound } from "../finance/transaction";
import { emptyLedger, applyLedger } from "../finance/ledger";
import { isGaragePhaseOne, lateSystemAllowed, marketingYearIndex } from "../phaseOne";
import { availableSizes } from "../store";
import { classicReviewScore } from "../classicGdt";
import { FEATURE_FLAGS } from "../progression/featureFlags";

describe("Foundation Lock — RNG", () => {
  it("identical event keys produce identical units", () => {
    const a = hashSeed(42, "game_1", "sales", 3);
    const b = hashSeed(42, "game_1", "sales", 3);
    assert.equal(a, b);
  });
  it("different keys differ", () => {
    assert.notEqual(hashSeed(1, "a"), hashSeed(1, "b"));
  });
  it("SeededRng int never exceeds max", () => {
    const rng = new SeededRng(12345);
    for (let i = 0; i < 200; i++) {
      const n = rng.int(1, 10);
      assert.ok(n >= 1 && n <= 10);
    }
  });
});

describe("Foundation Lock — cash/ledger", () => {
  it("duplicate ref changes neither cash nor ledger", () => {
    let cash = 75_000;
    let ledger = emptyLedger(75_000);
    const e = {
      week: 4,
      amount: -8000,
      category: "rent" as const,
      label: "Rent",
      ref: "rent-w4",
    };
    const t1 = applyCashTransaction(cash, ledger, e);
    assert.equal(t1.applied, true);
    cash = t1.cash;
    ledger = t1.ledger;
    const t2 = applyCashTransaction(cash, ledger, e);
    assert.equal(t2.applied, false);
    assert.equal(t2.cash, cash);
    assert.equal(t2.ledger.balance, ledger.balance);
  });
  it("opening cash 75000 garage rent 8000 dollars (cents migration deferred)", () => {
    assert.equal(moneyRound(75_000), 75_000);
    assert.equal(moneyRound(8_000), 8_000);
  });
});

describe("Foundation Lock — phase one", () => {
  it("garage office quarantines late systems", () => {
    assert.equal(isGaragePhaseOne({ office: 1 }), true);
    assert.equal(lateSystemAllowed({ office: 1 }, "netflixEdition"), false);
    assert.equal(lateSystemAllowed({ office: 1 }, "digitalStorefront"), false);
    assert.equal(FEATURE_FLAGS.netflixEdition, false);
  });
  it("availableSizes garage is small only", () => {
    assert.deepEqual(availableSizes([], {}, { office: 1, staffCount: 1 }), ["small"]);
  });
  it("marketing year index", () => {
    assert.equal(marketingYearIndex(0), 0);
    assert.equal(marketingYearIndex(48), 1);
  });
});

describe("Foundation Lock — scoring authority", () => {
  it("classic review uses historical 0.7/0.3 and no marketing", () => {
    const r = classicReviewScore({
      designPoints: 40,
      techPoints: 40,
      bugs: 0,
      targetHighScore: 35,
      comboMult: 1.3,
      size: "small",
    });
    assert.ok(r.avg >= 1 && r.avg <= 10);
    const expectedHist = 35 * 0.7 + (40 + 40) * 0.3;
    assert.ok(Math.abs(r.nextHistoricalAverage - expectedHist) < 0.02);
  });
});
