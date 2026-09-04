import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import {
  getMajorityVoteSceneModel,
  type MajorityVoteSceneModel,
  type MajorityVoteTokenModel,
} from "../../engine/majorityVoteStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";
import { CodeLineBadge } from "./CodeLineBadge";
import { HudToggle, useStageHud } from "./StageHud";
import { StageProgressBar } from "./StageProgressBar";

const SUPPORT_COLOR = "#22d3ee";
const VERIFIED_COLOR = "#34d399";
const CANCEL_COLOR = "#fb7185";
const CANDIDATE_COLOR = "#fb923c";
const CHECK_COLOR = "#60a5fa";

function gapForCount(count: number): number {
  if (count <= 8) return 0.84;
  return Math.max(0.5, 6.1 / Math.max(1, count - 1));
}

function tileWidthForCount(count: number): number {
  return Math.max(0.34, Math.min(0.58, gapForCount(count) * 0.68));
}

function xForIndex(index: number, count: number): number {
  return (index - (count - 1) / 2) * gapForCount(count);
}

function CameraRig({ stageWidth, reduced }: { stageWidth: number; reduced: boolean }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const target = useMemo(() => new THREE.Vector3(0, 3.7, Math.max(9.4, stageWidth * 0.92 + 3.5)), [stageWidth]);

  useLayoutEffect(() => {
    camera.position.copy(target);
    camera.lookAt(0, 0.18, 0);
  }, [camera, target]);

  useFrame((_, delta) => {
    const amount = reduced ? 1 : 1 - Math.pow(0.0008, delta);
    camera.position.lerp(target, amount);
    camera.lookAt(0, 0.18, 0);
  });
  return null;
}

function roleColor(role: MajorityVoteTokenModel["role"], p: Theme3DPalette): string {
  if (role === "current") return CANDIDATE_COLOR;
  if (role === "supporter") return SUPPORT_COLOR;
  if (role === "cancelled" || role === "verify-miss") return CANCEL_COLOR;
  if (role === "verified") return VERIFIED_COLOR;
  if (role === "candidate-match") return CHECK_COLOR;
  if (role === "processed") return p.barRange;
  return p.barDefault;
}

function RailSlot({ index, count, p }: { index: number; count: number; p: Theme3DPalette }) {
  return (
    <group position={[xForIndex(index, count), -1.06, -0.04]}>
      <mesh receiveShadow>
        <boxGeometry args={[tileWidthForCount(count) + 0.08, 0.14, 0.8]} />
        <meshStandardMaterial color={p.emptyCell} emissive={p.gridSection} emissiveIntensity={0.05} metalness={0.42} roughness={0.4} />
        <Edges color={p.gridSection} threshold={18} />
      </mesh>
      <Html position={[0, -0.23, 0.4]} center style={{ pointerEvents: "none" }}>
        <div className="rounded border border-ink-700/65 bg-ink-950/92 px-1.5 py-0.5 font-mono text-[7px] font-black leading-none text-ink-400 shadow-lg">i={index}</div>
      </Html>
    </group>
  );
}

