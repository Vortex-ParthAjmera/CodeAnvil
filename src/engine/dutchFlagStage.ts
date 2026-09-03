import type { MemoryItem, TraceAction, TraceStep } from "../types/trace";

export type DutchFlagOperation =
  | "start"
  | "invalid"
  | "validate"
  | "initialize"
  | "inspect-zero"
  | "inspect-one"
  | "inspect-two"
  | "place-zero"
  | "place-two"
  | "advance-zero"
  | "advance-one"
  | "retreat-high"
  | "complete";

export type DutchFlagTokenRole =
  | "zero-zone"
  | "one-zone"
  | "unknown-zone"
  | "two-zone"
  | "current"
  | "swap"
  | "invalid";

export interface DutchFlagTokenModel {
  id: string;
  value: number;
  originalIndex: number;
  position: number;
  role: DutchFlagTokenRole;
}

export interface DutchFlagSceneModel {
  item: MemoryItem;
  operation: DutchFlagOperation;
  originalValues: number[];
  values: number[];
  tokens: DutchFlagTokenModel[];
  low: number;
  mid: number;
  high: number;
  inspectedValue: number | null;
  decision: "zero" | "one" | "two" | null;
  swapIndices: [number, number] | null;
  pointerFrom: [number, number, number] | null;
  pointerTo: [number, number, number] | null;
  invalidValues: number[];
  inspections: number;
  swaps: number;
  zones: {
    zeros: [number, number] | null;
    ones: [number, number] | null;
    unknown: [number, number] | null;
    twos: [number, number] | null;
  };
  headline: string;
  detail: string;
  equation: string | null;
  actionLabel: string;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function integer(value: unknown): number | null {
  const parsed = finiteNumber(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function numberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map(finiteNumber).filter((entry): entry is number => entry !== null);
}

function integerTuple<T extends number[]>(value: unknown, length: number): T | null {
  const values = numberArray(value);
  if (values.length !== length || !values.every(Number.isInteger)) return null;
  return values as T;
}

function phaseAction(step: TraceStep): TraceAction | undefined {
  return step.actions?.find(
    (action) => typeof action.phase === "string" && action.phase.startsWith("dnf_"),
  );
}

function operationForPhase(phase: string): DutchFlagOperation {
  const operations: Record<string, DutchFlagOperation> = {
    dnf_start: "start",
    dnf_invalid: "invalid",
    dnf_validate: "validate",
    dnf_initialize: "initialize",
    dnf_inspect_zero: "inspect-zero",
    dnf_inspect_one: "inspect-one",
    dnf_inspect_two: "inspect-two",
    dnf_place_zero: "place-zero",
    dnf_place_two: "place-two",
    dnf_advance_zero: "advance-zero",
    dnf_advance_one: "advance-one",
    dnf_retreat_high: "retreat-high",
    dnf_complete: "complete",
  };
  return operations[phase] ?? "start";
}

function parseTokens(value: unknown): Array<{
  id: string;
  value: number;
  originalIndex: number;
  position: number;
}> {
  if (!Array.isArray(value)) return [];
  const parsed = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const record = candidate as Record<string, unknown>;
    const tokenValue = finiteNumber(record.value);
    const originalIndex = integer(record.originalIndex);
    const position = integer(record.position);
    if (typeof record.id !== "string" || tokenValue === null || originalIndex === null || position === null) continue;
    parsed.push({ id: record.id, value: tokenValue, originalIndex, position });
  }
  return parsed;
}

function range(start: number, end: number): [number, number] | null {
  return start <= end ? [start, end] : null;
}

export function isDutchFlagTraceStep(step: TraceStep): boolean {
  if (step.visual?.type !== "array") return false;
  if (step.variables.algorithm === "dutch-national-flag") return true;
  return phaseAction(step) !== undefined;
}

export function getDutchFlagSceneModel(step: TraceStep): DutchFlagSceneModel | null {
  if (!isDutchFlagTraceStep(step)) return null;
  const itemId = step.visual?.type === "array" ? step.visual.itemId : "arr";
  const item = step.memory?.find((candidate) => candidate.id === itemId && candidate.type === "array");
  if (!item) return null;

  const action = phaseAction(step);
  if (!action) return null;
  const operation = operationForPhase(typeof action.phase === "string" ? action.phase : "dnf_start");
  const originalValues = numberArray(action.originalValues);
  const values = numberArray(action.values);
  const rawTokens = parseTokens(action.tokens);
  if (rawTokens.length !== values.length || originalValues.length !== values.length) return null;

  const low = integer(action.low) ?? 0;
  const mid = integer(action.mid) ?? 0;
  const high = integer(action.high) ?? values.length - 1;
  const inspectedValue = finiteNumber(action.inspectedValue);
  const decision = action.decision === "zero" || action.decision === "one" || action.decision === "two" ? action.decision : null;
  const swapIndices = integerTuple<[number, number]>(action.swapIndices, 2);
  const swapSet = new Set(swapIndices ?? []);
  const pointerFrom = integerTuple<[number, number, number]>(action.pointerFrom, 3);
  const pointerTo = integerTuple<[number, number, number]>(action.pointerTo, 3);
  const invalidValues = numberArray(action.invalidValues);
  const invalidSet = new Set(invalidValues);
  const inspections = integer(action.inspections) ?? 0;
  const swaps = integer(action.swaps) ?? 0;

  const tokens = rawTokens.map((token): DutchFlagTokenModel => {
    let role: DutchFlagTokenRole = token.position < low
      ? "zero-zone"
      : token.position < mid
        ? "one-zone"
        : token.position <= high
          ? "unknown-zone"
          : "two-zone";
    if (token.position === mid && (operation.startsWith("inspect-") || operation === "retreat-high")) role = "current";
    if (swapSet.has(token.position) && (operation === "place-zero" || operation === "place-two")) role = "swap";
    if (invalidSet.has(token.value)) role = "invalid";
    return { ...token, role };
  });

  const zones = {
    zeros: range(0, low - 1),
    ones: range(low, mid - 1),
    unknown: range(mid, high),
    twos: range(high + 1, values.length - 1),
  };

  let headline = "Partition three values in one pass";
  let detail = "Every step shrinks the unknown zone while preserving the 0, 1, and 2 invariants.";
  let equation: string | null = null;
  let actionLabel = "prepare";

  if (operation === "start") {
    headline = "Grow certainty from both ends";
    detail = "Zeros lock on the left, twos lock on the right, and mid classifies the unknown center.";
    equation = "0-zone | unknown | 2-zone";
    actionLabel = "unsorted colors";
  } else if (operation === "invalid") {
    headline = "Input must contain only 0, 1, 2";
    detail = `Rejected value${invalidValues.length === 1 ? "" : "s"}: ${invalidValues.join(", ")}. No value was silently reclassified.`;
    equation = "allowed = {0, 1, 2}";
    actionLabel = "fix input";
  } else if (operation === "validate") {
    headline = "Three-color contract confirmed";
    detail = "Every value has exactly one destination zone, so the one-pass partition is safe.";
    equation = "arr[i] in {0, 1, 2}";
    actionLabel = "initialize pointers";
  } else if (operation === "initialize") {
    headline = "Unknown initially spans the array";
    detail = "low and mid begin at 0; high begins at the last index. No value is classified yet.";
    equation = `low=${low} | mid=${mid} | high=${high}`;
    actionLabel = "inspect mid";
  } else if (operation === "inspect-zero") {
    headline = `mid sees 0 at index ${mid}`;
    detail = `A 0 belongs at low=${low}. Swap it to the left boundary, then advance both low and mid.`;
    equation = `arr[${mid}] = 0 -> left zone`;
    actionLabel = "send 0 left";
  } else if (operation === "inspect-one") {
    headline = `mid sees 1 at index ${mid}`;
    detail = "A 1 is already between the confirmed 0s and the unknown zone. Only mid needs to advance.";
    equation = `arr[${mid}] = 1 -> stay middle`;
    actionLabel = "advance mid";
  } else if (operation === "inspect-two") {
    headline = `mid sees 2 at index ${mid}`;
    detail = `A 2 belongs at high=${high}. Swap it right, but do not advance mid before classifying the incoming value.`;
    equation = `arr[${mid}] = 2 -> right zone`;
    actionLabel = "send 2 right";
  } else if (operation === "place-zero") {
    headline = "Place 0 at the left boundary";
    detail = swapIndices?.[0] === swapIndices?.[1]
      ? "This self-swap confirms the 0 already occupies the next left-zone slot."
      : `The token from index ${swapIndices?.[0]} lands at low=${swapIndices?.[1]}.`;
    equation = swapIndices ? `swap(${swapIndices[0]}, ${swapIndices[1]})` : null;
    actionLabel = "0 is classified";
  } else if (operation === "advance-zero") {
    headline = "Advance low and mid together";
    detail = `The confirmed 0 zone is now [0..${low - 1}]. Unknown resumes at mid=${mid}.`;
    equation = pointerFrom && pointerTo ? `low ${pointerFrom[0]} -> ${pointerTo[0]} | mid ${pointerFrom[1]} -> ${pointerTo[1]}` : null;
    actionLabel = "grow left zone";
  } else if (operation === "advance-one") {
    headline = "Advance mid past the 1";
    detail = `The confirmed 1 zone is now [${low}..${mid - 1}]. Neither outer boundary changes.`;
    equation = pointerFrom && pointerTo ? `mid ${pointerFrom[1]} -> ${pointerTo[1]}` : null;
    actionLabel = "grow middle zone";
  } else if (operation === "place-two") {
    headline = "Place 2 at the right boundary";
    detail = swapIndices?.[0] === swapIndices?.[1]
      ? "The current 2 is already the last unknown value; the right zone can claim it."
      : `The 2 moves to index ${swapIndices?.[1]}; an unclassified token arrives at mid=${swapIndices?.[0]}.`;
    equation = swapIndices ? `swap(${swapIndices[0]}, ${swapIndices[1]})` : null;
    actionLabel = "2 is classified";
  } else if (operation === "retreat-high") {
    headline = `Move high left, keep mid at ${mid}`;
    detail = "The incoming value at mid came from the unknown zone. Inspect it before mid advances.";
    equation = pointerFrom && pointerTo ? `high ${pointerFrom[2]} -> ${pointerTo[2]} | mid stays ${pointerTo[1]}` : null;
    actionLabel = "recheck incoming value";
  } else if (operation === "complete") {
    headline = "Unknown is empty";
    detail = "mid crossed high, so every token now belongs to the 0, 1, or 2 zone. One scan gives O(n) time.";
    equation = `result = ${JSON.stringify(values)}`;
    actionLabel = "partition complete";
  }

  return {
    item,
    operation,
    originalValues,
    values,
    tokens,
    low,
    mid,
    high,
    inspectedValue,
    decision,
    swapIndices,
    pointerFrom,
    pointerTo,
    invalidValues,
    inspections,
    swaps,
    zones,
    headline,
    detail,
    equation,
    actionLabel,
  };
}
