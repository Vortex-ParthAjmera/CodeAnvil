import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import {
  getVariableWindowSceneModel,
  type VariableWindowSceneModel,
  type VariableWindowTokenModel,
} from "../../engine/variableWindowStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";
import { CodeLineBadge } from "./CodeLineBadge";
import { HudToggle, useStageHud } from "./StageHud";
import { StageProgressBar } from "./StageProgressBar";

const WINDOW_COLOR = "#22d3ee";
const VALID_COLOR = "#34d399";
const ADD_COLOR = "#fb923c";
const REMOVE_COLOR = "#fb7185";
const BEST_COLOR = "#a78bfa";
const INVALID_COLOR = "#f43f5e";

function gapForCount(count: number): number {
  if (count <= 7) return 0.9;
  return Math.max(0.5, 6.15 / Math.max(1, count - 1));
}

function tileWidthForCount(count: number): number {
  return Math.max(0.34, Math.min(0.6, gapForCount(count) * 0.7));
}

function xForIndex(index: number, count: number): number {
  return (index - (count - 1) / 2) * gapForCount(count);
}

function CameraRig({ stageWidth, reduced }: { stageWidth: number; reduced: boolean }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const target = useRef(new THREE.Vector3(0, 3.75, Math.max(9.6, stageWidth * 0.94 + 3.35)));
  const reframing = useRef(true);

  useLayoutEffect(() => {
    camera.position.copy(target.current);
    camera.lookAt(0, 0.06, 0);
  }, [camera]);

  useEffect(() => {
    target.current.set(0, 3.75, Math.max(9.6, stageWidth * 0.94 + 3.35));
    reframing.current = true;
  }, [stageWidth]);

  useFrame((_, delta) => {
    if (!reframing.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.0008, delta);
    camera.position.lerp(target.current, amount);
    camera.lookAt(0, 0.06, 0);
    if (camera.position.distanceTo(target.current) < 0.012) {
      camera.position.copy(target.current);
      camera.lookAt(0, 0.06, 0);
      reframing.current = false;
    }
  });
  return null;
}

function roleColor(role: VariableWindowTokenModel["role"], p: Theme3DPalette): string {
  if (role === "incoming") return ADD_COLOR;
  if (role === "outgoing" || role === "invalid") return REMOVE_COLOR;
  if (role === "valid-window") return VALID_COLOR;
  if (role === "best-window") return BEST_COLOR;
  if (role === "best") return p.verdant;
  if (role === "window") return WINDOW_COLOR;
  if (role === "processed") return p.barRange;
  return p.barDefault;
}

function RailSlot({ index, count, p }: { index: number; count: number; p: Theme3DPalette }) {
  return (
    <group position={[xForIndex(index, count), -0.98, -0.05]}>
      <mesh receiveShadow>
        <boxGeometry args={[tileWidthForCount(count) + 0.09, 0.13, 0.84]} />
        <meshStandardMaterial color={p.emptyCell} emissive={p.gridSection} emissiveIntensity={0.05} metalness={0.42} roughness={0.4} />
        <Edges color={p.gridSection} threshold={18} />
      </mesh>
      <Html position={[0, -0.23, 0.42]} center style={{ pointerEvents: "none" }}>
        <div className="rounded border border-ink-700/65 bg-ink-950/92 px-1.5 py-0.5 font-mono text-[7px] font-black leading-none text-ink-400 shadow-lg">i={index}</div>
      </Html>
    </group>
  );
}

