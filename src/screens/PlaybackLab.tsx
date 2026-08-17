import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Box,
  CheckCircle2,
  FileCode2,
  Grid3X3,
  Hammer,
  Languages,
  Maximize2,
  Minimize2,
} from "lucide-react";

// The 3D execution stage is code-split so three.js stays out of the main bundle
// (it already lives in the landing chunk; the lab only pulls it in when used).
const ExecutionStage3D = lazy(() =>
  import("../components/three/ExecutionStage3D").then((m) => ({
    default: m.ExecutionStage3D,
  })),
);
const FactorialRecursionStage3D = lazy(() =>
  import("../components/three/FactorialRecursionStage3D").then((m) => ({
    default: m.FactorialRecursionStage3D,
  })),
);

const RecursionTree3D = lazy(() =>
  import("../components/three/RecursionTree3D").then((m) => ({
    default: m.RecursionTree3D,
  })),
);
import { EXAMPLES, forgeExample, getExample, PLAYABLE_KIND_BY_EXAMPLE } from "../data/examples";
import { PLAYABLE_INPUTS, type PlayableConfig } from "../engine/tracegen";
import { isFactorialRecursionStep } from "../engine/recursionStage";
import { LANGUAGE_VARIANTS, type VariantLanguage } from "../data/languageVariants";
import { usePlayback } from "../engine/usePlayback";
import { bumpHeat } from "../engine/session";
import { sound } from "../engine/sound";
import { recordOpen, recordProgress, saveSession } from "../lib/storage";
import { CommentaryBar } from "../components/CommentaryBar";
import { navigate, type Route } from "../router";
import { CodePanel } from "../components/CodePanel";
import { InspectorPanels } from "../components/InspectorPanels";
import { PlaybackControls } from "../components/PlaybackControls";
import { PracticeDock } from "../components/PracticeDock";
import { Timeline } from "../components/Timeline";
import { VisualStage } from "../components/VisualStage";
import { Badge } from "../components/ui";
import { AnimatedHeading } from "../components/motionfx";
import { cn } from "../lib/cn";

type FocusPanel = "all" | "code" | "stage" | "inspector";

function panelFocusClass(panel: Exclude<FocusPanel, "all">, focused: FocusPanel) {
  if (focused === "all") return "";
  return focused === panel ? "" : "hidden";
}

function FocusButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  const Icon = active ? Minimize2 : Maximize2;
  return (
    <button
      type="button"
      onClick={onClick}
      title={active ? "Restore all panels" : `Focus ${label}`}
      className="flex items-center gap-1 rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-[10px] font-medium text-ink-400 transition-colors hover:border-ember-500/50 hover:text-ember-300"
    >
      <Icon size={11} />
      {active ? "Restore" : "Focus"}
    </button>
  );
}

