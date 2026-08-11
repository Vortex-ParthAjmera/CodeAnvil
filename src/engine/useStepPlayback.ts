import { useCallback, useEffect, useRef, useState } from "react";
import { bumpHeat } from "./session";
import { sound } from "./sound";

/**
 * Lightweight playback for computed step lists (Arena simulators). Unlike the
 * lab's reducer this has no practice mode — it just walks a step array.
 */
export function useStepPlayback(total: number) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Live audio + forge heat: every step (manual or autoplay) is a hammer-tap.
  const prevIndex = useRef(0);
  useEffect(() => {
    if (prevIndex.current === index) return;
    prevIndex.current = index;
    sound.step();
    bumpHeat(1);
  }, [index]);

  const clamp = useCallback(
    (i: number) => Math.min(Math.max(i, 0), Math.max(total - 1, 0)),
    [total],
  );

  useEffect(() => {
    setIndex((i) => clamp(i));
    if (index >= total - 1) setPlaying(false);
  }, [total, index, clamp]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(
      () =>
        setIndex((i) => {
          const next = i + 1;
          if (next >= total - 1) setPlaying(false);
          return Math.min(next, total - 1);
        }),
      1000 / speed,
    );
    return () => window.clearInterval(id);
  }, [playing, speed, total]);

  const play = useCallback(() => {
    if (index >= total - 1) setIndex(0);
    setPlaying(true);
  }, [index, total]);

  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => {
    if (index >= total - 1) {
      setIndex(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  }, [index, total]);

  const stepForward = useCallback(
    () => setIndex((i) => clamp(i + 1)),
    [clamp],
  );
  const stepBack = useCallback(() => setIndex((i) => clamp(i - 1)), [clamp]);
  const reset = useCallback(() => {
    setIndex(0);
    setPlaying(false);
  }, []);
  const replay = useCallback(() => {
    setIndex(0);
    setPlaying(true);
  }, []);
  const scrub = useCallback((i: number) => {
    setIndex(i);
    setPlaying(false);
  }, []);

  return {
    index,
    playing,
    speed,
    setSpeed,
    play,
    pause,
    toggle,
    stepForward,
    stepBack,
    reset,
    replay,
    scrub,
  };
}
