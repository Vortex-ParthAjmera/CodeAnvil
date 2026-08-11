import { describe, expect, it } from "vitest";
import type { TraceStep } from "../types/trace";
import { selectRendererForStep, validateTraceAction } from "./traceActions";

const baseStep: TraceStep = {
  id: "step-000",
  index: 0,
  line: 1,
  event: "comparison",
  description: "compare two items",
  variables: {},
  stack: [],
  output: "",
};

describe("trace action schema", () => {
  it("accepts documented compare and swap item pairs", () => {
    const step: TraceStep = {
      ...baseStep,
      visual: { type: "array", itemId: "arr" },
      memory: [{ id: "arr", label: "arr", type: "array", value: [2, 1], highlights: [{ index: 0, role: "compare" }] }],
    };

    expect(validateTraceAction({ type: "compare", items: ["i", "j"] }, step)).toEqual([]);
    expect(validateTraceAction({ type: "swap", indices: [0, 1] }, step)).toEqual([]);
  });

  it("rejects known actions with missing payload shape", () => {
    expect(validateTraceAction({ type: "pointer_move", pointer: "left" }, baseStep)).toContain(
      "pointer_move action needs a destination.",
    );
  });
});

describe("renderer dispatcher", () => {
  it("routes explicit visual payloads first", () => {
    const step: TraceStep = {
      ...baseStep,
      visual: { type: "array", itemId: "arr" },
    };
    expect(selectRendererForStep(step)).toMatchObject({ kind: "array" });
  });

  it("routes action-only array steps to array rendering", () => {
    const step: TraceStep = {
      ...baseStep,
      actions: [{ type: "swap", indices: [0, 1] }],
    };
    expect(selectRendererForStep(step)).toMatchObject({ kind: "array" });
  });

  it("falls back safely when nothing specialized is present", () => {
    expect(selectRendererForStep(baseStep)).toMatchObject({ kind: "storyboard" });
  });
});
