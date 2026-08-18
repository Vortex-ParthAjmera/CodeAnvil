import { describe, expect, it } from "vitest";
import type { TraceStep } from "../types/trace";
import {
  buildChipModel,
  deriveLoopOp,
  deriveRangeEnd,
  findAccumulator,
  findCounter,
  hasLoopNarrative,
  isLoopNarrativeTrace,
  iterationsElapsed,
  parseFormula,
} from "./loopNarrative";

function step(over: Partial<TraceStep>): TraceStep {
  return {
    id: "x",
    index: 0,
    line: 1,
    event: "line_enter",
    description: "",
    variables: {},
    stack: [],
    output: "",
    ...over,
  } as TraceStep;
}

describe("parseFormula", () => {
  it("parses result = a x b = c descriptions", () => {
    expect(parseFormula("result = 1 × 2 = 2")).toEqual({
      lhs: "result",
      a: 1,
      op: "×",
      b: 2,
      result: 2,
    });
  });

  it("normalizes * to x and ignores non-formula text", () => {
    expect(parseFormula("total = 3 * 4 = 12 now")).toMatchObject({
      lhs: "total",
      op: "×",
      result: 12,
    });
    expect(parseFormula("Next iteration: i = 2 (range 1..5).")).toBeNull();
  });
});

describe("findCounter", () => {
  it("finds a numeric i/j/k/num", () => {
    expect(findCounter({ n: 5, result: 2, i: 3 })).toBe("i");
    expect(findCounter({ n: 5, result: 2 })).toBeNull();
    expect(findCounter({ n: 5, index: 0 })).toBe("index");
    expect(findCounter({ total: 0, num: 3 })).toBe("num");
  });
});

describe("findAccumulator", () => {
  const step = (over: Partial<TraceStep>): TraceStep =>
    ({
      id: "x",
      index: 0,
      line: 1,
      event: "line_enter",
      description: "",
      variables: {},
      stack: [],
      output: "",
      ...over,
    }) as TraceStep;

  it("returns the last non-counter assignment target", () => {
    const steps = [
      step({ actions: [{ type: "loop_iteration", i: 1 }] }),
      step({ actions: [{ type: "assignment", target: "result", value: 1 }] }),
      step({ actions: [{ type: "assignment", target: "result", value: 6 }] }),
      step({ changed: { variables: ["i"] } }),
    ];
    expect(findAccumulator(steps)).toBe("result");
  });

  it("ignores array_read targets that would shadow the accumulator", () => {
    // max-in-array reads arr every iteration; the scan must land on the
    // max_val assignment, not the later array_read's `target: "arr"`.
    const steps = [
      step({ actions: [{ type: "assignment", target: "max_val", value: 3 }] }),
      step({ actions: [{ type: "array_read", target: "arr", index: 1 }] }),
      step({ actions: [{ type: "array_read", target: "arr", index: 2 }] }),
      step({ actions: [{ type: "array_read", target: "arr", index: 3 }] }),
      step({ actions: [{ type: "array_read", target: "arr", index: 4 }] }),
    ];
    expect(findAccumulator(steps)).toBe("max_val");
  });

  it("returns null when nothing is ever assigned", () => {
    expect(findAccumulator([step({})])).toBeNull();
  });
});

describe("hasLoopNarrative", () => {
  it("detects a loop_iteration event", () => {
    expect(hasLoopNarrative([step({ event: "loop_iteration" }), step({})])).toBe(true);
  });

  it("detects a numeric counter variable", () => {
    expect(hasLoopNarrative([step({ variables: { n: 5, i: 2 } })])).toBe(true);
  });

  it("is false for plain variable steps", () => {
    expect(hasLoopNarrative([step({ variables: { n: 5, total: 3 } })])).toBe(false);
  });
});

describe("isLoopNarrativeTrace", () => {
  it("accepts factorial / sum / max style loops", () => {
    const steps = [
      step({ event: "loop_iteration", variables: { total: 0, num: 3 } }),
      step({ event: "assignment", variables: { total: 3, num: 3 } }),
    ];
    expect(isLoopNarrativeTrace(steps)).toBe(true);
  });

  it("rejects loops without a numeric counter (binary search lo/hi/mid)", () => {
    const steps = [
      step({ event: "loop_iteration", variables: { lo: 0, hi: 4 } }),
      step({ event: "comparison", variables: { lo: 0, hi: 4 } }),
    ];
    expect(isLoopNarrativeTrace(steps)).toBe(false);
  });

  it("rejects sort traces (no loop_iteration events)", () => {
    const steps = [
      step({ event: "comparison", variables: { arr: "5, 2", comparisons: 1 } }),
      step({ event: "swap", variables: { arr: "2, 5", swaps: 1 } }),
    ];
    expect(isLoopNarrativeTrace(steps)).toBe(false);
  });
});

