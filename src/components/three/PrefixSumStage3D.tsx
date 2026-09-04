import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import {
  getPrefixSumSceneModel,
  type PrefixCheckpointModel,
  type PrefixInputTokenModel,
  type PrefixSumSceneModel,
} from "../../engine/prefixSumStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";
import { CodeLineBadge } from "./CodeLineBadge";
import { HudToggle, useStageHud } from "./StageHud";
import { StageProgressBar } from "./StageProgressBar";

const PREFIX_COLOR = "#22d3ee";
const READ_COLOR = "#fb923c";
const WRITE_COLOR = "#34d399";
const SUBTRACT_COLOR = "#fb7185";
const QUERY_COLOR = "#a78bfa";
const INVALID_COLOR = "#f43f5e";

function gapForCount(count: number): number {
  if (count <= 7) return 0.88;
  return Math.max(0.49, 6.05 / Math.max(1, count - 1));
}

function tileWidthForCount(count: number): number {
  return Math.max(0.33, Math.min(0.58, gapForCount(count) * 0.68));
}

function inputX(index: number, count: number): number {
  return (index - (count - 1) / 2) * gapForCount(count);
}

function prefixX(index: number, inputCount: number): number {
  return inputX(0, inputCount) - gapForCount(inputCount) / 2 + index * gapForCount(inputCount);
}

function CameraRig({ stageWidth, reduced }: { stageWidth: number; reduced: boolean }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const target = useRef(new THREE.Vector3(0, 4.15, Math.max(10.2, stageWidth * 0.98 + 3.55)));
  const reframing = useRef(true);

  useLayoutEffect(() => {
    camera.position.copy(target.current);
    camera.lookAt(0, 0.02, 0);
  }, [camera]);

  useEffect(() => {
    target.current.set(0, 4.15, Math.max(10.2, stageWidth * 0.98 + 3.55));
    reframing.current = true;
  }, [stageWidth]);

  useFrame((_, delta) => {
    if (!reframing.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.0008, delta);
    camera.position.lerp(target.current, amount);
    camera.lookAt(0, 0.02, 0);
    if (camera.position.distanceTo(target.current) < 0.012) {
      camera.position.copy(target.current);
      camera.lookAt(0, 0.02, 0);
      reframing.current = false;
    }
  });
  return null;
}

function inputRoleColor(role: PrefixInputTokenModel["role"], p: Theme3DPalette): string {
  if (role === "invalid") return INVALID_COLOR;
  if (role === "reading") return READ_COLOR;
  if (role === "query") return QUERY_COLOR;
  if (role === "processed") return p.barRange;
  return p.barDefault;
}

function checkpointRoleColor(role: PrefixCheckpointModel["role"], p: Theme3DPalette): string {
  if (role === "invalid") return INVALID_COLOR;
  if (role === "query-left") return SUBTRACT_COLOR;
  if (role === "query-right") return WRITE_COLOR;
  if (role === "writing") return WRITE_COLOR;
  if (role === "source") return READ_COLOR;
  if (role === "seed") return QUERY_COLOR;
  if (role === "built") return PREFIX_COLOR;
  return p.emptyCell;
}

function RailBase({ width, y, z, p }: { width: number; y: number; z: number; p: Theme3DPalette }) {
  return (
    <mesh position={[0, y, z]} receiveShadow>
      <boxGeometry args={[width, 0.14, 1.08]} />
      <meshStandardMaterial color={p.emptyCell} emissive={p.gridSection} emissiveIntensity={0.04} metalness={0.42} roughness={0.43} />
      <Edges color={p.gridSection} threshold={18} />
    </mesh>
  );
}

