// internalTestDataEngine.js
// 自有用户测款数据沉淀分析。
// 数据来源：产品库保存记录、测款复盘记录、当前 reviewData（localStorage / Supabase 已有记录）。
// 仅统计 TradePilot 自有记录，不代表全网市场表现，不抓取任何平台数据。

import { classifyCategory, classifyChannels } from "./productLibraryUtils.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function toNumber(value) {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function avg(values) {
  const defined = values.filter((v) => v != null && Number.isFinite(v));
  if (!defined.length) return null;
  return defined.reduce((acc, v) => acc + v, 0) / defined.length;
}

// 把任意记录（产品库 / 复盘 / 扁平 schema）归一化成统一字段。
export function normalizeTestRecord(record) {
  const r = asObject(record);
  const result = asObject(r.result);
  const product = asObject(r.product);
  const review = asObject(result.review || r.review);

  const sellingPrice = toNumber(r.sellingPrice ?? r.price ?? result.effectivePrice?.price ?? product.price);
  const grossMargin = toNumber(r.grossMargin ?? result.margin ?? r.margin);

  const channelGroups = classifyChannels({ ...r, product });
  const channel = r.channel || product.channel || channelGroups[0] || "其他";

  return {
    productName: r.productName || r.product_name || product.name || "未命名产品",
    category: r.category || product.category || result.categoryName || "",
    categoryGroup: classifyCategory({ ...r, product }),
    channel,
    channelGroups,
    sellingPrice,
    grossMargin,
    exposureCount: toNumber(r.exposureCount ?? review.views),
    interactionCount: toNumber(r.interactionCount ?? review.likes),
    favoriteCount: toNumber(r.favoriteCount ?? review.saves),
    inquiryCount: toNumber(r.inquiryCount ?? review.inquiries),
    orderCount: toNumber(r.orderCount ?? review.orders),
    testCost: toNumber(r.testCost ?? review.cost),
    finalAction: r.finalAction || result.status || r.advice || "",
    createdAt: r.createdAt || r.created_at || "",
  };
}

function ratio(a, b) {
  if (a == null || b == null || b === 0) return null;
  return (a / b) * 100;
}

function getDataMaturityLevel(count) {
  if (count > 30) return "high";
  if (count >= 6) return "medium";
  return "low";
}

const MATURITY_TEXT = { low: "低", medium: "中", high: "高" };
export function getMaturityText(level) {
  return MATURITY_TEXT[level] || "低";
}

const CHANNEL_GROUP_KEYS = ["小红书", "抖音", "校园市集", "电商平台", "线下摆摊", "其他"];

function isReplenish(action) {
  return String(action || "").includes("补货");
}
function isReject(action) {
  const a = String(action || "");
  return a.includes("放弃") || a.includes("暂不") || a.includes("不建议") || a === "rejected";
}

