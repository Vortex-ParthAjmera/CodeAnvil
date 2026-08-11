/**
 * Verification gate — the "second agent" that checks the whole pipeline
 * before anything ships. Consumed by verify.test.ts; run with `npm test`.
 *
 * It proves, mechanically, that:
 *  1. every shipped example trace passes schema validation,
 *  2. the algorithm simulators record correct, replayable, sorted results,
 *  3. binary search always finds real targets and honestly reports absent
 *     ones, BFS/DFS paths are contiguous and in-bounds, and
 *  4. the code-visualizer's detection round-trips into valid traces for
 *     both known patterns and the generic storyboard fallback.
 */
import { EXAMPLES } from "../data/examples";
import { validateTrace, traceIsValid } from "./validateTrace";
import {
  binarySearchSteps,
  bubbleSortSteps,
  emptyGrid,
  gridSearchSteps,
  insertionSortSteps,
  randomGrid,
  selectionSortSteps,
  spiralGrid,
  type GridCell,
  type SortKind,
} from "./sim";
import { detectAndGenerate } from "./detect";

export interface VerificationResult {
  ok: boolean;
  errors: string[];
  checked: number;
}

function result(checked: number, errors: string[]): VerificationResult {
  return { ok: errors.length === 0, errors, checked };
}

/* ------------------------------------------------------------------ */
/* 1. Every example trace is valid against the schema                  */
/* ------------------------------------------------------------------ */
export function verifyCatalog(): VerificationResult {
  const errors: string[] = [];
  let checked = 0;
  for (const ex of EXAMPLES) {
    checked++;
    const issues = validateTrace(ex.trace);
    if (issues.length > 0) {
      errors.push(`${ex.id}: ${issues.map((i) => JSON.stringify(i)).join("; ")}`);
    }
    if (ex.trace.steps.length === 0) errors.push(`${ex.id}: empty trace`);
    if (!ex.trace.source.code.trim()) errors.push(`${ex.id}: empty source`);
  }
  return result(checked, errors);
}

/* ------------------------------------------------------------------ */
/* 2. Sorting simulators record correct, replayable runs               */
/* ------------------------------------------------------------------ */
function checkSort(fn: (a: number[]) => ReturnType<typeof bubbleSortSteps>, input: number[]): string | null {
  const steps = fn(input);
  if (steps.length === 0) return "no steps";
  const work = [...input];
  let prevCompares = -1;
  let prevSwaps = -1;
  for (let s = 0; s < steps.length; s++) {
    const step = steps[s];
    if (step.array.length !== input.length) return `step ${s}: array length changed`;
    if (step.comparisons < prevCompares) return `step ${s}: comparisons decreased`;
    if (step.swaps < prevSwaps) return `step ${s}: swaps decreased`;
    prevCompares = step.comparisons;
    prevSwaps = step.swaps;
    if (step.swap) {
      const [i, j] = step.swap;
      if (i < 0 || j < 0 || i >= input.length || j >= input.length) return `step ${s}: swap out of bounds`;
      [work[i], work[j]] = [work[j], work[i]];
    }
    for (let k = 0; k < work.length; k++) {
      if (work[k] !== step.array[k]) return `step ${s}: replay diverged at index ${k}`;
    }
  }
  const sorted = [...input].sort((a, b) => a - b);
  for (let k = 0; k < work.length; k++) {
    if (work[k] !== sorted[k]) return `final array not sorted at index ${k}`;
  }
  return null;
}

