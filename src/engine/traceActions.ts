import type { GridHighlight, MemoryHighlight, TraceAction, TraceStep } from "../types/trace";

type RendererKind = "recursion_tree" | "grid" | "array" | "storyboard";

export interface RendererDispatch {
  kind: RendererKind;
  reason: string;
}

const KNOWN_ACTIONS = new Set([
  "array_read",
  "array_write",
  "assignment",
  "compare",
  "comparison",
  "condition_check",
  "expand_frontier",
  "function_call",
  "function_return",
  "loop_iteration",
  "merge_split",
  "output_write",
  "path_found",
  "pointer_move",
  "push",
  "swap",
  "visit",
  "visit_node",
]);

function hasKey(action: TraceAction, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(action, key);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPair(value: unknown): value is [unknown, unknown] {
  return Array.isArray(value) && value.length === 2;
}

function hasItemsPair(action: TraceAction): boolean {
  return isPair(action.items) || isPair(action.indices);
}

function hasMemoryHighlight(step: TraceStep, guard: (item: MemoryHighlight | GridHighlight) => boolean) {
  return step.memory?.some((item) => item.highlights.some(guard)) ?? false;
}

export function validateTraceAction(action: TraceAction, step: TraceStep): string[] {
  const issues: string[] = [];

  if (typeof action.type !== "string" || action.type.trim() === "") {
    return ["action.type must be a non-empty string."];
  }

  if (!KNOWN_ACTIONS.has(action.type)) {
    return [];
  }

  switch (action.type) {
    case "compare":
    case "comparison": {
      const hasOperands = hasItemsPair(action) || (hasKey(action, "left") && hasKey(action, "right"));
      if (!hasOperands) {
        issues.push(`${action.type} action needs items/indices pair or left/right operands.`);
      }
      if (hasKey(action, "result") && typeof action.result !== "boolean") {
        issues.push(`${action.type}.result must be boolean when present.`);
      }
      break;
    }
    case "swap": {
      if (!hasItemsPair(action)) {
        issues.push("swap action needs an items or indices pair.");
      }
      break;
    }
    case "visit": {
      if (!isPair(action.cell)) {
        issues.push("visit action needs a [row, col] cell pair.");
      }
      break;
    }
    case "visit_node": {
      if (!hasKey(action, "node") && !hasKey(action, "index")) {
        issues.push("visit_node action needs a node id or index.");
      }
      break;
    }
    case "path_found": {
      if (typeof action.length !== "number" || action.length < 0) {
        issues.push("path_found.length must be a non-negative number.");
      }
      break;
    }
    case "push": {
      if (typeof action.target !== "string" || action.target.trim() === "") {
        issues.push("push.target must be a non-empty string.");
      }
      if (!hasKey(action, "value")) {
        issues.push("push action needs a value.");
      }
      break;
    }
    case "pointer_move": {
      if (typeof action.pointer !== "string" || action.pointer.trim() === "") {
        issues.push("pointer_move.pointer must be a non-empty string.");
      }
      if (!hasKey(action, "to")) {
        issues.push("pointer_move action needs a destination.");
      }
      break;
    }
    case "function_call": {
      if (typeof action.target !== "string" || action.target.trim() === "") {
        issues.push("function_call.target must be a non-empty string.");
      }
      if (hasKey(action, "args") && !isRecord(action.args)) {
        issues.push("function_call.args must be an object when present.");
      }
      break;
    }
    case "condition_check": {
      if (typeof action.condition !== "string" || action.condition.trim() === "") {
        issues.push("condition_check.condition must be a non-empty string.");
      }
      if (typeof action.result !== "boolean") {
        issues.push("condition_check.result must be boolean.");
      }
      break;
    }
    case "function_return":
    case "output_write":
    case "assignment": {
      if (!hasKey(action, "value")) {
        issues.push(`${action.type} action needs a value.`);
      }
      break;
    }
    case "array_write": {
      if (!hasKey(action, "value") && !hasKey(action, "index")) {
        issues.push("array_write action needs a value or index.");
      }
      break;
    }
    case "array_read": {
      if (!hasKey(action, "index")) {
        issues.push("array_read action needs an index.");
      }
      break;
    }
    case "merge_split": {
      if (!isPair(action.range)) {
        issues.push("merge_split action needs a [start, end] range.");
      }
      break;
    }
    case "loop_iteration":
    case "expand_frontier":
      break;
  }

  if ((action.type === "compare" || action.type === "comparison" || action.type === "swap") && step.visual?.type !== "array") {
    const hasArrayRole = hasMemoryHighlight(step, (h) => "index" in h);
    if (!hasArrayRole) {
      issues.push(`${action.type} action should point at array memory or an array visual.`);
    }
  }

  if ((action.type === "visit" || action.type === "path_found" || action.type === "expand_frontier") && step.visual?.type !== "grid") {
    const hasGridRole = hasMemoryHighlight(step, (h) => "row" in h);
    if (!hasGridRole) {
      issues.push(`${action.type} action should point at grid memory or a grid visual.`);
    }
  }

  return issues;
}

export function selectRendererForStep(step: TraceStep): RendererDispatch {
  if (step.visual?.type === "recursion_tree") {
    return { kind: "recursion_tree", reason: "recursion tree visual payload" };
  }
  if (step.visual?.type === "grid") {
    return { kind: "grid", reason: "grid visual payload" };
  }
  if (step.visual?.type === "array") {
    return { kind: "array", reason: "array visual payload" };
  }

  const actionTypes = new Set((step.actions ?? []).map((action) => action.type));
  if (actionTypes.has("visit") || actionTypes.has("path_found") || actionTypes.has("expand_frontier")) {
    return { kind: "grid", reason: "grid trace action" };
  }
  if (actionTypes.has("compare") || actionTypes.has("comparison") || actionTypes.has("swap") || actionTypes.has("array_read") || actionTypes.has("array_write")) {
    return { kind: "array", reason: "array trace action" };
  }
  return { kind: "storyboard", reason: "safe fallback" };
}
