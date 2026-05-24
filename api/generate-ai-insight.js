const VALID_SCENARIOS = new Set([
  "purchase_decision",
  "content_testing",
  "review_summary",
]);

const SCENARIO_LABELS = {
  purchase_decision: "AI 进货决策推理",
  content_testing: "AI 内容测款策略",
  review_summary: "AI 测款复盘总结",
};

const FALLBACKS = {
  purchase_decision: {
    summary: "当前已基于商品信息、规则评分、利润测算和风险判断生成基础进货建议，可先用于小批量拿样决策。",
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
    ],
    confidenceNote: "当前展示为基础策略建议，已保留进货判断、利润测算和风险提示，不影响报告使用。",
  },
  content_testing: {
    summary: "当前已基于商品信息、目标人群、销售渠道和规则报告生成基础内容测款建议，可用于首轮小范围测试。",
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
    ],
    confidenceNote: "当前展示为基础策略建议，已保留内容测款方向和风险提示，不影响报告使用。",
  },
  review_summary: {
    summary: "当前已基于用户填写的测款数据和规则指标生成基础复盘建议，可用于判断是否继续测试、调整内容或谨慎补货。",
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
    ],
    confidenceNote: "当前展示为基础策略建议，已保留测款复盘判断和下一步动作，不影响报告使用。",
  },
};

function getBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return {};
    }
  }
  return {};
}

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

function fallbackInsight(scenario, internalReason = "") {
  const safeScenario = VALID_SCENARIOS.has(scenario) ? scenario : "purchase_decision";
  const fallback = FALLBACKS[safeScenario];

  if (internalReason) {
    console.warn("[TradePilot AI] AI insight fallback:", internalReason);
  }

  return {
    ok: true,
    source: "fallback",
    scenario: safeScenario,
    summary: fallback.summary,
    reasoningPoints: fallback.reasoningPoints,
    nextActions: fallback.nextActions,
    riskWarnings: fallback.riskWarnings,
    confidenceNote: fallback.confidenceNote,
    internalReason,
  };
}

function getDashScopeConfig() {
  return {
    apiKey:
      process.env.DASHSCOPE_API_KEY ||
      process.env.DASH_SCOPE_API_KEY ||
      process.env.ALIYUN_DASHSCOPE_API_KEY ||
      "",
    endpoint:
      process.env.DASHSCOPE_TEXT_ENDPOINT ||
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    model:
      process.env.DASHSCOPE_TEXT_MODEL ||
      process.env.QWEN_TEXT_MODEL ||
      "qwen-plus",
  };
}

function compactValue(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function pickFields(source = {}, fields = []) {
  const safeSource = source && typeof source === "object" && !Array.isArray(source) ? source : {};

  return fields.reduce((data, field) => {
    const value = safeSource[field];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      data[field] = value;
    }
    return data;
  }, {});
}

function summarizeArray(items, limit = 4) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        return item.title || item.label || item.name || item.text || "";
      }
      return String(item || "").trim();
    })
    .filter(Boolean)
    .slice(0, limit);
}

function buildCompactPayload({ product, result, marketEvidence, reviewData }) {
  const safeProduct = product && typeof product === "object" ? product : {};
  const safeResult = result && typeof result === "object" ? result : {};
  const safeMarketEvidence = marketEvidence && typeof marketEvidence === "object" ? marketEvidence : {};
  const safeReviewData = reviewData && typeof reviewData === "object" ? reviewData : {};

  return {
    product: pickFields(safeProduct, [
      "name",
      "productName",
      "category",
      "categoryKey",
      "cost",
      "price",
      "suggestedPrice",
      "moq",
      "material",
      "targetUser",
      "targetAudience",
      "channel",
      "supplier",
      "note",
    ]),
    result: {
      score: safeResult.score || safeResult.totalScore || safeResult.finalScore || "",
      suggestion: safeResult.suggestion || safeResult.aiSuggestion || safeResult.recommendation || "",
      grossMargin: safeResult.grossMargin || safeResult.margin || "",
      unitProfit: safeResult.unitProfit || "",
      firstBatchCost: safeResult.firstBatchCost || safeResult.initialCost || "",
      riskLevel: safeResult.riskLevel || safeResult.risk || "",
      risks: summarizeArray(safeResult.risks || safeResult.riskWarnings || safeResult.warnings),
      nextActions: summarizeArray(safeResult.nextActions || safeResult.actions),
      contentAdvice: safeResult.contentAdvice || safeResult.contentSummary || "",
    },
    marketEvidence: {
      priceEvidence: safeMarketEvidence.priceEvidence || safeMarketEvidence.price || null,
      manualMarketEvidence: safeMarketEvidence.manualMarketEvidence || safeMarketEvidence.manual || null,
      douyinEvidence: safeMarketEvidence.douyinEvidence || safeMarketEvidence.douyin || null,
    },
    reviewData: pickFields(safeReviewData, [
      "views",
      "likes",
      "saves",
      "comments",
      "inquiries",
      "orders",
      "cost",
      "conversionRate",
      "interactionRate",
      "inquiryRate",
    ]),
  };
}

