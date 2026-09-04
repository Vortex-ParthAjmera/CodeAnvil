import type { MemoryItem, TraceAction } from "../../types/trace";
import { arrayMemory, arrayVisual, TraceBuilder } from "./builders";

export const PREFIX_SUM_DEFAULT = [3, 1, 4, 1, 5, 9];
export const PREFIX_SUM_LEFT = 1;
export const PREFIX_SUM_RIGHT = 4;

export const PREFIX_SUM_CODE = `arr = [3, 1, 4, 1, 5, 9]
left, right = 1, 4
if not arr or not (0 <= left <= right < len(arr)): raise ValueError("query must fit inside arr")
prefix = [0] * (len(arr) + 1)
for i, value in enumerate(arr):
    prefix[i + 1] = prefix[i] + value
range_sum = prefix[right + 1] - prefix[left]
print(range_sum)`;

export interface PrefixInputTokenState {
  id: string;
  value: number;
  index: number;
}

interface PrefixStateOptions {
  builtThrough: number;
  activeArrayIndex?: number | null;
  sourcePrefixIndex?: number | null;
  destinationPrefixIndex?: number | null;
  prefixBefore?: number | null;
  inputValue?: number | null;
  prefixResult?: number | null;
  rangeSum?: number | null;
  invalidReason?: string | null;
}

function resultText(left: number, right: number, rangeSum: number): string {
  return `Range [${left}..${right}] sum = ${rangeSum}`;
}

