import {
  ArrowRight,
  BookOpen,
  Box,
  Brain,
  CheckCircle2,
  Code2,
  Database,
  FileCode2,
  GitBranch,
  Headphones,
  History,
  Layers3,
  Network,
  Play,
  Route,
  ShieldCheck,
  Sparkles,
  Volume2,
  Workflow,
} from "lucide-react";

interface LandingPageProps {
  currentTraceTitle: string;
  savedSessionCount: number;
  soundEnabled: boolean;
  onOpenExamples: () => void;
  onOpenGraph: () => void;
  onOpenRenderer: () => void;
  onOpenSessions: () => void;
  onOpenSorting: () => void;
  onStartVisualizing: () => void;
  onToggleSound: () => void;
}

const languageLabels = ["Python", "JavaScript", "TypeScript", "Java", "C++", "C", "C#", "Go"];

export function LandingPage({
  currentTraceTitle,
  savedSessionCount,
  soundEnabled,
  onOpenExamples,
  onOpenGraph,
  onOpenRenderer,
  onOpenSessions,
  onOpenSorting,
  onStartVisualizing,
  onToggleSound,
}: LandingPageProps) {
  const processSteps = [
    {
      action: onStartVisualizing,
      icon: FileCode2,
      label: "Paste code",
      text: "Edit Python today, view the same trace in eight language variants.",
    },
    {
      action: onStartVisualizing,
      icon: ShieldCheck,
      label: "Validate trace actions",
      text: "Every line maps to compare, assign, call, return, output, or traversal actions.",
    },
    {
      action: onOpenRenderer,
      icon: Box,
      label: "Render in Three.js",
      text: "Arrays, recursion frames, stacks, and graphs become a clear 3D teaching scene.",
    },
    {
      action: onToggleSound,
      icon: Headphones,
      label: soundEnabled ? "Sound cues on" : "Hear sound cues",
      text: "Optional audio marks calls, comparisons, writes, returns, and completions.",
    },
    {
      action: onOpenSessions,
      icon: History,
      label: "Resume sessions",
      text: savedSessionCount
        ? String(savedSessionCount) + " saved session" + (savedSessionCount === 1 ? "" : "s") + " ready."
        : "Save a trace step, then return exactly where you stopped.",
    },
  ];

  const modules = [
    {
      action: onOpenSorting,
      icon: Database,
      label: "Sorting lab",
      text: "Bubble, selection, and insertion sort are connected to working controls.",
      cta: "Open sorting lab",
    },
    {
      action: onOpenGraph,
      icon: Network,
      label: "Graph traversal",
      text: "BFS and DFS show frontier, visited order, and active node state.",
      cta: "Open graph lab",
    },
    {
      action: onOpenRenderer,
      icon: Box,
      label: "Three.js renderer",
      text: "The current animation stage renders validated trace actions.",
      cta: "Open renderer",
    },
    {
      action: onOpenExamples,
      icon: BookOpen,
      label: "Trace catalog",
      text: "Factorial recursion, sum of array, and bubble sort are ready.",
      cta: "Try examples",
    },
    {
      action: onToggleSound,
      icon: Volume2,
      label: "Audio layer",
      text: "Sound and narration are optional, practical controls.",
      cta: soundEnabled ? "Sound enabled" : "Enable sound",
    },
  ];

  const roadmap = [
    { icon: Route, label: "Tree-sitter parsers", status: "Next", text: "Parse Python, JavaScript, Java, C++, C, C#, Go, and more." },
    { icon: Brain, label: "Local LLM explanations", status: "Planned", text: "Explain intent and detect known DSA patterns offline first." },
    { icon: Layers3, label: "Polished DSA library", status: "Planned", text: "Add trees, heaps, linked lists, DP, queues, stacks, and templates." },
    { icon: Workflow, label: "Custom code storyboard", status: "Planned", text: "Unknown code becomes a best-effort execution story, not fake Three.js." },
  ];

  return (
    <section className="ca-home" aria-label="CodeAnvil landing page">
      <div className="ca-home__hero">
        <div className="ca-home__copy">
          <h1>CodeAnvil</h1>
          <p>
            Turn code into execution you can see, hear, replay, and actually understand.
            Start from curated DSA traces today, then grow toward custom-code visualization
            through a validated action schema.
          </p>
          <div className="ca-home__actions" aria-label="Primary actions">
            <button className="ca-home-button ca-home-button--primary" onClick={onStartVisualizing} type="button">
              <Play size={18} />
              <span>Start visualizing</span>
            </button>
            <button className="ca-home-button" onClick={onOpenSorting} type="button">
              <Database size={18} />
              <span>Open DSA lab</span>
            </button>
            <button className="ca-home-button" onClick={onOpenExamples} type="button">
              <BookOpen size={18} />
              <span>Try examples</span>
            </button>
          </div>
          <div className="ca-home__proof" aria-label="Current build capabilities">
            <span><CheckCircle2 size={15} /> Three.js powered</span>
            <span><CheckCircle2 size={15} /> Trace validated</span>
            <span><CheckCircle2 size={15} /> Sound optional</span>
            <span><CheckCircle2 size={15} /> Sessions resumable</span>
          </div>
        </div>

        <div className="ca-home-preview" aria-label="Current CodeAnvil process preview">
          <header>
            <span><Sparkles size={16} /> {currentTraceTitle}</span>
            <em>current build path</em>
          </header>
          <div className="ca-home-preview__body">
            <div className="ca-home-code">
              <span><Code2 size={14} /> factorial.py</span>
              <code>def factorial(n):</code>
              <code className="is-hot">if n &lt;= 1: return 1</code>
              <code>return n * factorial(n - 1)</code>
              <code>result = factorial(4)</code>
            </div>
            <div className="ca-home-trace">
              <span><GitBranch size={14} /> execution trace</span>
              <p><b>call</b> factorial(4)</p>
              <p><b>call</b> factorial(3)</p>
              <p className="is-hot"><b>return</b> 2 * 1</p>
              <p><b>write</b> result = 24</p>
            </div>
            <div className="ca-home-stage">
              <span><Network size={14} /> renderer</span>
              <div className="ca-home-stage__stack" aria-hidden="true">
                <i>factorial(4)</i>
                <i>factorial(3)</i>
                <i className="is-hot">factorial(2)</i>
                <i>factorial(1)</i>
              </div>
              <strong>action schema drives the scene</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="ca-home-languages" aria-label="Language coverage">
        {languageLabels.map((language) => (
          <span key={language}>{language}</span>
        ))}
      </div>

      <section className="ca-home-process" aria-label="How CodeAnvil works">
        {processSteps.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.label} onClick={item.action} type="button">
              <Icon size={24} />
              <span>{item.label}</span>
              <strong>{item.text}</strong>
              <ArrowRight size={16} />
            </button>
          );
        })}
      </section>

      <div className="ca-home-grid">
        <section className="ca-home-section" aria-label="Current modules">
          <header>
            <h2>Current modules</h2>
            <p>The parts already built are connected from here.</p>
          </header>
          <div className="ca-home-modules">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <button key={module.label} onClick={module.action} type="button">
                  <Icon size={26} />
                  <span>{module.label}</span>
                  <strong>{module.text}</strong>
                  <em>{module.cta} <ArrowRight size={14} /></em>
                </button>
              );
            })}
          </div>
        </section>

        <section className="ca-home-section ca-home-roadmap" aria-label="Roadmap">
          <header>
            <h2>Roadmap</h2>
            <p>These are next-stage modules, shown as planned work.</p>
          </header>
          <div>
            {roadmap.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label}>
                  <Icon size={20} />
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.text}</strong>
                  </div>
                  <em>{item.status}</em>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}
