/**
 * Staff experience progression while developing games.
 * Gains slowly over weeks — not giant jumps on release only.
 */

import type { DevField, StaffMember } from "../types";
import { EXPERIENCE } from "./config";
import { stageFieldsFor } from "./qualityEngine";
import type { GenreId } from "../types";

export function xpToNextLevel(level: number): number {
  return EXPERIENCE.xpBase + level * EXPERIENCE.xpPerLevel;
}

/**
 * Apply one development week of experience to the whole team.
 * Field XP goes to the current stage's three fields.
 */
export function applyDevWeekExperience(
  staff: StaffMember[],
  opts: { genreId: GenreId; stage: 1 | 2 | 3 },
): StaffMember[] {
  const fields = stageFieldsFor(opts.genreId, opts.stage);
  return staff.map((m) => gainWeekXp(m, fields));
}

export function gainWeekXp(member: StaffMember, workedFields: DevField[]): StaffMember {
  let xp = member.xp + EXPERIENCE.xpPerDevWeek;
  if (member.specialization && workedFields.includes(member.specialization)) {
    xp += EXPERIENCE.specializationBonus;
  }

  const fieldExperience: Partial<Record<DevField, number>> = {
    ...(member.fieldExperience ?? {}),
  };
  for (const f of workedFields) {
    const cur = fieldExperience[f] ?? 0;
    fieldExperience[f] = Math.min(EXPERIENCE.fieldXpCap, cur + EXPERIENCE.fieldXpPerWeek);
  }

  return levelUpIfNeeded({ ...member, xp, fieldExperience });
}

/** Small release bonus (on top of weekly gains). */
export function applyReleaseExperience(
  staff: StaffMember[],
  hiddenFinalScore: number,
): StaffMember[] {
  const bonus =
    EXPERIENCE.xpOnReleaseBase + hiddenFinalScore * EXPERIENCE.xpOnReleasePerScore;
  return staff.map((m) => levelUpIfNeeded({ ...m, xp: m.xp + bonus }));
}

function levelUpIfNeeded(member: StaffMember): StaffMember {
  let { xp, level, design, tech, speed } = member;
  let guard = 0;
  while (level < EXPERIENCE.maxLevel && xp >= xpToNextLevel(level) && guard < 20) {
    xp -= xpToNextLevel(level);
    level += 1;
    design = Math.min(EXPERIENCE.maxStat, design + EXPERIENCE.designOnLevel);
    tech = Math.min(EXPERIENCE.maxStat, tech + EXPERIENCE.techOnLevel);
    speed = Math.min(EXPERIENCE.maxStat, speed + EXPERIENCE.speedOnLevel);
    if (level % EXPERIENCE.bonusStatEveryLevels === 0) {
      // small extra point alternating
      if (level % 10 === 0) design = Math.min(EXPERIENCE.maxStat, design + 1);
      else tech = Math.min(EXPERIENCE.maxStat, tech + 1);
    }
    guard++;
  }
  return { ...member, xp, level, design, tech, speed };
}