function VoteToken({ token, count, p, reduced }: { token: MajorityVoteTokenModel; count: number; p: Theme3DPalette; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const color = roleColor(token.role, p);
  const targetColor = useMemo(() => new THREE.Color(color), [color]);
  const active = token.role === "current" || token.role === "supporter" || token.role === "verified";
  const targetY = -0.82 + (token.role === "current" ? 0.24 : active ? 0.1 : 0);

  useLayoutEffect(() => {
    group.current?.position.set(xForIndex(token.index, count), targetY, 0.08);
  }, []);

  useFrame(({ clock }, delta) => {
    if (!group.current || !body.current || !material.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00065, delta);
    const pulse = !reduced && token.role === "current" ? Math.sin(clock.elapsedTime * 3.4) * 0.04 : 0;
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, targetY + pulse, amount);
    const targetScale = token.role === "current" ? 1.15 : active ? 1.06 : token.role === "cancelled" || token.role === "verify-miss" ? 0.9 : 1;
    body.current.scale.setScalar(THREE.MathUtils.lerp(body.current.scale.x, targetScale, amount));
    material.current.color.lerp(targetColor, amount);
    material.current.emissive.lerp(targetColor, amount);
    material.current.emissiveIntensity = THREE.MathUtils.lerp(
      material.current.emissiveIntensity,
      token.role === "current" ? 0.95 : active ? 0.54 : token.role === "cancelled" || token.role === "verify-miss" ? 0.12 : 0.08,
      amount,
    );
  });

  return (
    <group ref={group} position={[xForIndex(token.index, count), targetY, 0.08]}>
      <mesh ref={body} castShadow receiveShadow>
        <boxGeometry args={[tileWidthForCount(count), 0.42, 0.72]} />
        <meshStandardMaterial ref={material} color={color} emissive={color} emissiveIntensity={active ? 0.54 : 0.08} metalness={0.48} roughness={0.27} />
        <Edges color={active ? p.textStrong : color} threshold={18} />
      </mesh>
      <Html position={[0, 0.04, 0.43]} center style={{ pointerEvents: "none" }}>
        <div data-majority-token={token.id} className="stage-value-card" style={{ borderColor: color }}>{token.value}</div>
      </Html>
      {token.role === "current" ? (
        <Html position={[0, 0.48, 0.2]} center style={{ pointerEvents: "none" }}>
          <div className="rounded border border-orange-400/60 bg-ink-950/95 px-1.5 py-0.5 font-mono text-[7px] font-black uppercase text-orange-200 shadow-xl">read</div>
        </Html>
      ) : null}
      {token.role === "cancelled" ? (
        <group position={[0, 0.02, 0.48]}>
          <Line points={[[-0.13, -0.12, 0], [0.13, 0.12, 0]]} color={CANCEL_COLOR} lineWidth={2} />
          <Line points={[[-0.13, 0.12, 0], [0.13, -0.12, 0]]} color={CANCEL_COLOR} lineWidth={2} />
        </group>
      ) : null}
    </group>
  );
}

function ScanPointer({ model, p, reduced }: { model: MajorityVoteSceneModel; p: Theme3DPalette; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const targetX = model.currentIndex < 0 ? 0 : xForIndex(model.currentIndex, model.tokens.length);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00045, delta);
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetX, amount);
    group.current.position.y = reduced ? 0 : Math.sin(clock.elapsedTime * 2.8) * 0.018;
  });

  if (model.currentIndex < 0) return null;

  return (
    <group ref={group} position={[targetX, 0, 0]}>
      <mesh position={[0, -0.1, 0.04]}>
        <cylinderGeometry args={[0.015, 0.045, 0.96, 16]} />
        <meshBasicMaterial color={model.verifying ? VERIFIED_COLOR : CANDIDATE_COLOR} transparent opacity={0.82} />
      </mesh>
      <mesh position={[0, 0.4, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.15, 0.03, 14, 44]} />
        <meshStandardMaterial color={model.verifying ? VERIFIED_COLOR : CANDIDATE_COLOR} emissive={model.verifying ? VERIFIED_COLOR : CANDIDATE_COLOR} emissiveIntensity={1.2} />
      </mesh>
      <Html position={[0, 0.72, 0.12]} center style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded border bg-ink-950/95 px-1.5 py-1 font-mono text-[8px] font-black uppercase shadow-xl" style={{ borderColor: model.verifying ? VERIFIED_COLOR : CANDIDATE_COLOR, color: p.textStrong }}>
          {model.verifying ? "verify" : "scan"}={model.currentIndex}
        </div>
      </Html>
    </group>
  );
}

