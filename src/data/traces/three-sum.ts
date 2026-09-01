import type { MemoryItem, TraceAction } from "../../types/trace";
import { arrayMemory, arrayVisual, TraceBuilder } from "./builders";

export const THREE_SUM_CODE = `arr = [-1, 0, 1, 2, -1, -4, -1]
target = 0
arr.sort()
triplets = []
for i in range(len(arr) - 2):
    if i > 0 and arr[i] == arr[i - 1]:
        continue
    left, right = i + 1, len(arr) - 1
    while left < right:
        total = arr[i] + arr[left] + arr[right]
        if total == target:
            triplets.append([arr[i], arr[left], arr[right]])
            left += 1
            right -= 1
            while left < right and arr[left] == arr[left - 1]:
                left += 1
            while left < right and arr[right] == arr[right + 1]:
                right -= 1
        elif total < target:
            left += 1
        else:
            right -= 1
print(triplets)`;

export interface ThreeSumTokenState {
  id: string;
  value: number;
  originalIndex: number;
  sortedIndex: number;
}

type PointerName = "left" | "right" | "both" | null;

interface ActionStateOptions {
  sortedReady: boolean;
  anchorIndex?: number;
  leftIndex?: number;
  rightIndex?: number;
  total?: number | null;
  relation?: "low" | "high" | "equal" | null;
  solutions?: number[][];
  foundIndices?: [number, number, number] | null;
  processedAnchors?: number[];
  comparisons?: number;
  moves?: number;
  movementPointer?: PointerName;
  movementFrom?: [number, number] | null;
  movementTo?: [number, number] | null;
  skippedIndex?: number | null;
}

function stableSortedTokens(values: number[]): ThreeSumTokenState[] {
  return values
    .map((value, originalIndex) => ({
      id: `value-${originalIndex}`,
      value,
      originalIndex,
      sortedIndex: -1,
    }))
    .sort((left, right) => left.value - right.value || left.originalIndex - right.originalIndex)
    .map((token, sortedIndex) => ({ ...token, sortedIndex }));
}

function resultText(solutions: number[][]): string {
  return `Triplets: ${JSON.stringify(solutions)}`;
}

/**
 * Builds a deterministic Three Sum lesson. The simulation never executes the
 * displayed source; it records the sort, every sum, every pointer move, and
 * every duplicate skip into language-neutral actions.
 */
