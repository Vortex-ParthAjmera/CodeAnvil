import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import { getNextPermutationSceneModel, type NextPermutationSceneModel, type PermutationTokenModel } from "../../engine/nextPermutationStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";
import { CodeLineBadge } from "./CodeLineBadge";
import { HudToggle, useStageHud } from "./StageHud";
import { StageProgressBar } from "./StageProgressBar";

const SCAN_COLOR = "#38bdf8";
const SUFFIX_COLOR = "#a78bfa";
const PIVOT_COLOR = "#fb923c";
const SUCCESSOR_COLOR = "#34d399";
const SWAP_COLOR = "#f472b6";
const INVALID_COLOR = "#f43f5e";
const BASE_Y = -1.15;

function gapFor(count: number): number {
  if (count <= 7) return 0.84;
  return Math.max(0.5, 5.9 / Math.max(1, count - 1));
}

function tileWidth(count: number): number {
  return Math.max(0.34, Math.min(0.58, gapFor(count) * 0.68));
}

function xFor(index: number, count: number): number {
  return (index - (count - 1) / 2) * gapFor(count);
}

function heightFor(value: number, values: number[]): number {
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  return 0.55 + ((value - min) / Math.max(1, max - min)) * 1.45;
}

function roleColor(role: PermutationTokenModel["role"], p: Theme3DPalette): string {
  if (role === "invalid") return INVALID_COLOR;
  if (role === "swap") return SWAP_COLOR;
  if (role === "successor") return SUCCESSOR_COLOR;
  if (role === "pivot") return PIVOT_COLOR;
  if (role === "scan") return SCAN_COLOR;
  if (role === "suffix") return SUFFIX_COLOR;
  if (role === "complete") return SUCCESSOR_COLOR;
  return p.barDefault;
}

function CameraRig({ stageWidth }: { stageWidth: number }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const compact = useThree((state) => state.size.width < 560);
  useLayoutEffect(() => {
    camera.position.set(
      0,
      compact ? 3.85 : 3.2,
      compact ? Math.max(8.7, stageWidth * 1.05 + 3.4) : Math.max(7.2, stageWidth * 0.78 + 2.05),
    );
    camera.lookAt(0, -0.05, 0);
  }, [camera, compact, stageWidth]);
  return null;
}

function RidgeBase({ width, p }: { width: number; p: Theme3DPalette }) {
  return (
    <group>
      <mesh position={[0, BASE_Y - 0.13, 0]} receiveShadow><boxGeometry args={[width, 0.18, 1.12]} /><meshStandardMaterial color={p.emptyCell} emissive={p.gridSection} emissiveIntensity={0.05} metalness={0.47} roughness={0.42} /><Edges color={p.gridSection} threshold={18} /></mesh>
      <Line points={[[-width / 2 + 0.2, BASE_Y + 0.02, 0.58], [width / 2 - 0.2, BASE_Y + 0.02, 0.58]]} color={p.gridSection} lineWidth={2} transparent opacity={0.72} />
    </group>
  );
}

