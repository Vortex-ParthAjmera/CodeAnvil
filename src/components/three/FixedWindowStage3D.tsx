import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import {
  getFixedWindowSceneModel,
  type FixedWindowSceneModel,
  type FixedWindowTokenModel,
} from "../../engine/fixedWindowStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";
import { CodeLineBadge } from "./CodeLineBadge";
import { HudToggle, useStageHud } from "./StageHud";
import { StageProgressBar } from "./StageProgressBar";

const WINDOW_COLOR = "#22d3ee";
const BEST_COLOR = "#34d399";
const ADD_COLOR = "#fb923c";
const REMOVE_COLOR = "#fb7185";
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
  const target = useMemo(
    () => new THREE.Vector3(0, 3.75, Math.max(9.4, stageWidth * 0.94 + 3.2)),
    [stageWidth],
  );

  useLayoutEffect(() => {
    camera.position.copy(target);
    camera.lookAt(0, 0.05, 0);
  }, [camera, target]);

  useFrame((_, delta) => {
    const amount = reduced ? 1 : 1 - Math.pow(0.0008, delta);
    camera.position.lerp(target, amount);
    camera.lookAt(0, 0.05, 0);
  });
  return null;
}

function roleColor(role: FixedWindowTokenModel["role"], p: Theme3DPalette): string {
  if (role === "incoming") return ADD_COLOR;
  if (role === "outgoing" || role === "invalid") return REMOVE_COLOR;
  if (role === "best-window") return BEST_COLOR;
  if (role === "window") return WINDOW_COLOR;
  if (role === "best") return p.verdant;
  return p.barDefault;
}

function RailSlot({ index, count, p, checked }: { index: number; count: number; p: Theme3DPalette; checked: boolean }) {
  const width = tileWidthForCount(count);
  return (
    <group position={[xForIndex(index, count), -0.94, -0.05]}>
      <mesh receiveShadow>
        <boxGeometry args={[width + 0.09, 0.13, 0.84]} />
        <meshStandardMaterial
          color={p.emptyCell}
          emissive={checked ? BEST_COLOR : p.gridSection}
          emissiveIntensity={checked ? 0.16 : 0.04}
          metalness={0.42}
          roughness={0.4}
        />
        <Edges color={checked ? BEST_COLOR : p.gridSection} threshold={18} />
      </mesh>
      <Html position={[0, -0.23, 0.42]} center style={{ pointerEvents: "none" }}>
        <div className="rounded border border-ink-700/65 bg-ink-950/92 px-1.5 py-0.5 font-mono text-[7px] font-black leading-none text-ink-400 shadow-lg">i={index}</div>
      </Html>
    </group>
  );
}

