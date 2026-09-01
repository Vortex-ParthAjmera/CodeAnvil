import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import {
  getThreeSumSceneModel,
  type ThreeSumMovement,
  type ThreeSumSceneModel,
  type ThreeSumTokenModel,
} from "../../engine/threeSumStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";
import { CodeLineBadge } from "./CodeLineBadge";
import { HudToggle, useStageHud } from "./StageHud";
import { StageProgressBar } from "./StageProgressBar";

const RIGHT_COLOR = "#60a5fa";
const HIGH_COLOR = "#fb7185";

function gapForCount(count: number): number {
  if (count <= 7) return 0.9;
  return Math.max(0.58, 5.9 / Math.max(1, count - 1));
}

function tileWidthForCount(count: number): number {
  return Math.max(0.38, Math.min(0.62, gapForCount(count) * 0.68));
}

function xForPosition(position: number, count: number): number {
  return (position - (count - 1) / 2) * gapForCount(count);
}

function CameraRig({ stageWidth, reduced }: { stageWidth: number; reduced: boolean }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const target = useRef(new THREE.Vector3(0, 3.75, Math.max(9.2, stageWidth * 0.9 + 3.5)));
  const reframing = useRef(true);

  useLayoutEffect(() => {
    camera.position.copy(target.current);
    camera.lookAt(0, 0.28, 0);
  }, [camera]);

  useEffect(() => {
    target.current.set(0, 3.75, Math.max(9.2, stageWidth * 0.9 + 3.5));
    reframing.current = true;
  }, [stageWidth]);

  useFrame((_, delta) => {
    if (!reframing.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.0008, delta);
    camera.position.lerp(target.current, amount);
    camera.lookAt(0, 0.28, 0);
    if (camera.position.distanceTo(target.current) < 0.012) {
      camera.position.copy(target.current);
      reframing.current = false;
    }
  });

  return null;
}

function roleColor(role: ThreeSumTokenModel["role"], p: Theme3DPalette): string {
  if (role === "found") return p.verdant;
  if (role === "duplicate") return p.found;
  if (role === "anchor") return p.emberBright;
  if (role === "left") return p.arcBright;
  if (role === "right") return RIGHT_COLOR;
  if (role === "processed") return p.barRange;
  return p.barDefault;
}

function RailSlot({ index, count, p }: { index: number; count: number; p: Theme3DPalette }) {
  const x = xForPosition(index, count);
  const width = tileWidthForCount(count);
  return (
    <group position={[x, -1.05, -0.02]}>
      <mesh receiveShadow>
        <boxGeometry args={[width + 0.08, 0.14, 0.78]} />
        <meshStandardMaterial color={p.emptyCell} emissive={p.gridSection} emissiveIntensity={0.05} metalness={0.42} roughness={0.4} />
        <Edges color={p.gridSection} threshold={18} />
      </mesh>
      <Html position={[0, -0.22, 0.38]} center style={{ pointerEvents: "none" }}>
        <div className="rounded border border-ink-700/65 bg-ink-950/92 px-1.5 py-0.5 font-mono text-[7px] font-black leading-none text-ink-400 shadow-lg">
          i={index}
        </div>
      </Html>
    </group>
  );
}