function ValueToken({ token, count, p, reduced, compact }: { token: VariableWindowTokenModel; count: number; p: Theme3DPalette; reduced: boolean; compact: boolean }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const color = roleColor(token.role, p);
  const targetColor = useMemo(() => new THREE.Color(color), [color]);
  const active = token.role === "window" || token.role === "valid-window" || token.role === "best-window" || token.role === "incoming";
  const targetY = -0.69 + (token.role === "incoming" ? 0.26 : token.role === "outgoing" ? 0.2 : active ? 0.09 : 0);

  useLayoutEffect(() => {
    group.current?.position.set(xForIndex(token.index, count), targetY, 0.08);
  }, []);

  useFrame(({ clock }, delta) => {
    if (!group.current || !body.current || !material.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00065, delta);
    const pulse = !reduced && (token.role === "incoming" || token.role === "outgoing")
      ? Math.sin(clock.elapsedTime * 3.8) * 0.035
      : 0;
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, targetY + pulse, amount);
    const scale = token.role === "incoming" || token.role === "outgoing" ? 1.14 : active ? 1.06 : 1;
    body.current.scale.setScalar(THREE.MathUtils.lerp(body.current.scale.x, scale, amount));
    material.current.color.lerp(targetColor, amount);
    material.current.emissive.lerp(targetColor, amount);
    material.current.emissiveIntensity = THREE.MathUtils.lerp(material.current.emissiveIntensity, active ? 0.58 : 0.08, amount);
  });

  return (
    <group ref={group} position={[xForIndex(token.index, count), targetY, 0.08]}>
      <mesh ref={body} castShadow receiveShadow>
        <boxGeometry args={[tileWidthForCount(count), 0.46, 0.68]} />
        <meshStandardMaterial ref={material} color={color} emissive={color} emissiveIntensity={active ? 0.58 : 0.08} metalness={0.48} roughness={0.27} />
        <Edges color={active ? p.textStrong : color} threshold={18} />
      </mesh>
      <Html position={[0, 0.03, 0.39]} center style={{ pointerEvents: "none" }}>
        <div data-variable-window-token={token.id} className="stage-value-card" style={{ borderColor: color }}>{token.value}</div>
      </Html>
      {!compact && (token.role === "incoming" || token.role === "outgoing") ? (
        <Html position={[0, 0.36, 0.43]} center style={{ pointerEvents: "none" }}>
          <div className="rounded border bg-ink-950/96 px-1.5 py-0.5 font-mono text-[7px] font-black uppercase shadow-xl" style={{ borderColor: color, color }}>
            {token.role === "incoming" ? "right +" : "left -"}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function ElasticWindow({ model, reduced }: { model: VariableWindowSceneModel; reduced: boolean }) {
  const cage = useRef<THREE.Group>(null);
  const shell = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const leftMarker = useRef<THREE.Group>(null);
  const rightMarker = useRef<THREE.Group>(null);
  const count = Math.max(1, model.tokens.length);
  const range = model.displayRange;
  const safeStart = THREE.MathUtils.clamp(range?.[0] ?? 0, 0, count - 1);
  const safeEnd = THREE.MathUtils.clamp(range?.[1] ?? safeStart, safeStart, count - 1);
  const leftX = xForIndex(safeStart, count);
  const rightX = xForIndex(safeEnd, count);
  const targetCenter = (leftX + rightX) / 2;
  const targetWidth = Math.max(0.76, rightX - leftX + tileWidthForCount(count) + 0.3);
  const hasRange = range !== null;
  const color = model.operation === "invalid"
    ? INVALID_COLOR
    : model.operation === "complete" || model.operation === "new-best"
      ? BEST_COLOR
      : model.windowValid
        ? VALID_COLOR
        : WINDOW_COLOR;
  const targetColor = useMemo(() => new THREE.Color(color), [color]);

  useLayoutEffect(() => {
    if (cage.current) cage.current.position.x = targetCenter;
    if (shell.current) shell.current.scale.x = targetWidth;
    if (leftMarker.current) leftMarker.current.position.x = leftX;
    if (rightMarker.current) rightMarker.current.position.x = rightX;
  }, []);

  useFrame((_, delta) => {
    if (!cage.current || !shell.current || !material.current || !leftMarker.current || !rightMarker.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00038, delta);
    cage.current.position.x = THREE.MathUtils.lerp(cage.current.position.x, targetCenter, amount);
    shell.current.scale.x = THREE.MathUtils.lerp(shell.current.scale.x, targetWidth, amount);
    leftMarker.current.position.x = THREE.MathUtils.lerp(leftMarker.current.position.x, leftX, amount);
    rightMarker.current.position.x = THREE.MathUtils.lerp(rightMarker.current.position.x, rightX, amount);
    material.current.color.lerp(targetColor, amount);
    material.current.emissive.lerp(targetColor, amount);
    material.current.opacity = THREE.MathUtils.lerp(material.current.opacity, hasRange ? 0.17 : 0.05, amount);
  });

  const label = model.operation === "complete" && model.bestRange
    ? `answer [${safeStart}..${safeEnd}]`
    : hasRange
      ? `window [${safeStart}..${safeEnd}]`
      : "empty window";

  return (
    <group>
      <group ref={cage} position={[0, -0.5, 0]}>
        <mesh ref={shell} scale={[1, 1, 1]}>
          <boxGeometry args={[1, 1.14, 0.98]} />
          <meshStandardMaterial ref={material} color={color} emissive={color} emissiveIntensity={0.42} transparent opacity={hasRange ? 0.17 : 0.05} depthWrite={false} metalness={0.34} roughness={0.3} />
          <Edges color={color} threshold={18} />
        </mesh>
        <Html position={[0, 0.73, 0.4]} center style={{ pointerEvents: "none" }}>
          <div data-testid="variable-window-frame-label" className="whitespace-nowrap rounded border bg-ink-950/96 px-2 py-1 font-mono text-[8px] font-black uppercase shadow-xl" style={{ borderColor: color, color }}>
            {label}
          </div>
        </Html>
      </group>
      <group ref={leftMarker} visible={hasRange} position={[0, -1.42, 0.24]}>
        <mesh rotation={[0, 0, Math.PI]}><coneGeometry args={[0.09, 0.22, 18]} /><meshStandardMaterial color={REMOVE_COLOR} emissive={REMOVE_COLOR} emissiveIntensity={0.7} /></mesh>
        {hasRange ? <Html position={[0, -0.22, 0.18]} center style={{ pointerEvents: "none" }}><div className="rounded border border-red-400/45 bg-ink-950/95 px-1.5 py-0.5 font-mono text-[7px] font-black text-red-200">L={safeStart}</div></Html> : null}
      </group>
      <group ref={rightMarker} visible={hasRange} position={[0, -1.42, 0.24]}>
        <mesh rotation={[0, 0, Math.PI]}><coneGeometry args={[0.09, 0.22, 18]} /><meshStandardMaterial color={ADD_COLOR} emissive={ADD_COLOR} emissiveIntensity={0.7} /></mesh>
        {hasRange ? <Html position={[0, -0.22, 0.18]} center style={{ pointerEvents: "none" }}><div className="rounded border border-orange-400/45 bg-ink-950/95 px-1.5 py-0.5 font-mono text-[7px] font-black text-orange-200">R={safeEnd}</div></Html> : null}
      </group>
    </group>
  );
}

function TargetGate({ model, reduced, compact }: { model: VariableWindowSceneModel; reduced: boolean; compact: boolean }) {
  const ring = useRef<THREE.Group>(null);
  const fill = useRef<THREE.Mesh>(null);
  const fillMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const color = model.operation === "invalid" ? INVALID_COLOR : model.displayValid ? VALID_COLOR : WINDOW_COLOR;
  const targetColor = useMemo(() => new THREE.Color(color), [color]);
  const progress = model.target > 0 ? THREE.MathUtils.clamp(model.displaySum / model.target, 0, 1) : 0;

  useLayoutEffect(() => {
    if (!fill.current) return;
    fill.current.scale.x = Math.max(0.015, progress);
    fill.current.position.x = -0.66 * (1 - progress);
  }, []);

  useFrame(({ clock }, delta) => {
    if (!ring.current || !fill.current || !fillMaterial.current) return;
    ring.current.rotation.z += reduced ? 0 : delta * (model.displayValid ? 0.34 : 0.2);
    const pulse = !reduced && model.displayValid ? 1 + Math.sin(clock.elapsedTime * 3.2) * 0.035 : 1;
    ring.current.scale.setScalar(pulse);
    const amount = reduced ? 1 : 1 - Math.pow(0.00065, delta);
    fill.current.scale.x = THREE.MathUtils.lerp(fill.current.scale.x, Math.max(0.015, progress), amount);
    fill.current.position.x = THREE.MathUtils.lerp(fill.current.position.x, -0.66 * (1 - progress), amount);
    fillMaterial.current.color.lerp(targetColor, amount);
    fillMaterial.current.emissive.lerp(targetColor, amount);
  });

  return (
    <group position={[compact ? -2.05 : 0, compact ? 1.18 : 1.03, 0.03]}>
      <group ref={ring}>
        <mesh><torusGeometry args={[0.58, 0.055, 18, 72]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.05} metalness={0.55} roughness={0.22} /></mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.73, 0.014, 12, 64]} /><meshBasicMaterial color={color} transparent opacity={0.34} /></mesh>
      </group>
      <group position={[0, -0.76, 0.18]}>
        <mesh><boxGeometry args={[1.32, 0.11, 0.18]} /><meshStandardMaterial color="#111827" emissive="#111827" emissiveIntensity={0.1} /></mesh>
        <mesh ref={fill} position={[0, 0, 0.1]} scale={[1, 1, 1]}>
          <boxGeometry args={[1.32, 0.07, 0.08]} />
          <meshStandardMaterial ref={fillMaterial} color={color} emissive={color} emissiveIntensity={0.8} />
        </mesh>
      </group>
      <Html position={[0, 0.02, 0.2]} center style={{ pointerEvents: "none" }}>
        <div className={`${compact ? "min-w-20 px-1.5 py-1" : "min-w-28 px-2.5 py-1.5"} rounded-md border bg-ink-950/96 text-center shadow-xl`} style={{ borderColor: color }}>
          <span className={`block font-mono font-black uppercase tracking-widest text-ink-400 ${compact ? "text-[6px]" : "text-[7px]"}`}>sum / target</span>
          <span data-testid="variable-window-sum" className={`mt-0.5 block font-mono font-black tabular-nums ${compact ? "text-[11px]" : "text-[13px]"}`} style={{ color }}>{model.displaySum} / {model.target}</span>
          <span className={`mt-0.5 block font-mono font-bold uppercase ${compact ? "text-[6px]" : "text-[7px]"}`} style={{ color }}>{model.operation === "complete" ? "answer verified" : model.displayValid ? "shrink left" : "expand right"}</span>
        </div>
      </Html>
    </group>
  );
}

function TransferArc({ model, reduced, compact }: { model: VariableWindowSceneModel; reduced: boolean; compact: boolean }) {
  const pulse = useRef<THREE.Mesh>(null);
  const index = model.transferKind === "remove" ? model.outgoingIndex : model.incomingIndex;
  const safeIndex = Math.max(0, index ?? 0);
  const count = Math.max(1, model.tokens.length);
  const color = model.transferKind === "remove" ? REMOVE_COLOR : ADD_COLOR;
  const direction = model.transferKind === "remove" ? -1 : 1;
  const gateX = compact ? -2.05 : 0;
  const tokenX = xForIndex(safeIndex, count);
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(tokenX, -0.42, 0.3),
    new THREE.Vector3((tokenX + gateX) / 2 + direction * 0.28, 0.28, 0.42),
    new THREE.Vector3(gateX + direction * 0.3, 0.94, 0.26),
  ]), [direction, gateX, tokenX]);

  useFrame(({ clock }) => {
    if (!pulse.current) return;
    pulse.current.position.copy(curve.getPointAt(reduced ? 0.78 : (clock.elapsedTime * 0.42) % 1));
  });

  if (!model.transferKind || index === null || index === undefined) return null;
  return (
    <group>
      <Line points={curve.getPoints(44)} color={color} lineWidth={2.4} transparent opacity={0.82} />
      <mesh ref={pulse}><sphereGeometry args={[0.065, 16, 16]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} /></mesh>
    </group>
  );
}

