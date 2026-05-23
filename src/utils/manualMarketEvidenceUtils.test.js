import { describe, expect, it } from "vitest";

import {
  contentHomogeneityOptions,
  competitorDensityOptions,
  manualMarketRiskMessages,
} from "../constants/manualMarketEvidenceConfig.js";
import {
  applyManualMarketEvidenceToResult,
  evaluateManualMarketEvidence,
  normalizeManualMarketEvidence,
} from "./manualMarketEvidenceUtils.js";

const completenessRank = {
  low: 1,
  medium: 2,
  high: 3,
};

const highCompetitorDensity = competitorDensityOptions.at(-1);
const highContentHomogeneity = contentHomogeneityOptions.at(-1);

describe("normalizeManualMarketEvidence", () => {
  it("marks manual evidence present when key market fields are filled", () => {
    const evidence = normalizeManualMarketEvidence({
      wholesalePriceReference: "10-15",
      retailPriceReference: "25-35",
      contentHeatReference: "点赞和收藏较多",
      marketReferenceLinks: "https://example.com/product",
    });

    expect(evidence.hasManualEvidence).toBe(true);
    expect(evidence.wholesalePriceReference).toBe("10-15");
    expect(evidence.retailPriceReference).toBe("25-35");
    expect(evidence.contentHeatReference).toBe("点赞和收藏较多");
    expect(evidence.marketReferenceLinks).toBe("https://example.com/product");
  });

  it("marks manual evidence absent for empty or undefined product data", () => {
    expect(() => normalizeManualMarketEvidence(undefined)).not.toThrow();

    const evidence = normalizeManualMarketEvidence({});

    expect(evidence.hasManualEvidence).toBe(false);
  });
});

describe("evaluateManualMarketEvidence", () => {
  const completeProduct = {
    wholesalePriceReference: "10-15",
    retailPriceReference: "25-35",
    contentHeatReference: "点赞和收藏较多",
    marketReferenceLinks: "https://example.com/product",
  };

  it("scores complete manual evidence above empty data", () => {
    const emptyEvidence = evaluateManualMarketEvidence({});
    const completeEvidence = evaluateManualMarketEvidence(completeProduct);

    expect(completenessRank[completeEvidence.dataCompleteness]).toBeGreaterThan(
      completenessRank[emptyEvidence.dataCompleteness]
    );
    expect(completeEvidence.confidenceScore).toBeGreaterThan(emptyEvidence.confidenceScore);
  });

  it("warns about competition pressure and content homogeneity risk", () => {
    const evidence = evaluateManualMarketEvidence({
      ...completeProduct,
      competitorDensity: highCompetitorDensity,
      contentHomogeneity: highContentHomogeneity,
    });

    expect(evidence.riskWarnings).toContain(manualMarketRiskMessages.highDensity);
    expect(evidence.riskWarnings).toContain(manualMarketRiskMessages.highHomogeneity);
    expect(evidence.scoreAdjustment).toBeGreaterThanOrEqual(-5);
    expect(evidence.scoreAdjustment).toBeLessThanOrEqual(5);
  });

  it("handles empty data safely and warns about insufficient market evidence", () => {
    expect(() => evaluateManualMarketEvidence({})).not.toThrow();

    const evidence = evaluateManualMarketEvidence({});

    expect(evidence.riskWarnings).toContain(manualMarketRiskMessages.insufficientEvidence);
    expect(evidence.scoreAdjustment).toBeGreaterThanOrEqual(-5);
    expect(evidence.scoreAdjustment).toBeLessThanOrEqual(5);
  });
});

describe("applyManualMarketEvidenceToResult", () => {
  it("adds manual evidence while preserving price, douyin, and original result fields", () => {
    const result = {
      id: "product-1",
      totalScore: 50,
      score: 40,
      keepMe: "unchanged",
      priceEvidence: { pricePosition: "within_market" },
      douyinEvidence: { heatLevel: "unknown" },
      marketEvidence: {
        price: { pricePosition: "within_market" },
        douyin: { heatLevel: "unknown" },
      },
    };
    const manualEvidence = {
      scoreAdjustment: 12,
      dataCompleteness: "high",
    };

    const nextResult = applyManualMarketEvidenceToResult(result, manualEvidence);

    expect(nextResult.manualMarketEvidence).toBe(manualEvidence);
    expect(nextResult.marketEvidence.manual).toBe(manualEvidence);
    expect(nextResult.priceEvidence).toEqual({ pricePosition: "within_market" });
    expect(nextResult.douyinEvidence).toEqual({ heatLevel: "unknown" });
    expect(nextResult.marketEvidence.price).toEqual({ pricePosition: "within_market" });
    expect(nextResult.marketEvidence.douyin).toEqual({ heatLevel: "unknown" });
    expect(nextResult.totalScore).toBe(55);
    expect(nextResult.score).toBe(45);
    expect(nextResult.keepMe).toBe("unchanged");
  });
});
