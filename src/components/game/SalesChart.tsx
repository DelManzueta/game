/**
 * Lightweight sales chart — no recharts (keeps SSR/dev simple).
 * Bars + polyline from weekly units history or projected plan.
 */
import { cnJoin } from "@/components/ui/primitives";

export type SalesPoint = {
  week: number;
  units: number;
  revenue?: number;
};

export function SalesChart({
  points,
  height = 120,
  className,
  accent = "#e8941a",
  label = "Weekly units",
  emptyHint = "No sales weeks yet — ship a title and let a few weeks pass.",
}: {
  points: SalesPoint[];
  height?: number;
  className?: string;
  accent?: string;
  label?: string;
  emptyHint?: string;
}) {
  if (!points.length) {
    return (
      <div
        className={cnJoin(
          "flex items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/20 px-3 text-center text-xs text-white/45",
          className,
        )}
        style={{ height }}
      >
        {emptyHint}
      </div>
    );
  }

  const maxU = Math.max(1, ...points.map((p) => p.units));
  const total = points.reduce((a, p) => a + p.units, 0);
  const w = 320;
  const h = height;
  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 22;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const n = points.length;
  const gap = n > 1 ? innerW / n : innerW;
  const barW = Math.max(3, Math.min(18, gap * 0.62));

  const coords = points.map((p, i) => {
    const x = padL + gap * i + gap / 2;
    const y = padT + innerH * (1 - p.units / maxU);
    return { x, y, ...p };
  });

  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");

  return (
    <div className={cnJoin("rounded-xl border border-white/10 bg-black/25 p-2", className)}>
      <div className="mb-1 flex items-center justify-between gap-2 px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/45">{label}</span>
        <span className="text-[11px] font-semibold tabular text-white/70">
          {total.toLocaleString()} total · peak {maxU.toLocaleString()}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label={label}>
        {/* grid */}
        {[0.25, 0.5, 0.75, 1].map((t) => {
          const y = padT + innerH * (1 - t);
          return (
            <line
              key={t}
              x1={padL}
              x2={w - padR}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          );
        })}
        {coords.map((c, i) => {
          const barH = Math.max(1, padT + innerH - c.y);
          return (
            <rect
              key={i}
              x={c.x - barW / 2}
              y={c.y}
              width={barW}
              height={barH}
              rx={2}
              fill={accent}
              opacity={0.35 + 0.55 * (c.units / maxU)}
            />
          );
        })}
        <path d={line} fill="none" stroke={accent} strokeWidth={2} strokeLinejoin="round" />
        {coords.map((c, i) => (
          <circle key={`d${i}`} cx={c.x} cy={c.y} r={2.2} fill={accent} />
        ))}
        {/* x labels every few weeks */}
        {coords
          .filter((_, i) => i === 0 || i === n - 1 || i % Math.ceil(n / 4) === 0)
          .map((c, i) => (
            <text
              key={`t${i}`}
              x={c.x}
              y={h - 6}
              textAnchor="middle"
              fill="rgba(255,255,255,0.4)"
              fontSize={9}
              fontWeight={600}
            >
              W{c.week}
            </text>
          ))}
      </svg>
    </div>
  );
}

/** Prefer live weeklyHistory; fall back to pre-release plan. */
export function salesPointsFromGame(g: {
  weeklyHistory?: SalesPoint[];
  weeklySalesLeft?: number[];
  weeksOnMarket?: number;
}): SalesPoint[] {
  const hist = g.weeklyHistory ?? [];
  if (hist.length) {
    return hist.map((h) => ({
      week: h.week,
      units: h.units,
      revenue: h.revenue,
    }));
  }
  const plan = g.weeklySalesLeft ?? [];
  if (!plan.length) return [];
  return plan.map((units, i) => ({
    week: i + 1,
    units,
  }));
}
