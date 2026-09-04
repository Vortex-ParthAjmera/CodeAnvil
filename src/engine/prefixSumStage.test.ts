import { describe, expect, it } from "vitest";
import { buildPrefixSumTrace } from "../data/traces/prefix-sum";
import { buildVariableWindowTrace } from "../data/traces/sliding-window-variable";
import { getPrefixSumSceneModel, isPrefixSumTraceStep } from "./prefixSumStage";
import { isVariableWindowTraceStep } from "./variableWindowStage";
import { validateTrace } from "./validateTrace";

function phaseStep(trace: ReturnType<typeof buildPrefixSumTrace>, phase: string) {
  return trace.steps.find((step) => step.actions?.some((action) => action.phase === phase));
}

describe("Prefix Sum trace", () => {
  it("builds n+1 checkpoints and answers a range with one subtraction", () => {
    const trace = buildPrefixSumTrace();
    const expectedPhases = [
      "prefix_start",
      "prefix_validate",
      "prefix_seed",
      "prefix_read",
      "prefix_write",
      "prefix_query_range",
      "prefix_subtract",
      "prefix_complete",
    ];

    for (const phase of expectedPhases) expect(phaseStep(trace, phase), phase).toBeDefined();
    expect(trace.steps.at(-1)?.output).toBe("Range [1..4] sum = 11");
    expect(getPrefixSumSceneModel(trace.steps.at(-1)!)).toMatchObject({
      operation: "complete",
      prefix: [0, 3, 4, 8, 9, 14, 23],
      queryLeft: 1,
      queryRight: 4,
      queryLeftValue: 3,
      queryRightValue: 14,
      rangeSum: 11,
      additions: 6,
      resultLabel: "11",
    });
    expect(validateTrace(trace)).toEqual([]);
  });

  it("keeps every written checkpoint equal to previous prefix plus current input", () => {
    const trace = buildPrefixSumTrace();
    const writes = trace.steps
      .map(getPrefixSumSceneModel)
      .filter((model) => model?.operation === "write");

    expect(writes).toHaveLength(6);
    for (const model of writes) {
      expect(model).not.toBeNull();
      expect(model!.prefixResult).toBe((model!.prefixBefore ?? 0) + (model!.inputValue ?? 0));
      expect(model!.prefix[model!.destinationPrefixIndex!]).toBe(model!.prefixResult);
    }
  });

  it.each([
    [[3, 1, 4, 1, 5, 9], 1, 4, 11],
    [[5, -2, 7], 0, 2, 10],
    [[5, -2, 7], 1, 1, -2],
    [[2, 4, 6, 8], 2, 3, 14],
  ])("answers inclusive range [%i..%i] in %j", (input, left, right, expected) => {
    const trace = buildPrefixSumTrace(input, left, right);
    const final = getPrefixSumSceneModel(trace.steps.at(-1)!);

    expect(final).toMatchObject({ operation: "complete", rangeSum: expected });
    expect(validateTrace(trace)).toEqual([]);
  });

  it.each([
    [[], 0, 0, "at least one"],
    [[1, 2, 3], -1, 2, "must satisfy"],
    [[1, 2, 3], 2, 1, "must satisfy"],
    [[1, 2, 3], 0, 3, "must satisfy"],
    [[1, 2, 3], 0.5, 2, "whole-number"],
  ])("rejects invalid range inputs", (input, left, right, reason) => {
    const trace = buildPrefixSumTrace(input, left, right);
    const final = getPrefixSumSceneModel(trace.steps.at(-1)!);

    expect(trace.steps).toHaveLength(2);
    expect(trace.steps.at(-1)?.event).toBe("error");
    expect(final).toMatchObject({ operation: "invalid", resultLabel: "invalid" });
    expect(final?.invalidReason).toContain(reason);
    expect(validateTrace(trace)).toEqual([]);
  });

  it("preserves stable identities across both rails", () => {
    const trace = buildPrefixSumTrace();
    const first = getPrefixSumSceneModel(trace.steps[0])!;
    const last = getPrefixSumSceneModel(trace.steps.at(-1)!)!;

    expect(last.tokens.map((token) => token.id)).toEqual(first.tokens.map((token) => token.id));
    expect(last.prefixTokens.map((token) => token.id)).toEqual(first.prefixTokens.map((token) => token.id));
  });

  it("routes prefix and window traces independently", () => {
    const prefixStep = buildPrefixSumTrace().steps[1];
    const windowStep = buildVariableWindowTrace().steps[1];

    expect(isPrefixSumTraceStep(prefixStep)).toBe(true);
    expect(isVariableWindowTraceStep(prefixStep)).toBe(false);
    expect(isPrefixSumTraceStep(windowStep)).toBe(false);
  });
});
