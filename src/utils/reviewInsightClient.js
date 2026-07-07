// reviewInsightClient.js
// “测款复盘 AI 总结”：复用项目已有的 /api/generate-ai-insight（DashScope/Qwen）能力，
// 用 review_funnel 场景获取结构化复盘建议；LLM 不可用时降级为规则版复盘（仍然有意义）。
//
// 不读取 / 不打印任何 .env 或 API Key；密钥仅由服务端读取。

const AI_INSIGHT_ENDPOINT =
  import.meta.env.VITE_AI_INSIGHT_URL || "/api/generate-ai-insight";
const REVIEW_INSIGHT_TIMEOUT_MS = 18000;

const DECISIONS = ["继续测", "改内容再测", "小批量补货", "暂停"];
const CONFIDENCES = ["高", "中", "低"];

function asText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function asTextArray(value, fallback = [], limit = 5) {
  const source = Array.isArray(value) ? value : [];
  const items = source.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, limit);
  return items.length ? items : fallback;
}

// 规则版复盘（LLM 不可用时使用）：直接由 reviewMetrics 计算结果生成，真实可用。
export function buildReviewInsightFallback(metrics = {}, reason = "") {
  const m = metrics || {};
  const keyFindings = [];
  if (m.interactionRate != null) keyFindings.push(`互动率 ${m.interactionRate}%（互动量 / 曝光量）。`);
  if (m.favoriteVsInteraction != null) keyFindings.push(`收藏率 ${m.favoriteVsInteraction}%（收藏 / 互动）。`);
  if (m.inquiryVsFavorite != null) keyFindings.push(`询价率 ${m.inquiryVsFavorite}%（询价 / 收藏）。`);
  if (m.orderRate != null) keyFindings.push(`成交转化率 ${m.orderRate}%（成交 / 询价）。`);
  if (m.costPerOrder != null) keyFindings.push(`单次成交成本 ¥${m.costPerOrder}。`);
  if (!keyFindings.length) keyFindings.push("当前复盘数据不足，建议补全曝光、互动、询价、成交和测款成本。");

  const nextActions = [];
  if (m.bottleneck === "interaction") {
    nextActions.push("重做封面、标题和前 3 秒钩子，用使用前后对比或痛点开场。");
    nextActions.push("准备 2-3 个开头角度做 A/B，对比点击和完播。");
  } else if (m.bottleneck === "favorite") {
    nextActions.push("强化卖点与材质/使用价值展示，让用户产生收藏理由。");
    nextActions.push("补真实使用场景图，减少“只是好看”的浅层互动。");
  } else if (m.bottleneck === "inquiry") {
    nextActions.push("把价格、规格、购买路径写清楚，降低咨询门槛。");
    nextActions.push("补信任背书：实拍、买家评价、售后承诺。");
  } else if (m.bottleneck === "order") {
    nextActions.push("排查价格、运费、客服回复速度、库存与售后政策。");
    nextActions.push("用限时优惠或赠品测试是否能提升成交。");
  } else {
    nextActions.push("链路健康，可小批量补货并继续跟踪复购与退换货。");
    nextActions.push("固定有效封面/脚本结构，扩大相似内容测试。");
  }
  if (m.missingFields && m.missingFields.length) {
    nextActions.push(`补全数据：${m.missingFields.slice(0, 4).join("、")}，让复盘更准确。`);
  }

  return {
    ok: true,
    source: "fallback",
    scenario: "review_funnel",
    summary: asText(m.judgment, "当前使用规则复盘结论，建议补全测款数据后再判断。"),
    keyFindings: keyFindings.slice(0, 5),
    bottleneck: asText(m.bottleneckLabel || m.judgment, "暂无法确定主要流失环节，数据不足。"),
    nextActions: nextActions.slice(0, 5),
    decision: DECISIONS.includes(m.decision) ? m.decision : "继续测",
    confidence: CONFIDENCES.includes(m.confidenceLevel) ? m.confidenceLevel : "低",
    missingData: Array.isArray(m.missingFields) ? m.missingFields : [],
    warning: m.dataTooSmall
      ? "当前样本量偏小，只能作为下一轮测试假设，不能直接判断为爆款。"
      : "测款数据仅代表本轮表现，扩大进货前请用更大样本复核。",
    reason: reason || "",
  };
}

