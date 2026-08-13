import { describe, expect, it } from "vitest";
import { buildBinarySearchTrace } from "../data/traces/binary-search";
import type { TraceStep } from "../types/trace";
import { generateTrace } from "./tracegen";
import { getBinarySearchSceneModel, isBinarySearchTraceStep } from "./searchStage";

describe("binary search stage helpers", () => {
  it("detects curated binary-search trace steps", () => {
    const trace = buildBinarySearchTrace();

    expect(isBinarySearchTraceStep(trace.steps[0])).toBe(true);
  });

  it("extracts the mid probe, active range, and compare label", () => {
    const trace = buildBinarySearchTrace();
    const probe = trace.steps.find((step) => step.description.includes("mid = (0 + 5)"));

    expect(probe).toBeDefined();
    const model = getBinarySearchSceneModel(probe!);
    expect(model).toMatchObject({
      operation: "probe",
      low: 0,
      high: 5,
      mid: 2,
      compareLabel: "5 < 7",
    });
    expect(model?.cells.filter((cell) => cell.inRange).map((cell) => cell.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("detects discarded halves from generated traces", () => {
    const trace = generateTrace("binary-search", { array: [1, 3, 5, 7, 9, 11], target: 7 });
    const narrowed = trace.steps.find((step) => step.description.includes("discard the left half"));

    expect(narrowed).toBeDefined();
    const model = getBinarySearchSceneModel(narrowed!);
    expect(model?.operation).toBe("discard-left");
    expect(model?.cells.slice(0, 3).every((cell) => cell.isDiscarded)).toBe(true);
    expect(model?.rangeLabel).toBe("[3..5]");
  });

  it("ignores unrelated target-based array traces without low/high/mid", () => {
    const step: TraceStep = {
      id: "step-000",
      index: 0,
      line: 1,
      event: "program_start",
      description: "Two pointers scan toward a target sum.",
      variables: { target: 9, l: 0, r: 3 },
      stack: [],
      output: "",
      visual: { type: "array", itemId: "arr" },
      memory: [{ id: "arr", label: "arr", type: "array", value: [2, 7, 11, 15], highlights: [] }],
    };

    expect(isBinarySearchTraceStep(step)).toBe(false);
  });
});
