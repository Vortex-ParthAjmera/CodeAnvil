import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RefreshCcw,
  RotateCcw,
} from "lucide-react";
import {
  createSortFrames,
  createTraversalFrames,
  graphEdges,
  graphNodes,
  makeDemoArray,
  type GraphNode,
  type SortAlgorithm,
  type TraversalMode,
} from "../dsa/algorithms";

type DsaTab = "sorting" | "graph";

interface DsaWorkbenchProps {
  activeTab: DsaTab;
  onTabChange: (tab: DsaTab) => void;
  reduceMotion: boolean;
}

const graphPositions: Record<GraphNode, { x: number; y: number }> = {
  A: { x: 350, y: 62 },
  B: { x: 185, y: 170 },
  C: { x: 515, y: 170 },
  D: { x: 92, y: 332 },
  E: { x: 350, y: 320 },
  F: { x: 608, y: 332 },
};

function clampSize(value: number) {
  if (!Number.isFinite(value)) return 8;
  return Math.min(12, Math.max(4, Math.round(value)));
}

export function DsaWorkbench({
  activeTab,
  onTabChange,
  reduceMotion,
}: DsaWorkbenchProps) {
  const [algorithm, setAlgorithm] = useState<SortAlgorithm>("Bubble Sort");
  const [size, setSize] = useState(8);
  const [seed, setSeed] = useState(17);
  const [sourceValues, setSourceValues] = useState(() => makeDemoArray(8, 17));
  const [sortIndex, setSortIndex] = useState(0);
  const [sortPlaying, setSortPlaying] = useState(false);
  const [traversal, setTraversal] = useState<TraversalMode>("BFS");
  const [startNode, setStartNode] = useState<GraphNode>("A");
  const [graphIndex, setGraphIndex] = useState(0);
  const [graphPlaying, setGraphPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const sortFrames = useMemo(
    () => createSortFrames(sourceValues, algorithm),
    [algorithm, sourceValues],
  );
  const traversalFrames = useMemo(
    () => createTraversalFrames(startNode, traversal),
    [startNode, traversal],
  );
  const sortFrame = sortFrames[Math.min(sortIndex, sortFrames.length - 1)];
  const graphFrame = traversalFrames[Math.min(graphIndex, traversalFrames.length - 1)];

  useEffect(() => {
    if (!sortPlaying) return;
    if (sortIndex >= sortFrames.length - 1) {
      setSortPlaying(false);
      return;
    }
    const timer = window.setTimeout(
      () => setSortIndex((current) => Math.min(current + 1, sortFrames.length - 1)),
      Math.max(180, 650 / speed),
    );
    return () => window.clearTimeout(timer);
  }, [sortFrames.length, sortIndex, sortPlaying, speed]);

  useEffect(() => {
    if (!graphPlaying) return;
    if (graphIndex >= traversalFrames.length - 1) {
      setGraphPlaying(false);
      return;
    }
    const timer = window.setTimeout(
      () => setGraphIndex((current) => Math.min(current + 1, traversalFrames.length - 1)),
      Math.max(220, 760 / speed),
    );
    return () => window.clearTimeout(timer);
  }, [graphIndex, graphPlaying, speed, traversalFrames.length]);

  function selectTab(tab: DsaTab) {
    setSortPlaying(false);
    setGraphPlaying(false);
    onTabChange(tab);
  }

  function changeAlgorithm(next: SortAlgorithm) {
    setAlgorithm(next);
    setSortIndex(0);
    setSortPlaying(false);
  }

  function changeSize(next: number) {
    const clamped = clampSize(next);
    setSize(clamped);
    setSourceValues(makeDemoArray(clamped, seed));
    setSortIndex(0);
    setSortPlaying(false);
  }

  function generateValues() {
    const nextSeed = seed + 31;
    setSeed(nextSeed);
    setSourceValues(makeDemoArray(size, nextSeed));
    setSortIndex(0);
    setSortPlaying(false);
  }

  function toggleSort() {
    setSortPlaying((current) => {
      if (!current && sortIndex >= sortFrames.length - 1) setSortIndex(0);
      return !current;
    });
  }

  function changeTraversal(next: TraversalMode) {
    setTraversal(next);
    setGraphIndex(0);
    setGraphPlaying(false);
  }

  function changeStartNode(next: GraphNode) {
    setStartNode(next);
    setGraphIndex(0);
    setGraphPlaying(false);
  }

  function toggleGraph() {
    setGraphPlaying((current) => {
      if (!current && graphIndex >= traversalFrames.length - 1) setGraphIndex(0);
      return !current;
    });
  }

  return (
    <section className={"ca-dsa" + (reduceMotion ? " reduce-motion" : "")} aria-label="DSA lab">
      <header className="ca-dsa__header">
        <div className="ca-segmented" role="tablist" aria-label="DSA views">
          <button
            aria-selected={activeTab === "sorting"}
            className={activeTab === "sorting" ? "is-active" : ""}
            onClick={() => selectTab("sorting")}
            role="tab"
            type="button"
          >
            Sorting
          </button>
          <button
            aria-selected={activeTab === "graph"}
            className={activeTab === "graph" ? "is-active" : ""}
            onClick={() => selectTab("graph")}
            role="tab"
            type="button"
          >
            Graph traversal
          </button>
        </div>
        <label className="ca-speed-select">
          <span>Speed</span>
          <select onChange={(event) => setSpeed(Number(event.target.value))} value={speed}>
            <option value="0.75">0.75x</option>
            <option value="1">1x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        </label>
      </header>

      {activeTab === "sorting" ? (
        <div className="ca-dsa__layout">
          <aside className="ca-dsa__controls">
            <label>
              <span>Algorithm</span>
              <select
                onChange={(event) => changeAlgorithm(event.target.value as SortAlgorithm)}
                value={algorithm}
              >
                <option>Bubble Sort</option>
                <option>Selection Sort</option>
                <option>Insertion Sort</option>
              </select>
            </label>
            <label>
              <span>Array size: {size}</span>
              <input
                max="12"
                min="4"
                onChange={(event) => changeSize(Number(event.target.value))}
                type="range"
                value={size}
              />
            </label>
            <button onClick={generateValues} type="button">
              <RefreshCcw size={15} />
              <span>New values</span>
            </button>
            <div className="ca-dsa__metrics">
              <div><span>Pass</span><strong>{sortFrame.pass}</strong></div>
              <div><span>Comparisons</span><strong>{sortFrame.comparisons}</strong></div>
              <div><span>Changes</span><strong>{sortFrame.changes}</strong></div>
            </div>
          </aside>

          <div className="ca-dsa__stage">
            <header>
              <span>{algorithm}</span>
              <strong>{sortFrame.description}</strong>
            </header>
            <div className="ca-sort-stage" aria-label={algorithm + " values"}>
              {sortFrame.values.map((value, index) => {
                const className = sortFrame.changed.includes(index)
                  ? "is-changed"
                  : sortFrame.compared.includes(index)
                    ? "is-compared"
                    : sortFrame.settled.includes(index)
                      ? "is-settled"
                      : "";
                return (
                  <div className={className} key={String(index) + "-" + String(value)}>
                    <i style={{ height: String(34 + value * 16) + "px" }} />
                    <strong>{value}</strong>
                    <span>{index}</span>
                  </div>
                );
              })}
            </div>
            <footer className="ca-dsa__timeline">
              <button
                disabled={sortIndex === 0}
                onClick={() => {
                  setSortPlaying(false);
                  setSortIndex((current) => Math.max(0, current - 1));
                }}
                title="Previous step"
                type="button"
              >
                <ChevronLeft size={17} />
              </button>
              <button className="is-primary" onClick={toggleSort} title={sortPlaying ? "Pause" : "Run"} type="button">
                {sortPlaying ? <Pause size={17} /> : <Play size={17} />}
                <span>{sortPlaying ? "Pause" : "Run"}</span>
              </button>
              <button
                disabled={sortIndex >= sortFrames.length - 1}
                onClick={() => {
                  setSortPlaying(false);
                  setSortIndex((current) => Math.min(sortFrames.length - 1, current + 1));
                }}
                title="Next step"
                type="button"
              >
                <ChevronRight size={17} />
              </button>
              <button
                onClick={() => {
                  setSortPlaying(false);
                  setSortIndex(0);
                }}
                title="Reset sort"
                type="button"
              >
                <RotateCcw size={16} />
              </button>
              <label>
                <span>{sortIndex + 1} / {sortFrames.length}</span>
                <input
                  max={sortFrames.length - 1}
                  min="0"
                  onChange={(event) => {
                    setSortPlaying(false);
                    setSortIndex(Number(event.target.value));
                  }}
                  type="range"
                  value={sortIndex}
                />
              </label>
            </footer>
          </div>
        </div>
      ) : (
        <div className="ca-dsa__layout">
          <aside className="ca-dsa__controls">
            <label>
              <span>Traversal</span>
              <select
                onChange={(event) => changeTraversal(event.target.value as TraversalMode)}
                value={traversal}
              >
                <option>BFS</option>
                <option>DFS</option>
              </select>
            </label>
            <label>
              <span>Start node</span>
              <select
                onChange={(event) => changeStartNode(event.target.value as GraphNode)}
                value={startNode}
              >
                {graphNodes.map((node) => <option key={node}>{node}</option>)}
              </select>
            </label>
            <div className="ca-dsa__metrics">
              <div><span>Visited</span><strong>{graphFrame.visited.length}</strong></div>
              <div><span>Frontier</span><strong>{graphFrame.frontier.length}</strong></div>
              <div><span>Mode</span><strong>{traversal}</strong></div>
            </div>
            <div className="ca-frontier">
              <span>{traversal === "BFS" ? "Queue" : "Stack"}</span>
              <strong>{graphFrame.frontier.join("  ") || "empty"}</strong>
            </div>
          </aside>

          <div className="ca-dsa__stage">
            <header>
              <span>{traversal} from {startNode}</span>
              <strong>{graphFrame.description}</strong>
            </header>
            <svg className="ca-graph-stage" viewBox="0 0 700 410" role="img" aria-label={traversal + " graph"}>
              {graphEdges.map(([from, to]) => (
                <line
                  key={from + to}
                  x1={graphPositions[from].x}
                  x2={graphPositions[to].x}
                  y1={graphPositions[from].y}
                  y2={graphPositions[to].y}
                />
              ))}
              {graphNodes.map((node) => {
                const position = graphPositions[node];
                const state = graphFrame.active === node
                  ? "is-active"
                  : graphFrame.visited.includes(node)
                    ? "is-visited"
                    : graphFrame.frontier.includes(node)
                      ? "is-frontier"
                      : "";
                return (
                  <g className={state} key={node} transform={"translate(" + String(position.x) + " " + String(position.y) + ")"}>
                    <circle r="31" />
                    <text textAnchor="middle" y="7">{node}</text>
                  </g>
                );
              })}
            </svg>
            <div className="ca-visit-order">
              <span>Visit order</span>
              <strong>{graphFrame.visited.join("  ->  ") || "none yet"}</strong>
            </div>
            <footer className="ca-dsa__timeline">
              <button
                disabled={graphIndex === 0}
                onClick={() => {
                  setGraphPlaying(false);
                  setGraphIndex((current) => Math.max(0, current - 1));
                }}
                title="Previous step"
                type="button"
              >
                <ChevronLeft size={17} />
              </button>
              <button className="is-primary" onClick={toggleGraph} title={graphPlaying ? "Pause" : "Run"} type="button">
                {graphPlaying ? <Pause size={17} /> : <Play size={17} />}
                <span>{graphPlaying ? "Pause" : "Run"}</span>
              </button>
              <button
                disabled={graphIndex >= traversalFrames.length - 1}
                onClick={() => {
                  setGraphPlaying(false);
                  setGraphIndex((current) => Math.min(traversalFrames.length - 1, current + 1));
                }}
                title="Next step"
                type="button"
              >
                <ChevronRight size={17} />
              </button>
              <button
                onClick={() => {
                  setGraphPlaying(false);
                  setGraphIndex(0);
                }}
                title="Reset traversal"
                type="button"
              >
                <RotateCcw size={16} />
              </button>
              <label>
                <span>{graphIndex + 1} / {traversalFrames.length}</span>
                <input
                  max={traversalFrames.length - 1}
                  min="0"
                  onChange={(event) => {
                    setGraphPlaying(false);
                    setGraphIndex(Number(event.target.value));
                  }}
                  type="range"
                  value={graphIndex}
                />
              </label>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}
