import type { TraceStep } from "../types/trace";
import { getArrayTraceModel } from "./sortStage";

export type BinarySearchOperation =
  | "start"
  | "target"
  | "range"
  | "check"
  | "probe"
  | "compare"
  | "discard-left"
  | "discard-right"
  | "found"
  | "not-found"
  | "complete";

export interface BinarySearchCell {
  index: number;
  value: number;
  role: string;
  inRange: boolean;
  isMid: boolean;
  isTarget: boolean;
  isDiscarded: boolean;
  discardedSide: "left" | "right" | null;
}

export interface BinarySearchSceneModel {
  values: number[];
  cells: BinarySearchCell[];
  target: number | null;
  low: number | null;
  high: number | null;
  mid: number | null;
  probes: number | null;
  operation: BinarySearchOperation;
  headline: string;
  detail: string;
  rangeLabel: string;
  compareLabel: string;
  foundIndex: number | null;
}

function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && value !== "—") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function changed(step: TraceStep, variable: string): boolean {
  return step.changed?.variables?.includes(variable) ?? false;
}

function textOf(step: TraceStep): string {
  return step.description.toLowerCase();
}

function foundIndexFromOutput(output: string): number | null {
  const match = /index\s+(\d+)/i.exec(output);
  if (!match) return null;
  return Number(match[1]);
}

export function isBinarySearchTraceStep(step: TraceStep): boolean {
  if (step.visual?.type !== "array") return false;
  const array = getArrayTraceModel(step);
  if (!array || array.item.id !== "arr" || array.values.length < 2) return false;

  const hasTarget = numeric(step.variables.target) !== null;
  const hasBounds =
    numeric(step.variables.low) !== null ||
    numeric(step.variables.high) !== null ||
    numeric(step.variables.mid) !== null ||
    numeric(step.variables.probes) !== null;
  const hasPointerPair =
    numeric(step.variables.l) !== null ||
    numeric(step.variables.r) !== null ||
    numeric(step.variables.left) !== null ||
    numeric(step.variables.right) !== null;
  const valuesAreSorted = array.values.every((value, index, values) => index === 0 || values[index - 1] <= value);
  const description = textOf(step);
  const hasBinarySearchText = description.includes("binary search") || description.includes("search range");
  const hasSortedSetupText =
    valuesAreSorted &&
    description.includes("sorted") &&
    (description.includes("list") || description.includes("array") || description.includes("search"));

  return hasTarget && !hasPointerPair && (hasBounds || hasBinarySearchText || hasSortedSetupText);
}

