/**
 * Studio Empire — presentation root.
 * Simulation stays in useGame. This file only mounts the shell and overlays.
 */
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { getMenuArt } from "@/lib/game/content/art";
import { formatCash } from "@/lib/game/simulation";
import { hasSave, useGame } from "@/lib/game/store";
import type { DifficultyPreset } from "@/lib/game/research";
import { Button, Input, cnJoin } from "@/components/ui/primitives";
import { StudioShell } from "@/components/game/shell/StudioShell";
import {
  CheatsModal,
  ConfirmMenuModal,
  EventModal,
  LoopGuideModal,
  NewGameModal,
  NotificationsInbox,
  OfficeOfferModal,
  PauseMenu,
  ReportModal,
  ReviewsModal,
} from "@/components/game/overlays/GameOverlays";

export function GameApp() {
  const phase = useGame((s) => s.phase);
  const speed = useGame((s) => s.speed);

  useEffect(() => {
    if (phase !== "playing" || speed === 0) return;
    const ms = speed === 1 ? 1100 : speed === 2 ? 520 : 260;
    const id = window.setInterval(() => useGame.getState().tick(), ms);
    return () => window.clearInterval(id);
  }, [phase, speed]);

  if (phase === "menu") return <MainMenu />;
  if (phase === "gameover") return <GameOverScreen />;
  return (
    <>
      <StudioShell />
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
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={getMenuArt()}
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
          <details className="rounded-lg border border-border bg-elevated/50 px-3 py-2">
            <summary className="cursor-pointer text-center text-xs font-bold uppercase tracking-wide text-muted">
              Options
            </summary>
            <label className="mt-2 flex items-center justify-center gap-2 text-sm text-fg">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--color-accent)]"
                checked={pirate}
                onChange={(e) => setPirate(e.target.checked)}
              />
              Pirate mode (harder sales)
            </label>
            <div className="mt-3">
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
            </div>
          </details>
          {err && <p className="text-center text-sm text-bad">{err}</p>}
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              if (!name.trim()) {
                setErr("Name your studio.");
                return;
              }
              if (has) {
                const ok = window.confirm(
                  "A saved campaign already exists. Start a new campaign and overwrite it?",
                );
                if (!ok) return;
              }
              newGame(name, pirate, difficulty);
              useGame.getState().setSpeed(0);
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
                  if (!window.confirm("Delete the browser save permanently?")) return;
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