function ValueToken({ token, count, p, reduced }: { token: FixedWindowTokenModel; count: number; p: Theme3DPalette; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const color = roleColor(token.role, p);
  const targetColor = useMemo(() => new THREE.Color(color), [color]);
  const active = token.role === "window" || token.role === "best-window" || token.role === "incoming";
  const targetY = -0.66 + (token.role === "incoming" ? 0.24 : token.role === "outgoing" ? 0.18 : active ? 0.08 : 0);

  useLayoutEffect(() => {
    group.current?.position.set(xForIndex(token.index, count), targetY, 0.08);
  }, []);

  useFrame(({ clock }, delta) => {
    if (!group.current || !body.current || !material.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00065, delta);
    const pulse = !reduced && (token.role === "incoming" || token.role === "outgoing")
      ? Math.sin(clock.elapsedTime * 3.6) * 0.035
      : 0;
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, targetY + pulse, amount);
    const scale = token.role === "incoming" || token.role === "outgoing" ? 1.14 : active ? 1.06 : 1;
    body.current.scale.setScalar(THREE.MathUtils.lerp(body.current.scale.x, scale, amount));
    material.current.color.lerp(targetColor, amount);
    material.current.emissive.lerp(targetColor, amount);
    material.current.emissiveIntensity = THREE.MathUtils.lerp(material.current.emissiveIntensity, active ? 0.52 : 0.08, amount);
  });

  return (
    <group ref={group} position={[xForIndex(token.index, count), targetY, 0.08]}>
      <mesh ref={body} castShadow receiveShadow>
        <boxGeometry args={[tileWidthForCount(count), 0.45, 0.66]} />
        <meshStandardMaterial ref={material} color={color} emissive={color} emissiveIntensity={active ? 0.52 : 0.08} metalness={0.48} roughness={0.27} />
        <Edges color={active ? p.textStrong : color} threshold={18} />
      </mesh>
      <Html position={[0, 0.03, 0.38]} center style={{ pointerEvents: "none" }}>
        <div data-window-token={token.id} className="stage-value-card" style={{ borderColor: color }}>{token.value}</div>
      </Html>
      {token.role === "incoming" || token.role === "outgoing" ? (
        <Html position={[0, 0.35, 0.42]} center style={{ pointerEvents: "none" }}>
          <div className="rounded border bg-ink-950/95 px-1.5 py-0.5 font-mono text-[7px] font-black uppercase shadow-xl" style={{ borderColor: color, color }}>
            {token.role === "incoming" ? "IN" : "OUT"}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function WindowFrame({ model, reduced }: { model: FixedWindowSceneModel; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const cage = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const count = Math.max(1, model.tokens.length);
  const hasWindow = model.windowEnd >= model.windowStart && model.windowEnd >= 0;
  const previewEnd = Math.min(count - 1, Math.max(0, model.windowSize - 1));
  const safeStart = hasWindow ? THREE.MathUtils.clamp(model.windowStart, 0, count - 1) : 0;
  const safeEnd = hasWindow ? THREE.MathUtils.clamp(model.windowEnd, safeStart, count - 1) : previewEnd;
  const leftX = xForIndex(safeStart, count);
  const rightX = xForIndex(safeEnd, count);
  const targetCenter = (leftX + rightX) / 2;
  const targetWidth = Math.max(0.72, rightX - leftX + tileWidthForCount(count) + 0.28);
  const color = model.operation === "invalid" ? INVALID_COLOR : model.operation === "complete" || model.operation === "new-best" ? BEST_COLOR : WINDOW_COLOR;
  const targetColor = useMemo(() => new THREE.Color(color), [color]);

  useLayoutEffect(() => {
    if (group.current) group.current.position.x = targetCenter;
    if (cage.current) cage.current.scale.x = targetWidth;
  }, []);

  useFrame((_, delta) => {
    if (!group.current || !cage.current || !material.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00038, delta);
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetCenter, amount);
    cage.current.scale.x = THREE.MathUtils.lerp(cage.current.scale.x, targetWidth, amount);
    material.current.color.lerp(targetColor, amount);
    material.current.emissive.lerp(targetColor, amount);
    material.current.opacity = THREE.MathUtils.lerp(material.current.opacity, hasWindow ? 0.16 : 0.055, amount);
  });

  return (
    <group ref={group} position={[targetCenter, -0.48, 0]}>
      <mesh ref={cage} scale={[targetWidth, 1, 1]}>
        <boxGeometry args={[1, 1.12, 0.96]} />
        <meshStandardMaterial ref={material} color={color} emissive={color} emissiveIntensity={0.4} transparent opacity={hasWindow ? 0.16 : 0.055} depthWrite={false} metalness={0.35} roughness={0.32} />
        <Edges color={color} threshold={18} />
      </mesh>
      <Html position={[0, 0.72, 0.38]} center style={{ pointerEvents: "none" }}>
        <div data-testid="window-frame-label" className="whitespace-nowrap rounded border bg-ink-950/96 px-2 py-1 font-mono text-[8px] font-black uppercase shadow-xl" style={{ borderColor: color, color }}>
          {hasWindow ? `window [${safeStart}..${safeEnd}]` : `k=${model.windowSize} frame`}
        </div>
      </Html>
    </group>
  );
}

function SumReactor({ model, reduced, compact }: { model: FixedWindowSceneModel; reduced: boolean; compact: boolean }) {
  const ring = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const color = model.operation === "invalid"
    ? INVALID_COLOR
    : model.operation === "remove"
      ? REMOVE_COLOR
      : model.operation === "add" || model.operation === "seed-add"
        ? ADD_COLOR
        : model.operation === "new-best" || model.operation === "complete"
          ? BEST_COLOR
          : WINDOW_COLOR;
  const targetColor = useMemo(() => new THREE.Color(color), [color]);

  useFrame(({ clock }, delta) => {
    if (!ring.current || !material.current) return;
    ring.current.rotation.z += reduced ? 0 : delta * 0.24;
    ring.current.scale.setScalar(reduced ? 1 : 1 + Math.sin(clock.elapsedTime * 2.6) * 0.025);
    const amount = reduced ? 1 : 1 - Math.pow(0.0008, delta);
    material.current.color.lerp(targetColor, amount);
    material.current.emissive.lerp(targetColor, amount);
  });

  return (
    <group position={[compact ? -0.85 : 0, 1.02, 0.04]}>
      <group ref={ring}>
        <mesh>
          <torusGeometry args={[0.54, 0.055, 18, 72]} />
          <meshStandardMaterial ref={material} color={color} emissive={color} emissiveIntensity={1.05} metalness={0.55} roughness={0.22} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.68, 0.015, 12, 64]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} />
        </mesh>
      </group>
      <Html position={[0, 0.02, 0.18]} center style={{ pointerEvents: "none" }}>
        <div className="min-w-24 rounded-md border bg-ink-950/96 px-2.5 py-1.5 text-center shadow-xl" style={{ borderColor: color }}>
          <span className="block font-mono text-[7px] font-black uppercase tracking-widest text-ink-400">rolling sum</span>
          <span data-testid="window-current-sum" className="mt-0.5 block font-mono text-[13px] font-black tabular-nums" style={{ color }}>{model.currentSum}</span>
        </div>
      </Html>
    </group>
  );
}

function TransferArc({ model, reduced, compact }: { model: FixedWindowSceneModel; reduced: boolean; compact: boolean }) {
  const pulse = useRef<THREE.Mesh>(null);
  const index = model.transferKind === "remove" ? model.outgoingIndex : model.incomingIndex;
  const safeIndex = Math.max(0, index ?? 0);
  const count = Math.max(1, model.tokens.length);
  const color = model.transferKind === "remove" ? REMOVE_COLOR : ADD_COLOR;
  const direction = model.transferKind === "remove" ? -1 : 1;
  const reactorX = compact ? -0.85 : 0;
  const tokenX = xForIndex(safeIndex, count);
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(tokenX, -0.42, 0.28),
    new THREE.Vector3((tokenX + reactorX) / 2 + direction * 0.3, 0.25, 0.4),
    new THREE.Vector3(reactorX + direction * 0.28, 0.94, 0.26),
  ]), [direction, reactorX, tokenX]);

  useFrame(({ clock }) => {
    if (!pulse.current) return;
    pulse.current.position.copy(curve.getPointAt(reduced ? 0.78 : (clock.elapsedTime * 0.42) % 1));
  });

  if (!model.transferKind || index === null || index === undefined) return null;

  return (
    <group>
      <Line points={curve.getPoints(44)} color={color} lineWidth={2.4} transparent opacity={0.8} />
      <mesh ref={pulse}><sphereGeometry args={[0.065, 16, 16]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} /></mesh>
    </group>
  );
}

