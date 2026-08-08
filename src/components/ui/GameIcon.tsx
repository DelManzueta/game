/**
 * Studio Empire custom icon set — sliced from the warm-industrial UI sheets.
 * Prefer these over Lucide for chrome so the game has one consistent mark language.
 */
import type { ImgHTMLAttributes } from "react";
import { cnJoin } from "@/components/ui/primitives";

export const GAME_ICON_NAMES = [
  "close",
  "search",
  "cash",
  "fans",
  "calendar",
  "clock",
  "play",
  "pause",
  "bug",
  "research",
  "office",
  "platform",
  "engine",
  "staff",
  "save",
  "load",
  "settings",
  "cheat",
  "chevron-up",
  "chevron-down",
  "chevron-left",
  "chevron-right",
  "check",
  "alert",
  "plus",
  "minus",
  "star",
  "trend-up",
  "trend-down",
] as const;

export type GameIconName = (typeof GAME_ICON_NAMES)[number];

const BASE = "/art/ui/icons";

export function gameIconSrc(name: GameIconName, variant: "outline" | "dark" = "outline"): string {
  if (variant === "dark") {
    return `${BASE}/dark-${name}.png`;
  }
  return `${BASE}/${name}.png`;
}

type GameIconProps = {
  name: GameIconName;
  /** outline = dark teal on cream; dark = light marks on deep panels */
  variant?: "outline" | "dark";
  size?: number | "sm" | "md" | "lg";
  className?: string;
  label?: string;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "width" | "height">;

const SIZE_PX = { sm: 16, md: 20, lg: 24 } as const;

export function GameIcon({
  name,
  variant = "outline",
  size = "md",
  className,
  label,
  ...rest
}: GameIconProps) {
  const px = typeof size === "number" ? size : SIZE_PX[size];
  return (
    <img
      src={gameIconSrc(name, variant)}
      alt={label ?? ""}
      width={px}
      height={px}
      draggable={false}
      aria-hidden={label ? undefined : true}
      className={cnJoin("inline-block shrink-0 object-contain", className)}
      style={{ width: px, height: px }}
      {...rest}
    />
  );
}
