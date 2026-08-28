import { describe, expect, it } from "vitest";
import { buildBubbleSortTrace } from "../data/traces/bubble-sort";
import { generateTrace } from "./tracegen";
import type { TraceStep } from "../types/trace";
import {
  getBubbleSortSceneModel,
  getHeapSortSceneModel,
  getMergeSortSceneModel,
  getQuickSortSceneModel,
  getSortedIndices,
  isBubbleSortTraceStep,
  isHeapSortTraceStep,
  isMergeSortTraceStep,
  isQuickSortTraceStep,
} from "./sortStage";

describe("sort stage helpers", () => {
  it("detects bubble-sort array trace steps", () => {
    const trace = buildBubbleSortTrace();
    const compareStep = trace.steps.find((step) => step.actions?.some((action) => action.type === "compare"));

    expect(compareStep).toBeDefined();
    expect(isBubbleSortTraceStep(compareStep!)).toBe(true);
  });

  it("extracts compare, swap, counters, and sorted indices for the renderer", () => {
    const trace = buildBubbleSortTrace();
    const swapStep = trace.steps.find((step) => step.actions?.some((action) => action.type === "swap"));
    const completeStep = trace.steps[trace.steps.length - 1];

    expect(swapStep).toBeDefined();
    const model = getBubbleSortSceneModel(swapStep!);
    expect(model).toMatchObject({
      operation: "swap",
      swapPair: [0, 1],
      comparisons: 1,
      swaps: 1,
    });

    expect(getSortedIndices(completeStep)).toEqual([0, 1, 2, 3]);
  });

  it("detects merge-sort compare and write phases without collapsing them", () => {
    const trace = generateTrace("merge-sort", { array: [8, 3, 5, 1, 9, 2] });
    const compareStep = trace.steps.find((step) => step.actions?.some((action) => action.phase === "merge_compare"));
    const writeStep = trace.steps.find((step) => step.actions?.some((action) => action.phase === "merge_write"));

    expect(compareStep).toBeDefined();
    expect(writeStep).toBeDefined();
    expect(compareStep?.event).toBe("comparison");
    expect(writeStep?.event).toBe("array_write");
    expect(isMergeSortTraceStep(compareStep!)).toBe(true);
    expect(isBubbleSortTraceStep(compareStep!)).toBe(false);

    const compareModel = getMergeSortSceneModel(compareStep!);
    expect(compareModel).toMatchObject({
      operation: "compare",
      range: [0, 1],
      compareValues: [8, 3],
      destinationIndex: 0,
      takeSide: "right",
      committedUntil: null,
      leftCursor: 0,
      rightCursor: 0,
    });

    const writeModel = getMergeSortSceneModel(writeStep!);
    expect(writeModel).toMatchObject({
      operation: "write",
      writingIndex: 0,
      value: 3,
      writes: 1,
      committedUntil: 0,
      leftCursor: 0,
      rightCursor: 1,
    });
  });

  it("keeps merge output pending until slots are actually written", () => {
    const trace = generateTrace("merge-sort", { array: [8, 3, 5, 1, 9, 2] });
    const writeIntoMiddle = trace.steps.find((step) =>
      step.actions?.some(
        (action) =>
          action.phase === "merge_write" &&
          Array.isArray(action.range) &&
          action.range[0] === 0 &&
          action.range[1] === 2 &&
          action.index === 1,
      ),
    );

    expect(writeIntoMiddle).toBeDefined();
    expect(getMergeSortSceneModel(writeIntoMiddle!)).toMatchObject({
      operation: "write",
      range: [0, 2],
      value: 5,
      destinationIndex: 1,
      committedUntil: 1,
      leftCursor: 1,
      rightCursor: 1,
    });
  });

  it("detects merge-sort split and completion metadata", () => {
    const trace = generateTrace("merge-sort", { array: [8, 3, 5, 1, 9, 2] });
    const splitStep = trace.steps.find((step) => step.actions?.some((action) => action.phase === "merge_split"));
    const completeStep = trace.steps[trace.steps.length - 1];

    expect(splitStep).toBeDefined();
    expect(getMergeSortSceneModel(splitStep!)).toMatchObject({
      operation: "split",
      range: [0, 5],
      mid: 2,
      leftRange: [0, 2],
      rightRange: [3, 5],
    });
    expect(getMergeSortSceneModel(completeStep)).toMatchObject({
      operation: "complete",
      range: [0, 5],
    });
  });

  it("routes quick-sort compare, swap, and pivot phases to the quick renderer", () => {
    const trace = generateTrace("quick-sort", { array: [9, 3, 7, 1, 8, 2] });
    const compareStep = trace.steps.find((step) => step.actions?.some((action) => action.phase === "quick_compare"));
    const swapStep = trace.steps.find((step) => step.actions?.some((action) => action.phase === "quick_swap"));
    const pivotStep = trace.steps.find((step) => step.actions?.some((action) => action.phase === "quick_pivot"));

    expect(compareStep).toBeDefined();
    expect(swapStep).toBeDefined();
    expect(pivotStep).toBeDefined();
    expect(isQuickSortTraceStep(compareStep!)).toBe(true);
    expect(isBubbleSortTraceStep(compareStep!)).toBe(false);

    expect(getQuickSortSceneModel(compareStep!)).toMatchObject({
      operation: "compare",
      range: [0, 5],
      pivotIndex: 5,
      pivotValue: 2,
      boundaryIndex: 0,
      scanIndex: 0,
    });

    expect(getQuickSortSceneModel(swapStep!)).toMatchObject({
      operation: "swap",
      swapPair: [0, 3],
      boundaryIndex: 1,
    });

    expect(getQuickSortSceneModel(pivotStep!)).toMatchObject({
      operation: "pivot",
      pivotIndex: 1,
      pivotValue: 2,
      finalIndex: 1,
    });
  });

  it("routes heap-sort heapify, compare, extract, and completion phases to the heap renderer", () => {
    const trace = generateTrace("heap-sort", { array: [4, 10, 3, 5, 1] });
    const heapifyStep = trace.steps.find((step) => step.actions?.some((action) => action.phase === "heap_heapify"));
    const compareStep = trace.steps.find((step) => step.actions?.some((action) => action.phase === "heap_compare-left"));
    const extractStep = trace.steps.find((step) => step.actions?.some((action) => action.phase === "heap_extract"));
    const completeStep = trace.steps[trace.steps.length - 1];

    expect(heapifyStep).toBeDefined();
    expect(compareStep).toBeDefined();
    expect(extractStep).toBeDefined();
    expect(isHeapSortTraceStep(compareStep!)).toBe(true);
    expect(isBubbleSortTraceStep(compareStep!)).toBe(false);

    expect(getHeapSortSceneModel(heapifyStep!)).toMatchObject({
      operation: "heapify",
      heapSize: 5,
      parentIndex: 1,
    });

    expect(getHeapSortSceneModel(compareStep!)).toMatchObject({
      operation: "compare-left",
      heapSize: 5,
    });

    expect(getHeapSortSceneModel(extractStep!)).toMatchObject({
      operation: "extract",
      extractIndex: 4,
      heapSize: 4,
    });

    expect(getHeapSortSceneModel(completeStep)).toMatchObject({
      operation: "complete",
      heapSize: 0,
    });
  });

  it("does not claim unrelated array traces are bubble-sort scenes", () => {
    const step: TraceStep = {
      id: "step-000",
      index: 0,
      line: 1,
      event: "array_read",
      description: "Read a random array element.",
      variables: { i: 0 },
      stack: [],
      output: "",
      visual: { type: "array", itemId: "items" },
      memory: [{ id: "items", label: "items", type: "array", value: [4, 8], highlights: [{ index: 0, role: "reading" }] }],
    };

    expect(isBubbleSortTraceStep(step)).toBe(false);
  });
});
