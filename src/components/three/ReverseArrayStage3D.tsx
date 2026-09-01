import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Grid as InfiniteGrid, Html, Line, OrbitControls, Text } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import type { TraceStep } from "../../types/trace";
import {
  getReverseArraySceneModel,
  type ReverseArraySceneModel,
} from "../../engine/reverseArrayStage";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";
import { CanvasSizeSync } from "./CanvasSizeSync";
import { CodeLineBadge } from "./CodeLineBadge";
import { HudToggle, useStageHud } from "./StageHud";
import { StageProgressBar } from "./StageProgressBar";

interface TokenLayout {
  tokenId: number;
  value: number;
  slotIndex: number;
  x: number;
}

const TOKEN_WIDTH = 0.78;
const TOKEN_DEPTH = 0.82;

function gapForCount(count: number): number {
  if (count <= 6) return 1.18;
  return Math.max(0.78, 6.8 / Math.max(1, count - 1));
}

function xForSlot(index: number, count: number, gap: number): number {
  return (index - (count - 1) / 2) * gap;
}

function makeTokenLayout(model: ReverseArraySceneModel): TokenLayout[] {
  const gap = gapForCount(model.values.length);
  return model.tokenOrder.map((tokenId, slotIndex) => ({
    tokenId,
    value: model.originalValues[tokenId] ?? model.values[slotIndex],
    slotIndex,
    x: xForSlot(slotIndex, model.values.length, gap),
  }));
}

function CameraRig({ stageWidth, reduced }: { stageWidth: number; reduced: boolean }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const target = useRef(new THREE.Vector3(0, 3.15, Math.max(8.2, stageWidth * 0.92 + 2.2)));
  const reframing = useRef(true);

  useLayoutEffect(() => {
    camera.position.copy(target.current);
    camera.lookAt(0, -0.05, 0);
  }, [camera]);

  useEffect(() => {
    target.current.set(0, 3.15, Math.max(8.2, stageWidth * 0.92 + 2.2));
    reframing.current = true;
  }, [stageWidth]);

  useFrame((_, delta) => {
    if (!reframing.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.0008, delta);
    camera.position.lerp(target.current, amount);
    camera.lookAt(0, -0.05, 0);
    if (camera.position.distanceTo(target.current) < 0.012) {
      camera.position.copy(target.current);
      reframing.current = false;
    }
  });

  return null;
}

