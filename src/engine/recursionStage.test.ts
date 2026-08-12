import { describe, expect, it } from "vitest";
import { buildFactorialRecursionTrace } from "../data/traces/factorial-recursion";
import type { TraceStep } from "../types/trace";
import { getFactorialRecursionSceneModel, isFactorialRecursionStep } from "./recursionStage";

describe("factorial recursion stage helpers", () => {
  it("detects factorial recursion from the first defining step", () => {
    const trace = buildFactorialRecursionTrace();

    expect(isFactorialRecursionStep(trace.steps[0])).toBe(true);
  });

  it("extracts call depth and active frame copy", () => {
    const trace = buildFactorialRecursionTrace();
    const callStep = trace.steps.find((step) => step.event === "recursion_call" && step.description.includes("fact(3)"));

    expect(callStep).toBeDefined();
    const model = getFactorialRecursionSceneModel(callStep!);
    expect(model?.operation).toBe("call");
    expect(model?.activeFrame).toMatchObject({ label: "fact(3)", n: 3, active: true });
    expect(model?.headline).toBe("Push fact(3)");
  });

  it("extracts the returning frame and multiplication explanation", () => {
    const trace = buildFactorialRecursionTrace();
    const returnStep = trace.steps.find((step) => step.event === "function_return" && step.description.includes("fact(4) resolves"));

    expect(returnStep).toBeDefined();
    const model = getFactorialRecursionSceneModel(returnStep!);
    expect(model?.operation).toBe("return");
    expect(model?.returningFrame).toMatchObject({ label: "fact(4)", returnValue: 24 });
    expect(model?.detail).toContain("4 x fact(3)");
  });

  it("ignores unrelated recursion tree labels", () => {
    const step: TraceStep = {
      id: "step-000",
      index: 0,
      line: 1,
      event: "function_call",
      description: "Call fib(3)",
      variables: {},
      stack: [],
      output: "",
      visual: {
        type: "recursion_tree",
        nodes: [{ id: "fib-1", label: "fib(3)", parentId: null, depth: 0, status: "active" }],
        edges: [],
        activeNodeId: "fib-1",
      },
    };

    expect(isFactorialRecursionStep(step)).toBe(false);
  });
});
