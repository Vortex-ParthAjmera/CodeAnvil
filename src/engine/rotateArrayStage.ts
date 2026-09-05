import type { MemoryItem, TraceAction, TraceStep } from "../types/trace";

export type RotateArrayOperation = "start" | "invalid" | "normalize" | "reverse-all" | "reverse-prefix" | "reverse-suffix" | "complete";
export type RotateTokenRole = "idle" | "range" | "swap" | "moved-group" | "complete" | "invalid";

export interface RotateArrayTokenModel {
  id: string;
  value: number;
  index: number;
  originalIndex: number;
  destination: number;
  role: RotateTokenRole;
}

export interface RotateArraySceneModel {
  item: MemoryItem;
  operation: RotateArrayOperation;
  originalValues: number[];
  values: number[];
  tokens: RotateArrayTokenModel[];
  shift: number;
  normalizedShift: number;
  activeRange: [number, number] | null;
  activePair: [number, number] | null;
  phaseName: "all" | "prefix" | "suffix" | null;
  swapBefore: [number, number] | null;
  swaps: number;
  completedPhases: number;
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
  return step.actions?.find((action) => typeof action.phase === "string" && action.phase.startsWith("rotate_"));
}

function operationFor(phase: string): RotateArrayOperation {
  if (phase === "rotate_invalid") return "invalid";
  if (phase === "rotate_normalize") return "normalize";
  if (phase === "rotate_reverse_all") return "reverse-all";
  if (phase === "rotate_reverse_prefix") return "reverse-prefix";
  if (phase === "rotate_reverse_suffix") return "reverse-suffix";
  if (phase === "rotate_complete") return "complete";
  return "start";
}

export function isRotateArrayTraceStep(step: TraceStep): boolean {
  return Boolean(phaseAction(step));
}

export function getRotateArraySceneModel(step: TraceStep): RotateArraySceneModel | null {
  const action = phaseAction(step);
  if (!action) return null;
  const item = step.memory?.find((entry) => entry.id === "arr") ?? step.memory?.[0];
  if (!item) return null;
  const originalValues = numberArray(action.originalValues);
  const values = numberArray(action.values);
  const shift = integer(action.shift) ?? 0;
  const normalizedShift = integer(action.normalizedShift) ?? 0;
  const activeRange = pair(action.activeRange);
  const activePair = pair(action.activePair);
  const phaseName = action.phaseName === "all" || action.phaseName === "prefix" || action.phaseName === "suffix" ? action.phaseName : null;
  const swapBefore = pair(action.swapBefore);
  const operation = operationFor(String(action.phase));
  const invalidReason = typeof action.invalidReason === "string" ? action.invalidReason : null;
  const rawTokens = Array.isArray(action.tokens) ? action.tokens : [];
  const tokens = rawTokens.flatMap((candidate, fallbackIndex) => {
    if (!candidate || typeof candidate !== "object") return [];
    const record = candidate as Record<string, unknown>;
    const value = finite(record.value);
    const index = integer(record.index) ?? fallbackIndex;
    const originalIndex = integer(record.originalIndex) ?? fallbackIndex;
    if (value === null || typeof record.id !== "string") return [];
    const destination = values.length > 0 ? (originalIndex + normalizedShift) % values.length : originalIndex;
    let role: RotateTokenRole = destination < normalizedShift ? "moved-group" : "idle";
    if (operation === "invalid") role = "invalid";
    else if (operation === "complete") role = "complete";
    else if (activePair?.includes(index)) role = "swap";
    else if (activeRange && index >= activeRange[0] && index <= activeRange[1]) role = "range";
    return [{ id: record.id, value, index, originalIndex, destination, role }];
  });
  const swaps = integer(action.swaps) ?? 0;
  const completedPhases = integer(action.completedPhases) ?? 0;

  let headline = "Map every token to a rotated destination";
  let detail = `A right rotation moves original index i to (i + ${normalizedShift}) mod ${Math.max(1, values.length)}.`;
  let equation = `dest(i) = (i + ${normalizedShift}) mod ${Math.max(1, values.length)}`;
  let actionLabel = "map";
  if (operation === "invalid") {
    headline = "Rotation stopped before movement";
    detail = invalidReason ?? "The input is invalid.";
    equation = "valid array + integer k required";
    actionLabel = "invalid";
  } else if (operation === "normalize") {
    headline = `Normalize ${shift} turns to ${normalizedShift}`;
    detail = `Only ${normalizedShift} rightward positions matter after complete cycles are removed.`;
    equation = `${shift} mod ${values.length} = ${normalizedShift}`;
    actionLabel = "normalize";
  } else if (operation.startsWith("reverse")) {
    headline = operation === "reverse-all"
      ? "Reverse the whole array"
      : operation === "reverse-prefix"
        ? "Restore the moved prefix"
        : "Restore the remaining suffix";
    detail = activePair && swapBefore
      ? `${swapBefore[0]} and ${swapBefore[1]} exchange mirrored positions ${activePair[0]} and ${activePair[1]}.`
      : `The highlighted range [${activeRange?.[0] ?? 0}..${activeRange?.[1] ?? 0}] is reversed from its outside inward.`;
    equation = activePair && swapBefore ? `swap a[${activePair[0]}]=${swapBefore[0]} with a[${activePair[1]}]=${swapBefore[1]}` : `reverse [${activeRange?.join("..") ?? "-"}]`;
    actionLabel = phaseName ? `phase ${phaseName}` : "reverse";
  } else if (operation === "complete") {
    headline = `Rotation complete: [${values.join(", ")}]`;
    detail = `All ${values.length} persistent tokens reached their mapped destinations using ${swaps} in-place swaps.`;
    equation = `new[i] = old[(i - ${normalizedShift} + n) mod n]`;
    actionLabel = "complete";
  }

  return {
    item,
    operation,
    originalValues,
    values,
    tokens,
    shift,
    normalizedShift,
    activeRange,
    activePair,
    phaseName,
    swapBefore,
    swaps,
    completedPhases,
    invalidReason,
    headline,
    detail,
    equation,
    actionLabel,
    resultLabel: operation === "invalid" ? "invalid" : operation === "complete" ? values.join(" ") : `${completedPhases}/3`,
  };
}
