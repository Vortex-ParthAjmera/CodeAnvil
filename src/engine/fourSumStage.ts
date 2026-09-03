import type { MemoryItem, TraceAction, TraceStep } from "../types/trace";

export type FourSumOperation =
  | "start"
  | "sort"
  | "lock-first"
  | "lock-second"
  | "compare-low"
  | "compare-high"
  | "compare-equal"
  | "found"
  | "move-left"
  | "move-right"
  | "move-both"
  | "skip-first"
  | "skip-second"
  | "skip-left"
  | "skip-right"
  | "complete"
  | "no-solution";

export type FourSumTokenRole =
  | "idle"
  | "processed"
  | "first-anchor"
  | "second-anchor"
  | "left"
  | "right"
  | "found"
  | "duplicate";

export interface FourSumTokenModel {
  id: string;
  value: number;
  originalIndex: number;
  sortedIndex: number;
  position: number;
  role: FourSumTokenRole;
}

export interface FourSumMovement {
  pointer: "left" | "right" | "both";
  from: [number, number];
  to: [number, number];
}

export interface FourSumSceneModel {
  item: MemoryItem;
  operation: FourSumOperation;
  originalValues: number[];
  sortedValues: number[];
  tokens: FourSumTokenModel[];
  sortedReady: boolean;
  target: number;
  firstIndex: number;
  secondIndex: number;
  leftIndex: number;
  rightIndex: number;
  firstValue: number | null;
  secondValue: number | null;
  leftValue: number | null;
  rightValue: number | null;
  total: number | null;
  relation: "low" | "high" | "equal" | null;
  solutions: number[][];
  foundIndices: [number, number, number, number] | null;
  skippedIndex: number | null;
  skippedPointer: "first" | "second" | "left" | "right" | null;
  movement: FourSumMovement | null;
  comparisons: number;
  moves: number;
  headline: string;
  detail: string;
  equation: string | null;
  directionLabel: string;
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

function integerTuple<T extends number[]>(value: unknown, length: number): T | null {
  const values = numberArray(value);
  if (values.length !== length || !values.every(Number.isInteger)) return null;
  return values as T;
}

function quadruplets(value: unknown): number[][] {
  if (!Array.isArray(value)) return [];
  return value
    .map(numberArray)
    .filter((quadruplet) => quadruplet.length === 4)
    .map((quadruplet) => [...quadruplet]);
}

function phaseAction(step: TraceStep): TraceAction | undefined {
  return step.actions?.find(
    (action) => typeof action.phase === "string" && action.phase.startsWith("four_sum_"),
  );
}

function operationForPhase(phase: string): FourSumOperation {
  const operations: Record<string, FourSumOperation> = {
    four_sum_start: "start",
    four_sum_sort: "sort",
    four_sum_lock_first: "lock-first",
    four_sum_lock_second: "lock-second",
    four_sum_compare_low: "compare-low",
    four_sum_compare_high: "compare-high",
    four_sum_compare_equal: "compare-equal",
    four_sum_found: "found",
    four_sum_move_left: "move-left",
    four_sum_move_right: "move-right",
    four_sum_move_both: "move-both",
    four_sum_skip_first: "skip-first",
    four_sum_skip_second: "skip-second",
    four_sum_skip_left: "skip-left",
    four_sum_skip_right: "skip-right",
    four_sum_complete: "complete",
    four_sum_no_solution: "no-solution",
  };
  return operations[phase] ?? "start";
}

function parseTokens(value: unknown): Array<{
  id: string;
  value: number;
  originalIndex: number;
  sortedIndex: number;
}> {
  if (!Array.isArray(value)) return [];
  const parsed = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const record = candidate as Record<string, unknown>;
    const tokenValue = finiteNumber(record.value);
    const originalIndex = integer(record.originalIndex);
    const sortedIndex = integer(record.sortedIndex);
    if (typeof record.id !== "string" || tokenValue === null || originalIndex === null || sortedIndex === null) continue;
    parsed.push({ id: record.id, value: tokenValue, originalIndex, sortedIndex });
  }
  return parsed;
}

function pointerName(value: unknown): FourSumMovement["pointer"] | null {
  return value === "left" || value === "right" || value === "both" ? value : null;
}

function skipPointer(value: unknown): FourSumSceneModel["skippedPointer"] {
  return value === "first" || value === "second" || value === "left" || value === "right" ? value : null;
}

export function isFourSumTraceStep(step: TraceStep): boolean {
  if (step.visual?.type !== "array") return false;
  if (step.variables.algorithm === "four-sum") return true;
  return phaseAction(step) !== undefined;
}

