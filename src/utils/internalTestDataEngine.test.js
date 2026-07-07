import { describe, expect, it } from "vitest";

import { analyzeInternalTestData } from "./internalTestDataEngine.js";
import { DEMO_INTERNAL_TEST_RECORDS } from "./internalTestDataEngine.js";

function makeRecord(i, overrides = {}) {
  return {
    id: `rec-${i}`,
    product_name: overrides.product_name || `商品${i}`,
    category: overrides.category || "饰品 / 耳饰",
    price: overrides.price ?? "19.9",
    product: { name: overrides.product_name || `商品${i}`, category: overrides.category || "饰品 / 耳饰", channel: overrides.channel || "小红书" },
    result: {
      status: overrides.status || "正在测款",
      margin: overrides.margin ?? 0.5,
      review: overrides.review || { views: 1000, likes: 50, saves: 80, inquiries: 40, orders: 8, cost: 100 },
    },
  };
}

function makeRecords(count, overrides = {}) {
  return Array.from({ length: count }, (_, i) => makeRecord(i, overrides));
}

describe("analyzeInternalTestData", () => {
  it("counts the number of tested products", () => {
    const result = analyzeInternalTestData(makeRecords(12));
    expect(result.totalTestedProducts).toBe(12);
  });

  it("reports low maturity with fewer than 6 records", () => {
    expect(analyzeInternalTestData(makeRecords(3)).dataMaturityLevel).toBe("low");
    expect(analyzeInternalTestData([]).dataMaturityLevel).toBe("low");
  });

  it("reports medium maturity between 6 and 30 records", () => {
    expect(analyzeInternalTestData(makeRecords(12)).dataMaturityLevel).toBe("medium");
  });

  it("reports high maturity with more than 30 records", () => {
    expect(analyzeInternalTestData(makeRecords(35)).dataMaturityLevel).toBe("high");
  });

  it("computes category and channel stats", () => {
    const records = [
      makeRecord(1, { category: "饰品 / 耳饰", channel: "小红书" }),
      makeRecord(2, { category: "发饰", product_name: "大肠发圈", channel: "抖音" }),
    ];
    const result = analyzeInternalTestData(records);
    expect(result.categoryStats.length).toBeGreaterThan(0);
    expect(result.channelStats.length).toBeGreaterThan(0);
    expect(typeof result.averageGrossMargin).toBe("number");
  });

  it("does not crash on records with missing fields", () => {
    expect(() => analyzeInternalTestData([{}, { id: "x" }, null])).not.toThrow();
  });

  it("shows empty-state summary with no records", () => {
    const result = analyzeInternalTestData([]);
    expect(result.totalTestedProducts).toBe(0);
    expect(result.summary).toContain("自有测款数据较少");
  });

  it("does not use exaggerated or fake market wording", () => {
    const blob = JSON.stringify(analyzeInternalTestData(makeRecords(8)));
    expect(blob).not.toContain("实时全网热度");
    expect(blob).not.toContain("已接入官方数据");
    expect(blob).not.toContain("保证爆款");
    expect(blob).toContain("不代表全网市场表现");
  });

  it("provides 3 clearly-labelled demo records that the engine can analyze", () => {
    expect(DEMO_INTERNAL_TEST_RECORDS.length).toBe(3);
    expect(DEMO_INTERNAL_TEST_RECORDS.every((r) => r.__demo === true)).toBe(true);
    const result = analyzeInternalTestData(DEMO_INTERNAL_TEST_RECORDS);
    expect(result.totalTestedProducts).toBe(3);
    expect(result.dataMaturityLevel).toBe("low");
    expect(result.channelStats.length).toBeGreaterThan(0);
  });
});
