import { Bell, FastForward, Pause, Play } from "lucide-react";
import { GameIcon } from "@/components/ui/GameIcon";
import { cnJoin } from "@/components/ui/primitives";
import { isGaragePhaseOne } from "@/lib/game/phaseOne";
import { PROGRESSION_STAGES, normalizeOfficeLevel } from "@/lib/game/progressionStages";
import { formatCash, formatFans } from "@/lib/game/simulation";
import { useGame } from "@/lib/game/store";
import { calendarHudLabel, projectPhaseLabel } from "@/lib/game/viewModels";

export function TopHUD({ forcePause }: { forcePause: boolean }) {
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
  const office = useGame((s) => s.office);
  const unread = useGame((s) => s.notifications.filter((n) => !n.read).length);
  const phase = projectPhaseLabel(project);
  const rent = PROGRESSION_STAGES[normalizeOfficeLevel(office)].rent;
  const rentDue = week >= 4 && isGaragePhaseOne({ office });

  return (
    <header className="se-top">
      <button
        type="button"
        className="se-top-brand"
        onClick={() => {
          saveGame();
          setModal("pauseMenu");
        }}
        aria-label="Menu"
      >
        <span className="se-top-name">{company || "Studio"}</span>
        <span className="se-top-date">
          <GameIcon name="calendar" variant="dark" size={12} />
          {calendarHudLabel({ year, month, week })}
        </span>
      </button>

      <div className="se-speed" role="group" aria-label="Game speed">
        {(
          [
            [0, Pause, "Pause"],
            [1, Play, "Play"],
            [2, FastForward, "Fast"],
          ] as const
        ).map(([s, Icon, label]) => (
          <button
            key={s}
            type="button"
            title={label}
            aria-label={label}
            data-active={speed === s}
            disabled={forcePause && s !== 0}
            onClick={() => setSpeed(s as 0 | 1 | 2 | 4)}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </button>
        ))}
      </div>

      <div className="se-top-vitals">
        <span className={cnJoin("se-vital", cash < 0 && "is-danger")}>{formatCash(cash)}</span>
        <span className="se-vital se-vital-fans">{formatFans(fans)} Fans</span>
        <span className="se-vital se-vital-rp">{Math.floor(rp)} RP</span>
        {rentDue && <span className="se-vital is-warn">Rent {formatCash(rent)}</span>}
        <button
          type="button"
          className="se-bell"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          onClick={() => setModal("notifications")}
        >
          <Bell className="h-3.5 w-3.5" />
          {unread > 0 && <em>{unread > 9 ? "9+" : unread}</em>}
        </button>
      </div>

      {forcePause && project && (
        <div className="se-decision-strip">Decision needed — {phase.hint}</div>
      )}
    </header>
  );
}
