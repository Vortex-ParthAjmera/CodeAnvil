import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import {
  getDifferenceArraySceneModel,
  type DifferenceArraySceneModel,
  type DifferenceInputTokenModel,
  type DifferenceResultTokenModel,
  type DifferenceSignalTokenModel,
} from "../../engine/differenceArrayStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";
import { CodeLineBadge } from "./CodeLineBadge";
import { HudToggle, useStageHud } from "./StageHud";
import { StageProgressBar } from "./StageProgressBar";

const RANGE_COLOR = "#a78bfa";
const SOURCE_COLOR = "#fb923c";
const POSITIVE_COLOR = "#22d3ee";
const NEGATIVE_COLOR = "#fb7185";
const RESULT_COLOR = "#34d399";
const INVALID_COLOR = "#f43f5e";

function gapForCount(count: number): number {
  if (count <= 7) return 0.92;
  return Math.max(0.5, 6.2 / Math.max(1, count - 1));
}

function tileWidthForCount(count: number): number {
  return Math.max(0.34, Math.min(0.59, gapForCount(count) * 0.67));
}

function xForIndex(index: number, count: number): number {
  return (index - (count - 1) / 2) * gapForCount(count);
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

function CameraRig({ stageWidth, reduced }: { stageWidth: number; reduced: boolean }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const target = useRef(new THREE.Vector3(0, 4.35, Math.max(10.8, stageWidth * 0.98 + 3.7)));
  const reframing = useRef(true);

  useLayoutEffect(() => {
    camera.position.copy(target.current);
    camera.lookAt(0, -0.08, 0);
  }, [camera]);

  useEffect(() => {
    target.current.set(0, 4.35, Math.max(10.8, stageWidth * 0.98 + 3.7));
    reframing.current = true;
  }, [stageWidth]);

  useFrame((_, delta) => {
    if (!reframing.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.0008, delta);
    camera.position.lerp(target.current, amount);
    camera.lookAt(0, -0.08, 0);
    if (camera.position.distanceTo(target.current) < 0.012) {
      camera.position.copy(target.current);
      camera.lookAt(0, -0.08, 0);
      reframing.current = false;
    }
  });
  return null;
}

function inputColor(role: DifferenceInputTokenModel["role"], p: Theme3DPalette): string {
  if (role === "invalid") return INVALID_COLOR;
  if (role === "source") return SOURCE_COLOR;
  if (role === "rebuilding") return POSITIVE_COLOR;
  if (role === "range") return RANGE_COLOR;
  if (role === "complete") return p.barRange;
  return p.barDefault;
}

function signalColor(token: DifferenceSignalTokenModel, p: Theme3DPalette): string {
  if (token.role === "invalid") return INVALID_COLOR;
  if (token.role === "start") return RESULT_COLOR;
  if (token.role === "stop") return NEGATIVE_COLOR;
  if (token.role === "active") return SOURCE_COLOR;
  if (token.role === "consumed") return p.arcDeep;
  if (token.value === null) return p.emptyCell;
  return (token.value ?? 0) < 0 ? NEGATIVE_COLOR : POSITIVE_COLOR;
}

function resultColor(role: DifferenceResultTokenModel["role"], p: Theme3DPalette): string {
  if (role === "invalid") return INVALID_COLOR;
  if (role === "writing") return SOURCE_COLOR;
  if (role === "updated") return RESULT_COLOR;
  if (role === "complete") return p.verdant;
  if (role === "unchanged") return p.arc;
  return p.emptyCell;
}

function RailBase({ width, y, p }: { width: number; y: number; p: Theme3DPalette }) {
  return (
    <mesh position={[0, y, -0.1]} receiveShadow>
      <boxGeometry args={[width, 0.12, 0.98]} />
      <meshStandardMaterial color={p.emptyCell} emissive={p.gridSection} emissiveIntensity={0.045} metalness={0.44} roughness={0.42} />
      <Edges color={p.gridSection} threshold={18} />
    </mesh>
  );
}

function RailLabel({ text, position, color }: { text: string; position: [number, number, number]; color: string }) {
  return (
    <Html position={position} center style={{ pointerEvents: "none" }}>
      <div className="whitespace-nowrap rounded border bg-ink-950/95 px-1.5 py-0.5 font-mono text-[7px] font-black uppercase shadow-lg" style={{ borderColor: color, color }}>{text}</div>
    </Html>
  );
}

function InputCell({ token, count, p, reduced }: { token: DifferenceInputTokenModel; count: number; p: Theme3DPalette; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const color = inputColor(token.role, p);
  const targetColor = useMemo(() => new THREE.Color(color), [color]);
  const active = token.role === "source" || token.role === "rebuilding";
  const targetY = 0.72 + (active ? 0.11 : 0);

  useLayoutEffect(() => {
    group.current?.position.set(xForIndex(token.index, count), targetY, 0.06);
  }, []);

  useFrame(({ clock }, delta) => {
    if (!group.current || !body.current || !material.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00065, delta);
    const pulse = !reduced && active ? Math.sin(clock.elapsedTime * 3.5 + token.index * 0.2) * 0.025 : 0;
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, targetY + pulse, amount);
    const scale = active ? 1.12 : 1;
    body.current.scale.setScalar(THREE.MathUtils.lerp(body.current.scale.x, scale, amount));
    material.current.color.lerp(targetColor, amount);
    material.current.emissive.lerp(targetColor, amount);
    material.current.emissiveIntensity = THREE.MathUtils.lerp(material.current.emissiveIntensity, active ? 0.62 : 0.1, amount);
  });

  return (
    <group ref={group} position={[xForIndex(token.index, count), targetY, 0.06]}>
      <mesh ref={body} castShadow receiveShadow>
        <boxGeometry args={[tileWidthForCount(count), 0.4, 0.64]} />
        <meshStandardMaterial ref={material} color={color} emissive={color} emissiveIntensity={active ? 0.62 : 0.1} metalness={0.47} roughness={0.28} />
        <Edges color={active ? p.textStrong : color} threshold={18} />
      </mesh>
      <Html position={[0, 0.02, 0.37]} center style={{ pointerEvents: "none" }}>
        <div data-difference-input={token.id} className="stage-value-card" style={{ borderColor: color }}>{token.value}</div>
      </Html>
      <Html position={[0, -0.31, 0.32]} center style={{ pointerEvents: "none" }}>
        <div className="rounded border border-ink-700/65 bg-ink-950/92 px-1.5 py-0.5 font-mono text-[7px] font-black leading-none text-ink-400">i={token.index}</div>
      </Html>
    </group>
  );
}

function SignalCell({ token, count, p, reduced }: { token: DifferenceSignalTokenModel; count: number; p: Theme3DPalette; reduced: boolean }) {
  const body = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const color = signalColor(token, p);
  const targetColor = useMemo(() => new THREE.Color(color), [color]);
  const magnitude = token.value === null ? 0.08 : Math.min(0.5, 0.15 + Math.abs(token.value) * 0.065);
  const direction = (token.value ?? 0) < 0 ? -1 : 1;
  const targetScaleY = token.value === null ? 0.08 : magnitude;
  const active = token.role === "active" || token.role === "start" || token.role === "stop";

  useLayoutEffect(() => {
    if (!body.current || !material.current) return;
    body.current.scale.y = targetScaleY;
    body.current.position.y = direction * targetScaleY * 0.5;
    material.current.opacity = token.value === null ? 0.18 : 0.9;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!body.current || !material.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.0005, delta);
    const bounce = !reduced && active ? Math.sin(clock.elapsedTime * 3.8) * 0.018 : 0;
    body.current.scale.y = THREE.MathUtils.lerp(body.current.scale.y, targetScaleY, amount);
    body.current.position.y = THREE.MathUtils.lerp(body.current.position.y, direction * targetScaleY * 0.5 + bounce, amount);
    material.current.color.lerp(targetColor, amount);
    material.current.emissive.lerp(targetColor, amount);
    material.current.opacity = THREE.MathUtils.lerp(material.current.opacity, token.value === null ? 0.18 : 0.9, amount);
    material.current.emissiveIntensity = THREE.MathUtils.lerp(material.current.emissiveIntensity, active ? 0.9 : 0.3, amount);
  });

  return (
    <group position={[xForIndex(token.index, count), -0.17, 0.04]}>
      <mesh ref={body} castShadow receiveShadow>
        <boxGeometry args={[tileWidthForCount(count) * 0.72, 1, 0.52]} />
        <meshStandardMaterial ref={material} color={color} emissive={color} emissiveIntensity={active ? 0.9 : 0.3} transparent opacity={token.value === null ? 0.18 : 0.9} metalness={0.5} roughness={0.24} />
        <Edges color={active ? p.textStrong : color} threshold={18} />
      </mesh>
      <Html position={[0, 0, 0.32]} center style={{ pointerEvents: "none" }}>
        <div data-difference-signal={token.id} className="stage-value-card" style={{ borderColor: color }}>{token.value === null ? "?" : signed(token.value)}</div>
      </Html>
    </group>
  );
}

