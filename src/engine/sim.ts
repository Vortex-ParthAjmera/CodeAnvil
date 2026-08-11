/**
 * Step-recording algorithm simulators (docs/02 — DSA Visual Battle Arena).
 *
 * These run OUR OWN algorithms (never user code) and record every operation
 * as a step the UI can replay. They feed both the Arena screen and the
 * universal code visualizer's trace generation.
 */

/* ------------------------------------------------------------------ */
/* Sorting                                                             */
/* ------------------------------------------------------------------ */

export type SortKind = "bubble" | "selection" | "insertion";

export interface SortStep {
  array: number[];
  /** Indices currently being compared. */
  compare?: [number, number];
  /** Indices just swapped. */
  swap?: [number, number];
  /** Everything below this index is sorted. */
  sortedUpTo: number;
  /** The element being inserted (insertion sort). */
  key?: number;
  description: string;
  comparisons: number;
  swaps: number;
}

function clone(a: number[]): number[] {
  return [...a];
}

export function bubbleSortSteps(input: number[]): SortStep[] {
  const a = clone(input);
  const steps: SortStep[] = [];
  let comparisons = 0;
  let swaps = 0;
  const n = a.length;

  steps.push({
    array: clone(a),
    sortedUpTo: -1,
    description: `Bubble sort starts with ${n} elements. Pass by pass, the largest remaining value "bubbles" to the end.`,
    comparisons,
    swaps,
  });

  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      comparisons++;
      steps.push({
        array: clone(a),
        compare: [j, j + 1],
        sortedUpTo: n - 1 - i,
        description: `Compare a[${j}] = ${a[j]} with a[${j + 1}] = ${a[j + 1]}.`,
        comparisons,
        swaps,
      });
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swaps++;
        steps.push({
          array: clone(a),
          swap: [j, j + 1],
          sortedUpTo: n - 1 - i,
          description: `${a[j + 1]} > ${a[j]}, so swap them.`,
          comparisons,
          swaps,
        });
        swapped = true;
      }
    }
    if (!swapped) {
      steps.push({
        array: clone(a),
        sortedUpTo: n - 1 - i,
        description: `No swaps in this pass — the array is already sorted. Remaining elements settle in place.`,
        comparisons,
        swaps,
      });
      break;
    }
  }

  steps.push({
    array: clone(a),
    sortedUpTo: n - 1,
    description: `Sorted! ${comparisons} comparisons and ${swaps} swaps.`,
    comparisons,
    swaps,
  });
  return steps;
}

export function selectionSortSteps(input: number[]): SortStep[] {
  const a = clone(input);
  const steps: SortStep[] = [];
  let comparisons = 0;
  let swaps = 0;
  const n = a.length;

  steps.push({
    array: clone(a),
    sortedUpTo: -1,
    description: `Selection sort finds the smallest remaining element and swaps it into place, one position at a time.`,
    comparisons,
    swaps,
  });

  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    for (let j = i + 1; j < n; j++) {
      comparisons++;
      steps.push({
        array: clone(a),
        compare: [j, minIdx],
        sortedUpTo: i - 1,
        description: `Compare a[${j}] = ${a[j]} with current minimum a[${minIdx}] = ${a[minIdx]}.`,
        comparisons,
        swaps,
      });
      if (a[j] < a[minIdx]) {
        minIdx = j;
        steps.push({
          array: clone(a),
          compare: [j, minIdx],
          sortedUpTo: i - 1,
          description: `${a[j]} is smaller — new minimum at index ${j}.`,
          comparisons,
          swaps,
        });
      }
    }
    if (minIdx !== i) {
      [a[i], a[minIdx]] = [a[minIdx], a[i]];
      swaps++;
      steps.push({
        array: clone(a),
        swap: [i, minIdx],
        sortedUpTo: i,
        description: `Place the minimum ${a[i]} at position ${i}.`,
        comparisons,
        swaps,
      });
    } else {
      steps.push({
        array: clone(a),
        sortedUpTo: i,
        description: `a[${i}] = ${a[i]} is already the minimum — it stays put.`,
        comparisons,
        swaps,
      });
    }
  }

  steps.push({
    array: clone(a),
    sortedUpTo: n - 1,
    description: `Sorted! ${comparisons} comparisons and ${swaps} swaps.`,
    comparisons,
    swaps,
  });
  return steps;
}

