/**
 * Release-readiness gates (Part 4 §§32–34).
 * Player may override internal recommendations; cannot override platform rejection.
 */

import { runCertification, platformNeedsCertification } from "./certification";
import { estimateHiddenDefectRisk } from "./bugs";
import type {
  ClassifiedBug,
  ProjectTechSpec,
  ReleaseReadiness,
  RuntimeProfile,
} from "./types";

export function evaluateReleaseReadiness(opts: {
  tech: ProjectTechSpec;
  featureCompletion: number;
  bugs: ClassifiedBug[];
  wantsOnline: boolean;
  serverCapacityOk?: boolean;
  localizationOk?: boolean;
  accessibilityOk?: boolean;
  week: number;
  size: string;
  forceShip?: boolean;
}): { readiness: ReleaseReadiness; tech: ProjectTechSpec } {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const profile = opts.tech.profile;

  // Bugs
  const openBlockers = opts.bugs.filter(
    (b) => b.discovered && !b.fixed && (b.severity === "blocker" || b.certificationBlocker),
  );
  const openCritical = opts.bugs.filter(
    (b) => b.discovered && !b.fixed && b.severity === "critical",
  );
  const openSave = opts.bugs.filter((b) => b.discovered && !b.fixed && b.saveRisk);
  const openSecurity = opts.bugs.filter((b) => b.discovered && !b.fixed && b.securityRisk);

  for (const b of openBlockers) blockers.push(`Blocker bug: ${b.bugId} (${b.category})`);
  for (const b of openSave) {
    if (b.severity !== "cosmetic") blockers.push(`Save-risk bug: ${b.bugId}`);
  }
  for (const b of openSecurity) blockers.push(`Security bug: ${b.bugId}`);
  for (const b of openCritical) warnings.push(`Critical open: ${b.bugId}`);

  // Features
  if (opts.featureCompletion < 0.6) {
    blockers.push("Mandatory features below 60% completion");
  } else if (opts.featureCompletion < 0.85) {
    warnings.push("Feature completion under 85% — expect polish complaints");
  }

  // Performance
  let performanceOk = true;
  if (profile) {
    if (profile.overallHealth < 0.35) {
      performanceOk = false;
      blockers.push(
        `Runtime health critical (${Math.round(profile.overallHealth * 100)}%) — weakest: ${profile.weakestCriticalAxis}`,
      );
    } else if (profile.overallHealth < 0.55) {
      performanceOk = false;
      warnings.push(
        `Runtime health weak (${Math.round(profile.overallHealth * 100)}%). Shipping risks technical review penalty.`,
      );
    } else if (profile.overallHealth < 0.75) {
      warnings.push("Runtime health only fair — limited technical review benefit.");
    }
    for (const n of profile.notes.slice(0, 3)) warnings.push(n);
  }

  // Stability
  const stabilityOk = openBlockers.length === 0 && openSave.length === 0;
  if (!stabilityOk) {
    /* blockers already listed */
  }

  // Hidden risk
  const hidden = estimateHiddenDefectRisk({
    complexity: opts.size === "aaa" ? 3 : opts.size === "large" ? 2.2 : opts.size === "medium" ? 1.4 : 0.9,
    novelty: 1.1,
    debt: opts.tech.technicalDebt,
    schedulePressure: opts.featureCompletion < 0.85 ? 0.4 : 0.1,
    platformCount: opts.tech.platforms.length,
    qaStrength: 0.5 + (1 - (openCritical.length + openBlockers.length) * 0.1),
    engineMaturity: profile?.confidence ?? 0.4,
  });
  if (hidden.band === "high" || hidden.band === "severe") {
    warnings.push(hidden.note);
  }

  // Certification
  const certifications = opts.tech.platforms.map((p) => {
    const prev = opts.tech.certifications.find((c) => c.platformId === p);
    return runCertification({
      platformId: p,
      profile,
      bugs: opts.bugs,
      week: opts.week,
      previous: prev,
    });
  });

  let platformBlocksRelease = false;
  for (const c of certifications) {
    if (c.result === "fail") {
      blockers.push(`Certification FAILED on ${c.platformId}: ${c.issues[0] ?? "requirements"}`);
      platformBlocksRelease = true;
    } else if (c.result === "pass_with_waivers") {
      warnings.push(`Certification waived on ${c.platformId}`);
    } else if (c.result === "pending" && platformNeedsCertification(c.platformId)) {
      warnings.push(`Certification still pending on ${c.platformId}`);
    }
  }

  // Server
  const serverReady = !opts.wantsOnline || opts.serverCapacityOk !== false;
  if (opts.wantsOnline && !serverReady) {
    blockers.push("Online game requires approved server capacity");
  }

  const localizationOk = opts.localizationOk !== false;
  const accessibilityOk = opts.accessibilityOk !== false;

  // Recommendation
  let recommendation: ReleaseReadiness["recommendation"] = "ship";
  let recommendationReason = "All release gates look acceptable.";

  if (platformBlocksRelease || openBlockers.length || openSave.length || openSecurity.length) {
    recommendation = "blocked";
    recommendationReason = platformBlocksRelease
      ? "Platform holder rejection cannot be overridden."
      : "Blocker / save / security issues must be fixed.";
  } else if (!performanceOk || openCritical.length > 0 || opts.featureCompletion < 0.85) {
    recommendation = "hold";
    recommendationReason =
      "Ship is possible but internal recommendation is to hold for critical/performance work.";
  } else if (warnings.length > 2 || hidden.band === "high") {
    recommendation = "ship_with_risk";
    recommendationReason = "Shippable with elevated post-launch risk.";
  }

  if (opts.forceShip && recommendation === "hold") {
    recommendation = "ship_with_risk";
    recommendationReason = "Player override of internal hold — platform still must allow.";
  }
  if (opts.forceShip && recommendation === "blocked" && !platformBlocksRelease) {
    recommendation = "ship_with_risk";
    recommendationReason = "Player override of internal blockers (non-platform).";
  }

  // Technical review hint: modest benefit when strong; major penalty when bad (asymmetric)
  const technicalReviewHint = computeTechnicalReviewHint(profile, opts.bugs, recommendation);

  const readiness: ReleaseReadiness = {
    buildId: profile?.buildId ?? `build_${opts.week}`,
    featureCompletion: opts.featureCompletion,
    performanceOk,
    stabilityOk,
    blockers,
    warnings: unique(warnings).slice(0, 10),
    certification: certifications,
    localizationOk,
    accessibilityOk,
    serverReady,
    recommendation,
    recommendationReason,
    technicalReviewHint,
    canOverrideInternal: !platformBlocksRelease,
    platformBlocksRelease,
  };

  return {
    readiness,
    tech: { ...opts.tech, certifications, readiness },
  };
}

