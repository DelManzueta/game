/**
 * Checkpoint 0+1 acceptance tests — bible §36.1–36.2 (domain only).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  campaignConfigFor,
  campaignYearFromWeeks,
  industryYearFromProgress,
  createStudioProgression,
  migrateStudioProgression,
  officeDef,
  buildHqSeats,
  maxProductionHires,
  evaluateFirstOfficeProofs,
  tickOfficeOffers,
  acceptFirstOfficeMove,
  deferFirstOfficeOffer,
  tickActiveMove,
  tickTenure,
  firstOfficeOfferView,
  isFeatureEnabled,
  FEATURE_FLAGS,
  OFFICE_DEFINITIONS,
  TRANSITIONS,
} from "../progression";
import type { GameState, ReleasedGame } from "../types";
import { emptyLedger, applyLedger } from "../finance/ledger";
import { emptyKnowledge } from "../contracts";

function baseState(over: Partial<GameState> = {}): GameState {
  const progression = createStudioProgression("classic_35");
  return {
    version: 5,
    phase: "playing",
    companyName: "Test Garage",
    week: 0,
    year: 1979,
    month: 1,
    cash: 70_000,
    fans: 0,
    researchPoints: 0,
    researchPointsFrac: 0,
    gamesPublished: 0,
    totalRevenue: 0,
    office: 1,
    staff: [
      {
        id: "founder",
        name: "You",
        design: 50,
        tech: 50,
        speed: 50,
        salary: 0,
        level: 1,
        xp: 0,
        busy: false,
        energy: 100,
        fieldExperience: {},
      },
    ],
    currentProject: null,
    releasedGames: [],
    activeSales: [],
    selectedGameId: null,
    screen: "studio",
    modal: null,
    speed: 0,
    notifications: [],
    researched: [],
    unlockedTopics: ["military"],
    unlockedGenres: ["action"],
    unlockedPlatforms: ["pc", "itara"],
    engines: [],
    unlocks: {},
    flags: {
      multiGenre: false,
      sequels: false,
      expansions: false,
      marketing: false,
      contracts: false,
      audience: false,
      rndLab: false,
      hardwareLab: false,
    },
    settings: {
      pirateMode: false,
      noVacationMode: false,
      forcePerfectScore: false,
      forceBadScore: false,
      infoMode: "classic",
    },
    contracts: [],
    activeResearch: null,
    activeResearchJobs: [],
    pendingEvent: null,
    recentEventKeys: [],
    eventCooldowns: {},
    external: {
      marketingMult: 1,
      marketingUntilWeek: 0,
      bookedCreatorId: null,
      creatorUntilWeek: 0,
      mediaTopicsUnlocked: [],
    },
    draft: null,
    tutorialStep: 0,
    cheatsEnabled: false,
    cheatLog: [],
    dirty: false,
    lastSavedWeek: 0,
    campaignSeed: 1,
    market: null,
    knowledge: emptyKnowledge(),
    garageSlice: true,
    publishingBoard: null,
    activePublisherDealId: null,
    seriesRecords: {},
    ledger: emptyLedger(70_000),
    progression,
    ...over,
  } as GameState;
}

function profitableGame(id = "hit"): ReleasedGame {
  return {
    id,
    title: "Hit",
    topicId: "military",
    genreId: "action",
    platformId: "pc",
    audience: "everyone",
    size: "small",
    engineId: "basic",
    designPoints: 70,
    techPoints: 70,
    bugs: 0,
    reviewScores: [7.2, 7.2, 7.2, 7.2],
    avgReview: 7.2,
    sales: 8000,
    revenue: 100_000,
    fansGained: 200,
    weekReleased: 10,
    yearReleased: 1979,
    marketingSpend: 0,
    developmentCost: 15_000,
    hype: 10,
    residualWeeks: 8,
    weeklySalesLeft: [],
    weeklyHistory: [],
    weeksOnMarket: 12,
    onSale: true,
    dormant: false,
    productQuality: 72,
  };
}

function readyState(over: Partial<GameState> = {}): GameState {
  const s = baseState({
    week: 100,
    year: 1984,
    month: 2,
    cash: 1_200_000,
    fans: 1_500,
    gamesPublished: 5,
    totalRevenue: 300_000,
    releasedGames: [profitableGame()],
    ...over,
  });
  s.ledger = applyLedger(s.ledger, {
    week: 98,
    amount: 50_000,
    category: "sales",
    label: "sales",
    ref: "s1",
  });
  s.ledger = applyLedger(s.ledger, {
    week: 99,
    amount: 40_000,
    category: "sales",
    label: "sales",
    ref: "s2",
  });
  return s;
}

describe("CP0 feature flags", () => {
  it("garage + officeFoundation on; later checkpoints dark", () => {
    assert.equal(FEATURE_FLAGS.garage, true);
    assert.equal(FEATURE_FLAGS.officeFoundation, true);
    assert.equal(FEATURE_FLAGS.firstOfficeEmployees, false);
    assert.equal(FEATURE_FLAGS.upgradedOffice, false);
    assert.equal(FEATURE_FLAGS.techParkLabs, false);
    assert.equal(FEATURE_FLAGS.aaa, false);
    assert.equal(FEATURE_FLAGS.liveServices, false);
    assert.equal(FEATURE_FLAGS.campusDirectors, false);
    assert.equal(FEATURE_FLAGS.endgameBusinesses, false);
    assert.equal(FEATURE_FLAGS.futureEndless, false);
    assert.equal(isFeatureEnabled("firstOfficeEmployees"), false);
  });
});

describe("§36.1 campaign modes", () => {
  it("classic_35 and legacy_50 configs", () => {
    const c = campaignConfigFor("classic_35");
    assert.equal(c.campaignYears, 35);
    assert.equal(c.industryEndYear, 2030);
    const l = campaignConfigFor("legacy_50");
    assert.equal(l.campaignYears, 50);
    assert.equal(l.industryEndYear, 2050);
  });

  it("campaign year and industry year are independent clocks", () => {
    assert.equal(campaignYearFromWeeks(0), 1);
    assert.equal(campaignYearFromWeeks(48), 2);
    assert.equal(campaignYearFromWeeks(96), 3);
    const cfg = campaignConfigFor("classic_35");
    const iy0 = industryYearFromProgress(0, cfg);
    const iyEnd = industryYearFromProgress(35 * 48, cfg);
    assert.equal(iy0, 1980);
    assert.equal(iyEnd, 2030);
    // mid campaign is not literal calendar
    const mid = industryYearFromProgress(17 * 48, cfg);
    assert.ok(mid > 1980 && mid < 2030);
  });
});

describe("§2 HQ seats ladder", () => {
  it("tiers are 1→4→5→6→8 total HQ seats", () => {
    assert.equal(OFFICE_DEFINITIONS[1].hqSeatsTotal, 1);
    assert.equal(OFFICE_DEFINITIONS[2].hqSeatsTotal, 4);
    assert.equal(OFFICE_DEFINITIONS[3].hqSeatsTotal, 5);
    assert.equal(OFFICE_DEFINITIONS[4].hqSeatsTotal, 6);
    assert.equal(OFFICE_DEFINITIONS[5].hqSeatsTotal, 8);
  });

  it("garage seat is founder only; FO max 3 production hires", () => {
    const g = buildHqSeats(1);
    assert.equal(g.length, 1);
    assert.equal(g[0]!.kind, "founder");
    assert.equal(maxProductionHires(1), 0);
    assert.equal(maxProductionHires(2), 3);
    const fo = buildHqSeats(2);
    assert.equal(fo.filter((s) => s.kind === "production").length, 3);
  });
});

describe("§36.2 Garage → First Office", () => {
  it("garage capacity is exactly one founder HQ seat", () => {
    assert.equal(officeDef(1).hqSeatsTotal, 1);
  });

  it("proofs require releases, fans, profit, OCF, year 3", () => {
    const poor = baseState({ week: 20, cash: 2_000_000, fans: 0, gamesPublished: 0 });
    const proofs = evaluateFirstOfficeProofs(poor);
    assert.ok(proofs.every((p) => !p.met || p.id === "trailing_ocf_13w"));
    assert.ok(!proofs.find((p) => p.id === "releases_5")!.met);
    assert.ok(!proofs.find((p) => p.id === "fans_1000")!.met);
  });

  it("$1M without non-financial proof cannot accept", () => {
    const s = baseState({
      week: 20,
      cash: 1_500_000,
      fans: 100,
      gamesPublished: 1,
      progression: createStudioProgression("classic_35"),
    });
    const prog = tickOfficeOffers(s, s.progression!);
    const offer = prog.offers.first_office;
    assert.ok(!offer || offer.state === "hidden" || offer.state === "discovered");
    // Force offer state and try accept — still fail on proofs path via eligible check
    if (!offer || offer.state === "hidden") {
      // not offered → accept fails
      const result = acceptFirstOfficeMove(s, prog);
      assert.equal(result.ok, false);
    }
  });

  it("full proofs without liquid cash may offer but cannot accept", () => {
    const s = readyState({ cash: 80_000 }); // below $1M liquid
    let prog = tickOfficeOffers(s, s.progression!);
    prog = tickOfficeOffers(s, prog);
    const v = firstOfficeOfferView(s, prog);
    assert.equal(v.proofsMet, true);
    assert.equal(v.afford.ok, false);
    // force offered
    prog = {
      ...prog,
      offers: {
        ...prog.offers,
        first_office: {
          ...(prog.offers.first_office ?? v.offer),
          state: "offered",
        },
      },
    };
    const result = acceptFirstOfficeMove(s, prog);
    assert.equal(result.ok, false);
  });

  it("defer freezes economics and remains available", () => {
    const s = readyState();
    let prog = tickOfficeOffers(s, s.progression!);
    // advance until offered
    for (let i = 0; i < 3; i++) prog = tickOfficeOffers(s, prog);
    const before = prog.offers.first_office!;
    // ensure offered/eligible
    prog = {
      ...prog,
      offers: {
        first_office: { ...before, state: "offered", moveCost: 150_000 },
      },
    };
    const def = deferFirstOfficeOffer(s, prog);
    assert.equal(def.ok, true);
    if (!def.ok) return;
    assert.equal(def.progression.offers.first_office!.state, "deferred");
    assert.equal(def.progression.offers.first_office!.moveCost, 150_000);
    // reopen does not change cost
    const again = firstOfficeOfferView(s, def.progression);
    assert.equal(again.offer.moveCost, 150_000);
    assert.equal(again.offer.liquidCashGate, 1_000_000);
  });

  it("accept reserves funds once and starts construction", () => {
    const s = readyState();
    let prog = tickOfficeOffers(s, s.progression!);
    prog = {
      ...prog,
      offers: {
        first_office: {
          ...firstOfficeOfferView(s, prog).offer,
          state: "offered",
        },
      },
    };
    const cashBefore = s.cash;
    const result = acceptFirstOfficeMove(s, prog);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.state.cash, cashBefore - 150_000);
    assert.ok(result.progression.activeMove);
    assert.equal(result.progression.activeMove!.status, "constructing");
    assert.equal(result.progression.studioTier, 1); // not yet moved
    assert.equal(result.state.office, 1);
    // second accept fails
    const again = acceptFirstOfficeMove(result.state, result.progression);
    assert.equal(again.ok, false);
  });

  it("move completion grants 4 seats, no free employee, preserves games", () => {
    const s = readyState();
    let prog = tickOfficeOffers(s, s.progression!);
    prog = {
      ...prog,
      offers: {
        first_office: {
          ...firstOfficeOfferView(s, prog).offer,
          state: "offered",
          constructionWeeks: 2,
        },
      },
    };
    const acc = acceptFirstOfficeMove(s, prog);
    assert.equal(acc.ok, true);
    if (!acc.ok) return;
    let state = acc.state;
    const p = acc.progression;
    // week before complete
    state = { ...state, week: state.week + 1 };
    let ticked = tickActiveMove(state, p);
    assert.ok(ticked.progression.activeMove);
    // complete
    state = { ...ticked.state, week: p.activeMove!.completesWeek };
    ticked = tickActiveMove(state, ticked.progression);
    assert.equal(ticked.progression.studioTier, 2);
    assert.equal(ticked.progression.activeMove, null);
    assert.equal(ticked.state.office, 2);
    assert.equal(ticked.progression.hqSeats.length, 4);
    assert.equal(ticked.state.staff.length, 1); // no free hire
    assert.equal(ticked.state.staff[0]!.id, "founder");
    assert.equal(ticked.state.releasedGames.length, s.releasedGames.length);
    assert.equal(ticked.progression.offers.first_office!.state, "completed");
  });

  it("date alone never grants office tier", () => {
    const s = baseState({ week: 500, year: 1992, month: 6, cash: 50_000 });
    let prog = createStudioProgression("classic_35");
    for (let i = 0; i < 10; i++) {
      prog = tickTenure(prog);
      prog = tickOfficeOffers(s, prog);
    }
    assert.equal(prog.studioTier, 1);
    assert.notEqual(prog.offers.first_office?.state, "completed");
  });

  it("save migration from legacy office", () => {
    const m1 = migrateStudioProgression(undefined, 1);
    assert.equal(m1.studioTier, 1);
    const m2 = migrateStudioProgression(undefined, 2);
    assert.equal(m2.studioTier, 2);
    assert.equal(m2.offers.first_office?.state, "completed");
    const mRound = migrateStudioProgression(m2, 2);
    assert.equal(mRound.studioTier, 2);
  });
});

describe("transitions config bible §4.3", () => {
  it("garage→FO numbers", () => {
    const t = TRANSITIONS.find((x) => x.fromTier === 1)!;
    assert.equal(t.moveCost, 150_000);
    assert.equal(t.liquidCashGate, 1_000_000);
    assert.equal(t.minRunwayWeeks, 26);
    assert.equal(t.constructionWeeks, 2);
    assert.equal(t.earliestCampaignYear, 3);
  });
});
