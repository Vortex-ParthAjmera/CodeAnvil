import type { TraceStep } from "../../types/trace";

/**
 * Compact progress bar + step counter for 3D stage overlays.
 * Shows "step 3 / 12" with a thin bar that fills as playback advances.
 */
export function StageProgressBar({
  step,
  steps,
}: {
  step: TraceStep;
  steps?: TraceStep[];
}) {
  if (!steps || steps.length === 0) return null;
  const total = steps.length;
  const current = Math.min(step.index + 1, total);
  const pct = total <= 1 ? 100 : Math.round((step.index / (total - 1)) * 100);

  return (
    <div className="pointer-events-none absolute bottom-14 left-3 z-10 flex items-center gap-2 sm:bottom-16 sm:left-4">
      <div className="h-1 w-20 overflow-hidden rounded-full bg-ink-700/70 sm:w-28">
        <div
          className="h-full rounded-full bg-ember-400 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[9px] font-bold text-ink-400">
        {current} / {total}
      </span>
    </div>
  );
}
