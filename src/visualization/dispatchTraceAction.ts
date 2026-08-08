import type { TraceAction, TraceStep, TraceValue } from "../types";
import { formatValue } from "../utils/formatValue";

export type TraceSceneKind = "recursion" | "array" | "variables" | "graph" | "output";
export type TraceSceneTone = "active" | "compare" | "return" | "done";

export interface TraceSceneModel {
  kind: TraceSceneKind;
  tone: TraceSceneTone;
  action: TraceAction;
  headline: string;
  detail: string;
  indices: number[];
}

function primaryAction(step: TraceStep): TraceAction {
  return step.actions.find((action) => action.type !== "focus_line") ?? step.actions[0];
}

function kindFor(step: TraceStep, action: TraceAction): TraceSceneKind {
  if (action.type === "call" || action.type === "return" || step.visual.type === "recursion_tree") return "recursion";
  if (["compare", "swap", "read"].includes(action.type)) return "array";
  if (action.type === "visit_node" || step.visual.type === "graph") return "graph";
  if (action.type === "output") return "output";
  if (step.memory.some((item) => item.type === "array")) return "array";
  return "variables";
}

function toneFor(action: TraceAction): TraceSceneTone {
  if (action.type === "compare" || action.type === "read") return "compare";
  if (action.type === "return") return "return";
  if (action.type === "output") return "done";
  return "active";
}

function formatArgs(args: Record<string, TraceValue>) {
  return Object.entries(args).map(([name, value]) => `${name}=${formatValue(value)}`).join(", ");
}

export function dispatchTraceStep(step: TraceStep): TraceSceneModel {
  const action = primaryAction(step);
  let headline = step.description;
  let detail = `Execute source line ${step.line}.`;
  let indices: number[] = [];

  switch (action.type) {
    case "focus_line":
      headline = `Focus line ${action.line}`;
      detail = step.description;
      break;
    case "assign":
      headline = `Set ${action.target}`;
      detail = `${action.target} now holds ${formatValue(action.value)}.`;
      break;
    case "compare":
      indices = [...action.indices];
      headline = `Compare ${action.target}[${action.indices[0]}] and ${action.target}[${action.indices[1]}]`;
      detail = `${formatValue(action.values[0])} versus ${formatValue(action.values[1])}${
        action.result === undefined ? "." : `; the condition is ${action.result ? "true" : "false"}.`
      }`;
      break;
    case "swap":
      indices = [...action.indices];
      headline = `Swap positions ${action.indices[0]} and ${action.indices[1]}`;
      detail = `${formatValue(action.before)} becomes ${formatValue(action.after)}.`;
      break;
    case "read":
      indices = [action.index];
      headline = `Read ${action.target}[${action.index}]`;
      detail = `The value is ${formatValue(action.value)}.`;
      break;
    case "loop":
      headline = `Advance ${action.iterator}`;
      detail = `Iteration ${action.iteration + 1} uses ${formatValue(action.value)}.`;
      break;
    case "call":
      headline = `Call ${action.name}`;
      detail = `Push a frame${Object.keys(action.args).length ? ` with ${formatArgs(action.args)}` : ""}.`;
      break;
    case "return":
      headline = `${action.name} returns ${formatValue(action.value)}`;
      detail = "Move the result up to the waiting caller and remove this frame.";
      break;
    case "output":
      headline = "Write program output";
      detail = action.value || "The program wrote an empty string.";
      break;
    case "visit_node":
      headline = `Visit node ${action.node}`;
      detail = `This is visit ${action.order + 1} in the traversal.`;
      break;
  }
  return { kind: kindFor(step, action), tone: toneFor(action), action, headline, detail, indices };
}
