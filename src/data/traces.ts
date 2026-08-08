import type {
  MemoryHighlight,
  TraceAction,
  StackFrame,
  TraceDocument,
  TraceStep,
  TraceValue,
  TraceVisual,
  VisualEdge,
  VisualNode,
} from "../types";
import { buildStepActions } from "../trace/buildStepActions";

const factorialCode = `def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

n = 4
result = factorial(n)
print("Factorial:", result)`;

const sumArrayCode = `arr = [3, 1, 4, 2]
total = 0

for value in arr:
    total += value

print(total)`;

const bubbleSortCode = `arr = [5, 1, 4, 2]

for i in range(len(arr)):
    for j in range(0, len(arr) - i - 1):
        if arr[j] > arr[j + 1]:
            arr[j], arr[j + 1] = arr[j + 1], arr[j]

print(arr)`;

const factorialNodeOrder = ["call-4", "call-3", "call-2", "call-1"];

const factorialNodes: VisualNode[] = [
  { id: "call-4", label: "factorial(4)", x: 420, y: 44, status: "pending" },
  { id: "call-3", label: "factorial(3)", x: 300, y: 138, status: "pending" },
  { id: "call-2", label: "factorial(2)", x: 232, y: 232, status: "pending" },
  { id: "call-1", label: "factorial(1)", x: 196, y: 326, status: "pending" },
];

const factorialEdges: VisualEdge[] = [
  { from: "call-4", to: "call-3", status: "done", label: "n - 1" },
  { from: "call-3", to: "call-2", status: "done", label: "n - 1" },
  { from: "call-2", to: "call-1", status: "done", label: "n - 1" },
];

const factorialReturns: Record<string, string> = {
  "call-1": "1",
  "call-2": "2",
  "call-3": "6",
  "call-4": "24",
};

function factorialFrame(n: number): StackFrame {
  return {
    id: `frame-factorial-${n}`,
    name: `factorial(${n})`,
    line: n <= 1 ? 2 : 4,
    locals: { n },
    returnTo: n === 4 ? 7 : 4,
  };
}

function factorialStack(values: number[]): StackFrame[] {
  return values.map(factorialFrame);
}

function recursionTree(
  activeNodeId: string,
  visibleCount: number,
  doneIds: string[] = [],
  returningIds: string[] = [],
): TraceVisual {
  const visibleIds = factorialNodeOrder.slice(0, visibleCount);
  const doneSet = new Set(doneIds);
  const returningSet = new Set(returningIds);

  return {
    type: "recursion_tree",
    activeNodeId,
    nodes: factorialNodes.slice(0, visibleCount).map((node) => ({
      ...node,
      status:
        node.id === activeNodeId
          ? "active"
          : returningSet.has(node.id)
            ? "returning"
            : doneSet.has(node.id)
              ? "done"
              : "pending",
      value: doneSet.has(node.id) || returningSet.has(node.id) ? factorialReturns[node.id] : "?",
    })),
    edges: factorialEdges
      .filter((edge) => visibleIds.includes(edge.from) && visibleIds.includes(edge.to))
      .map((edge) => ({
        ...edge,
        status: doneSet.has(edge.to) || returningSet.has(edge.to) ? "done" : "active",
      })),
  };
}

function step(
  id: string,
  index: number,
  line: number,
  event: TraceStep["event"],
  description: string,
  variables: Record<string, TraceValue>,
  stack: StackFrame[],
  visual: TraceVisual,
  changed: TraceStep["changed"],
  memory = [] as TraceStep["memory"],
  output = "",
  explicitActions: TraceAction[] = [],
): TraceStep {
  const nextStep: TraceStep = {
    id,
    index,
    line,
    event,
    description,
    variables,
    stack,
    memory,
    output,
    visual,
    actions: [],
    changed,
  };
  nextStep.actions = buildStepActions(nextStep, explicitActions);
  return nextStep;
}

function arrayMemory(
  value: number[],
  highlights: MemoryHighlight[] = [],
  label = "arr",
): TraceStep["memory"] {
  return [{ id: label, label, type: "array", value: [...value], highlights }];
}

