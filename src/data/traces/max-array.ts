import type { TraceDocument } from "../../types/trace";
import { arrayMemory, arrayVisual, TraceBuilder } from "./builders";

export const MAX_ARRAY_CODE = `arr = [3, 8, 2, 9, 5]\nmax_val = arr[0]\nfor i in range(1, len(arr)):\n    if arr[i] > max_val:\n        max_val = arr[i]\nprint(\"Max:\", max_val)`;

const VALUES = [3, 8, 2, 9, 5];

export function buildMaxArrayTrace(): TraceDocument {
  const b = new TraceBuilder({
    title: "Max in Array",
    code: MAX_ARRAY_CODE,
    topic: "arrays",
    difficulty: "beginner",
    durationSeconds: 75,
  });

  const mem = (i: number, maxIdx: number) =>
    arrayMemory("arr", "arr", VALUES, [
      { index: i, role: "reading" },
      { index: maxIdx, role: "max" },
    ]);

  const vars = (extra: Record<string, unknown>) => ({
    arr: "[3, 8, 2, 9, 5]",
    ...extra,
  });

  b.step({
    line: 1,
    event: "program_start",
    description: "Create arr = [3, 8, 2, 9, 5].",
    variables: vars({}),
    memory: [arrayMemory("arr", "arr", VALUES)],
    visual: arrayVisual("arr"),
    changed: { variables: ["arr"] },
    actions: [{ type: "array_write", target: "arr", value: VALUES }],
  });

  b.step({
    line: 2,
    event: "assignment",
    description: "Assume the first element is the maximum so far: max_val = 3.",
    variables: vars({ max_val: 3 }),
    memory: [mem(0, 0)],
    visual: arrayVisual("arr"),
    changed: { variables: ["max_val"] },
    actions: [{ type: "assignment", target: "max_val", value: 3 }],
  });

  const iterations: Array<{ i: number; maxBefore: number; update: boolean }> = [
    { i: 1, maxBefore: 3, update: true }, // 8 > 3 → max = 8
    { i: 2, maxBefore: 8, update: false }, // 2 > 8? no
    { i: 3, maxBefore: 8, update: true }, // 9 > 8 → max = 9
    { i: 4, maxBefore: 9, update: false }, // 5 > 9? no
  ];

  for (const { i, maxBefore, update } of iterations) {
    b.step({
      line: 3,
      event: "loop_iteration",
      description: `Loop with i = ${i}. Is arr[${i}] = ${VALUES[i]} greater than max_val = ${maxBefore}?`,
      variables: vars({ max_val: maxBefore, i }),
      memory: [mem(i, i)],
      visual: arrayVisual("arr"),
      changed: { variables: ["i"] },
      actions: [{ type: "array_read", target: "arr", index: i }],
    });
    if (update) {
      b.step({
        line: 4,
        event: "comparison",
        description: `${VALUES[i]} > ${maxBefore} → true. A new maximum found!`,
        variables: vars({ max_val: maxBefore, i }),
        memory: [mem(i, i)],
        visual: arrayVisual("arr"),
        changed: { variables: [] },
        actions: [{ type: "compare", left: VALUES[i], right: maxBefore, result: true }],
      });
      b.step({
        line: 5,
        event: "assignment",
        description: `Update max_val = ${VALUES[i]}.`,
        variables: vars({ max_val: VALUES[i], i }),
        memory: [mem(i, i)],
        visual: arrayVisual("arr"),
        changed: { variables: ["max_val"] },
        actions: [{ type: "assignment", target: "max_val", value: VALUES[i] }],
      });
    } else {
      b.step({
        line: 4,
        event: "comparison",
        description: `${VALUES[i]} > ${maxBefore} → false. Keep max_val = ${maxBefore}.`,
        variables: vars({ max_val: maxBefore, i }),
        memory: [mem(i, i)],
        visual: arrayVisual("arr"),
        changed: { variables: [] },
        actions: [{ type: "compare", left: VALUES[i], right: maxBefore, result: false }],
      });
    }
  }

  b.step({
    line: 6,
    event: "output_write",
    description: 'print("Max:", max_val) writes: Max: 9',
    variables: vars({ max_val: 9, i: 4 }),
    output: "Max: 9",
    memory: [mem(4, 3)],
    visual: arrayVisual("arr"),
    changed: { output: true },
    actions: [{ type: "output_write", value: "Max: 9" }],
  });

  b.step({
    line: 6,
    event: "program_end",
    description: "Program finished. The maximum value in arr is 9.",
    variables: vars({ max_val: 9, i: 4 }),
    output: "Max: 9",
    memory: [mem(4, 3)],
    visual: arrayVisual("arr"),
  });

  // Practice: predict whether the max updates at index 2.
  b.prompt({
    stepId: "step-006", // reveals the comparison at i=2 (2 > 8 → false)
    type: "predict_condition",
    question: "At i = 2, is arr[2] = 2 greater than max_val = 8?",
    target: { condition: "no" },
    answer: "no",
    choices: ["yes", "no"],
    explanation: "2 > 8 is false, so max_val stays 8.",
  });

  // Practice: predict the final max.
  b.prompt({
    stepId: "step-012", // reveals print output
    type: "predict_output",
    question: "After the loop finishes, what does the program print as the maximum?",
    target: { output: "Max: 9" },
    answer: "Max: 9",
    choices: ["Max: 9", "Max: 8", "Max: 5", "Max: 3"],
    explanation: "The running maximum ends at 9 — the largest value in the array.",
  });

  return b.build();
}
