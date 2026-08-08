import type { PrimitiveValue, TraceAction, TraceDocument, TraceStep, TraceValue } from "../types";

export const TRACE_LIMITS = {
  codeCharacters: 8_000,
  sourceLines: 300,
  steps: 500,
  actionsPerStep: 12,
  arrayItems: 64,
  serializedBytes: 500_000,
} as const;

export interface TraceValidationIssue {
  path: string;
  message: string;
}

export interface TraceValidationResult {
  valid: boolean;
  issues: TraceValidationIssue[];
}

const eventTypes = new Set<TraceStep["event"]>([
  "program_start", "line_enter", "assignment", "condition_check", "loop_start",
  "loop_iteration", "function_call", "function_return", "recursion_call", "array_read",
  "array_write", "comparison", "swap", "output_write", "program_end",
]);
const actionTypes = new Set<TraceAction["type"]>([
  "focus_line", "assign", "compare", "swap", "read", "loop", "call", "return", "output", "visit_node",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPrimitive(value: unknown): value is PrimitiveValue {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function isTraceValue(value: unknown): value is TraceValue {
  if (isPrimitive(value)) return true;
  if (Array.isArray(value)) return value.length <= TRACE_LIMITS.arrayItems && value.every(isPrimitive);
  return isRecord(value) && Object.values(value).every(isPrimitive);
}

function isPair(value: unknown) {
  return Array.isArray(value) && value.length === 2 && value.every(Number.isInteger);
}

function serializedSize(value: unknown) {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function validateAction(
  action: unknown,
  step: Record<string, unknown>,
  path: string,
  add: (path: string, message: string) => void,
) {
  if (!isRecord(action) || !actionTypes.has(action.type as TraceAction["type"])) {
    add(path, "Unknown trace action.");
    return;
  }
  if (["assign", "compare", "swap", "read"].includes(String(action.type)) && typeof action.target !== "string") {
    add(`${path}.target`, "Action target is required.");
  }

  switch (action.type) {
    case "focus_line":
      if (!Number.isInteger(action.line) || action.line !== step.line) add(`${path}.line`, "Focus action must match the step line.");
      break;
    case "assign":
      if (!isTraceValue(action.value)) add(`${path}.value`, "Assignment value is invalid.");
      break;
    case "compare":
      if (!isPair(action.indices)) add(`${path}.indices`, "Comparison needs two indexes.");
      if (!Array.isArray(action.values) || action.values.length !== 2 || !action.values.every(isPrimitive)) {
        add(`${path}.values`, "Comparison needs two primitive values.");
      }
      if (action.result !== undefined && typeof action.result !== "boolean") add(`${path}.result`, "Comparison result must be boolean.");
      break;
    case "swap":
      if (!isPair(action.indices)) add(`${path}.indices`, "Swap needs two indexes.");
      if (!Array.isArray(action.before) || !action.before.every(isPrimitive)) add(`${path}.before`, "Swap needs a before snapshot.");
      if (!Array.isArray(action.after) || !action.after.every(isPrimitive)) add(`${path}.after`, "Swap needs an after snapshot.");
      if (Array.isArray(action.before) && Array.isArray(action.after) && action.before.length !== action.after.length) {
        add(path, "Swap snapshots must have the same length.");
      }
      break;
    case "read":
      if (!Number.isInteger(action.index) || Number(action.index) < 0) add(`${path}.index`, "Read index must be non-negative.");
      if (!isPrimitive(action.value)) add(`${path}.value`, "Read value must be primitive.");
      break;
    case "loop":
      if (typeof action.iterator !== "string" || !action.iterator) add(`${path}.iterator`, "Loop iterator is required.");
      if (!Number.isInteger(action.iteration) || Number(action.iteration) < 0) add(`${path}.iteration`, "Iteration must be non-negative.");
      if (!isTraceValue(action.value)) add(`${path}.value`, "Loop value is invalid.");
      break;
    case "call":
      if (typeof action.frameId !== "string" || typeof action.name !== "string") add(path, "Call identity is required.");
      if (!isRecord(action.args) || !Object.values(action.args).every(isTraceValue)) add(`${path}.args`, "Call arguments are invalid.");
      break;
    case "return":
      if (typeof action.frameId !== "string" || typeof action.name !== "string") add(path, "Return identity is required.");
      if (!isTraceValue(action.value)) add(`${path}.value`, "Return value is invalid.");
      break;
    case "output":
      if (typeof action.value !== "string" || action.value !== step.output) add(`${path}.value`, "Output action must match output.");
      break;
    case "visit_node":
      if (typeof action.node !== "string" || !Number.isInteger(action.order)) add(path, "Node visit is invalid.");
      break;
  }
}

export function validateTraceDocument(value: unknown): TraceValidationResult {
  const issues: TraceValidationIssue[] = [];
  const add = (path: string, message: string) => issues.push({ path, message });
  if (!isRecord(value)) return { valid: false, issues: [{ path: "trace", message: "Trace must be an object." }] };

  if (value.schemaVersion !== "1.0.0") add("schemaVersion", "Unsupported trace schema version.");
  if (!["python", "javascript"].includes(String(value.language))) add("language", "Unsupported trace language.");
  if (typeof value.title !== "string" || !value.title.trim()) add("title", "Trace title is required.");
  if (!isRecord(value.source) || typeof value.source.code !== "string") add("source.code", "Source code is required.");
  const code = isRecord(value.source) && typeof value.source.code === "string" ? value.source.code : "";
  const lineCount = Math.max(1, code.split("\n").length);
  if (code.length > TRACE_LIMITS.codeCharacters) add("source.code", "Source code exceeds the character limit.");
  if (lineCount > TRACE_LIMITS.sourceLines) add("source.code", "Source code exceeds the 300 lines allowed in this version.");

  const ids = new Set<string>();
  if (!Array.isArray(value.steps) || !value.steps.length) add("steps", "Trace must contain at least one step.");
  else {
    if (value.steps.length > TRACE_LIMITS.steps) add("steps", "Trace contains too many steps.");
    value.steps.forEach((step, index) => {
      const path = `steps[${index}]`;
      if (!isRecord(step)) return add(path, "Step must be an object.");
      if (step.index !== index) add(`${path}.index`, "Step indexes must be sequential.");
      if (typeof step.id !== "string" || !step.id) add(`${path}.id`, "Step ID is required.");
      else if (ids.has(step.id)) add(`${path}.id`, "Step IDs must be unique.");
      else ids.add(step.id);
      if (!Number.isInteger(step.line) || Number(step.line) < 1 || Number(step.line) > lineCount) add(`${path}.line`, "Step line must point to source.");
      if (!eventTypes.has(step.event as TraceStep["event"])) add(`${path}.event`, "Unknown trace event.");
      if (!isRecord(step.variables) || !Object.values(step.variables).every(isTraceValue)) add(`${path}.variables`, "Variables are invalid.");
      if (!Array.isArray(step.actions) || !step.actions.length) add(`${path}.actions`, "Every step needs a focus action.");
      else {
        if (step.actions.length > TRACE_LIMITS.actionsPerStep) add(`${path}.actions`, "Step contains too many actions.");
        step.actions.forEach((action, actionIndex) => validateAction(action, step, `${path}.actions[${actionIndex}]`, add));
        if (!isRecord(step.actions[0]) || step.actions[0].type !== "focus_line") add(`${path}.actions[0]`, "First action must focus the source line.");
      }
      if (!Array.isArray(step.stack)) add(`${path}.stack`, "Stack must be an array.");
      if (!Array.isArray(step.memory)) add(`${path}.memory`, "Memory must be an array.");
      else step.memory.forEach((item, memoryIndex) => {
        if (!isRecord(item) || !isTraceValue(item.value)) add(`${path}.memory[${memoryIndex}]`, "Memory item is invalid.");
      });
      if (typeof step.output !== "string") add(`${path}.output`, "Output must be a string.");
      if (!isRecord(step.visual)) add(`${path}.visual`, "Visual state is required.");
      if (!isRecord(step.changed)) add(`${path}.changed`, "Changed-state metadata is required.");
    });
  }

  if (!Array.isArray(value.practice)) add("practice", "Practice prompts must be an array.");
  else value.practice.forEach((prompt, index) => {
    if (!isRecord(prompt) || typeof prompt.stepId !== "string" || !ids.has(prompt.stepId)) add(`practice[${index}].stepId`, "Practice prompt must reference a step.");
  });
  if (serializedSize(value) > TRACE_LIMITS.serializedBytes) add("trace", "Trace exceeds the storage limit.");
  return { valid: issues.length === 0, issues };
}

export function isValidTraceDocument(value: unknown): value is TraceDocument {
  return validateTraceDocument(value).valid;
}