export function getBinarySearchSceneModel(step: TraceStep): BinarySearchSceneModel | null {
  if (!isBinarySearchTraceStep(step)) return null;
  const array = getArrayTraceModel(step);
  if (!array) return null;

  const values = array.values;
  const target = numeric(step.variables.target);
  const low = numeric(step.variables.low);
  const high = numeric(step.variables.high);
  const mid = numeric(step.variables.mid);
  const probes = numeric(step.variables.probes);
  const description = textOf(step);
  const outputIndex = foundIndexFromOutput(step.output);
  const targetIndex = target === null ? null : values.findIndex((value) => value === target);
  const foundIndex = outputIndex ?? (step.event === "program_end" && step.output ? targetIndex : null);
  const rangeLow = low ?? 0;
  const rangeHigh = high ?? values.length - 1;
  const rangeValid = rangeLow <= rangeHigh;
  const highlightByIndex = new Map(array.highlights.map((highlight) => [highlight.index, highlight.role]));

  let operation: BinarySearchOperation = "check";
  if (step.event === "program_start") operation = "start";
  else if (step.event === "output_write") operation = "found";
  else if (step.event === "program_end" && foundIndex !== null && foundIndex >= 0) operation = "complete";
  else if (step.event === "program_end" || (low !== null && high !== null && low > high)) operation = "not-found";
  else if (changed(step, "target")) operation = "target";
  else if (changed(step, "low") && description.includes("discard")) operation = "discard-left";
  else if (changed(step, "high") && description.includes("discard")) operation = "discard-right";
  else if (changed(step, "low") || changed(step, "high")) operation = "range";
  else if (changed(step, "mid") || step.event === "array_read") operation = "probe";
  else if (step.event === "comparison") operation = description.includes("found") || description.includes("== target") ? "found" : "compare";
  else if (step.event === "loop_iteration") operation = "check";

  const discardedLeftLimit =
    operation === "discard-left" && low !== null ? low - 1 : rangeValid ? rangeLow - 1 : values.length - 1;
  const discardedRightStart =
    operation === "discard-right" && high !== null ? high + 1 : rangeValid ? rangeHigh + 1 : 0;

  const cells = values.map((value, index) => {
    const inRange = rangeValid && index >= rangeLow && index <= rangeHigh;
    const isMid = mid === index || highlightByIndex.get(index) === "mid";
    const isTarget = target !== null && value === target;
    const discardedSide: BinarySearchCell["discardedSide"] =
      index <= discardedLeftLimit ? "left" : index >= discardedRightStart ? "right" : null;
    return {
      index,
      value,
      role: highlightByIndex.get(index) ?? (isMid ? "mid" : inRange ? "range" : "out"),
      inRange,
      isMid,
      isTarget,
      isDiscarded: !inRange,
      discardedSide,
    };
  });

  const rawMidValue = mid !== null ? values[mid] : undefined;
  const midValue = typeof rawMidValue === "number" ? rawMidValue : null;
  const rangeLabel =
    low !== null && high !== null
      ? low <= high
        ? `[${low}..${high}]`
        : `${low} > ${high}`
      : "[all]";
  const compareLabel =
    mid !== null && midValue !== null && target !== null
      ? `${midValue} ${midValue === target ? "=" : midValue < target ? "<" : ">"} ${target}`
      : "waiting";

  let headline = step.description;
  let detail = "Binary Search keeps only the half that can still contain the target.";

  if (operation === "start") {
    headline = "Binary Search starts";
    detail = "The array is sorted, so each probe can discard half of the remaining values.";
  } else if (operation === "target") {
    headline = target === null ? "Set the target" : `Target = ${target}`;
    detail = "Every mid probe will compare against this target value.";
  } else if (operation === "range") {
    headline = "Set the search window";
    detail = `The current possible range is ${rangeLabel}.`;
  } else if (operation === "check") {
    headline = "Check whether the window is open";
    detail = low !== null && high !== null ? `Continue while low <= high, here ${low} <= ${high}.` : step.description;
  } else if (operation === "probe") {
    headline = mid !== null ? `Probe mid index ${mid}` : "Probe the middle";
    detail = mid !== null && midValue !== null ? `mid splits the active window. arr[${mid}] = ${midValue}.` : step.description;
  } else if (operation === "compare") {
    headline = "Compare mid with target";
    detail =
      midValue !== null && target !== null && midValue < target
        ? `${midValue} is smaller than ${target}, so the target can only be to the right.`
        : midValue !== null && target !== null
          ? `${midValue} is larger than ${target}, so the target can only be to the left.`
          : step.description;
  } else if (operation === "discard-left") {
    headline = "Discard the left half";
    detail = `Everything before low is too small. New search window: ${rangeLabel}.`;
  } else if (operation === "discard-right") {
    headline = "Discard the right half";
    detail = `Everything after high is too large. New search window: ${rangeLabel}.`;
  } else if (operation === "found") {
    headline = foundIndex !== null && foundIndex >= 0 ? `Found target at index ${foundIndex}` : "Target found";
    detail = midValue !== null && target !== null ? `The mid value equals the target: ${midValue} = ${target}.` : step.description;
  } else if (operation === "not-found") {
    headline = "Search window collapsed";
    detail = low !== null && high !== null ? `low moved past high (${low} > ${high}), so the target is not present.` : step.description;
  } else if (operation === "complete") {
    headline = "Binary Search complete";
    detail = step.output || step.description;
  }

  return {
    values,
    cells,
    target,
    low,
    high,
    mid,
    probes,
    operation,
    headline,
    detail,
    rangeLabel,
    compareLabel,
    foundIndex: foundIndex !== null && foundIndex >= 0 ? foundIndex : null,
  };
}
