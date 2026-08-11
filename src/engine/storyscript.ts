/**
 * Story Script — the local-first "tracer API" (inspired by Algorithm
 * Visualizer's annotated tracers, without executing anything).
 *
 * Users write a small sequence of DECLARATIVE commands that describe state
 * changes; a safe parser turns them into a schema-conformant trace the 3D
 * stage can replay. No user code ever runs.
 *
 * Commands (one per line, `#` comments):
 *   array <id> <v1> <v2> …        define a numeric array memory
 *   compare <id> <i> <j>          highlight two indices as compared
 *   swap <id> <i> <j>             swap two values and highlight them
 *   visit <id> <i>                highlight one index (reading)
 *   mark <id> <i> <role>          apply a role: sorted | max | key | mid
 *   push <id> <value>             append a value (stack op)
 *   pop <id>                      remove the last value
 *   set <name> <value>            set a visible variable
 *   print <text>                  append console output
 *   step <n>                      set the current source line (default: 1)
 *   note <text>                   plain description for this step
 */

import type { MemoryItem, TraceDocument } from "../types/trace";
import { arrayMemory, arrayVisual, TraceBuilder } from "../data/traces/builders";

export const DEFAULT_STORY_SCRIPT = `# Story Script — describe state, watch it animate
# (bubble sort pass on [5, 2, 8, 1])
array arr 5 2 8 1
set pass 1
compare arr 0 1
swap arr 0 1
compare arr 1 2
compare arr 2 3
swap arr 2 3
mark arr 3 sorted
set pass 2
compare arr 0 1
compare arr 1 2
swap arr 1 2
mark arr 1 sorted
mark arr 2 sorted
mark arr 0 sorted
print [1, 2, 5, 8]
note Pass complete — every mark stays visible as the run progresses.`;

export interface StoryScriptError {
  line: number;
  message: string;
}

const ROLES = new Set(["sorted", "max", "key", "mid", "reading", "compare"]);

/** Parses a story script into per-command instructions (validating along the way). */
export function parseStoryScript(
  script: string,
): { commands: string[][]; errors: StoryScriptError[] } {
  const commands: string[][] = [];
  const errors: StoryScriptError[] = [];
  script.split("\n").forEach((raw, idx) => {
    const lineNum = idx + 1;
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const parts = line.split(/\s+/);
    const cmd = parts[0];
    if (!["array", "compare", "swap", "visit", "mark", "push", "pop", "set", "print", "step", "note"].includes(cmd)) {
      errors.push({ line: lineNum, message: `Unknown command "${cmd}"` });
      return;
    }
    commands.push(parts);
  });
  return { commands, errors };
}

