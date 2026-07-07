import { describe, expect, it } from "vitest";

import {
  buildLibraryOverview,
  buildReplenishAdvice,
  buildStatusCounts,
  classifyCategory,
  classifyChannels,
  filterRecords,
  formatMarginDisplay,
  formatPriceDisplay,
  getNextStepSuggestion,
  getProductStatus,
  hasTestData,
  normalizeProductStatus,
  recordMatchesChannel,
} from "./productLibraryUtils.js";

function makeRecord(overrides = {}) {
  return {
    id: overrides.id || "r1",
    product_name: overrides.product_name || "测试商品",
    category: overrides.category || "饰品 / 耳饰",
    score: overrides.score ?? 80,
    price: overrides.price ?? "19.9",
    product: {
      name: overrides.product_name || "测试商品",
      category: overrides.category || "饰品 / 耳饰",
      channel: overrides.channel || "小红书 / 抖音",
      cost: overrides.cost ?? "3.8",
      moq: overrides.moq ?? "100",
      keywords: overrides.keywords || "",
      ...(overrides.product || {}),
    },
    result: {
      status: overrides.status ?? "准备拿样",
      margin: overrides.margin ?? 0.5,
      unitCost: overrides.unitCost ?? 3.8,
      review: overrides.review || {},
      ...(overrides.result || {}),
    },
  };
}

describe("normalizeProductStatus", () => {
  it("maps english statuses to chinese canonical statuses", () => {
    expect(normalizeProductStatus("completed")).toBe("建议拿样");
    expect(normalizeProductStatus("testing")).toBe("正在测款");
    expect(normalizeProductStatus("replenish")).toBe("建议补货");
    expect(normalizeProductStatus("rejected")).toBe("建议放弃");
    expect(normalizeProductStatus("sampled")).toBe("已拿样");
  });

  it("maps existing chinese statuses", () => {
    expect(normalizeProductStatus("准备拿样")).toBe("建议拿样");
    expect(normalizeProductStatus("正在测款")).toBe("正在测款");
    expect(normalizeProductStatus("建议补货")).toBe("建议补货");
    expect(normalizeProductStatus("暂不考虑")).toBe("建议放弃");
    expect(normalizeProductStatus("不建议拿货")).toBe("建议放弃");
    expect(normalizeProductStatus("待补充信息")).toBe("待补充信息");
  });

  it("falls back to 待补充信息 for empty status", () => {
    expect(normalizeProductStatus("")).toBe("待补充信息");
    expect(normalizeProductStatus(null)).toBe("待补充信息");
  });
});

describe("getProductStatus", () => {
  it("respects a manual override", () => {
    expect(getProductStatus(makeRecord(), "已拿样")).toBe("已拿样");
  });

  it("returns 待补充信息 when price and margin both missing", () => {
    const record = makeRecord({ price: "", margin: 0, result: { status: "准备拿样", margin: 0 } });
    expect(getProductStatus(record)).toBe("待补充信息");
  });

  it("does not crash on an empty record", () => {
    expect(() => getProductStatus({})).not.toThrow();
    expect(getProductStatus({})).toBe("待补充信息");
  });
});

describe("classifyCategory", () => {
  it("classifies the demo products correctly", () => {
    expect(classifyCategory(makeRecord({ product_name: "蝴蝶结珍珠耳夹", category: "饰品 / 耳饰" }))).toBe("饰品 / 耳饰 / 配饰");
    expect(classifyCategory(makeRecord({ product_name: "奶油色大肠发圈", category: "发饰 / 女生日用小商品" }))).toBe("发饰 / 发圈");
    expect(classifyCategory(makeRecord({ product_name: "宿舍桌面香薰摆件", category: "家居生活 / 宿舍好物" }))).toBe("家居生活");
    expect(classifyCategory(makeRecord({ product_name: "国风城市贴纸套装", category: "文创 / 贴纸 / 旅行纪念" }))).toBe("文创纸品");
    expect(classifyCategory(makeRecord({ product_name: "透明防摔手机壳挂绳套装", category: "数码周边 / 手机壳 / 挂绳" }))).toBe("手机周边");
    expect(classifyCategory(makeRecord({ product_name: "便携去污湿巾组合装", category: "低价日用 / 清洁小商品" }))).toBe("低价日用");
  });

  it("falls back to 其他 when nothing matches", () => {
    expect(classifyCategory({ product_name: "神秘商品", category: "神秘类目", product: { name: "神秘商品", category: "神秘类目" } })).toBe("其他");
    expect(classifyCategory({})).toBe("其他");
  });
});

describe("classifyChannels", () => {
  it("detects channels from the channel field", () => {
    expect(classifyChannels(makeRecord({ channel: "小红书 / 抖音 / 校园私域" }))).toEqual(
      expect.arrayContaining(["小红书", "抖音", "校园市集"])
    );
    expect(classifyChannels(makeRecord({ channel: "1688批发复购 / 摆摊市集" }))).toEqual(
      expect.arrayContaining(["电商平台", "线下摆摊"])
    );
  });

  it("returns 其他 when no channel matches", () => {
    expect(classifyChannels(makeRecord({ channel: "未知渠道" }))).toEqual(["其他"]);
  });

  it("recordMatchesChannel respects 全部渠道", () => {
    expect(recordMatchesChannel(makeRecord({ channel: "未知" }), "全部渠道")).toBe(true);
    expect(recordMatchesChannel(makeRecord({ channel: "小红书" }), "抖音")).toBe(false);
  });
});

