import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import { getMergeSortSceneModel, type MergeSortSceneModel } from "../../engine/sortStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";
import { HudToggle, useStageHud } from "./StageHud";
import { StageProgressBar } from "./StageProgressBar";

const SLOT_GAP = 1.04;
const TILE_WIDTH = 0.72;
const TILE_DEPTH = 0.58;
const MAX_HEIGHT = 1.68;

interface MergeTileModel {
  id: string;
  label: string;
  value: number;
  x: number;
  y: number;
  z: number;
  height: number;
  color: string;
  edge: string;
  role: "array" | "left" | "right" | "output";
  active: boolean;
  dimmed: boolean;
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

function xForIndex(index: number, count: number): number {
  return (index - (count - 1) / 2) * SLOT_GAP;
}

function xForRangeIndex(index: number, count: number): number {
  return xForIndex(index, count);
}

function heightFor(value: number, maxValue: number): number {
  return Math.max(0.24, (value / Math.max(maxValue, 1)) * MAX_HEIGHT);
}

function sameIndex(index: number | null, candidate: number): boolean {
  return index !== null && index === candidate;
}

function rangeIncludes(range: [number, number] | null, index: number): boolean {
  return !!range && index >= range[0] && index <= range[1];
}

function roleColor(index: number, model: MergeSortSceneModel, p: Theme3DPalette): string {
  if (model.operation === "complete") return p.verdant;
  if (sameIndex(model.writingIndex, index)) return p.emberBright;
  if (model.comparePair?.includes(index)) return p.arcBright;
  if (rangeIncludes(model.leftRange, index)) return p.arcDeep;
  if (rangeIncludes(model.rightRange, index)) return p.ember;
  if (rangeIncludes(model.range, index)) return p.barRange;
  return p.barDefault;
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

  useFrame(({ clock }, delta) => {
    if (!group.current || !mesh.current || !material.current) return;
    const t = reducedMotion ? 1 : 1 - Math.pow(0.0006, delta);
    const pulse = reducedMotion || !tile.active ? 0 : (Math.sin(clock.elapsedTime * 5.4) + 1) / 2;
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, tile.x, t);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, tile.y + pulse * 0.06, t);
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, tile.z, t);
    mesh.current.scale.y = THREE.MathUtils.lerp(mesh.current.scale.y, tile.height, t);
    mesh.current.position.y = mesh.current.scale.y / 2;
    material.current.emissiveIntensity = THREE.MathUtils.lerp(
      material.current.emissiveIntensity,
      tile.dimmed ? 0.05 : tile.active ? 0.84 + pulse * 0.3 : 0.2,
      t,
    );
    material.current.opacity = THREE.MathUtils.lerp(material.current.opacity, tile.dimmed ? 0.32 : 0.88, t);
  });

  return (
    <group ref={group} position={[tile.x, tile.y, tile.z]}>
      <mesh ref={mesh} scale={[1, tile.height, 1]} position={[0, tile.height / 2, 0]}>
        <boxGeometry args={[TILE_WIDTH, 1, TILE_DEPTH]} />
        <meshStandardMaterial
          ref={material}
          color={tile.color}
          emissive={tile.color}
          emissiveIntensity={tile.dimmed ? 0.05 : tile.active ? 0.84 : 0.2}
          metalness={0.42}
          roughness={0.34}
          transparent
          opacity={tile.dimmed ? 0.32 : tile.role === "array" ? 0.94 : 0.88}
        />
        <Edges color={tile.dimmed ? "#3a3f4b" : tile.edge} threshold={16} />
      </mesh>
      <Html position={[0, tile.height + 0.28, 0]} center style={{ pointerEvents: "none" }}>
        <div
          className="min-w-8 rounded-md border bg-ink-950/94 px-2 py-1 text-center font-mono text-xs font-black leading-none shadow-xl backdrop-blur"
          style={{
            borderColor: tile.dimmed ? "rgba(255,255,255,0.14)" : tile.edge,
            color: tile.dimmed ? "rgba(255,255,255,0.35)" : undefined,
            textShadow: "0 1px 2px rgb(0 0 0 / 0.8)",
          }}
        >
          {tile.value}
        </div>
      </Html>
      {tile.label && (
        <Html position={[0, -0.26, 0]} center style={{ pointerEvents: "none" }}>
          <div className="rounded border bg-ink-950/90 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase leading-none" style={{ borderColor: tile.edge, color: tile.edge }}>
            {tile.label}
          </div>
        </Html>
      )}
    </group>
  );
}