function ResultCell({ token, count, p, reduced }: { token: DifferenceResultTokenModel; count: number; p: Theme3DPalette; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const color = resultColor(token.role, p);
  const targetColor = useMemo(() => new THREE.Color(color), [color]);
  const visible = token.value !== null;
  const active = token.role === "writing";
  const targetY = -1.08 + (active ? 0.12 : 0);

  useLayoutEffect(() => {
    group.current?.position.set(xForIndex(token.index, count), targetY, 0.02);
    if (material.current) material.current.opacity = visible ? 0.92 : 0.16;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!group.current || !body.current || !material.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00055, delta);
    const pulse = !reduced && active ? Math.sin(clock.elapsedTime * 3.7) * 0.025 : 0;
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, targetY + pulse, amount);
    body.current.scale.setScalar(THREE.MathUtils.lerp(body.current.scale.x, active ? 1.14 : 1, amount));
    material.current.color.lerp(targetColor, amount);
    material.current.emissive.lerp(targetColor, amount);
    material.current.opacity = THREE.MathUtils.lerp(material.current.opacity, visible ? 0.92 : 0.16, amount);
    material.current.emissiveIntensity = THREE.MathUtils.lerp(material.current.emissiveIntensity, active ? 0.74 : visible ? 0.3 : 0.03, amount);
  });

  return (
    <group ref={group} position={[xForIndex(token.index, count), targetY, 0.02]}>
      <mesh ref={body} castShadow receiveShadow rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[tileWidthForCount(count) * 0.43, tileWidthForCount(count) * 0.54, 0.42, 4]} />
        <meshStandardMaterial ref={material} color={color} emissive={color} emissiveIntensity={active ? 0.74 : 0.3} transparent opacity={visible ? 0.92 : 0.16} metalness={0.5} roughness={0.25} />
        <Edges color={active ? p.textStrong : color} threshold={18} />
      </mesh>
      <Html position={[0, 0.02, 0.34]} center style={{ pointerEvents: "none" }}>
        <div data-difference-result={token.id} className="stage-value-card" style={{ borderColor: color }}>{token.value ?? "?"}</div>
      </Html>
    </group>
  );
}

