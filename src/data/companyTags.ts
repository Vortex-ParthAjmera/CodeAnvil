/**
 * Curated company tags for the most commonly asked problems (sourced from
 * public interview-frequency data). This is a small, honest subset — not a
 * claim of completeness — used to filter the Atlas problem library.
 */

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const pid = (topic: string, title: string) => `${slug(topic)}-${slug(title)}`;

export const COMPANY_TAGS: Record<string, string[]> = {
  [pid("Arrays & Hashing", "Two Sum")]: ["Google", "Amazon", "Adobe", "Apple"],
  [pid("Arrays & Hashing", "Contains Duplicate")]: ["Amazon", "Microsoft", "Google"],
  [pid("Arrays & Hashing", "Valid Anagram")]: ["Amazon", "Google", "Microsoft"],
  [pid("Arrays & Hashing", "Group Anagrams")]: ["Amazon", "Meta", "Microsoft"],
  [pid("Arrays & Hashing", "Top K Frequent Elements")]: ["Meta", "Amazon", "Apple"],
  [pid("Arrays & Hashing", "Product of Array Except Self")]: ["Amazon", "Meta", "Apple"],
  [pid("Arrays & Hashing", "Longest Consecutive Sequence")]: ["Amazon", "Google", "Meta"],
  [pid("Arrays & Hashing", "Maximum Subarray")]: ["Amazon", "Microsoft", "Google"],
  [pid("Two Pointers", "Valid Palindrome")]: ["Meta", "Google", "Microsoft"],
  [pid("Two Pointers", "Two Sum II")]: ["Amazon", "Google", "Apple"],
  [pid("Two Pointers", "3Sum")]: ["Amazon", "Meta", "Adobe"],
  [pid("Two Pointers", "Container With Most Water")]: ["Amazon", "Google", "Apple"],
  [pid("Two Pointers", "Trapping Rain Water")]: ["Amazon", "Google", "Microsoft"],
  [pid("Sliding Window", "Longest Substring Without Repeating")]: ["Amazon", "Microsoft", "Meta"],
  [pid("Sliding Window", "Minimum Window Substring")]: ["Meta", "Amazon", "Google"],
  [pid("Sliding Window", "Sliding Window Maximum")]: ["Amazon", "Google", "Meta"],
  [pid("Stack & Queue", "Valid Parentheses")]: ["Amazon", "Google", "Meta"],
  [pid("Stack & Queue", "Min Stack")]: ["Amazon", "Microsoft", "Meta"],
  [pid("Stack & Queue", "Largest Rectangle in Histogram")]: ["Amazon", "Google", "Meta"],
  [pid("Linked Lists", "Reverse Linked List")]: ["Amazon", "Microsoft", "Google"],
  [pid("Linked Lists", "Merge Two Sorted Lists")]: ["Amazon", "Microsoft", "Google"],
  [pid("Linked Lists", "Linked List Cycle")]: ["Amazon", "Microsoft", "Google"],
  [pid("Linked Lists", "LRU Cache")]: ["Amazon", "Google", "Meta", "Microsoft"],
  [pid("Binary Search", "Classic Binary Search")]: ["Amazon", "Google", "Meta"],
  [pid("Binary Search", "Find Minimum in Rotated Sorted Array")]: ["Amazon", "Meta", "Microsoft"],
  [pid("Binary Search", "Search in Rotated Sorted Array")]: ["Amazon", "Meta", "Microsoft"],
  [pid("Binary Search", "Median of Two Sorted Arrays")]: ["Google", "Amazon", "Microsoft"],
  [pid("Trees & BST", "Invert Binary Tree")]: ["Amazon", "Google", "Microsoft"],
  [pid("Trees & BST", "Maximum Depth of Binary Tree")]: ["Amazon", "Google", "Microsoft"],
  [pid("Trees & BST", "Validate Binary Search Tree")]: ["Amazon", "Microsoft", "Meta"],
  [pid("Trees & BST", "Serialize and Deserialize Binary Tree")]: ["Amazon", "Google", "Meta"],
  [pid("Trees & BST", "Binary Tree Maximum Path Sum")]: ["Amazon", "Meta", "Google"],
  [pid("Heap & Priority Queue", "Kth Largest Element in an Array")]: ["Amazon", "Google", "Meta"],
  [pid("Heap & Priority Queue", "Find Median From Data Stream")]: ["Amazon", "Google", "Meta"],
  [pid("Graphs", "Number of Islands")]: ["Amazon", "Google", "Meta", "Microsoft"],
  [pid("Graphs", "Clone Graph")]: ["Amazon", "Google", "Meta"],
  [pid("Graphs", "Course Schedule")]: ["Amazon", "Google", "Meta"],
  [pid("Graphs", "Rotting Oranges")]: ["Amazon", "Google", "Microsoft"],
  [pid("Graphs", "Word Ladder")]: ["Amazon", "Microsoft", "Meta"],
  [pid("Dynamic Programming", "Climbing Stairs")]: ["Amazon", "Google", "Microsoft"],
  [pid("Dynamic Programming", "House Robber")]: ["Amazon", "Microsoft", "Google"],
  [pid("Dynamic Programming", "Coin Change")]: ["Amazon", "Google", "Microsoft"],
  [pid("Dynamic Programming", "Longest Increasing Subsequence")]: ["Amazon", "Google", "Meta"],
  [pid("Dynamic Programming", "Edit Distance")]: ["Amazon", "Microsoft", "Google"],
  [pid("Greedy & Intervals", "Merge Intervals")]: ["Amazon", "Meta", "Microsoft"],
  [pid("Greedy & Intervals", "Jump Game")]: ["Amazon", "Microsoft", "Google"],
  [pid("Backtracking", "Word Search")]: ["Amazon", "Microsoft", "Google"],
  [pid("Backtracking", "N Queens")]: ["Amazon", "Microsoft", "Google"],
  [pid("Bit & Math", "Single Number")]: ["Amazon", "Google", "Microsoft"],
  [pid("Frequency & Counting", "First Missing Positive")]: ["Amazon", "Google", "Microsoft"],
};

export const COMPANIES = Array.from(
  new Set(Object.values(COMPANY_TAGS).flat()),
).sort();

export function companiesFor(problemId: string): string[] {
  return COMPANY_TAGS[problemId] ?? [];
}
