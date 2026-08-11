import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export function Button({
  children,
  onClick,
  variant = "default",
  disabled,
  title,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "ghost" | "danger";
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-all duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-400",
        "active:scale-[0.97]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        variant === "default" &&
          "border border-ink-700 bg-ink-800 text-ink-100 hover:border-ink-600 hover:bg-ink-700",
        variant === "primary" &&
          "bg-ember-400 text-ink-950 font-semibold hover:bg-ember-300",
        variant === "ghost" && "text-ink-300 hover:bg-ink-800 hover:text-ink-100",
        variant === "danger" &&
          "border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "amber" | "blue" | "green" | "red";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide",
        tone === "neutral" && "bg-ink-800 text-ink-300 ring-1 ring-ink-700",
        tone === "amber" && "bg-ember-500/15 text-ember-300 ring-1 ring-ember-500/30",
        tone === "blue" && "bg-arc-500/15 text-arc-300 ring-1 ring-arc-500/30",
        tone === "green" && "bg-verdant-500/15 text-verdant-300 ring-1 ring-verdant-500/30",
        tone === "red" && "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-ink-700 bg-ink-900 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-ink-700 px-3 py-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-ink-400">
        {children}
      </h3>
      {right}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <div className="text-2xl">🛠️</div>
      <p className="text-sm font-medium text-ink-200">{title}</p>
      {hint && <p className="max-w-xs text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-ink-600 bg-ink-800 px-1.5 py-0.5 font-mono text-[11px] text-ink-300">
      {children}
    </kbd>
  );
}
