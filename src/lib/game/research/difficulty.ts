/**
 * Difficulty presets — adjust economy/uncertainty knobs only (Part 2 §11).
 * Never changes topic-genre fit meaning or technology physics.
 */

import type { DifficultyConfig, DifficultyPreset } from "./types";

export const DIFFICULTY_PRESETS: Record<Exclude<DifficultyPreset, "custom">, DifficultyConfig> = {
  creative: {
    preset: "creative",
    startingCashMult: 1.75,
    forecastAccuracy: 1.25,
    competitorStrength: 0.75,
    marketVolatility: 0.7,
    wagePressure: 0.85,
    employeeExpectations: 0.85,
    publisherQuality: 1.15,
    certificationStrictness: 0.8,
    fanForgiveness: 1.25,
    bankruptcyAssistance: 1.5,
    eventSeverity: 0.7,
    techEstimateUncertainty: 0.75,
  },
  standard: {
    preset: "standard",
    startingCashMult: 1,
    forecastAccuracy: 1,
    competitorStrength: 1,
    marketVolatility: 1,
    wagePressure: 1,
    employeeExpectations: 1,
    publisherQuality: 1,
    certificationStrictness: 1,
    fanForgiveness: 1,
    bankruptcyAssistance: 1,
    eventSeverity: 1,
    techEstimateUncertainty: 1,
  },
  executive: {
    preset: "executive",
    startingCashMult: 0.7,
    forecastAccuracy: 0.75,
    competitorStrength: 1.3,
    marketVolatility: 1.25,
    wagePressure: 1.2,
    employeeExpectations: 1.25,
    publisherQuality: 0.85,
    certificationStrictness: 1.25,
    fanForgiveness: 0.8,
    bankruptcyAssistance: 0.6,
    eventSeverity: 1.3,
    techEstimateUncertainty: 1.35,
  },
};

export function getDifficulty(preset: DifficultyPreset, custom?: Partial<DifficultyConfig>): DifficultyConfig {
  if (preset === "custom") {
    return { ...DIFFICULTY_PRESETS.standard, preset: "custom", ...custom };
  }
  return { ...DIFFICULTY_PRESETS[preset] };
}

export function applyStartingCash(baseCash: number, diff: DifficultyConfig): number {
  return Math.round(baseCash * diff.startingCashMult);
}
