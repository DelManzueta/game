/**
 * Research / engine / discipline art — teal-orange icon pack.
 * Files live under /art/ui/research/
 */

const BASE = "/art/ui/research";

/** Engine component id → icon path (1:1 with ladder art where possible). */
export const ENGINE_COMPONENT_ICONS: Record<string, string> = {
  basic_2d_v1: `${BASE}/gfx-2d-v1.png`,
  "2d_v2": `${BASE}/gfx-2d-v2.png`,
  "2d_v3": `${BASE}/gfx-2d-v3.png`,
  "3d_v1": `${BASE}/gfx-3d-v1.png`,
  "3d_v2": `${BASE}/gfx-3d-v2.png`,
  "3d_v3": `${BASE}/gfx-3d-v3.png`,
  mono_sound: `${BASE}/sfx.png`,
  stereo_sound: `${BASE}/field-sound.png`,
  surround_sound: `${BASE}/audio-surround.png`,
  save_game: `${BASE}/save-disk.png`,
  multiplayer: `${BASE}/multiplayer.png`,
  online_play: `${BASE}/multiplayer.png`,
  mod_support: `${BASE}/modding.png`,
  game_tutorials: `${BASE}/knowledge.png`,
  better_ux: `${BASE}/design-v3.png`,
  achievements: `${BASE}/reviews.png`,
  character_progression: `${BASE}/staff-level.png`,
  linear_story: `${BASE}/field-story.png`,
  simple_cutscenes: `${BASE}/field-story.png`,
  branching_story: `${BASE}/dialogue-tree.png`,
  rich_backstory: `${BASE}/field-story.png`,
  better_dialogues: `${BASE}/dialogue-tree.png`,
  dialogue_tree: `${BASE}/dialogue-tree.png`,
  level_editor: `${BASE}/field-world.png`,
  better_ai: `${BASE}/field-ai.png`,
  advanced_ai: `${BASE}/ai-agent.png`,
  open_world: `${BASE}/field-world.png`,
};

/** Studio research nodes. */
export const STUDIO_RESEARCH_ICONS: Record<string, string> = {
  medium_games: `${BASE}/engine-core.png`,
  large_games: `${BASE}/gfx-3d-v3.png`,
  aaa_games: `${BASE}/character-v2.png`,
  target_audience: `${BASE}/multiplayer.png`,
  marketing: `${BASE}/marketing.png`,
  contracts: `${BASE}/knowledge.png`,
  sequels: `${BASE}/research-tree.png`,
  series_continuity: `${BASE}/research-tree.png`,
  multi_genre: `${BASE}/modding.png`,
};

/** Development discipline fields (alloc sliders). */
export const FIELD_ICONS: Record<string, string> = {
  engine: `${BASE}/engine-core.png`,
  gameplay: `${BASE}/staff-level.png`,
  story: `${BASE}/field-story.png`,
  dialogue: `${BASE}/dialogue-tree.png`,
  level: `${BASE}/field-world.png`,
  ai: `${BASE}/field-ai.png`,
  world: `${BASE}/field-world.png`,
  graphics: `${BASE}/field-graphics.png`,
  sound: `${BASE}/field-sound.png`,
};

/** Category fallbacks for engine components / research lists. */
export const CATEGORY_ICONS: Record<string, string> = {
  Graphics: `${BASE}/field-graphics.png`,
  Sound: `${BASE}/sfx.png`,
  Engine: `${BASE}/engine-core.png`,
  Gameplay: `${BASE}/staff-level.png`,
  "Story and Quests": `${BASE}/field-story.png`,
  Dialogue: `${BASE}/dialogue-tree.png`,
  Studio: `${BASE}/studio-fox.png`,
  Production: `${BASE}/modding.png`,
  Level: `${BASE}/field-world.png`,
  "Level Design": `${BASE}/field-world.png`,
  "World Design": `${BASE}/field-world.png`,
  AI: `${BASE}/field-ai.png`,
  "A.I.": `${BASE}/field-ai.png`,
  "Artificial Intelligence": `${BASE}/field-ai.png`,
};

export const DEFAULT_RESEARCH_ICON = `${BASE}/research-tree.png`;
export const STUDIO_BRAND_ICON = `${BASE}/studio-fox.png`;
export const ICON_FRAME = `${BASE}/icon-frame.png`;

export function iconForResearch(id: string, category?: string): string {
  return (
    ENGINE_COMPONENT_ICONS[id] ??
    STUDIO_RESEARCH_ICONS[id] ??
    (category ? CATEGORY_ICONS[category] : undefined) ??
    DEFAULT_RESEARCH_ICON
  );
}

export function iconForField(field: string): string {
  return FIELD_ICONS[field] ?? DEFAULT_RESEARCH_ICON;
}

export function iconForEngineComponent(id: string, category?: string): string {
  return ENGINE_COMPONENT_ICONS[id] ?? (category ? CATEGORY_ICONS[category] : undefined) ?? DEFAULT_RESEARCH_ICON;
}
