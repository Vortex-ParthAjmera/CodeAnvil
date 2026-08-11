import type { TraceDocument } from "../../types/trace";
import { TraceBuilder } from "./builders";

export const FACTORIAL_LOOP_CODE = `n = 5
result = 1
for i in range(1, n + 1):
    result = result * i
print(result)`;

export function buildFactorialLoopTrace(): TraceDocument {
  const b = new TraceBuilder({
    title: "Factorial (Loop)",
    code: FACTORIAL_LOOP_CODE,
    topic: "loops",
    difficulty: "beginner",
    durationSeconds: 45,
  });

  b.step({
    line: 1,
    event: "program_start",
    description: "Set n = 5. We want 5! = 5 × 4 × 3 × 2 × 1.",
    variables: { n: 5 },
    changed: { variables: ["n"] },
    actions: [{ type: "assignment", target: "n", value: 5 }],
  });

  b.step({
    line: 2,
    event: "assignment",
    description: "Initialize result = 1 (multiplicative identity).",
    variables: { n: 5, result: 1 },
    changed: { variables: ["result"] },
    actions: [{ type: "assignment", target: "result", value: 1 }],
  });

  const iterate = (i: number, before: number, after: number) => {
    b.step({
      line: 3,
      event: "loop_iteration",
      description: `Next iteration: i = ${i} (range 1..${5}).`,
      variables: { n: 5, result: before, i },
      changed: { variables: ["i"] },
      actions: [{ type: "loop_iteration", i }],
    });
    b.step({
      line: 4,
      event: "assignment",
      description: `result = ${before} × ${i} = ${after}`,
      variables: { n: 5, result: after, i },
      changed: { variables: ["result"] },
      actions: [{ type: "assignment", target: "result", value: after }],
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
    description: "print(result) writes 120 to the console.",
    variables: { n: 5, result: 120 },
    output: "120",
    changed: { output: true },
    actions: [{ type: "output_write", value: 120 }],
  });

  b.step({
    line: 5,
    event: "program_end",
    description: "Program finished. 5! = 120.",
    variables: { n: 5, result: 120 },
    output: "120",
  });

  b.prompt({
    stepId: "step-009", // reveals result = 24
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
