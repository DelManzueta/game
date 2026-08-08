import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Search, X } from "lucide-react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";

export function cnJoin(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const buttonBase =
  "inline-flex shrink-0 items-center justify-center gap-2 font-semibold tracking-tight transition-[background-color,color,border-color,box-shadow,transform] duration-[var(--motion-fast)] active:translate-y-px disabled:pointer-events-none disabled:opacity-40";

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
      "border border-[rgba(180,255,255,0.55)] bg-gradient-to-b from-[#3de8ff] to-[#14a8c8] text-[#042028] shadow-[0_0_14px_rgba(60,220,240,0.35)] hover:brightness-110",
    secondary:
      "border border-[rgba(100,220,230,0.4)] bg-[rgba(12,40,52,0.62)] text-[#e8fbff] shadow-[0_0_12px_rgba(40,200,220,0.2)] backdrop-blur-md hover:border-[rgba(120,245,255,0.7)]",
    ghost:
      "border border-transparent bg-transparent text-[rgba(200,235,240,0.88)] hover:bg-[rgba(20,55,68,0.45)] hover:text-white",
    danger:
      "border border-[rgba(255,160,120,0.5)] bg-gradient-to-r from-[#ff3d4a] to-[#ff8a3a] text-white shadow-[0_0_12px_rgba(255,80,60,0.35)] hover:brightness-110",
    accent:
      "border border-[rgba(180,255,255,0.55)] bg-gradient-to-b from-[#3de8ff] to-[#14a8c8] text-[#042028] shadow-[0_0_14px_rgba(60,220,240,0.35)] hover:brightness-110",
  };
  const sizes = {
    sm: "h-[var(--control-sm)] rounded-full px-3 text-sm",
    md: "h-[var(--control-md)] rounded-full px-4 text-sm",
    lg: "h-[var(--control-lg)] rounded-full px-6 text-base",
  };
  return (
    <button
      className={cnJoin(buttonBase, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

export function IconButton({
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cnJoin(
        buttonBase,
        "h-[var(--control-md)] w-[var(--control-md)] rounded-lg border border-transparent bg-transparent p-0 text-text-secondary hover:bg-surface-sunken hover:text-text-primary",
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cnJoin(
        "h-[var(--control-md)] w-full rounded-xl border border-border bg-surface-raised px-3.5 text-text-primary outline-none transition-[border-color,box-shadow] duration-[var(--motion-fast)] placeholder:text-text-tertiary focus:border-focus focus:ring-2 focus:ring-focus/20",
        className,
      )}
      {...props}
    />
  );
}

export function SearchField({
  className,
  inputClassName,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { inputClassName?: string }) {
  return (
    <label className={cnJoin("glass-search", className)}>
      <Search
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-[rgba(200,235,240,0.75)]"
      />
      <input
        type="search"
        className={cnJoin(
          "min-w-0 flex-1 bg-transparent text-[0.9rem] text-[#e8fbff] outline-none placeholder:text-[rgba(200,235,240,0.55)]",
          inputClassName,
        )}
        {...props}
      />
    </label>
  );
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cnJoin(
        "rounded-[var(--radius-lg)] border border-border bg-surface-base shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out data-[state=open]:fade-in" />
        <DialogPrimitive.Content
          className={cnJoin(
            "glass-modal-shell fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
            wide ? "sm:max-w-3xl" : "sm:max-w-lg",
          )}
        >
          <header className="relative px-12 pb-2 pt-4 text-center">
            <DialogPrimitive.Title className="glass-modal-shell__title text-base tracking-[0.18em] sm:text-lg">
              {title}
            </DialogPrimitive.Title>
            <div className="glass-modal-shell__rule" />
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-sm text-[var(--glass-muted)]">
                {description}
              </DialogPrimitive.Description>
            ) : null}
            <DialogPrimitive.Close asChild>
              <IconButton label="Close" className="glass-btn glass-btn--icon absolute right-3 top-3 text-[var(--glass-text)]">
                <X aria-hidden="true" className="h-5 w-5" />
              </IconButton>
            </DialogPrimitive.Close>
          </header>
          <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 text-[var(--glass-text)]">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
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
    neutral: "border-border bg-surface-sunken text-text-secondary",
    good: "border-good/25 bg-good/15 text-good",
    warn: "border-warn/25 bg-warn/15 text-warn",
    bad: "border-bad/25 bg-bad/15 text-bad",
    accent: "border-action/30 bg-action/15 text-action-pressed",
    tech: "border-tech/25 bg-tech/15 text-tech",
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

export function Progress({
  value,
  label,
  className,
  tone = "action",
}: {
  value: number;
  label: string;
  className?: string;
  tone?: "action" | "design" | "tech" | "bugs" | "research" | "sales";
}) {
  const bounded = Math.max(0, Math.min(100, value));
  return (
    <div className={cnJoin("glass-progress", className)}>
      <span className="glass-progress__label">{label}</span>
      <div
        className="glass-progress__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={bounded}
      >
        <div
          className={cnJoin("glass-progress__fill", `glass-progress__fill--${tone}`)}
          style={{ width: `${bounded}%` }}
        />
      </div>
      <span className="glass-progress__pct">{bounded}%</span>
    </div>
  );
}
