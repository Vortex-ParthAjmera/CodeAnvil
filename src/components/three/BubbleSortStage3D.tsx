import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import { getBubbleSortSceneModel, type BubbleSortSceneModel } from "../../engine/sortStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";

interface SortBar {
  identity: string;
  index: number;
  value: number;
  x: number;
  height: number;
  role: string;
  isCompare: boolean;
  isSwap: boolean;
  isSorted: boolean;
}

const GAP = 1.22;
const BAR_WIDTH = 0.72;
const BAR_DEPTH = 0.68;
const MAX_BAR_HEIGHT = 2.76;

function colorForBar(bar: SortBar, p: Theme3DPalette): string {
  if (bar.isSwap) return p.emberBright;
  if (bar.isCompare) return p.arcBright;
  if (bar.isSorted) return p.verdant;
  return p.barDefault;
}

function roleForIndex(model: BubbleSortSceneModel, index: number): string {
  const highlight = model.highlights.find((candidate) => candidate.index === index && candidate.role !== "sorted");
  if (highlight) return highlight.role;
  return model.sortedIndices.includes(index) ? "sorted" : "default";
}

function identityForValues(values: number[]): string[] {
  const seen = new Map<number, number>();
  return values.map((value) => {
    const count = seen.get(value) ?? 0;
    seen.set(value, count + 1);
    return `${value}:${count}`;
  });
}

function xForIndex(index: number, count: number): number {
  return (index - (count - 1) / 2) * GAP;
}

function usePulsedScale(base = 1, amount = 0.04, speed = 4) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = base + Math.sin(clock.elapsedTime * speed) * amount;
    ref.current.scale.setScalar(pulse);
  });
  return ref;
}

function AnimatedBar({ bar, p }: { bar: SortBar; p: Theme3DPalette }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);
  const mounted = useRef(false);
  const color = colorForBar(bar, p);
  const isActive = bar.isCompare || bar.isSwap;

  useLayoutEffect(() => {
    if (!group.current || !mesh.current || mounted.current) return;
    group.current.position.set(bar.x, 0, 0);
    mesh.current.scale.y = bar.height;
    mesh.current.position.y = bar.height / 2;
    mounted.current = true;
  }, [bar.height, bar.x]);

  useFrame(({ clock }, delta) => {
    if (!group.current || !mesh.current) return;
    const t = 1 - Math.pow(0.0007, delta);
    const lift = bar.isSwap ? 0.2 + Math.sin(clock.elapsedTime * 8 + bar.index) * 0.035 : bar.isCompare ? 0.08 : 0;
    const z = bar.isSwap ? Math.sin(clock.elapsedTime * 4 + bar.index) * 0.18 : 0;

    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, bar.x, t);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, lift, t);
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, z, t);
    mesh.current.scale.y = THREE.MathUtils.lerp(mesh.current.scale.y, bar.height, t);
    mesh.current.position.y = mesh.current.scale.y / 2;

    if (glow.current) {
      glow.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 5) * 0.035);
    }
  });

  return (
    <group ref={group}>
      <mesh ref={mesh}>
        <boxGeometry args={[BAR_WIDTH, 1, BAR_DEPTH]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isActive ? 0.65 : bar.isSorted ? 0.3 : 0.08}
          metalness={0.48}
          roughness={0.32}
        />
        <Edges color={isActive ? "#f8fbff" : color} threshold={18} />
      </mesh>

      {isActive && (
        <mesh ref={glow} position={[0, Math.max(bar.height + 0.18, 0.6), 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.3} />
        </mesh>
      )}

      {bar.isSorted && (
        <mesh position={[0, 0.04, -0.48]}>
          <boxGeometry args={[BAR_WIDTH + 0.16, 0.08, 0.2]} />
          <meshStandardMaterial color={p.verdantDeep} emissive={p.verdant} emissiveIntensity={0.28} />
        </mesh>
      )}

      <Html position={[0, bar.height + 0.42, 0]} center style={{ pointerEvents: "none" }}>
        <div
          style={{ borderColor: isActive ? color : "rgba(255,255,255,0.18)" }}
          className="min-w-8 rounded-md border bg-ink-950/92 px-2 py-1 text-center font-mono text-sm font-black leading-none text-ink-50 shadow-[0_10px_24px_rgba(0,0,0,0.35)] backdrop-blur"
        >
          {bar.value}
        </div>
      </Html>
    </group>
  );
}