function RangeSlab({ model, p }: { model: MergeSortSceneModel; p: Theme3DPalette }) {
  const [start, end] = model.range;
  const center = (xForIndex(start, model.values.length) + xForIndex(end, model.values.length)) / 2;
  const width = Math.max(TILE_WIDTH + 0.3, Math.abs(xForIndex(end, model.values.length) - xForIndex(start, model.values.length)) + TILE_WIDTH + 0.44);
  const midX = model.mid !== null ? (xForIndex(model.mid, model.values.length) + xForIndex(model.mid + 1, model.values.length)) / 2 : null;

  return (
    <group>
      <mesh position={[center, -0.08, 0]}>
        <boxGeometry args={[width, 0.08, 1.08]} />
        <meshStandardMaterial color={p.arcDeep} emissive={p.arc} emissiveIntensity={0.16} transparent opacity={0.36} />
      </mesh>
      {midX !== null && (
        <mesh position={[midX, 0.18, 0]}>
          <boxGeometry args={[0.04, 0.52, 1.18]} />
          <meshStandardMaterial color={p.emberBright} emissive={p.emberBright} emissiveIntensity={0.62} transparent opacity={0.78} />
        </mesh>
      )}
      <Html position={[center, 0.18, -0.76]} center style={{ pointerEvents: "none" }}>
        <div className="rounded-md border border-arc-400/45 bg-ink-950/92 px-2 py-1 font-mono text-[10px] font-black uppercase leading-none text-arc-100 shadow-lg">
          active [{start}..{end}]
        </div>
      </Html>
    </group>
  );
}

function RunTray({
  range,
  color,
  z,
  p,
  count: totalCount,
}: {
  range: [number, number] | null;
  color: string;
  z: number;
  p: Theme3DPalette;
  count: number;
}) {
  if (!range) return null;
  const center = (xForIndex(range[0], totalCount) + xForIndex(range[1], totalCount)) / 2;
  const count = Math.max(1, range[1] - range[0] + 1);
  return (
    <group position={[center, 0.58, z]}>
      <mesh>
        <boxGeometry args={[Math.max(1, count * 0.74), 0.08, 0.64]} />
        <meshStandardMaterial color={p.emptyCell} emissive={color} emissiveIntensity={0.18} transparent opacity={0.66} />
      </mesh>
    </group>
  );
}

function MergeLines({ model, p }: { model: MergeSortSceneModel; p: Theme3DPalette }) {
  const destination = model.destinationIndex;
  if (destination === null) return null;
  const dest = new THREE.Vector3(xForIndex(destination, model.values.length), 1.92, 0);
  const lines = [];

  if (model.leftRange) {
    const x = model.comparePair ? xForIndex(model.comparePair[0], model.values.length) : xForIndex(model.leftRange[0], model.values.length);
    lines.push(<Line key="left" points={[new THREE.Vector3(x, 2.16, -1.34), dest]} color={model.takeSide === "left" ? p.verdant : p.arcBright} lineWidth={model.takeSide === "left" ? 3 : 1.6} />);
  }

  if (model.rightRange) {
    const x = model.comparePair ? xForIndex(model.comparePair[1], model.values.length) : xForIndex(model.rightRange[0], model.values.length);
    lines.push(<Line key="right" points={[new THREE.Vector3(x, 2.16, 1.34), dest]} color={model.takeSide === "right" ? p.verdant : p.emberBright} lineWidth={model.takeSide === "right" ? 3 : 1.6} />);
  }

  return <>{lines}</>;
}

