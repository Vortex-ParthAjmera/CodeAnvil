import { describe, expect, it } from "vitest";
import { traces } from "../data/traces";
import { dispatchTraceStep } from "./dispatchTraceAction";

describe("dispatchTraceStep", () => {
  it("routes calls and returns to recursion", () => {
    const call = traces[0].steps.find((step) => step.actions.some((action) => action.type === "call"))!;
    const returning = traces[0].steps.find((step) => step.actions.some((action) => action.type === "return"))!;
    expect(dispatchTraceStep(call)).toMatchObject({ kind: "recursion", tone: "active" });
    expect(dispatchTraceStep(returning)).toMatchObject({ kind: "recursion", tone: "return" });
  });

  it("routes comparisons and swaps to arrays", () => {
    const bubble = traces.find((trace) => trace.title === "Bubble Sort")!;
    const comparison = bubble.steps.find((step) => step.event === "comparison")!;
    const swap = bubble.steps.find((step) => step.event === "swap")!;
    expect(dispatchTraceStep(comparison)).toMatchObject({ kind: "array", tone: "compare", indices: [0, 1] });
    expect(dispatchTraceStep(swap)).toMatchObject({ kind: "array", tone: "active", indices: [0, 1] });
  });

  it("uses recorded return values in its explanation", () => {
    const returning = traces[0].steps.find((step) =>
      step.actions.some((action) => action.type === "return" && action.value === 24),
    )!;
    expect(dispatchTraceStep(returning).headline).toContain("24");
  });
});
