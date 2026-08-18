import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  Binary,
  Boxes,
  Braces,
  Check,
  ChevronDown,
  CircleDashed,
  Database,
  ExternalLink,
  GitCommitHorizontal,
  Network,
  Pause,
  Play,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import type { Route } from "../router";
import {
  DATA_STRUCTURES,
  DSA_PROBLEMS,
  DSA_SOURCE_LINKS,
  DSA_TOPICS,
  leetCodeSearchUrl,
  makeProblemStarter,
  VISUALIZER_DRAFT_KEY,
  type DataStructureGuide,
  type DsaProblem,
} from "../data/dsaCatalog";
import { StructureStage3D } from "../components/three/StructureStage3D";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Badge, Button, Card } from "../components/ui";
import { AnimatedHeading, HudFrame } from "../components/motionfx";
import { cn } from "../lib/cn";
import {
  getSnapshot,
  markReviewed,
  progressStats,
  reviewQueue,
  setStatus,
  subscribe,
  type ProblemStatus,
} from "../lib/progress";
import { companiesFor, COMPANIES } from "../data/companyTags";
import { CORE_50_SET, nextProblemId } from "../data/roadmap";
import { PATTERNS, type DsaPattern } from "../data/patterns";
import { ThreeBars } from "../components/three/ThreeBars";

type View = "structures" | "problems" | "progress" | "patterns";
type DifficultyFilter = "all" | DsaProblem["difficulty"];

const FAMILY_ICONS = {
  Linear: Boxes,
  Hashing: Database,
  Trees: Binary,
  Graphs: Network,
  Advanced: Braces,
};

function difficultyTone(difficulty: DsaProblem["difficulty"]): "green" | "blue" | "red" {
  return difficulty === "beginner" ? "green" : difficulty === "intermediate" ? "blue" : "red";
}

const NEXT_STATUS: Record<ProblemStatus, ProblemStatus> = {
  none: "attempted",
  attempted: "solved",
  solved: "mastered",
  mastered: "none",
};

const STATUS_LABEL: Record<ProblemStatus, string> = {
  none: "not started",
  attempted: "attempted",
  solved: "solved",
  mastered: "mastered",
};

const STATUS_BAR: Record<ProblemStatus, string> = {
  none: "#262833",
  attempted: "#38bdf8",
  solved: "#34d399",
  mastered: "#f59e0b",
};

function StructureCard({
  structure,
  selected,
  onSelect,
}: {
  structure: DataStructureGuide;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = FAMILY_ICONS[structure.family];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group w-full rounded-xl border p-4 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-400",
        selected
          ? "border-ember-500/60 bg-ember-500/10 shadow-[0_0_28px_rgba(245,158,11,0.12)]"
          : "border-ink-700 bg-ink-900 hover:-translate-y-0.5 hover:border-ink-600",
      )}
    >
      <div className="mb-4 flex items-start justify-between">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", selected ? "border-ember-500/40 bg-ember-500/15 text-ember-300" : "border-ink-700 bg-ink-950 text-arc-300")}>
          <Icon size={16} />
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-500">{structure.family}</span>
      </div>
      <h3 className="text-sm font-semibold text-ink-100">{structure.name}</h3>
      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-400">{structure.summary}</p>
      <div className="mt-3 flex items-center justify-between border-t border-ink-800 pt-3 font-mono text-[10px] text-ink-500">
        <span>search {structure.search}</span>
        <ArrowRight size={12} className={cn("transition-transform group-hover:translate-x-0.5", selected && "text-ember-300")} />
      </div>
    </button>
  );
}

