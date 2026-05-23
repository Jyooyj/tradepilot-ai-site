import { describe, expect, it } from "vitest";

import { alibabaPriceRiskMessages } from "../constants/alibabaPriceConfig.js";
import {
  applyPriceEvidenceToResult,
  evaluatePriceEvidence,
  parsePriceRange,
} from "./priceEvidenceUtils.js";

describe("parsePriceRange", () => {
  it.each([
    ["15.9-29.9", 15.9, 29.9, 22.9],
    ["15.9~29.9", 15.9, 29.9, 22.9],
    ["约20元", 20, 20, 20],
    ["20", 20, 20, 20],
  ])("parses %s into a safe price range", (input, min, max, average) => {
    expect(parsePriceRange(input)).toMatchObject({
      min,
      max,
      average,
      isValid: true,
    });
  });

  it.each(["", null])("returns an invalid safe result for empty input: %s", (input) => {
    expect(() => parsePriceRange(input)).not.toThrow();
    expect(parsePriceRange(input)).toMatchObject({
      min: null,
      max: null,
      average: null,
      isValid: false,
    });
  });
});

describe("evaluatePriceEvidence", () => {
  const product = {
    name: "便携水杯",
    keywords: "户外, 露营",
    price: "25",
    cost: "12",
  };

  it.each([null, {}])("falls back to arrays when apiResponse is %s", (apiResponse) => {
    expect(() => evaluatePriceEvidence(product, apiResponse)).not.toThrow();

    const evidence = evaluatePriceEvidence(product, apiResponse);

    expect(Array.isArray(evidence.wholesaleResults)).toBe(true);
    expect(Array.isArray(evidence.retailResults)).toBe(true);
    expect(Array.isArray(evidence.searchLinks)).toBe(true);
    expect(Array.isArray(evidence.riskWarnings)).toBe(true);
  });

  it("marks suggested price above the competitor range", () => {
    const evidence = evaluatePriceEvidence({
      ...product,
      competitorPrice: "15-20",
      price: "25",
    });

    expect(evidence.competitorPriceRange).toMatchObject({
      min: 15,
      max: 20,
      isValid: true,
    });
    expect(evidence.pricePosition).toBe("above_market");
    expect(evidence.riskWarnings).toContain(alibabaPriceRiskMessages.aboveMarket);
  });

  it("warns when competitor price evidence is missing", () => {
    const evidence = evaluatePriceEvidence(product);

    expect(evidence.competitorPriceRange.isValid).toBe(false);
    expect(evidence.riskWarnings).toContain(alibabaPriceRiskMessages.noManualPrice);
  });
});

describe("applyPriceEvidenceToResult", () => {
  it("adds price evidence, clamps score movement, and preserves existing fields", () => {
    const result = {
      id: "product-1",
      score: 60,
      totalScore: 70,
      keepMe: "still here",
      marketEvidence: {
        douyin: { heatLevel: "unknown" },
      },
    };
    const priceEvidence = {
      scoreAdjustment: 12,
      pricePosition: "within_market",
    };

    const nextResult = applyPriceEvidenceToResult(result, priceEvidence);

    expect(nextResult.priceEvidence).toBe(priceEvidence);
    expect(nextResult.marketEvidence.price).toBe(priceEvidence);
    expect(nextResult.marketEvidence.douyin).toEqual({ heatLevel: "unknown" });
    expect(nextResult.score).toBe(65);
    expect(nextResult.totalScore).toBe(75);
    expect(nextResult.keepMe).toBe("still here");
  });
});
