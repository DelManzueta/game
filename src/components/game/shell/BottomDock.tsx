import { GameIcon, type GameIconName } from "@/components/ui/GameIcon";
import { isGaragePhaseOne } from "@/lib/game/phaseOne";
import { useGame } from "@/lib/game/store";
import type { ScreenId } from "@/lib/game/types";

const ITEMS: { id: ScreenId; label: string; icon: GameIconName }[] = [
  { id: "studio", label: "Studio", icon: "office" },
  { id: "games", label: "Games", icon: "star" },
  { id: "research", label: "Research", icon: "research" },
  { id: "market", label: "Market", icon: "trend-up" },
  { id: "platforms", label: "Systems", icon: "platform" },
  { id: "settings", label: "More", icon: "settings" },
];

export function BottomDock() {
  const screen = useGame((s) => s.screen);
  const setScreen = useGame((s) => s.setScreen);
  const office = useGame((s) => s.office);
  const gamesPublished = useGame((s) => s.gamesPublished);
  const garage = isGaragePhaseOne({ office });

  return (
    <nav className="se-dock" aria-label="Studio navigation">
      {ITEMS.map(({ id, label, icon }) => {
        if (id === "games" && gamesPublished === 0) return null;
        const locked = garage && (id === "platforms" || id === "market");
        const active = screen === id || (id === "studio" && screen === "develop");
        const visibleLabel = id === "studio" && garage ? "Garage" : label;
        return (
          <button
            key={id}
            type="button"
            data-active={active}
            data-locked={locked || undefined}
            title={locked ? "Opens the room — late tools stay locked in the garage." : visibleLabel}
            onClick={() => setScreen(id === "studio" ? "studio" : id)}
          >
            <GameIcon name={icon} variant="dark" size={17} />
            <span className="truncate">{visibleLabel}</span>
          </button>
        );
      })}
    </nav>
  );
}
