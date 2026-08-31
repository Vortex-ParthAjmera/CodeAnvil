import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls, Text } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import {
  getMinArraySceneModel,
  type MinArraySceneModel,
} from "../../engine/minArrayStage";
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

const MIN_HEIGHT = 0.62;
const MAX_HEIGHT = 2.2;

function gapForCount(count: number): number {
  if (count <= 6) return 1.22;
  return Math.max(0.72, 6.15 / Math.max(1, count - 1));
}

function xForIndex(index: number, count: number, gap: number): number {
  return (index - (count - 1) / 2) * gap;
}

function makeColumnLayout(values: number[]): ColumnLayout[] {
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = Math.max(1, high - low);
  const gap = gapForCount(values.length);
  const width = Math.max(0.42, Math.min(0.72, gap * 0.58));

  return values.map((value, index) => ({
    index,
    value,
    x: xForIndex(index, values.length, gap),
    height:
      high === low
        ? (MIN_HEIGHT + MAX_HEIGHT) / 2
        : MIN_HEIGHT + ((value - low) / span) * (MAX_HEIGHT - MIN_HEIGHT),
    width,
  }));
}

function CameraRig({ stageWidth, reduced }: { stageWidth: number; reduced: boolean }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const target = useRef(new THREE.Vector3(0, 3.5, Math.max(8.7, stageWidth * 0.94 + 2.1)));
  const reframing = useRef(true);

  useLayoutEffect(() => {
    camera.position.copy(target.current);
    camera.lookAt(0, -0.25, 0);
  }, [camera]);

  useEffect(() => {
    target.current.set(0, 3.5, Math.max(8.7, stageWidth * 0.94 + 2.1));
    reframing.current = true;
  }, [stageWidth]);

  useFrame((_, delta) => {
    if (!reframing.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.0008, delta);
    camera.position.lerp(target.current, amount);
    camera.lookAt(0, -0.25, 0);
    if (camera.position.distanceTo(target.current) < 0.012) {
      camera.position.copy(target.current);
      reframing.current = false;
    }
  });

  return null;
}

function AnimatedColumn({
  column,
  model,
  p,
  reduced,
}: {
  column: ColumnLayout;
  model: MinArraySceneModel;
  p: Theme3DPalette;
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const isCandidate = column.index === model.candidateIndex;
  const isCurrent = column.index === model.currentIndex && model.operation !== "complete";
  const isChecked = column.index <= model.checkedThrough;
  const targetColor = useMemo(
    () =>
      new THREE.Color(
        isCandidate
          ? p.verdant
          : isCurrent
            ? p.arcBright
            : isChecked
              ? p.arcDeep
              : p.barDefault,
      ),
    [isCandidate, isChecked, isCurrent, p.arcBright, p.arcDeep, p.barDefault, p.verdant],
  );

  useLayoutEffect(() => {
    if (!body.current) return;
    body.current.scale.y = column.height;
    body.current.position.y = column.height / 2;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!group.current || !body.current || !material.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.0007, delta);
    const pulse = reduced || !isCandidate ? 0 : Math.sin(clock.elapsedTime * 3.4) * 0.025;
    const lift = isCurrent ? 0.1 : isCandidate ? 0.04 + pulse : 0;

    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, lift, amount);
    body.current.scale.y = THREE.MathUtils.lerp(body.current.scale.y, column.height, amount);
    body.current.position.y = body.current.scale.y / 2;
    material.current.color.lerp(targetColor, amount);
    material.current.emissive.lerp(targetColor, amount);
    material.current.emissiveIntensity = THREE.MathUtils.lerp(
      material.current.emissiveIntensity,
      isCandidate ? 0.62 : isCurrent ? 0.5 : isChecked ? 0.17 : 0.06,
      amount,
    );
  });

  return (
    <group ref={group} position={[column.x, 0, 0]}>
      <mesh ref={body} castShadow receiveShadow>
        <boxGeometry args={[column.width, 1, column.width]} />
        <meshStandardMaterial
          ref={material}
          color={targetColor}
          emissive={targetColor}
          emissiveIntensity={isCandidate ? 0.62 : isCurrent ? 0.5 : 0.08}
          metalness={0.48}
          roughness={0.3}
        />
        <Edges color={isCandidate || isCurrent ? p.textStrong : targetColor} threshold={18} />
      </mesh>

      <Html
        position={[0, column.height + 0.25, 0]}
        center
        style={{
          pointerEvents: "none",
          WebkitFontSmoothing: "antialiased",
          textRendering: "geometricPrecision",
        }}
      >
        <div className="flex flex-col items-center gap-1">
          {isCandidate && (
            <span className="rounded border border-verdant-400/50 bg-ink-950/92 px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-widest text-verdant-300 shadow-lg">
              minimum
            </span>
          )}
          <div
            data-min-array-stage="value"
            className="stage-value-card"
            style={{ borderColor: isCandidate ? p.verdant : isCurrent ? p.arcBright : "rgba(255,255,255,0.18)" }}
          >
            {column.value}
          </div>
        </div>
      </Html>

      <Text
        position={[0, -0.25, 0.43]}
        fontSize={0.17}
        color={isCandidate ? p.verdant : p.textDim}
        anchorX="center"
        anchorY="middle"
      >
        {`i=${column.index}`}
      </Text>
    </group>
  );
}

