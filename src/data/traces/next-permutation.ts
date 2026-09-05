import type { MemoryItem, TraceAction } from "../../types/trace";
import { arrayMemory, arrayVisual, TraceBuilder } from "./builders";

export const NEXT_PERMUTATION_DEFAULT = [1, 3, 5, 4, 2];

export const NEXT_PERMUTATION_CODE = `arr = [1, 3, 5, 4, 2]
if not arr: raise ValueError("arr must not be empty")
pivot = len(arr) - 2
while pivot >= 0 and arr[pivot] >= arr[pivot + 1]:
    pivot -= 1
if pivot >= 0:
    successor = len(arr) - 1
    while arr[successor] <= arr[pivot]:
        successor -= 1
    arr[pivot], arr[successor] = arr[successor], arr[pivot]
left, right = pivot + 1, len(arr) - 1
while left < right:
    arr[left], arr[right] = arr[right], arr[left]
    left += 1
    right -= 1
print(arr)`;

interface PermutationTokenState {
  id: string;
  value: number;
  index: number;
  originalIndex: number;
}

/** Produces the immediate lexicographically larger ordering in place. */
export function buildNextPermutationTrace(
  input: number[] = NEXT_PERMUTATION_DEFAULT,
  code = NEXT_PERMUTATION_CODE,
  language = "python",
) {
  const original = [...input];
  const values = [...input];
  const tokens: PermutationTokenState[] = values.map((value, index) => ({
    id: `permutation-value-${index}`,
    value,
    index,
    originalIndex: index,
  }));
  let pivot: number | null = null;
  let successor: number | null = null;
  let scanPair: [number, number] | null = null;
  let activePair: [number, number] | null = null;
  let suffixRange: [number, number] | null = null;
  let comparisons = 0;
  let swaps = 0;
  let wrapped = false;
  let swapBefore: [number, number] | null = null;

  const b = new TraceBuilder({
    title: "Next Permutation",
    code,
    topic: "arrays",
    difficulty: "advanced",
    language,
    durationSeconds: 125,
  });
  const invalidReason = original.length === 0
    ? "the array needs at least one value"
    : original.some((value) => !Number.isFinite(value))
      ? "every array value must be finite"
      : null;

  const variables = () => ({
    algorithm: "next-permutation",
    arr: [...values],
    pivot,
    successor,
    comparisons,
    swaps,
    wrapped,
  });

  const memory = (): MemoryItem[] => {
    const highlights: Array<{ index: number; role: string }> = [];
    if (suffixRange) {
      for (let index = suffixRange[0]; index <= suffixRange[1]; index += 1) highlights.push({ index, role: "suffix" });
    }
    scanPair?.forEach((index) => highlights.push({ index, role: "scan" }));
    if (pivot !== null && pivot >= 0) highlights.push({ index: pivot, role: "pivot" });
    if (successor !== null && successor >= 0) highlights.push({ index: successor, role: "successor" });
    activePair?.forEach((index) => highlights.push({ index, role: "swap" }));
    return [arrayMemory("arr", "permutation", values, highlights)];
  };

  const actionState = (invalid: string | null = null) => ({
    originalValues: [...original],
    values: [...values],
    tokens: tokens.map((token) => ({ ...token })),
    pivot,
    successor,
    scanPair: scanPair ? [...scanPair] : null,
    activePair: activePair ? [...activePair] : null,
    suffixRange: suffixRange ? [...suffixRange] : null,
    comparisons,
    swaps,
    wrapped,
    swapBefore: swapBefore ? [...swapBefore] : null,
    invalidReason: invalid,
  });

  const addStep = ({ line, event, description, action, output = "", changed = [] }: {
    line: number;
    event: string;
    description: string;
    action: TraceAction;
    output?: string;
    changed?: string[];
  }) => b.step({
    line,
    event,
    description,
    variables: variables(),
    output,
    memory: memory(),
    visual: arrayVisual("arr"),
    changed: { variables: changed, output: output !== "" },
    actions: [action],
  });

  addStep({
    line: 1,
    event: "program_start",
    description: `Find the immediate lexicographic successor of [${original.join(", ")}], changing the shortest possible suffix.`,
    changed: ["arr"],
    action: { type: "assignment", target: "arr", value: [...original], phase: "permutation_start", ...actionState() },
  });

  if (invalidReason) {
    addStep({
      line: 2,
      event: "error",
      description: `Input rejected: ${invalidReason}. No permutation was fabricated.`,
      action: {
        type: "condition_check",
        condition: "arr is non-empty and every value is finite",
        result: false,
        phase: "permutation_invalid",
        ...actionState(invalidReason),
      },
    });
    return b.build();
  }

  addStep({
    line: 2,
    event: "condition_check",
    description: "The array is valid. Scan from the right for the first ascent arr[i] < arr[i + 1]; that i is the only pivot that can make the smallest increase.",
    action: {
      type: "condition_check",
      condition: "arr is non-empty and every value is finite",
      result: true,
      phase: "permutation_validate",
      ...actionState(),
    },
  });

  for (let index = values.length - 2; index >= 0; index -= 1) {
    scanPair = [index, index + 1];
    const found = values[index] < values[index + 1];
    comparisons += 1;
    const step = addStep({
      line: 4,
      event: "comparison",
      description: found
        ? `${values[index]} < ${values[index + 1]} is true. Index ${index} is the rightmost place where a larger permutation can begin.`
        : `${values[index]} < ${values[index + 1]} is false. This pair remains non-increasing, so move the scan one position left.`,
      changed: ["comparisons"],
      action: { type: "compare", left: values[index], right: values[index + 1], result: found, phase: "permutation_scan_pivot", ...actionState() },
    });
    if (index === values.length - 2) {
      b.prompt({
        stepId: step.id,
        type: "predict_condition",
        question: `Is index ${index} the pivot (${values[index]} < ${values[index + 1]})?`,
        target: { left: values[index], right: values[index + 1] },
        answer: found ? "yes" : "no",
        choices: ["yes", "no"],
        explanation: "The pivot must be an ascent when read left-to-right; equal or descending pairs cannot begin the next larger ordering.",
      });
    }
    if (found) {
      pivot = index;
      break;
    }
  }

  scanPair = null;
  if (pivot === null) {
    pivot = -1;
    wrapped = true;
    suffixRange = [0, values.length - 1];
    addStep({
      line: 6,
      event: "assignment",
      description: "No ascent exists: the array is the greatest permutation. Reverse the complete descending sequence to wrap to the smallest ordering.",
      changed: ["pivot", "wrapped"],
      action: { type: "assignment", target: "pivot", value: -1, phase: "permutation_wrap", ...actionState() },
    });
  } else {
    suffixRange = [pivot + 1, values.length - 1];
    addStep({
      line: 6,
      event: "assignment",
      description: `Choose pivot index ${pivot}, value ${values[pivot]}. The suffix [${pivot + 1}..${values.length - 1}] is non-increasing.`,
      changed: ["pivot"],
      action: { type: "assignment", target: "pivot", value: pivot, phase: "permutation_choose_pivot", ...actionState() },
    });

    for (let index = values.length - 1; index > pivot; index -= 1) {
      scanPair = [pivot, index];
      const found = values[index] > values[pivot];
      comparisons += 1;
      addStep({
        line: 8,
        event: "comparison",
        description: found
          ? `${values[index]} > pivot ${values[pivot]} is true. Scanning from the right makes index ${index} the smallest available increase.`
          : `${values[index]} > pivot ${values[pivot]} is false. Keep scanning left for the first strictly larger value.`,
        changed: ["comparisons"],
        action: { type: "compare", left: values[index], right: values[pivot], result: found, phase: "permutation_scan_successor", ...actionState() },
      });
      if (found) {
        successor = index;
        break;
      }
    }
    scanPair = null;
    addStep({
      line: 9,
      event: "assignment",
      description: `Choose successor index ${successor}, value ${values[successor!]}. It is the rightmost value strictly larger than the pivot.`,
      changed: ["successor"],
      action: { type: "assignment", target: "successor", value: successor, phase: "permutation_choose_successor", ...actionState() },
    });

    activePair = [pivot, successor!];
    swapBefore = [values[pivot], values[successor!]];
    [values[pivot], values[successor!]] = [values[successor!], values[pivot]];
    [tokens[pivot], tokens[successor!]] = [tokens[successor!], tokens[pivot]];
    tokens[pivot].index = pivot;
    tokens[successor!].index = successor!;
    swaps += 1;
    addStep({
      line: 10,
      event: "swap",
      description: `Swap pivot ${swapBefore[0]} with successor ${swapBefore[1]}. This makes the prefix larger by the smallest possible amount.`,
      changed: ["arr", "swaps"],
      action: { type: "swap", indices: activePair, phase: "permutation_swap_pivot", ...actionState() },
    });
    activePair = null;
    swapBefore = null;
  }

  addStep({
    line: 11,
    event: "condition_check",
    description: `Minimize the suffix [${suffixRange[0]}..${suffixRange[1]}] by reversing it into ascending order. This keeps the new permutation immediately adjacent.`,
    action: {
      type: "condition_check",
      condition: "left < right while reversing the suffix",
      result: suffixRange[0] < suffixRange[1],
      phase: "permutation_reverse_suffix",
      ...actionState(),
    },
  });

  let left = suffixRange[0];
  let right = suffixRange[1];
  while (left < right) {
    activePair = [left, right];
    swapBefore = [values[left], values[right]];
    [values[left], values[right]] = [values[right], values[left]];
    [tokens[left], tokens[right]] = [tokens[right], tokens[left]];
    tokens[left].index = left;
    tokens[right].index = right;
    swaps += 1;
    addStep({
      line: 13,
      event: "swap",
      description: `Reverse suffix endpoints ${left} and ${right}: ${swapBefore[0]} crosses with ${swapBefore[1]}.`,
      changed: ["arr", "swaps"],
      action: { type: "swap", indices: activePair, phase: "permutation_reverse_suffix", ...actionState() },
    });
    activePair = null;
    swapBefore = null;
    left += 1;
    right -= 1;
  }

  const output = `Next permutation: [${values.join(", ")}]`;
  addStep({
    line: 16,
    event: "program_end",
    description: wrapped
      ? `Wrapped to the smallest ordering [${values.join(", ")}] because the input had no larger permutation.`
      : `Next permutation found: [${values.join(", ")}]. The prefix increased once and the suffix is now minimal.`,
    output,
    changed: ["arr"],
    action: { type: "output_write", value: [...values], phase: "permutation_complete", ...actionState() },
  });
  return b.build();
}
