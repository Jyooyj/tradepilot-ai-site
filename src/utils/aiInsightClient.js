import { buildAiInsightFallback, normalizeAiInsight } from "./aiInsightUtils";

const AI_INSIGHT_ENDPOINT =
  import.meta.env.VITE_AI_INSIGHT_URL || "/api/generate-ai-insight";

const AI_INSIGHT_TIMEOUT_MS = 18000;

export async function generateAiInsight({
  product,
  result,
  marketEvidence,
  reviewData,
  scenario,
  constraints,
} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_INSIGHT_TIMEOUT_MS);

  try {
    const response = await fetch(AI_INSIGHT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        product: product || {},
        result: result || {},
        marketEvidence: marketEvidence || {},
        reviewData: reviewData || null,
        scenario,
        // 当前商品 Prompt 强约束（后端可消费；前端亦做二次内容拦截兜底）。
        constraints: constraints || "",
      }),
    });

    if (!response.ok) {
      throw new Error(`ai_insight_${response.status}`);
    }

    const data = await response.json();
    return normalizeAiInsight(data, scenario);
  } catch (error) {
    const reason = error?.name === "AbortError"
      ? "请求超时。"
      : "接口调用失败。";
    return buildAiInsightFallback(scenario, reason);
  } finally {
    clearTimeout(timer);
  }
}