function ValueColumn({ token, values, count, p, reduced }: { token: PermutationTokenModel; values: number[]; count: number; p: Theme3DPalette; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const height = heightFor(token.value, values);
  const targetX = xFor(token.index, count);
  const active = ["scan", "pivot", "successor", "swap"].includes(token.role);
  const lift = token.role === "swap" ? 0.34 : active ? 0.13 : 0;
  const targetY = BASE_Y + height / 2 + lift;
  const color = roleColor(token.role, p);
  const targetColor = useMemo(() => new THREE.Color(color), [color]);

  useLayoutEffect(() => { group.current?.position.set(targetX, targetY, 0.08); }, []);
  useFrame(({ clock }, delta) => {
    if (!group.current || !body.current || !material.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00048, delta);
    const bob = !reduced && token.role === "swap" ? Math.sin(clock.elapsedTime * 4 + token.originalIndex) * 0.045 : 0;
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetX, amount);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, targetY + bob, amount);
    const scale = token.role === "pivot" || token.role === "successor" ? 1.07 : token.role === "swap" ? 1.12 : 1;
    body.current.scale.x = THREE.MathUtils.lerp(body.current.scale.x, scale, amount);
    body.current.scale.z = THREE.MathUtils.lerp(body.current.scale.z, scale, amount);
    material.current.color.lerp(targetColor, amount);
    material.current.emissive.lerp(targetColor, amount);
    material.current.emissiveIntensity = THREE.MathUtils.lerp(material.current.emissiveIntensity, active ? 0.78 : token.role === "complete" ? 0.4 : 0.1, amount);
    material.current.opacity = THREE.MathUtils.lerp(material.current.opacity, token.role === "suffix" ? 0.72 : 0.94, amount);
  });

  return (
    <group ref={group} position={[targetX, targetY, 0.08]}>
      <mesh ref={body} castShadow receiveShadow><boxGeometry args={[tileWidth(count), height, 0.62]} /><meshStandardMaterial ref={material} color={color} emissive={color} emissiveIntensity={active ? 0.78 : 0.1} transparent opacity={token.role === "suffix" ? 0.72 : 0.94} metalness={0.48} roughness={0.27} /><Edges color={active ? p.textStrong : color} threshold={18} /></mesh>
      <Html position={[0, Math.min(0.18, height * 0.12), 0.34]} center style={{ pointerEvents: "none" }}><div data-permutation-token={token.id} className="stage-value-card" style={{ borderColor: color }}>{token.value}</div></Html>
      <Html position={[0, -height / 2 - 0.22, 0.28]} center style={{ pointerEvents: "none" }}><div className="rounded border border-ink-700/65 bg-ink-950/94 px-1.5 py-0.5 font-mono text-[7px] font-black leading-none text-ink-400">i={token.index}</div></Html>
      {token.role === "pivot" || token.role === "successor" ? <Html position={[0, height / 2 + 0.27, 0.26]} center style={{ pointerEvents: "none" }}><div data-permutation-marker={token.role} className="whitespace-nowrap rounded border bg-ink-950/96 px-1.5 py-0.5 font-mono text-[7px] font-black uppercase shadow-xl" style={{ borderColor: color, color }}>{token.role}</div></Html> : null}
    </group>
  );
}

function SuffixFrame({ model, reduced }: { model: NextPermutationSceneModel; reduced: boolean }) {
  const shell = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const range = model.suffixRange;
  const count = Math.max(1, model.values.length);
  const left = range ? xFor(range[0], count) : 0;
  const right = range ? xFor(range[1], count) : 0;
  const center = (left + right) / 2;
  const width = Math.max(0.6, right - left + tileWidth(count) + 0.24);
  const visible = Boolean(range);
  useLayoutEffect(() => {
    if (shell.current) shell.current.scale.x = width;
    if (material.current) material.current.opacity = visible ? 0.12 : 0;
  }, []);
  useFrame((_, delta) => {
    if (!shell.current || !material.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00045, delta);
    shell.current.position.x = THREE.MathUtils.lerp(shell.current.position.x, center, amount);
    shell.current.scale.x = THREE.MathUtils.lerp(shell.current.scale.x, width, amount);
    material.current.opacity = THREE.MathUtils.lerp(material.current.opacity, visible ? 0.12 : 0, amount);
  });
  return (
    <group>
      <mesh ref={shell} position={[center, -0.02, -0.12]} scale={[width, 1, 1]}><boxGeometry args={[1, 2.8, 0.95]} /><meshStandardMaterial ref={material} color={SUFFIX_COLOR} emissive={SUFFIX_COLOR} emissiveIntensity={0.35} transparent opacity={visible ? 0.12 : 0} depthWrite={false} />{visible ? <Edges color={SUFFIX_COLOR} threshold={18} /> : null}</mesh>
      {visible ? <Html position={[center, 1.5, 0.42]} center style={{ pointerEvents: "none" }}><div data-testid="permutation-suffix" className="whitespace-nowrap rounded border border-purple-400/55 bg-ink-950/96 px-2 py-0.5 font-mono text-[7px] font-black uppercase text-purple-200 shadow-xl">suffix [{range?.[0]}..{range?.[1]}]</div></Html> : null}
    </group>
  );
}

function ScanBridge({ model, reduced }: { model: NextPermutationSceneModel; reduced: boolean }) {
  const pulse = useRef<THREE.Mesh>(null);
  const pair = model.scanPair;
  const count = Math.max(1, model.values.length);
  const a = pair ? xFor(pair[0], count) : 0;
  const b = pair ? xFor(pair[1], count) : 0;
  const maxHeight = Math.max(...model.values.map((value) => heightFor(value, model.values)), 1);
  const y = BASE_Y + maxHeight + 0.58;
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(a, y, 0.42),
    new THREE.Vector3((a + b) / 2, y + 0.42, 0.64),
    new THREE.Vector3(b, y, 0.42),
  ]), [a, b, y]);
  useFrame(({ clock }) => {
    if (!pair || !pulse.current) return;
    pulse.current.position.copy(curve.getPointAt(reduced ? 0.67 : (clock.elapsedTime * 0.42) % 1));
  });
  if (!pair) return null;
  return <group><Line points={curve.getPoints(42)} color={SCAN_COLOR} lineWidth={2.5} transparent opacity={0.82} /><mesh ref={pulse}><sphereGeometry args={[0.06, 14, 14]} /><meshStandardMaterial color={SCAN_COLOR} emissive={SCAN_COLOR} emissiveIntensity={1.7} /></mesh></group>;
}

