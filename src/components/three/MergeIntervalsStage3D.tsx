import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import { getMergeIntervalsSceneModel, type IntervalTokenModel, type MergeIntervalsSceneModel, type MergedSegmentModel } from "../../engine/mergeIntervalsStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";
import { CodeLineBadge } from "./CodeLineBadge";
import { HudToggle, useStageHud } from "./StageHud";
import { StageProgressBar } from "./StageProgressBar";

const PENDING_COLOR = "#64748b";
const ACTIVE_COLOR = "#fb923c";
const OVERLAP_COLOR = "#22d3ee";
const OUTPUT_COLOR = "#34d399";
const GAP_COLOR = "#a78bfa";
const INVALID_COLOR = "#f43f5e";
const TRACK_LEFT = -3.15;
const TRACK_RIGHT = 3.15;

function xFor(value: number, domain: [number, number]): number {
  const span = Math.max(0.001, domain[1] - domain[0]);
  return TRACK_LEFT + ((value - domain[0]) / span) * (TRACK_RIGHT - TRACK_LEFT);
}

function beamGeometry(start: number, end: number, domain: [number, number]) {
  const left = xFor(start, domain);
  const right = xFor(end, domain);
  return { center: (left + right) / 2, width: Math.max(0.16, right - left) };
}

function rowY(index: number, count: number): number {
  const gap = count <= 5 ? 0.43 : Math.max(0.28, 2.25 / Math.max(1, count - 1));
  return 1.3 - index * gap;
}

function inputColor(role: IntervalTokenModel["role"], p: Theme3DPalette): string {
  if (role === "invalid") return INVALID_COLOR;
  if (role === "overlap") return OVERLAP_COLOR;
  if (role === "active") return ACTIVE_COLOR;
  if (role === "processed") return p.barRange;
  return PENDING_COLOR;
}

function CameraRig({ count }: { count: number }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const compact = useThree((state) => state.size.width < 560);
  useLayoutEffect(() => {
    camera.position.set(
      0,
      compact ? (count > 6 ? 4.8 : 4.25) : (count > 6 ? 4.15 : 3.4),
      compact ? (count > 6 ? 11.1 : 9.8) : (count > 6 ? 9.15 : 7.45),
    );
    camera.lookAt(0, -0.18, 0);
  }, [camera, compact, count]);
  return null;
}

function Timeline({ domain, p }: { domain: [number, number]; p: Theme3DPalette }) {
  const ticks = Array.from({ length: 7 }, (_, index) => domain[0] + (index / 6) * (domain[1] - domain[0]));
  return (
    <group>
      <mesh position={[0, -1.76, -0.06]} receiveShadow><boxGeometry args={[6.7, 0.12, 0.72]} /><meshStandardMaterial color={p.emptyCell} emissive={p.gridSection} emissiveIntensity={0.05} metalness={0.46} roughness={0.42} /><Edges color={p.gridSection} threshold={18} /></mesh>
      <Line points={[[TRACK_LEFT, -1.62, 0.18], [TRACK_RIGHT, -1.62, 0.18]]} color={p.gridSection} lineWidth={2.4} transparent opacity={0.8} />
      {ticks.map((value, index) => {
        const x = xFor(value, domain);
        return <group key={index} position={[x, -1.62, 0.18]}><Line points={[[0, -0.08, 0], [0, 0.08, 0]]} color={p.textDim} lineWidth={1.2} /><Html position={[0, -0.23, 0.1]} center style={{ pointerEvents: "none" }}><div className="font-mono text-[7px] font-bold text-ink-500">{Number(value.toFixed(1))}</div></Html></group>;
      })}
      <Html position={[TRACK_LEFT, -1.27, 0.2]} center style={{ pointerEvents: "none" }}><div className="rounded border border-ink-700/70 bg-ink-950/94 px-1.5 py-0.5 font-mono text-[7px] font-black uppercase text-ink-400">merged output</div></Html>
    </group>
  );
}

