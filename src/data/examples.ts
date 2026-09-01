import type { Example, TraceDocument } from "../types/trace";
import { buildBinarySearchTrace, BINARY_SEARCH_CODE } from "./traces/binary-search";
import { buildFactorialLoopTrace, FACTORIAL_LOOP_CODE } from "./traces/factorial-loop";
import { buildFactorialRecursionTrace, FACTORIAL_RECURSION_CODE } from "./traces/factorial-recursion";
import { buildFibonacciRecursionTrace, FIBONACCI_RECURSION_CODE } from "./traces/fibonacci-recursion";
import { buildSumArrayTrace, SUM_ARRAY_CODE } from "./traces/sum-array";
import { buildMaxArrayTrace, MAX_ARRAY_CODE } from "./traces/max-array";
import { buildMinArrayTrace, MIN_ARRAY_CODE } from "./traces/min-array";
import { buildReverseArrayTrace, REVERSE_ARRAY_CODE } from "./traces/reverse-array";
import { buildKadaneTrace, KADANE_CODE } from "./traces/kadane";
import { buildTwoSumHashTrace, TWO_SUM_HASH_CODE } from "./traces/two-sum-hash";
import { buildBubbleSortTrace, BUBBLE_SORT_CODE } from "./traces/bubble-sort";
import {
  buildBfsGridTrace,
  buildDfsGridTrace,
  BFS_GRID_CODE,
  DFS_GRID_CODE,
} from "./traces/grid-search";
import {
  codeFor,
  generateTrace,
  type PlayableConfig,
  type PlayableKind,
} from "../engine/tracegen";

/**
 * The sample program library (docs/02 — P0 Code Playback Lab).
 * Traces are prebuilt and hand-authored, so playback never executes code.
 */
