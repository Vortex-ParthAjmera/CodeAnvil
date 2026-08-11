import { cn } from "../lib/cn";
import type { TraceStep } from "../types/trace";

function eventTone(event: string): string {
  if (event === "error") return "bg-rose-400";
  if (
    event === "function_call" ||
    event === "recursion_call" ||
    event === "loop_start"
  )
    return "bg-ember-400";
  if (event === "function_return" || event === "program_end")
    return "bg-verdant-400";
  if (event === "output_write") return "bg-arc-400";
  return "bg-ink-500";
}

export function Timeline({
  steps,
  stepIndex,
  onScrub,
}: {
  steps: TraceStep[];
  stepIndex: number;
  onScrub: (index: number) => void;
}) {
  return (
    <div
      className="flex items-center gap-[3px] overflow-x-auto border-t border-ink-700 bg-ink-900 px-3 py-2"
      role="slider"
      aria-label="Execution timeline"
      aria-valuemin={0}
      aria-valuemax={steps.length - 1}
      aria-valuenow={stepIndex}
    >
      {steps.map((step, i) => {
        const active = i === stepIndex;
        const done = i < stepIndex;
        return (
          <button
            key={step.id}
            type="button"
            title={`${i + 1}. ${step.description}`}
            onClick={() => onScrub(i)}
            className={cn(
              "h-2.5 shrink-0 rounded-full transition-all",
              eventTone(step.event),
              active
                ? "w-6 ring-2 ring-ember-300/70"
                : "w-2.5 hover:w-4 opacity-60 hover:opacity-100",
              done && !active && "opacity-90",
            )}
          />
        );
      })}
    </div>
  );
}
