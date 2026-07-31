import { ArrowRight, Bug, FileText, FlaskConical, Gamepad2, Sparkles } from "lucide-react";
import { DockBtn, MOCK, MockShell, Panel, Portrait, formatCash, formatFans } from "./shared";

export function GarageDashboard() {
  return (
    <MockShell
      active="studio"
      phase="garage"
      label="1 · Garage dashboard"
      unlockedNav={["studio", "develop", "games", "research", "finances"]}
      dock={
        <>
          <DockBtn primary>
            <Gamepad2 className="size-4" /> Develop New Game
          </DockBtn>
          <DockBtn>
            <FileText className="size-4" /> Create Report
          </DockBtn>
          <DockBtn>
            <FlaskConical className="size-4" /> Research
          </DockBtn>
        </>
      }
    >
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-12">
        {/* Primary: next action / current project */}
        <Panel className="era-pixel lg:col-span-7" title="Command · Garage">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-accent">
                Ready to develop
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Your next release decides the office.
              </h1>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                Neon Harbor still runs out of a converted garage. Small games only. One
                founder. Learn the market through reports — no AAA noise yet.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-border bg-panel px-3 py-1 text-xs font-semibold text-muted">
                  Size · Small only
                </span>
                <span className="rounded-full border border-border bg-panel px-3 py-1 text-xs font-semibold text-muted">
                  Platform · PC / G64
                </span>
                <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                  Office · 2 games away
                </span>
              </div>
            </div>
            <div className="surface-elevated w-full shrink-0 p-4 sm:w-52">
              <div className="text-[10px] font-bold uppercase tracking-wider text-subtle">
                Cash runway
              </div>
              <div className="stat-num mt-1 text-3xl text-cash">{MOCK.runwayWeeks}w</div>
              <div className="mt-1 text-xs text-muted">at current burn</div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-panel">
                <div className="h-full w-[72%] rounded-full bg-cash" />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-subtle">
                <span>Safe</span>
                <span>Office goal $1M</span>
              </div>
            </div>
          </div>
        </Panel>

        {/* Studio status strip */}
        <Panel className="lg:col-span-5" title="Studio pulse">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Reputation" value={`${MOCK.reputation}`} sub="Regional" />
            <Metric label="Fans" value={formatFans(MOCK.fans)} sub="+840 last title" />
            <Metric label="Research" value={`${MOCK.research} RP`} sub="1 project ready" />
            <Metric label="Best score" value="8.2" sub="Starfall Protocol" />
          </div>
        </Panel>

        {/* Market pulse */}
        <Panel className="lg:col-span-4" title="Market pulse">
          <ul className="space-y-3">
            <News
              tag="Trend"
              text="Military sims are heating up on PC this season."
              tone="accent"
            />
            <News
              tag="Platform"
              text="G64 installed base peaking — strong for action/casual."
              tone="tech"
            />
            <News
              tag="Industry"
              text="Rivals shipping arcade ports; garage exclusives still rare."
              tone="muted"
            />
          </ul>
        </Panel>

        {/* Recent games */}
        <Panel className="lg:col-span-5" title="Recent games">
          <div className="space-y-2">
            <GameRow
              title="Starfall Protocol"
              meta="Space · Action · PC"
              score={8.2}
              sales="$214K"
              status="On sale · W3"
            />
            <GameRow
              title="Dungeon Bits"
              meta="Dungeon · Adventure · G64"
              score={6.5}
              sales="$61K"
              status="Catalog"
            />
            <GameRow
              title="Pixel Pit Crew"
              meta="Racing · Casual · G64"
              score={5.8}
              sales="$38K"
              status="Catalog"
            />
          </div>
        </Panel>

        {/* Staff strip — founder only */}
        <Panel className="lg:col-span-3" title="Team">
          <Portrait name={MOCK.founder} role="Founder · Design/Tech" energy={78} />
          <p className="mt-3 text-xs leading-relaxed text-subtle">
            Hiring unlocks after the first office. Experience is already growing from
            hands-on development.
          </p>
        </Panel>

        {/* Objective */}
        <Panel className="border-accent/25 bg-accent/5 lg:col-span-12" title="Next unlock">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-[var(--radius-md)] bg-accent text-accent-fg">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-bold">Small Office opportunity</div>
              <p className="text-sm text-muted">
                Release 2 more games · hold $1M · one title ≥ 8.0 — then expand and hire.
              </p>
              <div className="mt-2 h-2 max-w-md overflow-hidden rounded-full bg-panel">
                <div className="h-full w-[60%] rounded-full bg-accent" />
              </div>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm font-bold text-accent"
            >
              View requirements <ArrowRight className="size-4" />
            </button>
          </div>
        </Panel>
      </div>
    </MockShell>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-elevated p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-subtle">{label}</div>
      <div className="stat-num mt-0.5 text-xl">{value}</div>
      <div className="text-[11px] text-muted">{sub}</div>
    </div>
  );
}

function News({ tag, text, tone }: { tag: string; text: string; tone: string }) {
  const c =
    tone === "accent"
      ? "text-accent"
      : tone === "tech"
        ? "text-tech"
        : "text-muted";
  return (
    <li className="border-b border-border pb-3 last:border-0 last:pb-0">
      <span className={`text-[10px] font-bold uppercase tracking-wider ${c}`}>{tag}</span>
      <p className="mt-0.5 text-sm text-fg/90">{text}</p>
    </li>
  );
}

function GameRow({
  title,
  meta,
  score,
  sales,
  status,
}: {
  title: string;
  meta: string;
  score: number;
  sales: string;
  status: string;
}) {
  const scoreColor =
    score >= 8 ? "text-good" : score >= 6 ? "text-fg" : "text-warn";
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-elevated p-2.5">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-panel text-xs font-bold text-subtle">
        BOX
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{title}</div>
        <div className="truncate text-[11px] text-subtle">{meta}</div>
        <div className="text-[11px] text-muted">{status}</div>
      </div>
      <div className="text-right">
        <div className={`stat-num text-lg ${scoreColor}`}>{score.toFixed(1)}</div>
        <div className="text-[11px] text-cash">{sales}</div>
      </div>
    </div>
  );
}