function IndexRail({ count, p }: { count: number; p: Theme3DPalette }) {
  return (
    <group>
      {Array.from({ length: count }, (_, index) => (
        <group key={index} position={[xForIndex(index, count), 0, 0]}>
          <mesh position={[0, -0.05, 0.02]}>
            <boxGeometry args={[0.82, 0.04, 0.82]} />
            <meshStandardMaterial color={p.emptyCell} emissive={p.gridCell} emissiveIntensity={0.16} />
          </mesh>
          <Html position={[0, -0.46, 0]} center style={{ pointerEvents: "none" }}>
            <div className="rounded border border-ink-700/80 bg-ink-950/90 px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-ink-300">
              i={index}
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}

function PairArc({
  model,
  bars,
  p,
}: {
  model: BubbleSortSceneModel;
  bars: SortBar[];
  p: Theme3DPalette;
}) {
  const pair = model.activePair;
  const pulse = usePulsedScale(1, 0.03, 3.8);
  if (!pair) return null;

  const [left, right] = [...pair].sort((a, b) => a - b);
  const leftBar = bars.find((bar) => bar.index === left);
  const rightBar = bars.find((bar) => bar.index === right);
  if (!leftBar || !rightBar) return null;

  const color = model.operation === "swap" ? p.emberBright : p.arcBright;
  const high = Math.max(leftBar.height, rightBar.height) + 0.78;
  const x1 = leftBar.x;
  const x2 = rightBar.x;
  const mid = (x1 + x2) / 2;
  const points = Array.from({ length: 18 }, (_, index) => {
    const t = index / 17;
    const x = THREE.MathUtils.lerp(x1, x2, t);
    const y = high + Math.sin(Math.PI * t) * 0.38;
    const z = -0.08;
    return new THREE.Vector3(x, y, z);
  });

  return (
    <group ref={pulse}>
      <Line points={points} color={color} lineWidth={2.6} />
      <Html position={[mid, high + 0.62, 0]} center style={{ pointerEvents: "none" }}>
        <div
          style={{ borderColor: color }}
          className="whitespace-nowrap rounded border bg-ink-950/82 px-2 py-0.5 font-mono text-[10px] font-black uppercase leading-none text-ink-50 shadow-lg backdrop-blur-sm"
        >
          {model.operation === "swap" ? "swap path" : "compare pair"}
        </div>
      </Html>
    </group>
  );
}

function SwapPaths({
  model,
  bars,
  p,
}: {
  model: BubbleSortSceneModel;
  bars: SortBar[];
  p: Theme3DPalette;
}) {
  if (!model.swapPair) return null;
  const [a, b] = model.swapPair;
  const leftBar = bars.find((bar) => bar.index === a);
  const rightBar = bars.find((bar) => bar.index === b);
  if (!leftBar || !rightBar) return null;

  const top = Math.max(leftBar.height, rightBar.height) + 0.34;
  const makePath = (from: number, to: number, z: number) =>
    Array.from({ length: 14 }, (_, index) => {
      const t = index / 13;
      return new THREE.Vector3(
        THREE.MathUtils.lerp(from, to, t),
        top + Math.sin(Math.PI * t) * 0.72,
        z,
      );
    });

  return (
    <group>
      <Line points={makePath(leftBar.x, rightBar.x, 0.42)} color={p.emberBright} lineWidth={2.4} />
      <Line points={makePath(rightBar.x, leftBar.x, -0.42)} color={p.arcBright} lineWidth={2.4} />
    </group>
  );
}

function SortedTail({
  model,
  count,
  p,
}: {
  model: BubbleSortSceneModel;
  count: number;
  p: Theme3DPalette;
}) {
  if (model.sortedIndices.length === 0) return null;

  const sorted = new Set(model.sortedIndices);
  let start = count;
  while (start > 0 && sorted.has(start - 1)) start--;
  const isTail = start < count;
  const indices = isTail ? Array.from({ length: count - start }, (_, offset) => start + offset) : model.sortedIndices;
  const first = indices[0];
  const last = indices[indices.length - 1];
  const center = (xForIndex(first, count) + xForIndex(last, count)) / 2;
  const width = Math.max(BAR_WIDTH + 0.28, Math.abs(xForIndex(last, count) - xForIndex(first, count)) + BAR_WIDTH + 0.46);

  return (
    <group position={[center, -0.01, -0.54]}>
      <mesh>
        <boxGeometry args={[width, 0.07, 1.18]} />
        <meshStandardMaterial color={p.verdantDeep} transparent opacity={0.46} emissive={p.verdant} emissiveIntensity={0.18} />
      </mesh>
      <Html position={[0, 0.2, -0.1]} center style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-md border border-verdant-400/55 bg-ink-950/92 px-2 py-1 font-mono text-[11px] font-bold uppercase leading-none text-verdant-200 shadow-lg">
          {isTail ? "sorted tail locked" : "sorted values locked"}
        </div>
      </Html>
    </group>
  );
}

function Scene({ model, p }: { model: BubbleSortSceneModel; p: Theme3DPalette }) {
  const maxValue = Math.max(...model.values, 1);
  const identities = useMemo(() => identityForValues(model.values), [model.values]);
  const active = new Set(model.activePair ?? []);
  const sorted = new Set(model.sortedIndices);
  const bars = useMemo<SortBar[]>(
    () =>
      model.values.map((value, index) => {
        const role = roleForIndex(model, index);
        return {
          identity: identities[index],
          index,
          value,
          x: xForIndex(index, model.values.length),
          height: Math.max(0.28, (value / maxValue) * MAX_BAR_HEIGHT),
          role,
          isCompare: role === "compare" || (model.operation === "compare" && active.has(index)),
          isSwap: role === "swap" || (model.operation === "swap" && active.has(index)),
          isSorted: sorted.has(index),
        };
      }),
    [active, identities, maxValue, model],
  );

  const stageWidth = Math.max(5.6, (model.values.length - 1) * GAP + 2);

  return (
    <>
      <ambientLight intensity={0.72 * p.lighting.ambient} />
      <directionalLight position={[4.5, 7, 5]} intensity={1.55 * p.lighting.directional} />
      <pointLight position={[0, 4.2, 3.4]} intensity={48 * p.lighting.accent} distance={12} color={p.arcBright} />
      <pointLight position={[-3, 2.4, 2]} intensity={24 * p.lighting.accent} distance={10} color={p.emberBright} />

      <group position={[0, -1.42, 0]}>
        <mesh position={[0, -0.1, 0]}>
          <boxGeometry args={[stageWidth, 0.1, 1.58]} />
          <meshStandardMaterial color={p.emptyCell} transparent opacity={0.72} roughness={0.48} metalness={0.28} />
        </mesh>
        <IndexRail count={model.values.length} p={p} />
        <SortedTail model={model} count={model.values.length} p={p} />
        <PairArc model={model} bars={bars} p={p} />
        <SwapPaths model={model} bars={bars} p={p} />
        {bars.map((bar) => (
          <AnimatedBar key={bar.identity} bar={bar} p={p} />
        ))}
      </group>

      <InfiniteGrid
        position={[0, -1.68, -0.15]}
        cellSize={0.48}
        cellThickness={0.55}
        cellColor={p.gridCell}
        sectionSize={2.4}
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
        minDistance={5}
        maxDistance={12}
        minPolarAngle={0.42}
        maxPolarAngle={Math.PI / 2.12}
      />
    </>
  );
}

function Overlay({ model }: { model: BubbleSortSceneModel }) {
  const pair = model.activePair;
  const pairText = pair ? `a[${pair[0]}] <-> a[${pair[1]}]` : "waiting";
  const stats = [
    ["pair", pairText],
    ["cmp", model.comparisons ?? 0],
    ["swap", model.swaps ?? 0],
  ];

  return (
    <>
      <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex items-start justify-between gap-2 sm:inset-x-3 sm:top-3">
        <div className="min-w-0 max-w-[13rem] rounded-md border border-arc-400/30 bg-ink-950/72 px-2.5 py-1.5 shadow-lg backdrop-blur-sm sm:max-w-[18rem]">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 rounded border border-verdant-400/35 bg-verdant-500/10 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-widest text-verdant-200">
              bubble / {model.operation}
            </span>
            <span className="truncate font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
              {model.item.id}
            </span>
          </div>
          <p className="mt-1 truncate text-[11px] font-black leading-tight text-ink-50 sm:text-xs">{model.headline}</p>
        </div>

        <div className="flex max-w-[16rem] flex-wrap justify-end gap-1 sm:max-w-[21rem]">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded border border-ink-700/65 bg-ink-950/72 px-1.5 py-1 text-center shadow-lg backdrop-blur-sm">
              <span className="block font-mono text-[8px] font-black uppercase tracking-widest text-ink-500">{label}</span>
              <span className="block max-w-[5.5rem] truncate font-mono text-[11px] font-black leading-tight text-ink-50">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex items-end justify-between gap-2 sm:inset-x-3 sm:bottom-3">
        <p className="hidden max-w-[24rem] rounded-md border border-arc-400/25 bg-ink-950/68 px-2 py-1.5 text-[10px] leading-snug text-ink-300 shadow-lg backdrop-blur-sm sm:block">
          {model.detail}
        </p>
        <div className="ml-auto flex flex-wrap justify-end gap-1">
          <span className="rounded border border-arc-400/35 bg-ink-950/72 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-arc-200 backdrop-blur">blue compare</span>
          <span className="rounded border border-ember-400/35 bg-ink-950/72 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-ember-200 backdrop-blur">violet swap</span>
          <span className="rounded border border-verdant-400/35 bg-ink-950/72 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-verdant-200 backdrop-blur">green sorted</span>
        </div>
      </div>
    </>
  );
}

export function BubbleSortStage3D({ step }: { step: TraceStep }) {
  const p = useTheme3D();
  const model = getBubbleSortSceneModel(step);

  if (!model) return null;

  return (
    <div className="codeanvil-canvas-fill relative h-full min-h-[22rem] w-full overflow-hidden rounded-md">
      <Canvas
        dpr={[1.25, 2]}
        data-testid="bubble-sort-stage-canvas"
        camera={{ position: [0, 3.45, 8.1], fov: 40 }}
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
