import { useMemo } from "react";
import { motion } from "motion/react";
import { Canvas } from "@react-three/fiber";
import { Grid as InfiniteGrid, Html, OrbitControls, Text } from "@react-three/drei";
import type { StackFrame } from "../../types/trace";
import { BarsGroup, type BarDescriptor } from "./ThreeBars";
import { cn } from "../../lib/cn";
import { useTheme3D, type Theme3DPalette } from "../../lib/theme3d";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Pulls `result = 1 x 3 = 3`-style formulas out of a step description. */
const FORMULA_RE = /([a-z_][a-z0-9_]*)\s*=\s*(-?\d+)\s*([×+*\-])\s*(-?\d+)\s*=\s*(-?\d+)/i;

function FormulaChip({ description }: { description?: string }) {
  if (!description) return null;
  const m = FORMULA_RE.exec(description);
  if (!m) return null;
  const op = m[3] === "*" ? "×" : m[3];
  return (
    <Html position={[0, -0.55, 0]} center style={{ pointerEvents: "none" }}>
      <div className="whitespace-nowrap rounded-md border border-arc-400/35 bg-ink-950/90 px-3 py-1.5 font-mono text-sm font-black text-ink-50 shadow-xl backdrop-blur">
        <span className="text-ink-400">{m[1]}</span> = {m[2]} {op} {m[4]} ={" "}
        <span className="text-ember-300">{m[5]}</span>
      </div>
    </Html>
  );
}

/**
 * The semantic fallback for variable-only steps (loops, accumulators): a big
 * hero value that pops on every change, the live formula below it, and the
 * line/event readout — the computation itself, not decoration.
 */
function VariableForge({
  description,
  variables,
  changed,
  line,
  event,
  p,
}: {
  description?: string;
  variables: Record<string, unknown>;
  changed?: string[];
  line: number;
  event: string;
  p: Theme3DPalette;
}) {
  const changedVar = changed?.find((name) => name in variables);
  const heroName = changedVar ?? Object.keys(variables)[0];
  const heroValue = heroName !== undefined ? variables[heroName] : undefined;
  const isNum = typeof heroValue === "number";
  const display = heroValue === undefined ? "" : String(heroValue);

  return (
    <group position={[0, 0.15, 0]}>
      <Html position={[0, 0.75, 0]} center style={{ pointerEvents: "none" }}>
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
          {isNum && heroValue !== undefined && (
            <motion.span
              key={`meter-${display}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25, delay: 0.08, ease: EASE_OUT }}
              className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-ink-500"
            >
              {heroValue >= 0 ? "growing" : ""}
            </motion.span>
          )}
        </div>
      </Html>
      <FormulaChip description={description} />
      <Text position={[0, -1.5, 0.25]} fontSize={0.26} color={p.emberBright} anchorX="center">
        LINE {line}
      </Text>
      <Text position={[0, -1.9, 0.2]} fontSize={0.15} color={p.arcBright} anchorX="center">
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
}: {
  values?: number[];
  states?: BarDescriptor[];
  variables: Record<string, unknown>;
  changed?: string[];
  stack: StackFrame[];
  stepKey?: string | number;
  storyboard?: { line: number; event: string; description?: string };
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

      {!values && (
        <VariableForge
          description={storyboard?.description}
          variables={variables}
          changed={changed}
          line={storyboard?.line ?? 1}
          event={storyboard?.event ?? "line_enter"}
          p={p}
        />
      )}

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
