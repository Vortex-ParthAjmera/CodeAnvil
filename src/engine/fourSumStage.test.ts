import { describe, expect, it } from "vitest";
import { buildFourSumTrace } from "../data/traces/four-sum";
import { generateTrace } from "./tracegen";
import { getFourSumSceneModel, isFourSumTraceStep } from "./fourSumStage";
import { isDutchFlagTraceStep } from "./dutchFlagStage";
import { isThreeSumTraceStep } from "./threeSumStage";
import { isTwoSumHashTraceStep } from "./twoSumHashStage";
import { isTwoSumTraceStep } from "./twoSumStage";
import { validateTrace } from "./validateTrace";

function phaseStep(trace: ReturnType<typeof buildFourSumTrace>, phase: string) {
  return trace.steps.find((step) =>
    step.actions?.some((action) => action.phase === phase),
  );
}

describe("Four Sum trace", () => {
  it("records both anchors, all pointer decisions, duplicate guards, and unique solutions", () => {
    const trace = buildFourSumTrace();
    const expectedPhases = [
      "four_sum_start",
      "four_sum_sort",
      "four_sum_lock_first",
      "four_sum_lock_second",
      "four_sum_compare_low",
      "four_sum_compare_high",
      "four_sum_compare_equal",
      "four_sum_found",
      "four_sum_move_left",
      "four_sum_move_right",
      "four_sum_move_both",
      "four_sum_skip_first",
      "four_sum_skip_second",
      "four_sum_skip_left",
      "four_sum_skip_right",
      "four_sum_complete",
    ];

    for (const phase of expectedPhases) expect(phaseStep(trace, phase), phase).toBeDefined();

    expect(trace.steps.at(-1)?.output).toBe(
      "Quadruplets: [[-2,-1,1,2],[-2,0,0,2],[-1,-1,0,2],[-1,0,0,1]]",
    );
    expect(getFourSumSceneModel(trace.steps.at(-1)!)).toMatchObject({
      operation: "complete",
      target: 0,
      solutions: [
        [-2, -1, 1, 2],
        [-2, 0, 0, 2],
        [-1, -1, 0, 2],
        [-1, 0, 0, 1],
      ],
      resultLabel: "4",
    });
    expect(validateTrace(trace)).toEqual([]);
  });

  it("keeps token identity stable while sort changes visual positions", () => {
    const trace = buildFourSumTrace();
    const start = getFourSumSceneModel(phaseStep(trace, "four_sum_start")!);
    const sorted = getFourSumSceneModel(phaseStep(trace, "four_sum_sort")!);
    const startToken = start?.tokens.find((token) => token.id === "value-0");
    const sortedToken = sorted?.tokens.find((token) => token.id === "value-0");

    expect(startToken).toMatchObject({ value: -1, originalIndex: 0, sortedIndex: 1, position: 0 });
    expect(sortedToken).toMatchObject({ value: -1, originalIndex: 0, sortedIndex: 1, position: 1 });
    expect(start?.tokens.map((token) => token.id)).toEqual(sorted?.tokens.map((token) => token.id));
  });

  it("deduplicates all-zero input and handles custom targets and no solution honestly", () => {
    const allZero = generateTrace("four-sum", { array: [0, 0, 0, 0, 0], target: 0 });
    const customTarget = generateTrace("four-sum", { array: [1, 2, 3, 4, 5], target: 10 });
    const missing = generateTrace("four-sum", { array: [1, 2, 4, 8], target: 100 });
    const tooShort = generateTrace("four-sum", { array: [1, 2, 3], target: 6 });

    expect(getFourSumSceneModel(allZero.steps.at(-1)!)).toMatchObject({ solutions: [[0, 0, 0, 0]] });
    expect(getFourSumSceneModel(customTarget.steps.at(-1)!)).toMatchObject({ solutions: [[1, 2, 3, 4]] });
    expect(getFourSumSceneModel(missing.steps.at(-1)!)).toMatchObject({
      operation: "no-solution",
      solutions: [],
      resultLabel: "none",
    });
    expect(getFourSumSceneModel(tooShort.steps.at(-1)!)).toMatchObject({
      operation: "no-solution",
      solutions: [],
    });
    for (const trace of [allZero, customTarget, missing, tooShort]) {
      expect(validateTrace(trace)).toEqual([]);
    }
  });

  it("routes only Four Sum traces to the dedicated renderer", () => {
    const step = buildFourSumTrace().steps[1];

    expect(isFourSumTraceStep(step)).toBe(true);
    expect(isThreeSumTraceStep(step)).toBe(false);
    expect(isTwoSumHashTraceStep(step)).toBe(false);
    expect(isTwoSumTraceStep(step)).toBe(false);
    expect(isDutchFlagTraceStep(step)).toBe(false);
  });
});
