import type { GridHighlight, MemoryHighlight, MemoryItem, TraceStep } from "../types/trace";

export interface ArrayTraceModel {
  item: MemoryItem;
  values: number[];
  highlights: MemoryHighlight[];
}

export type SortOperation = "start" | "compare" | "swap" | "settle" | "complete" | "scan";
export type MergeSortOperation = "start" | "split" | "compare" | "write" | "copy" | "complete";
export type QuickSortOperation = "start" | "partition" | "compare" | "keep" | "swap" | "pivot" | "single" | "complete";

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

export interface MergeSortSceneModel extends ArrayTraceModel {
  range: [number, number];
  mid: number | null;
  leftRange: [number, number] | null;
  rightRange: [number, number] | null;
  leftValues: number[];
  rightValues: number[];
  comparePair: [number, number] | null;
  compareValues: [number, number] | null;
  writingIndex: number | null;
  destinationIndex: number | null;
  sourceIndex: number | null;
  value: number | null;
  takeSide: "left" | "right" | null;
  comparisons: number | null;
  writes: number | null;
  operation: MergeSortOperation;
  headline: string;
  detail: string;
}

export interface QuickSortSceneModel extends ArrayTraceModel {
  range: [number, number];
  pivotIndex: number | null;
  pivotValue: number | null;
  boundaryIndex: number | null;
  scanIndex: number | null;
  finalIndex: number | null;
  comparePair: [number, number] | null;
  swapPair: [number, number] | null;
  sortedIndices: number[];
  comparisons: number | null;
  swaps: number | null;
  operation: QuickSortOperation;
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
  const actionPhases = new Set((step.actions ?? []).map((action) => textValue(action.phase)).filter(Boolean));
  const description = step.description.toLowerCase();

  if ([...actionPhases].some((phase) => phase?.startsWith("quick_"))) return false;

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


function rangeFrom(value: unknown): [number, number] | null {
  const pair = pairFrom(value);
  if (!pair) return null;
  const [start, end] = pair;
  if (start < 0 || end < start) return null;
  return [start, end];
}

function numericArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map(numeric).filter((item): item is number => item !== null);
}

function textValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function boundedRange(range: [number, number] | null, length: number): [number, number] | null {
  if (!range) return null;
  const start = Math.max(0, Math.min(length - 1, range[0]));
  const end = Math.max(start, Math.min(length - 1, range[1]));
  return [start, end];
}

function highlightsRange(highlights: MemoryHighlight[], role: string): [number, number] | null {
  const indices = highlights
    .filter((highlight) => highlight.role === role)
    .map((highlight) => highlight.index)
    .filter(Number.isInteger)
    .sort((a, b) => a - b);
  if (indices.length === 0) return null;
  return [indices[0], indices[indices.length - 1]];
}

function firstHighlightIndex(highlights: MemoryHighlight[], role: string): number | null {
  const hit = highlights.find((highlight) => highlight.role === role);
  return hit && Number.isInteger(hit.index) ? hit.index : null;
}

function primaryQuickAction(step: TraceStep) {
  return step.actions?.find((action) => textValue(action.phase)?.startsWith("quick_")) ?? null;
}

