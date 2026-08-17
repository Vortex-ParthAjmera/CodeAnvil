import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import {
  getBinarySearchSceneModel,
  type BinarySearchCell,
  type BinarySearchSceneModel,
} from "../../engine/searchStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";
import { HudToggle, useStageHud } from "./StageHud";

function gapForCount(count: number): number {
  if (count <= 6) return 1.04;
  if (count <= 10) return 0.9;
  return 0.74;
}

function cellWidthForCount(count: number): number {
  if (count <= 6) return 0.72;
  if (count <= 10) return 0.62;
  return 0.52;
}

function xForIndex(index: number, count: number): number {
  return (index - (count - 1) / 2) * gapForCount(count);
}

function colorForCell(cell: BinarySearchCell, model: BinarySearchSceneModel, p: Theme3DPalette): string {
  if (model.foundIndex === cell.index) return p.verdant;
  if (cell.isMid) return p.emberBright;
  if (cell.inRange) return p.arc;
  return p.barRange;
}

function ArrayCell({
  cell,
  model,
  p,
  count,
}: {
  cell: BinarySearchCell;
  model: BinarySearchSceneModel;
  p: Theme3DPalette;
  count: number;
}) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const mounted = useRef(false);
  const x = xForIndex(cell.index, count);
  const color = colorForCell(cell, model, p);
  const width = cellWidthForCount(count);
  const isHot = cell.isMid || model.foundIndex === cell.index;

  useLayoutEffect(() => {
    if (!group.current || mounted.current) return;
    group.current.position.set(x, cell.isDiscarded ? -0.12 : 0, 0);
    mounted.current = true;
  }, [cell.isDiscarded, x]);

  useFrame(({ clock }, delta) => {
    if (!group.current || !mesh.current) return;
    const t = 1 - Math.pow(0.0007, delta);
    const lift = cell.isMid ? 0.22 + Math.sin(clock.elapsedTime * 5.2) * 0.035 : model.foundIndex === cell.index ? 0.18 : 0;
    const y = cell.isDiscarded ? -0.18 : lift;
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, x, t);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, y, t);
    const scale = isHot ? 1.08 : cell.inRange ? 1 : 0.88;
    mesh.current.scale.setScalar(THREE.MathUtils.lerp(mesh.current.scale.x, scale, t));
  });

  return (
    <group ref={group}>
      <mesh ref={mesh}>
        <boxGeometry args={[width, 0.54, 0.62]} />
        <meshStandardMaterial
          color={cell.isDiscarded ? p.emptyCell : p.emptyCell}
          emissive={color}
          emissiveIntensity={isHot ? 0.72 : cell.inRange ? 0.28 : 0.08}
          metalness={0.42}
          roughness={0.34}
          transparent
          opacity={cell.isDiscarded ? 0.42 : 0.96}
        />
        <Edges color={color} threshold={18} />
      </mesh>
      <Html position={[0, 0.02, 0.4]} center style={{ pointerEvents: "none" }}>
        <div
          className="min-w-8 rounded-md border bg-ink-950/92 px-2 py-1 text-center font-mono text-sm font-black leading-none text-ink-50 shadow-xl backdrop-blur"
          style={{ borderColor: color, opacity: cell.isDiscarded ? 0.62 : 1 }}
        >
          {cell.value}
        </div>
      </Html>
      <Html position={[0, -0.58, 0.05]} center style={{ pointerEvents: "none" }}>
        <div className="rounded border border-ink-700/75 bg-ink-950/85 px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-ink-400">
          {cell.index}
        </div>
      </Html>
    </group>
  );
}

function RangeWindow({ model, p }: { model: BinarySearchSceneModel; p: Theme3DPalette }) {
  if (model.low === null || model.high === null || model.low > model.high) return null;
  const count = model.values.length;
  const left = xForIndex(model.low, count);
  const right = xForIndex(model.high, count);
  const center = (left + right) / 2;
  const width = Math.abs(right - left) + cellWidthForCount(count) + 0.42;

  return (
    <group position={[center, -0.04, -0.42]}>
      <mesh>
        <boxGeometry args={[width, 0.08, 1.28]} />
        <meshStandardMaterial color={p.arcDeep} emissive={p.arc} emissiveIntensity={0.18} transparent opacity={0.34} />
      </mesh>
      <Html position={[0, 0.31, -0.02]} center style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-md border border-arc-400/50 bg-ink-950/90 px-2 py-1 font-mono text-[11px] font-black uppercase leading-none text-arc-100 shadow-lg">
          active window {model.rangeLabel}
        </div>
      </Html>
    </group>
  );
}

