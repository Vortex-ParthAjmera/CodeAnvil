import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import { getMergeSortSceneModel, type MergeSortSceneModel } from "../../engine/sortStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";
import { HudToggle, useStageHud } from "./StageHud";
import { StageProgressBar } from "./StageProgressBar";
import { CodeLineBadge } from "./CodeLineBadge";

const SLOT_GAP = 0.9;
const TILE_WIDTH = 0.7;
const TILE_DEPTH = 0.56;
const MAX_HEIGHT = 0.92;
const LEFT_LANE_Z = -1.24;
const RIGHT_LANE_Z = 1.24;
const OUTPUT_LANE_Z = 0;
const SOURCE_Y = 0.72;
const OUTPUT_Y = 0.02;

interface MergeTileModel {
  id: string;
  label: string;
  value: number | null;
  x: number;
  y: number;
  z: number;
  height: number;
  color: string;
  edge: string;
  active: boolean;
  dimmed: boolean;
  pending: boolean;
}

interface Point3 {
  x: number;
  y: number;
  z: number;
}

function useReducedMotionPreference(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

function rangeCount(model: MergeSortSceneModel): number {
  return model.range[1] - model.range[0] + 1;
}

function xForIndex(index: number, count: number): number {
  return (index - (count - 1) / 2) * SLOT_GAP;
}

function xForArrayIndex(index: number, model: MergeSortSceneModel): number {
  return xForIndex(index - model.range[0], rangeCount(model));
}

function heightFor(value: number | null, maxValue: number): number {
  if (value === null) return 0.22;
  return Math.max(0.26, 0.2 + (value / Math.max(maxValue, 1)) * MAX_HEIGHT);
}

function sameIndex(index: number | null, candidate: number): boolean {
  return index !== null && index === candidate;
}

function rangeIncludes(range: [number, number] | null, index: number): boolean {
  return !!range && index >= range[0] && index <= range[1];
}

function isCommitted(model: MergeSortSceneModel, index: number): boolean {
  return model.operation === "complete" || (model.committedUntil !== null && index <= model.committedUntil);
}

function sourcePosition(index: number, model: MergeSortSceneModel, value: number | null): Point3 {
  const z = rangeIncludes(model.leftRange, index) ? LEFT_LANE_Z : RIGHT_LANE_Z;
  return {
    x: xForArrayIndex(index, model),
    y: SOURCE_Y + heightFor(value, Math.max(...model.values, 1)) + 0.16,
    z,
  };
}

function outputPosition(index: number, model: MergeSortSceneModel, value: number | null): Point3 {
  return {
    x: xForArrayIndex(index, model),
    y: OUTPUT_Y + heightFor(value, Math.max(...model.values, 1)) + 0.18,
    z: OUTPUT_LANE_Z,
  };
}

function roleColor(index: number, model: MergeSortSceneModel, p: Theme3DPalette): string {
  if (model.operation === "complete") return p.verdant;
  if (sameIndex(model.writingIndex, index)) return p.verdant;
  if (sameIndex(model.destinationIndex, index)) return p.verdantDeep;
  if (model.comparePair?.includes(index)) return p.arcBright;
  if (rangeIncludes(model.leftRange, index)) return p.arcDeep;
  if (rangeIncludes(model.rightRange, index)) return p.ember;
  if (rangeIncludes(model.range, index)) return p.barRange;
  return p.barDefault;
}

function textCardStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    pointerEvents: "none",
    WebkitFontSmoothing: "antialiased",
    textRendering: "geometricPrecision",
    ...extra,
  };
}

