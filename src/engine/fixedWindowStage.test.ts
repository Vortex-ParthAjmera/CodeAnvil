import { describe, expect, it } from "vitest";
import { buildFixedWindowTrace } from "../data/traces/sliding-window-fixed";
import { getFixedWindowSceneModel, isFixedWindowTraceStep } from "./fixedWindowStage";
import { isMajorityVoteTraceStep } from "./majorityVoteStage";
import { validateTrace } from "./validateTrace";

function phaseStep(trace: ReturnType<typeof buildFixedWindowTrace>, phase: string) {
  return trace.steps.find((step) =>
    step.actions?.some((action) => action.phase === phase),
  );
}

describe("fixed-size Sliding Window trace", () => {
  it("shows seed, remove, add, shift, and both best-comparison outcomes", () => {
    const trace = buildFixedWindowTrace();
    const expectedPhases = [
      "window_start",
      "window_validate",
      "window_seed_add",
      "window_seed_complete",
      "window_remove",
      "window_add",
      "window_shift",
      "window_new_best",
      "window_keep_best",
      "window_complete",
    ];

    for (const phase of expectedPhases) expect(phaseStep(trace, phase), phase).toBeDefined();
    expect(trace.steps.at(-1)?.output).toBe("Best window: [5,1,3] | sum = 9");
    expect(getFixedWindowSceneModel(trace.steps.at(-1)!)).toMatchObject({
      operation: "complete",
      windowSize: 3,
      windowStart: 2,
      windowEnd: 4,
      currentSum: 9,
      bestSum: 9,
      bestRange: [2, 4],
      bestValues: [5, 1, 3],
      windowsChecked: 4,
      resultLabel: "9",
    });
    expect(validateTrace(trace)).toEqual([]);
  });

  it("keeps every displayed window sum consistent with its framed values", () => {
    const trace = buildFixedWindowTrace();

    for (const step of trace.steps) {
      const model = getFixedWindowSceneModel(step);
      expect(model).not.toBeNull();
      if (!model || model.operation === "start" || model.operation === "validate") continue;
      if (model.windowEnd < model.windowStart) continue;
      const displayedSum = model.values
        .slice(model.windowStart, model.windowEnd + 1)
        .reduce((sum, value) => sum + value, 0);
      expect(model.currentSum, model.operation).toBe(displayedSum);

      if (["seed-complete", "shift", "new-best", "keep-best", "complete"].includes(model.operation)) {
        expect(model.windowEnd - model.windowStart + 1, model.operation).toBe(model.windowSize);
      }
      if (model.operation === "remove") {
        expect(model.windowEnd - model.windowStart + 1).toBe(model.windowSize - 1);
      }
    }
  });

  it.each([
    [[-5, -2, -8, -1], 2, -7, [0, 1]],
    [[4, 1, 9, 2], 1, 9, [2, 2]],
    [[3, 1, 2], 3, 6, [0, 2]],
    [[1, 2, 3, 4, 5], 2, 9, [3, 4]],
  ])("finds the strongest size-%i window in %j", (input, k, expectedSum, expectedRange) => {
    const trace = buildFixedWindowTrace(input, k);
    const final = getFixedWindowSceneModel(trace.steps.at(-1)!);

    expect(final).toMatchObject({
      operation: "complete",
      bestSum: expectedSum,
      bestRange: expectedRange,
    });
    expect(validateTrace(trace)).toEqual([]);
  });

  it.each([
    [[1, 2, 3], 0, "k must be at least 1"],
    [[1, 2, 3], 4, "larger than the array length"],
    [[1, 2, 3], 1.5, "whole number"],
    [[], 1, "larger than the array length"],
  ])("rejects invalid k=%s for %j", (input, k, reason) => {
    const trace = buildFixedWindowTrace(input, k);
    const final = getFixedWindowSceneModel(trace.steps.at(-1)!);

    expect(trace.steps).toHaveLength(2);
    expect(trace.steps.at(-1)?.event).toBe("error");
    expect(final).toMatchObject({ operation: "invalid", resultLabel: "invalid" });
    expect(final?.invalidReason).toContain(reason);
    expect(validateTrace(trace)).toEqual([]);
  });

  it("keeps source token identities stable because sliding never mutates the array", () => {
    const trace = buildFixedWindowTrace();
    const first = getFixedWindowSceneModel(trace.steps[0])!;
    const last = getFixedWindowSceneModel(trace.steps.at(-1)!)!;

    expect(last.tokens.map((token) => token.id)).toEqual(first.tokens.map((token) => token.id));
    expect(last.tokens.map((token) => token.value)).toEqual(first.tokens.map((token) => token.value));
  });

  it("routes only fixed-window traces to the dedicated renderer", () => {
    const step = buildFixedWindowTrace().steps[1];

    expect(isFixedWindowTraceStep(step)).toBe(true);
    expect(isMajorityVoteTraceStep(step)).toBe(false);
  });
});
