import type { GridHighlight, MemoryHighlight, MemoryItem, TraceStep } from "../types/trace";

export interface ArrayTraceModel {
  item: MemoryItem;
  values: number[];
  highlights: MemoryHighlight[];
}

export type SortOperation = "start" | "compare" | "swap" | "settle" | "complete" | "scan";

export interface BubbleSortSceneModel extends ArrayTraceModel {
  comparePair: [number, number] | null;
  swapPair: [number, number] | null;
  activePair: [number, number] | null;
  sortedIndices: number[];
  comparisons: number | null;
  swaps: number | null;
  operation: SortOperation;
  headline: string;
  detail: string;
}

function isMemoryHighlight(highlight: MemoryHighlight | GridHighlight): highlight is MemoryHighlight {
  return "index" in highlight;
}

function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pairFrom(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const left = numeric(value[0]);
  const right = numeric(value[1]);
  if (left === null || right === null) return null;
  if (!Number.isInteger(left) || !Number.isInteger(right)) return null;
  return [left, right];
}

export function getArrayTraceModel(step: TraceStep): ArrayTraceModel | null {
  const preferredId = step.visual?.type === "array" ? step.visual.itemId : null;
  const item =
    step.memory?.find((candidate) => candidate.type === "array" && (!preferredId || candidate.id === preferredId)) ??
    null;

  if (!item) return null;

  const values = item.value.map(numeric);
  if (values.some((value) => value === null)) return null;

  return {
    item,
    values: values as number[],
    highlights: item.highlights.filter(isMemoryHighlight),
  };
}

export function getActionIndexPair(step: TraceStep, actionTypes: string[]): [number, number] | null {
  const accepted = new Set(actionTypes);

  for (const action of step.actions ?? []) {
    if (!accepted.has(action.type)) continue;
    const pair = pairFrom(action.indices) ?? pairFrom(action.items);
    if (pair) return pair;
  }

  return null;
}

export function getHighlightIndexPair(highlights: MemoryHighlight[], role: string): [number, number] | null {
  const indices = highlights
    .filter((highlight) => highlight.role === role)
    .map((highlight) => highlight.index)
    .filter((index) => Number.isInteger(index))
    .slice(0, 2);

  return indices.length === 2 ? [indices[0], indices[1]] : null;
}

export function getSortedIndices(step: TraceStep): number[] {
  const array = getArrayTraceModel(step);
  if (!array) return [];

  return [...new Set(array.highlights.filter((highlight) => highlight.role === "sorted").map((highlight) => highlight.index))]
    .filter((index) => index >= 0 && index < array.values.length)
    .sort((a, b) => a - b);
}

export function getBubbleSortSceneModel(step: TraceStep): BubbleSortSceneModel | null {
  const array = getArrayTraceModel(step);
  if (!array) return null;

  const comparePair =
    getActionIndexPair(step, ["compare", "comparison"]) ?? getHighlightIndexPair(array.highlights, "compare");
  const swapPair = getActionIndexPair(step, ["swap"]) ?? getHighlightIndexPair(array.highlights, "swap");
  const activePair = swapPair ?? comparePair;
  const sortedIndices = getSortedIndices(step);
  const comparisons = numeric(step.variables.comparisons);
  const swaps = numeric(step.variables.swaps);

  let operation: SortOperation = "scan";
  if (step.event === "program_start") operation = "start";
  else if (step.event === "program_end") operation = "complete";
  else if (swapPair) operation = "swap";
  else if (comparePair) operation = "compare";
  else if (sortedIndices.length > 0) operation = "settle";

  let headline = step.description;
  let detail = "The trace advances one recorded operation at a time.";

  if (operation === "compare" && activePair) {
    const [left, right] = activePair;
    const leftValue = array.values[left];
    const rightValue = array.values[right];
    headline = `Compare a[${left}] = ${leftValue} with a[${right}] = ${rightValue}`;
    detail =
      leftValue > rightValue
        ? "Left is larger, so Bubble Sort will swap this pair."
        : "This pair is already ordered, so the scan moves right.";
  } else if (operation === "swap" && activePair) {
    const [left, right] = activePair;
    headline = `Swap indices ${left} and ${right}`;
    detail = "The larger value lands on the right lane, moving toward the sorted tail.";
  } else if (operation === "settle") {
    headline = "Lock the sorted tail";
    detail = step.description;
  } else if (operation === "complete") {
    headline = "Array sorted";
    detail = step.description;
  } else if (operation === "start") {
    headline = "Bubble Sort starts";
    detail = step.description;
  }

  return {
    ...array,
    comparePair,
    swapPair,
    activePair,
    sortedIndices,
    comparisons,
    swaps,
    operation,
    headline,
    detail,
  };
}

export function isBubbleSortTraceStep(step: TraceStep): boolean {
  if (step.visual?.type !== "array") return false;

  const model = getBubbleSortSceneModel(step);
  if (!model || model.values.length < 2 || model.item.id !== "arr") return false;

  const hasCounters = model.comparisons !== null && model.swaps !== null;
  const hasAdjacentMotion = model.activePair ? Math.abs(model.activePair[0] - model.activePair[1]) === 1 : false;
  const actionTypes = new Set((step.actions ?? []).map((action) => action.type));
  const description = step.description.toLowerCase();

  return (
    description.includes("bubble") ||
    (hasCounters &&
      (hasAdjacentMotion ||
        model.sortedIndices.length > 0 ||
        actionTypes.has("swap") ||
        actionTypes.has("compare") ||
        actionTypes.has("comparison") ||
        step.event === "program_end"))
  );
}
