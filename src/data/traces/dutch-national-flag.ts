import type { MemoryItem, TraceAction } from "../../types/trace";
import { arrayMemory, arrayVisual, TraceBuilder } from "./builders";

export const DUTCH_NATIONAL_FLAG_DEFAULT = [2, 0, 2, 1, 1, 0, 2, 0];

export const DUTCH_NATIONAL_FLAG_CODE = `arr = [2, 0, 2, 1, 1, 0, 2, 0]
if any(value not in (0, 1, 2) for value in arr): raise ValueError("Use only 0, 1, 2")
low = 0
mid = 0
high = len(arr) - 1
while mid <= high:
    if arr[mid] == 0:
        arr[low], arr[mid] = arr[mid], arr[low]
        low += 1
        mid += 1
    elif arr[mid] == 1:
        mid += 1
    else:
        arr[mid], arr[high] = arr[high], arr[mid]
        high -= 1
print(arr)`;

export interface DutchFlagTokenState {
  id: string;
  value: number;
  originalIndex: number;
  position: number;
}

type DutchDecision = "zero" | "one" | "two" | null;

interface ActionStateOptions {
  low: number;
  mid: number;
  high: number;
  inspectedValue?: number | null;
  decision?: DutchDecision;
  swapIndices?: [number, number] | null;
  pointerFrom?: [number, number, number] | null;
  pointerTo?: [number, number, number] | null;
  invalidValues?: number[];
}

function outputText(values: number[]): string {
  return `Sorted: ${JSON.stringify(values)}`;
}