/**
 * Asymmetric: good tech = modest boost; bad tech = heavy penalty.
 * Does not create design quality.
 */
export function computeTechnicalReviewHint(
  profile: RuntimeProfile | null,
  bugs: ClassifiedBug[],
  recommendation: ReleaseReadiness["recommendation"],
): number {
  let score = 0;
  if (profile) {
    if (profile.overallHealth >= 0.9) score += 0.35;
    else if (profile.overallHealth >= 0.75) score += 0.15;
    else if (profile.overallHealth >= 0.55) score += 0;
    else if (profile.overallHealth >= 0.35) score -= 0.55;
    else score -= 1.2;
  }
  const openMajor = bugs.filter(
    (b) => b.discovered && !b.fixed && (b.severity === "major" || b.severity === "critical"),
  ).length;
  score -= openMajor * 0.12;
  if (recommendation === "blocked") score -= 0.8;
  if (recommendation === "hold") score -= 0.25;
  return Math.max(-2, Math.min(0.5, score));
}

function unique(arr: string[]): string[] {
  return [...new Set(arr)];
}

/** Apply technical review delta to a 0–10 review average (modest). */
export function applyTechnicalReviewToScore(avgReview: number, techHint: number): number {
  // techHint is roughly -2..+0.5 on a 10-pt scale contribution
  return Math.max(1, Math.min(10, avgReview + techHint * 0.85));
}
