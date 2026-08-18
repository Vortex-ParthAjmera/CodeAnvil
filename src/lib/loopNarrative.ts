import type { TraceStep } from "../types/trace";

/** Pulls `result = 1 x 3 = 3`-style formulas out of a step description. */
export const FORMULA_RE =
  /([a-z_][a-z0-9_]*)\s*=\s*(-?\d+)\s*([×+*\-])\s*(-?\d+)\s*=\s*(-?\d+)/i;
export const COUNTER_RE = /\b(i|j|k|idx|index)\b/;
export const RANGE_RE = /range\s*(\d+)\.\.(\d+)/;

export interface ParsedFormula {
  lhs: string;
  a: number;
  op: string;
  b: number;
  result: number;
}

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

/** A loop counter (i/j/k) whose value is a number. */
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
 * factorial) — by scanning the full trace backwards for the last non-counter
 * assignment target. Works even when the stage mounts mid-trace (session
 * resume, direct navigation).
 */
export function findAccumulator(steps?: TraceStep[]): string | null {
  if (!steps) return null;
  for (let i = steps.length - 1; i >= 0; i--) {
    const s = steps[i];
    const target = s.actions?.find(
      (a) => typeof a.target === "string" && !COUNTER_RE.test(a.target as string),
    )?.target as string | undefined;
    if (target) return target;
    const ch = s.changed?.variables?.find((n) => !COUNTER_RE.test(n));
    if (ch) return ch;
  }
  return null;
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