function SwapBridge({ model, reduced }: { model: NextPermutationSceneModel; reduced: boolean }) {
  const pulse = useRef<THREE.Mesh>(null);
  const pair = model.activePair;
  const count = Math.max(1, model.values.length);
  const a = pair ? xFor(pair[0], count) : 0;
  const b = pair ? xFor(pair[1], count) : 0;
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(a, 1.15, 0.46),
    new THREE.Vector3((a + b) / 2, 2.05, 0.78),
    new THREE.Vector3(b, 1.15, 0.46),
  ]), [a, b]);
  useFrame(({ clock }) => {
    if (!pair || !pulse.current) return;
    pulse.current.position.copy(curve.getPointAt(reduced ? 0.7 : (clock.elapsedTime * 0.4) % 1));
  });
  if (!pair) return null;
  return <group><Line points={curve.getPoints(48)} color={SWAP_COLOR} lineWidth={2.7} transparent opacity={0.88} /><mesh ref={pulse}><sphereGeometry args={[0.065, 14, 14]} /><meshStandardMaterial color={SWAP_COLOR} emissive={SWAP_COLOR} emissiveIntensity={1.8} /></mesh></group>;
}

function DirectionRail({ model, reduced }: { model: NextPermutationSceneModel; reduced: boolean }) {
  const pulse = useRef<THREE.Mesh>(null);
  const width = Math.max(2, (model.values.length - 1) * gapFor(Math.max(1, model.values.length)));
  const rightToLeft = model.operation === "scan-pivot" || model.operation === "scan-successor";
  useFrame(({ clock }) => {
    if (!pulse.current) return;
    const t = reduced ? 0.55 : (clock.elapsedTime * 0.22) % 1;
    pulse.current.position.x = (rightToLeft ? 1 - t : t) * width - width / 2;
  });
  return <group position={[0, 1.82, -0.32]}><Line points={[[-width / 2, 0, 0], [width / 2, 0, 0]]} color={rightToLeft ? SCAN_COLOR : SUFFIX_COLOR} lineWidth={1.5} transparent opacity={0.38} /><mesh ref={pulse}><sphereGeometry args={[0.055, 12, 12]} /><meshStandardMaterial color={rightToLeft ? SCAN_COLOR : SUFFIX_COLOR} emissive={rightToLeft ? SCAN_COLOR : SUFFIX_COLOR} emissiveIntensity={1.5} /></mesh></group>;
}

function InvalidMarker({ model }: { model: NextPermutationSceneModel }) {
  if (model.operation !== "invalid") return null;
  return <group position={[0, 0.05, 0.75]}><Line points={[[-0.5, -0.5, 0], [0.5, 0.5, 0]]} color={INVALID_COLOR} lineWidth={5} /><Line points={[[-0.5, 0.5, 0], [0.5, -0.5, 0]]} color={INVALID_COLOR} lineWidth={5} /></group>;
}

function Scene({ model, p, reduced }: { model: NextPermutationSceneModel; p: Theme3DPalette; reduced: boolean }) {
  const count = Math.max(1, model.values.length);
  const width = Math.max(6.7, (count - 1) * gapFor(count) + 1.9);
  return (
    <>
      <CameraRig stageWidth={width} />
      <fog attach="fog" args={[p.background, 13, 28]} />
      <ambientLight intensity={0.7 * p.lighting.ambient} />
      <directionalLight castShadow position={[4.8, 8, 5]} intensity={1.45 * p.lighting.directional} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-3.5, 2.4, 3]} intensity={21 * p.lighting.accent} distance={11} color={PIVOT_COLOR} />
      <pointLight position={[0, 3, 3]} intensity={24 * p.lighting.accent} distance={12} color={SCAN_COLOR} />
      <pointLight position={[3.5, 2.4, 3]} intensity={21 * p.lighting.accent} distance={11} color={SUCCESSOR_COLOR} />
      <RidgeBase width={width} p={p} />
      <SuffixFrame model={model} reduced={reduced} />
      {model.tokens.map((token) => <ValueColumn key={token.id} token={token} values={model.values} count={count} p={p} reduced={reduced} />)}
      <ScanBridge model={model} reduced={reduced} />
      <SwapBridge model={model} reduced={reduced} />
      <DirectionRail model={model} reduced={reduced} />
      <InvalidMarker model={model} />
      <InfiniteGrid position={[0, BASE_Y - 0.3, -0.28]} cellSize={0.48} cellThickness={0.5} cellColor={p.gridCell} sectionSize={2.4} sectionThickness={0.88} sectionColor={p.gridSection} fadeDistance={24} fadeStrength={1} infiniteGrid />
      <OrbitControls enablePan={false} enableRotate enableZoom enableDamping dampingFactor={0.08} rotateSpeed={0.72} zoomSpeed={0.85} target={[0, -0.05, 0]} minDistance={5.6} maxDistance={20} minPolarAngle={0.34} maxPolarAngle={Math.PI / 2.03} />
    </>
  );
}

