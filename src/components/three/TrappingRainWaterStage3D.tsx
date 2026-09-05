import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import {
  getTrappingRainSceneModel,
  type RainWallTokenModel,
  type TrappingRainSceneModel,
} from "../../engine/trappingRainStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";
import { CodeLineBadge } from "./CodeLineBadge";
import { HudToggle, useStageHud } from "./StageHud";
import { StageProgressBar } from "./StageProgressBar";

const WATER_COLOR = "#22d3ee";
const LEFT_COLOR = "#fb923c";
const RIGHT_COLOR = "#a78bfa";
const ACTIVE_COLOR = "#34d399";
const RESOLVED_COLOR = "#0ea5e9";
const INVALID_COLOR = "#f43f5e";
const BASE_Y = -1.38;

function gapForCount(count: number): number {
  if (count <= 8) return 0.84;
  return Math.max(0.48, 6.2 / Math.max(1, count - 1));
}

function wallWidthForCount(count: number): number {
  return Math.max(0.34, Math.min(0.58, gapForCount(count) * 0.68));
}

function xForIndex(index: number, count: number): number {
  return (index - (count - 1) / 2) * gapForCount(count);
}

function unitForMax(maxHeight: number): number {
  return Math.min(0.54, 2.18 / Math.max(1, maxHeight));
}

function wallBodyHeight(value: number, maxHeight: number): number {
  return 0.16 + value * unitForMax(maxHeight);
}

