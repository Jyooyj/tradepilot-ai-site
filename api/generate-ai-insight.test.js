import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import handler from "./generate-ai-insight.js";

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

const DASH_KEYS = ["DASHSCOPE_API_KEY", "DASH_SCOPE_API_KEY", "ALIYUN_DASHSCOPE_API_KEY"];
const saved = {};

beforeEach(() => {
  DASH_KEYS.forEach((k) => {
    saved[k] = process.env[k];
    delete process.env[k];
  });
});

afterEach(() => {
  DASH_KEYS.forEach((k) => {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  });
  vi.unstubAllGlobals();
});

function reviewReq() {
  return {
    method: "POST",
    body: {
      scene: "review_funnel",
      reviewData: { views: "3000", inquiries: "15", orders: "5" },
      productContext: { productName: "测试商品" },
      metrics: { bottleneck: "order", decision: "改内容再测", confidenceLevel: "中" },
    },
  };
}

describe("api/generate-ai-insight review_funnel", () => {
  it("无模型配置时返回 llm_config_missing（不假装 AI 成功）", async () => {
    const res = mockRes();
    await handler(reviewReq(), res);
    expect(res._payload.ok).toBe(false);
    expect(res._payload.error).toBe("llm_config_missing");
    expect(res._payload.scene).toBe("review_funnel");
    expect(res._payload.hasTextModelConfig).toBe(false);
  });

  it("有模型配置时进入 LLM 调用分支并返回 source=llm", async () => {
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
                    summary: "卡在成交环节。",
                    keyFindings: ["互动健康", "成交偏低"],
                    bottleneck: "成交：价格或客服。",
                    nextActions: ["优化价格", "提升客服"],
                    decision: "改内容再测",
                    confidence: "中",
                    missingData: [],
                    warning: "样本偏小。",
                  }),
                },
              },
            ],
          }),
      })
    );
    const res = mockRes();
    await handler(reviewReq(), res);
    expect(res._payload.ok).toBe(true);
    expect(res._payload.source).toBe("llm");
    expect(res._payload.hasTextModelConfig).toBe(true);
    expect(res._payload.summary).toContain("成交");
    expect(res._payload.model).toBeTruthy();
  });

  it("模型输出带说明文字时仍能提取 JSON", async () => {
    process.env.DASHSCOPE_API_KEY = "test-key-not-real";
    vi.stubGlobal("fetch", () =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content:
                    '好的，分析结果如下：\n```json\n{ "summary": "可以小批量补货。", "decision": "小批量补货", "confidence": "高" }\n```\n以上。',
                },
              },
            ],
          }),
      })
    );
    const res = mockRes();
    await handler(reviewReq(), res);
    expect(res._payload.ok).toBe(true);
    expect(res._payload.source).toBe("llm");
    expect(res._payload.summary).toContain("补货");
  });

  it("模型输出完全无法解析时返回 llm_parse_failed（不伪装成功）", async () => {
    process.env.DASHSCOPE_API_KEY = "test-key-not-real";
    vi.stubGlobal("fetch", () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: "抱歉，我无法分析。" } }] }),
      })
    );
    const res = mockRes();
    await handler(reviewReq(), res);
    expect(res._payload.ok).toBe(false);
    expect(res._payload.error).toBe("llm_parse_failed");
  });

  it("LLM 接口返回非 200 时返回 llm_request_failed", async () => {
    process.env.DASHSCOPE_API_KEY = "test-key-not-real";
    vi.stubGlobal("fetch", () =>
      Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: { message: "boom" } }) })
    );
    const res = mockRes();
    await handler(reviewReq(), res);
    expect(res._payload.ok).toBe(false);
    expect(res._payload.error).toBe("llm_request_failed");
  });

  it("响应不包含任何 Key", async () => {
    process.env.DASHSCOPE_API_KEY = "super-secret-key-123";
    vi.stubGlobal("fetch", () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: '{"summary":"ok"}' } }] }),
      })
    );
    const res = mockRes();
    await handler(reviewReq(), res);
    expect(JSON.stringify(res._payload)).not.toContain("super-secret-key-123");
  });

  it("其他场景不受影响（purchase_decision 无配置时仍走旧 fallback 结构）", async () => {
    const res = mockRes();
    await handler({ method: "POST", body: { scenario: "purchase_decision" } }, res);
    expect(res._payload.ok).toBe(true);
    expect(res._payload.source).toBe("fallback");
    expect(res._payload).toHaveProperty("reasoningPoints");
  });
});
