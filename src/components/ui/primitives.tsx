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
    primary:
      "bg-[#e8941a] text-[#1a1208] shadow-[0_3px_0_#c47410] hover:bg-[#f0a030] disabled:opacity-40",
    secondary:
      "bg-[#fffaf2] text-[#2a241c] border border-[#d4c8b4] hover:bg-[#f5ecde] disabled:opacity-40",
    ghost: "bg-transparent text-[#6b6154] hover:text-[#2a241c] hover:bg-[#ece4d6]/80 disabled:opacity-40",
    danger: "bg-[#d94a3a] text-white shadow-[0_3px_0_#b0382c] hover:bg-[#e05545]",
    accent:
      "bg-[#e8941a] text-[#1a1208] shadow-[0_3px_0_#c47410] hover:bg-[#f0a030] disabled:opacity-40",
  };
  const sizes = {
    sm: "min-h-9 h-9 px-3.5 text-sm rounded-lg",
    md: "min-h-10 h-10 px-4 text-sm rounded-lg",
    lg: "min-h-12 h-12 px-6 text-base rounded-xl",
  };
  return (
    <button
      className={cnJoin(
        "inline-flex items-center justify-center gap-2 font-semibold tracking-tight transition-all duration-200 active:scale-[0.98]",
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
        "h-11 w-full rounded-xl border border-border bg-elevated px-3.5 text-fg outline-none placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/25",
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
  return <div className={cnJoin("soft-card rounded-[var(--radius-lg)]", className)}>{children}</div>;
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
        className="absolute inset-0 bg-[#2a241c]/35 backdrop-blur-[2px]"
        aria-label="Dismiss overlay"
        onClick={onClose}
      />
      <div
        className={cnJoin(
          "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-[#d4c8b4] bg-[#fffaf2] text-[#2a241c] shadow-[0_20px_50px_rgba(40,30,15,0.25)] sm:rounded-2xl",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
        role="dialog"
        aria-modal
        aria-label={title}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-center text-xl font-bold tracking-tight text-[#2a241c] sm:text-2xl">
              {title}
            </h2>
            <div className="mx-auto mt-2 h-px w-[88%] bg-[#3a6ea5]/55" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-[#6b6154] hover:bg-[#ece4d6] hover:text-[#2a241c]"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-5 pt-2">{children}</div>
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "accent" | "tech";
  className?: string;
}) {
  const tones = {
    neutral: "bg-panel text-muted border-border",
    good: "bg-good/15 text-good border-good/25",
    warn: "bg-warn/15 text-warn border-warn/25",
    bad: "bg-bad/15 text-bad border-bad/25",
    accent: "bg-accent/15 text-accent border-accent/30",
    tech: "bg-tech/15 text-tech border-tech/25",
  };
  return (
    <span
      className={cnJoin(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
