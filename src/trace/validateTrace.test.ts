import { describe, expect, it } from "vitest";
import { traces } from "../data/traces";
import type { TraceDocument } from "../types";
import { validateTraceDocument } from "./validateTrace";

const clone = (trace: TraceDocument) => JSON.parse(JSON.stringify(trace)) as TraceDocument;

describe("validateTraceDocument", () => {
  it("accepts every curated trace", () => {
    traces.forEach((trace) => expect(validateTraceDocument(trace), trace.title).toEqual({ valid: true, issues: [] }));
  });

  it("does not expose placeholder values as runtime state", () => {
    traces.forEach((trace) => {
      trace.steps.forEach((step) => {
        expect(Object.values(step.variables), trace.title + " " + step.id).not.toContain("-");
      });
    });
  });

  it("rejects duplicate step IDs", () => {
    const trace = clone(traces[0]);
    trace.steps[1].id = trace.steps[0].id;
    const result = validateTraceDocument(trace);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes("unique"))).toBe(true);
  });

  it("requires a source-line focus action", () => {
    const trace = clone(traces[0]);
    trace.steps[0].actions = [];
    const result = validateTraceDocument(trace);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === "steps[0].actions")).toBe(true);
  });

  it("keeps Bubble Sort snapshots and output truthful", () => {
    const bubble = traces.find((trace) => trace.title === "Bubble Sort")!;
    const final = bubble.steps[bubble.steps.length - 1];
    const swaps = bubble.steps.flatMap((step) =>
      step.actions.flatMap((action) => action.type === "swap" ? [action] : []),
    );
    expect(final.variables.arr).toEqual([1, 2, 4, 5]);
    expect(final.output).toBe("[1, 2, 4, 5]");
    expect(swaps.length).toBeGreaterThan(0);
    expect(swaps.every((swap) => JSON.stringify(swap.before) !== JSON.stringify(swap.after))).toBe(true);
  });
});
