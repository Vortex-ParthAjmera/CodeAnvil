/**
 * Local progress store — per-problem status, streaks, and a spaced-review
 * queue. Everything lives in this browser (localStorage); the snapshot is
 * cached per revision so useSyncExternalStore stays stable.
 */

export type ProblemStatus = "none" | "attempted" | "solved" | "mastered";

export interface ReviewEntry {
  problemId: string;
  /** Day number (floor of epoch / 86400000) when the review falls due. */
  dueDay: number;
  /** Review interval in days; doubles on each successful review. */
  interval: number;
}

interface ProgressState {
  statuses: Record<string, ProblemStatus>;
  reviews: Record<string, ReviewEntry>;
  streak: { lastDay: number; count: number };
}

const KEY = "codeanvil.progress.v1";
const DAY_MS = 86_400_000;
const today = () => Math.floor(Date.now() / DAY_MS);

const EMPTY: ProgressState = { statuses: {}, reviews: {}, streak: { lastDay: 0, count: 0 } };

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      statuses: parsed.statuses ?? {},
      reviews: parsed.reviews ?? {},
      streak: parsed.streak ?? { lastDay: 0, count: 0 },
    };
  } catch {
    return EMPTY;
  }
}

let cache: ProgressState = load();
let revision = 0;
let snapshot: ProgressState | null = null;

function commit(next: ProgressState): void {
  cache = next;
  revision++;
  snapshot = null;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event("codeanvil:progress"));
}

function nextInterval(status: ProblemStatus, current: number): number {
  if (status === "attempted") return 1;
  if (status === "solved") return 3;
  if (status === "mastered") return 7;
  return Math.min(current * 2 || 1, 30);
}

/** Sets a problem's status and reschedules (or clears) its review entry. */
export function setStatus(problemId: string, status: ProblemStatus): ProgressState {
  const day = today();
  const streak = { ...cache.streak };
  if (streak.lastDay === day - 1) {
    streak.count += 1;
  } else if (streak.lastDay !== day) {
    streak.count = 1;
  }
  streak.lastDay = day;

  const next: ProgressState = {
    statuses: { ...cache.statuses, [problemId]: status },
    reviews: { ...cache.reviews },
    streak,
  };

  if (status === "none" || status === "mastered") {
    delete next.reviews[problemId];
  } else {
    const prev = cache.reviews[problemId];
    const interval = nextInterval(status, prev?.interval ?? 0);
    next.reviews[problemId] = { problemId, dueDay: day + interval, interval };
  }
  commit(next);
  return next;
}

/** Marks a review as done today and pushes the next due date further out. */
export function markReviewed(problemId: string): ProgressState {
  const entry = cache.reviews[problemId];
  const day = today();
  const interval = entry ? Math.min(entry.interval * 2, 30) : 3;
  const next: ProgressState = {
    ...cache,
    statuses: {
      ...cache.statuses,
      [problemId]: cache.statuses[problemId] ?? "solved",
    },
    reviews: {
      ...cache.reviews,
      [problemId]: { problemId, dueDay: day + interval, interval },
    },
  };
  commit(next);
  return next;
}

export function getStatus(problemId: string): ProblemStatus {
  return cache.statuses[problemId] ?? "none";
}

/** Problems whose review is due today or earlier. */
export function reviewQueue(nowDay = today()): ReviewEntry[] {
  return Object.values(cache.reviews)
    .filter((entry) => entry.dueDay <= nowDay)
    .sort((a, b) => a.dueDay - b.dueDay);
}

export function progressStats(): {
  attempted: number;
  solved: number;
  mastered: number;
  due: number;
  streak: number;
} {
  const statuses = Object.values(cache.statuses);
  return {
    attempted: statuses.filter((s) => s !== "none").length,
    solved: statuses.filter((s) => s === "solved").length,
    mastered: statuses.filter((s) => s === "mastered").length,
    due: reviewQueue().length,
    streak: cache.streak.count,
  };
}

/** Stable snapshot for React's useSyncExternalStore (referentially stable until a commit). */
export function subscribe(callback: () => void): () => void {
  window.addEventListener("codeanvil:progress", callback);
  return () => window.removeEventListener("codeanvil:progress", callback);
}

export function getSnapshot(): ProgressState {
  if (!snapshot) snapshot = JSON.parse(JSON.stringify(cache)) as ProgressState;
  return snapshot;
}
