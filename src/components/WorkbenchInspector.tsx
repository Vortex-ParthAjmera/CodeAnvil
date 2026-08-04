import { Check, Clipboard, X } from "lucide-react";
import type { SavedSession, TraceStep } from "../types";
import { formatValue } from "../utils/formatValue";

interface Diagnostic {
  kind: "info" | "error";
  message: string;
  line?: number;
}

interface WorkbenchInspectorProps {
  diagnostics: Diagnostic[];
  onResumeSession: (session: SavedSession) => void;
  savedSessions: SavedSession[];
  step: TraceStep;
}

const supported = [
  "variables",
  "number math",
  "lists of numbers",
  "print(...)",
  "for value in arr",
  "total += value",
  "simple factorial recursion",
];

export function WorkbenchInspector({
  diagnostics,
  onResumeSession,
  savedSessions,
  step,
}: WorkbenchInspectorProps) {
  const changedVariables = new Set(step.changed.variables ?? []);
  const stackFrames = [...step.stack].reverse();

  async function copyOutput() {
    if (!step.output) return;
    await navigator.clipboard.writeText(step.output);
  }

  return (
    <aside className="ca-inspector" aria-label="Execution inspector">
      <section className="ca-panel ca-variables">
        <header className="ca-panel__header">
          <strong>Variables</strong>
          <span>{Object.keys(step.variables).length}</span>
        </header>
        <div className="ca-table">
          <div className="ca-table__row ca-table__row--head">
            <span>Name</span>
            <span>Value</span>
          </div>
          {Object.entries(step.variables).map(([name, value]) => (
            <div className={`ca-table__row${changedVariables.has(name) ? " is-hot" : ""}`} key={name}>
              <span>{name}</span>
              <strong>{formatValue(value)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="ca-panel">
        <header className="ca-panel__header">
          <strong>Call Stack</strong>
          <span>{step.stack.length} frames</span>
        </header>
        <div className="ca-stack">
          {stackFrames.length ? (
            stackFrames.map((frame, index) => (
              <div className={`ca-stack__frame${index === 0 ? " is-current" : ""}`} key={frame.id}>
                <span>{index}</span>
                <strong>{frame.name}</strong>
                <em>line {frame.line}</em>
              </div>
            ))
          ) : (
            <div className="ca-empty-line">global scope</div>
          )}
        </div>
      </section>

      <section className="ca-panel">
        <header className="ca-panel__header">
          <strong>Output</strong>
          <button className="ca-mini-button" disabled={!step.output} onClick={copyOutput} type="button">
            <Clipboard size={14} />
            <span>Copy</span>
          </button>
        </header>
        <pre className={`ca-output${step.changed.output ? " is-hot" : ""}`}>{step.output || "No output yet"}</pre>
      </section>

      <section className="ca-panel">
        <header className="ca-panel__header">
          <strong>Supported Syntax</strong>
          <span>safe subset</span>
        </header>
        <ul className="ca-supported">
          {supported.map((item) => (
            <li key={item}>
              <Check size={14} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="ca-diagnostics">
          {diagnostics.map((diagnostic, index) => (
            <div className={`ca-diagnostic ca-diagnostic--${diagnostic.kind}`} key={`${diagnostic.message}-${index}`}>
              {diagnostic.kind === "error" ? <X size={14} /> : <Check size={14} />}
              <span>{diagnostic.message}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ca-panel ca-sessions">
        <header className="ca-panel__header">
          <strong>Sessions</strong>
          <span>{savedSessions.length} saved</span>
        </header>
        {savedSessions.length ? (
          savedSessions.slice(0, 3).map((session) => (
            <button className="ca-session" key={session.id} onClick={() => onResumeSession(session)} type="button">
              <strong>{session.traceTitle}</strong>
              <span>step {session.stepIndex + 1}</span>
            </button>
          ))
        ) : (
          <div className="ca-empty-line">Save a trace to resume it here.</div>
        )}
      </section>
    </aside>
  );
}