export function verifySimulators(): VerificationResult {
  const errors: string[] = [];
  let checked = 0;

  const algs: Record<SortKind, (a: number[]) => ReturnType<typeof bubbleSortSteps>> = {
    bubble: bubbleSortSteps,
    selection: selectionSortSteps,
    insertion: insertionSortSteps,
  };
  for (const [name, fn] of Object.entries(algs)) {
    for (const input of [
      [],
      [7],
      [5, 2, 8, 1, 9, 3],
      [9, 8, 7, 6, 5, 4, 3, 2, 1],
      [1, 2, 3, 4, 5],
      Array.from({ length: 40 }, () => Math.floor(Math.random() * 100)),
    ]) {
      checked++;
      const err = checkSort(fn, input);
      if (err) errors.push(`${name} on [${input.slice(0, 6)}${input.length > 6 ? "…" : ""}]: ${err}`);
    }
  }

  // Binary search: targets present → found at a real index; absent → not-found.
  for (let t = 0; t < 12; t++) {
    checked++;
    const arr = Array.from({ length: 30 }, () => 1 + Math.floor(Math.random() * 50));
    const sorted = [...new Set(arr)].sort((a, b) => a - b);
    const target = sorted[Math.floor(Math.random() * sorted.length)];
    const steps = binarySearchSteps(sorted, target);
    const last = steps[steps.length - 1];
    if (last.status !== "found") errors.push(`bs: expected found for ${target}`);
    else if (last.mid === undefined || sorted[last.mid] !== target) errors.push(`bs: wrong index for ${target}`);
    if (steps.some((s) => s.mid !== undefined && (s.mid < s.low || s.mid > s.high))) errors.push("bs: mid out of range");
    // absent target
    const absent = 10_000 + t;
    const stepsA = binarySearchSteps(sorted, absent);
    if (stepsA[stepsA.length - 1].status !== "not-found") errors.push("bs: absent target reported found");
  }

  // Grid search: in-bounds exploration and a contiguous start→goal path.
  const mazes: { name: string; grid: GridCell[][] }[] = [
    { name: "empty", grid: emptyGrid(5, 5) },
    { name: "spiral", grid: spiralGrid(6, 6) },
    { name: "random", grid: randomGrid(6, 6, 0.25, 7) },
  ];
  for (const maze of mazes) {
    for (const kind of ["bfs", "dfs"] as const) {
      checked++;
      const steps = gridSearchSteps(
        { grid: maze.grid, start: [0, 0], goal: [maze.grid.length - 1, maze.grid[0].length - 1] },
        kind,
      );
      const R = maze.grid.length;
      const C = maze.grid[0].length;
      for (let s = 0; s < steps.length; s++) {
        const step = steps[s];
        const cells = [...step.visited, ...step.frontier, ...(step.current ? [step.current] : [])];
        for (const [r, c] of cells) {
          if (r < 0 || r >= R || c < 0 || c >= C) {
            errors.push(`grid ${maze.name}/${kind}: step ${s} cell out of bounds`);
            break;
          }
          if (maze.grid[r][c] === 1) errors.push(`grid ${maze.name}/${kind}: step ${s} explored a wall`);
        }
        if (step.visitedCount !== step.visited.length) errors.push(`grid ${maze.name}/${kind}: step ${s} visitedCount mismatch`);
        if (step.path) {
          const path = step.path;
          if (path.length < 2) errors.push(`grid ${maze.name}/${kind}: degenerate path`);
          if (path[0][0] !== 0 || path[0][1] !== 0) errors.push(`grid ${maze.name}/${kind}: path does not start at start`);
          if (path[path.length - 1][0] !== R - 1 || path[path.length - 1][1] !== C - 1) errors.push(`grid ${maze.name}/${kind}: path does not reach goal`);
          for (let i = 1; i < path.length; i++) {
            const [pr, pc] = path[i - 1];
            const [cr, cc] = path[i];
            const adj = Math.abs(pr - cr) + Math.abs(pc - cc) === 1;
            if (!adj) errors.push(`grid ${maze.name}/${kind}: path jump at ${i}`);
          }
        }
      }
      const last = steps[steps.length - 1];
      if (!last.path) errors.push(`grid ${maze.name}/${kind}: no path found (unreachable goal?)`);
    }
  }

  return result(checked, errors);
}

