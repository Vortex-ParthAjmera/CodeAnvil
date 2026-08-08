import { useRef, useState, type KeyboardEvent, type UIEvent } from "react";
import { Play, RefreshCw } from "lucide-react";
import type { TraceStep } from "../types";

interface CodeInputPanelProps {
  code: string;
  isStale: boolean;
  onCodeChange: (code: string) => void;
  onTrace: () => void;
  step: TraceStep;
  title: string;
}

const editorLineHeight = 24;

export function CodeInputPanel({
  code,
  isStale,
  onCodeChange,
  onTrace,
  step,
  title,
}: CodeInputPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const lines = code.split("\n");
  const activeLine = lines[step.line - 1]?.trim() || "program boundary";
  const filename = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "trace";

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      onTrace();
      return;
    }

    if (event.key !== "Tab") return;

    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const next = code.slice(0, start) + "    " + code.slice(end);
    onCodeChange(next);

    requestAnimationFrame(() => {
      target.selectionStart = start + 4;
      target.selectionEnd = start + 4;
    });
  }

  function handleScroll(event: UIEvent<HTMLTextAreaElement>) {
    setScrollTop(event.currentTarget.scrollTop);
  }

  return (
    <section className={"ca-editor" + (isStale ? " is-stale" : "")} aria-label="Editable code input">
      <header className="ca-sectionbar">
        <div className="ca-file">
          <span aria-hidden="true" />
          <strong>{filename}.py</strong>
          <em>{isStale ? "edited" : "synced"}</em>
        </div>
        <button
          className="ca-command ca-command--accent"
          disabled={!code.trim()}
          onClick={onTrace}
          type="button"
        >
          {isStale ? <RefreshCw size={15} /> : <Play size={15} />}
          <span>Trace code</span>
        </button>
      </header>

      <div className={"ca-execution-note" + (isStale ? " is-stale" : "")} aria-live="polite">
        <span>{isStale ? "Trace paused" : "Line " + String(step.line)}</span>
        <code>{isStale ? "Run the edited source to rebuild the trace." : activeLine}</code>
        <strong>{isStale ? "The stage still shows the last valid execution." : step.description}</strong>
      </div>

      <div className="ca-codebox">
        {!isStale ? (
          <span
            className="ca-active-code-line"
            style={{ top: 14 + (step.line - 1) * editorLineHeight - scrollTop }}
          />
        ) : null}
        <div className="ca-line-gutter" aria-hidden="true">
          <div style={{ transform: "translateY(" + String(-scrollTop) + "px)" }}>
            {lines.map((_, index) => (
              <span className={!isStale && index + 1 === step.line ? "is-active" : ""} key={index}>
                {index + 1}
              </span>
            ))}
          </div>
        </div>
        <textarea
          aria-label="Code editor"
          className="ca-textarea"
          data-testid="code-editor"
          onChange={(event) => onCodeChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          ref={textareaRef}
          spellCheck={false}
          value={code}
        />
      </div>

      <footer className="ca-editor__status">
        <span>Python</span>
        <span>{lines.length} lines</span>
        <span>{code.length} characters</span>
      </footer>
    </section>
  );
}
