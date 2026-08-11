import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Edges,
  Float,
  Grid,
  Html,
  Sparkles,
  Stars,
} from "@react-three/drei";
import * as THREE from "three";
import { hue } from "../three/palette";

/** Pauses the whole scene when the hero scrolls out of view (saves all GPU work). */
function useVisible(ref: React.RefObject<HTMLElement | null>): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      // Stay mounted a bit past the viewport edge so scroll-back is instant.
      { rootMargin: "320px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return visible;
}

/** Anvil made of dark metal boxes with glowing violet edges (brand: forge/anvil). */
export function Anvil() {
  // ONE shared material for all six boxes — a single GPU program instead of six.
  const metal = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#23242c",
        metalness: 0.92,
        roughness: 0.3,
      }),
    [],
  );
  return (
    <group scale={1.12}>
      {/* base */}
      <mesh position={[0, 0.27, 0]} material={metal}>
        <boxGeometry args={[2.7, 0.55, 1.7]} />
        <Edges color={hue(0)} threshold={15} />
      </mesh>
      {/* waist */}
      <mesh position={[0, 1.05, 0]} material={metal}>
        <boxGeometry args={[1.7, 0.45, 1.0]} />
        <Edges color={hue(1)} threshold={15} />
      </mesh>
      {/* body */}
      <mesh position={[0, 1.62, 0]} material={metal}>
        <boxGeometry args={[1.95, 0.7, 1.15]} />
        <Edges color={hue(0)} threshold={15} />
      </mesh>
      {/* table (top plate) */}
      <mesh position={[0, 2.12, 0]} material={metal}>
        <boxGeometry args={[2.2, 0.28, 1.4]} />
        <Edges color={hue(3)} threshold={15} />
      </mesh>
      {/* horn */}
      <mesh position={[1.35, 1.95, 0]} rotation={[0, 0, -0.55]} material={metal}>
        <boxGeometry args={[1.25, 0.4, 0.55]} />
        <Edges color={hue(4)} threshold={15} />
      </mesh>
      {/* tail */}
      <mesh position={[-1.32, 1.95, 0]} material={metal}>
        <boxGeometry args={[0.4, 0.42, 1.4]} />
        <Edges color={hue(1)} threshold={15} />
      </mesh>
    </group>
  );
}

