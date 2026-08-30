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
import { StageProgressBar } from "./StageProgressBar";
import { CodeLineBadge } from "./CodeLineBadge";

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
  if (cell.isTarget && model.operation === "target") return p.verdantDeep;
  if (cell.inRange) return p.arc;
  return p.barRange;
}

function midValueFor(model: BinarySearchSceneModel): number | null {
  if (model.mid === null || model.mid < 0 || model.mid >= model.values.length) return null;
  const value = model.values[model.mid];
  return Number.isFinite(value) ? value : null;
}

function decisionFor(model: BinarySearchSceneModel): "left" | "right" | "found" | null {
  if (!["compare", "discard-left", "discard-right", "found", "complete"].includes(model.operation)) return null;
  const midValue = midValueFor(model);
  if (midValue === null || model.target === null || model.mid === null) return null;
  if (midValue === model.target || model.foundIndex === model.mid) return "found";
  return midValue < model.target ? "right" : "left";
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
  const isDiscarded = cell.isDiscarded && model.foundIndex !== cell.index;

  useLayoutEffect(() => {
    if (!group.current || mounted.current) return;
    group.current.position.set(x, isDiscarded ? -0.2 : 0, 0);
    mounted.current = true;
  }, [cell.isDiscarded, x]);

  useFrame(({ clock }, delta) => {
    if (!group.current || !mesh.current) return;
    const t = 1 - Math.pow(0.0007, delta);
    const lift = cell.isMid ? 0.25 + Math.sin(clock.elapsedTime * 5.2) * 0.03 : model.foundIndex === cell.index ? 0.22 : 0;
    const y = isDiscarded ? -0.28 : lift;
    const z = isDiscarded ? (cell.discardedSide === "left" ? -0.18 : 0.18) : 0;
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, x, t);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, y, t);
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, z, t);
    const scale = isHot ? 1.1 : cell.inRange ? 1 : 0.76;
    mesh.current.scale.setScalar(THREE.MathUtils.lerp(mesh.current.scale.x, scale, t));
  });

  return (
    <group ref={group}>
      <mesh ref={mesh}>
        <boxGeometry args={[width, 0.54, 0.62]} />
        <meshStandardMaterial
          color={isDiscarded ? p.barRange : p.emptyCell}
          emissive={color}
          emissiveIntensity={isHot ? 0.82 : cell.inRange ? 0.32 : 0.05}
          metalness={0.42}
          roughness={0.34}
          transparent
          opacity={isDiscarded ? 0.28 : 0.96}
        />
        <Edges color={color} threshold={18} />
      </mesh>
      <Html position={[0, 0.04, 0.42]} center style={{ pointerEvents: "none", WebkitFontSmoothing: "antialiased", textRendering: "geometricPrecision" }}>
        <div
          data-binary-stage="value"
          className="stage-value-card"
          style={{ borderColor: color, opacity: isDiscarded ? 0.48 : 1 }}
        >
          {cell.value}
        </div>
      </Html>
      <Html position={[0, -0.5, 0.34]} center style={{ pointerEvents: "none", WebkitFontSmoothing: "antialiased", textRendering: "geometricPrecision" }}>
        <div
          data-binary-stage="index"
          className="rounded border border-ink-700/70 bg-ink-950/82 px-1.5 py-0.5 font-mono text-[9px] font-black leading-none text-ink-400 shadow-md"
          style={{ opacity: isDiscarded ? 0.42 : 0.86 }}
        >
          i={cell.index}
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
    </group>
  );
}

