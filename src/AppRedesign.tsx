import { useState } from "react";
import {
  BookOpen,
  Code2,
  Database,
  Flame,
  Home,
  Maximize2,
  MessageSquareText,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Play,
  RotateCcw,
  Save,
  Settings,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { CodeInputPanel } from "./components/CodeInputPanel";
import { LandingPage } from "./components/LandingPage";
import { DsaWorkbench } from "./components/DsaWorkbench";
import { PracticePanel } from "./components/PracticePanel";
import { ThreeExecutionStage } from "./components/ThreeExecutionStage";
import { WorkbenchInspector, type InspectorTab } from "./components/WorkbenchInspector";
import { useCodeAnvil } from "./hooks/useCodeAnvil";
import { useExecutionAudio } from "./hooks/useExecutionAudio";

type WorkspaceFocus = "balanced" | "animation" | "code" | "inspector";

function focusLabel(focus: WorkspaceFocus) {
  if (focus === "animation") return "Animation expanded";
  if (focus === "code") return "Code expanded";
  if (focus === "inspector") return "Inspector expanded";
  return "Balanced panels";
}

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
  collapsed,
  focusMode,
  onSelect,
  onOpenDsa,
  onToggleCollapsed,
  step,
  traces,
}: {
  activeTitle: string;
  collapsed: boolean;
  focusMode: boolean;
  onSelect: (traceTitle: string) => void;
  onOpenDsa: (tab: "sorting" | "graph") => void;
  onToggleCollapsed: () => void;
  step: ReturnType<typeof useCodeAnvil>["step"];
  traces: ReturnType<typeof useCodeAnvil>["traceCatalog"];
}) {
  const curated = traces.filter((trace) => !trace.title.startsWith("Custom "));
  const semanticActions = step.actions.filter((action) => action.type !== "focus_line");
  const currentActions = (semanticActions.length ? semanticActions : step.actions).slice(0, 4);

  return (
    <aside className={"ca-catalog" + (focusMode ? " is-focused" : "") + (collapsed ? " is-collapsed" : "")} aria-label="CodeAnvil catalog">
      <header className="ca-catalog__hero">
        <span>
          <Flame size={14} />
          Forge queue
        </span>
        <button
          aria-expanded={!collapsed}
          className="ca-catalog__collapse"
          onClick={onToggleCollapsed}
          title={collapsed ? "Restore forge queue" : "Minimize forge queue"}
          type="button"
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          <span>{collapsed ? "Restore" : "Minimize"}</span>
        </button>
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

function LayoutToolbar({
  catalogCollapsed,
  focus,
  onFocusChange,
  onToggleCatalog,
}: {
  catalogCollapsed: boolean;
  focus: WorkspaceFocus;
  onFocusChange: (focus: WorkspaceFocus) => void;
  onToggleCatalog: () => void;
}) {
  const options: Array<{ focus: WorkspaceFocus; icon: JSX.Element; label: string; title: string }> = [
    { focus: "balanced", icon: <Minimize2 size={15} />, label: "Balanced", title: "Show balanced workspace" },
    { focus: "animation", icon: <Maximize2 size={15} />, label: "Animation", title: "Expand animation section" },
    { focus: "code", icon: <Code2 size={15} />, label: "Code", title: "Expand code editor" },
    { focus: "inspector", icon: <Database size={15} />, label: "Inspector", title: "Expand inspector" },
  ];

  return (
    <section className="ca-layout-toolbar" aria-label="Workspace layout controls">
      <div className="ca-layout-toolbar__status">
        <span>Layout</span>
        <strong>{focusLabel(focus)}</strong>
      </div>
      <div className="ca-layout-toolbar__actions">
        {options.map((option) => (
          <button
            aria-pressed={focus === option.focus}
            className={focus === option.focus ? "is-active" : ""}
            key={option.focus}
            onClick={() => onFocusChange(option.focus)}
            title={option.title}
            type="button"
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        ))}
        <button
          aria-pressed={catalogCollapsed}
          className={catalogCollapsed ? "is-active" : ""}
          onClick={onToggleCatalog}
          title={catalogCollapsed ? "Restore forge queue" : "Minimize forge queue"}
          type="button"
        >
          {catalogCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          <span>Queue</span>
        </button>
      </div>
    </section>
  );
}

function PlaybackBar({
  audioReady,
  audioSupported,
  disabled,
  isPlaying,
  maxStepIndex,
  narrationEnabled,
  onReset,
  onScrub,
  onStepBackward,
  onStepForward,
  onToggleNarration,
  onTogglePlayback,
  onToggleSound,
  practiceMode,
  progress,
  setPracticeMode,
  setSpeed,
  soundEnabled,
  speechSupported,
  speed,
  stepIndex,
}: {
  audioReady: boolean;
  audioSupported: boolean;
  disabled: boolean;
  isPlaying: boolean;
  maxStepIndex: number;
  narrationEnabled: boolean;
  onReset: () => void;
  onScrub: (step: number) => void;
  onStepBackward: () => void;
  onStepForward: () => void;
  onToggleNarration: () => void;
  onTogglePlayback: () => void;
  onToggleSound: () => void;
  practiceMode: boolean;
  progress: number;
  setPracticeMode: (enabled: boolean) => void;
  setSpeed: (speed: number) => void;
  soundEnabled: boolean;
  speechSupported: boolean;
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
        <button
          aria-pressed={soundEnabled}
          className={soundEnabled ? "is-audio-on" : ""}
          disabled={!audioSupported}
          onClick={onToggleSound}
          title={soundEnabled ? (audioReady ? "Mute step sounds" : "Finish enabling step sounds") : "Enable step sounds"}
          type="button"
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
        <button
          aria-pressed={narrationEnabled}
          className={narrationEnabled ? "is-narration-on" : ""}
          disabled={!speechSupported}
          onClick={onToggleNarration}
          title={narrationEnabled ? "Stop spoken step explanations" : "Speak step explanations"}
          type="button"
        >
          <MessageSquareText size={16} />
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
  const [workspaceFocus, setWorkspaceFocus] = useState<WorkspaceFocus>("balanced");
  const [catalogCollapsed, setCatalogCollapsed] = useState(false);
  const [initialInspectorTab, setInitialInspectorTab] = useState<InspectorTab>("variables");
  const audio = useExecutionAudio({
    enabled: app.soundEnabled,
    muted: app.isStale,
    narrationEnabled: app.narrationEnabled,
    step: app.step,
  });

  function setSoundPreference(enabled: boolean) {
    app.setSoundEnabled(enabled);
    if (enabled) void audio.activateAudio();
  }

  function setNarrationPreference(enabled: boolean) {
    app.setNarrationEnabled(enabled);
    if (enabled) {
      void audio.activateAudio().then(() => audio.speakCurrentStep());
    }
  }

  function openCodeWorkbench(focus: WorkspaceFocus = "balanced", inspectorTab: InspectorTab = "variables") {
    setCatalogCollapsed(false);
    setWorkspaceFocus(focus);
    setInitialInspectorTab(inspectorTab);
    app.setMode("code");
  }

  function openExamples() {
    setCatalogCollapsed(false);
    setInitialInspectorTab("variables");
    app.setMode("examples");
  }

  function openSortingLab() {
    app.openDsa("sorting");
  }

  function openGraphLab() {
    app.openDsa("graph");
  }

  return (
    <div className={"ca-shell" + (app.reduceMotion ? " reduce-motion" : "")}>
      <header className="ca-topbar">
        <Brand />
        <nav className="ca-mainnav" aria-label="Workspace">
          <button
            className={app.mode === "home" ? "is-active" : ""}
            onClick={() => app.setMode("home")}
            type="button"
          >
            <Home size={16} />
            <span>Launch</span>
          </button>
          <button
            className={app.mode === "code" ? "is-active" : ""}
            onClick={() => openCodeWorkbench()}
            type="button"
          >
            <Code2 size={16} />
            <span>Code</span>
          </button>
          <button
            className={app.mode === "examples" ? "is-active" : ""}
            onClick={openExamples}
            type="button"
          >
            <BookOpen size={16} />
            <span>Examples</span>
          </button>
          <button
            className={app.mode === "dsa" ? "is-active" : ""}
            onClick={openSortingLab}
            type="button"
          >
            <Database size={16} />
            <span>DSA Lab</span>
          </button>
        </nav>
        <div className="ca-topbar__actions">
          <button
            className="ca-command"
            disabled={app.isStale || app.mode === "dsa" || app.mode === "home"}
            onClick={app.saveSession}
            title={app.mode === "home" ? "Open the visualizer to save a session" : "Save current trace position"}
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
          <div className="ca-settings__group">
            <label className="ca-toggle">
              <input
                checked={app.reduceMotion}
                onChange={(event) => app.setReduceMotion(event.target.checked)}
                type="checkbox"
              />
              <span aria-hidden="true" />
              <strong>Reduce motion</strong>
            </label>
            <label className="ca-toggle">
              <input
                checked={app.soundEnabled}
                disabled={!audio.audioSupported}
                onChange={(event) => setSoundPreference(event.target.checked)}
                type="checkbox"
              />
              <span aria-hidden="true" />
              <strong>Step sounds</strong>
            </label>
            <label className="ca-toggle">
              <input
                checked={app.narrationEnabled}
                disabled={!audio.speechSupported}
                onChange={(event) => setNarrationPreference(event.target.checked)}
                type="checkbox"
              />
              <span aria-hidden="true" />
              <strong>Narration</strong>
            </label>
          </div>
        </aside>
      ) : null}

      <main className={"ca-main" + (app.mode === "home" ? " ca-main--home" : "")}>
        {app.mode === "home" ? (
          <LandingPage
            currentTraceTitle={app.trace.title}
            onOpenExamples={openExamples}
            onOpenGraph={openGraphLab}
            onOpenRenderer={() => openCodeWorkbench("animation")}
            onOpenSessions={() => openCodeWorkbench("inspector", "sessions")}
            onOpenSorting={openSortingLab}
            onStartVisualizing={() => openCodeWorkbench()}
            onToggleSound={() => setSoundPreference(!app.soundEnabled)}
            savedSessionCount={app.savedSessions.length}
            soundEnabled={app.soundEnabled}
          />
        ) : app.mode === "dsa" ? (
          <DsaWorkbench
            activeTab={app.dsaTab}
            onSoundCue={audio.playDsaCue}
            onTabChange={app.setDsaTab}
            reduceMotion={app.reduceMotion}
          />
        ) : (
          <section className={"ca-forge-layout" + (app.mode === "examples" ? " is-catalog-focus" : "") + (catalogCollapsed ? " is-catalog-collapsed" : "")}>
            <ForgeCatalog
              activeTitle={app.trace.title}
              collapsed={catalogCollapsed}
              focusMode={app.mode === "examples"}
              onOpenDsa={app.openDsa}
              onSelect={app.selectTrace}
              onToggleCollapsed={() => setCatalogCollapsed((collapsed) => !collapsed)}
              step={app.step}
              traces={app.traceCatalog}
            />

            <div className="ca-workspace">
              <LayoutToolbar
                catalogCollapsed={catalogCollapsed}
                focus={workspaceFocus}
                onFocusChange={setWorkspaceFocus}
                onToggleCatalog={() => setCatalogCollapsed((collapsed) => !collapsed)}
              />
              <section className={"ca-workbench ca-workbench--" + workspaceFocus}>
                <CodeInputPanel
                  activeLineNumber={app.activeLineNumber}
                  canTrace={app.codeLanguage === "python"}
                  code={app.code}
                  extension={app.codeVariant.extension}
                  isStale={app.isStale}
                  language={app.codeLanguage}
                  languageLabel={app.codeVariant.label}
                  languageOptions={app.codeLanguages}
                  onCodeChange={app.updateCode}
                  onLanguageChange={app.setCodeLanguage}
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
                  initialTab={initialInspectorTab}
                  onDeleteSession={app.deleteSession}
                  onResumeSession={app.resumeSession}
                  savedSessions={app.savedSessions}
                  step={app.step}
                />
              </section>

              <PlaybackBar
                audioReady={audio.audioReady}
                audioSupported={audio.audioSupported}
                disabled={app.isStale}
                isPlaying={app.isPlaying}
                maxStepIndex={app.maxStepIndex}
                narrationEnabled={app.narrationEnabled}
                onReset={app.reset}
                onScrub={app.scrubToStep}
                onStepBackward={app.stepBackward}
                onStepForward={app.stepForward}
                onToggleNarration={() => setNarrationPreference(!app.narrationEnabled)}
                onTogglePlayback={app.togglePlayback}
                onToggleSound={() => setSoundPreference(!app.soundEnabled)}
                practiceMode={app.practiceMode}
                progress={app.progress}
                setPracticeMode={app.setPracticeMode}
                setSpeed={app.setSpeed}
                soundEnabled={app.soundEnabled}
                speechSupported={audio.speechSupported}
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