function ScannerGantry({
  model,
  columns,
  stageWidth,
  p,
  reduced,
}: {
  model: MinArraySceneModel;
  columns: ColumnLayout[];
  stageWidth: number;
  p: Theme3DPalette;
  reduced: boolean;
}) {
  const carriage = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const scanIndex = model.operation === "complete" ? model.candidateIndex : model.currentIndex;
  const targetColumn = columns[scanIndex] ?? columns[0];

  useLayoutEffect(() => {
    if (carriage.current) carriage.current.position.x = targetColumn.x;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!carriage.current || !beam.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00055, delta);
    carriage.current.position.x = THREE.MathUtils.lerp(
      carriage.current.position.x,
      targetColumn.x,
      amount,
    );

    const scannerBottom = 2.62;
    const targetTop = targetColumn.height + 0.12;
    const targetLength = Math.max(0.18, scannerBottom - targetTop);
    beam.current.scale.y = THREE.MathUtils.lerp(beam.current.scale.y, targetLength, amount);
    beam.current.position.y = THREE.MathUtils.lerp(
      beam.current.position.y,
      scannerBottom - targetLength / 2,
      amount,
    );
    if (!reduced) {
      carriage.current.position.z = Math.sin(clock.elapsedTime * 2.4) * 0.012;
    }
  });

  return (
    <group>
      <mesh position={[0, 3.13, -0.02]} castShadow>
        <boxGeometry args={[stageWidth, 0.12, 0.16]} />
        <meshStandardMaterial color={p.gridSection} metalness={0.72} roughness={0.25} />
        <Edges color={p.arcDeep} threshold={18} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * stageWidth / 2, 1.52, -0.02]} castShadow>
          <boxGeometry args={[0.12, 3.22, 0.16]} />
          <meshStandardMaterial color={p.gridSection} metalness={0.72} roughness={0.25} />
          <Edges color={p.arcDeep} threshold={18} />
        </mesh>
      ))}

      <group ref={carriage} position={[targetColumn.x, 0, 0]}>
        <mesh position={[0, 2.9, 0]} castShadow>
          <boxGeometry args={[0.52, 0.36, 0.42]} />
          <meshStandardMaterial
            color={p.arcDeep}
            emissive={p.arcBright}
            emissiveIntensity={0.55}
            metalness={0.58}
            roughness={0.24}
          />
          <Edges color={p.arcBright} threshold={18} />
        </mesh>
        <mesh ref={beam} position={[0, 1.8, 0]} scale={[1, 1, 1]}>
          <cylinderGeometry args={[0.022, 0.06, 1, 20]} />
          <meshBasicMaterial color={p.arcBright} transparent opacity={0.72} />
        </mesh>
        <mesh position={[0, 2.58, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.2, 0.035, 12, 36]} />
          <meshStandardMaterial color={p.arcBright} emissive={p.arcBright} emissiveIntensity={1.1} />
        </mesh>
      </group>
    </group>
  );
}

function CandidateMarker({
  model,
  columns,
  p,
  reduced,
}: {
  model: MinArraySceneModel;
  columns: ColumnLayout[];
  p: Theme3DPalette;
  reduced: boolean;
}) {
  const marker = useRef<THREE.Group>(null);
  const target = columns[model.candidateIndex] ?? columns[0];

  useLayoutEffect(() => {
    if (marker.current) marker.current.position.x = target.x;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!marker.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00045, delta);
    marker.current.position.x = THREE.MathUtils.lerp(marker.current.position.x, target.x, amount);
    const pulse = reduced ? 1 : 1 + Math.sin(clock.elapsedTime * 3.2) * 0.035;
    marker.current.scale.setScalar(pulse);
  });

  return (
    <group ref={marker} position={[target.x, 0.02, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[target.width * 0.76, 0.055, 14, 48]} />
        <meshStandardMaterial color={p.verdant} emissive={p.verdant} emissiveIntensity={1.05} />
      </mesh>
      <pointLight position={[0, 0.28, 0.35]} color={p.verdant} intensity={18} distance={2.8} />
    </group>
  );
}

