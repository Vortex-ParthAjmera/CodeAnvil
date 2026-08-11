import type { TraceDocument } from "../../types/trace";
import { arrayMemory, arrayVisual, TraceBuilder } from "./builders";

export const SUM_ARRAY_CODE = `arr = [3, 1, 4, 2]
total = 0
for num in arr:
    total = total + num
print(total)`;

export function buildSumArrayTrace(): TraceDocument {
  const b = new TraceBuilder({
    title: "Sum of Array",
    code: SUM_ARRAY_CODE,
    topic: "arrays",
    difficulty: "beginner",
    durationSeconds: 45,
  });

  const arr = () => arrayMemory("arr", "arr", [3, 1, 4, 2]);

  b.step({
    line: 1,
    event: "program_start",
    description: "Create the list arr = [3, 1, 4, 2].",
    variables: { arr: "[3, 1, 4, 2]" },
    memory: [arr()],
    visual: arrayVisual("arr"),
    changed: { variables: ["arr"] },
    actions: [{ type: "array_write", target: "arr", value: [3, 1, 4, 2] }],
  });

  b.step({
    line: 2,
    event: "assignment",
    description: "Initialize total = 0.",
    variables: { arr: "[3, 1, 4, 2]", total: 0 },
    memory: [arr()],
    visual: arrayVisual("arr"),
    changed: { variables: ["total"] },
    actions: [{ type: "assignment", target: "total", value: 0 }],
  });

  const iterate = (index: number, num: number, totalBefore: number, totalAfter: number) => {
    const mem = () => arrayMemory("arr", "arr", [3, 1, 4, 2], [{ index, role: "reading" }]);
    b.step({
      line: 3,
      event: "loop_iteration",
      description: `Next iteration: num = ${num} (element at index ${index}).`,
      variables: { arr: "[3, 1, 4, 2]", total: totalBefore, num },
      memory: [mem()],
      visual: arrayVisual("arr"),
      changed: { variables: ["num"] },
      actions: [{ type: "array_read", target: "arr", index }],
    });
    b.step({
      line: 4,
      event: "assignment",
      description: `total = ${totalBefore} + ${num} = ${totalAfter}`,
      variables: { arr: "[3, 1, 4, 2]", total: totalAfter, num },
      memory: [mem()],
      visual: arrayVisual("arr"),
      changed: { variables: ["total"] },
      actions: [{ type: "assignment", target: "total", value: totalAfter }],
    });
  };

  iterate(0, 3, 0, 3);
  iterate(1, 1, 3, 4);
  iterate(2, 4, 4, 8);
  iterate(3, 2, 8, 10);

  b.step({
    line: 5,
    event: "output_write",
    description: "print(total) writes 10 to the console.",
    variables: { arr: "[3, 1, 4, 2]", total: 10 },
    output: "10",
    memory: [arr()],
    visual: arrayVisual("arr"),
    changed: { output: true },
    actions: [{ type: "output_write", value: 10 }],
  });

  b.step({
    line: 5,
    event: "program_end",
    description: "Program finished.",
    variables: { arr: "[3, 1, 4, 2]", total: 10 },
    output: "10",
    memory: [arr()],
    visual: arrayVisual("arr"),
  });

  // Practice: predict total after adding the 3rd element (4).
  b.prompt({
    stepId: "step-007", // reveals total = 8
    type: "predict_variable",
    question:
      "total is currently 4 and num is 4. After running total = total + num, what will total be?",
    target: { variable: "total" },
    answer: "8",
    choices: ["6", "8", "10", "12"],
    explanation: "total = 4 + 4 = 8.",
  });

  // Practice: predict the final output.
  b.prompt({
    stepId: "step-010", // print step
    type: "predict_output",
    question: "What will this program print?",
    target: { variable: "total" },
    answer: "10",
    choices: ["8", "10", "12", "14"],
    explanation: "3 + 1 + 4 + 2 = 10.",
  });

  return b.build();
}
