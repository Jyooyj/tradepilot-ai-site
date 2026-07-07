import { describe, expect, it } from "vitest";

import {
  MARKET_DATA_LAYERS,
  MARKET_DATA_LAYER_NOTE,
  MARKET_DATA_SOURCE_LABELS,
  MARKET_DATA_SOURCE_NOTE,
  MARKET_DATA_PANEL_FOOTNOTE,
  MARKET_DATA_PITCH_NOTE,
  MARKET_DATA_EVIDENCE_NOTE,
  EXTERNAL_DATA_INTERFACES,
  EXTERNAL_DATA_NOTE,
  PUBLIC_TREND_NOTE,
  USER_INPUT_SAMPLE,
  TREND_SAMPLE,
  CONTENT_MENTION_OPTIONS,
  CONTENT_MENTION_HELP,
  TREND_LEVEL_OPTIONS,
  TREND_LEVEL_HELP,
  LOW_FOLLOWER_VIRAL_HELP,
  MARKET_INPUT_STANDARD_NOTE,
  HIGH_HEAT_COMPETITION_NOTE,
  buildUserInputSummary,
  buildPublicTrendSummary,
  getContentMentionLabel,
  getTrendLevelLabel,
  buildMarketDataSourceStatus,
  computeMarketHeatScore,
  getMarketEvidenceLevel,
  hasPublicTrendData,
  hasUserInputData,
  validatePriceRange,
} from "./marketDataLayer.js";

describe("market data layers", () => {
  it("defines exactly 4 data source layers", () => {
    expect(MARKET_DATA_LAYERS.length).toBe(4);
    const names = MARKET_DATA_LAYERS.map((l) => l.name);
    expect(names).toEqual(["用户手动输入", "自有测款数据", "公开趋势参考", "合作数据源"]);
    MARKET_DATA_LAYERS.forEach((layer) => {
      expect(Array.isArray(layer.items)).toBe(true);
      expect(layer.items.length).toBeGreaterThan(0);
    });
  });
});

describe("buildMarketDataSourceStatus", () => {
  it("reports all five data sources for the report page", () => {
    const status = buildMarketDataSourceStatus({ hasUserInput: true, hasSupplyChain: false, internalCount: 0 });
    expect(status.userInput).toBe("used");
    expect(status.supplyChain).toBe("pending");
    expect(status.internalTest).toBe("pending_accumulate");
    expect(status.publicTrend).toBe("pending");
    expect(status.external).toBe("reserved");
    // 报告页需展示的 5 个来源标签齐全
    expect(MARKET_DATA_SOURCE_LABELS.map((s) => s.key)).toEqual([
      "userInput",
      "supplyChain",
      "internalTest",
      "publicTrend",
      "external",
    ]);
  });

  it("marks internal data as partial / used based on count", () => {
    expect(buildMarketDataSourceStatus({ internalCount: 5 }).internalTest).toBe("partial");
    expect(buildMarketDataSourceStatus({ internalCount: 40 }).internalTest).toBe("used");
  });
});

describe("getMarketEvidenceLevel", () => {
  it("returns low when only product info is present", () => {
    expect(getMarketEvidenceLevel({})).toBe("low");
  });
  it("returns medium with supply chain or user input", () => {
    expect(getMarketEvidenceLevel({ hasSupplyChain: true })).toBe("medium");
    expect(getMarketEvidenceLevel({ hasUserInput: true })).toBe("medium");
  });
  it("returns high with supply chain + internal data + user input", () => {
    expect(getMarketEvidenceLevel({ hasUserInput: true, hasSupplyChain: true, internalCount: 12 })).toBe("high");
  });
});

