/**
 * Trace generator library — every playable algorithm as a parameterized
 * generator. Inputs (array, n, target, text) are validated and converted into
 * a schema-conformant trace by OUR OWN simulators; nothing user-supplied is
 * ever executed. Powers the lab's editable inputs, the new playable examples,
 * and the universal visualizer's pattern detection.
 */

import type { TraceDocument } from "../types/trace";
import { detectLanguage } from "./detect";
import {
  binarySearchSteps,
  bubbleSortSteps,
  buildRandomMaze,
  gridSearchSteps,
  insertionSortSteps,
  selectionSortSteps,
  type MazeSpec,
  type SearchKind,
  type SortStep,
} from "./sim";
import {
  arrayMemory,
  arrayVisual,
  buildRecursionTrace,
  buildSortTrace,
  gridMemory,
  gridVisual,
  TraceBuilder,
} from "../data/traces/builders";


export type PlayableKind =
  | "sum-array"
  | "max-array"
  | "factorial-loop"
  | "factorial-recursion"
  | "fibonacci-recursion"
  | "binary-search"
  | "bubble-sort"
  | "selection-sort"
  | "insertion-sort"
  | "merge-sort"
  | "quick-sort"
  | "heap-sort"
  | "palindrome"
  | "inorder"
  | "two-sum"
  | "bfs-grid"
  | "dfs-grid";

export interface PlayableConfig {
  array?: number[];
  n?: number;
  target?: number;
  text?: string;
  tree?: (number | null)[];
  maze?: MazeSpec;
  rows?: number;
  cols?: number;
  seed?: number;
}

const clone = <T,>(a: T[]): T[] => [...a];

/* ------------------------------------------------------------------ */
/* New step recorders                                                  */
/* ------------------------------------------------------------------ */

export type MergePhase = "start" | "split" | "compare" | "write" | "copy" | "complete";

export interface MergeStep {
  array: number[];
  /** Active merge window (start..end inclusive). */
  range: [number, number];
  /** Split midpoint for the active merge window. */
  mid: number | null;
  leftRange: [number, number] | null;
  rightRange: [number, number] | null;
  leftValues: number[];
  rightValues: number[];
  /** Index currently being written. */
  writing: number;
  /** Destination slot for a compare/write frame. */
  destination: number | null;
  /** Source indices compared from the left and right runs. */
  compare: [number, number] | null;
  compareValues: [number, number] | null;
  sourceIndex: number | null;
  value: number | null;
  takeSide: "left" | "right" | null;
  phase: MergePhase;
  description: string;
  comparisons: number;
  writes: number;
}

export type QuickPhase = "start" | "partition" | "compare" | "keep" | "swap" | "pivot" | "single" | "complete";

export interface QuickStep extends SortStep {
  phase: QuickPhase;
  range: [number, number] | null;
  pivotIndex: number | null;
  pivotValue: number | null;
  boundary: number | null;
  scanIndex: number | null;
  finalIndex: number | null;
}

export type HeapPhase = "start" | "heapify" | "compare-left" | "compare-right" | "swap-down" | "keep" | "heap-built" | "extract" | "complete";

export interface HeapStep extends SortStep {
  phase: HeapPhase;
  heapSize: number;
  parentIndex: number | null;
  leftIndex: number | null;
  rightIndex: number | null;
  candidateIndex: number | null;
  extractIndex: number | null;
}

interface MergeRecordExtras {
  mid?: number | null;
  leftRange?: [number, number] | null;
  rightRange?: [number, number] | null;
  leftValues?: number[];
  rightValues?: number[];
  destination?: number | null;
  compare?: [number, number] | null;
  compareValues?: [number, number] | null;
  sourceIndex?: number | null;
  value?: number | null;
  takeSide?: "left" | "right" | null;
  phase: MergePhase;
}

/** Recursive merge sort that records compare and write operations separately. */
export function mergeSortSteps(input: number[]): MergeStep[] {
  const a = clone(input);
  const steps: MergeStep[] = [];
  let comparisons = 0;
  let writes = 0;

  const rangeValues = (range: [number, number] | null) =>
    range ? a.slice(range[0], range[1] + 1) : [];

  const record = (
    range: [number, number],
    writing: number,
    description: string,
    extras: MergeRecordExtras,
  ) => {
    const leftValues = extras.leftValues ?? rangeValues(extras.leftRange ?? null);
    const rightValues = extras.rightValues ?? rangeValues(extras.rightRange ?? null);
    steps.push({
      array: clone(a),
      range,
      mid: extras.mid ?? null,
      leftRange: extras.leftRange ?? null,
      rightRange: extras.rightRange ?? null,
      leftValues,
      rightValues,
      writing,
      destination: extras.destination ?? (writing >= 0 ? writing : null),
      compare: extras.compare ?? null,
      compareValues: extras.compareValues ?? null,
      sourceIndex: extras.sourceIndex ?? null,
      value: extras.value ?? (writing >= 0 ? a[writing] : null),
      takeSide: extras.takeSide ?? null,
      phase: extras.phase,
      description,
      comparisons,
      writes,
    });
  };

  record(
    [0, a.length - 1],
    -1,
    `Merge sort splits ${a.length} elements down to single-element runs, then merges them back up in sorted order.`,
    { phase: "start" },
  );

  function merge(lo: number, mid: number, hi: number) {
    const left = a.slice(lo, mid + 1);
    const right = a.slice(mid + 1, hi + 1);
    let i = 0;
    let j = 0;
    let k = lo;
    const leftRange: [number, number] = [lo, mid];
    const rightRange: [number, number] = [mid + 1, hi];

    while (i < left.length && j < right.length) {
      comparisons++;
      const leftValue = left[i];
      const rightValue = right[j];
      const takeLeft = leftValue <= rightValue;
      const sourceIndex = takeLeft ? lo + i : mid + 1 + j;
      const value = takeLeft ? leftValue : rightValue;
      record(
        [lo, hi],
        -1,
        takeLeft
          ? `Compare ${leftValue} vs ${rightValue} - take ${leftValue} from the left run.`
          : `Compare ${leftValue} vs ${rightValue} - take ${rightValue} from the right run.`,
        {
          phase: "compare",
          mid,
          leftRange,
          rightRange,
          leftValues: left,
          rightValues: right,
          destination: k,
          compare: [lo + i, mid + 1 + j],
          compareValues: [leftValue, rightValue],
          sourceIndex,
          value,
          takeSide: takeLeft ? "left" : "right",
        },
      );

      a[k] = value;
      if (takeLeft) i++;
      else j++;
      writes++;
      record([lo, hi], k, `Write ${value} into merged position ${k}.`, {
        phase: "write",
        mid,
        leftRange,
        rightRange,
        leftValues: left,
        rightValues: right,
        destination: k,
        sourceIndex,
        value,
        takeSide: takeLeft ? "left" : "right",
      });
      k++;
    }

    while (i < left.length) {
      const sourceIndex = lo + i;
      const value = left[i++];
      a[k] = value;
      writes++;
      record([lo, hi], k, `Left run has ${value} left - copy it to position ${k}.`, {
        phase: "copy",
        mid,
        leftRange,
        rightRange,
        leftValues: left,
        rightValues: right,
        destination: k,
        sourceIndex,
        value,
        takeSide: "left",
      });
      k++;
    }

    while (j < right.length) {
      const sourceIndex = mid + 1 + j;
      const value = right[j++];
      a[k] = value;
      writes++;
      record([lo, hi], k, `Right run has ${value} left - copy it to position ${k}.`, {
        phase: "copy",
        mid,
        leftRange,
        rightRange,
        leftValues: left,
        rightValues: right,
        destination: k,
        sourceIndex,
        value,
        takeSide: "right",
      });
      k++;
    }
  }

  function sort(lo: number, hi: number) {
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);
    record([lo, hi], -1, `Split [${lo}..${hi}] at mid ${mid}.`, {
      phase: "split",
      mid,
      leftRange: [lo, mid],
      rightRange: [mid + 1, hi],
    });
    sort(lo, mid);
    sort(mid + 1, hi);
    merge(lo, mid, hi);
  }

  sort(0, a.length - 1);
  record([0, a.length - 1], -1, `Sorted! ${comparisons} comparisons and ${writes} writes.`, {
    phase: "complete",
  });
  return steps;
}

