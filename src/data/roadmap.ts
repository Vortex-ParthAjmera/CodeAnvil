/**
 * The CodeAnvil Roadmap — a dependency-ordered study path through the DSA
 * topics in the Atlas (inspired by NeetCode's roadmap, tuned for the
 * visual-first CodeAnvil experience). Also defines the curated "Core 50"
 * starter tier and a linear next-problem chain.
 *
 * Problem ids match the catalog's slug scheme: slug(topic)-slug(title).
 */

export interface RoadmapTopic {
  id: string;
  name: string;
  /** Short "why this matters" line shown on the node. */
  tagline: string;
  /** Topic ids that should be learned first. */
  prerequisites: string[];
  /** Order within the roadmap (0 = first). */
  order: number;
  /** The catalog topic label this maps to (for problem lookup). */
  catalogTopic: string;
}

/** Problem references are stored as [catalogTopic, title] pairs — the same
 *  inputs the catalog's `group()` helper uses, so ids stay in sync. */
export type ProblemRef = [topic: string, title: string];

export const ROADMAP_TOPICS: RoadmapTopic[] = [
  { id: "arrays", name: "Arrays & Hashing", tagline: "The foundation — indexing, scans, and hash maps.", prerequisites: [], order: 0, catalogTopic: "Arrays & Hashing" },
  { id: "two-pointers", name: "Two Pointers", tagline: "Converging indices solve sorted-pair and palindrome problems.", prerequisites: ["arrays"], order: 1, catalogTopic: "Two Pointers" },
  { id: "sliding-window", name: "Sliding Window", tagline: "A moving range tracks subarrays and substrings.", prerequisites: ["arrays", "two-pointers"], order: 2, catalogTopic: "Sliding Window" },
  { id: "stack-queue", name: "Stack & Queue", tagline: "LIFO/FIFO discipline for parsing and BFS scaffolding.", prerequisites: ["arrays"], order: 3, catalogTopic: "Stack & Queue" },
  { id: "linked-lists", name: "Linked Lists", tagline: "Pointer rewiring — reversal, cycles, and merges.", prerequisites: ["arrays"], order: 4, catalogTopic: "Linked Lists" },
  { id: "binary-search", name: "Binary Search", tagline: "Halving a sorted range to find values and boundaries.", prerequisites: ["arrays", "two-pointers"], order: 5, catalogTopic: "Binary Search" },
  { id: "sorting", name: "Sorting", tagline: "Ordering — quadratic to log-linear, stable to in-place.", prerequisites: ["arrays", "two-pointers"], order: 6, catalogTopic: "Sorting" },
  { id: "recursion", name: "Recursion & Trees", tagline: "Self-similar structure — traversals and divide & conquer.", prerequisites: ["stack-queue", "sorting"], order: 7, catalogTopic: "Trees & BST" },
  { id: "heap", name: "Heap & Priority Queue", tagline: "Always grab the extreme — k-th and top-k problems.", prerequisites: ["sorting", "recursion"], order: 8, catalogTopic: "Heap & Priority Queue" },
  { id: "backtracking", name: "Backtracking", tagline: "Systematic explore-undo over decision trees.", prerequisites: ["recursion"], order: 9, catalogTopic: "Backtracking" },
  { id: "graphs", name: "Graphs", tagline: "BFS and DFS over adjacency — islands, courses, mazes.", prerequisites: ["stack-queue", "recursion"], order: 10, catalogTopic: "Graphs" },
  { id: "dynamic-programming", name: "Dynamic Programming", tagline: "Memoized state transitions — the payoff of patterns.", prerequisites: ["recursion", "graphs"], order: 11, catalogTopic: "Dynamic Programming" },
  { id: "greedy", name: "Greedy & Intervals", tagline: "Local choices that provably meet the global optimum.", prerequisites: ["sorting", "dynamic-programming"], order: 12, catalogTopic: "Greedy & Intervals" },
  { id: "advanced", name: "Advanced Structures", tagline: "Tries, union-find, ranges, and hard classics.", prerequisites: ["graphs", "dynamic-programming"], order: 13, catalogTopic: "Hard Classics" },
];

