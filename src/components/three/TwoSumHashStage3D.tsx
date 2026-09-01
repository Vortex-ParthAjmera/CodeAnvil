import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import {
  getTwoSumHashSceneModel,
  type TwoSumHashEntry,
  type TwoSumHashSceneModel,
} from "../../engine/twoSumHashStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";
import { CodeLineBadge } from "./CodeLineBadge";
import { HudToggle, useStageHud } from "./StageHud";
import { StageProgressBar } from "./StageProgressBar";

const MISS_COLOR = "#fb7185";
const LOOKUP_Y = 1.62;

function gapForCount(count: number): number {
  if (count <= 6) return 1.02;
  return Math.max(0.68, 6.7 / Math.max(1, count - 1));
}

function tileWidthForCount(count: number): number {
  return Math.max(0.42, Math.min(0.68, gapForCount(count) * 0.68));
}

function xForPosition(position: number, count: number): number {
  return (position - (count - 1) / 2) * gapForCount(count);
}

function CameraRig({ stageWidth, reduced }: { stageWidth: number; reduced: boolean }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const target = useRef(new THREE.Vector3(0, 3.45, Math.max(8.5, stageWidth * 0.86 + 3.2)));
  const reframing = useRef(true);

  useLayoutEffect(() => {
    camera.position.copy(target.current);
    camera.lookAt(0, 0.05, 0);
  }, [camera]);

  useEffect(() => {
    target.current.set(0, 3.45, Math.max(8.5, stageWidth * 0.86 + 3.2));
    reframing.current = true;
  }, [stageWidth]);

  useFrame((_, delta) => {
    if (!reframing.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.0008, delta);
    camera.position.lerp(target.current, amount);
    camera.lookAt(0, 0.05, 0);
    if (camera.position.distanceTo(target.current) < 0.012) {
      camera.position.copy(target.current);
      reframing.current = false;
    }
  });

  return null;
}

function ArrayCell({
  index,
  value,
  model,
  p,
  reduced,
}: {
  index: number;
  value: number;
  model: TwoSumHashSceneModel;
  p: Theme3DPalette;
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const cell = model.cells[index];
  const x = xForPosition(index, model.values.length);
  const width = tileWidthForCount(model.values.length);
  const color = cell.matched
    ? p.verdant
    : cell.active
      ? p.arcBright
      : cell.processed
        ? p.ember
        : p.barDefault;
  const targetColor = useMemo(() => new THREE.Color(color), [color]);

  useLayoutEffect(() => {
    if (group.current) group.current.position.set(x, -1.1, 0);
  }, []);

  useFrame(({ clock }, delta) => {
    if (!group.current || !body.current || !material.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00065, delta);
    const pulse = !reduced && cell.active ? Math.sin(clock.elapsedTime * 3.4) * 0.035 : 0;
    const targetY = -1.1 + (cell.matched ? 0.2 : cell.active ? 0.12 : 0) + pulse;
    const targetScale = cell.matched ? 1.1 : cell.active ? 1.06 : cell.processed ? 0.96 : 1;
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, x, amount);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, targetY, amount);
    body.current.scale.setScalar(THREE.MathUtils.lerp(body.current.scale.x, targetScale, amount));
    material.current.color.lerp(targetColor, amount);
    material.current.emissive.lerp(targetColor, amount);
    material.current.emissiveIntensity = THREE.MathUtils.lerp(
      material.current.emissiveIntensity,
      cell.matched ? 0.82 : cell.active ? 0.68 : cell.processed ? 0.25 : 0.08,
      amount,
    );
  });

  return (
    <group ref={group} position={[x, -1.1, 0]}>
      <mesh ref={body} castShadow receiveShadow>
        <boxGeometry args={[width, 0.3, 0.72]} />
        <meshStandardMaterial
          ref={material}
          color={color}
          emissive={color}
          emissiveIntensity={cell.active ? 0.68 : 0.08}
          metalness={0.48}
          roughness={0.3}
        />
        <Edges color={cell.matched || cell.active ? p.textStrong : color} threshold={18} />
      </mesh>

      <Html
        position={[0, 0.2, 0.44]}
        center
        style={{ pointerEvents: "none", WebkitFontSmoothing: "antialiased", textRendering: "geometricPrecision" }}
      >
        <div
          data-two-sum-hash-value={index}
          className="stage-value-card"
          style={{ borderColor: color }}
        >
          {value}
        </div>
      </Html>

      <Html position={[0, -0.35, 0.2]} center style={{ pointerEvents: "none" }}>
        <div className="rounded border border-ink-700/70 bg-ink-950/92 px-1.5 py-0.5 font-mono text-[8px] font-black leading-none text-ink-400 shadow-lg">
          i={index}
        </div>
      </Html>
    </group>
  );
}

