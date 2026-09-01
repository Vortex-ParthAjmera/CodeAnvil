import { describe, expect, it } from "vitest";
import { buildThreeSumTrace } from "../data/traces/three-sum";
import { generateTrace } from "./tracegen";
import { getThreeSumSceneModel, isThreeSumTraceStep } from "./threeSumStage";
import { isTwoSumHashTraceStep } from "./twoSumHashStage";
import { isTwoSumTraceStep } from "./twoSumStage";
import { validateTrace } from "./validateTrace";

function phaseStep(trace: ReturnType<typeof buildThreeSumTrace>, phase: string) {
  return trace.steps.find((step) =>
    step.actions?.some((action) => action.phase === phase),
  );
}

describe("Three Sum trace", () => {
  it("records sorting, directional comparisons, pointer moves, duplicate guards, and unique solutions", () => {
    const trace = buildThreeSumTrace();

    expect(phaseStep(trace, "three_sum_sort")).toBeDefined();
    expect(phaseStep(trace, "three_sum_compare_low")).toBeDefined();
    expect(phaseStep(trace, "three_sum_compare_high")).toBeDefined();
    expect(phaseStep(trace, "three_sum_compare_equal")).toBeDefined();
    expect(phaseStep(trace, "three_sum_move_left")).toBeDefined();
    expect(phaseStep(trace, "three_sum_move_right")).toBeDefined();
    expect(phaseStep(trace, "three_sum_move_both")).toBeDefined();
    expect(phaseStep(trace, "three_sum_skip_left")).toBeDefined();
    expect(phaseStep(trace, "three_sum_skip_anchor")).toBeDefined();
    expect(trace.steps.at(-1)?.output).toBe("Triplets: [[-1,-1,2],[-1,0,1]]");

    const finalModel = getThreeSumSceneModel(trace.steps.at(-1)!);
    expect(finalModel).toMatchObject({
      operation: "complete",
      target: 0,
      solutions: [[-1, -1, 2], [-1, 0, 1]],
      resultLabel: "2",
    });
    expect(validateTrace(trace)).toEqual([]);
  });

  it("keeps token identity stable while the visual position changes during sorting", () => {
    const trace = buildThreeSumTrace();
    const start = getThreeSumSceneModel(phaseStep(trace, "three_sum_start")!);
    const sorted = getThreeSumSceneModel(phaseStep(trace, "three_sum_sort")!);
    const startToken = start?.tokens.find((token) => token.id === "value-0");
    const sortedToken = sorted?.tokens.find((token) => token.id === "value-0");

    expect(startToken).toMatchObject({ value: -1, originalIndex: 0, sortedIndex: 1, position: 0 });
    expect(sortedToken).toMatchObject({ value: -1, originalIndex: 0, sortedIndex: 1, position: 1 });
    expect(start?.tokens.map((token) => token.id)).toEqual(sorted?.tokens.map((token) => token.id));
  });

  it("deduplicates all-zero input and honestly handles custom targets and no solution", () => {
    const allZero = generateTrace("three-sum", { array: [0, 0, 0, 0], target: 0 });
    const customTarget = generateTrace("three-sum", { array: [1, 2, 3, 4], target: 6 });
    const missing = generateTrace("three-sum", { array: [1, 2, 4, 8], target: 100 });

    expect(getThreeSumSceneModel(allZero.steps.at(-1)!)).toMatchObject({ solutions: [[0, 0, 0]] });
    expect(getThreeSumSceneModel(customTarget.steps.at(-1)!)).toMatchObject({ solutions: [[1, 2, 3]] });
    expect(getThreeSumSceneModel(missing.steps.at(-1)!)).toMatchObject({
      operation: "no-solution",
      solutions: [],
      resultLabel: "none",
    });
    expect(validateTrace(allZero)).toEqual([]);
    expect(validateTrace(customTarget)).toEqual([]);
    expect(validateTrace(missing)).toEqual([]);
  });

  it("routes only Three Sum traces to the dedicated renderer", () => {
    const step = buildThreeSumTrace().steps[1];

    expect(isThreeSumTraceStep(step)).toBe(true);
    expect(isTwoSumHashTraceStep(step)).toBe(false);
    expect(isTwoSumTraceStep(step)).toBe(false);
  });
});
