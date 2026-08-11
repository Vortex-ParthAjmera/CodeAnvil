import type { TraceDocument } from "../../types/trace";
import { bubbleSortSteps } from "../../engine/sim";
import { buildSortTrace } from "./builders";

export const BUBBLE_SORT_CODE = `arr = [5, 2, 8, 1]\nn = len(arr)\nfor i in range(n - 1):\n    for j in range(n - 1 - i):\n        if arr[j] > arr[j + 1]:\n            arr[j], arr[j + 1] = arr[j + 1], arr[j]\nprint("Sorted:", arr)`;

export function buildBubbleSortTrace(): TraceDocument {
  return buildSortTrace(
    {
      title: "Bubble Sort",
      code: BUBBLE_SORT_CODE,
      topic: "sorting",
      difficulty: "intermediate",
      durationSeconds: 120,
      lines: { setup: 2, compare: 5, swap: 6, settled: 4, done: 7 },
    },
    bubbleSortSteps([5, 2, 8, 1]),
  );
}