function EmptyMapSlot({ order, count, p }: { order: number; count: number; p: Theme3DPalette }) {
  const x = xForPosition(order, count);
  const width = tileWidthForCount(count);

  return (
    <group position={[x, 0.68, 0]}>
      <mesh>
        <boxGeometry args={[width, 0.5, 0.72]} />
        <meshStandardMaterial
          color={p.emptyCell}
          emissive={p.gridSection}
          emissiveIntensity={0.06}
          transparent
          opacity={0.34}
          metalness={0.38}
          roughness={0.42}
        />
        <Edges color={p.gridSection} threshold={18} />
      </mesh>
    </group>
  );
}

function MapEntryToken({
  entry,
  model,
  p,
  reduced,
}: {
  entry: TwoSumHashEntry;
  model: TwoSumHashSceneModel;
  p: Theme3DPalette;
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const birth = useRef(reduced ? 1 : 0);
  const targetX = xForPosition(entry.order, model.values.length);
  const sourceX = xForPosition(entry.index, model.values.length);
  const width = tileWidthForCount(model.values.length);
  const isStore = model.operation === "store" && entry.order === model.storedOrder;
  const isHit = (model.operation === "lookup-hit" || model.operation === "found") && entry.matched;
  const color = entry.matched ? p.verdant : isStore ? p.emberBright : entry.active ? p.arcBright : p.ember;
  const targetColor = useMemo(() => new THREE.Color(color), [color]);

  useLayoutEffect(() => {
    if (!group.current) return;
    if (birth.current >= 1) {
      group.current.position.set(targetX, 0.68, 0.08);
      return;
    }
    group.current.position.set(sourceX, -0.78, 0.3);
    group.current.scale.setScalar(0.72);
  }, []);

  useFrame(({ clock }, delta) => {
    if (!group.current || !material.current) return;
    if (birth.current < 1) {
      birth.current = reduced ? 1 : Math.min(1, birth.current + delta * 1.6);
      const t = 1 - Math.pow(1 - birth.current, 3);
      group.current.position.x = THREE.MathUtils.lerp(sourceX, targetX, t);
      group.current.position.y = THREE.MathUtils.lerp(-0.78, 0.68, t) + Math.sin(Math.PI * t) * 0.48;
      group.current.position.z = THREE.MathUtils.lerp(0.3, 0.08, t);
      group.current.scale.setScalar(THREE.MathUtils.lerp(0.72, 1, t));
    } else {
      const amount = reduced ? 1 : 1 - Math.pow(0.0007, delta);
      group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetX, amount);
      group.current.position.y = THREE.MathUtils.lerp(
        group.current.position.y,
        0.68 + (!reduced && (isStore || isHit) ? Math.sin(clock.elapsedTime * 3.1) * 0.035 : 0),
        amount,
      );
      group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, isHit ? 0.18 : 0.08, amount);
      const scale = isHit ? 1.1 : isStore ? 1.05 : 1;
      group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, scale, amount));
    }
    material.current.color.lerp(targetColor, reduced ? 1 : 1 - Math.pow(0.0007, delta));
    material.current.emissive.lerp(targetColor, reduced ? 1 : 1 - Math.pow(0.0007, delta));
    material.current.emissiveIntensity = THREE.MathUtils.lerp(
      material.current.emissiveIntensity,
      isHit ? 0.85 : isStore ? 0.68 : 0.24,
      reduced ? 1 : 1 - Math.pow(0.0007, delta),
    );
  });

  return (
    <group ref={group} position={[targetX, 0.68, 0.08]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, 0.5, 0.72]} />
        <meshStandardMaterial
          ref={material}
          color={color}
          emissive={color}
          emissiveIntensity={isHit ? 0.85 : isStore ? 0.68 : 0.24}
          metalness={0.52}
          roughness={0.27}
        />
        <Edges color={isHit ? p.textStrong : color} threshold={18} />
      </mesh>
      <Html position={[0, 0.04, 0.45]} center style={{ pointerEvents: "none" }}>
        <div
          data-two-sum-hash-entry={entry.order}
          className="min-w-10 rounded border bg-ink-950/96 px-1.5 py-1 text-center font-mono leading-none shadow-xl"
          style={{ borderColor: color, WebkitFontSmoothing: "antialiased" }}
        >
          <span className="block text-[12px] font-black text-ink-50">{entry.value}</span>
          <span className="mt-0.5 block text-[7px] font-bold uppercase text-ink-400">i={entry.index}</span>
        </div>
      </Html>
    </group>
  );
}

