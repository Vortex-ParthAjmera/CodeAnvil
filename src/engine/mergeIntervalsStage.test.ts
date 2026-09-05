import { describe, expect, it } from "vitest";
import { buildMergeIntervalsTrace, type Interval } from "../data/traces/merge-intervals";
import { buildRotateArrayTrace } from "../data/traces/rotate-array";
import { getMergeIntervalsSceneModel, isMergeIntervalsTraceStep } from "./mergeIntervalsStage";
import { isRotateArrayTraceStep } from "./rotateArrayStage";
import { validateTrace } from "./validateTrace";

function finalIntervals(input?: Interval[]) {
  const trace = buildMergeIntervalsTrace(input);
  return getMergeIntervalsSceneModel(trace.steps.at(-1)!)!;
}

describe("Merge Intervals trace", () => {
  it("sorts, compares, merges, and commits the default intervals", () => {
    const trace = buildMergeIntervalsTrace();
    const final = getMergeIntervalsSceneModel(trace.steps.at(-1)!)!;
    expect(trace.steps).toHaveLength(13);
    expect(final.operation).toBe("complete");
    expect(final.tokens.map((token) => [token.start, token.end])).toEqual([[1, 3], [2, 6], [8, 10], [9, 12], [15, 18]]);
    expect(final.mergedSegments.map((segment) => [segment.start, segment.end])).toEqual([[1, 6], [8, 12], [15, 18]]);
    expect(final).toMatchObject({ comparisons: 4, merges: 2, commits: 3 });
    expect(trace.steps.at(-1)?.output).toBe("Merged intervals: [[1, 6], [8, 12], [15, 18]]");
    expect(validateTrace(trace)).toEqual([]);
  });

  it.each([
    [[[1, 4], [2, 3]] as Interval[], [[1, 4]]],
    [[[1, 2], [2, 5], [7, 8]] as Interval[], [[1, 5], [7, 8]]],
    [[[-4, -1], [0, 2], [5, 9]] as Interval[], [[-4, -1], [0, 2], [5, 9]]],
    [[[3, 3]] as Interval[], [[3, 3]]],
  ])("returns the exact union for %j", (input, expected) => {
    const final = finalIntervals(input);
    expect(final.mergedSegments.map((segment) => [segment.start, segment.end])).toEqual(expected);
  });

  it.each([
    [[] as Interval[], "at least one"],
    [[[4, 1]] as Interval[], "less than or equal"],
    [[[1, Number.NaN]] as Interval[], "finite"],
  ])("rejects invalid intervals", (input, reason) => {
    const trace = buildMergeIntervalsTrace(input);
    const final = getMergeIntervalsSceneModel(trace.steps.at(-1)!)!;
    expect(trace.steps).toHaveLength(2);
    expect(final.operation).toBe("invalid");
    expect(final.invalidReason).toContain(reason);
    expect(validateTrace(trace)).toEqual([]);
  });

  it("keeps original interval identities after sorting", () => {
    const trace = buildMergeIntervalsTrace();
    const first = getMergeIntervalsSceneModel(trace.steps[0])!;
    const sorted = getMergeIntervalsSceneModel(trace.steps.find((step) => step.actions?.some((action) => action.phase === "interval_sort"))!)!;
    expect(new Set(sorted.tokens.map((token) => token.id))).toEqual(new Set(first.tokens.map((token) => token.id)));
    expect(sorted.tokens[0].originalIndex).toBe(1);
  });

  it("routes independently from rotation", () => {
    const intervals = buildMergeIntervalsTrace().steps[0];
    const rotate = buildRotateArrayTrace().steps[0];
    expect(isMergeIntervalsTraceStep(intervals)).toBe(true);
    expect(isRotateArrayTraceStep(intervals)).toBe(false);
    expect(isMergeIntervalsTraceStep(rotate)).toBe(false);
  });
});
