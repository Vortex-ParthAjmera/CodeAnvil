import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Line, OrbitControls, Text } from "@react-three/drei";
import { CanvasSizeSync } from "./CanvasSizeSync";
import * as THREE from "three";
import type {
  RecursionTreeEdge,
  RecursionTreeNode,
  TraceStep,
} from "../../types/trace";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { hue } from "./palette";

const SPACING = 2.85; // world units per leaf slot (prevents Fibonacci label collisions)
const LEVEL = 1.95; // vertical distance between tree levels (return-label clearance)
const Z_SPREAD = 1.25; // sibling separation in depth

interface Pos {
  x: number;
  y: number;
  z: number;
}

function layout3d(
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
  const flat = new Map<string, { x: number; y: number }>();

  function dfs(id: string) {
    const children = childrenOf.get(id) ?? [];
    if (children.length === 0) {
      flat.set(id, { x: leafCount++, y: 0 });
      return;
    }
    for (const c of children) dfs(c);
    const first = flat.get(children[0])!;
    const last = flat.get(children[children.length - 1])!;
    flat.set(id, { x: (first.x + last.x) / 2, y: 0 });
  }
  dfs(root.id);

  for (const [id, p] of flat) {
    const node = nodes.find((n) => n.id === id);
    const depth = node?.depth ?? 0;
    const kids = childrenOf.get(id) ?? [];
    const z =
      kids.length === 0
        ? 0
        : (0 - (kids.length - 1) / 2) * Z_SPREAD; // root-ish layers
    pos.set(id, { x: p.x, y: depth, z });
  }
  return pos;
}

/** Per-depth base color: violet → cyan → emerald → magenta → amber… */
function depthColor(depth: number): string {
  return hue(depth);
}

/** Returned nodes blend their depth color toward emerald for the "resolved" look. */
function returnedColor(depth: number): string {
  const c = new THREE.Color(hue(depth));
  return c.lerp(new THREE.Color("#34d399"), 0.6).getStyle();
}

