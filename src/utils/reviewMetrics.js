// reviewMetrics.js
// 测款复盘指标计算：把原始复盘数据整理成“转化漏斗 + 关键指标 + 规则判断”。
//
// 原则：
// - 分母为 0 / 字段缺失时返回 null（UI 显示“待补充”），绝不返回 0% 假结果，也不报错。
// - 百分比保留 1 位小数，成本保留 2 位小数。
// - 数量、比例、金额分别归类，绝不混在同一个图表里。
// 纯函数、无副作用、不依赖 React，可单测。

function toCount(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const num = Number(text);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function sumDefined(values) {
  const defined = values.filter((v) => v != null);
  if (!defined.length) return null;
  return defined.reduce((acc, v) => acc + v, 0);
}

// 比例：a / b，缺失或分母为 0 返回 null。
function ratio(a, b) {
  if (a == null || b == null || b === 0) return null;
  return (a / b) * 100;
}

function round1(value) {
  return value == null ? null : Number(value.toFixed(1));
}

function round2(value) {
  return value == null ? null : Number(value.toFixed(2));
}

// 单次成本：cost / count，缺失或分母为 0 返回 null。
function perUnitCost(cost, count) {
  if (cost == null || count == null || count === 0) return null;
  return cost / count;
}

export function formatPercent(value) {
  return value == null ? "待补充" : `${round1(value)}%`;
}

export function formatMoney(value) {
  return value == null ? "待补充" : `¥${round2(value)}`;
}

export function formatCount(value) {
  return value == null ? "待补充" : String(value);
}

// 漏斗每一层相对“上一层”的转化阈值（低于即视为该环节流失）。
const FUNNEL_LOW_THRESHOLDS = {
  interaction: 3, // 互动 / 曝光
  favorite: 15, // 收藏 / 互动
  inquiry: 15, // 询价 / 收藏
  order: 15, // 成交 / 询价
};

const BOTTLENECK_MESSAGES = {
  interaction: "高曝光低互动：用户大多停在封面/标题/前三秒，建议重做封面、标题和开头钩子。",
  favorite: "高互动低收藏：内容有吸引力但商品价值表达不足，建议强化卖点、材质和使用价值展示。",
  inquiry: "高收藏低询价：用户喜欢但没来问价，多为价格、购买路径或信任背书不足。",
  order: "高询价低成交：用户问了但没下单，排查价格、运费、客服回复、库存或售后。",
  healthy: "转化链路较健康：若成交稳定且单次成交成本可控，可考虑小批量补货。",
  insufficient: "当前数据量偏小，只能作为下一轮测试假设，不能直接判断是否爆款。",
};

export function buildReviewMetrics(reviewData = {}, productContext = {}) {
  const review = reviewData && typeof reviewData === "object" ? reviewData : {};
  const ctx = productContext && typeof productContext === "object" ? productContext : {};

  const exposureCount = toCount(review.views);
  const likes = toCount(review.likes);
  const saves = toCount(review.saves);
  const comments = toCount(review.comments);
  const inquiryCount = toCount(review.inquiries);
  const orderCount = toCount(review.orders);
  const testCost = toCount(review.cost);

  const interactionCount = sumDefined([likes, saves, comments]);
  const favoriteCount = saves;

  // 关键指标（卡片用）
  const interactionRate = round1(ratio(interactionCount, exposureCount)); // 互动 / 曝光
  const favoriteRate = round1(ratio(favoriteCount, exposureCount)); // 收藏 / 曝光
  const favoriteVsInteraction = round1(ratio(favoriteCount, interactionCount)); // 收藏 / 互动
  const inquiryRate = round1(ratio(inquiryCount, exposureCount)); // 询价 / 曝光
  const inquiryVsFavorite = round1(ratio(inquiryCount, favoriteCount)); // 询价 / 收藏
  const orderRate = round1(ratio(orderCount, inquiryCount)); // 成交 / 询价（成交转化率）
  const orderVsExposure = round1(ratio(orderCount, exposureCount));

  const costPerInquiry = round2(perUnitCost(testCost, inquiryCount));
  const costPerOrder = round2(perUnitCost(testCost, orderCount));

  // 售价 / 毛利（用于 ROI / 效率评分）
  const suggestedPrice = toCount(ctx.suggestedPrice ?? ctx.price);
  const grossProfit = toCount(ctx.grossProfit ?? ctx.profit);
  // 预估 ROI = 成交额（成交量 × 售价）/ 测款成本；毛利 ROI 用毛利估算。
  const estimatedRevenue =
    orderCount != null && suggestedPrice != null ? orderCount * suggestedPrice : null;
  const estimatedGrossProfit =
    orderCount != null && grossProfit != null ? orderCount * grossProfit : null;
  const roi = round1(ratio(estimatedGrossProfit, testCost)); // 毛利 / 成本 ×100

  // 转化漏斗（同一量纲：数量；每层标注相对上一层转化率）
  const funnelSteps = [
    { key: "exposure", label: "曝光量", value: exposureCount, rate: null, rateLabel: "" },
    {
      key: "interaction",
      label: "互动量",
      value: interactionCount,
      rate: interactionRate,
      rateLabel: "互动率（相对曝光）",
    },
    {
      key: "favorite",
      label: "收藏量",
      value: favoriteCount,
      rate: favoriteVsInteraction,
      rateLabel: "收藏率（相对互动）",
    },
    {
      key: "inquiry",
      label: "询价量",
      value: inquiryCount,
      rate: inquiryVsFavorite,
      rateLabel: "询价率（相对收藏）",
    },
    {
      key: "order",
      label: "成交量",
      value: orderCount,
      rate: orderRate,
      rateLabel: "成交率（相对询价）",
    },
  ];

  // 缺失字段（显示“待补充”，提示用户补全）
  const missingFields = [];
  if (exposureCount == null) missingFields.push("曝光量");
  if (interactionCount == null) missingFields.push("互动量（点赞/收藏/评论）");
  if (inquiryCount == null) missingFields.push("询价量");
  if (orderCount == null) missingFields.push("成交量");
  if (testCost == null) missingFields.push("测款成本");
  if (suggestedPrice == null) missingFields.push("售价");
  if (grossProfit == null) missingFields.push("毛利");

  // 样本是否过小
  const dataTooSmall =
    exposureCount == null ||
    exposureCount < 300 ||
    interactionCount == null ||
    (inquiryCount == null && orderCount == null);

  // 找出主要流失环节（从漏斗顶部往下，第一处低于阈值的环节）
  let bottleneck = null;
  const orderedSteps = ["interaction", "favorite", "inquiry", "order"];
  const stepRateMap = {
    interaction: interactionRate,
    favorite: favoriteVsInteraction,
    inquiry: inquiryVsFavorite,
    order: orderRate,
  };
  for (const key of orderedSteps) {
    const rate = stepRateMap[key];
    if (rate == null) break; // 上游数据缺失，无法继续判断
    if (rate < FUNNEL_LOW_THRESHOLDS[key]) {
      bottleneck = key;
      break;
    }
  }

  const healthy = bottleneck == null && !dataTooSmall;

  // 决策与置信度
  let decision = "继续测";
  let decisionReason = "";
  if (dataTooSmall) {
    decision = "继续测";
    decisionReason = "样本量不足，先扩大测试样本，把当前结果作为假设。";
  } else if (healthy) {
    const costOk =
      costPerOrder == null ||
      grossProfit == null ||
      costPerOrder <= Math.max(grossProfit * 0.6, 1);
    if (orderCount != null && orderCount >= 3 && costOk) {
      decision = "小批量补货";
      decisionReason = "转化链路健康且单次成交成本可控，可小批量补货并继续跟踪复购与退换货。";
    } else {
      decision = "继续测";
      decisionReason = "链路健康但成交样本仍小，建议再积累成交数据后判断补货。";
    }
  } else if (bottleneck === "order") {
    if (inquiryCount != null && inquiryCount >= 10 && (orderRate == null || orderRate < 5)) {
      decision = "暂停";
      decisionReason = "询价充足但几乎不成交，先排查价格/运费/客服/售后，问题未解决前暂停放量。";
    } else {
      decision = "改内容再测";
      decisionReason = "成交环节卡住，优化价格、信任背书和客服后再测。";
    }
  } else {
    decision = "改内容再测";
    decisionReason = "上游环节流失明显，先按瓶颈优化内容/价值表达后再测。";
  }

  // 置信度
  let confidenceLevel = "低";
  if (!dataTooSmall && orderCount != null) {
    if (exposureCount >= 5000 && inquiryCount != null) confidenceLevel = "高";
    else if (exposureCount >= 1000) confidenceLevel = "中";
  }
  if (missingFields.includes("成交量") || missingFields.includes("测款成本")) {
    confidenceLevel = "低";
  }

  const bottleneckKey = dataTooSmall ? "insufficient" : bottleneck || "healthy";
  const judgment = BOTTLENECK_MESSAGES[bottleneckKey];

  return {
    exposureCount,
    interactionCount,
    favoriteCount,
    inquiryCount,
    orderCount,
    testCost,
    likes,
    saves,
    comments,
    interactionRate,
    favoriteRate,
    favoriteVsInteraction,
    inquiryRate,
    inquiryVsFavorite,
    orderRate,
    orderVsExposure,
    costPerInquiry,
    costPerOrder,
    suggestedPrice,
    grossProfit,
    estimatedRevenue,
    estimatedGrossProfit,
    roi,
    funnelSteps,
    bottleneck: bottleneckKey,
    bottleneckLabel: judgment,
    judgment,
    decision,
    decisionReason,
    decisionLevel: decision,
    confidenceLevel,
    dataTooSmall,
    missingFields,
    hasData: exposureCount != null || interactionCount != null || inquiryCount != null || orderCount != null,
  };
}

// 关键指标卡（统一结构，值缺失显示“待补充”）。
export function buildReviewMetricCards(metrics) {
  const m = metrics || {};
  return [
    { key: "interactionRate", label: "互动率", hint: "互动量 / 曝光量", value: formatPercent(m.interactionRate) },
    { key: "favoriteRate", label: "收藏率", hint: "收藏量 / 曝光量", value: formatPercent(m.favoriteRate) },
    { key: "inquiryRate", label: "询价率", hint: "询价量 / 曝光量", value: formatPercent(m.inquiryRate) },
    { key: "orderRate", label: "成交转化率", hint: "成交量 / 询价量", value: formatPercent(m.orderRate) },
    { key: "costPerInquiry", label: "单次询价成本", hint: "测款成本 / 询价量", value: formatMoney(m.costPerInquiry) },
    { key: "costPerOrder", label: "单次成交成本", hint: "测款成本 / 成交量", value: formatMoney(m.costPerOrder) },
    { key: "roi", label: "预估毛利ROI", hint: "成交毛利 / 测款成本", value: formatPercent(m.roi) },
  ];
}
