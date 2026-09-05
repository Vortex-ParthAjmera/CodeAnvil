import type { MemoryItem, TraceAction } from "../../types/trace";
import { arrayMemory, arrayVisual, TraceBuilder } from "./builders";

export const DIFFERENCE_ARRAY_DEFAULT = [2, 1, 3, 2, 4, 1];
export const DIFFERENCE_ARRAY_LEFT = 1;
export const DIFFERENCE_ARRAY_RIGHT = 4;
export const DIFFERENCE_ARRAY_DELTA = 3;

function signed(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

export const DIFFERENCE_ARRAY_CODE = `arr = [2, 1, 3, 2, 4, 1]
left, right, delta = 1, 4, 3
if not arr or not (0 <= left <= right < len(arr)): raise ValueError("range must fit inside arr")
diff = [0] * len(arr)
diff[0] = arr[0]
for i in range(1, len(arr)):
    diff[i] = arr[i] - arr[i - 1]
diff[left] += delta
if right + 1 < len(arr):
    diff[right + 1] -= delta
result = [0] * len(arr)
running = 0
for i in range(len(arr)):
    running += diff[i]
    result[i] = running
print(result)`;

export interface DifferenceTokenState {
  id: string;
  value: number;
  index: number;
}

type BoundaryKind = "start" | "stop" | "open-end" | null;

interface DifferenceStateOptions {
  builtThrough: number;
  reconstructedThrough: number;
  activeIndex?: number | null;
  sourceIndices?: [number, number] | null;
  boundaryIndex?: number | null;
  boundaryKind?: BoundaryKind;
  diffBefore?: number | null;
  diffAfter?: number | null;
  runningBefore?: number | null;
  runningAfter?: number | null;
  invalidReason?: string | null;
}

/** Builds a difference rail, edits two boundaries, then reconstructs the updated array. */
export function buildDifferenceArrayTrace(
  input: number[] = DIFFERENCE_ARRAY_DEFAULT,
  rangeLeft = DIFFERENCE_ARRAY_LEFT,
  rangeRight = DIFFERENCE_ARRAY_RIGHT,
  delta = DIFFERENCE_ARRAY_DELTA,
  code = DIFFERENCE_ARRAY_CODE,
  language = "python",
) {
  const values = [...input];
  const diff: Array<number | null> = Array.from({ length: values.length }, () => null);
  const result: Array<number | null> = Array.from({ length: values.length }, () => null);
  const tokens: DifferenceTokenState[] = values.map((value, index) => ({ id: `value-${index}`, value, index }));
  const b = new TraceBuilder({
    title: "Difference Array Range Update",
    code,
    topic: "arrays",
    difficulty: "intermediate",
    language,
    durationSeconds: 155,
  });

  const left = rangeLeft;
  const right = rangeRight;
  const guardIndex = right + 1;
  let builtThrough = -1;
  let reconstructedThrough = -1;
  let boundaryEdits = 0;
  let reconstructionAdds = 0;
  let running = 0;
  const invalidReason = values.length === 0
    ? "the array needs at least one value"
    : values.some((value) => !Number.isFinite(value))
      ? "every array value must be finite"
      : !Number.isInteger(left) || !Number.isInteger(right)
        ? "range boundaries must be whole-number indices"
        : left < 0 || right < left || right >= values.length
          ? `range [${left}..${right}] must satisfy 0 <= left <= right < ${values.length}`
          : !Number.isFinite(delta)
            ? "delta must be a finite number"
            : null;

  const variables = () => ({
    algorithm: "difference-array",
    arr: [...values],
    left,
    right,
    delta,
    diff: [...diff],
    result: [...result],
    running,
    built_through: builtThrough,
    reconstructed_through: reconstructedThrough,
    boundary_edits: boundaryEdits,
    reconstruction_adds: reconstructionAdds,
  });

  const memory = ({
    activeIndex = null,
    sourceIndices = null,
    boundaryIndex = null,
    boundaryKind = null,
  }: {
    activeIndex?: number | null;
    sourceIndices?: [number, number] | null;
    boundaryIndex?: number | null;
    boundaryKind?: BoundaryKind;
  } = {}): MemoryItem[] => {
    const arrayHighlights: Array<{ index: number; role: string }> = [];
    const diffHighlights: Array<{ index: number; role: string }> = [];
    const resultHighlights: Array<{ index: number; role: string }> = [];

    for (let index = left; index <= right; index += 1) {
      if (index >= 0 && index < values.length) arrayHighlights.push({ index, role: "update-range" });
    }
    sourceIndices?.forEach((index) => arrayHighlights.push({ index, role: "source" }));
    for (let index = 0; index <= builtThrough; index += 1) diffHighlights.push({ index, role: "built" });
    for (let index = 0; index <= reconstructedThrough; index += 1) {
      diffHighlights.push({ index, role: "consumed" });
      resultHighlights.push({ index, role: index >= left && index <= right ? "updated" : "unchanged" });
    }
    if (activeIndex !== null) {
      diffHighlights.push({ index: activeIndex, role: "active" });
      resultHighlights.push({ index: activeIndex, role: "writing" });
    }
    if (boundaryIndex !== null && boundaryIndex >= 0 && boundaryIndex < values.length) {
      diffHighlights.push({ index: boundaryIndex, role: boundaryKind === "start" ? "range-start" : "range-stop" });
    }
    return [
      arrayMemory("arr", "original", values, arrayHighlights),
      arrayMemory("diff", "difference", diff, diffHighlights),
      arrayMemory("result", "rebuilt", result, resultHighlights),
    ];
  };

  const actionState = ({
    builtThrough: stateBuiltThrough,
    reconstructedThrough: stateReconstructedThrough,
    activeIndex = null,
    sourceIndices = null,
    boundaryIndex = null,
    boundaryKind = null,
    diffBefore = null,
    diffAfter = null,
    runningBefore = null,
    runningAfter = null,
    invalidReason: stateInvalidReason = null,
  }: DifferenceStateOptions) => ({
    values: [...values],
    tokens: tokens.map((token) => ({ ...token })),
    diff: [...diff],
    diffTokens: diff.map((value, index) => ({ id: `diff-${index}`, value, index })),
    rebuilt: [...result],
    resultTokens: result.map((value, index) => ({ id: `result-${index}`, value, index })),
    rangeStart: left,
    rangeEnd: right,
    delta,
    guardIndex,
    builtThrough: stateBuiltThrough,
    reconstructedThrough: stateReconstructedThrough,
    activeIndex,
    sourceIndices: sourceIndices ? [...sourceIndices] : null,
    boundaryIndex,
    boundaryKind,
    diffBefore,
    diffAfter,
    runningBefore,
    runningAfter,
    invalidReason: stateInvalidReason,
    boundaryEdits,
    reconstructionAdds,
  });

  const addStep = ({
    line,
    event,
    description,
    action,
    activeIndex = null,
    sourceIndices = null,
    boundaryIndex = null,
    boundaryKind = null,
    output = "",
    changed = [],
  }: {
    line: number;
    event: string;
    description: string;
    action: TraceAction;
    activeIndex?: number | null;
    sourceIndices?: [number, number] | null;
    boundaryIndex?: number | null;
    boundaryKind?: BoundaryKind;
    output?: string;
    changed?: string[];
  }) => b.step({
    line,
    event,
    description,
    variables: variables(),
    output,
    memory: memory({ activeIndex, sourceIndices, boundaryIndex, boundaryKind }),
    visual: arrayVisual("arr"),
    changed: { variables: changed, output: output !== "" },
    actions: [action],
  });

  addStep({
    line: 1,
    event: "program_start",
    description: `Apply ${signed(delta)} to arr[${left}..${right}] without rewriting every value in that interval. The difference rail will store only where the change starts and stops.`,
    changed: ["arr", "left", "right", "delta", "diff", "result"],
    action: {
      type: "assignment",
      target: "arr",
      value: [...values],
      phase: "difference_start",
      ...actionState({ builtThrough, reconstructedThrough }),
    },
  });

  if (invalidReason) {
    addStep({
      line: 3,
      event: "error",
      description: `Input rejected: ${invalidReason}. No boundary update or reconstructed value was fabricated.`,
      changed: ["left", "right", "delta"],
      action: {
        type: "condition_check",
        condition: "arr is non-empty and 0 <= left <= right < len(arr) and delta is finite",
        result: false,
        phase: "difference_invalid",
        ...actionState({ builtThrough, reconstructedThrough, invalidReason }),
      },
    });
    return b.build();
  }

  addStep({
    line: 3,
    event: "condition_check",
    description: `Range [${left}..${right}] is valid. A ${signed(delta)} marker at ${left} turns the update on; its inverse ${signed(-delta)} at ${guardIndex} turns it off when that index exists.`,
    action: {
      type: "condition_check",
      condition: "arr is non-empty and 0 <= left <= right < len(arr) and delta is finite",
      result: true,
      phase: "difference_validate",
      ...actionState({ builtThrough, reconstructedThrough }),
    },
  });

  for (let index = 0; index < values.length; index += 1) {
    const before = index === 0 ? 0 : values[index - 1];
    const current = values[index];
    const difference = index === 0 ? current : current - before;
    diff[index] = difference;
    builtThrough = index;
    addStep({
      line: index === 0 ? 5 : 7,
      event: "array_write",
      description: index === 0
        ? `Anchor diff[0] = arr[0] = ${difference}. This is the first absolute value; later slots store only changes.`
        : `Write diff[${index}] = arr[${index}] - arr[${index - 1}] = ${current} - ${before} = ${difference}.`,
      activeIndex: index,
      sourceIndices: index === 0 ? [0, 0] : [index - 1, index],
      changed: ["diff", "built_through"],
      action: {
        type: "array_write",
        target: "diff",
        index,
        value: difference,
        phase: index === 0 ? "difference_seed" : "difference_build",
        ...actionState({
          builtThrough,
          reconstructedThrough,
          activeIndex: index,
          sourceIndices: index === 0 ? [0, 0] : [index - 1, index],
          diffBefore: null,
          diffAfter: difference,
        }),
      },
    });
  }

  const startBefore = diff[left] ?? 0;
  const startAfter = startBefore + delta;
  diff[left] = startAfter;
  boundaryEdits += 1;
  const startStep = addStep({
    line: 8,
    event: "assignment",
    description: `Turn the range update on at ${left}: diff[${left}] changes from ${startBefore} to ${startAfter} by applying ${signed(delta)}.`,
    boundaryIndex: left,
    boundaryKind: "start",
    changed: ["diff", "boundary_edits"],
    action: {
      type: "assignment",
      target: `diff[${left}]`,
      value: startAfter,
      phase: "difference_mark_start",
      ...actionState({ builtThrough, reconstructedThrough, boundaryIndex: left, boundaryKind: "start", diffBefore: startBefore, diffAfter: startAfter }),
    },
  });
  b.prompt({
    stepId: startStep.id,
    type: "choose_explanation",
    question: `Why is ${signed(delta)} placed only at index ${left}?`,
    target: { left, right, delta },
    answer: "A later prefix scan carries the change forward",
    choices: [
      "A later prefix scan carries the change forward",
      "Only the first value should change",
      "The array is already sorted",
    ],
    explanation: "Each reconstructed value includes every difference marker at or before its index.",
  });

  if (guardIndex < values.length) {
    const stopBefore = diff[guardIndex] ?? 0;
    const stopAfter = stopBefore - delta;
    diff[guardIndex] = stopAfter;
    boundaryEdits += 1;
    const stopStep = addStep({
      line: 10,
      event: "assignment",
      description: `Turn the update off after the range: diff[${guardIndex}] changes from ${stopBefore} to ${stopAfter} by applying the inverse ${signed(-delta)}.`,
      boundaryIndex: guardIndex,
      boundaryKind: "stop",
      changed: ["diff", "boundary_edits"],
      action: {
        type: "assignment",
        target: `diff[${guardIndex}]`,
        value: stopAfter,
        phase: "difference_mark_stop",
        ...actionState({ builtThrough, reconstructedThrough, boundaryIndex: guardIndex, boundaryKind: "stop", diffBefore: stopBefore, diffAfter: stopAfter }),
      },
    });
    b.prompt({
      stepId: stopStep.id,
      type: "choose_explanation",
      question: `Why place ${signed(-delta)} at index ${guardIndex}?`,
      target: { right, guardIndex, delta },
      answer: "It cancels the carried update immediately after the range",
      choices: [
        "It cancels the carried update immediately after the range",
        "It reverses the original array",
        "It removes the value at the right endpoint",
      ],
      explanation: `The prefix scan includes the ${signed(delta)} marker from ${left} through ${right}; the inverse ${signed(-delta)} marker cancels it from ${guardIndex} onward.`,
    });
  } else {
    addStep({
      line: 9,
      event: "condition_check",
      description: `The range ends at the final index, so guard ${guardIndex} is outside the array. No stop marker is needed because no later value exists.`,
      boundaryKind: "open-end",
      action: {
        type: "condition_check",
        condition: "right + 1 < len(arr)",
        result: false,
        phase: "difference_open_end",
        ...actionState({ builtThrough, reconstructedThrough, boundaryKind: "open-end" }),
      },
    });
  }

  for (let index = 0; index < values.length; index += 1) {
    const runningBefore = running;
    const contribution = diff[index] ?? 0;
    running += contribution;
    result[index] = running;
    reconstructedThrough = index;
    reconstructionAdds += 1;
    addStep({
      line: 15,
      event: "array_write",
      description: `Rebuild index ${index}: running ${runningBefore} + diff[${index}] ${contribution >= 0 ? "+ " : "- "}${Math.abs(contribution)} = ${running}. Write result[${index}] = ${running}.`,
      activeIndex: index,
      changed: ["running", "result", "reconstructed_through", "reconstruction_adds"],
      action: {
        type: "array_write",
        target: "result",
        index,
        value: running,
        phase: "difference_reconstruct",
        ...actionState({ builtThrough, reconstructedThrough, activeIndex: index, runningBefore, runningAfter: running, diffBefore: contribution, diffAfter: contribution }),
      },
    });
  }

  const finalValues = result.map((value) => value ?? 0);
  const output = `Updated array: [${finalValues.join(", ")}]`;
  addStep({
    line: 16,
    event: "program_end",
    description: `The ${signed(delta)} signal affected exactly [${left}..${right}], producing [${finalValues.join(", ")}]. One update used at most two O(1) edits; reconstruction cost O(n).`,
    output,
    changed: ["result"],
    action: {
      type: "output_write",
      value: finalValues,
      phase: "difference_complete",
      ...actionState({ builtThrough, reconstructedThrough }),
    },
  });

  return b.build();
}