function CandidateCore({ model, reduced }: { model: MajorityVoteSceneModel; reduced: boolean }) {
  const ring = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const color = model.operation === "verified"
    ? VERIFIED_COLOR
    : model.operation === "rejected"
      ? CANCEL_COLOR
      : model.verifying
        ? CHECK_COLOR
        : CANDIDATE_COLOR;
  const targetColor = useMemo(() => new THREE.Color(color), [color]);

  useFrame(({ clock }, delta) => {
    if (!ring.current || !material.current) return;
    ring.current.rotation.z += reduced ? 0 : delta * 0.22;
    ring.current.scale.setScalar(reduced ? 1 : 1 + Math.sin(clock.elapsedTime * 2.5) * 0.025);
    const amount = reduced ? 1 : 1 - Math.pow(0.0008, delta);
    material.current.color.lerp(targetColor, amount);
    material.current.emissive.lerp(targetColor, amount);
  });

  return (
    <group position={[0, 0.92, 0.06]}>
      <group ref={ring}>
        <mesh>
          <torusGeometry args={[0.54, 0.05, 18, 72]} />
          <meshStandardMaterial ref={material} color={color} emissive={color} emissiveIntensity={1.05} metalness={0.55} roughness={0.22} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.68, 0.015, 12, 64]} />
          <meshBasicMaterial color={color} transparent opacity={0.42} />
        </mesh>
      </group>
      <mesh>
        <sphereGeometry args={[0.1, 20, 20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
      </mesh>
      <Html position={[0, 0.02, 0.2]} center style={{ pointerEvents: "none" }}>
        <div className="min-w-20 rounded-md border bg-ink-950/96 px-2.5 py-1.5 text-center shadow-xl" style={{ borderColor: color }}>
          <span className="block font-mono text-[7px] font-black uppercase tracking-widest text-ink-400">{model.verifying ? "candidate / proof" : "candidate / balance"}</span>
          <span className="mt-0.5 block font-mono text-[12px] font-black tabular-nums" style={{ color }}>
            {model.candidate ?? "-"} <span className="text-ink-500">/</span> {model.verifying ? `${model.verificationCount}/${model.required}` : model.balance}
          </span>
        </div>
      </Html>
      <Html position={[0, -0.78, 0.12]} center style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded border border-ink-700/70 bg-ink-950/92 px-2 py-1 font-mono text-[7px] font-black uppercase tracking-widest text-ink-300 shadow-xl">{model.actionLabel}</div>
      </Html>
    </group>
  );
}

function BalanceTower({ model, p, compact }: { model: MajorityVoteSceneModel; p: Theme3DPalette; compact: boolean }) {
  if (model.verifying) return null;
  const visible = Math.min(model.balance, 8);
  return (
    <group position={[compact ? 2.15 : 2.5, 0.36, 0]}>
      <mesh position={[0, -0.08, -0.04]} receiveShadow>
        <boxGeometry args={[0.88, 0.1, 0.78]} />
        <meshStandardMaterial color={p.emptyCell} emissive={SUPPORT_COLOR} emissiveIntensity={0.1} metalness={0.4} roughness={0.38} />
        <Edges color={p.gridSection} threshold={18} />
      </mesh>
      {Array.from({ length: visible }, (_, index) => (
        <mesh key={index} position={[0, 0.06 + index * 0.19, 0]} castShadow>
          <boxGeometry args={[0.62, 0.14, 0.55]} />
          <meshStandardMaterial color={SUPPORT_COLOR} emissive={SUPPORT_COLOR} emissiveIntensity={0.42 + index * 0.04} metalness={0.48} roughness={0.27} />
          <Edges color={index === visible - 1 ? p.textStrong : SUPPORT_COLOR} threshold={18} />
        </mesh>
      ))}
      <Html position={[0, Math.max(0.3, visible * 0.19 + 0.24), 0.35]} center style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded border border-cyan-400/45 bg-ink-950/95 px-2 py-1 font-mono text-[8px] font-black uppercase text-cyan-200 shadow-xl">balance {model.balance}</div>
      </Html>
    </group>
  );
}