function BoundFlag({
  index,
  count,
  color,
  side,
}: {
  index: number | null;
  count: number;
  color: string;
  side: "left" | "right";
}) {
  if (index === null || index < 0 || index >= count) return null;
  const x = xForIndex(index, count) + (side === "left" ? -0.11 : 0.11);
  return (
    <group position={[x, -1.02, 0.02]}>
      <Line points={[[0, 0.12, 0], [0, 0.62, 0]]} color={color} lineWidth={2.4} />
      <mesh position={[0, 0.03, 0.08]}>
        <boxGeometry args={[0.24, 0.08, 0.18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.78} />
      </mesh>
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
      <mesh position={[0, 0.28, 0.08]}>
        <boxGeometry args={[0.36, 0.055, 0.18]} />
        <meshStandardMaterial color={p.emberBright} emissive={p.emberBright} emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

function TargetBeacon({ model, p }: { model: BinarySearchSceneModel; p: Theme3DPalette }) {
  const targetIndex = model.target === null ? -1 : model.values.findIndex((value) => value === model.target);
  if (targetIndex < 0) return null;
  const x = xForIndex(targetIndex, model.values.length);
  return (
    <group position={[x, 1.48, 0.02]}>
      <Line points={[[0, -0.5, 0], [0, -0.12, 0]]} color={p.verdant} lineWidth={2} />
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.32, 0.026, 10, 48]} />
        <meshStandardMaterial color={p.verdant} emissive={p.verdant} emissiveIntensity={0.9} />
      </mesh>
      <Html position={[0, 0.42, 0]} center style={{ pointerEvents: "none", WebkitFontSmoothing: "antialiased", textRendering: "geometricPrecision" }}>
        <div data-binary-stage="target" className="rounded border border-verdant-400/60 bg-ink-950/88 px-2 py-1 font-mono text-[10px] font-black uppercase leading-none text-verdant-100 shadow-lg">
          target {model.target}
        </div>
      </Html>
    </group>
  );
}

function DecisionBeam({ model, p }: { model: BinarySearchSceneModel; p: Theme3DPalette }) {
  const decision = decisionFor(model);
  if (!decision || model.mid === null || model.mid < 0 || model.mid >= model.values.length) return null;

  const count = model.values.length;
  const start = xForIndex(model.mid, count);
  const color = decision === "found" ? p.verdant : decision === "right" ? p.arcBright : p.emberBright;

  if (decision === "found") {
    return (
      <group position={[start, 0.9, 0.24]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.44, 0.032, 12, 56]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} />
        </mesh>
        <Html position={[0, 0.5, 0]} center style={{ pointerEvents: "none", WebkitFontSmoothing: "antialiased", textRendering: "geometricPrecision" }}>
          <div data-binary-stage="decision" className="rounded border border-verdant-400/70 bg-ink-950/90 px-2 py-1 font-mono text-[10px] font-black uppercase leading-none text-verdant-100 shadow-lg">
            found
          </div>
        </Html>
      </group>
    );
  }

  const low = model.low ?? 0;
  const high = model.high ?? count - 1;
  const endIndex = decision === "right" ? Math.min(high, model.mid + 1) : Math.max(low, model.mid - 1);
  const end = xForIndex(endIndex, count);
  const middle = (start + end) / 2;
  const label = decision === "right" ? "keep right half" : "keep left half";
  const coneRotation = decision === "right" ? -Math.PI / 2 : Math.PI / 2;

  return (
    <group>
      <Line
        points={[
          [start, 0.66, 0.22],
          [middle, 1.02, 0.22],
          [end, 0.66, 0.22],
        ]}
        color={color}
        lineWidth={3.1}
      />
      <mesh position={[end, 0.66, 0.22]} rotation={[0, 0, coneRotation]}>
        <coneGeometry args={[0.11, 0.28, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
      </mesh>
      <Html position={[middle, 1.17, 0.24]} center style={{ pointerEvents: "none", WebkitFontSmoothing: "antialiased", textRendering: "geometricPrecision" }}>
        <div data-binary-stage="decision" className="rounded border bg-ink-950/90 px-2 py-1 font-mono text-[10px] font-black uppercase leading-none shadow-lg" style={{ borderColor: color, color }}>
          {label}
        </div>
      </Html>
    </group>
  );
}

function DiscardBands({ model, p }: { model: BinarySearchSceneModel; p: Theme3DPalette }) {
  const spans: Array<{ start: number; end: number; color: string }> = [];
  const left = model.cells.filter((cell) => cell.discardedSide === "left").map((cell) => cell.index);
  const right = model.cells.filter((cell) => cell.discardedSide === "right").map((cell) => cell.index);
  if (left.length > 0) spans.push({ start: Math.min(...left), end: Math.max(...left), color: p.arcDeep });
  if (right.length > 0) spans.push({ start: Math.min(...right), end: Math.max(...right), color: p.ember });

  return (
    <group>
      {spans.map((span) => {
        const leftX = xForIndex(span.start, model.values.length);
        const rightX = xForIndex(span.end, model.values.length);
        const center = (leftX + rightX) / 2;
        const width = Math.abs(rightX - leftX) + cellWidthForCount(model.values.length) + 0.2;
        return (
          <mesh key={`${span.start}-${span.end}`} position={[center, 0.02, -0.36]}>
            <boxGeometry args={[width, 0.72, 0.08]} />
            <meshStandardMaterial color={p.barRange} emissive={span.color} emissiveIntensity={0.2} transparent opacity={0.24} />
          </mesh>
        );
      })}
    </group>
  );
}

function Scene({ model, p }: { model: BinarySearchSceneModel; p: Theme3DPalette }) {
  const stageWidth = Math.max(5.7, (model.values.length - 1) * gapForCount(model.values.length) + 1.7);

  return (
    <>
      <ambientLight intensity={0.74 * p.lighting.ambient} />
      <directionalLight position={[4, 7, 5]} intensity={1.5 * p.lighting.directional} />
      <pointLight position={[0, 3.4, 3.4]} intensity={42 * p.lighting.accent} distance={12} color={p.arcBright} />
      <pointLight position={[3, 2.2, 2.4]} intensity={26 * p.lighting.accent} distance={10} color={p.verdant} />

      <group position={[0, -0.06, 0]}>
        <TargetBeacon model={model} p={p} />
        <RangeWindow model={model} p={p} />
        <DiscardBands model={model} p={p} />
        <DecisionBeam model={model} p={p} />
        <MidProbe model={model} p={p} />
        <BoundFlag index={model.low} count={model.values.length} color={p.arcBright} side="left" />
        <BoundFlag index={model.high} count={model.values.length} color={p.emberBright} side="right" />
        <mesh position={[0, -0.22, -0.35]}>
          <boxGeometry args={[stageWidth, 0.08, 1.34]} />
          <meshStandardMaterial color={p.emptyCell} transparent opacity={0.66} roughness={0.46} metalness={0.24} />
        </mesh>
        {model.cells.map((cell) => (
          <ArrayCell key={cell.index} cell={cell} model={model} p={p} count={model.values.length} />
        ))}
      </group>

      <InfiniteGrid
        position={[0, -1.72, -0.2]}
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
    ["compare", model.compareLabel],
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
          <p className="mt-1 text-[11px] font-black leading-tight text-ink-50 sm:text-xs">{model.headline}</p>
        </div>

        <div className="stage-hud-secondary max-w-[16rem] flex-wrap justify-end gap-1 sm:max-w-[21rem]">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded border border-ink-700/65 bg-ink-950/72 px-1.5 py-1 text-center shadow-lg backdrop-blur-sm">
              <span className="block font-mono text-[8px] font-black uppercase tracking-widest text-ink-500">{label}</span>
              <span className="block max-w-[4.5rem] truncate font-mono text-[11px] font-black leading-tight text-ink-50">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-16 left-3 right-3 z-10 flex flex-wrap items-end justify-between gap-2 sm:left-4 sm:right-4">
        <p className="max-w-[24rem] rounded-md border border-arc-400/25 bg-ink-950/68 px-2 py-1.5 text-[10px] leading-snug text-ink-300 shadow-lg backdrop-blur-sm">
          {model.detail}
        </p>
        <div className="stage-hud-legend ml-auto flex-wrap justify-end gap-1">
          <span className="rounded border border-arc-400/35 bg-ink-950/72 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-arc-200 backdrop-blur">blue window</span>
          <span className="rounded border border-ember-400/35 bg-ink-950/72 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-ember-200 backdrop-blur">orange mid</span>
          <span className="rounded border border-verdant-400/35 bg-ink-950/72 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-verdant-200 backdrop-blur">green found</span>
        </div>
      </div>
    </>
  );
}

export function BinarySearchStage3D({ step, steps }: { step: TraceStep; steps?: TraceStep[] }) {
  const p = useTheme3D();
  const model = useMemo(() => getBinarySearchSceneModel(step), [step]);
  const hud = useStageHud();

  if (!model) return null;

  return (
    <div className="codeanvil-canvas-fill codeanvil-stage-frame relative h-full w-full overflow-hidden rounded-md">
      <Canvas
        data-testid="binary-search-stage-canvas"
        dpr={[1.25, 2]}
        camera={{ position: [0, 2.42, 7.75], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <CanvasSizeSync />
        <Scene model={model} p={p} />
      </Canvas>
      <HudToggle open={hud.hudOpen} onToggle={hud.toggleHud} />
      {hud.hudOpen && <Overlay model={model} />}
      <CodeLineBadge step={step} />
      <StageProgressBar step={step} steps={steps} />
    </div>
  );
}