function RangeFrame({ model, reduced }: { model: DifferenceArraySceneModel; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const shell = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const count = Math.max(1, model.values.length);
  const safeLeft = THREE.MathUtils.clamp(model.rangeStart, 0, count - 1);
  const safeRight = THREE.MathUtils.clamp(model.rangeEnd, safeLeft, count - 1);
  const leftX = xForIndex(safeLeft, count);
  const rightX = xForIndex(safeRight, count);
  const center = (leftX + rightX) / 2;
  const width = Math.max(0.75, rightX - leftX + tileWidthForCount(count) + 0.25);
  const visible = model.operation !== "invalid";

  useLayoutEffect(() => {
    if (group.current) group.current.position.x = center;
    if (shell.current) shell.current.scale.x = width;
  }, []);

  useFrame((_, delta) => {
    if (!group.current || !shell.current || !material.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00038, delta);
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, center, amount);
    shell.current.scale.x = THREE.MathUtils.lerp(shell.current.scale.x, width, amount);
    material.current.opacity = THREE.MathUtils.lerp(material.current.opacity, visible ? 0.13 : 0, amount);
  });

  return (
    <group ref={group} position={[center, 0.73, -0.01]}>
      <mesh ref={shell} scale={[width, 1, 1]}>
        <boxGeometry args={[1, 0.92, 0.9]} />
        <meshStandardMaterial ref={material} color={RANGE_COLOR} emissive={RANGE_COLOR} emissiveIntensity={0.42} transparent opacity={visible ? 0.13 : 0} depthWrite={false} metalness={0.34} roughness={0.32} />
        {visible ? <Edges color={RANGE_COLOR} threshold={18} /> : null}
      </mesh>
      {visible ? (
        <Html position={[0, 0.58, 0.36]} center style={{ pointerEvents: "none" }}>
          <div data-testid="difference-range" className="whitespace-nowrap rounded border border-purple-400/55 bg-ink-950/96 px-2 py-1 font-mono text-[8px] font-black uppercase text-purple-200 shadow-xl">update [{model.rangeStart}..{model.rangeEnd}] {signed(model.delta)}</div>
        </Html>
      ) : null}
    </group>
  );
}