function Scene({ model, p, reducedMotion }: { model: MergeSortSceneModel; p: Theme3DPalette; reducedMotion: boolean }) {
  const scene = useRef<THREE.Group>(null);
  const maxValue = Math.max(...model.values, 1);
  const isComplete = model.operation === "complete";

  useFrame(({ clock }) => {
    if (!scene.current || reducedMotion) return;
    scene.current.rotation.y = Math.sin(clock.elapsedTime * 0.22) * 0.014;
  });

  // How many values of each run have already been merged away. `sourceIndex`
  // points at the tile being taken this step, so everything before it is done.
  const consumedLeft =
    model.takeSide === "left" && model.sourceIndex !== null && model.leftRange
      ? Math.max(0, model.sourceIndex - model.leftRange[0])
      : null;
  const consumedRight =
    model.takeSide === "right" && model.sourceIndex !== null && model.rightRange
      ? Math.max(0, model.sourceIndex - model.rightRange[0])
      : null;

  const tiles = useMemo<MergeTileModel[]>(() => {
    const base = model.values.map((value, index) => {
      const active = sameIndex(model.writingIndex, index) || !!model.comparePair?.includes(index) || (isComplete && rangeIncludes(model.range, index));
      const color = roleColor(index, model, p);
      return {
        id: `array-${index}`,
        label: `i=${index}`,
        value,
        x: xForIndex(index, model.values.length),
        y: 0,
        z: 0,
        height: heightFor(value, maxValue),
        color,
        edge: active ? "#f8fbff" : color,
        role: "array" as const,
        active,
        dimmed: false,
      };
    });

    const left = model.leftValues.map((value, offset) => {
      const index = (model.leftRange?.[0] ?? model.range[0]) + offset;
      const active = model.takeSide === "left" && model.sourceIndex === index;
      const dimmed = consumedLeft !== null && offset < consumedLeft;
      return {
        id: `left-${offset}-${value}`,
        label: active ? "take" : "",
        value,
        x: xForRangeIndex(index, model.values.length),
        y: 2.02,
        z: -1.28,
        height: Math.max(0.2, heightFor(value, maxValue) * 0.62),
        color: active ? p.verdant : p.arcDeep,
        edge: active ? p.verdant : p.arcBright,
        role: "left" as const,
        active,
        dimmed,
      };
    });

    const right = model.rightValues.map((value, offset) => {
      const index = (model.rightRange?.[0] ?? model.range[0]) + offset;
      const active = model.takeSide === "right" && model.sourceIndex === index;
      const dimmed = consumedRight !== null && offset < consumedRight;
      return {
        id: `right-${offset}-${value}`,
        label: active ? "take" : "",
        value,
        x: xForRangeIndex(index, model.values.length),
        y: 2.02,
        z: 1.28,
        height: Math.max(0.2, heightFor(value, maxValue) * 0.62),
        color: active ? p.verdant : p.ember,
        edge: active ? p.verdant : p.emberBright,
        role: "right" as const,
        active,
        dimmed,
      };
    });

    return [...base, ...left, ...right];
  }, [consumedLeft, consumedRight, isComplete, maxValue, model, p]);

  const stageWidth = Math.max(6.2, (model.values.length - 1) * SLOT_GAP + 2);

  return (
    <>
      <ambientLight intensity={0.74 * p.lighting.ambient} />
      <directionalLight position={[4.8, 7.4, 5]} intensity={1.48 * p.lighting.directional} />
      <pointLight position={[-2.5, 4.2, 2.4]} intensity={42 * p.lighting.accent} distance={12} color={p.arcBright} />
      <pointLight position={[3, 3.4, -2.4]} intensity={34 * p.lighting.accent} distance={11} color={p.emberBright} />

      <group ref={scene} position={[0, -1.6, 0]}>
        <mesh position={[0, -0.13, 0]}>
          <boxGeometry args={[stageWidth, 0.1, 3.78]} />
          <meshStandardMaterial color={p.emptyCell} emissive={p.arcDeep} emissiveIntensity={0.08} transparent opacity={0.66} metalness={0.18} roughness={0.5} />
        </mesh>
        <RangeSlab model={model} p={p} />
        <RunTray range={model.leftRange} color={p.arcBright} z={-1.28} p={p} count={model.values.length} />
        <RunTray range={model.rightRange} color={p.emberBright} z={1.28} p={p} count={model.values.length} />
        <MergeLines model={model} p={p} />
        {(model.operation === "write" || model.operation === "copy") && model.destinationIndex !== null && (
          <Html
            position={[xForIndex(model.destinationIndex, model.values.length), 2.36, 0.55]}
            center
            style={{ pointerEvents: "none" }}
          >
            <div className="rounded-md border border-verdant-400/55 bg-ink-950/94 px-2 py-1 font-mono text-[10px] font-black uppercase leading-none text-verdant-100 shadow-xl">
              output slot {model.destinationIndex}
            </div>
          </Html>
        )}
        {tiles.map((tile) => (
          <MergeTile key={tile.id} tile={tile} reducedMotion={reducedMotion} />
        ))}
      </group>

      <InfiniteGrid
        position={[0, -1.82, 0]}
        cellSize={0.5}
        cellThickness={0.55}
        cellColor={p.gridCell}
        sectionSize={2.5}
        sectionThickness={0.9}
        sectionColor={p.gridSection}
        fadeDistance={23}
        fadeStrength={1}
        infiniteGrid
      />

      <OrbitControls
        enablePan={false}
        enableDamping={!reducedMotion}
        dampingFactor={0.08}
        minDistance={5.3}
        maxDistance={13}
        minPolarAngle={0.38}
        maxPolarAngle={Math.PI / 2.08}
      />
    </>
  );
}

