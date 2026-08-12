import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getRoomArt, getMenuArt, genreIconSrc, platformThumb } from "../content/art";

describe("art manifest uses curated /art paths", () => {
  it("menu and rooms never point at /attachments", () => {
    const garage = getRoomArt(1, "studio", 1983);
    const lab = getRoomArt(1, "research", 1983);
    const hw = getRoomArt(4, "platforms", 1996);
    for (const src of [getMenuArt(), garage.src, garage.desk, lab.src, hw.src]) {
      assert.match(src, /^\/art\//);
      assert.doesNotMatch(src, /attachments/);
    }
    assert.match(lab.label.toLowerCase(), /lab|r&d/);
    assert.match(hw.label.toLowerCase(), /hardware/);
  });

  it("genre and platform helpers stay in /art", () => {
    assert.match(genreIconSrc("action"), /^\/art\/ui\/genres\//);
    const thumb = platformThumb("pc", 1983);
    if (thumb) assert.match(thumb, /^\/art\/platforms\//);
  });
});
