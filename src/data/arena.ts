export const sortingPreview = [
  { name: "Bubble Sort", comparisons: 62, accent: "muted" },
  { name: "Selection Sort", comparisons: 48, accent: "teal" },
  { name: "Insertion Sort", comparisons: 55, accent: "amber" },
  { name: "Merge Sort", comparisons: 21, accent: "teal", tag: "You" },
  { name: "Quick Sort", comparisons: 19, accent: "red", tag: "Best" },
] as const;

export const gridPreview = [
  "s",
  "p",
  "p",
  "open",
  "wall",
  "open",
  "wall",
  "p",
  "open",
  "open",
  "wall",
  "open",
  "open",
  "p",
  "p",
  "p",
  "open",
  "wall",
  "wall",
  "p",
  "open",
  "open",
  "open",
  "p",
  "t",
] as const;

export const arenaMetrics = {
  bfs: {
    visited: 18,
    steps: 10,
    time: "0.28 ms",
  },
  dfs: {
    visited: 32,
    steps: 16,
    time: "0.45 ms",
  },
};
