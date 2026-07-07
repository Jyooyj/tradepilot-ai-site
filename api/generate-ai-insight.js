const VALID_SCENARIOS = new Set([
  "purchase_decision",
  "content_testing",
  "review_summary",
  "review_funnel",
]);

const SCENARIO_LABELS = {
  purchase_decision: "AI 进货决策推理",
  content_testing: "AI 内容测款策略",
  review_summary: "AI 测款复盘总结",
  review_funnel: "AI 测款复盘总结",
};

const FALLBACKS = {
  purchase_decision: {
    summary: "AI 推理补充暂不可用，已保留规则报告。请继续以综合评分、利润率、MOQ、风险提示和市场证据为主，先小批量拿样验证。",
    reasoningPoints: [
      "规则评分和利润测算仍然有效，LLM 不会覆盖原有数值结论。",
      "当前只能基于已填写信息和系统结果判断，不能代表真实平台销量或热度。",
      "证据不足时应先补充竞品价格、内容热度和供应商条件。",
    ],
    nextActions: [
      "先拿样或小批量试单，验证材质、包装、到货稳定性和真实利润。",
      "复核同类零售价、批发价、MOQ、运费和售后成本。",
      "优先验证用户是否愿意咨询、收藏或下单。",
    ],
    riskWarnings: [
      "不要把 AI 建议当作销量预测。",
      "市场证据不足时不建议扩大备货。",
    ],
    confidenceNote: "fallback：未取得可用 LLM 推理结果，可信度以规则报告和人工复核为准。",
  },
  content_testing: {
    summary: "AI 内容测款策略暂不可用，已保留原内容包和规则报告。建议先围绕目标人群、使用场景、价格利益点和真实细节做小范围内容测试。",
    reasoningPoints: [
      "原小红书内容包和抖音脚本仍可使用，LLM 只提供定性策略。",
      "内容测试应验证卖点是否被理解，而不是直接判断商品必爆。",
      "如缺少市场证据，应把首轮测试定位为探索。",
    ],
    nextActions: [
      "准备 2-3 个封面/开头角度，对比点击、收藏、评论和询单。",
      "小红书重点表达使用场景、风格搭配和价格理由。",
      "抖音前 3 秒优先展示痛点、对比或使用效果。",
    ],
    riskWarnings: [
      "避免照搬同类爆款话术导致同质化。",
      "不要编造播放量、点赞量或真实成交数据。",
    ],
    confidenceNote: "fallback：未取得可用 LLM 策略，建议用小批量内容数据复核。",
  },
  review_summary: {
    summary: "AI 测款复盘总结暂不可用，已保留规则复盘结论。请优先查看互动率、询单率、成交转化率和单均测款成本。",
    reasoningPoints: [
      "复盘规则结论仍然有效，LLM 只辅助解释问题可能出在哪里。",
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

function fallbackInsight(scenario, reason = "") {
  const safeScenario = VALID_SCENARIOS.has(scenario) ? scenario : "purchase_decision";
  const fallback = FALLBACKS[safeScenario];

  return {
    ok: true,
    source: "fallback",
    scenario: safeScenario,
    summary: fallback.summary,
    reasoningPoints: fallback.reasoningPoints,
    nextActions: fallback.nextActions,
    riskWarnings: fallback.riskWarnings,
    confidenceNote: reason ? `${fallback.confidenceNote} ${reason}` : fallback.confidenceNote,
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

function truncateJson(value, maxLength = 12000) {
  const text = JSON.stringify(value || {}, null, 2);
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n...已截断` : text;
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

用户输入和系统结果如下：
${truncateJson({ product, result, marketEvidence, reviewData })}

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
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    // 模型偶尔会在 JSON 前后带说明文字，尝试截取第一个 { 到最后一个 } 再解析。
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw error;
  }
}

function normalizeArray(value, fallback) {
  const items = Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 5)
    : [];
  return items.length ? items : fallback;
}

// 测款复盘漏斗：构建 prompt（要求返回更丰富的 JSON 结构）。
function buildReviewFunnelPrompt(body) {
  const { product, reviewData, reviewMetrics, ruleJudgment } = body || {};
  return `
你是 TradePilot AI 的“测款复盘分析层”，只做定性复盘，不替代规则指标。

硬性要求：
- 只能基于当前测款数据判断，不得伪造平台真实流量质量、销量、点赞、播放或成交。
- 不得把小样本直接判断为爆款；样本量小时必须降低置信度并说明不确定。
- 如果成交量、测款成本或售价缺失，必须降低置信度，并在 missingData 中列出。
- 必须说明主要问题更可能出现在“曝光、互动、收藏、询价还是成交”哪个环节。
- 建议必须具体：下一轮怎么改封面、标题、价格、素材、供应商确认或补货策略。
- 不要输出空泛话术，不要堆叠形容词。

当前商品与测款数据：
${truncateJson({ product, reviewData, reviewMetrics, ruleJudgment })}

请严格返回 JSON（不要 Markdown，不要 JSON 之外的内容），格式如下：
{
  "ok": true,
  "source": "llm",
  "scenario": "review_funnel",
  "summary": "一句话结论",
  "keyFindings": ["3-5 条关键发现"],
  "bottleneck": "主要流失环节及原因",
  "nextActions": ["3-5 条下一轮具体动作"],
  "decision": "继续测 / 改内容再测 / 小批量补货 / 暂停",
  "confidence": "高 / 中 / 低",
  "missingData": ["还缺哪些数据"],
  "warning": "不要把小样本误判为爆款的提醒"
}
`;
}

// review_funnel 专用错误响应（不含任何 Key，仅非敏感调试字段）。
function reviewFunnelError(errorCode, message, debug = {}) {
  return {
    ok: false,
    source: "fallback",
    scene: "review_funnel",
    scenario: "review_funnel",
    error: errorCode,
    message,
    hasTextModelConfig: Boolean(debug.hasTextModelConfig),
    model: debug.model || "",
    statusCode: debug.statusCode,
  };
}

function normalizeReviewFunnelInsight(value, debug = {}) {
  const source = value && typeof value === "object" ? value : {};
  return {
    ok: true,
    source: "llm",
    scene: "review_funnel",
    scenario: "review_funnel",
    model: debug.model || "",
    hasTextModelConfig: true,
    summary: String(source.summary || "").trim(),
    keyFindings: normalizeArray(source.keyFindings, []),
    bottleneck: String(source.bottleneck || "").trim(),
    nextActions: normalizeArray(source.nextActions, []),
    decision: String(source.decision || "").trim(),
    confidence: String(source.confidence || "").trim(),
    missingData: normalizeArray(source.missingData, []),
    warning: String(source.warning || "").trim(),
  };
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
  // 同时兼容 scene / scenario 两种字段名，避免因字段不一致而走不到 review_funnel 分支。
  const requestedScene = body?.scene || body?.scenario;
  const scenario = VALID_SCENARIOS.has(requestedScene) ? requestedScene : "purchase_decision";
  const isReviewFunnel = scenario === "review_funnel";
  const dashScope = getDashScopeConfig();
  const hasTextModelConfig = Boolean(dashScope.apiKey);

  if (!dashScope.apiKey) {
    if (isReviewFunnel) {
      // 明确告知缺少模型配置（不假装 AI 成功），前端据此降级为规则复盘。
      sendJson(res, 200, reviewFunnelError("llm_config_missing", "服务端未配置 AI 文本模型，已使用规则复盘。", { hasTextModelConfig: false, model: dashScope.model }));
      return;
    }
    sendJson(res, 200, fallbackInsight(scenario, "服务端未配置 DASHSCOPE_API_KEY。"));
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
            content: isReviewFunnel
              ? buildReviewFunnelPrompt(body)
              : buildPrompt({
                  product: body.product || {},
                  result: body.result || {},
                  marketEvidence: body.marketEvidence || {},
                  reviewData: body.reviewData || null,
                  scenario,
                }),
          },
        ],
        temperature: 0.25,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (isReviewFunnel) {
        sendJson(res, 200, reviewFunnelError("llm_request_failed", `LLM 请求失败：${data?.error?.message || response.status}`, { hasTextModelConfig, model: dashScope.model, statusCode: response.status }));
        return;
      }
      sendJson(res, 200, fallbackInsight(scenario, `LLM 请求失败：${data?.error?.message || response.status}`));
      return;
    }

    const rawText = data.choices?.[0]?.message?.content || "";

    if (isReviewFunnel) {
      try {
        const parsed = parseModelJson(rawText);
        sendJson(res, 200, normalizeReviewFunnelInsight(parsed, { model: dashScope.model }));
      } catch (parseError) {
        sendJson(res, 200, reviewFunnelError("llm_parse_failed", "AI 返回内容无法解析为结构化结果，已使用规则复盘。", { hasTextModelConfig, model: dashScope.model, statusCode: response.status }));
      }
      return;
    }

    const parsed = parseModelJson(rawText);
    sendJson(res, 200, normalizeInsight(parsed, scenario));
  } catch (error) {
    if (isReviewFunnel) {
      sendJson(res, 200, reviewFunnelError("llm_request_error", "AI 请求异常，已使用规则复盘。", { hasTextModelConfig, model: dashScope.model }));
      return;
    }
    sendJson(res, 200, fallbackInsight(scenario, "LLM 请求或解析失败。"));
  }
}