function CancellationGate({ model, p, reduced, compact }: { model: MajorityVoteSceneModel; p: Theme3DPalette; reduced: boolean; compact: boolean }) {
  const pulseA = useRef<THREE.Mesh>(null);
  const pulseB = useRef<THREE.Mesh>(null);
  const pair = model.cancelPair;
  const gateX = compact ? -2.15 : -2.5;
  const curveFor = (index: number) => new THREE.CatmullRomCurve3([
    new THREE.Vector3(xForIndex(index, model.tokens.length), -0.48, 0.25),
    new THREE.Vector3((xForIndex(index, model.tokens.length) + gateX) / 2, 0.18, 0.3),
    new THREE.Vector3(gateX, 0.67, 0.16),
  ]);
  const curves = useMemo(() => pair ? [curveFor(pair[0]), curveFor(pair[1])] : null, [pair?.[0], pair?.[1], model.tokens.length, gateX]);

  useFrame(({ clock }) => {
    if (!curves) return;
    const t = reduced ? 0.82 : (clock.elapsedTime * 0.42) % 1;
    pulseA.current?.position.copy(curves[0].getPointAt(t));
    pulseB.current?.position.copy(curves[1].getPointAt(t));
  });

  return (
    <group position={[gateX, 0.67, 0]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.16, 32]} />
        <meshStandardMaterial color={p.emptyCell} emissive={CANCEL_COLOR} emissiveIntensity={pair ? 0.75 : 0.1} metalness={0.5} roughness={0.3} />
        <Edges color={pair ? CANCEL_COLOR : p.gridSection} threshold={18} />
      </mesh>
      <Line points={[[-0.16, 0.1, 0.42], [0.16, -0.1, 0.42]]} color={CANCEL_COLOR} lineWidth={2.5} />
      <Line points={[[-0.16, -0.1, 0.42], [0.16, 0.1, 0.42]]} color={CANCEL_COLOR} lineWidth={2.5} />
      <Html position={[0, 0.5, 0.22]} center style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded border border-red-400/45 bg-ink-950/95 px-2 py-1 font-mono text-[8px] font-black uppercase text-red-200 shadow-xl">pair cancel</div>
      </Html>
      {curves ? (
        <group position={[-gateX, -0.67, 0]}>
          <Line points={curves[0].getPoints(40)} color={SUPPORT_COLOR} lineWidth={2.2} transparent opacity={0.82} />
          <Line points={curves[1].getPoints(40)} color={CANCEL_COLOR} lineWidth={2.2} transparent opacity={0.82} />
          <mesh ref={pulseA}><sphereGeometry args={[0.06, 16, 16]} /><meshStandardMaterial color={SUPPORT_COLOR} emissive={SUPPORT_COLOR} emissiveIntensity={1.5} /></mesh>
          <mesh ref={pulseB}><sphereGeometry args={[0.06, 16, 16]} /><meshStandardMaterial color={CANCEL_COLOR} emissive={CANCEL_COLOR} emissiveIntensity={1.5} /></mesh>
        </group>
      ) : null}
    </group>
  );
}

function VerificationMeter({ model, p, reduced, compact }: { model: MajorityVoteSceneModel; p: Theme3DPalette; reduced: boolean; compact: boolean }) {
  if (!model.verifying) return null;
  const spacing = compact ? 0.34 : 0.4;
  const slots = Math.max(1, model.required);
  const width = (slots - 1) * spacing + 0.5;
  return (
    <group position={[compact ? 2.05 : 2.5, 0.66, 0]}>
      <mesh position={[0, -0.18, -0.04]} receiveShadow>
        <boxGeometry args={[width + 0.24, 0.12, 0.72]} />
        <meshStandardMaterial color={p.emptyCell} emissive={VERIFIED_COLOR} emissiveIntensity={0.12} metalness={0.4} roughness={0.38} />
        <Edges color={p.gridSection} threshold={18} />
      </mesh>
      {Array.from({ length: slots }, (_, index) => {
        const filled = index < model.verificationCount;
        return (
          <mesh key={index} position={[(index - (slots - 1) / 2) * spacing, 0.08, 0]} scale={filled ? 1.08 : 0.92}>
            <boxGeometry args={[0.25, 0.28, 0.52]} />
            <meshStandardMaterial color={filled ? VERIFIED_COLOR : p.emptyCell} emissive={filled ? VERIFIED_COLOR : p.gridSection} emissiveIntensity={filled ? 0.75 : 0.08} metalness={0.45} roughness={0.3} />
            <Edges color={filled ? p.textStrong : p.gridSection} threshold={18} />
          </mesh>
        );
      })}
      <Html position={[0, 0.55, 0.25]} center style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded border border-emerald-400/45 bg-ink-950/95 px-2 py-1 font-mono text-[8px] font-black uppercase text-emerald-200 shadow-xl">proof {model.verificationCount}/{model.required}</div>
      </Html>
      {model.operation === "verified" ? (
        <mesh position={[0, 0.08, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[width / 2 + 0.22, 0.025, 12, 64]} />
          <meshStandardMaterial color={VERIFIED_COLOR} emissive={VERIFIED_COLOR} emissiveIntensity={reduced ? 0.8 : 1.25} />
        </mesh>
      ) : null}
    </group>
  );
}

function VoteFlow({ model, reduced }: { model: MajorityVoteSceneModel; reduced: boolean }) {
  const pulse = useRef<THREE.Mesh>(null);
  const currentIndex = Math.max(0, model.currentIndex);
  const color = model.verifying ? (model.currentValue === model.candidate ? VERIFIED_COLOR : CANCEL_COLOR) : model.operation === "support" ? SUPPORT_COLOR : CANDIDATE_COLOR;
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(xForIndex(currentIndex, model.tokens.length), -0.45, 0.25),
    new THREE.Vector3(xForIndex(currentIndex, model.tokens.length) * 0.48, 0.24, 0.32),
    new THREE.Vector3(0, 0.88, 0.2),
  ]), [currentIndex, model.tokens.length]);

  useFrame(({ clock }) => {
    if (!pulse.current) return;
    pulse.current.position.copy(curve.getPointAt(reduced ? 0.76 : (clock.elapsedTime * 0.4) % 1));
  });

  if (model.currentIndex < 0 || model.operation === "cancel") return null;

  return (
    <group>
      <Line points={curve.getPoints(42)} color={color} lineWidth={2.2} transparent opacity={0.72} />
      <mesh ref={pulse}><sphereGeometry args={[0.06, 16, 16]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} /></mesh>
    </group>
  );
}

