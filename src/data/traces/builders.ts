/**
 * Helpers for authoring trace documents (docs/16-trace-format.md).
 *
 * The MVP ships with hand-authored traces for curated examples. These builders
 * keep the authoring compact while producing schema-conformant trace JSON.
 */
import type {
  Difficulty,
  MemoryItem,
  PracticePrompt,
  RecursionTreeEdge,
  RecursionTreeNode,
  StackFrame,
  TraceAction,
  TraceDocument,
  TraceEvent,
  TraceStep,
  VisualPayload,
} from "../../types/trace";
import {
  gridSearchSteps,
  type GridCell,
  type GridStep,
  type MazeSpec,
  type SearchKind,
  type SortStep,
} from "../../engine/sim";

export interface TraceSpec {
  title: string;
  code: string;
  topic: string;
  difficulty: Difficulty;
  entrypoint?: string;
  language?: string;
  durationSeconds?: number;
}

export interface StepInput {
  line: number;
  event: TraceEvent | string;
  description: string;
  variables: Record<string, unknown>;
  stack?: StackFrame[];
  output?: string;
  memory?: MemoryItem[];
  visual?: VisualPayload;
  changed?: TraceStep["changed"];
  actions?: TraceAction[];
}

export class TraceBuilder {
  readonly steps: TraceStep[] = [];
  readonly practice: PracticePrompt[] = [];

  constructor(private spec: TraceSpec) {}

  step(input: StepInput): TraceStep {
    const index = this.steps.length;
    const step: TraceStep = {
      id: `step-${String(index).padStart(3, "0")}`,
      index,
      line: input.line,
      event: input.event,
      description: input.description,
      variables: input.variables,
      stack: input.stack ?? [],
      output: input.output ?? "",
      memory: input.memory,
      visual: input.visual,
      changed: input.changed,
      actions: input.actions,
    };
    this.steps.push(step);
    return step;
  }

  prompt(input: Omit<PracticePrompt, "id">): PracticePrompt {
    const p: PracticePrompt = {
      ...input,
      id: `practice-${String(this.practice.length + 1).padStart(3, "0")}`,
    };
    this.practice.push(p);
    return p;
  }

  build(): TraceDocument {
    return {
      schemaVersion: "1.0.0",
      language: this.spec.language ?? "python",
      title: this.spec.title,
      source: { code: this.spec.code, entrypoint: this.spec.entrypoint ?? "main" },
      metadata: {
        topic: this.spec.topic,
        difficulty: this.spec.difficulty,
        estimatedDurationSeconds: this.spec.durationSeconds ?? 60,
      },
      steps: this.steps,
      practice: this.practice,
    };
  }
}

/** A convenience helper for a "current index highlighted" array memory item. */
export function arrayMemory(
  id: string,
  label: string,
  value: unknown[],
  highlights: { index: number; role: string }[] = [],
): MemoryItem {
  return { id, label, type: "array", value, highlights };
}

export function arrayVisual(itemId: string): VisualPayload {
  return { type: "array", itemId };
}

export function gridMemory(
  id: string,
  label: string,
  grid: GridCell[][],
  highlights: Array<{ row: number; col: number; role: string }> = [],
): MemoryItem {
  return {
    id,
    label,
    type: "grid",
    value: grid as unknown[],
    highlights: highlights as MemoryItem["highlights"],
  };
}

export function gridVisual(itemId: string): VisualPayload {
  return { type: "grid", itemId };
}

/* ------------------------------------------------------------------ */
/* Sort trace builder (drives bubble sort example + generated traces)  */
/* ------------------------------------------------------------------ */

export interface SortTraceSpec extends TraceSpec {
  /** Line numbers in `code` for each kind of step. */
  lines: {
    setup: number;
    compare: number;
    swap: number;
    settled: number;
    done: number;
  };
}

