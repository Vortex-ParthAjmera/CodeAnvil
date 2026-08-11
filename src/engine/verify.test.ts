import { describe, expect, it } from "vitest";
import {
  verifyAll,
  verifyCatalog,
  verifyDetection,
  verifyPracticePrompts,
  verifySimulators,
} from "./verify";
import { EXAMPLES } from "../data/examples";

describe("verification gate", () => {
  it("every example trace is valid against the schema", () => {
    const res = verifyCatalog();
    expect(res.ok, res.errors.join("\n")).toBe(true);
    expect(res.checked).toBe(EXAMPLES.length);
  });

  it("sorting simulators record correct, replayable, sorted runs", () => {
    const res = verifySimulators();
    expect(res.ok, res.errors.join("\n")).toBe(true);
    expect(res.checked).toBeGreaterThan(30);
  });

  it("detection round-trips known patterns and storyboards into valid traces", () => {
    const res = verifyDetection();
    expect(res.ok, res.errors.join("\n")).toBe(true);
  });

  it("every practice prompt reveals its answer only after being asked", () => {
    const res = verifyPracticePrompts();
    expect(res.ok, res.errors.join("\n")).toBe(true);
    expect(res.checked).toBeGreaterThanOrEqual(9);
  });

  it("the whole gate passes end to end", () => {
    const res = verifyAll();
    expect(res.ok, res.errors.join("\n")).toBe(true);
    expect(res.checked).toBeGreaterThan(40);
  });
});
