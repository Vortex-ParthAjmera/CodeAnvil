import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import {
  getFactorialRecursionSceneModel,
  type FactorialFrame,
  type FactorialRecursionSceneModel,
} from "../../engine/recursionStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";

const FRAME_GAP = 0.76;
const FRAME_WIDTH = 4.45;
const FRAME_HEIGHT = 0.48;
const FRAME_DEPTH = 0.54;

function yForDepth(depth: number): number {
  return -depth * FRAME_GAP;
}

function colorForFrame(frame: FactorialFrame, p: Theme3DPalette): string {
  if (frame.active) return p.emberBright;
  if (frame.status === "returned") return p.verdant;
  return p.arc;
}

function expressionForFrame(frame: FactorialFrame): string {
  if (frame.n <= 1) return "return 1";
  return `${frame.n} x fact(${frame.n - 1})`;
}

function FrameBlock({
  frame,
  p,
  firstStep,
  onScrub,
}: {
  frame: FactorialFrame;
  p: Theme3DPalette;
  firstStep?: number;
  onScrub?: (index: number) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const mounted = useRef(false);
  const color = colorForFrame(frame, p);
  const target = new THREE.Vector3(0, yForDepth(frame.depth), 0);
  const clickable = firstStep !== undefined && onScrub !== undefined;
  const handleClick = clickable
    ? () => {
        if (firstStep !== undefined) onScrub?.(firstStep);
      }
    : undefined;

  useLayoutEffect(() => {
    if (!group.current || mounted.current) return;
    group.current.position.set(target.x, target.y + 0.28, target.z);
    mounted.current = true;
  }, [target.x, target.y, target.z]);

  useFrame(({ clock }, delta) => {
    if (!group.current || !mesh.current) return;
    const t = 1 - Math.pow(0.0007, delta);
    const hover = frame.active ? Math.sin(clock.elapsedTime * 5) * 0.025 : 0;
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, target.x, t);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, target.y + hover, t);
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, target.z, t);
    const scale = frame.active ? 1.025 : frame.status === "returned" ? 0.985 : 1;
    mesh.current.scale.x = THREE.MathUtils.lerp(mesh.current.scale.x, scale, t);
  });

  return (
    <group ref={group} onClick={handleClick}>
      <mesh ref={mesh}>
        <boxGeometry args={[FRAME_WIDTH, FRAME_HEIGHT, FRAME_DEPTH]} />
        <meshStandardMaterial
          color={frame.status === "returned" ? p.verdantDeep : p.emptyCell}
          emissive={color}
          emissiveIntensity={frame.active ? 0.62 : frame.status === "returned" ? 0.34 : 0.16}
          metalness={0.46}
          roughness={0.34}
          transparent
          opacity={frame.status === "waiting" ? 0.72 : 0.94}
        />
        <Edges color={color} threshold={18} />
      </mesh>
      <Html position={[0, 0.03, 0.32]} center style={{ pointerEvents: clickable ? "auto" : "none" }}>
        <div
          className="grid min-w-[12rem] grid-cols-[1fr_auto] items-center gap-3 rounded-md border bg-ink-950/90 px-2.5 py-1 font-mono shadow-xl backdrop-blur"
          style={{ borderColor: color, cursor: clickable ? "pointer" : "default" }}
        >
          <div>
            <p className="text-xs font-black leading-none text-ink-50">{frame.label}</p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-ink-500">
              {frame.status === "returned" ? "resolved" : frame.active ? "running" : "waiting"}
            </p>
          </div>
          <p className="max-w-[9rem] truncate rounded border border-ink-700/70 bg-ink-900/70 px-2 py-1 text-center text-[11px] font-black text-ink-100">
            {frame.returnValue !== undefined ? `returns ${frame.returnValue}` : expressionForFrame(frame)}
          </p>
        </div>
      </Html>
    </group>
  );
}