function BestShelf({ model, p, compact }: { model: FixedWindowSceneModel; p: Theme3DPalette; compact: boolean }) {
  const x = compact ? 2.12 : 2.55;
  const hasBest = model.bestRange !== null && model.bestSum !== null;
  const visibleBestValues = model.bestValues.slice(0, 5);
  const hiddenBestValues = Math.max(0, model.bestValues.length - visibleBestValues.length);
  const valueSpacing = Math.min(0.25, 0.9 / Math.max(1, visibleBestValues.length - 1));
  return (
    <group position={[x, 0.88, -0.06]}>
      <mesh position={[0, -0.12, -0.04]} receiveShadow>
        <boxGeometry args={[1.35, 0.13, 0.78]} />
        <meshStandardMaterial color={p.emptyCell} emissive={BEST_COLOR} emissiveIntensity={hasBest ? 0.22 : 0.07} metalness={0.44} roughness={0.36} />
        <Edges color={hasBest ? BEST_COLOR : p.gridSection} threshold={18} />
      </mesh>
      {hasBest ? visibleBestValues.map((value, index) => (
          <mesh key={`${model.bestRange?.[0]}-${index}`} position={[(index - (visibleBestValues.length - 1) / 2) * valueSpacing, 0.12, 0]}>
            <boxGeometry args={[0.2, 0.24, 0.5]} />
            <meshStandardMaterial color={BEST_COLOR} emissive={BEST_COLOR} emissiveIntensity={0.52} metalness={0.45} roughness={0.28} />
            <Edges color={p.textStrong} threshold={18} />
            <Html position={[0, 0.01, 0.28]} center style={{ pointerEvents: "none" }}>
              <div className="font-mono text-[7px] font-black text-ink-950">{value}</div>
            </Html>
          </mesh>
      )) : null}
      {hiddenBestValues > 0 ? (
        <Html position={[0.64, 0.12, 0.3]} center style={{ pointerEvents: "none" }}>
          <div className="rounded border border-emerald-400/45 bg-ink-950/96 px-1 py-0.5 font-mono text-[7px] font-black text-emerald-200">+{hiddenBestValues}</div>
        </Html>
      ) : null}
      <Html position={[0, 0.58, 0.22]} center style={{ pointerEvents: "none" }}>
        <div className="min-w-28 rounded-md border border-emerald-400/45 bg-ink-950/96 px-2 py-1.5 text-center shadow-xl">
          <span className="block font-mono text-[7px] font-black uppercase tracking-widest text-ink-400">saved best</span>
          <span className="mt-0.5 block font-mono text-[11px] font-black tabular-nums text-emerald-300">
            {hasBest ? `${model.bestSum} @ [${model.bestRange?.[0]}..${model.bestRange?.[1]}]` : "not set"}
          </span>
        </div>
      </Html>
    </group>
  );
}