export const EXAMPLES: Example[] = [
  {
    id: "sum-array",
    slug: "sum-array",
    title: "Sum of Array",
    topic: "arrays",
    difficulty: "beginner",
    blurb: "A for-loop walks a list and accumulates the total. Watch the running total build up.",
    trace: buildSumArrayTrace(),
  },
  {
    id: "factorial-loop",
    slug: "factorial-loop",
    title: "Factorial (Loop)",
    topic: "loops",
    difficulty: "beginner",
    blurb: "5! computed with a loop. See result grow: 1 → 2 → 6 → 24 → 120.",
    trace: buildFactorialLoopTrace(),
  },
  {
    id: "factorial-recursion",
    slug: "factorial-recursion",
    title: "Factorial Recursion",
    topic: "recursion",
    difficulty: "beginner",
    blurb: "The flagship demo. Watch the call stack build and the recursion tree grow as fact(4) resolves.",
    trace: buildFactorialRecursionTrace(),
  },
  {
    id: "fibonacci-recursion",
    slug: "fibonacci-recursion",
    title: "Fibonacci Recursion",
    topic: "recursion",
    difficulty: "intermediate",
    blurb: "fib(5) explodes into 15 calls. Watch overlapping subproblems appear in the recursion tree.",
    trace: buildFibonacciRecursionTrace(),
  },
  {
    id: "binary-search",
    slug: "binary-search",
    title: "Binary Search",
    topic: "searching",
    difficulty: "intermediate",
    blurb: "Find 7 in a sorted list by halving the search range. Probe mid each time.",
    trace: buildBinarySearchTrace(),
  },
  {
    id: "max-array",
    slug: "max-array",
    title: "Max in Array",
    topic: "arrays",
    difficulty: "beginner",
    blurb: "Scan a list keeping the running maximum. Watch max_val update only when a larger value appears.",
    trace: buildMaxArrayTrace(),
  },
  {
    id: "min-array",
    slug: "min-array",
    title: "Min in Array",
    topic: "arrays",
    difficulty: "beginner",
    blurb: "A scanner tests every value against one persistent candidate. Watch the minimum marker transfer only when a smaller value earns it.",
    trace: buildMinArrayTrace(),
  },
  {
    id: "reverse-array",
    slug: "reverse-array",
    title: "Reverse an Array",
    topic: "arrays",
    difficulty: "beginner",
    blurb: "Two pointers swap mirrored positions from the outside inward. Follow the same value tokens as they cross and lock into place.",
    trace: buildReverseArrayTrace(),
  },
  {
    id: "kadane",
    slug: "kadane",
    title: "Kadane's Algorithm",
    topic: "arrays",
    difficulty: "intermediate",
    blurb: "Choose between restarting and extending at every value while current and best subarray rails evolve independently.",
    trace: buildKadaneTrace(),
  },
  {
    id: "two-sum-hash",
    slug: "two-sum-hash",
    title: "Two Sum (Unsorted / Hashing)",
    topic: "arrays",
    difficulty: "beginner",
    blurb: "Calculate a complement, query earlier values, and watch each miss enter the hash map until a real pair connects.",
    trace: buildTwoSumHashTrace(),
  },
  {
    id: "bubble-sort",
    slug: "bubble-sort",
    title: "Bubble Sort",
    topic: "sorting",
    difficulty: "intermediate",
    blurb: "The largest value bubbles to the end on every pass. Count comparisons and swaps live.",
    trace: buildBubbleSortTrace(),
  },
  {
    id: "bfs-grid",
    slug: "bfs-grid",
    title: "BFS on a Grid",
    topic: "graphs",
    difficulty: "intermediate",
    blurb: "Watch a queue ripple outward level by level, painting visited cells as it searches for the goal.",
    trace: buildBfsGridTrace(),
  },
  {
    id: "dfs-grid",
    slug: "dfs-grid",
    title: "DFS on a Grid",
    topic: "graphs",
    difficulty: "intermediate",
    blurb: "A stack dives deep down one corridor, backtracking only when it hits a wall.",
    trace: buildDfsGridTrace(),
  },
  {
    id: "merge-sort",
    slug: "merge-sort",
    title: "Merge Sort",
    topic: "sorting",
    difficulty: "intermediate",
    blurb: "Split down to single elements, then merge runs back up in sorted order — compare and write every step.",
    trace: generateTrace("merge-sort", { array: [8, 3, 5, 1, 9, 2] }),
  },
  {
    id: "quick-sort",
    slug: "quick-sort",
    title: "Quick Sort",
    topic: "sorting",
    difficulty: "intermediate",
    blurb: "Pick a pivot, partition smaller-left / larger-right, recurse. Watch the pivot land in its final spot.",
    trace: generateTrace("quick-sort", { array: [9, 3, 7, 1, 8, 2] }),
  },
  {
    id: "heap-sort",
    slug: "heap-sort",
    title: "Heap Sort",
    topic: "sorting",
    difficulty: "intermediate",
    blurb: "Heapify the array into a max-heap, then swap the root to the end and re-heapify, one value at a time.",
    trace: generateTrace("heap-sort", { array: [4, 10, 3, 5, 1] }),
  },
  {
    id: "palindrome",
    slug: "palindrome",
    title: "Palindrome Check",
    topic: "two pointers",
    difficulty: "beginner",
    blurb: "Two pointers converge from the ends — every mismatched pair kills the palindrome.",
    trace: generateTrace("palindrome", { text: "racecar" }),
  },
  {
    id: "inorder",
    slug: "inorder",
    title: "Inorder Traversal",
    topic: "trees",
    difficulty: "intermediate",
    blurb: "Left → node → right over a heap-indexed tree, with a stack for the descent.",
    trace: generateTrace("inorder", { array: [8, 3, 10, 1, 6, 9, 14] }),
  },
  {
    id: "two-sum",
    slug: "two-sum",
    title: "Two Sum (Sorted)",
    topic: "two pointers",
    difficulty: "beginner",
    blurb: "Converging pointers on a sorted list find the pair that hits the target sum.",
    trace: generateTrace("two-sum", { array: [2, 7, 11, 15], target: 9 }),
  },
];

