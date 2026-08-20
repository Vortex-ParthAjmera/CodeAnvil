import { describe, expect, it } from "vitest";
import { detectAndGenerate, detectLanguage, extractNumberArray, normalizeLanguageHint } from "./detect";
import { traceIsValid } from "./validateTrace";

describe("detectLanguage", () => {
  it("detects python", () => {
    expect(detectLanguage("def f():\n    pass")).toBe("python");
  });
  it("detects javascript", () => {
    expect(detectLanguage("function f() { return 1; }")).toBe("javascript");
    expect(detectLanguage("const x = 1; console.log(x);")).toBe("javascript");
  });
  it("detects common compiled and scripting languages", () => {
    expect(detectLanguage("#include <iostream>\nint main() { std::cout << 1; }")).toBe("c++");
    expect(detectLanguage("package main\nfunc main() { fmt.Println(1) }")).toBe("go");
    expect(detectLanguage("fn main() { let mut total = 0; println!(\"{}\", total); }")).toBe("rust");
    expect(detectLanguage("public class Main { public static void main(String[] a) {} }")).toBe("java");
  });

  it("normalizes user-facing language choices", () => {
    expect(normalizeLanguageHint("Auto")).toBeUndefined();
    expect(normalizeLanguageHint("JS")).toBe("javascript");
    expect(normalizeLanguageHint("cpp")).toBe("c++");
    expect(normalizeLanguageHint("CSharp")).toBe("c#");
  });
});

describe("extractNumberArray", () => {
  it("extracts a numeric array literal", () => {
    expect(extractNumberArray("arr = [3, 8, 2, 9, 5]")).toEqual([3, 8, 2, 9, 5]);
  });
  it("returns null when no numeric list is present", () => {
    expect(extractNumberArray("print('hi')")).toBeNull();
  });
});