function NodeSphere({
  node,
  active,
  scaleTarget,
  pal,
}: {
  node: RecursionTreeNode;
  active: boolean;
  scaleTarget: number;
  pal: Theme3DPalette;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const target = useRef(0);

  const baseColor = useMemo(
    () => (node.status === "returned" ? returnedColor(node.depth) : depthColor(node.depth)),
    [node.depth, node.status],
  );
  // Active node glows the bright accent — deep violet in light mode so it
  // never vanishes against the white canvas (the old near-white fill did).
  const color = active ? pal.emberBright : baseColor;

  useFrame(({ clock }) => {
    const mesh2 = mesh.current;
    if (!mesh2) return;
    // Ease the pop-in scale toward its target (grows from 0 after mount).
    const want = target.current + (scaleTarget - target.current) * 0.14;
    target.current = want;
    mesh2.scale.setScalar(want);

    if (active && mat.current) {
      const pulse = (Math.sin(clock.elapsedTime * 6) + 1) / 2;
      mat.current.emissiveIntensity = 0.7 + pulse * 1.6;
      mat.current.color.set(color);
      mat.current.emissive.set(color);
    }
  });

  useEffect(() => {
    target.current = 0;
    const raf = requestAnimationFrame(() => {
      target.current = 1;
    });
    return () => cancelAnimationFrame(raf);
  }, [node.id]);

  return (
    <mesh ref={mesh} scale={0.01}>
      <sphereGeometry args={[0.36, 28, 28]} />
      <meshStandardMaterial
        ref={mat}
        color={color}
        emissive={color}
        emissiveIntensity={active ? 1.2 : node.status === "returned" ? 0.55 : 0.14}
        metalness={0.5}
        roughness={0.25}
      />
      <Edges color={color} threshold={30} />
    </mesh>
  );
}

function TreeGroup({
  nodes,
  edges,
  activeNodeId,
  stepByNode,
  onScrub,
  pal,
}: {
  nodes: RecursionTreeNode[];
  edges: RecursionTreeEdge[];
  activeNodeId: string | null;
  stepByNode: Map<string, number>;
  onScrub: (index: number) => void;
  pal: Theme3DPalette;
}) {
  const pos = useMemo(() => layout3d(nodes, edges), [nodes, edges]);

  const leafCount = nodes.filter((n) => !edges.some((e) => e.to === n.id)).length;
  const centerX = (leafCount - 1) / 2;
  const world = (p: Pos): [number, number, number] => [
    (p.x - centerX) * SPACING,
    -p.y * LEVEL,
    p.z,
  ];

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  return (
    <group position={[0, 1.6, 0]}>
      {edges.map((e) => {
        const from = pos.get(e.from);
        const to = pos.get(e.to);
        if (!from || !to) return null;
        const child = nodeById.get(e.to);
        const returned = child?.status === "returned";
        const active = e.to === activeNodeId;
        const edgeColor = active
          ? pal.emberBright
          : returned
            ? returnedColor(child?.depth ?? 0)
            : new THREE.Color(depthColor(child?.depth ?? 0)).multiplyScalar(0.55).getStyle();
        return (
          <Line
            key={`${e.from}-${e.to}`}
            points={[world(from), world(to)]}
            color={edgeColor}
            lineWidth={active ? 2.5 : returned ? 1.8 : 1}
            transparent
            opacity={active ? 1 : returned ? 0.8 : 0.9}
          />
        );
      })}

      {nodes.map((node) => {
        const p = pos.get(node.id);
        if (!p) return null;
        const [x, y, z] = world(p);
        const active = node.id === activeNodeId;
        const returned = node.status === "returned";
        const firstStep = stepByNode.get(node.id);
        const clickable = firstStep !== undefined;
        return (
          <group
            key={node.id}
            position={[x, y, z]}
            onClick={clickable ? () => onScrub(firstStep) : undefined}
          >
            <NodeSphere node={node} active={active} scaleTarget={1} pal={pal} />
            <Text
              position={[0, 0.58, 0]}
              fontSize={0.15}
              color={returned ? pal.verdant : active ? pal.textStrong : pal.textStrong}
              anchorX="center"
              anchorY="middle"
              maxWidth={1.9}
            >
              {node.label}
            </Text>
            {returned && node.returnValue !== undefined && (
              <>
                <Text
                  position={[0, -0.6, 0]}
                  fontSize={0.18}
                  color={pal.verdant}
                  anchorX="center"
                  anchorY="middle"
                >
                  ={node.returnValue}
                </Text>
                <mesh position={[0, -0.6, 0]}>
                  <sphereGeometry args={[0.04, 12, 12]} />
                  <meshStandardMaterial
                    color={pal.verdantDeep}
                    emissive={pal.verdantDeep}
                    emissiveIntensity={1.2}
                  />
                </mesh>
              </>
            )}
            {active && (
              <Text
                position={[0, 0.88, 0]}
                fontSize={0.14}
                color={pal.emberBright}
                anchorX="center"
                anchorY="middle"
              >
                ▶ running
              </Text>
            )}
          </group>
        );
      })}
    </group>
  );
}

export function RecursionTree3D({
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
  const pal = useTheme3D();
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

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-ink-400">
        The recursion tree will grow here…
      </div>
    );
  }

  const leafCount = nodes.filter((n) => !edges.some((e) => e.to === n.id)).length;
  const maxDepth = Math.max(0, ...nodes.map((n) => n.depth));

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{
        position: [0, 2.25, Math.max(10.5, (leafCount * SPACING) / 2 + 5.5)],
        fov: 34,
      }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <CanvasSizeSync />
      <ambientLight intensity={0.65 * pal.lighting.ambient} />
      <directionalLight position={[5, 8, 4]} intensity={1.5 * pal.lighting.directional} />
      <pointLight
        position={[0, 4 + maxDepth, 3]}
        intensity={55 * pal.lighting.accent}
        distance={16}
        color={pal.ember}
      />
      <pointLight
        position={[-5, -1, 4]}
        intensity={40 * pal.lighting.accent}
        distance={14}
        color={pal.arc}
      />
      <pointLight position={[5, -1, 4]} intensity={40 * pal.lighting.accent} distance={14} color="#f472b6" />

      <TreeGroup
        nodes={nodes}
        edges={edges}
        activeNodeId={activeNodeId}
        stepByNode={stepByNode}
        onScrub={onScrub}
        pal={pal}
      />

      <OrbitControls
        enablePan={false}
        autoRotate={false}
        autoRotateSpeed={0.7}
        minDistance={3}
        maxDistance={18}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 1.8}
      />
    </Canvas>
  );
}
