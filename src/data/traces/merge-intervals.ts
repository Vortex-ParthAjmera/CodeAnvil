import type { MemoryItem, TraceAction } from "../../types/trace";
import { arrayMemory, arrayVisual, TraceBuilder } from "./builders";

export type Interval = [number, number];

export const MERGE_INTERVALS_DEFAULT: Interval[] = [[8, 10], [1, 3], [2, 6], [15, 18], [9, 12]];

export const MERGE_INTERVALS_CODE = `intervals = [[8, 10], [1, 3], [2, 6], [15, 18], [9, 12]]
if not intervals: raise ValueError("intervals must not be empty")
for start, end in intervals:
    if start > end: raise ValueError("start must not exceed end")
intervals.sort(key=lambda interval: (interval[0], interval[1]))
merged = [intervals[0][:]]
for start, end in intervals[1:]:
    last = merged[-1]
    if start <= last[1]:
        last[1] = max(last[1], end)
    else:
        merged.append([start, end])
print(merged)`;

interface IntervalTokenState {
  id: string;
  start: number;
  end: number;
  index: number;
  originalIndex: number;
}

interface MergedIntervalState {
  id: string;
  start: number;
  end: number;
  contributors: string[];
}

function cloneIntervals(intervals: Interval[]): Interval[] {
  return intervals.map(([start, end]) => [start, end]);
}

function intervalLabel([start, end]: Interval): string {
  return `[${start}, ${end}]`;
}