function MovingToken({
  token,
  model,
  p,
  reduced,
}: {
  token: TokenLayout;
  model: ReverseArraySceneModel;
  p: Theme3DPalette;
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const bodyMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const fromX = useRef(token.x);
  const targetX = useRef(token.x);
  const elapsed = useRef(1);
  const travelDirection = useRef(1);
  const isLeft = token.slotIndex === model.leftIndex && model.operation !== "complete";
  const isRight = token.slotIndex === model.rightIndex && model.operation !== "complete";
  const isCenter = isLeft && isRight;
  const isSettled = model.settledIndices.includes(token.slotIndex) || model.operation === "complete";
  const targetColor = useMemo(
    () => new THREE.Color(
      isCenter
        ? p.emberBright
        : isLeft
          ? p.arcBright
          : isRight
            ? p.ember
            : isSettled
              ? p.verdant
              : p.barDefault,
    ),
    [isCenter, isLeft, isRight, isSettled, p.arcBright, p.barDefault, p.ember, p.emberBright, p.verdant],
  );

  useLayoutEffect(() => {
    if (!group.current) return;
    group.current.position.set(token.x, -0.64, 0);
    fromX.current = token.x;
    targetX.current = token.x;
  }, []);

  useEffect(() => {
    if (!group.current || Math.abs(targetX.current - token.x) < 0.001) return;
    fromX.current = group.current.position.x;
    targetX.current = token.x;
    travelDirection.current = token.x > group.current.position.x ? 1 : -1;
    elapsed.current = 0;
  }, [token.x]);

  useFrame(({ clock }, delta) => {
    if (!group.current || !bodyMaterial.current) return;

    if (reduced) {
      group.current.position.set(targetX.current, -0.64, 0);
      elapsed.current = 1;
    } else if (elapsed.current < 1) {
      elapsed.current = Math.min(1, elapsed.current + delta / 0.78);
      const t = elapsed.current;
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const arc = Math.sin(Math.PI * eased);
      group.current.position.x = THREE.MathUtils.lerp(fromX.current, targetX.current, eased);
      group.current.position.y = -0.64 + arc * 1.25;
      group.current.position.z = travelDirection.current * arc * 0.54;
      group.current.rotation.z = travelDirection.current * Math.sin(Math.PI * eased) * -0.09;
    } else {
      const pulse = isSettled ? Math.sin(clock.elapsedTime * 2.6 + token.tokenId) * 0.015 : 0;
      const restingY = -0.64 + (isLeft || isRight ? 0.07 : 0) + pulse;
      const amount = 1 - Math.pow(0.0009, delta);
      group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetX.current, amount);
      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, restingY, amount);
      group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, 0, amount);
      group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, 0, amount);
    }

    const colorAmount = reduced ? 1 : 1 - Math.pow(0.0007, delta);
    bodyMaterial.current.color.lerp(targetColor, colorAmount);
    bodyMaterial.current.emissive.lerp(targetColor, colorAmount);
    bodyMaterial.current.emissiveIntensity = THREE.MathUtils.lerp(
      bodyMaterial.current.emissiveIntensity,
      isLeft || isRight ? 0.55 : isSettled ? 0.3 : 0.08,
      colorAmount,
    );
  });

  const accent = isCenter
    ? p.emberBright
    : isLeft
      ? p.arcBright
      : isRight
        ? p.ember
        : isSettled
          ? p.verdant
          : p.gridSection;

  return (
    <group ref={group} position={[token.x, -0.64, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.38, 0]}>
        <boxGeometry args={[TOKEN_WIDTH, 0.7, TOKEN_DEPTH]} />
        <meshStandardMaterial
          ref={bodyMaterial}
          color={targetColor}
          emissive={targetColor}
          emissiveIntensity={isLeft || isRight ? 0.55 : isSettled ? 0.3 : 0.08}
          metalness={0.48}
          roughness={0.27}
        />
        <Edges color={accent} threshold={18} />
      </mesh>

      <mesh position={[0, 0.76, 0]}>
        <boxGeometry args={[TOKEN_WIDTH * 0.76, 0.045, TOKEN_DEPTH * 0.72]} />
        <meshBasicMaterial color={accent} transparent opacity={0.88} />
      </mesh>

      <Html
        position={[0, 0.39, 0.43]}
        center
        style={{
          pointerEvents: "none",
          WebkitFontSmoothing: "antialiased",
          textRendering: "geometricPrecision",
        }}
      >
        <div
          data-reverse-token={token.tokenId}
          className="stage-value-card"
          style={{ borderColor: accent }}
        >
          {token.value}
        </div>
      </Html>
    </group>
  );
}

