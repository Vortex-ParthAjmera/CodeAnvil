import type { TraceDocument } from "../types/trace";

export type PlaybackMode = "watch" | "practice";

export interface PlaybackState {
  stepIndex: number;
  stepCount: number;
  isPlaying: boolean;
  /** Steps per second during autoplay. */
  speed: number;
  mode: PlaybackMode;
}

export type PlaybackAction =
  | { type: "INIT"; stepCount: number; mode?: PlaybackMode }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "TOGGLE_PLAY" }
  | { type: "STEP_FORWARD" }
  | { type: "STEP_BACK" }
  | { type: "RESET" }
  | { type: "SCRUB"; index: number }
  | { type: "SET_SPEED"; speed: number }
  | { type: "SET_MODE"; mode: PlaybackMode };

export const SPEEDS = [0.5, 1, 2, 4] as const;

export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case "INIT":
      return {
        stepIndex: 0,
        stepCount: action.stepCount,
        isPlaying: false,
        speed: 1,
        mode: action.mode ?? "watch",
      };
    case "PLAY":
      return {
        ...state,
        isPlaying: state.stepIndex < state.stepCount - 1,
      };
    case "PAUSE":
      return { ...state, isPlaying: false };
    case "TOGGLE_PLAY": {
      if (state.stepIndex >= state.stepCount - 1) return { ...state, isPlaying: false };
      return { ...state, isPlaying: !state.isPlaying };
    }
    case "STEP_FORWARD": {
      const next = Math.min(state.stepIndex + 1, state.stepCount - 1);
      return {
        ...state,
        stepIndex: next,
        isPlaying: next < state.stepCount - 1 ? state.isPlaying : false,
      };
    }
    case "STEP_BACK":
      return {
        ...state,
        stepIndex: Math.max(state.stepIndex - 1, 0),
        isPlaying: false,
      };
    case "RESET":
      return { ...state, stepIndex: 0, isPlaying: false };
    case "SCRUB":
      return {
        ...state,
        stepIndex: Math.min(Math.max(action.index, 0), state.stepCount - 1),
        isPlaying: false,
      };
    case "SET_SPEED":
      return { ...state, speed: action.speed };
    case "SET_MODE":
      return { ...state, mode: action.mode, isPlaying: false };
  }
}

export function currentStep(trace: TraceDocument, state: PlaybackState) {
  return trace.steps[state.stepIndex] ?? trace.steps[0];
}