export const EXAMPLE_CODE_BY_ID: Record<string, string> = {
  "sum-array": SUM_ARRAY_CODE,
  "factorial-loop": FACTORIAL_LOOP_CODE,
  "factorial-recursion": FACTORIAL_RECURSION_CODE,
  "fibonacci-recursion": FIBONACCI_RECURSION_CODE,
  "binary-search": BINARY_SEARCH_CODE,
  "max-array": MAX_ARRAY_CODE,
  "min-array": MIN_ARRAY_CODE,
  "reverse-array": REVERSE_ARRAY_CODE,
  kadane: KADANE_CODE,
  "two-sum-hash": TWO_SUM_HASH_CODE,
  "bubble-sort": BUBBLE_SORT_CODE,
  "bfs-grid": BFS_GRID_CODE,
  "dfs-grid": DFS_GRID_CODE,
  "merge-sort": codeFor("merge-sort", { array: [8, 3, 5, 1, 9, 2] }),
  "quick-sort": codeFor("quick-sort", { array: [9, 3, 7, 1, 8, 2] }),
  "heap-sort": codeFor("heap-sort", { array: [4, 10, 3, 5, 1] }),
  palindrome: codeFor("palindrome", { text: "racecar" }),
  inorder: codeFor("inorder", { array: [8, 3, 10, 1, 6, 9, 14] }),
  "two-sum": codeFor("two-sum", { array: [2, 7, 11, 15], target: 9 }),
};

/** Maps each lab example to the generator that can re-forge it from new inputs. */
export const PLAYABLE_KIND_BY_EXAMPLE: Record<string, PlayableKind> = {
  "sum-array": "sum-array",
  "max-array": "max-array",
  "min-array": "min-array",
  "reverse-array": "reverse-array",
  kadane: "kadane",
  "two-sum-hash": "two-sum-hash",
  "factorial-loop": "factorial-loop",
  "factorial-recursion": "factorial-recursion",
  "fibonacci-recursion": "fibonacci-recursion",
  "binary-search": "binary-search",
  "bubble-sort": "bubble-sort",
  "merge-sort": "merge-sort",
  "quick-sort": "quick-sort",
  "heap-sort": "heap-sort",
  palindrome: "palindrome",
  inorder: "inorder",
  "two-sum": "two-sum",
  "bfs-grid": "bfs-grid",
  "dfs-grid": "dfs-grid",
};

/** Regenerates a lab example's trace from a validated config. */
export function forgeExample(id: string, config: PlayableConfig): Example | null {
  const kind = PLAYABLE_KIND_BY_EXAMPLE[id];
  const base = EXAMPLES.find((e) => e.id === id);
  if (!kind || !base) return null;
  const trace = generateTrace(kind, config, codeFor(kind, config));
  return {
    ...base,
    trace,
    blurb: `${base.blurb} (re-forged from your inputs)`,
  };
}

/**
 * Registry for traces generated at runtime (universal code visualizer).
 * Lives in memory only — a generated trace is never persisted.
 */
const generated = new Map<string, Example>();

let generatedSeq = 0;

/** Registers a generated example and returns its id (e.g. `gen-3`). */
export function registerGeneratedExample(trace: TraceDocument): Example {
  const id = `gen-${++generatedSeq}`;
  const ex: Example = {
    id,
    slug: id,
    title: trace.title.toLowerCase().includes("(generated)")
      ? trace.title
      : `${trace.title} (generated)`,
    topic: trace.metadata.topic,
    difficulty: trace.metadata.difficulty,
    blurb: `Generated live from pasted code at ${new Date().toLocaleTimeString()}. Trace confidence: ${trace.metadata.difficulty}.`,
    trace,
  };
  generated.set(id, ex);
  return ex;
}

export function getGeneratedExample(id: string): Example | undefined {
  return generated.get(id);
}

export function clearGeneratedExamples(): void {
  generated.clear();
}

export function getExample(id: string): Example | undefined {
  return EXAMPLES.find((e) => e.id === id) ?? getGeneratedExample(id);
}
