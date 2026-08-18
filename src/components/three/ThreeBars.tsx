import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { useTheme3D } from "../../lib/theme3d";

/**
 * Role → color map, mirroring the 2D ArrayStage tokens:
 * compare/reading = arc (blue), swap/mid/key = ember (amber),
 * max/sorted = verdant (green), dim = ink.
 */
export const BAR_COLORS: Record<string, string> = {
  default: "#4a4e5e",
  reading: "#38bdf8",
  compare: "#38bdf8",
  mid: "#f59e0b",
  swap: "#f59e0b",
  key: "#fbbf24",
  found: "#f472b6",
  max: "#34d399",
  sorted: "#10b981",
  range: "#262833",
  out: "#262833",
};

export interface BarDescriptor {
  index: number;
  role: string;
}

export function BarsGroup({
  values,
  states,
  highlightIdx,
  maxH = 4.2,
  baseY = -1.6,
  colors,
}: {
  values: number[];
  states: BarDescriptor[];
  highlightIdx?: number | null;
  maxH?: number;
  baseY?: number;
  /** Palette-aware role colors; defaults to the dark theme tokens. */
  colors?: Record<string, string>;
}) {
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const target = useRef<(number | null)[]>([]);
  const roleColors = colors ?? BAR_COLORS;

  const maxVal = Math.max(...values, 1);
  const count = values.length;
  const gap = 1.15;
  const width = 0.78;

  const stateByIndex = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of states) map.set(s.index, s.role);
    return map;
  }, [states]);

  const targetHeights = useMemo(
    () => values.map((v) => Math.max(0.18, (v / maxVal) * maxH)),
    [values, maxVal],
  );

  useFrame((_, delta) => {
    meshes.current.forEach((mesh, i) => {
      if (!mesh) return;
      const want = targetHeights[i] ?? 0.2;
      const prev = target.current[i] ?? 0.2;
      const t = 1 - Math.pow(0.001, delta); // ~90% per frame at 60fps
      const h = THREE.MathUtils.lerp(prev, want, t);
      target.current[i] = h;
      mesh.scale.y = h;
      mesh.position.y = h / 2;
    });
  });

  return (
    <group position={[0, baseY, 0]}>
      {values.map((v, i) => {
        const role = stateByIndex.get(i) ?? "default";
        const color = roleColors[role] ?? roleColors.default ?? BAR_COLORS.default;
        const isHot = highlightIdx === i;
        const textColor = roleColors.text ?? "#c9cdd8";
        const indexColor = roleColors.index ?? "#7a7f92";
        return (
          <group key={i} position={[(i - (count - 1) / 2) * gap, 0, 0]}>
            <mesh
              ref={(el) => {
                meshes.current[i] = el;
              }}
            >
              <boxGeometry args={[width, 1, width]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isHot ? 0.9 : role === "default" ? 0.05 : 0.35}
                metalness={0.35}
                roughness={0.4}
              />
              <Edges color={color} threshold={15} />
            </mesh>
            <Text
              position={[0, 0.32, 0]}
              fontSize={0.34}
              color={textColor}
              anchorX="center"
              anchorY="middle"
            >
              {String(v)}
            </Text>
            <Text
              position={[0, -0.28, 0]}
              fontSize={0.22}
              color={indexColor}
              anchorX="center"
              anchorY="middle"
            >
              {String(i)}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

export function ThreeBars({
  values,
  states = [],
  highlightIdx = null,
  autoRotate = false,
}: {
  values: number[];
  states?: BarDescriptor[];
  highlightIdx?: number | null;
  autoRotate?: boolean;
}) {
  const p = useTheme3D();
  const colors: Record<string, string> = {
    default: p.barDefault,
    reading: p.arc,
    compare: p.arc,
    mid: p.ember,
    swap: p.ember,
    key: p.emberBright,
    found: p.found,
    max: p.verdant,
    sorted: p.verdantDeep,
    range: p.barRange,
    out: p.barRange,
    text: p.textStrong,
    index: p.textDim,
  };
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 3.2, 9.5], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.6 * p.lighting.ambient} />
      <directionalLight position={[6, 9, 5]} intensity={1.5 * p.lighting.directional} />
      <pointLight position={[0, 5, 3]} intensity={50 * p.lighting.accent} distance={14} color={p.ember} />
      <BarsGroup values={values} states={states} highlightIdx={highlightIdx} colors={colors} />
      <InfiniteGrid
        position={[0, -3.4, 0]}
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
        autoRotate={autoRotate}
        autoRotateSpeed={0.8}
        minDistance={4}
        maxDistance={16}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}