function ProblemRow({ problem, onVisualize }: { problem: DsaProblem; onVisualize: () => void }) {
  const status = useSyncExternalStore(subscribe, getSnapshot).statuses[problem.id] ?? "none";
  const next = nextProblemId(problem.id);
  const nextTitle = next ? DSA_PROBLEMS.find((p) => p.id === next)?.title : undefined;
  const companies = companiesFor(problem.id);
  const isCore = CORE_50_SET.has(problem.id);
  return (
    <div id={`row-${problem.id}`} className="group grid gap-3 border-b border-ink-800 px-4 py-3 transition-colors last:border-b-0 hover:bg-ink-800/45 sm:grid-cols-[minmax(0,1fr)_120px_80px_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-medium text-ink-100">{problem.title}</h3>
          <Badge tone={difficultyTone(problem.difficulty)}>{problem.difficulty}</Badge>
          {isCore && <Badge tone="amber">Core</Badge>}
          {problem.exampleId && <span className="h-1.5 w-1.5 rounded-full bg-ember-400 shadow-[0_0_8px_#f59e0b]" title="Polished 3D trace available" />}
          {companies.slice(0, 2).map((c) => (
            <span key={c} className="hidden text-[9px] uppercase tracking-wider text-ink-600 lg:inline">
              {c}
            </span>
          ))}
          {companies.length > 2 && (
            <span className="hidden text-[9px] text-ink-600 lg:inline">+{companies.length - 2}</span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-500">{problem.summary}</p>
      </div>
      <span className="truncate font-mono text-[10px] text-arc-300/85">{problem.pattern}</span>
      <span className="font-mono text-[10px] text-ink-400">{problem.complexity}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setStatus(problem.id, NEXT_STATUS[status])}
          title={`Status: ${STATUS_LABEL[status]} — click to mark ${STATUS_LABEL[NEXT_STATUS[status]]}`}
          className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors"
          style={{ borderColor: STATUS_BAR[status], color: status === "none" ? "#4a4e5e" : STATUS_BAR[status], background: status === "none" ? "transparent" : `${STATUS_BAR[status]}14` }}
        >
          {status === "none" ? <CircleDashed size={12} /> : status === "mastered" ? <Check size={12} /> : <span className="h-2 w-2 rounded-full" style={{ background: STATUS_BAR[status] }} />}
        </button>
        <a
          href={leetCodeSearchUrl(problem.title)}
          target="_blank"
          rel="noreferrer"
          title={`Open “${problem.title}” on LeetCode`}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-ink-700 text-ink-500 transition-colors hover:border-arc-500/50 hover:text-arc-300"
        >
          <ExternalLink size={12} />
        </a>
        <Button variant={problem.exampleId ? "primary" : "ghost"} className="h-8 px-2.5 text-xs" onClick={onVisualize}>
          <Play size={12} /> {problem.exampleId ? "Visualize" : "Open"}
        </Button>
        {next && nextTitle && (
          <button
            type="button"
            title={`Next in the roadmap: ${nextTitle}`}
            onClick={() => { document.getElementById(`row-${next}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
            className="hidden h-8 w-8 items-center justify-center rounded-md border border-ink-700 text-ink-500 transition-colors hover:border-ember-500/50 hover:text-ember-300 xl:flex"
          >
            <GitCommitHorizontal size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

/** A looping 3D bar demo for a pattern's canned state sequence. */
function PatternDemo({ pattern }: { pattern: DsaPattern }) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const demo = pattern.demo;

  useEffect(() => {
    if (!playing || !demo) return;
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % demo.states.length);
    }, 1500);
    return () => window.clearInterval(id);
  }, [playing, demo]);

  return (
    <div className="flex h-full min-h-[280px] flex-col">
      {demo ? (
        <>
          <div className="min-h-[220px] flex-1">
            <ThreeBars
              values={demo.values}
              states={demo.states[idx]?.marks ?? []}
              highlightIdx={demo.states[idx]?.marks[0]?.index ?? null}
              autoRotate
            />
          </div>
          <div className="flex items-center gap-2 border-t border-ink-800 px-3 py-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-ink-700 bg-ink-800 text-ink-300 transition-colors hover:border-ember-500/50 hover:text-ember-300"
            >
              {playing ? <Pause size={12} /> : <Play size={12} />}
            </button>
            <input
              type="range"
              min={0}
              max={demo.states.length - 1}
              value={idx}
              onChange={(e) => { setIdx(Number(e.target.value)); setPlaying(false); }}
              className="trace-range w-full"
              aria-label="Demo position"
            />
            <span className="font-mono text-[10px] text-ink-400">{idx + 1}/{demo.states.length}</span>
          </div>
          <div className="border-t border-ink-800 bg-ink-900 px-3 py-2 text-[11px] text-ink-300">
            {demo.states[idx]?.label ?? ""}
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <Target size={22} className="text-ink-600" />
          <p className="mt-3 text-xs leading-relaxed text-ink-400">
            This pattern's full 3D demo lives in the Arena — open it from the
            sidebar and race BFS vs DFS live.
          </p>
        </div>
      )}
    </div>
  );
}


function PatternLab() {
  const [selectedId, setSelectedId] = useState<string>(PATTERNS[0].id);
  const pattern = PATTERNS.find((p) => p.id === selectedId) ?? PATTERNS[0];
  const problems = useMemo(
    () => DSA_PROBLEMS.filter((p) => pattern.topics.includes(p.topic)).slice(0, 10),
    [pattern],
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="space-y-1.5">
        {PATTERNS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedId(p.id)}
            className={cn(
              "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
              p.id === selectedId
                ? "border-ember-500/60 bg-ember-500/10"
                : "border-ink-700 bg-ink-900 hover:border-ink-600",
            )}
          >
            <p className={cn("text-xs font-semibold", p.id === selectedId ? "text-ember-300" : "text-ink-100")}>
              {p.name}
            </p>
            <p className="mt-0.5 text-[10px] text-ink-500">{p.tagline}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="flex flex-col overflow-hidden p-0">
          <div className="border-b border-ink-700 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-ink-100">{pattern.name}</h3>
              <Badge tone="blue">{pattern.complexity}</Badge>
            </div>
            <p className="mt-1 text-xs italic text-ink-400">“{pattern.tagline}”</p>
          </div>
          <HudFrame label="3D pattern demo" right="loops · drag to orbit" sweep={false} className="flex-1">
            <ErrorBoundary label="pattern demo">
              <PatternDemo pattern={pattern} />
            </ErrorBoundary>
          </HudFrame>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-ink-500">
              The story
            </p>
            <p className="text-xs leading-relaxed text-ink-300">{pattern.story}</p>
          </Card>
          <Card className="p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-ink-500">
              When to reach for it
            </p>
            <ul className="space-y-1.5">
              {pattern.cues.map((cue) => (
                <li key={cue} className="flex items-start gap-2 text-xs text-ink-300">
                  <Check size={12} className="mt-0.5 shrink-0 text-verdant-400" />
                  {cue}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-ink-500">
              Classic problems
            </p>
            <div className="space-y-1">
              {problems.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate text-ink-200">{p.title}</span>
                  <Badge tone={difficultyTone(p.difficulty)}>{p.difficulty}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProgressView() {
  const progress = useSyncExternalStore(subscribe, getSnapshot);
  const stats = progressStats();
  const due = reviewQueue();

  const byTopic = useMemo(() => {
    const map = new Map<string, DsaProblem[]>();
    for (const p of DSA_PROBLEMS) {
      const list = map.get(p.topic) ?? [];
      list.push(p);
      map.set(p.topic, list);
    }
    return map;
  }, []);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            [stats.attempted, "touched"],
            [stats.solved, "solved"],
            [stats.mastered, "mastered"],
            [stats.due, "reviews due"],
            [stats.streak, "day streak"],
          ].map(([value, label]) => (
            <Card key={label as string} className="p-3 text-center">
              <p className="font-mono text-xl font-bold text-ember-300">{value}</p>
              <p className="text-[9px] uppercase tracking-widest text-ink-500">{label}</p>
            </Card>
          ))}
        </div>

        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-ink-500">
          The full matrix — every problem, colored by status
        </p>
        <div className="space-y-4">
          {[...byTopic.entries()].map(([topicName, problems]) => {
            const done = problems.filter((p) => (progress.statuses[p.id] ?? "none") !== "none").length;
            return (
              <div key={topicName}>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-semibold text-ink-200">{topicName}</p>
                  <span className="font-mono text-[10px] text-ink-500">{done}/{problems.length}</span>
                </div>
                <div className="grid grid-cols-10 gap-1 sm:grid-cols-16 lg:grid-cols-20">
                  {problems.map((p) => {
                    const status = progress.statuses[p.id] ?? "none";
                    return (
                      <button
                        key={p.id}
                        type="button"
                        title={`${p.title} — ${STATUS_LABEL[status]} (click to cycle)`}
                        onClick={() => setStatus(p.id, NEXT_STATUS[status])}
                        className="h-4 w-full rounded-sm border transition-transform hover:scale-125"
                        style={{ borderColor: STATUS_BAR[status], background: status === "none" ? "rgba(18,19,24,0.5)" : `${STATUS_BAR[status]}26` }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-100">
          <Sparkles size={14} className="text-ember-300" /> Review queue
        </h3>
        {due.length === 0 ? (
          <Card className="p-4 text-xs text-ink-400">
            Nothing due today. Mark problems as attempted/solved to schedule spaced
            reviews — mastered problems graduate out of the loop.
          </Card>
        ) : (
          <div className="space-y-2">
            {due.map((entry) => {
              const p = DSA_PROBLEMS.find((x) => x.id === entry.problemId);
              if (!p) return null;
              return (
                <div key={entry.problemId} className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-ink-100">{p.title}</p>
                    <p className="text-[10px] text-ink-500">{p.topic} · next review in {entry.interval}d</p>
                  </div>
                  <Button
                    variant="ghost"
                    className="h-7 px-2 text-[10px]"
                    onClick={() => markReviewed(entry.problemId)}
                  >
                    <Check size={11} /> Reviewed
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-[10px] leading-relaxed text-ink-500">
          Spaced repetition: attempted → review in 1 day, solved → 3 days, mastered →
          graduates. Each review doubles the interval, up to 30 days.
        </p>
      </div>
    </div>
  );
}

export function DsaAtlasScreen({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const [view, setView] = useState<View>("structures");
  const [selected, setSelected] = useState<DataStructureGuide>(DATA_STRUCTURES[0]);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [company, setCompany] = useState("all");
  const [coreOnly, setCoreOnly] = useState(false);
  const [limit, setLimit] = useState(60);

  const stats = progressStats();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return DSA_PROBLEMS.filter((problem) => {
      const matchesText = !needle || `${problem.title} ${problem.topic} ${problem.pattern} ${problem.summary}`.toLowerCase().includes(needle);
      const matchesCompany = company === "all" || companiesFor(problem.id).includes(company);
      const matchesCore = !coreOnly || CORE_50_SET.has(problem.id);
      return matchesText && matchesCompany && matchesCore && (topic === "all" || problem.topic === topic) && (difficulty === "all" || problem.difficulty === difficulty);
    });
  }, [query, topic, difficulty, company, coreOnly]);

  function visualize(problem: DsaProblem) {
    sessionStorage.setItem(VISUALIZER_DRAFT_KEY, makeProblemStarter(problem));
    onNavigate({ name: "visualize" });
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 px-5 py-6 sm:px-7">
          <div className="atlas-grid pointer-events-none absolute inset-0 opacity-50" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Badge tone="amber"><Sparkles size={11} /> DSA Atlas</Badge>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">live reference / 2026 edition</span>
              </div>
              <AnimatedHeading
                text="Every pattern needs a shape."
                gradientLast
                className="max-w-3xl text-3xl font-semibold tracking-[-0.035em] text-ink-100 sm:text-4xl"
              />
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-300">
                A searchable field guide to core data structures and {DSA_PROBLEMS.length} interview-grade problems, organized by the patterns that solve them.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-ink-700 bg-ink-700 xl:w-[390px]">
              {[[DATA_STRUCTURES.length, "structures"], [DSA_PROBLEMS.length, "problems"], [DSA_TOPICS.length, "tracks"]].map(([value, label]) => (
                <div key={label} className="bg-ink-950/80 px-4 py-3">
                  <p className="font-mono text-xl font-semibold text-ink-100">{value}</p>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-ink-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="my-5 flex w-fit rounded-lg border border-ink-700 bg-ink-900 p-1">
          <button type="button" onClick={() => setView("structures")} className={cn("rounded-md px-4 py-2 text-xs font-semibold transition-colors", view === "structures" ? "bg-ember-400 text-ink-950" : "text-ink-400 hover:text-ink-100")}>Data structures</button>
          <button type="button" onClick={() => setView("problems")} className={cn("rounded-md px-4 py-2 text-xs font-semibold transition-colors", view === "problems" ? "bg-ember-400 text-ink-950" : "text-ink-400 hover:text-ink-100")}>Problem library <span className="ml-1 opacity-65">{DSA_PROBLEMS.length}</span></button>
          <button type="button" onClick={() => setView("progress")} className={cn("rounded-md px-4 py-2 text-xs font-semibold transition-colors", view === "progress" ? "bg-ember-400 text-ink-950" : "text-ink-400 hover:text-ink-100")}>My progress <span className="ml-1 opacity-65">{stats.attempted}</span></button>
          <button type="button" onClick={() => setView("patterns")} className={cn("rounded-md px-4 py-2 text-xs font-semibold transition-colors", view === "patterns" ? "bg-ember-400 text-ink-950" : "text-ink-400 hover:text-ink-100")}>Patterns <span className="ml-1 opacity-65">{PATTERNS.length}</span></button>
        </div>

        {view === "structures" ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(400px,0.75fr)]">
            <section className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {DATA_STRUCTURES.map((structure) => <StructureCard key={structure.id} structure={structure} selected={selected.id === structure.id} onSelect={() => setSelected(structure)} />)}
            </section>
            <aside className="xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]">
              <Card className="flex h-full min-h-[560px] flex-col overflow-hidden p-0">
                <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-ember-400">3D anatomy</p>
                    <h2 className="text-lg font-semibold text-ink-100">{selected.name}</h2>
                  </div>
                  <Badge tone="blue">drag to orbit</Badge>
                </div>
                <HudFrame
                  label={selected.name}
                  right="drag to orbit"
                  sweep={false}
                  ambient={false}
                  className="min-h-[280px] flex-1"
                >
                  <ErrorBoundary
                    label="3D anatomy"
                    fallback={
                      <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 p-6 text-center">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink-700 bg-ink-950 text-arc-300">
                          {(() => {
                            const Icon = FAMILY_ICONS[selected.family];
                            return <Icon size={18} />;
                          })()}
                        </span>
                        <p className="text-sm font-semibold text-ink-100">{selected.name}</p>
                        <p className="max-w-xs text-[11px] leading-relaxed text-ink-500">
                          3D view isn't available in this browser (WebGL). The full
                          reference below still works — search, access, insert, delete.
                        </p>
                      </div>
                    }
                  >
                    <StructureStage3D structure={selected} />
                  </ErrorBoundary>
                </HudFrame>
                <div className="border-t border-ink-700 p-4">
                  <p className="text-xs leading-relaxed text-ink-300">{selected.summary}</p>
                  <div className="mt-4 grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-ink-700 bg-ink-700">
                    {[["access", selected.access], ["search", selected.search], ["insert", selected.insert], ["delete", selected.remove]].map(([label, value]) => (
                      <div key={label} className="bg-ink-950 px-2 py-2.5 text-center">
                        <p className="font-mono text-xs font-semibold text-arc-300">{value}</p>
                        <p className="mt-1 text-[8px] uppercase tracking-widest text-ink-500">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">{selected.operations.map((operation) => <Badge key={operation} tone="neutral">{operation}</Badge>)}</div>
                </div>
              </Card>
            </aside>
          </div>
        ) : view === "progress" ? (
          <ProgressView />
        ) : view === "patterns" ? (
          <PatternLab />
        ) : (
          <section>
            <div className="mb-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_150px_160px_auto]">
              <label className="flex h-11 items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 focus-within:border-ember-500/60">
                <Search size={15} className="text-ink-500" />
                <input value={query} onChange={(event) => { setQuery(event.target.value); setLimit(60); }} placeholder="Search problems, patterns, or topics…" className="min-w-0 flex-1 bg-transparent text-sm text-ink-100 outline-none placeholder:text-ink-600" />
                {query && <span className="font-mono text-[10px] text-ink-500">{filtered.length} found</span>}
              </label>
              <label className="relative">
                <select value={topic} onChange={(event) => { setTopic(event.target.value); setLimit(60); }} className="h-11 w-full appearance-none rounded-lg border border-ink-700 bg-ink-900 px-3 pr-9 text-xs text-ink-200 outline-none focus:border-ember-500/60">
                  <option value="all">All {DSA_TOPICS.length} topics</option>
                  {DSA_TOPICS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3.5 text-ink-500" />
              </label>
              <label className="relative">
                <select value={difficulty} onChange={(event) => { setDifficulty(event.target.value as DifficultyFilter); setLimit(60); }} className="h-11 w-full appearance-none rounded-lg border border-ink-700 bg-ink-900 px-3 pr-9 text-xs text-ink-200 outline-none focus:border-ember-500/60">
                  <option value="all">All difficulties</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3.5 text-ink-500" />
              </label>
              <label className="relative">
                <select value={company} onChange={(event) => { setCompany(event.target.value); setLimit(60); }} className="h-11 w-full appearance-none rounded-lg border border-ink-700 bg-ink-900 px-3 pr-9 text-xs text-ink-200 outline-none focus:border-ember-500/60">
                  <option value="all">All companies</option>
                  {COMPANIES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3.5 text-ink-500" />
              </label>
              <button
                type="button"
                onClick={() => { setCoreOnly((v) => !v); setLimit(60); }}
                className={cn("flex h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors", coreOnly ? "border-ember-500/60 bg-ember-500/15 text-ember-300" : "border-ink-700 bg-ink-900 text-ink-400 hover:border-ink-600")}
              >
                <Target size={13} /> Core 50 {coreOnly && <Check size={12} />}
              </button>
            </div>

            <Card className="overflow-hidden p-0">
              <div className="hidden grid-cols-[minmax(0,1fr)_140px_92px_86px] border-b border-ink-700 bg-ink-950/70 px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-500 sm:grid">
                <span>Problem</span><span>Pattern</span><span>Complexity</span><span>Action</span>
              </div>
              {filtered.length ? filtered.slice(0, limit).map((problem) => <ProblemRow key={problem.id} problem={problem} onVisualize={() => visualize(problem)} />) : (
                <div className="flex min-h-56 flex-col items-center justify-center text-center"><Search size={22} className="text-ink-600" /><p className="mt-3 text-sm text-ink-300">No problem matches those filters.</p><button type="button" onClick={() => { setQuery(""); setTopic("all"); setDifficulty("all"); }} className="mt-2 text-xs text-ember-300 hover:text-ember-200">Clear filters</button></div>
              )}
            </Card>
            {limit < filtered.length && <div className="mt-4 flex justify-center"><Button onClick={() => setLimit((current) => current + 60)}>Load 60 more <ChevronDown size={13} /></Button></div>}
          </section>
        )}

        <footer className="mt-8 flex flex-col gap-3 border-t border-ink-800 py-5 text-[11px] text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {DSA_PROBLEMS.length} curated classics from the LeetCode problem set — the link on
            each row opens the live problem for full editorials and solutions. Complexity is
            the typical target, not a guarantee.
          </p>
          <div className="flex gap-3">{DSA_SOURCE_LINKS.map((source) => <a key={source.href} href={source.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ink-400 hover:text-arc-300">{source.label}<ExternalLink size={10} /></a>)}</div>
        </footer>
      </div>
    </div>
  );
}
