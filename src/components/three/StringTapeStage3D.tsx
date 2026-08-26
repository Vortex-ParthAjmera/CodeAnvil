import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import {
  getStringTapeSceneModel,
  isStringTapeTraceStep,
  type StringTapeCell,
  type StringTapeSceneModel,
} from "../../engine/stringStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";
import { CodeLineBadge } from "./CodeLineBadge";
import { HudToggle, useStageHud } from "./StageHud";
import { StageProgressBar } from "./StageProgressBar";

export { isStringTapeTraceStep };

function gapForCount(count: number): number {
  if (count <= 7) return 0.94;
  if (count <= 10) return 0.78;
  return 0.64;
}

function tileWidthForCount(count: number): number {
  if (count <= 7) return 0.64;
  if (count <= 10) return 0.56;
  return 0.48;
}

function xForIndex(index: number, count: number): number {
  return (index - (count - 1) / 2) * gapForCount(count);
}

function colorForCell(cell: StringTapeCell, p: Theme3DPalette): string {
  if (cell.mismatch) return "#ef4444";
  if (cell.locked) return p.verdant;
  if (cell.side === "left") return p.arcBright;
  if (cell.side === "right") return p.emberBright;
  if (cell.side === "both") return p.verdant;
  return p.barDefault;
}

function TapeTile({
  cell,
  count,
  p,
}: {
  cell: StringTapeCell;
  count: number;
  p: Theme3DPalette;
}) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const mounted = useRef(false);
  const x = xForIndex(cell.index, count);
  const color = colorForCell(cell, p);
  const width = tileWidthForCount(count);
  const labelSize = count > 10 ? 32 : count > 8 ? 36 : 42;
  const fontSize = count > 10 ? 16 : count > 8 ? 18 : 21;

  useLayoutEffect(() => {
    if (!group.current || mounted.current) return;
    group.current.position.set(x, 0, 0);
    mounted.current = true;
  }, [x]);

  useFrame((_, delta) => {
    if (!group.current || !mesh.current) return;
    const t = 1 - Math.pow(0.0008, delta);
    const y = cell.active ? 0.2 : cell.locked ? 0.06 : 0;
    const z = cell.active ? 0.1 : 0;
    const scale = cell.active ? 1.08 : cell.locked ? 1 : 0.94;

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
          color={cell.locked ? p.emptyCell : p.emptyCell}
          emissive={color}
          emissiveIntensity={cell.active ? 0.86 : cell.locked ? 0.42 : 0.1}
          metalness={0.38}
          roughness={0.35}
          transparent
          opacity={cell.locked ? 0.94 : 0.86}
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
            color: cell.mismatch ? "#fecaca" : cell.locked ? "#d1fae5" : "#f8fafc",
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

function MirrorBridge({ model, p }: { model: StringTapeSceneModel; p: Theme3DPalette }) {
  if (model.l === null || model.r === null) return null;
  if (model.l < 0 || model.r < 0 || model.l >= model.chars.length || model.r >= model.chars.length) return null;

  const leftX = xForIndex(model.l, model.chars.length);
  const rightX = xForIndex(model.r, model.chars.length);
  const color = model.outcome === "false" ? "#ef4444" : model.operation === "match" || model.operation === "complete" ? p.verdant : p.arcBright;

  if (model.l === model.r) {
    return (
      <mesh position={[leftX, 0.56, 0]}>
        <torusGeometry args={[0.28, 0.018, 10, 42]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.95} transparent opacity={0.86} />
      </mesh>
    );
  }

  const points: [number, number, number][] = Array.from({ length: 28 }, (_, i) => {
    const t = i / 27;
    const x = THREE.MathUtils.lerp(leftX, rightX, t);
    const y = 0.52 + Math.sin(Math.PI * t) * 0.48;
    return [x, y, -0.04];
  });

  return (
    <group>
      <Line points={points} color={color} lineWidth={2.4} transparent opacity={0.9} />
      <mesh position={[leftX, 0.52, -0.04]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} />
      </mesh>
      <mesh position={[rightX, 0.52, -0.04]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} />
      </mesh>
    </group>
  );
}

function Scene({ model, p }: { model: StringTapeSceneModel; p: Theme3DPalette }) {
  const scene = useRef<THREE.Group>(null);
  const stageWidth = Math.max(5.6, (model.chars.length - 1) * gapForCount(model.chars.length) + 1.7);

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
        <mesh position={[0, -0.18, -0.24]}>
          <boxGeometry args={[stageWidth, 0.06, 1.22]} />
          <meshStandardMaterial color={p.emptyCell} transparent opacity={0.68} roughness={0.48} metalness={0.24} />
        </mesh>
        <MirrorBridge model={model} p={p} />
        {model.cells.map((cell) => (
          <TapeTile key={cell.index} cell={cell} count={model.chars.length} p={p} />
        ))}
        {model.l === model.r ? (
          <PointerMarker label="L/R" index={model.l} count={model.chars.length} color={p.verdant} above />
        ) : (
          <>
            <PointerMarker label="L" index={model.l} count={model.chars.length} color={p.arcBright} above={false} />
            <PointerMarker label="R" index={model.r} count={model.chars.length} color={p.emberBright} above />
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

function Overlay({ model }: { model: StringTapeSceneModel }) {
  const outcomeClass = model.outcome === "true"
    ? "border-verdant-400/45 text-verdant-100"
    : model.outcome === "false"
      ? "border-red-400/45 text-red-100"
      : "border-arc-400/45 text-arc-100";

  const stats = [
    ["window", model.windowLabel],
    ["pair", model.pairLabel],
    ["checks", model.comparisons ?? 0],
    ["result", model.resultLabel],
  ] as const;

  return (
    <>
      <div className="pointer-events-none absolute left-2 right-11 top-2 z-10 flex items-start justify-between gap-2 sm:left-3 sm:right-12 sm:top-3">
        <div className="min-w-0 max-w-[15rem] rounded-md border border-arc-400/30 bg-ink-950/74 px-2.5 py-1.5 shadow-lg backdrop-blur-sm sm:max-w-[19rem]">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={"shrink-0 rounded border bg-ink-900/70 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-widest " + outcomeClass}>
              {model.operation}
            </span>
            <span className="truncate font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
              palindrome tape
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
          <span className="rounded border border-verdant-400/35 bg-ink-950/72 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-verdant-200 backdrop-blur">green = safe</span>
        </div>
      </div>
    </>
  );
}

export function StringTapeStage3D({ step, steps }: { step: TraceStep; steps?: TraceStep[] }) {
  const p = useTheme3D();
  const model = useMemo(() => getStringTapeSceneModel(step), [step]);
  const hud = useStageHud();

  if (!model) return null;

  const cameraZ = Math.max(5.6, model.chars.length * 0.58 + 3.9);

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
