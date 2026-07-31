/**
 * Fan growth / loss — driven by review score + commercial success.
 * Hits build audiences; flops shed followers. Never rewrites quality.
 */
import { clamp } from "./layers";

/** Review reaction mult: hits amplify, bombs subtract. */
function reviewReaction(avgReview: number): number {
  if (avgReview >= 9.5) return 2.05;
  if (avgReview >= 9.0) return 1.65;
  if (avgReview >= 8.0) return 1.2;
  if (avgReview >= 7.0) return 0.7;
  if (avgReview >= 6.0) return 0.22;
  if (avgReview >= 5.0) return -0.12;
  if (avgReview >= 4.0) return -0.4;
  if (avgReview >= 3.0) return -0.7;
  return -0.95;
}

/**
 * One-time launch reaction after reviews settle.
 * Commercial success (units planned / early sales) multiplies hits; flops still lose fans.
 */
export function launchFanDelta(opts: {
  avgReview: number;
  awareness: number;
  fansAtLaunch: number;
  publisherFanMult?: number;
  /** Planned or realized commercial scale (units). Hits scale up; flops ignore boom. */
  totalUnits?: number;
  productQuality?: number;
}): number {
  const reaction = reviewReaction(opts.avgReview);
  const quality = opts.productQuality ?? opts.avgReview * 10;
  const base = 100 + opts.avgReview * 75 + Math.max(0, quality - 50) * 0.8;
  const awarenessScale = 0.45 + opts.awareness * 1.35;
  // Established studios get bigger bounce on hits and harder falls on bombs
  const scrutiny = 1 + Math.min(0.55, Math.log10(1 + opts.fansAtLaunch) / 14);
  const pub = opts.publisherFanMult ?? 1;

  // Commercial success: hits ride sales; mediocre/bombs don't gain from pure volume
  const units = Math.max(0, opts.totalUnits ?? 0);
  let successMult = 1;
  if (reaction > 0 && units > 0) {
    // ~2k units mild, 20k strong, 100k+ major hit
    successMult = 1 + Math.min(1.1, Math.log10(1 + units) / 5.5);
  } else if (reaction < 0 && units > 5000) {
    // Visible flop: more people tried it → more leave
    successMult = 1 + Math.min(0.45, Math.log10(1 + units) / 10);
  }

  const raw = base * reaction * awarenessScale * scrutiny * pub * successMult;

  if (raw < 0) {
    // Always lose *some* fans on a bomb if you have any; cap so one game can't wipe studio
    const want = Math.abs(raw) * (0.55 + Math.min(0.45, opts.fansAtLaunch / 120000));
    const capPct = opts.avgReview < 3 ? 0.18 : opts.avgReview < 4.5 ? 0.12 : 0.08;
    const floorLoss =
      opts.fansAtLaunch > 0
        ? Math.min(opts.fansAtLaunch, Math.max(8, Math.round(opts.avgReview < 4 ? 25 : 10)))
        : 0;
    const capped = Math.min(Math.round(opts.fansAtLaunch * capPct), Math.round(want));
    return -Math.max(floorLoss, capped);
  }

  // Hits: higher ceiling so great games actually build a following
  const hitCap =
    opts.avgReview >= 9
      ? 14000 + opts.fansAtLaunch * 0.08
      : opts.avgReview >= 8
        ? 9000 + opts.fansAtLaunch * 0.05
        : 5000 + opts.fansAtLaunch * 0.03;
  return Math.round(clamp(raw, 0, hitCap));
}

/**
 * Weekly buyer → fan conversion (and churn for bad games).
 * Strong scores + sales grow fans; bad scores can shed a few even while selling.
 */
export function salesFanDelta(opts: {
  unitsSold: number;
  avgReview: number;
  productQuality: number;
  marketingHeavy: boolean;
}): number {
  if (opts.unitsSold <= 0) return 0;

  // Bombs: disappointed buyers leave the brand
  if (opts.avgReview < 4.5) {
    const churnRate =
      0.0035 * (4.5 - opts.avgReview) * (opts.marketingHeavy ? 1.4 : 1);
    return -Math.max(1, Math.round(opts.unitsSold * churnRate));
  }

  // Mediocre: weak conversion only
  if (opts.avgReview < 5.5) {
    const weak = 0.002 * (opts.avgReview / 5.5);
    return Math.max(0, Math.round(opts.unitsSold * weak));
  }

  const satisfaction = clamp(
    0.28 + (opts.avgReview / 10) * 0.5 + (opts.productQuality / 100) * 0.22,
    0.08,
    0.98,
  );
  let conversion = 0.014 * satisfaction;

  // Hits convert much better
  if (opts.avgReview >= 9.5) conversion *= 1.85;
  else if (opts.avgReview >= 9) conversion *= 1.55;
  else if (opts.avgReview >= 8) conversion *= 1.3;
  else if (opts.avgReview >= 7) conversion *= 1.05;

  // Heavily marketed weak-ish games convert poorly
  if (opts.marketingHeavy && opts.avgReview < 6.5) conversion *= 0.4;
  if (opts.avgReview >= 8 && !opts.marketingHeavy) conversion *= 1.12;

  return Math.max(0, Math.round(opts.unitsSold * conversion));
}

/** Fan-base economic tier label for UI. */
export function fanTierLabel(fans: number): string {
  if (fans < 500) return "Unknown studio";
  if (fans < 5000) return "Niche following";
  if (fans < 25000) return "Growing audience";
  if (fans < 50000) return "Recognized indie";
  if (fans < 100000) return "Established brand";
  if (fans < 250000) return "Major indie";
  if (fans < 1000000) return "Hit maker";
  return "Industry force";
}