function CameraRig({ stageWidth, reduced }: { stageWidth: number; reduced: boolean }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const target = useRef(new THREE.Vector3(0, 3.65, Math.max(9.8, stageWidth * 0.96 + 3.45)));
  const reframing = useRef(true);

  useLayoutEffect(() => {
    camera.position.copy(target.current);
    camera.lookAt(0, -0.08, 0);
  }, [camera]);

  useEffect(() => {
    target.current.set(0, 3.65, Math.max(9.8, stageWidth * 0.96 + 3.45));
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

function wallColor(role: RainWallTokenModel["role"], p: Theme3DPalette): string {
  if (role === "invalid") return INVALID_COLOR;
  if (role === "active" || role === "meeting") return ACTIVE_COLOR;
  if (role === "chosen") return WATER_COLOR;
  if (role === "left") return LEFT_COLOR;
  if (role === "right") return RIGHT_COLOR;
  if (role === "resolved") return RESOLVED_COLOR;
  return p.barDefault;
}

function Wall({ token, count, maxHeight, p, reduced }: { token: RainWallTokenModel; count: number; maxHeight: number; p: Theme3DPalette; reduced: boolean }) {
  const body = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const color = wallColor(token.role, p);
  const targetColor = useMemo(() => new THREE.Color(color), [color]);
  const height = wallBodyHeight(token.value, maxHeight);
  const active = token.role === "active" || token.role === "chosen" || token.role === "meeting";

  useLayoutEffect(() => {
    if (!body.current) return;
    body.current.scale.y = height;
    body.current.position.y = height / 2;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!body.current || !material.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00055, delta);
    const pulse = !reduced && active ? Math.sin(clock.elapsedTime * 3.5 + token.index * 0.22) * 0.025 : 0;
    body.current.scale.y = THREE.MathUtils.lerp(body.current.scale.y, height, amount);
    body.current.position.y = THREE.MathUtils.lerp(body.current.position.y, height / 2 + pulse, amount);
    body.current.scale.x = THREE.MathUtils.lerp(body.current.scale.x, active ? 1.11 : 1, amount);
    body.current.scale.z = THREE.MathUtils.lerp(body.current.scale.z, active ? 1.11 : 1, amount);
    material.current.color.lerp(targetColor, amount);
    material.current.emissive.lerp(targetColor, amount);
    material.current.emissiveIntensity = THREE.MathUtils.lerp(material.current.emissiveIntensity, active ? 0.72 : token.role === "resolved" ? 0.24 : 0.08, amount);
  });

  return (
    <group position={[xForIndex(token.index, count), BASE_Y, 0]}>
      <mesh ref={body} castShadow receiveShadow>
        <boxGeometry args={[wallWidthForCount(count), 1, 0.72]} />
        <meshStandardMaterial ref={material} color={color} emissive={color} emissiveIntensity={active ? 0.72 : 0.08} metalness={0.5} roughness={0.27} />
        <Edges color={active ? p.textStrong : color} threshold={18} />
      </mesh>
      <Html position={[0, height + 0.14, 0.41]} center style={{ pointerEvents: "none" }}>
        <div data-rain-wall={token.id} className="stage-value-card" style={{ borderColor: color }}>{token.value}</div>
      </Html>
      <Html position={[0, -0.18, 0.4]} center style={{ pointerEvents: "none" }}>
        <div className="rounded border border-ink-700/65 bg-ink-950/92 px-1.5 py-0.5 font-mono text-[7px] font-black leading-none text-ink-400">i={token.index}</div>
      </Html>
    </group>
  );
}

function WaterVolume({ index, wallHeight, depth, count, maxHeight, active, reduced }: { index: number; wallHeight: number; depth: number; count: number; maxHeight: number; active: boolean; reduced: boolean }) {
  const body = useRef<THREE.Mesh>(null);
  const cap = useRef<THREE.Mesh>(null);
  const bodyMaterial = useRef<THREE.MeshPhysicalMaterial>(null);
  const capMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const unit = unitForMax(maxHeight);
  const targetHeight = depth * unit;
  const floor = BASE_Y + wallBodyHeight(wallHeight, maxHeight);

  useLayoutEffect(() => {
    if (!body.current || !cap.current || !bodyMaterial.current || !capMaterial.current) return;
    body.current.scale.y = Math.max(0.001, targetHeight);
    body.current.position.y = floor + targetHeight / 2;
    cap.current.position.y = floor + targetHeight;
    bodyMaterial.current.opacity = depth > 0 ? 0.46 : 0;
    capMaterial.current.opacity = depth > 0 ? 0.78 : 0;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!body.current || !cap.current || !bodyMaterial.current || !capMaterial.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00042, delta);
    const wave = !reduced && depth > 0 ? Math.sin(clock.elapsedTime * 2.4 + index * 0.5) * 0.018 : 0;
    body.current.scale.y = THREE.MathUtils.lerp(body.current.scale.y, Math.max(0.001, targetHeight), amount);
    body.current.position.y = THREE.MathUtils.lerp(body.current.position.y, floor + targetHeight / 2, amount);
    cap.current.position.y = THREE.MathUtils.lerp(cap.current.position.y, floor + targetHeight + wave, amount);
    bodyMaterial.current.opacity = THREE.MathUtils.lerp(bodyMaterial.current.opacity, depth > 0 ? active ? 0.62 : 0.46 : 0, amount);
    capMaterial.current.opacity = THREE.MathUtils.lerp(capMaterial.current.opacity, depth > 0 ? active ? 1 : 0.78 : 0, amount);
    cap.current.scale.x = 1 + (!reduced && active ? Math.sin(clock.elapsedTime * 3.3) * 0.04 : 0);
  });

  return (
    <group>
      <mesh ref={body} position={[xForIndex(index, count), floor + targetHeight / 2, 0.01]} scale={[1, Math.max(0.001, targetHeight), 1]} renderOrder={2}>
        <boxGeometry args={[wallWidthForCount(count) * 0.9, 1, 0.64]} />
        <meshPhysicalMaterial ref={bodyMaterial} color={WATER_COLOR} emissive={WATER_COLOR} emissiveIntensity={active ? 0.45 : 0.2} transparent opacity={depth > 0 ? 0.46 : 0} transmission={0.1} roughness={0.12} metalness={0.1} depthWrite={false} />
      </mesh>
      <mesh ref={cap} position={[xForIndex(index, count), floor + targetHeight, 0.02]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <planeGeometry args={[wallWidthForCount(count) * 0.92, 0.64]} />
        <meshStandardMaterial ref={capMaterial} color={WATER_COLOR} emissive={WATER_COLOR} emissiveIntensity={active ? 1.15 : 0.65} transparent opacity={depth > 0 ? 0.78 : 0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {depth > 0 ? (
        <Html position={[xForIndex(index, count), floor + targetHeight / 2, 0.42]} center style={{ pointerEvents: "none" }}>
          <div data-rain-water-index={index} className="whitespace-nowrap rounded border border-cyan-300/65 bg-ink-950/94 px-1.5 py-0.5 font-mono text-[7px] font-black text-cyan-200 shadow-xl">+{depth}</div>
        </Html>
      ) : null}
    </group>
  );
}

function PointerMarker({ side, index, value, count, maxHeight, offset, labelOffsetX = 0, reduced }: { side: "left" | "right"; index: number; value: number; count: number; maxHeight: number; offset: number; labelOffsetX?: number; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const color = side === "left" ? LEFT_COLOR : RIGHT_COLOR;
  const targetX = xForIndex(index, count);
  const targetY = BASE_Y + wallBodyHeight(value, maxHeight) + offset;
  const targetZ = side === "left" ? 0.02 : 0.13;

  useLayoutEffect(() => {
    group.current?.position.set(targetX, targetY, targetZ);
  }, []);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00038, delta);
    const bob = reduced ? 0 : Math.sin(clock.elapsedTime * 3 + (side === "left" ? 0 : Math.PI)) * 0.035;
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetX, amount);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, targetY + bob, amount);
  });

  return (
    <group ref={group} position={[targetX, targetY, targetZ]}>
      <mesh rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.14, 0.28, 5]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.95} metalness={0.45} roughness={0.24} />
      </mesh>
      <Html position={[labelOffsetX, 0.29, 0.35]} center style={{ pointerEvents: "none" }}>
        <div data-rain-pointer={side} className="whitespace-nowrap rounded border bg-ink-950/96 px-1.5 py-0.5 font-mono text-[7px] font-black uppercase shadow-xl" style={{ borderColor: color, color }}>{side} = {index}</div>
      </Html>
    </group>
  );
}