export function getQuickSortSceneModel(step: TraceStep): QuickSortSceneModel | null {
  const array = getArrayTraceModel(step);
  if (!array) return null;

  const action = primaryQuickAction(step);
  const actionPhase = textValue(action?.phase);
  const range = boundedRange(rangeFrom(action?.range) ?? highlightsRange(array.highlights, "range") ?? [0, array.values.length - 1], array.values.length);
  if (!range) return null;

  const pivotCandidate = numeric(action?.pivotIndex) ?? firstHighlightIndex(array.highlights, "key");
  const pivotIndex = pivotCandidate !== null && pivotCandidate >= 0 && pivotCandidate < array.values.length ? pivotCandidate : null;
  const pivotValue = numeric(action?.pivotValue) ?? (pivotIndex !== null ? array.values[pivotIndex] : null);
  const rawBoundary = numeric(action?.boundary) ?? firstHighlightIndex(array.highlights, "boundary");
  const boundaryIndex = rawBoundary !== null ? Math.max(0, Math.min(array.values.length, rawBoundary)) : null;
  const rawScan = numeric(action?.scanIndex) ?? firstHighlightIndex(array.highlights, "scan");
  const scanIndex = rawScan !== null && rawScan >= 0 && rawScan < array.values.length ? rawScan : null;
  const rawFinal = numeric(action?.finalIndex);
  const finalIndex = rawFinal !== null && rawFinal >= 0 && rawFinal < array.values.length ? rawFinal : null;
  const comparePair = getActionIndexPair(step, ["compare", "comparison"]);
  const swapPair = getActionIndexPair(step, ["swap"]);
  const sortedIndices = getSortedIndices(step);
  const comparisons = numeric(step.variables.comparisons);
  const swaps = numeric(step.variables.swaps);

  let operation: QuickSortOperation = "partition";
  if (step.event === "program_start" || actionPhase === "quick_start") operation = "start";
  else if (step.event === "program_end" || actionPhase === "quick_complete") operation = "complete";
  else if (actionPhase === "quick_compare" || step.event === "comparison") operation = "compare";
  else if (actionPhase === "quick_keep") operation = "keep";
  else if (actionPhase === "quick_swap") operation = "swap";
  else if (actionPhase === "quick_pivot") operation = "pivot";
  else if (actionPhase === "quick_single") operation = "single";

  let headline = step.description;
  let detail = "Quick Sort partitions one active range around a pivot, then recurses into the two remaining ranges.";

  if (operation === "start") {
    headline = "Quick Sort starts";
    detail = "Pick a pivot, scan the range, move smaller values left, then lock the pivot into its final slot.";
  } else if (operation === "partition") {
    headline = pivotValue !== null ? `Partition [${range[0]}..${range[1]}] around pivot ${pivotValue}` : `Partition [${range[0]}..${range[1]}]`;
    detail = boundaryIndex !== null ? `Boundary i = ${boundaryIndex}; values before it are smaller than the pivot.` : "The boundary marks where the next smaller value will land.";
  } else if (operation === "compare") {
    const scanValue = scanIndex !== null ? array.values[scanIndex] : null;
    headline = scanValue !== null && pivotValue !== null ? `Compare ${scanValue} with pivot ${pivotValue}` : step.description;
    detail =
      scanValue !== null && pivotValue !== null && scanValue < pivotValue
        ? `Smaller than pivot, so it moves to boundary slot ${boundaryIndex ?? "i"}.`
        : "Not smaller than the pivot, so it stays in the larger-or-equal zone.";
  } else if (operation === "keep") {
    headline = scanIndex !== null ? `a[${scanIndex}] already belongs left` : "Grow the smaller zone";
    detail = `Boundary advances to ${boundaryIndex ?? "the next slot"} without a visible swap.`;
  } else if (operation === "swap" && swapPair) {
    headline = `Move smaller value into slot ${swapPair[0]}`;
    detail = `Swap a[${swapPair[0]}] and a[${swapPair[1]}], then advance boundary i to ${boundaryIndex ?? "the next slot"}.`;
  } else if (operation === "pivot") {
    headline = finalIndex !== null && pivotValue !== null ? `Pivot ${pivotValue} locks at index ${finalIndex}` : "Lock the pivot";
    detail = "Everything left of the pivot is smaller; everything right is larger or equal. That pivot will not move again.";
  } else if (operation === "single") {
    headline = finalIndex !== null ? `Single index ${finalIndex} is sorted` : "Single value is sorted";
    detail = "A one-element partition is already done, so recursion returns.";
  } else if (operation === "complete") {
    headline = "Array sorted";
    detail = step.description;
  }

  return {
    ...array,
    range,
    pivotIndex,
    pivotValue,
    boundaryIndex,
    scanIndex,
    finalIndex,
    comparePair,
    swapPair,
    sortedIndices,
    comparisons,
    swaps,
    operation,
    headline,
    detail,
  };
}

export function isQuickSortTraceStep(step: TraceStep): boolean {
  if (step.visual?.type !== "array") return false;
  const model = getQuickSortSceneModel(step);
  if (!model || model.item.id !== "arr" || model.values.length < 2) return false;

  const phases = new Set((step.actions ?? []).map((action) => textValue(action.phase)).filter(Boolean));
  const description = step.description.toLowerCase();

  return [...phases].some((phase) => phase?.startsWith("quick_")) || description.includes("quick sort");
}

function primaryMergeAction(step: TraceStep) {
  return (
    step.actions?.find((action) => textValue(action.phase) === "merge_compare") ??
    step.actions?.find((action) => textValue(action.phase) === "merge_write" || textValue(action.phase) === "merge_copy") ??
    step.actions?.find((action) => action.type === "merge_split") ??
    step.actions?.find((action) => action.type === "array_write" && rangeFrom(action.range)) ??
    null
  );
}

