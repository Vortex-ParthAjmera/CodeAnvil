import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls, Text } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import { getKadaneSceneModel, type KadaneSceneModel } from "../../engine/kadaneStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";
import { CodeLineBadge } from "./CodeLineBadge";
import { HudToggle, useStageHud } from "./StageHud";
import { StageProgressBar } from "./StageProgressBar";

interface ColumnLayout {
  index: number;
  value: number;
  x: number;
  height: number;
  width: number;
}

const NEGATIVE_COLOR = "#f87171";

function gapForCount(count: number): number {
  if (count <= 7) return 1.05;
  return Math.max(0.72, 6.6 / Math.max(1, count - 1));
}

function xForIndex(index: number, count: number, gap: number): number {
  return (index - (count - 1) / 2) * gap;
}

function makeColumnLayout(values: number[]): ColumnLayout[] {
  const magnitude = Math.max(1, ...values.map((value) => Math.abs(value)));
  const gap = gapForCount(values.length);
  const width = Math.max(0.4, Math.min(0.68, gap * 0.66));
  return values.map((value, index) => ({
    index,
    value,
    x: xForIndex(index, values.length, gap),
    height: 0.5 + (Math.abs(value) / magnitude) * 1.42,
    width,
  }));
}

function CameraRig({ stageWidth, reduced }: { stageWidth: number; reduced: boolean }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const target = useRef(new THREE.Vector3(0, 3.65, Math.max(9.2, stageWidth * 0.92 + 2.6)));
  const reframing = useRef(true);

  useLayoutEffect(() => {
    camera.position.copy(target.current);
    camera.lookAt(0, -0.5, 0);
  }, [camera]);

  useEffect(() => {
    target.current.set(0, 3.65, Math.max(9.2, stageWidth * 0.92 + 2.6));
    reframing.current = true;
  }, [stageWidth]);

  useFrame((_, delta) => {
    if (!reframing.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.0008, delta);
    camera.position.lerp(target.current, amount);
    camera.lookAt(0, -0.5, 0);
    if (camera.position.distanceTo(target.current) < 0.012) {
      camera.position.copy(target.current);
      reframing.current = false;
    }
  });

  return null;
}

function SignedColumn({
  column,
  model,
  p,
  reduced,
}: {
  column: ColumnLayout;
  model: KadaneSceneModel;
  p: Theme3DPalette;
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const inCurrent = column.index >= model.currentStart && column.index <= model.currentEnd;
  const inBest = column.index >= model.bestStart && column.index <= model.bestEnd;
  const active = column.index === model.activeIndex && model.operation !== "complete";
  const targetColor = useMemo(
    () => new THREE.Color(
      active
        ? p.arcBright
        : inCurrent
          ? p.ember
          : inBest
            ? p.verdant
            : column.value < 0
              ? NEGATIVE_COLOR
              : p.barDefault,
    ),
    [active, column.value, inBest, inCurrent, p.arcBright, p.barDefault, p.ember, p.verdant],
  );
  const direction = column.value < 0 ? -1 : 1;

  useLayoutEffect(() => {
    if (!body.current) return;
    body.current.scale.y = column.height;
    body.current.position.y = direction * column.height / 2;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!group.current || !body.current || !material.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00072, delta);
    const pulse = reduced || !active ? 0 : Math.sin(clock.elapsedTime * 3.2) * 0.035;
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, pulse, amount);
    body.current.scale.y = THREE.MathUtils.lerp(body.current.scale.y, column.height, amount);
    body.current.position.y = direction * body.current.scale.y / 2;
    material.current.color.lerp(targetColor, amount);
    material.current.emissive.lerp(targetColor, amount);
    material.current.emissiveIntensity = THREE.MathUtils.lerp(
      material.current.emissiveIntensity,
      active ? 0.62 : inCurrent ? 0.42 : inBest ? 0.3 : column.value < 0 ? 0.12 : 0.06,
      amount,
    );
  });

  const edgeColor = active
    ? p.textStrong
    : inCurrent
      ? p.emberBright
      : inBest
          ? p.verdant
          : column.value < 0
            ? NEGATIVE_COLOR
            : p.barDefault;
  const labelY = column.value >= 0 ? column.height + 0.23 : 0.3;

  return (
    <group ref={group} position={[column.x, 0, 0]}>
      <mesh ref={body} castShadow receiveShadow>
        <boxGeometry args={[column.width, 1, column.width]} />
        <meshStandardMaterial
          ref={material}
          color={targetColor}
          emissive={targetColor}
          emissiveIntensity={active ? 0.62 : inCurrent ? 0.42 : inBest ? 0.3 : 0.08}
          metalness={0.46}
          roughness={0.3}
        />
        <Edges color={edgeColor} threshold={18} />
      </mesh>

      <Html
        position={[0, labelY, column.width / 2 + 0.05]}
        center
        style={{
          pointerEvents: "none",
          WebkitFontSmoothing: "antialiased",
          textRendering: "geometricPrecision",
        }}
      >
        <div
          data-kadane-value={column.index}
          className="stage-value-card"
          style={{ borderColor: edgeColor }}
        >
          {column.value}
        </div>
      </Html>

      <Text
        position={[0, -2.31, 0.47]}
        fontSize={0.14}
        color={active ? p.arcBright : p.textDim}
        anchorX="center"
        anchorY="middle"
      >
        {`i=${column.index}`}
      </Text>
    </group>
  );
}

