import { afterEach, describe, expect, it, vi } from "vitest";

import handler from "./content-pattern.js";

const ENV_KEYS = [
  "DASHSCOPE_API_KEY",
  "DASHSCOPE_TEXT_MODEL",
  "DASHSCOPE_TEXT_ENDPOINT",
  "OPENAI_API_KEY",
  "QWEN_API_KEY",
  "AI_API_KEY",
  "VITE_DASHSCOPE_API_KEY",
  "DASH_SCOPE_API_KEY",
  "ALIYUN_DASHSCOPE_API_KEY",
  "QWEN_TEXT_MODEL",
];

const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

function restoreEnv() {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
}

function createResponse() {
  return {
    statusCode: 200,
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

function extractionRequest() {
  return {
    method: "POST",
    body: {
      action: "extract",
      name: "测试结构",
      references: [{ title: "仅用于本次测试的标题", body: "仅用于本次测试的正文" }],
    },
  };
}

afterEach(() => {
  restoreEnv();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("content pattern DashScope configuration", () => {
  it("ignores legacy and frontend API key names and keeps local fallback", async () => {
    delete process.env.DASHSCOPE_API_KEY;
    process.env.OPENAI_API_KEY = "placeholder-openai-key";
    process.env.QWEN_API_KEY = "placeholder-qwen-key";
    process.env.AI_API_KEY = "placeholder-ai-key";
    process.env.VITE_DASHSCOPE_API_KEY = "placeholder-vite-key";
    process.env.DASH_SCOPE_API_KEY = "placeholder-legacy-key";
    process.env.ALIYUN_DASHSCOPE_API_KEY = "placeholder-aliyun-key";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = createResponse();

    await handler(extractionRequest(), res);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.payload).toMatchObject({
      ok: true,
      mode: "local_fallback",
      message: "未配置 AI 文本服务，已使用本地规则提取结构。",
      debugConfig: {
        hasDashScopeApiKey: false,
        hasTextEndpoint: true,
        textModel: "qwen-plus",
        endpointHost: "dashscope.aliyuncs.com",
      },
    });
  });

  it("returns AI mode and safe debug configuration after a successful call", async () => {
    process.env.DASHSCOPE_API_KEY = "placeholder-dashscope-key";
    delete process.env.DASHSCOPE_TEXT_MODEL;
    delete process.env.DASHSCOPE_TEXT_ENDPOINT;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ headlineFormula: "问题 + 解决路径" }) } }],
      }),
    }));
    const res = createResponse();

    await handler(extractionRequest(), res);

    expect(res.payload).toMatchObject({
      ok: true,
      mode: "ai",
      message: "AI 文本服务已完成结构提取。",
      debugConfig: {
        hasDashScopeApiKey: true,
        hasTextEndpoint: true,
        textModel: "qwen-plus",
        endpointHost: "dashscope.aliyuncs.com",
      },
    });
  });

  it("falls back with a short secret-free error after a failed AI call", async () => {
    process.env.DASHSCOPE_API_KEY = "placeholder-dashscope-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    const res = createResponse();

    await handler(extractionRequest(), res);

    expect(res.payload).toMatchObject({
      ok: true,
      mode: "local_fallback",
      message: "AI 调用失败，已使用本地规则提取结构。",
      errorMessage: "DashScope HTTP 401",
      debugConfig: { hasDashScopeApiKey: true },
    });
    expect(JSON.stringify(res.payload)).not.toContain(process.env.DASHSCOPE_API_KEY);
  });

  it("generates a Xiaohongshu-only copywriting package without an AI key", async () => {
    delete process.env.DASHSCOPE_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = createResponse();

    await handler({
      method: "POST",
      body: {
        action: "generate_xiaohongshu",
        pattern: { hook_type: "question", title_structure: "人群 + 场景问题" },
        brief: { topic: "通勤耳夹", audience: "无耳洞通勤人群", keyPoints: "轻量、适合日常搭配" },
      },
    }, res);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.payload.mode).toBe("local_fallback");
    expect(res.payload.copywritingPackage.xiaohongshu.titles).toHaveLength(5);
    expect(res.payload.copywritingPackage.xiaohongshu.cover_texts).toHaveLength(5);
    expect(res.payload.copywritingPackage.xiaohongshu.hashtags).toHaveLength(8);
    expect(JSON.stringify(res.payload.copywritingPackage)).not.toMatch(/douyin_script|video_script|shot_script|oral_script|short_video/);
  });
});
