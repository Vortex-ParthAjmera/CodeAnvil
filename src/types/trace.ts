/**
 * Trace Format — the core data contract of CodeAnvil (see docs/codeanvil-docs/16-trace-format.md).
 *
 * A trace describes code execution as a sequence of visual steps that the
 * frontend can replay WITHOUT executing unsafe user code.
 */

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type TraceEvent =
  | "program_start"
  | "line_enter"
  | "assignment"
  | "condition_check"
  | "loop_start"
  | "loop_iteration"
  | "function_call"
  | "function_return"
  | "recursion_call"
  | "array_read"
  | "array_write"
  | "comparison"
  | "swap"
  | "output_write"
  | "error"
  | "program_end";

/** A single active call-stack frame. */
export interface StackFrame {
  id: string;
  name: string;
  line: number;
  locals: Record<string, unknown>;
  returnTo?: number;
}

/** A visual memory item (array, box, list...) shown in the Memory panel. */
export interface MemoryHighlight {
  index: number;
  role: string;
}

/** A highlighted cell inside a 2D grid memory item (BFS/DFS arena). */
export interface GridHighlight {
  row: number;
  col: number;
  role:
    | "start"
    | "goal"
    | "wall"
    | "current"
    | "frontier"
    | "visited"
    | "path";
}

export interface MemoryItem {
  id: string;
  label: string;
  type: "array" | "list" | "box" | "grid";
  /** For grids this is a 2D array of cells (rows). */
  value: unknown[];
  highlights: Array<MemoryHighlight | GridHighlight>;
}

/** Recursion tree node (used by the `recursion_tree` visual payload). */
export type RecursionNodeStatus = "active" | "waiting" | "returned";

export interface RecursionTreeNode {
  id: string;
  label: string;
  parentId: string | null;
  depth: number;
  status: RecursionNodeStatus;
  returnValue?: number;
}

export interface RecursionTreeEdge {
  from: string;
  to: string;
}

/** Language-neutral visual payload telling the UI which visualizer to use. */
export type VisualPayload =
  | { type: "none" }
  | { type: "variables" }
  | {
      type: "recursion_tree";
      nodes: RecursionTreeNode[];
      edges: RecursionTreeEdge[];
      activeNodeId: string | null;
    }
  | { type: "call_stack" }
  | { type: "array"; itemId: string }
  | { type: "grid"; itemId: string };

/** A language-neutral trace action — describes what happened, not how to render it. */
export interface TraceAction {
  type: string;
  [key: string]: unknown;
}

export interface TraceStep {
  id: string;
  index: number;
  /** One-based source line number. */
  line: number;
  event: TraceEvent | string;
  description: string;
  /** Visible global/current variables. */
  variables: Record<string, unknown>;
  /** Current call stack. */
  stack: StackFrame[];
  /** Cumulative console output so far. */
  output: string;
  memory?: MemoryItem[];
  visual?: VisualPayload;
  changed?: {
    variables?: string[];
    stack?: string[];
    output?: boolean;
  };
  actions?: TraceAction[];
}

export type PracticePromptType =
  | "predict_variable"
  | "predict_output"
  | "predict_next_line"
  | "predict_condition"
  | "choose_explanation";

export interface PracticePrompt {
  id: string;
  stepId: string;
  type: PracticePromptType;
  question: string;
  target: Record<string, unknown>;
  /** Canonical answer (stringified) used for scoring. */
  answer: string;
  /** Optional multiple-choice options. When absent, a free-text answer is expected. */
  choices?: string[];
  explanation: string;
}

export interface TraceDocument {
  schemaVersion: string;
  language: string;
  title: string;
  source: {
    code: string;
    entrypoint: string;
  };
  metadata: {
    topic: string;
    difficulty: Difficulty;
    estimatedDurationSeconds: number;
  };
  steps: TraceStep[];
  practice: PracticePrompt[];
}

/** A registered example in the library (see docs 02 — sample program library). */
export interface Example {
  id: string;
  slug: string;
  title: string;
  topic: string;
  difficulty: Difficulty;
  blurb: string;
  trace: TraceDocument;
}