function IntervalBeam({ token, count, domain, p, reduced }: { token: IntervalTokenModel; count: number; domain: [number, number]; p: Theme3DPalette; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const geometry = beamGeometry(token.start, token.end, domain);
  const targetY = rowY(token.index, count);
  const color = inputColor(token.role, p);
  const targetColor = useMemo(() => new THREE.Color(color), [color]);
  const active = token.role === "active" || token.role === "overlap";

  useLayoutEffect(() => {
    group.current?.position.set(geometry.center, targetY, 0.1);
    if (beam.current) beam.current.scale.x = geometry.width;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!group.current || !beam.current || !material.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00052, delta);
    const bob = !reduced && active ? Math.sin(clock.elapsedTime * 3.5 + token.index) * 0.025 : 0;
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, geometry.center, amount);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, targetY + bob, amount);
    beam.current.scale.x = THREE.MathUtils.lerp(beam.current.scale.x, geometry.width, amount);
    material.current.color.lerp(targetColor, amount);
    material.current.emissive.lerp(targetColor, amount);
    material.current.emissiveIntensity = THREE.MathUtils.lerp(material.current.emissiveIntensity, active ? 0.72 : token.role === "processed" ? 0.04 : 0.14, amount);
    material.current.opacity = THREE.MathUtils.lerp(material.current.opacity, token.role === "processed" ? 0.34 : 0.92, amount);
  });

  return (
    <group ref={group} position={[geometry.center, targetY, 0.1]}>
      <mesh ref={beam} scale={[geometry.width, 1, 1]} castShadow receiveShadow>
        <boxGeometry args={[1, 0.22, 0.46]} />
        <meshStandardMaterial ref={material} color={color} emissive={color} emissiveIntensity={active ? 0.72 : 0.14} transparent opacity={token.role === "processed" ? 0.34 : 0.92} metalness={0.48} roughness={0.26} />
        <Edges color={active ? p.textStrong : color} threshold={18} />
      </mesh>
      <mesh position={[-geometry.width / 2, 0, 0.04]}><sphereGeometry args={[0.1, 16, 16]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} /></mesh>
      <mesh position={[geometry.width / 2, 0, 0.04]}><sphereGeometry args={[0.1, 16, 16]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} /></mesh>
      <Html position={[0, 0.25, 0.32]} center style={{ pointerEvents: "none" }}>
        <div data-interval-token={token.id} className="whitespace-nowrap rounded border bg-ink-950/96 px-2 py-0.5 font-mono text-[8px] font-black tabular-nums shadow-xl" style={{ borderColor: color, color }}>[{token.start}, {token.end}]</div>
      </Html>
    </group>
  );
}

function MergedBeam({ segment, domain, p, reduced }: { segment: MergedSegmentModel; domain: [number, number]; p: Theme3DPalette; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const geometry = beamGeometry(segment.start, segment.end, domain);
  const color = segment.active ? OUTPUT_COLOR : p.verdantDeep;
  const targetColor = useMemo(() => new THREE.Color(color), [color]);
  useLayoutEffect(() => {
    group.current?.position.set(geometry.center, -1.18, 0.24);
    if (beam.current) beam.current.scale.x = geometry.width;
  }, []);
  useFrame(({ clock }, delta) => {
    if (!group.current || !beam.current || !material.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00042, delta);
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, geometry.center, amount);
    beam.current.scale.x = THREE.MathUtils.lerp(beam.current.scale.x, geometry.width, amount);
    const pulse = !reduced && segment.active ? 1 + Math.sin(clock.elapsedTime * 3.2) * 0.04 : 1;
    beam.current.scale.y = THREE.MathUtils.lerp(beam.current.scale.y, pulse, amount);
    material.current.color.lerp(targetColor, amount);
    material.current.emissive.lerp(targetColor, amount);
    material.current.emissiveIntensity = THREE.MathUtils.lerp(material.current.emissiveIntensity, segment.active ? 0.82 : 0.32, amount);
  });
  return (
    <group ref={group} position={[geometry.center, -1.18, 0.24]}>
      <mesh ref={beam} scale={[geometry.width, 1, 1]} castShadow receiveShadow><boxGeometry args={[1, 0.34, 0.58]} /><meshStandardMaterial ref={material} color={color} emissive={color} emissiveIntensity={segment.active ? 0.82 : 0.32} metalness={0.5} roughness={0.24} /><Edges color={segment.active ? p.textStrong : color} threshold={18} /></mesh>
      <Html position={[0, 0.02, 0.34]} center style={{ pointerEvents: "none" }}><div data-merged-segment={segment.id} className="whitespace-nowrap rounded border border-emerald-300/70 bg-ink-950/96 px-2 py-1 font-mono text-[9px] font-black tabular-nums text-emerald-200 shadow-xl">[{segment.start}, {segment.end}]</div></Html>
    </group>
  );
}

