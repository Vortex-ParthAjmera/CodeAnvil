import { describe, expect, it } from "vitest";
import { buildDutchNationalFlagTrace } from "../data/traces/dutch-national-flag";
import { generateTrace } from "./tracegen";
import { getDutchFlagSceneModel, isDutchFlagTraceStep } from "./dutchFlagStage";
import { isFourSumTraceStep } from "./fourSumStage";
import { isThreeSumTraceStep } from "./threeSumStage";
import { validateTrace } from "./validateTrace";

function phaseStep(trace: ReturnType<typeof buildDutchNationalFlagTrace>, phase: string) {
  return trace.steps.find((step) =>
    step.actions?.some((action) => action.phase === phase),
  );
}

function phase(step: ReturnType<typeof buildDutchNationalFlagTrace>["steps"][number]): string {
  return String(step.actions?.find((action) => String(action.phase).startsWith("dnf_"))?.phase ?? "");
}

function expectStableInvariants(trace: ReturnType<typeof buildDutchNationalFlagTrace>) {
  for (const step of trace.steps) {
    if (phase(step) === "dnf_place_zero") continue;
    const model = getDutchFlagSceneModel(step);
    expect(model, phase(step)).not.toBeNull();
    if (!model || model.operation === "invalid") continue;

    expect(model.values.slice(0, model.low).every((value) => value === 0), phase(step)).toBe(true);
    expect(model.values.slice(model.low, model.mid).every((value) => value === 1), phase(step)).toBe(true);
    expect(model.values.slice(model.high + 1).every((value) => value === 2), phase(step)).toBe(true);
  }
}

describe("Dutch National Flag trace", () => {
  it("records all three decisions, both swaps, pointer rules, and the four zones", () => {
    const trace = buildDutchNationalFlagTrace();
    const expectedPhases = [
      "dnf_start",
      "dnf_validate",
      "dnf_initialize",
      "dnf_inspect_zero",
      "dnf_inspect_one",
      "dnf_inspect_two",
      "dnf_place_zero",
      "dnf_place_two",
      "dnf_advance_zero",
      "dnf_advance_one",
      "dnf_retreat_high",
      "dnf_complete",
    ];

    for (const expected of expectedPhases) expect(phaseStep(trace, expected), expected).toBeDefined();

    const final = getDutchFlagSceneModel(trace.steps.at(-1)!);
    expect(final).toMatchObject({
      operation: "complete",
      values: [0, 0, 0, 1, 1, 2, 2, 2],
      zones: {
        zeros: [0, 2],
        ones: [3, 4],
        unknown: null,
        twos: [5, 7],
      },
    });
    expect(trace.steps.at(-1)?.output).toBe("Sorted: [0,0,0,1,1,2,2,2]");
    expectStableInvariants(trace);
    expect(validateTrace(trace)).toEqual([]);
  });

  it("keeps mid fixed when high retreats so the incoming value is classified", () => {
    const trace = buildDutchNationalFlagTrace();
    const retreat = getDutchFlagSceneModel(phaseStep(trace, "dnf_retreat_high")!);

    expect(retreat?.pointerFrom).not.toBeNull();
    expect(retreat?.pointerTo).not.toBeNull();
    expect(retreat?.pointerTo?.[1]).toBe(retreat?.pointerFrom?.[1]);
    expect(retreat?.pointerTo?.[2]).toBe((retreat?.pointerFrom?.[2] ?? 0) - 1);
    expect(retreat?.headline).toContain("keep mid");
  });

  it.each([
    [[2, 2, 1, 0, 0, 1], [0, 0, 1, 1, 2, 2]],
    [[0, 0, 1, 1, 2, 2], [0, 0, 1, 1, 2, 2]],
    [[0, 0, 0], [0, 0, 0]],
    [[1, 1, 1], [1, 1, 1]],
    [[2, 2, 2], [2, 2, 2]],
  ])("partitions %j without losing token identity", (input, expected) => {
    const trace = generateTrace("dutch-national-flag", { array: input });
    const first = getDutchFlagSceneModel(trace.steps[0])!;
    const final = getDutchFlagSceneModel(trace.steps.at(-1)!)!;

    expect(final.values).toEqual(expected);
    expect(final.tokens.map((token) => token.id).sort()).toEqual(first.tokens.map((token) => token.id).sort());
    expect(new Set(final.tokens.map((token) => token.id)).size).toBe(input.length);
    expectStableInvariants(trace);
    expect(validateTrace(trace)).toEqual([]);
  });

  it("rejects values outside 0, 1, and 2 instead of inventing a classification", () => {
    const trace = generateTrace("dutch-national-flag", { array: [0, 3, 2] });
    const final = getDutchFlagSceneModel(trace.steps.at(-1)!);

    expect(trace.steps).toHaveLength(2);
    expect(trace.steps.at(-1)?.event).toBe("error");
    expect(trace.steps.at(-1)?.output).toBe("");
    expect(final).toMatchObject({
      operation: "invalid",
      values: [0, 3, 2],
      invalidValues: [3],
      actionLabel: "fix input",
    });
    expect(validateTrace(trace)).toEqual([]);
  });

  it("routes only DNF traces to the dedicated renderer", () => {
    const step = buildDutchNationalFlagTrace().steps[1];

    expect(isDutchFlagTraceStep(step)).toBe(true);
    expect(isFourSumTraceStep(step)).toBe(false);
    expect(isThreeSumTraceStep(step)).toBe(false);
  });
});