function ValueToken({
  token,
  count,
  p,
  reduced,
}: {
  token: ThreeSumTokenModel;
  count: number;
  p: Theme3DPalette;
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const targetX = xForPosition(token.position, count);
  const previousTarget = useRef(targetX);
  const travelFrom = useRef(targetX);
  const travel = useRef(1);
  const width = tileWidthForCount(count);
  const color = roleColor(token.role, p);
  const targetColor = useMemo(() => new THREE.Color(color), [color]);
  const lifted = token.role === "found" || token.role === "anchor" || token.role === "left" || token.role === "right";
  const targetY = -0.84 + (token.role === "found" ? 0.26 : lifted ? 0.12 : 0);

  useLayoutEffect(() => {
    if (group.current) group.current.position.set(targetX, targetY, 0.08);
  }, []);

  useEffect(() => {
    if (Math.abs(previousTarget.current - targetX) < 0.001) return;
    travelFrom.current = group.current?.position.x ?? previousTarget.current;
    previousTarget.current = targetX;
    travel.current = reduced ? 1 : 0;
  }, [targetX, reduced]);

  useFrame(({ clock }, delta) => {
    if (!group.current || !body.current || !material.current) return;
    if (travel.current < 1) {
      travel.current = Math.min(1, travel.current + delta * 1.25);
      const t = travel.current;
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      group.current.position.x = THREE.MathUtils.lerp(travelFrom.current, targetX, eased);
      group.current.position.y = targetY + Math.sin(Math.PI * eased) * 0.72;
      group.current.rotation.z = Math.sin(Math.PI * eased) * 0.12 * Math.sign(targetX - travelFrom.current);
    } else {
      const amount = reduced ? 1 : 1 - Math.pow(0.00065, delta);
      const pulse = !reduced && token.role === "found" ? Math.sin(clock.elapsedTime * 3.2) * 0.035 : 0;
      group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetX, amount);
      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, targetY + pulse, amount);
      group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, 0, amount);
    }

    const targetScale = token.role === "found" ? 1.12 : lifted ? 1.06 : token.role === "processed" ? 0.94 : 1;
    body.current.scale.setScalar(THREE.MathUtils.lerp(body.current.scale.x, targetScale, reduced ? 1 : 1 - Math.pow(0.0007, delta)));
    material.current.color.lerp(targetColor, reduced ? 1 : 1 - Math.pow(0.0007, delta));
    material.current.emissive.lerp(targetColor, reduced ? 1 : 1 - Math.pow(0.0007, delta));
    material.current.emissiveIntensity = THREE.MathUtils.lerp(
      material.current.emissiveIntensity,
      token.role === "found" ? 0.88 : lifted ? 0.58 : token.role === "duplicate" ? 0.62 : token.role === "processed" ? 0.04 : 0.09,
      reduced ? 1 : 1 - Math.pow(0.0007, delta),
    );
  });

  return (
    <group ref={group} position={[targetX, targetY, 0.08]}>
      <mesh ref={body} castShadow receiveShadow>
        <boxGeometry args={[width, 0.38, 0.7]} />
        <meshStandardMaterial
          ref={material}
          color={color}
          emissive={color}
          emissiveIntensity={lifted ? 0.58 : 0.09}
          metalness={0.5}
          roughness={0.28}
        />
        <Edges color={lifted || token.role === "duplicate" ? p.textStrong : color} threshold={18} />
      </mesh>
      <Html position={[0, 0.04, 0.42]} center style={{ pointerEvents: "none" }}>
        <div
          data-three-sum-token={token.id}
          className="stage-value-card"
          style={{ borderColor: color }}
        >
          {token.value}
        </div>
      </Html>
      {token.role === "duplicate" ? (
        <Html position={[0, 0.42, 0.18]} center style={{ pointerEvents: "none" }}>
          <div className="rounded border border-pink-400/55 bg-ink-950/94 px-1.5 py-0.5 font-mono text-[7px] font-black uppercase text-pink-200 shadow-xl">
            skip
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function PointerCarriage({
  index,
  count,
  label,
  color,
  height,
  p,
  reduced,
}: {
  index: number;
  count: number;
  label: string;
  color: string;
  height: number;
  p: Theme3DPalette;
  reduced: boolean;
}) {
  const carriage = useRef<THREE.Group>(null);
  const targetX = index >= 0 ? xForPosition(index, count) : 0;

  useLayoutEffect(() => {
    if (carriage.current) carriage.current.position.x = targetX;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!carriage.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00045, delta);
    carriage.current.position.x = THREE.MathUtils.lerp(carriage.current.position.x, targetX, amount);
    carriage.current.position.y = !reduced ? Math.sin(clock.elapsedTime * 2.8 + height) * 0.018 : 0;
  });

  return (
    <group ref={carriage} position={[targetX, 0, 0]} visible={index >= 0}>
      <mesh position={[0, -0.31 + height / 2, 0.02]}>
        <cylinderGeometry args={[0.018, 0.045, height, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.78} />
      </mesh>
      <mesh position={[0, height - 0.29, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.15, 0.03, 14, 44]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
      </mesh>
      <Html position={[0, height - 0.03, 0.12]} center style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded border bg-ink-950/94 px-2 py-1 font-mono text-[8px] font-black uppercase shadow-xl" style={{ borderColor: color, color: p.textStrong }}>
          {label} = {index}
        </div>
      </Html>
    </group>
  );
}

function sumColor(model: ThreeSumSceneModel, p: Theme3DPalette): string {
  if (model.operation === "found" || model.operation === "compare-equal" || model.operation === "complete") return p.verdant;
  if (model.operation === "compare-high" || model.operation === "move-right") return HIGH_COLOR;
  if (model.operation === "skip-anchor" || model.operation === "skip-left" || model.operation === "skip-right") return p.found;
  if (model.operation === "fix-anchor" || model.operation === "sort") return p.emberBright;
  return p.arcBright;
}

function SumReactor({ model, p, reduced }: { model: ThreeSumSceneModel; p: Theme3DPalette; reduced: boolean }) {
  const ring = useRef<THREE.Group>(null);
  const color = sumColor(model, p);
  const hasPointers = model.anchorIndex >= 0 && model.leftIndex >= 0 && model.rightIndex >= 0;
  const indices = hasPointers ? [model.anchorIndex, model.leftIndex, model.rightIndex] : [];
  const pointsFor = (index: number) => Array.from({ length: 30 }, (_, pointIndex) => {
    const t = pointIndex / 29;
    return new THREE.Vector3(
      THREE.MathUtils.lerp(xForPosition(index, model.tokens.length), 0, t),
      THREE.MathUtils.lerp(-0.54, 0.74, t) + Math.sin(Math.PI * t) * 0.18,
      0.12 + Math.sin(Math.PI * t) * 0.08,
    );
  });

  useFrame(({ clock }, delta) => {
    if (!ring.current) return;
    ring.current.rotation.z += reduced ? 0 : delta * 0.28;
    ring.current.scale.setScalar(reduced ? 1 : 1 + Math.sin(clock.elapsedTime * 2.4) * 0.025);
  });

  const relation = model.total === null
    ? model.target
    : model.total === model.target
      ? `${model.total} = ${model.target}`
      : model.total < model.target
        ? `${model.total} < ${model.target}`
        : `${model.total} > ${model.target}`;

  return (
    <group>
      {indices.map((index) => (
        <Line key={index} points={pointsFor(index)} color={color} lineWidth={model.foundIndices?.includes(index) ? 2.8 : 1.6} transparent opacity={0.72} />
      ))}
      <group position={[0, 0.78, 0.06]}>
        <group ref={ring}>
          <mesh>
            <torusGeometry args={[0.45, 0.045, 18, 72]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.15} metalness={0.58} roughness={0.2} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.58, 0.016, 12, 64]} />
            <meshBasicMaterial color={color} transparent opacity={0.46} />
          </mesh>
        </group>
        <mesh>
          <sphereGeometry args={[0.09, 20, 20]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
        </mesh>
        <Html position={[0, 0, 0.2]} center style={{ pointerEvents: "none" }}>
          <div className="min-w-14 whitespace-nowrap rounded border bg-ink-950/96 px-2 py-1 text-center font-mono text-[10px] font-black shadow-xl" style={{ borderColor: color, color }}>
            {relation}
          </div>
        </Html>
        <Html position={[0, -0.74, 0.12]} center style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded border border-ink-700/70 bg-ink-950/92 px-2 py-1 font-mono text-[7px] font-black uppercase tracking-widest text-ink-300 shadow-xl">
            {model.directionLabel}
          </div>
        </Html>
      </group>
    </group>
  );
}

function PointerArc({
  from,
  to,
  count,
  color,
  reduced,
}: {
  from: number;
  to: number;
  count: number;
  color: string;
  reduced: boolean;
}) {
  const pulse = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(xForPosition(from, count), -0.4, 0.25),
    new THREE.Vector3((xForPosition(from, count) + xForPosition(to, count)) / 2, 0.04, 0.3),
    new THREE.Vector3(xForPosition(to, count), -0.4, 0.25),
  ]), [from, to, count]);

  useFrame(({ clock }) => {
    if (!pulse.current) return;
    const t = reduced ? 0.78 : (clock.elapsedTime * 0.42) % 1;
    pulse.current.position.copy(curve.getPointAt(t));
  });

  return (
    <group>
      <Line points={curve.getPoints(44)} color={color} lineWidth={2.4} transparent opacity={0.86} />
      <mesh ref={pulse}>
        <sphereGeometry args={[0.065, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.45} />
      </mesh>
    </group>
  );
}

function MovementPaths({
  movement,
  count,
  p,
  reduced,
}: {
  movement: ThreeSumMovement | null;
  count: number;
  p: Theme3DPalette;
  reduced: boolean;
}) {
  if (!movement) return null;
  return (
    <group>
      {movement.pointer === "left" || movement.pointer === "both" ? (
        <PointerArc from={movement.from[0]} to={movement.to[0]} count={count} color={p.arcBright} reduced={reduced} />
      ) : null}
      {movement.pointer === "right" || movement.pointer === "both" ? (
        <PointerArc from={movement.from[1]} to={movement.to[1]} count={count} color={RIGHT_COLOR} reduced={reduced} />
      ) : null}
    </group>
  );
}

function DuplicateBridge({ model, p }: { model: ThreeSumSceneModel; p: Theme3DPalette }) {
  if (model.skippedIndex === null) return null;
  const compareIndex = model.operation === "skip-right" ? model.skippedIndex + 1 : model.skippedIndex - 1;
  if (compareIndex < 0 || compareIndex >= model.tokens.length) return null;
  const fromX = xForPosition(compareIndex, model.tokens.length);
  const toX = xForPosition(model.skippedIndex, model.tokens.length);
  const points = Array.from({ length: 28 }, (_, pointIndex) => {
    const t = pointIndex / 27;
    return new THREE.Vector3(
      THREE.MathUtils.lerp(fromX, toX, t),
      -0.25 + Math.sin(Math.PI * t) * 0.32,
      0.3,
    );
  });
  return (
    <group>
      <Line points={points} color={p.found} lineWidth={2.2} transparent opacity={0.88} />
    </group>
  );
}

function SolutionCard({
  triplet,
  index,
  count,
  active,
  p,
  reduced,
}: {
  triplet: number[];
  index: number;
  count: number;
  active: boolean;
  p: Theme3DPalette;
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const birth = useRef(reduced ? 1 : 0);
  const gap = count <= 2 ? 1.65 : 1.42;
  const targetX = (index - (count - 1) / 2) * gap;

  useLayoutEffect(() => {
    if (!group.current) return;
    if (reduced) {
      group.current.position.set(targetX, 2.12, 0.02);
      return;
    }
    group.current.position.set(0, 0.88, 0.26);
    group.current.scale.setScalar(0.92);
  }, []);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    if (birth.current < 1) {
      birth.current = Math.min(1, birth.current + delta * 1.35);
      const t = 1 - Math.pow(1 - birth.current, 3);
      group.current.position.x = THREE.MathUtils.lerp(0, targetX, t);
      group.current.position.y = THREE.MathUtils.lerp(0.88, 2.12, t) + Math.sin(Math.PI * t) * 0.22;
      group.current.position.z = THREE.MathUtils.lerp(0.26, 0.02, t);
      group.current.scale.setScalar(THREE.MathUtils.lerp(0.92, 1, t));
    } else {
      const amount = reduced ? 1 : 1 - Math.pow(0.0007, delta);
      group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetX, amount);
      group.current.position.y = THREE.MathUtils.lerp(
        group.current.position.y,
        2.12 + (!reduced && active ? Math.sin(clock.elapsedTime * 3.1) * 0.025 : 0),
        amount,
      );
      group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, active ? 1.06 : 1, amount));
    }
  });

  return (
    <group ref={group} position={[targetX, 2.12, 0.02]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.42, 0.44, 0.72]} />
        <meshStandardMaterial color={p.verdantDeep} emissive={p.verdant} emissiveIntensity={active ? 0.7 : 0.32} metalness={0.48} roughness={0.3} />
        <Edges color={active ? p.textStrong : p.verdant} threshold={18} />
      </mesh>
      <Html position={[0, 0.03, 0.43]} center style={{ pointerEvents: "none" }}>
        <div
          data-three-sum-solution={index}
          className="whitespace-nowrap rounded border border-verdant-400/55 bg-ink-950/96 px-2.5 py-1.5 text-center font-mono text-[10px] font-black text-verdant-100 shadow-xl"
        >
          [{triplet.join(", ")}]
        </div>
      </Html>
    </group>
  );
}

