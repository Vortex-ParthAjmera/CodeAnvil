import type {
  MemoryHighlight,
  PracticePrompt,
  StackFrame,
  TraceDocument,
  TraceStep,
  TraceValue,
  TraceVisual,
  VisualEdge,
  VisualNode,
} from "../types";

interface TraceDiagnostic {
  kind: "info" | "error";
  message: string;
  line?: number;
}

export interface GeneratedTraceResult {
  diagnostics: TraceDiagnostic[];
  trace?: TraceDocument;
}

type RuntimeValue = number | string | number[];
type RuntimeScope = Record<string, RuntimeValue>;

const blockedPatterns = [
  /\bimport\b/,
  /\bfrom\s+\w+\s+import\b/,
  /\binput\s*\(/,
  /\bopen\s*\(/,
  /\beval\s*\(/,
  /\bexec\s*\(/,
  /\b__import__\s*\(/,
  /\bsubprocess\b/,
  /\bsocket\b/,
  /\brequests\b/,
  /\bos\./,
  /\bsys\./,
];

const identifierPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

function visual(type: TraceVisual["type"] = "variables"): TraceVisual {
  return { type };
}

function step(
  id: string,
  index: number,
  line: number,
  event: TraceStep["event"],
  description: string,
  variables: Record<string, TraceValue>,
  changed: TraceStep["changed"],
  memory: TraceStep["memory"] = [],
  output = "",
  stack: StackFrame[] = [],
  visualPayload: TraceVisual = visual(memory.length ? "array" : "variables"),
): TraceStep {
  return {
    id,
    index,
    line,
    event,
    description,
    variables,
    stack,
    memory,
    output,
    visual: visualPayload,
    changed,
  };
}

function snapshot(scope: RuntimeScope): Record<string, TraceValue> {
  return Object.fromEntries(
    Object.entries(scope).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]),
  );
}

function arrayMemory(scope: RuntimeScope, highlights: MemoryHighlight[] = []): TraceStep["memory"] {
  const entry = Object.entries(scope).find(([, value]) => Array.isArray(value));
  if (!entry) {
    return [];
  }

  const [label, value] = entry;
  return [{ id: label, label, type: "array", value: [...(value as number[])], highlights }];
}

function splitArgs(input: string): string[] {
  const args: string[] = [];
  let current = "";
  let quote: string | null = null;
  let depth = 0;

  for (const char of input) {
    if ((char === "\"" || char === "'") && !quote) {
      quote = char;
      current += char;
      continue;
    }

    if (quote === char) {
      quote = null;
      current += char;
      continue;
    }

    if (!quote && char === "[") depth += 1;
    if (!quote && char === "]") depth -= 1;

    if (!quote && depth === 0 && char === ",") {
      args.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    args.push(current.trim());
  }

  return args;
}

function parseArrayLiteral(expression: string): number[] | null {
  const trimmed = expression.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return null;
  }

  const inner = trimmed.slice(1, -1).trim();
  if (!inner) {
    return [];
  }

  const values = inner.split(",").map((part) => Number(part.trim()));
  return values.every(Number.isFinite) ? values : null;
}

function tokenizeArithmetic(expression: string): string[] {
  const tokens: string[] = [];
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    const previous = tokens[tokens.length - 1];
    const canBeSignedNumber =
      char === "-" &&
      (tokens.length === 0 || ["+", "-", "*", "/", "%", "("].includes(previous)) &&
      /\d/.test(expression[index + 1] ?? "");

    if (/\d/.test(char) || canBeSignedNumber) {
      let numberToken = char;
      index += 1;
      while (index < expression.length && /[\d.]/.test(expression[index])) {
        numberToken += expression[index];
        index += 1;
      }
      tokens.push(numberToken);
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      let identifier = char;
      index += 1;
      while (index < expression.length && /[A-Za-z0-9_]/.test(expression[index])) {
        identifier += expression[index];
        index += 1;
      }
      tokens.push(identifier);
      continue;
    }

    if ("+-*/%()".includes(char)) {
      tokens.push(char);
      index += 1;
      continue;
    }

    throw new Error(`Unsupported token "${char}"`);
  }

  return tokens;
}

function evaluateArithmetic(expression: string, scope: RuntimeScope): number {
  const tokens = tokenizeArithmetic(expression);
  const output: string[] = [];
  const operators: string[] = [];
  const precedence: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2 };

  for (const token of tokens) {
    if (!Number.isNaN(Number(token))) {
      output.push(token);
      continue;
    }

    if (identifierPattern.test(token)) {
      const value = scope[token];
      if (typeof value !== "number") {
        throw new Error(`${token} must be a number in arithmetic expressions`);
      }
      output.push(String(value));
      continue;
    }

    if (token === "(") {
      operators.push(token);
      continue;
    }

    if (token === ")") {
      while (operators.length && operators[operators.length - 1] !== "(") {
        output.push(operators.pop()!);
      }
      operators.pop();
      continue;
    }

    while (
      operators.length &&
      operators[operators.length - 1] !== "(" &&
      precedence[operators[operators.length - 1]] >= precedence[token]
    ) {
      output.push(operators.pop()!);
    }
    operators.push(token);
  }

  while (operators.length) {
    output.push(operators.pop()!);
  }

  const stack: number[] = [];
  for (const token of output) {
    if (!Number.isNaN(Number(token))) {
      stack.push(Number(token));
      continue;
    }

    const right = stack.pop();
    const left = stack.pop();
    if (left === undefined || right === undefined) {
      throw new Error("Invalid arithmetic expression");
    }

    if (token === "+") stack.push(left + right);
    if (token === "-") stack.push(left - right);
    if (token === "*") stack.push(left * right);
    if (token === "/") stack.push(left / right);
    if (token === "%") stack.push(left % right);
  }

  if (stack.length !== 1 || !Number.isFinite(stack[0])) {
    throw new Error("Invalid arithmetic expression");
  }

  return stack[0];
}

function evaluateExpression(expression: string, scope: RuntimeScope): RuntimeValue {
  const trimmed = expression.trim();
  const arrayLiteral = parseArrayLiteral(trimmed);
  if (arrayLiteral) {
    return arrayLiteral;
  }

  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  if (identifierPattern.test(trimmed) && scope[trimmed] !== undefined) {
    const value = scope[trimmed];
    return Array.isArray(value) ? [...value] : value;
  }

  return evaluateArithmetic(trimmed, scope);
}

function printValue(expression: string, scope: RuntimeScope): string {
  return splitArgs(expression)
    .map((part) => {
      const value = evaluateExpression(part, scope);
      return Array.isArray(value) ? `[${value.join(", ")}]` : String(value);
    })
    .join(" ");
}

function makeTraceDocument(
  title: string,
  code: string,
  topic: TraceDocument["metadata"]["topic"],
  steps: TraceStep[],
  practice: PracticePrompt[],
): TraceDocument {
  return {
    schemaVersion: "1.0.0",
    language: "python",
    title,
    source: {
      code,
      entrypoint: "main",
    },
    metadata: {
      topic,
      difficulty: "beginner",
      estimatedDurationSeconds: Math.max(30, steps.length * 7),
    },
    steps,
    practice,
  };
}

function makePractice(steps: TraceStep[]): PracticePrompt[] {
  const changedStep = steps.find((item) => item.changed.variables?.length);
  const variable = changedStep?.changed.variables?.[0];

  if (!changedStep || !variable) {
    return [];
  }

  return [
    {
      id: "custom-practice-1",
      stepId: changedStep.id,
      type: "predict_variable",
      question: `What is ${variable} after this step?`,
      target: { variable },
      answer: String(changedStep.variables[variable]),
      explanation: `${variable} becomes ${changedStep.variables[variable]} on this step.`,
    },
  ];
}

function buildStraightLineTrace(code: string, lines: string[]): GeneratedTraceResult {
  const scope: RuntimeScope = {};
  const steps: TraceStep[] = [];
  let output = "";

  try {
    lines.forEach((rawLine, rawIndex) => {
      const line = rawLine.trim();
      const lineNumber = rawIndex + 1;
      if (!line || line.startsWith("#")) {
        return;
      }

      const printMatch = line.match(/^print\s*\((.*)\)$/);
      if (printMatch) {
        output = `${output}${output ? "\n" : ""}${printValue(printMatch[1], scope)}`;
        steps.push(
          step(
            `custom-${steps.length}`,
            steps.length,
            lineNumber,
            "output_write",
            "Print the current expression",
            snapshot(scope),
            { output: true },
            arrayMemory(scope),
            output,
          ),
        );
        return;
      }

      const augmentedMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*([+\-*/%])=\s*(.+)$/);
      if (augmentedMatch) {
        const [, name, operator, expression] = augmentedMatch;
        const previous = scope[name];
        if (typeof previous !== "number") {
          throw new Error(`${name} must already be a number before using ${operator}=`);
        }
        scope[name] = evaluateArithmetic(`${name} ${operator} (${expression})`, scope);
        steps.push(
          step(
            `custom-${steps.length}`,
            steps.length,
            lineNumber,
            "assignment",
            `Update ${name} to ${scope[name]}`,
            snapshot(scope),
            { variables: [name] },
            arrayMemory(scope),
            output,
          ),
        );
        return;
      }

      const assignmentMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      if (assignmentMatch) {
        const [, name, expression] = assignmentMatch;
        scope[name] = evaluateExpression(expression, scope);
        steps.push(
          step(
            `custom-${steps.length}`,
            steps.length,
            lineNumber,
            "assignment",
            `Set ${name}`,
            snapshot(scope),
            { variables: [name] },
            arrayMemory(scope),
            output,
          ),
        );
        return;
      }

      throw new Error(`Unsupported statement on line ${lineNumber}`);
    });
  } catch (error) {
    return {
      diagnostics: [
        {
          kind: "error",
          message: error instanceof Error ? error.message : "Could not trace this code.",
        },
      ],
    };
  }

  if (!steps.length) {
    return { diagnostics: [{ kind: "error", message: "Add at least one assignment or print statement." }] };
  }

  return {
    diagnostics: [{ kind: "info", message: "Generated a safe local trace from straight-line code." }],
    trace: makeTraceDocument("Custom Code Trace", code, "custom", steps, makePractice(steps)),
  };
}

