import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import {
  getDutchFlagSceneModel,
  type DutchFlagSceneModel,
  type DutchFlagTokenModel,
} from "../../engine/dutchFlagStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";
import { CodeLineBadge } from "./CodeLineBadge";
import { HudToggle, useStageHud } from "./StageHud";
import { StageProgressBar } from "./StageProgressBar";

const ZERO_COLOR = "#22d3ee";
const ONE_COLOR = "#fbbf24";
const TWO_COLOR = "#c084fc";
const MID_COLOR = "#34d399";
const INVALID_COLOR = "#fb7185";

function gapForCount(count: number): number {
  if (count <= 8) return 0.82;
  return Math.max(0.5, 6 / Math.max(1, count - 1));
}

function tileWidthForCount(count: number): number {
  return Math.max(0.34, Math.min(0.56, gapForCount(count) * 0.68));
}

function xForPosition(position: number, count: number): number {
  return (position - (count - 1) / 2) * gapForCount(count);
}

function xForPointer(index: number, count: number): number {
  const clamped = Math.max(-0.42, Math.min(count - 0.58, index));
  return xForPosition(clamped, count);
}

function CameraRig({ stageWidth, reduced }: { stageWidth: number; reduced: boolean }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const target = useRef(new THREE.Vector3(0, 3.75, Math.max(9.4, stageWidth * 0.9 + 3.6)));
  const reframing = useRef(true);

  useLayoutEffect(() => {
    camera.position.copy(target.current);
    camera.lookAt(0, 0.18, 0);
  }, [camera]);

  useEffect(() => {
    target.current.set(0, 3.75, Math.max(9.4, stageWidth * 0.9 + 3.6));
    reframing.current = true;
  }, [stageWidth]);

  useFrame((_, delta) => {
    if (!reframing.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.0008, delta);
    camera.position.lerp(target.current, amount);
    camera.lookAt(0, 0.18, 0);
    if (camera.position.distanceTo(target.current) < 0.012) {
      camera.position.copy(target.current);
      reframing.current = false;
    }
  });
  return null;
}

function valueColor(value: number): string {
  if (value === 0) return ZERO_COLOR;
  if (value === 1) return ONE_COLOR;
  if (value === 2) return TWO_COLOR;
  return INVALID_COLOR;
}

