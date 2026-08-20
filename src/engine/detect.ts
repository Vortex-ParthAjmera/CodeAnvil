/**
 * Universal Code Visualizer (docs/36 — quality tiers).
 *
 * Pasted code is never executed. Instead we detect the language, match common
 * DSA patterns against known signatures, and — for recognized patterns —
 * generate a polished CodeAnvil trace from OUR OWN simulators. Anything else
 * falls back to a structural storyboard with an honest confidence label.
 */

import type { TraceDocument } from "../types/trace";
import { arrayMemory, arrayVisual, buildRecursionTrace, buildSortTrace, TraceBuilder } from "../data/traces/builders";
import { binarySearchSteps, bubbleSortSteps, insertionSortSteps, selectionSortSteps } from "./sim";
import { buildStructuralStoryboard } from "./storyboard";
import { validateTrace } from "./validateTrace";

export type DetectionKind =
  | "sum-array"
  | "max-array"
  | "factorial-loop"
  | "factorial-recursion"
  | "fibonacci-recursion"
  | "binary-search"
  | "bubble-sort"
  | "selection-sort"
  | "insertion-sort"
  | "two-sum"
  | "script";

export interface DetectionResult {
  kind: DetectionKind | "storyboard";
  confidence: number; // 0..1
  language: string;
  trace?: TraceDocument;
  note: string;
  matched: string[];
  detectedLanguage?: string;
  requestedLanguage?: string;
  validation?: {
    errors: string[];
    warnings: string[];
  };
}

export interface DetectionOptions {
  /**
   * "auto" keeps static detection. Any concrete language label is a user hint:
   * the visualizer still pattern-matches safely, but reports the trace under
   * the language the user selected.
   */
  languageHint?: string;
}