function Overlay({ model }: { model: NextPermutationSceneModel }) {
  const tone = model.operation === "invalid" ? "border-red-400/45 text-red-300" : model.operation.includes("pivot") ? "border-orange-400/45 text-orange-200" : model.operation.includes("successor") ? "border-emerald-400/45 text-emerald-200" : model.operation === "complete" ? "border-emerald-400/45 text-emerald-200" : "border-purple-400/45 text-purple-200";
  return (
    <>
      <div className="pointer-events-none absolute left-2 top-2 z-10 max-w-[14rem] rounded-md border border-purple-400/30 bg-ink-950/88 px-2.5 py-1.5 shadow-xl backdrop-blur-md sm:left-3 sm:top-3 sm:max-w-[21rem]"><div className="flex items-center gap-1.5"><span className={`rounded border bg-ink-900/70 px-1.5 py-0.5 font-mono text-[8px] font-black uppercase ${tone}`}>next / {model.operation}</span><span className="font-mono text-[8px] font-semibold uppercase text-ink-500">lexicographic · O(n)</span></div><p data-testid="next-permutation-headline" className="mt-1 text-xs font-black leading-tight text-ink-50 sm:text-[13px]">{model.headline}</p></div>
      <div className="stage-hud-secondary next-permutation-equation pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 items-center rounded-md border border-ink-700/70 bg-ink-950/90 px-3 py-2 shadow-xl backdrop-blur-md"><span className="max-w-80 truncate font-mono text-[11px] font-black tabular-nums text-ink-50">{model.equation}</span></div>
      <div className="stage-hud-secondary pointer-events-none absolute right-11 top-3 z-10 justify-end gap-1">{[["pivot", model.pivot ?? "-"], ["next", model.successor ?? "-"], ["checks", model.comparisons], ["swaps", model.swaps]].map(([label, value]) => <div key={label} className="min-w-10 rounded border border-ink-700/65 bg-ink-950/86 px-1.5 py-1 text-center shadow-lg backdrop-blur-md"><span className="block font-mono text-[7px] font-black uppercase text-ink-500">{label}</span><span className="block font-mono text-[10px] font-black leading-tight text-ink-50">{value}</span></div>)}</div>
      <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 z-10 flex items-end justify-between gap-2 sm:left-4 sm:right-4"><p data-testid="next-permutation-detail" className="max-w-[40rem] rounded-md border border-purple-400/25 bg-ink-950/88 px-2.5 py-1.5 text-[11px] leading-snug text-ink-200 shadow-xl backdrop-blur-md">{model.detail}</p><div className="stage-hud-legend ml-auto flex-wrap justify-end gap-1"><span className="rounded border border-orange-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-orange-200">orange pivot</span><span className="rounded border border-emerald-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-emerald-200">green successor</span><span className="rounded border border-purple-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-purple-200">violet suffix</span></div></div>
    </>
  );
}

export function NextPermutationStage3D({ step, steps }: { step: TraceStep; steps?: TraceStep[] }) {
  const model = getNextPermutationSceneModel(step);
  const p = useTheme3D();
  const reduced = Boolean(useReducedMotion());
  const hud = useStageHud();
  if (!model) return null;
  return (
    <div className="codeanvil-canvas-fill codeanvil-stage-frame relative h-full w-full overflow-hidden rounded-md @container">
      <Canvas shadows="basic" dpr={[1.25, 2]} data-testid="next-permutation-stage-canvas" camera={{ position: [0, 3.85, 9.2], fov: 43 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} style={{ width: "100%", height: "100%", background: "transparent" }}><CanvasSizeSync /><Scene model={model} p={p} reduced={reduced} /></Canvas>
      <HudToggle open={hud.hudOpen} onToggle={hud.toggleHud} />{hud.hudOpen ? <Overlay model={model} /> : null}<div className="next-permutation-line-badge"><CodeLineBadge step={step} /></div><StageProgressBar step={step} steps={steps} />
    </div>
  );
}
