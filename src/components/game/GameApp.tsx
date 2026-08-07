/**
 * Studio Empire — GDT-inspired Garage presentation
 * Room-first layout. Domain mutations via useGame only.
 */
import { useEffect, useRef, useState } from "react";
import {
  AUDIENCES,
  FIELD_LABELS,
  GENRES,
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
import { evaluateCombo, formatCash, formatFans, generateGameTitle } from "@/lib/game/simulation";
import { availableSizes, hasSave, useGame } from "@/lib/game/store";
import {
  libraryRows,
  projectPhaseLabel,
  studioOverview,
  stageFieldsForProject,
  explainSales,
} from "@/lib/game/viewModels";
import { disciplineProgress } from "@/lib/game/production/bridge";
import type { AudienceId, DevField, GameSize, GenreId, ScreenId } from "@/lib/game/types";
import { Badge, Button, Input, Modal, SearchField, cnJoin } from "@/components/ui/primitives";
import { GarageLoopFlowchart, ScoringPipelineFlow } from "@/components/game/LoopFlowchart";
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
  Beaker,
} from "lucide-react";

const BAR_COLORS = ["#e86a4a", "#3aaa6a", "#3aa0d8", "#e8941a", "#9b6ad8", "#4ecb8a"];

/* ═══════════════════════════ Root ═══════════════════════════ */

export function GameApp() {
  const phase = useGame((s) => s.phase);
  const speed = useGame((s) => s.speed);
  const tick = useGame((s) => s.tick);

  useEffect(() => {
    if (phase !== "playing" || speed === 0) return;
    const ms = speed === 1 ? 900 : speed === 2 ? 450 : 220;
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
  const [has, setHas] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setHas(hasSave());
  }, []);

  return (
    <div className="room-void relative flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">Phase One · Garage</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-fg sm:text-5xl">Studio Empire</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted">
          One founder. One garage. Plan stages, ship games, grow fans — until you earn the office.
        </p>
      </div>
      <div className="mt-8 w-full max-w-md space-y-4 rounded-2xl border border-border bg-paper p-6 shadow-[var(--shadow-soft)]">
        <div>
          <label className="mb-1.5 block text-center text-xs font-bold uppercase tracking-wide text-subtle">
            Company name
          </label>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={32} className="!bg-elevated !text-fg" />
        </div>
        <label className="flex items-center justify-center gap-2 text-sm text-muted">
          <input type="checkbox" className="h-4 w-4 accent-[var(--color-accent)]" checked={pirate} onChange={(e) => setPirate(e.target.checked)} />
          Pirate mode (harder sales)
        </label>
        {err && <p className="text-center text-sm text-bad">{err}</p>}
        <Button
          className="w-full"
          size="lg"
          onClick={() => {
            if (!name.trim()) {
              setErr("Name your studio.");
              return;
            }
            newGame(name, pirate);
          }}
        >
          <Sparkles className="h-4 w-4" />
          New Campaign
        </Button>
        {has && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => { if (!loadGame()) setErr("Could not load save."); }}>
              Continue
            </Button>
            <Button variant="ghost" onClick={() => { deleteSave(); setHas(false); }}>
              Delete save
            </Button>
          </div>
        )}
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
    <div className="room-void flex min-h-[100dvh] flex-col items-center justify-center px-4">
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
  const project = useGame((s) => s.currentProject);
  const phase = projectPhaseLabel(project);
  const forcePause = phase.needsPlayerInput && !!project;

  // Secondary routes (library etc.) still work; home is always room-first garage
  const showRoom = screen === "studio" || screen === "develop";

  return (
    <div className="room-void flex min-h-[100dvh] flex-col">
      <GdtTopChrome forcePause={forcePause} />
      <main className="relative flex-1 overflow-y-auto pb-20">
        {showRoom && <GarageRoomView />}
        {showRoom && <DevelopOverlay />}
        {screen === "games" && <GamesScreen />}
        {screen === "research" && <ResearchScreen />}
        {screen === "staff" && <StaffScreen />}
        {screen === "engines" && <EnginesScreen />}
        {screen === "platforms" && <PlatformsScreen />}
        {screen === "finances" && <FinancesScreen />}
        {screen === "market" && <MarketScreen />}
        {screen === "settings" && <SettingsScreen />}
      </main>
      <BottomDock />
    </div>
  );
}

