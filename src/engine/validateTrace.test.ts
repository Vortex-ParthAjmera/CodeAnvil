import { describe, expect, it } from "vitest";
import { EXAMPLES } from "../data/examples";
import { traceIsValid, validateTrace } from "./validateTrace";
import type { TraceDocument } from "../types/trace";

function fakeTrace(overrides: Partial<TraceDocument> = {}): TraceDocument {
  return {
    schemaVersion: "1.0.0",
    language: "python",
    title: "T",
    source: { code: "x = 1\nprint(x)", entrypoint: "main" },
    metadata: { topic: "t", difficulty: "beginner", estimatedDurationSeconds: 10 },
    steps: [
      {
        id: "step-000",
        index: 0,
        line: 1,
        event: "program_start",
        description: "d",
        variables: {},
        stack: [],
        output: "",
      },
      {
        id: "step-001",
        index: 1,
        line: 2,
        event: "output_write",
        description: "d",
        variables: {},
        stack: [],
        output: "1",
      },
    ],
    practice: [],
    ...overrides,
  };
}

describe("validateTrace", () => {
  it("accepts a well-formed trace", () => {
    expect(validateTrace(fakeTrace())).toEqual([]);
    expect(traceIsValid(fakeTrace())).toBe(true);
  });

  it("rejects an empty steps list", () => {
    const issues = validateTrace(fakeTrace({ steps: [] }));
    expect(issues.some((i) => i.message.includes("must not be empty"))).toBe(true);
  });

  it("rejects non-sequential indexes", () => {
    const trace = fakeTrace();
    trace.steps[1] = { ...trace.steps[1], index: 3 };
    const issues = validateTrace(trace);
    expect(issues.some((i) => i.message.includes("not sequential"))).toBe(true);
  });

  it("rejects duplicate step ids", () => {
    const trace = fakeTrace();
    trace.steps[1] = { ...trace.steps[1], id: "step-000" };
    const issues = validateTrace(trace);
    expect(issues.some((i) => i.message.includes("Duplicate step id"))).toBe(true);
  });

  it("flags practice prompts pointing at unknown steps", () => {
    const trace = fakeTrace({
      practice: [{ id: "p1", stepId: "nope", type: "predict_variable", question: "q", target: {}, answer: "1", explanation: "e" }],
    });
    const issues = validateTrace(trace);
    expect(issues.some((i) => i.message.includes("unknown step"))).toBe(true);
  });
});

describe("example traces", () => {
  it("every curated example passes validation", () => {
    for (const ex of EXAMPLES) {
      const issues = validateTrace(ex.trace);
      expect(issues, `${ex.id}: ${issues.map((i) => i.message).join("; ")}`).toEqual([]);
    }
  });

  it("every practice prompt targets a real step", () => {
    for (const ex of EXAMPLES) {
      const ids = new Set(ex.trace.steps.map((s) => s.id));
      for (const p of ex.trace.practice) {
        expect(ids.has(p.stepId), `${ex.id} prompt ${p.id}`).toBe(true);
      }
    }
  });

  it("steps stay inside the source line range", () => {
    for (const ex of EXAMPLES) {
      const lineCount = ex.trace.source.code.split("\n").length;
      for (const s of ex.trace.steps) {
        expect(s.line, `${ex.id} ${s.id} line ${s.line} vs ${lineCount}`).toBeGreaterThanOrEqual(1);
        expect(s.line, `${ex.id} ${s.id} line ${s.line} vs ${lineCount}`).toBeLessThanOrEqual(lineCount);
      }
    }
  });

  it("recursion examples always carry a recursion_tree visual", () => {
    for (const ex of EXAMPLES.filter((e) => e.topic === "recursion")) {
      for (const s of ex.trace.steps) {
        expect(s.visual?.type, `${ex.id} ${s.id}`).toBe("recursion_tree");
      }
    }
  });
});
