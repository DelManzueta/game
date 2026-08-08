/**
 * Topic tags + genre production profiles + project pillars → effective importance.
 * Topics reshape genre profile (0.85–1.15); they do not replace it.
 */

import type { DevField, GenreId } from "../types";
import type { GenrePhaseWeights, ProjectPillar, TopicTag } from "./types";

export const GENRE_BASE_WEIGHTS: Record<GenreId, GenrePhaseWeights> = {
  action: {
    engine: 1.0,
    gameplay: 0.9,
    story: 0.7,
    dialogue: 0.6,
    level: 0.9,
    ai: 1.0,
    world: 0.8,
    graphics: 1.0,
    sound: 0.9,
  },
  adventure: {
    engine: 0.7,
    gameplay: 0.8,
    story: 1.0,
    dialogue: 1.0,
    level: 0.8,
    ai: 0.7,
    world: 1.0,
    graphics: 0.9,
    sound: 0.8,
  },
  rpg: {
    engine: 0.7,
    gameplay: 0.8,
    story: 1.0,
    dialogue: 1.0,
    level: 0.8,
    ai: 0.7,
    world: 1.0,
    graphics: 0.9,
    sound: 0.8,
  },
  simulation: {
    engine: 0.9,
    gameplay: 1.0,
    story: 0.8,
    dialogue: 0.7,
    level: 0.9,
    ai: 1.0,
    world: 0.8,
    graphics: 1.0,
    sound: 0.9,
  },
  strategy: {
    engine: 0.9,
    gameplay: 1.0,
    story: 0.8,
    dialogue: 0.7,
    level: 1.0,
    ai: 0.9,
    world: 1.0,
    graphics: 0.8,
    sound: 0.9,
  },
  casual: {
    engine: 0.6,
    gameplay: 1.0,
    story: 0.7,
    dialogue: 0.7,
    level: 1.0,
    ai: 0.6,
    world: 0.7,
    graphics: 1.0,
    sound: 0.9,
  },
};

/** Field modifiers per topic tag (multiplicative, clamped later). */
const TAG_MODS: Record<TopicTag, Partial<Record<DevField, number>>> = {
  narrative_heavy: { story: 1.12, dialogue: 1.12, world: 1.08 },
  systems_heavy: { engine: 1.12, gameplay: 1.1, ai: 1.08 },
  simulation_heavy: { engine: 1.1, ai: 1.12, world: 1.08 },
  spectacle_heavy: { graphics: 1.14, sound: 1.1, world: 1.05 },
  tactical: { level: 1.12, ai: 1.1, gameplay: 1.08 },
  social: { dialogue: 1.1, gameplay: 1.05, engine: 1.05 },
  competitive: { gameplay: 1.1, ai: 1.08, engine: 1.08 },
  sandbox: { world: 1.14, engine: 1.1, ai: 1.08 },
  cozy: { graphics: 1.08, sound: 1.1, story: 1.05 },
  horror: { sound: 1.14, level: 1.1, ai: 1.08, graphics: 1.05 },
};

const PILLAR_MODS: Record<ProjectPillar, Partial<Record<DevField, number>>> = {
  cinematic_narrative: { story: 1.15, dialogue: 1.12, graphics: 1.08, sound: 1.1 },
  competitive_mastery: { gameplay: 1.15, ai: 1.1, engine: 1.1, level: 1.08 },
  living_world: { world: 1.15, ai: 1.12, engine: 1.08, story: 1.05 },
  technical_showcase: { engine: 1.15, graphics: 1.15, sound: 1.05 },
  accessible_fun: { gameplay: 1.12, level: 1.1, sound: 1.05, graphics: 1.05 },
  deep_simulation: { engine: 1.15, ai: 1.15, gameplay: 1.1 },
  social_experience: { dialogue: 1.12, gameplay: 1.08, engine: 1.08 },
  default: {},
};

