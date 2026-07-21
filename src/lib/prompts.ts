import type { InputMode } from "../types";

const JSON_RULES = `
只返回一个合法 JSON 对象，不要 Markdown、代码围栏、解释或额外文字。
所有字段必须存在；没有内容时使用空数组或空字符串。
音标统一使用 IPA，并包含 / / 或 [ ]。
例句必须恰好 3 个，每个包含 source（目标词所在语言的例句）和 translation（另一语言翻译）。`;

const MODE_SCHEMAS: Record<Exclude<InputMode, "auto">, string> = {
  foreign_to_zh: `识别非中文、非英文语言并翻译成自然中文。
JSON: {"detected_mode":"foreign_to_zh","detected_language":"语言名称","translation":"中文译文"}`,
  zh_term: `输入是中文单词或短语。给出最贴合语境的英文词条。
JSON: {"detected_mode":"zh_term","english":"英文","phonetic":"IPA","part_of_speech":"词性","examples":[{"source":"英文例句","translation":"中文翻译"}]}`,
  zh_sentence: `输入是中文或中英混合句子。翻译为完整、自然、全英文句子。不能原样保留输入中的英文片段；必须结合整句语境重新组织。note 只在存在重要翻译取舍时填写。
JSON: {"detected_mode":"zh_sentence","translation":"完整英文译文","note":""}`,
  en_term: `输入是英文单词或短语。进行词典式解析。
JSON: {"detected_mode":"en_term","term":"规范词形","phonetic":"IPA","meanings":["中文释义"],"morphology":"词根词缀分析；无法可靠拆分时如实说明","family_words":[{"word":"同族词","meaning":"中文释义"}],"examples":[{"source":"英文例句","translation":"中文翻译"}]}`,
  en_sentence: `检查英文句子的语法和用词。若有错，is_correct=false，给出完整 corrected 和 issues，不要把翻译作为主要结果；若正确，is_correct=true，corrected 为空字符串、issues 为空数组并翻译成中文。
JSON: {"detected_mode":"en_sentence","is_correct":true,"corrected":"","translation":"中文翻译","issues":[{"original":"错误片段","replacement":"替换内容","reason":"中文原因"}]}`
};

const AUTO_RULES = `先且只根据当前输入选择一种模式：
- foreign_to_zh：主体为非中文、非英文语言；
- zh_term：中文单词或短语，不构成完整句子；
- zh_sentence：中文完整句子，或包含中英文的混合句子；
- en_term：英文单词或短语，不构成完整句子；
- en_sentence：英文完整句子。
短输入也按语义结构判断，不要仅依赖标点。然后严格按所选模式的 JSON 结构输出。`;

export function buildSystemPrompt(mode: InputMode): string {
  const role = "你是严谨的中英翻译、词典与英文校对引擎。每次任务完全独立，忽略并不得推测任何其他对话或输入。";
  if (mode === "auto") {
    return `${role}\n${AUTO_RULES}\n${Object.values(MODE_SCHEMAS).join("\n")}\n${JSON_RULES}`;
  }
  return `${role}\n用户已明确指定模式，不要改为其他模式。\n${MODE_SCHEMAS[mode]}\n${JSON_RULES}`;
}

export function buildMessages(text: string, mode: InputMode) {
  return [
    { role: "system" as const, content: buildSystemPrompt(mode) },
    { role: "user" as const, content: `仅处理以下当前输入：\n<current_input>${text}</current_input>` }
  ];
}
