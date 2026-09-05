import type { MemoryItem, TraceAction } from "../../types/trace";
import { arrayMemory, arrayVisual, TraceBuilder } from "./builders";

export const TRAPPING_RAIN_WATER_DEFAULT = [3, 0, 2, 0, 4, 1, 2, 1];

export const TRAPPING_RAIN_WATER_CODE = `height = [3, 0, 2, 0, 4, 1, 2, 1]
if len(height) < 2 or any(value < 0 for value in height): raise ValueError("use non-negative heights")
left, right = 0, len(height) - 1
left_max = right_max = 0
water = 0
while left < right:
    if height[left] <= height[right]:
        left_max = max(left_max, height[left])
        water += left_max - height[left]
        left += 1
    else:
        right_max = max(right_max, height[right])
        water += right_max - height[right]
        right -= 1
print(water)`;

export interface RainWallTokenState {
  id: string;
  value: number;
  index: number;
}

type RainSide = "left" | "right" | null;

interface RainStateOptions {
  activeIndex?: number | null;
  activeSide?: RainSide;
  decision?: RainSide;
  sideMaxBefore?: number | null;
  sideMaxAfter?: number | null;
  waterAdded?: number;
  pointerFrom?: number | null;
  pointerTo?: number | null;
  invalidReason?: string | null;
}

