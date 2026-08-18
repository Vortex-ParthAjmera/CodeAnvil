import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import type { GridHighlight } from "../../types/trace";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";

export const GRID_COLORS: Record<string, string> = {
  empty: "#17181e",
  wall: "#363947",
  start: "#34d399",
  goal: "#f59e0b",
  current: "#fbbf24",
  frontier: "#38bdf8",
  visited: "#0ea5e9",
  path: "#34d399",
};

/** Dark-mode defaults → palette-aware colors for the current mode/theme. */
function gridColorsFor(p: Theme3DPalette): Record<string, string> {
  return {
    empty: p.emptyCell,
    wall: p.gridSection,
    start: p.verdant,
    goal: p.ember,
    current: p.emberBright,
    frontier: p.arc,
    visited: p.arcDeep,
    path: p.verdant,
  };
}

function Cell({
  x,
  z,
  role,
  label,
  colors,
  labelColor,
}: {
  x: number;
  z: number;
  role: string;
  label?: string;
  colors: Record<string, string>;
  labelColor: string;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const isWall = role === "wall";
  const isCurrent = role === "current";
  const size = 0.82;
  const height = isWall ? 0.62 : 0.16;

  useFrame(({ clock }) => {
    if (isCurrent && mat.current) {
      const pulse = (Math.sin(clock.elapsedTime * 5) + 1) / 2;
      mat.current.emissiveIntensity = 0.6 + pulse * 1.4;
      if (mesh.current) mesh.current.scale.y = 1 + pulse * 0.35;
    }
  });

  const color = colors[role] ?? colors.empty;
  return (
    <group position={[x, 0, z]}>
      <mesh ref={mesh} position={[0, height / 2, 0]}>
        <boxGeometry args={[size, 1, size]} />
        <meshStandardMaterial
          ref={mat}
          color={color}
          emissive={color}
          emissiveIntensity={isWall ? 0 : isCurrent ? 0.8 : role === "empty" ? 0 : 0.35}
          metalness={0.3}
          roughness={0.5}
        />
        {!isWall && <Edges color={color} threshold={15} />}
      </mesh>
      {label && (
        <Text
          position={[0, height + 0.42, 0]}
          fontSize={0.4}
          color={labelColor}
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      )}
    </group>
  );
}

export function ThreeGrid({
  grid,
  highlights = [],
}: {
  grid: number[][];
  highlights?: GridHighlight[];
}) {
  const p = useTheme3D();
  const colors = useMemo(() => gridColorsFor(p), [p]);
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const size = 1;

  const highlightMap = useMemo(() => {
    const map = new Map<string, GridHighlight>();
    for (const h of highlights) map.set(`${h.row},${h.col}`, h);
    return map;
  }, [highlights]);

  const cells = useMemo(() => {
    const out: { x: number; z: number; role: string; label?: string }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hl = highlightMap.get(`${r},${c}`);
        let role: string;
        if (hl) {
          role = hl.role;
        } else {
          role = grid[r][c] === 1 ? "wall" : "empty";
        }
        const label = role === "start" ? "S" : role === "goal" ? "G" : undefined;
        out.push({
          x: (c - (cols - 1) / 2) * size,
          z: (r - (rows - 1) / 2) * size,
          role,
          label,
        });
      }
    }
    return out;
  }, [grid, rows, cols, highlightMap]);

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 6.4, 7.6], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.6 * p.lighting.ambient} />
      <directionalLight position={[6, 9, 5]} intensity={1.5 * p.lighting.directional} />
      <pointLight position={[0, 6, 2]} intensity={50 * p.lighting.accent} distance={14} color={p.ember} />
      <group position={[0, -0.4, 0]}>
        {cells.map((cell, i) => (
          <Cell key={i} x={cell.x} z={cell.z} role={cell.role} label={cell.label} colors={colors} labelColor={p.textStrong} />
        ))}
      </group>
      <InfiniteGrid
        position={[0, -0.85, 0]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor={p.gridCell}
        sectionSize={2.5}
        sectionThickness={1}
        sectionColor={p.gridSection}
        fadeDistance={26}
        fadeStrength={1}
        infiniteGrid
      />
      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={18}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}
