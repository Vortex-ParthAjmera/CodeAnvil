import type { MemoryItem, TraceAction } from "../../types/trace";
import { arrayMemory, arrayVisual, TraceBuilder } from "./builders";

export const FIXED_WINDOW_DEFAULT = [2, 1, 5, 1, 3, 2];
export const FIXED_WINDOW_SIZE = 3;

export const FIXED_WINDOW_CODE = `arr = [2, 1, 5, 1, 3, 2]
k = 3
if k < 1 or k > len(arr): raise ValueError("k must fit inside arr")
window_sum = 0
for i in range(k):
    window_sum += arr[i]
best_sum = window_sum
best_left = 0
for right in range(k, len(arr)):
    window_sum -= arr[right - k]
    window_sum += arr[right]
    left = right - k + 1
    if window_sum > best_sum:
        best_sum = window_sum
        best_left = left
print(best_sum, arr[best_left:best_left + k])`;

export interface FixedWindowTokenState {
  id: string;
  value: number;
  index: number;
}

type TransferKind = "seed" | "remove" | "add" | null;

interface WindowStateOptions {
  windowStart: number;
  windowEnd: number;
  currentSum: number;
  bestSum: number | null;
  bestRange: [number, number] | null;
  outgoingIndex?: number | null;
  incomingIndex?: number | null;
  transferKind?: TransferKind;
  transferValue?: number | null;
  sumBefore?: number | null;
  processedRanges: Array<[number, number]>;
  invalidReason?: string | null;
}

function resultText(values: number[], bestSum: number, bestRange: [number, number]): string {
  return `Best window: ${JSON.stringify(values.slice(bestRange[0], bestRange[1] + 1))} | sum = ${bestSum}`;
}