function InputToken({ token, count, p, reduced }: { token: PrefixInputTokenModel; count: number; p: Theme3DPalette; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const color = inputRoleColor(token.role, p);
  const targetColor = useMemo(() => new THREE.Color(color), [color]);
  const active = token.role === "reading" || token.role === "query";
  const targetY = -0.78 + (active ? 0.13 : 0);

  useLayoutEffect(() => {
    group.current?.position.set(inputX(token.index, count), targetY, 0.3);
  }, []);

  useFrame(({ clock }, delta) => {
    if (!group.current || !body.current || !material.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00065, delta);
    const pulse = !reduced && token.role === "reading" ? Math.sin(clock.elapsedTime * 3.8) * 0.035 : 0;
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, targetY + pulse, amount);
    const scale = token.role === "reading" ? 1.14 : token.role === "query" ? 1.07 : 1;
    body.current.scale.setScalar(THREE.MathUtils.lerp(body.current.scale.x, scale, amount));
    material.current.color.lerp(targetColor, amount);
    material.current.emissive.lerp(targetColor, amount);
    material.current.emissiveIntensity = THREE.MathUtils.lerp(material.current.emissiveIntensity, active ? 0.58 : 0.08, amount);
  });

  return (
    <group ref={group} position={[inputX(token.index, count), targetY, 0.3]}>
      <mesh ref={body} castShadow receiveShadow>
        <boxGeometry args={[tileWidthForCount(count), 0.44, 0.66]} />
        <meshStandardMaterial ref={material} color={color} emissive={color} emissiveIntensity={active ? 0.58 : 0.08} metalness={0.47} roughness={0.28} />
        <Edges color={active ? p.textStrong : color} threshold={18} />
      </mesh>
      <Html position={[0, 0.03, 0.39]} center style={{ pointerEvents: "none" }}>
        <div data-prefix-input-token={token.id} className="stage-value-card" style={{ borderColor: color }}>{token.value}</div>
      </Html>
      <Html position={[0, -0.34, 0.34]} center style={{ pointerEvents: "none" }}>
        <div className="rounded border border-ink-700/65 bg-ink-950/92 px-1.5 py-0.5 font-mono text-[7px] font-black leading-none text-ink-400">i={token.index}</div>
      </Html>
    </group>
  );
}

