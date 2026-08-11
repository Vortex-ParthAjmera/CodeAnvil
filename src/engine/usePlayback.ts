import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { PracticePrompt, TraceDocument } from "../types/trace";
import { currentStep, playbackReducer } from "./playback";

export interface PracticeStats {
  answered: number;
  correct: number;
  streak: number;
  bestStreak: number;
}

export interface LastAnswer {
  promptId: string;
  correct: boolean;
  picked: string;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function usePlayback(trace: TraceDocument) {
  const [state, dispatch] = useReducer(
    playbackReducer,
    undefined,
    (): ReturnType<typeof playbackReducer> => ({
      stepIndex: 0,
      stepCount: trace.steps.length,
      isPlaying: false,
      speed: 1,
      mode: "watch",
    }),
  );

  const [answeredPrompts, setAnsweredPrompts] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<PracticeStats>({
    answered: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
  });
  const [lastAnswer, setLastAnswer] = useState<LastAnswer | null>(null);

  // Re-initialize only when the trace instance actually changes (new example).
  // The identity guard matters: StrictMode re-runs effects on mount, and a
  // blind re-init would clobber resume positions and answered prompts.
  const traceRef = useRef(trace);
  useEffect(() => {
    if (traceRef.current === trace) return;
    traceRef.current = trace;
    dispatch({ type: "INIT", stepCount: trace.steps.length });
    setAnsweredPrompts(new Set());
    setStats({ answered: 0, correct: 0, streak: 0, bestStreak: 0 });
    setLastAnswer(null);
  }, [trace]);

  const step = currentStep(trace, state);

  const stepIndexById = useMemo(
    () => new Map(trace.steps.map((s, i) => [s.id, i])),
    [trace],
  );

  // A prompt is asked at the step BEFORE the reveal step, so the answer is
  // never visible yet. Autoplay pauses here (see effect below).
  const activePrompt = useMemo(() => {
    if (state.mode !== "practice") return undefined;
    return trace.practice.find((p) => {
      const revealIndex = stepIndexById.get(p.stepId);
      return revealIndex === state.stepIndex + 1 && !answeredPrompts.has(p.id);
    });
  }, [state.mode, state.stepIndex, stepIndexById, answeredPrompts, trace.practice]);

  // Autoplay loop.
  useEffect(() => {
    if (!state.isPlaying) return;
    const id = window.setInterval(
      () => dispatch({ type: "STEP_FORWARD" }),
      1000 / state.speed,
    );
    return () => window.clearInterval(id);
  }, [state.isPlaying, state.speed]);

  // Pause autoplay when a practice prompt is due.
  useEffect(() => {
    if (state.mode === "practice" && activePrompt && state.isPlaying) {
      dispatch({ type: "PAUSE" });
    }
  }, [state.mode, activePrompt, state.isPlaying]);

  function answerPrompt(prompt: PracticePrompt, picked: string) {
    const correct = normalize(picked) === normalize(prompt.answer);
    setLastAnswer({ promptId: prompt.id, correct, picked });
    setStats((s) => {
      const streak = correct ? s.streak + 1 : 0;
      return {
        answered: s.answered + 1,
        correct: s.correct + (correct ? 1 : 0),
        streak,
        bestStreak: Math.max(s.bestStreak, streak),
      };
    });
  }

  function continueAfterAnswer() {
    if (lastAnswer) {
      setAnsweredPrompts((prev) => new Set(prev).add(lastAnswer.promptId));
      setLastAnswer(null);
    }
    dispatch({ type: "STEP_FORWARD" });
  }

  return {
    state,
    step,
    activePrompt,
    stats,
    lastAnswer,
    answerPrompt,
    continueAfterAnswer,
    play: () => dispatch({ type: "PLAY" }),
    pause: () => dispatch({ type: "PAUSE" }),
    togglePlay: () => dispatch({ type: "TOGGLE_PLAY" }),
    stepForward: () => dispatch({ type: "STEP_FORWARD" }),
    stepBack: () => dispatch({ type: "STEP_BACK" }),
    reset: () => dispatch({ type: "RESET" }),
    scrub: (index: number) => dispatch({ type: "SCRUB", index }),
    setSpeed: (speed: number) => dispatch({ type: "SET_SPEED", speed }),
    setMode: (mode: "watch" | "practice") => dispatch({ type: "SET_MODE", mode }),
  };
}
