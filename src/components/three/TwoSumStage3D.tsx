import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import {
  getTwoSumSceneModel,
  isTwoSumTraceStep,
  type TwoSumCell,
  type TwoSumSceneModel,
} from "../../engine/twoSumStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";
import { CodeLineBadge } from "./CodeLineBadge";
import { HudToggle, useStageHud } from "./StageHud";
import { StageProgressBar } from "./StageProgressBar";

export { isTwoSumTraceStep };

function gapForCount(count: number): number {
  if (count <= 6) return 0.98;
  if (count <= 10) return 0.8;
  return 0.66;
}

function tileWidthForCount(count: number): number {
  if (count <= 6) return 0.68;
  if (count <= 10) return 0.56;
  return 0.48;
}

function xForIndex(index: number, count: number): number {
  return (index - (count - 1) / 2) * gapForCount(count);
}

function colorForCell(cell: TwoSumCell, p: Theme3DPalette): string {
  if (cell.found) return p.verdant;
  if (cell.side === "left") return p.arcBright;
  if (cell.side === "right") return p.emberBright;
  if (cell.side === "both") return p.verdant;
  if (cell.eliminated) return p.barRange;
  return p.barDefault;
}

function NumberTile({
  cell,
  count,
  p,
}: {
  cell: TwoSumCell;
  count: number;
  p: Theme3DPalette;
}) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const mounted = useRef(false);
  const x = xForIndex(cell.index, count);
  const color = colorForCell(cell, p);
  const width = tileWidthForCount(count);
  const labelSize = count > 10 ? 34 : count > 8 ? 38 : 44;
  const fontSize = count > 10 ? 14 : count > 8 ? 16 : 18;

  useLayoutEffect(() => {
    if (!group.current || !mesh.current || mounted.current) return;
    group.current.position.set(x, cell.eliminated ? -0.08 : 0, 0);
    mounted.current = true;
  }, [cell.eliminated, x]);

  useFrame((_, delta) => {
    if (!group.current || !mesh.current) return;
    const t = 1 - Math.pow(0.0008, delta);
    const y = cell.found ? 0.24 : cell.active ? 0.16 : cell.eliminated ? -0.1 : 0;
    const z = cell.active || cell.found ? 0.1 : 0;
    const scale = cell.found ? 1.12 : cell.active ? 1.06 : cell.eliminated ? 0.88 : 0.96;

    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, x, t);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, y, t);
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, z, t);
    mesh.current.scale.setScalar(THREE.MathUtils.lerp(mesh.current.scale.x, scale, t));
  });

  return (
    <group ref={group}>
      <mesh ref={mesh}>
        <boxGeometry args={[width, 0.18, 0.66]} />
        <meshStandardMaterial
          color={p.emptyCell}
          emissive={color}
          emissiveIntensity={cell.found ? 0.94 : cell.active ? 0.78 : cell.eliminated ? 0.04 : 0.14}
          metalness={0.38}
          roughness={0.35}
          transparent
          opacity={cell.eliminated ? 0.42 : 0.9}
        />
        <Edges color={color} threshold={18} />
      </mesh>
      <Html position={[0, 0.05, 0.43]} center style={{ pointerEvents: "none" }}>
        <div
          className="grid place-items-center rounded-md border bg-ink-950/95 text-center font-mono font-black leading-none text-ink-50 shadow-xl backdrop-blur-md"
          style={{
            width: labelSize,
            height: labelSize,
            borderColor: color,
            color: cell.found ? "#d1fae5" : cell.eliminated ? "rgba(255,255,255,0.45)" : "#f8fafc",
            fontSize,
            textShadow: "0 2px 10px rgba(0,0,0,0.65)",
          }}
        >
          {cell.value}
        </div>
      </Html>
      <Html position={[0, -0.38, 0.1]} center style={{ pointerEvents: "none" }}>
        <div className="rounded border border-ink-700/70 bg-ink-950/86 px-1.5 py-0.5 font-mono text-[10px] font-black leading-none text-ink-400 shadow">
          {cell.index}
        </div>
      </Html>
    </group>
  );
}