export function normalizeReviewInsight(value, metrics = {}) {
  const fallback = buildReviewInsightFallback(metrics);
  const source = value && typeof value === "object" ? value : {};
  // 后端成功返回 LLM 结果时 source 为 "llm" 或 "ai"，否则视为规则兜底。
  const isLlm = (source.source === "llm" || source.source === "ai") && source.ok !== false;
  return {
    ok: source.ok !== false,
    source: isLlm ? "llm" : "fallback",
    scenario: "review_funnel",
    model: typeof source.model === "string" ? source.model : "",
    summary: asText(source.summary, fallback.summary),
    keyFindings: asTextArray(source.keyFindings, fallback.keyFindings),
    bottleneck: asText(source.bottleneck, fallback.bottleneck),
    nextActions: asTextArray(source.nextActions, fallback.nextActions),
    decision: DECISIONS.includes(source.decision) ? source.decision : fallback.decision,
    confidence: CONFIDENCES.includes(source.confidence) ? source.confidence : fallback.confidence,
    missingData: asTextArray(source.missingData, fallback.missingData, 8),
    warning: asText(source.warning, fallback.warning),
  };
}

// 调用 LLM 生成测款复盘总结；失败安全降级为规则版。
export async function generateReviewInsight({ reviewData, productContext, metrics } = {}) {
  const safeMetrics = metrics || {};
  if (typeof fetch !== "function") {
    return { ...buildReviewInsightFallback(safeMetrics, "运行环境不支持网络请求。"), errorCode: "no_fetch" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REVIEW_INSIGHT_TIMEOUT_MS);

  // 非敏感调试日志（不输出任何 Key）。
  // eslint-disable-next-line no-console
  console.info("[review_funnel] calling /api/generate-ai-insight");

  try {
    const response = await fetch(AI_INSIGHT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        // 同时带上 scene（本次要求）与 scenario（向后兼容后端），确保进入 review_funnel 分支。
        scene: "review_funnel",
        scenario: "review_funnel",
        product: productContext || {},
        productContext: productContext || {},
        reviewData: reviewData || {},
        metrics: safeMetrics,
        reviewMetrics: {
          exposureCount: safeMetrics.exposureCount,
          interactionCount: safeMetrics.interactionCount,
          favoriteCount: safeMetrics.favoriteCount,
          inquiryCount: safeMetrics.inquiryCount,
          orderCount: safeMetrics.orderCount,
          testCost: safeMetrics.testCost,
          interactionRate: safeMetrics.interactionRate,
          favoriteVsInteraction: safeMetrics.favoriteVsInteraction,
          inquiryVsFavorite: safeMetrics.inquiryVsFavorite,
          orderRate: safeMetrics.orderRate,
          costPerInquiry: safeMetrics.costPerInquiry,
          costPerOrder: safeMetrics.costPerOrder,
          roi: safeMetrics.roi,
        },
        ruleJudgment: {
          bottleneck: safeMetrics.bottleneck,
          bottleneckLabel: safeMetrics.bottleneckLabel,
          decision: safeMetrics.decision,
          confidenceLevel: safeMetrics.confidenceLevel,
          dataTooSmall: safeMetrics.dataTooSmall,
          missingFields: safeMetrics.missingFields,
        },
      }),
    });

    let data = null;
    try {
      data = await response.json();
    } catch (parseError) {
      data = null;
    }

    if (!response.ok || !data || data.ok === false) {
      const errorCode = data?.error || `http_${response.status}`;
      // eslint-disable-next-line no-console
      console.info(
        `[review_funnel] result source: fallback`,
        `statusCode: ${response.status}`,
        `errorCode: ${errorCode}`,
        `hasTextModelConfig: ${data?.hasTextModelConfig === true}`
      );
      return {
        ...buildReviewInsightFallback(safeMetrics, data?.message || `服务端返回错误（${errorCode}）。`),
        errorCode,
        statusCode: response.status,
        hasTextModelConfig: data?.hasTextModelConfig === true,
      };
    }

    const normalized = normalizeReviewInsight(data, safeMetrics);
    // eslint-disable-next-line no-console
    console.info(
      `[review_funnel] result source: ${normalized.source}`,
      `statusCode: ${response.status}`,
      `hasTextModelConfig: ${data?.hasTextModelConfig === true}`
    );
    return normalized;
  } catch (error) {
    const errorCode = error?.name === "AbortError" ? "timeout" : "network_error";
    const reason = errorCode === "timeout" ? "请求超时。" : "接口调用失败。";
    // eslint-disable-next-line no-console
    console.info(`[review_funnel] result source: fallback`, `errorCode: ${errorCode}`);
    return { ...buildReviewInsightFallback(safeMetrics, reason), errorCode };
  } finally {
    clearTimeout(timer);
  }
}
