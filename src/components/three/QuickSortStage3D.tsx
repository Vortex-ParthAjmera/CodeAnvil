import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import { getQuickSortSceneModel, type QuickSortSceneModel } from "../../engine/sortStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";

const GAP = 1.1;
const BAR_WIDTH = 0.68;
const BAR_DEPTH = 0.64;
const MAX_BAR_HEIGHT = 2.85;

interface QuickBar {
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
  return Math.max(0.3, (value / Math.max(maxValue, 1)) * MAX_BAR_HEIGHT);
}

function inRange(range: [number, number], index: number): boolean {
  return index >= range[0] && index <= range[1];
}

function zoneCenter(start: number, end: number, count: number) {
  return (xForIndex(start, count) + xForIndex(end, count)) / 2;
}

function zoneWidth(start: number, end: number, count: number) {
  return Math.max(BAR_WIDTH + 0.28, Math.abs(xForIndex(end, count) - xForIndex(start, count)) + BAR_WIDTH + 0.46);
}

function colorForIndex(model: QuickSortSceneModel, index: number, p: Theme3DPalette): string {
  if (model.operation === "complete" || model.sortedIndices.includes(index)) return p.verdant;
  if (model.swapPair?.includes(index)) return p.emberBright;
  if (model.pivotIndex === index) return p.ember;
  if (model.scanIndex === index || model.comparePair?.includes(index)) return p.arcBright;
  if (inRange(model.range, index)) return p.arcDeep;
  return p.barDefault;
}

function QuickSortBar({ bar }: { bar: QuickBar }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    if (!group.current || !mesh.current || mounted.current) return;
    group.current.position.set(bar.x, 0, 0);
    mesh.current.scale.y = bar.height;
    mesh.current.position.y = bar.height / 2;
    mounted.current = true;
  }, [bar.height, bar.x]);

  useFrame(({ clock }, delta) => {
    if (!group.current || !mesh.current || !material.current) return;
    const t = 1 - Math.pow(0.0007, delta);
    const pulse = bar.active ? (Math.sin(clock.elapsedTime * 5.2 + bar.index) + 1) / 2 : 0;
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, bar.x, t);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, bar.active ? 0.14 + pulse * 0.05 : 0, t);
    mesh.current.scale.y = THREE.MathUtils.lerp(mesh.current.scale.y, bar.height, t);
    mesh.current.position.y = mesh.current.scale.y / 2;
    material.current.emissiveIntensity = THREE.MathUtils.lerp(material.current.emissiveIntensity, bar.active ? 0.68 + pulse * 0.28 : bar.sorted ? 0.34 : 0.12, t);
  });

  return (
    <group ref={group}>
      <mesh ref={mesh}>
        <boxGeometry args={[BAR_WIDTH, 1, BAR_DEPTH]} />
        <meshStandardMaterial
          ref={material}
          color={bar.color}
          emissive={bar.color}
          emissiveIntensity={bar.active ? 0.72 : bar.sorted ? 0.34 : 0.12}
          metalness={0.46}
          roughness={0.32}
        />
        <Edges color={bar.edge} threshold={18} />
      </mesh>
      <Html position={[0, bar.height + 0.38, 0]} center style={{ pointerEvents: "none" }}>
        <div
          className="min-w-8 rounded-md border bg-ink-950/94 px-2 py-1 text-center font-mono text-sm font-black leading-none text-ink-50 shadow-xl backdrop-blur"
          style={{ borderColor: bar.edge, textShadow: "0 1px 2px rgb(0 0 0 / 0.8)" }}
        >
          {bar.value}
        </div>
      </Html>
      <Html position={[0, -0.42, 0.04]} center style={{ pointerEvents: "none" }}>
        <div className="rounded border border-ink-700/80 bg-ink-950/90 px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-ink-300">
          {bar.index}
        </div>
      </Html>
    </group>
  );
}

function PartitionFloor({ model, p }: { model: QuickSortSceneModel; p: Theme3DPalette }) {
  const [lo, hi] = model.range;
  const center = zoneCenter(lo, hi, model.values.length);
  const width = zoneWidth(lo, hi, model.values.length);
  return (
    <group position={[center, -0.08, -0.03]}>
      <mesh>
        <boxGeometry args={[width, 0.08, 1.34]} />
        <meshStandardMaterial color={p.arcDeep} emissive={p.arc} emissiveIntensity={0.15} transparent opacity={0.38} />
      </mesh>
      <Html position={[0, 0.24, -0.52]} center style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-md border border-arc-400/50 bg-ink-950/92 px-2 py-1 font-mono text-[10px] font-black uppercase leading-none text-arc-100 shadow-lg">
          active partition [{lo}..{hi}]
        </div>
      </Html>
    </group>
  );
}

