import { Cpu, FlaskConical, Gamepad2, Home, Settings, TrendingUp } from "lucide-react";
import { isGaragePhaseOne } from "@/lib/game/phaseOne";
import { useGame } from "@/lib/game/store";
import type { ScreenId } from "@/lib/game/types";

const ITEMS: { id: ScreenId; label: string; icon: typeof Home; garage?: boolean }[] = [
  { id: "studio", label: "Studio", icon: Home },
  { id: "games", label: "Games", icon: Gamepad2 },
  { id: "research", label: "Research", icon: FlaskConical },
  { id: "market", label: "Market", icon: TrendingUp },
  { id: "platforms", label: "Systems", icon: Cpu },
  { id: "settings", label: "More", icon: Settings },
];

export function BottomDock() {
  const screen = useGame((s) => s.screen);
  const setScreen = useGame((s) => s.setScreen);
  const office = useGame((s) => s.office);
  const gamesPublished = useGame((s) => s.gamesPublished);
  const garage = isGaragePhaseOne({ office });

  return (
    <nav className="se-dock" aria-label="Studio navigation">
      {ITEMS.map(({ id, label, icon: Icon }) => {
        if (id === "games" && gamesPublished === 0) return null;
        const locked = garage && (id === "platforms" || id === "market");
        const active = screen === id || (id === "studio" && screen === "develop");
        return (
          <button
            key={id}
            type="button"
            data-active={active}
            data-locked={locked || undefined}
            title={locked ? "Opens the room — late tools stay locked in the garage." : label}
            onClick={() => setScreen(id === "studio" ? "studio" : id)}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