function SignalFlow({ model, reduced }: { model: DifferenceArraySceneModel; reduced: boolean }) {
  const pulseA = useRef<THREE.Mesh>(null);
  const pulseB = useRef<THREE.Mesh>(null);
  const count = Math.max(1, model.values.length);
  const isBuild = (model.operation === "seed" || model.operation === "build") && model.activeIndex !== null;
  const isBoundary = (model.operation === "mark-start" || model.operation === "mark-stop") && model.boundaryIndex !== null;
  const isRebuild = model.operation === "reconstruct" && model.activeIndex !== null;
  const index = model.boundaryIndex ?? model.activeIndex ?? 0;
  const firstSource = model.sourceIndices?.[0] ?? index;
  const secondSource = model.sourceIndices?.[1] ?? index;
  const color = model.operation === "mark-stop" ? NEGATIVE_COLOR : model.operation === "mark-start" ? RESULT_COLOR : model.operation === "reconstruct" ? RESULT_COLOR : SOURCE_COLOR;
  const curveA = useMemo(() => {
    if (isBoundary) return new THREE.CatmullRomCurve3([
      new THREE.Vector3(xForIndex(index, count), 1.6, 0.28),
      new THREE.Vector3(xForIndex(index, count) + (model.operation === "mark-stop" ? 0.28 : -0.28), 0.65, 0.52),
      new THREE.Vector3(xForIndex(index, count), -0.05, 0.3),
    ]);
    if (isRebuild) return new THREE.CatmullRomCurve3([
      new THREE.Vector3(xForIndex(index, count), -0.12, 0.3),
      new THREE.Vector3(xForIndex(index, count) + 0.3, -0.58, 0.5),
      new THREE.Vector3(xForIndex(index, count), -0.91, 0.28),
    ]);
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(xForIndex(firstSource, count), 0.52, 0.31),
      new THREE.Vector3((xForIndex(firstSource, count) + xForIndex(index, count)) / 2 - 0.12, 0.18, 0.5),
      new THREE.Vector3(xForIndex(index, count), -0.03, 0.3),
    ]);
  }, [count, firstSource, index, isBoundary, isRebuild, model.operation]);
  const curveB = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(xForIndex(secondSource, count), 0.52, 0.3),
    new THREE.Vector3((xForIndex(secondSource, count) + xForIndex(index, count)) / 2 + 0.14, 0.23, 0.52),
    new THREE.Vector3(xForIndex(index, count), -0.03, 0.3),
  ]), [count, index, secondSource]);

  useFrame(({ clock }) => {
    const t = reduced ? 0.78 : (clock.elapsedTime * 0.43) % 1;
    pulseA.current?.position.copy(curveA.getPointAt(t));
    pulseB.current?.position.copy(curveB.getPointAt((t + 0.34) % 1));
  });

  if (!isBuild && !isBoundary && !isRebuild) return null;
  return (
    <group>
      <Line points={curveA.getPoints(42)} color={color} lineWidth={2.4} transparent opacity={0.82} />
      <mesh ref={pulseA}><sphereGeometry args={[0.06, 14, 14]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} /></mesh>
      {isBuild && firstSource !== secondSource ? (
        <>
          <Line points={curveB.getPoints(42)} color={POSITIVE_COLOR} lineWidth={2.2} transparent opacity={0.72} />
          <mesh ref={pulseB}><sphereGeometry args={[0.055, 14, 14]} /><meshStandardMaterial color={POSITIVE_COLOR} emissive={POSITIVE_COLOR} emissiveIntensity={1.5} /></mesh>
        </>
      ) : null}
    </group>
  );
}