// Quick sort (Lomuto partition) - records pivot, scanner, boundary, swaps, and locked pivots.
export function quickSortSteps(input: number[]): QuickStep[] {
  const a = clone(input);
  const steps: QuickStep[] = [];
  let comparisons = 0;
  let swaps = 0;
  const sorted = new Set<number>();

  const sortedSnapshot = () => [...sorted].sort((left, right) => left - right);

  const record = (
    phase: QuickPhase,
    description: string,
    extras: Partial<Omit<QuickStep, "array" | "description" | "comparisons" | "swaps" | "phase">> = {},
  ) => {
    steps.push({
      array: clone(a),
      sortedUpTo: extras.sortedUpTo ?? -1,
      sortedIndices: sortedSnapshot(),
      key: extras.key,
      compare: extras.compare,
      swap: extras.swap,
      range: extras.range ?? null,
      pivotIndex: extras.pivotIndex ?? null,
      pivotValue: extras.pivotValue ?? null,
      boundary: extras.boundary ?? null,
      scanIndex: extras.scanIndex ?? null,
      finalIndex: extras.finalIndex ?? null,
      phase,
      description,
      comparisons,
      swaps,
    });
  };

  record(
    "start",
    `Quick sort picks a pivot and partitions the array so smaller values sit left and larger values sit right, then recurses.`,
    { range: [0, Math.max(0, a.length - 1)] },
  );

  function partition(lo: number, hi: number): number {
    const pivot = a[hi];
    let i = lo;

    record("partition", `Partition [${lo}..${hi}] around pivot ${pivot}. Boundary i starts at ${i}.`, {
      range: [lo, hi],
      pivotIndex: hi,
      pivotValue: pivot,
      boundary: i,
      scanIndex: lo,
      key: hi,
    });

    for (let j = lo; j < hi; j++) {
      comparisons++;
      const isSmaller = a[j] < pivot;
      record("compare", `Compare a[${j}] = ${a[j]} with pivot ${pivot}.`, {
        compare: [j, hi],
        key: hi,
        range: [lo, hi],
        pivotIndex: hi,
        pivotValue: pivot,
        boundary: i,
        scanIndex: j,
      });

      if (isSmaller) {
        const moving = a[j];
        [a[i], a[j]] = [a[j], a[i]];
        if (i !== j) {
          swaps++;
          record("swap", `${moving} < pivot, so move it into the smaller zone at index ${i}.`, {
            swap: [i, j],
            key: hi,
            range: [lo, hi],
            pivotIndex: hi,
            pivotValue: pivot,
            boundary: i + 1,
            scanIndex: j,
          });
        } else {
          record("keep", `${moving} is already at boundary ${i}; grow the smaller zone.`, {
            key: hi,
            range: [lo, hi],
            pivotIndex: hi,
            pivotValue: pivot,
            boundary: i + 1,
            scanIndex: j,
          });
        }
        i++;
      }
    }

    const finalIndex = i;
    [a[i], a[hi]] = [a[hi], a[i]];
    if (i !== hi) swaps++;
    sorted.add(finalIndex);
    record("pivot", `Place pivot ${pivot} at final index ${finalIndex}. Left side is smaller; right side is larger or equal.`, {
      swap: finalIndex === hi ? undefined : [finalIndex, hi],
      key: finalIndex,
      range: [lo, hi],
      pivotIndex: finalIndex,
      pivotValue: pivot,
      boundary: finalIndex,
      scanIndex: null,
      finalIndex,
    });
    return finalIndex;
  }

  function sort(lo: number, hi: number) {
    if (lo > hi) return;
    if (lo === hi) {
      sorted.add(lo);
      record("single", `Single element at ${lo} is sorted by definition.`, {
        key: lo,
        range: [lo, hi],
        pivotIndex: lo,
        pivotValue: a[lo],
        boundary: lo,
        scanIndex: lo,
        finalIndex: lo,
      });
      return;
    }
    const p = partition(lo, hi);
    sort(lo, p - 1);
    sort(p + 1, hi);
  }

  sort(0, a.length - 1);
  for (let index = 0; index < a.length; index++) sorted.add(index);
  record("complete", `Sorted! ${comparisons} comparisons and ${swaps} swaps.`, {
    sortedUpTo: a.length - 1,
    range: [0, Math.max(0, a.length - 1)],
  });
  return steps;
}

// Heap sort - records max-heap structure, sift-down comparisons, extraction, and sorted tail.
export function heapSortSteps(input: number[]): HeapStep[] {
  const a = clone(input);
  const steps: HeapStep[] = [];
  let comparisons = 0;
  let swaps = 0;
  const sorted = new Set<number>();

  const sortedSnapshot = () => [...sorted].sort((left, right) => left - right);

  const record = (
    phase: HeapPhase,
    description: string,
    extras: Partial<Omit<HeapStep, "array" | "description" | "comparisons" | "swaps" | "phase">> = {},
  ) => {
    steps.push({
      array: clone(a),
      sortedUpTo: extras.sortedUpTo ?? -1,
      sortedIndices: extras.sortedIndices ?? sortedSnapshot(),
      compare: extras.compare,
      swap: extras.swap,
      key: extras.key,
      heapSize: extras.heapSize ?? a.length,
      parentIndex: extras.parentIndex ?? null,
      leftIndex: extras.leftIndex ?? null,
      rightIndex: extras.rightIndex ?? null,
      candidateIndex: extras.candidateIndex ?? null,
      extractIndex: extras.extractIndex ?? null,
      phase,
      description,
      comparisons,
      swaps,
    });
  };

  record(
    "start",
    `Heap sort first builds a max-heap, then repeatedly moves the root maximum into the sorted tail.`,
    { heapSize: a.length },
  );

  function siftDown(heapSize: number, start: number, extractIndex: number | null) {
    let parent = start;
    while (true) {
      let largest = parent;
      const left = 2 * parent + 1;
      const right = 2 * parent + 2;

      if (left < heapSize) {
        comparisons++;
        record("compare-left", `Compare left child a[${left}] = ${a[left]} with parent a[${parent}] = ${a[parent]}.`, {
          compare: [parent, left],
          key: parent,
          heapSize,
          parentIndex: parent,
          leftIndex: left,
          candidateIndex: largest,
          extractIndex,
        });
        if (a[left] > a[largest]) largest = left;
      }

      if (right < heapSize) {
        comparisons++;
        record("compare-right", `Compare right child a[${right}] = ${a[right]} with current largest a[${largest}] = ${a[largest]}.`, {
          compare: [largest, right],
          key: largest,
          heapSize,
          parentIndex: parent,
          rightIndex: right,
          candidateIndex: largest,
          extractIndex,
        });
        if (a[right] > a[largest]) largest = right;
      }

      if (largest === parent) {
        record("keep", `Index ${parent} satisfies the max-heap rule inside heap size ${heapSize}.`, {
          key: parent,
          heapSize,
          parentIndex: parent,
          candidateIndex: parent,
          extractIndex,
        });
        break;
      }

      const parentValue = a[parent];
      const childValue = a[largest];
      [a[parent], a[largest]] = [a[largest], a[parent]];
      swaps++;
      record("swap-down", `${childValue} is larger than ${parentValue}, so swap parent ${parent} with child ${largest}.`, {
        swap: [parent, largest],
        key: largest,
        heapSize,
        parentIndex: parent,
        candidateIndex: largest,
        extractIndex,
      });
      parent = largest;
    }
  }

  for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) {
    record("heapify", `Heapify subtree rooted at index ${i}.`, {
      key: i,
      heapSize: a.length,
      parentIndex: i,
      candidateIndex: i,
    });
    siftDown(a.length, i, null);
  }

  record("heap-built", `Max-heap built: root ${a[0]} is the largest unsorted value.`, {
    key: 0,
    heapSize: a.length,
    parentIndex: 0,
    candidateIndex: 0,
  });

  for (let end = a.length - 1; end > 0; end--) {
    const rootValue = a[0];
    [a[0], a[end]] = [a[end], a[0]];
    swaps++;
    sorted.add(end);
    record("extract", `Move max ${rootValue} from the root into final sorted position ${end}.`, {
      swap: [0, end],
      key: 0,
      heapSize: end,
      parentIndex: 0,
      candidateIndex: 0,
      extractIndex: end,
    });
    siftDown(end, 0, end);
    record("heapify", end > 1 ? `Heap restored for unsorted prefix [0..${end - 1}].` : `Only one unsorted value remains at the root.`, {
      key: 0,
      heapSize: end,
      parentIndex: 0,
      candidateIndex: 0,
      extractIndex: end,
    });
  }

  if (a.length > 0) sorted.add(0);
  for (let index = 0; index < a.length; index++) sorted.add(index);
  record("complete", `Sorted! ${comparisons} comparisons and ${swaps} swaps.`, {
    sortedUpTo: a.length - 1,
    sortedIndices: sortedSnapshot(),
    heapSize: 0,
  });
  return steps;
}

