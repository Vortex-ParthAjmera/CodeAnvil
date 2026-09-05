import { describe, expect, it } from "vitest";
import { buildNextPermutationTrace } from "../data/traces/next-permutation";
import { buildMergeIntervalsTrace } from "../data/traces/merge-intervals";
import { getNextPermutationSceneModel, isNextPermutationTraceStep } from "./nextPermutationStage";
import { isMergeIntervalsTraceStep } from "./mergeIntervalsStage";
import { validateTrace } from "./validateTrace";

describe("Next Permutation trace", () => {
  it("reveals pivot, successor, swap, and suffix reversal", () => {
    const trace = buildNextPermutationTrace();
    const final = getNextPermutationSceneModel(trace.steps.at(-1)!)!;
    const phases = new Set(trace.steps.flatMap((step) => step.actions?.map((action) => action.phase) ?? []));
    expect(trace.steps).toHaveLength(13);
    expect(phases).toEqual(expect.objectContaining(new Set([
      "permutation_scan_pivot",
      "permutation_choose_pivot",
      "permutation_scan_successor",
      "permutation_swap_pivot",
      "permutation_reverse_suffix",
    ])));
    expect(final).toMatchObject({ operation: "complete", values: [1, 4, 2, 3, 5], pivot: 1, successor: 3, wrapped: false, swaps: 2 });
    expect(trace.steps.at(-1)?.output).toBe("Next permutation: [1, 4, 2, 3, 5]");
    expect(validateTrace(trace)).toEqual([]);
  });

  it.each([
    [[1, 2, 3], [1, 3, 2], false],
    [[3, 2, 1], [1, 2, 3], true],
    [[1, 1, 5], [1, 5, 1], false],
    [[1, 5, 1], [5, 1, 1], false],
    [[7], [7], true],
  ])("finds the next ordering for %j", (input, expected, wrapped) => {
    const trace = buildNextPermutationTrace(input);
    const final = getNextPermutationSceneModel(trace.steps.at(-1)!)!;
    expect(final.values).toEqual(expected);
    expect(final.wrapped).toBe(wrapped);
    expect(validateTrace(trace)).toEqual([]);
  });

  it.each([
    [[], "at least one"],
    [[1, Number.POSITIVE_INFINITY], "finite"],
  ])("rejects invalid arrays", (input, reason) => {
    const trace = buildNextPermutationTrace(input);
    const final = getNextPermutationSceneModel(trace.steps.at(-1)!)!;
    expect(trace.steps).toHaveLength(2);
    expect(final.operation).toBe("invalid");
    expect(final.invalidReason).toContain(reason);
    expect(validateTrace(trace)).toEqual([]);
  });

  it("preserves token identity through pivot and suffix swaps", () => {
    const trace = buildNextPermutationTrace();
    const first = getNextPermutationSceneModel(trace.steps[0])!;
    const last = getNextPermutationSceneModel(trace.steps.at(-1)!)!;
    expect(new Set(last.tokens.map((token) => token.id))).toEqual(new Set(first.tokens.map((token) => token.id)));
    expect(last.tokens.find((token) => token.originalIndex === 3)?.index).toBe(1);
  });

  it("routes independently from interval traces", () => {
    const permutation = buildNextPermutationTrace().steps[0];
    const intervals = buildMergeIntervalsTrace().steps[0];
    expect(isNextPermutationTraceStep(permutation)).toBe(true);
    expect(isMergeIntervalsTraceStep(permutation)).toBe(false);
    expect(isNextPermutationTraceStep(intervals)).toBe(false);
  });
});
