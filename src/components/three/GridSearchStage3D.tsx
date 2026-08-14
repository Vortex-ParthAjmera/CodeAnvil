import { useMemo, useRef } from "react";
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

function cellX(col: number, cols: number): number {
  return (col - (cols - 1) / 2) * 0.92;
}

function cellZ(row: number, rows: number): number {
  return (row - (rows - 1) / 2) * 0.92;
}

function positionFor(coord: GridCoord, model: GridSearchSceneModel): [number, number, number] {
  return [cellX(coord.col, model.cols), 0.2, cellZ(coord.row, model.rows)];
}

function colorForCell(cell: GridSearchCell, p: Theme3DPalette): string {
  if (cell.isPath) return p.verdant;
  if (cell.isCurrent) return p.emberBright;
  if (cell.isFrontier) return p.arcBright;
  if (cell.isVisited) return p.arcDeep;
  if (cell.isStart) return p.verdantDeep;
  if (cell.isGoal) return p.ember;
  if (cell.isWall) return p.gridSection;
  return p.emptyCell;
}

function heightForCell(cell: GridSearchCell): number {
  if (cell.isWall) return 0.62;
  if (cell.isCurrent) return 0.36;
  if (cell.isPath) return 0.3;
  if (cell.isFrontier) return 0.26;
  if (cell.isVisited) return 0.2;
  return 0.12;
}

