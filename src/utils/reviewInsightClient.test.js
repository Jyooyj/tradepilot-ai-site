import { describe, it, expect, vi, afterEach } from "vitest";
import {
  buildReviewInsightFallback,
  normalizeReviewInsight,
  generateReviewInsight,
} from "./reviewInsightClient";
import { buildReviewMetrics } from "./reviewMetrics";

const HEALTHY = buildReviewMetrics({
  views: "3000",
  likes: "100",
  saves: "80",
  comments: "20",
  inquiries: "40",
  orders: "12",
  cost: "100",
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reviewInsightClient", () => {
  it("LLM 成功时显示 AI 总结（source=llm，保留结构化字段）", () => {
    const normalized = normalizeReviewInsight(
      {
        source: "llm",
        summary: "互动和收藏不错，卡在成交环节。",
        keyFindings: ["互动率健康", "成交转化偏低"],
        bottleneck: "成交环节：价格或客服阻力。",
        nextActions: ["优化价格", "提升客服响应"],
        decision: "改内容再测",
        confidence: "中",
        missingData: [],
        warning: "样本仍偏小，谨慎放量。",
      },
      HEALTHY
    );
    expect(normalized.source).toBe("llm");
    expect(normalized.summary).toContain("成交");
    expect(normalized.decision).toBe("改内容再测");
    expect(normalized.confidence).toBe("中");
    expect(normalized.keyFindings.length).toBeGreaterThan(0);
  });

  it("LLM 失败时降级为规则总结（source=fallback），不含生硬英文或“暂不可用”", () => {
    const fallback = buildReviewInsightFallback(HEALTHY, "接口调用失败。");
    expect(fallback.source).toBe("fallback");
    expect(fallback.summary).toBeTruthy();
    expect(fallback.summary).not.toContain("暂不可用");
    expect(fallback.summary).not.toMatch(/Auth session missing|undefined|null/);
    expect(["继续测", "改内容再测", "小批量补货", "暂停"]).toContain(fallback.decision);
    expect(["高", "中", "低"]).toContain(fallback.confidence);
    expect(Array.isArray(fallback.nextActions)).toBe(true);
    expect(fallback.nextActions.length).toBeGreaterThan(0);
  });

  it("generateReviewInsight 在网络失败时安全降级为规则版", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("network down")));
    const result = await generateReviewInsight({
      reviewData: { views: "3000", likes: "100", saves: "80", comments: "20", inquiries: "5", orders: "1" },
      productContext: { productName: "测试商品" },
      metrics: buildReviewMetrics({ views: "3000", likes: "100", saves: "80", comments: "20", inquiries: "5", orders: "1" }),
    });
    expect(result.source).toBe("fallback");
    expect(result.summary).not.toContain("暂不可用");
    expect(result.bottleneck).toBeTruthy();
  });

  it("generateReviewInsight 向 /api/generate-ai-insight 发送 scene=review_funnel", async () => {
    let capturedUrl = "";
    let capturedBody = null;
    vi.stubGlobal("fetch", (url, options) => {
      capturedUrl = url;
      capturedBody = JSON.parse(options.body);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, source: "llm", summary: "ok", hasTextModelConfig: true }),
      });
    });
    await generateReviewInsight({ reviewData: { views: "3000" }, productContext: { productName: "X" }, metrics: HEALTHY });
    expect(capturedUrl).toContain("/api/generate-ai-insight");
    expect(capturedBody.scene).toBe("review_funnel");
    expect(capturedBody).toHaveProperty("reviewData");
    expect(capturedBody).toHaveProperty("productContext");
    expect(capturedBody).toHaveProperty("metrics");
  });

  it("API 返回 ok:false 时前端降级为规则版（保留 errorCode）", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: false, error: "llm_config_missing", message: "未配置", hasTextModelConfig: false }),
      })
    );
    const result = await generateReviewInsight({ reviewData: { views: "3000" }, productContext: {}, metrics: HEALTHY });
    expect(result.source).toBe("fallback");
    expect(result.errorCode).toBe("llm_config_missing");
    expect(result.summary).not.toContain("暂不可用");
  });

  it("API 返回 source=ai 也视为 LLM 成功", () => {
    const normalized = normalizeReviewInsight({ ok: true, source: "ai", summary: "AI结果" }, HEALTHY);
    expect(normalized.source).toBe("llm");
  });
});
