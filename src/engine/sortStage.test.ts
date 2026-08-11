import { describe, expect, it } from "vitest";
import { buildBubbleSortTrace } from "../data/traces/bubble-sort";
import type { TraceStep } from "../types/trace";
import { getBubbleSortSceneModel, getSortedIndices, isBubbleSortTraceStep } from "./sortStage";

describe("sort stage helpers", () => {
  it("detects bubble-sort array trace steps", () => {
    const trace = buildBubbleSortTrace();
    const compareStep = trace.steps.find((step) => step.actions?.some((action) => action.type === "compare"));

    expect(compareStep).toBeDefined();
    expect(isBubbleSortTraceStep(compareStep!)).toBe(true);
  });

  it("extracts compare, swap, counters, and sorted indices for the renderer", () => {
    const trace = buildBubbleSortTrace();
    const swapStep = trace.steps.find((step) => step.actions?.some((action) => action.type === "swap"));
    const completeStep = trace.steps[trace.steps.length - 1];

    expect(swapStep).toBeDefined();
    const model = getBubbleSortSceneModel(swapStep!);
    expect(model).toMatchObject({
      operation: "swap",
      swapPair: [0, 1],
      comparisons: 1,
      swaps: 1,
    });

    expect(getSortedIndices(completeStep)).toEqual([0, 1, 2, 3]);
  });

  it("does not claim unrelated array traces are bubble-sort scenes", () => {
    const step: TraceStep = {
      id: "step-000",
      index: 0,
      line: 1,
      event: "array_read",
      description: "Read a random array element.",
      variables: { i: 0 },
      stack: [],
      output: "",
      visual: { type: "array", itemId: "items" },
      memory: [{ id: "items", label: "items", type: "array", value: [4, 8], highlights: [{ index: 0, role: "reading" }] }],
    };

    expect(isBubbleSortTraceStep(step)).toBe(false);
  });
});
