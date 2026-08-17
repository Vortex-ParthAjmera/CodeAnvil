import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Box,
  Braces,
  Eye,
  FileCode2,
  Gamepad2,
  Lock,
  Moon,
  Play,
  RotateCcw,
  ScanLine,
  ScrollText,
  ShieldCheck,
  Sun,
  Swords,
  Terminal,
  User,
  Workflow,
} from "lucide-react";
import { EXAMPLES } from "../data/examples";
import type { Route } from "../router";
import { cn } from "../lib/cn";
import { TiltCard } from "../components/TiltCard";
import { CosmosBackdrop } from "../components/forge/CosmosBackdrop";
import { Badge } from "../components/ui";
import { BrandLogo } from "../components/BrandLogo";
import { CountUp } from "../components/motionfx";
import { getMode, subscribeMode, toggleMode } from "../lib/mode";
import { initialsOf, useSession } from "../lib/auth";

const MODULES: {
  id: string;
  icon: typeof Swords;
  title: string;
  line: string;
  route?: Route;
  planned?: boolean;
}[] = [
  {
    id: "arena",
    icon: Swords,
    title: "DSA Visual Arena",
    line: "BFS vs DFS races, sorting battles, and binary search on live 3D grids you build.",
    route: { name: "arena" },
  },
  {
    id: "story",
    icon: Gamepad2,
    title: "DSA Story Mode",
    line: "Worlds, missions, XP, and badges — complete dry runs to repaint the forge.",
    route: { name: "story" },
  },
  {
    id: "duel",
    icon: User,
    title: "Skill Duel",
    line: "Timed dry-run challenges, a daily duel, and a local leaderboard.",
    route: { name: "duel" },
  },
  {
    id: "visualize",
    icon: ScanLine,
    title: "Code Visualizer",
    line: "Paste any code — recognized patterns become full traces, honestly labeled.",
    route: { name: "visualize" },
  },
  {
    id: "ar",
    icon: Eye,
    title: "AR Code Explainer",
    line: "Point a camera at code and watch it explain itself, live. Long-term.",
    planned: true,
  },
];

const PIPELINE = [
  {
    icon: FileCode2,
    step: "01",
    title: "Source code",
    line: "Python examples live in the editor with line-accurate execution state.",
  },
  {
    icon: ScrollText,
    step: "02",
    title: "Trace actions",
    line: "Structured, language-neutral actions: calls, compares, swaps, returns.",
  },
  {
    icon: ShieldCheck,
    step: "03",
    title: "Validated JSON",
    line: "Every trace passes schema validation before a single frame renders.",
  },
  {
    icon: Terminal,
    step: "04",
    title: "CodeAnvil renderer",
    line: "Our own renderer turns actions into Three.js, Canvas, and SVG visuals.",
  },
];