describe("computeMarketHeatScore", () => {
  it("returns a 0-100 proxy score", () => {
    const score = computeMarketHeatScore({ result: { totalScore: 80 }, hasUserInput: true });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("rewards supply chain and internal data signals", () => {
    const base = computeMarketHeatScore({ result: { totalScore: 60 } });
    const enriched = computeMarketHeatScore({
      result: { totalScore: 60 },
      hasUserInput: true,
      supplyChainInsight: { priceAdvantage: "good", supplyChainStability: "high" },
      internalData: { dataMaturityLevel: "high", totalTestedProducts: 40 },
    });
    expect(enriched).toBeGreaterThan(base);
  });
});

describe("market data wording guardrails", () => {
  it("does not claim real-time / official / fake data", () => {
    const blob = [
      MARKET_DATA_LAYER_NOTE,
      MARKET_DATA_SOURCE_NOTE,
      MARKET_DATA_PANEL_FOOTNOTE,
      MARKET_DATA_PITCH_NOTE,
      MARKET_DATA_EVIDENCE_NOTE,
      EXTERNAL_DATA_NOTE,
      PUBLIC_TREND_NOTE,
      JSON.stringify(MARKET_DATA_LAYERS),
      JSON.stringify(EXTERNAL_DATA_INTERFACES),
    ].join(" ");
    expect(blob).not.toContain("实时全网热度");
    expect(blob).not.toContain("已接入官方数据");
    expect(blob).not.toContain("保证爆款");
    expect(blob).toContain("不代表实时平台官方数据");
  });
});

describe("interactive data sources (5 layers)", () => {
  it("marks public trend as recorded when provided, pending otherwise", () => {
    expect(buildMarketDataSourceStatus({}).publicTrend).toBe("pending");
    expect(buildMarketDataSourceStatus({ hasPublicTrend: true }).publicTrend).toBe("recorded");
  });

  it("keeps external data source always as a future-extension (reserved)", () => {
    expect(buildMarketDataSourceStatus({ hasUserInput: true, hasSupplyChain: true, hasPublicTrend: true, internalCount: 99 }).external).toBe("reserved");
  });

  it("user input sample marks user input as filled", () => {
    expect(hasUserInputData({})).toBe(false);
    expect(hasUserInputData(USER_INPUT_SAMPLE)).toBe(true);
  });

  it("trend sample marks public trend as recorded", () => {
    expect(hasPublicTrendData({})).toBe(false);
    expect(hasPublicTrendData(TREND_SAMPLE)).toBe(true);
  });

  it("raises evidence to medium with two data source classes", () => {
    expect(getMarketEvidenceLevel({ hasUserInput: true, hasPublicTrend: true })).toBe("medium");
  });

  it("raises evidence to high with three or more data source classes", () => {
    expect(getMarketEvidenceLevel({ hasUserInput: true, hasSupplyChain: true, hasPublicTrend: true })).toBe("high");
    expect(getMarketEvidenceLevel({ hasUserInput: true, hasPublicTrend: true, internalCount: 3 })).toBe("high");
  });

  it("public trend and user input contribute to the heat score", () => {
    const base = computeMarketHeatScore({ result: { totalScore: 60 } });
    const withTrend = computeMarketHeatScore({ result: { totalScore: 60 }, hasPublicTrend: true });
    const withUser = computeMarketHeatScore({ result: { totalScore: 60 }, hasUserInput: true });
    expect(withTrend).toBeGreaterThan(base);
    expect(withUser).toBeGreaterThan(base);
  });

  it("external data interfaces list shows future-only directions, none connected as official data", () => {
    expect(EXTERNAL_DATA_INTERFACES.length).toBeGreaterThanOrEqual(5);
    const blob = JSON.stringify(EXTERNAL_DATA_INTERFACES) + EXTERNAL_DATA_NOTE;
    expect(blob).not.toContain("已接入官方数据");
  });

  it("validatePriceRange flags negatives as errors and min>max as warning", () => {
    expect(validatePriceRange({ min: "-1", max: "10" }).valid).toBe(false);
    const warn = validatePriceRange({ min: "30", max: "10" });
    expect(warn.valid).toBe(true);
    expect(warn.warnings.length).toBeGreaterThan(0);
  });
});

describe("low/medium/high option clarity", () => {
  it("content mention options carry judgement standards, not bare 低/中/高", () => {
    const labels = CONTENT_MENTION_OPTIONS.map((o) => o.label);
    expect(labels).not.toContain("低");
    expect(labels).not.toContain("中");
    expect(labels).not.toContain("高");
    expect(CONTENT_MENTION_OPTIONS.find((o) => o.value === "medium").label).toContain("适合小范围测试");
    expect(CONTENT_MENTION_OPTIONS.find((o) => o.value === "high").label).toContain("注意竞争");
  });

  it("trend level options carry judgement standards, not bare 低/中/高", () => {
    const labels = TREND_LEVEL_OPTIONS.map((o) => o.label);
    expect(labels).not.toContain("低");
    expect(labels).not.toContain("中");
    expect(labels).not.toContain("高");
    expect(TREND_LEVEL_OPTIONS.find((o) => o.value === "high").label).toContain("适合优先验证");
  });

  it("provides 怎么判断 help text for content frequency and trend heat", () => {
    expect(CONTENT_MENTION_HELP).toContain("怎么判断内容出现频率");
    expect(TREND_LEVEL_HELP).toContain("怎么判断趋势热度");
  });

  it("low-follower viral help explains 0 / 1-3 / 4+ thresholds", () => {
    expect(LOW_FOLLOWER_VIRAL_HELP).toContain("0 个");
    expect(LOW_FOLLOWER_VIRAL_HELP).toContain("1–3 个");
    expect(LOW_FOLLOWER_VIRAL_HELP).toContain("4 个以上");
  });

  it("standard note avoids over-promising and reminds about competition", () => {
    expect(MARKET_INPUT_STANDARD_NOTE).toContain("不是平台官方数据");
    expect(HIGH_HEAT_COMPETITION_NOTE).toContain("高竞争");
    expect(HIGH_HEAT_COMPETITION_NOTE).toContain("不直接改变最终拿货建议");
  });
});

describe("post-save summaries", () => {
  it("builds a user input summary with level label and judgement note", () => {
    const summary = buildUserInputSummary(USER_INPUT_SAMPLE);
    expect(summary.lines.some((l) => l.label === "内容平台出现频率")).toBe(true);
    expect(summary.lines.find((l) => l.label === "内容平台出现频率").value).toContain("适合小范围测试");
    expect(summary.lines.some((l) => l.label === "竞品价格区间")).toBe(true);
    expect(summary.note).toContain("结合利润");
  });

  it("builds a public trend summary with level label and judgement note", () => {
    const summary = buildPublicTrendSummary(TREND_SAMPLE);
    expect(summary.lines.some((l) => l.label === "趋势热度等级")).toBe(true);
    expect(summary.lines.some((l) => l.label === "趋势关键词")).toBe(true);
    expect(summary.note).toContain("内容测款");
  });

  it("label lookups return rich text for summaries", () => {
    expect(getContentMentionLabel("medium")).toContain("中｜");
    expect(getTrendLevelLabel("high")).toContain("高｜");
  });

  it("summary wording does not over-promise", () => {
    const blob = JSON.stringify(buildUserInputSummary(USER_INPUT_SAMPLE)) + JSON.stringify(buildPublicTrendSummary(TREND_SAMPLE));
    expect(blob).not.toContain("保证爆款");
    expect(blob).not.toContain("已接入官方数据");
    expect(blob).not.toContain("实时平台官方数据");
  });
});