function CheckpointToken({ token, inputCount, p, reduced }: { token: PrefixCheckpointModel; inputCount: number; p: Theme3DPalette; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const color = checkpointRoleColor(token.role, p);
  const targetColor = useMemo(() => new THREE.Color(color), [color]);
  const active = token.role === "source" || token.role === "writing" || token.role === "query-left" || token.role === "query-right";
  const targetY = 0.15 + (active ? 0.14 : 0);

  useLayoutEffect(() => {
    group.current?.position.set(prefixX(token.index, inputCount), targetY, -0.12);
  }, []);

  useFrame(({ clock }, delta) => {
    if (!group.current || !body.current || !material.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00065, delta);
    const pulse = !reduced && active ? Math.sin(clock.elapsedTime * 3.4 + token.index * 0.25) * 0.025 : 0;
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, targetY + pulse, amount);
    const scale = token.role === "writing" ? 1.16 : active ? 1.08 : 1;
    body.current.scale.setScalar(THREE.MathUtils.lerp(body.current.scale.x, scale, amount));
    material.current.color.lerp(targetColor, amount);
    material.current.emissive.lerp(targetColor, amount);
    material.current.opacity = THREE.MathUtils.lerp(material.current.opacity, token.value === null ? 0.22 : 0.92, amount);
    material.current.emissiveIntensity = THREE.MathUtils.lerp(material.current.emissiveIntensity, active ? 0.72 : token.value === null ? 0.03 : 0.28, amount);
  });

  return (
    <group ref={group} position={[prefixX(token.index, inputCount), targetY, -0.12]}>
      <mesh ref={body} castShadow receiveShadow rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[tileWidthForCount(inputCount) * 0.45, tileWidthForCount(inputCount) * 0.55, 0.48, 4]} />
        <meshStandardMaterial ref={material} color={color} emissive={color} emissiveIntensity={active ? 0.72 : 0.28} transparent opacity={token.value === null ? 0.22 : 0.92} metalness={0.5} roughness={0.26} />
        <Edges color={active ? p.textStrong : color} threshold={18} />
      </mesh>
      <Html position={[0, 0.02, 0.38]} center style={{ pointerEvents: "none" }}>
        <div data-prefix-checkpoint={token.id} className="stage-value-card" style={{ borderColor: color }}>{token.value ?? "?"}</div>
      </Html>
      <Html position={[0, -0.37, 0.28]} center style={{ pointerEvents: "none" }}>
        <div className="rounded border border-ink-700/65 bg-ink-950/92 px-1.5 py-0.5 font-mono text-[7px] font-black leading-none text-ink-400">p[{token.index}]</div>
      </Html>
      {token.role === "query-left" || token.role === "query-right" ? (
        <Html position={[0, 0.43, 0.3]} center style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded border bg-ink-950/96 px-1.5 py-0.5 font-mono text-[7px] font-black uppercase shadow-xl" style={{ borderColor: color, color }}>
            {token.role === "query-left" ? "subtract" : "total through R"}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function BuiltPath({ model }: { model: PrefixSumSceneModel }) {
  const count = Math.max(1, model.values.length);
  const built = model.prefixTokens.filter((token) => token.value !== null && token.index <= model.builtThrough);
  if (built.length < 2) return null;
  return (
    <Line
      points={built.map((token) => [prefixX(token.index, count), 0.18, -0.18] as [number, number, number])}
      color={PREFIX_COLOR}
      lineWidth={2.2}
      transparent
      opacity={0.58}
    />
  );
}

function QueryFrame({ model, reduced }: { model: PrefixSumSceneModel; reduced: boolean }) {
  const shell = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const count = Math.max(1, model.values.length);
  const leftX = inputX(THREE.MathUtils.clamp(model.queryLeft, 0, count - 1), count);
  const rightX = inputX(THREE.MathUtils.clamp(model.queryRight, 0, count - 1), count);
  const center = (leftX + rightX) / 2;
  const width = Math.max(0.76, rightX - leftX + tileWidthForCount(count) + 0.3);
  const visible = model.operation === "query-range" || model.operation === "subtract" || model.operation === "complete";

  useLayoutEffect(() => {
    if (!shell.current || !material.current) return;
    shell.current.scale.x = width;
    material.current.opacity = visible ? 0.15 : 0;
  }, []);

  useFrame((_, delta) => {
    if (!shell.current || !material.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00038, delta);
    shell.current.scale.x = THREE.MathUtils.lerp(shell.current.scale.x, width, amount);
    material.current.opacity = THREE.MathUtils.lerp(material.current.opacity, visible ? 0.15 : 0, amount);
  });

  return (
    <group position={[center, -0.62, 0.3]}>
      <mesh ref={shell} scale={[1, 1, 1]}>
        <boxGeometry args={[1, 0.92, 0.94]} />
        <meshStandardMaterial ref={material} color={QUERY_COLOR} emissive={QUERY_COLOR} emissiveIntensity={0.42} transparent opacity={visible ? 0.15 : 0} depthWrite={false} metalness={0.34} roughness={0.3} />
        {visible ? <Edges color={QUERY_COLOR} threshold={18} /> : null}
      </mesh>
      {visible ? (
        <Html position={[0, 0.59, 0.42]} center style={{ pointerEvents: "none" }}>
          <div data-testid="prefix-query-range" className="whitespace-nowrap rounded border border-purple-400/55 bg-ink-950/96 px-2 py-1 font-mono text-[8px] font-black uppercase text-purple-200 shadow-xl">query [{model.queryLeft}..{model.queryRight}]</div>
        </Html>
      ) : null}
    </group>
  );
}

function BuildFlow({ model, reduced }: { model: PrefixSumSceneModel; reduced: boolean }) {
  const sourcePulse = useRef<THREE.Mesh>(null);
  const inputPulse = useRef<THREE.Mesh>(null);
  const count = Math.max(1, model.values.length);
  const sourceIndex = model.sourcePrefixIndex;
  const destinationIndex = model.destinationPrefixIndex;
  const inputIndex = model.activeArrayIndex;
  const active = (model.operation === "read" || model.operation === "write")
    && sourceIndex !== null && destinationIndex !== null && inputIndex !== null;
  const sourceCurve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(prefixX(sourceIndex ?? 0, count), 0.4, 0.02),
    new THREE.Vector3((prefixX(sourceIndex ?? 0, count) + prefixX(destinationIndex ?? 1, count)) / 2, 0.9, 0.32),
    new THREE.Vector3(prefixX(destinationIndex ?? 1, count), 0.42, 0.04),
  ]), [count, destinationIndex, sourceIndex]);
  const inputCurve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(inputX(inputIndex ?? 0, count), -0.42, 0.42),
    new THREE.Vector3(inputX(inputIndex ?? 0, count) + 0.18, 0.54, 0.5),
    new THREE.Vector3(prefixX(destinationIndex ?? 1, count), 0.42, 0.08),
  ]), [count, destinationIndex, inputIndex]);

  useFrame(({ clock }) => {
    if (!active) return;
    const t = reduced ? 0.78 : (clock.elapsedTime * 0.46) % 1;
    sourcePulse.current?.position.copy(sourceCurve.getPointAt(t));
    inputPulse.current?.position.copy(inputCurve.getPointAt((t + 0.28) % 1));
  });

  if (!active) return null;
  return (
    <group>
      <Line points={sourceCurve.getPoints(36)} color={PREFIX_COLOR} lineWidth={2.1} transparent opacity={0.72} />
      <Line points={inputCurve.getPoints(36)} color={READ_COLOR} lineWidth={2.1} transparent opacity={0.78} />
      <mesh ref={sourcePulse}><sphereGeometry args={[0.055, 14, 14]} /><meshStandardMaterial color={PREFIX_COLOR} emissive={PREFIX_COLOR} emissiveIntensity={1.5} /></mesh>
      <mesh ref={inputPulse}><sphereGeometry args={[0.06, 14, 14]} /><meshStandardMaterial color={READ_COLOR} emissive={READ_COLOR} emissiveIntensity={1.5} /></mesh>
    </group>
  );
}

