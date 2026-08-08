/**
 * Campaign modes + dual-clock industry era mapping.
 * Bible §3: campaign time ≠ industry year 1:1.
 */
import type { CampaignConfig, CampaignMode } from "./types";

export const INDUSTRY_START_YEAR = 1977;

export function campaignConfigFor(mode: CampaignMode): CampaignConfig {
  if (mode === "legacy_50") {
    return {
      mode: "legacy_50",
      campaignYears: 50,
      industryEndYear: 2050,
      industryStartYear: INDUSTRY_START_YEAR,
    };
  }
  return {
    mode: "classic_35",
    campaignYears: 35,
    industryEndYear: 2030,
    industryStartYear: INDUSTRY_START_YEAR,
  };
}

export function totalCampaignWeeks(cfg: CampaignConfig, weeksPerYear = 48): number {
  return cfg.campaignYears * weeksPerYear;
}

/**
 * Map elapsed campaign weeks → authored industry year.
 * UI may show "Y12 M4 · Industry Era: late 1990s" — never pretends CY12 === 1992.
 */
export function industryYearFromProgress(
  elapsedCampaignWeeks: number,
  cfg: CampaignConfig,
  weeksPerYear = 48,
): number {
  const total = Math.max(1, totalCampaignWeeks(cfg, weeksPerYear));
  const progress = Math.min(1, Math.max(0, elapsedCampaignWeeks / total));
  const span = cfg.industryEndYear - cfg.industryStartYear;
  return Math.round(cfg.industryStartYear + progress * span);
}

export function industryEraLabel(industryYear: number): string {
  if (industryYear < 1985) return "early 1980s";
  if (industryYear < 1990) return "late 1980s";
  if (industryYear < 1995) return "early 1990s";
  if (industryYear < 2000) return "late 1990s";
  if (industryYear < 2005) return "early 2000s";
  if (industryYear < 2010) return "late 2000s";
  if (industryYear < 2015) return "early 2010s";
  if (industryYear < 2020) return "late 2010s";
  if (industryYear < 2025) return "early 2020s";
  if (industryYear < 2030) return "late 2020s";
  if (industryYear < 2040) return "2030s";
  if (industryYear < 2050) return "2040s";
  return "2050s frontier";
}

/** Campaign year 1-based from elapsed weeks. */
export function campaignYearFromWeeks(week: number, weeksPerYear = 48): number {
  return Math.floor(Math.max(0, week) / weeksPerYear) + 1;
}
