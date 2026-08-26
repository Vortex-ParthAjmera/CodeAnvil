import type { TraceDocument } from "../../types/trace";
import { arrayMemory, arrayVisual, TraceBuilder } from "./builders";

export const FACTORIAL_LOOP_CODE = `n = 5
result = 1
for i in range(1, n + 1):
    result = result * i
print(result)`;

export function buildFactorialLoopTrace(): TraceDocument {
  const factors = [1, 2, 3, 4, 5];
  const factorMemory = (activeIndex = -1, doneThrough = -1) =>
    arrayMemory(
      "factors",
      "factor chain",
      factors,
      factors.flatMap((_, index) => {
        const roles: { index: number; role: string }[] = [];
        if (index < doneThrough) roles.push({ index, role: "sorted" });
        if (index === activeIndex) roles.push({ index, role: "key" });
        return roles;
      }),
    );

  const b = new TraceBuilder({
    title: "Factorial (Loop)",
    code: FACTORIAL_LOOP_CODE,
    topic: "loops",
    difficulty: "beginner",
    durationSeconds: 55,
  });

  b.step({
    line: 1,
    event: "program_start",
    description: "Choose n = 5. The stage builds a factor chain [1, 2, 3, 4, 5]; multiplying all cells gives 5!.",
    variables: { n: 5, goal: "multiply 1..5" },
    memory: [factorMemory()],
    visual: arrayVisual("factors"),
    changed: { variables: ["n"] },
    actions: [{ type: "assignment", target: "n", value: 5 }],
  });

  b.step({
    line: 2,
    event: "assignment",
    description: "result starts at 1, the safe starting value for multiplication. It will carry the running product.",
    variables: { n: 5, result: 1, goal: "multiply 1..5" },
    memory: [factorMemory()],
    visual: arrayVisual("factors"),
    changed: { variables: ["result"] },
    actions: [{ type: "assignment", target: "result", value: 1 }],
  });

  const iterate = (i: number, before: number, after: number) => {
    const running = Array.from({ length: i }, (_, k) => k + 1).join(" × ");
    b.step({
      line: 3,
      event: "loop_iteration",
      description: `Iteration ${i}/5 selects factor ${i}. The highlighted cell is the next multiplier; result is still ${before} before line 4 runs.`,
      variables: { n: 5, result: before, i, next_factor: i },
      memory: [factorMemory(i - 1, i - 1)],
      visual: arrayVisual("factors"),
      changed: { variables: ["i", "next_factor"] },
      actions: [{ type: "loop_iteration", i, item: "factors", index: i - 1 }],
    });
    b.step({
      line: 4,
      event: "assignment",
      description: `result = ${before} × ${i} = ${after}. Lock factor ${i}; running product so far is ${running} = ${after}.`,
      variables: { n: 5, result: after, i, multiplied_through: i },
      memory: [factorMemory(i - 1, i)],
      visual: arrayVisual("factors"),
      changed: { variables: ["result", "multiplied_through"] },
      actions: [{ type: "assignment", target: "result", value: after, before, factor: i, index: i - 1 }],
    });
  };

  iterate(1, 1, 1);
  iterate(2, 1, 2);
  iterate(3, 2, 6);
  iterate(4, 6, 24);
  iterate(5, 24, 120);

  b.step({
    line: 5,
    event: "output_write",
    description: "All factors are locked. print(result) outputs 120, the final value of 5!.",
    variables: { n: 5, result: 120, multiplied_through: 5 },
    output: "120",
    memory: [factorMemory(-1, 5)],
    visual: arrayVisual("factors"),
    changed: { output: true },
    actions: [{ type: "output_write", value: 120 }],
  });

  b.step({
    line: 5,
    event: "program_end",
    description: "5! means 1 × 2 × 3 × 4 × 5. The loop multiplied exactly one new factor per iteration, ending at 120.",
    variables: { n: 5, result: 120, multiplied_through: 5 },
    output: "120",
    memory: [factorMemory(-1, 5)],
    visual: arrayVisual("factors"),
  });

  b.prompt({
    stepId: "step-009",
    type: "predict_variable",
    question:
      "result is currently 6 and i = 4. After running result = result * i, what will result be?",
    target: { variable: "result" },
    answer: "24",
    choices: ["10", "24", "30", "36"],
    explanation: "6 × 4 = 24.",
  });

  return b.build();
}
