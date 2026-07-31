import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function cnJoin(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "accent";
  size?: "sm" | "md" | "lg";
}) {
  const variants = {
    primary: "bg-accent text-accent-fg hover:opacity-90 disabled:opacity-40",
    secondary:
      "bg-surface text-fg border border-border hover:bg-elevated disabled:opacity-40",
    ghost: "bg-transparent text-muted hover:text-fg hover:bg-elevated disabled:opacity-40",
    danger: "bg-bad/10 text-bad border border-bad/30 hover:bg-bad/20",
    accent: "bg-accent text-accent-fg hover:opacity-90 disabled:opacity-40",
  };
  const sizes = {
    sm: "h-9 px-3 text-sm rounded-[var(--radius-sm)]",
    md: "h-10 px-4 text-sm rounded-[var(--radius-md)]",
    lg: "h-11 px-5 text-base rounded-[var(--radius-md)]",
  };
  return (
    <button
      className={cnJoin(
        "inline-flex items-center justify-center gap-2 font-semibold transition-opacity duration-150 active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cnJoin(
        "h-10 w-full rounded-[var(--radius-md)] border border-border bg-elevated px-3 text-fg outline-none placeholder:text-subtle focus:border-accent",
        className,
      )}
      {...props}
    />
  );
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cnJoin("surface", className)}>{children}</div>;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-fg/25"
        aria-label="Dismiss overlay"
        onClick={onClose}
      />
      <div
        className={cnJoin(
          "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-card)] sm:rounded-[var(--radius-xl)]",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
        role="dialog"
        aria-modal
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-border bg-elevated px-4 py-3 sm:px-5">
          <h2 className="text-base font-bold tracking-tight sm:text-lg">{title}</h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="scrollbar-thin overflow-y-auto p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "accent";
}) {
  const tones = {
    neutral: "bg-panel text-muted border-border",
    good: "bg-good/15 text-good border-good/30",
    warn: "bg-warn/15 text-warn border-warn/30",
    bad: "bg-bad/15 text-bad border-bad/30",
    accent: "bg-accent/15 text-accent border-accent/30",
  };
  return (
    <span
      className={cnJoin(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-subtle">{label}</div>
      <div className={cnJoin("truncate text-sm font-bold tabular", tone)}>{value}</div>
    </div>
  );
}

export { cn };
