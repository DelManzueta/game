/**
 * Flat light UI + full GDT development loop (player-controlled stages).
 * Garage Vertical Slice shell: focused screens, pre-release, cancel, knowledge.
 */
import { useEffect, useMemo, useState } from "react";
import {
  AUDIENCES,
  FIELD_LABELS,
  GENRES,
  OFFICE_INFO,
  PLATFORMS,
  RESEARCH,
  REVIEWER_NAMES,
  SIZE_STATS,
  STAGE_FIELDS,
  TOPICS,
  getGenre,
  getPlatform,
  getTopic,
} from "@/lib/game/data";
import {
  isGarageTopic,
} from "@/lib/game/content/garageSlice";
import { isTechVisible, visibleScreens } from "@/lib/game/progression/service";
import {
  evaluateCombo,
  formatCash,
  formatFans,
  generateGameTitle,
} from "@/lib/game/simulation";
import { availableSizes, hasSave, useGame } from "@/lib/game/store";
import type {
  AudienceId,
  DevField,
  GameSize,
  GenreId,
  ScreenId,
  StaffMember,
} from "@/lib/game/types";
import { Badge, Button, Input, Modal, cnJoin } from "@/components/ui/primitives";
import { GarageLoopFlowchart, ScoringPipelineFlow } from "@/components/game/LoopFlowchart";
import {
  Cpu,
  FlaskConical,
  Gamepad2,
  GitBranch,
  History,
  LineChart,
  Menu,
  Pause,
  Play,
  Settings,
  Users,
  Wallet,
  Monitor,
  Home,
  FastForward,
} from "lucide-react";

/* ───────────────────────────── App root ───────────────────────────── */

export function GameApp() {
  const phase = useGame((s) => s.phase);
  const tick = useGame((s) => s.tick);
  const speed = useGame((s) => s.speed);
  const modal = useGame((s) => s.modal);

  useEffect(() => {
    if (phase !== "playing" || speed === 0) return;
    const ms = speed === 1 ? 900 : speed === 2 ? 450 : 220;
    const id = window.setInterval(() => {
      useGame.getState().tick();
    }, ms);
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
      {modal === null && null}
    </>
  );
}

/* ───────────────────────────── Menu ───────────────────────────── */

function MainMenu() {
  const newGame = useGame((s) => s.newGame);
  const loadGame = useGame((s) => s.loadGame);
  const deleteSave = useGame((s) => s.deleteSave);
  const [name, setName] = useState("Garage Games");
  const [pirate, setPirate] = useState(false);
  const [has, setHas] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setHas(hasSave());
  }, []);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-md text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Garage Vertical Slice</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Studio Empire</h1>
        <p className="mt-2 text-sm text-muted">
          Founder-alone campaign. Plan, develop stage-by-stage, polish, ship, learn.
        </p>
      </div>

      <div className="mt-8 w-full max-w-md space-y-4 glass rounded-[var(--radius-lg)] p-5 text-left">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-subtle">Company name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={32} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={pirate} onChange={(e) => setPirate(e.target.checked)} />
          Pirate mode (harder sales)
        </label>
        {err && <p className="text-sm text-bad">{err}</p>}
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
          New Campaign
        </Button>
        {has && (
          <>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => {
                if (!loadGame()) setErr("Could not load save.");
              }}
            >
              Continue Save
            </Button>
            <Button
              className="w-full"
              variant="ghost"
              onClick={() => {
                if (confirm("Delete local save?")) {
                  deleteSave();
                  setHas(false);
                }
              }}
            >
              Delete Save
            </Button>
          </>
        )}
        <p className="text-center text-[11px] text-muted">
          Deterministic seeds · explainable scoring · three-game garage loop
        </p>
      </div>
    </div>
  );
}

function GameOverScreen() {
  const returnToMenu = useGame((s) => s.returnToMenu);
  const company = useGame((s) => s.companyName);
  const total = useGame((s) => s.totalRevenue);
  const games = useGame((s) => s.gamesPublished);
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-bg px-4">
      <h1 className="text-3xl font-bold">Bankrupt</h1>
      <p className="mt-2 max-w-sm text-center text-sm text-muted">
        {company} closed after {games} release(s). Lifetime revenue {formatCash(total)}.
      </p>
      <Button className="mt-6" onClick={returnToMenu}>
        Main Menu
      </Button>
    </div>
  );
}

/* ───────────────────────────── Shell ───────────────────────────── */

function PlayingShell() {
  const screen = useGame((s) => s.screen);
  const project = useGame((s) => s.currentProject);
  const pausedForInput =
    !!project &&
    (project.devPhase === "STAGE_1_CONFIG" ||
      project.devPhase === "STAGE_2_CONFIG" ||
      project.devPhase === "STAGE_3_CONFIG" ||
      project.devPhase === "READY_TO_RELEASE");

  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg">
      <TopBar forcePause={pausedForInput} />
      <main className="flex-1 overflow-y-auto">
        {screen === "studio" && <StudioScreen />}
        {screen === "develop" && <DevelopScreen />}
        {screen === "games" && <GamesScreen />}
        {screen === "research" && <ResearchScreen />}
        {screen === "staff" && <StaffScreen />}
        {screen === "engines" && <EnginesScreen />}
        {screen === "platforms" && <PlatformsScreen />}
        {screen === "finances" && <FinancesScreen />}
        {screen === "market" && <MarketScreen />}
        {screen === "settings" && <SettingsScreen />}
      </main>
      <BottomNav />
      <NotificationsToast />
    </div>
  );
}

