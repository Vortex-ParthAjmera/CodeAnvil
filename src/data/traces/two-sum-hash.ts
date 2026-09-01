import type { MemoryItem, TraceDocument } from "../../types/trace";
import { arrayMemory, arrayVisual, TraceBuilder } from "./builders";

export const TWO_SUM_HASH_CODE = `arr = [4, 7, 1, 8, 3, 6]
target = 10
seen = {}
for i, value in enumerate(arr):
    need = target - value
    if need in seen:
        print(seen[need], i)
        break
    seen[value] = i
else:
    print("No pair")`;

const DEFAULT_VALUES = [4, 7, 1, 8, 3, 6];

export interface TwoSumHashEntrySnapshot {
  value: number;
  index: number;
  order: number;
}

function snapshotEntries(seen: Map<number, number>): TwoSumHashEntrySnapshot[] {
  return [...seen.entries()].map(([value, index], order) => ({ value, index, order }));
}

function seenMemory(entries: TwoSumHashEntrySnapshot[], activeOrder: number | null): MemoryItem {
  return {
    id: "seen",
    label: "seen (value -> index)",
    type: "list",
    value: entries.map((entry) => `${entry.value} -> ${entry.index}`),
    highlights: activeOrder === null ? [] : [{ index: activeOrder, role: "active" }],
  };
}

/**
 * Builds the one-pass hash-map version of Two Sum. Lookup and insertion are
 * separate phases so the animation can show why duplicate values never match
 * the same array position with itself.
 */