function SlotDeck({
  model,
  stageWidth,
  gap,
  p,
}: {
  model: ReverseArraySceneModel;
  stageWidth: number;
  gap: number;
  p: Theme3DPalette;
}) {
  return (
    <group>
      <mesh position={[0, -0.93, 0]} receiveShadow>
        <boxGeometry args={[stageWidth + 0.5, 0.14, 1.62]} />
        <meshStandardMaterial color={p.emptyCell} metalness={0.42} roughness={0.46} />
        <Edges color={p.gridSection} threshold={18} />
      </mesh>

      {model.values.map((_, index) => {
        const x = xForSlot(index, model.values.length, gap);
        const settled = model.settledIndices.includes(index) || model.operation === "complete";
        return (
          <group key={index} position={[x, 0, 0]}>
            <mesh position={[0, -0.79, 0]} receiveShadow>
              <boxGeometry args={[TOKEN_WIDTH + 0.13, 0.12, TOKEN_DEPTH + 0.18]} />
              <meshStandardMaterial
                color={settled ? p.verdantDeep : p.barRange}
                emissive={settled ? p.verdant : p.barRange}
                emissiveIntensity={settled ? 0.32 : 0.04}
                metalness={0.48}
                roughness={0.36}
              />
            </mesh>
            <Text
              position={[0, -1.06, 0.46]}
              fontSize={0.16}
              color={settled ? p.verdant : p.textDim}
              anchorX="center"
              anchorY="middle"
            >
              {`i=${index}`}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

function PointerMarker({
  label,
  index,
  count,
  gap,
  color,
  visible,
  reduced,
}: {
  label: "L" | "R" | "L = R";
  index: number;
  count: number;
  gap: number;
  color: string;
  visible: boolean;
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const clampedIndex = Math.max(0, Math.min(count - 1, index));
  const targetX = xForSlot(clampedIndex, count, gap);

  useLayoutEffect(() => {
    if (group.current) group.current.position.x = targetX;
  }, []);

  useFrame((_, delta) => {
    if (!group.current) return;
    const amount = reduced ? 1 : 1 - Math.pow(0.00065, delta);
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetX, amount);
    group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, visible ? 1 : 0.001, amount));
  });

  return (
    <group ref={group} position={[targetX, 1.34, 0]}>
      <mesh position={[0, -0.24, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.16, 0.32, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.95} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.42, 14]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Html position={[0, 0.44, 0]} center style={{ pointerEvents: "none" }}>
        <div
          className="whitespace-nowrap rounded border bg-ink-950/94 px-2 py-1 font-mono text-[10px] font-black shadow-xl"
          style={{ borderColor: color, color }}
        >
          {label} = {index}
        </div>
      </Html>
      <pointLight position={[0, -0.25, 0.35]} color={color} intensity={11} distance={2.4} />
    </group>
  );
}

function ExchangeRoutes({
  model,
  gap,
  p,
}: {
  model: ReverseArraySceneModel;
  gap: number;
  p: Theme3DPalette;
}) {
  const active = model.operation === "pair" || model.operation === "swap";
  if (!active || model.leftIndex < 0 || model.rightIndex >= model.values.length || model.leftIndex >= model.rightIndex) {
    return null;
  }

  const leftX = xForSlot(model.leftIndex, model.values.length, gap);
  const rightX = xForSlot(model.rightIndex, model.values.length, gap);
  const route = (lane: number) => Array.from({ length: 32 }, (_, pointIndex) => {
    const t = pointIndex / 31;
    return new THREE.Vector3(
      THREE.MathUtils.lerp(leftX, rightX, t),
      -0.2 + Math.sin(Math.PI * t) * 1.38,
      lane * Math.sin(Math.PI * t) * 0.54,
    );
  });

  return (
    <group>
      <Line points={route(1)} color={p.arcBright} lineWidth={1.8} transparent opacity={0.72} />
      <Line points={route(-1)} color={p.emberBright} lineWidth={1.8} transparent opacity={0.72} />
    </group>
  );
}

function MirrorGate({
  model,
  p,
  reduced,
}: {
  model: ReverseArraySceneModel;
  p: Theme3DPalette;
  reduced: boolean;
}) {
  const ring = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ring.current || reduced) return;
    ring.current.rotation.x = Math.sin(clock.elapsedTime * 0.7) * 0.035;
    ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2.1) * 0.018);
  });

  return (
    <group ref={ring} position={[0, 0.25, 0]} rotation={[0, Math.PI / 2, 0]}>
      <mesh>
        <torusGeometry args={[0.72, 0.045, 16, 72]} />
        <meshStandardMaterial color={p.arcDeep} emissive={p.arcBright} emissiveIntensity={0.8} metalness={0.65} roughness={0.2} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.52, 0.018, 12, 64]} />
        <meshBasicMaterial color={p.emberBright} transparent opacity={0.66} />
      </mesh>
      <Html position={[0, 0.99, 0]} center transform={false} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded border border-ink-700/70 bg-ink-950/90 px-2 py-1 text-center shadow-xl backdrop-blur-sm">
          <span className="block font-mono text-[7px] font-black uppercase tracking-widest text-ink-500">pairs fixed</span>
          <span className="block font-mono text-[11px] font-black tabular-nums text-verdant-300">
            {model.swaps} / {model.totalPairs}
          </span>
        </div>
      </Html>
    </group>
  );
}

