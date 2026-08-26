import type { GridHighlight, MemoryHighlight, MemoryItem, TraceStep } from "../types/trace";

export type TwoSumOperation =
  | "start"
  | "compare"
  | "move-left"
  | "move-right"
  | "found"
  | "not-found";

export interface TwoSumCell {
  index: number;
  value: number;
  role: string;
  active: boolean;
  eliminated: boolean;
  found: boolean;
  side: "left" | "right" | "both" | null;
}

export interface TwoSumSceneModel {
  values: number[];
  cells: TwoSumCell[];
  l: number | null;
  r: number | null;
  sum: number | null;
  target: number | null;
  probes: number | null;
  operation: TwoSumOperation;
  headline: string;
  detail: string;
  pairLabel: string;
  windowLabel: string;
  resultLabel: string;
  comparisonLabel: string;
}

function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isArrayHighlight(highlight: MemoryHighlight | GridHighlight): highlight is MemoryHighlight {
  return "index" in highlight;
}

function getTwoSumItem(step: TraceStep): MemoryItem | null {
  const visual = step.visual;
  if (!visual || visual.type !== "array") return null;
  const item = step.memory?.find((memory) => memory.id === visual.itemId);
  if (!item || item.type !== "array") return null;

  const hasPointers = numeric(step.variables.l) !== null && numeric(step.variables.r) !== null;
  const hasSumTarget = numeric(step.variables.sum) !== null && numeric(step.variables.target) !== null;
  const values = item.value.map(numeric);
  const allNumeric = values.length > 1 && values.every((value) => value !== null);

  return hasPointers && hasSumTarget && allNumeric ? item : null;
}

function roleAt(item: MemoryItem, index: number): string {
  const priority: Record<string, number> = {
    swap: 5,
    found: 5,
    compare: 4,
    key: 3,
    sorted: 2,
    default: 1,
  };
  let role = "default";
  let score = 0;
  for (const highlight of item.highlights) {
    if (!isArrayHighlight(highlight) || highlight.index !== index) continue;
    const nextScore = priority[highlight.role] ?? 1;
    if (nextScore >= score) {
      role = highlight.role;
      score = nextScore;
    }
  }
  return role;
}

function operationForStep(step: TraceStep): TwoSumOperation {
  const description = step.description.toLowerCase();
  if (description.includes("no pair") || description.includes("eliminated, so no pair")) return "not-found";
  if (description.includes("this pair is the answer") || description.includes("equals target")) return "found";
  if (description.includes("move l")) return "move-left";
  if (description.includes("move r")) return "move-right";
  if (step.event === "program_start") return "start";
  return "compare";
}

function pairLabel(values: number[], l: number | null, r: number | null, sum: number | null): string {
  if (l === null || r === null) return "waiting";
  if (l < 0 || r < 0 || l >= values.length || r >= values.length) return "pointers crossed";
  return "a[" + l + "] + a[" + r + "] = " + values[l] + " + " + values[r] + " = " + (sum ?? "?");
}

function windowLabel(l: number | null, r: number | null): string {
  if (l === null || r === null) return "unknown";
  if (l > r) return "closed";
  return "[" + l + ".." + r + "]";
}

function comparisonLabel(sum: number | null, target: number | null): string {
  if (sum === null || target === null) return "waiting";
  if (sum === target) return String(sum) + " == " + String(target);
  if (sum < target) return String(sum) + " < " + String(target);
  return String(sum) + " > " + String(target);
}

export function isTwoSumTraceStep(step: TraceStep): boolean {
  return getTwoSumItem(step) !== null;
}

export function getTwoSumSceneModel(step: TraceStep): TwoSumSceneModel | null {
  const item = getTwoSumItem(step);
  if (!item) return null;

  const values = item.value.map((value) => Number(value));
  const l = numeric(step.variables.l);
  const r = numeric(step.variables.r);
  const sum = numeric(step.variables.sum);
  const target = numeric(step.variables.target);
  const probes = numeric(step.variables.probes);
  const operation = operationForStep(step);

  const cells = values.map((value, index) => {
    const active = index === l || index === r;
    const role = roleAt(item, index);
    const found = operation === "found" && active;
    const eliminated = operation !== "found" && l !== null && r !== null && (index < l || index > r);
    const side: TwoSumCell["side"] = active
      ? l === r
        ? "both"
        : index === l
          ? "left"
          : "right"
      : null;
    return { index, value, role, active, eliminated, found, side };
  });

  const headline = (() => {
    switch (operation) {
      case "start":
        return "Start from both ends";
      case "compare":
        return "Add L and R, then compare";
      case "move-left":
        return "Sum is too small; move L right";
      case "move-right":
        return "Sum is too large; move R left";
      case "found":
        return "Pair found";
      case "not-found":
        return "No valid pair remains";
    }
  })();

  return {
    values,
    cells,
    l,
    r,
    sum,
    target,
    probes,
    operation,
    headline,
    detail: step.description,
    pairLabel: pairLabel(values, l, r, sum),
    windowLabel: windowLabel(l, r),
    resultLabel: operation === "found" ? "found" : operation === "not-found" ? "none" : "searching",
    comparisonLabel: comparisonLabel(sum, target),
  };
}
