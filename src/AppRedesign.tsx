import {
  BookOpen,
  Code2,
  Database,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Save,
  Settings,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { CodeInputPanel } from "./components/CodeInputPanel";
import { DsaWorkbench } from "./components/DsaWorkbench";
import { PracticePanel } from "./components/PracticePanel";
import { ThreeExecutionStage } from "./components/ThreeExecutionStage";
import { WorkbenchInspector } from "./components/WorkbenchInspector";
import { useCodeAnvil } from "./hooks/useCodeAnvil";

function Brand() {
  return (
    <div className="ca-brand" aria-label="CodeAnvil">
      <span className="ca-brand__mark" aria-hidden="true">
        <i />
      </span>
      <div>
        <strong>CodeAnvil</strong>
        <span>Execution workbench</span>
      </div>
    </div>
  );
}

function actionLabel(type: string) {
  return type.replace(/_/g, " ");
}

function ForgeCatalog({
  activeTitle,
  focusMode,
  onSelect,
  onOpenDsa,
  step,
  traces,
}: {
  activeTitle: string;
  focusMode: boolean;
  onSelect: (traceTitle: string) => void;
  onOpenDsa: (tab: "sorting" | "graph") => void;
  step: ReturnType<typeof useCodeAnvil>["step"];
  traces: ReturnType<typeof useCodeAnvil>["traceCatalog"];
}) {
  const curated = traces.filter((trace) => !trace.title.startsWith("Custom "));
  const semanticActions = step.actions.filter((action) => action.type !== "focus_line");
  const currentActions = (semanticActions.length ? semanticActions : step.actions).slice(0, 4);

  return (
    <aside className={"ca-catalog" + (focusMode ? " is-focused" : "")} aria-label="CodeAnvil catalog">
      <header className="ca-catalog__hero">
        <span>
          <Flame size={14} />
          Forge queue
        </span>
        <strong>Pick code, trace it, then inspect every move.</strong>
      </header>

      <section className="ca-catalog__section" aria-label="Validated traces">
        <div className="ca-catalog__title">
          <strong>Validated traces</strong>
          <span>{curated.length}</span>
        </div>
        {curated.map((trace) => (
          <button
            aria-current={activeTitle === trace.title ? "true" : undefined}
            className={activeTitle === trace.title ? "is-active" : ""}
            key={trace.title}
            onClick={() => onSelect(trace.title)}
            type="button"
          >
            <strong>{trace.title}</strong>
            <span>{trace.metadata.topic} / {trace.steps.length} steps</span>
          </button>
        ))}
      </section>

      <section className="ca-catalog__section ca-catalog__section--grid" aria-label="DSA lab shortcuts">
        <div className="ca-catalog__title">
          <strong>DSA lab</strong>
          <span>live</span>
        </div>
        <button onClick={() => onOpenDsa("sorting")} type="button">
          <strong>Sorting forge</strong>
          <span>Bubble, selection, insertion</span>
        </button>
        <button onClick={() => onOpenDsa("graph")} type="button">
          <strong>Traversal map</strong>
          <span>BFS and DFS state flow</span>
        </button>
      </section>

      <section className="ca-action-map" aria-label="Current trace actions">
        <div className="ca-catalog__title">
          <strong>Action map</strong>
          <span>line {step.line}</span>
        </div>
        {currentActions.map((action, index) => (
          <div className={"ca-action-map__item ca-action-" + action.type} key={String(index) + action.type}>
            <code>{actionLabel(action.type)}</code>
            <span>
              {"target" in action ? action.target : "name" in action ? action.name : "node" in action ? action.node : "trace"}
            </span>
          </div>
        ))}
      </section>
    </aside>
  );
}

function PlaybackBar({
  disabled,
  isPlaying,
  maxStepIndex,
  onReset,
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
  disabled: boolean;
  isPlaying: boolean;
  maxStepIndex: number;
  onReset: () => void;
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
    <section className={"ca-playback" + (disabled ? " is-disabled" : "")} aria-label="Trace playback">
      <div className="ca-playback__buttons">
        <button
          disabled={disabled || stepIndex === 0}
          onClick={onStepBackward}
          title="Previous step"
          type="button"
        >
          <SkipBack size={17} />
        </button>
        <button
          className="is-primary"
          disabled={disabled}
          onClick={onTogglePlayback}
          title={isPlaying ? "Pause playback" : "Play trace"}
          type="button"
        >
          {isPlaying ? <Pause size={17} /> : <Play size={17} />}
          <span>{isPlaying ? "Pause" : "Play"}</span>
        </button>
        <button
          disabled={disabled || stepIndex >= maxStepIndex}
          onClick={onStepForward}
          title="Next step"
          type="button"
        >
          <SkipForward size={17} />
        </button>
        <button disabled={disabled || stepIndex === 0} onClick={onReset} title="Reset trace" type="button">
          <RotateCcw size={16} />
        </button>
      </div>

      <label className="ca-scrubber">
        <span>{disabled ? "Trace edited code" : "Step " + String(stepIndex + 1) + " of " + String(maxStepIndex + 1)}</span>
        <input
          disabled={disabled}
          max={maxStepIndex}
          min="0"
          onChange={(event) => onScrub(Number(event.target.value))}
          type="range"
          value={stepIndex}
        />
        <em>{Math.round(progress * 100)}%</em>
      </label>

      <label className="ca-speed-select">
        <span>Speed</span>
        <select
          disabled={disabled}
          onChange={(event) => setSpeed(Number(event.target.value))}
          value={speed}
        >
          <option value="0.75">0.75x</option>
          <option value="1">1x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2x</option>
        </select>
      </label>

      <label className="ca-toggle">
        <input
          checked={practiceMode}
          onChange={(event) => setPracticeMode(event.target.checked)}
          type="checkbox"
        />
        <span aria-hidden="true" />
        <strong>Practice</strong>
      </label>
    </section>
  );
}

export default function AppRedesign() {
  const app = useCodeAnvil();

  return (
    <div className="ca-shell">
      <header className="ca-topbar">
        <Brand />
        <nav className="ca-mainnav" aria-label="Workspace">
          <button
            className={app.mode === "code" ? "is-active" : ""}
            onClick={() => app.setMode("code")}
            type="button"
          >
            <Code2 size={16} />
            <span>Code</span>
          </button>
          <button
            className={app.mode === "examples" ? "is-active" : ""}
            onClick={() => app.setMode("examples")}
            type="button"
          >
            <BookOpen size={16} />
            <span>Examples</span>
          </button>
          <button
            className={app.mode === "dsa" ? "is-active" : ""}
            onClick={() => app.openDsa("sorting")}
            type="button"
          >
            <Database size={16} />
            <span>DSA Lab</span>
          </button>
        </nav>
        <div className="ca-topbar__actions">
          <button
            className="ca-command"
            disabled={app.isStale || app.mode === "dsa"}
            onClick={app.saveSession}
            title="Save current trace position"
            type="button"
          >
            <Save size={16} />
            <span>Save</span>
            {app.savedSessions.length ? <em>{app.savedSessions.length}</em> : null}
          </button>
          <button
            aria-expanded={app.settingsOpen}
            className={"ca-icon-button" + (app.settingsOpen ? " is-active" : "")}
            onClick={() => app.setSettingsOpen(!app.settingsOpen)}
            title="Settings"
            type="button"
          >
            <Settings size={17} />
          </button>
        </div>
      </header>

      {app.settingsOpen ? (
        <aside className="ca-settings" aria-label="Settings">
          <header>
            <strong>Settings</strong>
            <span>Stored in this browser</span>
          </header>
          <label className="ca-toggle">
            <input
              checked={app.reduceMotion}
              onChange={(event) => app.setReduceMotion(event.target.checked)}
              type="checkbox"
            />
            <span aria-hidden="true" />
            <strong>Reduce motion</strong>
          </label>
        </aside>
      ) : null}

      <main className="ca-main">
        {app.mode === "dsa" ? (
          <DsaWorkbench
            activeTab={app.dsaTab}
            onTabChange={app.setDsaTab}
            reduceMotion={app.reduceMotion}
          />
        ) : (
          <section className={"ca-forge-layout" + (app.mode === "examples" ? " is-catalog-focus" : "")}>
            <ForgeCatalog
              activeTitle={app.trace.title}
              focusMode={app.mode === "examples"}
              onOpenDsa={app.openDsa}
              onSelect={app.selectTrace}
              step={app.step}
              traces={app.traceCatalog}
            />

            <div className="ca-workspace">
              <section className="ca-workbench">
                <CodeInputPanel
                  code={app.code}
                  isStale={app.isStale}
                  onCodeChange={app.updateCode}
                  onTrace={app.traceCode}
                  step={app.step}
                  title={app.trace.title}
                />
                <ThreeExecutionStage
                  isStale={app.isStale}
                  reduceMotion={app.reduceMotion}
                  step={app.step}
                />
                <WorkbenchInspector
                  diagnostics={app.diagnostics}
                  onDeleteSession={app.deleteSession}
                  onResumeSession={app.resumeSession}
                  savedSessions={app.savedSessions}
                  step={app.step}
                />
              </section>

              <PlaybackBar
                disabled={app.isStale}
                isPlaying={app.isPlaying}
                maxStepIndex={app.maxStepIndex}
                onReset={app.reset}
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
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