function BoundaryGuides({ model }: { model: TrappingRainSceneModel }) {
  const count = Math.max(1, model.heights.length);
  const unit = unitForMax(model.maxHeight);
  const leftY = BASE_Y + 0.16 + model.leftMax * unit;
  const rightY = BASE_Y + 0.16 + model.rightMax * unit;
  const leftStart = xForIndex(0, count) - wallWidthForCount(count) / 2;
  const leftEnd = xForIndex(Math.min(count - 1, model.left), count) + wallWidthForCount(count) / 2;
  const rightStart = xForIndex(Math.max(0, model.right), count) - wallWidthForCount(count) / 2;
  const rightEnd = xForIndex(count - 1, count) + wallWidthForCount(count) / 2;
  return (
    <group>
      {model.leftMax > 0 ? (
        <>
          <Line points={[[leftStart, leftY, -0.08], [leftEnd, leftY, -0.08]]} color={LEFT_COLOR} lineWidth={2.4} transparent opacity={0.8} />
          <Html position={[leftStart, leftY + 0.16, 0.24]} center style={{ pointerEvents: "none" }}>
            <div className="whitespace-nowrap rounded border border-orange-400/55 bg-ink-950/94 px-1.5 py-0.5 font-mono text-[7px] font-black text-orange-200">left max {model.leftMax}</div>
          </Html>
        </>
      ) : null}
      {model.rightMax > 0 ? (
        <>
          <Line points={[[rightStart, rightY, -0.05], [rightEnd, rightY, -0.05]]} color={RIGHT_COLOR} lineWidth={2.4} transparent opacity={0.8} />
          <Html position={[rightEnd, rightY + 0.16, 0.24]} center style={{ pointerEvents: "none" }}>
            <div className="whitespace-nowrap rounded border border-purple-400/55 bg-ink-950/94 px-1.5 py-0.5 font-mono text-[7px] font-black text-purple-200">right max {model.rightMax}</div>
          </Html>
        </>
      ) : null}
    </group>
  );
}

function CompareBridge({ model, reduced }: { model: TrappingRainSceneModel; reduced: boolean }) {
  const pulse = useRef<THREE.Mesh>(null);
  const count = Math.max(1, model.heights.length);
  const active = model.operation === "compare";
  const leftTop = BASE_Y + wallBodyHeight(model.heights[model.left] ?? 0, model.maxHeight) + 0.18;
  const rightTop = BASE_Y + wallBodyHeight(model.heights[model.right] ?? 0, model.maxHeight) + 0.18;
  const left = new THREE.Vector3(xForIndex(model.left, count), leftTop, 0.22);
  const right = new THREE.Vector3(xForIndex(model.right, count), rightTop, 0.22);
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    left,
    new THREE.Vector3((left.x + right.x) / 2, Math.max(leftTop, rightTop) + 0.75, 0.42),
    right,
  ]), [left.x, leftTop, right.x, rightTop]);
  const color = model.decision === "left" ? LEFT_COLOR : RIGHT_COLOR;

  useFrame(({ clock }) => {
    if (!active || !pulse.current) return;
    pulse.current.position.copy(curve.getPointAt(reduced ? 0.72 : (clock.elapsedTime * 0.38) % 1));
  });

  if (!active) return null;
  return (
    <group>
      <Line points={curve.getPoints(52)} color={color} lineWidth={2.5} transparent opacity={0.86} />
      <mesh ref={pulse}><sphereGeometry args={[0.065, 16, 16]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} /></mesh>
      <Html position={[(left.x + right.x) / 2, Math.max(leftTop, rightTop) + 0.88, 0.42]} center style={{ pointerEvents: "none" }}>
        <div data-testid="rain-decision" className="whitespace-nowrap rounded-md border bg-ink-950/96 px-2 py-1 text-center shadow-xl" style={{ borderColor: color }}>
          <span className="block font-mono text-[7px] font-black uppercase text-ink-400">lower outside wall</span>
          <span className="mt-0.5 block font-mono text-[10px] font-black" style={{ color }}>{model.leftHeight} {model.decision === "left" ? "<=" : ">"} {model.rightHeight} · resolve {model.decision}</span>
        </div>
      </Html>
    </group>
  );
}

