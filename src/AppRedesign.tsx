import {
  BookOpen,
  Code2,
  Database,
  Pause,
  Play,
  RotateCcw,
  Save,
  Settings,
  SkipBack,
  SkipForward,
  Sparkles,
} from "lucide-react";
import { CodeInputPanel } from "./components/CodeInputPanel";
import { DsaWorkbench } from "./components/DsaWorkbench";
import { PracticePanel } from "./components/PracticePanel";
import { ThreeExecutionStage } from "./components/ThreeExecutionStage";
import { WorkbenchInspector } from "./components/WorkbenchInspector";
import { useCodeAnvil } from "./hooks/useCodeAnvil";

function Brand() {
  return (
    <div className="ca-brand">
      <div className="ca-brand__mark" aria-hidden="true">
        <span />
      </div>
      <div>
        <strong>CodeAnvil</strong>
        <span>Forge Your Logic</span>
      </div>
    </div>
  );
}

function ExampleShelf({
  activeIndex,
  onSelect,
  traces,
}: {
  activeIndex: number;
  onSelect: (index: number) => void;
  traces: ReturnType<typeof useCodeAnvil>["traceCatalog"];
}) {
  return (
    <section className="ca-examples" aria-label="Example traces">
      {traces
        .filter((trace) => !trace.title.startsWith("Custom "))
        .map((trace, index) => (
          <button
            className={activeIndex === index ? "is-active" : ""}
            key={trace.title}
            onClick={() => onSelect(index)}
            type="button"
          >
            <strong>{trace.title}</strong>
            <span>
              {trace.metadata.topic} | {trace.steps.length} steps
            </span>
          </button>
        ))}
    </section>
  );
}

