import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Target, X } from "lucide-react";
import type { PracticePrompt } from "../types/trace";
import type { LastAnswer, PracticeStats } from "../engine/usePlayback";
import { cn } from "../lib/cn";
import { Button } from "./ui";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export function PracticeDock({
  mode,
  prompt,
  lastAnswer,
  stats,
  onAnswer,
  onContinue,
}: {
  mode: "watch" | "practice";
  prompt: PracticePrompt | undefined;
  lastAnswer: LastAnswer | null;
  stats: PracticeStats;
  onAnswer: (prompt: PracticePrompt, picked: string) => void;
  onContinue: () => void;
}) {
  const reduce = useReducedMotion();
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState("");

  const showingFeedback =
    lastAnswer !== null && prompt !== undefined && lastAnswer.promptId === prompt.id;

  useEffect(() => {
    setPicked(null);
    setTyped("");
  }, [prompt?.id]);

  // The dock only exists in practice mode.
  if (mode !== "practice") return null;

  if (!prompt) {
    if (stats.answered > 0 && !showingFeedback) {
      return (
        <div className="flex items-center justify-between border-t border-ink-700 bg-ink-900 px-4 py-2.5 text-xs text-ink-300">
          <span>
            Session accuracy:{" "}
            <span className="font-mono text-verdant-300">
              {Math.round((stats.correct / stats.answered) * 100)}%
            </span>{" "}
            ({stats.correct}/{stats.answered}) · best streak{" "}
            <span className="font-mono text-ember-300">{stats.bestStreak}</span>
          </span>
          <span className="text-ink-500">Practice mode on — predicting at marked steps.</span>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-between border-t border-ink-700 bg-ink-900 px-4 py-2.5 text-xs text-ink-500">
        <span>Practice mode on — predict values at marked steps.</span>
        {stats.answered > 0 && (
          <span>
            Accuracy{" "}
            <span className="font-mono text-verdant-300">
              {Math.round((stats.correct / stats.answered) * 100)}%
            </span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-ink-700 bg-ink-900 px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <Target size={14} className="text-arc-400" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-arc-400">
          Dry-run practice · {prompt.type.replaceAll("_", " ")}
        </span>
      </div>

      <p className="mb-3 text-sm text-ink-100">{prompt.question}</p>

      {showingFeedback && lastAnswer ? (
        <motion.div
          key={lastAnswer.promptId}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: EASE_OUT }}
          className="mb-3"
        >
          <motion.div
            initial={reduce ? false : lastAnswer.correct ? { scale: 0.94 } : undefined}
            animate={
              reduce
                ? undefined
                : lastAnswer.correct
                  ? { scale: 1 }
                  : { x: [0, -8, 8, -5, 5, 0] }
            }
            transition={
              lastAnswer.correct
                ? { type: "spring", stiffness: 480, damping: 26 }
                : { duration: 0.34, ease: "easeOut" }
            }
            className={cn(
              "mb-2 flex items-center gap-1.5 text-sm font-semibold",
              lastAnswer.correct ? "text-verdant-300" : "text-rose-300",
            )}
          >
            {lastAnswer.correct ? <Check size={15} /> : <X size={15} />}
            {lastAnswer.correct
              ? "Correct!"
              : `Not quite — the answer was ${prompt.answer}.`}
          </motion.div>
          <p className="text-xs leading-relaxed text-ink-300">
            {prompt.explanation}
          </p>
        </motion.div>
      ) : prompt.choices ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {prompt.choices.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => onAnswer(prompt, choice)}
              className={cn(
                "rounded-md border px-3 py-1.5 font-mono text-sm transition-colors",
                picked === choice
                  ? "border-ember-400 bg-ember-500/20 text-ember-300"
                  : "border-ink-600 bg-ink-800 text-ink-200 hover:border-ink-500",
              )}
            >
              {choice}
            </button>
          ))}
        </div>
      ) : (
        <form
          className="mb-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.trim()) onAnswer(prompt, typed.trim());
          }}
        >
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type your prediction…"
            className="w-48 rounded-md border border-ink-600 bg-ink-800 px-3 py-1.5 font-mono text-sm text-ink-100 placeholder:text-ink-500 focus:border-ember-400 focus:outline-none"
          />
          <Button variant="primary" onClick={() => typed.trim() && onAnswer(prompt, typed.trim())}>
            Predict
          </Button>
        </form>
      )}

      {showingFeedback && (
        <Button variant="primary" onClick={onContinue}>
          Continue
        </Button>
      )}
      {!showingFeedback && !prompt.choices && (
        <p className="text-[11px] text-ink-500">Press Enter or click Predict.</p>
      )}
    </div>
  );
}
