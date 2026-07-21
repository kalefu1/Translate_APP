import { afterEach, describe, expect, it, vi } from "vitest";
import { testModel } from "./api";
import type { ModelProfile } from "../types";

const profile: ModelProfile = {
  id: "test-model",
  name: "测试模型",
  baseUrl: "https://example.com/v1",
  model: "compatible-model",
  apiKey: "test-key",
  rememberKey: false,
  verified: false
};

afterEach(() => vi.restoreAllMocks());

describe("model connection test", () => {
  it("accepts any valid non-standard model reply", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "连接正常" } }]
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await expect(testModel(profile)).resolves.toBeUndefined();
  });

  it("still rejects a malformed compatible response", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(new Response(JSON.stringify({ choices: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }));

    await expect(testModel(profile)).rejects.toMatchObject({ code: "FORMAT" });
  });
});
