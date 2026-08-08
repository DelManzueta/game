import type { ReactNode } from "react";
import { UI_FRAMES } from "@/lib/game/content/uiFrames";
import { cnJoin } from "@/components/ui/primitives";

/** Landscape glass shell for menus / modals. */
export function GlassPanel({
  children,
  className,
  frame = "panel",
}: {
  children: ReactNode;
  className?: string;
  frame?: "panel" | "panelAlt" | "card";
}) {
  const src =
    frame === "panelAlt"
      ? UI_FRAMES.panelLandscapeAlt
      : frame === "card"
        ? UI_FRAMES.panelCard
        : UI_FRAMES.panelLandscape;
  return (
    <div className={cnJoin("relative w-full max-w-lg", className)}>
      <img
        src={src}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full rounded-2xl object-fill drop-shadow-2xl"
        draggable={false}
        aria-hidden
      />
      <div className="relative z-10 px-[10%] py-[12%] sm:px-[11%] sm:py-[13%]">{children}</div>
    </div>
  );
}

/**
 * Save-slot board — art has one frosted content well under "CHOOSE SAVE SLOT".
 * We lay out 3 interactive slots inside that well.
 */
export function SaveSlotBoard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cnJoin("relative w-full max-w-xl", className)}>
      <img
        src={UI_FRAMES.saveSlots}
        alt="Choose save slot"
        className="h-auto w-full select-none drop-shadow-2xl"
        draggable={false}
      />
      {/* Content well under title — approximate inner rect of the art */}
      <div className="absolute inset-[38%_14%_18%_14%] grid grid-cols-3 gap-2 sm:inset-[40%_16%_20%_16%] sm:gap-3">
        {children}
      </div>
    </div>
  );
}

/** Portrait glass shell for narrow layouts. */
export function GlassPortrait({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cnJoin("relative mx-auto w-full max-w-[20rem]", className)}>
      <img
        src={UI_FRAMES.panelPortrait}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-fill drop-shadow-2xl"
        draggable={false}
        aria-hidden
      />
      <div className="relative z-10 px-[12%] py-[14%]">{children}</div>
    </div>
  );
}

/** Thin HUD accent strip (decorative). */
export function HudBarAccent({ className }: { className?: string }) {
  return (
    <img
      src={UI_FRAMES.hudBar}
      alt=""
      className={cnJoin(
        "pointer-events-none h-4 w-full max-w-sm object-contain opacity-95 sm:h-5",
        className,
      )}
      draggable={false}
      aria-hidden
    />
  );
}
