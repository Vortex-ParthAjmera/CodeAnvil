import { describe, expect, it } from "vitest";
import { buildDifferenceArrayTrace } from "../data/traces/difference-array";
import { buildPrefixSumTrace } from "../data/traces/prefix-sum";
import { getDifferenceArraySceneModel, isDifferenceArrayTraceStep } from "./differenceArrayStage";
import { isPrefixSumTraceStep } from "./prefixSumStage";
import { validateTrace } from "./validateTrace";

function phaseStep(trace: ReturnType<typeof buildDifferenceArrayTrace>, phase: string) {
  return trace.steps.find((step) => step.actions?.some((action) => action.phase === phase));
}

describe("Difference Array trace", () => {
  it("builds differences, edits two boundaries, and reconstructs the update", () => {
    const trace = buildDifferenceArrayTrace();
    const expectedPhases = [
      "difference_start",
      "difference_validate",
      "difference_seed",
      "difference_build",
      "difference_mark_start",
      "difference_mark_stop",
      "difference_reconstruct",
      "difference_complete",
    ];

    for (const phase of expectedPhases) expect(phaseStep(trace, phase), phase).toBeDefined();
    expect(trace.steps).toHaveLength(17);
    expect(trace.steps.at(-1)?.output).toBe("Updated array: [2, 4, 6, 5, 7, 1]");
    expect(getDifferenceArraySceneModel(trace.steps.at(-1)!)).toMatchObject({
      operation: "complete",
      diff: [2, 2, 2, -1, 2, -6],
      result: [2, 4, 6, 5, 7, 1],
      finalValues: [2, 4, 6, 5, 7, 1],
      rangeStart: 1,
      rangeEnd: 4,
      delta: 3,
      boundaryEdits: 2,
      reconstructionAdds: 6,
    });
    expect(validateTrace(trace)).toEqual([]);
  });

  it.each([
    [[2, 1, 3, 2], 1, 2, 4, [2, 5, 7, 2]],
    [[1, 2, 3, 4], 2, 3, -2, [1, 2, 1, 2]],
    [[5, 5, 5], 0, 0, 3, [8, 5, 5]],
  ])("applies one inclusive range update to %j", (input, left, right, delta, expected) => {
    const trace = buildDifferenceArrayTrace(input, left, right, delta);
    const final = getDifferenceArraySceneModel(trace.steps.at(-1)!);

    expect(final?.finalValues).toEqual(expected);
    expect(final?.operation).toBe("complete");
    expect(validateTrace(trace)).toEqual([]);
  });

  it("omits the stop marker when the range reaches the final index", () => {
    const trace = buildDifferenceArrayTrace([1, 2, 3, 4], 2, 3, -2);
    const final = getDifferenceArraySceneModel(trace.steps.at(-1)!);

    expect(phaseStep(trace, "difference_open_end")).toBeDefined();
    expect(phaseStep(trace, "difference_mark_stop")).toBeUndefined();
    expect(final).toMatchObject({ boundaryEdits: 1, finalValues: [1, 2, 1, 2] });
  });

  it.each([
    [[], 0, 0, 2, "at least one"],
    [[1, 2, 3], -1, 2, 2, "must satisfy"],
    [[1, 2, 3], 2, 1, 2, "must satisfy"],
    [[1, 2, 3], 0, 3, 2, "must satisfy"],
    [[1, 2, 3], 0.5, 2, 2, "whole-number"],
  ])("rejects an invalid range without fabricating output", (input, left, right, delta, reason) => {
    const trace = buildDifferenceArrayTrace(input, left, right, delta);
    const final = getDifferenceArraySceneModel(trace.steps.at(-1)!);

    expect(trace.steps).toHaveLength(2);
    expect(trace.steps.at(-1)?.event).toBe("error");
    expect(final).toMatchObject({ operation: "invalid", resultLabel: "invalid" });
    expect(final?.invalidReason).toContain(reason);
    expect(validateTrace(trace)).toEqual([]);
  });

  it("preserves identity across all three rails", () => {
    const trace = buildDifferenceArrayTrace();
    const first = getDifferenceArraySceneModel(trace.steps[0])!;
    const last = getDifferenceArraySceneModel(trace.steps.at(-1)!)!;

    expect(last.tokens.map((token) => token.id)).toEqual(first.tokens.map((token) => token.id));
    expect(last.diffTokens.map((token) => token.id)).toEqual(first.diffTokens.map((token) => token.id));
    expect(last.resultTokens.map((token) => token.id)).toEqual(first.resultTokens.map((token) => token.id));
  });

  it("routes difference and prefix traces independently", () => {
    const differenceStep = buildDifferenceArrayTrace().steps[1];
    const prefixStep = buildPrefixSumTrace().steps[1];

    expect(isDifferenceArrayTraceStep(differenceStep)).toBe(true);
    expect(isPrefixSumTraceStep(differenceStep)).toBe(false);
    expect(isDifferenceArrayTraceStep(prefixStep)).toBe(false);
  });
});
