import type { TraceDocument } from "../../types/trace";
import { arrayMemory, arrayVisual, TraceBuilder } from "./builders";

export const MIN_ARRAY_CODE = `arr = [7, 4, 9, 1, 5]
min_val = arr[0]
min_idx = 0
for i in range(1, len(arr)):
    if arr[i] < min_val:
        min_val = arr[i]
        min_idx = i
print("Min:", min_val)`;

const DEFAULT_VALUES = [7, 4, 9, 1, 5];

function uniqueChoices(correct: number, values: number[]): string[] {
  const candidates = [correct, ...values, correct - 1, correct + 1];
  return [...new Set(candidates)].slice(0, 4).map(String);
}

/**
 * Builds an explicit minimum-scan trace. Each step says whether the scanner is
 * moving, comparing, or transferring ownership to a new minimum candidate so
 * the renderer never has to infer motion from prose.
 */
export function buildMinArrayTrace(
  input: number[] = DEFAULT_VALUES,
  code = MIN_ARRAY_CODE,
  language = "python",
): TraceDocument {
  const values = input.length > 0 ? [...input] : [0];
  const b = new TraceBuilder({
    title: "Min in Array",
    code,
    topic: "arrays",
    difficulty: "beginner",
    language,
    durationSeconds: 75,
  });

  let minValue = values[0];
  let minIndex = 0;
  let comparisons = 0;
  const candidateHistory = [0];

  const variables = (i: number, checkedThrough: number) => ({
    algorithm: "min-array",
    arr: `[${values.join(", ")}]`,
    i,
    current: values[i],
    min_val: minValue,
    min_idx: minIndex,
    comparisons,
    checked_through: checkedThrough,
    candidate_history: [...candidateHistory],
  });

  const memory = (currentIndex: number, checkedThrough: number) => {
    const highlights: Array<{ index: number; role: string }> = [];
    for (let index = 0; index <= checkedThrough; index++) {
      if (index !== currentIndex && index !== minIndex) {
        highlights.push({ index, role: "checked" });
      }
    }
    if (currentIndex >= 0) highlights.push({ index: currentIndex, role: "reading" });
    highlights.push({ index: minIndex, role: "min" });
    return [arrayMemory("arr", "arr", values, highlights)];
  };

  b.step({
    line: 2,
    event: "program_start",
    description: `Use arr[0] = ${minValue} as the first minimum candidate. Every later value must beat this candidate to replace it.`,
    variables: variables(0, 0),
    memory: memory(0, 0),
    visual: arrayVisual("arr"),
    changed: { variables: ["min_val", "min_idx"] },
    actions: [{
      type: "array_read",
      phase: "min_start",
      index: 0,
      currentIndex: 0,
      candidateIndex: 0,
      checkedThrough: 0,
      candidateHistory: [...candidateHistory],
    }],
  });

  for (let i = 1; i < values.length; i++) {
    const value = values[i];

    b.step({
      line: 4,
      event: "loop_iteration",
      description: `Move the scanner to index ${i}. Read arr[${i}] = ${value}; the current minimum is ${minValue} at index ${minIndex}.`,
      variables: variables(i, i - 1),
      memory: memory(i, i - 1),
      visual: arrayVisual("arr"),
      changed: { variables: ["i", "current"] },
      actions: [{
        type: "array_read",
        phase: "min_scan",
        index: i,
        currentIndex: i,
        candidateIndex: minIndex,
        checkedThrough: i - 1,
        candidateHistory: [...candidateHistory],
      }],
    });

    comparisons += 1;
    const previousMin = minValue;
    const previousIndex = minIndex;
    const becomesMinimum = value < minValue;

    b.step({
      line: 5,
      event: "comparison",
      description: becomesMinimum
        ? `${value} < ${minValue} is true. This value becomes the new minimum candidate.`
        : `${value} < ${minValue} is false. Keep ${minValue} as the minimum candidate.`,
      variables: variables(i, i),
      memory: memory(i, i),
      visual: arrayVisual("arr"),
      changed: { variables: ["comparisons"] },
      actions: [{
        type: "compare",
        phase: "min_compare",
        indices: [i, minIndex],
        values: [value, minValue],
        result: becomesMinimum,
        currentIndex: i,
        candidateIndex: minIndex,
        checkedThrough: i,
        candidateHistory: [...candidateHistory],
      }],
    });

    if (!becomesMinimum) continue;

    minValue = value;
    minIndex = i;
    candidateHistory.push(i);
    b.step({
      line: 6,
      event: "assignment",
      description: `Transfer the minimum marker from index ${previousIndex} to index ${i}: min_val changes from ${previousMin} to ${minValue}.`,
      variables: variables(i, i),
      memory: memory(i, i),
      visual: arrayVisual("arr"),
      changed: { variables: ["min_val", "min_idx"] },
      actions: [{
        type: "assignment",
        phase: "min_update",
        target: "min_val",
        before: previousMin,
        value: minValue,
        previousCandidateIndex: previousIndex,
        currentIndex: i,
        candidateIndex: minIndex,
        checkedThrough: i,
        candidateHistory: [...candidateHistory],
      }],
    });
  }

  const finalIndex = values.length - 1;
  b.step({
    line: 8,
    event: "program_end",
    description: `The scan is complete. ${minValue} at index ${minIndex} survived every comparison, so it is the minimum.`,
    variables: variables(finalIndex, finalIndex),
    output: `Min: ${minValue}`,
    memory: memory(-1, finalIndex),
    visual: arrayVisual("arr"),
    changed: { output: true },
    actions: [{
      type: "output_write",
      phase: "min_complete",
      value: `Min: ${minValue}`,
      candidateIndex: minIndex,
      checkedThrough: finalIndex,
      candidateHistory: [...candidateHistory],
    }],
  });

  const comparisonStep = b.steps.find(
    (step) => step.actions?.some((action) => action.phase === "min_compare"),
  );
  if (comparisonStep) {
    const action = comparisonStep.actions?.[0];
    const operands = Array.isArray(action?.values) ? action.values : [];
    const result = action?.result === true ? "yes" : "no";
    b.prompt({
      stepId: comparisonStep.id,
      type: "predict_condition",
      question: `Is ${String(operands[0])} smaller than the current minimum ${String(operands[1])}?`,
      target: { condition: result },
      answer: result,
      choices: ["yes", "no"],
      explanation: `${String(operands[0])} < ${String(operands[1])} is ${result === "yes" ? "true" : "false"}.`,
    });
  }

  const finalComparison = [...b.steps].reverse().find(
    (step) => step.actions?.some((action) => action.phase === "min_compare"),
  );
  if (finalComparison) {
    b.prompt({
      stepId: finalComparison.id,
      type: "predict_output",
      question: "Which value remains after the scanner checks the full array?",
      target: { variable: "min_val" },
      answer: String(minValue),
      choices: uniqueChoices(minValue, values),
      explanation: `${minValue} is the smallest value in [${values.join(", ")}].`,
    });
  }

  return b.build();
}
