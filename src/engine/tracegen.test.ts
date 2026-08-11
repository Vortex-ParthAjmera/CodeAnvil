import { describe, expect, it } from "vitest";
import {
  generateTrace,
  heapSortSteps,
  inorderSteps,
  mergeSortSteps,
  palindromeSteps,
  quickSortSteps,
  twoSumSortedSteps,
} from "./tracegen";
import { storyScriptTrace, DEFAULT_STORY_SCRIPT } from "./storyscript";

const sorted = (a: number[]) => [...a].every((v, i) => i === 0 || a[i - 1] <= v);

describe("merge sort recorder", () => {
  it("ends fully sorted and records write operations", () => {
    const steps = mergeSortSteps([8, 3, 5, 1, 9, 2]);
    const last = steps[steps.length - 1];
    expect(sorted(last.array)).toBe(true);
    expect(steps.some((s) => s.writing >= 0)).toBe(true);
  });
});

describe("quick sort recorder", () => {
  it("ends fully sorted with pivots placed", () => {
    const steps = quickSortSteps([9, 3, 7, 1, 8, 2]);
    const last = steps[steps.length - 1];
    expect(sorted(last.array)).toBe(true);
    expect(steps.some((s) => s.key !== undefined)).toBe(true);
  });
});

describe("heap sort recorder", () => {
  it("ends fully sorted", () => {
    const steps = heapSortSteps([4, 10, 3, 5, 1]);
    expect(sorted(steps[steps.length - 1].array)).toBe(true);
  });
});

describe("palindrome recorder", () => {
  it("accepts a palindrome", () => {
    const steps = palindromeSteps("racecar");
    expect(steps[steps.length - 1].status).toBe("done");
  });
  it("rejects a non-palindrome at the first mismatch", () => {
    const steps = palindromeSteps("hello");
    expect(steps[steps.length - 1].status).toBe("invalid");
  });
});

describe("two-sum recorder", () => {
  it("finds a real pair", () => {
    const steps = twoSumSortedSteps([2, 7, 11, 15], 9);
    expect(steps[steps.length - 1].status).toBe("found");
    const found = steps.find((s) => s.status === "found")!;
    expect(found.array[found.l] + found.array[found.r]).toBe(9);
  });
  it("honestly reports absence", () => {
    const steps = twoSumSortedSteps([1, 2, 3], 99);
    expect(steps[steps.length - 1].status).toBe("not-found");
  });
});

describe("inorder recorder", () => {
  it("produces sorted output for a BST-shaped heap array", () => {
    //       8
    //     3   10
    //   1  6 9  14
    const steps = inorderSteps([8, 3, 10, 1, 6, 9, 14]);
    const result = steps[steps.length - 1].result;
    expect(result).toEqual([1, 3, 6, 8, 9, 10, 14]);
  });
});

describe("generateTrace", () => {
  const cases = [
    ["sum-array", { array: [1, 2, 3] }],
    ["merge-sort", { array: [5, 3, 8] }],
    ["quick-sort", { array: [5, 3, 8] }],
    ["heap-sort", { array: [5, 3, 8] }],
    ["palindrome", { text: "racecar" }],
    ["two-sum", { array: [2, 7, 11], target: 9 }],
    ["binary-search", { array: [1, 3, 5, 7], target: 5 }],
    ["factorial-recursion", { n: 4 }],
    ["inorder", { array: [8, 3, 10] }],
  ] as [string, { array?: number[]; n?: number; target?: number; text?: string }][];

  it.each(cases)("%s produces a valid trace document", (kind, config) => {
    const trace = generateTrace(kind as never, config);
    expect(trace.steps.length).toBeGreaterThanOrEqual(3);
    expect(trace.steps[0].event).toBe("program_start");
    // A found binary search ends on the matching comparison rather than a
    // separate program_end — both are legitimate terminal events.
    expect(["program_end", "comparison"]).toContain(trace.steps[trace.steps.length - 1].event);
    expect(trace.steps.every((s) => s.line >= 1)).toBe(true);
    expect(trace.steps.every((s) => s.description.length > 0)).toBe(true);
  });
});

describe("story script", () => {
  it("compiles the default script into a trace", () => {
    const { trace, error } = storyScriptTrace(DEFAULT_STORY_SCRIPT);
    expect(error).toBeUndefined();
    expect(trace).toBeDefined();
    expect(trace!.steps.length).toBeGreaterThanOrEqual(5);
    expect(trace!.steps[0].event).toBe("program_start");
    expect(trace!.steps[trace!.steps.length - 1].event).toBe("program_end");
  });

  it("rejects unknown commands with a line number", () => {
    const { error } = storyScriptTrace("array arr 1 2\nfrobnicate 1");
    expect(error).toBeDefined();
    expect(error!.line).toBe(2);
  });

  it("replays swap history honestly", () => {
    const { trace } = storyScriptTrace(
      "array arr 3 1 2\nswap arr 0 1\nswap arr 1 2",
    );
    const last = trace!.steps[trace!.steps.length - 1];
    expect(last.variables.arr).toBe("[1, 2, 3]");
  });
});
