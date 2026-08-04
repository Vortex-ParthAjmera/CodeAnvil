import { useMemo, useState } from "react";
import { Play, RefreshCcw, StepForward } from "lucide-react";

type DsaTab = "sorting" | "graph";
type Algorithm = "Bubble Sort" | "Selection Sort" | "Insertion Sort";
type Traversal = "BFS" | "DFS";

interface DsaWorkbenchProps {
  activeTab: DsaTab;
  onTabChange: (tab: DsaTab) => void;
}

const graph = {
  0: [1, 2],
  1: [0, 3],
  2: [0, 3, 5],
  3: [1, 2],
  5: [2],
} as const;

function makeArray(size: number) {
  return Array.from({ length: size }, (_, index) => ((index * 7 + size * 3) % 9) + 1);
}

function clampSize(value: number) {
  if (!Number.isFinite(value)) return 8;
  return Math.min(10, Math.max(4, Math.round(value)));
}

function nextSortStep(values: number[], cursor: number, algorithm: Algorithm) {
  const next = [...values];
  let swapped = false;

  if (algorithm === "Bubble Sort") {
    const left = cursor % Math.max(1, next.length - 1);
    const right = left + 1;
    if (next[left] > next[right]) {
      [next[left], next[right]] = [next[right], next[left]];
      swapped = true;
    }
    return { next, compared: [left, right], swapped };
  }

  if (algorithm === "Selection Sort") {
    const pass = cursor % Math.max(1, next.length - 1);
    let minIndex = pass;
    for (let index = pass + 1; index < next.length; index += 1) {
      if (next[index] < next[minIndex]) minIndex = index;
    }
    if (minIndex !== pass) {
      [next[pass], next[minIndex]] = [next[minIndex], next[pass]];
      swapped = true;
    }
    return { next, compared: [pass, minIndex], swapped };
  }

  const index = (cursor % Math.max(1, next.length - 1)) + 1;
  const value = next[index];
  let scan = index - 1;
  while (scan >= 0 && next[scan] > value) {
    next[scan + 1] = next[scan];
    scan -= 1;
    swapped = true;
  }
  next[scan + 1] = value;
  return { next, compared: [Math.max(0, scan + 1), index], swapped };
}

function traverse(start: keyof typeof graph, mode: Traversal) {
  const seen = new Set<number>();
  const order: number[] = [];
  const queue = [Number(start)];

  while (queue.length) {
    const node = mode === "BFS" ? queue.shift()! : queue.pop()!;
    if (seen.has(node)) continue;
    seen.add(node);
    order.push(node);
    const neighbors = [...(graph[node as keyof typeof graph] ?? [])];
    if (mode === "DFS") neighbors.reverse();
    queue.push(...neighbors.filter((item) => !seen.has(item)));
  }

  return order;
}