/* ------------------------------------------------------------------ */
/* Two-pointer + tree recorders                                        */
/* ------------------------------------------------------------------ */

export interface PalindromeStep {
  chars: string[];
  l: number;
  r: number;
  status: "probe" | "ok" | "invalid" | "done";
  description: string;
  comparisons: number;
}

/** Valid-palindrome check with converging pointers. */
export function palindromeSteps(text: string): PalindromeStep[] {
  const chars = [...text];
  const steps: PalindromeStep[] = [];
  let comparisons = 0;

  steps.push({
    chars: clone(chars),
    l: 0,
    r: Math.max(0, chars.length - 1),
    status: "probe",
    description: `Build a character tape for "${text}". L starts at index 0 and R starts at index ${Math.max(0, chars.length - 1)}; everything outside L..R is already verified.`,
    comparisons,
  });

  let l = 0;
  let r = chars.length - 1;
  while (l < r) {
    comparisons++;
    steps.push({
      chars: clone(chars),
      l,
      r,
      status: "probe",
      description: `Compare the mirrored pair: s[${l}] = '${chars[l]}' and s[${r}] = '${chars[r]}'. If they match, both edge cells become safe.`,
      comparisons,
    });
    if (chars[l] !== chars[r]) {
      steps.push({
        chars: clone(chars),
        l,
        r,
        status: "invalid",
        description: `Mismatch: '${chars[l]}' is not '${chars[r]}'. One broken mirror pair is enough, so "${text}" is NOT a palindrome.`,
        comparisons,
      });
      return steps;
    }
    steps.push({
      chars: clone(chars),
      l,
      r,
      status: "ok",
      description: `Match: '${chars[l]}' equals '${chars[r]}'. Lock both cells, then move L ${l} → ${l + 1} and R ${r} → ${r - 1}.`,
      comparisons,
    });
    l++;
    r--;
  }
  steps.push({
    chars: clone(chars),
    l,
    r,
    status: "done",
    description: `Pointers met after ${comparisons} mirror checks. Every locked pair matched, so "${text}" reads the same both ways.`,
    comparisons,
  });
  return steps;
}

export interface TwoSumStep {
  array: number[];
  l: number;
  r: number;
  sum: number;
  target: number;
  status: "probe" | "found" | "not-found";
  description: string;
  probes: number;
}

/** Two-sum on a SORTED array with converging pointers. */
export function twoSumSortedSteps(input: number[], target: number): TwoSumStep[] {
  const a = clone(input).sort((x, y) => x - y);
  const steps: TwoSumStep[] = [];
  let l = 0;
  let r = a.length - 1;
  let probes = 0;

  steps.push({
    array: clone(a),
    l,
    r,
    sum: a[l] + a[r],
    target,
    status: "probe",
    description: `Sorted array: [${a.join(", ")}]. L starts at the smallest value and R at the largest. If the sum is too small, move L right; if too large, move R left.`,
    probes,
  });

  while (l < r) {
    const sum = a[l] + a[r];
    probes++;
    steps.push({
      array: clone(a),
      l,
      r,
      sum,
      target,
      status: "probe",
      description: `Probe pair a[${l}] + a[${r}] = ${a[l]} + ${a[r]} = ${sum}. Compare ${sum} with target ${target} to decide which pointer can move.`,
      probes,
    });
    if (sum === target) {
      steps.push({
        array: clone(a),
        l,
        r,
        sum,
        target,
        status: "found",
        description: `${sum} equals target ${target}. Keep L at ${l} and R at ${r}; this pair is the answer.`,
        probes,
      });
      return steps;
    }
    if (sum < target) {
      l++;
      steps.push({
        array: clone(a),
        l,
        r,
        sum,
        target,
        status: "probe",
        description: `${sum} is too small, so the left value must grow. Move L right to index ${l} (value ${a[l]}).`,
        probes,
      });
    } else {
      r--;
      steps.push({
        array: clone(a),
        l,
        r,
        sum,
        target,
        status: "probe",
        description: `${sum} is too large, so the right value must shrink. Move R left to index ${r} (value ${a[r]}).`,
        probes,
      });
    }
  }

  steps.push({
    array: clone(a),
    l,
    r,
    sum: a[l] + a[r],
    target,
    status: "not-found",
    description: `Pointers met or crossed after ${probes} probes. Every possible outside pair was eliminated, so no pair sums to ${target}.`,
    probes,
  });
  return steps;
}

export interface TreeStep {
  tree: (number | null)[];
  /** Heap index of the node being visited. */
  node: number;
  visited: number[];
  result: number[];
  description: string;
}

/** Inorder traversal of a heap-indexed binary tree (left → node → right). */
export function inorderSteps(tree: (number | null)[]): TreeStep[] {
  const steps: TreeStep[] = [];
  const visited: number[] = [];
  const result: number[] = [];

  const record = (node: number, description: string) => {
    steps.push({ tree: clone(tree), node, visited: [...visited], result: [...result], description });
  };

  record(-1, `Inorder traversal visits the left subtree, then the node, then the right subtree — for a BST that yields sorted order.`);

  const leftChild = (i: number) => (tree[2 * i + 1] === undefined ? -1 : 2 * i + 1);
  const rightChild = (i: number) => (tree[2 * i + 2] === undefined ? -1 : 2 * i + 2);
  const stack: number[] = [];
  let i = 0;

  while (stack.length > 0 || (i >= 0 && i < tree.length && tree[i] !== undefined && tree[i] !== null)) {
    // Descend left as far as possible.
    while (i >= 0 && i < tree.length && tree[i] !== undefined && tree[i] !== null) {
      stack.push(i);
      record(i, `Push node ${tree[i]} (index ${i}) onto the stack and descend left.`);
      i = leftChild(i);
    }
    if (stack.length === 0) break;
    i = stack.pop()!;
    visited.push(i);
    result.push(tree[i] as number);
    record(i, `Pop ${tree[i]} — visit it. Result so far: [${result.join(", ")}].`);
    i = rightChild(i);
  }

  record(-1, `Traversal complete. Inorder: [${result.join(", ")}].`);
  return steps;
}

/* ------------------------------------------------------------------ */
/* Trace builders                                                      */
/* ------------------------------------------------------------------ */

function sumArrayTrace(values: number[], code: string): TraceDocument {
  const b = new TraceBuilder({
    title: "Sum of Array",
    code,
    topic: "arrays",
    difficulty: "beginner",
    language: detectLanguage(code),
    durationSeconds: 60,
  });
  b.step({
    line: 1,
    event: "program_start",
    description: "Initialize total = 0.",
    variables: { total: 0, arr: `[${values.join(", ")}]` },
    memory: [arrayMemory("arr", "arr", values, [{ index: 0, role: "reading" }])],
    visual: arrayVisual("arr"),
    changed: { variables: ["total"] },
  });
  let total = 0;
  values.forEach((v, i) => {
    b.step({
      line: 2,
      event: "loop_iteration",
      description: `i = ${i}. Read arr[${i}] = ${v}.`,
      variables: { total, i, arr: `[${values.join(", ")}]` },
      memory: [arrayMemory("arr", "arr", values, [{ index: i, role: "reading" }])],
      visual: arrayVisual("arr"),
      changed: { variables: ["i"] },
    });
    total += v;
    b.step({
      line: 3,
      event: "assignment",
      description: `total = ${total - v} + ${v} = ${total}.`,
      variables: { total, i, arr: `[${values.join(", ")}]` },
      memory: [arrayMemory("arr", "arr", values, [{ index: i, role: "reading" }])],
      visual: arrayVisual("arr"),
      changed: { variables: ["total"] },
    });
  });
  b.step({
    line: 4,
    event: "output_write",
    description: `print("Total:", total) writes: Total: ${total}`,
    variables: { total, arr: `[${values.join(", ")}]` },
    output: `Total: ${total}`,
    memory: [arrayMemory("arr", "arr", values)],
    visual: arrayVisual("arr"),
    changed: { output: true },
  });
  b.step({
    line: 4,
    event: "program_end",
    description: `Program finished. Sum of the array is ${total}.`,
    variables: { total, arr: `[${values.join(", ")}]` },
    output: `Total: ${total}`,
    memory: [arrayMemory("arr", "arr", values)],
    visual: arrayVisual("arr"),
  });
  b.prompt({
    stepId: `step-${String(2 * values.length + 1).padStart(3, "0")}`,
    type: "predict_variable",
    question: `What is the final value of total after adding all ${values.length} elements?`,
    target: { variable: "total" },
    answer: String(total),
    choices: [String(total), String(total - values[values.length - 1]), "0", String(values[0])],
    explanation: `Each element is added once: ${values.join(" + ")} = ${total}.`,
  });
  return b.build();
}

