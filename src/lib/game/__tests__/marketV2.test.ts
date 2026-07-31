import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { initMarket } from "../market/init";
import { tickMarket } from "../market/tick";
import { competitionModifierFor, type CompetitorRef } from "../market/competition";
import { releaseOverlap } from "../market/competition";

describe("market V2", () => {
  it("identical seeds produce identical rivals and platforms", () => {
    const a = initMarket(424242, 0);
    const b = initMarket(424242, 0);
    assert.equal(a.rivals.length, 6);
    assert.deepEqual(
      a.rivals.map((r) => r.name),
      b.rivals.map((r) => r.name),
    );
    assert.deepEqual(
      a.platforms.map((p) => p.id),
      b.platforms.map((p) => p.id),
    );
    assert.equal(a.platforms[0]!.activeUsers, b.platforms[0]!.activeUsers);
  });

  it("different seeds differ", () => {
    const a = initMarket(1, 0);
    const b = initMarket(99991, 0);
    const namesA = a.rivals.map((r) => r.name).join();
    const namesB = b.rivals.map((r) => r.name).join();
    assert.notEqual(namesA, namesB);
  });

  it("market tick is deterministic", () => {
    let m1 = initMarket(77, 0);
    let m2 = initMarket(77, 0);
    for (let w = 1; w <= 30; w++) {
      const r1 = tickMarket({
        market: m1,
        campaignSeed: 77,
        week: w,
        year: 1982,
        playerGamesOnSale: [],
      });
      const r2 = tickMarket({
        market: m2,
        campaignSeed: 77,
        week: w,
        year: 1982,
        playerGamesOnSale: [],
      });
      m1 = r1.market;
      m2 = r2.market;
    }
    assert.deepEqual(
      m1.rivals.map((r) => ({ id: r.id, cash: Math.round(r.cash), status: r.status })),
      m2.rivals.map((r) => ({ id: r.id, cash: Math.round(r.cash), status: r.status })),
    );
    assert.equal(m1.trends[0]!.momentum, m2.trends[0]!.momentum);
  });

  it("similar releases compete more than unrelated", () => {
    const base: CompetitorRef = {
      id: "a",
      genreId: "action",
      platformId: "pc",
      topicId: "military",
      size: "small",
      releaseWeek: 10,
      awareness: 0.5,
      avgReview: 7,
      marketingSpend: 10000,
    };
    const similar: CompetitorRef = {
      ...base,
      id: "b",
      topicId: "military",
      releaseWeek: 11,
    };
    const unrelated: CompetitorRef = {
      id: "c",
      genreId: "casual",
      platformId: "commodore",
      topicId: "farming",
      size: "small",
      releaseWeek: 11,
      awareness: 0.5,
      avgReview: 7,
      marketingSpend: 10000,
    };
    assert.ok(releaseOverlap(base, similar) > releaseOverlap(base, unrelated));
    const modSimilar = competitionModifierFor(base, [base, similar], 10);
    const modUnrelated = competitionModifierFor(base, [base, unrelated], 10);
    assert.ok(modSimilar < modUnrelated);
  });

  it("rivals take time and money to develop", () => {
    let m = initMarket(55, 0);
    const cash0 = m.rivals.reduce((s, r) => s + r.cash, 0);
    for (let w = 1; w <= 20; w++) {
      m = tickMarket({
        market: m,
        campaignSeed: 55,
        week: w,
        year: 1982,
        playerGamesOnSale: [],
      }).market;
    }
    const anyProject = m.rivals.some((r) => r.activeProject || r.releaseHistory.length > 0);
    assert.ok(anyProject, "rivals should start projects");
    // cash should have moved (spend or earn)
    const cash1 = m.rivals.reduce((s, r) => s + r.cash, 0);
    assert.notEqual(Math.round(cash0), Math.round(cash1));
  });

  it("unannounced projects stay off public calendar", () => {
    let m = initMarket(12, 0);
    for (let w = 1; w <= 25; w++) {
      m = tickMarket({
        market: m,
        campaignSeed: 12,
        week: w,
        year: 1982,
        playerGamesOnSale: [],
      }).market;
    }
    for (const r of m.rivals) {
      const p = r.activeProject;
      if (p && !p.announced) {
        const onCal = m.calendar.some((c) => c.entityId === p.id && c.public);
        assert.equal(onCal, false);
      }
    }
  });

  it("installed base and active users are separate", () => {
    const m = initMarket(3, 0);
    for (const p of m.platforms) {
      assert.ok(p.installedBase >= p.activeUsers - 1);
    }
  });

  it("trends stay within bounds after many ticks", () => {
    let m = initMarket(8, 0);
    for (let w = 1; w <= 80; w++) {
      m = tickMarket({
        market: m,
        campaignSeed: 8,
        week: w,
        year: 1982 + Math.floor(w / 48),
        playerGamesOnSale: [],
      }).market;
    }
    for (const t of m.trends) {
      assert.ok(t.momentum >= 0.72 && t.momentum <= 1.35);
      assert.ok(t.saturation >= 0 && t.saturation <= 1);
    }
  });
});
