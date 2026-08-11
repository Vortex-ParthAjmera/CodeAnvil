import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import type { StackFrame } from "../../types/trace";
import { BarsGroup, type BarDescriptor } from "./ThreeBars";
import { cn } from "../../lib/cn";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";

function CodeFlow({ line, event, p }: { line: number; event: string; p: Theme3DPalette }) {
  const core = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (!core.current) return;
    core.current.rotation.x += delta * 0.22;
    core.current.rotation.y += delta * 0.38;
  });

  return (
    <group position={[0, -0.2, 0]}>
      <mesh ref={core} position={[0, 0.25, 0]}>
        <octahedronGeometry args={[0.82, 1]} />
        <meshStandardMaterial color={p.gridCell} emissive={p.ember} emissiveIntensity={0.65} metalness={0.65} roughness={0.22} wireframe />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => {
        const offset = i - 4;
        const active = i === 4;
        const color = active ? p.ember : p.barRange;
        return (
          <group key={i} position={[offset * 0.72, offset * -0.16, -1.2 - Math.abs(offset) * 0.15]} rotation={[0, 0, -0.13]}>
            <mesh>
              <boxGeometry args={[0.58, 0.12, 0.42]} />
              <meshStandardMaterial color={color} emissive={active ? p.ember : p.arc} emissiveIntensity={active ? 0.9 : 0.12} metalness={0.45} roughness={0.35} />
              {active && <Edges color={p.emberBright} />}
            </mesh>
          </group>
        );
      })}
      <Text position={[0, -1.35, 0.25]} fontSize={0.28} color={p.emberBright} anchorX="center">LINE {line}</Text>
      <Text position={[0, -1.75, 0.2]} fontSize={0.16} color={p.arcBright} anchorX="center">{event.replaceAll("_", " ").toUpperCase()}</Text>
    </group>
  );
}

/**
 * The lab's 3D execution stage (docs/33 — "explanatory Three.js renderer").
 *
 * Renders the current trace step as a scene: array bars re-shaping in the
 * center, floating variable chips above (pulsing when changed), and the call
 * stack stacked as plates on the right. Students read code line + trace action
 * + 3D motion + inspector together.
 */
export function ThreeStage({
  values,
  states,
  variables,
  changed,
  stack,
  stepKey,
  storyboard,
}: {
  values?: number[];
  states?: BarDescriptor[];
  variables: Record<string, unknown>;
  changed?: string[];
  stack: StackFrame[];
  stepKey?: string | number;
  storyboard?: { line: number; event: string };
}) {
  const p = useTheme3D();
  const varEntries = useMemo(() => {
    const entries = Object.entries(variables).filter(
      ([, v]) => typeof v !== "object" || v === null,
    );
    return entries.slice(0, 6);
  }, [variables]);

  const changedSet = useMemo(() => new Set(changed ?? []), [changed]);

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
      camera={{ position: [0, 2.6, 8.2], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.6 * p.lighting.ambient} />
      <directionalLight position={[6, 9, 5]} intensity={1.4 * p.lighting.directional} />
      <pointLight position={[0, 4, 3]} intensity={45 * p.lighting.accent} distance={13} color={p.ember} />

      {values && (
        <BarsGroup values={values} states={states ?? []} maxH={2.8} baseY={-1.1} colors={colors} />
      )}

      {!values && <CodeFlow line={storyboard?.line ?? 1} event={storyboard?.event ?? "line_enter"} p={p} />}

      {/* Floating variable chips */}
      {varEntries.map(([name, value], i) => {
        const isChanged = changedSet.has(name);
        const spread = (i - (varEntries.length - 1) / 2) * 1.5;
        return (
          <Html
            key={`${name}-${stepKey}`}
            position={[spread, values ? 2.6 : 1.4, 0]}
            center
            style={{ pointerEvents: "none", zIndex: 5 }}
          >
            <div
              className={cn(
                "rounded-md border px-2 py-1 font-mono text-[11px] shadow-lg backdrop-blur-sm",
                isChanged
                  ? "value-flash border-ember-400/70 bg-ink-900/95 text-ember-300"
                  : "border-ink-600/70 bg-ink-900/85 text-ink-200",
              )}
            >
              <span className="text-ink-500">{name}</span> ={" "}
              <span className="font-semibold">{String(value)}</span>
            </div>
          </Html>
        );
      })}

      {/* Call stack plates */}
      {stack.length > 0 && (
        <group position={[values ? 3.9 : 0, -0.4, -1.2]}>
          {[...stack].reverse().map((frame, i) => {
            const depth = stack.length - 1 - i;
            return (
              <Html
                key={`${frame.id}-${stepKey}`}
                position={[0, 0.55 + depth * 0.62, 0]}
                center
                style={{ pointerEvents: "none", zIndex: 5 }}
              >
                <div
                  className={cn(
                    "rounded-md border px-2 py-1 font-mono text-[10px] shadow-lg backdrop-blur-sm",
                    i === stack.length - 1
                      ? "border-ember-400/60 bg-ink-900/95 text-ember-200"
                      : "border-ink-600/60 bg-ink-900/80 text-ink-300",
                  )}
                >
                  {frame.name} · line {frame.line}
                  {i === stack.length - 1 && (
                    <span className="ml-1 text-ember-400">◀ running</span>
                  )}
                </div>
              </Html>
            );
          })}
        </group>
      )}

      <InfiniteGrid
        position={[0, -2.25, 0]}
        cellSize={0.5}
        cellThickness={0.55}
        cellColor={p.gridCell}
        sectionSize={2.5}
        sectionThickness={1}
        sectionColor={p.gridSection}
        fadeDistance={24}
        fadeStrength={1}
        infiniteGrid
      />

      <OrbitControls
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.6}
        minDistance={4}
        maxDistance={14}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}