/** Builds n+1 prefix checkpoints, then answers one inclusive range query. */
export function buildPrefixSumTrace(
  input: number[] = PREFIX_SUM_DEFAULT,
  queryLeft = PREFIX_SUM_LEFT,
  queryRight = PREFIX_SUM_RIGHT,
  code = PREFIX_SUM_CODE,
  language = "python",
) {
  const values = [...input];
  const tokens: PrefixInputTokenState[] = values.map((value, index) => ({
    id: `value-${index}`,
    value,
    index,
  }));
  const prefix: Array<number | null> = Array.from({ length: values.length + 1 }, () => null);
  const b = new TraceBuilder({
    title: "Prefix Sum Range Query",
    code,
    topic: "arrays",
    difficulty: "beginner",
    language,
    durationSeconds: 150,
  });

  const left = queryLeft;
  const right = queryRight;
  let builtThrough = -1;
  let additions = 0;
  let rangeSum: number | null = null;
  const invalidReason = values.length === 0
    ? "the array needs at least one value"
    : values.some((value) => !Number.isFinite(value))
      ? "every array value must be finite"
      : !Number.isInteger(left) || !Number.isInteger(right)
        ? "query boundaries must be whole-number indices"
        : left < 0 || right < left || right >= values.length
          ? `query [${left}..${right}] must satisfy 0 <= left <= right < ${values.length}`
          : null;

  const variables = () => ({
    algorithm: "prefix-sum",
    arr: [...values],
    left,
    right,
    prefix: [...prefix],
    built_through: builtThrough,
    additions,
    range_sum: rangeSum,
  });

  const memory = ({
    activeArrayIndex = null,
    sourcePrefixIndex = null,
    destinationPrefixIndex = null,
    query = false,
  }: {
    activeArrayIndex?: number | null;
    sourcePrefixIndex?: number | null;
    destinationPrefixIndex?: number | null;
    query?: boolean;
  } = {}): MemoryItem[] => {
    const arrayHighlights: Array<{ index: number; role: string }> = [];
    const prefixHighlights: Array<{ index: number; role: string }> = [];
    for (let index = 0; index < values.length; index += 1) {
      if (index < builtThrough) arrayHighlights.push({ index, role: "processed" });
      if (query && index >= left && index <= right) arrayHighlights.push({ index, role: "query-range" });
    }
    for (let index = 0; index <= builtThrough; index += 1) prefixHighlights.push({ index, role: "built" });
    if (activeArrayIndex !== null) arrayHighlights.push({ index: activeArrayIndex, role: "reading" });
    if (sourcePrefixIndex !== null) prefixHighlights.push({ index: sourcePrefixIndex, role: "source" });
    if (destinationPrefixIndex !== null) prefixHighlights.push({ index: destinationPrefixIndex, role: "writing" });
    if (query) {
      prefixHighlights.push({ index: left, role: "subtract" });
      prefixHighlights.push({ index: right + 1, role: "total" });
    }
    return [
      arrayMemory("arr", "arr", values, arrayHighlights),
      arrayMemory("prefix", "prefix", prefix, prefixHighlights),
    ];
  };

  const actionState = ({
    builtThrough: stateBuiltThrough,
    activeArrayIndex = null,
    sourcePrefixIndex = null,
    destinationPrefixIndex = null,
    prefixBefore = null,
    inputValue = null,
    prefixResult = null,
    rangeSum: stateRangeSum = rangeSum,
    invalidReason: stateInvalidReason = null,
  }: PrefixStateOptions) => ({
    values: [...values],
    tokens: tokens.map((token) => ({ ...token })),
    prefix: [...prefix],
    prefixTokens: prefix.map((value, index) => ({ id: `prefix-${index}`, value, index })),
    queryLeft: left,
    queryRight: right,
    builtThrough: stateBuiltThrough,
    activeArrayIndex,
    sourcePrefixIndex,
    destinationPrefixIndex,
    prefixBefore,
    inputValue,
    prefixResult,
    rangeSum: stateRangeSum,
    queryLeftValue: left >= 0 && left < prefix.length ? prefix[left] : null,
    queryRightValue: right + 1 >= 0 && right + 1 < prefix.length ? prefix[right + 1] : null,
    invalidReason: stateInvalidReason,
    additions,
  });

  const addStep = ({
    line,
    event,
    description,
    action,
    activeArrayIndex = null,
    sourcePrefixIndex = null,
    destinationPrefixIndex = null,
    query = false,
    output = "",
    changed = [],
  }: {
    line: number;
    event: string;
    description: string;
    action: TraceAction;
    activeArrayIndex?: number | null;
    sourcePrefixIndex?: number | null;
    destinationPrefixIndex?: number | null;
    query?: boolean;
    output?: string;
    changed?: string[];
  }) => b.step({
    line,
    event,
    description,
    variables: variables(),
    output,
    memory: memory({ activeArrayIndex, sourcePrefixIndex, destinationPrefixIndex, query }),
    visual: arrayVisual("arr"),
    changed: { variables: changed, output: output !== "" },
    actions: [action],
  });

  addStep({
    line: 1,
    event: "program_start",
    description: `Precompute cumulative checkpoints for ${values.length} values, then answer inclusive query [${left}..${right}] with one subtraction.`,
    changed: ["arr", "left", "right", "prefix"],
    action: {
      type: "assignment",
      target: "arr",
      value: [...values],
      phase: "prefix_start",
      ...actionState({ builtThrough }),
    },
  });

  if (invalidReason) {
    addStep({
      line: 3,
      event: "error",
      description: `Input rejected: ${invalidReason}. Prefix checkpoints were not fabricated for an invalid query.`,
      changed: ["left", "right"],
      action: {
        type: "condition_check",
        condition: "arr is non-empty and 0 <= left <= right < len(arr)",
        result: false,
        phase: "prefix_invalid",
        ...actionState({ builtThrough, invalidReason }),
      },
    });
    return b.build();
  }

  addStep({
    line: 3,
    event: "condition_check",
    description: `Query [${left}..${right}] is inside the array. Its answer will be prefix[${right + 1}] minus prefix[${left}].`,
    action: {
      type: "condition_check",
      condition: "arr is non-empty and 0 <= left <= right < len(arr)",
      result: true,
      phase: "prefix_validate",
      ...actionState({ builtThrough }),
    },
  });

  prefix[0] = 0;
  builtThrough = 0;
  addStep({
    line: 4,
    event: "assignment",
    description: "Seed prefix[0] = 0. This sentinel means 'sum of zero input values' and removes special cases from every query.",
    destinationPrefixIndex: 0,
    changed: ["prefix", "built_through"],
    action: {
      type: "assignment",
      target: "prefix[0]",
      value: 0,
      phase: "prefix_seed",
      ...actionState({ builtThrough, destinationPrefixIndex: 0, prefixResult: 0 }),
    },
  });

  for (let index = 0; index < values.length; index += 1) {
    const prefixBefore = prefix[index] ?? 0;
    const inputValue = values[index];
    const prefixResult = prefixBefore + inputValue;
    addStep({
      line: 5,
      event: "array_read",
      description: `Read arr[${index}] = ${inputValue} beside the previous checkpoint prefix[${index}] = ${prefixBefore}.`,
      activeArrayIndex: index,
      sourcePrefixIndex: index,
      destinationPrefixIndex: index + 1,
      changed: [],
      action: {
        type: "array_read",
        index,
        phase: "prefix_read",
        ...actionState({ builtThrough, activeArrayIndex: index, sourcePrefixIndex: index, destinationPrefixIndex: index + 1, prefixBefore, inputValue, prefixResult }),
      },
    });

    prefix[index + 1] = prefixResult;
    builtThrough = index + 1;
    additions += 1;
    addStep({
      line: 6,
      event: "array_write",
      description: `Write prefix[${index + 1}] = ${prefixBefore} + ${inputValue} = ${prefixResult}. It now stores the sum of arr[0..${index}].`,
      activeArrayIndex: index,
      sourcePrefixIndex: index,
      destinationPrefixIndex: index + 1,
      changed: ["prefix", "built_through", "additions"],
      action: {
        type: "array_write",
        target: "prefix",
        index: index + 1,
        value: prefixResult,
        phase: "prefix_write",
        ...actionState({ builtThrough, activeArrayIndex: index, sourcePrefixIndex: index, destinationPrefixIndex: index + 1, prefixBefore, inputValue, prefixResult }),
      },
    });
  }

  const queryStep = addStep({
    line: 7,
    event: "condition_check",
    description: `The wanted interval is arr[${left}..${right}]. prefix[${right + 1}] includes everything through right; prefix[${left}] is exactly the part before left.`,
    query: true,
    changed: [],
    action: {
      type: "condition_check",
      condition: `range [${left}..${right}] maps to prefix[${right + 1}] - prefix[${left}]`,
      result: true,
      phase: "prefix_query_range",
      ...actionState({ builtThrough }),
    },
  });
  b.prompt({
    stepId: queryStep.id,
    type: "choose_explanation",
    question: `Why does the right checkpoint use index ${right + 1} instead of ${right}?`,
    target: { left, right, prefixLeft: left, prefixRight: right + 1 },
    answer: "Because prefix[i] stores the sum of the first i values",
    choices: [
      "Because prefix[i] stores the sum of the first i values",
      "Because array indices begin at one",
      "Because the final value is counted twice",
    ],
    explanation: `prefix[${right + 1}] includes arr[${right}], while prefix[${right}] stops one value earlier.`,
  });

  const rightCheckpoint = prefix[right + 1] ?? 0;
  const leftCheckpoint = prefix[left] ?? 0;
  rangeSum = rightCheckpoint - leftCheckpoint;
  addStep({
    line: 7,
    event: "assignment",
    description: `Subtract the unwanted prefix: ${rightCheckpoint} - ${leftCheckpoint} = ${rangeSum}. Only arr[${left}..${right}] remains.`,
    query: true,
    changed: ["range_sum"],
    action: {
      type: "assignment",
      target: "range_sum",
      value: rangeSum,
      phase: "prefix_subtract",
      ...actionState({ builtThrough, rangeSum }),
    },
  });

  const output = resultText(left, right, rangeSum);
  addStep({
    line: 8,
    event: "program_end",
    description: `Range [${left}..${right}] sums to ${rangeSum}. Building cost O(n); this and every later immutable range query cost O(1).`,
    query: true,
    output,
    changed: ["range_sum"],
    action: {
      type: "output_write",
      value: { left, right, sum: rangeSum, values: values.slice(left, right + 1) },
      phase: "prefix_complete",
      ...actionState({ builtThrough, rangeSum }),
    },
  });

  return b.build();
}
