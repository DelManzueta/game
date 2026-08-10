/**
 * Second Codex Foundation Lock — store-level regression tests.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateStaff } from "../simulation";
import { hashSeed } from "../scoring/rng";
import {
  emptyMarketingOpportunityState,
  ensureYearOpportunities,
  resolveMarketingOpportunity,
  campaignYearIndex,
} from "../marketingOpportunities";
import { useGame } from "../store";
import { lateSystemAllowed } from "../phaseOne";
import { applyCashTransaction } from "../finance/transaction";
import { emptyLedger } from "../finance/ledger";
import { TOPIC_COUNT, TOPICS } from "../content/topics";

describe("identity purity", () => {
  it("same staff seed+index yields identical complete candidate twice", () => {
    const a = generateStaff(1.25, 1984, { seed: 123456, candidateIndex: 2 });
    const b = generateStaff(1.25, 1984, { seed: 123456, candidateIndex: 2 });
    assert.deepEqual(a, b);
  });
  it("unrelated generations do not change a fixed identity", () => {
    for (let i = 0; i < 20; i++) generateStaff(1, 1990, { seed: 1, candidateIndex: i });
    const a = generateStaff(1.25, 1984, { seed: 123456, candidateIndex: 2 });
    const b = generateStaff(1.25, 1984, { seed: 123456, candidateIndex: 2 });
    assert.deepEqual(a, b);
  });
});

describe("canonical topics", () => {
  it("exactly 132 topics", () => {
    assert.equal(TOPIC_COUNT, 132);
    assert.equal(TOPICS.length, 132);
  });
});

describe("marketing opportunities machine", () => {
  it("promotes scheduled→offered and dark year after double generate", () => {
    let st = emptyMarketingOpportunityState();
    st = ensureYearOpportunities(st, 0, 42);
    assert.ok(st.opportunities.length >= 1);
    // week 8: first due
    st = ensureYearOpportunities(st, 8, 42);
    const due = st.opportunities.find((o) => o.weekOffered === 8);
    assert.equal(due?.status, "offered");
    // generate both year-0 slots
    st = ensureYearOpportunities(st, 28, 42);
    assert.equal(st.opportunities.filter((o) => o.yearIndex === 0).length, 2);
    assert.ok(st.doubleYears.includes(0));
    // year 1 dark
    const y1 = ensureYearOpportunities(st, 48 + 8, 42);
    assert.equal(y1.opportunities.filter((o) => o.yearIndex === 1).length, 0);
    // resolve once
    const opp = st.opportunities.find((o) => o.status === "offered")!;
    const r1 = resolveMarketingOpportunity(st, opp.id, "low");
    assert.ok(!("error" in r1));
    const r2 = resolveMarketingOpportunity(r1.state, opp.id, "low");
    assert.ok("error" in r2);
  });
});

describe("garage quarantine commands", () => {
  it("launchAccessory locked in garage", () => {
    useGame.getState().newGame("HW Lock", false, "standard");
    const before = useGame.getState().cash;
    const err = useGame.getState().launchAccessory("apparel", "Hat", 19.99);
    assert.ok(err && /lock|Garage/i.test(err ?? ""), String(err));
    assert.equal(useGame.getState().cash, before);
    assert.equal((useGame.getState().hardwareProducts ?? []).length, 0);
  });

  it("legacy hardware does not sell in garage", () => {
    useGame.getState().newGame("HW Inert", false, "standard");
    useGame.setState({
      hardwareProducts: [
        {
          id: "legacy1",
          name: "Ghost Pad",
          categoryId: "gamepad",
          qualityTier: "standard",
          unitCost: 10,
          retailPrice: 40,
          setupCost: 0,
          remainingWeeks: 6,
          fabWeeksLeft: 0,
          workbenchMode: false,
          unitsSold: 0,
          revenue: 0,
        } as any,
      ],
      speed: 1,
    });
    const cash0 = useGame.getState().cash;
    useGame.getState().advanceWeek();
    if (useGame.getState().pendingEvent) {
      useGame.setState({ pendingEvent: null, modal: null, speed: 1 });
    }
    assert.equal(useGame.getState().cash, cash0); // no hardware revenue (rent may apply later)
    // if rent charged, still no units on hardware
    const hw = useGame.getState().hardwareProducts?.[0] as any;
    assert.equal(hw?.unitsSold ?? 0, 0);
  });

  it("signOpsPublisher locked at week 0", () => {
    useGame.getState().newGame("Pub", false, "standard");
    const err = useGame.getState().signOpsPublisher("vina_games");
    assert.ok(err);
    assert.equal(useGame.getState().cash, 75_000);
    assert.equal(useGame.getState().week, 0);
    assert.equal(useGame.getState().ledger?.balance, 75_000);
  });
});

describe("event cash atomicity", () => {
  it("Trade magazine press kit: 75000 → 74500 cash and ledger", () => {
    useGame.getState().newGame("Press", false, "standard");
    useGame.setState({
      pendingEvent: {
        id: "trade_mag",
        title: "Trade magazine",
        body: "test",
      },
      modal: "event",
      speed: 0,
    });
    useGame.getState().resolveEvent(0); // Send press kit
    const s = useGame.getState();
    assert.equal(s.cash, 74_500);
    assert.equal(s.ledger?.balance, 74_500);
    assert.ok(s.ledger?.entries.some((e) => e.amount === -500 && e.ref?.includes("trade_mag")));
  });
});

describe("hiring board persistence", () => {
  it("board survives setState JSON clone", () => {
    useGame.getState().newGame("Board", false, "standard");
    const board = useGame.getState().refreshCandidates();
    const json = JSON.parse(JSON.stringify(useGame.getState()));
    useGame.setState({
      ...json,
      // actions lost — re-get board from state field
      hiringBoard: json.hiringBoard,
    } as any);
    assert.deepEqual(useGame.getState().hiringBoard, board);
    const again = useGame.getState().refreshCandidates();
    assert.notDeepEqual(again.map((c) => c.id), board.map((c) => c.id));
  });
});

describe("feature flags gate after office 2", () => {
  it("netflix still false at office 2", () => {
    assert.equal(lateSystemAllowed({ office: 2 }, "netflixEdition"), false);
    assert.equal(lateSystemAllowed({ office: 2 }, "hardwareMerch"), false);
    assert.equal(lateSystemAllowed({ office: 2 }, "streamerMarketing"), false);
  });
});

describe("rent exact", () => {
  it("first month rent is -8000 and cash/ledger 67000 with no recon", () => {
    useGame.getState().newGame("RentExact", false, "standard");
    // Advance weeks until rent entry appears (weekOfMonth===1)
    for (let i = 0; i < 8; i++) {
      useGame.getState().setSpeed(1);
      useGame.getState().advanceWeek();
      const st = useGame.getState();
      if (st.pendingEvent) {
        useGame.setState({ pendingEvent: null, modal: null, speed: 1 });
      }
      if (st.ledger?.entries.some((e) => e.category === "rent")) break;
    }
    const s = useGame.getState();
    const rents = (s.ledger?.entries ?? []).filter((e) => e.category === "rent");
    assert.equal(rents.length, 1);
    assert.equal(rents[0]!.amount, -8000);
    assert.equal(s.cash, 67_000);
    assert.equal(s.ledger!.balance, 67_000);
    assert.ok(!(s.ledger?.entries ?? []).some((e) => e.label === "Balance reconciliation"));
  });
});