function BoundFlag({
  label,
  index,
  count,
  color,
}: {
  label: string;
  index: number | null;
  count: number;
  color: string;
}) {
  if (index === null || index < 0 || index >= count) return null;
  const x = xForIndex(index, count);
  return (
    <group position={[x, -1.05, 0.02]}>
      <Line points={[[0, 0.12, 0], [0, 0.52, 0]]} color={color} lineWidth={1.8} />
      <Html position={[0, 0, 0.1]} center style={{ pointerEvents: "none" }}>
        <div
          className="rounded border bg-ink-950/92 px-2 py-1 font-mono text-[10px] font-black uppercase leading-none text-ink-50 shadow-lg"
          style={{ borderColor: color }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}

function MidProbe({ model, p }: { model: BinarySearchSceneModel; p: Theme3DPalette }) {
  const pulse = useRef<THREE.Group>(null);
  const mid = model.mid;
  const hasMid = mid !== null && mid >= 0 && mid < model.values.length;
  const x = hasMid ? xForIndex(mid, model.values.length) : 0;

  useFrame(({ clock }) => {
    if (!pulse.current || !hasMid) return;
    pulse.current.position.y = 0.8 + Math.sin(clock.elapsedTime * 4.4) * 0.06;
  });

  if (!hasMid) return null;

  return (
    <group ref={pulse} position={[x, 0.82, 0]}>
      <mesh>
        <coneGeometry args={[0.16, 0.36, 24]} />
        <meshStandardMaterial color={p.emberBright} emissive={p.emberBright} emissiveIntensity={1.1} />
      </mesh>
      <Html position={[0, 0.34, 0.1]} center style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-md border border-ember-400/55 bg-ink-950/94 px-2 py-1 font-mono text-[11px] font-black uppercase leading-none text-ember-100 shadow-xl">
          mid = {mid}
        </div>
      </Html>
    </group>
  );
}

function TargetBeacon({ model, p }: { model: BinarySearchSceneModel; p: Theme3DPalette }) {
  const targetIndex = model.target === null ? -1 : model.values.findIndex((value) => value === model.target);
  const x = targetIndex >= 0 ? xForIndex(targetIndex, model.values.length) : 0;
  return (
    <group position={[x, 1.62, 0]}>
      <mesh>
        <torusGeometry args={[0.34, 0.025, 10, 46]} />
        <meshStandardMaterial color={p.verdant} emissive={p.verdant} emissiveIntensity={0.85} />
      </mesh>
      <Html position={[0, 0.44, 0.08]} center style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-md border border-verdant-400/55 bg-ink-950/94 px-2 py-1 font-mono text-[11px] font-black uppercase leading-none text-verdant-100 shadow-xl">
          target {model.target ?? "?"}
        </div>
      </Html>
    </group>
  );
}

function DecisionBoard({ model, p }: { model: BinarySearchSceneModel; p: Theme3DPalette }) {
  return (
    <group position={[0, 2.18, 0]}>
      <mesh>
        <boxGeometry args={[4.45, 0.44, 0.34]} />
        <meshStandardMaterial color={p.emptyCell} emissive={model.operation === "found" ? p.verdant : p.arc} emissiveIntensity={0.24} transparent opacity={0.86} />
        <Edges color={model.operation === "found" ? p.verdant : p.arcBright} threshold={20} />
      </mesh>
      <Html position={[0, 0, 0.24]} center style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-md border border-arc-400/45 bg-ink-950/92 px-3 py-1.5 font-mono text-sm font-black text-ink-50 shadow-xl">
          {model.compareLabel}
        </div>
      </Html>
    </group>
  );
}

function Scene({ model, p }: { model: BinarySearchSceneModel; p: Theme3DPalette }) {
  const stageWidth = Math.max(5.7, (model.values.length - 1) * gapForCount(model.values.length) + 1.7);
  const scene = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!scene.current) return;
    scene.current.rotation.y = Math.sin(clock.elapsedTime * 0.32) * 0.018;
  });

  return (
    <>
      <ambientLight intensity={0.74 * p.lighting.ambient} />
      <directionalLight position={[4, 7, 5]} intensity={1.5 * p.lighting.directional} />
      <pointLight position={[0, 3.4, 3.4]} intensity={42 * p.lighting.accent} distance={12} color={p.arcBright} />
      <pointLight position={[3, 2.2, 2.4]} intensity={26 * p.lighting.accent} distance={10} color={p.verdant} />

      <group ref={scene} position={[0, -0.48, 0]}>
        <DecisionBoard model={model} p={p} />
        <TargetBeacon model={model} p={p} />
        <RangeWindow model={model} p={p} />
        <MidProbe model={model} p={p} />
        <BoundFlag label="low" index={model.low} count={model.values.length} color={p.arcBright} />
        <BoundFlag label="high" index={model.high} count={model.values.length} color={p.emberBright} />
        <mesh position={[0, -0.2, -0.35]}>
          <boxGeometry args={[stageWidth, 0.08, 1.34]} />
          <meshStandardMaterial color={p.emptyCell} transparent opacity={0.66} roughness={0.46} metalness={0.24} />
        </mesh>
        {model.cells.map((cell) => (
          <ArrayCell key={cell.index} cell={cell} model={model} p={p} count={model.values.length} />
        ))}
      </group>

      <InfiniteGrid
        position={[0, -2.05, -0.2]}
        cellSize={0.5}
        cellThickness={0.55}
        cellColor={p.gridCell}
        sectionSize={2.5}
        sectionThickness={0.9}
        sectionColor={p.gridSection}
        fadeDistance={21}
        fadeStrength={1}
        infiniteGrid
      />

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={12}
        minPolarAngle={0.34}
        maxPolarAngle={Math.PI / 2.08}
      />
    </>
  );
}