function PointerMarker({
  label,
  index,
  count,
  color,
  above,
}: {
  label: string;
  index: number | null;
  count: number;
  color: string;
  above: boolean;
}) {
  if (index === null || index < 0 || index >= count) return null;
  const x = xForIndex(index, count);
  const y = above ? 0.78 : -0.78;
  const end = above ? 0.38 : -0.38;

  return (
    <group position={[x, 0, 0.08]}>
      <Line points={[[0, y, 0], [0, end, 0]]} color={color} lineWidth={2.2} />
      <mesh position={[0, end, 0]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.25} />
      </mesh>
      <Html position={[0, y + (above ? 0.24 : -0.24), 0.1]} center style={{ pointerEvents: "none" }}>
        <div
          className="rounded-md border bg-ink-950/95 px-2 py-1 font-mono text-[11px] font-black uppercase leading-none text-ink-50 shadow-xl backdrop-blur"
          style={{ borderColor: color }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}

function PairBridge({ model, p }: { model: TwoSumSceneModel; p: Theme3DPalette }) {
  if (model.l === null || model.r === null) return null;
  if (model.l < 0 || model.r < 0 || model.l >= model.values.length || model.r >= model.values.length) return null;

  const leftX = xForIndex(model.l, model.values.length);
  const rightX = xForIndex(model.r, model.values.length);
  const color = model.operation === "found"
    ? p.verdant
    : model.operation === "move-right"
      ? p.emberBright
      : model.operation === "not-found"
        ? "#ef4444"
        : p.arcBright;

  const points: [number, number, number][] = Array.from({ length: 28 }, (_, i) => {
    const t = i / 27;
    const x = THREE.MathUtils.lerp(leftX, rightX, t);
    const y = 0.56 + Math.sin(Math.PI * t) * 0.46;
    return [x, y, -0.04];
  });

  return (
    <group>
      <Line points={points} color={color} lineWidth={2.5} transparent opacity={0.92} />
      <mesh position={[leftX, 0.56, -0.04]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} />
      </mesh>
      <mesh position={[rightX, 0.56, -0.04]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} />
      </mesh>
    </group>
  );
}

function WindowFloor({ model, p }: { model: TwoSumSceneModel; p: Theme3DPalette }) {
  if (model.l === null || model.r === null || model.l > model.r) return null;
  const left = xForIndex(model.l, model.values.length);
  const right = xForIndex(model.r, model.values.length);
  const center = (left + right) / 2;
  const width = Math.max(tileWidthForCount(model.values.length) + 0.44, Math.abs(right - left) + tileWidthForCount(model.values.length) + 0.52);
  return (
    <mesh position={[center, -0.18, -0.24]}>
      <boxGeometry args={[width, 0.07, 1.22]} />
      <meshStandardMaterial color={p.arcDeep} emissive={p.arc} emissiveIntensity={0.14} transparent opacity={0.34} />
    </mesh>
  );
}

function Scene({ model, p }: { model: TwoSumSceneModel; p: Theme3DPalette }) {
  const scene = useRef<THREE.Group>(null);
  const stageWidth = Math.max(5.8, (model.values.length - 1) * gapForCount(model.values.length) + 1.8);

  useFrame(({ clock }) => {
    if (!scene.current) return;
    scene.current.rotation.y = Math.sin(clock.elapsedTime * 0.28) * 0.014;
  });

  return (
    <>
      <ambientLight intensity={0.74 * p.lighting.ambient} />
      <directionalLight position={[4, 7, 5]} intensity={1.35 * p.lighting.directional} />
      <pointLight position={[-2.4, 2.6, 3]} intensity={34 * p.lighting.accent} distance={11} color={p.arcBright} />
      <pointLight position={[2.4, 2.6, 3]} intensity={34 * p.lighting.accent} distance={11} color={p.emberBright} />

      <group ref={scene} position={[0, -0.18, 0]}>
        <mesh position={[0, -0.22, -0.3]}>
          <boxGeometry args={[stageWidth, 0.06, 1.28]} />
          <meshStandardMaterial color={p.emptyCell} transparent opacity={0.68} roughness={0.48} metalness={0.24} />
        </mesh>
        <WindowFloor model={model} p={p} />
        <PairBridge model={model} p={p} />
        {model.cells.map((cell) => (
          <NumberTile key={cell.index} cell={cell} count={model.values.length} p={p} />
        ))}
        {model.l === model.r ? (
          <PointerMarker label="L/R" index={model.l} count={model.values.length} color={p.verdant} above />
        ) : (
          <>
            <PointerMarker label="L" index={model.l} count={model.values.length} color={p.arcBright} above={false} />
            <PointerMarker label="R" index={model.r} count={model.values.length} color={p.emberBright} above />
          </>
        )}
      </group>

      <InfiniteGrid
        position={[0, -1.78, -0.18]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor={p.gridCell}
        sectionSize={2.5}
        sectionThickness={0.85}
        sectionColor={p.gridSection}
        fadeDistance={18}
        fadeStrength={1}
        infiniteGrid
      />

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={4.4}
        maxDistance={12}
        minPolarAngle={0.26}
        maxPolarAngle={Math.PI / 2.12}
      />
    </>
  );
}

function Overlay({ model }: { model: TwoSumSceneModel }) {
  const tone = model.operation === "found"
    ? "border-verdant-400/45 text-verdant-100"
    : model.operation === "move-right"
      ? "border-ember-400/45 text-ember-100"
      : "border-arc-400/45 text-arc-100";

  const stats = [
    ["window", model.windowLabel],
    ["target", model.target ?? "-"],
    ["sum", model.comparisonLabel],
    ["result", model.resultLabel],
  ] as const;

  return (
    <>
      <div className="pointer-events-none absolute left-2 right-11 top-2 z-10 flex items-start justify-between gap-2 sm:left-3 sm:right-12 sm:top-3">
        <div className="min-w-0 max-w-[15rem] rounded-md border border-arc-400/30 bg-ink-950/74 px-2.5 py-1.5 shadow-lg backdrop-blur-sm sm:max-w-[19rem]">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={"shrink-0 rounded border bg-ink-900/70 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-widest " + tone}>
              two-sum / {model.operation}
            </span>
            <span className="truncate font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
              sorted two pointers
            </span>
          </div>
          <p className="mt-1 text-[11px] font-black leading-tight text-ink-50 sm:text-xs">{model.headline}</p>
        </div>

        <div className="flex max-w-[18rem] flex-wrap justify-end gap-1 sm:max-w-[24rem]">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded border border-ink-700/65 bg-ink-950/74 px-1.5 py-1 text-center shadow-lg backdrop-blur-sm">
              <span className="block font-mono text-[8px] font-black uppercase tracking-widest text-ink-500">{label}</span>
              <span className="block max-w-[7.5rem] truncate font-mono text-[11px] font-black leading-tight text-ink-50">{String(value)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-2 left-28 right-2 z-10 flex flex-wrap items-end justify-between gap-2 sm:bottom-3 sm:left-36 sm:right-3">
        <p className="max-w-[28rem] rounded-md border border-arc-400/25 bg-ink-950/70 px-2 py-1.5 text-[10px] leading-snug text-ink-300 shadow-lg backdrop-blur-sm">
          {model.detail}
        </p>
        <div className="ml-auto flex flex-wrap justify-end gap-1">
          <span className="rounded border border-arc-400/35 bg-ink-950/72 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-arc-200 backdrop-blur">blue = L</span>
          <span className="rounded border border-ember-400/35 bg-ink-950/72 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-ember-200 backdrop-blur">orange = R</span>
          <span className="rounded border border-verdant-400/35 bg-ink-950/72 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-verdant-200 backdrop-blur">green = answer</span>
        </div>
      </div>
    </>
  );
}

export function TwoSumStage3D({ step, steps }: { step: TraceStep; steps?: TraceStep[] }) {
  const p = useTheme3D();
  const model = useMemo(() => getTwoSumSceneModel(step), [step]);
  const hud = useStageHud();

  if (!model) return null;

  const cameraZ = Math.max(5.8, model.values.length * 0.58 + 4.1);

  return (
    <div className="codeanvil-canvas-fill relative h-full w-full overflow-hidden rounded-md @container">
      <Canvas
        dpr={[1.25, 2]}
        camera={{ position: [0, 2.05, cameraZ], fov: 36 }}
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
