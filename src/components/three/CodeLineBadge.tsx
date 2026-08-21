import type { TraceStep } from "../../types/trace";

/**
 * Compact code line badge shown inside 3D stage panels so viewers can
 * cross-reference the active source line without looking away from the
 * animation.
 */
export function CodeLineBadge({ step }: { step: TraceStep }) {
  const eventLabel = step.event.replace(/_/g, " ");
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 sm:left-4 sm:top-4">
      <div className="flex items-center gap-1.5 rounded-md border border-ink-700/80 bg-ink-950/80 px-2 py-1 shadow-xl backdrop-blur-md">
        <span className="font-mono text-[9px] font-black uppercase tracking-widest text-ink-500">
          line
        </span>
        <span className="font-mono text-sm font-black text-ember-300">
          {step.line}
        </span>
      </div>
      <div className="rounded-md border border-ink-700/60 bg-ink-950/70 px-2 py-1 shadow-lg backdrop-blur-sm">
        <span className="font-mono text-[10px] font-semibold text-ink-300">
          {eventLabel}
        </span>
      </div>
    </div>
  );
}
