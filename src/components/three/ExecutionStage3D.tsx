import type { GridHighlight, MemoryHighlight, TraceStep } from "../../types/trace";
import { ThreeGrid } from "./ThreeGrid";
import { BinarySearchStage3D } from "./BinarySearchStage3D";
import { BubbleSortStage3D } from "./BubbleSortStage3D";
import { MergeSortStage3D } from "./MergeSortStage3D";
import { QuickSortStage3D } from "./QuickSortStage3D";
import { HeapSortStage3D } from "./HeapSortStage3D";
import { FactorialRecursionStage3D } from "./FactorialRecursionStage3D";
import { GridSearchStage3D } from "./GridSearchStage3D";
import { StringTapeStage3D, isStringTapeTraceStep } from "./StringTapeStage3D";
import { TwoSumStage3D, isTwoSumTraceStep } from "./TwoSumStage3D";
import { ThreeStage } from "./ThreeStage";
import type { BarDescriptor } from "./ThreeBars";
import { selectRendererForStep } from "../../engine/traceActions";
import { isFactorialRecursionStep } from "../../engine/recursionStage";
import { isGridSearchTraceStep } from "../../engine/gridStage";
import { isBinarySearchTraceStep } from "../../engine/searchStage";
import { isBubbleSortTraceStep, isHeapSortTraceStep, isMergeSortTraceStep, isQuickSortTraceStep } from "../../engine/sortStage";

function isArrayHighlight(
  h: MemoryHighlight | GridHighlight,
): h is MemoryHighlight {
  return "index" in h;
}

/**
 * Chooses the correct 3D renderer for a trace step:
 * - grid visuals → ThreeGrid (BFS/DFS)
 * - array visuals → ThreeStage with bars (sorting / searching)
 * - everything else → ThreeStage with variable chips + call stack only
 */
export function ExecutionStage3D({ step, steps }: { step: TraceStep; steps?: TraceStep[] }) {
  const visual = step.visual;
  const dispatch = selectRendererForStep(step);

  if (dispatch.kind === "array" && isStringTapeTraceStep(step)) {
    return <StringTapeStage3D step={step} steps={steps} />;
  }

  if (dispatch.kind === "array" && isTwoSumTraceStep(step)) {
    return <TwoSumStage3D step={step} steps={steps} />;
  }

  if (dispatch.kind === "array" && isBinarySearchTraceStep(step)) {
    return <BinarySearchStage3D step={step} steps={steps} />;
  }

  if (dispatch.kind === "array" && isQuickSortTraceStep(step)) {
    return <QuickSortStage3D step={step} steps={steps} />;
  }

  if (dispatch.kind === "array" && isHeapSortTraceStep(step)) {
    return <HeapSortStage3D step={step} steps={steps} />;
  }

  if (dispatch.kind === "array" && isBubbleSortTraceStep(step)) {
    return <BubbleSortStage3D step={step} steps={steps} />;
  }

  if (dispatch.kind === "array" && isMergeSortTraceStep(step)) {
    return <MergeSortStage3D step={step} steps={steps} />;
  }

  if (dispatch.kind === "recursion_tree" && isFactorialRecursionStep(step)) {
    return <FactorialRecursionStage3D step={step} steps={steps} />;
  }

  if (dispatch.kind === "grid" && isGridSearchTraceStep(step)) {
    return <GridSearchStage3D step={step} />;
  }

  if (dispatch.kind === "grid" && visual?.type === "grid") {
    const item = step.memory?.find((m) => m.id === visual.itemId);
    if (item && item.type === "grid") {
      const grid = item.value as unknown as number[][];
      const highlights = item.highlights.filter(
        (h): h is Extract<typeof h, { row: number }> => "row" in h,
      );
      return <ThreeGrid grid={grid} highlights={highlights} />;
    }
  }

  let values: number[] | undefined;
  let states: BarDescriptor[] | undefined;

  if (dispatch.kind === "array" && visual?.type === "array") {
    const item = step.memory?.find((m) => m.id === visual.itemId);
    if (item) {
      values = item.value.map((v) => Number(v));
      states = item.highlights.filter(isArrayHighlight).map((h) => ({
        index: h.index,
        role: h.role,
      }));
    }
  }

  return (
    <ThreeStage
      values={values}
      states={states}
      variables={step.variables}
      changed={step.changed?.variables}
      stack={step.stack}
      stepKey={step.id}
      storyboard={{ line: step.line, event: step.event, description: step.description }}
      steps={steps}
    />
  );
}