function CandidateHistory({
  history,
  columns,
  p,
}: {
  history: number[];
  columns: ColumnLayout[];
  p: Theme3DPalette;
}) {
  if (history.length < 2) return null;

  return (
    <group>
      {history.slice(1).map((index, historyIndex) => {
        const from = columns[history[historyIndex]];
        const to = columns[index];
        if (!from || !to) return null;
        const points = Array.from({ length: 20 }, (_, pointIndex) => {
          const t = pointIndex / 19;
          return new THREE.Vector3(
            THREE.MathUtils.lerp(from.x, to.x, t),
            0.16 + Math.sin(Math.PI * t) * 0.28,
            0.62,
          );
        });
        return <Line key={`${from.index}-${to.index}`} points={points} color={p.verdant} lineWidth={1.6} transparent opacity={0.45} />;
      })}
    </group>
  );
}

function ComparisonBridge({
  model,
  columns,
  p,
}: {
  model: MinArraySceneModel;
  columns: ColumnLayout[];
  p: Theme3DPalette;
}) {
  const fromIndex =
    model.operation === "update" && model.previousCandidateIndex !== null
      ? model.previousCandidateIndex
      : model.candidateIndex;
  const shouldShow = model.operation === "compare" || model.operation === "update";
  const from = columns[fromIndex];
  const to = columns[model.currentIndex];
  if (!shouldShow || !from || !to || from.index === to.index) return null;

  const color = model.comparisonResult === false ? p.arcBright : p.verdant;
  const high = Math.max(from.height, to.height) + 0.48;
  const points = Array.from({ length: 24 }, (_, pointIndex) => {
    const t = pointIndex / 23;
    return new THREE.Vector3(
      THREE.MathUtils.lerp(from.x, to.x, t),
      high + Math.sin(Math.PI * t) * 0.38,
      0.12,
    );
  });

  return <Line points={points} color={color} lineWidth={2.4} />;
}

function Scene({
  model,
  p,
  reduced,
}: {
  model: MinArraySceneModel;
  p: Theme3DPalette;
  reduced: boolean;
}) {
  const columns = useMemo(() => makeColumnLayout(model.values), [model.values]);
  const gap = gapForCount(model.values.length);
  const stageWidth = Math.max(5.8, (model.values.length - 1) * gap + 2.05);

  return (
    <>
      <CameraRig stageWidth={stageWidth} reduced={reduced} />
      <fog attach="fog" args={[p.background, 10, 24]} />
      <ambientLight intensity={0.68 * p.lighting.ambient} />
      <directionalLight
        castShadow
        position={[4.5, 7.5, 5]}
        intensity={1.45 * p.lighting.directional}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[0, 4.2, 3.5]} intensity={42 * p.lighting.accent} distance={12} color={p.arcBright} />
      <pointLight position={[-3.5, 2, 2.5]} intensity={20 * p.lighting.accent} distance={9} color={p.verdant} />

      <group position={[0, -1.55, 0]}>
        <mesh position={[0, -0.12, 0]} receiveShadow>
          <boxGeometry args={[stageWidth + 0.3, 0.16, 1.72]} />
          <meshStandardMaterial color={p.emptyCell} metalness={0.35} roughness={0.5} />
          <Edges color={p.gridSection} threshold={18} />
        </mesh>

        {columns.map((column) => (
          <mesh key={`rail-${column.index}`} position={[column.x, -0.015, 0]}>
            <boxGeometry args={[column.width + 0.16, 0.08, column.width + 0.18]} />
            <meshStandardMaterial
              color={column.index <= model.checkedThrough ? p.arcDeep : p.barRange}
              emissive={column.index <= model.checkedThrough ? p.arcDeep : p.barRange}
              emissiveIntensity={column.index <= model.checkedThrough ? 0.18 : 0.04}
            />
          </mesh>
        ))}

        <CandidateHistory history={model.candidateHistory} columns={columns} p={p} />
        <ComparisonBridge model={model} columns={columns} p={p} />
        {columns.map((column) => (
          <AnimatedColumn
            key={column.index}
            column={column}
            model={model}
            p={p}
            reduced={reduced}
          />
        ))}
        <CandidateMarker model={model} columns={columns} p={p} reduced={reduced} />
        <ScannerGantry
          model={model}
          columns={columns}
          stageWidth={stageWidth}
          p={p}
          reduced={reduced}
        />
      </group>

      <InfiniteGrid
        position={[0, -1.83, -0.12]}
        cellSize={0.48}
        cellThickness={0.52}
        cellColor={p.gridCell}
        sectionSize={2.4}
        sectionThickness={0.9}
        sectionColor={p.gridSection}
        fadeDistance={22}
        fadeStrength={1}
        infiniteGrid
      />

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={5.8}
        maxDistance={15}
        minPolarAngle={0.4}
        maxPolarAngle={Math.PI / 2.08}
      />
    </>
  );
}

