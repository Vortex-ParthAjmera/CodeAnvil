import type { MemoryItem, TraceAction, TraceStep } from "../types/trace";

export type TwoSumHashOperation =
  | "start"
  | "read"
  | "lookup-miss"
  | "store"
  | "lookup-hit"
  | "found"
  | "not-found";

export interface TwoSumHashEntry {
  value: number;
  index: number;
  order: number;
  active: boolean;
  matched: boolean;
}

export interface TwoSumHashCell {
  index: number;
  value: number;
  active: boolean;
  processed: boolean;
  matched: boolean;
}

export interface TwoSumHashSceneModel {
  item: MemoryItem;
  values: number[];
  cells: TwoSumHashCell[];
  entries: TwoSumHashEntry[];
  operation: TwoSumHashOperation;
  target: number;
  activeIndex: number;
  currentValue: number | null;
  complement: number | null;
  hitIndex: number | null;
  hitEntryOrder: number | null;
  pairIndices: [number, number] | null;
  storedOrder: number | null;
  lookups: number;
  stores: number;
  headline: string;
  detail: string;
  equation: string | null;
  resultLabel: string;
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
    (action) => typeof action.phase === "string" && action.phase.startsWith("two_sum_hash_"),
  );
}

function operationForPhase(phase: string): TwoSumHashOperation {
  if (phase === "two_sum_hash_start") return "start";
  if (phase === "two_sum_hash_read") return "read";
  if (phase === "two_sum_hash_lookup_miss") return "lookup-miss";
  if (phase === "two_sum_hash_store") return "store";
  if (phase === "two_sum_hash_lookup_hit") return "lookup-hit";
  if (phase === "two_sum_hash_found") return "found";
  if (phase === "two_sum_hash_not_found") return "not-found";
  return "read";
}

function numberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map(integerValue).filter((entry): entry is number => entry !== null);
}

function pairValue(value: unknown): [number, number] | null {
  const entries = numberArray(value);
  return entries.length === 2 ? [entries[0], entries[1]] : null;
}

function entryValues(value: unknown): Array<{ value: number; index: number; order: number }> {
  if (!Array.isArray(value)) return [];
  const entries: Array<{ value: number; index: number; order: number }> = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const record = candidate as Record<string, unknown>;
    const entryValue = numberValue(record.value);
    const index = integerValue(record.index);
    const order = integerValue(record.order);
    if (entryValue === null || index === null || order === null) continue;
    entries.push({ value: entryValue, index, order });
  }
  return entries.sort((left, right) => left.order - right.order);
}

export function isTwoSumHashTraceStep(step: TraceStep): boolean {
  if (step.visual?.type !== "array") return false;
  if (step.variables.algorithm === "two-sum-hash") return true;
  return phaseAction(step) !== undefined;
}

export function getTwoSumHashSceneModel(step: TraceStep): TwoSumHashSceneModel | null {
  if (!isTwoSumHashTraceStep(step)) return null;

  const itemId = step.visual?.type === "array" ? step.visual.itemId : "arr";
  const item = step.memory?.find(
    (candidate) => candidate.id === itemId && candidate.type === "array",
  );
  if (!item) return null;

  const parsedValues = item.value.map(numberValue);
  if (parsedValues.length === 0 || parsedValues.some((value) => value === null)) return null;
  const values = parsedValues as number[];
  const action = phaseAction(step);
  const phase = typeof action?.phase === "string" ? action.phase : "two_sum_hash_read";
  const operation = operationForPhase(phase);
  const target = numberValue(action?.sumTarget) ?? numberValue(step.variables.target) ?? 0;
  const actionIndex = integerValue(action?.activeIndex) ?? integerValue(step.variables.i) ?? -1;
  const activeIndex = operation === "not-found" ? -1 : actionIndex;
  const currentValue = operation === "not-found"
    ? null
    : numberValue(action?.currentValue) ?? (activeIndex >= 0 ? values[activeIndex] ?? null : null);
  const complement = operation === "not-found"
    ? null
    : numberValue(action?.complement) ?? numberValue(step.variables.complement);
  const hitIndex = integerValue(action?.hitIndex);
  const pairIndices = pairValue(action?.pairIndices);
  const storedOrder = integerValue(action?.storedOrder);
  const lookups = integerValue(action?.lookups) ?? integerValue(step.variables.lookups) ?? 0;
  const stores = integerValue(action?.stores) ?? integerValue(step.variables.stores) ?? 0;
  const processed = new Set(numberArray(action?.processedIndices));
  const rawEntries = entryValues(action?.entries);
  const hitEntryOrder = complement !== null && (operation === "lookup-hit" || operation === "found")
    ? rawEntries.find((entry) => entry.value === complement)?.order ?? null
    : null;
  const pairSet = new Set(pairIndices ?? []);

  const entries = rawEntries.map((entry) => ({
    ...entry,
    active: entry.order === storedOrder || entry.order === hitEntryOrder,
    matched: pairIndices !== null && entry.index === pairIndices[0],
  }));
  const cells = values.map((value, index) => ({
    index,
    value,
    active: index === activeIndex,
    processed: processed.has(index),
    matched: pairSet.has(index),
  }));

  let headline = "Build a map while scanning";
  let detail = "For every value, look for its complement among earlier indices before storing the current value.";
  let equation: string | null = null;

  if (operation === "start") {
    headline = "Start with an empty map";
    detail = "The map will remember value -> index pairs from the part of the array already scanned.";
    equation = "seen = {}";
  } else if (operation === "read") {
    headline = `Need ${complement}`;
    detail = `At index ${activeIndex}, subtract ${currentValue} from the target ${target} to calculate the only value that can complete the pair.`;
    equation = `${target} - ${currentValue} = ${complement}`;
  } else if (operation === "lookup-miss") {
    headline = `${complement} is not stored`;
    detail = `The complement is absent, so index ${activeIndex} cannot finish a pair with any earlier value.`;
    equation = `${complement} not in seen`;
  } else if (operation === "store") {
    headline = `Remember ${currentValue} at index ${activeIndex}`;
    detail = "The current value enters the map only after its lookup, making it available to future array positions.";
    equation = `seen[${currentValue}] = ${activeIndex}`;
  } else if (operation === "lookup-hit") {
    headline = `Found ${complement} at index ${hitIndex}`;
    detail = `The map points straight to an earlier partner. Index ${hitIndex} and index ${activeIndex} are different positions.`;
    equation = `${complement} in seen`;
  } else if (operation === "found" && pairIndices) {
    headline = `Pair found: [${pairIndices.join(", ")}]`;
    detail = `arr[${pairIndices[0]}] = ${values[pairIndices[0]]} and arr[${pairIndices[1]}] = ${values[pairIndices[1]]} sum to ${target}.`;
    equation = `${values[pairIndices[0]]} + ${values[pairIndices[1]]} = ${target}`;
  } else if (operation === "not-found") {
    headline = "No pair reaches the target";
    detail = `All ${values.length} values were checked. Every complement lookup missed.`;
    equation = "result = none";
  }

  return {
    item,
    values,
    cells,
    entries,
    operation,
    target,
    activeIndex,
    currentValue,
    complement,
    hitIndex,
    hitEntryOrder,
    pairIndices,
    storedOrder,
    lookups,
    stores,
    headline,
    detail,
    equation,
    resultLabel: pairIndices ? `[${pairIndices.join(", ")}]` : operation === "not-found" ? "none" : "searching",
  };
}
