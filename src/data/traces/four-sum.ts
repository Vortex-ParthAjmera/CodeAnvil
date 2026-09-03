import type { MemoryItem, TraceAction } from "../../types/trace";
import { arrayMemory, arrayVisual, TraceBuilder } from "./builders";

export const FOUR_SUM_DEFAULT = [-1, 0, 1, 0, -2, 2, -1, 2];

export const FOUR_SUM_CODE = `arr = [-1, 0, 1, 0, -2, 2, -1, 2]
target = 0
arr.sort()
quadruplets = []
for first in range(len(arr) - 3):
    if first > 0 and arr[first] == arr[first - 1]:
        continue
    for second in range(first + 1, len(arr) - 2):
        if second > first + 1 and arr[second] == arr[second - 1]:
            continue
        left, right = second + 1, len(arr) - 1
        while left < right:
            total = arr[first] + arr[second] + arr[left] + arr[right]
            if total == target:
                quadruplets.append([arr[first], arr[second], arr[left], arr[right]])
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
print(quadruplets)`;

export interface FourSumTokenState {
  id: string;
  value: number;
  originalIndex: number;
  sortedIndex: number;
}

type MovementPointer = "left" | "right" | "both" | null;
type SkipPointer = "first" | "second" | "left" | "right" | null;

interface ActionStateOptions {
  sortedReady: boolean;
  firstIndex?: number;
  secondIndex?: number;
  leftIndex?: number;
  rightIndex?: number;
  total?: number | null;
  relation?: "low" | "high" | "equal" | null;
  foundIndices?: [number, number, number, number] | null;
  movementPointer?: MovementPointer;
  movementFrom?: [number, number] | null;
  movementTo?: [number, number] | null;
  skippedIndex?: number | null;
  skippedPointer?: SkipPointer;
}

function stableSortedTokens(values: number[]): FourSumTokenState[] {
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
  return `Quadruplets: ${JSON.stringify(solutions)}`;
}