function BestDock({ model, p, compact }: { model: VariableWindowSceneModel; p: Theme3DPalette; compact: boolean }) {
  const x = compact ? 2.35 : 2.62;
  const hasBest = model.bestRange !== null && model.bestLength !== null;
  return (
    <group position={[x, compact ? 1.03 : 0.92, -0.06]}>
      <mesh position={[0, -0.12, -0.04]} receiveShadow>
        <boxGeometry args={[1.42, 0.13, 0.78]} />
        <meshStandardMaterial color={p.emptyCell} emissive={BEST_COLOR} emissiveIntensity={hasBest ? 0.24 : 0.07} metalness={0.44} roughness={0.36} />
        <Edges color={hasBest ? BEST_COLOR : p.gridSection} threshold={18} />
      </mesh>
      {hasBest ? model.bestValues.slice(0, 5).map((value, index) => {
        const spacing = Math.min(0.27, 0.95 / Math.max(1, model.bestValues.slice(0, 5).length - 1));
        return (
          <mesh key={`${model.bestRange?.[0]}-${index}`} position={[(index - (model.bestValues.slice(0, 5).length - 1) / 2) * spacing, 0.12, 0]}>
            <boxGeometry args={[0.21, 0.25, 0.5]} />
            <meshStandardMaterial color={BEST_COLOR} emissive={BEST_COLOR} emissiveIntensity={0.56} metalness={0.45} roughness={0.28} />
            <Edges color={p.textStrong} threshold={18} />
            <Html position={[0, 0.01, 0.28]} center style={{ pointerEvents: "none" }}><div className="font-mono text-[7px] font-black text-ink-950">{value}</div></Html>
          </mesh>
        );
      }) : null}
      <Html position={[0, 0.58, 0.22]} center style={{ pointerEvents: "none" }}>
        <div className={`${compact ? "min-w-20 px-1.5 py-1" : "min-w-28 px-2 py-1.5"} rounded-md border border-purple-400/50 bg-ink-950/96 text-center shadow-xl`}>
          <span className={`block font-mono font-black uppercase tracking-widest text-ink-400 ${compact ? "text-[6px]" : "text-[7px]"}`}>shortest saved</span>
          <span className={`mt-0.5 block font-mono font-black tabular-nums text-purple-300 ${compact ? "text-[9px]" : "text-[11px]"}`}>
            {hasBest ? `len ${model.bestLength} @ [${model.bestRange?.[0]}..${model.bestRange?.[1]}]` : "not found"}
          </span>
        </div>
      </Html>
    </group>
  );
}

