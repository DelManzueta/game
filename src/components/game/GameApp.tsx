/**
 * Studio Empire — stage shell (locked viewport, room world).
 * Domain mutations via useGame only.
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

/* ═══════════════════════════ Root ═══════════════════════════ */

export function GameApp() {
  const phase = useGame((s) => s.phase);
  const speed = useGame((s) => s.speed);
  const tick = useGame((s) => s.tick);

  useEffect(() => {
    if (phase !== "playing" || speed === 0) return;
    // Tuned so a small (~8 in-game weeks) lands near ~1–1.5 min at 1× with stage pauses
    const ms = speed === 1 ? 1100 : speed === 2 ? 520 : 260;
    const id = window.setInterval(() => useGame.getState().tick(), ms);
    return () => window.clearInterval(id);
  }, [phase, speed, tick]);

  if (phase === "menu") return <MainMenu />;
  if (phase === "gameover") return <GameOverScreen />;
  return (
    <>
      <PlayingShell />
      <NewGameModal />
      <ReviewsModal />
      <ReportModal />
      <PauseMenu />
      <ConfirmMenuModal />
      <CheatsModal />
      <EventModal />
      <LoopGuideModal />
      <NotificationsInbox />
      <OfficeOfferModal />
    </>
  );
}

/* ═══════════════════════════ Menu ═══════════════════════════ */

function MainMenu() {
  const newGame = useGame((s) => s.newGame);
  const loadGame = useGame((s) => s.loadGame);
  const deleteSave = useGame((s) => s.deleteSave);
  const [name, setName] = useState("Foundry Games");
  const [pirate, setPirate] = useState(false);
  const [difficulty, setDifficulty] = useState<DifficultyPreset>("standard");
  const [has, setHas] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setHas(hasSave());
  }, []);

  return (
    <div className="se-app relative text-fg">
      {/* Full-bleed 2D garage scene */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={MENU_ROOM_ART}
          alt=""
          className="h-full w-full object-cover object-[center_42%]"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1208]/85 via-[#1a1208]/35 to-[#1a1208]/25" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-end px-4 pb-10 pt-16 sm:justify-center sm:pb-16">
        <div className="mb-5 flex flex-col items-center text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-accent drop-shadow">Phase One · Garage</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight text-fg sm:text-5xl">
            Studio Empire
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-fg/85">
            One founder. One garage. Ship games, grow fans, earn the office.
          </p>
        </div>

        <div className="game-panel w-full max-w-md space-y-4 p-5 sm:p-6">
          <div>
            <label className="mb-1.5 block text-center text-xs font-bold uppercase tracking-wide text-muted">
              Company name
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={32} />
          </div>
          <label className="flex items-center justify-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--color-accent)]"
              checked={pirate}
              onChange={(e) => setPirate(e.target.checked)}
            />
            Pirate mode (harder sales)
          </label>
          <div>
            <label className="mb-1.5 block text-center text-xs font-bold uppercase tracking-wide text-muted">
              Difficulty
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ["creative", "Creative"],
                  ["standard", "Standard"],
                  ["executive", "Executive"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={cnJoin(
                    "rounded-lg border px-2 py-2 text-xs font-bold",
                    difficulty === id
                      ? "border-accent bg-accent/20 text-fg"
                      : "border-border text-muted hover:border-accent/50",
                  )}
                  onClick={() => setDifficulty(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-center text-[10px] text-muted">
              Adjusts cash, competition, cert strictness — not topic/genre meaning.
            </p>
          </div>
          {err && <p className="text-center text-sm text-bad">{err}</p>}
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              if (!name.trim()) {
                setErr("Name your studio.");
                return;
              }
              newGame(name, pirate, difficulty);
            }}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            New Campaign
          </Button>
          {has && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  if (!loadGame()) setErr("Could not load save.");
                }}
              >
                Continue
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  deleteSave();
                  setHas(false);
                }}
              >
                Delete save
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GameOverScreen() {
  const company = useGame((s) => s.companyName);
  const cash = useGame((s) => s.cash);
  const published = useGame((s) => s.gamesPublished);
  const returnToMenu = useGame((s) => s.returnToMenu);
  return (
    <div className="se-app flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-paper p-8 text-center shadow-[var(--shadow-soft)]">
        <p className="text-xs font-bold uppercase tracking-widest text-bad">Bankrupt</p>
        <h1 className="mt-2 text-3xl font-bold">{company}</h1>
        <p className="mt-3 text-sm text-muted">
          {published} game{published === 1 ? "" : "s"} shipped. Cash {formatCash(cash)}.
        </p>
        <Button className="mt-6 w-full" onClick={() => returnToMenu()}>
          Return to menu
        </Button>
      </div>
    </div>
  );
}

/* ═══════════════════════════ Shell — room first ═══════════════════════════ */

function PlayingShell() {
  const screen = useGame((s) => s.screen);
  const office = useGame((s) => s.office);
  const era =
    office >= 4 ? "empire" : office >= 3 ? "studio" : office >= 2 ? "office" : "garage";
  const project = useGame((s) => s.currentProject);
  const phase = projectPhaseLabel(project);
  const forcePause = phase.needsPlayerInput && !!project;
  const secondary =
    screen === "games" ||
    screen === "research" ||
    screen === "staff" ||
    screen === "engines" ||
    screen === "platforms" ||
    screen === "finances" ||
    screen === "market" ||
    screen === "settings";

  return (
    <div className="se-app" data-era={era}>
      <StudioTopBar forcePause={forcePause} />
      <div className="se-stage">
        {/* Always-on room world */}
        <GarageRoomView immersive />
        {/* Develop sheet over the room */}
        {screen === "develop" && <DevelopOverlay sheet />}
        {/* Department panels — scroll inside only */}
        {secondary && (
          <div className="se-panel">
            <div className="se-panel-scroll">
              {screen === "games" && <GamesScreen />}
              {screen === "research" && <ResearchScreen />}
              {screen === "staff" && <StaffScreen />}
              {screen === "engines" && <EnginesScreen />}
              {screen === "platforms" && <PlatformsScreen />}
              {screen === "finances" && (
        <div className="space-y-3">
          <ContractsScreen />
          <FinancesScreen />
        </div>
      )}
              {screen === "market" && (
        <div className="space-y-2">
          <MarketingPanel />
          <MarketScreen />
        </div>
      )}
              {screen === "settings" && <SettingsScreen />}
            </div>
          </div>
        )}
      </div>
      <StudioDock />
    </div>
  );
}

