import type { TraceDocument } from "../../types/trace";
import { arrayMemory, arrayVisual, TraceBuilder } from "./builders";

export const REVERSE_ARRAY_CODE = `arr = [9, 3, 7, 1, 5, 2]
left = 0
right = len(arr) - 1
while left < right:
    arr[left], arr[right] = arr[right], arr[left]
    left += 1
    right -= 1
print("Reversed:", arr)`;

const DEFAULT_VALUES = [9, 3, 7, 1, 5, 2];

function uniqueChoices(correct: string, values: number[]): string[] {
  const original = `[${values.join(", ")}]`;
  const rotated = `[${[...values.slice(1), values[0]].join(", ")}]`;
  const sorted = `[${[...values].sort((a, b) => a - b).join(", ")}]`;
  return [...new Set([correct, original, rotated, sorted])].slice(0, 4);
}

/**
 * Builds an identity-preserving two-pointer reversal trace. token_order keeps
 * duplicate values visually stable while the renderer carries each token to
 * its new slot instead of replacing DOM or Three.js objects between steps.
 */
export function buildReverseArrayTrace(
  input: number[] = DEFAULT_VALUES,
  code = REVERSE_ARRAY_CODE,
  language = "python",
): TraceDocument {
  const originalValues = input.length > 0 ? [...input] : [0];
  const values = [...originalValues];
  const tokenOrder = originalValues.map((_, index) => index);
  const totalPairs = Math.floor(values.length / 2);
  const settled = new Set<number>();
  const b = new TraceBuilder({
    title: "Reverse an Array",
    code,
    topic: "arrays",
    difficulty: "beginner",
    language,
    durationSeconds: 85,
  });

  let left = 0;
  let right = values.length - 1;
  let swaps = 0;

  const variables = (pairNumber: number) => ({
    algorithm: "reverse-array",
    arr: `[${values.join(", ")}]`,
    left,
    right,
    swaps,
    pair_number: pairNumber,
    total_pairs: totalPairs,
    token_order: [...tokenOrder],
    original_values: [...originalValues],
    settled_indices: [...settled].sort((a, b) => a - b),
  });

  const memory = (activeLeft: number, activeRight: number) => {
    const highlights = [...settled]
      .sort((a, b) => a - b)
      .map((index) => ({ index, role: "settled" }));
    if (activeLeft >= 0 && activeLeft < values.length) {
      highlights.push({ index: activeLeft, role: activeLeft === activeRight ? "center" : "left" });
    }
    if (activeRight >= 0 && activeRight < values.length && activeRight !== activeLeft) {
      highlights.push({ index: activeRight, role: "right" });
    }
    return [arrayMemory("arr", "arr", [...values], highlights)];
  };

  const actionState = (pairNumber: number) => ({
    leftIndex: left,
    rightIndex: right,
    pairNumber,
    totalPairs,
    swaps,
    tokenOrder: [...tokenOrder],
    originalValues: [...originalValues],
    settledIndices: [...settled].sort((a, b) => a - b),
  });

  b.step({
    line: 2,
    event: "program_start",
    description: `Place left at index 0 and right at index ${right}. Reversal will exchange equally distant positions from the outside inward.`,
    variables: variables(0),
    memory: memory(left, right),
    visual: arrayVisual("arr"),
    changed: { variables: ["left", "right"] },
    actions: [{
      type: "array_read",
      phase: "reverse_start",
      index: left,
      ...actionState(0),
    }],
  });

  while (left < right) {
    const pairNumber = swaps + 1;
    const leftValue = values[left];
    const rightValue = values[right];
    const pairStep = b.step({
      line: 4,
      event: "condition_check",
      description: `Pair ${pairNumber}: left ${left} is before right ${right}. Select ${leftValue} and ${rightValue}, which occupy mirrored positions.`,
      variables: variables(pairNumber),
      memory: memory(left, right),
      visual: arrayVisual("arr"),
      changed: { variables: ["pair_number"] },
      actions: [{
        type: "condition_check",
        phase: "reverse_pair",
        condition: "left < right",
        result: true,
        values: [leftValue, rightValue],
        ...actionState(pairNumber),
      }],
    });

    if (swaps === 0) {
      b.prompt({
        stepId: pairStep.id,
        type: "choose_explanation",
        question: "Why does reversal begin with the two end positions?",
        target: { invariant: "mirrored positions" },
        answer: "They are mirrored positions",
        choices: [
          "They are mirrored positions",
          "They are always the largest values",
          "The array must be sorted first",
          "Only the ends can be changed",
        ],
        explanation: "Index 0 and the last index are equally far from opposite ends, so they trade places in the reversed order.",
      });
    }

    values[left] = rightValue;
    values[right] = leftValue;
    [tokenOrder[left], tokenOrder[right]] = [tokenOrder[right], tokenOrder[left]];
    swaps += 1;
    settled.add(left);
    settled.add(right);

    b.step({
      line: 5,
      event: "swap",
      description: `Carry ${leftValue} to index ${right} and ${rightValue} to index ${left}. Both values now occupy their final reversed positions.`,
      variables: variables(pairNumber),
      memory: memory(left, right),
      visual: arrayVisual("arr"),
      changed: { variables: ["arr", "swaps", "token_order", "settled_indices"] },
      actions: [{
        type: "swap",
        phase: "reverse_swap",
        indices: [left, right],
        values: [leftValue, rightValue],
        ...actionState(pairNumber),
      }],
    });

    const previousLeft = left;
    const previousRight = right;
    left += 1;
    right -= 1;

    b.step({
      line: 6,
      event: "assignment",
      description: `Lock indices ${previousLeft} and ${previousRight}. Move left inward to ${left} and right inward to ${right}; settled positions never need another swap.`,
      variables: variables(pairNumber),
      memory: memory(left, right),
      visual: arrayVisual("arr"),
      changed: { variables: ["left", "right"] },
      actions: [
        {
          type: "pointer_move",
          phase: "reverse_advance",
          pointer: "left",
          from: previousLeft,
          to: left,
          previousLeftIndex: previousLeft,
          previousRightIndex: previousRight,
          ...actionState(pairNumber),
        },
        {
          type: "pointer_move",
          pointer: "right",
          from: previousRight,
          to: right,
        },
      ],
    });
  }

  if (left === right) {
    settled.add(left);
    b.step({
      line: 4,
      event: "condition_check",
      description: `The pointers meet at index ${left}. ${values[left]} is already the middle value in both orders, so it stays in place.`,
      variables: variables(swaps),
      memory: memory(left, right),
      visual: arrayVisual("arr"),
      changed: { variables: ["settled_indices"] },
      actions: [{
        type: "condition_check",
        phase: "reverse_center",
        condition: "left < right",
        result: false,
        value: values[left],
        ...actionState(swaps),
      }],
    });
  } else {
    b.step({
      line: 4,
      event: "condition_check",
      description: `left is now ${left} and right is ${right}. The pointers crossed, proving that every mirrored pair has been fixed.`,
      variables: variables(swaps),
      memory: memory(-1, -1),
      visual: arrayVisual("arr"),
      actions: [{
        type: "condition_check",
        phase: "reverse_stop",
        condition: "left < right",
        result: false,
        ...actionState(swaps),
      }],
    });
  }

  const reversedLabel = `[${values.join(", ")}]`;
  b.step({
    line: 8,
    event: "program_end",
    description: `Reversal is complete after ${swaps} in-place swap${swaps === 1 ? "" : "s"}. The order is now ${reversedLabel}.`,
    variables: variables(swaps),
    output: `Reversed: ${reversedLabel}`,
    memory: memory(-1, -1),
    visual: arrayVisual("arr"),
    changed: { output: true },
    actions: [{
      type: "output_write",
      phase: "reverse_complete",
      value: reversedLabel,
      ...actionState(swaps),
    }],
  });

  if (b.steps.length > 2) {
    const revealStep = b.steps[b.steps.length - 2];
    b.prompt({
      stepId: revealStep.id,
      type: "predict_output",
      question: "What full array will be printed after every mirrored pair is swapped?",
      target: { variable: "arr" },
      answer: reversedLabel,
      choices: uniqueChoices(reversedLabel, originalValues),
      explanation: `Reading the original from right to left gives ${reversedLabel}.`,
    });
  }

  return b.build();
}
