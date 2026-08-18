import type { TraceAction, TraceStep } from "../types/trace";

/** Pulls `result = 1 x 3 = 3`-style formulas out of a step description. */
export const FORMULA_RE =
  /([a-z_][a-z0-9_]*)\s*=\s*(-?\d+)\s*([×+*\-])\s*(-?\d+)\s*=\s*(-?\d+)/i;
export const COUNTER_RE = /\b(i|j|k|idx|index|num)\b/;
export const RANGE_RE = /range\s*(\d+)\.\.(\d+)/;

export interface ParsedFormula {
  lhs: string;
  a: number;
  op: string;
  b: number;
  result: number;
}

/** The formula-chip content for any loop step, shared by 2D and 3D. */
export type LoopChip =
  | { kind: "formula"; prefix?: "next"; formula: ParsedFormula }
  | {
      kind: "compare";
      prefix?: "next";
      left: number | string;
      cmp: string;
      right: number | string;
      outcome?: boolean;
    }
  | { kind: "assign"; lhs: string; value: string | number };

export function parseFormula(description?: string): ParsedFormula | null {
  if (!description) return null;
  const m = FORMULA_RE.exec(description);
  if (!m) return null;
  return {
    lhs: m[1],
    a: Number(m[2]),
    op: m[3] === "*" ? "×" : m[3],
    b: Number(m[4]),
    result: Number(m[5]),
  };
}

/** A loop counter (i/j/k/num) whose value is a number. */
export function findCounter(
  variables: Record<string, unknown>,
): string | null {
  return (
    Object.keys(variables).find(
      (name) => COUNTER_RE.test(name) && typeof variables[name] === "number",
    ) ?? null
  );
}

/**
 * Finds the accumulator — the variable the loop computes (e.g. `result` in
 * factorial, `total` in sum, `max_val` in max) — by scanning the full trace
 * backwards for the last non-counter assignment target. Works even when the
 * stage mounts mid-trace (session resume, direct navigation).
 */
export function findAccumulator(steps?: TraceStep[]): string | null {
  if (!steps) return null;
  for (let i = steps.length - 1; i >= 0; i--) {
    const s = steps[i];
    // Only real assignment actions count — reads/writes carry a `target` too
    // (e.g. `array_read` targets "arr"), which would shadow the accumulator.
    const target = s.actions?.find(
      (a) =>
        a.type === "assignment" &&
        typeof a.target === "string" &&
        !COUNTER_RE.test(a.target as string),
    )?.target as string | undefined;
    if (target) return target;
    const ch = s.changed?.variables?.find((n) => !COUNTER_RE.test(n));
    if (ch) return ch;
  }
  return null;
}

/**
 * True only for *loop-narrative* traces: they must both emit `loop_iteration`
 * events AND carry a numeric loop counter variable. This excludes the sort
 * traces (no loop_iteration events) and binary search (no i/j/k/num counter),
 * so the narrative only upgrades the variable loops it can actually explain.
 */
export function isLoopNarrativeTrace(steps: TraceStep[]): boolean {
  return (
    steps.some((s) => s.event === "loop_iteration") &&
    steps.some((s) =>
      Object.entries(s.variables ?? {}).some(
        ([name, v]) => COUNTER_RE.test(name) && typeof v === "number",
      ),
    )
  );
}

/** True when the trace is a loop (has a loop_iteration event or a counter). */
export function hasLoopNarrative(steps: TraceStep[]): boolean {
  return steps.some(
    (s) =>
      s.event === "loop_iteration" ||
      Object.entries(s.variables ?? {}).some(
        ([name, v]) => COUNTER_RE.test(name) && typeof v === "number",
      ),
  );
}

/** The loop's arithmetic op (× / + / −) found in its completed formulas. */
export function deriveLoopOp(
  steps: TraceStep[],
  accumulator: string,
): string | null {
  for (const s of steps) {
    const f = parseFormula(s.description);
    if (f && f.lhs === accumulator) return f.op;
  }
  return null;
}

/** Total iterations the progress dots represent (range text, else count). */
export function deriveRangeEnd(steps: TraceStep[]): number | null {
  for (const s of steps) {
    const m = RANGE_RE.exec(s.description ?? "");
    if (m) return Number(m[2]);
  }
  const iterCount = steps.filter((s) => s.event === "loop_iteration").length;
  return iterCount > 0 ? iterCount : null;
}

/** How many loop iterations have run by the given step (for the dots). */
export function iterationsElapsed(steps: TraceStep[], step: TraceStep): number {
  const idx = steps.indexOf(step);
  if (idx === -1) return 0;
  return steps
    .slice(0, idx + 1)
    .filter((s) => s.event === "loop_iteration").length;
}

function compareAction(actions?: TraceAction[]): TraceAction | null {
  return (
    actions?.find(
      (a) => a.type === "compare" || a.type === "comparison",
    ) ?? null
  );
}

/**
 * Builds the formula-chip content that explains the current loop step:
 * - completed arithmetic (factorial/sum assignment): `total = 0 + 3 = 3`
 * - comparison beat (max): `8 > 3 → TRUE` and its preview `NEXT 8 > 3 ?`
 * - plain assignment (max update): `max_val = 8`
 * - iteration previews for × / + loops: `NEXT result = 1 × 2 = 2`
 */
export function buildChipModel(
  step: TraceStep,
  steps: TraceStep[],
  heroName: string,
  heroValue: unknown,
  counterValue: number | null,
): LoopChip | null {
  const formula = parseFormula(step.description);
  if (formula) return { kind: "formula", formula };

  const cmp = compareAction(step.actions);
  if (
    cmp &&
    typeof cmp.left === "number" &&
    typeof cmp.right === "number"
  ) {
    let outcome: boolean | undefined;
    if (typeof cmp.result === "boolean") {
      outcome = cmp.result;
    } else {
      const m = /→\s*(true|false)/i.exec(step.description ?? "");
      if (m) outcome = m[1].toLowerCase() === "true";
    }
    return {
      kind: "compare",
      left: cmp.left,
      cmp: ">",
      right: cmp.right,
      outcome,
    };
  }

  if (
    step.event === "loop_iteration" &&
    typeof heroValue === "number" &&
    counterValue !== null &&
    Number.isFinite(heroValue) &&
    Number.isFinite(counterValue)
  ) {
    const op = deriveLoopOp(steps, heroName);
    if (op) {
      const result =
        op === "+"
          ? heroValue + counterValue
          : op === "×"
            ? heroValue * counterValue
            : heroValue - counterValue;
      return {
        kind: "formula",
        prefix: "next",
        formula: { lhs: heroName, a: heroValue, op, b: counterValue, result },
      };
    }
    // Comparison-style loop (e.g. max): preview the next comparison.
    const idx = steps.indexOf(step);
    const nextCmp = compareAction(
      steps.slice(idx + 1).flatMap((s) => s.actions ?? []),
    );
    if (nextCmp && typeof nextCmp.left === "number" && typeof nextCmp.right === "number") {
      return {
        kind: "compare",
        prefix: "next",
        left: nextCmp.left,
        cmp: ">",
        right: nextCmp.right,
      };
    }
  }

  if (step.event === "assignment" && heroValue !== undefined) {
    return {
      kind: "assign",
      lhs: heroName,
      value: String(heroValue),
    };
  }

  return null;
}
