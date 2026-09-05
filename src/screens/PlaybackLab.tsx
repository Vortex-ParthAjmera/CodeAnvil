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
  MoveHorizontal,
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
import { PanelSplitter } from "../components/PanelSplitter";
import { VisualStage } from "../components/VisualStage";
import { AlgorithmLibraryShelf } from "../components/AlgorithmLibraryShelf";
import { Badge } from "../components/ui";
import { AnimatedHeading } from "../components/motionfx";
import { cn } from "../lib/cn";

type FocusPanel = "all" | "code" | "stage" | "inspector";

function panelFocusClass(panel: Exclude<FocusPanel, "all">, focused: FocusPanel) {
  if (focused === "all") return "";
  return focused === panel ? "" : "hidden";
}

/* Per-example stage view (2D vs 3D), persisted so reopening an example
   restores the view the user last chose for it. */
const VIEW3D_KEY = "codeanvil.view3d-by-example.v1";

function readView3dPref(id: string): boolean | undefined {
  try {
    const raw = localStorage.getItem(VIEW3D_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return typeof parsed[id] === "boolean" ? parsed[id] : undefined;
  } catch {
    return undefined;
  }
}

function writeView3dPref(id: string, is3d: boolean): void {
  try {
    const raw = localStorage.getItem(VIEW3D_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    parsed[id] = is3d;
    localStorage.setItem(VIEW3D_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

/* Per-panel size weights (2–9) for the workspace layout, persisted locally. */
const PANEL_SIZES_KEY = "codeanvil.panel-sizes.v3";
const LAB_LIBRARY_COLLAPSED_KEY = "codeanvil.lab-library-collapsed.v1";
const PANEL_SIZE_IDS = ["code", "stage", "inspector"] as const;
type PanelSizeKey = (typeof PANEL_SIZE_IDS)[number];
const DEFAULT_PANEL_SIZES: Record<PanelSizeKey, number> = {
  code: 3,
  stage: 9,
  inspector: 2,
};

function readLabLibraryCollapsed(): boolean {
  try {
    const raw = localStorage.getItem(LAB_LIBRARY_COLLAPSED_KEY);
    if (raw === null) return true;
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "boolean" ? parsed : true;
  } catch {
    return true;
  }
}

function readPanelSizes(): Record<PanelSizeKey, number> {
  try {
    const raw = localStorage.getItem(PANEL_SIZES_KEY);
    if (!raw) return DEFAULT_PANEL_SIZES;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out = { ...DEFAULT_PANEL_SIZES };
    for (const id of PANEL_SIZE_IDS) {
      const v = Number(parsed?.[id]);
      if (Number.isFinite(v) && v >= 2 && v <= 9) out[id] = v;
    }
    return out;
  } catch {
    return DEFAULT_PANEL_SIZES;
  }
}

function PanelSizeSlider({
  id,
  value,
  onChange,
}: {
  id: PanelSizeKey;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label title={`Resize ${id} panel`} className="flex items-center gap-1.5">
      <span className="w-12 font-mono text-[10px] uppercase tracking-wider text-ink-400 sm:w-14">
        {id}
      </span>
      <input
        type="range"
        min={2}
        max={9}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${id} panel size`}
        className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-ink-700 accent-ember-400 sm:w-24"
      />
    </label>
  );
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
  const [view3d, setView3d] = useState<boolean>(
    () => readView3dPref(route.exampleId ?? EXAMPLES[0].id) ?? true,
  );
  const [customExample, setCustomExample] = useState<ReturnType<typeof forgeExample> | null>(null);
  const [config, setConfig] = useState<PlayableConfig>({});
  const [lang, setLang] = useState<VariantLanguage>("python");
  const [focusedPanel, setFocusedPanel] = useState<FocusPanel>("all");
  const [panelSizes, setPanelSizes] = useState(readPanelSizes);
  const [libraryCollapsed, setLibraryCollapsed] = useState(readLabLibraryCollapsed);
  const appliedResume = useRef<string | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  /** Converts measured on-screen pixel sizes back into panel weights (2–9). */
  function commitPanelPixels(pixels: Record<string, number>) {
    setPanelSizes((s) => {
      const total = PANEL_SIZE_IDS.reduce((sum, id) => sum + (pixels[id] ?? 0), 0);
      if (total <= 0) return s;
      const out = { ...s };
      for (const id of PANEL_SIZE_IDS) {
        out[id] = Math.min(9, Math.max(2, Math.round(((pixels[id] ?? 0) / total) * 14)));
      }
      return out;
    });
  }

  /** Keyboard resize: grow panel `a` (or the top/left one) by delta, shrink `b`. */
  function stepPanelWeights(pair: [PanelSizeKey, PanelSizeKey], delta: number) {
    setPanelSizes((s) => {
      const [idA, idB] = pair;
      const a = s[idA];
      const b = s[idB];
      const lo = Math.max(2 - a, b - 9);
      const hi = Math.min(9 - a, b - 2);
      const applied = Math.min(Math.max(delta, lo), hi);
      if (applied === 0) return s;
      return { ...s, [idA]: a + applied, [idB]: b - applied };
    });
  }

  // Persist the user's panel proportions.
  useEffect(() => {
    try {
      localStorage.setItem(PANEL_SIZES_KEY, JSON.stringify(panelSizes));
    } catch {
      /* ignore */
    }
  }, [panelSizes]);

  // Keep the big selector out of the way after the user chooses a preference.
  useEffect(() => {
    try {
      localStorage.setItem(LAB_LIBRARY_COLLAPSED_KEY, JSON.stringify(libraryCollapsed));
    } catch {
      /* ignore */
    }
  }, [libraryCollapsed]);

  const effectiveId = exampleId ?? route.exampleId ?? EXAMPLES[0].id;
  const baseExample = getExample(effectiveId) ?? EXAMPLES[0];
  const example = customExample ?? baseExample;

  // Restore the example's saved stage view when it (re)opens.
  useEffect(() => {
    setView3d(readView3dPref(effectiveId) ?? true);
  }, [effectiveId]);

  function setViewFor(is3d: boolean) {
    setView3d(is3d);
    writeView3dPref(example.id, is3d);
  }
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
      appliedResume.current = null;
      setCustomExample(null);
      setConfig({});
      setLang("python");
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

  // Live audio + forge heat: contextual sound per step (skip the initial render).
  const prevStep = useRef<number>(state.stepIndex);
  useEffect(() => {
    if (prevStep.current === state.stepIndex) return;
    prevStep.current = state.stepIndex;
    const ev = step.event;
    if (ev === "comparison" || ev === "compare") sound.compare();
    else if (ev === "swap") sound.swap();
    else sound.step();
    bumpHeat(1);
  }, [state.stepIndex, step.event]);

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
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      {/* Header */}
      <header className="shrink-0 border-b border-ink-700 bg-ink-900 px-4 py-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => onNavigate({ name: "dashboard" })}
            title="Back to dashboard"
            className="rounded p-1 text-ink-400 hover:bg-ink-800 hover:text-ink-100"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <AnimatedHeading
              text={example.title}
              className="break-words text-base font-semibold leading-tight text-ink-100"
            />
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge tone="amber">{example.topic}</Badge>
              <Badge tone="blue">{example.difficulty}</Badge>
              <Badge tone="neutral">{example.trace.language}</Badge>
              <Badge tone="neutral">prebuilt trace</Badge>
            </div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {savedFlash && (
              <span className="flex items-center gap-1 text-xs text-verdant-300">
                <CheckCircle2 size={14} /> Session saved
              </span>
            )}
            <Badge tone="neutral" className="whitespace-nowrap">
              <FileCode2 size={11} /> {example.trace.steps.length} steps
            </Badge>
          </div>
        </div>

        {/* Algorithm selector */}
        <AlgorithmLibraryShelf
          compact
          collapsible
          collapsed={libraryCollapsed}
          activeExampleId={example.id}
          onCollapsedChange={setLibraryCollapsed}
          onOpenExample={selectExample}
          className="mt-3"
        />
      </header>

      {/* Panel size sliders — resize source / stage / inspector to fit any screen */}
      <div className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-ink-800 bg-ink-900/70 px-3 py-1.5">
        <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-widest text-ink-500">
          <MoveHorizontal size={11} /> Panel size
        </span>
        {PANEL_SIZE_IDS.map((id) => (
          <PanelSizeSlider
            key={id}
            id={id}
            value={panelSizes[id]}
            onChange={(v) => setPanelSizes((s) => ({ ...s, [id]: v }))}
          />
        ))}
        <button
          type="button"
          onClick={() => setPanelSizes(DEFAULT_PANEL_SIZES)}
          className="rounded border border-ink-700 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-400 transition-colors hover:border-ink-600 hover:text-ink-200"
        >
          Reset
        </button>
      </div>

      {/* Workspace — scrolls instead of clipping on short screens; panels
          share space by the per-panel size weights (width on lg+, height below),
          and the draggable PanelSplitters between them resize live. */}
      <div
        ref={workspaceRef}
        data-workspace
        className="flex min-h-[32rem] flex-1 flex-col overflow-y-auto bg-ink-700 lg:min-h-[28rem] lg:flex-row"
      >
        <div
          className={cn(
            "flex min-h-40 min-w-0 flex-col bg-ink-900 lg:min-h-0 lg:min-w-[14rem]",
            panelFocusClass("code", focusedPanel),
          )}
          data-panel="code"
          style={{ flexGrow: panelSizes.code, flexBasis: 0 }}
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
                        field.key === "intervals" && Array.isArray(config[field.key] ?? field.default)
                          ? ((config[field.key] ?? field.default) as Array<[number, number]>).map(([start, end]) => `[${start},${end}]`).join("; ")
                          : Array.isArray(config[field.key])
                            ? (config[field.key] as unknown[]).join(", ")
                            : String(config[field.key] ?? field.default)
                      }
                      onChange={(e) => {
                        const raw = e.target.value;
                        const next = { ...config };
                        if (field.key === "intervals") {
                          const endpoints = raw.match(/-?(?:\d+\.?\d*|\.\d+)/g)?.map(Number) ?? [];
                          if (endpoints.length >= 2 && endpoints.length % 2 === 0 && endpoints.every(Number.isFinite)) {
                            next.intervals = Array.from({ length: endpoints.length / 2 }, (_, index) => [endpoints[index * 2], endpoints[index * 2 + 1]]);
                          }
                        } else if (field.key === "array") {
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
                        } else if (field.key === "n" || field.key === "target" || field.key === "left" || field.key === "right" || field.key === "delta") {
                          const n = Number(raw);
                          if (Number.isFinite(n)) next[field.key] = n;
                        } else if (field.key === "rows" || field.key === "cols") {
                          const n = Math.round(Number(raw));
                          if (Number.isFinite(n)) next[field.key] = Math.max(2, Math.min(9, n));
                        } else if (field.key === "seed") {
                          const n = Math.round(Number(raw));
                          if (Number.isFinite(n)) next[field.key] = Math.max(1, Math.min(9999, n));
                        } else if (field.key === "text") {
                          const text = raw.trim().replace(/[^a-zA-Z]/g, "");
                          if (text.length >= 2) next.text = text;
                        }
                        setConfig(next);
                      }}
                      className={cn(field.key === "intervals" ? "w-48" : "w-28", "rounded border border-ink-700 bg-ink-950 px-2 py-1 font-mono text-[10px] text-ink-200 outline-none focus:border-ember-500/60")}
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
        {focusedPanel === "all" && (
          <PanelSplitter
            a="code"
            b="stage"
            value={panelSizes.code}
            onCommit={commitPanelPixels}
            onStep={(d) => stepPanelWeights(["code", "stage"], d)}
          />
        )}
        <div
          className={cn(
            "relative isolate flex min-h-[19rem] min-w-0 flex-col overflow-hidden bg-ink-900 lg:min-h-0 lg:min-w-[24rem] xl:min-w-[32rem]",
            panelFocusClass("stage", focusedPanel),
          )}
          data-panel="stage"
          style={{ flexGrow: panelSizes.stage, flexBasis: 0 }}
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
                  onClick={() => setViewFor(false)}
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
                  onClick={() => setViewFor(true)}
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
                <ExecutionStage3D step={step} steps={example.trace.steps} />
              </Suspense>
            )}
          </div>
        </div>
        <div
          className={cn(
            "flex min-h-48 min-w-0 flex-col bg-ink-900 lg:min-h-0 lg:min-w-[12rem]",
            panelFocusClass("inspector", focusedPanel),
          )}
          data-panel="inspector"
          style={{ flexGrow: panelSizes.inspector, flexBasis: 0 }}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-ink-800 px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
              Inspector
            </span>
            <div>
              <FocusButton
                active={focusedPanel === "inspector"}
                label="inspector"
                onClick={() => setFocusedPanel(focusedPanel === "inspector" ? "all" : "inspector")}
              />
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <InspectorPanels step={step} />
          </div>
        </div>
        {focusedPanel === "all" && (
          <PanelSplitter
            a="stage"
            b="inspector"
            value={panelSizes.stage}
            onCommit={commitPanelPixels}
            onStep={(d) => stepPanelWeights(["stage", "inspector"], d)}
          />
        )}
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
