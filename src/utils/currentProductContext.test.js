import { describe, it, expect } from "vitest";
import {
  stableHash,
  computeProductFingerprint,
  evaluateInfoSufficiency,
  collectCurrentProductKeywords,
  buildCurrentProductContext,
} from "./currentProductContext";

describe("currentProductContext", () => {
  it("stableHash is deterministic", () => {
    expect(stableHash("abc")).toBe(stableHash("abc"));
    expect(stableHash("abc")).not.toBe(stableHash("abd"));
  });

  it("fingerprint changes when the product changes", () => {
    const a = computeProductFingerprint({
      name: "木珠钥匙扣",
      category: "文创挂饰",
      cost: 2,
      price: 9.9,
      moq: 100,
      audience: "学生",
      channel: "小红书",
    });
    const b = computeProductFingerprint({
      name: "桌面收纳盒",
      category: "家居收纳",
      cost: 8,
      price: 39.9,
      moq: 50,
      audience: "上班族",
      channel: "抖音",
    });
    expect(a).not.toBe(b);
  });

  it("fingerprint is stable for identical input", () => {
    const input = { name: "发夹", category: "发饰", cost: 1, price: 9, moq: 200 };
    expect(computeProductFingerprint(input)).toBe(computeProductFingerprint(input));
  });

  it("evaluateInfoSufficiency flags missing fields for an empty product", () => {
    const { sufficient, missing } = evaluateInfoSufficiency({});
    expect(sufficient).toBe(false);
    expect(missing).toContain("productName");
    expect(missing).toContain("material");
  });

  it("evaluateInfoSufficiency passes for a well-described product", () => {
    const { sufficient } = evaluateInfoSufficiency({
      name: "桌面收纳盒",
      category: "家居收纳",
      material: "塑料",
      audience: "上班族",
      channel: "抖音",
      keywords: "办公桌 整理",
    });
    expect(sufficient).toBe(true);
  });

  it("buildCurrentProductContext binds to the current product only", () => {
    const ctx = buildCurrentProductContext({
      product: {
        name: "桌面收纳盒",
        category: "家居收纳",
        material: "塑料",
        audience: "上班族",
        channel: "抖音",
        cost: 8,
        price: 39.9,
        moq: 50,
      },
      result: { totalScore: 72, profit: 31.9, margin: 0.8, productIdentity: {} },
      hasImage: false,
    });
    expect(ctx.productName).toBe("桌面收纳盒");
    expect(ctx.productFingerprint).toBeTruthy();
    expect(ctx.reportId).toContain(ctx.productFingerprint);
    // 当前商品上下文绝不应包含历史污染词。
    expect(ctx.contextKeywordText).not.toContain("木珠");
    expect(ctx.contextKeywordText).not.toContain("钥匙扣");
  });

  it("collectCurrentProductKeywords includes current fields", () => {
    const text = collectCurrentProductKeywords({
      productName: "发夹",
      material: "金属",
      targetAudience: "学生党",
    });
    expect(text).toContain("发夹");
    expect(text).toContain("金属");
    expect(text).toContain("学生党");
  });
});
