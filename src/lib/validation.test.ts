import { describe, expect, it } from "vitest";
import { parseModelJson, validateResult } from "./validation";

describe("model result validation", () => {
  it("accepts JSON wrapped in a model code fence", () => {
    const raw = '```json\n{"detected_mode":"foreign_to_zh","detected_language":"日语","translation":"早上好"}\n```';
    expect(validateResult(parseModelJson(raw))).toMatchObject({ translation: "早上好" });
  });

  it("requires exactly three examples", () => {
    expect(() => validateResult({
      detected_mode: "zh_term",
      english: "project",
      phonetic: "/ˈprɒdʒekt/",
      part_of_speech: "noun",
      examples: []
    })).toThrow(/结构不完整/);
  });

  it("accepts a grammar correction", () => {
    expect(validateResult({
      detected_mode: "en_sentence",
      is_correct: false,
      corrected: "She goes to work.",
      translation: "",
      issues: [{ original: "go", replacement: "goes", reason: "主谓一致" }]
    })).toMatchObject({ is_correct: false });
  });
});
