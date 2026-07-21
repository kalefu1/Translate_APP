import type { AppErrorShape, InputMode, ModelProfile, TranslationResult } from "../types";
import { platformFetch, isTauri } from "./platform";
import { buildMessages } from "./prompts";
import { parseModelJson, validateResult } from "./validation";

export class AppError extends Error implements AppErrorShape {
  constructor(public code: AppErrorShape["code"], message: string, public detail?: string) {
    super(message);
    this.name = "AppError";
  }
}

export function chatEndpoint(baseUrl: string): string {
  const clean = baseUrl.trim().replace(/\/+$/, "");
  if (/\/chat\/completions$/i.test(clean)) return clean;
  return `${clean}/chat/completions`;
}

function explainNetworkError(error: unknown): AppError {
  if (error instanceof DOMException && error.name === "AbortError") {
    return new AppError("ABORTED", "请求已取消");
  }
  const detail = error instanceof Error ? error.message : String(error);
  if (!isTauri() && /fetch|network|cors|failed/i.test(detail)) {
    return new AppError("CORS", "浏览器无法连接此接口", "请确认 API 支持浏览器跨域访问，或改用 Windows 客户端。");
  }
  return new AppError("NETWORK", "无法连接模型接口", detail);
}

async function callChat(
  profile: ModelProfile,
  messages: ReturnType<typeof buildMessages>,
  signal?: AbortSignal,
  concise = false
): Promise<string> {
  let response: Response;
  try {
    response = await platformFetch(chatEndpoint(profile.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${profile.apiKey}`
      },
      body: JSON.stringify({
        model: profile.model,
        messages,
        temperature: concise ? 0 : 0.2,
        max_tokens: concise ? 8 : 1800
      }),
      signal
    });
  } catch (error) {
    throw explainNetworkError(error);
  }

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      detail = body?.error?.message ?? body?.message ?? detail;
    } catch { /* do not expose request data */ }
    if (response.status === 401 || response.status === 403) throw new AppError("AUTH", "API 密钥或访问权限无效", detail);
    if (response.status === 429) throw new AppError("RATE_LIMIT", "模型请求过于频繁或额度不足", detail);
    throw new AppError("MODEL", "模型接口返回错误", detail);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new AppError("FORMAT", "模型未返回可读取的内容");
  return content;
}

export async function testModel(profile: ModelProfile, signal?: AbortSignal): Promise<void> {
  if (!profile.baseUrl || !profile.apiKey || !profile.model) throw new AppError("CONFIG", "请完整填写 API 地址、密钥和模型标识");
  await callChat(profile, [
    { role: "system", content: "Reply with exactly OK." },
    { role: "user", content: "connection test" }
  ], signal, true);
}

export async function translate(
  text: string,
  mode: InputMode,
  profile: ModelProfile,
  signal?: AbortSignal
): Promise<TranslationResult> {
  if (!text.trim()) throw new AppError("CONFIG", "请输入需要处理的内容");
  if (text.length > 5000) throw new AppError("CONFIG", "输入不能超过 5,000 个字符");
  if (!profile.verified) throw new AppError("CONFIG", "请先测试并保存可用的模型配置");

  const messages = buildMessages(text, mode);
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const retryMessages = attempt === 0 ? messages : [
        ...messages,
        { role: "system" as const, content: "上一次输出无法通过 JSON 结构校验。重新独立处理同一输入，只返回严格符合指定结构的 JSON。" }
      ];
      const content = await callChat(profile, retryMessages, signal);
      return validateResult(parseModelJson(content));
    } catch (error) {
      if (error instanceof AppError && error.code !== "FORMAT") throw error;
      if (error instanceof DOMException && error.name === "AbortError") throw new AppError("ABORTED", "请求已取消");
      lastError = error;
    }
  }
  throw new AppError("FORMAT", "模型返回格式不符合要求，已自动重试", lastError instanceof Error ? lastError.message : undefined);
}
