import { describe, expect, it } from "vitest";
import { buildMajorityVoteTrace } from "../data/traces/majority-vote";
import { getMajorityVoteSceneModel, isMajorityVoteTraceStep } from "./majorityVoteStage";
import { isDutchFlagTraceStep } from "./dutchFlagStage";
import { isFixedWindowTraceStep } from "./fixedWindowStage";
import { isFourSumTraceStep } from "./fourSumStage";
import { validateTrace } from "./validateTrace";

function phaseStep(trace: ReturnType<typeof buildMajorityVoteTrace>, phase: string) {
  return trace.steps.find((step) =>
    step.actions?.some((action) => action.phase === phase),
  );
}

describe("Moore's Voting trace Algorithm trace", () => {
  it("shows nomination, support, cancellation, and a separate proof pass", () => {
    const trace = buildMajorityVoteTrace();
    const expectedPhases = [
      "majority_start",
      "majority_inspect",
      "majority_select",
      "majority_support",
      "majority_cancel",
      "majority_candidate",
      "majority_verify_start",
      "majority_verify_match",
      "majority_verify_miss",
      "majority_verified",
    ];

    for (const phase of expectedPhases) expect(phaseStep(trace, phase), phase).toBeDefined();
    expect(trace.steps.at(-1)?.output).toBe("Majority: 2");
    expect(getMajorityVoteSceneModel(trace.steps.at(-1)!)).toMatchObject({
      operation: "verified",
      candidate: 2,
      verificationCount: 4,
      required: 4,
      isMajority: true,
      resultLabel: "2",
    });
    expect(validateTrace(trace)).toEqual([]);
  });

  it("keeps cancellation balance equal to the unmatched supporter stack", () => {
    const trace = buildMajorityVoteTrace();

    for (const step of trace.steps) {
      const model = getMajorityVoteSceneModel(step);
      expect(model).not.toBeNull();
      if (!model || model.verifying) continue;
      expect(model.balance, model.operation).toBeGreaterThanOrEqual(0);
      expect(model.supporterIndices, model.operation).toHaveLength(model.balance);
    }

    const candidate = getMajorityVoteSceneModel(phaseStep(trace, "majority_candidate")!)!;
    const cancelledIndices = candidate.cancelledPairs.flat();
    expect(new Set(cancelledIndices).size).toBe(cancelledIndices.length);
  });

  it("rejects a surviving candidate that fails the majority threshold", () => {
    const trace = buildMajorityVoteTrace([1, 2, 3, 4]);
    const final = getMajorityVoteSceneModel(trace.steps.at(-1)!);

    expect(final).toMatchObject({
      operation: "rejected",
      verificationCount: 1,
      required: 3,
      isMajority: false,
      resultLabel: "none",
    });
    expect(trace.steps.at(-1)?.output).toBe("No majority element");
    expect(validateTrace(trace)).toEqual([]);
  });

  it.each([
    [[7], 7, 1],
    [[3, 3, 4, 3, 2, 3, 3], 3, 5],
    [[-1, -1, 2, -1], -1, 3],
  ])("proves the real majority in %j", (input, expectedCandidate, expectedCount) => {
    const trace = buildMajorityVoteTrace(input);
    const final = getMajorityVoteSceneModel(trace.steps.at(-1)!);

    expect(final).toMatchObject({
      operation: "verified",
      candidate: expectedCandidate,
      verificationCount: expectedCount,
      isMajority: true,
    });
    expect(validateTrace(trace)).toEqual([]);
  });

  it("handles an empty input without inventing a candidate", () => {
    const trace = buildMajorityVoteTrace([]);
    const final = getMajorityVoteSceneModel(trace.steps.at(-1)!);

    expect(final).toMatchObject({
      operation: "rejected",
      candidate: null,
      verificationCount: 0,
      resultLabel: "none",
    });
    expect(trace.steps.at(-1)?.output).toBe("No majority element");
    expect(validateTrace(trace)).toEqual([]);
  });

  it("keeps every source token's identity stable", () => {
    const trace = buildMajorityVoteTrace();
    const first = getMajorityVoteSceneModel(trace.steps[0])!;
    const last = getMajorityVoteSceneModel(trace.steps.at(-1)!)!;

    expect(last.tokens.map((token) => token.id)).toEqual(first.tokens.map((token) => token.id));
  });

  it("routes only majority-vote traces to the dedicated renderer", () => {
    const step = buildMajorityVoteTrace().steps[1];

    expect(isMajorityVoteTraceStep(step)).toBe(true);
    expect(isFixedWindowTraceStep(step)).toBe(false);
    expect(isDutchFlagTraceStep(step)).toBe(false);
    expect(isFourSumTraceStep(step)).toBe(false);
  });
});
