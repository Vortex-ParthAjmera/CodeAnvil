import type { MemoryItem, TraceAction, TraceStep } from "../types/trace";

export type MergeIntervalsOperation = "start" | "invalid" | "validate" | "sort" | "seed" | "compare" | "merge" | "commit" | "complete";
export type IntervalRole = "pending" | "active" | "overlap" | "processed" | "invalid";

export interface IntervalTokenModel {
  id: string;
  start: number;
  end: number;
  index: number;
  originalIndex: number;
  role: IntervalRole;
}

export interface MergedSegmentModel {
  id: string;
  start: number;
  end: number;
  contributors: string[];
  active: boolean;
}

export interface MergeIntervalsSceneModel {
  item: MemoryItem;
  mergedItem: MemoryItem | null;
  operation: MergeIntervalsOperation;
  originalIntervals: Array<[number, number]>;
  tokens: IntervalTokenModel[];
  mergedSegments: MergedSegmentModel[];
  sortedReady: boolean;
  activeIndex: number | null;
  activeMergedIndex: number | null;
  overlap: boolean | null;
  previousEnd: number | null;
  nextEnd: number | null;
  comparisons: number;
  merges: number;
  commits: number;
  domain: [number, number];
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

function intervalArray(value: unknown): Array<[number, number]> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!Array.isArray(candidate) || candidate.length !== 2) return [];
    const start = finite(candidate[0]);
    const end = finite(candidate[1]);
    return start === null || end === null ? [] : [[start, end] as [number, number]];
  });
}

function phaseAction(step: TraceStep): TraceAction | undefined {
  return step.actions?.find((action) => typeof action.phase === "string" && action.phase.startsWith("interval_"));
}

function operationFor(phase: string): MergeIntervalsOperation {
  const value = phase.replace("interval_", "");
  return (["start", "invalid", "validate", "sort", "seed", "compare", "merge", "commit", "complete"] as const).includes(value as MergeIntervalsOperation)
    ? value as MergeIntervalsOperation
    : "start";
}

export function isMergeIntervalsTraceStep(step: TraceStep): boolean {
  return Boolean(phaseAction(step));
}

export function getMergeIntervalsSceneModel(step: TraceStep): MergeIntervalsSceneModel | null {
  const action = phaseAction(step);
  if (!action) return null;
  const item = step.memory?.find((entry) => entry.id === "intervals") ?? step.memory?.[0];
  if (!item) return null;
  const mergedItem = step.memory?.find((entry) => entry.id === "merged") ?? null;
  const originalIntervals = intervalArray(action.originalIntervals);
  const activeIndex = integer(action.activeIndex);
  const activeMergedIndex = integer(action.activeMergedIndex);
  const overlap = typeof action.overlap === "boolean" ? action.overlap : null;
  const operation = operationFor(String(action.phase));
  const rawTokens = Array.isArray(action.sortedTokens) ? action.sortedTokens : [];
  const tokens = rawTokens.flatMap((candidate, fallbackIndex) => {
    if (!candidate || typeof candidate !== "object") return [];
    const record = candidate as Record<string, unknown>;
    const start = finite(record.start);
    const end = finite(record.end);
    const index = integer(record.index) ?? fallbackIndex;
    if (start === null || end === null || typeof record.id !== "string") return [];
    let role: IntervalRole = activeIndex !== null && index < activeIndex ? "processed" : "pending";
    if (operation === "invalid") role = "invalid";
    else if (index === activeIndex) role = overlap ? "overlap" : "active";
    return [{ id: record.id, start, end, index, originalIndex: integer(record.originalIndex) ?? index, role }];
  });
  const rawMerged = Array.isArray(action.mergedSegments) ? action.mergedSegments : [];
  const mergedSegments = rawMerged.flatMap((candidate, index) => {
    if (!candidate || typeof candidate !== "object") return [];
    const record = candidate as Record<string, unknown>;
    const start = finite(record.start);
    const end = finite(record.end);
    if (start === null || end === null || typeof record.id !== "string") return [];
    const contributors = Array.isArray(record.contributors) ? record.contributors.filter((entry): entry is string => typeof entry === "string") : [];
    return [{ id: record.id, start, end, contributors, active: index === activeMergedIndex }];
  });
  const endpoints = [...originalIntervals.flat(), ...tokens.flatMap((token) => [token.start, token.end])];
  const min = endpoints.length ? Math.min(...endpoints) : 0;
  const max = endpoints.length ? Math.max(...endpoints) : 1;
  const pad = Math.max(0.5, (max - min) * 0.06);
  const previousEnd = finite(action.previousEnd);
  const nextEnd = finite(action.nextEnd);
  const comparisons = integer(action.comparisons) ?? 0;
  const merges = integer(action.merges) ?? 0;
  const commits = integer(action.commits) ?? 0;
  const invalidReason = typeof action.invalidReason === "string" ? action.invalidReason : null;

  let headline = "Place every interval on one timeline";
  let detail = "Sorting by start ensures only the latest merged span can overlap the next candidate.";
  let equation = "sort by (start, end)";
  let actionLabel = operation;
  if (operation === "invalid") {
    headline = "Interval sweep stopped";
    detail = invalidReason ?? "The input is invalid.";
    equation = "start <= end required";
  } else if (operation === "sort") {
    headline = "Sort intervals by their left edge";
    detail = "The scanner can now move in one direction without revisiting an earlier interval.";
  } else if (operation === "seed") {
    headline = "Seed the first merged span";
    detail = mergedSegments[0] ? `[${mergedSegments[0].start}, ${mergedSegments[0].end}] becomes the active output tail.` : "Create the active output tail.";
    equation = "merged = [first interval]";
  } else if (operation === "compare") {
    const candidate = activeIndex === null ? null : tokens.find((token) => token.index === activeIndex);
    headline = overlap ? "Overlap found: combine the spans" : "Gap found: start a new span";
    detail = candidate && previousEnd !== null ? `Candidate start ${candidate.start} ${overlap ? "does not pass" : "passes"} active end ${previousEnd}.` : "Compare the next start with the active end.";
    equation = candidate && previousEnd !== null ? `${candidate.start} <= ${previousEnd} -> ${overlap ? "true" : "false"}` : "next.start <= active.end";
  } else if (operation === "merge") {
    headline = "Extend or absorb the overlapping interval";
    detail = `The active right edge becomes max(${previousEnd ?? "?"}, candidate end) = ${nextEnd ?? "?"}.`;
    equation = `end = max(${previousEnd ?? "?"}, ${nextEnd ?? "?"}) = ${nextEnd ?? "?"}`;
  } else if (operation === "commit") {
    headline = "Commit a new disjoint span";
    detail = "The gap proves the previous span is final; the candidate becomes the new active tail.";
    equation = "merged.push(candidate)";
  } else if (operation === "complete") {
    headline = `${tokens.length} intervals collapse into ${mergedSegments.length}`;
    detail = `The output spans are disjoint and cover exactly the same points after ${comparisons} comparisons.`;
    equation = mergedSegments.map((segment) => `[${segment.start}, ${segment.end}]`).join("  ");
    actionLabel = "complete";
  }

  return {
    item,
    mergedItem,
    operation,
    originalIntervals,
    tokens,
    mergedSegments,
    sortedReady: action.sortedReady === true,
    activeIndex,
    activeMergedIndex,
    overlap,
    previousEnd,
    nextEnd,
    comparisons,
    merges,
    commits,
    domain: [min - pad, max + pad],
    invalidReason,
    headline,
    detail,
    equation,
    actionLabel,
    resultLabel: operation === "invalid" ? "invalid" : `${mergedSegments.length} spans`,
  };
}