/** Records the two-pointer rain-water proof one resolved edge at a time. */
export function buildTrappingRainWaterTrace(
  input: number[] = TRAPPING_RAIN_WATER_DEFAULT,
  code = TRAPPING_RAIN_WATER_CODE,
  language = "python",
) {
  const heights = [...input];
  const waterDepths = heights.map(() => 0);
  const tokens: RainWallTokenState[] = heights.map((value, index) => ({ id: `wall-${index}`, value, index }));
  const b = new TraceBuilder({
    title: "Trapping Rain Water",
    code,
    topic: "arrays",
    difficulty: "advanced",
    language,
    durationSeconds: 170,
  });

  let left = 0;
  let right = Math.max(0, heights.length - 1);
  let leftMax = 0;
  let rightMax = 0;
  let totalWater = 0;
  let comparisons = 0;
  let pointerMoves = 0;
  let filledCells = 0;
  const processedIndices: number[] = [];
  let promptAdded = false;
  const invalidReason = heights.length < 2
    ? "at least two wall heights are required"
    : heights.some((value) => !Number.isFinite(value))
      ? "every height must be finite"
      : heights.some((value) => value < 0)
        ? "wall heights cannot be negative"
        : null;

  const variables = () => ({
    algorithm: "trapping-rain-water",
    height: [...heights],
    left,
    right,
    left_max: leftMax,
    right_max: rightMax,
    water: totalWater,
    water_depths: [...waterDepths],
    comparisons,
    pointer_moves: pointerMoves,
    filled_cells: filledCells,
  });

  const memory = ({
    activeIndex = null,
    activeSide = null,
    decision = null,
  }: {
    activeIndex?: number | null;
    activeSide?: RainSide;
    decision?: RainSide;
  } = {}): MemoryItem[] => {
    const heightHighlights: Array<{ index: number; role: string }> = [];
    const waterHighlights: Array<{ index: number; role: string }> = [];
    processedIndices.forEach((index) => heightHighlights.push({ index, role: "resolved" }));
    if (left >= 0 && left < heights.length) heightHighlights.push({ index: left, role: decision === "left" ? "chosen-left" : "left" });
    if (right >= 0 && right < heights.length) heightHighlights.push({ index: right, role: decision === "right" ? "chosen-right" : "right" });
    if (activeIndex !== null) {
      heightHighlights.push({ index: activeIndex, role: activeSide === "left" ? "active-left" : "active-right" });
      if (waterDepths[activeIndex] > 0) waterHighlights.push({ index: activeIndex, role: "filling" });
    }
    waterDepths.forEach((depth, index) => {
      if (depth > 0 && index !== activeIndex) waterHighlights.push({ index, role: "water" });
    });
    return [
      arrayMemory("height", "walls", heights, heightHighlights),
      arrayMemory("water", "trapped water", waterDepths, waterHighlights),
    ];
  };

  const actionState = ({
    activeIndex = null,
    activeSide = null,
    decision = null,
    sideMaxBefore = null,
    sideMaxAfter = null,
    waterAdded = 0,
    pointerFrom = null,
    pointerTo = null,
    invalidReason: stateInvalidReason = null,
  }: RainStateOptions = {}) => ({
    heights: [...heights],
    tokens: tokens.map((token) => ({ ...token })),
    waterDepths: [...waterDepths],
    leftIndex: left,
    rightIndex: right,
    leftMax,
    rightMax,
    leftHeight: left >= 0 && left < heights.length ? heights[left] : null,
    rightHeight: right >= 0 && right < heights.length ? heights[right] : null,
    activeIndex,
    activeSide,
    decision,
    sideMaxBefore,
    sideMaxAfter,
    waterAdded,
    totalWater,
    pointerFrom,
    pointerTo,
    processedIndices: [...processedIndices],
    invalidReason: stateInvalidReason,
    comparisons,
    pointerMoves,
    filledCells,
  });

  const addStep = ({
    line,
    event,
    description,
    action,
    activeIndex = null,
    activeSide = null,
    decision = null,
    output = "",
    changed = [],
  }: {
    line: number;
    event: string;
    description: string;
    action: TraceAction;
    activeIndex?: number | null;
    activeSide?: RainSide;
    decision?: RainSide;
    output?: string;
    changed?: string[];
  }) => b.step({
    line,
    event,
    description,
    variables: variables(),
    output,
    memory: memory({ activeIndex, activeSide, decision }),
    visual: arrayVisual("height"),
    changed: { variables: changed, output: output !== "" },
    actions: [action],
  });

  addStep({
    line: 1,
    event: "program_start",
    description: `Measure trapped water between ${heights.length} walls. The lower outside wall decides which edge can be resolved without guessing about the unseen interior.`,
    changed: ["height", "left", "right", "left_max", "right_max", "water"],
    action: {
      type: "assignment",
      target: "height",
      value: [...heights],
      phase: "rain_start",
      ...actionState(),
    },
  });

  if (invalidReason) {
    addStep({
      line: 2,
      event: "error",
      description: `Input rejected: ${invalidReason}. Water depths were left at zero instead of inventing a basin.`,
      changed: ["height"],
      action: {
        type: "condition_check",
        condition: "len(height) >= 2 and every height >= 0",
        result: false,
        phase: "rain_invalid",
        ...actionState({ invalidReason }),
      },
    });
    return b.build();
  }

  addStep({
    line: 2,
    event: "condition_check",
    description: "All heights are non-negative. Each pointer will move inward only after its current cell is permanently resolved, so the scan stays O(n).",
    action: {
      type: "condition_check",
      condition: "len(height) >= 2 and every height >= 0",
      result: true,
      phase: "rain_validate",
      ...actionState(),
    },
  });

  while (left < right) {
    const leftHeight = heights[left];
    const rightHeight = heights[right];
    const chooseLeft = leftHeight <= rightHeight;
    const decision: RainSide = chooseLeft ? "left" : "right";
    comparisons += 1;
    addStep({
      line: 7,
      event: "comparison",
      description: chooseLeft
        ? `Compare wall ${left} (${leftHeight}) with wall ${right} (${rightHeight}). The left wall is no taller, so the right wall guarantees a cap for index ${left}.`
        : `Compare wall ${left} (${leftHeight}) with wall ${right} (${rightHeight}). The right wall is lower, so the left wall guarantees a cap for index ${right}.`,
      decision,
      changed: ["comparisons"],
      action: {
        type: "compare",
        left: leftHeight,
        right: rightHeight,
        result: chooseLeft,
        phase: "rain_compare",
        ...actionState({ decision }),
      },
    });

    if (chooseLeft) {
      const activeIndex = left;
      const height = heights[activeIndex];
      const sideMaxBefore = leftMax;
      const waterAdded = Math.max(0, sideMaxBefore - height);
      if (height >= sideMaxBefore) {
        leftMax = height;
        processedIndices.push(activeIndex);
        addStep({
          line: 8,
          event: "assignment",
          description: `Wall ${activeIndex} reaches ${height}, at least the previous left maximum ${sideMaxBefore}. Raise left_max to ${leftMax}; a boundary wall stores no water above itself.`,
          activeIndex,
          activeSide: "left",
          decision,
          changed: ["left_max"],
          action: {
            type: "assignment",
            target: "left_max",
            value: leftMax,
            phase: "rain_raise_left",
            ...actionState({ activeIndex, activeSide: "left", decision, sideMaxBefore, sideMaxAfter: leftMax }),
          },
        });
      } else {
        waterDepths[activeIndex] = waterAdded;
        totalWater += waterAdded;
        filledCells += 1;
        processedIndices.push(activeIndex);
        const trapStep = addStep({
          line: 9,
          event: "assignment",
          description: `At index ${activeIndex}, left_max ${leftMax} minus height ${height} traps ${waterAdded}. Total water becomes ${totalWater}.`,
          activeIndex,
          activeSide: "left",
          decision,
          changed: ["water", "water_depths", "filled_cells"],
          action: {
            type: "assignment",
            target: "water",
            value: totalWater,
            phase: "rain_trap_left",
            ...actionState({ activeIndex, activeSide: "left", decision, sideMaxBefore, sideMaxAfter: leftMax, waterAdded }),
          },
        });
        if (!promptAdded) {
          promptAdded = true;
          b.prompt({
            stepId: trapStep.id,
            type: "choose_explanation",
            question: "Why can this water amount be finalized before seeing every interior wall?",
            target: { activeIndex, side: "left", leftMax, oppositeHeight: rightHeight },
            answer: "The opposite boundary is at least as tall as the chosen side",
            choices: [
              "The opposite boundary is at least as tall as the chosen side",
              "Water always uses the tallest wall in the array",
              "Every interior height has already been sorted",
            ],
            explanation: "The lower outside edge limits the water level. A wall at least that tall already exists on the opposite side.",
          });
        }
      }

      const pointerFrom = left;
      left += 1;
      pointerMoves += 1;
      addStep({
        line: 10,
        event: "line_enter",
        description: `Index ${pointerFrom} is resolved forever. Move left from ${pointerFrom} to ${left}; right remains ${right}.`,
        activeIndex: pointerFrom,
        activeSide: "left",
        changed: ["left", "pointer_moves"],
        action: {
          type: "pointer_move",
          pointer: "left",
          to: left,
          phase: "rain_move_left",
          ...actionState({ activeIndex: pointerFrom, activeSide: "left", pointerFrom, pointerTo: left }),
        },
      });
    } else {
      const activeIndex = right;
      const height = heights[activeIndex];
      const sideMaxBefore = rightMax;
      const waterAdded = Math.max(0, sideMaxBefore - height);
      if (height >= sideMaxBefore) {
        rightMax = height;
        processedIndices.push(activeIndex);
        addStep({
          line: 12,
          event: "assignment",
          description: `Wall ${activeIndex} reaches ${height}, at least the previous right maximum ${sideMaxBefore}. Raise right_max to ${rightMax}; a boundary wall stores no water above itself.`,
          activeIndex,
          activeSide: "right",
          decision,
          changed: ["right_max"],
          action: {
            type: "assignment",
            target: "right_max",
            value: rightMax,
            phase: "rain_raise_right",
            ...actionState({ activeIndex, activeSide: "right", decision, sideMaxBefore, sideMaxAfter: rightMax }),
          },
        });
      } else {
        waterDepths[activeIndex] = waterAdded;
        totalWater += waterAdded;
        filledCells += 1;
        processedIndices.push(activeIndex);
        const trapStep = addStep({
          line: 13,
          event: "assignment",
          description: `At index ${activeIndex}, right_max ${rightMax} minus height ${height} traps ${waterAdded}. Total water becomes ${totalWater}.`,
          activeIndex,
          activeSide: "right",
          decision,
          changed: ["water", "water_depths", "filled_cells"],
          action: {
            type: "assignment",
            target: "water",
            value: totalWater,
            phase: "rain_trap_right",
            ...actionState({ activeIndex, activeSide: "right", decision, sideMaxBefore, sideMaxAfter: rightMax, waterAdded }),
          },
        });
        if (!promptAdded) {
          promptAdded = true;
          b.prompt({
            stepId: trapStep.id,
            type: "choose_explanation",
            question: "Why can this water amount be finalized before seeing every interior wall?",
            target: { activeIndex, side: "right", rightMax, oppositeHeight: leftHeight },
            answer: "The opposite boundary is at least as tall as the chosen side",
            choices: [
              "The opposite boundary is at least as tall as the chosen side",
              "Water always uses the tallest wall in the array",
              "Every interior height has already been sorted",
            ],
            explanation: "The lower outside edge limits the water level. A wall at least that tall already exists on the opposite side.",
          });
        }
      }

      const pointerFrom = right;
      right -= 1;
      pointerMoves += 1;
      addStep({
        line: 14,
        event: "line_enter",
        description: `Index ${pointerFrom} is resolved forever. Move right from ${pointerFrom} to ${right}; left remains ${left}.`,
        activeIndex: pointerFrom,
        activeSide: "right",
        changed: ["right", "pointer_moves"],
        action: {
          type: "pointer_move",
          pointer: "right",
          to: right,
          phase: "rain_move_right",
          ...actionState({ activeIndex: pointerFrom, activeSide: "right", pointerFrom, pointerTo: right }),
        },
      });
    }
  }

  const output = `Trapped water = ${totalWater} units | depths = [${waterDepths.join(", ")}]`;
  addStep({
    line: 15,
    event: "program_end",
    description: `The pointers meet at index ${left}. All resolvable basins contain ${totalWater} units total: [${waterDepths.join(", ")}]. Each edge was processed once, so time is O(n) and extra space is O(1).`,
    output,
    changed: ["water"],
    action: {
      type: "output_write",
      value: { total: totalWater, depths: [...waterDepths] },
      phase: "rain_complete",
      ...actionState({ activeIndex: left }),
    },
  });

  return b.build();
}
