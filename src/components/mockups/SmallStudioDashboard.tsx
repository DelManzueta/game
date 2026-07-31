import { Gamepad2, UserPlus, FileText, FlaskConical } from "lucide-react";
import { DockBtn, MOCK, MockShell, Panel, Portrait, formatCash, formatFans } from "./shared";

export function SmallStudioDashboard() {
  return (
    <MockShell
      active="studio"
      phase="small"
      label="3 · Small studio + staff"
      unlockedNav={["studio", "develop", "games", "staff", "research", "market", "finances"]}
      dock={
        <>
          <DockBtn primary>
            <Gamepad2 className="size-4" /> Develop New Game
          </DockBtn>
          <DockBtn>
            <UserPlus className="size-4" /> Hire
          </DockBtn>
          <DockBtn>
            <FlaskConical className="size-4" /> Research
          </DockBtn>
          <DockBtn>
            <FileText className="size-4" /> Report
          </DockBtn>
        </>
      }
    >
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-12">
        <Panel className="lg:col-span-8" title="Command · Small office">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Harbor Annex · Floor 1
              </h1>
              <p className="mt-1 text-sm text-muted">
                4 desks · payroll {formatCash(7200)}/mo · Medium Games research 1 step away
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-elevated px-4 py-2">
              <div className="text-[10px] font-bold uppercase text-subtle">Team energy</div>
              <div className="stat-num text-2xl text-good">74%</div>
            </div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Portrait name={MOCK.founder} role="Founder · Lead" energy={68} />
            <Portrait name="Sam Okada" role="Tech · Engine" energy={82} accent="#3d7a9a" />
            <Portrait name="Riley Chen" role="Design · Story" energy={55} accent="#9a6a3d" />
            <Portrait name="Jordan Mensah" role="Generalist" energy={91} accent="#5a6a9a" />
          </div>
        </Panel>

        <Panel className="lg:col-span-4" title="Attention">
          <ul className="space-y-3 text-sm">
            <li className="rounded-[var(--radius-md)] border border-warn/30 bg-warn/10 p-3">
              <div className="text-[10px] font-bold uppercase text-warn">Workload</div>
              Riley is at 118% across Story + Dialogues — bug risk rising.
            </li>
            <li className="rounded-[var(--radius-md)] border border-border bg-elevated p-3">
              <div className="text-[10px] font-bold uppercase text-subtle">Contract</div>
              UI kit for publisher — 2 weeks left · {formatCash(14000)}
            </li>
            <li className="rounded-[var(--radius-md)] border border-border bg-elevated p-3">
              <div className="text-[10px] font-bold uppercase text-subtle">Unlock near</div>
              Medium Games researchable after 1 more small release.
            </li>
          </ul>
        </Panel>

        <Panel className="lg:col-span-7" title="Production board">
          <div className="rounded-[var(--radius-md)] border border-accent/30 bg-accent/5 p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-accent">
              Active project
            </div>
            <div className="mt-1 text-xl font-bold">Tidebreakers</div>
            <div className="text-sm text-muted">Pirates · Adventure · PC · Small · Stage 3</div>
            <div className="mt-3 flex flex-wrap gap-4">
              <span className="text-sm">
                <span className="text-design font-bold">D 61</span>
              </span>
              <span className="text-sm">
                <span className="text-tech font-bold">T 44</span>
              </span>
              <span className="text-sm">
                <span className="text-bugs font-bold">Bugs 4</span>
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-panel">
              <div className="h-full w-[82%] rounded-full bg-accent" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-[var(--radius-sm)] border border-border bg-elevated p-2">
              <div className="font-bold">Sam</div>
              <div className="text-subtle">Engine</div>
            </div>
            <div className="rounded-[var(--radius-sm)] border border-border bg-elevated p-2">
              <div className="font-bold">Riley</div>
              <div className="text-subtle">Story</div>
            </div>
            <div className="rounded-[var(--radius-sm)] border border-border bg-elevated p-2">
              <div className="font-bold">Jordan</div>
              <div className="text-subtle">Graphics</div>
            </div>
          </div>
        </Panel>

        <Panel className="lg:col-span-5" title="Studio metrics">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-md)] border border-border bg-elevated p-3">
              <div className="text-[10px] font-bold uppercase text-subtle">Cash</div>
              <div className="stat-num text-2xl text-cash">{formatCash(842_000)}</div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-elevated p-3">
              <div className="text-[10px] font-bold uppercase text-subtle">Fans</div>
              <div className="stat-num text-2xl text-fans">{formatFans(48_200)}</div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-elevated p-3">
              <div className="text-[10px] font-bold uppercase text-subtle">Avg review</div>
              <div className="stat-num text-2xl">7.1</div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-elevated p-3">
              <div className="text-[10px] font-bold uppercase text-subtle">XP this month</div>
              <div className="stat-num text-2xl text-research">+124</div>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-subtle">
            Staff gain field XP from assigned stages. Training is a supplement — not a
            substitute for shipping games.
          </p>
        </Panel>
      </div>
    </MockShell>
  );
}