function RailSlot({ index, count, p }: { index: number; count: number; p: Theme3DPalette }) {
  const width = tileWidthForCount(count);
  return (
    <group position={[xForPosition(index, count), -1.02, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[width + 0.08, 0.14, 0.8]} />
        <meshStandardMaterial color={p.emptyCell} emissive={p.gridSection} emissiveIntensity={0.05} metalness={0.42} roughness={0.4} />
        <Edges color={p.gridSection} threshold={18} />
      </mesh>
      <Html position={[0, -0.23, 0.4]} center style={{ pointerEvents: "none" }}>
        <div className="rounded border border-ink-700/65 bg-ink-950/92 px-1.5 py-0.5 font-mono text-[7px] font-black leading-none text-ink-400 shadow-lg">i={index}</div>
      </Html>
    </group>
  );
}

function ZoneBand({
  range,
  count,
  color,
  label,
  p,
  reduced,
}: {
  range: [number, number] | null;
  count: number;
  color: string;
  label: string;
  p: Theme3DPalette;
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const start = range?.[0] ?? 0;
  const end = range?.[1] ?? -1;
  const visible = Boolean(range);
  const targetCenter = visible ? (xForPosition(start, count) + xForPosition(end, count)) / 2 : 0;
  const targetWidth = visible ? Math.max(0.14, (end - start) * gapForCount(count) + tileWidthForCount(count) + 0.18) : 0.04;

  useLayoutEffect(() => {
    if (!group.current || !material.current) return;
    group.current.position.x = targetCenter;
    group.current.scale.x = targetWidth;
    material.current.opacity = visible ? 0.3 : 0;
  }, []);

  useFrame((_, delta) => {
    if (!group.current || !material.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.001, delta);
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetCenter, amount);
    group.current.scale.x = THREE.MathUtils.lerp(group.current.scale.x, targetWidth, amount);
    material.current.opacity = THREE.MathUtils.lerp(material.current.opacity, visible ? 0.3 : 0, amount);
  });

  return (
    <group ref={group} position={[targetCenter, -1.22, -0.16]} scale={[targetWidth, 1, 1]}>
      <mesh receiveShadow>
        <boxGeometry args={[1, 0.1, 1.18]} />
        <meshStandardMaterial ref={material} color={p.emptyCell} emissive={color} emissiveIntensity={0.42} transparent opacity={visible ? 0.3 : 0} metalness={0.38} roughness={0.45} />
        <Edges color={color} threshold={18} />
      </mesh>
      {visible ? (
        <Html position={[0, -0.25, 0.56]} center style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded border bg-ink-950/94 px-1.5 py-0.5 font-mono text-[7px] font-black uppercase shadow-xl" style={{ borderColor: color, color }}>{label}</div>
        </Html>
      ) : null}
    </group>
  );
}

function ValueToken({ token, count, p, reduced }: { token: DutchFlagTokenModel; count: number; p: Theme3DPalette; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const targetX = xForPosition(token.position, count);
  const previousTarget = useRef(targetX);
  const travelFrom = useRef(targetX);
  const travel = useRef(1);
  const color = token.role === "invalid" ? INVALID_COLOR : valueColor(token.value);
  const targetColor = useMemo(() => new THREE.Color(color), [color]);
  const active = token.role === "current" || token.role === "swap" || token.role === "invalid";
  const targetY = -0.8 + (active ? 0.22 : 0);

  useLayoutEffect(() => {
    group.current?.position.set(targetX, targetY, 0.1);
  }, []);

  useEffect(() => {
    if (Math.abs(previousTarget.current - targetX) < 0.001) return;
    travelFrom.current = group.current?.position.x ?? previousTarget.current;
    previousTarget.current = targetX;
    travel.current = reduced ? 1 : 0;
  }, [targetX, reduced]);

  useFrame(({ clock }, delta) => {
    if (!group.current || !body.current || !material.current) return;
    if (travel.current < 1) {
      travel.current = Math.min(1, travel.current + delta * 1.35);
      const t = travel.current;
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      group.current.position.x = THREE.MathUtils.lerp(travelFrom.current, targetX, eased);
      group.current.position.y = targetY + Math.sin(Math.PI * eased) * 0.7;
      group.current.position.z = 0.1 + Math.sin(Math.PI * eased) * 0.25;
      group.current.rotation.z = Math.sin(Math.PI * eased) * 0.14 * Math.sign(targetX - travelFrom.current);
    } else {
      const amount = reduced ? 1 : 1 - Math.pow(0.00065, delta);
      const pulse = !reduced && token.role === "current" ? Math.sin(clock.elapsedTime * 3.3) * 0.035 : 0;
      group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetX, amount);
      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, targetY + pulse, amount);
      group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, 0.1, amount);
      group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, 0, amount);
    }
    const amount = reduced ? 1 : 1 - Math.pow(0.0007, delta);
    body.current.scale.setScalar(THREE.MathUtils.lerp(body.current.scale.x, active ? 1.13 : 1, amount));
    material.current.color.lerp(targetColor, amount);
    material.current.emissive.lerp(targetColor, amount);
    material.current.emissiveIntensity = THREE.MathUtils.lerp(material.current.emissiveIntensity, active ? 0.9 : 0.32, amount);
  });

  return (
    <group ref={group} position={[targetX, targetY, 0.1]}>
      <mesh ref={body} castShadow receiveShadow>
        <boxGeometry args={[tileWidthForCount(count), 0.42, 0.72]} />
        <meshStandardMaterial ref={material} color={color} emissive={color} emissiveIntensity={active ? 0.9 : 0.32} metalness={0.48} roughness={0.27} />
        <Edges color={active ? p.textStrong : color} threshold={18} />
      </mesh>
      <Html position={[0, 0.04, 0.43]} center style={{ pointerEvents: "none" }}>
        <div data-dnf-token={token.id} className="stage-value-card" style={{ borderColor: color }}>{token.value}</div>
      </Html>
      {token.role === "current" ? (
        <Html position={[0, 0.48, 0.2]} center style={{ pointerEvents: "none" }}>
          <div className="rounded border border-verdant-400/60 bg-ink-950/95 px-1.5 py-0.5 font-mono text-[7px] font-black uppercase text-verdant-100 shadow-xl">inspect</div>
        </Html>
      ) : null}
      {token.role === "invalid" ? (
        <Html position={[0, 0.48, 0.2]} center style={{ pointerEvents: "none" }}>
          <div className="rounded border border-red-400/60 bg-ink-950/95 px-1.5 py-0.5 font-mono text-[7px] font-black uppercase text-red-200 shadow-xl">invalid</div>
        </Html>
      ) : null}
    </group>
  );
}

