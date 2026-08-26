import { describe, expect, it } from "vitest";
import { generateTrace } from "./tracegen";
import { getStringTapeSceneModel, isStringTapeTraceStep } from "./stringStage";

describe("string tape stage model", () => {
  it("detects palindrome traces and labels mirrored comparisons", () => {
    const trace = generateTrace("palindrome", { text: "racecar" });
    const compareStep = trace.steps.find((step) => step.description.includes("mirrored pair"))!;
    const model = getStringTapeSceneModel(compareStep)!;

    expect(isStringTapeTraceStep(compareStep)).toBe(true);
    expect(model.operation).toBe("compare");
    expect(model.pairLabel).toContain("s[0]");
    expect(model.cells.filter((cell) => cell.active)).toHaveLength(2);
  });

  it("locks matched pairs and marks the completed palindrome", () => {
    const trace = generateTrace("palindrome", { text: "racecar" });
    const matchStep = trace.steps.find((step) => step.description.startsWith("Match:"))!;
    const doneStep = trace.steps[trace.steps.length - 1];

    const match = getStringTapeSceneModel(matchStep)!;
    const done = getStringTapeSceneModel(doneStep)!;

    expect(match.operation).toBe("match");
    expect(match.cells.filter((cell) => cell.active && cell.locked)).toHaveLength(2);
    expect(done.operation).toBe("complete");
    expect(done.outcome).toBe("true");
    expect(done.cells.every((cell) => cell.locked)).toBe(true);
  });

  it("marks both active cells when a mismatch proves failure", () => {
    const trace = generateTrace("palindrome", { text: "hello" });
    const mismatchStep = trace.steps.find((step) => step.description.includes("Mismatch"))!;
    const model = getStringTapeSceneModel(mismatchStep)!;

    expect(model.operation).toBe("mismatch");
    expect(model.outcome).toBe("false");
    expect(model.cells.filter((cell) => cell.mismatch)).toHaveLength(2);
  });
});