/** Converts recorded sort steps (docs/02 — sorting visualizer) into a trace. */
export function buildSortTrace(spec: SortTraceSpec, steps: SortStep[]): TraceDocument {
  const b = new TraceBuilder(spec);

  const memoryFor = (s: SortStep): MemoryItem[] => {
    const highlights = [];
    if (s.compare) highlights.push({ index: s.compare[0], role: "compare" });
    if (s.compare) highlights.push({ index: s.compare[1], role: "compare" });
    if (s.swap) highlights.push({ index: s.swap[0], role: "swap" });
    if (s.swap) highlights.push({ index: s.swap[1], role: "swap" });
    if (s.sortedUpTo >= 0) {
      for (let i = 0; i <= s.sortedUpTo; i++) highlights.push({ index: i, role: "sorted" });
    }
    if (s.key !== undefined) highlights.push({ index: s.key, role: "key" });
    return [arrayMemory("arr", "arr", s.array, highlights)];
  };

  const vars = (s: SortStep) => ({
    arr: s.array.map(String).join(", "),
    comparisons: s.comparisons,
    swaps: s.swaps,
  });

  steps.forEach((s, i) => {
    const isFirst = i === 0;
    const isLast = i === steps.length - 1;
    let line = spec.lines.compare;
    let event: string = "comparison";
    if (isFirst) {
      line = spec.lines.setup;
      event = "program_start";
    } else if (isLast) {
      line = spec.lines.done;
      event = "program_end";
    } else if (s.swap) {
      line = spec.lines.swap;
      event = "swap";
    } else if (s.description.startsWith("No swaps") || s.description.startsWith("a[")) {
      line = spec.lines.settled;
      event = "line_enter";
    }
    b.step({
      line,
      event,
      description: s.description,
      variables: vars(s),
      memory: memoryFor(s),
      visual: arrayVisual("arr"),
      changed: {
        variables: s.swap ? ["arr", "swaps"] : s.compare ? ["comparisons"] : [],
      },
      actions: [
        s.swap
          ? { type: "swap", indices: s.swap }
          : { type: "compare", indices: s.compare },
      ],
    });
  });

  return b.build();
}

/* ------------------------------------------------------------------ */
/* Grid trace builder (BFS / DFS examples + generated traces)          */
/* ------------------------------------------------------------------ */

export interface GridTraceSpec extends Omit<TraceSpec, "code"> {
  kind: SearchKind;
}

const GRID_CODE = `# Search the grid from (0,0) to (4,4)
queue = [(0, 0)]
visited = {(0, 0)}
while queue:
    (r, c) = queue.pop(0)
    if (r, c) == goal:
        print("Path found:")
        break
    for (nr, nc) in neighbors((r, c)):
        if (nr, nc) not in visited:
            visited.add((nr, nc))
            queue.append((nr, nc))`;

const DFS_CODE = GRID_CODE.replace("queue.pop(0)", "queue.pop()");

function gridMemoryForStep(step: GridStep, maze: MazeSpec): MemoryItem {
  const highlights: Array<{ row: number; col: number; role: string }> = [];
  highlights.push({ row: maze.start[0], col: maze.start[1], role: "start" });
  highlights.push({ row: maze.goal[0], col: maze.goal[1], role: "goal" });
  maze.grid.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === 1) highlights.push({ row: r, col: c, role: "wall" });
    }),
  );
  step.visited.forEach(([r, c]) => highlights.push({ row: r, col: c, role: "visited" }));
  step.frontier.forEach(([r, c]) => highlights.push({ row: r, col: c, role: "frontier" }));
  if (step.current) {
    highlights.push({ row: step.current[0], col: step.current[1], role: "current" });
  }
  step.path?.forEach(([r, c]) => highlights.push({ row: r, col: c, role: "path" }));
  return gridMemory("grid", "grid", maze.grid, highlights);
}

/**
 * Converts recorded BFS/DFS steps into a trace document. The pop line differs
 * between BFS (queue.pop(0) — FIFO) and DFS (queue.pop() — LIFO).
 */
