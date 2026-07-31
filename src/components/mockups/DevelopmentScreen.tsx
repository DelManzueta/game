import { Bug, Pause, Play, Users } from "lucide-react";
import { DockBtn, MOCK, MockShell, Panel, cnJoin } from "./shared";

const STAGES = [
  {
    id: 1,
    name: "Stage 1 · Foundations",
    fields: [
      { name: "Engine", value: 72, focus: true },
      { name: "Gameplay", value: 64, focus: true },
      { name: "Story / Quests", value: 38, focus: false },
    ],
    done: true,
  },
  {
    id: 2,
    name: "Stage 2 · Systems",
    fields: [
      { name: "Dialogues", value: 28, focus: false },
      { name: "Level Design", value: 70, focus: true },
      { name: "A.I.", value: 58, focus: true },
    ],
    done: false,
    active: true,
  },
  {
    id: 3,
    name: "Stage 3 · Presentation",
    fields: [
      { name: "World Design", value: 40, focus: false },
      { name: "Graphics", value: 55, focus: true },
      { name: "Sound", value: 42, focus: false },
    ],
    done: false,
  },
];

export function DevelopmentScreen() {
  return (
    <MockShell
      active="develop"
      phase="garage"
      label="2 · Active development"
      unlockedNav={["studio", "develop", "games", "research", "finances"]}
      dock={
        <>
          <DockBtn>
            <Pause className="size-4" /> Pause
          </DockBtn>
          <DockBtn primary>
            <Play className="size-4" /> Resume 2×
          </DockBtn>
          <DockBtn>
            <Bug className="size-4" /> Polish later
          </DockBtn>
        </>
      }
    >
      <div className="mx-auto max-w-6xl space-y-4">
        {/* Project header */}
        <div className="surface-elevated flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
              In production
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Orbit Skirmish
            </h1>
            <p className="mt-1 text-sm text-muted">
              Space · Action · PC · Small · Engine Basic 1.0
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Counter label="Design" value={42} color="var(--color-design)" />
            <Counter label="Technology" value={51} color="var(--color-tech)" />
            <Counter label="Bugs" value={7} color="var(--color-bugs)" />
            <Counter label="Research" value={"+3"} color="var(--color-research)" />
          </div>
        </div>

        {/* Timeline */}
        <Panel title="Production timeline">
          <div className="relative mb-6">
            <div className="absolute left-0 right-0 top-4 h-1 rounded-full bg-panel" />
            <div className="absolute left-0 top-4 h-1 w-[48%] rounded-full bg-accent" />
            <div className="relative flex justify-between">
              {["Concept", "Stage 1", "Stage 2", "Stage 3", "Polish", "Release"].map(
                (step, i) => (
                  <div key={step} className="flex flex-col items-center gap-2">
                    <div
                      className={cnJoin(
                        "relative z-[1] flex size-8 items-center justify-center rounded-full border-2 text-[10px] font-bold",
                        i <= 2
                          ? "border-accent bg-accent text-accent-fg"
                          : "border-border bg-surface text-subtle",
                      )}
                    >
                      {i + 1}
                    </div>
                    <span className="hidden text-[10px] font-semibold text-muted sm:block">
                      {step}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
          <div className="text-xs text-muted">
            Stage 2 · 62% · Est. 3 weeks remaining at current speed · Founder assigned
          </div>
        </Panel>

        {/* Three stages */}
        <div className="grid gap-4 lg:grid-cols-3">
          {STAGES.map((stage) => (
            <div
              key={stage.id}
              className={cnJoin(
                "surface p-4",
                stage.active && "accent-ring border-accent/40",
                stage.done && "opacity-80",
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold">{stage.name}</h3>
                {stage.done && (
                  <span className="text-[10px] font-bold uppercase text-good">Done</span>
                )}
                {stage.active && (
                  <span className="text-[10px] font-bold uppercase text-accent">Active</span>
                )}
              </div>
              <div className="space-y-4">
                {stage.fields.map((f) => (
                  <div key={f.name}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span
                        className={
                          f.focus ? "font-bold text-accent" : "font-medium text-muted"
                        }
                      >
                        {f.name}
                        {f.focus && " · focus"}
                      </span>
                      <span className="tabular font-semibold">{f.value}%</span>
                    </div>
                    <input type="range" min={0} max={100} value={f.value} readOnly />
                  </div>
                ))}
              </div>
              {stage.active && (
                <div className="mt-4 rounded-[var(--radius-sm)] border border-border bg-elevated p-2.5 text-[11px] leading-relaxed text-muted">
                  Assisted: Level Design & A.I. are high-value for Action this stage.
                  Raising one field pulls time from the others.
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Staff assignment strip */}
        <Panel title="Assignments">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-accent-dim text-sm font-bold text-accent-fg">
              AR
            </div>
            <div>
              <div className="text-sm font-semibold">{MOCK.founder}</div>
              <div className="text-xs text-muted">
                Level Design 55% · A.I. 45% · Energy 71% · XP +2.2 this week
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2 text-xs text-subtle">
              <Users className="size-4" />
              Multi-staff assignments unlock after office move
            </div>
          </div>
        </Panel>
      </div>
    </MockShell>
  );
}

function Counter({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div
      className="min-w-[4.5rem] rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-center"
      style={{ boxShadow: `inset 0 -2px 0 ${color}` }}
    >
      <div className="stat-num text-xl" style={{ color }}>
        {value}
      </div>
      <div className="text-[9px] font-bold uppercase tracking-wider text-subtle">{label}</div>
    </div>
  );
}
