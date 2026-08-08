import { useRef, useState, type KeyboardEvent, type UIEvent } from "react";
import { Play, RefreshCw } from "lucide-react";
import type { CodeLanguageId, CodeLanguageOption } from "../data/languageVariants";
import type { TraceStep } from "../types";

interface CodeInputPanelProps {
  activeLineNumber: number;
  canTrace: boolean;
  code: string;
  extension: string;
  isStale: boolean;
  language: CodeLanguageId;
  languageLabel: string;
  languageOptions: CodeLanguageOption[];
  onCodeChange: (code: string) => void;
  onLanguageChange: (language: CodeLanguageId) => void;
  onTrace: () => void;
  step: TraceStep;
  title: string;
}

const editorLineHeight = 24;

export function CodeInputPanel({
  activeLineNumber,
  canTrace,
  code,
  extension,
  isStale,
  language,
  languageLabel,
  languageOptions,
  onCodeChange,
  onLanguageChange,
  onTrace,
  step,
  title,
}: CodeInputPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const lines = code.split("\n");
  const activeLine = lines[activeLineNumber - 1]?.trim() || "program boundary";
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
          <strong>{filename}.{extension}</strong>
          <em>{isStale ? "edited" : "synced"}</em>
        </div>
        <div className="ca-editor-tools">
          <label className="ca-language-select">
            <span>Language</span>
            <select
              aria-label="Code language"
              onChange={(event) => onLanguageChange(event.target.value as CodeLanguageId)}
              value={language}
            >
              {languageOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
          <button
            className="ca-command ca-command--accent"
            disabled={!code.trim() || !canTrace}
            onClick={onTrace}
            title={canTrace ? "Trace editable Python code" : "Reference code view; custom tracing currently accepts Python"}
            type="button"
          >
            {isStale ? <RefreshCw size={15} /> : <Play size={15} />}
            <span>{canTrace ? "Trace code" : "Reference view"}</span>
          </button>
        </div>
      </header>

      <div className={"ca-execution-note" + (isStale ? " is-stale" : "")} aria-live="polite">
        <span>{isStale ? "Trace paused" : "Line " + String(activeLineNumber)}</span>
        <code>{isStale ? "Run the edited source to rebuild the trace." : activeLine}</code>
        <strong>{isStale ? "The stage still shows the last valid execution." : step.description}</strong>
      </div>

      <div className="ca-codebox">
        {!isStale ? (
          <span
            className="ca-active-code-line"
            style={{ top: 14 + (activeLineNumber - 1) * editorLineHeight - scrollTop }}
          />
        ) : null}
        <div className="ca-line-gutter" aria-hidden="true">
          <div style={{ transform: "translateY(" + String(-scrollTop) + "px)" }}>
            {lines.map((_, index) => (
              <span className={!isStale && index + 1 === activeLineNumber ? "is-active" : ""} key={index}>
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
        <span>{languageLabel}</span>
        <span>{lines.length} lines</span>
        <span>{code.length} characters</span>
        <span>{canTrace ? "editable trace" : "reference code"}</span>
      </footer>
    </section>
  );
}
