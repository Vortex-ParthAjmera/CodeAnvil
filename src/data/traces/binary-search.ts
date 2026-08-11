import type { TraceDocument } from "../../types/trace";
import { arrayMemory, arrayVisual, TraceBuilder } from "./builders";

export const BINARY_SEARCH_CODE = `arr = [1, 3, 5, 7, 9, 11]
target = 7
low = 0
high = len(arr) - 1
while low <= high:
    mid = (low + high) // 2
    if arr[mid] == target:
        print("Found at index", mid)
        break
    elif arr[mid] < target:
        low = mid + 1
    else:
        high = mid - 1`;

const VALUES = [1, 3, 5, 7, 9, 11];

export function buildBinarySearchTrace(): TraceDocument {
  const b = new TraceBuilder({
    title: "Binary Search",
    code: BINARY_SEARCH_CODE,
    topic: "searching",
    difficulty: "intermediate",
    durationSeconds: 90,
  });

  const arr = () => arrayMemory("arr", "arr", VALUES);
  const arrWithMid = (mid: number) =>
    arrayMemory("arr", "arr", VALUES, [{ index: mid, role: "mid" }]);
  const vars = (extra: Record<string, unknown>) => ({
    arr: "[1, 3, 5, 7, 9, 11]",
    target: 7,
    ...extra,
  });

  b.step({
    line: 1,
    event: "program_start",
    description: "Create the sorted list arr = [1, 3, 5, 7, 9, 11].",
    variables: vars({}),
    memory: [arr()],
    visual: arrayVisual("arr"),
    changed: { variables: ["arr"] },
    actions: [{ type: "array_write", target: "arr", value: VALUES }],
  });

  b.step({
    line: 2,
    event: "assignment",
    description: "Set target = 7. We are searching for this value.",
    variables: vars({ target: 7 }),
    memory: [arr()],
    visual: arrayVisual("arr"),
    changed: { variables: ["target"] },
    actions: [{ type: "assignment", target: "target", value: 7 }],
  });

  b.step({
    line: 3,
    event: "assignment",
    description: "Set low = 0 (left edge of the search range).",
    variables: vars({ target: 7, low: 0 }),
    memory: [arr()],
    visual: arrayVisual("arr"),
    changed: { variables: ["low"] },
    actions: [{ type: "assignment", target: "low", value: 0 }],
  });

  b.step({
    line: 4,
    event: "assignment",
    description: "Set high = len(arr) - 1 = 5 (right edge of the search range).",
    variables: vars({ target: 7, low: 0, high: 5 }),
    memory: [arr()],
    visual: arrayVisual("arr"),
    changed: { variables: ["high"] },
    actions: [{ type: "assignment", target: "high", value: 5 }],
  });

  const loopCheck = (low: number, high: number) => {
    b.step({
      line: 5,
      event: "loop_iteration",
      description: `Check low <= high → ${low} <= ${high} is true. Search range: indices [${low}..${high}].`,
      variables: vars({ target: 7, low, high }),
      memory: [arr()],
      visual: arrayVisual("arr"),
      changed: { variables: [] },
      actions: [{ type: "comparison", op: "<=", left: low, right: high, result: true }],
    });
  };

  const midStep = (low: number, high: number) => {
    const mid = Math.floor((low + high) / 2);
    b.step({
      line: 6,
      event: "assignment",
      description: `mid = (${low} + ${high}) // 2 = ${mid}. Probe arr[${mid}] = ${VALUES[mid]}.`,
      variables: vars({ target: 7, low, high, mid }),
      memory: [arrWithMid(mid)],
      visual: arrayVisual("arr"),
      changed: { variables: ["mid"] },
      actions: [{ type: "array_read", target: "arr", index: mid }],
    });
  };

  const compareStep = (low: number, high: number, mid: number, kind: "found" | "right" | "left") => {
    const val = VALUES[mid];
    const description =
      kind === "found"
        ? `arr[${mid}] == target → ${val} == 7 → true! Found at index ${mid}.`
        : kind === "right"
          ? `arr[${mid}] < target → ${val} < 7 → true. Discard the left half.`
          : `arr[${mid}] < target → ${val} < 7 → false. Discard the right half.`;
    b.step({
      line: 7,
      event: "comparison",
      description,
      variables: vars({ target: 7, low, high, mid }),
      memory: [arrWithMid(mid)],
      visual: arrayVisual("arr"),
      changed: { variables: [] },
      actions: [{ type: "compare", left: val, right: 7, result: kind === "found" }],
    });
  };

  const adjustStep = (line: 10 | 12, low: number, high: number, description: string) => {
    b.step({
      line,
      event: "assignment",
      description,
      variables: vars({ target: 7, low, high }),
      memory: [arr()],
      visual: arrayVisual("arr"),
      changed: { variables: line === 10 ? ["low"] : ["high"] },
      actions: [
        {
          type: "assignment",
          target: line === 10 ? "low" : "high",
          value: line === 10 ? low : high,
        },
      ],
    });
  };

  // Iteration 1: low=0, high=5, mid=2 (arr[2] = 5)
  loopCheck(0, 5);
  midStep(0, 5);
  compareStep(0, 5, 2, "right");
  adjustStep(10, 3, 5, "5 < 7, so low = mid + 1 = 3. Search the right half.");

  // Iteration 2: low=3, high=5, mid=4 (arr[4] = 9)
  loopCheck(3, 5);
  midStep(3, 5);
  compareStep(3, 5, 4, "left");
  adjustStep(12, 3, 3, "9 > 7, so high = mid - 1 = 3. Search the left half.");

  // Iteration 3: low=3, high=3, mid=3 (arr[3] = 7) — found
  loopCheck(3, 3);
  midStep(3, 3);
  compareStep(3, 3, 3, "found");

  b.step({
    line: 8,
    event: "output_write",
    description: 'print("Found at index", mid) writes: Found at index 3',
    variables: vars({ target: 7, low: 3, high: 3, mid: 3 }),
    output: "Found at index 3",
    memory: [arrWithMid(3)],
    visual: arrayVisual("arr"),
    changed: { output: true },
    actions: [{ type: "output_write", value: "Found at index 3" }],
  });

  b.step({
    line: 9,
    event: "line_enter",
    description: "break — exit the loop; the search is complete.",
    variables: vars({ target: 7, low: 3, high: 3, mid: 3 }),
    output: "Found at index 3",
    memory: [arrWithMid(3)],
    visual: arrayVisual("arr"),
  });

  b.step({
    line: 9,
    event: "program_end",
    description: "Program finished. target 7 found at index 3 in 3 probes.",
    variables: vars({ target: 7, low: 3, high: 3, mid: 3 }),
    output: "Found at index 3",
    memory: [arrWithMid(3)],
    visual: arrayVisual("arr"),
  });

  // Practice: predict the probe mid in iteration 2.
  b.prompt({
    stepId: "step-009", // reveals mid = 4
    type: "predict_variable",
    question: "low = 3 and high = 5. What will mid = (low + high) // 2 be?",
    target: { variable: "mid" },
    answer: "4",
    choices: ["3", "4", "5", "2"],
    explanation: "mid = (3 + 5) // 2 = 8 // 2 = 4.",
  });

  return b.build();
}