const factorialTrace: TraceDocument = {
  schemaVersion: "1.0.0",
  language: "python",
  title: "Factorial Recursion",
  source: {
    code: factorialCode,
    entrypoint: "main",
  },
  metadata: {
    topic: "recursion",
    difficulty: "beginner",
    estimatedDurationSeconds: 90,
  },
  steps: [
    step("fact-00", 0, 6, "assignment", "Store n = 4", { n: 4 }, [], { type: "none" }, { variables: ["n"] }),
    step("fact-01", 1, 7, "function_call", "Call factorial(4)", { n: 4 }, factorialStack([4]), recursionTree("call-4", 1), { stack: ["frame-factorial-4"] }),
    step("fact-02", 2, 2, "condition_check", "Check whether 4 is a base case", { n: 4 }, factorialStack([4]), recursionTree("call-4", 1), { variables: ["n"] }),
    step("fact-03", 3, 4, "recursion_call", "factorial(4) needs factorial(3)", { n: 3 }, factorialStack([4, 3]), recursionTree("call-3", 2), { variables: ["n"], stack: ["frame-factorial-3"] }),
    step("fact-04", 4, 4, "recursion_call", "factorial(3) needs factorial(2)", { n: 2 }, factorialStack([4, 3, 2]), recursionTree("call-2", 3), { variables: ["n"], stack: ["frame-factorial-2"] }),
    step("fact-05", 5, 4, "recursion_call", "factorial(2) needs factorial(1)", { n: 1 }, factorialStack([4, 3, 2, 1]), recursionTree("call-1", 4), { variables: ["n"], stack: ["frame-factorial-1"] }),
    step("fact-06", 6, 2, "condition_check", "1 reaches the base case", { n: 1 }, factorialStack([4, 3, 2, 1]), recursionTree("call-1", 4), { variables: ["n"] }),
    step("fact-07", 7, 3, "function_return", "Return 1 to factorial(2)", { n: 1, "__return__": 1 }, factorialStack([4, 3, 2, 1]), recursionTree("call-1", 4, [], ["call-1"]), { variables: ["__return__"] }),
    step("fact-08", 8, 4, "function_return", "factorial(2) returns 2 * 1", { n: 2, "__return__": 2 }, factorialStack([4, 3, 2]), recursionTree("call-2", 4, ["call-1"], ["call-2"]), { variables: ["__return__"], stack: ["frame-factorial-1"] }),
    step("fact-09", 9, 4, "function_return", "factorial(3) returns 3 * 2", { n: 3, "__return__": 6 }, factorialStack([4, 3]), recursionTree("call-3", 4, ["call-1", "call-2"], ["call-3"]), { variables: ["__return__"], stack: ["frame-factorial-2"] }),
    step("fact-10", 10, 4, "function_return", "factorial(4) returns 4 * 6", { n: 4, result: 24, "__return__": 24 }, factorialStack([4]), recursionTree("call-4", 4, ["call-1", "call-2", "call-3"], ["call-4"]), { variables: ["result", "__return__"], stack: ["frame-factorial-3"] }),
    step("fact-11", 11, 8, "output_write", "Print the final answer", { n: 4, result: 24, "__return__": 24 }, [], recursionTree("call-4", 4, ["call-1", "call-2", "call-3", "call-4"]), { output: true, stack: ["frame-factorial-4"] }, [], "Factorial: 24"),
    step("fact-12", 12, 8, "program_end", "Playback complete", { n: 4, result: 24, "__return__": 24 }, [], recursionTree("call-4", 4, ["call-1", "call-2", "call-3", "call-4"]), {}, [], "Factorial: 24"),
  ],
  practice: [
    {
      id: "fact-practice-01",
      stepId: "fact-03",
      type: "predict_variable",
      question: "What value of n enters the next recursive call?",
      target: { variable: "n" },
      answer: "2",
      explanation: "The call keeps subtracting 1, so after factorial(3) the next call is factorial(2).",
    },
    {
      id: "fact-practice-02",
      stepId: "fact-09",
      type: "predict_variable",
      question: "What does factorial(4) receive from factorial(3)?",
      target: { variable: "__return__" },
      answer: "6",
      explanation: "factorial(3) returns 3 * 2, which is 6.",
    },
  ],
};

const sumArrayTrace: TraceDocument = {
  schemaVersion: "1.0.0",
  language: "python",
  title: "Sum Of Array",
  source: {
    code: sumArrayCode,
    entrypoint: "main",
  },
  metadata: {
    topic: "arrays",
    difficulty: "beginner",
    estimatedDurationSeconds: 60,
  },
  steps: [
    step("sum-00", 0, 1, "assignment", "Create the array", { arr: [3, 1, 4, 2] }, [], { type: "array" }, { variables: ["arr"] }, arrayMemory([3, 1, 4, 2])),
    step("sum-01", 1, 2, "assignment", "Start total at 0", { arr: [3, 1, 4, 2], total: 0 }, [], { type: "array" }, { variables: ["total"] }, arrayMemory([3, 1, 4, 2])),
    step("sum-02", 2, 4, "loop_iteration", "Read the first value", { arr: [3, 1, 4, 2], total: 0, value: 3 }, [], { type: "array" }, { variables: ["value"], memory: ["arr"] }, arrayMemory([3, 1, 4, 2], [{ index: 0, role: "active" }])),
    step("sum-03", 3, 5, "assignment", "Add 3 to total", { arr: [3, 1, 4, 2], total: 3, value: 3 }, [], { type: "array" }, { variables: ["total"] }, arrayMemory([3, 1, 4, 2], [{ index: 0, role: "visited" }])),
    step("sum-04", 4, 4, "loop_iteration", "Read the next value", { arr: [3, 1, 4, 2], total: 3, value: 1 }, [], { type: "array" }, { variables: ["value"], memory: ["arr"] }, arrayMemory([3, 1, 4, 2], [{ index: 1, role: "active" }])),
    step("sum-05", 5, 5, "assignment", "Add 1 to total", { arr: [3, 1, 4, 2], total: 4, value: 1 }, [], { type: "array" }, { variables: ["total"] }, arrayMemory([3, 1, 4, 2], [{ index: 1, role: "visited" }])),
    step("sum-06", 6, 4, "loop_iteration", "Read 4", { arr: [3, 1, 4, 2], total: 4, value: 4 }, [], { type: "array" }, { variables: ["value"] }, arrayMemory([3, 1, 4, 2], [{ index: 2, role: "active" }])),
    step("sum-07", 7, 5, "assignment", "Add 4 to total", { arr: [3, 1, 4, 2], total: 8, value: 4 }, [], { type: "array" }, { variables: ["total"] }, arrayMemory([3, 1, 4, 2], [{ index: 2, role: "visited" }])),
    step("sum-08", 8, 4, "loop_iteration", "Read 2", { arr: [3, 1, 4, 2], total: 8, value: 2 }, [], { type: "array" }, { variables: ["value"] }, arrayMemory([3, 1, 4, 2], [{ index: 3, role: "active" }])),
    step("sum-09", 9, 5, "assignment", "Add 2 to total", { arr: [3, 1, 4, 2], total: 10, value: 2 }, [], { type: "array" }, { variables: ["total"] }, arrayMemory([3, 1, 4, 2], [{ index: 3, role: "visited" }])),
    step("sum-10", 10, 7, "output_write", "Print total", { arr: [3, 1, 4, 2], total: 10, value: 2 }, [], { type: "array" }, { output: true }, arrayMemory([3, 1, 4, 2]), "10"),
  ],
  practice: [
    {
      id: "sum-practice-01",
      stepId: "sum-04",
      type: "predict_variable",
      question: "What will total become after this value is added?",
      target: { variable: "total" },
      answer: "4",
      explanation: "The current total is 3 and the value is 1, so the next total is 4.",
    },
  ],
};