/* ------------------------------------------------------------------ */
/* 3. Detection round-trips into valid traces (known + storyboard)     */
/* ------------------------------------------------------------------ */
export function verifyDetection(): VerificationResult {
  const errors: string[] = [];
  let checked = 0;

  const cases: { name: string; code: string; expectTrace: boolean }[] = [
    {
      name: "sum-array (py)",
      code: "total = 0\narr = [4, 7, 1, 9]\nfor i in range(len(arr)):\n    total = total + arr[i]\nprint(total)",
      expectTrace: true,
    },
    {
      name: "max-array (py)",
      code: "arr = [3, 8, 2]\nm = arr[0]\nfor i in range(1, len(arr)):\n    if arr[i] > m:\n        m = arr[i]\nprint(m)",
      expectTrace: true,
    },
    {
      name: "factorial (py)",
      code: "def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)\n\nprint(fact(4))",
      expectTrace: true,
    },
    {
      name: "fibonacci (py)",
      code: "def fib(n):\n    if n <= 1:\n        return n\n    return fib(n - 1) + fib(n - 2)\n\nprint(fib(5))",
      expectTrace: true,
    },
    {
      name: "binary-search (py)",
      code: "arr = [1, 3, 5, 7, 9]\ntarget = 7\nlo, hi = 0, len(arr) - 1\nwhile lo <= hi:\n    mid = (lo + hi) // 2\n    if arr[mid] == target:\n        print(mid)\n        break\n    elif arr[mid] < target:\n        lo = mid + 1\n    else:\n        hi = mid - 1",
      expectTrace: true,
    },
    {
      name: "two-sum hash map (py)",
      code: "def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        c = target - n\n        if c in seen:\n            return [seen[c], i]\n        seen[n] = i\n    return []\n\nnums = [2, 7, 11, 15]\ntarget = 9\nprint(two_sum(nums, target))",
      expectTrace: true,
    },
    {
      name: "bubble-sort (js)",
      code: "const arr = [5, 2, 8, 1];\nfor (let i = 0; i < arr.length - 1; i++) {\n  for (let j = 0; j < arr.length - 1 - i; j++) {\n    if (arr[j] > arr[j + 1]) {\n      [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];\n    }\n  }\n}\nconsole.log(arr);",
      expectTrace: true,
    },
    {
      name: "unknown c++ (storyboard)",
      code: "#include <iostream>\nint main() {\n  int x = 5;\n  for (int i = 0; i < x; i++) {\n    std::cout << i;\n  }\n  return 0;\n}",
      expectTrace: false,
    },
    {
      name: "empty",
      code: "",
      expectTrace: false,
    },
  ];

  for (const c of cases) {
    checked++;
    const r = detectAndGenerate(c.code);
    if (c.expectTrace) {
      if (!r.trace || !traceIsValid(r.trace)) errors.push(`${c.name}: generated trace failed validation`);
      else if (r.trace.steps.length === 0) errors.push(`${c.name}: empty trace`);
      if (r.kind === "storyboard") errors.push(`${c.name}: expected a pattern trace, got storyboard`);
    } else {
      // Storyboards may legitimately have no trace yet (the "paste something" state).
      if (r.kind !== "storyboard") errors.push(`${c.name}: expected storyboard, got ${r.kind}`);
      else if (r.trace && !traceIsValid(r.trace)) errors.push(`${c.name}: storyboard trace failed validation`);
    }
  }

  return result(checked, errors);
}

/* ------------------------------------------------------------------ */
/* 4. Practice prompts must reveal answers AFTER being asked           */
/* ------------------------------------------------------------------ */

/**
 * A practice prompt is shown one step BEFORE its reveal step
 * (revealIndex === state.stepIndex + 1). If the reveal step is the wrong
 * one, the question is spoiled — the answer is already on screen.
 *
 * Mechanical invariants that catch the off-by-one class of bug:
 *  - the reveal step must exist (and not be the first step),
 *  - the reveal step must not be the LAST step (program_end never reveals),
 *  - the reveal step must not be program_start / loop_iteration — those
 *    steps pose the question; they don't reveal the answer.
 */
export function verifyPracticePrompts(): VerificationResult {
  const errors: string[] = [];
  let checked = 0;
  const NON_REVEAL_EVENTS = new Set(["program_start", "program_end", "loop_iteration"]);
  for (const ex of EXAMPLES) {
    const trace = ex.trace;
    for (const p of trace.practice ?? []) {
      checked++;
      const revealIndex = trace.steps.findIndex((s) => s.id === p.stepId);
      if (revealIndex === -1) {
        errors.push(`${ex.id}: prompt "${p.question.slice(0, 40)}…" targets missing step ${p.stepId}`);
        continue;
      }
      const reveal = trace.steps[revealIndex];
      if (revealIndex === 0) errors.push(`${ex.id}: prompt reveals at the first step (${p.stepId})`);
      if (NON_REVEAL_EVENTS.has(reveal.event)) {
        errors.push(`${ex.id}: prompt "${p.question.slice(0, 40)}…" reveals at a ${reveal.event} step (${p.stepId}) — that step poses the question, it doesn't reveal the answer`);
      }
      // The prompt must fire while a DIFFERENT step is displayed than the
      // reveal itself (fires at revealIndex - 1, so this holds structurally,
      // but assert it to keep future changes honest).
      if (revealIndex - 1 < 0) errors.push(`${ex.id}: prompt fires before any step`);
    }
  }
  return result(checked, errors);
}

export function verifyAll(): VerificationResult {
  const parts = [verifyCatalog(), verifySimulators(), verifyDetection(), verifyPracticePrompts()];
  const checked = parts.reduce((n, p) => n + p.checked, 0);
  const errors = parts.flatMap((p) => p.errors);
  return result(checked, errors);
}