/** The curated starter tier — 50 problems that cover every roadmap topic once. */
export const CORE_50: ProblemRef[] = [
  ["Arrays & Hashing", "Two Sum"],
  ["Arrays & Hashing", "Contains Duplicate"],
  ["Arrays & Hashing", "Valid Anagram"],
  ["Arrays & Hashing", "Group Anagrams"],
  ["Arrays & Hashing", "Top K Frequent Elements"],
  ["Arrays & Hashing", "Product of Array Except Self"],
  ["Arrays & Hashing", "Maximum Subarray"],
  ["Two Pointers", "Valid Palindrome"],
  ["Two Pointers", "Two Sum II"],
  ["Two Pointers", "3Sum"],
  ["Two Pointers", "Container With Most Water"],
  ["Sliding Window", "Best Time to Buy and Sell Stock"],
  ["Sliding Window", "Longest Substring Without Repeating"],
  ["Sliding Window", "Longest Repeating Character Replacement"],
  ["Sliding Window", "Minimum Window Substring"],
  ["Stack & Queue", "Valid Parentheses"],
  ["Stack & Queue", "Min Stack"],
  ["Stack & Queue", "Evaluate Reverse Polish Notation"],
  ["Stack & Queue", "Daily Temperatures"],
  ["Linked Lists", "Reverse Linked List"],
  ["Linked Lists", "Merge Two Sorted Lists"],
  ["Linked Lists", "Linked List Cycle"],
  ["Linked Lists", "Reorder List"],
  ["Binary Search", "Classic Binary Search"],
  ["Binary Search", "Search a 2D Matrix"],
  ["Binary Search", "Find Minimum in Rotated Sorted Array"],
  ["Binary Search", "Search in Rotated Sorted Array"],
  ["Sorting", "Merge Sort"],
  ["Sorting", "Quick Sort"],
  ["Trees & BST", "Invert Binary Tree"],
  ["Trees & BST", "Maximum Depth of Binary Tree"],
  ["Trees & BST", "Binary Tree Level Order Traversal"],
  ["Trees & BST", "Validate Binary Search Tree"],
  ["Trees & BST", "Kth Smallest in BST"],
  ["Heap & Priority Queue", "K Closest Points to Origin"],
  ["Heap & Priority Queue", "Kth Largest Element in an Array"],
  ["Backtracking", "Subsets"],
  ["Backtracking", "Combination Sum"],
  ["Backtracking", "Permutations"],
  ["Backtracking", "Word Search"],
  ["Graphs", "Number of Islands"],
  ["Graphs", "Clone Graph"],
  ["Graphs", "Course Schedule"],
  ["Graphs", "Rotting Oranges"],
  ["Dynamic Programming", "Climbing Stairs"],
  ["Dynamic Programming", "House Robber"],
  ["Dynamic Programming", "Coin Change"],
  ["Dynamic Programming", "Longest Increasing Subsequence"],
  ["Greedy & Intervals", "Merge Intervals"],
  ["Greedy & Intervals", "Jump Game"],
];

/** Linear order of every roadmap problem (topic order, then catalog order). */
export const ROADMAP_ORDER: ProblemRef[] = CORE_50; // Core 50 doubles as the spine; extended by the catalog per topic.

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const problemId = (ref: ProblemRef): string =>
  `${slug(ref[0])}-${slug(ref[1])}`;

/** Ordered ids for the full chain (all CORE_50 entries in order). */
export const ROADMAP_CHAIN: string[] = ROADMAP_ORDER.map(problemId);

export const CORE_50_SET: Set<string> = new Set(ROADMAP_CHAIN);

/** Returns the next problem id after `id` in the chain (or null at the end). */
export function nextProblemId(id: string): string | null {
  const i = ROADMAP_CHAIN.indexOf(id);
  if (i === -1 || i >= ROADMAP_CHAIN.length - 1) return null;
  return ROADMAP_CHAIN[i + 1];
}

export function prevProblemId(id: string): string | null {
  const i = ROADMAP_CHAIN.indexOf(id);
  if (i <= 0) return null;
  return ROADMAP_CHAIN[i - 1];
}

/** Topics that come right after `topicId` in the dependency graph. */
export function dependentsOf(topicId: string): RoadmapTopic[] {
  return ROADMAP_TOPICS.filter((t) => t.prerequisites.includes(topicId));
}
