import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { GridHighlight, MemoryItem, TraceStep } from "../types/trace";
import { cn } from "../lib/cn";
import {
  buildChipModel,
  deriveRangeEnd,
  findAccumulator,
  findCounter,
  isLoopNarrativeTrace,
  iterationsElapsed,
  parseFormula,
} from "../lib/loopNarrative";
import { RecursionTree } from "./RecursionTree";
import { FormulaChip } from "./FormulaChip";
import { selectRendererForStep } from "../engine/traceActions";

/* Strong ease-out — the shared motion language (animate skill: ease-out for
   entrances, never ease-in; UI motion stays under ~300ms). */
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

function cellRoleClass(role: string | undefined): string {
  return cn(
    "flex h-14 w-14 items-center justify-center rounded-lg border-2 font-mono text-lg transition-[transform,background-color,border-color,box-shadow,color] duration-200 ease-out",
    role === "mid" &&
      "border-ember-400 bg-ember-500/20 text-ember-300 shadow-[0_0_18px_rgba(245,158,11,0.4)] scale-105",
    role === "swap" &&
      "border-ember-400 bg-ember-500/20 text-ember-300 shadow-[0_0_18px_rgba(245,158,11,0.4)] scale-105",
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

/** Detect two-pointer traces by checking for l and r variables. */
function isTwoPointerStep(step?: TraceStep): boolean {
  if (!step?.variables) return false;
  const vars = step.variables;
  return typeof vars.l === "number" && typeof vars.r === "number";
}

/** Big array view used when the step highlights array memory (e.g. binary search).
 *
 * For two-pointer algorithms (palindrome, two-sum), renders animated l/r
 * pointer arrows below the cells with a sum/comparison chip. */
function ArrayStage({ item, step }: { item: MemoryItem; step?: TraceStep }) {
  const reduce = useReducedMotion();
  const vars = step?.variables ?? {};
  const twoPointer = isTwoPointerStep(step);
  const lIdx = typeof vars.l === "number" ? (vars.l as number) : -1;
  const rIdx = typeof vars.r === "number" ? (vars.r as number) : -1;
  const sumVal = typeof vars.sum === "number" ? (vars.sum as number) : null;
  const targetVal = typeof vars.target === "number" ? (vars.target as number) : null;
  const count = item.value.length;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
      {step && (
        <div className="max-w-md rounded-lg border border-ink-700/60 bg-ink-900/80 px-4 py-2.5 text-center shadow-lg backdrop-blur-sm">
          <span className="mr-2 inline-block rounded-full bg-ember-500/15 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-ember-300 ring-1 ring-ember-500/30">
            {step.event.replace(/_/g, " ")}
          </span>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-200">
            {step.description}
          </p>
        </div>
      )}
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-sm font-semibold text-ink-300">
          {item.label}
        </span>
      </div>

      {/* Two-pointer sum/comparison chip */}
      {twoPointer && sumVal !== null && targetVal !== null && (
        <motion.div
          key={`sum-${sumVal}-${targetVal}-${step?.id}`}
          initial={reduce ? false : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="flex items-center gap-2 rounded-lg border border-arc-400/40 bg-arc-500/10 px-3 py-1.5"
        >
          <span className="font-mono text-sm font-bold text-arc-200">
            {lIdx >= 0 && rIdx >= 0 && item.value[lIdx] !== undefined && item.value[rIdx] !== undefined
              ? `${item.value[lIdx]} + ${item.value[rIdx]} = ${sumVal}`
              : `sum = ${sumVal}`}
          </span>
          <span className={cn(
            "font-mono text-xs font-bold",
            sumVal === targetVal ? "text-verdant-300" : sumVal < targetVal ? "text-arc-300" : "text-ember-300",
          )}>
            {sumVal === targetVal ? `= ${targetVal} ✓` : sumVal < targetVal ? `< ${targetVal}` : `> ${targetVal}`}
          </span>
        </motion.div>
      )}

      {/* Array cells */}
      <div className="relative">
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

        {/* Pointer arrows below the cells */}
        {twoPointer && lIdx >= 0 && rIdx >= 0 && count > 0 && (
          <div className="flex justify-center gap-2" style={{ marginTop: 4 }}>
            {Array.from({ length: count }, (_, i) => {
              const isL = i === lIdx;
              const isR = i === rIdx;
              if (!isL && !isR) return <div key={i} className="w-[56px]" />;
              return (
                <motion.div
                  key={`ptr-${i}`}
                  initial={reduce ? false : { y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="flex w-[56px] flex-col items-center"
                >
                  <motion.span
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                    className={cn(
                      "text-lg leading-none",
                      isL ? "text-arc-300" : "text-ember-300",
                    )}
                  >
                    ▼
                  </motion.span>
                  <span className={cn(
                    "font-mono text-[10px] font-black uppercase",
                    isL ? "text-arc-300" : "text-ember-300",
                  )}>
                    {isL ? "L" : "R"}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
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
    "border-ember-300 bg-ember-400/70 text-ink-950 shadow-[0_0_20px_rgba(245,158,11,0.7)] scale-110",
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

/**
 * The 2D sibling of the 3D VariableForge: the loop narrative for
 * variable-only traces (e.g. Factorial (Loop)). The hero is always the
 * *accumulator* the loop computes, with the loop counter + progress dots
 * above it and the live formula below — on iteration steps the formula is
 * *previewed* (NEXT result = 1 x 2 = 2), so the computation explains itself
 * in 2D mode too.
 */
function LoopNarrative({
  step,
  steps,
  compact = false,
}: {
  step: TraceStep;
  steps: TraceStep[];
  /** Compact band above an array stage — hides the description/variables. */
  compact?: boolean;
}) {
  const reduce = useReducedMotion();
  const variables = step.variables ?? {};
  const counterName = findCounter(variables);
  const counterValue =
    counterName !== null && typeof variables[counterName] === "number"
      ? (variables[counterName] as number)
      : null;
  const formula = parseFormula(step.description);

  // Hero = accumulator, falling back to the first defined variable so the
  // pre-loop steps (e.g. "Set n = 5") still narrate something real.
  const accumulator = useMemo(() => findAccumulator(steps), [steps]);
  const changedVar = step.changed?.variables?.find(
    (n) => n !== counterName && n in variables,
  );
  const heroName =
    (formula?.lhs ??
      changedVar ??
      accumulator ??
      Object.keys(variables).find((n) => n !== counterName) ??
      Object.keys(variables)[0]) ??
    "step";
  const heroValue = variables[heroName];
  const display =
    heroValue === undefined ? "—" : String(heroValue);
  const isNumericHero = typeof heroValue === "number";

  // The chip explaining this step: completed arithmetic, a comparison beat,
  // a plain assignment, or the preview of the next operation.
  const chip = buildChipModel(step, steps, heroName, heroValue, counterValue);

  // Progress dots: range text when present, else the iteration count, filled
  // by how many iterations have actually run by this step.
  const rangeEnd = useMemo(() => deriveRangeEnd(steps), [steps]);
  const elapsed = iterationsElapsed(steps, step);

  const statusTag =
    step.event === "loop_iteration"
      ? "NEXT ITERATION"
      : step.event === "assignment"
        ? "UPDATED"
        : step.event === "comparison"
          ? "CHECKED"
          : step.event === "output_write"
            ? "PRINTED"
            : step.event === "program_start"
              ? "START"
              : step.event === "program_end"
                ? "DONE"
                : "";

  const otherVars = Object.entries(variables).filter(
    ([name, v]) => name !== heroName && name !== counterName && v !== undefined,
  );

  return (
    <div
      className={
        compact
          ? "flex flex-row flex-wrap items-center justify-center gap-x-4 gap-y-2 px-3 py-2 text-center"
          : "flex h-full flex-col items-center justify-center gap-4 p-6 text-center"
      }
    >
      <motion.span
        key={`badge-${step.id}`}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: EASE_OUT }}
        className={
          compact
            ? "rounded-full bg-ember-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ember-300 ring-1 ring-ember-500/40"
            : "rounded-full bg-ember-500/15 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-ember-300 ring-1 ring-ember-500/40"
        }
      >
        {step.event.replaceAll("_", " ")}
      </motion.span>

      {/* Loop counter + progress dots */}
      {counterName !== null && counterValue !== null && (
        <div className={cn("flex flex-col items-center", compact ? "gap-0.5" : "gap-1.5")}>
          <span
            className={cn(
              "font-mono font-black uppercase tracking-[0.25em] text-ink-400",
              compact ? "text-[10px]" : "text-xs",
            )}
          >
            {counterName} = {counterValue}
          </span>
          {rangeEnd !== null && (
            <div className={cn("flex", compact ? "gap-1" : "gap-1.5")}>
              {Array.from({ length: Math.max(1, rangeEnd) }, (_, idx) => (
                <motion.span
                  key={idx}
                  initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.06 + Math.min(idx, 8) * 0.02 }}
                  className={cn(
                    "rounded-full transition-colors",
                    compact ? "h-1 w-1" : "h-1.5 w-1.5",
                    idx < elapsed ? "bg-ember-400" : "bg-ink-700",
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hero accumulator — skipped when the value isn't numeric (e.g. the
          array itself on the first step of an array loop) */}
      {isNumericHero && (
        <div className="flex flex-col items-center">
          <span
            className={cn(
              "font-mono font-black uppercase tracking-[0.3em] text-ink-500",
              compact ? "text-[9px]" : "text-[10px]",
            )}
          >
            {heroName}
          </span>
          <motion.span
            key={`${heroName}-${display}`}
            initial={reduce ? false : { scale: 0.55, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
            className={cn(
              "font-mono font-black tabular-nums text-ember-300 [text-shadow:0_0_32px_rgba(251,191,36,0.55)]",
              compact ? "text-4xl" : "text-6xl",
            )}
          >
            {display}
          </motion.span>
          {statusTag && (
            <motion.span
              key={`tag-${statusTag}-${display}`}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25, delay: 0.08, ease: EASE_OUT }}
              className={cn(
                "rounded border border-ember-400/40 bg-ember-500/10 font-mono font-bold uppercase tracking-[0.2em] text-ember-300",
                compact ? "mt-0.5 px-1 py-px text-[8px]" : "mt-1 px-1.5 py-0.5 text-[9px]",
              )}
            >
              {statusTag}
            </motion.span>
          )}
        </div>
      )}

      {/* The chip explaining this step — shared so the operand pulses stay
          identical to the 3D stage */}
      {chip && <FormulaChip model={chip} stepKey={step.id} />}

      {/* The step's own words, for steps the narrative can't express (prints) */}
      {!compact && (
        <p className="max-w-md text-xs leading-relaxed text-ink-400">
          {step.description}
        </p>
      )}

      {/* Remaining variables (n = 5) */}
      {!compact && otherVars.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {otherVars.map(([name, value], i) => (
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
    </div>
  );
}

/**
 * Array loops (Sum of Array, Max in Array): the narrative band on top and the
 * array bars below, so the 2D stage explains the computation *and* shows the
 * data it reads — instead of plain chips over the bars.
 */
function LoopArrayStage({
  step,
  steps,
  item,
}: {
  step: TraceStep;
  steps: TraceStep[];
  item: MemoryItem;
}) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-ink-800/60 bg-ink-950/40">
        <LoopNarrative step={step} steps={steps} compact />
      </div>
      <div className="min-h-0 flex-1">
        <ArrayStage item={item} />
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
  // Loop traces (Factorial (Loop), Sum of Array, Max in Array) get the loop
  // narrative instead of plain chips: array loops get the narrative band over
  // the bars, variable-only loops get the full 2D VariableForge sibling.
  const loopTrace = useMemo(() => isLoopNarrativeTrace(steps), [steps]);

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
    if (item) {
      if (loopTrace) return <LoopArrayStage step={step} steps={steps} item={item} />;
      return <ArrayStage item={item} step={step} />;
    }
  }

  if (dispatch.kind === "grid" && visual?.type === "grid") {
    const item = step.memory?.find((m) => m.id === visual.itemId);
    if (item) return <GridStage item={item} />;
  }

  if (loopTrace) return <LoopNarrative step={step} steps={steps} />;

  return <ForgeStage step={step} />;
}