function QueryBridge({ model, reduced, compact }: { model: PrefixSumSceneModel; reduced: boolean; compact: boolean }) {
  const leftPulse = useRef<THREE.Mesh>(null);
  const rightPulse = useRef<THREE.Mesh>(null);
  const count = Math.max(1, model.values.length);
  const active = model.operation === "query-range" || model.operation === "subtract" || model.operation === "complete";
  const core = new THREE.Vector3(0, compact ? 1.28 : 1.52, 0.2);
  const leftCurve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(prefixX(model.queryLeft, count), 0.46, 0),
    new THREE.Vector3(prefixX(model.queryLeft, count) * 0.45, 1.15, 0.42),
    core,
  ]), [compact, count, model.queryLeft]);
  const rightCurve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(prefixX(model.queryRight + 1, count), 0.46, 0),
    new THREE.Vector3(prefixX(model.queryRight + 1, count) * 0.45, 1.15, 0.42),
    core,
  ]), [compact, count, model.queryRight]);

  useFrame(({ clock }) => {
    if (!active) return;
    const t = reduced ? 0.82 : (clock.elapsedTime * 0.4) % 1;
    leftPulse.current?.position.copy(leftCurve.getPointAt(t));
    rightPulse.current?.position.copy(rightCurve.getPointAt((t + 0.22) % 1));
  });

  if (!active) return null;
  return (
    <group>
      <Line points={leftCurve.getPoints(42)} color={SUBTRACT_COLOR} lineWidth={2.5} transparent opacity={0.82} />
      <Line points={rightCurve.getPoints(42)} color={WRITE_COLOR} lineWidth={2.5} transparent opacity={0.82} />
      <mesh ref={leftPulse}><sphereGeometry args={[0.06, 14, 14]} /><meshStandardMaterial color={SUBTRACT_COLOR} emissive={SUBTRACT_COLOR} emissiveIntensity={1.6} /></mesh>
      <mesh ref={rightPulse}><sphereGeometry args={[0.06, 14, 14]} /><meshStandardMaterial color={WRITE_COLOR} emissive={WRITE_COLOR} emissiveIntensity={1.6} /></mesh>
    </group>
  );
}

function EquationCore({ model, reduced, compact }: { model: PrefixSumSceneModel; reduced: boolean; compact: boolean }) {
  const ring = useRef<THREE.Group>(null);
  const queryMode = model.operation === "query-range" || model.operation === "subtract" || model.operation === "complete";
  const color = model.operation === "invalid" ? INVALID_COLOR : queryMode ? QUERY_COLOR : model.operation === "write" ? WRITE_COLOR : PREFIX_COLOR;
  useFrame(({ clock }, delta) => {
    if (!ring.current) return;
    ring.current.rotation.z += reduced ? 0 : delta * 0.2;
    ring.current.scale.setScalar(!reduced && (model.operation === "write" || model.operation === "subtract") ? 1 + Math.sin(clock.elapsedTime * 3.2) * 0.03 : 1);
  });
  const equation = queryMode
    ? `${model.queryRightValue ?? "?"} - ${model.queryLeftValue ?? "?"}${model.rangeSum === null ? "" : ` = ${model.rangeSum}`}`
    : model.prefixBefore !== null && model.inputValue !== null
      ? `${model.prefixBefore} + ${model.inputValue}${model.operation === "write" ? ` = ${model.prefixResult}` : ""}`
      : "prefix[i] + arr[i]";

  return (
    <group position={[0, compact ? 1.28 : 1.52, 0.2]}>
      <group ref={ring}>
        <mesh><torusGeometry args={[0.58, 0.05, 18, 72]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.05} metalness={0.55} roughness={0.22} /></mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.72, 0.014, 12, 64]} /><meshBasicMaterial color={color} transparent opacity={0.34} /></mesh>
      </group>
      <Html position={[0, 0.02, 0.2]} center style={{ pointerEvents: "none" }}>
        <div className={`${compact ? "min-w-24 px-1.5 py-1" : "min-w-28 px-2.5 py-1.5"} rounded-md border bg-ink-950/96 text-center shadow-xl`} style={{ borderColor: color }}>
          <span className={`block font-mono font-black uppercase tracking-widest text-ink-400 ${compact ? "text-[6px]" : "text-[7px]"}`}>{queryMode ? "range subtraction" : "next checkpoint"}</span>
          <span data-testid="prefix-equation-core" className={`mt-0.5 block whitespace-nowrap font-mono font-black tabular-nums ${compact ? "text-[10px]" : "text-[12px]"}`} style={{ color }}>{equation}</span>
        </div>
      </Html>
    </group>
  );
}

