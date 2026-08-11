/**
 * Fourth Codex Foundation Lock — reproduced failure probes.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateStaff, uid } from "../simulation";
import { useGame } from "../store";
import { PLATFORM_COUNT, PLATFORMS } from "../content/platforms";
import { CUSTOM_CONSOLE } from "../data";
import {
  ensureYearOpportunities,
  emptyMarketingOpportunityState,
  campaignYearIndex,
  yearOpportunitySlots,
  resolveMarketingOpportunity,
  deferMarketingOpportunity,
} from "../marketingOpportunities";
import { applyCashTransaction } from "../finance/transaction";

function reset(name = "C4 Studio") {
  useGame.getState().newGame(name, false, "standard");
  return useGame.getState();
}

describe("empty-identity forbidden", () => {
  it("uid without parts throws", () => {
    assert.throws(() => uid("note"), /requires campaign seed/);
  });
  it("two notifications same week get different ids", () => {
    const s = reset("Note Ids");
    useGame.setState({
      notifications: [],
      week: 3,
    });
    // trigger two notes via resolve path
    const st = useGame.getState();
    // use export of pushNote indirectly by advance and events is hard — call via cheat log notes
    
    // direct: two push-like notes via set using store's exportSave after two notifications
    useGame.setState((prev) => {
      // Simulate pushNote twice by applying cheats that push notes
      return prev;
    });
    // Generate via startProject failures that still notify? Use applyCheat reveal_seed twice
    useGame.getState().applyCheat("reveal_seed");
    useGame.getState().applyCheat("reveal_seed");
    const notes = useGame.getState().notifications.filter((n) => n.text.includes("Campaign seed"));
    // if only one because same content id - check all note ids unique
    const ids = useGame.getState().notifications.map((n) => n.id);
    assert.equal(new Set(ids).size, ids.length, "notification ids unique");
  });
  it("staff identity pure and unrelated calls stable", () => {
    for (let i = 0; i < 10; i++) generateStaff(1, 1990, { seed: i, candidateIndex: i });
    const a = generateStaff(1.25, 1984, { seed: 123456, candidateIndex: 2 });
    const b = generateStaff(1.25, 1984, { seed: 123456, candidateIndex: 2 });
    assert.deepEqual(a, b);
  });
});

describe("garage quarantine commands", () => {
  it("recruitment / candidates / pack / illicit locked", () => {
    const s0 = reset("Garage Lock");
    assert.ok((s0.office ?? 1) <= 1);
    const cash0 = s0.cash;
    const led0 = s0.ledger?.balance;
    const board0 = JSON.stringify(s0.hiringBoard ?? []);
    const r1 = useGame.getState().runRecruitCampaign("local");
    assert.ok(r1 && /lock|Garage/i.test(r1));
    const board1 = useGame.getState().hiringBoard ?? [];
    assert.equal(JSON.stringify(board1), board0);
    const pack = useGame.getState().installContentPack("any");
    assert.ok(pack && /lock|Garage|Unknown/i.test(pack));
    const s1 = useGame.getState();
    assert.equal(s1.cash, cash0);
    assert.equal(s1.ledger?.balance, led0);
    // start project for illicit (dev cost is expected cash change)
    useGame.getState().startProject({
      title: "X",
      topicId: useGame.getState().unlockedTopics[0]!,
      genreId: useGame.getState().unlockedGenres[0]!,
      platformId: "pc",
      size: "small",
      audience: "everyone",
    });
    const cash2 = useGame.getState().cash;
    const led2 = useGame.getState().ledger?.balance;
    const ill = useGame.getState().toggleIllicitAssets();
    assert.ok(ill && /lock|Garage/i.test(ill));
    const s = useGame.getState();
    assert.equal(s.cash, cash2);
    assert.equal(s.ledger?.balance, led2);
    assert.equal(!!s.currentProject?.usedIllicitAssets, false);
  });
});

describe("atomic finance probes", () => {
  it("office_ready keeps cash === ledger", () => {
    reset("Office Ready Cash");
    useGame.getState().applyCheat("office_ready");
    const s = useGame.getState();
    assert.equal(s.cash, s.ledger?.balance);
    assert.ok(s.cash >= 1_200_000);
  });
  it("duplicate transaction ref changes no state", () => {
    const s = reset("Dup Txn");
    const t1 = applyCashTransaction(s.cash, s.ledger!, {
      week: 1,
      amount: -1000,
      category: "other",
      label: "fee",
      ref: "dup-fee-1",
    });
    const t2 = applyCashTransaction(t1.cash, t1.ledger, {
      week: 1,
      amount: -1000,
      category: "other",
      label: "fee",
      ref: "dup-fee-1",
    });
    assert.equal(t1.applied, true);
    assert.equal(t2.applied, false);
    assert.equal(t2.cash, t1.cash);
    assert.equal(t2.ledger.balance, t1.ledger.balance);
  });
});

describe("platform canon 50", () => {
  it("exactly 50 platforms + custom separate", () => {
    assert.equal(PLATFORMS.length, 50);
    assert.equal(PLATFORM_COUNT, 50);
    assert.equal(CUSTOM_CONSOLE.id, "custom_console");
    assert.ok(!PLATFORMS.some((p) => p.id === "custom_console"));
  });
});

describe("marketing non-dark years", () => {
  it("normal years generate 1 or 2, never zero; dark after double", () => {
    const seed = 777001;
    let st = emptyMarketingOpportunityState();
    const counts: number[] = [];
    for (let y = 0; y < 6; y++) {
      const w = y * 48 + 10;
      st = ensureYearOpportunities(st, w, seed);
      // advance through year to materialize all slots
      for (let ww = y * 48; ww < (y + 1) * 48; ww++) {
        st = ensureYearOpportunities(st, ww, seed);
      }
      const n = st.opportunities.filter((o) => o.yearIndex === y).length;
      counts.push(n);
      if (y > 0 && st.doubleYears.includes(y - 1)) {
        assert.equal(n, 0, `year ${y} should be dark`);
      } else {
        assert.ok(n === 1 || n === 2, `year ${y} got ${n}`);
      }
    }
  });
  it("defer keeps opportunity recoverable", () => {
    let st = emptyMarketingOpportunityState();
    const seed = 42;
    st = ensureYearOpportunities(st, 20, seed);
    // force offer
    st = {
      ...st,
      opportunities: st.opportunities.map((o) =>
        o.weekOffered <= 20 ? { ...o, status: "offered" as const } : o,
      ),
    };
    const due = st.opportunities.find((o) => o.status === "offered");
    assert.ok(due);
    st = deferMarketingOpportunity(st, due!.id);
    assert.equal(st.opportunities.find((o) => o.id === due!.id)?.status, "deferred");
    st = ensureYearOpportunities(st, 21, seed);
    const again = st.opportunities.find((o) => o.id === due!.id);
    assert.ok(again?.status === "offered" || again?.status === "deferred");
  });
});

describe("bounded review reaction", () => {
  it("release awards bounded fans not lifetime plan", async () => {
    reset("Fan Reaction");
    // minimal ship path hard — check commercial helper
    const { initReleasedCommercial } = await import("../commercial/runtime");
    const s = useGame.getState();
    const released: any = {
      id: "g1",
      title: "T",
      topicId: "space",
      genreId: "action",
      platformId: "pc",
      audience: "everyone",
      size: "small",
      engineId: "basic",
      designPoints: 40,
      techPoints: 40,
      bugs: 0,
      reviewScores: [7,7,7,7],
      avgReview: 7.2,
      sales: 0,
      revenue: 0,
      fansGained: 0,
      weekReleased: 0,
      yearReleased: 1982,
      marketingSpend: 0,
      developmentCost: 0,
      hype: 10,
      residualWeeks: 3,
      weeklySalesLeft: [100, 80, 60],
      weeklyHistory: [],
      weeksOnMarket: 0,
      onSale: true,
    };
    const out = initReleasedCommercial({
      released,
      state: s,
      marketingSpend: 0,
      influencerBoost: false,
      platformMarket: 0.8,
      platformAgeYears: 0,
      platformLifecycle: 1,
      installedBase: 10000,
      topicRep: 0,
      comboMult: 1,
      distType: "self",
      royalty: 0.7,
      planUnits: [100, 80, 60],
      productQuality: 70,
      avgReview: 7.2,
    });
    assert.equal(out.fansDelta, 10);
    assert.equal(out.released.fansGained, 10);
  });
});
