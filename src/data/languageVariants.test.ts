import { describe, expect, it } from "vitest";
import type { TraceDocument } from "../types";
import { codeLanguages, getTraceCodeVariant, lineForLanguage } from "./languageVariants";
import { traces } from "./traces";

describe("languageVariants", () => {
  it("exposes Python plus seven reference languages including C", () => {
    expect(codeLanguages.map((language) => language.id)).toEqual([
      "python",
      "javascript",
      "typescript",
      "java",
      "cpp",
      "c",
      "csharp",
      "go",
    ]);
  });

  it("maps validated bubble sort source lines to the C reference view", () => {
    const bubble = traces.find((trace) => trace.title === "Bubble Sort");
    expect(bubble).toBeTruthy();
    const variant = getTraceCodeVariant(bubble!, "c");
    expect(variant.extension).toBe("c");
    expect(variant.code).toContain("#include <stdio.h>");
    expect(lineForLanguage(bubble!, "c", 6)).toBe(12);
  });

  it("falls back to editable Python for custom traces without pretending to parse another language", () => {
    const customTrace: TraceDocument = { ...traces[0], title: "Custom Python Trace", metadata: { ...traces[0].metadata, topic: "custom" } };
    const variant = getTraceCodeVariant(customTrace, "go");
    expect(variant.language).toBe("python");
    expect(variant.extension).toBe("py");
    expect(variant.code).toBe(customTrace.source.code);
  });
});
