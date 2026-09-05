import { describe, expect, it } from "vitest";
import { buildRotateArrayTrace } from "../data/traces/rotate-array";
import { buildDifferenceArrayTrace } from "../data/traces/difference-array";
import { getRotateArraySceneModel, isRotateArrayTraceStep } from "./rotateArrayStage";
import { isDifferenceArrayTraceStep } from "./differenceArrayStage";
import { validateTrace } from "./validateTrace";

function phaseStep(trace: ReturnType<typeof buildRotateArrayTrace>, phase: string) {
  return trace.steps.find((step) => step.actions?.some((action) => action.phase === phase));
}

describe("Rotate Array trace", () => {
  it("explains the complete three-reversal rotation", () => {
    const trace = buildRotateArrayTrace();
    const final = getRotateArraySceneModel(trace.steps.at(-1)!)!;

    expect(trace.steps).toHaveLength(12);
    expect(phaseStep(trace, "rotate_reverse_all")).toBeDefined();
    expect(phaseStep(trace, "rotate_reverse_prefix")).toBeDefined();
    expect(phaseStep(trace, "rotate_reverse_suffix")).toBeDefined();
    expect(final).toMatchObject({
      operation: "complete",
      normalizedShift: 2,
      values: [5, 6, 1, 2, 3, 4],
      swaps: 6,
      completedPhases: 3,
    });
    expect(trace.steps.at(-1)?.output).toBe("Rotated array: [5, 6, 1, 2, 3, 4]");
    expect(trace.practice.every((prompt) => prompt.stepId !== trace.steps.at(-1)?.id)).toBe(true);
    expect(validateTrace(trace)).toEqual([]);
  });

  it.each([
    [[1, 2, 3, 4], 6, 2, [3, 4, 1, 2]],
    [[1, 2, 3, 4], -1, 3, [2, 3, 4, 1]],
    [[8, 9, 10], 0, 0, [8, 9, 10]],
    [[7], 14, 0, [7]],
  ])("normalizes and rotates %j by %s", (input, shift, normalized, expected) => {
    const trace = buildRotateArrayTrace(input, shift);
    const final = getRotateArraySceneModel(trace.steps.at(-1)!)!;
    expect(final.normalizedShift).toBe(normalized);
    expect(final.values).toEqual(expected);
    expect(validateTrace(trace)).toEqual([]);
  });

  it.each([
    [[], 2, "at least one"],
    [[1, 2, 3], 1.5, "whole number"],
    [[1, Number.NaN], 1, "finite"],
  ])("rejects invalid input without moving tokens", (input, shift, reason) => {
    const trace = buildRotateArrayTrace(input, shift);
    const final = getRotateArraySceneModel(trace.steps.at(-1)!)!;
    expect(trace.steps).toHaveLength(2);
    expect(final.operation).toBe("invalid");
    expect(final.invalidReason).toContain(reason);
    expect(validateTrace(trace)).toEqual([]);
  });

  it("preserves token identity while positions change", () => {
    const trace = buildRotateArrayTrace();
    const first = getRotateArraySceneModel(trace.steps[0])!;
    const last = getRotateArraySceneModel(trace.steps.at(-1)!)!;
    expect(new Set(last.tokens.map((token) => token.id))).toEqual(new Set(first.tokens.map((token) => token.id)));
    expect(last.tokens.find((token) => token.originalIndex === 0)?.index).toBe(2);
  });

  it("routes independently from other array traces", () => {
    const rotate = buildRotateArrayTrace().steps[0];
    const difference = buildDifferenceArrayTrace().steps[0];
    expect(isRotateArrayTraceStep(rotate)).toBe(true);
    expect(isDifferenceArrayTraceStep(rotate)).toBe(false);
    expect(isRotateArrayTraceStep(difference)).toBe(false);
  });
});