describe("filtering", () => {
  const records = [
    makeRecord({ id: "a", product_name: "珍珠耳夹", category: "饰品 / 耳饰", status: "准备拿样", channel: "小红书" }),
    makeRecord({ id: "b", product_name: "大肠发圈", category: "发饰", status: "正在测款", channel: "抖音" }),
    makeRecord({ id: "c", product_name: "香薰摆件", category: "家居生活", status: "建议补货", channel: "校园市集" }),
  ];

  it("filters by status", () => {
    expect(filterRecords(records, { statusTab: "正在测款" }).map((r) => r.id)).toEqual(["b"]);
  });

  it("filters by category", () => {
    expect(filterRecords(records, { category: "发饰 / 发圈" }).map((r) => r.id)).toEqual(["b"]);
  });

  it("filters by channel", () => {
    expect(filterRecords(records, { channel: "校园市集" }).map((r) => r.id)).toEqual(["c"]);
  });

  it("returns all with default filters", () => {
    expect(filterRecords(records, {}).length).toBe(3);
  });
});

describe("overview & counts", () => {
  const records = [
    makeRecord({ id: "a", status: "准备拿样", score: 90, margin: 0.5 }),
    makeRecord({ id: "b", status: "准备拿样", score: 88, margin: 0.4 }),
    makeRecord({ id: "c", status: "正在测款", score: 75, margin: 0.3 }),
    makeRecord({ id: "d", status: "建议补货", score: 82, margin: 0.45 }),
  ];

  it("counts statuses correctly", () => {
    const counts = buildStatusCounts(records);
    expect(counts["全部"]).toBe(4);
    expect(counts["建议拿样"]).toBe(2);
    expect(counts["正在测款"]).toBe(1);
    expect(counts["建议补货"]).toBe(1);
  });

  it("computes overview averages", () => {
    const overview = buildLibraryOverview(records);
    expect(overview.total).toBe(4);
    expect(overview.suggestSample).toBe(2);
    expect(overview.averageScore).toBe(Math.round((90 + 88 + 75 + 82) / 4));
    expect(overview.averageMargin).toBeCloseTo((0.5 + 0.4 + 0.3 + 0.45) / 4, 5);
  });

  it("does not crash on records with missing fields", () => {
    expect(() => buildLibraryOverview([{}, { id: "x" }])).not.toThrow();
  });
});

describe("display fallbacks", () => {
  it("shows 待补充 for missing price / margin", () => {
    expect(formatPriceDisplay({})).toBe("待补充");
    expect(formatMarginDisplay({})).toBe("待补充");
    expect(formatPriceDisplay(makeRecord({ price: "29.9" }))).toBe("29.9");
    expect(formatMarginDisplay(makeRecord({ margin: 0.5 }))).toBe("50%");
  });
});

describe("next step suggestion", () => {
  it("returns a sentence per status", () => {
    expect(getNextStepSuggestion("建议拿样")).toContain("小批量拿样");
    expect(getNextStepSuggestion("正在测款")).toContain("曝光");
    expect(getNextStepSuggestion("建议补货")).toContain("补货");
    expect(getNextStepSuggestion("建议放弃")).toContain("暂缓");
  });
});

describe("buildReplenishAdvice", () => {
  it("does not promise replenishment without test data", () => {
    const advice = buildReplenishAdvice(makeRecord({ review: {} }));
    expect(advice.level).toBe("待复盘后判断");
    expect(advice.quantity).toBe("");
    expect(advice.reason).toContain("缺少");
  });

  it("suggests small-batch replenishment with orders and healthy margin", () => {
    const advice = buildReplenishAdvice(
      makeRecord({ margin: 0.6, review: { views: 5000, saves: 200, inquiries: 50, orders: 20 } })
    );
    expect(advice.level).toBe("小批量补货");
    expect(advice.quantity).toBe("30–50 件");
  });

  it("suggests content/price tweak when interest but no orders", () => {
    const advice = buildReplenishAdvice(
      makeRecord({ margin: 0.5, review: { views: 5000, saves: 200, inquiries: 30, orders: 0 } })
    );
    expect(advice.level).toBe("改内容或价格后再测");
  });

  it("returns 待补充信息 when cost or moq missing", () => {
    const advice = buildReplenishAdvice(
      makeRecord({ result: { status: "建议补货", margin: 0.5, unitCost: null }, product: { cost: "", moq: "" } })
    );
    expect(advice.level).toBe("待补充信息");
  });

  it("hasTestData detects presence of metrics", () => {
    expect(hasTestData(makeRecord({ review: {} }))).toBe(false);
    expect(hasTestData(makeRecord({ review: { orders: 3 } }))).toBe(true);
  });
});
