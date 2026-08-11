import type { TraceDocument } from "../types/trace";

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
