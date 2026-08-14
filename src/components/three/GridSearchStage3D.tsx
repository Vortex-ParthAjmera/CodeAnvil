import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import {
  getGridSearchSceneModel,
  type GridCoord,
  type GridSearchCell,
  type GridSearchSceneModel,
} from "../../engine/gridStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";

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

function cellX(col: number, cols: number): number {
  return (col - (cols - 1) / 2) * 0.92;
}

function cellZ(row: number, rows: number): number {
  return (row - (rows - 1) / 2) * 0.92;
}

function sameCoord(a: GridCoord | null, b: GridCoord): boolean {
  return !!a && a.row === b.row && a.col === b.col;
}

function positionFor(coord: GridCoord, model: GridSearchSceneModel, y = 0.2): [number, number, number] {
  return [cellX(coord.col, model.cols), y, cellZ(coord.row, model.rows)];
}

function colorForCell(cell: GridSearchCell, p: Theme3DPalette, isNext: boolean): string {
  if (cell.isPath) return p.verdant;
  if (cell.isCurrent) return p.emberBright;
  if (isNext) return p.ember;
  if (cell.isFrontier) return p.arcBright;
  if (cell.isVisited) return p.arcDeep;
  if (cell.isStart) return p.verdantDeep;
  if (cell.isGoal) return p.ember;
  if (cell.isWall) return p.gridSection;
  return p.emptyCell;
}

function heightForCell(cell: GridSearchCell, isNext: boolean): number {
  if (cell.isWall) return 0.62;
  if (cell.isCurrent) return 0.38;
  if (cell.isPath) return 0.31;
  if (isNext) return 0.31;
  if (cell.isFrontier) return 0.25;
  if (cell.isVisited) return 0.19;
  return 0.12;
}

function CellBlock({
  cell,
  model,
  p,
  isNext,
  reducedMotion,
}: {
  cell: GridSearchCell;
  model: GridSearchSceneModel;
  p: Theme3DPalette;
  isNext: boolean;
  reducedMotion: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const color = colorForCell(cell, p, isNext);
  const targetHeight = heightForCell(cell, isNext);
  const x = cellX(cell.col, model.cols);
  const z = cellZ(cell.row, model.rows);
  const label = cell.isStart ? "S" : cell.isGoal ? "G" : cell.isCurrent ? "now" : isNext ? "next" : "";

  useFrame(({ clock }, delta) => {
    if (!mesh.current || !material.current) return;
    const t = reducedMotion ? 1 : 1 - Math.pow(0.0005, delta);
    const pulseTarget = cell.isCurrent || isNext ? (Math.sin(clock.elapsedTime * 4.8) + 1) / 2 : 0;
    const pulse = reducedMotion ? 0 : pulseTarget;
    const lift = cell.isCurrent ? pulse * 0.08 : isNext ? pulse * 0.05 : 0;
    mesh.current.scale.y = THREE.MathUtils.lerp(mesh.current.scale.y, targetHeight + lift, t);
    mesh.current.position.y = mesh.current.scale.y / 2;
    material.current.emissiveIntensity = THREE.MathUtils.lerp(
      material.current.emissiveIntensity,
      cell.isCurrent
        ? 0.95 + pulse * 0.55
        : isNext
          ? 0.74 + pulse * 0.36
          : cell.isWall
            ? 0.02
            : cell.isPath
              ? 0.62
              : cell.isFrontier
                ? 0.42
                : cell.isVisited
                  ? 0.22
                  : 0.08,
      t,
    );
  });

  return (
    <group position={[x, 0, z]}>
      <mesh ref={mesh} scale={[1, targetHeight, 1]} position={[0, targetHeight / 2, 0]}>
        <boxGeometry args={[0.78, 1, 0.78]} />
        <meshStandardMaterial
          ref={material}
          color={cell.isWall ? p.gridSection : p.emptyCell}
          emissive={color}
          emissiveIntensity={cell.isCurrent ? 1.05 : isNext ? 0.86 : cell.isPath ? 0.62 : cell.isFrontier ? 0.42 : cell.isVisited ? 0.22 : 0.08}
          metalness={0.38}
          roughness={0.36}
          transparent={!cell.isWall}
          opacity={cell.isWall ? 1 : cell.role === "empty" ? 0.68 : 0.96}
        />
        <Edges color={color} threshold={16} />
      </mesh>

      {label && (
        <Html position={[0, targetHeight + 0.34, 0.02]} center style={{ pointerEvents: "none" }}>
          <div
            className="rounded-md border bg-ink-950/95 px-2 py-1 font-mono text-[10px] font-black uppercase leading-none text-ink-50 shadow-xl backdrop-blur"
            style={{ borderColor: color, textShadow: "0 1px 2px rgb(0 0 0 / 0.8)" }}
          >
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

function PathRibbon({ model, p }: { model: GridSearchSceneModel; p: Theme3DPalette }) {
  if (model.pathCells.length < 2) return null;
  const points = model.pathCells.map((coord) => positionFor(coord, model, 0.56));
  return <Line points={points} color={p.verdant} lineWidth={4} />;
}

function FrontierLinks({ model, p }: { model: GridSearchSceneModel; p: Theme3DPalette }) {
  if (!model.current || model.frontierCells.length === 0) return null;
  const origin = positionFor(model.current, model, 0.58);
  const visible = model.frontierCells.slice(0, 8);

  return (
    <>
      {visible.map((coord) => {
        const isNext = sameCoord(model.nextCell, coord);
        return (
          <Line
            key={`${coord.row}-${coord.col}`}
            points={[origin, positionFor(coord, model, isNext ? 0.62 : 0.5)]}
            color={isNext ? p.emberBright : p.arcBright}
            lineWidth={isNext ? 3 : 1.5}
          />
        );
      })}
    </>
  );
}

function CurrentBeacon({ model, p, reducedMotion }: { model: GridSearchSceneModel; p: Theme3DPalette; reducedMotion: boolean }) {
  const beacon = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!beacon.current || reducedMotion) return;
    const pulse = (Math.sin(clock.elapsedTime * 4.8) + 1) / 2;
    beacon.current.scale.setScalar(1 + pulse * 0.12);
  });

  if (!model.current) return null;
  const [x, y, z] = positionFor(model.current, model);

  return (
    <group ref={beacon} position={[x, y + 0.44, z]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.48, 0.025, 10, 54]} />
        <meshStandardMaterial color={p.emberBright} emissive={p.emberBright} emissiveIntensity={1.05} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.31, 0.012, 8, 42]} />
        <meshStandardMaterial color={p.ember} emissive={p.ember} emissiveIntensity={0.8} transparent opacity={0.82} />
      </mesh>
    </group>
  );
}

