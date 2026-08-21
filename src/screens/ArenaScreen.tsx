import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Flag,
  Play,
  Pause,
  RotateCcw,
  Shuffle,
  SkipBack,
  SkipForward,
  Swords,
  Timer,
  Trophy,
} from "lucide-react";
import {
  binarySearchSteps,
  bubbleSortSteps,
  emptyGrid,
  gridSearchSteps,
  insertionSortSteps,
  randomGrid,
  selectionSortSteps,
  spiralGrid,
  type GridCell,
  type MazeSpec,
  type SortKind,
  type SortStep,
} from "../engine/sim";
import { useStepPlayback } from "../engine/useStepPlayback";
import { recordArenaMode } from "../lib/storage";
import { ThreeBars, type BarDescriptor } from "../components/three/ThreeBars";
import { ThreeGrid } from "../components/three/ThreeGrid";
import type { GridHighlight } from "../types/trace";
import { Badge, Button, Card, Kbd } from "../components/ui";
import { AnimatedHeading, HudFrame } from "../components/motionfx";
import { cn } from "../lib/cn";

const SORTS: { id: SortKind; label: string }[] = [
  { id: "bubble", label: "Bubble" },
  { id: "selection", label: "Selection" },
  { id: "insertion", label: "Insertion" },
];

function randomArray(size: number): number[] {
  const base = Array.from({ length: size }, () => Math.floor(Math.random() * 19) + 2);
  return base;
}

/* ------------------------------------------------------------------ */
/* Shared playback control row                                         */
/* ------------------------------------------------------------------ */

