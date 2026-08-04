import { Check, X } from "lucide-react";
import type { PracticePrompt } from "../types";

interface PracticePanelProps {
  answer: string;
  onAnswerChange: (answer: string) => void;
  onCheck: () => void;
  prompt?: PracticePrompt;
  result: "idle" | "correct" | "wrong";
  visible: boolean;
}

export function PracticePanel({
  answer,
  onAnswerChange,
  onCheck,
  prompt,
  result,
  visible,
}: PracticePanelProps) {
  if (!visible) {
    return null;
  }

  return (
    <section className="practice-dock" aria-label="Dry-run practice">
      {prompt ? (
        <>
          <div>
            <span>Predict next value</span>
            <strong>{prompt.question}</strong>
          </div>
          <input
            aria-label="Practice answer"
            onChange={(event) => onAnswerChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onCheck();
              }
            }}
            placeholder="Type answer"
            value={answer}
          />
          <button className="practice-button" onClick={onCheck} type="button">
            Check
          </button>
          {result !== "idle" ? (
            <div className={`practice-result practice-result--${result}`}>
              {result === "correct" ? <Check size={16} /> : <X size={16} />}
              <span>{result === "correct" ? "Correct" : prompt.explanation}</span>
            </div>
          ) : null}
        </>
      ) : (
        <div>
          <span>Practice Mode</span>
          <strong>No prompt on this step</strong>
        </div>
      )}
    </section>
  );
}
