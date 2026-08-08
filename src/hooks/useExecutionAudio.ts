import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TraceAction, TraceStep } from "../types";
import { dispatchTraceStep } from "../visualization/dispatchTraceAction";

interface UseExecutionAudioArgs {
  enabled: boolean;
  muted: boolean;
  narrationEnabled: boolean;
  step: TraceStep;
}

type AudioContextConstructor = new () => AudioContext;

function getAudioContextConstructor() {
  if (typeof window === "undefined") return null;
  const audioWindow = window as Window & typeof globalThis & { webkitAudioContext?: AudioContextConstructor };
  return audioWindow.AudioContext || audioWindow.webkitAudioContext || null;
}

function primaryAction(step: TraceStep): TraceAction {
  return step.actions.find((action) => action.type !== "focus_line") ?? step.actions[0] ?? { type: "focus_line", line: step.line };
}

function scheduleTone(
  context: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  gain = 0.03,
  type: OscillatorType = "sine",
  endFrequency?: number,
) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(24, endFrequency), start + duration);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.014);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function playCue(context: AudioContext, action: TraceAction) {
  const now = context.currentTime + 0.015;

  switch (action.type) {
    case "compare":
      scheduleTone(context, 480, now, 0.08, 0.022, "triangle");
      scheduleTone(context, action.result ? 660 : 360, now + 0.1, 0.11, 0.026, "sine");
      break;
    case "swap":
      scheduleTone(context, 240, now, 0.3, 0.032, "sawtooth", 620);
      scheduleTone(context, 680, now + 0.045, 0.24, 0.022, "triangle", 350);
      break;
    case "call":
      scheduleTone(context, 330, now, 0.09, 0.024, "sine");
      scheduleTone(context, 440, now + 0.08, 0.09, 0.024, "sine");
      scheduleTone(context, 554, now + 0.16, 0.14, 0.026, "sine");
      break;
    case "return":
      scheduleTone(context, 660, now, 0.09, 0.024, "triangle");
      scheduleTone(context, 494, now + 0.08, 0.1, 0.024, "triangle");
      scheduleTone(context, 392, now + 0.17, 0.18, 0.027, "sine");
      break;
    case "output":
      scheduleTone(context, 523, now, 0.1, 0.022, "sine");
      scheduleTone(context, 659, now + 0.08, 0.11, 0.023, "sine");
      scheduleTone(context, 784, now + 0.17, 0.2, 0.025, "sine");
      break;
    case "read":
      scheduleTone(context, 520, now, 0.1, 0.02, "triangle");
      break;
    case "loop":
      scheduleTone(context, 300, now, 0.08, 0.018, "square");
      scheduleTone(context, 390, now + 0.08, 0.08, 0.018, "square");
      break;
    case "visit_node":
      scheduleTone(context, 410, now, 0.12, 0.024, "sine");
      scheduleTone(context, 615, now + 0.09, 0.12, 0.02, "sine");
      break;
    case "assign":
      scheduleTone(context, 310, now, 0.12, 0.022, "triangle");
      scheduleTone(context, 430, now + 0.06, 0.12, 0.018, "sine");
      break;
    case "focus_line":
      scheduleTone(context, 260, now, 0.07, 0.014, "sine");
      break;
  }
}

function canSpeak() {
  return typeof window !== "undefined"
    && "speechSynthesis" in window
    && "SpeechSynthesisUtterance" in window;
}

export function useExecutionAudio({ enabled, muted, narrationEnabled, step }: UseExecutionAudioArgs) {
  const contextRef = useRef<AudioContext | null>(null);
  const lastSoundStepIdRef = useRef<string | null>(null);
  const lastSpokenStepIdRef = useRef<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const audioSupported = useMemo(() => Boolean(getAudioContextConstructor()), []);
  const speechSupported = useMemo(canSpeak, []);
  const narrationText = useMemo(() => {
    const model = dispatchTraceStep(step);
    return ["Line " + String(step.line), model.headline, model.detail]
      .join(". ")
      .replace(/\s+/g, " ");
  }, [step]);

  const activateAudio = useCallback(async () => {
    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) {
      setAudioReady(false);
      return false;
    }

    const context = contextRef.current ?? new AudioContextConstructor();
    contextRef.current = context;
    if (context.state === "suspended") await context.resume();
    const isReady = context.state === "running";
    setAudioReady(isReady);
    return isReady;
  }, []);

  const speakCurrentStep = useCallback(() => {
    if (!speechSupported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(narrationText);
    utterance.rate = 0.92;
    utterance.pitch = 0.9;
    utterance.volume = 0.86;
    window.speechSynthesis.speak(utterance);
  }, [narrationText, speechSupported]);

  useEffect(() => {
    if (!enabled || muted || !audioReady || lastSoundStepIdRef.current === step.id) return;
    const context = contextRef.current;
    if (!context || context.state !== "running") return;
    lastSoundStepIdRef.current = step.id;
    playCue(context, primaryAction(step));
  }, [audioReady, enabled, muted, step]);

  useEffect(() => {
    if (!narrationEnabled || muted || !speechSupported || lastSpokenStepIdRef.current === step.id) return;
    lastSpokenStepIdRef.current = step.id;
    speakCurrentStep();
  }, [muted, narrationEnabled, speakCurrentStep, speechSupported, step.id]);

  useEffect(() => () => {
    if (speechSupported) window.speechSynthesis.cancel();
    const context = contextRef.current;
    if (context) void context.close();
  }, [speechSupported]);

  return {
    activateAudio,
    audioReady,
    audioSupported,
    speakCurrentStep,
    speechSupported,
  };
}