function SmallerZone({ model, p }: { model: QuickSortSceneModel; p: Theme3DPalette }) {
  if (model.boundaryIndex === null) return null;
  const start = model.range[0];
  const end = Math.min(model.boundaryIndex - 1, model.range[1]);
  if (end < start) return null;
  const center = zoneCenter(start, end, model.values.length);
  const width = zoneWidth(start, end, model.values.length);
  return (
    <group position={[center, -0.02, 0.46]}>
      <mesh>
        <boxGeometry args={[width, 0.06, 0.28]} />
        <meshStandardMaterial color={p.verdantDeep} emissive={p.verdant} emissiveIntensity={0.28} transparent opacity={0.58} />
      </mesh>
      <Html position={[0, 0.2, 0.06]} center style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-md border border-verdant-400/45 bg-ink-950/90 px-2 py-1 font-mono text-[10px] font-black uppercase leading-none text-verdant-100 shadow-lg">
          smaller than pivot
        </div>
      </Html>
    </group>
  );
}

function BoundaryMarker({ model, p }: { model: QuickSortSceneModel; p: Theme3DPalette }) {
  if (model.boundaryIndex === null) return null;
  const count = model.values.length;
  const clamped = Math.min(Math.max(model.boundaryIndex, 0), count - 1);
  const offset = model.boundaryIndex <= model.range[0] ? -GAP / 2 : model.boundaryIndex >= count ? GAP / 2 : -GAP / 2;
  const x = xForIndex(clamped, count) + offset;
  return (
    <group position={[x, 0.62, 0.62]}>
      <Line points={[[0, -0.48, 0], [0, 2.34, 0]]} color={p.verdant} lineWidth={2.4} />
      <Html position={[0, 2.58, 0]} center style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-md border border-verdant-400/60 bg-ink-950/94 px-2 py-1 font-mono text-[11px] font-black uppercase leading-none text-verdant-100 shadow-xl">
          i = {model.boundaryIndex}
        </div>
      </Html>
    </group>
  );
}

function ProbeMarker({ model, p }: { model: QuickSortSceneModel; p: Theme3DPalette }) {
  if (model.scanIndex === null || model.operation === "complete") return null;
  const x = xForIndex(model.scanIndex, model.values.length);
  return (
    <group position={[x, 3.24, 0]}>
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.16, 0.38, 24]} />
        <meshStandardMaterial color={p.arcBright} emissive={p.arcBright} emissiveIntensity={1.05} />
      </mesh>
      <Html position={[0, 0.32, 0.08]} center style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-md border border-arc-400/60 bg-ink-950/94 px-2 py-1 font-mono text-[11px] font-black uppercase leading-none text-arc-100 shadow-xl">
          j = {model.scanIndex}
        </div>
      </Html>
    </group>
  );
}

function PivotMarker({ model, p }: { model: QuickSortSceneModel; p: Theme3DPalette }) {
  if (model.pivotIndex === null || model.pivotValue === null) return null;
  const x = xForIndex(model.pivotIndex, model.values.length);
  return (
    <group position={[x, 3.62, -0.1]}>
      <mesh>
        <torusGeometry args={[0.34, 0.025, 10, 44]} />
        <meshStandardMaterial color={p.emberBright} emissive={p.emberBright} emissiveIntensity={1.1} />
      </mesh>
      <Html position={[0, 0.5, 0.08]} center style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-md border border-ember-400/60 bg-ink-950/95 px-2.5 py-1 font-mono text-xs font-black uppercase leading-none text-ember-100 shadow-xl">
          pivot {model.pivotValue}
        </div>
      </Html>
    </group>
  );
}

function CompareBeam({ model, p }: { model: QuickSortSceneModel; p: Theme3DPalette }) {
  if (!model.comparePair || model.pivotIndex === null || model.scanIndex === null) return null;
  const left = xForIndex(model.scanIndex, model.values.length);
  const right = xForIndex(model.pivotIndex, model.values.length);
  const high = 3.05;
  const points = Array.from({ length: 18 }, (_, index) => {
    const t = index / 17;
    return new THREE.Vector3(THREE.MathUtils.lerp(left, right, t), high + Math.sin(Math.PI * t) * 0.36, -0.04);
  });
  return <Line points={points} color={p.arcBright} lineWidth={2.6} />;
}