/* Top: project HUD center + vitals right + clock */
function StudioTopBar({ forcePause }: { forcePause: boolean }) {
  const company = useGame((s) => s.companyName);
  const week = useGame((s) => s.week);
  const year = useGame((s) => s.year);
  const month = useGame((s) => s.month);
  const cash = useGame((s) => s.cash);
  const fans = useGame((s) => s.fans);
  const speed = useGame((s) => s.speed);
  const setSpeed = useGame((s) => s.setSpeed);
  const setModal = useGame((s) => s.setModal);
  const saveGame = useGame((s) => s.saveGame);
  const project = useGame((s) => s.currentProject);
  const notifications = useGame((s) => s.notifications);
  const unread = notifications.filter((n) => !n.read).length;
  const phase = projectPhaseLabel(project);
  const pct = Math.round((project?.stageProgress || 0) * 100);

  return (
    <header className="se-top relative">
      <button
        type="button"
        className="shrink-0 text-left"
        onClick={() => {
          saveGame();
          setModal("pauseMenu");
        }}
        aria-label="Menu"
      >
        <div className="text-[11px] font-bold tracking-wide text-white/90">{company || "Studio"}</div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold tabular text-white/70">
          <CalendarDays className="h-3.5 w-3.5 text-[#f0b24a]" aria-hidden />
          {calendarHudLabel({ year, month, week })}
        </div>
      </button>

      {project ? (
        <div className="se-project-pill min-w-0 flex-1 sm:flex-none">
          <span className="title">{project.title}</span>
          <span className="meta">
            {phase.title}
            {project.devPhase.includes("RUNNING") ? ` · ${pct}%` : ""}
          </span>
        </div>
      ) : (
        <div className="hidden min-w-0 flex-1 se-metric-muted text-[11px] sm:block">Garage floor · ship to grow</div>
      )}

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <span className="se-metric se-metric-fans hidden sm:inline">{formatFans(fans)} fans</span>
        <span className="se-metric se-metric-cash">{formatCash(cash)}</span>
        <div className="se-speed" role="group" aria-label="Game speed">
          {(
            [
              [0, Pause, "Pause"],
              [1, Play, "Play"],
              [2, FastForward, "Fast"],
              [4, FastForward, "Max"],
            ] as const
          ).map(([s, Icon, label]) => (
            <button
              key={s}
              type="button"
              title={label}
              aria-label={label}
              data-active={speed === s}
              onClick={() => setSpeed(s as 0 | 1 | 2 | 4)}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </button>
          ))}
        </div>
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white/70"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          onClick={() => setModal("notifications")}
        >
          <Bell className="h-3.5 w-3.5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#e8941a] px-0.5 text-[9px] font-bold text-[#1a1208]">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </div>
      {forcePause && project && (
        <div className="absolute left-0 right-0 top-full z-40 border-b border-amber-400/30 bg-amber-950/90 px-3 py-1 text-center text-[11px] font-semibold text-amber-100">
          Decision needed — {phase.hint}
        </div>
      )}
    </header>
  );
}

function StudioDock() {
  const screen = useGame((s) => s.screen);
  const setScreen = useGame((s) => s.setScreen);
  const office = useGame((s) => s.office);
  const items: { id: typeof screen; label: string; icon: typeof Home }[] = [
    { id: "studio", label: "Studio", icon: Home },
    { id: "games", label: "Games", icon: Gamepad2 },
    { id: "market", label: "Market", icon: TrendingUp },
    { id: "platforms", label: "Systems", icon: Cpu },
    { id: "research", label: "Lab", icon: FlaskConical },
    { id: "settings", label: "More", icon: Settings },
  ];
  void office;
  void Users;
  void Wallet;

  return (
    <nav className="se-dock" aria-label="Studio navigation">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          data-active={screen === id || (id === "studio" && screen === "develop")}
          onClick={() => setScreen(id === "studio" ? "studio" : id)}
        >
          <Icon className="h-4 w-4" aria-hidden />
          <span className="truncate">{label}</span>
        </button>
      ))}
    </nav>
  );
}

/* ═══════════════════════════ Garage room ═══════════════════════════ */