function PointerCarriage({
  index,
  count,
  label,
  color,
  height,
  p,
  reduced,
}: {
  index: number;
  count: number;
  label: string;
  color: string;
  height: number;
  p: Theme3DPalette;
  reduced: boolean;
}) {
  const carriage = useRef<THREE.Group>(null);
  const targetX = xForPointer(index, count);
  useLayoutEffect(() => {
    if (carriage.current) carriage.current.position.x = targetX;
  }, []);
  useFrame(({ clock }, delta) => {
    if (!carriage.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00045, delta);
    carriage.current.position.x = THREE.MathUtils.lerp(carriage.current.position.x, targetX, amount);
    carriage.current.position.y = reduced ? 0 : Math.sin(clock.elapsedTime * 2.7 + height) * 0.016;
  });
  return (
    <group ref={carriage} position={[targetX, 0, 0]}>
      <mesh position={[0, -0.28 + height / 2, 0.02]}>
        <cylinderGeometry args={[0.016, 0.042, height, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.82} />
      </mesh>
      <mesh position={[0, height - 0.25, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.14, 0.028, 14, 44]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.25} />
      </mesh>
      <Html position={[0, height + 0.03, 0.12]} center style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded border bg-ink-950/95 px-1.5 py-1 font-mono text-[8px] font-black uppercase shadow-xl" style={{ borderColor: color, color: p.textStrong }}>{label}={index}</div>
      </Html>
    </group>
  );
}

function ClassifierGate({ model, p, reduced, compact }: { model: DutchFlagSceneModel; p: Theme3DPalette; reduced: boolean; compact: boolean }) {
  const pulse = useRef<THREE.Mesh>(null);
  const activeValue = model.decision === "zero" ? 0 : model.decision === "one" ? 1 : model.decision === "two" ? 2 : null;
  const activeColor = activeValue === null ? p.gridSection : valueColor(activeValue);
  const sourceX = xForPointer(model.mid, model.tokens.length);
  const targetX = activeValue === 0 ? -1.65 : activeValue === 1 ? 0 : activeValue === 2 ? 1.65 : 0;
  const gateY = compact ? 1.72 : 1.12;
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(sourceX, -0.42, 0.22),
    new THREE.Vector3((sourceX + targetX) / 2, compact ? 0.72 : 0.45, 0.3),
    new THREE.Vector3(targetX, gateY - 0.1, 0.18),
  ]), [sourceX, targetX, gateY, compact]);

  useFrame(({ clock }) => {
    if (!pulse.current || activeValue === null) return;
    pulse.current.position.copy(curve.getPointAt(reduced ? 0.72 : (clock.elapsedTime * 0.36) % 1));
  });

  return (
    <group>
      {[0, 1, 2].map((value, index) => {
        const x = (index - 1) * 1.65;
        const color = valueColor(value);
        const active = activeValue === value;
        return (
          <group key={value} position={[x, gateY, 0]}>
            <mesh castShadow receiveShadow scale={active ? 1.08 : 1}>
              <boxGeometry args={[1.08, 0.48, 0.82]} />
              <meshStandardMaterial color={p.emptyCell} emissive={color} emissiveIntensity={active ? 0.8 : 0.12} metalness={0.45} roughness={0.34} />
              <Edges color={active ? p.textStrong : color} threshold={18} />
            </mesh>
            <Html position={[0, 0.03, 0.5]} center style={{ pointerEvents: "none" }}>
              <div className="whitespace-nowrap rounded border bg-ink-950/96 px-2 py-1 font-mono text-[8px] font-black uppercase shadow-xl" style={{ borderColor: color, color }}>
                {value === 0 ? "0 -> left" : value === 1 ? "1 -> middle" : "2 -> right"}
              </div>
            </Html>
          </group>
        );
      })}
      {activeValue !== null ? (
        <>
          <Line points={curve.getPoints(44)} color={activeColor} lineWidth={2.3} transparent opacity={0.76} />
          <mesh ref={pulse}>
            <sphereGeometry args={[0.065, 16, 16]} />
            <meshStandardMaterial color={activeColor} emissive={activeColor} emissiveIntensity={1.5} />
          </mesh>
        </>
      ) : null}
      {!compact ? (
        <Html position={[0, 1.72, 0.2]} center style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded border border-ink-700/70 bg-ink-950/93 px-2.5 py-1 font-mono text-[7px] font-black uppercase tracking-widest text-ink-300 shadow-xl">three-way classifier</div>
        </Html>
      ) : null}
    </group>
  );
}

