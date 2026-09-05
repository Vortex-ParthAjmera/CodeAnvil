import type { MemoryItem, TraceAction, TraceStep } from "../types/trace";

export type DifferenceArrayOperation =
  | "start"
  | "invalid"
  | "validate"
  | "seed"
  | "build"
  | "mark-start"
  | "mark-stop"
  | "open-end"
  | "reconstruct"
  | "complete";

export type DifferenceInputRole = "idle" | "range" | "source" | "rebuilding" | "complete" | "invalid";
export type DifferenceSignalRole = "empty" | "built" | "active" | "start" | "stop" | "consumed" | "invalid";
export type DifferenceResultRole = "empty" | "writing" | "updated" | "unchanged" | "complete" | "invalid";

export interface DifferenceInputTokenModel {
  id: string;
  value: number;
  index: number;
  role: DifferenceInputRole;
}

export interface DifferenceSignalTokenModel {
  id: string;
  value: number | null;
  index: number;
  role: DifferenceSignalRole;
}

export interface DifferenceResultTokenModel {
  id: string;
  value: number | null;
  index: number;
  role: DifferenceResultRole;
}

export interface DifferenceArraySceneModel {
  item: MemoryItem;
  diffItem: MemoryItem;
  resultItem: MemoryItem;
  operation: DifferenceArrayOperation;
  values: number[];
  tokens: DifferenceInputTokenModel[];
  diff: Array<number | null>;
  diffTokens: DifferenceSignalTokenModel[];
  result: Array<number | null>;
  resultTokens: DifferenceResultTokenModel[];
  rangeStart: number;
  rangeEnd: number;
  delta: number;
  guardIndex: number;
  builtThrough: number;
  reconstructedThrough: number;
  activeIndex: number | null;
  sourceIndices: [number, number] | null;
  boundaryIndex: number | null;
  boundaryKind: "start" | "stop" | "open-end" | null;
  diffBefore: number | null;
  diffAfter: number | null;
  runningBefore: number | null;
  runningAfter: number | null;
  invalidReason: string | null;
  boundaryEdits: number;
  reconstructionAdds: number;
  finalValues: number[];
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

function integerPair(value: unknown): [number, number] | null {
  const pair = numberArray(value);
  return pair.length === 2 && pair.every(Number.isInteger) ? [pair[0], pair[1]] : null;
}

function parseNumberTokens(value: unknown): Array<{ id: string; value: number; index: number }> {
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

function parseNullableTokens(value: unknown): Array<{ id: string; value: number | null; index: number }> {
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
  return step.actions?.find((action) => typeof action.phase === "string" && action.phase.startsWith("difference_"));
}

function operationForPhase(phase: string): DifferenceArrayOperation {
  const operations: Record<string, DifferenceArrayOperation> = {
    difference_start: "start",
    difference_invalid: "invalid",
    difference_validate: "validate",
    difference_seed: "seed",
    difference_build: "build",
    difference_mark_start: "mark-start",
    difference_mark_stop: "mark-stop",
    difference_open_end: "open-end",
    difference_reconstruct: "reconstruct",
    difference_complete: "complete",
  };
  return operations[phase] ?? "start";
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

function addition(base: number | null, amount: number): string {
  return `${base ?? 0} ${amount >= 0 ? "+" : "-"} ${Math.abs(amount)}`;
}

export function isDifferenceArrayTraceStep(step: TraceStep): boolean {
  if (step.visual?.type !== "array") return false;
  if (step.variables.algorithm === "difference-array") return true;
  return phaseAction(step) !== undefined;
}

export function getDifferenceArraySceneModel(step: TraceStep): DifferenceArraySceneModel | null {
  if (!isDifferenceArrayTraceStep(step)) return null;
  const item = step.memory?.find((candidate) => candidate.id === "arr" && candidate.type === "array");
  const diffItem = step.memory?.find((candidate) => candidate.id === "diff" && candidate.type === "array");
  const resultItem = step.memory?.find((candidate) => candidate.id === "result" && candidate.type === "array");
  const action = phaseAction(step);
  if (!item || !diffItem || !resultItem || !action) return null;

  const operation = operationForPhase(typeof action.phase === "string" ? action.phase : "difference_start");
  const values = numberArray(action.values);
  const rawTokens = parseNumberTokens(action.tokens);
  const diff = nullableNumberArray(action.diff);
  const rawDiffTokens = parseNullableTokens(action.diffTokens);
  const result = nullableNumberArray(action.rebuilt);
  const rawResultTokens = parseNullableTokens(action.resultTokens);
  if (
    values.length !== rawTokens.length
    || diff.length !== values.length
    || rawDiffTokens.length !== diff.length
    || result.length !== values.length
    || rawResultTokens.length !== result.length
  ) return null;

  const rangeStart = integer(action.rangeStart) ?? 0;
  const rangeEnd = integer(action.rangeEnd) ?? Math.max(0, values.length - 1);
  const delta = finiteNumber(action.delta) ?? 0;
  const guardIndex = integer(action.guardIndex) ?? rangeEnd + 1;
  const builtThrough = integer(action.builtThrough) ?? -1;
  const reconstructedThrough = integer(action.reconstructedThrough) ?? -1;
  const activeIndex = integer(action.activeIndex);
  const sourceIndices = integerPair(action.sourceIndices);
  const boundaryIndex = integer(action.boundaryIndex);
  const boundaryKind = action.boundaryKind === "start" || action.boundaryKind === "stop" || action.boundaryKind === "open-end"
    ? action.boundaryKind
    : null;
  const diffBefore = finiteNumber(action.diffBefore);
  const diffAfter = finiteNumber(action.diffAfter);
  const runningBefore = finiteNumber(action.runningBefore);
  const runningAfter = finiteNumber(action.runningAfter);
  const invalidReason = typeof action.invalidReason === "string" && action.invalidReason.trim() !== "" ? action.invalidReason : null;
  const boundaryEdits = integer(action.boundaryEdits) ?? 0;
  const reconstructionAdds = integer(action.reconstructionAdds) ?? 0;
  const finalValues = result.map((value) => value ?? 0);

  const inRange = (index: number) => index >= rangeStart && index <= rangeEnd;
  const tokens = rawTokens.map((token): DifferenceInputTokenModel => {
    let role: DifferenceInputRole = inRange(token.index) ? "range" : "idle";
    if (operation === "invalid") role = "invalid";
    else if (operation === "complete") role = "complete";
    else if (sourceIndices?.includes(token.index)) role = "source";
    else if (operation === "reconstruct" && token.index === activeIndex) role = "rebuilding";
    return { ...token, role };
  });

  const diffTokens = rawDiffTokens.map((token): DifferenceSignalTokenModel => {
    let role: DifferenceSignalRole = token.value === null ? "empty" : token.index <= builtThrough ? "built" : "empty";
    if (operation === "invalid") role = "invalid";
    else if (token.index === boundaryIndex && boundaryKind === "start") role = "start";
    else if (token.index === boundaryIndex && boundaryKind === "stop") role = "stop";
    else if (operation === "complete" && token.index === rangeStart) role = "start";
    else if (operation === "complete" && guardIndex < values.length && token.index === guardIndex) role = "stop";
    else if (token.index === activeIndex) role = "active";
    else if (token.index <= reconstructedThrough) role = "consumed";
    return { ...token, role };
  });

  const resultTokens = rawResultTokens.map((token): DifferenceResultTokenModel => {
    let role: DifferenceResultRole = token.value === null ? "empty" : inRange(token.index) ? "updated" : "unchanged";
    if (operation === "invalid") role = "invalid";
    else if (operation === "complete") role = "complete";
    else if (token.index === activeIndex && operation === "reconstruct") role = "writing";
    return { ...token, role };
  });

  let headline = `Update [${rangeStart}..${rangeEnd}] with two signals`;
  let detail = "A difference array stores changes between neighbors. Prefix reconstruction carries each signal forward.";
  let equation: string | null = null;
  let actionLabel = "prepare signal rail";

  if (operation === "start") {
    headline = `Add ${signed(delta)} across [${rangeStart}..${rangeEnd}]`;
    detail = "Instead of rewriting the whole range, encode where this change begins and where it must stop.";
    equation = "range edit -> two boundary edits";
    actionLabel = "prepare three rails";
  } else if (operation === "invalid") {
    headline = "The update range does not fit";
    detail = invalidReason ?? "Choose an inclusive range inside a non-empty finite array.";
    equation = `0 <= left <= right < ${values.length}`;
    actionLabel = "fix inputs";
  } else if (operation === "validate") {
    headline = "Store change, not every final value";
    detail = `The ${signed(delta)} marker turns on at ${rangeStart}. Its inverse will cancel the signal at ${guardIndex}.`;
    equation = `diff[L] ${signed(delta)}; diff[R + 1] ${signed(-delta)}`;
    actionLabel = "build differences";
  } else if (operation === "seed") {
    headline = "Anchor the first difference";
    detail = "diff[0] is absolute because there is no previous array value. Every later slot measures a neighbor-to-neighbor change.";
    equation = `diff[0] = ${diffAfter}`;
    actionLabel = "seed signal rail";
  } else if (operation === "build") {
    const previousIndex = sourceIndices?.[0] ?? Math.max(0, (activeIndex ?? 1) - 1);
    const currentIndex = sourceIndices?.[1] ?? activeIndex ?? 0;
    headline = `Capture the edge at index ${activeIndex}`;
    detail = `Only the change from arr[${previousIndex}] to arr[${currentIndex}] is stored. Re-adding all edges later recreates the values.`;
    equation = `${values[currentIndex]} - ${values[previousIndex]} = ${diffAfter}`;
    actionLabel = "write difference";
  } else if (operation === "mark-start") {
    headline = `Turn ${signed(delta)} on at index ${rangeStart}`;
    detail = "The reconstruction sweep will carry this extra amount into this cell and every following cell until a cancel marker appears.";
    equation = `${addition(diffBefore, delta)} = ${diffAfter}`;
    actionLabel = "edit start boundary";
  } else if (operation === "mark-stop") {
    headline = `Cancel ${signed(delta)} at index ${guardIndex}`;
    detail = `This inverse marker sits immediately after right=${rangeEnd}, so indices beyond the requested range keep their original values.`;
    equation = `${addition(diffBefore, -delta)} = ${diffAfter}`;
    actionLabel = "edit stop boundary";
  } else if (operation === "open-end") {
    headline = "No stop marker is needed";
    detail = `The update reaches the final cell. Guard index ${guardIndex} is outside the array, so the carried signal may simply end.`;
    equation = `R + 1 = ${guardIndex} = n`;
    actionLabel = "leave range open";
  } else if (operation === "reconstruct") {
    headline = `Carry the signal into result[${activeIndex}]`;
    detail = inRange(activeIndex ?? -1)
      ? `Index ${activeIndex} lies inside the range, so its running value includes ${signed(delta)}.`
      : `Index ${activeIndex} lies outside the range, so the boundary signals cancel back to its original value.`;
    equation = `${runningBefore} + (${diffBefore}) = ${runningAfter}`;
    actionLabel = "prefix reconstruction";
  } else if (operation === "complete") {
    headline = "The range update is rebuilt";
    detail = `[${finalValues.join(", ")}] differs from the original only across [${rangeStart}..${rangeEnd}]. The update itself used ${boundaryEdits} boundary edits.`;
    equation = `${boundaryEdits} edits + ${reconstructionAdds} scan adds`;
    actionLabel = "reconstruction complete";
  }

  return {
    item,
    diffItem,
    resultItem,
    operation,
    values,
    tokens,
    diff,
    diffTokens,
    result,
    resultTokens,
    rangeStart,
    rangeEnd,
    delta,
    guardIndex,
    builtThrough,
    reconstructedThrough,
    activeIndex,
    sourceIndices,
    boundaryIndex,
    boundaryKind,
    diffBefore,
    diffAfter,
    runningBefore,
    runningAfter,
    invalidReason,
    boundaryEdits,
    reconstructionAdds,
    finalValues,
    headline,
    detail,
    equation,
    actionLabel,
    resultLabel: operation === "invalid" ? "invalid" : operation === "complete" ? "done" : `${Math.max(0, reconstructedThrough + 1)}/${values.length}`,
  };
}