function LookupGate({
  model,
  p,
  reduced,
}: {
  model: TwoSumHashSceneModel;
  p: Theme3DPalette;
  reduced: boolean;
}) {
  const ring = useRef<THREE.Group>(null);
  const hit = model.operation === "lookup-hit" || model.operation === "found";
  const miss = model.operation === "lookup-miss" || model.operation === "not-found";
  const color = hit ? p.verdant : miss ? MISS_COLOR : model.operation === "store" ? p.emberBright : p.arcBright;

  useFrame(({ clock }, delta) => {
    if (!ring.current) return;
    ring.current.rotation.z += reduced ? 0 : delta * (hit ? 0.45 : 0.24);
    ring.current.scale.setScalar(reduced ? 1 : 1 + Math.sin(clock.elapsedTime * 2.2) * 0.025);
  });

  return (
    <group position={[0, LOOKUP_Y, 0.02]}>
      <group ref={ring}>
        <mesh>
          <torusGeometry args={[0.48, 0.045, 18, 72]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.15} metalness={0.58} roughness={0.2} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.61, 0.018, 12, 64]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
      </group>
      <mesh>
        <sphereGeometry args={[0.09, 20, 20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} />
      </mesh>
      <Html position={[0, 0.82, 0]} center style={{ pointerEvents: "none" }}>
        <div className="hash-two-sum-gate-label whitespace-nowrap rounded border border-arc-400/35 bg-ink-950/94 px-2 py-1 font-mono text-[8px] font-black uppercase tracking-widest text-ink-200 shadow-xl">
          hash lookup
        </div>
      </Html>
      <Html position={[0, 0, 0.2]} center style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded border bg-ink-950/95 px-2 py-1 font-mono text-[10px] font-black shadow-xl" style={{ borderColor: color, color }}>
          {model.complement === null ? "waiting" : `need ${model.complement}`}
        </div>
      </Html>
    </group>
  );
}

function ComplementProbe({
  model,
  p,
  reduced,
}: {
  model: TwoSumHashSceneModel;
  p: Theme3DPalette;
  reduced: boolean;
}) {
  const probe = useRef<THREE.Group>(null);
  const activeX = model.activeIndex >= 0 ? xForPosition(model.activeIndex, model.values.length) : 0;
  const lookupPhase = model.operation === "lookup-miss" || model.operation === "lookup-hit" || model.operation === "found";
  const target = lookupPhase
    ? new THREE.Vector3(0, LOOKUP_Y, 0.2)
    : model.operation === "store" && model.storedOrder !== null
      ? new THREE.Vector3(xForPosition(model.storedOrder, model.values.length), 1.24, 0.22)
      : model.activeIndex >= 0
        ? new THREE.Vector3(activeX, -0.48, 0.24)
        : new THREE.Vector3(0, LOOKUP_Y, 0.2);
  const hit = model.operation === "lookup-hit" || model.operation === "found";
  const miss = model.operation === "lookup-miss" || model.operation === "not-found";
  const color = hit ? p.verdant : miss ? MISS_COLOR : model.operation === "store" ? p.emberBright : p.arcBright;

  useLayoutEffect(() => {
    if (probe.current) probe.current.position.copy(target);
  }, []);

  useFrame(({ clock }, delta) => {
    if (!probe.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00042, delta);
    probe.current.position.lerp(target, amount);
    probe.current.rotation.y += reduced ? 0 : delta * 1.3;
    probe.current.scale.setScalar(reduced ? 1 : 1 + Math.sin(clock.elapsedTime * 3.4) * 0.05);
  });

  const pathPoints = model.activeIndex < 0 || model.operation === "start" || model.operation === "not-found"
    ? null
    : Array.from({ length: 30 }, (_, pointIndex) => {
        const t = pointIndex / 29;
        const endX = lookupPhase ? 0 : target.x;
        const endY = lookupPhase ? LOOKUP_Y : target.y;
        return new THREE.Vector3(
          THREE.MathUtils.lerp(activeX, endX, t),
          THREE.MathUtils.lerp(-0.76, endY, t) + Math.sin(Math.PI * t) * 0.3,
          0.2,
        );
      });

  return (
    <group>
      {pathPoints ? <Line points={pathPoints} color={color} lineWidth={1.8} transparent opacity={0.62} /> : null}
      <group ref={probe} position={target}>
        <mesh>
          <icosahedronGeometry args={[0.11, 1]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.25} metalness={0.35} roughness={0.24} />
        </mesh>
      </group>
    </group>
  );
}

