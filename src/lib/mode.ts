/**
 * Light / dark mode (docs/18 — UI/UX).
 *
 * The whole design is driven by CSS variables from @theme (ink-* surfaces,
 * ember/arc/verdant accents), so switching modes is one attribute on <html>:
 * `data-mode="light"` flips the palette in index.css. Preference persists in
 * localStorage; first-time visitors follow their OS setting.
 */

export type Mode = "dark" | "light";

const MODE_KEY = "codeanvil.mode.v1";
const listeners = new Set<() => void>();

function systemPreference(): Mode {
  try {
    if (window.matchMedia?.("(prefers-color-scheme: light)").matches) return "light";
  } catch {
    // matchMedia unavailable (SSR or exotic embed) — stay dark.
  }
  return "dark";
}

function readStored(): Mode | null {
  try {
    const raw = localStorage.getItem(MODE_KEY);
    return raw === "light" || raw === "dark" ? raw : null;
  } catch {
    return null;
  }
}

let cached: Mode = readStored() ?? systemPreference();

function apply(mode: Mode): void {
  document.documentElement.dataset.mode = mode;
  // Native controls, scrollbars, and color-scheme pickers follow the mode.
  document.documentElement.style.colorScheme = mode;
}

/** Runs before the first render so there is no light/dark flash. */
export function initMode(): void {
  apply(cached);
}

export function getMode(): Mode {
  return cached;
}

export function setMode(mode: Mode): Mode {
  cached = mode;
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Private mode / full storage — the change still applies for this visit.
  }
  apply(mode);
  listeners.forEach((l) => l());
  return mode;
}

export function toggleMode(): Mode {
  return setMode(cached === "dark" ? "light" : "dark");
}

export function subscribeMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