export function insertionSortSteps(input: number[]): SortStep[] {
  const a = clone(input);
  const steps: SortStep[] = [];
  let comparisons = 0;
  let swaps = 0;
  const n = a.length;

  steps.push({
    array: clone(a),
    sortedUpTo: 0,
    description: `Insertion sort grows a sorted prefix: each new element is inserted into its correct spot, like sorting cards in a hand.`,
    comparisons,
    swaps,
  });

  for (let i = 1; i < n; i++) {
    const key = a[i];
    let j = i;
    steps.push({
      array: clone(a),
      key: j,
      sortedUpTo: i - 1,
      description: `Take a[${i}] = ${key} as the key to insert into the sorted prefix.`,
      comparisons,
      swaps,
    });
    // Bubble the key leftward with adjacent swaps — each recorded move is a
    // real, replayable operation (the classic insertion-sort animation).
    while (j > 0 && a[j - 1] > a[j]) {
      comparisons++;
      const left = a[j - 1];
      const right = a[j];
      [a[j - 1], a[j]] = [a[j], a[j - 1]];
      swaps++;
      steps.push({
        array: clone(a),
        compare: [j - 1, j],
        swap: [j - 1, j],
        key: j - 1,
        sortedUpTo: i - 1,
        description: `${left} > ${right}, so swap them — ${right} moves one step left.`,
        comparisons,
        swaps,
      });
      j--;
    }
    steps.push({
      array: clone(a),
      key: j,
      sortedUpTo: i,
      description: `${a[j]} has settled at index ${j}. Sorted prefix is now length ${i + 1}.`,
      comparisons,
      swaps,
    });
  }

  steps.push({
    array: clone(a),
    sortedUpTo: n - 1,
    description: `Sorted! ${comparisons} comparisons and ${swaps} shifts.`,
    comparisons,
    swaps,
  });
  return steps;
}

export const SORT_ALGORITHMS: Record<SortKind, (a: number[]) => SortStep[]> = {
  bubble: bubbleSortSteps,
  selection: selectionSortSteps,
  insertion: insertionSortSteps,
};

/* ------------------------------------------------------------------ */
/* Binary search                                                       */
/* ------------------------------------------------------------------ */

export interface SearchStep {
  array: number[];
  low: number;
  high: number;
  mid?: number;
  status: "probe" | "found" | "not-found";
  description: string;
  probes: number;
}

export function binarySearchSteps(input: number[], target: number): SearchStep[] {
  const a = clone(input).sort((x, y) => x - y);
  const steps: SearchStep[] = [];
  let low = 0;
  let high = a.length - 1;
  let probes = 0;

  steps.push({
    array: clone(a),
    low,
    high,
    status: "probe",
    description: `Binary search for ${target} in a sorted list of ${a.length} elements. Range: indices [${low}..${high}].`,
    probes,
  });

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    probes++;
    steps.push({
      array: clone(a),
      low,
      high,
      mid,
      status: "probe",
      description: `Probe mid = (${low} + ${high}) // 2 = ${mid} → a[${mid}] = ${a[mid]}.`,
      probes,
    });
    if (a[mid] === target) {
      steps.push({
        array: clone(a),
        low,
        high,
        mid,
        status: "found",
        description: `${a[mid]} == ${target} — found at index ${mid} after ${probes} probe${probes === 1 ? "" : "s"}.`,
        probes,
      });
      return steps;
    }
    if (a[mid] < target) {
      low = mid + 1;
      steps.push({
        array: clone(a),
        low,
        high,
        status: "probe",
        description: `${a[mid]} < ${target} — discard the left half. New range [${low}..${high}].`,
        probes,
      });
    } else {
      high = mid - 1;
      steps.push({
        array: clone(a),
        low,
        high,
        status: "probe",
        description: `${a[mid]} > ${target} — discard the right half. New range [${low}..${high}].`,
        probes,
      });
    }
  }

  steps.push({
    array: clone(a),
    low,
    high,
    status: "not-found",
    description: `Range collapsed (${low} > ${high}). ${target} is not in the list — ${probes} probes total.`,
    probes,
  });
  return steps;
}

/* ------------------------------------------------------------------ */
/* Grid search (BFS / DFS)                                             */
/* ------------------------------------------------------------------ */

export type GridCell = 0 | 1; // 0 = walkable, 1 = wall
export type SearchKind = "bfs" | "dfs";

export interface GridStep {
  grid: GridCell[][];
  /** Cell being expanded this step. */
  current?: [number, number];
  frontier: [number, number][];
  visited: [number, number][];
  path?: [number, number][];
  description: string;
  visitedCount: number;
}

export interface MazeSpec {
  grid: GridCell[][];
  start: [number, number];
  goal: [number, number];
}

const key = (r: number, c: number) => `${r},${c}`;
const parseKey = (k: string): [number, number] => {
  const [r, c] = k.split(",").map(Number);
  return [r, c];
};

const NEIGHBORS: [number, number][] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];

function neighbors(grid: GridCell[][], r: number, c: number): [number, number][] {
  const out: [number, number][] = [];
  for (const [dr, dc] of NEIGHBORS) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length && grid[nr][nc] === 0) {
      out.push([nr, nc]);
    }
  }
  return out;
}

