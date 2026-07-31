/**
 * Algorithm V2 balancing — configuration only.
 * Not GDT moving-target: past hits do not secretly punish the next game.
 */
import type { DevField, GenreId } from "../../types";

export const STAGE_EFFORT_TOTAL = 100;

/** Design/Technology mix per discipline (spec ratios). */
export const DISCIPLINE_MIX: Record<DevField, { design: number; tech: number }> = {
  engine: { design: 0.2, tech: 0.8 },
  gameplay: { design: 0.6, tech: 0.4 },
  story: { design: 0.9, tech: 0.1 },
  dialogue: { design: 0.9, tech: 0.1 },
  level: { design: 0.65, tech: 0.35 },
  ai: { design: 0.2, tech: 0.8 },
  world: { design: 0.8, tech: 0.2 },
  graphics: { design: 0.4, tech: 0.6 },
  sound: { design: 0.5, tech: 0.5 },
};

/** Genre priority vectors over 9 disciplines (relative weights, not % UI). */
export const GENRE_PRIORITIES: Record<GenreId, Record<DevField, number>> = {
  action: {
    engine: 0.25, gameplay: 0.5, story: 0.25,
    dialogue: 0.1, level: 0.4, ai: 0.5,
    world: 0.15, graphics: 0.5, sound: 0.35,
  },
  adventure: {
    engine: 0.15, gameplay: 0.35, story: 0.55,
    dialogue: 0.5, level: 0.35, ai: 0.15,
    world: 0.45, graphics: 0.35, sound: 0.3,
  },
  rpg: {
    engine: 0.2, gameplay: 0.4, story: 0.5,
    dialogue: 0.45, level: 0.35, ai: 0.3,
    world: 0.5, graphics: 0.35, sound: 0.3,
  },
  simulation: {
    engine: 0.4, gameplay: 0.45, story: 0.15,
    dialogue: 0.1, level: 0.3, ai: 0.45,
    world: 0.35, graphics: 0.3, sound: 0.25,
  },
  strategy: {
    engine: 0.35, gameplay: 0.45, story: 0.2,
    dialogue: 0.15, level: 0.4, ai: 0.55,
    world: 0.3, graphics: 0.25, sound: 0.2,
  },
  casual: {
    engine: 0.15, gameplay: 0.45, story: 0.2,
    dialogue: 0.15, level: 0.3, ai: 0.15,
    world: 0.2, graphics: 0.4, sound: 0.4,
  },
};

export type TopicProfile = {
  actionPotential: number;
  narrativePotential: number;
  strategicDepth: number;
  simulationPotential: number;
  explorationPotential: number;
  socialPotential: number;
  casualAccessibility: number;
  maturity: number;
};

export type GenreDemand = TopicProfile;

export const GENRE_DEMAND: Record<GenreId, GenreDemand> = {
  action: { actionPotential: 0.95, narrativePotential: 0.35, strategicDepth: 0.3, simulationPotential: 0.25, explorationPotential: 0.4, socialPotential: 0.3, casualAccessibility: 0.55, maturity: 0.45 },
  adventure: { actionPotential: 0.35, narrativePotential: 0.9, strategicDepth: 0.35, simulationPotential: 0.25, explorationPotential: 0.85, socialPotential: 0.25, casualAccessibility: 0.5, maturity: 0.4 },
  rpg: { actionPotential: 0.55, narrativePotential: 0.85, strategicDepth: 0.55, simulationPotential: 0.35, explorationPotential: 0.8, socialPotential: 0.35, casualAccessibility: 0.35, maturity: 0.5 },
  simulation: { actionPotential: 0.25, narrativePotential: 0.3, strategicDepth: 0.55, simulationPotential: 0.95, explorationPotential: 0.4, socialPotential: 0.3, casualAccessibility: 0.45, maturity: 0.35 },
  strategy: { actionPotential: 0.3, narrativePotential: 0.35, strategicDepth: 0.95, simulationPotential: 0.55, explorationPotential: 0.4, socialPotential: 0.25, casualAccessibility: 0.25, maturity: 0.45 },
  casual: { actionPotential: 0.35, narrativePotential: 0.25, strategicDepth: 0.2, simulationPotential: 0.3, explorationPotential: 0.25, socialPotential: 0.4, casualAccessibility: 0.95, maturity: 0.15 },
};

