import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import { getRotateArraySceneModel, type RotateArraySceneModel, type RotateArrayTokenModel } from "../../engine/rotateArrayStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";
import { CodeLineBadge } from "./CodeLineBadge";
import { HudToggle, useStageHud } from "./StageHud";
import { StageProgressBar } from "./StageProgressBar";

const MOVE_COLOR = "#22d3ee";
const RANGE_COLOR = "#a78bfa";
const SWAP_COLOR = "#fb923c";
const DONE_COLOR = "#34d399";
const INVALID_COLOR = "#f43f5e";

function radiusFor(count: number): number {
  return Math.max(1.72, Math.min(2.48, count * 0.33));
}

function slotPosition(index: number, count: number, radius = radiusFor(count)): THREE.Vector3 {
  const angle = Math.PI / 2 - (index / Math.max(1, count)) * Math.PI * 2;
  return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius * 0.54);
}

function roleColor(role: RotateArrayTokenModel["role"], p: Theme3DPalette): string {
  if (role === "invalid") return INVALID_COLOR;
  if (role === "swap") return SWAP_COLOR;
  if (role === "range") return RANGE_COLOR;
  if (role === "moved-group") return MOVE_COLOR;
  if (role === "complete") return DONE_COLOR;
  return p.barDefault;
}

function CameraRig({ count }: { count: number }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const compact = useThree((state) => state.size.width < 560);
  useLayoutEffect(() => {
    const radius = radiusFor(count);
    camera.position.set(
      0,
      compact ? Math.max(5.5, radius * 2.35) : Math.max(4.15, radius * 1.85),
      compact ? Math.max(7.8, radius * 3.35) : Math.max(5.9, radius * 2.75),
    );
    camera.lookAt(0, 0.05, 0);
  }, [camera, compact, count]);
  return null;
}