function InvalidMarker({ model }: { model: VariableWindowSceneModel }) {
  if (model.operation !== "invalid") return null;
  return (
    <group position={[0, -0.08, 0.52]}>
      <Line points={[[-0.45, -0.45, 0], [0.45, 0.45, 0]]} color={INVALID_COLOR} lineWidth={5} />
      <Line points={[[-0.45, 0.45, 0], [0.45, -0.45, 0]]} color={INVALID_COLOR} lineWidth={5} />
    </group>
  );
}

function Scene({ model, p, reduced }: { model: VariableWindowSceneModel; p: Theme3DPalette; reduced: boolean }) {
  const compact = useThree((state) => state.size.width < 500);
  const count = Math.max(1, model.tokens.length);
  const stageWidth = Math.max(6.6, (count - 1) * gapForCount(count) + 2);

  return (
    <>
      <CameraRig stageWidth={stageWidth} reduced={reduced} />
      <fog attach="fog" args={[p.background, 12, 25]} />
      <ambientLight intensity={0.72 * p.lighting.ambient} />
      <directionalLight castShadow position={[4.5, 7.5, 5]} intensity={1.4 * p.lighting.directional} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-4, 1.8, 3]} intensity={22 * p.lighting.accent} distance={10} color={REMOVE_COLOR} />
      <pointLight position={[0, 2.8, 3]} intensity={25 * p.lighting.accent} distance={11} color={VALID_COLOR} />
      <pointLight position={[4, 1.8, 3]} intensity={22 * p.lighting.accent} distance={10} color={ADD_COLOR} />

      <mesh position={[0, -1.09, -0.15]} receiveShadow>
        <boxGeometry args={[stageWidth + 0.3, 0.16, 1.52]} />
        <meshStandardMaterial color={p.emptyCell} metalness={0.4} roughness={0.46} />
        <Edges color={p.gridSection} threshold={18} />
      </mesh>
      {Array.from({ length: count }, (_, index) => <RailSlot key={index} index={index} count={count} p={p} />)}
      {model.tokens.map((token) => <ValueToken key={token.id} token={token} count={count} p={p} reduced={reduced} compact={compact} />)}
      <ElasticWindow model={model} reduced={reduced} />
      <TargetGate model={model} reduced={reduced} compact={compact} />
      <TransferArc model={model} reduced={reduced} compact={compact} />
      <BestDock model={model} p={p} compact={compact} />
      <InvalidMarker model={model} />

      <InfiniteGrid position={[0, -1.62, -0.24]} cellSize={0.48} cellThickness={0.5} cellColor={p.gridCell} sectionSize={2.4} sectionThickness={0.88} sectionColor={p.gridSection} fadeDistance={22} fadeStrength={1} infiniteGrid />
      <OrbitControls enablePan={false} enableRotate enableZoom enableDamping dampingFactor={0.08} rotateSpeed={0.72} zoomSpeed={0.85} target={[0, 0.06, 0]} minDistance={6.8} maxDistance={18} minPolarAngle={0.38} maxPolarAngle={Math.PI / 2.04} />
    </>
  );
}

