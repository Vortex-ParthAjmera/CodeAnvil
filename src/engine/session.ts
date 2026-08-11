/**
 * Live "forge heat" — a session-scoped gauge that rises as you work
 * (stepping traces, answering prompts, running arenas) and slowly cools
 * when idle. Powers the live gauge + status line in the sidebar.
 */
import { useSyncExternalStore } from "react";

let heat = 0;
let decayTimer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

/** Add heat from activity (clamped to 100). */
export function bumpHeat(amount: number) {
  heat = Math.min(100, heat + amount);
  if (heat >= 100) heat = 100;
  if (!decayTimer) {
    decayTimer = setInterval(() => {
      heat = Math.max(0, heat - 1);
      emit();
      if (heat <= 0 && decayTimer) {
        clearInterval(decayTimer);
        decayTimer = null;
      }
    }, 8000);
  }
  emit();
}

export function getHeat() {
  return heat;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** React hook — re-renders whenever the heat value changes. */
export function useHeat(): number {
  return useSyncExternalStore(subscribe, getHeat, getHeat);
}

export function heatLabel(h: number): string {
  if (h >= 70) return "roaring";
  if (h >= 35) return "hot";
  if (h > 0) return "warming";
  return "idle";
}
