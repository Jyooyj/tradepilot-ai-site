export const AI_INSIGHT_SCENARIOS = {
  purchase_decision: {
    title: "AI 进货决策推理",
    fallbackTitle: "基础进货策略建议",
    fallbackSummary: "当前已基于商品信息、规则评分、利润测算和风险判断生成基础进货建议，可先用于小批量拿样决策。",
    reasoningPoints: [
      "规则评分和利润测算已经覆盖拿货价、建议售价、MOQ、毛利率和首批压货资金。",
      "当前建议更适合用于判断是否小批量拿样，而不是直接决定大量补货。",
      "如果市场证据不足，应先补充竞品价格、内容热度和供应商条件，再决定是否扩大进货。",
    ],
    nextActions: [
      "先核对拿货价、建议售价、MOQ、运费和包装成本是否准确。",
      "补充 1-2 个竞品价格或同类内容案例作为参考。",
      "优先小批量拿样，并通过内容测款验证收藏、询单和成交反馈。",
    ],
    riskWarnings: [
      "不要把综合评分理解为真实销量预测。",
      "市场证据不足时，不建议直接大量进货。",
      "供应商价格、包装费、运费和售后规则需要在拿样前再次确认。",
    ],
    confidenceNote: "当前展示为基础策略建议，已保留进货判断、利润测算和风险提示，不影响报告使用。",
  },
  content_testing: {
    title: "AI 内容测款策略",
    fallbackTitle: "基础内容测款建议",
    fallbackSummary: "当前已基于商品信息、目标人群、销售渠道和规则报告生成基础内容测款建议，可用于首轮小范围测试。",
    reasoningPoints: [
      "原小红书内容包和抖音脚本仍可作为首轮测款参考。",
      "内容测试应验证用户是否理解卖点，而不是直接判断商品必爆。",
      "如果缺少市场证据，应把测试目标设为探索反馈，而不是放大投放。",
    ],
    nextActions: [
      "首轮准备 2-3 个封面或开头角度，对比点击、收藏、评论和询单。",
      "小红书重点表达使用场景、风格搭配和价格理由。",
      "抖音前 3 秒优先展示痛点、对比或上身 / 使用效果。",
    ],
    riskWarnings: [
      "避免照搬同类爆款话术导致内容同质化。",
      "不要编造播放量、点赞量或真实成交数据。",
      "首轮测款样本较小时，不建议直接据此大量补货。",
    ],
    confidenceNote: "当前展示为基础策略建议，已保留内容测款方向和风险提示，不影响报告使用。",
  },
  review_summary: {
    title: "AI 测款复盘总结",
    fallbackTitle: "基础测款复盘建议",
    fallbackSummary: "当前已基于用户填写的测款数据和规则指标生成基础复盘建议，可用于判断是否继续测试、调整内容或谨慎补货。",
    reasoningPoints: [
      "复盘应同时观察曝光、互动、询单和成交，不只看单一指标。",
      "如果互动高但成交低，可能需要检查价格、信任感或购买路径。",
      "如果曝光低但点击反馈不错，可以优先优化封面、标题和发布时间。",
    ],
    nextActions: [
      "对比互动率、询单率和成交率，判断问题更可能出在内容、价格还是商品本身。",
      "保留表现较好的内容角度，再做一轮小范围测试。",
      "补货前再次确认供应商价格、库存和发货周期。",
    ],
    riskWarnings: [
      "单次测款数据不足时，不建议直接大量补货。",
      "测款成本过高时，需要降低内容制作或投放成本。",
      "成交少不一定代表商品无效，也可能是内容表达或价格设置问题。",
    ],
    confidenceNote: "当前展示为基础策略建议，已保留测款复盘判断和下一步动作，不影响报告使用。",
  },
};

export const AI_INSIGHT_UNAVAILABLE_MESSAGE =
  "当前展示为基础策略建议，系统已基于规则报告和用户填写信息生成可执行建议。";

