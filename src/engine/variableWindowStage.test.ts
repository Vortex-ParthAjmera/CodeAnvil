import { describe, expect, it } from "vitest";
import { buildVariableWindowTrace } from "../data/traces/sliding-window-variable";
import { buildFixedWindowTrace } from "../data/traces/sliding-window-fixed";
import { isFixedWindowTraceStep } from "./fixedWindowStage";
import { getVariableWindowSceneModel, isVariableWindowTraceStep } from "./variableWindowStage";
import { validateTrace } from "./validateTrace";

function phaseStep(trace: ReturnType<typeof buildVariableWindowTrace>, phase: string) {
  return trace.steps.find((step) => step.actions?.some((action) => action.phase === phase));
}

describe("variable-size Sliding Window trace", () => {
  it("teaches expansion, threshold switching, contraction, and best promotion", () => {
    const trace = buildVariableWindowTrace();
    const expectedPhases = [
      "variable_window_start",
      "variable_window_validate",
      "variable_window_expand",
      "variable_window_below_target",
      "variable_window_target_met",
      "variable_window_new_best",
      "variable_window_keep_best",
      "variable_window_shrink",
      "variable_window_move_left",
      "variable_window_complete",
    ];

    for (const phase of expectedPhases) expect(phaseStep(trace, phase), phase).toBeDefined();
    expect(trace.steps.at(-1)?.output).toBe("Shortest window: [4,3] | length = 2 | sum = 7");
    expect(getVariableWindowSceneModel(trace.steps.at(-1)!)).toMatchObject({
      operation: "complete",
      target: 7,
      windowStart: 5,
      windowEnd: 5,
      currentSum: 3,
      displaySum: 7,
      displayValid: true,
      bestLength: 2,
      bestRange: [4, 5],
      bestValues: [4, 3],
      bestSum: 7,
      expansions: 6,
      contractions: 5,
      candidatesChecked: 5,
      resultLabel: "2",
    });
    expect(validateTrace(trace)).toEqual([]);
  });

  it("keeps every active sum equal to the values inside its current boundaries", () => {
    const trace = buildVariableWindowTrace();

    for (const step of trace.steps) {
      const model = getVariableWindowSceneModel(step);
      expect(model).not.toBeNull();
      if (!model || model.windowEnd < model.windowStart) continue;
      const displayedSum = model.values
        .slice(model.windowStart, model.windowEnd + 1)
        .reduce((sum, value) => sum + value, 0);
      expect(model.currentSum, `${model.operation} at ${step.id}`).toBe(displayedSum);
      expect(model.windowValid).toBe(model.currentSum >= model.target);
    }
  });

  it.each([
    [[2, 3, 1, 2, 4, 3], 7, 2, [4, 5]],
    [[1, 4, 4], 4, 1, [1, 1]],
    [[1, 2, 3, 4], 6, 2, [2, 3]],
    [[5], 5, 1, [0, 0]],
  ])("finds the shortest target window for %j", (input, target, expectedLength, expectedRange) => {
    const trace = buildVariableWindowTrace(input, target);
    const final = getVariableWindowSceneModel(trace.steps.at(-1)!);

    expect(final).toMatchObject({
      operation: "complete",
      bestLength: expectedLength,
      bestRange: expectedRange,
    });
    expect(validateTrace(trace)).toEqual([]);
  });

  it("reports an honest no-solution result", () => {
    const trace = buildVariableWindowTrace([1, 1, 1], 10);
    const final = getVariableWindowSceneModel(trace.steps.at(-1)!);

    expect(final).toMatchObject({ operation: "complete", bestLength: null, bestRange: null, resultLabel: "-" });
    expect(trace.steps.at(-1)?.output).toBe("No contiguous window reaches target 10");
    expect(validateTrace(trace)).toEqual([]);
  });

  it.each([
    [[], 5, "at least one"],
    [[1, 0, 3], 3, "positive"],
    [[1, -2, 3], 3, "positive"],
    [[1, 2, 3], 0, "target must be a positive"],
  ])("rejects inputs that break monotonic-window assumptions", (input, target, reason) => {
    const trace = buildVariableWindowTrace(input, target);
    const final = getVariableWindowSceneModel(trace.steps.at(-1)!);

    expect(trace.steps).toHaveLength(2);
    expect(trace.steps.at(-1)?.event).toBe("error");
    expect(final).toMatchObject({ operation: "invalid", resultLabel: "invalid" });
    expect(final?.invalidReason).toContain(reason);
    expect(validateTrace(trace)).toEqual([]);
  });

  it("preserves token identity because the window moves over an immutable array", () => {
    const trace = buildVariableWindowTrace();
    const first = getVariableWindowSceneModel(trace.steps[0])!;
    const last = getVariableWindowSceneModel(trace.steps.at(-1)!)!;

    expect(last.tokens.map((token) => token.id)).toEqual(first.tokens.map((token) => token.id));
    expect(last.tokens.map((token) => token.value)).toEqual(first.tokens.map((token) => token.value));
  });

  it("routes variable and fixed windows to different dedicated renderers", () => {
    const variableStep = buildVariableWindowTrace().steps[1];
    const fixedStep = buildFixedWindowTrace().steps[1];

    expect(isVariableWindowTraceStep(variableStep)).toBe(true);
    expect(isFixedWindowTraceStep(variableStep)).toBe(false);
    expect(isVariableWindowTraceStep(fixedStep)).toBe(false);
  });
});
