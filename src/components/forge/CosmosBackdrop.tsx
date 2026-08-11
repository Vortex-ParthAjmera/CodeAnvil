import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Grid, Sparkles, Stars } from "@react-three/drei";
import * as THREE from "three";
import { Anvil, CodeLines, Cosmos, FloatingChips, OrbitRings } from "./ForgeScene";
import { useTheme3D } from "../../lib/theme3d";

/**
 * CosmosBackdrop — the landing page's full-bleed 3D world.
 *
 * One fixed canvas behind the ENTIRE page (not just the hero). As you scroll,
 * the camera travels forward through the forge cosmos: stars stream past, the
 * anvil recedes, and the rings pick up speed — so every section sits inside
 * the same living 3D scene. Rendering pauses when the tab is hidden.
 */

function scrollProgress(): number {
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  return Math.min(1, Math.max(0, window.scrollY / max));
}

/**
 * Drives the camera along a path through the scene based on scroll.
 * The forge is parked right-of-center in world space (x = 4.4); the camera
 * glides sideways past it without ever diving into it, so the forge stays
 * small and off to the right — clear of every copy column on the page.
 */
function TravelRig() {
  const target = useRef({ x: 0, y: 0, z: 15, lookX: 0, lookY: 1.1 });
  useFrame((state) => {
    if (document.hidden) return;
    const p = scrollProgress();
    const t = state.clock.elapsedTime;
    // Glide right + sink slightly; distance to the forge barely changes so it
    // never looms over the copy. Stars/grid/rings sell the sense of travel.
    target.current.x = 1.4 + p * 6 + Math.sin(t * 0.05) * 0.5;
    target.current.y = 3.6 - p * 0.9 + Math.sin(t * 0.09) * 0.25;
    target.current.z = 15 - p * 1.6;
    target.current.lookX = 0 + p * 3.4;
    target.current.lookY = 1.1 - p * 0.15;
    const k = 0.06;
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, target.current.x, k);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, target.current.y, k);
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, target.current.z, k);
    state.camera.lookAt(target.current.lookX, target.current.lookY, 0);
  });
  return null;
}

/** The forge drifts back and right, shrinking gently as you scroll. */
function ForgeRig({ scale }: { scale: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (document.hidden || !group.current) return;
    const p = scrollProgress();
    group.current.position.set(4.4, 1, -p * 7);
    group.current.scale.setScalar((1.05 - p * 0.5) * scale);
    group.current.rotation.y = p * 0.7;
  });
  return (
    <group ref={group}>
      <Anvil />
      <OrbitRings />
      <CodeLines />
      <FloatingChips />
    </group>
  );
}

export function CosmosBackdrop({ scale = 1 }: { scale?: number }) {
  const p = useTheme3D();
  return (
    <div aria-hidden className="absolute inset-0" style={{ contain: "strict" }}>
      <Canvas
        dpr={[1, 1.6]}
        performance={{ min: 0.4 }}
        camera={{ position: [1.6, 3.6, 15], fov: 48 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <fog attach="fog" args={[p.background, 8, 26]} />
        <ambientLight intensity={0.6 * p.lighting.ambient} />
        <directionalLight position={[6, 9, 5]} intensity={1.6 * p.lighting.directional} />
        <pointLight position={[0, 2.6, 1.6]} intensity={60 * p.lighting.accent} distance={14} color={p.ember} />

        <Stars radius={70} depth={55} count={2600} factor={3.4} saturation={0.7} fade speed={0.9} />
        <Cosmos />
        <Sparkles
          count={140}
          scale={[50, 26, 34]}
          position={[0, 4, -2]}
          size={2.1}
          speed={0.4}
          color={p.arc}
          opacity={0.5}
        />

        <Grid
          position={[0, 0, 0]}
          args={[16, 16]}
          cellSize={1}
          cellThickness={0.5}
          cellColor={p.gridCell}
          sectionSize={5}
          sectionThickness={1.1}
          sectionColor={p.ember}
          fadeDistance={26}
          fadeStrength={2}
          infiniteGrid
        />

        <ForgeRig scale={scale} />
        <TravelRig />
      </Canvas>
    </div>
  );
}