describe("detectAndGenerate — recognized patterns", () => {
  it("detects sum of array and generates a valid trace", () => {
    const res = detectAndGenerate(
      "arr = [1, 2, 3]\ntotal = 0\nfor i in range(len(arr)):\n    total = total + arr[i]\nprint(total)",
    );
    expect(res.kind).toBe("sum-array");
    expect(res.confidence).toBeGreaterThan(0.8);
    expect(res.trace).toBeDefined();
    expect(traceIsValid(res.trace!)).toBe(true);
  });

  it("detects factorial recursion", () => {
    const res = detectAndGenerate(
      "def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)\n\nprint(fact(4))",
    );
    expect(res.kind).toBe("factorial-recursion");
    expect(res.trace?.steps.length).toBeGreaterThan(5);
    expect(traceIsValid(res.trace!)).toBe(true);
  });

  it("detects fibonacci recursion with the 15-call explosion", () => {
    const res = detectAndGenerate(
      "def fib(n):\n    if n <= 1:\n        return n\n    return fib(n - 1) + fib(n - 2)\n\nprint(fib(5))",
    );
    expect(res.kind).toBe("fibonacci-recursion");
    expect(res.trace?.steps.length).toBeGreaterThan(40);
  });

  it("detects binary search", () => {
    const res = detectAndGenerate(
      "arr = [1, 3, 5, 7, 9, 11]\ntarget = 7\nlow = 0\nhigh = len(arr) - 1\nwhile low <= high:\n    mid = (low + high) // 2\n    if arr[mid] == target:\n        print('found')\n        break",
    );
    expect(res.kind).toBe("binary-search");
    expect(res.trace).toBeDefined();
  });

  it("detects bubble sort", () => {
    const res = detectAndGenerate(
      "arr = [5, 2, 8, 1]\nn = len(arr)\nfor i in range(n - 1):\n    for j in range(n - 1 - i):\n        if arr[j] > arr[j + 1]:\n            arr[j], arr[j + 1] = arr[j + 1], arr[j]",
    );
    expect(res.kind).toBe("bubble-sort");
    const last = res.trace?.steps[res.trace.steps.length - 1];
    expect(last?.event).toBe("program_end");
  });

  it("detects selection sort and keeps it off the bubble-specific path", () => {
    const res = detectAndGenerate(
      "arr = [6, 3, 8, 2, 9]\nn = len(arr)\nfor i in range(n - 1):\n    min_idx = i\n    for j in range(i + 1, n):\n        if arr[j] < arr[min_idx]:\n            min_idx = j\n    arr[i], arr[min_idx] = arr[min_idx], arr[i]\nprint(arr)",
    );
    expect(res.kind).toBe("selection-sort");
    expect(res.trace).toBeDefined();
    expect(traceIsValid(res.trace!)).toBe(true);
    expect(res.trace!.steps[0].variables.algorithm).toBe("selection-sort");
  });

  it("detects insertion sort", () => {
    const res = detectAndGenerate(
      "arr = [5, 2, 8, 1]\nn = len(arr)\nfor i in range(1, n):\n    key = arr[i]\n    j = i\n    while j > 0 and arr[j - 1] > arr[j]:\n        arr[j], arr[j - 1] = arr[j - 1], arr[j]\n        j -= 1\nprint(arr)",
    );
    expect(res.kind).toBe("insertion-sort");
    expect(res.trace).toBeDefined();
    expect(traceIsValid(res.trace!)).toBe(true);
  });

  it("honors a user-selected language while keeping detected language visible", () => {
    const res = detectAndGenerate(
      "arr = [1, 2, 3]\ntotal = 0\nfor i in range(len(arr)):\n    total = total + arr[i]\nprint(total)",
      { languageHint: "c++" },
    );
    expect(res.kind).toBe("sum-array");
    expect(res.language).toBe("c++");
    expect(res.detectedLanguage).toBe("python");
    expect(res.requestedLanguage).toBe("c++");
    expect(res.trace?.language).toBe("c++");
    expect(res.validation?.errors).toEqual([]);
  });

  it("detects max of array in javascript", () => {
    const res = detectAndGenerate(
      "function maxOf(arr) {\n  let max = arr[0];\n  for (let i = 1; i < arr.length; i++) {\n    if (arr[i] > max) max = arr[i];\n  }\n  return max;\n}",
    );
    expect(res.kind).toBe("max-array");
    expect(res.language).toBe("javascript");
  });

  it("detects two-sum (hash map) from the exact pasted code", () => {
    const res = detectAndGenerate(`def two_sum(nums: list[int], target: int) -> list[int]:
    seen_numbers = {}
    
    for current_index, current_num in enumerate(nums):
        complement = target - current_num
        
        if complement in seen_numbers:
            return [seen_numbers[complement], current_index]
        
        seen_numbers[current_num] = current_index
        
    return []

if __name__ == "__main__":
    sample_array = [2, 7, 11, 15]
    sample_target = 9
    
    result = two_sum(sample_array, sample_target)
    print(result)`);
    expect(res.kind).toBe("two-sum");
    expect(res.language).toBe("python");
    expect(res.confidence).toBeGreaterThan(0.8);
    expect(res.trace).toBeDefined();
    expect(traceIsValid(res.trace!)).toBe(true);

    const steps = res.trace!.steps;
    expect(steps.length).toBeGreaterThan(8);
    const last = steps[steps.length - 1];
    expect(last.event).toBe("program_end");
    expect(last.output).toContain("[0, 1]");

    // The found pair is highlighted in the 3D bars with a "found" role.
    const foundStep = steps.find((s) =>
      s.memory?.[0]?.highlights.some(
        (h) => "index" in h && h.role === "found",
      ),
    );
    expect(foundStep).toBeDefined();
    // The hash map grows visibly: seen = {2: 0} before the match.
    const storeStep = steps.find((s) =>
      String(s.variables.seen ?? "").includes("2: 0"),
    );
    expect(storeStep).toBeDefined();
  });

  it("detects two-sum in javascript with a Map", () => {
    const res = detectAndGenerate(`function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      return [seen.get(complement), i];
    }
    seen.set(nums[i], i);
  }
  return [];
}

const nums = [3, 2, 4];
const target = 6;
console.log(twoSum(nums, target));`);
    expect(res.kind).toBe("two-sum");
    expect(res.language).toBe("javascript");
    expect(traceIsValid(res.trace!)).toBe(true);
    expect(res.trace!.steps[res.trace!.steps.length - 1].output).toContain("[1, 2]");
  });
});

describe("detectAndGenerate — fallbacks", () => {
  it("falls back to a storyboard for unknown code", () => {
    const res = detectAndGenerate(
      "def count_vowels(text):\n    count = 0\n    for ch in text:\n        if ch in 'aeiou':\n            count = count + 1\n    return count",
    );
    expect(res.kind).toBe("storyboard");
    expect(res.confidence).toBeLessThan(0.5);
    expect(res.trace).toBeDefined();
    expect(traceIsValid(res.trace!)).toBe(true);
  });

  it("handles empty/trivial input honestly", () => {
    const res = detectAndGenerate("hi");
    expect(res.kind).toBe("storyboard");
    expect(res.trace).toBeUndefined();
  });
});
