import type { KeyboardEvent } from "react";
import type { TraceStep } from "../types";

interface CodeInputPanelProps {
  code: string;
  isDirty: boolean;
  onCodeChange: (code: string) => void;
  step: TraceStep;
}

export function CodeInputPanel({ code, isDirty, onCodeChange, step }: CodeInputPanelProps) {
  const lines = code.split("\n");
  const activeLine = lines[step.line - 1]?.trim() || "program boundary";

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Tab") {
      return;
    }

    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const next = `${code.slice(0, start)}    ${code.slice(end)}`;
    onCodeChange(next);
    requestAnimationFrame(() => {
      target.selectionStart = start + 4;
      target.selectionEnd = start + 4;
    });
  }

  return (
    <section className="ca-panel ca-editor" aria-label="Editable code input">
      <header className="ca-panel__header">
        <div>
          <strong>factorial.py</strong>
          <span>{isDirty ? "Edited, not traced yet" : "Trace is synced"}</span>
        </div>
        <span>Python subset</span>
      </header>

      <div className="ca-focus-strip" aria-live="polite" key={step.id}>
        <span>Now executing line {step.line}</span>
        <code>{activeLine}</code>
        <strong>{step.description}</strong>
      </div>

      <div className="ca-codebox">
        <div className="ca-line-gutter" aria-hidden="true">
          {lines.map((_, index) => (
            <span className={index + 1 === step.line ? "is-active" : ""} key={index}>
              {index + 1}
            </span>
          ))}
        </div>
        <textarea
          aria-label="Code editor"
          className="ca-textarea"
          onChange={(event) => onCodeChange(event.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          value={code}
        />
      </div>
    </section>
  );
}
