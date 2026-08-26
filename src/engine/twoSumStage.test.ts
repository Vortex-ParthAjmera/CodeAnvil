import { describe, expect, it } from "vitest";
import { generateTrace } from "./tracegen";
import { getTwoSumSceneModel, isTwoSumTraceStep } from "./twoSumStage";

describe("two-sum sorted stage model", () => {
  it("detects sorted two-sum traces and explains the active pair", () => {
    const trace = generateTrace("two-sum", { array: [1, 2, 9, 10], target: 12 });
    const compareStep = trace.steps.find((step) => step.description.includes("Probe pair"))!;
    const model = getTwoSumSceneModel(compareStep)!;

    expect(isTwoSumTraceStep(compareStep)).toBe(true);
    expect(model.operation).toBe("compare");
    expect(model.pairLabel).toContain("a[0] + a[3]");
    expect(model.comparisonLabel).toBe("11 < 12");
  });

  it("marks pointer moves and the found answer", () => {
    const trace = generateTrace("two-sum", { array: [1, 2, 9, 10], target: 12 });
    const moveStep = trace.steps.find((step) => step.description.includes("Move L"))!;
    const foundStep = trace.steps[trace.steps.length - 1];

    const move = getTwoSumSceneModel(moveStep)!;
    const found = getTwoSumSceneModel(foundStep)!;

    expect(move.operation).toBe("move-left");
    expect(move.cells[0].eliminated).toBe(true);
    expect(found.operation).toBe("found");
    expect(found.resultLabel).toBe("found");
    expect(found.cells.filter((cell) => cell.found)).toHaveLength(2);
  });

  it("reports exhausted windows when no pair exists", () => {
    const trace = generateTrace("two-sum", { array: [1, 2, 3], target: 99 });
    const done = getTwoSumSceneModel(trace.steps[trace.steps.length - 1])!;

    expect(done.operation).toBe("not-found");
    expect(done.resultLabel).toBe("none");
  });
});
