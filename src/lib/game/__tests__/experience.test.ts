import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyDevWeekExperience, xpToNextLevel } from "../scoring/experience.ts";
import type { StaffMember } from "../types.ts";

const staff: StaffMember = {
  id: "s1",
  name: "Dev",
  design: 40,
  tech: 40,
  speed: 40,
  salary: 1000,
  level: 1,
  xp: 0,
  fieldExperience: {},
  busy: true,
};

describe("experience progression", () => {
  it("gains XP slowly over many weeks", () => {
    let team = [staff];
    for (let i = 0; i < 20; i++) {
      team = applyDevWeekExperience(team, { genreId: "action", stage: 1 });
    }
    const m = team[0]!;
    assert.ok(m.level <= 3, `level ${m.level}`);
    assert.ok((m.fieldExperience?.engine ?? 0) > 0 || (m.fieldExperience?.gameplay ?? 0) > 0);
    assert.ok(xpToNextLevel(1) > 40);
  });
});