function maxArrayTrace(values: number[], code: string): TraceDocument {
  const b = new TraceBuilder({
    title: "Max in Array",
    code,
    topic: "arrays",
    difficulty: "beginner",
    language: detectLanguage(code),
    durationSeconds: 60,
  });
  b.step({
    line: 1,
    event: "program_start",
    description: `Start with the first element as the maximum: max_val = ${values[0]}.`,
    variables: { max_val: values[0], arr: `[${values.join(", ")}]` },
    memory: [arrayMemory("arr", "arr", values, [{ index: 0, role: "max" }])],
    visual: arrayVisual("arr"),
    changed: { variables: ["max_val"] },
  });
  let max = values[0];
  let maxIdx = 0;
  for (let i = 1; i < values.length; i++) {
    const v = values[i];
    const prevMax = max;
    const update = v > max;
    b.step({
      line: 2,
      event: "loop_iteration",
      description: `i = ${i}. Compare arr[${i}] = ${v} with max_val = ${max}.`,
      variables: { max_val: max, i, arr: `[${values.join(", ")}]` },
      memory: [arrayMemory("arr", "arr", values, [{ index: i, role: "reading" }, { index: maxIdx, role: "max" }])],
      visual: arrayVisual("arr"),
      changed: { variables: ["i"] },
    });
    if (update) {
      max = v;
      maxIdx = i;
      b.step({
        line: 3,
        event: "assignment",
        description: `${v} > ${prevMax} → new maximum: max_val = ${v}.`,
        variables: { max_val: max, i, arr: `[${values.join(", ")}]` },
        memory: [arrayMemory("arr", "arr", values, [{ index: i, role: "max" }, { index: i, role: "reading" }])],
        visual: arrayVisual("arr"),
        changed: { variables: ["max_val"] },
      });
    }
  }
  b.step({
    line: 4,
    event: "output_write",
    description: `The maximum value in the array is ${max}.`,
    variables: { max_val: max, arr: `[${values.join(", ")}]` },
    output: `Max: ${max}`,
    memory: [arrayMemory("arr", "arr", values)],
    visual: arrayVisual("arr"),
    changed: { output: true },
  });
  b.step({
    line: 4,
    event: "program_end",
    description: `Program finished. max_val = ${max}.`,
    variables: { max_val: max, arr: `[${values.join(", ")}]` },
    output: `Max: ${max}`,
    memory: [arrayMemory("arr", "arr", values)],
    visual: arrayVisual("arr"),
  });
  return b.build();
}

function factorialLoopTrace(n: number, code: string): TraceDocument {
  const factors = Array.from({ length: n }, (_, index) => index + 1);
  const factorMemory = (activeIndex = -1, doneThrough = -1) =>
    arrayMemory(
      "factors",
      "factor chain",
      factors,
      factors.flatMap((_, index) => {
        const roles: { index: number; role: string }[] = [];
        if (index < doneThrough) roles.push({ index, role: "sorted" });
        if (index === activeIndex) roles.push({ index, role: "key" });
        return roles;
      }),
    );

  const b = new TraceBuilder({
    title: "Factorial (Loop)",
    code,
    topic: "loops",
    difficulty: "beginner",
    language: detectLanguage(code),
    durationSeconds: 70,
  });
  b.step({
    line: 1,
    event: "program_start",
    description: `Choose n = ${n}. The factor chain is [${factors.join(", ")}]; the loop will multiply exactly one factor each turn.`,
    variables: { n, goal: `multiply 1..${n}` },
    memory: [factorMemory()],
    visual: arrayVisual("factors"),
    changed: { variables: ["n"] },
    actions: [{ type: "assignment", target: "n", value: n }],
  });
  b.step({
    line: 2,
    event: "assignment",
    description: "result starts at 1, because multiplying by 1 does not change the answer. This gives the loop a safe accumulator.",
    variables: { result: 1, n, goal: `multiply 1..${n}` },
    memory: [factorMemory()],
    visual: arrayVisual("factors"),
    changed: { variables: ["result"] },
    actions: [{ type: "assignment", target: "result", value: 1 }],
  });
  let result = 1;
  for (let i = 1; i <= n; i++) {
    const before = result;
    result *= i;
    const running = Array.from({ length: i }, (_, k) => k + 1).join(" × ");
    b.step({
      line: 3,
      event: "loop_iteration",
      description: `Iteration ${i}/${n}: select factor ${i}. Before multiplication, result is ${before}; line 4 will combine them.`,
      variables: { result: before, i, n, next_factor: i },
      memory: [factorMemory(i - 1, i - 1)],
      visual: arrayVisual("factors"),
      changed: { variables: ["i", "next_factor"] },
      actions: [{ type: "loop_iteration", i, item: "factors", index: i - 1 }],
    });
    b.step({
      line: 4,
      event: "assignment",
      description: `result = ${before} × ${i} = ${result}. Lock factor ${i}; running product is ${running} = ${result}.`,
      variables: { result, i, n, multiplied_through: i },
      memory: [factorMemory(i - 1, i)],
      visual: arrayVisual("factors"),
      changed: { variables: ["result", "multiplied_through"] },
      actions: [{ type: "assignment", target: "result", value: result, before, factor: i, index: i - 1 }],
    });
  }
  b.step({
    line: 4,
    event: "output_write",
    description: `All ${n} factors are locked. print("Factorial:", result) writes: Factorial: ${result}`,
    variables: { result, n, multiplied_through: n },
    output: `Factorial: ${result}`,
    memory: [factorMemory(-1, n)],
    visual: arrayVisual("factors"),
    changed: { output: true },
    actions: [{ type: "output_write", value: `Factorial: ${result}` }],
  });
  b.step({
    line: 4,
    event: "program_end",
    description: `${n}! = ${factors.join(" × ")} = ${result}. The loop changed only result and i; no hidden recursion happened.`,
    variables: { result, n, multiplied_through: n },
    output: `Factorial: ${result}`,
    memory: [factorMemory(-1, n)],
    visual: arrayVisual("factors"),
  });
  return b.build();
}

function binarySearchTraceGen(values: number[], target: number, code: string): TraceDocument {
  const steps = binarySearchSteps(values, target);
  const b = new TraceBuilder({
    title: "Binary Search",
    code,
    topic: "searching",
    difficulty: "intermediate",
    language: detectLanguage(code),
    durationSeconds: 90,
  });
  steps.forEach((s, i) => {
    const highlights: { index: number; role: string }[] = [];
    for (let j = 0; j < s.array.length; j++) {
      if (s.mid === j) highlights.push({ index: j, role: "mid" });
      else if (j >= s.low && j <= s.high) highlights.push({ index: j, role: "range" });
      else highlights.push({ index: j, role: "out" });
    }
    const prev = i > 0 ? steps[i - 1] : undefined;
    const changedVars: string[] = [];
    if (i === 0) {
      changedVars.push("low", "high", "probes");
    } else {
      if (s.low !== prev!.low) changedVars.push("low");
      if (s.high !== prev!.high) changedVars.push("high");
      if (s.mid !== prev!.mid) changedVars.push("mid");
      if (s.probes !== prev!.probes) changedVars.push("probes");
    }
    b.step({
      line: i === 0 ? 1 : i % 2 === 0 ? 4 : 5,
      event: i === 0 ? "program_start" : s.status === "found" ? "comparison" : i === steps.length - 1 ? "program_end" : "line_enter",
      description: s.description,
      variables: { target, low: s.low, high: s.high, mid: s.mid ?? "—", probes: s.probes },
      memory: [arrayMemory("arr", "arr", s.array, highlights)],
      visual: arrayVisual("arr"),
      changed: { variables: changedVars },
    });
  });
  return b.build();
}