/** Records the four Dutch National Flag invariants and every pointer decision. */
export function buildDutchNationalFlagTrace(
  input: number[] = DUTCH_NATIONAL_FLAG_DEFAULT,
  code = DUTCH_NATIONAL_FLAG_CODE,
  language = "python",
) {
  const original = [...input];
  const values = [...input];
  const tokens: DutchFlagTokenState[] = original.map((value, originalIndex) => ({
    id: `value-${originalIndex}`,
    value,
    originalIndex,
    position: originalIndex,
  }));
  const invalidValues = [...new Set(original.filter((value) => value !== 0 && value !== 1 && value !== 2))];
  const b = new TraceBuilder({
    title: "Dutch National Flag",
    code,
    topic: "arrays",
    difficulty: "intermediate",
    language,
    durationSeconds: 125,
  });

  let low = 0;
  let mid = 0;
  let high = values.length - 1;
  let swaps = 0;
  let inspections = 0;

  const variables = () => ({
    algorithm: "dutch-national-flag",
    arr: [...values],
    low,
    mid,
    high,
    current: mid >= 0 && mid < values.length ? values[mid] : null,
    zeros_locked: low,
    ones_locked: Math.max(0, mid - low),
    unknown: Math.max(0, high - mid + 1),
    twos_locked: Math.max(0, values.length - high - 1),
    inspections,
    swaps,
  });

  const memory = (
    inspectedIndex: number | null = null,
    swapIndices: [number, number] | null = null,
  ): MemoryItem[] => {
    const highlights: Array<{ index: number; role: string }> = [];
    for (let index = 0; index < values.length; index += 1) {
      if (index < low) highlights.push({ index, role: "zero-zone" });
      else if (index < mid) highlights.push({ index, role: "one-zone" });
      else if (index <= high) highlights.push({ index, role: "unknown-zone" });
      else highlights.push({ index, role: "two-zone" });
    }
    if (inspectedIndex !== null && inspectedIndex >= 0 && inspectedIndex < values.length) {
      highlights.push({ index: inspectedIndex, role: "current" });
    }
    for (const index of swapIndices ?? []) highlights.push({ index, role: "swap" });
    return [arrayMemory("arr", "arr", values, highlights)];
  };

  const actionState = ({
    low: stateLow,
    mid: stateMid,
    high: stateHigh,
    inspectedValue = null,
    decision = null,
    swapIndices = null,
    pointerFrom = null,
    pointerTo = null,
    invalidValues: invalid = [],
  }: ActionStateOptions) => ({
    originalValues: [...original],
    values: [...values],
    tokens: tokens.map((token) => ({ ...token })),
    low: stateLow,
    mid: stateMid,
    high: stateHigh,
    inspectedValue,
    decision,
    swapIndices,
    pointerFrom,
    pointerTo,
    invalidValues: [...invalid],
    inspections,
    swaps,
  });

  const step = ({
    line,
    event,
    description,
    action,
    inspectedIndex = null,
    swapIndices = null,
    output = "",
    changed = [],
  }: {
    line: number;
    event: string;
    description: string;
    action: TraceAction;
    inspectedIndex?: number | null;
    swapIndices?: [number, number] | null;
    output?: string;
    changed?: string[];
  }) => b.step({
    line,
    event,
    description,
    variables: variables(),
    output,
    memory: memory(inspectedIndex, swapIndices),
    visual: arrayVisual("arr"),
    changed: { variables: changed, output: output !== "" },
    actions: [action],
  });

  step({
    line: 1,
    event: "program_start",
    description: `Start with ${values.length} values. The algorithm will grow a 0 zone from the left and a 2 zone from the right in one pass.`,
    changed: ["arr"],
    action: {
      type: "assignment",
      target: "arr",
      value: [...values],
      phase: "dnf_start",
      ...actionState({ low, mid, high }),
    },
  });

  if (invalidValues.length > 0) {
    step({
      line: 2,
      event: "error",
      description: `Input rejected. Dutch National Flag classifies only 0, 1, and 2; remove ${invalidValues.join(", ")}.`,
      changed: ["arr"],
      action: {
        type: "condition_check",
        condition: "all values are 0, 1, or 2",
        result: false,
        phase: "dnf_invalid",
        ...actionState({ low, mid, high, invalidValues }),
      },
    });
    return b.build();
  }

  step({
    line: 2,
    event: "condition_check",
    description: "Validate the three-color contract: every value is 0, 1, or 2.",
    changed: [],
    action: {
      type: "condition_check",
      condition: "all values are 0, 1, or 2",
      result: true,
      phase: "dnf_validate",
      ...actionState({ low, mid, high }),
    },
  });

  step({
    line: 5,
    event: "assignment",
    description: "Initialize low and mid at the left edge and high at the right edge. Everything is unknown at first.",
    changed: ["low", "mid", "high"],
    action: {
      type: "assignment",
      target: "low/mid/high",
      value: [low, mid, high],
      phase: "dnf_initialize",
      ...actionState({ low, mid, high }),
    },
  });

  while (mid <= high) {
    const inspectedIndex = mid;
    const inspectedValue = values[mid];
    const decision: Exclude<DutchDecision, null> = inspectedValue === 0 ? "zero" : inspectedValue === 1 ? "one" : "two";
    inspections += 1;
    const inspectStep = step({
      line: decision === "zero" ? 7 : decision === "one" ? 11 : 13,
      event: "comparison",
      description: decision === "zero"
        ? `arr[mid] is 0 at index ${mid}. It belongs at low=${low}, at the end of the confirmed 0 zone.`
        : decision === "one"
          ? `arr[mid] is 1 at index ${mid}. It already belongs between the 0 zone and the unknown zone.`
          : `arr[mid] is 2 at index ${mid}. Send it to high=${high}, but classify the incoming value before moving mid.`,
      inspectedIndex,
      changed: ["current", "inspections"],
      action: {
        type: "compare",
        left: inspectedValue,
        right: decision === "zero" ? 0 : decision === "one" ? 1 : 2,
        result: true,
        phase: `dnf_inspect_${decision}`,
        ...actionState({ low, mid, high, inspectedValue, decision }),
      },
    });

    if (inspections === 1) {
      b.prompt({
        stepId: inspectStep.id,
        type: "choose_explanation",
        question: inspectedValue === 2
          ? "After swapping this 2 with high, should mid advance immediately?"
          : `Which zone receives the inspected value ${inspectedValue}?`,
        target: { inspectedValue, low, mid, high },
        answer: inspectedValue === 2 ? "No, inspect the incoming value" : inspectedValue === 0 ? "The left 0 zone" : "The middle 1 zone",
        choices: inspectedValue === 2
          ? ["No, inspect the incoming value", "Yes, advance mid", "Move low instead"]
          : ["The left 0 zone", "The middle 1 zone", "The right 2 zone"],
        explanation: inspectedValue === 2
          ? "The value arriving from high has not been classified, so mid must remain on it."
          : inspectedValue === 0
            ? "A 0 is swapped to low, then low and mid both advance."
            : "A 1 is already in its final middle zone, so only mid advances.",
      });
    }

    if (decision === "zero") {
      const swapIndices: [number, number] = [low, mid];
      [values[low], values[mid]] = [values[mid], values[low]];
      [tokens[low], tokens[mid]] = [tokens[mid], tokens[low]];
      tokens[low].position = low;
      tokens[mid].position = mid;
      swaps += 1;
      step({
        line: 8,
        event: "swap",
        description: low === mid
          ? `The 0 is already at low=${low}; the self-swap confirms its final zone.`
          : `Swap indices ${mid} and ${low}. The inspected 0 crosses into the confirmed left zone.`,
        inspectedIndex: mid,
        swapIndices,
        changed: ["arr", "swaps"],
        action: {
          type: "swap",
          items: swapIndices,
          phase: "dnf_place_zero",
          ...actionState({ low, mid, high, inspectedValue, decision, swapIndices }),
        },
      });

      const pointerFrom: [number, number, number] = [low, mid, high];
      low += 1;
      mid += 1;
      const pointerTo: [number, number, number] = [low, mid, high];
      step({
        line: 10,
        event: "pointer_move",
        description: `Advance low and mid. Indices before ${low} are now guaranteed 0; the next unknown starts at ${mid}.`,
        changed: ["low", "mid"],
        action: {
          type: "pointer_move",
          pointer: "low/mid",
          to: [low, mid],
          phase: "dnf_advance_zero",
          ...actionState({ low, mid, high, inspectedValue, decision, pointerFrom, pointerTo }),
        },
      });
    } else if (decision === "one") {
      const pointerFrom: [number, number, number] = [low, mid, high];
      mid += 1;
      const pointerTo: [number, number, number] = [low, mid, high];
      step({
        line: 12,
        event: "pointer_move",
        description: `Advance only mid. The 1 joins the confirmed middle zone [${low}..${mid - 1}].`,
        changed: ["mid"],
        action: {
          type: "pointer_move",
          pointer: "mid",
          to: mid,
          phase: "dnf_advance_one",
          ...actionState({ low, mid, high, inspectedValue, decision, pointerFrom, pointerTo }),
        },
      });
    } else {
      const swapIndices: [number, number] = [mid, high];
      [values[mid], values[high]] = [values[high], values[mid]];
      [tokens[mid], tokens[high]] = [tokens[high], tokens[mid]];
      tokens[mid].position = mid;
      tokens[high].position = high;
      swaps += 1;
      step({
        line: 14,
        event: "swap",
        description: mid === high
          ? `The 2 already sits at high=${high}; confirm it as the rightmost classified value.`
          : `Swap indices ${mid} and ${high}. The 2 enters the confirmed right zone; index ${mid} receives an unclassified value.`,
        inspectedIndex: mid,
        swapIndices,
        changed: ["arr", "swaps"],
        action: {
          type: "swap",
          items: swapIndices,
          phase: "dnf_place_two",
          ...actionState({ low, mid, high, inspectedValue, decision, swapIndices }),
        },
      });

      const pointerFrom: [number, number, number] = [low, mid, high];
      high -= 1;
      const pointerTo: [number, number, number] = [low, mid, high];
      step({
        line: 15,
        event: "pointer_move",
        description: `Move high left to ${high}. Keep mid at ${mid}, because the value swapped in from the right has not been classified yet.`,
        inspectedIndex: mid,
        changed: ["high"],
        action: {
          type: "pointer_move",
          pointer: "high",
          to: high,
          phase: "dnf_retreat_high",
          ...actionState({ low, mid, high, inspectedValue, decision, pointerFrom, pointerTo }),
        },
      });
    }
  }

  step({
    line: 16,
    event: "program_end",
    description: `Unknown is empty because mid=${mid} passed high=${high}. The array is partitioned as 0s, then 1s, then 2s in O(n) time.`,
    output: outputText(values),
    changed: ["arr"],
    action: {
      type: "output_write",
      value: [...values],
      phase: "dnf_complete",
      ...actionState({ low, mid, high }),
    },
  });

  return b.build();
}
