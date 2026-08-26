import type { GridHighlight, MemoryHighlight, MemoryItem, TraceStep } from "../types/trace";

export type StringTapeOperation =
  | "start"
  | "compare"
  | "match"
  | "mismatch"
  | "complete"
  | "move";

export interface StringTapeCell {
  index: number;
  value: string;
  role: string;
  active: boolean;
  locked: boolean;
  mismatch: boolean;
  side: "left" | "right" | "both" | null;
}

export interface StringTapeSceneModel {
  chars: string[];
  cells: StringTapeCell[];
  l: number | null;
  r: number | null;
  comparisons: number | null;
  operation: StringTapeOperation;
  headline: string;
  detail: string;
  pairLabel: string;
  windowLabel: string;
  resultLabel: string;
  outcome: "pending" | "true" | "false";
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

function getStringTapeItem(step: TraceStep): MemoryItem | null {
  const visual = step.visual;
  if (!visual || visual.type !== "array") return null;
  const item = step.memory?.find((memory) => memory.id === visual.itemId);
  if (!item || item.type !== "array") return null;

  const hasPointers = numeric(step.variables.l) !== null && numeric(step.variables.r) !== null;
  const hasCharacterTape =
    item.id === "s" &&
    item.value.length > 0 &&
    item.value.every((value) => typeof value === "string" && value.length <= 2);

  return hasPointers && hasCharacterTape ? item : null;
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

function descriptionOf(step: TraceStep): string {
  return step.description.toLowerCase();
}

function operationForStep(step: TraceStep): StringTapeOperation {
  const description = descriptionOf(step);
  const result = String(step.variables.result ?? "").toLowerCase();

  if (result === "false" || description.includes("mismatch") || description.includes("not a palindrome")) {
    return "mismatch";
  }
  if (result === "true" || description.includes("pointers met") || description.includes("reads the same")) {
    return "complete";
  }
  if (step.event === "program_start") return "start";
  if (description.includes("lock both") || description.startsWith("match:")) return "match";
  if (description.includes("compare")) return "compare";
  if (description.includes("move l") || description.includes("move both")) return "move";
  return "compare";
}

function pairLabel(chars: string[], l: number | null, r: number | null): string {
  if (l === null || r === null) return "waiting for pointers";
  if (l < 0 || r < 0 || l >= chars.length || r >= chars.length) return "pointers outside tape";
  if (l === r) return "center s[" + l + "] = \"" + chars[l] + "\"";

  const relation = chars[l] === chars[r] ? "==" : "!=";
  return "s[" + l + "] \"" + chars[l] + "\" " + relation + " s[" + r + "] \"" + chars[r] + "\"";
}

function windowLabel(l: number | null, r: number | null): string {
  if (l === null || r === null) return "unknown";
  if (l > r) return "closed";
  return "[" + l + ".." + r + "]";
}

export function isStringTapeTraceStep(step: TraceStep): boolean {
  return getStringTapeItem(step) !== null;
}

export function getStringTapeSceneModel(step: TraceStep): StringTapeSceneModel | null {
  const item = getStringTapeItem(step);
  if (!item) return null;

  const chars = item.value.map((value) => String(value));
  const l = numeric(step.variables.l);
  const r = numeric(step.variables.r);
  const operation = operationForStep(step);
  const comparisons = numeric(step.variables.comparisons);
  const result = String(step.variables.result ?? "").toLowerCase();
  const outcome = operation === "mismatch" || result === "false"
    ? "false"
    : operation === "complete" || result === "true"
      ? "true"
      : "pending";

  const cells = chars.map((value, index) => {
    const active = index === l || index === r;
    const role = roleAt(item, index);
    const locked = operation === "complete" || role === "sorted" || (operation === "match" && active);
    const mismatch = operation === "mismatch" && active;
    const side: StringTapeCell["side"] = active
      ? l === r
        ? "both"
        : index === l
          ? "left"
          : "right"
      : null;

    return { index, value, role, active, locked, mismatch, side };
  });

  const headline = (() => {
    switch (operation) {
      case "start":
        return "Build the character tape";
      case "compare":
        return "Compare mirrored letters";
      case "match":
        return "Pair matches; lock both cells";
      case "mismatch":
        return "Mismatch breaks the palindrome";
      case "complete":
        return "Palindrome confirmed";
      case "move":
        return "Move both pointers inward";
    }
  })();

  const resultLabel = outcome === "true" ? "palindrome" : outcome === "false" ? "not palindrome" : "checking";

  return {
    chars,
    cells,
    l,
    r,
    comparisons,
    operation,
    headline,
    detail: step.description,
    pairLabel: pairLabel(chars, l, r),
    windowLabel: windowLabel(l, r),
    resultLabel,
    outcome,
  };
}