function MergeTile({
  tile,
  reducedMotion,
}: {
  tile: MergeTileModel;
  reducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    if (!group.current || !mesh.current || mounted.current) return;
    group.current.position.set(tile.x, tile.y, tile.z);
    mesh.current.scale.y = tile.height;
    mesh.current.position.y = tile.height / 2;
    mounted.current = true;
  }, [tile.height, tile.x, tile.y, tile.z]);

  useFrame(({ clock }, delta) => {
    if (!group.current || !mesh.current || !material.current) return;
    const t = reducedMotion ? 1 : 1 - Math.pow(0.0008, delta);
    const pulse = reducedMotion || !tile.active ? 0 : (Math.sin(clock.elapsedTime * 4.4) + 1) / 2;
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, tile.x, t);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, tile.y + pulse * 0.035, t);
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, tile.z, t);
    mesh.current.scale.y = THREE.MathUtils.lerp(mesh.current.scale.y, tile.height, t);
    mesh.current.position.y = mesh.current.scale.y / 2;
    material.current.emissiveIntensity = THREE.MathUtils.lerp(
      material.current.emissiveIntensity,
      tile.pending ? 0.03 : tile.dimmed ? 0.06 : tile.active ? 0.72 + pulse * 0.18 : 0.18,
      t,
    );
    material.current.opacity = THREE.MathUtils.lerp(
      material.current.opacity,
      tile.pending ? 0.2 : tile.dimmed ? 0.34 : 0.9,
      t,
    );
  });

  return (
    <group ref={group} position={[tile.x, tile.y, tile.z]}>
      <mesh ref={mesh} scale={[1, tile.height, 1]} position={[0, tile.height / 2, 0]}>
        <boxGeometry args={[TILE_WIDTH, 1, TILE_DEPTH]} />
        <meshStandardMaterial
          ref={material}
          color={tile.pending ? "#111827" : tile.color}
          emissive={tile.pending ? "#111827" : tile.color}
          emissiveIntensity={tile.pending ? 0.03 : tile.active ? 0.72 : 0.18}
          metalness={0.36}
          roughness={0.38}
          transparent
          opacity={tile.pending ? 0.2 : tile.dimmed ? 0.34 : 0.9}
        />
        <Edges color={tile.active ? "#f8fbff" : tile.edge} threshold={16} />
      </mesh>

      {tile.value !== null && (
        <Html position={[0, tile.height + 0.24, 0]} center style={textCardStyle()}>
          <div
            data-merge-stage="tile-value"
            className="min-w-7 rounded-md border bg-ink-950/96 px-1.5 py-0.5 text-center font-mono text-[12px] font-black leading-none text-ink-50 shadow-xl"
            style={{ borderColor: tile.edge }}
          >
            {tile.value}
          </div>
        </Html>
      )}

      {tile.label && (
        <Html position={[0, -0.25, 0]} center style={textCardStyle()}>
          <div
            data-merge-stage="tile-label"
            className="rounded border bg-ink-950/92 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase leading-none"
            style={{
              borderColor: tile.active ? "#f8fbff" : tile.edge,
              color: tile.dimmed ? "rgba(255,255,255,0.42)" : tile.edge,
            }}
          >
            {tile.label}
          </div>
        </Html>
      )}
    </group>
  );
}

function TransferTile({
  model,
  p,
  reducedMotion,
}: {
  model: MergeSortSceneModel;
  p: Theme3DPalette;
  reducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const runKey = model.sourceIndex !== null ? model.sourceIndex : "none";
  const value = model.value;

  const visible =
    (model.operation === "write" || model.operation === "copy") &&
    model.sourceIndex !== null &&
    model.destinationIndex !== null &&
    value !== null;

  const from = visible ? sourcePosition(model.sourceIndex ?? model.range[0], model, value) : null;
  const to = visible ? outputPosition(model.destinationIndex ?? model.range[0], model, value) : null;

  useLayoutEffect(() => {
    if (!group.current || !from || !to) return;
    group.current.position.set(reducedMotion ? to.x : from.x, reducedMotion ? to.y : from.y, reducedMotion ? to.z : from.z);
  }, [from?.x, from?.y, from?.z, reducedMotion, runKey, to?.x, to?.y, to?.z]);

  useFrame(({ clock }, delta) => {
    if (!visible || !group.current || !mesh.current || !material.current || !to) return;
    const t = reducedMotion ? 1 : 1 - Math.pow(0.00045, delta);
    const bob = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 5.2) * 0.025;
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, to.x, t);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, to.y + 0.2 + bob, t);
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, to.z, t);
    material.current.emissiveIntensity = THREE.MathUtils.lerp(material.current.emissiveIntensity, 0.86, t);
  });

  if (!visible || !from || !to || value === null) return null;

  return (
    <group ref={group} position={[from.x, from.y, from.z]}>
      <mesh ref={mesh} scale={[1.04, 0.42, 1.04]}>
        <boxGeometry args={[TILE_WIDTH, 1, TILE_DEPTH]} />
        <meshStandardMaterial
          ref={material}
          color={p.verdant}
          emissive={p.verdant}
          emissiveIntensity={0.86}
          metalness={0.42}
          roughness={0.3}
          transparent
          opacity={0.96}
        />
        <Edges color="#f8fbff" threshold={16} />
      </mesh>
      <Html position={[0, 0.48, 0]} center style={textCardStyle()}>
        <div data-merge-stage="transfer-value" className="rounded-md border border-verdant-300 bg-ink-950/96 px-1.5 py-0.5 font-mono text-[12px] font-black leading-none text-verdant-100 shadow-xl">
          {value}
        </div>
      </Html>
    </group>
  );
}

