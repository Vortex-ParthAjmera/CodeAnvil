import type { TraceDocument } from "../../types/trace";
import { arrayMemory, arrayVisual, TraceBuilder } from "./builders";

export const KADANE_CODE = `arr = [-2, 1, -3, 4, -1, 2, 1, -5, 4]
current_sum = arr[0]
best_sum = arr[0]
current_start = 0
best_start = best_end = 0
for i in range(1, len(arr)):
    if arr[i] > current_sum + arr[i]:
        current_sum = arr[i]
        current_start = i
    else:
        current_sum = current_sum + arr[i]
    if current_sum > best_sum:
        best_sum = current_sum
        best_start, best_end = current_start, i
print("Max subarray:", best_sum)`;

const DEFAULT_VALUES = [-2, 1, -3, 4, -1, 2, 1, -5, 4];

/**
 * Builds Kadane's algorithm as explicit choose/apply/best phases. The trace
 * never asks the renderer to infer whether the running range restarted or
 * extended, which keeps custom and all-negative inputs truthful.
 */
export function buildKadaneTrace(
  input: number[] = DEFAULT_VALUES,
  code = KADANE_CODE,
  language = "python",
): TraceDocument {
  const values = input.length > 0 ? [...input] : [0];
  const b = new TraceBuilder({
    title: "Kadane's Algorithm",
    code,
    topic: "arrays",
    difficulty: "intermediate",
    language,
    durationSeconds: 120,
  });

  let currentSum = values[0];
  let bestSum = values[0];
  let currentStart = 0;
  let currentEnd = 0;
  let bestStart = 0;
  let bestEnd = 0;
  let decisionChecks = 0;
  let bestChecks = 0;

  const variables = (i: number, decision: string) => ({
    algorithm: "kadane",
    arr: `[${values.join(", ")}]`,
    i,
    current_value: values[i],
    current_sum: currentSum,
    current_start: currentStart,
    current_end: currentEnd,
    best_sum: bestSum,
    best_start: bestStart,
    best_end: bestEnd,
    decision,
    decision_checks: decisionChecks,
    best_checks: bestChecks,
  });

  const memory = (activeIndex: number) => {
    const highlights: Array<{ index: number; role: string }> = [];
    for (let index = bestStart; index <= bestEnd; index++) {
      highlights.push({ index, role: "best" });
    }
    for (let index = currentStart; index <= currentEnd; index++) {
      highlights.push({ index, role: "current-range" });
    }
    if (activeIndex >= 0 && activeIndex < values.length) {
      highlights.push({ index: activeIndex, role: "reading" });
    }
    return [arrayMemory("arr", "arr", [...values], highlights)];
  };

  const actionState = (activeIndex: number) => ({
    activeIndex,
    currentStart,
    currentEnd,
    bestStart,
    bestEnd,
    currentSum,
    bestSum,
    decisionChecks,
    bestChecks,
    values: [...values],
  });

  b.step({
    line: 2,
    event: "program_start",
    description: `Initialize both sums with arr[0] = ${values[0]}. This works even when every value is negative.`,
    variables: variables(0, "initialize"),
    memory: memory(0),
    visual: arrayVisual("arr"),
    changed: { variables: ["current_sum", "best_sum", "current_start", "best_start", "best_end"] },
    actions: [{
      type: "assignment",
      phase: "kadane_start",
      target: "current_sum",
      value: currentSum,
      ...actionState(0),
    }],
  });

  for (let i = 1; i < values.length; i++) {
    const value = values[i];
    const previousCurrentSum = currentSum;
    const previousCurrentStart = currentStart;
    const previousCurrentEnd = currentEnd;
    const extendedSum = previousCurrentSum + value;
    const shouldRestart = value > extendedSum;
    decisionChecks += 1;

    const choiceStep = b.step({
      line: 7,
      event: "comparison",
      description: shouldRestart
        ? `At index ${i}, starting fresh gives ${value}, while extending gives ${previousCurrentSum} + ${value} = ${extendedSum}. Restart because ${value} is larger.`
        : `At index ${i}, starting fresh gives ${value}, while extending gives ${previousCurrentSum} + ${value} = ${extendedSum}. Extend because ${extendedSum} is at least as strong.`,
      variables: variables(i, shouldRestart ? "restart" : "extend"),
      memory: memory(i),
      visual: arrayVisual("arr"),
      changed: { variables: ["i", "current_value", "decision", "decision_checks"] },
      actions: [{
        type: "compare",
        phase: "kadane_choice",
        left: value,
        right: extendedSum,
        result: shouldRestart,
        previousCurrentSum,
        previousCurrentStart,
        previousCurrentEnd,
        extendedSum,
        shouldRestart,
        ...actionState(i),
      }],
    });

    if (i === 1) {
      b.prompt({
        stepId: choiceStep.id,
        type: "choose_explanation",
        question: `At index ${i}, should the running subarray restart at ${value} or extend the previous sum?`,
        target: { decision: shouldRestart ? "restart" : "extend" },
        answer: shouldRestart ? "Restart here" : "Extend the run",
        choices: ["Restart here", "Extend the run"],
        explanation: `Compare ${value} with ${previousCurrentSum} + ${value} = ${extendedSum}; keep the larger option.`,
      });
    }

    if (shouldRestart) {
      currentSum = value;
      currentStart = i;
      currentEnd = i;
    } else {
      currentSum = extendedSum;
      currentEnd = i;
    }

    b.step({
      line: shouldRestart ? 8 : 11,
      event: "assignment",
      description: shouldRestart
        ? `Discard the weaker range [${previousCurrentStart}..${previousCurrentEnd}]. A new running subarray starts and ends at index ${i} with sum ${currentSum}.`
        : `Extend the running subarray through index ${i}. Its range is now [${currentStart}..${currentEnd}] and its sum becomes ${currentSum}.`,
      variables: variables(i, shouldRestart ? "restart" : "extend"),
      memory: memory(i),
      visual: arrayVisual("arr"),
      changed: { variables: ["current_sum", "current_start", "current_end"] },
      actions: [{
        type: "assignment",
        phase: shouldRestart ? "kadane_restart" : "kadane_extend",
        target: "current_sum",
        value: currentSum,
        previousCurrentSum,
        previousCurrentStart,
        previousCurrentEnd,
        extendedSum,
        shouldRestart,
        ...actionState(i),
      }],
    });

    const previousBestSum = bestSum;
    const previousBestStart = bestStart;
    const previousBestEnd = bestEnd;
    const improvesBest = currentSum > bestSum;
    bestChecks += 1;

    if (improvesBest) {
      bestSum = currentSum;
      bestStart = currentStart;
      bestEnd = currentEnd;
    }

    const bestStep = b.step({
      line: improvesBest ? 13 : 12,
      event: improvesBest ? "assignment" : "comparison",
      description: improvesBest
        ? `${currentSum} beats the previous best ${previousBestSum}. Copy the running range [${currentStart}..${currentEnd}] into the best-so-far record.`
        : `${currentSum} does not beat the best sum ${bestSum}. Keep the best range [${bestStart}..${bestEnd}] unchanged.`,
      variables: variables(i, improvesBest ? "new-best" : "keep-best"),
      memory: memory(i),
      visual: arrayVisual("arr"),
      changed: { variables: improvesBest ? ["best_sum", "best_start", "best_end", "best_checks"] : ["best_checks"] },
      actions: [improvesBest
        ? {
            type: "assignment",
            phase: "kadane_best_update",
            target: "best_sum",
            value: bestSum,
            previousBestSum,
            previousBestStart,
            previousBestEnd,
            improvesBest,
            ...actionState(i),
          }
        : {
            type: "compare",
            phase: "kadane_best_hold",
            left: currentSum,
            right: bestSum,
            result: false,
            previousBestSum,
            previousBestStart,
            previousBestEnd,
            improvesBest,
            ...actionState(i),
          }],
    });

    if (i === 1 && improvesBest) {
      b.prompt({
        stepId: bestStep.id,
        type: "predict_variable",
        question: `The running sum is ${currentSum} and the stored best is ${previousBestSum}. What becomes the new best_sum?`,
        target: { variable: "best_sum" },
        answer: String(currentSum),
        choices: [...new Set([String(currentSum), String(previousBestSum), String(value), String(extendedSum)])],
        explanation: `${currentSum} > ${previousBestSum}, so best_sum is updated to ${currentSum}.`,
      });
    }
  }

  b.step({
    line: 15,
    event: "program_end",
    description: `The scan is complete. The maximum-sum subarray is [${bestStart}..${bestEnd}] = [${values.slice(bestStart, bestEnd + 1).join(", ")}] with sum ${bestSum}.`,
    variables: variables(values.length - 1, "complete"),
    output: `Max subarray: ${bestSum}`,
    memory: memory(-1),
    visual: arrayVisual("arr"),
    changed: { output: true },
    actions: [{
      type: "output_write",
      phase: "kadane_complete",
      value: bestSum,
      ...actionState(values.length - 1),
    }],
  });

  return b.build();
}
