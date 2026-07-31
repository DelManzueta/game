import type { DevField, ResearchJob, ResearchItem, StaffMember } from "./types";
import { RESEARCH, TOPICS } from "./data";

export type ResearchFocus = DevField | "design" | "tech";

export function researchFocusFor(
  kind: "tech" | "topic",
  targetId: string,
): ResearchFocus {
  if (kind === "topic") return "story";
  const item = RESEARCH.find((r) => r.id === targetId);
  if (!item) return "tech";
  const cat = (item.category || "").toLowerCase();
  if (item.engineFeature || cat === "engine" || cat.includes("engine")) return "engine";
  if (cat === "graphics" || cat.includes("graphic") || cat.includes("3d")) return "graphics";
  if (cat === "sound" || cat.includes("audio")) return "sound";
  if (cat === "gameplay" || cat.includes("gameplay")) return "gameplay";
  if (cat === "dialogue" || cat.includes("dialogue")) return "dialogue";
  if (cat.includes("story") || cat.includes("quest") || cat.includes("narrative")) return "story";
  if (cat.includes("level")) return "level";
  if (cat.includes("world")) return "world";
  if (cat.includes("a.i") || cat.includes("ai") || cat.includes("intelligence")) return "ai";
  if (cat === "studio" || cat === "production") {
    if (item.designBoost && !item.techBoost) return "design";
    if (item.techBoost && !item.designBoost) return "tech";
    return "design";
  }
  if ((item.techBoost ?? 0) > (item.designBoost ?? 0)) return "tech";
  if ((item.designBoost ?? 0) > (item.techBoost ?? 0)) return "design";
  return "tech";
}

export function staffFocusScore(m: StaffMember, focus: ResearchFocus): number {
  if (focus === "design") return m.design + m.level * 8 + m.speed * 0.15;
  if (focus === "tech") return m.tech + m.level * 8 + m.speed * 0.15;
  const fe = m.fieldExperience?.[focus] ?? 0;
  const spec = m.specialization === focus ? 55 : 0;
  const techish = focus === "engine" || focus === "ai" || focus === "graphics" || focus === "sound";
  const base = techish ? m.tech : m.design;
  return base + fe * 1.2 + spec + m.level * 6 + m.speed * 0.1;
}

export function freeResearchStaff(
  staff: StaffMember[],
  activeJobs: ResearchJob[],
): StaffMember[] {
  const taken = new Set(
    activeJobs.map((j) => j.assigneeId).filter((id): id is string => !!id),
  );
  return staff.filter((m) => !taken.has(m.id) && (m.energy ?? 0) > 5);
}

export function pickBestAssignee(
  staff: StaffMember[],
  focus: ResearchFocus,
  activeJobs: ResearchJob[],
): StaffMember | null {
  const free = freeResearchStaff(staff, activeJobs);
  if (!free.length) return null;
  let best = free[0]!;
  let bestScore = staffFocusScore(best, focus);
  for (let i = 1; i < free.length; i++) {
    const m = free[i]!;
    const sc = staffFocusScore(m, focus);
    if (sc > bestScore) {
      best = m;
      bestScore = sc;
    }
  }
  return best;
}

/** Strong specialists finish up to ~30% faster. */
export function adjustedResearchWeeks(
  baseWeeks: number,
  staff: StaffMember | null,
  focus: ResearchFocus,
): number {
  if (!staff) return Math.max(1, baseWeeks);
  const score = staffFocusScore(staff, focus);
  // Rough: 45 baseline → 0 bonus; 120+ → ~30% faster
  const factor = Math.max(0.7, Math.min(1, 1.15 - score / 400));
  return Math.max(1, Math.round(baseWeeks * factor));
}

export function researchBaseWeeks(kind: "tech" | "topic", targetId: string): number {
  if (kind === "topic") {
    const t = TOPICS.find((x) => x.id === targetId);
    return 2;
  }
  const item = RESEARCH.find((r) => r.id === targetId) as ResearchItem | undefined;
  if (!item) return 3;
  return item.weeks ?? Math.max(2, Math.ceil(item.cost / 25));
}

export function researchCost(kind: "tech" | "topic", targetId: string): number | null {
  if (kind === "topic") {
    const t = TOPICS.find((x) => x.id === targetId);
    return t ? t.researchCost : null;
  }
  const item = RESEARCH.find((r) => r.id === targetId);
  return item ? item.cost : null;
}

export function researchDisplayName(kind: "tech" | "topic", targetId: string): string {
  if (kind === "topic") return TOPICS.find((t) => t.id === targetId)?.name ?? targetId;
  return RESEARCH.find((r) => r.id === targetId)?.name ?? targetId;
}

export function assignJobToStaff(
  job: ResearchJob,
  staff: StaffMember,
  focus: ResearchFocus,
): ResearchJob {
  const weeks = adjustedResearchWeeks(job.totalWeeks || job.weeksLeft, staff, focus);
  return {
    ...job,
    assigneeId: staff.id,
    assigneeName: staff.name,
    focusField: focus,
    weeksLeft: weeks,
    totalWeeks: weeks,
  };
}

/** Pull as many queued jobs as free staff allow. */
export function promoteQueue(
  queue: ResearchJob[],
  active: ResearchJob[],
  staff: StaffMember[],
): { queue: ResearchJob[]; active: ResearchJob[]; started: ResearchJob[] } {
  let q = [...queue];
  let a = [...active];
  const started: ResearchJob[] = [];
  while (q.length) {
    const next = q[0]!;
    const focus = next.focusField ?? researchFocusFor(next.kind, next.targetId);
    const person = pickBestAssignee(staff, focus, a);
    if (!person) break;
    q = q.slice(1);
    const assigned = assignJobToStaff(
      { ...next, focusField: focus, totalWeeks: next.totalWeeks || next.weeksLeft },
      person,
      focus,
    );
    a.push(assigned);
    started.push(assigned);
  }
  return { queue: q, active: a, started };
}