function GarageRoomView({ immersive = false }: { immersive?: boolean }) {
  const state = useGame();
  const ov = studioOverview(state);
  const setModal = useGame((s) => s.setModal);
  const setScreen = useGame((s) => s.setScreen);
  const busy = !!state.currentProject?.devPhase.includes("RUNNING");
  const art = roomArtDefForOffice(state.office);
  const screen = useGame((s) => s.screen);
  // Room is always the world under chrome; hide action chrome on pure secondary screens
  const showChrome = screen === "studio" || screen === "develop";

  return (
    <div className={immersive ? "se-room" : "relative mx-auto w-full max-w-5xl"}>
      <img
        src={art.room}
        alt=""
        className={immersive ? "se-room-img" : "aspect-[16/10] w-full rounded-xl object-cover"}
        style={{ objectPosition: art.objectPosition || "center 48%" }}
        draggable={false}
      />
      {immersive && <div className="se-room-vignette" />}

      {showChrome && immersive && (
        <>
          <div className="se-room-caption pointer-events-none">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f0b24a]/95">
              {state.currentProject
                ? busy
                  ? art.hotspotBusy
                  : art.hotspotOpen
                : art.hotspotIdle}
            </p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-white/90 sm:text-xl">
                  {state.companyName}
                </h1>
                <p className="text-xs text-white/40">
                  {state.office === 1
                    ? "Garage · Phase One"
                    : state.office === 2
                      ? "Small office"
                      : state.office >= 4
                        ? "Global campus"
                        : "Studio floor"}
                </p>
              </div>
              {ov.officeGoal && !ov.officeGoal.activeMove && (
                <p className="max-w-[18rem] text-right text-[12px] leading-snug text-white/50">
                  <span className="text-[#f0b24a]/90">
                    L{ov.officeGoal.stageLevel ?? state.office} {ov.officeGoal.stageName ?? "Studio"} ·{" "}
                  </span>
                  {ov.officeGoal.nextName
                    ? `Next ${ov.officeGoal.nextName}: hold ${formatCash(ov.officeGoal.cashNeed)}`
                    : "Max campus"}
                  {ov.officeGoal.nextHint ? ` — ${ov.officeGoal.nextHint}` : ""}
                </p>
              )}
            </div>
          </div>

          {/* Master loop command strip (Module 6) */}
          <div className="se-float-actions">
            {!state.currentProject ? (
              <button type="button" className="se-cta" onClick={() => setModal("newGame")}>
                1 · Develop game
              </button>
            ) : state.currentProject.devPhase === "READY_TO_RELEASE" ? (
              <button type="button" className="se-cta" onClick={() => setScreen("develop")}>
                1 · Finish · Release
              </button>
            ) : state.currentProject.devPhase.includes("CONFIG") ? (
              <button type="button" className="se-cta" onClick={() => setScreen("develop")}>
                1 · Configure stage
              </button>
            ) : state.currentProject.devPhase === "POLISHING" ? (
              <button type="button" className="se-cta" onClick={() => setScreen("develop")}>
                1 · Polish build
              </button>
            ) : (
              <button type="button" className="se-cta" onClick={() => setScreen("develop")}>
                1 · Desk · {ov.phase.title}
              </button>
            )}
            <button type="button" className="se-cta-secondary" onClick={() => setScreen("market")}>
              2 · Marketing
            </button>
            <button type="button" className="se-cta-secondary" onClick={() => setScreen("finances")}>
              3 · Contracts
            </button>
            <button type="button" className="se-cta-secondary" onClick={() => setScreen("platforms")}>
              4 · Systems
            </button>
            <button type="button" className="se-cta-secondary" onClick={() => setScreen("engines")}>
              5 · Engines
            </button>
            <button type="button" className="se-cta-secondary" onClick={() => setScreen("staff")}>
              6 · People
            </button>
            <button type="button" className="se-cta-secondary" onClick={() => setModal("loopGuide")}>
              How it works
            </button>
            {(ov.officeGoal?.offerState === "offered" ||
              ov.officeGoal?.offerState === "deferred") && (
              <button type="button" className="se-cta-secondary" onClick={() => setModal("officeOffer")}>
                Office offer
              </button>
            )}
            {ov.officeGoal?.canMove && (
              <button
                type="button"
                className="se-cta"
                onClick={() => useGame.getState().upgradeOffice()}
              >
                Move · {ov.officeGoal.nextName ?? "Next office"}
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-[10px] font-semibold tabular text-white/55">
            Hype {Math.round(state.hype)} · RP {Math.floor(state.researchPoints)} · Staff{" "}
            {state.staff.length}
          </p>
        </>
      )}
    </div>
  );
}


function TechReadinessPanel({
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


function ProjectModsBar() {
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

function DevelopOverlay({ sheet = false }: { sheet?: boolean }) {
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
        <div className="shrink-0 px-3 pt-2">
          <ProjectModsBar />
        </div>
        <div className="relative h-20 shrink-0 overflow-hidden sm:h-24">
          <img src={deskArt} alt="" className="h-full w-full object-cover object-center" draggable={false} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        </div>
        <div className="se-desk-scroll">
          <DevelopPanel />
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

function DevelopPanel() {
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
          <Button className="mt-4 w-full" size="lg" onClick={() => setMsg(confirmStage() ?? "")}>
            OK
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
function VerticalAllocBar({
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
        className="alloc-bar-track cursor-ns-resize"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          setFromPointer(e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons !== 1) return;
          setFromPointer(e.clientY);
        }}
      >
        <div className="alloc-bar-fill" style={{ height: `${value}%`, background: color }} />
      </div>
      <div className="mt-2 text-center text-[10px] font-bold leading-tight text-fg sm:text-[11px]">
        {label}
      </div>
      <div className="tabular text-xs font-bold text-muted">{value}</div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        aria-label={label}
        className="mt-1 w-full sm:hidden"
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

/* ═══════════════════════════ Secondary screens ═══════════════════════════ */


function PlatformLifecycleLine({ platformId, year }: { platformId: string; year: number }) {
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

function MarketingPanel() {
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

function GamesScreen() {
  const games = useGame((s) => s.releasedGames);
  const selectGame = useGame((s) => s.selectGame);
  const setModal = useGame((s) => s.setModal);
  const startTitleCampaign = useGame((s) => s.startTitleCampaign);
  const year = useGame((s) => s.year);
  const [sel, setSel] = useState<string | null>(null);
  const [campMsg, setCampMsg] = useState("");
  const rows = libraryRows(games);
  const selected = games.find((g) => g.id === (sel ?? games[0]?.id));
  const chartPts = selected ? salesPointsFromGame(selected) : [];
  const isPlan =
    !!selected &&
    !(selected.weeklyHistory?.length) &&
    (selected.weeklySalesLeft?.length ?? 0) > 0;

  return (
    <ScreenBackdrop screen="games">
      <div className="game-panel px-4 py-3 text-center">
        <h2 className="text-2xl font-bold text-fg">Library</h2>
        <p className="mt-0.5 text-sm text-muted">Sales graphs · reviews · campaigns</p>
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
          const on = (sel ?? games[0]?.id) === r.id;
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setSel(r.id)}
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
              variant="secondary"
              onClick={() =>
                setCampMsg(startTitleCampaign(selected.id, "flyer_run") ?? "Flyer started.")
              }
            >
              Flyer campaign
            </Button>
            <PatchDlcButtons gameId={selected.id} onMsg={setCampMsg} />
            {campMsg && <p className="w-full text-xs text-muted">{campMsg}</p>}
          </div>
        </div>
      )}
    </ScreenBackdrop>
  );
}


/** Soft room art behind paper department panels — one look with the garage. */
function ScreenBackdrop({
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

function ResearchScreen() {
  const researched = useGame((s) => s.researched);
  const researchPoints = useGame((s) => s.researchPoints);
  const active = useGame((s) => s.activeResearch);
  const pipeline = useGame((s) => s.researchPipeline);
  const year = useGame((s) => s.year);
  const startResearch = useGame((s) => s.startResearch);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<"studio" | "pipeline">("pipeline");
  const available = RESEARCH.filter((r) => !researched.includes(r.id)).slice(0, 24);
  const pipeRows = TECH_CATALOG.filter((t) => year >= t.earliestYear - 2).map((def) => {
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

function StaffScreen() {
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

function EnginesScreen() {
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

function PlatformsScreen() {
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

function UnlocksScreen({ embedded = false }: { embedded?: boolean }) {
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

function FinancesScreen() {
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


function OpsPublisherDeals() {
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

function ContractsScreen() {
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


function PatchDlcButtons({ gameId, onMsg }: { gameId: string; onMsg: (s: string) => void }) {
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


function ConsoleConfigurator({
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

function HardwareLabScreen() {
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

function HighDensityAndWorkbench({
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

function AccessoryFactoryPanel({ onMsg }: { onMsg: (m: string) => void }) {
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



function PlatformScreen() {
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

function NetflixEditionScreen() {
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

function MmoServerPanel() {
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

function CopyCrisisActions() {
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

function TEngineScreen() {
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


function SaveLoadPanel() {
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
    <div className="space-y-2 rounded-xl border border-border bg-paper p-3">
      <div>
        <h3 className="text-sm font-bold text-fg">Save / Load JSON</h3>
        <p className="text-[11px] text-muted">
          Browser autosave slot + portable full-campaign JSON files.
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
            setMsg("Saved to browser slot.");
          }}
        >
          Save to browser
        </Button>
        <Button
          className="w-full"
          variant="secondary"
          disabled={!browserHasSave}
          onClick={() => {
            const ok = loadGame();
            setBrowserHasSave(hasSave());
            setMsg(ok ? "Loaded browser slot." : "No browser save found.");
          }}
        >
          Load browser slot
        </Button>
        <Button className="w-full" variant="secondary" onClick={downloadJson}>
          Download .json
        </Button>
        <Button className="w-full" variant="secondary" onClick={() => void copyJson()}>
          Copy full JSON
        </Button>
      </div>
      <label className="block">
        <span className="mb-1 block text-[10px] font-bold uppercase text-muted">Import file</span>
        <input
          type="file"
          accept="application/json,.json"
          className="block w-full text-xs text-muted file:mr-2 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[10px] font-bold uppercase text-muted">Paste JSON</span>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={4}
          placeholder='{"version":…,"companyName":…}'
          className="w-full resize-y rounded-lg border border-border bg-elevated px-2 py-1.5 font-mono text-[10px] text-fg"
        />
      </label>
      <Button className="w-full" variant="secondary" disabled={!paste.trim()} onClick={doImport}>
        Load pasted JSON
      </Button>
      <Button
        className="w-full"
        variant="ghost"
        onClick={() => {
          const j = exportSaveMatrix();
          setPreview(j);
          void navigator.clipboard?.writeText(j);
          setMsg("Compact save matrix copied (telemetry-style snapshot).");
        }}
      >
        Copy compact matrix
      </Button>
      {preview && (
        <pre className="max-h-28 overflow-auto rounded-lg border border-border bg-panel p-2 text-[10px] text-muted">
          {preview}
        </pre>
      )}
    </div>
  );
}

function SettingsScreen() {
  const setModal = useGame((s) => s.setModal);
  const returnToMenu = useGame((s) => s.returnToMenu);
  const setScreen = useGame((s) => s.setScreen);
  const [panel, setPanel] = useState<"unlocks" | "contracts" | "hardware" | "netflix" | "platform" | "engines" | "none">("unlocks");
  const office = useGame((s) => s.office);
  return (
    <div className="mx-auto max-w-lg space-y-3 px-1 pb-4 pt-1">
      <div className="game-panel px-4 py-3 text-center">
        <h2 className="text-2xl font-bold text-fg">More</h2>
        <p className="text-sm text-muted">Unlocks · contracts · staff · engines</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={panel === "unlocks" ? "primary" : "secondary"} onClick={() => setPanel("unlocks")}>
          Unlocks
        </Button>
        {office > 1 && (
        <Button size="sm" variant={panel === "contracts" ? "primary" : "secondary"} onClick={() => setPanel("contracts")}>
          Contracts
        </Button>
        )}
        {/* Late systems hidden in Garage Phase One (Foundation Lock) */}
        {/* Foundation Lock: late packages require feature flags (all off) — never show in Phase One+ */}
        <Button size="sm" variant={panel === "engines" ? "primary" : "secondary"} onClick={() => setPanel("engines")}>
          Engines
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setScreen("staff")}>
          People
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setScreen("finances")}>
          Books
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setScreen("engines")}>
          Engines
        </Button>
      </div>
      {panel === "unlocks" && <UnlocksScreen embedded />}
      {office > 1 && panel === "contracts" && (<><OpsPublisherDeals /><ContractsScreen /></>)}
      {panel === "engines" && <TEngineScreen />}
      <SaveLoadPanel />
      <div className="space-y-2">
        <Button className="w-full" variant="secondary" onClick={() => setModal("pauseMenu")}>
          Pause menu
        </Button>
        <Button className="w-full" variant="secondary" onClick={() => setModal("cheats")}>
          CheatMod
        </Button>
        <Button className="w-full" variant="ghost" onClick={() => returnToMenu()}>
          Exit to menu
        </Button>
      </div>
    </div>
  );
}


/* ═══════════════════════════ Modals ═══════════════════════════ */

function NewGameModal() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  const startProject = useGame((s) => s.startProject);
  const unlockedTopics = useGame((s) => s.unlockedTopics);
  const unlockedGenres = useGame((s) => s.unlockedGenres);
  const unlockedPlatforms = useGame((s) => s.unlockedPlatforms);
  const engines = useGame((s) => s.engines);
  const researched = useGame((s) => s.researched);
  const unlocks = useGame((s) => s.unlocks);
  const flags = useGame((s) => s.flags);
  const garageSlice = useGame((s) => s.garageSlice);
  const cash = useGame((s) => s.cash);
  const office = useGame((s) => s.office);
  const staffCount = useGame((s) => s.staff.length);
  const year = useGame((s) => s.year);
  const topics = TOPICS.filter((t) => unlockedTopics.includes(t.id) && (!garageSlice || isGarageTopic(t.id)));
  const genres = GENRES.filter((g) => unlockedGenres.includes(g.id));
  const platforms = PLATFORMS.filter((p) => unlockedPlatforms.includes(p.id) && (p.year <= year || p.startUnlocked));
  const sizes = availableSizes(researched, unlocks, { office, staffCount });
  const [topicId, setTopicId] = useState(topics[0]?.id ?? "space");
  const [genreId, setGenreId] = useState<GenreId>((genres[0]?.id as GenreId) ?? "action");
  const [platformId, setPlatformId] = useState(platforms[0]?.id ?? "pc");
  const [audience, setAudience] = useState<AudienceId>("everyone");
  const [size, setSize] = useState<GameSize>("small");
  const [engineId, setEngineId] = useState(engines[0]?.id ?? "basic");
  const [featureIds, setFeatureIds] = useState<string[]>(["basic_2d_v1"]);
  const [title, setTitle] = useState("");
  const [marketing, setMarketing] = useState(0);
  const [pillar, setPillar] = useState<ProjectPillar>("default");
  const [err, setErr] = useState("");
  // Classic GDT path: concept → topic → genre → platform → tech → start
  const [step, setStep] = useState<"concept" | "topic" | "genre" | "platform" | "tech">("concept");
  const [topicQuery, setTopicQuery] = useState("");
  const visibleTopics = topics.filter((topic) =>
    topic.name.toLocaleLowerCase().includes(topicQuery.trim().toLocaleLowerCase()),
  );

  const graphicOptions = ENGINE_COMPONENTS.filter(
    (c) =>
      c.category === "Graphics" &&
      (c.starting || researched.includes(c.id) || researched.includes(c.engineFeature ?? "")),
  );
  const soundOptions = ENGINE_COMPONENTS.filter(
    (c) =>
      c.category === "Sound" &&
      (c.starting || researched.includes(c.id) || researched.includes(c.engineFeature ?? "")),
  );

  useEffect(() => {
    if (modal === "newGame") {
      setTopicId(topics[0]?.id ?? "space");
      setGenreId((genres[0]?.id as GenreId) ?? "action");
      setPlatformId(platforms[0]?.id ?? "pc");
      setEngineId(engines[0]?.id ?? "basic");
      setFeatureIds(["basic_2d_v1"]);
      setSize("small");
      setTitle("");
      setMarketing(0);
      setErr("");
      setStep("concept");
      setTopicQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  const featureCost = featureIds.reduce((sum, id) => {
    const c = ENGINE_COMPONENTS.find((x) => x.id === id);
    if (!c || c.starting) return sum;
    return sum + 5000;
  }, 0);
  const cost = SIZE_STATS[size].cost + marketing + featureCost;
  const combo = evaluateCombo({ topicId, genreId, platformId, audience });
  const marketTotal = platforms.reduce((s, p) => s + p.marketSize, 0) || 1;

  const titleByStep: Record<typeof step, string> = {
    concept: "Game Concept",
    topic: "Pick Topic",
    genre: "Pick Genre",
    platform: "Pick Platform",
    tech: "Game Concept",
  };

  const chipBtn = (active: boolean) =>
    cnJoin(
      "min-h-12 rounded-xl border-2 px-3 py-3 text-left text-sm font-bold transition active:scale-[0.98]",
      active
        ? "border-accent bg-accent/15 text-fg shadow-sm"
        : "border-border bg-elevated text-fg hover:border-accent/50",
    );

  const canStart =
    !!topicId &&
    !!genreId &&
    !!platformId &&
    featureIds.length > 0 &&
    cash >= cost;

  return (
    <Modal
      open={modal === "newGame"}
      onClose={() => setModal(null)}
      title={titleByStep[step]}
      wide
    >
      {/* ── Concept hub (GDT Game Concept) ── */}
      {step === "concept" && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
              Working title
            </label>
            <Input
              value={title}
              placeholder={generateGameTitle(topicId, genreId)}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={40}
              className="!border-border-strong !bg-[rgba(8,28,38,0.9)] !text-fg"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-semibold text-muted">Dev cost</span>
            <span className={cnJoin("font-bold tabular", cash >= cost ? "text-tech" : "text-red-300")}>
              {formatCash(cost)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" className={chipBtn(!!topicId)} onClick={() => setStep("topic")}>
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted">Topic</div>
              <div>{getTopic(topicId)?.name ?? "Pick Topic"}</div>
            </button>
            <button type="button" className={chipBtn(!!genreId)} onClick={() => setStep("genre")}>
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted">Genre</div>
              <div className="flex items-center gap-2">
                <img
                  src={genreIconSrc(genreId)}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded-md object-contain"
                  draggable={false}
                />
                <span>{getGenre(genreId).name}</span>
              </div>
            </button>
            <button type="button" className={chipBtn(!!platformId)} onClick={() => setStep("platform")}>
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted">Platform</div>
              <div className="flex items-center gap-2">
                {(platformArt(platformId, year) || platformThumb(platformId, year)) && (
                  <img
                    src={platformArt(platformId, year) || platformThumb(platformId, year)}
                    alt=""
                    className="h-8 w-10 shrink-0 rounded-md object-contain bg-panel"
                    draggable={false}
                  />
                )}
                <span>{getPlatform(platformId)?.name ?? "Pick Platform"}</span>
              </div>
            </button>
            <button type="button" className={chipBtn(featureIds.length > 0)} onClick={() => setStep("tech")}>
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted">Tech pack</div>
              <div className="truncate">
                {featureIds
                  .map((id) => ENGINE_COMPONENTS.find((c) => c.id === id)?.name ?? id)
                  .join(" · ")
                  .replace("Basic 2D Graphics V1", "2D Graphics V1") || "Choose graphics"}
              </div>
            </button>
          </div>

          {(unlocks.audience === "owned" || flags.audience) && (
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-muted">Audience</label>
              <div className="flex flex-wrap gap-2">
                {AUDIENCES.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAudience(a.id as AudienceId)}
                    className={chipBtn(audience === a.id)}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sizes.length > 1 && (
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-muted">Size</label>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button key={s} type="button" onClick={() => setSize(s)} className={chipBtn(size === s)}>
                    {s} ({formatCash(SIZE_STATS[s].cost)})
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-muted">
            Fit {combo.topicGenre}/{combo.platformGenre} · Cash {formatCash(cash)}
          </p>
          <div className="mt-2">
            <p className="mb-1 text-center text-[10px] font-bold uppercase text-muted">
              Project pillar
            </p>
            <div className="flex flex-wrap justify-center gap-1">
              {(Object.keys(PILLAR_LABELS) as ProjectPillar[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={chipBtn(pillar === id)}
                  onClick={() => setPillar(id)}
                >
                  {PILLAR_LABELS[id]}
                </button>
              ))}
            </div>
          </div>
          {err && <p className="text-center text-sm text-red-300">{err}</p>}
          <Button
            size="lg"
            className="w-full"
            disabled={!canStart}
            onClick={() => {
              const msg = startProject({
                title: title || generateGameTitle(topicId, genreId),
                topicId,
                genreId,
                platformId,
                audience,
                size,
                engineId,
                marketingSpend: marketing,
                pillar,
                features: featureIds
                  .map((id) => ENGINE_COMPONENTS.find((c) => c.id === id)?.engineFeature ?? id)
                  .filter(Boolean),
              });
              if (msg) setErr(msg);
            }}
          >
            Start Development
          </Button>
        </div>
      )}

      {/* ── Pick Topic ── */}
      {step === "topic" && (
        <div>
          <button type="button" className="mb-3 text-xs font-bold text-tech underline" onClick={() => setStep("concept")}>
            ← Game Concept
          </button>
          <SearchField
            value={topicQuery}
            onChange={(event) => setTopicQuery(event.target.value)}
            placeholder="Search topics…"
            aria-label="Search topics"
            className="mb-3"
          />
          <div className="grid grid-cols-2 gap-2">
            {visibleTopics.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTopicId(t.id);
                  setStep("concept");
                }}
                className={chipBtn(topicId === t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>
          {visibleTopics.length === 0 && (
            <p className="mt-4 text-center text-sm text-muted">No topics found</p>
          )}
        </div>
      )}

      {/* ── Pick Genre ── */}
      {step === "genre" && (
        <div>
          <button type="button" className="mb-3 text-xs font-bold text-tech underline" onClick={() => setStep("concept")}>
            ← Game Concept
          </button>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {genres.map((g) => {
              const selected = genreId === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setGenreId(g.id as GenreId);
                    setStep("concept");
                  }}
                  className={cnJoin(
                    "flex flex-col items-center gap-2 rounded-xl border-2 px-2 py-3 text-center transition",
                    selected
                      ? "border-cyan-300/80 bg-[rgba(20,40,55,0.92)] text-fg shadow-[0_0_16px_rgba(60,220,240,0.25)]"
                      : "border-border bg-paper text-fg hover:border-accent hover:bg-elevated",
                  )}
                >
                  <img
                    src={genreIconSrc(g.id as GenreId)}
                    alt=""
                    className="h-14 w-14 object-contain drop-shadow-md sm:h-16 sm:w-16"
                    draggable={false}
                  />
                  <span className="text-sm font-bold tracking-tight">{g.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Pick Platform — product cards (reference glass layout) ── */}
      {step === "platform" && (
        <div className="space-y-3">
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-bold text-tech"
            onClick={() => setStep("concept")}
          >
            ← Back
          </button>
          <div className="mx-auto flex max-w-md flex-col gap-4">
            {platforms.map((p) => {
              const share = Math.round((p.marketSize / marketTotal) * 1000) / 10;
              const devCost =
                p.id === "pc"
                  ? Math.round(SIZE_STATS[size].cost * 0.35)
                  : Math.max(
                      SIZE_STATS[size].cost,
                      Math.round(SIZE_STATS[size].cost * (0.85 + p.marketSize * 0.35)),
                    );
              const art = platformArt(p.id, year) ?? platformThumb(p.id, year);
              const selected = platformId === p.id;
              const genres: GenreId[] = ["action", "adventure", "rpg", "simulation", "strategy", "casual"];
              const tierMark = (t: string) =>
                t === "great" ? "+++" : t === "good" ? "++" : t === "ok" ? "+" : "·";
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPlatformId(p.id);
                    setStep("concept");
                  }}
                  className={cnJoin(
                    "w-full overflow-hidden rounded-[1.35rem] border text-left transition active:scale-[0.99]",
                    selected
                      ? "border-accent bg-accent/10 shadow-md"
                      : "border-border-strong bg-[rgba(10,36,48,0.82)] hover:border-cyan-300/50",
                  )}
                >
                  <div className="relative flex h-40 items-center justify-center bg-gradient-to-b from-white/10 to-transparent px-4 pt-4 sm:h-48">
                    {art ? (
                      <img
                        src={art}
                        alt=""
                        className="max-h-full max-w-[88%] object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)]"
                        draggable={false}
                      />
                    ) : (
                      <div className="text-4xl font-black text-fg/30">{p.short}</div>
                    )}
                  </div>
                  <div className="px-5 pb-5 pt-1">
                    <div className="text-center text-2xl font-black tracking-tight text-fg">
                      {p.short || p.name}
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Dev. cost:</span>
                        <span className="font-bold tabular text-cash">{formatCash(devCost)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Marketshare:</span>
                        <span className="font-bold tabular text-fg">{share.toFixed(1)} %</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1.5 text-xs text-muted">Genre match:</div>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {genres.map((g) => {
                          const fit = p.genreAffinity[g] ?? "ok";
                          const hot = g === genreId;
                          return (
                            <div
                              key={g}
                              className={cnJoin(
                                "flex w-[3.1rem] flex-col items-center gap-0.5 rounded-xl border px-1 py-1.5",
                                hot
                                  ? "border-cyan-300/70 bg-cyan-400/15"
                                  : "border-border bg-panel",
                              )}
                              title={`${getGenre(g).name}: ${fit}`}
                            >
                              <img
                                src={genreIconSrc(g)}
                                alt=""
                                className="h-7 w-7 object-contain"
                                draggable={false}
                              />
                              <span
                                className={cnJoin(
                                  "rounded-md px-1 text-[10px] font-black leading-none",
                                  fit === "great"
                                    ? "bg-emerald-500 text-fg"
                                    : fit === "good"
                                      ? "bg-teal-600 text-fg"
                                      : fit === "ok"
                                        ? "bg-slate-600 text-fg"
                                        : "bg-slate-800 text-muted",
                                )}
                              >
                                {tierMark(fit)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {platforms.length === 0 && (
            <p className="text-center text-sm text-muted">
              No platforms unlocked yet — PC should be day one.
            </p>
          )}
        </div>
      )}

      {/* ── Tech pack (graphics / sound) ── */}
      {step === "tech" && (
        <div className="space-y-4">
          <button type="button" className="text-xs font-bold text-tech underline" onClick={() => setStep("concept")}>
            ← Game Concept
          </button>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Graphics</h3>
              <span className="text-xs font-bold text-warn">+{formatCash(featureCost)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {graphicOptions.map((c) => {
                const on = featureIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      // one graphics pick
                      setFeatureIds((prev) => {
                        const withoutGfx = prev.filter(
                          (id) => ENGINE_COMPONENTS.find((x) => x.id === id)?.category !== "Graphics",
                        );
                        return [...withoutGfx, c.id];
                      });
                    }}
                    className={chipBtn(on)}
                  >
                    <div>{c.name}</div>
                    <div className="mt-1 text-[10px] text-muted">{c.starting ? "Free" : "+$5.0K"}</div>
                  </button>
                );
              })}
            </div>
          </div>
          {soundOptions.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Sound</h3>
              <div className="grid grid-cols-2 gap-2">
                {soundOptions.map((c) => {
                  const on = featureIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setFeatureIds((prev) =>
                          on ? prev.filter((id) => id !== c.id) : [...prev, c.id],
                        );
                      }}
                      className={chipBtn(on)}
                    >
                      <div>{c.name}</div>
                      <div className="mt-1 text-[10px] text-muted">{c.starting ? "Free" : "+$5.0K"}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <Button size="lg" className="w-full" onClick={() => setStep("concept")}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
}

function setScreen(id: ScreenId) {
  useGame.getState().setScreen(id);
}

function ReviewsModal() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  const id = useGame((s) => s.lastReviewGameId);
  const games = useGame((s) => s.releasedGames);
  const g = games.find((x) => x.id === id) ?? games[0];
  if (!g || modal !== "reviews") return null;
  return (
    <Modal open title={`Reviews For ${g.title}`} onClose={() => setModal(null)}>
      <div className="space-y-3">
        {g.reviewScores.map((sc, i) => (
          <div key={i} className="flex items-start gap-4">
            <div className="w-10 text-right text-3xl font-bold tabular">
              {typeof sc === "number" ? (sc > 10 ? (sc / 10).toFixed(0) : sc.toFixed(0)) : sc}
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <div className="text-sm font-semibold">
                {g.criticReviews?.[i]?.comment ?? "Solid effort."}
              </div>
              <div className="text-xs text-muted">
                … {g.criticReviews?.[i]?.name ?? REVIEWER_NAMES[i] ?? `Critic ${i + 1}`}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted">Sales begin next week.</p>
      <Button className="mt-4 w-full" onClick={() => setModal(null)}>
        Close
      </Button>
    </Modal>
  );
}

function ReportModal() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  const completeReport = useGame((s) => s.completeReport);
  const knowledge = useGame((s) => s.knowledge);
  if (modal !== "report") return null;
  const entry = knowledge.entries[0];
  return (
    <Modal open title="Game Report" onClose={() => setModal(null)}>
      {entry ? (
        <>
          <h3 className="font-bold">{entry.label}</h3>
          <p className="mt-2 text-sm text-muted">{entry.detail}</p>
          <Button className="mt-4 w-full" onClick={() => { completeReport(entry.key); setModal(null); }}>
            File report
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted">No report pending.</p>
      )}
    </Modal>
  );
}

function PauseMenu() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  const setScreen = useGame((s) => s.setScreen);
  const saveGame = useGame((s) => s.saveGame);
  const returnToMenu = useGame((s) => s.returnToMenu);
  return (
    <Modal open={modal === "pauseMenu"} onClose={() => setModal(null)} title="Paused">
      <div className="space-y-2">
        <Button className="w-full" onClick={() => { saveGame(); setModal(null); }}>
          Save & resume
        </Button>
        <Button
          className="w-full"
          variant="secondary"
          onClick={() => {
            setModal(null);
            setScreen("settings");
          }}
        >
          Save / Load JSON…
        </Button>
        <Button className="w-full" variant="secondary" onClick={() => setModal("loopGuide")}>
          How the loop works
        </Button>
        <Button className="w-full" variant="secondary" onClick={() => setModal("cheats")}>
          Cheats
        </Button>
        <Button className="w-full" variant="ghost" onClick={() => { saveGame(); returnToMenu(); setModal(null); }}>
          Save & exit
        </Button>
      </div>
    </Modal>
  );
}

function ConfirmMenuModal() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  return (
    <Modal open={modal === "confirmMenu"} onClose={() => setModal(null)} title="Confirm">
      <Button className="w-full" onClick={() => setModal(null)}>
        OK
      </Button>
    </Modal>
  );
}

function CheatsModal() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  const applyCheat = useGame((s) => s.applyCheat);
  const settings = useGame((s) => s.settings);
  const cash = useGame((s) => s.cash);
  const fans = useGame((s) => s.fans);
  const office = useGame((s) => s.office);
  const project = useGame((s) => s.currentProject);
  const seed = useGame((s) => s.campaignSeed);
  const year = useGame((s) => s.year);
  const cheatLog = useGame((s) => s.cheatLog);
  const cheatsEnabled = useGame((s) => s.cheatsEnabled);
  const executeCheatCommand = useGame((s) => s.executeCheatCommand);
  const [cheatCmd, setCheatCmd] = useState("");
  const [cheatCmdMsg, setCheatCmdMsg] = useState("");
  const [tab, setTab] = useState<"main" | "dev" | "modes" | "modding">("main");
  const [cashField, setCashField] = useState("");
  const [fansField, setFansField] = useState("");
  const [yearField, setYearField] = useState(String(year));

  const rowBtn = (label: string, cheat: string, arg?: string | number) => (
    <Button
      key={cheat + label}
      size="sm"
      variant="secondary"
      className="min-w-[5.5rem] flex-1"
      onClick={() => applyCheat(cheat, arg)}
    >
      {label}
    </Button>
  );

  const wideBtn = (label: string, cheat: string, arg?: string | number, active?: boolean) => (
    <Button
      key={cheat + label}
      size="sm"
      variant={active ? "primary" : "secondary"}
      className="w-full justify-start text-left"
      onClick={() => applyCheat(cheat, arg)}
    >
      {label}
      {active ? " · ON" : ""}
    </Button>
  );

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "main", label: "Resources" },
    { id: "dev", label: "Dev" },
    { id: "modes", label: "Modes" },
    { id: "modding", label: "Modding" },
  ];

  return (
    <Modal open={modal === "cheats"} onClose={() => setModal(null)} title="CheatMod" wide>
      <p className="text-xs text-muted">
        Inspired by kristof1104's GDT CheatMod — safer than editing saves.
        {cheatsEnabled ? " Campaign marked modified." : ""}
      </p>
      <div className="mt-2 rounded-lg border border-border bg-elevated p-2">
        <p className="mb-1 text-[10px] font-bold uppercase text-muted">EXECUTE_CHEAT</p>
        <div className="flex gap-2">
          <Input
            value={cheatCmd}
            placeholder="/money_boost · /rp_max · /instafans · /bug_wipe"
            onChange={(e) => setCheatCmd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setCheatCmdMsg(executeCheatCommand(cheatCmd) ?? "OK");
                setCheatCmd("");
              }
            }}
          />
          <Button
            size="sm"
            onClick={() => {
              setCheatCmdMsg(executeCheatCommand(cheatCmd) ?? "OK");
              setCheatCmd("");
            }}
          >
            Run
          </Button>
        </div>
        {cheatCmdMsg && <p className="mt-1 text-[11px] text-muted">{cheatCmdMsg}</p>}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
        <span className="tabular rounded-md bg-elevated px-2 py-1 font-semibold text-fg">
          {formatCash(cash)}
        </span>
        <span className="tabular rounded-md bg-elevated px-2 py-1">{formatFans(fans)} fans</span>
        <span className="rounded-md bg-elevated px-2 py-1">
          {OFFICE_INFO[office]?.name ?? `Office ${office}`}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => setTab(tb.id)}
            className={cnJoin(
              "min-h-9 rounded-lg px-3 text-xs font-semibold",
              tab === tb.id ? "bg-accent text-accent-fg" : "bg-elevated text-muted hover:text-fg",
            )}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div className="mt-4 max-h-[52dvh] space-y-4 overflow-y-auto pr-1">
        {tab === "main" && (
          <>
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Add Money</h3>
              <div className="flex flex-wrap gap-1.5">
                {rowBtn("1M", "cash_1m")}
                {rowBtn("10M", "cash_10m")}
                {rowBtn("100M", "cash_100m")}
                {rowBtn("1B", "cash_1b")}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {rowBtn("+10k", "cash_10k")}
                {rowBtn("+100k", "cash_100k")}
              </div>
            </section>
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Add Fans</h3>
              <div className="flex flex-wrap gap-1.5">
                {rowBtn("1M", "fans_1m")}
                {rowBtn("10M", "fans_10m")}
                {rowBtn("100M", "fans_100m")}
                {rowBtn("+10k", "fans", 10000)}
              </div>
            </section>
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Add Hype</h3>
              <div className="flex flex-wrap gap-1.5">
                {rowBtn("+10", "hype_10")}
                {rowBtn("+50", "hype_50")}
                {rowBtn("+100", "hype_100")}
              </div>
            </section>
            <section className="space-y-1.5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Research & team</h3>
              {wideBtn("Add Research Points (100)", "rp_100")}
              {wideBtn("Fill open slots · 1337 Dream Team", "dream_team")}
              {wideBtn("Fill open slots · B-Team", "b_team")}
              {wideBtn("Turn founder into 1337 developer", "pro_developer")}
              {wideBtn("Generate random market trend", "random_trend")}
            </section>
            <section className="space-y-1.5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Progression</h3>
              {wideBtn("Move to final level (HQ + unlocks)", "move_to_final_level")}
              {wideBtn("Office-ready pack (garage gate)", "office_ready")}
              {wideBtn("Add all topics", "add_all_topics")}
              {wideBtn("Unlock large / AAA path", "add_aaa")}
              {wideBtn("Unlock everything", "unlock_all")}
              {wideBtn("Unlock sequels", "sequels")}
            </section>
          </>
        )}

        {tab === "dev" && (
          <>
            <p className="text-xs text-muted">
              {project
                ? `${project.title} · D${Math.round(project.designPoints)} / T${Math.round(project.techPoints)} · bugs ${project.bugs}`
                : "No active project."}
            </p>
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Design points</h3>
              <div className="flex flex-wrap gap-1.5">
                {rowBtn("+10", "design_10")}
                {rowBtn("+100", "design_100")}
              </div>
            </section>
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Tech points</h3>
              <div className="flex flex-wrap gap-1.5">
                {rowBtn("+10", "tech_10")}
                {rowBtn("+100", "tech_100")}
              </div>
            </section>
            <section className="space-y-1.5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Stage & polish</h3>
              {wideBtn("Finish / boost stage", "finish_stage")}
              {wideBtn("Force release-ready stats", "force_release_ready")}
              {wideBtn("Clear bugs", "bugs")}
              {wideBtn("Add 5 bugs", "add_bugs", 5)}
              {wideBtn("Max points + clean", "max_points")}
              {wideBtn("Finish research job", "finish_research")}
              {wideBtn("Restore staff energy", "energy")}
            </section>
          </>
        )}

        {tab === "modes" && (
          <>
            <p className="text-xs text-muted">Toggle modes stay on until turned off (CheatMod parity).</p>
            <div className="space-y-1.5">
              {wideBtn("Always perfect scores", "perfect_scores", undefined, !!settings.forcePerfectScore)}
              {wideBtn("Force bad scores", "toggle_bad_score", undefined, !!settings.forceBadScore)}
              {wideBtn("No Bugs Mode", "no_bugs_mode", undefined, !!settings.noBugsMode)}
              {wideBtn("Fast Research Mode", "fast_research_mode", undefined, !!settings.fastResearchMode)}
              {wideBtn("Remove staff vacation need", "no_vacation", undefined, !!settings.noVacationMode)}
              {wideBtn("Show all hints (Analyst)", "show_all_hints", undefined, !!settings.showAllHints)}
              {wideBtn("Disable bankruptcy", "no_bankruptcy", undefined, !!settings.disableBankruptcy)}
            </div>
            <section>
              <h3 className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Information mode</h3>
              <div className="flex flex-wrap gap-1.5">
                {rowBtn(settings.infoMode === "classic" ? "Classic ●" : "Classic", "info_classic")}
                {rowBtn(settings.infoMode === "assisted" ? "Assisted ●" : "Assisted", "info_assisted")}
                {rowBtn(settings.infoMode === "analyst" ? "Analyst ●" : "Analyst", "info_analyst")}
              </div>
            </section>
          </>
        )}

        {tab === "modding" && (
          <>
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Set absolute values</h3>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[10rem] flex-1">
                  <label className="text-[11px] font-semibold uppercase text-muted">Cash</label>
                  <Input
                    className="mt-1"
                    inputMode="numeric"
                    placeholder={String(Math.floor(cash))}
                    value={cashField}
                    onChange={(e) => setCashField(e.target.value.replace(/[^\d]/g, ""))}
                  />
                </div>
                <Button size="sm" onClick={() => cashField && applyCheat("set_cash", Number(cashField))}>
                  SET
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <div className="min-w-[10rem] flex-1">
                  <label className="text-[11px] font-semibold uppercase text-muted">Fans</label>
                  <Input
                    className="mt-1"
                    inputMode="numeric"
                    placeholder={String(Math.floor(fans))}
                    value={fansField}
                    onChange={(e) => setFansField(e.target.value.replace(/[^\d]/g, ""))}
                  />
                </div>
                <Button size="sm" onClick={() => fansField && applyCheat("set_fans", Number(fansField))}>
                  SET
                </Button>
              </div>
            </section>
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Move through time</h3>
              <p className="mb-2 text-xs text-subtle">
                Experimental — prefer forward jumps for testing.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[8rem]">
                  <label className="text-[11px] font-semibold uppercase text-muted">Year</label>
                  <Input
                    className="mt-1"
                    inputMode="numeric"
                    value={yearField}
                    onChange={(e) => setYearField(e.target.value.replace(/[^\d]/g, ""))}
                  />
                </div>
                <Button size="sm" onClick={() => yearField && applyCheat("set_year", Number(yearField))}>
                  Move to year
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {rowBtn("+1 week", "advance_time", 1)}
                {rowBtn("+1 month", "advance_time", 4)}
                {rowBtn("+12 weeks", "advance_time", 12)}
                {rowBtn("+1 year", "advance_time", 48)}
              </div>
            </section>
            <section className="rounded-xl bg-elevated p-3 text-xs text-muted">
              <p className="font-semibold text-fg">Diagnostics</p>
              <p className="mt-1 tabular">Campaign seed: {seed}</p>
              <p className="tabular">
                perfect={String(!!settings.forcePerfectScore)} · noBugs=
                {String(!!settings.noBugsMode)} · fastRP={String(!!settings.fastResearchMode)}
              </p>
              <Button size="sm" variant="secondary" className="mt-2" onClick={() => applyCheat("reveal_seed")}>
                Reveal seed toast
              </Button>
              <p className="mt-3 font-semibold text-fg">Cheat log</p>
              <ul className="mt-1 max-h-24 space-y-0.5 overflow-y-auto">
                {(cheatLog ?? []).slice(0, 14).map((c, i) => (
                  <li key={`${c.week}-${c.action}-${i}`} className="tabular">
                    W{c.week}: {c.action}
                    {c.detail ? ` (${c.detail})` : ""}
                  </li>
                ))}
                {!(cheatLog ?? []).length && <li>None yet</li>}
              </ul>
            </section>
          </>
        )}
      </div>

      <Button className="mt-5 w-full" variant="secondary" onClick={() => setModal(null)}>
        Close
      </Button>
    </Modal>
  );
}

function EventModal() {
  const modal = useGame((s) => s.modal);
  const pending = useGame((s) => s.pendingEvent);
  const resolveEvent = useGame((s) => s.resolveEvent);
  const open = modal === "event" && !!pending;
  if (!pending) return null;
  const choices = pending.choices ?? [{ label: "Continue", effect: "Dismiss" }];
  // Prefer dismiss-safe first option for soft events (Not now / Pass / Continue)
  return (
    <Modal
      open={open}
      onClose={() => {
        resolveEvent(0);
      }}
      title={pending.title}
    >
      <p className="max-h-[28dvh] overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-fg sm:max-h-none">
        {pending.body}
      </p>
      <div className="mt-4 flex max-h-[42dvh] flex-col gap-2 overflow-y-auto sm:max-h-none">
        {choices.map((c, i) => (
          <Button
            key={`${c.label}-${i}`}
            className="min-h-12 w-full justify-start px-3 py-3 text-left sm:min-h-11"
            variant={i === 0 ? "secondary" : i === 1 ? "primary" : "secondary"}
            onClick={() => resolveEvent(i)}
          >
            <span className="flex w-full flex-col items-start gap-0.5">
              <span className="text-[15px] font-semibold leading-snug">{c.label}</span>
              {c.effect ? (
                <span className="text-[12px] font-medium leading-snug opacity-80">{c.effect}</span>
              ) : null}
            </span>
          </Button>
        ))}
      </div>
    </Modal>
  );
}

function LoopGuideModal() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  return (
    <Modal open={modal === "loopGuide"} onClose={() => setModal(null)} title="The Garage Loop" wide>
      <div className="space-y-4 text-sm text-muted">
        <p>Plan three stages, polish, release, read reviews, then weekly sales. Marketing changes awareness — never quality.</p>
        <GarageLoopFlowchart />
        <ScoringPipelineFlow />
      </div>
      <Button className="mt-4 w-full" onClick={() => setModal(null)}>
        Got it
      </Button>
    </Modal>
  );
}

function NotificationsInbox() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  const notes = useGame((s) => s.notifications);
  const markRead = useGame((s) => s.markNotificationsRead);
  const clearAll = useGame((s) => s.dismissNotifications);
  const open = modal === "notifications";

  useEffect(() => {
    if (open) markRead();
  }, [open, markRead, notes.length]);

  return (
    <Modal open={open} onClose={() => setModal(null)} title="Notifications">
      {!notes.length ? (
        <p className="text-sm text-muted">No messages yet.</p>
      ) : (
        <ul className="max-h-[60dvh] space-y-2 overflow-y-auto">
          {notes.map((n) => (
            <li
              key={n.id}
              className={cnJoin(
                "rounded-xl border px-3 py-2.5 text-sm",
                n.tone === "good" && "border-good/25 bg-good/5",
                n.tone === "bad" && "border-bad/25 bg-bad/5",
                n.tone === "warn" && "border-warn/25 bg-warn/5",
                (!n.tone || n.tone === "info") && "border-border bg-elevated",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="leading-snug">{n.text}</p>
                <span className="shrink-0 text-[10px] font-bold uppercase tabular text-subtle">W{n.week}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex gap-2">
        <Button className="flex-1" variant="secondary" onClick={() => setModal(null)}>
          Close
        </Button>
        {notes.length > 0 && (
          <Button className="flex-1" variant="ghost" onClick={() => { clearAll(); setModal(null); }}>
            Clear all
          </Button>
        )}
      </div>
    </Modal>
  );
}

/* ═══════════════════════════ First office offer (bible §5.4 / §31.1) ═══════════════════════════ */

function OfficeOfferModal() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  const state = useGame();
  const acceptOfficeOffer = useGame((s) => s.acceptOfficeOffer);
  const deferOfficeOffer = useGame((s) => s.deferOfficeOffer);
  const [err, setErr] = useState<string | null>(null);

  const open = modal === "officeOffer";
  const ov = studioOverview(state);
  const goal = ov.officeGoal;

  if (!open) return null;

  const moveCost = goal?.moveCost ?? 150_000;
  const seatsAfter = goal?.seatsAfter ?? 4;
  const construction = goal?.constructionWeeks ?? 2;
  const overhead = goal?.weeklyOverheadAfter ?? 2_000;
  const cashAfter = state.cash - moveCost;
  const runway = goal?.runway ?? 0;
  const canAccept = goal?.canMove ?? false;

  return (
    <Modal
      open={open}
      onClose={() => setModal(null)}
      title="A real office is possible"
      description="Optional move — stay in the garage as long as you want."
      wide
    >
      <div className="space-y-3 text-sm">
        <p className="text-muted">
          You have proven the garage. Moving unlocks hiring capacity (Checkpoint 2) and a higher burn rate.
          No free staff. Campaign progress is preserved.
        </p>

        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-elevated p-3 text-xs">
          <div>
            <div className="font-bold uppercase tracking-wide text-muted">Now</div>
            <div className="mt-1 font-semibold text-fg">1 HQ seat · Founder Garage</div>
            <div className="text-muted">$0 weekly overhead</div>
          </div>
          <div>
            <div className="font-bold uppercase tracking-wide text-muted">After move</div>
            <div className="mt-1 font-semibold text-fg">
              {seatsAfter} HQ seats · First Office
            </div>
            <div className="text-muted">{formatCash(overhead)}/week overhead</div>
          </div>
        </div>

        <ul className="space-y-1 text-xs">
          <li>
            Move cost: <strong>{formatCash(moveCost)}</strong>
          </li>
          <li>
            Construction: <strong>{construction} week(s)</strong>
          </li>
          <li>
            Cash after move:{" "}
            <strong className={cashAfter < 0 ? "text-bad" : ""}>{formatCash(cashAfter)}</strong>
          </li>
          <li>
            Est. runway:{" "}
            <strong>
              {runway >= 500
                ? "stable (ops cash covers burn)"
                : `~${Math.max(0, Math.floor(runway))} weeks`}
            </strong>{" "}
            (need 26)
          </li>
        </ul>

        {goal?.proofs && goal.proofs.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted">
              Proofs
            </div>
            <ul className="space-y-0.5 text-xs">
              {goal.proofs.map((p) => (
                <li key={p.id} className={p.met ? "text-good" : "text-muted"}>
                  {p.met ? "✓" : "○"} {p.label} — {p.detail}
                </li>
              ))}
            </ul>
          </div>
        )}

        {err && <p className="text-xs font-semibold text-bad">{err}</p>}

        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <Button
            className="flex-1"
            disabled={!canAccept}
            onClick={() => {
              const msg = acceptOfficeOffer();
              if (msg) setErr(msg);
              else setErr(null);
            }}
          >
            Accept move
          </Button>
          <Button
            className="flex-1"
            variant="secondary"
            onClick={() => {
              deferOfficeOffer();
              setErr(null);
            }}
          >
            Decide later
          </Button>
        </div>
      </div>
    </Modal>
  );
}