/** Heuristic tags for topics by id keywords — avoids hand-authoring 132×tags. */
export function tagsForTopic(topicId: string): TopicTag[] {
  const id = topicId.toLowerCase();
  const tags: TopicTag[] = [];
  const add = (t: TopicTag) => {
    if (!tags.includes(t)) tags.push(t);
  };

  if (/politic|crime|fantasy|police|noir|detective|spy|romance|drama|history|myth/.test(id)) {
    add("narrative_heavy");
  }
  if (/construction|econom|manage|business|factory|tycoon|game.?dev/.test(id)) {
    add("systems_heavy");
  }
  if (/racing|flight|aviation|fish|city|farm|truck|train|pilot|sail/.test(id)) {
    add("simulation_heavy");
  }
  if (/superhero|war|dinosaur|disaster|space|alien|zombie|mecha/.test(id)) {
    add("spectacle_heavy");
  }
  if (/military|espionage|chess|tactics|swat|special.?ops/.test(id)) {
    add("tactical");
  }
  if (/party|dating|social|school|life|idol/.test(id)) add("social");
  if (/sport|esport|fighting|shooter|pvp|arena|racing/.test(id)) add("competitive");
  if (/sandbox|survival|craft|open/.test(id)) add("sandbox");
  if (/garden|cozy|cooking|pet|cafe|relax|cute/.test(id)) add("cozy");
  if (/horror|ghost|haunted|terror|slasher/.test(id)) add("horror");

  if (tags.length === 0) {
    // Home-genre soft defaults via id families
    if (/rpg|quest|dungeon/.test(id)) add("narrative_heavy");
    else add("systems_heavy");
  }
  return tags.slice(0, 5);
}

export function computeEffectiveImportance(opts: {
  genreId: GenreId;
  topicId: string;
  pillar?: ProjectPillar;
  platformRelevance?: Partial<Record<DevField, number>>;
  audienceRelevance?: Partial<Record<DevField, number>>;
}): Record<DevField, number> {
  const base = { ...GENRE_BASE_WEIGHTS[opts.genreId] };
  const tags = tagsForTopic(opts.topicId);
  const pillar = opts.pillar ?? "default";

  const fields: DevField[] = [
    "engine",
    "gameplay",
    "story",
    "dialogue",
    "level",
    "ai",
    "world",
    "graphics",
    "sound",
  ];

  const raw: Record<DevField, number> = { ...base };
  for (const f of fields) {
    let v = base[f];
    for (const tag of tags) {
      v *= TAG_MODS[tag][f] ?? 1;
    }
    v *= PILLAR_MODS[pillar][f] ?? 1;
    v *= opts.platformRelevance?.[f] ?? 1;
    v *= opts.audienceRelevance?.[f] ?? 1;
    // Topic reshape range ~0.85–1.15 relative to genre base
    const ratio = v / base[f];
    const clampedRatio = Math.max(0.85, Math.min(1.15, ratio));
    // Allow pillar a bit more headroom
    const pillarBoost = PILLAR_MODS[pillar][f] ?? 1;
    raw[f] = base[f] * clampedRatio * Math.min(1.08, pillarBoost);
  }

  // Normalize within each production phase
  const phases: DevField[][] = [
    ["engine", "gameplay", "story"],
    ["dialogue", "level", "ai"],
    ["world", "graphics", "sound"],
  ];
  for (const phase of phases) {
    const sum = phase.reduce((s, f) => s + raw[f], 0) || 1;
    const target = phase.length; // keep average ~1
    for (const f of phase) {
      raw[f] = (raw[f] / sum) * target;
    }
  }
  return raw;
}

export const PILLAR_LABELS: Record<ProjectPillar, string> = {
  cinematic_narrative: "Cinematic Narrative",
  competitive_mastery: "Competitive Mastery",
  living_world: "Living World",
  technical_showcase: "Technical Showcase",
  accessible_fun: "Accessible Fun",
  deep_simulation: "Deep Simulation",
  social_experience: "Social Experience",
  default: "Balanced",
};
