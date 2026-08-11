import type { TraceDocument } from "../../types/trace";
import { buildRecursionTrace } from "./builders";

export const FACTORIAL_RECURSION_CODE = `def fact(n):
    if n == 0:
        return 1
    return n * fact(n - 1)

print(fact(4))`;

export function buildFactorialRecursionTrace(): TraceDocument {
  const doc = buildRecursionTrace({
    title: "Factorial Recursion",
    code: FACTORIAL_RECURSION_CODE,
    topic: "recursion",
    difficulty: "beginner",
    durationSeconds: 90,
    fnName: "fact",
    defLine: 1,
    baseLine: 2,
    baseReturnLine: 3,
    callLine: 4,
    printLine: 6,
    arg: 4,
    baseCondition: (n) => `n == 0 (n = ${n})`,
    isBase: (n) => n === 0,
    baseResult: () => 1,
    children: (n) => [n - 1],
    fn: factorial,
    describeReturn: (n, [child], total) =>
      `Return ${n} × ${child} = ${total} (fact(${n}) resolves)`,
  });

  // Practice: predict the next recursive call's argument.
  doc.practice.push({
    id: "practice-extra-1",
    stepId: "step-005", // call fact(2) is revealed at step-004; step-005 is its base check
    type: "predict_variable",
    question:
      "We are inside fact(3) and it is about to recurse. What will n be in the next recursive call?",
    target: { variable: "n" },
    answer: "2",
    choices: ["2", "3", "4", "0"],
    explanation: "The body runs return n * fact(n - 1), so 3 becomes 2.",
  });

  // Practice: predict the final resolved value.
  doc.practice.push({
    id: "practice-extra-2",
    stepId: "step-015", // fact(4) resolves to 24
    type: "predict_variable",
    question:
      "fact(3) = 6 and fact(4) = 4 × fact(3). What does fact(4) return?",
    target: { variable: "result" },
    answer: "24",
    choices: ["18", "24", "12", "10"],
    explanation: "4 × 6 = 24.",
  });

  return doc;
}

function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1);
}
