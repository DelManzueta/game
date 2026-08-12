/**
 * Presentation only. Mutations go through useGame.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AUDIENCES,
  FIELD_LABELS,
  GENRES,
  OFFICE_INFO,
  PLATFORMS,
  RESEARCH,
  REVIEWER_NAMES,
  SIZE_STATS,
  TOPICS,
  getGenre,
  getPlatform,
  getTopic,
} from "@/lib/game/data";
import { isGarageTopic } from "@/lib/game/content/garageSlice";
import { isGaragePhaseOne } from "@/lib/game/phaseOne";
import { ENGINE_COMPONENTS } from "@/lib/game/content/engines";
import {
  SELECTABLE_MODULES,
  PURPOSE_LABEL,
  ARCH_LABEL,
  SUPPORT_STATE_LABEL,
  type EnginePurpose,
  type ArchitectureStyle,
} from "@/lib/game/engine";
import {
  MENU_ROOM_ART,
  roomArtForOffice as roomArtDefForOffice,
  screenRoomArt,
} from "@/lib/game/content/roomArt";
import { platformArt, platformThumb } from "@/lib/game/content/platformArt";
import { genreIconSrc } from "@/lib/game/content/genreArt";
import { evaluateCombo, formatCash, formatFans, generateGameTitle } from "@/lib/game/simulation";
import { availableSizes, hasSave, useGame } from "@/lib/game/store";
import {
  libraryRows,
  projectPhaseLabel,
  studioOverview,
  stageFieldsForProject,
  explainSales,
  calendarHudLabel,
} from "@/lib/game/viewModels";
import { disciplineProgress, overallProjectProgress } from "@/lib/game/production/bridge";
import {
  PILLAR_LABELS,
  TECH_CATALOG,
  type DifficultyPreset,
  type ProjectPillar,
} from "@/lib/game/research";
import type { AudienceId, DevField, GameSize, GenreId, ScreenId } from "@/lib/game/types";
import { Badge, Button, Input, Modal, SearchField, cnJoin } from "@/components/ui/primitives";
import { GarageLoopFlowchart, ScoringPipelineFlow } from "@/components/game/LoopFlowchart";
import { MarketScreen } from "@/components/game/MarketScreen";
import { SalesChart, salesPointsFromGame } from "@/components/game/SalesChart";
import { CAMPAIGN_CATALOG } from "@/lib/game/commercial/marketing";
import { HARDWARE_TIERS, type HardwareTierId } from "@/lib/game/tycoonLateMarket";
import { DRM_TIERS, type DrmTier } from "@/lib/game/tycoonPiracy";
import {
  MEDIA_DRIVES,
  GPU_PARTS,
  consoleRdCost,
  type MediaDriveId,
  type GpuPartId,
} from "@/lib/game/tycoonRiskAnalytics";
import { getPlatformSpec, platformMarketState, weekToCampaignDay } from "@/lib/game/platforms/lifecycle";
import { SYSTEM_UNLOCKS, describeUnlockRequirements } from "@/lib/game/progression/unlockRegistry";
import { idealPhaseSliders } from "@/lib/game/classicGdt";
import {
  FlaskConical,
  Gamepad2,
  History,
  Pause,
  Play,
  Settings,
  Home,
  FastForward,
  Sparkles,
  Bell,
  Menu,
  Bug,
  Cpu,
  Palette,
  CalendarDays,
  Diamond,
  Users,
  Wallet,
  TrendingUp,
} from "lucide-react";

const BAR_COLORS = ["#e86a4a", "#3aaa6a", "#3aa0d8", "#e8941a", "#9b6ad8", "#4ecb8a"];

function setScreen(id: ScreenId) {
  useGame.getState().setScreen(id);
}

export function PlatformLifecycleLine({ platformId, year }: { platformId: string; year: number }) {
  const week = useGame((s) => s.week);
  try {
    const spec = getPlatformSpec(platformId);
    const day = weekToCampaignDay(week);
    const m = platformMarketState(spec, { day });
    const launchYear = Math.floor(spec.launchDay / (48 * 7)) + 1982; // approximate from campaign day
    const age = Math.max(0, year - (getPlatform(platformId)?.year ?? launchYear));
    return (
      <p className="mt-0.5 text-[11px] text-white/70">
        Lifecycle: <span className="font-bold capitalize">{m.lifecycle.replace(/_/g, " ")}</span>
        {m.isLegacy ? " · retired shelves" : ""} · live factor{" "}
        {Math.round(m.lifecycleFactor * 100)}%
        {age > 0 ? ` · age ${age}y` : ""}
        {m.lifecycleFactor < 0.35 && !m.isLegacy ? " · late cycle (sales soft)" : ""}
      </p>
    );
  } catch {
    return null;
  }
}

export function MarketingPanel() {
  const hype = useGame((s) => s.hype);
  const cash = useGame((s) => s.cash);
  const runStudioMarketing = useGame((s) => s.runStudioMarketing);
  const project = useGame((s) => s.currentProject);
  const [msg, setMsg] = useState("");
  const tiers = CAMPAIGN_CATALOG.filter((c) =>
    ["dev_blog", "magazine_ad", "g3_booth", "flyer_run", "demo_push"].includes(c.campaignId),
  );

  return (
    <div className="game-panel mt-3 space-y-2 p-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-fg">Marketing campaigns</h3>
          <p className="text-xs text-muted">
            Studio hype <span className="font-bold tabular text-accent">{Math.round(hype)}</span>
            {" · "}decays ~12%/week · burns at launch · rivals every 6 weeks
          </p>
        </div>
        {project && (
          <span className="text-[10px] text-muted">Title spend {formatCash(project.marketingSpend ?? 0)}</span>
        )}
      </div>
      {msg && <p className="text-xs text-warn">{msg}</p>}
      <ul className="space-y-2">
        {tiers.map((c) => (
          <li
            key={c.campaignId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-elevated px-3 py-2"
          >
            <div className="min-w-0">
              <div className="font-semibold text-fg">{c.name}</div>
              <p className="text-[11px] text-muted">{c.description}</p>
              <p className="text-[10px] text-subtle">
                ~+{c.immediateHypePoints} hype · {formatCash(c.cost)}
              </p>
            </div>
            <Button
              size="sm"
              disabled={cash < c.cost}
              onClick={() => setMsg(runStudioMarketing(c.campaignId) ?? `${c.name} live.`)}
            >
              Run
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GamesScreen() {
  const games = useGame((s) => s.releasedGames);
  const selectGame = useGame((s) => s.selectGame);
  const selectedGameId = useGame((s) => s.selectedGameId);
  const setModal = useGame((s) => s.setModal);
  const completeReport = useGame((s) => s.completeReport);
  const startTitleCampaign = useGame((s) => s.startTitleCampaign);
  const year = useGame((s) => s.year);
  const office = useGame((s) => s.office);
  const garage = isGaragePhaseOne({ office });
  const [sel, setSel] = useState<string | null>(selectedGameId);
  const [campMsg, setCampMsg] = useState("");
  const rows = libraryRows(games);
  const activeId = sel ?? selectedGameId ?? games[0]?.id ?? null;
  const selected = games.find((g) => g.id === activeId) ?? null;
  const chartPts = selected ? salesPointsFromGame(selected) : [];
  const isPlan =
    !!selected &&
    !(selected.weeklyHistory?.length) &&
    (selected.weeklySalesLeft?.length ?? 0) > 0;

  return (
    <ScreenBackdrop screen="games">
      <div className="game-panel px-4 py-3 text-center">
        <h2 className="text-2xl font-bold text-fg">Library</h2>
        <p className="mt-0.5 text-sm text-muted">Sales · reviews · reports</p>
      </div>
      {!rows.length && (
        <p className="mt-6 text-center text-muted">
          No releases yet. Ship your first title from the garage desk.
        </p>
      )}
      <ul className="mt-3 space-y-2">
        {rows.map((r) => {
          const g = games.find((x) => x.id === r.id);
          const thumb = g ? platformThumb(g.platformId, g.yearReleased ?? year) : undefined;
          const on = activeId === r.id;
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  setSel(r.id);
                  selectGame(r.id);
                }}
                className={cnJoin(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left",
                  on ? "border-accent bg-accent/15" : "border-border bg-paper",
                )}
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-white/15"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-panel text-[10px] font-bold text-muted">
                    {r.avgReview.toFixed(1)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <span className="truncate font-bold text-fg">{r.title}</span>
                    <span className="tabular text-lg font-bold text-tech">{r.avgReview.toFixed(1)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {r.genre} · {r.platform} · {r.sales.toLocaleString()} sold · {r.revenueLabel}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {selected && (
        <div className="mt-3 space-y-3 rounded-2xl border border-border bg-paper p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-fg">{selected.title}</h3>
              <p className="text-xs text-muted">
                {getGenre(selected.genreId).name} ·{" "}
                {getPlatform(selected.platformId)?.name ?? selected.platformId} ·{" "}
                {selected.yearReleased}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tabular text-accent">{selected.avgReview.toFixed(1)}</div>
              <div className="text-[10px] font-bold uppercase text-muted">avg review</div>
            </div>
          </div>

          <SalesChart
            points={chartPts}
            label={isPlan ? "Projected shelf (pre-sales)" : "Weekly units sold"}
            emptyHint="Sales curve appears after release weeks tick."
            height={140}
          />

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg border border-border bg-elevated px-2 py-2">
              <div className="font-bold tabular text-fg">{selected.sales.toLocaleString()}</div>
              <div className="text-muted">Units</div>
            </div>
            <div className="rounded-lg border border-border bg-elevated px-2 py-2">
              <div className="font-bold tabular text-good">{formatCash(selected.revenue)}</div>
              <div className="text-muted">Revenue</div>
            </div>
            <div className="rounded-lg border border-border bg-elevated px-2 py-2">
              <div className="font-bold tabular text-fg">{selected.weeksOnMarket}w</div>
              <div className="text-muted">On sale</div>
            </div>
          </div>

          <p className="text-xs text-muted">{explainSales(selected)}</p>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                selectGame(selected.id);
                setModal("reviews");
              }}
            >
              Reviews
            </Button>
            <Button
              size="sm"
              onClick={() => {
                selectGame(selected.id);
                completeReport(selected.id);
              }}
            >
              {selected.reportDone ? "View report" : "Game report"}
            </Button>
            {!garage && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setCampMsg(startTitleCampaign(selected.id, "flyer_run") ?? "Flyer started.")
                }
              >
                Flyer campaign
              </Button>
            )}
            {!garage && <PatchDlcButtons gameId={selected.id} onMsg={setCampMsg} />}
            {campMsg && <p className="w-full text-xs text-muted">{campMsg}</p>}
          </div>
        </div>
      )}
    </ScreenBackdrop>
  );
}


/** Soft room art behind paper department panels — one look with the garage. */
export function ScreenBackdrop({
  screen,
  children,
}: {
  screen: "research" | "engines" | "platforms" | "finances" | "market" | "staff" | "games" | "settings";
  children: ReactNode;
}) {
  const office = useGame((s) => s.office);
  const year = useGame((s) => s.year);
  const art = screenRoomArt(screen, office, year);
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
        {art.label}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function ResearchScreen() {
  const researched = useGame((s) => s.researched);
  const researchPoints = useGame((s) => s.researchPoints);
  const active = useGame((s) => s.activeResearch);
  const pipeline = useGame((s) => s.researchPipeline);
  const year = useGame((s) => s.year);
  const office = useGame((s) => s.office);
  const garage = isGaragePhaseOne({ office });
  const startResearch = useGame((s) => s.startResearch);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<"studio" | "pipeline">("pipeline");
  const available = RESEARCH.filter((r) => {
    if (researched.includes(r.id)) return false;
    if (garage && "minYear" in r && typeof (r as { minYear?: number }).minYear === "number") {
      return ((r as { minYear?: number }).minYear ?? 0) <= year + 2;
    }
    return true;
  }).slice(0, garage ? 12 : 24);
  const pipeRows = TECH_CATALOG.filter((t) => {
    if (garage) return year >= t.earliestYear - 1 && t.earliestYear <= year + 8;
    return year >= t.earliestYear - 2;
  }).map((def) => {
    const st = pipeline?.knowledge[def.id];
    return {
      def,
      state: st?.state ?? (year >= def.normalYear ? "researchable" : "observed"),
      maturity: st?.maturity ?? 0,
      uses: st?.commercialUses ?? 0,
    };
  });

  return (
    <ScreenBackdrop screen="research">
      <div className="game-panel px-4 py-3 text-center">
        <h2 className="text-2xl font-bold text-fg">Research</h2>
      <p className="mt-1 text-sm text-muted">
        {Math.floor(researchPoints)} RP{active ? ` · ${active.name}` : ""}
      </p>
      <p className="mx-auto mt-1 max-w-md text-[11px] text-muted">
        Observe → research → prototype → integrate → ship. Not a shop.
      </p>
      </div>
      <div className="mx-auto mt-3 flex max-w-sm gap-1">
        <Button size="sm" variant={tab === "pipeline" ? "primary" : "secondary"} className="flex-1" onClick={() => setTab("pipeline")}>
          Tech pipeline
        </Button>
        <Button size="sm" variant={tab === "studio" ? "primary" : "secondary"} className="flex-1" onClick={() => setTab("studio")}>
          Studio unlocks
        </Button>
      </div>
      {msg && <p className="mt-2 text-center text-sm text-warn">{msg}</p>}
      {tab === "pipeline" ? (
        <ul className="mt-4 space-y-2">
          {pipeRows.slice(0, 28).map(({ def, state, maturity, uses }) => {
            const ready = researched.includes(def.id) || ["production_ready", "first_commercial", "mature", "legacy"].includes(state);
            const canStart =
              !ready &&
              !active &&
              (state === "researchable" || state === "observed" || state === "unknown");
            return (
              <li
                key={def.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-paper px-3 py-3 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-fg">{def.name}</div>
                  <div className="text-xs text-muted">
                    {def.category.replace(/_/g, " ")} · {def.researchRp} RP
                    {def.isDesignOnly ? " · design" : ""} ·{" "}
                    <span className="text-tech">{String(state).replace(/_/g, " ")}</span>
                    {uses > 0 ? ` · ${uses} ships` : ""}
                    {maturity > 0 ? ` · mat ${Math.round(maturity * 100)}%` : ""}
                  </div>
                </div>
                {ready ? (
                  <Badge tone="good">Ready</Badge>
                ) : (
                  <Button
                    size="sm"
                    disabled={!canStart}
                    onClick={() => setMsg(startResearch(def.id) ?? "Started.")}
                  >
                    Research
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="mt-4 space-y-2">
          {available.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-paper px-3 py-3 shadow-sm"
            >
              <div>
                <div className="font-semibold text-fg">{r.name}</div>
                <div className="text-xs text-muted">
                  {r.category} · {r.cost} RP
                </div>
              </div>
              <Button size="sm" disabled={!!active} onClick={() => setMsg(startResearch(r.id) ?? "Started.")}>
                Research
              </Button>
            </li>
          ))}
        </ul>
      )}
    </ScreenBackdrop>
  );
}

export function StaffScreen() {
  const staff = useGame((s) => s.staff);
  const sendStaffOnVacation = useGame((s) => s.sendStaffOnVacation);
  const office = useGame((s) => s.office);
  const unlocks = useGame((s) => s.unlocks);
  const cash = useGame((s) => s.cash);
  const rp = useGame((s) => s.researchPoints);
  const hireStaff = useGame((s) => s.hireStaff);
  const fireStaff = useGame((s) => s.fireStaff);
  const refreshCandidates = useGame((s) => s.refreshCandidates);
  const getCandidates = useGame((s) => s.getCandidates);
  const trainStaff = useGame((s) => s.trainStaff);
  const getTrainingCourses = useGame((s) => s.getTrainingCourses);
  const [cands, setCands] = useState(() => getCandidates());
  const [msg, setMsg] = useState("");
  const [trainFor, setTrainFor] = useState<string | null>(null);
  const hiringOpen = unlocks.hiring === "owned" || office >= 2;
  const trainingOpen = unlocks.training === "owned" || office >= 2;
  const courses = getTrainingCourses();

  return (
    <ScreenBackdrop screen="staff">
      <div className="game-panel px-4 py-3 text-center">
        <h2 className="text-2xl font-bold text-fg">People</h2>
      <p className="mt-1 text-sm text-muted">
        {hiringOpen ? "Hire up to your HQ seats · signing cap $2M" : "Garage is founder-led until First Office."}
      </p>
      <p className="mt-1 text-xs font-semibold tabular text-fg/80">
        Payroll {formatCash(staff.reduce((s, m) => s + (m.id === "founder" ? 0 : m.salary), 0))}/mo
      </p>
      </div>
      {msg && <p className="mt-2 text-center text-sm text-warn">{msg}</p>}

      <ul className="mt-4 space-y-2">
        {staff.map((m) => (
          <li key={m.id} className="rounded-xl border border-border bg-paper px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-bold text-fg">
                  {m.name}
                  {m.id === "founder" ? " (You)" : ""}
                </div>
                <div className="text-xs text-muted">
                  Lv {m.level} · D{m.design} · T{m.tech} · S{m.speed}
                  {m.specialization ? ` · ${m.specialization}` : ""}
                  {(m.bugFixBonus ?? 0) > 0 ? ` · QA +${Math.round((m.bugFixBonus ?? 0) * 100)}%` : ""}
                  {" · "}
                  {formatCash(m.salary)}/mo
                </div>
                {m.id !== "founder" && (
                  <div className="mt-1.5 max-w-[14rem]">
                    <div className="mb-0.5 flex justify-between text-[10px] font-bold uppercase tracking-wide text-muted">
                      <span>Energy</span>
                      <span className="tabular">{Math.round(m.energy ?? 100)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-panel">
                      <div
                        className={cnJoin(
                          "h-full rounded-full transition-all",
                          (m.energy ?? 100) <= 20
                            ? "bg-bad"
                            : (m.energy ?? 100) < 50
                              ? "bg-warn"
                              : "bg-good",
                        )}
                        style={{ width: `${Math.round(m.energy ?? 100)}%` }}
                      />
                    </div>
                    {(m.energy ?? 100) <= 20 && (
                      <p className="mt-0.5 text-[10px] text-warn">Resting — too exhausted to contribute</p>
                    )}
                    <div className="mt-1.5">
                      <div className="mb-0.5 flex justify-between text-[10px] font-bold uppercase tracking-wide text-muted">
                        <span>Fatigue</span>
                        <span className="tabular">{Math.round(m.fatigue ?? 0)}% · {m.workStatus ?? "Active"}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-panel">
                        <div
                          className="h-full rounded-full bg-orange-500 transition-all"
                          style={{ width: `${Math.min(100, Math.round(m.fatigue ?? 0))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                {m.training && (
                  <div className="mt-1 text-xs text-tech">
                    Training… {m.training.weeksLeft}w left / {m.training.totalWeeks}w
                    <div className="mt-0.5 h-1.5 max-w-[12rem] overflow-hidden rounded-full bg-panel">
                      <div
                        className="h-full rounded-full bg-cyan-400 transition-all"
                        style={{
                          width: `${Math.round(((m.training.totalWeeks - m.training.weeksLeft) / m.training.totalWeeks) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {m.workStatus !== "Vacation" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setMsg(sendStaffOnVacation(m.id) ?? `${m.name} on leave.`)}
                  >
                    Rest leave
                  </Button>
                )}
                {trainingOpen && !m.training && m.id !== "founder" && (
                  <Button size="sm" variant="secondary" onClick={() => setTrainFor(trainFor === m.id ? null : m.id)}>
                    Train
                  </Button>
                )}
                {trainingOpen && !m.training && m.id === "founder" && (
                  <Button size="sm" variant="secondary" onClick={() => setTrainFor(trainFor === m.id ? null : m.id)}>
                    Self-study
                  </Button>
                )}
                {m.id !== "founder" && hiringOpen && (
                  <Button size="sm" variant="danger" onClick={() => { fireStaff(m.id); setMsg(`Let go ${m.name}.`); }}>
                    Fire
                  </Button>
                )}
              </div>
            </div>
            {trainFor === m.id && (
              <div className="mt-2 space-y-1.5 border-t border-border pt-2">
                {courses.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-elevated px-2 py-1.5 text-left text-xs text-fg hover:border-cyan-400/40"
                    onClick={() => {
                      const err = trainStaff(m.id, c.id);
                      setMsg(err ?? `${m.name} → ${c.name}`);
                      if (!err) setTrainFor(null);
                    }}
                  >
                    <span>
                      <span className="font-bold">{c.name}</span>
                      <span className="block text-muted">{c.description}</span>
                    </span>
                    <span className="shrink-0 tabular text-muted">
                      {c.weeks}w · {formatCash(c.cashCost)} · {c.rpCost} RP
                    </span>
                  </button>
                ))}
                <p className="text-[10px] text-subtle">
                  Cash {formatCash(cash)} · RP {Math.floor(rp)}
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>

      {hiringOpen && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Candidates</h3>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setCands(refreshCandidates());
                setMsg("Refreshed candidate pool.");
              }}
            >
              Refresh
            </Button>
          </div>
          <ul className="space-y-2">
            {cands.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-paper px-3 py-3 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-fg">
                    {c.name}
                    {c.level >= 5 ? (
                      <span className="ml-1 rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-warn">
                        STAR
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted">
                    Lv {c.level} · D{c.design} T{c.tech} S{c.speed}
                    {c.specialization ? ` · ${c.specialization}` : ""}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const err = hireStaff(c);
                    setMsg(err ?? `Hired ${c.name}`);
                    if (!err) setCands(refreshCandidates());
                  }}
                >
                  Hire {formatCash(Math.min(c.salary, 2_000_000))}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ScreenBackdrop>
  );
}

export function EnginesScreen() {
  const engines = useGame((s) => s.engines);
  const workshop = useGame((s) => s.engineWorkshop);
  const startEngineVersion = useGame((s) => s.startEngineVersion);
  const year = useGame((s) => s.year);
  const cash = useGame((s) => s.cash);
  const unlockedPlatforms = useGame((s) => s.unlockedPlatforms);
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("Forge");
  const [purpose, setPurpose] = useState<EnginePurpose>("fast_2d");
  const [architecture, setArchitecture] = useState<ArchitectureStyle>("modular");
  const [selected, setSelected] = useState<string[]>(["core_loop", "sprite_2d"]);
  const build = workshop?.activeBuild ?? null;
  const versions = workshop?.versions ?? [];
  const families = workshop?.families ?? [];

  const modules = SELECTABLE_MODULES.filter((m) => !m.minYear || m.minYear <= year + 1);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const start = () => {
    const err = startEngineVersion({
      name,
      purpose,
      architecture,
      lifespan: "multi_project",
      moduleIds: selected,
      targetPlatforms: unlockedPlatforms.slice(0, 3),
      targetSizes: ["small", "medium"],
    });
    setMsg(err ?? "Engine project started — time advances work.");
  };

  return (
    <ScreenBackdrop screen="engines">
      <h2 className="text-center text-2xl font-bold text-fg">Engine Workshop</h2>
      <p className="mx-auto mt-1 max-w-lg text-center text-xs text-muted">
        Bundle researched modules into a proprietary engine. Tech/Design bonuses multiply every future title. Released versions
        are immutable; each project freezes a snapshot.
      </p>
      {msg && <p className="mt-2 text-center text-sm text-warn">{msg}</p>}

      {build && (
        <div className="mt-4 rounded-xl border border-cyan-400/30 bg-cyan-950/40 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-bold text-fg">{build.name}</div>
              <div className="text-xs text-muted">
                Phase: {build.phase.replace(/_/g, " ")} · Week {build.weeksElapsed}/~
                {build.weeksEstimate}
              </div>
            </div>
            <Badge tone="accent">{Math.round(build.overallProgress * 100)}%</Badge>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-elevated">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all"
              style={{ width: `${Math.round(build.overallProgress * 100)}%` }}
            />
          </div>
          {build.conflicts.length > 0 && (
            <p className="mt-2 text-xs text-warn/90">
              Soft conflicts (extra work): {build.conflicts.join("; ")}
            </p>
          )}
          <p className="mt-1 text-xs text-muted">
            Debt {Math.round(build.technicalDebt)} · Capacity {Math.round(build.weeklyCapacity)}/wk ·
            Work {Math.round(build.completedWork)}/{build.requiredWork}
          </p>
        </div>
      )}

      <section className="mt-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Released versions</h3>
        <ul className="mt-2 space-y-2">
          {(versions.length ? versions : engines.map((e) => ({
              versionId: e.id,
              label: e.name,
              status: "stable" as const,
              features: e.features,
              technicalDebt: 0,
              immutable: true,
              modules: [] as { moduleId: string }[],
            }))).map((v) => (
            <li
              key={v.versionId}
              className="rounded-xl border border-border bg-paper px-4 py-3 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-fg">{v.label}</div>
                <Badge tone="good">
                  {SUPPORT_STATE_LABEL[v.status as keyof typeof SUPPORT_STATE_LABEL] ?? v.status}
                  {v.immutable ? " · locked" : ""}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-muted">
                {(v.features ?? v.modules?.map((m) => m.moduleId) ?? []).slice(0, 8).join(" · ") ||
                  "Core runtime"}
              </div>
              {(() => {
                const eng = engines.find((e) => e.id === v.versionId || e.name === v.label);
                if (!eng) return null;
                return (
                  <div className="mt-1 text-[11px] font-semibold text-accent">
                    Tech +{eng.techBonus ?? 0} · Design +{eng.designBonus ?? 0} (boosts every game)
                  </div>
                );
              })()}
              {"technicalDebt" in v && (
                <div className="mt-1 text-[11px] text-subtle">
                  Tech debt {Math.round(Number(v.technicalDebt) || 0)}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {families.length > 0 && (
        <section className="mt-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Families</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {families.map((f) => (
              <li
                key={f.familyId}
                className="rounded-lg border border-border bg-elevated px-3 py-2 text-xs text-muted"
              >
                <span className="font-semibold text-fg">{f.name}</span>
                <span className="text-subtle">
                  {" "}
                  · {PURPOSE_LABEL[f.purpose]} · {ARCH_LABEL[f.architecture]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!build && (
        <section className="mt-5 overflow-hidden rounded-[1.5rem] border border-border-strong bg-panel p-4 shadow-sm  sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-xl font-black tracking-tight text-fg sm:text-2xl">
              Create a new Engine
            </h3>
          </div>
          {(() => {
            const moduleCost = (m: (typeof modules)[0]) =>
              Math.max(5_000, Math.round((m.baseWork || 60) * 400 * (m.minYear && m.minYear > 2000 ? 1.6 : 1)));
            const totalCost = selected.reduce((s, id) => {
              const m = modules.find((x) => x.id === id);
              return s + (m ? moduleCost(m) : 0);
            }, 80_000);
            const catOrder: { key: string; label: string }[] = [
              { key: "world", label: "World Design" },
              { key: "rendering", label: "Graphic" },
              { key: "audio", label: "Audio" },
              { key: "ai", label: "AI" },
              { key: "networking", label: "Networking" },
              { key: "tools", label: "Tools" },
              { key: "core_runtime", label: "Core" },
              { key: "save_data", label: "Save" },
              { key: "physics", label: "Physics" },
              { key: "ui", label: "UI" },
              { key: "scripting", label: "Scripting" },
              { key: "build_deploy", label: "Build" },
              { key: "quality_telemetry", label: "Telemetry" },
            ];
            const byCat = new Map<string, typeof modules>();
            for (const m of modules) {
              const list = byCat.get(m.category) ?? [];
              list.push(m);
              byCat.set(m.category, list);
            }
            return (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Input
                    className="min-w-[10rem] flex-1 !border-border-strong !bg-[rgba(8,28,38,0.9)] !text-fg"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Game Engine #1"
                  />
                  <div className="flex items-center gap-1.5 rounded-xl border border-border-strong bg-panel px-3 py-2 text-sm font-bold text-fg">
                    Cost: {formatCash(totalCost)}
                    <Diamond className="h-4 w-4 text-tech" aria-hidden />
                  </div>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-muted">
                    Purpose
                    <select
                      className="mt-1 w-full rounded-xl border border-border-strong bg-paper px-3 py-2.5 text-sm font-semibold text-fg"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value as EnginePurpose)}
                    >
                      {(Object.keys(PURPOSE_LABEL) as EnginePurpose[]).map((p) => (
                        <option key={p} value={p}>
                          {PURPOSE_LABEL[p]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-muted">
                    Architecture
                    <select
                      className="mt-1 w-full rounded-xl border border-border-strong bg-paper px-3 py-2.5 text-sm font-semibold text-fg"
                      value={architecture}
                      onChange={(e) => setArchitecture(e.target.value as ArchitectureStyle)}
                    >
                      {(Object.keys(ARCH_LABEL) as ArchitectureStyle[]).map((a) => (
                        <option key={a} value={a}>
                          {ARCH_LABEL[a]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto pr-0.5">
                  {catOrder.map(({ key, label }) => {
                    const list = byCat.get(key);
                    if (!list?.length) return null;
                    const isRender = key === "rendering";
                    return (
                      <div
                        key={key}
                        className="rounded-2xl border border-border bg-paper p-3"
                      >
                        <h4 className="mb-2 text-base font-bold text-tech">{label}</h4>
                        <div className={cnJoin("grid gap-2", isRender ? "grid-cols-2" : "grid-cols-1")}>
                          {list.map((m) => {
                            const on = selected.includes(m.id);
                            const cost = moduleCost(m);
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => toggle(m.id)}
                                className={cnJoin(
                                  "flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition",
                                  on
                                    ? "border-cyan-300/70 bg-gradient-to-r from-cyan-500/25 to-teal-500/15 text-fg shadow-[0_0_14px_rgba(77,240,255,0.2)]"
                                    : "border-border bg-elevated text-muted hover:border-accent",
                                )}
                              >
                                <span className="min-w-0 font-semibold leading-snug">{m.name}</span>
                                <span className="flex shrink-0 items-center gap-1 text-xs font-bold tabular text-tech">
                                  {cost >= 1000 ? `${Math.round(cost / 1000)}K` : formatCash(cost)}
                                  <Diamond className="h-3.5 w-3.5" aria-hidden />
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-center text-[11px] text-subtle">
                  Cash on hand {formatCash(cash)}. Modules set capability — not free review points.
                </p>
                <Button
                  size="lg"
                  className="mt-3 w-full !rounded-full !bg-gradient-to-b from-[#4df0ff] to-[#1ab8c8] !text-[#042028] !shadow-[0_0_20px_rgba(77,240,255,0.35)]"
                  onClick={start}
                >
                  Create Engine
                </Button>
              </>
            );
          })()}
        </section>
      )}
    </ScreenBackdrop>
  );
}

export function PlatformsScreen() {
  const unlocked = useGame((s) => s.unlockedPlatforms);
  const year = useGame((s) => s.year);
  const licensePlatform = useGame((s) => s.licensePlatform);
  const [msg, setMsg] = useState("");
  const [focus, setFocus] = useState<string | null>(null);
  const list = PLATFORMS.filter((p) => p.year <= year + 3 && !(p as { isCustom?: boolean }).isCustom);
  const focused =
    list.find((p) => p.id === focus) ?? list.find((p) => unlocked.includes(p.id)) ?? list[0];

  return (
    <ScreenBackdrop screen="platforms">
      <div className="game-panel px-4 py-3 text-center">
        <h2 className="text-2xl font-bold text-fg">Systems</h2>
        <p className="mt-0.5 text-sm text-muted">Hardware you can ship on · product shots</p>
      </div>
      {msg && <p className="text-center text-sm text-warn">{msg}</p>}

      {focused && (
        <div className="overflow-hidden rounded-2xl border border-border bg-paper">
          <div className="relative aspect-[16/9] bg-black/40">
            <img
              src={platformArt(focused.id, year) ?? platformThumb(focused.id, year) ?? ""}
              alt={focused.name}
              className="h-full w-full object-contain p-4"
              draggable={false}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8">
              <h3 className="text-xl font-bold text-white">{focused.name}</h3>
              <p className="text-xs text-white/60">
                {focused.year} · {unlocked.includes(focused.id) ? "Licensed" : "Not licensed"} · market{" "}
                {Math.round(focused.marketSize * 100)}% base
              </p>
              <PlatformLifecycleLine platformId={focused.id} year={year} />
            </div>
          </div>
        </div>
      )}

      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {list.map((p) => {
          const owned = unlocked.includes(p.id);
          const thumb = platformThumb(p.id, year);
          const lockedYear = p.year > year;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setFocus(p.id)}
                className={cnJoin(
                  "flex w-full flex-col overflow-hidden rounded-xl border text-left",
                  focus === p.id || (!focus && focused?.id === p.id)
                    ? "border-accent ring-1 ring-accent/40"
                    : "border-border",
                  owned ? "bg-paper" : "bg-elevated/80",
                )}
              >
                <div className="aspect-square bg-black/30 p-2">
                  {thumb ? (
                    <img src={thumb} alt="" className="h-full w-full object-contain" draggable={false} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs font-bold text-muted">
                      {p.short}
                    </div>
                  )}
                </div>
                <div className="px-2 py-2">
                  <div className="truncate text-xs font-bold text-fg">{p.name}</div>
                  <div className="mt-0.5 flex items-center justify-between gap-1">
                    <span className="text-[10px] text-muted">{p.year}</span>
                    {owned ? (
                      <Badge tone="good">Owned</Badge>
                    ) : lockedYear ? (
                      <span className="text-[10px] font-bold text-tech">Soon</span>
                    ) : (
                      <span
                        role="button"
                        tabIndex={0}
                        className="text-[10px] font-bold text-accent"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMsg(licensePlatform(p.id) ?? "Licensed.");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.stopPropagation();
                            setMsg(licensePlatform(p.id) ?? "Licensed.");
                          }
                        }}
                      >
                        License
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </ScreenBackdrop>
  );
}

export function UnlocksScreen({ embedded = false }: { embedded?: boolean }) {
  const unlocks = useGame((s) => s.unlocks);
  const researched = useGame((s) => s.researched);
  const gamesPublished = useGame((s) => s.gamesPublished);
  const office = useGame((s) => s.office);
  const fans = useGame((s) => s.fans);
  const year = useGame((s) => s.year);

  const stateObj = useGame();
  const rows = SYSTEM_UNLOCKS.map((u) => ({
    def: u,
    state: (unlocks[u.id] ?? (u.startOwned ? "owned" : "hidden")) as string,
  }));
  // Show owned/teased/discovered/researchable + a few locked previews with requirements
  const open = rows.filter((r) => r.state !== "hidden");
  const lockedPreview = rows
    .filter((r) => r.state === "hidden")
    .slice(0, 8)
    .map((r) => ({ ...r, state: "teased" as string, preview: true as const }));
  const visible = [...open, ...lockedPreview.filter((l) => !open.some((o) => o.def.id === l.def.id))];

  const tone: Record<string, string> = {
    owned: "border-good/40 bg-good/10 text-good",
    researchable: "border-accent/40 bg-accent/15 text-accent",
    discovered: "border-border bg-elevated text-fg",
    teased: "border-border bg-panel text-muted",
    hidden: "border-border/50 bg-panel/50 text-subtle",
  };

  const body = (
    <>
      {!embedded && (
        <div className="game-panel px-4 py-3 text-center">
          <h2 className="text-2xl font-bold text-fg">Unlocks</h2>
          <p className="mt-0.5 text-sm text-muted">
            Studio systems · {gamesPublished} games · office {office} · {formatFans(fans)} fans · {year}
          </p>
        </div>
      )}
      {embedded && (
        <p className="text-xs text-muted">
          Progress · {gamesPublished} games · office {office} · {year}
        </p>
      )}
      <ul className="mt-3 max-h-[40dvh] space-y-2 overflow-y-auto pr-0.5">
        {visible.map(({ def, state }) => (
          <li key={def.id} className={cnJoin("rounded-xl border px-3 py-3", tone[state] ?? tone.hidden)}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold">{def.label}</div>
                <p className="mt-0.5 text-xs opacity-80">{def.ownNote}</p>
                {(state === "teased" || state === "discovered") && (
                  <p className="mt-1 text-[10px] opacity-70">
                    {describeUnlockRequirements(def.id, stateObj)
                      .slice(0, 3)
                      .map((r) => (r.met ? "✓ " : "○ ") + r.label)
                      .join(" · ") || "Keep shipping"}
                  </p>
                )}
              </div>
              <span className="shrink-0 rounded-full border border-current/30 px-2 py-0.5 text-[10px] font-bold uppercase">
                {state}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-xl border border-border bg-paper p-3">
        <h3 className="text-sm font-bold text-fg">Research owned</h3>
        <p className="mt-1 text-xs text-muted">
          {researched.length
            ? researched.slice(0, 24).join(" · ")
            : "None yet — earn RP while developing."}
        </p>
      </div>
    </>
  );

  if (embedded) return <div className="space-y-1">{body}</div>;
  return <ScreenBackdrop screen="research">{body}</ScreenBackdrop>;
}

export function FinancesScreen() {
  const cash = useGame((s) => s.cash);
  const ledger = useGame((s) => s.ledger);
  const entries = ledger?.entries?.slice(-30).reverse() ?? [];
  return (
    <ScreenBackdrop screen="finances">
      <h2 className="text-center text-2xl font-bold text-fg">Finances</h2>
      <p className="mt-2 text-center text-3xl font-bold tabular text-emerald-300">{formatCash(cash)}</p>
      <ul className="mt-4 space-y-1.5">
        {entries.map((e) => (
          <li key={e.id} className="flex justify-between gap-3 rounded-lg border border-border bg-paper px-3 py-2 text-sm backdrop-blur-sm">
            <span className="truncate text-muted">
              W{e.week} · {e.label}
            </span>
            <span className={cnJoin("tabular font-bold", e.amount >= 0 ? "text-emerald-300" : "text-red-300")}>
              {formatCash(e.amount)}
            </span>
          </li>
        ))}
        {!entries.length && <li className="text-center text-sm text-muted">No ledger entries yet.</li>}
      </ul>
    </ScreenBackdrop>
  );
}


export function OpsPublisherDeals() {
  const fans = useGame((s) => s.fans);
  const active = useGame((s) => s.activePublisherDealId);
  const signOpsPublisher = useGame((s) => s.signOpsPublisher);
  const [msg, setMsg] = useState("");
  const deals = [
    { id: "vina_games", name: "Vina Games", min: 0, score: 6.5, advance: 45000, cut: 0.22 },
    { id: "electronic_arts", name: "Electronic Arts", min: 25000, score: 7.5, advance: 180000, cut: 0.15 },
    { id: "nintendont", name: "Nintendont", min: 100000, score: 8.5, advance: 600000, cut: 0.08 },
  ];
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">
        Corporate deals — advance now; hit score or pay 60% breach fine. Active: {active ?? "none"}
      </p>
      {msg && <p className="text-xs text-warn">{msg}</p>}
      {deals.map((d) => (
        <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-elevated px-3 py-2">
          <div>
            <div className="text-sm font-bold text-fg">{d.name}</div>
            <div className="text-[10px] text-muted">
              ★{d.score}+ · {Math.round(d.cut * 100)}% cut · need {d.min.toLocaleString()} fans
            </div>
          </div>
          <Button
            size="sm"
            disabled={fans < d.min || !!active}
            onClick={() => setMsg(signOpsPublisher(d.id) ?? "Signed.")}
          >
            +{formatCash(d.advance)}
          </Button>
        </div>
      ))}
    </div>
  );
}

export function ContractsScreen() {
  const board = useGame((s) => s.publishingBoard);
  const activeId = useGame((s) => s.activePublisherDealId);
  const contracts = useGame((s) => s.contracts);
  const activeContract = useGame((s) => s.activeContract);
  const fans = useGame((s) => s.fans);
  const gamesPublished = useGame((s) => s.gamesPublished);
  const acceptPublisherDeal = useGame((s) => s.acceptPublisherDeal);
  const refreshPublisherBoard = useGame((s) => s.refreshPublisherBoard);
  const clearPublisherDeal = useGame((s) => s.clearPublisherDeal);
  const takeContract = useGame((s) => s.takeContract);
  const unlocks = useGame((s) => s.unlocks);
  const [msg, setMsg] = useState("");
  const unlocked =
    gamesPublished >= 2 ||
    fans >= 500 ||
    unlocks.publishing === "owned" ||
    unlocks.contracts === "owned";
  const deals = board?.deals ?? [];
  const activeDeal = deals.find((d) => d.id === activeId) ?? null;

  return (
    <ScreenBackdrop screen="finances">
      <div className="game-panel px-4 py-3 text-center">
        <h2 className="text-2xl font-bold text-fg">Contracts</h2>
        <p className="mt-0.5 text-sm text-muted">Publisher advances · freelance work</p>
      </div>
      {msg && <p className="text-center text-sm text-warn">{msg}</p>}

      {activeDeal && (
        <div className="rounded-xl border border-accent/40 bg-accent/10 p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-accent">Active publisher deal</div>
          <div className="mt-1 font-bold text-fg">{activeDeal.publisherName}</div>
          <p className="mt-1 text-xs text-muted">{activeDeal.description}</p>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => { clearPublisherDeal(); setMsg("Deal cleared (advance kept)."); }}>
            Drop deal
          </Button>
        </div>
      )}

      <div className="mt-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Publisher board</h3>
          <Button
            size="sm"
            variant="secondary"
            disabled={!unlocked}
            onClick={() => setMsg(refreshPublisherBoard() ?? "Board refreshed.")}
          >
            Refresh
          </Button>
        </div>
        {!unlocked && (
          <p className="text-sm text-muted">Ship 2 games or grow fans to unlock publisher offers.</p>
        )}
        {unlocked && !deals.length && (
          <p className="text-sm text-muted">No offers this season — wait a few weeks or refresh.</p>
        )}
        <ul className="space-y-2">
          {deals.map((d) => (
            <li key={d.id} className="rounded-xl border border-border bg-paper p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-fg">{d.publisherName}</div>
                  <p className="mt-1 text-xs text-muted">{d.description}</p>
                  <p className="mt-1 text-[11px] text-subtle">
                    Advance {formatCash(d.upfrontPayment)} · keep {Math.round(d.royaltyRate * 100)}% · need{" "}
                    {d.minimumReviewScore}+ · expires W{d.expirationWeek}
                    {d.genreRequirement ? ` · wants ${d.genreRequirement}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={!!activeId}
                  onClick={() => setMsg(acceptPublisherDeal(d.id) ?? "Deal signed.")}
                >
                  Sign
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {(unlocks.contracts === "owned" || contracts.length > 0 || activeContract) && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Freelance</h3>
          {activeContract && (
            <p className="mb-2 text-sm text-fg">
              Active: {activeContract.title} · {activeContract.progress}/{activeContract.weeks}w
            </p>
          )}
          <ul className="space-y-2">
            {contracts.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-paper px-3 py-2">
                <div>
                  <div className="font-semibold text-fg">{c.title}</div>
                  <div className="text-xs text-muted">
                    {formatCash(c.reward)} · {c.researchReward} RP · {c.weeks}w
                  </div>
                </div>
                <Button size="sm" disabled={!!activeContract} onClick={() => setMsg(takeContract(c.id) ?? "Accepted.")}>
                  Take
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ScreenBackdrop>
  );
}


export function PatchDlcButtons({ gameId, onMsg }: { gameId: string; onMsg: (s: string) => void }) {
  const issuePatch = useGame((s) => s.issuePatch);
  const buildDlc = useGame((s) => s.buildDlc);
  const runPostMortem = useGame((s) => s.runPostMortem);
  const g = useGame((s) => s.releasedGames.find((x) => x.id === gameId));
  if (!g) return null;
  const offShelf = !g.onSale || !(g.weeklySalesLeft?.length);
  return (
    <>
      {(g.bugs ?? 0) > 0 && (
        <Button size="sm" variant="secondary" onClick={() => onMsg(issuePatch(gameId) ?? "Patched.")}>
          Patch (−10 RP)
        </Button>
      )}
      {!g.hasDlc && ["medium", "large", "aaa"].includes(g.size) && (
        <Button size="sm" variant="secondary" onClick={() => onMsg(buildDlc(gameId) ?? "DLC out.")}>
          Ship DLC
        </Button>
      )}
      {g.hasDlc && (
        <span className="text-[10px] font-bold text-good">DLC live · {formatCash(g.dlcRevenue ?? 0)}</span>
      )}
      {offShelf && !g.postMortemDone && (
        <Button size="sm" variant="secondary" onClick={() => onMsg(runPostMortem(gameId) ?? "Done.")}>
          Post-mortem (−5 RP)
        </Button>
      )}
      {g.postMortemDone && (
        <span className="text-[10px] font-bold text-muted">Post-mortem filed</span>
      )}
    </>
  );
}


export function ConsoleConfigurator({
  name,
  setName,
  onMsg,
}: {
  name: string;
  setName: (s: string) => void;
  onMsg: (s: string) => void;
}) {
  const startConfiguredConsole = useGame((s) => s.startConfiguredConsole);
  const [media, setMedia] = useState<MediaDriveId>("High_Speed_CD");
  const [gpu, setGpu] = useState<GpuPartId>("16_Bit_Copper");
  const [price, setPrice] = useState(299);
  const rd = consoleRdCost(media, gpu);
  return (
    <div className="rounded-xl border border-accent/30 bg-paper p-3">
      <p className="text-sm font-bold text-fg">Component configurator</p>
      <p className="mb-2 text-[11px] text-muted">Pick media + GPU · unit mfg = media + GPU + $15 assembly</p>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Console name" />
      <label className="mt-2 block text-[10px] font-bold uppercase text-muted">Media drive</label>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(MEDIA_DRIVES) as MediaDriveId[]).map((id) => (
          <button
            key={id}
            type="button"
            className={cnJoin(
              "rounded-full border px-2 py-1 text-[10px] font-semibold",
              media === id ? "border-accent bg-accent/20 text-accent" : "border-border text-muted",
            )}
            onClick={() => setMedia(id)}
          >
            {MEDIA_DRIVES[id].name} (${MEDIA_DRIVES[id].unit_cost})
          </button>
        ))}
      </div>
      <label className="mt-2 block text-[10px] font-bold uppercase text-muted">Graphics</label>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(GPU_PARTS) as GpuPartId[]).map((id) => (
          <button
            key={id}
            type="button"
            className={cnJoin(
              "rounded-full border px-2 py-1 text-[10px] font-semibold",
              gpu === id ? "border-accent bg-accent/20 text-accent" : "border-border text-muted",
            )}
            onClick={() => setGpu(id)}
          >
            {GPU_PARTS[id].name} (${GPU_PARTS[id].unit_cost})
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-fg">
        <span>
          Unit cost <strong className="tabular">${rd.unitCost.toFixed(2)}</strong>
        </span>
        <span>
          R&D <strong className="tabular text-accent">{formatCash(rd.cash)}</strong> · {rd.rp} RP
        </span>
        <span>
          Share mod <strong>{rd.shareMod.toFixed(2)}×</strong>
        </span>
        <label className="flex items-center gap-1">
          Retail
          <input
            type="number"
            className="w-20 rounded border border-border bg-elevated px-1 py-0.5 tabular"
            min={199}
            max={599}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </label>
        {price < rd.unitCost && (
          <span className="text-warn">Loss leader −${(rd.unitCost - price).toFixed(2)}/unit</span>
        )}
      </div>
      <Button
        className="mt-2 w-full"
        onClick={() => onMsg(startConfiguredConsole(media, gpu, name, price) ?? "Building.")}
      >
        Fund component build
      </Button>
    </div>
  );
}

export function HardwareLabScreen() {
  const consoles = useGame((s) => s.playerConsoles) ?? [];
  const cash = useGame((s) => s.cash);
  const office = useGame((s) => s.office);
  const rp = useGame((s) => s.researchPoints);
  const startPlayerConsole = useGame((s) => s.startPlayerConsole);
  const setConsolePricing = useGame((s) => s.setConsolePricing);
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("Forge Station");
  const officeSubTier = useGame((s) => s.officeSubTier) ?? 2;
  const highDensity = office === 2 && officeSubTier >= 2.5;
  const accessoriesOpen = office >= 3 || highDensity;
  const consoleOpen = office >= 4;
  const unlocked = accessoriesOpen || consoleOpen || office === 2;

  return (
    <div className="space-y-3">
      <div className="game-panel px-4 py-3 text-center">
        <h2 className="text-xl font-bold text-fg">Hardware Lab</h2>
        <p className="text-xs text-muted">
          L2.5 workbench · L3 factory · L4 consoles
        </p>
      </div>
      {!unlocked && (
        <p className="text-center text-sm text-muted">
          Reach Industry Mega-Complex (Level 3) for peripherals. R&D Lab (Level 4) for consoles.
        </p>
      )}
      {msg && <p className="text-center text-sm text-warn">{msg}</p>}
      <ul className="space-y-2">
        {consoles.map((c) => (
          <li key={c.id} className="rounded-xl border border-border bg-paper p-3">
            <div className="font-bold text-fg">{c.name}</div>
            <p className="text-xs text-muted">
              {c.status === "developing"
                ? `Developing · ${c.weeksLeft}w left`
                : `Shipping · share ${c.marketShare.toFixed(2)} · ${c.unitsSold.toLocaleString()} boxes`}
              {c.unitMfgCost != null && (
                <span className="block text-[10px] text-subtle">
                  Mfg ${c.unitMfgCost.toFixed(2)} · retail ${c.retailPrice}
                </span>
              )}
            </p>
            {c.status === "shipping" && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <label className="flex items-center gap-1 text-muted">
                  Price
                  <input
                    type="number"
                    className="w-20 rounded border border-border bg-elevated px-1 py-0.5 tabular text-fg"
                    value={c.retailPrice}
                    min={199}
                    max={599}
                    onChange={(e) =>
                      setConsolePricing(c.id, Number(e.target.value), c.royaltyRate)
                    }
                  />
                </label>
                <label className="flex items-center gap-1 text-muted">
                  Royalty %
                  <input
                    type="number"
                    className="w-16 rounded border border-border bg-elevated px-1 py-0.5 tabular text-fg"
                    value={Math.round(c.royaltyRate * 100)}
                    min={10}
                    max={30}
                    onChange={(e) =>
                      setConsolePricing(c.id, c.retailPrice, Number(e.target.value) / 100)
                    }
                  />
                </label>
                <span className="text-subtle">
                  {c.retailPrice < 299 ? "Loss-leader share boost" : "Margin play"}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
      {consoleOpen && (
        <ConsoleConfigurator name={name} setName={setName} onMsg={setMsg} />
      )}
      {consoleOpen && (
        <div className="rounded-xl border border-border bg-elevated p-3">
          <p className="mb-2 text-[10px] font-bold uppercase text-muted">Quick tiers (legacy)</p>
          <div className="space-y-2">
            {(Object.keys(HARDWARE_TIERS) as HardwareTierId[]).map((tier) => {
              const def = HARDWARE_TIERS[tier];
              return (
                <button
                  key={tier}
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-paper px-3 py-2 text-left text-sm"
                  onClick={() => setMsg(startPlayerConsole(tier, name) ?? "Program started.")}
                >
                  <span className="font-bold text-fg">{def.name}</span>
                  <span className="tabular font-bold text-accent">{formatCash(def.dev_cost)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <HighDensityAndWorkbench msg={msg} setMsg={setMsg} />
      {office >= 3 && <AccessoryFactoryPanel onMsg={setMsg} />}
    </div>
  );
}

export function HighDensityAndWorkbench({
  msg,
  setMsg,
}: {
  msg: string;
  setMsg: (m: string) => void;
}) {
  const office = useGame((s) => s.office);
  const cash = useGame((s) => s.cash);
  const officeSubTier = useGame((s) => s.officeSubTier) ?? 2;
  const renovateHighDensity = useGame((s) => s.renovateHighDensity);
  const launchWorkbenchAccessory = useGame((s) => s.launchWorkbenchAccessory);
  const runRecruitCampaign = useGame((s) => s.runRecruitCampaign);
  const products = useGame((s) => s.hardwareProducts) ?? [];
  const highDensity = office === 2 && officeSubTier >= 2.5;
  const [cat, setCat] = useState<"apparel" | "arcade_stick" | "gamepad">("apparel");
  const [sku, setSku] = useState("Workbench Drop");
  const [price, setPrice] = useState(19.99);
  const cats = [
    { id: "apparel" as const, label: "Studio Apparel", setup: 12000, rp: 20, unit: 2.5 },
    { id: "arcade_stick" as const, label: "Arcade Joystick", setup: 65000, rp: 50, unit: 11.5 },
    { id: "gamepad" as const, label: "Pro Gamepad", setup: 85000, rp: 60, unit: 14 },
  ];
  const sel = cats.find((c) => c.id === cat)!;
  const margin = price - sel.unit;

  if (office !== 2 && office < 3) return null;

  return (
    <div className="space-y-2">
      {office === 2 && !highDensity && cash >= 450_000 && (
        <div className="rounded-xl border border-accent/40 bg-accent/10 p-3">
          <p className="text-xs font-bold text-fg">High-Density Bay (L2.5)</p>
          <p className="mt-1 text-[11px] text-muted">
            −$120k · seats 6 · rent $42k · workbench + headhunter · +$1.5k clutter/line/mo · 6w fab
          </p>
          <Button
            className="mt-2 w-full"
            size="sm"
            onClick={() => setMsg(renovateHighDensity() ?? "Renovated.")}
          >
            Renovate (−$120,000)
          </Button>
        </div>
      )}
      {highDensity && (
        <>
          <p className="text-center text-[11px] font-semibold text-good">
            High-Density Bay · workbench + headhunter online
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setMsg(runRecruitCampaign("local") ?? "Local ads.")}>
              Local ads $15k
            </Button>
            <Button size="sm" onClick={() => setMsg(runRecruitCampaign("headhunter") ?? "Headhunter.")}>
              Headhunter $40k
            </Button>
          </div>
          <div className="rounded-xl border border-border bg-elevated p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase text-muted">Module 23.5 · Manual Workbench</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {cats.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={cnJoin(
                    "rounded-lg border px-2 py-2 text-left text-xs",
                    cat === c.id ? "border-accent bg-accent/15 text-fg" : "border-border text-muted",
                  )}
                  onClick={() => {
                    setCat(c.id);
                    setPrice(c.id === "apparel" ? 19.99 : c.id === "arcade_stick" ? 39.99 : 49.99);
                  }}
                >
                  <div className="font-bold">{c.label}</div>
                  <div className="text-[10px]">
                    {formatCash(c.setup)} · {c.rp} RP · unit ${c.unit.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} />
            <label className="flex items-center justify-between gap-2 text-xs text-muted">
              Retail $
              <input
                type="number"
                step="0.01"
                className="w-28 rounded border border-border bg-paper px-2 py-1 tabular text-fg"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </label>
            <p className={cnJoin("text-[11px] font-semibold", margin >= 0 ? "text-good" : "text-bad")}>
              Margin ${margin.toFixed(2)} · 6w fab · 12w shelf
            </p>
            <Button
              className="w-full"
              onClick={() =>
                setMsg(launchWorkbenchAccessory(cat, sku, price) ?? "Workbench spinning.")
              }
            >
              Spin workbench (−{formatCash(sel.setup)})
            </Button>
            {products.filter((p) => p.workbenchMode).length > 0 && (
              <ul className="space-y-1 text-xs">
                {products.filter((p) => p.workbenchMode).map((p) => (
                  <li key={p.id} className="rounded border border-border bg-paper px-2 py-1">
                    <b>{p.name}</b> ·{" "}
                    {(p.fabWeeksLeft ?? 0) > 0
                      ? `fab ${p.fabWeeksLeft}w left`
                      : `${p.unitsSold} sold · ${p.remainingWeeks}w`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function AccessoryFactoryPanel({ onMsg }: { onMsg: (m: string) => void }) {
  const products = useGame((s) => s.hardwareProducts) ?? [];
  const launchAccessory = useGame((s) => s.launchAccessory);
  const [cat, setCat] = useState<"apparel" | "gamepad" | "vr_visor">("apparel");
  const [sku, setSku] = useState("Studio Merch Drop");
  const [price, setPrice] = useState(19.99);
  const cats = [
    { id: "apparel" as const, label: "Branded Apparel", setup: 12000, rp: 20, unit: 2.5 },
    { id: "gamepad" as const, label: "Pro Gamepad", setup: 85000, rp: 60, unit: 14 },
    { id: "vr_visor" as const, label: "Premium VR Visor", setup: 450000, rp: 200, unit: 110 },
  ];
  const sel = cats.find((c) => c.id === cat)!;
  const margin = price - sel.unit;
  return (
    <div className="rounded-xl border border-border bg-elevated p-3 space-y-2">
      <p className="text-[10px] font-bold uppercase text-muted">Module 23 · Accessory Factory</p>
      <p className="text-[11px] text-muted">
        Setup tooling, unit cost, 16-week warehouse life. Retail below unit = loss-leader fans.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {cats.map((c) => (
          <button
            key={c.id}
            type="button"
            className={cnJoin(
              "rounded-lg border px-2 py-2 text-left text-xs",
              cat === c.id ? "border-accent bg-accent/15 text-fg" : "border-border text-muted",
            )}
            onClick={() => {
              setCat(c.id);
              setPrice(c.id === "apparel" ? 19.99 : c.id === "gamepad" ? 49.99 : 299);
            }}
          >
            <div className="font-bold">{c.label}</div>
            <div className="text-[10px]">
              Setup {formatCash(c.setup)} · {c.rp} RP · unit ${c.unit.toFixed(2)}
            </div>
          </button>
        ))}
      </div>
      <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU name" />
      <label className="flex items-center justify-between gap-2 text-xs text-muted">
        Retail $
        <input
          type="number"
          step="0.01"
          min={0.5}
          className="w-28 rounded border border-border bg-paper px-2 py-1 tabular text-fg"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
        />
      </label>
      <p className={cnJoin("text-[11px] font-semibold", margin >= 0 ? "text-good" : "text-bad")}>
        Margin ${margin.toFixed(2)}/unit {margin < 0 ? "· LOSS LEADER" : ""}
      </p>
      <Button
        className="w-full"
        onClick={() =>
          onMsg(launchAccessory(cat, sku, price) ?? "Production line spinning.")
        }
      >
        Spin factory (−{formatCash(sel.setup)} · {sel.rp} RP)
      </Button>
      {products.length > 0 && (
        <ul className="space-y-1.5 pt-1">
          {products.map((p) => (
            <li key={p.id} className="rounded-lg border border-border bg-paper px-2 py-1.5 text-xs">
              <span className="font-bold text-fg">{p.name}</span>
              <span className="text-muted">
                {" "}
                · {p.categoryLabel} · {p.unitsSold.toLocaleString()} sold · {p.remainingWeeks}w · margin $
                {p.marginEarned.toFixed(0)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}



export function PlatformScreen() {
  const cash = useGame((s) => s.cash);
  const office = useGame((s) => s.office);
  const store = useGame((s) => s.digitalStorefront);
  const packs = useGame((s) => s.installedPacks) ?? [];
  const launchDigitalStorefront = useGame((s) => s.launchDigitalStorefront);
  const installContentPack = useGame((s) => s.installContentPack);
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("NeonStore");
  const packsList = [
    { id: "pack_arcade_revival", name: "Arcade Revival Pack", note: "+15 RP · topics" },
    { id: "pack_space_ops", name: "Orbital Ops Expansion", note: "+$25k · space topics" },
    { id: "pack_community_chaos", name: "Community Chaos (unsigned)", note: "Fails validation" },
  ];
  return (
    <div className="space-y-3">
      <div className="game-panel px-4 py-3 text-center">
        <h2 className="text-xl font-bold text-fg">Digital Platform</h2>
        <p className="text-xs text-muted">
          NeonStore · $2.5M · L3+ · $10M liquid · 0% on your games · 30% rival tax
        </p>
      </div>
      {msg && <p className="text-center text-sm text-warn">{msg}</p>}
      <div className="rounded-xl border border-border bg-elevated p-3 space-y-2">
        <p className="text-[10px] font-bold uppercase text-muted">Storefront</p>
        {store?.active ? (
          <div className="text-sm">
            <div className="font-bold text-good">{store.name} ONLINE</div>
            <div className="text-xs text-muted">
              Last month royalties {formatCash(store.lastMonthRoyalties)} · lifetime{" "}
              {formatCash(store.lifetimeRivalRoyalties)}
            </div>
          </div>
        ) : (
          <>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Store name" />
            <p className="text-[11px] text-muted">
              Cash {formatCash(cash)} · office L{office}. Need L3+ and $10M liquid.
            </p>
            <Button
              className="w-full"
              onClick={() => setMsg(launchDigitalStorefront(name) ?? "Platform deployed.")}
            >
              Deploy platform (−$2.5M)
            </Button>
          </>
        )}
      </div>
      <div className="rounded-xl border border-border bg-elevated p-3 space-y-2">
        <p className="text-[10px] font-bold uppercase text-muted">Modding API · content packs</p>
        {packsList.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={packs.includes(p.id)}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-paper px-3 py-2 text-left text-xs disabled:opacity-40"
            onClick={() => setMsg(installContentPack(p.id) ?? "Installed.")}
          >
            <span>
              <span className="font-bold text-fg">{p.name}</span>
              <span className="block text-muted">{p.note}</span>
            </span>
            <span className="text-muted">{packs.includes(p.id) ? "ON" : "Install"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function NetflixEditionScreen() {
  const cash = useGame((s) => s.cash);
  const fans = useGame((s) => s.fans);
  const hype = useGame((s) => s.hype);
  const office = useGame((s) => s.office);
  const activeIp = useGame((s) => s.activeIpLicense);
  const licenseFranchise = useGame((s) => s.licenseFranchise);
  const runStreamerCampaign = useGame((s) => s.runStreamerCampaign);
  const hostStudioConvention = useGame((s) => s.hostStudioConvention);
  const [msg, setMsg] = useState("");
  const [ticket, setTicket] = useState(49);
  const [conFocus, setConFocus] = useState<"showcase" | "hands_on" | "influencer_night" | "hardware">("showcase");
  const licenses = [
    { id: "echo_chamber", name: "Echo Chamber", cost: 50000, fit: "Sci-Fi / Action" },
    { id: "nightshade_prep", name: "Nightshade Prep", cost: 35000, fit: "City / Adventure" },
    { id: "orbital_heist", name: "Orbital Heist", cost: 75000, fit: "Sci-Fi / Simulation" },
    { id: "clear", name: "Clear license", cost: 0, fit: "—" },
  ];
  const canCon = office >= 3 || fans >= 100_000;
  return (
    <div className="space-y-3">
      <div className="game-panel px-4 py-3 text-center">
        <h2 className="text-xl font-bold text-fg">Netflix Edition</h2>
        <p className="text-xs text-muted">
          Fiction IP licenses · streamer hype · studio conventions · 15% royalty when licensed
        </p>
      </div>
      {msg && <p className="text-center text-sm text-warn">{msg}</p>}
      <div className="rounded-xl border border-border bg-elevated p-3">
        <p className="text-[10px] font-bold uppercase text-muted">Active IP</p>
        <p className="text-sm font-bold text-fg">{activeIp?.name ?? "None"}</p>
        <p className="text-[11px] text-muted">
          Match theme → 1.4× hype & +1.5 score · mismatch hurts · 15% net royalty
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {licenses.map((l) => (
            <button
              key={l.id}
              type="button"
              className="rounded-lg border border-border bg-paper px-3 py-2 text-left text-xs"
              onClick={() => setMsg(licenseFranchise(l.id) ?? "License updated.")}
            >
              <div className="font-bold text-fg">{l.name}</div>
              <div className="text-muted">
                {l.cost ? formatCash(l.cost) : "Free"} · {l.fit}
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-elevated p-3 space-y-2">
        <p className="text-[10px] font-bold uppercase text-muted">Streamer marketing</p>
        <p className="text-[11px] text-muted">
          Explosive hype scales with √fans · decays faster for a few weeks. Cash {formatCash(cash)} · hype{" "}
          {Math.round(hype)}
        </p>
        <Button size="sm" className="w-full" onClick={() => setMsg(runStreamerCampaign("indie") ?? "Live.")}>
          Indie streamer · $8k
        </Button>
        <Button size="sm" className="w-full" onClick={() => setMsg(runStreamerCampaign("mega") ?? "Viral.")}>
          Mega streamer · $45k
        </Button>
      </div>
      <div className="rounded-xl border border-border bg-elevated p-3 space-y-2">
        <p className="text-[10px] font-bold uppercase text-muted">Studio convention</p>
        <p className="text-[11px] text-muted">
          {canCon
            ? "Host your own show — ticket price + presentation focus."
            : "Unlock at Level 3 office or 100,000 fans."}
        </p>
        {canCon && (
          <>
            <label className="flex items-center justify-between text-xs text-muted">
              Ticket $
              <input
                type="number"
                className="w-24 rounded border border-border bg-paper px-2 py-1 tabular text-fg"
                value={ticket}
                min={5}
                max={299}
                onChange={(e) => setTicket(Number(e.target.value))}
              />
            </label>
            <select
              className="w-full rounded border border-border bg-paper px-2 py-2 text-xs text-fg"
              value={conFocus}
              onChange={(e) => setConFocus(e.target.value as typeof conFocus)}
            >
              <option value="showcase">Main Stage Showcase</option>
              <option value="hands_on">Hands-On Floor</option>
              <option value="influencer_night">Creator Night</option>
              <option value="hardware">Hardware Pavilion</option>
            </select>
            <Button
              className="w-full"
              onClick={() => setMsg(hostStudioConvention(ticket, conFocus) ?? "Convention done.")}
            >
              Host convention (~$85k base)
            </Button>
          </>
        )}
      </div>
      <MmoServerPanel />
      <CopyCrisisActions />
    </div>
  );
}

export function MmoServerPanel() {
  const mmos = useGame((s) => s.activeMmos) ?? [];
  const shutdownMmo = useGame((s) => s.shutdownMmo);
  const [msg, setMsg] = useState("");
  if (!mmos.length) return null;
  return (
    <div className="rounded-xl border border-border bg-elevated p-3 space-y-2">
      <p className="text-[10px] font-bold uppercase text-muted">MMO servers</p>
      {msg && <p className="text-[11px] text-warn">{msg}</p>}
      {mmos.map((m) => (
        <div key={m.gameId} className="rounded-lg border border-border bg-paper px-2 py-1.5 text-xs">
          <div className="font-bold text-fg">{m.title}</div>
          <div className="text-muted">
            {m.active ? "ONLINE" : "OFFLINE"} · month {m.monthsOnMarket} · init {m.initialUnits.toLocaleString()} ·
            life ${Math.round(m.lifetimeSubRevenue - m.lifetimeUpkeep).toLocaleString()}
          </div>
          {m.active && (
            <Button size="sm" className="mt-1" variant="secondary" onClick={() => setMsg(shutdownMmo(m.gameId) ?? "Offline.")}>
              Shut down servers
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

export function CopyCrisisActions() {
  const p = useGame((s) => s.currentProject);
  const acceptCopySettlement = useGame((s) => s.acceptCopySettlement);
  const refuseCopySettlement = useGame((s) => s.refuseCopySettlement);
  const pending = !!(p as { pendingCopyCrisis?: boolean } | null)?.pendingCopyCrisis;
  if (!pending) return null;
  return (
    <div className="rounded-xl border border-bad/40 bg-bad/10 p-3 space-y-2">
      <p className="text-xs font-bold text-fg">Patent infringement scare</p>
      <p className="text-[11px] text-muted">Pay $45k or take −1.5 final review score.</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => acceptCopySettlement()}>Pay $45k</Button>
        <Button size="sm" variant="secondary" onClick={() => refuseCopySettlement()}>
          Refuse (−1.5)
        </Button>
      </div>
    </div>
  );
}

export function TEngineScreen() {
  const engines = useGame((s) => s.engines);
  const genreExp = useGame((s) => s.genreExp) ?? {};
  const attachTEngineFramework = useGame((s) => s.attachTEngineFramework);
  const refactorEngine = useGame((s) => s.refactorEngine);
  const [msg, setMsg] = useState("");
  return (
    <div className="space-y-3">
      <div className="game-panel px-4 py-3 text-center">
        <h2 className="text-xl font-bold text-fg">Engines · Tech Debt</h2>
        <p className="text-xs text-muted">
          Debt: −6%/ship −8%/year · Refactor $25k + 20 RP clears uses
        </p>
      </div>
      {msg && <p className="text-center text-sm text-warn">{msg}</p>}
      <ul className="space-y-2">
        {engines.map((e) => {
          const uses = e.gamesShippedCount ?? 0;
          const age = e.chronologicalAgeYears ?? 0;
          const pen = Math.min(60, Math.round(uses * 6 + age * 8));
          return (
          <li key={e.id} className="flex flex-col gap-2 rounded-xl border border-border bg-paper px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-bold text-fg">{e.name}</div>
              <div className="text-[11px] text-muted">
                D+{e.designBonus} T+{e.techBonus}
                {e.tEngineFramework ? " · T-Engine" : ""}
                {" · "}uses {uses} · age {age}y · debt −{pen}%
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!e.tEngineFramework && (
                <Button size="sm" onClick={() => setMsg(attachTEngineFramework(e.id) ?? "Attached.")}>
                  T-Engine
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setMsg(refactorEngine(e.id) ?? "Refactored.")}>
                Refactor
              </Button>
            </div>
          </li>
          );
        })}
      </ul>
      <div className="rounded-xl border border-border bg-elevated p-3">
        <p className="mb-2 text-[10px] font-bold uppercase text-muted">Genre expertise</p>
        <div className="flex flex-wrap gap-2">
          {(["action", "adventure", "rpg", "simulation", "strategy", "casual"] as const).map((g) => {
            const n = genreExp[g] ?? 0;
            const lvl = 1 + Math.floor(n / 5);
            return (
              <span key={g} className="rounded-full border border-border bg-paper px-2.5 py-1 text-[11px] font-semibold text-fg">
                {g} Lv{lvl} <span className="text-muted">({n})</span>
              </span>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-subtle">+5% production points per level · level up every 5 ships</p>
      </div>
    </div>
  );
}


export function SaveLoadPanel() {
  const saveGame = useGame((s) => s.saveGame);
  const loadGame = useGame((s) => s.loadGame);
  const exportSave = useGame((s) => s.exportSave);
  const importSave = useGame((s) => s.importSave);
  const exportSaveMatrix = useGame((s) => s.exportSaveMatrix);
  const companyName = useGame((s) => s.companyName);
  const year = useGame((s) => s.year);
  const week = useGame((s) => s.week);
  const [browserHasSave, setBrowserHasSave] = useState(() => hasSave());
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState("");

  const downloadJson = () => {
    try {
      const json = exportSave();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safe = (companyName || "studio").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 32);
      a.href = url;
      a.download = `${safe}_Y${year}_W${week}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg("Downloaded full campaign JSON.");
      setPreview(json.slice(0, 400) + (json.length > 400 ? "…" : ""));
    } catch {
      setMsg("Download failed.");
    }
  };

  const copyJson = async () => {
    try {
      const json = exportSave();
      await navigator.clipboard?.writeText(json);
      setPreview(json.slice(0, 400) + (json.length > 400 ? "…" : ""));
      setMsg("Full save JSON copied to clipboard.");
    } catch {
      setMsg("Clipboard unavailable — use Download instead.");
    }
  };

  const doImport = () => {
    const ok = importSave(paste);
    setMsg(ok ? "Loaded campaign from pasted JSON." : "Invalid save JSON — nothing changed.");
    if (ok) setPaste("");
  };

  const onFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const ok = importSave(text);
      setBrowserHasSave(hasSave());
      setMsg(ok ? `Loaded from file: ${file.name}` : "File is not a valid campaign save.");
    };
    reader.onerror = () => setMsg("Could not read file.");
    reader.readAsText(file);
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-paper p-3">
      <div>
        <h3 className="text-sm font-bold text-fg">Save & backup</h3>
        <p className="text-[11px] text-muted">
          Keep your campaign safe. Autosave also runs while you play.
        </p>
      </div>
      {msg && (
        <p className="rounded-lg border border-border bg-elevated px-2 py-1.5 text-xs text-fg">{msg}</p>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          className="w-full"
          onClick={() => {
            saveGame();
            setBrowserHasSave(true);
            setMsg("Campaign saved.");
          }}
        >
          Save
        </Button>
        <Button
          className="w-full"
          variant="secondary"
          disabled={!browserHasSave}
          onClick={() => {
            if (!window.confirm("Load the browser save? Unsaved progress will be lost.")) return;
            const ok = loadGame();
            setBrowserHasSave(hasSave());
            setMsg(ok ? "Campaign loaded." : "No browser save found.");
          }}
        >
          Load
        </Button>
        <Button className="w-full" variant="secondary" onClick={downloadJson}>
          Export backup
        </Button>
        <label className="block w-full">
          <span className="sr-only">Import backup file</span>
          <span className="inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-lg border border-border bg-elevated px-3 text-sm font-semibold text-fg">
            Import backup
          </span>
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      <details className="rounded-lg border border-dashed border-border/80 bg-elevated/40 p-2">
        <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wide text-muted">
          Developer tools
        </summary>
        <div className="mt-2 space-y-2">
          <Button className="w-full" size="sm" variant="ghost" onClick={() => void copyJson()}>
            Copy full JSON
          </Button>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={3}
            placeholder="Paste raw save JSON…"
            className="w-full resize-y rounded-lg border border-border bg-paper px-2 py-1.5 font-mono text-[10px] text-fg"
          />
          <Button className="w-full" size="sm" variant="secondary" disabled={!paste.trim()} onClick={doImport}>
            Load pasted JSON
          </Button>
          <Button
            className="w-full"
            size="sm"
            variant="ghost"
            onClick={() => {
              const j = exportSaveMatrix();
              setPreview(j);
              void navigator.clipboard?.writeText(j);
              setMsg("Compact matrix copied.");
            }}
          >
            Copy compact matrix
          </Button>
          {preview && (
            <pre className="max-h-24 overflow-auto rounded-lg border border-border bg-panel p-2 text-[10px] text-muted">
              {preview}
            </pre>
          )}
        </div>
      </details>
    </div>
  );
}

export function SettingsScreen() {
  const setModal = useGame((s) => s.setModal);
  const returnToMenu = useGame((s) => s.returnToMenu);
  const office = useGame((s) => s.office);
  const garage = isGaragePhaseOne({ office });
  const [panel, setPanel] = useState<"unlocks" | "none">("unlocks");
  return (
    <div className="mx-auto max-w-lg space-y-3 px-1 pb-4 pt-1">
      <div className="game-panel px-4 py-3 text-center">
        <h2 className="text-2xl font-bold text-fg">More</h2>
        <p className="text-sm text-muted">{garage ? "Save · unlocks · pause" : "Studio tools"}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={panel === "unlocks" ? "primary" : "secondary"} onClick={() => setPanel("unlocks")}>
          Progress unlocks
        </Button>
      </div>
      {panel === "unlocks" && <UnlocksScreen embedded />}
      <SaveLoadPanel />
      <div className="space-y-2">
        <Button className="w-full" variant="secondary" onClick={() => setModal("pauseMenu")}>
          Pause menu
        </Button>
        <Button className="w-full" variant="secondary" onClick={() => setModal("loopGuide")}>
          How the loop works
        </Button>
        <details className="rounded-xl border border-border bg-paper p-2">
          <summary className="cursor-pointer px-1 py-1 text-xs font-bold uppercase tracking-wide text-muted">
            Developer / CheatMod
          </summary>
          <Button className="mt-2 w-full" variant="secondary" onClick={() => setModal("cheats")}>
            Open CheatMod
          </Button>
        </details>
        <Button
          className="w-full"
          variant="ghost"
          onClick={() => {
            if (!window.confirm("Save and return to the main menu?")) return;
            returnToMenu();
          }}
        >
          Exit to menu
        </Button>
      </div>
    </div>
  );
}


/* ═══════════════════════════ Modals ═══════════════════════════ */