function Scene({ model, p, reducedMotion }: { model: GridSearchSceneModel; p: Theme3DPalette; reducedMotion: boolean }) {
  const scene = useRef<THREE.Group>(null);
  const stageWidth = Math.max(5.4, model.cols * 0.95 + 1.4);
  const stageDepth = Math.max(5.4, model.rows * 0.95 + 1.2);

  useFrame(({ clock }) => {
    if (!scene.current || reducedMotion) return;
    scene.current.rotation.y = Math.sin(clock.elapsedTime * 0.24) * 0.016;
  });

  return (
    <>
      <ambientLight intensity={0.76 * p.lighting.ambient} />
      <directionalLight position={[5, 8, 4]} intensity={1.45 * p.lighting.directional} />
      <pointLight position={[-2, 3.8, 2.8]} intensity={42 * p.lighting.accent} distance={12} color={p.arcBright} />
      <pointLight position={[3, 3.2, 2.4]} intensity={34 * p.lighting.accent} distance={11} color={p.emberBright} />

      <group ref={scene} position={[0, -0.74, 0]}>
        <mesh position={[0, -0.03, 0]}>
          <boxGeometry args={[stageWidth, 0.08, stageDepth]} />
          <meshStandardMaterial color={p.emptyCell} emissive={p.arcDeep} emissiveIntensity={0.08} transparent opacity={0.7} metalness={0.18} roughness={0.5} />
        </mesh>
        <PathRibbon model={model} p={p} />
        <FrontierLinks model={model} p={p} />
        {model.cells.map((cell) => (
          <CellBlock
            key={`${cell.row}-${cell.col}`}
            cell={cell}
            model={model}
            p={p}
            isNext={sameCoord(model.nextCell, cell)}
            reducedMotion={reducedMotion}
          />
        ))}
        <CurrentBeacon model={model} p={p} reducedMotion={reducedMotion} />
      </group>

      <InfiniteGrid
        position={[0, -1.5, 0]}
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
        minDistance={5.2}
        maxDistance={13}
        minPolarAngle={0.32}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  );
}

function coordText(coord: GridCoord | null): string {
  return coord ? `(${coord.row}, ${coord.col})` : "-";
}

function Legend({ p }: { p: Theme3DPalette }) {
  const items = [
    ["current", p.emberBright],
    ["next", p.ember],
    ["frontier", p.arcBright],
    ["visited", p.arcDeep],
    ["path", p.verdant],
  ] as const;

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(([label, color]) => (
        <span key={label} className="inline-flex items-center gap-1 rounded border border-ink-700/70 bg-ink-950/70 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-ink-300">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
          {label}
        </span>
      ))}
    </div>
  );
}

