import type { PrimitiveValue, TraceAction, TraceStep } from "../types";

type ActionStep = Pick<TraceStep, "index" | "line" | "event" | "variables" | "changed" | "memory" | "output" | "stack">;

function primitiveAt(values: unknown[], index: number): PrimitiveValue {
  const value = values[index];
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null
    ? value
    : null;
}

export function buildStepActions(step: ActionStep, explicit: TraceAction[] = []): TraceAction[] {
  const actions: TraceAction[] = [{ type: "focus_line", line: step.line }];
  if (explicit.length) return [...actions, ...explicit];

  if (step.event === "assignment" || step.event === "array_write") {
    (step.changed.variables ?? []).forEach((target) => {
      const value = step.variables[target];
      if (value !== undefined) actions.push({ type: "assign", target, value });
    });
  }

  const memory = step.memory[0];
  const values = memory && Array.isArray(memory.value) ? memory.value : [];
  const highlighted = memory?.highlights?.map((item) => item.index) ?? [];

  if (step.event === "comparison" && memory && highlighted.length >= 2) {
    const indices: [number, number] = [highlighted[0], highlighted[1]];
    actions.push({
      type: "compare",
      target: memory.label,
      indices,
      values: [primitiveAt(values, indices[0]), primitiveAt(values, indices[1])],
    });
  }

  if (step.event === "swap" && memory && highlighted.length >= 2) {
    const snapshot = values.map((value) => primitiveAt([value], 0));
    actions.push({
      type: "swap",
      target: memory.label,
      indices: [highlighted[0], highlighted[1]],
      before: snapshot,
      after: snapshot,
    });
  }

  if ((step.event === "loop_iteration" || step.event === "array_read") && memory && highlighted.length) {
    actions.push({
      type: "read",
      target: memory.label,
      index: highlighted[0],
      value: primitiveAt(values, highlighted[0]),
    });
    const iterator = step.changed.variables?.[0];
    if (iterator && step.variables[iterator] !== undefined) {
      actions.push({ type: "loop", iterator, iteration: step.index, value: step.variables[iterator] });
    }
  }

  if (step.event === "function_call" || step.event === "recursion_call") {
    const frame = step.stack[step.stack.length - 1];
    if (frame) actions.push({ type: "call", frameId: frame.id, name: frame.name, args: frame.locals });
  }

  if (step.event === "function_return") {
    const frame = step.stack[step.stack.length - 1];
    const value = step.variables.__return__;
    if (frame && value !== undefined) {
      actions.push({ type: "return", frameId: frame.id, name: frame.name, value });
    }
  }

  if (step.event === "output_write") actions.push({ type: "output", value: step.output });
  return actions;
}
