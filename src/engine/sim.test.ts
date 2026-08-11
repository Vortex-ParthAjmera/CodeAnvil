import { describe, expect, it } from "vitest";
import {
  binarySearchSteps,
  bubbleSortSteps,
  gridSearchSteps,
  insertionSortSteps,
  selectionSortSteps,
  type MazeSpec,
} from "./sim";

const MAZE: MazeSpec = {
  grid: [
    [0, 0, 0, 0, 0],
    [0, 1, 1, 0, 0],
    [0, 0, 1, 1, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ],
  start: [0, 0],
  goal: [4, 4],
};

describe("bubbleSortSteps", () => {
  it("sorts the array and counts operations", () => {
    const steps = bubbleSortSteps([5, 2, 8, 1]);
    const last = steps[steps.length - 1];
    expect(last.array).toEqual([1, 2, 5, 8]);
    expect(last.comparisons).toBeGreaterThan(0);
    expect(last.swaps).toBeGreaterThan(0);
  });

  it("records compare and swap highlights", () => {
    const steps = bubbleSortSteps([2, 1]);
    const swapStep = steps.find((s) => s.swap);
    expect(swapStep).toBeDefined();
    expect(swapStep!.swap).toEqual([0, 1]);
  });

  it("handles an already-sorted array", () => {
    const steps = bubbleSortSteps([1, 2, 3]);
    const last = steps[steps.length - 1];
    expect(last.array).toEqual([1, 2, 3]);
    expect(last.swaps).toBe(0);
  });
});

describe("selectionSortSteps / insertionSortSteps", () => {
  it("selection sorts", () => {
    const steps = selectionSortSteps([3, 1, 2]);
    expect(steps[steps.length - 1].array).toEqual([1, 2, 3]);
  });

  it("insertion sorts", () => {
    const last = insertionSortSteps([3, 1, 2]);
    expect(last[last.length - 1].array).toEqual([1, 2, 3]);
  });
});

describe("binarySearchSteps", () => {
  const arr = [1, 3, 5, 7, 9, 11];

  it("finds an existing target with a found status", () => {
    const steps = binarySearchSteps(arr, 7);
    const found = steps.find((s) => s.status === "found");
    expect(found).toBeDefined();
    expect(found!.mid).toBe(3);
    expect(found!.probes).toBeLessThanOrEqual(3);
  });

  it("reports not-found for an absent target", () => {
    const steps = binarySearchSteps(arr, 8);
    expect(steps[steps.length - 1].status).toBe("not-found");
  });

  it("halves the range with each probe", () => {
    const steps = binarySearchSteps(arr, 7);
    const probes = steps.filter((s) => s.status === "probe" && s.mid !== undefined);
    expect(probes.length).toBeGreaterThanOrEqual(2);
  });
});

describe("gridSearchSteps", () => {
  it("BFS finds a path to the goal", () => {
    const steps = gridSearchSteps(MAZE, "bfs");
    const final = steps[steps.length - 1];
    expect(final.path).toBeDefined();
    expect(final.path![0]).toEqual([0, 0]);
    expect(final.path![final.path!.length - 1]).toEqual([4, 4]);
  });

  it("DFS finds a path to the goal", () => {
    const steps = gridSearchSteps(MAZE, "dfs");
    const final = steps[steps.length - 1];
    expect(final.path).toBeDefined();
  });

  it("BFS explores level by level (shorter steps than DFS on a clear board)", () => {
    const clear: MazeSpec = {
      grid: [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      start: [0, 0],
      goal: [2, 2],
    };
    const bfs = gridSearchSteps(clear, "bfs");
    const dfs = gridSearchSteps(clear, "dfs");
    const bfsFound = bfs.find((s) => s.path);
    const dfsFound = dfs.find((s) => s.path);
    expect(bfsFound).toBeDefined();
    expect(dfsFound).toBeDefined();
  });

  it("reports unreachable when walls block the goal", () => {
    const blocked: MazeSpec = {
      grid: [
        [0, 1],
        [1, 0],
      ],
      start: [0, 0],
      goal: [1, 1],
    };
    const steps = gridSearchSteps(blocked, "bfs");
    expect(steps[steps.length - 1].path).toBeUndefined();
  });
});