function MovingPacket({
  model,
  p,
}: {
  model: FactorialRecursionSceneModel;
  p: Theme3DPalette;
}) {
  const group = useRef<THREE.Group>(null);
  const returning = model.operation === "return";
  const frame = returning ? model.returningFrame : model.activeFrame;
  const x = returning ? 2.78 : -2.78;
  const baseY = frame ? yForDepth(frame.depth) : 0;
  const color = returning ? p.verdant : p.emberBright;
  const label = frame
    ? returning
      ? `return ${frame.returnValue ?? ""}`.trim()
      : frame.n > 1
        ? `call fact(${frame.n - 1})`
        : "base case"
    : "";

  useFrame(({ clock }) => {
    if (!group.current || !frame) return;
    const travel = Math.sin(clock.elapsedTime * 2.6) * 0.16;
    group.current.position.y = baseY + (returning ? -travel : travel);
    group.current.rotation.z = Math.sin(clock.elapsedTime * 3) * 0.025;
  });

  if (!frame) return null;

  return (
    <group ref={group} position={[x, baseY, 0]}>
      <mesh>
        <boxGeometry args={[1.22, 0.42, 0.34]} />
        <meshStandardMaterial color={p.emptyCell} emissive={color} emissiveIntensity={0.75} metalness={0.42} roughness={0.28} />
        <Edges color={color} threshold={20} />
      </mesh>
      <Html position={[0, 0, 0.24]} center style={{ pointerEvents: "none" }}>
        <div
          className="whitespace-nowrap rounded border bg-ink-950/94 px-2 py-1 font-mono text-[11px] font-black leading-none text-ink-50 shadow-xl"
          style={{ borderColor: color }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}

function Rails({ model, p }: { model: FactorialRecursionSceneModel; p: Theme3DPalette }) {
  const lastY = yForDepth(Math.max(1, ...model.frames.map((frame) => frame.depth))) - 0.3;
  const topY = 0.48;
  return (
    <group>
      <Line points={[[-2.78, topY, -0.08], [-2.78, lastY, -0.08]]} color={p.emberBright} lineWidth={2} transparent opacity={0.85} />
      <Line points={[[2.78, lastY, -0.08], [2.78, topY, -0.08]]} color={p.verdant} lineWidth={2} transparent opacity={0.85} />
      <Html position={[-2.78, topY + 0.2, 0]} center style={{ pointerEvents: "none" }}>
        <div className="rounded border border-ember-400/45 bg-ink-950/88 px-2 py-1 font-mono text-[10px] font-black uppercase text-ember-200">
          calls go down
        </div>
      </Html>
      <Html position={[2.78, topY + 0.2, 0]} center style={{ pointerEvents: "none" }}>
        <div className="rounded border border-verdant-400/45 bg-ink-950/88 px-2 py-1 font-mono text-[10px] font-black uppercase text-verdant-200">
          values return up
        </div>
      </Html>
    </group>
  );
}

function MultiplicationBoard({ model, p }: { model: FactorialRecursionSceneModel; p: Theme3DPalette }) {
  const frame = model.returningFrame ?? model.activeFrame ?? null;
  const value = frame?.returnValue;
  const formula =
    model.operation === "return" && frame && value !== undefined && frame.n > 1
      ? `${frame.n} x fact(${frame.n - 1}) = ${value}`
      : frame
        ? expressionForFrame(frame)
        : "fact(n)";

  return (
    <group position={[0, 0.94, 0]}>
      <mesh>
        <boxGeometry args={[4.7, 0.46, 0.38]} />
        <meshStandardMaterial color={p.emptyCell} emissive={p.arc} emissiveIntensity={0.22} transparent opacity={0.82} />
        <Edges color={p.arcBright} threshold={20} />
      </mesh>
      <Html position={[0, 0, 0.26]} center style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-md border border-arc-400/45 bg-ink-950/92 px-3 py-1.5 font-mono text-sm font-black text-ink-50 shadow-xl">
          {formula}
        </div>
      </Html>
    </group>
  );
}

function Scene({
  model,
  p,
  stepByNode,
  onScrub,
}: {
  model: FactorialRecursionSceneModel;
  p: Theme3DPalette;
  stepByNode: Map<string, number>;
  onScrub?: (index: number) => void;
}) {
  const groupY = Math.min(1.05, 0.55 + model.depth * 0.05);
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.35) * 0.025;
  });

  return (
    <>
      <ambientLight intensity={0.7 * p.lighting.ambient} />
      <directionalLight position={[4, 7, 5]} intensity={1.45 * p.lighting.directional} />
      <pointLight position={[-3, 2.4, 3]} intensity={36 * p.lighting.accent} distance={12} color={p.emberBright} />
      <pointLight position={[3, 1.4, 3]} intensity={34 * p.lighting.accent} distance={12} color={p.verdant} />

      <group ref={group} position={[0, groupY, 0]}>
        <MultiplicationBoard model={model} p={p} />
        <Rails model={model} p={p} />
        {model.frames.map((frame) => (
          <FrameBlock
            key={frame.id}
            frame={frame}
            p={p}
            firstStep={stepByNode.get(frame.id)}
            onScrub={onScrub}
          />
        ))}
        <MovingPacket model={model} p={p} />
      </group>

      <InfiniteGrid
        position={[0, -3.2, -0.2]}
        cellSize={0.5}
        cellThickness={0.55}
        cellColor={p.gridCell}
        sectionSize={2.5}
        sectionThickness={0.9}
        sectionColor={p.gridSection}
        fadeDistance={20}
        fadeStrength={1}
        infiniteGrid
      />

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={5.2}
        maxDistance={12}
        minPolarAngle={0.32}
        maxPolarAngle={Math.PI / 2.08}
      />
    </>
  );
}