function buildLoopTrace(code: string, lines: string[]): GeneratedTraceResult | null {
  const loopIndex = lines.findIndex((line) => /^\s*for\s+[A-Za-z_][A-Za-z0-9_]*\s+in\s+[A-Za-z_][A-Za-z0-9_]*\s*:\s*$/.test(line));
  if (loopIndex === -1) {
    return null;
  }

  const loopMatch = lines[loopIndex].trim().match(/^for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*$/);
  if (!loopMatch) {
    return null;
  }

  const [, iterator, arrayName] = loopMatch;
  const scope: RuntimeScope = {};
  const steps: TraceStep[] = [];
  let output = "";

  try {
    for (let index = 0; index < loopIndex; index += 1) {
      const line = lines[index].trim();
      if (!line || line.startsWith("#")) {
        continue;
      }
      const assignmentMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      if (!assignmentMatch) {
        throw new Error(`Only assignments are supported before the loop. Check line ${index + 1}.`);
      }
      const [, name, expression] = assignmentMatch;
      scope[name] = evaluateExpression(expression, scope);
      steps.push(
        step(
          `loop-${steps.length}`,
          steps.length,
          index + 1,
          "assignment",
          `Set ${name}`,
          snapshot(scope),
          { variables: [name] },
          arrayMemory(scope),
          output,
        ),
      );
    }

    const sourceArray = scope[arrayName];
    if (!Array.isArray(sourceArray)) {
      throw new Error(`${arrayName} must be a list of numbers before the loop.`);
    }

    const bodyStart = loopIndex + 1;
    const bodyLine = lines[bodyStart]?.trim();
    const supportedAdd = bodyLine?.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\+=\s*([A-Za-z_][A-Za-z0-9_]*)$/);
    if (!supportedAdd || supportedAdd[2] !== iterator) {
      throw new Error("This MVP supports loops shaped like: for value in arr: total += value");
    }

    const target = supportedAdd[1];
    for (let arrayIndex = 0; arrayIndex < sourceArray.length; arrayIndex += 1) {
      const value = sourceArray[arrayIndex];
      scope[iterator] = value;
      steps.push(
        step(
          `loop-${steps.length}`,
          steps.length,
          loopIndex + 1,
          "loop_iteration",
          `Read ${iterator} = ${value}`,
          snapshot(scope),
          { variables: [iterator], memory: [arrayName] },
          arrayMemory(scope, [{ index: arrayIndex, role: "active" }]),
          output,
        ),
      );

      const previous = scope[target];
      if (typeof previous !== "number") {
        throw new Error(`${target} must be a number before the loop.`);
      }
      scope[target] = previous + value;
      steps.push(
        step(
          `loop-${steps.length}`,
          steps.length,
          bodyStart + 1,
          "assignment",
          `Add ${value} into ${target}`,
          snapshot(scope),
          { variables: [target], memory: [arrayName] },
          arrayMemory(scope, [{ index: arrayIndex, role: "visited" }]),
          output,
        ),
      );
    }

    const afterLoop = lines.slice(bodyStart + 1);
    afterLoop.forEach((rawLine, offset) => {
      const line = rawLine.trim();
      const lineNumber = bodyStart + 2 + offset;
      if (!line || line.startsWith("#")) {
        return;
      }
      const printMatch = line.match(/^print\s*\((.*)\)$/);
      if (!printMatch) {
        throw new Error(`Only print(...) is supported after this loop. Check line ${lineNumber}.`);
      }
      output = `${output}${output ? "\n" : ""}${printValue(printMatch[1], scope)}`;
      steps.push(
        step(
          `loop-${steps.length}`,
          steps.length,
          lineNumber,
          "output_write",
          "Print the loop result",
          snapshot(scope),
          { output: true },
          arrayMemory(scope),
          output,
        ),
      );
    });
  } catch (error) {
    return {
      diagnostics: [
        {
          kind: "error",
          message: error instanceof Error ? error.message : "Could not trace this loop.",
        },
      ],
    };
  }

  return {
    diagnostics: [{ kind: "info", message: "Generated a safe local trace for a basic for-loop." }],
    trace: makeTraceDocument("Custom Loop Trace", code, "loops", steps, makePractice(steps)),
  };
}

