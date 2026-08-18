import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Clock,
  Copy,
  CopyCheck,
  Flame,
  Ghost,
  Medal,
  Swords,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";
import { EXAMPLES, getExample } from "../data/examples";
import type { PracticePrompt } from "../types/trace";
import { Badge, Button, Card } from "../components/ui";
import { TiltCard } from "../components/TiltCard";
import { AnimatedHeading, CountUp } from "../components/motionfx";
import { bumpHeat } from "../engine/session";
import { sound } from "../engine/sound";
import { cn } from "../lib/cn";

interface DuelScore {
  id: string;
  name: string;
  correct: number;
  total: number;
  exampleId: string;
  date: string;
  daily: boolean;
}

const DUEL_KEY = "codeanvil.duel.v1";
const GHOST_KEY = "codeanvil.ghost.v1";
const SECONDS_PER_QUESTION = 20;
const DEFAULT_GHOST_MS = 14_000; // ms per question for a first-time ghost

function loadGhostTimes(): Record<string, number> {
  try {
    const raw = localStorage.getItem(GHOST_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function saveGhostTime(exampleId: string, msPerQuestion: number): void {
  const next = { ...loadGhostTimes(), [exampleId]: msPerQuestion };
  try {
    localStorage.setItem(GHOST_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function loadScores(): DuelScore[] {
  try {
    const raw = localStorage.getItem(DUEL_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as DuelScore[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveScore(score: DuelScore): DuelScore[] {
  const next = [...loadScores(), score]
    .sort((a, b) => b.correct / b.total - a.correct / a.total || b.correct - a.correct)
    .slice(0, 10);
  try {
    localStorage.setItem(DUEL_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/** Deterministic daily challenge: same example + questions for everyone, all day. */
function dailyChallenge(): { exampleId: string; prompts: PracticePrompt[] } | null {
  const day = new Date();
  const seed = day.getFullYear() * 10000 + (day.getMonth() + 1) * 100 + day.getDate();
  const ex = EXAMPLES[seed % EXAMPLES.length];
  if (!ex) return null;
  const prompts = [...ex.trace.practice];
  // Rotate the set by the day so the challenge changes daily.
  const shift = seed % Math.max(prompts.length, 1);
  const rotated = [...prompts.slice(shift), ...prompts.slice(0, shift)];
  return { exampleId: ex.id, prompts: rotated.slice(0, Math.min(3, rotated.length)) };
}

type Phase = "setup" | "question" | "result";

export function DuelScreen() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [exampleId, setExampleId] = useState<string>(EXAMPLES[0].id);
  const [daily, setDaily] = useState(false);
  const [questions, setQuestions] = useState<PracticePrompt[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(SECONDS_PER_QUESTION);
  const [name, setName] = useState("");
  const [scores, setScores] = useState<DuelScore[]>(loadScores);
  const [copied, setCopied] = useState(false);
  const [lastPicked, setLastPicked] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [race, setRace] = useState(false);
  const [ghostMs, setGhostMs] = useState(DEFAULT_GHOST_MS);
  const [raceElapsed, setRaceElapsed] = useState(0);
  const correctRef = useRef(0);

  const example = getExample(exampleId) ?? EXAMPLES[0];
  const question = questions[qIndex];
  const dailyInfo = useMemo(dailyChallenge, []);

  const startDuel = (exId: string, prompts: PracticePrompt[], isDaily: boolean) => {
    setExampleId(exId);
    setQuestions(prompts);
    setDaily(isDaily);
    setQIndex(0);
    setCorrect(0);
    correctRef.current = 0;
    setSecondsLeft(SECONDS_PER_QUESTION);
    setLastPicked(null);
    setFinished(false);
    setRace(false);
    setPhase("question");
  };

  /** Vs Ghost: same questions, but the ghost races at its recorded best pace. */
  const startGhostRace = (exId: string, prompts: PracticePrompt[]) => {
    startDuel(exId, prompts, false);
    setGhostMs(loadGhostTimes()[exId] ?? DEFAULT_GHOST_MS);
    setRaceElapsed(0);
    setRace(true);
  };

  const startDaily = () => {
    if (dailyInfo) startDuel(dailyInfo.exampleId, dailyInfo.prompts, true);
  };

  // Per-question countdown + ghost race clock.
  useEffect(() => {
    if (phase !== "question" || finished) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          advance(false);
          return 0;
        }
        return s - 1;
      });
      if (race) setRaceElapsed((e) => e + 1000);
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, qIndex, finished, question, race]);

  const advance = useCallback(
    (wasCorrect: boolean) => {
      if (wasCorrect) {
        correctRef.current += 1;
        setCorrect(correctRef.current);
      }
      setLastPicked(null);
      setSecondsLeft(SECONDS_PER_QUESTION);
      if (qIndex >= questions.length - 1) {
        setFinished(true);
        if (race) {
          // Record the better ghost: ms per correct answer, but never faster
          // than 4s — humans need a reaction window.
          const msPer = Math.max(4000, raceElapsed / Math.max(1, correctRef.current));
          const prev = loadGhostTimes()[exampleId];
          if (prev === undefined || msPer < prev) saveGhostTime(exampleId, msPer);
        }
        setPhase("result");
        sound.complete();
        bumpHeat(10);
      } else {
        setQIndex((i) => i + 1);
      }
    },
    [qIndex, questions.length, race, raceElapsed, exampleId],
  );

  const pick = (choice: string) => {
    if (!question || finished) return;
    setLastPicked(choice);
    const isCorrect = choice.trim().toLowerCase() === question.answer.trim().toLowerCase();
    if (isCorrect) {
      sound.correct();
      bumpHeat(4);
    } else {
      sound.wrong();
      bumpHeat(1);
    }
    window.setTimeout(() => advance(isCorrect), 250);
  };

  const submitScore = () => {
    const entry: DuelScore = {
      id: `duel-${Date.now().toString(36)}`,
      name: name.trim() || "Anonymous Forge",
      correct: correctRef.current,
      total: questions.length,
      exampleId,
      date: new Date().toISOString(),
      daily,
    };
    setScores(saveScore(entry));
    setPhase("setup");
    setCopied(false);
  };

  const shareText = () =>
    `I scored ${correctRef.current}/${questions.length} (${Math.round((correctRef.current / questions.length) * 100)}%) on "${example.title}" in CodeAnvil ${daily ? "— Daily Duel!" : ""} 🛠️ Forge your logic: codeanvil.local`;

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const pct = (c: number, t: number) => (t === 0 ? 0 : Math.round((c / t) * 100));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ember-400/15 ring-1 ring-ember-500/40">
            <Swords size={18} className="text-ember-300" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ember-400">
              Skill Duel · P2
            </p>
            <AnimatedHeading
              text="Race the clock. Beat your best."
              gradientLast
              className="text-2xl font-bold tracking-tight text-ink-100"
            />
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-300">
              Answer dry-run predictions against a timer. Your accuracy and speed
              feed a local leaderboard — the daily challenge resets every day.
            </p>
          </div>
        </div>

        {phase === "setup" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="space-y-4">
              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-ink-100">
                    Choose your duel
                  </h2>
                  {dailyInfo && (
                    <button
                      type="button"
                      onClick={startDaily}
                      className="btn-shine flex items-center gap-1.5 rounded-md border border-ember-500/50 bg-ember-500/15 px-3 py-1.5 text-xs font-semibold text-ember-300 transition-colors hover:bg-ember-500/25"
                    >
                      <Flame size={13} /> Today's challenge
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {EXAMPLES.filter((e) => e.trace.practice.length > 0).map((ex) => (
                    <div
                      key={ex.id}
                      className="flex items-center gap-3 rounded-lg border border-ink-700 bg-ink-850/60 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-100">
                          {ex.title}
                        </p>
                        <p className="text-[11px] text-ink-500">
                          {ex.trace.practice.length} prediction{" "}
                          {ex.trace.practice.length === 1 ? "prompt" : "prompts"} ·{" "}
                          {ex.topic}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => startGhostRace(ex.id, ex.trace.practice)}
                          title={`Race your best recorded run (${Math.round((loadGhostTimes()[ex.id] ?? DEFAULT_GHOST_MS) / 1000)}s/question)`}
                          className="flex h-8 items-center gap-1 rounded-md border border-ink-700 px-2.5 text-xs font-semibold text-ink-300 transition-colors hover:border-arc-500/50 hover:text-arc-300"
                        >
                          <Ghost size={13} /> Ghost
                        </button>
                        <Button
                          variant="primary"
                          onClick={() => startDuel(ex.id, ex.trace.practice, false)}
                        >
                          <Timer size={13} /> Duel
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {dailyInfo && (
                <Card className="p-4">
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-ember-400">
                    <Flame size={13} /> Daily Duel
                  </h3>
                  <p className="text-sm text-ink-200">
                    {getExample(dailyInfo.exampleId)?.title ?? "Example"} ·{" "}
                    {dailyInfo.prompts.length} questions ·{" "}
                    {SECONDS_PER_QUESTION}s each
                  </p>
                  <p className="mt-1 text-[11px] text-ink-500">
                    One deterministic set for everyone, refreshed at midnight.
                    Scores are marked with a daily badge.
                  </p>
                </Card>
              )}
            </div>

            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-200">
                <Medal size={15} className="text-ember-300" /> Local leaderboard
              </h2>
              {scores.length === 0 ? (
                <Card className="p-4 text-xs text-ink-400">
                  No duels yet. Complete one to claim a spot — top 10 kept in
                  this browser.
                </Card>
              ) : (
                <TiltCard intensity={3} spotlight={false}>
                <Card className="divide-y divide-ink-800 p-0">
                  {scores.map((s, i) => {
                    const ex = getExample(s.exampleId);
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 px-3 py-2.5"
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold",
                            i === 0
                              ? "bg-ember-500/25 text-ember-300 ring-1 ring-ember-500/50"
                              : "bg-ink-800 text-ink-400 ring-1 ring-ink-700",
                          )}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink-100">
                            {s.name}
                            {s.daily && (
                              <Flame
                                size={11}
                                className="ml-1.5 inline text-ember-400"
                              />
                            )}
                          </p>
                          <p className="truncate text-[10px] text-ink-500">
                            {ex?.title ?? s.exampleId} ·{" "}
                            {new Date(s.date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          tone={
                            pct(s.correct, s.total) >= 80
                              ? "green"
                              : pct(s.correct, s.total) >= 50
                                ? "amber"
                                : "red"
                          }
                        >
                          {s.correct}/{s.total}
                        </Badge>
                      </div>
                    );
                  })}
                </Card>
                </TiltCard>
              )}
            </div>
          </div>
        )}

        {phase === "question" && question && (
          <Card className="mx-auto max-w-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <Badge tone="amber">{example.title}</Badge>
              <div className="flex items-center gap-3">
                {/* 3D timer ring */}
                <div
                  className="timer-ring flex h-12 w-12 items-center justify-center rounded-full"
                  style={
                    {
                      "--pct": `${(secondsLeft / SECONDS_PER_QUESTION) * 100}%`,
                    } as React.CSSProperties
                  }
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-900 ring-1 ring-ink-700">
                    <Clock size={14} className="text-ember-300" />
                  </div>
                </div>
                <span className="font-mono text-sm font-bold text-ink-100">
                  {secondsLeft}s
                </span>
                <span className="font-mono text-xs text-ink-500">
                  {qIndex + 1} / {questions.length}
                </span>
              </div>
            </div>
            <h2 className="mb-5 text-lg font-semibold leading-snug text-ink-100">
              {question.question}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {question.choices?.map((choice) => {
                const chosen = lastPicked === choice;
                const isAnswer = choice.trim().toLowerCase() === question.answer.trim().toLowerCase();
                return (
                  <button
                    key={choice}
                    type="button"
                    disabled={lastPicked !== null}
                    onClick={() => pick(choice)}
                    className={cn(
                      "rounded-lg border px-4 py-3 text-left font-mono text-sm transition-colors",
                      lastPicked === null
                        ? "border-ink-700 bg-ink-850 text-ink-100 hover:border-ember-500/60 hover:bg-ember-500/10"
                        : chosen
                          ? isAnswer
                            ? "border-verdant-400 bg-verdant-500/15 text-verdant-300"
                            : "border-rose-400 bg-rose-500/15 text-rose-300"
                          : isAnswer
                            ? "border-verdant-400/60 bg-verdant-500/10 text-verdant-300"
                            : "border-ink-800 bg-ink-900 text-ink-500",
                    )}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
            {lastPicked !== null && (
              <p className="mt-4 text-xs leading-relaxed text-ink-400">
                {question.explanation}
              </p>
            )}
          </Card>
        )}

        {phase === "question" && race && (
          <Card className="mx-auto mt-5 max-w-2xl p-4">
            <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-500">
              <Zap size={11} className="text-arc-300" /> Versus — your ghost
            </p>
            {[
              { name: "You", value: correctRef.current / Math.max(1, questions.length), color: "#f59e0b", ms: 0 },
              { name: "Ghost", value: Math.min(1, raceElapsed / (ghostMs * Math.max(1, questions.length))), color: "#38bdf8", ms: raceElapsed },
            ].map((lane) => (
              <div key={lane.name} className="mb-2.5">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-ink-200">
                    {lane.name}
                    {lane.name === "Ghost" && <Ghost size={11} className="ml-1 inline text-arc-400" />}
                  </span>
                  <span className="font-mono text-[10px] text-ink-500">
                    {lane.name === "Ghost" ? `${Math.floor(raceElapsed / 1000)}s` : `${correctRef.current}${questions.length > 0 ? `/${questions.length}` : ""}`}
                  </span>
                </div>
                <div className="race-track h-3 overflow-hidden rounded-full border border-ink-700 bg-ink-900">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.round(lane.value * 100)}%`, background: lane.color, boxShadow: `0 0 10px ${lane.color}88` }}
                  />
                </div>
              </div>
            ))}
            <p className="mt-1 text-[10px] text-ink-500">
              Correct answers move you forward; the ghost runs at its best recorded pace
              ({Math.round(ghostMs / 1000)}s/question). Beat it and the ghost gets faster next time.
            </p>
          </Card>
        )}

        {phase === "result" && (
          <TiltCard intensity={4} spotlight={false} className="mx-auto max-w-2xl">
          <Card className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ember-500/20 ring-1 ring-ember-500/50">
              <Trophy size={26} className="text-ember-300" />
            </div>
            <h2 className="text-2xl font-bold text-ink-100">
              {pct(correct, questions.length) >= 80
                ? "Smashing forge work!"
                : pct(correct, questions.length) >= 50
                  ? "Solid effort!"
                  : "Back to the anvil."}
            </h2>
            <p className="mt-1 text-sm text-ink-400">
              <span className="font-mono font-bold text-ember-300">
                <CountUp value={correct} />
              </span>{" "}
              of {questions.length} correct on {example.title} (
              {pct(correct, questions.length)}%)
              {daily ? " — Daily Duel" : ""}
            </p>
            {race && (
              <p
                className={cn(
                  "mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                  correctRef.current / Math.max(1, questions.length) >=
                    Math.min(1, raceElapsed / (ghostMs * Math.max(1, questions.length)))
                    ? "border-verdant-500/50 bg-verdant-500/10 text-verdant-300"
                    : "border-arc-500/50 bg-arc-500/10 text-arc-300",
                )}
              >
                {correctRef.current / Math.max(1, questions.length) >=
                Math.min(1, raceElapsed / (ghostMs * Math.max(1, questions.length)))
                  ? "You beat the ghost!"
                  : "The ghost edged you out — rematch it."}
              </p>
            )}
            <div className="mx-auto mt-6 max-w-sm space-y-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name for the leaderboard"
                className="w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100 outline-none placeholder:text-ink-600 focus:border-ember-500/60"
              />
              <div className="flex gap-2">
                <Button variant="primary" className="flex-1" onClick={submitScore}>
                  <Medal size={14} /> Save to leaderboard
                </Button>
                <Button variant="ghost" onClick={copyShare} title="Copy shareable result">
                  {copied ? <CopyCheck size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Share"}
                </Button>
              </div>
            </div>
          </Card>
          </TiltCard>
        )}
      </div>
    </div>
  );
}
