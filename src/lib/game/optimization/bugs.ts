/**
 * Bug classification, priority, detection (Part 4 §§26–30).
 */

import type { ProductionBug } from "../production/algorithm";
import { SEVERITY_RANK, type BugCategory, type BugSeverity, type ClassifiedBug } from "./types";

function severityFromProduction(sev: number): BugSeverity {
  if (sev >= 5) return "blocker";
  if (sev >= 4) return "critical";
  if (sev >= 3) return "major";
  if (sev >= 2) return "minor";
  return "cosmetic";
}

function categoryFromDiscipline(discipline: string): BugCategory {
  const d = discipline.toLowerCase();
  if (d.includes("save") || d === "engine") return "save";
  if (d.includes("network") || d === "online") return "network";
  if (d === "graphics" || d === "world") return "graphics";
  if (d === "sound" || d === "audio") return "audio";
  if (d === "ai" || d === "gameplay" || d === "level_design") return "quest";
  if (d === "dialogues" || d === "story") return "quest";
  if (d === "ui") return "ui";
  return "other";
}

/**
 * BUG PRIORITY = Severity × Exposure × CertRisk × RepRisk × DataLoss
 *               / (FixWork × RegressionRisk)
 */
export function computeBugPriority(b: {
  severity: BugSeverity;
  exposure: number;
  certificationBlocker: boolean;
  saveRisk: boolean;
  securityRisk: boolean;
  remainingWork: number;
  regressionRisk: number;
}): number {
  const sev = SEVERITY_RANK[b.severity];
  const cert = b.certificationBlocker ? 1.5 : 1;
  const rep = b.securityRisk ? 1.4 : b.severity === "blocker" ? 1.3 : 1;
  const data = b.saveRisk ? 1.5 : 1;
  const work = Math.max(0.5, b.remainingWork / 100);
  const reg = Math.max(0.4, 1 + b.regressionRisk);
  return (sev * b.exposure * cert * rep * data) / (work * reg);
}

export function classifyProductionBug(
  bug: ProductionBug,
  platforms: string[],
): ClassifiedBug {
  const severity = severityFromProduction(bug.severity);
  const category = categoryFromDiscipline(bug.discipline);
  const saveRisk = category === "save" || severity === "blocker";
  const securityRisk = category === "security";
  const certificationBlocker =
    severity === "blocker" || (severity === "critical" && (saveRisk || category === "crash"));
  const exposure =
    severity === "blocker"
      ? 1
      : severity === "critical"
        ? 0.85
        : severity === "major"
          ? 0.55
          : severity === "minor"
            ? 0.3
            : 0.12;
  const regressionRisk = 0.1 + bug.severity * 0.04;
  const fixed = bug.remainingWork <= 0;
  const base: ClassifiedBug = {
    bugId: bug.bugId,
    category: severity === "blocker" && bug.discipline === "engine" ? "crash" : category,
    severity,
    exposure,
    affectedPlatforms: platforms,
    discovered: true,
    fixed,
    verified: fixed,
    remainingWork: Math.max(0, bug.remainingWork),
    regressionRisk,
    certificationBlocker,
    saveRisk,
    securityRisk,
    priority: 0,
    discipline: bug.discipline,
    sourceStage: bug.sourceStage,
  };
  base.priority = computeBugPriority(base);
  return base;
}

export function classifyAllBugs(
  bugs: ProductionBug[],
  platforms: string[],
): ClassifiedBug[] {
  return bugs
    .map((b) => classifyProductionBug(b, platforms))
    .sort((a, b) => b.priority - a.priority);
}

/** Hidden defect risk estimate — never an exact count of undiscovered bugs. */
export function estimateHiddenDefectRisk(opts: {
  complexity: number;
  novelty: number;
  debt: number;
  schedulePressure: number;
  platformCount: number;
  qaStrength: number;
  engineMaturity: number;
}): { risk: number; band: "low" | "moderate" | "high" | "severe"; note: string } {
  const raw =
    opts.complexity *
    opts.novelty *
    (1 + opts.debt / 50) *
    (1 + opts.schedulePressure) *
    (1 + (opts.platformCount - 1) * 0.15);
  const reduced = raw / (0.5 + opts.qaStrength * 0.8 + opts.engineMaturity * 0.6);
  const risk = Math.max(0, Math.min(1, reduced / 8));
  const band =
    risk < 0.25 ? "low" : risk < 0.5 ? "moderate" : risk < 0.75 ? "high" : "severe";
  const note =
    band === "low"
      ? "Hidden-defect risk looks manageable."
      : band === "moderate"
        ? "Some unknown issues likely remain — more QA will surface them."
        : band === "high"
          ? "Elevated unknown-defect risk. Do not treat the bug list as complete."
          : "Severe unknown-defect risk. Ship only with eyes open.";
  return { risk, band, note };
}
