import { useMemo } from "react";
import { motion } from "motion/react";
import { Canvas } from "@react-three/fiber";
import { Grid as InfiniteGrid, Html, OrbitControls, Text } from "@react-three/drei";
import type { StackFrame, TraceStep } from "../../types/trace";
import { BarsGroup, type BarDescriptor } from "./ThreeBars";
import { cn } from "../../lib/cn";
import {
  RANGE_RE,
  findAccumulator,
  findCounter,
  parseFormula,
  type ParsedFormula,
} from "../../lib/loopNarrative";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

function FormulaChip({
  formula,
  prefix,
}: {
  formula: ParsedFormula | null;
  prefix?: string;
}) {
  if (!formula) return null;
  return (
    <Html position={[0, -0.5, 0]} center style={{ pointerEvents: "none" }}>
      <div className="whitespace-nowrap rounded-md border border-arc-400/35 bg-ink-950/90 px-3 py-1.5 font-mono text-sm font-black text-ink-50 shadow-xl backdrop-blur">
        {prefix && (
          <span className="mr-2 text-[9px] font-bold uppercase tracking-[0.2em] text-ink-500">
            {prefix}
          </span>
        )}
        <span className="text-ink-400">{formula.lhs}</span> ={" "}
        <span className="text-ink-200">{formula.a}</span> {formula.op}{" "}
        <span className="text-ember-300">{formula.b}</span> ={" "}
        <span className="text-verdant-300">{formula.result}</span>
      </div>
    </Html>
  );
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
}: {
  description?: string;
  variables: Record<string, unknown>;
  heroName: string;
  line: number;
  event: string;
  p: Theme3DPalette;
}) {
  const counterName = useMemo(() => findCounter(variables), [variables]);
  const formula = parseFormula(description);
  const heroValue = variables[heroName];
  const display = heroValue === undefined ? "" : String(heroValue);

  // On an iteration step the multiply hasn't run yet — preview it.
  const counterValue =
    counterName !== null && typeof variables[counterName] === "number"
      ? (variables[counterName] as number)
      : null;
  const nextFormula =
    !formula &&
    event === "loop_iteration" &&
    typeof heroValue === "number" &&
    counterValue !== null &&
    Number.isFinite(heroValue) &&
    Number.isFinite(counterValue)
      ? {
          lhs: heroName,
          a: heroValue,
          op: "×",
          b: counterValue,
          result: heroValue * counterValue,
        }
      : null;

  const rangeMatch = RANGE_RE.exec(description ?? "");
  const rangeEnd = rangeMatch ? Number(rangeMatch[2]) : null;

  const statusTag =
    event === "loop_iteration"
      ? "NEXT ITERATION"
      : event === "assignment"
        ? "UPDATED"
        : event === "output_write"
          ? "PRINTED"
          : event === "program_start"
            ? "START"
            : event === "program_end"
              ? "DONE"
              : "";

  return (
    <group position={[0, 0.15, 0]}>
      {/* Loop counter + progress dots (top) */}
      {counterName !== null && counterValue !== null && (
        <Html position={[0, 2.3, 0]} center style={{ pointerEvents: "none" }}>
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
                      idx < counterValue ? "bg-ember-400" : "bg-ink-700",
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </Html>
      )}

      {/* Hero value */}
      <Html position={[0, 0.68, 0]} center style={{ pointerEvents: "none" }}>
        <div className="flex flex-col items-center">
          <span className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-ink-500">
            {heroName ?? "step"}
          </span>
          <motion.span
            key={`${heroName}-${display}`}
            initial={{ scale: 0.55, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
            className="font-mono text-5xl font-black tabular-nums text-ember-300 [text-shadow:0_0_32px_rgba(167,139,250,0.65)]"
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

      {/* The arithmetic, shown or previewed */}
      <FormulaChip formula={formula ?? nextFormula} prefix={nextFormula ? "next" : undefined} />

      <Text position={[0, -1.4, 0.25]} fontSize={0.26} color={p.emberBright} anchorX="center">
        LINE {line}
      </Text>
      <Text position={[0, -1.8, 0.2]} fontSize={0.15} color={p.arcBright} anchorX="center">
        {event.replaceAll("_", " ").toUpperCase()}
      </Text>
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

  const heroName = !values
    ? (parseFormula(storyboard?.description)?.lhs ??
      changed?.find((name) => name !== counterName && name in variables) ??
      accumulator ??
      Object.keys(variables).find((name) => name !== counterName) ??
      Object.keys(variables)[0] ??
      "step")
    : "step";

  // In the variable-only scene the hero + counter are rendered big already;
  // hide their chips so the stage doesn't duplicate them.
  const hiddenChips = useMemo(() => {
    if (values) return new Set<string>();
    const set = new Set<string>();
    if (counterName) set.add(counterName);
    set.add(heroName);
    return set;
  }, [counterName, heroName, values]);

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

      {!values && (
        <VariableForge
          description={storyboard?.description}
          variables={variables}
          heroName={heroName}
          line={storyboard?.line ?? 1}
          event={storyboard?.event ?? "line_enter"}
          p={p}
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
        autoRotate={!!values}
        autoRotateSpeed={0.6}
        minDistance={4}
        maxDistance={14}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}
