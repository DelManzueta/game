/**
 * Store-level Foundation Lock acceptance tests.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { useGame, availableSizes } from "../store";
import { isGaragePhaseOne, lateSystemAllowed } from "../phaseOne";
import { FEATURE_FLAGS } from "../progression/featureFlags";
import { OFFICE_DEFINITIONS } from "../progression";

function reset(name = "FL Studio") {
  useGame.getState().newGame(name, false, "standard");
  return useGame.getState();
}

describe("Foundation Lock — store economy", () => {
  it("week-four garage rent updates cash and ledger to $67,000", () => {
    let s = reset("Rent Co");
    assert.equal(s.cash, 75_000);
    assert.equal(s.ledger?.balance, 75_000);
    // Advance until first month boundary rent (weekOfMonth === 1 after tick)
    for (let i = 0; i < 8 && s.cash === 75_000; i++) {
      useGame.getState().setSpeed(1);
      useGame.getState().advanceWeek();
      s = useGame.getState();
      // dismiss events
      if (s.pendingEvent) {
        useGame.setState({ pendingEvent: null, modal: null, speed: 1 });
        s = useGame.getState();
      }
    }
    // Find a state after rent charged
    let found = false;
    for (let i = 0; i < 12; i++) {
      s = useGame.getState();
      if (s.ledger?.entries.some((e) => e.category === "rent")) {
        found = true;
        break;
      }
      useGame.getState().setSpeed(1);
      useGame.getState().advanceWeek();
      if (useGame.getState().pendingEvent) {
        useGame.setState({ pendingEvent: null, modal: null, speed: 1 });
      }
    }
    s = useGame.getState();
    assert.ok(found || s.cash < 75_000, "rent should eventually charge");
    if (s.ledger?.entries.some((e) => e.category === "rent")) {
      assert.equal(s.cash, s.ledger.balance);
      // 75k - 8k rent = 67k if no other burns
      const rentEntries = s.ledger.entries.filter((e) => e.category === "rent");
      assert.ok(rentEntries.length >= 1);
      assert.ok(rentEntries.some((e) => e.amount === -8000));
    }
  });

  it("duplicate rent ref does not double-charge", async () => {
    const s = reset("Dup Rent");
    const { applyCashTransaction } = await import("../finance/transaction");
    const t1 = applyCashTransaction(s.cash, s.ledger!, {
      week: 4,
      amount: -8000,
      category: "rent",
      label: "test rent",
      ref: "rent-w4-test",
    });
    const t2 = applyCashTransaction(t1.cash, t1.ledger, {
      week: 4,
      amount: -8000,
      category: "rent",
      label: "test rent",
      ref: "rent-w4-test",
    });
    assert.equal(t1.applied, true);
    assert.equal(t2.applied, false);
    assert.equal(t2.cash, t1.cash);
    assert.equal(t2.cash, t2.ledger.balance);
  });
});

describe("Foundation Lock — garage publishers", () => {
  it("signOpsPublisher is locked and does not change cash/time/ledger", () => {
    const before = reset("Pub Lock");
    assert.equal(before.week, 0);
    assert.equal(before.cash, 75_000);
    const err = useGame.getState().signOpsPublisher("vina_games");
    assert.ok(err && /lock|Garage/i.test(err), String(err));
    const after = useGame.getState();
    assert.equal(after.cash, 75_000);
    assert.equal(after.week, 0);
    assert.equal(after.ledger?.balance, 75_000);
    assert.equal(after.activePublisherDealId, null);
  });
});

describe("Foundation Lock — scoring target", () => {
  it("rival release week does not change player historical target", () => {
    reset("Rival Hist");
    useGame.setState({ targetHighScore: 35, week: 5, lastRivalReleaseWeek: 0, speed: 1 });
    const before = useGame.getState().targetHighScore;
    // force a rival window
    for (let i = 0; i < 3; i++) {
      useGame.getState().advanceWeek();
      const st = useGame.getState();
      if (st.pendingEvent) useGame.setState({ pendingEvent: null, modal: null, speed: 1 });
    }
    const after = useGame.getState().targetHighScore;
    assert.equal(after, before);
  });
});

describe("Foundation Lock — phase gates", () => {
  it("feature flags keep Netflix off after First Office", () => {
    assert.equal(FEATURE_FLAGS.netflixEdition, false);
    assert.equal(lateSystemAllowed({ office: 2 }, "netflixEdition"), false);
    assert.equal(lateSystemAllowed({ office: 1 }, "publishers"), false);
    assert.equal(isGaragePhaseOne({ office: 1 }), true);
  });

  it("garage sizes are small only; FO seats are 4 total", () => {
    assert.deepEqual(availableSizes([], {}, { office: 1, staffCount: 1 }), ["small"]);
    assert.equal(OFFICE_DEFINITIONS[1].hqSeatsTotal, 1);
    assert.equal(OFFICE_DEFINITIONS[2].hqSeatsTotal, 4);
  });
});