function PairCircuit({
  model,
  p,
  reduced,
}: {
  model: TwoSumHashSceneModel;
  p: Theme3DPalette;
  reduced: boolean;
}) {
  const pulse = useRef<THREE.Mesh>(null);
  const pair = model.pairIndices;
  const curve = pair && model.hitEntryOrder !== null
    ? new THREE.CatmullRomCurve3([
        new THREE.Vector3(xForPosition(pair[0], model.values.length), -0.78, 0.25),
        new THREE.Vector3(xForPosition(pair[0], model.values.length), -0.05, 0.28),
        new THREE.Vector3(xForPosition(model.hitEntryOrder, model.values.length), 0.68, 0.28),
        new THREE.Vector3(0, LOOKUP_Y, 0.25),
        new THREE.Vector3(xForPosition(pair[1], model.values.length), -0.76, 0.25),
      ])
    : null;

  useFrame(({ clock }) => {
    if (!pulse.current || !curve) return;
    const t = reduced ? 0.72 : (clock.elapsedTime * 0.24) % 1;
    pulse.current.position.copy(curve.getPointAt(t));
  });

  if (!curve) return null;
  const points = curve.getPoints(72);

  return (
    <group>
      <Line points={points} color={p.verdant} lineWidth={3} transparent opacity={0.9} />
      <mesh ref={pulse}>
        <sphereGeometry args={[0.075, 18, 18]} />
        <meshStandardMaterial color={p.textStrong} emissive={p.verdant} emissiveIntensity={1.6} />
      </mesh>
    </group>
  );
}

function Scanner({
  model,
  stageWidth,
  p,
  reduced,
}: {
  model: TwoSumHashSceneModel;
  stageWidth: number;
  p: Theme3DPalette;
  reduced: boolean;
}) {
  const carriage = useRef<THREE.Group>(null);
  const targetX = model.activeIndex >= 0 ? xForPosition(model.activeIndex, model.values.length) : 0;

  useLayoutEffect(() => {
    if (carriage.current) carriage.current.position.x = targetX;
  }, []);

  useFrame((_, delta) => {
    if (!carriage.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00055, delta);
    carriage.current.position.x = THREE.MathUtils.lerp(carriage.current.position.x, targetX, amount);
  });

  return (
    <group>
      <mesh position={[0, -0.36, -0.03]}>
        <boxGeometry args={[stageWidth, 0.08, 0.12]} />
        <meshStandardMaterial color={p.gridSection} metalness={0.6} roughness={0.28} />
      </mesh>
      <group ref={carriage} position={[targetX, 0, 0]} visible={model.activeIndex >= 0}>
        <mesh position={[0, -0.48, 0.02]}>
          <cylinderGeometry args={[0.025, 0.055, 0.72, 18]} />
          <meshBasicMaterial color={p.arcBright} transparent opacity={0.74} />
        </mesh>
        <mesh position={[0, -0.25, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.18, 0.035, 14, 44]} />
          <meshStandardMaterial color={p.arcBright} emissive={p.arcBright} emissiveIntensity={1.1} />
        </mesh>
        {model.activeIndex >= 0 ? (
          <Html position={[0, -0.06, 0.1]} center style={{ pointerEvents: "none" }}>
            <div className="whitespace-nowrap rounded border border-arc-400/55 bg-ink-950/94 px-2 py-1 font-mono text-[8px] font-black text-arc-200 shadow-xl">
              i = {model.activeIndex}
            </div>
          </Html>
        ) : null}
      </group>
    </group>
  );
}