function ResolveColumn({ model, reduced }: { model: TrappingRainSceneModel; reduced: boolean }) {
  const ring = useRef<THREE.Mesh>(null);
  const active = model.activeIndex !== null && (model.operation === "trap-left" || model.operation === "trap-right" || model.operation === "raise-left" || model.operation === "raise-right");
  const count = Math.max(1, model.heights.length);
  const index = model.activeIndex ?? 0;
  const value = model.heights[index] ?? 0;
  const resolvedDepth = model.operation.startsWith("trap") ? model.waterAdded * unitForMax(model.maxHeight) : 0;
  const y = BASE_Y + wallBodyHeight(value, model.maxHeight) + resolvedDepth + 0.12;
  const color = model.operation.startsWith("trap") ? WATER_COLOR : ACTIVE_COLOR;
  useFrame(({ clock }, delta) => {
    if (!ring.current || !active) return;
    ring.current.rotation.z += reduced ? 0 : delta * 0.7;
    ring.current.scale.setScalar(reduced ? 1 : 1 + Math.sin(clock.elapsedTime * 3.4) * 0.08);
  });
  if (!active) return null;
  return (
    <group position={[xForIndex(index, count), y, 0.37]}>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[wallWidthForCount(count) * 0.62, 0.035, 12, 48]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

function TotalReservoir({ model, reduced, compact }: { model: TrappingRainSceneModel; reduced: boolean; compact: boolean }) {
  const ring = useRef<THREE.Group>(null);
  const fill = useRef<THREE.Mesh>(null);
  const maxPossible = Math.max(1, model.heights.length * model.maxHeight);
  const fillRatio = THREE.MathUtils.clamp(model.totalWater / maxPossible, 0.04, 1);
  useFrame(({ clock }, delta) => {
    if (!ring.current || !fill.current) return;
    ring.current.rotation.z += reduced ? 0 : delta * 0.2;
    fill.current.scale.x = THREE.MathUtils.lerp(fill.current.scale.x, fillRatio, reduced ? 1 : 1 - Math.pow(0.0007, delta));
    ring.current.scale.setScalar(!reduced && model.waterAdded > 0 ? 1 + Math.sin(clock.elapsedTime * 3.2) * 0.03 : 1);
  });
  return (
    <group position={[compact ? 2.25 : 2.95, 1.5, -0.02]}>
      <group ref={ring}>
        <mesh><torusGeometry args={[0.47, 0.046, 16, 64]} /><meshStandardMaterial color={WATER_COLOR} emissive={WATER_COLOR} emissiveIntensity={1.05} metalness={0.5} roughness={0.22} /></mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.59, 0.012, 12, 56]} /><meshBasicMaterial color={WATER_COLOR} transparent opacity={0.32} /></mesh>
      </group>
      <mesh position={[0, -0.65, 0.1]}>
        <boxGeometry args={[1.18, 0.08, 0.12]} />
        <meshStandardMaterial color="#111827" emissive="#111827" emissiveIntensity={0.1} />
      </mesh>
      <mesh ref={fill} position={[-0.59 * (1 - fillRatio), -0.65, 0.18]} scale={[fillRatio, 1, 1]}>
        <boxGeometry args={[1.18, 0.055, 0.06]} />
        <meshStandardMaterial color={WATER_COLOR} emissive={WATER_COLOR} emissiveIntensity={0.95} />
      </mesh>
      <Html position={[0, 0, 0.18]} center style={{ pointerEvents: "none" }}>
        <div className={`${compact ? "min-w-20 px-1.5" : "min-w-24 px-2"} rounded-md border border-cyan-400/60 bg-ink-950/96 py-1 text-center shadow-xl`}>
          <span className="block font-mono text-[6px] font-black uppercase text-ink-400">water collected</span>
          <span data-testid="rain-total" className="mt-0.5 block font-mono text-[12px] font-black tabular-nums text-cyan-200">{model.totalWater}</span>
        </div>
      </Html>
    </group>
  );
}