/** Thin glowing bars arranged in a ring — reads as "code lines" executing in sequence. */
export function CodeLines() {
  const group = useRef<THREE.Group>(null);
  const bars = useRef<(THREE.Mesh | null)[]>([]);

  const layout = useMemo(() => {
    const items: { pos: [number, number, number]; len: number; yaw: number }[] = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 3.0 + (i % 3) * 0.3;
      const y = 2.5 + Math.sin(angle * 2) * 0.5 + (i % 2) * 0.3;
      items.push({
        pos: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
        len: 0.4 + ((i * 7) % 10) / 10,
        yaw: angle,
      });
    }
    return items;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (group.current) group.current.rotation.y = t * 0.05;
    bars.current.forEach((bar, i) => {
      if (!bar) return;
      const phase = (t * 1.5 + i * 0.45) % (Math.PI * 2);
      const glow = (Math.sin(phase) + 1) / 2;
      const mat = bar.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.25 + glow * 2.4;
      const s = 1 + glow * 0.4;
      bar.scale.set(1, s, 1);
    });
  });

  return (
    <group ref={group} position={[0, 0.4, 0]}>
      {layout.map((item, i) => {
        const c = hue(i);
        return (
          <mesh
            key={i}
            ref={(el) => {
              bars.current[i] = el;
            }}
            position={item.pos}
            rotation={[0, item.yaw + Math.PI / 2, 0]}
          >
            <boxGeometry args={[item.len, 0.055, 0.055]} />
            <meshStandardMaterial
              color={c}
              emissive={c}
              emissiveIntensity={0.4}
              roughness={0.2}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/** Two counter-rotating glowing rings around the anvil — the "execution orbit". */
export function OrbitRings() {
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (a.current) a.current.rotation.z = t * 0.28;
    if (b.current) b.current.rotation.z = -t * 0.2;
  });
  return (
    <group position={[0, 2.05, 0]}>
      <mesh ref={a} rotation={[Math.PI / 2.35, 0, 0]}>
        <torusGeometry args={[2.45, 0.012, 12, 96]} />
        <meshBasicMaterial
          color={hue(0)}
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={b} rotation={[Math.PI / 2.35, 0.35, 0]}>
        <torusGeometry args={[2.75, 0.008, 12, 96]} />
        <meshBasicMaterial
          color={hue(1)}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * Deep-space layer behind everything: a starfield, two additive celestial
 * rings, and a slow wireframe polyhedron — the "cosmos" the forge floats in.
 */
export function Cosmos() {
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const poly = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ringA.current) {
      ringA.current.rotation.x = Math.PI / 2.6 + t * 0.05;
      ringA.current.rotation.z = t * 0.06;
    }
    if (ringB.current) {
      ringB.current.rotation.x = Math.PI / 2.2 - t * 0.04;
      ringB.current.rotation.y = t * 0.08;
    }
    if (poly.current) {
      poly.current.rotation.x = t * 0.06;
      poly.current.rotation.y = t * 0.09;
    }
  });
  return (
    <group>
      <mesh ref={ringA} position={[0, 3.6, -14]}>
        <torusGeometry args={[5.6, 0.025, 12, 96]} />
        <meshBasicMaterial
          color="#8b5cf6"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ringB} position={[4.4, 2.4, -18]} rotation={[0.6, 0.4, 0]}>
        <torusGeometry args={[3.2, 0.02, 12, 80]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.32}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={poly} position={[-5.2, 4.8, -20]} scale={1.7}>
        <icosahedronGeometry args={[1.4, 1]} />
        <meshBasicMaterial color="#a78bfa" wireframe transparent opacity={0.14} />
      </mesh>
    </group>
  );
}

/** Glass chips floating around the scene — values that "light up" in sequence. */
export function FloatingChips() {
  const chips = useMemo(
    () => [
      { label: "total", value: "10", pos: [2.9, 3.0, 0.6] as [number, number, number], accent: "#a78bfa", delay: 0 },
      { label: "probe mid", value: "4", pos: [-2.6, 3.3, 0.5] as [number, number, number], accent: "#38bdf8", delay: 900 },
      { label: "fact(3)", value: "→ 6", pos: [3.1, 1.5, -0.4] as [number, number, number], accent: "#34d399", delay: 1800 },
      { label: "swap", value: "i↔j", pos: [-2.8, 1.8, -0.5] as [number, number, number], accent: "#a78bfa", delay: 2700 },
    ],
    [],
  );
  return (
    <>
      {chips.map((c) => (
        <FloatingChip key={c.label} {...c} />
      ))}
    </>
  );
}

function FloatingChip({
  label,
  value,
  pos,
  accent,
  delay,
}: {
  label: string;
  value: string;
  pos: [number, number, number];
  accent: string;
  delay: number;
}) {
  const [lit, setLit] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => {
      setLit(true);
      window.setTimeout(() => setLit(false), 1150);
    }, 3900 + delay);
    return () => window.clearInterval(id);
  }, [delay]);
  return (
    <Html position={pos} center distanceFactor={14} pointerEvents="none" zIndexRange={[20, 0]}>
      <div
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 font-mono text-[11px] backdrop-blur-sm transition-all duration-300 ${
          lit
            ? "scale-110 border-ember-500/70 bg-ink-900/85 text-ink-100 shadow-[0_0_20px_rgba(167,139,250,0.55)]"
            : "border-ink-600/80 bg-ink-900/60 text-ink-300"
        }`}
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full transition-all duration-300"
          style={{ background: accent, boxShadow: lit ? `0 0 8px ${accent}` : "none" }}
        />
        {label} <b className={lit ? "text-ember-300" : "text-ink-100"}>{value}</b>
      </div>
    </Html>
  );
}

/**
 * Camera drifts slowly and parallaxes toward the pointer. The anvil is framed
 * lower-right of center so the copy (upper-left, over a scrim) never fights it.
 */
function CameraRig() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const px = THREE.MathUtils.lerp(
      state.camera.position.x,
      2.4 + state.pointer.x * 0.9 + Math.sin(t * 0.1) * 0.3,
      0.035,
    );
    const py = THREE.MathUtils.lerp(
      state.camera.position.y,
      3.1 + state.pointer.y * 0.5,
      0.035,
    );
    state.camera.position.x = px;
    state.camera.position.y = py;
    state.camera.lookAt(0.5, 0.9, 0);
  });
  return null;
}

export function ForgeScene({ scale = 1 }: { scale?: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const visible = useVisible(wrap);

  return (
    <div
      ref={wrap}
      aria-hidden
      className="absolute inset-0"
      style={{ contain: "strict" }}
    >
      {visible && (
        <Canvas
          dpr={[1, 1.75]}
          // Adaptive DPR: R3F lowers the render resolution automatically when
          // the frame rate drops, so weak GPUs degrade gracefully.
          performance={{ min: 0.4 }}
          camera={{ position: [2.4, 3.1, 10.5], fov: 46 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          style={{ background: "transparent" }}
        >
          {/* Depth haze so the background melts into the page color */}
          <fog attach="fog" args={["#0b0c0f", 9, 30]} />

          <ambientLight intensity={0.6} />
          <directionalLight position={[6, 9, 5]} intensity={1.6} color="#fff7ea" />
          <pointLight position={[0, 2.6, 1.6]} intensity={60} distance={12} color="#a78bfa" />

          {/* The cosmos */}
          <Stars
            radius={70}
            depth={50}
            count={2400}
            factor={3.2}
            saturation={0.5}
            fade
            speed={0.7}
          />
          <Cosmos />
          <Sparkles
            count={130}
            scale={[46, 24, 30]}
            position={[0, 4, -2]}
            size={2}
            speed={0.35}
            color={hue(1)}
            opacity={0.55}
          />

          {/* Infinite floor grid stretching to the horizon */}
          <Grid
            position={[0, 0, 0]}
            args={[14, 14]}
            cellSize={0.9}
            cellThickness={0.6}
            cellColor="#232634"
            sectionSize={4.5}
            sectionThickness={1.1}
            sectionColor="#8b5cf6"
            fadeDistance={30}
            fadeStrength={2.2}
            infiniteGrid
          />

          {/* The forge itself — the whole rig scales with the user's size slider */}
          <group scale={scale}>
            <Float speed={1.1} rotationIntensity={0.12} floatIntensity={0.7}>
              <Anvil />
            </Float>
            <OrbitRings />
            <CodeLines />
            <FloatingChips />
            <Sparkles
              count={80}
              scale={[10, 7, 6]}
              position={[0, 1.6, 0]}
              size={2.4}
              speed={0.4}
              color={hue(0)}
              opacity={0.7}
            />
            <Sparkles
              count={28}
              scale={[8, 5, 5]}
              position={[0, 2.4, 0]}
              size={3.2}
              speed={0.25}
              color={hue(3)}
              opacity={0.5}
            />
            <ContactShadows
              position={[0, 0.005, 0]}
              opacity={0.5}
              scale={14}
              blur={2.6}
              far={4.5}
              color="#000000"
              frames={60}
            />
          </group>
          <CameraRig />
        </Canvas>
      )}
    </div>
  );
}
