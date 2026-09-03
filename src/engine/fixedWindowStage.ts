import type { MemoryItem, TraceAction, TraceStep } from "../types/trace";

export type FixedWindowOperation =
  | "start"
  | "invalid"
  | "validate"
  | "seed-add"
  | "seed-complete"
  | "remove"
  | "add"
  | "shift"
  | "new-best"
  | "keep-best"
  | "complete";

export type FixedWindowTokenRole =
  | "idle"
  | "window"
  | "best"
  | "best-window"
  | "incoming"
  | "outgoing"
  | "invalid";

export interface FixedWindowTokenModel {
  id: string;
  value: number;
  index: number;
  role: FixedWindowTokenRole;
}

export interface FixedWindowSceneModel {
  item: MemoryItem;
  operation: FixedWindowOperation;
  values: number[];
  tokens: FixedWindowTokenModel[];
  windowSize: number;
  windowStart: number;
  windowEnd: number;
  currentSum: number;
  bestSum: number | null;
  bestRange: [number, number] | null;
  bestValues: number[];
  outgoingIndex: number | null;
  incomingIndex: number | null;
  transferKind: "seed" | "remove" | "add" | null;
  transferValue: number | null;
  sumBefore: number | null;
  processedRanges: Array<[number, number]>;
  invalidReason: string | null;
  windowsChecked: number;
  additions: number;
  removals: number;
  pointerFrom: [number, number] | null;
  pointerTo: [number, number] | null;
  previousBest: number | null;
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

function integerPairs(value: unknown): Array<[number, number]> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    const pair = integerPair(candidate);
    return pair ? [pair] : [];
  });
}

function phaseAction(step: TraceStep): TraceAction | undefined {
  return step.actions?.find(
    (action) => typeof action.phase === "string" && action.phase.startsWith("window_"),
  );
}

