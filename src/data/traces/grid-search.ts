import type { TraceDocument } from "../../types/trace";
import type { GridCell, MazeSpec } from "../../engine/sim";
import { buildGridTrace } from "./builders";

/**
 * A 5x5 workshop grid with a few walls. Both BFS and DFS find a path from
 * (0,0) to (4,4), and the difference in exploration order is the teaching point.
 */
export const GRID: GridCell[][] = [
  [0, 0, 0, 0, 0],
  [0, 1, 1, 0, 0],
  [0, 0, 1, 1, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
];

export const GRID_MAZE: MazeSpec = {
  grid: GRID,
  start: [0, 0],
  goal: [4, 4],
};

export const BFS_GRID_CODE = `# Search the grid from (0,0) to (4,4)\nqueue = [(0, 0)]\nvisited = {(0, 0)}\nwhile queue:\n    (r, c) = queue.pop(0)\n    if (r, c) == goal:\n        print("Path found:")\n        break\n    for (nr, nc) in neighbors((r, c)):\n        if (nr, nc) not in visited:\n            visited.add((nr, nc))\n            queue.append((nr, nc))`;

export const DFS_GRID_CODE = BFS_GRID_CODE.replace("queue.pop(0)", "queue.pop()");

export function buildBfsGridTrace(): TraceDocument {
  return buildGridTrace(
    { title: "BFS on a Grid", topic: "graphs", difficulty: "intermediate", kind: "bfs", durationSeconds: 150 },
    GRID_MAZE,
  );
}

export function buildDfsGridTrace(): TraceDocument {
  return buildGridTrace(
    { title: "DFS on a Grid", topic: "graphs", difficulty: "intermediate", kind: "dfs", durationSeconds: 150 },
    GRID_MAZE,
  );
}
