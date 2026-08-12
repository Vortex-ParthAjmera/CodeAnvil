import type { RecursionTreeNode, TraceAction, TraceStep } from "../types/trace";

export type FactorialOperation =
  | "start"
  | "call"
  | "check"
  | "base"
  | "return"
  | "output"
  | "complete";

export interface FactorialFrame {
  id: string;
  label: string;
  n: number;
  depth: number;
  status: RecursionTreeNode["status"];
  active: boolean;
  returnValue?: number;
}

export interface FactorialRecursionSceneModel {
  frames: FactorialFrame[];
  activeFrame: FactorialFrame | null;
  returningFrame: FactorialFrame | null;
  operation: FactorialOperation;
  headline: string;
  detail: string;
  depth: number;
  returnedCount: number;
  output: string;
  line: number;
}

const FACT_CALL_RE = /^fact\((-?\d+)\)$/;

function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseFactNode(node: RecursionTreeNode): FactorialFrame | null {
  const match = FACT_CALL_RE.exec(node.label);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  return {
    id: node.id,
    label: node.label,
    n,
    depth: node.depth,
    status: node.status,
    active: false,
    returnValue: node.returnValue,
  };
}

function actionResult(step: TraceStep): boolean | null {
  const action = (step.actions ?? []).find((candidate) => candidate.type === "condition_check");
  return typeof action?.result === "boolean" ? action.result : null;
}

function actionValue(step: TraceStep): number | null {
  const action = (step.actions ?? []).find((candidate) => candidate.type === "function_return" || candidate.type === "output_write");
  return numeric(action?.value);
}

function targetIsFact(action: TraceAction): boolean {
  return action.target === "fact" || action.target === "factorial";
}

export function isFactorialRecursionStep(step: TraceStep): boolean {
  if (step.visual?.type !== "recursion_tree") return false;

  const hasFactNode = step.visual.nodes.some((node) => FACT_CALL_RE.test(node.label));
  const hasFactAction = (step.actions ?? []).some(targetIsFact);
  const text = step.description.toLowerCase();

  return hasFactNode || hasFactAction || text.includes("define fact") || text.includes("fact(");
}

export function getFactorialRecursionSceneModel(step: TraceStep): FactorialRecursionSceneModel | null {
  if (!isFactorialRecursionStep(step) || step.visual?.type !== "recursion_tree") return null;

  const frames = step.visual.nodes
    .map(parseFactNode)
    .filter((frame): frame is FactorialFrame => frame !== null)
    .map((frame) => ({
      ...frame,
      active: frame.id === step.visual?.activeNodeId,
    }))
    .sort((a, b) => a.depth - b.depth || b.n - a.n);

  const activeFrame = frames.find((frame) => frame.active) ?? null;
  const returningId = step.changed?.stack?.[0] ?? null;
  const returningFrame =
    (returningId ? frames.find((frame) => frame.id === returningId) : null) ??
    (step.event === "function_return"
      ? [...frames].reverse().find((frame) => frame.status === "returned") ?? null
      : null);

  const result = actionResult(step);
  const returnedValue = actionValue(step);
  const depth = activeFrame?.depth ?? returningFrame?.depth ?? Math.max(0, ...frames.map((frame) => frame.depth));
  const returnedCount = frames.filter((frame) => frame.status === "returned").length;

  let operation: FactorialOperation = "check";
  if (step.event === "program_start") operation = "start";
  else if (step.event === "program_end") operation = "complete";
  else if (step.event === "output_write") operation = "output";
  else if (step.event === "function_call" || step.event === "recursion_call") operation = "call";
  else if (step.event === "function_return") operation = "return";
  else if (step.event === "condition_check" && result === true) operation = "base";

  let headline = step.description;
  let detail = "Each frame pauses until the smaller factorial call resolves.";

  if (operation === "start") {
    headline = "Define fact(n)";
    detail = "The function is ready; the first call will push a frame onto the stack.";
  } else if (operation === "call") {
    const frame = activeFrame ?? frames[0] ?? null;
    headline = frame ? `Push ${frame.label}` : "Push a recursive frame";
    detail = frame
      ? `A new stack frame stores n = ${frame.n}. It will either hit the base case or ask for fact(${frame.n - 1}).`
      : step.description;
  } else if (operation === "base") {
    const frame = activeFrame ?? frames[frames.length - 1] ?? null;
    headline = frame ? `Base case at ${frame.label}` : "Base case reached";
    detail = "The descent stops here: this frame returns 1 without making another call.";
  } else if (operation === "check") {
    const frame = activeFrame ?? frames[frames.length - 1] ?? null;
    headline = frame ? `Check n = ${frame.n}` : "Check the base condition";
    detail =
      result === false && frame
        ? `n is not small enough yet, so ${frame.label} waits for fact(${frame.n - 1}).`
        : step.description;
  } else if (operation === "return") {
    const frame = returningFrame;
    headline = frame ? `Return from ${frame.label}` : "Return to the caller";
    if (frame && returnedValue !== null && frame.n > 1) {
      const childValue = returnedValue / frame.n;
      detail = `${frame.n} x fact(${frame.n - 1}) = ${frame.n} x ${childValue} = ${returnedValue}. The value travels back up.`;
    } else if (returnedValue !== null) {
      detail = `Return ${returnedValue} to the waiting caller.`;
    } else {
      detail = step.description;
    }
  } else if (operation === "output") {
    headline = "Print the final answer";
    detail = step.output ? `The call chain resolved to ${step.output}.` : step.description;
  } else if (operation === "complete") {
    headline = "Recursion complete";
    detail = "Every frame has returned, so the stack is empty.";
  }

  return {
    frames,
    activeFrame,
    returningFrame,
    operation,
    headline,
    detail,
    depth,
    returnedCount,
    output: step.output,
    line: step.line,
  };
}
