import type { MemoryItem, TraceAction, TraceStep } from "../types/trace";

export type PrefixSumOperation =
  | "start"
  | "invalid"
  | "validate"
  | "seed"
  | "read"
  | "write"
  | "query-range"
  | "subtract"
  | "complete";

export type PrefixInputRole = "idle" | "processed" | "reading" | "query" | "invalid";
export type PrefixCheckpointRole =
  | "empty"
  | "seed"
  | "built"
  | "source"
  | "writing"
  | "query-left"
  | "query-right"
  | "invalid";

export interface PrefixInputTokenModel {
  id: string;
  value: number;
  index: number;
  role: PrefixInputRole;
}

export interface PrefixCheckpointModel {
  id: string;
  value: number | null;
  index: number;
  role: PrefixCheckpointRole;
}

export interface PrefixSumSceneModel {
  item: MemoryItem;
  prefixItem: MemoryItem;
  operation: PrefixSumOperation;
  values: number[];
  tokens: PrefixInputTokenModel[];
  prefix: Array<number | null>;
  prefixTokens: PrefixCheckpointModel[];
  queryLeft: number;
  queryRight: number;
  builtThrough: number;
  activeArrayIndex: number | null;
  sourcePrefixIndex: number | null;
  destinationPrefixIndex: number | null;
  prefixBefore: number | null;
  inputValue: number | null;
  prefixResult: number | null;
  rangeSum: number | null;
  queryLeftValue: number | null;
  queryRightValue: number | null;
  invalidReason: string | null;
  additions: number;
  headline: string;
  detail: string;
  equation: string | null;
  actionLabel: string;
  resultLabel: string;
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

function nullableNumberArray(value: unknown): Array<number | null> {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => entry === null ? null : finiteNumber(entry));
}

function parseInputTokens(value: unknown): Array<{ id: string; value: number; index: number }> {
  if (!Array.isArray(value)) return [];
  const parsed = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const record = candidate as Record<string, unknown>;
    const tokenValue = finiteNumber(record.value);
    const index = integer(record.index);
    if (typeof record.id !== "string" || tokenValue === null || index === null) continue;
    parsed.push({ id: record.id, value: tokenValue, index });
  }
  return parsed;
}

function parsePrefixTokens(value: unknown): Array<{ id: string; value: number | null; index: number }> {
  if (!Array.isArray(value)) return [];
  const parsed = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const record = candidate as Record<string, unknown>;
    const tokenValue = record.value === null ? null : finiteNumber(record.value);
    const index = integer(record.index);
    if (typeof record.id !== "string" || index === null || (record.value !== null && tokenValue === null)) continue;
    parsed.push({ id: record.id, value: tokenValue, index });
  }
  return parsed;
}

function phaseAction(step: TraceStep): TraceAction | undefined {
  return step.actions?.find(
    (action) => typeof action.phase === "string" && action.phase.startsWith("prefix_"),
  );
}

function operationForPhase(phase: string): PrefixSumOperation {
  const operations: Record<string, PrefixSumOperation> = {
    prefix_start: "start",
    prefix_invalid: "invalid",
    prefix_validate: "validate",
    prefix_seed: "seed",
    prefix_read: "read",
    prefix_write: "write",
    prefix_query_range: "query-range",
    prefix_subtract: "subtract",
    prefix_complete: "complete",
  };
  return operations[phase] ?? "start";
}

export function isPrefixSumTraceStep(step: TraceStep): boolean {
  if (step.visual?.type !== "array") return false;
  if (step.variables.algorithm === "prefix-sum") return true;
  return phaseAction(step) !== undefined;
}

