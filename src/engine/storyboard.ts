/**
 * Structural storyboard (docs/36 — unknown-code fallback).
 *
 * When pasted code doesn't match a known DSA pattern we never execute it.
 * Instead we walk its *structure* and narrate each construct — function
 * definitions, loops, branches, error handlers, reads, writes, calls —
 * so the 3D tour is useful even for programs like a guessing game.
 *
 * The result is an honest label: interactive programs (input/scanf/…)
 * and non-deterministic ones (random) are flagged in the note.
 */

import type { TraceDocument } from "../types/trace";
import { TraceBuilder } from "../data/traces/builders";

export interface StoryboardSummary {
  functions: number;
  loops: number;
  branches: number;
  reads: number;
  writes: number;
  guards: number;
  /** Reads input from the user (input/scanf/gets/readline/prompt/cin). */
  interactive: boolean;
  /** Uses randomness, so runs are not reproducible. */
  nondeterministic: boolean;
}

const INTERACTIVE_RE = /\b(input|scanf|gets|readline|prompt)\s*\(|cin\s*>>/;
const NONDETERMINISTIC_RE = /\b(random\.|Math\.random|rand\s*\(|srand\s*\(|time\s*\(\s*null)/;
const ASSIGN_OP = /(?:[+\-*/%&|^]?=|\/\/=|\*\*=|<<=|>>=)/;

interface LineKind {
  event: string;
  label: string;
  detail?: string;
  output?: string;
  note?: string;
}

/** Pulls the first printable string literal out of a line (for print/echo…). */
function printLiteral(line: string): string | null {
  const m = line.match(/["'`]([^"'`]*?)["'`]/);
  if (!m) return null;
  return m[1]
    .replace(/\{[^}]*\}/g, "…")
    .replace(/\$\{[^}]*\}/g, "…")
    .replace(/\\n/g, " ")
    .trim();
}

/** Classifies a single source line into a construct. Order matters. */
function classify(line: string): LineKind {
  const t = line.trim();
  if (!t) return { event: "inspect", label: "blank" };

  // Comments.
  if (/^(#|\/\/|\/\*|\*|<!--|--\s)/.test(t)) {
    return { event: "comment", label: "comment", detail: t.slice(0, 56) };
  }

  // Python entry guard: `if __name__ == "__main__":`.
  if (/^\s*if\s+__name__\s*==\s*["']__main__["']/.test(t)) {
    return { event: "entry_point", label: "entry point" };
  }

  // Function definitions (Python, JS/TS, Go, Rust, Ruby, C-like).
  const fn =
    t.match(/^\s*(?:async\s+)?(?:def|function|fn|func|sub)\s+([A-Za-z_]\w*)/) ??
    t.match(
      /^\s*(?:public|private|protected|internal|static|async|final|export)?\s*(?:static\s+|async\s+)?(?:int|void|bool|boolean|string|char|double|float|long|short|auto|var|let|const)\s+([A-Za-z_]\w*)\s*\(/,
    );
  if (fn) {
    return { event: "define_function", label: "function", detail: fn[1] };
  }

  // Types: classes, structs, interfaces, enums.
  const cls = t.match(/^\s*(?:abstract\s+|final\s+|sealed\s+)?(?:class|struct|interface|enum|trait)\s+([A-Za-z_]\w*)/);
  if (cls) {
    return { event: "type_define", label: "type", detail: cls[1] };
  }

  // Imports / includes.
  if (/^\s*(?:import|from\s+\S+\s+import|#include|using\s+(?:namespace|System)|use\s+)/.test(t)) {
    const dep = (t.match(/(?:import|include|using|use)\s+([\w.<>:"/]+)/) ?? [])[1] ?? t;
    return { event: "import", label: "dependency", detail: dep };
  }

  // Error-handling blocks.
  if (/^\s*(try|finally)\s*[:{]/.test(t)) {
    return { event: "enter_guard", label: "error guard" };
  }
  const except = t.match(/^\s*(?:except|catch|finally)\b\s*(\(?[^:{(]*)/);
  if (except) {
    return {
      event: "handle_error",
      label: "error handler",
      detail: except[1].replace(/\(|\)/g, "").trim() || "any error",
    };
  }

  // Loops.
  const loop = t.match(/^\s*(?:for|while|foreach)\b\s*([^:{]*)/);
  if (loop && /[:{(]$/.test(t)) {
    return { event: "enter_loop", label: "loop", detail: loop[1].trim() };
  }

  // Branches (if / elif / else if / else / switch / case).
  const branch = t.match(/^\s*(?:if|elif|else\s+if)\b\s*([^:{]*)/);
  if (branch) {
    return { event: "branch", label: "branch", detail: branch[1].trim() };
  }
  if (/^\s*(?:else|switch|case)\b/.test(t)) {
    return { event: "branch", label: "branch" };
  }

  // Reads — the program pauses for user input here.
  const read = t.match(/^\s*([A-Za-z_]\w*)\s*=\s*(?:[^;]*?)(input|scanf|gets|readline|prompt)\s*\(/);
  if (INTERACTIVE_RE.test(t)) {
    const asInt = /int\s*\(|\bint\b/.test(t) ? " (parsed as an integer)" : "";
    return {
      event: "read_input",
      label: "user input",
      detail: read ? `into ${read[1]}${asInt}` : asInt.trim() || undefined,
    };
  }

  // Writes — output to the console.
  if (/\b(?:print|printf|println|console\.log|puts|echo)\s*\(|cout\s*<<|System\.out|print\s+/.test(t)) {
    return { event: "write_output", label: "output", output: printLiteral(t) ?? undefined };
  }

  // return / break / continue.
  if (/^\s*return\b/.test(t)) return { event: "return_value", label: "return" };
  if (/^\s*break\b/.test(t)) return { event: "exit_loop", label: "exit loop" };
  if (/^\s*continue\b/.test(t)) return { event: "continue_loop", label: "continue loop" };

  // Assignments (checked after keywords that also use `=`).
  if (!/[=!<>]=/.test(t)) {
    const m = t.match(new RegExp(`^\\s*([A-Za-z_$][\\w$.,\\[\\]\\s]*?)\\s*${ASSIGN_OP.source}`));
    if (m) {
      const name = m[1].trim().split(/[,\s]+/)[0].replace(/\[.*$/, "");
      const rhs = t.slice(m[0].length).trim();
      const random = NONDETERMINISTIC_RE.test(rhs);
      return {
        event: "assign",
        label: "assignment",
        detail: name,
        ...(random ? { note: `random` } : {}),
      };
    }
  }

  // Decorators (Python @…).
  if (/^\s*@\w+/.test(t)) {
    return { event: "decorator", label: "decorator", detail: t.slice(1, 40) };
  }

  // A plain call at statement level, e.g. `guessing_game()`.
  const call = t.match(/^\s*([A-Za-z_]\w*)\s*\(/);
  if (call) {
    return { event: "call_function", label: "call", detail: call[1] };
  }

  return { event: "inspect", label: "inspect" };
}

/** Builds the full structural storyboard trace for unknown code. */
export function buildStructuralStoryboard(code: string, language: string): { trace: TraceDocument; summary: StoryboardSummary } {
  const lines = code.split("\n");
  const summary: StoryboardSummary = {
    functions: 0,
    loops: 0,
    branches: 0,
    reads: 0,
    writes: 0,
    guards: 0,
    interactive: INTERACTIVE_RE.test(code),
    nondeterministic: NONDETERMINISTIC_RE.test(code),
  };

  const b = new TraceBuilder({
    title: "Structural Code Tour (generated)",
    code,
    topic: "generic",
    difficulty: "beginner",
    language,
    durationSeconds: 30,
  });

  b.step({
    line: 1,
    event: "program_start",
    description: summary.interactive
      ? "No known DSA pattern matched, and this program reads user input — so CodeAnvil narrates its structure (functions, loops, branches, I/O) instead of executing it."
      : "No known DSA pattern matched, so CodeAnvil narrates the code's structure — functions, loops, branches, and I/O — without executing a single line.",
    variables: { line: 1, phase: "tour" },
    changed: { variables: ["line", "phase"] },
  });

  const outputs: string[] = [];

  lines.forEach((raw, i) => {
    const t = raw.trim();
    if (!t) return;
    const lineNo = i + 1;
    const kind = classify(raw);

    // Tally constructs for the closing summary.
    if (kind.event === "define_function") summary.functions++;
    if (kind.event === "enter_loop") summary.loops++;
    if (kind.event === "branch") summary.branches++;
    if (kind.event === "read_input") summary.reads++;
    if (kind.event === "write_output") summary.writes++;
    if (kind.event === "enter_guard" || kind.event === "handle_error") summary.guards++;

    const snippet = t.slice(0, 60) + (t.length > 60 ? "…" : "");
    const description = describeStep(kind, lineNo, snippet);

    const step: Parameters<TraceBuilder["step"]>[0] = {
      line: lineNo,
      event: kind.event,
      description,
      variables: { line: lineNo, construct: kind.label },
      changed: { variables: ["line", "construct"] },
    };

    if (kind.output) {
      outputs.push(kind.output);
      step.output = outputs.join("\n");
    }
    if (kind.event === "write_output") {
      step.output = outputs.join("\n");
    }

    b.step(step);
  });

  const parts = [
    summary.functions ? `${summary.functions} function${summary.functions === 1 ? "" : "s"}` : null,
    summary.loops ? `${summary.loops} loop${summary.loops === 1 ? "" : "s"}` : null,
    summary.branches ? `${summary.branches} branch${summary.branches === 1 ? "" : "es"}` : null,
    summary.reads ? `${summary.reads} user-input read${summary.reads === 1 ? "" : "s"}` : null,
    summary.writes ? `${summary.writes} output${summary.writes === 1 ? "" : "s"}` : null,
    summary.guards ? `${summary.guards} error-handling block${summary.guards === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

  const endDescription = summary.interactive
    ? `End of tour — found ${parts.join(", ")}. This program is interactive: playback is a safe walkthrough, and the loop only exits when the user guesses correctly.`
    : `End of tour — found ${parts.join(", ")}. Playback here is a structural walkthrough; nothing was executed.`;

  b.step({
    line: lines.length,
    event: "program_end",
    description: endDescription,
    variables: { line: lines.length, phase: "complete" },
    changed: { variables: ["phase"] },
  });

  return { trace: b.build(), summary };
}

function describeStep(kind: LineKind, lineNo: number, snippet: string): string {
  switch (kind.event) {
    case "define_function":
      return `Define function \`${kind.detail}\` — the logic below lives in this scope and runs only when called.`;
    case "type_define":
      return `Declare type \`${kind.detail}\` — a blueprint for objects/values used in this file.`;
    case "import":
      return `Load dependency \`${kind.detail}\` — makes its functions available to this code.`;
    case "enter_guard":
      return "Enter an error-guarded block — if anything inside raises, control moves to the handler below instead of crashing.";
    case "handle_error":
      return `Error handler for \`${kind.detail}\` — runs only when the guarded block raises; keeps the program alive.`;
    case "enter_loop":
      return kind.detail
        ? `Begin a loop — this block repeats while \`${kind.detail}\` holds${/^(true|1)$/i.test(kind.detail) ? " (infinite — exited only by `break`)" : ""}.`
        : "Begin a loop — this block repeats until its exit condition is met.";
    case "branch":
      return kind.detail
        ? `Branch — take a different path when \`${kind.detail}\` is true.`
        : "Fallback branch — runs when none of the earlier conditions matched.";
    case "read_input":
      return `Read input from the user${kind.detail ? ` \`${kind.detail}\`` : ""} — the program pauses here until something is typed. (Not executed during playback.)`;
    case "write_output":
      return `Write output to the console${kind.output ? `: “${kind.output}”` : ""}.`;
    case "return_value":
      return "Return a value — control hands the result back to the caller.";
    case "exit_loop":
      return "Exit the loop — control jumps to the first line after the loop block.";
    case "continue_loop":
      return "Skip the rest of this iteration and jump to the next one.";
    case "assign":
      return `Assign variable \`${kind.detail}\`${kind.note === "random" ? " from a random source — value differs on every run (non-deterministic)" : ""}.`;
    case "comment":
      return `Comment — ${snippet.replace(/^[#/]+\s*/, "")}`;
    case "entry_point":
      return "Entry guard — this block runs only when the file is executed directly (not imported as a module).";
    case "call_function":
      return `Invoke \`${kind.detail}()\` — control jumps into the function and returns when it finishes.`;
    case "decorator":
      return `Decorator \`${kind.detail}\` — wraps the function below to extend its behavior.`;
    default:
      return `Line ${lineNo}: ${snippet}`;
  }
}
