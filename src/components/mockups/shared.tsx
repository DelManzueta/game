import type { ReactNode } from "react";
import {
  Building2,
  ChartColumn,
  CircleDollarSign,
  FlaskConical,
  Gamepad2,
  Pause,
  Play,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function cnJoin(...p: Array<string | false | null | undefined>) {
  return p.filter(Boolean).join(" ");
}

/** Mock campaign data used across all approval screens */
export const MOCK = {
  studio: "Neon Harbor Games",
  founder: "Alex Rivera",
  date: "Y1987 M3 W2",
  campaignYear: 5,
  era: "8-Bit Expansion",
  cash: 184_200,
  monthlyBurn: 4_800,
  fans: 12_480,
  research: 86,
  reputation: 62,
  runwayWeeks: 38,
  office: "Garage",
  infoMode: "Assisted" as const,
};

export function formatCash(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

export function formatFans(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

type NavId = "studio" | "develop" | "games" | "staff" | "research" | "market" | "finances";

const NAV: { id: NavId; label: string; icon: typeof Gamepad2; unlocked: boolean }[] = [
  { id: "studio", label: "Studio", icon: Building2, unlocked: true },
  { id: "develop", label: "Develop", icon: Gamepad2, unlocked: true },
  { id: "games", label: "Games", icon: ChartColumn, unlocked: true },
  { id: "staff", label: "Staff", icon: Users, unlocked: false },
  { id: "research", label: "Research", icon: FlaskConical, unlocked: true },
  { id: "market", label: "Market", icon: Zap, unlocked: true },
  { id: "finances", label: "Finances", icon: Wallet, unlocked: true },
];

export function MockShell({
  active,
  phase,
  children,
  dock,
  unlockedNav,
  label,
}: {
  active: NavId;
  phase: "garage" | "small" | "established";
  children: ReactNode;
  dock?: ReactNode;
  unlockedNav?: NavId[];
  label: string;
}) {
  const unlocked = new Set(unlockedNav ?? NAV.filter((n) => n.unlocked).map((n) => n.id));
  if (phase !== "garage") unlocked.add("staff");

  return (
    <div className="shell-bg relative flex min-h-[100dvh] flex-col text-fg">
      <span className="mock-label">Mock · {label}</span>
      <TopBar phase={phase} />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-48 shrink-0 flex-col border-r border-border bg-bg-deep/80 p-3 md:flex">
          <div className="mb-4 px-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">
              Navigate
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.filter((n) => unlocked.has(n.id)).map((n) => {
              const Icon = n.icon;
              const on = n.id === active;
              return (
                <div
                  key={n.id}
                  className={cnJoin(
                    "flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-semibold transition-colors",
                    on
                      ? "bg-accent/15 text-accent accent-ring"
                      : "text-muted hover:bg-elevated hover:text-fg",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {n.label}
                </div>
              );
            })}
          </nav>
          <div className="mt-auto rounded-[var(--radius-md)] border border-border bg-surface p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-subtle">
              Objective
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {phase === "garage"
                ? "Ship 5 games and build cash toward your first office."
                : phase === "small"
                  ? "Hire a balanced team and research Medium Games."
                  : "Stabilize large production and expand market share."}
            </p>
          </div>
        </aside>
        <main className="scrollbar-thin min-w-0 flex-1 overflow-y-auto p-3 pb-28 sm:p-5 sm:pb-28">
          {children}
        </main>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg-deep/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-3 py-2.5 sm:px-5">
          {dock}
        </div>
      </div>
    </div>
  );
}

function TopBar({ phase }: { phase: string }) {
  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-bg-deep/90 px-3 py-2.5 backdrop-blur-md sm:px-5">
      <div className="min-w-0">
        <div className="truncate text-sm font-bold tracking-tight">{MOCK.studio}</div>
        <div className="text-[11px] text-subtle">
          {MOCK.date} · Yr {MOCK.campaignYear}/40 · {MOCK.era}
        </div>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-3">
        <StatChip label="Cash" value={formatCash(MOCK.cash)} tone="cash" />
        <StatChip label="Burn" value={`${formatCash(MOCK.monthlyBurn)}/mo`} tone="muted" />
        <StatChip label="Fans" value={formatFans(MOCK.fans)} tone="fans" />
        <StatChip label="RP" value={String(MOCK.research)} tone="research" />
        <div className="flex items-center gap-1 rounded-full border border-border bg-surface p-0.5">
          <button type="button" className="flex size-8 items-center justify-center rounded-full text-muted">
            <Pause className="size-3.5" />
          </button>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-fg"
          >
            <Play className="size-3.5 ml-px" />
          </button>
          <button type="button" className="px-2 text-xs font-bold text-muted">
            2×
          </button>
        </div>
      </div>
      <div className="hidden w-full text-[10px] uppercase tracking-wider text-subtle sm:block sm:w-auto">
        Phase · {phase}
      </div>
    </header>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "cash" | "fans" | "research" | "muted";
}) {
  const color =
    tone === "cash"
      ? "text-cash"
      : tone === "fans"
        ? "text-fans"
        : tone === "research"
          ? "text-research"
          : "text-muted";
  return (
    <div className="rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-1">
      <div className="text-[9px] font-bold uppercase tracking-wider text-subtle">{label}</div>
      <div className={cnJoin("stat-num text-sm", color)}>{value}</div>
    </div>
  );
}

export function DockBtn({
  children,
  primary,
}: {
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className={cnJoin(
        "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold sm:text-sm",
        primary
          ? "bg-accent text-accent-fg shadow-[var(--shadow-glow)]"
          : "border border-border bg-surface text-fg hover:bg-elevated",
      )}
    >
      {children}
    </button>
  );
}

export function Panel({
  title,
  children,
  className,
  action,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={cn("surface p-4 sm:p-5", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && (
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-subtle">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Portrait({
  name,
  role,
  energy,
  accent,
}: {
  name: string;
  role: string;
  energy: number;
  accent?: string;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-elevated p-2.5">
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-accent-fg"
        style={{ background: accent ?? "var(--color-accent-dim)" }}
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{name}</div>
        <div className="text-[11px] text-subtle">{role}</div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-panel">
          <div
            className="h-full rounded-full bg-good"
            style={{ width: `${energy}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export { CircleDollarSign };