function SwapPaths({ model, p }: { model: QuickSortSceneModel; p: Theme3DPalette }) {
  if (!model.swapPair) return null;
  const [a, b] = model.swapPair;
  const x1 = xForIndex(a, model.values.length);
  const x2 = xForIndex(b, model.values.length);
  const makePath = (from: number, to: number, z: number) =>
    Array.from({ length: 18 }, (_, index) => {
      const t = index / 17;
      return new THREE.Vector3(THREE.MathUtils.lerp(from, to, t), 2.9 + Math.sin(Math.PI * t) * 0.78, z);
    });
  return (
    <group>
      <Line points={makePath(x1, x2, 0.42)} color={p.emberBright} lineWidth={2.5} />
      <Line points={makePath(x2, x1, -0.42)} color={p.arcBright} lineWidth={2.1} />
    </group>
  );
}

function DecisionBoard({ model, p }: { model: QuickSortSceneModel; p: Theme3DPalette }) {
  const label =
    model.operation === "compare" && model.scanIndex !== null && model.pivotValue !== null
      ? `a[${model.scanIndex}] ${model.values[model.scanIndex] < model.pivotValue ? "<" : ">="} pivot`
      : model.operation === "pivot" && model.finalIndex !== null
        ? `pivot -> index ${model.finalIndex}`
        : model.operation;
  return (
    <group position={[0, 3.82, 0.1]}>
      <mesh>
        <boxGeometry args={[3.7, 0.34, 0.32]} />
        <meshStandardMaterial color={p.emptyCell} emissive={model.operation === "pivot" ? p.verdant : p.arc} emissiveIntensity={0.25} transparent opacity={0.88} />
        <Edges color={model.operation === "pivot" ? p.verdant : p.arcBright} threshold={18} />
      </mesh>
      <Html position={[0, 0, 0.24]} center style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-md border border-arc-400/45 bg-ink-950/94 px-3 py-1.5 font-mono text-sm font-black leading-none text-ink-50 shadow-xl">
          {label}
        </div>
      </Html>
    </group>
  );
}

