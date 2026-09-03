import { describe, expect, it } from "vitest";
import { EXAMPLES } from "./examples";
import {
  ALGORITHM_SECTIONS,
  TOTAL_ALGORITHM_BUTTONS,
  TOTAL_READY_ALGORITHM_BUTTONS,
  findAlgorithmForExample,
  readyAlgorithmExampleIds,
} from "./algorithmLibrary";

const REQUIRED_SECTIONS = [
  "Arrays & Basics",
  "Searching",
  "Sorting",
  "Recursion & Backtracking",
  "Strings",
  "Advanced String Algorithms",
  "Linked Lists",
  "Stacks & Queues",
  "Trees",
  "Advanced Trees",
  "Graphs",
  "Advanced Graph Algorithms",
  "Dynamic Programming",
  "Advanced DP Patterns",
  "DP Optimizations",
  "Greedy",
  "Heaps / Priority Queue",
  "Bit Manipulation",
  "Math / Number Theory",
  "Matrix Specific",
  "Advanced Data Structures",
  "Computational Geometry",
  "Game Theory",
  "Randomized Algorithms",
  "Hashing Variants",
  "Streaming / Probabilistic",
  "Parallel & Distributed",
  "Approximation Algorithms",
  "Misc Classics",
];

const REQUESTED_SPOT_CHECKS = [
  "Johnson's Algorithm (All-Pairs Shortest Path)",
  "Dinic's Algorithm (Max Flow)",
  "Aho-Corasick Algorithm (multi-pattern search)",
  "Digit DP",
  "Matrix Exponentiation (Fast Fibonacci)",
  "Convex Hull (Graham Scan, Jarvis March)",
  "Alpha-Beta Pruning",
  "Reservoir Sampling",
  "LFU Cache",
  "Spiral Matrix Traversal",
  "External Sorting (larger than memory)",
  "Manber-Myers Algorithm (suffix array construction)",
  "Boruvka's Algorithm (MST)",
  "Miller-Rabin Primality Test",
  "Count-Min Sketch",
  "Wavelet Tree",
  "Consensus Algorithms (Paxos, Raft)",
  "Vertex Cover Approximation",
];

function allAlgorithmTitles(): string[] {
  return ALGORITHM_SECTIONS.flatMap((section) => section.items.map((item) => item.title));
}

describe("algorithm library", () => {
  it("keeps the requested DSA sections in order", () => {
    expect(ALGORITHM_SECTIONS.map((section) => section.title)).toEqual(REQUIRED_SECTIONS);
  });

  it("contains the expanded advanced algorithm backlog", () => {
    const titles = allAlgorithmTitles();

    for (const title of REQUESTED_SPOT_CHECKS) {
      expect(titles).toContain(title);
    }
    expect(TOTAL_ALGORITHM_BUTTONS).toBeGreaterThan(240);
  });

  it("finds the active algorithm label for minimized lab summaries", () => {
    expect(findAlgorithmForExample("binary-search")).toMatchObject({
      sectionTitle: "Searching",
      displayTitle: "Binary Search",
      variantLabel: "Play",
    });
    expect(findAlgorithmForExample("min-array")).toMatchObject({
      sectionTitle: "Arrays & Basics",
      displayTitle: "Min in Array",
      variantLabel: "Play",
    });
    expect(findAlgorithmForExample("reverse-array")).toMatchObject({
      sectionTitle: "Arrays & Basics",
      displayTitle: "Reverse an Array",
      variantLabel: "Play",
    });
    expect(findAlgorithmForExample("kadane")).toMatchObject({
      sectionTitle: "Arrays & Basics",
      displayTitle: "Kadane's Algorithm (Max Subarray Sum)",
      variantLabel: "Play",
    });
    expect(findAlgorithmForExample("two-sum-hash")).toMatchObject({
      sectionTitle: "Arrays & Basics",
      displayTitle: "Two Sum (Unsorted / Hashing)",
      variantLabel: "Play",
    });
    expect(findAlgorithmForExample("three-sum")).toMatchObject({
      sectionTitle: "Arrays & Basics",
      displayTitle: "Three Sum",
      variantLabel: "Play",
    });
    expect(findAlgorithmForExample("four-sum")).toMatchObject({
      sectionTitle: "Arrays & Basics",
      displayTitle: "Four Sum",
      variantLabel: "Play",
    });
    expect(findAlgorithmForExample("dutch-national-flag")).toMatchObject({
      sectionTitle: "Arrays & Basics",
      displayTitle: "Dutch National Flag (Sort 0s, 1s, 2s)",
      variantLabel: "Play",
    });
    expect(findAlgorithmForExample("factorial-recursion")).toMatchObject({
      sectionTitle: "Recursion & Backtracking",
      displayTitle: "Factorial - Recursion",
      variantLabel: "Recursion",
    });
  });

  it("only marks real playback examples as live", () => {
    const exampleIds = new Set(EXAMPLES.map((example) => example.id));
    const liveIds = readyAlgorithmExampleIds();
    const missing = liveIds.filter((id) => !exampleIds.has(id));

    expect(missing).toEqual([]);
    expect(TOTAL_READY_ALGORITHM_BUTTONS).toBe(liveIds.length);
  });

  it("represents every existing animation in the categorized library", () => {
    const liveIds = new Set(readyAlgorithmExampleIds());
    const unlistedExamples = EXAMPLES.map((example) => example.id).filter((id) => !liveIds.has(id));

    expect(unlistedExamples).toEqual([]);
  });
});
