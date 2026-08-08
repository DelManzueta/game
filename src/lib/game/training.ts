/**
 * Simple staff training — works when unlocks.training is owned.
 * Courses complete over in-game weeks and permanently raise stats / QA.
 */
import type { DevField, StaffMember } from "./types";

export type TrainingCourseId =
  | "design_foundations"
  | "tech_foundations"
  | "bug_squashing"
  | "speed_lab"
  | "management_basics";

export type TrainingCourse = {
  id: TrainingCourseId;
  name: string;
  description: string;
  cashCost: number;
  rpCost: number;
  weeks: number;
  design: number;
  tech: number;
  speed: number;
  bugFixBonus: number;
  fieldXp?: Partial<Record<DevField, number>>;
};

export const TRAINING_COURSES: TrainingCourse[] = [
  {
    id: "design_foundations",
    name: "Design Foundations",
    description: "Composition, systems feel, and player-facing craft.",
    cashCost: 3_500,
    rpCost: 10,
    weeks: 2,
    design: 7,
    tech: 1,
    speed: 2,
    bugFixBonus: 0,
    fieldXp: { gameplay: 40, story: 30 },
  },
  {
    id: "tech_foundations",
    name: "Tech Foundations",
    description: "Engine literacy, tools, and production discipline.",
    cashCost: 3_500,
    rpCost: 10,
    weeks: 2,
    design: 1,
    tech: 7,
    speed: 2,
    bugFixBonus: 0.03,
    fieldXp: { engine: 40, ai: 25 },
  },
  {
    id: "bug_squashing",
    name: "Bug Squashing Drill",
    description: "Find, classify, and clear defects faster. Pays off in polish.",
    cashCost: 4_000,
    rpCost: 12,
    weeks: 2,
    design: 1,
    tech: 4,
    speed: 2,
    bugFixBonus: 0.12,
    fieldXp: { engine: 20, gameplay: 20 },
  },
  {
    id: "speed_lab",
    name: "Speed Lab",
    description: "Workflow, focus blocks, and shipping cadence.",
    cashCost: 2_500,
    rpCost: 8,
    weeks: 1,
    design: 1,
    tech: 1,
    speed: 9,
    bugFixBonus: 0,
  },
  {
    id: "management_basics",
    name: "Management Basics",
    description: "Delegation and review habits. Small boost across the board.",
    cashCost: 5_000,
    rpCost: 14,
    weeks: 3,
    design: 3,
    tech: 3,
    speed: 4,
    bugFixBonus: 0.04,
  },
];

export function getTrainingCourse(id: string): TrainingCourse | undefined {
  return TRAINING_COURSES.find((c) => c.id === id);
}

export type ActiveTraining = {
  courseId: TrainingCourseId;
  weeksLeft: number;
  totalWeeks: number;
};

export function startTrainingOnMember(
  member: StaffMember,
  course: TrainingCourse,
): StaffMember | string {
  if (member.id === "founder") {
    // Founder can self-study
  }
  if (member.busy) return "Already busy.";
  if (member.training) return "Already in training.";
  return {
    ...member,
    busy: true,
    training: {
      courseId: course.id,
      weeksLeft: course.weeks,
      totalWeeks: course.weeks,
    },
  };
}

export function tickStaffTraining(staff: StaffMember[]): {
  staff: StaffMember[];
  completed: Array<{ name: string; course: string; gains: string }>;
} {
  const completed: Array<{ name: string; course: string; gains: string }> = [];
  const next = staff.map((m) => {
    if (!m.training) return m;
    const left = m.training.weeksLeft - 1;
    if (left > 0) {
      return { ...m, training: { ...m.training, weeksLeft: left } };
    }
    const course = getTrainingCourse(m.training.courseId);
    if (!course) return { ...m, training: null, busy: false };
    const design = Math.min(100, m.design + course.design);
    const tech = Math.min(100, m.tech + course.tech);
    const speed = Math.min(100, m.speed + course.speed);
    const bugFixBonus = Math.min(0.5, (m.bugFixBonus ?? 0) + course.bugFixBonus);
    const fieldExperience = { ...(m.fieldExperience ?? {}) };
    if (course.fieldXp) {
      for (const [k, v] of Object.entries(course.fieldXp)) {
        const key = k as DevField;
        fieldExperience[key] = Math.min(1100, (fieldExperience[key] ?? 0) + (v ?? 0));
      }
    }
    const xp = m.xp + 20 + course.weeks * 8;
    const level = Math.max(m.level, Math.min(10, m.level + (course.weeks >= 3 ? 1 : 0)));
    completed.push({
      name: m.name,
      course: course.name,
      gains: `D+${course.design} T+${course.tech} S+${course.speed}`,
    });
    return {
      ...m,
      design,
      tech,
      speed,
      bugFixBonus,
      fieldExperience,
      xp,
      level,
      training: null,
      busy: false,
      energy: Math.min(100, m.energy + 10),
    };
  });
  return { staff: next, completed };
}