/** Sorts intervals, then makes every overlap/commit decision explicit. */
export function buildMergeIntervalsTrace(
  input: Interval[] = MERGE_INTERVALS_DEFAULT,
  code = MERGE_INTERVALS_CODE,
  language = "python",
) {
  const original = cloneIntervals(input);
  const originalTokens: IntervalTokenState[] = original.map(([start, end], index) => ({
    id: `interval-${index}`,
    start,
    end,
    index,
    originalIndex: index,
  }));
  let orderedTokens = originalTokens.map((token) => ({ ...token }));
  const merged: MergedIntervalState[] = [];
  let activeIndex: number | null = null;
  let activeMergedIndex: number | null = null;
  let overlap: boolean | null = null;
  let previousEnd: number | null = null;
  let nextEnd: number | null = null;
  let comparisons = 0;
  let merges = 0;
  let commits = 0;

  const b = new TraceBuilder({
    title: "Merge Intervals",
    code,
    topic: "arrays",
    difficulty: "intermediate",
    language,
    durationSeconds: 135,
  });
  const invalidReason = original.length === 0
    ? "at least one interval is required"
    : original.some((interval) => !Array.isArray(interval) || interval.length !== 2)
      ? "every interval needs exactly two endpoints"
      : original.some(([start, end]) => !Number.isFinite(start) || !Number.isFinite(end))
        ? "every endpoint must be finite"
        : original.some(([start, end]) => start > end)
          ? "each interval start must be less than or equal to its end"
          : null;

  const variables = () => ({
    algorithm: "merge-intervals",
    intervals: orderedTokens.map((token) => [token.start, token.end]),
    merged: merged.map((segment) => [segment.start, segment.end]),
    comparisons,
    merges,
    commits,
  });

  const memory = (): MemoryItem[] => {
    const sortedHighlights: Array<{ index: number; role: string }> = [];
    if (activeIndex !== null) sortedHighlights.push({ index: activeIndex, role: overlap ? "overlap" : "candidate" });
    const mergedHighlights: Array<{ index: number; role: string }> = [];
    if (activeMergedIndex !== null) mergedHighlights.push({ index: activeMergedIndex, role: overlap ? "extend" : "committed" });
    return [
      arrayMemory("intervals", "sorted intervals", orderedTokens.map((token) => intervalLabel([token.start, token.end])), sortedHighlights),
      arrayMemory("merged", "merged output", merged.map((segment) => intervalLabel([segment.start, segment.end])), mergedHighlights),
    ];
  };

  const actionState = ({ sortedReady = false, invalid = null }: { sortedReady?: boolean; invalid?: string | null } = {}) => ({
    originalIntervals: cloneIntervals(original),
    originalTokens: originalTokens.map((token) => ({ ...token })),
    sortedTokens: orderedTokens.map((token) => ({ ...token })),
    mergedSegments: merged.map((segment) => ({ ...segment, contributors: [...segment.contributors] })),
    sortedReady,
    activeIndex,
    activeMergedIndex,
    overlap,
    previousEnd,
    nextEnd,
    comparisons,
    merges,
    commits,
    invalidReason: invalid,
  });

  const addStep = ({ line, event, description, action, output = "", changed = [] }: {
    line: number;
    event: string;
    description: string;
    action: TraceAction;
    output?: string;
    changed?: string[];
  }) => b.step({
    line,
    event,
    description,
    variables: variables(),
    output,
    memory: memory(),
    visual: arrayVisual("intervals"),
    changed: { variables: changed, output: output !== "" },
    actions: [action],
  });

  addStep({
    line: 1,
    event: "program_start",
    description: `Merge ${original.length} intervals into the smallest non-overlapping cover. Sorting by start will make one left-to-right sweep sufficient.`,
    changed: ["intervals", "merged"],
    action: { type: "assignment", target: "intervals", value: cloneIntervals(original), phase: "interval_start", ...actionState() },
  });

  if (invalidReason) {
    addStep({
      line: original.length === 0 ? 2 : 4,
      event: "error",
      description: `Input rejected: ${invalidReason}. No merged span was invented.`,
      action: {
        type: "condition_check",
        condition: "intervals are non-empty finite [start, end] pairs with start <= end",
        result: false,
        phase: "interval_invalid",
        ...actionState({ invalid: invalidReason }),
      },
    });
    return b.build();
  }

  addStep({
    line: 4,
    event: "condition_check",
    description: "Every interval has two finite endpoints and start <= end, so the sweep can proceed safely.",
    action: {
      type: "condition_check",
      condition: "every interval satisfies start <= end",
      result: true,
      phase: "interval_validate",
      ...actionState(),
    },
  });

  orderedTokens = originalTokens
    .map((token) => ({ ...token }))
    .sort((a, other) => a.start - other.start || a.end - other.end)
    .map((token, index) => ({ ...token, index }));
  addStep({
    line: 5,
    event: "assignment",
    description: `Sort by start endpoint: ${orderedTokens.map((token) => `[${token.start}, ${token.end}]`).join(" -> ")}. Any future overlap must touch the current merged tail.`,
    changed: ["intervals"],
    action: { type: "assignment", target: "intervals", value: orderedTokens.map((token) => [token.start, token.end]), phase: "interval_sort", ...actionState({ sortedReady: true }) },
  });

  const first = orderedTokens[0];
  merged.push({ id: "merged-0", start: first.start, end: first.end, contributors: [first.id] });
  activeIndex = 0;
  activeMergedIndex = 0;
  commits = 1;
  addStep({
    line: 6,
    event: "array_write",
    description: `Seed the output with [${first.start}, ${first.end}]. This is the active merged span future intervals must test.`,
    changed: ["merged", "commits"],
    action: { type: "push", target: "merged", value: [first.start, first.end], phase: "interval_seed", ...actionState({ sortedReady: true }) },
  });

  for (let index = 1; index < orderedTokens.length; index += 1) {
    const candidate = orderedTokens[index];
    const tail = merged[merged.length - 1];
    activeIndex = index;
    activeMergedIndex = merged.length - 1;
    overlap = candidate.start <= tail.end;
    previousEnd = tail.end;
    nextEnd = Math.max(tail.end, candidate.end);
    comparisons += 1;
    const compareStep = addStep({
      line: 9,
      event: "comparison",
      description: overlap
        ? `Compare ${candidate.start} <= ${tail.end}: true. [${candidate.start}, ${candidate.end}] touches the active span [${tail.start}, ${tail.end}], so they belong together.`
        : `Compare ${candidate.start} <= ${tail.end}: false. A gap separates [${candidate.start}, ${candidate.end}] from [${tail.start}, ${tail.end}].`,
      changed: ["comparisons"],
      action: { type: "compare", left: candidate.start, right: tail.end, result: overlap, phase: "interval_compare", ...actionState({ sortedReady: true }) },
    });

    if (index === 1) {
      b.prompt({
        stepId: compareStep.id,
        type: "predict_condition",
        question: `Does [${candidate.start}, ${candidate.end}] overlap the active span [${tail.start}, ${tail.end}]?`,
        target: { candidateStart: candidate.start, activeEnd: tail.end },
        answer: overlap ? "yes" : "no",
        choices: ["yes", "no"],
        explanation: `Intervals overlap exactly when the next start (${candidate.start}) is at most the active end (${tail.end}).`,
      });
    }

    if (overlap) {
      const before = tail.end;
      tail.end = Math.max(tail.end, candidate.end);
      tail.contributors.push(candidate.id);
      merges += 1;
      nextEnd = tail.end;
      addStep({
        line: 10,
        event: "array_write",
        description: tail.end === before
          ? `Absorb [${candidate.start}, ${candidate.end}] without extending the boundary: max(${before}, ${candidate.end}) = ${tail.end}. It is fully contained.`
          : `Extend the active end: max(${before}, ${candidate.end}) = ${tail.end}. The merged span is now [${tail.start}, ${tail.end}].`,
        changed: ["merged", "merges"],
        action: { type: "array_write", target: `merged[${activeMergedIndex}]`, index: activeMergedIndex, value: [tail.start, tail.end], phase: "interval_merge", ...actionState({ sortedReady: true }) },
      });
    } else {
      const segment: MergedIntervalState = { id: `merged-${merged.length}`, start: candidate.start, end: candidate.end, contributors: [candidate.id] };
      merged.push(segment);
      activeMergedIndex = merged.length - 1;
      commits += 1;
      nextEnd = candidate.end;
      addStep({
        line: 12,
        event: "array_write",
        description: `Commit a new span [${candidate.start}, ${candidate.end}] after the gap. It becomes the new active tail.`,
        changed: ["merged", "commits"],
        action: { type: "push", target: "merged", value: [candidate.start, candidate.end], phase: "interval_commit", ...actionState({ sortedReady: true }) },
      });
    }
  }

  activeIndex = null;
  activeMergedIndex = null;
  overlap = null;
  previousEnd = null;
  nextEnd = null;
  const finalIntervals = merged.map((segment) => [segment.start, segment.end] as Interval);
  const output = `Merged intervals: [${finalIntervals.map(intervalLabel).join(", ")}]`;
  addStep({
    line: 13,
    event: "program_end",
    description: `Sweep complete: ${original.length} input intervals became ${finalIntervals.length} disjoint spans after ${comparisons} comparisons and ${merges} overlap merges.`,
    output,
    changed: ["merged"],
    action: { type: "output_write", value: cloneIntervals(finalIntervals), phase: "interval_complete", ...actionState({ sortedReady: true }) },
  });
  return b.build();
}
