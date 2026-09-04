import type { MemoryItem, TraceAction } from "../../types/trace";
import { arrayMemory, arrayVisual, TraceBuilder } from "./builders";

export const VARIABLE_WINDOW_DEFAULT = [2, 3, 1, 2, 4, 3];
export const VARIABLE_WINDOW_TARGET = 7;

export const VARIABLE_WINDOW_CODE = `arr = [2, 3, 1, 2, 4, 3]
target = 7
if not arr or target <= 0 or any(value <= 0 for value in arr): raise ValueError("use positive values")
left = 0
window_sum = 0
best_len = len(arr) + 1
best_range = None
for right, value in enumerate(arr):
    window_sum += value
    while window_sum >= target:
        if right - left + 1 < best_len:
            best_len = right - left + 1
            best_range = (left, right)
        window_sum -= arr[left]
        left += 1
answer = 0 if best_range is None else best_len
print(answer, best_range)`;

export interface VariableWindowTokenState {
  id: string;
  value: number;
  index: number;
}

type TransferKind = "add" | "remove" | null;

interface VariableWindowStateOptions {
  windowStart: number;
  windowEnd: number;
  currentSum: number;
  bestLength: number | null;
  bestRange: [number, number] | null;
  incomingIndex?: number | null;
  outgoingIndex?: number | null;
  transferKind?: TransferKind;
  transferValue?: number | null;
  sumBefore?: number | null;
  windowValid?: boolean;
  previousBestLength?: number | null;
  pointerFrom?: [number, number] | null;
  pointerTo?: [number, number] | null;
  invalidReason?: string | null;
}

function resultText(values: number[], bestLength: number | null, bestRange: [number, number] | null, target: number): string {
  if (bestLength === null || bestRange === null) return `No contiguous window reaches target ${target}`;
  const bestValues = values.slice(bestRange[0], bestRange[1] + 1);
  const bestSum = bestValues.reduce((sum, value) => sum + value, 0);
  return `Shortest window: ${JSON.stringify(bestValues)} | length = ${bestLength} | sum = ${bestSum}`;
}