function Track({ count, p }: { count: number; p: Theme3DPalette }) {
  const radius = radiusFor(count);
  const points = useMemo(() => Array.from({ length: 97 }, (_, index) => {
    const angle = Math.PI / 2 - (index / 96) * Math.PI * 2;
    return [Math.cos(angle) * radius, -0.17, Math.sin(angle) * radius * 0.54] as [number, number, number];
  }), [radius]);
  return (
    <group>
      <Line points={points} color={p.gridSection} lineWidth={3.1} transparent opacity={0.78} />
      <Line points={points.map(([x, y, z]) => [x * 1.08, y - 0.02, z * 1.08] as [number, number, number])} color={MOVE_COLOR} lineWidth={1.1} transparent opacity={0.24} />
      {Array.from({ length: count }, (_, index) => {
        const position = slotPosition(index, count);
        return (
          <group key={`slot-${index}`} position={[position.x, -0.18, position.z]}>
            <mesh>
              <cylinderGeometry args={[0.35, 0.35, 0.07, 28]} />
              <meshStandardMaterial color={p.emptyCell} emissive={p.gridSection} emissiveIntensity={0.08} metalness={0.46} roughness={0.4} />
              <Edges color={p.gridSection} threshold={18} />
            </mesh>
            <Html position={[0, -0.31, 0.1]} center style={{ pointerEvents: "none" }}>
              <div data-rotate-slot={index} className="rounded border border-ink-700/65 bg-ink-950/94 px-1.5 py-0.5 font-mono text-[7px] font-black leading-none text-ink-400">i={index}</div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function RotationToken({ token, count, p, reduced, showMapping }: { token: RotateArrayTokenModel; count: number; p: Theme3DPalette; reduced: boolean; showMapping: boolean }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const color = roleColor(token.role, p);
  const targetColor = useMemo(() => new THREE.Color(color), [color]);
  const slot = slotPosition(token.index, count);
  const active = token.role === "swap" || token.role === "range";
  const targetY = active ? 0.35 : 0.05;

  useLayoutEffect(() => {
    group.current?.position.set(slot.x, targetY, slot.z);
  }, []);

  useFrame(({ clock }, delta) => {
    if (!group.current || !body.current || !material.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00045, delta);
    const bob = !reduced && token.role === "swap" ? Math.sin(clock.elapsedTime * 4 + token.originalIndex) * 0.045 : 0;
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, slot.x, amount);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, targetY + bob, amount);
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, slot.z, amount);
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, -Math.atan2(slot.x, slot.z), amount);
    const scale = token.role === "swap" ? 1.15 : token.role === "complete" ? 1.05 : 1;
    body.current.scale.setScalar(THREE.MathUtils.lerp(body.current.scale.x, scale, amount));
    material.current.color.lerp(targetColor, amount);
    material.current.emissive.lerp(targetColor, amount);
    material.current.emissiveIntensity = THREE.MathUtils.lerp(material.current.emissiveIntensity, active ? 0.8 : token.role === "complete" ? 0.42 : 0.12, amount);
  });

  return (
    <group ref={group} position={[slot.x, targetY, slot.z]}>
      <mesh ref={body} castShadow receiveShadow>
        <boxGeometry args={[0.58, 0.42, 0.58]} />
        <meshStandardMaterial ref={material} color={color} emissive={color} emissiveIntensity={active ? 0.8 : 0.12} metalness={0.5} roughness={0.25} />
        <Edges color={active ? p.textStrong : color} threshold={18} />
      </mesh>
      <Html position={[0, 0.03, 0.34]} center style={{ pointerEvents: "none" }}>
        <div data-rotate-token={token.id} className="stage-value-card" style={{ borderColor: color }}>{token.value}</div>
      </Html>
      {showMapping ? (
        <Html position={[0, 0.43, 0.18]} center style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded border bg-ink-950/95 px-1.5 py-0.5 font-mono text-[7px] font-black shadow-lg" style={{ borderColor: color, color }}>{token.originalIndex} -&gt; {token.destination}</div>
        </Html>
      ) : null}
    </group>
  );
}

function DirectionPulse({ count, shift, reduced }: { count: number; shift: number; reduced: boolean }) {
  const pulse = useRef<THREE.Mesh>(null);
  const radius = radiusFor(count) * 1.08;
  useFrame(({ clock }) => {
    if (!pulse.current) return;
    const t = reduced ? 0.18 : (clock.elapsedTime * 0.09 + shift / Math.max(1, count)) % 1;
    const angle = Math.PI / 2 - t * Math.PI * 2;
    pulse.current.position.set(Math.cos(angle) * radius, -0.14, Math.sin(angle) * radius * 0.54);
  });
  return <mesh ref={pulse}><sphereGeometry args={[0.07, 16, 16]} /><meshStandardMaterial color={MOVE_COLOR} emissive={MOVE_COLOR} emissiveIntensity={1.8} /></mesh>;
}

function ActiveRange({ model }: { model: RotateArraySceneModel }) {
  if (!model.activeRange || model.values.length < 2) return null;
  const points = [];
  for (let index = model.activeRange[0]; index <= model.activeRange[1]; index += 1) {
    const p = slotPosition(index, model.values.length, radiusFor(model.values.length) * 0.83);
    points.push([p.x, 0.02, p.z] as [number, number, number]);
  }
  if (points.length < 2) return null;
  return <Line points={points} color={RANGE_COLOR} lineWidth={4} transparent opacity={0.72} />;
}

function SwapBridge({ model, reduced }: { model: RotateArraySceneModel; reduced: boolean }) {
  const pulse = useRef<THREE.Mesh>(null);
  const pair = model.activePair;
  const count = model.values.length;
  const a = pair ? slotPosition(pair[0], count) : new THREE.Vector3();
  const b = pair ? slotPosition(pair[1], count) : new THREE.Vector3();
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(a.x, 0.36, a.z),
    new THREE.Vector3((a.x + b.x) / 2, 1.1, (a.z + b.z) / 2 + 0.25),
    new THREE.Vector3(b.x, 0.36, b.z),
  ]), [a.x, a.z, b.x, b.z]);
  useFrame(({ clock }) => {
    if (!pair || !pulse.current) return;
    pulse.current.position.copy(curve.getPointAt(reduced ? 0.64 : (clock.elapsedTime * 0.42) % 1));
  });
  if (!pair) return null;
  return (
    <group>
      <Line points={curve.getPoints(48)} color={SWAP_COLOR} lineWidth={2.5} transparent opacity={0.86} />
      <mesh ref={pulse}><sphereGeometry args={[0.065, 14, 14]} /><meshStandardMaterial color={SWAP_COLOR} emissive={SWAP_COLOR} emissiveIntensity={1.7} /></mesh>
    </group>
  );
}