function Overlay({ model }: { model: VariableWindowSceneModel }) {
  const tone = model.operation === "invalid"
    ? "border-red-400/45 text-red-300"
    : model.operation === "new-best" || model.operation === "complete"
      ? "border-purple-400/45 text-purple-200"
      : model.windowValid
        ? "border-emerald-400/45 text-emerald-200"
        : "border-cyan-400/45 text-cyan-200";

  return (
    <>
      <div className="pointer-events-none absolute left-2 top-2 z-10 max-w-[14rem] rounded-md border border-cyan-400/30 bg-ink-950/88 px-2.5 py-1.5 shadow-xl backdrop-blur-md sm:left-3 sm:top-3 sm:max-w-[21rem]">
        <div className="flex items-center gap-1.5">
          <span className={`rounded border bg-ink-900/70 px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-widest ${tone}`}>variable / {model.operation}</span>
          <span className="font-mono text-[8px] font-semibold uppercase tracking-wider text-ink-500">O(n)</span>
        </div>
        <p data-testid="variable-window-headline" className="mt-1 text-xs font-black leading-tight text-ink-50 sm:text-[13px]">{model.headline}</p>
      </div>

      <div className="stage-hud-secondary variable-window-equation pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 items-center rounded-md border border-ink-700/70 bg-ink-950/90 px-3 py-2 shadow-xl backdrop-blur-md">
        <span className="max-w-80 truncate font-mono text-[11px] font-black tabular-nums text-ink-50">{model.equation ?? `sum = ${model.currentSum}`}</span>
      </div>

      <div className="stage-hud-secondary pointer-events-none absolute right-11 top-3 z-10 justify-end gap-1">
        {[["target", model.target], ["sum", model.displaySum], ["best len", model.resultLabel], ["moves", model.expansions + model.contractions]].map(([label, value]) => (
          <div key={label} className="min-w-10 rounded border border-ink-700/65 bg-ink-950/86 px-1.5 py-1 text-center shadow-lg backdrop-blur-md">
            <span className="block font-mono text-[7px] font-black uppercase tracking-widest text-ink-500">{label}</span>
            <span className="block font-mono text-[10px] font-black leading-tight text-ink-50">{value}</span>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 z-10 flex items-end justify-between gap-2 sm:left-4 sm:right-4">
        <p data-testid="variable-window-detail" className="max-w-[39rem] rounded-md border border-cyan-400/25 bg-ink-950/88 px-2.5 py-1.5 text-[11px] leading-snug text-ink-200 shadow-xl backdrop-blur-md">{model.detail}</p>
        <div className="stage-hud-legend ml-auto flex-wrap justify-end gap-1">
          <span className="rounded border border-orange-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-orange-200 backdrop-blur">orange enters</span>
          <span className="rounded border border-red-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-red-200 backdrop-blur">red leaves</span>
          <span className="rounded border border-purple-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-purple-200 backdrop-blur">violet shortest</span>
        </div>
      </div>
    </>
  );
}

export function VariableWindowStage3D({ step, steps }: { step: TraceStep; steps?: TraceStep[] }) {
  const model = getVariableWindowSceneModel(step);
  const p = useTheme3D();
  const reduced = Boolean(useReducedMotion());
  const hud = useStageHud();
  if (!model) return null;

  return (
    <div className="codeanvil-canvas-fill codeanvil-stage-frame relative h-full w-full overflow-hidden rounded-md @container">
      <Canvas shadows="basic" dpr={[1.25, 2]} data-testid="variable-window-stage-canvas" camera={{ position: [0, 3.75, 9.6], fov: 43 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} style={{ width: "100%", height: "100%", background: "transparent" }}>
        <CanvasSizeSync />
        <Scene model={model} p={p} reduced={reduced} />
      </Canvas>
      <HudToggle open={hud.hudOpen} onToggle={hud.toggleHud} />
      {hud.hudOpen ? <Overlay model={model} /> : null}
      <div className="variable-window-line-badge"><CodeLineBadge step={step} /></div>
      <StageProgressBar step={step} steps={steps} />
    </div>
  );
}
