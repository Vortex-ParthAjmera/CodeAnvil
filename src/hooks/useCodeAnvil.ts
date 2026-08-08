import { useCallback, useEffect, useMemo, useState } from "react";
import { traces as curatedTraces } from "../data/traces";
import { generateTraceFromCode, type GeneratedTraceResult } from "../trace/generateTrace";
import { isValidTraceDocument } from "../trace/validateTrace";
import type { SavedSession, TraceDocument } from "../types";
import { normalizeAnswer } from "../utils/formatValue";

const savedSessionsKey = "codeanvil.savedSessions.v3";
const legacySavedSessionsKey = "codeanvil.savedSessions.v2";
const preferencesKey = "codeanvil.preferences.v1";

type Mode = "code" | "examples" | "dsa";
type DsaTab = "sorting" | "graph";

function isSavedSession(value: unknown): value is SavedSession {
  if (typeof value !== "object" || value === null) return false;
  const session = value as Partial<SavedSession>;
  return session.schemaVersion === "1.0.0"
    && typeof session.id === "string"
    && typeof session.traceTitle === "string"
    && typeof session.stepIndex === "number"
    && typeof session.savedAt === "string"
    && isValidTraceDocument(session.trace);
}

function readSessionEnvelope(key: string): unknown[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as { sessions?: unknown[] };
  return Array.isArray(parsed.sessions) ? parsed.sessions : [];
}

function persistSavedSessions(sessions: SavedSession[]): boolean {
  try {
    window.localStorage.setItem(savedSessionsKey, JSON.stringify({ sessions }));
    return true;
  } catch {
    return false;
  }
}

function loadSavedSessions(): SavedSession[] {
  if (typeof window === "undefined") return [];

  try {
    const current = readSessionEnvelope(savedSessionsKey).filter(isSavedSession);
    if (current.length) return current.slice(0, 12);

    const migrated = readSessionEnvelope(legacySavedSessionsKey).flatMap((value) => {
      if (typeof value !== "object" || value === null) return [];
      const legacy = value as {
        id?: unknown;
        savedAt?: unknown;
        stepIndex?: unknown;
        traceTitle?: unknown;
      };
      const trace = curatedTraces.find((item) => item.title === legacy.traceTitle);
      if (!trace || typeof legacy.stepIndex !== "number") return [];

      return [{
        id: typeof legacy.id === "string" ? legacy.id : String(Date.now()) + "-" + trace.title,
        schemaVersion: "1.0.0" as const,
        traceTitle: trace.title,
        stepIndex: Math.max(0, Math.min(legacy.stepIndex, trace.steps.length - 1)),
        savedAt: typeof legacy.savedAt === "string" ? legacy.savedAt : new Date().toISOString(),
        trace,
      }];
    });

    if (migrated.length) persistSavedSessions(migrated);
    return migrated.slice(0, 12);
  } catch {
    return [];
  }
}

