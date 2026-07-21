import { describe, expect, it } from "vitest";
import { buildMessages } from "./prompts";

describe("independent request messages", () => {
  it("never includes content from a previous input", () => {
    const first = buildMessages("这是第一个秘密输入", "auto");
    const second = buildMessages("This is a new sentence.", "en_sentence");

    expect(JSON.stringify(first)).toContain("第一个秘密输入");
    expect(JSON.stringify(second)).not.toContain("第一个秘密输入");
    expect(second).toHaveLength(2);
    expect(second[1].content).toContain("This is a new sentence.");
  });

  it("locks a manually selected mode", () => {
    const messages = buildMessages("项目管理", "zh_term");
    expect(messages[0].content).toContain("用户已明确指定模式");
    expect(messages[0].content).toContain('"detected_mode":"zh_term"');
  });
});