function Scene({ model, p, reduced }: { model: MajorityVoteSceneModel; p: Theme3DPalette; reduced: boolean }) {
  const compact = useThree((state) => state.size.width < 500);
  const count = Math.max(1, model.tokens.length);
  const stageWidth = Math.max(6.6, (count - 1) * gapForCount(count) + 1.9);
  return (
    <>
      <CameraRig stageWidth={stageWidth} reduced={reduced} />
      <fog attach="fog" args={[p.background, 12, 25]} />
      <ambientLight intensity={0.72 * p.lighting.ambient} />
      <directionalLight castShadow position={[4.5, 7.5, 5]} intensity={1.4 * p.lighting.directional} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-4, 1.8, 3]} intensity={23 * p.lighting.accent} distance={10} color={CANCEL_COLOR} />
      <pointLight position={[0, 2.8, 3]} intensity={25 * p.lighting.accent} distance={11} color={CANDIDATE_COLOR} />
      <pointLight position={[4, 1.8, 3]} intensity={24 * p.lighting.accent} distance={10} color={model.verifying ? VERIFIED_COLOR : SUPPORT_COLOR} />

      <mesh position={[0, -1.18, -0.15]} receiveShadow>
        <boxGeometry args={[stageWidth + 0.25, 0.16, 1.48]} />
        <meshStandardMaterial color={p.emptyCell} metalness={0.4} roughness={0.46} />
        <Edges color={p.gridSection} threshold={18} />
      </mesh>
      {Array.from({ length: count }, (_, index) => <RailSlot key={index} index={index} count={count} p={p} />)}
      {model.tokens.map((token) => <VoteToken key={token.id} token={token} count={count} p={p} reduced={reduced} />)}
      <ScanPointer model={model} p={p} reduced={reduced} />
      <CandidateCore model={model} reduced={reduced} />
      <CancellationGate model={model} p={p} reduced={reduced} compact={compact} />
      <BalanceTower model={model} p={p} compact={compact} />
      <VerificationMeter model={model} p={p} reduced={reduced} compact={compact} />
      <VoteFlow model={model} reduced={reduced} />

      <InfiniteGrid position={[0, -1.68, -0.24]} cellSize={0.48} cellThickness={0.5} cellColor={p.gridCell} sectionSize={2.4} sectionThickness={0.88} sectionColor={p.gridSection} fadeDistance={22} fadeStrength={1} infiniteGrid />
      <OrbitControls enablePan={false} enableDamping dampingFactor={0.08} minDistance={6.8} maxDistance={18} minPolarAngle={0.38} maxPolarAngle={Math.PI / 2.04} />
    </>
  );
}

