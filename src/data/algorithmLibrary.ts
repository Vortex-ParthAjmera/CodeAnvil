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

export interface AlgorithmExampleMatch {
  sectionId: string;
  sectionTitle: string;
  itemTitle: string;
  variantLabel: string;
  displayTitle: string;
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
      item("Meet in the Middle"),
      item("Fractional Cascading"),
      item("Sqrt Decomposition (Block Range Queries)"),
      item("Max Sum Rectangle in 2D Matrix"),
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
      item("Cycle Sort"),
      item("Pancake Sort"),
      item("Comb Sort"),
      item("Gnome Sort"),
      item("Odd-Even Sort"),
      item("Bogosort (joke algorithm)"),
      item("3-Way Quick Sort (Dutch Flag Partition)"),
      item("External Sorting (larger than memory)"),
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
      item("Run-Length Encoding"),
    ],
  },
  {
    id: "advanced-string-algorithms",
    title: "Advanced String Algorithms",
    description: "Suffix structures, automata, multi-pattern search, rotations, and compression-oriented text transforms.",
    items: [
      item("Suffix Array (construction)"),
      item("Suffix Tree"),
      item("Suffix Automaton"),
      item("Aho-Corasick Algorithm (multi-pattern search)"),
      item("Boyer-Moore Algorithm"),
      item("Longest Repeated Substring"),
      item("Trie-based Auto-complete / Word Dictionary"),
      item("Booth's Algorithm (least lexicographic rotation)"),
      item("Manber-Myers Algorithm (suffix array construction)"),
      item("Ukkonen's Algorithm (linear-time suffix tree construction)"),
      item("Burrows-Wheeler Transform"),
      item("Lyndon Words / Duval's Algorithm"),
      item("Longest Common Substring (Suffix Array / Tree)"),
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
    id: "advanced-trees",
    title: "Advanced Trees",
    description: "Persistent trees, query trees, compact integer trees, and specialized tree structures.",
    items: [
      item("Wavelet Tree"),
      item("Van Emde Boas Tree"),
      item("Palindromic Tree (Eertree)"),
      item("Merge Sort Tree"),
      item("Persistent Segment Tree"),
      item("Persistent Trie"),
      item("Segment Tree Beats"),
      item("Li Chao Tree"),
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
    id: "advanced-graph-algorithms",
    title: "Advanced Graph Algorithms",
    description: "Flow, matching, all-pairs paths, decompositions, satisfiability, tours, and advanced connectivity.",
    items: [
      item("Johnson's Algorithm (All-Pairs Shortest Path)"),
      item("Ford-Fulkerson / Edmonds-Karp (Max Flow)"),
      item("Dinic's Algorithm (Max Flow)"),
      item("Min-Cut (via Max Flow)"),
      item("Hopcroft-Karp (Bipartite Matching)"),
      item("Euler Path / Circuit + Hierholzer's Algorithm"),
      item("Traveling Salesman Problem (DP / Held-Karp)"),
      item("2-SAT"),
      item("Heavy-Light Decomposition"),
      item("Centroid Decomposition"),
      item("LCA via Binary Lifting / Sparse Table"),
      item("Chinese Postman Problem"),
      item("Boruvka's Algorithm (MST)"),
      item("Stoer-Wagner Algorithm (Global Min-Cut)"),
      item("SPFA (Bellman-Ford variant)"),
      item("Mo's Algorithm (Offline Range Queries)"),
      item("DSU on Tree (Small-to-Large Merging)"),
      item("Christofides Algorithm (TSP Approximation)"),
      item("Link-Cut Tree"),
      item("Weighted Union-Find"),
      item("DSU with Rollback (Offline / Persistent)"),
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
    id: "advanced-dp-patterns",
    title: "Advanced DP Patterns",
    description: "Specialized DP families for digits, trees, intervals, probabilities, bitmasks, and state compression.",
    items: [
      item("Digit DP"),
      item("Tree DP (DP on Trees)"),
      item("Interval DP (Burst Balloons)"),
      item("Probability / Expected Value DP"),
      item("DP + Bitmask (Traveling Salesman style)"),
      item("Broken Profile DP (Plug DP)"),
    ],
  },
  {
    id: "dp-optimizations",
    title: "DP Optimizations",
    description: "Optimization tricks that turn slow recurrences into contest-grade transitions.",
    items: [
      item("Convex Hull Trick (CHT)"),
      item("Li Chao Tree Optimization"),
      item("Knuth's Optimization"),
      item("Divide and Conquer Optimization"),
      item("Slope Trick"),
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
    id: "math-number-theory",
    title: "Math / Number Theory",
    description: "Number theory, combinatorics, modular arithmetic, transforms, and prime/factorization tools.",
    items: [
      item("GCD / LCM (Euclidean Algorithm)"),
      item("Extended Euclidean Algorithm"),
      item("Sieve of Eratosthenes (Prime Numbers)"),
      item("Segmented Sieve"),
      item("Miller-Rabin Primality Test"),
      item("Pollard's Rho (Integer Factorization)"),
      item("Prime Factorization"),
      item("Fast Exponentiation (Modular)"),
      item("Modular Inverse"),
      item("Chinese Remainder Theorem"),
      item("Matrix Exponentiation (Fast Fibonacci)"),
      item("Catalan Numbers"),
      item("nCr / Pascal's Triangle (Combinatorics)"),
      item("Euler's Totient Function"),
      item("Fast Fourier Transform (FFT)"),
      item("Number Theoretic Transform (NTT)"),
      item("Baby-Step Giant-Step (Discrete Log)"),
      item("Lucas' Theorem (nCr mod p)"),
      item("Mobius Function / Inversion"),
      item("Stern-Brocot Tree / Farey Sequence"),
    ],
  },
  {
    id: "matrix-specific",
    title: "Matrix Specific",
    description: "Dedicated 2D matrix movement, transforms, search, traversal, and matrix-powered recurrence tricks.",
    items: [
      item("Rotate Matrix (90 degrees, in-place)"),
      item("Spiral Matrix Traversal"),
      item("Search in 2D Sorted Matrix"),
      item("Matrix Exponentiation"),
    ],
  },
  {
    id: "advanced-data-structures",
    title: "Advanced Data Structures",
    description: "Trees, filters, range tables, caches, and multi-dimensional query structures beyond the core set.",
    items: [
      item("Sparse Table (Range Min / Max Query)"),
      item("Treap"),
      item("Splay Tree"),
      item("Skip List"),
      item("B-Tree / B+ Tree"),
      item("Bloom Filter"),
      item("LFU Cache"),
      item("Persistent Segment Tree"),
      item("2D Fenwick Tree / 2D Segment Tree"),
      item("KD-Tree (Nearest Neighbor Search)"),
      item("Quad Tree / Octree"),
    ],
  },
  {
    id: "computational-geometry",
    title: "Computational Geometry",
    description: "Geometric predicates, hulls, sweeps, nearest-neighbor structures, and planar intersection routines.",
    items: [
      item("Convex Hull (Graham Scan, Jarvis March)"),
      item("Closest Pair of Points"),
      item("Line Intersection Check"),
      item("Sweep Line Algorithm"),
      item("Rotating Calipers"),
      item("Bentley-Ottmann Algorithm (Line Segment Intersections)"),
      item("Half-Plane Intersection"),
    ],
  },
  {
    id: "game-theory",
    title: "Game Theory",
    description: "Adversarial search, pruning, impartial games, and state-value reasoning.",
    items: [
      item("Minimax Algorithm"),
      item("Alpha-Beta Pruning"),
      item("Nim Game / Grundy Numbers"),
      item("Sprague-Grundy Theorem"),
    ],
  },
  {
    id: "randomized-algorithms",
    title: "Randomized Algorithms",
    description: "Sampling, randomized pivots, and probabilistic algorithm guarantees.",
    items: [
      item("Reservoir Sampling"),
      item("Randomized Quicksort"),
      item("Monte Carlo Methods"),
      item("Las Vegas Methods"),
      item("Fisher-Yates Shuffle"),
    ],
  },
  {
    id: "hashing-variants",
    title: "Hashing Variants",
    description: "Hashing strategies for strings, tables, distributed ownership, and collision management.",
    items: [
      item("Rolling Hash (Rabin-Karp style)"),
      item("Double Hashing"),
      item("Cuckoo Hashing"),
      item("Consistent Hashing"),
    ],
  },
  {
    id: "streaming-probabilistic",
    title: "Streaming / Probabilistic",
    description: "Approximate counters and streaming summaries for large or unbounded data.",
    items: [
      item("Count-Min Sketch"),
      item("HyperLogLog"),
      item("Misra-Gries Algorithm"),
      item("Reservoir Sampling (streaming variants)"),
    ],
  },
  {
    id: "parallel-distributed",
    title: "Parallel & Distributed",
    description: "Parallel scan primitives and systems-style distributed coordination algorithms.",
    items: [
      item("Parallel Prefix Sum (Scan)"),
      item("Bully Algorithm (Leader Election)"),
      item("Ring Algorithm (Leader Election)"),
      item("Consensus Algorithms (Paxos, Raft)"),
    ],
  },
  {
    id: "approximation-algorithms",
    title: "Approximation Algorithms",
    description: "Near-optimal algorithms for hard optimization problems where exact search is impractical.",
    items: [
      item("Vertex Cover Approximation"),
      item("Set Cover (Greedy)"),
      item("PTAS for Knapsack"),
    ],
  },
  {
    id: "misc-classics",
    title: "Misc Classics",
    description: "Classic standalone problems and techniques that show up across interviews, contests, and systems.",
    items: [
      item("Josephus Problem"),
      item("Fisher-Yates Shuffle"),
      item("Weighted Union-Find"),
      item("DSU with Rollback (Offline / Persistent)"),
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

export function findAlgorithmForExample(exampleId: string): AlgorithmExampleMatch | undefined {
  for (const section of ALGORITHM_SECTIONS) {
    for (const entry of section.items) {
      for (const variant of entry.variants) {
        if (variant.exampleId !== exampleId) continue;
        const displayTitle =
          entry.variants.length > 1 && variant.label !== "Play"
            ? `${entry.title} - ${variant.label}`
            : entry.title;
        return {
          sectionId: section.id,
          sectionTitle: section.title,
          itemTitle: entry.title,
          variantLabel: variant.label,
          displayTitle,
        };
      }
    }
  }
  return undefined;
}

export function findSectionIdForExample(exampleId: string): string | undefined {
  return findAlgorithmForExample(exampleId)?.sectionId;
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
