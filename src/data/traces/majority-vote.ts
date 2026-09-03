import type { MemoryItem, TraceAction } from "../../types/trace";
import { arrayMemory, arrayVisual, TraceBuilder } from "./builders";

export const MAJORITY_VOTE_DEFAULT = [2, 2, 1, 1, 1, 2, 2];

export const MAJORITY_VOTE_CODE = `arr = [2, 2, 1, 1, 1, 2, 2]
candidate = None
balance = 0
for value in arr:
    if balance == 0:
        candidate = value
    if value == candidate:
        balance += 1
    else:
        balance -= 1
occurrences = sum(value == candidate for value in arr)
if candidate is not None and occurrences > len(arr) // 2:
    print("Majority:", candidate)
else:
    print("No majority element")`;

export interface MajorityVoteTokenState {
  id: string;
  value: number;
  index: number;
}

type VoteDecision = "select" | "support" | "cancel" | "verify-match" | "verify-miss" | null;

interface VoteStateOptions {
  currentIndex?: number;
  candidate: number | null;
  candidateBefore?: number | null;
  balance: number;
  balanceBefore?: number;
  decision?: VoteDecision;
  supporterIndices: number[];
  cancelledPairs: Array<[number, number]>;
  cancelPair?: [number, number] | null;
  verifying?: boolean;
  verificationCount?: number;
  verifiedIndices?: number[];
  isMajority?: boolean | null;
}

function resultText(candidate: number | null, isMajority: boolean): string {
  return isMajority && candidate !== null ? `Majority: ${candidate}` : "No majority element";
}

