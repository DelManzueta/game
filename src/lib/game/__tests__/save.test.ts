import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SAVE_KEYS, findSave, parseSaveCandidate, removeAllSaves } from "../save";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    values,
  };
}

describe("save persistence boundary", () => {
  it("prefers the current save and recognizes every legacy key", () => {
    for (const key of SAVE_KEYS) {
      const storage = memoryStorage({ [key]: JSON.stringify({ companyName: key }) });
      assert.equal(findSave(storage)?.key, key);
    }

    const storage = memoryStorage({
      [SAVE_KEYS[1]]: JSON.stringify({ companyName: "legacy" }),
      [SAVE_KEYS[0]]: JSON.stringify({ companyName: "current" }),
    });
    assert.equal(findSave(storage)?.key, SAVE_KEYS[0]);
  });

  it("removes the current save and every recognized legacy save", () => {
    const storage = memoryStorage(
      Object.fromEntries(SAVE_KEYS.map((key) => [key, "{}"])),
    );
    removeAllSaves(storage);
    assert.equal(storage.values.size, 0);
  });

  it("rejects malformed structures without accepting arrays as saves", () => {
    assert.equal(parseSaveCandidate("not json"), null);
    assert.equal(parseSaveCandidate("[]"), null);
    assert.equal(parseSaveCandidate('{"staff":{}}'), null);
    assert.equal(parseSaveCandidate('{"cash":"lots"}'), null);
    assert.equal(parseSaveCandidate('{"cash":1e999}'), null);
  });

  it("accepts current and partial legacy campaign objects", () => {
    assert.ok(
      parseSaveCandidate(
        JSON.stringify({
          version: 5,
          phase: "playing",
          companyName: "Foundry Games",
          cash: 70000,
          staff: [{ id: "founder" }],
          currentProject: null,
          releasedGames: [],
          activeSales: [],
          settings: { autosave: true },
        }),
      ),
    );
    assert.ok(parseSaveCandidate(JSON.stringify({ version: 1, companyName: "Legacy" })));
  });
});