function buildScenarioInstruction(scenario) {
  if (scenario === "content_testing") {
    return [
      "输出首轮测款内容方向。",
      "说明小红书表达重点。",
      "给出抖音视频开头钩子。",
      "说明如何避免同质化。",
      "说明测款时观察哪些指标。",
    ].join("\n");
  }

  if (scenario === "review_summary") {
    return [
      "说明本次测款结果可能代表什么。",
      "判断问题更可能出在产品、价格、内容还是渠道，并说明不确定性。",
      "给出下一轮应该调整什么。",
      "说明是否建议继续测、补货或放弃，必须偏向谨慎小批量。",
    ].join("\n");
  }

  return [
    "说明这个商品为什么适合或不适合拿样。",
    "指出最大风险。",
    "判断当前证据是否充分。",
    "说明最建议先验证什么。",
    "说明是否建议小批量测款。",
  ].join("\n");
}

function buildPrompt({ product, result, marketEvidence, reviewData, scenario }) {
  const compactPayload = buildCompactPayload({ product, result, marketEvidence, reviewData });

  return `
你是 TradePilot AI 的“智能推理补充层”，只做定性分析，不替代规则评分。

硬性要求：
- 不要编造真实平台数据。
- 不要编造销量、播放量、点赞量、价格。
- 只能基于用户输入和系统已有结果进行分析。
- 如果市场证据不足，要明确说明“不确定”。
- 建议应偏向小批量测款，而不是直接大量进货。
- 不要修改综合评分、利润率、MOQ、风险等级或任何原规则结果。
- 输出必须简洁、可执行、面向新手卖家，不要空泛，不要夸大预测能力。

当前场景：${SCENARIO_LABELS[scenario] || scenario}
场景任务：
${buildScenarioInstruction(scenario)}

关键输入：
${JSON.stringify(compactPayload, null, 2)}

请严格返回 JSON，不要 Markdown，不要解释 JSON 之外的内容。格式如下：
{
  "ok": true,
  "source": "llm",
  "scenario": "${scenario}",
  "summary": "",
  "reasoningPoints": [],
  "nextActions": [],
  "riskWarnings": [],
  "confidenceNote": ""
}
`;
}

function parseModelJson(rawText) {
  const cleaned = String(rawText || "")
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }

  return JSON.parse(cleaned);
}

function normalizeArray(value, fallback) {
  const items = Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 5)
    : [];
  return items.length ? items : fallback;
}

function normalizeInsight(value, scenario) {
  const fallback = fallbackInsight(scenario);
  const source = value && typeof value === "object" ? value : {};

  return {
    ok: true,
    source: "llm",
    scenario,
    summary: String(source.summary || "").trim() || fallback.summary,
    reasoningPoints: normalizeArray(source.reasoningPoints, fallback.reasoningPoints),
    nextActions: normalizeArray(source.nextActions, fallback.nextActions),
    riskWarnings: normalizeArray(source.riskWarnings, fallback.riskWarnings),
    confidenceNote: String(source.confidenceNote || "").trim() || "LLM 推理仅作为辅助建议，不替代规则评分；未提供真实平台数据时应保持不确定。",
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }

  const body = getBody(req);
  const scenario = VALID_SCENARIOS.has(body?.scenario) ? body.scenario : "purchase_decision";
  const dashScope = getDashScopeConfig();

  if (!dashScope.apiKey) {
    sendJson(res, 200, fallbackInsight(scenario, "missing_dashscope_api_key"));
    return;
  }

  try {
    const response = await fetch(dashScope.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dashScope.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: dashScope.model,
        messages: [
          {
            role: "system",
            content: "你是谨慎的电商选品分析助手。必须只基于输入分析，不编造真实平台数据，不替代规则评分。",
          },
          {
            role: "user",
            content: buildPrompt({
              product: body.product || {},
              result: body.result || {},
              marketEvidence: body.marketEvidence || {},
              reviewData: body.reviewData || null,
              scenario,
            }),
          },
        ],
        temperature: 0.25,
        max_tokens: 900,
      }),
    });

    let data = {};
    try {
      data = await response.json();
    } catch (jsonError) {
      data = {};
    }

    if (!response.ok) {
      sendJson(res, 200, fallbackInsight(scenario, `llm_http_${response.status}`));
      return;
    }

    const rawText = data.choices?.[0]?.message?.content || "";
    const parsed = parseModelJson(rawText);

    sendJson(res, 200, normalizeInsight(parsed, scenario));
  } catch (error) {
    sendJson(res, 200, fallbackInsight(scenario, "llm_request_or_parse_failed"));
  }
}