/** Records every Four Sum decision without executing the displayed source. */
export function buildFourSumTrace(
  input: number[] = FOUR_SUM_DEFAULT,
  target = 0,
  code = FOUR_SUM_CODE,
  language = "python",
) {
  const original = [...input];
  const tokens = stableSortedTokens(original);
  const sorted = tokens.map((token) => token.value);
  const b = new TraceBuilder({
    title: "Four Sum",
    code,
    topic: "arrays",
    difficulty: "intermediate",
    language,
    durationSeconds: 220,
  });

  const solutions: number[][] = [];
  const processedFirstAnchors: number[] = [];
  const processedAnchorPairs: number[][] = [];
  let comparisons = 0;
  let moves = 0;

  const variables = (
    sortedReady: boolean,
    firstIndex = -1,
    secondIndex = -1,
    leftIndex = -1,
    rightIndex = -1,
    total: number | null = null,
  ) => ({
    algorithm: "four-sum",
    arr: sortedReady ? [...sorted] : [...original],
    target,
    sorted: sortedReady,
    first: firstIndex >= 0 ? firstIndex : null,
    second: secondIndex >= 0 ? secondIndex : null,
    left: leftIndex >= 0 ? leftIndex : null,
    right: rightIndex >= 0 ? rightIndex : null,
    total,
    quadruplets: solutions.map((quadruplet) => [...quadruplet]),
    comparisons,
    pointer_moves: moves,
  });

  const memory = (
    sortedReady: boolean,
    firstIndex = -1,
    secondIndex = -1,
    leftIndex = -1,
    rightIndex = -1,
    foundIndices: [number, number, number, number] | null = null,
    skippedIndex: number | null = null,
  ): MemoryItem[] => {
    const highlights: Array<{ index: number; role: string }> = [];
    for (const index of processedFirstAnchors) highlights.push({ index, role: "processed" });
    if (firstIndex >= 0) highlights.push({ index: firstIndex, role: "first-anchor" });
    if (secondIndex >= 0) highlights.push({ index: secondIndex, role: "second-anchor" });
    if (leftIndex >= 0) highlights.push({ index: leftIndex, role: "left" });
    if (rightIndex >= 0) highlights.push({ index: rightIndex, role: "right" });
    for (const index of foundIndices ?? []) highlights.push({ index, role: "found" });
    if (skippedIndex !== null) highlights.push({ index: skippedIndex, role: "duplicate" });
    return [arrayMemory("arr", "arr", sortedReady ? sorted : original, highlights)];
  };

  const actionState = ({
    sortedReady,
    firstIndex = -1,
    secondIndex = -1,
    leftIndex = -1,
    rightIndex = -1,
    total = null,
    relation = null,
    foundIndices = null,
    movementPointer = null,
    movementFrom = null,
    movementTo = null,
    skippedIndex = null,
    skippedPointer = null,
  }: ActionStateOptions) => ({
    targetSum: target,
    originalValues: [...original],
    sortedValues: [...sorted],
    tokens: tokens.map((token) => ({ ...token })),
    sortedReady,
    firstIndex,
    secondIndex,
    leftIndex,
    rightIndex,
    total,
    relation,
    solutions: solutions.map((quadruplet) => [...quadruplet]),
    foundIndices,
    processedFirstAnchors: [...processedFirstAnchors],
    processedAnchorPairs: processedAnchorPairs.map((pair) => [...pair]),
    comparisons,
    moves,
    movementPointer,
    movementFrom,
    movementTo,
    skippedIndex,
    skippedPointer,
  });

  const step = ({
    line,
    event,
    description,
    action,
    sortedReady,
    firstIndex = -1,
    secondIndex = -1,
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
    firstIndex?: number;
    secondIndex?: number;
    leftIndex?: number;
    rightIndex?: number;
    total?: number | null;
    foundIndices?: [number, number, number, number] | null;
    skippedIndex?: number | null;
    output?: string;
    changed?: string[];
  }) => b.step({
    line,
    event,
    description,
    variables: variables(sortedReady, firstIndex, secondIndex, leftIndex, rightIndex, total),
    output,
    memory: memory(sortedReady, firstIndex, secondIndex, leftIndex, rightIndex, foundIndices, skippedIndex),
    visual: arrayVisual("arr"),
    changed: { variables: changed, output: output !== "" },
    actions: [action],
  });

  step({
    line: 1,
    event: "program_start",
    description: `Start with ${original.length} values. Four nested loops cost O(n^4); sorting lets the final two choices become one inward scan.`,
    sortedReady: false,
    changed: ["arr", "target"],
    action: {
      type: "assignment",
      target: "arr",
      value: [...original],
      phase: "four_sum_start",
      ...actionState({ sortedReady: false }),
    },
  });

  step({
    line: 3,
    event: "assignment",
    description: `Sort into [${sorted.join(", ")}]. Once first and second are locked, L and R can steer the remaining sum.`,
    sortedReady: true,
    changed: ["arr", "sorted"],
    action: {
      type: "assignment",
      target: "arr",
      value: [...sorted],
      phase: "four_sum_sort",
      ...actionState({ sortedReady: true }),
    },
  });

  for (let firstIndex = 0; firstIndex <= sorted.length - 4; firstIndex += 1) {
    if (firstIndex > 0 && sorted[firstIndex] === sorted[firstIndex - 1]) {
      processedFirstAnchors.push(firstIndex);
      step({
        line: 6,
        event: "condition_check",
        description: `Skip first anchor ${sorted[firstIndex]} at index ${firstIndex}; the previous pass already covered every quadruplet beginning with this value.`,
        sortedReady: true,
        firstIndex,
        skippedIndex: firstIndex,
        changed: ["first"],
        action: {
          type: "condition_check",
          condition: "first > 0 and arr[first] == arr[first - 1]",
          result: true,
          phase: "four_sum_skip_first",
          ...actionState({ sortedReady: true, firstIndex, skippedIndex: firstIndex, skippedPointer: "first" }),
        },
      });
      continue;
    }

    step({
      line: 5,
      event: "loop_iteration",
      description: `Lock first anchor arr[${firstIndex}] = ${sorted[firstIndex]}. The second anchor will move through the values to its right.`,
      sortedReady: true,
      firstIndex,
      changed: ["first"],
      action: {
        type: "loop_iteration",
        phase: "four_sum_lock_first",
        ...actionState({ sortedReady: true, firstIndex }),
      },
    });

    for (let secondIndex = firstIndex + 1; secondIndex <= sorted.length - 3; secondIndex += 1) {
      if (secondIndex > firstIndex + 1 && sorted[secondIndex] === sorted[secondIndex - 1]) {
        processedAnchorPairs.push([firstIndex, secondIndex]);
        step({
          line: 9,
          event: "condition_check",
          description: `Skip second anchor ${sorted[secondIndex]} at index ${secondIndex}; this first/second value pair was already scanned.`,
          sortedReady: true,
          firstIndex,
          secondIndex,
          skippedIndex: secondIndex,
          changed: ["second"],
          action: {
            type: "condition_check",
            condition: "second > first + 1 and arr[second] == arr[second - 1]",
            result: true,
            phase: "four_sum_skip_second",
            ...actionState({ sortedReady: true, firstIndex, secondIndex, skippedIndex: secondIndex, skippedPointer: "second" }),
          },
        });
        continue;
      }

      let leftIndex = secondIndex + 1;
      let rightIndex = sorted.length - 1;
      step({
        line: 11,
        event: "loop_iteration",
        description: `Lock second anchor arr[${secondIndex}] = ${sorted[secondIndex]}. L=${leftIndex} and R=${rightIndex} now solve the remaining pair sum.`,
        sortedReady: true,
        firstIndex,
        secondIndex,
        leftIndex,
        rightIndex,
        changed: ["second", "left", "right"],
        action: {
          type: "loop_iteration",
          phase: "four_sum_lock_second",
          ...actionState({ sortedReady: true, firstIndex, secondIndex, leftIndex, rightIndex }),
        },
      });

      while (leftIndex < rightIndex) {
        const total = sorted[firstIndex] + sorted[secondIndex] + sorted[leftIndex] + sorted[rightIndex];
        const relation = total === target ? "equal" : total < target ? "low" : "high";
        comparisons += 1;
        const compareStep = step({
          line: 13,
          event: "comparison",
          description: relation === "equal"
            ? `${sorted[firstIndex]} + ${sorted[secondIndex]} + ${sorted[leftIndex]} + ${sorted[rightIndex]} = ${target}. Four different positions form a valid quadruplet.`
            : relation === "low"
              ? `The four values total ${total}, below ${target}. Keep both anchors fixed and move L right.`
              : `The four values total ${total}, above ${target}. Keep both anchors fixed and move R left.`,
          sortedReady: true,
          firstIndex,
          secondIndex,
          leftIndex,
          rightIndex,
          total,
          changed: ["total", "comparisons"],
          action: {
            type: "compare",
            left: total,
            right: target,
            result: total === target,
            phase: `four_sum_compare_${relation}`,
            ...actionState({ sortedReady: true, firstIndex, secondIndex, leftIndex, rightIndex, total, relation }),
          },
        });

        if (comparisons === 1) {
          b.prompt({
            stepId: compareStep.id,
            type: "choose_explanation",
            question: total < target
              ? `The total is ${total}, below ${target}. Which unlocked pointer can increase it?`
              : `The total is ${total}, above ${target}. Which unlocked pointer can decrease it?`,
            target: { relation, total, target },
            answer: total < target ? "Move L right" : "Move R left",
            choices: ["Move L right", "Move R left", "Move an anchor"],
            explanation: total < target
              ? "Sorted order guarantees that moving L right cannot make the total smaller."
              : "Sorted order guarantees that moving R left cannot make the total larger.",
          });
        }

        if (total === target) {
          const foundIndices: [number, number, number, number] = [firstIndex, secondIndex, leftIndex, rightIndex];
          const quadruplet = foundIndices.map((index) => sorted[index]);
          solutions.push(quadruplet);
          step({
            line: 15,
            event: "output_write",
            description: `Save [${quadruplet.join(", ")}]. The solution shelf now contains ${solutions.length} unique result${solutions.length === 1 ? "" : "s"}.`,
            sortedReady: true,
            firstIndex,
            secondIndex,
            leftIndex,
            rightIndex,
            total,
            foundIndices,
            output: resultText(solutions),
            changed: ["quadruplets"],
            action: {
              type: "output_write",
              value: [...quadruplet],
              phase: "four_sum_found",
              ...actionState({ sortedReady: true, firstIndex, secondIndex, leftIndex, rightIndex, total, relation: "equal", foundIndices }),
            },
          });

          const previousLeft = leftIndex;
          const previousRight = rightIndex;
          leftIndex += 1;
          rightIndex -= 1;
          moves += 2;
          step({
            line: 16,
            event: "pointer_move",
            description: `Move both free pointers inward: L ${previousLeft} -> ${leftIndex}, R ${previousRight} -> ${rightIndex}.`,
            sortedReady: true,
            firstIndex,
            secondIndex,
            leftIndex,
            rightIndex,
            changed: ["left", "right", "pointer_moves"],
            action: {
              type: "pointer_move",
              pointer: "left/right",
              to: [leftIndex, rightIndex],
              phase: "four_sum_move_both",
              ...actionState({
                sortedReady: true,
                firstIndex,
                secondIndex,
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
              line: 19,
              event: "pointer_move",
              description: `Skip duplicate L value ${sorted[skippedIndex]} at index ${skippedIndex}; it would repeat the same quadruplet.`,
              sortedReady: true,
              firstIndex,
              secondIndex,
              leftIndex,
              rightIndex,
              skippedIndex,
              changed: ["left", "pointer_moves"],
              action: {
                type: "pointer_move",
                pointer: "left",
                to: leftIndex,
                phase: "four_sum_skip_left",
                ...actionState({
                  sortedReady: true,
                  firstIndex,
                  secondIndex,
                  leftIndex,
                  rightIndex,
                  movementPointer: "left",
                  movementFrom: [skippedIndex, rightIndex],
                  movementTo: [leftIndex, rightIndex],
                  skippedIndex,
                  skippedPointer: "left",
                }),
              },
            });
          }

          while (leftIndex < rightIndex && sorted[rightIndex] === sorted[rightIndex + 1]) {
            const skippedIndex = rightIndex;
            rightIndex -= 1;
            moves += 1;
            step({
              line: 21,
              event: "pointer_move",
              description: `Skip duplicate R value ${sorted[skippedIndex]} at index ${skippedIndex}; it cannot create a new value combination.`,
              sortedReady: true,
              firstIndex,
              secondIndex,
              leftIndex,
              rightIndex,
              skippedIndex,
              changed: ["right", "pointer_moves"],
              action: {
                type: "pointer_move",
                pointer: "right",
                to: rightIndex,
                phase: "four_sum_skip_right",
                ...actionState({
                  sortedReady: true,
                  firstIndex,
                  secondIndex,
                  leftIndex,
                  rightIndex,
                  movementPointer: "right",
                  movementFrom: [leftIndex, skippedIndex],
                  movementTo: [leftIndex, rightIndex],
                  skippedIndex,
                  skippedPointer: "right",
                }),
              },
            });
          }
        } else if (total < target) {
          const previousLeft = leftIndex;
          leftIndex += 1;
          moves += 1;
          step({
            line: 23,
            event: "pointer_move",
            description: `Move L from ${previousLeft} to ${leftIndex}. The two anchors stay locked while the free pair grows.`,
            sortedReady: true,
            firstIndex,
            secondIndex,
            leftIndex,
            rightIndex,
            changed: ["left", "pointer_moves"],
            action: {
              type: "pointer_move",
              pointer: "left",
              to: leftIndex,
              phase: "four_sum_move_left",
              ...actionState({
                sortedReady: true,
                firstIndex,
                secondIndex,
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
            line: 25,
            event: "pointer_move",
            description: `Move R from ${previousRight} to ${rightIndex}. The anchors stay locked while the free pair shrinks.`,
            sortedReady: true,
            firstIndex,
            secondIndex,
            leftIndex,
            rightIndex,
            changed: ["right", "pointer_moves"],
            action: {
              type: "pointer_move",
              pointer: "right",
              to: rightIndex,
              phase: "four_sum_move_right",
              ...actionState({
                sortedReady: true,
                firstIndex,
                secondIndex,
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

      processedAnchorPairs.push([firstIndex, secondIndex]);
    }
    processedFirstAnchors.push(firstIndex);
  }

  step({
    line: 26,
    event: "program_end",
    description: solutions.length > 0
      ? `Search complete. Two anchors plus one inward scan found ${solutions.length} unique quadruplet${solutions.length === 1 ? "" : "s"} in O(n^3) time.`
      : `Search complete. No four different indices produce the target ${target}.`,
    sortedReady: true,
    output: resultText(solutions),
    changed: ["quadruplets"],
    action: {
      type: "output_write",
      value: solutions.map((quadruplet) => [...quadruplet]),
      phase: solutions.length > 0 ? "four_sum_complete" : "four_sum_no_solution",
      ...actionState({ sortedReady: true }),
    },
  });

  return b.build();
}
