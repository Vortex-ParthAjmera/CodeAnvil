import { useEffect, useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  Crown,
  Gamepad2,
  Lock,
  MapPin,
  Play,
  Sparkles,
  Star,
  Target,
  Unlock,
} from "lucide-react";
import {
  loadArenaModes,
  loadProgress,
  loadStory,
  setTheme,
  type ThemeId,
} from "../lib/storage";
import type { Route } from "../router";
import { Badge, Button, Card } from "../components/ui";
import { TiltCard } from "../components/TiltCard";
import { AnimatedHeading, CountUp, FadeIn } from "../components/motionfx";
import { cn } from "../lib/cn";

/** Orb accent colors per world — the worlds read as floating 3D spheres. */
const WORLD_ORBS: Record<WorldId, string> = {
  arrays: "#a78bfa",
  recursion: "#38bdf8",
  searching: "#34d399",
  sorting: "#a78bfa",
};

type WorldId = "arrays" | "recursion" | "searching" | "sorting";

interface Mission {
  id: string;
  world: WorldId;
  title: string;
  desc: string;
  kind: "watch" | "practice" | "arena";
  exampleId?: string;
  minAnswered?: number;
  minAccuracy?: number;
  reward: number;
  boss?: boolean;
}

const WORLDS: { id: WorldId; name: string; tagline: string; icon: typeof Star }[] = [
  { id: "arrays", name: "Arrays & Loops", tagline: "Walk lists, keep running totals.", icon: MapPin },
  { id: "recursion", name: "Recursion", tagline: "Call stacks and growing trees.", icon: Sparkles },
  { id: "searching", name: "Searching", tagline: "Halve ranges, find targets fast.", icon: Target },
  { id: "sorting", name: "Sorting", tagline: "Swaps, passes, and sorted prefixes.", icon: Crown },
];

const MISSIONS: Mission[] = [
  // Arrays & Loops
  { id: "watch-sum", world: "arrays", title: "Watch the total build", desc: "Open Sum of Array and step through the loop.", kind: "watch", exampleId: "sum-array", reward: 10 },
  { id: "predict-sum", world: "arrays", title: "Predict the total", desc: "Answer a dry-run prompt on Sum of Array with ≥ 80% accuracy.", kind: "practice", exampleId: "sum-array", minAnswered: 1, minAccuracy: 80, reward: 20 },
  { id: "watch-max", world: "arrays", title: "Track the maximum", desc: "Open Max in Array and watch max_val update.", kind: "watch", exampleId: "max-array", reward: 10 },
  { id: "boss-max", world: "arrays", title: "Boss: max mastery", desc: "Score 100% on a Max in Array dry run.", kind: "practice", exampleId: "max-array", minAnswered: 2, minAccuracy: 100, reward: 50, boss: true },
  // Recursion
  { id: "watch-fact", world: "recursion", title: "Watch the tree grow", desc: "Open Factorial Recursion and expand every call.", kind: "watch", exampleId: "factorial-recursion", reward: 10 },
  { id: "watch-fib", world: "recursion", title: "Fibonacci explosion", desc: "Open Fibonacci Recursion — 15 calls in one tree.", kind: "watch", exampleId: "fibonacci-recursion", reward: 10 },
  { id: "boss-fib", world: "recursion", title: "Boss: recursion reading", desc: "Score ≥ 80% on a Fibonacci dry run.", kind: "practice", exampleId: "fibonacci-recursion", minAnswered: 1, minAccuracy: 80, reward: 50, boss: true },
  // Searching
  { id: "watch-binsearch", world: "searching", title: "Halve the range", desc: "Open Binary Search and follow the probes.", kind: "watch", exampleId: "binary-search", reward: 10 },
  { id: "arena-search", world: "searching", title: "Arena: probe live", desc: "Visit the DSA Arena and run the binary search visualizer.", kind: "arena", reward: 10 },
  { id: "boss-bs", world: "searching", title: "Boss: predict the probe", desc: "Score ≥ 80% on a Binary Search dry run.", kind: "practice", exampleId: "binary-search", minAnswered: 1, minAccuracy: 80, reward: 50, boss: true },
  // Sorting
  { id: "watch-bubble", world: "sorting", title: "Bubble the largest", desc: "Open Bubble Sort and count the swaps.", kind: "watch", exampleId: "bubble-sort", reward: 10 },
  { id: "arena-sort", world: "sorting", title: "Arena: forge a race", desc: "Run a BFS vs DFS race on a maze you built.", kind: "arena", reward: 20 },
  { id: "boss-bubble", world: "sorting", title: "Boss: sort prediction", desc: "Score ≥ 80% on a Bubble Sort dry run.", kind: "practice", exampleId: "bubble-sort", minAnswered: 1, minAccuracy: 80, reward: 50, boss: true },
];

interface BadgeDef {
  id: string;
  name: string;
  desc: string;
  earned: (ctx: CompletionCtx) => boolean;
}

interface CompletionCtx {
  progress: ReturnType<typeof loadProgress>;
  arena: string[];
  completed: string[];
}

