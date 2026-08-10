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
              {screen === "finances" && <FinancesScreen />}
              {screen === "market" && <MarketScreen />}
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
        <div className="se-metric-muted text-[10px] tabular">
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
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#6affe0] px-0.5 text-[9px] font-bold text-[#061410]">
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
    { id: "research", label: "Lab", icon: FlaskConical },
    { id: "market", label: "Market", icon: TrendingUp },
    { id: "staff", label: "People", icon: Users },
    { id: "finances", label: "Books", icon: Wallet },
  ];
  if (office >= 2) {
    items.splice(4, 0, { id: "engines", label: "Engine", icon: Cpu });
  }

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
        style={immersive ? undefined : { objectPosition: art.objectPosition }}
        draggable={false}
      />
      {immersive && <div className="se-room-vignette" />}

      {showChrome && immersive && (
        <>
          <div className="se-room-caption pointer-events-none">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6affe0]/90">
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
              {state.office === 1 && ov.officeGoal && !ov.officeGoal.activeMove && (
                <p className="max-w-[16rem] text-right text-[12px] leading-snug text-white/50">
                  <span className="text-[#6affe0]/80">Next · </span>
                  {ov.gamesPublished}/{ov.officeGoal.gamesNeed} games ·{" "}
                  {formatFans(ov.fans)}/{formatFans(ov.officeGoal.fansNeed)} fans · hold{" "}
                  {formatCash(ov.officeGoal.cashNeed)}
                </p>
              )}
            </div>
          </div>

          <div className="se-float-actions">
            {!state.currentProject ? (
              <button type="button" className="se-cta" onClick={() => setModal("newGame")}>
                Develop new game
              </button>
            ) : state.currentProject.devPhase === "READY_TO_RELEASE" ? (
              <button type="button" className="se-cta" onClick={() => setScreen("develop")}>
                Finish · Release
              </button>
            ) : state.currentProject.devPhase.includes("CONFIG") ? (
              <button type="button" className="se-cta" onClick={() => setScreen("develop")}>
                Configure stage
              </button>
            ) : state.currentProject.devPhase === "POLISHING" ? (
              <button type="button" className="se-cta" onClick={() => setScreen("develop")}>
                Polish build
              </button>
            ) : (
              <button type="button" className="se-cta" onClick={() => setScreen("develop")}>
                Open desk · {ov.phase.title}
              </button>
            )}
            <button type="button" className="se-cta-secondary" onClick={() => setModal("loopGuide")}>
              How it works
            </button>
            {(ov.officeGoal?.offerState === "offered" ||
              ov.officeGoal?.offerState === "deferred" ||
              ov.officeGoal?.canMove) && (
              <button type="button" className="se-cta-secondary" onClick={() => setModal("officeOffer")}>
                Office offer
              </button>
            )}
          </div>
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
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6affe0]/90">Desk</p>
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
            Set time allocation for Stage {stageNum}. OK locks it in and starts work.
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

