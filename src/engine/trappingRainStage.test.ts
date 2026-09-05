import { describe, expect, it } from "vitest";
import { buildDifferenceArrayTrace } from "../data/traces/difference-array";
import { buildTrappingRainWaterTrace } from "../data/traces/trapping-rain-water";
import { isDifferenceArrayTraceStep } from "./differenceArrayStage";
import { getTrappingRainSceneModel, isTrappingRainTraceStep } from "./trappingRainStage";
import { validateTrace } from "./validateTrace";

function phaseStep(trace: ReturnType<typeof buildTrappingRainWaterTrace>, phase: string) {
  return trace.steps.find((step) => step.actions?.some((action) => action.phase === phase));
}

function expectedDepths(heights: number[]): number[] {
  return heights.map((height, index) => {
    const leftMax = Math.max(...heights.slice(0, index + 1));
    const rightMax = Math.max(...heights.slice(index));
    return Math.max(0, Math.min(leftMax, rightMax) - height);
  });
}

describe("Trapping Rain Water trace", () => {
  it("resolves both sides and keeps the per-index water accounting exact", () => {
    const trace = buildTrappingRainWaterTrace();
    const expectedPhases = [
      "rain_start",
      "rain_validate",
      "rain_compare",
      "rain_raise_left",
      "rain_raise_right",
      "rain_trap_left",
      "rain_trap_right",
      "rain_move_left",
      "rain_move_right",
      "rain_complete",
    ];

    for (const phase of expectedPhases) expect(phaseStep(trace, phase), phase).toBeDefined();
    expect(trace.steps).toHaveLength(24);
    expect(trace.steps.at(-1)?.output).toBe("Trapped water = 8 units | depths = [0, 3, 1, 3, 0, 1, 0, 0]");
    expect(getTrappingRainSceneModel(trace.steps.at(-1)!)).toMatchObject({
      operation: "complete",
      waterDepths: [0, 3, 1, 3, 0, 1, 0, 0],
      totalWater: 8,
      comparisons: 7,
      pointerMoves: 7,
      filledCells: 4,
      left: 4,
      right: 4,
    });
    expect(validateTrace(trace)).toEqual([]);
  });

  it.each([
    [[3, 0, 2, 0, 4, 1, 2, 1]],
    [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]],
    [[4, 2, 0, 3, 2, 5]],
    [[2, 0, 2]],
    [[1, 2]],
  ])("matches the boundary-max definition for %j", (heights) => {
    const trace = buildTrappingRainWaterTrace(heights);
    const final = getTrappingRainSceneModel(trace.steps.at(-1)!)!;
    const expected = expectedDepths(heights);

    expect(final.waterDepths).toEqual(expected);
    expect(final.totalWater).toBe(expected.reduce((sum, depth) => sum + depth, 0));
    expect(final.waterDepths.every((depth) => depth >= 0)).toBe(true);
    expect(validateTrace(trace)).toEqual([]);
  });

  it("never changes a resolved water cell later in the trace", () => {
    const trace = buildTrappingRainWaterTrace();
    const seen = new Map<number, number>();

    for (const step of trace.steps) {
      const model = getTrappingRainSceneModel(step)!;
      for (const index of model.processedIndices) {
        const depth = model.waterDepths[index];
        if (seen.has(index)) expect(depth).toBe(seen.get(index));
        seen.set(index, depth);
      }
    }
  });

  it.each([
    [[], "at least two"],
    [[4], "at least two"],
    [[2, -1, 2], "cannot be negative"],
  ])("rejects invalid wall profiles", (heights, reason) => {
    const trace = buildTrappingRainWaterTrace(heights);
    const final = getTrappingRainSceneModel(trace.steps.at(-1)!);

    expect(trace.steps).toHaveLength(2);
    expect(trace.steps.at(-1)?.event).toBe("error");
    expect(final).toMatchObject({ operation: "invalid", resultLabel: "invalid" });
    expect(final?.invalidReason).toContain(reason);
    expect(validateTrace(trace)).toEqual([]);
  });

  it("preserves wall identity while water accumulates separately", () => {
    const trace = buildTrappingRainWaterTrace();
    const first = getTrappingRainSceneModel(trace.steps[0])!;
    const last = getTrappingRainSceneModel(trace.steps.at(-1)!)!;

    expect(last.tokens.map((token) => token.id)).toEqual(first.tokens.map((token) => token.id));
    expect(last.tokens.map((token) => token.value)).toEqual(first.tokens.map((token) => token.value));
  });

  it("routes rain-water and difference traces independently", () => {
    const rainStep = buildTrappingRainWaterTrace().steps[1];
    const differenceStep = buildDifferenceArrayTrace().steps[1];

    expect(isTrappingRainTraceStep(rainStep)).toBe(true);
    expect(isDifferenceArrayTraceStep(rainStep)).toBe(false);
    expect(isTrappingRainTraceStep(differenceStep)).toBe(false);
  });
});
