import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TraceAction, TraceStep } from "../types";
import { dispatchTraceStep } from "../visualization/dispatchTraceAction";

interface UseExecutionAudioArgs {
  enabled: boolean;
  muted: boolean;
  narrationEnabled: boolean;
  step: TraceStep;
}

export type DsaAudioCue =
  | "control"
  | "sort_step"
  | "sort_compare"
  | "sort_swap"
  | "graph_step"
  | "graph_frontier"
  | "graph_visit"
  | "complete";

type AudioContextConstructor = new () => AudioContext;

function getAudioContextConstructor() {
  if (typeof window === "undefined") return null;
  const audioWindow = window as Window & typeof globalThis & { webkitAudioContext?: AudioContextConstructor };
  return audioWindow.AudioContext || audioWindow.webkitAudioContext || null;
}

function primaryAction(step: TraceStep): TraceAction {
  return step.actions.find((action) => action.type !== "focus_line") ?? step.actions[0] ?? { type: "focus_line", line: step.line };
}

function audibleActions(step: TraceStep): TraceAction[] {
  const actions = step.actions.length ? step.actions : [primaryAction(step)];
  const meaningful = actions.filter((action, index) => action.type !== "focus_line" || index === actions.length - 1);
  return (meaningful.length ? meaningful : actions).slice(0, 4);
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
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function playActionCue(context: AudioContext, action: TraceAction, offset = 0, intensity = 1) {
  const now = context.currentTime + 0.015 + offset;
  const gain = (value: number) => value * intensity;

  switch (action.type) {
    case "compare":
      scheduleTone(context, 480, now, 0.08, gain(0.02), "triangle");
      scheduleTone(context, action.result ? 680 : 340, now + 0.09, 0.13, gain(0.025), "sine");
      break;
    case "swap":
      scheduleTone(context, 220, now, 0.28, gain(0.032), "sawtooth", 640);
      scheduleTone(context, 720, now + 0.04, 0.22, gain(0.021), "triangle", 330);
      scheduleTone(context, 520, now + 0.24, 0.08, gain(0.018), "square");
      break;
    case "call":
      scheduleTone(context, 300, now, 0.08, gain(0.022), "sine");
      scheduleTone(context, 420, now + 0.075, 0.08, gain(0.023), "sine");
      scheduleTone(context, 560, now + 0.15, 0.13, gain(0.025), "sine");
      break;
    case "return":
      scheduleTone(context, 720, now, 0.08, gain(0.024), "triangle");
      scheduleTone(context, 560, now + 0.075, 0.1, gain(0.023), "triangle");
      scheduleTone(context, 390, now + 0.16, 0.18, gain(0.026), "sine");
      break;
    case "output":
      scheduleTone(context, 523, now, 0.1, gain(0.022), "sine");
      scheduleTone(context, 659, now + 0.08, 0.11, gain(0.023), "sine");
      scheduleTone(context, 784, now + 0.17, 0.2, gain(0.025), "sine");
      break;
    case "read":
      scheduleTone(context, 520, now, 0.09, gain(0.02), "triangle");
      scheduleTone(context, 610, now + 0.07, 0.08, gain(0.015), "sine");
      break;
    case "loop":
      scheduleTone(context, 300, now, 0.07, gain(0.017), "square");
      scheduleTone(context, 390, now + 0.075, 0.08, gain(0.017), "square");
      break;
    case "visit_node":
      scheduleTone(context, 410, now, 0.11, gain(0.023), "sine");
      scheduleTone(context, 615, now + 0.09, 0.12, gain(0.02), "sine");
      break;
    case "assign":
      scheduleTone(context, 310, now, 0.11, gain(0.021), "triangle");
      scheduleTone(context, 430, now + 0.06, 0.11, gain(0.017), "sine");
      break;
    case "focus_line":
      scheduleTone(context, 260, now, 0.06, gain(0.012), "sine");
      break;
  }
}

function playStepCues(context: AudioContext, step: TraceStep) {
  audibleActions(step).forEach((action, index) => {
    playActionCue(context, action, index * 0.075, Math.max(0.68, 1 - index * 0.1));
  });
}

function playDsaNamedCue(context: AudioContext, cue: DsaAudioCue) {
  const now = context.currentTime + 0.014;
  switch (cue) {
    case "control":
      scheduleTone(context, 360, now, 0.055, 0.012, "triangle");
      scheduleTone(context, 480, now + 0.045, 0.06, 0.012, "sine");
      break;
    case "sort_compare":
      scheduleTone(context, 460, now, 0.075, 0.019, "triangle");
      scheduleTone(context, 620, now + 0.08, 0.09, 0.02, "sine");
      break;
    case "sort_swap":
      scheduleTone(context, 240, now, 0.22, 0.028, "sawtooth", 640);
      scheduleTone(context, 700, now + 0.045, 0.18, 0.018, "triangle", 360);
      break;
    case "sort_step":
      scheduleTone(context, 330, now, 0.08, 0.016, "sine");
      break;
    case "graph_visit":
      scheduleTone(context, 420, now, 0.1, 0.021, "sine");
      scheduleTone(context, 630, now + 0.075, 0.12, 0.018, "triangle");
      break;
    case "graph_frontier":
      scheduleTone(context, 360, now, 0.08, 0.017, "triangle");
      scheduleTone(context, 450, now + 0.07, 0.08, 0.017, "triangle");
      break;
    case "graph_step":
      scheduleTone(context, 300, now, 0.08, 0.015, "sine");
      break;
    case "complete":
      scheduleTone(context, 523, now, 0.09, 0.02, "sine");
      scheduleTone(context, 659, now + 0.075, 0.1, 0.021, "sine");
      scheduleTone(context, 784, now + 0.155, 0.16, 0.023, "sine");
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

  const playDsaCue = useCallback((cue: DsaAudioCue) => {
    if (!enabled || muted) return;
    void activateAudio().then((isReady) => {
      const context = contextRef.current;
      if (!isReady || !context || context.state !== "running") return;
      playDsaNamedCue(context, cue);
    });
  }, [activateAudio, enabled, muted]);

  useEffect(() => {
    if (!enabled || muted || audioReady || !audioSupported) return;
    const wakeAudio = () => {
      void activateAudio();
    };
    window.addEventListener("pointerdown", wakeAudio, { once: true, passive: true });
    window.addEventListener("keydown", wakeAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", wakeAudio);
      window.removeEventListener("keydown", wakeAudio);
    };
  }, [activateAudio, audioReady, audioSupported, enabled, muted]);

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
    playStepCues(context, step);
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
    playDsaCue,
    speakCurrentStep,
    speechSupported,
  };
}