function RotationCore({ model, reduced }: { model: RotateArraySceneModel; reduced: boolean }) {
  const rings = useRef<THREE.Group>(null);
  const color = model.operation === "invalid" ? INVALID_COLOR : model.operation === "complete" ? DONE_COLOR : model.operation.startsWith("reverse") ? RANGE_COLOR : MOVE_COLOR;
  useFrame(({ clock }, delta) => {
    if (!rings.current) return;
    rings.current.rotation.y += reduced ? 0 : delta * 0.24;
    rings.current.scale.setScalar(!reduced && model.activePair ? 1 + Math.sin(clock.elapsedTime * 3.5) * 0.035 : 1);
  });
  return (
    <group position={[0, 0.15, 0]}>
      <group ref={rings}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.66, 0.05, 16, 72]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.05} metalness={0.52} roughness={0.22} /></mesh>
        <mesh rotation={[Math.PI / 2, 0, Math.PI / 4]}><torusGeometry args={[0.86, 0.014, 12, 64]} /><meshBasicMaterial color={color} transparent opacity={0.34} /></mesh>
      </group>
      <Html position={[0, 0.05, 0.28]} center style={{ pointerEvents: "none" }}>
        <div className="min-w-28 rounded-md border bg-ink-950/96 px-2.5 py-1.5 text-center shadow-xl" style={{ borderColor: color }}>
          <span className="block font-mono text-[7px] font-black uppercase text-ink-400">right rotation</span>
          <span data-testid="rotate-core" className="mt-0.5 block font-mono text-[13px] font-black tabular-nums" style={{ color }}>k = {model.normalizedShift}</span>
          <span className="mt-1 block font-mono text-[7px] font-bold uppercase text-ink-400">{model.actionLabel}</span>
        </div>
      </Html>
    </group>
  );
}

function Scene({ model, p, reduced }: { model: RotateArraySceneModel; p: Theme3DPalette; reduced: boolean }) {
  const count = Math.max(1, model.values.length);
  const radius = radiusFor(count);
  const showMapping = model.operation === "normalize" || model.operation === "complete";
  return (
    <>
      <CameraRig count={count} />
      <fog attach="fog" args={[p.background, 12, 26]} />
      <ambientLight intensity={0.7 * p.lighting.ambient} />
      <directionalLight castShadow position={[5, 8, 5]} intensity={1.45 * p.lighting.directional} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-3, 2, 3]} intensity={23 * p.lighting.accent} distance={10} color={RANGE_COLOR} />
      <pointLight position={[3, 2, 3]} intensity={25 * p.lighting.accent} distance={10} color={MOVE_COLOR} />
      <Track count={count} p={p} />
      <ActiveRange model={model} />
      <DirectionPulse count={count} shift={model.normalizedShift} reduced={reduced} />
      {model.tokens.map((token) => <RotationToken key={token.id} token={token} count={count} p={p} reduced={reduced} showMapping={showMapping} />)}
      <SwapBridge model={model} reduced={reduced} />
      <RotationCore model={model} reduced={reduced} />
      <InfiniteGrid position={[0, -0.48, 0]} cellSize={0.48} cellThickness={0.5} cellColor={p.gridCell} sectionSize={2.4} sectionThickness={0.88} sectionColor={p.gridSection} fadeDistance={23} fadeStrength={1} infiniteGrid />
      <OrbitControls enablePan={false} enableRotate enableZoom enableDamping dampingFactor={0.08} rotateSpeed={0.72} zoomSpeed={0.85} target={[0, 0.05, 0]} minDistance={4.8} maxDistance={18} minPolarAngle={0.3} maxPolarAngle={Math.PI / 2.02} />
      <mesh position={[0, -0.28, 0]} receiveShadow><cylinderGeometry args={[radius + 0.7, radius + 0.82, 0.12, 64]} /><meshStandardMaterial color={p.emptyCell} transparent opacity={0.38} metalness={0.45} roughness={0.42} /></mesh>
    </>
  );
}