export function DsaWorkbench({ activeTab, onTabChange }: DsaWorkbenchProps) {
  const [algorithm, setAlgorithm] = useState<Algorithm>("Bubble Sort");
  const [size, setSize] = useState(8);
  const [array, setArray] = useState(() => makeArray(8));
  const [cursor, setCursor] = useState(0);
  const [compared, setCompared] = useState<number[]>([]);
  const [swaps, setSwaps] = useState(0);
  const [traversal, setTraversal] = useState<Traversal>("BFS");
  const [startNode, setStartNode] = useState<keyof typeof graph>(0);
  const [visitedOrder, setVisitedOrder] = useState<number[]>([]);

  const sorted = useMemo(() => array.every((value, index) => index === 0 || array[index - 1] <= value), [array]);

  function resetArray(nextSize = size) {
    const clamped = clampSize(nextSize);
    setSize(clamped);
    setArray(makeArray(clamped));
    setCursor(0);
    setCompared([]);
    setSwaps(0);
  }

  function generateNew() {
    resetArray(size === 10 ? 6 : size + 1);
  }

  function changeAlgorithm(nextAlgorithm: Algorithm) {
    setAlgorithm(nextAlgorithm);
    setCursor(0);
    setCompared([]);
    setSwaps(0);
  }

  function changeSize(nextSize: number) {
    resetArray(nextSize);
  }

  function stepSort() {
    const result = nextSortStep(array, cursor, algorithm);
    setArray(result.next);
    setCompared(result.compared);
    setCursor((current) => current + 1);
    if (result.swapped) setSwaps((current) => current + 1);
  }

  function runSort() {
    let next = [...array];
    let localCursor = cursor;
    let localSwaps = swaps;
    for (let count = 0; count < next.length * next.length; count += 1) {
      const result = nextSortStep(next, localCursor, algorithm);
      next = result.next;
      localCursor += 1;
      if (result.swapped) localSwaps += 1;
    }
    setArray(next);
    setCursor(localCursor);
    setSwaps(localSwaps);
    setCompared([]);
  }

  function runTraversal() {
    setVisitedOrder(traverse(startNode, traversal));
  }

  return (
    <section className="ca-dsa" aria-label="DSA Arena workbench">
      <header className="ca-dsa__header">
        <div className="ca-tabs ca-tabs--small">
          <button className={activeTab === "sorting" ? "is-active" : ""} onClick={() => onTabChange("sorting")} type="button">
            Sorting
          </button>
          <button className={activeTab === "graph" ? "is-active" : ""} onClick={() => onTabChange("graph")} type="button">
            Graph
          </button>
        </div>
        <span>{activeTab === "sorting" ? `${cursor} steps | ${swaps} changes` : `${visitedOrder.length} visited`}</span>
      </header>

      {activeTab === "sorting" ? (
        <div className="ca-dsa__grid">
          <div className="ca-dsa__controls">
            <label>
              Algorithm
              <select value={algorithm} onChange={(event) => changeAlgorithm(event.target.value as Algorithm)}>
                <option>Bubble Sort</option>
                <option>Selection Sort</option>
                <option>Insertion Sort</option>
              </select>
            </label>
            <label>
              Size
              <input max="10" min="4" onChange={(event) => changeSize(Number(event.target.value))} type="number" value={size} />
            </label>
            <button onClick={generateNew} type="button">
              <RefreshCcw size={15} />
              Generate New
            </button>
            <button onClick={stepSort} type="button">
              <StepForward size={15} />
              Step
            </button>
            <button onClick={runSort} type="button">
              <Play size={15} />
              Run
            </button>
          </div>
          <div className="ca-array-stage" aria-label={`${algorithm} array`}>
            {array.map((value, index) => (
              <div className={compared.includes(index) ? "is-compared" : ""} key={`${value}-${index}-${cursor}`}>
                <strong>{value}</strong>
                <span>{index}</span>
              </div>
            ))}
          </div>
          <p>{sorted ? `${algorithm} produced a sorted array.` : `${algorithm} is ready to step or run with the current values.`}</p>
        </div>
      ) : (
        <div className="ca-dsa__grid ca-dsa__grid--graph">
          <div className="ca-dsa__controls">
            <label>
              Traversal
              <select value={traversal} onChange={(event) => setTraversal(event.target.value as Traversal)}>
                <option>BFS</option>
                <option>DFS</option>
              </select>
            </label>
            <label>
              Start Node
              <select value={startNode} onChange={(event) => setStartNode(Number(event.target.value) as keyof typeof graph)}>
                {Object.keys(graph).map((node) => (
                  <option key={node} value={node}>
                    {node}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={runTraversal} type="button">
              <Play size={15} />
              Run Traversal
            </button>
          </div>
          <div className="ca-graph-stage" aria-label={`${traversal} graph`}>
            {[0, 1, 2, 3, 5].map((node, index) => (
              <span className={visitedOrder.includes(node) ? "is-visited" : ""} key={node} style={{ left: `${42 + (index % 3) * 120}px`, top: `${36 + Math.floor(index / 3) * 82}px` }}>
                {node}
              </span>
            ))}
          </div>
          <p>{visitedOrder.length ? `${traversal} order: ${visitedOrder.join(" -> ")}` : "Run traversal to reveal the visit order."}</p>
        </div>
      )}
    </section>
  );
}