function RangeRail({
  start,
  end,
  count,
  gap,
  y,
  z,
  color,
  label,
  value,
  reduced,
}: {
  start: number;
  end: number;
  count: number;
  gap: number;
  y: number;
  z: number;
  color: string;
  label: string;
  value: number;
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const leftCap = useRef<THREE.Mesh>(null);
  const rightCap = useRef<THREE.Mesh>(null);
  const safeStart = Math.max(0, Math.min(count - 1, start));
  const safeEnd = Math.max(safeStart, Math.min(count - 1, end));
  const leftX = xForIndex(safeStart, count, gap);
  const rightX = xForIndex(safeEnd, count, gap);
  const targetCenter = (leftX + rightX) / 2;
  const targetWidth = Math.max(0.58, rightX - leftX + 0.72);

  useLayoutEffect(() => {
    if (group.current) group.current.position.x = targetCenter;
    if (beam.current) beam.current.scale.x = targetWidth;
    if (leftCap.current) leftCap.current.position.x = -targetWidth / 2;
    if (rightCap.current) rightCap.current.position.x = targetWidth / 2;
  }, []);

  useFrame((_, delta) => {
    if (!group.current || !beam.current || !leftCap.current || !rightCap.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00065, delta);
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetCenter, amount);
    beam.current.scale.x = THREE.MathUtils.lerp(beam.current.scale.x, targetWidth, amount);
    leftCap.current.position.x = THREE.MathUtils.lerp(leftCap.current.position.x, -targetWidth / 2, amount);
    rightCap.current.position.x = THREE.MathUtils.lerp(rightCap.current.position.x, targetWidth / 2, amount);
  });

  return (
    <group ref={group} position={[targetCenter, y, z]}>
      <mesh ref={beam} scale={[targetWidth, 1, 1]}>
        <boxGeometry args={[1, 0.1, 0.13]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.68} metalness={0.55} roughness={0.24} />
      </mesh>
      <mesh ref={leftCap} position={[-targetWidth / 2, 0.12, 0]}>
        <boxGeometry args={[0.055, 0.32, 0.14]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={rightCap} position={[targetWidth / 2, 0.12, 0]}>
        <boxGeometry args={[0.055, 0.32, 0.14]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Html position={[0, 0.25, 0.04]} center style={{ pointerEvents: "none" }}>
        <div data-kadane-rail={label} className="whitespace-nowrap rounded border bg-ink-950/94 px-1.5 py-0.5 font-mono text-[8px] font-black uppercase shadow-lg" style={{ borderColor: color, color }}>
          {label} {value}
        </div>
      </Html>
    </group>
  );
}

function Scanner({
  model,
  columns,
  stageWidth,
  p,
  reduced,
}: {
  model: KadaneSceneModel;
  columns: ColumnLayout[];
  stageWidth: number;
  p: Theme3DPalette;
  reduced: boolean;
}) {
  const carriage = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const target = columns[model.activeIndex] ?? columns[0];

  useLayoutEffect(() => {
    if (carriage.current) carriage.current.position.x = target.x;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!carriage.current || !beam.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00055, delta);
    carriage.current.position.x = THREE.MathUtils.lerp(carriage.current.position.x, target.x, amount);
    const targetBottom = target.value >= 0 ? target.height + 0.12 : 0.18;
    const length = Math.max(0.18, 2.42 - targetBottom);
    beam.current.scale.y = THREE.MathUtils.lerp(beam.current.scale.y, length, amount);
    beam.current.position.y = THREE.MathUtils.lerp(beam.current.position.y, 2.42 - length / 2, amount);
    carriage.current.position.z = reduced ? 0 : Math.sin(clock.elapsedTime * 2.3) * 0.012;
  });

  return (
    <group>
      <mesh position={[0, 2.86, -0.02]} castShadow>
        <boxGeometry args={[stageWidth, 0.1, 0.14]} />
        <meshStandardMaterial color={p.gridSection} metalness={0.68} roughness={0.24} />
        <Edges color={p.arcDeep} threshold={18} />
      </mesh>
      <group ref={carriage} position={[target.x, 0, 0]}>
        <mesh position={[0, 2.66, 0]} castShadow>
          <boxGeometry args={[0.46, 0.3, 0.38]} />
          <meshStandardMaterial color={p.arcDeep} emissive={p.arcBright} emissiveIntensity={0.62} metalness={0.6} roughness={0.22} />
          <Edges color={p.arcBright} threshold={18} />
        </mesh>
        <mesh ref={beam} position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.018, 0.052, 1, 18]} />
          <meshBasicMaterial color={p.arcBright} transparent opacity={0.76} />
        </mesh>
        <Html position={[0, 3.02, 0]} center style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded border border-arc-400/55 bg-ink-950/94 px-2 py-1 font-mono text-[9px] font-black text-arc-200 shadow-xl">
            i = {model.activeIndex}
          </div>
        </Html>
      </group>
    </group>
  );
}