function InvalidMarker({ model }: { model: TrappingRainSceneModel }) {
  if (model.operation !== "invalid") return null;
  return (
    <group position={[0, -0.02, 0.72]}>
      <Line points={[[ -0.5, -0.5, 0], [0.5, 0.5, 0]]} color={INVALID_COLOR} lineWidth={5} />
      <Line points={[[ -0.5, 0.5, 0], [0.5, -0.5, 0]]} color={INVALID_COLOR} lineWidth={5} />
    </group>
  );
}

function Scene({ model, p, reduced }: { model: TrappingRainSceneModel; p: Theme3DPalette; reduced: boolean }) {
  const compact = useThree((state) => state.size.width < 500);
  const count = Math.max(1, model.heights.length);
  const stageWidth = Math.max(6.8, (count - 1) * gapForCount(count) + 2.1);
  const leftValue = model.heights[Math.max(0, Math.min(count - 1, model.left))] ?? 0;
  const rightValue = model.heights[Math.max(0, Math.min(count - 1, model.right))] ?? 0;

  return (
    <>
      <CameraRig stageWidth={stageWidth} reduced={reduced} />
      <fog attach="fog" args={[p.background, 13, 28]} />
      <ambientLight intensity={0.7 * p.lighting.ambient} />
      <directionalLight castShadow position={[4.8, 8, 5]} intensity={1.45 * p.lighting.directional} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-4, 2.2, 3]} intensity={22 * p.lighting.accent} distance={11} color={LEFT_COLOR} />
      <pointLight position={[0, 3.2, 3]} intensity={27 * p.lighting.accent} distance={13} color={WATER_COLOR} />
      <pointLight position={[4, 2.2, 3]} intensity={22 * p.lighting.accent} distance={11} color={RIGHT_COLOR} />

      <mesh position={[0, BASE_Y - 0.1, -0.08]} receiveShadow>
        <boxGeometry args={[stageWidth + 0.25, 0.16, 1.18]} />
        <meshStandardMaterial color={p.emptyCell} emissive={p.gridSection} emissiveIntensity={0.04} metalness={0.44} roughness={0.44} />
        <Edges color={p.gridSection} threshold={18} />
      </mesh>
      {model.tokens.map((token) => <Wall key={token.id} token={token} count={count} maxHeight={model.maxHeight} p={p} reduced={reduced} />)}
      {model.waterDepths.map((depth, index) => (
        <WaterVolume key={`water-${index}`} index={index} wallHeight={model.heights[index]} depth={depth} count={count} maxHeight={model.maxHeight} active={model.activeIndex === index && model.operation.startsWith("trap")} reduced={reduced} />
      ))}
      <BoundaryGuides model={model} />
      <PointerMarker side="left" index={model.left} value={Math.max(leftValue, model.leftMax)} count={count} maxHeight={model.maxHeight} offset={model.left === model.right ? 0.5 : 0.7} labelOffsetX={model.left === model.right ? -0.9 : 0} reduced={reduced} />
      <PointerMarker side="right" index={model.right} value={Math.max(rightValue, model.rightMax)} count={count} maxHeight={model.maxHeight} offset={model.left === model.right ? 0.5 : 0.7} labelOffsetX={model.left === model.right ? 0.9 : 0} reduced={reduced} />
      <CompareBridge model={model} reduced={reduced} />
      <ResolveColumn model={model} reduced={reduced} />
      {!compact ? <TotalReservoir model={model} reduced={reduced} compact={compact} /> : null}
      <InvalidMarker model={model} />

      <InfiniteGrid position={[0, BASE_Y - 0.22, -0.28]} cellSize={0.48} cellThickness={0.5} cellColor={p.gridCell} sectionSize={2.4} sectionThickness={0.88} sectionColor={p.gridSection} fadeDistance={24} fadeStrength={1} infiniteGrid />
      <OrbitControls enablePan={false} enableRotate enableZoom enableDamping dampingFactor={0.08} rotateSpeed={0.72} zoomSpeed={0.85} target={[0, -0.08, 0]} minDistance={7.2} maxDistance={20} minPolarAngle={0.36} maxPolarAngle={Math.PI / 2.04} />
    </>
  );
}

