/**
 * Platform certification (Part 4 §31).
 * PC typically not_required; consoles need pass / waiver / fail.
 */

import type { CertificationResult, CertificationState, ClassifiedBug, RuntimeProfile } from "./types";

const CONSOLE_LIKE = new Set([
  "itara",
  "master_v",
  "playsystem",
  "playsystem_2",
  "playsystem_4",
  "playsystem_5",
  "mbox",
  "mbox_one",
  "mbox_next",
  "mbox_360",
  "swap",
  "nuu",
  "tes",
  "super_tes",
  "dreamvast",
  "gs",
  "2gs",
  "oya",
  "holo_box",
  "vena_genesis_x",
  "vena_oasis",
  "vena_edge",
  "vena_nova",
]);

export function platformNeedsCertification(platformId: string): boolean {
  if (platformId === "pc") return false;
  if (CONSOLE_LIKE.has(platformId)) return true;
  // Handhelds / phones lighter cert
  if (platformId.includes("gameling") || platformId === "grphone" || platformId === "mpad") {
    return true;
  }
  return platformId !== "pc";
}

export function runCertification(opts: {
  platformId: string;
  profile: RuntimeProfile | null;
  bugs: ClassifiedBug[];
  week: number;
  previous?: CertificationState;
}): CertificationState {
  if (!platformNeedsCertification(opts.platformId)) {
    return {
      platformId: opts.platformId,
      result: "not_required",
      attempts: (opts.previous?.attempts ?? 0) + 1,
      issues: [],
      lastCheckedWeek: opts.week,
      waiverNotes: [],
    };
  }

  const issues: string[] = [];
  const open = opts.bugs.filter((b) => b.discovered && !b.fixed);

  for (const b of open) {
    if (b.certificationBlocker) {
      issues.push(`Blocker defect ${b.bugId} (${b.severity}/${b.category})`);
    }
    if (b.saveRisk && b.severity !== "cosmetic") {
      issues.push(`Save integrity risk: ${b.bugId}`);
    }
  }

  if (opts.profile) {
    const criticalAxes = opts.profile.axes.filter(
      (a) => a.relevant && (a.band === "critical" || a.band === "over"),
    );
    for (const a of criticalAxes) {
      if (a.axis === "stability" || a.axis === "memory" || a.axis === "loading" || a.axis === "input") {
        issues.push(`${a.axis} over platform budget (${Math.round(a.utilization * 100)}%)`);
      }
    }
    if (opts.profile.overallHealth < 0.35) {
      issues.push("Overall runtime health below certification floor");
    }
  }

  const hardFails = issues.filter(
    (i) => i.includes("Blocker") || i.includes("Save integrity") || i.includes("stability"),
  );
  let result: CertificationResult;
  const waiverNotes: string[] = [];

  if (hardFails.length > 0) {
    result = "fail";
  } else if (issues.length > 0) {
    result = "pass_with_waivers";
    waiverNotes.push(...issues);
  } else {
    result = "pass";
  }

  return {
    platformId: opts.platformId,
    result,
    attempts: (opts.previous?.attempts ?? 0) + 1,
    issues,
    lastCheckedWeek: opts.week,
    waiverNotes,
  };
}