export function getMergeSortSceneModel(step: TraceStep): MergeSortSceneModel | null {
  const array = getArrayTraceModel(step);
  if (!array) return null;

  const action = primaryMergeAction(step);
  const actionPhase = textValue(action?.phase);
  const actionRange = rangeFrom(action?.range);
  const highlightRange = highlightsRange(array.highlights, "range");
  const range = boundedRange(actionRange ?? highlightRange ?? [0, array.values.length - 1], array.values.length);
  if (!range) return null;

  const midRaw = numeric(action?.mid);
  const mid = midRaw !== null && midRaw >= range[0] && midRaw < range[1] ? midRaw : null;
  const leftRange = boundedRange(rangeFrom(action?.leftRange) ?? (mid !== null ? [range[0], mid] : null), array.values.length);
  const rightRange = boundedRange(rangeFrom(action?.rightRange) ?? (mid !== null ? [mid + 1, range[1]] : null), array.values.length);
  const comparePair = getActionIndexPair(step, ["compare", "comparison"]);
  const compareValues = pairFrom(action?.values);
  const writingIndex = numeric(action?.index);
  const destinationIndex = numeric(action?.destination) ?? writingIndex;
  const sourceIndex = numeric(action?.sourceIndex);
  const value = numeric(action?.value) ?? (writingIndex !== null ? array.values[writingIndex] : null);
  const take = textValue(action?.take);
  const takeSide = take === "left" || take === "right" ? take : null;
  const comparisons = numeric(step.variables.comparisons);
  const writes = numeric(step.variables.writes);

  let operation: MergeSortOperation = "split";
  if (step.event === "program_start" || actionPhase === "merge_start") operation = "start";
  else if (step.event === "program_end" || actionPhase === "merge_complete") operation = "complete";
  else if (actionPhase === "merge_compare" || step.event === "comparison") operation = "compare";
  else if (actionPhase === "merge_write") operation = "write";
  else if (actionPhase === "merge_copy") operation = "copy";

  const leftValues = numericArray(action?.leftValues);
  const rightValues = numericArray(action?.rightValues);
  const fallbackLeftValues = leftRange ? array.values.slice(leftRange[0], leftRange[1] + 1) : [];
  const fallbackRightValues = rightRange ? array.values.slice(rightRange[0], rightRange[1] + 1) : [];

  let headline = step.description;
  let detail = "Merge Sort keeps each half sorted, then writes the smaller front value into the output window.";

  if (operation === "start") {
    headline = "Merge Sort starts";
    detail = "First split the array into smaller runs. The merge phase rebuilds each range in sorted order.";
  } else if (operation === "split") {
    headline = mid !== null ? `Split [${range[0]}..${range[1]}] at mid ${mid}` : `Split [${range[0]}..${range[1]}]`;
    detail = "The active range is divided into a left run and a right run before recursion continues.";
  } else if (operation === "compare" && compareValues) {
    const side = takeSide ?? "smaller";
    headline = `Compare ${compareValues[0]} vs ${compareValues[1]}`;
    detail = destinationIndex !== null ? `Take from the ${side} run and aim it at output slot ${destinationIndex}.` : `Take from the ${side} run.`;
  } else if ((operation === "write" || operation === "copy") && writingIndex !== null) {
    headline = operation === "copy" ? `Copy ${value ?? array.values[writingIndex]} to a[${writingIndex}]` : `Write ${value ?? array.values[writingIndex]} to a[${writingIndex}]`;
    detail =
      operation === "copy"
        ? "One run is empty, so the remaining values can slide straight into the output window."
        : "The selected value is committed into the active merge range.";
  } else if (operation === "complete") {
    headline = "Array sorted";
    detail = step.description;
  }

  return {
    ...array,
    range,
    mid,
    leftRange,
    rightRange,
    leftValues: leftValues.length ? leftValues : fallbackLeftValues,
    rightValues: rightValues.length ? rightValues : fallbackRightValues,
    comparePair,
    compareValues,
    writingIndex,
    destinationIndex,
    sourceIndex,
    value,
    takeSide,
    comparisons,
    writes,
    operation,
    headline,
    detail,
  };
}

export function isMergeSortTraceStep(step: TraceStep): boolean {
  if (step.visual?.type !== "array") return false;
  const model = getMergeSortSceneModel(step);
  if (!model || model.item.id !== "arr" || model.values.length < 2) return false;

  const actionTypes = new Set((step.actions ?? []).map((action) => action.type));
  const phases = new Set((step.actions ?? []).map((action) => textValue(action.phase)).filter(Boolean));
  const description = step.description.toLowerCase();

  return (
    actionTypes.has("merge_split") ||
    phases.has("merge_compare") ||
    phases.has("merge_write") ||
    phases.has("merge_copy") ||
    phases.has("merge_start") ||
    phases.has("merge_complete") ||
    description.includes("merge sort")
  );
}
