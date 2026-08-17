import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { GridHighlight, MemoryItem, TraceStep } from "../types/trace";
import { cn } from "../lib/cn";
import { RecursionTree } from "./RecursionTree";
import { selectRendererForStep } from "../engine/traceActions";

/* Strong ease-out — the shared motion language (animate skill: ease-out for
   entrances, never ease-in; UI motion stays under ~300ms). */
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

function cellRoleClass(role: string | undefined): string {
  return cn(
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
    (!role || role === "none") && "border-ink-600 bg-ink-800 text-ink-200",
  );
}

/** Big array view used when the step highlights array memory (e.g. binary search).
 *
 * Motion model (one idea per step, nothing decorative):
 * - cells glide to new slots via layout animation when the array resizes (merge),
 * - fresh cells pop in / leave with a quick scale-fade (AnimatePresence),
 * - a value that changes pops in place so the eye lands exactly on the write. */
function ArrayStage({ item }: { item: MemoryItem }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-sm font-semibold text-ink-300">
          {item.label}
        </span>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <AnimatePresence mode="popLayout">
          {item.value.map((cell, i) => {
            const hl = item.highlights.find((h) => "index" in h && h.index === i);
            const role = hl?.role;
            return (
              <motion.div
                key={`cell-${i}`}
                layout={reduce ? false : "position"}
                variants={{
                  hidden: { opacity: 0, scale: 0.7, y: 12 },
                  show: {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    transition: {
                      type: "spring",
                      stiffness: 480,
                      damping: 34,
                      delay: Math.min(i, 8) * 0.035,
                    },
                  },
                }}
                initial={reduce ? false : "hidden"}
                animate="show"
                exit={
                  reduce
                    ? undefined
                    : { opacity: 0, scale: 0.7, transition: { duration: 0.12 } }
                }
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
                className="flex flex-col items-center"
              >
                <div className={cellRoleClass(role)}>
                  <motion.span
                    key={String(cell)}
                    initial={reduce ? false : { scale: 0.45, opacity: 0.3 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 620,
                      damping: 26,
                    }}
                  >
                    {String(cell)}
                  </motion.span>
                </div>
                <span className="mt-1 font-mono text-[10px] text-ink-500">
                  {i}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {item.highlights.length > 0 && (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-ink-400">
          {[...new Set(item.highlights.map((h) => h.role))]
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

/** 2D grid view for BFS/DFS steps.
 *
 * Cells are keyed by their role, so a cell that becomes current/frontier/
 * visited/path re-mounts and "ignites" in place — the BFS wave visibly ripples
 * across the board instead of teleporting. */
function GridStage({ item }: { item: MemoryItem }) {
  const reduce = useReducedMotion();
  const rows = item.value as unknown[][];
  const highlightAt = (r: number, c: number): GridHighlight | undefined =>
    item.highlights.find(
      (h) => "row" in h && h.row === r && h.col === c,
    ) as GridHighlight | undefined;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: EASE_OUT }}
        className="flex items-baseline gap-2"
      >
        <span className="font-mono text-sm font-semibold text-ink-300">
          {item.label}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-ink-500">
          grid search
        </span>
      </motion.div>
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.28, ease: EASE_OUT }}
        className="flex flex-col gap-1"
      >
        {rows.map((row, r) => (
          <div key={r} className="flex gap-1">
            {row.map((cell, c) => {
              const hl = highlightAt(r, c);
              const role = hl?.role ?? (cell === 1 ? "wall" : "empty");
              return (
                <motion.div
                  key={`${r}-${c}-${role}`}
                  initial={reduce ? false : { scale: 1.22, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 560,
                    damping: 30,
                  }}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-md border text-xs font-bold",
                    GRID_ROLE_CLASS[role] ??
                      "border-ink-700 bg-ink-850 text-ink-600",
                  )}
                >
                  {role === "start" ? "S" : role === "goal" ? "G" : ""}
                </motion.div>
              );
            })}
          </div>
        ))}
      </motion.div>
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

/** Default forge stage: semantic action badge + description + variable chips.
 *
 * The step block refreshes on every step (keyed by step.id): a quick rise-fade
 * keeps the explanation continuous while variable chips stagger in, so a
 * multi-assignment step reads as one orchestrated beat. */
function ForgeStage({ step }: { step: TraceStep }) {
  const reduce = useReducedMotion();
  const entries = Object.entries(step.variables ?? {});
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-6 text-center">
      <motion.div
        key={step.id}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: EASE_OUT }}
        className="flex flex-col items-center gap-5"
      >
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
            {entries.map(([name, value], i) => (
              <motion.span
                key={`${name}-${String(value)}`}
                initial={reduce ? false : { opacity: 0, y: 6, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 520,
                  damping: 30,
                  delay: 0.05 + Math.min(i, 6) * 0.03,
                }}
                className="rounded border border-ink-700 bg-ink-800 px-2 py-1 font-mono text-xs"
              >
                <span className="text-ink-500">{name} = </span>
                <span className="text-ink-100">{String(value)}</span>
              </motion.span>
            ))}
          </div>
        )}
      </motion.div>
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
  const dispatch = selectRendererForStep(step);

  if (dispatch.kind === "recursion_tree" && visual?.type === "recursion_tree") {
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

  if (dispatch.kind === "array" && visual?.type === "array") {
    const item = step.memory?.find((m) => m.id === visual.itemId);
    if (item) return <ArrayStage item={item} />;
  }

  if (dispatch.kind === "grid" && visual?.type === "grid") {
    const item = step.memory?.find((m) => m.id === visual.itemId);
    if (item) return <GridStage item={item} />;
  }

  return <ForgeStage step={step} />;
}