const TECHNICAL_TEXT_PATTERNS = [
  /fallback/gi,
  /timeout/gi,
  /请求超时/g,
  /接口异常/g,
  /AI\s*推理补充暂不可用/g,
  /AI\s*内容测款策略暂不可用/g,
  /AI\s*测款复盘总结暂不可用/g,
  /未取得可用\s*LLM/g,
  /已保留原内容包和规则报告/g,
  /已保留规则报告/g,
  /已保留规则复盘结论/g,
];

export function getAiInsightTitle(scenario, source = "llm") {
  const config = AI_INSIGHT_SCENARIOS[scenario] || AI_INSIGHT_SCENARIOS.purchase_decision;

  if (source === "fallback") {
    return config.fallbackTitle || "基础策略建议";
  }

  return config.title || "AI 智能推理";
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function containsTechnicalText(value) {
  const text = String(value ?? "");
  return TECHNICAL_TEXT_PATTERNS.some((pattern) => pattern.test(text));
}

function sanitizeUserFacingText(value, fallback = "") {
  const text = asText(value, fallback);
  if (!text) return fallback;
  return containsTechnicalText(text) ? fallback : text;
}

function asTextArray(value, fallback = []) {
  const source = Array.isArray(value) ? value : [];
  const items = source
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item === null || item === undefined) return "";
      return String(item).trim();
    })
    .filter(Boolean)
    .filter((item) => !containsTechnicalText(item))
    .slice(0, 5);

  return items.length ? items : fallback;
}

export function buildAiInsightFallback(scenario = "purchase_decision", reason = "") {
  const config = AI_INSIGHT_SCENARIOS[scenario] || AI_INSIGHT_SCENARIOS.purchase_decision;

  if (reason && typeof console !== "undefined") {
    console.warn("[TradePilot AI] AI insight fallback:", reason);
  }

  return {
    ok: true,
    source: "fallback",
    scenario,
    summary: config.fallbackSummary,
    reasoningPoints: config.reasoningPoints,
    nextActions: config.nextActions,
    riskWarnings: config.riskWarnings,
    confidenceNote: config.confidenceNote,
    internalReason: reason || "",
  };
}

export function normalizeAiInsight(value, scenario = "purchase_decision") {
  const source = asObject(value);
  const normalizedScenario = AI_INSIGHT_SCENARIOS[source.scenario] ? source.scenario : scenario;
  const fallback = buildAiInsightFallback(normalizedScenario);
  const normalizedSource = source.source === "llm" ? "llm" : "fallback";

  if (source.errorMessage && typeof console !== "undefined") {
    console.warn("[TradePilot AI] AI insight error:", source.errorMessage);
  }

  return {
    ok: source.ok !== false,
    source: normalizedSource,
    scenario: normalizedScenario,
    summary: sanitizeUserFacingText(source.summary, fallback.summary),
    reasoningPoints: asTextArray(source.reasoningPoints, fallback.reasoningPoints),
    nextActions: asTextArray(source.nextActions, fallback.nextActions),
    riskWarnings: asTextArray(source.riskWarnings, fallback.riskWarnings),
    confidenceNote: sanitizeUserFacingText(source.confidenceNote, fallback.confidenceNote),
    internalReason: source.internalReason || source.errorMessage || "",
  };
}

export function hasReviewInsightData(reviewData = {}) {
  const review = asObject(reviewData);
  return ["views", "likes", "saves", "comments", "inquiries", "orders", "cost"].some((key) => {
    return String(review[key] ?? "").trim().length > 0;
  });
}

export function buildAiInsightMarketEvidence(result = {}) {
  const safeResult = asObject(result);
  const marketEvidence = asObject(safeResult.marketEvidence);

  return {
    priceEvidence: safeResult.priceEvidence || marketEvidence.price || null,
    manualMarketEvidence: safeResult.manualMarketEvidence || marketEvidence.manual || null,
    douyinEvidence: safeResult.douyinEvidence || marketEvidence.douyin || null,
  };
}

export function getAiInsightMap(value = {}) {
  const source = asObject(value);

  return Object.keys(AI_INSIGHT_SCENARIOS).reduce((insights, scenario) => {
    if (source[scenario]) {
      insights[scenario] = normalizeAiInsight(source[scenario], scenario);
    }
    return insights;
  }, {});
}
