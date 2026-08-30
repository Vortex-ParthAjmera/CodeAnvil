export interface AlgorithmVariant {
  label: string;
  exampleId?: string;
}

export interface AlgorithmItem {
  title: string;
  variants: AlgorithmVariant[];
}

export interface AlgorithmSection {
  id: string;
  title: string;
  description: string;
  items: AlgorithmItem[];
}

function item(title: string, exampleId?: string): AlgorithmItem {
  return { title, variants: [{ label: exampleId ? "Play" : "Queued", exampleId }] };
}

function multi(title: string, variants: AlgorithmVariant[]): AlgorithmItem {
  return { title, variants };
}

const queued = (label: string): AlgorithmVariant => ({ label });
const ready = (label: string, exampleId: string): AlgorithmVariant => ({ label, exampleId });

export const ALGORITHM_SECTIONS: AlgorithmSection[] = [
  {
    id: "arrays-basics",
    title: "Arrays & Basics",
    description: "Scanning, pointers, windows, intervals, and the first patterns every DSA learner needs.",
    items: [
      item("Sum of Array", "sum-array"),
      item("Max in Array", "max-array"),
      item("Min in Array"),
      item("Reverse an Array"),
      item("Kadane's Algorithm (Max Subarray Sum)"),
      item("Two Sum (Unsorted / Hashing)"),
      item("Two Sum (Sorted / Two Pointer)", "two-sum"),
      item("Three Sum"),
      item("Four Sum"),
      item("Dutch National Flag (Sort 0s, 1s, 2s)"),
      item("Moore's Voting Algorithm (Majority Element)"),
      item("Sliding Window (Fixed Size)"),
      item("Sliding Window (Variable Size)"),
      item("Prefix Sum"),
      item("Difference Array"),
      item("Trapping Rain Water"),
      item("Rotate Array (Cyclic Rotation)"),
      item("Merge Intervals"),
      item("Next Permutation"),
    ],
  },
  {
    id: "searching",
    title: "Searching",
    description: "From direct scans to monotonic search spaces and specialized sorted-data probes.",
    items: [
      item("Linear Search"),
      item("Binary Search", "binary-search"),
      item("Binary Search on Answer"),
      item("Search in Rotated Sorted Array"),
      item("Ternary Search"),
      item("Exponential Search"),
      item("Jump Search"),
      item("Interpolation Search"),
    ],
  },
  {
    id: "sorting",
    title: "Sorting",
    description: "Comparison sorts, distribution sorts, heap-backed ordering, and real-world hybrid ideas.",
    items: [
      item("Bubble Sort", "bubble-sort"),
      item("Selection Sort"),
      item("Insertion Sort"),
      item("Merge Sort", "merge-sort"),
      item("Quick Sort", "quick-sort"),
      item("Heap Sort", "heap-sort"),
      item("Counting Sort"),
      item("Radix Sort"),
      item("Bucket Sort"),
      item("Shell Sort"),
      item("Tim Sort (concept)"),
    ],
  },
  {
    id: "recursion-backtracking",
    title: "Recursion & Backtracking",
    description: "Call stacks, branching choices, pruning, and search trees that explain how recursion actually moves.",
    items: [
      multi("Factorial", [ready("Loop", "factorial-loop"), ready("Recursion", "factorial-recursion")]),
      multi("Fibonacci", [ready("Recursion", "fibonacci-recursion"), queued("Memoized"), queued("Iterative")]),
      item("Power / Exponentiation (Fast Power)"),
      item("N-Queens"),
      item("Rat in a Maze"),
      item("Sudoku Solver"),
      item("Subsets / Power Set"),
      item("Permutations & Combinations"),
      item("Word Search"),
      item("Palindrome Partitioning"),
      item("Knight's Tour"),
    ],
  },
  {
    id: "strings",
    title: "Strings",
    description: "Character scans, two-pointer checks, prefix tables, rolling hashes, and trie-backed matching.",
    items: [
      item("Palindrome Check", "palindrome"),
      item("Anagram Check"),
      item("String Reversal"),
      item("KMP (Knuth-Morris-Pratt) Pattern Matching"),
      item("Rabin-Karp Algorithm"),
      item("Z-Algorithm"),
      item("Longest Common Prefix"),
      item("Longest Palindromic Substring (Expand Around Center / DP)"),
      item("Manacher's Algorithm"),
      item("Trie-based String Matching"),
    ],
  },
  {
    id: "linked-lists",
    title: "Linked Lists",
    description: "Pointer rewiring, runner pointers, node deletion, list merging, and cache structure design.",
    items: [
      item("Reverse a Linked List (Iterative & Recursive)"),
      item("Detect Cycle (Floyd's Cycle Detection / Tortoise-Hare)"),
      item("Find Middle of Linked List"),
      item("Merge Two Sorted Linked Lists"),
      item("Remove Nth Node from End"),
      item("Add Two Numbers (as Linked Lists)"),
      item("Flatten a Multilevel Linked List"),
      item("LRU Cache (Doubly Linked List + HashMap)"),
    ],
  },
  {
    id: "stacks-queues",
    title: "Stacks & Queues",
    description: "LIFO/FIFO thinking, monotonic structures, bracket parsing, and window extrema.",
    items: [
      item("Valid Parentheses"),
      item("Next Greater Element"),
      item("Next Smaller Element"),
      item("Min Stack"),
      item("Monotonic Stack / Queue"),
      item("Implement Queue using Stacks (and vice versa)"),
      item("Sliding Window Maximum (Deque)"),
      item("Largest Rectangle in Histogram"),
    ],
  },
  {
    id: "trees",
    title: "Trees",
    description: "Traversal orders, BFS levels, BST operations, tries, segment trees, and balanced tree ideas.",
    items: [
      multi("Tree Traversal", [ready("Inorder", "inorder"), queued("Preorder"), queued("Postorder")]),
      item("Level Order Traversal (BFS)"),
      item("Height / Depth of Tree"),
      item("Diameter of Binary Tree"),
      item("Lowest Common Ancestor (LCA)"),
      item("Balanced Binary Tree Check"),
      item("Symmetric Tree Check"),
      item("Binary Tree to Linked List"),
      item("Serialize / Deserialize Tree"),
      item("BST Insert / Delete / Search"),
      item("Validate BST"),
      item("Kth Smallest / Largest in BST"),
      item("Trie (Prefix Tree) Insert / Search"),
      item("Segment Tree (Range Queries)"),
      item("Fenwick Tree / Binary Indexed Tree"),
      item("AVL Tree Rotations"),
      item("Red-Black Tree (concept)"),
    ],
  },
  {
    id: "graphs",
    title: "Graphs",
    description: "Grid traversal, graph traversal, shortest paths, MSTs, cycles, components, and low-link classics.",
    items: [
      multi("BFS", [ready("Grid", "bfs-grid"), queued("Graph")]),
      multi("DFS", [ready("Grid", "dfs-grid"), queued("Graph")]),
      item("Dijkstra's Algorithm (Shortest Path)"),
      item("Bellman-Ford Algorithm"),
      item("Floyd-Warshall Algorithm"),
      item("A* Search Algorithm"),
      item("Topological Sort (Kahn's Algorithm & DFS-based)"),
      item("Union-Find / Disjoint Set (with Path Compression)"),
      item("Kruskal's Algorithm (MST)"),
      item("Prim's Algorithm (MST)"),
      item("Detect Cycle in Graph (Directed & Undirected)"),
      item("Bipartite Graph Check"),
      item("Number of Islands"),
      item("Flood Fill"),
      item("Tarjan's Algorithm (SCC / Bridges)"),
      item("Kosaraju's Algorithm (SCC)"),
      item("Bridges & Articulation Points"),
    ],
  },
  {
    id: "dynamic-programming",
    title: "Dynamic Programming",
    description: "State transitions, memo tables, tabulation grids, subsequences, knapsack, and interval DP.",
    items: [
      item("Fibonacci (DP / Memoized)"),
      item("Climbing Stairs"),
      item("0/1 Knapsack"),
      item("Unbounded Knapsack"),
      item("Coin Change (Min Coins / Ways)"),
      item("Longest Common Subsequence (LCS)"),
      item("Longest Increasing Subsequence (LIS)"),
      item("Edit Distance"),
      item("Matrix Chain Multiplication"),
      item("Subset Sum"),
      item("Partition Equal Subset Sum"),
      item("House Robber"),
      item("Egg Dropping Problem"),
      item("Word Break"),
      item("Longest Palindromic Subsequence"),
      item("DP on Grids (Unique Paths, Min Path Sum)"),
      item("Bitmask DP"),
    ],
  },
  {
    id: "greedy",
    title: "Greedy",
    description: "Local choices, scheduling, intervals, coding trees, and proof-by-exchange patterns.",
    items: [
      item("Activity Selection"),
      item("Fractional Knapsack"),
      item("Job Sequencing with Deadlines"),
      item("Huffman Coding"),
      item("Minimum Platforms Problem"),
      item("Gas Station Problem"),
    ],
  },
  {
    id: "heaps-priority-queue",
    title: "Heaps / Priority Queue",
    description: "Priority selection, top-k streams, merging sorted sources, and two-heap balancing.",
    items: [
      item("Build Heap / Heapify"),
      item("Kth Largest / Smallest Element"),
      item("Top K Frequent Elements"),
      item("Merge K Sorted Lists"),
      item("Median of Data Stream (Two Heaps)"),
    ],
  },
  {
    id: "bit-manipulation",
    title: "Bit Manipulation",
    description: "Bit counts, masks, XOR cancellation, subset generation, and small constant-memory tricks.",
    items: [
      item("Count Set Bits"),
      item("Power of Two Check"),
      item("Single Number (XOR trick)"),
      item("Bitmasking Subsets"),
    ],
  },
  {
    id: "math",
    title: "Math",
    description: "Number theory foundations for gcd, primes, factors, and modular exponentiation.",
    items: [
      item("GCD / LCM (Euclidean Algorithm)"),
      item("Sieve of Eratosthenes (Prime Numbers)"),
      item("Fast Exponentiation (Modular)"),
      item("Prime Factorization"),
    ],
  },
];