function DecisionFork({
  model,
  columns,
  p,
}: {
  model: KadaneSceneModel;
  columns: ColumnLayout[];
  p: Theme3DPalette;
}) {
  if (model.operation !== "choice") return null;
  const active = columns[model.activeIndex];
  const previous = columns[model.previousCurrentEnd ?? Math.max(0, model.activeIndex - 1)];
  if (!active || !previous) return null;

  const extendPoints = Array.from({ length: 24 }, (_, pointIndex) => {
    const t = pointIndex / 23;
    return new THREE.Vector3(
      THREE.MathUtils.lerp(previous.x, active.x, t),
      0.32 + Math.sin(Math.PI * t) * 0.42,
      0.5,
    );
  });

  return (
    <group>
      <Line
        points={extendPoints}
        color={model.shouldRestart ? p.gridSection : p.emberBright}
        lineWidth={model.shouldRestart ? 1.2 : 2.8}
        transparent
        opacity={model.shouldRestart ? 0.38 : 0.9}
      />
      <mesh position={[active.x, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[active.width * 0.74, 0.045, 14, 48]} />
        <meshStandardMaterial
          color={model.shouldRestart ? p.arcBright : p.gridSection}
          emissive={model.shouldRestart ? p.arcBright : p.gridSection}
          emissiveIntensity={model.shouldRestart ? 1.05 : 0.2}
        />
      </mesh>
    </group>
  );
}

function Scene({
  model,
  p,
  reduced,
}: {
  model: KadaneSceneModel;
  p: Theme3DPalette;
  reduced: boolean;
}) {
  const columns = useMemo(() => makeColumnLayout(model.values), [model.values]);
  const gap = gapForCount(model.values.length);
  const stageWidth = Math.max(6.1, (model.values.length - 1) * gap + 1.9);

  return (
    <>
      <CameraRig stageWidth={stageWidth} reduced={reduced} />
      <fog attach="fog" args={[p.background, 11, 25]} />
      <ambientLight intensity={0.7 * p.lighting.ambient} />
      <directionalLight
        castShadow
        position={[4.5, 7.5, 5]}
        intensity={1.42 * p.lighting.directional}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-4, 2.5, 3]} intensity={25 * p.lighting.accent} distance={11} color={p.arcBright} />
      <pointLight position={[3.5, 1.5, 2.5]} intensity={24 * p.lighting.accent} distance={10} color={p.ember} />
      <pointLight position={[0, -1.2, 2.8]} intensity={20 * p.lighting.accent} distance={9} color={p.verdant} />

      <group position={[0, -0.1, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[stageWidth + 0.2, 0.08, 0.12]} />
          <meshStandardMaterial color={p.gridSection} emissive={p.gridSection} emissiveIntensity={0.22} metalness={0.55} roughness={0.28} />
        </mesh>
        <mesh position={[0, -2.48, 0]} receiveShadow>
          <boxGeometry args={[stageWidth + 0.35, 0.14, 1.7]} />
          <meshStandardMaterial color={p.emptyCell} metalness={0.38} roughness={0.48} />
          <Edges color={p.gridSection} threshold={18} />
        </mesh>

        <RangeRail
          start={model.currentStart}
          end={model.currentEnd}
          count={model.values.length}
          gap={gap}
          y={-1.9}
          z={0.72}
          color={p.ember}
          label="current"
          value={model.currentSum}
          reduced={reduced}
        />
        <RangeRail
          start={model.bestStart}
          end={model.bestEnd}
          count={model.values.length}
          gap={gap}
          y={-2.28}
          z={0.72}
          color={p.verdant}
          label="best"
          value={model.bestSum}
          reduced={reduced}
        />
        <DecisionFork model={model} columns={columns} p={p} />
        {columns.map((column) => (
          <SignedColumn
            key={column.index}
            column={column}
            model={model}
            p={p}
            reduced={reduced}
          />
        ))}
        <Scanner model={model} columns={columns} stageWidth={stageWidth} p={p} reduced={reduced} />
      </group>

      <InfiniteGrid
        position={[0, -2.72, -0.18]}
        cellSize={0.48}
        cellThickness={0.52}
        cellColor={p.gridCell}
        sectionSize={2.4}
        sectionThickness={0.9}
        sectionColor={p.gridSection}
        fadeDistance={23}
        fadeStrength={1}
        infiniteGrid
      />

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={6.4}
        maxDistance={17}
        minPolarAngle={0.42}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  );
}

