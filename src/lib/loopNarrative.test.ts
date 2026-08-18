import { describe, expect, it } from "vitest";
import type { TraceStep } from "../types/trace";
import {
  findAccumulator,
  findCounter,
  hasLoopNarrative,
  parseFormula,
} from "./loopNarrative";

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
  it("finds a numeric i/j/k", () => {
    expect(findCounter({ n: 5, result: 2, i: 3 })).toBe("i");
    expect(findCounter({ n: 5, result: 2 })).toBeNull();
    expect(findCounter({ n: 5, index: 0 })).toBe("index");
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

  it("returns null when nothing is ever assigned", () => {
    expect(findAccumulator([step({})])).toBeNull();
  });
});

describe("hasLoopNarrative", () => {
  const step = (over: Partial<TraceStep>): TraceStep =>
    ({ id: "x", index: 0, line: 1, event: "line_enter", description: "", variables: {}, stack: [], output: "", ...over }) as TraceStep;

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
