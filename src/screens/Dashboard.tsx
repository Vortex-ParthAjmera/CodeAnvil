import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Award,
  Flame,
  Hammer,
  Map as MapIcon,
  Play,
  RefreshCcw,
  Sparkles,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { EXAMPLES } from "../data/examples";
import { BrandLogo } from "../components/BrandLogo";
import {
  getSnapshot,
  progressStats,
  reviewQueue,
  subscribe,
} from "../lib/progress";
import { CORE_50, problemId } from "../data/roadmap";
import { DSA_PROBLEMS } from "../data/dsaCatalog";
import {
  loadArenaModes,
  loadProgress,
  loadSessions,
  type ProgressRecord,
  type SavedSession,
} from "../lib/storage";
import type { Route } from "../router";
import { Badge, Button, Card } from "../components/ui";
import { TiltCard } from "../components/TiltCard";
import { AnimatedHeading, CountUp, FadeIn } from "../components/motionfx";
import { initialsOf, useSession } from "../lib/auth";
import { cn } from "../lib/cn";

export function Dashboard({
  onNavigate,
}: {
  onNavigate: (route: Route) => void;
}) {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [arenaModes, setArenaModes] = useState<string[]>([]);

  useEffect(() => {
    setSessions(loadSessions());
    setProgress(loadProgress());
    setArenaModes(loadArenaModes());
  }, []);

  const bestAccuracy = progress.length
    ? Math.max(...progress.map((p) => p.bestAccuracy))
    : null;
  const totalSteps = EXAMPLES.reduce((sum, e) => sum + e.trace.steps.length, 0);

  // Topic progress: % of examples in each topic that have practice attempts.
  const topics = useMemo(() => {
    const byTopic = new Map<string, { attempted: number; total: number; best: number }>();
    for (const ex of EXAMPLES) {
      const entry = byTopic.get(ex.topic) ?? { attempted: 0, total: 0, best: 0 };
      entry.total += 1;
      const rec = progress.find((p) => p.exampleId === ex.id);
      if (rec && rec.answered > 0) {
        entry.attempted += 1;
        entry.best = Math.max(entry.best, rec.bestAccuracy);
      }
      byTopic.set(ex.topic, entry);
    }
    return [...byTopic.entries()].map(([topic, v]) => ({
      topic,
      ...v,
      pct: Math.round((v.attempted / v.total) * 100),
    }));
  }, [progress]);

  // Recommended next: least-accurate attempted example, else first unopened.
  const recommendation = useMemo(() => {
    const attempted = EXAMPLES.map((ex) => ({
      ex,
      rec: progress.find((p) => p.exampleId === ex.id),
    })).filter((x) => x.rec && x.rec.answered > 0);
    attempted.sort((a, b) => (a.rec?.bestAccuracy ?? 0) - (b.rec?.bestAccuracy ?? 0));
    if (attempted.length > 0) return attempted[0].ex;
    return EXAMPLES[0];
  }, [progress]);

  const badges = useMemo(() => {
    const list: { name: string; earned: boolean }[] = [
      { name: "First dry run", earned: progress.some((p) => p.answered > 0) },
      {
        name: "Perfect prediction",
        earned: progress.some((p) => p.bestAccuracy === 100 && p.answered > 0),
      },
      { name: "Arena visitor", earned: arenaModes.length > 0 },
      { name: "Session saver", earned: sessions.length > 0 },
      {
        name: "Full sweep",
        earned: progress.every(
          (p) => p.answered > 0 && p.bestAccuracy >= 80,
        ) && progress.length >= 4,
      },
    ];
    return list;
  }, [progress, arenaModes, sessions]);

  const recent = useMemo(
    () =>
      [...progress]
        .sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt))
        .slice(0, 4),
    [progress],
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Hero */}
        <div className="relative mb-8 overflow-hidden rounded-xl border border-ink-700 bg-gradient-to-br from-ink-900 via-ink-850 to-ink-950 p-6">
          {/* floating depth orbs */}
          <div className="orb pointer-events-none absolute -right-10 -top-14 h-44 w-44 animate-float-slow opacity-70" style={{ "--orb-color": "#0ea5e9" } as React.CSSProperties} />
          <div className="orb pointer-events-none absolute -bottom-16 right-24 h-32 w-32 animate-float opacity-60" style={{ "--orb-color": "#a78bfa" } as React.CSSProperties} />
          <div className="relative">
            <div className="mb-3 flex items-center gap-2">
              <BrandLogo className="h-8 w-auto" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ember-400">
                Forge your logic
              </p>
            </div>
            <AnimatedHeading
              text="Code execution, made visible."
              gradientLast
              className="mb-2 text-2xl font-bold tracking-tight text-ink-100"
            />
            <p className="max-w-xl text-sm leading-relaxed text-ink-300">
              Nine hand-forged examples, a 3D execution stage, a live DSA arena,
              story missions, and timed duels — all local-first, nothing ever
              executes user code.
            </p>
          </div>
        </div>

        {/* Real stats */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              icon: Play,
              label: "Examples",
              value: <CountUp value={EXAMPLES.length} />,
              hint: `${totalSteps} curated steps`,
            },
            {
              icon: Flame,
              label: "Practiced",
              value: (
                <CountUp
                  value={progress.filter((p) => p.answered > 0).length}
                />
              ),
              hint:
                progress.filter((p) => p.answered > 0).length === 0
                  ? "Try practice mode in the lab"
                  : "examples with dry-run attempts",
            },
            {
              icon: TrendingUp,
              label: "Best accuracy",
              value:
                bestAccuracy === null ? (
                  "—"
                ) : (
                  <>
                    <CountUp value={bestAccuracy} />%
                  </>
                ),
              hint: "dry-run predictions",
            },
            {
              icon: Trophy,
              label: "Saved sessions",
              value: <CountUp value={sessions.length} />,
              hint: "stored in this browser",
            },
          ].map((s, i) => (
            <FadeIn key={s.label} delay={0.08 + i * 0.08}>
              <TiltCard intensity={10}>
                <Card className="p-4">
                  <div className="mb-1 flex items-center gap-1.5 text-ink-500">
                    <s.icon size={13} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest">
                      {s.label}
                    </span>
                  </div>
                  <p className="font-mono text-2xl font-bold text-ink-100">
                    {s.value}
                  </p>
                  <p className="text-[11px] text-ink-500">{s.hint}</p>
                </Card>
              </TiltCard>
            </FadeIn>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {/* Examples */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink-200">
              Start playing
            </h2>
            <div className="space-y-2.5">
              {EXAMPLES.map((ex) => {
                const rec = progress.find((p) => p.exampleId === ex.id);
                return (
                  <TiltCard key={ex.id} intensity={4}>
                  <Card
                    className="flex items-center gap-4 p-4 transition-colors hover:border-ink-600"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-ink-100">
                          {ex.title}
                        </h3>
                        <Badge tone="amber">{ex.topic}</Badge>
                        <Badge
                          tone={ex.difficulty === "beginner" ? "green" : "blue"}
                        >
                          {ex.difficulty}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-400">
                        {ex.blurb}
                      </p>
                      {rec && rec.answered > 0 && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-ink-500">
                          <span className="inline-block h-1.5 w-24 overflow-hidden rounded-full bg-ink-700">
                            <span
                              className={cn(
                                "block h-full rounded-full",
                                rec.bestAccuracy >= 80
                                  ? "bg-verdant-400"
                                  : rec.bestAccuracy >= 50
                                    ? "bg-ember-400"
                                    : "bg-rose-400",
                              )}
                              style={{ width: `${rec.bestAccuracy}%` }}
                            />
                          </span>
                          best {rec.bestAccuracy}% · {rec.answered} prompt
                          {rec.answered === 1 ? "" : "s"}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => onNavigate({ name: "lab", exampleId: ex.id })}
                    >
                      <Play size={14} /> Open
                    </Button>
                  </Card>
                  </TiltCard>
                );
              })}
            </div>
          </section>

          {/* Right column */}
          <div className="space-y-6">
            {/* Account */}
            <AccountCard onNavigate={onNavigate} />

            {/* Learning: roadmap + spaced review */}
            <LearningCard onNavigate={onNavigate} />

            {/* Recommended next */}
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-200">
                <Sparkles size={14} className="text-ember-300" /> Recommended next
              </h2>
              <TiltCard intensity={6}>
              <Card className="border-ember-500/30 bg-gradient-to-br from-ink-900 to-ink-950 p-4">
                <div className="flex items-center gap-2">
                  <Badge tone="amber">{recommendation.topic}</Badge>
                  <Badge tone="blue">{recommendation.difficulty}</Badge>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-ink-100">
                  {recommendation.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-400">
                  {recommendation.blurb}
                </p>
                <Button
                  variant="primary"
                  className="mt-3"
                  onClick={() =>
                    onNavigate({ name: "lab", exampleId: recommendation.id })
                  }
                >
                  <Play size={13} /> Open
                </Button>
              </Card>
              </TiltCard>
            </section>

            {/* Progress by topic */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-ink-200">
                Progress by topic
              </h2>
              <TiltCard intensity={5}>
              <Card className="p-4">
                <div className="space-y-3">
                  {topics.map((t) => (
                    <div key={t.topic}>
                      <div className="mb-1 flex items-baseline justify-between">
                        <span className="text-xs font-medium text-ink-200">
                          {t.topic}
                        </span>
                        <span className="font-mono text-[10px] text-ink-500">
                          {t.attempted}/{t.total} · best {t.best}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
                        <div
                          className="h-full rounded-full bg-ember-400/80 transition-all"
                          style={{ width: `${t.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              </TiltCard>
            </section>

            {/* Badges */}
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-200">
                <Award size={14} className="text-ember-300" /> Badges
              </h2>
              <TiltCard intensity={5}>
              <Card className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  {badges.map((b) => (
                    <div
                      key={b.name}
                      className={cn(
                        "rounded-md border px-2.5 py-2 text-[11px]",
                        b.earned
                          ? "border-ember-500/40 bg-ember-500/10 text-ember-200"
                          : "border-ink-800 bg-ink-900 text-ink-500 opacity-60",
                      )}
                    >
                      <div
                        className={cn(
                          "mb-1 text-base",
                          b.earned ? "" : "grayscale",
                        )}
                      >
                        🏅
                      </div>
                      {b.name}
                    </div>
                  ))}
                </div>
              </Card>
              </TiltCard>
            </section>

            {/* Recent activity */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-ink-200">
                Recent activity
              </h2>
              {recent.length === 0 ? (
                <Card className="p-4 text-xs text-ink-400">
                  Nothing opened yet. Press{" "}
                  <span className="font-mono text-ember-300">Save session</span>{" "}
                  in the lab to keep your place.
                </Card>
              ) : (
                <div className="space-y-2">
                  {recent.map((p) => {
                    const ex = EXAMPLES.find((e) => e.id === p.exampleId);
                    if (!ex) return null;
                    const session = sessions.find(
                      (s) => s.exampleId === p.exampleId,
                    );
                    return (
                      <Card key={p.exampleId} className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink-100">
                            {ex.title}
                          </p>
                          <p className="font-mono text-[11px] text-ink-500">
                            {session
                              ? `step ${session.stepIndex + 1} / ${ex.trace.steps.length} · `
                              : ""}
                            {new Date(p.lastOpenedAt).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            onNavigate({
                              name: "lab",
                              exampleId: ex.id,
                              stepIndex: session?.stepIndex,
                            })
                          }
                        >
                          Resume
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function LearningCard({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const progress = useSyncExternalStore(subscribe, getSnapshot);
  const stats = progressStats();
  const due = reviewQueue();
  const tackled = CORE_50.filter(
    ([t, title]) => (progress.statuses[problemId([t, title])] ?? "none") !== "none",
  ).length;
  const nextUntouched = CORE_50.find(([t, title]) => {
    return (progress.statuses[problemId([t, title])] ?? "none") === "none";
  });
  const dueProblems = due
    .map((entry) => DSA_PROBLEMS.find((p) => p.id === entry.problemId))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 3);

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-200">
        <MapIcon size={14} className="text-ember-300" /> Learning
      </h2>
      <TiltCard intensity={5}>
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-ink-100">
              Roadmap progress
            </p>
            <Badge tone={tackled >= 25 ? "green" : tackled > 0 ? "amber" : "neutral"}>
              {tackled}/{CORE_50.length} core
            </Badge>
          </div>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-ink-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-arc-400 via-ember-400 to-verdant-400 transition-all"
              style={{ width: `${Math.round((tackled / CORE_50.length) * 100)}%` }}
            />
          </div>
          {nextUntouched ? (
            <button
              type="button"
              onClick={() => onNavigate({ name: "roadmap" })}
              className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-left transition-colors hover:border-ember-500/50"
            >
              <p className="text-[10px] uppercase tracking-widest text-ink-500">Next up</p>
              <p className="text-xs font-semibold text-ink-100">{nextUntouched[1]}</p>
              <p className="text-[10px] text-ink-500">{nextUntouched[0]} · open the Roadmap</p>
            </button>
          ) : (
            <p className="text-xs text-verdant-300">All Core 50 touched — keep going!</p>
          )}
          <div className="mt-3 border-t border-ink-800 pt-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-500">
              <RefreshCcw size={10} className="text-arc-300" /> Spaced review · {stats.due} due
            </p>
            {dueProblems.length === 0 ? (
              <p className="text-[11px] text-ink-500">
                Nothing due today — mark problems in the Atlas to schedule reviews.
              </p>
            ) : (
              <div className="space-y-1.5">
                {dueProblems.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onNavigate({ name: "atlas" })}
                    className="flex w-full items-center gap-2 rounded-md border border-ink-800 bg-ink-900/70 px-2.5 py-1.5 text-left transition-colors hover:border-ink-600"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-arc-400" />
                    <span className="min-w-0 flex-1 truncate text-xs text-ink-200">{p.title}</span>
                    <Badge tone="blue">review</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>
      </TiltCard>
    </section>
  );
}

function AccountCard({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const account = useSession();
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-200">
        <Hammer size={14} className="text-ember-300" /> Account
      </h2>
      {account ? (
        <TiltCard intensity={5}>
          <Card className="flex items-center gap-3 border-ember-500/25 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ember-500/20 text-sm font-bold text-ember-300 ring-1 ring-ember-500/40">
              {initialsOf(account.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-100">{account.name}</p>
              <p className="truncate text-[11px] text-ink-500">
                {account.provider === "google" ? "Signed in with Google" : account.email}
              </p>
            </div>
            <Badge tone="green">signed in</Badge>
          </Card>
        </TiltCard>
      ) : (
        <TiltCard intensity={5}>
          <Card className="p-4">
            <p className="text-sm font-medium text-ink-100">Sign in to keep your progress</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-400">
              Your XP, saved sessions, and duels live in this browser today.
              An account unlocks the sync layer when the backend ships — try the
              demo now.
            </p>
            <Button
              variant="primary"
              className="mt-3"
              onClick={() => onNavigate({ name: "auth" })}
            >
              Sign in / Sign up
            </Button>
          </Card>
        </TiltCard>
      )}
    </section>
  );
}
