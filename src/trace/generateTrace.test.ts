import { describe, expect, it } from "vitest";
import { generateTraceFromCode } from "./generateTrace";

describe("generateTraceFromCode", () => {
  it("traces straight-line assignments and output", () => {
    const result = generateTraceFromCode(`x = 2\ny = x * 3\nprint(y)`);
    expect(result.trace?.steps).toHaveLength(3);
    expect(result.trace?.steps[1].variables.y).toBe(6);
    expect(result.trace?.steps[2].output).toBe("6");
    expect(result.trace?.steps.every((step) => step.actions[0].type === "focus_line")).toBe(true);
  });

  it("traces only the documented bounded list loop", () => {
    const result = generateTraceFromCode(`arr = [3, 1, 4, 2]
total = 0
for value in arr:
    total += value
print(total)`);
    const trace = result.trace;
    expect(trace?.title).toBe("Custom Loop Trace");
    expect(trace?.steps[trace.steps.length - 1].output).toBe("10");
    expect(trace?.steps.filter((step) => step.event === "loop_iteration")).toHaveLength(4);
  });

  it("rejects extra statements hidden inside a supported loop", () => {
    const result = generateTraceFromCode(`arr = [1, 2]
total = 0
for value in arr:
    total += value
    print(value)`);
    expect(result.trace).toBeUndefined();
    expect(result.diagnostics[0].message).toContain("exactly one indented statement");
  });

  it("builds truthful factorial call and return actions", () => {
    const result = generateTraceFromCode(`def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

result = factorial(4)
print("Factorial:", result)`);
    const trace = result.trace;
    const returnValues = trace?.steps.flatMap((step) =>
      step.actions.flatMap((action) => action.type === "return" ? [action.value] : []),
    );
    expect(returnValues).toEqual([1, 2, 6, 24]);
    expect(trace?.steps[trace.steps.length - 1].output).toBe("Factorial: 24");
  });

  it("does not mislabel arbitrary recursion as factorial", () => {
    const result = generateTraceFromCode(`def countdown(n):
    if n <= 0:
        return 0
    return countdown(n - 1)

result = countdown(4)
print(result)`);
    expect(result.trace).toBeUndefined();
    expect(result.diagnostics[0].message).toContain("exact factorial pattern");
  });

  it("caps code and arrays before creating snapshots", () => {
    const values = Array.from({ length: 65 }, (_, index) => index).join(", ");
    const listResult = generateTraceFromCode(`arr = [${values}]`);
    const codeResult = generateTraceFromCode(`x = 1\n${"# filler\n".repeat(301)}`);
    expect(listResult.trace).toBeUndefined();
    expect(listResult.diagnostics[0].message).toContain("64 numbers");
    expect(codeResult.trace).toBeUndefined();
    expect(codeResult.diagnostics[0].message).toContain("300 lines");
  });
});
