/**
 * Synthesized sound engine — Web Audio API only, no audio files.
 *
 * Browsers require a user gesture before audio plays, so `unlock()` is
 * called on the first pointer/key event anywhere in the app (see App.tsx).
 * Every play function is a no-op when muted or when the context can't run.
 */

const STORE_KEY = "codeanvil.sound-muted";

let ctx: AudioContext | null = null;
let muted: boolean = (() => {
  try {
    return localStorage.getItem(STORE_KEY) === "1";
  } catch {
    return false;
  }
})();

const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

function makeCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  try {
    return new AC();
  } catch {
    return null;
  }
}

export function unlockAudio() {
  if (typeof window === "undefined") return;
  if (!ctx) ctx = makeCtx();
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  glide?: number;
}

function tone(freq: number, dur: number, opts: ToneOpts = {}) {
  if (muted || !ctx) return;
  if (ctx.state !== "running") return;
  const { type = "sine", gain = 0.1, delay = 0, glide } = opts;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sound = {
  get muted() {
    return muted;
  },
  toggle() {
    muted = !muted;
    persist();
  },
  /** React-friendly subscription (useSyncExternalStore). */
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  unlock: unlockAudio,

  /** Tiny hammer-tap on every code step. */
  step() {
    tone(240, 0.05, { type: "triangle", gain: 0.045 });
  },
  /** Opening a screen / module. */
  open() {
    tone(420, 0.09, { type: "triangle", gain: 0.05, glide: 640 });
  },
  /** A call resolved / value returned. */
  resolve() {
    tone(523.25, 0.14, { type: "sine", gain: 0.08 });
    tone(659.25, 0.2, { type: "sine", gain: 0.08, delay: 0.07 });
  },
  /** Correct answer — rising arpeggio. */
  correct() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(f, 0.16, { type: "triangle", gain: 0.09, delay: i * 0.07 }),
    );
  },
  /** Wrong answer — soft low buzz. */
  wrong() {
    tone(150, 0.22, { type: "square", gain: 0.04, glide: 105 });
  },
  /** Session / duel complete — small fanfare. */
  complete() {
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) =>
      tone(f, 0.26, { type: "triangle", gain: 0.1, delay: i * 0.09 }),
    );
  },
};