export function PlaybackLab({
  route,
  onNavigate,
}: {
  route: Extract<Route, { name: "lab" }>;
  onNavigate: (route: Route) => void;
}) {
  const [exampleId, setExampleId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [view3d, setView3d] = useState(true);
  const [customExample, setCustomExample] = useState<ReturnType<typeof forgeExample> | null>(null);
  const [config, setConfig] = useState<PlayableConfig>({});
  const [lang, setLang] = useState<VariantLanguage>("python");
  const [focusedPanel, setFocusedPanel] = useState<FocusPanel>("all");
  const appliedResume = useRef<string | null>(null);

  const effectiveId = exampleId ?? route.exampleId ?? EXAMPLES[0].id;
  const baseExample = getExample(effectiveId) ?? EXAMPLES[0];
  const example = customExample ?? baseExample;
  const kind = PLAYABLE_KIND_BY_EXAMPLE[baseExample.id];
  const inputFields = kind ? (PLAYABLE_INPUTS[kind] ?? []) : undefined;
  const variants = LANGUAGE_VARIANTS[baseExample.id];
  const shownCode =
    lang === "javascript" && variants
      ? variants.javascript
      : example.trace.source.code;

  const {
    state,
    step,
    activePrompt,
    stats,
    lastAnswer,
    answerPrompt,
    continueAfterAnswer,
    togglePlay,
    stepForward,
    stepBack,
    reset,
    scrub,
    setSpeed,
    setMode,
  } = usePlayback(example.trace);

  // Follow external navigation (e.g. dashboard "Open" or saved-session resume).
  useEffect(() => {
    if (route.exampleId && route.exampleId !== exampleId) {
      setExampleId(route.exampleId);
    }
  }, [route.exampleId, exampleId]);

  // Resume at a saved step when arriving via a session link.
  useEffect(() => {
    if (route.stepIndex === undefined) return;
    const key = `${example.id}:${route.stepIndex}`;
    if (appliedResume.current === key) return;
    appliedResume.current = key;
    scrub(route.stepIndex);
  }, [route.stepIndex, example.id, scrub]);

  function selectExample(id: string) {
    appliedResume.current = null;
    setCustomExample(null);
    setConfig({});
    setLang("python");
    setExampleId(id);
    navigate({ name: "lab", exampleId: id });
  }

  /** Re-forges the current example from the user's inputs (never executes code). */
  function forge() {
    if (!kind) return;
    const next = forgeExample(baseExample.id, config);
    if (!next) return;
    setCustomExample(next);
    sound.resolve();
    bumpHeat(5);
  }

  function handleSave() {
    saveSession(example, state.stepIndex);
    setSavedFlash(true);
    sound.resolve();
    window.setTimeout(() => setSavedFlash(false), 1600);
  }

  // Live audio + forge heat: a hammer-tap per step (skip the initial render).
  const prevStep = useRef<number>(state.stepIndex);
  useEffect(() => {
    if (prevStep.current === state.stepIndex) return;
    prevStep.current = state.stepIndex;
    sound.step();
    bumpHeat(1);
  }, [state.stepIndex]);

  // Answer feedback: rising arpeggio on correct, low buzz on wrong.
  const lastAnswerRef = useRef(lastAnswer?.promptId ?? null);
  useEffect(() => {
    if (!lastAnswer || lastAnswerRef.current === lastAnswer.promptId) return;
    lastAnswerRef.current = lastAnswer.promptId;
    if (lastAnswer.correct) {
      sound.correct();
      bumpHeat(6);
    } else {
      sound.wrong();
      bumpHeat(2);
    }
  }, [lastAnswer]);

  // Persist practice accuracy to local progress (feeds the dashboard).
  useEffect(() => {
    const accuracy =
      stats.answered > 0
        ? Math.round((stats.correct / stats.answered) * 100)
        : 0;
    recordProgress(example.id, accuracy, stats.answered);
  }, [stats, example.id]);

  // Record that the example was opened (feeds "watch" missions).
  useEffect(() => {
    recordOpen(example.id);
  }, [example.id]);

  // Keyboard shortcuts: space = play/pause, ←/→ = step.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        stepForward();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepBack();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, stepForward, stepBack]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="border-b border-ink-700 bg-ink-900 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate({ name: "dashboard" })}
            title="Back to dashboard"
            className="rounded p-1 text-ink-400 hover:bg-ink-800 hover:text-ink-100"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <AnimatedHeading
              text={example.title}
              className="truncate text-base font-semibold text-ink-100"
            />
            <div className="mt-0.5 flex items-center gap-2">
              <Badge tone="amber">{example.topic}</Badge>
              <Badge tone="blue">{example.difficulty}</Badge>
              <Badge tone="neutral">{example.trace.language}</Badge>
              <Badge tone="neutral">prebuilt trace</Badge>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {savedFlash && (
              <span className="flex items-center gap-1 text-xs text-verdant-300">
                <CheckCircle2 size={14} /> Session saved
              </span>
            )}
            <Badge tone="neutral">
              <FileCode2 size={11} /> {example.trace.steps.length} steps
            </Badge>
          </div>
        </div>

        {/* Example selector */}
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => selectExample(ex.id)}
              className={cn(
                "shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                ex.id === example.id
                  ? "border-ember-500/60 bg-ember-500/15 text-ember-300"
                  : "border-ink-700 bg-ink-800 text-ink-300 hover:border-ink-600 hover:text-ink-100",
              )}
            >
              {ex.title}
            </button>
          ))}
        </div>
      </header>

      {/* Workspace */}
      <div
        className={cn(
          "grid min-h-0 flex-1 grid-cols-1 gap-px bg-ink-700",
          focusedPanel === "all"
            ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,5fr)_minmax(0,4fr)]"
            : "lg:grid-cols-1",
        )}
      >
        <div
          className={cn("flex h-52 min-h-0 flex-col bg-ink-900 lg:h-auto", panelFocusClass("code", focusedPanel))}
          data-panel="code"
        >
          {/* Source language switcher + editable inputs */}
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-ink-800 px-2 py-1.5">
            {variants && (
              <div className="flex overflow-hidden rounded-md border border-ink-700">
                {(["python", "javascript"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setLang(v)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium capitalize transition-colors",
                      lang === v
                        ? "bg-ember-500/15 text-ember-300"
                        : "text-ink-400 hover:text-ink-200",
                    )}
                  >
                    <Languages size={10} /> {v === "javascript" ? "JS" : "Py"}
                  </button>
                ))}
              </div>
            )}
            <div className="ml-auto">
              <FocusButton
                active={focusedPanel === "code"}
                label="source"
                onClick={() => setFocusedPanel(focusedPanel === "code" ? "all" : "code")}
              />
            </div>
            {inputFields && inputFields.length > 0 && (
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                {inputFields.map((field) => (
                  <label key={field.key} className="flex items-center gap-1.5 text-[10px] text-ink-500">
                    {field.label}
                    <input
                      key={`${example.id}:${field.key}`}
                      defaultValue={
                        Array.isArray(config[field.key])
                          ? (config[field.key] as unknown[]).join(", ")
                          : String(config[field.key] ?? field.default)
                      }
                      onBlur={(e) => {
                        const raw = e.target.value;
                        const next = { ...config };
                        if (field.key === "array") {
                          const values = raw
                            .split(",")
                            .map((s) => Number(s.trim()))
                            .filter(Number.isFinite);
                          if (values.length >= 2) next.array = values;
                        } else if (field.key === "tree") {
                          const values = raw
                            .split(",")
                            .map((s) => Number(s.trim()))
                            .filter(Number.isFinite);
                          if (values.length >= 3) next.tree = values;
                        } else if (field.key === "n" || field.key === "target") {
                          const n = Number(raw);
                          if (Number.isFinite(n)) next[field.key] = n;
                        } else if (field.key === "text") {
                          const text = raw.trim().replace(/[^a-zA-Z]/g, "");
                          if (text.length >= 2) next.text = text;
                        }
                        setConfig(next);
                      }}
                      className="w-28 rounded border border-ink-700 bg-ink-950 px-2 py-1 font-mono text-[10px] text-ink-200 outline-none focus:border-ember-500/60"
                    />
                  </label>
                ))}
                <button
                  type="button"
                  onClick={forge}
                  title="Re-forge this example from your inputs (no code execution)"
                  className="flex items-center gap-1 rounded-md border border-ember-500/50 bg-ember-500/15 px-2 py-1 text-[10px] font-semibold text-ember-300 transition-colors hover:bg-ember-500/25"
                >
                  <Hammer size={10} /> Forge
                </button>
              </div>
            )}
          </div>
          <div className="min-h-0 flex-1">
            <CodePanel code={shownCode} activeLine={step.line} />
          </div>
          {lang === "javascript" && (
            <div className="shrink-0 border-t border-ink-800 px-2 py-1 text-[9px] text-ink-500">
              Same trace · source shown in JS (line highlights stay aligned)
            </div>
          )}
        </div>
        <div
          className={cn("relative isolate flex h-72 min-h-0 flex-col overflow-hidden bg-ink-900 lg:h-auto", panelFocusClass("stage", focusedPanel))}
          data-panel="stage"
        >
          <div aria-hidden className="stage-ambient -z-10" />
          <div className="flex shrink-0 items-center justify-between border-b border-ink-800 px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
              {step.visual?.type === "recursion_tree" ? "Recursion tree" : "Execution stage"}
            </span>
            <div className="flex items-center gap-2">
              <FocusButton
                active={focusedPanel === "stage"}
                label="stage"
                onClick={() => setFocusedPanel(focusedPanel === "stage" ? "all" : "stage")}
              />
              <div className="flex overflow-hidden rounded-md border border-ink-700">
                <button
                  type="button"
                  onClick={() => setView3d(false)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium transition-colors",
                    !view3d
                      ? "bg-ember-500/15 text-ember-300"
                      : "text-ink-400 hover:text-ink-200",
                  )}
                >
                  <Grid3X3 size={11} /> 2D
                </button>
                <button
                  type="button"
                  onClick={() => setView3d(true)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium transition-colors",
                    view3d
                      ? "bg-ember-500/15 text-ember-300"
                      : "text-ink-400 hover:text-ink-200",
                  )}
                >
                  <Box size={11} /> 3D
                </button>
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            {!view3d ? (
              <VisualStage step={step} steps={example.trace.steps} onScrub={scrub} />
            ) : step.visual?.type === "recursion_tree" && isFactorialRecursionStep(step) ? (
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-xs text-ink-500">
                    Loading factorial stage...
                  </div>
                }
              >
                <FactorialRecursionStage3D
                  step={step}
                  steps={example.trace.steps}
                  onScrub={scrub}
                />
              </Suspense>
            ) : step.visual?.type === "recursion_tree" ? (
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-xs text-ink-500">
                    Loading 3D tree...
                  </div>
                }
              >
                <RecursionTree3D
                  nodes={step.visual.nodes}
                  edges={step.visual.edges}
                  activeNodeId={step.visual.activeNodeId}
                  steps={example.trace.steps}
                  onScrub={scrub}
                />
              </Suspense>
            ) : (
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-xs text-ink-500">
                    Loading 3D stage…
                  </div>
                }
              >
                <ExecutionStage3D step={step} />
              </Suspense>
            )}
          </div>
        </div>
        <div
          className={cn("flex h-72 min-h-0 flex-col bg-ink-900 lg:h-auto", panelFocusClass("inspector", focusedPanel))}
          data-panel="inspector"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-ink-800 px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
              Inspector
            </span>
            <FocusButton
              active={focusedPanel === "inspector"}
              label="inspector"
              onClick={() => setFocusedPanel(focusedPanel === "inspector" ? "all" : "inspector")}
            />
          </div>
          <div className="min-h-0 flex-1">
            <InspectorPanels step={step} />
          </div>
        </div>
      </div>

      {/* Live written context for the current step */}
      <CommentaryBar event={step.event} text={step.description} />

      {/* Practice dock (only visible in practice mode) */}
      <PracticeDock
        mode={state.mode}
        prompt={activePrompt}
        lastAnswer={lastAnswer}
        stats={stats}
        onAnswer={answerPrompt}
        onContinue={continueAfterAnswer}
      />

      {/* Timeline + controls */}
      <Timeline
        steps={example.trace.steps}
        stepIndex={state.stepIndex}
        onScrub={scrub}
      />
      <PlaybackControls
        state={state}
        onTogglePlay={togglePlay}
        onStepBack={stepBack}
        onStepForward={stepForward}
        onReset={reset}
        onSetSpeed={setSpeed}
        onSetMode={setMode}
        onSave={handleSave}
        stats={stats}
      />
    </div>
  );
}