function RunningCore({ model, reduced, compact }: { model: DifferenceArraySceneModel; reduced: boolean; compact: boolean }) {
  const ring = useRef<THREE.Group>(null);
  const active = model.operation === "reconstruct";
  const color = model.operation === "invalid" ? INVALID_COLOR : active ? RESULT_COLOR : POSITIVE_COLOR;
  useFrame(({ clock }, delta) => {
    if (!ring.current) return;
    ring.current.rotation.z += reduced ? 0 : delta * 0.2;
    ring.current.scale.setScalar(!reduced && active ? 1 + Math.sin(clock.elapsedTime * 3.2) * 0.03 : 1);
  });
  return (
    <group position={[compact ? 2.2 : 2.85, 1.55, -0.02]}>
      <group ref={ring}>
        <mesh><torusGeometry args={[0.46, 0.045, 16, 64]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.95} metalness={0.52} roughness={0.24} /></mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.59, 0.012, 12, 56]} /><meshBasicMaterial color={color} transparent opacity={0.3} /></mesh>
      </group>
      <Html position={[0, 0, 0.18]} center style={{ pointerEvents: "none" }}>
        <div className={`${compact ? "min-w-20 px-1.5" : "min-w-24 px-2"} rounded-md border bg-ink-950/96 py-1 text-center shadow-xl`} style={{ borderColor: color }}>
          <span className="block font-mono text-[6px] font-black uppercase text-ink-400">running signal</span>
          <span data-testid="difference-running" className="mt-0.5 block font-mono text-[11px] font-black tabular-nums" style={{ color }}>{model.runningAfter ?? model.runningBefore ?? (model.operation === "complete" ? model.finalValues[model.finalValues.length - 1] ?? 0 : 0)}</span>
        </div>
      </Html>
    </group>
  );
}

function InvalidMarker({ model }: { model: DifferenceArraySceneModel }) {
  if (model.operation !== "invalid") return null;
  return (
    <group position={[0, -0.12, 0.7]}>
      <Line points={[[ -0.5, -0.5, 0], [0.5, 0.5, 0]]} color={INVALID_COLOR} lineWidth={5} />
      <Line points={[[ -0.5, 0.5, 0], [0.5, -0.5, 0]]} color={INVALID_COLOR} lineWidth={5} />
    </group>
  );
}

function Scene({ model, p, reduced }: { model: DifferenceArraySceneModel; p: Theme3DPalette; reduced: boolean }) {
  const compact = useThree((state) => state.size.width < 500);
  const count = Math.max(1, model.values.length);
  const stageWidth = Math.max(6.8, (count - 1) * gapForCount(count) + 2.15);
  const labelX = -stageWidth / 2 - 0.25;

  return (
    <>
      <CameraRig stageWidth={stageWidth} reduced={reduced} />
      <fog attach="fog" args={[p.background, 14, 29]} />
      <ambientLight intensity={0.72 * p.lighting.ambient} />
      <directionalLight castShadow position={[4.8, 8, 5]} intensity={1.42 * p.lighting.directional} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-4, 2.2, 3]} intensity={22 * p.lighting.accent} distance={11} color={RANGE_COLOR} />
      <pointLight position={[0, 2.7, 3]} intensity={24 * p.lighting.accent} distance={12} color={POSITIVE_COLOR} />
      <pointLight position={[4, 1.8, 3]} intensity={22 * p.lighting.accent} distance={11} color={RESULT_COLOR} />

      <RailBase width={stageWidth} y={0.5} p={p} />
      <RailBase width={stageWidth} y={-0.18} p={p} />
      <RailBase width={stageWidth} y={-1.18} p={p} />
      <RailLabel text={compact ? "arr" : "original arr"} position={[labelX, 0.22, 0.36]} color={RANGE_COLOR} />
      <RailLabel text={compact ? "diff" : "difference signal"} position={[labelX, -0.52, 0.36]} color={POSITIVE_COLOR} />
      <RailLabel text={compact ? "result" : "rebuilt result"} position={[labelX, -1.49, 0.36]} color={RESULT_COLOR} />

      <RangeFrame model={model} reduced={reduced} />
      {model.tokens.map((token) => <InputCell key={token.id} token={token} count={count} p={p} reduced={reduced} />)}
      {model.diffTokens.map((token) => <SignalCell key={token.id} token={token} count={count} p={p} reduced={reduced} />)}
      {model.resultTokens.map((token) => <ResultCell key={token.id} token={token} count={count} p={p} reduced={reduced} />)}
      <SignalFlow model={model} reduced={reduced} />
      <RunningCore model={model} reduced={reduced} compact={compact} />
      <InvalidMarker model={model} />

      <InfiniteGrid position={[0, -1.72, -0.3]} cellSize={0.48} cellThickness={0.5} cellColor={p.gridCell} sectionSize={2.4} sectionThickness={0.88} sectionColor={p.gridSection} fadeDistance={24} fadeStrength={1} infiniteGrid />
      <OrbitControls enablePan={false} enableRotate enableZoom enableDamping dampingFactor={0.08} rotateSpeed={0.72} zoomSpeed={0.85} target={[0, -0.08, 0]} minDistance={7.5} maxDistance={21} minPolarAngle={0.38} maxPolarAngle={Math.PI / 2.04} />
    </>
  );
}