export function countAlgorithmButtons(section: AlgorithmSection): number {
  return section.items.reduce((sum, entry) => sum + entry.variants.length, 0);
}

export function countReadyAlgorithmButtons(section: AlgorithmSection): number {
  return section.items.reduce(
    (sum, entry) => sum + entry.variants.filter((variant) => Boolean(variant.exampleId)).length,
    0,
  );
}

export function findSectionIdForExample(exampleId: string): string | undefined {
  for (const section of ALGORITHM_SECTIONS) {
    for (const entry of section.items) {
      if (entry.variants.some((variant) => variant.exampleId === exampleId)) return section.id;
    }
  }
  return undefined;
}

export function readyAlgorithmExampleIds(): string[] {
  const ids = new Set<string>();
  for (const section of ALGORITHM_SECTIONS) {
    for (const entry of section.items) {
      for (const variant of entry.variants) {
        if (variant.exampleId) ids.add(variant.exampleId);
      }
    }
  }
  return [...ids];
}

export const TOTAL_ALGORITHM_BUTTONS = ALGORITHM_SECTIONS.reduce(
  (sum, section) => sum + countAlgorithmButtons(section),
  0,
);

export const TOTAL_READY_ALGORITHM_BUTTONS = ALGORITHM_SECTIONS.reduce(
  (sum, section) => sum + countReadyAlgorithmButtons(section),
  0,
);
