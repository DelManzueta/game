/**
 * Phase One presentation wiring regressions (store-facing, no DOM).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isGaragePhaseOne, lateSystemAllowed } from "../phaseOne";
import { useGame } from "../store";

function resetCampaign(name = "UI Test Studio") {
  useGame.getState().newGame(name, false, "standard");
  return useGame.getState();
}

describe("Phase One UI wiring contracts", () => {
  it("Garage is Phase One and late systems stay dark", () => {
    const s = resetCampaign();
    assert.equal(isGaragePhaseOne(s), true);
    assert.equal(lateSystemAllowed(s, "publishers"), false);
    assert.equal(lateSystemAllowed(s, "hardwareMerch"), false);
    assert.equal(lateSystemAllowed(s, "digitalStorefront"), false);
  });

  it("project design/tech points exist as real simulation fields", () => {
    const s = resetCampaign();
    const err = s.startProject({
      title: "Wire Test",
      topicId: s.unlockedTopics[0]!,
      genreId: s.unlockedGenres[0]!,
      platformId: s.unlockedPlatforms[0]!,
      size: "small",
      audience: "everyone",
      engineId: s.engines[0]!.id,
    });
    assert.equal(err, null, `startProject failed: ${err}`);
    const p = useGame.getState().currentProject;
    assert.ok(p);
    assert.equal(typeof p!.designPoints, "number");
    assert.equal(typeof p!.techPoints, "number");
    assert.equal(typeof p!.bugs, "number");
  });

  it("library selectGame + completeReport use the selected release id", () => {
    resetCampaign("Report Wire");
    const st = useGame.getState();
    st.setScreen("studio");
    assert.equal(typeof st.selectGame, "function");
    assert.equal(typeof st.completeReport, "function");
    st.selectGame("missing-id");
    assert.equal(useGame.getState().selectedGameId, "missing-id");
    st.completeReport("missing-id");
    assert.equal(useGame.getState().selectedGameId, "missing-id");
  });

  it("reviews target selectedGameId over lastReviewGameId when both set", () => {
    resetCampaign("Review Wire");
    useGame.setState({
      lastReviewGameId: "game-a",
      selectedGameId: "game-b",
      releasedGames: [
        {
          id: "game-a",
          title: "A",
          topicId: "racing",
          genreId: "action",
          platformId: "pc",
          size: "small",
          reviewScores: [7, 7, 7, 7],
          avgReview: 7,
          sales: 10,
          revenue: 100,
          weeksOnMarket: 1,
          onSale: true,
          weeklyHistory: [],
          yearReleased: 1982,
        } as never,
        {
          id: "game-b",
          title: "B",
          topicId: "racing",
          genreId: "action",
          platformId: "pc",
          size: "small",
          reviewScores: [9, 9, 9, 9],
          avgReview: 9,
          sales: 20,
          revenue: 200,
          weeksOnMarket: 1,
          onSale: true,
          weeklyHistory: [],
          yearReleased: 1982,
        } as never,
      ],
    });
    const s = useGame.getState();
    const id = s.selectedGameId ?? s.lastReviewGameId;
    const g = s.releasedGames.find((x) => x.id === id);
    assert.equal(g?.title, "B");
  });

  it("newGame does not throw when a save already exists (UI confirms separately)", () => {
    resetCampaign("Overwrite A");
    useGame.getState().saveGame();
    assert.doesNotThrow(() => {
      useGame.getState().newGame("Overwrite B", false, "standard");
    });
    assert.equal(useGame.getState().companyName, "Overwrite B");
  });
});
