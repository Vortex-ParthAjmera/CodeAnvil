import type { MemoryItem, TraceAction, TraceStep } from "../types/trace";

export type ThreeSumOperation =
  | "start"
  | "sort"
  | "fix-anchor"
  | "compare-low"
  | "compare-high"
  | "compare-equal"
  | "found"
  | "move-left"
  | "move-right"
  | "move-both"
  | "skip-left"
  | "skip-right"
  | "skip-anchor"
  | "complete"
  | "no-solution";

export type ThreeSumTokenRole =
  | "idle"
  | "processed"
  | "anchor"
  | "left"
  | "right"
  | "found"
  | "duplicate";

export interface ThreeSumTokenModel {
  id: string;
  value: number;
  originalIndex: number;
  sortedIndex: number;
  position: number;
  role: ThreeSumTokenRole;
}

export interface ThreeSumMovement {
  pointer: "left" | "right" | "both";
  from: [number, number];
  to: [number, number];
}

export interface ThreeSumSceneModel {
  item: MemoryItem;
  operation: ThreeSumOperation;
  originalValues: number[];
  sortedValues: number[];
  tokens: ThreeSumTokenModel[];
  sortedReady: boolean;
  target: number;
  anchorIndex: number;
  leftIndex: number;
  rightIndex: number;
  anchorValue: number | null;
  leftValue: number | null;
  rightValue: number | null;
  total: number | null;
  relation: "low" | "high" | "equal" | null;
  solutions: number[][];
  foundIndices: [number, number, number] | null;
  processedAnchors: number[];
  skippedIndex: number | null;
  movement: ThreeSumMovement | null;
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

function integerPair(value: unknown): [number, number] | null {
  const values = numberArray(value);
  if (values.length !== 2 || !values.every(Number.isInteger)) return null;
  return [values[0], values[1]];
}

function integerTriplet(value: unknown): [number, number, number] | null {
  const values = numberArray(value);
  if (values.length !== 3 || !values.every(Number.isInteger)) return null;
  return [values[0], values[1], values[2]];
}

function triplets(value: unknown): number[][] {
  if (!Array.isArray(value)) return [];
  return value
    .map(numberArray)
    .filter((triplet) => triplet.length === 3)
    .map((triplet) => [...triplet]);
}

function phaseAction(step: TraceStep): TraceAction | undefined {
  return step.actions?.find(
    (action) => typeof action.phase === "string" && action.phase.startsWith("three_sum_"),
  );
}

function operationForPhase(phase: string): ThreeSumOperation {
  if (phase === "three_sum_start") return "start";
  if (phase === "three_sum_sort") return "sort";
  if (phase === "three_sum_fix_anchor") return "fix-anchor";
  if (phase === "three_sum_compare_low") return "compare-low";
  if (phase === "three_sum_compare_high") return "compare-high";
  if (phase === "three_sum_compare_equal") return "compare-equal";
  if (phase === "three_sum_found") return "found";
  if (phase === "three_sum_move_left") return "move-left";
  if (phase === "three_sum_move_right") return "move-right";
  if (phase === "three_sum_move_both") return "move-both";
  if (phase === "three_sum_skip_left") return "skip-left";
  if (phase === "three_sum_skip_right") return "skip-right";
  if (phase === "three_sum_skip_anchor") return "skip-anchor";
  if (phase === "three_sum_complete") return "complete";
  if (phase === "three_sum_no_solution") return "no-solution";
  return "start";
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
    if (
      typeof record.id !== "string" ||
      tokenValue === null ||
      originalIndex === null ||
      sortedIndex === null
    ) continue;
    parsed.push({ id: record.id, value: tokenValue, originalIndex, sortedIndex });
  }
  return parsed;
}

function pointerName(value: unknown): ThreeSumMovement["pointer"] | null {
  return value === "left" || value === "right" || value === "both" ? value : null;
}

export function isThreeSumTraceStep(step: TraceStep): boolean {
  if (step.visual?.type !== "array") return false;
  if (step.variables.algorithm === "three-sum") return true;
  return phaseAction(step) !== undefined;
}