const BADGES: BadgeDef[] = [
  {
    id: "first-steps",
    name: "First Steps",
    desc: "Complete your first mission.",
    earned: (c) => c.completed.length >= 1,
  },
  {
    id: "trace-master",
    name: "Trace Master",
    desc: "Complete 5 missions.",
    earned: (c) => c.completed.length >= 5,
  },
  {
    id: "recursion-reader",
    name: "Recursion Reader",
    desc: "Finish every Recursion world mission.",
    earned: (c) =>
      MISSIONS.filter((m) => m.world === "recursion").every((m) =>
        c.completed.includes(m.id),
      ),
  },
  {
    id: "arena-rogue",
    name: "Arena Rogue",
    desc: "Visit the DSA Arena.",
    earned: (c) => c.arena.length > 0,
  },
  {
    id: "perfect-prediction",
    name: "Perfect Prediction",
    desc: "Score 100% on any dry run.",
    earned: (c) => c.progress.some((p) => p.bestAccuracy === 100 && p.answered > 0),
  },
  {
    id: "code-smelter",
    name: "Code Smelter",
    desc: "Earn 100+ XP.",
    earned: (c) =>
      MISSIONS.filter((m) => missionDone(m, c)).reduce((s, m) => s + m.reward, 0) >= 100,
  },
  {
    id: "forge-master",
    name: "Forge Master",
    desc: "Complete every mission.",
    earned: (c) => MISSIONS.every((m) => c.completed.includes(m.id)),
  },
];

const THEMES: { id: ThemeId; name: string; accent: string; unlockXp: number }[] = [
  { id: "ember", name: "Plasma Forge", accent: "#a78bfa", unlockXp: 0 },
  { id: "arc", name: "Arc Circuit", accent: "#38bdf8", unlockXp: 60 },
  { id: "verdant", name: "Verdant Grove", accent: "#34d399", unlockXp: 120 },
];

function missionDone(m: Mission, ctx: CompletionCtx): boolean {
  if (ctx.completed.includes(m.id)) return true;
  if (m.kind === "watch") {
    return !!ctx.progress.find((p) => p.exampleId === m.exampleId && p.lastOpenedAt);
  }
  if (m.kind === "practice") {
    const p = ctx.progress.find((rec) => rec.exampleId === m.exampleId);
    return !!p && p.answered >= (m.minAnswered ?? 1) && p.bestAccuracy >= (m.minAccuracy ?? 80);
  }
  if (m.kind === "arena") {
    // Per-mode visits: the search mission needs the search tab, the sort
    // mission needs the race tab (the actual race activity).
    if (m.id === "arena-search") return ctx.arena.includes("search");
    if (m.id === "arena-sort") return ctx.arena.includes("race");
    return ctx.arena.length > 0;
  }
  return false;
}

