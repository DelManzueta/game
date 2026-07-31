import { useState } from "react";
import { GarageDashboard } from "./GarageDashboard";
import { DevelopmentScreen } from "./DevelopmentScreen";
import { SmallStudioDashboard } from "./SmallStudioDashboard";
import { ResearchScreen } from "./ResearchScreen";
import { MarketScreen } from "./MarketScreen";
import { cnJoin } from "./shared";

const SCREENS = [
  { id: "garage", label: "1 · Garage", Comp: GarageDashboard },
  { id: "dev", label: "2 · Develop", Comp: DevelopmentScreen },
  { id: "studio", label: "3 · Small studio", Comp: SmallStudioDashboard },
  { id: "research", label: "4 · Research", Comp: ResearchScreen },
  { id: "market", label: "5 · Market", Comp: MarketScreen },
] as const;

/**
 * Visual-approval gallery for the premium 2D design system.
 * Not wired to simulation — realistic mock data only.
 */
export function MockupGallery() {
  const [id, setId] = useState<(typeof SCREENS)[number]["id"]>("garage");
  const screen = SCREENS.find((s) => s.id === id) ?? SCREENS[0];
  const Comp = screen.Comp;

  return (
    <div className="relative min-h-[100dvh] bg-bg">
      <div className="sticky top-0 z-[60] flex flex-wrap items-center gap-2 border-b border-border bg-bg-deep/95 px-3 py-2 backdrop-blur-md">
        <div className="mr-2 text-xs font-bold uppercase tracking-[0.12em] text-accent">
          UI approval
        </div>
        {SCREENS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setId(s.id)}
            className={cnJoin(
              "rounded-full px-3 py-1.5 text-xs font-semibold",
              s.id === id
                ? "bg-accent text-accent-fg"
                : "border border-border bg-surface text-muted hover:text-fg",
            )}
          >
            {s.label}
          </button>
        ))}
        <span className="ml-auto hidden text-[11px] text-subtle sm:inline">
          Mock data · design tokens only · sim unchanged
        </span>
      </div>
      <Comp />
    </div>
  );
}
