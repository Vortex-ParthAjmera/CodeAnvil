import type {
  MemoryHighlight,
  PracticePrompt,
  TraceAction,
  StackFrame,
  TraceDocument,
  TraceStep,
  TraceValue,
  TraceVisual,
  VisualEdge,
  VisualNode,
} from "../types";
import { buildStepActions } from "./buildStepActions";
import { TRACE_LIMITS, validateTraceDocument } from "./validateTrace";

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
    visual: visualPayload,
    actions: [],
    changed,
  };
  nextStep.actions = buildStepActions(nextStep, explicitActions);
  return nextStep;
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
  if (values.length > TRACE_LIMITS.arrayItems) {
    throw new Error(`Lists are limited to ${TRACE_LIMITS.arrayItems} numbers in this version.`);
  }
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

function validatedTrace(trace: TraceDocument, message: string): GeneratedTraceResult {
  const validation = validateTraceDocument(trace);
  if (!validation.valid) {
    return { diagnostics: [{ kind: "error", message: `Trace validation failed: ${validation.issues[0].message}` }] };
  }
  return { diagnostics: [{ kind: "info", message }], trace };
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
      answer: Array.isArray(changedStep.variables[variable])
        ? JSON.stringify(changedStep.variables[variable])
        : String(changedStep.variables[variable]),
      explanation: `${variable} changes on this step. Follow the highlighted assignment to predict its value.`,
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

  return validatedTrace(
    makeTraceDocument("Custom Code Trace", code, "custom", steps, makePractice(steps)),
    "Trace ready. CodeAnvil analyzed this straight-line Python subset locally.",
  );
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

    const loopIndent = lines[loopIndex].match(/^\s*/)?.[0].length ?? 0;
    if (loopIndent !== 0) throw new Error("Nested loops are not supported by the browser tracer yet.");
    const bodyStart = loopIndex + 1;
    let bodyEnd = bodyStart;
    const bodyLines: Array<{ line: string; lineNumber: number }> = [];
    while (bodyEnd < lines.length) {
      const rawLine = lines[bodyEnd];
      if (!rawLine.trim()) {
        bodyEnd += 1;
        continue;
      }
      const indent = rawLine.match(/^\s*/)?.[0].length ?? 0;
      if (indent <= loopIndent) break;
      if (!rawLine.trim().startsWith("#")) bodyLines.push({ line: rawLine.trim(), lineNumber: bodyEnd + 1 });
      bodyEnd += 1;
    }
    if (bodyLines.length !== 1) throw new Error("This loop tracer supports exactly one indented statement: total += value.");
    const bodyLine = bodyLines[0];
    const supportedAdd = bodyLine.line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\+=\s*([A-Za-z_][A-Za-z0-9_]*)$/);
    if (!supportedAdd || supportedAdd[2] !== iterator) {
      throw new Error("This loop tracer supports: for value in arr: total += value");
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
          bodyLine.lineNumber,
          "assignment",
          `Add ${value} into ${target}`,
          snapshot(scope),
          { variables: [target], memory: [arrayName] },
          arrayMemory(scope, [{ index: arrayIndex, role: "visited" }]),
          output,
        ),
      );
    }

    const afterLoop = lines.slice(bodyEnd);
    afterLoop.forEach((rawLine, offset) => {
      const line = rawLine.trim();
      const lineNumber = bodyEnd + offset + 1;
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

  return validatedTrace(
    makeTraceDocument("Custom Loop Trace", code, "loops", steps, makePractice(steps)),
    "Trace ready. CodeAnvil analyzed this bounded list loop locally.",
  );
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
  const sourceLines = code.split("\n");
  const definitionIndex = sourceLines.findIndex((line) =>
    /^\s*def\s+[A-Za-z_][A-Za-z0-9_]*\s*\(\s*n\s*\)\s*:\s*$/.test(line),
  );
  if (definitionIndex < 0) return null;

  const definition = sourceLines[definitionIndex].match(/def\s+([A-Za-z_][A-Za-z0-9_]*)/);
  if (!definition) return null;
  const fnName = definition[1];
  const definitionIndent = sourceLines[definitionIndex].match(/^\s*/)?.[0].length ?? 0;
  let functionEnd = definitionIndex + 1;
  while (functionEnd < sourceLines.length) {
    const line = sourceLines[functionEnd];
    if (line.trim() && (line.match(/^\s*/)?.[0].length ?? 0) <= definitionIndent) break;
    functionEnd += 1;
  }

  const functionCode = sourceLines.slice(definitionIndex + 1, functionEnd).join("\n");
  const selfCallPattern = new RegExp(`${fnName}\\s*\\(\\s*n\\s*-\\s*1\\s*\\)`);
  if (!selfCallPattern.test(functionCode)) return null;
  const factorialReturnPattern = new RegExp(
    `^\\s*return\\s+(?:n\\s*\\*\\s*${fnName}\\s*\\(\\s*n\\s*-\\s*1\\s*\\)|${fnName}\\s*\\(\\s*n\\s*-\\s*1\\s*\\)\\s*\\*\\s*n)\\s*$`,
    "m",
  );
  const hasBaseCase = /^\s*if\s+n\s*<=\s*1\s*:\s*$/m.test(functionCode) && /^\s*return\s+1\s*$/m.test(functionCode);
  if (!hasBaseCase || !factorialReturnPattern.test(functionCode)) {
    return {
      diagnostics: [{
        kind: "error",
        message: "Recursive tracing currently supports the exact factorial pattern: base case n <= 1 and return n * fn(n - 1).",
      }],
    };
  }

  const directCall = code.match(new RegExp(`${fnName}\\s*\\(\\s*(\\d+)\\s*\\)`));
  const assignedInput = code.match(/\bn\s*=\s*(\d+)\b/);
  const n = Number(assignedInput?.[1] ?? directCall?.[1] ?? 4);
  if (!Number.isInteger(n) || n < 0 || n > 8) {
    return { diagnostics: [{ kind: "error", message: "Recursive demo input must be an integer from 0 to 8." }] };
  }

  const lineFor = (match: (line: string) => boolean, fallback: number) => {
    const index = sourceLines.findIndex(match);
    return index >= 0 ? index + 1 : fallback;
  };
  const callLine = lineFor(
    (line) => !/^\s*(def|return)\b/.test(line) && new RegExp(`${fnName}\\s*\\(\\s*(?:n|${n})\\s*\\)`).test(line),
    1,
  );
  const baseLine = lineFor((line) => /^\s*return\s+1\s*$/.test(line), definitionIndex + 3);
  const recursiveLine = lineFor((line) => factorialReturnPattern.test(line), definitionIndex + 4);
  const printLine = lineFor((line) => /^\s*print\s*\(/.test(line), sourceLines.length);
  const activeValues = Array.from({ length: Math.max(n, 1) }, (_, index) => n - index)
    .filter((value) => value >= 1);
  if (n === 0) activeValues.push(0);
  const factorialValue = (value: number) => {
    let total = 1;
    for (let factor = 2; factor <= value; factor += 1) total *= factor;
    return total;
  };

  const nodes = activeValues.map((value, index): VisualNode => ({
    id: `call-${value}`,
    label: `${fnName}(${value})`,
    value: String(factorialValue(value)),
    x: 350 - index * 28,
    y: 58 + index * 82,
    status: "pending",
  }));
  const edges = activeValues.slice(0, -1).map((value, index): VisualEdge => ({
    from: `call-${value}`,
    to: `call-${activeValues[index + 1]}`,
    status: "active",
    label: "n - 1",
  }));

  const steps: TraceStep[] = [];
  const frames: StackFrame[] = [];
  steps.push(step(
    "custom-rec-0",
    0,
    callLine,
    "function_call",
    `Call ${fnName}(${n})`,
    { n },
    { variables: ["n"] },
    [],
    "",
    [],
    recursionVisual(nodes, edges, `call-${n}`, []),
    [{ type: "call", frameId: `frame-${n}`, name: `${fnName}(${n})`, args: { n } }],
  ));

  activeValues.forEach((value) => {
    frames.push({
      id: `frame-${value}`,
      name: `${fnName}(${value})`,
      line: value <= 1 ? baseLine : recursiveLine,
      locals: { n: value },
      returnTo: recursiveLine,
    });
    steps.push(step(
      `custom-rec-${steps.length}`,
      steps.length,
      value <= 1 ? baseLine : recursiveLine,
      value <= 1 ? "condition_check" : "recursion_call",
      value <= 1 ? `${value} reaches the base case` : `${fnName}(${value}) calls ${fnName}(${value - 1})`,
      { n: value },
      { variables: ["n"], stack: [`frame-${value}`] },
      [],
      "",
      [...frames],
      recursionVisual(nodes, edges, `call-${value}`, []),
      value <= 1
        ? []
        : [{ type: "call", frameId: `frame-${value - 1}`, name: `${fnName}(${value - 1})`, args: { n: value - 1 } }],
    ));
  });

  let returned = 1;
  const done: string[] = [];
  for (let index = activeValues.length - 1; index >= 0; index -= 1) {
    const value = activeValues[index];
    returned = value <= 1 ? 1 : value * returned;
    done.push(`call-${value}`);
    steps.push(step(
      `custom-rec-${steps.length}`,
      steps.length,
      value <= 1 ? baseLine : recursiveLine,
      "function_return",
      `${fnName}(${value}) returns ${returned}`,
      { n: value, "__return__": returned, ...(value === n ? { result: returned } : {}) },
      { variables: ["__return__", ...(value === n ? ["result"] : [])] },
      [],
      "",
      frames.slice(0, index + 1),
      recursionVisual(nodes, edges, `call-${value}`, done),
      [{ type: "return", frameId: `frame-${value}`, name: `${fnName}(${value})`, value: returned }],
    ));
  }

  const printStatement = sourceLines[printLine - 1]?.trim().match(/^print\s*\((.*)\)$/);
  let finalOutput = String(returned);
  if (printStatement && !new RegExp(`${fnName}\\s*\\(`).test(printStatement[1])) {
    try {
      finalOutput = printValue(printStatement[1], { n, result: returned });
    } catch {
      finalOutput = String(returned);
    }
  }
  steps.push(step(
    `custom-rec-${steps.length}`,
    steps.length,
    printLine,
    "output_write",
    "Print the final recursive result",
    { n, result: returned, "__return__": returned },
    { output: true },
    [],
    finalOutput,
    [],
    recursionVisual(nodes, edges, `call-${n}`, done),
    [{ type: "output", value: finalOutput }],
  ));

  return validatedTrace(
    makeTraceDocument("Custom Recursion Trace", code, "recursion", steps, makePractice(steps)),
    `Trace ready. CodeAnvil matched the factorial pattern for ${fnName}(${n}).`,
  );
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

  const lines = normalizedCode.split("\n");

  const factorialTrace = buildFactorialTrace(normalizedCode);
  if (factorialTrace) {
    return factorialTrace;
  }

  const loopTrace = buildLoopTrace(normalizedCode, lines);
  if (loopTrace) {
    return loopTrace;
  }

  return buildStraightLineTrace(normalizedCode, lines);
}