function Overlay({ model }: { model: MajorityVoteSceneModel }) {
  const tone = model.operation === "verified"
    ? "border-emerald-400/45 text-emerald-200"
    : model.operation === "rejected" || model.operation === "cancel"
      ? "border-red-400/45 text-red-300"
      : model.verifying
        ? "border-blue-400/45 text-blue-200"
        : "border-orange-400/45 text-orange-200";
  return (
    <>
      <div className="pointer-events-none absolute left-2 top-2 z-10 max-w-[14rem] rounded-md border border-orange-400/30 bg-ink-950/88 px-2.5 py-1.5 shadow-xl backdrop-blur-md sm:left-3 sm:top-3 sm:max-w-[20rem]">
        <div className="flex items-center gap-1.5">
          <span className={`rounded border bg-ink-900/70 px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-widest ${tone}`}>majority / {model.operation}</span>
          <span className="font-mono text-[8px] font-semibold uppercase tracking-wider text-ink-500">O(n)</span>
        </div>
        <p data-testid="majority-headline" className="mt-1 text-xs font-black leading-tight text-ink-50 sm:text-[13px]">{model.headline}</p>
      </div>

      <div className="stage-hud-secondary majority-equation pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 items-center rounded-md border border-ink-700/70 bg-ink-950/90 px-3 py-2 shadow-xl backdrop-blur-md">
        <span className="max-w-80 truncate font-mono text-[11px] font-black tabular-nums text-ink-50">{model.equation ?? "candidate | balance"}</span>
      </div>

      <div className="stage-hud-secondary pointer-events-none absolute right-11 top-3 z-10 justify-end gap-1">
        {[["candidate", model.resultLabel], ["balance", model.balance], ["count", model.verificationCount], ["need", model.required]].map(([label, value]) => (
          <div key={label} className="min-w-10 rounded border border-ink-700/65 bg-ink-950/86 px-1.5 py-1 text-center shadow-lg backdrop-blur-md">
            <span className="block font-mono text-[7px] font-black uppercase tracking-widest text-ink-500">{label}</span>
            <span className="block font-mono text-[10px] font-black leading-tight text-ink-50">{value}</span>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 z-10 flex items-end justify-between gap-2 sm:left-4 sm:right-4">
        <p data-testid="majority-detail" className="max-w-[38rem] rounded-md border border-orange-400/25 bg-ink-950/88 px-2.5 py-1.5 text-[11px] leading-snug text-ink-200 shadow-xl backdrop-blur-md">{model.detail}</p>
        <div className="stage-hud-legend ml-auto flex-wrap justify-end gap-1">
          <span className="rounded border border-cyan-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-cyan-200 backdrop-blur">cyan support</span>
          <span className="rounded border border-red-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-red-200 backdrop-blur">red cancelled</span>
          <span className="rounded border border-emerald-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-emerald-200 backdrop-blur">green proven</span>
        </div>
      </div>
    </>
  );
}

export function MajorityVoteStage3D({ step, steps }: { step: TraceStep; steps?: TraceStep[] }) {
  const model = getMajorityVoteSceneModel(step);
  const p = useTheme3D();
  const reduced = Boolean(useReducedMotion());
  const hud = useStageHud();
  if (!model) return null;

  return (
    <div className="codeanvil-canvas-fill codeanvil-stage-frame relative h-full w-full overflow-hidden rounded-md @container">
      <Canvas shadows="basic" dpr={[1.25, 2]} data-testid="majority-vote-stage-canvas" camera={{ position: [0, 3.7, 9.4], fov: 43 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} style={{ width: "100%", height: "100%", background: "transparent" }}>
        <CanvasSizeSync />
        <Scene model={model} p={p} reduced={reduced} />
      </Canvas>
      <HudToggle open={hud.hudOpen} onToggle={hud.toggleHud} />
      {hud.hudOpen ? <Overlay model={model} /> : null}
      <div className="majority-line-badge"><CodeLineBadge step={step} /></div>
      <StageProgressBar step={step} steps={steps} />
    </div>
  );
}
