import type { TraceDocument } from "../types";

export type CodeLanguageId = "python" | "javascript" | "typescript" | "java" | "cpp" | "c" | "csharp" | "go";

export interface CodeLanguageOption {
  id: CodeLanguageId;
  label: string;
  extension: string;
}

export interface CodeVariant {
  code: string;
  extension: string;
  language: CodeLanguageId;
  label: string;
  lineMap: Record<number, number>;
}

export const codeLanguages: CodeLanguageOption[] = [
  { id: "python", label: "Python", extension: "py" },
  { id: "javascript", label: "JavaScript", extension: "js" },
  { id: "typescript", label: "TypeScript", extension: "ts" },
  { id: "java", label: "Java", extension: "java" },
  { id: "cpp", label: "C++", extension: "cpp" },
  { id: "c", label: "C", extension: "c" },
  { id: "csharp", label: "C#", extension: "cs" },
  { id: "go", label: "Go", extension: "go" },
];

const byId = new Map(codeLanguages.map((language) => [language.id, language]));

function language(id: CodeLanguageId) {
  return byId.get(id) || codeLanguages[0];
}

const variants: Partial<Record<string, Partial<Record<CodeLanguageId, { code: string; lineMap: Record<number, number> }>>>> = {
  "Factorial Recursion": {
    javascript: {
      lineMap: { 2: 2, 3: 2, 4: 3, 6: 6, 7: 7, 8: 8 },
      code: `function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

const n = 4;
const result = factorial(n);
console.log("Factorial:", result);`,
    },
    typescript: {
      lineMap: { 2: 2, 3: 2, 4: 3, 6: 6, 7: 7, 8: 8 },
      code: `function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

const n: number = 4;
const result: number = factorial(n);
console.log("Factorial:", result);`,
    },
    java: {
      lineMap: { 2: 3, 3: 3, 4: 4, 6: 8, 7: 9, 8: 10 },
      code: `class Main {
  static int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
  }

  public static void main(String[] args) {
    int n = 4;
    int result = factorial(n);
    System.out.println("Factorial: " + result);
  }
}`,
    },
    cpp: {
      lineMap: { 2: 4, 3: 4, 4: 5, 6: 9, 7: 10, 8: 11 },
      code: `#include <iostream>
using namespace std;

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    int n = 4;
    int result = factorial(n);
    cout << "Factorial: " << result << endl;
}`,
    },
    c: {
      lineMap: { 2: 4, 3: 4, 4: 5, 6: 9, 7: 10, 8: 11 },
      code: `#include <stdio.h>

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main(void) {
    int n = 4;
    int result = factorial(n);
    printf("Factorial: %d\n", result);
    return 0;
}`,
    },
    csharp: {
      lineMap: { 2: 3, 3: 3, 4: 4, 6: 9, 7: 10, 8: 11 },
      code: `using System;

int Factorial(int n) {
    if (n <= 1) return 1;
    return n * Factorial(n - 1);
}

int n = 4;
int result = Factorial(n);
Console.WriteLine($"Factorial: {result}");`,
    },
    go: {
      lineMap: { 2: 6, 3: 7, 4: 9, 6: 14, 7: 15, 8: 16 },
      code: `package main

import "fmt"

func factorial(n int) int {
    if n <= 1 {
        return 1
    }
    return n * factorial(n - 1)
}

func main() {
    n := 4
    result := factorial(n)
    fmt.Println("Factorial:", result)
}`,
    },
  },
  "Sum Of Array": {
    javascript: {
      lineMap: { 1: 1, 2: 2, 4: 4, 5: 5, 7: 8 },
      code: `const arr = [3, 1, 4, 2];
let total = 0;

for (const value of arr) {
  total += value;
}

console.log(total);`,
    },
    typescript: {
      lineMap: { 1: 1, 2: 2, 4: 4, 5: 5, 7: 8 },
      code: `const arr: number[] = [3, 1, 4, 2];
let total = 0;

for (const value of arr) {
  total += value;
}

console.log(total);`,
    },
    java: {
      lineMap: { 1: 3, 2: 4, 4: 6, 5: 7, 7: 10 },
      code: `class Main {
  public static void main(String[] args) {
    int[] arr = {3, 1, 4, 2};
    int total = 0;

    for (int value : arr) {
      total += value;
    }

    System.out.println(total);
  }
}`,
    },
    cpp: {
      lineMap: { 1: 5, 2: 6, 4: 8, 5: 9, 7: 12 },
      code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> arr = {3, 1, 4, 2};
    int total = 0;

    for (int value : arr) {
        total += value;
    }

    cout << total << endl;
}`,
    },
    c: {
      lineMap: { 1: 5, 2: 6, 4: 8, 5: 9, 7: 12 },
      code: `#include <stdio.h>

int main(void) {
    int arr[] = {3, 1, 4, 2};
    int total = 0;

    for (int i = 0; i < 4; i++) {
        total += arr[i];
    }

    printf("%d\n", total);
    return 0;
}`,
    },
    csharp: {
      lineMap: { 1: 3, 2: 4, 4: 6, 5: 7, 7: 10 },
      code: `using System;

int[] arr = {3, 1, 4, 2};
int total = 0;

foreach (int value in arr) {
    total += value;
}

Console.WriteLine(total);`,
    },
    go: {
      lineMap: { 1: 6, 2: 7, 4: 9, 5: 10, 7: 13 },
      code: `package main

import "fmt"

func main() {
    arr := []int{3, 1, 4, 2}
    total := 0

    for _, value := range arr {
        total += value
    }

    fmt.Println(total)
}`,
    },
  },
  "Bubble Sort": {
    javascript: {
      lineMap: { 1: 1, 3: 3, 4: 4, 5: 5, 6: 6, 8: 10 },
      code: `const arr = [5, 1, 4, 2];

for (let i = 0; i < arr.length; i += 1) {
  for (let j = 0; j < arr.length - i - 1; j += 1) {
    if (arr[j] > arr[j + 1]) {
      [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
    }
  }
}

console.log(arr);`,
    },
    typescript: {
      lineMap: { 1: 1, 3: 3, 4: 4, 5: 5, 6: 6, 8: 10 },
      code: `const arr: number[] = [5, 1, 4, 2];

for (let i = 0; i < arr.length; i += 1) {
  for (let j = 0; j < arr.length - i - 1; j += 1) {
    if (arr[j] > arr[j + 1]) {
      [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
    }
  }
}

console.log(arr);`,
    },
    java: {
      lineMap: { 1: 4, 3: 6, 4: 7, 5: 8, 6: 11, 8: 16 },
      code: `import java.util.Arrays;

class Main {
  public static void main(String[] args) {
    int[] arr = {5, 1, 4, 2};

    for (int i = 0; i < arr.length; i++) {
      for (int j = 0; j < arr.length - i - 1; j++) {
        if (arr[j] > arr[j + 1]) {
          int temp = arr[j];
          arr[j] = arr[j + 1];
          arr[j + 1] = temp;
        }
      }
    }

    System.out.println(Arrays.toString(arr));
  }
}`,
    },
    cpp: {
      lineMap: { 1: 6, 3: 8, 4: 9, 5: 10, 6: 11, 8: 15 },
      code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> arr = {5, 1, 4, 2};

    for (int i = 0; i < arr.size(); i++) {
        for (int j = 0; j < arr.size() - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(arr[j], arr[j + 1]);
            }
        }
    }

    for (int value : arr) cout << value << " ";
}`,
    },
    c: {
      lineMap: { 1: 5, 3: 7, 4: 8, 5: 9, 6: 12, 8: 17 },
      code: `#include <stdio.h>

int main(void) {
    int arr[] = {5, 1, 4, 2};
    int n = 4;

    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }

    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    return 0;
}`,
    },
    csharp: {
      lineMap: { 1: 3, 3: 5, 4: 6, 5: 7, 6: 10, 8: 15 },
      code: `using System;

int[] arr = {5, 1, 4, 2};

for (int i = 0; i < arr.Length; i++) {
    for (int j = 0; j < arr.Length - i - 1; j++) {
        if (arr[j] > arr[j + 1]) {
            int temp = arr[j];
            arr[j] = arr[j + 1];
            arr[j + 1] = temp;
        }
    }
}

Console.WriteLine(string.Join(", ", arr));`,
    },
    go: {
      lineMap: { 1: 6, 3: 8, 4: 9, 5: 10, 6: 11, 8: 16 },
      code: `package main

import "fmt"

func main() {
    arr := []int{5, 1, 4, 2}

    for i := 0; i < len(arr); i++ {
        for j := 0; j < len(arr)-i-1; j++ {
            if arr[j] > arr[j+1] {
                arr[j], arr[j+1] = arr[j+1], arr[j]
            }
        }
    }

    fmt.Println(arr)
}`,
    },
  },
};

export function getTraceCodeVariant(trace: TraceDocument, languageId: CodeLanguageId): CodeVariant {
  const selected = language(languageId);
  if (languageId === "python") {
    return { code: trace.source.code, extension: selected.extension, language: selected.id, label: selected.label, lineMap: {} };
  }

  const variant = variants[trace.title]?.[languageId];
  if (!variant) {
    const python = language("python");
    return { code: trace.source.code, extension: python.extension, language: python.id, label: python.label, lineMap: {} };
  }

  return { code: variant.code, extension: selected.extension, language: selected.id, label: selected.label, lineMap: variant.lineMap };
}

export function lineForLanguage(trace: TraceDocument, languageId: CodeLanguageId, sourceLine: number) {
  const variant = getTraceCodeVariant(trace, languageId);
  return variant.lineMap[sourceLine] || sourceLine;
}
