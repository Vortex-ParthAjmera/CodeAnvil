import { describe, expect, it } from "vitest";
import { playbackReducer, type PlaybackState } from "./playback";

function init(stepCount = 10): PlaybackState {
  return playbackReducer(
    { stepIndex: 0, stepCount, isPlaying: false, speed: 1, mode: "watch" },
    { type: "INIT", stepCount },
  );
}

describe("playbackReducer", () => {
  it("initializes at step 0, paused", () => {
    const s = init(5);
    expect(s).toMatchObject({ stepIndex: 0, stepCount: 5, isPlaying: false, speed: 1 });
  });

  it("steps forward and clamps at the last step", () => {
    let s = init(3);
    s = playbackReducer(s, { type: "STEP_FORWARD" });
    expect(s.stepIndex).toBe(1);
    s = playbackReducer(s, { type: "STEP_FORWARD" });
    expect(s.stepIndex).toBe(2);
    s = playbackReducer(s, { type: "STEP_FORWARD" });
    expect(s.stepIndex).toBe(2);
  });

  it("stops playing when reaching the end", () => {
    let s = { ...init(2), isPlaying: true, stepIndex: 0 };
    s = playbackReducer(s, { type: "STEP_FORWARD" });
    expect(s.stepIndex).toBe(1);
    expect(s.isPlaying).toBe(false);
  });

  it("steps back and never goes below zero", () => {
    let s = { ...init(3), stepIndex: 1 };
    s = playbackReducer(s, { type: "STEP_BACK" });
    expect(s.stepIndex).toBe(0);
    s = playbackReducer(s, { type: "STEP_BACK" });
    expect(s.stepIndex).toBe(0);
  });

  it("pauses when stepping back", () => {
    const s = playbackReducer({ ...init(3), stepIndex: 2, isPlaying: true }, { type: "STEP_BACK" });
    expect(s.isPlaying).toBe(false);
  });

  it("toggles play and refuses to play at the end", () => {
    let s = playbackReducer(init(2), { type: "TOGGLE_PLAY" });
    expect(s.isPlaying).toBe(true);
    s = { ...s, stepIndex: 1 };
    s = playbackReducer(s, { type: "TOGGLE_PLAY" });
    expect(s.isPlaying).toBe(false);
  });

  it("scrubs to any valid index and clamps out-of-range values", () => {
    let s = playbackReducer(init(4), { type: "SCRUB", index: 3 });
    expect(s.stepIndex).toBe(3);
    s = playbackReducer(s, { type: "SCRUB", index: 99 });
    expect(s.stepIndex).toBe(3);
    s = playbackReducer(s, { type: "SCRUB", index: -5 });
    expect(s.stepIndex).toBe(0);
  });

  it("resets to the start and pauses", () => {
    const s = playbackReducer({ ...init(4), stepIndex: 3, isPlaying: true }, { type: "RESET" });
    expect(s).toMatchObject({ stepIndex: 0, isPlaying: false });
  });

  it("changes speed and mode", () => {
    let s = playbackReducer(init(4), { type: "SET_SPEED", speed: 4 });
    expect(s.speed).toBe(4);
    s = playbackReducer(s, { type: "SET_MODE", mode: "practice" });
    expect(s.mode).toBe("practice");
    expect(s.isPlaying).toBe(false);
  });
});
