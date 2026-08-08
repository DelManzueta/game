/** Canonical Phase One content — single entry for catalogs + fit math. */
export { TOPICS, TOPIC_COUNT, getTopicDef } from "./topics";
export { PLATFORMS, PLATFORM_COUNT, CUSTOM_CONSOLE, getPlatformDef, platformsAvailableInYear, platformsLicensableInYear, platformsUpcoming, platformDecade, decadeLabel, sortPlatformsForUi } from "./platforms";
export {
  ENGINE_COMPONENTS,
  ENGINE_COMPONENT_COUNT,
  STARTING_ENGINE_COMPONENT_ID,
  startingEngineFeatures,
  researchableEngineComponents,
} from "./engines";
export {
  computeGenreFit,
  genreFitModifier,
  topicGenreCompatibility,
  topicGenreTier,
  COMPATIBILITY_VALUES,
  compatibilityToTier,
} from "./genreFit";
export {
  GARAGE_START_TOPICS,
  GARAGE_START_GENRES,
  GARAGE_START_PLATFORMS,
  GARAGE_GENRE_IDS,
  garageTopics,
  garagePlatforms,
} from "./garageSlice";
export {
  ROOM_ART_LADDER,
  DEPARTMENT_ROOMS,
  LAB_ART,
  SCREEN_ROOM,
  MENU_ROOM_ART,
  roomArtForOffice,
  eraIdForOffice,
  departmentRoom,
  labRoom,
  labTierFor,
  type RoomArtDef,
  type RoomEraId,
  type DepartmentRoomId,
  type LabTier,
} from "./roomArt";
export {
  ENGINE_COMPONENT_ICONS,
  STUDIO_RESEARCH_ICONS,
  FIELD_ICONS,
  CATEGORY_ICONS,
  DEFAULT_RESEARCH_ICON,
  STUDIO_BRAND_ICON,
  ICON_FRAME,
  iconForResearch,
  iconForField,
  iconForEngineComponent,
} from "./researchIcons";
export {
  SAGA_STORY,
  PLAYSYSTEM_ORIGIN,
  INDUSTRY_STORY_BEATS,
  storyBeatsForDate,
  getStoryBeat,
  type IndustryStoryBeat,
} from "./industryStories";
export {
  GENRE_WAVES,
  activeGenreWaves,
  genreWaveMultiplier,
  CREATORS,
  creatorsAvailable,
  creatorFitBonus,
  MEDIA_TOPICS,
  TRADE_SHOWS,
  tradeShowKey,
} from "./externalFactors";
export * from "./platformArt";
export { GENRE_ICON, genreIconSrc } from "./genreArt";
