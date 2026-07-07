export const AI_INSIGHT_SCENARIOS = {
  purchase_decision: {
    title: "AI 进货决策推理",
    fallbackSummary: "AI 推理补充暂不可用，已保留规则报告。请继续以综合评分、利润率、MOQ、风险提示和市场证据为主，先小批量拿样验证。",
    reasoningPoints: [
      "规则评分和利润测算仍然有效，AI 补充层不会覆盖原有数值结论。",
      "当前只能基于已填写信息和已有系统结果判断，不能代表真实平台销量或热度。",
      "证据不足时应先补充竞品价格、内容热度和供应商条件，再决定是否扩大进货。",
    ],
    nextActions: [
      "先拿样或小批量试单，验证材质、包装、到货稳定性和真实利润。",
      "复核同类零售价、批发价、MOQ、运费和售后成本。",
      "优先验证用户是否愿意咨询、收藏或下单，而不是直接大量进货。",
    ],
    riskWarnings: [
      "不要把 AI 建议当作销量预测。",
      "市场证据不足时不建议扩大备货。",
    ],
    confidenceNote: "fallback：未取得可用 LLM 推理结果，可信度以规则报告和人工复核为准。",
  },
  content_testing: {
    title: "AI 内容测款策略",
    fallbackSummary: "AI 内容测款策略暂不可用，已保留原内容包和规则报告。建议先围绕目标人群、使用场景、价格利益点和真实细节做小范围内容测试。",
    reasoningPoints: [
      "原小红书内容包和抖音脚本仍可使用，AI 补充层只提供定性策略。",
      "内容测试应验证卖点是否被理解，而不是直接判断商品必爆。",
      "如缺少市场证据，应明确把测试目标设为探索，而不是放大投放。",
    ],
    nextActions: [
      "首轮准备 2-3 个封面/开头角度，对比点击、收藏、评论和询单。",
      "小红书重点表达使用场景、风格搭配和价格理由。",
      "抖音前 3 秒优先展示痛点、对比或上身/使用效果。",
    ],
    riskWarnings: [
      "避免照搬同类爆款话术导致同质化。",
      "不要编造播放量、点赞量或真实成交数据。",
    ],
    confidenceNote: "fallback：未取得可用 LLM 策略，建议用小批量内容数据复核。",
  },
  review_summary: {
    title: "AI 测款复盘总结",
    fallbackSummary: "AI 测款复盘总结暂不可用，已保留规则复盘结论。请优先查看互动率、询单率、成交转化率和单均测款成本。",
    reasoningPoints: [
      "复盘规则结论仍然有效，AI 只辅助解释问题可能出在哪里。",
      "当前复盘只能基于用户填写的测款数据，不能推断平台真实流量质量。",
      "数据量较小时，应把结论视为下一轮测试假设。",
    ],
    nextActions: [
      "互动低时先改封面、标题和前 3 秒内容。",
      "询单高但成交低时复核价格、信任背书、运费和客服回复。",
      "成交稳定且成本可控时再考虑小批量补货。",
    ],
    riskWarnings: [
      "样本量不足时不要直接扩大进货。",
      "不要把单次测试结果当作长期需求预测。",
    ],
    confidenceNote: "fallback：未取得可用 LLM 复盘，可信度以已填测款数据和规则指标为准。",
  },
};

export const AI_INSIGHT_UNAVAILABLE_MESSAGE = "AI 推理补充暂不可用，已保留规则报告。";

export function getAiInsightTitle(scenario) {
  return AI_INSIGHT_SCENARIOS[scenario]?.title || "AI 智能推理补充";
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
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
    .slice(0, 5);

  return items.length ? items : fallback;
}

function sanitizeAiInsightVisibleText(value) {
  return String(value ?? "")
    .replace(/fallback[:：]?/gi, "基础建议：")
    .replace(/timeout/gi, "当前建议")
    .replace(/接口异常|内部错误|server_error|api error|function calling|tool_calls?/gi, "服务暂不可用")
    .trim();
}

export function buildAiInsightFallback(scenario = "purchase_decision", reason = "") {
  const config = AI_INSIGHT_SCENARIOS[scenario] || AI_INSIGHT_SCENARIOS.purchase_decision;
  const confidenceNote = reason ? `${config.confidenceNote} ${reason}` : config.confidenceNote;

  return {
    ok: true,
    source: "fallback",
    scenario,
    summary: sanitizeAiInsightVisibleText(config.fallbackSummary),
    reasoningPoints: config.reasoningPoints.map(sanitizeAiInsightVisibleText),
    nextActions: config.nextActions.map(sanitizeAiInsightVisibleText),
    riskWarnings: config.riskWarnings.map(sanitizeAiInsightVisibleText),
    confidenceNote: sanitizeAiInsightVisibleText(confidenceNote),
  };
}

export function normalizeAiInsight(value, scenario = "purchase_decision") {
  const source = asObject(value);
  const fallback = buildAiInsightFallback(scenario);
  const normalizedScenario = AI_INSIGHT_SCENARIOS[source.scenario] ? source.scenario : scenario;
  const normalizedSource = source.source === "llm" ? "llm" : "fallback";

  return {
    ok: source.ok !== false,
    source: normalizedSource,
    scenario: normalizedScenario,
    summary: sanitizeAiInsightVisibleText(asText(source.summary, fallback.summary)),
    reasoningPoints: asTextArray(source.reasoningPoints, fallback.reasoningPoints).map(sanitizeAiInsightVisibleText),
    nextActions: asTextArray(source.nextActions, fallback.nextActions).map(sanitizeAiInsightVisibleText),
    riskWarnings: asTextArray(source.riskWarnings, fallback.riskWarnings).map(sanitizeAiInsightVisibleText),
    confidenceNote: sanitizeAiInsightVisibleText(asText(source.confidenceNote, fallback.confidenceNote)),
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
