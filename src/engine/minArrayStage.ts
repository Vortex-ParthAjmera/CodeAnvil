import type { GridHighlight, MemoryHighlight, MemoryItem, TraceAction, TraceStep } from "../types/trace";

export type MinArrayOperation = "start" | "scan" | "compare" | "update" | "complete";

export interface MinArraySceneModel {
  item: MemoryItem;
  values: number[];
  highlights: MemoryHighlight[];
  operation: MinArrayOperation;
  currentIndex: number;
  candidateIndex: number;
  previousCandidateIndex: number | null;
  checkedThrough: number;
  comparisons: number;
  comparisonResult: boolean | null;
  candidateHistory: number[];
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

function integerArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(integerValue)
    .filter((candidate): candidate is number => candidate !== null);
}

function phaseAction(step: TraceStep): TraceAction | undefined {
  return step.actions?.find(
    (action) => typeof action.phase === "string" && action.phase.startsWith("min_"),
  );
}

export function isMinArrayTraceStep(step: TraceStep): boolean {
  if (step.visual?.type !== "array") return false;
  if (step.variables.algorithm === "min-array") return true;
  return phaseAction(step) !== undefined;
}

export function getMinArraySceneModel(step: TraceStep): MinArraySceneModel | null {
  if (!isMinArrayTraceStep(step)) return null;

  const itemId = step.visual?.type === "array" ? step.visual.itemId : "arr";
  const item = step.memory?.find(
    (candidate) => candidate.type === "array" && candidate.id === itemId,
  );
  if (!item) return null;

  const values = item.value.map(numberValue);
  if (values.length === 0 || values.some((value) => value === null)) return null;

  const action = phaseAction(step);
  const phase = typeof action?.phase === "string" ? action.phase : "min_scan";
  const operation: MinArrayOperation =
    phase === "min_start"
      ? "start"
      : phase === "min_compare"
        ? "compare"
        : phase === "min_update"
          ? "update"
          : phase === "min_complete"
            ? "complete"
            : "scan";

  const fallbackCurrent = integerValue(step.variables.i) ?? 0;
  const currentIndex = integerValue(action?.currentIndex) ?? fallbackCurrent;
  const candidateIndex =
    integerValue(action?.candidateIndex) ?? integerValue(step.variables.min_idx) ?? 0;
  const previousCandidateIndex = integerValue(action?.previousCandidateIndex);
  const checkedThrough =
    integerValue(action?.checkedThrough) ?? integerValue(step.variables.checked_through) ?? 0;
  const comparisons = integerValue(step.variables.comparisons) ?? 0;
  const comparisonResult =
    operation === "compare" && typeof action?.result === "boolean" ? action.result : null;
  const candidateHistory = integerArray(
    action?.candidateHistory ?? step.variables.candidate_history,
  ).filter((index) => index >= 0 && index < values.length);
  const numericValues = values as number[];
  const currentValue = numericValues[currentIndex];
  const candidateValue = numericValues[candidateIndex];

  let headline = step.description;
  let detail = "Start with index 0 as the candidate, then scan every remaining value exactly once.";
  let equation: string | null = null;

  if (operation === "start") {
    headline = `${candidateValue} is the first candidate`;
    detail = "Nothing has been compared yet. The first value is the safest initial minimum because it belongs to the array.";
  } else if (operation === "scan") {
    headline = `Inspect index ${currentIndex}`;
    detail = `The scanner reads ${currentValue}. It must now compare that value with the candidate ${candidateValue}.`;
  } else if (operation === "compare") {
    equation = `${currentValue} < ${candidateValue}`;
    headline = comparisonResult ? "Smaller value found" : "Candidate survives";
    detail = comparisonResult
      ? `${equation} is true, so the green minimum marker will transfer to index ${currentIndex}.`
      : `${equation} is false, so index ${candidateIndex} keeps the green minimum marker.`;
  } else if (operation === "update") {
    headline = `New minimum: ${candidateValue}`;
    detail = `The marker moves from index ${previousCandidateIndex ?? "?"} to index ${candidateIndex}. The next scan compares against this lower value.`;
  } else if (operation === "complete") {
    headline = `${candidateValue} is the minimum`;
    detail = `All ${numericValues.length} values were checked. Index ${candidateIndex} survived ${comparisons} comparisons.`;
  }

  return {
    item,
    values: numericValues,
    highlights: item.highlights.filter(isMemoryHighlight),
    operation,
    currentIndex,
    candidateIndex,
    previousCandidateIndex,
    checkedThrough,
    comparisons,
    comparisonResult,
    candidateHistory: candidateHistory.length > 0 ? candidateHistory : [candidateIndex],
    headline,
    detail,
    equation,
  };
}
