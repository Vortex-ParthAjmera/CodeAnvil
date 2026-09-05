import type { MemoryItem, TraceAction, TraceStep } from "../types/trace";

export type NextPermutationOperation = "start" | "invalid" | "validate" | "scan-pivot" | "choose-pivot" | "wrap" | "scan-successor" | "choose-successor" | "swap-pivot" | "reverse-suffix" | "complete";
export type PermutationTokenRole = "idle" | "scan" | "suffix" | "pivot" | "successor" | "swap" | "complete" | "invalid";

export interface PermutationTokenModel {
  id: string;
  value: number;
  index: number;
  originalIndex: number;
  role: PermutationTokenRole;
}

export interface NextPermutationSceneModel {
  item: MemoryItem;
  operation: NextPermutationOperation;
  originalValues: number[];
  values: number[];
  tokens: PermutationTokenModel[];
  pivot: number | null;
  successor: number | null;
  scanPair: [number, number] | null;
  activePair: [number, number] | null;
  suffixRange: [number, number] | null;
  swapBefore: [number, number] | null;
  comparisons: number;
  swaps: number;
  wrapped: boolean;
  invalidReason: string | null;
  headline: string;
  detail: string;
  equation: string;
  actionLabel: string;
  resultLabel: string;
}

function finite(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function integer(value: unknown): number | null {
  const parsed = finite(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function numberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map(finite).filter((entry): entry is number => entry !== null);
}

function pair(value: unknown): [number, number] | null {
  const parsed = numberArray(value);
  return parsed.length === 2 && parsed.every(Number.isInteger) ? [parsed[0], parsed[1]] : null;
}

function phaseAction(step: TraceStep): TraceAction | undefined {
  return step.actions?.find((action) => typeof action.phase === "string" && action.phase.startsWith("permutation_"));
}

function operationFor(phase: string): NextPermutationOperation {
  const operations: Record<string, NextPermutationOperation> = {
    permutation_start: "start",
    permutation_invalid: "invalid",
    permutation_validate: "validate",
    permutation_scan_pivot: "scan-pivot",
    permutation_choose_pivot: "choose-pivot",
    permutation_wrap: "wrap",
    permutation_scan_successor: "scan-successor",
    permutation_choose_successor: "choose-successor",
    permutation_swap_pivot: "swap-pivot",
    permutation_reverse_suffix: "reverse-suffix",
    permutation_complete: "complete",
  };
  return operations[phase] ?? "start";
}

export function isNextPermutationTraceStep(step: TraceStep): boolean {
  return Boolean(phaseAction(step));
}

export function getNextPermutationSceneModel(step: TraceStep): NextPermutationSceneModel | null {
  const action = phaseAction(step);
  if (!action) return null;
  const item = step.memory?.find((entry) => entry.id === "arr") ?? step.memory?.[0];
  if (!item) return null;
  const operation = operationFor(String(action.phase));
  const values = numberArray(action.values);
  const originalValues = numberArray(action.originalValues);
  const pivotValue = integer(action.pivot);
  const pivot = pivotValue !== null && pivotValue >= 0 ? pivotValue : pivotValue === -1 ? -1 : null;
  const successor = integer(action.successor);
  const scanPair = pair(action.scanPair);
  const activePair = pair(action.activePair);
  const suffixRange = pair(action.suffixRange);
  const swapBefore = pair(action.swapBefore);
  const rawTokens = Array.isArray(action.tokens) ? action.tokens : [];
  const tokens = rawTokens.flatMap((candidate, fallbackIndex) => {
    if (!candidate || typeof candidate !== "object") return [];
    const record = candidate as Record<string, unknown>;
    const value = finite(record.value);
    const index = integer(record.index) ?? fallbackIndex;
    if (value === null || typeof record.id !== "string") return [];
    let role: PermutationTokenRole = "idle";
    if (operation === "invalid") role = "invalid";
    else if (operation === "complete") role = "complete";
    else if (activePair?.includes(index)) role = "swap";
    else if (index === successor) role = "successor";
    else if (index === pivot) role = "pivot";
    else if (scanPair?.includes(index)) role = "scan";
    else if (suffixRange && index >= suffixRange[0] && index <= suffixRange[1]) role = "suffix";
    return [{ id: record.id, value, index, originalIndex: integer(record.originalIndex) ?? fallbackIndex, role }];
  });
  const comparisons = integer(action.comparisons) ?? 0;
  const swaps = integer(action.swaps) ?? 0;
  const wrapped = action.wrapped === true;
  const invalidReason = typeof action.invalidReason === "string" ? action.invalidReason : null;

  let headline = "Find the smallest possible lexicographic increase";
  let detail = "Only the shortest non-increasing suffix needs to change.";
  let equation = "next > current, with minimum change";
  let actionLabel = operation;
  if (operation === "invalid") {
    headline = "Permutation scan stopped";
    detail = invalidReason ?? "The input is invalid.";
    equation = "non-empty finite array required";
  } else if (operation === "scan-pivot" && scanPair) {
    const left = values[scanPair[0]];
    const right = values[scanPair[1]];
    headline = left < right ? `Pivot ascent found at index ${scanPair[0]}` : "Keep scanning left for an ascent";
    detail = `${left} < ${right} is ${left < right ? "true" : "false"}. The scan starts at the right because we want the shortest changed suffix.`;
    equation = `${left} < ${right} -> ${left < right ? "true" : "false"}`;
  } else if (operation === "choose-pivot") {
    headline = `Lock pivot ${values[pivot ?? 0]} at index ${pivot}`;
    detail = `Everything to its right is non-increasing and must be rearranged.`;
    equation = `pivot = ${pivot}`;
  } else if (operation === "wrap") {
    headline = "No larger ordering exists: wrap around";
    detail = "The complete array is descending, so reversing it produces the smallest permutation.";
    equation = "pivot = -1 -> reverse all";
  } else if (operation === "scan-successor" && scanPair && pivot !== null && pivot >= 0) {
    const candidate = values[scanPair[1]];
    const pivotNumber = values[pivot];
    headline = candidate > pivotNumber ? `Successor found: ${candidate}` : "Candidate is not larger than the pivot";
    detail = `${candidate} > ${pivotNumber} is ${candidate > pivotNumber ? "true" : "false"}. Right-to-left scanning finds the smallest valid increase.`;
    equation = `${candidate} > ${pivotNumber} -> ${candidate > pivotNumber ? "true" : "false"}`;
  } else if (operation === "choose-successor") {
    headline = `Lock successor ${values[successor ?? 0]} at index ${successor}`;
    detail = "This is the rightmost value strictly larger than the pivot.";
    equation = `successor = ${successor}`;
  } else if (operation === "swap-pivot" && activePair && swapBefore) {
    headline = "Make the prefix minimally larger";
    detail = `${swapBefore[0]} and ${swapBefore[1]} exchange pivot and successor positions.`;
    equation = `swap ${swapBefore[0]} <-> ${swapBefore[1]}`;
  } else if (operation === "reverse-suffix") {
    headline = "Minimize the suffix";
    detail = activePair && swapBefore
      ? `${swapBefore[0]} and ${swapBefore[1]} cross while the suffix reverses.`
      : `Reverse [${suffixRange?.[0] ?? 0}..${suffixRange?.[1] ?? 0}] so it becomes ascending.`;
    equation = activePair ? `swap a[${activePair[0]}] <-> a[${activePair[1]}]` : `reverse suffix [${suffixRange?.join("..") ?? "-"}]`;
  } else if (operation === "complete") {
    headline = wrapped ? "Wrapped to the first permutation" : "Immediate next permutation found";
    detail = `[${values.join(", ")}] is ${wrapped ? "the smallest ordering" : "the closest lexicographically larger ordering"}.`;
    equation = values.join("  ");
    actionLabel = "complete";
  }

  return {
    item,
    operation,
    originalValues,
    values,
    tokens,
    pivot,
    successor,
    scanPair,
    activePair,
    suffixRange,
    swapBefore,
    comparisons,
    swaps,
    wrapped,
    invalidReason,
    headline,
    detail,
    equation,
    actionLabel,
    resultLabel: operation === "invalid" ? "invalid" : wrapped ? "wrapped" : operation === "complete" ? "next" : pivot === null ? "searching" : String(pivot),
  };
}