export function buildTwoSumHashTrace(
  input: number[] = DEFAULT_VALUES,
  target = 10,
  code = TWO_SUM_HASH_CODE,
  language = "python",
): TraceDocument {
  const values = input.length > 0 ? [...input] : [0];
  const seen = new Map<number, number>();
  const processedIndices: number[] = [];
  const b = new TraceBuilder({
    title: "Two Sum (Unsorted / Hashing)",
    code,
    topic: "arrays",
    difficulty: "beginner",
    language,
    durationSeconds: 105,
  });

  let lookups = 0;
  let stores = 0;

  const variables = (
    activeIndex: number,
    complement: number | null,
    pairIndices: [number, number] | null,
  ) => ({
    algorithm: "two-sum-hash",
    arr: `[${values.join(", ")}]`,
    target,
    i: activeIndex,
    value: activeIndex >= 0 ? values[activeIndex] : null,
    complement,
    seen: `{${snapshotEntries(seen).map((entry) => `${entry.value}: ${entry.index}`).join(", ")}}`,
    seen_size: seen.size,
    lookups,
    stores,
    pair: pairIndices ? `[${pairIndices.join(", ")}]` : "waiting",
  });

  const memory = (
    activeIndex: number,
    pairIndices: [number, number] | null,
    activeEntryOrder: number | null = null,
  ) => {
    const highlights = processedIndices.map((index) => ({ index, role: "stored" }));
    if (activeIndex >= 0) highlights.push({ index: activeIndex, role: "reading" });
    if (pairIndices) {
      highlights.push({ index: pairIndices[0], role: "found" });
      highlights.push({ index: pairIndices[1], role: "found" });
    }
    return [
      arrayMemory("arr", "arr", [...values], highlights),
      seenMemory(snapshotEntries(seen), activeEntryOrder),
    ];
  };

  const actionState = (
    activeIndex: number,
    complement: number | null,
    hitIndex: number | null,
    pairIndices: [number, number] | null,
  ) => ({
    activeIndex,
    currentValue: activeIndex >= 0 ? values[activeIndex] : null,
    complement,
    hitIndex,
    pairIndices,
    entries: snapshotEntries(seen),
    processedIndices: [...processedIndices],
    sumTarget: target,
    lookups,
    stores,
  });

  b.step({
    line: 3,
    event: "program_start",
    description: `Create an empty map. It will remember each earlier value and the index where that value appeared.`,
    variables: variables(-1, null, null),
    memory: memory(-1, null),
    visual: arrayVisual("arr"),
    changed: { variables: ["seen", "seen_size"] },
    actions: [{
      type: "assignment",
      phase: "two_sum_hash_start",
      target: "seen",
      value: {},
      ...actionState(-1, null, null, null),
    }],
  });

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    const complement = target - value;

    b.step({
      line: 5,
      event: "array_read",
      description: `Read arr[${i}] = ${value}. To reach ${target}, this value needs a partner equal to ${complement}.`,
      variables: variables(i, complement, null),
      memory: memory(i, null),
      visual: arrayVisual("arr"),
      changed: { variables: ["i", "value", "complement"] },
      actions: [{
        type: "array_read",
        phase: "two_sum_hash_read",
        array: "arr",
        index: i,
        value,
        ...actionState(i, complement, null, null),
      }],
    });

    lookups += 1;
    const hitIndex = seen.get(complement) ?? null;
    const hitEntryOrder = hitIndex === null
      ? null
      : snapshotEntries(seen).find((entry) => entry.value === complement)?.order ?? null;

    const lookupStep = b.step({
      line: 6,
      event: "comparison",
      description: hitIndex === null
        ? `Look up ${complement} in seen. It is absent, so no earlier value can pair with arr[${i}] yet.`
        : `Look up ${complement} in seen. It is stored at index ${hitIndex}, so ${values[hitIndex]} + ${value} = ${target}.`,
      variables: variables(i, complement, hitIndex === null ? null : [hitIndex, i]),
      memory: memory(i, hitIndex === null ? null : [hitIndex, i], hitEntryOrder),
      visual: arrayVisual("arr"),
      changed: { variables: ["lookups", "pair"] },
      actions: [{
        type: "map_lookup",
        phase: hitIndex === null ? "two_sum_hash_lookup_miss" : "two_sum_hash_lookup_hit",
        key: complement,
        found: hitIndex !== null,
        ...actionState(i, complement, hitIndex, hitIndex === null ? null : [hitIndex, i]),
      }],
    });

    if (i === 0) {
      b.prompt({
        stepId: lookupStep.id,
        type: "predict_condition",
        question: `Before storing ${value}, is its needed partner ${complement} already in the empty map?`,
        target: { key: complement, map: "seen" },
        answer: "No",
        choices: ["No", "Yes"],
        explanation: `The lookup happens before insertion. The map is still empty, so ${complement} is not present.`,
      });
    }

    if (hitIndex !== null) {
      const pairIndices: [number, number] = [hitIndex, i];
      b.step({
        line: 7,
        event: "program_end",
        description: `Return indices [${hitIndex}, ${i}]. They point to ${values[hitIndex]} and ${value}, whose sum is exactly ${target}.`,
        variables: variables(i, complement, pairIndices),
        output: `Pair indices: [${pairIndices.join(", ")}]`,
        memory: memory(i, pairIndices, hitEntryOrder),
        visual: arrayVisual("arr"),
        changed: { output: true, variables: ["pair"] },
        actions: [{
          type: "output_write",
          phase: "two_sum_hash_found",
          value: pairIndices,
          ...actionState(i, complement, hitIndex, pairIndices),
        }],
      });
      return b.build();
    }

    seen.set(value, i);
    if (!processedIndices.includes(i)) processedIndices.push(i);
    stores += 1;
    const storedOrder = snapshotEntries(seen).find((entry) => entry.value === value)?.order ?? null;

    b.step({
      line: 9,
      event: "assignment",
      description: `Store ${value} -> ${i}. A later value can now find index ${i} by looking up the complement ${value}.`,
      variables: variables(i, complement, null),
      memory: memory(i, null, storedOrder),
      visual: arrayVisual("arr"),
      changed: { variables: ["seen", "seen_size", "stores"] },
      actions: [{
        type: "map_set",
        phase: "two_sum_hash_store",
        key: value,
        value: i,
        storedValue: value,
        storedIndex: i,
        storedOrder,
        ...actionState(i, complement, null, null),
      }],
    });
  }

  b.step({
    line: 11,
    event: "program_end",
    description: `Every value was checked and stored, but no two different indices sum to ${target}.`,
    variables: variables(values.length - 1, target - values[values.length - 1], null),
    output: "No pair",
    memory: memory(-1, null),
    visual: arrayVisual("arr"),
    changed: { output: true },
    actions: [{
      type: "output_write",
      phase: "two_sum_hash_not_found",
      value: null,
      ...actionState(values.length - 1, target - values[values.length - 1], null, null),
    }],
  });

  return b.build();
}