function Scanner({ model, reduced }: { model: MergeIntervalsSceneModel; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const candidate = model.activeIndex === null ? null : model.tokens.find((token) => token.index === model.activeIndex);
  const targetX = candidate ? xFor(candidate.start, model.domain) : TRACK_LEFT;
  const visible = candidate !== null && ["seed", "compare", "merge", "commit"].includes(model.operation);
  useLayoutEffect(() => { group.current?.position.set(targetX, 0, 0); }, []);
  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetX, reduced ? 1 : 1 - Math.pow(0.00045, delta));
  });
  if (!visible) return null;
  const color = model.overlap === true ? OVERLAP_COLOR : model.overlap === false ? GAP_COLOR : ACTIVE_COLOR;
  return (
    <group ref={group} position={[targetX, 0, 0]}>
      <Line points={[[0, -1.55, 0.48], [0, 1.65, 0.48]]} color={color} lineWidth={2.4} transparent opacity={0.7} />
      <mesh position={[0, -0.02, 0.36]}><boxGeometry args={[0.055, 3.05, 0.06]} /><meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} /></mesh>
      <Html position={[0, 1.72, 0.52]} center style={{ pointerEvents: "none" }}><div data-testid="interval-scanner" className="whitespace-nowrap rounded border bg-ink-950/96 px-1.5 py-0.5 font-mono text-[7px] font-black uppercase shadow-xl" style={{ borderColor: color, color }}>scan x={candidate?.start}</div></Html>
    </group>
  );
}

function DecisionBridge({ model, reduced }: { model: MergeIntervalsSceneModel; reduced: boolean }) {
  const pulse = useRef<THREE.Mesh>(null);
  const candidate = model.activeIndex === null ? null : model.tokens.find((token) => token.index === model.activeIndex);
  const segment = model.activeMergedIndex === null ? null : model.mergedSegments[model.activeMergedIndex];
  const active = candidate && segment && ["compare", "merge", "commit"].includes(model.operation);
  const start = candidate ? beamGeometry(candidate.start, candidate.end, model.domain) : { center: 0, width: 0 };
  const end = segment ? beamGeometry(segment.start, segment.end, model.domain) : { center: 0, width: 0 };
  const candidateY = candidate ? rowY(candidate.index, model.tokens.length) : 0;
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(start.center, candidateY - 0.1, 0.42),
    new THREE.Vector3((start.center + end.center) / 2, -0.15, 0.82),
    new THREE.Vector3(end.center, -1.02, 0.48),
  ]), [candidateY, end.center, start.center]);
  useFrame(({ clock }) => {
    if (!active || !pulse.current) return;
    pulse.current.position.copy(curve.getPointAt(reduced ? 0.74 : (clock.elapsedTime * 0.38) % 1));
  });
  if (!active) return null;
  const color = model.overlap ? OVERLAP_COLOR : GAP_COLOR;
  return <group><Line points={curve.getPoints(48)} color={color} lineWidth={2.4} transparent opacity={0.82} /><mesh ref={pulse}><sphereGeometry args={[0.065, 14, 14]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.7} /></mesh></group>;
}

function InvalidMarker({ model }: { model: MergeIntervalsSceneModel }) {
  if (model.operation !== "invalid") return null;
  return <group position={[0, -0.2, 0.75]}><Line points={[[-0.55, -0.55, 0], [0.55, 0.55, 0]]} color={INVALID_COLOR} lineWidth={5} /><Line points={[[-0.55, 0.55, 0], [0.55, -0.55, 0]]} color={INVALID_COLOR} lineWidth={5} /></group>;
}

function Scene({ model, p, reduced }: { model: MergeIntervalsSceneModel; p: Theme3DPalette; reduced: boolean }) {
  const count = Math.max(1, model.tokens.length);
  return (
    <>
      <CameraRig count={count} />
      <fog attach="fog" args={[p.background, 13, 29]} />
      <ambientLight intensity={0.7 * p.lighting.ambient} />
      <directionalLight castShadow position={[4.8, 8, 5]} intensity={1.45 * p.lighting.directional} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-3.5, 2.2, 3]} intensity={22 * p.lighting.accent} distance={11} color={ACTIVE_COLOR} />
      <pointLight position={[0, 2.8, 3]} intensity={24 * p.lighting.accent} distance={12} color={OVERLAP_COLOR} />
      <pointLight position={[3.5, 1.6, 3]} intensity={20 * p.lighting.accent} distance={10} color={OUTPUT_COLOR} />
      <Timeline domain={model.domain} p={p} />
      {model.tokens.map((token) => <IntervalBeam key={token.id} token={token} count={count} domain={model.domain} p={p} reduced={reduced} />)}
      {model.mergedSegments.map((segment) => <MergedBeam key={segment.id} segment={segment} domain={model.domain} p={p} reduced={reduced} />)}
      <Scanner model={model} reduced={reduced} />
      <DecisionBridge model={model} reduced={reduced} />
      <InvalidMarker model={model} />
      <InfiniteGrid position={[0, -2.03, -0.2]} cellSize={0.5} cellThickness={0.5} cellColor={p.gridCell} sectionSize={2.5} sectionThickness={0.88} sectionColor={p.gridSection} fadeDistance={24} fadeStrength={1} infiniteGrid />
      <OrbitControls enablePan={false} enableRotate enableZoom enableDamping dampingFactor={0.08} rotateSpeed={0.72} zoomSpeed={0.85} target={[0, -0.18, 0]} minDistance={5.7} maxDistance={21} minPolarAngle={0.34} maxPolarAngle={Math.PI / 2.03} />
    </>
  );
}

