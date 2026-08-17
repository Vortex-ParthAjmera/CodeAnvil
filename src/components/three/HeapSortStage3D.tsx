import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import { getHeapSortSceneModel, type HeapSortSceneModel } from "../../engine/sortStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";

const GAP = 0.96;
const BAR_WIDTH = 0.58;
const BAR_DEPTH = 0.56;
const MAX_BAR_HEIGHT = 1.78;

interface HeapBar {
  id: string;
  index: number;
  value: number;
  x: number;
  height: number;
  color: string;
  edge: string;
  active: boolean;
  sorted: boolean;
}

function xForIndex(index: number, count: number): number {
  return (index - (count - 1) / 2) * GAP;
}

function heightFor(value: number, maxValue: number): number {
  return Math.max(0.22, (value / Math.max(maxValue, 1)) * MAX_BAR_HEIGHT);
}

function heapPosition(index: number): THREE.Vector3 {
  const level = Math.floor(Math.log2(index + 1));
  const levelStart = 2 ** level - 1;
  const offset = index - levelStart;
  const nodes = 2 ** level;
  const spread = 4.7 / (level + 1);
  return new THREE.Vector3((offset - (nodes - 1) / 2) * spread, 2.82 - level * 0.9, 0.68);
}

function colorForIndex(model: HeapSortSceneModel, index: number, p: Theme3DPalette): string {
  if (model.operation === "complete" || model.sortedIndices.includes(index)) return p.verdant;
  if (model.swapPair?.includes(index) || model.extractIndex === index) return p.emberBright;
  if (model.comparePair?.includes(index)) return p.arcBright;
  if (model.candidateIndex === index) return p.ember;
  if (model.parentIndex === index) return p.arc;
  if (index < model.heapSize) return p.arcDeep;
  return p.barDefault;
}

function HeapArrayBar({ bar }: { bar: HeapBar }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    if (!group.current || !mesh.current || mounted.current) return;
    group.current.position.set(bar.x, 0, -1.08);
    mesh.current.scale.y = bar.height;
    mesh.current.position.y = bar.height / 2;
    mounted.current = true;
  }, [bar.height, bar.x]);

  useFrame(({ clock }, delta) => {
    if (!group.current || !mesh.current || !material.current) return;
    const t = 1 - Math.pow(0.0007, delta);
    const pulse = bar.active ? (Math.sin(clock.elapsedTime * 5 + bar.index) + 1) / 2 : 0;
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, bar.x, t);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, bar.active ? 0.08 + pulse * 0.04 : 0, t);
    mesh.current.scale.y = THREE.MathUtils.lerp(mesh.current.scale.y, bar.height, t);
    mesh.current.position.y = mesh.current.scale.y / 2;
    material.current.emissiveIntensity = THREE.MathUtils.lerp(material.current.emissiveIntensity, bar.active ? 0.74 + pulse * 0.24 : bar.sorted ? 0.34 : 0.12, t);
  });

  return (
    <group ref={group}>
      <mesh ref={mesh}>
        <boxGeometry args={[BAR_WIDTH, 1, BAR_DEPTH]} />
        <meshStandardMaterial
          ref={material}
          color={bar.color}
          emissive={bar.color}
          emissiveIntensity={bar.active ? 0.74 : bar.sorted ? 0.34 : 0.12}
          metalness={0.44}
          roughness={0.34}
        />
        <Edges color={bar.edge} threshold={18} />
      </mesh>
      <Html position={[0, bar.height + 0.28, 0]} center style={{ pointerEvents: "none" }}>
        <div
          className="min-w-7 rounded-md border bg-ink-950/94 px-1.5 py-1 text-center font-mono text-xs font-black leading-none text-ink-50 shadow-xl backdrop-blur"
          style={{ borderColor: bar.edge, textShadow: "0 1px 2px rgb(0 0 0 / 0.8)" }}
        >
          {bar.value}
        </div>
      </Html>
      <Html position={[0, -0.34, 0.04]} center style={{ pointerEvents: "none" }}>
        <div className="rounded border border-ink-700/80 bg-ink-950/90 px-1.5 py-0.5 font-mono text-[9px] font-bold leading-none text-ink-300">
          {bar.index}
        </div>
      </Html>
    </group>
  );
}

