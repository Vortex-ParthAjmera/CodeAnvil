import type { GridHighlight, MemoryHighlight, MemoryItem, TraceAction, TraceStep } from "../types/trace";

export type ReverseArrayOperation =
  | "start"
  | "pair"
  | "swap"
  | "advance"
  | "center"
  | "stop"
  | "complete";

export interface ReverseArraySceneModel {
  item: MemoryItem;
  values: number[];
  originalValues: number[];
  tokenOrder: number[];
  highlights: MemoryHighlight[];
  operation: ReverseArrayOperation;
  leftIndex: number;
  rightIndex: number;
  previousLeftIndex: number | null;
  previousRightIndex: number | null;
  pairNumber: number;
  totalPairs: number;
  swaps: number;
  settledIndices: number[];
  pairValues: [number, number] | null;
  headline: string;
  detail: string;
  equation: string | null;
}

function isMemoryHighlight(value: MemoryHighlight | GridHighlight): value is MemoryHighlight {
  return "index" in value;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function integerValue(value: unknown): number | null {
  const parsed = numberValue(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function numberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map(numberValue).filter((candidate): candidate is number => candidate !== null);
}

function integerArray(value: unknown): number[] {
  return numberArray(value).filter(Number.isInteger);
}

function phaseAction(step: TraceStep): TraceAction | undefined {
  return step.actions?.find(
    (action) => typeof action.phase === "string" && action.phase.startsWith("reverse_"),
  );
}

function operationForPhase(phase: string): ReverseArrayOperation {
  if (phase === "reverse_start") return "start";
  if (phase === "reverse_pair") return "pair";
  if (phase === "reverse_swap") return "swap";
  if (phase === "reverse_advance") return "advance";
  if (phase === "reverse_center") return "center";
  if (phase === "reverse_stop") return "stop";
  if (phase === "reverse_complete") return "complete";
  return "pair";
}

export function isReverseArrayTraceStep(step: TraceStep): boolean {
  if (step.visual?.type !== "array") return false;
  if (step.variables.algorithm === "reverse-array") return true;
  return phaseAction(step) !== undefined;
}

export function getReverseArraySceneModel(step: TraceStep): ReverseArraySceneModel | null {
  if (!isReverseArrayTraceStep(step)) return null;

  const itemId = step.visual?.type === "array" ? step.visual.itemId : "arr";
  const item = step.memory?.find(
    (candidate) => candidate.type === "array" && candidate.id === itemId,
  );
  if (!item) return null;

  const values = item.value.map(numberValue);
  if (values.length === 0 || values.some((value) => value === null)) return null;

  const numericValues = values as number[];
  const action = phaseAction(step);
  const phase = typeof action?.phase === "string" ? action.phase : "reverse_pair";
  const operation = operationForPhase(phase);
  const leftIndex = integerValue(action?.leftIndex) ?? integerValue(step.variables.left) ?? 0;
  const rightIndex = integerValue(action?.rightIndex) ?? integerValue(step.variables.right) ?? numericValues.length - 1;
  const previousLeftIndex = integerValue(action?.previousLeftIndex);
  const previousRightIndex = integerValue(action?.previousRightIndex);
  const pairNumber = integerValue(action?.pairNumber) ?? integerValue(step.variables.pair_number) ?? 0;
  const totalPairs = integerValue(action?.totalPairs) ?? integerValue(step.variables.total_pairs) ?? Math.floor(numericValues.length / 2);
  const swaps = integerValue(action?.swaps) ?? integerValue(step.variables.swaps) ?? 0;
  const originalValues = numberArray(action?.originalValues ?? step.variables.original_values);
  const rawTokenOrder = integerArray(action?.tokenOrder ?? step.variables.token_order);
  const tokenOrder = rawTokenOrder.length === numericValues.length
    ? rawTokenOrder
    : numericValues.map((_, index) => index);
  const settledIndices = integerArray(
    action?.settledIndices ?? step.variables.settled_indices,
  ).filter((index) => index >= 0 && index < numericValues.length);
  const actionValues = numberArray(action?.values);
  const pairValues: [number, number] | null = actionValues.length >= 2
    ? [actionValues[0], actionValues[1]]
    : leftIndex >= 0 && rightIndex >= 0 && leftIndex < numericValues.length && rightIndex < numericValues.length
      ? [numericValues[leftIndex], numericValues[rightIndex]]
      : null;

  let headline = "Reverse mirrored positions";
  let detail = "Two pointers move inward, swapping one equally distant pair at a time.";
  let equation: string | null = null;

  if (operation === "start") {
    headline = "Guard both ends";
    detail = "L starts at the first slot and R at the last. These positions must trade values in the reversed order.";
  } else if (operation === "pair" && pairValues) {
    headline = `Pair ${pairNumber}: ${pairValues[0]} meets ${pairValues[1]}`;
    detail = `Indices ${leftIndex} and ${rightIndex} mirror one another. Select both values before changing the array.`;
    equation = `arr[${leftIndex}] <-> arr[${rightIndex}]`;
  } else if (operation === "swap" && pairValues) {
    headline = `${pairValues[0]} and ${pairValues[1]} cross`;
    detail = `The same two value tokens travel to opposite slots. Their destination indices ${leftIndex} and ${rightIndex} are now final.`;
    equation = `${pairValues[0]} <-> ${pairValues[1]}`;
  } else if (operation === "advance") {
    headline = "Lock the pair, move inward";
    detail = `The outer slots will never change again. L advances to ${leftIndex}; R retreats to ${rightIndex}.`;
  } else if (operation === "center") {
    const centerValue = numericValues[leftIndex];
    headline = `${centerValue} stays in the center`;
    detail = `A middle element mirrors itself, so an odd-length array needs no swap at index ${leftIndex}.`;
    equation = `L = R = ${leftIndex}`;
  } else if (operation === "stop") {
    headline = "The pointers have crossed";
    detail = "Every mirrored pair is locked. The loop stops because no unchecked positions remain.";
    equation = `${leftIndex} >= ${rightIndex}`;
  } else if (operation === "complete") {
    headline = "Order reversed in place";
    detail = `${swaps} swap${swaps === 1 ? "" : "s"} reversed ${numericValues.length} values with O(1) extra memory.`;
    equation = `[${numericValues.join(", ")}]`;
  }

  return {
    item,
    values: numericValues,
    originalValues: originalValues.length === numericValues.length ? originalValues : [...numericValues],
    tokenOrder,
    highlights: item.highlights.filter(isMemoryHighlight),
    operation,
    leftIndex,
    rightIndex,
    previousLeftIndex,
    previousRightIndex,
    pairNumber,
    totalPairs,
    swaps,
    settledIndices,
    pairValues,
    headline,
    detail,
    equation,
  };
}