describe("deriveLoopOp", () => {
  it("finds the x op for factorial", () => {
    const steps = [step({ description: "result = 1 × 2 = 2" })];
    expect(deriveLoopOp(steps, "result")).toBe("×");
  });

  it("finds the + op for sum of array", () => {
    const steps = [step({ description: "total = 0 + 3 = 3" })];
    expect(deriveLoopOp(steps, "total")).toBe("+");
  });

  it("returns null when the loop has no arithmetic formula (max)", () => {
    expect(deriveLoopOp([step({ description: "Update max_val = 8." })], "max_val")).toBeNull();
  });
});

describe("deriveRangeEnd + iterationsElapsed", () => {
  it("reads the range text when present", () => {
    expect(deriveRangeEnd([step({ description: "Next iteration: i = 2 (range 1..5)." })])).toBe(5);
  });

  it("falls back to the iteration count (sum / max)", () => {
    const steps = [
      step({ id: "a", event: "loop_iteration" }),
      step({ id: "b", event: "assignment" }),
      step({ id: "c", event: "loop_iteration" }),
      step({ id: "d", event: "loop_iteration" }),
    ];
    expect(deriveRangeEnd(steps)).toBe(3);
    expect(iterationsElapsed(steps, steps[2])).toBe(2);
    expect(iterationsElapsed(steps, steps[1])).toBe(1);
  });
});

describe("buildChipModel", () => {
  it("builds a completed formula chip (factorial / sum assignment)", () => {
    const s = step({ event: "assignment", description: "total = 0 + 3 = 3" });
    expect(buildChipModel(s, [s], "total", 3, null)).toEqual({
      kind: "formula",
      formula: { lhs: "total", a: 0, op: "+", b: 3, result: 3 },
    });
  });

  it("previews the next multiply on a factorial iteration step", () => {
    const s = step({ event: "loop_iteration", description: "Next iteration: i = 2 (range 1..5)." });
    const steps = [s, step({ description: "result = 1 × 2 = 2" })];
    expect(buildChipModel(s, steps, "result", 1, 2)).toEqual({
      kind: "formula",
      prefix: "next",
      formula: { lhs: "result", a: 1, op: "×", b: 2, result: 2 },
    });
  });

  it("previews the next sum on a sum iteration step", () => {
    const s = step({ event: "loop_iteration", description: "Next iteration: num = 3 (element at index 0)." });
    const steps = [s, step({ description: "total = 0 + 3 = 3" })];
    expect(buildChipModel(s, steps, "total", 0, 3)).toEqual({
      kind: "formula",
      prefix: "next",
      formula: { lhs: "total", a: 0, op: "+", b: 3, result: 3 },
    });
  });

  it("builds a comparison chip from the compare action (max)", () => {
    const s = step({
      event: "comparison",
      description: "8 > 3 → true. A new maximum found!",
      actions: [{ type: "compare", left: 8, right: 3, result: true }],
    });
    expect(buildChipModel(s, [s], "max_val", 3, 1)).toEqual({
      kind: "compare",
      left: 8,
      cmp: ">",
      right: 3,
      outcome: true,
    });
  });

  it("previews the comparison on a max iteration step (lookahead)", () => {
    const iter = step({ id: "iter", event: "loop_iteration", description: "Loop with i = 1. Is arr[1] = 8 greater than max_val = 3?" });
    const cmp = step({
      id: "cmp",
      event: "comparison",
      description: "8 > 3 → true.",
      actions: [{ type: "compare", left: 8, right: 3, result: true }],
    });
    expect(buildChipModel(iter, [iter, cmp], "max_val", 3, 1)).toEqual({
      kind: "compare",
      prefix: "next",
      left: 8,
      cmp: ">",
      right: 3,
    });
  });

  it("builds a plain assignment chip for max updates", () => {
    const s = step({ event: "assignment", description: "Update max_val = 8." });
    expect(buildChipModel(s, [s], "max_val", 8, 1)).toEqual({
      kind: "assign",
      lhs: "max_val",
      value: "8",
    });
  });
});
