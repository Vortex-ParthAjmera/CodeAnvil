import { Canvas } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Line, OrbitControls, Text } from "@react-three/drei";
import type { DataStructureGuide } from "../../data/dsaCatalog";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";

const VALUES = [8, 3, 12, 5, 9, 2];

function Block({
  position,
  label,
  accent = false,
  size = [0.88, 0.62, 0.88] as [number, number, number],
  p,
}: {
  position: [number, number, number];
  label: string;
  accent?: boolean;
  size?: [number, number, number];
  p: Theme3DPalette;
}) {
  const color = accent ? p.ember : p.gridCell;
  const edge = accent ? p.emberBright : p.arc;
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={color}
          emissive={accent ? p.ember : p.arcDeep}
          emissiveIntensity={accent ? 0.55 : 0.18}
          metalness={0.45}
          roughness={0.34}
        />
        <Edges color={edge} />
      </mesh>
      <Text position={[0, 0, size[2] / 2 + 0.012]} fontSize={0.25} color={p.textStrong}>
        {label}
      </Text>
    </group>
  );
}

function Node({ position, label, accent = false, p }: { position: [number, number, number]; label: string; accent?: boolean; p: Theme3DPalette }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.38, 28, 28]} />
        <meshStandardMaterial
          color={accent ? p.ember : p.gridSection}
          emissive={accent ? p.ember : p.arc}
          emissiveIntensity={0.35}
          metalness={0.35}
          roughness={0.3}
        />
      </mesh>
      <Text position={[0, 0, 0.4]} fontSize={0.2} color={p.textStrong}>{label}</Text>
    </group>
  );
}

function StructureModel({ visual, p }: { visual: DataStructureGuide["visual"]; p: Theme3DPalette }) {
  if (visual === "stack") {
    return <group>{VALUES.slice(0, 5).map((v, i) => <Block key={v} position={[0, -1.05 + i * 0.72, 0]} label={String(v)} accent={i === 4} size={[2.1, 0.55, 1.2]} p={p} />)}</group>;
  }

  if (visual === "array") {
    return <group>{VALUES.map((v, i) => <Block key={i} position={[(i - 2.5) * 1.02, 0, 0]} label={String(v)} accent={i === 3} p={p} />)}</group>;
  }

  if (visual === "queue" || visual === "chain") {
    return (
      <group>
        {VALUES.slice(0, 5).map((v, i) => <Block key={i} position={[(i - 2) * 1.28, 0, 0]} label={String(v)} accent={visual === "queue" ? i === 0 : i === 2} p={p} />)}
        {VALUES.slice(0, 4).map((_, i) => <Line key={i} points={[[(i - 2) * 1.28 + 0.46, 0, 0], [(i - 1) * 1.28 - 0.46, 0, 0]]} color={p.arcBright} lineWidth={1.2} />)}
      </group>
    );
  }

  if (visual === "buckets") {
    return (
      <group>
        {[0, 1, 2, 3].map((row) => (
          <group key={row} position={[0, 1.2 - row * 0.82, 0]}>
            <Block position={[-2, 0, 0]} label={String(row)} accent={row === 2} size={[0.7, 0.55, 0.9]} p={p} />
            <Line points={[[-1.62, 0, 0], [-0.8, 0, 0]]} color={p.arc} lineWidth={1} />
            <Block position={[0, 0, 0]} label={["Ada", "Lin", "Ken", "Eds"][row]} size={[1.35, 0.55, 0.9]} p={p} />
            {row === 2 && <Block position={[1.65, 0, 0]} label="Sam" size={[1.1, 0.55, 0.9]} p={p} />}
          </group>
        ))}
      </group>
    );
  }

  const treePositions: [number, number, number][] = [[0, 1.7, 0], [-1.7, 0.45, 0], [1.7, 0.45, 0], [-2.5, -1, 0], [-0.9, -1, 0], [0.9, -1, 0], [2.5, -1, 0]];
  const graphPositions: [number, number, number][] = [[-2.2, 0.8, 0], [0, 1.6, 0], [2.2, 0.7, 0], [-1.5, -1.2, 0], [0.8, -1.1, 0], [2.7, -1.4, 0]];
  const positions = visual === "graph" ? graphPositions : treePositions;
  const links = visual === "graph" ? [[0, 1], [0, 3], [1, 2], [1, 4], [2, 4], [2, 5], [3, 4]] : [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]];
  return (
    <group>
      {links.map(([a, b], i) => <Line key={i} points={[positions[a], positions[b]]} color={p.gridSection} lineWidth={1.4} />)}
      {positions.map((position, i) => <Node key={i} position={position} label={String(VALUES[i % VALUES.length])} accent={i === 0} p={p} />)}
    </group>
  );
}

export function StructureStage3D({ structure }: { structure: DataStructureGuide }) {
  const p = useTheme3D();
  return (
    <Canvas dpr={[1, 1.6]} camera={{ position: [0, 3.4, 8.5], fov: 42 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.65 * p.lighting.ambient} />
      <directionalLight position={[5, 8, 5]} intensity={1.6 * p.lighting.directional} />
      <pointLight position={[0, 3, 3]} intensity={35 * p.lighting.accent} distance={12} color={p.ember} />
      <StructureModel visual={structure.visual} p={p} />
      <InfiniteGrid position={[0, -1.75, 0]} cellSize={0.5} cellColor={p.gridCell} sectionSize={2.5} sectionColor={p.gridSection} fadeDistance={22} infiniteGrid />
      <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.55} minDistance={5} maxDistance={14} maxPolarAngle={Math.PI / 2.05} />
    </Canvas>
  );
}
