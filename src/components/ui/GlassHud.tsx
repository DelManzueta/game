import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cnJoin } from "@/components/ui/primitives";
import { GameIcon, type GameIconName } from "@/components/ui/GameIcon";
import { UI_FRAMES } from "@/lib/game/content/uiFrames";

export function GlassChip({
  children,
  tone = "default",
  className,
  hot,
}: {
  children: ReactNode;
  tone?: "default" | "cash" | "fans" | "hype" | "date";
  className?: string;
  hot?: boolean;
}) {
  return (
    <span
      className={cnJoin(
        "glass-chip",
        tone === "cash" && "glass-chip--cash",
        tone === "fans" && "glass-chip--fans",
        tone === "hype" && "glass-chip--hype",
        tone === "date" && "glass-chip--date",
        hot && "glass-chip--hot",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function GlassProgress({
  label,
  value,
  max = 100,
  tone = "action",
  icon,
  className,
}: {
  label: string;
  value: number;
  max?: number;
  tone?: "action" | "design" | "tech" | "bugs" | "research" | "sales";
  icon?: GameIconName;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round((value / Math.max(1, max)) * 100)));
  return (
    <div className={cnJoin("glass-progress", className)}>
      <span className="glass-progress__label inline-flex items-center gap-1">
        {icon && <GameIcon name={icon} size={12} className="opacity-90" />}
        {label}
      </span>
      <div className="glass-progress__track" aria-hidden>
        <div
          className={cnJoin("glass-progress__fill", `glass-progress__fill--${tone}`)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="glass-progress__pct">{pct}%</span>
    </div>
  );
}

export function GlassBtn({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "icon";
}) {
  return (
    <button
      type="button"
      className={cnJoin(
        "glass-btn",
        variant === "primary" && "glass-btn--primary",
        variant === "danger" && "glass-btn--danger",
        variant === "ghost" && "glass-btn--ghost",
        variant === "icon" && "glass-btn--icon",
        className,
      )}
      {...props}
    />
  );
}

export function GlassSpeedBar({
  speed,
  onSpeed,
  forcePause,
}: {
  speed: number;
  onSpeed: (s: 0 | 1 | 2 | 4) => void;
  forcePause?: boolean;
}) {
  const items: { s: 0 | 1 | 2 | 4; label: string; icon: GameIconName | "ff" }[] = [
    { s: 0, label: "Pause", icon: "pause" },
    { s: 1, label: "Play", icon: "play" },
    { s: 2, label: "Fast", icon: "ff" },
    { s: 4, label: "Max", icon: "ff" },
  ];
  return (
    <div className="glass-speed" role="group" aria-label="Game speed">
      {items.map((it) => (
        <button
          key={it.s}
          type="button"
          className="glass-speed__btn"
          data-active={speed === it.s}
          disabled={forcePause && it.s !== 0}
          aria-label={it.label}
          title={it.label}
          onClick={() => onSpeed(it.s)}
        >
          {it.icon === "ff" ? (
            <span className="text-[11px] leading-none" aria-hidden>
              ≫
            </span>
          ) : (
            <GameIcon name={it.icon} size={13} />
          )}
          <span>{it.label}</span>
        </button>
      ))}
    </div>
  );
}

export function GlassSearch({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cnJoin("glass-search", className)}>
      <GameIcon name="search" size={15} className="opacity-80" />
      <input type="search" {...props} />
    </label>
  );
}

export function GlassModalShell({
  title = "Studio Empire",
  children,
  onClose,
  className,
  wide,
}: {
  title?: string;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cnJoin(
        "glass-modal-shell relative w-full",
        wide ? "max-w-xl" : "max-w-md",
        "px-5 pb-5 pt-4",
        className,
      )}
    >
      {onClose && (
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="glass-btn glass-btn--icon absolute right-3 top-3 text-lg leading-none"
        >
          ×
        </button>
      )}
      <div className="glass-modal-shell__title">{title}</div>
      <div className="glass-modal-shell__rule" />
      {children}
    </div>
  );
}

export function GlassLockedPanel({
  requirement = "Reach the next studio tier to unlock this content.",
  onViewProgress,
}: {
  requirement?: string;
  onViewProgress?: () => void;
}) {
  return (
    <div className="glass-locked">
      <div className="glass-locked__icon" aria-hidden>
        🔒
      </div>
      <div className="text-sm font-extrabold tracking-[0.14em] uppercase">Access locked</div>
      <p className="max-w-xs text-xs leading-relaxed text-[var(--glass-muted)]">{requirement}</p>
      {onViewProgress && (
        <GlassBtn variant="primary" onClick={onViewProgress}>
          View progress
        </GlassBtn>
      )}
    </div>
  );
}

/** Decorative reference art (design kit sheets) — used sparingly in settings/dev. */
export function GlassKitPreview({ which }: { which: keyof typeof UI_FRAMES }) {
  return (
    <img
      src={UI_FRAMES[which]}
      alt=""
      className="w-full rounded-xl border border-[var(--glass-border)] object-cover opacity-90"
      draggable={false}
    />
  );
}
