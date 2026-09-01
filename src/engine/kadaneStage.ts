import type { GridHighlight, MemoryHighlight, MemoryItem, TraceAction, TraceStep } from "../types/trace";

export type KadaneOperation =
  | "start"
  | "choice"
  | "extend"
  | "restart"
  | "best-update"
  | "best-hold"
  | "complete";

export interface KadaneSceneModel {
  item: MemoryItem;
  values: number[];
  highlights: MemoryHighlight[];
  operation: KadaneOperation;
  activeIndex: number;
  currentStart: number;
  currentEnd: number;
  previousCurrentStart: number | null;
  previousCurrentEnd: number | null;
  bestStart: number;
  bestEnd: number;
  previousBestStart: number | null;
  previousBestEnd: number | null;
  currentSum: number;
  previousCurrentSum: number | null;
  extendedSum: number | null;
  bestSum: number;
  previousBestSum: number | null;
  currentValue: number;
  shouldRestart: boolean | null;
  decisionChecks: number;
  bestChecks: number;
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

function phaseAction(step: TraceStep): TraceAction | undefined {
  return step.actions?.find(
    (action) => typeof action.phase === "string" && action.phase.startsWith("kadane_"),
  );
}

function operationForPhase(phase: string): KadaneOperation {
  if (phase === "kadane_start") return "start";
  if (phase === "kadane_choice") return "choice";
  if (phase === "kadane_extend") return "extend";
  if (phase === "kadane_restart") return "restart";
  if (phase === "kadane_best_update") return "best-update";
  if (phase === "kadane_best_hold") return "best-hold";
  if (phase === "kadane_complete") return "complete";
  return "choice";
}

export function isKadaneTraceStep(step: TraceStep): boolean {
  if (step.visual?.type !== "array") return false;
  if (step.variables.algorithm === "kadane") return true;
  return phaseAction(step) !== undefined;
}

export function getKadaneSceneModel(step: TraceStep): KadaneSceneModel | null {
  if (!isKadaneTraceStep(step)) return null;

  const itemId = step.visual?.type === "array" ? step.visual.itemId : "arr";
  const item = step.memory?.find(
    (candidate) => candidate.type === "array" && candidate.id === itemId,
  );
  if (!item) return null;

  const values = item.value.map(numberValue);
  if (values.length === 0 || values.some((value) => value === null)) return null;

  const numericValues = values as number[];
  const action = phaseAction(step);
  const phase = typeof action?.phase === "string" ? action.phase : "kadane_choice";
  const operation = operationForPhase(phase);
  const activeIndex = integerValue(action?.activeIndex) ?? integerValue(step.variables.i) ?? 0;
  const currentStart = integerValue(action?.currentStart) ?? integerValue(step.variables.current_start) ?? 0;
  const currentEnd = integerValue(action?.currentEnd) ?? integerValue(step.variables.current_end) ?? activeIndex;
  const previousCurrentStart = integerValue(action?.previousCurrentStart);
  const previousCurrentEnd = integerValue(action?.previousCurrentEnd);
  const bestStart = integerValue(action?.bestStart) ?? integerValue(step.variables.best_start) ?? 0;
  const bestEnd = integerValue(action?.bestEnd) ?? integerValue(step.variables.best_end) ?? 0;
  const previousBestStart = integerValue(action?.previousBestStart);
  const previousBestEnd = integerValue(action?.previousBestEnd);
  const currentSum = numberValue(action?.currentSum) ?? numberValue(step.variables.current_sum) ?? numericValues[activeIndex] ?? 0;
  const previousCurrentSum = numberValue(action?.previousCurrentSum);
  const extendedSum = numberValue(action?.extendedSum);
  const bestSum = numberValue(action?.bestSum) ?? numberValue(step.variables.best_sum) ?? currentSum;
  const previousBestSum = numberValue(action?.previousBestSum);
  const currentValue = numericValues[activeIndex] ?? 0;
  const shouldRestart = typeof action?.shouldRestart === "boolean"
    ? action.shouldRestart
    : operation === "choice" && typeof action?.result === "boolean"
      ? action.result
      : null;
  const decisionChecks = integerValue(action?.decisionChecks) ?? integerValue(step.variables.decision_checks) ?? 0;
  const bestChecks = integerValue(action?.bestChecks) ?? integerValue(step.variables.best_checks) ?? 0;

  let headline = "Track a running range";
  let detail = "At every value, Kadane keeps the stronger choice: start here or extend the previous subarray.";
  let equation: string | null = null;

  if (operation === "start") {
    headline = `Start with ${currentSum}`;
    detail = "Both the running sum and best sum begin at arr[0], which keeps all-negative arrays correct.";
    equation = `current = best = ${currentSum}`;
  } else if (operation === "choice") {
    headline = shouldRestart ? "Starting fresh is stronger" : "Extending is stronger";
    detail = shouldRestart
      ? `${currentValue} beats the extension ${extendedSum}. The orange running range should collapse to index ${activeIndex}.`
      : `${extendedSum} keeps more value than restarting at ${currentValue}. Keep the running range connected.`;
    equation = `max(${currentValue}, ${previousCurrentSum} + ${currentValue})`;
  } else if (operation === "restart") {
    headline = `Restart at index ${activeIndex}`;
    detail = `The previous running range was harmful. Begin a new candidate with sum ${currentSum}.`;
    equation = `current = ${currentValue}`;
  } else if (operation === "extend") {
    headline = `Extend through index ${activeIndex}`;
    detail = `The running range is now [${currentStart}..${currentEnd}], carrying a sum of ${currentSum}.`;
    equation = `${previousCurrentSum} + ${currentValue} = ${currentSum}`;
  } else if (operation === "best-update") {
    headline = `New best: ${bestSum}`;
    detail = `Copy the orange running range [${currentStart}..${currentEnd}] into the green best-so-far record.`;
    equation = `${currentSum} > ${previousBestSum}`;
  } else if (operation === "best-hold") {
    headline = `Best ${bestSum} survives`;
    detail = `The running sum ${currentSum} cannot beat the stored best range [${bestStart}..${bestEnd}].`;
    equation = `${currentSum} <= ${bestSum}`;
  } else if (operation === "complete") {
    headline = `Maximum sum: ${bestSum}`;
    detail = `Indices [${bestStart}..${bestEnd}] form the strongest contiguous subarray: [${numericValues.slice(bestStart, bestEnd + 1).join(", ")}].`;
    equation = `best = ${bestSum}`;
  }

  return {
    item,
    values: numericValues,
    highlights: item.highlights.filter(isMemoryHighlight),
    operation,
    activeIndex,
    currentStart,
    currentEnd,
    previousCurrentStart,
    previousCurrentEnd,
    bestStart,
    bestEnd,
    previousBestStart,
    previousBestEnd,
    currentSum,
    previousCurrentSum,
    extendedSum,
    bestSum,
    previousBestSum,
    currentValue,
    shouldRestart,
    decisionChecks,
    bestChecks,
    headline,
    detail,
    equation,
  };
}