function RailLabel({ text, position, color }: { text: string; position: [number, number, number]; color: string }) {
  return (
    <Html position={position} center style={{ pointerEvents: "none" }}>
      <div className="rounded border bg-ink-950/95 px-1.5 py-0.5 font-mono text-[7px] font-black uppercase tracking-wider shadow-lg" style={{ borderColor: color, color }}>{text}</div>
    </Html>
  );
}

function InvalidMarker({ model }: { model: PrefixSumSceneModel }) {
  if (model.operation !== "invalid") return null;
  return (
    <group position={[0, 0.02, 0.6]}>
      <Line points={[[-0.45, -0.45, 0], [0.45, 0.45, 0]]} color={INVALID_COLOR} lineWidth={5} />
      <Line points={[[-0.45, 0.45, 0], [0.45, -0.45, 0]]} color={INVALID_COLOR} lineWidth={5} />
    </group>
  );
}

function Scene({ model, p, reduced }: { model: PrefixSumSceneModel; p: Theme3DPalette; reduced: boolean }) {
  const compact = useThree((state) => state.size.width < 500);
  const count = Math.max(1, model.values.length);
  const stageWidth = Math.max(6.8, count * gapForCount(count) + 2.05);
  const labelX = -stageWidth / 2 + 0.42;

  return (
    <>
      <CameraRig stageWidth={stageWidth} reduced={reduced} />
      <fog attach="fog" args={[p.background, 13, 27]} />
      <ambientLight intensity={0.72 * p.lighting.ambient} />
      <directionalLight castShadow position={[4.5, 8, 5]} intensity={1.42 * p.lighting.directional} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-4, 2.2, 3]} intensity={20 * p.lighting.accent} distance={11} color={SUBTRACT_COLOR} />
      <pointLight position={[0, 3, 3]} intensity={25 * p.lighting.accent} distance={12} color={PREFIX_COLOR} />
      <pointLight position={[4, 2.2, 3]} intensity={22 * p.lighting.accent} distance={11} color={WRITE_COLOR} />

      <RailBase width={stageWidth} y={-1.01} z={0.12} p={p} />
      <RailBase width={stageWidth + 0.2} y={0.01} z={-0.2} p={p} />
      <RailLabel text="input arr" position={[labelX, -1.35, 0.56]} color={READ_COLOR} />
      <RailLabel text="prefix boundaries" position={[labelX, -0.31, 0.12]} color={PREFIX_COLOR} />

      {model.tokens.map((token) => <InputToken key={token.id} token={token} count={count} p={p} reduced={reduced} />)}
      {model.prefixTokens.map((token) => <CheckpointToken key={token.id} token={token} inputCount={count} p={p} reduced={reduced} />)}
      <BuiltPath model={model} />
      <QueryFrame model={model} reduced={reduced} />
      <BuildFlow model={model} reduced={reduced} />
      <QueryBridge model={model} reduced={reduced} compact={compact} />
      <EquationCore model={model} reduced={reduced} compact={compact} />
      <InvalidMarker model={model} />

      <InfiniteGrid position={[0, -1.65, -0.3]} cellSize={0.48} cellThickness={0.5} cellColor={p.gridCell} sectionSize={2.4} sectionThickness={0.88} sectionColor={p.gridSection} fadeDistance={23} fadeStrength={1} infiniteGrid />
      <OrbitControls enablePan={false} enableRotate enableZoom enableDamping dampingFactor={0.08} rotateSpeed={0.72} zoomSpeed={0.85} target={[0, 0.02, 0]} minDistance={7.2} maxDistance={20} minPolarAngle={0.38} maxPolarAngle={Math.PI / 2.04} />
    </>
  );
}