export function buildGridTrace(spec: GridTraceSpec, maze: MazeSpec): TraceDocument {
  const b = new TraceBuilder({
    ...spec,
    code: spec.kind === "bfs" ? GRID_CODE : DFS_CODE,
  });
  const steps = gridSearchSteps(maze, spec.kind);
  const name = spec.kind === "bfs" ? "BFS" : "DFS";
  const popLine = spec.kind === "bfs" ? 5 : 5;

  steps.forEach((s, i) => {
    let line: number;
    let event: string;
    if (i === 0) {
      line = 2;
      event = "program_start";
    } else if (s.path) {
      line = 6;
      event = "path_found";
    } else if (s.current) {
      line = popLine;
      event = spec.kind === "bfs" ? "grid_dequeue" : "grid_pop";
    } else if (i === steps.length - 1) {
      line = 4;
      event = "grid_exhausted";
    } else {
      line = 9;
      event = "grid_discover";
    }
    b.step({
      line,
      event,
      description: s.description,
      variables: {
        visited_count: s.visitedCount,
        frontier_size: s.frontier.length,
      },
      memory: [gridMemoryForStep(s, maze)],
      visual: gridVisual("grid"),
      changed: { variables: ["visited_count", "frontier_size"] },
      actions: [
        s.current
          ? { type: "visit", cell: s.current }
          : s.path
            ? { type: "path_found", length: s.path.length - 1 }
            : { type: "expand_frontier" },
      ],
    });
  });

  const goal = maze.goal;
  b.prompt({
    stepId: "step-002",
    type: "predict_next_line",
    question: `After ${name} visits (${maze.start[0]}, ${maze.start[1]}), which cell does it explore next?`,
    target: { nextCell: "(0, 1)" },
    answer: "(0, 1)",
    choices: ["(0, 1)", "(1, 0)", "(0, 0)", "(2, 0)"],
    explanation: `${name} explores the first walkable neighbor of (0,0), which is (0,1).`,
  });

  b.prompt({
    stepId: `step-${String(steps.length - 1).padStart(3, "0")}`,
    type: "predict_condition",
    question: `Does ${name} reach the goal at (${goal[0]}, ${goal[1]})?`,
    target: { reached: "yes" },
    answer: "yes",
    choices: ["yes", "no"],
    explanation: `The grid has an open corridor from (0,0) to (${goal[0]}, ${goal[1]}), so ${name} finds a path.`,
  });

  return b.build();
}

/* ------------------------------------------------------------------ */
/* Recursion trace simulator                                           */
/* ------------------------------------------------------------------ */

export interface RecursionSpec extends TraceSpec {
  fnName: string;
  /** Line of `def fn(n):` */
  defLine: number;
  /** Line of the base-check (`if n == 0:`) */
  baseLine: number;
  /** Line of the base-case `return` */
  baseReturnLine: number;
  /** Line where the recursive call appears in the body */
  callLine: number;
  /** Line of the top-level `print(fn(arg))` */
  printLine: number;
  /** Root argument */
  arg: number;
  /** Human text of the base condition, e.g. (n) => `n == 0` */
  baseCondition: (n: number) => string;
  /** True when n is a base case */
  isBase: (n: number) => boolean;
  /** Value returned for a base case */
  baseResult: (n: number) => number;
  /** Ordered child arguments for a non-base call, e.g. (n) => [n - 1] */
  children: (n: number) => number[];
  /** Pure function used to compute return values */
  fn: (n: number) => number;
  /** Description for the return step, e.g. (n, parts, total) => ... */
  describeReturn: (n: number, childValues: number[], total: number) => string;
}

/**
 * Simulates a pure recursive function and emits a full trace document with
 * stack snapshots and a growing recursion tree (the CodeAnvil jaw-drop).
 */