function Scene({
  model,
  p,
  reduced,
}: {
  model: ReverseArraySceneModel;
  p: Theme3DPalette;
  reduced: boolean;
}) {
  const tokens = useMemo(() => makeTokenLayout(model), [model]);
  const gap = gapForCount(model.values.length);
  const stageWidth = Math.max(5.8, (model.values.length - 1) * gap + 2.05);
  const pointersVisible = model.operation !== "complete" && model.operation !== "stop";
  const pointersMeet = pointersVisible && model.leftIndex === model.rightIndex;

  return (
    <>
      <CameraRig stageWidth={stageWidth} reduced={reduced} />
      <fog attach="fog" args={[p.background, 10, 23]} />
      <ambientLight intensity={0.72 * p.lighting.ambient} />
      <directionalLight
        castShadow
        position={[4.8, 7.2, 5.2]}
        intensity={1.35 * p.lighting.directional}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-3.5, 2.4, 2.8]} intensity={26 * p.lighting.accent} distance={10} color={p.arcBright} />
      <pointLight position={[3.5, 2.4, 2.8]} intensity={25 * p.lighting.accent} distance={10} color={p.ember} />

      <group position={[0, -0.1, 0]}>
        <SlotDeck model={model} stageWidth={stageWidth} gap={gap} p={p} />
        <ExchangeRoutes model={model} gap={gap} p={p} />
        <MirrorGate model={model} p={p} reduced={reduced} />
        {tokens.map((token) => (
          <MovingToken
            key={token.tokenId}
            token={token}
            model={model}
            p={p}
            reduced={reduced}
          />
        ))}
        {pointersMeet ? (
          <PointerMarker
            label="L = R"
            index={model.leftIndex}
            count={model.values.length}
            gap={gap}
            color={p.emberBright}
            visible
            reduced={reduced}
          />
        ) : (
          <>
            <PointerMarker
              label="L"
              index={model.leftIndex}
              count={model.values.length}
              gap={gap}
              color={p.arcBright}
              visible={pointersVisible}
              reduced={reduced}
            />
            <PointerMarker
              label="R"
              index={model.rightIndex}
              count={model.values.length}
              gap={gap}
              color={p.emberBright}
              visible={pointersVisible}
              reduced={reduced}
            />
          </>
        )}
      </group>

      <InfiniteGrid
        position={[0, -1.15, -0.15]}
        cellSize={0.48}
        cellThickness={0.52}
        cellColor={p.gridCell}
        sectionSize={2.4}
        sectionThickness={0.9}
        sectionColor={p.gridSection}
        fadeDistance={22}
        fadeStrength={1}
        infiniteGrid
      />

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={5.6}
        maxDistance={15}
        minPolarAngle={0.42}
        maxPolarAngle={Math.PI / 2.06}
      />
    </>
  );
}