function reconstructPath(
  cameFrom: Map<string, string>,
  goal: [number, number],
): [number, number][] {
  const path: [number, number][] = [goal];
  let cur = key(goal[0], goal[1]);
  while (cameFrom.has(cur)) {
    cur = cameFrom.get(cur)!;
    path.push(parseKey(cur));
  }
  path.reverse();
  return path;
}

export function gridSearchSteps(
  spec: MazeSpec,
  kind: SearchKind,
): GridStep[] {
  const { grid, start, goal } = spec;
  const steps: GridStep[] = [];
  const visitedSet = new Set<string>([key(start[0], start[1])]);
  const frontierOrder: string[] = [key(start[0], start[1])];
  const cameFrom = new Map<string, string>();
  const goalKey = key(goal[0], goal[1]);

  const name = kind === "bfs" ? "BFS" : "DFS";
  const frontierName = kind === "bfs" ? "queue" : "stack";

  const snapshot = (current?: [number, number], path?: [number, number][]) => ({
    grid: grid.map((row) => [...row]),
    current,
    frontier: frontierOrder.map(parseKey),
    visited: [...visitedSet].map(parseKey),
    path,
    description: "",
    visitedCount: visitedSet.size,
  });

  steps.push({
    ...snapshot(start),
    description: `${name} starts at (${start[0]}, ${start[1]}). ${name === "BFS" ? "A queue explores level by level (closest cells first)." : "A stack dives deep down one path before backtracking."}`,
  });

  let head = 0;
  while (head < frontierOrder.length) {
    const curKey = frontierOrder[head];
    head++;
    const [r, c] = parseKey(curKey);

    if (curKey === goalKey) {
      const path = reconstructPath(cameFrom, goal);
      steps.push({
        ...snapshot([r, c], path),
        description: `Reached the goal at (${r}, ${c})! Path length: ${path.length - 1} steps.`,
      });
      return steps;
    }

    const nbs = neighbors(grid, r, c);
    steps.push({
      ...snapshot([r, c]),
      description: `Dequeue ${name === "BFS" ? "front" : "top"} of ${frontierName}: (${r}, ${c}). Discover ${nbs.filter(([nr, nc]) => !visitedSet.has(key(nr, nc))).length} new neighbor${nbs.length === 1 ? "" : "s"}.`,
    });

    for (const [nr, nc] of nbs) {
      const nk = key(nr, nc);
      if (visitedSet.has(nk)) continue;
      visitedSet.add(nk);
      cameFrom.set(nk, curKey);
      frontierOrder.push(nk);
    }

    if (head < frontierOrder.length) {
      steps.push({
        ...snapshot(),
        description: `${frontierName} now holds ${frontierOrder.length - head} frontier cell${frontierOrder.length - head === 1 ? "" : "s"}.`,
      });
    }
  }

  steps.push({
    ...snapshot(),
    description: `Frontier exhausted — the goal is unreachable. ${visitedSet.size} cells explored.`,
  });
  return steps;
}

/* ------------------------------------------------------------------ */
/* Grid generation (random + presets)                                  */
/* ------------------------------------------------------------------ */

export function emptyGrid(rows: number, cols: number): GridCell[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(0) as GridCell[]);
}

export function randomGrid(
  rows: number,
  cols: number,
  wallDensity = 0.28,
  seed?: number,
): GridCell[][] {
  // Deterministic PRNG so "random" mazes are reproducible when seeded.
  let s = seed ?? Date.now();
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const grid = emptyGrid(rows, cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rand() < wallDensity) grid[r][c] = 1;
    }
  }
  // Keep start and goal open.
  grid[0][0] = 0;
  grid[rows - 1][cols - 1] = 0;
  return grid;
}

/** A spiral-ish maze preset that gives both algorithms a fair run. */
export function spiralGrid(rows: number, cols: number): GridCell[][] {
  const grid = emptyGrid(rows, cols);
  const wall = (r: number, c: number) => {
    if (r >= 0 && r < rows && c >= 0 && c < cols) grid[r][c] = 1;
  };
  for (let ring = 0; ring < Math.min(rows, cols) / 2; ring++) {
    const top = ring;
    const bottom = rows - 1 - ring;
    const left = ring;
    const right = cols - 1 - ring;
    for (let c = left; c <= right; c++) wall(top, c);
    for (let r = top; r <= bottom; r++) wall(r, right);
    if (ring % 2 === 0) {
      for (let c = left; c <= right; c++) wall(bottom, c);
    } else {
      for (let r = top; r <= bottom; r++) wall(r, left);
    }
  }
  // Carve a guaranteed L-shaped corridor: down column 1, then along the
  // bottom row — both algorithms always have a reachable goal.
  for (let r = 0; r < rows; r++) grid[r][1] = 0;
  for (let c = 0; c < cols; c++) grid[rows - 1][c] = 0;
  grid[0][0] = 0;
  grid[rows - 1][cols - 1] = 0;
  return grid;
}
