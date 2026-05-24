import { buildAiInsightFallback, normalizeAiInsight } from "./aiInsightUtils";

const AI_INSIGHT_ENDPOINT =
  import.meta.env.VITE_AI_INSIGHT_URL || "/api/generate-ai-insight";

const AI_INSIGHT_TIMEOUT_MS = 30000;

function getInternalErrorReason(error, responseStatus) {
  if (error?.name === "AbortError") {
    return "ai_insight_timeout";
  }

  if (responseStatus) {
    return `ai_insight_http_${responseStatus}`;
  }

  return "ai_insight_request_failed";
}

export async function generateAiInsight({
  product,
  result,
  marketEvidence,
  reviewData,
  scenario,
} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_INSIGHT_TIMEOUT_MS);

  let responseStatus = null;

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
      }),
    });

    responseStatus = response.status;

    if (!response.ok) {
      throw new Error(`ai_insight_http_${response.status}`);
    }

    const data = await response.json();
    return normalizeAiInsight(data, scenario);
  } catch (error) {
    const internalReason = getInternalErrorReason(error, responseStatus);

    if (typeof console !== "undefined") {
      console.warn("[TradePilot AI] AI insight fallback:", internalReason);
    }

    return buildAiInsightFallback(scenario, internalReason);
  } finally {
    clearTimeout(timer);
  }
}
