import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import handler from "./analyze-image.js";

// 模拟 Vercel 风格的 res：res.status(code).json(payload)
function mockRes() {
  const state = { code: 200, payload: null };
  return {
    status(code) {
      state.code = code;
      return this;
    },
    json(payload) {
      state.payload = payload;
      return this;
    },
    get _code() {
      return state.code;
    },
    get _payload() {
      return state.payload;
    },
  };
}

const VISION_ENV_KEYS = [
  "DASHSCOPE_API_KEY",
  "DASHSCOPE_VISION_MODEL",
  "QWEN_VL_MODEL",
  "DASHSCOPE_VISION_ENDPOINT",
];
const saved = {};

beforeEach(() => {
  VISION_ENV_KEYS.forEach((k) => {
    saved[k] = process.env[k];
    delete process.env[k];
  });
});

afterEach(() => {
  VISION_ENV_KEYS.forEach((k) => {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  });
  vi.unstubAllGlobals();
});

function imageReq() {
  return { method: "POST", body: { image: "data:image/png;base64,AAAA", hint: "测试" } };
}

describe("api/analyze-image 视觉识别", () => {
  it("缺少图片时返回 400 missing_image", async () => {
    process.env.DASHSCOPE_API_KEY = "test-key";
    const res = mockRes();
    await handler({ method: "POST", body: {} }, res);
    expect(res._code).toBe(400);
    expect(res._payload.ok).toBe(false);
    expect(res._payload.error).toBe("missing_image");
  });

  it("未配置视觉模型时返回 vision_config_missing", async () => {
    const res = mockRes();
    await handler(imageReq(), res);
    expect(res._payload.ok).toBe(false);
    expect(res._payload.error).toBe("vision_config_missing");
    expect(res._payload.hasVisionConfig).toBe(false);
  });

  it("配置存在且模型返回有效 JSON 时返回 source=vision_llm 并归一化 product", async () => {
    process.env.DASHSCOPE_API_KEY = "test-key-not-real";
    vi.stubGlobal("fetch", () =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    product: {
                      name: "珍珠项链",
                      category: "饰品",
                      material: "疑似合金 + 仿珍珠",
                      color: "白色",
                      style: "法式",
                      targetAudience: "通勤女性",
                      sellingPoints: ["温柔气质", "百搭"],
                      risks: ["易氧化"],
                      suggestedChannels: ["小红书", "抖音"],
                      searchKeywords: ["珍珠项链", "锁骨链"],
                      price: "19.9-29.9",
                      competitorPrice: "15.9-29.9",
                      note: "建议先拿样",
                    },
                    rawVisionSummary: "一条圆形珍珠串项链",
                    confidence: "中",
                    warningMessages: ["类别可能为锁骨链，请人工确认"],
                  }),
                },
              },
            ],
          }),
      })
    );
    const res = mockRes();
    await handler(imageReq(), res);
    expect(res._payload.ok).toBe(true);
    expect(res._payload.source).toBe("vision_llm");
    expect(res._payload.hasVisionConfig).toBe(true);
    expect(res._payload.model).toBeTruthy();
    expect(res._payload.product.name).toBe("珍珠项链");
    expect(res._payload.product.material).toContain("疑似");
    expect(res._payload.product.sellingPoints).toContain("百搭");
    // 兼容字段：供前端旧回填逻辑使用
    expect(res._payload.product.audience).toBe("通勤女性");
    expect(res._payload.product.channel).toContain("小红书");
    expect(res._payload.warningMessages.length).toBeGreaterThan(0);
  });

  it("模型输出带 Markdown 包裹时仍能解析", async () => {
    process.env.DASHSCOPE_API_KEY = "test-key-not-real";
    vi.stubGlobal("fetch", () =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              { message: { content: '```json\n{ "product": { "name": "发圈" } }\n```' } },
            ],
          }),
      })
    );
    const res = mockRes();
    await handler(imageReq(), res);
    expect(res._payload.ok).toBe(true);
    expect(res._payload.source).toBe("vision_llm");
    expect(res._payload.product.name).toBe("发圈");
  });

  it("模型接口返回非 200 时返回 vision_request_failed", async () => {
    process.env.DASHSCOPE_API_KEY = "test-key-not-real";
    vi.stubGlobal("fetch", () =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: "boom" } }),
      })
    );
    const res = mockRes();
    await handler(imageReq(), res);
    expect(res._payload.ok).toBe(false);
    expect(res._payload.error).toBe("vision_request_failed");
    expect(res._payload.hasVisionConfig).toBe(true);
  });

  it("模型输出无法解析为 JSON 时返回 vision_parse_failed", async () => {
    process.env.DASHSCOPE_API_KEY = "test-key-not-real";
    vi.stubGlobal("fetch", () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: "抱歉，无法识别。" } }] }),
      })
    );
    const res = mockRes();
    await handler(imageReq(), res);
    expect(res._payload.ok).toBe(false);
    expect(res._payload.error).toBe("vision_parse_failed");
  });

  it("响应中不包含任何 Key", async () => {
    process.env.DASHSCOPE_API_KEY = "super-secret-key-123";
    vi.stubGlobal("fetch", () =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ choices: [{ message: { content: '{"product":{"name":"x"}}' } }] }),
      })
    );
    const res = mockRes();
    await handler(imageReq(), res);
    expect(JSON.stringify(res._payload)).not.toContain("super-secret-key-123");
  });
});