export function StoryScreen({
  onNavigate,
}: {
  onNavigate: (route: Route) => void;
}) {
  const [story, setStory] = useState(loadStory);
  const [progress] = useState(loadProgress);
  const [arena] = useState(loadArenaModes);

  // Apply the selected theme to the document root (CSS variable overrides).
  useEffect(() => {
    document.documentElement.dataset.theme = story.theme;
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, [story.theme]);

  const ctx: CompletionCtx = useMemo(
    () => ({ progress, arena, completed: story.completedMissions }),
    [progress, arena, story.completedMissions],
  );

  const totalXp = MISSIONS.filter((m) => missionDone(m, ctx)).reduce(
    (s, m) => s + m.reward,
    0,
  );
  const maxXp = MISSIONS.reduce((s, m) => s + m.reward, 0);

  const applyTheme = (t: ThemeId) => {
    setStory(setTheme(t));
  };

  const xpPct = Math.round((totalXp / maxXp) * 100);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ember-400/15 ring-1 ring-ember-500/40">
            <Gamepad2 size={18} className="text-ember-300" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ember-400">
              DSA Story Mode · P2
            </p>
            <AnimatedHeading
              text="Forge your way through the worlds."
              className="text-2xl font-bold tracking-tight text-ink-100"
            />
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-300">
              Missions turn watching and dry-run practice into progress. Complete
              them to earn XP, unlock badges, and repaint the forge.
            </p>
          </div>
        </div>

        {/* XP bar */}
        <Card className="mb-6 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink-400">
              <Star size={13} className="text-ember-300" /> Total XP
            </span>
            <span className="font-mono text-sm font-bold text-ink-100">
              <CountUp value={totalXp} /> / {maxXp}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-ink-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-ember-500 to-ember-300 transition-all duration-700"
              style={{ width: `${Math.max(xpPct, 1)}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            {THEMES.map((t) => {
              const unlocked = totalXp >= t.unlockXp;
              const active = story.theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => applyTheme(t.id)}
                  title={
                    unlocked
                      ? `Apply ${t.name} theme`
                      : `Unlock at ${t.unlockXp} XP (you have ${totalXp})`
                  }
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                    active
                      ? "border-ember-500/60 bg-ember-500/15 text-ember-300"
                      : unlocked
                        ? "border-ink-700 bg-ink-800 text-ink-200 hover:border-ink-600"
                        : "cursor-not-allowed border-ink-800 bg-ink-900 text-ink-600",
                  )}
                >
                  <span
                    className="inline-block h-3 w-3 rounded-full ring-2 ring-ink-700"
                    style={{ backgroundColor: t.accent }}
                  />
                  {t.name}
                  {active ? (
                    <CheckCircle2 size={12} />
                  ) : unlocked ? (
                    <Unlock size={12} />
                  ) : (
                    <Lock size={12} />
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Worlds */}
        <div className="space-y-6">
          {WORLDS.map((world, wi) => {
            const missions = MISSIONS.filter((m) => m.world === world.id);
            const done = missions.filter((m) => missionDone(m, ctx)).length;
            const Icon = world.icon;
            return (
              <FadeIn key={world.id} delay={wi * 0.08}>
              <TiltCard intensity={3}>
              <Card className="overflow-hidden p-0">
                <div className="relative flex items-center gap-3 overflow-hidden border-b border-ink-800 bg-ink-850/60 px-4 py-3">
                  <div className="orb pointer-events-none absolute -left-8 -top-10 h-28 w-28 animate-float opacity-40" style={{ "--orb-color": WORLD_ORBS[world.id], animationDelay: `${wi * 0.6}s` } as React.CSSProperties} />
                  <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-ember-400/12 ring-1 ring-ember-500/30">
                    <Icon size={16} className="text-ember-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-ink-100">
                      {world.name}
                    </h2>
                    <p className="text-[11px] text-ink-400">{world.tagline}</p>
                  </div>
                  <span className="font-mono text-xs text-ink-400">
                    {done}/{missions.length}
                  </span>
                </div>
                <div className="divide-y divide-ink-800">
                  {missions.map((m) => {
                    const isDone = missionDone(m, ctx);
                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-800/30"
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                            isDone
                              ? "bg-verdant-500/20 text-verdant-300 ring-1 ring-verdant-500/40"
                              : m.boss
                                ? "bg-ember-500/20 text-ember-300 ring-1 ring-ember-500/50"
                                : "bg-ink-800 text-ink-500 ring-1 ring-ink-700",
                          )}
                        >
                          {isDone ? <CheckCircle2 size={13} /> : m.boss ? <Crown size={12} /> : "·"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "text-sm font-medium",
                              isDone ? "text-ink-400 line-through decoration-ink-600" : "text-ink-100",
                            )}
                          >
                            {m.title}
                          </p>
                          <p className="text-[11px] text-ink-500">{m.desc}</p>
                        </div>
                        <Badge tone={m.boss ? "amber" : "neutral"}>
                          +{m.reward} XP
                        </Badge>
                        {isDone ? (
                          <span className="text-xs text-verdant-400">done</span>
                        ) : m.kind === "watch" && m.exampleId ? (
                          <Button
                            variant="ghost"
                            onClick={() =>
                              onNavigate({ name: "lab", exampleId: m.exampleId })
                            }
                          >
                            <Play size={13} /> Open
                          </Button>
                        ) : m.kind === "arena" ? (
                          <Button
                            variant="ghost"
                            onClick={() => onNavigate({ name: "arena" })}
                          >
                            <Play size={13} /> Arena
                          </Button>
                        ) : m.kind === "practice" && m.exampleId ? (
                          <Button
                            variant="ghost"
                            onClick={() =>
                              onNavigate({ name: "lab", exampleId: m.exampleId })
                            }
                          >
                            Practice
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </Card>
              </TiltCard>
              </FadeIn>
            );
          })}
        </div>

        {/* Badges */}
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-200">
            <Award size={15} className="text-ember-300" /> Achievements
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {BADGES.map((badge) => {
              const earned = badge.earned(ctx);
              return (
                <TiltCard key={badge.id} intensity={8} spotlight={earned}>
                <Card
                  className={cn(
                    "p-3 text-center transition-colors",
                    earned ? "border-ember-500/40" : "opacity-50",
                  )}
                >
                  <div
                    className={cn(
                      "mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full",
                      earned
                        ? "bg-ember-500/20 ring-1 ring-ember-500/50"
                        : "bg-ink-800 ring-1 ring-ink-700",
                    )}
                  >
                    {earned ? (
                      <Award size={18} className="text-ember-300" />
                    ) : (
                      <Lock size={14} className="text-ink-600" />
                    )}
                  </div>
                  <p className="text-xs font-semibold text-ink-100">{badge.name}</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-ink-500">
                    {badge.desc}
                  </p>
                </Card>
                </TiltCard>
              );
            })}
          </div>
        </section>

        <div className="mt-8 flex items-center gap-2 text-[11px] text-ink-600">
          Missions auto-complete as you use the lab and arena. XP and themes are
          stored locally in this browser.
        </div>
      </div>
    </div>
  );
}