function SwapBridge({ model, reduced }: { model: DutchFlagSceneModel; reduced: boolean }) {
  const pulse = useRef<THREE.Mesh>(null);
  const indices = model.swapIndices;
  const count = model.tokens.length;
  const color = model.operation === "place-zero" ? ZERO_COLOR : TWO_COLOR;
  const curve = useMemo(() => {
    const [from, to] = indices ?? [0, 0];
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(xForPosition(from, count), -0.36, 0.3),
      new THREE.Vector3((xForPosition(from, count) + xForPosition(to, count)) / 2, 0.28, 0.38),
      new THREE.Vector3(xForPosition(to, count), -0.36, 0.3),
    ]);
  }, [indices?.[0], indices?.[1], count]);

  useFrame(({ clock }) => {
    if (!pulse.current || !indices) return;
    pulse.current.position.copy(curve.getPointAt(reduced ? 0.74 : (clock.elapsedTime * 0.48) % 1));
  });

  if (!indices || indices[0] === indices[1]) return null;
  return (
    <group>
      <Line points={curve.getPoints(44)} color={color} lineWidth={2.7} transparent opacity={0.9} />
      <mesh ref={pulse}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
      </mesh>
    </group>
  );
}

function Scene({ model, p, reduced }: { model: DutchFlagSceneModel; p: Theme3DPalette; reduced: boolean }) {
  const compact = useThree((state) => state.size.width < 500);
  const count = Math.max(1, model.tokens.length);
  const stageWidth = Math.max(6.6, (count - 1) * gapForCount(count) + 1.85);
  return (
    <>
      <CameraRig stageWidth={stageWidth} reduced={reduced} />
      <fog attach="fog" args={[p.background, 12, 25]} />
      <ambientLight intensity={0.72 * p.lighting.ambient} />
      <directionalLight castShadow position={[4.5, 7.5, 5]} intensity={1.38 * p.lighting.directional} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-3.8, 1.8, 3]} intensity={24 * p.lighting.accent} distance={10} color={ZERO_COLOR} />
      <pointLight position={[0, 2.5, 3]} intensity={21 * p.lighting.accent} distance={10} color={ONE_COLOR} />
      <pointLight position={[3.8, 1.8, 3]} intensity={24 * p.lighting.accent} distance={10} color={TWO_COLOR} />

      <mesh position={[0, -1.14, -0.15]} receiveShadow>
        <boxGeometry args={[stageWidth + 0.25, 0.16, 1.48]} />
        <meshStandardMaterial color={p.emptyCell} metalness={0.4} roughness={0.46} />
        <Edges color={p.gridSection} threshold={18} />
      </mesh>
      <ZoneBand range={model.zones.zeros} count={count} color={ZERO_COLOR} label="0s locked" p={p} reduced={reduced} />
      <ZoneBand range={model.zones.ones} count={count} color={ONE_COLOR} label="1s locked" p={p} reduced={reduced} />
      <ZoneBand range={model.zones.unknown} count={count} color={p.textDim} label="unknown" p={p} reduced={reduced} />
      <ZoneBand range={model.zones.twos} count={count} color={TWO_COLOR} label="2s locked" p={p} reduced={reduced} />
      {Array.from({ length: count }, (_, index) => <RailSlot key={index} index={index} count={count} p={p} />)}
      {model.tokens.map((token) => <ValueToken key={token.id} token={token} count={count} p={p} reduced={reduced} />)}

      <PointerCarriage index={model.low} count={count} label="low" color={ZERO_COLOR} height={1.12} p={p} reduced={reduced} />
      <PointerCarriage index={model.mid} count={count} label="mid" color={MID_COLOR} height={0.7} p={p} reduced={reduced} />
      <PointerCarriage index={model.high} count={count} label="high" color={TWO_COLOR} height={0.92} p={p} reduced={reduced} />
      <ClassifierGate model={model} p={p} reduced={reduced} compact={compact} />
      <SwapBridge model={model} reduced={reduced} />

      <InfiniteGrid position={[0, -1.68, -0.24]} cellSize={0.48} cellThickness={0.5} cellColor={p.gridCell} sectionSize={2.4} sectionThickness={0.88} sectionColor={p.gridSection} fadeDistance={22} fadeStrength={1} infiniteGrid />
      <OrbitControls enablePan={false} enableDamping dampingFactor={0.08} minDistance={6.8} maxDistance={18} minPolarAngle={0.38} maxPolarAngle={Math.PI / 2.04} />
    </>
  );
}