/** Records the expand-until-valid, shrink-while-valid variable-window pattern. */
export function buildVariableWindowTrace(
  input: number[] = VARIABLE_WINDOW_DEFAULT,
  targetValue = VARIABLE_WINDOW_TARGET,
  code = VARIABLE_WINDOW_CODE,
  language = "python",
) {
  const values = [...input];
  const tokens: VariableWindowTokenState[] = values.map((value, index) => ({
    id: `value-${index}`,
    value,
    index,
  }));
  const b = new TraceBuilder({
    title: "Variable-Size Sliding Window",
    code,
    topic: "arrays",
    difficulty: "intermediate",
    language,
    durationSeconds: 180,
  });

  const target = targetValue;
  let left = 0;
  let right = -1;
  let currentSum = 0;
  let bestLength: number | null = null;
  let bestRange: [number, number] | null = null;
  let expansions = 0;
  let contractions = 0;
  let candidatesChecked = 0;
  let thresholdChecks = 0;
  let promptAdded = false;
  const invalidReason = values.length === 0
    ? "the array needs at least one value"
    : values.some((value) => !Number.isFinite(value) || value <= 0)
      ? "every array value must be a positive number"
      : !Number.isFinite(target) || target <= 0
        ? "target must be a positive number"
        : null;

  const variables = () => ({
    algorithm: "sliding-window-variable",
    arr: [...values],
    target,
    left: right >= 0 ? left : null,
    right: right >= 0 ? right : null,
    window_sum: currentSum,
    best_length: bestLength,
    best_range: bestRange ? [...bestRange] : null,
    expansions,
    contractions,
    candidates_checked: candidatesChecked,
    threshold_checks: thresholdChecks,
  });

  const memory = (
    windowStart: number,
    windowEnd: number,
    incomingIndex: number | null = null,
    outgoingIndex: number | null = null,
  ): MemoryItem[] => {
    const highlights: Array<{ index: number; role: string }> = [];
    if (bestRange) {
      for (let index = bestRange[0]; index <= bestRange[1]; index += 1) highlights.push({ index, role: "best-window" });
    }
    for (let index = windowStart; index <= windowEnd; index += 1) {
      if (index >= 0 && index < values.length) highlights.push({ index, role: "window" });
    }
    if (incomingIndex !== null) highlights.push({ index: incomingIndex, role: "incoming" });
    if (outgoingIndex !== null) highlights.push({ index: outgoingIndex, role: "outgoing" });
    return [arrayMemory("arr", "arr", values, highlights)];
  };

  const actionState = ({
    windowStart,
    windowEnd,
    currentSum: stateCurrentSum,
    bestLength: stateBestLength,
    bestRange: stateBestRange,
    incomingIndex = null,
    outgoingIndex = null,
    transferKind = null,
    transferValue = null,
    sumBefore = stateCurrentSum,
    windowValid = stateCurrentSum >= target,
    previousBestLength = null,
    pointerFrom = null,
    pointerTo = null,
    invalidReason: stateInvalidReason = null,
  }: VariableWindowStateOptions) => ({
    values: [...values],
    tokens: tokens.map((token) => ({ ...token })),
    threshold: target,
    windowStart,
    windowEnd,
    windowLength: windowEnd >= windowStart ? windowEnd - windowStart + 1 : 0,
    currentSum: stateCurrentSum,
    bestLength: stateBestLength,
    bestRange: stateBestRange ? [...stateBestRange] : null,
    incomingIndex,
    outgoingIndex,
    transferKind,
    transferValue,
    sumBefore,
    windowValid,
    previousBestLength,
    pointerFrom,
    pointerTo,
    invalidReason: stateInvalidReason,
    expansions,
    contractions,
    candidatesChecked,
    thresholdChecks,
  });

  const step = ({
    line,
    event,
    description,
    action,
    windowStart,
    windowEnd,
    incomingIndex = null,
    outgoingIndex = null,
    output = "",
    changed = [],
  }: {
    line: number;
    event: string;
    description: string;
    action: TraceAction;
    windowStart: number;
    windowEnd: number;
    incomingIndex?: number | null;
    outgoingIndex?: number | null;
    output?: string;
    changed?: string[];
  }) => b.step({
    line,
    event,
    description,
    variables: variables(),
    output,
    memory: memory(windowStart, windowEnd, incomingIndex, outgoingIndex),
    visual: arrayVisual("arr"),
    changed: { variables: changed, output: output !== "" },
    actions: [action],
  });

  step({
    line: 1,
    event: "program_start",
    description: `Find the shortest contiguous positive-number window whose sum reaches target ${target}. The right edge expands; the left edge only contracts after the target is met.`,
    windowStart: 0,
    windowEnd: -1,
    changed: ["arr", "target", "window_sum"],
    action: {
      type: "assignment",
      target: "arr",
      value: [...values],
      phase: "variable_window_start",
      ...actionState({ windowStart: 0, windowEnd: -1, currentSum, bestLength, bestRange }),
    },
  });

  if (invalidReason) {
    step({
      line: 3,
      event: "error",
      description: `Input rejected: ${invalidReason}. Positive values are required because removing the left value must never increase the sum.`,
      windowStart: 0,
      windowEnd: -1,
      changed: ["arr", "target"],
      action: {
        type: "condition_check",
        condition: "arr is non-empty and target > 0 and every value > 0",
        result: false,
        phase: "variable_window_invalid",
        ...actionState({ windowStart: 0, windowEnd: -1, currentSum, bestLength, bestRange, invalidReason }),
      },
    });
    return b.build();
  }

  step({
    line: 3,
    event: "condition_check",
    description: "All values and the target are positive. Expanding can only increase the sum, and shrinking can only decrease it, so two monotonic pointers are valid.",
    windowStart: 0,
    windowEnd: -1,
    action: {
      type: "condition_check",
      condition: "arr is non-empty and target > 0 and every value > 0",
      result: true,
      phase: "variable_window_validate",
      ...actionState({ windowStart: 0, windowEnd: -1, currentSum, bestLength, bestRange }),
    },
  });

  for (let index = 0; index < values.length; index += 1) {
    right = index;
    const sumBefore = currentSum;
    currentSum += values[index];
    expansions += 1;
    step({
      line: 9,
      event: "array_read",
      description: `Expand right to index ${right} and add ${values[right]}: ${sumBefore} + ${values[right]} = ${currentSum}.`,
      windowStart: left,
      windowEnd: right,
      incomingIndex: right,
      changed: ["right", "window_sum", "expansions"],
      action: {
        type: "array_read",
        index: right,
        phase: "variable_window_expand",
        ...actionState({ windowStart: left, windowEnd: right, currentSum, bestLength, bestRange, incomingIndex: right, transferKind: "add", transferValue: values[right], sumBefore }),
      },
    });

    let windowValid = currentSum >= target;
    thresholdChecks += 1;
    step({
      line: 10,
      event: "comparison",
      description: windowValid
        ? `${currentSum} reaches target ${target}. Freeze the right edge and shrink from the left to search for a shorter valid window.`
        : `${currentSum} is below target ${target}. Shrinking would only make it smaller, so the next move must expand right.`,
      windowStart: left,
      windowEnd: right,
      changed: ["threshold_checks"],
      action: {
        type: "compare",
        left: currentSum,
        right: target,
        result: windowValid,
        phase: windowValid ? "variable_window_target_met" : "variable_window_below_target",
        ...actionState({ windowStart: left, windowEnd: right, currentSum, bestLength, bestRange, windowValid }),
      },
    });

    while (windowValid) {
      const windowLength = right - left + 1;
      const previousBestLength = bestLength;
      const isNewBest = previousBestLength === null || windowLength < previousBestLength;
      if (isNewBest) {
        bestLength = windowLength;
        bestRange = [left, right];
      }
      candidatesChecked += 1;
      const candidateStep = step({
        line: isNewBest ? 12 : 11,
        event: "comparison",
        description: isNewBest
          ? `Length ${windowLength} beats ${previousBestLength ?? "no saved answer"}. Save [${left}..${right}] as the shortest valid window so far.`
          : `Length ${windowLength} cannot beat saved length ${bestLength}. Keep [${bestRange?.[0]}..${bestRange?.[1]}] as the answer so far.`,
        windowStart: left,
        windowEnd: right,
        changed: isNewBest ? ["best_length", "best_range", "candidates_checked"] : ["candidates_checked"],
        action: {
          type: "compare",
          left: windowLength,
          right: previousBestLength ?? values.length + 1,
          result: isNewBest,
          phase: isNewBest ? "variable_window_new_best" : "variable_window_keep_best",
          ...actionState({ windowStart: left, windowEnd: right, currentSum, bestLength, bestRange, windowValid: true, previousBestLength }),
        },
      });

      if (!promptAdded) {
        promptAdded = true;
        b.prompt({
          stepId: candidateStep.id,
          type: "choose_explanation",
          question: "The current window reaches the target. Why move left next?",
          target: { range: [left, right], currentSum, target },
          answer: "To test whether a shorter window still reaches the target",
          choices: [
            "To test whether a shorter window still reaches the target",
            "To make the sum larger",
            "To revisit an earlier value",
          ],
          explanation: "With positive values, removing the left edge is the only move that can shorten the window without skipping a candidate.",
        });
      }

      const outgoingIndex = left;
      const shrinkSumBefore = currentSum;
      currentSum -= values[outgoingIndex];
      contractions += 1;
      step({
        line: 14,
        event: "assignment",
        description: `Remove arr[${outgoingIndex}] = ${values[outgoingIndex]} from the left: ${shrinkSumBefore} - ${values[outgoingIndex]} = ${currentSum}.`,
        windowStart: outgoingIndex + 1,
        windowEnd: right,
        outgoingIndex,
        changed: ["window_sum", "contractions"],
        action: {
          type: "assignment",
          target: "window_sum",
          value: currentSum,
          phase: "variable_window_shrink",
          ...actionState({ windowStart: outgoingIndex + 1, windowEnd: right, currentSum, bestLength, bestRange, outgoingIndex, transferKind: "remove", transferValue: values[outgoingIndex], sumBefore: shrinkSumBefore, windowValid: currentSum >= target }),
        },
      });

      const pointerFrom: [number, number] = [outgoingIndex, right];
      left += 1;
      const pointerTo: [number, number] = [left, right];
      step({
        line: 15,
        event: "line_enter",
        description: `Advance left from ${outgoingIndex} to ${left}. Right stays at ${right}; only the window's left boundary moves.`,
        windowStart: left,
        windowEnd: right,
        changed: ["left"],
        action: {
          type: "pointer_move",
          pointer: "left",
          to: left,
          phase: "variable_window_move_left",
          ...actionState({ windowStart: left, windowEnd: right, currentSum, bestLength, bestRange, pointerFrom, pointerTo, windowValid: currentSum >= target }),
        },
      });

      windowValid = currentSum >= target;
      thresholdChecks += 1;
      step({
        line: 10,
        event: "comparison",
        description: windowValid
          ? `${currentSum} still reaches ${target}. Compare this shorter window before shrinking again.`
          : `${currentSum} fell below ${target}. Stop shrinking and resume expansion with the next right value.`,
        windowStart: left,
        windowEnd: right,
        changed: ["threshold_checks"],
        action: {
          type: "compare",
          left: currentSum,
          right: target,
          result: windowValid,
          phase: windowValid ? "variable_window_target_met" : "variable_window_below_target",
          ...actionState({ windowStart: left, windowEnd: right, currentSum, bestLength, bestRange, windowValid }),
        },
      });
    }
  }

  const output = resultText(values, bestLength, bestRange, target);
  step({
    line: 17,
    event: "program_end",
    description: bestRange
      ? `The shortest valid range is [${bestRange[0]}..${bestRange[1]}] with length ${bestLength}. Each pointer moved only forward, so the total work is O(n).`
      : `No contiguous range reaches ${target}. Both pointers still moved only forward, so the failed search is also O(n).`,
    windowStart: left,
    windowEnd: right,
    output,
    changed: ["best_length", "best_range"],
    action: {
      type: "output_write",
      value: bestRange ? { length: bestLength, range: [...bestRange], values: values.slice(bestRange[0], bestRange[1] + 1) } : null,
      phase: "variable_window_complete",
      ...actionState({ windowStart: left, windowEnd: right, currentSum, bestLength, bestRange, windowValid: currentSum >= target }),
    },
  });

  return b.build();
}
