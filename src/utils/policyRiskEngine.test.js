import { describe, expect, it } from "vitest";

import {
  analyzeDouyinPackageRisk,
  analyzePolicyRisk,
  analyzeXhsPackageRisk,
  getRiskLevelText,
} from "./policyRiskEngine.js";
import { getPolicyRulesMeta, policyRiskRules, POLICY_RISK_DISCLAIMER } from "../data/policyRiskRules.js";

describe("analyzePolicyRisk - detection", () => {
  it("detects 广告法绝对化用语 (absolute claims)", () => {    const report = analyzePolicyRisk({ title: "全网最低价，100%必爆款" });
    expect(report.overallRiskLevel).toBe("high");
    expect(report.hits.some((h) => h.category === "广告法绝对化用语")).toBe(true);
  });

  it("detects unverified sales / 爆款 claims", () => {
    const report = analyzePolicyRisk({ body: "销量爆了，全网爆款，百万销量" });
    expect(report.hits.some((h) => h.category === "未证实销量/热度/平台数据")).toBe(true);
    expect(report.hits.length).toBeGreaterThan(0);
  });

  it("detects medical / efficacy risk", () => {
    const report = analyzePolicyRisk({ body: "立刻见效，可以消炎抗菌，帮助减肥瘦身" });
    expect(report.overallRiskLevel).toBe("high");
    expect(
      report.hits.some((h) => h.category === "医疗健康/身体功效风险" || h.category === "功效夸大")
    ).toBe(true);
  });

  it("detects brand infringement risk", () => {
    const report = analyzePolicyRisk({ sellingPoints: ["大牌同款", "原单尾货"] });
    expect(report.overallRiskLevel).toBe("high");
    expect(report.hits.some((h) => h.category === "侵权/品牌风险")).toBe(true);
  });

  it("detects platform-sensitive expressions", () => {
    const report = analyzePolicyRisk({ body: "加微信私下交易，包过审，刷单刷评论" });
    expect(report.overallRiskLevel).toBe("high");
    expect(report.hits.some((h) => h.category === "平台敏感营销表达")).toBe(true);
  });

  it("detects restricted goods as high risk", () => {
    const report = analyzePolicyRisk({ productName: "便携减肥药", category: "减肥药" });
    expect(report.overallRiskLevel).toBe("high");
    expect(report.hits.some((h) => h.category === "违禁或高风险商品提示")).toBe(true);
  });

  it("returns low for safe content", () => {
    const report = analyzePolicyRisk({
      title: "适合宿舍使用的香薰摆件",
      body: "适合多数桌面场景，建议以真实体验为准，先小范围测款。",
    });
    expect(report.overallRiskLevel).toBe("low");
    expect(report.hits.length).toBe(0);
  });

  it("uses medium level when two medium hits and no high", () => {
    const report = analyzePolicyRisk({ body: "学生党无脑入", title: "儿童必备" });
    expect(report.hits.length).toBeGreaterThanOrEqual(2);
    expect(report.overallRiskLevel).toBe("medium");
  });
});

describe("analyzePolicyRisk - output shape", () => {
  it("provides saferAlternatives and safe rewrite suggestions", () => {
    const report = analyzePolicyRisk({ title: "全网最低，100%必买" });
    expect(Array.isArray(report.safeRewriteSuggestions)).toBe(true);
    expect(report.safeRewriteSuggestions.length).toBeGreaterThan(0);
    report.hits.forEach((hit) => {
      expect(Array.isArray(hit.saferAlternatives)).toBe(true);
      expect(typeof hit.safeRewrite).toBe("string");
      expect(hit.safeRewrite.length).toBeGreaterThan(0);
    });
  });

  it("populates blockedTerms / cautionTerms / summary / disclaimer", () => {
    const report = analyzePolicyRisk({ title: "全网最低", body: "学生党无脑入" });
    expect(report.blockedTerms.length).toBeGreaterThan(0);
    expect(typeof report.summary).toBe("string");
    expect(report.disclaimer).toBe(POLICY_RISK_DISCLAIMER);
    expect(["low", "medium", "high"]).toContain(report.overallRiskLevel);
    expect(typeof report.riskScore).toBe("number");
  });

  it("records matched field and reason for each hit", () => {
    const report = analyzePolicyRisk({ title: "全网最低" });
    expect(report.hits.length).toBeGreaterThan(0);
    expect(report.hits.every((h) => h.field === "title")).toBe(true);
    expect(report.hits.some((h) => h.matchedText === "全网最低")).toBe(true);
    expect(report.hits.every((h) => h.riskReason.length > 0)).toBe(true);
  });
});

