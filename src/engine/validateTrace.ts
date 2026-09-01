import type { TraceDocument } from "../types/trace";
import { validateTraceAction } from "./traceActions";

/**
 * Trace validation rules (docs/16-trace-format.md).
 * Every generated or hand-authored trace must pass before playback.
 */
export interface TraceIssue {
  level: "error" | "warning";
  message: string;
}

export function validateTrace(trace: TraceDocument): TraceIssue[] {
  const issues: TraceIssue[] = [];

  if (!trace.schemaVersion) {
    issues.push({ level: "error", message: "schemaVersion is required." });
  }
  if (!trace.language) {
    issues.push({ level: "error", message: "language is required." });
  }
  if (!trace.title) {
    issues.push({ level: "warning", message: "title is empty." });
  }
  if (!trace.source?.code) {
    issues.push({ level: "error", message: "source.code is required." });
  }
  if (!Array.isArray(trace.steps) || trace.steps.length === 0) {
    issues.push({ level: "error", message: "steps must not be empty." });
    return issues;
  }

  const sourceLines = trace.source.code.split("\n").length;
  const ids = new Set<string>();

  trace.steps.forEach((step, i) => {
    if (step.index !== i) {
      issues.push({
        level: "error",
        message: `Step ${step.id}: index ${step.index} is not sequential (expected ${i}).`,
      });
    }
    if (ids.has(step.id)) {
      issues.push({ level: "error", message: `Duplicate step id: ${step.id}.` });
    }
    ids.add(step.id);
    if (step.line < 1 || step.line > sourceLines) {
      issues.push({
        level: "warning",
        message: `Step ${step.id}: line ${step.line} is outside the source (${sourceLines} lines).`,
      });
    }
    if (!step.description) {
      issues.push({ level: "warning", message: `Step ${step.id}: missing description.` });
    }

    if (!Array.isArray(step.stack)) {
      issues.push({ level: "error", message: `Step ${step.id}: stack must be an array.` });
    }

    const visual = step.visual;
    if (visual?.type === "array" || visual?.type === "grid") {
      const item = step.memory?.find((memory) => memory.id === visual.itemId);
      if (!item) {
        issues.push({
          level: "error",
          message: `Step ${step.id}: visual item ${visual.itemId} is missing from memory.`,
        });
      } else if (visual.type === "array" && item.type !== "array") {
        issues.push({
          level: "error",
          message: `Step ${step.id}: array visual points at ${item.type} memory.`,
        });
      } else if (visual.type === "grid" && item.type !== "grid") {
        issues.push({
          level: "error",
          message: `Step ${step.id}: grid visual points at ${item.type} memory.`,
        });
      }
    }

    if (step.visual?.type === "recursion_tree") {
      const nodeIds = new Set(step.visual.nodes.map((node) => node.id));
      for (const edge of step.visual.edges) {
        if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
          issues.push({
            level: "error",
            message: `Step ${step.id}: recursion edge ${edge.from} -> ${edge.to} references an unknown node.`,
          });
        }
      }
      if (step.visual.activeNodeId !== null && !nodeIds.has(step.visual.activeNodeId)) {
        issues.push({
          level: "error",
          message: `Step ${step.id}: active recursion node ${step.visual.activeNodeId} is missing.`,
        });
      }
    }

    if (step.actions !== undefined && !Array.isArray(step.actions)) {
      issues.push({ level: "error", message: `Step ${step.id}: actions must be an array.` });
    }
    step.actions?.forEach((action, actionIndex) => {
      if (typeof action.type !== "string" || action.type.trim() === "") {
        issues.push({
          level: "error",
          message: `Step ${step.id} action ${actionIndex}: action.type is required.`,
        });
      } else if (![
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
        "map_lookup",
        "map_set",
        "merge_split",
        "output_write",
        "path_found",
        "pointer_move",
        "push",
        "swap",
        "visit",
        "visit_node",
      ].includes(action.type)) {
        issues.push({
          level: "warning",
          message: `Step ${step.id} action ${actionIndex}: unknown action ${action.type}; renderer will fall back safely.`,
        });
      }

      for (const message of validateTraceAction(action, step)) {
        issues.push({
          level: "error",
          message: `Step ${step.id} action ${actionIndex}: ${message}`,
        });
      }
    });
  });

  for (const p of trace.practice ?? []) {
    if (!ids.has(p.stepId)) {
      issues.push({
        level: "warning",
        message: `Practice prompt ${p.id} references unknown step ${p.stepId}.`,
      });
    }
  }

  return issues;
}

export function traceIsValid(trace: TraceDocument): boolean {
  return !validateTrace(trace).some((i) => i.level === "error");
}