export function getFourSumSceneModel(step: TraceStep): FourSumSceneModel | null {
  if (!isFourSumTraceStep(step)) return null;
  const itemId = step.visual?.type === "array" ? step.visual.itemId : "arr";
  const item = step.memory?.find((candidate) => candidate.id === itemId && candidate.type === "array");
  if (!item) return null;

  const action = phaseAction(step);
  if (!action) return null;
  const operation = operationForPhase(typeof action.phase === "string" ? action.phase : "four_sum_start");
  const originalValues = numberArray(action.originalValues);
  const sortedValues = numberArray(action.sortedValues);
  const rawTokens = parseTokens(action.tokens);
  if (rawTokens.length === 0 || originalValues.length !== rawTokens.length || sortedValues.length !== rawTokens.length) return null;

  const sortedReady = action.sortedReady === true;
  const target = finiteNumber(action.targetSum) ?? finiteNumber(step.variables.target) ?? 0;
  const firstIndex = integer(action.firstIndex) ?? -1;
  const secondIndex = integer(action.secondIndex) ?? -1;
  const leftIndex = integer(action.leftIndex) ?? -1;
  const rightIndex = integer(action.rightIndex) ?? -1;
  const total = finiteNumber(action.total);
  const relation = action.relation === "low" || action.relation === "high" || action.relation === "equal" ? action.relation : null;
  const foundIndices = integerTuple<[number, number, number, number]>(action.foundIndices, 4);
  const foundSet = new Set(foundIndices ?? []);
  const processedSet = new Set(numberArray(action.processedFirstAnchors).filter(Number.isInteger));
  const skippedIndex = integer(action.skippedIndex);
  const skippedPointer = skipPointer(action.skippedPointer);
  const movementPointer = pointerName(action.movementPointer);
  const movementFrom = integerTuple<[number, number]>(action.movementFrom, 2);
  const movementTo = integerTuple<[number, number]>(action.movementTo, 2);
  const movement = movementPointer && movementFrom && movementTo
    ? { pointer: movementPointer, from: movementFrom, to: movementTo }
    : null;
  const solutions = quadruplets(action.solutions);
  const comparisons = integer(action.comparisons) ?? 0;
  const moves = integer(action.moves) ?? 0;

  const tokens = rawTokens.map((token): FourSumTokenModel => {
    const position = sortedReady ? token.sortedIndex : token.originalIndex;
    let role: FourSumTokenRole = "idle";
    if (sortedReady && processedSet.has(token.sortedIndex)) role = "processed";
    if (sortedReady && token.sortedIndex === firstIndex) role = "first-anchor";
    if (sortedReady && token.sortedIndex === secondIndex) role = "second-anchor";
    if (sortedReady && token.sortedIndex === leftIndex) role = "left";
    if (sortedReady && token.sortedIndex === rightIndex) role = "right";
    if (sortedReady && foundSet.has(token.sortedIndex)) role = "found";
    if (sortedReady && token.sortedIndex === skippedIndex) role = "duplicate";
    return { ...token, position, role };
  });

  const firstValue = firstIndex >= 0 ? sortedValues[firstIndex] ?? null : null;
  const secondValue = secondIndex >= 0 ? sortedValues[secondIndex] ?? null : null;
  const leftValue = leftIndex >= 0 ? sortedValues[leftIndex] ?? null : null;
  const rightValue = rightIndex >= 0 ? sortedValues[rightIndex] ?? null : null;
  let headline = "Lock two, scan two";
  let detail = "Two anchors reduce Four Sum to a sorted two-pointer search.";
  let equation: string | null = null;
  let directionLabel = "prepare";

  if (operation === "start") {
    headline = "Replace the fourth loop";
    detail = "Sorting lets the last two choices share one inward scan instead of two nested loops.";
    equation = "O(n^4) -> O(n^3)";
    directionLabel = "unsorted input";
  } else if (operation === "sort") {
    headline = "Sort once to steer the pair";
    detail = "After two anchors are fixed, L increases the total and R decreases it.";
    equation = "smaller  ->  larger";
    directionLabel = "ordered rail";
  } else if (operation === "lock-first") {
    headline = `Lock first anchor ${firstValue}`;
    detail = `Keep first=${firstIndex} fixed while the second anchor explores values to its right.`;
    equation = `${firstValue} + second + L + R = ${target}`;
    directionLabel = "choose second anchor";
  } else if (operation === "lock-second") {
    headline = `Lock second anchor ${secondValue}`;
    detail = `The anchor subtotal is ${(firstValue ?? 0) + (secondValue ?? 0)}. L and R now solve the remaining pair.`;
    equation = `${firstValue} + ${secondValue} + L + R = ${target}`;
    directionLabel = "scan free pair";
  } else if (operation === "compare-low") {
    headline = `Total ${total} is too small`;
    detail = "Both anchors stay locked. Move L right to replace the smaller free value.";
    equation = `${firstValue} + ${secondValue} + ${leftValue} + ${rightValue} = ${total} < ${target}`;
    directionLabel = "move L right";
  } else if (operation === "compare-high") {
    headline = `Total ${total} is too large`;
    detail = "Both anchors stay locked. Move R left to replace the larger free value.";
    equation = `${firstValue} + ${secondValue} + ${leftValue} + ${rightValue} = ${total} > ${target}`;
    directionLabel = "move R left";
  } else if (operation === "compare-equal") {
    headline = `Four values balance at ${target}`;
    detail = "The four indices are different, so this combination can enter the result.";
    equation = `${firstValue} + ${secondValue} + ${leftValue} + ${rightValue} = ${target}`;
    directionLabel = "record quadruplet";
  } else if (operation === "found") {
    const latest = solutions.at(-1) ?? [];
    headline = `Save [${latest.join(", ")}]`;
    detail = "Lift the combination to the result rail; duplicate guards keep later passes unique.";
    equation = `${latest.join(" + ")} = ${target}`;
    directionLabel = `solution ${solutions.length}`;
  } else if (operation === "move-left") {
    headline = `L moves to index ${leftIndex}`;
    detail = "The total was low, so only the smaller free pointer moves. Both anchors remain fixed.";
    equation = movement ? `L: ${movement.from[0]} -> ${movement.to[0]}` : null;
    directionLabel = "increase free pair";
  } else if (operation === "move-right") {
    headline = `R moves to index ${rightIndex}`;
    detail = "The total was high, so only the larger free pointer moves. Both anchors remain fixed.";
    equation = movement ? `R: ${movement.from[1]} -> ${movement.to[1]}` : null;
    directionLabel = "decrease free pair";
  } else if (operation === "move-both") {
    headline = "Move both free pointers inward";
    detail = "This free pair was recorded with the current anchors, so continue with two new positions.";
    equation = movement ? `L ${movement.from[0]} -> ${movement.to[0]} | R ${movement.from[1]} -> ${movement.to[1]}` : null;
    directionLabel = "continue after match";
  } else if (operation === "skip-first") {
    headline = `Skip repeated first anchor ${firstValue}`;
    detail = "The previous first-anchor pass already generated every value combination that starts here.";
    equation = firstIndex > 0 ? `arr[${firstIndex}] = arr[${firstIndex - 1}]` : null;
    directionLabel = "deduplicate first";
  } else if (operation === "skip-second") {
    headline = `Skip repeated second anchor ${secondValue}`;
    detail = "With the first anchor unchanged, this second value would repeat the same pair scan.";
    equation = secondIndex > 0 ? `arr[${secondIndex}] = arr[${secondIndex - 1}]` : null;
    directionLabel = "deduplicate second";
  } else if (operation === "skip-left" || operation === "skip-right") {
    const pointer = operation === "skip-left" ? "L" : "R";
    headline = `Skip repeated ${pointer} value`;
    detail = "The skipped free value equals the one just used, so it cannot create a new quadruplet.";
    equation = skippedIndex !== null ? `duplicate at index ${skippedIndex}` : null;
    directionLabel = `deduplicate ${pointer}`;
  } else if (operation === "complete") {
    headline = `Found ${solutions.length} unique result${solutions.length === 1 ? "" : "s"}`;
    detail = "Two nested anchor loops each use one linear inward scan, giving O(n^3) search time.";
    equation = `result = ${JSON.stringify(solutions)}`;
    directionLabel = "search complete";
  } else if (operation === "no-solution") {
    headline = "No quadruplet reaches the target";
    detail = "Every legal anchor pair and inward pointer pair was checked without recording a result.";
    equation = "result = []";
    directionLabel = "search complete";
  }

  return {
    item,
    operation,
    originalValues,
    sortedValues,
    tokens,
    sortedReady,
    target,
    firstIndex,
    secondIndex,
    leftIndex,
    rightIndex,
    firstValue,
    secondValue,
    leftValue,
    rightValue,
    total,
    relation,
    solutions,
    foundIndices,
    skippedIndex,
    skippedPointer,
    movement,
    comparisons,
    moves,
    headline,
    detail,
    equation,
    directionLabel,
    resultLabel: operation === "no-solution" ? "none" : solutions.length > 0 ? String(solutions.length) : "searching",
  };
}