const SORT_LINES: Record<string, { setup: number; compare: number; swap: number; settled: number; done: number }> = {
  bubble: { setup: 1, compare: 5, swap: 6, settled: 4, done: 7 },
  insertion: { setup: 1, compare: 5, swap: 6, settled: 4, done: 7 },
  selection: { setup: 1, compare: 6, swap: 8, settled: 4, done: 9 },
  quick: { setup: 1, compare: 6, swap: 7, settled: 4, done: 11 },
  heap: { setup: 1, compare: 5, swap: 10, settled: 4, done: 12 },
};

function sortTrace(
  kind: "bubble" | "selection" | "insertion" | "quick" | "heap",
  values: number[],
  code: string,
): TraceDocument {
  if (kind === "quick") return quickTrace(values, code);
  if (kind === "heap") return heapTrace(values, code);

  const steps =
    kind === "bubble"
      ? bubbleSortSteps(values)
      : kind === "selection"
        ? selectionSortSteps(values)
        : kind === "insertion"
          ? insertionSortSteps(values)
          : heapSortSteps(values);
  const titles: Record<string, string> = {
    bubble: "Bubble Sort",
    selection: "Selection Sort",
    insertion: "Insertion Sort",
    quick: "Quick Sort",
    heap: "Heap Sort",
  };
  return buildSortTrace(
    {
      title: titles[kind],
      code,
      topic: "sorting",
      difficulty: kind === "bubble" || kind === "selection" || kind === "insertion" ? "beginner" : "intermediate",
      language: detectLanguage(code),
      durationSeconds: 120,
      lines: SORT_LINES[kind],
    },
    steps,
  );
}

function quickTrace(values: number[], code: string): TraceDocument {
  const steps = quickSortSteps(values);
  const b = new TraceBuilder({
    title: "Quick Sort",
    code,
    topic: "sorting",
    difficulty: "intermediate",
    language: detectLanguage(code),
    durationSeconds: 120,
  });

  const lineFor = (s: QuickStep, isFirst: boolean, isLast: boolean) => {
    if (isFirst) return 1;
    if (isLast) return 11;
    if (s.phase === "partition") return 3;
    if (s.phase === "compare") return 6;
    if (s.phase === "swap" || s.phase === "keep") return 7;
    if (s.phase === "pivot") return 9;
    return 4;
  };

  const eventFor = (s: QuickStep, isFirst: boolean, isLast: boolean) => {
    if (isFirst) return "program_start";
    if (isLast) return "program_end";
    if (s.phase === "compare") return "comparison";
    if (s.phase === "swap" || (s.phase === "pivot" && s.swap)) return "swap";
    return "line_enter";
  };

  const actionFor = (s: QuickStep) => {
    const common = {
      phase: `quick_${s.phase}`,
      range: s.range,
      pivotIndex: s.pivotIndex,
      pivotValue: s.pivotValue,
      boundary: s.boundary,
      scanIndex: s.scanIndex,
      finalIndex: s.finalIndex,
      sortedIndices: s.sortedIndices ?? [],
    };

    if (s.phase === "compare" && s.compare) {
      const scanValue = s.scanIndex !== null ? s.array[s.scanIndex] : null;
      return {
        type: "compare",
        indices: s.compare,
        values: scanValue !== null && s.pivotValue !== null ? [scanValue, s.pivotValue] : undefined,
        result: scanValue !== null && s.pivotValue !== null ? scanValue < s.pivotValue : false,
        ...common,
      };
    }

    if ((s.phase === "swap" || s.phase === "pivot") && s.swap) {
      return {
        type: "swap",
        indices: s.swap,
        ...common,
      };
    }

    return {
      type: "array_read",
      index: s.scanIndex ?? s.pivotIndex ?? s.finalIndex ?? s.range?.[0] ?? 0,
      ...common,
    };
  };

  steps.forEach((s, i) => {
    const highlights: { index: number; role: string }[] = [];
    if (s.range) {
      for (let index = s.range[0]; index <= s.range[1]; index++) highlights.push({ index, role: "range" });
    }
    if (s.compare) {
      highlights.push({ index: s.compare[0], role: "compare" });
      highlights.push({ index: s.compare[1], role: "compare" });
    }
    if (s.swap) {
      highlights.push({ index: s.swap[0], role: "swap" });
      highlights.push({ index: s.swap[1], role: "swap" });
    }
    if (s.key !== undefined) highlights.push({ index: s.key, role: "key" });
    if (s.scanIndex !== null) highlights.push({ index: s.scanIndex, role: "scan" });
    if (s.boundary !== null && s.boundary >= 0 && s.boundary < s.array.length) highlights.push({ index: s.boundary, role: "boundary" });
    for (const index of s.sortedIndices ?? []) highlights.push({ index, role: "sorted" });

    const lo = s.range?.[0] ?? "-";
    const hi = s.range?.[1] ?? "-";
    b.step({
      line: lineFor(s, i === 0, i === steps.length - 1),
      event: eventFor(s, i === 0, i === steps.length - 1),
      description: s.description,
      variables: {
        arr: s.array.map(String).join(", "),
        lo,
        hi,
        pivot: s.pivotValue ?? "-",
        i: s.boundary ?? "-",
        j: s.scanIndex ?? "-",
        comparisons: s.comparisons,
        swaps: s.swaps,
      },
      memory: [arrayMemory("arr", "arr", s.array, highlights)],
      visual: arrayVisual("arr"),
      changed: {
        variables:
          s.phase === "swap" || s.phase === "pivot"
            ? ["arr", "i", "swaps"]
            : s.phase === "compare"
              ? ["j", "comparisons"]
              : ["lo", "hi", "pivot", "i"],
      },
      actions: [actionFor(s)],
    });
  });

  return b.build();
}

function heapTrace(values: number[], code: string): TraceDocument {
  const steps = heapSortSteps(values);
  const b = new TraceBuilder({
    title: "Heap Sort",
    code,
    topic: "sorting",
    difficulty: "intermediate",
    language: detectLanguage(code),
    durationSeconds: 120,
  });

  const lineFor = (s: HeapStep, isFirst: boolean, isLast: boolean) => {
    if (isFirst) return 1;
    if (isLast) return 12;
    if (s.phase === "heapify" || s.phase === "heap-built") return 2;
    if (s.phase === "compare-left" || s.phase === "compare-right") return 5;
    if (s.phase === "swap-down" || s.phase === "extract") return 10;
    return 4;
  };

  const eventFor = (s: HeapStep, isFirst: boolean, isLast: boolean) => {
    if (isFirst) return "program_start";
    if (isLast) return "program_end";
    if (s.phase === "compare-left" || s.phase === "compare-right") return "comparison";
    if (s.phase === "swap-down" || s.phase === "extract") return "swap";
    return "line_enter";
  };

  const actionFor = (s: HeapStep) => {
    const common = {
      phase: `heap_${s.phase}`,
      heapSize: s.heapSize,
      parentIndex: s.parentIndex,
      leftIndex: s.leftIndex,
      rightIndex: s.rightIndex,
      candidateIndex: s.candidateIndex,
      extractIndex: s.extractIndex,
      sortedIndices: s.sortedIndices ?? [],
    };

    if ((s.phase === "compare-left" || s.phase === "compare-right") && s.compare) {
      const [left, right] = s.compare;
      return {
        type: "compare",
        indices: s.compare,
        values: [s.array[left], s.array[right]],
        result: s.array[right] > s.array[left],
        ...common,
      };
    }

    if ((s.phase === "swap-down" || s.phase === "extract") && s.swap) {
      return {
        type: "swap",
        indices: s.swap,
        ...common,
      };
    }

    return {
      type: "array_read",
      index: s.parentIndex ?? s.candidateIndex ?? s.extractIndex ?? 0,
      ...common,
    };
  };

  steps.forEach((s, i) => {
    const highlights: { index: number; role: string }[] = [];
    for (let index = 0; index < s.heapSize; index++) highlights.push({ index, role: "range" });
    for (const index of s.sortedIndices ?? []) highlights.push({ index, role: "sorted" });
    if (s.compare) {
      highlights.push({ index: s.compare[0], role: "compare" });
      highlights.push({ index: s.compare[1], role: "compare" });
    }
    if (s.swap) {
      highlights.push({ index: s.swap[0], role: "swap" });
      highlights.push({ index: s.swap[1], role: "swap" });
    }
    if (s.parentIndex !== null) highlights.push({ index: s.parentIndex, role: "parent" });
    if (s.leftIndex !== null) highlights.push({ index: s.leftIndex, role: "left" });
    if (s.rightIndex !== null) highlights.push({ index: s.rightIndex, role: "right" });
    if (s.candidateIndex !== null) highlights.push({ index: s.candidateIndex, role: "candidate" });
    if (s.extractIndex !== null) highlights.push({ index: s.extractIndex, role: "extract" });
    if (s.key !== undefined) highlights.push({ index: s.key, role: "key" });

    b.step({
      line: lineFor(s, i === 0, i === steps.length - 1),
      event: eventFor(s, i === 0, i === steps.length - 1),
      description: s.description,
      variables: {
        arr: s.array.map(String).join(", "),
        heap_size: s.heapSize,
        parent: s.parentIndex ?? "-",
        candidate: s.candidateIndex ?? "-",
        extract_to: s.extractIndex ?? "-",
        comparisons: s.comparisons,
        swaps: s.swaps,
      },
      memory: [arrayMemory("arr", "arr", s.array, highlights)],
      visual: arrayVisual("arr"),
      changed: {
        variables:
          s.phase === "swap-down" || s.phase === "extract"
            ? ["arr", "heap_size", "swaps"]
            : s.phase === "compare-left" || s.phase === "compare-right"
              ? ["parent", "candidate", "comparisons"]
              : ["heap_size", "parent", "candidate"],
      },
      actions: [actionFor(s)],
    });
  });

  return b.build();
}