function PlaybackBar({
  isPlaying,
  maxStepIndex,
  onReset,
  onSave,
  onScrub,
  onStepBackward,
  onStepForward,
  onTogglePlayback,
  practiceMode,
  progress,
  setPracticeMode,
  setSpeed,
  speed,
  stepIndex,
}: {
  isPlaying: boolean;
  maxStepIndex: number;
  onReset: () => void;
  onSave: () => void;
  onScrub: (step: number) => void;
  onStepBackward: () => void;
  onStepForward: () => void;
  onTogglePlayback: () => void;
  practiceMode: boolean;
  progress: number;
  setPracticeMode: (enabled: boolean) => void;
  setSpeed: (speed: number) => void;
  speed: number;
  stepIndex: number;
}) {
  return (
    <section className="ca-playback" aria-label="Playback controls">
      <div className="ca-playback__buttons">
        <button onClick={onStepBackward} type="button" title="Step back">
          <SkipBack size={17} />
        </button>
        <button className="is-primary" onClick={onTogglePlayback} type="button" title={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <button onClick={onStepForward} type="button" title="Step forward">
          <SkipForward size={17} />
        </button>
        <button onClick={onReset} type="button" title="Reset">
          <RotateCcw size={17} />
          <span>Reset</span>
        </button>
        <button onClick={onSave} type="button" title="Save session">
          <Save size={17} />
          <span>Save</span>
        </button>
      </div>

      <label className="ca-scrubber">
        <span>Step {stepIndex + 1}</span>
        <input
          max={maxStepIndex}
          min="0"
          onChange={(event) => onScrub(Number(event.target.value))}
          type="range"
          value={stepIndex}
        />
        <em>{Math.round(progress * 100)}%</em>
      </label>

      <label className="ca-speed">
        Speed
        <input max="2" min="0.5" onChange={(event) => setSpeed(Number(event.target.value))} step="0.25" type="range" value={speed} />
        <strong>{speed.toFixed(2).replace(".00", "")}x</strong>
      </label>

      <label className="ca-switch">
        Practice
        <input checked={practiceMode} onChange={(event) => setPracticeMode(event.target.checked)} type="checkbox" />
      </label>
    </section>
  );
}

export default function AppRedesign() {
  const app = useCodeAnvil();

  return (
    <div className="ca-shell">
      <aside className="ca-rail">
        <Brand />
        <nav aria-label="Workspace">
          <button className={app.mode === "code" ? "is-active" : ""} onClick={() => app.setMode("code")} type="button">
            <Code2 size={18} />
            <span>Workbench</span>
          </button>
          <button className={app.mode === "examples" ? "is-active" : ""} onClick={() => app.setMode("examples")} type="button">
            <BookOpen size={18} />
            <span>Examples</span>
          </button>
          <button className={app.mode === "dsa" ? "is-active" : ""} onClick={() => app.openDsa("sorting")} type="button">
            <Database size={18} />
            <span>DSA Arena</span>
          </button>
          <button className={app.settingsOpen ? "is-active" : ""} onClick={() => app.setSettingsOpen(!app.settingsOpen)} type="button">
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </nav>
        <div className="ca-student">
          <strong>Student</strong>
          <span>{app.savedSessions.length} saved sessions</span>
        </div>
      </aside>

      <main className="ca-main">
        <header className="ca-commandbar">
          <div className="ca-tabs">
            <button className={app.mode === "code" ? "is-active" : ""} onClick={() => app.setMode("code")} type="button">
              Code Input
            </button>
            <button className={app.mode === "examples" ? "is-active" : ""} onClick={() => app.setMode("examples")} type="button">
              Examples
            </button>
            <button className={app.mode === "dsa" ? "is-active" : ""} onClick={() => app.openDsa("sorting")} type="button">
              DSA Arena
            </button>
          </div>

          <div className="ca-actions">
            <button className="is-strong" onClick={app.traceCode} type="button">
              <Sparkles size={16} />
              <span>Trace My Code</span>
            </button>
            <button onClick={app.useCurrentExample} type="button">
              <BookOpen size={16} />
              <span>Use Example</span>
            </button>
            <button onClick={app.saveSession} type="button">
              <Save size={16} />
              <span>Save Session</span>
            </button>
          </div>
        </header>

        {app.settingsOpen ? (
          <section className="ca-settings" aria-label="Settings">
            <label>
              Reduce motion
              <input checked={app.reduceMotion} onChange={(event) => app.setReduceMotion(event.target.checked)} type="checkbox" />
            </label>
            <span>Code execution is traced locally in your browser. Unsafe APIs are blocked in this MVP.</span>
          </section>
        ) : null}

        {app.mode === "examples" ? (
          <ExampleShelf activeIndex={app.traceIndex} onSelect={app.selectTrace} traces={app.traceCatalog} />
        ) : null}

        {app.mode === "dsa" ? (
          <DsaWorkbench activeTab={app.dsaTab} onTabChange={app.setDsaTab} />
        ) : (
          <>
            <section className="ca-workbench">
              <CodeInputPanel code={app.code} isDirty={app.isDirty} onCodeChange={app.updateCode} step={app.step} />
              <ThreeExecutionStage reduceMotion={app.reduceMotion} step={app.step} />
              <WorkbenchInspector
                diagnostics={app.diagnostics}
                onResumeSession={app.resumeSession}
                savedSessions={app.savedSessions}
                step={app.step}
              />
            </section>

            <PlaybackBar
              isPlaying={app.isPlaying}
              maxStepIndex={app.maxStepIndex}
              onReset={app.reset}
              onSave={app.saveSession}
              onScrub={app.scrubToStep}
              onStepBackward={app.stepBackward}
              onStepForward={app.stepForward}
              onTogglePlayback={app.togglePlayback}
              practiceMode={app.practiceMode}
              progress={app.progress}
              setPracticeMode={app.setPracticeMode}
              setSpeed={app.setSpeed}
              speed={app.speed}
              stepIndex={app.stepIndex}
            />

            <PracticePanel
              answer={app.practiceAnswer}
              onAnswerChange={app.setPracticeAnswer}
              onCheck={app.checkPracticeAnswer}
              prompt={app.activePrompt}
              result={app.practiceResult}
              visible={app.practiceMode}
            />
          </>
        )}
      </main>
    </div>
  );
}
