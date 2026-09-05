import type { MemoryItem, TraceAction, TraceStep } from "../types/trace";

export type TrappingRainOperation =
  | "start"
  | "invalid"
  | "validate"
  | "compare"
  | "raise-left"
  | "raise-right"
  | "trap-left"
  | "trap-right"
  | "move-left"
  | "move-right"
  | "complete";

export type RainWallRole = "idle" | "left" | "right" | "chosen" | "active" | "resolved" | "meeting" | "invalid";

export interface RainWallTokenModel {
  id: string;
  value: number;
  index: number;
  role: RainWallRole;
}

export interface TrappingRainSceneModel {
  item: MemoryItem;
  waterItem: MemoryItem;
  operation: TrappingRainOperation;
  heights: number[];
  tokens: RainWallTokenModel[];
  waterDepths: number[];
  left: number;
  right: number;
  leftMax: number;
  rightMax: number;
  leftHeight: number | null;
  rightHeight: number | null;
  activeIndex: number | null;
  activeSide: "left" | "right" | null;
  decision: "left" | "right" | null;
  sideMaxBefore: number | null;
  sideMaxAfter: number | null;
  waterAdded: number;
  totalWater: number;
  pointerFrom: number | null;
  pointerTo: number | null;
  processedIndices: number[];
  invalidReason: string | null;
  comparisons: number;
  pointerMoves: number;
  filledCells: number;
  maxHeight: number;
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

function integerArray(value: unknown): number[] {
  return numberArray(value).filter(Number.isInteger);
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
  return step.actions?.find((action) => typeof action.phase === "string" && action.phase.startsWith("rain_"));
}

function operationForPhase(phase: string): TrappingRainOperation {
  const operations: Record<string, TrappingRainOperation> = {
    rain_start: "start",
    rain_invalid: "invalid",
    rain_validate: "validate",
    rain_compare: "compare",
    rain_raise_left: "raise-left",
    rain_raise_right: "raise-right",
    rain_trap_left: "trap-left",
    rain_trap_right: "trap-right",
    rain_move_left: "move-left",
    rain_move_right: "move-right",
    rain_complete: "complete",
  };
  return operations[phase] ?? "start";
}

export function isTrappingRainTraceStep(step: TraceStep): boolean {
  if (step.visual?.type !== "array") return false;
  if (step.variables.algorithm === "trapping-rain-water") return true;
  return phaseAction(step) !== undefined;
}

export function getTrappingRainSceneModel(step: TraceStep): TrappingRainSceneModel | null {
  if (!isTrappingRainTraceStep(step)) return null;
  const item = step.memory?.find((candidate) => candidate.id === "height" && candidate.type === "array");
  const waterItem = step.memory?.find((candidate) => candidate.id === "water" && candidate.type === "array");
  const action = phaseAction(step);
  if (!item || !waterItem || !action) return null;

  const operation = operationForPhase(typeof action.phase === "string" ? action.phase : "rain_start");
  const heights = numberArray(action.heights);
  const rawTokens = parseTokens(action.tokens);
  const waterDepths = numberArray(action.waterDepths);
  if (heights.length !== rawTokens.length || waterDepths.length !== heights.length) return null;

  const left = integer(action.leftIndex) ?? 0;
  const right = integer(action.rightIndex) ?? Math.max(0, heights.length - 1);
  const leftMax = finiteNumber(action.leftMax) ?? 0;
  const rightMax = finiteNumber(action.rightMax) ?? 0;
  const leftHeight = finiteNumber(action.leftHeight);
  const rightHeight = finiteNumber(action.rightHeight);
  const activeIndex = integer(action.activeIndex);
  const activeSide = action.activeSide === "left" || action.activeSide === "right" ? action.activeSide : null;
  const decision = action.decision === "left" || action.decision === "right" ? action.decision : null;
  const sideMaxBefore = finiteNumber(action.sideMaxBefore);
  const sideMaxAfter = finiteNumber(action.sideMaxAfter);
  const waterAdded = finiteNumber(action.waterAdded) ?? 0;
  const totalWater = finiteNumber(action.totalWater) ?? 0;
  const pointerFrom = integer(action.pointerFrom);
  const pointerTo = integer(action.pointerTo);
  const processedIndices = integerArray(action.processedIndices);
  const invalidReason = typeof action.invalidReason === "string" && action.invalidReason.trim() !== "" ? action.invalidReason : null;
  const comparisons = integer(action.comparisons) ?? 0;
  const pointerMoves = integer(action.pointerMoves) ?? 0;
  const filledCells = integer(action.filledCells) ?? 0;
  const maxHeight = Math.max(1, ...heights);

  const processed = new Set(processedIndices);
  const tokens = rawTokens.map((token): RainWallTokenModel => {
    let role: RainWallRole = processed.has(token.index) ? "resolved" : "idle";
    if (operation === "invalid") role = "invalid";
    else if (operation === "complete" && token.index === left) role = "meeting";
    else if (token.index === activeIndex) role = "active";
    else if (operation === "compare" && decision === "left" && token.index === left) role = "chosen";
    else if (operation === "compare" && decision === "right" && token.index === right) role = "chosen";
    else if (token.index === left) role = "left";
    else if (token.index === right) role = "right";
    return { ...token, role };
  });

  let headline = "Resolve the lower outside wall";
  let detail = "The opposite wall guarantees a cap, so the lower side can be finalized and moved inward.";
  let equation: string | null = null;
  let actionLabel = "prepare two pointers";

  if (operation === "start") {
    headline = "Measure every basin from its safer edge";
    detail = "Two pointers close inward. At each comparison, only the lower outside wall is safe to resolve permanently.";
    equation = "water[i] = boundary max - height[i]";
    actionLabel = "place boundary pointers";
  } else if (operation === "invalid") {
    headline = "These walls cannot form a valid profile";
    detail = invalidReason ?? "Use at least two finite, non-negative wall heights.";
    equation = "height[i] >= 0";
    actionLabel = "fix heights";
  } else if (operation === "validate") {
    headline = "Every edge will be resolved once";
    detail = "Left and right only move inward. Stored boundary maxima replace the need for separate prefix and suffix arrays.";
    equation = "O(n) time | O(1) extra space";
    actionLabel = "compare outside walls";
  } else if (operation === "compare") {
    const chooseLeft = decision === "left";
    headline = chooseLeft
      ? `Left wall ${leftHeight} is no taller`
      : `Right wall ${rightHeight} is lower`;
    detail = chooseLeft
      ? `The wall at right=${right} is at least ${rightHeight}, so left=${left} can use left_max without depending on unknown interior walls.`
      : `The wall at left=${left} is ${leftHeight}, so right=${right} can use right_max without depending on unknown interior walls.`;
    equation = `${leftHeight} ${chooseLeft ? "<=" : ">"} ${rightHeight} -> resolve ${decision}`;
    actionLabel = `choose ${decision} side`;
  } else if (operation === "raise-left" || operation === "raise-right") {
    const side = operation === "raise-left" ? "left" : "right";
    headline = `${side === "left" ? "Left" : "Right"} boundary rises to ${sideMaxAfter}`;
    detail = `Wall ${activeIndex} is as high as the previous ${side}_max ${sideMaxBefore}. It becomes the new boundary and traps zero water at itself.`;
    const height = activeIndex === null ? null : heights[activeIndex];
    equation = `max(${sideMaxBefore}, ${height}) = ${sideMaxAfter}`;
    actionLabel = `raise ${side} maximum`;
  } else if (operation === "trap-left" || operation === "trap-right") {
    const side = operation === "trap-left" ? "left" : "right";
    const height = activeIndex === null ? null : heights[activeIndex];
    headline = `Index ${activeIndex} traps ${waterAdded} ${waterAdded === 1 ? "unit" : "units"}`;
    detail = `${side}_max ${sideMaxAfter} is the waterline. Subtract wall height ${height}, lock this cell, and add it to the running total ${totalWater}.`;
    equation = `${sideMaxAfter} - ${height} = ${waterAdded}`;
    actionLabel = `fill ${side} basin cell`;
  } else if (operation === "move-left" || operation === "move-right") {
    const side = operation === "move-left" ? "left" : "right";
    headline = `${side === "left" ? "Left" : "Right"} moves ${pointerFrom} -> ${pointerTo}`;
    detail = `Index ${pointerFrom} is permanent now. The ${side} pointer never revisits it, while all trapped water remains visible.`;
    equation = `${side} = ${pointerTo}`;
    actionLabel = `advance ${side}`;
  } else if (operation === "complete") {
    headline = `Total trapped water: ${totalWater}`;
    detail = `Per-index depths are [${waterDepths.join(", ")}]. Their sum is ${totalWater}, and both pointers moved only inward.`;
    equation = `${waterDepths.filter((depth) => depth > 0).join(" + ") || "0"} = ${totalWater}`;
    actionLabel = "basin scan complete";
  }

  return {
    item,
    waterItem,
    operation,
    heights,
    tokens,
    waterDepths,
    left,
    right,
    leftMax,
    rightMax,
    leftHeight,
    rightHeight,
    activeIndex,
    activeSide,
    decision,
    sideMaxBefore,
    sideMaxAfter,
    waterAdded,
    totalWater,
    pointerFrom,
    pointerTo,
    processedIndices,
    invalidReason,
    comparisons,
    pointerMoves,
    filledCells,
    maxHeight,
    headline,
    detail,
    equation,
    actionLabel,
    resultLabel: operation === "invalid" ? "invalid" : String(totalWater),
  };
}
