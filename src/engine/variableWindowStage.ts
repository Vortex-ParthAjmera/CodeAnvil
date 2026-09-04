import type { MemoryItem, TraceAction, TraceStep } from "../types/trace";

export type VariableWindowOperation =
  | "start"
  | "invalid"
  | "validate"
  | "expand"
  | "target-met"
  | "below-target"
  | "new-best"
  | "keep-best"
  | "shrink"
  | "move-left"
  | "complete";

export type VariableWindowTokenRole =
  | "idle"
  | "processed"
  | "window"
  | "valid-window"
  | "best"
  | "best-window"
  | "incoming"
  | "outgoing"
  | "invalid";

export interface VariableWindowTokenModel {
  id: string;
  value: number;
  index: number;
  role: VariableWindowTokenRole;
}

export interface VariableWindowSceneModel {
  item: MemoryItem;
  operation: VariableWindowOperation;
  values: number[];
  tokens: VariableWindowTokenModel[];
  target: number;
  windowStart: number;
  windowEnd: number;
  windowLength: number;
  displayRange: [number, number] | null;
  currentSum: number;
  windowValid: boolean;
  displaySum: number;
  displayValid: boolean;
  bestLength: number | null;
  bestRange: [number, number] | null;
  bestValues: number[];
  bestSum: number | null;
  incomingIndex: number | null;
  outgoingIndex: number | null;
  transferKind: "add" | "remove" | null;
  transferValue: number | null;
  sumBefore: number | null;
  previousBestLength: number | null;
  pointerFrom: [number, number] | null;
  pointerTo: [number, number] | null;
  invalidReason: string | null;
  expansions: number;
  contractions: number;
  candidatesChecked: number;
  thresholdChecks: number;
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

function integerPair(value: unknown): [number, number] | null {
  const pair = numberArray(value);
  return pair.length === 2 && pair.every(Number.isInteger) ? [pair[0], pair[1]] : null;
}

function parseTokens(value: unknown): Array<{ id: string; value: number; index: number }> {
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

function phaseAction(step: TraceStep): TraceAction | undefined {
  return step.actions?.find(
    (action) => typeof action.phase === "string" && action.phase.startsWith("variable_window_"),
  );
}

function operationForPhase(phase: string): VariableWindowOperation {
  const operations: Record<string, VariableWindowOperation> = {
    variable_window_start: "start",
    variable_window_invalid: "invalid",
    variable_window_validate: "validate",
    variable_window_expand: "expand",
    variable_window_target_met: "target-met",
    variable_window_below_target: "below-target",
    variable_window_new_best: "new-best",
    variable_window_keep_best: "keep-best",
    variable_window_shrink: "shrink",
    variable_window_move_left: "move-left",
    variable_window_complete: "complete",
  };
  return operations[phase] ?? "start";
}

export function isVariableWindowTraceStep(step: TraceStep): boolean {
  if (step.visual?.type !== "array") return false;
  if (step.variables.algorithm === "sliding-window-variable") return true;
  return phaseAction(step) !== undefined;
}

export function getVariableWindowSceneModel(step: TraceStep): VariableWindowSceneModel | null {
  if (!isVariableWindowTraceStep(step)) return null;
  const itemId = step.visual?.type === "array" ? step.visual.itemId : "arr";
  const item = step.memory?.find((candidate) => candidate.id === itemId && candidate.type === "array");
  const action = phaseAction(step);
  if (!item || !action) return null;

  const operation = operationForPhase(typeof action.phase === "string" ? action.phase : "variable_window_start");
  const values = numberArray(action.values);
  const rawTokens = parseTokens(action.tokens);
  if (values.length !== rawTokens.length) return null;

  const target = finiteNumber(action.threshold) ?? 0;
  const windowStart = integer(action.windowStart) ?? 0;
  const windowEnd = integer(action.windowEnd) ?? -1;
  const windowLength = integer(action.windowLength) ?? Math.max(0, windowEnd - windowStart + 1);
  const currentSum = finiteNumber(action.currentSum) ?? 0;
  const windowValid = typeof action.windowValid === "boolean" ? action.windowValid : currentSum >= target;
  const bestLength = integer(action.bestLength);
  const bestRange = integerPair(action.bestRange);
  const incomingIndex = integer(action.incomingIndex);
  const outgoingIndex = integer(action.outgoingIndex);
  const transferKind = action.transferKind === "add" || action.transferKind === "remove" ? action.transferKind : null;
  const transferValue = finiteNumber(action.transferValue);
  const sumBefore = finiteNumber(action.sumBefore);
  const previousBestLength = integer(action.previousBestLength);
  const pointerFrom = integerPair(action.pointerFrom);
  const pointerTo = integerPair(action.pointerTo);
  const invalidReason = typeof action.invalidReason === "string" && action.invalidReason.trim() !== "" ? action.invalidReason : null;
  const expansions = integer(action.expansions) ?? 0;
  const contractions = integer(action.contractions) ?? 0;
  const candidatesChecked = integer(action.candidatesChecked) ?? 0;
  const thresholdChecks = integer(action.thresholdChecks) ?? 0;
  const bestValues = bestRange ? values.slice(bestRange[0], bestRange[1] + 1) : [];
  const bestSum = bestRange ? bestValues.reduce((sum, value) => sum + value, 0) : null;
  const displaySum = operation === "complete" && bestSum !== null ? bestSum : currentSum;
  const displayValid = operation === "complete" && bestRange !== null ? true : windowValid;
  const activeRange: [number, number] | null = windowEnd >= windowStart && windowStart >= 0
    ? [windowStart, windowEnd]
    : null;
  const displayRange = operation === "complete" && bestRange ? bestRange : activeRange;

  const inRange = (index: number, range: [number, number] | null) => Boolean(range && index >= range[0] && index <= range[1]);
  const tokens = rawTokens.map((token): VariableWindowTokenModel => {
    let role: VariableWindowTokenRole = token.index <= windowEnd ? "processed" : "idle";
    const inWindow = inRange(token.index, activeRange);
    const inBest = inRange(token.index, bestRange);
    if (operation === "invalid") role = "invalid";
    else if (operation === "complete" && inBest) role = "best-window";
    else if (inWindow && inBest) role = "best-window";
    else if (inWindow) role = windowValid ? "valid-window" : "window";
    else if (inBest) role = "best";
    if (token.index === incomingIndex) role = "incoming";
    if (token.index === outgoingIndex) role = "outgoing";
    return { ...token, role };
  });

  let headline = `Reach target ${target}, then tighten`;
  let detail = "Expand right while the sum is too small. Once the target is met, freeze right and move left to remove waste.";
  let equation: string | null = null;
  let actionLabel = "prepare pointers";

  if (operation === "start") {
    headline = `Find the shortest window reaching ${target}`;
    detail = "The window may grow and shrink. Both pointers move only forward, which keeps the complete search linear.";
    equation = `goal: sum >= ${target}`;
    actionLabel = "prepare window";
  } else if (operation === "invalid") {
    headline = "This monotonic window is not valid";
    detail = invalidReason ?? "Use a non-empty array of positive values and a positive target.";
    equation = "value > 0 and target > 0";
    actionLabel = "fix inputs";
  } else if (operation === "validate") {
    headline = "Positive values make both pointers monotonic";
    detail = "Adding on the right cannot lower the sum; removing on the left cannot raise it. No candidate needs to be revisited.";
    equation = "expand increases | shrink decreases";
    actionLabel = "start expansion";
  } else if (operation === "expand") {
    headline = `Right absorbs ${transferValue}`;
    detail = `The active window is [${windowStart}..${windowEnd}]. Test its new sum against ${target}.`;
    equation = `${sumBefore} + ${transferValue} = ${currentSum}`;
    actionLabel = "expand right";
  } else if (operation === "target-met") {
    headline = `${currentSum} reaches the target`;
    detail = "Right pauses here. Save this candidate if it is shorter, then remove from the left to test a tighter range.";
    equation = `${currentSum} >= ${target}`;
    actionLabel = "switch to shrinking";
  } else if (operation === "below-target") {
    headline = `${currentSum} is still too small`;
    detail = "Shrinking would lower the sum further, so preserve left and expand right on the next iteration.";
    equation = `${currentSum} < ${target}`;
    actionLabel = "keep expanding";
  } else if (operation === "new-best") {
    headline = `Save length ${windowLength} as the new best`;
    detail = `Range [${windowStart}..${windowEnd}] reaches ${target} and is shorter than ${previousBestLength ?? "the initial limit"}.`;
    equation = `${windowLength} < ${previousBestLength ?? values.length + 1}`;
    actionLabel = "promote candidate";
  } else if (operation === "keep-best") {
    headline = `Keep best length ${bestLength}`;
    detail = `The current valid range has length ${windowLength}, so it cannot replace [${bestRange?.[0]}..${bestRange?.[1]}].`;
    equation = `${windowLength} >= ${bestLength}`;
    actionLabel = "retain answer";
  } else if (operation === "shrink") {
    headline = `Release ${transferValue} from the left`;
    detail = `Index ${outgoingIndex} leaves. The resulting range is ${windowEnd >= windowStart ? `[${windowStart}..${windowEnd}]` : "empty"}.`;
    equation = `${sumBefore} - ${transferValue} = ${currentSum}`;
    actionLabel = "shrink window";
  } else if (operation === "move-left") {
    headline = `Left advances to ${windowStart}`;
    detail = windowValid
      ? "The shorter window still reaches the target, so compare it before contracting again."
      : "The sum is now below target, so shrinking stops and right resumes moving.";
    equation = pointerFrom && pointerTo ? `[${pointerFrom[0]}..${pointerFrom[1]}] -> [${pointerTo[0]}..${pointerTo[1]}]` : null;
    actionLabel = "move left boundary";
  } else if (operation === "complete") {
    headline = bestRange ? `Shortest valid length: ${bestLength}` : "No window reaches the target";
    detail = bestRange
      ? `Answer [${bestRange[0]}..${bestRange[1]}] = [${bestValues.join(", ")}] with sum ${bestSum}. Each value entered and left at most once.`
      : `Every right expansion was tested, but no contiguous sum reached ${target}.`;
    equation = bestRange ? `answer = ${bestLength} | O(n)` : "answer = 0 | O(n)";
    actionLabel = "scan complete";
  }

  return {
    item,
    operation,
    values,
    tokens,
    target,
    windowStart,
    windowEnd,
    windowLength,
    displayRange,
    currentSum,
    windowValid,
    displaySum,
    displayValid,
    bestLength,
    bestRange,
    bestValues,
    bestSum,
    incomingIndex,
    outgoingIndex,
    transferKind,
    transferValue,
    sumBefore,
    previousBestLength,
    pointerFrom,
    pointerTo,
    invalidReason,
    expansions,
    contractions,
    candidatesChecked,
    thresholdChecks,
    headline,
    detail,
    equation,
    actionLabel,
    resultLabel: operation === "invalid" ? "invalid" : bestLength === null ? "-" : String(bestLength),
  };
}
