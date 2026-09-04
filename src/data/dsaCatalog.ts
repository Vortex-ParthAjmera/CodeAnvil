import type { Difficulty } from "../types/trace";
import { MAJORITY_VOTE_CODE } from "./traces/majority-vote";
import { FIXED_WINDOW_CODE } from "./traces/sliding-window-fixed";

export interface DataStructureGuide {
  id: string;
  name: string;
  family: "Linear" | "Hashing" | "Trees" | "Graphs" | "Advanced";
  summary: string;
  operations: string[];
  access: string;
  search: string;
  insert: string;
  remove: string;
  visual: "array" | "chain" | "stack" | "queue" | "tree" | "graph" | "buckets";
}

export interface DsaProblem {
  id: string;
  title: string;
  topic: string;
  pattern: string;
  difficulty: Difficulty;
  complexity: string;
  summary: string;
  exampleId?: string;
}

export const DATA_STRUCTURES: DataStructureGuide[] = [
  { id: "array", name: "Array", family: "Linear", summary: "Contiguous indexed storage with constant-time random access.", operations: ["traverse", "insert", "delete", "slice"], access: "O(1)", search: "O(n)", insert: "O(n)", remove: "O(n)", visual: "array" },
  { id: "dynamic-array", name: "Dynamic Array", family: "Linear", summary: "Resizable contiguous storage that grows its backing capacity.", operations: ["append", "pop", "resize", "index"], access: "O(1)", search: "O(n)", insert: "O(1)*", remove: "O(n)", visual: "array" },
  { id: "matrix", name: "Matrix / Grid", family: "Linear", summary: "Two-dimensional indexed storage for spatial and tabular problems.", operations: ["scan", "neighbors", "rotate", "flood fill"], access: "O(1)", search: "O(rc)", insert: "—", remove: "—", visual: "array" },
  { id: "singly-linked-list", name: "Singly Linked List", family: "Linear", summary: "Nodes connected forward by pointers, optimized for local edits.", operations: ["prepend", "append", "reverse", "splice"], access: "O(n)", search: "O(n)", insert: "O(1)", remove: "O(1)", visual: "chain" },
  { id: "doubly-linked-list", name: "Doubly Linked List", family: "Linear", summary: "Bidirectional node chain with efficient removal at a known node.", operations: ["insert", "remove", "forward", "backward"], access: "O(n)", search: "O(n)", insert: "O(1)", remove: "O(1)", visual: "chain" },
  { id: "stack", name: "Stack", family: "Linear", summary: "Last-in, first-out storage used by parsing, undo, and call frames.", operations: ["push", "pop", "peek", "is empty"], access: "O(n)", search: "O(n)", insert: "O(1)", remove: "O(1)", visual: "stack" },
  { id: "queue", name: "Queue", family: "Linear", summary: "First-in, first-out storage for scheduling and breadth-first search.", operations: ["enqueue", "dequeue", "front", "rear"], access: "O(n)", search: "O(n)", insert: "O(1)", remove: "O(1)", visual: "queue" },
  { id: "deque", name: "Deque", family: "Linear", summary: "Double-ended queue with constant-time edits at either end.", operations: ["push front", "push back", "pop front", "pop back"], access: "O(n)", search: "O(n)", insert: "O(1)", remove: "O(1)", visual: "queue" },
  { id: "hash-table", name: "Hash Table", family: "Hashing", summary: "Key-value storage using a hash function and collision strategy.", operations: ["set", "get", "delete", "rehash"], access: "O(1)*", search: "O(1)*", insert: "O(1)*", remove: "O(1)*", visual: "buckets" },
  { id: "hash-set", name: "Hash Set", family: "Hashing", summary: "Unique-value membership structure backed by hashing.", operations: ["add", "contains", "remove", "union"], access: "—", search: "O(1)*", insert: "O(1)*", remove: "O(1)*", visual: "buckets" },
  { id: "binary-tree", name: "Binary Tree", family: "Trees", summary: "Hierarchical nodes with at most two children per node.", operations: ["preorder", "inorder", "postorder", "level order"], access: "O(n)", search: "O(n)", insert: "O(n)", remove: "O(n)", visual: "tree" },
  { id: "bst", name: "Binary Search Tree", family: "Trees", summary: "Ordered binary tree supporting logarithmic work when balanced.", operations: ["search", "insert", "delete", "successor"], access: "O(log n)*", search: "O(log n)*", insert: "O(log n)*", remove: "O(log n)*", visual: "tree" },
  { id: "heap", name: "Binary Heap", family: "Trees", summary: "Complete tree that keeps the minimum or maximum at its root.", operations: ["push", "extract", "heapify", "peek"], access: "O(n)", search: "O(n)", insert: "O(log n)", remove: "O(log n)", visual: "tree" },
  { id: "trie", name: "Trie", family: "Trees", summary: "Prefix tree for strings, dictionaries, and autocomplete.", operations: ["insert", "search", "prefix", "delete"], access: "O(k)", search: "O(k)", insert: "O(k)", remove: "O(k)", visual: "tree" },
  { id: "graph", name: "Graph", family: "Graphs", summary: "Vertices and edges modeling networks, dependencies, and routes.", operations: ["BFS", "DFS", "add edge", "neighbors"], access: "—", search: "O(V+E)", insert: "O(1)", remove: "O(V+E)", visual: "graph" },
  { id: "disjoint-set", name: "Disjoint Set Union", family: "Graphs", summary: "Maintains connected components with path compression and union by rank.", operations: ["find", "union", "connected", "components"], access: "—", search: "O(α(n))", insert: "O(1)", remove: "—", visual: "graph" },
  { id: "fenwick-tree", name: "Fenwick Tree", family: "Advanced", summary: "Compact tree for prefix sums and point updates.", operations: ["prefix sum", "range sum", "point update"], access: "O(log n)", search: "O(log n)", insert: "O(log n)", remove: "O(log n)", visual: "tree" },
  { id: "segment-tree", name: "Segment Tree", family: "Advanced", summary: "Range-query tree supporting configurable aggregation and updates.", operations: ["build", "range query", "point update", "lazy update"], access: "O(log n)", search: "O(log n)", insert: "O(log n)", remove: "O(log n)", visual: "tree" },
  { id: "b-tree", name: "B-Tree / B+ Tree", family: "Advanced", summary: "Wide balanced search tree designed for disks and databases.", operations: ["search", "split", "merge", "range scan"], access: "O(log n)", search: "O(log n)", insert: "O(log n)", remove: "O(log n)", visual: "tree" },
  { id: "skip-list", name: "Skip List", family: "Advanced", summary: "Layered linked list with probabilistic logarithmic search.", operations: ["search", "insert", "delete", "promote"], access: "O(log n)*", search: "O(log n)*", insert: "O(log n)*", remove: "O(log n)*", visual: "chain" },
  { id: "circular-queue", name: "Circular Queue", family: "Linear", summary: "Fixed-capacity FIFO that reuses slots by wrapping indices.", operations: ["enqueue", "dequeue", "front", "is full"], access: "O(n)", search: "O(n)", insert: "O(1)", remove: "O(1)", visual: "queue" },
  { id: "ring-buffer", name: "Ring Buffer", family: "Linear", summary: "Circular storage for streams, audio, and event logs.", operations: ["push", "pop", "overwrite", "drain"], access: "O(1)", search: "O(n)", insert: "O(1)", remove: "O(1)", visual: "queue" },
  { id: "adjacency-list", name: "Adjacency List", family: "Graphs", summary: "Graph stored as per-vertex neighbor lists — the standard form.", operations: ["add edge", "iterate", "degree", "reverse"], access: "O(deg)", search: "O(V+E)", insert: "O(1)", remove: "O(deg)", visual: "graph" },
  { id: "adjacency-matrix", name: "Adjacency Matrix", family: "Graphs", summary: "Dense V×V edge table with constant-time edge queries.", operations: ["edge?", "add edge", "transpose", "degree"], access: "O(1)", search: "O(V²)", insert: "O(1)", remove: "O(1)", visual: "array" },
  { id: "edge-list", name: "Edge List", family: "Graphs", summary: "Flat list of edges used by Kruskal and sorting-based algorithms.", operations: ["sort", "iterate", "weighted?", "append"], access: "O(E)", search: "O(E)", insert: "O(1)", remove: "O(E)", visual: "chain" },
  { id: "bloom-filter", name: "Bloom Filter", family: "Hashing", summary: "Probabilistic membership set — fast, space-light, false-positive only.", operations: ["add", "contains", "estimate", "clear"], access: "—", search: "O(k)", insert: "O(k)", remove: "—", visual: "buckets" },
  { id: "ordered-set", name: "Ordered Set / Map", family: "Hashing", summary: "Sorted key structure (tree or skiplist) with order statistics.", operations: ["insert", "rank", "kth", "range"], access: "O(log n)", search: "O(log n)", insert: "O(log n)", remove: "O(log n)", visual: "tree" },
  { id: "multiset", name: "Multiset / Counter", family: "Hashing", summary: "Membership with multiplicities — counts, modes, and frequency queries.", operations: ["add", "remove", "count", "mode"], access: "O(1)*", search: "O(1)*", insert: "O(1)*", remove: "O(1)*", visual: "buckets" },
  { id: "avl-tree", name: "AVL Tree", family: "Trees", summary: "Height-balanced BST enforcing strict balance factors.", operations: ["search", "insert", "delete", "rebalance"], access: "O(log n)", search: "O(log n)", insert: "O(log n)", remove: "O(log n)", visual: "tree" },
  { id: "red-black-tree", name: "Red-Black Tree", family: "Trees", summary: "Self-balancing BST with color invariants — the std::map workhorse.", operations: ["search", "insert", "rotate", "delete"], access: "O(log n)", search: "O(log n)", insert: "O(log n)", remove: "O(log n)", visual: "tree" },
  { id: "treap", name: "Treap", family: "Trees", summary: "BST ordered by key, heap-ordered by random priority.", operations: ["search", "split", "merge", "insert"], access: "O(log n)*", search: "O(log n)*", insert: "O(log n)*", remove: "O(log n)*", visual: "tree" },
  { id: "sparse-table", name: "Sparse Table", family: "Advanced", summary: "Static range-query table with O(1) idempotent queries (RMQ, gcd).", operations: ["build", "range query", "gcd", "min"], access: "O(1)", search: "O(1)", insert: "—", remove: "—", visual: "tree" },
  { id: "lru-cache", name: "LRU Cache", family: "Advanced", summary: "Hash map plus a recency-ordered chain for eviction.", operations: ["get", "put", "evict", "touch"], access: "O(1)", search: "O(1)", insert: "O(1)", remove: "O(1)", visual: "chain" },
  { id: "interval-tree", name: "Interval Tree", family: "Advanced", summary: "Ordered interval structure for overlap and stabbing queries.", operations: ["insert", "overlap", "stabbing", "delete"], access: "O(log n)", search: "O(log n + k)", insert: "O(log n)", remove: "O(log n)", visual: "tree" },
  { id: "monotonic-stack", name: "Monotonic Stack", family: "Linear", summary: "Stack keeping a monotone sequence — next greater/smaller queries.", operations: ["push pop", "next greater", "next smaller", "span"], access: "O(n)", search: "O(1)*", insert: "O(1)*", remove: "O(1)*", visual: "stack" },
  { id: "monotonic-queue", name: "Monotonic Deque", family: "Linear", summary: "Deque with a monotone window for sliding-window extremes.", operations: ["push", "pop", "max", "min"], access: "O(1)", search: "O(1)*", insert: "O(1)*", remove: "O(1)*", visual: "queue" },
];

