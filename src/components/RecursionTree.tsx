import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "../lib/cn";
import type {
  RecursionTreeEdge,
  RecursionTreeNode,
  TraceStep,
} from "../types/trace";

const NODE_SPACING_X = 72;
const LEVEL_HEIGHT = 82;
const NODE_R = 17;
const PAD = 28;

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

interface Pos {
  x: number;
  y: number;
}

function layout(
  nodes: RecursionTreeNode[],
  edges: RecursionTreeEdge[],
): Map<string, Pos> {
  const childrenOf = new Map<string, string[]>();
  for (const e of edges) {
    const list = childrenOf.get(e.from) ?? [];
    list.push(e.to);
    childrenOf.set(e.from, list);
  }
  const root = nodes.find((n) => !n.parentId);
  const pos = new Map<string, Pos>();
  if (!root) return pos;

  let leafCount = 0;

  function dfs(id: string) {
    const children = childrenOf.get(id) ?? [];
    if (children.length === 0) {
      pos.set(id, { x: leafCount++, y: 0 });
      return;
    }
    for (const c of children) dfs(c);
    const first = pos.get(children[0])!;
    const last = pos.get(children[children.length - 1])!;
    pos.set(id, { x: (first.x + last.x) / 2, y: 0 });
  }
  dfs(root.id);

  for (const [id, p] of pos) {
    const depth = nodes.find((n) => n.id === id)?.depth ?? 0;
    p.y = depth * LEVEL_HEIGHT;
  }
  return pos;
}

/**
 * One node + its label + return value, choreographed:
 * - the node circle grows out of nothing (r, not scale — SVG-safe pop-in),
 * - the label fades in a beat after the circle lands,
 * - the return value rises up when the node resolves.
 */
function TreeNode({
  node,
  x,
  y,
  active,
  returned,
  firstStep,
  onScrub,
  reduce,
}: {
  node: RecursionTreeNode;
  x: number;
  y: number;
  active: boolean;
  returned: boolean;
  firstStep: number | undefined;
  onScrub: (index: number) => void;
  reduce: boolean | null;
}) {
  return (
    <motion.g
      className={cn("cursor-pointer", active && "animate-pulse-glow")}
      onClick={() => firstStep !== undefined && onScrub(firstStep)}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: node.status === "waiting" ? 0.55 : 1 }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
    >
      <motion.circle
        cx={x}
        cy={y}
        initial={reduce ? undefined : { r: 3 }}
        animate={{ r: NODE_R }}
        transition={{ type: "spring", stiffness: 420, damping: 26 }}
        fill={
          returned
            ? "var(--color-verdant-500)"
            : active
              ? "var(--color-ember-500)"
              : "var(--color-ink-700)"
        }
        fillOpacity={returned || active ? 0.25 : 1}
        stroke={
          returned
            ? "var(--color-verdant-400)"
            : active
              ? "var(--color-ember-400)"
              : "var(--color-ink-500)"
        }
        strokeWidth={active ? 2 : 1.2}
      />
      <motion.text
        x={x}
        y={y + 3.5}
        textAnchor="middle"
        fontSize="8.5"
        fontFamily="var(--font-mono)"
        fontWeight={active ? 700 : 400}
        fill={
          returned
            ? "var(--color-verdant-300)"
            : active
              ? "var(--color-ember-300)"
              : "var(--color-ink-200)"
        }
        initial={reduce ? undefined : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.09, ease: EASE_OUT }}
      >
        {node.label}
      </motion.text>
      {returned && node.returnValue !== undefined && (
        <motion.text
          key={`ret-${node.returnValue}`}
          x={x}
          y={y + NODE_R + 12}
          textAnchor="middle"
          fontSize="9"
          fontFamily="var(--font-mono)"
          fontWeight={600}
          fill="var(--color-verdant-300)"
          initial={reduce ? undefined : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
        >
          ={node.returnValue}
        </motion.text>
      )}
      {active && (
        <text
          x={x}
          y={y - NODE_R - 6}
          textAnchor="middle"
          fontSize="8"
          fontFamily="var(--font-mono)"
          fontWeight={600}
          fill="var(--color-ember-300)"
        >
          ▶ running
        </text>
      )}
    </motion.g>
  );
}

export function RecursionTree({
  nodes,
  edges,
  activeNodeId,
  steps,
  onScrub,
}: {
  nodes: RecursionTreeNode[];
  edges: RecursionTreeEdge[];
  activeNodeId: string | null;
  steps: TraceStep[];
  onScrub: (index: number) => void;
}) {
  const reduce = useReducedMotion();
  const pos = useMemo(() => layout(nodes, edges), [nodes, edges]);

  const stepByNode = useMemo(() => {
    const map = new Map<string, number>();
    steps.forEach((s, i) => {
      if (s.visual?.type !== "recursion_tree") return;
      for (const n of s.visual.nodes) {
        if (!map.has(n.id)) map.set(n.id, i);
      }
    });
    return map;
  }, [steps]);

  const leafCount = nodes.filter((n) => !edges.some((e) => e.to === n.id)).length;
  const maxDepth = Math.max(0, ...nodes.map((n) => n.depth));
  const width = Math.max(160, leafCount * NODE_SPACING_X + PAD * 2);
  const height = (maxDepth + 1) * LEVEL_HEIGHT + PAD * 2;

  if (nodes.length === 0) {
    return (
      <p className="text-sm text-ink-400">The recursion tree will grow here.</p>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMin meet"
      role="img"
      aria-label="Recursion tree"
    >
      {edges.map((e) => {
        const from = pos.get(e.from);
        const to = pos.get(e.to);
        if (!from || !to) return null;
        const active = e.to === activeNodeId;
        const returned = nodes.find((n) => n.id === e.to)?.status === "returned";
        return (
          <motion.path
            key={`${e.from}-${e.to}`}
            d={`M ${from.x + PAD} ${from.y + PAD + NODE_R} C ${from.x + PAD} ${from.y + PAD + (to.y - from.y) / 2}, ${to.x + PAD} ${to.y + PAD - (to.y - from.y) / 2}, ${to.x + PAD} ${to.y + PAD - NODE_R}`}
            fill="none"
            stroke={
              active
                ? "var(--color-ember-400)"
                : returned
                  ? "var(--color-verdant-500)"
                  : "var(--color-ink-600)"
            }
            strokeWidth={active ? 2 : 1.2}
            strokeOpacity={active ? 1 : returned ? 0.7 : 1}
            initial={reduce ? undefined : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 0.34,
              delay: 0.1 + (to.y - from.y) / LEVEL_HEIGHT * 0.08,
              ease: EASE_OUT,
            }}
          />
        );
      })}

      {nodes.map((node) => {
        const p = pos.get(node.id);
        if (!p) return null;
        const x = p.x + PAD;
        const y = p.y + PAD;
        const active = node.id === activeNodeId;
        const returned = node.status === "returned";
        const firstStep = stepByNode.get(node.id);
        return (
          <TreeNode
            key={node.id}
            node={node}
            x={x}
            y={y}
            active={active}
            returned={returned}
            firstStep={firstStep}
            onScrub={onScrub}
            reduce={reduce}
          />
        );
      })}
    </svg>
  );
}