function RangeSlab({ model, p }: { model: MergeSortSceneModel; p: Theme3DPalette }) {
  const [start, end] = model.range;
  const center = (xForArrayIndex(start, model) + xForArrayIndex(end, model)) / 2;
  const width = Math.max(TILE_WIDTH + 0.42, Math.abs(xForArrayIndex(end, model) - xForArrayIndex(start, model)) + TILE_WIDTH + 0.52);
  const midX = model.mid !== null ? (xForArrayIndex(model.mid, model) + xForArrayIndex(model.mid + 1, model)) / 2 : null;

  return (
    <group>
      <mesh position={[center, -0.08, OUTPUT_LANE_Z]}>
        <boxGeometry args={[width, 0.08, 1.04]} />
        <meshStandardMaterial color={p.verdantDeep} emissive={p.verdant} emissiveIntensity={0.1} transparent opacity={0.34} />
      </mesh>
      {midX !== null && (
        <mesh position={[midX, 0.2, OUTPUT_LANE_Z]}>
          <boxGeometry args={[0.035, 0.58, 1.2]} />
          <meshStandardMaterial color={p.emberBright} emissive={p.emberBright} emissiveIntensity={0.52} transparent opacity={0.76} />
        </mesh>
      )}
    </group>
  );
}

function RunTray({
  range,
  color,
  z,
  p,
  model,
}: {
  range: [number, number] | null;
  color: string;
  z: number;
  p: Theme3DPalette;
  model: MergeSortSceneModel;
}) {
  if (!range) return null;
  const center = (xForArrayIndex(range[0], model) + xForArrayIndex(range[1], model)) / 2;
  const count = Math.max(1, range[1] - range[0] + 1);
  return (
    <group position={[center, SOURCE_Y - 0.04, z]}>
      <mesh>
        <boxGeometry args={[Math.max(1, count * 0.78), 0.08, 0.76]} />
        <meshStandardMaterial color={p.emptyCell} emissive={color} emissiveIntensity={0.12} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function MergeLines({ model, p }: { model: MergeSortSceneModel; p: Theme3DPalette }) {
  const destination = model.destinationIndex;
  if (destination === null || (model.operation !== "compare" && model.operation !== "write" && model.operation !== "copy")) return null;

  const dest = new THREE.Vector3(xForArrayIndex(destination, model), 0.98, OUTPUT_LANE_Z);
  const lines = [];

  if (model.leftRange && model.leftCursor < model.leftValues.length) {
    const source = model.leftRange[0] + model.leftCursor;
    const points = [
      new THREE.Vector3(xForArrayIndex(source, model), 1.28, LEFT_LANE_Z),
      new THREE.Vector3(xForArrayIndex(source, model), 1.55, -0.66),
      dest,
    ];
    lines.push(<Line key="left" points={points} color={model.takeSide === "left" ? p.verdant : p.arcBright} lineWidth={model.takeSide === "left" ? 3 : 1.5} />);
  }

  if (model.rightRange && model.rightCursor < model.rightValues.length) {
    const source = model.rightRange[0] + model.rightCursor;
    const points = [
      new THREE.Vector3(xForArrayIndex(source, model), 1.28, RIGHT_LANE_Z),
      new THREE.Vector3(xForArrayIndex(source, model), 1.55, 0.66),
      dest,
    ];
    lines.push(<Line key="right" points={points} color={model.takeSide === "right" ? p.verdant : p.emberBright} lineWidth={model.takeSide === "right" ? 3 : 1.5} />);
  }

  return <>{lines}</>;
}

function Scene({ model, p, reducedMotion }: { model: MergeSortSceneModel; p: Theme3DPalette; reducedMotion: boolean }) {
  const maxValue = Math.max(...model.values, ...model.leftValues, ...model.rightValues, 1);

  const tiles = useMemo<MergeTileModel[]>(() => {
    const left = model.leftValues.map((value, offset) => {
      const index = (model.leftRange?.[0] ?? model.range[0]) + offset;
      const isCurrent = model.comparePair?.includes(index) || model.sourceIndex === index;
      const active = isCurrent && (model.takeSide === "left" || model.operation === "compare");
      const dimmed = offset < model.leftCursor && !active;
      return {
        id: "left-" + index,
        label: "",
        value,
        x: xForArrayIndex(index, model),
        y: SOURCE_Y,
        z: LEFT_LANE_Z,
        height: heightFor(value, maxValue),
        color: active ? p.verdant : p.arcDeep,
        edge: active ? "#f8fbff" : p.arcBright,
        active,
        dimmed,
        pending: false,
      };
    });

    const right = model.rightValues.map((value, offset) => {
      const index = (model.rightRange?.[0] ?? model.range[0]) + offset;
      const isCurrent = model.comparePair?.includes(index) || model.sourceIndex === index;
      const active = isCurrent && (model.takeSide === "right" || model.operation === "compare");
      const dimmed = offset < model.rightCursor && !active;
      return {
        id: "right-" + index,
        label: "",
        value,
        x: xForArrayIndex(index, model),
        y: SOURCE_Y,
        z: RIGHT_LANE_Z,
        height: heightFor(value, maxValue),
        color: active ? p.verdant : p.ember,
        edge: active ? "#f8fbff" : p.emberBright,
        active,
        dimmed,
        pending: false,
      };
    });

    const output = Array.from({ length: rangeCount(model) }, (_, offset) => {
      const index = model.range[0] + offset;
      const committed = isCommitted(model, index);
      const active = sameIndex(model.destinationIndex, index) || sameIndex(model.writingIndex, index);
      const value = committed ? model.values[index] : null;
      const color = committed ? roleColor(index, model, p) : p.emptyCell;
      return {
        id: "output-" + index,
        label: "",
        value,
        x: xForArrayIndex(index, model),
        y: OUTPUT_Y,
        z: OUTPUT_LANE_Z,
        height: heightFor(value, maxValue),
        color,
        edge: active ? "#f8fbff" : committed ? p.verdant : p.gridSection,
        active,
        dimmed: false,
        pending: !committed,
      };
    });

    return [...left, ...right, ...output];
  }, [maxValue, model, p]);

  const stageWidth = Math.max(5.9, (rangeCount(model) - 1) * SLOT_GAP + 1.9);

  return (
    <>
      <ambientLight intensity={0.78 * p.lighting.ambient} />
      <directionalLight position={[4.6, 7.2, 5.2]} intensity={1.46 * p.lighting.directional} />
      <pointLight position={[-2.8, 4, 2.8]} intensity={38 * p.lighting.accent} distance={11} color={p.arcBright} />
      <pointLight position={[2.8, 3.8, -2.8]} intensity={34 * p.lighting.accent} distance={11} color={p.emberBright} />

      <group position={[0, -1.42, 0]}>
        <mesh position={[0, -0.13, 0]}>
          <boxGeometry args={[stageWidth, 0.1, 3.74]} />
          <meshStandardMaterial color={p.emptyCell} emissive={p.arcDeep} emissiveIntensity={0.06} transparent opacity={0.68} metalness={0.16} roughness={0.52} />
        </mesh>
        <RangeSlab model={model} p={p} />
        <RunTray range={model.leftRange} color={p.arcBright} z={LEFT_LANE_Z} p={p} model={model} />
        <RunTray range={model.rightRange} color={p.emberBright} z={RIGHT_LANE_Z} p={p} model={model} />
        <MergeLines model={model} p={p} />
        {tiles.map((tile) => (
          <MergeTile key={tile.id} tile={tile} reducedMotion={reducedMotion} />
        ))}
        <TransferTile model={model} p={p} reducedMotion={reducedMotion} />
      </group>

      <InfiniteGrid
        position={[0, -1.78, -0.06]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor={p.gridCell}
        sectionSize={2.5}
        sectionThickness={0.82}
        sectionColor={p.gridSection}
        fadeDistance={22}
        fadeStrength={1}
        infiniteGrid
      />

      <OrbitControls
        enablePan={false}
        enableDamping={!reducedMotion}
        dampingFactor={0.08}
        minDistance={5.2}
        maxDistance={12.5}
        minPolarAngle={0.4}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  );
}

function rangeText(range: [number, number] | null): string {
  return range ? "[" + String(range[0]) + ".." + String(range[1]) + "]" : "-";
}

function Overlay({ model }: { model: MergeSortSceneModel }) {
  const destination = model.destinationIndex !== null ? "a[" + String(model.destinationIndex) + "]" : "-";
  const stats = [
    ["left used", String(model.leftCursor) + "/" + String(model.leftValues.length)],
    ["right used", String(model.rightCursor) + "/" + String(model.rightValues.length)],
    ["output", destination],
    ["cmp/write", String(model.comparisons ?? 0) + "/" + String(model.writes ?? 0)],
  ];

  return (
    <>
      <div className="pointer-events-none absolute left-2 right-11 top-2 z-10 flex items-start justify-between gap-2 sm:left-3 sm:right-12 sm:top-3">
        <div className="min-w-0 max-w-[14.5rem] rounded-md border border-arc-400/30 bg-ink-950/78 px-2.5 py-1.5 shadow-lg backdrop-blur-sm sm:max-w-[20rem]">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 rounded border border-verdant-400/35 bg-verdant-500/10 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-widest text-verdant-200">
              merge / {model.operation}
            </span>
            <span className="truncate font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
              {rangeText(model.range)}
            </span>
          </div>
          <p className="mt-1 text-[11px] font-black leading-tight text-ink-50 sm:text-xs">{model.headline}</p>
        </div>

        <div className="hidden max-w-[18rem] flex-wrap justify-end gap-1 min-[520px]:flex sm:max-w-[24rem]">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded border border-ink-700/65 bg-ink-950/76 px-1.5 py-1 text-center shadow-lg backdrop-blur-sm">
              <span className="block font-mono text-[8px] font-black uppercase tracking-widest text-ink-500">{label}</span>
              <span className="block max-w-[5.75rem] truncate font-mono text-[11px] font-black leading-tight text-ink-50">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-16 left-3 right-3 z-10 flex items-end justify-between gap-2 sm:bottom-16 sm:left-4 sm:right-4">
        <p className="max-w-[30rem] rounded-md border border-arc-400/25 bg-ink-950/74 px-2.5 py-1.5 text-[10px] leading-snug text-ink-200 shadow-lg backdrop-blur-sm sm:text-[11px]">
          {model.detail}
        </p>
        <div className="ml-auto hidden flex-wrap justify-end gap-1 min-[760px]:flex">
          <span className="rounded border border-arc-400/35 bg-ink-950/76 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-arc-200 backdrop-blur">left run</span>
          <span className="rounded border border-ember-400/35 bg-ink-950/76 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-ember-200 backdrop-blur">right run</span>
          <span className="rounded border border-verdant-400/35 bg-ink-950/76 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-verdant-200 backdrop-blur">output write</span>
        </div>
      </div>
    </>
  );
}

export function MergeSortStage3D({ step, steps }: { step: TraceStep; steps?: TraceStep[] }) {
  const p = useTheme3D();
  const model = useMemo(() => getMergeSortSceneModel(step), [step]);
  const reducedMotion = useReducedMotionPreference();
  const hud = useStageHud();

  if (!model) return null;

  return (
    <div className="codeanvil-canvas-fill relative h-full w-full overflow-hidden rounded-md">
      <Canvas
        data-testid="merge-sort-stage-canvas"
        dpr={[1.5, 2]}
        camera={{ position: [0, 3.85, 7.35], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <CanvasSizeSync />
        <Scene model={model} p={p} reducedMotion={reducedMotion} />
      </Canvas>
      <HudToggle open={hud.hudOpen} onToggle={hud.toggleHud} />
      {hud.hudOpen && <Overlay model={model} />}
      <CodeLineBadge step={step} />
      <StageProgressBar step={step} steps={steps} />
    </div>
  );
}
