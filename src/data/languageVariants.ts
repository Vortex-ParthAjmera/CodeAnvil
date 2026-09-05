/**
 * Language variants for lab examples — the same algorithm rendered in
 * JavaScript, authored so the line numbers line up with the Python trace
 * (highlight positions stay accurate; end-of-program drift is at most one
 * line). Traces themselves are language-neutral and unchanged.
 */

import { FOUR_SUM_CODE } from "./traces/four-sum";
import { DUTCH_NATIONAL_FLAG_CODE } from "./traces/dutch-national-flag";
import { MAJORITY_VOTE_CODE } from "./traces/majority-vote";
import { FIXED_WINDOW_CODE } from "./traces/sliding-window-fixed";
import { VARIABLE_WINDOW_CODE } from "./traces/sliding-window-variable";
import { PREFIX_SUM_CODE } from "./traces/prefix-sum";
import { DIFFERENCE_ARRAY_CODE } from "./traces/difference-array";
import { TRAPPING_RAIN_WATER_CODE } from "./traces/trapping-rain-water";
import { ROTATE_ARRAY_CODE } from "./traces/rotate-array";
import { MERGE_INTERVALS_CODE } from "./traces/merge-intervals";
import { NEXT_PERMUTATION_CODE } from "./traces/next-permutation";

export type VariantLanguage = "python" | "javascript";