function loadReduceMotionPreference() {
  if (typeof window === "undefined") return false;

  try {
    const stored = JSON.parse(window.localStorage.getItem(preferencesKey) || "null") as {
      reduceMotion?: unknown;
    } | null;
    if (typeof stored?.reduceMotion === "boolean") return stored.reduceMotion;
  } catch {
    // Fall through to the operating-system preference.
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useCodeAnvil() {
  const [traceCatalog, setTraceCatalog] = useState<TraceDocument[]>(curatedTraces);
  const [traceIndex, setTraceIndexState] = useState(0);
  const [code, setCode] = useState(curatedTraces[0].source.code);
  const [isDirty, setIsDirty] = useState(false);
  const [diagnostics, setDiagnostics] = useState<GeneratedTraceResult["diagnostics"]>([
    { kind: "info", message: "Ready. Edit the Python source, then trace it." },
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
  const [reduceMotion, setReduceMotion] = useState(loadReduceMotionPreference);

  const trace = traceCatalog[traceIndex];
  const maxStepIndex = Math.max(0, trace.steps.length - 1);
  const safeStepIndex = Math.min(stepIndex, maxStepIndex);
  const step = trace.steps[safeStepIndex];
  const progress = maxStepIndex === 0 ? 0 : safeStepIndex / maxStepIndex;
  const isStale = isDirty;

  const activePrompt = useMemo(
    () => trace.practice.find((prompt) => prompt.stepId === step.id),
    [step.id, trace.practice],
  );

  useEffect(() => {
    if (!isPlaying || isStale) return;

    const timer = window.setTimeout(() => {
      setStepIndex((current) => {
        if (current >= maxStepIndex) {
          setIsPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, Math.max(240, 900 / speed));

    return () => window.clearTimeout(timer);
  }, [isPlaying, isStale, maxStepIndex, safeStepIndex, speed]);

  useEffect(() => {
    setPracticeAnswer("");
    setPracticeResult("idle");
  }, [step.id]);

  useEffect(() => {
    try {
      window.localStorage.setItem(preferencesKey, JSON.stringify({ reduceMotion }));
    } catch {
      // Keep the preference for this tab if storage is unavailable.
    }
  }, [reduceMotion]);

  const selectTrace = useCallback((traceTitle: string) => {
    const nextTraceIndex = traceCatalog.findIndex((item) => item.title === traceTitle);
    const nextTrace = traceCatalog[nextTraceIndex];
    if (!nextTrace) return;

    setTraceIndexState(nextTraceIndex);
    setCode(nextTrace.source.code);
    setStepIndex(0);
    setIsDirty(false);
    setIsPlaying(false);
    setDiagnostics([{ kind: "info", message: "Loaded " + nextTrace.title + "." }]);
    setMode("examples");
  }, [traceCatalog]);

  const updateCode = useCallback((nextCode: string) => {
    setCode(nextCode);
    setIsDirty(true);
    setIsPlaying(false);
  }, []);

  const traceCode = useCallback(() => {
    const result = generateTraceFromCode(code);
    setDiagnostics(result.diagnostics);
    setIsPlaying(false);

    if (!result.trace) return false;

    setTraceCatalog((current) => {
      const curatedAndResumed = current.filter((item) => !item.title.startsWith("Custom "));
      return [result.trace!, ...curatedAndResumed];
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
    setIsPlaying(false);
    setDiagnostics([{ kind: "info", message: trace.title + " is synced with the editor." }]);
    setMode("code");
  }, [trace]);

  const stepBackward = useCallback(() => {
    if (isStale) return;
    setIsPlaying(false);
    setStepIndex((current) => Math.max(0, current - 1));
  }, [isStale]);

  const stepForward = useCallback(() => {
    if (isStale) return;
    setIsPlaying(false);
    setStepIndex((current) => Math.min(maxStepIndex, current + 1));
  }, [isStale, maxStepIndex]);

  const reset = useCallback(() => {
    if (isStale) return;
    setIsPlaying(false);
    setStepIndex(0);
  }, [isStale]);

  const togglePlayback = useCallback(() => {
    if (isStale) return;
    setIsPlaying((current) => {
      if (!current && safeStepIndex >= maxStepIndex) setStepIndex(0);
      return !current;
    });
  }, [isStale, maxStepIndex, safeStepIndex]);

  const scrubToStep = useCallback((nextIndex: number) => {
    if (isStale) return;
    setIsPlaying(false);
    setStepIndex(Math.max(0, Math.min(maxStepIndex, nextIndex)));
  }, [isStale, maxStepIndex]);

  const saveSession = useCallback(() => {
    if (isStale) {
      setDiagnostics([{ kind: "error", message: "Trace the edited code before saving this session." }]);
      return;
    }

    const nextSession: SavedSession = {
      id: String(Date.now()) + "-" + trace.title,
      schemaVersion: "1.0.0",
      traceTitle: trace.title,
      stepIndex: safeStepIndex,
      savedAt: new Date().toISOString(),
      trace,
    };
    const nextSessions = [nextSession, ...savedSessions].slice(0, 12);
    if (!persistSavedSessions(nextSessions)) {
      setDiagnostics([{ kind: "error", message: "The browser could not store this session." }]);
      return;
    }
    setSavedSessions(nextSessions);
    setDiagnostics([{
      kind: "info",
      message: "Saved " + trace.title + " at step " + String(safeStepIndex + 1) + ".",
    }]);
  }, [isStale, safeStepIndex, savedSessions, trace]);

  const resumeSession = useCallback((session: SavedSession) => {
    const nextIndex = traceCatalog.findIndex(
      (item) => item.title === session.trace.title
        && item.source.code === session.trace.source.code,
    );

    if (nextIndex >= 0) {
      setTraceIndexState(nextIndex);
    } else {
      setTraceCatalog((current) => [session.trace, ...current]);
      setTraceIndexState(0);
    }

    setCode(session.trace.source.code);
    setStepIndex(Math.min(session.stepIndex, session.trace.steps.length - 1));
    setIsDirty(false);
    setIsPlaying(false);
    setDiagnostics([{ kind: "info", message: "Resumed " + session.traceTitle + "." }]);
    setMode("code");
  }, [traceCatalog]);

  const deleteSession = useCallback((sessionId: string) => {
    setSavedSessions((current) => {
      const next = current.filter((session) => session.id !== sessionId);
      persistSavedSessions(next);
      return next;
    });
  }, []);

  const checkPracticeAnswer = useCallback(() => {
    if (!activePrompt) return;
    const correct = normalizeAnswer(practiceAnswer) === normalizeAnswer(activePrompt.answer);
    setPracticeResult(correct ? "correct" : "wrong");
  }, [activePrompt, practiceAnswer]);

  const openDsa = useCallback((tab: DsaTab = "sorting") => {
    setDsaTab(tab);
    setMode("dsa");
    setIsPlaying(false);
  }, []);

  return {
    activePrompt,
    checkPracticeAnswer,
    code,
    deleteSession,
    diagnostics,
    dsaTab,
    isDirty,
    isPlaying,
    isStale,
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
    stepIndex: safeStepIndex,
    togglePlayback,
    trace,
    traceCatalog,
    traceCode,
    traceIndex,
    updateCode,
    useCurrentExample,
  };
}
