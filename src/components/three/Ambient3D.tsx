import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PALETTE } from "./palette";
import { useTheme3D } from "../../lib/theme3d";

/**
 * Ambient3D — the app shell's living 3D background.
 *
 * A fixed, transparent WebGL canvas behind every screen (Dashboard, Lab,
 * Arena, Atlas, Visualizer, Story, Duel, Saved, Auth). Multicolor star-dust
 * drifts and tumbles while a few giant wireframe solids turn far in the haze.
 * Built to be cheap: ~110 instanced points (1 draw call) + 3 wireframes, DPR
 * capped, and the whole rig stops rendering when the tab is hidden or the
 * user prefers reduced motion (the CSS aurora covers that case).
 */

function Dust() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 110;
  const data = useMemo(() => {
    const arr: { pos: THREE.Vector3; speed: number; spin: number }[] = [];
    for (let i = 0; i < N; i++) {
      const r = 6 + Math.random() * 14;
      const a = Math.random() * Math.PI * 2;
      const y = -3 + Math.random() * 14;
      arr.push({
        pos: new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r - 4),
        speed: 0.15 + Math.random() * 0.5,
        spin: (Math.random() - 0.5) * 0.4,
      });
    }
    return arr;
  }, []);

  const color = useMemo(() => {
    const c = new THREE.Color();
    const arr = new Float32Array(data.length * 3);
    data.forEach((_, i) => {
      c.set(PALETTE[i % PALETTE.length]).toArray(arr, i * 3);
    });
    return arr;
  }, [data]);

  useFrame((state) => {
    if (document.hidden || !ref.current) return;
    const t = state.clock.elapsedTime;
    const dummy = new THREE.Object3D();
    data.forEach((d, i) => {
      dummy.position.set(d.pos.x, d.pos.y + Math.sin(t * d.speed + i) * 1.2, d.pos.z);
      dummy.rotation.set(t * d.spin, t * d.spin * 0.7, 0);
      const s = 0.05 + ((i * 7) % 5) * 0.02;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial>
        <instancedBufferAttribute attach="instanceColor" args={[color, 3]} />
      </meshBasicMaterial>
    </instancedMesh>
  );
}

function HazeSolid({ index, size }: { index: number; size: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const base = useMemo(() => {
    const r = 16 + index * 4;
    const a = (index / 3) * Math.PI * 2 + 0.7;
    return new THREE.Vector3(Math.cos(a) * r, 2 - index * 2.2, Math.sin(a) * r - 10);
  }, [index]);
  const color = PALETTE[index % PALETTE.length];

  useFrame((state) => {
    if (document.hidden || !ref.current) return;
    const t = state.clock.elapsedTime * (0.12 + index * 0.05);
    ref.current.position.set(base.x, base.y + Math.sin(t * 0.6) * 1.4, base.z);
    ref.current.rotation.set(t * 0.25, t * 0.4, t * 0.15);
  });

  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[size, 0]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.16} />
    </mesh>
  );
}

export function Ambient3D() {
  const p = useTheme3D();
  const [off, setOff] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setOff(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setOff(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (off) return null;

  return (
    <div aria-hidden className="ambient3d-layer pointer-events-none fixed inset-0 z-0" style={{ contain: "strict" }}>
      <Canvas
        dpr={[1, 1.5]}
        performance={{ min: 0.4 }}
        camera={{ position: [0, 3, 12], fov: 60 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
      >
        <fog attach="fog" args={[p.background, 10, 30]} />
        <Dust />
        <HazeSolid index={0} size={2.6} />
        <HazeSolid index={1} size={3.4} />
        <HazeSolid index={2} size={2.1} />
      </Canvas>
    </div>
  );
}