function recursionVisual(
  nodes: VisualNode[],
  edges: VisualEdge[],
  activeNodeId: string,
  doneIds: string[],
): TraceVisual {
  const done = new Set(doneIds);
  return {
    type: "recursion_tree",
    activeNodeId,
    nodes: nodes.map((node) => ({
      ...node,
      status: node.id === activeNodeId ? "active" : done.has(node.id) ? "done" : "pending",
      value: done.has(node.id) ? node.value : node.id === activeNodeId ? "active" : "?",
    })),
    edges: edges.map((edge) => ({ ...edge, status: done.has(edge.to) ? "done" : "active" })),
  };
}

function buildFactorialTrace(code: string): GeneratedTraceResult | null {
  const definition = code.match(/def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*n\s*\)\s*:/);
  if (!definition) {
    return null;
  }

  const fnName = definition[1];
  if (!code.includes(`${fnName}(n - 1)`) && !code.includes(`${fnName}(n-1)`)) {
    return null;
  }

  const directCall = code.match(new RegExp(`${fnName}\\((\\d+)\\)`));
  const assignedInput = code.match(/\bn\s*=\s*(\d+)\b/);
  const n = Number(assignedInput?.[1] ?? directCall?.[1] ?? 4);
  if (!Number.isInteger(n) || n < 0 || n > 8) {
    return {
      diagnostics: [{ kind: "error", message: "Recursive demo input must be an integer from 0 to 8." }],
    };
  }

  const sourceLines = code.split("\n");
  const lineFor = (needle: string, fallback: number) => {
    const index = sourceLines.findIndex((line) => line.includes(needle));
    return index >= 0 ? index + 1 : fallback;
  };
  const callLine = lineFor(`${fnName}(n`, lineFor(`${fnName}(${n}`, 1));
  const baseLine = lineFor("return 1", 2);
  const recursiveLine = lineFor(`${fnName}(n`, 4);
  const printLine = lineFor("print", sourceLines.length);
  const activeValues = Array.from({ length: Math.max(n, 1) }, (_, index) => n - index).filter((value) => value >= 1);
  if (n === 0) activeValues.push(0);

  const nodes = activeValues.map((value, index): VisualNode => ({
    id: `call-${value}`,
    label: `${fnName}(${value})`,
    value: "?",
    x: 350 - index * 28,
    y: 58 + index * 82,
    status: "pending",
  }));
  const edges = activeValues.slice(0, -1).map(
    (value, index): VisualEdge => ({
      from: `call-${value}`,
      to: `call-${activeValues[index + 1]}`,
      status: "active",
      label: "n - 1",
    }),
  );

  const steps: TraceStep[] = [];
  const frames: StackFrame[] = [];
  steps.push(
    step(
      "custom-rec-0",
      0,
      callLine,
      "function_call",
      `Call ${fnName}(${n})`,
      { n, result: "-", "__return__": "-" },
      { variables: ["n"] },
      [],
      "",
      [],
      recursionVisual(nodes, edges, `call-${n}`, []),
    ),
  );

  activeValues.forEach((value) => {
    frames.push({
      id: `frame-${value}`,
      name: `${fnName}(${value})`,
      line: value <= 1 ? baseLine : recursiveLine,
      locals: { n: value },
      returnTo: recursiveLine,
    });
    steps.push(
      step(
        `custom-rec-${steps.length}`,
        steps.length,
        value <= 1 ? baseLine : recursiveLine,
        value <= 1 ? "condition_check" : "recursion_call",
        value <= 1 ? `${value} reaches the base case` : `${fnName}(${value}) calls ${fnName}(${value - 1})`,
        { n: value, result: "-", "__return__": "-" },
        { variables: ["n"], stack: [`frame-${value}`] },
        [],
        "",
        [...frames],
        recursionVisual(nodes, edges, `call-${value}`, []),
      ),
    );
  });

  let returned = 1;
  const done: string[] = [];
  for (let index = activeValues.length - 1; index >= 0; index -= 1) {
    const value = activeValues[index];
    returned = value <= 1 ? 1 : value * returned;
    done.push(`call-${value}`);
    steps.push(
      step(
        `custom-rec-${steps.length}`,
        steps.length,
        value <= 1 ? baseLine : recursiveLine,
        "function_return",
        `${fnName}(${value}) returns ${returned}`,
        { n: value, result: value === n ? returned : "-", "__return__": returned },
        { variables: ["__return__", ...(value === n ? ["result"] : [])] },
        [],
        "",
        frames.slice(0, index + 1),
        recursionVisual(nodes, edges, `call-${value}`, done),
      ),
    );
  }

  steps.push(
    step(
      `custom-rec-${steps.length}`,
      steps.length,
      printLine,
      "output_write",
      "Print the final recursive result",
      { n, result: returned, "__return__": returned },
      { output: true },
      [],
      String(returned),
      [],
      recursionVisual(nodes, edges, `call-${n}`, done),
    ),
  );

  return {
    diagnostics: [{ kind: "info", message: `Generated a safe recursive trace for ${fnName}(${n}).` }],
    trace: makeTraceDocument("Custom Recursion Trace", code, "recursion", steps, makePractice(steps)),
  };
}

export function generateTraceFromCode(code: string): GeneratedTraceResult {
  const normalizedCode = code.replace(/\r\n/g, "\n").trim();
  if (!normalizedCode) {
    return { diagnostics: [{ kind: "error", message: "Paste or type code before tracing." }] };
  }

  const blocked = blockedPatterns.find((pattern) => pattern.test(normalizedCode));
  if (blocked) {
    return {
      diagnostics: [
        {
          kind: "error",
          message: "This MVP traces safe beginner code only. Imports, input, files, network, eval, and system calls are disabled.",
        },
      ],
    };
  }

  const factorialTrace = buildFactorialTrace(normalizedCode);
  if (factorialTrace) {
    return factorialTrace;
  }

  const lines = normalizedCode.split("\n");
  const loopTrace = buildLoopTrace(normalizedCode, lines);
  if (loopTrace) {
    return loopTrace;
  }

  return buildStraightLineTrace(normalizedCode, lines);
}
