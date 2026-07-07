import { describe, expect, it } from "vitest";

import {
  SUPPLY_CHAIN_SAMPLE,
  analyzeSupplyChainInsight,
  getSupplyChainInputStatus,
  hasSupplyChainInput,
  validateSupplyChainInput,
} from "./supplyChainInsightEngine.js";

describe("analyzeSupplyChainInsight", () => {
  it("returns supply chain stability levels by supplier count", () => {
    expect(analyzeSupplyChainInsight({ supplierCount: 2 }).supplyChainStability).toBe("low");
    expect(analyzeSupplyChainInsight({ supplierCount: 10 }).supplyChainStability).toBe("medium");
    expect(analyzeSupplyChainInsight({ supplierCount: 50 }).supplyChainStability).toBe("high");
  });

  it("marks MOQ risk high when MOQ is high and small-batch trial is not supported", () => {
    const result = analyzeSupplyChainInsight({ commonMoq: 300, supportsSmallBatchTrial: false });
    expect(result.moqRisk).toBe("high");
  });

  it("rates MOQ low for small MOQ", () => {
    expect(analyzeSupplyChainInsight({ commonMoq: 10 }).moqRisk).toBe("low");
    expect(analyzeSupplyChainInsight({ commonMoq: 60 }).moqRisk).toBe("medium");
  });

  it("recommends small-batch validation when trial is supported", () => {
    const result = analyzeSupplyChainInsight({ supportsSmallBatchTrial: true });
    expect(result.trialOrderSuggestion).toContain("小批量");
    expect(result.trialOrderSuggestion).toContain("20");
  });

  it("rates price advantage good when current cost is near minimum", () => {
    const result = analyzeSupplyChainInsight({ minWholesalePrice: 3, maxWholesalePrice: 9, bulkPrice: 3.1 });
    expect(result.priceAdvantage).toBe("good");
  });

  it("rates price advantage weak when current cost is far above median", () => {
    const result = analyzeSupplyChainInsight({ minWholesalePrice: 3, maxWholesalePrice: 9, bulkPrice: 8.5 });
    expect(result.priceAdvantage).toBe("weak");
  });

  it("does not throw and lowers evidence when fields are missing", () => {
    expect(() => analyzeSupplyChainInsight({})).not.toThrow();
    const result = analyzeSupplyChainInsight({});
    expect(result.evidenceLevel).toBe("low");
    expect(Array.isArray(result.nextQuestions)).toBe(true);
    expect(result.nextQuestions.length).toBeGreaterThan(0);
  });

  it("raises evidence level when most fields are provided", () => {
    const result = analyzeSupplyChainInsight({
      supplierCount: 12,
      minWholesalePrice: 3,
      maxWholesalePrice: 9,
      commonMoq: 30,
      supportsSmallBatchTrial: true,
      bulkPrice: 4,
    });
    expect(result.evidenceLevel).toBe("high");
  });

  it("does not use exaggerated marketing wording", () => {
    const blob = JSON.stringify(analyzeSupplyChainInsight({ supplierCount: 5, commonMoq: 50 }));
    expect(blob).not.toContain("保证爆款");
    expect(blob).not.toContain("实时全网热度");
    expect(blob).not.toContain("已接入官方数据");
  });
});

describe("hasSupplyChainInput", () => {
  it("detects whether any supply chain field is filled", () => {
    expect(hasSupplyChainInput({})).toBe(false);
    expect(hasSupplyChainInput({ supplierCount: 5 })).toBe(true);
    expect(hasSupplyChainInput({ supportsSmallBatchTrial: true })).toBe(true);
  });

  it("treats default 'unknown' bool selects as not filled", () => {
    expect(hasSupplyChainInput({ supportsDropshipping: "unknown", supportsSmallBatchTrial: "unknown" })).toBe(false);
  });
});

describe("supply chain form helpers (input experience)", () => {
  it("provides a complete sample dataset for the 填入示例数据 button", () => {
    expect(SUPPLY_CHAIN_SAMPLE.supplierCount).toBe("12");
    expect(SUPPLY_CHAIN_SAMPLE.minWholesalePrice).toBe("6.8");
    expect(SUPPLY_CHAIN_SAMPLE.maxWholesalePrice).toBe("12.5");
    expect(SUPPLY_CHAIN_SAMPLE.commonMoq).toBe("100");
    expect(SUPPLY_CHAIN_SAMPLE.supportsSmallBatchTrial).toBe("yes");
    expect(SUPPLY_CHAIN_SAMPLE.shippingLocation).toBe("义乌");
    // 示例数据可被引擎正常分析
    const insight = analyzeSupplyChainInsight(SUPPLY_CHAIN_SAMPLE);
    expect(["low", "medium", "high"]).toContain(insight.supplyChainStability);
    expect(insight.trialOrderSuggestion).toContain("小批量");
  });

  it("reports input status pending / partial / used", () => {
    expect(getSupplyChainInputStatus({})).toBe("pending");
    expect(getSupplyChainInputStatus({ supplierCount: "12" })).toBe("partial");
    expect(getSupplyChainInputStatus(SUPPLY_CHAIN_SAMPLE)).toBe("used");
  });

  it("flags negative numbers as errors but does not block on warnings", () => {
    const negative = validateSupplyChainInput({ supplierCount: "-3" });
    expect(negative.valid).toBe(false);
    expect(negative.errors.length).toBeGreaterThan(0);
  });

  it("warns when min wholesale price is greater than max", () => {
    const result = validateSupplyChainInput({ minWholesalePrice: "12", maxWholesalePrice: "6" });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("最低拿货价大于最高拿货价"))).toBe(true);
  });

  it("warns when MOQ is greater than 100", () => {
    const result = validateSupplyChainInput({ commonMoq: "300" });
    expect(result.warnings.some((w) => w.includes("MOQ 偏高"))).toBe(true);
  });

  it("warns when bulk price exceeds the max wholesale price", () => {
    const result = validateSupplyChainInput({ maxWholesalePrice: "10", bulkPrice: "15" });
    expect(result.warnings.some((w) => w.includes("大货价高于"))).toBe(true);
  });
});