function FrontierRail({ model, p }: { model: GridSearchSceneModel; p: Theme3DPalette }) {
  const ordered = model.kind === "dfs" ? [...model.frontierCells].reverse() : model.frontierCells;
  const waiting = ordered.slice(0, 8);
  const tailLabel = model.kind === "bfs" ? "back" : "bottom";

  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 rounded-md border border-arc-400/25 bg-ink-950/88 p-2 shadow-2xl backdrop-blur-md sm:inset-x-3 sm:bottom-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] font-black uppercase tracking-widest text-arc-200">
            {model.frontierName} frontier
          </p>
          <p className="mt-0.5 font-mono text-[10px] font-semibold text-ink-500">
            next is shown first · {model.frontierDirection}
          </p>
        </div>
        <span className="rounded border border-ink-700/75 bg-ink-900/80 px-2 py-0.5 font-mono text-[10px] font-bold text-ink-300">
          {model.frontierRule}
        </span>
      </div>
      <div className="flex min-h-8 gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
        {waiting.length ? (
          waiting.map((coord, index) => (
            <span
              key={`${coord.row}-${coord.col}-${index}`}
              className="inline-flex min-w-[4.25rem] shrink-0 flex-col rounded-md border px-2 py-1 font-mono shadow-lg"
              style={{
                borderColor: index === 0 ? p.ember : "rgb(56 189 248 / 0.38)",
                background: index === 0 ? "rgb(245 158 11 / 0.16)" : "rgb(14 165 233 / 0.14)",
                color: index === 0 ? "rgb(254 243 199)" : "rgb(224 242 254)",
              }}
            >
              <span className="text-[8px] font-black uppercase tracking-widest opacity-70">
                {index === 0 ? "next" : index === waiting.length - 1 ? tailLabel : "wait"}
              </span>
              <span className="text-[11px] font-black">
                ({coord.row}, {coord.col})
              </span>
            </span>
          ))
        ) : (
          <span className="rounded-md border border-ink-700/70 bg-ink-900/70 px-2 py-1 font-mono text-[11px] font-bold text-ink-400">
            empty
          </span>
        )}
      </div>
      <div className="mt-2 hidden sm:block">
        <Legend p={p} />
      </div>
    </div>
  );
}

function Overlay({ model, p }: { model: GridSearchSceneModel; p: Theme3DPalette }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-2 top-2 z-10 grid gap-2 md:inset-x-3 md:top-3 md:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="rounded-md border border-arc-400/35 bg-ink-950/90 px-3 py-2 shadow-2xl backdrop-blur-md">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded border border-arc-400/35 bg-arc-500/10 px-1.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-widest text-arc-200">
              {model.kind.toUpperCase()} / {model.operation}
            </span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-400">
              {model.frontierName} {model.frontierRule}
            </span>
          </div>
          <p className="max-w-4xl text-sm font-black leading-tight text-ink-50 sm:text-base md:text-lg">{model.headline}</p>
          <p className="mt-1 max-w-4xl text-[11px] leading-relaxed text-ink-300 sm:text-xs md:text-sm">{model.detail}</p>
          <p className="mt-1 hidden font-mono text-[10px] font-bold uppercase tracking-wider text-arc-200 sm:block">{model.behaviorLine}</p>
        </div>

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <div className="rounded-md border border-ink-700/70 bg-ink-950/90 px-2 py-2 text-center shadow-xl backdrop-blur-md">
            <p className="font-mono text-[8px] font-black uppercase tracking-widest text-ink-500 sm:text-[9px]">current</p>
            <p className="mt-1 font-mono text-xs font-black text-ember-100 sm:text-sm">{coordText(model.current)}</p>
          </div>
          <div className="rounded-md border border-ink-700/70 bg-ink-950/90 px-2 py-2 text-center shadow-xl backdrop-blur-md">
            <p className="font-mono text-[8px] font-black uppercase tracking-widest text-ink-500 sm:text-[9px]">next</p>
            <p className="mt-1 font-mono text-xs font-black text-amber-100 sm:text-sm">{coordText(model.nextCell)}</p>
          </div>
          <div className="rounded-md border border-ink-700/70 bg-ink-950/90 px-2 py-2 text-center shadow-xl backdrop-blur-md">
            <p className="font-mono text-[8px] font-black uppercase tracking-widest text-ink-500 sm:text-[9px]">seen/front</p>
            <p className="mt-1 font-mono text-xs font-black text-arc-100 sm:text-sm">{model.visitedCount}/{model.frontierSize}</p>
          </div>
        </div>
      </div>
      <FrontierRail model={model} p={p} />
    </>
  );
}

export function GridSearchStage3D({ step }: { step: TraceStep }) {
  const p = useTheme3D();
  const model = useMemo(() => getGridSearchSceneModel(step), [step]);
  const reducedMotion = useReducedMotionPreference();

  if (!model) return null;

  return (
    <div className="codeanvil-canvas-fill relative h-full min-h-[23rem] w-full overflow-hidden rounded-md">
      <Canvas
        dpr={[1.25, 2]}
        camera={{ position: [0, 5.4, 7.1], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <CanvasSizeSync />
        <Scene model={model} p={p} reducedMotion={reducedMotion} />
      </Canvas>
      <Overlay model={model} p={p} />
    </div>
  );
}
