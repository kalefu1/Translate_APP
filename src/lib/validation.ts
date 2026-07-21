import type { TranslationResult, ResultMode } from "../types";

const MODES = new Set<ResultMode>([
  "foreign_to_zh",
  "zh_term",
  "zh_sentence",
  "en_term",
  "en_sentence"
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function validExamples(value: unknown): boolean {
  return Array.isArray(value) && value.length === 3 && value.every(
    (item) => isObject(item) && isString(item.source) && isString(item.translation)
  );
}

export function parseModelJson(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

export function validateResult(value: unknown): TranslationResult {
  if (!isObject(value) || !isString(value.detected_mode) || !MODES.has(value.detected_mode as ResultMode)) {
    throw new Error("缺少有效的 detected_mode");
  }

  switch (value.detected_mode) {
    case "foreign_to_zh":
      if (!isString(value.detected_language) || !isString(value.translation)) break;
      return value as unknown as TranslationResult;
    case "zh_term":
      if (!isString(value.english) || !isString(value.phonetic) || !isString(value.part_of_speech) || !validExamples(value.examples)) break;
      return value as unknown as TranslationResult;
    case "zh_sentence":
      if (!isString(value.translation) || (value.note !== undefined && !isString(value.note))) break;
      return value as unknown as TranslationResult;
    case "en_term":
      if (
        !isString(value.term) || !isString(value.phonetic) || !isString(value.morphology) ||
        !Array.isArray(value.meanings) || !value.meanings.every(isString) ||
        !Array.isArray(value.family_words) || !value.family_words.every((x) => isObject(x) && isString(x.word) && isString(x.meaning)) ||
        !validExamples(value.examples)
      ) break;
      return value as unknown as TranslationResult;
    case "en_sentence":
      if (
        typeof value.is_correct !== "boolean" ||
        (value.corrected !== undefined && !isString(value.corrected)) ||
        (value.translation !== undefined && !isString(value.translation)) ||
        !Array.isArray(value.issues) ||
        !value.issues.every((x) => isObject(x) && isString(x.original) && isString(x.replacement) && isString(x.reason))
      ) break;
      return value as unknown as TranslationResult;
  }
  throw new Error(`模型返回的 ${value.detected_mode} 结构不完整`);
}