function TopBar({ forcePause }: { forcePause: boolean }) {
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

  useEffect(() => {
    if (forcePause && speed !== 0) setSpeed(0);
  }, [forcePause, speed, setSpeed]);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-3 py-2">
        <button
          type="button"
          className="text-left"
          onClick={() => setModal("pauseMenu")}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-subtle">Studio</div>
          <div className="max-w-[9rem] truncate text-sm font-bold sm:max-w-none">{company}</div>
        </button>
        <div className="text-xs text-muted">
          Y{year} · M{month} · W{(week % 4) + 1}
          <span className="ml-1 text-subtle">({week})</span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-sm">
          <span className="font-bold tabular text-cash">{formatCash(cash)}</span>
          <span className="tabular text-fans">{formatFans(fans)} fans</span>
          <span className="tabular text-research">{Math.floor(rp)} RP</span>
        </div>
        <div className="flex items-center gap-1">
          {(
            [
              [0, Pause, "Pause"],
              [1, Play, "1×"],
              [2, FastForward, "2×"],
              [4, FastForward, "4×"],
            ] as const
          ).map(([s, Icon, label]) => (
            <button
              key={s}
              type="button"
              disabled={forcePause && s !== 0}
              title={label}
              onClick={() => setSpeed(s as 0 | 1 | 2 | 4)}
              className={cnJoin(
                "flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border text-xs",
                speed === s
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border bg-elevated text-muted hover:text-fg",
                forcePause && s !== 0 && "opacity-40",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
          <button
            type="button"
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-elevated text-muted"
            onClick={() => {
              saveGame();
              setModal("pauseMenu");
            }}
            title="Menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>
      {forcePause && (
        <div className="border-t border-warn/30 bg-warn/10 px-3 py-1 text-center text-[11px] font-semibold text-warn">
          Time paused — finish your stage decision to continue
        </div>
      )}
    </header>
  );
}

function BottomNav() {
  const screen = useGame((s) => s.screen);
  const setScreen = useGame((s) => s.setScreen);
  const setModal = useGame((s) => s.setModal);
  const project = useGame((s) => s.currentProject);
  const state = useGame();
  const screens = useMemo(() => visibleScreens(state), [state.unlocks, state.gamesPublished, state.office, state.engines]);

  const items: { id: ScreenId | "newGame"; label: string; icon: typeof Gamepad2; action: () => void }[] = [];
  for (const id of screens) {
    if (id === "studio")
      items.push({ id, label: "Studio", icon: Home, action: () => setScreen("studio") });
    else if (id === "develop")
      items.push({
        id,
        label: "Develop",
        icon: Gamepad2,
        action: () => {
          if (!project) setModal("newGame");
          else setScreen("develop");
        },
      });
    else if (id === "games")
      items.push({ id, label: "Games", icon: History, action: () => setScreen("games") });
    else if (id === "research")
      items.push({ id, label: "Research", icon: FlaskConical, action: () => setScreen("research") });
    else if (id === "staff")
      items.push({ id, label: "Staff", icon: Users, action: () => setScreen("staff") });
    else if (id === "engines")
      items.push({ id, label: "Engines", icon: Cpu, action: () => setScreen("engines") });
    else if (id === "platforms")
      items.push({ id, label: "Platforms", icon: Monitor, action: () => setScreen("platforms") });
    else if (id === "finances")
      items.push({ id, label: "Money", icon: Wallet, action: () => setScreen("finances") });
    else if (id === "market")
      items.push({ id, label: "Market", icon: LineChart, action: () => setScreen("market") });
    else if (id === "settings")
      items.push({ id, label: "Settings", icon: Settings, action: () => setScreen("settings") });
  }

  return (
    <nav className="sticky bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl gap-0.5 overflow-x-auto px-1 py-1.5">
        {items.map((it) => {
          const Icon = it.icon;
          const active = screen === it.id;
          return (
            <button
              key={it.id}
              type="button"
              onClick={it.action}
              className={cnJoin(
                "flex min-w-[4.2rem] flex-1 flex-col items-center gap-0.5 rounded-[var(--radius-sm)] px-1 py-1.5 text-[10px] font-bold",
                active ? "bg-accent/10 text-accent" : "text-muted hover:bg-elevated hover:text-fg",
              )}
            >
              <Icon className="h-4 w-4" />
              {it.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function NotificationsToast() {
  const notes = useGame((s) => s.notifications);
  const dismiss = useGame((s) => s.dismissNotifications);
  if (!notes.length) return null;
  const top = notes.slice(0, 3);
  return (
    <div className="pointer-events-none fixed bottom-20 right-3 z-40 flex w-[min(20rem,calc(100vw-1.5rem))] flex-col gap-2">
      {top.map((n) => (
        <div
          key={n.id}
          className={cnJoin(
            "pointer-events-auto rounded-[var(--radius-md)] border px-3 py-2 text-sm shadow-[var(--shadow-card)]",
            n.tone === "good" && "border-good/40 bg-good/10",
            n.tone === "warn" && "border-warn/40 bg-warn/10",
            n.tone === "bad" && "border-bad/40 bg-bad/10",
            n.tone === "info" && "border-border bg-surface",
          )}
        >
          {n.text}
        </div>
      ))}
      <button
        type="button"
        className="pointer-events-auto self-end text-[11px] font-semibold text-muted underline"
        onClick={dismiss}
      >
        Dismiss
      </button>
    </div>
  );
}

/* ───────────────────────────── Studio ───────────────────────────── */

function StudioScreen() {
  const company = useGame((s) => s.companyName);
  const project = useGame((s) => s.currentProject);
  const staff = useGame((s) => s.staff);
  const office = useGame((s) => s.office);
  const gamesPublished = useGame((s) => s.gamesPublished);
  const knowledge = useGame((s) => s.knowledge);
  const setModal = useGame((s) => s.setModal);
  const setScreen = useGame((s) => s.setScreen);
  const cash = useGame((s) => s.cash);
  const fans = useGame((s) => s.fans);
  const activeSales = useGame((s) => s.activeSales);
  const upgradeOffice = useGame((s) => s.upgradeOffice);
  const [officeMsg, setOfficeMsg] = useState("");

  const officeInfo = OFFICE_INFO[office];
  const fansNeed = officeInfo.fanRequirement ?? 0;
  const gamesNeed = officeInfo.gamesRequirement ?? 0;
  const cashNeed = officeInfo.cashRequirement ?? 0;
  const moveCost = officeInfo.upgradeCost;
  const canMove =
    office === 1 &&
    fans >= fansNeed &&
    gamesPublished >= gamesNeed &&
    cash >= Math.max(cashNeed, moveCost);

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-28 pt-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">{company}</h2>
          <p className="text-sm text-muted">
            {officeInfo.name} · {staff.length} worker{staff.length === 1 ? "" : "s"} ·{" "}
            {gamesPublished} shipped
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setModal("loopGuide")}>
          <GitBranch className="h-3.5 w-3.5" /> How the loop works
        </Button>
      </div>

      {office === 1 && (
        <div className="mt-3 glass rounded-[var(--radius-lg)] p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-accent">Office goal</div>
          <h3 className="text-sm font-bold">Move out of the garage</h3>
          <div className="mt-2 space-y-1.5 text-xs">
            <ProgressRow
              label="Fans"
              value={`${fans.toLocaleString()} / ${fansNeed.toLocaleString()}`}
              pct={Math.min(100, (fans / Math.max(1, fansNeed)) * 100)}
            />
            <ProgressRow
              label="Games released"
              value={`${gamesPublished} / ${gamesNeed}`}
              pct={Math.min(100, (gamesPublished / Math.max(1, gamesNeed)) * 100)}
            />
            <ProgressRow
              label="Cash on hand"
              value={`${formatCash(cash)} / ${formatCash(cashNeed)}`}
              pct={Math.min(100, (cash / Math.max(1, cashNeed)) * 100)}
            />
            <p className="text-muted">Move cost: {formatCash(moveCost)} (paid when you move)</p>
          </div>
          {officeMsg && <p className="mt-2 text-sm text-warn">{officeMsg}</p>}
          <Button
            className="mt-3 w-full"
            size="sm"
            disabled={!canMove}
            onClick={() => setOfficeMsg(upgradeOffice() ?? "")}
          >
            {canMove ? "Move to Office" : "Requirements not met"}
          </Button>
        </div>
      )}

      {project ? (
        <button
          type="button"
          onClick={() => setScreen("develop")}
          className="mt-4 glass w-full rounded-[var(--radius-lg)] p-4 text-left"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-accent">
            {project.devPhase.replace(/_/g, " ")}
          </div>
          <div className="text-lg font-bold">{project.title}</div>
          <p className="text-sm text-muted">
            {getTopic(project.topicId)?.name} · {getGenre(project.genreId).name}
            {project.devPhase.includes("CONFIG") ? " · Waiting for your input" : ""}
            {project.devPhase === "POLISHING" ? " · Polish bugs, then Pre-Release" : ""}
            {project.devPhase === "READY_TO_RELEASE" ? " · Set title & price to ship" : ""}
          </p>
        </button>
      ) : (
        <div className="mt-4 glass rounded-[var(--radius-lg)] p-5 text-center">
          <p className="text-sm text-muted">No active project. Your garage is ready.</p>
          <Button className="mt-3" onClick={() => setModal("newGame")}>
            Develop New Game
          </Button>
        </div>
      )}

      <GarageArt busy={!!project && project.devPhase.includes("RUNNING")} count={Math.min(staff.length, 4)} />

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat label="Cash" value={formatCash(cash)} />
        <MiniStat label="On sale" value={String(activeSales.length)} />
        <MiniStat label="Insights" value={String(knowledge.entries.length)} />
        <MiniStat label="Office" value={OFFICE_INFO[office].name} />
      </div>

      {knowledge.entries.length > 0 && (
        <div className="mt-4 glass rounded-[var(--radius-lg)] p-4">
          <h3 className="text-sm font-bold">Recent knowledge</h3>
          <ul className="mt-2 space-y-2">
            {knowledge.entries.slice(0, 4).map((e) => (
              <li key={e.key} className="text-sm">
                <span className="font-semibold">{e.label}</span>
                <span className="text-muted"> — {e.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2">
      <div className="text-[10px] uppercase text-subtle">{label}</div>
      <div className="truncate text-sm font-bold">{value}</div>
    </div>
  );
}

function ProgressRow({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between gap-2">
        <span className="font-semibold text-muted">{label}</span>
        <span className="tabular font-bold">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-panel">
        <div className="h-full bg-accent transition-all" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
    </div>
  );
}

function GarageArt({ busy, count }: { busy: boolean; count: number }) {
  return (
    <svg
      viewBox="0 0 640 240"
      className="mt-4 w-full rounded-[var(--radius-lg)] border border-border bg-[#e8e6df]"
      role="img"
      aria-label="Garage studio"
    >
      <rect x="40" y="40" width="560" height="160" rx="8" fill="#f4f2eb" stroke="#c9c5b8" />
      <rect x="60" y="60" width="120" height="80" fill="#d9d5c8" stroke="#b8b4a8" />
      <text x="70" y="105" fontSize="11" fill="#5c6370">
        Workbench
      </text>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={76} y={86 + i * 30} width="16" height="12" fill={["#c98512", "#1a8fb5", "#6b5ad4"][i]} />
        </g>
      ))}
      <line x1="320" y1="36" x2="320" y2="52" stroke="#8b919c" strokeWidth="2" />
      <circle cx="320" cy="62" r="10" fill="#f0e6b8" stroke="#c9b86a" strokeWidth="2" />
      {Array.from({ length: count }).map((_, i) => {
        const x = 170 + i * 100;
        return (
          <g key={i}>
            <rect x={x} y="180" width="86" height="14" fill="#d4d1c8" stroke="#b8b4a8" />
            <rect x={x + 22} y="140" width="46" height="36" fill="#1c1f26" />
            <rect x={x + 27} y="145" width="36" height="22" fill={busy ? "#1a3d2e" : "#2a3040"} />
            {busy && (
              <>
                <rect x={x + 31} y={150} width="18" height="2" fill="#3ecf8e" />
                <rect x={x + 31} y={155} width="12" height="2" fill="#4ecbff" />
              </>
            )}
            <circle cx={x + 45} cy="176" r="9" fill="#c9a882" />
            <rect
              x={x + 34}
              y="186"
              width="22"
              height="20"
              rx="3"
              fill={["#3d5a80", "#4a6b4a", "#6b4a6b", "#4a5a7a"][i % 4]}
            />
          </g>
        );
      })}
    </svg>
  );
}

/* ───────────────────────────── Develop ───────────────────────────── */

function DevelopScreen() {
  const project = useGame((s) => s.currentProject);
  const setSlider = useGame((s) => s.setSlider);
  const confirmStage = useGame((s) => s.confirmStage);
  const enterPreRelease = useGame((s) => s.enterPreRelease);
  const setLaunchPrice = useGame((s) => s.setLaunchPrice);
  const setProjectTitle = useGame((s) => s.setProjectTitle);
  const releaseGame = useGame((s) => s.releaseGame);
  const cancelProject = useGame((s) => s.cancelProject);
  const autoBalance = useGame((s) => s.autoBalanceSliders);
  const infoMode = useGame((s) => s.settings.infoMode);
  const staff = useGame((s) => s.staff);
  const setModal = useGame((s) => s.setModal);
  const [err, setErr] = useState("");
  const [titleDraft, setTitleDraft] = useState("");

  if (!project) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-28 pt-10 text-center">
        <h2 className="text-xl font-bold">No active project</h2>
        <p className="mt-2 text-sm text-muted">Set up a new game to begin development.</p>
        <Button className="mt-4" onClick={() => setModal("newGame")}>
          Develop New Game
        </Button>
      </div>
    );
  }

  const phase = project.devPhase;
  const isConfig =
    phase === "STAGE_1_CONFIG" || phase === "STAGE_2_CONFIG" || phase === "STAGE_3_CONFIG";
  const isPolishing = phase === "POLISHING";
  const isPreRelease = phase === "READY_TO_RELEASE";
  const isPolish = isPolishing || isPreRelease;
  const stageNum: 1 | 2 | 3 = phase.startsWith("STAGE_1")
    ? 1
    : phase.startsWith("STAGE_2")
      ? 2
      : 3;
  const fields = STAGE_FIELDS[stageNum];
  const completedStages = phase.startsWith("STAGE_1")
    ? 0
    : phase.startsWith("STAGE_2")
      ? 1
      : phase.startsWith("STAGE_3") && isConfig
        ? 2
        : isPolish
          ? 3
          : stageNum - (isConfig ? 1 : 0);

  const overall =
    (Math.min(3, completedStages) + (isPolish ? 0 : isConfig ? 0 : project.stageProgress)) / 3;
  const priceDefault = project.launchPrice ?? 25;

  return (
    <div className="mx-auto w-full max-w-2xl px-3 pb-28 pt-4">
      <div className="glass rounded-[var(--radius-lg)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-accent">
              {phase.replace(/_/g, " ")}
            </div>
            <h2 className="text-xl font-bold">{project.title}</h2>
            <p className="text-sm text-muted">
              {getTopic(project.topicId)?.name} · {getGenre(project.genreId).name} ·{" "}
              {getPlatform(project.platformId).name}
            </p>
          </div>
          <div className="flex gap-3 text-center">
            <Stat n={Math.floor(project.designPoints)} l="Design" c="text-design" />
            <Stat n={Math.floor(project.techPoints)} l="Tech" c="text-tech" />
            <Stat n={project.bugs} l="Bugs" c="text-bugs" />
            <Stat n={Math.floor(project.researchEarned ?? 0)} l="RP" c="text-research" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1">
          {["S1", "S2", "S3", "Polish", "Ship"].map((label, i) => {
            const done =
              (i < 3 && i < completedStages) ||
              (i === 3 && isPolish) ||
              (i === 4 && isPreRelease);
            const active =
              (i < 3 && stageNum === i + 1 && !isPolish) ||
              (i === 3 && isPolishing) ||
              (i === 4 && isPreRelease);
            return (
              <div key={label} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={cnJoin(
                    "flex h-8 w-full items-center justify-center rounded-[var(--radius-sm)] text-[11px] font-bold",
                    active
                      ? "bg-accent text-accent-fg"
                      : done
                        ? "bg-good/20 text-good"
                        : "bg-panel text-subtle",
                  )}
                >
                  {label}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-panel">
          <div
            className="h-full bg-accent transition-all"
            style={{
              width: `${Math.min(
                100,
                (isPreRelease ? 0.98 : isPolishing ? 0.88 : overall) * 100 +
                  (isPolish ? 0 : project.stageProgress * 8),
              )}%`,
            }}
          />
        </div>
        {!isConfig && !isPolish && (
          <p className="mt-1 text-[11px] text-muted">
            Stage {stageNum} progress {(project.stageProgress * 100).toFixed(0)}% · Week{" "}
            {project.weeksDev}
          </p>
        )}
        {isConfig && (
          <p className="mt-2 rounded-[var(--radius-md)] border border-warn/40 bg-warn/10 px-3 py-2 text-sm font-semibold text-warn">
            Time paused — set Stage {stageNum} sliders, then confirm to begin development.
          </p>
        )}
      </div>

      {isConfig && (
        <div className="mt-4 glass rounded-[var(--radius-lg)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">Stage {stageNum} focus</h3>
            {infoMode !== "classic" && (
              <Button size="sm" variant="secondary" onClick={autoBalance}>
                Suggest balance
              </Button>
            )}
          </div>
          <div className="space-y-4">
            {fields.map((f) => (
              <div key={f}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold">{FIELD_LABELS[f]}</span>
                  <span className="tabular font-bold">{project.sliders[f] ?? 50}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={project.sliders[f] ?? 50}
                  onChange={(e) => setSlider(f, Number(e.target.value))}
                />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            Raising one area pulls time from the others. Your choices feed the review engine.
          </p>
          {err && <p className="mt-2 text-sm text-bad">{err}</p>}
          <Button
            className="mt-4 w-full"
            size="lg"
            onClick={() => {
              const m = confirmStage();
              if (m) setErr(m);
              else setErr("");
            }}
          >
            Confirm Stage {stageNum} & Begin
          </Button>
        </div>
      )}

      {(phase.includes("RUNNING") || isPolishing) && (
        <div className="mt-4 glass rounded-[var(--radius-lg)] p-4">
          <h3 className="mb-2 text-sm font-bold">Team working</h3>
          <div className="flex flex-wrap gap-2">
            {staff.map((m) => (
              <div
                key={m.id}
                className="rounded-[var(--radius-md)] border border-border bg-elevated px-3 py-2 text-xs"
              >
                <div className="font-bold">{m.name}</div>
                {m.id === "founder" ? (
                  <div className="text-muted">Founder · always available</div>
                ) : (
                  <div className="text-muted">Energy {Math.round(m.energy ?? 100)}%</div>
                )}
              </div>
            ))}
          </div>
          {!isConfig && !isPolish && (
            <div className="mt-3">
              <div className="mb-1 text-[11px] font-semibold text-muted">
                Stage {stageNum} fields (locked)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {fields.map((f) => (
                  <Badge key={f} tone="neutral">
                    {FIELD_LABELS[f]} {project.stageConfigs[stageNum]?.[f] ?? project.sliders[f]}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isPolishing && (
        <div className="mt-4 glass rounded-[var(--radius-lg)] p-4">
          <h3 className="text-sm font-bold">Polishing</h3>
          <p className="mt-1 text-sm text-muted">
            Bugs decrease over time while Design/Tech grow slowly. When ready, enter Pre-Release
            to set the final title and price — sales start one week after release.
          </p>
          <div className="mt-3 text-sm">
            Current bugs: <strong className="text-bugs">{project.bugs}</strong>
            {" · "}
            Dev weeks: <strong>{project.weeksDev}</strong>
          </div>
          {err && <p className="mt-2 text-sm text-bad">{err}</p>}
          <Button
            className="mt-4 w-full"
            size="lg"
            onClick={() => {
              setTitleDraft(project.title);
              const m = enterPreRelease();
              if (m) setErr(m);
              else setErr("");
            }}
          >
            Enter Pre-Release
          </Button>
          <Button
            className="mt-2 w-full"
            variant="danger"
            onClick={() => {
              if (confirm(`Cancel "${project.title}"? Development cost is sunk.`)) {
                const m = cancelProject();
                if (m) setErr(m);
              }
            }}
          >
            Cancel Project
          </Button>
        </div>
      )}

      {isPreRelease && (
        <div className="mt-4 glass rounded-[var(--radius-lg)] p-4">
          <h3 className="text-sm font-bold">Pre-Release</h3>
          <p className="mt-1 text-sm text-muted">
            Lock the final title and launch price. Price does not change quality — only sales.
            Reviews appear on release; first sales after one market week.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-subtle">
                Final title
              </label>
              <Input
                value={titleDraft || project.title}
                onChange={(e) => {
                  setTitleDraft(e.target.value);
                  setProjectTitle(e.target.value);
                }}
                maxLength={40}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-subtle">
                Launch price (${project.launchPrice ?? priceDefault})
              </label>
              <input
                type="range"
                min={10}
                max={60}
                step={5}
                value={project.launchPrice ?? priceDefault}
                onChange={(e) => setLaunchPrice(Number(e.target.value))}
              />
              <div className="mt-1 flex justify-between text-[10px] text-muted">
                <span>$10 budget</span>
                <span className="font-bold text-fg">${project.launchPrice ?? priceDefault}</span>
                <span>$60 premium</span>
              </div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-elevated px-3 py-2 text-xs text-muted">
              Design {Math.floor(project.designPoints)} · Tech {Math.floor(project.techPoints)} ·
              Bugs {project.bugs} · Cost {formatCash(project.developmentCost)}
            </div>
          </div>
          {err && <p className="mt-2 text-sm text-bad">{err}</p>}
          <Button
            className="mt-4 w-full"
            size="lg"
            onClick={() => {
              if (titleDraft.trim()) setProjectTitle(titleDraft.trim());
              const m = releaseGame();
              if (m) setErr(m);
              else setErr("");
            }}
          >
            Release Game
          </Button>
          <Button
            className="mt-2 w-full"
            variant="danger"
            onClick={() => {
              if (confirm(`Cancel "${project.title}"? Development cost is sunk.`)) {
                const m = cancelProject();
                if (m) setErr(m);
              }
            }}
          >
            Cancel Project
          </Button>
        </div>
      )}

      {!isPolish && (
        <div className="mt-3 text-center">
          <button
            type="button"
            className="text-xs font-semibold text-bad underline-offset-2 hover:underline"
            onClick={() => {
              if (confirm(`Cancel "${project.title}"? Development cost is sunk.`)) {
                cancelProject();
              }
            }}
          >
            Cancel project
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ n, l, c }: { n: number; l: string; c: string }) {
  return (
    <div>
      <div className={cnJoin("text-lg font-bold tabular", c)}>{n}</div>
      <div className="text-[9px] uppercase text-subtle">{l}</div>
    </div>
  );
}

/* ───────────────────────────── Games ───────────────────────────── */

function GamesScreen() {
  const games = useGame((s) => s.releasedGames);
  const project = useGame((s) => s.currentProject);
  const activeSales = useGame((s) => s.activeSales);
  const selected = useGame((s) => s.selectedGameId);
  const selectGame = useGame((s) => s.selectGame);
  const completeReport = useGame((s) => s.completeReport);
  const knowledge = useGame((s) => s.knowledge);
  const [tab, setTab] = useState<"dev" | "sale" | "released" | "reports">("released");

  const sel = games.find((g) => g.id === selected) ?? games[0];
  const selInsights = sel
    ? knowledge.entries.filter((e) => e.sourceGameId === sel.id)
    : [];

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-28 pt-4">
      <h2 className="mb-3 text-xl font-bold">Games</h2>
      <div className="mb-3 flex flex-wrap gap-1">
        {(
          [
            ["dev", "In Development"],
            ["sale", "On Sale"],
            ["released", "Released"],
            ["reports", "Reports"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cnJoin(
              "rounded-full px-3 py-1.5 text-xs font-bold",
              tab === id ? "bg-accent text-accent-fg" : "border border-border bg-surface text-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "dev" && (
        <div className="glass rounded-[var(--radius-lg)] p-4 text-sm">
          {project ? (
            <div>
              <div className="font-bold">{project.title}</div>
              <div className="text-muted">{project.devPhase.replace(/_/g, " ")}</div>
            </div>
          ) : (
            <p className="text-muted">No game in development.</p>
          )}
        </div>
      )}

      {tab === "sale" && (
        <div className="space-y-2">
          {activeSales.length === 0 && <p className="text-sm text-muted">Nothing on sale.</p>}
          {activeSales.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => selectGame(g.id)}
              className="glass flex w-full items-center justify-between rounded-[var(--radius-md)] p-3 text-left"
            >
              <span className="font-semibold">{g.title}</span>
              <span className="text-sm text-cash">{formatCash(g.revenue)}</span>
            </button>
          ))}
        </div>
      )}

      {(tab === "released" || tab === "reports") && (
        <div className="grid gap-3 lg:grid-cols-5">
          <div className="space-y-2 lg:col-span-2">
            {games.length === 0 && <p className="text-sm text-muted">No releases yet.</p>}
            {games.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => selectGame(g.id)}
                className={cnJoin(
                  "flex w-full items-center justify-between rounded-[var(--radius-md)] border p-3 text-left",
                  selected === g.id || (!selected && g.id === sel?.id)
                    ? "border-accent bg-accent/5"
                    : "border-border bg-surface",
                )}
              >
                <div>
                  <div className="text-sm font-bold">{g.title}</div>
                  <div className="text-[11px] text-muted">
                    {g.yearReleased} · {g.onSale ? "On sale" : "Catalog"}
                  </div>
                </div>
                <div className="text-lg font-bold tabular">{g.avgReview.toFixed(1)}</div>
              </button>
            ))}
          </div>
          {sel && (
            <div className="glass rounded-[var(--radius-lg)] p-4 lg:col-span-3">
              <h3 className="text-lg font-bold">{sel.title}</h3>
              <p className="text-sm text-muted">
                {getTopic(sel.topicId)?.name} · {getGenre(sel.genreId).name} ·{" "}
                {getPlatform(sel.platformId).name}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <div className="text-center">
                  <div className="text-3xl font-bold tabular">{sel.avgReview.toFixed(1)}</div>
                  <div className="text-[10px] text-subtle">Average</div>
                </div>
                {sel.reviewScores.map((sc, i) => (
                  <div key={i} className="text-center">
                    <div className="text-lg font-bold tabular">
                      {typeof sc === "number" ? sc.toFixed(1) : sc}
                    </div>
                    <div className="text-[9px] text-subtle">
                      {sel.criticReviews?.[i]?.name ?? REVIEWER_NAMES[i] ?? `C${i + 1}`}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <Row k="Units sold" v={formatFans(sel.sales)} />
                <Row k="Revenue" v={formatCash(sel.revenue)} />
                <Row k="Dev cost" v={formatCash(sel.developmentCost ?? 0)} />
                <Row k="Price" v={`$${sel.launchPrice ?? 25}`} />
                <Row
                  k="Profit"
                  v={formatCash(sel.revenue - (sel.developmentCost ?? 0) - sel.marketingSpend)}
                />
                <Row k="Weeks on market" v={String(sel.weeksOnMarket ?? 0)} />
              </div>
              {sel.outcomeTrace && (
                <div className="mt-3 rounded-[var(--radius-md)] border border-border bg-elevated p-2 text-[11px] text-muted">
                  Trace: quality {sel.outcomeTrace.productQuality.toFixed(0)} · seed{" "}
                  {sel.outcomeTrace.projectSeed} · plan {sel.outcomeTrace.weeklySalesPlan.length}{" "}
                  weeks
                </div>
              )}
              <SalesChart history={sel.weeklyHistory ?? []} />
              {tab === "reports" && !sel.reportDone && (
                <Button className="mt-3 w-full" onClick={() => completeReport(sel.id)}>
                  Create Game Report
                </Button>
              )}
              {sel.reportDone && (
                <div className="mt-3">
                  <p className="text-xs text-good">Report filed — knowledge recorded.</p>
                  {selInsights.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted">
                      {selInsights.map((e) => (
                        <li key={e.key}>
                          <strong className="text-fg">{e.label}</strong> — {e.detail}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-border bg-elevated px-2 py-1.5">
      <div className="text-[10px] text-subtle">{k}</div>
      <div className="font-semibold tabular">{v}</div>
    </div>
  );
}

function SalesChart({ history }: { history: { week: number; units: number; revenue: number }[] }) {
  if (!history.length) {
    return <p className="mt-3 text-xs text-muted">No weekly sales data yet — first week after release.</p>;
  }
  const max = Math.max(...history.map((h) => h.units), 1);
  const w = 280;
  const h = 80;
  const pts = history.map((pt, i) => {
    const x = (i / Math.max(1, history.length - 1)) * (w - 8) + 4;
    const y = h - 8 - (pt.units / max) * (h - 16);
    return `${x},${y}`;
  });
  return (
    <div className="mt-4">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-subtle">
        Weekly units
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full max-w-md rounded border border-border bg-elevated"
      >
        <polyline fill="none" stroke="var(--color-accent)" strokeWidth="2" points={pts.join(" ")} />
        {history.map((pt, i) => {
          const x = (i / Math.max(1, history.length - 1)) * (w - 8) + 4;
          const y = h - 8 - (pt.units / max) * (h - 16);
          return <circle key={i} cx={x} cy={y} r="2.5" fill="var(--color-accent)" />;
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>Launch+1w</span>
        <span>
          Peak {max.toLocaleString()} · {history.length} weeks recorded
        </span>
      </div>
    </div>
  );
}

/* ───────────────────────────── Research ───────────────────────────── */

function ResearchScreen() {
  const researched = useGame((s) => s.researched);
  const unlockedTopics = useGame((s) => s.unlockedTopics);
  const rp = useGame((s) => s.researchPoints);
  const active = useGame((s) => s.activeResearch);
  const startResearch = useGame((s) => s.startResearch);
  const garageSlice = useGame((s) => s.garageSlice);
  const state = useGame();
  const [tab, setTab] = useState<"topics" | "tech" | "engine" | "studio" | "done">("tech");
  const [msg, setMsg] = useState("");

  const techItems = RESEARCH.filter((r) => !r.engineFeature && r.category !== "Studio");
  const engineItems = RESEARCH.filter((r) => !!r.engineFeature);
  const studioItems = RESEARCH.filter((r) => r.category === "Studio" || r.unlocksSize);

  const visible = (list: typeof RESEARCH) =>
    list
      .map((item) => ({ item, vis: isTechVisible(item, state) }))
      .filter((x) => x.vis !== "hidden");

  const topicList = TOPICS.filter((t) => {
    if (t.startUnlocked) return false;
    if (garageSlice && !isGarageTopic(t.id)) return false;
    return true;
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-3 pb-28 pt-4">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-xl font-bold">Research</h2>
        <div className="text-sm font-bold text-research">{Math.floor(rp)} RP</div>
      </div>
      {active && (
        <div className="mb-3 rounded-[var(--radius-md)] border border-research/40 bg-research/10 px-3 py-2 text-sm">
          In progress: <strong>{active.name}</strong> · {active.weeksLeft}/{active.totalWeeks} weeks
          left
        </div>
      )}
      <div className="mb-3 flex flex-wrap gap-1">
        {(
          [
            ["topics", "Topics"],
            ["tech", "Technologies"],
            ["engine", "Engine Features"],
            ["studio", "Studio"],
            ["done", "Completed"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cnJoin(
              "rounded-full px-3 py-1.5 text-xs font-bold",
              tab === id ? "bg-accent text-accent-fg" : "border border-border bg-surface text-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {msg && <p className="mb-2 text-sm text-warn">{msg}</p>}

      {tab === "topics" && (
        <div className="space-y-2">
          {topicList.map((t) => {
            const done = unlockedTopics.includes(t.id);
            return (
              <div
                key={t.id}
                className="glass flex items-center justify-between rounded-[var(--radius-md)] p-3"
              >
                <div>
                  <div className="text-sm font-bold">{t.name}</div>
                  <div className="text-xs text-muted">
                    {done ? "Owned" : `${t.researchCost} RP · ~2 weeks`}
                  </div>
                </div>
                {!done && (
                  <Button
                    size="sm"
                    disabled={!!active}
                    onClick={() => setMsg(startResearch(t.id, "topic") ?? "")}
                  >
                    Research
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "tech" && (
        <div className="space-y-2">
          {visible(techItems).map(({ item, vis }) => (
            <div
              key={item.id}
              className="glass flex items-center justify-between rounded-[var(--radius-md)] p-3"
            >
              <div>
                <div className="text-sm font-bold">{item.name}</div>
                <div className="text-xs text-muted">
                  {vis === "owned"
                    ? "Owned"
                    : vis === "teased"
                      ? "Coming soon"
                      : `${item.cost} RP · ${item.weeks ?? 3}w`}
                </div>
              </div>
              {vis === "available" && (
                <Button
                  size="sm"
                  disabled={!!active}
                  onClick={() => setMsg(startResearch(item.id, "tech") ?? "")}
                >
                  Research
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "engine" && (
        <div className="space-y-2">
          {visible(engineItems).map(({ item, vis }) => (
            <div
              key={item.id}
              className="glass flex items-center justify-between rounded-[var(--radius-md)] p-3"
            >
              <div>
                <div className="text-sm font-bold">{item.name}</div>
                <div className="text-xs text-muted">{item.description}</div>
              </div>
              {vis === "available" && (
                <Button
                  size="sm"
                  disabled={!!active}
                  onClick={() => setMsg(startResearch(item.id, "tech") ?? "")}
                >
                  {item.cost} RP
                </Button>
              )}
              {vis === "owned" && <Badge tone="good">Owned</Badge>}
            </div>
          ))}
        </div>
      )}

      {tab === "studio" && (
        <div className="space-y-2">
          {visible(studioItems).map(({ item, vis }) => (
            <div
              key={item.id}
              className="glass flex items-center justify-between rounded-[var(--radius-md)] p-3"
            >
              <div>
                <div className="text-sm font-bold">{item.name}</div>
                <div className="text-xs text-muted">{item.description}</div>
              </div>
              {vis === "available" && (
                <Button
                  size="sm"
                  disabled={!!active}
                  onClick={() => setMsg(startResearch(item.id, "tech") ?? "")}
                >
                  {item.cost} RP
                </Button>
              )}
              {vis === "owned" && <Badge tone="good">Owned</Badge>}
            </div>
          ))}
        </div>
      )}

      {tab === "done" && (
        <div className="space-y-1 text-sm">
          {researched.length === 0 && <p className="text-muted">Nothing researched yet.</p>}
          {researched.map((id) => {
            const r = RESEARCH.find((x) => x.id === id);
            return (
              <div key={id} className="rounded border border-border bg-surface px-3 py-2">
                {r?.name ?? id}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── Other screens ───────────────────────────── */

function StaffScreen() {
  const staff = useGame((s) => s.staff);
  const hireStaff = useGame((s) => s.hireStaff);
  const fireStaff = useGame((s) => s.fireStaff);
  const getCandidates = useGame((s) => s.getCandidates);
  const refreshCandidates = useGame((s) => s.refreshCandidates);
  const unlocks = useGame((s) => s.unlocks);
  const [cands, setCands] = useState<StaffMember[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setCands(getCandidates());
  }, [getCandidates]);

  if (unlocks.hiring !== "owned") {
    return (
      <div className="mx-auto max-w-lg px-4 pb-28 pt-10 text-center">
        <Users className="mx-auto h-8 w-8 text-muted" />
        <h2 className="mt-3 text-xl font-bold">Hiring locked</h2>
        <p className="mt-2 text-sm text-muted">
          Move into a larger office to hire staff. For now, the founder ships alone.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-3 pb-28 pt-4">
      <h2 className="mb-3 text-xl font-bold">Staff</h2>
      {msg && <p className="mb-2 text-sm text-warn">{msg}</p>}
      <div className="space-y-2">
        {staff.map((m) => (
          <div
            key={m.id}
            className="glass flex items-center justify-between rounded-[var(--radius-md)] p-3"
          >
            <div>
              <div className="font-bold">
                {m.name} {m.id === "founder" && <Badge tone="accent">Founder</Badge>}
              </div>
              <div className="text-xs text-muted">
                D{m.design} T{m.tech} S{m.speed} · ${m.salary}/mo
                {m.id !== "founder" && ` · Energy ${Math.round(m.energy)}%`}
              </div>
            </div>
            {m.id !== "founder" && (
              <Button size="sm" variant="danger" onClick={() => fireStaff(m.id)}>
                Fire
              </Button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        <h3 className="text-sm font-bold">Candidates</h3>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setCands(refreshCandidates())}
        >
          Refresh
        </Button>
      </div>
      <div className="mt-2 space-y-2">
        {cands.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded border border-border bg-surface p-3"
          >
            <div className="text-sm">
              <div className="font-bold">{c.name}</div>
              <div className="text-xs text-muted">
                D{c.design} T{c.tech} · ${c.salary}/mo
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                const e = hireStaff(c);
                setMsg(e ?? "Hired.");
                setCands(getCandidates());
              }}
            >
              Hire
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EnginesScreen() {
  const engines = useGame((s) => s.engines);
  const buildEngine = useGame((s) => s.buildEngine);
  const researched = useGame((s) => s.researched);
  const [name, setName] = useState("Custom Engine");
  const [msg, setMsg] = useState("");
  const features = RESEARCH.filter((r) => r.engineFeature && researched.includes(r.id)).map(
    (r) => r.engineFeature!,
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-3 pb-28 pt-4">
      <h2 className="mb-3 text-xl font-bold">Engines</h2>
      <div className="space-y-2">
        {engines.map((e) => (
          <div key={e.id} className="glass rounded-[var(--radius-md)] p-3">
            <div className="font-bold">{e.name}</div>
            <div className="text-xs text-muted">
              Design +{e.designBonus} · Tech +{e.techBonus} · {e.features.join(", ") || "Basic"}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 glass rounded-[var(--radius-lg)] p-4">
        <h3 className="text-sm font-bold">Build custom engine</h3>
        <Input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} />
        <p className="mt-2 text-xs text-muted">
          Features available: {features.length ? features.join(", ") : "none researched yet"}
        </p>
        {msg && <p className="mt-2 text-sm text-warn">{msg}</p>}
        <Button
          className="mt-3 w-full"
          onClick={() => setMsg(buildEngine(name, features) ?? "Building…")}
        >
          Build
        </Button>
      </div>
    </div>
  );
}

function PlatformsScreen() {
  const unlocked = useGame((s) => s.unlockedPlatforms);
  const licensePlatform = useGame((s) => s.licensePlatform);
  const year = useGame((s) => s.year);
  const garageSlice = useGame((s) => s.garageSlice);
  const [msg, setMsg] = useState("");

  const list = PLATFORMS.filter((p) => {
    if (garageSlice && !["pc", "commodore", "tes", "master_v", "itara_5200"].includes(p.id)) return false;
    return p.year <= year + 1;
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-3 pb-28 pt-4">
      <h2 className="mb-3 text-xl font-bold">Platforms</h2>
      {msg && <p className="mb-2 text-sm text-warn">{msg}</p>}
      <div className="space-y-2">
        {list.map((p) => {
          const owned = unlocked.includes(p.id);
          return (
            <div
              key={p.id}
              className="glass flex items-center justify-between rounded-[var(--radius-md)] p-3"
            >
              <div>
                <div className="font-bold">
                  {p.name} <span className="text-xs text-muted">({p.short})</span>
                </div>
                <div className="text-xs text-muted">
                  {p.year} · market {p.marketSize.toFixed(1)} · license {formatCash(p.licenseCost)}
                </div>
              </div>
              {owned ? (
                <Badge tone="good">Licensed</Badge>
              ) : (
                <Button size="sm" onClick={() => setMsg(licensePlatform(p.id) ?? "")}>
                  License
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FinancesScreen() {
  const cash = useGame((s) => s.cash);
  const total = useGame((s) => s.totalRevenue);
  const games = useGame((s) => s.releasedGames);
  const staff = useGame((s) => s.staff);
  const office = useGame((s) => s.office);
  const contracts = useGame((s) => s.contracts);
  const activeContract = useGame((s) => s.activeContract);
  const takeContract = useGame((s) => s.takeContract);
  const payroll = staff.reduce((s, m) => s + m.salary, 0);

  return (
    <div className="mx-auto w-full max-w-2xl px-3 pb-28 pt-4">
      <h2 className="mb-3 text-xl font-bold">Finances</h2>
      <div className="grid grid-cols-2 gap-2">
        <MiniStat label="Cash" value={formatCash(cash)} />
        <MiniStat label="Lifetime revenue" value={formatCash(total)} />
        <MiniStat label="Payroll / mo" value={formatCash(payroll)} />
        <MiniStat label="Rent / mo" value={formatCash(OFFICE_INFO[office].rent)} />
      </div>
      <h3 className="mb-2 mt-6 text-sm font-bold">Release P&L</h3>
      <div className="space-y-2">
        {games.length === 0 && <p className="text-sm text-muted">No releases yet.</p>}
        {games.map((g) => (
          <div
            key={g.id}
            className="flex justify-between rounded border border-border bg-surface px-3 py-2 text-sm"
          >
            <span className="font-semibold">{g.title}</span>
            <span className="tabular text-cash">
              {formatCash(g.revenue - (g.developmentCost ?? 0) - g.marketingSpend)}
            </span>
          </div>
        ))}
      </div>
      {(contracts.length > 0 || activeContract) && (
        <>
          <h3 className="mb-2 mt-6 text-sm font-bold">Contracts</h3>
          {activeContract && (
            <p className="mb-2 text-sm">
              Active: {activeContract.title} ({activeContract.progress}/{activeContract.weeks})
            </p>
          )}
          {contracts.map((c) => (
            <div
              key={c.id}
              className="mb-2 flex items-center justify-between rounded border border-border p-3 text-sm"
            >
              <div>
                <div className="font-bold">{c.title}</div>
                <div className="text-xs text-muted">
                  {formatCash(c.reward)} · {c.weeks}w
                </div>
              </div>
              <Button size="sm" disabled={!!activeContract} onClick={() => takeContract(c.id)}>
                Accept
              </Button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function MarketScreen() {
  const market = useGame((s) => s.market);
  const activeSales = useGame((s) => s.activeSales);
  const year = useGame((s) => s.year);

  return (
    <div className="mx-auto w-full max-w-2xl px-3 pb-28 pt-4">
      <h2 className="mb-3 text-xl font-bold">Market</h2>
      <p className="mb-4 text-sm text-muted">
        Year {year}. Your catalog and industry noise — garage slice keeps rivals light.
      </p>
      <h3 className="mb-2 text-sm font-bold">Your titles on sale</h3>
      {activeSales.length === 0 ? (
        <p className="text-sm text-muted">Nothing selling yet.</p>
      ) : (
        <div className="space-y-2">
          {activeSales.map((g) => (
            <div
              key={g.id}
              className="glass flex justify-between rounded-[var(--radius-md)] p-3 text-sm"
            >
              <span className="font-semibold">{g.title}</span>
              <span>
                {formatFans(g.sales)} · {formatCash(g.revenue)}
              </span>
            </div>
          ))}
        </div>
      )}
      {market?.news && market.news.length > 0 && (
        <>
          <h3 className="mb-2 mt-6 text-sm font-bold">Industry news</h3>
          <ul className="space-y-2">
            {market.news.slice(0, 6).map((n) => (
              <li key={n.id} className="rounded border border-border bg-surface px-3 py-2 text-sm">
                <div className="font-semibold">{n.headline}</div>
                <div className="text-xs text-muted">{n.body}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function SettingsScreen() {
  const settings = useGame((s) => s.settings);
  const setModal = useGame((s) => s.setModal);
  const saveGame = useGame((s) => s.saveGame);
  const exportSave = useGame((s) => s.exportSave);
  const importSave = useGame((s) => s.importSave);
  const company = useGame((s) => s.companyName);
  const campaignSeed = useGame((s) => s.campaignSeed);
  const knowledge = useGame((s) => s.knowledge);

  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-28 pt-4">
      <h2 className="mb-3 text-xl font-bold">Settings</h2>
      <div className="glass space-y-3 rounded-[var(--radius-lg)] p-4 text-sm">
        <div className="flex justify-between">
          <span>Company</span>
          <strong>{company}</strong>
        </div>
        <div className="flex justify-between">
          <span>Campaign seed</span>
          <strong className="tabular">{campaignSeed}</strong>
        </div>
        <div className="flex justify-between">
          <span>Autosave</span>
          <strong>{settings.autosave ? "On" : "Off"}</strong>
        </div>
        <div className="flex justify-between">
          <span>Knowledge entries</span>
          <strong>{knowledge.entries.length}</strong>
        </div>
        <div className="flex justify-between">
          <span>Info mode</span>
          <strong>{settings.infoMode}</strong>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Button className="w-full" onClick={() => saveGame()}>
          Save Game
        </Button>
        <Button
          className="w-full"
          variant="secondary"
          onClick={() => {
            const raw = exportSave();
            void navigator.clipboard?.writeText(raw);
            alert("Save copied to clipboard.");
          }}
        >
          Export Save
        </Button>
        <Button
          className="w-full"
          variant="secondary"
          onClick={() => {
            const raw = prompt("Paste save JSON");
            if (raw) importSave(raw);
          }}
        >
          Import Save
        </Button>
        <Button className="w-full" variant="secondary" onClick={() => setModal("loopGuide")}>
          How the loop works
        </Button>
        <Button className="w-full" variant="ghost" onClick={() => setModal("cheats")}>
          Cheats
        </Button>
        <Button className="w-full" variant="secondary" onClick={() => setModal("pauseMenu")}>
          Pause / Quit
        </Button>
      </div>
    </div>
  );
}

/* ───────────────────────────── Modals ───────────────────────────── */

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase text-subtle">{label}</label>
      <select
        className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-elevated px-3"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

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

  const topics = TOPICS.filter(
    (t) => unlockedTopics.includes(t.id) && (!garageSlice || isGarageTopic(t.id)),
  );
  const genres = GENRES.filter((g) => unlockedGenres.includes(g.id));
  const platforms = PLATFORMS.filter((p) => unlockedPlatforms.includes(p.id));
  const sizes = availableSizes(researched, unlocks);

  const [topicId, setTopicId] = useState(topics[0]?.id ?? "space");
  const [genreId, setGenreId] = useState<GenreId>((genres[0]?.id as GenreId) ?? "action");
  const [platformId, setPlatformId] = useState(platforms[0]?.id ?? "pc");
  const [audience, setAudience] = useState<AudienceId>("everyone");
  const [size, setSize] = useState<GameSize>("small");
  const [engineId, setEngineId] = useState(engines[0]?.id ?? "basic");
  const [title, setTitle] = useState("");
  const [marketing, setMarketing] = useState(0);
  const [err, setErr] = useState("");

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  const cost = SIZE_STATS[size].cost + marketing;
  const combo = evaluateCombo({ topicId, genreId, platformId, audience });

  return (
    <Modal open={modal === "newGame"} onClose={() => setModal(null)} title="New Game" wide>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-subtle">Title</label>
          <Input
            value={title}
            placeholder={generateGameTitle(topicId, genreId)}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={40}
          />
        </div>
        <FieldSelect
          label="Topic"
          value={topicId}
          onChange={setTopicId}
          options={topics.map((t) => ({ value: t.id, label: t.name }))}
        />
        <FieldSelect
          label="Genre"
          value={genreId}
          onChange={(v) => setGenreId(v as GenreId)}
          options={genres.map((g) => ({ value: g.id, label: g.name }))}
        />
        <FieldSelect
          label="Platform"
          value={platformId}
          onChange={setPlatformId}
          options={platforms.map((p) => ({ value: p.id, label: p.name }))}
        />
        {(unlocks.audience === "owned" || flags.audience) && (
          <FieldSelect
            label="Audience"
            value={audience}
            onChange={(v) => setAudience(v as AudienceId)}
            options={AUDIENCES.map((a) => ({ value: a.id, label: a.name }))}
          />
        )}
        <FieldSelect
          label="Size"
          value={size}
          onChange={(v) => setSize(v as GameSize)}
          options={sizes.map((s) => ({
            value: s,
            label: `${s} (${formatCash(SIZE_STATS[s].cost)})`,
          }))}
        />
        <FieldSelect
          label="Engine"
          value={engineId}
          onChange={setEngineId}
          options={engines.map((e) => ({ value: e.id, label: e.name }))}
        />
        {(unlocks.marketing === "owned" || flags.marketing) && (
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-subtle">
              Marketing spend (${marketing})
            </label>
            <input
              type="range"
              min={0}
              max={50000}
              step={1000}
              value={marketing}
              onChange={(e) => setMarketing(Number(e.target.value))}
            />
          </div>
        )}
        <div className="rounded-[var(--radius-md)] border border-border bg-elevated px-3 py-2 text-xs text-muted">
          Fit: topic×genre {combo.topicGenre} · platform×genre {combo.platformGenre}
          <br />
          Cost {formatCash(cost)} · Cash {formatCash(cash)}
        </div>
        {err && <p className="text-sm text-bad">{err}</p>}
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
          }}
        >
          Start Development
        </Button>
      </div>
    </Modal>
  );
}

function ReviewsModal() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  const id = useGame((s) => s.lastReviewGameId);
  const games = useGame((s) => s.releasedGames);
  const g = games.find((x) => x.id === id);
  if (!g) return null;

  return (
    <Modal open={modal === "reviews"} onClose={() => setModal(null)} title="Reviews are in">
      <div className="text-center">
        <div className="text-5xl font-bold tabular">{g.avgReview.toFixed(1)}</div>
        <p className="mt-1 text-sm text-muted">{g.title}</p>
      </div>
      <div className="mt-4 space-y-2">
        {g.reviewScores.map((sc, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-3 rounded border border-border bg-elevated px-3 py-2 text-sm"
          >
            <div>
              <div className="font-bold">
                {g.criticReviews?.[i]?.name ?? REVIEWER_NAMES[i] ?? `Critic ${i + 1}`}
              </div>
              <div className="text-xs text-muted">
                {g.criticReviews?.[i]?.comment ?? g.reviewComments?.[i] ?? "Solid effort."}
              </div>
            </div>
            <div className="text-lg font-bold tabular">
              {typeof sc === "number" ? sc.toFixed(1) : sc}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        Sales begin next week. Price ${g.launchPrice ?? 25} does not affect these scores.
      </p>
      <Button className="mt-4 w-full" onClick={() => setModal(null)}>
        Continue
      </Button>
    </Modal>
  );
}

function ReportModal() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  const id = useGame((s) => s.selectedGameId);
  const games = useGame((s) => s.releasedGames);
  const knowledge = useGame((s) => s.knowledge);
  const g = games.find((x) => x.id === id);
  if (!g) return null;
  const combo = evaluateCombo({
    topicId: g.topicId,
    genreId: g.genreId,
    platformId: g.platformId,
    audience: g.audience,
  });
  const insights = knowledge.entries.filter((e) => e.sourceGameId === g.id);
  const bd = g.qualityBreakdownV2;

  return (
    <Modal open={modal === "report"} onClose={() => setModal(null)} title="Game Report">
      <p className="text-sm text-muted">
        Insights from {g.title} only — outcomes are frozen in the save and never re-roll.
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
        <li>
          Topic × genre felt {combo.topicGenre}.
        </li>
        <li>
          Platform × genre felt {combo.platformGenre}.
        </li>
        <li>
          Bugs at release: {g.bugs} {g.bugs > 8 ? "(hurts trust)" : "(manageable)"}.
        </li>
        <li>
          Design {Math.floor(g.designPoints)} / Tech {Math.floor(g.techPoints)} balance mattered for
          reviews.
        </li>
        {g.outcomeTrace && (
          <li>
            Product quality {g.outcomeTrace.productQuality.toFixed(0)} · avg review{" "}
            {g.outcomeTrace.avgReview.toFixed(1)}.
          </li>
        )}
        {bd && (
          <li>
            Pipeline: concept {(bd.conceptFit ?? 0).toFixed(2)} · focus{" "}
            {(bd.focusAlignment ?? 0).toFixed(2)} · polish {(bd.polish ?? 0).toFixed(2)}.
          </li>
        )}
      </ul>
      {insights.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-bold uppercase text-subtle">Knowledge gained</h4>
          <ul className="mt-2 space-y-2">
            {insights.map((e) => (
              <li
                key={e.key}
                className="rounded border border-research/30 bg-research/5 px-3 py-2 text-sm"
              >
                <div className="font-semibold">{e.label}</div>
                <div className="text-xs text-muted">{e.detail}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ScoringPipelineFlow />
      <Button className="mt-4 w-full" onClick={() => setModal(null)}>
        Done
      </Button>
    </Modal>
  );
}

function PauseMenu() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  const saveGame = useGame((s) => s.saveGame);
  const returnToMenu = useGame((s) => s.returnToMenu);
  const dirty = useGame((s) => s.dirty);
  const setSpeed = useGame((s) => s.setSpeed);

  return (
    <Modal open={modal === "pauseMenu"} onClose={() => setModal(null)} title="Paused">
      <div className="space-y-2">
        <Button
          className="w-full"
          onClick={() => {
            setModal(null);
            setSpeed(1);
          }}
        >
          Resume Game
        </Button>
        <Button
          className="w-full"
          variant="secondary"
          onClick={() => {
            saveGame();
          }}
        >
          Save Game
        </Button>
        <Button className="w-full" variant="secondary" onClick={() => setModal("cheats")}>
          Cheats
        </Button>
        <Button className="w-full" variant="secondary" onClick={() => setModal("loopGuide")}>
          How the loop works
        </Button>
        <Button
          className="w-full"
          variant="secondary"
          onClick={() => {
            if (dirty) setModal("confirmMenu");
            else returnToMenu();
          }}
        >
          Return to Main Menu
        </Button>
        <Button
          className="w-full"
          variant="danger"
          onClick={() => {
            if (confirm("Quit campaign? Progress will be saved first.")) {
              saveGame();
              returnToMenu();
            }
          }}
        >
          Quit Campaign
        </Button>
      </div>
    </Modal>
  );
}

function ConfirmMenuModal() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  const saveGame = useGame((s) => s.saveGame);
  const returnToMenu = useGame((s) => s.returnToMenu);
  return (
    <Modal
      open={modal === "confirmMenu"}
      onClose={() => setModal("pauseMenu")}
      title="Unsaved changes"
    >
      <p className="mb-4 text-sm text-muted">Save before returning to the main menu?</p>
      <div className="space-y-2">
        <Button
          className="w-full"
          onClick={() => {
            saveGame();
            returnToMenu();
          }}
        >
          Save & Return
        </Button>
        <Button className="w-full" variant="secondary" onClick={() => returnToMenu()}>
          Return without saving
        </Button>
        <Button className="w-full" variant="ghost" onClick={() => setModal("pauseMenu")}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}

function CheatsModal() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  const applyCheat = useGame((s) => s.applyCheat);
  return (
    <Modal open={modal === "cheats"} onClose={() => setModal(null)} title="Cheats">
      <p className="mb-3 text-xs text-muted">Dev helpers for the garage slice — use sparingly.</p>
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["cash", "Cash +100k"],
            ["fans", "Fans +10k"],
            ["rp", "RP +50"],
            ["bugs", "Clear bugs"],
            ["energy", "Full energy"],
            ["finish_research", "Finish research"],
            ["unlock_all", "Unlock all"],
            ["no_bankruptcy", "No bankruptcy"],
          ] as const
        ).map(([id, label]) => (
          <Button key={id} size="sm" variant="secondary" onClick={() => applyCheat(id)}>
            {label}
          </Button>
        ))}
      </div>
      <Button className="mt-4 w-full" onClick={() => setModal(null)}>
        Close
      </Button>
    </Modal>
  );
}

function EventModal() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  const event = useGame((s) => s.pendingEvent);
  if (!event) return null;
  return (
    <Modal open={modal === "event"} onClose={() => setModal(null)} title={event.title}>
      <p className="text-sm text-muted">{event.body}</p>
      <div className="mt-4 space-y-2">
        {(event.choices ?? [{ label: "OK", effect: "none" }]).map((c) => (
          <Button key={c.label} className="w-full" variant="secondary" onClick={() => setModal(null)}>
            {c.label}
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
    <Modal open={modal === "loopGuide"} onClose={() => setModal(null)} title="How the loop works" wide>
      <p className="mb-3 text-sm text-muted">
        One complete garage path: plan → three player-confirmed stages → polish → pre-release →
        release or cancel → reviews → weekly sales → report → knowledge.
      </p>
      <GarageLoopFlowchart />
      <div className="mt-4">
        <ScoringPipelineFlow />
      </div>
      <Button className="mt-4 w-full" onClick={() => setModal(null)}>
        Got it
      </Button>
    </Modal>
  );
}
