import type { GridHighlight, MemoryItem, TraceAction, TraceStep } from "../types/trace";

export type GridSearchKind = "bfs" | "dfs";
export type GridSearchOperation = "start" | "visit" | "frontier" | "found" | "exhausted";

export interface GridCoord {
  row: number;
  col: number;
}

export interface GridSearchCell extends GridCoord {
  value: number;
  role: string;
  isStart: boolean;
  isGoal: boolean;
  isWall: boolean;
  isVisited: boolean;
  isFrontier: boolean;
  isCurrent: boolean;
  isPath: boolean;
}

export interface GridSearchSceneModel {
  kind: GridSearchKind;
  operation: GridSearchOperation;
  grid: number[][];
  cells: GridSearchCell[];
  rows: number;
  cols: number;
  start: GridCoord | null;
  goal: GridCoord | null;
  current: GridCoord | null;
  frontierCells: GridCoord[];
  pathCells: GridCoord[];
  visitedCount: number;
  frontierSize: number;
  pathLength: number | null;
  frontierName: "Queue" | "Stack";
  frontierRule: "FIFO" | "LIFO";
  headline: string;
  detail: string;
}

function isGridHighlight(highlight: MemoryItem["highlights"][number]): highlight is GridHighlight {
  return "row" in highlight && "col" in highlight;
}

function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function coordKey(coord: GridCoord): string {
  return `${coord.row},${coord.col}`;
}

function sameCoord(a: GridCoord | null, b: GridCoord): boolean {
  return !!a && a.row === b.row && a.col === b.col;
}

function textOf(step: TraceStep): string {
  return step.description.toLowerCase();
}

function getGridMemory(step: TraceStep): { item: MemoryItem; grid: number[][]; highlights: GridHighlight[] } | null {
  const visual = step.visual;
  if (!visual || visual.type !== "grid") return null;
  const item = step.memory?.find((memoryItem) => memoryItem.id === visual.itemId);
  if (!item || item.type !== "grid" || item.value.length === 0) return null;
  if (!item.value.every((row) => Array.isArray(row))) return null;

  const grid = item.value.map((row) => (row as unknown[]).map((cell) => Number(cell)));
  if (!grid.every((row) => row.every((cell) => Number.isFinite(cell)))) return null;

  return {
    item,
    grid,
    highlights: item.highlights.filter(isGridHighlight),
  };
}

function actionTypes(step: TraceStep): Set<string> {
  return new Set((step.actions ?? []).map((action) => action.type));
}

function actionCoord(action: TraceAction | undefined): GridCoord | null {
  const cell = action?.cell;
  if (!Array.isArray(cell) || cell.length !== 2) return null;
  const row = numeric(cell[0]);
  const col = numeric(cell[1]);
  return row === null || col === null ? null : { row, col };
}

function actionPathLength(step: TraceStep): number | null {
  const action = step.actions?.find((item) => item.type === "path_found");
  const length = numeric(action?.length);
  return length === null || length < 0 ? null : length;
}

function firstHighlight(highlights: GridHighlight[], role: GridHighlight["role"]): GridCoord | null {
  const hit = highlights.find((highlight) => highlight.role === role);
  return hit ? { row: hit.row, col: hit.col } : null;
}

function roleSetByCell(highlights: GridHighlight[]): Map<string, Set<GridHighlight["role"]>> {
  const map = new Map<string, Set<GridHighlight["role"]>>();
  for (const highlight of highlights) {
    const key = coordKey(highlight);
    const roles = map.get(key) ?? new Set<GridHighlight["role"]>();
    roles.add(highlight.role);
    map.set(key, roles);
  }
  return map;
}

function inferKind(step: TraceStep): GridSearchKind {
  const text = textOf(step);
  if (step.event === "grid_pop" || text.includes("dfs") || text.includes("stack")) return "dfs";
  return "bfs";
}

function inferOperation(step: TraceStep): GridSearchOperation {
  const types = actionTypes(step);
  if (step.event === "path_found" || types.has("path_found")) return "found";
  if (step.event === "grid_exhausted") return "exhausted";
  if (step.event === "program_start") return "start";
  if (step.event === "grid_dequeue" || step.event === "grid_pop" || types.has("visit")) return "visit";
  return "frontier";
}