function InvalidMarker({ model }: { model: FixedWindowSceneModel }) {
  if (model.operation !== "invalid") return null;
  return (
    <group position={[0, -0.05, 0.5]}>
      <Line points={[[ -0.45, -0.45, 0], [0.45, 0.45, 0]]} color={INVALID_COLOR} lineWidth={5} />
      <Line points={[[ -0.45, 0.45, 0], [0.45, -0.45, 0]]} color={INVALID_COLOR} lineWidth={5} />
    </group>
  );
}

function Scene({ model, p, reduced }: { model: FixedWindowSceneModel; p: Theme3DPalette; reduced: boolean }) {
  const compact = useThree((state) => state.size.width < 500);
  const count = Math.max(1, model.tokens.length);
  const stageWidth = Math.max(6.5, (count - 1) * gapForCount(count) + 1.9);
  const checked = new Set(model.processedRanges.flatMap(([start, end]) => Array.from({ length: end - start + 1 }, (_, offset) => start + offset)));

  return (
    <>
      <CameraRig stageWidth={stageWidth} reduced={reduced} />
      <fog attach="fog" args={[p.background, 12, 25]} />
      <ambientLight intensity={0.72 * p.lighting.ambient} />
      <directionalLight castShadow position={[4.5, 7.5, 5]} intensity={1.4 * p.lighting.directional} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-4, 1.8, 3]} intensity={22 * p.lighting.accent} distance={10} color={REMOVE_COLOR} />
      <pointLight position={[0, 2.8, 3]} intensity={25 * p.lighting.accent} distance={11} color={WINDOW_COLOR} />
      <pointLight position={[4, 1.8, 3]} intensity={23 * p.lighting.accent} distance={10} color={BEST_COLOR} />

      <mesh position={[0, -1.05, -0.15]} receiveShadow>
        <boxGeometry args={[stageWidth + 0.3, 0.16, 1.5]} />
        <meshStandardMaterial color={p.emptyCell} metalness={0.4} roughness={0.46} />
        <Edges color={p.gridSection} threshold={18} />
      </mesh>
      {Array.from({ length: count }, (_, index) => <RailSlot key={index} index={index} count={count} p={p} checked={checked.has(index)} />)}
      {model.tokens.map((token) => <ValueToken key={token.id} token={token} count={count} p={p} reduced={reduced} />)}
      <WindowFrame model={model} reduced={reduced} />
      <SumReactor model={model} reduced={reduced} compact={compact} />
      <TransferArc model={model} reduced={reduced} compact={compact} />
      <BestShelf model={model} p={p} compact={compact} />
      <InvalidMarker model={model} />

      <InfiniteGrid position={[0, -1.58, -0.24]} cellSize={0.48} cellThickness={0.5} cellColor={p.gridCell} sectionSize={2.4} sectionThickness={0.88} sectionColor={p.gridSection} fadeDistance={22} fadeStrength={1} infiniteGrid />
      <OrbitControls enablePan={false} enableDamping dampingFactor={0.08} minDistance={6.8} maxDistance={18} minPolarAngle={0.38} maxPolarAngle={Math.PI / 2.04} />
    </>
  );
}

