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

export function TechReadinessPanel({
  project,
  onOptimize,
  onEvaluate,
}: {
  project: NonNullable<ReturnType<typeof useGame.getState>["currentProject"]>;
  onOptimize: (taskId: string) => void;
  onEvaluate: () => void;
}) {
  const tech = project.techSpec;
  const readiness = tech?.readiness;
  const profile = tech?.profile;
  if (!tech && !readiness) {
    return (
      <div className="mt-3 rounded-xl border border-border bg-panel/80 p-3 text-center text-xs text-muted">
        Tech targets set at project start. Open Pre-Release or Evaluate to refresh gates.
        <Button className="mt-2 w-full" size="sm" variant="secondary" onClick={onEvaluate}>
          Evaluate tech readiness
        </Button>
      </div>
    );
  }
  const rec = readiness?.recommendation ?? "hold";
  const recTone =
    rec === "ship" ? "good" : rec === "ship_with_risk" ? "warn" : rec === "blocked" ? "bad" : "neutral";
  const relevant = profile?.axes.filter((a) => a.relevant).slice(0, 6) ?? [];
  const openTasks = (tech?.tasks ?? []).filter((t) => t.state !== "done" && t.state !== "cancelled").slice(0, 4);
  const topBugs = (tech?.classifiedBugs ?? []).filter((b) => !b.fixed).slice(0, 4);

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-border bg-panel/90 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-subtle">Release tech gates</h3>
        {readiness && <Badge tone={recTone === "neutral" ? "accent" : recTone}>{rec.replace(/_/g, " ")}</Badge>}
      </div>
      {readiness && (
        <p className="text-[11px] text-muted">{readiness.recommendationReason}</p>
      )}
      {profile && (
        <div>
          <div className="mb-1 flex justify-between text-[10px] font-bold uppercase text-subtle">
            <span>Runtime health · {profile.targetFps} FPS target</span>
            <span className="tabular">{Math.round(profile.overallHealth * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-panel">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.round(profile.overallHealth * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-muted">
            Weakest: {profile.weakestCriticalAxis ?? "—"} · confidence {Math.round(profile.confidence * 100)}%
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-1">
            {relevant.map((a) => (
              <li key={a.axis} className="rounded-md border border-border/60 bg-panel px-1.5 py-1 text-[10px]">
                <span className="font-semibold uppercase">{a.axis}</span>
                <span className="float-right tabular text-muted">{Math.round(a.utilization * 100)}%</span>
                <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-panel">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round(a.utilization * 100))}%`,
                      background:
                        a.band === "critical" || a.band === "over"
                          ? "var(--color-bad, #e55)"
                          : a.band === "tight"
                            ? "var(--color-warn, #da4)"
                            : "var(--color-good, #4a8)",
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {topBugs.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase text-subtle">Priority defects</p>
          <ul className="mt-1 space-y-0.5 text-[11px] text-muted">
            {topBugs.map((b) => (
              <li key={b.bugId}>
                <span className="font-semibold text-foreground">{b.severity}</span> · {b.category}
                {b.certificationBlocker ? " · cert block" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      {openTasks.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase text-subtle">Optimization tasks</p>
          <ul className="mt-1 space-y-1">
            {openTasks.map((t) => (
              <li key={t.taskId} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="min-w-0 truncate">
                  {t.label}
                  <span className="text-muted">
                    {" "}
                    · {Math.round((t.completedWork / Math.max(1, t.estimatedWork)) * 100)}%
                  </span>
                </span>
                <Button size="sm" variant="secondary" onClick={() => onOptimize(t.taskId)}>
                  Work
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {readiness && readiness.blockers.length > 0 && (
        <ul className="text-[11px] text-bad">
          {readiness.blockers.slice(0, 3).map((b) => (
            <li key={b}>• {b}</li>
          ))}
        </ul>
      )}
      {readiness?.certification?.map((c) => (
        <p key={c.platformId} className="text-[10px] text-muted">
          Cert {c.platformId}: <span className="font-semibold">{c.result.replace(/_/g, " ")}</span>
        </p>
      ))}
      <Button className="w-full" size="sm" variant="ghost" onClick={onEvaluate}>
        Refresh tech evaluation
      </Button>
    </div>
  );
}

/* ═══════════════════════════ Desk overlay (stage + polish) ═══════════════════════════ */


export function ProjectModsBar() {
  const project = useGame((s) => s.currentProject);
  const unlocked = useGame((s) => s.unlockedPlatforms);
  const unlockedDrm = useGame((s) => s.unlockedDrm) ?? ["None"];
  const toggleCrunchMode = useGame((s) => s.toggleCrunchMode);
  const setSecondaryPlatforms = useGame((s) => s.setSecondaryPlatforms);
  const setProjectDrm = useGame((s) => s.setProjectDrm);
  const unlockDrm = useGame((s) => s.unlockDrm);
  const toggleIllicitAssets = useGame((s) => s.toggleIllicitAssets);
  const office = useGame((s) => s.office);
  const knownCombos = useGame((s) => s.knownCombos) ?? {};
  const rp = useGame((s) => s.researchPoints);
  const [msg, setMsg] = useState("");
  // Foundation Lock / Phase One: hide late production mods in the Garage.
  if (isGaragePhaseOne({ office })) return null;
  if (!project) return null;
  const secs = project.secondaryPlatformIds ?? [];
  const candidates = unlocked.filter((id) => id !== project.platformId).slice(0, 8);

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-white/10 bg-black/30 p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-white/50">
          Production mods · v2.2
        </span>
        {msg && <span className="text-[10px] text-amber-200/90">{msg}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={project.crunchMode ? "danger" : "secondary"}
          onClick={() => setMsg(toggleCrunchMode() ?? (project.crunchMode ? "Crunch off" : "Crunch on"))}
        >
          {project.crunchMode ? "Crunch ON · 1.45×" : "Crunch OFF"}
        </Button>
        {(office ?? 1) > 1 && (
        <Button
          size="sm"
          variant={project.usedIllicitAssets ? "danger" : "secondary"}
          onClick={() => setMsg(toggleIllicitAssets() ?? "Toggled")}
        >
          {project.usedIllicitAssets ? "Illicit assets ON" : "Clean assets"}
        </Button>
        )}
        {(project.crisisReviewPenalty ?? 0) > 0 && (
          <span className="rounded-full border border-red-400/40 px-2 py-1 text-[10px] font-bold text-red-300">
            Review pen −{project.crisisReviewPenalty}
          </span>
        )}
        {(project.fluWeeksLeft ?? 0) > 0 && (
          <span className="rounded-full border border-amber-400/40 px-2 py-1 text-[10px] font-bold text-amber-200">
            Flu {project.fluWeeksLeft}w
          </span>
        )}
      </div>
      {knownCombos[`${project.topicId}:${project.genreId}`] && (
        <p className="text-[11px] font-semibold text-accent">
          Known combo: {knownCombos[`${project.topicId}:${project.genreId}`]}
        </p>
      )}
      <div>
        <p className="mb-1 text-[10px] font-bold uppercase text-white/45">
          DRM / copy protection
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DRM_TIERS.map((d) => {
            const have = unlockedDrm.includes(d.id) || d.id === "None";
            const on = (project.drmTier ?? "None") === d.id;
            return (
              <button
                key={d.id}
                type="button"
                className={cnJoin(
                  "rounded-full border px-2 py-1 text-[10px] font-semibold",
                  on
                    ? "border-accent bg-accent/25 text-accent"
                    : have
                      ? "border-white/15 bg-white/5 text-white/70"
                      : "border-white/10 text-white/35",
                )}
                onClick={() => {
                  if (!have) {
                    setMsg(unlockDrm(d.id as DrmTier) ?? `Unlocked ${d.label}`);
                  } else {
                    setMsg(setProjectDrm(d.id as DrmTier) ?? d.label);
                  }
                }}
              >
                {have ? d.label : `${d.label} (${d.rpUnlock} RP)`}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-[10px] text-white/40">RP {Math.floor(rp)} · heavier DRM = less theft, more backlash</p>
      </div>
      {candidates.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase text-white/45">
            Secondary platforms (ports · max 2)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {candidates.map((id) => {
              const on = secs.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  className={cnJoin(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                    on
                      ? "border-accent bg-accent/20 text-accent"
                      : "border-white/15 bg-white/5 text-white/70",
                  )}
                  onClick={() => {
                    const next = on ? secs.filter((x) => x !== id) : [...secs, id].slice(0, 2);
                    setMsg(setSecondaryPlatforms(next) ?? (on ? "Removed" : "Added port"));
                  }}
                >
                  {getPlatform(id)?.short ?? id}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function DevelopOverlay({ sheet = false }: { sheet?: boolean }) {
  const screen = useGame((s) => s.screen);
  const project = useGame((s) => s.currentProject);
  const setScreen = useGame((s) => s.setScreen);
  const office = useGame((s) => s.office);
  const deskArt = roomArtDefForOffice(office).desk;

  if (!project || screen !== "develop") return null;

  if (sheet) {
    return (
      <div className="se-desk-sheet" role="dialog" aria-label="Development desk">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#f0b24a]/95">Desk</p>
            <p className="truncate text-sm font-bold text-white/90">{project.title}</p>
          </div>
          <button
            type="button"
            className="se-cta-secondary !min-h-9 !px-3 !text-xs"
            onClick={() => setScreen("studio")}
          >
            Close
          </button>
        </div>
        <div className="relative h-14 shrink-0 overflow-hidden sm:h-16">
          <img src={deskArt} alt="" className="h-full w-full object-cover object-center" draggable={false} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
        </div>
        <div className="se-desk-scroll">
          <DevelopPanel />
          <ProjectModsBar />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-2 w-full max-w-lg px-3 pb-6">
      <DevelopPanel />
    </div>
  );
}

export function DevelopPanel() {
  const project = useGame((s) => s.currentProject)!;
  const speed = useGame((s) => s.speed);
  const setSlider = useGame((s) => s.setSlider);
  const confirmStage = useGame((s) => s.confirmStage);
  const enterPreRelease = useGame((s) => s.enterPreRelease);
  const workPolishWeek = useGame((s) => s.workPolishWeek);
  const runOptimizationTask = useGame((s) => s.runOptimizationTask);
  const evaluateTechReadiness = useGame((s) => s.evaluateTechReadiness);
  const setLaunchPrice = useGame((s) => s.setLaunchPrice);
  const setProjectTitle = useGame((s) => s.setProjectTitle);
  const releaseGame = useGame((s) => s.releaseGame);
  const cancelProject = useGame((s) => s.cancelProject);
  const advanceWeek = useGame((s) => s.advanceWeek);
  const setSpeed = useGame((s) => s.setSpeed);
  const setModal = useGame((s) => s.setModal);
  const setScreen = useGame((s) => s.setScreen);
  const [msg, setMsg] = useState("");
  const [title, setTitle] = useState(project.title);
  const [price, setPrice] = useState(String(project.launchPrice ?? 25));

  useEffect(() => {
    setTitle(project.title);
    setPrice(String(project.launchPrice ?? 25));
  }, [project.id, project.title, project.launchPrice]);

  const phase = projectPhaseLabel(project);
  const isConfig = project.devPhase.includes("CONFIG");
  const isRunning = project.devPhase.includes("RUNNING");
  const isPolish = project.devPhase === "POLISHING";
  const isRelease = project.devPhase === "READY_TO_RELEASE";
  const fields = isConfig ? stageFieldsForProject(project) : [];
  const stageNum = project.devPhase.startsWith("STAGE_1") ? 1 : project.devPhase.startsWith("STAGE_2") ? 2 : 3;
  const discProg = isRunning ? disciplineProgress(project) : [];
  const pct = Math.round((project.stageProgress || 0) * 100);
  const totalAlloc = fields.reduce((s, f) => s + f.value, 0) || 1;

  return (
    <div className="paper-card rounded-2xl p-4 sm:p-5">
      <h2 className="text-center text-xl font-bold">
        {isConfig ? `Development Stage ${stageNum}` : isRunning ? `Developing — Stage ${stageNum}` : phase.title}
      </h2>
      <div className="mx-auto mt-1 h-px w-[80%] bg-border-strong" />
      <p className="mt-2 text-center text-sm font-semibold">{project.title}</p>
      <p className="text-center text-xs text-muted">
        {getTopic(project.topicId)?.name}/{getGenre(project.genreId).name} · {getPlatform(project.platformId)?.name}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold tabular">
        <span className="rounded-full border border-[#e8941a]/35 bg-[#e8941a]/15 px-2.5 py-0.5 text-[#f0b24a]">
          Design {Math.round(project.designPoints ?? 0)}
        </span>
        <span className="rounded-full border border-[#3aa0d8]/35 bg-[#3aa0d8]/15 px-2.5 py-0.5 text-[#7ec8f0]">
          Tech {Math.round(project.techPoints ?? 0)}
        </span>
        <span className="rounded-full border border-[#e86a4a]/35 bg-[#e86a4a]/12 px-2.5 py-0.5 text-[#ff9a86]">
          Bugs {project.bugs ?? 0}
        </span>
      </div>

      {isConfig && (
        <>
          <p className="mt-2 text-center text-xs text-muted">
            Set time allocation for Stage {stageNum}. Match the genre focus — flat sliders score worse.
          </p>
          <p className="mt-1 text-center text-[11px] text-[#f0b24a]/90">
            {(() => {
              const ideal = idealPhaseSliders(project.genreId, stageNum as 1 | 2 | 3);
              const ranked = Object.entries(ideal)
                .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
                .slice(0, 2)
                .map(([k]) => FIELD_LABELS[k as DevField] ?? k);
              return `Genre focus: push ${ranked.join(" + ")}`;
            })()}
          </p>
          <div className="mt-5 flex justify-center gap-4 sm:gap-6">
            {fields.map((f, i) => (
              <VerticalAllocBar
                key={f.field}
                label={f.label}
                value={f.value}
                color={BAR_COLORS[i % BAR_COLORS.length]}
                onChange={(v) => setSlider(f.field as DevField, v)}
              />
            ))}
          </div>
          <div className="mt-4">
            <p className="mb-1 text-center text-[11px] font-bold uppercase tracking-wide text-subtle">
              Time allocation (preview)
            </p>
            <div className="flex h-3 overflow-hidden rounded-full border border-border">
              {fields.map((f, i) => (
                <div
                  key={f.field}
                  style={{
                    width: `${(f.value / totalAlloc) * 100}%`,
                    background: BAR_COLORS[i % BAR_COLORS.length],
                  }}
                  title={`${f.label}: ${f.value}`}
                />
              ))}
            </div>
          </div>
          {msg && <p className="mt-2 text-center text-sm text-bad">{msg}</p>}
          <Button
            className="mt-4 w-full"
            size="lg"
            onClick={() => {
              const next = confirmStage();
              setMsg(next ?? "");
              if (!next) useGame.getState().setSpeed(1);
            }}
          >
            Start this stage
          </Button>
        </>
      )}

      {isRunning && (
        <>
          <div className="mt-4 text-center">
            <div className="text-3xl font-bold tabular text-accent">{pct}%</div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Stage {stageNum} progress</p>
            <div className="mx-auto mt-2 h-2.5 max-w-xs overflow-hidden rounded-full bg-panel ring-1 ring-border">
              <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${Math.max(pct > 0 ? 3 : 0, pct)}%` }} />
            </div>
            <div className="mx-auto mt-3 max-w-xs">
              <div className="mb-0.5 flex justify-between text-[10px] font-bold uppercase tracking-wide text-subtle">
                <span>Full project</span>
                <span className="tabular">{Math.round(overallProjectProgress(project) * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-panel">
                <div
                  className="h-full rounded-full bg-good transition-all duration-500"
                  style={{ width: `${Math.round(overallProjectProgress(project) * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-muted">{project.weeksDev} weeks in development · Y-based calendar</p>
            </div>
          </div>
          {discProg.length > 0 && (
            <div className="mt-4 space-y-2">
              {discProg.map((d, i) => (
                <div key={d.discipline}>
                  <div className="mb-0.5 flex justify-between text-xs">
                    <span className="font-semibold">{FIELD_LABELS[d.field as DevField] ?? d.label}</span>
                    <span className="tabular text-muted">{Math.round(d.ratio * 100)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-panel">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round(d.ratio * 100)}%`,
                        background: BAR_COLORS[i % BAR_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button size="lg" onClick={() => { setSpeed(1); setMsg(""); }} variant={speed > 0 ? "primary" : "secondary"}>
              {speed > 0 ? "Running…" : "Play"}
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setMsg(advanceWeek() ?? "")}>
              +1 Week
            </Button>
          </div>
          {msg && <p className="mt-2 text-center text-sm text-warn">{msg}</p>}
        </>
      )}

      {isPolish && (
        <>
          <p className="mt-3 text-center text-sm text-muted">
            Polish and clear bugs. Open bugs stay on the build and clear faster after Bug Squashing training.
          </p>
          <div className="mt-3">
            <div className="mb-0.5 flex justify-between text-[10px] font-bold uppercase text-subtle">
              <span>Polish / bug fix</span>
              <span className="tabular">{Math.round((project.stageProgress || 0) * 100)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-panel ring-1 ring-border">
              <div className="h-full rounded-full bg-good transition-all duration-500" style={{ width: `${Math.round((project.stageProgress || 0) * 100)}%` }} />
            </div>
          </div>
          <div className="mx-auto mt-2 max-w-xs">
            <div className="mb-0.5 flex justify-between text-[10px] font-bold uppercase text-subtle">
              <span>Full project</span>
              <span className="tabular">{Math.round(overallProjectProgress(project) * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-panel">
              <div className="h-full rounded-full bg-accent/80 transition-all" style={{ width: `${Math.round(overallProjectProgress(project) * 100)}%` }} />
            </div>
          </div>
          <p className="mt-2 text-center text-sm font-bold tabular text-bugs">{project.bugs} open bugs · {project.weeksDev}w dev</p>
          <TechReadinessPanel
            project={project}
            onOptimize={(id) => setMsg(runOptimizationTask(id) ?? "")}
            onEvaluate={() => setMsg(evaluateTechReadiness() ?? "")}
          />
          <div className="mt-4 flex flex-col gap-2">
            <Button size="lg" onClick={() => setMsg(workPolishWeek() ?? "")}>
              Work on bugs (1 week)
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setMsg(enterPreRelease() ?? "")}>
              Enter Pre-Release
            </Button>
          </div>
          {msg && <p className="mt-2 text-center text-sm text-warn">{msg}</p>}
        </>
      )}

      {isRelease && (
        <>
          <p className="mt-3 text-center text-sm text-muted">Reviews appear only after Release. Price does not change scores. Tech health can still shift reviews.</p>
          <TechReadinessPanel
            project={project}
            onOptimize={(id) => setMsg(runOptimizationTask(id) ?? "")}
            onEvaluate={() => setMsg(evaluateTechReadiness() ?? "")}
          />
          <div className="mt-3 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-subtle">Final title</label>
              <Input value={title} maxLength={40} onChange={(e) => { setTitle(e.target.value); setProjectTitle(e.target.value); }} className="!bg-elevated" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-subtle">Launch price ($)</label>
              <Input type="number" min={5} max={100} value={price} onChange={(e) => { setPrice(e.target.value); setLaunchPrice(Number(e.target.value) || 25); }} className="!bg-elevated" />
            </div>
          </div>
          {msg && <p className="mt-2 text-center text-sm text-bad">{msg}</p>}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm("Trash this game? No reviews or sales.")) {
                  cancelProject();
                  setScreen("studio");
                }
              }}
            >
              Trash Game
            </Button>
            <Button
              size="lg"
              onClick={() => {
                setProjectTitle(title);
                setLaunchPrice(Number(price) || 25);
                setMsg(releaseGame() ?? "");
              }}
            >
              Release Game
            </Button>
          </div>
        </>
      )}

      {!isRelease && !isConfig && (
        <button
          type="button"
          className="mt-4 w-full text-center text-xs font-semibold text-bad underline"
          onClick={() => {
            if (window.confirm("Cancel this project?")) {
              cancelProject();
              setScreen("studio");
            }
          }}
        >
          Cancel project
        </button>
      )}

      <button type="button" className="mt-3 w-full text-center text-xs font-semibold text-muted underline" onClick={() => setScreen("studio")}>
        Back to garage
      </button>
    </div>
  );
}

/** GDT-style vertical allocation control */
export function VerticalAllocBar({
  label,
  value,
  color,
  onChange,
}: {
  label: string;
  value: number;
  color: string;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const setFromPointer = (clientY: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = 1 - (clientY - rect.top) / rect.height;
    onChange(Math.round(Math.max(0, Math.min(100, ratio * 100))));
  };

  return (
    <div className="flex w-16 flex-col items-center sm:w-20">
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="alloc-bar-track cursor-ns-resize touch-none"
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            e.preventDefault();
            onChange(Math.min(100, value + 5));
          } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            e.preventDefault();
            onChange(Math.max(0, value - 5));
          } else if (e.key === "Home") {
            e.preventDefault();
            onChange(0);
          } else if (e.key === "End") {
            e.preventDefault();
            onChange(100);
          }
        }}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          setFromPointer(e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons !== 1) return;
          setFromPointer(e.clientY);
        }}
      >
        <div
          className="alloc-bar-fill"
          style={{
            height: `${value}%`,
            background: color,
          }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        aria-label={`${label} allocation`}
        className="mt-2 w-full accent-[var(--color-accent)]"
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="mt-1 text-center text-[10px] font-bold uppercase tracking-wide text-white/70">
        {label}
      </div>
      <div className="text-sm font-bold tabular text-white/90">{value}</div>
    </div>
  );
}

export { DevelopOverlay as DevelopmentDesk };



