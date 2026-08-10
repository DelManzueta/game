/**
 * Market — release calendar, industry timeline (through 2026), sales, news.
 */
import { useMemo, useState } from "react";
import {
  PLATFORMS,
  START_YEAR,
  TIMELINE_END_YEAR,
  decadeLabel,
  platformDecade,
  platformTimelineEntries,
} from "@/lib/game/data";
import { platformThumb } from "@/lib/game/content/platformArt";
import { formatCash, formatFans } from "@/lib/game/simulation";
import { useGame } from "@/lib/game/store";
import { explainSales, calendarHudLabel, weekToCalendarLabel, weekToYearMonth } from "@/lib/game/viewModels";
import { cnJoin } from "@/components/ui/primitives";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Newspaper,
  Radio,
  Trophy,
} from "lucide-react";

type TabId = "calendar" | "timeline" | "sales" | "news";

const KIND_STYLE: Record<string, string> = {
  player_release: "border-accent/50 bg-accent/15 text-accent",
  rival_release: "border-border-strong bg-panel text-fg",
  rival_announce: "border-tech/40 bg-tech/10 text-tech",
  platform: "border-warn/40 bg-warn/10 text-warn",
  news: "border-border bg-elevated text-muted",
};

export function MarketScreen() {
  const year = useGame((s) => s.year);
  const month = useGame((s) => s.month);
  const week = useGame((s) => s.week);
  const fans = useGame((s) => s.fans);
  const sales = useGame((s) => s.activeSales);
  const market = useGame((s) => s.market);
  const released = useGame((s) => s.releasedGames);
  const [tab, setTab] = useState<TabId>("calendar");
  const [timelineFocus, setTimelineFocus] = useState(year);

  const calendar = market?.calendar ?? [];
  const news = market?.news ?? [];
  const rivals = market?.rivals ?? [];
  const trends = market?.trends ?? [];

  const datedCalendar = useMemo(() => {
    return [...calendar]
      .map((e) => {
        const d = weekToYearMonth(e.week, START_YEAR);
        return { ...e, ...d, label: weekToCalendarLabel(e.week, START_YEAR) };
      })
      .sort((a, b) => a.week - b.week);
  }, [calendar]);

  // Merge upcoming platform launches into calendar view so 2022–2026 always appear
  const platformLaunches = useMemo(() => {
    return platformTimelineEntries(Math.max(1977, year - 2), TIMELINE_END_YEAR).map((p) => ({
      id: `plat_launch_${p.id}`,
      week: (p.year - START_YEAR) * 48,
      kind: "platform" as const,
      title: p.name,
      detail: `Hardware launch · ${p.year}`,
      entityId: p.id,
      public: true,
      year: p.year,
      month: 9,
      weekOfMonth: 1,
      label: `Sep ${p.year} · launch`,
    }));
  }, [year]);

  const mergedCalendar = useMemo(() => {
    const ids = new Set(datedCalendar.map((c) => c.id));
    const extra = platformLaunches.filter((p) => !ids.has(p.id) && !ids.has(`cal_plat_${p.entityId}`));
    return [...datedCalendar, ...extra].sort((a, b) => a.year - b.year || a.month - b.month);
  }, [datedCalendar, platformLaunches]);

  // Group by year for calendar strip
  const byYear = useMemo(() => {
    const map = new Map<number, typeof mergedCalendar>();
    for (const e of mergedCalendar) {
      const list = map.get(e.year) ?? [];
      list.push(e);
      map.set(e.year, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [mergedCalendar]);

  const focusYear = Math.min(TIMELINE_END_YEAR, Math.max(START_YEAR, timelineFocus));
  const decadePlatforms = useMemo(() => {
    return platformTimelineEntries(focusYear - 4, focusYear + 4);
  }, [focusYear]);

  const liveSales = sales.filter((g) => g.onSale);
  const genreHeat = useMemo(() => {
    const heat: [string, number][] = [];
    for (const t of trends) {
      if (t.kind === "genre") {
        heat.push([t.subjectId, Math.round(Math.min(100, Math.max(5, t.momentum * 70)))]);
      }
    }
    if (!heat.length) {
      return [
        ["action", 72],
        ["adventure", 58],
        ["rpg", 64],
        ["simulation", 50],
        ["strategy", 46],
        ["casual", 55],
      ] as [string, number][];
    }
    return heat;
  }, [trends]);

  const tabs: { id: TabId; label: string; icon: typeof CalendarDays }[] = [
    { id: "calendar", label: "Release calendar", icon: CalendarDays },
    { id: "timeline", label: "Hardware timeline", icon: Radio },
    { id: "sales", label: "Charts", icon: Trophy },
    { id: "news", label: "Wire", icon: Newspaper },
  ];

  return (
    <div className="mx-auto max-w-6xl px-1 pb-4 pt-1">
      <div className="game-panel mb-3 flex flex-wrap items-end justify-between gap-3 p-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-fg">Market</h2>
          <p className="mt-0.5 text-sm text-muted">
            Industry calendar · {calendarHudLabel({ year, month, week })} · {formatFans(fans)} fans
          </p>
        </div>
        <div className="rounded-full border border-border bg-elevated px-3 py-1.5 text-xs font-semibold tabular text-fg">
          Through <span className="font-bold text-accent">{TIMELINE_END_YEAR}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cnJoin(
                "flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors",
                on
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border bg-elevated text-muted hover:border-border-strong",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "calendar" && (
        <section className="mt-4 space-y-4">
          <p className="text-xs text-muted">
            Your releases, rival announces, and hardware launches — dated with full industry years
            (not campaign counters).
          </p>
          {!mergedCalendar.length && (
            <div className="rounded-2xl border border-border bg-elevated p-6 text-center text-sm text-muted">
              No public calendar events yet. Ship a game or wait for industry launches.
            </div>
          )}
          {byYear.map(([y, events]) => (
            <div key={y} className="game-panel p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3
                  className={cnJoin(
                    "text-lg font-bold tabular",
                    y === year ? "text-accent" : y > year ? "text-tech" : "text-fg",
                  )}
                >
                  {y}
                  {y === year && (
                    <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">
                      Now
                    </span>
                  )}
                  {y > year && (
                    <span className="ml-2 rounded-full bg-tech/15 px-2 py-0.5 text-[10px] font-bold uppercase text-tech">
                      Ahead
                    </span>
                  )}
                </h3>
                <span className="text-[11px] text-subtle">{events.length} events</span>
              </div>
              <ul className="space-y-2">
                {events.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-start gap-2 rounded-xl border border-border bg-panel px-3 py-2.5"
                  >
                    <span
                      className={cnJoin(
                        "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        KIND_STYLE[e.kind] ?? KIND_STYLE.news,
                      )}
                    >
                      {e.kind.replace(/_/g, " ")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-fg">{e.title}</div>
                      <div className="text-xs text-muted">{e.detail}</div>
                    </div>
                    <div className="text-right text-xs font-semibold tabular text-muted">{e.label}</div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {tab === "timeline" && (
        <section className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">
              Hardware generations {decadeLabel(platformDecade(focusYear))} · scroll the industry window to{" "}
              {TIMELINE_END_YEAR}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-paper text-fg"
                aria-label="Earlier years"
                onClick={() => setTimelineFocus((y) => Math.max(START_YEAR, y - 4))}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="min-w-[7rem] text-center text-sm font-bold tabular text-fg">
                {focusYear - 4}–{Math.min(TIMELINE_END_YEAR, focusYear + 4)}
              </div>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-paper text-fg"
                aria-label="Later years"
                onClick={() => setTimelineFocus((y) => Math.min(TIMELINE_END_YEAR, y + 4))}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="ml-1 h-10 rounded-full border border-accent/40 bg-accent/15 px-3 text-xs font-bold text-accent"
                onClick={() => setTimelineFocus(year)}
              >
                Jump to {year}
              </button>
              <button
                type="button"
                className="h-10 rounded-full border border-border-strong bg-elevated px-3 text-xs font-bold text-fg/80"
                onClick={() => setTimelineFocus(TIMELINE_END_YEAR)}
              >
                {TIMELINE_END_YEAR}
              </button>
            </div>
          </div>

          {/* Year rail */}
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max gap-1 px-0.5">
              {Array.from({ length: TIMELINE_END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i).map((y) => {
                const has = PLATFORMS.some((p) => p.year === y && !p.isCustom);
                const on = y === year;
                const inWindow = y >= focusYear - 4 && y <= focusYear + 4;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setTimelineFocus(y)}
                    className={cnJoin(
                      "flex h-12 min-w-[2.75rem] flex-col items-center justify-center rounded-lg border text-[10px] font-bold tabular",
                      on && "border-accent bg-accent/25 text-accent",
                      !on && inWindow && has && "border-border-strong bg-panel text-fg",
                      !on && inWindow && !has && "border-border bg-panel text-subtle",
                      !on && !inWindow && "border-transparent bg-transparent text-subtle",
                    )}
                  >
                    <span>{String(y).slice(2)}</span>
                    {has && <span className="mt-0.5 h-1 w-1 rounded-full bg-current" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {decadePlatforms.map((p) => {
              const live = p.year <= year;
              const upcoming = p.year > year;
              const thumb = platformThumb(p.id, year);
              return (
                <article
                  key={p.id}
                  className={cnJoin(
                    "flex gap-3 rounded-2xl border p-3 ",
                    live ? "border-border bg-paper" : "border-tech/25 bg-tech/5",
                  )}
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-panel">
                    {thumb ? (
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-subtle">
                        {p.short}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h4 className="truncate font-bold text-fg">{p.name}</h4>
                      <span className="rounded-full bg-panel px-1.5 py-0.5 text-[10px] font-bold tabular text-muted">
                        {p.year}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted">{p.era ?? decadeLabel(platformDecade(p.year))}</p>
                    <p className="mt-1 text-xs font-semibold">
                      {live ? (
                        <span className="text-good">On market</span>
                      ) : (
                        <span className="text-tech">Launches {p.year}</span>
                      )}
                      {upcoming && p.year <= year + 3 && (
                        <span className="text-subtle"> · within window</span>
                      )}
                    </p>
                  </div>
                </article>
              );
            })}
            {!decadePlatforms.length && (
              <p className="col-span-full text-center text-sm text-muted">No platforms in this window.</p>
            )}
          </div>
        </section>
      )}

      {tab === "sales" && (
        <section className="mt-4 space-y-4">
          <div className="game-panel p-3">
            <h3 className="text-sm font-bold text-fg">Your titles on sale</h3>
            <ul className="mt-2 space-y-2">
              {liveSales.map((g) => (
                <li key={g.id} className="rounded-xl border border-border bg-elevated p-3">
                  <div className="flex justify-between gap-2">
                    <span className="font-bold text-fg">{g.title}</span>
                    <span className="tabular font-bold text-accent">{g.avgReview.toFixed(1)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {g.sales.toLocaleString()} units · {formatCash(g.revenue)}
                  </p>
                  <p className="mt-1 text-xs text-subtle">{explainSales(g)}</p>
                </li>
              ))}
              {!liveSales.length && (
                <li className="py-4 text-center text-sm text-muted">No titles selling.</li>
              )}
            </ul>
          </div>

          <div className="game-panel p-3">
            <h3 className="text-sm font-bold text-fg">Genre heat · this quarter</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {genreHeat.map(([g, h]) => (
                <div
                  key={g}
                  className="min-w-[6.5rem] flex-1 rounded-xl border border-border bg-elevated p-3"
                >
                  <div className="text-sm font-bold capitalize text-fg">{g}</div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, h)}%` }} />
                  </div>
                  <div className="mt-1 text-[11px] text-subtle">Heat {h}</div>
                </div>
              ))}
            </div>
          </div>

          {!!rivals.length && (
            <div className="game-panel p-3">
              <h3 className="text-sm font-bold text-fg">Active rivals</h3>
              <ul className="mt-2 space-y-1.5">
                {rivals.slice(0, 8).map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-panel px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-fg">{r.name}</span>
                    <span className="text-xs text-muted">
                      {r.activeProject ? `Working: ${r.activeProject.title}` : "Between projects"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!!released.length && (
            <p className="text-center text-xs text-subtle">
              Library: {released.length} released · Market score uses reviews, not marketing spend.
            </p>
          )}
        </section>
      )}

      {tab === "news" && (
        <section className="mt-4 space-y-2">
          {!news.length && (
            <div className="rounded-2xl border border-border bg-elevated p-6 text-center text-sm text-muted">
              Quiet week on the industry wire.
            </div>
          )}
          {news.map((n) => (
            <article
              key={n.id}
              className="rounded-2xl border border-border bg-paper p-4 "
            >
              <div className="text-[10px] font-bold uppercase tracking-wide text-subtle">
                {n.category} · {weekToCalendarLabel(n.week, START_YEAR)}
              </div>
              <h3 className="mt-1 font-bold text-fg">{n.headline}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{n.body}</p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
