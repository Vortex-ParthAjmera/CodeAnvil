import { describe, expect, it } from "vitest";
import { createSortFrames, createTraversalFrames, type SortAlgorithm } from "./algorithms";

const algorithms: SortAlgorithm[] = ["Bubble Sort", "Selection Sort", "Insertion Sort"];

describe("DSA traces", () => {
  it.each(algorithms)("%s produces a complete sorted trace", (algorithm) => {
    const input = [5, 1, 4, 2];
    const frames = createSortFrames(input, algorithm);
    const final = frames[frames.length - 1];
    expect(final.values).toEqual([1, 2, 4, 5]);
    expect(final.settled).toHaveLength(input.length);
    expect(frames.every((frame, index) => frame.id === `sort-${index}`)).toBe(true);
    expect(input).toEqual([5, 1, 4, 2]);
  });

  it("keeps Bubble Sort counters monotonic", () => {
    const frames = createSortFrames([5, 1, 4, 2], "Bubble Sort");
    frames.slice(1).forEach((frame, index) => {
      expect(frame.comparisons).toBeGreaterThanOrEqual(frames[index].comparisons);
      expect(frame.changes).toBeGreaterThanOrEqual(frames[index].changes);
    });
  });

  it("builds deterministic BFS state", () => {
    const frames = createTraversalFrames("A", "BFS");
    const final = frames[frames.length - 1];
    expect(final.visited).toEqual(["A", "B", "C", "D", "E", "F"]);
    expect(final.frontier).toEqual([]);
  });

  it("builds DFS state without stale BFS ordering", () => {
    const bfs = createTraversalFrames("A", "BFS");
    const dfs = createTraversalFrames("A", "DFS");
    const bfsOrder = bfs[bfs.length - 1].visited;
    const dfsOrder = dfs[dfs.length - 1].visited;
    expect(dfsOrder).toEqual(["A", "B", "D", "E", "C", "F"]);
    expect(dfsOrder).not.toEqual(bfsOrder);
  });
});