function SolutionShelf({ model, stageWidth, p, reduced }: { model: ThreeSumSceneModel; stageWidth: number; p: Theme3DPalette; reduced: boolean }) {
  const visibleSolutions = model.solutions.slice(-4);
  const hiddenCount = Math.max(0, model.solutions.length - visibleSolutions.length);
  const latestIndex = visibleSolutions.length - 1;
  return (
    <group>
      <mesh position={[0, 1.82, -0.08]} receiveShadow>
        <boxGeometry args={[Math.min(stageWidth, 6.6), 0.12, 1.08]} />
        <meshStandardMaterial color={p.emptyCell} emissive={p.verdant} emissiveIntensity={0.08} metalness={0.45} roughness={0.38} />
        <Edges color={p.gridSection} threshold={18} />
      </mesh>
      {visibleSolutions.map((triplet, index) => (
        <SolutionCard
          key={triplet.join(":")}
          triplet={triplet}
          index={index}
          count={visibleSolutions.length}
          active={model.operation === "found" && index === latestIndex}
          p={p}
          reduced={reduced}
        />
      ))}
      <Html position={[-Math.min(stageWidth, 6.6) / 2 + 0.5, 1.54, 0.24]} center style={{ pointerEvents: "none" }}>
        <div className="three-sum-shelf-label-full whitespace-nowrap rounded border border-verdant-400/35 bg-ink-950/92 px-2 py-1 font-mono text-[7px] font-black uppercase tracking-widest text-verdant-200 shadow-xl">
          unique triplets
        </div>
      </Html>
      {model.solutions.length === 0 ? (
        <Html position={[0, 2.08, 0.18]} center style={{ pointerEvents: "none" }}>
          <div className="three-sum-empty-shelf-label rounded border border-ink-700/65 bg-ink-950/90 px-2.5 py-1 font-mono text-[8px] font-bold text-ink-500 shadow-lg">
            solutions appear here
          </div>
        </Html>
      ) : null}
      {hiddenCount > 0 ? (
        <Html position={[Math.min(stageWidth, 6.6) / 2 - 0.38, 1.55, 0.2]} center style={{ pointerEvents: "none" }}>
          <div className="rounded border border-verdant-400/35 bg-ink-950/92 px-1.5 py-1 font-mono text-[8px] font-black text-verdant-200 shadow-xl">
            +{hiddenCount}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function RailLabel({ model, stageWidth, p }: { model: ThreeSumSceneModel; stageWidth: number; p: Theme3DPalette }) {
  const x = -stageWidth / 2 + 0.48;
  const style = { borderColor: model.sortedReady ? p.emberBright : p.gridSection, color: model.sortedReady ? p.emberBright : p.textDim };
  return (
    <>
      <Html position={[x, -1.46, 0.2]} center style={{ pointerEvents: "none" }}>
        <div className="three-sum-rail-label-full whitespace-nowrap rounded border bg-ink-950/92 px-2 py-1 font-mono text-[7px] font-black uppercase tracking-widest shadow-xl" style={style}>
          {model.sortedReady ? "sorted rail" : "input order"}
        </div>
      </Html>
      <Html position={[0, -1.46, 0.2]} center style={{ pointerEvents: "none" }}>
        <div className="three-sum-rail-label-compact whitespace-nowrap rounded border bg-ink-950/92 px-2 py-1 font-mono text-[7px] font-black uppercase tracking-widest shadow-xl" style={style}>
          {model.sortedReady ? "sorted" : "input"}
        </div>
      </Html>
    </>
  );
}

function Scene({ model, p, reduced }: { model: ThreeSumSceneModel; p: Theme3DPalette; reduced: boolean }) {
  const count = model.tokens.length;
  const stageWidth = Math.max(6.3, (count - 1) * gapForCount(count) + 1.65);

  return (
    <>
      <CameraRig stageWidth={stageWidth} reduced={reduced} />
      <fog attach="fog" args={[p.background, 12, 25]} />
      <ambientLight intensity={0.7 * p.lighting.ambient} />
      <directionalLight castShadow position={[4.5, 7.5, 5]} intensity={1.38 * p.lighting.directional} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-3.5, 1.8, 3]} intensity={27 * p.lighting.accent} distance={11} color={p.arcBright} />
      <pointLight position={[3.5, 1.6, 2.8]} intensity={24 * p.lighting.accent} distance={10} color={RIGHT_COLOR} />
      <pointLight position={[0, 3.2, 2.7]} intensity={27 * p.lighting.accent} distance={10} color={p.verdant} />

      <group>
        <mesh position={[0, -1.18, -0.12]} receiveShadow>
          <boxGeometry args={[stageWidth + 0.25, 0.16, 1.42]} />
          <meshStandardMaterial color={p.emptyCell} metalness={0.4} roughness={0.46} />
          <Edges color={p.gridSection} threshold={18} />
        </mesh>
        {Array.from({ length: count }, (_, index) => (
          <RailSlot key={index} index={index} count={count} p={p} />
        ))}
        {model.tokens.map((token) => (
          <ValueToken key={token.id} token={token} count={count} p={p} reduced={reduced} />
        ))}

        <PointerCarriage index={model.anchorIndex} count={count} label="i" color={p.emberBright} height={0.98} p={p} reduced={reduced} />
        <PointerCarriage index={model.leftIndex} count={count} label="L" color={p.arcBright} height={0.72} p={p} reduced={reduced} />
        <PointerCarriage index={model.rightIndex} count={count} label="R" color={RIGHT_COLOR} height={0.72} p={p} reduced={reduced} />
        <SumReactor model={model} p={p} reduced={reduced} />
        <MovementPaths movement={model.movement} count={count} p={p} reduced={reduced} />
        <DuplicateBridge model={model} p={p} />
        <SolutionShelf model={model} stageWidth={stageWidth} p={p} reduced={reduced} />
        <RailLabel model={model} stageWidth={stageWidth} p={p} />
      </group>

      <InfiniteGrid
        position={[0, -1.62, -0.22]}
        cellSize={0.48}
        cellThickness={0.5}
        cellColor={p.gridCell}
        sectionSize={2.4}
        sectionThickness={0.88}
        sectionColor={p.gridSection}
        fadeDistance={22}
        fadeStrength={1}
        infiniteGrid
      />
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={6.8}
        maxDistance={18}
        minPolarAngle={0.38}
        maxPolarAngle={Math.PI / 2.04}
      />
    </>
  );
}

function Overlay({ model }: { model: ThreeSumSceneModel }) {
  const tone = model.operation === "found" || model.operation === "compare-equal" || model.operation === "complete"
    ? "border-verdant-400/45 text-verdant-100"
    : model.operation === "compare-high" || model.operation === "move-right"
      ? "border-red-400/45 text-red-500"
      : model.operation.startsWith("skip")
        ? "border-pink-400/45 text-pink-500"
        : model.operation === "sort" || model.operation === "fix-anchor"
          ? "border-ember-400/45 text-ember-100"
          : "border-arc-400/45 text-arc-100";

  return (
    <>
      <div className="pointer-events-none absolute left-2 top-2 z-10 max-w-[13rem] rounded-md border border-arc-400/30 bg-ink-950/88 px-2.5 py-1.5 shadow-xl backdrop-blur-md sm:left-3 sm:top-3 sm:max-w-[18rem]">
        <div className="flex items-center gap-1.5">
          <span className={`rounded border bg-ink-900/70 px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-widest ${tone}`}>
            three sum / {model.operation}
          </span>
          <span className="font-mono text-[8px] font-semibold uppercase tracking-wider text-ink-500">O(n^2)</span>
        </div>
        <p data-testid="three-sum-headline" className="mt-1 text-xs font-black leading-tight text-ink-50 sm:text-[13px]">
          {model.headline}
        </p>
      </div>

      <div className="stage-hud-secondary three-sum-equation pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 items-center rounded-md border border-ink-700/70 bg-ink-950/90 px-3 py-2 shadow-xl backdrop-blur-md">
        <span className="max-w-72 truncate font-mono text-[11px] font-black tabular-nums text-ink-50">
          {model.equation ?? "anchor + left + right"}
        </span>
      </div>

      <div className="stage-hud-secondary pointer-events-none absolute right-11 top-3 z-10 justify-end gap-1">
        {[
          ["target", model.target],
          ["i", model.anchorIndex < 0 ? "-" : model.anchorIndex],
          ["L", model.leftIndex < 0 ? "-" : model.leftIndex],
          ["R", model.rightIndex < 0 ? "-" : model.rightIndex],
          ["found", model.resultLabel],
        ].map(([label, value]) => (
          <div key={label} className="min-w-10 rounded border border-ink-700/65 bg-ink-950/86 px-1.5 py-1 text-center shadow-lg backdrop-blur-md">
            <span className="block font-mono text-[7px] font-black uppercase tracking-widest text-ink-500">{label}</span>
            <span className="block max-w-[4.5rem] truncate font-mono text-[10px] font-black leading-tight text-ink-50">{value}</span>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 z-10 flex items-end justify-between gap-2 sm:left-4 sm:right-4">
        <p data-testid="three-sum-detail" className="max-w-[34rem] rounded-md border border-arc-400/25 bg-ink-950/88 px-2.5 py-1.5 text-[11px] leading-snug text-ink-200 shadow-xl backdrop-blur-md">
          {model.detail}
        </p>
        <div className="stage-hud-legend ml-auto flex-wrap justify-end gap-1">
          <span className="rounded border border-ember-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-ember-200 backdrop-blur">orange anchor</span>
          <span className="rounded border border-arc-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-arc-200 backdrop-blur">cyan L</span>
          <span className="rounded border border-blue-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-blue-200 backdrop-blur">blue R</span>
          <span className="rounded border border-verdant-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-verdant-200 backdrop-blur">green triplet</span>
        </div>
      </div>
    </>
  );
}

export function ThreeSumStage3D({ step, steps }: { step: TraceStep; steps?: TraceStep[] }) {
  const model = getThreeSumSceneModel(step);
  const p = useTheme3D();
  const reduced = Boolean(useReducedMotion());
  const hud = useStageHud();

  if (!model) return null;

  return (
    <div className="codeanvil-canvas-fill codeanvil-stage-frame relative h-full w-full overflow-hidden rounded-md @container">
      <Canvas
        shadows="basic"
        dpr={[1.25, 2]}
        data-testid="three-sum-stage-canvas"
        camera={{ position: [0, 3.75, 9.2], fov: 43 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <CanvasSizeSync />
        <Scene model={model} p={p} reduced={reduced} />
      </Canvas>
      <HudToggle open={hud.hudOpen} onToggle={hud.toggleHud} />
      {hud.hudOpen ? <Overlay model={model} /> : null}
      <div className="three-sum-line-badge">
        <CodeLineBadge step={step} />
      </div>
      <StageProgressBar step={step} steps={steps} />
    </div>
  );
}
