import { describe, expect, it } from "vitest";
import { DATA_STRUCTURES, DSA_PROBLEMS, DSA_TOPICS, makeProblemStarter } from "./dsaCatalog";

describe("DSA catalog", () => {
  it("has broad topic and problem coverage with stable unique ids", () => {
    expect(DATA_STRUCTURES.length).toBeGreaterThanOrEqual(20);
    expect(DSA_PROBLEMS.length).toBeGreaterThanOrEqual(150);
    expect(DSA_TOPICS.length).toBeGreaterThanOrEqual(15);
    expect(new Set(DSA_PROBLEMS.map((problem) => problem.id)).size).toBe(DSA_PROBLEMS.length);
  });

  it("provides valid metadata and a visualizer starter for every problem", () => {
    for (const problem of DSA_PROBLEMS) {
      expect(problem.title.length).toBeGreaterThan(2);
      expect(problem.summary.length).toBeGreaterThan(12);
      expect(problem.complexity.length).toBeGreaterThan(2);
      expect(makeProblemStarter(problem).length).toBeGreaterThan(30);
    }
  });

  it("links completed atlas rows to polished playback examples", () => {
    const expected = new Map([
      ["Classic Binary Search", "binary-search"],
      ["Bubble Sort", "bubble-sort"],
      ["Merge Sort", "merge-sort"],
      ["Quick Sort", "quick-sort"],
      ["Heap Sort", "heap-sort"],
      ["Valid Palindrome", "palindrome"],
      ["Two Sum II", "two-sum"],
      ["Factorial Recursion", "factorial-recursion"],
      ["Fibonacci Recursion", "fibonacci-recursion"],
    ]);

    for (const [title, exampleId] of expected) {
      const problem = DSA_PROBLEMS.find((item) => item.title === title);
      expect(problem?.exampleId).toBe(exampleId);
      expect(makeProblemStarter(problem!)).not.toContain("Paste or write");
    }
  });
});