function Overlay({ model }: { model: PrefixSumSceneModel }) {
  const tone = model.operation === "invalid"
    ? "border-red-400/45 text-red-300"
    : model.operation === "query-range" || model.operation === "subtract" || model.operation === "complete"
      ? "border-purple-400/45 text-purple-200"
      : model.operation === "write"
        ? "border-emerald-400/45 text-emerald-200"
        : "border-cyan-400/45 text-cyan-200";

  return (
    <>
      <div className="pointer-events-none absolute left-2 top-2 z-10 max-w-[14rem] rounded-md border border-cyan-400/30 bg-ink-950/88 px-2.5 py-1.5 shadow-xl backdrop-blur-md sm:left-3 sm:top-3 sm:max-w-[21rem]">
        <div className="flex items-center gap-1.5">
          <span className={`rounded border bg-ink-900/70 px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-widest ${tone}`}>prefix / {model.operation}</span>
          <span className="font-mono text-[8px] font-semibold uppercase tracking-wider text-ink-500">build O(n) · query O(1)</span>
        </div>
        <p data-testid="prefix-sum-headline" className="mt-1 text-xs font-black leading-tight text-ink-50 sm:text-[13px]">{model.headline}</p>
      </div>

      <div className="stage-hud-secondary prefix-sum-equation pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 items-center rounded-md border border-ink-700/70 bg-ink-950/90 px-3 py-2 shadow-xl backdrop-blur-md">
        <span className="max-w-80 truncate font-mono text-[11px] font-black tabular-nums text-ink-50">{model.equation ?? "prefix[i + 1] = prefix[i] + arr[i]"}</span>
      </div>

      <div className="stage-hud-secondary pointer-events-none absolute right-11 top-3 z-10 justify-end gap-1">
        {[["built", `${Math.max(0, model.builtThrough)}/${model.values.length}`], ["query", `${model.queryLeft}..${model.queryRight}`], ["adds", model.additions], ["sum", model.resultLabel]].map(([label, value]) => (
          <div key={label} className="min-w-10 rounded border border-ink-700/65 bg-ink-950/86 px-1.5 py-1 text-center shadow-lg backdrop-blur-md">
            <span className="block font-mono text-[7px] font-black uppercase tracking-widest text-ink-500">{label}</span>
            <span className="block font-mono text-[10px] font-black leading-tight text-ink-50">{value}</span>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 z-10 flex items-end justify-between gap-2 sm:left-4 sm:right-4">
        <p data-testid="prefix-sum-detail" className="max-w-[39rem] rounded-md border border-cyan-400/25 bg-ink-950/88 px-2.5 py-1.5 text-[11px] leading-snug text-ink-200 shadow-xl backdrop-blur-md">{model.detail}</p>
        <div className="stage-hud-legend ml-auto flex-wrap justify-end gap-1">
          <span className="rounded border border-orange-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-orange-200 backdrop-blur">orange read</span>
          <span className="rounded border border-cyan-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-cyan-200 backdrop-blur">cyan prefix</span>
          <span className="rounded border border-red-400/35 bg-ink-950/84 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-red-200 backdrop-blur">red subtracts</span>
        </div>
      </div>
    </>
  );
}

export function PrefixSumStage3D({ step, steps }: { step: TraceStep; steps?: TraceStep[] }) {
  const model = getPrefixSumSceneModel(step);
  const p = useTheme3D();
  const reduced = Boolean(useReducedMotion());
  const hud = useStageHud();
  if (!model) return null;

  return (
    <div className="codeanvil-canvas-fill codeanvil-stage-frame relative h-full w-full overflow-hidden rounded-md @container">
      <Canvas shadows="basic" dpr={[1.25, 2]} data-testid="prefix-sum-stage-canvas" camera={{ position: [0, 4.15, 10.2], fov: 43 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} style={{ width: "100%", height: "100%", background: "transparent" }}>
        <CanvasSizeSync />
        <Scene model={model} p={p} reduced={reduced} />
      </Canvas>
      <HudToggle open={hud.hudOpen} onToggle={hud.toggleHud} />
      {hud.hudOpen ? <Overlay model={model} /> : null}
      <div className="prefix-sum-line-badge"><CodeLineBadge step={step} /></div>
      <StageProgressBar step={step} steps={steps} />
    </div>
  );
}