function HeapNode({ index, value, model, p }: { index: number; value: number; model: HeapSortSceneModel; p: Theme3DPalette }) {
  const group = useRef<THREE.Group>(null);
  const pos = heapPosition(index);
  const color = colorForIndex(model, index, p);
  const active = model.parentIndex === index || model.candidateIndex === index || !!model.comparePair?.includes(index) || !!model.swapPair?.includes(index);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const pulse = active ? Math.sin(clock.elapsedTime * 5.4 + index) * 0.035 : 0;
    group.current.position.y = pos.y + pulse;
  });

  return (
    <group ref={group} position={pos}>
      <mesh>
        <sphereGeometry args={[active ? 0.27 : 0.23, 28, 18]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={active ? 0.82 : 0.22}
          metalness={0.46}
          roughness={0.28}
        />
      </mesh>
      <Html position={[0, 0, 0.27]} center style={{ pointerEvents: "none" }}>
        <div
          className="min-w-7 rounded-md border bg-ink-950/94 px-1.5 py-1 text-center font-mono text-xs font-black leading-none text-ink-50 shadow-xl backdrop-blur"
          style={{ borderColor: active ? "#f8fbff" : color, textShadow: "0 1px 2px rgb(0 0 0 / 0.8)" }}
        >
          {value}
        </div>
      </Html>
    </group>
  );
}

function HeapTree({ model, p }: { model: HeapSortSceneModel; p: Theme3DPalette }) {
  const nodes = model.values.slice(0, model.heapSize);
  return (
    <group>
      {nodes.map((_, index) => {
        if (index === 0) return null;
        const parent = Math.floor((index - 1) / 2);
        return (
          <Line
            key={`edge-${index}`}
            points={[heapPosition(parent), heapPosition(index)]}
            color={model.comparePair?.includes(index) || model.swapPair?.includes(index) ? p.arcBright : p.gridSection}
            lineWidth={model.comparePair?.includes(index) || model.swapPair?.includes(index) ? 2.2 : 1.2}
          />
        );
      })}
      {nodes.map((value, index) => (
        <HeapNode key={`${index}-${value}`} index={index} value={value} model={model} p={p} />
      ))}
    </group>
  );
}

function BoundaryFloor({ model, p }: { model: HeapSortSceneModel; p: Theme3DPalette }) {
  const count = model.values.length;
  const heapEnd = model.heapSize - 1;
  return (
    <group>
      {model.heapSize > 0 && (
        <mesh position={[xForIndex(heapEnd / 2, count), -0.08, -1.08]}>
          <boxGeometry args={[Math.max(BAR_WIDTH + 0.35, model.heapSize * GAP), 0.07, 1.04]} />
          <meshStandardMaterial color={p.arcDeep} emissive={p.arc} emissiveIntensity={0.14} transparent opacity={0.38} />
        </mesh>
      )}
      {model.heapSize < count && (
        <mesh position={[zoneCenter(model.heapSize, count - 1, count), -0.05, -1.08]}>
          <boxGeometry args={[Math.max(BAR_WIDTH + 0.35, (count - model.heapSize) * GAP), 0.08, 1.12]} />
          <meshStandardMaterial color={p.verdantDeep} emissive={p.verdant} emissiveIntensity={0.24} transparent opacity={0.48} />
        </mesh>
      )}
      <Html position={[0, -0.46, -1.72]} center style={{ pointerEvents: "none" }}>
        <div className="rounded-md border border-arc-400/40 bg-ink-950/92 px-2 py-1 font-mono text-[10px] font-black uppercase leading-none text-arc-100 shadow-lg">
          heap size {model.heapSize} · sorted tail {Math.max(0, count - model.heapSize)}
        </div>
      </Html>
    </group>
  );
}

