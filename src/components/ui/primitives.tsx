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
      "border-2 border-action-pressed bg-action text-action-fg shadow-[0_2px_0_var(--color-action-pressed)] hover:bg-action-hover",
    secondary:
      "border-2 border-border-strong bg-paper text-fg shadow-[0_2px_0_var(--color-border-strong)] hover:bg-elevated",
    ghost:
      "border border-transparent bg-transparent text-muted hover:bg-panel hover:text-fg",
    danger:
      "border-2 border-bad bg-bad text-white shadow-[0_2px_0_var(--color-danger-pressed)] hover:bg-danger-hover",
    accent:
      "border-2 border-action-pressed bg-action text-action-fg shadow-[0_2px_0_var(--color-action-pressed)] hover:bg-action-hover",
  };
  const sizes = {
    sm: "h-[var(--control-sm)] rounded-lg px-3 text-sm",
    md: "h-[var(--control-md)] rounded-lg px-4 text-sm",
    lg: "h-[var(--control-lg)] rounded-xl px-6 text-base",
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
    <label
      className={cnJoin(
        "flex h-11 items-center gap-2 rounded-xl border border-border bg-paper px-3 shadow-sm focus-within:border-focus focus-within:ring-2 focus-within:ring-focus/20",
        className,
      )}
    >
      <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
      <input
        type="search"
        className={cnJoin(
          "min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-subtle",
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
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl border-2 border-border-strong bg-paper text-fg shadow-[var(--shadow-soft)] outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
            wide ? "sm:max-w-3xl" : "sm:max-w-lg",
          )}
        >
          <header className="relative border-b border-border px-12 pb-3 pt-4 text-center">
            <DialogPrimitive.Title className="text-lg font-bold tracking-tight text-fg sm:text-xl">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-sm text-muted">
                {description}
              </DialogPrimitive.Description>
            ) : null}
            <DialogPrimitive.Close asChild>
              <IconButton label="Close" className="absolute right-3 top-3 text-muted hover:text-fg">
                <X aria-hidden="true" className="h-5 w-5" />
              </IconButton>
            </DialogPrimitive.Close>
          </header>
          <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 text-fg">
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
  const toneColor =
    tone === "design"
      ? "bg-[var(--color-design)]"
      : tone === "tech"
        ? "bg-[var(--color-tech)]"
        : tone === "bugs"
          ? "bg-[var(--color-bugs)]"
          : tone === "research"
            ? "bg-[var(--color-research)]"
            : tone === "sales"
              ? "bg-[var(--color-cash)]"
              : "bg-accent";
  return (
    <div className={cnJoin("grid grid-cols-[auto_1fr_auto] items-center gap-2", className)}>
      <span className="min-w-[4.2rem] text-[10px] font-bold uppercase tracking-wide text-muted">{label}</span>
      <div
        className="h-2 overflow-hidden rounded-full bg-panel ring-1 ring-border"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={bounded}
      >
        <div
          className={cnJoin("h-full rounded-full transition-all", toneColor)}
          style={{ width: `${bounded}%` }}
        />
      </div>
      <span className="min-w-[2.4rem] text-right text-xs font-bold tabular text-fg">{bounded}%</span>
    </div>
  );
}