describe("module integrations", () => {
  it("scans a Xiaohongshu content pack", () => {
    const xhsPackage = {
      titles: ["全网最低价的发圈", "学生党无脑入"],
      coverHooks: ["100%必爆"],
      merchantStrategy: "适合小范围测款",
    };
    const report = analyzeXhsPackageRisk(xhsPackage, ["第一步：拍摄宿舍场景"], { productName: "发圈", channel: "小红书" });
    expect(report.overallRiskLevel).toBe("high");
    expect(report.hits.length).toBeGreaterThan(0);
  });

  it("scans a Douyin script pack", () => {
    const douyinPackage = {
      direction: "前三秒强调全网最低价",
      shots: [{ time: "0-3s", copy: "立刻见效，根治痘痘", visual: "特写", focus: "钩子", purpose: "吸引" }],
      coverTexts: ["必买爆款"],
      merchantGoal: "测试转化",
    };
    const report = analyzeDouyinPackageRisk(douyinPackage, { productName: "护肤品", channel: "抖音" });
    expect(report.overallRiskLevel).toBe("high");
    expect(report.hits.length).toBeGreaterThan(0);
  });
});

describe("compliance wording guardrails", () => {
  it("never claims to bypass platform review", () => {
    const blob = JSON.stringify({
      rules: policyRiskRules,
      meta: getPolicyRulesMeta(),
      disclaimer: POLICY_RISK_DISCLAIMER,
    });
    expect(blob).not.toContain("保证过审");
    expect(blob).not.toContain("绕审核");
    expect(blob).not.toContain("规避审核");
    expect(blob).not.toContain("破解平台");
    expect(blob).not.toContain("官方政策接口");
  });

  it("safe rewrites do not promise passing review", () => {
    const report = analyzePolicyRisk({ title: "全网最低，大牌同款，学生党无脑入" });
    const joined = report.safeRewriteSuggestions.join(" ") + report.summary + report.disclaimer;
    expect(joined).not.toContain("保证过审");
    expect(joined).not.toContain("绕审核");
  });
});

describe("rules meta", () => {
  it("exposes rule and category counts", () => {
    const meta = getPolicyRulesMeta();
    expect(meta.ruleCount).toBe(policyRiskRules.length);
    expect(meta.categoryCount).toBeGreaterThanOrEqual(10);
    expect(meta.updatedAt).toBeTruthy();
  });

  it("getRiskLevelText maps levels to chinese", () => {
    expect(getRiskLevelText("low")).toBe("低");
    expect(getRiskLevelText("medium")).toBe("中");
    expect(getRiskLevelText("high")).toBe("高");
  });
});

describe("false positive reduction (绝对化用语优化)", () => {
  it("1) flags 全网最低价 + 100%必爆 as high", () => {
    const report = analyzePolicyRisk({ title: "全网最低价，100%必爆" });
    expect(report.overallRiskLevel).toBe("high");
  });

  it("2) does not flag 最适合 (no bare 最 keyword)", () => {
    const report = analyzePolicyRisk({ body: "这款商品最适合小范围测款" });
    expect(report.overallRiskLevel).toBe("low");
    expect(report.hits.length).toBe(0);
  });

  it("3) does not trigger on 最近更新日期", () => {
    const report = analyzePolicyRisk({ body: "最近更新日期：2026-06-27" });
    expect(report.hits.length).toBe(0);
  });

  it("4) does not trigger on 最终动作 field", () => {
    const report = analyzePolicyRisk({ body: "最终动作：继续测 / 补货 / 放弃" });
    expect(report.hits.length).toBe(0);
  });

  it("5) does not flag 最低拿货价 / 最高拿货价 as ad-law risk", () => {
    const report = analyzePolicyRisk({ body: "最低拿货价 3 元，最高拿货价 9 元" });
    expect(report.hits.some((h) => h.category === "广告法绝对化用语")).toBe(false);
  });

  it("6) does not treat 请确认是否有官方授权 as marketing violation", () => {
    const report = analyzePolicyRisk({ body: "请确认是否有官方授权，请确认是否为正品，是否支持小批量试单" });
    expect(report.hits.some((h) => h.category === "侵权/品牌风险")).toBe(false);
  });

  it("7) still flags 大牌同款，原单尾货 as brand/infringement risk", () => {
    const report = analyzePolicyRisk({ sellingPoints: ["大牌同款，原单尾货"] });
    expect(report.overallRiskLevel).toBe("high");
    expect(report.hits.some((h) => h.category === "侵权/品牌风险")).toBe(true);
  });

  it("8) flags 保证爆款，销量第一 as high", () => {
    const report = analyzePolicyRisk({ body: "保证爆款，销量第一" });
    expect(report.overallRiskLevel).toBe("high");
  });

  it("does not promote 爆款潜力 / 爆款测款 analysis context to high", () => {
    const report = analyzePolicyRisk({ body: "该商品是否具备爆款潜力，适合先做爆款测款验证" });
    expect(report.overallRiskLevel).not.toBe("high");
  });

  it("removed the bare 最 high-risk keyword from the rule library", () => {
    const adRules = policyRiskRules.filter((rule) => rule.category === "广告法绝对化用语");
    const allKeywords = adRules.flatMap((rule) => rule.keywords);
    expect(allKeywords).not.toContain("最");
  });
});

