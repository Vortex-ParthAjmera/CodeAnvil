import { describe, expect, it } from "vitest";
import { buildReverseArrayTrace } from "../data/traces/reverse-array";
import { isBubbleSortTraceStep } from "./sortStage";
import { generateTrace } from "./tracegen";
import { validateTrace } from "./validateTrace";
import { getReverseArraySceneModel, isReverseArrayTraceStep } from "./reverseArrayStage";

describe("reverse array trace", () => {
  it("separates pair selection, physical swap, and pointer advance", () => {
    const trace = buildReverseArrayTrace([9, 3, 7, 1, 5, 2]);
    const pair = trace.steps.find((step) =>
      step.actions?.some((action) => action.phase === "reverse_pair"),
    );
    const swap = trace.steps.find((step) =>
      step.actions?.some((action) => action.phase === "reverse_swap"),
    );
    const advance = trace.steps.find((step) =>
      step.actions?.some((action) => action.phase === "reverse_advance"),
    );

    expect(getReverseArraySceneModel(pair!)).toMatchObject({
      operation: "pair",
      leftIndex: 0,
      rightIndex: 5,
      pairValues: [9, 2],
      equation: "arr[0] <-> arr[5]",
    });
    expect(getReverseArraySceneModel(swap!)).toMatchObject({
      operation: "swap",
      values: [2, 3, 7, 1, 5, 9],
      tokenOrder: [5, 1, 2, 3, 4, 0],
      settledIndices: [0, 5],
    });
    expect(getReverseArraySceneModel(advance!)).toMatchObject({
      operation: "advance",
      leftIndex: 1,
      rightIndex: 4,
      previousLeftIndex: 0,
      previousRightIndex: 5,
    });
  });

  it("preserves token identity for duplicate values and handles an untouched center", () => {
    const trace = generateTrace("reverse-array", { array: [4, 1, 4, 2, 4] });
    const complete = trace.steps[trace.steps.length - 1];
    const center = trace.steps.find((step) =>
      step.actions?.some((action) => action.phase === "reverse_center"),
    );

    expect(complete.output).toBe("Reversed: [4, 2, 4, 1, 4]");
    expect(getReverseArraySceneModel(complete)).toMatchObject({
      operation: "complete",
      tokenOrder: [4, 3, 2, 1, 0],
      swaps: 2,
    });
    expect(getReverseArraySceneModel(center!)).toMatchObject({
      operation: "center",
      leftIndex: 2,
      rightIndex: 2,
    });
    expect(validateTrace(trace).filter((issue) => issue.level === "error")).toEqual([]);
  });

  it("routes only reverse-array steps to the dedicated renderer", () => {
    const step = buildReverseArrayTrace().steps[1];

    expect(isReverseArrayTraceStep(step)).toBe(true);
    expect(isBubbleSortTraceStep(step)).toBe(false);
  });
});