export function getThreeSumSceneModel(step: TraceStep): ThreeSumSceneModel | null {
  if (!isThreeSumTraceStep(step)) return null;
  const itemId = step.visual?.type === "array" ? step.visual.itemId : "arr";
  const item = step.memory?.find(
    (candidate) => candidate.id === itemId && candidate.type === "array",
  );
  if (!item) return null;

  const action = phaseAction(step);
  if (!action) return null;
  const phase = typeof action.phase === "string" ? action.phase : "three_sum_start";
  const operation = operationForPhase(phase);
  const originalValues = numberArray(action.originalValues);
  const sortedValues = numberArray(action.sortedValues);
  const rawTokens = parseTokens(action.tokens);
  if (rawTokens.length === 0 || originalValues.length !== rawTokens.length || sortedValues.length !== rawTokens.length) {
    return null;
  }

  const sortedReady = action.sortedReady === true;
  const target = finiteNumber(action.targetSum) ?? finiteNumber(step.variables.target) ?? 0;
  const anchorIndex = integer(action.anchorIndex) ?? -1;
  const leftIndex = integer(action.leftIndex) ?? -1;
  const rightIndex = integer(action.rightIndex) ?? -1;
  const total = finiteNumber(action.total);
  const relation = action.relation === "low" || action.relation === "high" || action.relation === "equal"
    ? action.relation
    : null;
  const foundIndices = integerTriplet(action.foundIndices);
  const foundSet = new Set(foundIndices ?? []);
  const processedAnchors = numberArray(action.processedAnchors).filter(Number.isInteger);
  const processedSet = new Set(processedAnchors);
  const skippedIndex = integer(action.skippedIndex);
  const movementPointer = pointerName(action.movementPointer);
  const movementFrom = integerPair(action.movementFrom);
  const movementTo = integerPair(action.movementTo);
  const movement = movementPointer && movementFrom && movementTo
    ? { pointer: movementPointer, from: movementFrom, to: movementTo }
    : null;
  const solutions = triplets(action.solutions);
  const comparisons = integer(action.comparisons) ?? 0;
  const moves = integer(action.moves) ?? 0;

  const tokens = rawTokens.map((token): ThreeSumTokenModel => {
    const position = sortedReady ? token.sortedIndex : token.originalIndex;
    let role: ThreeSumTokenRole = "idle";
    if (sortedReady && processedSet.has(token.sortedIndex)) role = "processed";
    if (sortedReady && token.sortedIndex === anchorIndex) role = "anchor";
    if (sortedReady && token.sortedIndex === leftIndex) role = "left";
    if (sortedReady && token.sortedIndex === rightIndex) role = "right";
    if (sortedReady && foundSet.has(token.sortedIndex)) role = "found";
    if (sortedReady && token.sortedIndex === skippedIndex) role = "duplicate";
    return { ...token, position, role };
  });

  const anchorValue = anchorIndex >= 0 ? sortedValues[anchorIndex] ?? null : null;
  const leftValue = leftIndex >= 0 ? sortedValues[leftIndex] ?? null : null;
  const rightValue = rightIndex >= 0 ? sortedValues[rightIndex] ?? null : null;
  let headline = "Sort, fix, then converge";
  let detail = "Sorting turns each sum comparison into a reliable pointer decision.";
  let equation: string | null = null;
  let directionLabel = "prepare";

  if (operation === "start") {
    headline = "Replace one nested loop";
    detail = "Three brute-force loops cost O(n^3). Sorting lets the two inner choices become an O(n) pointer scan.";
    equation = "O(n^3) -> O(n^2)";
    directionLabel = "unsorted input";
  } else if (operation === "sort") {
    headline = "Sort once to gain direction";
    detail = "After sorting, L moving right never decreases the sum and R moving left never increases it.";
    equation = "smaller  ->  larger";
    directionLabel = "ordered rail";
  } else if (operation === "fix-anchor") {
    headline = `Fix ${anchorValue} as the anchor`;
    detail = `Keep i=${anchorIndex} still. L and R now search only the sorted values to its right.`;
    equation = `${anchorValue} + L + R = ${target}`;
    directionLabel = "scan remaining range";
  } else if (operation === "compare-low") {
    headline = `Sum ${total} is too small`;
    detail = `R already holds the largest available partner. Move L right to replace ${leftValue} with a larger value.`;
    equation = `${anchorValue} + ${leftValue} + ${rightValue} = ${total} < ${target}`;
    directionLabel = "move L right";
  } else if (operation === "compare-high") {
    headline = `Sum ${total} is too large`;
    detail = `L already holds the smallest available partner. Move R left to replace ${rightValue} with a smaller value.`;
    equation = `${anchorValue} + ${leftValue} + ${rightValue} = ${total} > ${target}`;
    directionLabel = "move R left";
  } else if (operation === "compare-equal") {
    headline = `The three values balance at ${target}`;
    detail = "All three positions are different, so this value combination is a valid candidate.";
    equation = `${anchorValue} + ${leftValue} + ${rightValue} = ${target}`;
    directionLabel = "record this triplet";
  } else if (operation === "found") {
    const latest = solutions.at(-1) ?? [];
    headline = `Save [${latest.join(", ")}]`;
    detail = "Lift this value combination onto the solution shelf. Duplicate guards keep the shelf unique.";
    equation = `${latest.join(" + ")} = ${target}`;
    directionLabel = `solution ${solutions.length}`;
  } else if (operation === "move-left") {
    headline = `L moves to index ${leftIndex}`;
    detail = "The previous sum was low. Sorted order guarantees this move is the only way to increase it without changing the anchor.";
    equation = movement ? `L: ${movement.from[0]} -> ${movement.to[0]}` : null;
    directionLabel = "increase the sum";
  } else if (operation === "move-right") {
    headline = `R moves to index ${rightIndex}`;
    detail = "The previous sum was high. Sorted order guarantees this move is the only way to decrease it without changing the anchor.";
    equation = movement ? `R: ${movement.from[1]} -> ${movement.to[1]}` : null;
    directionLabel = "decrease the sum";
  } else if (operation === "move-both") {
    headline = "Move both pointers inward";
    detail = "That pair was already recorded with this anchor, so the search continues with two new positions.";
    equation = movement ? `L ${movement.from[0]} -> ${movement.to[0]} | R ${movement.from[1]} -> ${movement.to[1]}` : null;
    directionLabel = "continue after match";
  } else if (operation === "skip-left") {
    headline = `Skip repeated L value at ${skippedIndex}`;
    detail = "The skipped value equals the one just used. Keeping it would manufacture the same triplet again.";
    equation = skippedIndex !== null ? `arr[${skippedIndex}] = arr[${skippedIndex - 1}]` : null;
    directionLabel = "deduplicate left";
  } else if (operation === "skip-right") {
    headline = `Skip repeated R value at ${skippedIndex}`;
    detail = "The skipped value equals the one just used from the right side, so it cannot create a new value combination.";
    equation = skippedIndex !== null ? `arr[${skippedIndex}] = arr[${skippedIndex + 1}]` : null;
    directionLabel = "deduplicate right";
  } else if (operation === "skip-anchor") {
    headline = `Skip duplicate anchor ${anchorValue}`;
    detail = "The same anchor value would repeat every triplet discovered during its previous pass.";
    equation = anchorIndex > 0 ? `arr[${anchorIndex}] = arr[${anchorIndex - 1}]` : null;
    directionLabel = "deduplicate anchor";
  } else if (operation === "complete") {
    headline = `Found ${solutions.length} unique triplet${solutions.length === 1 ? "" : "s"}`;
    detail = "Each anchor used one inward pointer scan, producing O(n^2) search time after sorting.";
    equation = `result = ${JSON.stringify(solutions)}`;
    directionLabel = "search complete";
  } else if (operation === "no-solution") {
    headline = "No triplet reaches the target";
    detail = "Every legal anchor and pointer pair was checked without recording a solution.";
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
    anchorIndex,
    leftIndex,
    rightIndex,
    anchorValue,
    leftValue,
    rightValue,
    total,
    relation,
    solutions,
    foundIndices,
    processedAnchors,
    skippedIndex,
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