function zoneCenter(start: number, end: number, count: number): number {
  return (xForIndex(start, count) + xForIndex(end, count)) / 2;
}

function MotionLines({ model, p }: { model: HeapSortSceneModel; p: Theme3DPalette }) {
  if (model.swapPair) {
    const [a, b] = model.swapPair;
    const pa = a < model.heapSize ? heapPosition(a) : new THREE.Vector3(xForIndex(a, model.values.length), 1.2, -1.08);
    const pb = b < model.heapSize ? heapPosition(b) : new THREE.Vector3(xForIndex(b, model.values.length), 1.2, -1.08);
    const points = Array.from({ length: 20 }, (_, index) => {
      const t = index / 19;
      return new THREE.Vector3(
        THREE.MathUtils.lerp(pa.x, pb.x, t),
        THREE.MathUtils.lerp(pa.y, pb.y, t) + Math.sin(Math.PI * t) * 0.48,
        THREE.MathUtils.lerp(pa.z, pb.z, t),
      );
    });
    return <Line points={points} color={model.operation === "extract" ? p.verdant : p.emberBright} lineWidth={2.7} />;
  }

  if (model.comparePair) {
    const [a, b] = model.comparePair;
    return <Line points={[heapPosition(a), heapPosition(b)]} color={p.arcBright} lineWidth={2.6} />;
  }

  return null;
}

function DecisionBoard({ model, p }: { model: HeapSortSceneModel; p: Theme3DPalette }) {
  const label =
    model.operation === "extract" && model.extractIndex !== null
      ? `root -> sorted[${model.extractIndex}]`
      : model.operation === "compare-left" || model.operation === "compare-right"
        ? `choose larger child`
        : model.operation;
  return (
    <group position={[0, 3.62, 0.72]}>
      <mesh>
        <boxGeometry args={[2.9, 0.24, 0.24]} />
        <meshStandardMaterial color={p.emptyCell} emissive={model.operation === "extract" ? p.verdant : p.arc} emissiveIntensity={0.18} transparent opacity={0.72} />
        <Edges color={model.operation === "extract" ? p.verdant : p.arcBright} threshold={18} />
      </mesh>
      <Html position={[0, 0, 0.18]} center style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded border border-arc-400/45 bg-ink-950/82 px-2 py-1 font-mono text-[11px] font-black leading-none text-ink-50 shadow-lg backdrop-blur-sm">
          {label}
        </div>
      </Html>
    </group>
  );
}

function Scene({ model, p }: { model: HeapSortSceneModel; p: Theme3DPalette }) {
  const scene = useRef<THREE.Group>(null);
  const maxValue = Math.max(...model.values, 1);
  const sorted = new Set(model.sortedIndices);
  const bars = useMemo<HeapBar[]>(
    () =>
      model.values.map((value, index) => {
        const active = model.parentIndex === index || model.candidateIndex === index || model.extractIndex === index || !!model.swapPair?.includes(index) || !!model.comparePair?.includes(index);
        const color = colorForIndex(model, index, p);
        return {
          id: `${index}-${value}`,
          index,
          value,
          x: xForIndex(index, model.values.length),
          height: heightFor(value, maxValue),
          color,
          edge: active || sorted.has(index) ? "#f8fbff" : color,
          active,
          sorted: sorted.has(index) || model.operation === "complete",
        };
      }),
    [maxValue, model, p, sorted],
  );

  useFrame(({ clock }) => {
    if (!scene.current) return;
    scene.current.rotation.y = Math.sin(clock.elapsedTime * 0.22) * 0.014;
  });

  return (
    <>
      <ambientLight intensity={0.72 * p.lighting.ambient} />
      <directionalLight position={[4.8, 7, 5.4]} intensity={1.5 * p.lighting.directional} />
      <pointLight position={[0, 4.8, 3.4]} intensity={46 * p.lighting.accent} distance={12} color={p.arcBright} />
      <pointLight position={[3.4, 3.4, -2.4]} intensity={34 * p.lighting.accent} distance={11} color={p.emberBright} />

      <group ref={scene} position={[0, -1.72, 0]}>
        <DecisionBoard model={model} p={p} />
        <HeapTree model={model} p={p} />
        <MotionLines model={model} p={p} />
        <BoundaryFloor model={model} p={p} />
        {bars.map((bar) => (
          <HeapArrayBar key={bar.id} bar={bar} />
        ))}
      </group>

      <InfiniteGrid
        position={[0, -1.98, -0.16]}
        cellSize={0.5}
        cellThickness={0.55}
        cellColor={p.gridCell}
        sectionSize={2.5}
        sectionThickness={0.9}
        sectionColor={p.gridSection}
        fadeDistance={23}
        fadeStrength={1}
        infiniteGrid
      />

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={5.3}
        maxDistance={12.8}
        minPolarAngle={0.34}
        maxPolarAngle={Math.PI / 2.08}
      />
    </>
  );
}

