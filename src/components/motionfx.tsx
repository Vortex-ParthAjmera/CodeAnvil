import { useEffect, useState, type ElementType, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "../lib/cn";

/**
 * Shared motion kit — the same animation language as the landing page,
 * applied across every screen. All components collapse under
 * prefers-reduced-motion.
 */

/** Word-by-word clip-reveal heading (the landing headline treatment). */
export function AnimatedHeading({
  as: Tag = "h1",
  text,
  className,
  delay = 0,
  gradientLast = false,
}: {
  as?: ElementType;
  text: string;
  className?: string;
  /** Extra stagger delay before the first word. */
  delay?: number;
  /** Paint the final word with the forged gradient. */
  gradientLast?: boolean;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  const Heading = Tag as ElementType<{ className?: string; children?: ReactNode }>;
  return (
    <Heading className={className}>
      {reduce ? (
        text
      ) : (
        words.map((w, i) => {
          const last = i === words.length - 1;
          return (
            <span
              key={w}
              className="inline-block overflow-hidden pb-[0.14em] align-bottom"
            >
              <motion.span
                className="inline-block will-change-transform"
                initial={{ y: "115%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                transition={{
                  duration: 0.7,
                  delay: delay + i * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {/* The gradient stays on a plain inner span — background-clip:
                    text breaks on composited (will-change/transform) layers. */}
                {last && gradientLast ? (
                  <span className="text-forged">{w}</span>
                ) : (
                  w
                )}
                {!last && "\u00A0"}
              </motion.span>
            </span>
          );
        })
      )}
    </Heading>
  );
}

/** Animated count-up; jumps straight to the value under reduced motion. */
export function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) {
      setN(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const dur = 1100;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);
  return <>{n}</>;
}

/** Mount-time fade-up with stagger delay (screens are above the fold). */
export function FadeIn({
  children,
  delay = 0,
  y = 14,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * HUD-framed 3D viewport: breathing border glow, corner labels, optional
 * scanning sweep — the landing hero's frame, reusable on any canvas.
 */
export function HudFrame({
  label,
  right,
  children,
  className,
  sweep = true,
  ambient = true,
}: {
  label?: string;
  right?: string;
  children: ReactNode;
  className?: string;
  sweep?: boolean;
  ambient?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <div className={cn("relative", className)}>
      {ambient && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-ember-500/10 blur-3xl"
        />
      )}
      <div className="viewport-frame relative isolate h-full overflow-hidden rounded-xl border bg-ink-900/40">
        {children}
        {sweep && !reduce && <div aria-hidden className="viewport-sweep" />}
        {label && (
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-ink-500">
            <span className="inline-block h-1.5 w-1.5 animate-pulse-glow rounded-full bg-ember-400" />
            {label}
          </div>
        )}
        {right && (
          <div className="pointer-events-none absolute bottom-3 right-3 font-mono text-[9px] uppercase tracking-[0.2em] text-ink-500">
            {right}
          </div>
        )}
      </div>
    </div>
  );
}