function ChoiceEquation({ model }: { model: KadaneSceneModel }) {
  if (model.operation !== "choice") {
    return (
      <span className="max-w-52 truncate font-mono text-[11px] font-black tabular-nums text-ink-50">
        {model.equation ?? `current ${model.currentSum} / best ${model.bestSum}`}
      </span>
    );
  }

  return (
    <div className="grid min-w-48 grid-cols-[auto_1fr] gap-x-2 gap-y-1 font-mono text-[9px] font-bold tabular-nums">
      <span className={model.shouldRestart ? "text-arc-300" : "text-ink-500"}>restart</span>
      <span className={model.shouldRestart ? "text-ink-50" : "text-ink-500"}>{model.currentValue}</span>
      <span className={model.shouldRestart ? "text-ink-500" : "text-ember-300"}>extend</span>
      <span className={model.shouldRestart ? "text-ink-500" : "text-ink-50"}>
        {model.previousCurrentSum} + {model.currentValue} = {model.extendedSum}
      </span>
    </div>
  );
}

function Overlay({ model }: { model: KadaneSceneModel }) {
  return (
    <>
      <div className="pointer-events-none absolute left-2 top-2 z-10 max-w-[13rem] rounded-md border border-arc-400/30 bg-ink-950/86 px-2.5 py-1.5 shadow-xl backdrop-blur-md sm:left-3 sm:top-3 sm:max-w-[18rem]">
        <div className="flex items-center gap-1.5">
          <span className="rounded border border-arc-400/40 bg-arc-500/10 px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-widest text-arc-200">
            kadane / {model.operation}
          </span>
          <span className="font-mono text-[8px] font-semibold uppercase tracking-wider text-ink-500">O(n)</span>
        </div>
        <p data-testid="kadane-headline" className="mt-1 text-xs font-black leading-tight text-ink-50 sm:text-[13px]">
          {model.headline}
        </p>
      </div>

      <div className="stage-hud-secondary kadane-equation pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 items-center rounded-md border border-ink-700/70 bg-ink-950/88 px-3 py-2 shadow-xl backdrop-blur-md">
        <ChoiceEquation model={model} />
      </div>

      <div className="stage-hud-secondary pointer-events-none absolute right-11 top-3 z-10 justify-end gap-1">
        {[
          ["index", model.activeIndex],
          ["current", model.currentSum],
          ["best", model.bestSum],
          ["range", `${model.bestStart}..${model.bestEnd}`],
        ].map(([label, value]) => (
          <div key={label} className="min-w-12 rounded border border-ink-700/65 bg-ink-950/84 px-1.5 py-1 text-center shadow-lg backdrop-blur-md">
            <span className="block font-mono text-[7px] font-black uppercase tracking-widest text-ink-500">{label}</span>
            <span className="block max-w-[5.25rem] truncate font-mono text-[10px] font-black leading-tight text-ink-50">{value}</span>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 z-10 flex items-end justify-between gap-2 sm:left-4 sm:right-4">
        <p data-testid="kadane-detail" className="max-w-[31rem] rounded-md border border-arc-400/25 bg-ink-950/86 px-2.5 py-1.5 text-[11px] leading-snug text-ink-200 shadow-xl backdrop-blur-md">
          {model.detail}
        </p>
        <div className="stage-hud-legend ml-auto flex-wrap justify-end gap-1">
          <span className="rounded border border-arc-400/35 bg-ink-950/82 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-arc-200 backdrop-blur">cyan scanner</span>
          <span className="rounded border border-ember-400/35 bg-ink-950/82 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-ember-200 backdrop-blur">orange current</span>
          <span className="rounded border border-verdant-400/35 bg-ink-950/82 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-verdant-200 backdrop-blur">green best</span>
        </div>
      </div>
    </>
  );
}

export function KadaneStage3D({ step, steps }: { step: TraceStep; steps?: TraceStep[] }) {
  const model = getKadaneSceneModel(step);
  const p = useTheme3D();
  const reduced = Boolean(useReducedMotion());
  const hud = useStageHud();

  if (!model) return null;

  return (
    <div className="codeanvil-canvas-fill codeanvil-stage-frame relative h-full w-full overflow-hidden rounded-md">
      <Canvas
        shadows
        dpr={[1.25, 2]}
        data-testid="kadane-stage-canvas"
        camera={{ position: [0, 3.65, 9.2], fov: 43 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <CanvasSizeSync />
        <Scene model={model} p={p} reduced={reduced} />
      </Canvas>
      <HudToggle open={hud.hudOpen} onToggle={hud.toggleHud} />
      {hud.hudOpen ? <Overlay model={model} /> : null}
      <div className="kadane-line-badge">
        <CodeLineBadge step={step} />
      </div>
      <StageProgressBar step={step} steps={steps} />
    </div>
  );
}