function Overlay({ model }: { model: MergeIntervalsSceneModel }) {
  const tone = model.operation === "invalid" ? "border-red-400/45 text-red-300" : model.operation === "merge" || model.overlap === true ? "border-cyan-400/45 text-cyan-200" : model.operation === "commit" || model.overlap === false ? "border-purple-400/45 text-purple-200" : model.operation === "complete" ? "border-emerald-400/45 text-emerald-200" : "border-orange-400/45 text-orange-200";
  return (
    <>
      <div className="pointer-events-none absolute left-2 top-2 z-10 max-w-[14rem] rounded-md border border-orange-400/30 bg-ink-950/88 px-2.5 py-1.5 shadow-xl backdrop-blur-md sm:left-3 sm:top-3 sm:max-w-[21rem]">
        <div className="flex items-center gap-1.5"><span className={`rounded border bg-ink-900/70 px-1.5 py-0.5 font-mono text-[8px] font-black uppercase ${tone}`}>intervals / {model.operation}</span><span className="font-mono text-[8px] font-semibold uppercase text-ink-500">sort + sweep</span></div>
        <p data-testid="merge-intervals-headline" className="mt-1 text-xs font-black leading-tight text-ink-50 sm:text-[13px]">{model.headline}</p>
      </div>
      <div className="stage-hud-secondary merge-intervals-equation pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 items-center rounded-md border border-ink-700/70 bg-ink-950/90 px-3 py-2 shadow-xl backdrop-blur-md"><span className="max-w-80 truncate font-mono text-[11px] font-black tabular-nums text-ink-50">{model.equation}</span></div>
      <div className="stage-hud-secondary pointer-events-none absolute right-11 top-3 z-10 justify-end gap-1">{[["seen", model.activeIndex === null ? 0 : model.activeIndex + 1], ["checks", model.comparisons], ["merged", model.merges], ["output", model.mergedSegments.length]].map(([label, value]) => <div key={label} className="min-w-10 rounded border border-ink-700/65 bg-ink-950/86 px-1.5 py-1 text-center shadow-lg backdrop-blur-md"><span className="block font-mono text-[7px] font-black uppercase text-ink-500">{label}</span><span className="block font-mono text-[10px] font-black leading-tight text-ink-50">{value}</span></div>)}</div>
      <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 z-10 flex items-end justify-between gap-2 sm:left-4 sm:right-4"><p data-testid="merge-intervals-detail" className="max-w-[40rem] rounded-md border border-orange-400/25 bg-ink-950/88 px-2.5 py-1.5 text-[11px] leading-snug text-ink-200 shadow-xl backdrop-blur-md">{model.detail}</p><div className="stage-hud-legend ml-auto flex-wrap justify-end gap-1"><span className="rounded border border-orange-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-orange-200">orange candidate</span><span className="rounded border border-cyan-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-cyan-200">cyan overlap</span><span className="rounded border border-emerald-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-emerald-200">green output</span></div></div>
    </>
  );
}

export function MergeIntervalsStage3D({ step, steps }: { step: TraceStep; steps?: TraceStep[] }) {
  const model = getMergeIntervalsSceneModel(step);
  const p = useTheme3D();
  const reduced = Boolean(useReducedMotion());
  const hud = useStageHud();
  if (!model) return null;
  return (
    <div className="codeanvil-canvas-fill codeanvil-stage-frame relative h-full w-full overflow-hidden rounded-md @container">
      <Canvas shadows="basic" dpr={[1.25, 2]} data-testid="merge-intervals-stage-canvas" camera={{ position: [0, 4.25, 9.8], fov: 43 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} style={{ width: "100%", height: "100%", background: "transparent" }}><CanvasSizeSync /><Scene model={model} p={p} reduced={reduced} /></Canvas>
      <HudToggle open={hud.hudOpen} onToggle={hud.toggleHud} />{hud.hudOpen ? <Overlay model={model} /> : null}<div className="merge-intervals-line-badge"><CodeLineBadge step={step} /></div><StageProgressBar step={step} steps={steps} />
    </div>
  );
}
