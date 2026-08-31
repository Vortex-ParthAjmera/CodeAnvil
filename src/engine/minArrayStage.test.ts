import { describe, expect, it } from "vitest";
import { buildMinArrayTrace } from "../data/traces/min-array";
import { isBubbleSortTraceStep } from "./sortStage";
import { generateTrace } from "./tracegen";
import { validateTrace } from "./validateTrace";
import { getMinArraySceneModel, isMinArrayTraceStep } from "./minArrayStage";

describe("minimum array trace", () => {
  it("keeps comparisons and candidate transfers explicit", () => {
    const trace = buildMinArrayTrace([7, 4, 9, 1, 5]);
    const compare = trace.steps.find((step) =>
      step.actions?.some(
        (action) => action.phase === "min_compare" && action.currentIndex === 3,
      ),
    );
    const update = trace.steps.find((step) =>
      step.actions?.some(
        (action) => action.phase === "min_update" && action.candidateIndex === 3,
      ),
    );

    expect(compare).toBeDefined();
    expect(getMinArraySceneModel(compare!)).toMatchObject({
      operation: "compare",
      currentIndex: 3,
      candidateIndex: 1,
      comparisonResult: true,
      equation: "1 < 4",
    });
    expect(getMinArraySceneModel(update!)).toMatchObject({
      operation: "update",
      candidateIndex: 3,
      previousCandidateIndex: 1,
      candidateHistory: [0, 1, 3],
    });
  });

  it("supports custom and negative values without lying about the result", () => {
    const trace = generateTrace("min-array", { array: [3, -8, 2, -4] });
    const complete = trace.steps[trace.steps.length - 1];
    const model = getMinArraySceneModel(complete);

    expect(complete.output).toBe("Min: -8");
    expect(model).toMatchObject({
      operation: "complete",
      candidateIndex: 1,
      comparisons: 3,
    });
    expect(validateTrace(trace).filter((issue) => issue.level === "error")).toEqual([]);
  });

  it("routes only the new minimum trace to its dedicated renderer", () => {
    const step = buildMinArrayTrace().steps[1];

    expect(isMinArrayTraceStep(step)).toBe(true);
    expect(isBubbleSortTraceStep(step)).toBe(false);
  });
});