/** Records maximum-sum fixed-window updates as remove, add, shift, and compare phases. */
export function buildFixedWindowTrace(
  input: number[] = FIXED_WINDOW_DEFAULT,
  windowSize = FIXED_WINDOW_SIZE,
  code = FIXED_WINDOW_CODE,
  language = "python",
) {
  const values = [...input];
  const tokens: FixedWindowTokenState[] = values.map((value, index) => ({
    id: `value-${index}`,
    value,
    index,
  }));
  const b = new TraceBuilder({
    title: "Fixed-Size Sliding Window",
    code,
    topic: "arrays",
    difficulty: "intermediate",
    language,
    durationSeconds: 150,
  });

  const k = windowSize;
  let left = 0;
  let right = -1;
  let currentSum = 0;
  let bestSum: number | null = null;
  let bestRange: [number, number] | null = null;
  let windowsChecked = 0;
  let additions = 0;
  let removals = 0;
  const processedRanges: Array<[number, number]> = [];
  const invalidReason = !Number.isInteger(k)
    ? "k must be a whole number"
    : k < 1
      ? "k must be at least 1"
      : k > values.length
        ? `k=${k} is larger than the array length ${values.length}`
        : null;

  const variables = () => ({
    algorithm: "sliding-window-fixed",
    arr: [...values],
    k,
    left: right >= 0 ? left : null,
    right: right >= 0 ? right : null,
    window_sum: currentSum,
    best_sum: bestSum,
    best_range: bestRange ? [...bestRange] : null,
    windows_checked: windowsChecked,
    additions,
    removals,
  });

  const memory = (
    windowStart: number,
    windowEnd: number,
    outgoingIndex: number | null = null,
    incomingIndex: number | null = null,
  ): MemoryItem[] => {
    const highlights: Array<{ index: number; role: string }> = [];
    for (let index = windowStart; index <= windowEnd; index += 1) {
      if (index >= 0 && index < values.length) highlights.push({ index, role: "window" });
    }
    if (bestRange) {
      for (let index = bestRange[0]; index <= bestRange[1]; index += 1) highlights.push({ index, role: "best-window" });
    }
    if (outgoingIndex !== null) highlights.push({ index: outgoingIndex, role: "outgoing" });
    if (incomingIndex !== null) highlights.push({ index: incomingIndex, role: "incoming" });
    return [arrayMemory("arr", "arr", values, highlights)];
  };

  const actionState = ({
    windowStart,
    windowEnd,
    currentSum: stateCurrentSum,
    bestSum: stateBestSum,
    bestRange: stateBestRange,
    outgoingIndex = null,
    incomingIndex = null,
    transferKind = null,
    transferValue = null,
    sumBefore = stateCurrentSum,
    processedRanges: stateProcessedRanges,
    invalidReason: stateInvalidReason = null,
  }: WindowStateOptions) => ({
    values: [...values],
    tokens: tokens.map((token) => ({ ...token })),
    windowSize: k,
    windowStart,
    windowEnd,
    currentSum: stateCurrentSum,
    bestSum: stateBestSum,
    bestRange: stateBestRange ? [...stateBestRange] : null,
    outgoingIndex,
    incomingIndex,
    transferKind,
    transferValue,
    sumBefore,
    processedRanges: stateProcessedRanges.map((range) => [...range]),
    invalidReason: stateInvalidReason,
    windowsChecked,
    additions,
    removals,
  });

  const step = ({
    line,
    event,
    description,
    action,
    windowStart,
    windowEnd,
    outgoingIndex = null,
    incomingIndex = null,
    output = "",
    changed = [],
  }: {
    line: number;
    event: string;
    description: string;
    action: TraceAction;
    windowStart: number;
    windowEnd: number;
    outgoingIndex?: number | null;
    incomingIndex?: number | null;
    output?: string;
    changed?: string[];
  }) => b.step({
    line,
    event,
    description,
    variables: variables(),
    output,
    memory: memory(windowStart, windowEnd, outgoingIndex, incomingIndex),
    visual: arrayVisual("arr"),
    changed: { variables: changed, output: output !== "" },
    actions: [action],
  });

  step({
    line: 1,
    event: "program_start",
    description: `Find the maximum sum among every contiguous window of exactly k=${k}. Reuse the previous sum instead of adding all k values again.`,
    windowStart: 0,
    windowEnd: -1,
    changed: ["arr", "k", "window_sum"],
    action: {
      type: "assignment",
      target: "arr",
      value: [...values],
      phase: "window_start",
      ...actionState({ windowStart: 0, windowEnd: -1, currentSum, bestSum, bestRange, processedRanges }),
    },
  });

  if (invalidReason) {
    step({
      line: 3,
      event: "error",
      description: `Input rejected: ${invalidReason}. No partial or resized window was invented.`,
      windowStart: 0,
      windowEnd: -1,
      changed: ["k"],
      action: {
        type: "condition_check",
        condition: "1 <= k <= len(arr) and k is an integer",
        result: false,
        phase: "window_invalid",
        ...actionState({ windowStart: 0, windowEnd: -1, currentSum, bestSum, bestRange, processedRanges, invalidReason }),
      },
    });
    return b.build();
  }

  step({
    line: 3,
    event: "condition_check",
    description: `k=${k} fits inside ${values.length} values, so every visualized window will contain exactly ${k} contiguous items.`,
    windowStart: 0,
    windowEnd: -1,
    changed: [],
    action: {
      type: "condition_check",
      condition: "1 <= k <= len(arr) and k is an integer",
      result: true,
      phase: "window_validate",
      ...actionState({ windowStart: 0, windowEnd: -1, currentSum, bestSum, bestRange, processedRanges }),
    },
  });

  for (let index = 0; index < k; index += 1) {
    const sumBefore = currentSum;
    currentSum += values[index];
    right = index;
    additions += 1;
    step({
      line: 6,
      event: "assignment",
      description: `Seed the first window with arr[${index}] = ${values[index]}: ${sumBefore} + ${values[index]} = ${currentSum}.`,
      windowStart: 0,
      windowEnd: index,
      incomingIndex: index,
      changed: ["right", "window_sum", "additions"],
      action: {
        type: "assignment",
        target: "window_sum",
        value: currentSum,
        phase: "window_seed_add",
        ...actionState({ windowStart: 0, windowEnd: index, currentSum, bestSum, bestRange, incomingIndex: index, transferKind: "seed", transferValue: values[index], sumBefore, processedRanges }),
      },
    });
  }

  bestSum = currentSum;
  bestRange = [0, k - 1];
  windowsChecked = 1;
  processedRanges.push([0, k - 1]);
  const seedStep = step({
    line: 7,
    event: "assignment",
    description: `The first full window [0..${k - 1}] sums to ${currentSum}. It becomes the initial best to beat.`,
    windowStart: 0,
    windowEnd: k - 1,
    changed: ["best_sum", "best_range", "windows_checked"],
    action: {
      type: "assignment",
      target: "best_sum",
      value: bestSum,
      phase: "window_seed_complete",
      ...actionState({ windowStart: 0, windowEnd: k - 1, currentSum, bestSum, bestRange, processedRanges }),
    },
  });
  b.prompt({
    stepId: seedStep.id,
    type: "choose_explanation",
    question: "How should the next window sum be computed?",
    target: { currentSum, range: [0, k - 1], k },
    answer: "Subtract the outgoing value, then add the incoming value",
    choices: ["Subtract the outgoing value, then add the incoming value", "Add all k values again", "Move only the right edge"],
    explanation: "Adjacent fixed-size windows share k-1 values, so only two values change.",
  });

  for (let incomingIndex = k; incomingIndex < values.length; incomingIndex += 1) {
    const outgoingIndex = left;
    const oldRight = right;
    let sumBefore = currentSum;
    currentSum -= values[outgoingIndex];
    removals += 1;
    step({
      line: 10,
      event: "assignment",
      description: `Remove outgoing arr[${outgoingIndex}] = ${values[outgoingIndex]}: ${sumBefore} - ${values[outgoingIndex]} = ${currentSum}.`,
      windowStart: outgoingIndex + 1,
      windowEnd: oldRight,
      outgoingIndex,
      changed: ["window_sum", "removals"],
      action: {
        type: "assignment",
        target: "window_sum",
        value: currentSum,
        phase: "window_remove",
        ...actionState({ windowStart: outgoingIndex + 1, windowEnd: oldRight, currentSum, bestSum, bestRange, outgoingIndex, transferKind: "remove", transferValue: values[outgoingIndex], sumBefore, processedRanges }),
      },
    });

    sumBefore = currentSum;
    currentSum += values[incomingIndex];
    additions += 1;
    step({
      line: 11,
      event: "assignment",
      description: `Add incoming arr[${incomingIndex}] = ${values[incomingIndex]}: ${sumBefore} + ${values[incomingIndex]} = ${currentSum}.`,
      windowStart: outgoingIndex + 1,
      windowEnd: incomingIndex,
      incomingIndex,
      changed: ["window_sum", "additions"],
      action: {
        type: "assignment",
        target: "window_sum",
        value: currentSum,
        phase: "window_add",
        ...actionState({ windowStart: outgoingIndex + 1, windowEnd: incomingIndex, currentSum, bestSum, bestRange, incomingIndex, transferKind: "add", transferValue: values[incomingIndex], sumBefore, processedRanges }),
      },
    });

    const pointerFrom: [number, number] = [left, right];
    left += 1;
    right = incomingIndex;
    const pointerTo: [number, number] = [left, right];
    step({
      line: 12,
      event: "pointer_move",
      description: `Shift the fixed frame from [${pointerFrom[0]}..${pointerFrom[1]}] to [${left}..${right}]. Its width remains exactly k=${k}.`,
      windowStart: left,
      windowEnd: right,
      changed: ["left", "right"],
      action: {
        type: "pointer_move",
        pointer: "window",
        to: [left, right],
        phase: "window_shift",
        pointerFrom,
        pointerTo,
        ...actionState({ windowStart: left, windowEnd: right, currentSum, bestSum, bestRange, processedRanges }),
      },
    });

    const previousBest = bestSum;
    const isNewBest = previousBest === null || currentSum > previousBest;
    if (isNewBest) {
      bestSum = currentSum;
      bestRange = [left, right];
    }
    windowsChecked += 1;
    processedRanges.push([left, right]);
    step({
      line: 13,
      event: "comparison",
      description: isNewBest
        ? `${currentSum} beats ${previousBest}. Promote [${left}..${right}] as the new best window.`
        : `${currentSum} does not beat ${previousBest}. Keep best window [${bestRange?.[0]}..${bestRange?.[1]}].`,
      windowStart: left,
      windowEnd: right,
      changed: isNewBest ? ["best_sum", "best_range", "windows_checked"] : ["windows_checked"],
      action: {
        type: "compare",
        left: currentSum,
        right: previousBest,
        result: isNewBest,
        phase: isNewBest ? "window_new_best" : "window_keep_best",
        previousBest,
        ...actionState({ windowStart: left, windowEnd: right, currentSum, bestSum, bestRange, processedRanges }),
      },
    });
  }

  const finalBest = bestSum ?? 0;
  const finalRange = bestRange ?? [0, Math.max(0, k - 1)] as [number, number];
  currentSum = finalBest;
  const output = resultText(values, finalBest, finalRange);
  step({
    line: 16,
    event: "program_end",
    description: `Checked all ${windowsChecked} fixed-size windows. [${finalRange[0]}..${finalRange[1]}] has the maximum sum ${finalBest} in O(n) time.`,
    windowStart: finalRange[0],
    windowEnd: finalRange[1],
    output,
    changed: ["best_sum", "best_range"],
    action: {
      type: "output_write",
      value: { sum: finalBest, range: [...finalRange], values: values.slice(finalRange[0], finalRange[1] + 1) },
      phase: "window_complete",
      ...actionState({ windowStart: finalRange[0], windowEnd: finalRange[1], currentSum, bestSum: finalBest, bestRange: finalRange, processedRanges }),
    },
  });

  return b.build();
}