/* Top: project HUD center + vitals right + clock */
function GdtTopChrome({ forcePause }: { forcePause: boolean }) {
  const company = useGame((s) => s.companyName);
  const week = useGame((s) => s.week);
  const year = useGame((s) => s.year);
  const month = useGame((s) => s.month);
  const cash = useGame((s) => s.cash);
  const fans = useGame((s) => s.fans);
  const rp = useGame((s) => s.researchPoints);
  const speed = useGame((s) => s.speed);
  const setSpeed = useGame((s) => s.setSpeed);
  const setModal = useGame((s) => s.setModal);
  const saveGame = useGame((s) => s.saveGame);
  const project = useGame((s) => s.currentProject);
  const notifications = useGame((s) => s.notifications);
  const unread = notifications.filter((n) => !n.read).length;
  const phase = projectPhaseLabel(project);
  const pct = Math.round((project?.stageProgress || 0) * 100);
  const bugs = project?.bugs ?? 0;
  const designOrb = project
    ? Math.round(30 + (project.stageProgress || 0) * 40 + (project.weeksDev || 0) * 2)
    : 0;
  const techOrb = project
    ? Math.round(28 + (project.stageProgress || 0) * 38 + (project.weeksDev || 0) * 2)
    : 0;

  useEffect(() => {
    if (forcePause && speed !== 0) setSpeed(0);
  }, [forcePause, speed, setSpeed]);

  return (
    <header className="sticky top-0 z-30">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-2 px-2 pt-2 sm:px-4">
        {/* Menu */}
        <button
          type="button"
          className="hud-chip flex h-10 items-center gap-1.5 px-3 text-xs font-bold uppercase tracking-wide text-muted"
          onClick={() => {
            saveGame();
            setModal("pauseMenu");
          }}
        >
          <Menu className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{company}</span>
        </button>

        {/* Project HUD — GDT top-center orbs */}
        <div className="order-last flex w-full flex-col items-center sm:order-none sm:w-auto">
          <div className="flex items-end gap-1 sm:gap-2">
            <Orb value={bugs} label="Bugs" color="var(--color-bugs)" Icon={Bug} active={!!project} />
            <Orb value={project ? Math.min(999, designOrb) : 0} label="Design" color="var(--color-design)" Icon={Palette} active={!!project} />
            <div className="hud-chip mx-0.5 min-w-[9.5rem] max-w-[14rem] px-3 py-2 text-center sm:min-w-[12rem]">
              {project ? (
                <>
                  <div className="truncate text-sm font-bold leading-tight">{project.title}</div>
                  <div className="truncate text-[10px] text-muted">
                    {getTopic(project.topicId)?.name}/{getGenre(project.genreId).name}
                  </div>
                  {project.devPhase.includes("RUNNING") && (
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-300"
                        style={{ width: `${Math.max(pct > 0 ? 4 : 0, pct)}%` }}
                      />
                    </div>
                  )}
                  {!project.devPhase.includes("RUNNING") && (
                    <div className="mt-1 text-[10px] font-semibold text-accent">{phase.title}</div>
                  )}
                </>
              ) : (
                <div className="py-0.5 text-sm font-semibold text-muted">No Project</div>
              )}
            </div>
            <Orb value={project ? Math.min(999, techOrb) : 0} label="Tech" color="var(--color-tech)" Icon={Cpu} active={!!project} />
            <Orb value={Math.floor(rp)} label="Research" color="var(--color-research)" Icon={Beaker} active always />
          </div>
        </div>

        {/* Vitals + clock */}
        <div className="flex flex-col items-end gap-1">
          <div className="hud-chip px-2.5 py-1.5 text-right text-[11px] leading-snug sm:text-xs">
            <div className="font-semibold tabular text-fans">{formatFans(fans)} Fans</div>
            <div className="tabular text-muted">
              Y{year} M{month} W{(week % 4) + 1}
            </div>
            <div className="font-bold tabular text-cash">Cash: {formatCash(cash)}</div>
          </div>
          <div className="flex items-center gap-0.5">
            {(
              [
                [0, Pause, "Pause"],
                [1, Play, "Play"],
                [2, FastForward, "2×"],
                [4, FastForward, "4×"],
              ] as const
            ).map(([s, Icon, label]) => (
              <button
                key={s}
                type="button"
                disabled={forcePause && s !== 0}
                title={label}
                aria-label={label}
                onClick={() => setSpeed(s as 0 | 1 | 2 | 4)}
                className={cnJoin(
                  "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                  speed === s
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border bg-elevated text-muted hover:text-fg",
                  forcePause && s !== 0 && "opacity-35",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-elevated text-muted hover:text-fg"
              aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
              onClick={() => setModal("notifications")}
            >
              <Bell className="h-3.5 w-3.5" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-fg">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
      {forcePause && project && (
        <div className="mx-auto mt-1 max-w-xl px-3 text-center text-[11px] font-semibold text-accent">
          Time paused — {phase.hint}
        </div>
      )}
    </header>
  );
}

function Orb({
  value,
  label,
  color,
  Icon,
  active,
  always,
}: {
  value: number;
  label: string;
  color: string;
  Icon: typeof Bug;
  active?: boolean;
  always?: boolean;
}) {
  const show = always || active;
  return (
    <div className={cnJoin("flex flex-col items-center", !show && "opacity-25")}>
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full border-2 bg-elevated text-xs font-bold tabular shadow-sm sm:h-11 sm:w-11 sm:text-sm"
        style={{ borderColor: color, color }}
        title={label}
      >
        {show ? value : "—"}
      </div>
      <span className="mt-0.5 hidden text-[9px] font-bold uppercase tracking-wide text-subtle sm:block">
        {label}
      </span>
      <Icon className="mt-0.5 h-3 w-3 opacity-40 sm:hidden" style={{ color }} />
    </div>
  );
}

function BottomDock() {
  const screen = useGame((s) => s.screen);
  const setScreen = useGame((s) => s.setScreen);
  const items: { id: ScreenId; label: string; icon: typeof Home }[] = [
    { id: "studio", label: "Garage", icon: Home },
    { id: "develop", label: "Desk", icon: Gamepad2 },
    { id: "games", label: "Games", icon: History },
    { id: "research", label: "Research", icon: FlaskConical },
    { id: "settings", label: "More", icon: Settings },
  ];
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-[color-mix(in_oklab,var(--color-paper)_94%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex max-w-lg justify-around px-1 py-1">
        {items.map(({ id, label, icon: Icon }) => {
          const lit =
            id === "studio"
              ? screen === "studio"
              : id === "develop"
                ? screen === "develop"
                : screen === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setScreen(id)}
              className={cnJoin(
                "flex min-h-12 min-w-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-bold transition-colors",
                lit ? "text-accent" : "text-muted hover:text-fg",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ═══════════════════════════ Garage room ═══════════════════════════ */

function GarageRoomView() {
  const state = useGame();
  const ov = studioOverview(state);
  const setModal = useGame((s) => s.setModal);
  const setScreen = useGame((s) => s.setScreen);
  const busy = !!state.currentProject?.devPhase.includes("RUNNING");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-2 pt-2 sm:px-4">
      {/* Big isometric-style garage */}
      <button
        type="button"
        className="relative w-full max-w-3xl outline-none"
        onClick={() => {
          if (state.currentProject) setScreen("develop");
          else setModal("newGame");
        }}
        aria-label={state.currentProject ? "Open desk" : "Develop new game"}
      >
        <GarageIsometric busy={busy} hasProject={!!state.currentProject} />
      </button>

      {/* Quick actions under room */}
      <div className="mt-3 flex w-full max-w-md flex-wrap justify-center gap-2">
        {!state.currentProject ? (
          <Button size="lg" className="min-w-[12rem]" onClick={() => setModal("newGame")}>
            Develop New Game
          </Button>
        ) : (
          <Button size="lg" className="min-w-[12rem]" variant="secondary" onClick={() => setScreen("develop")}>
            Open Desk · {ov.phase.title}
          </Button>
        )}
        <Button size="md" variant="ghost" onClick={() => setModal("loopGuide")}>
          How it works
        </Button>
      </div>

      {/* Compact goal strip */}
      {ov.officeGoal && (
        <div className="hud-chip mt-4 w-full max-w-md px-3 py-2 text-[11px]">
          <div className="mb-1 font-bold uppercase tracking-wide text-subtle">Office goal</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 tabular">
            <span>
              Fans {ov.fans.toLocaleString()}/{ov.officeGoal.fansNeed.toLocaleString()}
            </span>
            <span>
              Games {ov.gamesPublished}/{ov.officeGoal.gamesNeed}
            </span>
            <span>
              Cash {formatCash(ov.cash)}/{formatCash(ov.officeGoal.cashNeed)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function GarageIsometric({ busy, hasProject }: { busy: boolean; hasProject: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-xl">
      <svg viewBox="0 0 720 420" className="w-full drop-shadow-lg" role="img" aria-label="Garage workspace">
        {/* floor shadow */}
        <ellipse cx="360" cy="380" rx="280" ry="28" fill="#c4b49a" opacity="0.45" />
        {/* room walls isometric-ish */}
        <path d="M120 160 L360 80 L600 160 L600 320 L360 400 L120 320 Z" fill="#d8c8a8" stroke="#b8a888" strokeWidth="2" />
        {/* left wall tint */}
        <path d="M120 160 L360 80 L360 400 L120 320 Z" fill="#c8b898" opacity="0.55" />
        {/* right wall */}
        <path d="M360 80 L600 160 L600 320 L360 400 Z" fill="#e8dcc4" opacity="0.9" />
        {/* floor */}
        <path d="M120 320 L360 400 L600 320 L360 240 Z" fill="#b8b0a0" />
        {/* rug */}
        <path d="M240 300 L360 340 L420 300 L300 260 Z" fill="#5a9a8a" opacity="0.85" />
        {/* door */}
        <path d="M150 200 L150 300 L210 320 L210 220 Z" fill="#d0c8b8" stroke="#9a9080" />
        {/* desk */}
        <path d="M220 250 L320 285 L320 305 L220 270 Z" fill="#8b6914" />
        <path d="M320 285 L380 255 L380 275 L320 305 Z" fill="#6b4f10" />
        <path d="M220 250 L280 220 L380 255 L320 285 Z" fill="#a67c1a" />
        {/* CRT */}
        <rect x="250" y="200" width="48" height="40" rx="3" fill="#2a2a2a" transform="skewY(-8)" />
        <rect x="256" y="206" width="36" height="26" fill={busy ? "#1a3a2a" : "#0a1010"} transform="skewY(-8)" />
        {busy && (
          <>
            <rect x="260" y="212" width="18" height="2" fill="#4ecb8a" transform="skewY(-8)" />
            <rect x="260" y="218" width="26" height="2" fill="#5ec8d8" transform="skewY(-8)" />
            <rect x="260" y="224" width="14" height="2" fill="#e8a838" transform="skewY(-8)" />
          </>
        )}
        {/* founder chair + body simple */}
        <ellipse cx="300" cy="278" rx="14" ry="8" fill="#3d3d3d" />
        <circle cx="295" cy="248" r="12" fill="#c9a882" />
        <path d="M285 258 L285 290 L305 298 L308 262 Z" fill="#3d5a80" />
        {/* car under tarp */}
        <ellipse cx="480" cy="310" rx="70" ry="28" fill="#2a4a8a" opacity="0.9" />
        <path d="M420 300 Q480 250 540 300 Q480 320 420 300" fill="#3a5a9a" />
        <path d="M430 295 Q480 265 530 295" fill="#4a6aaa" opacity="0.5" />
        {/* shelves */}
        <rect x="480" y="170" width="50" height="70" fill="#8b6914" transform="skewY(12)" />
        <rect x="485" y="180" width="40" height="8" fill="#c45" opacity="0.7" transform="skewY(12)" />
        <rect x="485" y="195" width="40" height="8" fill="#4a8" opacity="0.7" transform="skewY(12)" />
        {/* whiteboard */}
        <rect x="400" y="140" width="90" height="50" fill="#f5f5f0" stroke="#aaa" transform="skewY(8)" />
        {/* company plaque */}
        <text x="130" y="190" fontSize="11" fill="#6b6154" fontWeight="bold" transform="skewY(-12)">
          GARAGE
        </text>
        <text x="250" y="395" fontSize="12" fill="#6b6154" textAnchor="middle">
          {hasProject
            ? busy
              ? "Coding under the lamp…"
              : "Project on the desk — tap to manage"
            : "Tap the garage to start a game"}
        </text>
      </svg>
    </div>
  );
}

/* ═══════════════════════════ Desk overlay (stage + polish) ═══════════════════════════ */

function DevelopOverlay() {
  const screen = useGame((s) => s.screen);
  const project = useGame((s) => s.currentProject);
  // Show desk panel when on develop screen, or auto when config needed on studio
  const needsDesk =
    project &&
    (screen === "develop" ||
      project.devPhase.includes("CONFIG") ||
      project.devPhase === "POLISHING" ||
      project.devPhase === "READY_TO_RELEASE");

  if (!needsDesk || !project) return null;
  if (screen !== "develop" && !project.devPhase.includes("CONFIG") && project.devPhase !== "POLISHING" && project.devPhase !== "READY_TO_RELEASE") {
    return null;
  }
  // On studio with only RUNNING — don't force overlay
  if (screen === "studio" && project.devPhase.includes("RUNNING")) return null;

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
      <div className="mx-auto mt-1 h-px w-[80%] bg-[#3a6ea5]/45" />
      <p className="mt-2 text-center text-sm font-semibold">{project.title}</p>
      <p className="text-center text-xs text-muted">
        {getTopic(project.topicId)?.name}/{getGenre(project.genreId).name} · {getPlatform(project.platformId)?.name}
      </p>

      {isConfig && (
        <>
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
            <div className="mx-auto mt-2 h-2 max-w-xs overflow-hidden rounded-full bg-panel">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.max(pct > 0 ? 3 : 0, pct)}%` }} />
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
          <p className="mt-3 text-center text-sm text-muted">Fix bugs and polish before Pre-Release.</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-panel">
            <div className="h-full rounded-full bg-good transition-all" style={{ width: `${Math.round((project.stageProgress || 0) * 100)}%` }} />
          </div>
          <p className="mt-1 text-center text-sm font-bold tabular text-bugs">{project.bugs} open bugs</p>
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
          <p className="mt-3 text-center text-sm text-muted">Reviews appear only after Release. Price does not change scores.</p>
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
    <div className="mx-auto w-full max-w-3xl px-3 pb-8 pt-4">
      <h2 className="text-center text-2xl font-bold">Game History</h2>
      <div className="mx-auto mt-1 h-px w-40 bg-[#3a6ea5]/45" />
      {!rows.length && <p className="mt-8 text-center text-muted">No releases yet.</p>}
      <ul className="mt-4 space-y-2">
        {rows.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => setSel(r.id === sel ? null : r.id)}
              className={cnJoin(
                "w-full rounded-xl border p-4 text-left",
                sel === r.id ? "border-accent bg-accent/5" : "border-border bg-paper",
              )}
            >
              <div className="flex justify-between gap-2">
                <span className="font-bold">{r.title}</span>
                <span className="text-lg font-bold tabular">{r.avgReview.toFixed(1)}</span>
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
    </div>
  );
}

function ResearchScreen() {
  const researched = useGame((s) => s.researched);
  const researchPoints = useGame((s) => s.researchPoints);
  const active = useGame((s) => s.activeResearch);
  const startResearch = useGame((s) => s.startResearch);
  const [msg, setMsg] = useState("");
  const available = RESEARCH.filter((r) => !researched.includes(r.id)).slice(0, 24);
  return (
    <div className="mx-auto max-w-3xl px-3 pb-8 pt-4">
      <h2 className="text-center text-2xl font-bold">Research</h2>
      <div className="mx-auto mt-1 h-px w-32 bg-[#3a6ea5]/45" />
      <p className="mt-2 text-center text-sm text-muted">
        {Math.floor(researchPoints)} RP{active ? ` · ${active.name}` : ""}
      </p>
      {msg && <p className="mt-2 text-center text-sm text-warn">{msg}</p>}
      <ul className="mt-4 space-y-2">
        {available.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-paper px-3 py-3">
            <div>
              <div className="font-semibold">{r.name}</div>
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
    </div>
  );
}

function StaffScreen() {
  const staff = useGame((s) => s.staff);
  return (
    <div className="mx-auto max-w-3xl px-3 pb-8 pt-4">
      <h2 className="text-center text-2xl font-bold">People</h2>
      <p className="mt-2 text-center text-sm text-muted">Garage phase is founder-led.</p>
      <ul className="mt-4 space-y-2">
        {staff.map((m) => (
          <li key={m.id} className="rounded-xl border border-border bg-paper px-4 py-3">
            <div className="font-bold">{m.name}</div>
            <div className="text-xs text-muted">
              Lv {m.level} · Design {m.design} · Tech {m.tech}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EnginesScreen() {
  const engines = useGame((s) => s.engines);
  return (
    <div className="mx-auto max-w-3xl px-3 pb-8 pt-4">
      <h2 className="text-center text-2xl font-bold">Engines</h2>
      <ul className="mt-4 space-y-2">
        {engines.map((e) => (
          <li key={e.id} className="rounded-xl border border-border bg-paper px-4 py-3">
            <div className="font-bold">{e.name}</div>
            <div className="text-xs text-muted">{e.features.join(", ") || "Core only"}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlatformsScreen() {
  const unlocked = useGame((s) => s.unlockedPlatforms);
  const year = useGame((s) => s.year);
  const licensePlatform = useGame((s) => s.licensePlatform);
  const [msg, setMsg] = useState("");
  const list = PLATFORMS.filter((p) => p.year <= year + 1).slice(0, 20);
  return (
    <div className="mx-auto max-w-3xl px-3 pb-8 pt-4">
      <h2 className="text-center text-2xl font-bold">Systems</h2>
      {msg && <p className="mt-2 text-center text-sm text-warn">{msg}</p>}
      <ul className="mt-4 space-y-2">
        {list.map((p) => {
          const owned = unlocked.includes(p.id);
          return (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-paper px-3 py-3">
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-muted">{p.year}</div>
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
    </div>
  );
}

function FinancesScreen() {
  const cash = useGame((s) => s.cash);
  const ledger = useGame((s) => s.ledger);
  const entries = ledger?.entries?.slice(-30).reverse() ?? [];
  return (
    <div className="mx-auto max-w-3xl px-3 pb-8 pt-4">
      <h2 className="text-center text-2xl font-bold">Finances</h2>
      <p className="mt-2 text-center text-3xl font-bold tabular text-cash">{formatCash(cash)}</p>
      <ul className="mt-4 space-y-1.5">
        {entries.map((e) => (
          <li key={e.id} className="flex justify-between gap-3 rounded-lg border border-border bg-paper px-3 py-2 text-sm">
            <span className="truncate text-muted">
              W{e.week} · {e.label}
            </span>
            <span className={cnJoin("tabular font-bold", e.amount >= 0 ? "text-good" : "text-bad")}>
              {formatCash(e.amount)}
            </span>
          </li>
        ))}
        {!entries.length && <li className="text-center text-sm text-muted">No ledger entries yet.</li>}
      </ul>
    </div>
  );
}

function MarketScreen() {
  const sales = useGame((s) => s.activeSales);
  const fans = useGame((s) => s.fans);
  return (
    <div className="mx-auto max-w-3xl px-3 pb-8 pt-4">
      <h2 className="text-center text-2xl font-bold">Market</h2>
      <p className="mt-2 text-center text-sm text-muted">{formatFans(fans)} fans</p>
      <ul className="mt-4 space-y-2">
        {sales
          .filter((g) => g.onSale)
          .map((g) => (
            <li key={g.id} className="rounded-xl border border-border bg-paper p-4">
              <div className="flex justify-between">
                <span className="font-bold">{g.title}</span>
                <span className="tabular font-bold">{g.avgReview.toFixed(1)}</span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {g.sales.toLocaleString()} units · {formatCash(g.revenue)}
              </p>
              <p className="mt-2 text-xs text-subtle">{explainSales(g)}</p>
            </li>
          ))}
        {!sales.filter((g) => g.onSale).length && (
          <li className="text-center text-sm text-muted">No titles selling.</li>
        )}
      </ul>
    </div>
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
      <div className="mx-auto mt-1 h-px w-24 bg-[#3a6ea5]/45" />
      <div className="mt-4 space-y-2">
        <Button className="w-full" variant="secondary" onClick={() => saveGame()}>
          Save campaign
        </Button>
        <Button className="w-full" variant="secondary" onClick={() => setModal("pauseMenu")}>
          Pause menu
        </Button>
        <Button className="w-full" variant="secondary" onClick={() => setModal("cheats")}>
          Cheats (QA)
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
  const topics = TOPICS.filter((t) => unlockedTopics.includes(t.id) && (!garageSlice || isGarageTopic(t.id)));
  const genres = GENRES.filter((g) => unlockedGenres.includes(g.id));
  const platforms = PLATFORMS.filter((p) => unlockedPlatforms.includes(p.id));
  const sizes = availableSizes(researched, unlocks, { office, staffCount });
  const [topicId, setTopicId] = useState(topics[0]?.id ?? "space");
  const [genreId, setGenreId] = useState<GenreId>((genres[0]?.id as GenreId) ?? "action");
  const [platformId, setPlatformId] = useState(platforms[0]?.id ?? "pc");
  const [audience, setAudience] = useState<AudienceId>("everyone");
  const [size, setSize] = useState<GameSize>("small");
  const [engineId, setEngineId] = useState(engines[0]?.id ?? "basic");
  const [title, setTitle] = useState("");
  const [marketing, setMarketing] = useState(0);
  const [err, setErr] = useState("");
  const [step, setStep] = useState<"topic" | "genre" | "details">("topic");
  const [topicQuery, setTopicQuery] = useState("");
  const visibleTopics = topics.filter((topic) =>
    topic.name.toLocaleLowerCase().includes(topicQuery.trim().toLocaleLowerCase()),
  );

  useEffect(() => {
    if (modal === "newGame") {
      setTopicId(topics[0]?.id ?? "space");
      setGenreId((genres[0]?.id as GenreId) ?? "action");
      setPlatformId(platforms[0]?.id ?? "pc");
      setEngineId(engines[0]?.id ?? "basic");
      setSize("small");
      setTitle("");
      setMarketing(0);
      setErr("");
      setStep("topic");
      setTopicQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  const cost = SIZE_STATS[size].cost + marketing;
  const combo = evaluateCombo({ topicId, genreId, platformId, audience });

  return (
    <Modal open={modal === "newGame"} onClose={() => setModal(null)} title={step === "topic" ? "Pick Topic" : step === "genre" ? "Pick Genre" : "New Game"} wide>
      {step === "topic" && (
        <div>
          <SearchField
            value={topicQuery}
            onChange={(event) => setTopicQuery(event.target.value)}
            placeholder="Search topics…"
            aria-label="Search topics"
            className="mb-3"
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {visibleTopics.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTopicId(t.id);
                  setStep("genre");
                }}
                className={cnJoin(
                  "rounded-xl border-2 px-3 py-4 text-left transition",
                  topicId === t.id ? "border-accent bg-accent/10" : "border-border bg-elevated hover:border-accent/50",
                )}
              >
                <div className="text-sm font-bold">{t.name}</div>
              </button>
            ))}
          </div>
          {visibleTopics.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <p className="font-semibold text-text-primary">No topics found</p>
              <p className="mt-1 text-sm text-text-secondary">
                Try another name or clear your search.
              </p>
            </div>
          ) : null}
        </div>
      )}
      {step === "genre" && (
        <div>
          <button type="button" className="mb-3 text-xs font-bold text-muted underline" onClick={() => setStep("topic")}>
            ← Topics
          </button>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {genres.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setGenreId(g.id as GenreId);
                  setStep("details");
                }}
                className={cnJoin(
                  "rounded-xl border-2 px-3 py-4 text-left transition",
                  genreId === g.id ? "border-accent bg-accent/10" : "border-border bg-elevated hover:border-accent/50",
                )}
              >
                <div className="text-sm font-bold">{g.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}
      {step === "details" && (
        <div className="space-y-3">
          <button type="button" className="text-xs font-bold text-muted underline" onClick={() => setStep("genre")}>
            ← Genres
          </button>
          <p className="text-center text-sm font-semibold">
            {getTopic(topicId)?.name} · {getGenre(genreId).name}
          </p>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-subtle">Working title</label>
            <Input value={title} placeholder={generateGameTitle(topicId, genreId)} onChange={(e) => setTitle(e.target.value)} maxLength={40} className="!bg-elevated" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-subtle">Platform</label>
            <div className="flex flex-wrap gap-2">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlatformId(p.id)}
                  className={cnJoin(
                    "rounded-lg border px-3 py-2 text-sm font-semibold",
                    platformId === p.id ? "border-accent bg-accent/15" : "border-border bg-elevated",
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          {(unlocks.audience === "owned" || flags.audience) && (
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-subtle">Audience</label>
              <div className="flex flex-wrap gap-2">
                {AUDIENCES.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAudience(a.id as AudienceId)}
                    className={cnJoin(
                      "rounded-lg border px-3 py-2 text-sm font-semibold",
                      audience === a.id ? "border-accent bg-accent/15" : "border-border bg-elevated",
                    )}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-subtle">Size</label>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={cnJoin(
                    "rounded-lg border px-3 py-2 text-sm font-semibold capitalize",
                    size === s ? "border-accent bg-accent/15" : "border-border bg-elevated",
                  )}
                >
                  {s} ({formatCash(SIZE_STATS[s].cost)})
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-subtle">Engine</label>
            <div className="flex flex-wrap gap-2">
              {engines.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEngineId(e.id)}
                  className={cnJoin(
                    "rounded-lg border px-3 py-2 text-sm font-semibold",
                    engineId === e.id ? "border-accent bg-accent/15" : "border-border bg-elevated",
                  )}
                >
                  {e.name}
                </button>
              ))}
            </div>
          </div>
          {(unlocks.marketing === "owned" || flags.marketing) && (
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-subtle">
                Marketing (${marketing}) — awareness only
              </label>
              <input type="range" min={0} max={50000} step={1000} value={marketing} onChange={(e) => setMarketing(Number(e.target.value))} />
            </div>
          )}
          <div className="rounded-xl border border-border bg-elevated px-3 py-2 text-center text-xs text-muted">
            Fit {combo.topicGenre}/{combo.platformGenre} · Cost {formatCash(cost)} · Cash {formatCash(cash)}
          </div>
          {err && <p className="text-center text-sm text-bad">{err}</p>}
          <Button
            className="w-full"
            size="lg"
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
              });
              if (msg) setErr(msg);
              else setScreen("develop");
            }}
          >
            Begin Stage 1
          </Button>
        </div>
      )}
    </Modal>
  );
}

// helper used in NewGameModal after start
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
  return (
    <Modal open={modal === "cheats"} onClose={() => setModal(null)} title="QA Cheats">
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="secondary" onClick={() => applyCheat("cash_10k")}>
          +$10k
        </Button>
        <Button size="sm" variant="secondary" onClick={() => applyCheat("cash_100k")}>
          +$100k
        </Button>
        <Button size="sm" variant="secondary" onClick={() => applyCheat("cash_1m")}>
          +$1M
        </Button>
        <Button size="sm" variant="secondary" onClick={() => applyCheat("rp")}>
          +RP
        </Button>
        <Button size="sm" variant={settings.forcePerfectScore ? "primary" : "secondary"} onClick={() => applyCheat("toggle_perfect_score")}>
          Perfect scores
        </Button>
        <Button size="sm" variant={settings.forceBadScore ? "primary" : "secondary"} onClick={() => applyCheat("toggle_bad_score")}>
          Bad scores
        </Button>
      </div>
    </Modal>
  );
}

function EventModal() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  return (
    <Modal open={modal === "event"} onClose={() => setModal(null)} title="Event">
      <p className="text-sm text-muted">Open the bell for studio messages.</p>
      <Button className="mt-3 w-full" onClick={() => setModal(null)}>
        OK
      </Button>
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