/** Topic attribute profiles (descriptive, not hand-table of every pair). */
export const TOPIC_PROFILES: Record<string, TopicProfile> = {
  space: { actionPotential: 0.7, narrativePotential: 0.55, strategicDepth: 0.5, simulationPotential: 0.55, explorationPotential: 0.9, socialPotential: 0.3, casualAccessibility: 0.4, maturity: 0.35 },
  fantasy: { actionPotential: 0.65, narrativePotential: 0.85, strategicDepth: 0.45, simulationPotential: 0.3, explorationPotential: 0.85, socialPotential: 0.35, casualAccessibility: 0.45, maturity: 0.4 },
  scifi: { actionPotential: 0.65, narrativePotential: 0.7, strategicDepth: 0.55, simulationPotential: 0.5, explorationPotential: 0.75, socialPotential: 0.3, casualAccessibility: 0.4, maturity: 0.45 },
  military: { actionPotential: 0.9, narrativePotential: 0.4, strategicDepth: 0.65, simulationPotential: 0.55, explorationPotential: 0.35, socialPotential: 0.25, casualAccessibility: 0.3, maturity: 0.7 },
  medieval: { actionPotential: 0.7, narrativePotential: 0.7, strategicDepth: 0.5, simulationPotential: 0.35, explorationPotential: 0.7, socialPotential: 0.3, casualAccessibility: 0.4, maturity: 0.45 },
  city: { actionPotential: 0.25, narrativePotential: 0.35, strategicDepth: 0.55, simulationPotential: 0.95, explorationPotential: 0.4, socialPotential: 0.5, casualAccessibility: 0.5, maturity: 0.3 },
  racing: { actionPotential: 0.8, narrativePotential: 0.2, strategicDepth: 0.3, simulationPotential: 0.7, explorationPotential: 0.2, socialPotential: 0.4, casualAccessibility: 0.55, maturity: 0.25 },
  dungeon: { actionPotential: 0.75, narrativePotential: 0.55, strategicDepth: 0.45, simulationPotential: 0.25, explorationPotential: 0.8, socialPotential: 0.25, casualAccessibility: 0.35, maturity: 0.5 },
  pirate: { actionPotential: 0.75, narrativePotential: 0.65, strategicDepth: 0.35, simulationPotential: 0.35, explorationPotential: 0.8, socialPotential: 0.4, casualAccessibility: 0.5, maturity: 0.4 },
  zombies: { actionPotential: 0.8, narrativePotential: 0.45, strategicDepth: 0.25, simulationPotential: 0.2, explorationPotential: 0.5, socialPotential: 0.25, casualAccessibility: 0.4, maturity: 0.75 },
  school: { actionPotential: 0.25, narrativePotential: 0.7, strategicDepth: 0.3, simulationPotential: 0.45, explorationPotential: 0.35, socialPotential: 0.7, casualAccessibility: 0.75, maturity: 0.2 },
  business: { actionPotential: 0.15, narrativePotential: 0.35, strategicDepth: 0.75, simulationPotential: 0.9, explorationPotential: 0.25, socialPotential: 0.45, casualAccessibility: 0.45, maturity: 0.35 },
  spy: { actionPotential: 0.7, narrativePotential: 0.75, strategicDepth: 0.45, simulationPotential: 0.3, explorationPotential: 0.55, socialPotential: 0.3, casualAccessibility: 0.4, maturity: 0.55 },
  superheroes: { actionPotential: 0.9, narrativePotential: 0.6, strategicDepth: 0.25, simulationPotential: 0.2, explorationPotential: 0.5, socialPotential: 0.4, casualAccessibility: 0.55, maturity: 0.35 },
  farming: { actionPotential: 0.15, narrativePotential: 0.35, strategicDepth: 0.4, simulationPotential: 0.9, explorationPotential: 0.45, socialPotential: 0.45, casualAccessibility: 0.8, maturity: 0.15 },
  detective: { actionPotential: 0.3, narrativePotential: 0.9, strategicDepth: 0.55, simulationPotential: 0.25, explorationPotential: 0.55, socialPotential: 0.3, casualAccessibility: 0.45, maturity: 0.55 },
};

export const DEFAULT_TOPIC_PROFILE: TopicProfile = {
  actionPotential: 0.5,
  narrativePotential: 0.5,
  strategicDepth: 0.5,
  simulationPotential: 0.5,
  explorationPotential: 0.5,
  socialPotential: 0.5,
  casualAccessibility: 0.5,
  maturity: 0.4,
};

export const CRAFT_WEIGHTS = {
  execution: 0.32,
  focusAlignment: 0.2,
  designTechBalance: 0.1,
  featureCoherence: 0.12,
  innovation: 0.08,
  polish: 0.12,
  teamExecution: 0.06,
} as const;

export const CONCEPT_WEIGHTS = {
  topicGenre: 0.45,
  genreAudience: 0.25,
  genrePlatform: 0.2,
  platformAudience: 0.1,
} as const;

/** Final conceptFit clamped to this range (multiplicative). */
export const CONCEPT_FIT_RANGE = { min: 0.88, max: 1.06 };

/** Expected work points by size (execution target). */
export const EXECUTION_TARGET = {
  small: 45,
  medium: 90,
  large: 160,
  aaa: 260,
} as const;

export const BUG_WEIGHTS = { minor: 1, major: 3, critical: 8 };

export const WORK_FACTORS = {
  skillBase: 0.55,
  skillDiv: 220,
  energyMin: 0.65,
  energyMax: 1.05,
  expMin: 0.85,
  expMax: 1.15,
  toolMin: 0.9,
  toolMax: 1.2,
  workloadMin: 0.55,
  workloadMax: 1.0,
  synergyMin: 0.9,
  synergyMax: 1.1,
  diminishingK: 0.012,
};

export const EXPECTATION_CAP = 5; // quality points ±

export const SALES = {
  basePlatformUsers: {
    small: 40_000,
    medium: 90_000,
    large: 180_000,
    aaa: 320_000,
  } as Record<string, number>,
  priceBySize: { small: 25, medium: 40, large: 50, aaa: 60 } as Record<string, number>,
  defaultWeeks: 14,
  liveOpsWeeks: 18,
};