function Overlay({ model }: { model: FactorialRecursionSceneModel }) {
  return (
    <>
      {/* Compact strip HUD (same pattern as the sort stages): headline card
          left, stat chips right — thin enough that the frame stack below is
          never covered on short or narrow stages. */}
      <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex items-start justify-between gap-2 sm:inset-x-3 sm:top-3">
        <div className="min-w-0 max-w-[13rem] rounded-md border border-arc-400/30 bg-ink-950/72 px-2.5 py-1.5 shadow-lg backdrop-blur-sm sm:max-w-[19rem]">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 rounded border border-ember-400/35 bg-ember-500/10 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-widest text-ember-200">
              {model.operation}
            </span>
            <span className="truncate font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
              line {model.line}
            </span>
          </div>
          <p className="mt-1 truncate text-[11px] font-black leading-tight text-ink-50 sm:text-xs">
            {model.headline}
          </p>
        </div>

        <div className="flex max-w-[16rem] flex-wrap justify-end gap-1 sm:max-w-[21rem]">
          <div className="rounded border border-ink-700/65 bg-ink-950/72 px-1.5 py-1 text-center shadow-lg backdrop-blur-sm">
            <span className="block font-mono text-[8px] font-black uppercase tracking-widest text-ink-500">depth</span>
            <span className="block font-mono text-[11px] font-black leading-tight text-ink-50">{Math.max(0, model.depth + 1)}</span>
          </div>
          <div className="rounded border border-ink-700/65 bg-ink-950/72 px-1.5 py-1 text-center shadow-lg backdrop-blur-sm">
            <span className="block font-mono text-[8px] font-black uppercase tracking-widest text-ink-500">returns</span>
            <span className="block font-mono text-[11px] font-black leading-tight text-verdant-200">{model.returnedCount}</span>
          </div>
          <div className="rounded border border-ink-700/65 bg-ink-950/72 px-1.5 py-1 text-center shadow-lg backdrop-blur-sm">
            <span className="block font-mono text-[8px] font-black uppercase tracking-widest text-ink-500">out</span>
            <span className="block max-w-[5.5rem] truncate font-mono text-[11px] font-black leading-tight text-arc-100">{model.output || "-"}</span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex items-end justify-between gap-2 sm:inset-x-3 sm:bottom-3">
        <p className="hidden max-w-[24rem] rounded-md border border-arc-400/25 bg-ink-950/68 px-2 py-1.5 text-[10px] leading-snug text-ink-300 shadow-lg backdrop-blur-sm sm:block">
          {model.detail}
        </p>
        <div className="ml-auto flex flex-wrap justify-end gap-1">
          <span className="rounded border border-ember-400/35 bg-ink-950/72 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-ember-200 backdrop-blur">push frame</span>
          <span className="rounded border border-arc-400/35 bg-ink-950/72 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-arc-200 backdrop-blur">wait for child</span>
          <span className="rounded border border-verdant-400/35 bg-ink-950/72 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-verdant-200 backdrop-blur">return value</span>
        </div>
      </div>
    </>
  );
}

function stepMap(steps: TraceStep[]): Map<string, number> {
  const map = new Map<string, number>();
  steps.forEach((step, index) => {
    if (step.visual?.type !== "recursion_tree") return;
    step.visual.nodes.forEach((node) => {
      if (!map.has(node.id)) map.set(node.id, index);
    });
  });
  return map;
}

export function FactorialRecursionStage3D({
  step,
  steps = [],
  onScrub,
}: {
  step: TraceStep;
  steps?: TraceStep[];
  onScrub?: (index: number) => void;
}) {
  const p = useTheme3D();
  const model = getFactorialRecursionSceneModel(step);
  const stepByNode = useMemo(() => stepMap(steps), [steps]);

  if (!model) return null;

  return (
    <div className="codeanvil-canvas-fill relative h-full min-h-[24rem] w-full overflow-hidden rounded-md">
      <Canvas
        dpr={[1.25, 2]}
        camera={{ position: [0, 2.15, 7.4], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <CanvasSizeSync />
        <Scene model={model} p={p} stepByNode={stepByNode} onScrub={onScrub} />
      </Canvas>
      <Overlay model={model} />
    </div>
  );
}
