import type { MemoryItem, TraceAction, TraceStep } from "../types/trace";

export type MajorityVoteOperation =
  | "start"
  | "inspect"
  | "select"
  | "support"
  | "cancel"
  | "candidate"
  | "verify-start"
  | "verify-match"
  | "verify-miss"
  | "verified"
  | "rejected";

export type MajorityVoteTokenRole =
  | "idle"
  | "processed"
  | "current"
  | "supporter"
  | "cancelled"
  | "candidate-match"
  | "verified"
  | "verify-miss";

export interface MajorityVoteTokenModel {
  id: string;
  value: number;
  index: number;
  role: MajorityVoteTokenRole;
}

export interface MajorityVoteSceneModel {
  item: MemoryItem;
  operation: MajorityVoteOperation;
  values: number[];
  tokens: MajorityVoteTokenModel[];
  currentIndex: number;
  currentValue: number | null;
  candidate: number | null;
  candidateBefore: number | null;
  balance: number;
  balanceBefore: number;
  decision: "select" | "support" | "cancel" | "verify-match" | "verify-miss" | null;
  supporterIndices: number[];
  cancelledPairs: Array<[number, number]>;
  cancelPair: [number, number] | null;
  verifying: boolean;
  verificationCount: number;
  verifiedIndices: number[];
  required: number;
  isMajority: boolean | null;
  inspections: number;
  headline: string;
  detail: string;
  equation: string | null;
  actionLabel: string;
  resultLabel: string;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function integer(value: unknown): number | null {
  const parsed = finiteNumber(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function numberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map(finiteNumber).filter((entry): entry is number => entry !== null);
}

function integerPairs(value: unknown): Array<[number, number]> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    const pair = numberArray(candidate);
    return pair.length === 2 && pair.every(Number.isInteger) ? [[pair[0], pair[1]] as [number, number]] : [];
  });
}

function integerPair(value: unknown): [number, number] | null {
  const pair = numberArray(value);
  return pair.length === 2 && pair.every(Number.isInteger) ? [pair[0], pair[1]] : null;
}

function phaseAction(step: TraceStep): TraceAction | undefined {
  return step.actions?.find(
    (action) => typeof action.phase === "string" && action.phase.startsWith("majority_"),
  );
}

function operationForPhase(phase: string): MajorityVoteOperation {
  const operations: Record<string, MajorityVoteOperation> = {
    majority_start: "start",
    majority_inspect: "inspect",
    majority_select: "select",
    majority_support: "support",
    majority_cancel: "cancel",
    majority_candidate: "candidate",
    majority_verify_start: "verify-start",
    majority_verify_match: "verify-match",
    majority_verify_miss: "verify-miss",
    majority_verified: "verified",
    majority_rejected: "rejected",
  };
  return operations[phase] ?? "start";
}

function parseTokens(value: unknown): Array<{ id: string; value: number; index: number }> {
  if (!Array.isArray(value)) return [];
  const parsed = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const record = candidate as Record<string, unknown>;
    const tokenValue = finiteNumber(record.value);
    const index = integer(record.index);
    if (typeof record.id !== "string" || tokenValue === null || index === null) continue;
    parsed.push({ id: record.id, value: tokenValue, index });
  }
  return parsed;
}

export function isMajorityVoteTraceStep(step: TraceStep): boolean {
  if (step.visual?.type !== "array") return false;
  if (step.variables.algorithm === "majority-vote") return true;
  return phaseAction(step) !== undefined;
}

