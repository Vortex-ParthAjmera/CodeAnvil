import { describe, expect, it } from "vitest";
import { buildFactorialLoopTrace } from "../data/traces/factorial-loop";
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

  it("separates compare frames from write frames", () => {
    const trace = generateTrace("merge-sort", { array: [8, 3] });
    const compare = trace.steps.find((step) => step.actions?.some((action) => action.phase === "merge_compare"));
    const write = trace.steps.find((step) => step.actions?.some((action) => action.phase === "merge_write"));

    expect(compare).toBeDefined();
    expect(write).toBeDefined();
    expect(compare?.event).toBe("comparison");
    expect(write?.event).toBe("array_write");
    expect(compare?.memory?.[0].value).toEqual([8, 3]);
    expect(write?.memory?.[0].value).toEqual([3, 3]);
  });
});

describe("quick sort recorder", () => {
  it("ends fully sorted with pivots placed", () => {
    const steps = quickSortSteps([9, 3, 7, 1, 8, 2]);
    const last = steps[steps.length - 1];
    expect(sorted(last.array)).toBe(true);
    expect(steps.some((s) => s.key !== undefined)).toBe(true);
    expect(steps.some((s) => s.phase === "partition" && s.pivotValue !== null)).toBe(true);
    expect(steps.some((s) => s.phase === "compare" && s.scanIndex !== null && s.boundary !== null)).toBe(true);
    expect(steps.some((s) => s.phase === "pivot" && s.finalIndex !== null)).toBe(true);
  });
});

describe("heap sort recorder", () => {
  it("ends fully sorted and records heap operations", () => {
    const steps = heapSortSteps([4, 10, 3, 5, 1]);
    expect(sorted(steps[steps.length - 1].array)).toBe(true);
    expect(steps.some((s) => s.phase === "heapify" && s.parentIndex !== null)).toBe(true);
    expect(steps.some((s) => s.phase === "compare-left" && s.leftIndex !== null)).toBe(true);
    expect(steps.some((s) => s.phase === "extract" && s.extractIndex !== null && s.heapSize < s.array.length)).toBe(true);
    expect(steps[steps.length - 1].heapSize).toBe(0);
  });
});

describe("factorial loop trace", () => {
  it("renders a factor-chain memory visual for generated loop traces", () => {
    const trace = generateTrace("factorial-loop", { n: 5 });
    const multiply = trace.steps.find((step) => step.description.includes("Lock factor 4"));
    expect(multiply?.visual).toEqual({ type: "array", itemId: "factors" });
    expect(multiply?.memory?.[0].id).toBe("factors");
    expect(multiply?.memory?.[0].highlights.filter((h) => "index" in h && h.role === "sorted")).toHaveLength(4);
    expect(multiply?.actions?.[0]).toMatchObject({ type: "assignment", target: "result", factor: 4 });
  });

  it("renders a factor-chain memory visual for the curated example", () => {
    const trace = buildFactorialLoopTrace();
    expect(trace.steps.every((step) => step.visual?.type === "array")).toBe(true);
    expect(trace.steps.some((step) => step.memory?.some((item) => item.id === "factors"))).toBe(true);
  });
});

describe("palindrome recorder", () => {
  it("accepts a palindrome", () => {
    const steps = palindromeSteps("racecar");
    expect(steps[steps.length - 1].status).toBe("done");
    expect(steps[1].description).toContain("mirrored pair");
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
    expect(found.description).toContain("this pair is the answer");
  });
  it("honestly reports absence", () => {
    const steps = twoSumSortedSteps([1, 2, 3], 99);
    expect(steps[steps.length - 1].status).toBe("not-found");
  });

  it("emits pointer-move actions for sorted two-sum pointer shifts", () => {
    const trace = generateTrace("two-sum", { array: [1, 2, 9, 10], target: 12 });
    expect(trace.steps.some((step) => step.actions?.some((action) => action.type === "pointer_move"))).toBe(true);
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
    ["min-array", { array: [3, 1, 2] }],
    ["reverse-array", { array: [3, 1, 2] }],
    ["kadane", { array: [-2, 1, -3, 4] }],
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

  it.each([
    ["bfs-grid", "bfs"],
    ["dfs-grid", "dfs"],
  ] as const)("%s honors rows/cols/seed forge inputs", (kind, _) => {
    const trace = generateTrace(kind, { rows: 8, cols: 6, seed: 3 });
    const grid = trace.steps[0].memory?.find((m) => Array.isArray(m.value))!
      .value as number[][];
    expect(grid.length).toBe(8);
    expect(grid[0].length).toBe(6);
    // The trace must actually solve the maze, not just paint it.
    const pathStep = trace.steps.find((s) =>
      s.memory?.some((m) =>
        m.highlights?.some((h) => "role" in h && h.role === "path"),
      ),
    );
    expect(pathStep).toBeDefined();
  });

  it("grid traces default to the 5x5 maze without rows/cols", () => {
    const trace = generateTrace("bfs-grid", {});
    const grid = trace.steps[0].memory?.find((m) => Array.isArray(m.value))!
      .value as number[][];
    expect(grid.length).toBe(5);
    expect(grid[0].length).toBe(5);
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
