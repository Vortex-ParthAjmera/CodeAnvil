import { motion, useReducedMotion } from "motion/react";
import type { LoopChip } from "../lib/loopNarrative";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * One operand of the chip, pulsed in its own color. `scale` + `brightness`
 * are both numeric so the pulse interpolates reliably, and the brightness
 * surge makes the colored text glow in its own hue (ink for `a`, ember for
 * `b`, verdant for `result`).
 */
function Operand({
  children,
  className,
  delay,
  reduce,
}: {
  children: React.ReactNode;
  className: string;
  delay: number;
  reduce: boolean;
}) {
  if (reduce) return <span className={className}>{children}</span>;
  return (
    <motion.span
      className={`inline-block will-change-transform ${className}`}
      initial={{ scale: 1, filter: "brightness(1)" }}
      animate={{
        scale: [1, 1.22, 1],
        filter: ["brightness(1)", "brightness(1.55)", "brightness(1.04)"],
      }}
      transition={{ duration: 0.6, times: [0, 0.4, 1], delay, ease: EASE }}
    >
      {children}
    </motion.span>
  );
}

/** The equals signs fade in just before the operand they introduce. */
function Equals({ delay, reduce }: { delay: number; reduce: boolean }) {
  if (reduce) return <span className="text-ink-500"> = </span>;
  return (
    <motion.span
      className="text-ink-500"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay, ease: "easeOut" }}
    >
      {" "}= {" "}
    </motion.span>
  );
}

/** The gradient underline that sweeps left → right beneath the chip. */
function Sweep({ reduce }: { reduce: boolean }) {
  if (reduce) return null;
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute -bottom-px left-0 h-[2px] w-[34%] rounded-full bg-gradient-to-r from-ink-200 via-ember-400 to-verdant-400"
      style={{ willChange: "transform" }}
      initial={{ x: "-8%" }}
      animate={{ x: ["-8%", "194%"] }}
      transition={{ duration: 0.85, times: [0, 1], ease: "easeInOut", delay: 0.04 }}
    />
  );
}

/**
 * The formula chip (`result = 1 × 2 = 2`), shared by the 2D LoopNarrative and
 * the 3D VariableForge so both stages animate identically. Supports three
 * shapes — arithmetic (`a op b = result`), comparison (`8 > 3 → true`) and
 * plain assignment (`max_val = 8`). On every step the operands pulse in
 * sequence left → right, each glowing in its own color, while a gradient
 * underline sweeps beneath on the same timeline so the eye follows the beat.
 */
export function FormulaChip({
  model,
  stepKey,
}: {
  model: LoopChip;
  stepKey?: string | number;
}) {
  const reduce = useReducedMotion() === true;
  const prefix = model.kind === "assign" ? undefined : model.prefix;

  return (
    <motion.div
      key={stepKey}
      initial={reduce ? false : { opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="relative whitespace-nowrap rounded-md border border-arc-400/35 bg-ink-950/90 px-4 py-2 font-mono text-sm font-black text-ink-50 shadow-xl backdrop-blur"
    >
      {prefix && (
        <span className="mr-2 text-[9px] font-bold uppercase tracking-[0.2em] text-ink-500">
          {prefix}
        </span>
      )}

      {model.kind === "formula" && (
        <>
          <Operand className="text-ink-400" delay={0} reduce={reduce}>
            {model.formula.lhs}
          </Operand>
          <Equals delay={0.06} reduce={reduce} />
          <Operand className="text-ink-200" delay={0.14} reduce={reduce}>
            {model.formula.a}
          </Operand>
          <Operand className="text-ink-300" delay={0.32} reduce={reduce}>
            {model.formula.op}
          </Operand>
          <Operand className="text-ember-300" delay={0.5} reduce={reduce}>
            {model.formula.b}
          </Operand>
          <Equals delay={0.58} reduce={reduce} />
          <Operand className="text-verdant-300" delay={0.68} reduce={reduce}>
            {model.formula.result}
          </Operand>
        </>
      )}

      {model.kind === "compare" && (
        <>
          <Operand className="text-ink-200" delay={0.1} reduce={reduce}>
            {model.left}
          </Operand>
          <Operand className="text-ember-300" delay={0.3} reduce={reduce}>
            {model.cmp}
          </Operand>
          <Operand className="text-ink-200" delay={0.5} reduce={reduce}>
            {model.right}
          </Operand>
          {model.outcome === undefined ? (
            <span className="text-ink-500"> ?</span>
          ) : (
            <>
              <span className="text-ink-500"> → </span>
              <Operand
                className={
                  model.outcome ? "text-verdant-400" : "text-ember-400"
                }
                delay={0.68}
                reduce={reduce}
              >
                {String(model.outcome).toUpperCase()}
              </Operand>
            </>
          )}
        </>
      )}

      {model.kind === "assign" && (
        <>
          <Operand className="text-ink-400" delay={0} reduce={reduce}>
            {model.lhs}
          </Operand>
          <Equals delay={0.06} reduce={reduce} />
          <Operand className="text-ember-300" delay={0.16} reduce={reduce}>
            {model.value}
          </Operand>
        </>
      )}

      <Sweep reduce={reduce} />
    </motion.div>
  );
}