function PlayRow({
  index,
  total,
  playing,
  speed,
  onToggle,
  onStepBack,
  onStepForward,
  onReset,
  onReplay,
  onSpeed,
}: {
  index: number;
  total: number;
  playing: boolean;
  speed: number;
  onToggle: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onReset: () => void;
  onReplay: () => void;
  onSpeed: (s: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="primary" onClick={onToggle} title="Play / pause (space)">
        {playing ? <Pause size={14} /> : <Play size={14} />}
        {playing ? "Pause" : "Play"}
      </Button>
      <Button onClick={onStepBack} title="Previous step">
        <SkipBack size={14} />
      </Button>
      <Button onClick={onStepForward} title="Next step">
        <SkipForward size={14} />
      </Button>
      <Button onClick={onReset} title="Reset">
        <RotateCcw size={14} />
      </Button>
      <Button onClick={onReplay} title="Replay from the start">
        <Trophy size={14} /> Replay
      </Button>
      <span className="font-mono text-xs text-ink-400">
        step {Math.min(index + 1, total)} / {total}
      </span>
      <div className="ml-auto flex items-center gap-1">
        {[0.5, 1, 2, 4].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSpeed(s)}
            className={cn(
              "rounded px-1.5 py-0.5 font-mono text-[11px] transition-colors",
              speed === s
                ? "bg-ember-500/15 text-ember-300 ring-1 ring-ember-500/40"
                : "text-ink-400 hover:text-ink-200",
            )}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-ink-500">
        <Icon size={12} />
        <span className="text-[10px] font-semibold uppercase tracking-widest">
          {label}
        </span>
      </div>
      <p className="font-mono text-xl font-bold text-ink-100">{value}</p>
      {hint && <p className="text-[10px] text-ink-500">{hint}</p>}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Sort tab                                                            */
/* ------------------------------------------------------------------ */

const SORT_FNS: Record<SortKind, (a: number[]) => SortStep[]> = {
  bubble: bubbleSortSteps,
  selection: selectionSortSteps,
  insertion: insertionSortSteps,
};

function sortStates(step: SortStep): BarDescriptor[] {
  const states: BarDescriptor[] = [];
  step.compare?.forEach((i) => states.push({ index: i, role: "compare" }));
  step.swap?.forEach((i) => states.push({ index: i, role: "swap" }));
  if (step.key !== undefined) states.push({ index: step.key, role: "key" });
  const sortedIndices =
    step.sortedIndices ?? (step.sortedUpTo >= 0 ? Array.from({ length: step.sortedUpTo + 1 }, (_, i) => i) : []);
  sortedIndices.forEach((index) => states.push({ index, role: "sorted" }));
  return states;
}

function sortedCount(step: SortStep): number {
  return step.sortedIndices?.length ?? Math.max(step.sortedUpTo + 1, 0);
}

function SortTab() {
  const [kind, setKind] = useState<SortKind>("bubble");
  const [size, setSize] = useState(10);
  const [array, setArray] = useState<number[]>(() => randomArray(10));

  const steps = useMemo(() => SORT_FNS[kind](array), [kind, array]);
  const { index, playing, speed, toggle, stepForward, stepBack, reset, replay, setSpeed } =
    useStepPlayback(steps.length);
  const step = steps[Math.min(index, steps.length - 1)];

  const newArray = (n: number) => {
    setSize(n);
    setArray(randomArray(n));
  };

  const algLabel = SORTS.find((s) => s.id === kind)?.label ?? kind;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-md border border-ink-700">
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setKind(s.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                kind === s.id
                  ? "bg-ember-500/15 text-ember-300"
                  : "text-ink-400 hover:text-ink-200",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {[6, 8, 10, 12].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => newArray(n)}
              className={cn(
                "rounded px-2 py-1 font-mono text-xs transition-colors",
                size === n
                  ? "bg-ink-700 text-ink-100 ring-1 ring-ink-600"
                  : "text-ink-500 hover:text-ink-300",
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <Button variant="ghost" onClick={() => newArray(size)} title="New random array">
          <Shuffle size={13} /> Shuffle
        </Button>
        <div className="ml-auto">
          <Badge tone="amber">
            <Timer size={11} /> {algLabel}
          </Badge>
        </div>
      </div>

      <HudFrame label={algLabel} right="3D bars" className="h-72">
        <ThreeBars values={step.array} states={sortStates(step)} autoRotate />
      </HudFrame>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          icon={Activity}
          label="Comparisons"
          value={step.comparisons}
          hint="times two values were compared"
        />
        <Metric
          icon={ArrowRight}
          label="Swaps / shifts"
          value={step.swaps}
          hint={`${algLabel} sort moves`}
        />
        <Metric
          icon={Flag}
          label="Sorted"
          value={`${sortedCount(step)} / ${array.length}`}
          hint="elements locked in place"
        />
        <Metric
          icon={Timer}
          label="Steps"
          value={steps.length}
          hint="recorded operations"
        />
      </div>

      <PlayRow
        index={index}
        total={steps.length}
        playing={playing}
        speed={speed}
        onToggle={toggle}
        onStepBack={stepBack}
        onStepForward={stepForward}
        onReset={reset}
        onReplay={replay}
        onSpeed={setSpeed}
      />

      <p className="rounded-md border border-ink-800 bg-ink-900/60 px-3 py-2 text-xs leading-relaxed text-ink-400">
        {step.description}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Search tab                                                          */
/* ------------------------------------------------------------------ */

function searchStates(
  step: ReturnType<typeof binarySearchSteps>[number],
): BarDescriptor[] {
  const states: BarDescriptor[] = [];
  const isFound = step.status === "found";
  for (let i = 0; i < step.array.length; i++) {
    if (step.mid === i) {
      states.push({ index: i, role: isFound ? "found" : "mid" });
    } else if (i >= step.low && i <= step.high) {
      states.push({ index: i, role: "default" });
    } else {
      states.push({ index: i, role: "out" });
    }
  }
  return states;
}

function SearchTab() {
  const [array, setArray] = useState<number[]>(() =>
    randomArray(12).sort((a, b) => a - b),
  );
  const [target, setTarget] = useState<number | null>(null);

  const steps = useMemo(
    () =>
      binarySearchSteps(
        array,
        target ?? array[Math.floor(Math.random() * array.length)] ?? 7,
      ),
    [array, target],
  );
  const { index, playing, speed, toggle, stepForward, stepBack, reset, replay, setSpeed } =
    useStepPlayback(steps.length);
  const step = steps[Math.min(index, steps.length - 1)];

  const pickTarget = () => {
    const inList = Math.random() < 0.7;
    setTarget(inList ? array[Math.floor(Math.random() * array.length)] : 99 + Math.floor(Math.random() * 40));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => setArray(randomArray(12).sort((a, b) => a - b))}>
          <Shuffle size={13} /> New array
        </Button>
        <Button variant="ghost" onClick={pickTarget}>
          <Flag size={13} /> Pick target
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-widest text-ink-500">
            Searching for
          </span>
          <span className="rounded-md border border-ember-500/50 bg-ember-500/15 px-2.5 py-1 font-mono text-sm font-bold text-ember-300">
            {target ?? "—"}
          </span>
        </div>
      </div>

      <HudFrame label="binary search" right="3D bars" className="h-72">
        <ThreeBars values={step.array} states={searchStates(step)} autoRotate />
      </HudFrame>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          icon={Activity}
          label="Probes"
          value={step.probes}
          hint="mid elements inspected"
        />
        <Metric
          icon={Flag}
          label="Range"
          value={
            step.status === "not-found"
              ? "∅"
              : `[${step.low}..${step.high}]`
          }
          hint={step.status === "not-found" ? "range collapsed" : "indices still live"}
        />
        <Metric
          icon={ArrowRight}
          label="Status"
          value={step.status.replace("-", " ")}
          hint={step.status === "found" ? "target located" : step.status === "not-found" ? "target absent" : "searching"}
        />
        <Metric icon={Timer} label="List size" value={array.length} hint="sorted input" />
      </div>

      <PlayRow
        index={index}
        total={steps.length}
        playing={playing}
        speed={speed}
        onToggle={toggle}
        onStepBack={stepBack}
        onStepForward={stepForward}
        onReset={reset}
        onReplay={replay}
        onSpeed={setSpeed}
      />

      <p className="rounded-md border border-ink-800 bg-ink-900/60 px-3 py-2 text-xs leading-relaxed text-ink-400">
        {step.description}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Race tab (BFS vs DFS)                                               */
/* ------------------------------------------------------------------ */

function RaceTab() {
  const [grid, setGrid] = useState<GridCell[][]>(() => randomGrid(6, 6, 0.25, 42));
  const [raceIndex, setRaceIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);

  const maze: MazeSpec = useMemo(
    () => ({ grid, start: [0, 0], goal: [grid.length - 1, grid[0].length - 1] }),
    [grid],
  );

  const bfsSteps = useMemo(() => gridSearchSteps(maze, "bfs"), [maze]);
  const dfsSteps = useMemo(() => gridSearchSteps(maze, "dfs"), [maze]);
  const total = Math.max(bfsSteps.length, dfsSteps.length);

  const bfIdx = Math.min(raceIndex, bfsSteps.length - 1);
  const dfIdx = Math.min(raceIndex, dfsSteps.length - 1);
  const bf = bfsSteps[bfIdx];
  const df = dfsSteps[dfIdx];

  const bfsFoundAt = useMemo(
    () => bfsSteps.findIndex((s) => s.path),
    [bfsSteps],
  );
  const dfsFoundAt = useMemo(
    () => dfsSteps.findIndex((s) => s.path),
    [dfsSteps],
  );
  const winner: "bfs" | "dfs" | "tie" | null =
    bfsFoundAt === -1
      ? dfsFoundAt === -1
        ? null
        : "dfs"
      : dfsFoundAt === -1
        ? "bfs"
        : bfsFoundAt < dfsFoundAt
          ? "bfs"
          : bfsFoundAt > dfsFoundAt
            ? "dfs"
            : "tie";

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(
      () =>
        setRaceIndex((i) => {
          const next = i + 1;
          if (next >= total - 1) setPlaying(() => false);
          return Math.min(next, total - 1);
        }),
      1000 / speed,
    );
    return () => window.clearInterval(id);
  }, [playing, speed, total, setRaceIndex, setPlaying]);

  const toggleWall = (r: number, c: number) => {
    if ((r === 0 && c === 0) || (r === grid.length - 1 && c === grid[0].length - 1)) return;
    setGrid((g) => g.map((row, rr) => row.map((cell, cc) => (rr === r && cc === c ? (cell === 1 ? 0 : 1) : cell))));
    setRaceIndex(0);
    setPlaying(false);
  };

  const applyPreset = (g: GridCell[][]) => {
    setGrid(g);
    setRaceIndex(0);
    setPlaying(false);
  };

  const gridHighlights = (step: { current?: [number, number]; frontier: [number, number][]; visited: [number, number][]; path?: [number, number][] }): GridHighlight[] => {
    const hs: GridHighlight[] = [];
    const push = (cell: [number, number], role: GridHighlight["role"]) =>
      hs.push({ row: cell[0], col: cell[1], role });
    push(maze.start, "start");
    push(maze.goal, "goal");
    step.visited.forEach((c) => push(c, "visited"));
    step.frontier.forEach((c) => push(c, "frontier"));
    if (step.current) push(step.current, "current");
    step.path?.forEach((c) => push(c, "path"));
    return hs;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => applyPreset(randomGrid(6, 6, 0.25))}>
          <Shuffle size={13} /> Random maze
        </Button>
        <Button variant="ghost" onClick={() => applyPreset(spiralGrid(6, 6))}>
          Spiral maze
        </Button>
        <Button variant="ghost" onClick={() => applyPreset(emptyGrid(6, 6))}>
          Clear walls
        </Button>
      </div>

      {/* Grid builder: click any cell to forge/toggle a wall */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-col gap-1">
          {grid.map((row, r) => (
            <div key={r} className="flex gap-1">
              {row.map((cell, c) => {
                const isStart = r === 0 && c === 0;
                const isGoal = r === grid.length - 1 && c === grid[0].length - 1;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleWall(r, c)}
                    title={isStart ? "Start" : isGoal ? "Goal" : "Toggle wall"}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-sm border text-[10px] font-bold transition-colors",
                      isStart
                        ? "border-verdant-300 bg-verdant-400/40 text-ink-950"
                        : isGoal
                          ? "border-ember-300 bg-ember-400/40 text-ink-950"
                          : cell === 1
                            ? "border-ink-500 bg-ink-600 text-ink-400"
                            : "border-ink-700 bg-ink-850 text-ink-600 hover:border-ink-600",
                    )}
                  >
                    {isStart ? "S" : isGoal ? "G" : ""}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <p className="max-w-[180px] text-[11px] leading-relaxed text-ink-500">
          Grid builder — click any cell to forge a wall. Start (S) and goal (G)
          are fixed; both algorithms race on this same maze.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="viewport-frame overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-ink-800 px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-arc-300">
              <Activity size={13} /> BFS — queue
            </span>
            {winner === "bfs" && <Badge tone="blue">winner</Badge>}
          </div>
          <div className="h-64">
            <ThreeGrid grid={bf.grid} highlights={gridHighlights(bf)} />
          </div>
          <div className="border-t border-ink-800 px-3 py-2 font-mono text-[11px] text-ink-400">
            visited {bf.visitedCount} · frontier {bf.frontier.length}
            {bf.path ? ` · path ${bf.path.length - 1} steps` : ""}
          </div>
        </Card>
        <Card className="viewport-frame overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-ink-800 px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-verdant-300">
              <Activity size={13} /> DFS — stack
            </span>
            {winner === "dfs" && <Badge tone="green">winner</Badge>}
          </div>
          <div className="h-64">
            <ThreeGrid grid={df.grid} highlights={gridHighlights(df)} />
          </div>
          <div className="border-t border-ink-800 px-3 py-2 font-mono text-[11px] text-ink-400">
            visited {df.visitedCount} · frontier {df.frontier.length}
            {df.path ? ` · path ${df.path.length - 1} steps` : ""}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          icon={Trophy}
          label="Race winner"
          value={winner === null ? "—" : winner === "tie" ? "tie" : winner.toUpperCase()}
          hint={winner === null ? "goal unreachable" : "reached goal first"}
        />
        <Metric
          icon={Flag}
          label="BFS steps"
          value={bfsFoundAt === -1 ? "—" : bfsFoundAt + 1}
          hint="operations to find the goal"
        />
        <Metric
          icon={Flag}
          label="DFS steps"
          value={dfsFoundAt === -1 ? "—" : dfsFoundAt + 1}
          hint="operations to find the goal"
        />
        <Metric
          icon={Timer}
          label="Visited at goal"
          value={`${bf.visitedCount} vs ${df.visitedCount}`}
          hint="cells explored before reaching the goal"
        />
      </div>

      <PlayRow
        index={raceIndex}
        total={total}
        playing={playing}
        speed={speed}
        onToggle={() => {
          if (raceIndex >= total - 1) {
            setRaceIndex(0);
            setPlaying(true);
          } else {
            setPlaying((p) => !p);
          }
        }}
        onStepBack={() => setRaceIndex((i) => Math.max(i - 1, 0))}
        onStepForward={() => setRaceIndex((i) => Math.min(i + 1, total - 1))}
        onReset={() => {
          setRaceIndex(0);
          setPlaying(false);
        }}
        onReplay={() => {
          setRaceIndex(0);
          setPlaying(true);
        }}
        onSpeed={setSpeed}
      />

      <p className="rounded-md border border-ink-800 bg-ink-900/60 px-3 py-2 text-xs leading-relaxed text-ink-400">
        {bfIdx === dfIdx
          ? `Both: ${bf.description}`
          : `BFS: ${bf.description}  ·  DFS: ${df.description}`}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Arena shell                                                         */
/* ------------------------------------------------------------------ */

export function ArenaScreen() {
  const [tab, setTab] = useState<"sort" | "search" | "race">("sort");

  useEffect(() => {
    recordArenaMode("visit");
    recordArenaMode("sort");
  }, []);

  const tabs: { id: typeof tab; label: string; hint: string }[] = [
    { id: "sort", label: "Sorting Visualizer", hint: "bubble · selection · insertion" },
    { id: "search", label: "Binary Search", hint: "halving range probes" },
    { id: "race", label: "BFS vs DFS Race", hint: "queue vs stack on the same maze" },
  ];

  const switchTab = (id: typeof tab) => {
    setTab(id);
    recordArenaMode(id);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ember-400/15 ring-1 ring-ember-500/40">
            <Swords size={18} className="text-ember-300" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ember-400">
              DSA Visual Battle Arena · P1
            </p>
            <AnimatedHeading
              text="Make algorithms race."
              className="text-2xl font-bold tracking-tight text-ink-100"
            />
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-300">
              Live simulators of your own arrays and mazes — no hand-authored
              traces here. Every comparison, probe, and visit is recorded and
              replayed in 3D.
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5 border-b border-ink-700 pb-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => switchTab(t.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-left transition-colors",
                tab === t.id
                  ? "bg-ember-500/15 text-ember-300 ring-1 ring-ember-500/40"
                  : "text-ink-400 hover:bg-ink-800 hover:text-ink-200",
              )}
            >
              <span className="block text-xs font-semibold">{t.label}</span>
              <span className="block text-[10px] text-ink-500">{t.hint}</span>
            </button>
          ))}
        </div>

        {tab === "sort" && <SortTab />}
        {tab === "search" && <SearchTab />}
        {tab === "race" && <RaceTab />}

        <div className="mt-6 flex items-center gap-2 text-[11px] text-ink-600">
          <Kbd>space</Kbd> play/pause · <Kbd>←</Kbd>
          <Kbd>→</Kbd> step — algorithms run locally; nothing is ever executed
          from user input.
        </div>
      </div>
    </div>
  );
}
