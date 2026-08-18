import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { motion } from "motion/react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Grid as InfiniteGrid, Html, OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import type { StackFrame, TraceStep } from "../../types/trace";
import { BarsGroup, type BarDescriptor } from "./ThreeBars";
import { cn } from "../../lib/cn";
import { FormulaChip } from "../FormulaChip";
import {
  buildChipModel,
  deriveRangeEnd,
  findAccumulator,
  findCounter,
  isLoopNarrativeTrace,
  iterationsElapsed,
  parseFormula,
} from "../../lib/loopNarrative";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

const DEFAULT_CAM = [0, 2.6, 8.2] as const;
/** Pulled back a touch so the narrative band sits above the bars. */
const COMPOSITE_CAM = [0, 3.2, 11] as const;

/**
 * Damped camera reframe (mirrors the grid's ReframeCamera): frames the scene
 * instantly on mount, then glides when the array-loop narrative flips the
 * stage into composite mode. Rendered before OrbitControls so its position
 * update is adopted each frame; once settled it goes quiet so the user's own
 * zoom/orbit is never fought.
 */
function StageCamera({ composite }: { composite: boolean }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const targetVec = useRef(
    new THREE.Vector3(...(composite ? COMPOSITE_CAM : DEFAULT_CAM)),
  );
  const reframing = useRef(false);

  useLayoutEffect(() => {
    const cam = composite ? COMPOSITE_CAM : DEFAULT_CAM;
    camera.position.set(cam[0], cam[1], cam[2]);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useEffect(() => {
    const next = new THREE.Vector3(...(composite ? COMPOSITE_CAM : DEFAULT_CAM));
    if (targetVec.current.distanceTo(next) < 0.001) return;
    targetVec.current.copy(next);
    reframing.current = true;
  }, [camera, composite]);

  useFrame((_, delta) => {
    if (!reframing.current) return;
    const t = 1 - Math.pow(0.0009, delta);
    camera.position.lerp(targetVec.current, t);
    if (camera.position.distanceTo(targetVec.current) < 0.015) {
      camera.position.copy(targetVec.current);
      reframing.current = false;
    }
  });

  return null;
}

/**
 * The semantic fallback for variable-only steps (loops, accumulators): a big
 * hero value that pops on every change, the loop counter with its progress,
 * the live formula below it, and the line/event readout — the computation
 * itself, not decoration.
 *
 * The hero is always the *accumulator* (the variable the loop computes), never
 * the loop counter: when a step only bumps `i`, the scene still shows `result`
 * and previews the next multiplication (`result = 1 × 2 = 2`).
 */
function VariableForge({
  description,
  variables,
  heroName,
  line,
  event,
  p,
  stepKey,
  steps,
  composite = false,
}: {
  description?: string;
  variables: Record<string, unknown>;
  heroName: string;
  line: number;
  event: string;
  p: Theme3DPalette;
  stepKey?: string | number;
  steps?: TraceStep[];
  /** Array-loop mode: the bars share the scene, so the narrative sits above
      the bars (counter + hero) with the formula below them, and the line/event
      readout is dropped (the HUD already shows it). */
  composite?: boolean;
}) {
  const counterName = useMemo(() => findCounter(variables), [variables]);
  const heroValue = variables[heroName];
  const display = heroValue === undefined ? "" : String(heroValue);
  const isNumericHero = typeof heroValue === "number";

  const counterValue =
    counterName !== null && typeof variables[counterName] === "number"
      ? (variables[counterName] as number)
      : null;

  // The current step (stepKey is the trace step id) drives the chip model and
  // the progress dots, exactly like the 2D narrative.
  const currentStep = useMemo(
    () => (steps ?? []).find((s) => String(s.id) === String(stepKey)),
    [steps, stepKey],
  );
  const chip = useMemo(() => {
    if (currentStep) {
      return buildChipModel(currentStep, steps ?? [], heroName, heroValue, counterValue);
    }
    const f = parseFormula(description);
    return f ? { kind: "formula" as const, formula: f } : null;
  }, [currentStep, steps, heroName, heroValue, counterValue, description]);
  const rangeEnd = useMemo(() => deriveRangeEnd(steps ?? []), [steps]);
  const elapsed = currentStep
    ? iterationsElapsed(steps ?? [], currentStep)
    : counterValue ?? 0;

  const statusTag =
    event === "loop_iteration"
      ? "NEXT ITERATION"
      : event === "assignment"
        ? "UPDATED"
        : event === "comparison"
          ? "CHECKED"
          : event === "output_write"
            ? "PRINTED"
            : event === "program_start"
              ? "START"
              : event === "program_end"
                ? "DONE"
                : "";

  // The stage is wide and short, so the narrative never stacks tightly:
  // the counter sits left of center and the hero center, the chip below them,
  // and a single compact line/event readout at the bottom — each overlay box
  // clears the next by a healthy gap instead of overlapping.
  const counterPos: [number, number, number] = composite ? [-3.4, 2.4, 0] : [-3.4, 1.9, 0];
  const heroPos: [number, number, number] = composite ? [0, 2.4, 0] : [0, 1.0, 0];
  const chipPos: [number, number, number] = composite ? [0, -2.0, 0] : [0, -1.0, 0];

  return (
    <group position={[0, composite ? 0 : 0.15, 0]}>
      {/* Loop counter + progress dots (top) */}
      {counterName !== null && counterValue !== null && (
        <Html position={counterPos} center style={{ pointerEvents: "none" }}>
          <div className="flex flex-col items-center gap-1.5">
            <span className="font-mono text-xs font-black uppercase tracking-[0.25em] text-ink-400">
              {counterName} = {counterValue}
            </span>
            {rangeEnd !== null && (
              <div className="flex gap-1.5">
                {Array.from({ length: Math.max(1, rangeEnd) }, (_, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-colors",
                      idx < elapsed ? "bg-ember-400" : "bg-ink-700",
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </Html>
      )}

      {/* Hero value — skipped when not numeric (e.g. the array itself on the
          first step of an array loop) */}
      {isNumericHero && (
        <Html position={heroPos} center style={{ pointerEvents: "none" }}>
          <div className="flex flex-col items-center">
            <span className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-ink-500">
              {heroName ?? "step"}
            </span>
            <motion.span
              key={`${heroName}-${display}`}
              initial={{ scale: 0.55, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 24 }}
              className="font-mono text-4xl font-black tabular-nums text-ember-300 [text-shadow:0_0_32px_rgba(251,191,36,0.55)]"
            >
              {display}
            </motion.span>
            {statusTag && (
              <motion.span
                key={`tag-${statusTag}-${display}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, delay: 0.08, ease: EASE_OUT }}
                className="mt-1 rounded border border-ember-400/40 bg-ember-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-ember-300"
              >
                {statusTag}
              </motion.span>
            )}
          </div>
        </Html>
      )}

      {/* The chip explaining this step — inside Html so the pulsing chip sits
          on the stage; keyed by step so the operand pulse replays. */}
      {chip && (
        <Html position={chipPos} center style={{ pointerEvents: "none" }}>
          <FormulaChip model={chip} stepKey={stepKey} />
        </Html>
      )}

      {!composite && (
        <Text position={[0, -1.72, 0.25]} fontSize={0.18} color={p.emberBright} anchorX="center">
          LINE {line} · {event.replaceAll("_", " ").toUpperCase()}
        </Text>
      )}
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
  steps,
}: {
  values?: number[];
  states?: BarDescriptor[];
  variables: Record<string, unknown>;
  changed?: string[];
  stack: StackFrame[];
  stepKey?: string | number;
  storyboard?: { line: number; event: string; description?: string };
  steps?: TraceStep[];
}) {
  const p = useTheme3D();
  const counterName = useMemo(() => findCounter(variables), [variables]);
  const varEntries = useMemo(() => {
    const entries = Object.entries(variables).filter(
      ([, v]) => typeof v !== "object" || v === null,
    );
    return entries.slice(0, 6);
  }, [variables]);

  const changedSet = useMemo(() => new Set(changed ?? []), [changed]);

  // The hero is the *accumulator* — the variable the loop computes. Find it by
  // scanning the trace for the last non-counter assignment target, so it works
  // even when the stage mounts mid-trace (session resume, direct navigation).
  const accumulator = useMemo(() => findAccumulator(steps), [steps]);

  // Array loops (Sum of Array, Max in Array) get the narrative composited
  // over the bars; variable-only loops (Factorial (Loop)) keep the narrative
  // as the whole scene.
  const loopTrace = useMemo(() => isLoopNarrativeTrace(steps ?? []), [steps]);
  const composite = loopTrace && !!values;

  const heroName = !values || loopTrace
    ? (parseFormula(storyboard?.description)?.lhs ??
      changed?.find((name) => name !== counterName && name in variables) ??
      accumulator ??
      Object.keys(variables).find((name) => name !== counterName) ??
      Object.keys(variables)[0] ??
      "step")
    : "step";

  // In the variable-only scene the hero + counter are rendered big already;
  // hide their chips so the stage doesn't duplicate them. In composite mode
  // the narrative + bars tell the whole story, so no chips float at all.
  const hiddenChips = useMemo(() => {
    if (composite) return new Set(varEntries.map(([name]) => name));
    if (values) return new Set<string>();
    const set = new Set<string>();
    if (counterName) set.add(counterName);
    set.add(heroName);
    return set;
  }, [counterName, heroName, values, composite, varEntries]);

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

      <StageCamera composite={composite} />

      {values && (
        <BarsGroup
          values={values}
          states={states ?? []}
          maxH={composite ? 2.0 : 2.8}
          baseY={composite ? -1.6 : -1.1}
          colors={colors}
        />
      )}

      {(!values || composite) && (
        <VariableForge
          description={storyboard?.description}
          variables={variables}
          heroName={heroName}
          line={storyboard?.line ?? 1}
          event={storyboard?.event ?? "line_enter"}
          p={p}
          stepKey={stepKey}
          steps={steps}
          composite={composite}
        />
      )}

      {/* Floating variable chips — the hero + loop counter are already shown
          prominently by VariableForge, so keep the chips to the rest. */}
      {varEntries.map(([name, value], i) => {
        if (hiddenChips.has(name)) return null;
        const isChanged = changedSet.has(name);
        const spread = (i - (varEntries.length - 1) / 2) * 1.5;
        return (
          <Html
            key={`${name}-${stepKey}`}
            position={[spread, values ? 2.6 : 2.55, 0]}
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
        autoRotate={!!values && !loopTrace}
        autoRotateSpeed={0.6}
        minDistance={4}
        maxDistance={14}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}
