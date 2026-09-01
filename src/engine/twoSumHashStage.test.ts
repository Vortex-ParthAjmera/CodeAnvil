import { describe, expect, it } from "vitest";
import { buildTwoSumHashTrace } from "../data/traces/two-sum-hash";
import { generateTrace } from "./tracegen";
import { getTwoSumHashSceneModel, isTwoSumHashTraceStep } from "./twoSumHashStage";
import { isTwoSumTraceStep } from "./twoSumStage";
import { validateTrace } from "./validateTrace";

describe("Two Sum hashing trace", () => {
  it("separates complement calculation, lookup, storage, and the final match", () => {
    const trace = buildTwoSumHashTrace([4, 7, 1, 8, 3, 6], 10);
    const read = trace.steps.find((step) =>
      step.actions?.some((action) => action.phase === "two_sum_hash_read" && action.activeIndex === 0),
    );
    const miss = trace.steps.find((step) =>
      step.actions?.some((action) => action.phase === "two_sum_hash_lookup_miss" && action.activeIndex === 0),
    );
    const store = trace.steps.find((step) =>
      step.actions?.some((action) => action.phase === "two_sum_hash_store" && action.activeIndex === 0),
    );
    const hit = trace.steps.find((step) =>
      step.actions?.some((action) => action.phase === "two_sum_hash_lookup_hit"),
    );

    expect(getTwoSumHashSceneModel(read!)).toMatchObject({
      operation: "read",
      activeIndex: 0,
      currentValue: 4,
      complement: 6,
      equation: "10 - 4 = 6",
    });
    expect(getTwoSumHashSceneModel(miss!)).toMatchObject({
      operation: "lookup-miss",
      entries: [],
    });
    expect(getTwoSumHashSceneModel(store!)).toMatchObject({
      operation: "store",
      entries: [{ value: 4, index: 0, order: 0, active: true, matched: false }],
    });
    expect(getTwoSumHashSceneModel(hit!)).toMatchObject({
      operation: "lookup-hit",
      activeIndex: 4,
      currentValue: 3,
      complement: 7,
      hitIndex: 1,
      pairIndices: [1, 4],
    });
    expect(trace.steps.at(-1)?.output).toBe("Pair indices: [1, 4]");
  });

  it("handles duplicates, negative complements, and no-solution inputs", () => {
    const duplicate = generateTrace("two-sum-hash", { array: [3, 3], target: 6 });
    const negative = generateTrace("two-sum-hash", { array: [-3, 4, 3, 90], target: 0 });
    const missing = generateTrace("two-sum-hash", { array: [1, 2, 4], target: 8 });

    expect(duplicate.steps.at(-1)?.output).toBe("Pair indices: [0, 1]");
    expect(getTwoSumHashSceneModel(duplicate.steps.at(-1)!)).toMatchObject({ pairIndices: [0, 1] });
    expect(negative.steps.at(-1)?.output).toBe("Pair indices: [0, 2]");
    expect(missing.steps.at(-1)?.output).toBe("No pair");
    expect(getTwoSumHashSceneModel(missing.steps.at(-1)!)).toMatchObject({
      operation: "not-found",
      pairIndices: null,
    });
    expect(validateTrace(duplicate).filter((issue) => issue.level === "error")).toEqual([]);
    expect(validateTrace(negative).filter((issue) => issue.level === "error")).toEqual([]);
    expect(validateTrace(missing).filter((issue) => issue.level === "error")).toEqual([]);
  });

  it("routes only the hashing variant to its dedicated renderer", () => {
    const step = buildTwoSumHashTrace().steps[1];

    expect(isTwoSumHashTraceStep(step)).toBe(true);
    expect(isTwoSumTraceStep(step)).toBe(false);
  });
});
