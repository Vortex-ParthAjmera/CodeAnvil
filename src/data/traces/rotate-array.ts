import type { MemoryItem, TraceAction } from "../../types/trace";
import { arrayMemory, arrayVisual, TraceBuilder } from "./builders";

export const ROTATE_ARRAY_DEFAULT = [1, 2, 3, 4, 5, 6];
export const ROTATE_ARRAY_SHIFT = 2;

export const ROTATE_ARRAY_CODE = `arr = [1, 2, 3, 4, 5, 6]
k = 2
if not arr: raise ValueError("arr must not be empty")
if not isinstance(k, int): raise ValueError("k must be an integer")
k %= len(arr)
def reverse_range(a, left, right):
    while left < right:
        a[left], a[right] = a[right], a[left]
        left += 1
        right -= 1
reverse_range(arr, 0, len(arr) - 1)
reverse_range(arr, 0, k - 1)
reverse_range(arr, k, len(arr) - 1)
print(arr)`;

export interface RotateTokenState {
  id: string;
  value: number;
  index: number;
  originalIndex: number;
}

type RotatePhase = "all" | "prefix" | "suffix";

function normalizeShift(k: number, length: number): number {
  return ((k % length) + length) % length;
}

/** Rotates right by k using the three-reversal proof, exposing every swap. */
export function buildRotateArrayTrace(
  input: number[] = ROTATE_ARRAY_DEFAULT,
  shift = ROTATE_ARRAY_SHIFT,
  code = ROTATE_ARRAY_CODE,
  language = "python",
) {
  const original = [...input];
  const values = [...input];
  const tokens: RotateTokenState[] = values.map((value, index) => ({
    id: `rotate-value-${index}`,
    value,
    index,
    originalIndex: index,
  }));
  const b = new TraceBuilder({
    title: "Rotate Array",
    code,
    topic: "arrays",
    difficulty: "intermediate",
    language,
    durationSeconds: 120,
  });
  const invalidReason = original.length === 0
    ? "the array needs at least one value"
    : original.some((value) => !Number.isFinite(value))
      ? "every array value must be finite"
      : !Number.isInteger(shift)
        ? "k must be a whole number"
        : null;
  const k = invalidReason ? 0 : normalizeShift(shift, original.length);
  let swaps = 0;
  let completedPhases = 0;

  const variables = () => ({
    algorithm: "rotate-array",
    arr: [...values],
    k: shift,
    normalized_k: k,
    swaps,
    completed_phases: completedPhases,
  });

  const memory = (activeRange: [number, number] | null = null, activePair: [number, number] | null = null): MemoryItem[] => {
    const highlights: Array<{ index: number; role: string }> = [];
    if (activeRange) {
      for (let index = activeRange[0]; index <= activeRange[1]; index += 1) {
        if (index >= 0 && index < values.length) highlights.push({ index, role: "reverse-range" });
      }
    }
    activePair?.forEach((index) => highlights.push({ index, role: "swap" }));
    return [
      arrayMemory("arr", "working array", values, highlights),
      arrayMemory("original", "original array", original),
    ];
  };

  const actionState = ({
    activeRange = null,
    activePair = null,
    phaseName = null,
    swapBefore = null,
    invalid = null,
  }: {
    activeRange?: [number, number] | null;
    activePair?: [number, number] | null;
    phaseName?: RotatePhase | null;
    swapBefore?: [number, number] | null;
    invalid?: string | null;
  } = {}) => ({
    originalValues: [...original],
    values: [...values],
    tokens: tokens.map((token) => ({ ...token })),
    shift,
    normalizedShift: k,
    activeRange: activeRange ? [...activeRange] : null,
    activePair: activePair ? [...activePair] : null,
    phaseName,
    swapBefore: swapBefore ? [...swapBefore] : null,
    swaps,
    completedPhases,
    invalidReason: invalid,
  });

  const addStep = ({ line, event, description, action, activeRange = null, activePair = null, output = "", changed = [] }: {
    line: number;
    event: string;
    description: string;
    action: TraceAction;
    activeRange?: [number, number] | null;
    activePair?: [number, number] | null;
    output?: string;
    changed?: string[];
  }) => b.step({
    line,
    event,
    description,
    variables: variables(),
    output,
    memory: memory(activeRange, activePair),
    visual: arrayVisual("arr"),
    changed: { variables: changed, output: output !== "" },
    actions: [action],
  });

  addStep({
    line: 1,
    event: "program_start",
    description: `Rotate [${original.join(", ")}] right by ${shift}. The same value tokens will move through three controlled reversals.`,
    changed: ["arr", "k"],
    action: { type: "assignment", target: "arr", value: [...original], phase: "rotate_start", ...actionState() },
  });

  if (invalidReason) {
    addStep({
      line: original.length === 0 ? 3 : 4,
      event: "error",
      description: `Input rejected: ${invalidReason}. No positions were changed.`,
      changed: ["arr", "k"],
      action: {
        type: "condition_check",
        condition: "arr is non-empty, values are finite, and k is an integer",
        result: false,
        phase: "rotate_invalid",
        ...actionState({ invalid: invalidReason }),
      },
    });
    return b.build();
  }

  const normalizeStep = addStep({
    line: 5,
    event: "assignment",
    description: `Normalize the shift: ${shift} mod ${original.length} = ${k}. Each token's destination is (index + ${k}) mod ${original.length}.`,
    changed: ["normalized_k"],
    action: { type: "assignment", target: "k", value: k, phase: "rotate_normalize", ...actionState() },
  });
  b.prompt({
    stepId: normalizeStep.id,
    type: "predict_variable",
    question: `Where will the value at index 0 land after a right rotation by ${k}?`,
    target: { originalIndex: 0, k, length: original.length },
    answer: String(k % original.length),
    explanation: `A right rotation maps index i to (i + k) mod n, so index 0 lands at ${k % original.length}.`,
  });

  if (k === 0 || original.length === 1) {
    const output = `Rotated array: [${values.join(", ")}]`;
    addStep({
      line: 14,
      event: "program_end",
      description: "The normalized shift is 0, so every token already occupies its destination.",
      output,
      action: { type: "output_write", value: [...values], phase: "rotate_complete", ...actionState() },
    });
    return b.build();
  }

  const reverseRange = (left: number, right: number, phase: RotatePhase, line: number, purpose: string) => {
    const range: [number, number] = [left, right];
    const rangeStep = addStep({
      line,
      event: "condition_check",
      description: `${purpose} Reverse positions [${left}..${right}] by swapping mirrored endpoints inward.`,
      activeRange: range,
      action: {
        type: "condition_check",
        condition: `${left} <= ${right}`,
        result: left <= right,
        phase: `rotate_reverse_${phase}`,
        ...actionState({ activeRange: range, phaseName: phase }),
      },
    });
    let lo = left;
    let hi = right;
    while (lo < hi) {
      const before: [number, number] = [values[lo], values[hi]];
      [values[lo], values[hi]] = [values[hi], values[lo]];
      [tokens[lo], tokens[hi]] = [tokens[hi], tokens[lo]];
      tokens[lo].index = lo;
      tokens[hi].index = hi;
      swaps += 1;
      addStep({
        line: 8,
        event: "swap",
        description: `Swap mirrored positions ${lo} and ${hi}: ${before[0]} crosses with ${before[1]}. The ${phase} reversal now reads [${values.join(", ")}].`,
        activeRange: range,
        activePair: [lo, hi],
        changed: ["arr", "swaps"],
        action: {
          type: "swap",
          indices: [lo, hi],
          phase: `rotate_reverse_${phase}`,
          ...actionState({ activeRange: range, activePair: [lo, hi], phaseName: phase, swapBefore: before }),
        },
      });
      lo += 1;
      hi -= 1;
    }
    completedPhases += 1;
    return rangeStep.id;
  };

  reverseRange(0, values.length - 1, "all", 11, "First, flip the complete array so the future tail moves to the front.");
  reverseRange(0, k - 1, "prefix", 12, `Second, restore the order inside the new prefix of ${k} moved values.`);
  const finalReversalStepId = reverseRange(k, values.length - 1, "suffix", 13, "Third, restore the order of the remaining values.");

  const output = `Rotated array: [${values.join(", ")}]`;
  addStep({
    line: 14,
    event: "program_end",
    description: `Rotation complete: every original index i moved to (i + ${k}) mod ${values.length}, producing [${values.join(", ")}].`,
    output,
    changed: ["arr"],
    action: { type: "output_write", value: [...values], phase: "rotate_complete", ...actionState() },
  });
  b.prompt({
    stepId: finalReversalStepId,
    type: "choose_explanation",
    question: "Why do three reversals preserve the order inside both rotated groups?",
    target: { k },
    answer: "The second and third reversals undo each group's internal reversal",
    choices: [
      "The second and third reversals undo each group's internal reversal",
      "The array is sorted before rotating",
      "Every value is copied into a second array",
    ],
    explanation: "The full reversal moves both groups but reverses each internally; reversing each group again restores its original order.",
  });
  return b.build();
}