function RackLabel({
  position,
  children,
  color,
  className = "",
}: {
  position: [number, number, number];
  children: string;
  color: string;
  className?: string;
}) {
  return (
    <Html position={position} center style={{ pointerEvents: "none" }}>
      <div className={`${className} whitespace-nowrap rounded border bg-ink-950/92 px-2 py-1 font-mono text-[8px] font-black uppercase tracking-widest shadow-xl`} style={{ borderColor: color, color }}>
        {children}
      </div>
    </Html>
  );
}

function Scene({
  model,
  p,
  reduced,
}: {
  model: TwoSumHashSceneModel;
  p: Theme3DPalette;
  reduced: boolean;
}) {
  const stageWidth = Math.max(5.8, (model.values.length - 1) * gapForCount(model.values.length) + 1.8);
  const leftEdge = xForPosition(0, model.values.length) - 0.58;

  return (
    <>
      <CameraRig stageWidth={stageWidth} reduced={reduced} />
      <fog attach="fog" args={[p.background, 11, 24]} />
      <ambientLight intensity={0.72 * p.lighting.ambient} />
      <directionalLight castShadow position={[4.5, 7.2, 5]} intensity={1.4 * p.lighting.directional} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-3.4, 2.7, 3]} intensity={27 * p.lighting.accent} distance={11} color={p.arcBright} />
      <pointLight position={[3.4, 1.2, 2.5]} intensity={25 * p.lighting.accent} distance={10} color={p.emberBright} />
      <pointLight position={[0, 2.2, 2.8]} intensity={23 * p.lighting.accent} distance={9} color={p.verdant} />

      <group position={[0, -0.02, 0]}>
        <mesh position={[0, -1.42, -0.1]} receiveShadow>
          <boxGeometry args={[stageWidth + 0.3, 0.14, 1.42]} />
          <meshStandardMaterial color={p.emptyCell} metalness={0.38} roughness={0.48} />
          <Edges color={p.gridSection} threshold={18} />
        </mesh>
        <mesh position={[0, 0.36, -0.1]} receiveShadow>
          <boxGeometry args={[stageWidth + 0.3, 0.12, 1.42]} />
          <meshStandardMaterial color={p.emptyCell} emissive={p.ember} emissiveIntensity={0.06} metalness={0.42} roughness={0.42} />
          <Edges color={p.gridSection} threshold={18} />
        </mesh>

        <RackLabel position={[leftEdge, -1.86, 0.16]} color={p.arcBright}>array</RackLabel>
        <RackLabel position={[leftEdge, 0.02, 0.16]} color={p.emberBright} className="hash-two-sum-map-label-full">seen map: value -&gt; index</RackLabel>
        <RackLabel position={[0, 0.02, 0.16]} color={p.emberBright} className="hash-two-sum-map-label-compact">seen map</RackLabel>

        {Array.from({ length: model.values.length }, (_, order) => (
          <EmptyMapSlot key={`slot-${order}`} order={order} count={model.values.length} p={p} />
        ))}
        {model.entries.map((entry) => (
          <MapEntryToken key={`entry-${entry.value}`} entry={entry} model={model} p={p} reduced={reduced} />
        ))}
        {model.values.map((value, index) => (
          <ArrayCell key={index} index={index} value={value} model={model} p={p} reduced={reduced} />
        ))}

        <Scanner model={model} stageWidth={stageWidth} p={p} reduced={reduced} />
        <LookupGate model={model} p={p} reduced={reduced} />
        <ComplementProbe model={model} p={p} reduced={reduced} />
        <PairCircuit model={model} p={p} reduced={reduced} />
      </group>

      <InfiniteGrid
        position={[0, -1.76, -0.2]}
        cellSize={0.48}
        cellThickness={0.5}
        cellColor={p.gridCell}
        sectionSize={2.4}
        sectionThickness={0.88}
        sectionColor={p.gridSection}
        fadeDistance={22}
        fadeStrength={1}
        infiniteGrid
      />

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={6.2}
        maxDistance={17}
        minPolarAngle={0.4}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  );
}