function rangeText(range: [number, number] | null): string {
  return range ? `[${range[0]}..${range[1]}]` : "-";
}

function Overlay({ model }: { model: MergeSortSceneModel }) {
  const destination = model.destinationIndex !== null ? `a[${model.destinationIndex}]` : "-";
  const stats = [
    ["left", rangeText(model.leftRange)],
    ["right", rangeText(model.rightRange)],
    ["out", destination],
    ["cmp/write", `${model.comparisons ?? 0}/${model.writes ?? 0}`],
  ];

  return (
    <>
      <div className="pointer-events-none absolute left-2 right-11 top-2 z-10 flex items-start justify-between gap-2 sm:left-3 sm:right-12 sm:top-3">
        <div className="min-w-0 max-w-[13rem] rounded-md border border-arc-400/30 bg-ink-950/72 px-2.5 py-1.5 shadow-lg backdrop-blur-sm sm:max-w-[18rem]">
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

        <div className="flex max-w-[16rem] flex-wrap justify-end gap-1 sm:max-w-[21rem]">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded border border-ink-700/65 bg-ink-950/72 px-1.5 py-1 text-center shadow-lg backdrop-blur-sm">
              <span className="block font-mono text-[8px] font-black uppercase tracking-widest text-ink-500">{label}</span>
              <span className="block max-w-[4.75rem] truncate font-mono text-[11px] font-black leading-tight text-ink-50">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex items-end justify-between gap-2 sm:inset-x-3 sm:bottom-3">
        <p className="max-w-[24rem] rounded-md border border-arc-400/25 bg-ink-950/68 px-2 py-1.5 text-[10px] leading-snug text-ink-300 shadow-lg backdrop-blur-sm">
          {model.detail}
        </p>
        <div className="ml-auto flex flex-wrap justify-end gap-1">
          <span className="rounded border border-arc-400/35 bg-ink-950/72 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-arc-200 backdrop-blur">blue left</span>
          <span className="rounded border border-ember-400/35 bg-ink-950/72 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-ember-200 backdrop-blur">violet right</span>
          <span className="rounded border border-verdant-400/35 bg-ink-950/72 px-1.5 py-1 font-mono text-[9px] font-bold uppercase text-verdant-200 backdrop-blur">green write</span>
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
        dpr={[1.25, 2]}
        camera={{ position: [0, 4.45, 7.8], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <CanvasSizeSync />
        <Scene model={model} p={p} reducedMotion={reducedMotion} />
      </Canvas>
      <HudToggle open={hud.hudOpen} onToggle={hud.toggleHud} />
      {hud.hudOpen && <Overlay model={model} />}
      <StageProgressBar step={step} steps={steps} />
    </div>
  );
}
