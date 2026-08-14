import { describe, expect, it } from "vitest";
import { buildBfsGridTrace, buildDfsGridTrace } from "../data/traces/grid-search";
import type { TraceStep } from "../types/trace";
import { getGridSearchSceneModel, isGridSearchTraceStep } from "./gridStage";

describe("grid search stage helpers", () => {
  it("detects the curated BFS grid trace from the first frame", () => {
    const trace = buildBfsGridTrace();
    const model = getGridSearchSceneModel(trace.steps[0]);

    expect(isGridSearchTraceStep(trace.steps[0])).toBe(true);
    expect(model).toMatchObject({
      kind: "bfs",
      operation: "start",
      frontierName: "Queue",
      frontierRule: "FIFO",
      visitedCount: 1,
      frontierSize: 1,
    });
    expect(model?.current).toEqual({ row: 0, col: 0 });
  });

  it("extracts the active visited cell on a BFS visit step", () => {
    const trace = buildBfsGridTrace();
    const visit = trace.steps.find((step) => step.event === "grid_dequeue");

    expect(visit).toBeDefined();
    const model = getGridSearchSceneModel(visit!);
    expect(model?.operation).toBe("visit");
    expect(model?.current).toEqual({ row: 0, col: 0 });
    expect(model?.cells.find((cell) => cell.row === 0 && cell.col === 0)?.isCurrent).toBe(true);
  });

  it("extracts final path data when BFS reaches the goal", () => {
    const trace = buildBfsGridTrace();
    const found = trace.steps.find((step) => step.event === "path_found");

    expect(found).toBeDefined();
    const model = getGridSearchSceneModel(found!);
    expect(model?.operation).toBe("found");
    expect(model?.pathLength).toBeGreaterThan(0);
    expect(model?.pathCells.length).toBeGreaterThan(1);
  });

  it("detects DFS as stack-driven LIFO search", () => {
    const trace = buildDfsGridTrace();
    const model = getGridSearchSceneModel(trace.steps[0]);

    expect(model).toMatchObject({
      kind: "dfs",
      frontierName: "Stack",
      frontierRule: "LIFO",
    });
  });

  it("ignores unrelated grid payloads without grid-search actions or text", () => {
    const step: TraceStep = {
      id: "step-000",
      index: 0,
      line: 1,
      event: "program_start",
      description: "Paint a static occupancy map.",
      variables: {},
      stack: [],
      output: "",
      visual: { type: "grid", itemId: "grid" },
      memory: [{ id: "grid", label: "grid", type: "grid", value: [[0, 1]], highlights: [] }],
    };

    expect(isGridSearchTraceStep(step)).toBe(false);
  });
});