function Overlay({ model }: { model: TwoSumHashSceneModel }) {
  const tone = model.operation === "found" || model.operation === "lookup-hit"
    ? "border-verdant-400/45 text-verdant-100"
    : model.operation === "lookup-miss" || model.operation === "not-found"
      ? "border-red-400/45 text-red-100"
      : model.operation === "store"
        ? "border-ember-400/45 text-ember-100"
        : "border-arc-400/45 text-arc-100";

  return (
    <>
      <div className="pointer-events-none absolute left-2 top-2 z-10 max-w-[13rem] rounded-md border border-arc-400/30 bg-ink-950/88 px-2.5 py-1.5 shadow-xl backdrop-blur-md sm:left-3 sm:top-3 sm:max-w-[18rem]">
        <div className="flex items-center gap-1.5">
          <span className={`rounded border bg-ink-900/70 px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-widest ${tone}`}>
            hash / {model.operation}
          </span>
          <span className="font-mono text-[8px] font-semibold uppercase tracking-wider text-ink-500">O(n) time</span>
        </div>
        <p data-testid="two-sum-hash-headline" className="mt-1 text-xs font-black leading-tight text-ink-50 sm:text-[13px]">
          {model.headline}
        </p>
      </div>

      <div className="stage-hud-secondary hash-two-sum-equation pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 items-center rounded-md border border-ink-700/70 bg-ink-950/90 px-3 py-2 shadow-xl backdrop-blur-md">
        <span className="max-w-56 truncate font-mono text-[11px] font-black tabular-nums text-ink-50">
          {model.equation ?? "target - value = complement"}
        </span>
      </div>

      <div className="stage-hud-secondary pointer-events-none absolute right-11 top-3 z-10 justify-end gap-1">
        {[
          ["target", model.target],
          ["index", model.activeIndex < 0 ? "-" : model.activeIndex],
          ["need", model.complement ?? "-"],
          ["map", model.entries.length],
          ["result", model.resultLabel],
        ].map(([label, value]) => (
          <div key={label} className="min-w-11 rounded border border-ink-700/65 bg-ink-950/86 px-1.5 py-1 text-center shadow-lg backdrop-blur-md">
            <span className="block font-mono text-[7px] font-black uppercase tracking-widest text-ink-500">{label}</span>
            <span className="block max-w-[5.25rem] truncate font-mono text-[10px] font-black leading-tight text-ink-50">{value}</span>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 z-10 flex items-end justify-between gap-2 sm:left-4 sm:right-4">
        <p data-testid="two-sum-hash-detail" className="max-w-[32rem] rounded-md border border-arc-400/25 bg-ink-950/88 px-2.5 py-1.5 text-[11px] leading-snug text-ink-200 shadow-xl backdrop-blur-md">
          {model.detail}
        </p>
        <div className="stage-hud-legend ml-auto flex-wrap justify-end gap-1">
          <span className="rounded border border-arc-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-arc-200 backdrop-blur">cyan current</span>
          <span className="rounded border border-ember-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-ember-200 backdrop-blur">orange stored</span>
          <span className="rounded border border-verdant-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-verdant-200 backdrop-blur">green pair</span>
        </div>
      </div>
    </>
  );
}

export function TwoSumHashStage3D({ step, steps }: { step: TraceStep; steps?: TraceStep[] }) {
  const model = getTwoSumHashSceneModel(step);
  const p = useTheme3D();
  const reduced = Boolean(useReducedMotion());
  const hud = useStageHud();

  if (!model) return null;

  return (
    <div className="codeanvil-canvas-fill codeanvil-stage-frame relative h-full w-full overflow-hidden rounded-md @container">
      <Canvas
        shadows
        dpr={[1.25, 2]}
        data-testid="two-sum-hash-stage-canvas"
        camera={{ position: [0, 3.45, 8.5], fov: 43 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <CanvasSizeSync />
        <Scene model={model} p={p} reduced={reduced} />
      </Canvas>
      <HudToggle open={hud.hudOpen} onToggle={hud.toggleHud} />
      {hud.hudOpen ? <Overlay model={model} /> : null}
      <div className="hash-two-sum-line-badge">
        <CodeLineBadge step={step} />
      </div>
      <StageProgressBar step={step} steps={steps} />
    </div>
  );
}