function operationForPhase(phase: string): FixedWindowOperation {
  const operations: Record<string, FixedWindowOperation> = {
    window_start: "start",
    window_invalid: "invalid",
    window_validate: "validate",
    window_seed_add: "seed-add",
    window_seed_complete: "seed-complete",
    window_remove: "remove",
    window_add: "add",
    window_shift: "shift",
    window_new_best: "new-best",
    window_keep_best: "keep-best",
    window_complete: "complete",
  };
  return operations[phase] ?? "start";
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

export function isFixedWindowTraceStep(step: TraceStep): boolean {
  if (step.visual?.type !== "array") return false;
  if (step.variables.algorithm === "sliding-window-fixed") return true;
  return phaseAction(step) !== undefined;
}

export function getFixedWindowSceneModel(step: TraceStep): FixedWindowSceneModel | null {
  if (!isFixedWindowTraceStep(step)) return null;
  const itemId = step.visual?.type === "array" ? step.visual.itemId : "arr";
  const item = step.memory?.find((candidate) => candidate.id === itemId && candidate.type === "array");
  if (!item) return null;

  const action = phaseAction(step);
  if (!action) return null;
  const operation = operationForPhase(typeof action.phase === "string" ? action.phase : "window_start");
  const values = numberArray(action.values);
  const rawTokens = parseTokens(action.tokens);
  if (values.length !== rawTokens.length) return null;

  const windowSize = integer(action.windowSize) ?? 0;
  const windowStart = integer(action.windowStart) ?? 0;
  const windowEnd = integer(action.windowEnd) ?? -1;
  const currentSum = finiteNumber(action.currentSum) ?? 0;
  const bestSum = finiteNumber(action.bestSum);
  const bestRange = integerPair(action.bestRange);
  const outgoingIndex = integer(action.outgoingIndex);
  const incomingIndex = integer(action.incomingIndex);
  const transferKind = action.transferKind === "seed" || action.transferKind === "remove" || action.transferKind === "add" ? action.transferKind : null;
  const transferValue = finiteNumber(action.transferValue);
  const sumBefore = finiteNumber(action.sumBefore);
  const processedRanges = integerPairs(action.processedRanges);
  const invalidReason = typeof action.invalidReason === "string" && action.invalidReason.trim() !== "" ? action.invalidReason : null;
  const windowsChecked = integer(action.windowsChecked) ?? 0;
  const additions = integer(action.additions) ?? 0;
  const removals = integer(action.removals) ?? 0;
  const pointerFrom = integerPair(action.pointerFrom);
  const pointerTo = integerPair(action.pointerTo);
  const previousBest = finiteNumber(action.previousBest);

  const inWindow = (index: number) => index >= windowStart && index <= windowEnd;
  const inBest = (index: number) => Boolean(bestRange && index >= bestRange[0] && index <= bestRange[1]);
  const tokens = rawTokens.map((token): FixedWindowTokenModel => {
    let role: FixedWindowTokenRole = "idle";
    if (operation === "invalid") role = "invalid";
    else if (inBest(token.index) && inWindow(token.index)) role = "best-window";
    else if (inBest(token.index)) role = "best";
    else if (inWindow(token.index)) role = "window";
    if (token.index === outgoingIndex) role = "outgoing";
    if (token.index === incomingIndex) role = "incoming";
    return { ...token, role };
  });

  const bestValues = bestRange ? values.slice(bestRange[0], bestRange[1] + 1) : [];
  let headline = `Reuse a window of ${windowSize}`;
  let detail = "Adjacent fixed-size windows share every value except one outgoing and one incoming item.";
  let equation: string | null = null;
  let actionLabel = "prepare";

  if (operation === "start") {
    headline = `Find the strongest window of size ${windowSize}`;
    detail = "Build the first sum once, then slide in O(1) work per position instead of summing every window from scratch.";
    equation = `window width = k = ${windowSize}`;
    actionLabel = "prepare fixed frame";
  } else if (operation === "invalid") {
    headline = "Window size cannot be used";
    detail = invalidReason ?? "Choose a whole-number window that fits inside the array.";
    equation = `1 <= k <= ${values.length}`;
    actionLabel = "fix k";
  } else if (operation === "validate") {
    headline = `A ${windowSize}-value window fits`;
    detail = `Every frame will cover exactly ${windowSize} contiguous positions; no partial window will be compared.`;
    equation = `k = ${windowSize} | n = ${values.length}`;
    actionLabel = "seed first window";
  } else if (operation === "seed-add") {
    headline = `Add ${transferValue} to seed the window`;
    detail = `The frame now covers [${windowStart}..${windowEnd}]. Continue until it contains exactly ${windowSize} values.`;
    equation = `${sumBefore} + ${transferValue} = ${currentSum}`;
    actionLabel = "build initial sum";
  } else if (operation === "seed-complete") {
    headline = `First full window sums to ${currentSum}`;
    detail = `Record [${windowStart}..${windowEnd}] as the initial best. Every later window must beat ${bestSum}.`;
    equation = `best = ${bestSum}`;
    actionLabel = "initial benchmark";
  } else if (operation === "remove") {
    headline = `Remove outgoing ${transferValue}`;
    detail = `Index ${outgoingIndex} leaves the frame. Subtract it before the new right-edge value enters.`;
    equation = `${sumBefore} - ${transferValue} = ${currentSum}`;
    actionLabel = "subtract outgoing";
  } else if (operation === "add") {
    headline = `Add incoming ${transferValue}`;
    detail = `Index ${incomingIndex} enters from the right. The rolling sum now belongs to the next complete window.`;
    equation = `${sumBefore} + ${transferValue} = ${currentSum}`;
    actionLabel = "add incoming";
  } else if (operation === "shift") {
    headline = `Slide to [${windowStart}..${windowEnd}]`;
    detail = `Both boundaries move together, preserving the fixed width k=${windowSize}. The array itself never moves.`;
    equation = pointerFrom && pointerTo ? `[${pointerFrom[0]}..${pointerFrom[1]}] -> [${pointerTo[0]}..${pointerTo[1]}]` : null;
    actionLabel = "move frame right";
  } else if (operation === "new-best") {
    headline = `${currentSum} becomes the new best`;
    detail = `Window [${windowStart}..${windowEnd}] beats ${previousBest}; promote its range and sum together.`;
    equation = `${currentSum} > ${previousBest}`;
    actionLabel = "promote window";
  } else if (operation === "keep-best") {
    headline = `Keep best sum ${bestSum}`;
    detail = `Current sum ${currentSum} does not beat the saved window [${bestRange?.[0]}..${bestRange?.[1]}].`;
    equation = `${currentSum} <= ${bestSum}`;
    actionLabel = "retain benchmark";
  } else if (operation === "complete") {
    headline = `Maximum fixed-window sum is ${bestSum}`;
    detail = `Window [${bestRange?.[0]}..${bestRange?.[1]}] = [${bestValues.join(", ")}]. Each value entered and left at most once.`;
    equation = `best = ${bestSum} | O(n)`;
    actionLabel = "scan complete";
  }

  return {
    item,
    operation,
    values,
    tokens,
    windowSize,
    windowStart,
    windowEnd,
    currentSum,
    bestSum,
    bestRange,
    bestValues,
    outgoingIndex,
    incomingIndex,
    transferKind,
    transferValue,
    sumBefore,
    processedRanges,
    invalidReason,
    windowsChecked,
    additions,
    removals,
    pointerFrom,
    pointerTo,
    previousBest,
    headline,
    detail,
    equation,
    actionLabel,
    resultLabel: operation === "invalid" ? "invalid" : bestSum === null ? "-" : String(bestSum),
  };
}
