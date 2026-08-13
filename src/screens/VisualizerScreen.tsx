import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Braces,
  CheckCircle2,
  ChevronDown,
  CircleStop,
  Code2,
  FileCode2,
  FileSearch,
  Gauge,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Sparkles,
  Upload,
} from "lucide-react";
import { detectAndGenerate, type DetectionResult } from "../engine/detect";
import { storyScriptTrace, DEFAULT_STORY_SCRIPT } from "../engine/storyscript";
import { useStepPlayback } from "../engine/useStepPlayback";
import { isFactorialRecursionStep } from "../engine/recursionStage";
import { isBinarySearchTraceStep } from "../engine/searchStage";
import { isBubbleSortTraceStep } from "../engine/sortStage";
import { registerGeneratedExample } from "../data/examples";
import { VISUALIZER_DRAFT_KEY } from "../data/dsaCatalog";
import type { Route } from "../router";
import { ExecutionStage3D } from "../components/three/ExecutionStage3D";
import { CodeGalaxy3D } from "../components/three/CodeGalaxy3D";
import { Badge, Button } from "../components/ui";
import { AnimatedHeading } from "../components/motionfx";
import { cn } from "../lib/cn";

const MAX_CODE_LENGTH = 12_000;

const SAMPLES: { label: string; language: string; code: string }[] = [
  {
    label: "Array scan",
    language: "Python",
    code: `total = 0
arr = [4, 7, 1, 9]
for i in range(len(arr)):
    total = total + arr[i]
print("Total:", total)`,
  },
  {
    label: "Binary search",
    language: "Python",
    code: `arr = [1, 3, 5, 7, 9, 11]
target = 7
low = 0
high = len(arr) - 1
while low <= high:
    mid = (low + high) // 2
    if arr[mid] == target:
        print("Found at", mid)
        break
    elif arr[mid] < target:
        low = mid + 1
    else:
        high = mid - 1`,
  },
  {
    label: "Bubble sort",
    language: "JavaScript",
    code: `const arr = [5, 2, 8, 1];
const n = arr.length;
for (let i = 0; i < n - 1; i++) {
  for (let j = 0; j < n - 1 - i; j++) {
    if (arr[j] > arr[j + 1]) {
      [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
    }
  }
}
console.log(arr);`,
  },
  {
    label: "Recursion",
    language: "Python",
    code: `def fact(n):
    if n <= 1:
        return 1
    return n * fact(n - 1)

print(fact(4))`,
  },
  {
    label: "C++ storyboard",
    language: "C++",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
  vector<int> values = {4, 7, 1, 9};
  for (int value : values) {
    cout << value << " ";
  }
  return 0;
}`,
  },
  {
    label: "Java storyboard",
    language: "Java",
    code: `public class Main {
  public static void main(String[] args) {
    int[] values = {4, 7, 1, 9};
    for (int value : values) {
      System.out.println(value);
    }
  }
}`,
  },
  {
    label: "Story script",
    language: "Script",
    code: DEFAULT_STORY_SCRIPT,
  },
];

const LANGUAGE_LABELS = ["Python", "JavaScript", "TypeScript", "C", "C++", "Java", "C#", "Go", "Rust", "Kotlin", "Swift", "Ruby", "PHP", "Dart"];

function getInitialCode() {
  const draft = sessionStorage.getItem(VISUALIZER_DRAFT_KEY);
  if (draft) {
    sessionStorage.removeItem(VISUALIZER_DRAFT_KEY);
    return draft;
  }
  return SAMPLES[0].code;
}

type FocusPanel = "all" | "source" | "stage";

function focusClass(panel: Exclude<FocusPanel, "all">, focused: FocusPanel) {
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
      className="flex h-7 items-center gap-1 rounded-md border border-ink-700 bg-ink-950 px-2 text-[10px] font-medium text-ink-400 transition-colors hover:border-ember-500/50 hover:text-ember-300"
    >
      <Icon size={11} />
      {active ? "Restore" : "Focus"}
    </button>
  );
}

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-20 overflow-hidden rounded-full bg-ink-700">
        <div className={cn("h-full rounded-full transition-all duration-500", pct >= 75 ? "bg-verdant-400" : pct >= 45 ? "bg-ember-400" : "bg-arc-400")} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[9px] text-ink-400">{pct}%</span>
    </div>
  );
}

export function VisualizerScreen({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const initialCode = useMemo(getInitialCode, []);
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<DetectionResult>(() => detectAndGenerate(initialCode));
  const [runToken, setRunToken] = useState(0);
  const [viewMode, setViewMode] = useState<"stage" | "galaxy">(
    () => (detectAndGenerate(initialCode).kind === "storyboard" ? "galaxy" : "stage"),
  );
  const [focusedPanel, setFocusedPanel] = useState<FocusPanel>("all");
  const fileInput = useRef<HTMLInputElement>(null);
  const trace = result.trace;
  const playback = useStepPlayback(trace?.steps.length ?? 0);
  const step = trace?.steps[Math.min(playback.index, (trace?.steps.length ?? 1) - 1)];
  const useSpecializedStage = step
    ? viewMode === "stage" &&
      (isBinarySearchTraceStep(step) || isBubbleSortTraceStep(step) || isFactorialRecursionStep(step))
    : false;

  useEffect(() => {
    if (!runToken || !trace?.steps.length) return;
    playback.replay();
    // replay intentionally starts only when a fresh analysis is produced.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runToken]);

  function applyResult(next: DetectionResult) {
    setResult(next);
    // Unknown-language code gets the universal Code Galaxy by default.
    setViewMode(next.kind === "storyboard" ? "galaxy" : "stage");
  }

  function run() {
    if (code.trim().length > MAX_CODE_LENGTH) return;
    // Story Script: declarative commands describe state directly — no
    // execution, no pattern matching needed.
    const script = storyScriptTrace(code, "Story Script (generated)");
    if (script.trace && !script.error) {
      applyResult({
        kind: "script",
        confidence: 1,
        language: "story-script",
        trace: script.trace,
        note: "Story Script — every command became a step. Nothing executed.",
        matched: ["story-script"],
      });
      setRunToken((token) => token + 1);
      return;
    }
    applyResult(detectAndGenerate(code));
    setRunToken((token) => token + 1);
  }

  function loadSample(sample: (typeof SAMPLES)[number]) {
    setCode(sample.code);
    applyResult(detectAndGenerate(sample.code));
    setRunToken((token) => token + 1);
  }

  function openInLab() {
    if (!trace) return;
    const example = registerGeneratedExample(trace);
    onNavigate({ name: "lab", exampleId: example.id });
  }

  function loadFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "").slice(0, MAX_CODE_LENGTH);
      setCode(text);
      applyResult(detectAndGenerate(text));
      setRunToken((token) => token + 1);
    };
    reader.readAsText(file);
  }

  const tooLong = code.length > MAX_CODE_LENGTH;
  const language = result.language === "unknown" ? "auto / unknown" : result.language;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto lg:overflow-hidden">
      <header className="relative shrink-0 overflow-hidden border-b border-ink-700 bg-ink-900 px-4 py-3 sm:px-6">
        <div className="atlas-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-ember-500/40 bg-ember-500/10 shadow-[0_0_28px_rgba(167,139,250,0.16)]">
            <Box size={18} className="text-ember-300" />
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-ember-400">CodeAnvil / Holographic runtime</p>
            <AnimatedHeading
              text="Visualize Your Code"
              className="text-lg font-semibold tracking-tight text-ink-100 sm:text-xl"
            />
          </div>
          <div className="ml-auto hidden items-center gap-4 xl:flex">
            <span className="flex items-center gap-1.5 text-[10px] text-verdant-300"><ShieldCheck size={13} /> static analysis only</span>
            <span className="flex items-center gap-1.5 text-[10px] text-ink-400"><Sparkles size={13} className="text-arc-300" /> 14 language families</span>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "grid min-h-0 flex-1 grid-cols-1",
          focusedPanel === "all"
            ? "lg:grid-cols-[minmax(360px,0.9fr)_minmax(480px,1.35fr)]"
            : "lg:grid-cols-1",
        )}
      >
        <section
          data-panel="source"
          className={cn("flex min-h-[480px] min-w-0 flex-col border-b border-ink-700 bg-ink-900 lg:min-h-0 lg:border-b-0 lg:border-r", focusClass("source", focusedPanel))}
        >
          <div className="flex flex-wrap items-center gap-1.5 border-b border-ink-800 px-3 py-2">
            <span className="mr-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-500"><Code2 size={12} /> Source</span>
            {SAMPLES.slice(0, 4).map((sample) => (
              <button key={sample.label} type="button" onClick={() => loadSample(sample)} title={`${sample.label} · ${sample.language}`} className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-[10px] text-ink-400 transition-colors hover:border-ember-500/50 hover:text-ember-300">{sample.label}</button>
            ))}
            <div className="relative">
              <select aria-label="More samples" defaultValue="" onChange={(event) => { const sample = SAMPLES.find((item) => item.label === event.target.value); if (sample) loadSample(sample); event.target.value = ""; }} className="h-7 appearance-none rounded-md border border-ink-700 bg-ink-950 pl-2 pr-7 text-[10px] text-ink-400 outline-none hover:border-ink-600">
                <option value="" disabled>More</option>{SAMPLES.slice(4).map((sample) => <option key={sample.label}>{sample.label}</option>)}
              </select><ChevronDown size={11} className="pointer-events-none absolute right-2 top-2 text-ink-500" />
            </div>
            <div className="ml-auto">
              <FocusButton
                active={focusedPanel === "source"}
                label="source"
                onClick={() => setFocusedPanel(focusedPanel === "source" ? "all" : "source")}
              />
            </div>
          </div>

          <div className="relative min-h-[300px] flex-1 bg-ink-950/65">
            <div className="pointer-events-none absolute bottom-0 left-0 top-0 w-11 border-r border-ink-800 bg-ink-950/70 pt-4 text-right font-mono text-[11px] leading-[1.72] text-ink-600">
              {code.split("\n").map((_, index) => <div key={index} className={step?.line === index + 1 ? "pr-2 text-ember-400" : "pr-2"}>{index + 1}</div>)}
            </div>
            <textarea value={code} onChange={(event) => setCode(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") run(); }} spellCheck={false} aria-label="Code to visualize" className="h-full min-h-[300px] w-full resize-none bg-transparent py-4 pl-14 pr-4 font-mono text-[12px] leading-[1.72] text-ink-100 outline-none placeholder:text-ink-600" placeholder="Paste code in any language…" />
          </div>

          <div className="border-t border-ink-800 bg-ink-900 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge tone="blue">{language}</Badge>
                <span className={cn("font-mono text-[9px]", tooLong ? "text-rose-300" : "text-ink-600")}>{code.length.toLocaleString()} / {MAX_CODE_LENGTH.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <input ref={fileInput} type="file" accept=".py,.js,.ts,.tsx,.jsx,.java,.c,.cpp,.cc,.cs,.go,.rs,.rb,.php,.kt,.swift,.dart,.txt" className="hidden" onChange={(event) => loadFile(event.target.files?.[0])} />
                <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => fileInput.current?.click()}><Upload size={13} /> Import</Button>
                <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => { setCode(""); setResult(detectAndGenerate("")); }}><CircleStop size={13} /> Clear</Button>
              </div>
            </div>
            <Button variant="primary" disabled={tooLong || code.trim().length < 10} className="btn-shine h-10 w-full" onClick={run}><FileSearch size={15} /> Forge 3D trace <span className="ml-auto font-mono text-[9px] opacity-60">Ctrl ↵</span></Button>
            {tooLong && <p className="mt-2 text-[10px] text-rose-300">Shorten the snippet to 12,000 characters before analysis.</p>}
          </div>
        </section>

        <section
          data-panel="stage"
          className={cn("flex min-h-[600px] min-w-0 flex-col bg-[radial-gradient(circle_at_50%_30%,rgba(14,165,233,0.07),transparent_55%)] lg:min-h-0", focusClass("stage", focusedPanel))}
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-ink-800 bg-ink-900/85 px-3 py-2.5 backdrop-blur">
            <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-500"><Box size={12} /> 3D execution world</span>
            <div className="ml-1 flex overflow-hidden rounded-md border border-ink-700">
              {(["stage", "galaxy"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setViewMode(m)}
                  className={cn(
                    "px-2 py-0.5 text-[10px] font-medium capitalize transition-colors",
                    viewMode === m
                      ? "bg-ember-500/15 text-ember-300"
                      : "text-ink-400 hover:text-ink-200",
                  )}
                >
                  {m === "stage" ? "Stage" : "Galaxy"}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <FocusButton
                active={focusedPanel === "stage"}
                label="animation"
                onClick={() => setFocusedPanel(focusedPanel === "stage" ? "all" : "stage")}
              />
              <Badge tone={result.kind === "storyboard" ? "blue" : "amber"}>{result.kind === "storyboard" ? "spatial storyboard" : result.kind}</Badge>
              <ConfidenceMeter value={result.confidence} />
            </div>
          </div>

          {step && trace ? (
            <>
              <div className="viewport-frame relative min-h-[330px] flex-1 overflow-hidden rounded-lg border border-ink-700/60">
                {viewMode === "galaxy" ? (
                  <CodeGalaxy3D
                    code={code}
                    activeLine={step.line}
                    onPick={(line) => playback.scrub(Math.max(0, line - 1))}
                  />
                ) : (
                  <ExecutionStage3D step={step} />
                )}
                {!useSpecializedStage && (
                  <>
                    <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-ink-700/80 bg-ink-950/80 px-3 py-2 shadow-xl backdrop-blur-md">
                      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-500">active instruction</p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-ink-200"><span className="font-mono font-semibold text-ember-300">L{step.line}</span>{step.event.replaceAll("_", " ")}</p>
                    </div>
                    <div className="pointer-events-none absolute right-3 top-3 rounded-lg border border-ink-700/80 bg-ink-950/80 px-3 py-2 text-right shadow-xl backdrop-blur-md">
                      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-500">trace</p>
                      <p className="mt-1 font-mono text-xs text-arc-300">{playback.index + 1} / {trace.steps.length}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="border-t border-ink-800 bg-ink-900/95 px-4 py-3">
                <div className="mb-3 flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ember-500/15 font-mono text-[9px] font-bold text-ember-300 ring-1 ring-ember-500/30">{playback.index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-relaxed text-ink-200">{step.description}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-ink-500">{result.note}</p>
                  </div>
                </div>
                <input aria-label="Trace position" type="range" min={0} max={Math.max(trace.steps.length - 1, 0)} value={playback.index} onChange={(event) => playback.scrub(Number(event.target.value))} className="trace-range mb-3 w-full" />
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button variant="primary" className="h-8 px-3 text-xs" onClick={playback.toggle}>{playback.playing ? <Pause size={13} /> : <Play size={13} />}{playback.playing ? "Pause" : "Play"}</Button>
                  <Button className="h-8 w-8 p-0" onClick={playback.stepBack} title="Previous step"><SkipBack size={13} /></Button>
                  <Button className="h-8 w-8 p-0" onClick={playback.stepForward} title="Next step"><SkipForward size={13} /></Button>
                  <Button variant="ghost" className="h-8 w-8 p-0" onClick={playback.reset} title="Reset"><RotateCcw size={13} /></Button>
                  <div className="ml-1 flex items-center gap-1"><Gauge size={12} className="text-ink-500" />{[0.5, 1, 2, 4].map((speed) => <button key={speed} type="button" onClick={() => playback.setSpeed(speed)} className={cn("rounded px-1.5 py-1 font-mono text-[9px]", playback.speed === speed ? "bg-arc-500/15 text-arc-300 ring-1 ring-arc-500/30" : "text-ink-500 hover:text-ink-300")}>{speed}×</button>)}</div>
                  <Button variant="ghost" className="ml-auto h-8 px-2.5 text-xs" onClick={openInLab}><FileCode2 size={13} /> Full playback lab</Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <Braces size={26} className="text-ink-600" />
              <p className="mt-4 text-sm font-medium text-ink-200">The forge is waiting for code.</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-ink-500">Paste at least a few lines. Known DSA patterns receive semantic animations; everything else becomes a safe spatial storyboard.</p>
            </div>
          )}
        </section>
      </div>

      <div className="hidden shrink-0 items-center gap-2 overflow-x-auto border-t border-ink-800 bg-ink-950 px-4 py-1.5 lg:flex">
        <span className="mr-1 flex shrink-0 items-center gap-1 text-[9px] uppercase tracking-widest text-ink-600"><CheckCircle2 size={10} /> accepts</span>
        {LANGUAGE_LABELS.map((item) => <span key={item} className="shrink-0 font-mono text-[9px] text-ink-500">{item}</span>)}
        <span className="ml-auto shrink-0 text-[9px] text-ink-600">Unknown syntax stays structural · pasted code is never executed</span>
      </div>
    </div>
  );
}