function mergeTrace(values: number[], code: string): TraceDocument {
  const steps = mergeSortSteps(values);
  const b = new TraceBuilder({
    title: "Merge Sort",
    code,
    topic: "sorting",
    difficulty: "intermediate",
    language: detectLanguage(code),
    durationSeconds: 120,
  });

  const lineFor = (s: MergeStep, isFirst: boolean, isLast: boolean) => {
    if (isFirst) return 1;
    if (isLast) return 11;
    if (s.phase === "compare") return 5;
    if (s.phase === "write" || s.phase === "copy") return 10;
    return 5;
  };

  const eventFor = (s: MergeStep, isFirst: boolean, isLast: boolean) => {
    if (isFirst) return "program_start";
    if (isLast) return "program_end";
    if (s.phase === "compare") return "comparison";
    if (s.phase === "write" || s.phase === "copy") return "array_write";
    return "line_enter";
  };

  const actionFor = (s: MergeStep) => {
    const common = {
      range: s.range,
      mid: s.mid,
      leftRange: s.leftRange,
      rightRange: s.rightRange,
      leftValues: s.leftValues,
      rightValues: s.rightValues,
      destination: s.destination,
      take: s.takeSide,
      sourceIndex: s.sourceIndex,
      value: s.value,
    };

    if (s.phase === "compare" && s.compare && s.compareValues) {
      return {
        type: "compare",
        phase: "merge_compare",
        indices: s.compare,
        values: s.compareValues,
        result: s.takeSide === "left",
        ...common,
      };
    }

    if ((s.phase === "write" || s.phase === "copy") && s.writing >= 0) {
      return {
        type: "array_write",
        phase: s.phase === "copy" ? "merge_copy" : "merge_write",
        index: s.writing,
        ...common,
      };
    }

    return {
      type: "merge_split",
      phase: s.phase === "complete" ? "merge_complete" : s.phase === "start" ? "merge_start" : "merge_split",
      ...common,
    };
  };

  steps.forEach((s, i) => {
    const highlights: { index: number; role: string }[] = [];
    if (s.range[0] >= 0 && s.range[0] < s.array.length) {
      for (let j = s.range[0]; j <= s.range[1]; j++) highlights.push({ index: j, role: "range" });
    }
    if (s.leftRange) {
      for (let j = s.leftRange[0]; j <= s.leftRange[1]; j++) highlights.push({ index: j, role: "left-run" });
    }
    if (s.rightRange) {
      for (let j = s.rightRange[0]; j <= s.rightRange[1]; j++) highlights.push({ index: j, role: "right-run" });
    }
    s.compare?.forEach((index) => highlights.push({ index, role: "compare" }));
    if (s.writing >= 0) highlights.push({ index: s.writing, role: "writing" });
    const isFirst = i === 0;
    const isLast = i === steps.length - 1;
    b.step({
      line: lineFor(s, isFirst, isLast),
      event: eventFor(s, isFirst, isLast),
      description: s.description,
      variables: { comparisons: s.comparisons, writes: s.writes, arr: `[${s.array.join(", ")}]` },
      memory: [arrayMemory("arr", "arr", s.array, highlights)],
      visual: arrayVisual("arr"),
      changed: { variables: s.phase === "write" || s.phase === "copy" ? ["arr", "writes"] : ["comparisons"] },
      actions: [actionFor(s)],
    });
  });
  b.prompt({
    stepId: "step-002",
    type: "predict_variable",
    question: "After the first merge pass, which value lands at the very front of the merged run?",
    target: { variable: "arr[0]" },
    answer: String(Math.min(values[0], values[1])),
    choices: [String(Math.min(values[0], values[1])), String(Math.max(values[0], values[1])), String(values[0]), String(values[1])],
    explanation: `The first merge compares the two halves and takes the smaller leading value first.`,
  });
  return b.build();
}

function palindromeTrace(text: string, code: string): TraceDocument {
  const steps = palindromeSteps(text);
  const b = new TraceBuilder({
    title: "Palindrome Check",
    code,
    topic: "two pointers",
    difficulty: "beginner",
    language: detectLanguage(code),
    durationSeconds: 60,
  });
  steps.forEach((s, i) => {
    const highlights: { index: number; role: string }[] = [];
    s.chars.forEach((_, j) => {
      if (j === s.l || j === s.r) highlights.push({ index: j, role: s.status === "invalid" ? "swap" : "compare" });
      else if (j < s.l || j > s.r) highlights.push({ index: j, role: "sorted" });
    });
    b.step({
      line: i === 0 ? 1 : i === steps.length - 1 ? 6 : s.status === "ok" ? 3 : 4,
      event: i === 0 ? "program_start" : i === steps.length - 1 ? "program_end" : s.status === "invalid" ? "comparison" : "line_enter",
      description: s.description,
      variables: {
        l: s.l,
        r: s.r,
        left_char: s.chars[s.l] ?? "",
        right_char: s.chars[s.r] ?? "",
        comparisons: s.comparisons,
        result: s.status === "invalid" ? "false" : s.status === "done" ? "true" : "…",
      },
      memory: [arrayMemory("s", "s", s.chars, highlights)],
      visual: arrayVisual("s"),
      changed: { variables: ["l", "r", "left_char", "right_char", "comparisons"] },
      actions: [{
        type: "compare",
        indices: [s.l, s.r],
        values: [s.chars[s.l] ?? "", s.chars[s.r] ?? ""],
        result: s.status === "ok" || s.status === "done",
      }],
    });
  });
  return b.build();
}

function inorderTrace(tree: (number | null)[], code: string): TraceDocument {
  const steps = inorderSteps(tree);
  const b = new TraceBuilder({
    title: "Inorder Traversal",
    code,
    topic: "trees",
    difficulty: "intermediate",
    language: detectLanguage(code),
    durationSeconds: 90,
  });
  steps.forEach((s, i) => {
    const highlights: { index: number; role: string }[] = [];
    s.tree.forEach((v, j) => {
      if (v === undefined || v === null) return;
      if (s.visited.includes(j)) highlights.push({ index: j, role: "sorted" });
      else if (j === s.node) highlights.push({ index: j, role: "mid" });
      else highlights.push({ index: j, role: "default" });
    });
    const isFirst = i === 0;
    const isLast = i === steps.length - 1;
    b.step({
      line: isFirst ? 1 : isLast ? 8 : s.visited.includes(s.node) && steps[i - 1]?.node !== s.node ? 6 : 4,
      event: isFirst ? "program_start" : isLast ? "program_end" : "line_enter",
      description: s.description,
      variables: { result: `[${s.result.join(", ")}]`, visited: s.visited.length },
      memory: [
        arrayMemory("tree", "tree", s.tree, highlights),
        arrayMemory("result", "result", s.result, s.result.map((_, j) => ({ index: j, role: "sorted" }))),
      ],
      visual: arrayVisual("tree"),
      changed: { variables: ["result", "visited"] },
      actions: [{ type: "visit_node", index: s.node }],
    });
  });
  return b.build();
}