function GamesScreen() {
  const games = useGame((s) => s.releasedGames);
  const selectGame = useGame((s) => s.selectGame);
  const setModal = useGame((s) => s.setModal);
  const startTitleCampaign = useGame((s) => s.startTitleCampaign);
  const [sel, setSel] = useState<string | null>(null);
  const [campMsg, setCampMsg] = useState("");
  const rows = libraryRows(games);
  const selected = games.find((g) => g.id === sel);
  return (
    <ScreenBackdrop screen="games">
      <div className="game-panel px-4 py-3 text-center">
        <h2 className="text-2xl font-bold text-fg">Game History</h2>
        <p className="mt-0.5 text-sm text-muted">Shipped titles and campaigns</p>
      </div>
      {!rows.length && <p className="mt-8 text-center text-muted">No releases yet.</p>}
      <ul className="mt-4 space-y-2">
        {rows.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => setSel(r.id === sel ? null : r.id)}
              className={cnJoin(
                "w-full rounded-xl border p-4 text-left backdrop-blur-sm",
                sel === r.id ? "border-accent bg-accent/15" : "border-border bg-paper",
              )}
            >
              <div className="flex justify-between gap-2">
                <span className="font-bold text-fg">{r.title}</span>
                <span className="text-lg font-bold tabular text-tech">{r.avgReview.toFixed(1)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {r.genre} · {r.sales.toLocaleString()} sold · {r.revenueLabel}
              </p>
            </button>
          </li>
        ))}
      </ul>
      {selected && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => { selectGame(selected.id); setModal("reviews"); }}>
            Reviews
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setCampMsg(startTitleCampaign(selected.id, "flyer_run") ?? "Flyer started.")}>
            Flyer
          </Button>
          {campMsg && <p className="w-full text-xs text-muted">{campMsg}</p>}
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
                </div>
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
        Engines create capability and efficiency — your team turns that into games. Released versions
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
  const list = PLATFORMS.filter((p) => p.year <= year + 1);
  return (
    <ScreenBackdrop screen="platforms">
      <h2 className="text-center text-2xl font-bold text-fg">Systems</h2>
      {msg && <p className="mt-2 text-center text-sm text-warn">{msg}</p>}
      <ul className="mt-4 space-y-2">
        {list.map((p) => {
          const owned = unlocked.includes(p.id);
          const thumb = platformThumb(p.id, year);
          return (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-paper px-3 py-3 shadow-sm">
              <div className="flex min-w-0 items-center gap-3">
                {thumb ? (
                  <img src={thumb} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-white/20" draggable={false} />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-panel text-[10px] font-bold text-muted">
                    {p.short}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate font-semibold text-fg">{p.name}</div>
                  <div className="text-xs text-muted">{p.year}</div>
                </div>
              </div>
              {owned ? (
                <Badge tone="good">Owned</Badge>
              ) : (
                <Button size="sm" onClick={() => setMsg(licensePlatform(p.id) ?? "Licensed.")}>
                  License {formatCash(p.licenseCost)}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </ScreenBackdrop>
  );
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

function SettingsScreen() {
  const saveGame = useGame((s) => s.saveGame);
  const setModal = useGame((s) => s.setModal);
  const returnToMenu = useGame((s) => s.returnToMenu);
  const setScreen = useGame((s) => s.setScreen);
  return (
    <div className="mx-auto max-w-lg px-3 pb-8 pt-4">
      <h2 className="text-center text-2xl font-bold">More</h2>
      <div className="mx-auto mt-1 h-px w-24 bg-border-strong" />
      <div className="mt-4 space-y-2">
        <Button className="w-full" variant="secondary" onClick={() => saveGame()}>
          Save campaign
        </Button>
        <Button className="w-full" variant="secondary" onClick={() => setModal("pauseMenu")}>
          Pause menu
        </Button>
        <Button className="w-full" variant="secondary" onClick={() => setModal("cheats")}>
          CheatMod
        </Button>
        <Button className="w-full" variant="secondary" onClick={() => setScreen("market")}>
          Market
        </Button>
        <Button className="w-full" variant="secondary" onClick={() => setScreen("finances")}>
          Finances
        </Button>
        <Button className="w-full" variant="secondary" onClick={() => setScreen("platforms")}>
          Systems
        </Button>
        <Button className="w-full" variant="secondary" onClick={() => setScreen("staff")}>
          People
        </Button>
        <Button className="w-full" variant="secondary" onClick={() => setScreen("engines")}>
          Engines
        </Button>
        <Button className="w-full" variant="ghost" onClick={() => returnToMenu()}>
          Exit to title
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
  const saveGame = useGame((s) => s.saveGame);
  const returnToMenu = useGame((s) => s.returnToMenu);
  return (
    <Modal open={modal === "pauseMenu"} onClose={() => setModal(null)} title="Paused">
      <div className="space-y-2">
        <Button className="w-full" onClick={() => { saveGame(); setModal(null); }}>
          Save & resume
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
  return (
    <Modal
      open={open}
      onClose={() => {
        /* Must choose — closing without choice defaults to first option */
        resolveEvent(0);
      }}
      title={pending.title}
    >
      <p className="text-sm leading-relaxed text-fg">{pending.body}</p>
      <div className="mt-4 flex flex-col gap-2">
        {(pending.choices ?? [{ label: "Continue", effect: "Dismiss" }]).map((c, i) => (
          <Button
            key={`${c.label}-${i}`}
            className="w-full justify-start text-left"
            variant={i === 0 ? "primary" : "secondary"}
            onClick={() => resolveEvent(i)}
          >
            <span className="flex w-full flex-col items-start gap-0.5">
              <span>{c.label}</span>
              {c.effect ? (
                <span className="text-[11px] font-medium opacity-80">{c.effect}</span>
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