function Overlay({ model }: { model: HeapSortSceneModel }) {
  const stats = [
    ["root", model.values[0] ?? "-"],
    ["parent", model.parentIndex ?? "-"],
    ["extract", model.extractIndex ?? "-"],
    ["cmp/swap", `${model.comparisons ?? 0}/${model.swaps ?? 0}`],
  ];

  return (
    <>
      <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex items-start justify-between gap-2 sm:inset-x-3 sm:top-3">
        <div className="min-w-0 max-w-[13rem] rounded-md border border-arc-400/30 bg-ink-950/72 px-2.5 py-1.5 shadow-lg backdrop-blur-sm sm:max-w-[18rem]">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 rounded border border-verdant-400/35 bg-verdant-500/10 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-widest text-verdant-200">
              heap / {model.operation}
            </span>
            <span className="truncate font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
              size {model.heapSize}
            </span>
          </div>
          <p className="mt-1 truncate text-[11px] font-black leading-tight text-ink-50 sm:text-xs">{model.headline}</p>
        </div>

        <div className="flex max-w-[16rem] flex-wrap justify-end gap-1 sm:max-w-[21rem]">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded border border-ink-700/65 bg-ink-950/72 px-1.5 py-1 text-center shadow-lg backdrop-blur-sm">
              <span className="block font-mono text-[8px] font-black uppercase tracking-widest text-ink-500">{label}</span>
              <span className="block max-w-[4.5rem] truncate font-mono text-[11px] font-black leading-tight text-ink-50">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex items-end justify-between gap-2 sm:inset-x-3 sm:bottom-3">
        <p className="hidden max-w-[24rem] rounded-md border border-arc-400/25 bg-ink-950/68 px-2 py-1.5 text-[10px] leading-snug text-ink-300 shadow-lg backdrop-blur-sm sm:block">
          {model.detail}
        </p>
        <div className="ml-auto flex flex-wrap justify-end gap-1">
          <span className="rounded border border-arc-400/35 bg-ink-950/72 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-arc-200 backdrop-blur">blue heap</span>
          <span className="rounded border border-ember-400/35 bg-ink-950/72 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-ember-200 backdrop-blur">orange sift</span>
          <span className="rounded border border-verdant-400/35 bg-ink-950/72 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-verdant-200 backdrop-blur">green sorted</span>
        </div>
      </div>
    </>
  );
}

export function HeapSortStage3D({ step }: { step: TraceStep }) {
  const p = useTheme3D();
  const model = useMemo(() => getHeapSortSceneModel(step), [step]);

  if (!model) return null;

  return (
    <div className="codeanvil-canvas-fill relative h-full min-h-[23rem] w-full overflow-hidden rounded-md">
      <Canvas
        data-testid="heap-sort-stage-canvas"
        dpr={[1.25, 2]}
        camera={{ position: [0, 3.05, 8.1], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <CanvasSizeSync />
        <Scene model={model} p={p} />
      </Canvas>
      <Overlay model={model} />
    </div>
  );
}