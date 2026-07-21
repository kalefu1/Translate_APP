export const MODE_OPTIONS = [
  "auto",
  "foreign_to_zh",
  "zh_term",
  "zh_sentence",
  "en_term",
  "en_sentence"
] as const;

export type InputMode = (typeof MODE_OPTIONS)[number];
export type ResultMode = Exclude<InputMode, "auto">;

export const MODE_LABELS: Record<InputMode, string> = {
  auto: "自动识别",
  foreign_to_zh: "其他语言 → 中文",
  zh_term: "中文词语 → 英文词条",
  zh_sentence: "中文 / 混合句 → 英文",
  en_term: "英文词语解析",
  en_sentence: "英文句子检查"
};

export interface Example {
  source: string;
  translation: string;
}

interface BaseResult {
  detected_mode: ResultMode;
}

export interface ForeignResult extends BaseResult {
  detected_mode: "foreign_to_zh";
  detected_language: string;
  translation: string;
}

export interface ChineseTermResult extends BaseResult {
  detected_mode: "zh_term";
  english: string;
  phonetic: string;
  part_of_speech: string;
  examples: Example[];
}

export interface ChineseSentenceResult extends BaseResult {
  detected_mode: "zh_sentence";
  translation: string;
  note?: string;
}

export interface FamilyWord {
  word: string;
  meaning: string;
}

export interface EnglishTermResult extends BaseResult {
  detected_mode: "en_term";
  term: string;
  phonetic: string;
  meanings: string[];
  morphology: string;
  family_words: FamilyWord[];
  examples: Example[];
}

export interface GrammarIssue {
  original: string;
  replacement: string;
  reason: string;
}

export interface EnglishSentenceResult extends BaseResult {
  detected_mode: "en_sentence";
  is_correct: boolean;
  corrected?: string;
  translation?: string;
  issues: GrammarIssue[];
}

export type TranslationResult =
  | ForeignResult
  | ChineseTermResult
  | ChineseSentenceResult
  | EnglishTermResult
  | EnglishSentenceResult;

export interface ModelProfile {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  rememberKey: boolean;
  verified: boolean;
}

export type StoredModelProfile = Omit<ModelProfile, "apiKey">;

export interface AppErrorShape {
  code: "CONFIG" | "NETWORK" | "CORS" | "AUTH" | "RATE_LIMIT" | "MODEL" | "FORMAT" | "ABORTED";
  message: string;
  detail?: string;
}