export const LANGUAGE_VARIANTS: Record<string, Record<VariantLanguage, string>> = {
  "sum-array": {
    python: `arr = [4, 7, 1, 9]
total = 0
for i in range(len(arr)):
    total = total + arr[i]
print("Total:", total)`,
    javascript: `const arr = [4, 7, 1, 9];
let total = 0;
for (let i = 0; i < arr.length; i++) total += arr[i];
console.log("Total:", total);`,
  },
  "max-array": {
    python: `arr = [3, 8, 2, 9, 5]
max_val = arr[0]
for i in range(1, len(arr)):
    if arr[i] > max_val:
        max_val = arr[i]
print("Max:", max_val)`,
    javascript: `const arr = [3, 8, 2, 9, 5];
let max = arr[0];
for (let i = 1; i < arr.length; i++) {
  if (arr[i] > max) max = arr[i];
}
console.log("Max:", max);`,
  },
  "min-array": {
    python: `arr = [7, 4, 9, 1, 5]
min_val = arr[0]
min_idx = 0
for i in range(1, len(arr)):
    if arr[i] < min_val:
        min_val = arr[i]
        min_idx = i
print("Min:", min_val)`,
    javascript: `const arr = [7, 4, 9, 1, 5];
let minVal = arr[0];
let minIndex = 0;
for (let i = 1; i < arr.length; i++) {
  if (arr[i] < minVal) {
    minVal = arr[i];
    minIndex = i;
  }
}
console.log("Min:", minVal);`,
  },
  "reverse-array": {
    python: `arr = [9, 3, 7, 1, 5, 2]
left = 0
right = len(arr) - 1
while left < right:
    arr[left], arr[right] = arr[right], arr[left]
    left += 1
    right -= 1
print("Reversed:", arr)`,
    javascript: `const arr = [9, 3, 7, 1, 5, 2];
let left = 0;
let right = arr.length - 1;
while (left < right) {
  [arr[left], arr[right]] = [arr[right], arr[left]];
  left += 1;
  right -= 1;
}
console.log("Reversed:", arr);`,
  },
  kadane: {
    python: `arr = [-2, 1, -3, 4, -1, 2, 1, -5, 4]
current_sum = arr[0]
best_sum = arr[0]
current_start = 0
best_start = best_end = 0
for i in range(1, len(arr)):
    if arr[i] > current_sum + arr[i]:
        current_sum = arr[i]
        current_start = i
    else:
        current_sum = current_sum + arr[i]
    if current_sum > best_sum:
        best_sum = current_sum
        best_start, best_end = current_start, i
print("Max subarray:", best_sum)`,
    javascript: `const arr = [-2, 1, -3, 4, -1, 2, 1, -5, 4];
let currentSum = arr[0];
let bestSum = arr[0];
let currentStart = 0;
let bestStart = 0, bestEnd = 0;
for (let i = 1; i < arr.length; i++) {
  if (arr[i] > currentSum + arr[i]) {
    currentSum = arr[i];
    currentStart = i;
  } else {
    currentSum += arr[i];
  }
  if (currentSum > bestSum) {
    bestSum = currentSum;
    [bestStart, bestEnd] = [currentStart, i];
  }
}
console.log(bestSum);`,
  },
  "two-sum-hash": {
    python: `arr = [4, 7, 1, 8, 3, 6]
target = 10
seen = {}
for i, value in enumerate(arr):
    need = target - value
    if need in seen:
        print(seen[need], i)
        break
    seen[value] = i
else:
    print("No pair")`,
    javascript: `const arr = [4, 7, 1, 8, 3, 6];
const target = 10;
const seen = new Map();
for (let i = 0; i < arr.length; i++) {
  const need = target - arr[i];
  if (seen.has(need)) {
    console.log(seen.get(need), i);
    break;
  }
  seen.set(arr[i], i);
}`,
  },
  "three-sum": {
    python: `arr = [-1, 0, 1, 2, -1, -4, -1]
target = 0
arr.sort()
triplets = []
for i in range(len(arr) - 2):
    if i > 0 and arr[i] == arr[i - 1]:
        continue
    left, right = i + 1, len(arr) - 1
    while left < right:
        total = arr[i] + arr[left] + arr[right]
        if total == target:
            triplets.append([arr[i], arr[left], arr[right]])
            left += 1
            right -= 1
            while left < right and arr[left] == arr[left - 1]:
                left += 1
            while left < right and arr[right] == arr[right + 1]:
                right -= 1
        elif total < target:
            left += 1
        else:
            right -= 1
print(triplets)`,
    javascript: `const arr = [-1, 0, 1, 2, -1, -4, -1];
const target = 0;
arr.sort((a, b) => a - b);
const triplets = [];
for (let i = 0; i < arr.length - 2; i++) {
  if (i > 0 && arr[i] === arr[i - 1]) continue;
  let left = i + 1, right = arr.length - 1;
  while (left < right) {
    const total = arr[i] + arr[left] + arr[right];
    if (total === target) {
      triplets.push([arr[i], arr[left], arr[right]]);
      left += 1;
      right -= 1;
      while (left < right && arr[left] === arr[left - 1]) left += 1;
      while (left < right && arr[right] === arr[right + 1]) right -= 1;
    } else if (total < target) {
      left += 1;
    } else {
      right -= 1;
    }
  }
}
console.log(triplets);`,
  },
  "four-sum": {
    python: FOUR_SUM_CODE,
    javascript: `const arr = [-1, 0, 1, 0, -2, 2, -1, 2];
const target = 0;
arr.sort((a, b) => a - b);
const quadruplets = [];
for (let first = 0; first < arr.length - 3; first++) {
  if (first > 0 && arr[first] === arr[first - 1]) continue;
  for (let second = first + 1; second < arr.length - 2; second++) {
    if (second > first + 1 && arr[second] === arr[second - 1]) continue;
    let left = second + 1, right = arr.length - 1;
    while (left < right) {
      const total = arr[first] + arr[second] + arr[left] + arr[right];
      if (total === target) {
        quadruplets.push([arr[first], arr[second], arr[left], arr[right]]);
        left += 1; right -= 1;
        while (left < right && arr[left] === arr[left - 1]) left += 1;
        while (left < right && arr[right] === arr[right + 1]) right -= 1;
      } else if (total < target) left += 1;
      else right -= 1;
    }
  }
}
console.log(quadruplets);`,
  },
  "dutch-national-flag": {
    python: DUTCH_NATIONAL_FLAG_CODE,
    javascript: `const arr = [2, 0, 2, 1, 1, 0, 2, 0];
if (arr.some((value) => ![0, 1, 2].includes(value))) throw new Error("Use only 0, 1, 2");
let low = 0;
let mid = 0;
let high = arr.length - 1;
while (mid <= high) {
  if (arr[mid] === 0) {
    [arr[low], arr[mid]] = [arr[mid], arr[low]];
    low += 1;
    mid += 1;
  } else if (arr[mid] === 1) {
    mid += 1;
  } else {
    [arr[mid], arr[high]] = [arr[high], arr[mid]];
    high -= 1;
  }
}
console.log(arr);`,
  },
  "majority-vote": {
    python: MAJORITY_VOTE_CODE,
    javascript: `const arr = [2, 2, 1, 1, 1, 2, 2];
let candidate = null;
let balance = 0;
for (const value of arr) {
  if (balance === 0)
    candidate = value;
  if (value === candidate)
    balance += 1;
  else
    balance -= 1; }
const occurrences = arr.filter((value) => value === candidate).length;
if (candidate !== null && occurrences > Math.floor(arr.length / 2))
  console.log("Majority:", candidate);
else
  console.log("No majority element");`,
  },
  "sliding-window-fixed": {
    python: FIXED_WINDOW_CODE,
    javascript: `const arr = [2, 1, 5, 1, 3, 2];
const k = 3;
if (!Number.isInteger(k) || k < 1 || k > arr.length) throw new Error("k must fit inside arr");
let windowSum = 0;
for (let i = 0; i < k; i++)
  windowSum += arr[i];
let bestSum = windowSum;
let bestLeft = 0;
for (let right = k; right < arr.length; right++) {
  windowSum -= arr[right - k];
  windowSum += arr[right];
  const left = right - k + 1;
  if (windowSum > bestSum) {
    bestSum = windowSum;
    bestLeft = left; }
} console.log(bestSum, arr.slice(bestLeft, bestLeft + k));`,
  },
  "sliding-window-variable": {
    python: VARIABLE_WINDOW_CODE,
    javascript: `const arr = [2, 3, 1, 2, 4, 3];
const target = 7;
if (!arr.length || target <= 0 || arr.some((value) => value <= 0)) throw new Error("use positive values");
let left = 0;
let windowSum = 0;
let bestLen = arr.length + 1;
let bestRange = null;
for (let right = 0; right < arr.length; right++) {
  windowSum += arr[right];
  while (windowSum >= target) {
    if (right - left + 1 < bestLen) {
      bestLen = right - left + 1;
      bestRange = [left, right]; }
    windowSum -= arr[left];
    left += 1; } }
const answer = bestRange === null ? 0 : bestLen;
console.log(answer, bestRange);`,
  },
  "prefix-sum": {
    python: PREFIX_SUM_CODE,
    javascript: `const arr = [3, 1, 4, 1, 5, 9];
const left = 1, right = 4;
if (!arr.length || !(0 <= left && left <= right && right < arr.length)) throw new Error("query must fit inside arr");
const prefix = Array(arr.length + 1).fill(0);
for (let i = 0; i < arr.length; i++)
  prefix[i + 1] = prefix[i] + arr[i];
const rangeSum = prefix[right + 1] - prefix[left];
console.log(rangeSum);`,
  },
  "difference-array": {
    python: DIFFERENCE_ARRAY_CODE,
    javascript: `const arr = [2, 1, 3, 2, 4, 1];
const left = 1, right = 4, delta = 3;
if (!arr.length || !(0 <= left && left <= right && right < arr.length)) throw new Error("range must fit inside arr");
const diff = Array(arr.length).fill(0);
diff[0] = arr[0];
for (let i = 1; i < arr.length; i++)
  diff[i] = arr[i] - arr[i - 1];
diff[left] += delta;
if (right + 1 < arr.length) diff[right + 1] -= delta;
const result = Array(arr.length).fill(0);
let running = 0;
for (let i = 0; i < arr.length; i++) {
  running += diff[i];
  result[i] = running;
}
console.log(result);`,
  },
  "trapping-rain-water": {
    python: TRAPPING_RAIN_WATER_CODE,
    javascript: `const height = [3, 0, 2, 0, 4, 1, 2, 1];
if (height.length < 2 || height.some((value) => value < 0)) throw new Error("use non-negative heights");
let left = 0, right = height.length - 1;
let leftMax = 0, rightMax = 0;
let water = 0;
while (left < right) {
  if (height[left] <= height[right]) {
    leftMax = Math.max(leftMax, height[left]);
    water += leftMax - height[left];
    left += 1;
  } else {
    rightMax = Math.max(rightMax, height[right]);
    water += rightMax - height[right];
    right -= 1;
  }
}
console.log(water);`,
  },
  "rotate-array": {
    python: ROTATE_ARRAY_CODE,
    javascript: `const arr = [1, 2, 3, 4, 5, 6];
let k = 2;
if (!arr.length) throw new Error("arr must not be empty");
if (!Number.isInteger(k)) throw new Error("k must be an integer");
k = ((k % arr.length) + arr.length) % arr.length;
function reverseRange(a, left, right) {
  while (left < right) {
    [a[left], a[right]] = [a[right], a[left]];
    left += 1; right -= 1;
  }
}
reverseRange(arr, 0, arr.length - 1);
reverseRange(arr, 0, k - 1);
reverseRange(arr, k, arr.length - 1);
console.log(arr);`,
  },
  "merge-intervals": {
    python: MERGE_INTERVALS_CODE,
    javascript: `const intervals = [[8, 10], [1, 3], [2, 6], [15, 18], [9, 12]];
if (!intervals.length) throw new Error("intervals must not be empty");
for (const [start, end] of intervals)
  if (start > end) throw new Error("start must not exceed end");
intervals.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
const merged = [[...intervals[0]]];
for (const [start, end] of intervals.slice(1)) {
  const last = merged[merged.length - 1];
  if (start <= last[1])
    last[1] = Math.max(last[1], end);
  else
    merged.push([start, end]);
}
console.log(merged);`,
  },
  "next-permutation": {
    python: NEXT_PERMUTATION_CODE,
    javascript: `const arr = [1, 3, 5, 4, 2];
if (!arr.length) throw new Error("arr must not be empty");
let pivot = arr.length - 2;
while (pivot >= 0 && arr[pivot] >= arr[pivot + 1])
  pivot -= 1;
if (pivot >= 0) {
  let successor = arr.length - 1;
  while (arr[successor] <= arr[pivot]) successor -= 1;
  [arr[pivot], arr[successor]] = [arr[successor], arr[pivot]];
}
let left = pivot + 1, right = arr.length - 1;
while (left < right) {
  [arr[left], arr[right]] = [arr[right], arr[left]];
  left += 1; right -= 1;
}
console.log(arr);`,
  },
  "factorial-loop": {
    python: `result = 1
for i in range(1, 6):
    result = result * i
print("Factorial:", result)`,
    javascript: `let result = 1;
for (let i = 1; i <= 5; i++) result *= i;
console.log("Factorial:", result);`,
  },
  "bubble-sort": {
    python: `arr = [5, 2, 8, 1]
n = len(arr)
for i in range(n - 1):
    for j in range(n - 1 - i):
        if arr[j] > arr[j + 1]:
            arr[j], arr[j + 1] = arr[j + 1], arr[j]
print(arr)`,
    javascript: `const arr = [5, 2, 8, 1];
const n = arr.length;
for (let i = 0; i < n - 1; i++) {
  for (let j = 0; j < n - 1 - i; j++) {
    if (arr[j] > arr[j + 1]) {
      [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
    }
  }
}
console.log(arr);`,
  },
  "selection-sort": {
    python: `arr = [6, 3, 8, 2, 9]
n = len(arr)
for i in range(n - 1):
    min_idx = i
    for j in range(i + 1, n):
        if arr[j] < arr[min_idx]:
            min_idx = j
    arr[i], arr[min_idx] = arr[min_idx], arr[i]
print(arr)`,
    javascript: `const arr = [6, 3, 8, 2, 9];
const n = arr.length;
for (let i = 0; i < n - 1; i++) {
  let minIdx = i;
  for (let j = i + 1; j < n; j++) {
    if (arr[j] < arr[minIdx]) minIdx = j;
  }
  [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
}
console.log(arr);`,
  },
  "insertion-sort": {
    python: `arr = [5, 2, 8, 1]
n = len(arr)
for i in range(1, n):
    j = i
    while j > 0 and arr[j - 1] > arr[j]:
        arr[j], arr[j - 1] = arr[j - 1], arr[j]
        j -= 1
print(arr)`,
    javascript: `const arr = [5, 2, 8, 1];
const n = arr.length;
for (let i = 1; i < n; i++) {
  let j = i;
  while (j > 0 && arr[j - 1] > arr[j]) {
    [arr[j], arr[j - 1]] = [arr[j - 1], arr[j]];
    j -= 1;
  }
}
console.log(arr);`,
  },
  "quick-sort": {
    python: `arr = [9, 3, 7, 1, 8, 2]
def partition(a, lo, hi):
    pivot = a[hi]
    i = lo
    for j in range(lo, hi):
        if a[j] < pivot:
            a[i], a[j] = a[j], a[i]
            i += 1
    a[i], a[hi] = a[hi], a[i]
    return i
print(arr)`,
    javascript: `const arr = [9, 3, 7, 1, 8, 2];
function partition(a, lo, hi) {
  const pivot = a[hi];
  let i = lo;
  for (let j = lo; j < hi; j++) {
    if (a[j] < pivot) {
      [a[i], a[j]] = [a[j], a[i]];
      i += 1;
    }
  }
  [a[i], a[hi]] = [a[hi], a[i]];
  return i;
}
console.log(arr);`,
  },
  "merge-sort": {
    python: `arr = [8, 3, 5, 1, 9, 2]
def merge(a, lo, mid, hi):
    tmp = []
    i, j = lo, mid + 1
    while i <= mid and j <= hi:
        if a[i] <= a[j]:
            tmp.append(a[i]); i += 1
        else:
            tmp.append(a[j]); j += 1
    a[lo:hi + 1] = tmp
print(arr)`,
    javascript: `const arr = [8, 3, 5, 1, 9, 2];
function merge(a, lo, mid, hi) {
  const tmp = [];
  let i = lo, j = mid + 1;
  while (i <= mid && j <= hi) {
    if (a[i] <= a[j]) tmp.push(a[i++]);
    else tmp.push(a[j++]);
  }
  for (let k = 0; k < tmp.length; k++) a[lo + k] = tmp[k];
}
console.log(arr);`,
  },
  palindrome: {
    python: `s = "racecar"
l, r = 0, len(s) - 1
while l < r:
    if s[l] != s[r]:
        print("Not a palindrome")
        break
    l += 1
    r -= 1
else:
    print("Palindrome!")`,
    javascript: `const s = "racecar";
let l = 0, r = s.length - 1;
while (l < r) {
  if (s[l] !== s[r]) {
    console.log("Not a palindrome");
    break;
  }
  l += 1;
  r -= 1;
}
console.log("Palindrome!");`,
  },
  "two-sum": {
    python: `arr = [2, 7, 11, 15]
target = 9
l, r = 0, len(arr) - 1
while l < r:
    s = arr[l] + arr[r]
    if s == target:
        print(l, r)
        break
    elif s < target:
        l += 1
    else:
        r -= 1`,
    javascript: `const arr = [2, 7, 11, 15];
const target = 9;
let l = 0, r = arr.length - 1;
while (l < r) {
  const s = arr[l] + arr[r];
  if (s === target) {
    console.log(l, r);
    break;
  } else if (s < target) {
    l += 1;
  } else {
    r -= 1;
  }
}`,
  },
  "binary-search": {
    python: `arr = [1, 3, 5, 7, 9, 11]
target = 7
low, high = 0, len(arr) - 1
while low <= high:
    mid = (low + high) // 2
    if arr[mid] == target:
        print("Found at", mid)
        break
    elif arr[mid] < target:
        low = mid + 1
    else:
        high = mid - 1`,
    javascript: `const arr = [1, 3, 5, 7, 9, 11];
const target = 7;
let low = 0, high = arr.length - 1;
while (low <= high) {
  const mid = Math.floor((low + high) / 2);
  if (arr[mid] === target) {
    console.log("Found at", mid);
    break;
  } else if (arr[mid] < target) {
    low = mid + 1;
  } else {
    high = mid - 1;
  }
}`,
  },
};