/** Records Boyer-Moore cancellation and the proof pass required for arbitrary input. */
export function buildMajorityVoteTrace(
  input: number[] = MAJORITY_VOTE_DEFAULT,
  code = MAJORITY_VOTE_CODE,
  language = "python",
) {
  const values = [...input];
  const tokens: MajorityVoteTokenState[] = values.map((value, index) => ({
    id: `value-${index}`,
    value,
    index,
  }));
  const b = new TraceBuilder({
    title: "Moore's Voting Algorithm",
    code,
    topic: "arrays",
    difficulty: "intermediate",
    language,
    durationSeconds: 170,
  });

  let candidate: number | null = null;
  let balance = 0;
  let currentIndex = -1;
  let inspections = 0;
  let verificationCount = 0;
  const supporterIndices: number[] = [];
  const cancelledPairs: Array<[number, number]> = [];
  const cancelledIndices = new Set<number>();
  const verifiedIndices: number[] = [];
  const required = Math.floor(values.length / 2) + 1;

  const variables = (verifying = false) => ({
    algorithm: "majority-vote",
    arr: [...values],
    candidate,
    balance,
    index: currentIndex >= 0 ? currentIndex : null,
    current: currentIndex >= 0 ? values[currentIndex] : null,
    phase: verifying ? "verification" : "candidate selection",
    occurrences: verificationCount,
    required,
    inspections,
  });

  const memory = (processedUntil = -1, verifying = false): MemoryItem[] => {
    const highlights: Array<{ index: number; role: string }> = [];
    for (let index = 0; index <= processedUntil; index += 1) {
      highlights.push({ index, role: verifying ? "verified-scan" : "processed" });
    }
    for (const index of cancelledIndices) highlights.push({ index, role: "cancelled" });
    for (const index of supporterIndices) highlights.push({ index, role: "supporter" });
    for (const index of verifiedIndices) highlights.push({ index, role: "verified" });
    if (currentIndex >= 0) highlights.push({ index: currentIndex, role: "current" });
    return [arrayMemory("arr", "arr", values, highlights)];
  };

  const actionState = ({
    currentIndex: stateIndex = currentIndex,
    candidate: stateCandidate,
    candidateBefore = stateCandidate,
    balance: stateBalance,
    balanceBefore = stateBalance,
    decision = null,
    supporterIndices: stateSupporters,
    cancelledPairs: statePairs,
    cancelPair = null,
    verifying = false,
    verificationCount: stateVerificationCount = verificationCount,
    verifiedIndices: stateVerifiedIndices = verifiedIndices,
    isMajority = null,
  }: VoteStateOptions) => ({
    values: [...values],
    tokens: tokens.map((token) => ({ ...token })),
    currentIndex: stateIndex,
    candidate: stateCandidate,
    candidateBefore,
    balance: stateBalance,
    balanceBefore,
    decision,
    supporterIndices: [...stateSupporters],
    cancelledPairs: statePairs.map((pair) => [...pair]),
    cancelPair: cancelPair ? [...cancelPair] : null,
    verifying,
    verificationCount: stateVerificationCount,
    verifiedIndices: [...stateVerifiedIndices],
    required,
    isMajority,
    inspections,
  });

  const step = ({
    line,
    event,
    description,
    action,
    processedUntil = currentIndex,
    verifying = false,
    output = "",
    changed = [],
  }: {
    line: number;
    event: string;
    description: string;
    action: TraceAction;
    processedUntil?: number;
    verifying?: boolean;
    output?: string;
    changed?: string[];
  }) => b.step({
    line,
    event,
    description,
    variables: variables(verifying),
    output,
    memory: memory(processedUntil, verifying),
    visual: arrayVisual("arr"),
    changed: { variables: changed, output: output !== "" },
    actions: [action],
  });

  step({
    line: 1,
    event: "program_start",
    description: `Scan ${values.length} values with one candidate and one balance. Opposing values cancel in pairs; a second pass will prove the survivor.`,
    processedUntil: -1,
    changed: ["arr", "candidate", "balance"],
    action: {
      type: "assignment",
      target: "arr",
      value: [...values],
      phase: "majority_start",
      ...actionState({ candidate, balance, supporterIndices, cancelledPairs }),
    },
  });

  for (let index = 0; index < values.length; index += 1) {
    currentIndex = index;
    inspections += 1;
    const value = values[index];
    const balanceBefore = balance;
    const candidateBefore = candidate;

    step({
      line: 4,
      event: "array_read",
      description: candidate === null
        ? `Read arr[${index}] = ${value}. No candidate is active yet.`
        : `Read arr[${index}] = ${value}. Compare it with candidate ${candidate}; balance is ${balance}.`,
      processedUntil: index - 1,
      changed: ["index", "current", "inspections"],
      action: {
        type: "array_read",
        index,
        phase: "majority_inspect",
        ...actionState({ currentIndex: index, candidate, balance, balanceBefore, supporterIndices, cancelledPairs }),
      },
    });

    if (balance === 0) {
      candidate = value;
      balance = 1;
      supporterIndices.length = 0;
      supporterIndices.push(index);
      const selectStep = step({
        line: 6,
        event: "assignment",
        description: `Balance was zero, so ${value} becomes the new candidate. Its own vote starts the balance at 1.`,
        processedUntil: index,
        changed: ["candidate", "balance"],
        action: {
          type: "assignment",
          target: "candidate",
          value: candidate,
          phase: "majority_select",
          ...actionState({ currentIndex: index, candidate, candidateBefore, balance, balanceBefore, decision: "select", supporterIndices, cancelledPairs }),
        },
      });
      if (index === 0) {
        b.prompt({
          stepId: selectStep.id,
          type: "choose_explanation",
          question: "What does balance = 1 mean here?",
          target: { candidate, balance },
          answer: "One uncancelled vote supports the candidate",
          choices: ["One uncancelled vote supports the candidate", "The candidate appears once total", "The candidate is already proven"],
          explanation: "Balance tracks unmatched support inside the scanned prefix, not the candidate's full frequency.",
        });
      }
    } else if (value === candidate) {
      balance += 1;
      supporterIndices.push(index);
      step({
        line: 8,
        event: "assignment",
        description: `${value} supports candidate ${candidate}. Add one unmatched vote: balance ${balanceBefore} -> ${balance}.`,
        processedUntil: index,
        changed: ["balance"],
        action: {
          type: "assignment",
          target: "balance",
          value: balance,
          phase: "majority_support",
          ...actionState({ currentIndex: index, candidate, candidateBefore, balance, balanceBefore, decision: "support", supporterIndices, cancelledPairs }),
        },
      });
    } else {
      const supporter = supporterIndices.pop();
      const cancelPair: [number, number] = [supporter ?? Math.max(0, index - 1), index];
      cancelledPairs.push(cancelPair);
      cancelledIndices.add(cancelPair[0]);
      cancelledIndices.add(cancelPair[1]);
      balance -= 1;
      step({
        line: 10,
        event: "comparison",
        description: `${value} opposes candidate ${candidate}. Pair it with one unmatched ${candidate} vote: balance ${balanceBefore} -> ${balance}.`,
        processedUntil: index,
        changed: ["balance"],
        action: {
          type: "compare",
          left: value,
          right: candidate,
          result: false,
          phase: "majority_cancel",
          ...actionState({ currentIndex: index, candidate, candidateBefore, balance, balanceBefore, decision: "cancel", supporterIndices, cancelledPairs, cancelPair }),
        },
      });
    }
  }

  currentIndex = -1;
  step({
    line: 11,
    event: "assignment",
    description: candidate === null
      ? "The first pass has no survivor because the input is empty."
      : `${candidate} survives the cancellation pass with balance ${balance}. This makes it a candidate, not yet a proven majority.`,
    processedUntil: values.length - 1,
    changed: ["candidate"],
    action: {
      type: "assignment",
      target: "candidate",
      value: candidate,
      phase: "majority_candidate",
      ...actionState({ currentIndex: -1, candidate, balance, supporterIndices, cancelledPairs }),
    },
  });

  step({
    line: 11,
    event: "assignment",
    description: candidate === null
      ? "There is no candidate to verify."
      : `Reset the count and verify candidate ${candidate}. It must appear at least ${required} time${required === 1 ? "" : "s"}.`,
    processedUntil: -1,
    verifying: true,
    changed: ["occurrences", "phase"],
    action: {
      type: "assignment",
      target: "occurrences",
      value: 0,
      phase: "majority_verify_start",
      ...actionState({ currentIndex: -1, candidate, balance, supporterIndices, cancelledPairs, verifying: true, verificationCount: 0, verifiedIndices: [] }),
    },
  });

  if (candidate !== null) {
    for (let index = 0; index < values.length; index += 1) {
      currentIndex = index;
      const matches = values[index] === candidate;
      if (matches) {
        verificationCount += 1;
        verifiedIndices.push(index);
      }
      step({
        line: 11,
        event: "comparison",
        description: matches
          ? `arr[${index}] is ${candidate}. Verified occurrences rise to ${verificationCount}/${required}.`
          : `arr[${index}] is ${values[index]}, not ${candidate}. The verified count stays ${verificationCount}/${required}.`,
        processedUntil: index,
        verifying: true,
        changed: matches ? ["index", "occurrences"] : ["index"],
        action: {
          type: "compare",
          left: values[index],
          right: candidate,
          result: matches,
          phase: matches ? "majority_verify_match" : "majority_verify_miss",
          ...actionState({ currentIndex: index, candidate, balance, decision: matches ? "verify-match" : "verify-miss", supporterIndices, cancelledPairs, verifying: true, verificationCount, verifiedIndices }),
        },
      });
    }
  }

  currentIndex = -1;
  const isMajority = candidate !== null && verificationCount >= required;
  const output = resultText(candidate, isMajority);
  step({
    line: isMajority ? 13 : 15,
    event: "program_end",
    description: isMajority
      ? `${candidate} appears ${verificationCount}/${values.length} times, reaching the strict majority threshold ${required}.`
      : candidate === null
        ? "No candidate exists, so the input has no majority element."
        : `${candidate} appears only ${verificationCount}/${values.length} times, below the required ${required}; no majority exists.`,
    processedUntil: values.length - 1,
    verifying: true,
    output,
    changed: ["occurrences"],
    action: {
      type: "output_write",
      value: isMajority ? candidate : null,
      phase: isMajority ? "majority_verified" : "majority_rejected",
      ...actionState({ currentIndex: -1, candidate, balance, supporterIndices, cancelledPairs, verifying: true, verificationCount, verifiedIndices, isMajority }),
    },
  });

  return b.build();
}