function twoSumTrace(values: number[], target: number, code: string): TraceDocument {
  const steps = twoSumSortedSteps(values, target);
  const b = new TraceBuilder({
    title: "Two Sum (Sorted)",
    code,
    topic: "two pointers",
    difficulty: "beginner",
    language: detectLanguage(code),
    durationSeconds: 60,
  });
  steps.forEach((s, i) => {
    const highlights: { index: number; role: string }[] = [];
    s.array.forEach((_, j) => {
      if (j === s.l || j === s.r) highlights.push({ index: j, role: s.status === "found" ? "swap" : "compare" });
      else highlights.push({ index: j, role: "default" });
    });
    const isFirst = i === 0;
    const isLast = i === steps.length - 1;
    b.step({
      line: isFirst ? 1 : isLast ? 9 : 5,
      event: isFirst ? "program_start" : isLast ? "program_end" : s.status === "found" ? "comparison" : "line_enter",
      description: s.description,
      variables: { target, l: s.l, r: s.r, sum: s.sum, probes: s.probes },
      memory: [arrayMemory("arr", "arr", s.array, highlights)],
      visual: arrayVisual("arr"),
      changed: { variables: ["l", "r", "sum", "probes"] },
      actions: [{
        type: s.description.includes("Move L") || s.description.includes("Move R") ? "pointer_move" : "compare",
        pointer: s.description.includes("Move L") ? "L" : s.description.includes("Move R") ? "R" : undefined,
        to: s.description.includes("Move L") || s.description.includes("Move R") ? (s.description.includes("Move L") ? s.l : s.r) : undefined,
        indices: [s.l, s.r],
        values: [s.array[s.l], s.array[s.r]],
        result: s.sum === s.target,
      }],
    });
  });
  return b.build();
}

function gridTraceGen(kind: "bfs-grid" | "dfs-grid", maze: MazeSpec, code: string): TraceDocument {
  const searchKind: SearchKind = kind === "bfs-grid" ? "bfs" : "dfs";
  const b = new TraceBuilder({
    title: kind === "bfs-grid" ? "BFS on a Grid" : "DFS on a Grid",
    code,
    topic: "graphs",
    difficulty: "intermediate",
    language: detectLanguage(code),
    durationSeconds: 120,
  });
  const steps = gridSearchSteps(maze, searchKind);
  steps.forEach((s, i) => {
    const highlights: Array<{ row: number; col: number; role: string }> = [];
    highlights.push({ row: maze.start[0], col: maze.start[1], role: "start" });
    highlights.push({ row: maze.goal[0], col: maze.goal[1], role: "goal" });
    maze.grid.forEach((row, r) => row.forEach((cell, c) => { if (cell === 1) highlights.push({ row: r, col: c, role: "wall" }); }));
    s.visited.forEach(([r, c]) => highlights.push({ row: r, col: c, role: "visited" }));
    s.frontier.forEach(([r, c]) => highlights.push({ row: r, col: c, role: "frontier" }));
    if (s.current) highlights.push({ row: s.current[0], col: s.current[1], role: "current" });
    s.path?.forEach(([r, c]) => highlights.push({ row: r, col: c, role: "path" }));
    const isFirst = i === 0;
    const isLast = i === steps.length - 1;
    b.step({
      line: isFirst ? 2 : isLast ? 4 : 6,
      event: isFirst ? "program_start" : isLast ? "program_end" : "line_enter",
      description: s.description,
      variables: { visited_count: s.visitedCount, frontier_size: s.frontier.length },
      memory: [gridMemory("grid", "grid", maze.grid, highlights)],
      visual: gridVisual("grid"),
      changed: { variables: ["visited_count", "frontier_size"] },
      actions: [{ type: kind, cell: s.current }],
    });
  });
  return b.build();
}

/* ------------------------------------------------------------------ */
/* Code templates + the input registry                                 */
/* ------------------------------------------------------------------ */

export function codeFor(kind: PlayableKind, config: PlayableConfig): string {
  const arr = config.array ?? [5, 2, 8, 1];
  const n = config.n ?? 5;
  const target = config.target ?? 7;
  const text = config.text ?? "racecar";
  switch (kind) {
    case "sum-array":
      return `arr = [${arr.join(", ")}]\ntotal = 0\nfor i in range(len(arr)):\n    total = total + arr[i]\nprint("Total:", total)`;
    case "max-array":
      return `arr = [${arr.join(", ")}]\nmax_val = arr[0]\nfor i in range(1, len(arr)):\n    if arr[i] > max_val:\n        max_val = arr[i]\nprint("Max:", max_val)`;
    case "factorial-loop":
      return `result = 1\nfor i in range(1, ${n} + 1):\n    result = result * i\nprint("Factorial:", result)`;
    case "factorial-recursion":
      return `def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)\n\nprint(fact(${n}))`;
    case "fibonacci-recursion":
      return `def fib(n):\n    if n <= 1:\n        return n\n    return fib(n - 1) + fib(n - 2)\n\nprint(fib(${n}))`;
    case "binary-search":
      return `arr = [${arr.join(", ")}]\ntarget = ${target}\nlow, high = 0, len(arr) - 1\nwhile low <= high:\n    mid = (low + high) // 2\n    if arr[mid] == target:\n        print("Found at", mid)\n        break\n    elif arr[mid] < target:\n        low = mid + 1\n    else:\n        high = mid - 1`;
    case "bubble-sort":
      return `arr = [${arr.join(", ")}]\nn = len(arr)\nfor i in range(n - 1):\n    for j in range(n - 1 - i):\n        if arr[j] > arr[j + 1]:\n            arr[j], arr[j + 1] = arr[j + 1], arr[j]\nprint(arr)`;
    case "selection-sort":
      return `arr = [${arr.join(", ")}]\nn = len(arr)\nfor i in range(n - 1):\n    min_idx = i\n    for j in range(i + 1, n):\n        if arr[j] < arr[min_idx]:\n            min_idx = j\n    arr[i], arr[min_idx] = arr[min_idx], arr[i]\nprint(arr)`;
    case "insertion-sort":
      return `arr = [${arr.join(", ")}]\nn = len(arr)\nfor i in range(1, n):\n    j = i\n    while j > 0 and arr[j - 1] > arr[j]:\n        arr[j], arr[j - 1] = arr[j - 1], arr[j]\n        j -= 1\nprint(arr)`;
    case "quick-sort":
      return `arr = [${arr.join(", ")}]\ndef partition(a, lo, hi):\n    pivot = a[hi]\n    i = lo\n    for j in range(lo, hi):\n        if a[j] < pivot:\n            a[i], a[j] = a[j], a[i]\n            i += 1\n    a[i], a[hi] = a[hi], a[i]\n    return i\nprint(arr)`;
    case "heap-sort":
      return `arr = [${arr.join(", ")}]\ndef heapify(a, n, i):\n    largest = i\n    l, r = 2 * i + 1, 2 * i + 2\n    if l < n and a[l] > a[largest]:\n        largest = l\n    if r < n and a[r] > a[largest]:\n        largest = r\n    if largest != i:\n        a[i], a[largest] = a[largest], a[i]\n        heapify(a, n, largest)\nprint(arr)`;
    case "merge-sort":
      return `arr = [${arr.join(", ")}]\ndef merge(a, lo, mid, hi):\n    tmp = []\n    i, j = lo, mid + 1\n    while i <= mid and j <= hi:\n        if a[i] <= a[j]:\n            tmp.append(a[i]); i += 1\n        else:\n            tmp.append(a[j]); j += 1\n    a[lo:hi + 1] = tmp\nprint(arr)`;
    case "palindrome":
      return `s = "${text}"\nl, r = 0, len(s) - 1\nwhile l < r:\n    if s[l] != s[r]:\n        print("Not a palindrome")\n        break\n    l += 1\n    r -= 1\nelse:\n    print("Palindrome!")`;
    case "inorder":
      return `# Tree stored heap-style: index i → children at 2i+1, 2i+2\ntree = [${arr.join(", ")}]\nresult = []\nstack = []\nnode = 0\nwhile stack or node < len(tree):\n    while node < len(tree):\n        stack.append(node)\n        node = 2 * node + 1\n    node = stack.pop()\n    result.append(tree[node])\n    node = 2 * node + 2\nprint("Inorder:", result)`;
    case "two-sum":
      return `arr = [${arr.join(", ")}]\ntarget = ${target}\nl, r = 0, len(arr) - 1\nwhile l < r:\n    s = arr[l] + arr[r]\n    if s == target:\n        print(l, r)\n        break\n    elif s < target:\n        l += 1\n    else:\n        r -= 1`;
    case "bfs-grid":
    case "dfs-grid":
      return `# ${kind === "bfs-grid" ? "BFS" : "DFS"} on a grid from (0,0) to goal\nqueue = [(0, 0)]\nvisited = {(0, 0)}\nwhile queue:\n    (r, c) = queue.pop(${kind === "bfs-grid" ? "0" : ""})\n    if (r, c) == goal:\n        print("Path found")\n        break\n    for (nr, nc) in neighbors((r, c)):\n        if (nr, nc) not in visited:\n            visited.add((nr, nc))\n            queue.append((nr, nc))`;
  }
}

