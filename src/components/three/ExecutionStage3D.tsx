import type { GridHighlight, MemoryHighlight, TraceStep } from "../../types/trace";
import { ThreeGrid } from "./ThreeGrid";
import { ThreeStage } from "./ThreeStage";
import type { BarDescriptor } from "./ThreeBars";

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
export function ExecutionStage3D({ step }: { step: TraceStep }) {
  const visual = step.visual;

  if (visual?.type === "grid") {
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

  if (visual?.type === "array") {
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
      storyboard={{ line: step.line, event: step.event }}
    />
  );
}