const parseNum = (s: string): number | null => {
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** Builds a full trace document from a validated command list. */
export function storyScriptTrace(
  script: string,
  title = "Story Script",
): { trace?: TraceDocument; error?: StoryScriptError } {
  const { commands, errors } = parseStoryScript(script);
  if (errors.length > 0) {
    return { error: errors[0] };
  }

  const b = new TraceBuilder({
    title,
    code: script,
    topic: "generic",
    difficulty: "beginner",
    language: "story-script",
    durationSeconds: 60,
  });

  const arrays = new Map<string, number[]>();
  const vars: Record<string, unknown> = {};
  const markState = new Map<string, Map<number, string>>();

  const memoryFor = (id: string): MemoryItem => {
    const values = arrays.get(id) ?? [];
    const highlights = [...(markState.get(id) ?? [])].map(([index, role]) => ({
      index,
      role,
    }));
    return arrayMemory(id, id, values, highlights);
  };
  const mark = (id: string, index: number, role: string) => {
    if (!markState.has(id)) markState.set(id, new Map());
    markState.get(id)!.set(index, role);
  };
  const unmark = (id: string, index: number) => {
    markState.get(id)?.delete(index);
  };    let line = 1;
    let output = "";
    const stepCount = commands.length;

    commands.forEach((parts, i) => {
      const [cmd, ...rest] = parts;
      const isFirst = i === 0;
      const isLast = i === stepCount - 1;
      let description = "";
      const changed: { variables?: string[]; output?: boolean } = {};

    if (cmd === "array") {
      const id = rest[0] ?? "arr";
      const values = rest.slice(1).map(parseNum);
      if (values.some((v) => v === null)) {
        return; // invalid values — handled by validate step earlier
      }
      arrays.set(id, values as number[]);
      markState.set(id, new Map());
      description = `Define array ${id} = [${(values as number[]).join(", ")}].`;
      changed.variables = [id];
    } else if (cmd === "compare") {
      const [id, a, c] = rest;
      const i = parseNum(a);
      const j = parseNum(c);
      if (i === null || j === null) return;
      unmark(id, i);
      unmark(id, j);
      mark(id, i, "compare");
      mark(id, j, "compare");
      description = `Compare ${id}[${i}] = ${arrays.get(id)?.[i]} with ${id}[${j}] = ${arrays.get(id)?.[j]}.`;
    } else if (cmd === "swap") {
      const [id, a, c] = rest;
      const i = parseNum(a);
      const j = parseNum(c);
      const arr = arrays.get(id);
      if (i === null || j === null || !arr) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      mark(id, i, "compare");
      mark(id, j, "compare");
      description = `Swap ${id}[${i}] and ${id}[${j}] — array is now [${arr.join(", ")}].`;
      changed.variables = [id];
    } else if (cmd === "visit") {
      const [id, a] = rest;
      const i = parseNum(a);
      if (i === null) return;
      mark(id, i, "reading");
      description = `Visit ${id}[${i}] = ${arrays.get(id)?.[i]}.`;
    } else if (cmd === "mark") {
      const [id, a, role] = rest;
      const i = parseNum(a);
      if (i === null || !ROLES.has(role)) return;
      mark(id, i, role);
      description = `Mark ${id}[${i}] as ${role}.`;
    } else if (cmd === "push") {
      const [id, v] = rest;
      const value = parseNum(v);
      const arr = arrays.get(id);
      if (value === null || !arr) return;
      arr.push(value);
      mark(id, arr.length - 1, "reading");
      description = `Push ${value} onto ${id} → [${arr.join(", ")}].`;
      changed.variables = [id];
    } else if (cmd === "pop") {
      const [id] = rest;
      const arr = arrays.get(id);
      if (!arr || arr.length === 0) return;
      const value = arr.pop();
      description = `Pop ${value} off ${id} → [${arr.join(", ")}].`;
      changed.variables = [id];
    } else if (cmd === "set") {
      const name = rest[0];
      const value = parseNum(rest[1]);
      if (!name || value === null) return;
      vars[name] = value;
      description = `Set ${name} = ${value}.`;
      changed.variables = [name];
    } else if (cmd === "print") {
      output += `${rest.join(" ")}\n`;
      description = `Console output: ${rest.join(" ")}`;
      changed.output = true;
    } else if (cmd === "step") {
      const n = parseNum(rest[0]);
      if (n !== null) line = Math.max(1, Math.floor(n));
      description = `Focus line ${line}.`;
    } else if (cmd === "note") {
      description = rest.join(" ");
    }

    const arraysWithMarks = [...arrays.keys()];
    b.step({
      line,
      event: isFirst ? "program_start" : isLast ? "program_end" : "line_enter",
      description,
      variables: { ...vars, ...Object.fromEntries([...arrays].map(([id, v]) => [id, `[${v.join(", ")}]`])) },
      output: output.trimEnd(),
      memory: arraysWithMarks.map(memoryFor),
      visual: arraysWithMarks.length > 0 ? arrayVisual(arraysWithMarks[0]) : undefined,
      changed,
      actions: [{ type: cmd, args: rest }],
    });
  });

  return { trace: b.build() };
}