export function buildRecursionTrace(spec: RecursionSpec): TraceDocument {
  const b = new TraceBuilder(spec);
  const nodes: RecursionTreeNode[] = [];
  const edges: RecursionTreeEdge[] = [];
  const nodeById = new Map<string, RecursionTreeNode>();
  const returned = new Map<string, number>();
  const frames: { id: string; n: number }[] = [];

  let seq = 0;
  let currentLine = spec.defLine;

  const stackSnapshot = (): StackFrame[] =>
    frames.map((f, i) => ({
      id: f.id,
      name: spec.fnName,
      line: i === 0 ? currentLine : spec.callLine,
      locals: { n: f.n },
      returnTo: i === 0 ? undefined : spec.callLine,
    }));

  const treeSnapshot = (): RecursionTreeNode[] =>
    nodes.map((node) => {
      const isActive = frames.length > 0 && frames[0].id === node.id;
      const hasReturned = returned.has(node.id);
      return {
        ...node,
        status: hasReturned ? "returned" : isActive ? "active" : "waiting",
        returnValue: hasReturned ? returned.get(node.id) : undefined,
      };
    });

  const emit = (input: StepInput) =>
    b.step({
      ...input,
      stack: stackSnapshot(),
      visual: {
        type: "recursion_tree",
        nodes: treeSnapshot(),
        edges: [...edges],
        activeNodeId: frames[0]?.id ?? null,
      },
    });

  b.step({
    line: spec.defLine,
    event: "program_start",
    description: `Define ${spec.fnName} and prepare to run.`,
    variables: {},
    stack: [],
    visual: { type: "recursion_tree", nodes: [], edges: [], activeNodeId: null },
  });

  function walk(n: number, parentId: string | null, isRoot: boolean): number {
    const id = `call-${++seq}`;
    const depth = parentId ? (nodeById.get(parentId)?.depth ?? 0) + 1 : 0;
    const node: RecursionTreeNode = {
      id,
      label: `${spec.fnName}(${n})`,
      parentId,
      depth,
      status: "active",
    };
    nodeById.set(id, node);
    nodes.push(node);
    if (parentId) edges.push({ from: parentId, to: id });
    frames.unshift({ id, n });

    currentLine = isRoot ? spec.printLine : spec.callLine;
    emit({
      line: currentLine,
      event: isRoot ? "function_call" : "recursion_call",
      description: isRoot
        ? `Call ${spec.fnName} with n = ${n}`
        : `Call ${spec.fnName}(${n})`,
      variables: {},
      changed: { stack: [id] },
      actions: [{ type: "function_call", target: spec.fnName, args: { n } }],
    });

    currentLine = spec.baseLine;
    const base = spec.isBase(n);
    emit({
      line: currentLine,
      event: "condition_check",
      description: `Check ${spec.baseCondition(n)} → ${
        base ? "yes, base case reached" : "no, keep recursing"
      }`,
      variables: {},
      changed: { stack: [] },
      actions: [{ type: "condition_check", condition: spec.baseCondition(n), result: base }],
    });

    if (base) {
      const value = spec.baseResult(n);
      returned.set(id, value);
      frames.shift();
      currentLine = spec.baseReturnLine;
      emit({
        line: currentLine,
        event: "function_return",
        description: `Return ${value}`,
        variables: {},
        changed: { stack: [id] },
        actions: [{ type: "function_return", target: spec.fnName, value }],
      });
      return value;
    }

    const childValues: number[] = [];
    for (const child of spec.children(n)) {
      currentLine = spec.callLine;
      childValues.push(walk(child, id, false));
    }

    const total = spec.fn(n);
    returned.set(id, total);
    frames.shift();
    currentLine = spec.callLine;
    emit({
      line: currentLine,
      event: "function_return",
      description: spec.describeReturn(n, childValues, total),
      variables: {},
      changed: { stack: [id] },
      actions: [{ type: "function_return", target: spec.fnName, value: total }],
    });
    return total;
  }

  walk(spec.arg, null, true);

  currentLine = spec.printLine;
  const outputValue = spec.fn(spec.arg);
  b.step({
    line: currentLine,
    event: "output_write",
    description: `print(${spec.fnName}(${spec.arg})) outputs ${outputValue}`,
    variables: {},
    output: String(outputValue),
    stack: stackSnapshot(),
    visual: {
      type: "recursion_tree",
      nodes: treeSnapshot(),
      edges: [...edges],
      activeNodeId: null,
    },
    changed: { output: true },
    actions: [{ type: "output_write", value: outputValue }],
  });

  b.step({
    line: currentLine,
    event: "program_end",
    description: "Program finished.",
    variables: {},
    output: String(outputValue),
    stack: stackSnapshot(),
    visual: {
      type: "recursion_tree",
      nodes: treeSnapshot(),
      edges: [...edges],
      activeNodeId: null,
    },
  });

  return b.build();
}
