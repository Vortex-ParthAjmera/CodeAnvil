import { describe, expect, it } from "vitest";
import { buildKadaneTrace } from "../data/traces/kadane";
import { isBubbleSortTraceStep } from "./sortStage";
import { generateTrace } from "./tracegen";
import { validateTrace } from "./validateTrace";
import { getKadaneSceneModel, isKadaneTraceStep } from "./kadaneStage";

describe("Kadane trace", () => {
  it("separates restart-or-extend choice from applying the running sum", () => {
    const trace = buildKadaneTrace([-2, 1, -3, 4, -1, 2, 1, -5, 4]);
    const choice = trace.steps.find((step) =>
      step.actions?.some((action) => action.phase === "kadane_choice" && action.activeIndex === 1),
    );
    const restart = trace.steps.find((step) =>
      step.actions?.some((action) => action.phase === "kadane_restart" && action.activeIndex === 1),
    );

    expect(getKadaneSceneModel(choice!)).toMatchObject({
      operation: "choice",
      activeIndex: 1,
      currentValue: 1,
      previousCurrentSum: -2,
      extendedSum: -1,
      shouldRestart: true,
      equation: "max(1, -2 + 1)",
    });
    expect(getKadaneSceneModel(restart!)).toMatchObject({
      operation: "restart",
      currentStart: 1,
      currentEnd: 1,
      currentSum: 1,
    });
  });

  it("finds the classic maximum range and keeps all-negative arrays honest", () => {
    const classic = generateTrace("kadane", { array: [-2, 1, -3, 4, -1, 2, 1, -5, 4] });
    const classicModel = getKadaneSceneModel(classic.steps[classic.steps.length - 1]);
    const negative = generateTrace("kadane", { array: [-8, -3, -6, -2, -5, -4] });
    const negativeModel = getKadaneSceneModel(negative.steps[negative.steps.length - 1]);

    expect(classic.steps[classic.steps.length - 1].output).toBe("Max subarray: 6");
    expect(classicModel).toMatchObject({ bestSum: 6, bestStart: 3, bestEnd: 6 });
    expect(negative.steps[negative.steps.length - 1].output).toBe("Max subarray: -2");
    expect(negativeModel).toMatchObject({ bestSum: -2, bestStart: 3, bestEnd: 3 });
    expect(validateTrace(classic).filter((issue) => issue.level === "error")).toEqual([]);
    expect(validateTrace(negative).filter((issue) => issue.level === "error")).toEqual([]);
  });

  it("routes only Kadane steps to the dedicated renderer", () => {
    const step = buildKadaneTrace().steps[1];

    expect(isKadaneTraceStep(step)).toBe(true);
    expect(isBubbleSortTraceStep(step)).toBe(false);
  });
});