const LANGUAGE_SIGNATURES: Array<[string, RegExp]> = [
  ["python", /^\s*(def |from \S+ import |import |print\(|for .* in range|while .*:|class \w+.*:)/m],
  ["typescript", /\b(interface|type)\s+\w+|:\s*(string|number|boolean|unknown)(\[\])?|\bas\s+const\b/],
  ["java", /\bpublic\s+(static\s+)?(class|void)|System\.out\.print|\b(ArrayList|HashMap)</],
  ["c++", /#include\s*<(iostream|vector|bits\/stdc\+\+\.h)>|\bstd::|\b(vector|string|unordered_map)<|cout\s*<</],
  ["c", /#include\s*<(stdio|stdlib|string)\.h>|\bprintf\s*\(|\bmalloc\s*\(|\bstruct\s+\w+\s*\{/],
  ["c#", /\busing\s+System;|Console\.Write(Line)?|\bnamespace\s+\w+|\bList<.*>/],
  ["go", /^\s*package\s+main|\bfunc\s+\w+\s*\(|fmt\.Print/m],
  ["rust", /\bfn\s+\w+\s*\(|\blet\s+mut\b|println!|Vec<.*>/],
  ["kotlin", /\bfun\s+\w+\s*\(|\bval\s+\w+|println\s*\(|mutableListOf/],
  ["swift", /\bfunc\s+\w+\s*\(|\b(var|let)\s+\w+\s*:\s*\w+|\[Int\]/],
  ["ruby", /^\s*(def\s+\w+|puts\s+|class\s+\w+|\w+\.each\s+do)/m],
  ["php", /<\?php|\$\w+\s*=|echo\s+/],
  ["dart", /\bvoid\s+main\s*\(|\bfinal\s+\w+|List<.*>|print\s*\(/],
  ["r", /\w+\s*<-\s*(function\s*\(|c\s*\()|\blibrary\s*\(\s*\w+\s*\)/],
  ["lua", /\blocal\s+\w+|\bfunction\s+\w+\s*\([^)]*\)[\s\S]*\bend\b/],
  ["javascript", /(function\s+|\b(const|let|var)\s+\w+|=>|console\.log|Math\.)/],
];

export function detectLanguage(code: string): string {
  const trimmed = code.trim();
  for (const [language, signature] of LANGUAGE_SIGNATURES) {
    if (signature.test(trimmed)) return language;
  }
  return "unknown";
}

export function normalizeLanguageHint(language?: string): string | undefined {
  const raw = language?.trim().toLowerCase();
  if (!raw || raw === "auto" || raw === "auto / unknown") return undefined;
  const aliases: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    cpp: "c++",
    "c-plus-plus": "c++",
    csharp: "c#",
    cs: "c#",
    golang: "go",
    rs: "rust",
    story: "story-script",
    script: "story-script",
  };
  return aliases[raw] ?? raw;
}

function resolveLanguage(code: string, options?: DetectionOptions) {
  const detectedLanguage = detectLanguage(code);
  const requestedLanguage = normalizeLanguageHint(options?.languageHint);
  return {
    detectedLanguage,
    requestedLanguage,
    language: requestedLanguage ?? detectedLanguage,
  };
}

function validationSummary(trace: TraceDocument) {
  const issues = validateTrace(trace);
  return {
    errors: issues.filter((issue) => issue.level === "error").map((issue) => issue.message),
    warnings: issues.filter((issue) => issue.level === "warning").map((issue) => issue.message),
  };
}

function traceWithLanguage(trace: TraceDocument, language: string): TraceDocument {
  return trace.language === language ? trace : { ...trace, language };
}

/** Extracts the first array literal of numbers, e.g. `arr = [3, 8, 2, 9, 5]`. */
export function extractNumberArray(code: string): number[] | null {
  const m = code.match(/\[([\d\s,.\-]+)\]/);
  if (!m) return null;
  const values = m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number);
  return values.length >= 2 && values.every(Number.isFinite) ? values : null;
}

function extractCallArg(code: string, fn: string): number | null {
  const m = code.match(new RegExp(`(?:${fn})\s*\(\s*(\d+)\s*\)`));
  const n = m ? Number(m[1]) : NaN; return Number.isFinite(n) ? n : null;
}

/** Extracts the two-sum target from `target = N`, `sample_target = N`, or a call arg. */
function extractTarget(code: string): number | null {
  const m =
    code.match(/\b[a-z_]*target[a-z_]*\s*=\s*(\d+)/i) ||
    code.match(/\btwo\s*[_\- ]?sum\w*\s*\([^,\n]*,\s*(\d+)\s*\)/i);
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** First line (1-based) matching a pattern, or a fallback. */
function lineOf(code: string, pattern: RegExp, fallback: number): number {
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) return i + 1;
  }
  return fallback;
}

/** Last line (1-based) matching a pattern, or null. */
function lastLineOf(code: string, pattern: RegExp): number | null {
  const lines = code.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    if (pattern.test(lines[i])) return i + 1;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Pattern signatures                                                  */
/* ------------------------------------------------------------------ */

const SIG = {
  fibRecursion: (code: string) =>
    /\bfib(?:onacci)?\s*\(/.test(code) &&
    /n\s*-\s*1/.test(code) &&
    /n\s*-\s*2/.test(code),

  factRecursion: (code: string) =>
    (/\b(def|function)\s+(fact|factorial)\b/.test(code) ||
      /\b(fact|factorial)\s*\(/.test(code)) &&
    /n\s*-\s*1/.test(code) &&
    /(fact|factorial)\s*\(/.test(code),

  factLoop: (code: string) =>
    /(fact|factorial)\w*\s*\(/.test(code) &&
    /range\s*\(\s*1\s*,/.test(code) &&
    /\*=\s*i|result\s*=\s*result\s*\*\s*i|\*=\s*[a-z]/.test(code),

  sumArray: (code: string) =>
    /(total|sum|result|\bs\b)\s*(\+=|=)\s*((total|sum|result|\bs\b)\s*\+)?\s*arr\s*\[\s*i\s*\]|sum\s*\+=\s*arr\[i\]/.test(code),

  maxArray: (code: string) =>
    /(max_val|max_value|maximum|max|\bmx\b|\bbest\b|largest|\bm\b)\s*=\s*arr\s*\[\s*0\s*\]|arr\s*\[\s*i\s*\]\s*>\s*(max_val|max_value|maximum|max|\bmx\b|\bbest\b|largest|\bm\b)/.test(code),

  binarySearch: (code: string) =>
    /(while|for)\s+(low|lo)\s*<=\s*(high|hi)/.test(code) &&
    /mid\s*=\s*(\()?\s*\(\s*(low|lo)\s*\+\s*(high|hi)\s*\)/.test(code),

  bubbleSort: (code: string) =>
    (/for\s+j\s+in\s+range\s*\(\s*(n|arr\.length)\s*-\s*1\s*-\s*i\s*\)/.test(code) ||
      /for\s*\(.*j.*<\s*(n|arr\.length)\s*-\s*1\s*-\s*i/.test(code)) &&
    /arr\s*\[\s*j\s*\]\s*>\s*arr\s*\[\s*j\s*\+\s*1\s*\]/.test(code),

  selectionSort: (code: string) =>
    /\b(min_idx|minIndex|min_index|minimum)\b/.test(code) &&
    /arr\s*\[\s*j\s*\]\s*<\s*arr\s*\[\s*(min_idx|minIndex|min_index|minimum)\s*\]/.test(code) &&
    /arr\s*\[\s*i\s*\][\s\S]*arr\s*\[\s*(min_idx|minIndex|min_index|minimum)\s*\]/.test(code),

  insertionSort: (code: string) =>
    (/\binsertion\s*sort\b/i.test(code) ||
      (/\b(key|current)\b/.test(code) && /while\b[^\n]*(j|i)\s*>\s*0/.test(code))) &&
    (/arr\s*\[\s*j\s*-\s*1\s*\]\s*>\s*(key|arr\s*\[\s*j\s*\])/.test(code) ||
      /arr\s*\[\s*j\s*\]\s*=\s*arr\s*\[\s*j\s*-\s*1\s*\]/.test(code)),

  /** Two Sum with a hash map: `complement in seen`, `map.has(complement)`, etc. */
  twoSumHash: (code: string) => {
    const named = /\btwo\s*[_\- ]?sum\b/i.test(code);
    const hasComplement = /\b(complement|difference|needed|need)\b/i.test(code);
    const mapName = /\b(seen_numbers|seen_map|hashmap|hash_map|seen|memo|dict|map|table)\b/i;
    const hasMap =
      mapName.test(code) ||
      /new\s+Map/.test(code) ||
      /=\s*\{\}/.test(code) ||
      /defaultdict/.test(code);
    const membership = new RegExp(
      `(?:in\\s+${mapName.source}|\\b${mapName.source}[.\\s]*(?:\\[\\s*complement|get\\s*\\(\\s*complement|has\\s*\\(\\s*complement))`,
      "i",
    ).test(code);
    return (named || hasComplement) && hasMap && membership;
  },
};

/* ------------------------------------------------------------------ */
/* Trace generators (schema-conformant, generated live)                */
/* ------------------------------------------------------------------ */

function clampLines(trace: TraceDocument, sourceLines: number): TraceDocument {
  return {
    ...trace,
    source: { ...trace.source },
    steps: trace.steps.map((s) => ({
      ...s,
      line: Math.min(Math.max(s.line, 1), sourceLines),
    })),
  };
}

function sumTrace(values: number[], code: string): TraceDocument {
  const b = new TraceBuilder({
    title: "Sum of Array (generated)",
    code,
    topic: "arrays",
    difficulty: "beginner",
    language: detectLanguage(code),
    durationSeconds: 60,
  });
  const arr = () =>
    arrayMemory("arr", "arr", values, [
      { index: 0, role: "reading" },
    ]);
  b.step({
    line: 1,
    event: "program_start",
    description: "Initialize total = 0.",
    variables: { total: 0, arr: `[${values.join(", ")}]` },
    memory: [arr()],
    visual: arrayVisual("arr"),
    changed: { variables: ["total"] },
  });
  let total = 0;
  values.forEach((v, i) => {
    b.step({
      line: 2,
      event: "loop_iteration",
      description: `i = ${i}. Read arr[${i}] = ${v}.`,
      variables: { total, i, arr: `[${values.join(", ")}]` },
      memory: [arrayMemory("arr", "arr", values, [{ index: i, role: "reading" }])],
      visual: arrayVisual("arr"),
      changed: { variables: ["i"] },
    });
    total += v;
    b.step({
      line: 3,
      event: "assignment",
      description: `total = ${total - v} + ${v} = ${total}.`,
      variables: { total, i, arr: `[${values.join(", ")}]` },
      memory: [arrayMemory("arr", "arr", values, [{ index: i, role: "reading" }])],
      visual: arrayVisual("arr"),
      changed: { variables: ["total"] },
    });
  });
  b.step({
    line: 4,
    event: "output_write",
    description: `print("Total:", total) writes: Total: ${total}`,
    variables: { total, arr: `[${values.join(", ")}]` },
    output: `Total: ${total}`,
    memory: [arrayMemory("arr", "arr", values)],
    visual: arrayVisual("arr"),
    changed: { output: true },
  });
  b.step({
    line: 4,
    event: "program_end",
    description: `Program finished. Sum of the array is ${total}.`,
    variables: { total, arr: `[${values.join(", ")}]` },
    output: `Total: ${total}`,
    memory: [arrayMemory("arr", "arr", values)],
    visual: arrayVisual("arr"),
  });
  b.prompt({
    stepId: `step-${String(2 * values.length + 1).padStart(3, "0")}`,
    type: "predict_variable",
    question: `What is the final value of total after adding all ${values.length} elements?`,
    target: { variable: "total" },
    answer: String(total),
    choices: [String(total), String(total - values[values.length - 1]), "0", String(values[0])],
    explanation: `Each element is added once: ${values.join(" + ")} = ${total}.`,
  });
  return b.build();
}

function maxTrace(values: number[], code: string): TraceDocument {
  const b = new TraceBuilder({
    title: "Max in Array (generated)",
    code,
    topic: "arrays",
    difficulty: "beginner",
    language: detectLanguage(code),
    durationSeconds: 60,
  });
  b.step({
    line: 1,
    event: "program_start",
    description: `Start with the first element as the maximum: max_val = ${values[0]}.`,
    variables: { max_val: values[0], arr: `[${values.join(", ")}]` },
    memory: [arrayMemory("arr", "arr", values, [{ index: 0, role: "max" }])],
    visual: arrayVisual("arr"),
    changed: { variables: ["max_val"] },
  });
  let max = values[0];
  let maxIdx = 0;
  for (let i = 1; i < values.length; i++) {
    const v = values[i];
    const prevMax = max;
    const update = v > max;
    b.step({
      line: 2,
      event: "loop_iteration",
      description: `i = ${i}. Compare arr[${i}] = ${v} with max_val = ${max}.`,
      variables: { max_val: max, i, arr: `[${values.join(", ")}]` },
      memory: [
        arrayMemory("arr", "arr", values, [
          { index: i, role: "reading" },
          { index: maxIdx, role: "max" },
        ]),
      ],
      visual: arrayVisual("arr"),
      changed: { variables: ["i"] },
    });
    if (update) {
      max = v;
      maxIdx = i;
      b.step({
        line: 3,
        event: "assignment",
        description: `${v} > ${prevMax} → new maximum: max_val = ${v}.`,
        variables: { max_val: max, i, arr: `[${values.join(", ")}]` },
        memory: [
          arrayMemory("arr", "arr", values, [
            { index: i, role: "max" },
            { index: i, role: "reading" },
          ]),
        ],
        visual: arrayVisual("arr"),
        changed: { variables: ["max_val"] },
      });
    }
  }
  b.step({
    line: 4,
    event: "output_write",
    description: `The maximum value in the array is ${max}.`,
    variables: { max_val: max, arr: `[${values.join(", ")}]` },
    output: `Max: ${max}`,
    memory: [arrayMemory("arr", "arr", values)],
    visual: arrayVisual("arr"),
    changed: { output: true },
  });
  b.step({
    line: 4,
    event: "program_end",
    description: `Program finished. max_val = ${max}.`,
    variables: { max_val: max, arr: `[${values.join(", ")}]` },
    output: `Max: ${max}`,
    memory: [arrayMemory("arr", "arr", values)],
    visual: arrayVisual("arr"),
  });
  return b.build();
}

function factorialLoopTrace(n: number, code: string): TraceDocument {
  const b = new TraceBuilder({
    title: "Factorial (generated)",
    code,
    topic: "loops",
    difficulty: "beginner",
    language: detectLanguage(code),
    durationSeconds: 60,
  });
  b.step({
    line: 1,
    event: "program_start",
    description: `Initialize result = 1, then multiply by every integer from 1 to ${n}.`,
    variables: { result: 1, n },
    changed: { variables: ["result"] },
  });
  let result = 1;
  for (let i = 1; i <= n; i++) {
    result *= i;
    b.step({
      line: 2,
      event: "loop_iteration",
      description: `i = ${i}. result = ${result / i} × ${i} = ${result}.`,
      variables: { result, i, n },
      changed: { variables: ["result", "i"] },
    });
  }
  b.step({
    line: 4,
    event: "output_write",
    description: `print("Factorial:", result) writes: Factorial: ${result}`,
    variables: { result, n },
    output: `Factorial: ${result}`,
    changed: { output: true },
  });
  b.step({
    line: 4,
    event: "program_end",
    description: `${n}! = ${result}.`,
    variables: { result, n },
    output: `Factorial: ${result}`,
  });
  return b.build();
}

function searchTrace(values: number[], target: number, code: string): TraceDocument {
  const steps = binarySearchSteps(values, target);
  const b = new TraceBuilder({
    title: "Binary Search (generated)",
    code,
    topic: "searching",
    difficulty: "intermediate",
    language: detectLanguage(code),
    durationSeconds: 90,
  });
  steps.forEach((s, i) => {
    const highlights = [];
    for (let j = 0; j < s.array.length; j++) {
      if (s.mid === j) highlights.push({ index: j, role: "mid" });
      else if (j >= s.low && j <= s.high) highlights.push({ index: j, role: "range" });
      else highlights.push({ index: j, role: "out" });
    }
    b.step({
      line: i === 0 ? 1 : i % 2 === 0 ? 4 : 5,
      event: i === 0 ? "program_start" : s.status === "found" ? "comparison" : i === steps.length - 1 ? "program_end" : "line_enter",
      description: s.description,
      variables: { target, low: s.low, high: s.high, mid: s.mid ?? "—", probes: s.probes },
      memory: [arrayMemory("arr", "arr", s.array, highlights)],
      visual: arrayVisual("arr"),
      changed: { variables: ["low", "high", "mid", "probes"] },
    });
  });
  return b.build();
}

function tagAlgorithm(trace: TraceDocument, algorithm: string): TraceDocument {
  return {
    ...trace,
    steps: trace.steps.map((step) => ({
      ...step,
      variables: { ...step.variables, algorithm },
    })),
  };
}

function bubbleTrace(values: number[], code: string): TraceDocument {
  return buildSortTrace(
    {
      title: "Bubble Sort (generated)",
      code,
      topic: "sorting",
      difficulty: "intermediate",
      language: detectLanguage(code),
      durationSeconds: 120,
      lines: { setup: 1, compare: 5, swap: 6, settled: 4, done: 7 },
    },
    bubbleSortSteps(values),
  );
}

function selectionTrace(values: number[], code: string): TraceDocument {
  const done = lastLineOf(code, /(print\s*\(|console\.(log|print)|println\s*\()/i) ?? code.split("\n").length;
  return tagAlgorithm(
    buildSortTrace(
      {
        title: "Selection Sort (generated)",
        code,
        topic: "sorting",
        difficulty: "intermediate",
        language: detectLanguage(code),
        durationSeconds: 120,
        lines: {
          setup: lineOf(code, /\[[\d\s,.\-]+\]/, 1),
          compare: lineOf(code, /arr\s*\[\s*j\s*\]\s*<\s*arr\s*\[\s*(min_idx|minIndex|min_index|minimum)\s*\]/, 6),
          swap: lineOf(code, /arr\s*\[\s*i\s*\][\s\S]*arr\s*\[\s*(min_idx|minIndex|min_index|minimum)\s*\]/, 8),
          settled: lineOf(code, /\b(min_idx|minIndex|min_index|minimum)\b/, 4),
          done,
        },
      },
      selectionSortSteps(values),
    ),
    "selection-sort",
  );
}

function insertionTrace(values: number[], code: string): TraceDocument {
  const done = lastLineOf(code, /(print\s*\(|console\.(log|print)|println\s*\()/i) ?? code.split("\n").length;
  return tagAlgorithm(
    buildSortTrace(
      {
        title: "Insertion Sort (generated)",
        code,
        topic: "sorting",
        difficulty: "intermediate",
        language: detectLanguage(code),
        durationSeconds: 120,
        lines: {
          setup: lineOf(code, /\[[\d\s,.\-]+\]/, 1),
          compare: lineOf(code, /while\b|arr\s*\[\s*j\s*-\s*1\s*\]\s*>/, 5),
          swap: lineOf(code, /arr\s*\[\s*j\s*\][\s\S]*arr\s*\[\s*j\s*-\s*1\s*\]/, 6),
          settled: lineOf(code, /\b(key|current)\b/, 4),
          done,
        },
      },
      insertionSortSteps(values),
    ),
    "insertion-sort",
  );
}

/**
 * Two Sum (hash map) trace — simulates the classic algorithm on OUR side:
 * walk the array, compute complement = target − value, and check the map.
 * The map's growth is narrated in variables (`seen = {2: 0, ...}`) while the
 * 3D bars highlight the current read and then glow on the found pair.
 */
function twoSumTrace(values: number[], target: number, code: string): TraceDocument {
  const b = new TraceBuilder({
    title: "Two Sum (Hash Map) — generated",
    code,
    topic: "arrays",
    difficulty: "intermediate",
    language: detectLanguage(code),
    durationSeconds: 90,
  });

  const seen = new Map<number, number>();
  const seenText = () =>
    seen.size === 0
      ? "{}"
      : "{" + [...seen.entries()].map(([k, v]) => `${k}: ${v}`).join(", ") + "}";
  const memory = (highlights: { index: number; role: string }[] = []) => [
    arrayMemory("nums", "nums", values, highlights),
  ];
  const vars = (extra: Record<string, unknown>) => ({
    target,
    nums: `[${values.join(", ")}]`,
    seen: seenText(),
    ...extra,
  });

  const initLine = lineOf(code, /(=\s*\{\}|new\s+Map|defaultdict|HashMap)/, 2);
  const loopLine = lineOf(code, /for\b.*(enumerate|in\s+\w+|of\s+\w+|for\s*\()/i, 4);
  const compLine = lineOf(code, /\b\w+\s*=\s*target\s*-\s*\w+/, 5);
  const checkLine = lineOf(
    code,
    /(if|while)\b.*(in\s+\w*(seen|map|hash|dict)|(\.has|\[)\s*\w*complement)/i,
    7,
  );
  const insLine = lineOf(code, /\b(seen|map|hash|dict|table)\w*\s*\[/i, 10);
  const retLine = lineOf(code, /return\s*\[/, 8);
  const printLine =
    lastLineOf(code, /(print\s*\(|console\.(log|print)|println\s*\()/i) ??
    lineOf(code, /(result|res)\s*=\s*/i, 1) + 1;

  b.step({
    line: initLine,
    event: "program_start",
    description:
      "Two Sum with a hash map: every value we meet gets remembered with its index, so any later number can find its complement in O(1).",
    variables: vars({ i: "—", complement: "—" }),
    memory: memory(),
    visual: arrayVisual("nums"),
    changed: { variables: ["seen"] },
  });

  let pair: [number, number] | null = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const comp = target - v;

    b.step({
      line: loopLine,
      event: "loop_iteration",
      description: `i = ${i} — read nums[${i}] = ${v}.`,
      variables: vars({ i, complement: comp }),
      memory: memory([{ index: i, role: "reading" }]),
      visual: arrayVisual("nums"),
      changed: { variables: ["i"] },
    });

    b.step({
      line: compLine,
      event: "assignment",
      description: `complement = target − nums[${i}] = ${target} − ${v} = ${comp} — the partner ${v} would need to reach ${target}.`,
      variables: vars({ i, complement: comp }),
      memory: memory([{ index: i, role: "reading" }]),
      visual: arrayVisual("nums"),
      changed: { variables: ["complement"] },
    });

    if (seen.has(comp)) {
      const a = seen.get(comp)!;
      pair = [a, i];
      b.step({
        line: checkLine,
        event: "condition_check",
        description: `Is ${comp} in seen? Yes — seen[${comp}] = ${a}, so nums[${a}] + nums[${i}] = ${values[a]} + ${v} = ${target}. Pair found.`,
        variables: vars({ i, complement: comp, result: `[${a}, ${i}]` }),
        memory: memory([
          { index: a, role: "found" },
          { index: i, role: "found" },
        ]),
        visual: arrayVisual("nums"),
        changed: {},
      });
      b.step({
        line: retLine,
        event: "function_return",
        description: `Return [seen[${comp}], i] = [${a}, ${i}] — the two indices whose values sum to ${target}.`,
        variables: vars({ i, complement: comp, result: `[${a}, ${i}]` }),
        memory: memory([
          { index: a, role: "found" },
          { index: i, role: "found" },
        ]),
        visual: arrayVisual("nums"),
        changed: { variables: ["result"] },
      });
      const printIdx = b.steps.length;
      b.step({
        line: printLine,
        event: "output_write",
        description: `print(result) writes: [${a}, ${i}]`,
        variables: vars({ i, complement: comp, result: `[${a}, ${i}]` }),
        output: `[${a}, ${i}]`,
        memory: memory([
          { index: a, role: "found" },
          { index: i, role: "found" },
        ]),
        visual: arrayVisual("nums"),
        changed: { output: true },
      });
      b.step({
        line: printLine,
        event: "program_end",
        description: `Program finished — indices ${a} and ${i} hold ${values[a]} and ${v}, which sum to ${target}.`,
        variables: vars({ i, complement: comp, result: `[${a}, ${i}]` }),
        output: `[${a}, ${i}]`,
        memory: memory([
          { index: a, role: "found" },
          { index: i, role: "found" },
        ]),
        visual: arrayVisual("nums"),
      });
      b.prompt({
        stepId: `step-${String(printIdx).padStart(3, "0")}`,
        type: "predict_condition",
        question: `nums[${i}] = ${v} needs complement ${comp}. Is it already stored in the hash map?`,
        target: { found: "yes" },
        answer: "yes",
        choices: ["yes", "no"],
        explanation: `seen[${comp}] = ${a} was recorded when we visited index ${a} earlier, so the answer is [${a}, ${i}]: ${values[a]} + ${v} = ${target}.`,
      });
      break;
    }

    b.step({
      line: checkLine,
      event: "condition_check",
      description: `Is ${comp} in seen? No — not stored yet, so no partner exists so far.`,
      variables: vars({ i, complement: comp }),
      memory: memory([{ index: i, role: "reading" }]),
      visual: arrayVisual("nums"),
      changed: {},
    });

    seen.set(v, i);
    b.step({
      line: insLine,
      event: "array_write",
      description: `Store seen[${v}] = ${i} — if a later number needs complement ${v}, it will be found instantly.`,
      variables: vars({ i, complement: comp }),
      memory: memory([{ index: i, role: "reading" }]),
      visual: arrayVisual("nums"),
      changed: { variables: ["seen"] },
    });
  }

  if (!pair) {
    b.step({
      line: retLine,
      event: "function_return",
      description: `No two values sum to ${target} — the loop finishes and we return [].`,
      variables: vars({ result: "[]" }),
      memory: memory(),
      visual: arrayVisual("nums"),
      changed: { variables: ["result"] },
    });
    b.step({
      line: printLine,
      event: "output_write",
      description: "print(result) writes: []",
      variables: vars({ result: "[]" }),
      output: "[]",
      memory: memory(),
      visual: arrayVisual("nums"),
      changed: { output: true },
    });
    b.step({
      line: printLine,
      event: "program_end",
      description: "Program finished — the target is unreachable with this array.",
      variables: vars({ result: "[]" }),
      output: "[]",
      memory: memory(),
      visual: arrayVisual("nums"),
    });
  }

  return b.build();
}

/* ------------------------------------------------------------------ */
/* Detection pipeline                                                  */
/* ------------------------------------------------------------------ */

const KIND_INFO: Record<DetectionKind, { title: string; confidence: number; note: string }> = {
  "sum-array": { title: "Sum of Array", confidence: 0.9, note: "Loop accumulating arr[i] into a total." },
  "max-array": { title: "Max in Array", confidence: 0.9, note: "Scan comparing arr[i] against a running maximum." },
  "factorial-loop": { title: "Factorial (loop)", confidence: 0.85, note: "Product loop from 1 to n." },
  "factorial-recursion": { title: "Factorial (recursion)", confidence: 0.95, note: "Recursive n · fact(n − 1)." },
  "fibonacci-recursion": { title: "Fibonacci (recursion)", confidence: 0.95, note: "Recursive fib(n − 1) + fib(n − 2)." },
  "binary-search": { title: "Binary Search", confidence: 0.85, note: "while low <= high with a mid probe." },
  "bubble-sort": { title: "Bubble Sort", confidence: 0.85, note: "Nested loop swapping adjacent out-of-order pairs." },
  "selection-sort": { title: "Selection Sort", confidence: 0.82, note: "Find the minimum in the unsorted suffix and place it at the front." },
  "insertion-sort": { title: "Insertion Sort", confidence: 0.82, note: "Grow a sorted prefix by inserting each new key into place." },
  "two-sum": {
    title: "Two Sum (Hash Map)",
    confidence: 0.9,
    note: "Hash map stores each value's index for O(1) complement lookups.",
  },
  script: { title: "Story Script", confidence: 1, note: "Declarative commands turned into a trace." },
};

export function detectAndGenerate(code: string, options?: DetectionOptions): DetectionResult {
  const trimmed = code.trim();
  const { language, detectedLanguage, requestedLanguage } = resolveLanguage(trimmed, options);
  if (trimmed.length < 10) {
    return {
      kind: "storyboard",
      confidence: 0,
      language,
      note: "Paste a small program to see its execution visualized.",
      matched: [],
      detectedLanguage,
      requestedLanguage,
      validation: { errors: [], warnings: [] },
    };
  }
  const values = extractNumberArray(trimmed);
  const sourceLines = trimmed.split("\n").length;

  const matches: string[] = [];
  const add = (name: string, ok: boolean) => {
    if (ok) matches.push(name);
  };

  add("fibonacci-recursion", SIG.fibRecursion(trimmed));
  add("factorial-recursion", SIG.factRecursion(trimmed));
  add("factorial-loop", SIG.factLoop(trimmed));
  add("sum-array", SIG.sumArray(trimmed));
  add("max-array", SIG.maxArray(trimmed));
  add("binary-search", SIG.binarySearch(trimmed));
  add("bubble-sort", SIG.bubbleSort(trimmed));
  add("selection-sort", SIG.selectionSort(trimmed));
  add("insertion-sort", SIG.insertionSort(trimmed));
  add("two-sum", SIG.twoSumHash(trimmed));

  // Prefer the most specific match first (recursion > hash map > sort > search > loop).
  const priority: DetectionKind[] = [
    "fibonacci-recursion",
    "factorial-recursion",
    "two-sum",
    "bubble-sort",
    "selection-sort",
    "insertion-sort",
    "binary-search",
    "factorial-loop",
    "sum-array",
    "max-array",
  ];

  for (const kind of priority) {
    if (!matches.includes(kind)) continue;
    const info = KIND_INFO[kind];
    try {
      let trace: TraceDocument;
      if (kind === "sum-array") {
        trace = sumTrace(values ?? [3, 8, 2, 9, 5], trimmed);
      } else if (kind === "max-array") {
        trace = maxTrace(values ?? [3, 8, 2, 9, 5], trimmed);
      } else if (kind === "factorial-loop") {
        const arg = extractCallArg(trimmed, "fact|factorial");
        trace = factorialLoopTrace(arg ?? 5, trimmed);
      } else if (kind === "factorial-recursion") {
        const arg = extractCallArg(trimmed, "fact|factorial") ?? 4;
        trace = buildRecursionTrace({
          title: "Factorial (generated)",
          code: trimmed,
          topic: "recursion",
          difficulty: "beginner",
          language,
          durationSeconds: 90,
          fnName: "fact",
          defLine: 1,
          baseLine: 2,
          baseReturnLine: 3,
          callLine: 4,
          printLine: 5,
          arg,
          baseCondition: () => "n <= 1",
          isBase: (n) => n <= 1,
          baseResult: () => 1,
          children: (n) => [n - 1],
          fn: (n) => {
            let r = 1;
            for (let i = 2; i <= n; i++) r *= i;
            return r;
          },
          describeReturn: (n, childValues, total) =>
            `fact(${n}) = ${n} × ${childValues[0] ?? "?"} = ${total}`,
        });
      } else if (kind === "fibonacci-recursion") {
        const arg = extractCallArg(trimmed, "fib|fibonacci") ?? 5;
        trace = buildRecursionTrace({
          title: "Fibonacci (generated)",
          code: trimmed,
          topic: "recursion",
          difficulty: "intermediate",
          language,
          durationSeconds: 120,
          fnName: "fib",
          defLine: 1,
          baseLine: 2,
          baseReturnLine: 3,
          callLine: 4,
          printLine: 5,
          arg,
          baseCondition: () => "n <= 1",
          isBase: (n) => n <= 1,
          baseResult: (n) => n,
          children: (n) => [n - 1, n - 2],
          fn: (n) => {
            const fib = (m: number): number => (m <= 1 ? m : fib(m - 1) + fib(m - 2));
            return fib(n);
          },
          describeReturn: (n, childValues, total) =>
            `fib(${n}) = ${childValues[0]} + ${childValues[1]} = ${total}`,
        });
      } else if (kind === "binary-search") {
        const target = extractCallArg(trimmed, "target|key|search") ?? values?.[Math.floor((values.length ?? 2) / 2)] ?? 7;
        trace = searchTrace(values ?? [1, 3, 5, 7, 9, 11], target, trimmed);
      } else if (kind === "two-sum") {
        const target =
          extractTarget(trimmed) ??
          (values && values.length >= 2 ? values[0] + values[1] : 9);
        trace = twoSumTrace(values ?? [2, 7, 11, 15], target, trimmed);
      } else if (kind === "selection-sort") {
        trace = selectionTrace(values ?? [6, 3, 8, 2, 9], trimmed);
      } else if (kind === "insertion-sort") {
        trace = insertionTrace(values ?? [5, 2, 8, 1], trimmed);
      } else {
        trace = bubbleTrace(values ?? [5, 2, 8, 1], trimmed);
      }
      const validatedTrace = clampLines(traceWithLanguage(trace, language), sourceLines);
      const validation = validationSummary(validatedTrace);
      if (validation.errors.length > 0) {
        throw new Error(validation.errors.join("; "));
      }
      return {
        kind,
        confidence: info.confidence,
        language,
        trace: validatedTrace,
        note: info.note,
        matched: matches,
        detectedLanguage,
        requestedLanguage,
        validation,
      };
    } catch {
      // Fall through to storyboard if a generator fails.
    }
  }

  // Unknown code: structural storyboard — construct tour, no execution.
  const { trace, summary } = buildStructuralStoryboard(trimmed, language);
  const validation = validationSummary(trace);

  const interactiveNote = summary.interactive
    ? " This program is interactive — it pauses for user input — so playback is a structural walkthrough only, nothing executes."
    : "";
  const nondetNote = !summary.interactive && summary.nondeterministic
    ? " It also uses randomness, so runs can't be replayed faithfully."
    : "";

  return {
    kind: "storyboard",
    confidence: 0.3,
    language,
    trace,
    note: `No known pattern matched. CodeAnvil narrates the structure — functions, loops, branches, and I/O — line by line.${interactiveNote}${nondetNote}`,
    matched: matches,
    detectedLanguage,
    requestedLanguage,
    validation,
  };
}
