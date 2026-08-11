import type { GridHighlight, MemoryItem, TraceStep } from "../types/trace";
import { cn } from "../lib/cn";
import { RecursionTree } from "./RecursionTree";

/** Big array view used when the step highlights array memory (e.g. binary search). */
function ArrayStage({ item }: { item: MemoryItem }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-sm font-semibold text-ink-300">
          {item.label}
        </span>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {item.value.map((cell, i) => {
          const hl = item.highlights.find((h) => "index" in h && h.index === i);
          const role = hl?.role;
          return (
            <div key={i} className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-lg border-2 font-mono text-lg transition-all",
                  role === "mid" &&
                    "border-ember-400 bg-ember-500/20 text-ember-300 shadow-[0_0_18px_rgba(167,139,250,0.4)] scale-105",
                  role === "swap" &&
                    "border-ember-400 bg-ember-500/20 text-ember-300 shadow-[0_0_18px_rgba(167,139,250,0.4)] scale-105",
                  role === "reading" && "border-arc-500 bg-arc-500/15 text-arc-300",
                  role === "compare" && "border-arc-500 bg-arc-500/15 text-arc-300",
                  role === "max" &&
                    "border-verdant-400 bg-verdant-500/15 text-verdant-300 shadow-[0_0_14px_rgba(16,185,129,0.35)]",
                  role === "sorted" &&
                    "border-verdant-500/50 bg-verdant-500/10 text-verdant-300/80",
                  role === "key" &&
                    "border-ember-400 border-dashed bg-ember-500/10 text-ember-200",
                  (!role || role === "none") &&
                    "border-ink-600 bg-ink-800 text-ink-200",
                )}
              >
                {String(cell)}
              </div>
              <span className="mt-1 font-mono text-[10px] text-ink-500">{i}</span>
            </div>
          );
        })}
      </div>
      {item.highlights.length > 0 && (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-ink-400">
          {[
            ...new Set(item.highlights.map((h) => h.role)),
          ]
            .filter((r) => r && r !== "none")
            .map((r) => (
              <span key={r}>
                <span
                  className={cn(
                    "mr-1 inline-block h-2 w-2 rounded-full",
                    r === "mid" || r === "swap" || r === "key"
                      ? "bg-ember-400"
                      : r === "max" || r === "sorted"
                        ? "bg-verdant-400"
                        : "bg-arc-400",
                  )}
                />
                {r}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

const GRID_ROLE_CLASS: Record<string, string> = {
  start: "border-verdant-300 bg-verdant-400/40 text-verdant-100",
  goal: "border-ember-300 bg-ember-400/40 text-ember-100",
  wall: "border-ink-600 bg-ink-700 text-ink-500",
  current:
    "border-ember-300 bg-ember-400/70 text-ink-950 shadow-[0_0_20px_rgba(167,139,250,0.7)] scale-110",
  frontier: "border-arc-300 bg-arc-400/50 text-ink-950",
  visited: "border-arc-500/40 bg-arc-500/20 text-arc-200",
  path: "border-verdant-300 bg-verdant-400/50 text-ink-950",
};

/** 2D grid view for BFS/DFS steps. */
function GridStage({ item }: { item: MemoryItem }) {
  const rows = item.value as unknown[][];
  const highlightAt = (r: number, c: number): GridHighlight | undefined =>
    item.highlights.find(
      (h) => "row" in h && h.row === r && h.col === c,
    ) as GridHighlight | undefined;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-sm font-semibold text-ink-300">
          {item.label}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-ink-500">
          grid search
        </span>
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((row, r) => (
          <div key={r} className="flex gap-1">
            {row.map((cell, c) => {
              const hl = highlightAt(r, c);
              const role = hl?.role ?? (cell === 1 ? "wall" : "empty");
              return (
                <div
                  key={c}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-md border text-xs font-bold transition-all",
                    GRID_ROLE_CLASS[role] ??
                      "border-ink-700 bg-ink-850 text-ink-600",
                  )}
                >
                  {role === "start" ? "S" : role === "goal" ? "G" : ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-ink-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-verdant-400" /> start
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-ember-400" /> goal
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-arc-400" /> visited / frontier
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-ink-700" /> wall
        </span>
      </div>
    </div>
  );
}

/** Default forge stage: semantic action badge + description + variable chips. */
function ForgeStage({ step }: { step: TraceStep }) {
  const entries = Object.entries(step.variables ?? {});
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span
          className={cn(
            "rounded-full px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider ring-1",
            "bg-ember-500/15 text-ember-300 ring-ember-500/40",
          )}
        >
          {step.event.replaceAll("_", " ")}
        </span>
        {step.actions?.map((a, i) => (
          <span
            key={i}
            className="rounded-full bg-ink-800 px-2.5 py-1 font-mono text-[11px] text-arc-300 ring-1 ring-ink-600"
          >
            {a.type}
          </span>
        ))}
      </div>
      <p className="max-w-md text-sm leading-relaxed text-ink-100">
        {step.description}
      </p>
      {entries.length > 0 && (
        <div className="flex max-w-lg flex-wrap justify-center gap-2">
          {entries.map(([name, value]) => (
            <span
              key={name}
              className="rounded border border-ink-700 bg-ink-800 px-2 py-1 font-mono text-xs"
            >
              <span className="text-ink-500">{name} = </span>
              <span className="text-ink-100">{String(value)}</span>
            </span>
          ))}
        </div>
      )}
      <p className="text-[10px] uppercase tracking-widest text-ink-600">
        CodeAnvil forge stage
      </p>
    </div>
  );
}

export function VisualStage({
  step,
  steps,
  onScrub,
}: {
  step: TraceStep;
  steps: TraceStep[];
  onScrub: (index: number) => void;
}) {
  const visual = step.visual;

  if (visual?.type === "recursion_tree") {
    return (
      <RecursionTree
        nodes={visual.nodes}
        edges={visual.edges}
        activeNodeId={visual.activeNodeId}
        steps={steps}
        onScrub={onScrub}
      />
    );
  }

  if (visual?.type === "array") {
    const item = step.memory?.find((m) => m.id === visual.itemId);
    if (item) return <ArrayStage item={item} />;
  }

  if (visual?.type === "grid") {
    const item = step.memory?.find((m) => m.id === visual.itemId);
    if (item) return <GridStage item={item} />;
  }

  return <ForgeStage step={step} />;
}