function Overlay({ model }: { model: FixedWindowSceneModel }) {
  const tone = model.operation === "invalid"
    ? "border-red-400/45 text-red-300"
    : model.operation === "new-best" || model.operation === "complete"
      ? "border-emerald-400/45 text-emerald-200"
      : model.operation === "remove"
        ? "border-red-400/45 text-red-200"
        : "border-cyan-400/45 text-cyan-200";

  return (
    <>
      <div className="pointer-events-none absolute left-2 top-2 z-10 max-w-[14rem] rounded-md border border-cyan-400/30 bg-ink-950/88 px-2.5 py-1.5 shadow-xl backdrop-blur-md sm:left-3 sm:top-3 sm:max-w-[21rem]">
        <div className="flex items-center gap-1.5">
          <span className={`rounded border bg-ink-900/70 px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-widest ${tone}`}>window / {model.operation}</span>
          <span className="font-mono text-[8px] font-semibold uppercase tracking-wider text-ink-500">O(n)</span>
        </div>
        <p data-testid="fixed-window-headline" className="mt-1 text-xs font-black leading-tight text-ink-50 sm:text-[13px]">{model.headline}</p>
      </div>

      <div className="stage-hud-secondary fixed-window-equation pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 items-center rounded-md border border-ink-700/70 bg-ink-950/90 px-3 py-2 shadow-xl backdrop-blur-md">
        <span className="max-w-80 truncate font-mono text-[11px] font-black tabular-nums text-ink-50">{model.equation ?? `sum = ${model.currentSum}`}</span>
      </div>

      <div className="stage-hud-secondary pointer-events-none absolute right-11 top-3 z-10 justify-end gap-1">
        {[["k", model.windowSize], ["sum", model.currentSum], ["best", model.resultLabel], ["checked", model.windowsChecked]].map(([label, value]) => (
          <div key={label} className="min-w-10 rounded border border-ink-700/65 bg-ink-950/86 px-1.5 py-1 text-center shadow-lg backdrop-blur-md">
            <span className="block font-mono text-[7px] font-black uppercase tracking-widest text-ink-500">{label}</span>
            <span className="block font-mono text-[10px] font-black leading-tight text-ink-50">{value}</span>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 z-10 flex items-end justify-between gap-2 sm:left-4 sm:right-4">
        <p data-testid="fixed-window-detail" className="max-w-[39rem] rounded-md border border-cyan-400/25 bg-ink-950/88 px-2.5 py-1.5 text-[11px] leading-snug text-ink-200 shadow-xl backdrop-blur-md">{model.detail}</p>
        <div className="stage-hud-legend ml-auto flex-wrap justify-end gap-1">
          <span className="rounded border border-cyan-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-cyan-200 backdrop-blur">cyan current</span>
          <span className="rounded border border-red-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-red-200 backdrop-blur">red leaves</span>
          <span className="rounded border border-emerald-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-emerald-200 backdrop-blur">green best</span>
        </div>
      </div>
    </>
  );
}

export function FixedWindowStage3D({ step, steps }: { step: TraceStep; steps?: TraceStep[] }) {
  const model = getFixedWindowSceneModel(step);
  const p = useTheme3D();
  const reduced = Boolean(useReducedMotion());
  const hud = useStageHud();
  if (!model) return null;

  return (
    <div className="codeanvil-canvas-fill codeanvil-stage-frame relative h-full w-full overflow-hidden rounded-md @container">
      <Canvas shadows="basic" dpr={[1.25, 2]} data-testid="fixed-window-stage-canvas" camera={{ position: [0, 3.75, 9.4], fov: 43 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} style={{ width: "100%", height: "100%", background: "transparent" }}>
        <CanvasSizeSync />
        <Scene model={model} p={p} reduced={reduced} />
      </Canvas>
      <HudToggle open={hud.hudOpen} onToggle={hud.toggleHud} />
      {hud.hudOpen ? <Overlay model={model} /> : null}
      <div className="fixed-window-line-badge"><CodeLineBadge step={step} /></div>
      <StageProgressBar step={step} steps={steps} />
    </div>
  );
}