function Overlay({ model }: { model: RotateArraySceneModel }) {
  const tone = model.operation === "invalid" ? "border-red-400/45 text-red-300" : model.operation === "complete" ? "border-emerald-400/45 text-emerald-200" : model.operation.startsWith("reverse") ? "border-purple-400/45 text-purple-200" : "border-cyan-400/45 text-cyan-200";
  return (
    <>
      <div className="pointer-events-none absolute left-2 top-2 z-10 max-w-[14rem] rounded-md border border-cyan-400/30 bg-ink-950/88 px-2.5 py-1.5 shadow-xl backdrop-blur-md sm:left-3 sm:top-3 sm:max-w-[21rem]">
        <div className="flex items-center gap-1.5"><span className={`rounded border bg-ink-900/70 px-1.5 py-0.5 font-mono text-[8px] font-black uppercase ${tone}`}>rotate / {model.operation}</span><span className="font-mono text-[8px] font-semibold uppercase text-ink-500">in-place · O(n)</span></div>
        <p data-testid="rotate-array-headline" className="mt-1 text-xs font-black leading-tight text-ink-50 sm:text-[13px]">{model.headline}</p>
      </div>
      <div className="stage-hud-secondary rotate-array-equation pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 items-center rounded-md border border-ink-700/70 bg-ink-950/90 px-3 py-2 shadow-xl backdrop-blur-md"><span className="max-w-80 truncate font-mono text-[11px] font-black tabular-nums text-ink-50">{model.equation}</span></div>
      <div className="stage-hud-secondary pointer-events-none absolute right-11 top-3 z-10 justify-end gap-1">
        {[["raw k", model.shift], ["turns", model.normalizedShift], ["phase", `${model.completedPhases}/3`], ["swaps", model.swaps]].map(([label, value]) => <div key={label} className="min-w-10 rounded border border-ink-700/65 bg-ink-950/86 px-1.5 py-1 text-center shadow-lg backdrop-blur-md"><span className="block font-mono text-[7px] font-black uppercase text-ink-500">{label}</span><span className="block font-mono text-[10px] font-black leading-tight text-ink-50">{value}</span></div>)}
      </div>
      <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 z-10 flex items-end justify-between gap-2 sm:left-4 sm:right-4">
        <p data-testid="rotate-array-detail" className="max-w-[40rem] rounded-md border border-cyan-400/25 bg-ink-950/88 px-2.5 py-1.5 text-[11px] leading-snug text-ink-200 shadow-xl backdrop-blur-md">{model.detail}</p>
        <div className="stage-hud-legend ml-auto flex-wrap justify-end gap-1"><span className="rounded border border-cyan-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-cyan-200">cyan moved group</span><span className="rounded border border-purple-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-purple-200">violet range</span><span className="rounded border border-orange-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-orange-200">orange swap</span></div>
      </div>
    </>
  );
}

export function RotateArrayStage3D({ step, steps }: { step: TraceStep; steps?: TraceStep[] }) {
  const model = getRotateArraySceneModel(step);
  const p = useTheme3D();
  const reduced = Boolean(useReducedMotion());
  const hud = useStageHud();
  if (!model) return null;
  return (
    <div className="codeanvil-canvas-fill codeanvil-stage-frame relative h-full w-full overflow-hidden rounded-md @container">
      <Canvas shadows="basic" dpr={[1.25, 2]} data-testid="rotate-array-stage-canvas" camera={{ position: [0, 6, 8.6], fov: 43 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} style={{ width: "100%", height: "100%", background: "transparent" }}>
        <CanvasSizeSync /><Scene model={model} p={p} reduced={reduced} />
      </Canvas>
      <HudToggle open={hud.hudOpen} onToggle={hud.toggleHud} />
      {hud.hudOpen ? <Overlay model={model} /> : null}
      <div className="rotate-array-line-badge"><CodeLineBadge step={step} /></div>
      <StageProgressBar step={step} steps={steps} />
    </div>
  );
}
