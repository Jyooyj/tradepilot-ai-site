import { describe, expect, it } from "vitest";

import { evaluateGlobalFit, GLOBAL_FIT_DIMENSIONS, GLOBAL_FIT_DISCLAIMER } from "./globalFitEngine.js";

describe("evaluateGlobalFit - basic structure", () => {
  it("returns a complete report with all required fields", () => {
    const product = {
      name: "蝴蝶结珍珠耳夹",
      category: "饰品 / 耳饰",
      cost: "3.8",
      price: "19.9",
      material: "合金 + 仿珍珠",
      keywords: "法式、温柔风、不打耳洞、春夏氛围感",
      logistics: "小件轻货，包装成本低",
      audience: "18-25岁女生、学生党",
      note: "适合春夏穿搭、礼物场景。",
    };
    const result = {
      categoryKey: "jewelry",
      effectivePrice: { price: 19.9, cost: 3.8 },
      contentPotentialScore: 70,
      xhsPackage: { coverHooks: ["封面钩子1"], titles: ["标题1"] },
      douyinPackage: { coverTexts: ["封面文案1"], merchantGoal: "测试目标" },
    };

    const report = evaluateGlobalFit(product, result);

    expect(report).toBeTruthy();
    expect(typeof report.totalScore).toBe("number");
    expect(report.totalScore).toBeGreaterThanOrEqual(0);
    expect(report.totalScore).toBeLessThanOrEqual(100);
    expect(["高", "中", "低"]).toContain(report.level);
    expect(typeof report.recommendation).toBe("string");
    expect(report.recommendation.length).toBeGreaterThan(0);
    expect(Array.isArray(report.dimensions)).toBe(true);
    expect(report.dimensions).toHaveLength(GLOBAL_FIT_DIMENSIONS.length);
    expect(Array.isArray(report.advantages)).toBe(true);
    expect(report.advantages.length).toBeGreaterThanOrEqual(2);
    expect(report.advantages.length).toBeLessThanOrEqual(3);
    expect(Array.isArray(report.risks)).toBe(true);
    expect(report.risks.length).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(report.nextActions)).toBe(true);
    expect(report.nextActions.length).toBeGreaterThanOrEqual(2);
    expect(report.disclaimer).toContain("Demo");
    expect(report.engine).toBe("rule-based-v1");
  });
});

describe("evaluateGlobalFit - dimension scoring", () => {
  it("scores low-ticket light items high on price band and volume", () => {
    const product = {
      name: "大肠发圈",
      cost: "2.1",
      price: "12.9",
      material: "绒感布料",
      logistics: "轻货，适合组合销售",
      keywords: "氛围感发圈、宿舍好物",
      audience: "16-28岁女生",
      note: "宿舍好物，颜色组合。",
    };
    const result = {
      categoryKey: "hair_accessory",
      effectivePrice: { price: 12.9, cost: 2.1 },
      contentPotentialScore: 65,
      xhsPackage: { coverHooks: ["a"] },
      douyinPackage: {},
    };

    const report = evaluateGlobalFit(product, result);
    const priceBand = report.dimensions.find((d) => d.key === "priceBand");
    const volume = report.dimensions.find((d) => d.key === "volumeWeight");
    expect(priceBand.score).toBeGreaterThanOrEqual(70);
    expect(volume.score).toBeGreaterThanOrEqual(70);
  });

  it("scores fragile/heavy home items lower on damage and volume", () => {
    const product = {
      name: "玻璃香薰瓶",
      cost: "12.5",
      price: "49.9",
      material: "玻璃瓶 + 香薰精油",
      logistics: "玻璃瓶易碎，包装和运费成本较高",
      keywords: "宿舍氛围感、桌面改造",
      audience: "大学生、宿舍党",
      note: "易碎玻璃，需要防震包装。",
    };
    const result = {
      categoryKey: "home_lifestyle",
      effectivePrice: { price: 49.9, cost: 12.5 },
      contentPotentialScore: 60,
      xhsPackage: {},
      douyinPackage: {},
    };

    const report = evaluateGlobalFit(product, result);
    const damage = report.dimensions.find((d) => d.key === "damage");
    const volume = report.dimensions.find((d) => d.key === "volumeWeight");
    expect(damage.score).toBeLessThan(60);
    expect(volume.score).toBeLessThan(60);
  });

  it("penalizes compliance-sensitive keywords (efficacy/brand)", () => {
    const product = {
      name: "美白淡斑精华",
      cost: "8",
      price: "39.9",
      material: "精华液",
      keywords: "美白、淡斑、抗皱、药用配方",
      logistics: "小件",
      audience: "女性",
      note: "功效宣称",
    };
    const result = {
      categoryKey: "daily_necessity",
      effectivePrice: { price: 39.9, cost: 8 },
      contentPotentialScore: 50,
      xhsPackage: { titles: ["正品授权"] },
      douyinPackage: { coverTexts: ["1:1复刻"] },
    };

    const report = evaluateGlobalFit(product, result);
    const compliance = report.dimensions.find((d) => d.key === "compliance");
    expect(compliance.score).toBeLessThan(60);
    expect(compliance.hits.length).toBeGreaterThan(0);
  });
});

describe("evaluateGlobalFit - level thresholds", () => {
  it("returns high level for an ideal low-ticket cross-border product", () => {
    const product = {
      name: "国风贴纸套装",
      cost: "4.6",
      price: "18.8",
      material: "防水PET贴纸",
      logistics: "轻货，包装成本低",
      keywords: "国风、城市记忆、手帐、文旅",
      audience: "大学生、手帐爱好者",
      note: "适合节日市集和校园社团活动。",
    };
    const result = {
      categoryKey: "stationery_cultural",
      effectivePrice: { price: 18.8, cost: 4.6 },
      contentPotentialScore: 75,
      xhsPackage: { coverHooks: ["a", "b"] },
      douyinPackage: {},
    };

    const report = evaluateGlobalFit(product, result);
    expect(report.totalScore).toBeGreaterThanOrEqual(70);
    expect(["高", "中"]).toContain(report.level);
  });

  it("never crashes with empty input", () => {
    const report = evaluateGlobalFit(null, null);
    expect(report).toBeTruthy();
    expect(report.totalScore).toBeGreaterThanOrEqual(0);
    expect(report.dimensions).toHaveLength(GLOBAL_FIT_DIMENSIONS.length);
    expect(report.advantages.length).toBeGreaterThanOrEqual(2);
    expect(report.risks.length).toBeGreaterThanOrEqual(2);
  });
});

describe("GLOBAL_FIT_DISCLAIMER", () => {
  it("mentions Demo and manual review", () => {
    expect(GLOBAL_FIT_DISCLAIMER).toContain("Demo");
    expect(GLOBAL_FIT_DISCLAIMER).toContain("人工复核");
  });
});
