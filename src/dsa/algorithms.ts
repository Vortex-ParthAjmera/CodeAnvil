export type SortAlgorithm = "Bubble Sort" | "Selection Sort" | "Insertion Sort";
export type TraversalMode = "BFS" | "DFS";

export interface SortFrame {
  id: string;
  values: number[];
  compared: number[];
  changed: number[];
  settled: number[];
  description: string;
  comparisons: number;
  changes: number;
  pass: number;
}

export interface TraversalFrame {
  id: string;
  visited: string[];
  frontier: string[];
  active: string | null;
  description: string;
}

export const graphNodes = ["A", "B", "C", "D", "E", "F"] as const;
export type GraphNode = (typeof graphNodes)[number];
export const graphEdges: ReadonlyArray<readonly [GraphNode, GraphNode]> = [
  ["A", "B"], ["A", "C"], ["B", "D"], ["B", "E"], ["C", "E"], ["C", "F"], ["E", "F"],
];
const adjacency: Record<GraphNode, GraphNode[]> = {
  A: ["B", "C"], B: ["A", "D", "E"], C: ["A", "E", "F"],
  D: ["B"], E: ["B", "C", "F"], F: ["C", "E"],
};

function addFrame(
  frames: SortFrame[], values: number[], description: string,
  comparisons: number, changes: number, pass: number,
  compared: number[] = [], changed: number[] = [], settled: number[] = [],
) {
  frames.push({
    id: `sort-${frames.length}`, values: [...values], compared: [...compared], changed: [...changed],
    settled: [...settled], description, comparisons, changes, pass,
  });
}

function bubbleFrames(input: number[]) {
  const values = [...input];
  const frames: SortFrame[] = [];
  let comparisons = 0;
  let changes = 0;
  addFrame(frames, values, "Ready to compare adjacent values from left to right.", 0, 0, 0);
  for (let pass = 0; pass < values.length - 1; pass += 1) {
    let changedInPass = false;
    for (let index = 0; index < values.length - pass - 1; index += 1) {
      const right = index + 1;
      comparisons += 1;
      addFrame(
        frames, values,
        `${values[index]} ${values[index] > values[right] ? ">" : "<="} ${values[right]}: ${values[index] > values[right] ? "swap them" : "keep their order"}.`,
        comparisons, changes, pass + 1, [index, right], [],
        Array.from({ length: pass }, (_, offset) => values.length - offset - 1),
      );
      if (values[index] > values[right]) {
        [values[index], values[right]] = [values[right], values[index]];
        changes += 1;
        changedInPass = true;
        addFrame(
          frames, values, `Swap complete; ${values[right]} moved toward the sorted tail.`,
          comparisons, changes, pass + 1, [], [index, right],
          Array.from({ length: pass }, (_, offset) => values.length - offset - 1),
        );
      }
    }
    if (!changedInPass) break;
  }
  addFrame(frames, values, "Every value is in nondecreasing order.", comparisons, changes,
    Math.max(1, values.length - 1), [], [], values.map((_, index) => index));
  return frames;
}

function selectionFrames(input: number[]) {
  const values = [...input];
  const frames: SortFrame[] = [];
  let comparisons = 0;
  let changes = 0;
  addFrame(frames, values, "Ready to select the smallest value for each position.", 0, 0, 0);
  for (let pass = 0; pass < values.length - 1; pass += 1) {
    let minimum = pass;
    for (let index = pass + 1; index < values.length; index += 1) {
      comparisons += 1;
      const smaller = values[index] < values[minimum];
      addFrame(
        frames, values,
        `Compare candidate ${values[index]} with minimum ${values[minimum]}${smaller ? "; update the minimum" : "; keep it"}.`,
        comparisons, changes, pass + 1, [minimum, index], [],
        Array.from({ length: pass }, (_, settled) => settled),
      );
      if (smaller) minimum = index;
    }
    if (minimum !== pass) {
      [values[pass], values[minimum]] = [values[minimum], values[pass]];
      changes += 1;
      addFrame(frames, values, `Place the smallest remaining value at index ${pass}.`, comparisons,
        changes, pass + 1, [], [pass, minimum], Array.from({ length: pass + 1 }, (_, item) => item));
    }
  }
  addFrame(frames, values, "Selection Sort is complete.", comparisons, changes,
    Math.max(0, values.length - 1), [], [], values.map((_, index) => index));
  return frames;
}

function insertionFrames(input: number[]) {
  const values = [...input];
  const frames: SortFrame[] = [];
  let comparisons = 0;
  let changes = 0;
  addFrame(frames, values, "The first value starts the sorted prefix.", 0, 0, 0, [], [], input.length ? [0] : []);
  for (let pass = 1; pass < values.length; pass += 1) {
    const key = values[pass];
    let index = pass - 1;
    while (index >= 0) {
      comparisons += 1;
      addFrame(frames, values, `Compare ${values[index]} with the key ${key}.`, comparisons, changes,
        pass, [index, index + 1], [], Array.from({ length: pass }, (_, item) => item));
      if (values[index] <= key) break;
      values[index + 1] = values[index];
      changes += 1;
      addFrame(frames, values, `Shift ${values[index]} right to make room for ${key}.`, comparisons,
        changes, pass, [], [index, index + 1], Array.from({ length: pass }, (_, item) => item));
      index -= 1;
    }
    values[index + 1] = key;
    changes += 1;
    addFrame(frames, values, `Insert ${key} at index ${index + 1}; the sorted prefix grows.`, comparisons,
      changes, pass, [], [index + 1], Array.from({ length: pass + 1 }, (_, item) => item));
  }
  addFrame(frames, values, "Insertion Sort is complete.", comparisons, changes,
    Math.max(0, values.length - 1), [], [], values.map((_, index) => index));
  return frames;
}

export function createSortFrames(input: number[], algorithm: SortAlgorithm): SortFrame[] {
  if (algorithm === "Selection Sort") return selectionFrames(input);
  if (algorithm === "Insertion Sort") return insertionFrames(input);
  return bubbleFrames(input);
}

export function createTraversalFrames(start: GraphNode, mode: TraversalMode): TraversalFrame[] {
  const seen = new Set<GraphNode>();
  const order: GraphNode[] = [];
  const frontier: GraphNode[] = [start];
  const frames: TraversalFrame[] = [{
    id: "graph-0", visited: [], frontier: [start], active: null,
    description: `${mode} starts with ${start} in the ${mode === "BFS" ? "queue" : "stack"}.`,
  }];
  while (frontier.length) {
    const node = mode === "BFS" ? frontier.shift()! : frontier.pop()!;
    if (seen.has(node)) continue;
    seen.add(node);
    order.push(node);
    const neighbors = [...adjacency[node]];
    if (mode === "DFS") neighbors.reverse();
    neighbors.forEach((neighbor) => {
      if (!seen.has(neighbor) && (mode === "DFS" || !frontier.includes(neighbor))) frontier.push(neighbor);
    });
    frames.push({
      id: `graph-${frames.length}`, visited: [...order], frontier: [...frontier], active: node,
      description: `Visit ${node}; ${mode === "BFS" ? "queue" : "stack"}: ${frontier.join(", ") || "empty"}.`,
    });
  }
  return frames;
}

export function makeDemoArray(size: number, seed: number): number[] {
  let state = Math.max(1, seed);
  return Array.from({ length: size }, () => {
    state = (state * 48271) % 2147483647;
    return (state % 9) + 1;
  });
}
