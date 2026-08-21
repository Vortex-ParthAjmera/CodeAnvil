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
  /** Prefix-sorted index for algorithms that lock values from the left. */
  sortedUpTo: number;
  /** Exact locked indices for algorithms like Bubble Sort that lock a suffix. */
  sortedIndices?: number[];
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
  const sortedTail = (locked: number) =>
    Array.from({ length: locked }, (_, index) => n - locked + index);

  steps.push({
    array: clone(a),
    sortedUpTo: -1,
    sortedIndices: [],
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
        sortedUpTo: -1,
        sortedIndices: sortedTail(i),
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
          sortedUpTo: -1,
          sortedIndices: sortedTail(i),
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
        sortedUpTo: n - 1,
        sortedIndices: sortedTail(n),
        description: `No swaps in this pass — the array is already sorted. Remaining elements settle in place.`,
        comparisons,
        swaps,
      });
      break;
    }

    steps.push({
      array: clone(a),
      sortedUpTo: -1,
      sortedIndices: sortedTail(i + 1),
      description: `Pass ${i + 1} complete — ${a[n - 1 - i]} is locked at index ${n - 1 - i}.`,
      comparisons,
      swaps,
    });
  }

  steps.push({
    array: clone(a),
    sortedUpTo: n - 1,
    sortedIndices: sortedTail(n),
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
  let lastMid: number | undefined;

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
    lastMid = mid;
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
        mid: lastMid,
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
        mid: lastMid,
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

/** Deterministic PRNG (mulberry32) so a seed always yields the same maze. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mazeConnected(grid: GridCell[][], start: [number, number], goal: [number, number]): boolean {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const seen = new Set<string>([`${start[0]},${start[1]}`]);
  const queue: [number, number][] = [start];
  while (queue.length > 0) {
    const [r, c] = queue.shift() as [number, number];
    if (r === goal[0] && c === goal[1]) return true;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 0 && !seen.has(`${nr},${nc}`)) {
        seen.add(`${nr},${nc}`);
        queue.push([nr, nc]);
      }
    }
  }
  return false;
}

/**
 * Builds a random maze of the requested size with a guaranteed start-to-goal
 * path. Wall placement is seeded (deterministic), and every attempt is
 * validated for connectivity before being returned.
 */
export function buildRandomMaze(rows: number, cols: number, seed = 1): MazeSpec {
  const r = Math.max(2, Math.min(9, Math.round(rows)));
  const c = Math.max(2, Math.min(9, Math.round(cols)));
  const start: [number, number] = [0, 0];
  const goal: [number, number] = [r - 1, c - 1];

  for (let attempt = 0; attempt < 16; attempt++) {
    const rand = mulberry32(seed * 2654435761 + attempt * 1013904223);
    const grid: GridCell[][] = Array.from({ length: r }, () =>
      Array.from({ length: c }, () => 0 as GridCell),
    );
    for (let row = 0; row < r; row++) {
      for (let col = 0; col < c; col++) {
        if ((row === 0 && col === 0) || (row === r - 1 && col === c - 1)) continue;
        if (rand() < 0.22) grid[row][col] = 1;
      }
    }
    if (mazeConnected(grid, start, goal)) return { grid, start, goal };
  }

  // Fallback: a fully open grid is always connected.
  const open: GridCell[][] = Array.from({ length: r }, () =>
    Array.from({ length: c }, () => 0 as GridCell),
  );
  return { grid: open, start, goal };
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
  const frontier: string[] = [key(start[0], start[1])];
  const cameFrom = new Map<string, string>();
  const goalKey = key(goal[0], goal[1]);

  const name = kind === "bfs" ? "BFS" : "DFS";
  const frontierName = kind === "bfs" ? "queue" : "stack";
  const popLabel = kind === "bfs" ? "front" : "top";

  const snapshot = (current?: [number, number], path?: [number, number][]) => ({
    grid: grid.map((row) => [...row]),
    current,
    frontier: frontier.map(parseKey),
    visited: [...visitedSet].map(parseKey),
    path,
    description: "",
    visitedCount: visitedSet.size,
  });

  steps.push({
    ...snapshot(start),
    description:
      name === "BFS"
        ? `BFS starts at (${start[0]}, ${start[1]}). The queue explores level by level, closest cells first.`
        : `DFS starts at (${start[0]}, ${start[1]}). The stack dives down one route before backtracking.`,
  });

  while (frontier.length > 0) {
    const curKey = kind === "bfs" ? frontier.shift()! : frontier.pop()!;
    const [r, c] = parseKey(curKey);

    if (curKey === goalKey) {
      const path = reconstructPath(cameFrom, goal);
      steps.push({
        ...snapshot([r, c], path),
        description: `Reached the goal at (${r}, ${c})! Path length: ${path.length - 1} steps.`,
      });
      return steps;
    }

    const undiscovered = neighbors(grid, r, c).filter(([nr, nc]) => !visitedSet.has(key(nr, nc)));
    steps.push({
      ...snapshot([r, c]),
      description:
        undiscovered.length === 0
          ? `Pop the ${popLabel} of the ${frontierName}: (${r}, ${c}). No new neighbors are open.`
          : `Pop the ${popLabel} of the ${frontierName}: (${r}, ${c}). Discover ${undiscovered.length} new neighbor${undiscovered.length === 1 ? "" : "s"}.`,
    });

    for (const [nr, nc] of undiscovered) {
      const nk = key(nr, nc);
      visitedSet.add(nk);
      cameFrom.set(nk, curKey);
      frontier.push(nk);
    }

    if (frontier.length > 0) {
      const nextKey = kind === "bfs" ? frontier[0] : frontier[frontier.length - 1];
      const [nr, nc] = parseKey(nextKey);
      steps.push({
        ...snapshot(),
        description:
          kind === "bfs"
            ? `Queue now holds ${frontier.length} frontier cell${frontier.length === 1 ? "" : "s"}; next out is the front cell (${nr}, ${nc}).`
            : `Stack now holds ${frontier.length} frontier cell${frontier.length === 1 ? "" : "s"}; next out is the top cell (${nr}, ${nc}).`,
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