export function analyzeInternalTestData(records) {
  const list = asArray(records).map(normalizeTestRecord).filter((r) => r.productName);

  const totalTestedProducts = list.length;
  const dataMaturityLevel = getDataMaturityLevel(totalTestedProducts);

  // 按类目统计
  const categoryMap = new Map();
  list.forEach((item) => {
    const key = item.categoryGroup || "其他";
    if (!categoryMap.has(key)) {
      categoryMap.set(key, { category: key, records: [] });
    }
    categoryMap.get(key).records.push(item);
  });

  const categoryStats = [...categoryMap.values()].map((group) => {
    const items = group.records;
    const inquiryRates = items.map((i) => ratio(i.inquiryCount, i.exposureCount));
    const conversionRates = items.map((i) => ratio(i.orderCount, i.inquiryCount));
    return {
      category: group.category,
      count: items.length,
      averageSellingPrice: avg(items.map((i) => i.sellingPrice)),
      averageGrossMargin: avg(items.map((i) => i.grossMargin)),
      averageInquiryRate: avg(inquiryRates),
      averageConversionRate: avg(conversionRates),
      replenishCount: items.filter((i) => isReplenish(i.finalAction)).length,
      rejectCount: items.filter((i) => isReject(i.finalAction)).length,
    };
  });

  // 按渠道统计（固定 6 个分组）
  const channelStats = CHANNEL_GROUP_KEYS.map((channelKey) => {
    const items = list.filter((i) => asArray(i.channelGroups).includes(channelKey));
    return {
      channel: channelKey,
      count: items.length,
      averageGrossMargin: avg(items.map((i) => i.grossMargin)),
      averageInquiryRate: avg(items.map((i) => ratio(i.inquiryCount, i.exposureCount))),
      averageConversionRate: avg(items.map((i) => ratio(i.orderCount, i.inquiryCount))),
    };
  }).filter((stat) => stat.count > 0);

  const averageGrossMargin = avg(list.map((i) => i.grossMargin));
  const averageInquiryRate = avg(list.map((i) => ratio(i.inquiryCount, i.exposureCount)));
  const averageConversionRate = avg(list.map((i) => ratio(i.orderCount, i.inquiryCount)));

  // 类目表现排名：综合询价率与成交率
  const rankable = categoryStats
    .map((stat) => ({
      category: stat.category,
      score: (stat.averageConversionRate || 0) * 0.6 + (stat.averageInquiryRate || 0) * 0.4,
      hasSignal: stat.averageConversionRate != null || stat.averageInquiryRate != null,
    }));
  const withSignal = rankable.filter((r) => r.hasSignal).sort((a, b) => b.score - a.score);
  const bestPerformingCategories = withSignal.slice(0, 3).map((r) => r.category);
  const weakCategories = withSignal.slice(-2).filter((r) => !bestPerformingCategories.includes(r.category)).map((r) => r.category);

  const recommendedActions = [];
  if (totalTestedProducts === 0) {
    recommendedActions.push("持续保存产品、填写测款复盘并记录补货结果，逐步积累自有测款样本。");
  } else {
    if (dataMaturityLevel === "low") {
      recommendedActions.push("当前样本较少，建议继续积累测款记录，再做类目和渠道层面的判断。");
    }
    if (bestPerformingCategories.length) {
      recommendedActions.push(`可优先关注表现较好的类目：${bestPerformingCategories.join("、")}，并结合价格与供应商稳定性验证。`);
    }
    if (weakCategories.length) {
      recommendedActions.push(`表现较弱的类目：${weakCategories.join("、")}，建议优化内容或价格后再测。`);
    }
    recommendedActions.push("结合供应链行情和测款成本，判断是否进行小批量补货。");
  }

  let summary;
  if (totalTestedProducts === 0) {
    summary = "当前自有测款数据较少。随着用户持续保存产品、填写测款复盘和记录补货结果，TradePilot 将逐步形成面向低客单小商品的自有测款知识库。";
  } else {
    const bestText = bestPerformingCategories.length ? `表现较好的类目包括：${bestPerformingCategories.join("、")}。` : "";
    summary = `当前已沉淀 ${totalTestedProducts} 条测款记录，数据成熟度为${getMaturityText(dataMaturityLevel)}。${bestText}该结果来自 TradePilot 自有测款记录，不代表全网市场表现。`;
  }

  return {
    totalTestedProducts,
    categoryStats,
    channelStats,
    averageGrossMargin,
    averageInquiryRate,
    averageConversionRate,
    bestPerformingCategories,
    weakCategories,
    recommendedActions,
    dataMaturityLevel,
    summary,
  };
}

// 演示用测款数据（仅用于评委演示，必须标注「示例演示数据」，不可伪造成真实用户数据）。
export const DEMO_INTERNAL_TEST_RECORDS = [
  {
    id: "demo-internal-1",
    product_name: "毛绒钥匙扣",
    category: "饰品 / 配饰",
    price: "19.9",
    __demo: true,
    product: { name: "毛绒钥匙扣", category: "饰品 / 配饰", channel: "小红书" },
    result: {
      status: "正在测款",
      margin: 0.5,
      review: { views: 3000, likes: 220, saves: 80, inquiries: 15, orders: 5, cost: 100 },
    },
  },
  {
    id: "demo-internal-2",
    product_name: "奶油色大肠发圈",
    category: "发饰 / 发圈",
    price: "12.9",
    __demo: true,
    product: { name: "奶油色大肠发圈", category: "发饰 / 发圈", channel: "抖音" },
    result: {
      status: "建议补货",
      margin: 0.55,
      review: { views: 5000, likes: 350, saves: 120, inquiries: 25, orders: 8, cost: 160 },
    },
  },
  {
    id: "demo-internal-3",
    product_name: "宿舍香薰摆件",
    category: "家居生活",
    price: "49.9",
    __demo: true,
    product: { name: "宿舍香薰摆件", category: "家居生活", channel: "小红书" },
    result: {
      status: "改内容再测",
      margin: 0.45,
      review: { views: 1800, likes: 90, saves: 40, inquiries: 6, orders: 1, cost: 80 },
    },
  },
];