export function getMajorityVoteSceneModel(step: TraceStep): MajorityVoteSceneModel | null {
  if (!isMajorityVoteTraceStep(step)) return null;
  const itemId = step.visual?.type === "array" ? step.visual.itemId : "arr";
  const item = step.memory?.find((candidate) => candidate.id === itemId && candidate.type === "array");
  if (!item) return null;

  const action = phaseAction(step);
  if (!action) return null;
  const operation = operationForPhase(typeof action.phase === "string" ? action.phase : "majority_start");
  const values = numberArray(action.values);
  const rawTokens = parseTokens(action.tokens);
  if (values.length !== rawTokens.length) return null;

  const currentIndex = integer(action.currentIndex) ?? -1;
  const candidate = finiteNumber(action.candidate);
  const candidateBefore = finiteNumber(action.candidateBefore);
  const balance = integer(action.balance) ?? 0;
  const balanceBefore = integer(action.balanceBefore) ?? balance;
  const decision = action.decision === "select" || action.decision === "support" || action.decision === "cancel" || action.decision === "verify-match" || action.decision === "verify-miss"
    ? action.decision
    : null;
  const supporterIndices = numberArray(action.supporterIndices).filter(Number.isInteger);
  const supporterSet = new Set(supporterIndices);
  const cancelledPairs = integerPairs(action.cancelledPairs);
  const cancelledSet = new Set(cancelledPairs.flat());
  const cancelPair = integerPair(action.cancelPair);
  const verifying = action.verifying === true;
  const verificationCount = integer(action.verificationCount) ?? 0;
  const verifiedIndices = numberArray(action.verifiedIndices).filter(Number.isInteger);
  const verifiedSet = new Set(verifiedIndices);
  const required = integer(action.required) ?? Math.floor(values.length / 2) + 1;
  const isMajority = typeof action.isMajority === "boolean" ? action.isMajority : null;
  const inspections = integer(action.inspections) ?? 0;

  const tokens = rawTokens.map((token): MajorityVoteTokenModel => {
    let role: MajorityVoteTokenRole = "idle";
    if (!verifying && currentIndex >= 0 && token.index < currentIndex) role = "processed";
    if (!verifying && cancelledSet.has(token.index)) role = "cancelled";
    if (!verifying && supporterSet.has(token.index)) role = "supporter";
    if (verifying && candidate !== null && token.value === candidate) role = "candidate-match";
    if (verifying && currentIndex >= 0 && token.index < currentIndex && token.value !== candidate) role = "verify-miss";
    if (verifying && verifiedSet.has(token.index)) role = "verified";
    if (token.index === currentIndex) role = "current";
    return { ...token, role };
  });

  const currentValue = currentIndex >= 0 ? values[currentIndex] ?? null : null;
  let headline = "Cancel opposing values in pairs";
  let detail = "The balance stores unmatched support, not the candidate's total frequency.";
  let equation: string | null = null;
  let actionLabel = "prepare";

  if (operation === "start") {
    headline = "One candidate, one balance";
    detail = "Equal values add support; different values cancel one supporter. A strict majority cannot be fully cancelled.";
    equation = "candidate = none | balance = 0";
    actionLabel = "begin cancellation pass";
  } else if (operation === "inspect") {
    headline = `Read ${currentValue} at index ${currentIndex}`;
    detail = balance === 0
      ? "No unmatched vote remains, so this value will nominate the next candidate."
      : `Compare it with candidate ${candidate}. The current unmatched balance is ${balance}.`;
    equation = balance === 0 ? "balance = 0 -> nominate" : `${currentValue} ${currentValue === candidate ? "=" : "!="} ${candidate}`;
    actionLabel = "inspect next vote";
  } else if (operation === "select") {
    headline = `Nominate ${candidate}`;
    detail = candidateBefore === null
      ? "The first value starts a fresh candidate group with one unmatched supporter."
      : `Previous pairs left no advantage. ${candidate} now starts a fresh group with this vote.`;
    equation = `candidate = ${candidate} | balance 0 -> 1`;
    actionLabel = "new candidate";
  } else if (operation === "support") {
    headline = `${currentValue} supports candidate ${candidate}`;
    detail = "Matching the candidate adds one uncancelled supporter to the balance tower.";
    equation = `${balanceBefore} + 1 = ${balance}`;
    actionLabel = "add support";
  } else if (operation === "cancel") {
    headline = `${currentValue} cancels one ${candidate} vote`;
    detail = balance === 0
      ? "The candidate's unmatched advantage is now empty. The next value may nominate a new candidate."
      : `${balance} unmatched ${candidate} vote${balance === 1 ? " remains" : "s remain"} in the scanned prefix.`;
    equation = `${balanceBefore} - 1 = ${balance}`;
    actionLabel = "pair neutralized";
  } else if (operation === "candidate") {
    headline = candidate === null ? "No candidate survived" : `${candidate} survives the first pass`;
    detail = candidate === null
      ? "The empty input has no candidate to test."
      : "Cancellation guarantees only a possible majority. A second pass must count its real occurrences.";
    equation = candidate === null ? "candidate = none" : `candidate = ${candidate} | balance = ${balance}`;
    actionLabel = "candidate, not proof";
  } else if (operation === "verify-start") {
    headline = candidate === null ? "Nothing to verify" : `Prove candidate ${candidate}`;
    detail = candidate === null
      ? "Without any values, no strict majority can exist."
      : `Count actual occurrences from scratch. A majority needs ${required} of ${values.length} positions.`;
    equation = `occurrences = 0 | required = ${required}`;
    actionLabel = "begin proof pass";
  } else if (operation === "verify-match") {
    headline = `${currentValue} matches candidate ${candidate}`;
    detail = `Verified support reaches ${verificationCount}/${required}. Cancellation balance is no longer used.`;
    equation = `occurrences = ${verificationCount}`;
    actionLabel = "count real occurrence";
  } else if (operation === "verify-miss") {
    headline = `${currentValue} is not candidate ${candidate}`;
    detail = `The verified count stays ${verificationCount}/${required}; continue through every value.`;
    equation = `occurrences = ${verificationCount}`;
    actionLabel = "do not count";
  } else if (operation === "verified") {
    headline = `${candidate} is the majority`;
    detail = `${verificationCount} occurrences reach the strict threshold ${required}. The result is now proven.`;
    equation = `${verificationCount} >= ${required}`;
    actionLabel = "majority verified";
  } else if (operation === "rejected") {
    headline = "No majority element";
    detail = candidate === null
      ? "There are no values to form a strict majority."
      : `Candidate ${candidate} appears ${verificationCount} time${verificationCount === 1 ? "" : "s"}, below the required ${required}.`;
    equation = `${verificationCount} < ${required}`;
    actionLabel = "candidate rejected";
  }

  return {
    item,
    operation,
    values,
    tokens,
    currentIndex,
    currentValue,
    candidate,
    candidateBefore,
    balance,
    balanceBefore,
    decision,
    supporterIndices,
    cancelledPairs,
    cancelPair,
    verifying,
    verificationCount,
    verifiedIndices,
    required,
    isMajority,
    inspections,
    headline,
    detail,
    equation,
    actionLabel,
    resultLabel: operation === "verified" ? String(candidate) : operation === "rejected" ? "none" : candidate === null ? "-" : String(candidate),
  };
}