function Overlay({ model }: { model: DifferenceArraySceneModel }) {
  const tone = model.operation === "invalid"
    ? "border-red-400/45 text-red-300"
    : model.operation === "mark-start" || model.operation === "mark-stop"
      ? "border-purple-400/45 text-purple-200"
      : model.operation === "reconstruct" || model.operation === "complete"
        ? "border-emerald-400/45 text-emerald-200"
        : "border-cyan-400/45 text-cyan-200";

  return (
    <>
      <div className="pointer-events-none absolute left-2 top-2 z-10 max-w-[14rem] rounded-md border border-cyan-400/30 bg-ink-950/88 px-2.5 py-1.5 shadow-xl backdrop-blur-md sm:left-3 sm:top-3 sm:max-w-[21rem]">
        <div className="flex items-center gap-1.5">
          <span className={`rounded border bg-ink-900/70 px-1.5 py-0.5 font-mono text-[8px] font-black uppercase ${tone}`}>difference / {model.operation}</span>
          <span className="font-mono text-[8px] font-semibold uppercase text-ink-500">update O(1) · rebuild O(n)</span>
        </div>
        <p data-testid="difference-array-headline" className="mt-1 text-xs font-black leading-tight text-ink-50 sm:text-[13px]">{model.headline}</p>
      </div>

      <div className="stage-hud-secondary difference-array-equation pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 items-center rounded-md border border-ink-700/70 bg-ink-950/90 px-3 py-2 shadow-xl backdrop-blur-md">
        <span className="max-w-80 truncate font-mono text-[11px] font-black tabular-nums text-ink-50">{model.equation ?? "diff[i] = arr[i] - arr[i - 1]"}</span>
      </div>

      <div className="stage-hud-secondary pointer-events-none absolute right-11 top-3 z-10 justify-end gap-1">
        {[["range", `${model.rangeStart}..${model.rangeEnd}`], ["delta", signed(model.delta)], ["edits", model.boundaryEdits], ["rebuilt", model.resultLabel]].map(([label, value]) => (
          <div key={label} className="min-w-10 rounded border border-ink-700/65 bg-ink-950/86 px-1.5 py-1 text-center shadow-lg backdrop-blur-md">
            <span className="block font-mono text-[7px] font-black uppercase text-ink-500">{label}</span>
            <span className="block font-mono text-[10px] font-black leading-tight text-ink-50">{value}</span>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 z-10 flex items-end justify-between gap-2 sm:left-4 sm:right-4">
        <p data-testid="difference-array-detail" className="max-w-[40rem] rounded-md border border-cyan-400/25 bg-ink-950/88 px-2.5 py-1.5 text-[11px] leading-snug text-ink-200 shadow-xl backdrop-blur-md">{model.detail}</p>
        <div className="stage-hud-legend ml-auto flex-wrap justify-end gap-1">
          <span className="rounded border border-purple-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-purple-200 backdrop-blur">violet range</span>
          <span className="rounded border border-cyan-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-cyan-200 backdrop-blur">cyan signal</span>
          <span className="rounded border border-emerald-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-emerald-200 backdrop-blur">green result</span>
        </div>
      </div>
    </>
  );
}

export function DifferenceArrayStage3D({ step, steps }: { step: TraceStep; steps?: TraceStep[] }) {
  const model = getDifferenceArraySceneModel(step);
  const p = useTheme3D();
  const reduced = Boolean(useReducedMotion());
  const hud = useStageHud();
  if (!model) return null;

  return (
    <div className="codeanvil-canvas-fill codeanvil-stage-frame relative h-full w-full overflow-hidden rounded-md @container">
      <Canvas shadows="basic" dpr={[1.25, 2]} data-testid="difference-array-stage-canvas" camera={{ position: [0, 4.35, 10.8], fov: 43 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} style={{ width: "100%", height: "100%", background: "transparent" }}>
        <CanvasSizeSync />
        <Scene model={model} p={p} reduced={reduced} />
      </Canvas>
      <HudToggle open={hud.hudOpen} onToggle={hud.toggleHud} />
      {hud.hudOpen ? <Overlay model={model} /> : null}
      <div className="difference-array-line-badge"><CodeLineBadge step={step} /></div>
      <StageProgressBar step={step} steps={steps} />
    </div>
  );
}