function Overlay({ model }: { model: BinarySearchSceneModel }) {
  const stats = [
    ["target", model.target ?? "-"],
    ["mid", model.mid ?? "-"],
    ["probes", model.probes ?? 0],
  ] as const;

  return (
    <>
      {/* Compact strip, same recipe as the sort stages; the detail paragraph
          lives in the bottom rail so the top HUD stays slim. */}
      <div className="pointer-events-none absolute left-2 right-11 top-2 z-10 flex items-start justify-between gap-2 sm:left-3 sm:right-12 sm:top-3">
        <div className="min-w-0 max-w-[13rem] rounded-md border border-arc-400/30 bg-ink-950/72 px-2.5 py-1.5 shadow-lg backdrop-blur-sm sm:max-w-[16rem]">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 rounded border border-arc-400/35 bg-arc-500/10 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-widest text-arc-200">
              {model.operation}
            </span>
            <span className="truncate font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
              range {model.rangeLabel}
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

      <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex flex-wrap items-end justify-between gap-2 sm:inset-x-3 sm:bottom-3">
        <p className="hidden max-w-[24rem] rounded-md border border-arc-400/25 bg-ink-950/68 px-2 py-1.5 text-[10px] leading-snug text-ink-300 shadow-lg backdrop-blur-sm sm:block">
          {model.detail}
        </p>
        <div className="ml-auto flex flex-wrap justify-end gap-1">
          <span className="rounded border border-arc-400/35 bg-ink-950/72 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-arc-200 backdrop-blur">blue window</span>
          <span className="rounded border border-ember-400/35 bg-ink-950/72 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-ember-200 backdrop-blur">orange mid</span>
          <span className="rounded border border-verdant-400/35 bg-ink-950/72 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-verdant-200 backdrop-blur">green found</span>
        </div>
      </div>
    </>
  );
}

export function BinarySearchStage3D({ step }: { step: TraceStep }) {
  const p = useTheme3D();
  const model = useMemo(() => getBinarySearchSceneModel(step), [step]);
  const hud = useStageHud();

  if (!model) return null;

  return (
    <div className="codeanvil-canvas-fill relative h-full w-full overflow-hidden rounded-md @container">
      <Canvas
        dpr={[1.25, 2]}
        camera={{ position: [0, 2.1, 7.15], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <CanvasSizeSync />
        <Scene model={model} p={p} />
      </Canvas>
      <HudToggle open={hud.hudOpen} onToggle={hud.toggleHud} />
      {hud.hudOpen && <Overlay model={model} />}
    </div>
  );
}