function Overlay({ model }: { model: DutchFlagSceneModel }) {
  const tone = model.operation === "invalid"
    ? "border-red-400/45 text-red-300"
    : model.operation === "complete"
      ? "border-verdant-400/45 text-verdant-100"
      : model.operation.includes("zero")
        ? "border-cyan-400/45 text-cyan-200"
        : model.operation.includes("one")
          ? "border-amber-400/45 text-amber-200"
          : model.operation.includes("two") || model.operation === "retreat-high"
            ? "border-violet-400/45 text-violet-200"
            : "border-arc-400/45 text-arc-100";
  const zoneLabel = (range: [number, number] | null) => range ? `[${range[0]}..${range[1]}]` : "empty";
  return (
    <>
      <div className="pointer-events-none absolute left-2 top-2 z-10 max-w-[14rem] rounded-md border border-arc-400/30 bg-ink-950/88 px-2.5 py-1.5 shadow-xl backdrop-blur-md sm:left-3 sm:top-3 sm:max-w-[20rem]">
        <div className="flex items-center gap-1.5">
          <span className={`rounded border bg-ink-900/70 px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-widest ${tone}`}>dutch flag / {model.operation}</span>
          <span className="font-mono text-[8px] font-semibold uppercase tracking-wider text-ink-500">O(n)</span>
        </div>
        <p data-testid="dnf-headline" className="mt-1 text-xs font-black leading-tight text-ink-50 sm:text-[13px]">{model.headline}</p>
      </div>

      <div className="stage-hud-secondary dnf-equation pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 items-center rounded-md border border-ink-700/70 bg-ink-950/90 px-3 py-2 shadow-xl backdrop-blur-md">
        <span className="max-w-80 truncate font-mono text-[11px] font-black tabular-nums text-ink-50">{model.equation ?? "low | mid | high"}</span>
      </div>

      <div className="stage-hud-secondary pointer-events-none absolute right-11 top-3 z-10 justify-end gap-1">
        {[["0 zone", zoneLabel(model.zones.zeros)], ["1 zone", zoneLabel(model.zones.ones)], ["unknown", zoneLabel(model.zones.unknown)], ["2 zone", zoneLabel(model.zones.twos)], ["swaps", model.swaps]].map(([label, value]) => (
          <div key={label} className="min-w-12 rounded border border-ink-700/65 bg-ink-950/86 px-1.5 py-1 text-center shadow-lg backdrop-blur-md">
            <span className="block font-mono text-[7px] font-black uppercase tracking-widest text-ink-500">{label}</span>
            <span className="block max-w-[4.5rem] truncate font-mono text-[9px] font-black leading-tight text-ink-50">{value}</span>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 z-10 flex items-end justify-between gap-2 sm:left-4 sm:right-4">
        <p data-testid="dnf-detail" className="max-w-[36rem] rounded-md border border-arc-400/25 bg-ink-950/88 px-2.5 py-1.5 text-[11px] leading-snug text-ink-200 shadow-xl backdrop-blur-md">{model.detail}</p>
        <div className="stage-hud-legend ml-auto flex-wrap justify-end gap-1">
          <span className="rounded border border-cyan-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-cyan-200 backdrop-blur">cyan 0</span>
          <span className="rounded border border-amber-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-amber-200 backdrop-blur">amber 1</span>
          <span className="rounded border border-violet-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-violet-200 backdrop-blur">violet 2</span>
        </div>
      </div>
    </>
  );
}

export function DutchNationalFlagStage3D({ step, steps }: { step: TraceStep; steps?: TraceStep[] }) {
  const model = getDutchFlagSceneModel(step);
  const p = useTheme3D();
  const reduced = Boolean(useReducedMotion());
  const hud = useStageHud();
  if (!model) return null;
  return (
    <div className="codeanvil-canvas-fill codeanvil-stage-frame relative h-full w-full overflow-hidden rounded-md @container">
      <Canvas shadows="basic" dpr={[1.25, 2]} data-testid="dutch-national-flag-stage-canvas" camera={{ position: [0, 3.75, 9.4], fov: 43 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} style={{ width: "100%", height: "100%", background: "transparent" }}>
        <CanvasSizeSync />
        <Scene model={model} p={p} reduced={reduced} />
      </Canvas>
      <HudToggle open={hud.hudOpen} onToggle={hud.toggleHud} />
      {hud.hudOpen ? <Overlay model={model} /> : null}
      <div className="dnf-line-badge"><CodeLineBadge step={step} /></div>
      <StageProgressBar step={step} steps={steps} />
    </div>
  );
}
