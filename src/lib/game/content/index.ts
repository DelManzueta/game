/** Canonical Phase One content — single entry for catalogs + fit math. */
export { TOPICS, TOPIC_COUNT, getTopicDef } from "./topics";
export { PLATFORMS, PLATFORM_COUNT, CUSTOM_CONSOLE, getPlatformDef, platformsAvailableInYear } from "./platforms";
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
export { platformArt, platformThumb, PLATFORM_ART, PLATFORM_THUMB, VENA_BRAND_ART } from "./platformArt";