export function getPrefixSumSceneModel(step: TraceStep): PrefixSumSceneModel | null {
  if (!isPrefixSumTraceStep(step)) return null;
  const item = step.memory?.find((candidate) => candidate.id === "arr" && candidate.type === "array");
  const prefixItem = step.memory?.find((candidate) => candidate.id === "prefix" && candidate.type === "array");
  const action = phaseAction(step);
  if (!item || !prefixItem || !action) return null;

  const operation = operationForPhase(typeof action.phase === "string" ? action.phase : "prefix_start");
  const values = numberArray(action.values);
  const rawTokens = parseInputTokens(action.tokens);
  const prefix = nullableNumberArray(action.prefix);
  const rawPrefixTokens = parsePrefixTokens(action.prefixTokens);
  if (values.length !== rawTokens.length || prefix.length !== values.length + 1 || rawPrefixTokens.length !== prefix.length) return null;

  const queryLeft = integer(action.queryLeft) ?? 0;
  const queryRight = integer(action.queryRight) ?? Math.max(0, values.length - 1);
  const builtThrough = integer(action.builtThrough) ?? -1;
  const activeArrayIndex = integer(action.activeArrayIndex);
  const sourcePrefixIndex = integer(action.sourcePrefixIndex);
  const destinationPrefixIndex = integer(action.destinationPrefixIndex);
  const prefixBefore = finiteNumber(action.prefixBefore);
  const inputValue = finiteNumber(action.inputValue);
  const prefixResult = finiteNumber(action.prefixResult);
  const rangeSum = finiteNumber(action.rangeSum);
  const queryLeftValue = finiteNumber(action.queryLeftValue);
  const queryRightValue = finiteNumber(action.queryRightValue);
  const invalidReason = typeof action.invalidReason === "string" && action.invalidReason.trim() !== "" ? action.invalidReason : null;
  const additions = integer(action.additions) ?? 0;
  const queryMode = operation === "query-range" || operation === "subtract" || operation === "complete";

  const tokens = rawTokens.map((token): PrefixInputTokenModel => {
    let role: PrefixInputRole = token.index < builtThrough ? "processed" : "idle";
    if (operation === "invalid") role = "invalid";
    else if (queryMode && token.index >= queryLeft && token.index <= queryRight) role = "query";
    else if (token.index === activeArrayIndex) role = "reading";
    return { ...token, role };
  });

  const prefixTokens = rawPrefixTokens.map((token): PrefixCheckpointModel => {
    let role: PrefixCheckpointRole = token.value === null ? "empty" : token.index === 0 ? "seed" : "built";
    if (operation === "invalid") role = "invalid";
    else if (queryMode && token.index === queryLeft) role = "query-left";
    else if (queryMode && token.index === queryRight + 1) role = "query-right";
    else if (token.index === destinationPrefixIndex) role = "writing";
    else if (token.index === sourcePrefixIndex) role = "source";
    return { ...token, role };
  });

  let headline = "Build cumulative checkpoints";
  let detail = "Each prefix slot stores the sum of all input values before that boundary.";
  let equation: string | null = null;
  let actionLabel = "prepare prefix rail";

  if (operation === "start") {
    headline = `Precompute once, query [${queryLeft}..${queryRight}] instantly`;
    detail = "The lower rail is the original array. The upper rail will gain one extra zero checkpoint, then accumulate left to right.";
    equation = `prefix has n + 1 = ${values.length + 1} slots`;
    actionLabel = "prepare rails";
  } else if (operation === "invalid") {
    headline = "The range query does not fit";
    detail = invalidReason ?? "Choose an inclusive range inside a non-empty array.";
    equation = `0 <= left <= right < ${values.length}`;
    actionLabel = "fix query";
  } else if (operation === "validate") {
    headline = `Map [${queryLeft}..${queryRight}] to two boundaries`;
    detail = `The right boundary is ${queryRight + 1} because prefix[i] represents the first i values, not the value at index i.`;
    equation = `answer = prefix[${queryRight + 1}] - prefix[${queryLeft}]`;
    actionLabel = "seed zero";
  } else if (operation === "seed") {
    headline = "prefix[0] starts at zero";
    detail = "This sentinel is the sum before the array begins. It makes ranges starting at index zero use the same subtraction rule.";
    equation = "prefix[0] = 0";
    actionLabel = "anchor accumulation";
  } else if (operation === "read") {
    headline = `Read arr[${activeArrayIndex}] = ${inputValue}`;
    detail = `Carry checkpoint prefix[${sourcePrefixIndex}] = ${prefixBefore} forward, then combine it with the current input value.`;
    equation = `${prefixBefore} + ${inputValue} -> prefix[${destinationPrefixIndex}]`;
    actionLabel = "gather operands";
  } else if (operation === "write") {
    headline = `Write checkpoint ${destinationPrefixIndex}`;
    detail = `prefix[${destinationPrefixIndex}] = ${prefixResult} now equals the sum of arr[0..${(destinationPrefixIndex ?? 1) - 1}].`;
    equation = `${prefixBefore} + ${inputValue} = ${prefixResult}`;
    actionLabel = "commit cumulative sum";
  } else if (operation === "query-range") {
    headline = `Isolate arr[${queryLeft}..${queryRight}]`;
    detail = `prefix[${queryRight + 1}] contains the wanted range plus everything before it. prefix[${queryLeft}] measures exactly that unwanted beginning.`;
    equation = `${queryRightValue} - ${queryLeftValue}`;
    actionLabel = "select boundaries";
  } else if (operation === "subtract") {
    headline = `One subtraction leaves ${rangeSum}`;
    detail = `${queryRightValue} contains arr[0..${queryRight}]. Removing ${queryLeftValue}, the sum of arr[0..${queryLeft - 1}], leaves only the highlighted interval.`;
    equation = `${queryRightValue} - ${queryLeftValue} = ${rangeSum}`;
    actionLabel = "resolve query";
  } else if (operation === "complete") {
    headline = `Range sum = ${rangeSum}`;
    detail = `Built ${values.length + 1} checkpoints in O(n). Query [${queryLeft}..${queryRight}] now costs one subtraction, O(1).`;
    equation = `prefix[${queryRight + 1}] - prefix[${queryLeft}] = ${rangeSum}`;
    actionLabel = "query complete";
  }

  return {
    item,
    prefixItem,
    operation,
    values,
    tokens,
    prefix,
    prefixTokens,
    queryLeft,
    queryRight,
    builtThrough,
    activeArrayIndex,
    sourcePrefixIndex,
    destinationPrefixIndex,
    prefixBefore,
    inputValue,
    prefixResult,
    rangeSum,
    queryLeftValue,
    queryRightValue,
    invalidReason,
    additions,
    headline,
    detail,
    equation,
    actionLabel,
    resultLabel: operation === "invalid" ? "invalid" : rangeSum === null ? "-" : String(rangeSum),
  };
}