function createBubbleSortTrace(): TraceDocument {
  const values = [5, 1, 4, 2];
  const steps: TraceStep[] = [];
  let comparisons = 0;
  let swaps = 0;
  let lastJ: number | undefined;
  const variables = (i?: number, j?: number): Record<string, TraceValue> => ({
    arr: [...values],
    comparisons,
    swaps,
    ...(i === undefined ? {} : { i }),
    ...(j === undefined ? {} : { j }),
  });
  const id = () => `bubble-${String(steps.length).padStart(2, "0")}`;

  steps.push(step(
    id(), steps.length, 1, "assignment", "Load the array", variables(), [],
    { type: "array" }, { variables: ["arr"] }, arrayMemory(values),
  ));

  for (let i = 0; i < values.length; i += 1) {
    steps.push(step(
      id(), steps.length, 3, "loop_start",
      `Start pass ${i + 1}; the sorted tail grows from the right`,
      variables(i, lastJ), [], { type: "array" }, { variables: ["i"] }, arrayMemory(values),
    ));

    for (let j = 0; j < values.length - i - 1; j += 1) {
      lastJ = j;
      const left = values[j];
      const right = values[j + 1];
      comparisons += 1;
      steps.push(step(
        id(), steps.length, 5, "comparison",
        `Compare ${left} and ${right}; ${left > right ? "they are out of order" : "keep their order"}`,
        variables(i, j), [], { type: "array" },
        { variables: ["j", "comparisons"], memory: ["arr"] },
        arrayMemory(values, [{ index: j, role: "comparing" }, { index: j + 1, role: "comparing" }]),
        "",
        [{ type: "compare", target: "arr", indices: [j, j + 1], values: [left, right], result: left > right }],
      ));

      if (left > right) {
        const before = [...values];
        [values[j], values[j + 1]] = [values[j + 1], values[j]];
        swaps += 1;
        steps.push(step(
          id(), steps.length, 6, "swap",
          `Swap ${left} and ${right}; the larger value moves right`,
          variables(i, j), [], { type: "array" },
          { variables: ["arr", "swaps"], memory: ["arr"] },
          arrayMemory(values, [{ index: j, role: "swapping" }, { index: j + 1, role: "swapping" }]),
          "",
          [{ type: "swap", target: "arr", indices: [j, j + 1], before, after: [...values] }],
        ));
      }
    }
  }

  const output = `[${values.join(", ")}]`;
  steps.push(step(
    id(), steps.length, 8, "output_write", "Print the fully sorted array",
    variables(values.length - 1, lastJ), [], { type: "array" }, { output: true },
    arrayMemory(values), output, [{ type: "output", value: output }],
  ));

  return {
    schemaVersion: "1.0.0",
    language: "python",
    title: "Bubble Sort",
    source: { code: bubbleSortCode, entrypoint: "main" },
    metadata: { topic: "sorting", difficulty: "beginner", estimatedDurationSeconds: 110 },
    steps,
    practice: [{
      id: "bubble-practice-01",
      stepId: "bubble-02",
      type: "predict_condition",
      question: "Will the first comparison trigger a swap?",
      target: { variable: "arr" },
      answer: "yes",
      explanation: "5 is greater than 1, so bubble sort moves 5 one position to the right.",
    }],
  };
}

const bubbleSortTrace = createBubbleSortTrace();

export const traces: TraceDocument[] = [factorialTrace, sumArrayTrace, bubbleSortTrace];