/** The main entry point: kind + validated config → a full trace document. */
export function generateTrace(
  kind: PlayableKind,
  config: PlayableConfig,
  code?: string,
): TraceDocument {
  const values = config.array ?? [5, 2, 8, 1];
  const source = code ?? codeFor(kind, config);
  switch (kind) {
    case "sum-array":
      return sumArrayTrace(values, source);
    case "max-array":
      return maxArrayTrace(values, source);
    case "factorial-loop":
      return factorialLoopTrace(Math.min(config.n ?? 5, 12), source);
    case "factorial-recursion": {
      const n = Math.min(config.n ?? 4, 8);
      return buildRecursionTrace({
        title: "Factorial Recursion",
        code: source,
        topic: "recursion",
        difficulty: "beginner",
        language: "python",
        durationSeconds: 90,
        fnName: "fact",
        defLine: 1,
        baseLine: 2,
        baseReturnLine: 3,
        callLine: 4,
        printLine: 6,
        arg: n,
        baseCondition: () => "n <= 1",
        isBase: (m) => m <= 1,
        baseResult: () => 1,
        children: (m) => [m - 1],
        fn: (m) => {
          let r = 1;
          for (let i = 2; i <= m; i++) r *= i;
          return r;
        },
        describeReturn: (m, childValues, total) => `fact(${m}) = ${m} × ${childValues[0] ?? "?"} = ${total}`,
      });
    }
    case "fibonacci-recursion": {
      const n = Math.min(config.n ?? 5, 9);
      return buildRecursionTrace({
        title: "Fibonacci Recursion",
        code: source,
        topic: "recursion",
        difficulty: "intermediate",
        language: "python",
        durationSeconds: 120,
        fnName: "fib",
        defLine: 1,
        baseLine: 2,
        baseReturnLine: 3,
        callLine: 4,
        printLine: 6,
        arg: n,
        baseCondition: () => "n <= 1",
        isBase: (m) => m <= 1,
        baseResult: (m) => m,
        children: (m) => [m - 1, m - 2],
        fn: (m) => {
          const fib = (k: number): number => (k <= 1 ? k : fib(k - 1) + fib(k - 2));
          return fib(m);
        },
        describeReturn: (m, childValues, total) => `fib(${m}) = ${childValues[0]} + ${childValues[1]} = ${total}`,
      });
    }
    case "binary-search":
      return binarySearchTraceGen(values, config.target ?? values[Math.floor(values.length / 2)], source);
    case "bubble-sort":
      return sortTrace("bubble", values, source);
    case "selection-sort":
      return sortTrace("selection", values, source);
    case "insertion-sort":
      return sortTrace("insertion", values, source);
    case "quick-sort":
      return sortTrace("quick", values, source);
    case "heap-sort":
      return sortTrace("heap", values, source);
    case "merge-sort":
      return mergeTrace(values, source);
    case "palindrome":
      return palindromeTrace(config.text ?? "racecar", source);
    case "inorder":
      return inorderTrace((config.tree ?? values) as (number | null)[], source);
    case "two-sum":
      return twoSumTrace(values, config.target ?? 9, source);
    case "bfs-grid":
    case "dfs-grid": {
      const maze =
        config.maze ??
        (config.rows || config.cols
          ? buildRandomMaze(config.rows ?? 5, config.cols ?? 5, config.seed ?? 1)
          : {
              grid: [
                [0, 0, 0, 0, 0],
                [0, 1, 1, 1, 0],
                [0, 0, 0, 1, 0],
                [1, 1, 0, 0, 0],
                [0, 0, 0, 1, 0],
              ],
              start: [0, 0] as [number, number],
              goal: [4, 4] as [number, number],
            });
      return gridTraceGen(kind, maze, source);
    }
  }
}

/** Registry of playable kinds with their editable inputs (lab "Inputs" panel). */
export interface InputField {
  key: "array" | "n" | "target" | "text" | "tree" | "rows" | "cols" | "seed";
  label: string;
  default: unknown;
  help: string;
}

export const PLAYABLE_INPUTS: Partial<Record<PlayableKind, InputField[]>> = {
  "sum-array": [{ key: "array", label: "Numbers", default: [4, 7, 1, 9], help: "Comma-separated integers" }],
  "max-array": [{ key: "array", label: "Numbers", default: [3, 8, 2, 9, 5], help: "Comma-separated integers" }],
  "factorial-loop": [{ key: "n", label: "n", default: 5, help: "Compute n!" }],
  "factorial-recursion": [{ key: "n", label: "n", default: 4, help: "fact(n) — max 8" }],
  "fibonacci-recursion": [{ key: "n", label: "n", default: 5, help: "fib(n) — max 9" }],
  "binary-search": [
    { key: "array", label: "Sorted numbers", default: [1, 3, 5, 7, 9, 11], help: "Auto-sorted" },
    { key: "target", label: "Target", default: 7, help: "Value to find" },
  ],
  "bubble-sort": [{ key: "array", label: "Numbers", default: [5, 2, 8, 1], help: "Comma-separated integers" }],
  "selection-sort": [{ key: "array", label: "Numbers", default: [6, 3, 8, 2, 9], help: "Comma-separated integers" }],
  "insertion-sort": [{ key: "array", label: "Numbers", default: [5, 2, 8, 1], help: "Comma-separated integers" }],
  "quick-sort": [{ key: "array", label: "Numbers", default: [9, 3, 7, 1, 8, 2], help: "Comma-separated integers" }],
  "heap-sort": [{ key: "array", label: "Numbers", default: [4, 10, 3, 5, 1], help: "Comma-separated integers" }],
  "merge-sort": [{ key: "array", label: "Numbers", default: [8, 3, 5, 1, 9, 2], help: "Comma-separated integers" }],
  palindrome: [{ key: "text", label: "Word", default: "racecar", help: "Letters only" }],
  inorder: [{ key: "array", label: "Heap-layout tree", default: [8, 3, 10, 1, 6, 9, 14], help: "Index i → children 2i+1, 2i+2" }],
  "two-sum": [
    { key: "array", label: "Numbers", default: [2, 7, 11, 15], help: "Auto-sorted" },
    { key: "target", label: "Target", default: 9, help: "Pair sum to find" },
  ],
  "bfs-grid": [
    { key: "rows", label: "Rows", default: 5, help: "Grid height (2-9)" },
    { key: "cols", label: "Cols", default: 5, help: "Grid width (2-9)" },
    { key: "seed", label: "Seed", default: 1, help: "Wall layout seed" },
  ],
  "dfs-grid": [
    { key: "rows", label: "Rows", default: 5, help: "Grid height (2-9)" },
    { key: "cols", label: "Cols", default: 5, help: "Grid width (2-9)" },
    { key: "seed", label: "Seed", default: 1, help: "Wall layout seed" },
  ],
};
