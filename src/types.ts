export type PrimitiveValue = string | number | boolean | null;

export type TraceValue =
  | PrimitiveValue
  | PrimitiveValue[]
  | Record<string, PrimitiveValue>;

export type TraceAction =
  | { type: "focus_line"; line: number }
  | { type: "assign"; target: string; value: TraceValue; previous?: TraceValue }
  | { type: "compare"; target: string; indices: [number, number]; values: [PrimitiveValue, PrimitiveValue]; result?: boolean }
  | {
      type: "swap";
      target: string;
      indices: [number, number];
      before: PrimitiveValue[];
      after: PrimitiveValue[];
    }
  | { type: "read"; target: string; index: number; value: PrimitiveValue }
  | { type: "loop"; iterator: string; iteration: number; value: TraceValue }
  | { type: "call"; frameId: string; name: string; args: Record<string, TraceValue> }
  | { type: "return"; frameId: string; name: string; value: TraceValue }
  | { type: "output"; value: string }
  | { type: "visit_node"; node: string; order: number };

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
  | "program_end";

export interface StackFrame {
  id: string;
  name: string;
  line: number;
  locals: Record<string, TraceValue>;
  returnTo?: number;
}

export interface MemoryHighlight {
  index: number;
  role: "active" | "comparing" | "swapping" | "visited" | "target";
}

export interface MemoryItem {
  id: string;
  label: string;
  type: "array" | "grid" | "value";
  value: TraceValue;
  highlights?: MemoryHighlight[];
}

export interface VisualNode {
  id: string;
  label: string;
  value?: string;
  x: number;
  y: number;
  status: "pending" | "active" | "returning" | "done";
}

export interface VisualEdge {
  from: string;
  to: string;
  status: "active" | "done";
  label?: string;
}

export interface TraceVisual {
  type: "none" | "variables" | "array" | "recursion_tree" | "grid" | "graph" | "call_stack";
  activeNodeId?: string;
  nodes?: VisualNode[];
  edges?: VisualEdge[];
}

export interface TraceStep {
  id: string;
  index: number;
  line: number;
  event: TraceEvent;
  description: string;
  variables: Record<string, TraceValue>;
  stack: StackFrame[];
  memory: MemoryItem[];
  output: string;
  visual: TraceVisual;
  changed: {
    variables?: string[];
    stack?: string[];
    output?: boolean;
    memory?: string[];
  };
  actions: TraceAction[];
}

export interface PracticePrompt {
  id: string;
  stepId: string;
  type:
    | "predict_variable"
    | "predict_output"
    | "predict_next_line"
    | "predict_condition"
    | "choose_explanation";
  question: string;
  target: {
    variable?: string;
    line?: number;
  };
  answer: string;
  explanation: string;
}

export interface TraceDocument {
  schemaVersion: "1.0.0";
  language: "python" | "javascript";
  title: string;
  source: {
    code: string;
    entrypoint: string;
  };
  metadata: {
    topic: "recursion" | "arrays" | "search" | "sorting" | "loops" | "custom";
    difficulty: "beginner" | "intermediate";
    estimatedDurationSeconds: number;
  };
  steps: TraceStep[];
  practice: PracticePrompt[];
}

export interface SavedSession {
  id: string;
  schemaVersion: "1.0.0";
  traceTitle: string;
  stepIndex: number;
  savedAt: string;
  trace: TraceDocument;
}
