import type { TraceDocument } from "../../types/trace";
import { buildRecursionTrace } from "./builders";

export const FIBONACCI_RECURSION_CODE = `def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

print(fib(5))`;

export function buildFibonacciRecursionTrace(): TraceDocument {
  const doc = buildRecursionTrace({
    title: "Fibonacci Recursion",
    code: FIBONACCI_RECURSION_CODE,
    topic: "recursion",
    difficulty: "intermediate",
    durationSeconds: 120,
    fnName: "fib",
    defLine: 1,
    baseLine: 2,
    baseReturnLine: 3,
    callLine: 4,
    printLine: 6,
    arg: 5,
    baseCondition: (n) => `n <= 1 (n = ${n})`,
    isBase: (n) => n <= 1,
    baseResult: (n) => n,
    children: (n) => [n - 1, n - 2],
    fn: fib,
    describeReturn: (n, [a, b], total) =>
      `Return fib(${n - 1}) + fib(${n - 2}) = ${a} + ${b} = ${total}`,
  });

  // Practice: predict fib(3) once its two children are known.
  doc.practice.push({
    id: "practice-extra-1",
    stepId: "step-019", // fib(3) resolves to 2
    type: "predict_variable",
    question:
      "fib(2) = 1 and fib(1) = 1. Since fib(3) = fib(2) + fib(1), what does fib(3) return?",
    target: { variable: "result" },
    answer: "2",
    choices: ["1", "2", "3", "4"],
    explanation: "fib(3) = fib(2) + fib(1) = 1 + 1 = 2.",
  });

  return doc;
}

function fib(n: number): number {
  return n <= 1 ? n : fib(n - 1) + fib(n - 2);
}
