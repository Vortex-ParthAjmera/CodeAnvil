import { useEffect, useMemo, useState } from "react";
import {
  Braces,
  Check,
  Clipboard,
  History,
  Layers3,
  Play,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import type { SavedSession, TraceStep } from "../types";
import { formatValue } from "../utils/formatValue";

interface Diagnostic {
  kind: "info" | "error";
  message: string;
  line?: number;
}

type InspectorTab = "variables" | "stack" | "output" | "sessions";

interface WorkbenchInspectorProps {
  diagnostics: Diagnostic[];
  onDeleteSession: (sessionId: string) => void;
  onResumeSession: (session: SavedSession) => void;
  savedSessions: SavedSession[];
  step: TraceStep;
}

const tabs: Array<{
  id: InspectorTab;
  label: string;
  icon: typeof Braces;
}> = [
  { id: "variables", label: "Variables", icon: Braces },
  { id: "stack", label: "Stack", icon: Layers3 },
  { id: "output", label: "Output", icon: Terminal },
  { id: "sessions", label: "Sessions", icon: History },
];

function savedLabel(savedAt: string) {
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return "saved";
  return date.toLocaleString([], {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}

export function WorkbenchInspector({
  diagnostics,
  onDeleteSession,
  onResumeSession,
  savedSessions,
  step,
}: WorkbenchInspectorProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>("variables");
  const [copied, setCopied] = useState(false);
  const changedVariables = new Set(step.changed.variables || []);
  const stackFrames = [...step.stack].reverse();
  const variables = useMemo(
    () => Object.entries(step.variables).filter(([name]) => !name.startsWith("__")),
    [step.variables],
  );

  useEffect(() => {
    setCopied(false);
  }, [step.output]);

  async function copyOutput() {
    if (!step.output) return;
    try {
      await navigator.clipboard.writeText(step.output);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <aside className="ca-inspector" aria-label="Execution inspector">
      <div className="ca-inspector__tabs" role="tablist" aria-label="Inspector views">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              aria-label={tab.label}
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? "is-active" : ""}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              title={tab.label}
              type="button"
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="ca-diagnostics" aria-live="polite">
        {diagnostics.map((diagnostic, index) => (
          <div
            className={"ca-diagnostic ca-diagnostic--" + diagnostic.kind}
            key={diagnostic.message + String(index)}
          >
            {diagnostic.kind === "error" ? <X size={14} /> : <Check size={14} />}
            <span>
              {diagnostic.line ? "Line " + String(diagnostic.line) + ": " : ""}
              {diagnostic.message}
            </span>
          </div>
        ))}
      </div>

      <div className="ca-inspector__body">
        {activeTab === "variables" ? (
          <section aria-label="Variables">
            <header className="ca-pane-title">
              <strong>Current scope</strong>
              <span>{variables.length} values</span>
            </header>
            <div className="ca-table">
              <div className="ca-table__row ca-table__row--head">
                <span>Name</span>
                <span>Value</span>
              </div>
              {variables.map(([name, value]) => (
                <div
                  className={"ca-table__row" + (changedVariables.has(name) ? " is-hot" : "")}
                  key={name}
                >
                  <code>{name}</code>
                  <strong title={formatValue(value)}>{formatValue(value)}</strong>
                </div>
              ))}
              {!variables.length ? <div className="ca-empty-line">No values exist at this step.</div> : null}
            </div>
          </section>
        ) : null}

        {activeTab === "stack" ? (
          <section aria-label="Call stack">
            <header className="ca-pane-title">
              <strong>Call stack</strong>
              <span>{stackFrames.length} frames</span>
            </header>
            <div className="ca-stack">
              {stackFrames.map((frame, index) => (
                <div className={"ca-stack__frame" + (index === 0 ? " is-current" : "")} key={frame.id}>
                  <span>{stackFrames.length - index}</span>
                  <div>
                    <strong>{frame.name}</strong>
                    <code>
                      {Object.entries(frame.locals)
                        .filter(([name]) => !name.startsWith("__"))
                        .map(([name, value]) => name + "=" + formatValue(value))
                        .join("  ") || "no locals"}
                    </code>
                  </div>
                  <em>line {frame.line}</em>
                </div>
              ))}
              {!stackFrames.length ? <div className="ca-empty-line">The call stack is empty.</div> : null}
            </div>
          </section>
        ) : null}

        {activeTab === "output" ? (
          <section aria-label="Program output">
            <header className="ca-pane-title">
              <strong>Program output</strong>
              <button disabled={!step.output} onClick={copyOutput} title="Copy output" type="button">
                {copied ? <Check size={15} /> : <Clipboard size={15} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </header>
            <pre className={"ca-output" + (step.changed.output ? " is-hot" : "")}>
              {step.output || "No output at this step."}
            </pre>
          </section>
        ) : null}

        {activeTab === "sessions" ? (
          <section aria-label="Saved sessions">
            <header className="ca-pane-title">
              <strong>Saved sessions</strong>
              <span>{savedSessions.length} stored</span>
            </header>
            <div className="ca-session-list">
              {savedSessions.map((session) => (
                <div className="ca-session" key={session.id}>
                  <div>
                    <strong>{session.traceTitle}</strong>
                    <span>
                      step {session.stepIndex + 1} of {session.trace.steps.length} | {savedLabel(session.savedAt)}
                    </span>
                  </div>
                  <button
                    aria-label={"Resume " + session.traceTitle}
                    onClick={() => onResumeSession(session)}
                    title="Resume session"
                    type="button"
                  >
                    <Play size={15} />
                  </button>
                  <button
                    aria-label={"Delete " + session.traceTitle}
                    onClick={() => onDeleteSession(session.id)}
                    title="Delete session"
                    type="button"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              {!savedSessions.length ? (
                <div className="ca-empty-line">No saved sessions.</div>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