export function buildThreeSumTrace(
  input: number[] = [-1, 0, 1, 2, -1, -4, -1],
  target = 0,
  code = THREE_SUM_CODE,
  language = "python",
) {
  const original = [...input];
  const tokens = stableSortedTokens(original);
  const sorted = tokens.map((token) => token.value);
  const b = new TraceBuilder({
    title: "Three Sum",
    code,
    topic: "arrays",
    difficulty: "intermediate",
    language,
    durationSeconds: 165,
  });

  const solutions: number[][] = [];
  const processedAnchors: number[] = [];
  let comparisons = 0;
  let moves = 0;

  const variables = (
    sortedReady: boolean,
    anchorIndex = -1,
    leftIndex = -1,
    rightIndex = -1,
    total: number | null = null,
  ) => ({
    algorithm: "three-sum",
    arr: sortedReady ? [...sorted] : [...original],
    target,
    sorted: sortedReady,
    i: anchorIndex >= 0 ? anchorIndex : null,
    left: leftIndex >= 0 ? leftIndex : null,
    right: rightIndex >= 0 ? rightIndex : null,
    total,
    triplets: solutions.map((triplet) => [...triplet]),
    comparisons,
    pointer_moves: moves,
  });

  const memory = (
    sortedReady: boolean,
    anchorIndex = -1,
    leftIndex = -1,
    rightIndex = -1,
    foundIndices: [number, number, number] | null = null,
    skippedIndex: number | null = null,
  ): MemoryItem[] => {
    const highlights: Array<{ index: number; role: string }> = [];
    for (const index of processedAnchors) highlights.push({ index, role: "processed" });
    if (anchorIndex >= 0) highlights.push({ index: anchorIndex, role: "anchor" });
    if (leftIndex >= 0) highlights.push({ index: leftIndex, role: "left" });
    if (rightIndex >= 0) highlights.push({ index: rightIndex, role: "right" });
    for (const index of foundIndices ?? []) highlights.push({ index, role: "found" });
    if (skippedIndex !== null) highlights.push({ index: skippedIndex, role: "duplicate" });
    return [arrayMemory("arr", "arr", sortedReady ? sorted : original, highlights)];
  };

  const actionState = ({
    sortedReady,
    anchorIndex = -1,
    leftIndex = -1,
    rightIndex = -1,
    total = null,
    relation = null,
    foundIndices = null,
    movementPointer = null,
    movementFrom = null,
    movementTo = null,
    skippedIndex = null,
  }: ActionStateOptions) => ({
    targetSum: target,
    originalValues: [...original],
    sortedValues: [...sorted],
    tokens: tokens.map((token) => ({ ...token })),
    sortedReady,
    anchorIndex,
    leftIndex,
    rightIndex,
    total,
    relation,
    solutions: solutions.map((triplet) => [...triplet]),
    foundIndices,
    processedAnchors: [...processedAnchors],
    comparisons,
    moves,
    movementPointer,
    movementFrom,
    movementTo,
    skippedIndex,
  });

  const step = ({
    line,
    event,
    description,
    action,
    sortedReady,
    anchorIndex = -1,
    leftIndex = -1,
    rightIndex = -1,
    total = null,
    foundIndices = null,
    skippedIndex = null,
    output = "",
    changed = [],
  }: {
    line: number;
    event: string;
    description: string;
    action: TraceAction;
    sortedReady: boolean;
    anchorIndex?: number;
    leftIndex?: number;
    rightIndex?: number;
    total?: number | null;
    foundIndices?: [number, number, number] | null;
    skippedIndex?: number | null;
    output?: string;
    changed?: string[];
  }) => b.step({
    line,
    event,
    description,
    variables: variables(sortedReady, anchorIndex, leftIndex, rightIndex, total),
    output,
    memory: memory(sortedReady, anchorIndex, leftIndex, rightIndex, foundIndices, skippedIndex),
    visual: arrayVisual("arr"),
    changed: { variables: changed, output: output !== "" },
    actions: [action],
  });

  step({
    line: 1,
    event: "program_start",
    description: `Start with ${original.length} values. Three nested scans would cost O(n^3), so we will sort once and turn the inner search into two pointers.`,
    sortedReady: false,
    changed: ["arr", "target"],
    action: {
      type: "assignment",
      target: "arr",
      value: [...original],
      phase: "three_sum_start",
      ...actionState({ sortedReady: false }),
    },
  });

  step({
    line: 3,
    event: "assignment",
    description: `Sort the array into [${sorted.join(", ")}]. Now moving left right increases a sum, while moving right left decreases it.`,
    sortedReady: true,
    changed: ["arr", "sorted"],
    action: {
      type: "assignment",
      target: "arr",
      value: [...sorted],
      phase: "three_sum_sort",
      ...actionState({ sortedReady: true }),
    },
  });

  for (let anchorIndex = 0; anchorIndex <= sorted.length - 3; anchorIndex += 1) {
    if (anchorIndex > 0 && sorted[anchorIndex] === sorted[anchorIndex - 1]) {
      processedAnchors.push(anchorIndex);
      step({
        line: 6,
        event: "condition_check",
        description: `Skip anchor index ${anchorIndex}. Its value ${sorted[anchorIndex]} matches the previous anchor, so it would recreate triplets already found.`,
        sortedReady: true,
        anchorIndex,
        skippedIndex: anchorIndex,
        changed: ["i"],
        action: {
          type: "condition_check",
          condition: "i > 0 and arr[i] == arr[i - 1]",
          result: true,
          phase: "three_sum_skip_anchor",
          ...actionState({ sortedReady: true, anchorIndex, skippedIndex: anchorIndex }),
        },
      });
      continue;
    }

    let leftIndex = anchorIndex + 1;
    let rightIndex = sorted.length - 1;
    step({
      line: 8,
      event: "loop_iteration",
      description: `Fix arr[${anchorIndex}] = ${sorted[anchorIndex]}. Search the remaining sorted range with L at ${leftIndex} and R at ${rightIndex}.`,
      sortedReady: true,
      anchorIndex,
      leftIndex,
      rightIndex,
      changed: ["i", "left", "right"],
      action: {
        type: "loop_iteration",
        phase: "three_sum_fix_anchor",
        ...actionState({ sortedReady: true, anchorIndex, leftIndex, rightIndex }),
      },
    });

    while (leftIndex < rightIndex) {
      const total = sorted[anchorIndex] + sorted[leftIndex] + sorted[rightIndex];
      const relation = total === target ? "equal" : total < target ? "low" : "high";
      comparisons += 1;

      const compareStep = step({
        line: 10,
        event: "comparison",
        description: relation === "equal"
          ? `${sorted[anchorIndex]} + ${sorted[leftIndex]} + ${sorted[rightIndex]} = ${target}. These three positions form a valid triplet.`
          : relation === "low"
            ? `${sorted[anchorIndex]} + ${sorted[leftIndex]} + ${sorted[rightIndex]} = ${total}, below ${target}. Only L can move toward a larger value.`
            : `${sorted[anchorIndex]} + ${sorted[leftIndex]} + ${sorted[rightIndex]} = ${total}, above ${target}. Only R can move toward a smaller value.`,
        sortedReady: true,
        anchorIndex,
        leftIndex,
        rightIndex,
        total,
        changed: ["total", "comparisons"],
        action: {
          type: "compare",
          left: total,
          right: target,
          result: total === target,
          phase: `three_sum_compare_${relation}`,
          ...actionState({ sortedReady: true, anchorIndex, leftIndex, rightIndex, total, relation }),
        },
      });

      if (comparisons === 1) {
        b.prompt({
          stepId: compareStep.id,
          type: "choose_explanation",
          question: total < target
            ? `The sorted triplet totals ${total}, below ${target}. Which pointer can increase it?`
            : `The sorted triplet totals ${total}, above ${target}. Which pointer can decrease it?`,
          target: { relation, total, target },
          answer: total < target ? "Move L right" : "Move R left",
          choices: ["Move L right", "Move R left", "Move the anchor"],
          explanation: total < target
            ? "Because the array is sorted, moving L right selects a value that is equal or larger."
            : "Because the array is sorted, moving R left selects a value that is equal or smaller.",
        });
      }

      if (total === target) {
        const foundIndices: [number, number, number] = [anchorIndex, leftIndex, rightIndex];
        const triplet = foundIndices.map((index) => sorted[index]);
        solutions.push(triplet);
        step({
          line: 12,
          event: "output_write",
          description: `Save [${triplet.join(", ")}]. The solution shelf now contains ${solutions.length} unique triplet${solutions.length === 1 ? "" : "s"}.`,
          sortedReady: true,
          anchorIndex,
          leftIndex,
          rightIndex,
          total,
          foundIndices,
          output: resultText(solutions),
          changed: ["triplets"],
          action: {
            type: "output_write",
            value: [...triplet],
            phase: "three_sum_found",
            ...actionState({ sortedReady: true, anchorIndex, leftIndex, rightIndex, total, relation: "equal", foundIndices }),
          },
        });

        const previousLeft = leftIndex;
        const previousRight = rightIndex;
        leftIndex += 1;
        rightIndex -= 1;
        moves += 2;
        step({
          line: 13,
          event: "pointer_move",
          description: `Move both pointers inward after saving the triplet: L ${previousLeft} -> ${leftIndex}, R ${previousRight} -> ${rightIndex}.`,
          sortedReady: true,
          anchorIndex,
          leftIndex,
          rightIndex,
          changed: ["left", "right", "pointer_moves"],
          action: {
            type: "pointer_move",
            pointer: "left/right",
            to: [leftIndex, rightIndex],
            phase: "three_sum_move_both",
            ...actionState({
              sortedReady: true,
              anchorIndex,
              leftIndex,
              rightIndex,
              movementPointer: "both",
              movementFrom: [previousLeft, previousRight],
              movementTo: [leftIndex, rightIndex],
            }),
          },
        });

        while (leftIndex < rightIndex && sorted[leftIndex] === sorted[leftIndex - 1]) {
          const skippedIndex = leftIndex;
          leftIndex += 1;
          moves += 1;
          step({
            line: 15,
            event: "pointer_move",
            description: `Skip duplicate left value ${sorted[skippedIndex]} at index ${skippedIndex}; using it again would repeat the same triplet.`,
            sortedReady: true,
            anchorIndex,
            leftIndex,
            rightIndex,
            skippedIndex,
            changed: ["left", "pointer_moves"],
            action: {
              type: "pointer_move",
              pointer: "left",
              to: leftIndex,
              phase: "three_sum_skip_left",
              ...actionState({
                sortedReady: true,
                anchorIndex,
                leftIndex,
                rightIndex,
                movementPointer: "left",
                movementFrom: [skippedIndex, rightIndex],
                movementTo: [leftIndex, rightIndex],
                skippedIndex,
              }),
            },
          });
        }

        while (leftIndex < rightIndex && sorted[rightIndex] === sorted[rightIndex + 1]) {
          const skippedIndex = rightIndex;
          rightIndex -= 1;
          moves += 1;
          step({
            line: 17,
            event: "pointer_move",
            description: `Skip duplicate right value ${sorted[skippedIndex]} at index ${skippedIndex}; the same values must not enter the answer twice.`,
            sortedReady: true,
            anchorIndex,
            leftIndex,
            rightIndex,
            skippedIndex,
            changed: ["right", "pointer_moves"],
            action: {
              type: "pointer_move",
              pointer: "right",
              to: rightIndex,
              phase: "three_sum_skip_right",
              ...actionState({
                sortedReady: true,
                anchorIndex,
                leftIndex,
                rightIndex,
                movementPointer: "right",
                movementFrom: [leftIndex, skippedIndex],
                movementTo: [leftIndex, rightIndex],
                skippedIndex,
              }),
            },
          });
        }
      } else if (total < target) {
        const previousLeft = leftIndex;
        leftIndex += 1;
        moves += 1;
        step({
          line: 20,
          event: "pointer_move",
          description: `Move L from ${previousLeft} to ${leftIndex}. In sorted order this replaces ${sorted[previousLeft]} with a value that is at least as large.`,
          sortedReady: true,
          anchorIndex,
          leftIndex,
          rightIndex,
          changed: ["left", "pointer_moves"],
          action: {
            type: "pointer_move",
            pointer: "left",
            to: leftIndex,
            phase: "three_sum_move_left",
            ...actionState({
              sortedReady: true,
              anchorIndex,
              leftIndex,
              rightIndex,
              movementPointer: "left",
              movementFrom: [previousLeft, rightIndex],
              movementTo: [leftIndex, rightIndex],
            }),
          },
        });
      } else {
        const previousRight = rightIndex;
        rightIndex -= 1;
        moves += 1;
        step({
          line: 22,
          event: "pointer_move",
          description: `Move R from ${previousRight} to ${rightIndex}. In sorted order this replaces ${sorted[previousRight]} with a value that is at most as large.`,
          sortedReady: true,
          anchorIndex,
          leftIndex,
          rightIndex,
          changed: ["right", "pointer_moves"],
          action: {
            type: "pointer_move",
            pointer: "right",
            to: rightIndex,
            phase: "three_sum_move_right",
            ...actionState({
              sortedReady: true,
              anchorIndex,
              leftIndex,
              rightIndex,
              movementPointer: "right",
              movementFrom: [leftIndex, previousRight],
              movementTo: [leftIndex, rightIndex],
            }),
          },
        });
      }
    }

    processedAnchors.push(anchorIndex);
  }

  step({
    line: 23,
    event: "program_end",
    description: solutions.length > 0
      ? `Search complete. Sorting plus a linear two-pointer scan per anchor found ${solutions.length} unique triplet${solutions.length === 1 ? "" : "s"} in O(n^2) time.`
      : `Search complete. No three different indices produce the target ${target}.`,
    sortedReady: true,
    output: resultText(solutions),
    changed: ["triplets"],
    action: {
      type: "output_write",
      value: solutions.map((triplet) => [...triplet]),
      phase: solutions.length > 0 ? "three_sum_complete" : "three_sum_no_solution",
      ...actionState({ sortedReady: true }),
    },
  });

  return b.build();
}