function Overlay({ model }: { model: MinArraySceneModel }) {
  const candidate = model.values[model.candidateIndex];
  const current = model.values[model.currentIndex];
  const resultLabel =
    model.comparisonResult === null ? null : model.comparisonResult ? "TRUE" : "FALSE";

  return (
    <>
      <div className="pointer-events-none absolute left-2 top-2 z-10 max-w-[13rem] rounded-md border border-arc-400/30 bg-ink-950/82 px-2.5 py-1.5 shadow-xl backdrop-blur-md sm:left-3 sm:top-3 sm:max-w-[18rem]">
        <div className="flex items-center gap-1.5">
          <span className="rounded border border-arc-400/40 bg-arc-500/10 px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-widest text-arc-200">
            min scan / {model.operation}
          </span>
          <span className="font-mono text-[8px] font-semibold uppercase tracking-wider text-ink-500">
            O(n)
          </span>
        </div>
        <p data-testid="min-array-headline" className="mt-1 text-xs font-black leading-tight text-ink-50 sm:text-[13px]">
          {model.headline}
        </p>
      </div>

      <div className="stage-hud-secondary min-array-equation pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 items-center gap-2 rounded-md border border-ink-700/70 bg-ink-950/86 px-3 py-2 shadow-xl backdrop-blur-md">
        {model.equation ? (
          <>
            <span className="font-mono text-sm font-black tabular-nums text-ink-50">
              {model.equation}
            </span>
            <span className={model.comparisonResult ? "font-mono text-[10px] font-black text-verdant-300" : "font-mono text-[10px] font-black text-arc-300"}>
              {resultLabel}
            </span>
          </>
        ) : (
          <>
            <span className="font-mono text-[9px] font-black uppercase tracking-widest text-ink-500">current min</span>
            <span className="font-mono text-sm font-black tabular-nums text-verdant-300">{candidate}</span>
          </>
        )}
      </div>

      <div className="stage-hud-secondary pointer-events-none absolute right-11 top-3 z-10 justify-end gap-1">
        {[
          ["scanner", model.operation === "complete" ? "parked" : `i=${model.currentIndex}`],
          ["read", current],
          ["minimum", `${candidate} @ ${model.candidateIndex}`],
          ["checks", model.comparisons],
        ].map(([label, value]) => (
          <div key={label} className="min-w-12 rounded border border-ink-700/65 bg-ink-950/82 px-1.5 py-1 text-center shadow-lg backdrop-blur-md">
            <span className="block font-mono text-[7px] font-black uppercase tracking-widest text-ink-500">{label}</span>
            <span className="block max-w-[5.25rem] truncate font-mono text-[10px] font-black leading-tight text-ink-50">{value}</span>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 z-10 flex items-end justify-between gap-2 sm:left-4 sm:right-4">
        <p className="max-w-[28rem] rounded-md border border-arc-400/25 bg-ink-950/82 px-2.5 py-1.5 text-[11px] leading-snug text-ink-200 shadow-xl backdrop-blur-md">
          {model.detail}
        </p>
        <div className="stage-hud-legend ml-auto flex-wrap justify-end gap-1">
          <span className="rounded border border-arc-400/35 bg-ink-950/82 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-arc-200 backdrop-blur">cyan scanner</span>
          <span className="rounded border border-verdant-400/35 bg-ink-950/82 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-verdant-200 backdrop-blur">green minimum</span>
        </div>
      </div>
    </>
  );
}

export function MinArrayStage3D({ step, steps }: { step: TraceStep; steps?: TraceStep[] }) {
  const model = getMinArraySceneModel(step);
  const p = useTheme3D();
  const reduced = Boolean(useReducedMotion());
  const hud = useStageHud();

  if (!model) return null;

  return (
    <div className="codeanvil-canvas-fill codeanvil-stage-frame relative h-full w-full overflow-hidden rounded-md">
      <Canvas
        shadows
        dpr={[1.25, 2]}
        data-testid="min-array-stage-canvas"
        camera={{ position: [0, 3.5, 8.7], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <CanvasSizeSync />
        <Scene model={model} p={p} reduced={reduced} />
      </Canvas>
      <HudToggle open={hud.hudOpen} onToggle={hud.toggleHud} />
      {hud.hudOpen && <Overlay model={model} />}
      <div className="min-array-line-badge">
        <CodeLineBadge step={step} />
      </div>
      <StageProgressBar step={step} steps={steps} />
    </div>
  );
}
