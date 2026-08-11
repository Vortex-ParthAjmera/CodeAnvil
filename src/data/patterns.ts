/**
 * Pattern concept pages — the "why" behind each technique, with a canned
 * 3D bar demo that loops in the Patterns view. Every demo is a precomputed
 * sequence of states (never executed).
 */

export interface DemoState {
  /** Indices with roles (compare/reading/sorted/max/key). */
  marks: { index: number; role: string }[];
  label: string;
}

export interface PatternDemo {
  values: number[];
  states: DemoState[];
}

export interface DsaPattern {
  id: string;
  name: string;
  tagline: string;
  story: string;
  cues: string[];
  complexity: string;
  /** Catalog topic labels whose problems live in this pattern. */
  topics: string[];
  demo?: PatternDemo;
}

export const PATTERNS: DsaPattern[] = [
  {
    id: "two-pointers",
    name: "Two Pointers",
    tagline: "Converging indices — meet in the middle.",
    story: "One pointer at each end walks inward, moving the side that makes the result closer to the goal. Sorted arrays are the natural habitat: you can shrink the search space by one element per step in O(n) instead of O(n²).",
    cues: ["Sorted array", "Find a pair/triplet summing to a target", "Palindrome-style symmetry", "Need O(n) with O(1) space"],
    complexity: "O(n) time · O(1) space",
    topics: ["Two Pointers"],
    demo: {
      values: [1, 3, 5, 7, 9, 11],
      states: [
        { marks: [{ index: 0, role: "compare" }, { index: 5, role: "compare" }], label: "l=0, r=5 → sum 12 > 7, move r left" },
        { marks: [{ index: 0, role: "compare" }, { index: 4, role: "compare" }], label: "l=0, r=4 → sum 10 > 7, move r left" },
        { marks: [{ index: 0, role: "compare" }, { index: 3, role: "compare" }], label: "l=0, r=3 → sum 8 > 7, move r left" },
        { marks: [{ index: 0, role: "compare" }, { index: 2, role: "compare" }], label: "l=0, r=2 → sum 6 < 7, move l right" },
        { marks: [{ index: 1, role: "compare" }, { index: 2, role: "compare" }], label: "l=1, r=2 → sum 8 > 7, move r left" },
        { marks: [{ index: 1, role: "sorted" }, { index: 1, role: "sorted" }], label: "l === r — the pointers crossed, target absent" },
      ],
    },
  },
  {
    id: "sliding-window",
    name: "Sliding Window",
    tagline: "A moving range that grows and shrinks.",
    story: "Keep a contiguous window and slide its right edge forward while shrinking the left edge when the window breaks an invariant. Every element enters and leaves once, so the total cost is O(n).",
    cues: ["Contiguous subarray / substring", "Find longest/shortest window satisfying a condition", "Fixed-size or variable-size window", "O(n) instead of O(n²) enumeration"],
    complexity: "O(n) time · O(1)..O(n) space",
    topics: ["Sliding Window"],
    demo: {
      values: [2, 1, 5, 1, 3, 2],
      states: [
        { marks: [{ index: 0, role: "reading" }, { index: 1, role: "reading" }, { index: 2, role: "reading" }], label: "window [0..2] sums to 8" },
        { marks: [{ index: 1, role: "reading" }, { index: 2, role: "reading" }, { index: 3, role: "reading" }], label: "slide right → [1..3] sums to 7" },
        { marks: [{ index: 2, role: "reading" }, { index: 3, role: "reading" }, { index: 4, role: "reading" }], label: "slide right → [2..4] sums to 9 — best so far" },
        { marks: [{ index: 3, role: "reading" }, { index: 4, role: "reading" }, { index: 5, role: "reading" }], label: "slide right → [3..5] sums to 6" },
      ],
    },
  },
  {
    id: "binary-search",
    name: "Binary Search",
    tagline: "Halve the search space every step.",
    story: "On a sorted structure, compare against the middle: if the target is smaller, the answer must be in the left half; otherwise in the right. Each probe discards half the remaining space — O(log n) total.",
    cues: ["Sorted array or monotonic predicate", "Find a value, boundary, or feasible minimum/maximum", "Answer searchable by a check function"],
    complexity: "O(log n) time · O(1) space",
    topics: ["Binary Search"],
    demo: {
      values: [2, 4, 6, 8, 10, 12, 14],
      states: [
        { marks: [{ index: 3, role: "mid" }, { index: 0, role: "range" }, { index: 6, role: "range" }], label: "low=0 high=6 → mid=3, a[3]=8 < 10" },
        { marks: [{ index: 5, role: "mid" }, { index: 4, role: "range" }, { index: 6, role: "range" }], label: "low=4 high=6 → mid=5, a[5]=12 > 10" },
        { marks: [{ index: 4, role: "mid" }, { index: 4, role: "range" }, { index: 4, role: "range" }], label: "low=4 high=4 → mid=4, a[4]=10 found!" },
      ],
    },
  },
  {
    id: "divide-conquer",
    name: "Divide & Conquer",
    tagline: "Split, solve, merge.",
    story: "Break a problem into independent halves, solve each recursively, then combine the answers. Merge sort's O(n log n) guarantee comes from this split-merge rhythm — every level does O(n) work, and there are log n levels.",
    cues: ["Merge sort / quick sort", "Range queries (segment tree)", "Problems that split cleanly in half"],
    complexity: "O(n log n) typical",
    topics: ["Sorting"],
    demo: {
      values: [8, 3, 5, 1, 9, 2],
      states: [
        { marks: [{ index: 0, role: "range" }, { index: 2, role: "range" }], label: "split left half [0..2]" },
        { marks: [{ index: 3, role: "range" }, { index: 5, role: "range" }], label: "split right half [3..5]" },
        { marks: [{ index: 0, role: "compare" }, { index: 3, role: "compare" }], label: "merge: compare 8 vs 9" },
        { marks: [{ index: 1, role: "sorted" }, { index: 2, role: "sorted" }], label: "left run settles first" },
        { marks: [{ index: 0, role: "sorted" }, { index: 5, role: "sorted" }], label: "fully merged" },
      ],
    },
  },
  {
    id: "monotonic-stack",
    name: "Monotonic Stack",
    tagline: "Keep the stack strictly ordered.",
    story: "Push values while they respect an order (increasing or decreasing); when a new value breaks the order, pop — and every popped element just got answered by the newcomer. That gives next-greater/smaller queries in amortized O(n).",
    cues: ["Next greater / smaller element", "Daily temperatures", "Histogram area", "Span of a value in a sequence"],
    complexity: "O(n) amortized · O(n) space",
    topics: ["Stack & Queue"],
    demo: {
      values: [73, 74, 75, 71, 69, 72],
      states: [
        { marks: [{ index: 0, role: "reading" }], label: "push 73 — stack [73]" },
        { marks: [{ index: 1, role: "compare" }], label: "74 > 73 — pop 73, answer = 1 day" },
        { marks: [{ index: 3, role: "reading" }], label: "push 71 — stack [75, 71]" },
        { marks: [{ index: 5, role: "compare" }], label: "72 > 71 and 72 > 69 — pop both, answer 2 days" },
      ],
    },
  },
  {
    id: "backtracking",
    name: "Backtracking",
    tagline: "Explore, then undo.",
    story: "Build a candidate step by step; when a branch can't possibly work, undo the last choice and try the next. It's DFS over a decision tree — subsets, permutations, and constraint puzzles all live here.",
    cues: ["Generate all subsets/permutations/combinations", "Constraint puzzles (N-Queens, Sudoku)", "Path search with choices"],
    complexity: "O(branch^depth) worst case",
    topics: ["Backtracking"],
    demo: {
      values: [1, 2, 3, 4],
      states: [
        { marks: [{ index: 0, role: "reading" }], label: "choose 1 → subset [1]" },
        { marks: [{ index: 1, role: "reading" }], label: "choose 2 → subset [1, 2]" },
        { marks: [{ index: 2, role: "reading" }], label: "choose 3 → subset [1, 2, 3]" },
        { marks: [{ index: 2, role: "max" }], label: "backtrack — undo 3" },
        { marks: [{ index: 3, role: "reading" }], label: "try 4 → subset [1, 2, 4]" },
      ],
    },
  },
  {
    id: "bfs-dfs",
    name: "BFS & DFS",
    tagline: "Level by level, or dive deep.",
    story: "BFS explores closest-first with a queue — shortest paths and flood fills. DFS dives down one path with a stack (or recursion) — connectivity, cycles, and topo order. Both visit each node once: O(V + E).",
    cues: ["Shortest path in an unweighted graph (BFS)", "Islands / connected components", "Cycle detection / topological sort (DFS)", "Maze reachability"],
    complexity: "O(V + E)",
    topics: ["Graphs"],
  },
  {
    id: "dynamic-programming",
    name: "Dynamic Programming",
    tagline: "Overlapping subproblems, solved once.",
    story: "When the same subproblem repeats (Fibonacci, grid paths, coin change), memoize its answer instead of recomputing. Define a state, find the transition, choose a base case — the rest is table-filling.",
    cues: ["Optimal substructure (best of subproblems)", "Overlapping subproblems", "Count ways / min cost / max profit", "Grid paths, knapsack, LIS, LCS"],
    complexity: "O(states × transitions)",
    topics: ["Dynamic Programming"],
    demo: {
      values: [1, 1, 2, 3, 5, 8],
      states: [
        { marks: [{ index: 0, role: "reading" }, { index: 1, role: "reading" }], label: "base: fib(0)=1, fib(1)=1" },
        { marks: [{ index: 2, role: "max" }], label: "fib(2) = 1 + 1 = 2" },
        { marks: [{ index: 3, role: "max" }], label: "fib(3) = 1 + 2 = 3" },
        { marks: [{ index: 4, role: "max" }], label: "fib(4) = 2 + 3 = 5" },
        { marks: [{ index: 5, role: "max" }], label: "fib(5) = 3 + 5 = 8 — no recomputation" },
      ],
    },
  },
  {
    id: "greedy",
    name: "Greedy & Intervals",
    tagline: "The locally best choice is globally best.",
    story: "Some problems have a 'matroid' structure where always taking the locally optimal step provably reaches the global optimum — jump games, activity selection, coin systems. When it works, it's the fastest solution of all.",
    cues: ["Local choice is provably safe", "Interval scheduling / merging", "Jump games, gas station", "Minimum spanning trees (Kruskal/Prim)"],
    complexity: "O(n log n) typical",
    topics: ["Greedy & Intervals"],
  },
  {
    id: "hashing",
    name: "Hashing",
    tagline: "O(1) lookups change everything.",
    story: "Hash maps trade memory for speed: membership, counting, and deduplication drop from O(n) scans to O(1) per key. Two Sum, anagrams, and top-k frequency are all hash-first problems.",
    cues: ["Membership / duplicates", "Counting frequencies", "Map values to their indices", "Anagram signatures"],
    complexity: "O(n) average · O(n) space",
    topics: ["Arrays & Hashing"],
  },
  {
    id: "heap",
    name: "Heap & Priority",
    tagline: "Always know the extreme.",
    story: "A heap keeps the min or max ready at the root in O(log n) per operation. Top-k, median-from-a-stream, and scheduling problems all lean on this 'I need the extreme repeatedly' primitive.",
    cues: ["k-th largest/smallest", "Top-k frequent", "Merge k sorted lists", "Median from a stream"],
    complexity: "O(log n) per op · O(n) space",
    topics: ["Heap & Priority Queue"],
  },
  {
    id: "tries",
    name: "Tries & Prefixes",
    tagline: "Store words as shared paths.",
    story: "A trie shares prefixes between words, so prefix queries cost O(k) instead of scanning every word. Autocomplete, spell check, and word-search-on-a-board all use this shape.",
    cues: ["Prefix queries / autocomplete", "Many words sharing prefixes", "Dictionary with wildcard search"],
    complexity: "O(k) per op · O(total characters)",
    topics: ["Strings & Tries"],
  },
];

export const PATTERN_BY_ID = new Map(PATTERNS.map((p) => [p.id, p]));
