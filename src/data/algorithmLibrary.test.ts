import { describe, expect, it } from "vitest";
import { EXAMPLES } from "./examples";
import {
  ALGORITHM_SECTIONS,
  TOTAL_ALGORITHM_BUTTONS,
  TOTAL_READY_ALGORITHM_BUTTONS,
  readyAlgorithmExampleIds,
} from "./algorithmLibrary";

const REQUIRED_SECTIONS = [
  "Arrays & Basics",
  "Searching",
  "Sorting",
  "Recursion & Backtracking",
  "Strings",
  "Linked Lists",
  "Stacks & Queues",
  "Trees",
  "Graphs",
  "Dynamic Programming",
  "Greedy",
  "Heaps / Priority Queue",
  "Bit Manipulation",
  "Math",
];

describe("algorithm library", () => {
  it("keeps the requested DSA sections in order", () => {
    expect(ALGORITHM_SECTIONS.map((section) => section.title)).toEqual(REQUIRED_SECTIONS);
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
    expect(TOTAL_ALGORITHM_BUTTONS).toBeGreaterThan(120);
  });
});
