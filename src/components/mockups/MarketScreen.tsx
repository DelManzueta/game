import { DockBtn, MockShell, Panel, cnJoin } from "./shared";

const PLATFORMS = [
  {
    name: "PC",
    share: 34,
    phase: "Growth",
    license: "Owned",
    tone: "good",
    note: "Strong for strategy & sim",
  },
  {
    name: "Govodore 64",
    share: 41,
    phase: "Peak",
    license: "Owned",
    tone: "accent",
    note: "Mass market · action/casual",
  },
  {
    name: "Arcade Cabinet",
    share: 18,
    phase: "Decline",
    license: "Available · $15K",
    tone: "warn",
    note: "Short sales window",
  },
  {
    name: "mision",
    share: 0,
    phase: "Announced",
    license: "Dev kits · Y+1",
    tone: "tech",
    note: "Rumored strong sports support",
  },
];

const CHART = [
  { name: "RivalSoft", title: "Neon Drift", score: 8.4, sales: " complement2.1K" },
  { name: "PixelFoundry", title: "Castle Bits", score: 7.9, sales: " 98.4K" },
  { name: "Neon Harbor", title: "Starfall Protocol", score: 8.2, sales: " 84.0K", you: true },
  { name: "ByteWest", title: "Farm Tycoon '87", score: 7.1, sales: " 71.2K" },
  { name: "Arcade House", title: "Blaster Cab", score: 6.8, sales: " 66.5K" },
];

export function MarketScreen() {
  return (
    <MockShell
      active="market"
      phase="small"
      label="5 · Market & platforms"
      unlockedNav={["studio", "develop", "games", "staff", "research", "market", "finances"]}
      dock={
        <>
          <DockBtn primary>License platform</DockBtn>
          <DockBtn>Market report</DockBtn>
        </>
      }
    >
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-12">
        <div className="lg:col-span-12">
          <h1 className="text-2xl font-bold tracking-tight">Market & platforms</h1>
          <p className="text-sm text-muted">
            Lifecycle-aware platforms. Exact future share stays hidden until release.
          </p>
        </div>

        <Panel className="lg:col-span-7" title="Platform landscape · 1987">
          <div className="space-y-3">
            {PLATFORMS.map((p) => (
              <div
                key={p.name}
                className="rounded-[var(--radius-md)] border border-border bg-elevated p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold">{p.name}</div>
                    <div className="text-xs text-muted">{p.note}</div>
                  </div>
                  <div className="text-right">
                    <span
                      className={cnJoin(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        p.tone === "good" && "bg-good/15 text-good",
                        p.tone === "accent" && "bg-accent/15 text-accent",
                        p.tone === "warn" && "bg-warn/15 text-warn",
                        p.tone === "tech" && "bg-tech/15 text-tech",
                      )}
                    >
                      {p.phase}
                    </span>
                    <div className="mt-1 text-xs text-subtle">{p.license}</div>
                  </div>
                </div>
                {p.share > 0 ? (
                  <div className="mt-2">
                    <div className="mb-1 flex justify-between text-[11px] text-subtle">
                      <span>Market share</span>
                      <span className="tabular font-semibold text-fg">{p.share}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-panel">
                      <div
                        className="h-full rounded-full bg-fans"
                        style={{ width: `${p.share}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-tech">
                    Pre-release — limited specs only. Full analytics after launch.
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="lg:col-span-5" title="Weekly sales chart">
          <div className="space-y-2">
            {CHART.map((row, i) => (
              <div
                key={row.title}
                className={cnJoin(
                  "flex items-center gap-3 rounded-[var(--radius-md)] border p-2.5",
                  row.you
                    ? "border-accent/40 bg-accent/10"
                    : "border-border bg-elevated",
                )}
              >
                <div className="stat-num w-6 text-center text-muted">{i + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{row.title}</div>
                  <div className="truncate text-[11px] text-subtle">{row.name}</div>
                </div>
                <div className="text-right">
                  <div className="stat-num text-sm">{row.score.toFixed(1)}</div>
                  <div className="text-[11px] text-cash">{row.sales.trim()}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-subtle">
            Rivals use the same quality rules. Detailed rival dossiers unlock in the
            established-studio phase.
          </p>
        </Panel>

        <Panel className="lg:col-span-12" title="Genre heat · this quarter">
          <div className="flex flex-wrap gap-2">
            {[
              ["Action", 92],
              ["Adventure", 70],
              ["Simulation", 64],
              ["Strategy", 55],
              ["Casual", 48],
              ["RPG", 40],
            ].map(([g, h]) => (
              <div
                key={g as string}
                className="min-w-[7rem] flex-1 rounded-[var(--radius-md)] border border-border bg-elevated p-3"
              >
                <div className="text-sm font-bold">{g}</div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel">
                  <div
                    className="h-full rounded-full bg-hype"
                    style={{ width: `${h}%` }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-subtle">Heat {h as number}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </MockShell>
  );
}