function Overlay({ model }: { model: TrappingRainSceneModel }) {
  const tone = model.operation === "invalid"
    ? "border-red-400/45 text-red-300"
    : model.operation === "compare"
      ? model.decision === "left" ? "border-orange-400/45 text-orange-200" : "border-purple-400/45 text-purple-200"
      : model.operation.startsWith("trap") || model.operation === "complete"
        ? "border-cyan-400/45 text-cyan-200"
        : "border-emerald-400/45 text-emerald-200";

  return (
    <>
      <div className="pointer-events-none absolute left-2 top-2 z-10 max-w-[14rem] rounded-md border border-cyan-400/30 bg-ink-950/88 px-2.5 py-1.5 shadow-xl backdrop-blur-md sm:left-3 sm:top-3 sm:max-w-[21rem]">
        <div className="flex items-center gap-1.5">
          <span className={`rounded border bg-ink-900/70 px-1.5 py-0.5 font-mono text-[8px] font-black uppercase ${tone}`}>rain water / {model.operation}</span>
          <span className="font-mono text-[8px] font-semibold uppercase text-ink-500">two pointers · O(n)</span>
        </div>
        <p data-testid="trapping-rain-headline" className="mt-1 text-xs font-black leading-tight text-ink-50 sm:text-[13px]">{model.headline}</p>
      </div>

      <div className="stage-hud-secondary rain-water-equation pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 items-center rounded-md border border-ink-700/70 bg-ink-950/90 px-3 py-2 shadow-xl backdrop-blur-md">
        <span className="max-w-80 truncate font-mono text-[11px] font-black tabular-nums text-ink-50">{model.equation ?? "water[i] = boundary max - height[i]"}</span>
      </div>

      <div className="stage-hud-secondary pointer-events-none absolute right-11 top-3 z-10 justify-end gap-1">
        {[["left max", model.leftMax], ["right max", model.rightMax], ["filled", model.filledCells], ["water", model.resultLabel]].map(([label, value]) => (
          <div key={label} className="min-w-10 rounded border border-ink-700/65 bg-ink-950/86 px-1.5 py-1 text-center shadow-lg backdrop-blur-md">
            <span className="block font-mono text-[7px] font-black uppercase text-ink-500">{label}</span>
            <span className="block font-mono text-[10px] font-black leading-tight text-ink-50">{value}</span>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 z-10 flex items-end justify-between gap-2 sm:left-4 sm:right-4">
        <p data-testid="trapping-rain-detail" className="max-w-[40rem] rounded-md border border-cyan-400/25 bg-ink-950/88 px-2.5 py-1.5 text-[11px] leading-snug text-ink-200 shadow-xl backdrop-blur-md">{model.detail}</p>
        <div className="stage-hud-legend ml-auto flex-wrap justify-end gap-1">
          <span className="rounded border border-orange-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-orange-200 backdrop-blur">orange left</span>
          <span className="rounded border border-purple-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-purple-200 backdrop-blur">violet right</span>
          <span className="rounded border border-cyan-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-cyan-200 backdrop-blur">cyan water</span>
        </div>
      </div>
    </>
  );
}

export function TrappingRainWaterStage3D({ step, steps }: { step: TraceStep; steps?: TraceStep[] }) {
  const model = getTrappingRainSceneModel(step);
  const p = useTheme3D();
  const reduced = Boolean(useReducedMotion());
  const hud = useStageHud();
  if (!model) return null;

  return (
    <div className="codeanvil-canvas-fill codeanvil-stage-frame relative h-full w-full overflow-hidden rounded-md @container">
      <Canvas shadows="basic" dpr={[1.25, 2]} data-testid="trapping-rain-water-stage-canvas" camera={{ position: [0, 3.65, 9.8], fov: 43 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} style={{ width: "100%", height: "100%", background: "transparent" }}>
        <CanvasSizeSync />
        <Scene model={model} p={p} reduced={reduced} />
      </Canvas>
      <HudToggle open={hud.hudOpen} onToggle={hud.toggleHud} />
      {hud.hudOpen ? <Overlay model={model} /> : null}
      <div className="rain-water-line-badge"><CodeLineBadge step={step} /></div>
      <StageProgressBar step={step} steps={steps} />
    </div>
  );
}