function Overlay({ model }: { model: ReverseArraySceneModel }) {
  const leftValue = model.pairValues?.[0] ?? model.values[model.leftIndex];
  const rightValue = model.pairValues?.[1] ?? model.values[model.rightIndex];

  return (
    <>
      <div className="pointer-events-none absolute left-2 top-2 z-10 max-w-[13rem] rounded-md border border-arc-400/30 bg-ink-950/86 px-2.5 py-1.5 shadow-xl backdrop-blur-md sm:left-3 sm:top-3 sm:max-w-[18rem]">
        <div className="flex items-center gap-1.5">
          <span className="rounded border border-arc-400/40 bg-arc-500/10 px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-widest text-arc-200">
            reverse / {model.operation}
          </span>
          <span className="font-mono text-[8px] font-semibold uppercase tracking-wider text-ink-500">
            O(n) time / O(1) space
          </span>
        </div>
        <p data-testid="reverse-array-headline" className="mt-1 text-xs font-black leading-tight text-ink-50 sm:text-[13px]">
          {model.headline}
        </p>
      </div>

      <div className="stage-hud-secondary reverse-array-equation pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 items-center gap-2 rounded-md border border-ink-700/70 bg-ink-950/88 px-3 py-2 shadow-xl backdrop-blur-md">
        <span className="max-w-52 truncate font-mono text-[11px] font-black tabular-nums text-ink-50">
          {model.equation ?? `pair ${Math.min(model.pairNumber, model.totalPairs)} / ${model.totalPairs}`}
        </span>
        {model.operation === "pair" || model.operation === "swap" ? (
          <span className="font-mono text-[10px] font-black tabular-nums text-ember-300">
            {leftValue} / {rightValue}
          </span>
        ) : null}
      </div>

      <div className="stage-hud-secondary pointer-events-none absolute right-11 top-3 z-10 justify-end gap-1">
        {[
          ["left", model.leftIndex],
          ["right", model.rightIndex],
          ["swaps", model.swaps],
          ["locked", `${model.settledIndices.length}/${model.values.length}`],
        ].map(([label, value]) => (
          <div key={label} className="min-w-12 rounded border border-ink-700/65 bg-ink-950/84 px-1.5 py-1 text-center shadow-lg backdrop-blur-md">
            <span className="block font-mono text-[7px] font-black uppercase tracking-widest text-ink-500">{label}</span>
            <span className="block max-w-[5.25rem] truncate font-mono text-[10px] font-black leading-tight text-ink-50">{value}</span>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 z-10 flex items-end justify-between gap-2 sm:left-4 sm:right-4">
        <p data-testid="reverse-array-detail" className="max-w-[30rem] rounded-md border border-arc-400/25 bg-ink-950/86 px-2.5 py-1.5 text-[11px] leading-snug text-ink-200 shadow-xl backdrop-blur-md">
          {model.detail}
        </p>
        <div className="stage-hud-legend ml-auto flex-wrap justify-end gap-1">
          <span className="rounded border border-arc-400/35 bg-ink-950/82 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-arc-200 backdrop-blur">L moves right</span>
          <span className="rounded border border-ember-400/35 bg-ink-950/82 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-ember-200 backdrop-blur">R moves left</span>
          <span className="rounded border border-verdant-400/35 bg-ink-950/82 px-1.5 py-1 font-mono text-[8px] font-bold uppercase text-verdant-200 backdrop-blur">green is locked</span>
        </div>
      </div>
    </>
  );
}

export function ReverseArrayStage3D({ step, steps }: { step: TraceStep; steps?: TraceStep[] }) {
  const model = getReverseArraySceneModel(step);
  const p = useTheme3D();
  const reduced = Boolean(useReducedMotion());
  const hud = useStageHud();

  if (!model) return null;

  return (
    <div className="codeanvil-canvas-fill codeanvil-stage-frame relative h-full w-full overflow-hidden rounded-md">
      <Canvas
        shadows
        dpr={[1.25, 2]}
        data-testid="reverse-array-stage-canvas"
        camera={{ position: [0, 3.15, 8.2], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <CanvasSizeSync />
        <Scene model={model} p={p} reduced={reduced} />
      </Canvas>
      <HudToggle open={hud.hudOpen} onToggle={hud.toggleHud} />
      {hud.hudOpen ? <Overlay model={model} /> : null}
      <div className="reverse-array-line-badge">
        <CodeLineBadge step={step} />
      </div>
      <StageProgressBar step={step} steps={steps} />
    </div>
  );
}