function Scene({ model, p }: { model: QuickSortSceneModel; p: Theme3DPalette }) {
  const scene = useRef<THREE.Group>(null);
  const maxValue = Math.max(...model.values, 1);
  const sorted = new Set(model.sortedIndices);
  const bars = useMemo<QuickBar[]>(
    () =>
      model.values.map((value, index) => {
        const active = model.pivotIndex === index || model.scanIndex === index || !!model.swapPair?.includes(index) || !!model.comparePair?.includes(index);
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
  const stageWidth = Math.max(6.1, (model.values.length - 1) * GAP + 2);

  useFrame(({ clock }) => {
    if (!scene.current) return;
    scene.current.rotation.y = Math.sin(clock.elapsedTime * 0.24) * 0.014;
  });

  return (
    <>
      <ambientLight intensity={0.72 * p.lighting.ambient} />
      <directionalLight position={[4.6, 7, 5.4]} intensity={1.5 * p.lighting.directional} />
      <pointLight position={[0, 4.8, 3.2]} intensity={46 * p.lighting.accent} distance={12} color={p.arcBright} />
      <pointLight position={[3.2, 3, -2.2]} intensity={34 * p.lighting.accent} distance={11} color={p.emberBright} />

      <group ref={scene} position={[0, -1.62, 0]}>
        <mesh position={[0, -0.13, 0]}>
          <boxGeometry args={[stageWidth, 0.1, 1.76]} />
          <meshStandardMaterial color={p.emptyCell} transparent opacity={0.7} roughness={0.48} metalness={0.24} />
        </mesh>
        <PartitionFloor model={model} p={p} />
        <SmallerZone model={model} p={p} />
        <BoundaryMarker model={model} p={p} />
        <ProbeMarker model={model} p={p} />
        <PivotMarker model={model} p={p} />
        <DecisionBoard model={model} p={p} />
        <CompareBeam model={model} p={p} />
        <SwapPaths model={model} p={p} />
        {bars.map((bar) => (
          <QuickSortBar key={bar.id} bar={bar} />
        ))}
      </group>

      <InfiniteGrid
        position={[0, -1.86, -0.12]}
        cellSize={0.5}
        cellThickness={0.55}
        cellColor={p.gridCell}
        sectionSize={2.5}
        sectionThickness={0.9}
        sectionColor={p.gridSection}
        fadeDistance={22}
        fadeStrength={1}
        infiniteGrid
      />

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={5.3}
        maxDistance={12.5}
        minPolarAngle={0.36}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  );
}

function rangeText(range: [number, number]): string {
  return `[${range[0]}..${range[1]}]`;
}

function Overlay({ model }: { model: QuickSortSceneModel }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-2 top-2 z-10 grid gap-2 md:inset-x-3 md:top-3 md:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-md border border-arc-400/35 bg-ink-950/90 px-3 py-2 shadow-2xl backdrop-blur-md">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded border border-verdant-400/35 bg-verdant-500/10 px-1.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-widest text-verdant-200">
              quick / {model.operation}
            </span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-400">
              range {rangeText(model.range)}
            </span>
          </div>
          <p className="max-w-4xl text-sm font-black leading-tight text-ink-50 sm:text-base md:text-lg">{model.headline}</p>
          <p className="mt-1 max-w-4xl text-[11px] leading-relaxed text-ink-300 sm:text-xs md:text-sm">{model.detail}</p>
        </div>

        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          <div className="rounded-md border border-ink-700/70 bg-ink-950/90 px-2 py-2 text-center shadow-xl backdrop-blur-md">
            <p className="font-mono text-[8px] font-black uppercase tracking-widest text-ink-500 sm:text-[9px]">pivot</p>
            <p className="mt-1 font-mono text-xs font-black text-ember-100 sm:text-sm">{model.pivotValue ?? "-"}</p>
          </div>
          <div className="rounded-md border border-ink-700/70 bg-ink-950/90 px-2 py-2 text-center shadow-xl backdrop-blur-md">
            <p className="font-mono text-[8px] font-black uppercase tracking-widest text-ink-500 sm:text-[9px]">i</p>
            <p className="mt-1 font-mono text-xs font-black text-verdant-100 sm:text-sm">{model.boundaryIndex ?? "-"}</p>
          </div>
          <div className="rounded-md border border-ink-700/70 bg-ink-950/90 px-2 py-2 text-center shadow-xl backdrop-blur-md">
            <p className="font-mono text-[8px] font-black uppercase tracking-widest text-ink-500 sm:text-[9px]">j</p>
            <p className="mt-1 font-mono text-xs font-black text-arc-100 sm:text-sm">{model.scanIndex ?? "-"}</p>
          </div>
          <div className="rounded-md border border-ink-700/70 bg-ink-950/90 px-2 py-2 text-center shadow-xl backdrop-blur-md">
            <p className="font-mono text-[8px] font-black uppercase tracking-widest text-ink-500 sm:text-[9px]">cmp/swap</p>
            <p className="mt-1 font-mono text-xs font-black text-ink-50 sm:text-sm">{model.comparisons ?? 0}/{model.swaps ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex flex-wrap gap-1.5 sm:inset-x-3 sm:bottom-3">
        <span className="rounded-md border border-ember-400/35 bg-ink-950/86 px-2 py-1 font-mono text-[10px] font-bold uppercase text-ember-200 backdrop-blur">orange = pivot</span>
        <span className="rounded-md border border-arc-400/35 bg-ink-950/86 px-2 py-1 font-mono text-[10px] font-bold uppercase text-arc-200 backdrop-blur">blue = scanner</span>
        <span className="rounded-md border border-verdant-400/35 bg-ink-950/86 px-2 py-1 font-mono text-[10px] font-bold uppercase text-verdant-200 backdrop-blur">green = smaller/final</span>
      </div>
    </>
  );
}

export function QuickSortStage3D({ step }: { step: TraceStep }) {
  const p = useTheme3D();
  const model = useMemo(() => getQuickSortSceneModel(step), [step]);

  if (!model) return null;

  return (
    <div className="codeanvil-canvas-fill relative h-full min-h-[23rem] w-full overflow-hidden rounded-md">
      <Canvas
        data-testid="quick-sort-stage-canvas"
        dpr={[1.25, 2]}
        camera={{ position: [0, 3.35, 7.8], fov: 39 }}
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