export function isGridSearchTraceStep(step: TraceStep): boolean {
  const memory = getGridMemory(step);
  if (!memory) return false;

  const types = actionTypes(step);
  const text = textOf(step);
  return (
    types.has("visit") ||
    types.has("path_found") ||
    types.has("expand_frontier") ||
    step.event === "grid_dequeue" ||
    step.event === "grid_pop" ||
    step.event === "grid_discover" ||
    step.event === "path_found" ||
    step.event === "grid_exhausted" ||
    text.includes("bfs") ||
    text.includes("dfs") ||
    text.includes("frontier") ||
    text.includes("queue") ||
    text.includes("stack")
  );
}

export function getGridSearchSceneModel(step: TraceStep): GridSearchSceneModel | null {
  const memory = getGridMemory(step);
  if (!memory || !isGridSearchTraceStep(step)) return null;

  const { grid, highlights } = memory;
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return null;

  const rolesByCell = roleSetByCell(highlights);
  const start = firstHighlight(highlights, "start");
  const goal = firstHighlight(highlights, "goal");
  const current =
    actionCoord(step.actions?.find((action) => action.type === "visit")) ??
    firstHighlight(highlights, "current");
  const frontierCells = highlights
    .filter((highlight) => highlight.role === "frontier")
    .map((highlight) => ({ row: highlight.row, col: highlight.col }));
  const pathCells = highlights
    .filter((highlight) => highlight.role === "path")
    .map((highlight) => ({ row: highlight.row, col: highlight.col }));
  const kind = inferKind(step);
  const operation = inferOperation(step);
  const frontierName = kind === "bfs" ? "Queue" : "Stack";
  const frontierRule = kind === "bfs" ? "FIFO" : "LIFO";
  const visitedCount = numeric(step.variables.visited_count) ?? highlights.filter((highlight) => highlight.role === "visited").length;
  const frontierSize = numeric(step.variables.frontier_size) ?? frontierCells.length;
  const pathLength = actionPathLength(step) ?? (pathCells.length > 1 ? pathCells.length - 1 : null);

  const cells: GridSearchCell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const coord = { row, col };
      const roles = rolesByCell.get(coordKey(coord)) ?? new Set<GridHighlight["role"]>();
      const isStart = roles.has("start");
      const isGoal = roles.has("goal");
      const isWall = roles.has("wall") || grid[row][col] === 1;
      const isCurrent = roles.has("current") || sameCoord(current, coord);
      const isPath = roles.has("path");
      const isFrontier = roles.has("frontier");
      const isVisited = roles.has("visited");
      const role = isPath
        ? "path"
        : isCurrent
          ? "current"
          : isFrontier
            ? "frontier"
            : isVisited
              ? "visited"
              : isStart
                ? "start"
                : isGoal
                  ? "goal"
                  : isWall
                    ? "wall"
                    : "empty";

      cells.push({
        row,
        col,
        value: grid[row][col],
        role,
        isStart,
        isGoal,
        isWall,
        isVisited,
        isFrontier,
        isCurrent,
        isPath,
      });
    }
  }

  let headline = step.description;
  let detail =
    kind === "bfs"
      ? "BFS uses a queue, so older frontier cells are expanded before newer ones."
      : "DFS uses a stack, so the newest frontier cell is expanded first.";

  if (operation === "start") {
    headline = `${kind.toUpperCase()} starts`;
    detail =
      kind === "bfs"
        ? "The queue begins at the start cell and expands outward level by level."
        : "The stack begins at the start cell and dives along one route before backtracking.";
  } else if (operation === "visit" && current) {
    headline = `${frontierName} visits (${current.row}, ${current.col})`;
    detail =
      kind === "bfs"
        ? "Pop from the front: every cell at the current distance is handled before deeper cells."
        : "Pop from the top: the newest discovered cell gets explored next.";
  } else if (operation === "frontier") {
    headline = `${frontierName} updated`;
    detail = `${frontierName} now has ${frontierSize} waiting cell${frontierSize === 1 ? "" : "s"}. Visited cells will not be added again.`;
  } else if (operation === "found") {
    headline = "Goal reached";
    detail =
      pathLength !== null
        ? `The highlighted path connects start to goal in ${pathLength} move${pathLength === 1 ? "" : "s"}.`
        : "The highlighted route shows how the search reached the goal.";
  } else if (operation === "exhausted") {
    headline = "Frontier exhausted";
    detail = "No waiting cells remain, so the goal cannot be reached from this start cell.";
  }

  return {
    kind,
    operation,
    grid,
    cells,
    rows,
    cols,
    start,
    goal,
    current,
    frontierCells,
    pathCells,
    visitedCount,
    frontierSize,
    pathLength,
    frontierName,
    frontierRule,
    headline,
    detail,
  };
}