function CellBlock({
  cell,
  model,
  p,
}: {
  cell: GridSearchCell;
  model: GridSearchSceneModel;
  p: Theme3DPalette;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const color = colorForCell(cell, p);
  const targetHeight = heightForCell(cell);
  const x = cellX(cell.col, model.cols);
  const z = cellZ(cell.row, model.rows);
  const label = cell.isStart ? "S" : cell.isGoal ? "G" : cell.isCurrent ? "now" : "";

  useFrame(({ clock }, delta) => {
    if (!mesh.current || !material.current) return;
    const t = 1 - Math.pow(0.0005, delta);
    const pulse = cell.isCurrent ? (Math.sin(clock.elapsedTime * 5.6) + 1) / 2 : 0;
    const lift = cell.isCurrent ? pulse * 0.08 : 0;
    mesh.current.scale.y = THREE.MathUtils.lerp(mesh.current.scale.y, targetHeight + lift, t);
    mesh.current.position.y = mesh.current.scale.y / 2;
    material.current.emissiveIntensity = THREE.MathUtils.lerp(
      material.current.emissiveIntensity,
      cell.isCurrent ? 0.95 + pulse * 0.55 : cell.isWall ? 0.02 : cell.isPath ? 0.62 : cell.isFrontier ? 0.48 : cell.isVisited ? 0.26 : 0.08,
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
          emissiveIntensity={cell.isCurrent ? 1.05 : cell.isPath ? 0.62 : cell.isFrontier ? 0.48 : cell.isVisited ? 0.26 : 0.08}
          metalness={0.38}
          roughness={0.36}
          transparent={!cell.isWall}
          opacity={cell.isWall ? 1 : cell.role === "empty" ? 0.72 : 0.95}
        />
        <Edges color={color} threshold={16} />
      </mesh>

      {label && (
        <Html position={[0, targetHeight + 0.34, 0.02]} center style={{ pointerEvents: "none" }}>
          <div
            className="rounded-md border bg-ink-950/92 px-2 py-1 font-mono text-[10px] font-black uppercase leading-none text-ink-50 shadow-xl backdrop-blur"
            style={{ borderColor: color }}
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
  const points = model.pathCells.map((coord) => positionFor(coord, model));
  return <Line points={points} color={p.verdant} lineWidth={4} />;
}

function CurrentBeacon({ model, p }: { model: GridSearchSceneModel; p: Theme3DPalette }) {
  const beacon = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!beacon.current) return;
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
    </group>
  );
}

function FrontierRail({ model }: { model: GridSearchSceneModel }) {
  const waiting = model.frontierCells.slice(0, 9);
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 rounded-md border border-arc-400/25 bg-ink-950/84 p-2 shadow-2xl backdrop-blur-md">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-black uppercase tracking-widest text-arc-200">
          {model.frontierName} frontier
        </span>
        <span className="rounded border border-ink-700/75 bg-ink-900/80 px-2 py-0.5 font-mono text-[10px] font-bold text-ink-300">
          {model.frontierRule} order
        </span>
      </div>
      <div className="flex min-h-8 flex-wrap gap-1.5">
        {waiting.length ? (
          waiting.map((coord, index) => (
            <span
              key={`${coord.row}-${coord.col}-${index}`}
              className="rounded-md border border-arc-400/40 bg-arc-500/15 px-2 py-1 font-mono text-[11px] font-black text-arc-100"
            >
              ({coord.row}, {coord.col})
            </span>
          ))
        ) : (
          <span className="rounded-md border border-ink-700/70 bg-ink-900/70 px-2 py-1 font-mono text-[11px] font-bold text-ink-400">
            empty
          </span>
        )}
      </div>
    </div>
  );
}

function Scene({ model, p }: { model: GridSearchSceneModel; p: Theme3DPalette }) {
  const scene = useRef<THREE.Group>(null);
  const stageWidth = Math.max(5.4, model.cols * 0.95 + 1.4);
  const stageDepth = Math.max(5.4, model.rows * 0.95 + 1.2);

  useFrame(({ clock }) => {
    if (!scene.current) return;
    scene.current.rotation.y = Math.sin(clock.elapsedTime * 0.28) * 0.018;
  });

  return (
    <>
      <ambientLight intensity={0.72 * p.lighting.ambient} />
      <directionalLight position={[5, 8, 4]} intensity={1.5 * p.lighting.directional} />
      <pointLight position={[-2, 3.8, 2.8]} intensity={42 * p.lighting.accent} distance={12} color={p.arcBright} />
      <pointLight position={[3, 3.2, 2.4]} intensity={34 * p.lighting.accent} distance={11} color={p.emberBright} />

      <group ref={scene} position={[0, -0.7, 0]}>
        <mesh position={[0, -0.03, 0]}>
          <boxGeometry args={[stageWidth, 0.08, stageDepth]} />
          <meshStandardMaterial color={p.emptyCell} emissive={p.arcDeep} emissiveIntensity={0.08} transparent opacity={0.7} metalness={0.18} roughness={0.5} />
        </mesh>
        <PathRibbon model={model} p={p} />
        {model.cells.map((cell) => (
          <CellBlock key={`${cell.row}-${cell.col}`} cell={cell} model={model} p={p} />
        ))}
        <CurrentBeacon model={model} p={p} />
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
        enableDamping
        dampingFactor={0.08}
        minDistance={5.2}
        maxDistance={13}
        minPolarAngle={0.32}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  );
}

function Overlay({ model }: { model: GridSearchSceneModel }) {
  const current = model.current ? `(${model.current.row}, ${model.current.col})` : "-";
  return (
    <>
      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 grid gap-2 md:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="rounded-md border border-arc-400/35 bg-ink-950/88 px-3 py-2 shadow-2xl backdrop-blur-md">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded border border-arc-400/35 bg-arc-500/10 px-1.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-widest text-arc-200">
              {model.kind.toUpperCase()} / {model.operation}
            </span>
            <span className="font-mono text-[11px] font-semibold text-ink-400">
              {model.frontierName} {model.frontierRule}
            </span>
          </div>
          <p className="text-base font-black leading-tight text-ink-50 md:text-lg">{model.headline}</p>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-300 md:text-sm">{model.detail}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md border border-ink-700/70 bg-ink-950/88 px-2 py-2 text-center shadow-xl backdrop-blur-md">
            <p className="font-mono text-[9px] font-black uppercase tracking-widest text-ink-500">current</p>
            <p className="mt-1 font-mono text-sm font-black text-ember-100">{current}</p>
          </div>
          <div className="rounded-md border border-ink-700/70 bg-ink-950/88 px-2 py-2 text-center shadow-xl backdrop-blur-md">
            <p className="font-mono text-[9px] font-black uppercase tracking-widest text-ink-500">visited</p>
            <p className="mt-1 font-mono text-lg font-black text-arc-100">{model.visitedCount}</p>
          </div>
          <div className="rounded-md border border-ink-700/70 bg-ink-950/88 px-2 py-2 text-center shadow-xl backdrop-blur-md">
            <p className="font-mono text-[9px] font-black uppercase tracking-widest text-ink-500">frontier</p>
            <p className="mt-1 font-mono text-lg font-black text-ink-50">{model.frontierSize}</p>
          </div>
        </div>
      </div>
      <FrontierRail model={model} />
    </>
  );
}

export function GridSearchStage3D({ step }: { step: TraceStep }) {
  const p = useTheme3D();
  const model = useMemo(() => getGridSearchSceneModel(step), [step]);

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
        <Scene model={model} p={p} />
      </Canvas>
      <Overlay model={model} />
    </div>
  );
}
