/**
 * Optimization task execution (Part 4 §§7–8).
 * No generic "Optimize Game" magic bar — tasks target a specific axis.
 */

import type {
  OptimizationTask,
  OptimizationTaskState,
  ProjectTechSpec,
  RuntimeProfile,
} from "./types";

export function applyOptimizationWeek(
  tech: ProjectTechSpec,
  taskId: string,
  staffPower: number,
): {
  tech: ProjectTechSpec;
  note: string;
  qualityHit: number;
} {
  const tasks = tech.tasks.map((t) => ({ ...t }));
  const idx = tasks.findIndex((t) => t.taskId === taskId);
  if (idx < 0) {
    return { tech, note: "Unknown optimization task.", qualityHit: 0 };
  }
  const task = tasks[idx]!;
  if (task.state === "done" || task.state === "cancelled") {
    return { tech, note: "Task already closed.", qualityHit: 0 };
  }

  const work = Math.max(8, staffPower * 24);
  const completedWork = task.completedWork + work;
  let state: OptimizationTaskState =
    task.state === "discovered" ? "in_progress" : task.state;
  let qualityHit = 0;
  let debt = tech.technicalDebt;
  let profile = tech.profile;

  if (completedWork >= task.estimatedWork) {
    state = "done";
    debt = Math.max(0, debt + task.debtChange);
    qualityHit = task.qualityTradeoff;
    if (profile) {
      profile = improveProfileAxis(profile, task.affectedAxis, task.expectedImprovement);
    }
  } else {
    state = "in_progress";
  }

  tasks[idx] = { ...task, completedWork: Math.min(task.estimatedWork, completedWork), state };

  const note =
    state === "done"
      ? `Finished: ${task.label}${qualityHit > 0.03 ? " (visible quality tradeoff)." : "."}`
      : `Progress on ${task.label}: ${Math.round((completedWork / task.estimatedWork) * 100)}%.`;

  return {
    tech: { ...tech, tasks, technicalDebt: debt, profile },
    note,
    qualityHit,
  };
}

function improveProfileAxis(
  profile: RuntimeProfile,
  axis: OptimizationTask["affectedAxis"],
  improvement: number,
): RuntimeProfile {
  const axes = profile.axes.map((a) => {
    if (a.axis !== axis) return a;
    const utilization = Math.max(0.2, a.utilization * (1 - improvement));
    const health =
      utilization < 0.75
        ? 1
        : utilization < 0.9
          ? 0.92
          : utilization < 1
            ? 0.78
            : utilization < 1.15
              ? 0.45
              : 0.2;
    const band =
      utilization < 0.75
        ? ("comfortable" as const)
        : utilization < 0.9
          ? ("healthy" as const)
          : utilization < 1
            ? ("tight" as const)
            : utilization < 1.15
              ? ("over" as const)
              : ("critical" as const);
    return { ...a, utilization, health, demand: a.budget * utilization, band };
  });
  const relevant = axes.filter((a) => a.relevant);
  let weakest = relevant[0]!;
  for (const a of relevant) if (a.health < weakest.health) weakest = a;
  let logSum = 0;
  let wSum = 0;
  for (const a of relevant) {
    logSum += Math.log(Math.max(0.05, a.health));
    wSum += 1;
  }
  const geo = wSum > 0 ? Math.exp(logSum / wSum) : 0.5;
  const overallHealth = Math.min(1, Math.min(geo, weakest.health + 0.08));
  return {
    ...profile,
    axes,
    overallHealth,
    weakestCriticalAxis: weakest.axis,
    weakestHealth: weakest.health,
    notes: [
      `Applied optimization on ${axis}.`,
      ...profile.notes.filter((n) => !n.toLowerCase().includes(axis)),
    ].slice(0, 8),
  };
}

export function queueTask(tech: ProjectTechSpec, taskId: string): ProjectTechSpec {
  return {
    ...tech,
    tasks: tech.tasks.map((t) =>
      t.taskId === taskId && t.state === "discovered" ? { ...t, state: "queued" } : t,
    ),
  };
}
