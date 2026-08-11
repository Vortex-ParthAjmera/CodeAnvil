/**
 * Browser-storage adapter (docs/04 — MVP uses localStorage first).
 * All reads are defensive: local storage is user-controlled and must never be trusted.
 */
import type { Example } from "../types/trace";

export interface SavedSession {
  id: string;
  exampleId: string;
  title: string;
  stepIndex: number;
  savedAt: string; // ISO timestamp
}

export interface ProgressRecord {
  exampleId: string;
  lastOpenedAt: string;
  /** Best practice accuracy percentage this session (0-100). */
  bestAccuracy: number;
  /** Total practice prompts answered (feeds story missions + dashboard). */
  answered: number;
}

export type ThemeId = "ember" | "arc" | "verdant";

export interface StoryState {
  completedMissions: string[];
  theme: ThemeId;
}

const SESSIONS_KEY = "codeanvil.sessions.v1";
const PROGRESS_KEY = "codeanvil.progress.v1";
const STORY_KEY = "codeanvil.story.v1";
const ARENA_KEY = "codeanvil.arena.v1";

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or unavailable (private mode); fail silently.
  }
}

export function loadSessions(): SavedSession[] {
  const list = readJSON<SavedSession[]>(SESSIONS_KEY, []);
  return Array.isArray(list) ? list : [];
}

/**
 * Saves (or updates) a session for an example. One session per example keeps
 * the demo simple; the schema supports multiple sessions later.
 */
export function saveSession(example: Example, stepIndex: number): SavedSession[] {
  const sessions = loadSessions();
  const existing = sessions.find((s) => s.exampleId === example.id);
  const now = new Date().toISOString();
  let next: SavedSession[];
  if (existing) {
    next = sessions.map((s) =>
      s.exampleId === example.id ? { ...s, stepIndex, savedAt: now } : s,
    );
  } else {
    next = [
      ...sessions,
      {
        id: `sess-${Date.now().toString(36)}`,
        exampleId: example.id,
        title: example.title,
        stepIndex,
        savedAt: now,
      },
    ];
  }
  writeJSON(SESSIONS_KEY, next);
  return next;
}

export function deleteSession(id: string): SavedSession[] {
  const next = loadSessions().filter((s) => s.id !== id);
  writeJSON(SESSIONS_KEY, next);
  return next;
}

export function loadProgress(): ProgressRecord[] {
  const list = readJSON<ProgressRecord[]>(PROGRESS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function recordProgress(
  exampleId: string,
  bestAccuracy: number,
  answered: number,
): ProgressRecord[] {
  const progress = loadProgress();
  const existing = progress.find((p) => p.exampleId === exampleId);
  const now = new Date().toISOString();
  let next: ProgressRecord[];
  if (existing) {
    next = progress.map((p) =>
      p.exampleId === exampleId
        ? {
            ...p,
            lastOpenedAt: now,
            bestAccuracy: Math.max(p.bestAccuracy, bestAccuracy),
            answered: Math.max(p.answered, answered),
          }
        : p,
    );
  } else {
    next = [
      ...progress,
      { exampleId, lastOpenedAt: now, bestAccuracy, answered },
    ];
  }
  writeJSON(PROGRESS_KEY, next);
  return next;
}

/** Records that an example was opened (without practice) — feeds "watch" missions. */
export function recordOpen(exampleId: string): ProgressRecord[] {
  const progress = loadProgress();
  const existing = progress.find((p) => p.exampleId === exampleId);
  const now = new Date().toISOString();
  let next: ProgressRecord[];
  if (existing) {
    next = progress.map((p) =>
      p.exampleId === exampleId ? { ...p, lastOpenedAt: now } : p,
    );
  } else {
    next = [
      ...progress,
      { exampleId, lastOpenedAt: now, bestAccuracy: 0, answered: 0 },
    ];
  }
  writeJSON(PROGRESS_KEY, next);
  return next;
}

/* ------------------------------------------------------------------ */
/* Story mode (docs/02 — P2)                                           */
/* ------------------------------------------------------------------ */

export function loadStory(): StoryState {
  const s = readJSON<Partial<StoryState>>(STORY_KEY, {});
  return {
    completedMissions: Array.isArray(s.completedMissions) ? s.completedMissions : [],
    theme: s.theme === "arc" || s.theme === "verdant" ? s.theme : "ember",
  };
}

export function saveStory(story: StoryState): StoryState {
  writeJSON(STORY_KEY, story);
  return story;
}

export function completeMission(id: string): StoryState {
  const story = loadStory();
  if (story.completedMissions.includes(id)) return story;
  const next = {
    ...story,
    completedMissions: [...story.completedMissions, id],
  };
  return saveStory(next);
}

export function setTheme(theme: ThemeId): StoryState {
  const next = { ...loadStory(), theme };
  return saveStory(next);
}

/* ------------------------------------------------------------------ */
/* Arena visits (docs/02 — P1 DSA Arena)                               */
/* ------------------------------------------------------------------ */

export function loadArenaModes(): string[] {
  const list = readJSON<string[]>(ARENA_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function recordArenaMode(mode: string): string[] {
  const modes = loadArenaModes();
  if (modes.includes(mode)) return modes;
  const next = [...modes, mode];
  writeJSON(ARENA_KEY, next);
  return next;
}