type ProblemSeed = [title: string, difficulty: Difficulty, complexity: string, summary: string, exampleId?: string];

function group(topic: string, pattern: string, seeds: ProblemSeed[]): DsaProblem[] {
  return seeds.map(([title, difficulty, complexity, summary, exampleId]) => ({
    id: `${topic}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    title, topic, pattern, difficulty, complexity, summary, exampleId,
  }));
}

export const DSA_PROBLEMS: DsaProblem[] = [
  ...group("Arrays & Hashing", "Scan / hash", [
    ["Two Sum", "beginner", "O(n)", "Find two values whose sum reaches a target.", "two-sum-hash"],
    ["Contains Duplicate", "beginner", "O(n)", "Detect whether any value appears more than once."],
    ["Valid Anagram", "beginner", "O(n)", "Compare character frequencies between two strings."],
    ["Group Anagrams", "intermediate", "O(nk log k)", "Bucket words by a canonical character signature."],
    ["Top K Frequent Elements", "intermediate", "O(n)", "Return the values with the highest frequencies."],
    ["Product of Array Except Self", "intermediate", "O(n)", "Build products with prefix and suffix passes."],
    ["Longest Consecutive Sequence", "intermediate", "O(n)", "Find the longest run using constant-time membership."],
    ["Majority Element", "beginner", "O(n)", "Identify the value occurring more than half the time.", "majority-vote"],
    ["Missing Number", "beginner", "O(n)", "Recover one missing value from a bounded range."],
    ["Find All Duplicates", "intermediate", "O(n)", "Use indices as markers to reveal repeated values."],
    ["Subarray Sum Equals K", "intermediate", "O(n)", "Count target-sum subarrays with prefix frequencies."],
    ["Maximum Subarray", "intermediate", "O(n)", "Track the strongest contiguous sum ending at each index.", "kadane"],
    ["Maximum Product Subarray", "intermediate", "O(n)", "Track both minimum and maximum products through signs."],
    ["Sum of Array", "beginner", "O(n)", "Accumulate every value in a single pass.", "sum-array"],
    ["Maximum in Array", "beginner", "O(n)", "Track the largest value seen during a scan.", "max-array"],
    ["Minimum in Array", "beginner", "O(n)", "Keep the smallest candidate seen during one complete scan.", "min-array"],
    ["Reverse an Array", "beginner", "O(n)", "Swap mirrored positions with two pointers moving inward.", "reverse-array"],
  ]),
  ...group("Two Pointers", "Pointer convergence", [
    ["Valid Palindrome", "beginner", "O(n)", "Compare normalized characters from both ends.", "palindrome"],
    ["Two Sum II", "intermediate", "O(n)", "Converge on a target in a sorted array.", "two-sum"],
    ["3Sum", "intermediate", "O(n²)", "Fix one value and solve a two-pointer pair search.", "three-sum"],
    ["4Sum", "intermediate", "O(n³)", "Fix two values and solve the remaining pair with inward pointers.", "four-sum"],
    ["Container With Most Water", "intermediate", "O(n)", "Shrink the limiting wall while maximizing area."],
    ["Trapping Rain Water", "advanced", "O(n)", "Accumulate water using opposing boundary maxima."],
    ["Remove Duplicates From Sorted Array", "beginner", "O(n)", "Compact unique values in place."],
    ["Move Zeroes", "beginner", "O(n)", "Compact nonzero values while preserving order."],
    ["Sort Colors", "intermediate", "O(n)", "Partition three values with Dutch-national-flag pointers.", "dutch-national-flag"],
    ["Backspace String Compare", "beginner", "O(n)", "Walk strings backward while skipping erased characters."],
    ["Squares of a Sorted Array", "beginner", "O(n)", "Fill squared values from the largest magnitude inward."],
  ]),
  ...group("Sliding Window", "Window", [
    ["Maximum Sum Subarray of Size K", "beginner", "O(n)", "Reuse one rolling sum across every fixed-size window.", "sliding-window-fixed"],
    ["Best Time to Buy and Sell Stock", "beginner", "O(n)", "Track the cheapest price behind the current day."],
    ["Longest Substring Without Repeating", "intermediate", "O(n)", "Move a uniqueness window over a string."],
    ["Longest Repeating Character Replacement", "intermediate", "O(n)", "Maintain a window repairable with at most k edits."],
    ["Permutation in String", "intermediate", "O(n)", "Match fixed-size character-frequency windows."],
    ["Minimum Window Substring", "advanced", "O(n)", "Shrink the smallest window satisfying all requirements."],
    ["Sliding Window Maximum", "advanced", "O(n)", "Keep candidate maxima in a monotonic deque."],
    ["Minimum Size Subarray Sum", "intermediate", "O(n)", "Shrink positive-number windows once the target is met."],
    ["Max Consecutive Ones III", "intermediate", "O(n)", "Find the longest window repairable with k flips."],
    ["Fruit Into Baskets", "intermediate", "O(n)", "Keep a window containing at most two distinct values."],
    ["Find All Anagrams in a String", "intermediate", "O(n)", "Report windows matching a target frequency map."],
  ]),
  ...group("Stack & Queue", "Monotonic / LIFO / FIFO", [
    ["Valid Parentheses", "beginner", "O(n)", "Match closing brackets against the latest opener."],
    ["Min Stack", "intermediate", "O(1) ops", "Support push, pop, and minimum queries together."],
    ["Evaluate Reverse Polish Notation", "intermediate", "O(n)", "Reduce postfix operators over a value stack."],
    ["Generate Parentheses", "intermediate", "O(2ⁿ)", "Build only prefixes that can still become valid."],
    ["Daily Temperatures", "intermediate", "O(n)", "Resolve waiting days with a decreasing stack."],
    ["Car Fleet", "intermediate", "O(n log n)", "Merge arrival times while scanning cars by position."],
    ["Largest Rectangle in Histogram", "advanced", "O(n)", "Resolve maximal spans with an increasing stack."],
    ["Implement Queue Using Stacks", "beginner", "O(1)*", "Transfer values lazily between input and output stacks."],
    ["Implement Stack Using Queues", "beginner", "O(n)", "Rotate a queue to expose the newest value."],
    ["Decode String", "intermediate", "O(n)", "Expand nested repetition using frames."],
    ["Asteroid Collision", "intermediate", "O(n)", "Resolve opposing objects against a survivor stack."],
    ["Task Scheduler", "intermediate", "O(n log k)", "Schedule frequent jobs while respecting cooldowns."],
  ]),
  ...group("Binary Search", "Halving", [
    ["Classic Binary Search", "beginner", "O(log n)", "Find a target by halving a sorted range.", "binary-search"],
    ["Search a 2D Matrix", "intermediate", "O(log rc)", "Treat a sorted matrix as one virtual array."],
    ["Koko Eating Bananas", "intermediate", "O(n log m)", "Binary-search the smallest feasible speed."],
    ["Find Minimum in Rotated Sorted Array", "intermediate", "O(log n)", "Locate the rotation boundary using sorted halves."],
    ["Search in Rotated Sorted Array", "intermediate", "O(log n)", "Choose the sorted half that can contain the target."],
    ["Time Based Key-Value Store", "intermediate", "O(log n)", "Search versioned values by timestamp."],
    ["Median of Two Sorted Arrays", "advanced", "O(log min(n,m))", "Partition two arrays around a combined median."],
    ["First and Last Position", "intermediate", "O(log n)", "Run biased searches for both target boundaries."],
    ["Find Peak Element", "intermediate", "O(log n)", "Follow the rising slope toward a local maximum."],
    ["Split Array Largest Sum", "advanced", "O(n log s)", "Search the smallest feasible partition capacity."],
  ]),
  ...group("Linked Lists", "Pointer rewiring", [
    ["Reverse Linked List", "beginner", "O(n)", "Reverse next pointers while preserving the remaining chain."],
    ["Merge Two Sorted Lists", "beginner", "O(n+m)", "Stitch the smaller current node into a merged chain."],
    ["Reorder List", "intermediate", "O(n)", "Split, reverse, and interleave the two list halves."],
    ["Remove Nth Node From End", "intermediate", "O(n)", "Keep a fixed gap between two pointers."],
    ["Copy List With Random Pointer", "intermediate", "O(n)", "Clone both next and arbitrary links."],
    ["Add Two Numbers", "intermediate", "O(max(n,m))", "Add reversed digit chains with carry."],
    ["Linked List Cycle", "beginner", "O(n)", "Use fast and slow pointers to detect a loop."],
    ["Find Duplicate Number", "intermediate", "O(n)", "Interpret array values as links and locate a cycle entry."],
    ["LRU Cache", "intermediate", "O(1) ops", "Combine a hash map with a recency-ordered linked list."],
    ["Merge K Sorted Lists", "advanced", "O(n log k)", "Repeatedly take the smallest list head from a heap."],
    ["Reverse Nodes in K Group", "advanced", "O(n)", "Reverse complete fixed-size blocks in place."],
    ["Palindrome Linked List", "beginner", "O(n)", "Reverse one half and compare corresponding nodes."],
  ]),
  ...group("Trees & BST", "Tree traversal", [
    ["Invert Binary Tree", "beginner", "O(n)", "Swap left and right children throughout the tree."],
    ["Maximum Depth of Binary Tree", "beginner", "O(n)", "Return one plus the deeper child height."],
    ["Diameter of Binary Tree", "beginner", "O(n)", "Track the strongest path crossing each node."],
    ["Balanced Binary Tree", "beginner", "O(n)", "Propagate subtree heights or an imbalance sentinel."],
    ["Same Tree", "beginner", "O(n)", "Compare shape and values recursively."],
    ["Subtree of Another Tree", "beginner", "O(nm)", "Test structural equality at candidate roots."],
    ["Lowest Common Ancestor in BST", "intermediate", "O(h)", "Use ordering to descend toward the split point."],
    ["Binary Tree Level Order Traversal", "intermediate", "O(n)", "Process each breadth-first frontier as one level."],
    ["Binary Tree Right Side View", "intermediate", "O(n)", "Keep the last visible node on every level."],
    ["Count Good Nodes", "intermediate", "O(n)", "Carry the path maximum during DFS."],
    ["Validate Binary Search Tree", "intermediate", "O(n)", "Propagate strict lower and upper bounds."],
    ["Kth Smallest in BST", "intermediate", "O(h+k)", "Stop an inorder traversal at the kth value."],
    ["Construct Tree From Traversals", "intermediate", "O(n)", "Rebuild subtrees from traversal boundaries."],
    ["Serialize and Deserialize Binary Tree", "advanced", "O(n)", "Encode and rebuild shape including null positions."],
    ["Binary Tree Maximum Path Sum", "advanced", "O(n)", "Combine the best downward branches at each node."],
  ]),
  ...group("Heap & Priority Queue", "Priority selection", [
    ["Kth Largest Element in a Stream", "beginner", "O(log k)", "Keep only the k largest values in a min-heap."],
    ["Last Stone Weight", "beginner", "O(n log n)", "Repeatedly combine the two largest values."],
    ["K Closest Points to Origin", "intermediate", "O(n log k)", "Keep the closest coordinates by squared distance."],
    ["Kth Largest Element in an Array", "intermediate", "O(n log k)", "Maintain a bounded min-heap of leaders."],
    ["Reorganize String", "intermediate", "O(n log a)", "Always place the most frequent safe character next."],
    ["Design Twitter Feed", "intermediate", "O(k log u)", "Merge recent per-user streams by timestamp."],
    ["Find Median From Data Stream", "advanced", "O(log n)", "Balance lower and upper halves in two heaps."],
    ["Merge K Sorted Arrays", "intermediate", "O(n log k)", "Advance the stream that owns the current minimum."],
    ["Smallest Range Covering K Lists", "advanced", "O(n log k)", "Track one value per list while shrinking the range."],
  ]),
  ...group("Graphs", "Traversal / shortest path", [
    ["Number of Islands", "intermediate", "O(rc)", "Flood-fill each unvisited land component."],
    ["Clone Graph", "intermediate", "O(V+E)", "Copy vertices while memoizing original-to-clone links."],
    ["Max Area of Island", "intermediate", "O(rc)", "Measure every connected land component."],
    ["Pacific Atlantic Water Flow", "intermediate", "O(rc)", "Reverse-search from both ocean boundaries."],
    ["Surrounded Regions", "intermediate", "O(rc)", "Protect boundary-connected cells before flipping."],
    ["Rotting Oranges", "intermediate", "O(rc)", "Advance a multi-source BFS one minute at a time."],
    ["Walls and Gates", "intermediate", "O(rc)", "Fill nearest-gate distance by multi-source BFS."],
    ["Course Schedule", "intermediate", "O(V+E)", "Detect a cycle or finish a topological ordering."],
    ["Course Schedule II", "intermediate", "O(V+E)", "Emit one valid dependency order."],
    ["Graph Valid Tree", "intermediate", "O(V+E)", "Verify connectivity with no cycle."],
    ["Number of Connected Components", "intermediate", "O(V+E)", "Count components using traversal or union-find."],
    ["Word Ladder", "advanced", "O(nk²)", "BFS through one-letter transformations."],
    ["Network Delay Time", "intermediate", "O(E log V)", "Run Dijkstra from the signal source."],
    ["Cheapest Flights Within K Stops", "intermediate", "O(kE)", "Relax edges with a bounded number of flights."],
    ["BFS on a Grid", "intermediate", "O(V+E)", "Explore the grid level by level with a queue.", "bfs-grid"],
    ["DFS on a Grid", "intermediate", "O(V+E)", "Explore one path deeply before backtracking.", "dfs-grid"],
  ]),
  ...group("Advanced Graphs", "MST / SCC / union-find", [
    ["Min Cost to Connect All Points", "intermediate", "O(E log V)", "Build a minimum spanning tree over point distances."],
    ["Alien Dictionary", "advanced", "O(C)", "Infer character order from the first differing letters."],
    ["Reconstruct Itinerary", "advanced", "O(E log E)", "Consume lexical edges in an Eulerian traversal."],
    ["Swim in Rising Water", "advanced", "O(rc log rc)", "Expand the lowest available elevation frontier."],
    ["Redundant Connection", "intermediate", "O(E α(V))", "Find the edge joining already-connected vertices."],
    ["Critical Connections", "advanced", "O(V+E)", "Use low-link values to identify graph bridges."],
    ["Strongly Connected Components", "advanced", "O(V+E)", "Condense mutually reachable vertices."],
    ["Eulerian Path", "advanced", "O(E)", "Consume every edge exactly once while backtracking."],
    ["Kruskal Minimum Spanning Tree", "intermediate", "O(E log E)", "Accept light edges that join separate components."],
    ["Bellman-Ford Shortest Paths", "intermediate", "O(VE)", "Relax every edge repeatedly and detect negative cycles."],
  ]),
  ...group("Backtracking", "Decision tree", [
    ["Subsets", "intermediate", "O(2ⁿ)", "Choose whether each value enters the current set."],
    ["Combination Sum", "intermediate", "O(2ᵗ)", "Explore reusable candidates while tracking remaining sum."],
    ["Permutations", "intermediate", "O(n·n!)", "Place every unused value at the next position."],
    ["Subsets II", "intermediate", "O(2ⁿ)", "Skip duplicate branches after sorting."],
    ["Combination Sum II", "intermediate", "O(2ⁿ)", "Use each candidate once and suppress duplicate branches."],
    ["Word Search", "intermediate", "O(rc·4ˡ)", "Backtrack through adjacent cells without reuse."],
    ["Palindrome Partitioning", "intermediate", "O(n·2ⁿ)", "Cut only at prefixes that are palindromes."],
    ["Letter Combinations of a Phone Number", "intermediate", "O(4ⁿ)", "Branch over the letters mapped to each digit."],
    ["N Queens", "advanced", "O(n!)", "Place queens while blocking columns and diagonals."],
    ["Sudoku Solver", "advanced", "O(9ᵉ)", "Try valid digits in the most constrained empty cells."],
  ]),
  ...group("Dynamic Programming", "State transition", [
    ["Climbing Stairs", "beginner", "O(n)", "Combine the ways to reach the previous two steps."],
    ["Min Cost Climbing Stairs", "beginner", "O(n)", "Keep the cheapest cost to reach each step."],
    ["House Robber", "intermediate", "O(n)", "Choose between skipping and taking each house."],
    ["House Robber II", "intermediate", "O(n)", "Solve two linear ranges to break the cycle."],
    ["Longest Palindromic Substring", "intermediate", "O(n²)", "Expand around every possible center."],
    ["Palindromic Substrings", "intermediate", "O(n²)", "Count every successful center expansion."],
    ["Decode Ways", "intermediate", "O(n)", "Count valid one- and two-digit decodings."],
    ["Coin Change", "intermediate", "O(amount·coins)", "Build the fewest coins for every subtotal."],
    ["Maximum Product Subarray DP", "intermediate", "O(n)", "Carry extreme products through sign changes."],
    ["Word Break", "intermediate", "O(n²)", "Mark prefixes reachable by dictionary words."],
    ["Longest Increasing Subsequence", "intermediate", "O(n log n)", "Maintain the smallest tail for each length."],
    ["Partition Equal Subset Sum", "intermediate", "O(n·sum)", "Track subset sums up to half the total."],
    ["Unique Paths", "intermediate", "O(rc)", "Add ways arriving from above and left."],
    ["Longest Common Subsequence", "intermediate", "O(nm)", "Compare prefixes of both sequences."],
    ["Edit Distance", "advanced", "O(nm)", "Minimize insert, delete, and replace transitions."],
    ["Burst Balloons", "advanced", "O(n³)", "Choose the final balloon popped in each interval."],
  ]),
  ...group("Greedy & Intervals", "Local choice / sweep", [
    ["Maximum Subarray Greedy", "intermediate", "O(n)", "Drop a harmful prefix and extend the best suffix."],
    ["Jump Game", "intermediate", "O(n)", "Track the farthest index reachable so far."],
    ["Jump Game II", "intermediate", "O(n)", "Expand the current jump layer to its farthest reach."],
    ["Gas Station", "intermediate", "O(n)", "Restart after any prefix with a negative balance."],
    ["Hand of Straights", "intermediate", "O(n log n)", "Start consecutive groups from the smallest cards."],
    ["Merge Intervals", "intermediate", "O(n log n)", "Sort and fold overlapping ranges."],
    ["Insert Interval", "intermediate", "O(n)", "Place and merge one new range into sorted ranges."],
    ["Non-overlapping Intervals", "intermediate", "O(n log n)", "Keep intervals with the earliest finishing time."],
    ["Meeting Rooms", "beginner", "O(n log n)", "Detect overlap after sorting start times."],
    ["Meeting Rooms II", "intermediate", "O(n log n)", "Track concurrent intervals with endpoints or a heap."],
    ["Minimum Interval to Include Each Query", "advanced", "O(n log n)", "Sweep queries while maintaining eligible intervals."],
    ["Partition Labels", "intermediate", "O(n)", "Close a segment once all included characters end."],
  ]),
  ...group("Sorting", "Ordering", [
    ["Bubble Sort", "beginner", "O(n²)", "Swap adjacent inversions until all values settle.", "bubble-sort"],
    ["Insertion Sort", "beginner", "O(n²)", "Insert each value into an already-sorted prefix."],
    ["Selection Sort", "beginner", "O(n²)", "Repeatedly select the next minimum."],
    ["Merge Sort", "intermediate", "O(n log n)", "Sort halves recursively and merge their frontiers.", "merge-sort"],
    ["Quick Sort", "intermediate", "O(n log n)*", "Partition values around pivots recursively.", "quick-sort"],
    ["Heap Sort", "intermediate", "O(n log n)", "Heapify then extract extremes into final positions.", "heap-sort"],
    ["Counting Sort", "intermediate", "O(n+k)", "Count bounded integer values before expanding them."],
    ["Radix Sort", "advanced", "O(d(n+k))", "Stable-sort numbers one digit at a time."],
    ["Sort a Nearly Sorted Array", "intermediate", "O(n log k)", "Use a small heap over the displacement window."],
    ["Count Inversions", "advanced", "O(n log n)", "Count cross-half inversions during merge sort."],
  ]),
  ...group("Strings & Tries", "Prefix / pattern matching", [
    ["Implement Trie", "intermediate", "O(k) ops", "Store words as paths through character nodes."],
    ["Design Add and Search Words", "intermediate", "O(26ᵏ)", "Search a trie with wildcard branches."],
    ["Word Search II", "advanced", "O(rc·4ˡ)", "Prune board backtracking with a dictionary trie."],
    ["Longest Common Prefix", "beginner", "O(nk)", "Shrink a shared prefix across all words."],
    ["KMP Pattern Search", "advanced", "O(n+m)", "Reuse prefix matches after a mismatch."],
    ["Rabin-Karp Search", "intermediate", "O(n+m)*", "Compare rolling hashes over text windows."],
    ["Z Algorithm", "advanced", "O(n)", "Reuse a known match interval to compute prefix matches."],
    ["Minimum Add to Make Parentheses Valid", "intermediate", "O(n)", "Count unmatched opens and closes."],
    ["Longest Happy Prefix", "advanced", "O(n)", "Find the longest proper prefix that is also a suffix."],
    ["Autocomplete Suggestions", "intermediate", "O(k+r)", "Descend a trie prefix then enumerate completions."],
  ]),
  ...group("Bit & Math", "Bitwise / number theory", [
    ["Single Number", "beginner", "O(n)", "Cancel paired values with XOR."],
    ["Number of 1 Bits", "beginner", "O(bits)", "Clear or count set bits in an integer."],
    ["Counting Bits", "beginner", "O(n)", "Reuse the count from a smaller related integer."],
    ["Reverse Bits", "beginner", "O(bits)", "Shift source bits into reversed positions."],
    ["Sum of Two Integers", "intermediate", "O(bits)", "Separate XOR sum from shifted carry."],
    ["Pow(x, n)", "intermediate", "O(log n)", "Square the base while halving the exponent."],
    ["Happy Number", "beginner", "O(log n)", "Detect a cycle in repeated digit-square sums."],
    ["Plus One", "beginner", "O(n)", "Propagate a carry through decimal digits."],
    ["Sieve of Eratosthenes", "intermediate", "O(n log log n)", "Mark composites from each prime."],
    ["Greatest Common Divisor", "beginner", "O(log n)", "Apply Euclid's remainder reduction."],
    ["Factorial Recursion", "beginner", "O(n)", "Multiply n by the factorial of n minus one.", "factorial-recursion"],
    ["Fibonacci Recursion", "intermediate", "O(2ⁿ)", "Expand two recursive subproblems per call.", "fibonacci-recursion"],
  ]),
  ...group("Range Queries", "Indexed aggregation", [
    ["Range Sum Query Immutable", "beginner", "O(1) query", "Subtract two prefix sums for any interval."],
    ["Range Sum Query Mutable", "intermediate", "O(log n)", "Use a Fenwick or segment tree for updates and sums."],
    ["Range Minimum Query", "intermediate", "O(log n)", "Aggregate minimum values over segment tree nodes."],
    ["Lazy Range Addition", "advanced", "O(log n)", "Defer uniform segment updates until descendants are needed."],
    ["Count Smaller After Self", "advanced", "O(n log n)", "Query ranks while scanning values from right to left."],
    ["Reverse Pairs", "advanced", "O(n log n)", "Count cross-half pairs during divide and conquer."],
    ["Skyline Problem", "advanced", "O(n log n)", "Sweep building events with an active-height structure."],
    ["My Calendar", "intermediate", "O(log n)", "Reject bookings that overlap ordered intervals."],
  ]),
  ...group("Hard Classics", "Multi-pattern", [
    ["Median of Two Sorted Arrays", "advanced", "O(log min(n,m))", "Partition around a combined median boundary."],
    ["Trapping Rain Water II", "advanced", "O(rc log rc)", "Expand the lowest boundary cell with a min-heap."],
    ["Sliding Window Maximum", "advanced", "O(n)", "Keep candidate maxima in a monotonic deque."],
    ["Edit Distance", "advanced", "O(nm)", "Minimize insert, delete, and replace transitions."],
    ["Burst Balloons", "advanced", "O(n³)", "Choose the final balloon popped per interval."],
    ["Word Ladder II", "advanced", "O(nk²)", "Enumerate shortest transformation paths."],
    ["Serialize and Deserialize Binary Tree", "advanced", "O(n)", "Encode and rebuild shape including null positions."],
    ["Regular Expression Matching", "advanced", "O(nm)", "Match patterns with star and wildcard transitions."],
    ["Wildcard Matching", "advanced", "O(nm)", "Match star and question-mark patterns greedily."],
    ["Longest Valid Parentheses", "advanced", "O(n)", "Track balanced spans with a stack or indices."],
    ["Maximal Rectangle", "advanced", "O(nm)", "Apply maximal-rectangle histograms per row."],
    ["Candy", "advanced", "O(n)", "Resolve left and right rating constraints together."],
    ["Basic Calculator", "advanced", "O(n)", "Evaluate parentheses and sign-stacked expressions."],
    ["Dungeon Game", "advanced", "O(rc)", "Backward-fill the minimum health to survive."],
    ["Interleaving String", "advanced", "O(nm)", "Match both sequences in one interleaved pass."],
    ["Palindrome Pairs", "advanced", "O(nk²)", "Join words whose boundary is itself a palindrome."],
    ["Russian Doll Envelopes", "advanced", "O(n log n)", "Sort and run LIS on the constrained dimension."],
    ["Max Points on a Line", "advanced", "O(n²)", "Group points by normalized slope per anchor."],
    ["Shortest Palindrome", "advanced", "O(n)", "Extend a mirrored prefix to the whole string."],
    ["Largest Rectangle in Histogram", "advanced", "O(n)", "Resolve maximal spans with an increasing stack."],
  ]),
  ...group("Design & OOP", "Component design", [
    ["Design Twitter Feed", "intermediate", "O(k log u)", "Merge recent per-user streams by timestamp."],
    ["Design Browser History", "intermediate", "O(1) ops", "Keep back and forward stacks around the cursor."],
    ["Design Snake Game", "intermediate", "O(1)", "Move a deque body across a bounded board."],
    ["Design a Leaderboard", "intermediate", "O(log n)", "Keep scores in an order-statistic structure."],
    ["Design Underground System", "intermediate", "O(1)", "Store check-ins and aggregate station-to-station times."],
    ["Design Phone Directory", "beginner", "O(1)", "Allocate and recycle a bounded number pool."],
    ["Design Parking System", "beginner", "O(1)", "Track remaining capacity per vehicle size."],
    ["Design Hit Counter", "intermediate", "O(1) record", "Count hits inside a rolling time window."],
    ["Design HashMap", "beginner", "O(1)*", "Implement chained or open-addressed key-value storage."],
    ["Design Tic-Tac-Toe", "intermediate", "O(1)", "Track row, column, and diagonal ownership."],
    ["Design ATM", "intermediate", "O(1)", "Dispense largest denominations first."],
    ["Design a File System", "intermediate", "O(k)", "Create and query paths through a directory trie."],
    ["Design Median Finder", "advanced", "O(log n)", "Balance two heaps around a running median."],
    ["Design Circular Deque", "intermediate", "O(1)", "Support push and pop at both ring ends."],
  ]),
  ...group("Matrix & 2D DP", "Grid DP", [
    ["Unique Paths II", "intermediate", "O(rc)", "Skip blocked cells while accumulating ways."],
    ["Minimum Path Sum", "intermediate", "O(rc)", "Combine the cheaper incoming direction per cell."],
    ["Maximal Square", "intermediate", "O(rc)", "Grow squares from the smallest neighbor side."],
    ["Triangle", "intermediate", "O(n²)", "Reduce rows bottom-up to the minimal path."],
    ["Coin Change II", "intermediate", "O(amount·coins)", "Count combinations, not permutations, per coin."],
    ["Target Sum", "intermediate", "O(n·sum)", "Count assignments reaching a target difference."],
    ["Ones and Zeroes", "intermediate", "O(mnk)", "Knapsack over limited zero and one budgets."],
    ["Longest Increasing Path in a Matrix", "advanced", "O(rc)", "Memoized DFS following strictly rising neighbors."],
    ["Cherry Pickup", "advanced", "O(n³)", "Simulate two collectors in one synchronized walk."],
    ["Knight Probability", "intermediate", "O(kn²)", "Sum move probabilities while staying on board."],
    ["Count Square Submatrices", "intermediate", "O(rc)", "Extend square counts from corner minima."],
    ["Longest String Chain", "intermediate", "O(nk²)", "Grow predecessor chains by single deletions."],
  ]),
  ...group("Union-Find & MST", "Connectivity", [
    ["Accounts Merge", "intermediate", "O(n α)", "Union email owners then merge their contact lists."],
    ["Most Stones Removed", "intermediate", "O(n α)", "Union stones sharing a row or column."],
    ["Smallest String With Swaps", "intermediate", "O(n α)", "Permute within each connected swap component."],
    ["Regions Cut by Slashes", "advanced", "O(n² α)", "Tile each cell into four unionable triangles."],
    ["Number of Provinces", "intermediate", "O(n²)", "Count connected components of direct friendships."],
    ["Evaluate Division", "intermediate", "O(qE)", "Propagate ratios along weighted graph edges."],
    ["Optimize Water Distribution", "intermediate", "O(E log V)", "Add a virtual well and run a minimum spanning tree."],
    ["Connecting Cities With Minimum Cost", "intermediate", "O(E log V)", "Build the cheapest fully connected network."],
    ["Swim in Rising Water", "advanced", "O(rc log rc)", "Expand the lowest available elevation frontier."],
    ["Longest Consecutive Union", "intermediate", "O(n)", "Union adjacent values and track the largest group."],
  ]),
  ...group("Frequency & Counting", "Counting / prefix frequency", [
    ["First Missing Positive", "intermediate", "O(n)", "Place each value at its index and scan for the gap."],
    ["Find All Numbers Disappeared", "beginner", "O(n)", "Mark visited indices to reveal absent values."],
    ["Minimum Deletions to Make Unique Frequencies", "intermediate", "O(n)", "Decrement duplicate frequency counts to distinctness."],
    ["Sort Characters by Frequency", "intermediate", "O(n log k)", "Emit characters ordered by descending counts."],
    ["Top K Frequent Words", "intermediate", "O(n log k)", "Keep the highest-frequency words in a bounded heap."],
    ["Least Number of Unique Integers", "intermediate", "O(n log n)", "Remove the least frequent values first."],
    ["Maximum Frequency Stack", "advanced", "O(1) ops", "Stack values while honoring global frequency."],
    ["Subarrays With K Different Integers", "advanced", "O(n)", "Window-count subarrays with exactly k distinct values."],
  ]),
];

export const DSA_TOPICS = Array.from(new Set(DSA_PROBLEMS.map((problem) => problem.topic)));

export const DSA_SOURCE_LINKS = [
  { label: "LeetCode Top Interview 150", href: "https://leetcode.com/studyplan/top-interview-150/" },
  { label: "LeetCode Problem List", href: "https://leetcode.com/problemset/" },
  { label: "NeetCode 150", href: "https://neetcode.io/practice" },
  { label: "GeeksforGeeks DSA roadmap", href: "https://www.geeksforgeeks.org/dsa/dsa-tutorial-learn-data-structures-and-algorithms/" },
];

export function leetCodeSearchUrl(title: string): string {
  return `https://leetcode.com/problemset/all/?search=${encodeURIComponent(title)}`;
}

export const VISUALIZER_DRAFT_KEY = "codeanvil:visualizer-draft";

export function makeProblemStarter(problem: DsaProblem): string {
  const safeName = problem.title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
  if (problem.exampleId === "majority-vote") return MAJORITY_VOTE_CODE;
  if (problem.exampleId === "sliding-window-fixed") return FIXED_WINDOW_CODE;
  if (problem.exampleId === "binary-search") return `arr = [1, 3, 5, 7, 9, 11]\ntarget = 7\nlow, high = 0, len(arr) - 1\nwhile low <= high:\n    mid = (low + high) // 2\n    if arr[mid] == target:\n        print("Found at", mid)\n        break\n    elif arr[mid] < target:\n        low = mid + 1\n    else:\n        high = mid - 1`;
  if (problem.exampleId === "bubble-sort") return `arr = [5, 2, 8, 1]\nn = len(arr)\nfor i in range(n - 1):\n    for j in range(n - 1 - i):\n        if arr[j] > arr[j + 1]:\n            arr[j], arr[j + 1] = arr[j + 1], arr[j]\nprint(arr)`;
  if (problem.exampleId === "merge-sort") return `arr = [8, 3, 5, 1, 9, 2]\ndef merge_sort(a):\n    if len(a) <= 1:\n        return a\n    mid = len(a) // 2\n    left = merge_sort(a[:mid])\n    right = merge_sort(a[mid:])\n    return merge(left, right)\nprint(merge_sort(arr))`;
  if (problem.exampleId === "quick-sort") return `arr = [9, 3, 7, 1, 8, 2]\ndef partition(a, lo, hi):\n    pivot = a[hi]\n    i = lo\n    for j in range(lo, hi):\n        if a[j] < pivot:\n            a[i], a[j] = a[j], a[i]\n            i += 1\n    a[i], a[hi] = a[hi], a[i]\n    return i\nprint(arr)`;
  if (problem.exampleId === "heap-sort") return `arr = [4, 10, 3, 5, 1]\ndef heapify(a, n, i):\n    largest = i\n    l, r = 2 * i + 1, 2 * i + 2\n    if l < n and a[l] > a[largest]:\n        largest = l\n    if r < n and a[r] > a[largest]:\n        largest = r\n    if largest != i:\n        a[i], a[largest] = a[largest], a[i]\nprint(arr)`;
  if (problem.exampleId === "palindrome") return `s = "racecar"\nl, r = 0, len(s) - 1\nwhile l < r:\n    if s[l] != s[r]:\n        print("Not a palindrome")\n        break\n    l += 1\n    r -= 1\nelse:\n    print("Palindrome!")`;
  if (problem.exampleId === "two-sum-hash") return `arr = [4, 7, 1, 8, 3, 6]\ntarget = 10\nseen = {}\nfor i, value in enumerate(arr):\n    need = target - value\n    if need in seen:\n        print(seen[need], i)\n        break\n    seen[value] = i\nelse:\n    print("No pair")`;
  if (problem.exampleId === "two-sum") return `arr = [2, 7, 11, 15]\ntarget = 9\nl = 0\nr = len(arr) - 1\nwhile l < r:\n    s = arr[l] + arr[r]\n    if s == target:\n        print(l, r)\n        break\n    elif s < target:\n        l += 1\n    else:\n        r -= 1`;
  if (problem.exampleId === "sum-array") return `arr = [4, 7, 1, 9]\ntotal = 0\nfor i in range(len(arr)):\n    total = total + arr[i]\nprint("Total:", total)`;
  if (problem.exampleId === "max-array") return `arr = [3, 8, 2, 9, 5]\nmax_val = arr[0]\nfor i in range(1, len(arr)):\n    if arr[i] > max_val:\n        max_val = arr[i]\nprint("Max:", max_val)`;
  if (problem.exampleId === "min-array") return `arr = [7, 4, 9, 1, 5]\nmin_val = arr[0]\nmin_idx = 0\nfor i in range(1, len(arr)):\n    if arr[i] < min_val:\n        min_val = arr[i]\n        min_idx = i\nprint("Min:", min_val)`;
  if (problem.exampleId === "kadane") return `arr = [-2, 1, -3, 4, -1, 2, 1, -5, 4]\ncurrent_sum = arr[0]\nbest_sum = arr[0]\ncurrent_start = 0\nbest_start = best_end = 0\nfor i in range(1, len(arr)):\n    if arr[i] > current_sum + arr[i]:\n        current_sum = arr[i]\n        current_start = i\n    else:\n        current_sum += arr[i]\n    if current_sum > best_sum:\n        best_sum = current_sum\n        best_start, best_end = current_start, i\nprint(best_sum)`;
  if (problem.exampleId === "reverse-array") return `arr = [9, 3, 7, 1, 5, 2]\nleft = 0\nright = len(arr) - 1\nwhile left < right:\n    arr[left], arr[right] = arr[right], arr[left]\n    left += 1\n    right -= 1\nprint("Reversed:", arr)`;
  if (problem.exampleId === "factorial-recursion") return `def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)\n\nprint(fact(4))`;
  if (problem.exampleId === "fibonacci-recursion") return `def fib(n):\n    if n <= 1:\n        return n\n    return fib(n - 1) + fib(n - 2)\n\nprint(fib(5))`;
  return `# ${problem.title}\n# Pattern: ${problem.pattern}\n# Target complexity: ${problem.complexity}\n\ndef ${safeName}(input_data):\n    # Paste or write your ${problem.topic.toLowerCase()} solution here.\n    result = input_data\n    return result\n\nprint(${safeName}([4, 7, 1, 9]))`;
}
