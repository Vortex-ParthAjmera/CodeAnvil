import { useCallback, useEffect, useMemo, useState } from "react";
import { traces as curatedTraces } from "../data/traces";
import { generateTraceFromCode, type GeneratedTraceResult } from "../trace/generateTrace";
import type { SavedSession, TraceDocument } from "../types";
import { normalizeAnswer } from "../utils/formatValue";

const savedSessionsKey = "codeanvil.savedSessions.v2";

type Mode = "code" | "examples" | "dsa";
type DsaTab = "sorting" | "graph";

function loadSavedSessions(): SavedSession[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(savedSessionsKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { sessions?: SavedSession[] };
    return Array.isArray(parsed.sessions) ? parsed.sessions.slice(0, 12) : [];
  } catch {
    return [];
  }
}

function persistSavedSessions(sessions: SavedSession[]) {
  window.localStorage.setItem(savedSessionsKey, JSON.stringify({ sessions }));
}

export function useCodeAnvil() {
  const [traceCatalog, setTraceCatalog] = useState<TraceDocument[]>(curatedTraces);
  const [traceIndex, setTraceIndexState] = useState(0);
  const [code, setCode] = useState(curatedTraces[0].source.code);
  const [isDirty, setIsDirty] = useState(false);
  const [diagnostics, setDiagnostics] = useState<GeneratedTraceResult["diagnostics"]>([
    { kind: "info", message: "Ready. Type safe beginner Python and press Trace My Code." },
  ]);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [practiceMode, setPracticeMode] = useState(false);
  const [practiceAnswer, setPracticeAnswer] = useState("");
  const [practiceResult, setPracticeResult] = useState<"idle" | "correct" | "wrong">("idle");
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>(loadSavedSessions);
  const [mode, setMode] = useState<Mode>("code");
  const [dsaTab, setDsaTab] = useState<DsaTab>("sorting");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const trace = traceCatalog[traceIndex];
  const step = trace.steps[stepIndex];
  const maxStepIndex = trace.steps.length - 1;
  const progress = maxStepIndex === 0 ? 0 : stepIndex / maxStepIndex;

  const activePrompt = useMemo(
    () => trace.practice.find((prompt) => prompt.stepId === step.id),
    [step.id, trace.practice],
  );

  useEffect(() => {
    if (!isPlaying) return;

    const interval = window.setInterval(() => {
      setStepIndex((current) => {
        if (current >= maxStepIndex) {
          setIsPlaying(false);
          return current;
        }

        return current + 1;
      });
    }, Math.max(180, 820 / speed));

    return () => window.clearInterval(interval);
  }, [isPlaying, maxStepIndex, speed]);

  useEffect(() => {
    setPracticeAnswer("");
    setPracticeResult("idle");
  }, [step.id]);

  const selectTrace = useCallback(
    (nextTraceIndex: number) => {
      const nextTrace = traceCatalog[nextTraceIndex];
      if (!nextTrace) return;

      setTraceIndexState(nextTraceIndex);
      setCode(nextTrace.source.code);
      setStepIndex(0);
      setIsDirty(false);
      setIsPlaying(false);
      setDiagnostics([{ kind: "info", message: `Loaded ${nextTrace.title}.` }]);
      setMode("examples");
    },
    [traceCatalog],
  );

  const updateCode = useCallback((nextCode: string) => {
    setCode(nextCode);
    setIsDirty(true);
  }, []);

  const traceCode = useCallback(() => {
    const result = generateTraceFromCode(code);
    setDiagnostics(result.diagnostics);
    setIsPlaying(false);

    if (!result.trace) {
      return false;
    }

    setTraceCatalog((current) => {
      const withoutPreviousCustom = current.filter((item) => !item.title.startsWith("Custom "));
      return [result.trace!, ...withoutPreviousCustom];
    });
    setTraceIndexState(0);
    setStepIndex(0);
    setIsDirty(false);
    setMode("code");
    return true;
  }, [code]);

  const useCurrentExample = useCallback(() => {
    setCode(trace.source.code);
    setStepIndex(0);
    setIsDirty(false);
    setDiagnostics([{ kind: "info", message: `${trace.title} copied into the editor.` }]);
    setMode("code");
  }, [trace]);

  const stepBackward = useCallback(() => {
    setIsPlaying(false);
    setStepIndex((current) => Math.max(0, current - 1));
  }, []);

  const stepForward = useCallback(() => {
    setIsPlaying(false);
    setStepIndex((current) => Math.min(maxStepIndex, current + 1));
  }, [maxStepIndex]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setStepIndex(0);
  }, []);

  const togglePlayback = useCallback(() => {
    setIsPlaying((current) => {
      if (!current && stepIndex >= maxStepIndex) setStepIndex(0);
      return !current;
    });
  }, [maxStepIndex, stepIndex]);

  const scrubToStep = useCallback(
    (nextIndex: number) => {
      setIsPlaying(false);
      setStepIndex(Math.max(0, Math.min(maxStepIndex, nextIndex)));
    },
    [maxStepIndex],
  );

  const saveSession = useCallback(() => {
    const nextSession: SavedSession = {
      id: `${Date.now()}-${trace.title}`,
      traceTitle: trace.title,
      stepIndex,
      savedAt: new Date().toISOString(),
    };
    const nextSessions = [nextSession, ...savedSessions].slice(0, 12);
    setSavedSessions(nextSessions);
    persistSavedSessions(nextSessions);
    setDiagnostics([{ kind: "info", message: `Saved ${trace.title} at step ${stepIndex + 1}.` }]);
  }, [savedSessions, stepIndex, trace.title]);

  const resumeSession = useCallback(
    (session: SavedSession) => {
      const nextIndex = traceCatalog.findIndex((item) => item.title === session.traceTitle);
      if (nextIndex === -1) {
        setDiagnostics([{ kind: "error", message: "That saved trace is no longer in this browser session." }]);
        return;
      }

      setTraceIndexState(nextIndex);
      setCode(traceCatalog[nextIndex].source.code);
      setStepIndex(Math.min(session.stepIndex, traceCatalog[nextIndex].steps.length - 1));
      setIsDirty(false);
      setIsPlaying(false);
      setMode("examples");
    },
    [traceCatalog],
  );

  const checkPracticeAnswer = useCallback(() => {
    if (!activePrompt) return;
    const isCorrect = normalizeAnswer(practiceAnswer) === normalizeAnswer(activePrompt.answer);
    setPracticeResult(isCorrect ? "correct" : "wrong");
  }, [activePrompt, practiceAnswer]);

  const openDsa = useCallback(
    (tab: DsaTab = "sorting") => {
      setDsaTab(tab);
      setMode("dsa");
    },
    [],
  );

  return {
    activePrompt,
    checkPracticeAnswer,
    code,
    diagnostics,
    dsaTab,
    isDirty,
    isPlaying,
    maxStepIndex,
    mode,
    openDsa,
    practiceAnswer,
    practiceMode,
    practiceResult,
    progress,
    reduceMotion,
    reset,
    resumeSession,
    saveSession,
    savedSessions,
    scrubToStep,
    selectTrace,
    setDsaTab,
    setMode,
    setPracticeAnswer,
    setPracticeMode,
    setReduceMotion,
    setSettingsOpen,
    setSpeed,
    settingsOpen,
    speed,
    step,
    stepBackward,
    stepForward,
    stepIndex,
    togglePlayback,
    trace,
    traceCatalog,
    traceCode,
    traceIndex,
    updateCode,
    useCurrentExample,
  };
}
