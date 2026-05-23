import { describe, expect, it } from "vitest";

import {
  applyDouyinFallbackToResult,
  buildDouyinSearchLinks,
  buildDouyinSearchQuery,
  evaluateDouyinFallbackEvidence,
} from "./douyinFallbackUtils.js";

const fakePlatformMetricKeys = [
  "likes",
  "likeCount",
  "playCount",
  "plays",
  "comments",
  "commentCount",
  "favorites",
  "favoriteCount",
  "collects",
  "collectionCount",
];

describe("Douyin search fallback helpers", () => {
  const product = {
    name: "便携水杯",
    keywords: "户外,露营",
    category: "水杯",
  };

  it("builds a search query from product name and keywords", () => {
    const query = buildDouyinSearchQuery(product);

    expect(query).toContain(product.name);
    expect(query).toContain("户外");
    expect(query).toContain("露营");
  });

  it("builds search-reference links without real API data", () => {
    const links = buildDouyinSearchLinks(product);

    expect(links.length).toBeGreaterThan(0);
    expect(links.every((link) => link.sourceType === "search_reference")).toBe(true);
    expect(links.every((link) => typeof link.url === "string" && link.url.length > 0)).toBe(true);
    expect(links.every((link) => !("results" in link))).toBe(true);
  });
});

describe("evaluateDouyinFallbackEvidence", () => {
  it("uses safe unknown fallback when content heat reference is missing", () => {
    const evidence = evaluateDouyinFallbackEvidence({
      name: "便携水杯",
      keywords: "户外",
    });

    expect(evidence.heatLevel).toBe("unknown");
    expect(evidence.riskWarnings.length).toBeGreaterThan(0);
    expect(evidence.sourceType).toBe("api_pending");
    expect(evidence.fallback).toBe(true);
    expect(evidence.sourceNotice).toContain("API");

    for (const key of fakePlatformMetricKeys) {
      expect(evidence).not.toHaveProperty(key);
    }
  });
});

describe("applyDouyinFallbackToResult", () => {
  it("merges douyin evidence, clamps score movement, and preserves original fields", () => {
    const result = {
      id: "product-1",
      totalScore: 50,
      score: 40,
      keepMe: true,
      marketEvidence: {
        price: { pricePosition: "within_market" },
      },
    };
    const douyinEvidence = {
      scoreAdjustment: 99,
      heatLevel: "high",
    };

    const nextResult = applyDouyinFallbackToResult(result, douyinEvidence);

    expect(nextResult.douyinEvidence).toBe(douyinEvidence);
    expect(nextResult.marketEvidence.douyin).toBe(douyinEvidence);
    expect(nextResult.marketEvidence.price).toEqual({ pricePosition: "within_market" });
    expect(nextResult.totalScore).toBe(53);
    expect(nextResult.score).toBe(43);
    expect(nextResult.keepMe).toBe(true);
  });
});