export default function LandingPage({
  onNavigate,
}: {
  onNavigate: (route: Route) => void;
}) {
  const reduce = useReducedMotion();
  const [reducedMotion, setReducedMotion] = useState(false);
  const mode = useSyncExternalStore(subscribeMode, getMode);
  const account = useSession();

  // User-adjustable size of the 3D forge (persisted per browser).
  const [sceneScale, setSceneScale] = useState<number>(() => {
    try {
      const v = parseFloat(localStorage.getItem("codeanvil.hero-scale") ?? "1");
      return Number.isFinite(v) && v >= 0.6 && v <= 1.6 ? v : 1;
    } catch {
      return 1;
    }
  });
  const changeScale = (v: number) => {
    setSceneScale(v);
    try {
      localStorage.setItem("codeanvil.hero-scale", String(v));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const stats = useMemo(() => {
    const steps = EXAMPLES.reduce((n, e) => n + e.trace.steps.length, 0);
    const prompts = EXAMPLES.reduce((n, e) => n + e.trace.practice.length, 0);
    return { examples: EXAMPLES.length, steps, prompts };
  }, []);

  const fadeUp = (delay = 0) => ({
    // Scroll-reveal only: below-fold sections stay hidden until they enter the
    // viewport (whileInView). The hero is in view on mount, so it animates in
    // immediately. Reduced-motion users get static content.
    initial: reduce ? false : { opacity: 0, y: 26 },
    whileInView: reduce ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <div className="relative min-h-[100dvh] text-ink-100">
      {/* One living 3D world behind the WHOLE page — hero through footer */}
      {!reducedMotion && (
        <div aria-hidden className="cosmos-layer fixed inset-0 z-0">
          <CosmosBackdrop scale={sceneScale} />
        </div>
      )}
      {/* ---------------------------------------------------------- Nav */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-ink-800/60 bg-ink-950/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5">
          <button
            type="button"
            onClick={() => onNavigate({ name: "landing" })}
            className="flex items-center gap-2.5"
          >
            <BrandLogo className="h-8 w-auto" />
          </button>

          <nav className="ml-auto hidden items-center gap-1 md:flex">
            <NavLink label="Playback Lab" onClick={() => onNavigate({ name: "lab" })} />
            <NavLink label="Dashboard" onClick={() => onNavigate({ name: "dashboard" })} />
            <NavLink label="Saved Sessions" onClick={() => onNavigate({ name: "saved" })} />
          </nav>

          <button
            type="button"
            onClick={() => toggleMode()}
            title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="ml-auto rounded-md border border-ink-700 bg-ink-900 p-2 text-ink-300 transition-colors hover:border-ink-600 hover:text-ink-100 md:ml-0"
          >
            {mode === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          {/* Sign in / account — same session store as the sidebar */}
          {account ? (
            <button
              type="button"
              onClick={() => onNavigate({ name: "dashboard" })}
              title={`Signed in as ${account.name}`}
              className="flex items-center gap-2 rounded-md border border-ink-700 bg-ink-900 px-2.5 py-1.5 transition-colors hover:border-ember-500/50"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ember-500/20 text-[10px] font-bold text-ember-300 ring-1 ring-ember-500/40">
                {initialsOf(account.name)}
              </span>
              <span className="hidden max-w-[9rem] truncate text-xs font-semibold text-ink-100 sm:block">
                {account.name}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate({ name: "auth" })}
              className="inline-flex items-center gap-1.5 rounded-md border border-ember-500/40 bg-ember-500/10 px-3 py-2 text-xs font-semibold text-ember-300 transition-colors hover:bg-ember-500/20"
            >
              <User size={13} />
              <span className="hidden sm:block">Sign in</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate({ name: "lab" })}
            className="rounded-md bg-ember-400 px-3.5 py-2 text-sm font-semibold text-ink-950 transition-colors hover:bg-ember-300"
          >
            Open Playback Lab
          </button>
        </div>
      </header>

      {/* ---------------------------------------------------------- Hero */}
      <section className="relative flex min-h-[100dvh] items-center overflow-hidden">
        {reducedMotion && (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 55% at 60% 60%, rgba(167,139,250,0.20), transparent 68%), radial-gradient(ellipse 45% 35% at 35% 40%, rgba(56,189,248,0.07), transparent 70%), linear-gradient(180deg, var(--color-ink-950), var(--color-ink-850) 60%, var(--color-ink-950))",
            }}
          />
        )}

        {/* Scrims: keep the copy zone dark without hiding the scene */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/60 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink-950 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-ink-950 to-transparent"
        />
        {/* Vignette for drama — .landing-vignette flips per mode in index.css */}
        <div
          aria-hidden
          className="landing-vignette pointer-events-none absolute inset-0"
        />
        {/* Subtle workshop grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(163,168,184,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(163,168,184,0.35) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 80% 70% at 60% 45%, black 25%, transparent 78%)",
          }}
        />

        {/* Copy — upper-left, guarded by the scrims */}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pt-32 pb-28">
          <div className="max-w-2xl">
            <motion.p
              {...fadeUp(0)}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-ember-500/30 bg-ember-500/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-ember-300"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ember-400" />
              </span>
              CodeAnvil · Forge your logic
            </motion.p>

            <h1
              className="text-4xl font-bold leading-[1.05] tracking-tighter sm:text-6xl"
              style={{
                textShadow:
                  mode === "dark"
                    ? "0 0 34px rgba(167,139,250,0.24), 0 18px 48px rgba(0,0,0,0.6)"
                    : "0 0 30px rgba(167,139,250,0.22), 0 14px 38px rgba(61,43,99,0.16)",
              }}
            >
              {reduce ? (
                <>
                  Code execution, <span className="text-forged">made visible.</span>
                </>
              ) : (
                ["Code", "execution,", "made", "visible."].map((w, i) => {
                  const last = i === 3;
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
                          duration: 0.75,
                          delay: 0.12 + i * 0.09,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                      >
                        {/* Gradient on a plain inner span — background-clip:
                            text breaks on composited layers. */}
                        {last ? (
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
            </h1>

            <motion.p
              {...fadeUp(0.16)}
              className="mt-5 max-w-xl text-base leading-relaxed text-ink-300"
            >
              Watch every variable, stack frame, and recursive call step
              through a program. Nothing executes — everything is a prebuilt
              trace.
            </motion.p>

            <motion.div
              {...fadeUp(0.24)}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <button
                type="button"
                onClick={() => onNavigate({ name: "lab" })}
                className="btn-shine group inline-flex items-center gap-2 rounded-md bg-ember-400 px-5 py-3 text-sm font-bold text-ink-950 transition-all hover:bg-ember-300 active:translate-y-px"
              >
                Launch Playback Lab
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("examples")
                    ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" })
                }
                className="inline-flex items-center gap-2 rounded-md border border-ink-600 bg-ink-900/60 px-5 py-3 text-sm font-semibold text-ink-200 transition-colors hover:border-ink-500 hover:text-ink-100"
              >
                Browse examples
              </button>
            </motion.div>

            <motion.dl {...fadeUp(0.32)} className="mt-12 flex items-center gap-6">
              {[
                { k: "execution steps", v: stats.steps },
                { k: "practice prompts", v: stats.prompts },
                { k: "curated examples", v: stats.examples },
              ].map((s, i) => (
                <div
                  key={s.k}
                  className={cn(
                    "flex flex-col",
                    i > 0 && "border-l border-ink-700/70 pl-6",
                  )}
                >
                  <dd className="order-1 font-mono text-2xl font-bold text-ember-300">
                    <CountUp value={s.v} />
                  </dd>
                  <dt className="order-2 text-[11px] uppercase tracking-wider text-ink-500">
                    {s.k}
                  </dt>
                </div>
              ))}
            </motion.dl>
          </div>
        </div>

        {/* Forge size control — scales the 3D scene */}
        {!reducedMotion && (
          <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3 rounded-xl border border-ink-700/80 bg-ink-900/75 px-3 py-2 backdrop-blur-md">
            <Box size={14} className="shrink-0 text-ember-300" />
            <span className="hidden text-[10px] font-semibold uppercase tracking-widest text-ink-400 sm:block">
              Forge size
            </span>
            <input
              type="range"
              min={0.6}
              max={1.6}
              step={0.05}
              value={sceneScale}
              onChange={(e) => changeScale(parseFloat(e.target.value))}
              aria-label="Forge scene size"
              className="trace-range w-24 sm:w-28"
            />
            <span className="w-10 font-mono text-[11px] font-semibold text-ink-100">
              {sceneScale.toFixed(1)}×
            </span>
            <button
              type="button"
              onClick={() => changeScale(1)}
              title="Reset forge size"
              className="rounded p-1 text-ink-500 transition-colors hover:bg-ink-800 hover:text-ember-300"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        )}

        {/* Scroll cue */}
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex">
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ink-500">
            Scroll to explore
          </span>
          <span className="flex h-9 w-5 items-start justify-center rounded-full border border-ink-600 p-1">
            <motion.span
              className="h-1.5 w-1 rounded-full bg-ember-300"
              animate={reduce ? undefined : { y: [0, 10, 0], opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
          </span>
        </div>
      </section>

      {/* ------------------------------------------------- Modules */}
      <section className="mx-auto max-w-7xl px-5 py-24">
        <motion.div {...fadeUp(0)} className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            A product family, not a one-page toy
          </h2>
          <p className="mt-4 max-w-xl text-ink-300">
            CodeAnvil ships as mini-modules inside one app. Every module below
            is live today — one icon click away — with the AR explainer
            still on the long-term anvil.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {/* Featured: Code Playback Lab (LIVE) */}
          <TiltCard intensity={3} className="min-w-0">
          <motion.div
            {...fadeUp(0.06)}
            className="relative overflow-hidden rounded-xl border border-ember-500/30 bg-gradient-to-br from-ink-900/80 via-ink-900/65 to-ink-950/80 p-7 backdrop-blur-md"
          >
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-ember-500/10 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ember-400/15 ring-1 ring-ember-500/40">
                  <Play size={18} className="text-ember-300" />
                </span>
                <Badge tone="green">Live now</Badge>
              </div>
              <h3 className="mt-4 text-xl font-bold tracking-tight">
                Code Playback Lab
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-300">
                The core experience. Step through real programs with line
                highlights, live variables, a growing call stack, console
                output, and a recursion tree that resolves before your eyes.
              </p>
              <ul className="mt-5 flex flex-wrap gap-2 text-xs text-ink-400">
                {[
                  `${EXAMPLES.length} examples`, `${stats.steps} steps`,
                  "recursion tree", "3D execution stage", "dry-run practice",
                ].map((t) => (
                  <li
                    key={t}
                    className="rounded-full border border-ink-700 bg-ink-800/70 px-2.5 py-1"
                  >
                    {t}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => onNavigate({ name: "lab" })}
                className="mt-6 inline-flex items-center gap-2 rounded-md bg-ember-400 px-4 py-2.5 text-sm font-bold text-ink-950 transition-all hover:bg-ember-300 active:translate-y-px"
              >
                Open Playback Lab
                <ArrowRight size={15} />
              </button>
            </div>
          </motion.div>
          </TiltCard>

          {/* Live modules */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {MODULES.map((m, i) => (
              <TiltCard key={m.id} intensity={5}>
              <motion.div
                {...fadeUp(0.08 + i * 0.05)}
                className="group flex flex-col gap-4 rounded-xl border border-ink-700/80 bg-ink-900/70 p-5 backdrop-blur-md"
              >
                <div className="flex gap-4">
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1",
                      m.planned
                        ? "bg-ink-800 ring-ink-600"
                        : "bg-ember-400/12 ring-ember-500/30",
                    )}
                  >
                    <m.icon
                      size={18}
                      className={m.planned ? "text-ink-300" : "text-ember-300"}
                    />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{m.title}</h3>
                      {m.planned ? (
                        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-ink-500">
                          <Lock size={10} /> Planned
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider text-verdant-400">
                          ● Live
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-400">
                      {m.line}
                    </p>
                  </div>
                </div>
                {!m.planned && m.route && (
                  <button
                    type="button"
                    onClick={() => onNavigate(m.route!)}
                    className="inline-flex items-center gap-1.5 self-start rounded-md border border-ember-500/40 bg-ember-500/10 px-3 py-1.5 text-xs font-semibold text-ember-300 transition-colors hover:bg-ember-500/20"
                  >
                    Open {m.title.split(" ")[0]}
                    <ArrowRight size={13} />
                  </button>
                )}
              </motion.div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- Examples */}
      <section id="examples" className="border-y border-ink-800/70 bg-ink-950/35 backdrop-blur-[2px]">
        <div className="mx-auto max-w-7xl px-5 py-24">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Start with a classic
            </h2>
            <p className="mt-4 text-ink-300">
              {EXAMPLES.length} curated programs, each with a hand-forged trace.
              Open one and press play.
            </p>
          </div>

          <div className="mt-10 divide-y divide-ink-700/70">
            {EXAMPLES.map((ex, i) => (
              <motion.div
                key={ex.id}
                {...fadeUp(0.04 * i)}
                className="flex items-center gap-4 py-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-ink-100">
                      {ex.title}
                    </h3>
                    <Badge tone="amber">{ex.topic}</Badge>
                    <Badge tone={ex.difficulty === "beginner" ? "green" : "blue"}>
                      {ex.difficulty}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-ink-400">
                    {ex.blurb}
                  </p>
                </div>
                <span className="hidden font-mono text-[11px] text-ink-500 sm:block">
                  {ex.trace.steps.length} steps
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: "lab", exampleId: ex.id })}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-ink-600 bg-ink-800 px-3 py-2 text-xs font-semibold text-ink-100 transition-colors hover:border-ember-500/50 hover:text-ember-300"
                >
                  <Play size={12} /> Open
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- Pipeline */}
      <section className="mx-auto max-w-7xl px-5 py-24">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How a trace is forged
          </h2>
          <p className="mt-4 text-ink-300">
            CodeAnvil never asks an AI to draw its animations. Parsed code
            becomes structured actions, and our own renderer turns them into
            motion.
          </p>
        </div>

        <ol className="mt-12 grid gap-4 md:grid-cols-4">
          {PIPELINE.map((p, i) => (
            <motion.li
              key={p.step}
              {...fadeUp(0.05 * i)}
              className="relative rounded-xl border border-ink-700/80 bg-ink-900/70 p-5 backdrop-blur-md"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-800 ring-1 ring-ink-600">
                  <p.icon size={16} className="text-ember-300" />
                </span>
                <span className="font-mono text-[11px] font-bold text-ink-500">
                  {p.step}
                </span>
              </div>
              <h3 className="mt-4 text-sm font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-400">
                {p.line}
              </p>
              {i < PIPELINE.length - 1 && (
                <ArrowRight
                  size={14}
                  className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-ink-600 md:block"
                />
              )}
            </motion.li>
          ))}
        </ol>

        <motion.div
          {...fadeUp(0.1)}
          className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-ink-700/80 bg-ink-900/55 px-6 py-5 backdrop-blur-md"
        >
          <div className="flex items-center gap-3">
            <Braces size={16} className="text-arc-400" />
            <div>
              <p className="text-sm font-semibold">Structured trace actions</p>
              <p className="text-xs text-ink-400">
                compare · swap · visit_node · push · pointer_move
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Workflow size={16} className="text-arc-400" />
            <div>
              <p className="text-sm font-semibold">CodeAnvil-owned renderer</p>
              <p className="text-xs text-ink-400">
                Three.js stage · Canvas · SVG · DOM panels
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ------------------------------------------------- Footer */}
      <footer className="border-t border-ink-800/70 bg-ink-950/35 backdrop-blur-[2px]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <BrandLogo className="h-9 w-auto" />
            <p className="mt-4 text-xs leading-relaxed text-ink-400">
              A visual, playable coding and DSA platform for students. Local
              first — your sessions stay in your browser.
            </p>
          </div>

          <div className="flex gap-12">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                Product
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate({ name: "lab" })}
                    className="text-ink-300 hover:text-ember-300"
                  >
                    Playback Lab
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate({ name: "dashboard" })}
                    className="text-ink-300 hover:text-ember-300"
                  >
                    Dashboard
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate({ name: "saved" })}
                    className="text-ink-300 hover:text-ember-300"
                  >
                    Saved Sessions
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                Project
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <a
                    href="docs/codeanvil-docs/README.md"
                    className="text-ink-300 hover:text-ember-300"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="docs/codeanvil-product-brief.md"
                    className="text-ink-300 hover:text-ember-300"
                  >
                    Product brief
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-ink-800/60">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-5 py-4 text-[11px] text-ink-500 sm:flex-row sm:items-center">
            <p>Prebuilt traces — nothing executes. No backend, no accounts.</p>
            <p className="font-mono">CodeAnvil · Forge Your Logic</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md px-3 py-2 text-sm font-medium text-ink-300 transition-colors hover:text-ember-300"
    >
      {label}
    </button>
  );
}
